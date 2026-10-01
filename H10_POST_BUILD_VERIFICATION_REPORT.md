# H10 Post-Build Verification Report

**Feature:** H10 — Subscription / Membership PostgreSQL + Prisma migration & mirroring
**Date:** 2026-09-30
**Mode:** Independent post-build verification / closeout
**Commit under verification:** `9b5ed08` ("docs(agents): replace Start-Process with WMI for detaching daemons" — carries the entire H10 changeset)
**Governing rule:** *Replace the database, not the application's behaviour.*

---

## 1. Executive summary

H10 is verified **GO**. Every required gate was executed in this pass and passed against
live services. The mirror path `PocketBase → PB hook → Express → Prisma → PostgreSQL`
works for create, update, approval, rejection, idempotent retry and recovery-from-outage,
with PocketBase remaining the application-facing, authoritative store.

| Gate | Result |
|---|---|
| Subscription lifecycle | **20/20** |
| Multi-subscription A/B regression | **8/8** |
| Mirror suite (identity, fields, idempotency, negatives) | **44/44** |
| Mirror failure isolation | **9/9** |
| Mirror authorization | **5/5** (401 / 401 / 200 + 2 negative) |
| H7 regression | **PASS** |
| H8 regression | **PASS — 20/20** |
| H9 regression | **PASS — 32/32** |
| Prisma validate / migrate status / generate | **PASS** |
| Lint (root, api, web) | **PASS** |
| Build | **PASS** |
| Health (PB 200, API 200) | **PASS** |
| Cleanup | **PASS — 11/11** |
| Git audit | **PASS** (no commit made by this verification) |

Two non-blocking findings are recorded honestly rather than asserted as passes:

1. **Expiry does not demote Premium** under the *existing* behaviour (Section 5, Step 11).
2. `AGENTS.md` claims "No README exists", but a root `README.md` **does** exist and its
   generated hook listing is stale (still lists hooks H10 deleted). Documentation only —
   no code impact (Section 20).

**Total H10-specific assertions executed this pass: 98.** With H8 + H9 regressions: **150.**

---

## 2. H10 scope

**In scope for H10:** subscription and membership data moved to PostgreSQL/Prisma, with
PocketBase kept app-facing and mirrored into PostgreSQL for records created after
deployment.

**Verified in this pass:**

- Obsolete PocketBase API usage across active subscription hooks.
- Frontend subscription creation payload contract and validation.
- Prisma `Subscription` model: fields, identity, relations, enums, indexes.
- Full mirror chain, including update propagation and idempotency.
- User identity resolution, no fake users, no duplicate users/subscriptions.
- Mirror secret authorization, before any database mutation.
- Subscription lifecycle and multi-subscription membership behaviour.
- H7/H8/H9 regression without weakening any harness.
- Final database state and probe cleanup.
- Prisma migration status, lint, build, health, git state, dead code.

**Explicitly NOT done (per instruction):** H11; any new feature; architectural redesign;
migration of any other domain; historical PocketBase data migration; any commit; any
weakening of a verification harness.

---

## 3. Files changed

H10 is contained in a **single commit, `9b5ed08`** — 14 files, `+618 / -199`. Full
`git show --name-status`:

```
 M  AGENTS.md                                                  (unrelated to H10 — see §20)
 M  apps/api/prisma/schema.prisma
 M  apps/api/src/routes/index.js
 A  apps/api/src/routes/subscriptionMirror.js
 A  apps/api/src/services/subscriptionMirror.js
 A  apps/pocketbase/pb_hooks/aaa-mirror-subscription.pb.js
 D  apps/pocketbase/pb_hooks/diagnostic-subscriptions-analysis.pb.js
 D  apps/pocketbase/pb_hooks/diagnostic-subscriptions-schema.pb.js
 M  apps/pocketbase/pb_hooks/subscription-approval-auto-update.pb.js
 M  apps/pocketbase/pb_hooks/subscription-auto-update-membership.pb.js
 D  apps/pocketbase/pb_hooks/subscription-diagnostic-query.pb.js
 M  apps/pocketbase/pb_hooks/subscription-payment-completed.pb.js
 M  apps/pocketbase/pb_hooks/subscriptions-auto-dates.pb.js
 M  apps/web/src/components/SubscriptionPaymentModal.jsx
```

**Confirmed absent from the H10 changeset (checked explicitly):**

- `package.json`, `apps/api/package.json`, `apps/web/package.json` — **not touched**.
  No dependency was added; the mirror reuses the existing `fetch`, `express`,
  `@prisma/client` and the PocketBase SDK.
- `apps/api/prisma/migrations/**` — **no migration file added** (correct; see §4/§13).
- `AGENTS.md` *is* modified but its change is Windows process-management documentation
  and is unrelated to subscription behaviour.

---

## 4. Prisma / schema verification

`apps/api/prisma/schema.prisma`, `model Subscription` (lines 525–560) verified verbatim:

