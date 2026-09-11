# H7 BUILD FINAL REPORT
## Sri Siththi Vinayagar Temple — Pooja Booking PostgreSQL Mirror

---

## 1. Build Overview

| Item | Value |
|------|-------|
| **Build** | H7 — Pooja Booking → PostgreSQL Mirror |
| **Status** | Complete |
| **Active App** | PocketBase (application-facing system) |
| **Mirror Target** | PostgreSQL via Prisma ORM |
| **Schema Change** | None (tables/columns already existed in schema.prisma) |
| **Historical Migration** | None — only new PB records are mirrored forward |
| **Key Constraint** | PB 0.38 JSVM scope bug: hook callbacks cannot see top-level bindings from the same `.pb.js` file |

---

## 2. Prerequisites Satisfied

| Prerequisite | Status |
|--------------|--------|
| H5 Identity Layer (email-based users) | Done |
| H6 Prisma schema complete | Done |
| All `TODO(H7)` markers resolved | Done |
| PG tables exist (poojas, pooja_bookings, temple_accounts, users) | Confirmed |
| PoojaBooking FK → Pooja (Restrict) | Confirmed |
| PoojaBooking userId → User (Restrict) | Confirmed |
| TempleAccount now contains all Pooja Booking derived fields | Confirmed |

---

## 3. Files Changed

| File | Change | Lines |
|------|--------|-------|
| `apps/api/src/services/poojaBookingMirror.js` | **New** — mirror service | 360 |
| `apps/api/src/routes/bookingMirror.js` | **New** — internal route + secret auth | 72 |
| `apps/api/src/routes/index.js` | Modified — mount route at `/internal/booking-mirror` | +2 |
| `apps/api/src/routes/poojaBooking.js` | Modified — receipt fallback `receipt_id \|\| receipt_number` | +1/-1 |
| `apps/pocketbase/pb_hooks/mirror-pooja-booking.pb.js` | **New** — PB hook (fully inline) | 211 |
| `apps/web/src/pages/MyBookingsPage.jsx` | Modified — receipt download URL | +3/-3 |
| `apps/web/src/pages/UserMessagesPage.jsx` | Modified — `sender_id` → `sender_email` | +1/-1 |

**No files outside H7 scope were modified.** Auto-archive hook restored to committed state.

---

## 4. Architecture

```
PB Booking Created/Updated
  ↓  (onRecordAfterCreateSuccess / onRecordAfterUpdateSuccess)
  ↓  mirror-pooja-booking.pb.js  [PB 0.38 JSVM, fully inline]
  ↓  $http.send → POST /internal/booking-mirror/pooja-booking
  ↓  (X-Booking-Mirror-Secret header)
  ↓
bookingMirror.js (Express route)
  ↓  requireMirrorSecret → timing-safe compare
  ↓  mirrorPoojaBooking() → poojaBookingMirror.js
  ↓  resolvePgUser → UserRepository.findByPocketbaseId → mirror if missing
  ↓  resolvePgPooja → Prisma findUnique → pb.collection('poojas').getOne → upsert if missing
  ↓
  ↓  ┌─────────────────────────────────────────────────┐
  │  │  Single Prisma transaction:                     │
  │  │    Pooja.upsert (idempotent)                    │
  │  │    PoojaBooking.upsert (PK = PB booking id)     │
  │  │    TempleAccount.upsert (id = ta_<bookingId>)   │
  │  │    (only if donation_amount > 0)                │
  └─────────────────────────────────────────────────┘
  ↓
  ↓  Response: { ok: true, bookingId, mirrored: true }
  ↓
  ↓  PB hook: log success, never throw, never fail the user's request
```

---

## 5. Mirror Service Design Invariants

1. **Idempotent by PB booking id**: `PG PoojaBooking.id == PB booking id`; `PG TempleAccount.id == "ta_<pb booking id>"`. Repeated calls upsert — never duplicate.
2. **No historical data migration**: only records pushed by the PB hook land in PG.
3. **User mapping**: follows H5 identity strategy (`pocketbaseId` → email). PB `pooja_bookings.user` is REQUIRED; no fake/guest user is created.
4. **Lazy pooja mirroring**: Pooja rows are mirrored on first booking touch (no backfill), because the Restrict FK requires the row to exist before a booking insert.
5. **Status mapping**: 1:1 to existing Prisma enums; unknown values throw, never silently guessed.
6. **Never throws in the PB hook**: mirror failure → logged warning, booking still succeeds in PB.

