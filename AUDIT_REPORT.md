# COMPREHENSIVE FRONTEND-BACKEND AUDIT REPORT
**Date:** 2026-04-11
**System:** Sri Siththi Vinayagar Tempel App

## EXECUTIVE SUMMARY
The application demonstrates a robust architectural foundation with secure role-based access, a clear separation of concerns, and effective use of PocketBase for real-time data and authentication. However, the database schema suffers from significant "schema drift" and technical debt. Over time, multiple naming conventions (camelCase vs. snake_case) and duplicated fields (e.g., `created` vs `created_at`, `time` vs `time_slots`) have been introduced. Additionally, some backend routes implement workarounds (like stuffing donor contact info into the `notes` field) rather than relying on strict schema definitions. This audit provides a clear roadmap for cleaning up the schema and optimizing data flow.

---

## PART A: FRONTEND-BACKEND CONNECTION VERIFICATION

### 1. API Connections Map
| Frontend Component | API Route | Status | Notes |
| :--- | :--- | :--- | :--- |
| `TempleDonatePage.jsx` | `POST /donations` | ✅ Connected | Creates donation record via Express |
| `AdminDonationApprovalPage.jsx` | `POST /donations/approve` | ✅ Connected | Triggers PDF & Email logic |
| `AdminDonationApprovalPage.jsx` | `GET /donations/:id/download-receipt` | ✅ Connected | Fetches generated PDF |
| `AdminDonationApprovalPage.jsx` | `POST /donations/send-report` | ✅ Connected | Dispatches admin reports |
| `AdminDonationApprovalPage.jsx` | `POST /donations/:id/send-custom-email` | ✅ Connected | Custom comms to donor |
| `AdminPoojaApprovals.jsx` | `POST /pooja-bookings/send-confirmation` | ✅ Connected | Triggers PDF & Email logic |
| `AdminPoojaApprovals.jsx` | `GET /pooja-bookings/:id/receipt` | ✅ Connected | Fetches generated PDF |
| `AdminPoojaApprovals.jsx` | `POST /pooja-bookings/:id/resend-receipt` | ✅ Connected | Re-triggers email logic |
| `AdminSubscriptionManagement.jsx` | `POST /subscription/approve` | ✅ Connected | Triggers PDF & Email logic |
| `AdminSubscriptionManagement.jsx` | `GET /subscription/:id/receipt` | ✅ Connected | Fetches generated PDF |
| `AdminSubscriptionManagement.jsx` | `POST /subscription/:id/resend-receipt` | ✅ Connected | Re-triggers email logic |

### 2. PocketBase Direct SDK Calls
The frontend heavily relies on the PocketBase SDK (`pb.collection()`) for standard CRUD, bypassing Express for simple reads/writes.
*   **Users:** `authWithPassword`, `authWithOAuth2`, `create`, `update`, `getList`, `getOne` -> ✅ Standard & Correct
*   **Donations:** `getFullList`, `update` (soft delete) -> ✅ Correct (Backend CRUD endpoints for these are orphaned)
*   **Poojas:** `getFullList`, `create`, `update`, `delete` -> ✅ Correct
*   **Pooja Bookings:** `getFullList`, `create` (via checkout), `update` -> ✅ Correct
*   **Booking Messages:** `getFullList`, `create` -> ✅ Correct
*   **Temple Accounts:** `getFullList` -> ✅ Correct

### 3. Orphaned / Unused Routes
*   **Backend Routes without Frontend Calls:** 
    *   `GET /donations`, `GET /donations/:id`, `PATCH /donations/:id`, `DELETE /donations/:id` (Frontend uses PB SDK instead).
    *   `GET /pooja-bookings`, `GET /pooja-bookings/:id`, `PATCH /pooja-bookings/:id`, `DELETE /pooja-bookings/:id` (Frontend uses PB SDK).
*   **Recommendation:** Remove these redundant Express routes to reduce backend surface area, as PocketBase's SDK securely handles them via view/list rules.

