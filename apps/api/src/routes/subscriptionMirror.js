// ═══════════════════════════════════════════════════════════════════════════════
// subscriptionMirror routes — H10 internal PocketBase → PostgreSQL mirror endpoint
//
// POST /internal/subscription-mirror/subscription
//   Body:    PocketBase subscriptions record representation
//   Auth:    X-Booking-Mirror-Secret header === process.env.BOOKING_MIRROR_SECRET
//
// INTERNAL ENDPOINT — never exposed to the frontend. PocketBase hooks (which
// cannot import Prisma) push subscription records into PostgreSQL via Express.
// Reuses the existing H7/H8 mirror-secret mechanism (same env + header name).
// ═══════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import crypto from 'node:crypto';
import { Router } from 'express';
import logger from '../utils/logger.js';
import { mirrorSubscription } from '../services/subscriptionMirror.js';

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
    logger.error('[SUBSCRIPTION-MIRROR] BOOKING_MIRROR_SECRET is not configured; mirror endpoint disabled');
    return res.status(503).json({ ok: false, error: 'Mirror endpoint is not configured' });
  }
  const provided = req.get('x-booking-mirror-secret') || '';
  if (!safeEqual(provided, secret)) {
    logger.warn('[SUBSCRIPTION-MIRROR] Rejected request without a valid mirror secret');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

router.post('/subscription', requireMirrorSecret, async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'Payload must be a JSON object' });
  }

  try {
    const result = await mirrorSubscription(body);
    if (!result.ok) {
      logger.error(`[SUBSCRIPTION-MIRROR] mirror failed for ${body.id}: ${result.error}`);
      return res.status(500).json({ ok: false, error: result.error, subscriptionId: body.id });
    }
    logger.info(`[SUBSCRIPTION-MIRROR] ok for ${body.id}`);
    return res.json({ ok: true, subscriptionId: body.id, mirrored: true, userSynced: result.userSynced });
  } catch (err) {
    logger.error(`[SUBSCRIPTION-MIRROR] unexpected error for ${body.id}: ${err.message}`, { cause: err });
    return res.status(500).json({ ok: false, error: err.message, subscriptionId: body.id });
  }
});

export default router;
