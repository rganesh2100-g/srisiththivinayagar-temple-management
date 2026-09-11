// ═══════════════════════════════════════════════════════════════════════════════
// bookingMirror routes — H7 internal PocketBase → PostgreSQL mirror endpoint
//
// POST /internal/booking-mirror/pooja-booking
//   Body:    PocketBase pooja_bookings record representation
//   Auth:    X-Booking-Mirror-Secret header === process.env.BOOKING_MIRROR_SECRET
//
// This is an INTERNAL endpoint. It must never be exposed to the frontend.
// It exists solely so PocketBase hooks (which cannot import Prisma) can push
// booking records into PostgreSQL via the Express API.
// ═══════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import crypto from 'node:crypto';
import { Router } from 'express';
import logger from '../utils/logger.js';
import { mirrorPoojaBooking } from '../services/poojaBookingMirror.js';

const router = Router();

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireMirrorSecret(req, res, next) {
  const secret = process.env.BOOKING_MIRROR_SECRET;
  if (!secret) {
    logger.error('[BOOKING-MIRROR] BOOKING_MIRROR_SECRET is not configured; mirror endpoint disabled');
    return res.status(503).json({ ok: false, error: 'Mirror endpoint is not configured' });
  }
  const provided = req.get('x-booking-mirror-secret') || '';
  if (!safeEqual(provided, secret)) {
    logger.warn('[BOOKING-MIRROR] Rejected request without a valid mirror secret');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

router.post('/pooja-booking', requireMirrorSecret, async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'Payload must be a JSON object' });
  }

  const missing = [];
  if (!body.id) missing.push('id');
  if (!body.pooja) missing.push('pooja');
  if (!body.email) missing.push('email');
  if (body.donation_amount === undefined || body.donation_amount === null) missing.push('donation_amount');
  if (!body.status) missing.push('status');
  if (missing.length > 0) {
    return res.status(400).json({ ok: false, error: `Missing required fields: ${missing.join(', ')}` });
  }

  try {
    const result = await mirrorPoojaBooking(body);
    if (!result.ok) {
      logger.error(`[BOOKING-MIRROR] mirror failed for ${body.id}: ${result.error}`);
      return res.status(500).json({ ok: false, error: result.error, bookingId: body.id });
    }
    logger.info(`[BOOKING-MIRROR] ok for ${body.id}`);
    return res.json({ ok: true, bookingId: body.id, mirrored: true });
  } catch (err) {
    logger.error(`[BOOKING-MIRROR] unexpected error for ${body.id}: ${err.message}`, { cause: err });
    return res.status(500).json({ ok: false, error: err.message, bookingId: body.id });
  }
});

export default router;