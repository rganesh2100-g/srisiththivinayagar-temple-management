// ═══════════════════════════════════════════════════════════════════════════════
// ClassificationRepository — domain aggregate: expense classifications
//
// Model: Classification (prisma/schema.prisma)
//
// H9 Expense & Financial Ledger — mirrored from PocketBase classifications
// records (PB stays authoritative; PG receives mirror-pushed rows). Mirror
// writes use idempotent upserts keyed on the PB classification id.
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class ClassificationRepository extends BaseRepository {
  constructor(client) {
    super(client);
  }
}

export default ClassificationRepository;