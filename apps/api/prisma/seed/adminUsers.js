// ═══════════════════════════════════════════════════════════════════════════════
// Sri Siththi Vinayagar Temple — Seed Data: Admin Users
// Default administrator accounts required by the application.
//
// NOTE (H3 Users/Auth slice): each record carries the REAL PocketBase users
// collection record id as `pocketbaseId`. PB remains the identity authority
// during the transition, and the auth middleware joins the PB JWT record.id
// to `User.pocketbaseId`. These records were read live from PB at build time.
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
 * pocketbaseId is the REAL PocketBase users-collection record id.
 * @type {Array<object>}
 */
export const ADMIN_USERS = [
  {
    email: 'admin@demo.com',
    pocketbaseId: 'vyzh8pduo1ivp12',
    name: 'Demo Admin',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'Admin',
  },
  {
    email: 'geeemmtechnology@gmail.com',
    pocketbaseId: '4dykilnsac17rq8',
    name: 'Admin User',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'Admin',
  },
  {
    email: 'apuurnan@gmail.com',
    pocketbaseId: 'oa6fwejh2dgg0bb',
    name: 'Admin User',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'Admin',
  },
  {
    email: 'newadmin@tempelvereein.de',
    pocketbaseId: 'cnkuw2z43i3qxce',
    name: 'Temple Admin',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'Admin',
  },
  {
    email: 'palaniakash1@gmail.com',
    pocketbaseId: 'yqz4r1eq58et2f8',
    name: 'Palaniadmin',
    role: 'admin',
    membershipTier: 'premium',
    membershipType: 'premium',
    subscriptionStatus: 'admin',
    premiumStatus: 'Active',
    approvalStatus: 'approved',
    accountType: 'Admin',
  },
];
