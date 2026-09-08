// ═══════════════════════════════════════════════════════════════════════════════
// requireAuth / requireAdmin — authorization guards for the H3 Users/Auth slice
//
// The global authMiddleware (middleware/auth.js) is soft: it never rejects.
// These guards assert the required identity/role and respond 401/403 when
// req.user is missing or lacks the required role.
//
// NOTE: req.role is read from the PocketBase-derived identity set by
// authMiddleware. During the transition PB is the identity/role authority,
// so role is sourced from req.user.role (the PB user record), not PG.
// ═══════════════════════════════════════════════════════════════════════════════

import logger from '../utils/logger.js';

/**
 * Require an authenticated user (req.user must be present).
 */
export function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  next();
}

/**
 * Require an authenticated admin (req.user.role === 'admin').
 */
export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  if (req.user.role !== 'admin') {
    logger.warn(`[AUTH] Access denied for ${req.user.email} (role=${req.user.role}) on ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'Forbidden: Admin role required' });
  }
  next();
}
