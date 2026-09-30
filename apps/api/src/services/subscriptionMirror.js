// ═══════════════════════════════════════════════════════════════════════════════
// subscriptionMirror — H10 Subscription → PostgreSQL mirror service
//
// Purpose:
//   PocketBase remains the active application-facing subscription system (users
//   submit via SubscriptionPaymentModal, admins approve/reject via
//   PUT /admin-payments/:id/approve). This service idempotently mirrors PB
//   `subscriptions` records into PostgreSQL (Subscription + user membership
//   state) so premium state has a durable relational home.
//
// Design invariants:
//   - Idempotent by PB subscription id: PG Subscription.id == PB subscription id
//     (the Prisma column has NO uuid default for this reason). Repeated mirror
//     calls can never create duplicate rows (upsert on the fixed PK).
//   - No historical data migration: only new runtime records pushed by the PB
//     hooks land in PG.
//   - User mapping follows the H5/H7/H8 identity strategy: pocketbaseId → lazy
//     mirror from the PB user record → email. PB `subscriptions.user` is
//     REQUIRED, so no fake/guest user is ever created.
//   - Status 1:1 with the PB select (pending/active/rejected). The mirror reacts
//     to whatever the mounted admin route writes; it never invents an approval.
//   - Premium membership state is mirrored to the PG User only from the same PB
//     record that is authoritative, so PB and PG cannot disagree about who is
//     premium.
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from '../lib/prisma.js';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import UserRepository from '../repositories/UserRepository.js';

const userRepo = new UserRepository();

// PB subscriptions.status → Prisma SubscriptionRecordStatus (1:1).
const STATUS_ALIASES = {
  pending: 'pending',
  active: 'active',
  rejected: 'rejected',
};

// PB subscriptions.plan_type → Prisma SubscriptionPlanType (single value: premium).
const PLAN_TYPE_ALIASES = {
  premium: 'premium',
};

// PB subscriptions.renewal_type → Prisma RenewalType.
const RENEWAL_TYPE_ALIASES = {
  auto: 'auto',
  manual: 'manual',
};

const VALID_STATUSES = new Set(Object.values(STATUS_ALIASES));
const VALID_RENEWAL_TYPES = new Set(Object.values(RENEWAL_TYPE_ALIASES));

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function textSlice(value, max) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function toAmount(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    logger.warn(`[SUBSCRIPTION-MIRROR] ignoring non-numeric ${field}: '${value}'`);
    return null;
  }
  return n;
}

function mapStatus(value) {
  const key = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
  const mapped = STATUS_ALIASES[key];
  if (!mapped || !VALID_STATUSES.has(mapped)) {
    logger.warn(`[SUBSCRIPTION-MIRROR] unknown subscription status '${value}'; defaulting to pending`);
    return 'pending';
  }
  return mapped;
}

function mapPlanType(value) {
  const key = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
  return PLAN_TYPE_ALIASES[key] || 'premium';
}

function mapRenewalType(value) {
  const key = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
  return RENEWAL_TYPE_ALIASES[key] || 'manual';
}

/**
 * Resolve the PG user for a PB subscription.
 * Order: user.pocketbaseId → lazy mirror from PB user record (H5 strategy).
 * Never creates a placeholder: PB `subscriptions.user` is REQUIRED.
 * @param {string|object|null} pbUserRef - PB subscriptions.user relation value
 * @returns {Promise<object|null>}
 */
async function resolvePgUser(pbUserRef) {
  const pbUserId = (typeof pbUserRef === 'object' && pbUserRef !== null)
    ? (pbUserRef.id || null)
    : (pbUserRef || null);

  if (!pbUserId) return null;

  const byPbId = await userRepo.findByPocketbaseId(String(pbUserId));
  if (byPbId) return byPbId;

  try {
    const pbUser = await pb.collection('users').getOne(String(pbUserId));
    const mirrored = await userRepo.mirrorUserFromPocketBase(pbUser);
    if (mirrored) return mirrored;
  } catch (err) {
    logger.warn(`[SUBSCRIPTION-MIRROR] PB user lookup failed for ${pbUserId}: ${err.message}`);
  }

  return null;
}

/**
 * Derive the PG user membership state from the user's subscriptions.
 *
 * `winning` is the subscription whose status should decide premium state: an
 * `active` subscription always wins, otherwise the most recently updated one
 * does. Only an `active` subscription grants premium; anything else releases
 * the user back to free. This mirrors the PB user fields that the live hooks
 * maintain (membership_type / premium_status / subscription_status) so PG agrees
 * with PB.
 */
