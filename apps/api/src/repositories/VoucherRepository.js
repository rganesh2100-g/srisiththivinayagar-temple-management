// ═══════════════════════════════════════════════════════════════════════════════
// VoucherRepository — domain aggregate: vouchers
//
// Model: Voucher (prisma/schema.prisma)
//
// H9 Expense & Financial Ledger — mirrored from PocketBase vouchers records
// (PB stays authoritative; PG receives mirror-pushed rows). Mirror writes use
// idempotent upserts keyed on the PB voucher id.
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class VoucherRepository extends BaseRepository {
  constructor(client) {
    super(client);
  }
}

export default VoucherRepository;