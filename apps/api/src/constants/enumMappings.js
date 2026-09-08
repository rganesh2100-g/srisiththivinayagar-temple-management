// ═══════════════════════════════════════════════════════════════════════════════
// enumMappings — canonical value mappings for the H3 Users/Auth slice
//
// During the PocketBase → Prisma transition, legacy free-text values must be
// normalized to canonical Prisma values at the API boundary.
// ═══════════════════════════════════════════════════════════════════════════════

// canonical PreferredLanguage values (Prisma enum: Tamil | English | Deutsch)
export const CANONICAL_LANGUAGES = ['Tamil', 'English', 'Deutsch'];

// map inbound/legacy language labels → canonical Prisma value
export const LANGUAGE_ALIASES = {
  Tamil: 'Tamil',
  tamil: 'Tamil',
  English: 'English',
  english: 'English',
  en: 'English',
  Deutsch: 'Deutsch',
  deutsch: 'Deutsch',
  German: 'Deutsch',
  german: 'Deutsch',
  de: 'Deutsch',
};

// canonical accountType values (String) — written by admins & seed
export const CANONICAL_ACCOUNT_TYPES = [
  'Free Membership',
  'Premium Membership',
  'Admin',
];

// accept either canonical or legacy values; returns canonical
export function normalizeAccountType(value) {
  if (!value) return 'Free Membership';
  const v = String(value).trim();

  if (CANONICAL_ACCOUNT_TYPES.includes(v)) return v;

  switch (v.toLowerCase()) {
    case 'admin':
      return 'Admin';
    case 'premium_member':
    case 'premium member':
    case 'premium membership':
      return 'Premium Membership';
    case 'free_member':
    case 'free member':
    case 'free membership':
      return 'Free Membership';
    default:
      return 'Free Membership';
  }
}

// normalize a language string to a canonical PreferredLanguage value (or null)
export function normalizeLanguage(value) {
  if (!value) return null;
  const v = String(value).trim();
  return LANGUAGE_ALIASES[v] || null;
}

// canonical Prisma roles
export const CANONICAL_ROLES = ['user', 'admin'];

// normalize an inbound role to a canonical Prisma UserRole value (or null)
export function normalizeRole(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  return CANONICAL_ROLES.includes(v) ? v : null;
}
