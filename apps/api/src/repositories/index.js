// ═══════════════════════════════════════════════════════════════════════════════
// Repository Layer — domain aggregate repositories
//
// NOTE: This layer is intentionally isolated. Nothing in the application imports
// these repositories yet. They will be wired up during the incremental
// PocketBase → Prisma migration.
// ═══════════════════════════════════════════════════════════════════════════════

export { default as BaseRepository } from './BaseRepository.js';
export { default as UserRepository } from './UserRepository.js';
export { default as DonationRepository } from './DonationRepository.js';
export { default as SubscriptionRepository } from './SubscriptionRepository.js';
export { default as PendingSubscriptionRepository } from './PendingSubscriptionRepository.js';
export { default as PoojaRepository } from './PoojaRepository.js';
export { default as PaymentRepository } from './PaymentRepository.js';
export { default as TempleAccountRepository } from './TempleAccountRepository.js';
export { default as ExpenseRepository } from './ExpenseRepository.js';
export { default as ExpenseCategoryRepository } from './ExpenseCategoryRepository.js';
export { default as ClassificationRepository } from './ClassificationRepository.js';
export { default as VoucherRepository } from './VoucherRepository.js';
