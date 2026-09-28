# H9 POST-BUILD VERIFICATION REPORT

Status: **GO**

Generated: 2026-09-28 — targeted H9 remediation complete; all verification green.

---

## 1. Scope of the change

Production code changed in exactly one file: `apps/api/src/services/expenseMirror.js`.

1. **`mirrorTempleAccount`** — the PG `temple_accounts` id is now resolved from the row's
   origin, in priority order:
   - `transaction_id` absent → `ta_pb_<pbId>` (unchanged fallback)
   - `transaction_id` starts with `EXP-` → `ta_<EXP-id>` (expense scheme unchanged)
   - `classification === "Donation"` → **raw PB `temple_accounts.id`** (H9 §7)
   - any other `transaction_id` (bookings, generic ledger rows) → `ta_<transactionId>` (unchanged)
2. **`deleteTempleAccount`** — the raw PB id was added to the OR'd delete candidate list so
   §7 donation rows are removable. All candidates are optional, so absent rows stay a no-op.

Nothing else in production code was touched. `paymentMirror.js` (`ta_<paymentId>`), the
booking mirror, expense identity, PB hooks, the Prisma schema, the frontend, and historical
migrations are all unmodified. No DELETE route, service, or PB hook was added — the existing
infrastructure (5 routes, 5 service functions, 5 PB hooks) was reused as-is.

