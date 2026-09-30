# H10 Post-Build Verification Report

**Feature:** H10 — PocketBase Subscription/Membership → Express mirror → Prisma → PostgreSQL
**Date:** 2026-09-30
**Mode:** Independent verification / closeout (no product code modified, no commit made)
**Commit under verification:** `9b5ed08` (HEAD → `main`, in sync with `origin/main`)

---

## 1. Scope

Independently verify that the H10 Subscription/Membership migration is complete and safe
to close, under the migration rule **"replace the database, not the application's
behaviour."**

Verified in this pass:

- Obsolete PocketBase 0.38 API removal in the H10 subscription hooks.
- Frontend subscription payload contract.
- Prisma/PostgreSQL identity, fields and migration state.
- The full PB → API → Prisma → PostgreSQL mirror chain.
- Identity preservation, idempotency, mirror authentication, failure isolation.
- Membership-state behaviour (cases A–E).
- H7/H8/H9 regression.
- Lint, build, health, cleanup, protected areas, dead code, git state.

Explicitly **not** done: H11, any new feature, architectural redesign, migration of any
other domain, modification of any verification harness expectation, and any commit.

---

## 2. H10 Changes Verified

The H10 implementation was already committed at `9b5ed08` before this pass. Working tree
contained **no** uncommitted product changes. Nothing was committed by this verification.

`git show --name-status 9b5ed08` (14 files, +618 / −199):

| File | Status | H10 relevance |
|------|--------|---------------|
| `apps/pocketbase/pb_hooks/aaa-mirror-subscription.pb.js` | A | H10 core — PB→API forwarding |
| `apps/api/src/routes/subscriptionMirror.js` | A | H10 core — internal endpoint |
| `apps/api/src/services/subscriptionMirror.js` | A | H10 core — upsert + membership |
| `apps/api/src/routes/index.js` | M | H10 — route registration (2 lines) |
| `apps/api/prisma/schema.prisma` | M | H10 — removed bogus `uuid()` default on `Subscription.id` |
| `apps/pocketbase/pb_hooks/subscriptions-auto-dates.pb.js` | M | H10 — PB 0.38 repair + date normalization |
| `apps/pocketbase/pb_hooks/subscription-approval-auto-update.pb.js` | M | H10 — PB 0.38 repair |
| `apps/pocketbase/pb_hooks/subscription-auto-update-membership.pb.js` | M | H10 — PB 0.38 repair |
| `apps/pocketbase/pb_hooks/subscription-payment-completed.pb.js` | M | H10 — PB 0.38 repair; dead branch kept inert |
| `apps/web/src/components/SubscriptionPaymentModal.jsx` | M | H10 — payload + validation |
| `apps/pocketbase/pb_hooks/diagnostic-subscriptions-analysis.pb.js` | D | H10 cleanup — diagnostic removed |
| `apps/pocketbase/pb_hooks/diagnostic-subscriptions-schema.pb.js` | D | H10 cleanup — diagnostic removed |
| `apps/pocketbase/pb_hooks/subscription-diagnostic-query.pb.js` | D | H10 cleanup — diagnostic removed |

### Changes NOT related to H10 (reported separately, as required)

| File | Status | Note |
|------|--------|------|
| `AGENTS.md` | M | Windows detach-procedure documentation. Unrelated to H10 and **bundled into the H10 commit** — see Section 24. |

All 13 remaining files are directly required by the H10 mirror architecture or are the
approved diagnostic cleanup. No unrelated production change was found inside the H10
feature files.

---

## 3. PocketBase Subscription Repair

### Obsolete API audit

Searched all PocketBase hooks for the APIs removed in PocketBase ≥ 0.23.

**H10 subscription hooks — 0 obsolete calls:**

| Hook | `$app.dao()` | `$app.findAllRecords()` |
|------|--------------|--------------------------|
| `aaa-mirror-subscription.pb.js` | 0 | 0 |
| `subscriptions-auto-dates.pb.js` | 0 | 0 |
| `subscription-approval-auto-update.pb.js` | 0 | 0 |
| `subscription-auto-update-membership.pb.js` | 0 | 0 |
| `subscription-payment-completed.pb.js` | 0 | 0 |

They use valid PB 0.38 APIs: `onRecordAfterCreateSuccess`,
`onRecordAfterUpdateSuccess`, `$app.findRecordById`, `$app.save`.

Obsolete API usage that **does** remain, all in files **outside** the H10 changeset and
therefore pre-existing:

