# API Architecture Blueprint

> **Sri Siththi Vinayagar Temple**
> Principal Backend Architect Design Document
> Version 1.0 — July 2026

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Domain Organization](#2-domain-organization)
3. [Endpoint Inventory](#3-endpoint-inventory)
4. [Authentication Architecture](#4-authentication-architecture)
5. [Authorization Architecture](#5-authorization-architecture)
6. [Validation Strategy](#6-validation-strategy)
7. [File Upload Architecture](#7-file-upload-architecture)
8. [Error Handling](#8-error-handling)
9. [Business Workflows](#9-business-workflows)
10. [Performance Strategy](#10-performance-strategy)
11. [Security Strategy](#11-security-strategy)
12. [Integration Architecture](#12-integration-architecture)
13. [API Documentation Standards](#13-api-documentation-standards)
14. [Migration Strategy](#14-migration-strategy)
15. [API Consistency Checklist](#15-api-consistency-checklist)

---

## 1. API Design Principles

### REST Standards

The API follows Richardson Maturity Level 2: resources are identified by nouns, HTTP verbs indicate operations, and responses use appropriate status codes. Hypermedia links (HATEOAS) are not required for this application scale.

### Resource Naming

- **Plural nouns** for collections: `/api/users`, `/api/donations`, `/api/poojas`
- **Singular nouns** for actions that do not map to a resource: `/api/auth/login`, `/api/auth/logout`
- **Nested resources** for clear ownership: `/api/bookings/:id/messages`, `/api/bookings/:id/receipt`
- **Kebab-case** for multi-word resources: `/api/pooja-bookings`, `/api/photo-categories`, `/api/expense-categories`
- **No verbs in URLs** except for action endpoints: `/api/donations/:id/approve` (not `/api/approveDonation`)

### HTTP Methods

| Method | Purpose | Idempotent | Safe | Request Body | Response |
|--------|---------|------------|------|--------------|----------|
| `GET` | Retrieve resource(s) | Yes | Yes | No | 200 + data |
| `POST` | Create resource or trigger action | No | No | Yes | 201 + data |
| `PUT` | Full replacement of resource | Yes | No | Yes | 200 + data |
| `PATCH` | Partial update of resource | Yes | No | Yes | 200 + data |
| `DELETE` | Remove resource | Yes | No | No | 204 or 200 + message |

### Status Codes

| Code | When to Use |
|------|-------------|
| `200` | Successful GET, PUT, PATCH, DELETE with response body |
| `201` | Successful POST that creates a resource |
| `204` | Successful DELETE with no response body |
| `400` | Validation error, malformed request, missing required fields |
| `401` | Missing or invalid authentication token |
| `403` | Authenticated but not authorized for this action |
| `404` | Resource not found |
| `409` | Conflict — duplicate resource, business rule violation |
| `413` | File too large |
| `415` | Unsupported media type (file upload) |
| `422` | Semantic validation error (valid syntax, invalid business logic) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Service temporarily unavailable |

### Versioning Strategy

- **URI versioning**: All endpoints prefixed with `/api/`
- **No explicit version number** in initial release (v1 implied)
- **Breaking changes** require a new prefix: `/api/v2/...`
- **Additive changes** (new fields, new endpoints) do not require versioning
- **Deprecation notice**: 6 months before removing any endpoint, add `Sunset` and `Deprecation` headers

### Success Response Format

All successful responses follow a consistent envelope:

**Single resource:**
```
{
  "success": true,
  "data": { ...resource object... }
}
```

**Collection:**
```
{
  "success": true,
  "data": [ ...array of resources... ],
  "pagination": {
    "page": 1,
    "perPage": 25,
    "totalItems": 142,
    "totalPages": 6
  }
}
```

**Action response (approve, reject, send):**
```
{
  "success": true,
  "message": "Donation approved successfully",
  "data": { ...updated resource or relevant IDs... }
}
```

**File download:**
```
Content-Type: application/pdf (or appropriate MIME)
Content-Disposition: attachment; filename="receipt-123.pdf"
Binary body
```

### Error Response Format

All error responses follow a consistent structure:

```
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of what went wrong",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "value": "not-an-email"
      }
    ]
  },
  "correlationId": "req_abc123def456"
}
```

**Error codes** are SCREAMING_SNAKE_CASE, machine-readable, and stable across versions. They are never HTTP status text — they are application-specific business codes.

### Pagination Standard

**Offset-based pagination** (simple, predictable, sufficient for this scale):

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | Page number (1-indexed) |
| `perPage` | integer | 25 | 100 | Items per page |

**Cursor-based pagination** is reserved for future use if datasets exceed 10,000 records (currently no collection approaches this).

### Sorting Standard

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort` | string | `-created` | Comma-separated field names. Prefix `-` for descending. |

Examples: `sort=-created`, `sort=amount,-date`, `sort=name`

### Filtering Standard

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | string | Field-level filters using operators |

**Filter syntax** (replacing PocketBase filter language):

| Operator | Syntax | Example |
|----------|--------|---------|
| Equals | `field=value` | `status=pending` |
| Not equals | `field!=value` | `status!=approved` |
| Greater than | `field>value` | `amount>100` |
| Less than | `field<value` | `amount<50` |
| In list | `field=value1,value2` | `status=pending,approved` |
| Contains | `field=*value` | `name=*Vinayagar` |
| Is null | `field=null` | `receipt_id=null` |
| AND | `filter=...&filter=...` | `status=pending&amount>50` |

### Search Standard

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search across indexed fields |

Search is implemented per-resource with defined searchable fields. The `search` parameter triggers a `ILIKE` query across those fields. Minimum 2 characters required.

### Field Selection

| Parameter | Type | Description |
|-----------|------|-------------|
| `fields` | string | Comma-separated list of fields to include in response |

Example: `fields=id,name,email` — reduces payload size for list endpoints.

### Idempotency

- **POST** endpoints that create resources accept an optional `Idempotency-Key` header
- The server stores the key with the response for 24 hours
- If a duplicate request arrives with the same key, the stored response is returned without re-executing the business logic
- **PUT** and **DELETE** are inherently idempotent
- **PATCH** is idempotent when the patch operation is idempotent (setting a field to a value), but not when it is not (incrementing a counter)

---

## 2. Domain Organization

The API is organized into 19 domains, each owned by a single service. Domains communicate through service interfaces — never through direct route-to-route calls.

### Domain 1: Authentication

**Purpose:** Manages identity lifecycle — registration, login, token management, password operations, email verification, and session invalidation.

**Responsibilities:**
- User registration with email verification
- Credential-based login (email + password)
- OAuth login (Google)
- JWT token issuance (access + refresh)
- Token refresh with rotation
- Password reset flow
- Email verification
- Logout (token revocation)

**Ownership:** `AuthService` — owns `users` auth columns, `refresh_tokens`, `password_reset_tokens`, `email_verification_tokens`

**Dependencies:** EmailService (verification emails, password reset emails), AuditService (login/logout logging)

---

### Domain 2: Users

**Purpose:** Manages user profiles, personal data, preferences, and search.

**Responsibilities:**
- User profile CRUD
- Avatar upload and management
- User search and pagination
- Language preference sync
- Font size preference
- Soft-delete and block/unblock

**Ownership:** `UserService` — owns `users` profile columns, `user_preferences`

**Dependencies:** StorageService (avatar uploads), MembershipService (reads membership tier for display)

---

### Domain 3: Membership

**Purpose:** Manages the membership tier system, account types, page access permissions, and user-account assignments.

**Responsibilities:**
- Account type CRUD (Free, Premium, Admin)
- Page access matrix management
- User-account assignment operations
- Default account type assignment on user creation
- Premium access detection

**Ownership:** `MembershipService` — owns `account_types`, `user_account_assignments`, `page_access`, `pages`

**Dependencies:** SubscriptionService (reads subscription status to determine premium access)

---

### Domain 4: Subscriptions

**Purpose:** Manages the subscription lifecycle — creation, approval workflow, billing cycles, renewal tracking, and expiry.

**Responsibilities:**
- Subscription CRUD with validation
- State machine management: `pending` → `active` → `expired`
- Pending subscription management
- On approval: upgrade user membership, create ledger entry, generate receipt, send email
- On rejection: send rejection email
- On expiry: auto-downgrade, send notification
- Renewal workflow and reminders

**Ownership:** `SubscriptionService` — owns `subscriptions`, `pending_subscriptions`, `subscription_reminders`, `approval_logs`

**Dependencies:** MembershipService (tier changes), PaymentService (payment recording), NotificationService (lifecycle emails), TempleAccountsService (ledger entries)

---

### Domain 5: Payments

**Purpose:** Records and manages financial payment transactions for membership-related activities.

**Responsibilities:**
- Payment record CRUD
- Approval workflow (pending → approved/rejected)
- On approval: notify SubscriptionService, send receipt email
- Receipt generation and storage
- Payment history queries

**Ownership:** `PaymentService` — owns `payments`, `receipts`

**Dependencies:** SubscriptionService (approval triggers subscription activation), EmailService (receipt delivery), StorageService (PDF storage)

---

### Domain 6: Donations

**Purpose:** Manages temple donations — creation, categorization, approval workflow, receipt generation, and financial reporting.

**Responsibilities:**
- Donation CRUD with category validation
- Approval workflow (pending → approved/rejected)
- On creation: send confirmation email
- On approval: generate receipt, create ledger entry, send receipt email
- Resend receipt functionality
- Soft-delete with ledger balance adjustment
- Donation statistics and reporting

**Ownership:** `DonationService` — owns `donations`, `accounts_ledger`

**Dependencies:** TempleAccountsService (ledger entries), EmailService (receipts), StorageService (PDF storage)

---

### Domain 7: Pooja Booking

**Purpose:** Manages the pooja offerings catalog and booking workflow.

**Responsibilities:**
- Pooja catalog CRUD (admin)
- Pooja availability checking
- Booking creation with validation
- Booking approval workflow
- On creation: send confirmation email, auto-populate pooja name
- On approval: generate receipt, send approval email, create ledger entry
- Auto-archive expired poojas (cron)
- Resend receipt functionality

**Ownership:** `BookingService` — owns `poojas`, `pooja_bookings`, `pooja_archive`

**Dependencies:** BankConfigService (payment details), DonationService (financial aspects), NotificationService (emails), TempleAccountsService (ledger)

---

### Domain 8: Gallery

**Purpose:** Manages the photo/video gallery — media uploads, categorization, publishing, and archival.

**Responsibilities:**
- Gallery CRUD with file upload
- Category CRUD (photo_categories)
- Publish/archive toggle
- Image compression
- Order management
- Storage size tracking

**Ownership:** `GalleryService` — owns `gallery`, `photo_categories`

**Dependencies:** StorageService (file uploads)

---

### Domain 9: Festivals

**Purpose:** Manages Hindu festival events — creation, scheduling, image management, and display.

**Responsibilities:**
- Festival CRUD with image upload
- Soft-delete pattern
- Active/upcoming filtering

**Ownership:** `FestivalService` — owns `festivals`

**Dependencies:** StorageService (image uploads)

---

### Domain 10: Notifications

**Purpose:** Manages in-app notification delivery and user notification preferences.

**Responsibilities:**
- Notification CRUD
- Mark as read / mark all read
- User notification preferences
- Notification count (unread)
- Bulk creation (when other domains need to notify users)

**Ownership:** `NotificationService` — owns `notifications`, `user_preferences` (notification-related fields)

**Dependencies:** None (consumed by all domains)

---

### Domain 11: Messages

**Purpose:** Manages two messaging systems — admin-to-user general messages and booking-specific threaded messages.

**Responsibilities:**
- Admin messages CRUD
- Booking messages CRUD (threaded by booking_id)
- Read status tracking
- Trigger email notification on new message

**Ownership:** `MessageService` — owns `admin_messages`, `booking_messages`

**Dependencies:** NotificationService, EmailService

---

### Domain 12: Temple Accounts

**Purpose:** Manages the financial ledger — monthly income/expense summaries by category.

**Responsibilities:**
- Ledger entry creation (upsert pattern)
- Category-specific amounts tracking
- Monthly aggregation queries
- Annual summary queries
- P&L report data assembly
- Balance adjustment on soft-delete

**Ownership:** `TempleAccountsService` — owns `temple_accounts`

**Dependencies:** DonationService, BookingService, SubscriptionService, ExpenseService (all write entries)

---

### Domain 13: Expenses

**Purpose:** Manages temple expense tracking — creation, categorization, voucher generation, and bill attachment.

**Responsibilities:**
- Expense CRUD with file upload
- Category and classification management
- Voucher generation
- Bill file attachment handling
- PDF voucher generation
- Email delivery with bill + voucher attachments

**Ownership:** `ExpenseService` — owns `expenses`, `expense_categories`, `vouchers`, `classifications`

**Dependencies:** StorageService (file uploads), EmailService (delivery), TempleAccountsService (ledger integration)

---

### Domain 14: Reports

**Purpose:** Generates and delivers financial reports — monthly P&L, temple account summaries, subscription income, donations, and expenses.

**Responsibilities:**
- Monthly P&L report generation
- Temple accounts Excel export
- Subscription income reports
- Donation summary reports
- Expense reports with vouchers
- Email report delivery

**Ownership:** `ReportService` — owns no collections (purely aggregational)

**Dependencies:** TempleAccountsService, DonationService, BookingService, ExpenseService, SubscriptionService (reads from all)

---

### Domain 15: Contact

**Purpose:** Manages public contact form submissions and admin inquiry handling.

**Responsibilities:**
- Inquiry creation with validation
- Admin notification email trigger
- Inquiry status tracking

**Ownership:** `ContactService` — owns `contact_inquiries`

**Dependencies:** EmailService (admin notification)

---

### Domain 16: Bank Config

**Purpose:** Manages temple bank account configuration for payment processing.

**Responsibilities:**
- Bank account config CRUD
- Payment accounts CRUD
- QR code image upload
- Active bank account lookup

**Ownership:** `BankConfigService` — owns `bank_account_config`, `payment_accounts`

**Dependencies:** StorageService (QR code uploads)

---

### Domain 17: Audit

**Purpose:** Records and queries system-wide audit logs.

**Responsibilities:**
- Audit log creation (action, entity, user, details)
- Query with filters (date range, user, action type)
- Pagination and search
- Excel export
- Old log cleanup

**Ownership:** `AuditService` — owns `audit_logs`

**Dependencies:** None (cross-cutting concern consumed by all domains)

---

### Domain 18: AI Integration

**Purpose:** Manages the integrated AI chat feature — conversation history, image analysis, and response streaming.

**Responsibilities:**
- Conversation history management
- AI API streaming (Anthropic Claude)
- Image upload and analysis
- Rate limiting
- Message persistence

**Ownership:** `AIService` — owns `ai_messages`, `ai_images`

**Dependencies:** StorageService (image uploads)

---

### Domain 19: Settings

**Purpose:** Manages application-wide configuration.

**Responsibilities:**
- App settings CRUD
- Theme configuration
- Language defaults
- Feature flags
- System parameters

**Ownership:** `SettingsService` — owns `app_settings`

**Dependencies:** None

---

## 3. Endpoint Inventory

### Legend

| Symbol | Meaning |
|--------|---------|
| 🔒 | Authentication required |
| 👑 | Admin role required |
| 🌐 | Public (no auth) |
| 💎 | Premium membership required |

---

### 3.1 Authentication Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 1 | POST | `/api/auth/register` | 🌐 | Public | Register new user |
| 2 | POST | `/api/auth/login` | 🌐 | Public | Login with credentials |
| 3 | POST | `/api/auth/logout` | 🔒 | Any authenticated | Logout and revoke refresh token |
| 4 | POST | `/api/auth/refresh` | 🌐 | Valid refresh token | Refresh access token |
| 5 | POST | `/api/auth/forgot-password` | 🌐 | Public | Request password reset email |
| 6 | POST | `/api/auth/reset-password` | 🌐 | Valid reset token | Set new password |
| 7 | GET | `/api/auth/verify-email/:token` | 🌐 | Valid verification token | Verify email address |
| 8 | POST | `/api/auth/resend-verification` | 🔒 | Any authenticated | Resend verification email |
| 9 | GET | `/api/auth/me` | 🔒 | Any authenticated | Get current user profile |
| 10 | POST | `/api/auth/google` | 🌐 | Public | OAuth login with Google |

**Endpoint Details:**

**1. POST `/api/auth/register`**
- Request body: `{ email, password, name, phone, preferredLanguage? }`
- Response: `{ success, data: { user, accessToken, refreshToken } }`
- Validation: email format, password strength (min 8, 1 uppercase, 1 number), name 2-100 chars, phone 10-15 digits
- Business rules: Email must be unique. Password hashed with bcrypt (cost 12). Default role = "user", account_type = "Free Member". Email verification token generated (24h expiry). Verification email queued.
- Errors: `EMAIL_EXISTS`, `VALIDATION_ERROR`

**2. POST `/api/auth/login`**
- Request body: `{ email, password }`
- Response: `{ success, data: { user, accessToken, refreshToken } }`
- Validation: email format, password required
- Business rules: Verify bcrypt hash. Check email is verified. Check user is not blocked/deleted. Issue access token (15min) + refresh token (7 days). Audit log login.
- Errors: `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_BLOCKED`

**3. POST `/api/auth/logout`**
- Request body: `{ refreshToken }`
- Response: `{ success, message }`
- Business rules: Revoke the refresh token. Audit log logout.

**4. POST `/api/auth/refresh`**
- Request body: `{ refreshToken }`
- Response: `{ success, data: { accessToken, refreshToken } }`
- Business rules: Verify refresh token signature and expiry. Check token hasn't been revoked. Issue new access token + new refresh token (rotation). Invalidate old refresh token. If reuse detected: revoke ALL tokens for this user.
- Errors: `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_EXPIRED`, `TOKEN_REUSE_DETECTED`

**5. POST `/api/auth/forgot-password`**
- Request body: `{ email }`
- Response: `{ success, message }` (always returns success to prevent email enumeration)
- Business rules: Generate crypto-random reset token (1 hour expiry). Store hashed token in users table. Queue password reset email. Do not reveal whether email exists.

**6. POST `/api/auth/reset-password`**
- Request body: `{ token, newPassword }`
- Response: `{ success, message }`
- Business rules: Verify token not expired. Hash new password. Update user. Revoke all refresh tokens. Queue "password changed" confirmation email.

**7. GET `/api/auth/verify-email/:token`**
- Response: `{ success, message }`
- Business rules: Verify token not expired. Set user's `verified` flag to true. Queue welcome email.

**8. POST `/api/auth/resend-verification`**
- Response: `{ success, message }`
- Business rules: Generate new verification token (24h). Queue verification email. Rate limit: 1 per 5 minutes.

**9. GET `/api/auth/me`**
- Response: `{ success, data: { user with membership info } }`
- Business rules: Returns current user profile with membership type, account type, and preferences.

**10. POST `/api/auth/google`**
- Request body: `{ code, redirectUri }`
- Response: `{ success, data: { user, accessToken, refreshToken } }`
- Business rules: Exchange code with Google. Extract email, name, picture. Find or create user. Issue tokens.

---

### 3.2 User Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 11 | GET | `/api/users` | 🔒👑 | Admin | List all users with pagination |
| 12 | GET | `/api/users/:id` | 🔒 | Admin or self | Get user by ID |
| 13 | PATCH | `/api/users/:id` | 🔒 | Admin or self | Update user profile |
| 14 | PUT | `/api/users/:id/role` | 🔒👑 | Admin | Change user role |
| 15 | POST | `/api/users/:id/avatar` | 🔒 | Admin or self | Upload avatar |
| 16 | DELETE | `/api/users/:id/avatar` | 🔒 | Admin or self | Delete avatar |
| 17 | PATCH | `/api/users/:id/block` | 🔒👑 | Admin | Block/unblock user |
| 18 | PATCH | `/api/users/:id/preferences` | 🔒 | Admin or self | Update preferences |
| 19 | GET | `/api/users/search` | 🔒👑 | Admin | Search users by name/email |

---

### 3.3 Membership Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 20 | GET | `/api/membership/account-types` | 🌐 | Public | List account types |
| 21 | POST | `/api/membership/account-types` | 🔒👑 | Admin | Create account type |
| 22 | PATCH | `/api/membership/account-types/:id` | 🔒👑 | Admin | Update account type |
| 23 | DELETE | `/api/membership/account-types/:id` | 🔒👑 | Admin | Delete account type |
| 24 | GET | `/api/membership/assignments` | 🔒👑 | Admin | List user-account assignments |
| 25 | POST | `/api/membership/assignments` | 🔒👑 | Admin | Assign account type to user |
| 26 | DELETE | `/api/membership/assignments/:id` | 🔒👑 | Admin | Remove assignment |
| 27 | GET | `/api/membership/page-access` | 🔒 | Admin or self | Get page access for user |
| 28 | POST | `/api/membership/page-access` | 🔒👑 | Admin | Grant page access |
| 29 | PATCH | `/api/membership/page-access/:id` | 🔒👑 | Admin | Update access level |
| 30 | DELETE | `/api/membership/page-access/:id` | 🔒👑 | Admin | Revoke page access |
| 31 | GET | `/api/membership/pages` | 🌐 | Public | List available pages |

---

### 3.4 Subscription Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 32 | POST | `/api/subscriptions` | 🔒 | Any authenticated | Create subscription request |
| 33 | GET | `/api/subscriptions` | 🔒👑 | Admin | List all subscriptions |
| 34 | GET | `/api/subscriptions/:id` | 🔒 | Admin or owner | Get subscription by ID |
| 35 | GET | `/api/subscriptions/user/:userId` | 🔒 | Admin or self | Get user's subscriptions |
| 36 | PATCH | `/api/subscriptions/:id/approve` | 🔒👑 | Admin | Approve subscription |
| 37 | PATCH | `/api/subscriptions/:id/reject` | 🔒👑 | Admin | Reject subscription |
| 38 | POST | `/api/subscriptions/:id/receipt` | 🔒👑 | Admin | Generate receipt |
| 39 | POST | `/api/subscriptions/:id/resend-receipt` | 🔒👑 | Admin | Resend receipt email |

---

### 3.5 Payment Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 40 | POST | `/api/payments` | 🔒 | Any authenticated | Create payment record |
| 41 | GET | `/api/payments` | 🔒👑 | Admin | List all payments |
| 42 | GET | `/api/payments/pending` | 🔒👑 | Admin | List pending payments |
| 43 | GET | `/api/payments/:id` | 🔒👑 | Admin | Get payment by ID |
| 44 | PATCH | `/api/payments/:id/approve` | 🔒👑 | Admin | Approve payment |
| 45 | PATCH | `/api/payments/:id/reject` | 🔒👑 | Admin | Reject payment |
| 46 | POST | `/api/payments/:id/receipt` | 🔒👑 | Admin | Generate receipt |
| 47 | POST | `/api/payments/:id/resend-receipt` | 🔒👑 | Admin | Resend receipt |

---

### 3.6 Donation Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 48 | POST | `/api/donations` | 🌐 | Public | Create donation |
| 49 | GET | `/api/donations` | 🔒👑 | Admin | List all donations |
| 50 | GET | `/api/donations/user/:userId` | 🔒 | Admin or self | Get user's donations |
| 51 | GET | `/api/donations/:id` | 🔒 | Admin or owner | Get donation by ID |
| 52 | PATCH | `/api/donations/:id` | 🔒👑 | Admin | Update donation |
| 53 | PATCH | `/api/donations/:id/approve` | 🔒👑 | Admin | Approve donation |
| 54 | PATCH | `/api/donations/:id/reject` | 🔒👑 | Admin | Reject donation |
| 55 | POST | `/api/donations/:id/receipt` | 🔒👑 | Admin | Generate receipt PDF |
| 56 | GET | `/api/donations/:id/receipt/download` | 🔒 | Admin or owner | Download receipt PDF |
| 57 | POST | `/api/donations/:id/resend-receipt` | 🔒👑 | Admin | Resend receipt email |
| 58 | POST | `/api/donations/:id/email` | 🔒👑 | Admin | Send custom email |
| 59 | PATCH | `/api/donations/:id/soft-delete` | 🔒👑 | Admin | Soft-delete donation |
| 60 | PATCH | `/api/donations/:id/restore` | 🔒👑 | Admin | Restore soft-deleted donation |
| 61 | DELETE | `/api/donations/:id` | 🔒👑 | Admin | Permanently delete donation |

---

### 3.7 Pooja Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 62 | GET | `/api/poojas` | 🌐 | Public | List published poojas |
| 63 | GET | `/api/poojas/all` | 🔒👑 | Admin | List all poojas |
| 64 | GET | `/api/poojas/:id` | 🌐 | Public | Get pooja by ID |
| 65 | POST | `/api/poojas` | 🔒👑 | Admin | Create pooja |
| 66 | PATCH | `/api/poojas/:id` | 🔒👑 | Admin | Update pooja |
| 67 | DELETE | `/api/poojas/:id` | 🔒👑 | Admin | Delete pooja |
| 68 | POST | `/api/poojas/:id/image` | 🔒👑 | Admin | Upload pooja image |

---

### 3.8 Booking Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 69 | POST | `/api/bookings` | 🔒 | Any authenticated | Create booking |
| 70 | GET | `/api/bookings` | 🔒👑 | Admin | List all bookings |
| 71 | GET | `/api/bookings/user/:userId` | 🔒 | Admin or self | Get user's bookings |
| 72 | GET | `/api/bookings/:id` | 🔒 | Admin or owner | Get booking by ID |
| 73 | PATCH | `/api/bookings/:id/approve` | 🔒👑 | Admin | Approve booking |
| 74 | PATCH | `/api/bookings/:id/reject` | 🔒👑 | Admin | Reject booking |
| 75 | PATCH | `/api/bookings/:id/complete` | 🔒👑 | Admin | Mark booking completed |
| 76 | POST | `/api/bookings/:id/receipt` | 🔒👑 | Admin | Generate receipt PDF |
| 77 | GET | `/api/bookings/:id/receipt/download` | 🔒 | Admin or owner | Download receipt PDF |
| 78 | POST | `/api/bookings/:id/resend-receipt` | 🔒👑 | Admin | Resend receipt email |
| 79 | DELETE | `/api/bookings/:id` | 🔒👑 | Admin | Delete booking |

---

### 3.9 Gallery Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 80 | GET | `/api/gallery` | 🌐 | Public | List published gallery items |
| 81 | GET | `/api/gallery/all` | 🔒👑 | Admin | List all gallery items |
| 82 | GET | `/api/gallery/:id` | 🌐 | Public | Get gallery item by ID |
| 83 | POST | `/api/gallery` | 🔒👑 | Admin | Upload gallery item |
| 84 | PATCH | `/api/gallery/:id` | 🔒👑 | Admin | Update gallery item |
| 85 | DELETE | `/api/gallery/:id` | 🔒👑 | Admin | Delete gallery item |
| 86 | PATCH | `/api/gallery/:id/publish` | 🔒👑 | Admin | Toggle publish status |
| 87 | GET | `/api/gallery/categories` | 🌐 | Public | List photo categories |
| 88 | POST | `/api/gallery/categories` | 🔒👑 | Admin | Create category |
| 89 | PATCH | `/api/gallery/categories/:id` | 🔒👑 | Admin | Update category |
| 90 | DELETE | `/api/gallery/categories/:id` | 🔒👑 | Admin | Delete category |

---

### 3.10 Festival Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 91 | GET | `/api/festivals` | 🌐 | Public | List active festivals |
| 92 | GET | `/api/festivals/all` | 🔒👑 | Admin | List all festivals |
| 93 | GET | `/api/festivals/:id` | 🌐 | Public | Get festival by ID |
| 94 | POST | `/api/festivals` | 🔒👑 | Admin | Create festival |
| 95 | PATCH | `/api/festivals/:id` | 🔒👑 | Admin | Update festival |
| 96 | DELETE | `/api/festivals/:id` | 🔒👑 | Admin | Delete festival |
| 97 | POST | `/api/festivals/:id/image` | 🔒👑 | Admin | Upload festival image |

---

### 3.11 Notification Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 98 | GET | `/api/notifications` | 🔒 | Any authenticated | List user's notifications |
| 99 | GET | `/api/notifications/unread-count` | 🔒 | Any authenticated | Get unread count |
| 100 | PATCH | `/api/notifications/:id/read` | 🔒 | Any authenticated | Mark as read |
| 101 | PATCH | `/api/notifications/read-all` | 🔒 | Any authenticated | Mark all as read |
| 102 | GET | `/api/notifications/preferences` | 🔒 | Any authenticated | Get notification preferences |
| 103 | PATCH | `/api/notifications/preferences` | 🔒 | Any authenticated | Update preferences |

---

### 3.12 Message Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 104 | GET | `/api/messages/admin` | 🔒 | Any authenticated | List admin messages |
| 105 | POST | `/api/messages/admin` | 🔒👑 | Admin | Send admin message |
| 106 | PATCH | `/api/messages/admin/:id/read` | 🔒 | Any authenticated | Mark admin message read |
| 107 | GET | `/api/messages/booking/:bookingId` | 🔒 | Admin or booking owner | List booking messages |
| 108 | POST | `/api/messages/booking` | 🔒 | Any authenticated | Send booking message |

---

### 3.13 Temple Accounts Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 109 | GET | `/api/temple-accounts` | 🔒👑 | Admin | List temple account entries |
| 110 | GET | `/api/temple-accounts/summary` | 🔒👑 | Admin | Get monthly summary |
| 111 | GET | `/api/temple-accounts/report` | 🔒👑 | Admin | Generate P&L report |
| 112 | POST | `/api/temple-accounts/export` | 🔒👑 | Admin | Export to Excel |

---

### 3.14 Expense Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 113 | GET | `/api/expenses` | 🔒👑 | Admin | List expenses |
| 114 | POST | `/api/expenses` | 🔒👑 | Admin | Create expense |
| 115 | GET | `/api/expenses/:id` | 🔒👑 | Admin | Get expense by ID |
| 116 | PATCH | `/api/expenses/:id` | 🔒👑 | Admin | Update expense |
| 117 | DELETE | `/api/expenses/:id` | 🔒👑 | Admin | Delete expense |
| 118 | POST | `/api/expenses/:id/bill` | 🔒👑 | Admin | Upload bill file |
| 119 | POST | `/api/expenses/voucher` | 🔒👑 | Admin | Generate voucher PDF |
| 120 | GET | `/api/expenses/voucher/:id` | 🔒👑 | Admin | Download voucher PDF |
| 121 | POST | `/api/expenses/:id/email` | 🔒👑 | Admin | Email expense with attachments |
| 122 | GET | `/api/expenses/categories` | 🔒👑 | Admin | List expense categories |
| 123 | POST | `/api/expenses/categories` | 🔒👑 | Admin | Create category |
| 124 | PATCH | `/api/expenses/categories/:id` | 🔒👑 | Admin | Update category |
| 125 | DELETE | `/api/expenses/categories/:id` | 🔒👑 | Admin | Delete category |
| 126 | GET | `/api/expenses/classifications` | 🌐 | Public | List classifications |
| 127 | POST | `/api/expenses/classifications` | 🔒👑 | Admin | Create classification |
| 128 | PATCH | `/api/expenses/classifications/:id` | 🔒👑 | Admin | Update classification |
| 129 | DELETE | `/api/expenses/classifications/:id` | 🔒👑 | Admin | Delete classification |

---

### 3.15 Contact Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 130 | POST | `/api/contact` | 🌐 | Public | Submit contact inquiry |
| 131 | GET | `/api/contact` | 🔒👑 | Admin | List inquiries |
| 132 | GET | `/api/contact/:id` | 🔒👑 | Admin | Get inquiry by ID |
| 133 | PATCH | `/api/contact/:id` | 🔒👑 | Admin | Update inquiry status |

---

### 3.16 Bank Config Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 134 | GET | `/api/bank-config` | 🌐 | Public | Get active bank config |
| 135 | PUT | `/api/bank-config` | 🔒👑 | Admin | Update bank config |
| 136 | GET | `/api/bank-config/payment-accounts` | 🌐 | Public | List payment accounts |
| 137 | POST | `/api/bank-config/payment-accounts` | 🔒👑 | Admin | Create payment account |
| 138 | PATCH | `/api/bank-config/payment-accounts/:id` | 🔒👑 | Admin | Update payment account |
| 139 | DELETE | `/api/bank-config/payment-accounts/:id` | 🔒👑 | Admin | Delete payment account |
| 140 | POST | `/api/bank-config/payment-accounts/:id/qr` | 🔒👑 | Admin | Upload QR code |

---

### 3.17 Report Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 141 | POST | `/api/reports/temple-accounts` | 🔒👑 | Admin | Generate temple accounts report |
| 142 | POST | `/api/reports/donations` | 🔒👑 | Admin | Generate donation report |
| 143 | POST | `/api/reports/subscriptions` | 🔒👑 | Admin | Generate subscription report |
| 144 | POST | `/api/reports/expenses` | 🔒👑 | Admin | Generate expense report |
| 145 | POST | `/api/reports/send-email` | 🔒👑 | Admin | Email report to recipient |

---

### 3.18 Audit Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 146 | GET | `/api/audit` | 🔒👑 | Admin | List audit logs |
| 147 | GET | `/api/audit/:id` | 🔒👑 | Admin | Get audit log by ID |
| 148 | POST | `/api/audit/export` | 🔒👑 | Admin | Export audit logs to Excel |

---

### 3.19 AI Integration Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 149 | POST | `/api/ai/stream` | 🔒 | Any authenticated | Stream AI chat response (SSE) |
| 150 | GET | `/api/ai/history` | 🔒 | Any authenticated | Get conversation history |
| 151 | DELETE | `/api/ai/history` | 🔒 | Any authenticated | Clear conversation history |

---

### 3.20 File Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 152 | GET | `/api/files/:collection/:id/:filename` | 🔒 | Ownership-based | Serve private files |
| 153 | GET | `/api/files/public/:path` | 🌐 | Public | Serve public files |

---

### 3.21 System Endpoints

| # | Method | Endpoint | Auth | Authorization | Purpose |
|---|--------|----------|------|---------------|---------|
| 154 | GET | `/api/health` | 🌐 | Public | Health check |
| 155 | GET | `/api/settings` | 🌐 | Public | Get public settings |
| 156 | PUT | `/api/settings` | 🔒👑 | Admin | Update settings |

---

## 4. Authentication Architecture

### JWT Strategy

**Access Token:**
- Algorithm: HS256
- Expiry: 15 minutes
- Payload: `{ sub: userId, role: userRole, type: "access", iat, exp }`
- Stored in: Memory only (JavaScript variable, not localStorage)
- Sent via: `Authorization: Bearer <token>` header

**Refresh Token:**
- Algorithm: HS256
- Expiry: 7 days
- Payload: `{ sub: userId, type: "refresh", family: tokenFamily, iat, exp }`
- Stored in: HttpOnly, Secure, SameSite=Strict cookie (primary) + localStorage (fallback for non-browser clients)
- Sent via: Request body on refresh/logout endpoints

### Token Lifetime

| Token | Lifetime | Renewal | Storage |
|-------|----------|---------|---------|
| Access token | 15 minutes | Silent refresh via refresh token | Memory (JS variable) |
| Refresh token | 7 days | Rotation on each use | HttpOnly cookie + localStorage |
| Email verification token | 24 hours | Single use | Database (hashed) |
| Password reset token | 1 hour | Single use | Database (hashed) |

### Token Refresh Flow

1. Client detects 401 response (access token expired)
2. Client sends refresh request with refresh token
3. Server verifies refresh token signature and expiry
4. Server checks token family (detects reuse)
5. Server issues new access token + new refresh token
6. Server invalidates old refresh token
7. Client retries original request with new access token

### Token Revocation

- **On logout:** Refresh token revoked from database
- **On password change:** All refresh tokens for this user revoked (family reset)
- **On security event:** All refresh tokens for this user revoked
- **Access tokens:** Cannot be revoked (short-lived, accepted trade-off)

### Password Reset Flow

1. User submits email to `/api/auth/forgot-password`
2. Server generates crypto-random token (32 bytes, hex-encoded)
3. Token stored as SHA-256 hash in `password_reset_tokens` table
4. Email queued with reset link: `{FRONTEND_URL}/reset-password?token={token}`
5. User clicks link → frontend shows reset form
6. User submits new password + token to `/api/auth/reset-password`
7. Server verifies token hash matches stored hash
8. Server hashes new password, updates user
9. All refresh tokens revoked
10. Confirmation email queued

### Email Verification Flow

1. On registration, verification token generated (crypto-random, 32 bytes)
2. Token stored as SHA-256 hash in `email_verification_tokens` table
3. Email queued with verification link: `{FRONTEND_URL}/verify-email?token={token}`
4. User clicks link → GET `/api/auth/verify-email/:token`
5. Server verifies token hash, sets `verified: true`
6. Welcome email queued

### Multiple Device Login

- Each device receives its own refresh token
- Refresh tokens are tracked by "family" (issued together)
- On password change, ALL families are revoked (force re-login everywhere)
- Maximum 10 active refresh token families per user (oldest evicted)

---

## 5. Authorization Architecture

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| `guest` | 0 | Unauthenticated — can view public pages, submit contact forms, create donations |
| `user` | 1 | Registered member — can manage profile, create bookings, view own history |
| `premium` | 2 | Active premium subscriber — inherits user permissions + premium content access |
| `admin` | 3 | Temple administrator — full access to all admin features |

### Role Definitions

**Guest (Level 0):**
- View published poojas, gallery, festivals
- View public bank configuration
- Submit contact inquiries
- Create donations (public endpoint)
- Access public settings

**User (Level 1):**
- All guest permissions
- Manage own profile (name, phone, address, avatar)
- Manage own preferences (language, font size, notifications)
- Create pooja bookings
- View own bookings, donations, subscriptions
- View own messages
- Create premium upgrade requests
- View notifications

**Premium (Level 2):**
- All user permissions
- View premium content (controlled by `page_access`)
- View detailed temple financial transparency
- Access premium dashboard features

**Admin (Level 3):**
- Full access to all endpoints
- Manage users (roles, blocking)
- Approve/reject bookings, donations, subscriptions, payments
- Manage pooja catalog
- Manage gallery and festivals
- Manage expenses and vouchers
- Generate and send reports
- View audit logs
- Manage bank configuration
- Manage membership types and page access
- Send admin messages

### Permission Matrix

| Resource | Guest | User | Premium | Admin |
|----------|-------|------|---------|-------|
| Public pages (poojas, gallery, festivals) | Read | Read | Read | Read, Write, Delete |
| User profile | — | Read, Write (own) | Read, Write (own) | Read (all), Write (all) |
| Bookings | — | Create, Read (own) | Create, Read (own) | Read (all), Approve, Reject, Delete |
| Donations | Create | Read (own) | Read (own) | Read (all), Approve, Reject, Delete |
| Subscriptions | — | Create, Read (own) | Create, Read (own) | Read (all), Approve, Reject |
| Payments | — | Create | Create | Read (all), Approve, Reject |
| Expenses | — | — | — | Full CRUD |
| Temple Accounts | — | — | Read (transparency) | Full CRUD, Export |
| Reports | — | — | — | Generate, Send |
| Audit Logs | — | — | — | Read, Export |
| Bank Config | Read | Read | Read | Full CRUD |
| Gallery | Read (published) | Read (published) | Read (published) | Full CRUD |
| Festivals | Read (active) | Read (active) | Read (active) | Full CRUD |
| Messages | — | Read (own), Create | Read (own), Create | Full CRUD |
| Notifications | — | Read (own) | Read (own) | Full CRUD |
| Settings | Read (public) | Read (public) | Read (public) | Full CRUD |

### Middleware Application

Every endpoint applies authorization middleware in this order:

1. **JWT Authentication** — Extracts and verifies token, sets `req.user`
2. **Role Authorization** — Checks `req.user.role` against required role level
3. **Resource Ownership** — For non-admin endpoints, verifies `req.user.id` matches resource owner
4. **Premium Access** — For premium endpoints, checks active subscription status

---

## 6. Validation Strategy

### Request Validation

All incoming requests are validated using Zod schemas. Each endpoint defines a schema that validates:
- **Path parameters** — type, format, existence
- **Query parameters** — type, range, defaults
- **Request body** — required fields, types, formats, business rules
- **File uploads** — MIME type, size limits

### Body Validation Rules

| Field Type | Rules | Example |
|------------|-------|---------|
| `email` | Valid email format, max 255 chars | `user@example.com` |
| `password` | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char | `Password123!` |
| `name` | 2-100 chars, no special characters except spaces, hyphens, apostrophes | `John O'Brien` |
| `phone` | 10-15 digits, optional leading `+` | `+491234567890` |
| `amount` | Positive number, max 2 decimal places, min 0.01 | `125.50` |
| `date` | Valid ISO 8601 date, not in the past (for new bookings) | `2026-07-15` |
| `status` | Must be one of predefined enum values | `pending` |
| `description` | 0-5000 chars | — |
| `url` | Valid URL format | `https://example.com` |
| `uuid` | Valid UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |

### Money Validation

- All monetary amounts stored as integers (cents/paise) in database, displayed as decimals in API
- Minimum amount: 0.01 (1 cent)
- Maximum amount: 99999999.99
- Currency: EUR (€) — consistent across all services
- Validation: `amount > 0`, `amount % 0.01 === 0` (max 2 decimal places)

### Phone Validation

- Minimum 10 digits, maximum 15 digits
- Optional leading `+` for international format
- No spaces, hyphens, or parentheses in stored value
- Validation regex: `^\+?[1-9]\d{9,14}$`

### Email Validation

- Standard email format per RFC 5322
- Maximum 255 characters
- Stored in lowercase
- Uniqueness enforced at database level

### Date Validation

- ISO 8601 format: `YYYY-MM-DD`
- Booking dates: must be today or future
- Subscription dates: `start_date` must be today or past, `end_date` must be after `start_date`
- Receipt dates: cannot be in the future

### File Validation

| File Type | Allowed MIME Types | Max Size | Notes |
|-----------|-------------------|----------|-------|
| Images (gallery, festival, pooja) | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 20 MB | Client-side compression to 1.5 MB before upload |
| Avatars | `image/jpeg`, `image/png`, `image/webp` | 5 MB | Resized to 400x400 |
| Documents (receipts, vouchers) | `application/pdf` | 20 MB | Server-generated |
| Expense bills | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf` | 20 MB | — |
| QR codes | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 5 MB | — |
| AI images | `image/jpeg`, `image/png`, `image/webp` | 20 MB | — |

### Business Validation

| Rule | Endpoint | Description |
|------|----------|-------------|
| Email uniqueness | Register | Email must not exist in users table |
| Booking date availability | Create booking | Date must be in pooja's available dates |
| Time slot availability | Create booking | Slot must not be fully booked |
| Subscription state machine | Approve/reject | Can only approve pending subscriptions |
| Donation state machine | Approve/reject | Can only approve pending donations |
| Booking state machine | Approve/reject | Can only approve pending bookings |
| Amount minimum | Create subscription | Amount must be > 0 |
| Duration bounds | Create subscription | duration_months must be 1-120 |
| User not blocked | Login, create booking | User must not be blocked or deleted |
| Receipt exists | Resend receipt | Receipt must have been generated first |
| Soft-delete balance | Soft-delete donation | Ledger balance must not go negative |
| Unique receipt ID | Generate receipt | Receipt IDs are generated once, never regenerated |

---

## 7. File Upload Architecture

### Upload Flow

1. Client compresses images (if applicable) using `browser-image-compression`
2. Client sends `multipart/form-data` request
3. Multer middleware validates MIME type and file size
4. File stored in memory (Buffer) — never written to temp disk
5. Service generates unique filename: `{entity}_{timestamp}_{random8chars}.{ext}`
6. StorageService writes to appropriate directory
7. Database record updated with file path
8. Response returns file URL

### Storage Directory Structure

```
uploads/
├── avatars/
│   └── user_{userId}_{timestamp}_{random}.{ext}
├── gallery/
│   └── {categorySlug}/
│       └── {timestamp}_{random8chars}.{ext}
├── festivals/
│   └── {timestamp}_{random8chars}.{ext}
├── poojas/
│   └── {timestamp}_{random8chars}.{ext}
├── expenses/
│   ├── bills/
│   │   └── expense_{expenseId}_{timestamp}.{ext}
│   └── images/
│       └── expense_{expenseId}_{timestamp}.{ext}
├── receipts/
│   └── {receiptType}_{receiptId}.pdf
├── vouchers/
│   └── {voucherId}.pdf
├── payment-accounts/
│   └── {accountId}_qr.{ext}
└── temp/
    └── {sessionId}_{filename}.{ext}  (auto-cleanup after 24h)
```

### File Naming Convention

`{entity}_{identifier}_{timestamp}_{random8chars}.{extension}`

- `entity`: Type of entity (user, gallery, festival, etc.)
- `identifier`: Entity ID or descriptive slug
- `timestamp`: Unix timestamp (seconds)
- `random8chars`: Cryptographically random hex string for collision avoidance
- `extension`: Original file extension (lowercase)

### File Serving

**Public files** (gallery, festivals, QR codes, pooja images):
- Served directly via Express static middleware at `/uploads/`
- No authentication required
- Cache-Control headers: `public, max-age=86400` (1 day)

**Private files** (avatars, receipts, expense bills):
- Served through authenticated endpoint: `/api/files/:collection/:id/:filename`
- Authentication required
- Ownership verification before serving
- Cache-Control headers: `private, no-cache`

### File Deletion

**Hard delete on entity deletion:**
- Physical file deleted from storage
- Database record updated (file path cleared)
- Storage space reclaimed

**Soft-delete retention:**
- Files retained for 30 days after entity soft-delete
- Weekly cleanup job removes expired files

**Orphan cleanup:**
- Weekly cron scans uploads directory
- Compares against database references
- Deletes files not referenced by any record

### Thumbnail Strategy

- Gallery images: `300x300` and `100x100` thumbnails generated on upload
- Avatars: `400x400` resize on upload
- Festival images: `300x300` thumbnail on upload
- Thumbnails stored alongside original with `_thumb_{size}` suffix

---

## 8. Error Handling

### Standard Error Object

Every error response includes:

```
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable description",
    "details": [] | null
  },
  "correlationId": "req_{random12chars}"
}
```

### Error Code Catalog

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/query/params failed validation |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing or empty |
| `INVALID_FORMAT` | 400 | Field value does not match expected format |
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `TOKEN_INVALID` | 401 | Access token is malformed or signature is invalid |
| `EMAIL_NOT_VERIFIED` | 403 | User's email has not been verified |
| `ACCOUNT_BLOCKED` | 403 | User account has been blocked |
| `ACCOUNT_DELETED` | 403 | User account has been deleted |
| `INSUFFICIENT_PERMISSIONS` | 403 | User does not have required role |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists (unique constraint) |
| `BUSINESS_RULE_VIOLATION` | 409 | Operation violates a business rule |
| `INVALID_STATE_TRANSITION` | 409 | Entity is not in required state for this operation |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds maximum size |
| `UNSUPPORTED_FILE_TYPE` | 415 | Uploaded file MIME type is not allowed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | External service (email, AI) is unavailable |

### Validation Error Details

When `code` is `VALIDATION_ERROR`, the `details` array contains field-level errors:

```
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    { "field": "email", "message": "Must be a valid email address", "value": "not-an-email" },
    { "field": "amount", "message": "Must be greater than 0", "value": -5 }
  ]
}
```

### Error Logging

- All errors logged with correlation ID for traceability
- 5xx errors logged at ERROR level with full stack trace
- 4xx errors logged at WARN level with request context
- 401/403 errors logged at INFO level for security monitoring
- Sensitive fields (passwords, tokens, credit cards) never logged

### Correlation IDs

- Generated per request: `req_{crypto.randomBytes(6).toString('hex')}`
- Added to response header: `X-Correlation-Id: req_abc123def456`
- Propagated through all service calls
- Included in all error responses
- Used for log aggregation and debugging

---

## 9. Business Workflows

### Workflow 1: User Registration

```
1. Client submits: { email, password, name, phone, preferredLanguage }
     |
2. Validation middleware validates all fields
     |
3. AuthService checks email uniqueness
     |-- If exists: return EMAIL_EXISTS (409)
     |
4. AuthService hashes password (bcrypt, cost 12)
     |
5. UserService creates user record:
     |   role: 'user'
     |   account_type: 'Free Member'
     |   verified: false
     |   membership_type: 'free'
     |
6. AuthService generates email verification token (crypto-random)
     |
7. Token stored as SHA-256 hash in email_verification_tokens
     |
8. EmailService queues verification email
     |
9. AuthService generates access token (15min) + refresh token (7 days)
     |
10. AuditService logs: user_registered
     |
11. Response: { user, accessToken, refreshToken }
```

### Workflow 2: Donation Approval

```
1. Admin clicks "Approve" on donation (AdminDonationApprovalPage)
     |
2. Validation middleware validates donationId
     |
3. DonationService.approveDonation(donationId):
     |
     a. DonationRepository.findById(donationId)
        |-- If not found: return RESOURCE_NOT_FOUND (404)
        |-- If status != 'pending': return INVALID_STATE_TRANSITION (409)
     |
     b. ReceiptService.generateDonationReceiptId()
        |-- Format: DONATION_{unix_seconds}_{random6}
        |-- Stored on donation record
     |
     c. PDFService.generateDonationReceiptPDF(donation, receiptId)
        |-- Returns PDF buffer
     |
     d. StorageService.save(receipt_pdf, 'receipts', receiptId)
        |-- Returns file path
     |
     e. DonationRepository.update(donationId, {
        |   status: 'approved',
        |   receipt_id: receiptId,
        |   receipt_pdf_path: filePath,
        |   receipt_sent_at: now
        | })
     |
     f. TempleAccountsService.addEntry({
        |   source_type: 'donation',
        |   source_id: donationId,
        |   amount: donation.amount,
        |   category: donation.donationCategory,
        |   date: donation.donation_date
        | })
     |
     g. EmailService.enqueue(donationReceiptEmail, {
        |   to: donation.donorEmail,
        |   attachment: pdfBuffer
        | })
     |
     h. AuditService.log('donation_approved', {
        |   entityId: donationId,
        |   amount: donation.amount
        | })
     |
4. Response: { success, message, receipt_id, donation }
```

### Workflow 3: Pooja Booking Approval

```
1. Admin clicks "Approve" on booking (AdminPoojaApprovals)
     |
2. BookingService.approveBooking(bookingId):
     |
     a. PoojaBookingRepository.findById(bookingId)
        |-- If not found: return RESOURCE_NOT_FOUND
        |-- If status != 'pending': return INVALID_STATE_TRANSITION
     |
     b. ReceiptService.generatePoojaReceiptId()
        |-- Format: POOJA_{unix_seconds}_{random6}
     |
     c. PDFService.generatePoojaReceipt(booking, receiptId)
     |
     d. StorageService.save(receipt_pdf, 'receipts', receiptId)
     |
     e. PoojaBookingRepository.update(bookingId, {
        |   status: 'confirmed',
        |   receipt_id: receiptId,
        |   receipt_pdf_path: filePath
        | })
     |
     f. TempleAccountsService.addEntry({
        |   source_type: 'booking',
        |   source_id: bookingId,
        |   amount: booking.donation_amount,
        |   category: 'Pooja Services',
        |   date: booking.selected_date
        | })
     |
     g. EmailService.enqueue(bookingApprovalEmail, {
        |   to: booking.email,
        |   attachment: pdfBuffer
        | })
     |
     h. MessageService.sendBookingMessage({
        |   bookingId,
        |   senderType: 'admin',
        |   message: 'Your booking has been approved.'
        | })
     |
     i. AuditService.log('booking_approved', { entityId: bookingId })
     |
3. Response: { success, message, booking }
```

### Workflow 4: Premium Subscription Approval

```
1. Admin clicks "Approve" on subscription (AdminSubscriptionManagement)
     |
2. SubscriptionService.approveSubscription(subscriptionId):
     |
     a. SubscriptionRepository.findById(subscriptionId)
        |-- If not found: return RESOURCE_NOT_FOUND
        |-- If status != 'pending': return INVALID_STATE_TRANSITION
     |
     b. WITHIN DATABASE TRANSACTION:
        |
        |   i. SubscriptionRepository.update(subscriptionId, {
        |      status: 'active',
        |      start_date: today,
        |      end_date: today + duration_months
        |   })
        |
        |   ii. MembershipService.upgradeToPremium(userId)
        |      |-- UserRepository.update(userId, {
        |      |   membership_type: 'premium',
        |      |   account_type: 'Premium Membership'
        |      | })
        |
        |   iii. PaymentService.approvePayment(paymentId)
        |      |-- PaymentRepository.update(paymentId, {
        |      |   status: 'approved',
        |      |   approved_by: adminId,
        |      |   approved_at: now
        |      | })
        |
        |   iv. ReceiptService.generateSubscriptionReceipt(subscription)
        |
        |   v. TempleAccountsService.addEntry({
        |      source_type: 'subscription',
        |      source_id: subscriptionId,
        |      amount: subscription.amount,
        |      category: 'Membership',
        |      date: today
        |   })
        |
     c. OUTSIDE TRANSACTION:
        |
        |   vi. EmailService.enqueue(subscriptionApprovedEmail)
        |
        |   vii. AuditService.log('subscription_approved')
        |
3. Response: { success, message, subscription, user }
```

### Workflow 5: Booking Cancellation

```
1. Admin clicks "Reject" on booking (AdminPoojaApprovals)
     |
2. BookingService.rejectBooking(bookingId, reason?):
     |
     a. PoojaBookingRepository.findById(bookingId)
        |-- If status != 'pending': return INVALID_STATE_TRANSITION
     |
     b. PoojaBookingRepository.update(bookingId, {
        |   status: 'rejected'
        | })
     |
     c. EmailService.enqueue(bookingRejectedEmail, {
        |   to: booking.email,
        |   reason
        | })
     |
     d. AuditService.log('booking_rejected', { entityId: bookingId })
     |
3. Response: { success, message, booking }
```

### Workflow 6: Expense Creation

```
1. Admin submits expense form (ExpenseManagerPage)
     |
2. ExpenseService.createExpense(data):
     |
     a. ExpenseRepository.create({
        |   amount, date, paid_to, payment_method,
        |   category_id, created_by: adminId
        | })
     |
     b. If bill_file attached:
        |   StorageService.save(file, 'expenses/bills', expenseId)
        |   ExpenseRepository.update(expenseId, { bill_file_path: filePath })
     |
     c. TempleAccountsService.addEntry({
        |   source_type: 'expense',
        |   source_id: expenseId,
        |   amount: -amount (negative for expense),
        |   category: expenseCategory.name,
        |   date
        | })
     |
     d. AuditService.log('expense_created', { entityId: expenseId })
     |
3. Response: { success, expense }
```

### Workflow 7: Gallery Upload

```
1. Admin uploads image (AdminGalleryManagement)
     |
2. Client compresses image (browser-image-compression, max 1.5 MB)
     |
3. GalleryService.uploadImage(data, file):
     |
     a. StorageService.save(file, 'gallery/{categorySlug}')
        |-- Returns { filePath, fileSize, mimeType }
     |
     b. ThumbnailService.generateThumbnails(filePath, ['300x300', '100x100'])
        |-- Returns thumbnail paths
     |
     c. GalleryRepository.create({
        |   title, description, image_path: filePath,
        |   thumbnails, category_id, uploaded_by: adminId,
        |   storage_size: fileSize, is_published: true
        | })
     |
     d. AuditService.log('gallery_image_uploaded')
     |
4. Response: { success, galleryItem }
```

### Workflow 8: Receipt Resend

```
1. Admin clicks "Resend Receipt" (AdminDonationApprovalPage)
     |
2. DonationService.resendReceipt(donationId):
     |
     a. DonationRepository.findById(donationId)
        |-- If status != 'approved': return INVALID_STATE_TRANSITION
        |-- If no receipt_id: return BUSINESS_RULE_VIOLATION
     |
     b. StorageService.load(donation.receipt_pdf_path)
        |-- If file missing: regenerate PDF
     |
     c. EmailService.enqueue(donationReceiptEmail, {
        |   to: donation.donorEmail,
        |   attachment: pdfBuffer
        | })
     |
     d. AuditService.log('receipt_resent', { entityId: donationId })
     |
3. Response: { success, message }
```

---

## 10. Performance Strategy

### Caching

| Layer | Strategy | TTL | Invalidation |
|-------|----------|-----|--------------|
| CDN | Static assets (images, uploads) | 1 day | On file update/delete |
| API response | In-memory cache (node-cache) | 5 minutes | On write to related collection |
| Database | Prisma query cache | N/A | PostgreSQL handles internally |
| Frontend | React Query / SWR | 5 minutes | On mutation |

**Cacheable endpoints (GET, public):**
- `GET /api/poojas` — pooja catalog (changes rarely)
- `GET /api/festivals` — festival list (changes rarely)
- `GET /api/gallery` — gallery items (changes on upload)
- `GET /api/bank-config` — payment details (changes rarely)
- `GET /api/settings` — public settings (changes rarely)

**Non-cacheable endpoints:**
- All POST/PUT/PATCH/DELETE
- All admin endpoints with `?admin=true`
- All user-specific data (bookings, donations, subscriptions)

### Pagination

- Default page size: 25 items
- Maximum page size: 100 items
- Server-side pagination for all list endpoints
- Client-side pagination only for small datasets (<50 items) with full fetch

### Rate Limiting

| Tier | Window | Max Requests | Scope |
|------|--------|--------------|-------|
| Global | 5 minutes | 100 | Per IP |
| Auth | 15 minutes | 10 | Per IP (login, register, forgot-password) |
| AI | 1 minute | 10 | Per user |
| File upload | 1 minute | 5 | Per user |
| Admin | 1 minute | 200 | Per user |
| Public read | 1 minute | 60 | Per IP |

### Compression

- gzip compression enabled for all responses >1KB
- Image compression on upload (client-side for gallery, server-side for receipts)
- PDF generation uses optimized templates

### Timeout Strategy

| Operation | Timeout | Retry |
|-----------|---------|-------|
| Database query | 10 seconds | 1 retry |
| Email send | 30 seconds | 3 retries (exponential backoff) |
| File upload | 60 seconds | 1 retry |
| AI streaming | 120 seconds | No retry |
| PDF generation | 15 seconds | 1 retry |
| External API call | 10 seconds | 2 retries |

---

## 11. Security Strategy

### CSRF Protection

- SameSite=Strict cookies for refresh tokens
- CSRF token validation for state-changing operations (optional, can be added later)
- Origin header validation on CORS

### XSS Prevention

- Content Security Policy headers via Helmet
- Output encoding on all rendered values
- Input sanitization (strip HTML tags from text fields)
- HttpOnly cookies (no JavaScript access)
- No `eval()`, `innerHTML`, or `dangerouslySetInnerHTML` on user data

### SQL Injection Prevention

- Prisma ORM parameterized queries (never raw SQL concatenation)
- Input validation before query execution
- Filter parameter sanitization (escape special characters)
- Never interpolate user input into filter strings

### Brute-Force Protection

- Auth endpoints: 10 attempts per 15 minutes per IP
- Password reset: 3 requests per hour per email
- Global rate limiting: 100 requests per 5 minutes per IP

### Input Sanitization

- Strip HTML tags from all text inputs
- Trim whitespace from all string inputs
- Normalize email to lowercase
- Remove null bytes from filenames
- Validate UUID format before database queries

### Secrets Management

- All secrets stored in environment variables (never in code)
- `.env` file excluded from version control
- SMTP credentials, API keys, JWT secret managed via environment
- No hardcoded passwords (current `adminUserSetup.js` is a known security debt to fix)

### Audit Logging

Every write operation logged with:
- User ID (who)
- Action (what)
- Entity type and ID (which)
- Timestamp (when)
- IP address (where)
- Request body summary (details, sensitive fields masked)

### Sensitive Data Masking

- Passwords never logged
- Tokens logged as `token_...{last4chars}` only
- Email addresses logged fully for security events, masked in debug logs
- Financial amounts logged for audit, not for debug
- Phone numbers masked in logs: `+49****7890`

---

## 12. Integration Architecture

### Email Service

**Primary:** Nodemailer SMTP transport
**Fallback:** Builder Mailer API (external HTTP API)
**Queue:** PostgreSQL `email_queue` table with retry logic

| Component | Responsibility |
|-----------|---------------|
| EmailService | Centralized email delivery via Nodemailer |
| EmailQueue | PostgreSQL-backed queue with retry logic (3 attempts, exponential backoff) |
| EmailDeadLetter | Failed emails after 3 attempts for manual review |
| EmailTemplates | HTML template generators for all email types |

**Email Types:**
- Welcome/verification
- Password reset
- Donation confirmation
- Donation receipt
- Pooja booking confirmation
- Pooja booking approval
- Subscription request received
- Subscription approved
- Subscription rejected
- Subscription expiry reminder
- Renewal reminder
- Payment confirmation
- Admin notification
- Booking message notification
- Contact inquiry notification
- Report delivery

### PDF Service

**Libraries:** PDFKit (primary), jsPDF (fallback)
**Output:** PDFKit for branded receipts/vouchers, jsPDF for simple documents

| Generator | Purpose |
|-----------|---------|
| DonationReceiptPDF | Donation receipt with temple branding |
| PoojaReceiptPDF | Pooja booking receipt with details |
| SubscriptionReceiptPDF | Premium subscription receipt |
| PaymentVoucherPDF | Expense payment voucher |

### Storage Service

**Adapter pattern** — abstracts storage backend:

| Adapter | Purpose |
|---------|---------|
| LocalAdapter | Default — local filesystem |
| S3Adapter | Future — AWS S3, MinIO, DigitalOcean Spaces |
| GCSAdapter | Future — Google Cloud Storage |

### Payment Gateway

**Current:** Manual bank transfer (no automated payment processing)
**Future consideration:** Stripe/PayPal integration for online payments
**Interface:** PaymentGatewayService with pluggable adapters

### Notification Service

**In-app notifications:** PostgreSQL-backed, real-time via polling (future: WebSocket)
**Email notifications:** Via EmailService queue
**Push notifications:** Not in current scope

### Background Jobs

**Scheduler:** `node-cron` for cron-based scheduling

| Job | Schedule | Owner Service |
|-----|----------|---------------|
| Auto-archive expired poojas | Every 5 minutes | BookingService |
| Auto-downgrade expired subscriptions | Daily at 00:00 | SubscriptionService |
| Renewal reminders (3-5 days before expiry) | Daily at 09:00 | SubscriptionService |
| Expiry reminders (7 days before) | Daily at 09:00 | SubscriptionService |
| Email queue processor | Every 1 minute | EmailService |
| Orphaned file cleanup | Weekly Sunday 03:00 | StorageService |
| Temp file cleanup | Hourly | StorageService |
| Audit log cleanup | Monthly 1st, 03:00 | AuditService |
| Notification cleanup (read, >30 days) | Weekly Sunday 03:00 | NotificationService |
| Database backup | Daily at 02:00 | Infrastructure |

### Logging

| Level | Usage | Destination |
|-------|-------|-------------|
| ERROR | Unhandled errors, service failures | stderr + file |
| WARN | Rate limits, validation failures, deprecation notices | stdout + file |
| INFO | Request completion, business events, audit | stdout + file |
| DEBUG | Query details, cache hits, token verification | stdout only (dev) |

**Structured logging:** JSON format with correlation ID, timestamp, level, message, context.

### Monitoring

| Metric | Tool | Purpose |
|--------|------|---------|
| Request latency | Prometheus (future) | API response time tracking |
| Error rate | Prometheus (future) | Error frequency monitoring |
| Database connections | Prisma metrics | Connection pool health |
| Email delivery rate | Custom metrics | Email queue health |
| Disk usage | OS monitoring | Storage capacity |

---

## 13. API Documentation Standards

### Endpoint Documentation

Every endpoint documented with:

1. **Title:** Clear, descriptive name
2. **Description:** What it does, when to use it
3. **HTTP method and path**
4. **Authentication requirements**
5. **Authorization requirements**
6. **Request parameters:** Path, query, body with types and validation rules
7. **Response format:** Success and error examples
8. **Possible errors:** All error codes with descriptions
9. **Business rules:** Any domain-specific logic
10. **Examples:** curl commands and response examples

### Request/Response Examples

Every endpoint includes at least:
- One successful request/response example
- One error response example
- One edge case example (if applicable)

### Error Catalog

Maintained as a separate reference document mapping every error code to:
- HTTP status code
- Description
- Possible causes
- Resolution steps
- Example response

### Authentication Examples

- How to obtain tokens (register, login)
- How to use tokens (Authorization header)
- How to refresh tokens
- How tokens expire and what to do

### Permission Matrix

A table mapping every endpoint to required roles and permissions (already defined in Section 5).

### Version History

Every API change documented with:
- Version number
- Date
- Changed endpoints
- Breaking changes
- Migration guide

### Deprecation Strategy

- Deprecated endpoints marked with `Deprecation: true` header
- `Sunset` header with deprecation date (6 months notice)
- Alternative endpoint documented in response body
- Deprecation logged for monitoring

---

## 14. Migration Strategy

### PocketBase → Express API Mapping

The current system uses two backends:
1. **PocketBase (Go binary)** — handles auth, CRUD, file storage, realtime, hooks
2. **Express API (Node.js)** — handles complex business logic (receipts, emails, reports)

**Target state:** Single Express API backend with PostgreSQL.

### Endpoints to Keep (Direct Migration)

These Express endpoints exist and will be migrated with minimal changes:

| Current PB Endpoint | New Express Endpoint | Changes |
|---------------------|---------------------|---------|
| `pb.collection('users').authWithPassword` | `POST /api/auth/login` | Replace PB SDK with JWT |
| `pb.collection('users').create` | `POST /api/auth/register` | Replace PB SDK with Prisma |
| `pb.collection('users').getOne` | `GET /api/users/:id` | Replace PB SDK with Prisma |
| `pb.collection('users').update` | `PATCH /api/users/:id` | Replace PB SDK with Prisma |
| `pb.collection('poojas').getFullList` | `GET /api/poojas` | Replace PB SDK with Prisma |
| `pb.collection('gallery').getFullList` | `GET /api/gallery` | Replace PB SDK with Prisma |
| `pb.collection('festivals').getFullList` | `GET /api/festivals` | Replace PB SDK with Prisma |

### Endpoints to Redesign

These endpoints need significant redesign due to current issues:

| Current Issue | New Design |
|---------------|------------|
| No auth on donation approve/reject | Add admin authorization middleware |
| No auth on booking approve/reject | Add admin authorization middleware |
| No auth on subscription approve/reject | Add admin authorization middleware |
| Hardcoded receipt data in receipts.js | Dynamic data from database |
| Duplicate templeAccounts.js / temple-accounts.js | Single TempleAccountsService |
| Multiple email transport initializations | Single EmailService singleton |
| Inline error handling (try/catch with res.status) | Global error middleware with error codes |

### Endpoints to Merge

| Current Endpoints | Merged Endpoint |
|-------------------|-----------------|
| `POST /admin-payments/approve-payment` + `PUT /admin-payments/:id/approve` | `PATCH /api/payments/:id/approve` |
| `POST /soft-delete/donation-remove` + `POST /soft-delete/donation-restore` | `PATCH /api/donations/:id/soft-delete` + `PATCH /api/donations/:id/restore` |
| `POST /temple-accounts/update-from-pooja` + `POST /temple-accounts/update-from-donation` | Internal `TempleAccountsService.addEntry()` (not exposed as endpoints) |
| `POST /receipts/generate-payment-receipt` + `POST /receipts-generator/` + `POST /subscription-receipt/generate` | `POST /api/payments/:id/receipt` |

### Endpoints to Remove

| Current Endpoint | Reason |
|------------------|--------|
| `GET /diagnostic/test` | Development only |
| `GET /diagnostic/schema/payment_records` | Security risk — exposes DB schema |
| `POST /test-email` | Development only |
| `GET /account-types` (hardcoded) | Replace with database query |
| `POST /pooja-bookings/` (no auth) | Replace with authenticated endpoint |
| `DELETE /pooja-bookings/:id` (no auth) | Replace with admin-only endpoint |
| `GET /health` (no dependency check) | Enhance with database health check |

### New Endpoints to Create

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/refresh` | Token refresh with rotation |
| `POST /api/auth/forgot-password` | Password reset request |
| `POST /api/auth/reset-password` | Password reset execution |
| `GET /api/auth/verify-email/:token` | Email verification |
| `GET /api/notifications` | In-app notifications |
| `GET /api/notifications/unread-count` | Notification count |
| `GET /api/audit` | Audit log query |
| `POST /api/reports/*` | Financial report generation |
| `GET /api/temple-accounts/summary` | Monthly summary |
| `POST /api/temple-accounts/export` | Excel export |

### Compatibility Considerations

- **Frontend dual client:** During migration, frontend uses both PocketBase SDK and Express API. After migration, only Express API.
- **File URLs:** PocketBase file URLs (`/api/files/...`) must be mapped to new storage paths
- **Real-time:** PocketBase subscriptions replaced with polling (or WebSocket in future)
- **Auth tokens:** PB tokens replaced with JWT. Frontend AuthContext completely rewritten.

### Migration Phases

| Phase | Scope | Risk |
|-------|-------|------|
| Phase 0 | Foundation (DB, Prisma, Storage, Email, Auth middleware) | Low |
| Phase 1 | Authentication (JWT, register, login, frontend auth) | High |
| Phase 2 | Independent domains (Gallery, Festivals, Contact, Bank, AI) | Low |
| Phase 3 | Users & Membership | Medium |
| Phase 4 | Subscriptions & Payments (hook consolidation) | High |
| Phase 5 | Donations & Temple Accounts & Expenses & Reports | Medium |
| Phase 6 | Pooja Booking | Medium |
| Phase 7 | Notifications, Messages, Audit | Low |
| Phase 8 | Cleanup, Cutover, Deployment | Medium |

---

## 15. API Consistency Checklist

Every endpoint must satisfy ALL items before being considered production-ready.

### REST Conventions

- [ ] Uses plural noun for resource name
- [ ] Uses correct HTTP method (GET for read, POST for create, etc.)
- [ ] Returns appropriate HTTP status code
- [ ] Returns consistent response envelope (`{ success, data, error }`)
- [ ] Does not use verbs in URL (except for action endpoints)
- [ ] Nested resources follow `{parent}/{parentId}/{child}` pattern

### Validation

- [ ] All path parameters validated (type, format, existence)
- [ ] All query parameters validated (type, range, defaults)
- [ ] All request body fields validated (required, type, format, length)
- [ ] File uploads validated (MIME type, size)
- [ ] Business rules validated (state machines, uniqueness, ownership)
- [ ] Validation errors return `VALIDATION_ERROR` with field-level details

### Authentication

- [ ] Public endpoints explicitly marked as public
- [ ] Protected endpoints require valid JWT
- [ ] Token extraction via `Authorization: Bearer` header
- [ ] Expired tokens return `TOKEN_EXPIRED` (401)
- [ ] Invalid tokens return `TOKEN_INVALID` (401)
- [ ] Missing tokens return appropriate 401

### Authorization

- [ ] Role requirements defined for every endpoint
- [ ] Admin endpoints check `req.user.role === 'admin'`
- [ ] Resource ownership checked for non-admin endpoints
- [ ] Premium access checked where required
- [ ] Insufficient permissions return `INSUFFICIENT_PERMISSIONS` (403)

### Transactions

- [ ] Multi-step write operations wrapped in database transactions
- [ ] Subscription approval: membership upgrade + payment approval + ledger entry
- [ ] Donation approval: status update + receipt generation + ledger entry
- [ ] Booking approval: status update + receipt generation + ledger entry
- [ ] Soft-delete: status update + ledger balance adjustment

### Logging

- [ ] Request received logged (DEBUG)
- [ ] Business events logged (INFO)
- [ ] Validation failures logged (WARN)
- [ ] Errors logged with stack trace (ERROR)
- [ ] Sensitive data masked in logs
- [ ] Correlation ID propagated through all logs

### Auditing

- [ ] Write operations logged to audit_logs
- [ ] Audit entry includes: user, action, entity, timestamp, IP
- [ ] Read operations NOT logged (performance)
- [ ] Admin actions logged with admin ID

### Error Handling

- [ ] All errors caught (no unhandled promise rejections)
- [ ] Errors return consistent error object
- [ ] Error codes are machine-readable and stable
- [ ] Stack traces hidden in production
- [ ] Correlation ID included in error response
- [ ] 5xx errors logged at ERROR level
- [ ] 4xx errors logged at WARN level

### Performance

- [ ] List endpoints support pagination
- [ ] List endpoints support sorting
- [ ] List endpoints support filtering
- [ ] List endpoints support search (where applicable)
- [ ] File uploads use streaming (not full buffer in memory for large files)
- [ ] Database queries use indexes (no full table scans)
- [ ] N+1 queries avoided (use includes/joins)
- [ ] Response payloads minimized (field selection where applicable)

### Security

- [ ] No secrets in code or logs
- [ ] CORS configured for specific origins (not `*`)
- [ ] Rate limiting applied to all endpoints
- [ ] File uploads validated (MIME type, size)
- [ ] Input sanitized (HTML tags stripped, SQL injection prevented)
- [ ] Output encoded (XSS prevention)
- [ ] HttpOnly cookies for refresh tokens
- [ ] Secure cookies in production (HTTPS only)

### Documentation

- [ ] Endpoint purpose documented
- [ ] Request parameters documented with types
- [ ] Response format documented with examples
- [ ] Error codes documented with descriptions
- [ ] Business rules documented
- [ ] Authentication requirements documented
- [ ] Authorization requirements documented

---

*End of API Architecture Blueprint.*
*This document is the permanent reference for the PocketBase → PostgreSQL API migration.*