---

## PART B: POCKETBASE COLLECTION FIELD AUDIT

### 1. `users` Collection
*   **USED:** `id`, `email`, `verified`, `name`, `avatar`, `created`, `updated`, `membershipTier`, `phone`, `address`, `preferred_language`, `role`.
*   **DUPLICATES / ORPHANED:**
    *   `membership_type` (Duplicate of `membershipTier`. Code uses both interchangeably).
    *   `fontSizePreference` (Unused in DB; handled via local storage in accessibility hooks).
    *   `joinDate` (Redundant, `created` serves this purpose).

### 2. `poojas` Collection
*   *This collection suffers from severe duplication due to iterative development.*
*   **USED:** `id`, `name`, `description`, `god`, `donation_amount`, `category`, `status`, `dates`, `days`, `time_slots`, `is_deleted`, `created`, `updated`.
*   **DUPLICATES / ORPHANED:**
    *   `time`, `timeSlots` (Duplicates of `time_slots`).
    *   `deity` (Duplicate of `god`).
    *   `available_dates`, `specificDates` (Duplicates of `dates`).
    *   `specificDays` (Duplicate of `days`).
    *   `createdAt` (Duplicate of system `created`).
    *   `isArchived`, `archivedAt` (Redundant with `status="archived"` and `is_deleted`).
    *   `duration`, `isPremium`, `maxParticipants`, `currentParticipants`, `availabilityType`, `festival` (Currently unused in the active frontend booking flow).

### 3. `pooja_bookings` Collection
*   **USED:** `id`, `user_id`, `pooja_date`, `time_slot`, `name`, `email`, `user_contact`, `donation_amount`, `status`, `transaction_id`, `pooja_id`, `receipt_id`, `is_deleted`, `created`, `updated`.
*   **DUPLICATES / ORPHANED:**
    *   `booking_status` (Duplicate of `status`).
    *   `created_at`, `updated_at` (Duplicates of system `created`/`updated`).
    *   `fee_amount` (Duplicate of `donation_amount`).
    *   `booking_time` (Redundant, stored in `created`).
    *   `booking_date` (Redundant with `pooja_date` vs `created`).
    *   `pooja_name` (Should be a relation expand, though currently hardcoded for historical record keeping).

### 4. `donations` Collection
*   **USED:** `id`, `user_id`, `amount`, `category`, `status`, `notes`, `donation_date`, `receipt_id`, `is_deleted`, `created`, `updated`.
*   **MISSING FIELDS (CRITICAL):**
    *   `donor_name`, `donor_email`, `donor_phone`. Currently, the Express backend explicitly concatenates these into the `notes` string because they don't exist in the schema.
*   **DUPLICATES / ORPHANED:**
    *   `created_at` (Duplicate of `created`).
    *   `receipt_created_at`, `receipt_generated_date` (Duplicate concepts).

### 5. `subscriptions` Collection
*   **USED:** `id`, `user_id`, `subscription_type`, `amount`, `status`, `approved_date`, `renewal_date`, `transaction_id`, `created`, `updated`, `receipt_id`.
*   **DUPLICATES / ORPHANED:**
    *   `transactionId` (CamelCase duplicate of `transaction_id`).

### 6. `temple_accounts` Collection
*   **USED:** `id`, `member_name`, `amount`, `category`, `date`, `month`, `year`, `transaction_id`, `status`, `classification`, `created`, `updated`.
*   **ORPHANED (Over-engineered for current UI):**
    *   `annadhanam_amount`, `temple_maintenance_amount`, `goshala_amount`, `veda_pathshala_amount`, `general_fund_amount`, `pooja_services_amount`. The frontend groups by `category` dynamically rather than using these hardcoded breakdown columns.

---

## PART C: FORM FIELD VALIDATION AUDIT

