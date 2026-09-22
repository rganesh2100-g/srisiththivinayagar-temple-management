# H9 POST-BUILD VERIFICATION REPORT

Verifier: strict independent post-build verification (read-only vs. H9 implementation).
Date: 2026-09-22. Scope: H9 Expense & Financial Ledger mirror (expense_categories, classifications, expenses, temple_accounts, vouchers).
Result: **NO-GO**

---

## How verification was performed

- Independent harness `apps/api/.h9-verify.cjs` (tests A–E) exercising the **real PB app path** (PB record create/update → PB hook → API → PG) plus direct API probes and DB constraint audits. Harness was temporary and has been deleted after use.
- Independent read-only audits of every H9 source file, the applied migration, and git state.
- H8 regression harness `.h8-e2e.cjs` (byte-identical, checksum `208D09CC98352960E292EEB0EF84AD33E44F41F78F4541CF7C6A5EC1E0A60E4A`) re-run in verification mode: **20/20 PASS**.
- Application behavior was NOT modified during verification. Temp mirror/cleanup scripts removed afterwards.

---

## 14-section results

### §1 Implementation audit (H9 scope + protected areas)
- H9 hook `aaa-mirror-expense-ledger.pb.js`: 769 lines, 10 inline create/update callbacks (expense_categories, classifications, expenses, temple_accounts, vouchers). **Only create/update — no delete handlers.**
- Route `src/routes/expenseMirror.js`: 5 POST endpoints under `/internal/expense-mirror/*`, `timingSafeEqual` secret gate.
- Service `src/services/expenseMirror.js`: 5 mirror functions; deterministic PG ids `ta_EXP-<PBexpenseId>` / `ta_<transactionId>` / fallback `ta_pb_<pbId>`; lazy `ensurePgExpenseCategory` / `ensurePgExpense`.
- Repos: 3 new + updated `TempleAccountRepository` + `repositories/index.js`. Migration drops **only** `temple_accounts_amount_nonnegative_check`.
- **Verdict: PASS for H9 internal scope.** No H9 source touches legacy code.

### §2 DB verification
- `npx prisma validate` → OK. `prisma migrate status` → 6 migrations, up to date.
- Constraint audit: `temple_accounts` now has **zero** CHECK constraints; `expenses_amount_minimum_check` (>=0.01), `expenses_quantity_nonnegative_check`, `vouchers_amount_nonnegative_check` retained; expense_categories/classifications have none. No unrelated CHECK removed.
- Column types verified: `temple_accounts.id` VARCHAR(36), amount numeric, etc. — compatible with PB ids and derived ids.
- **Verdict: PASS** (migration drops exactly the one documented constraint).

### §3 Mirror create/update/delete (5 collections)
- Create/update verified via real PB path for all five: expense_categories (desc v1→v2), expenses (100→200 + description), temple_accounts (−100→−300 + notes), classifications (desc v0→v2), vouchers (120→150 + description). Each produced exactly **1** PG row (idempotent, no duplicates).
- **Delete propagation: FAIL (see §7).**
- **Verdict: PARTIAL-PASS** (create+update pass; delete FAIL).

### §4 Negative expense ledger
- Real PB path: expense created (category select `General`), then PB temple_accounts row `amount=-5000`; PG mirrored `ta_EXP-<expenseId>` with `amount=-5000`. Positive + negative amounts both accepted (CHECK dropped as designed).
- **Verdict: PASS.**

### §5 MANDATORY donation duplicate test — **FAIL**
Procedure: create `H9VER donor` user + pending donation (live schema requires `user:[<id>]`, `payment_status`), then approve via PB update.

Observed:
- PB donation exists, status `approved` ✓
- **PB temple_accounts record exists: NO — 0 rows with `transaction_id=<donationId>`.** The legacy `donation-temple-accounts.pb.js` hook reads `donation.get("user_id")`, which is null under the live schema field `user`; its `saveRecord` fails validation and is swallowed. (Pre-existing condition, documented; H9 does not create PB-side rows by design.)
- **H9 mirrors the actual PB temple_accounts record: cannot — there is no PB row to mirror.**
- PG contains exactly one row, id `ta_<donationId>` amount 250, `classification='Donation'`.
- **PG TempleAccount ID = PB TempleAccount ID: FAIL** (no PB TA row exists; and the H9 id scheme is derived `ta_*` / `ta_pb_*`, not the raw PB record id).
- **NO `ta_<donationId>` derived duplicate: FAIL** — the sole PG row IS `ta_<donationId>`.
- **Old H8 donationMirror-derived write no longer executing: FAIL** — it IS still executing. Proof: PB had **0** temple_accounts rows, yet PG gained `ta_<donationId>` with `classification='Donation'` (STEP-4 signature at `donationMirror.js:197-210`). The row was written by donationMirror STEP-4, not by the H9 mirror.

Also note: `<donationId>` used for the id check is the PB donation id; `PG id == ta_<donationId>` resolved `true` in the run, confirming the derived id is present in PG.

**Verdict: FAIL** on the mandatory criteria (PB TA exists; H9 mirrors it; PG id = PB id; no derived duplicate; old derived write no longer executing).

### §6 Idempotency
- Repeat create + repeated update + 2 direct mirror POSTs → 1 PG row throughout. **Verdict: PASS.**

