// ═══════════════════════════════════════════════════════════════════════════════
// UserRepository — domain aggregate: users
//
// Model: User (prisma/schema.prisma)
//
// H3 Users/Auth Vertical Slice — implements the active frontend contract:
//   - /auth/me       (GET)  → read current authenticated user's profile
//   - /auth/me       (PATCH)→ update current user's own profile
//   - /users         (GET)  → admin list of users
//   - /users/:id/role(PUT)  → admin role update (dual-write to PocketBase)
//
// Identity strategy: PocketBase remains the identity authority. The Prisma
// User row carries `pocketbaseId` (unique) to join the PB JWT record.id to the
// PostgreSQL user during the transition. Email fallback is used only when the
// pocketbaseId join is unavailable.
// ═══════════════════════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';
import BaseRepository from './BaseRepository.js';
import {
  normalizeAccountType,
  normalizeLanguage,
  normalizeRole,
} from '../constants/enumMappings.js';

// Prisma `UserRole` values
const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin',
};

// Map legacy PocketBase select values → canonical Prisma enum values.
const TIER_ALIASES = { premium: 'premium', free: 'free' };
const SUB_STATUS_ALIASES = { premium: 'premium', free: 'free', admin: 'admin' };
const PREMIUM_STATUS_ALIASES = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  '': 'Inactive',
  undefined: 'Inactive',
  null: 'Inactive',
};

function mapTier(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return TIER_ALIASES[v] || 'free';
}

function mapSubscriptionStatus(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return SUB_STATUS_ALIASES[v] || 'free';
}

function mapPremiumStatus(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return PREMIUM_STATUS_ALIASES[v] || 'Inactive';
}

class UserRepository extends BaseRepository {
  constructor(client) {
    super(client);
  }

  /**
   * Sanitize a user row for API responses (strip password/security fields).
   * @param {object} user
   * @returns {object}
   */
  static toPublic(user) {
    if (!user) return null;
    const { password, tokenKey, ...rest } = user;
    return rest;
  }

