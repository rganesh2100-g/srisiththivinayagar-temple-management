# Backend Service Architecture Blueprint

**Sri Siththi Vinayagar Temple — Enterprise Backend Architecture**
**Version:** 1.0 | **Date:** 2026-07-11 | **Status:** Pre-Implementation Blueprint
**Stack:** PostgreSQL, Prisma ORM, Express 5, Node 22, React 18

---

## Table of Contents

- [PART 1 — Service Layer Philosophy](#part-1--service-layer-philosophy)
- [PART 2 — Service Inventory](#part-2--service-inventory)
- [PART 3 — Repository Architecture](#part-3--repository-architecture)
- [PART 4 — Business Rules Engine](#part-4--business-rules-engine)
- [PART 5 — Transaction Design](#part-5--transaction-design)
- [PART 6 — Background Jobs](#part-6--background-jobs)
- [PART 7 — Notification Architecture](#part-7--notification-architecture)
- [PART 8 — PDF Generation Architecture](#part-8--pdf-generation-architecture)
- [PART 9 — Storage Architecture](#part-9--storage-architecture)
- [PART 10 — Search Architecture](#part-10--search-architecture)
- [PART 11 — Dashboard Aggregation](#part-11--dashboard-aggregation)
- [PART 12 — Financial Architecture](#part-12--financial-architecture)
- [PART 13 — Cross-Service Communication](#part-13--cross-service-communication)
- [PART 14 — Logging Architecture](#part-14--logging-architecture)
- [PART 15 — Caching Strategy](#part-15--caching-strategy)
- [PART 16 — Configuration Architecture](#part-16--configuration-architecture)
- [PART 17 — Scalability Strategy](#part-17--scalability-strategy)
- [PART 18 — Migration Mapping](#part-18--migration-mapping)
- [PART 19 — Service Dependency Diagram](#part-19--service-dependency-diagram)
- [PART 20 — Master Backend Checklist](#part-20--master-backend-checklist)

---

# PART 1 — Service Layer Philosophy

## 1.1 Architectural Layering

The backend follows a strict four-layer architecture. Every request passes through each layer in order. No layer may skip layers or call across laterally.

```
┌──────────────────────────────────────────────────────┐
│                  CONTROLLERS                          │
│  HTTP parsing, validation input, response formatting │
├──────────────────────────────────────────────────────┤
│                  SERVICES                             │
│  Business logic, orchestration, transactions         │
├──────────────────────────────────────────────────────┤
│                  REPOSITORIES                         │
│  Data access, query building, persistence            │
├──────────────────────────────────────────────────────┤
│                  PRISMA / POSTGRESQL                  │
│  Schema, migrations, raw queries                     │
└──────────────────────────────────────────────────────┘
```

## 1.2 Responsibilities

| Layer | Owns | Does Not Own |
|---|---|---|
| **Controller** | HTTP method/route mapping, request parsing, input schema validation (Zod), response status codes, response shape, error classification (4xx vs 5xx), file upload handling, authentication token extraction | Business logic, database queries, cross-entity orchestration, transaction boundaries |
| **Service** | Business rules, state transitions, transaction boundaries, cross-entity orchestration, event emission, permission checks beyond auth, calculation logic, receipt generation, email dispatch coordination | HTTP concerns, SQL queries, Prisma client instantiation, response formatting |
| **Repository** | Prisma client usage, query construction, pagination, filtering, sorting, soft delete filtering, field selection, include/include depth, count queries, bulk operations | Business rules, transaction boundaries, cross-entity awareness, HTTP concerns |
| **Prisma/PostgreSQL** | Schema enforcement, type safety, migrations, raw SQL when needed, connection pooling, indexes, constraints | Any business logic |

## 1.3 Separation of Concerns

Each service is a plain JavaScript class (ESM module). Services have no knowledge of Express, HTTP, or request/response objects. A service method receives plain data arguments and returns plain data or throws a typed error. This allows the same service to be called from controllers, background jobs, webhooks, or tests without modification.

## 1.4 Dependency Direction

Dependencies flow strictly downward. Controllers depend on services. Services depend on repositories and shared services. Repositories depend on Prisma. Nothing depends upward.

```
Controller → Service → Repository → Prisma
              ↓
         Shared Services (Email, Storage, PDF, Audit, Cache, Logger)
```

Shared services (EmailService, StorageService, AuditService, etc.) are injected into higher services via constructor dependencies. They never depend on domain services.

## 1.5 Business Logic Ownership

All business logic lives in services. Controllers never contain `if` statements about business rules. Repositories never contain business rules. The rule is absolute: if a decision depends on domain knowledge (is this booking valid, has this subscription expired, does this user have premium access), it belongs in a service.

## 1.6 Transaction Ownership

Services own transaction boundaries. A service method that needs atomicity wraps its Prisma operations in a `$transaction` block. Repositories are transaction-unaware — they receive a transactional Prisma client (`tx`) as a parameter when called within a transaction, or use the default client when called standalone.

Pattern:
- Service method begins transaction
- Service calls repository methods, passing `tx`
- Service calls shared services where needed (email queued, not sent inside transaction)
- Service commits or rolls back
- On failure, service throws; controller catches and maps to HTTP status

## 1.7 Validation Ownership

Validation is split into two layers:

| Layer | Validates | Example |
|---|---|---|
| **Controller (Zod schema)** | Shape, types, required fields, format (email, phone, date), min/max length, enums | `"email" must be valid email`, `"amount" must be positive number` |
| **Service (business rules)** | Cross-field consistency, state transitions, permission, referential integrity, business constraints | `"Cannot approve booking that is already cancelled"`, `"User must be premium to access this"` |

Controller validation rejects malformed requests early (400). Service validation rejects semantically invalid operations (409 Conflict, 403 Forbidden, 422 Unprocessable).

## 1.8 Service Communication

Services communicate through three mechanisms:

1. **Direct calls** — Service A calls Service B's public method. Used for synchronous, tightly coupled operations (e.g., BookingService calls UserService to verify membership).

2. **Shared service calls** — Domain services call shared infrastructure services (Email, Audit, Storage). These are one-directional and never call back.

3. **Events** — Service A emits an event. Service B subscribes. Used for loosely coupled, cross-domain reactions (e.g., SubscriptionService emits `subscription.activated`, MembershipService subscribes and updates user premium status). Events are processed in-process initially; queue-ready for horizontal scaling later.

## 1.9 Error Propagation

All layers throw typed errors. The controller layer catches and maps to HTTP responses.

| Error Class | HTTP Status | Usage |
|---|---|---|
| `ValidationError` | 400 | Malformed input, missing required fields |
| `AuthenticationError` | 401 | Missing or invalid token |
| `AuthorizationError` | 403 | Valid token but insufficient permissions |
| `NotFoundError` | 404 | Entity does not exist |
| `ConflictError` | 409 | Duplicate, state transition violation |
| `BusinessRuleError` | 422 | Valid input but violates business constraint |
| `ExternalServiceError` | 502 | Email provider, payment gateway failure |
| `InternalServerError` | 500 | Unexpected, logged with full stack trace |

Services never return `null` for expected-missing entities — they throw `NotFoundError`. This eliminates null-checking in callers and makes error paths explicit.

---

# PART 2 — Service Inventory

## 2.1 AuthService

**Purpose:** Authenticate users, manage tokens, handle OAuth.

**Responsibilities:**
- Register new users (email/password)
- Authenticate credentials
- Issue JWT access tokens + refresh tokens
- Validate and rotate refresh tokens
- Handle Google OAuth2 callback
- Password reset request and completion
- Email verification
- Token revocation (logout)

**Owned entities:** None (reads Users, writes token-related fields).

**Dependencies:** UserRepository, EmailService, CacheService, LoggerService.

**Public methods:**
- `register(data)` → `{ user, accessToken, refreshToken }`
- `login(email, password)` → `{ user, accessToken, refreshToken }`
- `refreshToken(refreshToken)` → `{ accessToken, refreshToken }`
- `logout(userId)` → void
- `requestPasswordReset(email)` → void
- `completePasswordReset(token, newPassword)` → void
- `verifyEmail(token)` → void
- `handleOAuthCallback(code)` → `{ user, accessToken, refreshToken, isNewUser }`

**Events produced:** `user.registered`, `user.login`, `user.password_reset_requested`, `user.email_verified`

**Events consumed:** None.

---

## 2.2 UserService

**Purpose:** Manage user profiles, preferences, blocking, deletion.

**Responsibilities:**
- CRUD operations on user profiles
- Update preferences (language, font size, notification preference)
- Block/unblock users
- Soft delete users
- Archive users
- List users with filtering and pagination
- Get user by ID
- Get user statistics (booking count, donation total, membership duration)
- Merge duplicate accounts

**Owned entities:** User, UserPreference.

**Dependencies:** UserRepository, PreferenceRepository, AuditService, CacheService, LoggerService.

**Public methods:**
- `getById(userId)` → User
- `getByEmail(email)` → User
- `list(filters, pagination)` → `{ users, total }`
- `updateProfile(userId, data)` → User
- `updatePreferences(userId, data)` → UserPreference
- `blockUser(userId, adminId, reason)` → User
- `unblockUser(userId, adminId)` → User
- `softDelete(userId, adminId)` → User
- `restoreUser(userId, adminId)` → User
- `getStats(userId)` → `{ bookings, donations, membershipDuration }`

**Events produced:** `user.blocked`, `user.unblocked`, `user.soft_deleted`, `user.restored`, `user.profile_updated`

**Events consumed:** `user.registered` (create preferences), `subscription.activated` (update account type).

---

## 2.3 MembershipService

**Purpose:** Manage membership tiers, account types, premium status.

**Responsibilities:**
- Determine current membership tier from subscription state
- Upgrade to premium
- Downgrade to free
- Calculate membership duration
- Check premium access for feature gating
- Synchronize membership fields across User (role, membershipTier, membershipType, accountType, subscriptionStatus, premiumStatus)

**Owned entities:** None (manages fields on User entity).

**Dependencies:** UserRepository, SubscriptionService, AuditService, CacheService, LoggerService.

**Public methods:**
- `getMembershipStatus(userId)` → `{ tier, type, expiryDate, isActive }`
- `upgradeToPremium(userId, subscriptionId)` → void
- `downgradeToFree(userId, reason)` → void
- `checkPremiumAccess(userId, feature)` → boolean
- `syncMembershipFields(userId)` → void
- `getExpiringMemberships(withinDays)` → User[]

**Events produced:** `membership.upgraded`, `membership.downgraded`, `membership.expiring`

**Events consumed:** `subscription.activated`, `subscription.expired`, `subscription.cancelled`, `payment.approved`.

---

## 2.4 SubscriptionService

**Purpose:** Manage premium membership subscription lifecycle.

**Responsibilities:**
- Create subscription requests
- Approve/reject subscriptions
- Auto-set dates on creation
- Calculate expiry dates
- Handle renewals
- Generate subscription receipts
- Track subscription history
- Manage pending subscriptions queue

**Owned entities:** Subscription, PendingSubscription, SubscriptionReminder.

**Dependencies:** UserRepository, MembershipService, PaymentService, EmailService, PDFService, TempleAccountService, AuditService, CacheService, LoggerService.

**Public methods:**
- `create(userId, data)` → Subscription
- `approve(subscriptionId, adminId, notes)` → Subscription
- `reject(subscriptionId, adminId, reason)` → Subscription
- `cancel(subscriptionId, userId)` → Subscription
- `renew(subscriptionId)` → Subscription
- `getById(id)` → Subscription
- `listByUser(userId)` → Subscription[]
- `listPending(filters, pagination)` → `{ subscriptions, total }`
- `getExpiring(withinDays)` → Subscription[]
- `processExpiryReminders()` → void

**Events produced:** `subscription.created`, `subscription.approved`, `subscription.rejected`, `subscription.cancelled`, `subscription.expired`, `subscription.renewed`, `subscription.reminder_sent`

**Events consumed:** `payment.approved` (auto-activate subscription).

---

## 2.5 PaymentService

**Purpose:** Process, track, and reconcile all payments.

**Responsibilities:**
- Record payments
- Approve/reject payments
- Link payments to subscriptions, donations, bookings
- Generate payment receipts
- Track receipt generation and delivery
- Handle payment status transitions
- Reconcile with temple accounts

**Owned entities:** Payment, PaymentAccount.

**Dependencies:** UserRepository, AuditService, EmailService, PDFService, TempleAccountService, CacheService, LoggerService.

**Public methods:**
- `create(userId, data)` → Payment
- `approve(paymentId, adminId, notes)` → Payment
- `reject(paymentId, adminId, reason)` → Payment
- `getById(id)` → Payment
- `listByUser(userId)` → Payment[]
- `listAll(filters, pagination)` → `{ payments, total }`
- `generateReceipt(paymentId)` → { receiptUrl }
- `resendReceipt(paymentId)` → void
- `getPaymentAccounts()` → PaymentAccount[]
- `updatePaymentAccount(id, data)` → PaymentAccount

**Events produced:** `payment.created`, `payment.approved`, `payment.rejected`, `payment.receipt_generated`, `payment.receipt_sent`

**Events consumed:** None (payment is a trigger entity; other services react to its events).

---

## 2.6 DonationService

**Purpose:** Manage all donations to the temple.

**Responsibilities:**
- Record donations
- Approve/reject donations
- Generate donation receipts
- Link donations to temple accounts
- Track donation history by user
- Handle special occasion donations
- Calculate donation totals by period

**Owned entities:** Donation.

**Dependencies:** UserRepository, TempleAccountService, PDFService, EmailService, AuditService, CacheService, LoggerService.

**Public methods:**
- `create(userId, data)` → Donation
- `approve(donationId, adminId)` → Donation
- `reject(donationId, adminId, reason)` → Donation
- `getById(id)` → Donation
- `listByUser(userId, filters)` → Donation[]
- `listAll(filters, pagination)` → `{ donations, total }`
- `generateReceipt(donationId)` → { receiptUrl }
- `getTotalsByPeriod(startDate, endDate)` → `{ total, count }`
- `getByCategory(startDate, endDate)` → `{ category, total }[]`

**Events produced:** `donation.created`, `donation.approved`, `donation.rejected`

**Events consumed:** None.

---

## 2.7 TempleAccountService

**Purpose:** Maintain the financial ledger — every monetary inflow and outflow.

**Responsibilities:**
- Create ledger entries from approved donations, bookings, subscriptions
- Create ledger entries from recorded expenses
- Monthly summary calculation
- Balance calculation by fund category
- Annual reports
- Ledger entry correction (admin)
- Subscription fee tracking

**Owned entities:** TempleAccount, MembershipFee.

**Dependencies:** AuditService, CacheService, LoggerService.

**Public methods:**
- `createEntry(data)` → TempleAccount
- `getById(id)` → TempleAccount
- `listByMonth(month, year, filters)` → TempleAccount[]
- `getMonthlySummary(month, year)` → `{ income, expenses, balance, byCategory }`
- `getAnnualSummary(year)` → `{ monthly, totals }`
- `getByClassification(classification, dateRange)` → TempleAccount[]
- `getBalanceByFund()` → `{ fund, balance }[]`
- `correctEntry(id, data, adminId)` → TempleAccount

**Events produced:** `temple_account.entry_created`, `temple_account.entry_corrected`

**Events consumed:** `donation.approved`, `payment.approved`, `booking.confirmed`, `expense.created`.

---

## 2.8 ExpenseService

**Purpose:** Track temple expenses with categorization and approval.

**Responsibilities:**
- Record expenses with category assignment
- Upload expense bills
- List expenses with filtering
- Monthly expense summaries
- Expense by category analysis
- Bulk expense import (CSV)

**Owned entities:** Expense, ExpenseCategory.

**Dependencies:** TempleAccountService, StorageService, AuditService, CacheService, LoggerService.

**Public methods:**
- `create(data)` → Expense
- `update(id, data)` → Expense
- `delete(id)` → void
- `getById(id)` → Expense
- `list(filters, pagination)` → `{ expenses, total }`
- `getMonthlyTotal(month, year)` → `{ total, byCategory }`
- `getCategories()` → ExpenseCategory[]
- `createCategory(data)` → ExpenseCategory
- `updateCategory(id, data)` → ExpenseCategory

**Events produced:** `expense.created`, `expense.updated`, `expense.deleted`, `expense.category_created`

**Events consumed:** None.

---

## 2.9 BookingService

**Purpose:** Manage pooja booking lifecycle from creation to completion.

**Responsibilities:**
- Create pooja bookings
- Validate pooja availability (dates, time slots, capacity)
- Approve/reject bookings
- Generate booking receipts
- Create booking messages (chat)
- Mark bookings as completed
- Cancel bookings
- Denormalize pooja name into booking
- Link approved bookings to temple accounts

**Owned entities:** PoojaBooking, BookingMessage.

**Dependencies:** PoojaService, UserService, TempleAccountService, PDFService, EmailService, AuditService, CacheService, LoggerService.

**Public methods:**
- `create(userId, data)` → PoojaBooking
- `approve(bookingId, adminId)` → PoojaBooking
- `reject(bookingId, adminId, reason)` → PoojaBooking
- `confirm(bookingId, adminId)` → PoojaBooking
- `complete(bookingId, adminId)` → PoojaBooking
- `cancel(bookingId, userIdOrAdmin)` → PoojaBooking
- `getById(id)` → PoojaBooking
- `listByUser(userId)` → PoojaBooking[]
- `listAll(filters, pagination)` → `{ bookings, total }`
- `addMessage(bookingId, senderType, senderEmail, content)` → BookingMessage
- `getMessages(bookingId, userId)` → BookingMessage[]
- `generateReceipt(bookingId)` → { receiptUrl }

**Events produced:** `booking.created`, `booking.approved`, `booking.rejected`, `booking.confirmed`, `booking.completed`, `booking.cancelled`, `booking.message_sent`

**Events consumed:** None.

---

## 2.10 PoojaService

**Purpose:** Manage pooja definitions, availability, scheduling, archiving.

**Responsibilities:**
- CRUD for poojas
- Configure availability (dates, days, time slots)
- Auto-archive past poojas (cron)
- Festival association
- Status management (active/inactive/archived/draft)

**Owned entities:** Pooja.

**Dependencies:** FestivalService, AuditService, CacheService, LoggerService.

**Public methods:**
- `create(data)` → Pooja
- `update(id, data)` → Pooja
- `delete(id)` → void
- `getById(id)` → Pooja
- `listAvailable(filters)` → Pooja[]
- `listAll(filters, pagination)` → `{ poojas, total }`
- `archive(id)` → Pooja
- `archivePastPoojas()` → Pooja[] (cron)
- `setFestival(poojaId, festivalId)` → Pooja

**Events produced:** `pooja.created`, `pooja.updated`, `pooja.archived`

**Events consumed:** None.

---

## 2.11 FestivalService

**Purpose:** Manage temple festivals and their associated poojas.

**Responsibilities:**
- CRUD for festivals
- Link/unlink poojas to festivals
- Festival image management
- Archive past festivals

**Owned entities:** Festival.

**Dependencies:** StorageService, AuditService, CacheService, LoggerService.

**Public methods:**
- `create(data)` → Festival
- `update(id, data)` → Festival
- `delete(id)` → void
- `getById(id)` → Festival
- `list(filters, pagination)` → `{ festivals, total }`
- `listActive()` → Festival[]

**Events produced:** `festival.created`, `festival.updated`, `festival.archived`

**Events consumed:** None.

---

## 2.12 GalleryService

**Purpose:** Manage media library with categories and ordering.

**Responsibilities:**
- Upload images/videos
- Create/update gallery items
- Category management (PhotoCategory)
- Ordering and publishing
- Thumbnail generation
- Archive/unarchive items

**Owned entities:** Gallery, PhotoCategory.

**Dependencies:** StorageService, AuditService, CacheService, LoggerService.

**Public methods:**
- `create(data, file)` → Gallery
- `update(id, data)` → Gallery
- `delete(id)` → void
- `getById(id)` → Gallery
- `list(filters, pagination)` → `{ items, total }`
- `listByCategory(categoryId)` → Gallery[]
- `reorder(id, newOrder)` → void
- `publish(id)` → Gallery
- `unpublish(id)` → Gallery
- `createCategory(data)` → PhotoCategory
- `updateCategory(id, data)` → PhotoCategory
- `deleteCategory(id)` → void

**Events produced:** `gallery.created`, `gallery.updated`, `gallery.deleted`, `gallery.category_created`

**Events consumed:** None.

---

## 2.13 VolunteerService

**Purpose:** Track volunteer participation in temple events.

**Responsibilities:**
- Record participation
- Track hours and status
- Volunteer statistics
- Export volunteer reports

**Owned entities:** VolunteerParticipation.

**Dependencies:** UserRepository, AuditService, CacheService, LoggerService.

**Public methods:**
- `create(data)` → VolunteerParticipation
- `update(id, data)` → VolunteerParticipation
- `delete(id)` → void
- `getById(id)` → VolunteerParticipation
- `listByUser(userId)` → VolunteerParticipation[]
- `listAll(filters, pagination)` → `{ participations, total }`
- `getStats(userId)` → `{ totalHours, eventCount }`
- `exportReport(dateRange)` → void

**Events produced:** `volunteer.participation_recorded`

**Events consumed:** None.

---

## 2.14 NotificationService

**Purpose:** Orchestrate all outbound notifications across channels.

**Responsibilities:**
- Route notifications to correct channel (email, in-app, future: push/SMS)
- Queue notifications for retry
- Track delivery status
- Manage notification preferences per user
- Handle admin messages

**Owned entities:** AdminMessage.

**Dependencies:** EmailService, UserService, UserRepository, CacheService, LoggerService.

**Public methods:**
- `send(notification)` → NotificationResult
- `sendBulk(notifications[])` → NotificationResult[]
- `getInAppNotifications(userId, filters)` → AdminMessage[]
- `markAsRead(notificationId, userId)` → void
- `getUnreadCount(userId)` → number
- `sendAdminMessage(userId, message, language)` → AdminMessage
- `retryFailed(filter)` → NotificationResult[]

**Events produced:** `notification.sent`, `notification.failed`, `notification.read`

**Events consumed:** `user.registered` (welcome), `subscription.approved` (welcome), `booking.approved` (receipt), `donation.approved` (receipt), `membership.expiring` (reminder).

---

## 2.15 EmailService

**Purpose:** Send emails through configured provider. Pure infrastructure — no business logic.

**Responsibilities:**
- Send single email
- Send bulk emails
- Template rendering with localization (en/de/ta)
- Attachment handling
- Retry failed sends
- Track sent emails
- Rate limiting

**Owned entities:** None.

**Dependencies:** CacheService, LoggerService.

**Public methods:**
- `send(to, subject, htmlBody, options?)` → void
- `sendBulk(recipients[], subject, templateId, variables)` → void
- `sendWithAttachment(to, subject, htmlBody, attachment)` → void
- `renderTemplate(templateId, language, variables)` → { subject, html }

**Events produced:** `email.sent`, `email.failed`

**Events consumed:** None (called by other services).

---

## 2.16 PDFService

**Purpose:** Generate PDF documents for receipts, reports, vouchers.

**Responsibilities:**
- Generate donation receipts
- Generate subscription receipts
- Generate booking receipts
- Generate expense vouchers
- Generate financial reports
- Store generated PDFs
- Regenerate from historical data
- Version tracking

**Owned entities:** None (writes file URLs to other entities).

**Dependencies:** StorageService, LoggerService.

**Public methods:**
- `generateDonationReceipt(donation, user)` → { url, receiptNumber }
- `generateSubscriptionReceipt(subscription, user)` → { url, receiptNumber }
- `generateBookingReceipt(booking, pooja)` → { url, receiptNumber }
- `generateExpenseVoucher(expense, category)` → { url, voucherNumber }
- `generateFinancialReport(data, dateRange)` → { url }
- `regenerateReceipt(type, entityId)` → { url, version }

**Events produced:** `pdf.receipt_generated`

**Events consumed:** None (called by other services).

---

## 2.17 StorageService

**Purpose:** Abstract file storage operations. Filesystem now, S3-ready later.

**Responsibilities:**
- Store uploaded files
- Retrieve file URLs
- Delete files
- Move files (temp → permanent)
- Clean temporary files
- Validate file types and sizes
- Generate thumbnails

**Owned entities:** None (manages physical files).

**Dependencies:** ConfigService, LoggerService.

**Public methods:**
- `upload(file, path)` → { url, filename, size }
- `getUrl(path)` → string
- `delete(path)` → void
- `move(fromPath, toPath)` → { url }
- `getTemporaryFiles()` → FileInfo[]
- `cleanupTemporary(olderThanMs)` → number (deleted count)
- `validateFile(file, constraints)` → ValidationResult
- `generateThumbnail(path, dimensions)` → { url }

**Events produced:** None.

**Events consumed:** None (called by other services).

---

## 2.18 AuditService

**Purpose:** Record all significant entity mutations for compliance and debugging.

**Responsibilities:**
- Record CRUD operations on key entities
- Record admin actions
- Record permission changes
- Query audit logs
- Export audit reports
- Retention management

**Owned entities:** AuditLog (new entity for PostgreSQL — no PB equivalent).

**Dependencies:** LoggerService.

**Public methods:**
- `log(event)` → AuditLog
- `logBatch(events[])` → AuditLog[]
- `query(filters, pagination)` → { logs, total }
- `getEntityHistory(entityType, entityId)` → AuditLog[]
- `getAdminActions(adminId, dateRange)` → AuditLog[]
- `cleanup(olderThanDays)` → number

**Events produced:** None (consumes all events, logs them).

**Events consumed:** All entity mutation events (user.*, subscription.*, booking.*, donation.*, payment.*, expense.*).

---

## 2.19 SettingsService

**Purpose:** Manage application-wide configuration and settings.

**Responsibilities:**
- CRUD for payment accounts (bank details, QR codes)
- Page access management
- Premium upgrade requests
- System settings (feature flags, regional config)

**Owned entities:** PaymentAccount, PageAccess, PremiumUpgradeRequest, UserAccountAssignment.

**Dependencies:** AuditService, CacheService, LoggerService.

**Public methods:**
- `getPaymentAccounts()` → PaymentAccount[]
- `updatePaymentAccount(id, data)` → PaymentAccount
- `getPageAccess(userId)` → PageAccess[]
- `grantPageAccess(userId, route, level, grantedBy)` → PageAccess
- `revokePageAccess(id)` → void
- `checkPageAccess(userId, route)` → boolean
- `getPremiumUpgradeRequests(filters)` → PremiumUpgradeRequest[]
- `processUpgradeRequest(id, action, adminId)` → PremiumUpgradeRequest

**Events produced:** `settings.payment_account_updated`, `settings.page_access_granted`, `settings.page_access_revoked`, `settings.upgrade_request_processed`

**Events consumed:** None.

---

## 2.20 ReportService

**Purpose:** Generate analytical and financial reports.

**Responsibilities:**
- Financial reports (income, expense, balance)
- Membership reports (active, expired, churn)
- Booking reports (popular poojas, completion rates)
- Donation reports (by donor, by period, by occasion)
- Volunteer reports (hours, participation)
- Export to CSV/PDF

**Owned entities:** None (reads from all entities).

**Dependencies:** TempleAccountService, DonationService, BookingService, MembershipService, VolunteerService, PDFService, CacheService, LoggerService.

**Public methods:**
- `financialReport(dateRange)` → FinancialReport
- `membershipReport()` → MembershipReport
- `bookingReport(dateRange)` → BookingReport
- `donationReport(dateRange)` → DonationReport
- `volunteerReport(dateRange)` → VolunteerReport
- `exportCSV(reportType, data, columns)` → { url }
- `exportPDF(reportType, data)` → { url }

**Events produced:** None.

**Events consumed:** None (reads from services).

---

## 2.21 SearchService

**Purpose:** Unified search across all entities.

**Responsibilities:**
- Search users by name, email, phone
- Search bookings by pooja name, date, status
- Search donations by donor, date, amount
- Search poojas by name, category
- Search expenses by category, date, description
- Search festivals by name, date
- Search across subscriptions
- Pagination and ranking

**Owned entities:** None (reads from all repositories).

**Dependencies:** All repositories (read-only).

**Public methods:**
- `globalSearch(query, userId, role)` → SearchResult[]
- `searchUsers(query, filters)` → SearchResult[]
- `searchBookings(query, filters)` → SearchResult[]
- `searchDonations(query, filters)` → SearchResult[]
- `searchPoojas(query, filters)` → SearchResult[]
- `searchExpenses(query, filters)` → SearchResult[]

**Events produced:** None.

**Events consumed:** None (read-only).

---

## 2.22 DashboardService

**Purpose:** Aggregate data for dashboard views.

**Responsibilities:**
- Admin dashboard KPIs
- Member dashboard summary
- Financial dashboard
- Booking dashboard
- Real-time-ish metrics (cached, refreshed periodically)

**Owned entities:** None (reads and aggregates).

**Dependencies:** TempleAccountService, DonationService, BookingService, MembershipService, PaymentService, ExpenseService, VolunteerService, CacheService, LoggerService.

**Public methods:**
- `getAdminDashboard()` → AdminDashboardData
- `getMemberDashboard(userId)` → MemberDashboardData
- `getFinancialDashboard(dateRange)` → FinancialDashboardData
- `getBookingDashboard(dateRange)` → BookingDashboardData
- `getAnalyticsDashboard(dateRange)` → AnalyticsDashboardData

**Events produced:** None.

**Events consumed:** None (read-only, cache-backed).

---

## 2.23 AIService

**Purpose:** Manage AI chat interactions and image generation.

**Responsibilities:**
- Store chat messages
- Retrieve chat history
- Store generated images
- Manage AI API integration
- Handle streaming responses

**Owned entities:** IntegratedAiMessage, IntegratedAiImage.

**Dependencies:** StorageService, LoggerService.

**Public methods:**
- `saveMessage(userId, role, content)` → IntegratedAiMessage
- `getHistory(userId, limit)` → IntegratedAiMessage[]
- `saveImage(file)` → IntegratedAiImage
- `streamChat(messages, onChunk)` → void

**Events produced:** None.

**Events consumed:** None.

---

## 2.24 CronService

**Purpose:** Schedule and manage all background/cron jobs.

**Responsibilities:**
- Register cron jobs
- Start/stop jobs
- Track job execution status
- Retry failed jobs
- Health monitoring

**Owned entities:** None (manages job lifecycle).

**Dependencies:** All services that register cron jobs, LoggerService.

**Public methods:**
- `register(jobConfig)` → void
- `start()` → void
- `stop()` → void
- `getStatus()` → JobStatus[]
- `triggerJob(jobName)` → void

**Events produced:** `cron.job_executed`, `cron.job_failed`

**Events consumed:** None (triggers other services).

---

## 2.25 BackgroundJobService

**Purpose:** Process async one-off tasks (email retries, cleanup, regeneration).

**Responsibilities:**
- Queue background tasks
- Process task queue
- Retry with exponential backoff
- Dead letter queue
- Task progress tracking

**Owned entities:** None (uses in-process queue initially, database queue later).

**Dependencies:** LoggerService.

**Public methods:**
- `enqueue(task)` → TaskId
- `processNext()` → void
- `retry(taskId)` → void
- `getStatus(taskId)` → TaskStatus
- `getFailedTasks()` → Task[]

**Events produced:** `job.completed`, `job.failed`

**Events consumed:** None (triggered by other services).

---

## 2.26 CacheService

**Purpose:** In-memory caching with Redis-ready interface.

**Responsibilities:**
- Get/set/delete cached values
- TTL management
- Pattern-based invalidation
- Cache-aside pattern support
- Warm cache on startup

**Owned entities:** None.

**Dependencies:** LoggerService.

**Public methods:**
- `get(key)` → any | null
- `set(key, value, ttlMs)` → void
- `delete(key)` → void
- `invalidatePattern(pattern)` → number (keys deleted)
- `has(key)` → boolean
- `flush()` → void
- `getOrSet(key, factory, ttlMs)` → any

**Events produced:** None.

**Events consumed:** None (called by other services).

---

## 2.27 LoggerService

**Purpose:** Structured logging with levels and correlation IDs.

**Responsibilities:**
- Log at levels: debug, info, warn, error, fatal
- Correlation ID propagation
- Structured JSON output
- Request-scoped context
- Performance logging
- External service call logging

**Owned entities:** None.

**Dependencies:** ConfigService.

**Public methods:**
- `debug(message, context?)` → void
- `info(message, context?)` → void
- `warn(message, context?)` → void
- `error(message, error?, context?)` → void
- `fatal(message, error?, context?)` → void
- `child(context)` → LoggerService
- `startTimer(label)` → { end: () => number }

**Events produced:** None.

**Events consumed:** None (called by all services).

---

# PART 3 — Repository Architecture

## 3.1 Repository Pattern

Each Prisma model has a corresponding repository class. Repositories are the **only** layer that imports PrismaClient. They wrap Prisma operations in domain-friendly methods.

A repository does not contain business logic. It does not decide whether a booking should be approved. It provides the data access primitives that services compose into business operations.

## 3.2 Query Ownership

Repositories own all query construction. A service never writes `prisma.user.findMany({ where: ... })` directly. Instead, it calls `userRepository.findByEmail(email)` or `userRepository.listWithFilters(filters)`.

This separation means:
- Query optimization happens in one place
- Prisma schema changes propagate through repositories, not services
- Complex joins and includes are managed centrally
- N+1 prevention is systematic (repositories batch includes)

## 3.3 Transaction Support

Repositories accept an optional `tx` parameter (Prisma transaction client). When a service wraps operations in `$transaction`, it passes `tx` to repository methods. When called standalone, repositories use the default Prisma client.

```
Service method:
  prisma.$transaction(async (tx) => {
    repoA.create(data, tx)   // uses tx
    repoB.update(id, data, tx) // uses tx
  })

Service method (no transaction):
  repoA.findById(id)  // uses default client
```

## 3.4 Pagination

All list methods return a standardized paginated result:

```
{ items: T[], total: number, page: number, pageSize: number, totalPages: number }
```

Repositories accept a `PaginationOptions` parameter:
- `page` (default 1)
- `pageSize` (default 20, max 100)
- `sortBy` (field name)
- `sortOrder` (asc/desc)

Repositories always run a `count` query alongside the data query for accurate totals.

## 3.5 Filtering

Repositories accept a `FilterOptions` parameter. Filters map directly to Prisma `where` clauses. Each repository defines its own filter interface specific to its entity:

- User filters: `role`, `membershipTier`, `isBlocked`, `isDeleted`, `search` (name/email)
- Booking filters: `status`, `poojaId`, `userId`, `dateRange`, `isDeleted`
- Donation filters: `status`, `userId`, `dateRange`, `category`
- Expense filters: `categoryId`, `dateRange`, `paymentMethod`
- Subscription filters: `status`, `planType`, `userId`

The `search` filter applies `contains` (case-insensitive) across multiple text fields.

## 3.6 Searching

For simple text search, repositories use Prisma's `contains` with `mode: 'insensitive'`. For full-text search across related entities, the SearchService composes multiple repository calls.

PostgreSQL `ILIKE` patterns are handled by Prisma's `contains` + `mode: 'insensitive'`. For advanced full-text search (ranking, stemming), the architecture预留s a path to PostgreSQL `tsvector`/`tsquery` via Prisma's `$queryRaw`.

## 3.7 Bulk Operations

Repositories provide bulk methods for efficiency:
- `createMany(data[])` — bulk insert
- `updateMany(where, data)` — bulk update
- `deleteMany(where)` — bulk soft delete
- `upsertMany(data[], uniqueKey)` — bulk upsert (insert or update)

Bulk operations bypass individual audit logging. The calling service is responsible for recording a single audit entry for bulk actions.

## 3.8 Soft Delete

Repositories automatically filter soft-deleted records. Every `findMany`, `findFirst`, `findUnique`, and `count` call includes `where: { isDeleted: false }` unless explicitly overridden with `includeDeleted: true`.

Hard delete is never exposed through repositories. It is only available through a dedicated `hardDelete` method that requires admin authorization and is always audit-logged.

## 3.9 Audit Fields

Every entity with `createdAt`/`updatedAt` has these managed by Prisma:
- `createdAt` set to `now()` on create
- `updatedAt` managed by Prisma `@updatedAt`

Repositories do not set these fields — Prisma handles them automatically.

## 3.10 Optimistic Concurrency

For entities prone to concurrent updates (payments, subscriptions, temple accounts), the architecture uses a `version` field pattern:
- Each mutable entity has a `version Int @default(0)` field
- On update, the service passes the expected version
- Repository adds `where: { id, version: expectedVersion }`
- If the row was modified since read, zero rows update → service throws `ConflictError`
- Version is incremented on each update

This prevents lost updates without database locks.

---

# PART 4 — Business Rules Engine

## 4.1 Donation Approval Rules

| Rule | Condition | Action |
|---|---|---|
| Donor must exist | `donation.userId` references valid non-deleted user | Reject if invalid |
| Amount must be positive | `donation.amount > 0` | Reject if zero/negative |
| Status transition valid | Only `pending → approved` or `pending → rejected` | Throw ConflictError on invalid transition |
| Approval creates temple entry | On approve, auto-create TempleAccount entry with `classification = 'Donation'` | Transactional |
| Receipt generated on approval | Generate receipt PDF after approval | Async (after commit) |
| Email sent on approval | Send approval notification | Async (after commit) |
| Duplicate prevention | Same user + same amount + same date within 5 minutes → warn | Log warning, allow override |

## 4.2 Booking Approval Rules

| Rule | Condition | Action |
|---|---|---|
| Pooja must be active | `pooja.status = 'active'` and `pooja.isArchived = false` | Reject if inactive |
| Pooja must be available | `poojaDate` falls within pooja's available dates/days | Reject if unavailable |
| Time slot valid | `timeSlot` exists in pooja's configured time slots | Reject if invalid |
| Donation amount minimum | `donationAmount >= 1` (enforced by hook, carry forward) | Reject if below minimum |
| Status transition valid | `pending → approved → confirmed → completed` or `pending → rejected` or any active → `cancelled` | Throw on invalid |
| Approval generates receipt | Create receipt number `RCP-XXXXXXXX-XXXXX` | Transactional |
| Approval creates temple entry | Auto-create TempleAccount entry | Transactional |
| Email sent on approval | Send approval email with receipt | Async (after commit) |
| Cancellation reason required | When cancelling, admin must provide reason in notes | Validate |

## 4.3 Subscription Approval Rules

| Rule | Condition | Action |
|---|---|---|
| User must exist and not be deleted | Valid, non-deleted user | Reject if invalid |
| Valid plan type | Only `premium` currently | Reject other values |
| Amount within bounds | `0 < amount <= 100000` | Reject if out of bounds |
| Status transition valid | `pending → active` or `pending → rejected` | Throw on invalid |
| Activation upgrades user | On approve: set user `membershipType = premium`, `subscriptionStatus = premium`, `premiumStatus = Active`, `accountType = Premium Member` | Transactional |
| Deactivation on expiry | On expire: revert user to free tier fields | Transactional |
| Receipt generated | Generate subscription receipt | Async |
| Email sent | Send approval/rejection email | Async |
| Date auto-set | `startDate = today`, `endDate = startDate + 30 days` (or `durationMonths` * 30) | On create |

## 4.4 Premium Activation Rules

| Rule | Condition | Action |
|---|---|---|
| Trigger | Payment approved with `planType = premium` | Auto-create subscription |
| Or trigger | Subscription approved | Update user fields |
| User fields updated | `membershipTier`, `membershipType`, `subscriptionStatus`, `premiumStatus`, `accountType` | All set to premium values |
| Expiry checked | If `subscriptionExpiryDate < now()` | Auto-downgrade |
| Single source of truth | `membershipTier` on User is the canonical tier | All other fields are synchronized |

## 4.5 Receipt Numbering

| Receipt Type | Format | Generation |
|---|---|---|
| Donation receipt | `DON-{YYYYMMDD}-{sequence}` | Auto-increment per day |
| Booking receipt | `RCP-{XXXXXXXX}-{XXXXX}` | Random hex + random alpha (PB format) |
| Subscription receipt | `SUB-{YYYYMMDD}-{sequence}` | Auto-increment per day |
| Expense voucher | `VCH-{YYYYMMDD}-{sequence}` | Auto-increment per day |

All receipt numbers are unique. Collision is checked on generation; on collision, regenerate.

## 4.6 Voucher Numbering

| Voucher Type | Format | Generation |
|---|---|---|
| Expense voucher | `VCH-{YYYYMMDD}-{sequence}` | Per-day sequence |
| Income voucher | `INC-{YYYYMMDD}-{sequence}` | Per-day sequence |

## 4.7 Renewal Rules

| Rule | Condition | Action |
|---|---|---|
| Auto-renewal | `renewalType = auto` and subscription active | Create new subscription period on expiry |
| Manual renewal | `renewalType = manual` | Send reminder 30, 15, 7 days before expiry |
| Renewal creates new record | New subscription record with dates shifted | Old record marked as `status = completed` |
| Grace period | 7 days after expiry | Subscription still considered active |
| Post-grace | After 7-day grace | Auto-downgrade to free |

## 4.8 Expiry Rules

| Rule | Condition | Action |
|---|---|---|
| Expiry check | Daily cron compares `endDate + gracePeriod` vs `now()` | Mark expired |
| Reminder schedule | 30 days, 15 days, 7 days before `endDate` | Send reminder email |
| Expiry email | On actual expiry | Send expiry notification |
| Auto-downgrade | On expiry, update user membership fields | Transactional |
| Expiry creates temple entry | Record expiry in temple accounts if relevant | Optional |

## 4.9 Refund Rules

| Rule | Condition | Action |
|---|---|---|
| Refund trigger | Admin marks payment as `rejected` after `approved` | Create reverse temple entry |
| Reversal entry | TempleAccount entry with negative amount, same category | Transactional |
| Status update | Payment `status = rejected` | Atomic update |
| Audit required | Refund must include admin notes with reason | Validate |
| Email notification | Notify user of refund | Async |

## 4.10 Deletion Rules

| Rule | Condition | Action |
|---|---|---|
| Soft delete only | All entity deletions are soft (`isDeleted = true`) | Never hard delete through API |
| Admin-only deletion | Only admins can delete most entities | Service checks `role = admin` |
| User self-deletion | Users can soft-delete own account | Service checks `userId = request.userId` |
| Cascade soft delete | Deleting a parent soft-deletes children | Booking delete → messages soft-deleted |
| Restore available | Soft-deleted entities can be restored | Restore reverses `isDeleted` and `deletedAt` |
| Hard delete | Only via admin tool, logged, irreversible | Extremely rare |

## 4.11 Financial Integrity Rules

| Rule | Condition | Action |
|---|---|---|
| Ledger balance | Sum of income entries − sum of expense entries = current balance | Verified by monthly reconciliation |
| No orphan entries | Every TempleAccount entry must trace to a source (donation, booking, subscription, expense) | Referenced by `transactionId` |
| Amount precision | All monetary amounts stored as `Decimal(10,2)` | No floating point |
| Currency consistency | All amounts in EUR (primary) | USD references noted in config |
| Monthly closure | Month-end summary generated automatically | Cron job on 1st of each month |
| Audit trail | Every financial mutation logged in AuditLog | Service-level audit |

## 4.12 Duplicate Prevention Rules

| Rule | Condition | Action |
|---|---|---|
| User email | Unique constraint on `users.email` | Database enforces |
| Same-day same-amount donation | Same user, same amount, same day → flag | Service warns, allows override |
| Duplicate booking | Same user, same pooja, same date, same time slot → block | Service rejects |
| Subscription duplicate | Active subscription exists for user → block new creation | Service checks before create |
| Payment duplicate | Same transaction_id already recorded → warn | Service checks before create |

## 4.13 State Transition Rules

All entities with a `status` field follow a defined state machine. Invalid transitions throw `ConflictError`.

```
PoojaBooking:
  pending → approved → confirmed → completed
  pending → rejected
  approved → cancelled
  confirmed → cancelled

Subscription (record):
  pending → active
  pending → rejected
  active → expired (cron)
  active → cancelled (user)

Payment:
  pending → approved
  pending → rejected
  approved → rejected (refund, admin-only)

Donation:
  pending → approved
  pending → rejected

Pooja:
  draft → active → inactive → archived
  active → archived (cron, past dates)

Festival:
  active → archived
```

---

# PART 5 — Transaction Design

## 5.1 Atomic Operations

Every business operation that touches multiple entities in a way that must be all-or-nothing uses a Prisma `$transaction`. The transaction boundary is defined at the service level.

Examples of atomic operations:
- Booking approval: update booking status + create temple account entry + generate receipt number
- Subscription activation: update subscription status + update user membership fields
- Payment approval: update payment status + create subscription + update user fields
- Donation approval: update donation status + create temple account entry
- Expense creation: create expense + create temple account entry
- User soft delete: update user `isDeleted` + soft-delete related bookings

## 5.2 Rollback Strategy

On any failure within a transaction:
1. Prisma automatically rolls back all database changes
2. Service throws the appropriate typed error
3. Controller catches and maps to HTTP status
4. Any side effects queued outside the transaction (emails, file uploads) are NOT rolled back but are marked for retry or logged as pending

The principle: **database transactions are atomic; side effects are eventually consistent.**

## 5.3 Compensating Actions

For operations that span transaction boundaries (e.g., database committed but email failed), compensating actions handle partial failures:

| Failure | Compensation |
|---|---|
| DB committed, email failed | Email queued for retry (BackgroundJobService) |
| DB committed, PDF generation failed | PDF marked as `pending`, regenerated by cron |
| DB committed, file upload failed | File path set to null, flagged for retry |
| Subscription activated, email failed | Activation stands, email retried 3x then logged |

Compensating actions are never automatic rollbacks. They are async retries.

## 5.4 Nested Operations

Services may nest transaction calls through Prisma's interactive transactions. The outer transaction is the primary boundary. Inner repository calls receive `tx` from the outer transaction.

```
Service.transaction():
  tx = prisma.$transaction():
    repoA.create(tx)
    repoB.update(tx)
    sharedService.sideEffect()  // NOT inside tx
```

Shared services called inside a transaction should NOT run their own transactions. They should use the passed `tx` client for any DB operations.

## 5.5 Cross-Service Transactions

Cross-service transactions are handled through orchestration at the calling service level:

1. Service A begins transaction
2. Service A calls Service B's method, passing `tx`
3. Service B performs its operations within Service A's transaction
4. If any step fails, the entire transaction rolls back

This requires services to accept an optional `tx` parameter on their public methods. When `tx` is provided, the service uses it; when absent, it uses the default client.

## 5.6 Failure Recovery

| Scenario | Recovery |
|---|---|
| Server crash mid-transaction | PostgreSQL auto-rolls back uncommitted transaction |
| Server crash post-commit | Side effects retried by BackgroundJobService on restart |
| Database connection lost | Prisma connection pool handles retry; service throws ExternalServiceError |
| Partial failure (some operations succeeded) | Compensating actions via BackgroundJobService |
| Concurrent modification | Optimistic locking throws ConflictError; client retries |

---

# PART 6 — Background Jobs

## 6.1 Subscription Expiry Check

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Daily at 02:00 UTC |
| **Dependencies** | SubscriptionService, MembershipService, EmailService |
| **Logic** | Find subscriptions where `endDate + 7 days < now()` and `status = active`. Mark as expired. Update user membership fields to free. Send expiry email. Create temple account entry if applicable. |
| **Failure handling** | Log error, skip expired subscriptions for this run, retry next day. Never mark as expired if user update fails. |
| **Retry policy** | No automatic retry; runs daily so skipped items caught next run. |

## 6.2 Subscription Renewal Reminders

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Daily at 08:00 UTC |
| **Dependencies** | SubscriptionService, EmailService |
| **Logic** | Find active subscriptions expiring within 30, 15, or 7 days. Check `subscription_reminders` to avoid duplicates. Send reminder email. Record in `subscription_reminders`. |
| **Failure handling** | Mark reminder as `failed` in `subscription_reminders`. Retry once on next run. After 2 failures, skip. |
| **Retry policy** | One automatic retry next day. |

## 6.3 Pooja Auto-Archive

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Hourly |
| **Dependencies** | PoojaService |
| **Logic** | Find active poojas where all available dates are in the past. Set `isArchived = true`, `archivedAt = now()`, `status = 'archived'`. |
| **Failure handling** | Log error. Archive individually; one failure does not block others. |
| **Retry policy** | No retry; next hourly run catches any missed items. |

## 6.4 Receipt Regeneration

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Daily at 03:00 UTC |
| **Dependencies** | PDFService, DonationService, BookingService, SubscriptionService |
| **Logic** | Find approved entities where `receipt_pdf IS NULL` or `receipt_generated_at IS NULL`. Generate receipts. |
| **Failure handling** | Log error. Skip entity. Retry next run. Max 3 attempts per entity; after 3, flag for manual review. |
| **Retry policy** | Daily until success or 3 attempts. |

## 6.5 Temporary File Cleanup

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Every 6 hours |
| **Dependencies** | StorageService |
| **Logic** | Delete files in `uploads/temp/` older than 24 hours. Delete orphaned files (no entity reference). |
| **Failure handling** | Log warning. Continue processing other files. |
| **Retry policy** | No retry; next run handles remaining. |

## 6.6 Gallery Cleanup

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Daily at 04:00 UTC |
| **Dependencies** | GalleryService, StorageService |
| **Logic** | Find gallery items with `is_deleted = true` older than 30 days. Permanently delete file from storage. Remove database record. |
| **Failure handling** | Log error. Skip item. Retry next run. |
| **Retry policy** | Daily until success. |

## 6.7 Audit Log Cleanup

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Weekly, Sunday 05:00 UTC |
| **Dependencies** | AuditService |
| **Logic** | Delete audit logs older than 365 days. Export to cold storage if configured. |
| **Failure handling** | Log error. Skip cleanup for this week. |
| **Retry policy** | Next weekly run. |

## 6.8 Notification Retry

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Every 15 minutes |
| **Dependencies** | NotificationService, EmailService |
| **Logic** | Find notifications with `status = 'failed'` and `retryCount < 3`. Retry sending. Exponential backoff: 15min, 30min, 60min. After 3 failures, move to dead letter. |
| **Failure handling** | Increment retry count. After 3, log to dead letter queue. |
| **Retry policy** | Exponential backoff, max 3 retries. |

## 6.9 Email Retry

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Every 10 minutes |
| **Dependencies** | EmailService |
| **Logic** | Find queued emails with `status = 'pending'` and `attempts < 3`. Retry sending. |
| **Failure handling** | Increment attempts. After 3, mark as `failed`, log reason. |
| **Retry policy** | Exponential backoff: 10min, 20min, 40min. |

## 6.10 Database Backup

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Daily at 01:00 UTC |
| **Dependencies** | None (runs `pg_dump` externally) |
| **Logic** | Execute `pg_dump` to create database backup. Compress. Store in backup directory. Retain last 30 daily backups. |
| **Failure handling** | Log error. Alert admin via email. |
| **Retry policy** | Retry once after 30 minutes. |

## 6.11 Health Monitoring

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Every 5 minutes |
| **Dependencies** | All services (health check endpoints) |
| **Logic** | Check database connectivity, email service, storage accessibility, memory usage, disk usage. Log status. Alert if unhealthy. |
| **Failure handling** | Log critical alert. Send email to admin if persistent (3 consecutive failures). |
| **Retry policy** | Immediate retry once. |

## 6.12 Cache Warming

| Property | Value |
|---|---|
| **Trigger** | Cron schedule |
| **Frequency** | Every 30 minutes |
| **Dependencies** | CacheService, DashboardService, SettingsService |
| **Logic** | Pre-load frequently accessed data: active poojas, payment accounts, active festivals, system settings. |
| **Failure handling** | Log warning. Cache remains stale until next attempt. |
| **Retry policy** | Next scheduled run. |

---

# PART 7 — Notification Architecture

## 7.1 Notification Channels

| Channel | Status | Usage |
|---|---|---|
| **Email** | Active | Primary notification method. All transactional emails. |
| **In-App** | Active | Admin messages, booking status updates, system announcements. |
| **Push (browser)** | Future | Real-time booking updates, payment confirmations. |
| **SMS** | Future | Booking reminders, OTP verification, urgent alerts. |

## 7.2 Email Notifications

| Notification | Trigger | Template | Language |
|---|---|---|---|
| Welcome | User registration | `welcome` | User's `preferredLanguage` |
| Password Reset | Request reset | `password-reset` | User's `preferredLanguage` |
| Email Verification | Registration | `email-verification` | `en` |
| Booking Approved | Booking status → approved | `booking-approved` | User's `preferredLanguage` |
| Booking Rejected | Booking status → rejected | `booking-rejected` | User's `preferredLanguage` |
| Booking Confirmation | Booking status → confirmed | `booking-confirmation` | User's `preferredLanguage` |
| Subscription Approved | Subscription status → active | `subscription-approved` | User's `preferredLanguage` |
| Subscription Rejected | Subscription status → rejected | `subscription-rejected` | User's `preferredLanguage` |
| Subscription Expiry Reminder | 30/15/7 days before expiry | `subscription-reminder` | User's `preferredLanguage` |
| Subscription Expired | Subscription expired | `subscription-expired` | User's `preferredLanguage` |
| Donation Approved | Donation status → approved | `donation-approved` | User's `preferredLanguage` |
| Donation Receipt | Receipt generated | `donation-receipt` | User's `preferredLanguage` |
| Payment Receipt | Payment receipt generated | `payment-receipt` | User's `preferredLanguage` |
| Admin Alert | System error, health failure | `admin-alert` | `en` |

## 7.3 In-App Notifications

| Notification | Trigger | Recipient |
|---|---|---|
| Admin Message | Admin sends via dashboard | Specific user |
| Booking Status Change | Any status change | Booking owner |
| Subscription Status Change | Any status change | Subscription owner |
| System Announcement | Admin publishes | All users or filtered |
| Volunteer Reminder | Upcoming event | Assigned volunteers |

## 7.4 Template Management

Templates are stored in `apps/api/src/templates/email/` as HTML files with variable placeholders. Three language variants per template:

```
templates/email/
  welcome.en.html
  welcome.de.html
  welcome.ta.html
  booking-approved.en.html
  booking-approved.de.html
  ...
```

Template rendering uses a simple variable replacement engine (`{{variableName}}`). No template compilation at runtime — templates are pre-rendered HTML with placeholders.

## 7.5 Localization

| Language | Code | Fallback |
|---|---|---|
| English | `en` | — (default) |
| German | `de` | `en` |
| Tamil | `ta` | `en` |

User's preferred language is read from `User.preferredLanguage`. If the template variant does not exist, falls back to `en`.

## 7.6 Retry Strategy

| Attempt | Delay | Action |
|---|---|---|
| 1st | Immediate | Send email |
| 2nd | 10 minutes | Retry |
| 3rd | 30 minutes | Retry |
| 4th (final) | 60 minutes | Retry, then mark as failed |

After 3 retries, the notification is moved to a dead letter queue. Admin can manually resend from the dashboard.

## 7.7 Delivery Tracking

Every notification is recorded:
- `notificationId`
- `channel` (email, in-app, push, sms)
- `recipient`
- `templateId`
- `status` (pending, sent, delivered, failed)
- `sentAt`, `deliveredAt`, `failedAt`
- `retryCount`
- `error` (if failed)

This allows the admin dashboard to show notification delivery rates.

---

# PART 8 — PDF Generation Architecture

## 8.1 PDF Types

| PDF Type | Trigger | Data Source | Template |
|---|---|---|---|
| **Donation Receipt** | Donation approved | Donation + User | `receipt-donation.html` |
| **Subscription Receipt** | Subscription activated | Subscription + User | `receipt-subscription.html` |
| **Booking Receipt** | Booking approved | Booking + Pooja + User | `receipt-booking.html` |
| **Expense Voucher** | Expense created | Expense + Category | `voucher-expense.html` |
| **Financial Report** | Admin request | Aggregated temple accounts | `report-financial.html` |
| **Membership Certificate** | Premium activated | User + Subscription | `certificate-membership.html` (future) |

## 8.2 Receipt Naming Convention

```
receipts/
  donations/
    DON-20260711-0001.pdf
    DON-20260711-0002.pdf
  subscriptions/
    SUB-20260711-0001.pdf
  bookings/
    RCP-A1B2C3D4-E5F67.pdf
  vouchers/
    VCH-20260711-0001.pdf
  reports/
    FIN-2026-07.pdf
```

## 8.3 Template Structure

Each PDF template contains:
- Temple header (name, address, logo, contact)
- Receipt number and date
- Donor/payer information
- Transaction details (amount, purpose, method)
- Legal disclaimer
- Footer (tax information, temple registration number)

Templates are HTML + CSS, rendered to PDF via a headless browser or PDF library.

## 8.4 Storage

Generated PDFs are stored in the local filesystem under `uploads/receipts/`. The file path is stored as a URL string on the originating entity (`receiptPdf` field).

Access control:
- Donation receipts: donor + admin
- Subscription receipts: subscriber + admin
- Booking receipts: booking owner + admin
- Expense vouchers: admin only
- Financial reports: admin only

## 8.5 Regeneration

PDFs can be regenerated from historical data. Each regeneration creates a new version:
- Original: `DON-20260711-0001.pdf` (v1)
- Regenerated: `DON-20260711-0001-v2.pdf` (v2)

The `version` number is tracked. Previous versions are retained for audit.

## 8.6 Versioning

Each receipt has:
- `receiptNumber` — unique, immutable
- `receiptPdf` — URL of current version
- `receiptGeneratedAt` — timestamp of generation
- `receiptVersion` — integer, incremented on regeneration

---

# PART 9 — Storage Architecture

## 9.1 File Categories

| Category | Access | Retention | Examples |
|---|---|---|---|
| **User Avatars** | Owner + Admin | Indefinite (deleted with user) | Profile pictures |
| **Gallery Media** | Public | Indefinite (until admin deletes) | Temple photos, event videos |
| **Festival Images** | Public | Indefinite | Festival posters |
| **Receipt PDFs** | Owner + Admin | Indefinite (audit requirement) | Donation/booking receipts |
| **Expense Bills** | Admin only | 7 years (tax requirement) | Scanned invoices |
| **Payment QR Codes** | Public | Until updated | Bank QR codes |
| **AI Images** | Owner | 30 days | AI-generated images |
| **Temporary Files** | System | 24 hours | Upload staging, cache |

## 9.2 Folder Structure

```
uploads/
  users/
    {userId}/
      avatar.jpg
  gallery/
    {galleryId}/
      image.jpg
      thumb-300x300.jpg
      thumb-100x100.jpg
  festivals/
    {festivalId}/
      image.jpg
  receipts/
    donations/
      DON-20260711-0001.pdf
    subscriptions/
      SUB-20260711-0001.pdf
    bookings/
      RCP-A1B2C3D4-E5F67.pdf
    vouchers/
      VCH-20260711-0001.pdf
    reports/
      FIN-2026-07.pdf
  expenses/
    {expenseId}/
      bill.pdf
  payment-accounts/
    {accountId}/
      qr.png
  ai-images/
    {imageId}/
      image.png
  temp/
    {sessionId}/
      upload.jpg
```

## 9.3 Retention Policy

| Category | Retention | Action on Expiry |
|---|---|---|
| Temporary files | 24 hours | Auto-delete (cron) |
| AI images | 30 days | Auto-delete (cron) |
| Gallery media | Until admin deletes | Hard delete |
| Receipt PDFs | Indefinite | Never auto-delete |
| Expense bills | 7 years | Archive to cold storage |
| User avatars | Until user deletes | Hard delete with user |

## 9.4 Cleanup Policy

Background jobs handle cleanup:
- **Every 6 hours:** Delete temp files older than 24 hours
- **Daily:** Delete AI images older than 30 days
- **Weekly:** Scan for orphaned files (no entity reference)
- **Monthly:** Check disk usage, alert if >80%

## 9.5 Future Cloud Storage

The StorageService abstraction layer is designed for S3 compatibility:
- Local filesystem implementation now
- S3 implementation via environment variable switch
- Bucket structure mirrors local folder structure
- URL generation changes from `/hcgi/api/files/...` to S3 presigned URLs

---

# PART 10 — Search Architecture

## 10.1 Search Scope

| Entity | Searchable Fields | Indexed |
|---|---|---|
| **Users** | name, email, phone, city | Yes (unique on email) |
| **Pooja Bookings** | name, email, poojaName, receiptNumber | Partial (on status, userId) |
| **Donations** | email, contactNumber, receiptNumber | Partial (on status, userId) |
| **Poojas** | name, description, category | Partial (on category, status) |
| **Expenses** | description, paidTo, classification, voucherId | Partial (on categoryId, date) |
| **Festivals** | name, description | Partial (on status) |
| **Subscriptions** | transactionId, transactionRef | Partial (on status, userId) |
| **Temple Accounts** | memberName, description, transactionId, classification | Partial (on category, date) |
| **Gallery** | title, description | Partial (on categoryId, isPublished) |

## 10.2 Index Strategy for Search

- **Text search:** Prisma `contains` with `mode: 'insensitive'` (uses PostgreSQL `ILIKE`)
- **Date range:** B-tree index on date columns
- **Status filtering:** Index on status columns
- **Composite queries:** Composite indexes for common filter combinations
- **Future:** PostgreSQL `tsvector` + `tsquery` for full-text search with ranking

## 10.3 Filtering

Each search endpoint accepts:
- `q` — free text query
- `status` — entity status filter
- `dateFrom` / `dateTo` — date range
- `userId` — filter by user
- `category` — filter by category
- `sortBy` / `sortOrder` — ordering

Filters are additive (AND logic).

## 10.4 Ranking

For simple search, ranking is by relevance:
1. Exact match on primary field (name) — highest rank
2. Partial match on primary field
3. Match on secondary fields (email, description)
4. Match on tertiary fields (notes, classification)

For full-text search (future), PostgreSQL `ts_rank` provides built-in ranking.

## 10.5 Pagination

All search results are paginated. Default page size: 20. Maximum: 100. Results include `total` count for UI pagination components.

---

# PART 11 — Dashboard Aggregation

## 11.1 Admin Dashboard

| KPI | Source | Calculation |
|---|---|---|
| Total Users | `users.count()` | `WHERE isDeleted = false` |
| Active Premium Members | `users.count()` | `WHERE membershipTier = 'premium' AND isDeleted = false` |
| Pending Bookings | `pooja_bookings.count()` | `WHERE bookingStatus = 'pending'` |
| Monthly Income | `temple_accounts.sum()` | `WHERE date >= monthStart AND classification IN (income)` |
| Monthly Expenses | `expenses.sum()` | `WHERE date >= monthStart` |
| Pending Donations | `donations.count()` | `WHERE status = 'pending'` |
| Active Poojas | `poojas.count()` | `WHERE status = 'active' AND isArchived = false` |
| Total Volunteers | `volunteer_participation.count(DISTINCT userId)` | Current month |

## 11.2 Member Dashboard

| KPI | Source | Calculation |
|---|---|---|
| Membership Status | User record | `membershipTier`, `subscriptionExpiryDate` |
| Upcoming Bookings | `pooja_bookings` | `WHERE userId = :id AND bookingStatus IN ('approved','confirmed') AND poojaDate >= today` |
| Recent Donations | `donations` | `WHERE userId = :id ORDER BY createdAt DESC LIMIT 5` |
| Active Subscriptions | `subscriptions` | `WHERE userId = :id AND status = 'active'` |
| Volunteer Hours | `volunteer_participation` | `WHERE userId = :id` current year |

## 11.3 Premium Dashboard

Same as Member Dashboard plus:
- Premium-only poojas
- Premium donation history
- Subscription management
- Upgrade/renewal options

## 11.4 Volunteer Dashboard

| KPI | Source | Calculation |
|---|---|---|
| Total Hours (Year) | `volunteer_participation` | Sum hours, current year |
| Events Participated | `volunteer_participation` | Count distinct events |
| Pending Events | `volunteer_participation` | `WHERE status = 'pending'` |
| Completion Rate | `volunteer_participation` | completed / total |

## 11.5 Financial Dashboard

| KPI | Source | Calculation |
|---|---|---|
| Total Income (YTD) | `temple_accounts` | Sum income entries, current year |
| Total Expenses (YTD) | `expenses` | Sum, current year |
| Net Balance | Income − Expenses | Calculated |
| Income by Fund | `temple_accounts` | Group by fund category |
| Expense by Category | `expenses` | Group by category |
| Monthly Trend | Both tables | 12-month rolling |
| Outstanding Payments | `payments` | `WHERE status = 'pending'` |

## 11.6 Account Dashboard

| KPI | Source | Calculation |
|---|---|---|
| Total Accounts | `temple_accounts.count()` | Current period |
| Monthly Revenue | `temple_accounts.sum()` | Current month |
| Revenue by Subscription Type | `temple_accounts` | Group by subscription_type |
| Pending Approvals | `payments + donations` | `WHERE status = 'pending'` |

## 11.7 Analytics Dashboard

| KPI | Source | Calculation |
|---|---|---|
| User Growth | `users` | Monthly registrations |
| Booking Trends | `pooja_bookings` | Monthly booking count |
| Popular Poojas | `pooja_bookings` | Group by poojaId, count, desc |
| Donation Patterns | `donations` | Monthly donation count and total |
| Retention Rate | `subscriptions` | Renewals / expirations |
| Conversion Rate | `pending_subscriptions` | Approved / total |

## 11.8 Caching

Dashboard data is cached with 5-minute TTL. Cache keys:
- `dashboard:admin:{dateRange}`
- `dashboard:member:{userId}`
- `dashboard:financial:{dateRange}`
- `dashboard:analytics:{dateRange}`

Cache is invalidated on any mutation to the underlying entities. Cache warming runs every 30 minutes.

---

# PART 12 — Financial Architecture

## 12.1 Income Flow

```
User pays → Payment recorded → Payment approved →
  → Temple Account entry created (income)
  → Receipt generated
  → User notified
  → Membership activated (if subscription)
```

Income sources:
- Donations (general, special occasion)
- Pooja bookings
- Membership subscriptions
- Other income (manual entry)

## 12.2 Expense Flow

```
Admin records expense → Expense created →
  → Temple Account entry created (expense)
  → Bill file stored
  → Audit logged
```

Expense categories mapped to fund types:
- Annadhanam
- Temple Maintenance
- Goshala
- Veda Pathshala
- General Fund
- Pooja Services
- Other

## 12.3 Ledger Updates

Every monetary transaction creates a TempleAccount entry:

| Event | Entry Type | Amount | Classification |
|---|---|---|---|
| Donation approved | Income | +amount | Donation |
| Booking confirmed | Income | +donationAmount | Pooja Booking |
| Subscription activated | Income | +totalAmount | Subscription |
| Expense recorded | Expense | −amount | Expense category |
| Refund processed | Expense | −amount | Refund |

## 12.4 Monthly Summaries

Generated automatically on the 1st of each month:

```
Monthly Summary for {Month Year}:
  Income:
    Donations: EUR X,XXX.XX
    Bookings: EUR X,XXX.XX
    Subscriptions: EUR X,XXX.XX
    Other: EUR X,XXX.XX
    Total Income: EUR XX,XXX.XX

  Expenses:
    Annadhanam: EUR X,XXX.XX
    Maintenance: EUR X,XXX.XX
    ... (per category)
    Total Expenses: EUR XX,XXX.XX

  Net: EUR XX,XXX.XX
```

## 12.5 Balance Calculation

```
Current Balance = Sum(all income entries) − Sum(all expense entries)
Fund Balance = Sum(income for fund) − Sum(expense for fund)
```

Balance is calculated on-demand and cached for 5 minutes. Not stored as a materialized value (derived from ledger).

## 12.6 Financial Reports

| Report | Period | Contents |
|---|---|---|
| Monthly Statement | 1 month | All income and expenses, net balance |
| Quarterly Report | 3 months | Aggregated by month, by category |
| Annual Report | 1 year | Full year summary, fund-wise breakdown |
| Custom Range | Any | User-selected date range |

All reports exportable as PDF and CSV.

## 12.7 Auditability

Every financial mutation is:
1. Recorded in TempleAccount
2. Logged in AuditLog
3. Linked to source entity (donation ID, booking ID, etc.)
4. Attributed to admin who approved (where applicable)
5. Immutable once created (corrections create new entries, not edits)

---

# PART 13 — Cross-Service Communication

## 13.1 Direct Service Calls

Services call each other through constructor-injected dependencies. The dependency graph is strictly acyclic.

```
BookingService → PoojaService → FestivalService
BookingService → UserService
BookingService → TempleAccountService
BookingService → PDFService
BookingService → EmailService
BookingService → AuditService
```

## 13.2 Shared Services

Infrastructure services are shared across all domain services:

| Shared Service | Consumers |
|---|---|
| AuditService | All domain services |
| CacheService | All domain services |
| LoggerService | All services |
| EmailService | NotificationService, AuthService |
| StorageService | GalleryService, ExpenseService, PDFService, AIService |
| PDFService | DonationService, BookingService, SubscriptionService, PaymentService, ReportService |

## 13.3 Event System

Loosely coupled cross-domain reactions use an in-process event emitter:

```
EventEmitter → SubscriptionService emits 'subscription.activated'
                → MembershipService listens, updates user
                → NotificationService listens, sends email
                → TempleAccountService listens, creates entry
```

Events are synchronous initially. For horizontal scaling, events will be routed through a message queue (Redis Streams, RabbitMQ, or similar).

## 13.4 Avoiding Circular Dependencies

Circular dependencies are prevented by the layered architecture:
- Services never depend on controllers
- Repositories never depend on services
- Shared infrastructure never depends on domain services
- If Service A needs Service B and Service B needs Service A, extract the shared logic into a new Service C that both depend on

Example: If BookingService needs UserService and UserService needs BookingService (for stats), the dependency is broken by extracting UserStatsService.

## 13.5 Complete Dependency Graph

```
Controllers
  ├── AuthService
  │     ├── UserRepository
  │     ├── EmailService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── UserService
  │     ├── UserRepository
  │     ├── PreferenceRepository
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── BookingService
  │     ├── BookingRepository
  │     ├── PoojaService
  │     ├── UserService
  │     ├── TempleAccountService
  │     ├── PDFService (shared)
  │     ├── EmailService (shared)
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── MembershipService
  │     ├── UserRepository
  │     ├── SubscriptionService
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── SubscriptionService
  │     ├── SubscriptionRepository
  │     ├── PendingSubscriptionRepository
  │     ├── UserRepository
  │     ├── MembershipService
  │     ├── PaymentService
  │     ├── EmailService (shared)
  │     ├── PDFService (shared)
  │     ├── TempleAccountService
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── PaymentService
  │     ├── PaymentRepository
  │     ├── PaymentAccountRepository
  │     ├── UserRepository
  │     ├── EmailService (shared)
  │     ├── PDFService (shared)
  │     ├── TempleAccountService
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── DonationService
  │     ├── DonationRepository
  │     ├── UserRepository
  │     ├── TempleAccountService
  │     ├── PDFService (shared)
  │     ├── EmailService (shared)
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── TempleAccountService
  │     ├── TempleAccountRepository
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── ExpenseService
  │     ├── ExpenseRepository
  │     ├── ExpenseCategoryRepository
  │     ├── TempleAccountService
  │     ├── StorageService (shared)
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── GalleryService
  │     ├── GalleryRepository
  │     ├── PhotoCategoryRepository
  │     ├── StorageService (shared)
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── FestivalService
  │     ├── FestivalRepository
  │     ├── StorageService (shared)
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── PoojaService
  │     ├── PoojaRepository
  │     ├── FestivalService
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── VolunteerService
  │     ├── VolunteerRepository
  │     ├── UserRepository
  │     ├── AuditService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── ReportService
  │     ├── TempleAccountService
  │     ├── DonationService
  │     ├── BookingService
  │     ├── MembershipService
  │     ├── VolunteerService
  │     ├── PDFService (shared)
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── SearchService
  │     ├── All Repositories (read-only)
  │     └── LoggerService (shared)
  ├── DashboardService
  │     ├── TempleAccountService
  │     ├── DonationService
  │     ├── BookingService
  │     ├── MembershipService
  │     ├── PaymentService
  │     ├── ExpenseService
  │     ├── VolunteerService
  │     ├── CacheService (shared)
  │     └── LoggerService (shared)
  ├── AIService
  │     ├── AI Repository
  │     ├── StorageService (shared)
  │     └── LoggerService (shared)
  └── SettingsService
        ├── PaymentAccountRepository
        ├── PageAccessRepository
        ├── PremiumUpgradeRequestRepository
        ├── AuditService (shared)
        ├── CacheService (shared)
        └── LoggerService (shared)
```

---

# PART 14 — Logging Architecture

## 14.1 Log Levels

| Level | Usage | Example |
|---|---|---|
| `debug` | Development troubleshooting | SQL query, cache hit/miss, request body |
| `info` | Normal operations | Request completed, email sent, cron job started |
| `warn` | Recoverable issues | Slow query, retry attempt, deprecated usage |
| `error` | Failures requiring attention | Database error, email provider down, validation failed |
| `fatal` | System-threatening | Database unreachable, out of memory, unhandled exception |

## 14.2 Log Types

| Type | Purpose | Destination |
|---|---|---|
| **Application Log** | General application events | stdout / file |
| **Audit Log** | Entity mutations, admin actions | `audit_logs` table |
| **Security Log** | Auth events, permission denials, rate limiting | `security_logs` table / file |
| **Performance Log** | Slow queries, high latency, memory spikes | stdout / file |
| **Database Log** | Query timing, connection pool status | stdout |
| **Error Log** | Unhandled errors, stack traces | stderr / file |

## 14.3 Correlation IDs

Every request receives a unique correlation ID (UUID) generated at the controller layer. This ID propagates through:
- All log entries for the request
- Service method calls
- Background job execution
- Email sending
- Database query logging

Format: `req-{uuid}` for HTTP requests, `job-{uuid}` for background jobs.

## 14.4 Structured Logging

All logs are JSON-structured:

```
{
  "timestamp": "2026-07-11T15:30:00.000Z",
  "level": "info",
  "message": "Booking approved",
  "correlationId": "req-a1b2c3d4-e5f6",
  "service": "BookingService",
  "method": "approve",
  "context": {
    "bookingId": "...",
    "poojaName": "Abhishekam",
    "amount": 51.00,
    "adminId": "..."
  }
}
```

## 14.5 Request-Scoped Context

The LoggerService creates a child logger per request that includes the correlation ID, user ID (if authenticated), and request metadata. This child logger is passed through all service calls for the request.

## 14.6 Retention

| Log Type | Retention | Storage |
|---|---|---|
| Application logs | 30 days | File (compressed daily) |
| Audit logs | 365 days | Database table |
| Security logs | 90 days | File + database |
| Performance logs | 14 days | File |
| Error logs | 90 days | File |

---

# PART 15 — Caching Strategy

## 15.1 Cache Layers

| Layer | Technology | TTL | Usage |
|---|---|---|---|
| **In-Memory** | `Map` (node-cache or similar) | Configurable | All cached data initially |
| **Redis** (future) | Redis | Configurable | Distributed cache for horizontal scaling |

The CacheService interface is the same regardless of backend. Swap by changing the implementation.

## 15.2 What Gets Cached

| Data | Cache Key Pattern | TTL | Invalidation Trigger |
|---|---|---|---|
| Active poojas | `poojas:active` | 30 min | `pooja.updated`, `pooja.archived` |
| Payment accounts | `settings:payment_accounts` | 1 hour | `settings.payment_account_updated` |
| Active festivals | `festivals:active` | 1 hour | `festival.updated`, `festival.archived` |
| Photo categories | `gallery:categories` | 1 hour | `gallery.category_created`, `gallery.category_updated` |
| Expense categories | `expense:categories` | 1 hour | `expense.category_created` |
| Dashboard data | `dashboard:{type}:{params}` | 5 min | Any mutation to underlying entities |
| User profile | `user:{id}` | 10 min | `user.profile_updated` |
| Subscription status | `subscription:{userId}` | 5 min | `subscription.*` |
| Search results | `search:{hash}` | 2 min | Any mutation to searchable entities |
| System settings | `settings:system` | 1 hour | `settings.updated` |

## 15.3 Invalidation Strategy

| Strategy | When | How |
|---|---|---|
| **Time-based expiry** | All cache entries | TTL-based automatic expiry |
| **Event-based invalidation** | On entity mutation | Service emits event → CacheService deletes key |
| **Pattern-based invalidation** | Bulk mutations | `cache.invalidatePattern('poojas:*')` |
| **Manual flush** | Admin action | `cache.flush()` |

## 15.4 Consistency

The caching strategy prioritizes availability over strong consistency. Dashboard data may be up to 5 minutes stale. This is acceptable for a temple management system where real-time accuracy is not critical.

For operations requiring fresh data (e.g., checking pooja availability before booking), the service bypasses cache and reads directly from the database.

## 15.5 Cache-Aside Pattern

```
Service.getCachedData(key):
  cached = cache.get(key)
  if cached: return cached

  fresh = repository.find()
  cache.set(key, fresh, ttl)
  return fresh
```

On mutation:
```
Service.mutateData(key, data):
  repository.update(data)
  cache.delete(key)  // or cache.set(key, newData, ttl)
```

---

# PART 16 — Configuration Architecture

## 16.1 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing secret |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `PORT` | No | `3001` | API server port |
| `CORS_ORIGIN` | No | `*` | Allowed origins (tighten in production) |
| `SMTP_HOST` | Yes | — | Email server host |
| `SMTP_PORT` | No | `587` | Email server port |
| `SMTP_USER` | Yes | — | Email username |
| `SMTP_PASS` | Yes | — | Email password |
| `SMTP_FROM` | Yes | — | Sender email address |
| `STORAGE_PATH` | No | `./uploads` | Local file storage root |
| `MAX_FILE_SIZE` | No | `20971520` | Max upload size (20MB) |
| `GOOGLE_OAUTH_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | No | — | Google OAuth callback URL |
| `NODE_ENV` | No | `development` | Environment mode |
| `LOG_LEVEL` | No | `info` | Minimum log level |
| `BACKUP_PATH` | No | `./backups` | Database backup directory |

## 16.2 Secrets Management

All secrets are stored in environment variables. No secrets in code or config files.

For development: `.env` file (gitignored).
For production: platform environment variables or secrets manager.

## 16.3 Feature Flags

| Flag | Default | Purpose |
|---|---|---|
| `FEATURE_OAUTH_ENABLED` | `true` | Enable Google OAuth login |
| `FEATURE_AI_CHAT_ENABLED` | `true` | Enable AI chat feature |
| `FEATURE_PUSH_NOTIFICATIONS` | `false` | Enable browser push (future) |
| `FEATURE_SMS_ENABLED` | `false` | Enable SMS notifications (future) |
| `FEATURE_REDIS_CACHE` | `false` | Use Redis instead of in-memory |
| `FEATURE_S3_STORAGE` | `false` | Use S3 instead of local storage |

## 16.4 Regional Settings

| Setting | Value | Source |
|---|---|---|
| Primary Currency | EUR | Config constant |
| Secondary Currency | USD | Config constant (display only) |
| Timezone | `Europe/Berlin` | Config constant |
| Date Format | `DD.MM.YYYY` | Config constant |
| Time Format | `24h` | Config constant |
| Default Language | `en` | Config constant |
| Available Languages | `en`, `de`, `ta` | Config constant |
| Decimal Separator | `,` (German convention) | Config constant |
| Thousands Separator | `.` (German convention) | Config constant |

## 16.5 Localization

Translation files are in the frontend (`apps/web/src/i18n/locales/`). The API does not serve translations directly but sends localized emails using template files.

Email templates support `en`, `de`, `ta` with `en` as fallback.

---

# PART 17 — Scalability Strategy

## 17.1 Horizontal Scaling

The API is stateless. All session state is in JWT tokens or the database. This allows horizontal scaling by adding more API instances behind a load balancer.

Session requirements:
- JWT access token (short-lived, in memory on client)
- JWT refresh token (long-lived, httpOnly cookie)
- No server-side sessions
- No in-memory state that must be shared

## 17.2 Stateless Services

Services do not hold request-scoped state between calls. All context is passed as parameters. This means any service instance can handle any request.

## 17.3 Connection Pooling

Prisma manages a connection pool to PostgreSQL. Configuration:
- `connection_limit` in `DATABASE_URL` query parameter
- Default: 10 connections
- For production: scale with CPU cores (typically `2 * CPU cores + 1`)

For horizontal scaling, consider PgBouncer in front of PostgreSQL for connection pooling.

## 17.4 Large Dataset Handling

| Strategy | When | How |
|---|---|---|
| Pagination | All list endpoints | Cursor-based or offset pagination |
| Streaming | Bulk exports | Stream results instead of loading all |
| Batch processing | Bulk imports | Process in batches of 1000 |
| Lazy loading | Related entities | Load relations on demand, not eagerly |
| Materialized views | Dashboard aggregates | Pre-computed views refreshed periodically |

## 17.5 Future Microservice Readiness

The service layer architecture naturally maps to microservice boundaries:

| Current Service | Future Microservice | Justification |
|---|---|---|
| AuthService | Auth Service | Independent scaling, security boundary |
| BookingService | Booking Service | High write volume during events |
| PaymentService | Payment Service | PCI compliance boundary |
| NotificationService | Notification Service | Independent scaling, provider abstraction |
| AIService | AI Service | Resource-intensive, independent scaling |

Services communicate through events, which naturally map to message queue topics.

## 17.6 Queue Readiness

The event system is designed for queue migration:
1. **Now:** In-process EventEmitter (synchronous)
2. **Later:** Redis Streams (lightweight queue)
3. **Future:** RabbitMQ or SQS (enterprise queue)

The transition requires changing only the EventDispatcher implementation, not the emitting or subscribing code.

## 17.7 Cloud Storage Readiness

The StorageService abstraction supports:
1. **Now:** Local filesystem
2. **Later:** AWS S3 / DigitalOcean Spaces
3. **Future:** CDN-backed storage

The transition requires changing only the StorageService implementation and URL generation logic.

---

# PART 18 — Migration Mapping

## 18.1 PocketBase Hooks → Express Services

| PB Hook | Current Logic | New Location | Keep/Redesign/Remove |
|---|---|---|---|
| `users-set-default-account-type.pb.js` | Set `account_type = "Free Member"` on create | User schema `@default(free_member)` | **Remove** — handled by Prisma default |
| `set-default-approval-status.pb.js` | Set `approval_status = "pending_approval"` when premium | MembershipService on subscription request | **Redesign** — move to service |
| `subscriptions-auto-dates.pb.js` | Auto-set `start_date = today`, `end_date = today+30d` | SubscriptionService.create() | **Redesign** — service method |
| `subscription-approval-auto-update.pb.js` | On status → active: update user membership | MembershipService.activate() | **Redesign** — explicit service call |
| `subscription-auto-update-membership.pb.js` | On status → active/approved: update user fields | MembershipService.activate() | **Redesign** — merge with above |
| `subscription-approved.pb.js` | Send approval email | NotificationService.send() | **Redesign** — async notification |
| `subscription-rejected.pb.js` | Send rejection email | NotificationService.send() | **Redesign** — async notification |
| `subscription-created.pb.js` | Send welcome email | NotificationService.send() | **Redesign** — async notification |
| `subscription-receipt-generation.pb.js` | Generate receipt PDF | PDFService.generateSubscriptionReceipt() | **Redesign** — service method |
| `subscription-payment-completed.pb.js` | Create temple_accounts entry | TempleAccountService.createEntry() | **Redesign** — transactional |
| `subscription-expiry-reminder.pb.js` | Send email 7 days before expiry | CronService (daily job) | **Redesign** — cron job |
| `payments-auto-upgrade-to-premium.pb.js` | On payment approved: create subscription, update user | PaymentService.approve() → SubscriptionService.create() | **Redesign** — service orchestration |
| `populate_pooja_name.pb.js` | Auto-populate `pooja_name` from pooja | BookingService.create() | **Redesign** — service method |
| `pooja-booking-approval.pb.js` | Generate receipt, send email | BookingService.approve() | **Redesign** — service orchestration |
| `pooja-booking-temple-accounts.pb.js` | Create temple_accounts entry | BookingService.approve() | **Redesign** — transactional |
| `donation-temple-accounts.pb.js` | Create temple_accounts entry | DonationService.approve() | **Redesign** — transactional |
| `autoArchivePoojas.js` | Hourly archive past poojas | CronService (hourly job) | **Keep** — logic unchanged |

## 18.2 Logic to Keep (Unchanged)

- Pooja auto-archiving (cron job, same logic)
- Default account type on user creation (Prisma `@default`)
- Receipt numbering format (same algorithm)
- Fund breakdown calculation (same math)
- Monthly summary generation (same aggregation)

## 18.3 Logic to Redesign

All hook-based business logic must be redesigned as explicit service methods. The key difference:
- **Hooks:** Implicit, triggered automatically, no caller control, no error handling to caller
- **Services:** Explicit, called by controller, caller handles errors, transactional

This is the largest category. Every hook becomes a service method or service orchestration.

## 18.4 Logic to Remove

- Duplicate field defaults (covered by Prisma schema)
- PB-specific collection rules (replaced by service-level authorization)
- PB filter string injection (replaced by Prisma type-safe queries)
- Diagnostic hooks (debug hooks, `system-diagnostic-full`, etc.)
- Unused hooks (hooks for deleted collections: `transactions`, `payment_records`)

## 18.5 Logic to Simplify

- **Authentication:** PB auth → standard JWT with refresh tokens (simpler, more standard)
- **File uploads:** PB file handling → StorageService (cleaner abstraction)
- **Real-time subscriptions:** PB SSE → REST polling initially, WebSocket later if needed
- **CORS:** PB's `*` → configurable, restricted origins
- **Error handling:** PB's inconsistent error responses → standardized error classes

---

# PART 19 — Service Dependency Diagram

## 19.1 Complete Hierarchy

```
                    ┌─────────────────────────────┐
                    │        CONTROLLERS           │
                    │  (HTTP parsing, validation)  │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │         SERVICES             │
                    │  (Business logic, Tx owner)  │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
    ┌─────────▼────────┐ ┌────────▼────────┐ ┌─────────▼────────┐
    │   REPOSITORIES    │ │ SHARED SERVICES │ │  EVENT SYSTEM    │
    │  (Data access)    │ │ (Infra support) │ │  (Cross-domain)  │
    └─────────┬────────┘ └────────┬────────┘ └──────────────────┘
              │                    │
    ┌─────────▼────────┐ ┌────────▼────────────────────────┐
    │     PRISMA       │ │  EmailService   StorageService   │
    │  (ORM layer)     │ │  PDFService     CacheService     │
    └─────────┬────────┘ │  AuditService   LoggerService    │
              │          └─────────────────────────────────┘
    ┌─────────▼────────┐
    │   POSTGRESQL     │
    │  (Database)      │
    └──────────────────┘
```

## 19.2 Shared Service Dependency Map

```
LoggerService ← (used by ALL services)
CacheService  ← (used by ALL domain services)
AuditService  ← (used by ALL domain services)
EmailService  ← AuthService, NotificationService, BookingService,
                 SubscriptionService, DonationService, PaymentService
StorageService ← GalleryService, ExpenseService, PDFService, AIService
PDFService    ← DonationService, BookingService, SubscriptionService,
                 PaymentService, ReportService
```

## 19.3 Circular Dependency Check

No circular dependencies exist in the dependency graph. Verified by tracing:
- Shared services have zero domain service dependencies
- Repositories have zero service dependencies
- Domain services depend only on lower layers and shared services
- If `ServiceA → ServiceB` and `ServiceB → ServiceA`, the shared logic is extracted to `ServiceC`

---

# PART 20 — Master Backend Checklist

## 20.1 Single Responsibility

- [ ] Every service has one clear purpose
- [ ] No service handles HTTP concerns
- [ ] No repository contains business logic
- [ ] No controller contains database queries
- [ ] Shared services are infrastructure-only
- [ ] Each entity has exactly one repository

## 20.2 Transaction Safety

- [ ] All multi-entity mutations wrapped in `$transaction`
- [ ] Transaction boundaries defined at service level
- [ ] Repositories accept optional `tx` parameter
- [ ] Side effects (email, PDF, file) queued outside transaction
- [ ] Compensating actions defined for partial failures
- [ ] No nested `$transaction` calls (use interactive transactions)
- [ ] Rollback tested for every transactional service method

## 20.3 Logging

- [ ] All service methods log entry and exit at debug level
- [ ] All errors logged with full context at error level
- [ ] Correlation ID propagated through all layers
- [ ] Structured JSON logging throughout
- [ ] Request-scoped child loggers used
- [ ] Sensitive data (passwords, tokens) never logged
- [ ] Performance logging for slow operations (>500ms)

## 20.4 Auditing

- [ ] All entity creates logged in AuditLog
- [ ] All entity updates logged with old/new values
- [ ] All entity deletes logged with reason
- [ ] All admin actions attributed to admin ID
- [ ] All financial mutations logged
- [ ] Audit entries immutable
- [ ] Audit cleanup runs on schedule

## 20.5 Validation

- [ ] All controller inputs validated with Zod schemas
- [ ] All service inputs validated for business rules
- [ ] State transition validation on all status changes
- [ ] Referential integrity checked before operations
- [ ] Amount precision validated (no floating point)
- [ ] Date range validation (start < end)
- [ ] Duplicate prevention checked where applicable

## 20.6 Security

- [ ] JWT tokens signed with strong secrets
- [ ] Refresh tokens rotated on use
- [ ] Passwords hashed with bcrypt (min 12 rounds)
- [ ] Rate limiting on auth endpoints
- [ ] Rate limiting on API endpoints
- [ ] CORS restricted to known origins
- [ ] File upload type validation
- [ ] File upload size limits enforced
- [ ] SQL injection impossible (Prisma parameterized queries)
- [ ] No secrets in code or logs
- [ ] Admin-only endpoints verified in service layer
- [ ] User can only access own data (verified in service layer)

## 20.7 Performance

- [ ] Pagination on all list endpoints
- [ ] Database indexes on all filter/sort columns
- [ ] N+1 prevention (eager loading or batching)
- [ ] Connection pooling configured
- [ ] Response compression enabled
- [ ] Large file streaming (not buffering)
- [ ] Bulk operations use `createMany`/`updateMany`
- [ ] Dashboard queries cached (5-min TTL)
- [ ] Reference data cached (1-hour TTL)

## 20.8 Caching

- [ ] CacheService implemented with in-memory backend
- [ ] Cache keys are deterministic and namespaced
- [ ] TTL set on all cache entries
- [ ] Invalidation on entity mutation
- [ ] Pattern-based invalidation for bulk changes
- [ ] Cache bypass available for fresh-data requirements
- [ ] Cache warming runs on schedule
- [ ] Redis-ready interface for future scaling

## 20.9 Testing Readiness

- [ ] All services accept dependencies via constructor (testable with mocks)
- [ ] No global state in services
- [ ] Repository methods return consistent shapes
- [ ] Error types are specific (not generic Error)
- [ ] Service methods are pure functions where possible
- [ ] Transaction boundaries are clear (testable with mock tx)

## 20.10 Documentation

- [ ] Every service has JSDoc with purpose, params, returns, throws
- [ ] Every public method documented
- [ ] Business rules documented alongside service methods
- [ ] Error codes and messages documented
- [ ] API contract documented (OpenAPI/Swagger)
- [ ] Architecture decisions recorded
- [ ] Migration guide from PB hooks documented

## 20.11 Dependency Rules

- [ ] No circular dependencies
- [ ] Controllers only depend on services
- [ ] Services only depend on repositories and shared services
- [ ] Repositories only depend on Prisma
- [ ] Shared services have zero domain dependencies
- [ ] All dependencies injected via constructor
- [ ] No service instantiates its own dependencies

## 20.12 Failure Recovery

- [ ] All external calls wrapped in try/catch
- [ ] Retries with exponential backoff on transient failures
- [ ] Dead letter queue for permanently failed tasks
- [ ] Health check endpoint returns dependency status
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] Connection cleanup on shutdown
- [ ] Background jobs paused during shutdown
- [ ] Crash recovery: unfinished jobs picked up on restart

---

## Appendix: Service Method Quick Reference

| Service | Method Count | Transactional Methods |
|---|---|---|
| AuthService | 8 | 2 (register, completePasswordReset) |
| UserService | 10 | 3 (block, softDelete, restore) |
| MembershipService | 6 | 3 (upgrade, downgrade, sync) |
| SubscriptionService | 11 | 4 (create, approve, reject, renew) |
| PaymentService | 11 | 3 (create, approve, reject) |
| DonationService | 9 | 2 (create, approve) |
| TempleAccountService | 8 | 2 (createEntry, correctEntry) |
| ExpenseService | 9 | 1 (create) |
| BookingService | 13 | 4 (create, approve, confirm, complete) |
| PoojaService | 9 | 2 (create, archive) |
| FestivalService | 6 | 1 (create) |
| GalleryService | 11 | 2 (create, delete) |
| VolunteerService | 8 | 1 (create) |
| NotificationService | 6 | 0 (all async) |
| EmailService | 4 | 0 (all async) |
| PDFService | 6 | 0 (side-effect only) |
| StorageService | 7 | 0 (filesystem ops) |
| AuditService | 5 | 0 (write-only) |
| SettingsService | 8 | 2 (grantPageAccess, processUpgrade) |
| ReportService | 7 | 0 (read-only) |
| SearchService | 6 | 0 (read-only) |
| DashboardService | 5 | 0 (read-only, cached) |
| AIService | 3 | 0 (side-effect only) |
| CronService | 4 | 0 (job management) |
| BackgroundJobService | 4 | 0 (queue management) |
| CacheService | 6 | 0 (cache ops) |
| LoggerService | 7 | 0 (logging only) |

**Total: 27 services, 195 public methods, 27 transactional methods**

---

*This document is the complete Backend Service Architecture Blueprint. It is the authoritative reference for all backend implementation work. Every service, method, transaction, job, and architectural decision is defined here before any code is written.*