```prisma
model Subscription {
  // H10: id is the ACTUAL PocketBase subscriptions.id (15-char PB key stored in
  // a VarChar(36) column). There is deliberately no @default(uuid()) here: the
  // H9 identity rule forbids a second generated identity, and the mirror is
  // idempotent precisely because this column is the PB primary key.
  id              String                    @id @db.VarChar(36)
  userId          String                    @db.VarChar(36)
  planType        SubscriptionPlanType      @default(premium)
  amount          Decimal                   @db.Decimal(10, 2)
  billingCycle    String                    @db.VarChar(100)
  customDonation  Decimal?                  @db.Decimal(10, 2)
  totalAmount     Decimal                   @db.Decimal(10, 2)
  durationMonths  Int
  renewalType     RenewalType
  startDate       DateTime
  endDate         DateTime
  status          SubscriptionRecordStatus  @default(pending)
  transactionId   String?                   @db.VarChar(100)
  transactionRef  String?                   @db.VarChar(100)
  adminNotes      String?                   @db.Text
  description     String?                   @db.Text
  userIdText      String?                   @db.VarChar(100)
  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt

  user                User                  @relation(fields: [userId], references: [id], onDelete: Restrict)
  pendingSubscriptions PendingSubscription[]

  @@index([userId]) @@index([status]) @@index([planType]) @@index([endDate]) @@index([userId, status])
  @@map("subscriptions")
}
```

| Requirement | Verdict | Evidence |
|---|---|---|
| PG `Subscription.id` == PB `subscriptions.id` | **PASS** | `id String @id @db.VarChar(36)`, no generated default |
| Prisma does not generate a different id | **PASS** | `@default(uuid())` deliberately removed (see diff below) |
| No unnecessary fields added | **PASS** | every column maps a PB `subscriptions` field or is a mirror timestamp |
| No required field removed | **PASS** | all pre-existing fields retained; only the `id` default changed |
| Relations valid | **PASS** | `User` FK non-nullable, `onDelete: Restrict`; `PendingSubscription[]` back-relation present |
| Enums match application behaviour | **PASS** | `SubscriptionPlanType`, `RenewalType`, `SubscriptionRecordStatus`; unknown PB status degrades safely (assertion 9.3) |
| Indexes/constraints appropriate | **PASS** | covers user lookup, status scans, plan filters, expiry scans, and the user+status membership query |

**The entire schema change in H10** (`git diff 9b5ed08^ 9b5ed08 -- apps/api/prisma/schema.prisma`):

```diff
 model Subscription {
-  id              String                    @id @default(uuid()) @db.VarChar(36)
+  // H10: id is the ACTUAL PocketBase subscriptions.id ...
+  id              String                    @id @db.VarChar(36)
```

`@default(uuid())` is a **client-side** default. Removing it produces **no DDL change**,
so no new migration is required — confirmed by `migrate status` reporting the database
up to date against 6 existing migrations (§13).

**No historical PocketBase data was migrated.** PostgreSQL contains only records
mirrored or created after deployment. The verification database contains no migrated
subscription rows (§17).

---

## 5. Subscription lifecycle verification

Independent 12-step lifecycle test (`.h10f-lifecycle.cjs`), executed against live
PocketBase + API. PocketBase is the entry point for every step, so the real
`onRecordAfterCreate/UpdateSuccess` hook chain runs.

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Create subscription | **PASS** | id `vwctzlvye2p4oua` |
| 2 | Created without the old bogus 400 | **PASS** | HTTP success, record persisted |
| 2b | Record retrievable from PocketBase | **PASS** | id matches |
| 3 | Start date normalized | **PASS** | `2026-09-30` (client value overridden) |
| 4 | Duration → correct end date | **PASS** | `duration_months=3` → `2026-12-30` (= today+3 months), **not** the `+5 day` value sent |
| 5a | Pending state preserved (PB) | **PASS** | `pending` |
| 5b | Pending state preserved (PG) | **PASS** | `pending` |
| 5c | PG id == PB id | **PASS** | `vwctzlvye2p4oua` |
| 6 | Approve via **real** route `PUT /admin-payments/:id/approve` | **PASS** | HTTP 200 |
| 6b | PB status → `active` | **PASS** | `active` |
| 7 | User becomes Premium (PG) | **PASS** | `membershipTier = premium` |
| 7b | User becomes Premium (PB) | **PASS** | `membership_type = premium` |
| 8 | `premiumStatus` → `Active` | **PASS** | `Active` |
| 9 | Reject | **PASS** | PB status `rejected` |
| 10 | Rejected not left active (PG) | **PASS** | `rejected` |
| 10b | Rejected-only user demoted | **PASS** | `membershipTier = free` |
| 11b | Mirror accepts expired-window replay | **PASS** | HTTP 200 |
| 11c | PG row genuinely expired | **PASS** | `endDate = 2026-08-31` |
| 12 | No duplicate PG rows | **PASS** | 1 row each for both subscriptions |

**Lifecycle: 20/20 passed, 0 failed, 2 observations.**

### Step 4 — a note on test-fixture rigour

