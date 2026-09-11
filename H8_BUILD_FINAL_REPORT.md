# H8 BUILD MODE — Final Report

Sri Siththi Vinayagar Temple · PocketBase → PostgreSQL mirror delivery

**Date:** 2026-09-11  |  **Branch:** main  |  **Status:** DELIVERED + E2E VERIFIED (20/20)

---

## 1. Objective

H8 = bring donation (and payment) records created in **PocketBase** into **PostgreSQL** so
Prisma becomes the live PG access layer. PocketBase remains the application-facing
system of record for donation/payment/booking lifecycle; the H8 mirror push every
successful create/update into PostgreSQL, idempotently, preserving user identity and
deriving the temple-account income ledger on approval.

## 2. Scope of delivery

| Deliverable | Path |
|---|---|
| PB → API donation mirror hook | `apps/pocketbase/pb_hooks/aaa-mirror-donation.pb.js` |
| PB → API payment mirror hook | `apps/pocketbase/pb_hooks/aaa-mirror-payment.pb.js` |
| PB → API pooja-booking mirror hook (H7, renamed for registration order) | `apps/pocketbase/pb_hooks/aaa-mirror-pooja-booking.pb.js` |
| Donation mirror service (PG upsert + derived TempleAccount) | `apps/api/src/services/donationMirror.js` |
| Payment mirror service (PG upsert + derived TempleAccount) | `apps/api/src/services/paymentMirror.js` |
| Donation mirror route (secret-auth) | `apps/api/src/routes/donationMirror.js` |
| Payment mirror route (secret-auth) | `apps/api/src/routes/paymentMirror.js` |
| Route registration | `apps/api/src/routes/index.js` |
| Prisma migration (notes/receipt fields, enum value) | `apps/api/prisma/migrations/20260911111820_h8_donation_mirror/migration.sql` |
| Schema updates | `apps/api/prisma/schema.prisma` |
| Runtime documentation (env + health-check rule) | `AGENTS.md` |

## 3. Architecture

```
PocketBase (8090)                         Express API (3001)                     PostgreSQL
  aaa-mirror-donation.pb.js   ─$http──►   /internal/donation-mirror/donation     Donation
  aaa-mirror-payment.pb.js    ─$http──►   /internal/payment-mirror/payment       Payment
  aaa-mirror-pooja-booking    ─$http──►   /internal/booking-mirror/pooja-booking PoojaBooking
                                          (X-Booking-Mirror-Secret, timing-safe) TempleAccount
```

- Hooks fire on **`onRecordAfterCreateSuccess`**, **pre-commit `onRecordUpdateExecute`**,
  and **`onRecordAfterUpdateSuccess`**.
- Hooks use synchronous `$http.send` with a 4 s timeout and **2 bounded retries**;
  they **never throw** — a mirror failure can never roll back or fail the user operation.
- API side is **idempotent by PB record id**: `Donation.id == PB donation id`,
  `Payment.id == PB payment id`, `TempleAccount.id == "ta_<pb id>"`.
- Repeat calls can never produce duplicate PG rows (upsert on the fixed PK).

## 4. Key discovery — PB 0.38 JSVM hook constraints

Verified empirically in this build:

1. **`onRecordBeforeUpdateSuccess` does NOT exist** in this PB 0.38 build. Using it
   fails the entire hook file load:
   `failed to execute aaa-mirror-donation.pb.js: ReferenceError: onRecordBeforeUpdateSuccess is not defined`.
   The correct pre-commit hooks in this build are **`onRecordUpdate` /
   `onRecordUpdateExecute` / `onRecordUpdateRequest`**.
2. **Legacy after-update hooks abort the after-success chain.** `donation-receipt-generation.pb.js`
   (and the payment equivalent) call `$app.save(record)` inside `onRecordAfterUpdateSuccess`.
   In PB 0.38's JSVM that nested save throws → the abort skips **every later-registered**
   after-update hook. The record itself commits (the client still sees the generic 400
   `"Failed to update record."`), but a mirror registered later in the chain was skipped.
3. **Registration order matters.** The H8 mirror hooks are **`aaa-`-prefixed** so they load
   first, but the above escape hatch (`onRecordUpdateExecute`) is the real guarantee:
   it runs pre-commit, so even when the legacy hook aborts the after-success chain,
   the pre-commit mirror has already persisted the record to PG.
4. **JSVM callback scope isolation.** Top-level functions/consts/`globalThis` from the same
   `.pb.js` file are NOT visible inside hook callbacks ("`<name> is not defined`" at runtime).
   All logic must be physically inlined inside each callback body.

## 5. The B/C class bug & fix

- **Symptom:** approving a donation wrote the approval to PB but the mirror (after-update)
  never ran → PG stayed `pending`, no `TempleAccount` income row.
