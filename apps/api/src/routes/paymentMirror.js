// ═══════════════════════════════════════════════════════════════════════════════
// paymentMirror routes — H8 internal PocketBase → PostgreSQL mirror endpoint
//
// POST /internal/payment-mirror/payment
//   Body:    PocketBase payments record representation
//   Auth:    X-Booking-Mirror-Secret header === process.env.BOOKING_MIRROR_SECRET
//
// INTERNAL ENDPOINT — never exposed to the frontend. PocketBase hooks (which
// cannot import Prisma) push payment records into PostgreSQL via Express.
// Uses the existing H7 mirror-secret mechanism (reused env + header).
// ═══════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import crypto from 'node:crypto';
import { Router } from 'express';
import logger from '../utils/logger.js';
import { mirrorPayment } from '../services/paymentMirror.js';

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
    logger.error('[PAYMENT-MIRROR] BOOKING_MIRROR_SECRET is not configured; mirror endpoint disabled');
    return res.status(503).json({ ok: false, error: 'Mirror endpoint is not configured' });
  }
  const provided = req.get('x-booking-mirror-secret') || '';
  if (!safeEqual(provided, secret)) {
    logger.warn('[PAYMENT-MIRROR] Rejected request without a valid mirror secret');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

router.post('/payment', requireMirrorSecret, async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'Payload must be a JSON object' });
  }

  try {
    const result = await mirrorPayment(body);
    if (!result.ok) {
      logger.error(`[PAYMENT-MIRROR] mirror failed for ${body.id}: ${result.error}`);
      return res.status(500).json({ ok: false, error: result.error, paymentId: body.id });
    }
    logger.info(`[PAYMENT-MIRROR] ok for ${body.id}`);
    return res.json({ ok: true, paymentId: body.id, mirrored: true, templeAccount: result.templeAccount });
  } catch (err) {
    logger.error(`[PAYMENT-MIRROR] unexpected error for ${body.id}: ${err.message}`, { cause: err });
    return res.status(500).json({ ok: false, error: err.message, paymentId: body.id });
  }
});

export default router;