### §7 DELETE PROPAGATION — **FAIL**
- Delete a controlled expense in PB (expense deleted twice — no crash, no duplicate creation) and its PB temple_accounts row.
- PG results after deletion: **PG expense row REMAINS, PG `ta_EXP-<expenseId>` row REMAINS.**
- Root cause: H9 hook `aaa-mirror-expense-ledger.pb.js` implements **create/update only — no `onRecordAfterDeleteSuccess` handlers**. This was a documented H7/H8/H9 design decision (see `.h9-e2e.cjs` test X), but the §7 requirement "PG expense deleted; PG corresponding EXP-<expenseId> TempleAccount deleted" is **not met**.
- **Verdict: FAIL.**

### §8 Mirror security
- Missing secret → 401; wrong secret → 401; correct secret → 200 + PG row created. WARN log "Rejected request without a valid mirror secret" — the secret value is never logged. **Verdict: PASS.**

### §9 Regression
- `.h8-e2e.cjs` re-run in verification mode: **20/20 PASS** (donation create/approve/reject/receipt, payments pending/approved/rejected + idempotent retry, subscription TA, H4 auth/me + users RBAC, H5 role dual-write, H7 pooja booking mirror-direct; documented pre-existing blocks P0/O confirmed unchanged).
- `.h9-e2e.cjs` (build harness) = 27/27 PASS (as built). H7 booking + users/auth covered by H8 tests M/N/O. **Verdict: PASS.**

### §10 Static verification
- `npm run lint`: **web clean; api src/ clean (`eslint src --quiet` exit 0).**
- Root `npm run lint` exits 1 due to **one pre-existing error in the staged harness `apps/api/.h9-e2e.cjs:412` — `'ta' is assigned a value but never used (no-unused-vars)`.** Cause: `eslint.config.mjs` disables `no-unused-vars` only for `**/*.js`; the `.cjs` harness file falls outside that override block. Not introduced during verification. (Not in repo `src/`; harness file only.)
- `npm run build`: success (vite build → `dist/apps/web`, 166 files, exit 0). `prisma validate` OK; `migrate status` up to date; `prisma generate` OK after stopping the API (EPERM on the DLL while API runs — expected Windows behavior, resolved by stop→generate→restart).
- **Verdict: PARTIAL-PASS** (build + prisma pass; lint has 1 error in the `.cjs` harness).

### §11 Restart + repeat + logs
- Stopped both servers; restarted PB (health 200) then API (health 200); repeated a full mirror op end-to-end (expense_categories + expenses + temple_accounts + update) → PG mirrored correctly, idempotent.
- Captured API + PB logs during the repeat run: **no hook errors, no prisma errors, no auth failures (401s are the intentional auth probes), no duplicate rows**, all mirror calls `API 200`. **Verdict: PASS.**

### §12 Protected-area audit
- `apps/pocketbase/pb_migrations/`: unchanged except the **one H9 migration** (new, timestamped).
- H7/H8 hooks (`aaa-mirror-booking.pb.js`, others), `donation-temple-accounts.pb.js`, **`donationMirror.js` (STEP-4 intact)**: all untouched.
- `apps/web`, `schema.prisma`, `start.ps1`/`start.sh`, `AGENTS.md`: untouched.
- `.h8-e2e.cjs`: byte-identical. **Verdict: PASS.**

### §13 Git audit (classify every change)
13 changed files, all H9-required/supporting:
- **H9-required (10):** `migration.sql`; 4 repos + `TempleAccountRepository` + `repositories/index.js`; `routes/expenseMirror.js`; `routes/index.js`; `services/expenseMirror.js`; `pb_hooks/aaa-mirror-expense-ledger.pb.js`.
- **H9-supporting (2):** `H9_BUILD_FINAL_REPORT.md`, `apps/api/.h9-e2e.cjs` (build harness).
- **Unexpected/out-of-scope: none.** No dart formatting artifacts, no unrelated files. **Verdict: PASS.**

### §14 FINAL GO/NO-GO
**NO-GO** — required verifications fail in three places:

1. **§1/§5 — Mandatory donation duplicate test FAILS.**
   - PB temple_accounts record for an approved donation does not exist (legacy `donation-temple-accounts.pb.js` fails under the live `user` field, pre-existing).
   - The PG `ta_<donationId>` row still appears, **created by the old H8 donationMirror STEP-4 write**, which §1/§5 require to be verified as no longer executing. It is still executing.
   - PG TempleAccount id is a derived `ta_*` id, not the PB record id.

2. **§3/§7 — Delete propagation FAILS.** After deleting a PB expense and its PB temple_accounts row, the PG expense and `ta_EXP-<expenseId>` rows remain. The H9 hook has create/update handlers only; the required delete mirror is not implemented.

3. **§10 — lint is not fully clean.** One pre-existing error in the staged `.cjs` harness (`apps/api/.h9-e2e.cjs:412`).

---

## Passed sections (summary)
§2 DB/constraints · §4 negative ledger · §6 idempotency · §8 mirror security · §9 regression (H8 20/20, H9 27/27) · §11 restart/log hygiene · §12 protected-area integrity · §13 git-scope purity · §3/§10 create-update + build + prisma (partial).