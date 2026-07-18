// ═══════════════════════════════════════════════════════════════════════════════
// Sri Siththi Vinayagar Temple — Seed Data: Photo Categories
// Default gallery photo categories.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Photo category records.
 * Each name is unique — used as the upsert key.
 * @type {Array<{name: string, description: string, isPublished: boolean}>}
 */
export const PHOTO_CATEGORIES = [
  { name: 'Temple',    description: 'Temple photos',       isPublished: true },
  { name: 'Festivals', description: 'Festival celebrations', isPublished: true },
  { name: 'Events',    description: 'Temple events',        isPublished: true },
  { name: 'Poojas',    description: 'Pooja ceremonies',     isPublished: true },
];