---

## 6. API Route Details

**Endpoint**: `POST /internal/booking-mirror/pooja-booking`

| Field | Value |
|-------|-------|
| Auth | `X-Booking-Mirror-Secret` header, timing-safe compare |
| Missing secret | `401 {"ok":false,"error":"Unauthorized"}` |
| Secret not configured | `503 {"ok":false,"error":"Mirror endpoint is not configured"}` |
| Payload validation | id, pooja, email, donation_amount, status — all required |
| Missing fields | `400 {"ok":false,"error":"Missing required fields: ..."}` |
| Service failure | `500 {"ok":false,"error":"..."}` |
| Success | `200 {"ok":true,"bookingId":"...","mirrored":true}` |

---

## 7. PB Hook Design (mirror-pooja-booking.pb.js)

| Property | Value |
|----------|-------|
| Trigger | `onRecordAfterCreateSuccess` + `onRecordAfterUpdateSuccess` |
| Collection | `pooja_bookings` |
| HTTP client | `$http.send` (synchronous, 4s timeout) |
| Retry | 2 attempts max (no sleep between — PB JSVM has no `$sleep`) |
| Idempotency | guaranteed at API side; hook retries are safe |
| Failure behavior | logged, never throws, never fails the user request |
| `e.next()` | called unconditionally (outside try/catch) |
| Env vars | `BOOKING_MIRROR_SECRET`, `BOOKING_MIRROR_API_URL` (read via `$os.getenv`) |

---

## 8. Status / Field Mapping Reference

### BookingStatus (PB → PG)
| PB `status` | PG `bookingStatus` |
|-------------|-------------------|
| `pending` | `pending` |
| `approved` | `approved` |
| `rejected` | `rejected` |
| `completed` | `completed` |
| `cancelled` | `cancelled` |

### PaymentStatus (PB → PG)
| PB `payment_status` | PG `paymentStatus` |
|---------------------|-------------------|
| `pending` | `pending` |
| `completed` | `completed` |
| `failed` | `failed` |
| `refunded` | `refunded` |
| *(null/empty)* | `null` |

### PoojaStatus (PB → PG)
| PB `poojas.status` | PG Pooja.status |
|--------------------|-----------------|
| `draft` | `draft` |
| `published` | `active` |
| `archived` | `archived` |

---

## 9. Runtime Verification Results

### 9a. PB → Hook → API → PG: Create Path
| Step | Result |
|------|--------|
| PB booking create | HTTP 200, id `9zfvtir5npsoekc` |
| PB log | `[mirror-pooja-booking] mirrored 9zfvtir5npsoekc -> API 200` |
| API log | `[BOOKING-MIRROR] mirrored booking 9zfvtir5npsoekc -> PG (user=fc2ed5d3..., pooja=85mcxwrnrc7qdp6, templeAccount=true)` |
| PG PoojaBooking | id=`9zfvtir5npsoekc`, userId=fc2ed5d3, poojaId=85mcxwrnrc7qdp6, bookingStatus=pending, paymentStatus=pending |
| PG Pooja | id=`85mcxwrnrc7qdp6` (lazily created) |
| PG TempleAccount | id=`ta_9zfvtir5npsoekc`, memberName="H7 E2E Test", amount=50.00, classification="Pooja Donation", transactionId=booking.id |

### 9b. Update Path (status + payment)
| Step | Result |
|------|--------|
| PATCH status=approved, payment_status=completed | PB returned 400 empty data `{}` (pre-existing hook throw), **but COMMITTED** |
| PG after PATCH | bookingStatus=approved, paymentStatus=completed (committed despite 400) |
| Mirror fired on update | Yes — API received and processed the update |
| PG receiptId sync | Verified: after `receipt_id` PATCH + restart with env → `receiptId=POOJA_2026_TEST_ABC123`, `receiptNumber=POOJA_2026_TEST_ABC123` |

