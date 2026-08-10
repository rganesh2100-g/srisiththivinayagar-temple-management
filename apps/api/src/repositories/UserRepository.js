// ═══════════════════════════════════════════════════════════════════════════════
// UserRepository — domain aggregate: users
//
// Model: User (prisma/schema.prisma)
//
// TODO — responsibilities introduced when the User domain is migrated:
//   - find user accounts by id/email
//   - list users with role/membership filters and pagination
//   - create/update user profiles (name, avatar, preferences)
//   - manage roles, membership tier, subscription status
//   - soft delete / archive user accounts
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class UserRepository extends BaseRepository {
  constructor() {
    super();
  }
}

export default UserRepository;
