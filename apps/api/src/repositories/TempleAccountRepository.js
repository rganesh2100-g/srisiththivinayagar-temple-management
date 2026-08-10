// ═══════════════════════════════════════════════════════════════════════════════
// TempleAccountRepository — domain aggregate: temple accounts
//
// Model: TempleAccount (prisma/schema.prisma)
//
// TODO — responsibilities introduced when the Temple Account domain is migrated:
//   - find temple accounts by id
//   - list temple accounts with status filters and pagination
//   - create/update temple accounts
//   - manage account balance and transaction linkage
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class TempleAccountRepository extends BaseRepository {
  constructor() {
    super();
  }
}

export default TempleAccountRepository;
