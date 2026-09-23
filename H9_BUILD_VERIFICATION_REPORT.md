# H9 POST-BUILD VERIFICATION REPORT — REMEDIATION

Verifier: independent post-build verification against the H9 remediation build.
Date: 2026-09-23. Scope: H9 Expense & Financial Ledger mirror (expense_categories, classifications, expenses, temple_accounts, vouchers) + mandatory donation-temple_accounts integration.
Result: **GO**

---

## How verification was performed

- Independent harness `apps/api/h9-repro.cjs` (temporary, deleted after use) exercising the **real PB app path** for the donation-approve scenario: PB donation create → PB update (approve) → PB pre-commit hook → API → PG.
- Re-run of the **protected** `.h8-e2e.cjs` regression harness (byte-identical, SHA256 `208D09CC98352960E292EEB0EF84AD33E44F41F78F4541CF7C6A5EC1E0A60E4A`): **20/20 PASS**.
- Re-run of the **build harness** `.h9-e2e.cjs` (remediation build): **32/32 PASS**.
- Independent read-only audits of every changed source file, DB integrity, git state, and protected areas.

---

## 14-section results

### §1 Original failures (from the NO-GO report, 2026-09-22)
The prior `H9_POST_BUILD_VERIFICATION_REPORT.md` returned **NO-GO** with three root causes:

1. **Mandatory donation duplicate test FAILED.** The legacy `donation-temple-accounts.pb.js` hook ran `after-update`, read `donation.get("user_id")` (null under the live `user` relation field), failed validation and was swallowed → **no PB temple_accounts row** was created. Meanwhile the old H8 `donationMirror.js` STEP-4 writer was still creating a derived `ta_<donationId>` row in PG — the exact duplicate condition §5 required to be removed.
2. **Delete propagation FAILED.** `aaa-mirror-expense-ledger.pb.js` had create/update handlers only; deleting a PB expense/temple_accounts row left the PG rows behind.
3. **Lint not fully clean.** One pre-existing `no-unused-vars` error in `apps/api/.h9-e2e.cjs:412` (the `.cjs` harness fell outside the ESLint override block for `**/*.js`).

### §2 Remediation applied (all four fixes)

| Fix | Change | Status |
|---|---|---|
| **Fix 1** | `apps/api/src/services/donationMirror.js` — derived STEP-4 `ta_<donationId>` write removed + header noting the hand-off to the corrected PB hook. | Applied |
| **Fix 1b** | `apps/pocketbase/pb_hooks/donation-temple-accounts.pb.js` → **renamed** `aaa-donation-temple-accounts.pb.js` and **fully rewritten** to pre-commit execute hooks (`onRecordCreateExecute` / `onRecordUpdateExecute`), fully inlined per PB 0.38 JSVM rules, duplicate-guarded, gated on `status==="approved"` AND `amount>0`. | Applied |
| **Fix 2** | `apps/pocketbase/pb_hooks/aaa-mirror-expense-ledger.pb.js` — 5 new `onRecordAfterDeleteSuccess` handlers (expense_categories, classifications, expenses, temple_accounts, vouchers) with result-code-safe delete logic. | Applied |
| **Fix 2b** | `apps/api/src/services/expenseMirror.js` + `apps/api/src/routes/expenseMirror.js` — idempotent per-collection PG delete functions + 5 secret-gated DELETE routes (`/internal/expense-mirror/:collection/delete`). | Applied |
| **Fix 3** | `apps/api/.h9-e2e.cjs` — lint fix (removed unused `ta` binding), new delete tests X2–X6, W text updated. | Applied |

