// ═══════════════════════════════════════════════════════════════════════════════
// users routes — admin user management (H3 Users/Auth slice)
//
// GET  /users          → admin paginated list of users
// PUT  /users/:id/role → admin role update (dual-write PG + PocketBase)
//
// Dual-write contract: PG commit first, then mirror the role to PocketBase.
// If the PB mirror fails, revert the PG role and return 500. This guarantees
// PG and PB stay consistent because the frontend still reads users from PB
// for list pages during the transition.
// ═══════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { Router } from 'express';
import logger from '../utils/logger.js';
import pb from '../utils/pocketbaseClient.js';
import UserRepository from '../repositories/UserRepository.js';
import { requireAdmin } from '../middleware/requireAuth.js';
import { normalizeRole } from '../constants/enumMappings.js';

const router = Router();
const userRepo = new UserRepository();

// Public fields for the admin list page (AdminRoleManagement.jsx contract).
const LIST_FIELDS = {
  id: true,
  pocketbaseId: true,
  email: true,
  name: true,
  role: true,
  verified: true,
  membershipTier: true,
  isBlocked: true,
  isDeleted: true,
  createdAt: true,
};

/**
 * Map a Prisma user row to the frontend list shape.
 * Preserves both `name` and `full_name` (AdminRoleManagement reads either).
 */
function toListShape(u) {
  return {
    id: u.id,
    pocketbaseId: u.pocketbaseId,
    email: u.email,
    name: u.name,
    full_name: u.name,
    role: u.role,
    verified: u.verified,
    membership_tier: u.membershipTier,
    created: u.createdAt,
  };
}

/**
 * Resolve a Prisma user by the incoming :id.
 * Accepts either a PG uuid (`User.id`) or a PocketBase id (`User.pocketbaseId`),
 * because the transition frontend passes PB record ids, while PG uses uuids.
 */
async function resolveUserById(idValue) {
  let user = await userRepo.findById(idValue);
  if (user) return user;
  user = await userRepo.findByPocketbaseId(idValue);
  return user;
}

/**
 * GET /users
 * Admin-only paginated list with search + role filter.
 * Response matches AdminRoleManagement.jsx: { data, pagination: { totalPages } }.
 */
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || '').toString().trim();
    const roleFilter = (req.query.roleFilter || '').toString().trim();

    const where = { isDeleted: false };
    if (roleFilter && roleFilter !== 'all') {
      const role = normalizeRole(roleFilter);
      if (role) where.role = role;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      userRepo.prisma.user.findMany({
        where,
        select: LIST_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      userRepo.prisma.user.count({ where }),
    ]);

    res.json({
      data: rows.map(toListShape),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /users/:id/role
 * Admin-only role update with PG → PocketBase dual-write.
 * Body: { role: 'user' | 'admin' }
 */
router.put('/:id/role', requireAdmin, async (req, res, next) => {
  try {
    const role = normalizeRole((req.body || {}).role);
    if (!role) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin".' });
    }

    const target = await resolveUserById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.role === role) {
      return res.json({ data: { ...toListShape(target), role } });
    }

    const previousRole = target.role;

    // 1. Commit PG first
    let updated;
    try {
      updated = await userRepo.updateRole(target.id, role);
    } catch (pgErr) {
      logger.error(`[USERS-ROLE] PG role update failed for ${target.email}: ${pgErr.message}`);
      return res.status(500).json({ error: 'Failed to update role in PostgreSQL' });
    }

    // 2. Mirror to PocketBase (frontend still reads users from PB)
    const pbUserId = target.pocketbaseId || target.id;
    try {
      await pb.collection('users').update(pbUserId, { role });
    } catch (pbErr) {
      logger.error(`[USERS-ROLE] PB mirror failed for ${pbUserId}: ${pbErr.message}`);
      // Revert PG to keep the two stores consistent
      try {
        await userRepo.updateRole(target.id, previousRole);
      } catch (revertErr) {
        logger.error(`[USERS-ROLE] PG revert failed for ${target.email}: ${revertErr.message}`);
      }
      return res.status(500).json({ error: 'Failed to mirror role to PocketBase; PG change reverted' });
    }

    res.json({ data: { ...toListShape(updated), role } });
  } catch (err) {
    next(err);
  }
});

export default router;
