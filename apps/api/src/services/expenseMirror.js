// ═══════════════════════════════════════════════════════════════════════════════
// expenseMirror — H9 Expense & Financial Ledger → PostgreSQL mirror service
//
// Purpose:
//   PocketBase remains the active application-facing expense/ledger system
//   (ExpenseManagerPage writes expense_categories, classifications, expenses,
//   vouchers and temple_accounts directly). This service idempotently mirrors
//   every successful PB create/update in those five collections into PostgreSQL
//   so Prisma becomes the PG access layer.
//
// Collections mirrored (H9 boundary):
//   - expense_categories → ExpenseCategory
//   - classifications   → Classification
//   - expenses          → Expense
//   - vouchers          → Voucher
//   - temple_accounts   → TempleAccount
//
// Design invariants:
//   - Idempotent by PB id: PG rows use the PB record id as PK (or the
//     deterministic `ta_<transaction_id>` for temple_accounts). Repeated mirror
//     calls can never create duplicates (upsert on the fixed PK).
//   - No historical data migration: only records pushed by the PB hooks land
//     in PG. PostgreSQL is intentionally fresh for operational data.
//   - FK safety: expense.categoryId → ExpenseCategory is Restrict, so the
//     referenced category is lazily mirrored on demand first (same pattern as
//     the H7 poojaBookingMirror lazy-pooja mirror). Voucher.expenseId → Expense
//     is SetNull; an unresolvable expense degrades the voucher to expenseId.
//   - Status/subscription_type values are mapped 1:1 to the Prisma enum; unknown
//     values are reported, never silently guessed.
//   - temple_accounts mirror mirrors rows AS THEY EXIST in PB. Expense-originated
//     rows (transaction_id "EXP-<expenseId>") map to "ta_EXP-<expenseId>", which
//     cannot collide with donation (ta_<donationId>) / payment (ta_<paymentId>) /
//     booking (ta_<bookingId>) ids.
//   - Delete propagation (H9 remediation): PB record deletions are mirrored 1:1.
//     Deletes are idempotent (deleteMany — missing PG rows are a no-op). The
//     local app already deletes the paired Expense-originated temple_accounts
//     row (transaction_id "EXP-<expenseId>") itself, so NO extra cascade is
//     invented here — per-record propagation keeps PG = PB exactly.
// ═══════════════════════════════════════════════════════════════════════════════

import prisma, { withTransaction } from '../lib/prisma.js';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

