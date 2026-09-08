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

import BaseRepository from './BaseRepository.js';

// Prisma `UserRole` values
const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin',
};

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
