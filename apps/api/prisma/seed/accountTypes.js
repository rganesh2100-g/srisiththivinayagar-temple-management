// ═══════════════════════════════════════════════════════════════════════════════
// Sri Siththi Vinayagar Temple — Seed Data: Account Types
// Default account type records for user classification.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Account type records.
 * Each name is unique — used as the upsert key.
 * @type {Array<{name: string, description: string}>}
 */
export const ACCOUNT_TYPES = [
  { name: 'Free Member',     description: 'Basic registered user with limited access' },
  { name: 'Premium Member',  description: 'Paid subscriber with full access' },
  { name: 'Admin',           description: 'Temple administrator with full system access' },
];
