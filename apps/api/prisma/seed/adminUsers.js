// ═══════════════════════════════════════════════════════════════════════════════
// Sri Siththi Vinayagar Temple — Seed Data: Admin Users
// Default administrator accounts required by the application.
// Source of truth: apps/api/src/utils/adminUserSetup.js
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default admin password.
 * Read from ADMIN_DEFAULT_PASSWORD env var; falls back to 'Temple@2024'.
 * @returns {string}
 */
export function getAdminPassword() {
  return process.env.ADMIN_DEFAULT_PASSWORD || 'Temple@2024';
}

/**
 * Admin user records.
 * Each email is unique — used as the upsert key.
 * @type {Array<object>}
 */
export const ADMIN_USERS = [
  {
    email: 'rganesh2100@gmail.com',
    name: 'R. Ganesh',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'admin',
  },
  {
    email: 'admin@localhost.com',
    name: 'Temple Admin',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'admin',
  },
  {
    email: 'sri.siththi.vinayagar@gmail.com',
    name: 'Temple Secretary',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'admin',
  },
  {
    email: 'srisithivinayagartempel@gmail.com',
    name: 'Temple President',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'admin',
  },
];
