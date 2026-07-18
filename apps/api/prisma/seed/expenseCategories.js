// ═══════════════════════════════════════════════════════════════════════════════
// Sri Siththi Vinayagar Temple — Seed Data: Expense Categories
// Default expense categories for financial tracking.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expense category records.
 * Each name is unique — used as the upsert key.
 * @type {Array<{name: string, description: string}>}
 */
export const EXPENSE_CATEGORIES = [
  { name: 'Annadhanam',        description: 'Free food distribution' },
  { name: 'Temple Maintenance', description: 'Temple upkeep and repairs' },
  { name: 'Goshala',           description: 'Cow shelter maintenance' },
  { name: 'Veda Pathshala',    description: 'Vedic education' },
  { name: 'General Fund',      description: 'General temple operations' },
  { name: 'Pooja Services',    description: 'Pooja materials and services' },
  { name: 'Other',             description: 'Miscellaneous expenses' },
];