### §3 Fix 1b — why after-update was unreliable (root cause, verified live)
Proven empirically during this session:
- `donation-receipt-generation.pb.js` calls `$app.save()` inside `onRecordAfterUpdateSuccess` on pending→approve; this **aborts the entire after-update hook chain to the client** (the record still commits). Later-registered after-update handlers (including `aaa-mirror-donation`'s after-update mirror) are **skipped**. Verified: after-update mirrors never fired on approve; only the pre-commit mirror logged.
- PB 0.38 JSVM constraints applied: hook callbacks do NOT see top-level functions (all logic physically inlined); `$app.dao()` is not available in execute hooks (use `$app.save(record)`); `new Record()` requires a collection; `toLocaleString("en-US",{month:"long"})` returns a full date string in JSVM (replaced with an inline month-name array indexed by `getMonth()`).
- Result: the corrected hook creates the PB temple_accounts row **before commit**, idempotently (guarded by `findFirstRecordByFilter("temple_accounts","transaction_id = {:txId}", …)`), with `member_name`, `amount`, `category`, `date`, `month`, `year`, `transaction_id` and `classification="Donation"`.

### §4 Mandatory donation duplicate test — **PASS**
Procedure: create a donor user + pending donation (live schema: `user` relation, `status`, `payment_status`, `amount`), then approve via PB update, then verify PG.

Observed (repro `h9-repro.cjs`, mirror env armed):
- PB donation exists, status `approved`. ✓
- **PB temple_accounts record exists** with `transaction_id = <donationId>`, `classification = Donation`, `amount = 250`, `month = September`, `year = 2026`. ✓ (created by the corrected `aaa-donation-temple-accounts.pb.js`)
- H9 mirror carries the PB temple_accounts row into PG exactly once. ✓
- PG contains **exactly one** row, id `ta_<donationId>`, amount 250, `classification='Donation'`, `month='September'`, `year=2026`, `transactionId=<donationId>`, `category='General'`. ✓
- **NO derived duplicate: PASS** — the old `donationMirror.js` STEP-4 writer is removed (Fix 1), so PG no longer gains an un-mirrored derived row.
- PG donation approved (status/payment_status transitioned by the existing H8 flow). ✓

**Verdict: PASS** on every mandatory criterion from the prior report.

### §5 Delete propagation (H9 collections) — **PASS**
- H9 E2E tests **X, X2, X3, X4, X5, X6** now assert: PB delete of an expense/expense_category/classification/voucher/temple_accounts row propagates a DELETE to PG → PG row removed. Repeated DELETE is idempotent (no error, no change). 
- Verified for all five collections: `expense_categories`, `classifications`, `expenses`, `vouchers`, `temple_accounts`. Deletion is secret-gated (same `X-Booking-Mirror-Secret`, timing-safe) and never removes the mirror record without the PB delete.

**Verdict: PASS** (was FAIL in the prior report).

### §6 Mirror security — **PASS**
- Missing secret → 401; wrong secret → 401; correct secret → 200 + delete/idempotent success. WARN log "Rejected request without a valid mirror secret" — the secret value is never logged. Verify-repeat: correct-secret repeat DELETE returns 200, row absent. **Verdict: PASS.**

### §7 Idempotency — **PASS**
- Repeat create, repeated update, 2 direct mirror POSTs on the same id → exactly 1 PG row (all 5 collections, tests K–O).
- Repeat DELETE → no crash, no duplicate creation, row stays deleted. **Verdict: PASS.**

### §8 Regression — **PASS**
- `.h8-e2e.cjs` re-run: **20/20 PASS**, including donation create/approve/reject/receipt (test B now asserts PG approved **and** `ta_<donationId>` with class=Donation, cat=General, month=September), payments pending/approved/rejected + idempotent retry, subscription TA, H4 auth/me + users RBAC, H5 role dual-write, H7 pooja booking mirror-direct; documented pre-existing blocks P0/O confirmed unchanged.
- `.h9-e2e.cjs` (build harness): **32/32 PASS** (A–Y + delete tests X2–X6).
- **Verdict: PASS.**

### §9 Static verification — **PASS**
- `npm run lint` (root, web + api): **clean** (exit 0). The prior `apps/api/.h9-e2e.cjs:412` lint error is fixed (Fix 3).
- `npx prisma validate` → OK. `npx prisma migrate status` → up to date.
- `npm run build` (vite → `dist/apps/web`): exit 0; `index.html` rebuilt (timestamp refreshed).
- **Verdict: PASS** (was PARTIAL-PASS in the prior report).

### §10 Clean restart + repeat + logs — **PASS**
- Stopped both servers; restarted PocketBase (health 200) then API (health 200); re-ran a full mirror op end-to-end (expense_categories + expenses + temple_accounts + update) → PG mirrored correctly, idempotent.
- Captured API + PB logs during the repeat run: **no hook errors, no prisma errors, no auth failures (401s are the intentional auth probes), no duplicate rows.** PB console (tee'd to a temp log, since deleted) showed the corrected donation hook loading and the pre-commit TA creation. **Verdict: PASS.**

### §11 Protected-area audit — **PASS**
- `apps/pocketbase/pb_migrations/`: zero changes (git status clean for that dir).
- H7/H8 hooks (`aaa-mirror-donation.pb.js`, `aaa-mirror-booking.pb.js`, etc.) and legacy `donation-receipt-generation.pb.js`: untouched.
- `.h8-e2e.cjs`: byte-identical (SHA256 `208D09CC…`).
- `apps/web/**`, `schema.prisma`, `start.ps1`/`start.sh`, `AGENTS.md`: untouched.
- `donationMirror.js` STEP-4: **removed** (that was the required Fix 1 change), with the header updated to explain the hand-off.
- **Verdict: PASS.**

### §12 DB integrity audit — **PASS**
- Post-test PG state: `temple_accounts` **0 rows** after harness self-clean (all tagged rows removed); `donations`/`users` leftovers from the repro cleaned by the harness and manual cleanup; remaining `.local` users are the two pre-existing historical build-verification users (`H9VER@…`, `H9B@…`) — not created this session.
- No orphaned test rows in any of the 5 H9 collections. `pg_constraint` audit unchanged (only the documented `temple_accounts_amount_nonnegative_check` dropped in the H9 migration). **Verdict: PASS.**

### §13 Git audit (classify every change) — **PASS**
Working tree (7 changes, all required):
- `apps/api/.h9-e2e.cjs` — modified (Fix 3).
- `apps/api/src/services/donationMirror.js` — modified (Fix 1).
- `apps/api/src/services/expenseMirror.js` — modified (Fix 2b).
- `apps/api/src/routes/expenseMirror.js` — modified (Fix 2b).
- `apps/pocketbase/pb_hooks/aaa-mirror-expense-ledger.pb.js` — modified (Fix 2).
- `apps/pocketbase/pb_hooks/donation-temple-accounts.pb.js` — deleted.
- `apps/pocketbase/pb_hooks/aaa-donation-temple-accounts.pb.js` — added (Fix 1b).

No unexpected/out-of-scope files; no formatting artifacts. **Verdict: PASS.**

### §14 FINAL GO/NO-GO
**GO** — every prior NO-GO finding is remediated and re-verified end-to-end:

1. **Donation duplicate test PASSES.** PB temple_accounts row is now created by the corrected pre-commit hook; the PG `ta_<donationId>` row mirrors it exactly once; the old derived STEP-4 write is removed.
2. **Delete propagation PASSES.** All 5 H9 collections now propagate PB deletes to PG, idempotently and secret-authenticated (tests X, X2–X6).
3. **Lint is clean.** Root `npm run lint` exits 0; web + api both clean.

Supporting: H8 20/20 + H9 32/32 · prisma validate/status green · build green · clean restart + repeat verified · DB integrity clean · protected areas untouched.

---

## Passed sections (summary)
§1 remediation · §2 four fixes applied · §3 root-cause fix (pre-commit execute hooks) · §4 mandatory donation test PASS · §5 delete propagation PASS · §6 security PASS · §7 idempotency PASS · §8 regression (H8 20/20, H9 32/32) PASS · §9 static PASS · §10 restart/log PASS · §11 protected-area PASS · §12 DB integrity PASS · §13 git-scope PASS.

**H9 remediation is DELIVERED and E2E-VERIFIED.** Working tree contains only the 7 intended changes (uncommitted — commit is at the user's discretion).