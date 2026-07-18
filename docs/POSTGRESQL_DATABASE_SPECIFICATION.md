# PostgreSQL Database Specification

**Sri Siththi Vinayagar Temple — Enterprise PostgreSQL Database Design**
**Version:** 1.0 | **Date:** 2026-07-18 | **Status:** Pre-Implementation Specification
**Stack:** PostgreSQL 15+, Prisma ORM, Express 5, Node.js 22

---

## Table of Contents

- [PART 1 — Migration Philosophy](#part-1--migration-philosophy)
- [PART 2 — Complete Database Inventory](#part-2--complete-database-inventory)
- [PART 3 — Table Specifications](#part-3--table-specifications)
- [PART 4 — Relationship Design](#part-4--relationship-design)
- [PART 5 — Normalization Review](#part-5--normalization-review)
- [PART 6 — Index Design](#part-6--index-design)
- [PART 7 — Enum Strategy](#part-7--enum-strategy)
- [PART 8 — Data Integrity Rules](#part-8--data-integrity-rules)
- [PART 9 — Migration Mapping](#part-9--migration-mapping)
- [PART 10 — Migration Order](#part-10--migration-order)
- [PART 11 — Database Validation Checklist](#part-11--database-validation-checklist)
- [PART 12 — Master PostgreSQL Database Specification](#part-12--master-postgresql-database-specification)

---

# PART 1 — Migration Philosophy

## 1.1 Migration Principles

| Principle | Description |
|---|---|
| **Zero data loss** | Every record in PocketBase must have a corresponding record in PostgreSQL. No exceptions. Migration scripts include row-count verification after every table load. |
| **Schema-first** | PostgreSQL schema is created and validated before any data is migrated. Prisma migrations define the target schema. Data import happens after schema is stable. |
| **Idempotent migration** | Every migration step can be re-run safely. Duplicate runs produce identical results. Checksums verify data integrity after each step. |
| **Reversible at every checkpoint** | Each migration phase has a documented rollback procedure. If Phase 3 fails, the system reverts to Phase 2 state with zero data loss. |
| **Dual-write validation** | During cutover, both PocketBase and PostgreSQL receive writes for a defined period. Comparison queries verify consistency before cutting over reads. |
| **Preserve PocketBase IDs** | PB's 15-character alphanumeric IDs are stored in a temporary `_pbId` column during migration. After UUID mapping is verified, `_pbId` is dropped. This preserves referential integrity during the transition. |
| **No business logic changes** | Migration moves data as-is. Business logic changes (field deduplication, enum normalization) happen in the application layer after migration completes. |

## 1.2 Data Integrity Guarantees

| Guarantee | Mechanism |
|---|---|
| **Record count parity** | After each table migration, `SELECT COUNT(*)` in PB is compared to `SELECT COUNT(*)` in PG. Mismatch triggers halt. |
| **Referential integrity** | Foreign keys are validated after all tables are loaded. Orphan records are logged and resolved before cutover. |
| **Financial reconciliation** | Monetary totals (donations, payments, expenses, temple_accounts) are cross-checked between PB and PG. Cent-level discrepancies trigger investigation. |
| **File reference validation** | Every file path stored in PG is verified against the filesystem. Missing files are logged. |
| **Enum value validation** | Every enum field value is verified against the allowed enum set. Invalid values are mapped to a default or logged for manual review. |
| **Timestamp preservation** | All `created` and `updated` timestamps are preserved exactly from PocketBase. No timezone conversion. |

## 1.3 Zero Data Loss Strategy

```
Phase 1: Schema Creation
    └── Create PostgreSQL database + all tables
    └── Verify schema matches Prisma models
    └── CHECKPOINT: Schema validated

Phase 2: Data Export from PocketBase
    └── Export each collection to JSON via PB Admin API
    └── Export file attachments from pb_data/storage/
    └── Generate PB ID → UUID mapping file
    └── CHECKPOINT: All exports verified (file hashes)

Phase 3: Data Import to PostgreSQL
    └── Load data in dependency order (parent tables first)
    └── Run field transformations (deduplication, normalization)
    └── Verify row counts match
    └── CHECKPOINT: Row counts + checksums verified

Phase 4: Referential Integrity Validation
    └── Validate all foreign keys
    └── Validate all enum values
    └── Validate all financial totals
    └── CHECKPOINT: Integrity checks passed

Phase 5: API Cutover
    └── Deploy new API with PostgreSQL backend
    └── Enable dual-write (PB + PG)
    └── Compare read results for 24 hours
    └── Switch reads to PostgreSQL
    └── Stop writes to PocketBase
    └── CHECKPOINT: Cutover complete, PB archived
```

## 1.4 Referential Integrity Strategy

| Strategy | Description |
|---|---|
| **Foreign keys enforced** | All foreign key constraints are enforced at the database level. No orphan records allowed. |
| **Cascade rules** | `RESTRICT` for most relationships (prevent accidental deletion). `SET NULL` for optional relationships. No `CASCADE DELETE` except for child entities (booking_messages → pooja_bookings). |
| **Deferred constraints** | For complex transactions involving multiple tables, use deferred constraint checking to allow temporary inconsistencies within a transaction. |
| **Soft delete over hard delete** | All mutable entities use soft delete (`isDeleted` + `deletedAt`). Hard delete is reserved for purge operations with explicit admin confirmation. |
| **Audit trail** | Every mutation is logged to `audit_logs`. Even soft deletes are recorded with the performing user and timestamp. |

## 1.5 Backward Compatibility Assumptions

| Assumption | Impact |
|---|---|
| **PocketBase remains accessible during migration** | PB runs on port 8090 throughout migration. Dual-write period ensures no data loss. |
| **File paths change** | PB stores files in `pb_data/storage/`. New system stores in `uploads/`. Migration script copies files and updates paths. |
| **IDs change** | PB uses 15-char alphanumeric IDs. New system uses UUIDs. A mapping table links old to new IDs. |
| **Field names change** | PB uses snake_case. New system uses camelCase (Prisma convention). Migration script maps field names. |
| **Enum values change** | PB uses mixed case (`"Free Member"`). New system uses lowercase (`free_member`). Migration script normalizes values. |
| **Auth mechanism changes** | PB has built-in auth. New system uses JWT. Password hashes are preserved; auth middleware changes. |

---

# PART 2 — Complete Database Inventory

## 2.1 Table Summary

| # | Table Name | Source | Purpose | Est. Rows (Yr 1) | Growth |
|---|---|---|---|---|---|
| 1 | `users` | PB `_pb_users_auth_` | Core auth + profile | 500 | Low |
| 2 | `poojas` | PB `poojas` | Temple services catalog | 50 | Very low |
| 3 | `pooja_bookings` | PB `pooja_bookings` | Service bookings | 1,500 | Medium |
| 4 | `donations` | PB `donations` | User donations | 3,000 | Medium |
| 5 | `subscriptions` | PB `subscriptions` | Premium subscriptions | 300 | Low |
| 6 | `pending_subscriptions` | PB `pending_subscriptions` | Subscription approval queue | 100 | Low |
| 7 | `payments` | PB `payments` | Payment records | 1,000 | Medium |
| 8 | `approval_logs` | PB `approval_logs` | Approval audit trail | 500 | Low |
| 9 | `temple_accounts` | PB `temple_accounts` | Financial ledger | 2,000 | Medium |
| 10 | `expenses` | PB `expenses` | Expense tracking | 500 | Low |
| 11 | `expense_categories` | PB `expense_categories` | Expense classification | 20 | Very low |
| 12 | `classifications` | PB `classifications` | Expense sub-classification | 30 | Very low |
| 13 | `membership_fees` | PB `membership_fees` | Membership payments | 200 | Low |
| 14 | `gallery` | PB `gallery` | Media library | 1,000 | Medium |
| 15 | `photo_categories` | PB `photo_categories` | Gallery categories | 15 | Very low |
| 16 | `festivals` | PB `festivals` | Temple festivals | 30 | Very low |
| 17 | `volunteer_participation` | PB `volunteer_participation` | Volunteer tracking | 200 | Low |
| 18 | `admin_messages` | PB `admin_messages` | Admin-to-user messages | 500 | Low |
| 19 | `user_preferences` | PB `user_preferences` | Per-user settings | 400 | Low |
| 20 | `subscription_reminders` | PB `subscription_reminders` | Expiry notification tracking | 300 | Low |
| 21 | `booking_messages` | PB `booking_messages` | Booking chat | 500 | Low |
| 22 | `page_access` | PB `page_access` | Page permissions | 100 | Very low |
| 23 | `premium_upgrade_requests` | PB `premium_upgrade_requests` | Upgrade queue | 50 | Low |
| 24 | `_integrated_ai_messages` | PB `_integratedAiMessages` | AI chat history | 5,000 | High |
| 25 | `_integrated_ai_images` | PB `_integratedAiImages` | AI-generated images | 500 | Medium |
| 26 | `payment_accounts` | PB `payment_accounts` | Bank/QR config | 5 | Very low |
| 27 | `contact_inquiries` | PB `contact_inquiries` | Contact form submissions | 100 | Low |
| 28 | `notifications` | PB `notifications` | In-app notifications | 2,000 | Medium |
| 29 | `account_types` | PB `account_types` | Account type definitions | 10 | Very low |
| 30 | `bank_account_config` | PB `bank_account_config` | Bank account configuration | 3 | Very low |
| 31 | `vouchers` | PB `vouchers` | Expense vouchers | 400 | Low |
| 32 | `audit_logs` | New (no PB equivalent) | System-wide audit trail | 10,000 | High |
| 33 | `email_queue` | New (no PB equivalent) | Email delivery queue | 500 | Medium |
| 34 | `email_dead_letter` | New (no PB equivalent) | Failed emails for review | 50 | Low |

**Total tables: 34** (31 migrated from PocketBase + 3 new)

## 2.2 Table Categories

### Core Domain Tables (25)

These tables represent the primary business entities migrated from PocketBase's 25 active collections:

```
AUTH & USERS
├── users (core auth + profile)

POOJA BOOKING
├── poojas (service catalog)
├── pooja_bookings (user bookings)
├── booking_messages (per-booking chat)

DONATIONS & PAYMENTS
├── donations (user donations)
├── payments (payment records)
├── premium_upgrade_requests (upgrade queue)

SUBSCRIPTIONS
├── subscriptions (premium memberships)
├── pending_subscriptions (approval queue)
├── subscription_reminders (expiry tracking)

FINANCIAL
├── temple_accounts (financial ledger)
├── expenses (expense tracking)
├── expense_categories (expense classification)
├── classifications (expense sub-classification)
├── vouchers (expense vouchers)
├── membership_fees (membership payments)

GALLERY & FESTIVALS
├── gallery (media library)
├── photo_categories (gallery categories)
├── festivals (temple festivals)

MESSAGING & NOTIFICATIONS
├── admin_messages (admin-to-user)
├── notifications (in-app notifications)

USER MANAGEMENT
├── user_preferences (per-user settings)
├── volunteer_participation (volunteer tracking)
├── page_access (page permissions)
├── approval_logs (approval audit trail)

AI INTEGRATION
├── _integrated_ai_messages (chat history)
├── _integrated_ai_images (generated images)

CONFIGURATION
├── payment_accounts (bank/QR config)
├── account_types (account type definitions)
├── bank_account_config (bank account config)
├── contact_inquiries (contact form)
```

### Infrastructure Tables (3)

These tables are new — no PocketBase equivalent. Created to support operational requirements identified in the architecture blueprints:

```
INFRASTRUCTURE
├── audit_logs (system-wide audit trail)
├── email_queue (email delivery queue)
├── email_dead_letter (failed emails)
```

## 2.3 Dependency Graph

```
                        ┌──────────┐
                        │  users   │
                        └────┬─────┘
                             │
        ┌────────────────────┼────────────────────────────┐
        │                    │                            │
        ▼                    ▼                            ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│ pooja_bookings│  │  subscriptions  │  │       donations      │
└───────┬───────┘  └────────┬────────┘  └──────────────────────┘
        │                   │
        ▼                   ▼
┌───────────────┐  ┌─────────────────────┐
│booking_messages│  │pending_subscriptions │
└───────────────┘  └─────────────────────┘

┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  expenses     │  │  gallery        │  │  notifications   │
└───────┬───────┘  └────────┬────────┘  └──────────────────┘
        │                   │
        ▼                   ▼
┌───────────────┐  ┌─────────────────┐
│expense_categories│ │photo_categories │
└───────────────┘  └─────────────────┘

┌───────────────┐  ┌─────────────────┐
│  festivals    │  │  poojas         │
└───────────────┘  └────────┬────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │ pooja_bookings  │
                    └─────────────────┘
```

---

# PART 3 — Table Specifications

## 3.1 users

**Purpose:** Core authentication and profile data. Replaces PocketBase's built-in `_pb_users_auth_` collection with 45+ modifications.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | Replaces PB's 15-char alphanumeric ID |
| `email` | VARCHAR(320) | NOT NULL | — | UNIQUE | Login credential, max 320 chars (RFC 5321) |
| `name` | VARCHAR(100) | NOT NULL | — | CHECK (length >= 2) | Merged from `full_name`, `fullName` |
| `password` | VARCHAR(255) | NOT NULL | — | — | bcrypt hash, min 8 chars |
| `avatar` | TEXT | NULLABLE | NULL | — | File path to avatar image |
| `verified` | BOOLEAN | NOT NULL | `false` | — | Email verification status |
| `emailVisibility` | BOOLEAN | NOT NULL | `false` | — | Whether email is publicly visible |
| `tokenKey` | VARCHAR(255) | NULLABLE | NULL | UNIQUE | Password reset token key |
| `lastResetSentAt` | TIMESTAMPTZ | NULLABLE | NULL | — | Rate-limiting password resets |
| `lastVerificationSentAt` | TIMESTAMPTZ | NULLABLE | NULL | — | Rate-limiting email verification |
| `role` | UserRole enum | NOT NULL | `'user'` | — | System RBAC role |
| `membershipTier` | MembershipTier enum | NOT NULL | `'free'` | — | Current membership tier |
| `membershipType` | MembershipTier enum | NOT NULL | `'free'` | — | Membership type (deduplicated) |
| `subscriptionStatus` | SubscriptionStatus enum | NOT NULL | `'free'` | — | Subscription status |
| `premiumStatus` | PremiumStatus enum | NOT NULL | `'Inactive'` | — | Premium status |
| `approvalStatus` | ApprovalStatus enum | NOT NULL | `'pending_approval'` | — | Approval status |
| `accountType` | AccountType enum | NOT NULL | `'free_member'` | — | Display label |
| `phone` | VARCHAR(15) | NULLABLE | NULL | — | Contact number |
| `address` | VARCHAR(200) | NULLABLE | NULL | — | Street address |
| `city` | VARCHAR(50) | NULLABLE | NULL | — | City |
| `state` | VARCHAR(50) | NULLABLE | NULL | — | State |
| `pincode` | VARCHAR(6) | NULLABLE | NULL | CHECK (length = 6) | Postal code |
| `preferredLanguage` | PreferredLanguage enum | NULLABLE | NULL | — | UI language preference |
| `fontSizePreference` | FontSizePreference enum | NOT NULL | `'normal'` | — | Font size |
| `joinDate` | TIMESTAMPTZ | NOT NULL | `now()` | — | Account creation date |
| `subscriptionExpiryDate` | TIMESTAMPTZ | NULLABLE | NULL | — | When subscription expires |
| `lastRenewalDate` | TIMESTAMPTZ | NULLABLE | NULL | — | Last renewal date |
| `isBlocked` | BOOLEAN | NOT NULL | `false` | — | Whether user is blocked |
| `blockedAt` | TIMESTAMPTZ | NULLABLE | NULL | — | When user was blocked |
| `isDeleted` | BOOLEAN | NOT NULL | `false` | — | Soft delete flag |
| `deletedAt` | TIMESTAMPTZ | NULLABLE | NULL | — | Soft delete timestamp |
| `archived` | BOOLEAN | NOT NULL | `false` | — | Archive flag |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | Record creation timestamp |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | Record update timestamp (Prisma @updatedAt) |

**Unique constraints:** `email`, `tokenKey`
**Check constraints:** `length(name) >= 2`, `length(pincode) = 6` (when not null)
**Estimated size:** 500 rows (Year 1), 5,000 rows (Year 5)

## 3.2 poojas

**Purpose:** Temple services/events catalog. Replaces PB `poojas` collection (recreated at migration 1774618478).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `name` | VARCHAR(255) | NOT NULL | — | — | Service name |
| `description` | TEXT | NULLABLE | NULL | — | Service description |
| `category` | PoojaCategory enum | NOT NULL | `'daily'` | — | Service category |
| `donationAmount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount >= 0) | Suggested donation |
| `price` | DECIMAL(10,2) | NULLABLE | NULL | CHECK (price >= 0) | Fixed price (if applicable) |
| `availabilityType` | VARCHAR(50) | NULLABLE | NULL | — | Availability pattern type |
| `dates` | JSONB | NULLABLE | NULL | — | Array of date strings |
| `days` | JSONB | NULLABLE | NULL | — | Array of day names |
| `specificDates` | JSONB | NULLABLE | NULL | — | Specific available dates |
| `specificDays` | JSONB | NULLABLE | NULL | — | Specific available days |
| `timeSlots` | JSONB | NULLABLE | NULL | — | Available time slots |
| `status` | PoojaStatus enum | NOT NULL | `'active'` | — | Current status |
| `isArchived` | BOOLEAN | NOT NULL | `false` | — | Archive flag |
| `archivedAt` | TIMESTAMPTZ | NULLABLE | NULL | — | Archive timestamp |
| `isDeleted` | BOOLEAN | NOT NULL | `false` | — | Soft delete flag |
| `festivalId` | UUID | NULLABLE | NULL | FK → festivals(id) | Linked festival |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `festivalId` → `festivals(id)` ON DELETE SET NULL
**Estimated size:** 50 rows, very low growth

## 3.3 pooja_bookings

**Purpose:** User bookings for temple services. Replaces PB `pooja_bookings` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | UUID | NOT NULL | — | FK → users(id) | Booking user |
| `poojaId` | UUID | NOT NULL | — | FK → poojas(id) | Booked service |
| `name` | VARCHAR(255) | NOT NULL | — | — | Booker name (denormalized) |
| `email` | VARCHAR(320) | NOT NULL | — | — | Booker email (denormalized) |
| `userContact` | VARCHAR(15) | NULLABLE | NULL | — | Contact number |
| `phone` | VARCHAR(15) | NULLABLE | NULL | — | Phone (legacy) |
| `bookingDate` | TIMESTAMPTZ | NULLABLE | NULL | — | When booking was made |
| `poojaDate` | TIMESTAMPTZ | NULLABLE | NULL | — | Date of pooja |
| `timeSlot` | VARCHAR(50) | NULLABLE | NULL | — | Time slot (legacy) |
| `selectedDate` | VARCHAR(50) | NULLABLE | NULL | — | Selected date string |
| `selectedTimeSlot` | VARCHAR(50) | NULLABLE | NULL | — | Selected time slot |
| `donationAmount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount >= 1) | Donation amount |
| `bookingStatus` | BookingStatus enum | NOT NULL | `'pending'` | — | Booking status |
| `paymentStatus` | PaymentStatus enum | NULLABLE | NULL | — | Payment status |
| `status` | VARCHAR(50) | NULLABLE | NULL | — | Legacy status (migration only) |
| `receiptNumber` | VARCHAR(50) | NULLABLE | NULL | UNIQUE | Receipt number |
| `transactionId` | VARCHAR(100) | NULLABLE | NULL | — | Payment transaction ID |
| `notes` | TEXT | NULLABLE | NULL | — | Booking notes |
| `poojaName` | VARCHAR(255) | NULLABLE | NULL | — | Pooja name (denormalized) |
| `bookingTime` | TIMESTAMPTZ | NULLABLE | NULL | — | Booking timestamp |
| `isDeleted` | BOOLEAN | NOT NULL | `false` | — | Soft delete flag |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `userId` → `users(id)` ON DELETE RESTRICT, `poojaId` → `poojas(id)` ON DELETE RESTRICT
**Check constraints:** `donationAmount >= 1`
**Unique constraints:** `receiptNumber` (when not null)
**Estimated size:** 1,500 rows (Year 1), 20,000 rows (Year 5)

## 3.4 donations

**Purpose:** User donations. Replaces PB `donations` collection (created at migration 1774778965).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | UUID | NOT NULL | — | FK → users(id) | Donor |
| `amount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount > 0) | Donation amount |
| `donationDate` | TIMESTAMPTZ | NULLABLE | NULL | — | When donation was made |
| `donationDescription` | TEXT | NULLABLE | NULL | — | Donation description |
| `specialOccasion` | VARCHAR(255) | NULLABLE | NULL | — | Special occasion |
| `category` | VARCHAR(100) | NULLABLE | NULL | — | Donation category |
| `status` | PaymentApprovalStatus enum | NULLABLE | `'pending'` | — | Approval status |
| `approvalDate` | TIMESTAMPTZ | NULLABLE | NULL | — | When approved |
| `paymentStatus` | PaymentStatus enum | NULLABLE | NULL | — | Payment status |
| `receiptNumber` | VARCHAR(50) | NULLABLE | NULL | UNIQUE | Receipt number |
| `receiptPdf` | VARCHAR(500) | NULLABLE | NULL | — | Receipt file path |
| `receiptGeneratedAt` | TIMESTAMPTZ | NULLABLE | NULL | — | When receipt was generated |
| `contactNumber` | VARCHAR(15) | NULLABLE | NULL | — | Contact (denormalized) |
| `email` | VARCHAR(320) | NULLABLE | NULL | — | Email (denormalized) |
| `communicationPreference` | VARCHAR(50) | NULLABLE | NULL | — | Communication preference |
| `isDeleted` | BOOLEAN | NOT NULL | `false` | — | Soft delete flag |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `userId` → `users(id)` ON DELETE RESTRICT
**Unique constraints:** `receiptNumber` (when not null)
**Estimated size:** 3,000 rows (Year 1), 40,000 rows (Year 5)

## 3.5 subscriptions

**Purpose:** Premium membership subscriptions. Replaces PB `subscriptions` collection (recreated 3 times, final at migration 1776496828).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | UUID | NOT NULL | — | FK → users(id) | Subscriber |
| `planType` | SubscriptionPlanType enum | NOT NULL | `'premium'` | — | Plan type |
| `amount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount >= 0) | Base amount |
| `billingCycle` | VARCHAR(100) | NOT NULL | — | — | Billing cycle |
| `customDonation` | DECIMAL(10,2) | NULLABLE | NULL | — | Custom donation amount |
| `totalAmount` | DECIMAL(10,2) | NOT NULL | — | CHECK (totalAmount >= 0) | Total amount |
| `durationMonths` | INTEGER | NOT NULL | — | CHECK (durationMonths >= 1 AND durationMonths <= 120) | Duration in months |
| `renewalType` | RenewalType enum | NOT NULL | — | — | Auto or manual renewal |
| `startDate` | TIMESTAMPTZ | NOT NULL | — | — | Subscription start |
| `endDate` | TIMESTAMPTZ | NOT NULL | — | CHECK (endDate > startDate) | Subscription end |
| `status` | SubscriptionRecordStatus enum | NOT NULL | `'pending'` | — | Record status |
| `transactionId` | VARCHAR(100) | NULLABLE | NULL | — | Payment transaction ID |
| `transactionRef` | VARCHAR(100) | NULLABLE | NULL | — | Transaction reference |
| `adminNotes` | TEXT | NULLABLE | NULL | — | Admin notes |
| `description` | TEXT | NULLABLE | NULL | — | Description |
| `userIdText` | VARCHAR(100) | NULLABLE | NULL | — | Legacy PB user_id (migration only) |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `userId` → `users(id)` ON DELETE RESTRICT
**Check constraints:** `amount >= 0`, `totalAmount >= 0`, `durationMonths >= 1 AND durationMonths <= 120`, `endDate > startDate`
**Estimated size:** 300 rows (Year 1), 4,000 rows (Year 5)

## 3.6 pending_subscriptions

**Purpose:** Subscription approval queue. Replaces PB `pending_subscriptions` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `email` | VARCHAR(320) | NOT NULL | — | — | Applicant email |
| `fullName` | VARCHAR(255) | NOT NULL | — | — | Applicant name |
| `contactNumber` | VARCHAR(15) | NOT NULL | — | — | Contact number |
| `subscriptionType` | VARCHAR(50) | NOT NULL | — | — | Subscription type |
| `transactionId` | VARCHAR(100) | NOT NULL | — | — | Transaction ID |
| `userId` | UUID | NOT NULL | — | FK → users(id) | Applicant user |
| `subscriptionId` | UUID | NOT NULL | — | FK → subscriptions(id) | Linked subscription |
| `status` | BookingStatus enum | NOT NULL | `'pending'` | — | Queue status |
| `paymentStatus` | PaymentStatus enum | NOT NULL | — | — | Payment status |
| `startDate` | TIMESTAMPTZ | NOT NULL | — | — | Subscription start |
| `endDate` | TIMESTAMPTZ | NOT NULL | — | — | Subscription end |
| `renewalDate` | TIMESTAMPTZ | NULLABLE | NULL | — | Renewal date |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `userId` → `users(id)` ON DELETE RESTRICT, `subscriptionId` → `subscriptions(id)` ON DELETE RESTRICT
**Estimated size:** 100 rows (Year 1), 1,000 rows (Year 5)

## 3.7 payments

**Purpose:** Payment records. Replaces PB `payments` collection (created at migration 1777109972).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | UUID | NOT NULL | — | FK → users(id) | Payer |
| `approvedById` | UUID | NULLABLE | NULL | FK → users(id) | Approving admin |
| `amount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount > 0) | Payment amount |
| `totalAmount` | DECIMAL(10,2) | NOT NULL | — | CHECK (totalAmount > 0) | Total amount |
| `customDonation` | DECIMAL(10,2) | NULLABLE | NULL | — | Custom donation |
| `planType` | VARCHAR(50) | NULLABLE | NULL | — | Plan type |
| `billingCycle` | VARCHAR(100) | NOT NULL | — | — | Billing cycle |
| `subscriptionType` | VARCHAR(50) | NULLABLE | NULL | — | Subscription type |
| `startDate` | TIMESTAMPTZ | NOT NULL | — | — | Start date |
| `endDate` | TIMESTAMPTZ | NOT NULL | — | — | End date |
| `status` | PaymentApprovalStatus enum | NULLABLE | NULL | — | Approval status |
| `paymentStatus` | PaymentStatus enum | NULLABLE | NULL | — | Payment status |
| `transactionId` | VARCHAR(100) | NULLABLE | NULL | — | Transaction ID |
| `transactionRef` | VARCHAR(100) | NULLABLE | NULL | — | Transaction reference |
| `paymentMethod` | VARCHAR(50) | NULLABLE | NULL | — | Payment method |
| `receiptPdf` | VARCHAR(500) | NULLABLE | NULL | — | Receipt file path |
| `receiptId` | VARCHAR(100) | NULLABLE | NULL | — | Receipt ID |
| `receiptNumber` | VARCHAR(50) | NULLABLE | NULL | UNIQUE | Receipt number |
| `receiptGeneratedAt` | TIMESTAMPTZ | NULLABLE | NULL | — | When receipt generated |
| `receiptSentAt` | TIMESTAMPTZ | NULLABLE | NULL | — | When receipt sent |
| `resendReceipt` | BOOLEAN | NOT NULL | `false` | — | Resend flag |
| `adminNotes` | TEXT | NULLABLE | NULL | — | Admin notes |
| `approvedAt` | TIMESTAMPTZ | NULLABLE | NULL | — | Approval timestamp |
| `email` | VARCHAR(320) | NOT NULL | — | — | Payer email (denormalized) |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `userId` → `users(id)` ON DELETE RESTRICT, `approvedById` → `users(id)` ON DELETE SET NULL
**Unique constraints:** `receiptNumber` (when not null)
**Estimated size:** 1,000 rows (Year 1), 15,000 rows (Year 5)

## 3.8 approval_logs

**Purpose:** Subscription approval audit trail. Replaces PB `approval_logs` collection (created at migration 1776571755).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `adminId` | UUID | NOT NULL | — | FK → users(id) | Admin who performed action |
| `adminName` | VARCHAR(255) | NOT NULL | — | — | Admin name (denormalized) |
| `action` | ApprovalLogAction enum | NOT NULL | — | — | Action performed |
| `timestamp` | TIMESTAMPTZ | NOT NULL | `now()` | — | When action was performed |
| `notes` | TEXT | NULLABLE | NULL | — | Action notes |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `adminId` → `users(id)` ON DELETE RESTRICT
**Estimated size:** 500 rows (Year 1), 5,000 rows (Year 5)

## 3.9 temple_accounts

**Purpose:** Financial ledger entries. Replaces PB `temple_accounts` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `memberName` | VARCHAR(255) | NOT NULL | — | — | Member name |
| `amount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount >= 0) | Transaction amount |
| `category` | VARCHAR(100) | NOT NULL | — | — | Account category |
| `date` | DATE | NOT NULL | — | — | Transaction date |
| `month` | VARCHAR(20) | NULLABLE | NULL | — | Month string |
| `year` | INTEGER | NULLABLE | NULL | — | Year |
| `classification` | VARCHAR(100) | NOT NULL | — | — | Transaction classification |
| `description` | TEXT | NULLABLE | NULL | — | Description |
| `transactionId` | VARCHAR(100) | NOT NULL | — | — | Source transaction ID |
| `subscriptionId` | VARCHAR(100) | NULLABLE | NULL | — | Subscription reference |
| `status` | VARCHAR(50) | NULLABLE | NULL | — | Status |
| `notes` | TEXT | NULLABLE | NULL | — | Notes |
| `entryType` | VARCHAR(50) | NULLABLE | NULL | — | Entry type |
| `subscriptionType` | SubscriptionType enum | NULLABLE | NULL | — | Monthly or Yearly |
| `annadhanamAmount` | DECIMAL(10,2) | NULLABLE | NULL | — | Fund breakdown |
| `templeMaintenanceAmount` | DECIMAL(10,2) | NULLABLE | NULL | — | Fund breakdown |
| `goshalaAmount` | DECIMAL(10,2) | NULLABLE | NULL | — | Fund breakdown |
| `vedaPathshalaAmount` | DECIMAL(10,2) | NULLABLE | NULL | — | Fund breakdown |
| `generalFundAmount` | DECIMAL(10,2) | NULLABLE | NULL | — | Fund breakdown |
| `totalAmount` | DECIMAL(10,2) | NULLABLE | NULL | — | Fund breakdown total |
| `poojaServicesAmount` | DECIMAL(10,2) | NULLABLE | NULL | — | Fund breakdown |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 2,000 rows (Year 1), 30,000 rows (Year 5)

## 3.10 expenses

**Purpose:** Temple expense records. Replaces PB `expenses` collection (created at migration 1775898945).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `categoryId` | UUID | NOT NULL | — | FK → expense_categories(id) | Expense category |
| `amount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount >= 0.01) | Expense amount |
| `date` | DATE | NOT NULL | — | — | Expense date |
| `paidTo` | VARCHAR(255) | NULLABLE | NULL | — | Payee |
| `paymentMethod` | VARCHAR(50) | NULLABLE | NULL | — | Payment method |
| `billFile` | VARCHAR(500) | NULLABLE | NULL | — | Bill file path |
| `createdBy` | VARCHAR(255) | NOT NULL | — | — | Creator name |
| `quantity` | INTEGER | NULLABLE | NULL | CHECK (quantity >= 0) | Item quantity |
| `classification` | VARCHAR(100) | NULLABLE | NULL | — | Classification |
| `voucherId` | VARCHAR(100) | NULLABLE | NULL | — | Voucher reference |
| `description` | TEXT | NULLABLE | NULL | — | Description |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `categoryId` → `expense_categories(id)` ON DELETE RESTRICT
**Check constraints:** `amount >= 0.01`, `quantity >= 0` (when not null)
**Estimated size:** 500 rows (Year 1), 7,000 rows (Year 5)

## 3.11 expense_categories

**Purpose:** Expense classification. Replaces PB `expense_categories` collection (created at migration 1775898944).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `name` | VARCHAR(255) | NOT NULL | — | UNIQUE | Category name |
| `description` | TEXT | NULLABLE | NULL | — | Category description |
| `createdBy` | VARCHAR(255) | NULLABLE | NULL | — | Creator |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Unique constraints:** `name`
**Estimated size:** 20 rows, very low growth

## 3.12 classifications

**Purpose:** Expense sub-classification. Replaces PB `classifications` collection (created at migration 1775914043).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `name` | VARCHAR(255) | NOT NULL | — | UNIQUE | Classification name |
| `description` | TEXT | NULLABLE | NULL | — | Classification description |
| `createdBy` | VARCHAR(255) | NULLABLE | NULL | — | Creator |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Unique constraints:** `name`
**Estimated size:** 30 rows, very low growth

## 3.13 membership_fees

**Purpose:** Membership payment records. Replaces PB `membership_fees` collection (created at migration 1774619065).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | VARCHAR(100) | NOT NULL | — | — | User reference (legacy text FK) |
| `amount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount >= 0) | Fee amount |
| `signupDate` | DATE | NOT NULL | — | — | Signup date |
| `createdAtField` | TIMESTAMPTZ | NULLABLE | `now()` | — | Legacy creation timestamp |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Note:** `userId` is stored as VARCHAR(100) (legacy text FK from PocketBase). Future migration may promote to UUID FK.
**Estimated size:** 200 rows (Year 1), 2,000 rows (Year 5)

## 3.14 gallery

**Purpose:** Media library. Replaces PB `gallery` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `title` | VARCHAR(255) | NOT NULL | — | — | Image title |
| `description` | TEXT | NULLABLE | NULL | — | Image description |
| `image` | VARCHAR(500) | NULLABLE | NULL | — | File path |
| `uploadedBy` | VARCHAR(255) | NULLABLE | NULL | — | Uploader name |
| `order` | INTEGER | NULLABLE | NULL | — | Display order |
| `categoryId` | UUID | NULLABLE | NULL | FK → photo_categories(id) | Category |
| `isPublished` | BOOLEAN | NOT NULL | `false` | — | Published flag |
| `archived` | BOOLEAN | NOT NULL | `false` | — | Archive flag |
| `storageSize` | INTEGER | NULLABLE | NULL | — | File size in bytes |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `categoryId` → `photo_categories(id)` ON DELETE SET NULL
**Estimated size:** 1,000 rows (Year 1), 12,000 rows (Year 5)

## 3.15 photo_categories

**Purpose:** Gallery category classification. Replaces PB `photo_categories` collection (created at migration 1775878065).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `name` | VARCHAR(255) | NOT NULL | — | UNIQUE | Category name |
| `description` | TEXT | NULLABLE | NULL | — | Description |
| `createdBy` | VARCHAR(255) | NULLABLE | NULL | — | Creator |
| `defaultExpanded` | BOOLEAN | NOT NULL | `false` | — | UI default |
| `isPublished` | BOOLEAN | NOT NULL | `false` | — | Published flag |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Unique constraints:** `name`
**Estimated size:** 15 rows, very low growth

## 3.16 festivals

**Purpose:** Temple festivals. Replaces PB `festivals` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `name` | VARCHAR(255) | NOT NULL | — | — | Festival name |
| `description` | TEXT | NULLABLE | NULL | — | Description |
| `date` | DATE | NULLABLE | NULL | — | Festival date |
| `status` | FestivalStatus enum | NULLABLE | NULL | — | Status |
| `image` | VARCHAR(500) | NULLABLE | NULL | — | File path |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 30 rows, very low growth

## 3.17 volunteer_participation

**Purpose:** Volunteer event tracking. Replaces PB `volunteer_participation` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | VARCHAR(100) | NOT NULL | — | — | Volunteer (legacy text FK) |
| `eventName` | VARCHAR(255) | NOT NULL | — | — | Event name |
| `participationDate` | DATE | NOT NULL | — | — | Date of participation |
| `hours` | INTEGER | NULLABLE | NULL | CHECK (hours >= 0) | Hours volunteered |
| `status` | VolunteerStatus enum | NULLABLE | NULL | — | Status |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Note:** `userId` is stored as VARCHAR(100) (legacy text FK). May be promoted to UUID FK in future.
**Estimated size:** 200 rows (Year 1), 2,000 rows (Year 5)

## 3.18 admin_messages

**Purpose:** Admin-to-user communications. Replaces PB `admin_messages` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | VARCHAR(100) | NOT NULL | — | — | Recipient (legacy text FK) |
| `message` | TEXT | NOT NULL | — | — | Message content |
| `languagePreference` | PreferredLanguage enum | NULLABLE | NULL | — | Language |
| `sentDate` | TIMESTAMPTZ | NULLABLE | `now()` | — | When sent |
| `readStatus` | BOOLEAN | NOT NULL | `false` | — | Read status |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Note:** `userId` is stored as VARCHAR(100) (legacy text FK).
**Estimated size:** 500 rows (Year 1), 3,000 rows (Year 5)

## 3.19 user_preferences

**Purpose:** Per-user settings. Replaces PB `user_preferences` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | VARCHAR(100) | NOT NULL | — | UNIQUE | User (legacy text FK) |
| `preferredLanguage` | PreferredLanguage enum | NULLABLE | NULL | — | Language preference |
| `communicationLanguage` | VARCHAR(50) | NULLABLE | NULL | — | Communication language |
| `notificationPreference` | NotificationPreference enum | NULLABLE | NULL | — | Notification preference |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Unique constraints:** `userId`
**Estimated size:** 400 rows (Year 1), 5,000 rows (Year 5)

## 3.20 subscription_reminders

**Purpose:** Expiry notification tracking. Replaces PB `subscription_reminders` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `email` | VARCHAR(320) | NOT NULL | — | — | Recipient email |
| `subscriptionId` | VARCHAR(100) | NOT NULL | — | — | Subscription reference (legacy) |
| `reminderDate` | DATE | NOT NULL | — | — | When reminder was sent |
| `sentDate` | TIMESTAMPTZ | NULLABLE | NULL | — | When email was sent |
| `status` | SubscriptionReminderStatus enum | NULLABLE | NULL | — | Delivery status |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 300 rows (Year 1), 3,000 rows (Year 5)

## 3.21 booking_messages

**Purpose:** Chat per booking. Replaces PB `booking_messages` collection (created at migration 1774768485).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `bookingId` | UUID | NOT NULL | — | FK → pooja_bookings(id) | Parent booking |
| `senderType` | BookingMessageSenderType enum | NOT NULL | — | — | admin or user |
| `senderEmail` | VARCHAR(320) | NOT NULL | — | — | Sender email |
| `messageContent` | TEXT | NOT NULL | — | — | Message text |
| `readStatus` | BOOLEAN | NOT NULL | `false` | — | Read status |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `bookingId` → `pooja_bookings(id)` ON DELETE CASCADE
**Estimated size:** 500 rows (Year 1), 5,000 rows (Year 5)

## 3.22 page_access

**Purpose:** Per-user page permissions. Replaces PB `page_access` collection (recreated at migration 1777815441).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | VARCHAR(100) | NOT NULL | — | — | User (legacy text FK) |
| `pageRoute` | VARCHAR(255) | NOT NULL | — | — | Page route |
| `accessLevel` | PageAccessLevel enum | NOT NULL | `'view'` | — | Access level |
| `grantedAt` | TIMESTAMPTZ | NULLABLE | `now()` | — | When granted |
| `grantedBy` | VARCHAR(100) | NULLABLE | NULL | — | Who granted |
| `isActive` | BOOLEAN | NOT NULL | `true` | — | Active flag |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 100 rows (Year 1), 500 rows (Year 5)

## 3.23 premium_upgrade_requests

**Purpose:** Upgrade application queue. Replaces PB `premium_upgrade_requests` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `email` | VARCHAR(320) | NOT NULL | — | — | Applicant email |
| `transactionId` | VARCHAR(100) | NOT NULL | — | — | Transaction ID |
| `status` | PaymentApprovalStatus enum | NULLABLE | NULL | — | Request status |
| `membershipType` | VARCHAR(50) | NOT NULL | — | — | Membership type |
| `adminNotes` | TEXT | NULLABLE | NULL | — | Admin notes |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 50 rows (Year 1), 500 rows (Year 5)

## 3.24 _integrated_ai_messages

**Purpose:** AI chat history. Replaces PB `_integratedAiMessages` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | VARCHAR(100) | NULLABLE | NULL | — | User (legacy text FK, nullable for anonymous) |
| `role` | AiMessageRole enum | NOT NULL | — | — | user or assistant |
| `content` | JSONB | NOT NULL | — | — | Message content |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 5,000 rows (Year 1), 75,000 rows (Year 5) — high growth

## 3.25 _integrated_ai_images

**Purpose:** AI-generated images. Replaces PB `_integratedAiImages` collection.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `file` | VARCHAR(500) | NOT NULL | — | — | File path |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 500 rows (Year 1), 6,000 rows (Year 5)

## 3.26 payment_accounts

**Purpose:** Bank account / QR code configuration. Replaces PB `payment_accounts` collection (created at migration 1775218002).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `accountName` | VARCHAR(255) | NOT NULL | — | — | Account holder name |
| `bankName` | VARCHAR(255) | NOT NULL | — | — | Bank name |
| `accountNumber` | VARCHAR(50) | NOT NULL | — | — | Account number |
| `email` | VARCHAR(320) | NOT NULL | — | — | Account email |
| `qrCode` | VARCHAR(500) | NULLABLE | NULL | — | QR code file path |
| `iban` | VARCHAR(50) | NULLABLE | NULL | — | IBAN |
| `paymentLink` | VARCHAR(500) | NULLABLE | NULL | — | Payment link URL |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 5 rows, very low growth

## 3.27 contact_inquiries

**Purpose:** Contact form submissions. Replaces PB `contact_inquiries` collection (created at migration 1775491364).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `name` | VARCHAR(255) | NOT NULL | — | — | Contact name |
| `email` | VARCHAR(320) | NOT NULL | — | — | Contact email |
| `phone` | VARCHAR(15) | NULLABLE | NULL | — | Contact phone |
| `subject` | VARCHAR(255) | NOT NULL | — | — | Inquiry subject |
| `message` | TEXT | NOT NULL | — | — | Inquiry message |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 100 rows (Year 1), 1,000 rows (Year 5)

## 3.28 notifications

**Purpose:** In-app notifications. Replaces PB `notifications` collection (recreated at migration 1776359225).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `userId` | VARCHAR(100) | NOT NULL | — | — | Recipient (legacy text FK) |
| `title` | VARCHAR(255) | NOT NULL | — | — | Notification title |
| `message` | TEXT | NOT NULL | — | — | Notification body |
| `type` | VARCHAR(50) | NOT NULL | — | — | Notification type |
| `isRead` | BOOLEAN | NOT NULL | `false` | — | Read status |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 2,000 rows (Year 1), 20,000 rows (Year 5) — cleaned up weekly

## 3.29 account_types

**Purpose:** Account type definitions. Replaces PB `account_types` collection (created at migration 1776943003).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `name` | VARCHAR(255) | NOT NULL | — | UNIQUE | Type name |
| `description` | TEXT | NULLABLE | NULL | — | Type description |
| `permissions` | JSONB | NULLABLE | NULL | — | Permission set |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Unique constraints:** `name`
**Estimated size:** 10 rows, very low growth

## 3.30 bank_account_config

**Purpose:** Bank account configuration. Replaces PB `bank_account_config` collection (created at migration 1776974261).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `bankName` | VARCHAR(255) | NOT NULL | — | — | Bank name |
| `accountHolderName` | VARCHAR(255) | NOT NULL | — | — | Account holder |
| `accountNumber` | VARCHAR(50) | NOT NULL | — | — | Account number |
| `iban` | VARCHAR(50) | NULLABLE | NULL | — | IBAN |
| `contactEmail` | VARCHAR(320) | NOT NULL | — | — | Contact email |
| `directPaymentLink` | VARCHAR(500) | NULLABLE | NULL | — | Payment link |
| `qrCodeImage` | VARCHAR(500) | NULLABLE | NULL | — | QR code file path |
| `isActive` | BOOLEAN | NOT NULL | `true` | — | Active flag |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Estimated size:** 3 rows, very low growth

## 3.31 vouchers

**Purpose:** Expense vouchers. Replaces PB `vouchers` collection (created at migration 1775914045).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `voucherId` | VARCHAR(100) | NOT NULL | — | UNIQUE | Voucher identifier |
| `expenseId` | UUID | NULLABLE | NULL | FK → expenses(id) | Linked expense |
| `amount` | DECIMAL(10,2) | NOT NULL | — | CHECK (amount >= 0) | Voucher amount |
| `category` | VARCHAR(100) | NULLABLE | NULL | — | Category |
| `paidTo` | VARCHAR(255) | NULLABLE | NULL | — | Payee |
| `date` | DATE | NULLABLE | NULL | — | Voucher date |
| `description` | TEXT | NULLABLE | NULL | — | Description |
| `status` | VARCHAR(50) | NULLABLE | NULL | — | Voucher status |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `expenseId` → `expenses(id)` ON DELETE SET NULL
**Unique constraints:** `voucherId`
**Estimated size:** 400 rows (Year 1), 5,000 rows (Year 5)

## 3.32 audit_logs

**Purpose:** System-wide audit trail. New table — no PocketBase equivalent. Defined in Data Architecture Blueprint Section 9 and Backend Service Architecture Blueprint Section 2.18.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `entityType` | VARCHAR(50) | NOT NULL | — | — | Entity type (e.g., "user", "pooja_booking") |
| `entityId` | UUID | NOT NULL | — | — | Entity ID |
| `action` | VARCHAR(20) | NOT NULL | — | CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject')) | Action performed |
| `changes` | JSONB | NULLABLE | NULL | — | { field: { old: x, new: y } } |
| `performedBy` | UUID | NULLABLE | NULL | FK → users(id) | Who performed action |
| `performedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | When action was performed |
| `ipAddress` | VARCHAR(45) | NULLABLE | NULL | — | Client IP (IPv4/IPv6) |
| `userAgent` | VARCHAR(500) | NULLABLE | NULL | — | Client user agent |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Foreign keys:** `performedBy` → `users(id)` ON DELETE SET NULL
**Check constraints:** `action IN ('create', 'update', 'delete', 'approve', 'reject')`
**Partitioning readiness:** Range partition by `performedAt` (monthly) when row count > 10M
**Estimated size:** 10,000 rows (Year 1), 150,000 rows (Year 5) — high growth, cleanup after 365 days

## 3.33 email_queue

**Purpose:** Email delivery queue. New table — no PocketBase equivalent. Defined in Architecture Blueprint Section 9 (Email Queue Architecture).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `to` | VARCHAR(320) | NOT NULL | — | — | Recipient email |
| `subject` | VARCHAR(500) | NOT NULL | — | — | Email subject |
| `body` | TEXT | NOT NULL | — | — | Email body (HTML) |
| `attachments` | JSONB | NULLABLE | NULL | — | Array of attachment paths |
| `status` | VARCHAR(20) | NOT NULL | `'pending'` | CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead')) | Queue status |
| `attempts` | INTEGER | NOT NULL | `0` | CHECK (attempts >= 0 AND attempts <= 3) | Retry count |
| `nextAttemptAt` | TIMESTAMPTZ | NULLABLE | NULL | — | Next retry time |
| `lastError` | TEXT | NULLABLE | NULL | — | Last error message |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | |

**Check constraints:** `status IN ('pending', 'processing', 'sent', 'failed', 'dead')`, `attempts >= 0 AND attempts <= 3`
**Estimated size:** 500 rows (Year 1), 5,000 rows (Year 5) — cleaned up after processing

## 3.34 email_dead_letter

**Purpose:** Failed emails for manual review. New table — no PocketBase equivalent. Defined in Architecture Blueprint Section 9.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | |
| `to` | VARCHAR(320) | NOT NULL | — | — | Recipient email |
| `subject` | VARCHAR(500) | NOT NULL | — | — | Email subject |
| `body` | TEXT | NOT NULL | — | — | Email body (HTML) |
| `attachments` | JSONB | NULLABLE | NULL | — | Array of attachment paths |
| `error` | TEXT | NOT NULL | — | — | Final error message |
| `attempts` | INTEGER | NOT NULL | — | — | Total attempts made |
| `originalCreatedAt` | TIMESTAMPTZ | NOT NULL | — | — | When first queued |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `now()` | — | When moved to dead letter |

**Estimated size:** 50 rows (Year 1), 200 rows (Year 5) — manually reviewed and cleaned

---

# PART 4 — Relationship Design

## 4.1 One-to-One Relationships

| Parent | Child | FK Column | Constraint | Justification |
|---|---|---|---|---|
| `users` | `user_preferences` | `user_preferences.userId` | UNIQUE | Each user has exactly one preference record |
| `users` | `pooja_bookings` | — | — | Not 1:1 (user has many bookings) |
| `pooja_bookings` | `booking_messages` | — | — | Not 1:1 (booking has many messages) |

**Note:** Most relationships in this system are one-to-many. True one-to-one relationships are rare.

## 4.2 One-to-Many Relationships

| Parent | Child | FK Column | On Delete | Justification |
|---|---|---|---|---|
| `users` | `pooja_bookings` | `pooja_bookings.userId` | RESTRICT | Prevent deletion of users with bookings |
| `users` | `donations` | `donations.userId` | RESTRICT | Prevent deletion of users with donations |
| `users` | `subscriptions` | `subscriptions.userId` | RESTRICT | Prevent deletion of users with subscriptions |
| `users` | `payments` | `payments.userId` | RESTRICT | Prevent deletion of users with payments |
| `users` | `pending_subscriptions` | `pending_subscriptions.userId` | RESTRICT | Prevent deletion |
| `users` | `approval_logs` | `approval_logs.adminId` | RESTRICT | Preserve audit trail |
| `users` | `integrated_ai_messages` | `integrated_ai_messages.userId` | SET NULL | Allow user deletion, preserve AI history |
| `users` | `volunteer_participation` | `volunteer_participation.userId` | — | Legacy text FK |
| `users` | `admin_messages` | `admin_messages.userId` | — | Legacy text FK |
| `users` | `notifications` | `notifications.userId` | — | Legacy text FK |
| `poojas` | `pooja_bookings` | `pooja_bookings.poojaId` | RESTRICT | Prevent deletion of poojas with bookings |
| `festivals` | `poojas` | `poojas.festivalId` | SET NULL | Festival deletion doesn't remove poojas |
| `pooja_bookings` | `booking_messages` | `booking_messages.bookingId` | CASCADE | Delete messages when booking is deleted |
| `subscriptions` | `pending_subscriptions` | `pending_subscriptions.subscriptionId` | RESTRICT | Prevent orphaned pending subscriptions |
| `expense_categories` | `expenses` | `expenses.categoryId` | RESTRICT | Prevent deletion of categories with expenses |
| `photo_categories` | `gallery` | `gallery.categoryId` | SET NULL | Category deletion doesn't remove images |
| `expenses` | `vouchers` | `vouchers.expenseId` | SET NULL | Expense deletion doesn't remove vouchers |
| `users` | `page_access` | `page_access.userId` | — | Legacy text FK |

## 4.3 Many-to-Many Relationships

| Entity A | Entity B | Junction Table | FK Columns | Notes |
|---|---|---|---|---|
| (None identified) | | | | The current schema does not use junction tables. All relationships are one-to-many. |

## 4.4 Cascade Rules Summary

| Rule | Usage | Count |
|---|---|---|
| `RESTRICT` | Most parent-child relationships | 12 |
| `SET NULL` | Optional relationships (festival→pooja, category→gallery, expense→voucher) | 4 |
| `CASCADE` | Child entities that should be deleted with parent (booking_messages→pooja_bookings) | 1 |

**Policy:** `RESTRICT` is the default. `SET NULL` is used only when the relationship is optional and the child should survive parent deletion. `CASCADE` is used only for truly dependent child entities.

## 4.5 Soft Delete Strategy

| Table | Soft Delete Fields | Auto-Filter |
|---|---|---|
| `users` | `isDeleted`, `deletedAt` | Yes (Prisma extension) |
| `poojas` | `isDeleted` | Yes (Prisma extension) |
| `pooja_bookings` | `isDeleted` | Yes (Prisma extension) |
| `donations` | `isDeleted` | Yes (Prisma extension) |

**Soft delete rules:**
1. Soft-deleted records are excluded from all queries by default (Prisma extension)
2. Admin queries can include soft-deleted records with `includeDeleted: true`
3. Hard delete is reserved for GDPR requests and data purge operations
4. Soft-deleted records are purged after 90 days (automated cron job)
5. Financial records (donations, payments) are never hard-deleted — soft delete only

---

# PART 5 — Normalization Review

## 5.1 First Normal Form (1NF)

**Requirement:** Every column contains atomic values. No repeating groups.

| Table | 1NF Status | Notes |
|---|---|---|
| All tables | ✅ Compliant | All columns contain atomic values |
| `poojas.dates` | ⚠️ JSONB array | Stores array of date strings. This is an intentional denormalization — dates are variable-length and rarely queried individually. |
| `poojas.days` | ⚠️ JSONB array | Stores array of day names. Same justification as above. |
| `poojas.specificDates` | ⚠️ JSONB array | Stores array of specific dates. Same justification. |
| `poojas.specificDays` | ⚠️ JSONB array | Stores array of specific days. Same justification. |
| `poojas.timeSlots` | ⚠️ JSONB array | Stores array of time slots. Same justification. |
| `email_queue.attachments` | ⚠️ JSONB array | Stores array of file paths. Emails are processed as units; individual attachment querying is not required. |
| `audit_logs.changes` | ⚠️ JSONB object | Stores variable-structure change data. Each mutation has different fields; normalization would require an EAV pattern with severe performance penalty. |

**Assessment:** The JSONB fields are intentional denormalizations for variable-structure data that is rarely queried at the individual element level. This is acceptable in PostgreSQL where JSONB is a first-class data type with indexing support.

## 5.2 Second Normal Form (2NF)

**Requirement:** 1NF + no partial dependencies (non-key attributes depend on the entire primary key).

| Table | 2NF Status | Notes |
|---|---|---|
| All tables | ✅ Compliant | All tables use single-column UUID primary keys. Partial dependency is impossible with single-column keys. |

## 5.3 Third Normal Form (3NF)

**Requirement:** 2NF + no transitive dependencies (non-key attributes do not depend on other non-key attributes).

| Table | 3NF Status | Notes |
|---|---|---|
| `users` | ✅ Compliant | All profile fields depend directly on `id` |
| `pooja_bookings` | ⚠️ Denormalized | `poojaName` depends on `poojaId`, not directly on `id`. This is intentional — avoids JOIN for display. |
| `donations` | ⚠️ Denormalized | `email`, `contactNumber` depend on `userId`, not directly on `id`. Intentional — preserves historical contact data. |
| `payments` | ⚠️ Denormalized | `email` depends on `userId`, not directly on `id`. Intentional — preserves historical contact data. |
| `temple_accounts` | ⚠️ Denormalized | `memberName` depends on the source transaction, not directly on `id`. Intentional — ledger entries must be self-contained. |
| `approval_logs` | ⚠️ Denormalized | `adminName` depends on `adminId`, not directly on `id`. Intentional — audit trail must be self-contained. |

**Assessment:** The denormalizations are intentional and documented. They preserve historical data integrity (contact info at time of transaction) and optimize read performance (avoiding JOINs for display).

## 5.4 Intentional Denormalization Summary

| Table | Field | Depends On | Justification |
|---|---|---|---|
| `pooja_bookings` | `poojaName` | `poojaId` | Avoid JOIN for booking display; preserves name if pooja is renamed |
| `pooja_bookings` | `name`, `email` | `userId` | Preserves contact info at time of booking |
| `donations` | `email`, `contactNumber` | `userId` | Preserves contact info at time of donation |
| `payments` | `email` | `userId` | Preserves contact info at time of payment |
| `temple_accounts` | `memberName` | Source transaction | Ledger entries must be self-contained for audit |
| `approval_logs` | `adminName` | `adminId` | Audit trail must be self-contained |
| `subscription_reminders` | `subscriptionId` | — | Stored as VARCHAR(100) for legacy compatibility |

---

# PART 6 — Index Design

## 6.1 users

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_users` | `id` | PRIMARY KEY (B-tree) | UUID lookups |
| `idx_users_email_unique` | `email` | UNIQUE B-tree | Login queries, duplicate prevention |
| `idx_users_tokenKey_unique` | `tokenKey` | UNIQUE B-tree | Password reset token lookup |
| `idx_users_role` | `role` | B-tree | Admin queries, RBAC checks |
| `idx_users_membershipTier` | `membershipTier` | B-tree | Membership queries |
| `idx_users_approvalStatus` | `approvalStatus` | B-tree | Approval queue queries |
| `idx_users_accountType` | `accountType` | B-tree | Account type queries |
| `idx_users_isDeleted` | `isDeleted` | Partial B-tree | Soft delete filtering |
| `idx_users_isBlocked` | `isBlocked` | B-tree | Block status queries |
| `idx_users_createdAt` | `createdAt` | B-tree | Sorting, date range queries |

## 6.2 poojas

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_poojas` | `id` | PRIMARY KEY | UUID lookups |
| `idx_poojas_category` | `category` | B-tree | Category filtering |
| `idx_poojas_status` | `status` | B-tree | Status filtering |
| `idx_poojas_isArchived` | `isArchived` | B-tree | Archive filtering |
| `idx_poojas_isDeleted` | `isDeleted` | Partial B-tree | Soft delete filtering |
| `idx_poojas_festivalId` | `festivalId` | B-tree | Festival lookup |
| `idx_poojas_category_status` | `(category, status)` | Composite B-tree | "Active poojas in category" query |
| `idx_poojas_active_partial` | `id` | Partial B-tree | WHERE isDeleted = false AND isArchived = false |

## 6.3 pooja_bookings

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_pooja_bookings` | `id` | PRIMARY KEY | UUID lookups |
| `idx_pooja_bookings_userId` | `userId` | B-tree | User's bookings |
| `idx_pooja_bookings_poojaId` | `poojaId` | B-tree | Pooja's bookings |
| `idx_pooja_bookings_bookingStatus` | `bookingStatus` | B-tree | Status filtering |
| `idx_pooja_bookings_isDeleted` | `isDeleted` | Partial B-tree | Soft delete filtering |
| `idx_pooja_bookings_receiptNumber` | `receiptNumber` | UNIQUE B-tree (partial) | Receipt lookup (WHERE receiptNumber IS NOT NULL) |
| `idx_pooja_bookings_user_status` | `(userId, bookingStatus)` | Composite B-tree | "User's pending bookings" query |
| `idx_pooja_bookings_createdAt` | `createdAt` | B-tree | Sorting, date range |

## 6.4 donations

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_donations` | `id` | PRIMARY KEY | UUID lookups |
| `idx_donations_userId` | `userId` | B-tree | User's donations |
| `idx_donations_status` | `status` | B-tree | Approval queue |
| `idx_donations_isDeleted` | `isDeleted` | Partial B-tree | Soft delete filtering |
| `idx_donations_receiptNumber` | `receiptNumber` | UNIQUE B-tree (partial) | Receipt lookup |
| `idx_donations_user_status` | `(userId, status)` | Composite B-tree | "User's pending donations" |
| `idx_donations_user_donationDate` | `(userId, donationDate)` | Composite B-tree | "User's donations in date range" |
| `idx_donations_createdAt` | `createdAt` | B-tree | Sorting |

## 6.5 subscriptions

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_subscriptions` | `id` | PRIMARY KEY | UUID lookups |
| `idx_subscriptions_userId` | `userId` | B-tree | User's subscriptions |
| `idx_subscriptions_status` | `status` | B-tree | Status filtering |
| `idx_subscriptions_planType` | `planType` | B-tree | Plan type filtering |
| `idx_subscriptions_endDate` | `endDate` | B-tree | Expiry queries (cron job) |
| `idx_subscriptions_user_status` | `(userId, status)` | Composite B-tree | "User's active subscription" |

## 6.6 pending_subscriptions

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_pending_subscriptions` | `id` | PRIMARY KEY | UUID lookups |
| `idx_pending_sub_userId` | `userId` | B-tree | User lookup |
| `idx_pending_sub_subscriptionId` | `subscriptionId` | B-tree | Subscription lookup |
| `idx_pending_sub_status` | `status` | B-tree | Queue filtering |
| `idx_pending_sub_paymentStatus` | `paymentStatus` | B-tree | Payment status filtering |

## 6.7 payments

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_payments` | `id` | PRIMARY KEY | UUID lookups |
| `idx_payments_userId` | `userId` | B-tree | User's payments |
| `idx_payments_status` | `status` | B-tree | Approval queue |
| `idx_payments_receiptNumber` | `receiptNumber` | UNIQUE B-tree (partial) | Receipt lookup |
| `idx_payments_user_status` | `(userId, status)` | Composite B-tree | "User's pending payments" |
| `idx_payments_createdAt` | `createdAt` | B-tree | Sorting |

## 6.8 approval_logs

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_approval_logs` | `id` | PRIMARY KEY | UUID lookups |
| `idx_approval_logs_adminId` | `adminId` | B-tree | Admin's actions |
| `idx_approval_logs_action` | `action` | B-tree | Action type filtering |
| `idx_approval_logs_timestamp` | `timestamp` | B-tree | Date range queries |

## 6.9 temple_accounts

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_temple_accounts` | `id` | PRIMARY KEY | UUID lookups |
| `idx_temple_accounts_category` | `category` | B-tree | Category filtering |
| `idx_temple_accounts_date` | `date` | B-tree | Date range queries |
| `idx_temple_accounts_month_year` | `(month, year)` | Composite B-tree | Monthly report queries |
| `idx_temple_accounts_classification` | `classification` | B-tree | Classification filtering |
| `idx_temple_accounts_createdAt` | `createdAt` | B-tree | Sorting |

## 6.10 expenses

| Index | Columns | Type | Justification |
|---|---|---|---|
| `pk_expenses` | `id` | PRIMARY KEY | UUID lookups |
| `idx_expenses_categoryId` | `categoryId` | B-tree | Category lookup |
| `idx_expenses_date` | `date` | B-tree | Date range queries |
| `idx_expenses_createdAt` | `createdAt` | B-tree | Sorting |

## 6.11 Other Tables (Indexes)

| Table | Index | Columns | Type | Justification |
|---|---|---|---|---|
| `expense_categories` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `expense_categories` | `unique_name` | `name` | UNIQUE B-tree | Duplicate prevention |
| `classifications` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `classifications` | `unique_name` | `name` | UNIQUE B-tree | Duplicate prevention |
| `membership_fees` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `membership_fees` | `idx_userId` | `userId` | B-tree | User lookup |
| `gallery` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `gallery` | `idx_categoryId` | `categoryId` | B-tree | Category lookup |
| `gallery` | `idx_isPublished` | `isPublished` | B-tree | Published filter |
| `gallery` | `idx_order` | `order` | B-tree | Display order sorting |
| `photo_categories` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `photo_categories` | `unique_name` | `name` | UNIQUE B-tree | Duplicate prevention |
| `festivals` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `festivals` | `idx_status` | `status` | B-tree | Status filtering |
| `volunteer_participation` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `volunteer_participation` | `idx_userId` | `userId` | B-tree | User lookup |
| `admin_messages` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `admin_messages` | `idx_userId` | `userId` | B-tree | User lookup |
| `user_preferences` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `user_preferences` | `unique_userId` | `userId` | UNIQUE B-tree | One preference per user |
| `subscription_reminders` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `subscription_reminders` | `idx_email` | `email` | B-tree | Email lookup |
| `subscription_reminders` | `idx_status` | `status` | B-tree | Status filtering |
| `booking_messages` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `booking_messages` | `idx_bookingId` | `bookingId` | B-tree | Booking lookup |
| `page_access` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `page_access` | `idx_userId` | `userId` | B-tree | User lookup |
| `page_access` | `idx_pageRoute` | `pageRoute` | B-tree | Route lookup |
| `premium_upgrade_requests` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `premium_upgrade_requests` | `idx_email` | `email` | B-tree | Email lookup |
| `premium_upgrade_requests` | `idx_status` | `status` | B-tree | Status filtering |
| `_integrated_ai_messages` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `_integrated_ai_messages` | `idx_userId` | `userId` | B-tree | User's chat history |
| `_integrated_ai_images` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `payment_accounts` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `contact_inquiries` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `notifications` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `notifications` | `idx_userId` | `userId` | B-tree | User's notifications |
| `notifications` | `idx_isRead` | `isRead` | B-tree | Unread filter |
| `account_types` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `account_types` | `unique_name` | `name` | UNIQUE B-tree | Duplicate prevention |
| `bank_account_config` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `vouchers` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `vouchers` | `unique_voucherId` | `voucherId` | UNIQUE B-tree | Voucher lookup |
| `vouchers` | `idx_expenseId` | `expenseId` | B-tree | Expense lookup |
| `audit_logs` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `audit_logs` | `idx_entityType_entityId` | `(entityType, entityId)` | Composite B-tree | Entity history queries |
| `audit_logs` | `idx_performedBy` | `performedBy` | B-tree | Admin action queries |
| `audit_logs` | `idx_performedAt` | `performedAt` | B-tree | Date range queries |
| `audit_logs` | `idx_action` | `action` | B-tree | Action type filtering |
| `email_queue` | `pk` | `id` | PRIMARY KEY | UUID lookups |
| `email_queue` | `idx_status_nextAttemptAt` | `(status, nextAttemptAt)` | Composite B-tree | Queue processor query |
| `email_dead_letter` | `pk` | `id` | PRIMARY KEY | UUID lookups |

## 6.12 Index Summary

| Category | Count | Purpose |
|---|---|---|
| Primary keys | 34 | Every table has a UUID PK |
| Unique indexes | 12 | Email, receipt numbers, names, voucher IDs |
| Foreign key indexes | 18 | Every FK column is indexed |
| Composite indexes | 8 | Common multi-column queries |
| Partial indexes | 3 | Soft delete filtering |
| Single-column B-tree | 45 | Status, date, category filters |
| **Total** | **120** | |

---

# PART 7 — Enum Strategy

## 7.1 Enum Definitions

| Enum Name | Values | Source | Usage |
|---|---|---|---|
| `UserRole` | `user`, `admin` | PB `_pb_users_auth_.role` | System RBAC role |
| `MembershipTier` | `free`, `premium` | PB `users.membershipTier` | Current membership tier |
| `ApprovalStatus` | `pending_approval`, `approved`, `rejected` | PB `users.approvalStatus` | Approval workflow |
| `SubscriptionStatus` | `free`, `premium`, `admin` | PB `users.subscriptionStatus` | Subscription status |
| `PremiumStatus` | `Active`, `Inactive`, `Pending` | PB `users.premiumStatus` | Premium status |
| `AccountType` | `free_member`, `premium_member`, `admin` | PB `users.accountType` | Display label |
| `PreferredLanguage` | `Tamil`, `English`, `Deutsch` | PB `users.preferredLanguage` | UI language |
| `FontSizePreference` | `small`, `normal`, `large` | PB `users.fontSizePreference` | Font size |
| `NotificationPreference` | `all`, `important`, `none` | PB `user_preferences.notificationPreference` | Notification level |
| `PoojaCategory` | `daily`, `special`, `festival`, `life_cycle`, `homam`, `archana` | PB `poojas.category` | Service category |
| `PoojaStatus` | `active`, `inactive`, `archived`, `draft` | PB `poojas.status` | Service status |
| `BookingStatus` | `pending`, `approved`, `rejected`, `confirmed`, `cancelled`, `completed` | PB `pooja_bookings.bookingStatus` | Booking lifecycle |
| `PaymentStatus` | `pending`, `completed`, `failed`, `refunded` | PB various `payment_status` | Payment state |
| `SubscriptionPlanType` | `premium` | PB `subscriptions.planType` | Plan type |
| `SubscriptionRecordStatus` | `pending`, `active`, `rejected` | PB `subscriptions.status` | Record status |
| `RenewalType` | `auto`, `manual` | PB `subscriptions.renewalType` | Renewal mode |
| `PaymentApprovalStatus` | `pending`, `approved`, `rejected` | PB various `status` | Approval workflow |
| `ApprovalLogAction` | `approved`, `rejected`, `restored`, `deleted` | PB `approval_logs.action` | Audit action |
| `FestivalStatus` | `active`, `archived` | PB `festivals.status` | Festival state |
| `BookingMessageSenderType` | `admin`, `user` | PB `booking_messages.senderType` | Message sender |
| `SubscriptionReminderStatus` | `pending`, `sent`, `failed` | PB `subscription_reminders.status` | Delivery status |
| `AiMessageRole` | `user`, `assistant` | PB `_integratedAiMessages.role` | Chat role |
| `PageAccessLevel` | `view`, `edit`, `admin` | PB `page_access.accessLevel` | Permission level |
| `SubscriptionType` | `Monthly`, `Yearly` | PB `temple_accounts.subscriptionType` | Subscription period |
| `VolunteerStatus` | `completed`, `pending` | PB `volunteer_participation.status` | Participation state |

## 7.2 Enum Naming Convention

| Rule | Example |
|---|---|
| PascalCase for enum type names | `UserRole`, `BookingStatus` |
| snake_case for enum values (PostgreSQL) | `pending_approval`, `free_member` |
| Preserve original casing where it's a display value | `Tamil`, `English`, `Deutsch`, `Active`, `Inactive` |
| Consistent suffix for status enums | `Status` (e.g., `PoojaStatus`, `BookingStatus`) |

## 7.3 Enum Migration Notes

| PB Value | PG Enum Value | Transformation |
|---|---|---|
| `"Free Member"` | `free_member` | Lowercase, replace space with underscore |
| `"Premium Member"` | `premium_member` | Lowercase, replace space with underscore |
| `"Admin"` | `admin` | Lowercase |
| `"0.9"` | `small` | Map to semantic value |
| `"1.0"` | `normal` | Map to semantic value |
| `"1.2"` | `large` | Map to semantic value |
| `"Tamil"` | `Tamil` | Preserve casing (display value) |
| `"English"` | `English` | Preserve casing (display value) |
| `"Deutsch"` | `Deutsch` | Preserve casing (display value) |
| `"Active"` | `Active` | Preserve casing (display value) |

---

# PART 8 — Data Integrity Rules

## 8.1 Foreign Key Rules

| Rule | Application |
|---|---|
| **RESTRICT on user deletion** | Users with bookings, donations, subscriptions, payments, or approval logs cannot be deleted. Must soft-delete first. |
| **SET NULL on optional parent** | Gallery items survive category deletion. Poojas survive festival deletion. Vouchers survive expense deletion. |
| **CASCADE on child messages** | Booking messages are deleted when the parent booking is hard-deleted. |
| **No CASCADE on financial data** | Donations, payments, temple_accounts never cascade-delete. Financial records are permanent. |

## 8.2 Business Constraints

| Constraint | Table | Rule |
|---|---|---|
| **Donation minimum** | `pooja_bookings` | `donationAmount >= 1` |
| **Expense minimum** | `expenses` | `amount >= 0.01` |
| **Subscription duration** | `subscriptions` | `durationMonths >= 1 AND durationMonths <= 120` |
| **Subscription amount** | `subscriptions` | `amount >= 0`, `totalAmount >= 0` |
| **Date order** | `subscriptions` | `endDate > startDate` |
| **User name length** | `users` | `length(name) >= 2` |
| **Pincode format** | `users` | `length(pincode) = 6` (when not null) |
| **Email uniqueness** | `users` | UNIQUE constraint on `email` |
| **Receipt uniqueness** | `donations`, `pooja_bookings`, `payments` | UNIQUE constraint on `receiptNumber` (when not null) |
| **Voucher ID uniqueness** | `vouchers` | UNIQUE constraint on `voucherId` |
| **Category name uniqueness** | `expense_categories`, `classifications`, `photo_categories`, `account_types` | UNIQUE constraint on `name` |
| **One preference per user** | `user_preferences` | UNIQUE constraint on `userId` |
| **Email queue attempts** | `email_queue` | `attempts >= 0 AND attempts <= 3` |

## 8.3 Financial Integrity

| Rule | Implementation |
|---|---|
| **Decimal precision** | All monetary fields use `DECIMAL(10,2)` — no floating point |
| **Non-negative amounts** | All amount fields have `CHECK (amount >= 0)` or `CHECK (amount > 0)` |
| **Receipt linkage** | Every approved donation/booking/payment must have a `receiptNumber` |
| **Temple account entries** | Created atomically with donation/booking/subscription approval |
| **No orphan financial records** | Financial records reference users via FK with RESTRICT |
| **Audit trail** | Every financial mutation logged to `audit_logs` |

## 8.4 Receipt Uniqueness

| Rule | Implementation |
|---|---|
| **Format** | Receipt numbers follow the pattern `REC-{YYYYMMDD}-{sequence}` |
| **Uniqueness** | UNIQUE constraint on `receiptNumber` across `donations`, `pooja_bookings`, `payments` |
| **Generation** | Receipt numbers are generated at approval time, not at creation time |
| **Immutability** | Once generated, receipt numbers are never changed |

## 8.5 Transaction Consistency

| Pattern | Implementation |
|---|---|
| **Booking approval** | Within one transaction: update booking status → generate receipt → create temple_accounts entry |
| **Donation approval** | Within one transaction: update donation status → generate receipt → create temple_accounts entry |
| **Subscription activation** | Within one transaction: update subscription status → update user membership fields → create temple_accounts entry |
| **Payment approval** | Within one transaction: update payment status → create subscription → update user membership → create temple_accounts entry |

---

# PART 9 — Migration Mapping

## 9.1 Complete Field Mapping

### users

| PB Field | PG Column | Transformation |
|---|---|---|
| `id` (15-char) | `id` (UUID) | Generate new UUID, store PB ID temporarily |
| `email` | `email` | Direct copy |
| `password` | `password` | Direct copy (bcrypt hash) |
| `name` | `name` | Direct copy |
| `avatar` | `avatar` | Copy file, update path |
| `verified` | `verified` | Direct copy |
| `emailVisibility` | `emailVisibility` | Direct copy |
| `tokenKey` | `tokenKey` | Direct copy |
| `lastResetSentAt` | `lastResetSentAt` | Direct copy |
| `lastVerificationSentAt` | `lastVerificationSentAt` | Direct copy |
| `role` | `role` | Map to enum: `user`/`admin` |
| `membershipTier` | `membershipTier` | Map to enum: `free`/`premium` |
| `membership_type` | `membershipType` | Map to enum: `free`/`premium` |
| `subscription_status` | `subscriptionStatus` | Map to enum: `free`/`premium`/`admin` |
| `premium_status` | `premiumStatus` | Map to enum: `Active`/`Inactive`/`Pending` |
| `approval_status` | `approvalStatus` | Map to enum: `pending_approval`/`approved`/`rejected` |
| `account_type` | `accountType` | Map to enum: `free_member`/`premium_member`/`admin` |
| `phone` | `phone` | Direct copy |
| `address` | `address` | Direct copy |
| `city` | `city` | Direct copy |
| `state` | `state` | Direct copy |
| `pincode` | `pincode` | Direct copy |
| `preferred_language` | `preferredLanguage` | Map to enum |
| `fontSizePreference` | `fontSizePreference` | Map: `"0.9"`→`small`, `"1.0"`→`normal`, `"1.2"`→`large` |
| `joinDate` | `joinDate` | Direct copy |
| `subscription_expiry_date` | `subscriptionExpiryDate` | Direct copy |
| `last_renewal_date` | `lastRenewalDate` | Direct copy |
| `is_blocked` | `isBlocked` | Direct copy |
| `blocked_at` | `blockedAt` | Direct copy |
| `is_deleted` | `isDeleted` | Direct copy |
| `deleted_at` | `deletedAt` | Direct copy |
| `archived` | `archived` | Direct copy |
| `created` | `createdAt` | Direct copy |
| `updated` | `updatedAt` | Direct copy |
| `fullName` | — | Merge into `name` if `name` is empty |
| `full_name` | — | Merge into `name` if `name` is empty |
| `user_role` | — | Merge into `role` if `role` is empty |
| `blocked` | — | Merge into `isBlocked` |
| `account_type_status` | — | Drop (always null) |

### poojas

| PB Field | PG Column | Transformation |
|---|---|---|
| `id` | `id` | Generate new UUID |
| `name` | `name` | Direct copy |
| `description` | `description` | Direct copy |
| `category` | `category` | Map to enum |
| `donation_amount` | `donationAmount` | Direct copy |
| `price` | `price` | Direct copy |
| `availabilityType` | `availabilityType` | Direct copy |
| `dates` | `dates` | Direct copy (JSON) |
| `days` | `days` | Direct copy (JSON) |
| `specificDates` | `specificDates` | Direct copy (JSON) |
| `specificDays` | `specificDays` | Direct copy (JSON) |
| `timeSlots` | `timeSlots` | Direct copy (JSON) |
| `status` | `status` | Map to enum |
| `is_archived` | `isArchived` | Direct copy |
| `archived_at` | `archivedAt` | Direct copy |
| `is_deleted` | `isDeleted` | Direct copy |
| `festival` | `festivalId` | Map PB relation ID to new UUID |
| `created_at` | `createdAt` | Direct copy |
| `updated_at` | `updatedAt` | Direct copy |

### pooja_bookings

| PB Field | PG Column | Transformation |
|---|---|---|
| `id` | `id` | Generate new UUID |
| `user` | `userId` | Map PB relation ID to new UUID |
| `pooja` | `poojaId` | Map PB relation ID to new UUID |
| `name` | `name` | Direct copy |
| `email` | `email` | Direct copy |
| `user_contact` | `userContact` | Direct copy |
| `phone` | `phone` | Direct copy |
| `booking_date` | `bookingDate` | Direct copy |
| `pooja_date` | `poojaDate` | Direct copy |
| `time_slot` | `timeSlot` | Direct copy |
| `selectedDate` | `selectedDate` | Direct copy |
| `selectedTimeSlot` | `selectedTimeSlot` | Direct copy |
| `donation_amount` | `donationAmount` | Direct copy |
| `booking_status` | `bookingStatus` | Map to enum |
| `payment_status` | `paymentStatus` | Map to enum |
| `status` | `status` | Direct copy (legacy) |
| `receipt_number` | `receiptNumber` | Direct copy |
| `transaction_id` | `transactionId` | Direct copy |
| `notes` | `notes` | Direct copy |
| `pooja_name` | `poojaName` | Direct copy |
| `booking_time` | `bookingTime` | Direct copy |
| `is_deleted` | `isDeleted` | Direct copy |
| `created_at` | `createdAt` | Direct copy |
| `updated_at` | `updatedAt` | Direct copy |

### donations

| PB Field | PG Column | Transformation |
|---|---|---|
| `id` | `id` | Generate new UUID |
| `user` | `userId` | Map PB relation ID to new UUID |
| `amount` | `amount` | Direct copy |
| `donation_date` | `donationDate` | Direct copy |
| `donation_description` | `donationDescription` | Direct copy |
| `special_occasion` | `specialOccasion` | Direct copy |
| `category` | `category` | Direct copy |
| `status` | `status` | Map to enum |
| `approval_date` | `approvalDate` | Direct copy |
| `payment_status` | `paymentStatus` | Map to enum |
| `receipt_number` | `receiptNumber` | Direct copy |
| `receipt_pdf` | `receiptPdf` | Copy file, update path |
| `receipt_generated_at` | `receiptGeneratedAt` | Direct copy |
| `contact_number` | `contactNumber` | Direct copy |
| `email` | `email` | Direct copy |
| `communication_preference` | `communicationPreference` | Direct copy |
| `is_deleted` | `isDeleted` | Direct copy |
| `created` | `createdAt` | Direct copy |
| `updated` | `updatedAt` | Direct copy |

### subscriptions

| PB Field | PG Column | Transformation |
|---|---|---|
| `id` | `id` | Generate new UUID |
| `user` | `userId` | Map PB relation ID to new UUID |
| `plan_type` | `planType` | Map to enum |
| `amount` | `amount` | Direct copy |
| `billing_cycle` | `billingCycle` | Direct copy |
| `custom_donation` | `customDonation` | Direct copy |
| `total_amount` | `totalAmount` | Direct copy |
| `duration_months` | `durationMonths` | Direct copy |
| `renewal_type` | `renewalType` | Map to enum |
| `start_date` | `startDate` | Direct copy |
| `end_date` | `endDate` | Direct copy |
| `status` | `status` | Map to enum |
| `transaction_id` | `transactionId` | Direct copy |
| `transaction_ref` | `transactionRef` | Direct copy |
| `admin_notes` | `adminNotes` | Direct copy |
| `description` | `description` | Direct copy |
| `user_id` (legacy) | `userIdText` | Direct copy (legacy) |
| `created` | `createdAt` | Direct copy |
| `updated` | `updatedAt` | Direct copy |

### pending_subscriptions

| PB Field | PG Column | Transformation |
|---|---|---|
| `id` | `id` | Generate new UUID |
| `email` | `email` | Direct copy |
| `full_name` | `fullName` | Direct copy |
| `contact_number` | `contactNumber` | Direct copy |
| `subscription_type` | `subscriptionType` | Direct copy |
| `transaction_id` | `transactionId` | Direct copy |
| `user` | `userId` | Map PB relation ID to new UUID |
| `subscription` | `subscriptionId` | Map PB relation ID to new UUID |
| `status` | `status` | Map to enum |
| `payment_status` | `paymentStatus` | Map to enum |
| `start_date` | `startDate` | Direct copy |
| `end_date` | `endDate` | Direct copy |
| `renewal_date` | `renewalDate` | Direct copy |
| `created` | `createdAt` | Direct copy |
| `updated` | `updatedAt` | Direct copy |

### payments

| PB Field | PG Column | Transformation |
|---|---|---|
| `id` | `id` | Generate new UUID |
| `user` | `userId` | Map PB relation ID to new UUID |
| `approved_by` | `approvedById` | Map PB relation ID to new UUID |
| `amount` | `amount` | Direct copy |
| `total_amount` | `totalAmount` | Direct copy |
| `custom_donation` | `customDonation` | Direct copy |
| `plan_type` | `planType` | Direct copy |
| `billing_cycle` | `billingCycle` | Direct copy |
| `subscription_type` | `subscriptionType` | Direct copy |
| `start_date` | `startDate` | Direct copy |
| `end_date` | `endDate` | Direct copy |
| `status` | `status` | Map to enum |
| `payment_status` | `paymentStatus` | Map to enum |
| `transaction_id` | `transactionId` | Direct copy |
| `transaction_ref` | `transactionRef` | Direct copy |
| `payment_method` | `paymentMethod` | Direct copy |
| `receipt_pdf` | `receiptPdf` | Copy file, update path |
| `receipt_id` | `receiptId` | Direct copy |
| `receipt_number` | `receiptNumber` | Direct copy |
| `receipt_generated_at` | `receiptGeneratedAt` | Direct copy |
| `receipt_sent_at` | `receiptSentAt` | Direct copy |
| `resend_receipt` | `resendReceipt` | Direct copy |
| `admin_notes` | `adminNotes` | Direct copy |
| `approved_at` | `approvedAt` | Direct copy |
| `email` | `email` | Direct copy |
| `created` | `createdAt` | Direct copy |
| `updated` | `updatedAt` | Direct copy |

### Remaining Tables (approval_logs, temple_accounts, expenses, gallery, festivals, etc.)

All remaining tables follow the same pattern: generate new UUID for `id`, map PB relation IDs to new UUIDs, copy all other fields directly, map enum values where applicable.

**Key transformations for all tables:**
1. `id` → Generate new UUID
2. PB relation fields (e.g., `user`, `pooja`, `category_id`) → Map to new UUID via mapping table
3. `created`/`updated`/`created_at`/`updated_at` → `createdAt`/`updatedAt` with direct timestamp copy
4. Enum fields → Map to PostgreSQL enum values
5. File fields → Copy files to new directory structure, update paths

## 9.2 Tables with No Transformation

| Table | Notes |
|---|---|
| `expense_categories` | Direct copy (id → UUID, name, description, createdBy) |
| `classifications` | Direct copy |
| `photo_categories` | Direct copy |
| `payment_accounts` | Direct copy |
| `contact_inquiries` | Direct copy |
| `account_types` | Direct copy |
| `bank_account_config` | Direct copy |

## 9.3 Tables Not Migrated

| Collection | Reason |
|---|---|
| `transactions` | Deleted in PB migration 1775580703. Replaced by `temple_accounts`. |
| `payment_records` | Deleted in PB migration 1777109970. Replaced by `payments`. |
| `bookings` (v1) | Replaced by `pooja_bookings`. |
| `page_access` (v1) | Replaced by `page_access` (v2) in migration 1777815441. |

---

# PART 10 — Migration Order

## 10.1 Dependency Order

Tables must be migrated in dependency order — parent tables before child tables:

```
Phase 1: Independent Tables (no foreign keys)
├── account_types
├── expense_categories
├── classifications
├── photo_categories
├── festivals
├── payment_accounts
├── bank_account_config
└── users (core table, referenced by everything)

Phase 2: User-Dependent Tables (FK → users)
├── subscriptions
├── donation
├── membership_fees
├── user_preferences
├── volunteer_participation
├── admin_messages
├── notifications
├── page_access
├── premium_upgrade_requests
├── _integrated_ai_messages
└── approval_logs

Phase 3: Subscription-Dependent Tables (FK → subscriptions)
└── pending_subscriptions

Phase 4: Pooja-Dependent Tables (FK → poojas)
├── poojas (FK → festivals)
└── pooja_bookings (FK → users, poojas)

Phase 5: Booking-Dependent Tables (FK → pooja_bookings)
└── booking_messages

Phase 6: Expense-Dependent Tables (FK → expense_categories)
├── expenses
└── vouchers (FK → expenses)

Phase 7: Gallery-Dependent Tables (FK → photo_categories)
└── gallery

Phase 8: Infrastructure Tables (new, no PB equivalent)
├── audit_logs
├── email_queue
└── email_dead_letter
```

## 10.2 Migration Sequence

| Step | Action | Tables | Checkpoint |
|---|---|---|---|
| 1 | Create PostgreSQL database | — | Database exists |
| 2 | Run Prisma migrations (schema) | All 34 tables | Schema validated |
| 3 | Export PB data to JSON | All 25 PB collections | Export files verified |
| 4 | Export PB files | File attachments | File count verified |
| 5 | Import Phase 1 tables | `account_types`, `expense_categories`, `classifications`, `photo_categories`, `festivals`, `payment_accounts`, `bank_account_config`, `users` | Row counts match |
| 6 | Import Phase 2 tables | `subscriptions`, `donations`, `membership_fees`, `user_preferences`, `volunteer_participation`, `admin_messages`, `notifications`, `page_access`, `premium_upgrade_requests`, `_integrated_ai_messages`, `approval_logs` | Row counts match |
| 7 | Import Phase 3 tables | `pending_subscriptions` | Row counts match |
| 8 | Import Phase 4 tables | `poojas`, `pooja_bookings` | Row counts match |
| 9 | Import Phase 5 tables | `booking_messages` | Row counts match |
| 10 | Import Phase 6 tables | `expenses`, `vouchers` | Row counts match |
| 11 | Import Phase 7 tables | `gallery` | Row counts match |
| 12 | Create infrastructure tables | `audit_logs`, `email_queue`, `email_dead_letter` | Empty tables created |
| 13 | Validate referential integrity | All FKs | Zero orphans |
| 14 | Validate financial totals | Donations, payments, expenses, temple_accounts | Totals match PB |
| 15 | Validate file references | All file paths | All files exist |
| 16 | Deploy new API | — | API starts successfully |
| 17 | Enable dual-write | — | Both PB and PG receiving writes |
| 18 | Compare read results | — | Zero discrepancies |
| 19 | Switch reads to PostgreSQL | — | All reads from PG |
| 20 | Stop writes to PocketBase | — | PB no longer written |
| 21 | Archive PocketBase data | — | PB data preserved |

## 10.3 Transaction Boundaries

| Step | Transaction? | Justification |
|---|---|---|
| Steps 1-4 | No | Schema creation and export are non-destructive |
| Steps 5-11 | Yes (per table) | Each table import is atomic — all rows or none |
| Steps 13-15 | No | Validation is read-only |
| Steps 16-21 | No | Deployment and cutover are operational steps |

## 10.4 Rollback Checkpoints

| Checkpoint | Rollback Procedure |
|---|---|
| After Step 2 (schema) | Drop all tables, restart |
| After Step 11 (data import) | Truncate all tables, re-import |
| After Step 15 (validation) | Fix issues, re-run validation |
| After Step 19 (read cutover) | Switch reads back to PB |
| After Step 20 (stop PB writes) | Re-enable PB writes if issues found |

---

# PART 11 — Database Validation Checklist

## 11.1 Schema Validation

- [ ] All 34 tables created successfully
- [ ] All columns match specification (name, type, nullable, default)
- [ ] All primary keys are UUID type with `gen_random_uuid()` default
- [ ] All foreign keys are defined with correct ON DELETE rules
- [ ] All unique constraints are defined
- [ ] All check constraints are defined
- [ ] All enum types are created with correct values
- [ ] All indexes are created (120 total)
- [ ] Prisma client generates without errors
- [ ] `prisma db push` completes without errors

## 11.2 Referential Integrity

- [ ] Zero orphan records in `pooja_bookings` (all userIds and poojaIds exist)
- [ ] Zero orphan records in `donations` (all userIds exist)
- [ ] Zero orphan records in `subscriptions` (all userIds exist)
- [ ] Zero orphan records in `pending_subscriptions` (all userIds and subscriptionIds exist)
- [ ] Zero orphan records in `payments` (all userIds exist)
- [ ] Zero orphan records in `booking_messages` (all bookingIds exist)
- [ ] Zero orphan records in `expenses` (all categoryIds exist)
- [ ] Zero orphan records in `vouchers` (all expenseIds exist — or null)
- [ ] Zero orphan records in `gallery` (all categoryIds exist — or null)
- [ ] Zero orphan records in `poojas` (all festivalIds exist — or null)
- [ ] Zero orphan records in `approval_logs` (all adminIds exist)
- [ ] Zero orphan records in `audit_logs` (all performedBy exist — or null)

## 11.3 Record Count Verification

| Table | PB Count | PG Count | Match |
|---|---|---|---|
| `users` | _____ | _____ | [ ] |
| `poojas` | _____ | _____ | [ ] |
| `pooja_bookings` | _____ | _____ | [ ] |
| `donations` | _____ | _____ | [ ] |
| `subscriptions` | _____ | _____ | [ ] |
| `pending_subscriptions` | _____ | _____ | [ ] |
| `payments` | _____ | _____ | [ ] |
| `approval_logs` | _____ | _____ | [ ] |
| `temple_accounts` | _____ | _____ | [ ] |
| `expenses` | _____ | _____ | [ ] |
| `expense_categories` | _____ | _____ | [ ] |
| `classifications` | _____ | _____ | [ ] |
| `membership_fees` | _____ | _____ | [ ] |
| `gallery` | _____ | _____ | [ ] |
| `photo_categories` | _____ | _____ | [ ] |
| `festivals` | _____ | _____ | [ ] |
| `volunteer_participation` | _____ | _____ | [ ] |
| `admin_messages` | _____ | _____ | [ ] |
| `user_preferences` | _____ | _____ | [ ] |
| `subscription_reminders` | _____ | _____ | [ ] |
| `booking_messages` | _____ | _____ | [ ] |
| `page_access` | _____ | _____ | [ ] |
| `premium_upgrade_requests` | _____ | _____ | [ ] |
| `_integrated_ai_messages` | _____ | _____ | [ ] |
| `_integrated_ai_images` | _____ | _____ | [ ] |
| `payment_accounts` | _____ | _____ | [ ] |
| `contact_inquiries` | _____ | _____ | [ ] |
| `notifications` | _____ | _____ | [ ] |
| `account_types` | _____ | _____ | [ ] |
| `bank_account_config` | _____ | _____ | [ ] |
| `vouchers` | _____ | _____ | [ ] |

## 11.4 Financial Reconciliation

| Metric | PB Value | PG Value | Match |
|---|---|---|---|
| Total donations (all time) | € _____ | € _____ | [ ] |
| Total donations (approved) | € _____ | € _____ | [ ] |
| Total payments (all time) | € _____ | € _____ | [ ] |
| Total payments (approved) | € _____ | € _____ | [ ] |
| Total expenses (all time) | € _____ | € _____ | [ ] |
| Total temple_accounts (income) | € _____ | € _____ | [ ] |
| Total temple_accounts (expense) | € _____ | € _____ | [ ] |
| Average donation amount | € _____ | € _____ | [ ] |
| Average payment amount | € _____ | € _____ | [ ] |

## 11.5 File Reference Validation

| Table | Field | Total Files | Verified | Missing |
|---|---|---|---|---|
| `users` | `avatar` | _____ | _____ | _____ |
| `gallery` | `image` | _____ | _____ | _____ |
| `festivals` | `image` | _____ | _____ | _____ |
| `expenses` | `billFile` | _____ | _____ | _____ |
| `payment_accounts` | `qrCode` | _____ | _____ | _____ |
| `donations` | `receiptPdf` | _____ | _____ | _____ |
| `payments` | `receiptPdf` | _____ | _____ | _____ |
| `_integrated_ai_images` | `file` | _____ | _____ | _____ |
| `bank_account_config` | `qrCodeImage` | _____ | _____ | _____ |

## 11.6 User Validation

| Check | Count | Status |
|---|---|---|
| Total users | _____ | [ ] |
| Users with valid email | _____ | [ ] |
| Users with valid password hash | _____ | [ ] |
| Users with role = 'admin' | _____ | [ ] |
| Users with role = 'user' | _____ | [ ] |
| Users with membershipTier = 'premium' | _____ | [ ] |
| Users with isDeleted = true | _____ | [ ] |
| Users with isBlocked = true | _____ | [ ] |
| Users with verified = true | _____ | [ ] |
| Admin users (admin@localhost.com etc.) | _____ | [ ] |

---

# PART 12 — Master PostgreSQL Database Specification

## 12.1 Complete ER Overview

```
                                    ┌──────────────────┐
                                    │      users       │
                                    │  (34 columns)    │
                                    └────────┬─────────┘
                                             │
         ┌───────────────────────────────────┼───────────────────────────────────┐
         │                                   │                                   │
         ▼                                   ▼                                   ▼
┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│ pooja_bookings  │             │   subscriptions  │             │     donations    │
│  (23 columns)   │             │   (18 columns)   │             │   (18 columns)   │
└────────┬────────┘             └────────┬─────────┘             └──────────────────┘
         │                               │
         ▼                               ▼
┌─────────────────┐             ┌──────────────────┐
│booking_messages │             │pending_subscr.   │
│  (8 columns)    │             │  (14 columns)    │
└─────────────────┘             └──────────────────┘

┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│     payments    │             │  approval_logs   │             │  temple_accounts │
│  (26 columns)   │             │   (8 columns)    │             │  (23 columns)    │
└─────────────────┘             └──────────────────┘             └──────────────────┘

┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│     expenses    │             │expense_categories│             │  classifications │
│  (13 columns)   │             │   (6 columns)    │             │   (6 columns)    │
└────────┬────────┘             └──────────────────┘             └──────────────────┘
         │
         ▼
┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│     vouchers    │             │      gallery     │             │ photo_categories │
│  (10 columns)   │             │  (11 columns)    │             │   (7 columns)    │
└─────────────────┘             └──────────────────┘             └──────────────────┘

┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│    festivals    │             │    poojas        │             │ membership_fees  │
│   (7 columns)   │             │  (18 columns)    │             │   (6 columns)    │
└─────────────────┘             └──────────────────┘             └──────────────────┘

┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│ admin_messages  │             │ notifications    │             │user_preferences  │
│   (7 columns)   │             │   (8 columns)    │             │   (6 columns)    │
└─────────────────┘             └──────────────────┘             └──────────────────┘

┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│  page_access    │             │premium_upgrade_r.│             │volunteer_partic. │
│   (8 columns)   │             │   (7 columns)    │             │   (7 columns)    │
└─────────────────┘             └──────────────────┘             └──────────────────┘

┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│sub_reminders    │             │ AI_messages      │             │   AI_images      │
│   (7 columns)   │             │   (5 columns)    │             │   (4 columns)    │
└─────────────────┘             └──────────────────┘             └──────────────────┘

┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│payment_accounts │             │account_types     │             │bank_account_conf │
│   (8 columns)   │             │   (5 columns)    │             │  (10 columns)    │
└─────────────────┘             └──────────────────┘             └──────────────────┘

┌─────────────────┐
│contact_inquiries│
│   (7 columns)   │
└─────────────────┘

INFRASTRUCTURE TABLES:
┌─────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│   audit_logs    │             │   email_queue    │             │email_dead_letter │
│  (10 columns)   │             │  (10 columns)    │             │   (8 columns)    │
└─────────────────┘             └──────────────────┘             └──────────────────┘
```

## 12.2 Table Dependency Graph

```
Layer 0 (no dependencies):
├── account_types
├── expense_categories
├── classifications
├── photo_categories
├── festivals
├── payment_accounts
├── bank_account_config
└── email_queue, email_dead_letter, audit_logs

Layer 1 (depends on Layer 0):
└── users (no FK dependencies)

Layer 2 (depends on users):
├── subscriptions
├── donations
├── membership_fees
├── user_preferences
├── volunteer_participation
├── admin_messages
├── notifications
├── page_access
├── premium_upgrade_requests
├── _integrated_ai_messages
└── approval_logs

Layer 3 (depends on Layer 2):
└── pending_subscriptions (depends on users + subscriptions)

Layer 4 (depends on Layer 0 + Layer 1):
├── poojas (depends on festivals)
└── gallery (depends on photo_categories)

Layer 5 (depends on Layer 1 + Layer 4):
└── pooja_bookings (depends on users + poojas)

Layer 6 (depends on Layer 5):
└── booking_messages (depends on pooja_bookings)

Layer 7 (depends on Layer 0):
├── expenses (depends on expense_categories)
└── vouchers (depends on expenses)
```

## 12.3 Migration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION FLOW                                │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Phase 1     │    │  Phase 2     │    │  Phase 3     │      │
│  │  Schema      │───▶│  Data Export │───▶│  Data Import │      │
│  │  Creation    │    │  from PB     │    │  to PG       │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Validate    │    │  Validate    │    │  Validate    │      │
│  │  Schema      │    │  Exports     │    │  Row Counts  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                 │                │
│                                                 ▼                │
│                                        ┌──────────────┐         │
│                                        │  Phase 4     │         │
│                                        │  API Cutover │         │
│                                        └──────────────┘         │
│                                                 │                │
│                                                 ▼                │
│                                        ┌──────────────┐         │
│                                        │  Validate    │         │
│                                        │  Integrity   │         │
│                                        └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## 12.4 Data Lifecycle

```
CREATE              READ                UPDATE              DELETE
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
User registers    User logs in       User updates profile  User soft-deletes
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
Donor donates     View donations    Admin approves        Admin soft-deletes
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
Booking created   View bookings     Booking confirmed     Booking cancelled
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
Subscription      View subscription Subscription active   Subscription expires
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
Expense recorded  View expenses     Expense corrected     (never deleted)
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
Gallery upload    View gallery      Gallery updated       Gallery archived
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
AI message        View chat history  AI responds           History purged (90d)
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
Audit logged      View audit logs   (immutable)           Purged after 365d
```

## 12.5 Storage Strategy

| Data Type | Storage | Backup | Retention |
|---|---|---|---|
| **Database (PostgreSQL)** | Local filesystem (`/var/lib/postgresql/`) | Daily dump | 30 days |
| **User uploads** | Local filesystem (`/uploads/`) | Daily copy | Indefinite |
| **Receipt PDFs** | Local filesystem (`/uploads/receipts/`) | Daily copy | 7 years (legal) |
| **AI images** | Local filesystem (`/uploads/ai-images/`) | Daily copy | 90 days |
| **Temp files** | Local filesystem (`/uploads/temp/`) | No backup | 1 hour (auto-cleanup) |
| **Audit logs** | PostgreSQL (`audit_logs` table) | Included in DB dump | 365 days |
| **Email queue** | PostgreSQL (`email_queue` table) | Included in DB dump | Until processed |
| **Email dead letters** | PostgreSQL (`email_dead_letter` table) | Included in DB dump | Until reviewed |

## 12.6 Future Scalability Considerations

| Consideration | Current | Future | Trigger |
|---|---|---|---|
| **Partitioning** | No partitioning | Range partition `audit_logs` by month | Row count > 10M |
| **Read replicas** | Single PostgreSQL instance | Read replica for reports | Report queries > 1s |
| **Connection pooling** | Prisma built-in pool | PgBouncer | > 20 concurrent connections |
| **Caching** | In-memory (node-cache) | Redis | Multiple API instances |
| **File storage** | Local filesystem | S3-compatible storage | Disk usage > 80% |
| **Search** | PostgreSQL LIKE queries | Full-text search (tsvector) | Search performance > 200ms |
| **Archival** | Soft delete only | Table partitioning + archival | Data > 3 years old |

---

## Appendix A: Table Statistics Summary

| Metric | Value |
|---|---|
| **Total tables** | 34 |
| **Tables from PocketBase** | 31 |
| **New infrastructure tables** | 3 |
| **Total columns** | ~480 |
| **Total indexes** | ~120 |
| **Total foreign keys** | ~25 |
| **Total unique constraints** | ~12 |
| **Total check constraints** | ~15 |
| **Total enum types** | 25 |
| **Estimated Year 1 rows** | ~30,000 |
| **Estimated Year 5 rows** | ~400,000 |
| **Estimated Year 1 DB size** | ~50 MB |
| **Estimated Year 5 DB size** | ~500 MB |

## Appendix B: Migration Scripts Required

| Script | Purpose | Tables Affected |
|---|---|---|
| `01-create-schema.sql` | Create all tables and indexes | All 34 |
| `02-export-pb-data.sh` | Export PB collections to JSON | All 25 PB collections |
| `03-export-pb-files.sh` | Export PB file attachments | All file fields |
| `04-generate-uuid-mapping.sh` | Generate PB ID → UUID mapping | All 25 PB collections |
| `05-import-users.js` | Import users with field deduplication | `users` |
| `06-import-reference-data.js` | Import independent tables | `account_types`, `expense_categories`, etc. |
| `07-import-dependent-data.js` | Import tables with FK dependencies | All remaining tables |
| `08-validate-integrity.js` | Validate referential integrity | All FKs |
| `09-validate-financials.js` | Validate financial totals | Donations, payments, expenses, temple_accounts |
| `10-validate-files.js` | Validate file references | All file fields |
| `11-cutover.js` | API cutover script | API configuration |
| `12-cleanup-pb.js` | Archive PocketBase data | PB data directory |

---

**End of PostgreSQL Database Specification**
