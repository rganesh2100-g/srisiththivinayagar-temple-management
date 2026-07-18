# PocketBase → PostgreSQL Migration Architecture Blueprint

> **Sri Siththi Vinayagar Temple**
> Lead Solution Architect Design Document
> Version 1.0 — July 2026

---

## Table of Contents

1. [Business Domains](#1-business-domains)
2. [Domain Ownership Matrix](#2-domain-ownership-matrix)
3. [Service Layer Design](#3-service-layer-design)
4. [Repository Layer Design](#4-repository-layer-design)
5. [API Module Design](#5-api-module-design)
6. [Middleware Design](#6-middleware-design)
7. [Authentication Flow](#7-authentication-flow)
8. [File Storage Architecture](#8-file-storage-architecture)
9. [Background Jobs](#9-background-jobs)
10. [Event Flow Diagrams](#10-event-flow-diagrams)
11. [Module Dependency Diagram](#11-module-dependency-diagram)
12. [Frontend Component Reuse Analysis](#12-frontend-component-reuse-analysis)
13. [Migration Order](#13-migration-order)

---

## 1. Business Domains

### Domain 1: Authentication

**Responsibility:** Manages user identity lifecycle — registration, login, token management, password operations, email verification, and session invalidation. This is the foundational domain that all other domains depend on. It owns the `users` table's auth-related columns (email, password hash, verified status) and the JWT token lifecycle (signing, verification, refresh, revocation).

**Current PocketBase equivalent:** PocketBase's built-in auth system (`_superusers`, `users` auth), `authStore`, `authWithPassword`, `authRefresh`, `onChange` listeners.

---

### Domain 2: Users

**Responsibility:** Manages user profiles and personal data — names, phone, address, city, state, pincode, avatar, preferred language, font size, and role assignments. Separated from Authentication because a user's profile can exist independently of their auth credentials. Owns the `users` table's profile-related columns and the `user_preferences` table. Handles user search, pagination, and profile updates.

**Current PocketBase equivalent:** `users` collection (profile fields), `user_preferences` collection.

---

### Domain 3: Membership

**Responsibility:** Manages the membership tier system (Free, Premium) and account types. Controls what features users can access based on their tier. Handles the membership lifecycle: initial assignment, tier upgrades, tier downgrades, account type changes, and page access permissions. Owns the `account_types`, `user_account_assignments`, `page_access`, and `pages` collections. Also manages the relationship between membership tiers and the subscription that grants them.

**Current PocketBase equivalent:** `account_types`, `user_account_assignments`, `page_access`, `pages`, `role_permissions` collections, plus membership-related fields on `users`.

---

### Domain 4: Subscriptions

**Responsibility:** Manages the subscription lifecycle — creation, approval workflow, billing cycles, renewal tracking, and expiry. Handles the state machine: `pending` → `approved` → `active` → `expired` → `renewal_pending`. Owns the `subscriptions` and `pending_subscriptions` collections. Coordinates with Membership (to upgrade/downgrade tier), Payments (to record financial transactions), and Notification (to send lifecycle emails). This is the most complex domain due to its overlapping hooks in the current system.

**Current PocketBase equivalent:** `subscriptions`, `pending_subscriptions` collections, plus 20+ PocketBase hooks.

---

### Domain 5: Payments

**Responsibility:** Records and manages financial payment transactions — subscription payments, upgrade payments, and renewal payments. Handles payment approval/rejection workflows, receipt generation, and payment status tracking. Owns the `payments` and `receipts` collections. This is distinct from Donations because Payments are membership-related financial transactions, while Donations are temple offerings.

**Current PocketBase equivalent:** `payments`, `receipts`, `payment_records`, `premium_upgrade_requests` collections.

---

### Domain 6: Donations

**Responsibility:** Manages temple donations — creation, categorization, approval workflow, receipt generation, and financial reporting. Owns the `donations` collection. Handles donation categories (Annadhanam, Temple Maintenance, Goshala, Veda Pathshala, General Fund), donor information, and the approval → receipt → temple_accounts ledger pipeline. Coordinates with Temple Accounts (ledger entries), Email (receipts), and Audit (logging).

**Current PocketBase equivalent:** `donations` collection, `donation-confirmation-email.pb.js`, `donation-receipt-generation.pb.js`, `donation-temple-accounts.pb.js` hooks.

---

### Domain 7: Pooja Booking

**Responsibility:** Manages the pooja offering catalog and booking workflow. Owns two collections: `poojas` (the catalog of available poojas with schedules, pricing, availability) and `pooja_bookings` (individual user bookings). Handles the full booking lifecycle: browse → select → checkout → pending → approved → confirmed → receipt. Manages date/time slot availability, booking validation, and auto-archiving of expired poojas. Coordinates with Donations (financial amounts), Temple Accounts (ledger), Email (confirmations), and Notifications.

**Current PocketBase equivalent:** `poojas`, `pooja_bookings`, `pooja_archive` collections, plus 6+ hooks.

---

### Domain 8: Gallery

**Responsibility:** Manages the photo/video gallery — media uploads, categorization, publishing, and archival. Owns the `gallery` and `photo_categories` collections. Handles image storage, thumbnail generation references, category management, and publish/archive workflows. This is the most file-storage-intensive domain.

**Current PocketBase equivalent:** `gallery`, `photo_categories` collections, file storage.

---

### Domain 9: Festivals

**Responsibility:** Manages Hindu festival events — creation, scheduling, image management, and display. Owns the `festivals` collection. Handles festival details (name, date, description, image), soft-delete patterns, and linking festivals to poojas.

**Current PocketBase equivalent:** `festivals` collection.

---

### Domain 10: Notifications

**Responsibility:** Manages in-app notification delivery and user notification preferences. Owns the `notifications` and `user_preferences` (notification-related fields) collections. Handles notification creation, read/unread tracking, mark-all-read, and user preference management (all/important/none).

**Current PocketBase equivalent:** `notifications` collection, `NotificationPreferences` component.

---

### Domain 11: Messages

**Responsibility:** Manages two distinct messaging systems — admin-to-user general messages and booking-specific messages. Owns the `admin_messages` and `booking_messages` collections. Handles message creation, read tracking, and triggering email notifications when messages are sent.

**Current PocketBase equivalent:** `admin_messages`, `booking_messages` collections, `booking-message-admin-notification.pb.js`, `booking-message-notification.pb.js` hooks.

---

### Domain 12: Temple Accounts

**Responsibility:** Manages the financial ledger — monthly income/expense summaries by category. Owns the `temple_accounts` collection. Handles the upsert pattern (find existing month+category record, update or create), P&L report generation, Excel export, and email report delivery. This is the aggregation layer that receives entries from Donations, Pooja Bookings, Subscriptions, and Expenses.

**Current PocketBase equivalent:** `temple_accounts`, `accounts_ledger`, `transactions` collections, plus financial hooks.

---

### Domain 13: Expenses

**Responsibility:** Manages temple expense tracking — creation, categorization, voucher generation, and bill/receipt attachment. Owns the `expenses`, `vouchers`, `categories`, `classifications`, and `expense_categories` collections. Handles PDF voucher generation, email delivery with attachments, and financial reporting integration.

**Current PocketBase equivalent:** `expenses`, `vouchers`, `categories`, `classifications` collections.

---

### Domain 14: Reports

**Responsibility:** Generates and delivers financial reports — monthly P&L, temple account summaries, subscription income reports, donation reports, and expense reports. This is a read-only domain that aggregates data from Temple Accounts, Donations, Pooja Bookings, Expenses, and Subscriptions. Handles Excel export (XLSX), PDF generation, and email delivery. No own collections — purely aggregational.

**Current PocketBase equivalent:** `templeAccountsExport.js`, `templeAccountsReport.js`, `templeReports.js` API routes.

---

### Domain 15: Contact

**Responsibility:** Manages public contact form submissions and admin inquiry handling. Owns the `contact_inquiries` collection. Handles form submission, admin notification emails, and inquiry tracking.

**Current PocketBase equivalent:** `contact_inquiries` collection, `contact-inquiry-notification.pb.js` hook.

---

### Domain 16: Bank Config

**Responsibility:** Manages temple bank account configuration for payment processing — bank name, account holder, IBAN, QR codes, payment links. Owns the `bank_account_config` and `payment_accounts` collections. This is a configuration domain that provides payment details to the Pooja Booking, Donations, and Subscriptions domains.

**Current PocketBase equivalent:** `bank_account_config`, `payment_accounts` collections.

---

### Domain 17: Audit

**Responsibility:** Records and queries system-wide audit logs — user actions, admin operations, data changes. Owns the `audit_logs` collection. Handles log creation, pagination, search, Excel export, and log cleanup. This is a cross-cutting concern that receives events from all other domains.

**Current PocketBase equivalent:** `audit_logs` collection, `AdminAuditLogs.jsx`.

---

### Domain 18: AI Integration

**Responsibility:** Manages the integrated AI chat feature — conversation history, image analysis, and response streaming. Owns the `_integratedAiMessages` and `_integratedAiImages` collections. Handles Anthropic Claude API streaming, rate limiting, and conversation persistence.

**Current PocketBase equivalent:** `_integratedAiMessages`, `_integratedAiImages` collections, `integrated-ai.js` API route.

---

## 2. Domain Ownership Matrix

| Domain | Database Owner | API Owner | Business Logic Owner | Frontend Owner | Shared Components |
|--------|---------------|-----------|---------------------|----------------|-------------------|
| **Authentication** | `users` (auth columns) | `auth.js` route | `AuthService` | `AuthContext.jsx`, `LoginPage`, `SignupPage` | `ProtectedRoute` |
| **Users** | `users` (profile columns), `user_preferences` | `users.js` route | `UserService` | `MyProfile`, `UserManagement`, `ProfileSettings` | `Sidebar`, `Header` (avatar) |
| **Membership** | `account_types`, `user_account_assignments`, `page_access`, `pages` | `membership.js` route | `MembershipService` | `MembershipPage`, `AccountTypeSettings`, `PageAccessMatrix` | `DashboardRouter` |
| **Subscriptions** | `subscriptions`, `pending_subscriptions` | `subscriptions.js` route | `SubscriptionService` | `AdminSubscriptionsPage`, `SubscriptionHistorySection` | `useSubscriptionStatus`, `useSubscriptionAccess` |
| **Payments** | `payments`, `receipts` | `payments.js` route | `PaymentService` | `AdminPaymentsPage`, `SanthaHistoryPage` | `PremiumUpgradeModal`, `PremiumPaymentModal` |
| **Donations** | `donations` | `donations.js` route | `DonationService` | `TempleDonatePage`, `AdminDonationApprovalPage`, `DonationTracker` | `DonationHistorySection` |
| **Pooja Booking** | `poojas`, `pooja_bookings`, `pooja_archive` | `poojas.js`, `poojaBookings.js` routes | `BookingService` | `PoojaOfferingsPage`, `PoojaCheckoutPage`, `AdminPoojaCreate` | `PoojaCard`, `BookingCard`, `PoojaSlotSelector` |
| **Gallery** | `gallery`, `photo_categories` | `gallery.js` route | `GalleryService` | `GalleryPage`, `AdminGalleryManagement` | `ImageLightbox`, `VideoLightbox` |
| **Festivals** | `festivals` | `festivals.js` route | `FestivalService` | `UpcomingFestivals`, `FestivalManager` | `FestivalModal` |
| **Notifications** | `notifications` | `notifications.js` route | `NotificationService` | `Notifications`, `NotificationsCenter` | `NotificationPreferences` |
| **Messages** | `admin_messages`, `booking_messages` | `messages.js` route | `MessageService` | `AdminMessages`, `UserMessagesPage` | `MessageInput`, `MessageThread` |
| **Temple Accounts** | `temple_accounts` | `templeAccounts.js` route | `TempleAccountsService` | `AdminTempleAccounts`, `FinancialTransparency` | — |
| **Expenses** | `expenses`, `vouchers`, `categories`, `classifications` | `expenses.js` route | `ExpenseService` | `ExpenseManagerPage`, `CategoryMasterPage` | `ExpenseDetailModal` |
| **Reports** | (none — reads from others) | `reports.js` route | `ReportService` | `AdminMonthlyDetailReport` | — |
| **Contact** | `contact_inquiries` | `contact.js` route | `ContactService` | `ContactPage` | `ContactForm` |
| **Bank Config** | `bank_account_config`, `payment_accounts` | `bankConfig.js` route | `BankConfigService` | `AdminPaymentAccountPage`, `AdminTemplePaymentAccounts` | `PaymentAccountDetails` |
| **Audit** | `audit_logs` | `audit.js` route | `AuditService` | `AdminAuditLogs` | — |
| **AI Integration** | `_integratedAiMessages`, `_integratedAiImages` | `ai.js` route | `AIService` | `integrated-ai-chat.jsx` | — |

---

## 3. Service Layer Design

### AuthService

**Responsibility:** Token lifecycle management, password hashing/verification, credential validation, email verification tokens, password reset tokens. Does NOT own user profile data — only authentication concerns. Issues JWTs with configurable expiry, manages refresh token rotation, and enforces token revocation.

**Key behaviors:**
- Hash passwords with bcrypt (cost factor 12)
- Issue access tokens (short-lived, 15 min) + refresh tokens (long-lived, 7 days)
- Verify token signatures and expiry
- Rotate refresh tokens on use
- Invalidate all tokens on password change
- Generate email verification tokens (crypto-random, 24h expiry)
- Generate password reset tokens (crypto-random, 1h expiry)

---

### UserService

**Responsibility:** User profile CRUD, avatar management, search/filter/pagination, language preference sync, font size management. Does NOT handle auth (that's AuthService) or subscriptions (that's SubscriptionService). Coordinates with StorageService for avatar uploads.

**Key behaviors:**
- Profile CRUD with validation
- Avatar upload → StorageService → update profile URL
- User search with pagination and role filtering
- Language preference update (syncs to user_preferences)
- Font size preference management
- Soft-delete and block/unblock operations

---

### MembershipService

**Responsibility:** Manages the membership tier lifecycle and account type assignments. Owns the relationship between account types, page access permissions, and user assignments. Does NOT handle subscriptions (payment aspects) — only the tier/access implications.

**Key behaviors:**
- Account type CRUD (Free, Premium, Admin, custom)
- Page access matrix management
- User-account assignment operations
- Default account type assignment on user creation
- Premium access detection (checks subscription status from SubscriptionService)

---

### SubscriptionService

**Responsibility:** The most complex service. Manages the full subscription lifecycle state machine. Coordinates with MembershipService (tier changes), PaymentService (payment recording), NotificationService (lifecycle emails), and TempleAccountsService (ledger entries). Must consolidate the 20+ overlapping PocketBase hooks into clean, ordered operations.

**Key behaviors:**
- Subscription CRUD with validation
- State machine: `pending` → `approved` → `active` → `expired` → `renewal_pending`
- Pending subscription management (create, approve, reject)
- On approval: update user membership via MembershipService, create temple_accounts entry, generate receipt, send email
- On rejection: send rejection email, clean up user state
- On expiry: auto-downgrade via MembershipService, send notification
- Renewal workflow
- Expiry date calculation (auto-set start_date, end_date)
- Overlap consolidation: single handler for all membership-sync operations

---

### PaymentService

**Responsibility:** Records financial payment transactions for membership-related activities. Manages payment approval workflows, receipt generation, and status tracking. Distinct from Donations — Payments are for subscriptions/upgrades/renewals.

**Key behaviors:**
- Payment record CRUD
- Approval workflow (pending → approved/rejected)
- On approval: notify SubscriptionService, send receipt email via NotificationService
- Receipt generation (ID assignment, PDF creation via StorageService)
- Payment history queries with user expansion
- Resend receipt functionality

---

### DonationService

**Responsibility:** Manages temple donation lifecycle. Handles category-based donation creation, approval workflow, receipt generation, and financial integration. Coordinates with TempleAccountsService (ledger entries), NotificationService (emails), and AuditService (logging).

**Key behaviors:**
- Donation CRUD with category validation
- Approval workflow (pending → approved/rejected)
- On creation: send confirmation email, create temple_accounts entry
- On approval: generate receipt ID, create PDF, send receipt email, update temple_accounts
- Resend receipt functionality
- Soft-delete with temple_accounts balance adjustment
- Donation statistics and reporting queries

---

### BookingService

**Responsibility:** Manages pooja offerings catalog and the booking workflow. Handles the complete lifecycle from browsing to confirmation. Coordinates with BankConfigService (payment details), DonationService (financial aspects), NotificationService (emails), and TempleAccountsService (ledger).

**Key behaviors:**
- Pooja catalog CRUD (admin)
- Pooja availability checking (date/time slot validation)
- Booking creation with validation (no past dates, max 3 months, slot availability)
- Booking approval workflow
- On creation: send confirmation email, auto-populate pooja name
- On approval: generate receipt, send approval email, create temple_accounts entry
- Auto-archive expired poojas (cron)
- Resend receipt functionality

---

### GalleryService

**Responsibility:** Media management — upload, categorize, publish, archive. Handles file storage via StorageService, thumbnail references, and real-time update broadcasting.

**Key behaviors:**
- Gallery CRUD with file upload via StorageService
- Category CRUD (photo_categories)
- Publish/archive toggle
- Image compression (client-side before upload)
- File URL generation (signed URLs or direct paths)
- Order management
- Storage size tracking

---

### FestivalService

**Responsibility:** Festival event management. Simple CRUD with image handling.

**Key behaviors:**
- Festival CRUD with image upload via StorageService
- Soft-delete pattern (is_deleted flag)
- Active/upcoming filtering
- Image URL generation

---

### NotificationService

**Responsibility:** In-app notification lifecycle — creation, delivery, read tracking, preference management. This is the in-app notification system (not email — that's EmailService).

**Key behaviors:**
- Notification CRUD
- Mark as read / mark all read
- User notification preferences (all/important/none)
- Notification count (unread)
- Bulk creation (when other domains need to notify users)

---

### MessageService

**Responsibility:** Two messaging subsystems — admin-to-user general messages and booking-specific threaded messages. Coordinates with NotificationService and EmailService.

**Key behaviors:**
- Admin messages CRUD
- Booking messages CRUD (threaded by booking_id)
- Read status tracking
- Trigger email notification on new message (via NotificationService)
- Sender type tracking (admin vs user)

---

### TempleAccountsService

**Responsibility:** Financial ledger management — the aggregation layer that receives entries from Donations, Pooja Bookings, Subscriptions, and Expenses. Handles the upsert pattern (find existing month+category, update or create). Generates P&L reports and Excel exports.

**Key behaviors:**
- Upsert pattern: find by month+year+category, update or create
- Category-specific amounts tracking (Annadhanam, Temple Maintenance, Goshala, Veda Pathshala, General Fund, Pooja Services, Membership)
- Monthly aggregation queries
- Annual summary queries
- P&L report data assembly
- Excel export via ReportService
- Balance adjustment on donation soft-delete

---

### ExpenseService

**Responsibility:** Temple expense tracking with categorization, voucher generation, and bill attachment. Coordinates with StorageService (file uploads), EmailService (delivery with attachments), and TempleAccountsService (ledger integration).

**Key behaviors:**
- Expense CRUD with file upload via StorageService
- Category and classification management
- Voucher generation (PAID_VO_XXXXX IDs)
- Bill file attachment handling
- PDF voucher generation
- Email delivery with bill + voucher attachments

---

### ReportService

**Responsibility:** Aggregation and delivery of financial reports. Read-only domain that queries data from TempleAccountsService, DonationService, BookingService, ExpenseService, and SubscriptionService. Handles Excel generation and PDF report creation.

**Key behaviors:**
- Monthly P&L report generation
- Temple accounts Excel export
- Subscription income reports
- Donation summary reports
- Expense reports with vouchers
- Email report delivery with attachments

---

### ContactService

**Responsibility:** Contact form submission and admin notification. Simple domain.

**Key behaviors:**
- Inquiry creation with validation
- Admin notification email trigger
- Inquiry status tracking

---

### BankConfigService

**Responsibility:** Payment configuration management — bank account details, QR codes, payment links. Read-heavy, write-light domain.

**Key behaviors:**
- Bank account config CRUD
- Payment accounts CRUD
- QR code image upload via StorageService
- Active bank account lookup (single active record pattern)
- File URL generation for QR codes

---

### AuditService

**Responsibility:** System-wide audit logging. Cross-cutting concern that receives events from all other domains. Handles log creation, querying, and cleanup.

**Key behaviors:**
- Audit log creation (action, entity, user, details)
- Query with filters (date range, user, action type)
- Pagination and search
- Excel export
- Old log cleanup (configurable retention)

---

### EmailService

**Responsibility:** Centralized email delivery via Nodemailer SMTP. Replaces both the PocketBase mailer and the Builder Mailer API fallback. Owns all email templates and delivery logic.

**Key behaviors:**
- SMTP connection management (Nodemailer transport)
- Builder Mailer API fallback (when SMTP disabled)
- HTML email templates for all notification types
- Email queue for reliability (retry on failure)
- Attachment handling (PDFs, Excel files)

---

### StorageService

**Responsibility:** File storage abstraction — handles all file uploads, deletions, URL generation, and cleanup. Replaces PocketBase's file storage. Provides a clean interface that can be swapped from local filesystem to S3/MinIO in the future.

**Key behaviors:**
- File upload with type/size validation
- Folder hierarchy management
- File naming with collision avoidance
- Signed URL generation (or direct path for local storage)
- Thumbnail reference handling
- File deletion (physical + reference cleanup)
- Storage statistics
- Future: S3/MinIO adapter pattern

---

### AIService

**Responsibility:** AI chat integration — conversation management, API calls to Anthropic Claude, image analysis, streaming responses.

**Key behaviors:**
- Conversation history management
- Anthropic Claude API streaming
- Image upload and analysis
- Rate limiting (10 requests/minute per user)
- Message persistence

---

### SettingsService

**Responsibility:** Application-wide configuration management. Replaces PocketBase's app_settings collection and various hardcoded configurations.

**Key behaviors:**
- App settings CRUD
- Theme configuration
- Language defaults
- Feature flags
- System parameters

---

## 4. Repository Layer Design

### Design Principle

Each service owns repositories for the collections it manages. Repositories are thin data-access layers — they translate service calls into database queries. No business logic in repositories. Each repository maps to exactly one database table (or a small cluster of tightly related tables).

### Repository Map

| Repository | Tables Owned | Primary Service | Other Services That Read |
|-----------|-------------|-----------------|------------------------|
| `UserRepository` | `users` | UserService | AuthService, MembershipService, SubscriptionService, DonationService, BookingService |
| `UserPreferencesRepository` | `user_preferences` | UserService, NotificationService | — |
| `AccountTypeRepository` | `account_types` | MembershipService | — |
| `UserAccountAssignmentRepository` | `user_account_assignments` | MembershipService | — |
| `PageAccessRepository` | `page_access` | MembershipService | — |
| `PageRepository` | `pages` | MembershipService | — |
| `SubscriptionRepository` | `subscriptions` | SubscriptionService | MembershipService, ReportService |
| `PendingSubscriptionRepository` | `pending_subscriptions` | SubscriptionService | — |
| `PaymentRepository` | `payments` | PaymentService | SubscriptionService, ReportService |
| `ReceiptRepository` | `receipts` | PaymentService, DonationService | — |
| `DonationRepository` | `donations` | DonationService | TempleAccountsService, ReportService |
| `PoojaRepository` | `poojas` | BookingService | — |
| `PoojaBookingRepository` | `pooja_bookings` | BookingService | TempleAccountsService, ReportService |
| `PoojaArchiveRepository` | `pooja_archive` | BookingService | — |
| `GalleryRepository` | `gallery` | GalleryService | — |
| `PhotoCategoryRepository` | `photo_categories` | GalleryService | — |
| `FestivalRepository` | `festivals` | FestivalService | — |
| `NotificationRepository` | `notifications` | NotificationService | — |
| `AdminMessageRepository` | `admin_messages` | MessageService | — |
| `BookingMessageRepository` | `booking_messages` | MessageService | — |
| `TempleAccountRepository` | `temple_accounts` | TempleAccountsService | ReportService |
| `ExpenseRepository` | `expenses` | ExpenseService | TempleAccountsService, ReportService |
| `VoucherRepository` | `vouchers` | ExpenseService | — |
| `CategoryRepository` | `categories` | ExpenseService | — |
| `ClassificationRepository` | `classifications` | ExpenseService | — |
| `ContactInquiryRepository` | `contact_inquiries` | ContactService | — |
| `BankAccountConfigRepository` | `bank_account_config` | BankConfigService | — |
| `PaymentAccountRepository` | `payment_accounts` | BankConfigService | — |
| `AuditLogRepository` | `audit_logs` | AuditService | — |
| `AIMessageRepository` | `_integratedAiMessages` | AIService | — |
| `AIImageRepository` | `_integratedAiImages` | AIService | — |

### Cross-Domain Read Rules

- Services may READ from repositories owned by other services, but must never WRITE to them directly.
- All cross-domain writes must go through the owning service's public methods.
- Example: `SubscriptionService` reads from `UserRepository` (to check user exists), but writes to `UserRepository` only through `UserService.upgradeMembership()`.
- Exception: `TempleAccountsService` receives writes from multiple services (Donation, Booking, Subscription, Expense) — this is by design as it is the aggregation ledger.

---

## 5. API Module Design

### Module Map

| Module | Prefix | Domains Served |
|--------|--------|---------------|
| **Auth** | `/api/auth` | Authentication |
| **Users** | `/api/users` | Users, (reads from Membership) |
| **Membership** | `/api/membership` | Membership |
| **Subscriptions** | `/api/subscriptions` | Subscriptions |
| **Payments** | `/api/payments` | Payments |
| **Donations** | `/api/donations` | Donations |
| **Poojas** | `/api/poojas` | Pooja Booking (catalog) |
| **Bookings** | `/api/bookings` | Pooja Booking (bookings) |
| **Gallery** | `/api/gallery` | Gallery |
| **Festivals** | `/api/festivals` | Festivals |
| **Notifications** | `/api/notifications` | Notifications |
| **Messages** | `/api/messages` | Messages |
| **TempleAccounts** | `/api/temple-accounts` | Temple Accounts |
| **Expenses** | `/api/expenses` | Expenses |
| **Reports** | `/api/reports` | Reports |
| **Contact** | `/api/contact` | Contact |
| **BankConfig** | `/api/bank-config` | Bank Config |
| **Audit** | `/api/audit` | Audit |
| **AI** | `/api/ai` | AI Integration |
| **Files** | `/api/files` | Storage (cross-cutting) |
| **Health** | `/api/health` | System health |

### Module Interaction Rules

- Each module is a self-contained Express Router.
- Modules communicate through services, not through direct route-to-route calls.
- Shared middleware (JWT, Role, Audit) is applied at the module level.
- The `Files` module is cross-cutting — any module can use it for file operations.
- The `Health` module reads from all services to report system status.

---

## 6. Middleware Design

### Middleware Stack (in execution order)

| # | Middleware | Purpose | Why It Exists |
|---|-----------|---------|---------------|
| 1 | **Security Headers** | Sets HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) | Replaces PocketBase's helmet integration. Defense-in-depth against XSS, clickjacking, MIME sniffing. |
| 2 | **Request Logging** | Logs incoming requests (method, path, status, duration) | Replaces PocketBase's morgan integration. Essential for debugging and monitoring. |
| 3 | **CORS** | Configures cross-origin request handling | Must be tightened from current `*` wildcard to specific allowed origins. |
| 4 | **Rate Limiting** | Limits request frequency per IP or per user | Prevents abuse. Replaces PocketBase's rate limit configuration. Two tiers: general (100/min) and auth (10/min). |
| 5 | **Body Parsing** | Parses JSON and multipart form bodies | Express built-in, but needs configuration for file uploads (multipart/form-data). |
| 6 | **JWT Authentication** | Extracts and verifies JWT from Authorization header | Replaces PocketBase's auth middleware. Non-blocking — sets `req.user` if token valid, leaves undefined otherwise. |
| 7 | **Role Authorization** | Checks `req.user.role` against required roles | Replaces `ProtectedRoute` server-side checks. Two roles: `user`, `admin`. |
| 8 | **Permission Authorization** | Checks page-level access via account type + page_access | Replaces PocketBase's access control rules. Checks if user's account_type has access to the requested page. |
| 9 | **Premium Access** | Checks if user has active premium subscription | Replaces the 5-field premium detection in AuthContext. Single authoritative check against subscriptions table. |
| 10 | **Validation** | Validates request body/params against schemas | New middleware. Uses Zod (already in dependencies) for request validation. Prevents invalid data from reaching services. |
| 11 | **File Upload** | Handles multipart file uploads via Multer | Replaces PocketBase's built-in file upload. Configures temp directory, file size limits, type filtering. |
| 12 | **Audit Logging** | Records write operations to audit_logs | Cross-cutting concern. Records who did what, when, on which entity. Only for write operations (POST, PUT, DELETE). |
| 13 | **Response Formatting** | Standardizes API response structure | New middleware. Ensures all responses follow `{ success, data, error, pagination }` format. |
| 14 | **Error Handling** | Catches and formats all errors | Replaces Express error middleware. Returns consistent error responses. Hides stack traces in production. |

### Middleware Application Strategy

- **Global (all routes):** Security Headers, Request Logging, CORS, Rate Limiting (general), Body Parsing, Error Handling
- **Auth-required routes:** JWT Authentication (blocking mode)
- **Admin routes:** Role Authorization (admin)
- **Premium routes:** Premium Access check
- **Write routes:** Audit Logging, Validation
- **File routes:** File Upload (Multer)
- **Auth routes:** Rate Limiting (strict — 10/min)

---

## 7. Authentication Flow

### Registration

1. User submits email, password, name, phone via signup form.
2. Validation middleware checks required fields, email format, password strength.
3. AuthService checks if email already exists in users table.
4. AuthService hashes password with bcrypt (cost factor 12).
5. UserService creates user record with `role: 'user'`, `account_type: 'Free Member'`.
6. AuthService generates email verification token (crypto-random, 24h expiry).
7. EmailService sends verification email.
8. AuthService issues JWT access token + refresh token.
9. Response returns tokens and user profile.

### Login

1. User submits email + password.
2. AuthService looks up user by email.
3. AuthService verifies password with bcrypt compare.
4. If invalid: return 401 with descriptive error.
5. If valid but not verified: return 403 with "verify email" message.
6. If blocked/deleted: return 403 with appropriate message.
7. AuthService issues new JWT access token + refresh token.
8. Response returns tokens and user profile (with role, membership info).

### Refresh Token

1. Client sends expired/refreshing access token + valid refresh token.
2. AuthService verifies refresh token signature and expiry.
3. AuthService checks refresh token hasn't been revoked (token family tracking).
4. AuthService issues new access token + new refresh token (rotation).
5. Old refresh token is invalidated (one-time use).
6. If refresh token reuse detected: revoke ALL tokens for this user (security).

### Forgot Password

1. User submits email.
2. AuthService generates password reset token (crypto-random, 1h expiry).
3. Token stored in users table (hashed).
4. EmailService sends reset link with token.
5. User clicks link → shows reset form with token.
6. User submits new password.
7. AuthService verifies token, hashes new password, updates user.
8. All existing refresh tokens revoked (force re-login everywhere).

### Reset Password

(Continuation of Forgot Password flow)

1. User submits new password + token from email link.
2. AuthService hashes password.
3. AuthService updates user record, clears reset token.
4. All refresh tokens for this user revoked.
5. EmailService sends "password changed" confirmation.
6. Response confirms success.

### Email Verification

1. On registration, verification token stored in users table.
2. EmailService sends verification link.
3. User clicks link → API verifies token (not expired, matches stored hash).
4. User's `verified` flag set to `true`.
5. EmailService sends welcome email.

### Role Assignment

1. Admin accesses user management.
2. Admin selects user and changes role (user ↔ admin).
3. Role Authorization middleware verifies requester is admin.
4. UserService updates role in users table.
5. AuditService logs the change.
6. Next request by affected user uses new role from JWT (or token refresh picks it up).

### Premium Upgrade

1. User selects premium plan on membership page.
2. User submits payment details (bank transfer transaction ID).
3. SubscriptionService creates subscription record with `status: 'pending'`.
4. PaymentService creates payment record with `status: 'pending'`.
5. Admin reviews at admin panel.
6. On approval:
   a. PaymentService updates payment status to `approved`.
   b. SubscriptionService updates subscription status to `approved` → `active`.
   c. MembershipService upgrades user's membership_type to `premium`.
   d. TempleAccountsService creates ledger entry.
   e. EmailService sends approval email with receipt.
   f. AuditService logs the approval.

### Session Expiry

1. Access token expires (15 min default).
2. Client automatically calls refresh endpoint with refresh token.
3. If refresh token valid: new access token issued (seamless).
4. If refresh token expired: user redirected to login.
5. If refresh token revoked (password change, security event): user redirected to login with message.

### Logout

1. Client sends refresh token to logout endpoint.
2. AuthService revokes the refresh token.
3. Client clears tokens from storage.
4. User redirected to homepage.
5. Note: access token remains valid until expiry (short-lived, acceptable).

---

## 8. File Storage Architecture

### Storage Structure

```
uploads/
├── avatars/
│   └── {userId}_{timestamp}.{ext}
├── gallery/
│   └── {categorySlug}/
│       └── {timestamp}_{random8chars}.{ext}
├── festivals/
│   └── {timestamp}_{random8chars}.{ext}
├── expenses/
│   ├── bills/
│   │   └── {expenseId}_{timestamp}.{ext}
│   └── images/
│       └── {expenseId}_{timestamp}.{ext}
├── receipts/
│   └── {receiptType}_{receiptId}.pdf
├── vouchers/
│   └── {voucherId}.pdf
├── payment-accounts/
│   └── {accountId}_qr.{ext}
└── temp/
    └── {sessionid}_{filename}.ext  (auto-cleanup after 24h)
```

### Naming Convention

`{entityId or descriptive}_{timestamp}_{random8chars}.{originalExtension}`

Examples:
- `user_abc123_1720000000_a1b2c3d4.jpg` (avatar)
- `gallery_festival_1720000000_e5f6g7h8.jpg` (gallery image)
- `expense_xyz789_1720000000_bill.pdf` (expense bill)

### Security

- **Upload validation:** File type whitelist (images: jpg, png, webp, gif; documents: pdf, xlsx; max sizes per type)
- **Path traversal prevention:** Sanitize all filenames, strip directory components
- **No execution:** Storage directory served as static files with no-exec headers
- **Access control:** Public files (gallery, festival images) served directly; private files (receipts, vouchers, avatars) served through signed URLs or authenticated endpoints
- **Virus scanning:** Future consideration — integrate ClamAV or similar

### Image URLs

Two approaches based on access level:

- **Public files** (gallery, festivals, QR codes): Direct URL `/uploads/gallery/category/filename.jpg` served by Express static middleware
- **Private files** (avatars, receipts, expense bills): Authenticated endpoint `/api/files/:collection/:id/:filename` that verifies user ownership before serving

### Cleanup

- **Orphaned files:** Weekly cron job scans uploads directory, compares against database references, deletes orphaned files
- **Temp files:** Hourly cron deletes files older than 24 hours from `temp/`
- **Soft-deleted entities:** Files retained for 30 days after entity soft-delete, then cleaned up

### Backups

- Daily rsync/tarball of entire uploads directory
- Included in PostgreSQL backup scripts (database + files together)
- Restore procedure: import database first, then restore file uploads

### Future Cloud Storage Compatibility

The StorageService abstracts the storage backend behind a common interface:

```
StorageService
├── LocalAdapter (default — current implementation)
├── S3Adapter (future — AWS S3, MinIO, DigitalOcean Spaces)
└── GCSAdapter (future — Google Cloud Storage)
```

Switching adapters requires only:
1. Changing the adapter configuration in environment variables
2. Running a migration script to copy files to cloud storage
3. Updating URL generation logic (signed URLs for cloud)

No application code changes required — the service interface remains identical.

---

## 9. Background Jobs

### Job Registry

| # | Job | Schedule | Owner Service | Description |
|---|-----|----------|---------------|-------------|
| 1 | **Auto-Archive Poojas** | Every 5 minutes | BookingService | Scans for poojas where all dates have passed. Sets `published=false`, `status='draft'`, `is_archived=true`. |
| 2 | **Auto-Downgrade Subscriptions** | Daily at 00:00 | SubscriptionService | Finds premium users with expired subscriptions. Downgrades to free tier via MembershipService. Sends expiry email. |
| 3 | **Renewal Reminder** | Daily at 09:00 | SubscriptionService | Finds active subscriptions within 3–5 days of renewal. Sends reminder email with payment link. |
| 4 | **Expiry Reminder** | Daily at 09:00 | SubscriptionService | Finds subscriptions expiring in exactly 7 days. Sends warning email. |
| 5 | **Email Queue Processor** | Every 1 minute | EmailService | Processes queued emails. Retries failed emails (3 attempts with exponential backoff). |
| 6 | **File Cleanup (Orphaned)** | Weekly Sunday 03:00 | StorageService | Scans uploads directory, removes files not referenced in any database table. |
| 7 | **File Cleanup (Temp)** | Hourly | StorageService | Deletes temp files older than 24 hours. |
| 8 | **Audit Log Cleanup** | Monthly 1st, 03:00 | AuditService | Deletes audit logs older than configurable retention period (default: 90 days). |
| 9 | **Notification Cleanup** | Weekly Sunday 03:00 | NotificationService | Deletes read notifications older than 30 days. |
| 10 | **Database Backup** | Daily at 02:00 | Infrastructure | pg_dump to timestamped file. Retain 30 days of backups. |

### Scheduling Strategy

- **Primary scheduler:** `node-cron` — lightweight, no external dependencies, sufficient for this scale
- **Job isolation:** Each job runs independently; failure of one does not affect others
- **Error handling:** All jobs wrapped in try/catch, errors logged but do not crash the process
- **Concurrency control:** Each job acquires a distributed lock (via database advisory lock or file lock) to prevent duplicate execution if multiple API instances are running
- **Monitoring:** Each job execution logs start time, duration, items processed, and any errors
- **Graceful shutdown:** Jobs complete their current cycle before the process exits

### Email Queue Architecture

The email queue is critical because PocketBase hooks fire-and-forget emails synchronously, which causes delays and failures. The new system should:

1. **Enqueue:** Services push email jobs to a `email_queue` table (id, to, subject, body, attachments, status, attempts, next_attempt_at, created_at)
2. **Process:** Queue processor runs every minute, picks pending emails, sends via Nodemailer
3. **Retry:** Failed emails retried with exponential backoff (1min, 5min, 30min, 2h), max 3 attempts
4. **Dead letter:** Emails that fail 3 times moved to `email_dead_letter` table for manual review

---

## 10. Event Flow Diagrams

### Donation Completed

```
User submits donation form (TempleDonatePage)
    |
    v
Validation middleware validates fields
    |
    v
DonationService.createDonation()
    +-- DonationRepository.create() -> status: 'pending'
    +-- AuditService.log('donation_created')
    +-- EmailService.enqueue(donation_confirmation_email)
            |
            v
    [Background: Email Queue Processor]
            |
            v
    EmailService.send() -> donor receives confirmation
```

```
Admin approves donation (AdminDonationApprovalPage)
    |
    v
DonationService.approveDonation()
    +-- DonationRepository.update(status: 'approved')
    +-- ReceiptService.generateDonationReceipt() -> receipt_id, pdf
    +-- StorageService.save(receipt_pdf)
    +-- TempleAccountsService.addEntry(from donation)
    +-- AuditService.log('donation_approved')
    +-- EmailService.enqueue(donation_receipt_email)
    +-- NotificationService.create(admin notification)
```

### Membership Purchase

```
User selects premium plan (MembershipPage)
    |
    v
User submits payment (SubscriptionPaymentModal)
    |
    v
SubscriptionService.createSubscription()
    +-- SubscriptionRepository.create(status: 'pending')
    +-- PaymentService.createPayment(status: 'pending')
    +-- AuditService.log('subscription_created')
    +-- EmailService.enqueue(subscription_pending_email)
```

```
Admin approves subscription (AdminSubscriptionsPage)
    |
    v
SubscriptionService.approveSubscription()
    +-- SubscriptionRepository.update(status: 'approved' -> 'active')
    +-- MembershipService.upgradeToPremium(user_id)
    |       +-- UserRepository.update(membership_type: 'premium')
    +-- PaymentService.approvePayment(payment_id)
    |       +-- PaymentRepository.update(status: 'approved')
    +-- ReceiptService.generateSubscriptionReceipt()
    +-- TempleAccountsService.addEntry(category: 'Membership')
    +-- AuditService.log('subscription_approved')
    +-- EmailService.enqueue(subscription_approved_email)
    +-- NotificationService.create(user notification)
```

### Pooja Booking

```
User completes 4-step checkout (PoojaCheckoutPage)
    |
    v
BookingService.createBooking()
    +-- BookingService.validateAvailability(date, time_slot, pooja_id)
    +-- PoojaBookingRepository.create(status: 'pending')
    +-- AuditService.log('booking_created')
    +-- EmailService.enqueue(booking_confirmation_email)
    +-- NotificationService.create(admin notification)
```

```
Admin approves booking (AdminPoojaApprovals)
    |
    v
BookingService.approveBooking()
    +-- PoojaBookingRepository.update(status: 'confirmed')
    +-- ReceiptService.generatePoojaReceipt()
    +-- StorageService.save(receipt_pdf)
    +-- TempleAccountsService.addEntry(category: 'Pooja Services')
    +-- AuditService.log('booking_approved')
    +-- EmailService.enqueue(booking_approved_receipt_email)
    +-- NotificationService.create(user notification)
```

### Gallery Upload

```
Admin uploads image (AdminGalleryManagement)
    |
    v
GalleryService.uploadImage()
    +-- StorageService.upload(file, 'gallery')
    +-- GalleryRepository.create(title, image_path, category)
    +-- AuditService.log('gallery_image_uploaded')
    +-- NotificationService.broadcast('gallery_updated')
            |
            v
    [Frontend realtime: GalleryPage receives update via polling/websocket]
```

### Admin Approval (Generic Flow)

```
Admin clicks approve on any pending item
    |
    v
Domain-specific Service.approve()
    +-- Repository.update(status: 'approved')
    +-- ReceiptService.generate() (if applicable)
    +-- TempleAccountsService.addEntry() (if financial)
    +-- AuditService.log(action: '{domain}_approved')
    +-- EmailService.enqueue(approval_email)
    +-- NotificationService.create(user notification)
```

### User Registration

```
User submits signup form (SignupPage)
    |
    v
Validation middleware validates fields
    |
    v
AuthService.register()
    +-- UserRepository.create(role: 'user', account_type: 'Free Member')
    +-- AuthService.hashPassword()
    +-- AuthService.generateVerificationToken()
    +-- EmailService.enqueue(verification_email)
    +-- AuditService.log('user_registered')
    +-- AuthService.issueTokens()
    +-- Response: tokens + user profile
```

---

## 11. Module Dependency Diagram

```
                    +-------------+
                    |   Settings   |
                    +------+------+
                           |
         +-----------------+-----------------+
         |                 |                 |
         v                 v                 v
   +----------+    +--------------+   +----------+
   |   Auth    |    |   Storage    |   |  Email   |
   +----+-----+    +------+-------+   +----+-----+
        |                  |                |
        |    +-------------+                |
        |    |                             |
        v    v                             |
   +-------------+                         |
   |    Users    |<--------+               |
   +------+------+                         |
          |                                 |
    +-----+----------+                     |
    |     |          |                     |
    v     v          v                     |
+------+ +--------------+ +--------------+  |
|Member| |Subscriptions | | Notifications|<-+
|ship  | +------+-------+ +--------------+
+------+        |
          +-----+------------+
          |     |            |
          v     v            v
     +----------+  +--------------+  +--------------+
     | Payments |  | Donations    |  |   Bookings   |
     +----+-----+  +------+-------+  +------+-------+
          |               |                 |
          +-------+-------+                 |
                  v                         |
          +--------------+                  |
          |   Temple     |<-----------------+
          |   Accounts   |
          +------+-------+
                 |
          +------+----------+
          |      |          |
          v      v          v
     +----------+ +----------+ +----------+
     | Expenses | | Reports  | |  Audit   |
     +----------+ +----------+ +----------+

  Independent Modules (no cross-dependencies):
  +----------+ +----------+ +----------+ +----------+
  | Gallery  | | Festivals| | Contact  | |BankConfig|
  +----------+ +----------+ +----------+ +----------+
  +----------+
  |    AI    |
  +----------+
```

### Dependency Rules

- **No circular dependencies.** If A depends on B, B must not depend on A.
- **Cross-domain writes go through service methods,** never direct repository access.
- **Independent modules** (Gallery, Festivals, Contact, BankConfig, AI) can be migrated first with zero risk to other modules.
- **Infrastructure services** (Storage, Email, Audit) are consumed by all domains but depend on nothing except Settings.
- **The dependency flows downward:** Auth → Users → Membership → Subscriptions → Payments → TempleAccounts → Reports.

---

## 12. Frontend Component Reuse Analysis

### Category A: Completely Unchanged (~130 files)

These files have zero PocketBase coupling and require NO modifications:

| Category | Files | Examples |
|----------|-------|---------|
| shadcn/ui components | 55 | accordion, button, card, dialog, table, tabs, etc. |
| Pure presentational components | ~20 | BookingCard, BookingDetailsCard, PoojaCard, StatCard, WidgetCard |
| Layout components | ~8 | ErrorBoundary, ScrollToTop, GlobalOfflineBanner, NotFoundPage |
| Config files | 6 | vite.config.js, tailwind.config.js, postcss.config.js, eslint.config.mjs, jsconfig.json |
| i18n | 4 | config.js, en.json, de.json, ta.json |
| Root config | 5 | package.json, .gitignore, .nvmrc, start.ps1, start.sh |
| Static pages | ~5 | AboutPage, HomePage, SubscriptionThankYouPage, ComingSoon* |

### Category B: API Replacement Only (~60 files)

These files import PocketBase client and make `pb.collection()` calls. The **component logic, UI, and structure remain identical** — only the data fetching layer changes from `pb.collection().getFullList()` to `apiClient.get('/api/donations')`.

| Category | Files | What Changes |
|----------|-------|-------------|
| Pages making PB calls | ~45 | Replace `pb.collection()` with `apiClient.get/post/put/delete()` |
| Components making PB calls | ~15 | Same replacement pattern |

**Pattern:** Every `pb.collection('x').getFullList({filter: '...'})` becomes `apiClient.get('/api/x', {params: {filter: '...'}})`. The component JSX, state management, and UI logic remain identical.

### Category C: Moderate Rewrite (~12 files)

These files have deeper PB integration beyond simple CRUD — they use `pb.files.getUrl()`, `pb.authStore`, or realtime subscriptions.

| File | What Changes |
|------|-------------|
| `AuthContext.jsx` | Replace `pb.authStore` with JWT token management; replace `pb.collection('users').authWithPassword` with `apiClient.post('/api/auth/login')` |
| `useLanguage.jsx` | Replace `pb.collection('users').update()` with API call |
| `pocketbaseClient.js` | Complete rewrite -> becomes `apiClient.js` with JWT interceptors |
| `pbHelper.js` | Complete rewrite -> becomes `apiHelpers.js` with fetch wrappers |
| 4 lightbox/modal components | Replace `pb.files.getUrl()` with direct URL or API endpoint |
| 3 realtime subscription components | Replace `pb.collection().subscribe()` with polling or WebSocket |

### Category D: Complete Rewrite (0 files — hooks live in PocketBase, not frontend)

The 50 PocketBase hook files (`pb_hooks/*.pb.js`) are server-side only. They are completely removed and their logic is rewritten as Express services/middleware. The frontend never imports these.

---

## 13. Migration Order

### Guiding Principle

**Migrate one business domain at a time. Keep the website operational throughout. Use a strangler fig pattern — new system grows around the old, old system shrinks until it can be removed.**

### Phase 0: Foundation (Week 1)

**Goal:** Build the infrastructure layer that all other domains depend on. No visible changes to the website.

| Step | Task | Risk | Rollback |
|------|------|------|----------|
| 0.1 | Design and create PostgreSQL schema (all tables, indexes, constraints) | Low | Drop database |
| 0.2 | Set up Prisma ORM with connection pooling | Low | Remove Prisma |
| 0.3 | Build StorageService (local file storage adapter) | Low | Remove directory |
| 0.4 | Build EmailService (Nodemailer transport + queue) | Low | Remove queue table |
| 0.5 | Build JWT middleware (sign, verify, refresh) | Low | Remove middleware |
| 0.6 | Build response formatting middleware | Low | Remove middleware |
| 0.7 | Build audit logging middleware | Low | Remove middleware |
| 0.8 | Build validation middleware (Zod) | Low | Remove middleware |
| 0.9 | Build error handling middleware | Low | Remove middleware |
| 0.10 | Write data migration scripts (SQLite -> PostgreSQL) | Medium | Drop database |

**Verification:** PostgreSQL database exists with all tables. All infrastructure services pass unit tests. Existing website still runs on PocketBase unchanged.

### Phase 1: Authentication (Week 2)

**Goal:** Replace PocketBase auth with JWT. This is the hardest and most critical phase.

| Step | Task | Risk | Rollback |
|------|------|------|----------|
| 1.1 | Build AuthService, UserRepository | Medium | Remove service |
| 1.2 | Build auth API routes (register, login, refresh, forgot-password) | Medium | Remove routes |
| 1.3 | Migrate user data from PocketBase to PostgreSQL | High | Restore backup |
| 1.4 | Replace frontend AuthContext (JWT auth) | High | Revert to PB auth |
| 1.5 | Replace frontend pocketbaseClient.js with apiClient.js | High | Revert |
| 1.6 | Test all auth flows end-to-end | — | — |
| 1.7 | Remove PocketBase auth dependency from frontend | High | Revert |

**Risk mitigation:** Keep PocketBase running in parallel during this phase. Test new auth thoroughly before cutting over. If anything fails, frontend can revert to PocketBase auth.

### Phase 2: Independent Domains (Week 3)

**Goal:** Migrate the 5 independent domains that have no cross-dependencies. These can be done in parallel and in any order.

| Step | Domain | What Changes |
|------|--------|-------------|
| 2.1 | Gallery | New API endpoints, frontend replaces pb.collection() calls |
| 2.2 | Festivals | New API endpoints, frontend replaces pb.collection() calls |
| 2.3 | Contact | New API endpoint, ContactForm replaces pb call |
| 2.4 | Bank Config | New API endpoints, frontend replaces pb calls |
| 2.5 | AI Integration | New API endpoints, frontend replaces pb calls |

**Risk:** Low — each domain is self-contained. Failure of one does not affect others.

### Phase 3: Users & Membership (Week 4)

**Goal:** Migrate user profile management and membership tier system. Depends on Auth being complete.

| Step | Task | Risk |
|------|------|------|
| 3.1 | Build UserService, MembershipService | Low |
| 3.2 | Build user/membership API routes | Low |
| 3.3 | Replace frontend user profile pages (MyProfile, UserManagement, etc.) | Medium |
| 3.4 | Replace frontend membership pages (MembershipPage, AccountTypeSettings, etc.) | Medium |
| 3.5 | Build and test premium access middleware | Medium |

### Phase 4: Subscriptions & Payments (Week 5)

**Goal:** Migrate the most complex domain — the subscription lifecycle with its 20+ hooks. This requires careful consolidation.

| Step | Task | Risk |
|------|------|------|
| 4.1 | Build SubscriptionService, PaymentService, ReceiptService | Medium |
| 4.2 | **Consolidate 20+ PocketBase hooks into ordered service methods** | High |
| 4.3 | Build subscription/payment API routes | Medium |
| 4.4 | Build background jobs (auto-downgrade, renewal reminders) | Low |
| 4.5 | Replace frontend subscription pages and components | Medium |
| 4.6 | Test full subscription lifecycle (create -> approve -> active -> expire -> downgrade) | High |

**Critical:** The current system has 3 hooks that all update user membership on subscription status change. These MUST be consolidated into a single, deterministic handler. Document the exact order of operations before implementing.

### Phase 5: Donations & Temple Accounts (Week 6)

**Goal:** Migrate the financial backbone — donations, temple accounts ledger, and the financial reporting pipeline.

| Step | Task | Risk |
|------|------|------|
| 5.1 | Build DonationService, TempleAccountsService | Low |
| 5.2 | Build donation API routes | Low |
| 5.3 | Build temple accounts API routes (upsert pattern) | Medium |
| 5.4 | Replace frontend donation pages and components | Medium |
| 5.5 | Build ReportService, expense API routes | Low |
| 5.6 | Replace frontend expense/report pages | Medium |
| 5.7 | Test financial flows end-to-end | High |

### Phase 6: Pooja Booking (Week 7)

**Goal:** Migrate the core business feature — pooja catalog and booking workflow.

| Step | Task | Risk |
|------|------|------|
| 6.1 | Build BookingService | Medium |
| 6.2 | Build pooja catalog + booking API routes | Medium |
| 6.3 | Build auto-archive cron job | Low |
| 6.4 | Replace frontend pooja pages (6+ pages, 5+ components) | Medium |
| 6.5 | Test full booking flow (browse -> checkout -> approve -> receipt) | High |

### Phase 7: Remaining Domains (Week 8)

**Goal:** Migrate Notifications, Messages, Audit, and remaining smaller domains.

| Step | Task | Risk |
|------|------|------|
| 7.1 | Build NotificationService, MessageService | Low |
| 7.2 | Build notification/message API routes | Low |
| 7.3 | Replace frontend notification/message components | Low |
| 7.4 | Build AuditService, audit API routes | Low |
| 7.5 | Replace frontend audit log page | Low |
| 7.6 | Full integration testing of all domains | High |

### Phase 8: Cleanup & Cutover (Week 9)

**Goal:** Remove PocketBase entirely. Final testing and deployment.

| Step | Task | Risk |
|------|------|------|
| 8.1 | Verify zero remaining references to PocketBase SDK | Low |
| 8.2 | Remove `pocketbase` npm dependency from all package.json | Low |
| 8.3 | Remove `apps/pocketbase/` directory (archive first) | Low |
| 8.4 | Remove PB env vars, add PostgreSQL env vars | Low |
| 8.5 | Update start scripts (remove PocketBase startup) | Low |
| 8.6 | Update AGENTS.md and all documentation | Low |
| 8.7 | Final smoke test of all user flows | High |
| 8.8 | Deploy to production | High |

### Migration Sequence Summary

```
Week 1:  Foundation (DB, Prisma, Storage, Email, Auth middleware)
Week 2:  Authentication (JWT, register, login, frontend auth)
Week 3:  Independent Domains (Gallery, Festivals, Contact, Bank, AI)
Week 4:  Users & Membership
Week 5:  Subscriptions & Payments (HARDEST — hook consolidation)
Week 6:  Donations & Temple Accounts & Expenses & Reports
Week 7:  Pooja Booking
Week 8:  Notifications, Messages, Audit
Week 9:  Cleanup, Cutover, Deployment
```

### Rollback Strategy

At any point during migration, if a phase introduces critical bugs:

1. **Frontend rollback:** Revert the affected React files to their PocketBase SDK versions (git checkout)
2. **API rollback:** Disable the new Express routes, re-enable PocketBase proxy
3. **Data rollback:** Restore PostgreSQL from backup, keep PocketBase data as source of truth
4. **Full rollback:** If auth migration fails completely, revert entire frontend to PocketBase client

The strangler fig pattern ensures PocketBase remains fully operational until the final cutover in Week 9.

---

*End of Architecture Blueprint.*
*This document is the permanent reference for the PocketBase -> PostgreSQL migration.*