### 1. Signup Form (`SignupPage.jsx`)
*   **Fields:** `email`, `password`, `confirmPassword`, `preferredLanguage`, `membershipTier`
*   **Validation:** Passwords match, Terms accepted. 
*   **Mapping Issue:** Updates both `membershipTier` and `membership_type` in the database to prevent crashes.

### 2. Temple Donation Form (`TempleDonatePage.jsx`)
*   **Fields:** `donationCategory`, `donor_name`, `donor_email`, `donor_phone`, `amount`, `specialOccasion`, `transactionId`.
*   **Mapping Issue:** As noted above, the backend maps `donor_name`, `email`, and `phone` directly into the `notes` field because the PocketBase schema lacks these explicit columns.

### 3. Pooja Creation Form (`AdminPoojaCreate.jsx`)
*   **Fields:** `god`, `category`, `name`, `donation_amount`, `description`, `selectedDates`, `days`, `time_slots`.
*   **Mapping Issue:** Safely maps to the correct snake_case fields (`dates`, `days`, `time_slots`), bypassing the legacy camelCase columns.

---

## PART D: DATA FLOW VERIFICATION

### 1. Donation Workflow
*   **Flow:** `TempleDonatePage` -> `POST /donations` -> PB `donations.create()` -> Admin reviews -> `POST /donations/approve` -> PDF Generated -> Email Sent via Nodemailer -> PB `donations.update(status)`.
*   **Status:** ✅ Fully functional, but data architecture relies on parsing the `notes` field to extract the donor's email for the receipt.

### 2. Pooja Booking Workflow
*   **Flow:** `PoojaBookingPage` -> `PoojaCheckoutPage` -> PB `pooja_bookings.create()` -> PB Hook sends confirmation -> Admin approves -> `POST /pooja-bookings/send-confirmation` -> PDF Generated -> Email Sent.
*   **Status:** ✅ Fully functional. Real-time updates working via `pb.collection('pooja_bookings').subscribe()`.

### 3. Subscription Upgrades
*   **Flow:** `SignupPage` / `MyProfile` -> PB `users.update()` / `transactions.create()` -> Admin approves -> `POST /subscription/approve` -> `temple_accounts` record created -> PDF generated -> Email sent.
*   **Status:** ✅ Fully functional.

---

## PART E: FIELD CLEANUP RECOMMENDATIONS

### PRIORITY 1: CRITICAL SCHEMA UPDATES
Run these immediately to fix structural data issues.

**Target: `donations` Collection**
*   **ADD:** `donor_name` (Text)
*   **ADD:** `donor_email` (Email)
*   **ADD:** `donor_phone` (Text)
*   *Action:* Once added, update `apps/api/src/routes/donations.js` to stop packing this data into the `notes` field.

### PRIORITY 2: REMOVE DUPLICATE / REDUNDANT FIELDS
Removing these will clean up API responses and prevent developer confusion.

**Target: `poojas` Collection**
*   **REMOVE:** `time`, `timeSlots`, `deity`, `available_dates`, `specificDates`, `specificDays`, `createdAt`, `isArchived`, `archivedAt`, `availabilityType`.

**Target: `pooja_bookings` Collection**
*   **REMOVE:** `booking_status`, `created_at`, `updated_at`, `fee_amount`, `booking_time`, `booking_date`.

**Target: `users` Collection**
*   **REMOVE:** `membership_type` (Standardize strictly on `membershipTier`), `joinDate`, `fontSizePreference`.

**Target: `donations` Collection**
*   **REMOVE:** `created_at`, `receipt_created_at`, `receipt_generated_date` (Rely on `updated` when `status` changes to approved).

**Target: `subscriptions` Collection**
*   **REMOVE:** `transactionId` (Standardize strictly on `transaction_id`).

### PRIORITY 3: EXPRESS ROUTE PRUNING
*   Delete `GET`, `PATCH`, `DELETE` routes for `donations` and `pooja-bookings` inside the Express app. The frontend communicates with PocketBase directly for these operations, rendering the Express routes dead code.

---
**END OF REPORT**