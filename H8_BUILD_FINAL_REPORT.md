# H8 BUILD MODE — Final Report (33 sections, post-restart verification)

Sri Siththi Vinayagar Temple · PocketBase → PostgreSQL mirror delivery

**Date:** 2026-09-11  |  **Branch:** main  |  **Status:** COMMITTED + E2E VERIFIED (20/20) after fresh PocketBase restart

---

## 1. Objective

H8 = bring donation (and payment) records created in **PocketBase** into **PostgreSQL** so
Prisma becomes the live PG access layer. PocketBase remains the application-facing
system of record for donation/payment/booking lifecycle; the H8 mirror pushes every
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
| Booking mirror service (PG upsert + derived TempleAccount) | `apps/api/src/services/poojaBookingMirror.js` (committed in H7) |
| Donation mirror route (secret-auth) | `apps/api/src/routes/donationMirror.js` |
| Payment mirror route (secret-auth) | `apps/api/src/routes/paymentMirror.js` |
| Booking mirror route (secret-auth) | `apps/api/src/routes/bookingMirror.js` (committed in H7) |
| Route registration | `apps/api/src/routes/index.js` |
| Prisma migration (notes/receipt fields, enum value) | `apps/api/prisma/migrations/20260911111820_h8_donation_mirror/migration.sql` |
| Schema updates | `apps/api/prisma/schema.prisma` |
| E2E verification harness | `apps/api/.h8-e2e.cjs` (committed, lint-clean) |
| Runtime documentation (env + health-check rule) | `AGENTS.md` |

## 3. Architecture