### 9c. Idempotency
| Test | Result |
|------|--------|
| 3 mirror calls (1 create + 2 updates) | Exactly 1 PoojaBooking row, 1 Pooja, 1 TempleAccount |
| Direct API POST (`auth-test-2`) | `200 {"ok":true,"bookingId":"auth-test-2","mirrored":true}` |
| Total PG bookings | 2 (9zfvtir5npsoekc + auth-test-2) — both correct |

### 9d. Mirror Auth
| Test | Result |
|------|--------|
| No secret header | `401 {"ok":false,"error":"Unauthorized"}` |
| Wrong secret | `401 {"ok":false,"error":"Unauthorized"}` |
| Correct secret, valid payload | `200 {"ok":true,"bookingId":"auth-test-2","mirrored":true}` |
| Correct secret, no dates (donation>0) | `500 "temple-account-date-missing: no pooja_date/booking_date"` (correct — requires dates) |

### 9e. Phase 7 Receipt Download
| Test | Result |
|------|--------|
| GET `/pooja-bookings/9zfvtir5npsoekc/receipt` (receipt_id set) | `200 application/pdf`, `Content-Disposition: attachment; filename="POOJA_RECEIPT_9zfvtir5npsoekc.pdf"`, 57997 bytes |
| GET receipt for booking without receipt_id | `404 {"error":"Receipt not found for this booking"}` |
| Frontend code path | `MyBookingsPage.jsx:72` calls `GET /pooja-bookings/${bookingId}/receipt` |

### 9f. H5 / H4 Regression (this session)
| Endpoint | Result |
|----------|--------|
| `GET /health` | `200` |
| `GET /pooja-bookings` (list) | `200` (list renders correctly) |
| `GET /auth/me` (invalid token) | `401` (auth enforcement intact) |
| `GET /users` (invalid token) | `401` (auth enforcement intact) |

---

## 10. Static Checks (Final)

| Check | Result |
|-------|--------|
| `npm run lint --prefix apps/api` | ✅ Clean |
| `npm run lint --prefix apps/web` | ✅ Clean |
| `npm run build` (web) | ✅ Clean |
| `npx prisma validate` | ✅ Schema valid |

---

## 11. Git Status (Final)

```
A  apps/api/src/routes/bookingMirror.js
M  apps/api/src/routes/index.js
M  apps/api/src/routes/poojaBooking.js
A  apps/api/src/services/poojaBookingMirror.js
AM apps/pocketbase/pb_hooks/mirror-pooja-booking.pb.js
M  apps/web/src/pages/MyBookingsPage.jsx
M  apps/web/src/pages/UserMessagesPage.jsx
```

- 7 files total, all within H7 scope
- `AM` on hook = staged old version + working tree has the clean ASCII rewrite (ready to stage)
- Zero unrelated files touched

---

## 12. Cleanup Performed

| Target | Items Deleted |
|--------|--------------|
| **PB users** | `zhu8u579emc6n2a` (h7test), `zxe7oo5d8qmerjc` (scopetest), `gg7j5g0zsyhxk5p` (scopetest2), `u0d5vg4eumhkjoj` (globtest), `z751bt5ysteaag5` (pattest) |
| **PB poojas** | 5 H7 test poojas (`85mcxwrnrc7qdp6`, `nofofren8pw46yn`, `stnu34um1h9507o`, `j1cl1vmy1aa32w8`, `wxhcchkxvyqaner`) |
| **PB bookings** | `t5u9gc7xds3ty93`, `9zfvtir5npsoekc` |
| **PG PoojaBooking** | 2 rows (`9zfvtir5npsoekc`, `auth-test-2`) |
| **PG TempleAccount** | 2 rows (`ta_9zfvtir5npsoekc`, `ta_auth-test-2`) |
| **PG Pooja** | 1 row (`85mcxwrnrc7qdp6`) |
| **PG User** | 1 row (`fc2ed5d3...` / h7test) |

**Post-cleanup counts**: PB users=8, bookings=0, poojas=5 (legacy). PG users=6, bookings=0, poojas=0, temple_accounts=0. Baseline restored.

---

## 13. Pre-Existing Issue: PB 0.38 JSVM Scope Bug

