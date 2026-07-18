// ═══════════════════════════════════════════════════════════════════════════════
// Sri Siththi Vinayagar Temple — Database Seed Script (Orchestration Layer)
//
// Production-grade, enterprise-level seeding framework.
// Runs all seed modules inside a single Prisma interactive transaction.
// Safe to execute unlimited times — never creates duplicate records.
//
// Usage:  npx prisma db seed
//
// Execution Order:
//   1. Master Data       — Classifications, Account Types
//   2. Reference Data    — Expense Categories, Photo Categories
//   3. System Config     — (reserved for future system settings)
//   4. Admin Users       — Administrator accounts
//
// Adding New Seed Modules:
//   1. Create prisma/seed/<moduleName>.js exporting a data array
//   2. Import it in this file
//   3. Register it in the appropriate execution phase via seedSection()
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import {
  createTracker,
  createTimer,
  formatDuration,
  logSection,
  logResult,
  logSummary,
  logFinalSummary,
  withTimestamps,
} from './seed/helpers.js';

import { CLASSIFICATIONS }          from './seed/classifications.js';
import { ACCOUNT_TYPES }            from './seed/accountTypes.js';
import { EXPENSE_CATEGORIES }       from './seed/expenseCategories.js';
import { PHOTO_CATEGORIES }         from './seed/photoCategories.js';
import { ADMIN_USERS, getAdminPassword } from './seed/adminUsers.js';

// ─── Prisma Client ─────────────────────────────────────────────────────────
const prisma = new PrismaClient();

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Upsert a single record using a unique field as the key.
 * Logs the result to the tracker and console.
 *
 * @param {PrismaClient} tx       - Transactional Prisma client
 * @param {string}       model    - Prisma model name (e.g. 'expenseCategory')
 * @param {string}       keyField - Unique field used for lookup (e.g. 'name')
 * @param {string}       keyValue - Value to match
 * @param {object}       createData - Data for initial creation
 * @param {object}       updateData - Data for updates (if record exists)
 * @param {object}       tracker  - Operation tracker
 * @returns {Promise<'created'|'updated'|'skipped'>}
 */
async function upsertRecord(tx, model, keyField, keyValue, createData, updateData, tracker) {
  try {
    const existing = await tx[model].findUnique({ where: { [keyField]: keyValue } });

    if (existing) {
      const hasChanges = Object.keys(updateData).some(
        (k) => JSON.stringify(existing[k]) !== JSON.stringify(updateData[k]),
      );

      if (!hasChanges) {
        tracker.skipped();
        logResult('skipped', `${keyValue}`);
        return 'skipped';
      }

      await tx[model].update({ where: { [keyField]: keyValue }, data: updateData });
      tracker.updated();
      logResult('updated', `${keyValue}`);
      return 'updated';
    }

    await tx[model].create({ data: createData });
    tracker.created();
    logResult('created', `${keyValue}`);
    return 'created';
  } catch (err) {
    tracker.failed();
    logResult('failed', `${keyValue}`, err.message);
    return 'failed';
  }
}

/**
 * Seed a batch of simple records (name + optional fields).
 * Each record is upserted by 'name'.
 *
 * @param {PrismaClient} tx
 * @param {string}       model        - Prisma model name
 * @param {Array}        records      - Array of { name, ...fields }
 * @param {object}       tracker
 * @param {object}       [extra]      - Static fields to merge into every record
 */
async function seedSimpleRecords(tx, model, records, tracker, extra = {}) {
  for (const record of records) {
    const { name, ...fields } = record;
    const createData = { name, ...fields, ...extra };
    const updateData = { ...fields };
    await upsertRecord(tx, model, 'name', name, createData, updateData, tracker);
  }
}

// ─── Seed Sections ─────────────────────────────────────────────────────────

/**
 * Phase 1: Master Data
 * Core reference tables that other data may depend on.
 */
async function seedMasterData(tx, tracker) {
  logSection('Phase 1 — Master Data');

  logSection('  Classifications');
  await seedSimpleRecords(tx, 'classification', CLASSIFICATIONS, tracker);

  logSection('  Account Types');
  await seedSimpleRecords(tx, 'accountTypeRecord', ACCOUNT_TYPES, tracker);
}