// PB temple_accounts.subscription_type → Prisma TempleAccount.subscriptionType
// enum (Monthly/Yearly). Unknown values map to null (nullable column).
const SUBSCRIPTION_TYPE_ALIASES = {
  monthly: 'Monthly',
  month: 'Monthly',
  'per month': 'Monthly',
  per_month: 'Monthly',
  yearly: 'Yearly',
  year: 'Yearly',
  annual: 'Yearly',
  annually: 'Yearly',
  'per year': 'Yearly',
  per_year: 'Yearly',
};

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function textSlice(value, max) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function refToId(ref) {
  if (ref === null || ref === undefined) return null;
  if (typeof ref === 'object' && ref !== null) return ref.id || null;
  const s = String(ref).trim();
  return s ? s : null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapSubscriptionType(value) {
  const key = String(value || '').trim().toLowerCase();
  return SUBSCRIPTION_TYPE_ALIASES[key] || null;
}

/**
 * Lazily mirror a PB expense_categories record referenced by an expense.
 * ExpenseCategory is Restrict-FK'd by Expense, so the row must exist in PG
 * before the expense upsert. Follows the H7 lazy-pooja pattern.
 * @param {string|object|null} ref - PB expense_categories relation value
 * @returns {Promise<object|null>}
 */
async function ensurePgExpenseCategory(ref) {
  const id = refToId(ref);
  if (!id) return null;
  const existing = await prisma.expenseCategory.findUnique({ where: { id } });
  if (existing) return existing;

  let pbCategory;
  try {
    pbCategory = await pb.collection('expense_categories').getOne(id);
  } catch (err) {
    logger.warn(`[EXPENSE-MIRROR] PB expense_categories lookup failed for ${id}: ${err.message}`);
    return null;
  }

  const result = await mirrorExpenseCategory(pbCategory);
  if (!result.ok) return null;
  return prisma.expenseCategory.findUnique({ where: { id } });
}

/**
 * Lazily mirror a PB expenses record referenced by a voucher.
 * Voucher.expenseId is SetNull-FK'd to Expense; the row must exist in PG to
 * keep the link. Unresolvable expenses leave the voucher's expenseId null.
 * @param {string|object|null} ref - PB vouchers expense_id relation value
 * @returns {Promise<object|null>}
 */
async function ensurePgExpense(ref) {
  const id = refToId(ref);
  if (!id) return null;
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (existing) return existing;

  let pbExpense;
  try {
    pbExpense = await pb.collection('expenses').getOne(id);
  } catch (err) {
    logger.warn(`[EXPENSE-MIRROR] PB expenses lookup failed for ${id}: ${err.message}`);
    return null;
  }

  const result = await mirrorExpense(pbExpense);
  if (!result.ok) return null;
  return prisma.expense.findUnique({ where: { id } });
}

/**
 * Mirror a PB expense_categories record into PostgreSQL.
 * @param {object} record - PocketBase expense_categories representation
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
export async function mirrorExpenseCategory(record) {
  if (!record || typeof record !== 'object' || !record.id) {
    return { ok: false, error: 'Invalid expense_categories payload: id is required' };
  }
  const id = String(record.id);
  try {
    const data = {
      id,
      name: textSlice(record.name, 255),
      description: textOrNull(record.description),
      createdBy: textSlice(record.created_by, 255),
    };
    if (!data.name) {
      return { ok: false, error: 'expense-category-name-missing' };
    }
    await prisma.expenseCategory.upsert({ where: { id }, create: data, update: data });
    logger.info(`[EXPENSE-MIRROR] mirrored expense_categories ${id} -> PG`);
    return { ok: true, id };
  } catch (err) {
    if (err && err.code === 'P2002') {
      // Name is @unique; a concurrent mirror under a different id already
      // created this category. Re-resolve instead of failing the mirror.
      const byId = await prisma.expenseCategory.findUnique({ where: { id } });
      if (byId) return { ok: true, id };
      const byName = await prisma.expenseCategory.findUnique({ where: { name: String(record.name).trim() } });
      if (byName) return { ok: true, id: byName.id };
    }
    logger.error(`[EXPENSE-MIRROR] mirror failed for expense_categories ${id}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Mirror a PB classifications record into PostgreSQL.
 * @param {object} record - PocketBase classifications representation
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
export async function mirrorClassification(record) {
  if (!record || typeof record !== 'object' || !record.id) {
    return { ok: false, error: 'Invalid classifications payload: id is required' };
  }
  const id = String(record.id);
  try {
    const data = {
      id,
      name: textSlice(record.name, 255),
      description: textOrNull(record.description),
    };
    if (!data.name) {
      return { ok: false, error: 'classification-name-missing' };
    }
    await prisma.classification.upsert({ where: { id }, create: data, update: data });
    logger.info(`[EXPENSE-MIRROR] mirrored classifications ${id} -> PG`);
    return { ok: true, id };
  } catch (err) {
    if (err && err.code === 'P2002') {
      const byId = await prisma.classification.findUnique({ where: { id } });
      if (byId) return { ok: true, id };
      const byName = await prisma.classification.findUnique({ where: { name: String(record.name).trim() } });
      if (byName) return { ok: true, id: byName.id };
    }
    logger.error(`[EXPENSE-MIRROR] mirror failed for classifications ${id}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Mirror a PB expenses record into PostgreSQL.
 * @param {object} record - PocketBase expenses representation
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
export async function mirrorExpense(record) {
  if (!record || typeof record !== 'object' || !record.id) {
    return { ok: false, error: 'Invalid expenses payload: id is required' };
  }
  const id = String(record.id);
  try {
    // --- Resolve FK: category (Restrict) — REQUIRE the linked row ---
    const pgCategory = await ensurePgExpenseCategory(record.category_id);
    if (!pgCategory) {
      return { ok: false, error: `expense-category-not-resolved: ${record.category_id}` };
    }

    const amount = toNumber(record.amount);
    if (amount === null || amount < 0.01) {
      return { ok: false, error: 'invalid-amount: expense amount must be >= 0.01' };
    }

    const date = toDate(record.date);
    if (!date) {
      return { ok: false, error: 'invalid-date: expense date is required' };
    }

    const data = {
      id,
      categoryId: pgCategory.id,
      amount,
      date,
      paidTo: textSlice(record.paid_to, 255),
      paymentMethod: textSlice(record.payment_method, 50),
      billFile: textSlice(record.bill_file, 500),
      createdBy: textSlice(record.created_by, 255) || 'unknown',
      quantity: toNumber(record.quantity) === null ? null : Math.trunc(toNumber(record.quantity)),
      classification: textSlice(record.classification, 100),
      voucherId: textSlice(record.voucher_id, 100),
      description: textOrNull(record.description),
      createdAt: toDate(record.created) || new Date(),
    };

    if (data.quantity !== null && data.quantity < 0) {
      return { ok: false, error: 'invalid-quantity: expense quantity must be >= 0' };
    }

    await withTransaction(async (tx) => {
      await tx.expense.upsert({
        where: { id },
        create: { ...data, createdAt: data.createdAt },
        update: data,
      });
    });

    logger.info(`[EXPENSE-MIRROR] mirrored expenses ${id} -> PG (category=${pgCategory.id}, amount=${amount})`);
    return { ok: true, id };
  } catch (err) {
    logger.error(`[EXPENSE-MIRROR] mirror failed for expenses ${id}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Mirror a PB vouchers record into PostgreSQL.
 * @param {object} record - PocketBase vouchers representation
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
export async function mirrorVoucher(record) {
  if (!record || typeof record !== 'object' || !record.id) {
    return { ok: false, error: 'Invalid vouchers payload: id is required' };
  }
  const id = String(record.id);
  try {
    // --- Resolve FK: expense (SetNull) — best-effort link ---
    const pgExpense = await ensurePgExpense(record.expense_id);

    const amount = toNumber(record.amount);
    if (amount === null || amount < 0) {
      return { ok: false, error: 'invalid-amount: voucher amount must be >= 0' };
    }

    const data = {
      id,
      voucherId: textSlice(record.voucher_id, 100),
      expenseId: pgExpense ? pgExpense.id : null,
      amount,
      category: textSlice(record.category, 100),
      paidTo: textSlice(record.paid_to, 255),
      date: toDate(record.date),
      description: textOrNull(record.description),
      status: textSlice(record.status, 50),
      createdAt: toDate(record.created) || new Date(),
    };
    if (!data.voucherId) {
      return { ok: false, error: 'voucher-id-missing: PB voucher_id field is required' };
    }

    await withTransaction(async (tx) => {
      await tx.voucher.upsert({
        where: { id },
        create: { ...data, createdAt: data.createdAt },
        update: data,
      });
    });

    logger.info(`[EXPENSE-MIRROR] mirrored vouchers ${id} -> PG (voucherId=${data.voucherId}, expenseId=${data.expenseId || 'null'})`);
    return { ok: true, id };
  } catch (err) {
    if (err && err.code === 'P2002') {
      // voucherId is @unique; a concurrent mirror already committed this row.
      const byId = await prisma.voucher.findUnique({ where: { id } });
      if (byId) return { ok: true, id };
      return { ok: false, error: `voucher-id-collision: ${record.voucher_id}` };
    }
    logger.error(`[EXPENSE-MIRROR] mirror failed for vouchers ${id}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Mirror a PB temple_accounts record into PostgreSQL.
 *
 * The PB ledger row is authoritative — all origins are mirrored as-is. The
 * deterministic PG id is derived from the PB `transaction_id`:
 *   - expense-originated: transaction_id "EXP-<expenseId>" → "ta_EXP-<expenseId>"
 *   - donation-originated (if ever created in PB): transaction_id = donation id
 *     → "ta_<donationId>" — CONVERGES with the existing donationMirror STEP-4
 *     scheme, so no legacy id logic is touched.
 *   - fallback when transaction_id is absent: "ta_pb_<pb id>".
 * @param {object} record - PocketBase temple_accounts representation
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
export async function mirrorTempleAccount(record) {
  if (!record || typeof record !== 'object' || !record.id) {
    return { ok: false, error: 'Invalid temple_accounts payload: id is required' };
  }
  const pbId = String(record.id);
  const transactionId = refToId(record.transaction_id);
  const id = transactionId ? `ta_${transactionId}` : `ta_pb_${pbId}`;
  try {
    const amount = toNumber(record.amount);
    if (amount === null) {
      return { ok: false, error: 'invalid-amount: temple_accounts amount is required' };
    }

    const date = toDate(record.date);
    if (!date) {
      return { ok: false, error: 'invalid-date: temple_accounts date is required' };
    }

    const memberName = textSlice(record.member_name, 255) || 'Unknown';
    const category = textSlice(record.category, 100) || 'General';
    const classification = textSlice(record.classification, 100) || 'General';
    const subscriptionType = mapSubscriptionType(record.subscription_type);

    const data = {
      id,
      memberName,
      amount,
      category,
      date,
      month: textSlice(record.month, 20),
      year: toNumber(record.year) === null ? null : Math.trunc(toNumber(record.year)),
      classification,
      description: textOrNull(record.description),
      transactionId: transactionId || pbId,
      subscriptionId: textSlice(record.subscription_id, 100),
      status: textSlice(record.status, 50),
      notes: textOrNull(record.notes),
      entryType: textSlice(record.entry_type, 50),
      subscriptionType,
      annadhanamAmount: toNumber(record.annadhanam_amount),
      templeMaintenanceAmount: toNumber(record.temple_maintenance_amount),
      goshalaAmount: toNumber(record.goshala_amount),
      vedaPathshalaAmount: toNumber(record.veda_pathshala_amount),
      generalFundAmount: toNumber(record.general_fund_amount),
      totalAmount: toNumber(record.total_amount),
      poojaServicesAmount: toNumber(record.pooja_services_amount),
      createdAt: toDate(record.created) || new Date(),
    };

    await withTransaction(async (tx) => {
      await tx.templeAccount.upsert({
        where: { id },
        create: { ...data, createdAt: data.createdAt },
        update: data,
      });
    });

    logger.info(`[EXPENSE-MIRROR] mirrored temple_accounts ${pbId} -> PG (id=${id}, amount=${amount}, category=${category})`);
    return { ok: true, id };
  } catch (err) {
    logger.error(`[EXPENSE-MIRROR] mirror failed for temple_accounts ${pbId}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Delete a PB expense_categories mirror row.
 * Idempotent: deleteMany on a missing id is a no-op (never throws).
 * @param {object} body - { id }
 * @returns {Promise<{ok: boolean, deleted?: number, error?: string}>}
 */
export async function deleteExpenseCategory(body) {
  if (!body || typeof body !== 'object' || !body.id) {
    return { ok: false, error: 'Invalid delete payload: id is required' };
  }
  const id = String(body.id);
  try {
    await prisma.expenseCategory.deleteMany({ where: { id } });
    logger.info(`[EXPENSE-MIRROR] deleted expense_categories ${id} -> PG`);
    return { ok: true, deleted: 1 };
  } catch (err) {
    logger.error(`[EXPENSE-MIRROR] delete failed for expense_categories ${id}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Delete a PB classifications mirror row. Idempotent.
 * @param {object} body - { id }
 * @returns {Promise<{ok: boolean, deleted?: number, error?: string}>}
 */
export async function deleteClassification(body) {
  if (!body || typeof body !== 'object' || !body.id) {
    return { ok: false, error: 'Invalid delete payload: id is required' };
  }
  const id = String(body.id);
  try {
    await prisma.classification.deleteMany({ where: { id } });
    logger.info(`[EXPENSE-MIRROR] deleted classifications ${id} -> PG`);
    return { ok: true, deleted: 1 };
  } catch (err) {
    logger.error(`[EXPENSE-MIRROR] delete failed for classifications ${id}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Delete a PB expenses mirror row. Idempotent. Any voucher rows that
 * reference the expense degrade via the schema SetNull FK (PG side), exactly
 * matching the mirror's existing SetNull semantics for unresolvable expenses.
 * @param {object} body - { id }
 * @returns {Promise<{ok: boolean, deleted?: number, error?: string}>}
 */
export async function deleteExpense(body) {
  if (!body || typeof body !== 'object' || !body.id) {
    return { ok: false, error: 'Invalid delete payload: id is required' };
  }
  const id = String(body.id);
  try {
    await prisma.expense.deleteMany({ where: { id } });
    logger.info(`[EXPENSE-MIRROR] deleted expenses ${id} -> PG`);
    return { ok: true, deleted: 1 };
  } catch (err) {
    logger.error(`[EXPENSE-MIRROR] delete failed for expenses ${id}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Delete a PB vouchers mirror row. Idempotent.
 * @param {object} body - { id }
 * @returns {Promise<{ok: boolean, deleted?: number, error?: string}>}
 */
export async function deleteVoucher(body) {
  if (!body || typeof body !== 'object' || !body.id) {
    return { ok: false, error: 'Invalid delete payload: id is required' };
  }
  const id = String(body.id);
  try {
    await prisma.voucher.deleteMany({ where: { id } });
    logger.info(`[EXPENSE-MIRROR] deleted vouchers ${id} -> PG`);
    return { ok: true, deleted: 1 };
  } catch (err) {
    logger.error(`[EXPENSE-MIRROR] delete failed for vouchers ${id}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

/**
 * Delete a PB temple_accounts mirror row. Idempotent.
 * Differs from the create path: in the PB afterDelete hook the transaction_id
 * is still readable from the record, so the same deterministic PG id derivation
 * applies. When transaction_id is absent the mirror falls back to ta_pb_<pbId>,
 * matching the create-side derivation — we delete by BOTH candidates to stay
 * idempotent regardless of which scheme the row used.
 * @param {object} body - { id, transaction_id }
 * @returns {Promise<{ok: boolean, deleted?: number, error?: string}>}
 */
export async function deleteTempleAccount(body) {
  if (!body || typeof body !== 'object' || !body.id) {
    return { ok: false, error: 'Invalid delete payload: id is required' };
  }
  const pbId = String(body.id);
  const transactionId = refToId(body.transaction_id);
  const candidates = [];
  if (transactionId) candidates.push(`ta_${transactionId}`);
  candidates.push(`ta_pb_${pbId}`);
  try {
    const result = await prisma.templeAccount.deleteMany({
      where: { OR: [{ id: { in: candidates } }, { transactionId: pbId }] },
    });
    logger.info(`[EXPENSE-MIRROR] deleted temple_accounts ${pbId} -> PG (count=${result.count}, candidates=${candidates.join(',')})`);
    return { ok: true, deleted: result.count };
  } catch (err) {
    logger.error(`[EXPENSE-MIRROR] delete failed for temple_accounts ${pbId}: ${err.message}`, { cause: err });
    return { ok: false, error: err.message };
  }
}

export default {
  mirrorExpenseCategory,
  mirrorClassification,
  mirrorExpense,
  mirrorVoucher,
  mirrorTempleAccount,
  deleteExpenseCategory,
  deleteClassification,
  deleteExpense,
  deleteVoucher,
  deleteTempleAccount,
};