**Severity**: Critical (affects all hooks using top-level bindings)  
**Root cause**: In this PB build (`pocketbase.exe` bundled in the repo), hook callbacks cannot see top-level `function` declarations, `const` arrow functions, or `globalThis` assignments from the same `.pb.js` file. Any reference throws `"<name> is not defined"` at runtime. Even passing a top-level function by name to `onRecordAfterCreateSuccess(fn, ...)` fails before the body runs.

**Proven empirically** via 4 independent tests (scopetest, scopetest2, globtest, pattest) — all deleted after proving the finding.

**Available inside callbacks** (PB-injected globals only): `JSON`, `$os`, `$http`, `$app`, `Math`, `Date`, `Object`, `Array`, `String`, `Number`, `globalThis`, `$template`, `console`.

**Not available**: `$migrate`, any top-level function/const from the same `.pb.js` file.

### Hooks Broken by This Bug

| Hook | Effect |
|------|--------|
| `auto-archive-expired-poojas.pb.js` | Calls `archivePooja()` (top-level function) → `ReferenceError` → every `poojas` list/view/get request returns `400 {"data":{},"message":"Something went wrong..."}` |
| `pooja-booking-receipt-generation.pb.js` | Calls `generateAndSendPoojaReceipt()` (top-level function) → `ReferenceError` → `receipt_id` is never auto-populated; booking approval PATCHes return 400-but-committed |
| `donation-receipt-generation.pb.js` | Same pattern — broken |
| `payment-receipt-generation.pb.js` | Same pattern — broken |

**Decision**: Document only. These are pre-existing issues, out of H7 scope. The H7 mirror hook was rewritten fully-inline to avoid this bug (verified working).

---

## 14. Pre-Existing Issue: Poojas Read 400

| Aspect | Detail |
|--------|--------|
| Symptom | `GET /api/collections/poojas/records` → `400 {"data":{},"message":"Something went wrong while processing your request."}` |
| Root cause | `auto-archive-expired-poojas.pb.js` (onRecordsListRequest hook) throws ReferenceError for its top-level `archivePooja()` helper → PB returns 400 |
| Impact on H7 | Lazy-pooja mirror path (`pb.collection('poojas').getOne(id)`) fails for new poojas not yet in PG while hook is active. Already-mirrored poojas work (PG findUnique short-circuit). |
| H7 action | Temporarily renamed hook during E2E verification, then restored to committed state. Documented as pre-existing. |

---

## 15. Pre-Existing Issue: PB 400-but-Committed

| Aspect | Detail |
|--------|--------|
| Symptom | PB API returns `400 {"data":{}}` (empty body) for a record create/update, but the record IS committed in PB and mirrored to PG |
| Observed on | Poojas create (all test creates), one `pooja_bookings` PATCH (status=approved) |
| Root cause | `onRecordAfterUpdateSuccess` hooks (receipt generation, approval notification) throw errors after the DB transaction commits; PB surfaces the hook error as HTTP 400 |
| Impact | Users see 400 errors despite data being saved — confusing UX, but data integrity intact |
| H7 action | Document only. The approval-email hook (`booking-approval-notification.pb.js`) and receipt-generation hooks all throw during status update. |

---

## 16. Pre-Existing Issue: PB Temple-Account Hook Errors

| Aspect | Detail |
|--------|--------|
| Symptom | On `pooja_bookings` create, PB logs: `"Cannot convert undefined or null to object"` and `"Could not fetch pooja details: sql: no rows in result set"` |
| Root cause | PB-side pre-existing hooks (in `pb_hooks`) that run after booking create attempt to access pooja data or user data and fail |
| Impact | PB returns 400 on booking create for certain request patterns, but H7 mirror hook fires independently and creates the PG row regardless |
| H7 action | Document only |

---

## 17. Pre-Existing Issue: PB temple_accounts Missing Classification

| Aspect | Detail |
|--------|--------|
| Symptom | When PB's internal hook creates `temple_accounts` records, the `classification` field is not populated (null/missing) |
| Impact | `classification` is PG-required for TempleAccount; the H7 mirror service explicitly sets it to `"Pooja Donation"` |
| H7 action | Document only |

---

## 18. Phase 7 Receipt Fix (Committed)

