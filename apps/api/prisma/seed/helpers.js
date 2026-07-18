// ═══════════════════════════════════════════════════════════════════════════════
// Sri Siththi Vinayagar Temple — Seed Helper Utilities
// Reusable utilities for logging, timing, upserts, and summary reporting
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Track operation counts for summary reporting.
 * @returns {object} Tracker with increment and snapshot methods.
 */
export function createTracker() {
  const counts = { created: 0, updated: 0, skipped: 0, failed: 0 };

  return {
    created: () => { counts.created++; },
    updated: () => { counts.updated++; },
    skipped:  () => { counts.skipped++; },
    failed:   () => { counts.failed++; },
    snapshot: () => ({ ...counts }),
  };
}

/**
 * Return current timestamp as ISO string.
 * @returns {string}
 */
export function timestamp() {
  return new Date().toISOString();
}

/**
 * Format elapsed milliseconds to human-readable string.
 * @param {number} ms - Milliseconds elapsed.
 * @returns {string} e.g. "1.23s" or "456ms"
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * High-resolution timer using process.hrtime.bigint().
 * @returns {{ elapsed: () => number }} elapsed() returns ms since creation
 */
export function createTimer() {
  const start = process.hrtime.bigint();
  return {
    elapsed: () => Number(process.hrtime.bigint() - start) / 1e6,
  };
}

/**
 * Log a section header to stdout.
 * @param {string} title
 */
export function logSection(title) {
  console.log('');
  console.log(`▶ ${title}`);
}

/**
 * Log an individual operation result.
 * @param {'created'|'updated'|'skipped'|'failed'} status
 * @param {string} label - Record identifier (e.g. email or name)
 * @param {string} [detail] - Optional extra info for failed status
 */
export function logResult(status, label, detail) {
  const icons = { created: '✓', updated: '↻', skipped: '•', failed: '✗' };
  const suffixes = {
    created:  'created',
    updated:  'updated',
    skipped:  'already exists — skipping',
    failed:   `FAILED${detail ? `: ${detail}` : ''}`,
  };
  console.log(`  ${icons[status]} ${label} — ${suffixes[status]}`);
}

/**
 * Print a formatted execution summary table.
 * @param {string}   sectionName  - Seed section label
 * @param {object}   counts       - { created, updated, skipped, failed }
 * @param {number}   durationMs   - Section elapsed time in ms
 */
export function logSummary(sectionName, counts, durationMs) {
  console.log(`  Summary: +${counts.created} created  ~${counts.updated} updated  -${counts.skipped} skipped  !${counts.failed} failed  (${formatDuration(durationMs)})`);
}

/**
 * Print the final global summary after all sections complete.
 * @param {object} totals     - { created, updated, skipped, failed }
 * @param {number} durationMs - Total elapsed time in ms
 * @param {Array<{label:string, counts:object, durationMs:number}>} sections - Per-section data
 */
export function logFinalSummary(totals, durationMs, sections) {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  SEED EXECUTION SUMMARY');
  console.log('═'.repeat(60));
  console.log('');

  for (const s of sections) {
    const t = s.counts;
    console.log(`  ${s.label.padEnd(24)} +${String(t.created).padStart(3)}  ~${String(t.updated).padStart(3)}  -${String(t.skipped).padStart(3)}  !${String(t.failed).padStart(3)}`);
  }

  console.log('  ' + '─'.repeat(56));
  console.log(`  ${'TOTAL'.padEnd(24)} +${String(totals.created).padStart(3)}  ~${String(totals.updated).padStart(3)}  -${String(totals.skipped).padStart(3)}  !${String(totals.failed).padStart(3)}`);
  console.log('');
  console.log(`  Total Records: ${totals.created + totals.updated + totals.skipped}`);
  console.log(`  Total Time:    ${formatDuration(durationMs)}`);
  console.log('');
  console.log('═'.repeat(60));
}

/**
 * Safely execute a seed function inside a Prisma interactive transaction.
 * Returns per-section tracker results and duration.
 *
 * @param {PrismaClient} prisma
 * @param {string} sectionName
 * @param {(tx: PrismaClient, tracker: object) => Promise<void>} fn
 * @returns {Promise<{label:string, counts:object, durationMs:number}>}
 */
export async function runSeedSection(prisma, sectionName, fn) {
  const timer = createTimer();
  const tracker = createTracker();

  logSection(sectionName);

  try {
    await prisma.$transaction(async (tx) => {
      await fn(tx, tracker);
    }, { timeout: 30_000 });
  } catch (err) {
    tracker.failed();
    logResult('failed', sectionName, err.message);
  }

  const durationMs = timer.elapsed();
  logSummary(sectionName, tracker.snapshot(), durationMs);

  return { label: sectionName, counts: tracker.snapshot(), durationMs };
}

/**
 * Build a default record with createdAt and updatedAt timestamps.
 * @param {object} data - Seed data fields
 * @returns {object} Data with timestamps merged
 */
export function withTimestamps(data) {
  const now = new Date();
  return { ...data, createdAt: now, updatedAt: now };
}