The first run of Step 4 reported a failure. On inspection this was a **defect in my own
test fixture, not in the product**: the fixture sent `end_date = today + 30 days` with
`duration_months = 1`, but September has 30 days, so `today+30d` and `today+1 month`
resolve to the *same* date (`2026-10-30`). The assertion could not distinguish
normalization from pass-through. The fixture was changed to a discriminating case
(`duration_months = 3` with a deliberately wrong `today + 5 days`), and Step 4 then
passed on re-run. No product code was involved.

### Step 11 — expiry: existing behaviour does not demote (OBSERVATION, not a pass)

Two recorded observations:

- **11a** `subscriptions-auto-dates.pb.js` rewrites dates to `today + duration` on
  create/update. An already-expired subscription is therefore **unreachable through the
  app flow**; the only way to produce one is a direct mirror replay.
- **11** With a genuinely expired row forced into PostgreSQL via the mirror
  (`endDate = 2026-08-31`, `status = active`), the user **remains**
  `membershipTier = premium`.

**Root cause (pre-existing, out of H10 scope):** `deriveUserState` keys membership on
`status` alone, and the PocketBase `status` select has no `expired` value. The intended
PocketBase downgrade cron `subscription-auto-downgrade.pb.js` calls the **removed**
`$app.findAllRecords()` API, targets mismatched field names, and produces no log output
— it is not functioning.

This was **verified and reported, not asserted as a pass**, and **no repair was made**,
because the instruction is to preserve existing behaviour and to repair only
compatibility problems that prevent existing behaviour from functioning — this is a
pre-existing product limitation, not an H10 regression. See §20.

---

## 6. Mirror verification

Chain verified end to end: `PocketBase subscriptions → aaa-mirror-subscription.pb.js
(onRecordAfterCreateSuccess / onRecordAfterUpdateSuccess) → POST
/internal/subscription-mirror/subscription → requireMirrorSecret →
mirrorSubscription() → tx.subscription.upsert() → PostgreSQL`.

Route registration and path agreement:

```
apps/api/src/routes/index.js:28   router.use('/internal/subscription-mirror', subscriptionMirrorRouter)
apps/api/src/routes/subscriptionMirror.js:42   router.post('/subscription', requireMirrorSecret, ...)
apps/pocketbase/pb_hooks/aaa-mirror-subscription.pb.js:33,114
                                   var MIRROR_PATH = "/internal/subscription-mirror/subscription";
```

The hook's `MIRROR_PATH` and the mounted Express route **match exactly**.

### Mirror suite — 44/44 passed, 0 failed

**Section 3 — repaired PocketBase flow (19/19):** create succeeds with no bogus 400;
record persists; status `pending`; exact frontend field set accepted; monthly
normalization (`today+1 month`, not the sent 30-day value); start date overridden to
today; yearly normalization to ~365 days and `start + 12 months`; PB schema itself
rejects `duration_months = 0`; real approval route → 200; PB status → `active`; PB
`membership_type = premium`; PB `premium_status = Active`; approval mirrored to PG;
rejection → `rejected` with the record **retained** in both PB and PG; exactly one PB
record per create.

**Section 5 — PostgreSQL mirror (11/11):** PB `id` == PG `id`; no second generated
identity; field contract `planType/amount/totalAmount/billingCycle/durationMonths/
renewalType`; dates + `userIdText` + `transactionId/Ref`; optional `customDonation/
adminNotes/description`; user linked via `pocketbaseId`; **update propagation**;
approval mirrored (`active` + tier `premium`); rejection mirrored; **idempotent retry**
via direct call → still exactly 1 row; **idempotent retry through the PB hook**
(3 consecutive updates) → 1 row.

**Section 6 — user membership state (8/8):** case A one active → Premium; A2
`premiumStatus = Active` with expiry set; case B active + second rejected → **stays
Premium**; case C the active one becomes rejected → Free; case D demotion clears
subscription expiry; D2 all subscription rows remain stored (no cascade delete); D3
rejected rows still queryable with their status.

**Section 9 — negative / defensive (3/3):** unknown PB user → 500 and **no orphan
row**; subscription without `user` relation → rejected; unknown PB `status` value
degrades safely (no crash, no duplicate).

### Failure isolation — 9/9 passed

`phase1` (API deliberately **down**), 4/4:

```
PASS  precondition: API is not serving              -> health=down
PASS  PB create SUCCEEDED while mirror API unreachable -> id=xn7bh4t5h1s4156
PASS  record PERSISTED in PocketBase (no false failure) -> status=pending
PASS  no PG row yet (mirror genuinely unavailable)     -> absent as expected
```

`phase2` (API back up), 5/5:

```
PASS  precondition: API healthy again               -> health=200
PASS  record converged into PG after API recovery   -> id=xn7bh4t5h1s4156
PASS  converged with correct status                 -> pending
PASS  converged with correct user link              -> bjm3smm332gozy6
PASS  exactly one PG row after recovery             -> rows=1
```

**A mirror failure cannot break the original PocketBase business operation.** The PB
record commits and returns success while the mirror is unreachable; the failure is
logged, not thrown.

**Bounded retry:** `maxAttempts = 2` on both create and update, with the failure logged
after exhaustion. No queueing framework, no unbounded loop.

