// ═══════════════════════════════════════════════════════════════════════════════
// paymentMirror — H8 Payment → PostgreSQL mirror service
//
// Purpose:
//   PocketBase remains the active application-facing payment/approval system
//   (incl. the mounted PUT /admin-payments/:id/approve authority). This service
//   idempotently mirrors PB `payments` records into PostgreSQL (Payment +
//   derived TempleAccount for approved subscription income).
//
// Design invariants:
//   - Idempotent by PB payment id: PG Payment.id == PB payment id, and
//     PG TempleAccount.id == "ta_<pb payment id>". Repeated mirror calls can
//     never create duplicate rows (upsert on the fixed PK).
//   - No historical data migration: only new runtime records pushed by the PB
//     hooks land in PG.
//   - User mapping follows the H5/H7 identity strategy: pocketbaseId → email.
//     PB `payments.user` is REQUIRED, so no fake/guest user is ever created.
//   - Approval status 1:1 (pending/approved/rejected). No second approval
//     workflow: the mirror reacts to whatever the mounted admin-payments route
//     writes in PB.
//   - No Payment schema change was required (26-column model already 1:1).
// ═══════════════════════════════════════════════════════════════════════════════

import prisma, { withTransaction } from '../lib/prisma.js';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import UserRepository from '../repositories/UserRepository.js';

const userRepo = new UserRepository();

// PB payments.status → Prisma PaymentApprovalStatus (1:1, H8 Phase 10).
const APPROVAL_STATUS_ALIASES = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
};

// PB billing_cycle → Prisma TempleAccount.subscriptionType (Monthly/Yearly).
// Unknown cycles map to null (nullable column) — never guessed.
const SUBSCRIPTION_TYPE_ALIASES = {
  monthly: 'Monthly',
  month: 'Monthly',
  'per month': 'Monthly',
  per_month: 'Monthly',
  yearly: 'Yearly',
  year: 'Yearly',
  annual: 'Yearly',
  annually: 'Yearly',
  'per year': 'Yearly',
  per_year: 'Yearly',
};

const VALID_APPROVAL_STATUSES = new Set(Object.values(APPROVAL_STATUS_ALIASES));

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

function mapApprovalStatus(value) {
  const key = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
  const mapped = APPROVAL_STATUS_ALIASES[key];
  if (!mapped || !VALID_APPROVAL_STATUSES.has(mapped)) {
    logger.warn(`[PAYMENT-MIRROR] Unknown payment approval status '${value}'; defaulting to pending`);
    return 'pending';
  }
  return mapped;
}

function mapSubscriptionType(billingCycle) {
  const key = String(billingCycle || '').trim().toLowerCase();
  return SUBSCRIPTION_TYPE_ALIASES[key] || null;
}

/**
 * Resolve the PG user for a PB payment.
 * Order: user.pocketbaseId → lazy mirror from PB user record (H5 strategy) → email.
 * Never creates a placeholder user: PB `payments.user` is REQUIRED.
 * @param {string|object|null} pbUserRef - PB payments.user relation value
 * @param {string|null} paymentEmail - PB payments.email fallback
 * @returns {Promise<object|null>}
 */
async function resolvePgUser(pbUserRef, paymentEmail) {
  const pbUserId = (typeof pbUserRef === 'object' && pbUserRef !== null)
    ? (pbUserRef.id || null)
    : (pbUserRef || null);

  if (pbUserId) {
    const byPbId = await userRepo.findByPocketbaseId(String(pbUserId));
    if (byPbId) return byPbId;

    try {
      const pbUser = await pb.collection('users').getOne(String(pbUserId));
      const mirrored = await userRepo.mirrorUserFromPocketBase(pbUser);
      if (mirrored) return mirrored;
    } catch (err) {
      logger.warn(`[PAYMENT-MIRROR] PB user lookup failed for ${pbUserId}: ${err.message}`);
    }
  }

  if (paymentEmail) {
    const byEmail = await userRepo.findByEmail(paymentEmail);
    if (byEmail) return byEmail;
  }

  return null;
}

/**
 * Mirror a PB payments record into PostgreSQL.
 * @param {object} payment - PocketBase payment representation (post-hook payload)
 * @returns {Promise<{ok: boolean, paymentId?: string, error?: string, templeAccount?: boolean}>}
 */
