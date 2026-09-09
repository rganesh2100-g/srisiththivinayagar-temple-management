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
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Map a Prisma user row to the frontend profile shape.
 * H3 consumers read camelCase keys; legacy frontend consumers still read the
 * PocketBase-style snake_case keys. Both are provided — additive only.
 */
function toProfileShape(u) {
  return {
    id: u.id,
    pocketbaseId: u.pocketbaseId,
    email: u.email,
    name: u.name,
    full_name: u.name,
    avatar: u.avatar,
    verified: u.verified,
    role: u.role,
    membershipTier: u.membershipTier,
    membership_tier: u.membershipTier,
    membershipType: u.membershipType,
    membership_type: u.membershipType,
    subscriptionStatus: u.subscriptionStatus,
    subscription_status: u.subscriptionStatus,
    premiumStatus: u.premiumStatus,
    premium_status: u.premiumStatus,
    approvalStatus: u.approvalStatus,
    approval_status: u.approvalStatus,
    accountType: u.accountType,
    account_type: u.accountType,
    phone: u.phone,
    address: u.address,
    city: u.city,
    state: u.state,
    pincode: u.pincode,
    preferredLanguage: u.preferredLanguage,
    preferred_language: u.preferredLanguage,
    fontSizePreference: u.fontSizePreference,
    joinDate: u.joinDate,
    join_date: u.joinDate,
    subscriptionExpiryDate: u.subscriptionExpiryDate,
    subscription_expiry_date: u.subscriptionExpiryDate,
    lastRenewalDate: u.lastRenewalDate,
    last_renewal_date: u.lastRenewalDate,
    isBlocked: u.isBlocked,
    is_blocked: u.isBlocked,
    isDeleted: u.isDeleted,
    is_deleted: u.isDeleted,
    created: u.createdAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/**
 * Resolve the authenticated PB identity into its PostgreSQL user, creating a
 * mirrored PG row on first access (lazy mirror — no bulk migration).
 */
async function resolveCurrentUser(req) {
  return userRepo.getOrCreateByAuthIdentity(req.user, req.pbUser || null);
}

/**
 * GET /auth/me
 * Returns the authenticated user's profile (401 if not authenticated,
 * 404 if the PG mirror could not be established).
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await resolveCurrentUser(req);

    if (!user) {
      return res.status(404).json({ error: 'User profile not found in PostgreSQL' });
    }

    res.json({
      user: toProfileShape(
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
    const user = await resolveCurrentUser(req);

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
      user: toProfileShape(
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