**Problem**: The receipt route (`GET /pooja-bookings/:id/receipt`) used `booking.receipt_id` only. PB's pre-existing receipt-generation hooks set `receipt_number` (not `receipt_id`), leaving `receipt_id` null for most bookings.

**Fix**: Fallback chain — `booking.receipt_id || booking.receipt_number` at `poojaBooking.js:83`.

**Frontend**: `MyBookingsPage.jsx` changed from `POST /receipts/poojas/${id}/generate-receipt` to `GET /pooja-bookings/${id}/receipt` (line 72).

**Verified**: HTTP 200, `application/pdf`, `Content-Disposition: attachment; filename="POOJA_RECEIPT_9zfvtir5npsoekc.pdf"`, 57997 bytes.

---

## 19. Phase 12 Sender Email Fix (Committed)

**Problem**: `UserMessagesPage.jsx` sent `sender_id: currentUser.id` — field does not exist on PB `booking_messages` collection (which requires `sender_email`).

**Fix**: Changed to `sender_email: currentUser.email` at `UserMessagesPage.jsx:89`.

**Verified** (code review): line matches expected pattern, lint clean.

---

## 20. Environment Variables Required

### apps/pocketbase/.env
```
BOOKING_MIRROR_SECRET=e9c3bc5016347716cde919af47ba1f5c7d4360e1
BOOKING_MIRROR_API_URL=http://localhost:3001
```

### apps/api/.env
```
BOOKING_MIRROR_SECRET=e9c3bc5016347716cde919af47ba1f5c7d4360e1
```

**PB must be launched with these env vars set.** Without them, the hook logs `BOOKING_MIRROR_SECRET not set; skipping mirror` and no mirroring occurs.

---

## 21. Dev Startup Sequence

```powershell
# 1. PocketBase (MUST start first)
cd apps/pocketbase
$env:BOOKING_MIRROR_SECRET="e9c3bc5016347716cde919af47ba1f5c7d4360e1"
$env:BOOKING_MIRROR_API_URL="http://localhost:3001"
pocketbase.exe serve --http=0.0.0.0:8090

# 2. API (waits for PB via 10-retry health check)
cd apps/api
node src/main.js

# 3. Web
cd apps/web
npm run dev
```

**Or**: `.\start.ps1` (sets env vars automatically).

---

## 22. Field Mapping — Full PoojaBooking Column List

| PB Field | PG Column | Type | Notes |
|----------|-----------|------|-------|
| `id` | `id` | String (PK) | PB booking id |
| `user` → `resolvePgUser` | `userId` | String (FK → users.id) | Lazy mirror |
| `pooja` → `resolvePgPooja` | `poojaId` | String (FK → poojas.id) | Lazy mirror |
| `name` | `name` | String(255) | |
| `email` | `email` | String(320) | |
| `user_contact` | `userContact` / `phone` | String(15) | Both mapped |
| `booking_date` | `bookingDate` | DateTime | null if not set |
| `pooja_date` | `poojaDate` | DateTime | null if not set |
| `time_slot` | `timeSlot` | String(50) | |
| `donation_amount` | `donationAmount` | Float | Required |
| `fee_amount` | `feeAmount` | Float | null if not set |
| `status` | `bookingStatus` | BookingStatus enum | mapped via BOOKING_STATUS_ALIASES |
| `payment_status` | `paymentStatus` | PaymentStatus enum | null if not set |
| `receipt_id` | `receiptId` | String(100) | null if not set |
| `receipt_number` | `receiptNumber` | String(50) | null if not set |
| `receipt_pdf` | `receiptPdf` | String(500) | First element if array |
| `receipt_created_at` | `receiptGeneratedAt` | DateTime | null if not set |
| `receipt_sent_at` | `receiptSentAt` | DateTime | null if not set |
| `resend_receipt` | `resendReceipt` | Boolean | |
| `transaction_id` | `transactionId` | String(100) | |
| `pooja_name` | `poojaName` | String(255) | |
| `booking_time` | `bookingTime` | String(50) | |
| `is_deleted` | `isDeleted` | Boolean | |
| `created` | `createdAt` | DateTime | Set only on create |
| `updated` | `updatedAt` | DateTime | Auto by Prisma |

---

## 23. Field Mapping — Full TempleAccount Column List