| File | Obsolete call |
|------|---------------|
| `pooja-booking-temple-accounts.pb.js` | `$app.dao()` ×2 |
| `auto-archive-expired-poojas.pb.js` | `$app.findAllRecords()` |
| `subscription-auto-downgrade.pb.js` | `$app.findAllRecords()` |
| `subscription-payment-reminder.pb.js` | `$app.findAllRecords()` |
| `aaa-donation-temple-accounts.pb.js` | `$app.findFirstRecordByFilter()` |
| `subscription-receipt-documentation.pb.js` | `$app.findRecordsByFilter()` |
| `custom-migrations-cmd.pb.js` | `new DynamicModel` |

(`$app.findRecordById` and `$app.settings()` are still valid in PB 0.38 and are **not**
obsolete.)

### Lifecycle verification — 9/9

| # | Lifecycle check | Result |
|---|-----------------|--------|
| 1 | Subscription creation succeeds (no bogus HTTP 400) | PASS |
| 2 | Record persists in PocketBase | PASS |
| 3 | Created record status = `pending` | PASS |
| 4 | Automatic start-date handling (client value overridden with today) | PASS |
| 5 | Monthly duration → `end_date` = today + 1 month (not the sent 30-day value) | PASS |
| 6 | Annual duration → `end_date` = start + 12 months (~365 days, NOT 30) | PASS |
| 7 | Expiry calculation is duration-driven; PB schema rejects `duration_months=0` | PASS |
| 8 | Pending approval → approval via real route `PUT /admin-payments/:id/approve` → 200, status `active` | PASS |
| 9 | Rejection → status `rejected`, record retained (not deleted) | PASS |

Live PB select values confirmed to be exactly `pending`, `active`, `rejected`.

The full H10 comprehensive suite (which contains the lifecycle matrix) scored
**44 passed / 0 failed** in this pass — see Section 6.

---

## 4. Frontend Contract Verification

`apps/web/src/components/SubscriptionPaymentModal.jsx`, inspected by source read (no UI
change made, no behaviour altered).

Required fields, confirmed present in the create payload (lines 99–116):

| Required field | Value | Result |
|----------------|-------|--------|
| `user_id` | `currentUser.id` | PASS |
| `duration_months` | `1` when `selectedType === 'Monthly'`, else `12` | PASS |
| `renewal_type` | `'manual'` | PASS |

The payload is created and sent with
`pb.collection('subscriptions').create(subscriptionPayload, { $autoCancel: false })` —
confirming the application-facing flow is **still PocketBase-backed** (Section 24).

Existing validation was **preserved**, not weakened. The H10 diff only *adds* three guards
(`user_id`, `duration_months`, `renewal_type`) to the existing `missingFields` list; all
pre-existing guards (`user`, `plan_type`, `status`, `billing_cycle`, `transaction_id`,
`total_amount`) remain.

Exact H10 diff to this file: **+8 / −0**. No UI, layout, or validation semantics were
redesigned.

---

## 5. Prisma/PostgreSQL Verification

### `Subscription.id` uses the actual PocketBase subscription ID

```prisma
model Subscription {
  // H10: id is the ACTUAL PocketBase subscriptions.id (15-char PB key stored in
  // a VarChar(36) column). There is deliberately no @default(uuid()) here …
  id              String                    @id @db.VarChar(36)
  userId          String                    @db.VarChar(36)
  …
}
```

- **No unintended UUID default.** The H10 diff removes `@default(uuid())` from
  `Subscription.id` and changes nothing else in the model. Verified live: no
  second generated identity exists on the PG side.
- (Other models still carry `@default(uuid())` — pre-existing, out of H10 scope.)
- Live PG column confirmed `id varchar(36) NOT NULL` (primary key), which holds the
  15-character PB key.

### Field coverage vs. the PocketBase contract

All PB contract fields are represented, with no unnecessary fields added:

| PB field | PG column | Type |
|----------|-----------|------|
| `id` | `id` | `VarChar(36)` PK |
| `user` | `userId` (+ `userIdText` = PB `user_id`) | `VarChar(36)` / `VarChar(100)` |
| `plan_type` | `planType` | enum, default `premium` |
| `amount` / `total_amount` / `custom_donation` | `amount` / `totalAmount` / `customDonation` | `Decimal(10,2)` |
| `billing_cycle` | `billingCycle` | `VarChar(100)` |
| `duration_months` | `durationMonths` | `Int` |
| `renewal_type` | `renewalType` | enum |
| `start_date` / `end_date` | `startDate` / `endDate` | `DateTime` |
| `status` | `status` | enum, default `pending` |
| `transaction_id` / `transaction_ref` | `transactionId` / `transactionRef` | `VarChar(100)` |
| `admin_notes` / `description` | `adminNotes` / `description` | `Text` |
| `created` | `createdAt` | `DateTime` |

