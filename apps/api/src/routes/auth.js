// ═══════════════════════════════════════════════════════════════════════════════
// auth routes — current-user profile endpoints (H3 Users/Auth slice)
//
// GET  /auth/me     → return the authenticated user's PostgreSQL profile
// PATCH /auth/me    → update the authenticated user's own profile (whitelisted)
//
// Auth identity is resolved from the PB JWT via authMiddleware's req.user,
// joined to the Prisma User by pocketbaseId (fallback: email).
// ═══════════════════════════════════════════════════════════════════════════════

import { Router } from 'express';
import UserRepository from '../repositories/UserRepository.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { normalizeLanguage } from '../constants/enumMappings.js';

const router = Router();
const userRepo = new UserRepository();

// Public profile projection required by the frontend profile pages.
const PROFILE_FIELDS = {
  id: true,
  pocketbaseId: true,
  email: true,
  name: true,
  avatar: true,
  verified: true,
  role: true,
  membershipTier: true,
  membershipType: true,
  subscriptionStatus: true,
  premiumStatus: true,
  approvalStatus: true,
  accountType: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  preferredLanguage: true,
  fontSizePreference: true,
  joinDate: true,
  subscriptionExpiryDate: true,
  lastRenewalDate: true,
  isBlocked: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * GET /auth/me
 * Returns the authenticated user's profile (401 if not authenticated).
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await userRepo.findByAuthIdentity(req.user);

    if (!user) {
      return res.status(404).json({ error: 'User profile not found in PostgreSQL' });
    }

    res.json({
      user: UserRepository.toPublic(
        await userRepo.prisma.user.findUnique({
          where: { id: user.id },
          select: PROFILE_FIELDS,
        }),
      ),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /auth/me
 * Updates the authenticated user's own profile fields (whitelisted).
 * Role / accountType are NOT updatable here (admin-only via /users/:id/role).
 */
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await userRepo.findByAuthIdentity(req.user);

    if (!user) {
      return res.status(404).json({ error: 'User profile not found in PostgreSQL' });
    }

    const body = req.body || {};
    const data = {};

    // preferredLanguage must be normalized to the canonical Prisma enum value
    if (body.preferredLanguage !== undefined) {
      const lang = normalizeLanguage(body.preferredLanguage);
      if (!lang) {
        return res.status(400).json({ error: 'Invalid preferredLanguage value' });
      }
      data.preferredLanguage = lang;
    }

    // fontSizePreference is a free-text scale string (e.g. '1.0', 'normal')
    if (body.fontSizePreference !== undefined) {
      const fs = String(body.fontSizePreference).trim();
      if (!fs) return res.status(400).json({ error: 'Invalid fontSizePreference value' });
      data.fontSizePreference = fs;
    }

    const updatable = ['name', 'avatar', 'phone', 'address', 'city', 'state', 'pincode'];
    for (const key of updatable) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const updated = await userRepo.updateSelfProfile(user.id, data);

    res.json({
      user: UserRepository.toPublic(
        await userRepo.prisma.user.findUnique({
          where: { id: updated.id },
          select: PROFILE_FIELDS,
        }),
      ),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
