// ═══════════════════════════════════════════════════════════════════════════════
// Prisma Client Singleton
// Prevents multiple Prisma instances in development with hot module reload
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Log slow queries (>500ms) in development
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      logger.warn(`[PRISMA] Slow query (${e.duration}ms): ${e.query.slice(0, 200)}`);
    }
  });
}

/**
 * Transaction helper — wraps Prisma's interactive transaction.
 *
 * Usage:
 *   import { withTransaction } from '../lib/prisma.js';
 *   const result = await withTransaction(async (tx) => {
 *     const user = await tx.user.create({ data: {...} });
 *     const booking = await tx.poojaBooking.create({ data: {...} });
 *     return { user, booking };
 *   });
 *
 * @param {Function} fn - Callback receiving the transactional Prisma client
 * @param {Object} [options] - Transaction options
 * @param {number} [options.maxWait=5000] - Max time to wait for a transaction slot (ms)
 * @param {number} [options.timeout=10000] - Max time the transaction can run (ms)
 * @returns {Promise<*>} - Return value of the callback
 */
export async function withTransaction(fn, options = {}) {
  return prisma.$transaction(fn, {
    maxWait: options.maxWait ?? 5000,
    timeout: options.timeout ?? 10000,
  });
}

export default prisma;
