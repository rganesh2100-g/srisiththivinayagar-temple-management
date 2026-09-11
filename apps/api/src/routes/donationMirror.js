// ═══════════════════════════════════════════════════════════════════════════════
// donationMirror routes — H8 internal PocketBase → PostgreSQL mirror endpoint
//
// POST /internal/donation-mirror/donation
//   Body:    PocketBase donations record representation
//   Auth:    X-Booking-Mirror-Secret header === process.env.BOOKING_MIRROR_SECRET
//
// INTERNAL ENDPOINT — never exposed to the frontend. PocketBase hooks (which
// cannot import Prisma) push donation records into PostgreSQL via Express.
// Uses the existing H7 mirror-secret mechanism (reused env + header).
// ═══════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import crypto from 'node:crypto';
import { Router } from 'express';
import logger from '../utils/logger.js';
import { mirrorDonation } from '../services/donationMirror.js';

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
    logger.error('[DONATION-MIRROR] BOOKING_MIRROR_SECRET is not configured; mirror endpoint disabled');
    return res.status(503).json({ ok: false, error: 'Mirror endpoint is not configured' });
  }
  const provided = req.get('x-booking-mirror-secret') || '';
  if (!safeEqual(provided, secret)) {
    logger.warn('[DONATION-MIRROR] Rejected request without a valid mirror secret');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

router.post('/donation', requireMirrorSecret, async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'Payload must be a JSON object' });
  }

  try {
    const result = await mirrorDonation(body);
    if (!result.ok) {
      logger.error(`[DONATION-MIRROR] mirror failed for ${body.id}: ${result.error}`);
      return res.status(500).json({ ok: false, error: result.error, donationId: body.id });
    }
    logger.info(`[DONATION-MIRROR] ok for ${body.id}`);
    return res.json({ ok: true, donationId: body.id, mirrored: true, templeAccount: result.templeAccount });
  } catch (err) {
    logger.error(`[DONATION-MIRROR] unexpected error for ${body.id}: ${err.message}`, { cause: err });
    return res.status(500).json({ ok: false, error: err.message, donationId: body.id });
  }
});

export default router;