  /**
   * Resolve the Prisma user for an authenticated PB identity.
   * @param {{id?: string, email?: string}} auth - PB-derived identity
   * @returns {Promise<object|null>}
   */
  async findByAuthIdentity(auth) {
    if (!auth) return null;

    // Preferred join: PB record.id → pocketbaseId
    if (auth.id) {
      const byPb = await this.prisma.user.findUnique({
        where: { pocketbaseId: auth.id },
      });
      if (byPb) return byPb;
    }

    // Fallback join: email
    if (auth.email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: auth.email },
      });
      if (byEmail) return byEmail;
    }

    return null;
  }

  /**
   * Find a user by primary key.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Find a user by unique email.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  findByEmail(email) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Find a user by unique PocketBase id.
   * @param {string} pocketbaseId
   * @returns {Promise<object|null>}
   */
  findByPocketbaseId(pocketbaseId) {
    return this.prisma.user.findUnique({ where: { pocketbaseId } });
  }

  /**
   * Resolve the Prisma user for an authenticated PB identity, lazily creating
   * the PostgreSQL row the first time that PB user reaches an H3 users/auth
   * endpoint (LAZY USER MIRROR — no bulk/historical data migration).
   *
   * Lookup order: pocketbaseId → email (same as findByAuthIdentity).
   * Creation is idempotent: the `pocketbaseId` unique constraint (with a
   * re-fetch on race) prevents duplicates.
   *
   * @param {{id?: string, email?: string}} auth - PB-derived identity
   * @param {object|null} [pbRecord] - full PB users-collection record (req.pbUser)
   * @returns {Promise<object|null>}
   */
  async getOrCreateByAuthIdentity(auth, pbRecord = null) {
    if (!auth || !auth.id) return null;

    const existing = await this.findByAuthIdentity(auth);
    if (existing) return existing;

    // Creation requires the authenticated PB identity AND its PB record.
    if (!pbRecord || !pbRecord.id || pbRecord.id !== auth.id) return null;

    return this.mirrorUserFromPocketBase(pbRecord);
  }

  /**
   * Create (or resolve) a Prisma user from a PocketBase users record.
   * Mirrors only information that is actually available on the PB record;
   * everything else falls back to H3/current-application canonical defaults.
   * Does NOT invent historical subscription/account data.
   *
   * @param {object} pbRecord - PocketBase users-collection record
   * @returns {Promise<object|null>}
   */
  async mirrorUserFromPocketBase(pbRecord) {
    if (!pbRecord || !pbRecord.email) return null;

    const byPb = await this.findByPocketbaseId(pbRecord.id);
    if (byPb) return byPb;

    // Avoid email-unique collisions: adopt an existing PG row by email only
    // when it has no pocketbaseId yet (keeps pocketbaseId the primary bridge).
    const byEmail = await this.findByEmail(pbRecord.email);
    if (byEmail) {
      if (!byEmail.pocketbaseId) {
        return this.prisma.user.update({
          where: { id: byEmail.id },
          data: { pocketbaseId: pbRecord.id },
        });
      }
      return byEmail;
    }

    const name =
      pbRecord.name && String(pbRecord.name).trim().length >= 2
        ? String(pbRecord.name).trim()
        : null;
    const phone =
      pbRecord.phone && String(pbRecord.phone).trim().length > 0 && String(pbRecord.phone).trim().length <= 15
        ? String(pbRecord.phone).trim()
        : null;
    const accountType = normalizeAccountType(pbRecord.account_type);
    const preferredLanguage = normalizeLanguage(pbRecord.preferred_language) || 'Tamil';
    const fontSizePreference = pbRecord.fontSizePreference
      ? String(pbRecord.fontSizePreference)
      : 'normal';
    const approvalStatus = pbRecord.approval_status
      ? String(pbRecord.approval_status).trim()
      : null;
    const membershipTier = mapTier(pbRecord.membership_type ?? pbRecord.membershipTier);
    const subscriptionStatus = mapSubscriptionStatus(pbRecord.subscription_status);
    const premiumStatus = mapPremiumStatus(pbRecord.premium_status);
    const subscriptionExpiryDate = pbRecord.subscription_expiry_date
      ? new Date(pbRecord.subscription_expiry_date)
      : null;

    // PB remains the identity authority: this password is never used to log in.
    const password = await bcrypt.hash(`pb-mirror-${pbRecord.id}`, 12);

    const data = {
      pocketbaseId: pbRecord.id,
      email: pbRecord.email,
      name,
      avatar: pbRecord.avatar || null,
      verified: Boolean(pbRecord.verified),
      emailVisibility: false,
      password,
      role: normalizeRole(pbRecord.role) || 'user',
      membershipTier,
      membershipType: membershipTier,
      subscriptionStatus,
      premiumStatus,
      approvalStatus,
      accountType,
      phone,
      preferredLanguage,
      fontSizePreference,
      subscriptionExpiryDate,
      isBlocked: Boolean(pbRecord.is_blocked),
      isDeleted: Boolean(pbRecord.is_deleted),
    };

    try {
      return await this.prisma.user.create({ data });
    } catch (err) {
      // Unique-race guard (concurrent first access): re-resolve instead of failing.
      if (err && err.code === 'P2002') {
        const existing = await this.findByAuthIdentity({
          id: pbRecord.id,
          email: pbRecord.email,
        });
        if (existing) return existing;
        const byEmailAgain = await this.findByEmail(pbRecord.email);
        if (byEmailAgain) return byEmailAgain;
      }
      throw err;
    }
  }

  /**
   * List users with optional role grouping info.
   * Returns active (non-deleted) users ordered by newest join date.
   * @param {{role?: string, tier?: string, includeDeleted?: boolean, take?: number, skip?: number}} [opts]
   * @returns {Promise<Array<object>>}
   */
  async listUsers(opts = {}) {
    const where = {};
    if (!opts.includeDeleted) {
      where.isDeleted = false;
    }
    if (opts.role) {
      where.role = opts.role;
    }
    if (opts.tier) {
      where.membershipTier = opts.tier;
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.take,
      skip: opts.skip,
    });
  }

  /**
   * Count users matching the same filters as listUsers.
   * @param {{role?: string, tier?: string, includeDeleted?: boolean}} [opts]
   * @returns {Promise<number>}
   */
  async countUsers(opts = {}) {
    const where = {};
    if (!opts.includeDeleted) {
      where.isDeleted = false;
    }
    if (opts.role) {
      where.role = opts.role;
    }
    if (opts.tier) {
      where.membershipTier = opts.tier;
    }

    return this.prisma.user.count({ where });
  }

  /**
   * Create a user record.
   * @param {object} data
   * @returns {Promise<object>}
   */
  createUser(data) {
    return this.prisma.user.create({ data });
  }

  /**
   * Update a user's own profile (safe whitelisted fields only).
   * Never allows self-escalation of role/accountType here.
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  updateSelfProfile(id, data) {
    const allowed = {};
    const whitelist = [
      'name',
      'avatar',
      'phone',
      'address',
      'city',
      'state',
      'pincode',
      'preferredLanguage',
      'fontSizePreference',
    ];
    for (const key of whitelist) {
      if (data[key] !== undefined) {
        allowed[key] = data[key];
      }
    }
    return this.prisma.user.update({ where: { id }, data: allowed });
  }

  /**
   * Update a user's role (admin operation).
   * @param {string} id
   * @param {('user'|'admin')} role
   * @returns {Promise<object>}
   */
  updateRole(id, role) {
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  /**
   * Soft-delete a user (archive for the transition period).
   * @param {string} id
   * @returns {Promise<object>}
   */
  async deleteUser(id) {
    const now = new Date();
    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, deletedAt: now, archived: true },
    });
  }
}

export default UserRepository;
export { USER_ROLE };
