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
import { normalizeRole, normalizeAccountType } from '../constants/enumMappings.js';

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
 * If no PG row exists yet, lazily mirror the PB record (H4 lazy mirror) so the
 * role-page can still operate on PB users that have not hit an H3 endpoint.
 */
async function resolveUserById(idValue) {
  let user = await userRepo.findById(idValue);
  if (user) return user;
  user = await userRepo.findByPocketbaseId(idValue);
  if (user) return user;

  try {
    const pbRecord = await pb.collection('users').getOne(idValue);
    return await userRepo.mirrorUserFromPocketBase(pbRecord);
  } catch (pbErr) {
    logger.warn(`[USERS-RESOLVE] PB lookup failed for ${idValue}: ${pbErr.message}`);
    return null;
  }
}

/**
 * Resolve the authenticated admin into PostgreSQL (lazy mirror).
 * Logs a warning on failure but does not block listing (PB auth already passed).
 */
async function resolveRequester(req) {
  try {
    return await userRepo.getOrCreateByAuthIdentity(req.user, req.pbUser || null);
  } catch (err) {
    logger.warn(`[USERS-REQ] Failed to mirror authenticated admin ${req.user?.id}: ${err.message}`);
    return null;
  }
}

/**
 * GET /users
 * Admin-only paginated list with search + role filter.
 * Response matches AdminRoleManagement.jsx: { data, pagination: { totalPages } }.
 */
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    await resolveRequester(req);
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

    const requester = await resolveRequester(req);
    if (!requester) {
      return res.status(500).json({ error: 'Failed to resolve authenticated admin in PostgreSQL' });
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

/**
 * PUT /users/:id/account-type
 * Admin-only explicit account-type update (H5).
 * Dual-write contract (mirrors PUT /:id/role):
 *   1. PG commit first with the canonical accountType value.
 *   2. Mirror the EXACT UI value to PocketBase (PB contract stays byte-for-byte).
 *   3. If the PB mirror fails, revert the PG accountType and return 500.
 * Body: { accountType: 'Free Membership' | 'Premium Membership' | 'admin' | ... }
 */
router.put('/:id/account-type', requireAdmin, async (req, res, next) => {
  try {
    const incoming = String((req.body || {}).accountType ?? '').trim();
    if (!incoming) {
      return res.status(400).json({ error: 'accountType is required and must be a non-empty string' });
    }

    const requester = await resolveRequester(req);
    if (!requester) {
      return res.status(500).json({ error: 'Failed to resolve authenticated admin in PostgreSQL' });
    }

    const target = await resolveUserById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    const canonical = normalizeAccountType(incoming);
    const previousAccountType = target.accountType;

    if (canonical === previousAccountType) {
      return res.json({
        data: {
          id: target.id,
          pocketbaseId: target.pocketbaseId,
          email: target.email,
          name: target.name,
          role: target.role,
          verified: target.verified,
          accountType: canonical,
          account_type: incoming,
        },
      });
    }

    // 1. Commit PostgreSQL first (canonical value)
    let updated;
    try {
      updated = await userRepo.updateAccountType(target.id, canonical);
    } catch (pgErr) {
      logger.error(`[USERS-ACCOUNT-TYPE] PG update failed for ${target.email}: ${pgErr.message}`);
      return res.status(500).json({ error: 'Failed to update account type in PostgreSQL' });
    }

    // 2. Mirror the EXACT UI value to PocketBase (do not canonicalize PB)
    const pbUserId = target.pocketbaseId || target.id;
    try {
      await pb.collection('users').update(pbUserId, { account_type: incoming });
    } catch (pbErr) {
      logger.error(`[USERS-ACCOUNT-TYPE] PB mirror failed for ${pbUserId}: ${pbErr.message}`);
      // Revert PG to keep the two stores consistent
      try {
        await userRepo.updateAccountType(target.id, previousAccountType);
      } catch (revertErr) {
        logger.error(`[USERS-ACCOUNT-TYPE] PG revert failed for ${target.email}: ${revertErr.message}`);
      }
      return res.status(500).json({ error: 'Failed to mirror account type to PocketBase; PG change reverted' });
    }

    res.json({
      data: {
        id: updated.id,
        pocketbaseId: updated.pocketbaseId,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        verified: updated.verified,
        accountType: canonical,
        account_type: incoming,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /users/:id
 * Admin-only user deletion (H5).
 * PocketBase remains authoritative for the destructive deletion (as the UI did
 * before H5). Order:
 *   1. Resolve the target (PG id, pocketbaseId, or lazy PB mirror).
 *   2. Delete the PocketBase user FIRST — if it fails, PostgreSQL is untouched (500).
 *   3. On PB success, hard-delete the PostgreSQL row.
 *   4. If PG hard delete fails on a restrictive FK (P2003), soft-delete the PG
 *      row (isDeleted=true, deletedAt, archived) so GET /users keeps excluding it.
 * Related business records are never cascade-deleted.
 */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const requester = await resolveRequester(req);
    if (!requester) {
      return res.status(500).json({ error: 'Failed to resolve authenticated admin in PostgreSQL' });
    }

    const target = await resolveUserById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. PocketBase deletion is authoritative — abort without PG changes if it fails.
    const pbUserId = target.pocketbaseId || target.id;
    try {
      await pb.collection('users').delete(pbUserId);
    } catch (pbErr) {
      logger.error(`[USERS-DELETE] PB delete failed for ${pbUserId}: ${pbErr.message}`);
      return res.status(500).json({ error: 'Failed to delete user in PocketBase; PostgreSQL unchanged' });
    }

    // 2. PostgreSQL hard delete (no cascading).
    let soft = false;
    try {
      await userRepo.deleteUserHard(target.id);
    } catch (pgErr) {
      if (pgErr && pgErr.code === 'P2003') {
        // 3. Restrictive FK → approved soft-delete fallback.
        logger.warn(`[USERS-DELETE] PG hard delete blocked by FK for ${target.email}; soft-deleting`);
        await userRepo.deleteUser(target.id);
        soft = true;
      } else {
        logger.error(`[USERS-DELETE] PG hard delete failed for ${target.email}: ${pgErr.message}`);
        throw pgErr;
      }
    }

    res.json({
      data: { id: target.id, email: target.email, deleted: true, soft },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
