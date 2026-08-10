// ═══════════════════════════════════════════════════════════════════════════════
// PaymentRepository — domain aggregate: payments
//
// Model: Payment (prisma/schema.prisma)
//
// TODO — responsibilities introduced when the Payment domain is migrated:
//   - find payments by id
//   - list payments with filters (user, status, date range) and pagination
//   - create/update payments
//   - manage payment approval/verification status
//   - read approval logs (see ApprovalLog)
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class PaymentRepository extends BaseRepository {
  constructor() {
    super();
  }
}

export default PaymentRepository;
