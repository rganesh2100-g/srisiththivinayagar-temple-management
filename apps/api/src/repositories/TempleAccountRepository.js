// ═══════════════════════════════════════════════════════════════════════════════
// TempleAccountRepository — domain aggregate: temple accounts
//
// Model: TempleAccount (prisma/schema.prisma)
//
// H9 Expense & Financial Ledger — TempleAccount rows are mirrored from
// PocketBase temple_accounts records (PB stays authoritative; PG receives
// mirror-pushed rows). H9 mirrors every PB temple_accounts row as it exists:
//   - expense-originated rows carry transactionId "EXP-<expenseId>" (created
//     by ExpenseManagerPage) → PG id "ta_EXP-<expenseId>"
//   - donation/payment/booking-originated rows (if ever created in PB) keep
//     transactionId = origin PB id → PG id "ta_<originId>", converging with
//     the donationMirror STEP-4 / paymentMirror / poojaBookingMirror schemes.
//
// NOTE: The mirror service writes idempotently (upsert on the deterministic
// `ta_<transaction_id>` PK) so this repository stays a thin access stub.
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class TempleAccountRepository extends BaseRepository {
  constructor(client) {
    super(client);
  }
}

export default TempleAccountRepository;