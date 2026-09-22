# H9 BUILD MODE — Final Report (Expense & Financial Ledger mirror)

Sri Siththi Vinayagar Temple · PocketBase → PostgreSQL mirror delivery

**Date:** 2026-09-22  |  **Branch:** main  |  **Status:** E2E VERIFIED (27/27 + H8 regression 20/20)

---

## 1. Objective

H9 brings the **Expense & Financial Ledger** domain — created/managed in **PocketBase**
(expense_categories, classifications, expenses, vouchers, temple_accounts) — into
**PostgreSQL** so Prisma becomes the live PG access layer for that ledger. PocketBase
remains the application-facing system of record; the H9 mirror pushes every successful
create/update into PostgreSQL, idempotently, exactly like the H7/H8 donation/payment/
booking mirrors.

## 2. Scope of delivery

| Deliverable | Path |
|---|---|
| PB → API expense-ledger mirror hook (5 collections × create/update) | `apps/pocketbase/pb_hooks/aaa-mirror-expense-ledger.pb.js` |
| Expense ledger mirror service (PG upserts, lazy FK resolution) | `apps/api/src/services/expenseMirror.js` |
| Expense ledger mirror route (secret-auth) | `apps/api/src/routes/expenseMirror.js` |
| Route registration | `apps/api/src/routes/index.js` |
| Repositories (expense, expense-category, classification, voucher + TA constructor) | `apps/api/src/repositories/{ExpenseRepository,ExpenseCategoryRepository,ClassificationRepository,VoucherRepository,TempleAccountRepository}.js` + `index.js` |
| Prisma migration (drop legacy non-negative CHECK on temple_accounts) | `apps/api/prisma/migrations/20260922120000_h9_expense_ledger/migration.sql` |
| E2E verification harness | `apps/api/.h9-e2e.cjs` (lint-clean) |

## 3. Architecture

```
PocketBase (8090)                       Express API (3001)               PostgreSQL
  aaa-mirror-expense-ledger.pb.js                                         expense_categories
    onRecordAfterCreateSuccess                                            classifications
    onRecord(After)UpdateSuccess        /internal/expense-mirror/*        expenses
        │  5 collections                 (X-Booking-Mirror-Secret,        vouchers
        └──$http──►                       timing-safe)                    temple_accounts
```

## 4. Do-not-fix boundary (locked for H9)

| Item | Status |
|---|---|
| `payments.create` PB 400 / `pooja_bookings.create` PB 400 | documented, not fixed |
| Subscription lifecycle / user flow | documented, not fixed |
| Receipts / vouchers **frontend** UI | documented, not fixed |
| Unmounted finance routes (404) | documented, not fixed |
| `databases`, any frontend file | untouched |
| `apps/pocketbase/pb_migrations/` (528 files) | **no migration added for H9** (zero changes) |
| Existing `aaa-*` mirror hooks (H7/H8) | untouched |
| `.h8-e2e.cjs` | byte-identical, re-run green (20/20, §18) |
| donationMirror STEP-4 writer | untouched — H9 temple_accounts rows use disjoint `ta_EXP-*` / `ta_pb_*` ids |

## 5. Prisma migration (20260922120000_h9_expense_ledger)

The expense ledger writes legitimate **negative** amounts into `temple_accounts`
(`ExpenseManagerPage.jsx:180-333` posts `amount = -amount`). The phase0 migration had
added a blanket SQL CHECK (`amount >= 0`) which blocks those rows. Prisma cannot express
CHECK constraints in `schema.prisma`, so it was raw SQL and is now dropped:

```sql
ALTER TABLE "temple_accounts" DROP CONSTRAINT "temple_accounts_amount_nonnegative_check";
```

Only the temple_accounts CHECK is removed; all other constraints are untouched. Verified
live: `pg_constraint` query returns `[]` for temple_accounts CHECK constraints.
`npx prisma migrate status` → "6 migrations… Database schema is up to date!".

## 6. Live PB schema discovery (diverged from migrations)

Probing the **live** schema showed the running PocketBase deviates from its migration files
(the schema is the source of truth here):

- `expenses.category` is an extra **[select] REQ** field (values `Staff Salaries | General`) —
  every PB expense create must also send `category`.
- `expenses.created_by` has been **removed** live → service falls back to `createdBy: 'unknown'`.
- `temple_accounts.month` **[text] REQ** and `year` **[number] REQ** (plus `classification` REQ,
  `transaction_id` REQ, `member_name`/`amount`/`category`/`date` REQ).
- `vouchers.expense_id` is **[text] REQ**, not a relation → mirrors to `Voucher.expenseId`
  (VARCHAR(36), FK SetNull).
- `expenses.voucher_id` [text] opt; `expense_categories.created_by` [text] opt.
- `temple_accounts` list/view rule = admin-only → harness creates TA via the PB superuser.

## 7. Mirror invariants