**Service implementation (verified directly):**

```
apps/api/src/services/subscriptionMirror.js:220   await tx.subscription.upsert({
apps/api/src/services/subscriptionMirror.js:221     where: { id: subscriptionId },
apps/api/src/services/subscriptionMirror.js:118   const byPbId = await userRepo.findByPocketbaseId(...)
apps/api/src/services/subscriptionMirror.js:163   return { ok: false, error: 'Invalid subscription payload: id is required' }
apps/api/src/services/subscriptionMirror.js:171   return { ok: false, error: 'subscription-user-missing: no user relation on subscription' }
apps/api/src/services/subscriptionMirror.js:176   return { ok: false, error: `user_not_resolved: ...` }
apps/api/src/services/subscriptionMirror.js:147-150  membershipTier / subscriptionStatus / premiumStatus
```

---

## 7. Security verification

The internal endpoint is protected by the **existing** `X-Booking-Mirror-Secret`
mechanism (the same one H8/H9 already use — no new scheme introduced).

```
apps/api/src/routes/subscriptionMirror.js:25   crypto.timingSafeEqual(bufA, bufB)
apps/api/src/routes/subscriptionMirror.js:32   503 if mirror not configured
apps/api/src/routes/subscriptionMirror.js:34   const provided = req.get('x-booking-mirror-secret') || ''
apps/api/src/routes/subscriptionMirror.js:37   401 Unauthorized
apps/api/src/routes/subscriptionMirror.js:42   router.post('/subscription', requireMirrorSecret, async (req, res) => {
apps/api/src/routes/subscriptionMirror.js:49     const result = await mirrorSubscription(body);
```

**Secret validation occurs before any database mutation** — `requireMirrorSecret` is
route middleware, and the first database-touching call is `mirrorSubscription(body)` at
line 49, after the middleware has already returned.

Live results (assertions 7.1–7.5):

| Assertion | Expected | Actual | Result |
|---|---|---|---|
| 7.1 no secret header | 401 | 401 | **PASS** |
| 7.2 wrong secret | 401 | 401 | **PASS** |
| 7.3 correct secret | 200 | 200 | **PASS** |
| 7.4 payload without `id` | rejected, no row | rejected, no row | **PASS** |
| 7.5 unauthenticated call creates no row | 0 rows | 0 rows | **PASS** |

**Authorization: 5/5 PASS.** Independently corroborated by H8 assertion L (no secret
→ 401, wrong secret → 401, correct secret → 200) and H9 assertion T (same three).

**Secret hygiene:** no secret value appears in this report, in H10 source files, in the
frontend, or in any log. The value is read at runtime from `apps/api/.env`, which is
**not tracked by git** (verified). Automated scan of all H10 `.js`/`.jsx`/`.prisma`
files for a hardcoded `BOOKING_MIRROR_SECRET` literal: **none found**.

---

## 8. Multi-subscription verification

Explicit A/B regression, executed on a single user holding two independent
subscriptions. This is the regression called out as important in the verification brief.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Subscription A approved and active in PB **and** PG | **PASS** | A = `7f1nutctttco0v4` |
| 2 | Subscription B created later, then rejected | **PASS** | B = `qrqsupoo5bbju66` |
| 3 | **B rejected does NOT demote the user while A is active** | **PASS** | `membershipTier = premium` |
| 4 | B stored as `rejected` in PG | **PASS** | `rejected` |
| 5 | After rejecting A as well, user is downgraded | **PASS** | `membershipTier = free` |
| 6 | **Both records remain independently stored in PG** | **PASS** | 2 rows |
| 7 | A and B keep distinct PocketBase identities | **PASS** | `7f1nutctttco0v4`, `qrqsupoo5bbju66` |
| 8 | Both rows reference the same PG user | **PASS** | same `userId` |
| 9 | Per-row transaction data preserved | **PASS** | `H10F-MA,H10F-MB` |

**Multi-subscription: 8/8 passed.** No cascade delete, no demotion from a rejected
sibling while another subscription is active.

---

## 9. User identity verification

`PocketBase user ↔ PostgreSQL User.pocketbaseId`

| Check | Result | Evidence |
|---|---|---|
| Mirror resolves the user by `pocketbaseId` | **PASS** | `subscriptionMirror.js:118` `userRepo.findByPocketbaseId` |
| Lazy user mirror from PB preserved (H5/H7/H8 strategy) | **PASS** | resolution order documented at `subscriptionMirror.js:106` |
| **No fake users invented** | **PASS** | unresolvable user → `user_not_resolved` error, **no row created** (assertion 9.1) |
| Subscription without `user` relation rejected | **PASS** | `subscription-user-missing` (assertion 9.2) |
| **No duplicate PG users** | **PASS** | duplicate `pocketbaseId` query returned 0 groups |
| Multi-subscription rows share one PG user | **PASS** | both A and B reference the same `userId` |
| Orphan prevention is structural | **PASS** | `userId String` is **non-nullable**; FK is `onDelete: Restrict` |

Referential integrity was checked with a real join, not a null-filter:

```sql
SELECT s.id FROM subscriptions s LEFT JOIN users u ON u.id = s."userId" WHERE u.id IS NULL
-- 0 rows
```

**Note on a corrected check:** an earlier cleanup script of mine filtered
`userId: null`, which Prisma rejected — correctly, because the column is non-nullable.
The harness was wrong, not the schema; it was replaced with the join above plus an
explicit schema assertion.

**User identity: PASS.**

---

## 10. H7 regression

H7 (Pooja booking) coverage is executed through the H8 harness, test **O**, which is
where H7 lives. The harness was **not modified or weakened** — verified by SHA-256
before and after (§18, §19).

```
PASS | O. H7: real pooja booking create -> documented pre-existing block
     | create error="Failed to create record."; persisted=0 (0 = pre-existing legacy hook aborts booking create)
PASS | O. H7: booking mirror direct (pooja pre-provided in PG) -> PG booking + TA | api=200 booking=true
```

**H7 regression: PASS.**

- The H7 **booking mirror** works (`api=200`, PG booking + TempleAccount created).
- The H7 **real PocketBase booking create** remains blocked by a **pre-existing** legacy
  hook, documented in the H7 report (§13/§14/§16: PB 0.38 JSVM scope bug, poojas read
  400, 400-but-committed, temple-account hook errors). Root cause is
  `pooja-booking-temple-accounts.pb.js`, which still uses the removed
  `$app.dao()` API. **This file is not part of the H10 changeset** and was deliberately
  left alone (unrelated cleanup is out of scope).

**H10 introduced no new H7 breakage**: the pre-existing failure signature is identical to
the one recorded in `H7_BUILD_FINAL_REPORT.md`.

---

## 11. H8 regression

`.h8-e2e.cjs` executed unmodified. **Result: PASS — 20/20.**

Coverage confirming H10 did not break the donation/payment mirrors:

| Area | Assertions | Result |
|---|---|---|
| Donation create via PB hook → PG | A | **PASS** |
| Donation approve → PG approved + TempleAccount (`ta_<donationId>`, PG id == PB id) | B | **PASS** |
| Donation mirror retry idempotent | C | **PASS** (1 donation, 1 TA) |
| Donation reject → PG rejected, no TA | D | **PASS** |
| Donation receipt fields mirror | E | **PASS** |
| Payment mirror direct → PG mapped | F | **PASS** |
| Payment approved → PG approved + Subscription TA | G | **PASS** |
| Payment rejected → PG rejected, no TA | H | **PASS** |
| Payment retry idempotent | I | **PASS** (1 payment, 1 TA) |
| TempleAccount shape (donation + payment) | K | **PASS** |
| Mirror auth 401/401/200 | L | **PASS** |
| H4 `/auth/me`, `/users`, non-admin 403 | M ×3 | **PASS** |
| H5 `PUT /users/:id/role` dual-write (PG + PB) | N | **PASS** |
| Real payments create — documented pre-existing block | P0 | **PASS** (assertion expected) |
| H7 booking mirror | O | **PASS** |

Notable: the `ta_<donationId>` ID scheme and the H4/H5 user dual-write behaviour are
intact, and the documented pre-existing payment-create block still asserts exactly as
written.

---

## 12. H9 regression

`.h9-e2e.cjs` executed unmodified. **Result: PASS — 32/32.**

Confirms H10 did not break the expense-ledger mirrors, TempleAccount identity, or delete
propagation:

| Area | Assertions | Result |
|---|---|---|
| ExpenseCategory create / update / idempotent | A, B, K | **PASS** |
| Classification create / update / idempotent | C, D, L | **PASS** |
| Expense create / update / idempotent | E, F, M | **PASS** |
| Voucher create / update / idempotent | G, H, N | **PASS** |
| TempleAccount create (`ta_EXP-<id>`) / update / idempotent | I, J, O | **PASS** |
| Lazy category mirror | P | **PASS** |
| Expense without category → 500 (FK safety) | Q | **PASS** |
| Voucher unresolvable expense → `expenseId = null` (SetNull) | R | **PASS** |
| Negative expense amount rejected | S | **PASS** |
| Mirror auth 401/401/200 | T | **PASS** |
| Full field mapping (class / voucherId / desc / billFile) | U | **PASS** |
| TempleAccount split amounts + subscriptionType mapping | V | **PASS** |
| `ta_EXP-<id>` scheme intact; donation TAs still `ta_<donationId>` | W | **PASS** |
| Delete propagation: TA, category, classification, expense + EXP TA, voucher — each idempotent | X, X2, X3, X4, X6 | **PASS** |
| No invented cascade: expense delete alone leaves orphan PB TA | X5 | **PASS** |
| Missing payload → 400 | Y | **PASS** |

H10's `Subscription` model and mirror coexist with the H9 ledger without collision;
`PendingSubscription[]` and the H9 `Subscription`-classified TempleAccounts both resolve.

---

## 13. Prisma validation / migration status

All three commands run from `apps/api` (the `.env` holding `DATABASE_URL` lives there).
Services were stopped first, because a running API holds a lock on the Prisma query
engine (`EPERM ... rename query_engine-windows.dll.node`), which is a known Windows
file-lock, not a schema problem.

