// ═══════════════════════════════════════════════════════════════════════════════
// ExpenseRepository — domain aggregate: expenses
//
// Model: Expense (prisma/schema.prisma)
//
// H9 Expense & Financial Ledger — mirrored from PocketBase expense records
// (PB stays authoritative; PG receives mirror-pushed rows). Mirror writes use
// idempotent upserts keyed on the PB expense id.
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class ExpenseRepository extends BaseRepository {
  constructor(client) {
    super(client);
  }
}

export default ExpenseRepository;