// ═══════════════════════════════════════════════════════════════════════════════
// donationMirror — H8 Donation → PostgreSQL mirror service
//
// Purpose:
//   PocketBase remains the active application-facing donation/realtime system.
//   This service idempotently mirrors PB donations records into PostgreSQL
//   (Donation) so Prisma becomes the PG access layer. Donation-income
//   TempleAccount rows are created by the PB donation-temple-accounts hook and
//   mirrored by the H9 expense-ledger mirror — NEVER derived in this service.
//
// Design invariants:
//   - Idempotent by PB donation id: PG Donation.id == PB donation id. Repeated
//     mirror calls can never create duplicate rows (upsert on the fixed PK).
//   - No historical data migration: only records pushed by the PB hooks land
//     in PG. PostgreSQL is intentionally fresh for operational data.
//   - User mapping follows the H5/H7 identity strategy: pocketbaseId → email.
//     PB `donations.user` is REQUIRED, so no fake/guest user is ever created.
//   - Status/field values are mapped 1:1 to the existing Prisma enums; unknown
//     values are reported, never silently collapsed. `completed` maps to the
//     H8-extended `completed` enum value (never folded into `approved`).
//   - Donation-income TempleAccount ownership is UNIQUELY the PB donation-
//     temple-accounts hook + the H9 expense-ledger mirror. This service NEVER
//     derives `ta_<donationId>` rows (H9 remediation removed H8 STEP-4).
// ═══════════════════════════════════════════════════════════════════════════════

import prisma, { withTransaction } from '../lib/prisma.js';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import UserRepository from '../repositories/UserRepository.js';

const userRepo = new UserRepository();

// PB donations.status → Prisma PaymentApprovalStatus (1:1, H8 Phase 9).
// `completed` is a distinct enum value added by H8 — it is NEVER collapsed
// into `approved` (schema-honest mapping).
const DONATION_STATUS_ALIASES = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  completed: 'completed',
};

// PB donations.payment_status → Prisma PaymentStatus (1:1, H8 Phase 10).
const PAYMENT_STATUS_ALIASES = {
  pending: 'pending',
  completed: 'completed',
  failed: 'failed',
  refunded: 'refunded',
};

const VALID_DONATION_STATUSES = new Set(Object.values(DONATION_STATUS_ALIASES));
const VALID_PAYMENT_STATUSES = new Set(Object.values(PAYMENT_STATUS_ALIASES));

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

function mapDonationStatus(value) {
  const key = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
  const mapped = DONATION_STATUS_ALIASES[key];
  if (!mapped || !VALID_DONATION_STATUSES.has(mapped)) {
    logger.warn(`[DONATION-MIRROR] Unknown donation status '${value}'; defaulting to pending`);
    return 'pending';
  }
  return mapped;
}

function mapPaymentStatus(value) {
  if (value === null || value === undefined || value === '') return null;
  const key = String(value).trim().toLowerCase();
  const mapped = PAYMENT_STATUS_ALIASES[key];
  if (!mapped || !VALID_PAYMENT_STATUSES.has(mapped)) {
    logger.warn(`[DONATION-MIRROR] Unknown payment status '${value}'; leaving unset`);
    return null;
  }
  return mapped;
}

/**
 * Resolve the PG user for a PB donation.
 * Order: user.pocketbaseId → lazy mirror from PB user record (H5 strategy) → email.
 * Never creates a placeholder user: PB `donations.user` is REQUIRED, so the
 * authenticated-devotee relation is preserved and the Restrict FK stays intact.
 * @param {string|object|null} pbUserRef - PB donations.user relation value
 * @param {string|null} fallbackEmail - unused by donations (email lives in notes)
 * @returns {Promise<object|null>}
 */
async function resolvePgUser(pbUserRef, fallbackEmail) {
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
      logger.warn(`[DONATION-MIRROR] PB user lookup failed for ${pbUserId}: ${err.message}`);
    }
  }

  if (fallbackEmail) {
    const byEmail = await userRepo.findByEmail(fallbackEmail);
    if (byEmail) return byEmail;
  }

  return null;
}

/**
 * Mirror a PB donations record into PostgreSQL.
 * @param {object} donation - PocketBase donation representation (post-hook payload)
 * @returns {Promise<{ok: boolean, donationId?: string, error?: string, templeAccount?: boolean}>}
 */
export async function mirrorDonation(donation) {
  if (!donation || typeof donation !== 'object' || !donation.id) {
    return { ok: false, error: 'Invalid donation payload: id is required' };
  }

  const donationId = String(donation.id);

  try {
    // --- Required business fields (PB donations.user relation is REQUIRED) ---
    if (!donation.user) {
      // Pre-existing issue: guest donations are broken at PB (required user
      // relation). We never invent a guest user — skip with a clear reason.
      return { ok: false, error: 'donation-user-missing: no user relation on donation' };
    }

    const pgUser = await resolvePgUser(donation.user, donation.email);
    if (!pgUser) {
      return { ok: false, error: `user_not_resolved: ${donation.user}` };
    }

    const donationStatus = mapDonationStatus(donation.status);
    const paymentStatus = mapPaymentStatus(donation.payment_status);
    const donationDate = toDate(donation.donation_date);
    const amount = Number(donation.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, error: 'invalid-amount: donation amount must be a non-negative number' };
    }

    const donationData = {
      id: donationId,
      userId: pgUser.id,
      amount,
      donationDate,
      donationDescription: textOrNull(donation.donation_description),
      notes: textOrNull(donation.notes),
      specialOccasion: textSlice(donation.special_occasion, 255),
      category: textSlice(donation.category, 100),
      status: donationStatus,
      approvalDate: toDate(donation.approval_date),
      paymentStatus,
      receiptId: textSlice(donation.receipt_id, 100),
      receiptNumber: textSlice(donation.receipt_number, 50),
      receiptPdf: textSlice(Array.isArray(donation.receipt_pdf) ? donation.receipt_pdf[0] : donation.receipt_pdf, 500),
      receiptGeneratedAt: toDate(donation.receipt_created_at || donation.receipt_generated_date),
      receiptSentAt: toDate(donation.receipt_sent_at),
      resendReceipt: Boolean(donation.resend_receipt),
      contactNumber: null,
      email: textSlice(donation.email, 320),
      communicationPreference: textSlice(donation.communication_preference, 50),
      isDeleted: Boolean(donation.is_deleted),
      createdAt: toDate(donation.created || donation.created_at) || new Date(),
    };

    // --- Donation-income TempleAccount write REMOVED (H9 remediation) ---
    // The old H8 STEP-4 block derived a PG `ta_<donationId>` row directly from
    // this mirror, independent of PocketBase. That produced PG ledger rows with
    // no corresponding PB temple_accounts record (split-brain ledger). Correct
    // ownership: the PB donation-temple-accounts hook creates the real
    // temple_accounts record on approval, and the H9 expense-ledger mirror
    // mirrors it into PG via id `ta_<transactionId>`. This service mirrors ONLY
    // the Donation row now.

    // --- Single PG transaction: donation row stays consistent ---
    await withTransaction(async (tx) => {
      await tx.donation.upsert({
        where: { id: donationId },
        create: { ...donationData, createdAt: donationData.createdAt },
        update: donationData,
      });
    });

    logger.info(
      `[DONATION-MIRROR] mirrored donation ${donationId} -> PG (user=${pgUser.id}, status=${donationStatus}, templeAccount=none)`
    );
    return { ok: true, donationId, templeAccount: false };
  } catch (err) {
    logger.error(`[DONATION-MIRROR] mirror failed for ${donationId}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

export default mirrorDonation;