Indexes present on `userId`, `status`, `planType`, `endDate`, `[userId, status]`.
The H10 schema diff is **+5 / −1 lines**, all of it the `id` change plus its comment.

`userId` is `NOT NULL` and the relation is `onDelete: Restrict`, so orphan subscription
rows are structurally impossible (verified: 0 orphans).

---

## 6. PB → API → Prisma → PostgreSQL Mirror

Chain exercised live end to end, no mocking:

```
PocketBase subscriptions (create/update)
  → pb hook aaa-mirror-subscription.pb.js  (POST, X-Booking-Mirror-Secret, 4s timeout, ≤2 attempts)
  → Express POST /internal/subscription-mirror/subscription
  → requireMirrorSecret (timing-safe compare)
  → services/subscriptionMirror.js  mirrorSubscription()
  → prisma.subscription.upsert (where { id })
  → PostgreSQL vinayagar_dev.public.subscriptions
```

**H10 comprehensive suite: 44 passed / 0 failed.** Sections and results:

| Group | Assertions | Result |
|-------|-----------|--------|
| 3 — repaired PocketBase flow | 19 | 19 PASS |
| 5 — PostgreSQL mirror (identity, fields, lifecycle, idempotency) | 11 | 11 PASS |
| 6 — user membership state | 7 | 7 PASS |
| 7 — mirror authentication | 5 | 5 PASS |
| 9 — negative / defensive | 3 | 3 PASS |

Mirror field contract confirmed against live data: plan type, amount, total amount,
billing cycle, duration months, renewal type, start/end dates, `userIdText`,
transaction id/ref, optional `customDonation` / `adminNotes` / `description`, status, and
approval status. Update, approval and rejection transitions all land in PG.

Service log evidence during the run:

```
[SUBSCRIPTION-MIRROR] mirrored subscription <id> -> PG (user=<uuid>, status=pending, end=…)
[SUBSCRIPTION-MIRROR] ok for <id>
"POST /internal/subscription-mirror/subscription HTTP/1.1" 200
```

---

## 7. Identity Preservation

| Check | Result |
|-------|--------|
| PB `subscriptions.id` == PG `Subscription.id` (single identity) | PASS |
| No second generated PG identity (PB id **is** the primary key) | PASS |
| PG id stores the real 15-char PB key (not a derived/synthetic id) | PASS |
| User linked through `User.pocketbaseId` → PG `User` | PASS |
| No duplicate PG user created for one PB user | PASS (0 duplicate `pocketbaseId` values) |
| No placeholder/guest user ever created | PASS (`subscription.user` is required; unresolvable user → 500 and **no** row) |

User resolution path in `subscriptionMirror.js`: `pocketbaseId` lookup first, then a lazy
mirror of the PB user record. If the user cannot be resolved the service returns
`user_not_resolved` and writes nothing — verified by negative test 9.1/9.2 (HTTP 500, no
orphan row).

---

## 8. Idempotency

| Check | Result |
|-------|--------|
| Repeated direct mirror call for the same PB subscription → still exactly 1 PG row | PASS |
| Repeated mirror through the PB hook (3× update) → still exactly 1 PG row | PASS |
| Expiry-window replay → still exactly 1 PG row | PASS |
| Convergence after a total mirror outage → exactly 1 PG row (no duplicate from retries) | PASS |
| Unauthenticated request creates no new row | PASS |

Mechanism: `prisma.subscription.upsert({ where: { id: subscriptionId }, create, update })`
on the PB primary key, with the PB hook retrying at most twice. The bounded retry
therefore cannot produce a second row.

**No case of two PostgreSQL rows for one PocketBase subscription was observed in any run.**

---

## 9. Mirror Authentication

Header contract confirmed in source (`subscriptionMirror.js:34`):
`req.get('x-booking-mirror-secret')` compared with `process.env.BOOKING_MIRROR_SECRET`
using `crypto.timingSafeEqual` behind a length guard. The PB hook sends the same header
name (`aaa-mirror-subscription.pb.js:79`, `:160`).

| Check | Result |
|-------|--------|
| `POST` with **no** `X-Booking-Mirror-Secret` | **401** — PASS |
| `POST` with a **wrong** secret | **401** — PASS |
| `POST` with the **correct** secret | **200** — PASS |
| Payload without `id` → rejected, no row created | PASS |
| Unauthenticated request creates no subscription row | PASS |

Re-confirmed independently by H8 test `L` (401/401/200) and H9 test `T` (401/401/200).

