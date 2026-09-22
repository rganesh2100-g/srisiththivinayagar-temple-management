// ═══════════════════════════════════════════════════════════════════════════════
// ExpenseCategoryRepository — domain aggregate: expense categories
//
// Model: ExpenseCategory (prisma/schema.prisma)
//
// H9 Expense & Financial Ledger — mirrored from PocketBase expense_categories
// records (PB stays authoritative; PG receives mirror-pushed rows). Mirror
// writes use idempotent upserts keyed on the PB category id.
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class ExpenseCategoryRepository extends BaseRepository {
  constructor(client) {
    super(client);
  }
}

export default ExpenseCategoryRepository;