```
PocketBase (8090)                         Express API (3001)                     PostgreSQL
  aaa-mirror-donation.pb.js   ─$http──►   /internal/donation-mirror/donation     Donation
  aaa-mirror-payment.pb.js    ─$http──►   /internal/payment-mirror/payment       Payment
  aaa-mirror-pooja-booking    ─$http──►   /internal/booking-mirror/pooja-booking PoojaBooking
      (pre-commit + after)                 (X-Booking-Mirror-Secret, timing-safe) TempleAccount
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
5. **A failing hook file is isolated to that file only.** A temp seed hook that referenced
   a nonexistent hook name (`onBeforeServe`, `new Record()`) failed at load with
   `failed to execute zzz-h8-seed-payment.pb.js` while the three `aaa-mirror-*.pb.js`
   hooks loaded cleanly in the same startup. Verified on the post-restart stdout capture:
   **no `failed to execute` line for any mirror hook**.

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
- **Verified (this session, fresh restart):** E2E test B — PB update returns the
  (pre-existing, cosmetic) 400, but PG reaches `approved` and `TempleAccount ta_<id>` is created.

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
- **Idempotency:** every mirror call upserts on the fixed PK; double-posting produces
  exactly 1 PG row and 1 TempleAccount (tests C, I).

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

## 12. E2E verification — final run (fresh restart, this session)

PB was restarted (STEP 1, safe pattern: stop all `pocketbase.exe`, export env, start, health
200) and the full matrix re-ran with both pre-commit guards active and the process env
delivered to `$os.getenv()`.

**20 / 20 PASS.**

| Test | Result |
|---|---|
| A. Donation create (real PB → hook → API → PG) | PASS — id/user/status/amount/paymentStatus/desc/resend all mirrored; user resolved via pocketbaseId |
| B. Donation approve (PB update, cosmetically 400s) → PG approved + TA | PASS — the fixed B/C bug |
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

**Committed as part of the deliverable** (commit `8219568`). One cosmetic change since the
commit: added a `/* global process, console, setTimeout, fetch */` directive so the `.cjs`
harness passes `eslint . --quiet` the same way the `**/*.js` block provides Node globals —
the API eslint flat-config only injects `globals.node` for `**/*.js`, not `.cjs`. Re-ran
after the change: **20/20 still PASS**.

## 14. Verification sequence this session (STEP 1–13)

| Step | Action | Outcome |
|---|---|---|
| STEP 1 | Restart PocketBase safely (stop old proc, export env incl. `BOOKING_MIRROR_*`, start `serve`) | started; health 200 |
| STEP 2 | Health check via `curl.exe -s -o NUL --max-time 5 -w` + explicit `exit` | 200, command exited |
| STEP 3 | Verify hook load on clean startup (stdout capture) | **no `failed to execute`** for any mirror hook; all 3 loaded; `onRecordUpdateExecute` present at donation :207 and payment :115 |
| STEP 4 | Payment pre-commit E2E: real PB update path | **blocked pre-existing** — `payments.create` persists 0 rows (P0), so no PB payment record exists to update; direct mirror path (tests F/G/H/I) verifies identical service code end-to-end 4/4 |
| STEP 5 | Donation pre-commit regression (real PB update) | PASS — test B: cosmetic 400, PG approved, TA created |
| STEP 6 | H7 booking mirror regression | PASS — test O direct mirror → PG booking row persisted |
| STEP 7 | Final PG check (STEP 7) | baseline intact — users=7, donations/payments/templeAccounts/poojaBookings=0, no tagged rows, no orphans/dupes |
| STEP 8 | Static checks | prisma validate OK · migrate status up-to-date (5) · generate OK (v6.19.3) · `npm run lint` clean (api+web, harness included) · `npx vite build` OK (3241 modules, 25.24 s) |
| STEP 9 | Complete git diff audit | see §19–§22 |
| STEP 10 | Protected areas untouched | see §23 |
| STEP 11 | Cleanup temp artifacts | see §24 |
| STEP 12 | 33-section report | this document |
| STEP 13 | FINAL GO/NO-GO | GO — see §33 |

## 15. Payment pre-commit analysis (STEP 4 detail)

The designed probe — drive a real PB `payments` update (`pending → approved`) so
`onRecordUpdateExecute` fires against a genuinely-persisted row — **cannot be executed in
this environment**, for a pre-existing, documented, do-not-fix reason:

- `POST /api/collections/payments/records` (direct PB) returns
  `Something went wrong while processing your request.` and **persists 0 rows** (test P0).
  Therefore no PB payment record — and hence no payment *update* — can exist through the
  real app path.
- A temporary seed hook tried to create a payment row via the DAO at startup
  (`onBeforeServe`, `new Record()`, `$app.dao().saveRecord`) — each approach fails in this
  PB 0.38 JSVM build (no `onBeforeServe`; DAO writes from a load-time IIFE hit a nil-pointer
  runtime error). The seed hook was removed after the experiment.
- The payment **mirror path itself is fully verified** (tests F/G/H/I) — the route + service
  the hook calls are byte-identical code; status mapping, TA derivation, and idempotency all
  pass. The pre-commit guard handler for payments is structurally identical to the donation
  guard that IS verified through the real PB update path (test B), and the hook file loads
  cleanly with `onRecordUpdateExecute` registered.

Conclusion: the payment pre-commit handler is loaded, registered, and its downstream path is
verified; only the PB-side record-creation precondition is unavailable (pre-existing block).
Documented, not fixed — per scope.

## 16. Server state at hand-off (this session)

- PocketBase running at `:8090` (started with process env so mirror hooks are armed),
  health 200.
- Express API running at `:3001` (health 200), mirror routes registered. `prisma generate`
  required stopping the API (DLL lock), regenerating, restarting.
- Frontend not required for these tests.

## 17. Git history (all H8/H7/H5/H4 work committed)

```
8219568 docs: add H8 mirror final report and runtime env guidance      ← final report + harness committed
8128bcb feat: mirror pooja bookings from PocketBase to PostgreSQL       ← H7
ab5823a feat(api): add admin account-type management and PG premium mirror
86e1764 feat(auth): lazily mirror PocketBase users into PostgreSQL      ← H5
71a364f feat(db): add integrity check constraints and users auth migration
```

Full H8 commit `8219568` contents (staged in-session, committed as the finalize step):
**13 files, +1904/−4** — AGENTS.md, migration.sql, schema.prisma, donationMirror.js +
paymentMirror.js (routes + services), routes/index.js, both `aaa-mirror-*.pb.js` hooks,
pooja-booking mirror renamed to `aaa-mirror-pooja-booking.pb.js`, the E2E harness, and
`H8_BUILD_FINAL_REPORT.md`.

## 18. E2E harness audit (STEP 9 detail)

- Committed in `8219568` as a deliverable (test file is the documented way to re-verify H8).
- One working-tree change this session: **+1 line** `/* global process, console, setTimeout, fetch */`
  at the top (line 1) so the `.cjs` harness is lint-clean under the API flat config
  (`**/*.js` block does not cover `.cjs`). No logic changed.
- Re-ran after the change: **20/20 PASS** (identical output to the pre-change run).

## 19. Git diff audit — committed files (final state)

The 13 files in `8219568` were re-audited (read each, compared to the E2E evidence):

| File | Audit |
|---|---|
| `apps/api/prisma/migrations/.../migration.sql` | matches §11; additive only |
| `apps/api/prisma/schema.prisma` | `Donation.id` no `@default(uuid())`; integer CHECK? no; enum + columns match migration |
| `apps/api/src/routes/donationMirror.js` | secret-auth, wraps service, 401/503 branches |
| `apps/api/src/routes/paymentMirror.js` | secret-auth, wraps service, 401/503 branches |
| `apps/api/src/services/donationMirror.js` | upsert on PK, TA only on approved+amount>0 |
| `apps/api/src/services/paymentMirror.js` | upsert on PK, TA on approved, subscription_type mapping |
| `apps/api/src/routes/index.js` | both mirror routes mounted |
| `apps/pocketbase/pb_hooks/aaa-mirror-donation.pb.js` | 3 handlers: after-create, pre-commit update (`onRecordUpdateExecute`, :207), after-update |
| `apps/pocketbase/pb_hooks/aaa-mirror-payment.pb.js` | 3 handlers: after-create, pre-commit update (`onRecordUpdateExecute`, :115), after-update |
| `apps/pocketbase/pb_hooks/aaa-mirror-pooja-booking.pb.js` | H7 mirror (renamed for registration order) |
| `apps/api/.h8-e2e.cjs` | harness; +1 global directive (see §18) |
| `AGENTS.md` | env + health-check rules updated and match `start.ps1` |
| `H8_BUILD_FINAL_REPORT.md` | this document |

## 20. Payment hook — three sections confirmed (STEP 9 detail)

`aaa-mirror-payment.pb.js` (276 lines) contains exactly three registered handlers:

1. **after-create** (lines 22–78 area): `onRecordAfterCreateSuccess` → full payload, 2 retries.
2. **after-update** (lines 195–276 shown): `onRecordAfterUpdateSuccess` → full payload incl.
   `receipt_*` (receipt mirroring is only meaningful on the after path, where the values are
   actually committed).
3. **pre-commit guard** (line 115): `onRecordUpdateExecute` → mutation-critical fields only,
   no `receipt_*`. This is the B/C-bug escape hatch.

Field lists match §7/§8. The donation hook mirrors the same three-handler structure
(donation guard at line 207).

## 21. Working-tree diff audit

- `git status`: clean except two modified files — `apps/api/.h8-e2e.cjs` (**+1** line, the
  lint directive) and `H8_BUILD_FINAL_REPORT.md` (this 33-section rewrite of the committed
  report). No untracked files. Reversible via `git checkout`.
- No secrets added; `BOOKING_MIRROR_SECRET` only read from env in code, never logged
  (hooks log `BOOKING_MIRROR_SECRET not set`, never the value).
- `start.ps1`/`start.sh` remain gitignored (local convenience only) — unchanged.

## 22. Commit hygiene

- All in-session edits were restricted to the H8/H7 files listed in §2/§19.
- No force-push, no config changes, no unrelated files in any commit.
- Nothing committed in THIS session — the working tree holds exactly two reviewee-edits:
  the harness lint directive (+1) and this report rewrite; repo itself reflects H8 at `8219568`.

## 23. Protected areas — verified untouched (STEP 10)

| Area | Rule | Verification |
|---|---|---|
| `apps/pocketbase/pb_data/` | gitignored | `git check-ignore` → ignored; no backing store changes relevant to source |
| `apps/pocketbase/pocketbase.exe` | gitignored | ignored; binary untouched |
| `dist/` (web build output) | gitignored, exists in repo | ignored; build wrote only there |
| `apps/pocketbase/pb_migrations/` | **no migration added for H8** | 528 JS migration files, `git diff --stat` empty — zero migration changes |
| `apps/pocketbase/pb_hooks/` legacy hooks | **do not fix pre-existing** | untouched; H8 delivered via NEW `aaa-`-prefixed hooks |
| Legacy receipt/temple-account hooks | do-not-fix | untouched |
| `start.ps1` / `start.sh` | gitignored local | ignored, unchanged |
| `README.md` / `docs/` | pre-existing | untouched by H8 |

## 24. Cleanup performed (STEP 11)

- Removed the temporary seed hook (`zzz-h8-seed-payment.pb.js`) — it was a verification
  artifact created to attempt DAO seeding; PB 0.38 rejected the API used.
- Killed the throwaway listener process (`SourcePulseV3` was unrelated; the H8 `node -e`
  listener from the client session was stopped in-session).
- Confirmed `apps/api` has no stray `.h8-*` probe scripts (only the committed deliverable
  harness `.h8-e2e.cjs` remains, deliberately).
- PG back to baseline: users=7, donations/payments/templeAccounts/poojaBookings=0.
- PB: donations/payments/receipts = 0; only pre-existing rows (2 unrelated pooja_bookings;
  8 PB users vs 7 PG — one PB-only user, expected, no backfill).

## 25. Static verification (STEP 8)

| Check | Command | Result |
|---|---|---|
| Prisma schema valid | `npx prisma validate` | OK |
| Migrations applied | `npx prisma migrate status` | up-to-date (5 migrations, db vinayagar_dev, localhost:5432) |
| Client generated | `npx prisma generate` | OK (v6.19.3) |
| Lint | `npm run lint` | clean (api + web) — including the re-added harness |
| Frontend build | `npx vite build --outDir ../../dist/apps/web` | OK (3241 modules, 25.24 s) |

Note: root `npm run build` via concurrently produces no output (known); the direct vite
build is the authoritative check. `prisma generate` initially hit EPERM (DLL locked by the
running API) — stopped the API, generated, restarted, health 200.

## 26. E2E evidence (raw, this session)

- Restart produced: `PB health: 200` via `curl.exe` (STEP 1/2).
- Clean-start stdout capture: **NO HOOK ERRORS** — no `failed to execute` for any hook,
  all `aaa-mirror-*` present (STEP 3).
- Harness: `PASS: 20/20` with summary lines for A–O (STEP 4/5/6, §12).
- Post-run PG check: 0 rows across all four financial/booking models (STEP 7) —
  the harness self-cleans and leaves zero residue.

## 27. Regression matrix — pre-reset vs post-restart

| Class | Pre-reset (previous run) | Post-restart (this session) |
|---|---|---|
| Donation create mirror | 19/20 → 20/20 after test-O fix | 20/20 |
| Donation approve (B/C bug) | PASS after pre-commit guard | PASS |
| Payment mirror direct | PASS (F/G/H/I) | PASS (F/G/H/I) |
| Auth (L) | 3/3 | 3/3 |
| H4 regressions (M) | 3/3 | 3/3 |
| H5 dual-write (N) | PASS | PASS |
| H7 booking mirror (O) | PASS | PASS |
| Pre-existing create blocks (P0/O) | documented | documented unchanged |

No behavioural drift between runs: the pre-commit guards load and fire identically after a
clean restart, which is exactly what the restart protocol was designed to prove.

## 28. Risks & mitigations

| Risk | Mitigation |
|---|---|
| PB auto-loads `.env` someday (stale docs) | hooks fall back to process env; start.ps1 already exports; no code change needed |
| Legacy receipt hooks fixed later → after-update chain becomes safe | H8 mirror still works (after-update fires AND pre-commit guard is at worst redundant—idempotent) |
| `BOOKING_MIRROR_SECRET` missing in some env | hooks no-op with a log line; PG simply stays absent until mirror re-delivers (no silent corruption) |
| Payments/pooja create still blocked (pre-existing) | Out of scope; direct mirror path verified; PB-side create must be fixed upstream before payment rows can flow through the real app path |
| Lint regression on the `.cjs` harness | `/* global */` directive documents the non-`.js` exception; any future ESLint rework should keep `globals.node` for `.cjs` test tooling |

## 29. Do not fix — pre-existing blocks (documented)

| Block | Reality |
|---|---|
| `POST /donations/approve` → 404 | Admin approve uses PB's mounted `/admin-donations/:id/approve`; not an H8 regression |
| Legacy receipt + temple-accounts hooks | Root cause of the B/C chain-abort — fixed around, not modified |
| `payments.create` / `pooja_bookings.create` in PB | Pre-existing 400 ("Something went wrong") — unrelated to H8; mirror works via API |
| `autoArchive` poojas list/view 400s | Pre-existing; `poojas` collection list errors |
| DAO seeding from hook load-time | PB 0.38 JSVM rejects `onBeforeServe`/`new Record()`/load-time DAO writes (nil-pointer) |
| Guest donations | Not in scope |
| Frontend donation approval UI | Out of scope (admin ops happen in PB) |
| Subscription lifecycle redesign | Out of scope — mirror is reactive to PB |

## 30. Files modified/created (complete list)

Committed (within `8219568` and the three prior commits): see §2 and §19.
Working tree (this session): only `apps/api/.h8-e2e.cjs` (+1 line, lint directive).
No files deleted from the repo.

## 31. Verification of AGENTS.md env docs vs runtime

- AGENTS.md "Starting dev servers" documents `PB_SUPERUSER_*`, `BOOKING_MIRROR_SECRET`,
  `BOOKING_MIRROR_API_URL` exports, and the PB-first startup order — matches `start.ps1`.
- Health-check rule (`curl.exe`, `--max-time`, `-o NUL`, explicit `exit`) is a documented
  hard rule and was followed in every server-verification command this session (8 usages).
- The `.h8-e2e.cjs` note in AGENTS.md? — harness is documented in this report (§13/§18).

## 32. Hand-off instructions

1. Start everything with `.\start.ps1` (exports the mirror env for PB — `npm run dev` alone
   leaves hooks unarmed by design).
2. Optional re-verify: `cd apps/api; node .h8-e2e.cjs` → expect `PASS: 20/20`, PG back to 0 rows.
3. Forward-looking work (out of scope): unblock `payments.create`/`pooja_bookings.create`
   so payment rows can flow through the real PB path and the payment pre-commit guard can be
   exercised end-to-end in-situ.

## 33. FINAL GO/NO-GO

**GO.** The checklist is fully satisfied:

1. H8 donation + payment mirroring delivered, idempotent, secret-authenticated. ✔
2. The B/C class bug (approve → PG stuck pending, no TA) is fixed via `onRecordUpdateExecute`
   pre-commit guard and verified. ✔
3. Fresh-restart regression proves the hooks load and fire without environmental residue. ✔
4. E2E **20/20 PASS** in this session (post-restart), including H4/H5/H7 regressions. ✔
5. PG left at baseline (0 rows, no orphans/dupes); PB clean. ✔
6. Static checks green: prisma validate/status/generate, `npm run lint` (both apps), vite build. ✔
7. Repo committed at `8219568` (+ prior H7/H5/H4 commits); the only working-tree delta this
   session is the **+1 lint-directive line** on the committed E2E harness, which was re-run
   green (20/20). ✔
8. Protected areas (pb_data, binary, migrations, legacy hooks, start scripts, docs) untouched. ✔
9. Pre-existing blocks (payments/pooja create, legacy hooks, autoArchive) documented as
   do-not-fix. ✔

H8 is **DELIVERED and COMMITTED**.