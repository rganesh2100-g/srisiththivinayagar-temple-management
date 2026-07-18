// ═══════════════════════════════════════════════════════════════════════════════
// Sri Siththi Vinayagar Temple — Seed Data: Classifications
// Default transaction classifications for financial reporting.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classification records.
 * Each name is unique — used as the upsert key.
 * @type {Array<{name: string, description: string}>}
 */
export const CLASSIFICATIONS = [
  { name: 'Donation',      description: 'Donation income' },
  { name: 'Pooja Booking', description: 'Pooja booking income' },
  { name: 'Subscription',  description: 'Membership subscription income' },
  { name: 'Expense',       description: 'General expense' },
  { name: 'Refund',        description: 'Refund transaction' },
];