## 2. Summary matrix

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | §7 donation TA identity | **PASS** | PG id = actual PB `temple_accounts.id`. H8 B: `PB TA id=m0sby1iv0kenlbu; PG id=m0sby1iv0kenlbu` — all five sub-checks true (`idEqualsPbId`, `txnIsDonation`, `amount`, `class`, `noDerivedId`). |
| 2 | No `ta_<donationId>` row | **PASS** | `ta_<donationId>present=false` in H8 B and H8 K. |
| 3 | Exactly one PG donation ledger row | **PASS** | H8 C: `api=200 donations=1 templeAccounts=1`. |
| 4 | Rejected donation has no TA | **PASS** | H8 D: `TA_byTransactionId=absent(GOOD) TA_ta_derived=absent(GOOD)` — checked under every id scheme. |
| 5 | Delete propagation (all 5 collections) | **PASS** | H9 X `temple_accounts` removed + idempotent; X2 `expense_categories`; X3 `classifications`; X4 `expenses` + its `ta_EXP-` TA; X6 `vouchers`. All repeat deletes → API 200. |
| 6 | Donation TA delete | **PASS** | Runtime proof: donation-origin TA deleted through the raw-PB-ID candidate; PG row removed. |
| 7 | No invented cascade | **PASS** | H9 X5: `PG expense removed=true; orphan ta_EXP-<id> kept=true` — the mirror still reflects PB exactly. |
| 8 | `ta_EXP-` expense identity intact | **PASS** | H9 I: `PG id=ta_EXP-p48udlgq516l3gz`. H9 W: `ta_EXP-<id> present=true`. |
| 9 | Generic non-EXP identity intact | **PASS** | H9 J: `id=ta_H9-E2E-TEST_T2` (booking/generic transaction id still derived). |
| 10 | Payment TA identity unaffected | **PASS** | H8 F/G/H + K: payment TA `class=Subscription`, id scheme unchanged; `ta_<donationId>` logic does not touch payments. |
| 11 | Voucher → expense `SET NULL` preserved | **PASS** | H9 R: unresolvable expense → `expenseId=null`, mirror OK; H9 X4 deletes the parent expense cleanly. |
| 12 | Expense → category `RESTRICT` preserved | **PASS** | H9 Q: expense without a resolvable category → 500, PG row absent (FK safety). |
| 13 | Idempotency | **PASS** | H8 C, H8 I; H9 K/L/M/N/O all `api=200 rows=1`; H9 X/X2/X3/X4/X6 repeat deletes → 200. |
| 14 | Mirror authentication | **PASS** | H8 L and H9 T: no secret → 401, wrong secret → 401, correct secret → 200. |
| 15 | H8 regression | **PASS 20/20** | Full detail in §3. |
| 16 | H9 regression | **PASS 32/32** | Full detail in §4. |
| 17 | users/auth regression | **PASS** | H8 M: `/auth/me` user → 200; `/users` admin → 200, non-admin → 403. H8 N: role dual-write promote/restore 200/200. |
| 18 | Payment regression | **PASS** | H8 F/G/H/I: pending mirrored, approved → TA, rejected → no TA, retry idempotent. |
| 19 | H7 (booking) regression | **PASS** | H8 O: booking mirror direct → `PG booking + TA`, `api=200`. The pre-existing legacy-hook block on real PB booking create is unchanged and still reported as such. |
| 20 | Prisma validate | **PASS** | `npx prisma validate` → exit 0, "The schema at prisma\schema.prisma is valid". |
| 21 | Migration status | **PASS** | `npx prisma migrate status` → exit 0, "6 migrations found", "Database schema is up to date!". |
| 22 | Prisma client generate | **PASS** | `Generated Prisma Client (v6.19.3)`. Required stopping the API first (the running node process held the engine DLL, EPERM on rename); the API was restarted immediately afterwards and is healthy. |
| 23 | Lint | **PASS** | `npm run lint` clean for both `apps/web` and `apps/api` (0 errors). The only errors seen initially came from four temporary `.cjs` debug scripts I had created; they were removed, and the clean run is the recorded result. |
| 24 | Build | **PASS** | `vite build` → `built in 57.39s`, output written to `dist/apps/web`. |
| 25 | Restart | **PASS** | Fresh PB + API restart after the source edit; PB `/api/health` = 200, API `/health` = 200, re-probed after the Prisma regenerate. |
| 26 | Protected-file audit | **PASS** | `.h9-e2e.cjs` SHA-256 = `E02B7038362695880E9AB0F7A18136AACF26B66C1A3255A2E9CB969A6F293CDC` — byte-identical, not modified. `.h8-e2e.cjs` intentionally changed (see §5) to `20CF4D640A118972FC4D9D299F196480B8FB458ADF087B43F821A25ACF55BE26` (was `208D09CC98352960E292EEB0EF84AD33E44F41F78F4541CF7C6A5EC1E0A60E4A`), per the explicit decision that §7 wins. Prisma schema, PB hooks, `start.ps1`/`start.sh`, and the frontend are untouched. |
| 27 | Final DB cleanup | **PASS** | PB and PG verified at 0 remaining `H9-E2E-TEST` / `H8-E2E-TEST` / `H9DELVERIFY` / `H9DBG` fixtures and 0 `h8e2e*` / `h9e2e*` ids across `temple_accounts`, `expenses`, `expense_categories`, `classifications`, `vouchers`, `donations`, `payments`, `users`, `pooja_bookings`. All four temporary test users removed from both systems. 7 legitimate users remain. |

## 3. H8 — 20/20 PASS

Every donation-side assertion now resolves the PB row by `transaction_id` and compares against
the real PB id, and additionally asserts that no `ta_<donationId>` row exists.

- **A** Donation create (PB hook path) → PG mirrored — 8 checks pass
- **B** Donation approve → PG approved + TA (`S7: PG id = PB temple_accounts.id`) — pass
- **C** Donation mirror retry → idempotent (`donations=1 templeAccounts=1`) — pass
- **D** Donation reject → PG rejected, no TA under any id scheme — pass
- **E** Donation receipt fields mirror — pass
- **P0** Real payments create — pre-existing block, still 0 records persisted (unchanged)
- **F/G/H/I** Payment pending / approved + TA / rejected / retry idempotent — pass
- **K** TempleAccount shape (donation + payment) — pass
- **L** × 3 Mirror auth (401 / 401 / 200) — pass
- **M** × 3 H4 auth + user authorisation (200 / 200 / 403) — pass
- **N** H5 role dual-write — pass
- **O** × 2 H7 booking — pass

## 4. H9 — 32/32 PASS

Run against the remediated code with the harness byte-unchanged.