| Source | PG Column | Value |
|--------|-----------|-------|
| Computed | `id` | `ta_<bookingId>` |
| `booking.name` | `memberName` | Falls back to email, then "Devotee" |
| `booking.donation_amount` | `amount` | Float |
| Hardcoded | `category` | `"Pooja Services"` |
| `pooja_date` or `booking_date` | `date` | DateTime (must exist when donation > 0) |
| Derived from date | `month` | Month name (e.g. "September") |
| Derived from date | `year` | Integer (e.g. 2026) |
| Hardcoded | `classification` | `"Pooja Donation"` |
| `booking.id` | `transactionId` | Booking id string |
| Hardcoded | `poojaServicesAmount` | `null` |

---

## 24. PB Hook — Payload Shape Sent to API

The PB hook sends a JSON object containing all PB booking fields to `POST /internal/booking-mirror/pooja-booking`:

```json
{
  "id": "...", "user": "...", "pooja": "...",
  "name": "...", "email": "...", "user_contact": "...",
  "donation_amount": 50, "fee_amount": null,
  "status": "pending", "payment_status": "pending",
  "pooja_date": "...", "booking_date": "...",
  "booking_time": "...", "time_slot": "...",
  "transaction_id": "...",
  "receipt_id": null, "receipt_number": null,
  "receipt_pdf": null, "receipt_created_at": null,
  "receipt_sent_at": null, "resend_receipt": false,
  "pooja_name": "...", "is_deleted": false,
  "created": "...", "updated": "..."
}
```

`receipt_pdf` is unwrapped from array to string before sending.

---

## 25. Idempotency Guarantees

| Operation | Mechanism |
|-----------|-----------|
| PoojaBooking create | `upsert({ where: { id: bookingId } })` |
| Pooja create | `upsert({ where: { id } })` |
| TempleAccount create | `upsert({ where: { id: "ta_<bookingId>" } })` |
| PB hook retries | 2 attempts max, same payload; API upsert is safe |
| Multiple PB creates | Each has a unique PB id → unique PG row |

---

## 26. Error Handling

| Layer | Behavior |
|-------|----------|
| PB hook (create/update) | Wrapped in try/catch; always calls `e.next()` outside try/catch; mirror failure logged, never throws |
| API route | Returns appropriate HTTP status (400/401/500); logs errors |
| Mirror service | Returns `{ ok: false, error: "..." }` on failure; logs via logger |
| Prisma transaction | If transaction fails, PG remains consistent (all-or-nothing) |

---

## 27. Security

| Concern | Implementation |
|---------|---------------|
| Mirror endpoint not exposed to frontend | Path `/internal/booking-mirror/*` — internal only |
| Shared secret auth | `X-Booking-Mirror-Secret` header, timing-safe compare via `crypto.timingSafeEqual` |
| No secrets logged | `safeEqual` prevents timing oracle; hook never logs secret value |
| PB env vars not in git | `apps/pocketbase/.env` is gitignored |
| API env vars not in git | `apps/api/.env` is gitignored |

---

## 28. Known Limitations

1. **Lazy pooja mirroring depends on PB read**: `resolvePgPooja` calls `pb.collection('poojas').getOne(id)`. If the pre-existing auto-archive hook is active, this 400s for poojas not already in PG. Once a pooja exists in PG, the PG-first short-circuit works.
2. **PB 400-but-committed**: approval PATCHes throw in after-success hooks but commit. Users see 400 but data is saved. Pre-existing PB issue.
3. **No receipt auto-generation**: receipt-generation hooks are broken by the JSVM scope bug. `receipt_id` stays null unless set manually or by a future fixed hook.
4. **TempleAccount `status`/`entryType` not set**: The mirror service does not populate these PG columns (they are not required); they remain null.

---

## 29. What Was NOT Changed (Intentional)

| Item | Reason |
|------|--------|
| `auto-archive-expired-poojas.pb.js` | Pre-existing, restored to committed state. Fixing the JSVM scope issue is out of H7 scope. |
| `pooja-booking-receipt-generation.pb.js` | Pre-existing, broken by JSVM scope bug. Fixing receipt auto-generation is out of H7 scope. |
| `donation-receipt-generation.pb.js` | Same |
| `payment-receipt-generation.pb.js` | Same |
| `booking-approval-notification.pb.js` | Pre-existing, throws on approval (out of scope) |
| Dead code (BookPoojaPage, PoojaBookingPage, etc.) | Explicitly excluded from H7 |
| PB schema / migrations | No schema change required; all tables already existed |
| Historical data backfill | Out of scope per H7 constraints |