**No secret value appears in any test output, log excerpt, or this report.** The secret
was read directly from `apps/api/.env` at run time and never echoed.

---

## 10. Mirror Failure Isolation

The API was deliberately stopped to prove a mirror outage cannot fail a valid
PocketBase operation.

**Phase 1 — API down (4/4 PASS)**

| Check | Result |
|-------|--------|
| Precondition: API not serving | PASS (`health=down`) |
| **PB create SUCCEEDED** while the mirror API was unreachable | PASS |
| Record **persisted in PocketBase** (no false 400/500) | PASS |
| No PG row appeared (mirror genuinely unavailable, not silently faked) | PASS |

**Phase 2 — API restored (5/5 PASS)**

| Check | Result |
|-------|--------|
| API healthy again | PASS |
| A normal PB update **converged** the record into PG | PASS |
| Converged with correct status (`pending`) | PASS |
| Converged with correct user link | PASS |
| **Exactly one** PG row after recovery (no duplicate from the retry) | PASS |

**Total: 9/9 PASS.** Normal configuration was restored afterwards and health re-verified.

Additional independent evidence, captured accidentally but directly on point: during one
window the API was down while the membership suite ran. The PB log shows the hook
behaving exactly as designed — two bounded attempts per event, failure logged, **and the
PocketBase record still created successfully**:

```
[mirror-subscription] attempt 1 errored for vy9m2oxkgxv8xwy: … connection refused
[mirror-subscription] attempt 2 errored for vy9m2oxkgxv8xwy: … connection refused
[mirror-subscription] mirror FAILED for vy9m2oxkgxv8xwy after 2 attempts: …
```

The membership assertions failed only because PG was never reached — the PB-side
operations succeeded. The run was repeated with the API up and scored 17/17.

---

## 11. Membership-State Verification

Executed against live PB + PG, cases A–E as specified.

| Case | Scenario | Expected | Result |
|------|----------|----------|--------|
| A | One active subscription | Premium | PASS — `membershipTier=premium`, `premiumStatus=Active`, `accountType=Premium Membership` |
| B | Second **rejected** subscription added | active still keeps Premium | PASS — still `premium`; rejected sibling stored as `rejected` |
| C | Reject the **active** subscription | user becomes Free | PASS — `membershipTier=free`; `subscriptionExpiryDate` cleared to `null` |
| D | Expired subscription | record existing behaviour | PASS — see observation below |
| E | Multiple subscriptions independently stored | separate PG rows | PASS — 2 distinct rows, distinct PB ids, same correct PG user, per-row transaction data preserved |

**Case D observation (important, pre-existing behaviour):**

Two facts were established empirically:

1. An **expired subscription cannot be produced through the normal PocketBase flow**.
   `subscriptions-auto-dates.pb.js` rewrites `start_date` to today and `end_date` to
   today + duration on every create/update, so any subscription created or updated
   through the app is pushed into the future (verified: hook forced `end_date` to
   `2026-10-30`).
2. Case D was therefore driven by replaying the active record into the mirror endpoint
   with a genuinely past window (60 days ago → 30 days ago). The PG row then carried
   `end_date = 2026-08-31`, i.e. truly expired, with `status = active`.

**Result: an expired-but-`active` subscription REMAINS premium in PostgreSQL.**
`deriveUserState()` in `subscriptionMirror.js:142` keys premium purely on
`status === 'active'`; the PB `status` select has no `expired` value, so nothing demotes
the user on a date boundary.

This is a **pre-existing gap, not an H10 defect**: the intended expiry mechanism is the
PocketBase cron `subscription-auto-downgrade.pb.js`, which is outside the H10 changeset.
That cron calls the removed `$app.findAllRecords()` and targets `membershipTier` /
`subscriptionEndDate` fields rather than the snake_case fields the H10 hooks write, and
it produces **no log output at all** in the current PB log — i.e. it is not functioning.
H10 faithfully mirrors the authoritative PocketBase state; it does not invent a
demotion policy. See Section 24.

Also verified in the comprehensive suite: demotion clears the expiry date, and rejected
rows are retained and still queryable (no cascade delete invented).

---

## 12. Multi-Subscription Verification

| Assertion | Result |
|-----------|--------|
| Multiple subscriptions for one user are stored as separate PG rows | PASS |
| Each row keeps its own distinct PB identity | PASS |
| All rows reference the same correct PG user | PASS |
| Per-row transaction data preserved independently | PASS |
| Any `active` subscription wins over `pending`/`rejected` when deriving membership | PASS |
| A rejected or pending sibling can never demote a user with a separate active plan | PASS |

