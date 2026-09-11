// ═══════════════════════════════════════════════════════════════════════════════
// poojaBookingMirror — H7 Pooja Booking → PostgreSQL mirror service
//
// Purpose:
//   PocketBase remains the active application-facing booking/realtime system.
//   This service imdempotently mirrors PB pooja_bookings records into PostgreSQL
//   (PoojaBooking + derived TempleAccount) so Prisma becomes the PG access layer.
//
// Design invariants:
//   - Idempotent by PB booking id: PG PoojaBooking.id == PB booking id, and
//     PG TempleAccount.id == "ta_<pb booking id>". Repeated mirror calls can
//     never create duplicate rows (upsert on the fixed PK).
//   - No historical data migration: only records pushed by the PB hooks land in PG.
//   - User mapping follows the H5 identity strategy: pocketbaseId → email.
//     PB `pooja_bookings.user` is REQUIRED, so no fake/guest user is created.
//   - Pooja rows are lazily mirrored from PB on first booking touch (no backfill),
//     because PoojaBooking.poojaId has a Restrict FK to Pooja.
//   - Status/field values are mapped 1:1 to the existing Prisma enums; unknown
//     values are reported, never silently guessed.
// ═══════════════════════════════════════════════════════════════════════════════

import prisma, { withTransaction } from '../lib/prisma.js';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import UserRepository from '../repositories/UserRepository.js';

const userRepo = new UserRepository();

// PB status → Prisma BookingStatus (Phase 10: 1:1 for the active enum).
// Legacy select values still referenced by dead code paths are mapped defensively.
const BOOKING_STATUS_ALIASES = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  completed: 'completed',
  cancelled: 'cancelled',
};

// PB payment_status → Prisma PaymentStatus (1:1, Phase 10).
const PAYMENT_STATUS_ALIASES = {
  pending: 'pending',
  completed: 'completed',
  failed: 'failed',
  refunded: 'refunded',
};

// PB poojas.status → Prisma PoojaStatus (Phase 9).
const POOJA_STATUS_ALIASES = {
  draft: 'draft',
  published: 'active',
  archived: 'archived',
};

// PB poojas.category → Prisma PoojaCategory.
const POOJA_CATEGORY_ALIASES = {
  daily: 'daily',
  special: 'special',
  festival: 'festival',
  life_cycle: 'life_cycle',
  homam: 'homam',
  archana: 'archana',
};

const VALID_BOOKING_STATUSES = new Set(Object.values(BOOKING_STATUS_ALIASES));
const VALID_PAYMENT_STATUSES = new Set(Object.values(PAYMENT_STATUS_ALIASES));
const VALID_POOJA_STATUSES = new Set(Object.values(POOJA_STATUS_ALIASES));
const VALID_CATEGORIES = new Set(Object.values(POOJA_CATEGORY_ALIASES));

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

function mapBookingStatus(value) {
  const key = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
  const mapped = BOOKING_STATUS_ALIASES[key];
  if (!mapped || !VALID_BOOKING_STATUSES.has(mapped)) {
    throw new Error(`Unknown booking status: ${value}`);
  }
  return mapped;
}

function mapPaymentStatus(value) {
  if (value === null || value === undefined || value === '') return null;
  const key = String(value).trim().toLowerCase();
  const mapped = PAYMENT_STATUS_ALIASES[key];
  if (!mapped || !VALID_PAYMENT_STATUSES.has(mapped)) {
    throw new Error(`Unknown payment status: ${value}`);
  }
  return mapped;
}

/**
 * Resolve the PG user for a PB booking.
 * Order: user.pocketbaseId → lazy mirror from PB user record (H5 strategy) → email.
 * Never creates a placeholder user: PB `pooja_bookings.user` is REQUIRED, so the
 * authenticated-devotee relation is preserved and the Restrict FK stays intact.
 * @returns {Promise<object|null>}
 */
async function resolvePgUser(pbUserRef, bookingEmail) {
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
      logger.warn(`[BOOKING-MIRROR] PB user lookup failed for ${pbUserId}: ${err.message}`);
    }
  }

  if (bookingEmail) {
    const byEmail = await userRepo.findByEmail(bookingEmail);
    if (byEmail) return byEmail;
  }

  return null;
}

