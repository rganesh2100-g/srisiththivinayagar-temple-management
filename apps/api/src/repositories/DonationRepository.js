// ═══════════════════════════════════════════════════════════════════════════════
// DonationRepository — domain aggregate: donations
//
// Model: Donation (prisma/schema.prisma)
//
// TODO — responsibilities introduced when the Donation domain is migrated:
//   - find donations by id
//   - list donations with filters (user, date range, status) and pagination
//   - create/update donations
//   - soft delete / restore donations
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class DonationRepository extends BaseRepository {
  constructor() {
    super();
  }
}

export default DonationRepository;