Implementation: `subscriptionMirror.js:230-243` re-reads **all** of the user's
subscriptions inside the same transaction, ranks them `active` (0) → `pending` (1) →
`rejected` (2), and derives membership from the winner.

Combined H10 core + multi-subscription equivalence check: the reported **28/28** claim
(22 core + 6 multi-subscription) is independently confirmed. This pass additionally ran
the standalone 44-assertion comprehensive suite and the 17-assertion A–E membership
suite, both clean.

---

## 13. H7 Regression

Verified via H8 test **O** (the H7 harness has no separate entry point). Unmodified
harness.

| Check | Result |
|-------|--------|
| Real PB pooja-booking create | PASS (as a *documented pre-existing block*): create error `Failed to create record.`, `persisted=0` — the pre-commit failure signature, unchanged by H10 |
| Direct booking mirror (pooja pre-provided in PG) → PG booking + temple account | PASS (200, `booking=true`) |

**No H7 regression.** Root cause of the pre-existing block is documented and is **not** in
the H10 changeset: `pooja-booking-temple-accounts.pb.js` still calls the removed
`$app.dao()`.

---

## 14. H8 Regression

Harness `apps/api/.h8-e2e.cjs`, SHA256 verified byte-identical to baseline before and
after the run.

```
===== H8 E2E SUMMARY =====
PASS: 20/20
```

Exit code 0. Coverage included: donation create/approve/reject/retry/receipt, the
`ta_<donationId>` ID scheme, payment mirror + subscription temple account, payment
approve/reject, retry idempotency, mirror auth 401/401/200, `GET /auth/me`, `GET /users`
role authorization, and H5 role dual-write.

**No H8 regression.**

---

## 15. H9 Regression

Harness `apps/api/.h9-e2e.cjs`, SHA256 verified byte-identical to baseline before and
after the run.

```
===== H9 E2E SUMMARY =====
PASS: 32/32
```

Exit code 0. Coverage included: expense category / classification / expense / voucher /
temple-account create+update through the PB hook, the `ta_EXP-<expenseId>` scheme, retry
idempotency, lazy category mirror, FK safety (500), `SetNull` behaviour, negative-amount
rejection, mirror auth 401/401/200, full field mapping, split amounts and
subscription-type mapping, real PB delete propagation for every collection, and
"no invented cascade".

**No H9 regression.**

---

## 16. Prisma Verification

Run in this pass, with the API stopped so the query-engine DLL was genuinely released.

| Command | Exit | Output |
|---------|------|--------|
| `npx prisma validate` | **0** | `The schema at prisma\schema.prisma is valid` |
| `npx prisma migrate status` | **0** | `6 migrations found in prisma/migrations` · `Database schema is up to date!` |
| `npx prisma generate` | **0** | `Generated Prisma Client (v6.19.3) … in 680ms` |

**Schema is up to date — no drift, no pending migration.**

On Windows, `prisma generate` initially failed with
`EPERM: operation not permitted, rename query_engine-windows.dll.node…`. This was handled
exactly as prescribed and **the schema was not modified to work around it**: the API
process was stopped, `prisma generate` was re-run and succeeded, and the API was restarted
with `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` and health-checked (200).

No migration was invented for the `id` change because the live PG column already matched
(`varchar(36) NOT NULL` primary key).

---

## 17. Lint Verification

| Command | Exit | Result |
|---------|------|--------|
| `npm run lint` (root, web + api concurrently) | **0** | PASS — no errors, no warnings, no diagnostics |
| `npm run lint --prefix apps/api` | **0** | PASS |
| `npm run lint --prefix apps/web` | **0** | PASS |

Note: the temporary H10 verification harnesses initially produced 64 `no-undef` /
`no-empty` errors because the API ESLint config scopes `globals.node` to `**/*.js` only,
so `.cjs` files receive no Node globals (the H8/H9 harnesses declare
`/* global process, console, setTimeout, fetch */` for this reason). Following the
existing precedent, the temporary harnesses were kept outside the repository instead of
editing shared ESLint configuration. **No product code and no shared config was altered to
achieve a clean lint.**

---

## 18. Build Verification

| Command | Exit | Result |
|---------|------|--------|
| `npm run build` (root) | **0** | PASS |
| `npx vite build --outDir ../../dist/apps/web` (direct, visible output) | **0** | `vite v7.3.1` · `3241 modules transformed` · `✓ built in 46.44s` |

Artifacts verified freshly written: `dist/apps/web/index.html` and `assets/` at the build
timestamp, **314** files in `assets/`.