| Command | Exit | Actual output |
|---|---|---|
| `npx prisma validate` | **0** | `The schema at prisma\schema.prisma is valid` |
| `npx prisma migrate status` | **0** | `Datasource "db": PostgreSQL database "vinayagar_dev", schema "public" at "localhost:5432"` · `6 migrations found in prisma/migrations` · **`Database schema is up to date!`** |
| `npx prisma generate` | **0** | `Generated Prisma Client (v6.19.3) to ..\..\node_modules\@prisma\client in 428ms` |

**No migration was created**, and none was needed: the only schema change was removing
the client-side `@default(uuid())` from `Subscription.id`, which emits no DDL. The
database is confirmed in sync with the 6 existing migrations.

Existing migration files (all pre-H10, unchanged by H10):

```
20260718145652_initial_schema
20260811054601_pooja_domain_phase1
20260908075233_phase0_checks_and_contact_status
20260908163241_h3_users_auth_contract
20260911111820_h8_donation_mirror
20260922120000_h9_expense_ledger
```

---

## 14. Lint result

| Command | Exit |
|---|---|
| `npm run lint` (root, `concurrently` web + api) | **0** |
| `npm run lint --prefix apps/api` | **0** |
| `npm run lint --prefix apps/web` | **0** |

No errors and no warnings. **No unrelated code was modified to silence anything** — the
H10 changeset introduces no lint suppressions.

---

## 15. Build result

| Command | Exit | Evidence |
|---|---|---|
| `npm run build` (root) | **0** | runs `vite build --outDir ../../dist/apps/web` |
| `npx vite build` (direct) | **0** | `vite v7.3.1` · `3241 modules transformed.` · `built in 35.27s` |

`dist/apps/web` contains **318** asset files. Build completes successfully; no unrelated
code was changed to silence warnings.

---

## 16. Health-check result