export async function mirrorPayment(payment) {
  if (!payment || typeof payment !== 'object' || !payment.id) {
    return { ok: false, error: 'Invalid payment payload: id is required' };
  }

  const paymentId = String(payment.id);

  try {
    // --- Required business fields (PB payments.user relation is REQUIRED) ---
    if (!payment.user) {
      return { ok: false, error: 'payment-user-missing: no user relation on payment' };
    }

    const pgUser = await resolvePgUser(payment.user, payment.email);
    if (!pgUser) {
      return { ok: false, error: `user_not_resolved: ${payment.user}` };
    }

    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'invalid-amount: payment amount must be a positive number' };
    }
    const totalAmount = payment.total_amount === null || payment.total_amount === undefined
      ? amount
      : Number(payment.total_amount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return { ok: false, error: 'invalid-total-amount: payment total amount must be a positive number' };
    }

    const approvalStatus = mapApprovalStatus(payment.status);
    const billingCycle = textSlice(payment.billing_cycle, 100) || 'Monthly';
    const subscriptionType = mapSubscriptionType(payment.billing_cycle);

    const created = toDate(payment.created);
    const startDate = toDate(payment.start_date) || created || new Date();
    // Application-default premium window when PB carries no end date (the
    // mounted /pending-subscriptions/create path always sets one).
    const endDate = toDate(payment.end_date) || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // --- Resolve optional approver (best-effort; never fails the mirror) ---
    let approvedById = null;
    if (payment.approved_by) {
      const approverPbId = typeof payment.approved_by === 'object'
        ? (payment.approved_by.id || null)
        : payment.approved_by;
      if (approverPbId) {
        const approver = await userRepo.findByPocketbaseId(String(approverPbId));
        approvedById = approver ? approver.id : null;
      }
    }

    const paymentData = {
      id: paymentId,
      userId: pgUser.id,
      approvedById,
      amount,
      totalAmount,
      customDonation: payment.custom_donation === null || payment.custom_donation === undefined
        ? null
        : Number(payment.custom_donation),
      planType: textSlice(payment.plan_type, 50),
      billingCycle,
      subscriptionType: textSlice(subscriptionType, 50),
      startDate,
      endDate,
      status: approvalStatus,
      paymentStatus: null,
      transactionId: textSlice(payment.transaction_id, 100),
      transactionRef: textSlice(payment.transaction_ref, 100),
      paymentMethod: null,
      receiptId: textSlice(payment.receipt_id, 100),
      receiptNumber: textSlice(payment.receipt_number, 50),
      receiptPdf: textSlice(Array.isArray(payment.receipt_pdf) ? payment.receipt_pdf[0] : payment.receipt_pdf, 500),
      receiptGeneratedAt: toDate(payment.receipt_generated_at),
      receiptSentAt: toDate(payment.receipt_sent_at),
      resendReceipt: Boolean(payment.resend_receipt),
      adminNotes: textOrNull(payment.admin_notes),
      approvedAt: toDate(payment.approved_at),
      email: textSlice(payment.email, 320) || pgUser.email,
      createdAt: created || new Date(),
    };

    // --- Derived TempleAccount (STEP 6): approved subscription income ---
    // Mirrors the PB subscription-income ledger convention used by the
    // financial reporting UI (FinancialTransparency):
    //   category = "Subscription", status = "Approved",
    //   subscription_type = Monthly/Yearly, transaction_id = payment id.
    // Created ONLY when the payment is approved (pending/rejected never create
    // income). Deterministic id 'ta_<paymentId>' keeps the mirror idempotent.
    let templeAccountData = null;
    if (approvalStatus === 'approved') {
      const accountDate = startDate || toDate(payment.approved_at) || created || new Date();
      if (totalAmount > 0) {
        templeAccountData = {
          id: `ta_${paymentId}`,
          memberName: (pgUser.name && String(pgUser.name).trim().length >= 2)
            ? String(pgUser.name).trim()
            : 'Member',
          amount: totalAmount,
          category: 'Subscription',
          date: accountDate,
          month: accountDate.toLocaleDateString('en-US', { month: 'long' }),
          year: accountDate.getFullYear(),
          classification: 'Subscription',
          transactionId: paymentId,
          status: 'Approved',
          subscriptionType,
          description: textOrNull(payment.admin_notes),
        };
      }
    }

    // --- Single PG transaction: payment + temple account stay consistent ---
    await withTransaction(async (tx) => {
      await tx.payment.upsert({
        where: { id: paymentId },
        create: { ...paymentData, createdAt: paymentData.createdAt },
        update: paymentData,
      });

      if (templeAccountData) {
        await tx.templeAccount.upsert({
          where: { id: templeAccountData.id },
          create: templeAccountData,
          update: templeAccountData,
        });
      }
    });

    logger.info(
      `[PAYMENT-MIRROR] mirrored payment ${paymentId} -> PG (user=${pgUser.id}, status=${approvalStatus}, templeAccount=${Boolean(templeAccountData)})`
    );
    return { ok: true, paymentId, templeAccount: Boolean(templeAccountData) };
  } catch (err) {
    logger.error(`[PAYMENT-MIRROR] mirror failed for ${paymentId}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

export default mirrorPayment;