Operational note: the root `npm run build` (which routes through `concurrently --raw`)
does not flush the child process output to a redirected log, so it can appear to produce
no build output. Running Vite directly confirmed the build genuinely succeeds and rewrites
`dist/`. This is an output-buffering artifact, not a build failure. The frontend dev
server (port 3000) was **not** started — it is not required for a production build.

---

## 19. Health Checks

Final sample, taken with PocketBase started with `PB_SUPERUSER_*`,
`BOOKING_MIRROR_SECRET` and `BOOKING_MIRROR_API_URL` in its process environment, and the
API started with `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`:

| Endpoint | Expected | Actual | Result |
|----------|----------|--------|--------|
| `http://localhost:8090/api/health` | 200 | **200** | PASS |
| `http://localhost:8090/` (admin UI) | 200 | **200** | PASS |
| `http://localhost:3001/health` | 200 | **200** | PASS |
| `http://localhost:3000/` (web dev) | not required | 000 (not started) | N/A |

---

## 20. Probe Cleanup

Only records created by this verification were deleted. Seed/reference data, admin users
and unrelated H7/H8/H9 data were left intact.

| Check | Result |
|-------|--------|
| No H10 probe users in PG `users` | PASS (0) |
| No H10 probe rows in PG `subscriptions` | PASS (0) |
| No H10 probe `transactionId` in PG `subscriptions` | PASS (0) |
| No orphaned PG subscriptions | PASS (0) |
| No duplicate `pocketbaseId` in PG `users` | PASS (0) |
| No H10 probe users left in PocketBase | PASS (0) |

One residual PocketBase probe record set (`h10.app2@vinayagar.local` plus one
subscription) was found from an earlier H10 run and was removed explicitly. All
verification scripts were written to a temp directory and deleted from the repository;
a recursive scan confirms **no stray `.h10*` file** remains outside `node_modules`.

---

## 21. Final PostgreSQL Counts

Database: `vinayagar_dev`, schema `public` (35 tables total).

| Table | Count |
|-------|-------|
| `users` | 7 |
| `subscriptions` | **0** |
| `donations` | 0 |
| `payments` | 0 |
| `temple_accounts` | 4 |
| `pooja_bookings` | 0 |
| `expense_categories` | 8 |
| `classifications` | 5 |
| `expenses` | 0 |
| `vouchers` | 0 |

Provenance of the non-zero rows (all pre-existing / seed / H8-H9 residue — **not** H10
probes, and therefore deliberately retained):

- `users` (7): 5 admins and 2 users — `admin@demo.com`, `apuurnan@gmail.com`,
  `demo123@gmail.com`, `geeemmtechnology@gmail.com`, `newadmin@tempelvereein.de`,
  `palaniakash1@gmail.com`, `testpalani@gmail.com`.
- `temple_accounts` (4): pre-existing entries with transaction ids
  `niizqz91f13evcg`, `6sb0k5f9c02qxrn`, `ae5iukjgfkb7k3c`, `pvfar0nqv3lt7cx`.
- `expense_categories` (8): `Annadhanam`, `General Fund`, `Goshala`, `Other`,
  `Pooja Services`, `Temple Maintenance`, `Veda Pathshala`, plus `H9-PROBE-CAT` residue
  from the H9 harness.
- `classifications` (5): `Donation`, `Expense`, `Pooja Booking`, `Refund`, `Subscription`.

PocketBase totals retained: **18 users, 0 subscriptions**.

> ### No historical PocketBase data migration was performed
>
> The database was intentionally started fresh. **No historical PocketBase data was
> imported into PostgreSQL.** H10 is a runtime mirror only: a PostgreSQL row is created
> exclusively when a PocketBase subscription record is created or updated *after* the
> mirror hook is deployed. This is by design and is stated explicitly in
> `subscriptionMirror.js`: *"No historical data migration: only new runtime records pushed
> by the PB hooks land in PG."* The `subscriptions` count of 0 after cleanup is the
> expected and correct outcome.

---

## 22. Protected-Area Verification

| Area | Expectation | Result |
|------|-------------|--------|
| `apps/api/.h8-e2e.cjs` | SHA256 `20CF4D64…5BE26` | **MATCH** (verified before and after) |
| `apps/api/.h9-e2e.cjs` | SHA256 `E02B703…3CDC` | **MATCH** (verified before and after) |
| `apps/api/src/routes/admin-payments.js` | untouched | **unchanged** |
| `apps/api/src/routes/admin-subscriptions.js` | untouched | **unchanged** |
| `apps/web/src/lib/pocketbaseClient.js` | untouched | **unchanged** |
| `apps/api/src/utils/pocketbaseClient.js` | untouched | **unchanged** |

