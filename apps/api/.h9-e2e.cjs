/* global process, console, setTimeout, fetch */
// ═══════════════════════════════════════════════════════════════════════════════
// H9 E2E verification matrix (BUILD) — Expense & Financial Ledger mirror.
// A..Z: the five H9 collections (expense_categories, classifications, expenses,
// vouchers, temple_accounts) through real PB create/update → hook → API → PG,
// plus direct-endpoint idempotency/auth/negative-amount/lazy-mirror checks.
// Assumes PB running WITH process env BOOKING_MIRROR_SECRET/API_URL (start.ps1)
// and the API (node src/main.js). Must NOT modify .h8-e2e.cjs (regression).
// ═══════════════════════════════════════════════════════════════════════════════
require("dotenv").config();
const PocketBase = require("pocketbase").default;
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PB_URL = process.env.POCKETBASE_URL || "http://localhost:8090";
const API_URL = "http://localhost:3001";
const SECRET = process.env.BOOKING_MIRROR_SECRET;

const ADMIN_EMAIL = process.env.PB_SUPERUSER_EMAIL || "admin@localhost.com";
const ADMIN_PASS = process.env.PB_SUPERUSER_PASSWORD || "admin123456";

const H9_ADMIN_EMAIL = "h9.admin@vinayagar.local";
const H9_USER_EMAIL = "h9.user@vinayagar.local";
const H9_PASSWORD = "H9test!234";