- **PKs fixed/prisma.** `id` in PG == PB record id for all five collections → upsert is
  idempotent, repeat deliver (hook retries or manual endpoint POST) never duplicates
  (tests K/L/M/N/O).
- **TempleAccount id scheme (collision-avoided).** H9 mirrors PB TA rows as-is:
  `id = 'ta_<transaction_id>'` (expense-originated rows carry `transaction_id = 'EXP-<expenseId>'`,
  so PG id = `ta_EXP-<expenseId>`); when `transaction_id` absent → fallback `ta_pb_<pbId>`.
  This is **disjoint** from donationMirror's STEP-4 `ta_<donationId>` / payment
  `ta_<paymentId>` / booking `ta_<bookingId>`. Verified: test W creates both a `ta_donation*`
  (via direct donation mirror) and a `ta_EXP-*` row and asserts no collision.
- **Expense.** amount ≥ 0.01 enforced (500 otherwise, test S — negative *expenses* stay
  rejected; the negative *ledger outflow* lives on temple_accounts, test I); date required;
  `categoryId` resolved lazily from PB when absent in PG (`ensurePgExpenseCategory`, test P);
  unresolvable category → 500 FK safety (test Q); `billFile/classification/voucherId/
  description` mapped (test U); `createdBy` default `'unknown'`.
- **Voucher.** `expenseId` set when the expense resolves; unresolvable → `null` (SetNull)
  and mirror still succeeds (test R).
- **TempleAccount.** negative amounts accepted; `subscriptionType` mapped from TA
  `subscription_type` (Monthly/Yearly); `entryType` mapped (test V).
- **No delete mirror** (create/update only — same convention as H7/H8). Test X documents:
  PB delete of a TA leaves the PG row intact (by design).

## 8. Service & route shape

- `expenseMirror.js` (419 lines): five `mirror*` functions each wrapping a
  `prisma.$transaction(..., { maxWait: 5000, timeout: 10000 })` upsert; lazy
  `ensurePgExpenseCategory` / `ensurePgExpense` fetch missing parents from PB via the
  superuser client (`lib/pbClient.js` sibling pattern) before the FK write.
- Route `expenseMirror.js` (77 lines): `router.use('/internal/expense-mirror',
  expenseMirrorRouter)` in `routes/index.js`; each of the 5 POST endpoints compares
  `X-Booking-Mirror-Secret` with `crypto.timingSafeEqual` → `401` (missing/wrong),
  missing payload → `400` (test Y), valid → service → 200.
- Mirrors are wrapped in try/catch; a mirror failure **never** rolls back or fails the
  user-facing PB operation (the PB hook never throws).

## 9. PB hook — aaa-mirror-expense-ledger.pb.js

- 10 registered callbacks (after-create + after-update × 5 collections), fully **inlined**
  per the PB 0.38 JSVM scope rule (top-level function/const sharing across callbacks is not
  visible — H8 §4.4). No throw paths; `e.next()` always called after the sync `$http.send`
  block (2 bounded retries, 4 s timeout, `BOOKING_MIRROR_SECRET not set` → log + skip).
- Hook-specific pre/post payload extraction reflects the live schema (§6) — e.g. expenses
  send `category` select too; TA sends `month`/`year`; vouchers send `expense_id`.

## 10. Auth on internal endpoints

Same rule as H8: `X-Booking-Mirror-Secret` == `process.env.BOOKING_MIRROR_SECRET`,
timing-safe. Verified by test T: no header → 401, wrong secret → 401, correct → 200.

## 11. E2E verification — final run (this session)

PB (:8090, health 200) + API (:3001, health 200) running with mirror env (`start.ps1`
pattern — `BOOKING_MIRROR_SECRET` / `BOOKING_MIRROR_API_URL` in PB process env).

**27 / 27 PASS.**

| Test | Result |
|---|---|
| A. ExpenseCategory create (PB → hook → API → PG) | PASS — id/name/desc/createdBy |
| B. ExpenseCategory update (PB → PG) | PASS |
| C. Classification create | PASS — createdBy null |
| D. Classification update | PASS |
| E. Expense create (relation category) → PG | PASS — amount/paidTo/method/qty/cat/createdBy=unknown |
| F. Expense update | PASS |
| G. Voucher create (expense_id text) → PG + FK link | PASS |
| H. Voucher update | PASS |
| I. TempleAccount create (EXP txn, **negative amount**) → `ta_EXP-<id>` | PASS — amount −150.5 |
| J. TempleAccount update | PASS |
| K–O. Retry idempotency × 5 collections | PASS — api 200, exactly 1 PG row |
| P. Expense lazy category mirror (PG absent) | PASS — category fetched from PB |
| Q. Expense w/o category → 500 FK safety | PASS |
| R. Voucher unresolvable expense → expenseId null, mirror OK | PASS |
| S. Expense negative amount → 500 | PASS |
| T. Mirror auth × 3 | PASS — 401 / 401 / 200 |
| U. Expense full field mapping (class/voucherId/desc + billFile via mirror) | PASS |
| V. TempleAccount split amounts + subscriptionType/entryType | PASS |
| W. No `ta_<donationId>` collision (STEP-4 untouched) | PASS |
| X. Real expense-delete flow — PG row kept (no delete-mirror) | PASS (documented) |
| Y. H9 endpoints reject missing payload → 400 | PASS |