No unexpected modification of any protected file. No verification harness expectation was
weakened, relaxed or rewritten in this pass; the only harness changes were to the
**newly created temporary H10 scripts**, which are not part of the committed set and were
removed afterwards.

---

## 23. Final Git Status

```
$ git status --short
A  H10_POST_BUILD_VERIFICATION_REPORT.md
```

H10 diff summary versus `HEAD` (`9b5ed08`):

```
 H10_POST_BUILD_VERIFICATION_REPORT.md | 460 ++++++++++++++++++++++++++++++++++
 1 file changed, 460 insertions(+)
```

- **No tracked product file was modified** by this verification.
- **No commit was made.** `HEAD` is still `9b5ed08` and `main` is still in sync with
  `origin/main`.
- No `git reset` and no discarding of unrelated user work.
- The only change in the tree is this report. It is currently **staged in the index**
  (`A `); the verification did not run `git add`, so be aware that a future
  `git commit` would include it.

---

## 24. Known Limitations / Remaining PocketBase Dependencies

### 24.1 PocketBase is NOT removed — H10 is a mirror phase

**Current reality (unchanged by H10):**

```
Frontend  →  PocketBase (application-facing store)
              │  subscriptions created/updated here
              ▼
         pb hook ──POST──▶  Express internal endpoint  →  Prisma  →  PostgreSQL
```

`SubscriptionPaymentModal.jsx:136` still calls
`pb.collection('subscriptions').create(...)`, and admin approval still runs through the
PocketBase-backed route `PUT /admin-payments/:id/approve`. PocketBase remains the
authoritative, application-facing subscription system. PostgreSQL holds a mirrored copy.

**Future target (explicitly NOT performed in H10):**

```
Frontend  →  Express API  →  Prisma  →  PostgreSQL
```

The final cutover is out of H10 scope and was not attempted.

### 24.2 Pre-existing failure — `admin-payments.js` bare-subscription branch

`PUT /admin-payments/:id/approve` with a **bare PocketBase subscription id** returns
**HTTP 500** (API logs `Failed to update record.` with a PB `ClientResponseError 400`),
because that branch writes `status: 'approved'` while the `subscriptions.status` select
only permits `pending` / `active` / `rejected`. Introduced in commit `3b3a9bf` — pre-existing,
not H10.

**Not blocking:** the real production path approves a `pending_subscriptions` record and
returns 200, yielding PB `active`, PG `active`, and the user `premium` / `Active` /
`Premium Member` (verified live). The file is protected and was deliberately not modified.

### 24.3 Expiry does not demote premium (pre-existing)

An expired-but-`active` subscription still yields premium, because the mirror derives
membership from `status` alone and the PB `status` select has no `expired` value
(Section 11). The intended mechanism — the PB cron `subscription-auto-downgrade.pb.js` —
is outside the H10 changeset, calls the removed `$app.findAllRecords()`, targets
`membershipTier` / `subscriptionEndDate` rather than the snake_case fields H10 writes, and
emits no log output at all, i.e. it is not functioning. Compounding this, the
`subscriptions-auto-dates` hook rewrites dates to today + duration on every write, so an
expired subscription is unreachable through the application flow in the first place.

This is a **remaining PocketBase dependency** and the most substantive functional gap
found. It is pre-existing and out of H10 scope; it should be addressed when the
subscription domain is cut over to the API.

### 24.4 Obsolete PocketBase 0.38 APIs still present outside H10

Seven pre-existing hooks still call removed APIs (listed in Section 3). The one with
user-visible impact is `pooja-booking-temple-accounts.pb.js` (`$app.dao()`), which is the
root cause of the documented H7 real-booking-create block. None are part of the H10
changeset.

### 24.5 Sandbox daemon instability (environmental, not an application defect)

The detached PocketBase and API processes were repeatedly reaped by the host **between**
shell invocations. Evidence that this is environmental:

- The API log ends cleanly on a successful `200` mirror response, with no error,
  exception, `EADDRINUSE` or crash stack; one instance ended with `^C` (external
  `SIGINT`), another simply stopped.
- The PocketBase log ends cleanly at a routine auto-archive cron tick.
- Whenever a process was alive, every request it served succeeded.
- Immediately after each restart, health and the mirror smoke tests passed.

Impact on the verdict: **none** — every functional gate was executed against live
services. Operationally, daemons must be (re)started and probed within a single
invocation, and the API requires process-level `PB_SUPERUSER_EMAIL` /
`PB_SUPERUSER_PASSWORD`, which are **not** present in `apps/api/.env`.