/**
 * Phase 2: Reference Data
 * Lookup tables used across the application.
 */
async function seedReferenceData(tx, tracker) {
  logSection('Phase 2 — Reference Data');

  logSection('  Expense Categories');
  await seedSimpleRecords(tx, 'expenseCategory', EXPENSE_CATEGORIES, tracker);

  logSection('  Photo Categories');
  for (const cat of PHOTO_CATEGORIES) {
    const { name, ...fields } = cat;
    const createData = { name, ...fields };
    const updateData = { ...fields };
    await upsertRecord(tx, 'photoCategory', 'name', name, createData, updateData, tracker);
  }
}

/**
 * Phase 3: System Configuration
 * Reserved for future system-level configuration seed data.
 * Currently a no-op — add configuration records here as needed.
 */
async function seedSystemConfig(_tx, _tracker) {
  logSection('Phase 3 — System Configuration');
  console.log('  (no system configuration records to seed)');
}

/**
 * Phase 4: Admin Users
 * Administrator accounts with bcrypt-hashed passwords.
 * Password read from ADMIN_DEFAULT_PASSWORD env var with fallback.
 */
async function seedAdminUsers(tx, tracker) {
  logSection('Phase 4 — Admin Users');

  const password = getAdminPassword();
  const hashedPassword = await bcrypt.hash(password, 12);

  for (const admin of ADMIN_USERS) {
    const createData = withTimestamps({
      ...admin,
      password: hashedPassword,
      verified: true,
      emailVisibility: false,
      fontSizePreference: 'normal',
      isBlocked: false,
      isDeleted: false,
      archived: false,
    });

    const updateData = {
      name: admin.name,
      role: admin.role,
      membershipTier: admin.membershipTier,
      membershipType: admin.membershipType,
      subscriptionStatus: admin.subscriptionStatus,
      premiumStatus: admin.premiumStatus,
      approvalStatus: admin.approvalStatus,
      accountType: admin.accountType,
      password: hashedPassword,
    };

    await upsertRecord(tx, 'user', 'email', admin.email, createData, updateData, tracker);
  }
}

// ─── Seed Registration ─────────────────────────────────────────────────────

/**
 * Define the seed execution order.
 * To add a new module: create the file, import it, add an entry here.
 * @type {Array<{name: string, fn: (tx: PrismaClient, tracker: object) => Promise<void>}>}
 */
const SEED_PHASES = [
  { name: 'Master Data',         fn: seedMasterData },
  { name: 'Reference Data',      fn: seedReferenceData },
  { name: 'System Configuration', fn: seedSystemConfig },
  { name: 'Admin Users',         fn: seedAdminUsers },
];

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const totalTimer = createTimer();
  const sectionResults = [];
  const totals = { created: 0, updated: 0, skipped: 0, failed: 0 };

  console.log('');
  console.log('═'.repeat(60));
  console.log('  Sri Siththi Vinayagar Temple — Database Seed');
  console.log('  Mode: Idempotent | Transaction-Safe | Re-runnable');
  console.log('═'.repeat(60));

  await prisma.$transaction(async (tx) => {
    for (const phase of SEED_PHASES) {
      const phaseTimer = createTimer();
      const tracker = createTracker();

      await phase.fn(tx, tracker);

      const durationMs = phaseTimer.elapsed();
      const counts = tracker.snapshot();

      sectionResults.push({ label: phase.name, counts, durationMs });
      totals.created  += counts.created;
      totals.updated  += counts.updated;
      totals.skipped  += counts.skipped;
      totals.failed   += counts.failed;

      logSummary(phase.name, counts, durationMs);
    }
  }, { timeout: 60_000 });

  logFinalSummary(totals, totalTimer.elapsed(), sectionResults);

  if (totals.failed > 0) {
    console.log(`  ⚠  ${totals.failed} operation(s) failed — review output above`);
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('');
    console.error('═'.repeat(60));
    console.error('  SEED FAILED');
    console.error('═'.repeat(60));
    console.error(`  Error: ${err.message}`);
    console.error('');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
