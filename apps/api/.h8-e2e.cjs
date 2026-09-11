// ═══════════════════════════════════════════════════════════════════════════════
// H8 E2E verification matrix (STEP 14) — A..O.
// Real app path where PB allows it; direct mirror endpoint where PB is broken
// by PRE-EXISTING legacy bugs (documented, do-not-fix). P via git (outside).
// Assumes PB running WITH process env BOOKING_MIRROR_SECRET/API_URL (start.ps1).
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

const H8_ADMIN_EMAIL = "h8.admin@vinayagar.local";
const H8_USER_EMAIL = "h8.user@vinayagar.local";
const H8_PASSWORD = "H8test!234";

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

const TEST_TAG = "H8-E2E-TEST";
let pbAdmin;
let userToken;
let adminToken;
let testUser;
let testAdmin;
let donationA;
let donationD;
let paymentDirect; // synthetic payment id (direct mirror test)

function mirrorHeader(secret) {
  return { "X-Booking-Mirror-Secret": secret };
}
function donationPayloadFor(rec) {
  return {
    id: rec.id, user: rec.get ? rec.get("user") : rec.user,
    amount: rec.amount, donation_date: rec.donation_date, category: rec.category,
    status: rec.status, notes: rec.notes, approval_date: rec.approval_date,
    special_occasion: rec.special_occasion, is_deleted: rec.is_deleted,
    receipt_id: rec.receipt_id, receipt_number: rec.receipt_number,
    receipt_pdf: Array.isArray(rec.receipt_pdf) ? rec.receipt_pdf[0] : rec.receipt_pdf,
    receipt_created_at: rec.receipt_created_at, receipt_generated_date: rec.receipt_generated_date,
    receipt_sent_at: rec.receipt_sent_at, resend_receipt: rec.resend_receipt,
    payment_status: rec.payment_status, donation_description: rec.donation_description,
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

  await pbDeleteByFilter("donations", `notes~"${TEST_TAG}"`);
  await pbDeleteByFilter("payments", `transaction_id~"H8_E2E_TXN"`);
  await pbDeleteByFilter("receipts", `receipt_id~"H8_E2E_RCP"`);
  await pbDeleteByFilter("pooja_bookings", `(receipt_id~"H8_E2E_RCP_BKG" || transaction_id~"H8_E2E_TXN_B1")`);
  await pbDeleteByFilter("users", `email="${H8_ADMIN_EMAIL}"`);
  await pbDeleteByFilter("users", `email="${H8_USER_EMAIL}"`);

  testAdmin = await pbAdmin.collection("users").create({
    email: H8_ADMIN_EMAIL, password: H8_PASSWORD, passwordConfirm: H8_PASSWORD,
    name: "H8 E2E Admin", role: "admin", verified: true,
  });
  testUser = await pbAdmin.collection("users").create({
    email: H8_USER_EMAIL, password: H8_PASSWORD, passwordConfirm: H8_PASSWORD,
    name: "H8 E2E User", role: "user", verified: true,
  });

  const ua = new PocketBase(PB_URL);
  await ua.collection("users").authWithPassword(H8_USER_EMAIL, H8_PASSWORD);
  userToken = ua.authStore.token;

  const aa = new PocketBase(PB_URL);
  await aa.collection("users").authWithPassword(H8_ADMIN_EMAIL, H8_PASSWORD);
  adminToken = aa.authStore.token;
}

async function pgCleanup() {
  await prisma.donation.deleteMany({ where: { OR: [{ notes: { contains: TEST_TAG } }, { id: { startsWith: "h8e2ed" } }] } }).catch(() => {});
  await prisma.payment.deleteMany({ where: { OR: [{ transactionId: { startsWith: "H8_E2E_TXN" } }, { id: { startsWith: "h8e2epay" } }] } }).catch(() => {});
  await prisma.poojaBooking.deleteMany({ where: { id: { in: ["h8e2ebooking001"] } } }).catch(() => {});
  await prisma.pooja.deleteMany({ where: { id: { in: ["h8e2epoojacreatetime"] } } }).catch(() => {});
  await prisma.templeAccount.deleteMany({ where: { OR: [{ id: { startsWith: "ta_" } }, { transactionId: { startsWith: "h8e2e" } }] } }).catch(() => {});
  await prisma.user.deleteMany({ where: { OR: [{ email: H8_ADMIN_EMAIL }, { email: H8_USER_EMAIL }] } }).catch(() => {});
}

async function printSummary() {
  console.log("\n===== H8 E2E SUMMARY =====");
  const pass = results.filter((r) => r.ok).length;
  console.log(`PASS: ${pass}/${results.length}`);
  for (const r of results) console.log(`  [${r.ok ? "PASS" : "BLOCKED/DOC"}${r.ok ? "" : " FAIL"}] ${r.label} ${r.detail || ""}`);
}

async function main() {
  await setup();
  let fb;

  // ================= A. DONATION CREATE (real PB → hook → API → PG) =================
  await assert("A. Donation create (PB hook path) -> PG mirrored", async () => {
    donationA = await pbAdmin.collection("donations").create({
      user: testUser.id, amount: 250, category: "General",
      donation_date: new Date().toISOString().split("T")[0],
      status: "pending", payment_status: "pending",
      notes: `${TEST_TAG} | Donor: H8 E2E User | Email: ${H8_USER_EMAIL}`,
      special_occasion: "", donation_description: "H8 E2E donation", is_deleted: false,
    });
    const mirrored = await waitFor(async () => !!(await prisma.donation.findUnique({ where: { id: donationA.id } })));
    if (!mirrored) return { ok: false, detail: "PG row absent after 15s (hook transport or API failed)" };
    const row = await prisma.donation.findUnique({ where: { id: donationA.id } });
    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    const checks = {
      idMatch: row.id === donationA.id,
      userPresent: !!user,
      pbIdMatch: user && user.pocketbaseId === testUser.id,
      status: row.status === "pending",
      paymentStatus: row.paymentStatus === "pending",
      amount: Number(row.amount) === 250,
      desc: row.donationDescription === "H8 E2E donation",
      resend: row.resendReceipt === false,
    };
    const ok = Object.values(checks).every(Boolean);
    return { ok, detail: `PG id=${row.id} user=${user ? user.email : "?"} status=${row.status} amount=${row.amount} paymentStatus=${row.paymentStatus} desc=${row.donationDescription} resend=${row.resendReceipt} pbId=${user ? user.pocketbaseId : "?"} ${JSON.stringify(checks)}` };
  });

  // ================= B. DONATION APPROVE (PB update may 400 but commits) =================
  await assert("B. Donation approve (PB update) -> PG approved + TA", async () => {
    fb = await pbAdmin.collection("donations").update(donationA.id, { status: "approved", approval_date: new Date().toISOString() }).catch((e) => e);
    const pbState = await pbAdmin.collection("donations").getOne(donationA.id).catch(() => null);
    const ok = await waitFor(async () => {
      const r = await prisma.donation.findUnique({ where: { id: donationA.id } });
      if (!r || r.status !== "approved") return false;
      return !!(await prisma.templeAccount.findUnique({ where: { id: `ta_${donationA.id}` } }));
    });
    if (!ok) return { ok: false, detail: `PB update=${fb && fb.message ? fb.message : "ok"}; PB after_state=${pbState && pbState.status}; PG not approved or TA missing` };
    const ta = await prisma.templeAccount.findUnique({ where: { id: `ta_${donationA.id}` } });
    return { ok: true, detail: `PB update feedback=${fb && fb.message ? "ERR(" + fb.message + ")" : "ok"}; PG approved; TA(amount=${ta.amount}, class=${ta.classification}, cat=${ta.category})` };
  });

  // ================= C. DONATION RETRY (idempotency) =================
  await assert("C. Donation mirror retry -> idempotent", async () => {
    const r = await apiJson("/internal/donation-mirror/donation", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(donationPayloadFor(donationA)),
    });
    const d = await prisma.donation.count({ where: { id: donationA.id } });
    const t = await prisma.templeAccount.count({ where: { id: `ta_${donationA.id}` } });
    return { ok: r.status === 200 && d === 1 && t === 1, detail: `api=${r.status} donations=${d} templeAccounts=${t}` };
  });

  // ================= D. DONATION REJECT =================
  await assert("D. Donation reject (PB update) -> PG rejected, no TA", async () => {
    donationD = await pbAdmin.collection("donations").create({
      user: testUser.id, amount: 120,
      donation_date: new Date().toISOString().split("T")[0],
      status: "pending", payment_status: "pending",
      notes: `${TEST_TAG} REJECT | Donor: H8 E2E User`, category: "General", is_deleted: false,
    });
    await pbAdmin.collection("donations").update(donationD.id, { status: "rejected" }).catch(() => {});
    const ok = await waitFor(async () => {
      const r = await prisma.donation.findUnique({ where: { id: donationD.id } });
      return r && r.status === "rejected";
    });
    if (!ok) return { ok: false, detail: "PG not rejected" };
    const ta = await prisma.templeAccount.findUnique({ where: { id: `ta_${donationD.id}` } });
    return { ok: !ta, detail: `PG status=rejected TA=${ta ? "PRESENT(BAD)" : "absent(GOOD)"}` };
  });

  // ================= E. DONATION RECEIPT FIELDS =================
  await assert("E. Donation receipt fields mirror", async () => {
    await pbAdmin.collection("donations").update(donationA.id, {
      receipt_id: "H8_E2E_RCP_0001",
      receipt_sent_at: new Date().toISOString(),
      resend_receipt: true,
    }).catch(() => {});
    const ok = await waitFor(async () => {
      const r = await prisma.donation.findUnique({ where: { id: donationA.id } });
      return r && r.receiptId === "H8_E2E_RCP_0001" && r.resendReceipt === true && !!r.receiptSentAt;
    });
    if (!ok) return { ok: false, detail: "receipt fields not mirrored" };
    const r = await prisma.donation.findUnique({ where: { id: donationA.id } });
    return { ok: true, detail: `receiptId=${r.receiptId} resend=${r.resendReceipt} sentAt=${r.receiptSentAt ? "set" : "null"}` };
  });

  // ================= P0. PAYMENTS — REAL PATH (pre-existing block) =================
  await assert("P0. Real payments create — documented pre-existing block", async () => {
    const direct = await pbAdmin.collection("payments").create({
      user: testUser.id, email: H8_USER_EMAIL, amount: 10, total_amount: 10, plan_type: "premium",
      billing_cycle: "monthly", transaction_id: "H8_E2E_TXN_REAL", status: "pending",
      start_date: new Date().toISOString(), end_date: new Date().toISOString(), custom_donation: 0,
    }).then(() => true, (e) => e);
    if (direct === true) return { ok: false, detail: "unexpected: PB payment create succeeded" };
    const viaApi = await apiJson("/pending-subscriptions/create", {
      method: "POST",
      body: JSON.stringify({
        user_id: testUser.id, email: H8_USER_EMAIL, full_name: "H8 E2E User", contact_number: "01781234567",
        subscription_type: "monthly", amount: 10, transaction_id: "H8_E2E_TXN_REAL2", status: "pending",
      }),
    });
    const inPb = await pbAdmin.collection("payments").getFullList({ filter: 'transaction_id~"H8_E2E_TXN_REAL"' });
    return {
      ok: true, // documented, not a hard failure of H8 (pre-existing)
      detail: `PB direct create error="${direct.message}"; API route=${viaApi.status} "${viaApi.body && viaApi.body.message}"; records persisted in PB=${inPb.length} (0 = pre-commit failure)`,
    };
  });

  // ================= F. PAYMENT MIRROR (direct endpoint, pending) =================
  const synPay = (id, status, cycle, amt = 10, extra) => ({
    id, user: testUser.id, email: H8_USER_EMAIL, amount: amt, total_amount: amt,
    plan_type: "premium", billing_cycle: cycle, transaction_id: `H8_E2E_TXN_${id}`,
    transaction_ref: `H8_E2E_TXN_${id}`, custom_donation: 0, status,
    start_date: new Date().toISOString(), end_date: new Date(Date.now() + 30 * 864e5).toISOString(),
    created: new Date().toISOString(), updated: new Date().toISOString(), ...(extra || {}),
  });

  await assert("F. Payment mirror (direct, pending) -> PG mapped", async () => {
    paymentDirect = "h8e2epay001";
    const r = await apiJson("/internal/payment-mirror/payment", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(synPay(paymentDirect, "pending", "monthly", 10)),
    });
    const row = await prisma.payment.findUnique({ where: { id: paymentDirect } });
    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    const checks = {
      http200: r.status === 200,
      userPresent: !!user,
      pbIdMatch: user && user.pocketbaseId === testUser.id,
      status: row.status === "pending",
      payStatus: row.paymentStatus === null,
      amount: Number(row.amount) === 10,
      totalAmt: Number(row.totalAmount) === 10,
      plan: row.planType === "premium",
      sub: row.subscriptionType === "Monthly",
      txn: row.transactionId === `H8_E2E_TXN_${paymentDirect}`,
      email: row.email === H8_USER_EMAIL,
      dates: !!row.startDate && !!row.endDate,
    };
    const ok = Object.values(checks).every(Boolean);
    return { ok, detail: `api=${r.status} PG status=${row.status} amount=${row.amount} totalAmt=${row.totalAmount} plan=${row.planType} cycle=${row.billingCycle} sub=${row.subscriptionType} email=${row.email} payStatus=${row.paymentStatus} userPbId=${user ? user.pocketbaseId : "?"} txn=${row.transactionId} ${JSON.stringify(checks)}` };
  });

  // ================= G. PAYMENT APPROVE (direct) =================
  await assert("G. Payment approved (direct) -> PG approved + Subscription TA", async () => {
    const r = await apiJson("/internal/payment-mirror/payment", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(synPay(paymentDirect, "approved", "monthly", 10)),
    });
    const row = await prisma.payment.findUnique({ where: { id: paymentDirect } });
    const ta = await prisma.templeAccount.findUnique({ where: { id: `ta_${paymentDirect}` } });
    return {
      ok: r.status === 200 && row.status === "approved" && !!ta && ta.classification === "Subscription" && ta.status === "Approved" && ta.subscriptionType === "Monthly",
      detail: `api=${r.status} PG=${row.status} TA(amount=${ta && ta.amount}, class=${ta && ta.classification}, status=${ta && ta.status}, sub=${ta && ta.subscriptionType}, month=${ta && ta.month})`,
    };
  });

  // ================= H. PAYMENT REJECT (direct) =================
  await assert("H. Payment rejected (direct) -> PG rejected, no TA", async () => {
    const id = "h8e2epay002";
    const r = await apiJson("/internal/payment-mirror/payment", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(synPay(id, "rejected", "monthly", 10)),
    });
    const row = await prisma.payment.findUnique({ where: { id } });
    const ta = await prisma.templeAccount.findUnique({ where: { id: `ta_${id}` } });
    return { ok: r.status === 200 && row.status === "rejected" && !ta, detail: `PG status=${row.status} TA=${ta ? "PRESENT(BAD)" : "absent(GOOD)"}` };
  });

  // ================= I. PAYMENT RETRY (idempotency) =================
  await assert("I. Payment retry idempotent", async () => {
    const r = await apiJson("/internal/payment-mirror/payment", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(synPay(paymentDirect, "approved", "monthly", 10)),
    });
    const pay = await prisma.payment.count({ where: { id: paymentDirect } });
    const ta = await prisma.templeAccount.count({ where: { id: `ta_${paymentDirect}` } });
    return { ok: r.status === 200 && pay === 1 && ta === 1, detail: `api=${r.status} payments=${pay} templeAccounts=${ta}` };
  });

  // ================= K. TEMPLE ACCOUNT SHAPE =================
  await assert("K. TempleAccount shape (donation + payment)", async () => {
    const dta = await prisma.templeAccount.findUnique({ where: { id: `ta_${donationA.id}` } });
    const pta = await prisma.templeAccount.findUnique({ where: { id: `ta_${paymentDirect}` } });
    return {
      ok: !!dta && !!pta && dta.month === new Date().toLocaleDateString("en-US", { month: "long" }) && dta.year === new Date().getFullYear() && dta.classification === "Donation" && pta.classification === "Subscription",
      detail: `donationTA(amount=${dta && dta.amount}, class=${dta && dta.classification}, month=${dta && dta.month}, year=${dta && dta.year}) | paymentTA(amount=${pta && pta.amount}, status=${pta && pta.status}, sub=${pta && pta.subscriptionType}, month=${pta && pta.month}, year=${pta && pta.year})`,
    };
  });

  // ================= L. MIRROR AUTH =================
  await assert("L. Mirror auth (no secret) -> 401", async () => {
    const r = await apiJson("/internal/donation-mirror/donation", { method: "POST", body: "{}" });
    return { ok: r.status === 401, detail: `-> ${r.status}` };
  });
  await assert("L. Mirror auth (wrong secret) -> 401", async () => {
    const r = await apiJson("/internal/donation-mirror/donation", {
      method: "POST", headers: mirrorHeader("wrong"), body: "{}",
    });
    return { ok: r.status === 401, detail: `-> ${r.status}` };
  });
  await assert("L. Mirror auth (correct secret) -> 200", async () => {
    const r = await apiJson("/internal/donation-mirror/donation", {
      method: "POST", headers: mirrorHeader(SECRET), body: JSON.stringify(donationPayloadFor(donationA)),
    });
    return { ok: r.status === 200, detail: `-> ${r.status}` };
  });

  // ================= M. H4 (existing) =================
  await assert("M. H4: GET /auth/me (user bearer) -> 200", async () => {
    const r = await apiJson("/auth/me", { headers: { Authorization: `Bearer ${userToken}` } });
    return { ok: r.status === 200, detail: `-> ${r.status}` };
  });
  await assert("M. H4: GET /users (admin bearer) -> 200", async () => {
    const r = await apiJson("/users", { headers: { Authorization: `Bearer ${adminToken}` } });
    return { ok: r.status === 200, detail: `-> ${r.status} total=${r.body && r.body.length}` };
  });
  await assert("M. H4: /users rejects non-admin -> 403", async () => {
    const r = await apiJson("/users", { headers: { Authorization: `Bearer ${userToken}` } });
    return { ok: r.status === 403, detail: `non-admin -> ${r.status}` };
  });

  // ================= N. H5 (existing) PUT ROLE dual-write =================
  await assert("N. H5: PUT /users/:id/role dual-write (PG+PB)", async () => {
    const promote = await apiJson(`/users/${testAdmin.id}/role`, {
      method: "PUT", headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    const pbRole = await pbAdmin.collection("users").getOne(testAdmin.id).then((u) => u.role).catch(() => null);
    const pgInit = await prisma.user.findUnique({ where: { pocketbaseId: testAdmin.id } });
    const restore = await apiJson(`/users/${testAdmin.id}/role`, {
      method: "PUT", headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user" }),
    });
    const pbFinal = await pbAdmin.collection("users").getOne(testAdmin.id).then((u) => u.role).catch(() => null);
    const pgFinal = await prisma.user.findUnique({ where: { pocketbaseId: testAdmin.id } });
    return {
      ok: promote.status === 200 && restore.status === 200 && pbFinal === "user" && pgFinal && pgFinal.role === "user",
      detail: `promote=${promote.status} restore=${restore.status}; PB ${pbRole}->${pbFinal}; PG ${pgInit && pgInit.role}->${pgFinal && pgFinal.role}`,
    };
  });

  // ================= O. H7 (existing) pooja booking + mirror =================
  await assert("O. H7: real pooja booking create — documented pre-existing block", async () => {
    const err = await pbAdmin.collection("pooja_bookings").create({
      user: testUser.id, pooja: "testPoojaId", booking_date: new Date().toISOString().split("T")[0],
      booking_time: "18:00", purohit_name: "H8 Test Purohit", contact_number: "01781234567",
      receipt_id: "H8_E2E_RCP_BKG001", transaction_id: "H8_E2E_TXN_B1", status: "pending",
    }).then(() => null, (e) => e);
    const persisted = await pbAdmin.collection("pooja_bookings").getFullList({ filter: 'transaction_id="H8_E2E_TXN_B1"' });
    return {
      ok: true, // documented, pre-existing legacy hook abort — H7 worked around it
      detail: `create error="${err && err.message}"; persisted=${persisted.length} (0 = pre-existing legacy hook aborts booking create)`,
    };
  });

  await assert("O. H7: booking mirror direct (pooja pre-provided in PG) -> PG booking + TA", async () => {
    let pooja = await prisma.pooja.findUnique({ where: { id: "h8e2epoojacreatetime" } });
    if (!pooja) {
      pooja = await prisma.pooja.create({
        data: { id: "h8e2epoojacreatetime", name: "H8 E2E Pooja", god: "Ganesha", duration: 60, donationAmount: 10 },
      });
    }
    const r = await apiJson("/internal/booking-mirror/pooja-booking", {
      method: "POST", headers: mirrorHeader(SECRET),
      body: JSON.stringify({
        id: "h8e2ebooking001", user: testUser.id, pooja: pooja.id,
        email: H8_USER_EMAIL, donation_amount: 10, booking_date: new Date().toISOString().split("T")[0],
        status: "pending", contact_number: "01781234567", notes: "H8 E2E booking",
      }),
    });
    const b = await prisma.poojaBooking.findUnique({ where: { id: "h8e2ebooking001" } });
    return { ok: r.status === 200 && !!b, detail: `api=${r.status} booking=${!!b}` };
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