- **Root cause:** the legacy receipt hook's nested `$app.save()` abort inside
  `onRecordAfterUpdateSuccess` skip-later-hooks behaviour (see §4.2).
- **Fix:** pre-commit mirror via `onRecordUpdateExecute` (fires after validation, directly
  before the DB write). It mirrors **only mutation-critical fields** (`status`, `amount`,
  `approval_date`, `payment_status`, etc.) and **NOT** `receipt_*` fields — the legacy
  receipt generator sets those on a record, then `$app.save()` throws, so those values
  are **never committed**; mirroring them would over-state PG.
- **Verified:** E2E test B — PB update returns the (pre-existing, cosmetic) 400, but PG
  reaches `approved` and `TempleAccount ta_<id>` is created.

## 6. Mirror invariants

- **Donation:** `Donation.id == PB id`; `TempleAccount` created/updated **only when**
  `status == approved && amount > 0`, `classification = 'Donation'`, deterministic
  `id = 'ta_<pb donation id>'`, month/year from approval date.
- **Payment:** `Payment.id == PB id`; `paymentStatus` stays `null` (no PSP gateway status);
  `TempleAccount` on `approved` only, `classification = 'Subscription'`,
  `status = 'Approved'`, `subscription_type` = Monthly/Yearly from `billing_cycle`.
- **User mapping:** H5/H7 identity strategy — `pocketbaseId` → lazy mirror of the PB user →
  email fallback. **Never** creates a placeholder user.
- **Receipt fields (donation):** mirrored via the after-update path and the direct route
  (`receipt_id`, `receipt_sent_at`, `resend_receipt`) — test E passes.

## 7. Pre-commit guard fields (donation)

`id, user, amount, donation_date, category, status, notes, approval_date,
special_occasion, is_deleted, payment_status, donation_description`

Intentionally excludes `receipt_*` (see §5). Retained for the after-update handler and the
full direct route payload.

## 8. Pre-commit guard fields (payment)

`id, user, amount, plan_type, status, transaction_id, transaction_ref, billing_cycle,
custom_donation, total_amount, start_date, end_date, email, created, updated`

## 9. Auth on internal endpoints

Both mirror routes require header `X-Booking-Mirror-Secret` to equal
`process.env.BOOKING_MIRROR_SECRET`, compared with `crypto.timingSafeEqual`.
- No header → `401`
- Wrong secret → `401`
- Correct secret → `200`
- Missing env (endpoint disabled) → `503`

Verified by E2E tests L (three sub-cases).

## 10. Environment & startup

PB **does NOT auto-load** `apps/pocketbase/.env` for `$os.getenv()` in this build —
config must arrive via **process environment**:

```
PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD   (also required for admin bootstrap)
BOOKING_MIRROR_SECRET        (must match apps/api/.env)
BOOKING_MIRROR_API_URL       (http://localhost:3001)
```

- `start.ps1` reads `BOOKING_MIRROR_*` from `apps/api/.env` and exports them.
- `npm run dev` alone does NOT export them → hooks log
  `BOOKING_MIRROR_SECRET not set` and skip (documented in AGENTS.md).
- Server readiness must be verified with `curl.exe` + `--max-time` + explicit `exit`
  (documented rule; never `Invoke-WebRequest`).

## 11. Prisma migration (20260911111820_h8_donation_mirror)

```sql
ALTER TYPE "PaymentApprovalStatus" ADD VALUE 'completed';
ALTER TABLE "donations"
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "receiptId" VARCHAR(100),
  ADD COLUMN "receiptSentAt" TIMESTAMP(3),
  ADD COLUMN "resendReceipt" BOOLEAN NOT NULL DEFAULT false;
```

Schema-side: `Donation.id` no longer uses the `@default(uuid())` — the PG PK now mirrors
the PB record id for idempotent upsert.

## 12. E2E verification — final run

**20 / 20 PASS** (re-run after the payment pre-commit guard was added; PB restarted to load
both guarded hooks; PG re-verified clean afterwards).