- **A–J** create/update mirroring for all five collections, incl. `ta_EXP-` and generic `ta_<txn>` identities — pass
- **K–O** retry idempotency (`api=200 rows=1`) — pass
- **P** lazy expense-category mirror — pass
- **Q** expense without a category → 500, PG absent (FK safety) — pass
- **R** unresolvable voucher expense → `expenseId=null` (`SetNull`) — pass
- **S** negative expense amount rejected → 500 — pass
- **T** × 3 mirror auth — pass
- **U** full expense field mapping — pass
- **V** split amounts + `subscriptionType` — pass
- **W** `ta_EXP-<expenseId>` scheme intact — pass (its "user mirror transport ok=false" is a
  pre-existing direct-user mirror gap, not a §7 assertion; the §7-relevant `ta_EXP-` check passes)
- **X, X2, X3, X4, X6** delete propagation for `temple_accounts`, `expense_categories`,
  `classifications`, `expenses` (+ its `ta_EXP-` TA), and `vouchers` — all removed from PG,
  all repeat deletes → API 200
- **X5** no invented cascade — the orphan `ta_EXP-` TA is correctly retained
- **Y** missing-payload rejection → 400

## 5. Harness change (the only test change)

`apps/api/.h8-e2e.cjs` — donation assertions only, per the explicit decision that §7 wins:

- Added `findPbTempleAccountForDonation(donationId)`, which looks the PB `temple_accounts`
  row up by `transaction_id = donation.id` and returns the real record.
- **B** now asserts PG id equals the PB id, transaction id equals the donation id, amount and
  classification match, and **no** `ta_<donationId>` row exists (5 named sub-checks).
- **C** idempotency now counts the TA under the real PB id.
- **D** reject now checks for a TA by `transactionId` *and* by the derived id, so it fails if
  a TA appears under any scheme.
- **K** uses the real PB id for the donation TA and still asserts the payment TA separately.
- Cleanup was extended to match §7 rows, which are no longer `ta_`-prefixed: PG cleanup also
  matches `memberName`/`description`, and PB setup deletes the previous run's PB
  `temple_accounts` rows before deleting the test donations (PB has no donation→TA cascade,
  so those rows would otherwise accumulate across runs).

No H8 test was weakened, skipped, or removed; the suite is still exactly 20 tests.

## 6. Observations outside this change (not fixed, not blocking)

1. **Pre-existing `expenses` create-path FK quirk.** An ad-hoc PB expense payload could reach
   the API with a `category_id` that does not exist in PocketBase, producing
   `expense-category-not-resolved: <id>`. The PB hook forwards `record.get("category_id")`
   verbatim, and the H9 harness's own sanctioned path (mirrored category + `category_id`
   only) mirrors correctly — H9 E and P pass. This is a create-path condition in a probe
   payload, is unrelated to the §7 identity change, and the sanctioned path is proven green.
   No production code was changed for it.
2. **Pre-existing legacy hook blocks real PB booking create** — `Failed to create record.`,
   0 rows persisted. Unchanged; H8 O still documents it and passes on the direct-mirror path.
3. **Pre-existing direct-user mirror transport gap** surfaced in H9 W. Unrelated to §7.
4. **`npx prisma generate` cannot run while the API holds the engine DLL** (EPERM on rename).
   Stop the API first, then regenerate, then restart.

## 7. Rule compliance

- Production change confined to `apps/api/src/services/expenseMirror.js` (identity + one
  delete candidate).
- `.h9-e2e.cjs` untouched (SHA verified). `.h8-e2e.cjs` changed only in donation assertions
  and their required cleanup, as explicitly authorised.
- No duplicate DELETE infrastructure, no new cascade, no Prisma schema or historical-migration
  change, no frontend or API contract change, no payment/booking/expense identity change.
- No H10 work started.

## 8. Final state

- PocketBase: healthy (`/api/health` = 200).
- API: healthy (`/health` = 200).
- Lint clean, build green, Prisma schema valid and migrations up to date.
- Test fixtures removed from both PocketBase and PostgreSQL.
- **Verdict: GO.**