## 12. H9 harness

`apps/api/.h9-e2e.cjs` — standalone Node (PocketBase + Prisma), boots a superuser, an
h9 admin + h9 user, creates tagged PB rows, waits for mirror propagation, asserts the PG
rows, verifies direct-endpoint behavior (idempotency/auth/400/500/lazy mirror), then
**self-cleans** all `H9-E2E-TEST` rows in both PG and PB. Exits non-zero on any failure.

## 13. H8 regression — .h8-e2e.cjs

`apps/api/.h8-e2e.cjs` was left **unchanged** and re-run in this session: **20/20 PASS**,
including the documented pre-existing blocks (payments create, pooja booking create).
H9's changes do not regress the donation/payment/booking mirror.

## 14. Static checks

| Check | Result |
|---|---|
| `npx prisma validate` | OK |
| `npx prisma migrate status` | 6 migrations, up to date |
| `npx prisma generate` | OK (v6.19.3) |
| `npm run lint --prefix apps/api` | clean |
| `npm run build` | OK (exit 0) |

## 15. Server state at hand-off

- PocketBase running at `:8090` (health 200) with mirror env armed.
- Express API running at `:3001` (health 200), mirror routes registered.
- Frontend not required for these tests.

## 16. Files changed (working tree, all H9 scope)

| File | Change |
|---|---|
| `apps/api/prisma/migrations/20260922120000_h9_expense_ledger/migration.sql` | +12 (new) — drop CHECK |
| `apps/api/src/services/expenseMirror.js` | +419 (new) |
| `apps/api/src/routes/expenseMirror.js` | +77 (new) |
| `apps/api/src/routes/index.js` | +2 (mount) |
| `apps/api/src/repositories/{Expense,ExpenseCategory,Classification,Voucher}Repository.js` | new (19 each) |
| `apps/api/src/repositories/TempleAccountRepository.js` | +22/−? (added `constructor(client)`) |
| `apps/api/src/repositories/index.js` | +4 (exports) |
| `apps/pocketbase/pb_hooks/aaa-mirror-expense-ledger.pb.js` | +769 (new) |
| `apps/api/.h9-e2e.cjs` | +467 (new harness) |

Net: 12 files, **+1840/−8**. Nothing committed this session (untracked/staged only) —
commit is up to the user.

## 17. Protected areas — verified untouched

| Area | Verification |
|---|---|
| `apps/pocketbase/pb_migrations/` | zero changes (git status clean for that dir) |
| Existing `aaa-mirror-donation/payment/pooja-booking.pb.js` | untouched |
| `apps/api/src/services/donationMirror.js` STEP-4 | untouched (test W proves disjoint TA ids) |
| `.h8-e2e.cjs` | byte-identical, 20/20 |
| `apps/web/**` | zero changes |
| `start.ps1`/`start.sh` | gitignored, unchanged |
| `pb_data/`, `pocketbase.exe`, `dist/` | gitignored, unchanged |

## 18. Cleanup performed

- Removed temp probe scripts (`.h9-probe.cjs`, `.h9-schema.cjs`).
- Deleted leftover `H9-PROBE-CAT` probe rows in PB (2 rows).
- Harness self-cleans all tagged rows (PG + PB) after each run.

## 19. Do-not-fix (pre-existing, unchanged)

`payments.create` 400 · `pooja_bookings.create` 400 · subscription lifecycle · receipts/
vouchers UI · unmounted finance routes 404 · `databases` · any frontend file. PB legacy
hooks (`donation-receipt-generation`, legacy temple-accounts) remain as-is; H9 delivers via
the new `aaa-`-prefixed hook only.

## 20. FINAL GO/NO-GO

**GO.** Checklist satisfied:

1. All five expense-ledger collections mirrored PB → PG, idempotent, secret-authenticated. ✔
2. Real-life full path verified (create/update via PB hooks → API → PG) for all collections. ✔
3. Splits/negative outflows / subscription-type / lazy category / FK-safety all covered. ✔
4. H9 E2E **27/27 PASS**; H8 regression **20/20 PASS** (unchanged harness). ✔
5. Migration applied only on `temple_accounts` (CHECK dropped, verified live); schema/status green. ✔
6. Static checks: prisma validate/generate/status, lint, build — all green. ✔
7. Protected areas untouched; working tree contains only H9-scoped files (+1840/−8, uncommitted). ✔
8. Do-not-fix list honored and re-documented. ✔

H9 is **DELIVERED and E2E-VERIFIED** (working tree, ready to commit at user's discretion).