function deriveUserState(subscriptions) {
  const active = subscriptions.find((s) => s.status === 'active');
  const winning = active || subscriptions[0];
  const isActive = Boolean(active);
  return {
    membershipTier: isActive ? 'premium' : 'free',
    membershipType: isActive ? 'premium' : 'free',
    subscriptionStatus: isActive ? 'premium' : 'free',
    premiumStatus: isActive ? 'Active' : 'Inactive',
    accountType: isActive ? 'Premium Membership' : 'Free Membership',
    subscriptionExpiryDate: isActive ? winning.endDate : null,
  };
}

/**
 * Mirror a PB subscriptions record into PostgreSQL.
 * @param {object} subscription - PocketBase subscription representation
 * @returns {Promise<{ok: boolean, subscriptionId?: string, userSynced?: boolean, error?: string}>}
 */
export async function mirrorSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object' || !subscription.id) {
    return { ok: false, error: 'Invalid subscription payload: id is required' };
  }

  const subscriptionId = String(subscription.id);

  try {
    // --- Required business fields (PB subscriptions.user relation is REQUIRED) ---
    if (!subscription.user) {
      return { ok: false, error: 'subscription-user-missing: no user relation on subscription' };
    }

    const pgUser = await resolvePgUser(subscription.user);
    if (!pgUser) {
      return { ok: false, error: `user_not_resolved: ${subscription.user}` };
    }

    const status = mapStatus(subscription.status);
    const planType = mapPlanType(subscription.plan_type);
    const renewalType = mapRenewalType(subscription.renewal_type);

    const created = toDate(subscription.created);
    const startDate = toDate(subscription.start_date) || created || new Date();

    // Fall back to the record's own duration (1..120 months per the PB schema)
    // when PB carries no end date, instead of guessing a fixed window.
    const rawMonths = Number(subscription.duration_months);
    const months = (Number.isFinite(rawMonths) && rawMonths >= 1 && rawMonths <= 120)
      ? Math.floor(rawMonths)
      : 1;
    const fallbackEnd = new Date(startDate.getTime());
    fallbackEnd.setUTCMonth(fallbackEnd.getUTCMonth() + months);
    const endDate = toDate(subscription.end_date) || fallbackEnd;

    const subscriptionData = {
      id: subscriptionId,
      userId: pgUser.id,
      planType,
      amount: toAmount(subscription.amount, 'amount') ?? 0,
      totalAmount: toAmount(subscription.total_amount, 'total_amount') ?? 0,
      customDonation: toAmount(subscription.custom_donation, 'custom_donation'),
      billingCycle: textSlice(subscription.billing_cycle, 100) || 'monthly',
      durationMonths: months,
      renewalType,
      startDate,
      endDate,
      status,
      transactionId: textSlice(subscription.transaction_id, 100),
      transactionRef: textSlice(subscription.transaction_ref, 100),
      adminNotes: textOrNull(subscription.admin_notes),
      description: textOrNull(subscription.description),
      // PB keeps a duplicate plain-text copy of the user key; preserve it
      // verbatim so the mirror never invents a second identity.
      userIdText: textSlice(subscription.user_id, 100),
      createdAt: created || new Date(),
    };

    await prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { id: subscriptionId },
        create: subscriptionData,
        update: subscriptionData,
      });

      // Keep the PG user row in step with PB premium membership state. This is
      // additive and idempotent; it never creates a second approval workflow.
      // State is recomputed from ALL of the user's subscriptions so a rejected
      // or pending one can never demote a user who has a separate active plan.
      const allSubs = await tx.subscription.findMany({
        where: { userId: pgUser.id },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        select: { status: true, endDate: true, updatedAt: true },
      });

      const ranked = [...allSubs].sort((a, b) => {
        const rank = { active: 0, pending: 1, rejected: 2 };
        const byStatus = (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
        if (byStatus !== 0) return byStatus;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      const userState = deriveUserState(ranked);

      await tx.user.update({
        where: { id: pgUser.id },
        data: {
          membershipTier: userState.membershipTier,
          membershipType: userState.membershipType,
          subscriptionStatus: userState.subscriptionStatus,
          premiumStatus: userState.premiumStatus,
          accountType: userState.accountType,
          subscriptionExpiryDate: userState.subscriptionExpiryDate,
        },
      });
    });

    logger.info(
      `[SUBSCRIPTION-MIRROR] mirrored subscription ${subscriptionId} -> PG (user=${pgUser.id}, status=${status}, end=${endDate.toISOString()})`
    );
    return { ok: true, subscriptionId, userSynced: true };
  } catch (err) {
    logger.error(`[SUBSCRIPTION-MIRROR] mirror failed for ${subscriptionId}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

export default mirrorSubscription;
