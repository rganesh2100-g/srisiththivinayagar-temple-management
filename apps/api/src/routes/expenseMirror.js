// ═══════════════════════════════════════════════════════════════════════════════
// expenseMirror routes — H9 internal PocketBase → PostgreSQL mirror endpoints
//
// POST /internal/expense-mirror/expense-category
// POST /internal/expense-mirror/classification
// POST /internal/expense-mirror/expense
// POST /internal/expense-mirror/voucher
// POST /internal/expense-mirror/temple-account
//   Body:    PocketBase record representation for the matching collection
//   Auth:    X-Booking-Mirror-Secret header === process.env.BOOKING_MIRROR_SECRET
//
// INTERNAL ENDPOINTS — never exposed to the frontend. PocketBase hooks (which
// cannot import Prisma) push expense-ledger records into PostgreSQL via
// Express. Uses the existing H7 mirror-secret mechanism (reused env + header).
// ═══════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import crypto from 'node:crypto';
import { Router } from 'express';
import logger from '../utils/logger.js';
import {
  mirrorExpenseCategory,
  mirrorClassification,
  mirrorExpense,
  mirrorVoucher,
  mirrorTempleAccount,
} from '../services/expenseMirror.js';

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
    logger.error('[EXPENSE-MIRROR] BOOKING_MIRROR_SECRET is not configured; mirror endpoint disabled');
    return res.status(503).json({ ok: false, error: 'Mirror endpoint is not configured' });
  }
  const provided = req.get('x-booking-mirror-secret') || '';
  if (!safeEqual(provided, secret)) {
    logger.warn('[EXPENSE-MIRROR] Rejected request without a valid mirror secret');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

async function runMirror(req, res, fn) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'Payload must be a JSON object' });
  }
  try {
    const result = await fn(body);
    if (!result.ok) {
      logger.error(`[EXPENSE-MIRROR] mirror failed for ${body.id}: ${result.error}`);
      return res.status(500).json({ ok: false, error: result.error, id: body.id });
    }
    logger.info(`[EXPENSE-MIRROR] ok for ${body.id}`);
    return res.json({ ok: true, id: body.id, mirrored: true });
  } catch (err) {
    logger.error(`[EXPENSE-MIRROR] unexpected error for ${body.id}: ${err.message}`, { cause: err });
    return res.status(500).json({ ok: false, error: err.message, id: body.id });
  }
}

router.post('/expense-category', requireMirrorSecret, (req, res) => runMirror(req, res, mirrorExpenseCategory));
router.post('/classification', requireMirrorSecret, (req, res) => runMirror(req, res, mirrorClassification));
router.post('/expense', requireMirrorSecret, (req, res) => runMirror(req, res, mirrorExpense));
router.post('/voucher', requireMirrorSecret, (req, res) => runMirror(req, res, mirrorVoucher));
router.post('/temple-account', requireMirrorSecret, (req, res) => runMirror(req, res, mirrorTempleAccount));

export default router;