---

## 30. Tooling Gotchas (Lessons Learned)

| Gotcha | Workaround |
|--------|-----------|
| `Start-Process -RedirectStandardOutput/-Error` HANGS the opencode tool ~10 min | Use `Start-Process cmd.exe -ArgumentList "/c","start","\"\"","/b","cmd","/c",$cmd -WindowStyle Hidden` |
| PowerShell 5.1 has no `-SkipHttpErrorCheck` | Wrap `Invoke-WebRequest` in `try/catch` and read `$_.Exception.Response.StatusCode` |
| `psql` interprets bare camelCase args as extra CLI flags | Write SQL to temp `.sql` files (`C:\Users\Komathi\AppData\Local\Temp\opencode\`) and use `psql -f` |
| `prisma generate` fails while API is running (file lock) | Kill API first, generate, restart |
| `$http.send` in PB JSVM is synchronous (no `$app.queueSubmit`) | Hook body is synchronous; 4s timeout per attempt |
| PB hot-reloads `.pb.js` on file save but logs "restart required" | Restart PB for hook changes to take effect reliably |
| `Invoke-RestMethod` silently drops `PSUseApprovedVerbs` warnings | Not a blocker; warnings are informational |

---

## 31. Remaining Future Work (Out of H7 Scope)

| Priority | Item |
|----------|------|
| **High** | Fix PB 0.38 JSVM scope bug (or upgrade PB version) — resolves poojas 400s, receipt auto-generation, auto-archive |
| **High** | Inline-rewrite `auto-archive-expired-poojas.pb.js` to work within JSVM constraints |
| **High** | Inline-rewrite receipt-generation hooks so `receipt_id` auto-populates on approval |
| **Medium** | Normalize PB `pooja_bookings.pooja` and `temple_accounts` field types to match PG columns |
| **Low** | Populate `temple_accounts.status` / `entryType` in mirror service (currently null) |

---

## 32. Commit Message (Ready to Use)

```
feat(H7): add pooja booking PostgreSQL mirror + receipt/sender fixes

- New: apps/api/src/services/poojaBookingMirror.js (idempotent mirror service)
- New: apps/api/src/routes/bookingMirror.js (internal secret-auth endpoint)
- New: apps/pocketbase/pb_hooks/mirror-pooja-booking.pb.js (PB hook, fully inline)
  Hooks into pooja_bookings create/update, POSTs to Express API which upserts
  PoojaBooking + lazily mirrors Pooja + creates TempleAccount in PG.
  Rewritten fully inline to work around PB 0.38 JSVM scope bug.
- Modified: apps/api/src/routes/index.js (mount /internal/booking-mirror)
- Modified: apps/api/src/routes/poojaBooking.js (receipt fallback: receipt_id || receipt_number)
- Modified: apps/web/src/pages/MyBookingsPage.jsx (receipt download via GET /pooja-bookings/:id/receipt)
- Modified: apps/web/src/pages/UserMessagesPage.jsx (sender_id -> sender_email)

Runtime verified: PB create -> hook fires -> API mirrors -> PG booking + pooja + TA created,
idempotent on replay, auth-guarded (401 without secret), receipt PDF 200 confirmed.
Pre-existing issues documented (JSVM scope bug breaks auto-archive + receipt hooks).
```

---

## 33. Sign-Off

| Check | Status |
|-------|--------|
| H6/H5 plans not modified | ✅ |
| All `TODO(H7)` markers resolved | ✅ |
| PG schema unchanged | ✅ |
| No historical migration | ✅ |
| API contract preserved | ✅ |
| Lint (api + web) | ✅ |
| Build | ✅ |
| Prisma validate | ✅ |
| Runtime E2E verified | ✅ |
| Test fixtures cleaned | ✅ |
| Pre-existing issues documented | ✅ |
| Auto-archive hook restored to committed state | ✅ |

**H7 BUILD: COMPLETE**