PocketBase was started **first**, then the API, with `PB_SUPERUSER_EMAIL` /
`PB_SUPERUSER_PASSWORD` injected as process-level environment variables (required for
the API's admin bootstrap) and `BOOKING_MIRROR_SECRET` / `BOOKING_MIRROR_API_URL`
injected into PocketBase (required for the mirror hooks). Bounded polling, every probe
carried a hard `--max-time`.

```
[boot] PocketBase /api/health = 200 (attempt 1)
[boot] API        /health     = 200 (attempt 1)

PocketBase  http://localhost:8090/api/health -> 200 (curl exit 0)
API         http://localhost:3001/health     -> 200 (curl exit 0)
captured PIDs: 6780,17244
```

**Health: PASS.** Both services reported HTTP 200 in the same invocation in which they
were started.

**Hard stop (required):** every captured PID was terminated, then verified:

```
port 8090 LISTEN holders: none
port 3001 LISTEN holders: none
pocketbase.exe processes remaining: 0
API (node src/main.js) processes remaining: 0
post-stop probe 8090=000  3001=000  (000 = correctly down)
HARD-STOP CLEAN: all verification servers stopped, all ports released
```

No background server was left running.

**Environment caveat:** this sandbox intermittently reaps detached processes *between*
tool invocations — observed repeatedly (clean logs, no crash stacks, ports simply
released). It is an environment artifact, not an application defect. Every functional
result above was therefore captured inside a single invocation that started the service,
waited for health, and ran the assertions. Two early failures caused by this (a
`"Something went wrong."` from an already-stopped PocketBase, and a non-zero
`migrate status` caused by a missing `DATABASE_URL` when run from the repo root) were
diagnosed as such and re-run correctly; neither was a product failure.

---

## 17. Final PostgreSQL counts

Queried directly via Prisma against `vinayagar_dev`, public schema (35 tables):

| Table | Rows |
|---|---|
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

PocketBase totals retained: **18 users, 0 subscriptions**.

`subscriptions = 0` confirms the mirror is runtime-only: every subscription created
during verification was removed by its own probe cleanup. **No historical PocketBase
subscription data was migrated**, exactly as required.

Non-zero rows are pre-existing seed/admin data and H8/H9 harness residue, deliberately
retained (e.g. the 4 `temple_accounts` are H8 donation/payment mirror records; the 8
`expense_categories` include seed categories plus `H9-PROBE-CAT`). **No unrelated
existing data was deleted.**

---

## 18. Cleanup result

Dedicated cleanup verification: **11 passed, 0 failed.**

| Check | Result | Evidence |
|---|---|---|
| No PB user left for probe `h10.v.fail@…` | **PASS** | 0 found |
| No PB user left for probe `h10.v.smoke@…` | **PASS** | 0 found |
| No H10 probe subscription anywhere in PB | **PASS** | 0 found |
| PB probe user total | **PASS** | 0 |
| No PG user left for probe `h10.v.fail@…` | **PASS** | 0 found |
| No PG user left for probe `h10.v.smoke@…` | **PASS** | 0 found |
| No PG user with `h10` in email | **PASS** | 0 found |
| No PG subscription with `H10V` transaction | **PASS** | 0 found |
| `Subscription.userId` non-nullable (blocks orphans structurally) | **PASS** | `userId String @db.VarChar(36)` |
| No PG subscription pointing at a missing user | **PASS** | 0 found |
| No duplicate `pocketbaseId` in PG users | **PASS** | 0 dupes |

Additional counts/cleanup script: **6 passed, 0 failed** — no H10 probe users in PG, no
H10 probe rows in PG subscriptions, no H10 `transactionId` in PG subscriptions, no
orphaned PG subscriptions, no duplicate `pocketbaseId`, and PB totals confirmed (18 users,
0 subscriptions). 5 admin users retained by design.

**Only records created by H10 verification probes were removed.** No unrelated data was
touched.

**Harness note (not a product issue):** the counts script printed all results and
`6 passed, 0 failed`, then aborted during Node teardown with
`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`
(a known Node/libuv Windows shutdown assertion). All assertions had already completed
and passed. Similarly, the failure-isolation script removes its own state file
`apps/api/.h10-fail-state.json` on success — confirmed absent.

---

## 19. Git diff summary

**State during this verification:**

```
$ git status --short
(empty)

$ git status --porcelain
(empty)

$ git diff --stat HEAD
(no unstaged/staged changes to tracked files)

$ git ls-files --others --exclude-standard
none

$ git log --oneline -1 --decorate
18c14d3 (HEAD -> main, origin/main, origin/HEAD) docs(report): add H10 post-build verification report
```

**Important history correction.** At the start of this pass HEAD was `9b5ed08` with the
report staged but uncommitted. During the pass, the repository owner
(`rganesh2100 <rganesh2100@gmail.com>`, 2026-09-30 16:59:03 +0530) committed it:

```
18c14d3  docs(report): add H10 post-build verification report for subscription/membership mirror
parent:  9b5ed08
files :  H10_POST_BUILD_VERIFICATION_REPORT.md | 796 ++++++++++++++++++++++++
```

This commit was **not made by this verification** — no `git commit` was run at any point.
Its parent is exactly `9b5ed08`, so the H10 implementation is intact and linear. The
only tracked-tree change is this report file, which is now tracked and carries this
pass's uncommitted revision.

| Requirement | Verdict | Evidence |
|---|---|---|
| Only intended H10 files changed | **PASS** | 14 files in `9b5ed08`; 1 report file in `18c14d3` |
| No generated junk | **PASS** | `dist/` gitignored; no untracked files |
| No secrets | **PASS** | no hardcoded secret; `apps/api/.env` not tracked |
| No temporary probe files | **PASS** | all harnesses live in `%TEMP%`, none in the repo |
| No accidental migration files | **PASS** | none in the H10 diff |
| No weakened tests | **PASS** | protected harness hashes unchanged (§20) |
| No commit by this verification | **PASS** | tree left clean/unchanged apart from the report |

**On-disk files matching a junk-name pattern:** `apps/api/.h9-api.log` and
`apps/api/.h9-pb.log`. Both are **gitignored** via `.gitignore:26 (*.log)`, predate H10,
and are H9 leftovers — not git pollution and not removed (unrelated cleanup is out of
scope).

---

## 20. Known remaining limitations

All items below are **pre-existing and outside the H10 changeset**. None was introduced
or worsened by H10, and none blocks the GO decision.

1. **Expiry does not demote Premium (behavioural gap, verified not asserted).**
   `deriveUserState` keys membership on `status` alone; the PB `status` select has no
   `expired` value; `subscriptions-auto-dates.pb.js` rewrites dates to
   `today + duration`, making an expired subscription unreachable via the app flow; and
   the intended downgrade cron `subscription-auto-downgrade.pb.js` calls the removed
   `$app.findAllRecords()`, targets mismatched field names, and emits no log output.
   *Recommended future fix (not H10 scope):* make membership status derive from
   `status` **and** `endDate`, and repair the cron to PB 0.38 APIs.

2. **Obsolete PB APIs outside H10.** Zero `$app.dao()` in all 16 active subscription
   hooks. Remaining removed-API usage, all pre-existing and not in the H10 changeset:
   - `$app.dao()` → `pooja-booking-temple-accounts.pb.js` (root cause of the H7
     real-booking-create block)
   - `$app.findAllRecords()` → `subscription-auto-downgrade.pb.js`,
     `subscription-payment-reminder.pb.js`
   - `$app.findRecordByFilter`-family calls → `subscription-receipt-documentation.pb.js`
     and several others

3. **`admin-payments.js` bare-subscription branch returns 500.** `PUT
   /admin-payments/:id/approve` with a bare `subscriptions` id writes unsupported
   `status: 'approved'`. Introduced by `3b3a9bf`, pre-existing. The real
   `pending_subscriptions` approval path returns **200** and is verified working
   (lifecycle Step 6).

4. **Dead branch in `subscription-payment-completed.pb.js`.** An `Approved` status branch
   remains but is inert (unreachable under the current flow). Harmless; left in place
   to avoid unnecessary redesign.

5. **Commit-message mismatch.** `9b5ed08` is titled
   *"docs(agents): replace Start-Process with WMI for detaching daemons"* yet carries the
   entire H10 feature. Flagged for transparency; **not** amended (no commits, no history
   rewriting).

6. **`AGENTS.md` unrelated change bundled into `9b5ed08`.** Windows process-management
   docs; no behavioural impact.

7. **`AGENTS.md` claims "No README exists", but a root `README.md` does exist**, and its
   generated hook listing is **stale** — it still lists
   `diagnostic-subscriptions-analysis.pb.js`, `diagnostic-subscriptions-schema.pb.js`
   and `subscription-diagnostic-query.pb.js`, which H10 deleted. Documentation only; no
   code impact. The only references to those deleted hooks anywhere are this report and
   `README.md` — **no active code references them** (verified).

8. **Pre-existing diagnostic hooks intentionally retained:** `debug-subscription-creation.pb.js`,
   `diagnostic-payments-schema.pb.js`, `diagnostic-queries.pb.js` are tracked from
   `initial commit` / `3b3a9bf`, are **not** H10 artifacts, and were left untouched per
   the "no unrelated cleanup" instruction. H10's own three diagnostic hooks
   (`diagnostic-subscriptions-analysis`, `diagnostic-subscriptions-schema`,
   `subscription-diagnostic-query`) are confirmed **deleted from disk**.

9. **Sandbox process instability.** Detached PocketBase/API processes are intermittently
   reaped between shell invocations. Environment artifact; all results were captured
   with service start, health wait and assertions in a single invocation.

10. **No historical data migration.** By design. PG holds only newly mirrored/created
    records; any pre-existing PocketBase subscriptions predating H10 are not present in
    PostgreSQL and will only appear if touched after deployment.

**Protected-area integrity (SHA-256, verified before and after all runs):**

| File | SHA-256 | Status |
|---|---|---|
| `apps/api/.h8-e2e.cjs` | `20CF4D640A118972FC4D9D299F196480B8FB458ADF087B43F821A25ACF55BE26` | unchanged |
| `apps/api/.h9-e2e.cjs` | `E02B7038362695880E9AB0F7A18136AACF26B66C1A3255A2E9CB969A6F293CDC` | unchanged — matches the baseline recorded in `H9_POST_BUILD_VERIFICATION_REPORT.md` line 56 |

No harness was modified or weakened to obtain a pass.

---

## 21. Final GO/NO-GO decision

# H10 POST-BUILD VERIFICATION: **GO**

Every required gate was executed in this pass and passed against live services:

- Subscription lifecycle **20/20**
- Multi-subscription regression **8/8**
- Mirror suite **44/44** (identity, field contract, update propagation, idempotency, negatives)
- Mirror failure isolation **9/9** (PB unaffected by a dead mirror; converges on recovery)
- Mirror authorization **5/5** (401 / 401 / 200; secret checked before any DB mutation)
- H7 regression **PASS** (booking mirror works; real-PB-create block is pre-existing)
- H8 regression **PASS 20/20**
- H9 regression **PASS 32/32**
- Prisma validate / migrate status / generate **PASS** (6 migrations, database up to date)
- Lint **PASS** (root, api, web — all exit 0)
- Build **PASS** (vite 7.3.1, 3241 modules, 35.27s, 318 assets)
- Health **PASS** (PocketBase 200, API 200; all processes hard-stopped, ports released)
- Cleanup **PASS 11/11** (0 probe rows in PB and PG, 0 orphans, 0 duplicate identities)
- Git audit **PASS** (no product change, no secrets, no junk, no migration, no weakened
  harness, no commit by this verification)

**Why GO is justified:** H10 replaced the *database* while preserving *behaviour*.
PocketBase remains authoritative and app-facing
(`SubscriptionPaymentModal.jsx:136` still calls `pb.collection('subscriptions').create`,
payload and validation unchanged). Identity is exact — the PB record id **is** the
PostgreSQL primary key, so the mirror cannot drift. The upsert is idempotent, the secret
is timing-safe and checked before any mutation, and a total API outage cannot fail a PB
write or fabricate data. H7/H8/H9 regressions are fully green with byte-identical
protected harnesses. The one behavioural gap (expiry does not demote) is a **pre-existing**
product limitation that H10 neither introduced nor is required to fix, and it is recorded
explicitly rather than presented as a pass.

**Recommendation for the next migration step (do not begin it here):** H11 should
**not** start as a new feature. Before or as part of H11, the cheapest high-value work is
to close limitation 1 (membership expiry) and limitation 2 (the two subscription
cron hooks still calling `$app.findAllRecords()`), since both are pre-existing
subscription-lifecycle defects that the PostgreSQL system of record will eventually need
to own. Any PocketBase→PostgreSQL cutover must additionally add a reconciliation job,
because PG is intentionally empty of historical data (§17) and cannot serve reads for
records that predate H10.

**Constraints honoured:** H11 not started · no commit made · no redesign of the
subscription system · no migration of unrelated domains · no historical PocketBase data
migrated · all verification servers hard-stopped, ports 8090/3001 released.
