// ═══════════════════════════════════════════════════════════════════════════════
// BaseRepository — minimal infrastructure base class
//
// Responsibilities:
//   - receive the Prisma client through the constructor
//   - default to the existing Prisma singleton (src/lib/prisma.js)
//
// Intentional non-responsibilities:
//   - NO business logic
//   - NO PocketBase code
//   - NO CRUD implementation
//   - NO generic utility dumping ground
//
// NOTE: Transactions are NOT implemented here. Whenever transactions are needed,
// use the existing `withTransaction` helper from src/lib/prisma.js as the single
// source of truth.
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from '../lib/prisma.js';

class BaseRepository {
  constructor(client = prisma) {
    this.prisma = client;
  }
}

export default BaseRepository;