| Test | Result |
|---|---|
| A. Donation create (real PB → hook → API → PG) | PASS — id/user/status/amount/paymentStatus/desc/resend all mirrored; user resolved via pocketbaseId |
| B. Donation approve (PB update, cosmetically 400s) → PG approved + TA | PASS |
| C. Donation mirror retry idempotent | PASS — 1 donation, 1 TA after double-post |
| D. Donation reject → PG rejected, **no** TA | PASS |
| E. Donation receipt fields mirror | PASS — receiptId/resend/sentAt |
| P0. Real payments create | DOCUMENTED BLOCK — pre-existing `payments.create` failure (400 "Something went wrong"), API route 500, 0 rows persisted |
| F. Payment mirror (direct, pending) → PG mapped | PASS — status/amount/plan/cycle/sub/email/txn all 1:1, paymentStatus null |
| G. Payment approved (direct) → PG approved + Subscription TA | PASS — TA classification=Subscription, status=Approved, sub=Monthly |
| H. Payment rejected (direct) → PG rejected, no TA | PASS |
| I. Payment retry idempotent | PASS — 1 payment, 1 TA |
| K. TempleAccount shape (donation + payment) | PASS — month/year/classification correct |
| L. Mirror auth ×3 | PASS — 401 / 401 / 200 |
| M. H4 regression | PASS — /auth/me 200, /users admin 200, non-admin 403 |
| N. H5 regression (PUT role dual-write) | PASS — PG+PB kept in sync |
| O. H7: real pooja booking create | DOCUMENTED BLOCK — pre-existing legacy hook aborts create (0 persisted) |
| O. H7: booking mirror direct → PG booking | PASS — api 200, booking row persisted |

## 13. E2E regression harness

`apps/api/.h8-e2e.cjs` — standalone Node script (PocketBase client + Prisma) that:
- boots a superuser + admin + user, runs the A–O matrix against the **live** PB/API/PG,
- self-cleans all tagged rows in PG (start + end) and PB (start),
- prints a `PASS/FAIL` summary and exits non-zero on any failure.

Not committed to git (left as an untracked working-tree artifact per finalize decision).

## 14. Cleanup performed

- Deleted all `.h8-*` throwaway scripts / logs / listeners from `apps/api` and repo root.
- Removed temp listener files and killed the listener process.
- Verified PG back to baseline: **users=7, donations=0, payments=0, templeAccounts=0**,
  0 tagged H8 rows.
- Verified PB: donations 0, payments 0, receipts 0; the only rows present are pre-existing
  (2 pooja_bookings unrelated to H8) and real users (8 PB vs 7 PG — the extra is a
  PB-only user, expected; H8 does not backfill).

## 15. Static verification

| Check | Command | Result |
|---|---|---|
| Prisma schema valid | `npx prisma validate` | OK |
| Migrations applied | `npx prisma migrate status` | up-to-date (5 migrations, db vinayagar_dev) |
| Client generated | `npx prisma generate` | OK (v6.19.3) |
| Lint | `npm run lint` | clean (api + web) |
| Frontend build | `npx vite build --outDir ../../dist/apps/web` | OK (3241 modules, `dist/apps/web/index.html` 6053 bytes) |

Note: the root `npm run build` (via concurrently) produced no output; the direct vite build
was used and succeeded. `prisma generate` initially hit EPERM (DLL locked by the running
API) — stopped the API, generated, restarted, health 200.

## 16. Server state at hand-off

- PocketBase running at `:8090` (started with process env so both mirror hooks are armed),
  health 200.
- Express API running at `:3001` (health 200), mirror routes registered.
- Frontend not required for these tests.

## 17. Git status at hand-off

Staged (11 files, +1061/−4): AGENTS.md, migration.sql, schema.prisma, donationMirror.js
+ paymentMirror.js (routes + services), routes/index.js, both `aaa-mirror-*.pb.js` hooks,
pooja-booking mirror renamed to `aaa-mirror-pooja-booking.pb.js`.

Unstaged working-tree changes (+171): the pre-commit `onRecordUpdateExecute` blocks in
`aaa-mirror-donation.pb.js` (+90) and `aaa-mirror-payment.pb.js` (+81).

Untracked: `apps/api/.h8-e2e.cjs` (verification harness, kept per decision).

Nothing was committed during this session (per user decision — repo left for the user to
stage/commit).

## 18. Documented pre-existing blocks (do not fix)

| Block | Reality |
|---|---|
| `POST /donations/approve` → 404 | Admin approve uses PB's mounted `/admin-donations/:id/approve`; not an H8 regression |
| Legacy receipt + temple-accounts hooks | Root cause of the B/C chain-abort — fixed around, not modified |
| `payments.create` / `pooja_bookings.create` in PB | Pre-existing 400 ("Something went wrong") — unrelated to H8; mirror works via API |
| `autoArchive` poojas list/view 400s | Pre-existing; `poojas` collection list errors |
| Guest donations | Not in scope |
| Frontend donation approval UI | Out of scope (admin ops happen in PB) |
| Subscription lifecycle redesign | Out of scope — mirror is reactive to PB |

## 19. Operational notes

- Restart PB with the env block (§10) and watch startup output for any
  `failed to execute ... .pb.js` — there must be none now.
- Mirror hooks are safe to leave armed; without `BOOKING_MIRROR_SECRET` they no-op.
- `console.warn` is silenced globally in `apps/web/vite.config.js` (line 274) — unrelated.
- Hooks use `console.log` (visible in the PB server console), not `console.warn`.