/**
 * Resolve (or lazily mirror) the PG Pooja row referenced by a booking.
 * Pooja rows are idle in PG (PB is the listing authority during the transition),
 * but the PoojaBooking Restrict FK requires the row to exist before a booking
 * insert — so the first booking touch fetches the PB pooja record and mirrors it.
 * Upsert is idempotent on the PB pooja id.
 * @returns {Promise<object|null>}
 */
async function resolvePgPooja(poojaRef) {
  const id = (typeof poojaRef === 'object' && poojaRef !== null)
    ? String(poojaRef.id)
    : String(poojaRef);
  const existing = await prisma.pooja.findUnique({ where: { id } });
  if (existing) return existing;

  let pbPooja;
  try {
    pbPooja = await pb.collection('poojas').getOne(id);
  } catch (err) {
    logger.warn(`[BOOKING-MIRROR] PB pooja lookup failed for ${id}: ${err.message}`);
    return null;
  }

  const statusKey = String(pbPooja.status || 'draft').trim().toLowerCase();
  const status = POOJA_STATUS_ALIASES[statusKey];
  if (!status || !VALID_POOJA_STATUSES.has(status)) {
    logger.warn(`[BOOKING-MIRROR] Unknown pooja status '${statusKey}' for ${id}; defaulting to draft`);
  }
  const categoryKey = String(pbPooja.category || 'daily').trim().toLowerCase();
  const category = VALID_CATEGORIES.has(categoryKey) ? categoryKey : 'daily';

  const jsonOrNull = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  };

  const data = {
    id,
    name: String(pbPooja.name || 'Pooja').slice(0, 255),
    category,
    god: String(pbPooja.god || 'Ganesha').slice(0, 255),
    duration: Number(pbPooja.duration) || 60,
    donationAmount: Number(pbPooja.donation_amount) || 0,
    availabilityType: textSlice(pbPooja.availabilityType, 50),
    dates: jsonOrNull(pbPooja.dates),
    days: jsonOrNull(pbPooja.days),
    specificDates: jsonOrNull(pbPooja.specificDates),
    specificDays: jsonOrNull(pbPooja.specificDays),
    timeSlots: jsonOrNull(pbPooja.timeSlots),
    status: status || 'draft',
    published: status === 'active',
    isArchived: Boolean(pbPooja.is_archived || pbPooja.isArchived),
    archivedAt: toDate(pbPooja.archivedAt || pbPooja.archived_at),
    isDeleted: Boolean(pbPooja.is_deleted),
  };

  try {
    return await prisma.pooja.upsert({ where: { id }, create: data, update: data });
  } catch (err) {
    if (err && err.code === 'P2002') {
      return prisma.pooja.findUnique({ where: { id } });
    }
    throw err;
  }
}

/**
 * Mirror a PB pooja_bookings record into PostgreSQL.
 * @param {object} booking - PocketBase booking representation (post-hook payload)
 * @returns {Promise<{ok: boolean, bookingId?: string, error?: string, templeAccount?: boolean}>}
 */
