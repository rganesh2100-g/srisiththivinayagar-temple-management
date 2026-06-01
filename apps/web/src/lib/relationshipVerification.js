/**
 * Utility to verify that PocketBase queries include necessary expand parameters
 * to avoid N+1 query problems, especially after TEXT to RELATION migrations.
 * 
 * Uses Vite's import.meta.env for browser-compatible environment detection.
 */

const COLLECTIONS_WITH_RELATIONS = {
  'pooja_bookings': ['user', 'pooja'],
  'donations': ['user'],
  'pending_subscriptions': ['user', 'subscription'],
  'subscriptions': ['user'],
  'payments': ['user', 'approved_by']
};

export const verifyQueryExpand = (collectionName, options = {}) => {
  // Skip verification in production mode (browser-compatible check using Vite's import.meta.env)
  if (import.meta.env.MODE === 'production') return;

  const expectedExpands = COLLECTIONS_WITH_RELATIONS[collectionName];
  if (!expectedExpands) return;

  const providedExpands = options.expand ? options.expand.split(',').map(s => s.trim()) : [];
  
  const missingExpands = expectedExpands.filter(exp => !providedExpands.includes(exp));

  if (missingExpands.length > 0) {
    console.warn(
      `[PocketBase Optimization Warning] Query to '${collectionName}' is missing recommended expand parameters: ${missingExpands.join(', ')}. ` +
      `Consider adding { expand: '${expectedExpands.join(',')}' } to avoid N+1 queries.`
    );
  }
};

export default verifyQueryExpand;