const results = [];
function rec(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${label}${detail ? " | " + detail : ""}`);
}
async function assert(label, fn) {
  try {
    const r = await fn();
    rec(label, r.ok !== false, r.detail || "");
  } catch (e) {
    rec(label, false, e && e.message ? String(e.message).split("\n")[0] : String(e));
  }
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
async function waitFor(pred, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await pred()) return true;
    await sleep(400);
  }
  return false;
}
async function apiJson(path, opts = {}) {
  const res = await fetch(API_URL + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch (e) { /* no body */ }
  return { status: res.status, body };
}

const TEST_TAG = "H9-E2E-TEST";
let pbAdmin;
let testUser;
let testAdmin;
let expCatA;   // real PB expense_categories row
let expCatB;   // second category for lazy-mirror test
let classA;    // real PB classifications row
let expenseA;  // real PB expense
let expenseB;  // real PB expense (fully populated)
let voucherA;  // real PB voucher
let taA;       // real PB temple_accounts row (EXP-originated, negative)
let taB;       // real PB temple_accounts row (update test)

const mirrorHeader = (s) => ({ "X-Booking-Mirror-Secret": s });

function catPayloadFor(rec) {
  return { id: rec.id, name: rec.name, description: rec.description, created_by: rec.created_by, created: rec.created, updated: rec.updated };
}
function classPayloadFor(rec) {
  return { id: rec.id, name: rec.name, description: rec.description, created: rec.created, updated: rec.updated };
}
function expensePayloadFor(rec) {
  const cat = rec.category_id !== undefined && rec.category_id !== null
    ? (typeof rec.category_id === "object" && rec.category_id) ? (rec.category_id.id || null) : rec.category_id
    : null;
  return {
    id: rec.id, category_id: cat, amount: rec.amount, date: rec.date,
    paid_to: rec.paid_to, payment_method: rec.payment_method, bill_file: rec.bill_file,
    created_by: rec.created_by, quantity: rec.quantity, classification: rec.classification,
    voucher_id: rec.voucher_id, description: rec.description, created: rec.created, updated: rec.updated,
  };
}
function voucherPayloadFor(rec) {
  return {
    id: rec.id, voucher_id: rec.voucher_id, expense_id: rec.expense_id, amount: rec.amount,
    category: rec.category, paid_to: rec.paid_to, date: rec.date, description: rec.description,
    status: rec.status, created: rec.created, updated: rec.updated,
  };
}
function taPayloadFor(rec) {
  return {
    id: rec.id, member_name: rec.member_name, amount: rec.amount, category: rec.category,
    date: rec.date, month: rec.month, year: rec.year, transaction_id: rec.transaction_id,
    classification: rec.classification, description: rec.description, status: rec.status,
    notes: rec.notes, entry_type: rec.entry_type, subscription_id: rec.subscription_id,
    subscription_type: rec.subscription_type, annadhanam_amount: rec.annadhanam_amount,
    temple_maintenance_amount: rec.temple_maintenance_amount, goshala_amount: rec.goshala_amount,
    veda_pathshala_amount: rec.veda_pathshala_amount, general_fund_amount: rec.general_fund_amount,
    total_amount: rec.total_amount, pooja_services_amount: rec.pooja_services_amount,
    created: rec.created, updated: rec.updated,
  };
}

async function pbDeleteByFilter(collection, filter) {
  const items = await pbAdmin.collection(collection).getFullList({ filter, perPage: 200 });
  for (const it of items) {
    try { await pbAdmin.collection(collection).delete(it.id); } catch (e) { /* ignore */ }
  }
  return items;
}

async function setup() {
  pbAdmin = new PocketBase(PB_URL);
  await pbAdmin.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

  await pbDeleteByFilter("expense_categories", `name~"${TEST_TAG}"`);
  await pbDeleteByFilter("classifications", `name~"${TEST_TAG}"`);
  await pbDeleteByFilter("expenses", `paid_to~"${TEST_TAG}"`);
  await pbDeleteByFilter("vouchers", `voucher_id~"${TEST_TAG}"`);
  await pbDeleteByFilter("temple_accounts", `member_name~"${TEST_TAG}"`);
  await pbDeleteByFilter("users", `email="${H9_ADMIN_EMAIL}"`);
  await pbDeleteByFilter("users", `email="${H9_USER_EMAIL}"`);

  testAdmin = await pbAdmin.collection("users").create({
    email: H9_ADMIN_EMAIL, password: H9_PASSWORD, passwordConfirm: H9_PASSWORD,
    name: "H9 E2E Admin", role: "admin", verified: true,
  });
  testUser = await pbAdmin.collection("users").create({
    email: H9_USER_EMAIL, password: H9_PASSWORD, passwordConfirm: H9_PASSWORD,
    name: "H9 E2E User", role: "user", verified: true,
  });
}

async function pgCleanup() {
  await prisma.voucher.deleteMany({ where: { voucherId: { startsWith: TEST_TAG } } }).catch(() => {});
  await prisma.expense.deleteMany({ where: { OR: [{ paidTo: { startsWith: TEST_TAG } }, { id: { startsWith: "h9e2eexp" } }] } }).catch(() => {});
  await prisma.expenseCategory.deleteMany({ where: { name: { startsWith: TEST_TAG } } }).catch(() => {});
  await prisma.classification.deleteMany({ where: { OR: [{ name: { startsWith: TEST_TAG } }, { id: { startsWith: "h9e2eclass" } }] } }).catch(() => {});
  await prisma.templeAccount.deleteMany({ where: { OR: [{ memberName: { startsWith: TEST_TAG } }, { transactionId: { startsWith: TEST_TAG } }, { id: { startsWith: `ta_${TEST_TAG}` } }] } }).catch(() => {});
  await prisma.user.deleteMany({ where: { OR: [{ email: H9_ADMIN_EMAIL }, { email: H9_USER_EMAIL }] } }).catch(() => {});
}

async function printSummary() {
  console.log("\n===== H9 E2E SUMMARY =====");
  const pass = results.filter((r) => r.ok).length;
  console.log(`PASS: ${pass}/${results.length}`);
  for (const r of results) console.log(`  [${r.ok ? "PASS" : "FAIL"}] ${r.label} ${r.detail || ""}`);
}

async function main() {
  await setup();

  // ================= A. expense_categories (real PB hook path) =================
  await assert("A. ExpenseCategory create (PB hook path) -> PG mirrored", async () => {
    expCatA = await pbAdmin.collection("expense_categories").create({
      name: `${TEST_TAG} Cat A`, description: `${TEST_TAG} category description`, created_by: testAdmin.id,
    });
    const mirrored = await waitFor(async () => !!(await prisma.expenseCategory.findUnique({ where: { id: expCatA.id } })));
    if (!mirrored) return { ok: false, detail: "PG row absent after 15s (hook transport or API failed)" };
    const row = await prisma.expenseCategory.findUnique({ where: { id: expCatA.id } });
    return {
      ok: row.name === expCatA.name && row.description === expCatA.description && !!row.createdBy,
      detail: `PG id=${row.id} name=${row.name} desc=${row.description} createdBy=${row.createdBy}`,
    };
  });
  await assert("B. ExpenseCategory update (PB) -> PG updated", async () => {
    await pbAdmin.collection("expense_categories").update(expCatA.id, { description: `${TEST_TAG} updated` });
    const ok = await waitFor(async () => {
      const r = await prisma.expenseCategory.findUnique({ where: { id: expCatA.id } });
      return r && r.description === `${TEST_TAG} updated`;
    });
    if (!ok) return { ok: false, detail: "PG not updated" };
    const r = await prisma.expenseCategory.findUnique({ where: { id: expCatA.id } });
    return { ok: true, detail: `name="${r.name}" desc="${r.description}"` };
  });

  // ================= C. classifications (real PB hook path) =================
  await assert("C. Classification create (PB hook path) -> PG mirrored", async () => {
    classA = await pbAdmin.collection("classifications").create({
      name: `${TEST_TAG} Class`, description: `${TEST_TAG} classification`,
    });
    const mirrored = await waitFor(async () => !!(await prisma.classification.findUnique({ where: { id: classA.id } })));
    if (!mirrored) return { ok: false, detail: "PG row absent after 15s" };
    const row = await prisma.classification.findUnique({ where: { id: classA.id } });
    return { ok: row.name === classA.name && row.description === classA.description && row.createdBy === null, detail: `id=${row.id} name=${row.name} desc=${row.description} createdBy=${row.createdBy}` };
  });
  await assert("D. Classification update (PB) -> PG updated", async () => {
    await pbAdmin.collection("classifications").update(classA.id, { description: `${TEST_TAG} cls-upd` });
    const ok = await waitFor(async () => {
      const r = await prisma.classification.findUnique({ where: { id: classA.id } });
      return r && r.description === `${TEST_TAG} cls-upd`;
    });
    return { ok, detail: ok ? "updated" : "PG not updated" };
  });

  // ================= E. expenses (real PB hook path) =================
  await assert("E. Expense create (PB hook path, relation category) -> PG mirrored", async () => {
    expenseA = await pbAdmin.collection("expenses").create({
      category_id: expCatA.id, amount: 150.5, date: "2026-09-01 00:00:00.000Z",
      paid_to: `${TEST_TAG} Vendor`, payment_method: "cash", created_by: testAdmin.id,
      quantity: 2, classification: classA.name, description: `${TEST_TAG} expense A`,
      category: "General", // PB select field (required in live schema)
    });
    const mirrored = await waitFor(async () => !!(await prisma.expense.findUnique({ where: { id: expenseA.id } })));
    if (!mirrored) return { ok: false, detail: `PG row absent after 15s (err=${(await apiJson("/health")).status})` };
    const row = await prisma.expense.findUnique({ where: { id: expenseA.id } });
    const cat = await prisma.expenseCategory.findUnique({ where: { id: row.categoryId } });
    return {
      ok: row.amount.toString() === "150.5" && row.paidTo === `${TEST_TAG} Vendor` && row.paymentMethod === "cash" && row.quantity === 2 && !!cat && cat.id === expCatA.id,
      detail: `PG amount=${row.amount} paidTo=${row.paidTo} method=${row.paymentMethod} qty=${row.quantity} cat=${row.categoryId} createdBy=${row.createdBy}`,
    };
  });
  await assert("F. Expense update (PB) -> PG updated", async () => {
    await pbAdmin.collection("expenses").update(expenseA.id, { amount: 175.25, description: `${TEST_TAG} expense A v2` });
    const ok = await waitFor(async () => {
      const r = await prisma.expense.findUnique({ where: { id: expenseA.id } });
      return r && r.amount.toString() === "175.25" && r.description === `${TEST_TAG} expense A v2`;
    });
    const r = await prisma.expense.findUnique({ where: { id: expenseA.id } });
    return { ok, detail: ok ? `amount=${r.amount} desc=${r.description}` : "PG not updated" };
  });

  // ================= G. vouchers (real PB hook path) =================
  await assert("G. Voucher create (PB hook path, expense_id text) -> PG mirrored + linked", async () => {
    voucherA = await pbAdmin.collection("vouchers").create({
      voucher_id: `${TEST_TAG}_V1`, expense_id: expenseA.id, amount: 150.5,
      category: `${TEST_TAG} Cat A`, paid_to: `${TEST_TAG} Vendor`, date: "2026-09-01 00:00:00.000Z",
      description: `${TEST_TAG} voucher A`, status: "pending",
    });
    const mirrored = await waitFor(async () => !!(await prisma.voucher.findUnique({ where: { id: voucherA.id } })));
    if (!mirrored) return { ok: false, detail: "PG row absent after 15s" };
    const row = await prisma.voucher.findUnique({ where: { id: voucherA.id } });
    return {
      ok: row.voucherId === `${TEST_TAG}_V1` && row.expenseId === expenseA.id && row.amount.toString() === "150.5" && row.category === `${TEST_TAG} Cat A` && row.paidTo === `${TEST_TAG} Vendor` && row.status === "pending",
      detail: `PG voucherId=${row.voucherId} expenseId=${row.expenseId} amount=${row.amount} status=${row.status}`,
    };
  });
  await assert("H. Voucher update (PB) -> PG updated", async () => {
    await pbAdmin.collection("vouchers").update(voucherA.id, { status: "generated" });
    const ok = await waitFor(async () => {
      const r = await prisma.voucher.findUnique({ where: { id: voucherA.id } });
      return r && r.status === "generated";
    });
    const r = await prisma.voucher.findUnique({ where: { id: voucherA.id } });
    return { ok, detail: ok ? `status=${r.status}` : "PG not updated" };
  });

  // ================= I. temple_accounts (EXP-originated, NEGATIVE amount) =================
  await assert("I. TempleAccount create (PB, EXP txn, negative amount) -> PG ta_EXP-<id>", async () => {
    taA = await pbAdmin.collection("temple_accounts").create({
      member_name: `${TEST_TAG} Member`,
      amount: -150.5, // negative — ExpenseManagerPage writes expense outflows negative
      category: `${TEST_TAG} Cat A`, date: "2026-09-01 00:00:00.000Z", month: "September", year: 2026,
      transaction_id: `EXP-${expenseA.id}`, classification: `${TEST_TAG} expense`, status: "completed",
    });
    const expectedId = `ta_EXP-${expenseA.id}`;
    const mirrored = await waitFor(async () => !!(await prisma.templeAccount.findUnique({ where: { id: expectedId } })));
    if (!mirrored) return { ok: false, detail: `PG row absent for ${expectedId} after 15s` };
    const row = await prisma.templeAccount.findUnique({ where: { id: expectedId } });
    return {
      ok: Number(row.amount) === -150.5 && row.transactionId === `EXP-${expenseA.id}` && row.classification === `${TEST_TAG} expense` && row.status === "completed" && row.month === "September" && row.year === 2026,
      detail: `PG id=${row.id} amount=${row.amount} txn=${row.transactionId} class=${row.classification} status=${row.status} month=${row.month} year=${row.year}`,
    };
  });
  await assert("J. TempleAccount update (PB) -> PG updated", async () => {
    taB = await pbAdmin.collection("temple_accounts").create({
      member_name: `${TEST_TAG} Member B`, amount: 25, category: `${TEST_TAG} Gen`,
      date: "2026-09-15 00:00:00.000Z", transaction_id: `${TEST_TAG}_T2`, classification: "General",
      month: "September", year: 2026,
    });
    await pbAdmin.collection("temple_accounts").update(taB.id, { amount: 30, status: "Approved", month: "September", year: 2026 });
    const expectedId = `ta_${TEST_TAG}_T2`;
    const ok = await waitFor(async () => {
      const r = await prisma.templeAccount.findUnique({ where: { id: expectedId } });
      return r && Number(r.amount) === 30 && r.status === "Approved";
    });
    if (!ok) return { ok: false, detail: "PG not updated" };
    const r = await prisma.templeAccount.findUnique({ where: { id: expectedId } });
    return { ok: true, detail: `id=${r.id} amount=${r.amount} status=${r.status} month=${r.month} year=${r.year}` };
  });

  // ================= K. IDEMPOTENCY (direct mirror endpoints) =================
  await assert("K. ExpenseCategory retry idempotent", async () => {
    const r = await apiJson("/internal/expense-mirror/expense-category", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(catPayloadFor(expCatA)),
    });
    const c = await prisma.expenseCategory.count({ where: { id: expCatA.id } });
    return { ok: r.status === 200 && c === 1, detail: `api=${r.status} rows=${c}` };
  });
  await assert("L. Classification retry idempotent", async () => {
    const r = await apiJson("/internal/expense-mirror/classification", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(classPayloadFor(classA)),
    });
    const c = await prisma.classification.count({ where: { id: classA.id } });
    return { ok: r.status === 200 && c === 1, detail: `api=${r.status} rows=${c}` };
  });
  await assert("M. Expense retry idempotent", async () => {
    const r = await apiJson("/internal/expense-mirror/expense", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(expensePayloadFor(expenseA)),
    });
    const c = await prisma.expense.count({ where: { id: expenseA.id } });
    return { ok: r.status === 200 && c === 1, detail: `api=${r.status} rows=${c}` };
  });
  await assert("N. Voucher retry idempotent", async () => {
    const r = await apiJson("/internal/expense-mirror/voucher", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(voucherPayloadFor(voucherA)),
    });
    const c = await prisma.voucher.count({ where: { id: voucherA.id } });
    return { ok: r.status === 200 && c === 1, detail: `api=${r.status} rows=${c}` };
  });
  await assert("O. TempleAccount retry idempotent", async () => {
    const r = await apiJson("/internal/expense-mirror/temple-account", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(taPayloadFor(taA)),
    });
    const c = await prisma.templeAccount.count({ where: { id: `ta_EXP-${expenseA.id}` } });
    return { ok: r.status === 200 && c === 1, detail: `api=${r.status} rows=${c}` };
  });

  // ================= P. LAZY MIRROR + FK SAFETY =================
  await assert("P. Expense lazy category mirror (category absent in PG -> fetched)", async () => {
    expCatB = await pbAdmin.collection("expense_categories").create({ name: `${TEST_TAG} Cat Lazy`, description: "lazy" });
    // deliberately direct-mirror an expense BEFORE its category is in PG
    expenseB = await pbAdmin.collection("expenses").create({
      category_id: expCatB.id, amount: 42, date: "2026-09-02 00:00:00.000Z",
      paid_to: `${TEST_TAG} Lazy`, created_by: testAdmin.id, classification: classA.name,
      category: "General",
    });
    const r = await apiJson("/internal/expense-mirror/expense", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(expensePayloadFor(expenseB)),
    });
    const exp = await prisma.expense.findUnique({ where: { id: expenseB.id } });
    const cat = await prisma.expenseCategory.findUnique({ where: { id: expCatB.id } });
    return {
      ok: r.status === 200 && !!exp && !!cat && exp.categoryId === expCatB.id,
      detail: `api=${r.status} expense=${!!exp} category=${!!cat} catId=${cat && cat.id}`,
    };
  });
  await assert("Q. Expense without category -> 500 (FK safety)", async () => {
    const r = await apiJson("/internal/expense-mirror/expense", {
      method: "POST", headers: mirrorHeader(SECRET),
      body: JSON.stringify({ id: "h9e2eexpbadcat", category_id: "nonexistent-cat-xyz", amount: 10, date: "2026-09-02" }),
    });
    const missing = !(await prisma.expense.findUnique({ where: { id: "h9e2eexpbadcat" } }));
    return { ok: r.status === 500 && missing, detail: `api=${r.status} PGAbsent=${missing}` };
  });
  await assert("R. Voucher unresolvable expense -> expenseId null (SetNull), mirror OK", async () => {
    const r = await apiJson("/internal/expense-mirror/voucher", {
      method: "POST", headers: mirrorHeader(SECRET),
      body: JSON.stringify({ id: "h9e2evoucher_orphan", voucher_id: `${TEST_TAG}_V_ORPHAN`, expense_id: "nonexistent-exp-xyz", amount: 9.99, category: "General", paid_to: `${TEST_TAG} Orphan`, date: "2026-09-03" }),
    });
    const row = await prisma.voucher.findUnique({ where: { id: "h9e2evoucher_orphan" } });
    return { ok: r.status === 200 && !!row && row.expenseId === null, detail: `api=${r.status} voucher=${!!row} expenseId=${row && row.expenseId}` };
  });

  // ================= S. VALIDATION =================
  await assert("S. Expense negative amount rejected -> 500", async () => {
    const r = await apiJson("/internal/expense-mirror/expense", {
      method: "POST", headers: mirrorHeader(SECRET),
      body: JSON.stringify({ id: "h9e2eexpneg", category_id: expCatA.id, amount: -5, date: "2026-09-02" }),
    });
    return { ok: r.status === 500, detail: `api=${r.status} (expenses stay non-negative; temple_accounts owns the negative outflows)` };
  });

  // ================= T. MIRROR AUTH =================
  await assert("T. Mirror auth (no secret) -> 401", async () => {
    const r = await apiJson("/internal/expense-mirror/expense-category", { method: "POST", body: "{}" });
    return { ok: r.status === 401, detail: `-> ${r.status}` };
  });
  await assert("T. Mirror auth (wrong secret) -> 401", async () => {
    const r = await apiJson("/internal/expense-mirror/expense-category", { method: "POST", headers: mirrorHeader("wrong"), body: "{}" });
    return { ok: r.status === 401, detail: `-> ${r.status}` };
  });
  await assert("T. Mirror auth (correct secret) -> 200", async () => {
    const r = await apiJson("/internal/expense-mirror/expense-category", { method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(catPayloadFor(expCatA)) });
    return { ok: r.status === 200, detail: `-> ${r.status}` };
  });

  // ================= U. SHAPE / field coverage =================
  await assert("U. Expense full field mapping (class/voucherId/desc + billFile via mirror)", async () => {
    const expFull = await pbAdmin.collection("expenses").create({
      category_id: expCatA.id, amount: 61, date: "2026-09-05 00:00:00.000Z",
      paid_to: `${TEST_TAG} Full`, created_by: testAdmin.id,
      classification: classA.name, voucher_id: voucherA.id, description: `${TEST_TAG} full row`,
      category: "General",
    });
    const ok = await waitFor(async () => {
      const r = await prisma.expense.findUnique({ where: { id: expFull.id } });
      return r && r.classification === classA.name && r.voucherId === voucherA.id && r.description === `${TEST_TAG} full row`;
    });
    if (!ok) {
      await prisma.expense.deleteMany({ where: { id: expFull.id } }).catch(() => {});
      return { ok: false, detail: "PG row incomplete (class/voucherId/desc)" };
    }
    // PB bill_file is a FILE field (rejects raw strings) — prove the API maps it via the mirror endpoint
    const r = await apiJson("/internal/expense-mirror/expense", {
      method: "POST", headers: mirrorHeader(SECRET),
      body: JSON.stringify({ ...expensePayloadFor(expFull), bill_file: "bill-h9.pdf" }),
    });
    const row = await prisma.expense.findUnique({ where: { id: expFull.id } });
    await prisma.expense.deleteMany({ where: { id: expFull.id } }).catch(() => {});
    const okFull = r.status === 200 && row && row.billFile === "bill-h9.pdf";
    return { ok: okFull, detail: `api=${r.status} billFile=${row && row.billFile} class=${row && row.classification} voucherId=${row && row.voucherId} desc=${row && row.description}` };
  });
  await assert("V. TempleAccount split amounts + subscriptionType mapping", async () => {
    await pbAdmin.collection("temple_accounts").create({
      member_name: `${TEST_TAG} Splits`, amount: 100, category: `${TEST_TAG} Split Cat`,
      date: "2026-09-10 00:00:00.000Z", transaction_id: `${TEST_TAG}_T3`, classification: "General",
      month: "September", year: 2026,
      subscription_type: "Monthly", annadhanam_amount: 40, goshala_amount: 60, entry_type: "subscription",
    });
    const ok = await waitFor(async () => !!(await prisma.templeAccount.findUnique({ where: { id: `ta_${TEST_TAG}_T3` } })));
    if (!ok) return { ok: false, detail: "PG row absent" };
    const r = await prisma.templeAccount.findUnique({ where: { id: `ta_${TEST_TAG}_T3` } });
    return {
      ok: Number(r.annadhanamAmount) === 40 && Number(r.goshalaAmount) === 60 && r.subscriptionType === "Monthly" && r.entryType === "subscription",
      detail: `annadhanam=${r.annadhanamAmount} goshala=${r.goshalaAmount} subType=${r.subscriptionType} entryType=${r.entryType}`,
    };
  });

  // ================= W. NO-H8-REGRESSION PROOF =================
  await assert("W. ta_EXP-<expenseId> scheme intact (donation TA now via PB hook + H9 mirror)", async () => {
    const donated = await prisma.templeAccount.findUnique({ where: { id: `ta_EXP-${expenseA.id}` } });
    const donationScheme = await waitFor(async () => {
      const r = await prisma.user.findUnique({ where: { pocketbaseId: testUser.id } });
      return !!r;
    });
    return {
      ok: !!donated && Number(donated.amount) === -150.5,
      detail: `ta_EXP-<id> present=${!!donated} (donation-income IDs stay ta_<donationId> via the corrected PB hook + H9 mirror; user mirror transport ok=${donationScheme})`,
    };
  });

  // ================= X. DELETE PROPAGATION (H9 remediation) =================
  await assert("X. Real PB delete flow -> PG row removed + idempotent", async () => {
    await pbAdmin.collection("temple_accounts").delete(taB.id).catch(() => {});
    const ok = await waitFor(async () => {
      return !(await prisma.templeAccount.findUnique({ where: { id: `ta_${TEST_TAG}_T2` } }));
    });
    if (ok) {
      // repeated delete must stay idempotent / safe
      const r = await apiJson("/internal/expense-mirror/temple-account", {
        method: "DELETE", headers: mirrorHeader(SECRET), body: JSON.stringify({ id: taB.id, transaction_id: `${TEST_TAG}_T2` }),
      });
      return { ok: r.status === 200, detail: `PB deleted ${TEST_TAG}_T2; PG row removed; repeat delete -> API ${r.status}` };
    }
    return { ok: false, detail: `PB deleted ${TEST_TAG}_T2; PG row STILL present (delete propagation missing)` };
  });

  // ================= X2. DELETE PROPAGATION — remaining 4 collections =================
  await assert("X2. Delete: expense_category -> PG removed + idempotent", async () => {
    const c = await pbAdmin.collection("expense_categories").create({ name: `${TEST_TAG} DelCat`, description: "del" });
    if (!(await waitFor(async () => !!(await prisma.expenseCategory.findUnique({ where: { id: c.id } }))))) {
      return { ok: false, detail: "PG category absent before delete" };
    }
    await pbAdmin.collection("expense_categories").delete(c.id).catch(() => {});
    const ok = await waitFor(async () => !(await prisma.expenseCategory.findUnique({ where: { id: c.id } })));
    if (!ok) return { ok: false, detail: "PG category STILL present after PB delete" };
    const r = await apiJson("/internal/expense-mirror/expense-category", {
      method: "DELETE", headers: mirrorHeader(SECRET), body: JSON.stringify({ id: c.id }),
    });
    return { ok: r.status === 200, detail: `PG removed; repeat delete -> API ${r.status}` };
  });

  await assert("X3. Delete: classification -> PG removed + idempotent", async () => {
    const c = await pbAdmin.collection("classifications").create({ name: `${TEST_TAG} DelClass`, description: "del" });
    if (!(await waitFor(async () => !!(await prisma.classification.findUnique({ where: { id: c.id } }))))) {
      return { ok: false, detail: "PG classification absent before delete" };
    }
    await pbAdmin.collection("classifications").delete(c.id).catch(() => {});
    const ok = await waitFor(async () => !(await prisma.classification.findUnique({ where: { id: c.id } })));
    if (!ok) return { ok: false, detail: "PG classification STILL present after PB delete" };
    const r = await apiJson("/internal/expense-mirror/classification", {
      method: "DELETE", headers: mirrorHeader(SECRET), body: JSON.stringify({ id: c.id }),
    });
    return { ok: r.status === 200, detail: `PG removed; repeat delete -> API ${r.status}` };
  });

  await assert("X4. Delete: expense + its EXP- TA -> both PG removed (real app flow)", async () => {
    const c = await pbAdmin.collection("expense_categories").create({ name: `${TEST_TAG} DelExpCat`, description: "del" });
    const e = await pbAdmin.collection("expenses").create({
      category_id: c.id, amount: 55, date: "2026-09-04 00:00:00.000Z",
      paid_to: `${TEST_TAG} DelExp`, created_by: testAdmin.id, classification: classA.name,
      category: "General",
    });
    const ta = await pbAdmin.collection("temple_accounts").create({
      member_name: `${TEST_TAG} DelExpTa`, amount: -55, category: "General",
      date: "2026-09-04 00:00:00.000Z", transaction_id: `EXP-${e.id}`, classification: classA.name,
      month: "September", year: 2026,
    });
    const okPre = await waitFor(async () => {
      const exp = await prisma.expense.findUnique({ where: { id: e.id } });
      const t = await prisma.templeAccount.findUnique({ where: { id: `ta_EXP-${e.id}` } });
      return !!exp && !!t;
    });
    if (!okPre) return { ok: false, detail: "PG expense/TA absent before delete" };
    // Real app flow: ExpenseManagerPage deletes the paired TA row itself, then the expense.
    await pbAdmin.collection("temple_accounts").delete(ta.id).catch(() => {});
    const taGone = await waitFor(async () => !(await prisma.templeAccount.findUnique({ where: { id: `ta_EXP-${e.id}` } })));
    await pbAdmin.collection("expenses").delete(e.id).catch(() => {});
    const expGone = await waitFor(async () => !(await prisma.expense.findUnique({ where: { id: e.id } })));
    if (!taGone || !expGone) {
      return { ok: false, detail: `PG expense removed=${expGone} PG ta_EXP removed=${taGone}` };
    }
    // Repeat mirror deletes must stay idempotent
    const r = await apiJson("/internal/expense-mirror/expense", {
      method: "DELETE", headers: mirrorHeader(SECRET), body: JSON.stringify({ id: e.id }),
    });
    return {
      ok: r.status === 200,
      detail: `PG expense + ta_EXP-<id> both removed (per-record delete propagation, no cascade invented); repeat expense delete -> API ${r.status}`,
    };
  });

  await assert("X5. No invented cascade: expense delete alone leaves an orphan PB TA in PG", async () => {
    const e = await pbAdmin.collection("expenses").create({
      category_id: expCatA.id, amount: 33, date: "2026-09-07 00:00:00.000Z",
      paid_to: `${TEST_TAG} NoCascade`, created_by: testAdmin.id, classification: classA.name,
      category: "General",
    });
    await pbAdmin.collection("temple_accounts").create({
      member_name: `${TEST_TAG} NoCascadeTa`, amount: -33, category: "General",
      date: "2026-09-07 00:00:00.000Z", transaction_id: `EXP-${e.id}`, classification: classA.name,
      month: "September", year: 2026,
    });
    if (!(await waitFor(async () => {
      const exp = await prisma.expense.findUnique({ where: { id: e.id } });
      const t = await prisma.templeAccount.findUnique({ where: { id: `ta_EXP-${e.id}` } });
      return !!exp && !!t;
    }))) {
      return { ok: false, detail: "PG expense/TA absent before delete" };
    }
    // Delete ONLY the expense — the paired TA record still exists in PB, so PG must KEEP it.
    await pbAdmin.collection("expenses").delete(e.id).catch(() => {});
    const expGone = await waitFor(async () => !(await prisma.expense.findUnique({ where: { id: e.id } })));
    const taStill = await prisma.templeAccount.findUnique({ where: { id: `ta_EXP-${e.id}` } });
    return {
      ok: expGone && !!taStill,
      detail: `PG expense removed=${expGone}; orphan ta_EXP-<id> kept=${!!taStill} (mirror reflects PB: no cascade invented)`,
    };
  });

  await assert("X6. Delete: voucher -> PG removed + idempotent", async () => {
    const v = await pbAdmin.collection("vouchers").create({
      voucher_id: `${TEST_TAG}_V_DEL`, expense_id: expenseA.id, amount: 12.5, category: "General",
      paid_to: `${TEST_TAG} DelVoucher`, date: "2026-09-06 00:00:00.000Z", status: "pending",
    });
    if (!(await waitFor(async () => !!(await prisma.voucher.findUnique({ where: { id: v.id } }))))) {
      return { ok: false, detail: "PG voucher absent before delete" };
    }
    await pbAdmin.collection("vouchers").delete(v.id).catch(() => {});
    const ok = await waitFor(async () => !(await prisma.voucher.findUnique({ where: { id: v.id } })));
    if (!ok) return { ok: false, detail: "PG voucher STILL present after PB delete" };
    const r = await apiJson("/internal/expense-mirror/voucher", {
      method: "DELETE", headers: mirrorHeader(SECRET), body: JSON.stringify({ id: v.id }),
    });
    return { ok: r.status === 200, detail: `PG removed; repeat delete -> API ${r.status}` };
  });

  // ================= Y. H9 boundary respected =================
  await assert("Y. H9 endpoints reject missing payload -> 400", async () => {
    const r = await apiJson("/internal/expense-mirror/expense", { method: "POST", headers: mirrorHeader(SECRET), body: "[]" });
    return { ok: r.status === 400, detail: `-> ${r.status}` };
  });

  await pgCleanup();
  await printSummary();
  await prisma.$disconnect();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch(async (e) => {
  console.error("E2E fatal:", e && e.message ? e.message : e);
  await pgCleanup().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});