export async function mirrorPoojaBooking(booking) {
  if (!booking || typeof booking !== 'object' || !booking.id) {
    return { ok: false, error: 'Invalid booking payload: id is required' };
  }

  const bookingId = String(booking.id);

  try {
    // --- Validate core booking fields (mirror of PB create-time requirement) ---
    if (!booking.pooja) return { ok: false, error: 'pooja relation is required' };
    if (!booking.email) return { ok: false, error: 'email is required' };
    if (booking.donation_amount === undefined || booking.donation_amount === null) {
      return { ok: false, error: 'donation_amount is required' };
    }

    const bookingStatus = mapBookingStatus(booking.status);

    // --- Resolve related rows (network lookups happen outside the DB tx) ---
    const pgUser = await resolvePgUser(booking.user, booking.email);
    if (!pgUser) {
      return { ok: false, error: `user_not_resolved: ${booking.user || booking.email}` };
    }

    const pgPooja = await resolvePgPooja(booking.pooja);
    if (!pgPooja) {
      return { ok: false, error: `pooja_not_resolved: ${booking.pooja}` };
    }

    const poojaDate = toDate(booking.pooja_date);
    const bookingDate = toDate(booking.booking_date);
    const donationAmount = Number(booking.donation_amount);
    const feeAmount = booking.fee_amount === null || booking.fee_amount === undefined
      ? null
      : Number(booking.fee_amount);

    const bookingData = {
      id: bookingId,
      userId: pgUser.id,
      poojaId: pgPooja.id,
      name: textSlice(booking.name, 255) || 'Devotee',
      email: textSlice(booking.email, 320),
      userContact: textSlice(booking.user_contact, 15),
      phone: textSlice(booking.user_contact, 15),
      bookingDate,
      poojaDate,
      timeSlot: textSlice(booking.time_slot, 50),
      donationAmount,
      feeAmount,
      bookingStatus,
      paymentStatus: mapPaymentStatus(booking.payment_status),
      receiptNumber: textSlice(booking.receipt_number, 50),
      receiptId: textSlice(booking.receipt_id, 100),
      receiptPdf: textSlice(Array.isArray(booking.receipt_pdf) ? booking.receipt_pdf[0] : booking.receipt_pdf, 500),
      receiptGeneratedAt: toDate(booking.receipt_created_at),
      receiptSentAt: toDate(booking.receipt_sent_at),
      resendReceipt: Boolean(booking.resend_receipt),
      transactionId: textSlice(booking.transaction_id, 100),
      poojaName: textSlice(booking.pooja_name, 255),
      bookingTime: textSlice(booking.booking_time, 50),
      isDeleted: Boolean(booking.is_deleted),
    };

    // --- Derived TempleAccount (Phase 6) when the booking carries a donation ---
    // PB side effect preserves transaction_id = booking.id, category "Pooja Services".
    let templeAccountData = null;
    if (donationAmount > 0) {
      const accountDate = poojaDate || bookingDate;
      if (!accountDate) {
        return { ok: false, error: 'temple-account-date-missing: no pooja_date/booking_date' };
      }
      templeAccountData = {
        id: `ta_${bookingId}`,
        memberName: textSlice(booking.name, 255) || textSlice(booking.email, 255) || 'Devotee',
        amount: donationAmount,
        category: 'Pooja Services',
        date: accountDate,
        month: accountDate.toLocaleDateString('en-US', { month: 'long' }),
        year: accountDate.getFullYear(),
        classification: 'Pooja Donation',
        transactionId: bookingId,
        poojaServicesAmount: null,
      };
    }

    // --- Single PG transaction: pooja + booking + temple account stay consistent ---
    const result = await withTransaction(async (tx) => {
      await tx.pooja.upsert({
        where: { id: pgPooja.id },
        create: {
          id: pgPooja.id,
          name: pgPooja.name,
          category: pgPooja.category,
          god: pgPooja.god,
          duration: pgPooja.duration,
          donationAmount: pgPooja.donationAmount,
          availabilityType: pgPooja.availabilityType,
          dates: pgPooja.dates,
          days: pgPooja.days,
          specificDates: pgPooja.specificDates,
          specificDays: pgPooja.specificDays,
          timeSlots: pgPooja.timeSlots,
          status: pgPooja.status,
          published: pgPooja.published,
          isArchived: pgPooja.isArchived,
          archivedAt: pgPooja.archivedAt,
          isDeleted: pgPooja.isDeleted,
        },
        update: {
          name: pgPooja.name,
          category: pgPooja.category,
          god: pgPooja.god,
          duration: pgPooja.duration,
          donationAmount: pgPooja.donationAmount,
          availabilityType: pgPooja.availabilityType,
          status: pgPooja.status,
          published: pgPooja.published,
          isArchived: pgPooja.isArchived,
          archivedAt: pgPooja.archivedAt,
          isDeleted: pgPooja.isDeleted,
        },
      });

      const created = toDate(booking.created);
      await tx.poojaBooking.upsert({
        where: { id: bookingId },
        create: { ...bookingData, createdAt: created || new Date() },
        update: bookingData,
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
      `[BOOKING-MIRROR] mirrored booking ${bookingId} -> PG (user=${pgUser.id}, pooja=${pgPooja.id}, templeAccount=${Boolean(templeAccountData)})`
    );
    return { ok: true, bookingId, templeAccount: Boolean(templeAccountData) };
  } catch (err) {
    logger.error(`[BOOKING-MIRROR] mirror failed for ${bookingId}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

export default mirrorPoojaBooking;