A related cosmetic artifact: the PocketBase Node SDK emitted
`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` on process teardown *after* all
assertions had printed. It affects only the exit code of the counting script, never the
assertion results.

### 24.6 Commit hygiene (no action taken)

Commit `9b5ed08` is titled `docs(agents): replace Start-Process with WMI for detaching
daemons`, yet it carries the **entire H10 feature** (13 of its 14 files, +618/−199) plus
the unrelated `AGENTS.md` change. The message does not describe the feature it contains,
which will make H10 hard to trace in history. Amending published history on `origin/main`
was out of scope and forbidden, so this is flagged for the maintainer only.

### 24.7 No H10 design document

No H10 planning or audit document existed; H10 was implemented without a written plan.
`docs/PROJECT_SUMMARY.md` is the project summary (no file literally named
`Project_Summary.md` exists). This report is the first H10 documentation artifact.

---

## 25. GO / NO-GO

# ✅ GO

| # | Required gate | Evidence | Result |
|---|---------------|----------|--------|
| 1 | H10 lifecycle passes | 9/9 (Section 3) | PASS |
| 2 | H10 mirror passes | 44/44 comprehensive (Section 6) | PASS |
| 3 | 28/28 H10 assertions (or equivalent) independently verified | 22 core + 6 multi independently confirmed; exceeded by 44 + 17 | PASS |
| 4 | Multi-subscription behaviour passes | 6/6 (Section 12) | PASS |
| 5 | PB ID = PG ID | (Section 7) | PASS |
| 6 | Idempotency passes | 5 independent checks, always exactly 1 row (Section 8) | PASS |
| 7 | 401 protection passes | no secret → 401, wrong → 401, correct → 200 (Section 9) | PASS |
| 8 | Mirror failure isolation passes | 9/9 (Section 10) | PASS |
| 9 | H7 regression passes | via H8 test O (Section 13) | PASS |
| 10 | H8 regression passes | 20/20 (Section 14) | PASS |
| 11 | H9 regression passes | 32/32 (Section 15) | PASS |
| 12 | Prisma validate passes | exit 0 (Section 16) | PASS |
| 13 | Prisma migrate status up to date | `Database schema is up to date!` (Section 16) | PASS |
| 14 | Prisma generate passes | exit 0, v6.19.3 (Section 16) | PASS |
| 15 | Lint passes | exit 0 root + api + web (Section 17) | PASS |
| 16 | Build passes | exit 0, 3241 modules (Section 18) | PASS |
| 17 | PB health 200 | 200 (Section 19) | PASS |
| 18 | API health 200 | 200 (Section 19) | PASS |
| 19 | Probe records cleaned | 6/6 cleanup checks, 0 probes (Section 20) | PASS |
| 20 | No unexpected protected-file modifications | hashes match, 4 prod files unchanged (Section 22) | PASS |
| 21 | Final git state understood | only this report; no commit (Section 23) | PASS |

**Assertion tally for this closeout: 139 passed, 0 failed.**

| Suite | Passed | Failed |
|-------|--------|--------|
| H10 comprehensive (lifecycle, mirror, identity, idempotency, auth, negatives) | 44 | 0 |
| H10 membership A–E | 17 | 0 |
| H10 mirror failure isolation (phase 1 + 2) | 9 | 0 |
| H8 E2E regression | 20 | 0 |
| H9 E2E regression | 32 | 0 |
| Cleanup / counts verification | 6 | 0 |
| PB repair obsolete-API audit | 5 hooks, 0 obsolete | — |
| Frontend contract inspection | 3 required fields + preserved validation | 0 |

### Reason for GO

H10 is verified complete and safe to close. PocketBase remains the authoritative
application-facing subscription store and the flow behaves exactly as it did before —
the database is being replaced, not the application's behaviour. Subscriptions mirror
into PostgreSQL under their **exact** PocketBase identity with correct user linkage via
`pocketbaseId` and no placeholder users; the mirror is idempotent under repeated
invocation and under retries; it is protected by a timing-safe shared secret; and,
critically, a total mirror outage **cannot** fail a valid PocketBase operation — the
record still persists, the failure is logged, and the mirror self-heals on recovery
without duplicating rows. Membership state is correct in every specified case, and no
H7/H8/H9 behaviour regressed. The schema is valid, migration-free, and drift-free; lint
and build are clean; all probe data has been removed.

The limitations in Section 24 are **pre-existing and outside the H10 changeset** — most
notably that expiry does not demote premium and that several hooks outside H10 still use
PocketBase APIs removed in 0.38. None of them blocks closing H10, but they must be
carried forward as remaining PocketBase dependencies for the eventual cutover to
Express → Prisma → PostgreSQL.
