# Data Architecture Blueprint

**Sri Siththi Vinayagar Temple — PostgreSQL + Prisma Migration**
**Generated:** 2026-07-11 | **Source:** PocketBase migrations (529 files) + hooks (50 files)

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Enum Definitions](#2-enum-definitions)
3. [Prisma Schema — Complete Models](#3-prisma-schema--complete-models)
4. [Entity Relationship Diagram](#4-entity-relationship-diagram)
5. [Index Strategy](#5-index-strategy)
6. [Data Types Mapping (PocketBase → Prisma)](#6-data-types-mapping-pocketbase--prisma)
7. [Field Cleanup & Deduplication Rules](#7-field-cleanup--deduplication-rules)
8. [Soft Delete Pattern](#8-soft-delete-pattern)
9. [Audit Trail Pattern](#9-audit-trail-pattern)
10. [File Storage Mapping](#10-file-storage-mapping)
11. [PocketBase System Fields → Prisma](#11-pocketbase-system-fields--prisma)
12. [Hook Behavior → Prisma Middleware/Triggers](#12-hook-behavior--prisma-middlewaretriggers)
13. [Data Migration Strategy](#13-data-migration-strategy)
14. [Validation Constraints](#14-validation-constraints)
15. [Collection Inventory (25 Active Collections)](#15-collection-inventory-25-active-collections)

---

## 1. Design Principles

| Principle | Description |
|---|---|
| **Normalize duplicates** | PB users collection has 3 role fields (`role`, `user_role`, `account_type`), 3 membership fields (`membershipTier`, `membership_type`, `membership`), 2 name fields (`full_name`, `fullName`). Prisma collapses to single canonical fields. |
| **Preserve all data** | No data loss during migration. Deprecated fields mapped to new canonical fields. |
| **Soft delete everywhere** | `deletedAt: DateTime?` pattern for all mutable entities. |
| **UUID primary keys** | Replace PB's `id` (15-char alphanumeric) with PostgreSQL `uuid`. |
| **Timestamps** | All models get `createdAt` and `updatedAt` (Prisma `@updatedAt`). |
| **Relations over text** | Replace PB text foreign keys (e.g., `user_id`, `subscription_id`) with proper Prisma relations. |
| **JSON where needed** | PB `json` fields stay as `Json` in Prisma (e.g., AI message content). |
| **No file storage in DB** | File fields become `String?` (URL/path) pointing to local filesystem. |

---

## 2. Enum Definitions

```prisma
// ═══════════════════════════════════════════════════════════════
// ENUMS — Source: PocketBase select field values
// ═══════════════════════════════════════════════════════════════

enum UserRole {
  user
  admin
}

enum MembershipTier {
  free
  premium
}

enum ApprovalStatus {
  pending_approval
  approved
  rejected
}

enum SubscriptionStatus {
  free
  premium
  admin
}

enum PremiumStatus {
  Active
  Inactive
  Pending
}

enum AccountType {
  free_member      @map("Free Member")
  premium_member   @map("Premium Member")
  admin            @map("Admin")
}

enum PreferredLanguage {
  Tamil
  English
  Deutsch
}

enum FontSizePreference {
  small   @map("0.9")
  normal  @map("1.0")
  large   @map("1.2")
}

enum NotificationPreference {
  all
  important
  none
}

enum PoojaCategory {
  daily
  special
  festival
  life_cycle
  homam
  archana
}

enum PoojaStatus {
  active
  inactive
  archived
  draft
}

enum BookingStatus {
  pending
  approved
  rejected
  confirmed
  cancelled
  completed
}

enum PaymentStatus {
  pending
  completed
  failed
  refunded
}

enum SubscriptionPlanType {
  premium
}

enum SubscriptionRecordStatus {
  pending
  active
  rejected
}

enum RenewalType {
  auto
  manual
}

enum PaymentApprovalStatus {
  pending
  approved
  rejected
}

enum ApprovalLogAction {
  approved
  rejected
  restored
  deleted
}

enum FestivalStatus {
  active
  archived
}

enum BookingMessageSenderType {
  admin
  user
}

enum SubscriptionReminderStatus {
  pending
  sent
  failed
}

enum AiMessageRole {
  user
  assistant
}

enum PageAccessLevel {
  view
  edit
  admin
}

enum SubscriptionType {
  Monthly
  Yearly
}

enum VolunteerStatus {
  completed
  pending
}
```

---

## 3. Prisma Schema — Complete Models

```prisma
// ═══════════════════════════════════════════════════════════════
// DATABASE — PostgreSQL
// ═══════════════════════════════════════════════════════════════

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════
// 1. USERS — Core auth + profile
// Source: _pb_users_auth_ + 45 modifications
// PB built-in: id, email, password, tokenKey, verified, avatar,
//   emailVisibility, lastResetSentAt, lastVerificationSentAt
// ═══════════════════════════════════════════════════════════════

model User {
  id                String               @id @default(uuid()) @db.Uuid
  email             String               @unique @db.VarChar(320)
  name              String               @db.VarChar(100)
  password          String               @db.VarChar(255)
  avatar            String?
  verified          Boolean              @default(false)
  emailVisibility   Boolean              @default(false)
  tokenKey          String?              @unique @db.VarChar(255)
  lastResetSentAt   DateTime?
  lastVerificationSentAt DateTime?

  // Role & Membership (canonical fields — deduplicated)
  role                UserRole           @default(user)
  membershipTier      MembershipTier     @default(free)
  membershipType      MembershipTier     @default(free)     @map("membership_type")
  subscriptionStatus  SubscriptionStatus @default(free)     @map("subscription_status")
  premiumStatus       PremiumStatus      @default(Inactive) @map("premium_status")
  approvalStatus      ApprovalStatus     @default(pending_approval) @map("approval_status")
  accountType         AccountType        @default(free_member) @map("account_type")

  // Profile
  phone               String?            @db.VarChar(15)
  address             String?            @db.VarChar(200)
  city                String?            @db.VarChar(50)
  state               String?            @db.VarChar(50)
  pincode             String?            @db.VarChar(6)
  preferredLanguage   PreferredLanguage? @map("preferred_language")
  fontSizePreference  FontSizePreference @default(normal) @map("fontSizePreference")

  // Dates
  joinDate             DateTime?         @default(now()) @map("joinDate")
  subscriptionExpiryDate DateTime?       @map("subscription_expiry_date")
  lastRenewalDate      DateTime?         @map("last_renewal_date")

  // Soft delete & block
  isBlocked            Boolean           @default(false) @map("is_blocked")
  blockedAt            DateTime?         @map("blocked_at")
  isDeleted            Boolean           @default(false) @map("is_deleted")
  deletedAt            DateTime?         @map("deleted_at")
  archived             Boolean           @default(false)

  // Timestamps
  createdAt            DateTime          @default(now()) @map("created")
  updatedAt            DateTime          @updatedAt @map("updated")

  // Relations
  poojaBookings        PoojaBooking[]
  donations            Donation[]
  subscriptions        Subscription[]
  pendingSubscriptions PendingSubscription[]
  payments             Payment[]
  approvalLogsCreated  ApprovalLog[]     @relation("ApprovalLogAdmin")
  templeAccounts       TempleAccount[]
  bookingMessages      BookingMessage[]
  pageAccesses         PageAccess[]
  premiumUpgradeRequests PremiumUpgradeRequest[]
  aiMessages           IntegratedAiMessage[]
  volunteerParticipation VolunteerParticipation[]
  userPreferences      UserPreference[]
  adminMessagesSent    AdminMessage[]
  assignedPageAccesses PageAccess[]      @relation("PageAccessGrantor")

  @@index([role])
  @@index([membershipTier])
  @@index([approvalStatus])
  @@index([accountType])
  @@index([isDeleted])
  @@map("users")
}

// ═══════════════════════════════════════════════════════════════
// 2. POOJAS — Temple services/events
// Source: poojas collection (recreated at 1774618478)
// ═══════════════════════════════════════════════════════════════

model Pooja {
  id                String          @id @default(uuid()) @db.Uuid
  name              String          @db.VarChar(255)
  description       String?         @db.Text
  category          PoojaCategory   @default(daily)
  donationAmount    Decimal         @map("donation_amount") @db.Decimal(10, 2)
  price             Decimal?        @db.Decimal(10, 2)

  // Availability
  availabilityType  String?         @map("availabilityType") @db.VarChar(50)
  dates             Json?           // Array of date strings
  days              Json?           // Array of day names
  specificDates     Json?           @map("specificDates")
  specificDays      Json?           @map("specificDays")
  timeSlots         Json?           @map("timeSlots")

  // Status
  status            PoojaStatus     @default(active)
  isArchived        Boolean         @default(false) @map("is_archived")
  archivedAt        DateTime?       @map("archived_at")
  isDeleted         Boolean         @default(false) @map("is_deleted")

  // Festival link
  festivalId        String?         @map("festival")
  festival          Festival?       @relation(fields: [festivalId], references: [id])

  // Timestamps
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  // Relations
  poojaBookings     PoojaBooking[]

  @@index([category])
  @@index([status])
  @@index([isArchived])
  @@index([isDeleted])
  @@map("poojas")
}

// ═══════════════════════════════════════════════════════════════
// 3. POOJA BOOKINGS — User bookings for poojas
// Source: pooja_bookings collection
// ═══════════════════════════════════════════════════════════════

model PoojaBooking {
  id                String          @id @default(uuid()) @db.Uuid

  // Relations
  userId            String          @map("user")
  user              User            @relation(fields: [userId], references: [id])
  poojaId           String          @map("pooja")
  pooja             Pooja           @relation(fields: [poojaId], references: [id])

  // Booking details
  name              String          @db.VarChar(255)
  email             String          @db.VarChar(320)
  userContact       String?         @map("user_contact") @db.VarChar(15)
  phone             String?         @db.VarChar(15)
  bookingDate       DateTime?       @map("booking_date")
  poojaDate         DateTime?       @map("pooja_date")
  timeSlot          String?         @map("time_slot") @db.VarChar(50)
  selectedDate      String?         @map("selectedDate") @db.VarChar(50)
  selectedTimeSlot  String?         @map("selectedTimeSlot") @db.VarChar(50)
  donationAmount    Decimal         @map("donation_amount") @db.Decimal(10, 2)

  // Status
  bookingStatus     BookingStatus   @default(pending) @map("booking_status")
  paymentStatus     PaymentStatus?  @map("payment_status")
  status            String?         @db.VarChar(50) // legacy, kept for data migration

  // Receipt
  receiptNumber     String?         @map("receipt_number") @db.VarChar(50)
  transactionId     String?         @map("transaction_id") @db.VarChar(100)

  // Metadata
  notes             String?         @db.Text
  poojaName         String?         @map("pooja_name") @db.VarChar(255) // denormalized
  bookingTime       DateTime?       @map("booking_time")
  isDeleted         Boolean         @default(false) @map("is_deleted")

  // Timestamps
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  // Relations
  messages          BookingMessage[]

  @@index([userId])
  @@index([poojaId])
  @@index([bookingStatus])
  @@index([isDeleted])
  @@map("pooja_bookings")
}

// ═══════════════════════════════════════════════════════════════
// 4. DONATIONS — User donations
// Source: donations collection (created 1774778965)
// ═══════════════════════════════════════════════════════════════

model Donation {
  id                String          @id @default(uuid()) @db.Uuid
  userId            String          @map("user")
  user              User            @relation(fields: [userId], references: [id])

  amount            Decimal         @db.Decimal(10, 2)
  donationDate      DateTime?       @map("donation_date")
  donationDescription String?       @map("donation_description") @db.Text
  specialOccasion   String?         @map("special_occasion") @db.VarChar(255)
  category          String?         @db.VarChar(100)

  // Status
  status            PaymentApprovalStatus? @default(pending)
  approvalDate      DateTime?       @map("approval_date")
  paymentStatus     PaymentStatus?  @map("payment_status")

  // Receipt
  receiptNumber     String?         @map("receipt_number") @db.VarChar(50)
  receiptPdf        String?         @map("receipt_pdf") @db.VarChar(500)
  receiptGeneratedAt DateTime?      @map("receipt_generated_at")

  // Contact (denormalized from user)
  contactNumber     String?         @map("contact_number") @db.VarChar(15)
  email             String?         @db.VarChar(320)
  communicationPreference String?  @map("communication_preference") @db.VarChar(50)

  isDeleted         Boolean         @default(false) @map("is_deleted")

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@index([userId])
  @@index([status])
  @@index([isDeleted])
  @@map("donations")
}

// ═══════════════════════════════════════════════════════════════
// 5. SUBSCRIPTIONS — Premium membership subscriptions
// Source: subscriptions collection (recreated 3x, final at 1776496828)
// ═══════════════════════════════════════════════════════════════

model Subscription {
  id                String                @id @default(uuid()) @db.Uuid
  userId            String                @map("user")
  user              User                  @relation(fields: [userId], references: [id])

  planType          SubscriptionPlanType  @default(premium) @map("plan_type")
  amount            Decimal               @db.Decimal(10, 2)
  billingCycle      String                @map("billing_cycle") @db.VarChar(100)
  customDonation    Decimal?              @map("custom_donation") @db.Decimal(10, 2)
  totalAmount       Decimal               @map("total_amount") @db.Decimal(10, 2)
  durationMonths    Int                   @map("duration_months")
  renewalType       RenewalType           @map("renewal_type")

  // Dates
  startDate         DateTime              @map("start_date")
  endDate           DateTime              @map("end_date")

  // Status
  status            SubscriptionRecordStatus @default(pending)

  // Payment reference
  transactionId     String?               @map("transaction_id") @db.VarChar(100)
  transactionRef    String?               @map("transaction_ref") @db.VarChar(100)

  // Admin
  adminNotes        String?               @map("admin_notes") @db.Text
  description       String?               @db.Text

  // Legacy (kept for migration, will be dropped later)
  userIdText        String?               @map("user_id") @db.VarChar(100)

  createdAt         DateTime              @default(now()) @map("created")
  updatedAt         DateTime              @updatedAt @map("updated")

  pendingSubscriptions PendingSubscription[]

  @@index([userId])
  @@index([status])
  @@index([planType])
  @@map("subscriptions")
}

// ═══════════════════════════════════════════════════════════════
// 6. PENDING SUBSCRIPTIONS — Subscription approval queue
// Source: pending_subscriptions collection
// ═══════════════════════════════════════════════════════════════

model PendingSubscription {
  id                String          @id @default(uuid()) @db.Uuid

  email             String          @db.VarChar(320)
  fullName          String          @map("full_name") @db.VarChar(255)
  contactNumber     String          @map("contact_number") @db.VarChar(15)
  subscriptionType  String          @map("subscription_type") @db.VarChar(50)
  transactionId     String          @map("transaction_id") @db.VarChar(100)

  userId            String          @map("user")
  user              User            @relation(fields: [userId], references: [id])
  subscriptionId    String          @map("subscription")
  subscription      Subscription    @relation(fields: [subscriptionId], references: [id])

  status            BookingStatus   @default(pending)
  paymentStatus     PaymentStatus   @map("payment_status")

  startDate         DateTime        @map("start_date")
  endDate           DateTime        @map("end_date")
  renewalDate       DateTime?       @map("renewal_date")

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@index([userId])
  @@index([subscriptionId])
  @@index([status])
  @@index([paymentStatus])
  @@map("pending_subscriptions")
}

// ═══════════════════════════════════════════════════════════════
// 7. PAYMENTS — Payment records (replaces payment_records)
// Source: payments collection (created 1777109972)
// ═══════════════════════════════════════════════════════════════

model Payment {
  id                String                @id @default(uuid()) @db.Uuid
  userId            String                @map("user")
  user              User                  @relation(fields: [userId], references: [id])
  approvedById      String?               @map("approved_by")
  approvedBy        User?                 @relation("PaymentApprover", fields: [approvedById], references: [id])

  amount            Decimal               @db.Decimal(10, 2)
  totalAmount       Decimal               @map("total_amount") @db.Decimal(10, 2)
  customDonation    Decimal?              @map("custom_donation") @db.Decimal(10, 2)
  planType          String?               @map("plan_type") @db.VarChar(50)
  billingCycle      String                @map("billing_cycle") @db.VarChar(100)
  subscriptionType  String?               @map("subscription_type") @db.VarChar(50)

  // Dates
  startDate         DateTime              @map("start_date")
  endDate           DateTime              @map("end_date")

  // Status
  status            PaymentApprovalStatus?
  paymentStatus     PaymentStatus?        @map("payment_status")

  // Payment reference
  transactionId     String?               @map("transaction_id") @db.VarChar(100)
  transactionRef    String?               @map("transaction_ref") @db.VarChar(100)
  paymentMethod     String?               @map("payment_method") @db.VarChar(50)

  // Receipt
  receiptPdf        String?               @map("receipt_pdf") @db.VarChar(500)
  receiptId         String?               @map("receipt_id") @db.VarChar(100)
  receiptNumber     String?               @map("receipt_number") @db.VarChar(50)
  receiptGeneratedAt DateTime?            @map("receipt_generated_at")
  receiptSentAt     DateTime?             @map("receipt_sent_at")
  resendReceipt     Boolean               @default(false) @map("resend_receipt")

  // Admin
  adminNotes        String?               @map("admin_notes") @db.Text
  approvedAt        DateTime?             @map("approved_at")

  // Contact (denormalized)
  email             String                @db.VarChar(320)

  createdAt         DateTime              @default(now()) @map("created")
  updatedAt         DateTime              @updatedAt @map("updated")

  @@index([userId])
  @@index([status])
  @@map("payments")
}

// ═══════════════════════════════════════════════════════════════
// 8. APPROVAL LOGS — Subscription approval audit trail
// Source: approval_logs collection (created 1776571755)
// ═══════════════════════════════════════════════════════════════

model ApprovalLog {
  id                String              @id @default(uuid()) @db.Uuid
  adminId           String              @map("admin_id")
  admin             User                @relation("ApprovalLogAdmin", fields: [adminId], references: [id])
  adminName         String              @map("admin_name") @db.VarChar(255)
  action            ApprovalLogAction
  timestamp         DateTime            @default(now())
  notes             String?             @db.Text

  createdAt         DateTime            @default(now()) @map("created")
  updatedAt         DateTime            @updatedAt @map("updated")

  @@index([adminId])
  @@index([action])
  @@map("approval_logs")
}

// ═══════════════════════════════════════════════════════════════
// 9. TEMPLE ACCOUNTS — Financial ledger entries
// Source: temple_accounts collection
// ═══════════════════════════════════════════════════════════════

model TempleAccount {
  id                    String          @id @default(uuid()) @db.Uuid
  memberName            String          @map("member_name") @db.VarChar(255)
  amount                Decimal         @db.Decimal(10, 2)
  category              String          @db.VarChar(100)
  date                  DateTime        @db.Date
  month                 String?         @db.VarChar(20)
  year                  Int?
  classification        String          @db.VarChar(100)
  description           String?         @db.Text
  transactionId         String          @map("transaction_id") @db.VarChar(100)
  subscriptionId        String?         @map("subscription_id") @db.VarChar(100)
  status                String?         @db.VarChar(50)
  notes                 String?         @db.Text
  entryType             String?         @map("entry_type") @db.VarChar(50)
  subscriptionType      SubscriptionType? @map("subscription_type")

  // Fund breakdown
  annadhanamAmount      Decimal?        @map("annadhanam_amount") @db.Decimal(10, 2)
  templeMaintenanceAmount Decimal?      @map("temple_maintenance_amount") @db.Decimal(10, 2)
  goshalaAmount         Decimal?        @map("goshala_amount") @db.Decimal(10, 2)
  vedaPathshalaAmount   Decimal?        @map("veda_pathshala_amount") @db.Decimal(10, 2)
  generalFundAmount     Decimal?        @map("general_fund_amount") @db.Decimal(10, 2)
  totalAmount           Decimal?        @map("total_amount") @db.Decimal(10, 2)
  poojaServicesAmount   Decimal?        @map("pooja_services_amount") @db.Decimal(10, 2)

  createdAt             DateTime        @default(now()) @map("created")
  updatedAt             DateTime        @updatedAt @map("updated")

  @@index([category])
  @@index([date])
  @@index([month, year])
  @@index([classification])
  @@map("temple_accounts")
}

// ═══════════════════════════════════════════════════════════════
// 10. EXPENSES — Temple expense records
// Source: expenses collection (created 1775898945)
// ═══════════════════════════════════════════════════════════════

model Expense {
  id                String          @id @default(uuid()) @db.Uuid
  categoryId        String          @map("category_id")
  category          ExpenseCategory @relation(fields: [categoryId], references: [id])
  amount            Decimal         @db.Decimal(10, 2)
  date              DateTime        @db.Date
  paidTo            String?         @map("paid_to") @db.VarChar(255)
  paymentMethod     String?         @map("payment_method") @db.VarChar(50)
  billFile          String?         @map("bill_file") @db.VarChar(500)
  createdBy         String          @map("created_by") @db.VarChar(255)
  quantity          Int?
  classification    String?         @db.VarChar(100)
  voucherId         String?         @map("voucher_id") @db.VarChar(100)
  description       String?         @db.Text

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@index([categoryId])
  @@index([date])
  @@map("expenses")
}

// ═══════════════════════════════════════════════════════════════
// 11. EXPENSE CATEGORIES — Expense classification
// Source: expense_categories collection (created 1775898944)
// ═══════════════════════════════════════════════════════════════

model ExpenseCategory {
  id                String          @id @default(uuid()) @db.Uuid
  name              String          @db.VarChar(255)
  description       String?         @db.Text
  createdBy         String?         @map("created_by") @db.VarChar(255)

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  expenses          Expense[]

  @@map("expense_categories")
}

// ═══════════════════════════════════════════════════════════════
// 12. MEMBERSHIP FEES — Membership payment records
// Source: membership_fees collection (created 1774619065)
// ═══════════════════════════════════════════════════════════════

model MembershipFee {
  id                String          @id @default(uuid()) @db.Uuid
  userId            String          @map("user_id") @db.VarChar(100)
  amount            Decimal         @db.Decimal(10, 2)
  signupDate        DateTime        @map("signup_date") @db.Date
  createdAtField    DateTime?       @default(now()) @map("created_at")

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@index([userId])
  @@map("membership_fees")
}

// ═══════════════════════════════════════════════════════════════
// 13. GALLERY — Media library
// Source: gallery collection
// ═══════════════════════════════════════════════════════════════

model Gallery {
  id                String          @id @default(uuid()) @db.Uuid
  title             String          @db.VarChar(255)
  description       String?         @db.Text
  image             String?         @db.VarChar(500) // file URL
  uploadedBy        String?         @map("uploadedBy") @db.VarChar(255)
  order             Int?
  categoryId        String?         @map("category_id")
  category          PhotoCategory?  @relation(fields: [categoryId], references: [id])
  isPublished       Boolean         @default(false) @map("is_published")
  archived          Boolean         @default(false)
  storageSize       Int?            @map("storage_size")

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@index([categoryId])
  @@index([isPublished])
  @@index([order])
  @@map("gallery")
}

// ═══════════════════════════════════════════════════════════════
// 14. PHOTO CATEGORIES — Gallery category classification
// Source: photo_categories collection (created 1775878065)
// ═══════════════════════════════════════════════════════════════

model PhotoCategory {
  id                String          @id @default(uuid()) @db.Uuid
  name              String          @db.VarChar(255)
  description       String?         @db.Text
  createdBy         String?         @map("created_by") @db.VarChar(255)
  defaultExpanded   Boolean         @default(false) @map("default_expanded")
  isPublished       Boolean         @default(false) @map("is_published")

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  galleries         Gallery[]

  @@map("photo_categories")
}

// ═══════════════════════════════════════════════════════════════
// 15. FESTIVALS — Temple festivals
// Source: festivals collection
// ═══════════════════════════════════════════════════════════════

model Festival {
  id                String          @id @default(uuid()) @db.Uuid
  name              String          @db.VarChar(255)
  description       String?         @db.Text
  date              DateTime?       @db.Date
  status            FestivalStatus?
  image             String?         @db.VarChar(500) // file URL

  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  poojas            Pooja[]

  @@index([status])
  @@map("festivals")
}

// ═══════════════════════════════════════════════════════════════
// 16. VOLUNTEER PARTICIPATION — Volunteer event tracking
// Source: volunteer_participation collection
// ═══════════════════════════════════════════════════════════════

model VolunteerParticipation {
  id                String          @id @default(uuid()) @db.Uuid
  userId            String          @map("user_id") @db.VarChar(100)
  eventName         String          @map("event_name") @db.VarChar(255)
  participationDate DateTime        @map("participation_date") @db.Date
  hours             Int?
  status            VolunteerStatus?

  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated")

  user              User?           @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("volunteer_participation")
}

// ═══════════════════════════════════════════════════════════════
// 17. ADMIN MESSAGES — Admin-to-user communications
// Source: admin_messages collection
// ═══════════════════════════════════════════════════════════════

model AdminMessage {
  id                String              @id @default(uuid()) @db.Uuid
  userId            String              @map("user_id") @db.VarChar(100)
  message           String              @db.Text
  languagePreference PreferredLanguage?  @map("language_preference")
  sentDate          DateTime?           @default(now()) @map("sent_date")
  readStatus        Boolean             @default(false) @map("read_status")

  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated")

  user              User?               @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("admin_messages")
}

// ═══════════════════════════════════════════════════════════════
// 18. USER PREFERENCES — Per-user settings
// Source: user_preferences collection
// ═══════════════════════════════════════════════════════════════

model UserPreference {
  id                      String                    @id @default(uuid()) @db.Uuid
  userId                  String                    @map("user_id") @db.VarChar(100)
  preferredLanguage       PreferredLanguage?        @map("preferred_language")
  communicationLanguage   String?                   @map("communication_language") @db.VarChar(50)
  notificationPreference  NotificationPreference?   @map("notification_preference")

  createdAt               DateTime                  @default(now()) @map("created_at")
  updatedAt               DateTime                  @updatedAt @map("updated_at")

  user                    User?                     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("user_preferences")
}

// ═══════════════════════════════════════════════════════════════
// 19. SUBSCRIPTION REMINDERS — Expiry notification tracking
// Source: subscription_reminders collection
// ═══════════════════════════════════════════════════════════════

model SubscriptionReminder {
  id                String                      @id @default(uuid()) @db.Uuid
  email             String                      @db.VarChar(320)
  subscriptionId    String                      @map("subscription_id") @db.VarChar(100)
  reminderDate      DateTime                    @map("reminder_date") @db.Date
  sentDate          DateTime?                   @map("sent_date")
  status            SubscriptionReminderStatus?

  createdAt         DateTime                    @default(now()) @map("created")
  updatedAt         DateTime                    @updatedAt @map("updated")

  @@index([email])
  @@index([status])
  @@map("subscription_reminders")
}

// ═══════════════════════════════════════════════════════════════
// 20. BOOKING MESSAGES — Chat per booking
// Source: booking_messages collection (created 1774768485)
// ═══════════════════════════════════════════════════════════════

model BookingMessage {
  id                String                  @id @default(uuid()) @db.Uuid
  bookingId         String                  @map("booking_id")
  booking           PoojaBooking            @relation(fields: [bookingId], references: [id])
  senderType        BookingMessageSenderType @map("sender_type")
  senderEmail       String                  @map("sender_email") @db.VarChar(320)
  messageContent    String                  @map("message_content") @db.Text
  readStatus        Boolean                 @default(false) @map("read_status")

  createdAt         DateTime                @default(now()) @map("created_at")
  updatedAt         DateTime                @updatedAt @map("updated")

  @@index([bookingId])
  @@map("booking_messages")
}

// ═══════════════════════════════════════════════════════════════
// 21. PAGE ACCESS — Per-user page permissions
// Source: page_access collection (recreated at 1777815441)
// ═══════════════════════════════════════════════════════════════

model PageAccess {
  id                String          @id @default(uuid()) @db.Uuid
  userId            String          @map("userId") @db.VarChar(100)
  pageRoute         String          @map("pageRoute") @db.VarChar(255)
  accessLevel       PageAccessLevel @default(view) @map("accessLevel")
  grantedAt         DateTime?       @default(now()) @map("grantedAt")
  grantedBy         String?         @map("grantedBy") @db.VarChar(100)
  isActive          Boolean         @default(true) @map("isActive")

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@index([userId])
  @@index([pageRoute])
  @@map("page_access")
}

// ═══════════════════════════════════════════════════════════════
// 22. PREMIUM UPGRADE REQUESTS — Upgrade application queue
// Source: premium_upgrade_requests collection
// ═══════════════════════════════════════════════════════════════

model PremiumUpgradeRequest {
  id                String                @id @default(uuid()) @db.Uuid
  email             String                @db.VarChar(320)
  transactionId     String                @map("transaction_id") @db.VarChar(100)
  status            PaymentApprovalStatus?
  membershipType    String                @map("membership_type") @db.VarChar(50)
  adminNotes        String?               @map("admin_notes") @db.Text

  createdAt         DateTime              @default(now()) @map("created_at")
  updatedAt         DateTime              @updatedAt @map("updated")

  @@index([email])
  @@index([status])
  @@map("premium_upgrade_requests")
}

// ═══════════════════════════════════════════════════════════════
// 23. INTEGRATED AI MESSAGES — AI chat history
// Source: _integratedAiMessages collection
// ═══════════════════════════════════════════════════════════════

model IntegratedAiMessage {
  id                String          @id @default(uuid()) @db.Uuid
  userId            String?         @map("userId") @db.VarChar(100)
  role              AiMessageRole
  content           Json

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  user              User?           @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("_integrated_ai_messages")
}

// ═══════════════════════════════════════════════════════════════
// 24. INTEGRATED AI IMAGES — AI-generated images
// Source: _integratedAiImages collection
// ═══════════════════════════════════════════════════════════════

model IntegratedAiImage {
  id                String          @id @default(uuid()) @db.Uuid
  file              String          @db.VarChar(500) // file URL

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@map("_integrated_ai_images")
}

// ═══════════════════════════════════════════════════════════════
// 25. PAYMENT ACCOUNTS — Bank account / QR config
// Source: payment_accounts collection (created 1775218002)
// ═══════════════════════════════════════════════════════════════

model PaymentAccount {
  id                String          @id @default(uuid()) @db.Uuid
  accountName       String          @map("account_name") @db.VarChar(255)
  bankName          String          @map("bank_name") @db.VarChar(255)
  accountNumber     String          @map("account_number") @db.VarChar(50)
  email             String          @db.VarChar(320)
  qrCode            String?         @db.VarChar(500) // file URL
  iban              String?         @db.VarChar(50)
  paymentLink       String?         @map("payment_link") @db.VarChar(500)

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@map("payment_accounts")
}

// ═══════════════════════════════════════════════════════════════
// 26. USER ACCOUNT ASSIGNMENTS — Maps users to account types
// Source: user_account_assignments collection
// ═══════════════════════════════════════════════════════════════

model UserAccountAssignment {
  id                String          @id @default(uuid()) @db.Uuid
  userId            String          @map("userId") @db.VarChar(100)
  accountTypeId     String          @map("accountTypeId") @db.VarChar(100)
  assignedAt        DateTime?       @default(now()) @map("assignedAt")

  createdAt         DateTime        @default(now()) @map("created")
  updatedAt         DateTime        @updatedAt @map("updated")

  @@map("user_account_assignments")
}
```

---

## 4. Entity Relationship Diagram

```
                          ┌─────────────────────────────┐
                          │          USER               │
                          │  (auth + profile + role)    │
                          └──────┬──────────────────────┘
                                 │
           ┌─────────────────────┼──────────────────────────────┐
           │                     │                              │
           ▼                     ▼                              ▼
    ┌──────────────┐    ┌────────────────┐           ┌──────────────────┐
    │ POOJA_BOOKING│    │  SUBSCRIPTION  │           │     PAYMENT      │
    │              │    │                │           │                  │
    └──────┬───────┘    └───────┬────────┘           └──────────────────┘
           │                    │
           │                    ▼
           │         ┌────────────────────┐
           │         │PENDING_SUBSCRIPTION│
           │         └────────────────────┘
           │
           ▼
    ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
    │BOOKING_MSG   │    │    DONATION    │    │  APPROVAL_LOG    │
    └──────────────┘    └────────────────┘    └──────────────────┘

    ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
    │ TEMPLE_ACCT  │    │    EXPENSE     │    │ MEMBERSHIP_FEE   │
    └──────────────┘    └───────┬────────┘    └──────────────────┘
                                │
                                ▼
                         ┌────────────────┐
                         │EXPENSE_CATEGORY│
                         └────────────────┘

    ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
    │   GALLERY    │    │    FESTIVAL    │    │    VOLUNTEER     │
    └──────┬───────┘    └───────┬────────┘    └──────────────────┘
           │                    │
           ▼                    ▼
    ┌────────────────┐   (1:N to Poojas)
    │PHOTO_CATEGORY  │
    └────────────────┘

    ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
    │ADMIN_MESSAGE │    │USER_PREFERENCE │    │PAGE_ACCESS       │
    └──────────────┘    └────────────────┘    └──────────────────┘

    ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
    │SUB_REMINDER  │    │PREMIUM_UPGRADE │    │USER_ACCT_ASSIGN  │
    └──────────────┘    └────────────────┘    └──────────────────┘

    ┌──────────────┐    ┌────────────────┐
    │AI_MESSAGE    │    │AI_IMAGE        │
    └──────────────┘    └────────────────┘

    ┌──────────────────────────────┐
    │      PAYMENT_ACCOUNT         │
    │  (standalone — bank config)  │
    └──────────────────────────────┘

RELATIONSHIPS:
  User 1:N PoojaBooking        (userId → User.id)
  User 1:N Donation            (userId → User.id)
  User 1:N Subscription        (userId → User.id)
  User 1:N Payment             (userId → User.id)
  User 1:N PendingSubscription (userId → User.id)
  User 1:N ApprovalLog         (adminId → User.id)
  User 1:N BookingMessage      (via PoojaBooking)
  User 1:N IntegratedAiMessage (userId → User.id)
  User 1:N VolunteerParticipation (userId → User.id)
  User 1:N AdminMessage        (userId → User.id)
  User 1:N UserPreference      (userId → User.id)
  User 1:N PageAccess          (userId → User.id)

  Pooja 1:N PoojaBooking       (poojaId → Pooja.id)
  Pooja N:1 Festival           (festivalId → Festival.id)

  PoojaBooking 1:N BookingMessage (bookingId → PoojaBooking.id)

  Subscription 1:N PendingSubscription (subscriptionId → Subscription.id)

  ExpenseCategory 1:N Expense  (categoryId → ExpenseCategory.id)
  PhotoCategory 1:N Gallery    (categoryId → PhotoCategory.id)
  Payment 1:N Payment          (approvedById → User.id)
```

---

## 5. Index Strategy

### Composite Indexes

```prisma
// Query: "show active poojas in a category"
@@index([category, status])     // poojas

// Query: "list user's bookings by status"
@@index([userId, bookingStatus]) // pooja_bookings

// Query: "temple accounts for a month/year"
@@index([month, year])           // temple_accounts

// Query: "donations in a date range for a user"
@@index([userId, donationDate])  // donations (add in Prisma)

// Query: "pending payments for admin review"
@@index([status, createdAt])     // payments (add in Prisma)
```

### Partial Indexes (PostgreSQL-specific)

```sql
-- Only index non-deleted records
CREATE INDEX idx_poojas_active ON poojas(id) WHERE is_deleted = false;
CREATE INDEX idx_pooja_bookings_active ON pooja_bookings(id) WHERE is_deleted = false;
CREATE INDEX idx_donations_active ON donations(id) WHERE is_deleted = false;

-- Unique email index (matching PB)
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email != '';
```

---

## 6. Data Types Mapping (PocketBase → Prisma)

| PocketBase Type | Prisma Type | Notes |
|---|---|---|
| `text` | `String` | With `@db.VarChar(n)` for bounded fields |
| `number` | `Int` or `Decimal` | Money fields → `Decimal(10,2)` |
| `bool` | `Boolean` | Default `false` |
| `email` | `String` | `@db.VarChar(320)` |
| `url` | `String` | `@db.VarChar(500)` |
| `date` | `DateTime` | `@db.Date` for date-only fields |
| `select` | `enum` | Prisma enum with `@map()` |
| `json` | `Json` | For variable-structure data |
| `file` | `String` | Store URL/path, not binary |
| `relation` | `relation` | FK with `@relation()` |
| `autodate` | `@default(now())` | `createdAt` or explicit field |
| `password` | `String` | `@db.VarChar(255)`, hashed |
| `editor` | `String` | `@db.Text` for rich content |

---

## 7. Field Cleanup & Deduplication Rules

### Users Collection — Canonical Field Selection

| PB Fields (multiple) | Prisma Canonical | Decision |
|---|---|---|
| `full_name`, `fullName` | `name` | Merge into PB `name` field (already required) |
| `role`, `user_role`, `account_type` | `role`, `accountType` | `role` = system RBAC, `accountType` = display label |
| `membershipTier`, `membership_type`, `membership`, `subscription_status` | `membershipTier`, `subscriptionStatus` | `membershipTier` = current tier, `subscriptionStatus` = status |
| `blocked`, `is_blocked` | `isBlocked` | Single boolean |
| `is_deleted`, `deleted_at` | `isDeleted`, `deletedAt` | Keep both (pattern) |
| `fontSizePreference` (select: "0.9","1.0","1.2") | `fontSizePreference` | Remap to enum values `small/normal/large` |
| `preferred_language` (select: "Tamil","English","Deutsch") | `preferredLanguage` | Keep "Deutsch" (not "German") |

### Deprecated Fields — Migration Data Mapping

| Deprecated Field | → Canonical Field | Migration SQL |
|---|---|---|
| `users.fullName` | `users.name` | `UPDATE users SET name = fullName WHERE name = '' OR name IS NULL` |
| `users.full_name` | `users.name` | `UPDATE users SET name = full_name WHERE name = '' OR name IS NULL` |
| `users.user_role` | `users.role` | `UPDATE users SET role = user_role::UserRole WHERE user_role != ''` |
| `users.membership` | `users.membershipTier` | `UPDATE users SET membershipTier = membership::MembershipTier WHERE membership != ''` |
| `users.blocked` | `users.isBlocked` | `UPDATE users SET is_blocked = blocked WHERE blocked = true` |
| `users.account_type_status` | — | Drop (always null) |
| `pooja_bookings.status` | `pooja_bookings.bookingStatus` | Map old status values to new enum |
| `approval_logs.subscription_id` | — | Drop (field was removed in PB) |

---

## 8. Soft Delete Pattern

All mutable entities support soft delete:

```prisma
// Applied to: User, Pooja, PoojaBooking, Donation
isDeleted  Boolean  @default(false) @map("is_deleted")
deletedAt  DateTime? @map("deleted_at")
```

**Prisma Extension for auto-filtering:**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        // Auto-exclude soft-deleted for models that have isDeleted
        if ('isDeleted' in (args.where || {})) {
          return query(args);
        }
        args.where = { ...args.where, isDeleted: false };
        return query(args);
      }
    }
  }
});
```

---

## 9. Audit Trail Pattern

Replace PocketBase's `created`/`updated` system fields with explicit audit fields:

```prisma
model AuditLog {
  id            String   @id @default(uuid()) @db.Uuid
  entityType    String   @db.VarChar(50)   // "user", "pooja_booking", etc.
  entityId      String   @db.Uuid
  action        String   @db.VarChar(20)   // "create", "update", "delete"
  changes       Json?                       // { field: { old: x, new: y } }
  performedBy   String?  @db.Uuid          // userId of admin/user
  performedAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([performedAt])
  @@map("audit_logs")
}
```

---

## 10. File Storage Mapping

| PB Collection | PB Field | Storage Path | Access Pattern |
|---|---|---|---|
| `users` | `avatar` | `uploads/users/{userId}/avatar.{ext}` | Authenticated |
| `gallery` | `image` | `uploads/gallery/{galleryId}/image.{ext}` | Public |
| `festivals` | `image` | `uploads/festivals/{festivalId}/image.{ext}` | Public |
| `expenses` | `bill_file` | `uploads/expenses/{expenseId}/bill.{ext}` | Admin only |
| `payment_accounts` | `qr_code` | `uploads/payment-accounts/{id}/qr.{ext}` | Public |
| `payments` | `receipt_pdf` | `uploads/payments/{paymentId}/receipt.pdf` | Owner + Admin |
| `integrated_ai_images` | `file` | `uploads/ai-images/{id}/image.{ext}` | Owner |

**File URL generation:**
```typescript
// In StorageService
function getFileUrl(entity: string, id: string, filename: string): string {
  return `/hcgi/api/files/${entity}/${id}/${filename}`;
}
```

---

## 11. PocketBase System Fields → Prisma

| PB System Field | Prisma Equivalent | Notes |
|---|---|---|
| `id` (15-char alphanumeric) | `id` (UUID) | Generate new UUIDs; map old ID to `_pbId` if needed for migration |
| `created` (autodate) | `createdAt @default(now())` | |
| `updated` (autodate) | `updatedAt @updatedAt` | Prisma auto-manages |
| `tokenKey` | `tokenKey @unique` | For password reset tokens |
| `lastResetSentAt` | `lastResetSentAt` | Rate-limiting password resets |
| `lastVerificationSentAt` | `lastVerificationSentAt` | Rate-limiting email verification |

**PocketBase ID Migration:**
```sql
-- Add temporary column to map PB IDs to UUIDs during migration
ALTER TABLE users ADD COLUMN pb_id VARCHAR(15);
-- After migration, drop: ALTER TABLE users DROP COLUMN pb_id;
```

---

## 12. Hook Behavior → Prisma Middleware/Triggers

| PB Hook | Behavior | Prisma Equivalent |
|---|---|---|
| `users-set-default-account-type.pb.js` | Sets `account_type = "Free Member"` on create | `@default(free_member)` in schema |
| `set-default-approval-status.pb.js` | Sets `approval_status = "pending_approval"` when `membershipTier = premium` | Application logic in service layer |
| `subscriptions-auto-dates.pb.js` | Auto-sets `start_date = today`, `end_date = today+30d` | Service layer + Prisma `@default(now())` |
| `subscription-approval-auto-update.pb.js` | On status → active: update user membership | Service layer transaction |
| `subscription-auto-update-membership.pb.js` | On status → active/approved: update user premium fields | Service layer transaction |
| `subscription-approved.pb.js` | Sends approval email | Service layer (email queue) |
| `subscription-rejected.pb.js` | Sends rejection email | Service layer (email queue) |
| `subscription-created.pb.js` | Sends welcome email | Service layer (email queue) |
| `subscription-receipt-generation.pb.js` | Generates receipt PDF | Service layer (PDF generation) |
| `subscription-payment-completed.pb.js` | Creates temple_accounts entry | Service layer transaction |
| `subscription-expiry-reminder.pb.js` | Sends email 7 days before expiry | node-cron job |
| `payments-auto-upgrade-to-premium.pb.js` | On payment approved: create subscription, update user | Service layer transaction |
| `populate_pooja_name.pb.js` | Auto-populates `pooja_name` from pooja relation | Prisma middleware or service layer |
| `pooja-booking-approval.pb.js` | On approve: generate receipt, send email | Service layer |
| `pooja-booking-temple-accounts.pb.js` | On booking create/confirm: create temple_accounts entry | Service layer transaction |
| `donation-temple-accounts.pb.js` | On donation create/approve: create temple_accounts entry | Service layer transaction |
| `autoArchivePoojas.js` | Hourly cron: archive past poojas | node-cron job |

**Key pattern:** Most hooks that create related records become **Prisma transactions** in the service layer:

```typescript
// Example: approvePoojaBooking service
async function approvePoojaBooking(bookingId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.poojaBooking.update({
      where: { id: bookingId },
      data: { bookingStatus: 'approved', receiptNumber: generateReceiptNumber() }
    });
    
    await tx.templeAccount.create({
      data: {
        memberName: booking.name,
        amount: booking.donationAmount,
        category: 'Pooja Services',
        date: new Date(),
        classification: 'Pooja Booking',
        transactionId: booking.id,
      }
    });
    
    await emailService.sendBookingApproval(booking);
    return booking;
  });
}
```

---

## 13. Data Migration Strategy

### Phase 1: Schema + Infrastructure (Week 1-2)
1. Create PostgreSQL database
2. Run Prisma migrations
3. Create seed script for `payment_accounts` (bank config)
4. Build `StorageService`, `EmailService`, `JWTService`

### Phase 2: Data Export from PocketBase (Week 3)
1. Export each collection via PocketBase Admin API:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8090/api/collections/users/records?perPage=10000 \
     > pb_export/users.json
   ```
2. Export file attachments from `pb_data/storage/`
3. Generate mapping file for PB IDs → UUIDs

### Phase 3: Data Import to PostgreSQL (Week 3-4)
1. Load JSON exports into staging tables
2. Run deduplication/cleanup transformations
3. Map PB IDs to new UUIDs
4. Insert into final Prisma tables
5. Copy file attachments to `uploads/` directory
6. Verify record counts match

### Phase 4: API Cutover (Week 5-6)
1. Deploy new API with Prisma client
2. Run dual-write period (write to both PB and PG)
3. Compare read results for consistency
4. Switch reads to PostgreSQL
5. Stop writes to PocketBase

### Migration Script Pattern:
```typescript
// scripts/migrate-users.ts
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const pbUsers = JSON.parse(readFileSync('pb_export/users.json', 'utf-8'));

async function migrateUsers() {
  for (const pbUser of pbUsers.items) {
    await prisma.user.create({
      data: {
        pbId: pbUser.id,  // temporary
        email: pbUser.email,
        name: pbUser.name || pbUser.fullName || pbUser.full_name || '',
        password: pbUser.password,  // already hashed
        verified: pbUser.verified,
        role: pbUser.role || 'user',
        membershipTier: pbUser.membershipTier || 'free',
        // ... map all fields
      }
    });
  }
}
```

---

## 14. Validation Constraints

| Model | Field | Constraint | Source |
|---|---|---|---|
| `User` | `email` | Required, unique, max 320 | PB built-in |
| `User` | `name` | Required, 2-100 chars | PB migration #51 |
| `User` | `password` | Required, min 8 chars | PB migration #50 |
| `User` | `phone` | 10-15 chars | PB migration #52 |
| `User` | `address` | Max 200 chars | PB migration #53 |
| `User` | `city` | Max 50 chars | PB migration #54 |
| `User` | `state` | Max 50 chars | PB migration #55 |
| `User` | `pincode` | Exactly 6 chars | PB migration #56 |
| `Subscription` | `amount` | Min 0, max 100000 | PB migration |
| `Subscription` | `durationMonths` | Min 1, max 120 | PB migration |
| `Expense` | `amount` | Min 0.01 | PB migration |
| `PoojaBooking` | `donationAmount` | Min 1 (enforced in hook) | PB hook |
| `Gallery` | `image` | Max 20MB, mimeTypes: jpeg/png/gif/webp/mp4/webm | PB migration |

---

## 15. Collection Inventory (25 Active Collections)

| # | Collection | Prisma Model | PB Status | Records Type |
|---|---|---|---|---|
| 1 | `_pb_users_auth_` | `User` | Active | Auth + profile |
| 2 | `poojas` | `Pooja` | Active (recreated) | Temple services |
| 3 | `pooja_bookings` | `PoojaBooking` | Active | Service bookings |
| 4 | `donations` | `Donation` | Active | Donations |
| 5 | `subscriptions` | `Subscription` | Active (recreated 3x) | Premium subscriptions |
| 6 | `pending_subscriptions` | `PendingSubscription` | Active | Subscription queue |
| 7 | `payments` | `Payment` | Active (new) | Payment records |
| 8 | `approval_logs` | `ApprovalLog` | Active | Audit trail |
| 9 | `temple_accounts` | `TempleAccount` | Active | Financial ledger |
| 10 | `expenses` | `Expense` | Active | Expense tracking |
| 11 | `expense_categories` | `ExpenseCategory` | Active | Expense classification |
| 12 | `membership_fees` | `MembershipFee` | Active | Membership payments |
| 13 | `gallery` | `Gallery` | Active | Media library |
| 14 | `photo_categories` | `PhotoCategory` | Active | Gallery categories |
| 15 | `festivals` | `Festival` | Active | Temple festivals |
| 16 | `volunteer_participation` | `VolunteerParticipation` | Active | Volunteer tracking |
| 17 | `admin_messages` | `AdminMessage` | Active | Comms |
| 18 | `user_preferences` | `UserPreference` | Active | Per-user settings |
| 19 | `subscription_reminders` | `SubscriptionReminder` | Active | Notification tracking |
| 20 | `booking_messages` | `BookingMessage` | Active | Booking chat |
| 21 | `page_access` | `PageAccess` | Active (recreated) | Page permissions |
| 22 | `premium_upgrade_requests` | `PremiumUpgradeRequest` | Active | Upgrade queue |
| 23 | `_integratedAiMessages` | `IntegratedAiMessage` | Active | AI chat history |
| 24 | `_integratedAiImages` | `IntegratedAiImage` | Active | AI-generated images |
| 25 | `payment_accounts` | `PaymentAccount` | Active | Bank/QR config |

### Deleted Collections (excluded from migration)
| Collection | Deleted In | Replaced By |
|---|---|---|
| `transactions` | Migration 1775580703 | `temple_accounts` |
| `payment_records` | Migration 1777109970 | `payments` |
| `bookings` (v1) | Replaced | `pooja_bookings` |
| `page_access` (v1) | Migration 1777197975 | `page_access` (v2) |

---

## Appendix A: PocketBase → Prisma Field Renames

| PB Field Name | Prisma Field Name | Reason |
|---|---|---|
| `user_id` (text) | `userId` (FK relation) | Promote text FK to proper relation |
| `subscription_id` (text) | `subscriptionId` (FK relation) | Promote text FK to proper relation |
| `booking_id` (relation) | `bookingId` | Naming convention |
| `category_id` (relation) | `categoryId` | Naming convention |
| `admin_id` (relation) | `adminId` | Naming convention |
| `approved_by` (relation) | `approvedById` | FK naming |
| `donation_amount` | `donationAmount` | camelCase |
| `booking_status` | `bookingStatus` | camelCase |
| `payment_status` | `paymentStatus` | camelCase |
| `receipt_number` | `receiptNumber` | camelCase |
| `is_deleted` | `isDeleted` | camelCase |
| `is_archived` | `isArchived` | camelCase |
| `created_at` | `createdAt` | Prisma convention |
| `updated_at` | `updatedAt` | Prisma convention |
