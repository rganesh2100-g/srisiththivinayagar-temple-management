# Security Architecture Blueprint

**Sri Siththi Vinayagar Temple — Enterprise Security Architecture**
**Version:** 1.0 | **Date:** 2026-07-11 | **Status:** Pre-Implementation Blueprint
**Stack:** PostgreSQL, Prisma ORM, Express 5, Node 22, React 18, JWT Authentication

---

## Table of Contents

- [PART 1 — Security Philosophy](#part-1--security-philosophy)
- [PART 2 — Authentication Architecture](#part-2--authentication-architecture)
- [PART 3 — Authorization Architecture](#part-3--authorization-architecture)
- [PART 4 — User Roles](#part-4--user-roles)
- [PART 5 — API Security](#part-5--api-security)
- [PART 6 — Database Security](#part-6--database-security)
- [PART 7 — Password Security](#part-7--password-security)
- [PART 8 — JWT Security](#part-8--jwt-security)
- [PART 9 — Secrets Management](#part-9--secrets-management)
- [PART 10 — Data Protection](#part-10--data-protection)
- [PART 11 — Audit Security](#part-11--audit-security)
- [PART 12 — Logging Security](#part-12--logging-security)
- [PART 13 — File Security](#part-13--file-security)
- [PART 14 — Financial Security](#part-14--financial-security)
- [PART 15 — Email Security](#part-15--email-security)
- [PART 16 — Admin Security](#part-16--admin-security)
- [PART 17 — Infrastructure Security](#part-17--infrastructure-security)
- [PART 18 — Threat Modeling](#part-18--threat-modeling)
- [PART 19 — Migration Security](#part-19--migration-security)
- [PART 20 — Master Security Checklist](#part-20--master-security-checklist)

---

# PART 1 — Security Philosophy

## 1.1 Security Principles

The security architecture for this temple management platform is built on five foundational principles. Every architectural decision is evaluated against these principles before implementation.

**Principle 1: Defense in Depth.** No single security mechanism is trusted as the sole defense. Authentication, authorization, validation, encryption, and auditing layer upon each other. If one layer fails, subsequent layers continue to protect the system. An attacker who bypasses input validation still faces parameterized queries. An attacker who steals a JWT still cannot access other users' data without authorization checks.

**Principle 2: Least Privilege.** Every component — user, service, repository, cron job — receives only the minimum permissions necessary to perform its function. The GalleryService cannot modify financial records. The ExpenseService cannot approve subscriptions. A free member cannot access premium features. An admin cannot bypass audit logging.

**Principle 3: Zero Trust.** No request is trusted by default, regardless of origin. Every request is authenticated, authorized, and validated. Internal service calls are not exempt from validation. The trust boundary exists at the JWT verification layer, and every request crossing that boundary is verified independently.

**Principle 4: Secure by Default.** When a developer adds a new endpoint, it is unauthenticated by default. When a new field is added to a collection, it is not publicly readable by default. When a new role is created, it has zero permissions until explicitly granted. Security is the default state; access must be deliberately enabled.

**Principle 5: Data Protection as a First-Class Concern.** This platform handles financial transactions (donations, payments, subscriptions), personal data (names, emails, phone numbers, addresses), and membership data. Data protection is not an afterthought — it is a core architectural requirement.

## 1.2 Defense in Depth Layers

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: Network Security                          │
│  HTTPS, TLS 1.3, reverse proxy, firewall            │
├─────────────────────────────────────────────────────┤
│  LAYER 2: Transport Security                        │
│  CORS, headers, compression, request limits         │
├─────────────────────────────────────────────────────┤
│  LAYER 3: Authentication                            │
│  JWT verification, token validation, session mgmt   │
├─────────────────────────────────────────────────────┤
│  LAYER 4: Authorization                             │
│  RBAC, ownership checks, policy evaluation          │
├─────────────────────────────────────────────────────┤
│  LAYER 5: Input Validation                          │
│  Zod schemas, type checking, sanitization           │
├─────────────────────────────────────────────────────┤
│  LAYER 6: Business Logic                            │
│  State transitions, duplicate prevention, rules     │
├─────────────────────────────────────────────────────┤
│  LAYER 7: Data Access                               │
│  Prisma parameterized queries, repository pattern   │
├─────────────────────────────────────────────────────┤
│  LAYER 8: Output Filtering                          │
│  Response sanitization, no sensitive data leakage   │
├─────────────────────────────────────────────────────┤
│  LAYER 9: Logging and Auditing                      │
│  Immutable audit trails, security event logging     │
├─────────────────────────────────────────────────────┤
│  LAYER 10: Monitoring and Response                  │
│  Health checks, anomaly detection, incident response│
└─────────────────────────────────────────────────────┘
```

## 1.3 Data Classification

| Classification | Description | Examples | Handling |
|---|---|---|---|
| **Public** | Information freely available to anyone | Temple name, address, pooja list, festival dates, gallery images, payment account QR codes | No auth required. Cached aggressively. |
| **Internal** | Information for authenticated users | User's own profile, own booking history, own donation history, system settings | Auth required. User-scoped access. |
| **Confidential** | Sensitive business data | Donation amounts, payment records, subscription details, financial reports, user email/phone | Admin-only or owner-only. No bulk export without approval. |
| **Restricted** | Highly sensitive operational data | Password hashes, JWT secrets, bank account numbers, admin action logs, audit trails | Encrypted at rest. Minimal access. Never logged in plaintext. |
| **Highly Sensitive** | Critical system secrets | Database credentials, SMTP passwords, OAuth client secrets, encryption keys | Environment variables only. Never in code. Rotation policy enforced. |

## 1.4 Security Boundaries

| Boundary | Trust Level | Protected By |
|---|---|---|
| **Internet → Reverse Proxy** | Untrusted | TLS termination, rate limiting, IP filtering |
| **Reverse Proxy → Express** | Semi-trusted | CORS, headers, request size limits |
| **Express → Service Layer** | Trusted | JWT verification, input validation |
| **Service Layer → Repository** | Trusted | Authorization checks, parameterized queries |
| **Repository → Database** | Trusted | Prisma schema constraints, connection pooling |
| **External Services (SMTP, OAuth)** | Semi-trusted | TLS, API key authentication, response validation |

## 1.5 Trust Zones

```
┌─────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                            │
│              (Public Internet, Anonymous Users)              │
├─────────────────────────────────────────────────────────────┤
│                    DMZ (Reverse Proxy)                       │
│         TLS Termination, Rate Limiting, Static Files         │
├─────────────────────────────────────────────────────────────┤
│                    SEMI-TRUSTED ZONE                         │
│           (Authenticated Users, Free Members)                │
│         JWT Required, Role Verified, Input Validated         │
├─────────────────────────────────────────────────────────────┤
│                    TRUSTED ZONE                              │
│         (Premium Members, Volunteers, Staff)                 │
│         Enhanced Permissions, Financial Access               │
├─────────────────────────────────────────────────────────────┤
│                    HIGHLY TRUSTED ZONE                       │
│         (Admins, Super Admins)                               │
│         Full System Access, Audit Trail, Financial Control   │
├─────────────────────────────────────────────────────────────┤
│                    INTERNAL ZONE                             │
│         (Services, Repositories, Database)                   │
│         No Network Exposure, Encrypted Connections           │
└─────────────────────────────────────────────────────────────┘
```

## 1.6 Threat Model Summary

| Threat Category | Risk Level | Primary Mitigation |
|---|---|---|
| Unauthorized data access | High | RBAC + ownership checks |
| Financial fraud | High | Approval workflows + audit trails |
| Identity theft | High | Password hashing + token security |
| Data tampering | Medium | Audit logging + immutability |
| Service disruption | Medium | Rate limiting + input validation |
| Data leakage | Medium | Output filtering + classification |
| Insider threats | Medium | Audit trails + least privilege |
| Supply chain attacks | Low | Dependency scanning + pinning |

---

# PART 2 — Authentication Architecture

## 2.1 Authentication Overview

The system supports two authentication methods:
1. **Email/Password authentication** — primary method
2. **Google OAuth 2.0** — secondary method

Both methods produce the same JWT token pair. The system does not distinguish between authentication methods after login.

## 2.2 JWT Token Structure

**Access Token** (short-lived):
```
{
  sub: userId,
  email: user.email,
  role: user.role,
  iat: issuedAt,
  exp: expiresAt (15 minutes from issuance),
  iss: "vinayagar-temple",
  jti: uniqueTokenId
}
```

**Refresh Token** (long-lived):
```
{
  sub: userId,
  jti: uniqueTokenId,
  iat: issuedAt,
  exp: expiresAt (7 days from issuance),
  iss: "vinayagar-temple",
  type: "refresh"
}
```

## 2.3 Token Lifecycle

```
Registration/Login
  → Password verified
  → Access Token issued (15 min)
  → Refresh Token issued (7 days)
  → Refresh Token stored in httpOnly cookie
  → Access Token returned in response body

Token Refresh
  → Refresh Token validated
  → Refresh Token rotated (old revoked, new issued)
  → New Access Token issued
  → New Refresh Token issued

Logout
  → Refresh Token revoked
  → Access Token remains valid until expiry (15 min max)
  → Client discards Access Token

Token Expiry
  → Access Token expires → client must refresh
  → Refresh Token expires → user must re-authenticate
```

## 2.4 Login Flow

```
1. Client sends POST /auth/login { email, password }
2. Controller validates input (Zod schema)
3. AuthService verifies credentials:
   a. Find user by email
   b. If not found: generic error "Invalid credentials" (no email enumeration)
   c. Compare password hash (bcrypt)
   d. If mismatch: generic error "Invalid credentials"
   e. If user.isDeleted: reject with "Account deactivated"
   f. If user.isBlocked: reject with "Account blocked"
4. Generate JWT access token (15 min)
5. Generate refresh token (7 days)
6. Store refresh token in httpOnly, secure, sameSite cookie
7. Log successful login (security log)
8. Return access token in response body
```

## 2.5 Logout Flow

```
1. Client sends POST /auth/logout
2. Extract refresh token from cookie
3. AuthService revokes refresh token:
   a. Remove from token store (database or cache)
   b. Mark as revoked
4. Clear refresh token cookie
5. Log logout event
6. Return 200 OK
```

Note: The access token is not revoked server-side. It expires naturally within 15 minutes. This is acceptable because access tokens are short-lived and stateless.

## 2.6 Password Reset Flow

```
1. Client sends POST /auth/password-reset-request { email }
2. AuthService:
   a. Find user by email
   b. If not found: return success anyway (prevent email enumeration)
   c. If found: generate password reset token (crypto.randomBytes)
   d. Store token hash in user record with expiry (1 hour)
   e. Send reset email with token link
   f. Log password reset request
3. Client sends POST /auth/password-reset-complete { token, newPassword }
4. AuthService:
   a. Find user by reset token hash
   b. If not found or expired: reject
   c. Validate new password against policy
   d. Hash new password (bcrypt, 12 rounds)
   e. Update password
   f. Invalidate all existing refresh tokens for user
   g. Clear reset token from user record
   h. Log password reset completion
   i. Send confirmation email
```

## 2.7 Email Verification Flow

```
1. On registration, generate email verification token
2. Send verification email with token link
3. Client sends POST /auth/verify-email { token }
4. AuthService:
   a. Find user by verification token
   b. If not found or expired: reject
   c. Set user.verified = true
   d. Clear verification token
   e. Log email verification
```

## 2.8 Google OAuth Flow

```
1. Client redirects to Google OAuth consent screen
2. Google redirects back with authorization code
3. Client sends code to POST /auth/oauth/google { code }
4. AuthService:
   a. Exchange code for Google access token (server-side)
   b. Fetch user profile from Google
   c. Find user by email:
      - If exists: link Google account (if not already linked)
      - If not exists: create new user with Google data
   d. Generate JWT tokens (same as email login)
   e. Return tokens
5. First-time OAuth users get:
   - account_type = "Free Member"
   - role = "user"
   - verified = true (Google-verified email)
```

## 2.9 Session Handling

The system is stateless. There are no server-side sessions. All state is in JWT tokens.

| Property | Value |
|---|---|
| Access token lifetime | 15 minutes |
| Refresh token lifetime | 7 days |
| Token storage (client) | Access: memory/localStorage; Refresh: httpOnly cookie |
| Token transmission | Authorization header (access); Cookie (refresh) |
| Concurrent sessions | Unlimited (each login issues new tokens) |
| Session invalidation | Refresh token revocation on logout |

## 2.10 Token Revocation

| Revocation Trigger | Method | Scope |
|---|---|---|
| User logout | Remove refresh token from store | Single session |
| Password change | Remove all refresh tokens for user | All sessions |
| Password reset | Remove all refresh tokens for user | All sessions |
| Admin blocks user | Remove all refresh tokens for user | All sessions |
| Admin deletes user | Remove all refresh tokens for user | All sessions |
| Token compromise (manual) | Admin revokes all tokens for user | All sessions |

Revocation is implemented via a token blacklist (cache-based initially, database-backed later).

## 2.11 Account Recovery

| Scenario | Recovery Path |
|---|---|
| Forgot password | Password reset via email |
| Lost Google access | Contact admin to link email/password |
| Blocked account | Contact admin to unblock |
| Deleted account | Contact admin to restore (within 30 days) |
| Compromised account | Admin force password reset + revoke all tokens |

---

# PART 3 — Authorization Architecture

## 3.1 RBAC Model

The system implements Role-Based Access Control with resource ownership awareness.

**Core concepts:**
- **Role:** A named set of permissions (e.g., `admin`, `user`)
- **Permission:** An allowed action on a resource (e.g., `donation:create`, `booking:approve`)
- **Ownership:** The relationship between a user and a resource they created
- **Policy:** A rule that evaluates context to grant or deny access

## 3.2 Permission Model

Permissions follow the format `resource:action`:

```
Resource Actions:
  create   — Create new entity
  read     — Read entity (list or view)
  update   — Modify entity
  delete   — Soft delete entity
  approve  — Approve pending entity
  reject   — Reject pending entity
  export   — Export entity data
  manage   — Full CRUD + approve/reject
```

## 3.3 Role Hierarchy

```
                    ┌──────────────┐
                    │  Super Admin │  (future — platform operator)
                    └──────┬───────┘
                           │ inherits
                    ┌──────▼───────┐
                    │  Temple Admin │
                    └──────┬───────┘
                           │ inherits
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼────────┐ ┌─▼──────────┐
       │  Treasurer  │ │ Auditor   │ │ Volunteer  │
       └──────┬──────┘ └───────────┘ └────────────┘
              │ inherits
       ┌──────▼──────────┐
       │ Premium Member  │
       └──────┬──────────┘
              │ inherits
       ┌──────▼──────────┐
       │   Free Member   │
       └──────┬──────────┘
              │ inherits
       ┌──────▼──────────┐
       │     Guest       │
       └─────────────────┘
```

## 3.4 Policy Evaluation

Every protected endpoint evaluates access through a policy chain:

```
1. Authentication check: Is the user authenticated?
   → No: Return 401

2. Role check: Does the user's role have the required permission?
   → No: Return 403

3. Ownership check: Is this a resource-specific action?
   → If ownership required: Does the user own this resource?
     → No: Return 403

4. Status check: Is the user blocked or deleted?
   → Yes: Return 403

5. Business rule check: Does this action violate a business constraint?
   → Yes: Return 422

6. All checks pass: Proceed with action
```

## 3.5 Ownership Rules

| Resource | Owner | Ownership Field | Admin Override |
|---|---|---|---|
| User | Self | `id = userId` | Yes |
| PoojaBooking | Booking creator | `userId` | Yes |
| Donation | Donor | `userId` | Yes |
| Subscription | Subscriber | `userId` | Yes |
| Payment | Payer | `userId` | Yes |
| VolunteerParticipation | Volunteer | `userId` | Yes |
| UserPreference | User | `userId` | Yes |
| AdminMessage | Recipient | `userId` | Yes (sender) |
| Gallery | Uploader | — (admin manages) | Yes |
| TempleAccount | — (admin only) | — | Yes |
| Expense | — (admin only) | — | Yes |

## 3.6 Permission Inheritance

Roles inherit permissions from lower roles:
- Temple Admin inherits all permissions from Premium Member, Treasurer, Auditor, Volunteer
- Premium Member inherits all permissions from Free Member
- Free Member inherits all permissions from Guest

## 3.7 Dynamic Permissions

Some permissions are context-dependent:

| Permission | Context | Rule |
|---|---|---|
| `booking:create` | User must be authenticated | `@request.auth.id != ''` |
| `booking:read` | Owner or admin | `booking.userId = @request.auth.id OR role = 'admin'` |
| `donation:approve` | Admin only | `role = 'admin'` |
| `subscription:read` | Owner or admin | `subscription.userId = @request.auth.id OR role = 'admin'` |
| `user:read` | Self or admin | `id = @request.auth.id OR role = 'admin'` |

## 3.8 ABAC Readiness

The architecture预留s for Attribute-Based Access Control:
- Services accept a `PermissionContext` object containing user attributes, resource attributes, and environment attributes
- Policy evaluation is centralized in an `AuthorizationService`
- Adding ABAC rules requires only extending the policy evaluation logic, not modifying individual endpoints

---

# PART 4 — User Roles

## 4.1 Guest

| Property | Value |
|---|---|
| **Description** | Unauthenticated visitor |
| **How obtained** | No authentication required |
| **Permissions** | `pooja:read` (list available poojas), `festival:read`, `gallery:read`, `payment_account:read`, `user:create` (registration) |
| **Restrictions** | Cannot create bookings, donations, or access any user-specific data |
| **Accessible modules** | Public pages only (home, poojas, festivals, gallery) |
| **Allowed actions** | Browse public content, register account |

## 4.2 Free Member

| Property | Value |
|---|---|
| **Description** | Registered user with free membership |
| **How obtained** | Registration (email/password or Google OAuth) |
| **Inherits** | All Guest permissions |
| **Additional Permissions** | `user:read` (own profile), `user:update` (own profile), `booking:create`, `booking:read` (own), `donation:create`, `donation:read` (own), `volunteer:create`, `volunteer:read` (own), `preference:read` (own), `preference:update` (own), `message:read` (own), `subscription:create` (request premium) |
| **Restrictions** | Cannot approve/reject anything. Cannot access premium features. Cannot view other users' data. Cannot access financial reports. |
| **Accessible modules** | Profile, My Bookings, My Donations, Volunteer, Subscription Request |
| **Allowed actions** | Manage own profile, create bookings/donations, request premium upgrade |

## 4.3 Premium Member

| Property | Value |
|---|---|
| **Description** | User with active paid membership |
| **How obtained** | Approved subscription or payment |
| **Inherits** | All Free Member permissions |
| **Additional Permissions** | `pooja:read` (premium poojas), `premium_content:read`, `premium_booking:create`, `subscription:read` (own), `subscription:renew` (own) |
| **Restrictions** | Still cannot access admin features, financial data, or other users' data |
| **Accessible modules** | All Free Member modules + Premium features |
| **Allowed actions** | All Free Member actions + access premium-only content and poojas |

## 4.4 Volunteer

| Property | Value |
|---|---|
| **Description** | User who participates in temple events |
| **How obtained** | Admin assignment or self-registration (pending approval) |
| **Inherits** | All Free Member permissions |
| **Additional Permissions** | `volunteer:read` (own + assigned events), `volunteer:update` (own participation), `event:read` (volunteer events) |
| **Restrictions** | Cannot manage other volunteers. Cannot access financial data. |
| **Accessible modules** | All Free Member modules + Volunteer Dashboard |
| **Allowed actions** | View assigned events, log participation hours, update status |

## 4.5 Treasurer

| Property | Value |
|---|---|
| **Description** | Staff member responsible for financial management |
| **How obtained** | Admin assignment |
| **Inherits** | All Premium Member permissions |
| **Additional Permissions** | `temple_account:read`, `temple_account:create`, `expense:read`, `expense:create`, `expense:update`, `donation:read` (all), `payment:read` (all), `financial_report:read`, `financial_report:export` |
| **Restrictions** | Cannot approve/reject subscriptions. Cannot manage users. Cannot modify system settings. |
| **Accessible modules** | All Premium modules + Financial Management |
| **Allowed actions** | View financial data, record expenses, generate reports |

## 4.6 Auditor

| Property | Value |
|---|---|
| **Description** | Staff member who reviews and audits financial records |
| **How obtained** | Admin assignment |
| **Inherits** | All Premium Member permissions |
| **Additional Permissions** | `temple_account:read` (all), `expense:read` (all), `donation:read` (all), `payment:read` (all), `audit_log:read`, `financial_report:read`, `financial_report:export` |
| **Restrictions** | Read-only access to financial data. Cannot create, update, or delete. Cannot manage users. |
| **Accessible modules** | All Premium modules + Audit Reports |
| **Allowed actions** | View all financial records, view audit logs, export reports |

## 4.7 Temple Admin

| Property | Value |
|---|---|
| **Description** | Full administrative access to the platform |
| **How obtained** | Manually set in database by Super Admin |
| **Inherits** | All lower role permissions |
| **Additional Permissions** | `user:read` (all), `user:update` (all), `user:block`, `user:restore`, `user:delete`, `booking:read` (all), `booking:approve`, `booking:reject`, `donation:read` (all), `donation:approve`, `donation:reject`, `subscription:read` (all), `subscription:approve`, `subscription:reject`, `payment:read` (all), `payment:approve`, `payment:reject`, `pooja:manage`, `festival:manage`, `gallery:manage`, `settings:manage`, `page_access:manage`, `message:send` (admin), `report:read` (all), `report:export` (all) |
| **Restrictions** | Cannot modify JWT secrets. Cannot access database directly. All critical actions are audit-logged. |
| **Accessible modules** | All modules |
| **Allowed actions** | Full administrative control |

## 4.8 Super Admin

| Property | Value |
|---|---|
| **Description** | Platform operator (future — for multi-tenant) |
| **How obtained** | Database seed or migration |
| **Inherits** | All Temple Admin permissions |
| **Additional Permissions** | `system:manage`, `secret:rotate`, `backup:manage`, `admin:create` |
| **Restrictions** | Cannot be blocked or deleted by other admins |
| **Accessible modules** | All modules + System Management |
| **Allowed actions** | Platform-level operations |

## 4.9 System

| Property | Value |
|---|---|
| **Description** | Internal system processes (cron jobs, background tasks) |
| **How obtained** | Internal API key or bypass |
| **Permissions** | Execute background jobs, send emails, generate reports |
| **Restrictions** | Cannot access user-facing endpoints. Cannot modify user data directly. |

---

# PART 5 — API Security

## 5.1 Authentication Enforcement

| Endpoint Category | Auth Required | Implementation |
|---|---|---|
| Public endpoints (GET poojas, festivals, gallery) | No | Middleware bypass |
| Registration, login | No | Rate-limited |
| User-specific endpoints | Yes (JWT) | Middleware verifies token |
| Admin endpoints | Yes (JWT + admin role) | Middleware verifies token + role |
| Financial endpoints | Yes (JWT + admin/treasurer role) | Middleware verifies token + role + ownership |

## 5.2 Authorization Enforcement

Every controller method specifies:
- Required role(s)
- Whether ownership check is needed
- Resource type for ownership evaluation

The authorization middleware evaluates these specifications before the controller method executes.

## 5.3 Request Validation

| Validation Layer | Tool | What It Checks |
|---|---|---|
| **Schema validation** | Zod | Types, required fields, formats, ranges, enums |
| **Business validation** | Service methods | State transitions, referential integrity, business rules |
| **Sanitization** | Middleware | HTML stripping, SQL character escaping (handled by Prisma) |

Every incoming request passes through schema validation before reaching the controller. Invalid requests receive 400 responses without touching business logic.

## 5.4 Input Sanitization

| Input Type | Sanitization |
|---|---|
| Text fields | Trim whitespace, strip HTML tags |
| Email fields | Lowercase, trim, validate format |
| Phone fields | Strip non-numeric characters, validate length |
| Numeric fields | Parse as number, validate range |
| Date fields | Parse as Date, validate range |
| File uploads | Validate MIME type, file size, scan filename for path traversal |
| JSON fields | Parse and validate structure |

## 5.5 Output Filtering

| Scenario | Rule |
|---|---|
| User list (admin) | Never return `password`, `tokenKey`, `passwordResetToken` |
| User profile (self) | Never return `password`, `tokenKey` |
| Public user data | Only return `name`, `avatar` |
| Financial data (admin) | Return all financial fields |
| Financial data (non-admin) | Return only user's own financial data |
| Error responses | Never return stack traces, SQL queries, or internal paths |
| Audit logs | Return sanitized entries, no raw database content |

## 5.6 Rate Limiting

| Endpoint | Limit | Window | Action on Exceed |
|---|---|---|---|
| Login | 5 attempts | 15 minutes | 429 + 15 min lockout |
| Password reset request | 3 attempts | 1 hour | 429 + generic success response |
| Registration | 3 accounts | 1 hour per IP | 429 |
| API general | 100 requests | 1 minute | 429 |
| File upload | 10 uploads | 1 minute | 429 |
| Admin bulk operations | 10 operations | 1 minute | 429 |
| Password reset completion | 3 attempts | 1 hour | 429 |

Rate limiting is applied per IP address for unauthenticated endpoints and per user ID for authenticated endpoints.

## 5.7 CORS Configuration

```
Development:
  Origin: http://localhost:3000
  Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
  Credentials: true
  Max Age: 86400

Production:
  Origin: https://vinayagar-temple.com (configurable)
  Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
  Credentials: true
  Max Age: 86400
```

Wildcard `*` origin is NEVER used in production.

## 5.8 Security Headers

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Content-Security-Policy` | `default-src 'self'` | Prevent XSS, data injection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unnecessary APIs |
| `Cache-Control` | `no-store` for authenticated responses | Prevent token caching |

## 5.9 Request Size Limits

| Request Type | Maximum Size | Action on Exceed |
|---|---|---|
| JSON body | 1 MB | 413 Payload Too Large |
| Form data | 1 MB | 413 |
| File upload | 20 MB | 413 |
| URL query string | 2 KB | 414 URI Too Long |

## 5.10 File Upload Validation

| Check | Rule | Action on Fail |
|---|---|---|
| MIME type | Whitelist per endpoint | 400 Bad Request |
| File extension | Must match MIME type | 400 Bad Request |
| File size | Per-type limit (20MB default) | 413 |
| Filename | No path traversal characters | 400 Bad Request |
| Magic bytes | Validate file header matches MIME | 400 Bad Request |
| Virus scan | Future: ClamAV integration | 400 Bad Request |

---

# PART 6 — Database Security

## 6.1 Access Model

| Component | Database Access | Method |
|---|---|---|
| Express controllers | No direct access | Through services and repositories |
| Services | No direct access | Through repositories |
| Repositories | Read/Write | Prisma Client (parameterized queries) |
| Background jobs | Read/Write | Through services |
| Migrations | DDL | Prisma Migrate |
| Direct SQL | Rare, controlled | Prisma `$queryRaw` with parameterized queries |

No raw SQL concatenation is permitted anywhere in the codebase. All database interactions use Prisma's query builder or parameterized raw queries.

## 6.2 Repository Restrictions

| Restriction | Implementation |
|---|---|
| No direct PrismaClient in controllers | Enforced by code review convention |
| No raw SQL in services | Enforced by code review convention |
| Soft delete filtering | Repository automatically adds `isDeleted: false` |
| Field selection | Repositories never return `password` or `tokenKey` |
| Connection pooling | Prisma manages pool (configurable limit) |

## 6.3 Soft Delete Protection

| Entity | Soft Delete Support | Hard Delete |
|---|---|---|
| User | Yes (`isDeleted`, `deletedAt`) | Admin only, logged, irreversible |
| PoojaBooking | Yes | Admin only, logged |
| Donation | Yes | Admin only, logged |
| Pooja | Yes | Admin only, logged |
| All others | Some have it | Not exposed through API |

Hard delete is only available through a dedicated admin endpoint that requires:
1. Super Admin role
2. Confirmation token
3. Audit logging
4. Reason provided

## 6.4 Audit Protection

Audit logs are append-only:
- No update endpoint exists
- No delete endpoint exists
- Database constraint prevents modification
- Audit table has no foreign key cascades that could auto-delete entries
- Retention policy is enforced by scheduled cleanup (not manual deletion)

## 6.5 Sensitive Columns

| Column | Entity | Protection |
|---|---|---|
| `password` | User | Bcrypt hash, never returned in API responses |
| `tokenKey` | User | Never returned in API responses |
| `passwordResetToken` | User | Hash stored, never returned |
| `emailVerificationToken` | User | Hash stored, never returned |
| `bankAccountNumber` | PaymentAccount | Encrypted at rest (future) |
| `iban` | PaymentAccount | Encrypted at rest (future) |

## 6.6 Encryption Strategy

| Data | Current | Future |
|---|---|---|
| Passwords | Bcrypt (12 rounds) | Bcrypt (12 rounds) |
| JWT tokens | HMAC-SHA256 signing | HMAC-SHA256 signing |
| Database connection | TLS in transit | TLS in transit |
| Bank account numbers | Plain text (internal only) | AES-256-GCM at rest |
| IBAN | Plain text (internal only) | AES-256-GCM at rest |
| File storage | Local filesystem | S3 with SSE |

## 6.7 Backup Security

| Property | Value |
|---|---|
| Frequency | Daily at 01:00 UTC |
| Retention | 30 days |
| Encryption | Backup files encrypted with dedicated key |
| Access | Backup directory readable only by system user |
| Storage | Local (future: offsite S3) |
| Verification | Weekly restore test to verify backup integrity |

## 6.8 Data Integrity

| Mechanism | Purpose |
|---|---|
| Prisma schema constraints | Enforce data types, required fields, relations |
| Database constraints | Unique indexes, foreign keys, check constraints |
| Optimistic locking | Prevent lost updates on concurrent modifications |
| Audit trails | Track all mutations for forensic analysis |
| Backup verification | Ensure backups are restorable |

---

# PART 7 — Password Security

## 7.1 Hashing

| Property | Value |
|---|---|
| Algorithm | bcrypt |
| Rounds | 12 (configurable via environment) |
| Library | bcryptjs (pure JS, no native dependencies) |
| Salt | Automatic (bcrypt generates per-hash) |
| Hash format | `$2b$12$...` (standard bcrypt format) |

## 7.2 Password Policy

| Rule | Minimum | Maximum |
|---|---|---|
| Length | 8 characters | 128 characters |
| Uppercase letters | 0 (recommended: 1) | — |
| Lowercase letters | 0 (recommended: 1) | — |
| Numbers | 0 (recommended: 1) | — |
| Special characters | 0 (recommended: 1) | — |
| Whitespace | Allowed | — |
| Unicode | Allowed | — |

The policy is intentionally minimal at the schema level. Strong password guidance is provided client-side. The priority is length over complexity.

## 7.3 Password History

| Rule | Value |
|---|---|
| History tracking | Not implemented initially |
| Prevent reuse | Not enforced initially |
| Future implementation | Store last 5 password hashes, compare on change |

## 7.4 Reset Flow

Detailed in Part 2.6. Key security properties:
- Reset token is single-use
- Reset token expires in 1 hour
- Reset token is stored as hash (not plaintext)
- All existing sessions invalidated on reset
- Confirmation email sent after reset

## 7.5 Temporary Passwords

| Property | Value |
|---|---|
| Admin-generated passwords | Not supported |
| OAuth account password | Null (user must set via reset flow) |
| Account creation password | User-provided, validated against policy |

## 7.6 Account Lockout

| Trigger | Duration | Condition |
|---|---|---|
| 5 failed login attempts | 15 minutes | Per email address |
| 10 failed login attempts | 1 hour | Per email address |
| 20 failed login attempts | 24 hours | Per email address |

Lockout is implemented via rate limiter, not database state. Failed attempt count resets after successful login.

## 7.7 Brute Force Protection

| Layer | Mechanism |
|---|---|
| Rate limiting | 5 attempts per 15 minutes per IP |
| Account lockout | Progressive lockout per email |
| Generic error messages | "Invalid credentials" (no email enumeration) |
| CAPTCHA (future) | After 3 failed attempts |
| IP blocking (future) | After repeated lockouts from same IP |
| Monitoring | Alert on 100+ failed attempts per hour |

---

# PART 8 — JWT Security

## 8.1 Access Tokens

| Property | Value |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) |
| Expiry | 15 minutes |
| Payload | userId, email, role, iat, exp, iss, jti |
| Storage (client) | Memory or sessionStorage (not localStorage) |
| Transmission | Authorization: Bearer header |
| Stateless | Yes — no server-side storage |

## 8.2 Refresh Tokens

| Property | Value |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) |
| Expiry | 7 days |
| Payload | userId, jti, iat, exp, iss, type:"refresh" |
| Storage (client) | httpOnly, secure, sameSite:"strict" cookie |
| Rotation | Yes — new refresh token issued on each use |
| Server-side state | Yes — stored in database/cache for revocation |

## 8.3 Expiration Strategy

| Token | Lifetime | On Expiry |
|---|---|---|
| Access token | 15 minutes | Client must use refresh token |
| Refresh token | 7 days | User must re-authenticate |
| Password reset token | 1 hour | Token invalidated |
| Email verification token | 24 hours | Token invalidated |

## 8.4 Rotation Strategy

On every refresh request:
1. Validate the incoming refresh token
2. Check it against the token store (not revoked, not expired)
3. Generate new access token
4. Generate new refresh token
5. Revoke the old refresh token
6. Store the new refresh token
7. Return both new tokens

If a revoked refresh token is presented:
- The token store confirms revocation
- All refresh tokens for the user are revoked (security measure)
- The user must re-authenticate

## 8.5 Revocation Strategy

| Revocation Scope | Method |
|---|---|
| Single session | Revoke specific refresh token by `jti` |
| All user sessions | Revoke all refresh tokens for `userId` |
| Global emergency | Rotate JWT signing secret (invalidates all tokens) |

Revocation is checked on every refresh request. Access tokens are not checked against a revocation list (stateless design).

## 8.6 Signing Security

| Property | Value |
|---|---|
| Secret length | Minimum 256 bits (32 bytes) |
| Secret generation | `crypto.randomBytes(32).toString('hex')` |
| Secret storage | Environment variable `JWT_SECRET` |
| Secret rotation | Manual, with grace period for existing tokens |
| Algorithm enforcement | Server rejects tokens signed with unexpected algorithm |

## 8.7 Validation Steps

On every authenticated request:
1. Extract token from Authorization header
2. Verify signature using `JWT_SECRET`
3. Check `exp` claim (not expired)
4. Check `iss` claim (matches expected issuer)
5. Check `jti` claim (not in revocation list, for refresh tokens)
6. Extract `sub` (userId) and `role`
7. Attach to request context

## 8.8 Clock Skew

| Property | Value |
|---|---|
| Tolerance | 30 seconds |
| Purpose | Account for server time drift |
| Implementation | `clockTolerance` option in JWT verification |

---

# PART 9 — Secrets Management

## 9.1 Environment Variables

| Secret | Variable Name | Required | Description |
|---|---|---|---|
| JWT signing key | `JWT_SECRET` | Yes | Access token signing |
| JWT refresh key | `JWT_REFRESH_SECRET` | Yes | Refresh token signing |
| Database URL | `DATABASE_URL` | Yes | PostgreSQL connection string |
| SMTP password | `SMTP_PASS` | Yes | Email server password |
| Google OAuth secret | `GOOGLE_OAUTH_CLIENT_SECRET` | No | Google OAuth client |
| Encryption key | `ENCRYPTION_KEY` | Future | Data at-rest encryption |

## 9.2 Secrets Storage Rules

| Rule | Description |
|---|---|
| Never in code | No hardcoded secrets in source files |
| Never in version control | `.env` files are gitignored |
| Never in logs | Secrets are masked in all log output |
| Never in error messages | Internal errors never expose secrets |
| Environment variables only | All secrets accessed via `process.env` |
| Minimal exposure | Secrets loaded at startup, not passed between modules unnecessarily |

## 9.3 API Keys

| Key | Purpose | Storage |
|---|---|---|
| Google OAuth Client ID | OAuth flow | Environment variable |
| Google OAuth Client Secret | OAuth flow | Environment variable |
| SMTP credentials | Email sending | Environment variable |
| PocketBase superuser (migration only) | Data migration | Temporary, deleted after migration |

## 9.4 Rotation Strategy

| Secret | Rotation Frequency | Process |
|---|---|---|
| JWT secrets | Quarterly (recommended) | Generate new secret → deploy with grace period → revoke old tokens |
| Database password | Quarterly | Update password → update DATABASE_URL → restart |
| SMTP password | Quarterly | Update password → update SMTP_PASS → restart |
| OAuth secrets | Annually or on compromise | Update in Google Console → update environment |

## 9.5 Emergency Rotation

If a secret is suspected compromised:
1. Generate new secret immediately
2. Deploy with new secret (old tokens become invalid)
3. Notify all users to re-authenticate
4. Audit logs for unauthorized access using compromised secret
5. Document incident

---

# PART 10 — Data Protection

## 10.1 Data Classification Matrix

| Entity | Classification | Retention | Encryption | Access |
|---|---|---|---|---|
| **User.name** | Internal | Account lifetime | None (displayed) | Self + Admin |
| **User.email** | Confidential | Account lifetime | None (displayed) | Self + Admin |
| **User.password** | Restricted | Account lifetime | Bcrypt hash | Never displayed |
| **User.phone** | Confidential | Account lifetime | None | Self + Admin |
| **User.address** | Confidential | Account lifetime | None | Self + Admin |
| **User.avatar** | Internal | Account lifetime | None (file) | Self + Admin |
| **PoojaBooking.name** | Internal | 7 years | None | Owner + Admin |
| **PoojaBooking.email** | Confidential | 7 years | None | Owner + Admin |
| **PoojaBooking.donationAmount** | Confidential | 7 years | None | Owner + Admin |
| **Donation.amount** | Confidential | 7 years | None | Donor + Admin |
| **Donation.receiptPdf** | Confidential | Indefinite | None (file) | Donor + Admin |
| **Payment.transactionId** | Confidential | 7 years | None | Payer + Admin |
| **Payment.bankAccount** | Restricted | 7 years | Encrypted (future) | Admin only |
| **TempleAccount.amount** | Confidential | 10 years | None | Admin + Treasurer + Auditor |
| **Expense.amount** | Confidential | 7 years | None | Admin + Treasurer + Auditor |
| **Expense.billFile** | Confidential | 7 years | None (file) | Admin only |
| **PaymentAccount.bankName** | Internal | Until updated | None | Public |
| **PaymentAccount.accountNumber** | Restricted | Until updated | Encrypted (future) | Admin only |
| **PaymentAccount.iban** | Restricted | Until updated | Encrypted (future) | Admin only |
| **AuditLog.details** | Restricted | 365 days | None | Admin only |

## 10.2 Retention Policies

| Data Type | Retention | Action on Expiry |
|---|---|---|
| User accounts | Until deleted by user or admin | Soft delete, then hard delete after 30 days |
| Booking records | 7 years | Archive, then delete |
| Donation records | Indefinite (audit requirement) | Never auto-delete |
| Payment records | 7 years | Archive, then delete |
| Expense records | 7 years (tax requirement) | Archive, then delete |
| Audit logs | 365 days | Delete |
| Temporary files | 24 hours | Auto-delete |
| AI images | 30 days | Auto-delete |
| Password reset tokens | 1 hour | Auto-expire |
| Email verification tokens | 24 hours | Auto-expire |

## 10.3 Encryption at Rest

| Data | Current | Future |
|---|---|---|
| Passwords | Bcrypt hash | Bcrypt hash |
| Database | PostgreSQL file encryption (OS-level) | PostgreSQL TDE (Transparent Data Encryption) |
| File storage | OS-level filesystem encryption | S3 SSE (Server-Side Encryption) |
| Backups | Unencrypted (local) | Encrypted with dedicated key |
| Bank details | Plain text (internal) | AES-256-GCM application-level |

## 10.4 Encryption in Transit

| Connection | Protocol | Minimum Version |
|---|---|---|
| Client → Reverse Proxy | HTTPS | TLS 1.2 |
| Reverse Proxy → Express | HTTP (internal network) | — |
| Express → PostgreSQL | PostgreSQL SSL | TLS 1.2 |
| Express → SMTP | STARTTLS | TLS 1.2 |
| Express → Google OAuth | HTTPS | TLS 1.2 |

## 10.5 Deletion Policies

| Entity | Soft Delete | Hard Delete | Cascade |
|---|---|---|---|
| User | `isDeleted = true` | Admin only, 30 days after soft | Soft-deletes related bookings, preferences |
| PoojaBooking | `isDeleted = true` | Admin only, 90 days after soft | Soft-deletes related messages |
| Donation | `isDeleted = true` | Admin only, 90 days after soft | None |
| Pooja | `isDeleted = true` | Admin only | Soft-deletes related bookings |
| Gallery | Hard delete only | Admin only | Deletes file from storage |
| Expense | Hard delete only | Admin only | None |

---

# PART 11 — Audit Security

## 11.1 What Gets Audited

| Event | Details Logged |
|---|---|
| User registration | userId, email, timestamp, IP |
| User login | userId, timestamp, IP, method (email/oauth) |
| User logout | userId, timestamp |
| User profile update | userId, changed fields, old/new values |
| User block/unblock | userId, adminId, reason, timestamp |
| User soft delete | userId, adminId, reason |
| Booking create | bookingId, userId, poojaId, amount |
| Booking approve | bookingId, adminId, receiptNumber |
| Booking reject | bookingId, adminId, reason |
| Donation create | donationId, userId, amount |
| Donation approve | donationId, adminId |
| Subscription create | subscriptionId, userId, planType |
| Subscription approve | subscriptionId, adminId |
| Subscription reject | subscriptionId, adminId, reason |
| Payment create | paymentId, userId, amount |
| Payment approve | paymentId, adminId |
| Payment reject | paymentId, adminId, reason |
| Expense create | expenseId, amount, category, createdBy |
| Expense update | expenseId, changed fields |
| Temple account entry | entryId, amount, category, source |
| Permission change | userId, oldRole, newRole, adminId |
| Password reset | userId, timestamp |
| Failed login | email, timestamp, IP, reason |
| Rate limit hit | IP, endpoint, timestamp |
| File upload | userId, filename, size, type |
| File download | userId, fileId, timestamp |
| Admin action | adminId, action, target, details |

## 11.2 Who Can Read Audit Logs

| Role | Access |
|---|---|
| Super Admin | Full access, export |
| Temple Admin | Full access, export |
| Auditor | Read-only, export |
| Treasurer | Read-only (financial entries only) |
| All others | No access |

## 11.3 Who Can Export Audit Logs

| Role | Access |
|---|---|
| Super Admin | Full export (CSV, PDF) |
| Temple Admin | Full export |
| Auditor | Read-only export |

Export is audit-logged itself (who exported, when, what range).

## 11.4 Tamper Protection

| Mechanism | Implementation |
|---|---|
| Append-only table | No UPDATE or DELETE endpoints |
| Database constraint | Application-level enforcement |
| Sequence verification | Each log entry has sequential ID |
| Hash chain (future) | Each entry includes hash of previous entry |
| Read-only access | Most users cannot even read audit logs |

## 11.5 Integrity Verification

| Check | Frequency | Method |
|---|---|---|
| Sequential ID verification | Daily cron | Compare max ID vs count |
| Hash chain verification (future) | Daily cron | Verify hash of each entry matches previous |
| Export integrity | On export | Include checksum in export file |

## 11.6 Retention

| Log Type | Retention | Archive |
|---|---|---|
| Authentication events | 2 years | Archive to cold storage |
| Financial events | 10 years | Archive to cold storage |
| Data mutations | 365 days | Delete after retention |
| Security events | 2 years | Archive to cold storage |
| System events | 90 days | Delete |

---

# PART 12 — Logging Security

## 12.1 PII Masking

| Data | Masking Rule | Example |
|---|---|---|
| Email | Show first 3 chars + domain | `joh***@gmail.com` |
| Phone | Show last 4 digits | `***-***-1234` |
| Credit card | Never log | `[REDACTED]` |
| Bank account | Never log | `[REDACTED]` |
| Password | Never log (obvious) | `[REDACTED]` |
| JWT token | Show first 8 chars only | `eyJhbGci...` |
| IP address | Full (not PII in this context) | `192.168.1.1` |
| Name | Full (not sensitive) | `John Doe` |
| Address | Full (not sensitive in this context) | `123 Main St` |

## 12.2 Sensitive Data Filtering

| Data | Rule |
|---|---|
| Passwords | Never logged, even in debug mode |
| JWT secrets | Never logged |
| Database passwords | Never logged |
| SMTP passwords | Never logged |
| API keys | Never logged |
| File contents | Never logged (only metadata) |
| Request bodies | Logged but passwords/tokens redacted |
| Response bodies | Never logged (too large, contains sensitive data) |

## 12.3 Error Logging

| Error Type | What Is Logged | What Is NOT Logged |
|---|---|---|
| Validation error | Field name, validation rule | User input values (for sensitive fields) |
| Authentication error | Timestamp, IP, reason | Password, token |
| Authorization error | userId, resource, action | — |
| Database error | Error code, query (parameterized) | Query parameters for sensitive fields |
| External service error | Service name, error message | API keys, tokens |
| Unhandled exception | Full stack trace, request context | Secrets in environment |

## 12.4 Access Logging

| Event | What Is Logged |
|---|---|
| Successful login | userId, IP, user-agent, timestamp |
| Failed login | email (not userId), IP, user-agent, timestamp, reason |
| Logout | userId, timestamp |
| File download | userId, fileId, filename, timestamp |
| File upload | userId, filename, size, type, timestamp |
| Admin action | adminId, action, target, timestamp |
| API rate limit hit | IP, endpoint, timestamp |
| CORS rejection | Origin, endpoint, timestamp |

## 12.5 Security Events

Security events are logged at `warn` or `error` level with dedicated context:

| Event | Level | Context |
|---|---|---|
| Failed login attempt | warn | email, IP, attempt count |
| Account lockout triggered | error | email, IP, lockout duration |
| Rate limit exceeded | warn | IP, endpoint, request count |
| Invalid JWT presented | warn | IP, token prefix, reason |
| Unauthorized access attempt | warn | userId, resource, action |
| Permission denied | info | userId, resource, action |
| Suspicious file upload | error | userId, filename, MIME type |
| SQL injection attempt (detected by Prisma) | error | endpoint, IP |
| Admin privilege escalation attempt | error | userId, attempted action |

## 12.6 Correlation IDs

Every request receives a unique correlation ID (`req-{uuid}`). This ID:
- Is generated at the start of request processing
- Is included in all log entries for the request
- Is returned in the response header (`X-Request-ID`)
- Is used to trace requests across services
- Is used to correlate related log entries

## 12.7 Incident Logs

When a security incident is detected:
1. All related log entries are tagged with `incident: true`
2. Incident details are logged at `fatal` level
3. Alert is sent to admin (email)
4. Incident log includes:
   - Timestamp
   - Incident type
   - Affected users
   - Affected resources
   - Actions taken
   - Current status

---

# PART 13 — File Security

## 13.1 Upload Validation

| Check | Implementation | Failure Action |
|---|---|---|
| MIME type whitelist | Per-endpoint allowed types | 400 Bad Request |
| File extension | Must match MIME type | 400 Bad Request |
| File size | Per-type limits | 413 Payload Too Large |
| Filename sanitization | Strip `../`, `\`, null bytes | 400 Bad Request |
| Magic bytes | Validate file header | 400 Bad Request |
| Image dimensions | Max 4000x4000 pixels | 400 Bad Request |
| Video duration | Max 5 minutes | 400 Bad Request |

## 13.2 Allowed MIME Types

| Endpoint | Allowed Types | Max Size |
|---|---|---|
| User avatar | image/jpeg, image/png, image/webp | 5 MB |
| Gallery upload | image/jpeg, image/png, image/gif, image/webp, video/mp4, video/webm | 20 MB |
| Festival image | image/jpeg, image/png, image/webp | 5 MB |
| Expense bill | application/pdf, image/jpeg, image/png | 10 MB |
| Payment QR | image/jpeg, image/png, image/gif, image/webp | 2 MB |
| AI image | image/jpeg, image/png, image/webp | 10 MB |

## 13.3 Virus Scanning

| Status | Plan |
|---|---|
| Current | Not implemented (manual review for suspicious uploads) |
| Future | ClamAV integration via `clamscan` |
| Trigger | On every file upload |
| Action on detection | Delete file, log incident, notify admin |

## 13.4 Storage Isolation

| File Type | Storage Location | Access Control |
|---|---|---|
| User avatars | `uploads/users/{userId}/` | Owner + Admin |
| Gallery media | `uploads/gallery/{galleryId}/` | Public |
| Receipts | `uploads/receipts/` | Owner + Admin |
| Expense bills | `uploads/expenses/{expenseId}/` | Admin only |
| Payment QR | `uploads/payment-accounts/{accountId}/` | Public |
| AI images | `uploads/ai-images/{imageId}/` | Owner |
| Temporary | `uploads/temp/{sessionId}/` | System only |

## 13.5 Public Files

Public files are served through the API with proper Content-Type headers. They are NOT served directly from the filesystem. This prevents directory listing and ensures access logging.

## 13.6 Private Files

Private files require authentication and authorization:
1. Request includes file ID
2. Server verifies user has access to the file's parent entity
3. Server streams file with proper Content-Type
4. Access is logged

## 13.7 Temporary Uploads

| Property | Value |
|---|---|
| Location | `uploads/temp/{sessionId}/` |
| Lifetime | 24 hours |
| Cleanup | Cron job every 6 hours |
| Access | System only (no public URL) |

## 13.8 Download Authorization

| File Type | Who Can Download |
|---|---|
| User avatar | Owner, Admin |
| Gallery media | Anyone (public) |
| Receipt PDFs | Receipt owner, Admin |
| Expense bills | Admin only |
| Payment QR | Anyone (public) |
| AI images | Owner only |

---

# PART 14 — Financial Security

## 14.1 Donation Integrity

| Rule | Implementation |
|---|---|
| Amount validation | Must be > 0, max 1,000,000 |
| Duplicate prevention | Same user + same amount + same day → warning |
| Approval required | All donations require admin approval before ledger entry |
| Receipt generation | Receipt generated on approval, not on creation |
| Audit trail | Every donation mutation logged |
| Idempotency | Same donation cannot be approved twice |

## 14.2 Payment Integrity

| Rule | Implementation |
|---|---|
| Amount validation | Must match expected amount for plan type |
| Transaction ID uniqueness | No duplicate transaction IDs |
| Status transitions | Only valid transitions allowed (pending → approved/rejected) |
| Approval workflow | Admin must approve before subscription activation |
| Receipt tracking | Receipt number, generation timestamp, delivery status |
| Refund handling | Rejected after approval creates reversal entry |

## 14.3 Receipt Integrity

| Rule | Implementation |
|---|---|
| Unique receipt numbers | Format: `TYPE-YYYYMMDD-SEQUENCE` |
| Immutable once generated | Receipt number cannot be changed |
| Version tracking | Regeneration creates new version, old retained |
| PDF content | Cannot be edited after generation |
| Access control | Only owner and admin can view/download |

## 14.4 Voucher Integrity

| Rule | Implementation |
|---|---|
| Unique voucher numbers | Format: `VCH-YYYYMMDD-SEQUENCE` |
| Amount must match expense | Voucher amount equals expense amount |
| Category required | Every voucher linked to expense category |
| Admin only creation | Only admins/treasurers can create vouchers |

## 14.5 Ledger Protection

| Rule | Implementation |
|---|---|
| Append-only | TempleAccount entries cannot be deleted |
| Corrections via new entries | Corrections create new entries with negative amounts, not edits |
| Balance verification | Monthly reconciliation checks balance = income − expenses |
| Fund isolation | Each fund category tracked separately |
| Source linking | Every entry linked to source entity (donation, booking, subscription, expense) |

## 14.6 Approval Workflow

| Financial Action | Required Approver | Minimum Approvers |
|---|---|---|
| Donation approval | Admin | 1 |
| Payment approval | Admin | 1 |
| Subscription activation | Admin | 1 |
| Expense recording | Treasurer/Admin | 1 |
| Expense correction | Admin | 1 |
| Refund processing | Admin + note | 1 |
| Bulk financial export | Super Admin | 1 |

## 14.7 Fraud Prevention

| Threat | Mitigation |
|---|---|
| Fake donations (inflated amounts) | Admin review required, receipt verification |
| Duplicate payments | Transaction ID uniqueness check |
| Unauthorized refunds | Admin-only, audit-logged, reason required |
| Expense manipulation | Approval workflow, bill upload required |
| Ledger tampering | Append-only, audit trail, monthly reconciliation |
| Ghost members | Membership verification through payment records |

## 14.8 Duplicate Prevention

| Entity | Duplicate Check | Action |
|---|---|---|
| Donation | Same user + amount + date within 5 min | Warning, allows override |
| Booking | Same user + pooja + date + time slot | Reject |
| Payment | Same transaction_id | Reject |
| Subscription | Active subscription exists for user | Reject |
| Temple account entry | Same source entity + same date | Warning |

---

# PART 15 — Email Security

## 15.1 SPF (Sender Policy Framework)

| Property | Value |
|---|---|
| Status | Configured at DNS level |
| Purpose | Prevent email spoofing from unauthorized servers |
| Record | `v=spf1 include:_spf.google.com ~all` (if using Google SMTP) |

## 15.2 DKIM (DomainKeys Identified Mail)

| Property | Value |
|---|---|
| Status | Configured at DNS level |
| Purpose | Verify email was sent by authorized server |
| Implementation | SMTP provider handles signing |

## 15.3 DMARC (Domain-based Message Authentication)

| Property | Value |
|---|---|
| Status | Ready for configuration |
| Purpose | Policy for failed SPF/DKIM checks |
| Recommended record | `v=DMARC1; p=quarantine; rua=mailto:admin@vinayagar-temple.com` |

## 15.4 Template Security

| Rule | Implementation |
|---|---|
| No user input in templates | Templates use pre-defined variables only |
| HTML sanitization | Template variables are HTML-escaped |
| No JavaScript in templates | Templates are static HTML |
| No external resources | All assets (images, styles) are inline or local |
| Language variants | Separate templates per language |

## 15.5 HTML Sanitization

| Input | Sanitization |
|---|---|
| User name in email | HTML-escaped (`<` → `&lt;`) |
| User message in email | HTML-escaped |
| Admin notes in email | HTML-escaped |
| Template content | Pre-defined, not user-generated |

## 15.6 Attachment Validation

| Rule | Value |
|---|---|
| Max attachment size | 10 MB |
| Allowed types | PDF, JPEG, PNG |
| Filename sanitization | Strip special characters |
| Content-Type validation | Verify matches file content |
| Virus scan (future) | ClamAV integration |

## 15.7 Spoof Prevention

| Threat | Mitigation |
|---|---|
| Sender address spoofing | SPF/DKIM/DMARC at DNS level |
| Reply-to manipulation | Reply-to always set to official address |
| Template injection | User input never placed directly in email |
| Phishing via email | Consistent branding, official domain only |

---

# PART 16 — Admin Security

## 16.1 Admin Login

| Property | Value |
|---|---|
| Authentication method | Same as regular users (JWT) |
| Additional verification | Role check (`role = 'admin'`) |
| Session management | Same as regular users |
| Access logging | All admin logins logged with IP |

## 16.2 Admin Permissions

| Permission | Temple Admin | Treasurer | Auditor |
|---|---|---|---|
| User management | Full | Read-only | No |
| Booking management | Full | Read | Read |
| Donation management | Full | Read | Read |
| Payment management | Full | Read | Read |
| Subscription management | Full | No | No |
| Financial data | Full | Full | Read-only |
| Expense management | Full | Create/Update | Read-only |
| Report generation | Full | Full | Read-only |
| System settings | Full | No | No |
| Audit log access | Full | Financial only | Full |
| File management | Full | No | No |
| Page access management | Full | No | No |

## 16.3 Critical Actions

Critical actions require additional confirmation:

| Action | Confirmation Required |
|---|---|
| Delete user | Confirmation token + reason |
| Block user | Reason required |
| Reject subscription | Reason required |
| Process refund | Reason + notes required |
| Modify financial entry | Reason + notes required |
| Change user role | Confirmation token |
| Delete gallery item | Confirmation |
| Modify system settings | Confirmation |
| Export financial data | Confirmation + audit log |
| Rotate JWT secret | Super Admin only + confirmation |

## 16.4 Dual Confirmation

For irreversible or highly sensitive actions:

| Action | Required |
|---|---|
| User hard delete | Super Admin confirmation + reason |
| Financial correction | Admin + Auditor review |
| System setting change | Admin confirmation |
| Bulk data export | Admin confirmation |

## 16.5 Approval Workflows

| Workflow | Initiator | Approver | SLA |
|---|---|---|---|
| Subscription request | User | Admin | 7 days |
| Premium upgrade request | User | Admin | 7 days |
| Donation approval | System (auto on create) | Admin | 30 days |
| Booking approval | User | Admin | 7 days |
| Expense recording | Treasurer | Admin (if > threshold) | 3 days |

## 16.6 Session Timeout

| Property | Value |
|---|---|
| Access token lifetime | 15 minutes |
| Refresh token lifetime | 7 days |
| Idle timeout | Same as refresh token (7 days) |
| Absolute timeout | 30 days (forced re-authentication) |
| Concurrent sessions | Unlimited |

## 16.7 IP Restrictions (Future)

| Property | Plan |
|---|---|
| Current | No IP restrictions |
| Future | Admin panel restricted to whitelisted IPs |
| Implementation | Reverse proxy ACL or Express middleware |
| Fallback | VPN access for remote admin |

---

# PART 17 — Infrastructure Security

## 17.1 HTTPS

| Property | Value |
|---|---|
| Protocol | HTTPS (TLS 1.2+) |
| Certificate | Let's Encrypt (auto-renewal) |
| HSTS | Enabled with 1-year max-age |
| Redirect | HTTP → HTTPS redirect at reverse proxy |

## 17.2 Reverse Proxy

| Property | Value |
|---|---|
| Software | Nginx (recommended) or Apache |
| Functions | TLS termination, static file serving, rate limiting, request buffering |
| Configuration | Disable server version disclosure, disable directory listing |

## 17.3 TLS Configuration

| Property | Value |
|---|---|
| Minimum version | TLS 1.2 |
| Recommended version | TLS 1.3 |
| Cipher suites | Strong ciphers only (ECDHE, AES-GCM) |
| Certificate transparency | Enabled |

## 17.4 Hostinger Deployment

| Property | Value |
|---|---|
| Hosting type | VPS or Shared |
| Node.js version | 22 |
| Process manager | PM2 |
| SSL | Let's Encrypt via Hostinger |
| Backups | Daily via cron + Hostinger backup |
| Monitoring | PM2 monitoring + custom health checks |

## 17.5 Firewall Readiness

| Port | Service | Access |
|---|---|---|
| 80 | HTTP | Public (redirect to 443) |
| 443 | HTTPS | Public |
| 22 | SSH | Admin only (key-based) |
| 5432 | PostgreSQL | Internal only (localhost) |
| 8090 | PocketBase (dev) | Internal only |

## 17.6 Backup Security

| Property | Value |
|---|---|
| Frequency | Daily at 01:00 UTC |
| Retention | 30 days |
| Encryption | Encrypted with dedicated key |
| Storage | Local + offsite (future: S3) |
| Test | Weekly restore verification |
| Access | System user only |

## 17.7 Disaster Recovery

| Scenario | Recovery Plan |
|---|---|
| Database corruption | Restore from latest backup |
| Server failure | Deploy to new server from backup |
| Data breach | Rotate secrets, audit logs, notify users |
| Ransomware | Restore from offline backup |
| DNS failure | Wait for propagation, no action needed |

RTO (Recovery Time Objective): 4 hours
RPO (Recovery Point Objective): 24 hours (daily backups)

## 17.8 Health Endpoints

| Endpoint | Checks |
|---|---|
| `/hcgi/api/health` | API server status |
| `/hcgi/api/health/db` | Database connectivity |
| `/hcgi/api/health/email` | SMTP connectivity |
| `/hcgi/api/health/storage` | Filesystem accessibility |
| `/hcgi/api/health/disk` | Disk usage |

Health endpoints are publicly accessible (no auth required) for monitoring.

## 17.9 Monitoring

| Metric | Threshold | Action |
|---|---|---|
| API response time | > 2 seconds | Log warning |
| Database connections | > 80% pool | Log warning, alert |
| Disk usage | > 80% | Alert admin |
| Failed login attempts | > 100/hour | Alert admin |
| Memory usage | > 80% | Log warning |
| CPU usage | > 80% | Log warning |
| Error rate | > 5% of requests | Alert admin |

---

# PART 18 — Threat Modeling

## 18.1 SQL Injection

| Property | Value |
|---|---|
| **Risk** | High |
| **Impact** | Data breach, data modification, data deletion |
| **Mitigation** | Prisma ORM uses parameterized queries by default. No raw SQL concatenation. All `$queryRaw` uses template literals with parameters. |
| **Detection** | Prisma logs suspicious query patterns. WAF at reverse proxy. |
| **Recovery** | Restore from backup. Audit logs for affected data. |

## 18.2 Cross-Site Scripting (XSS)

| Property | Value |
|---|---|
| **Risk** | Medium |
| **Impact** | Session hijacking, data theft, defacement |
| **Mitigation** | Content-Security-Policy header. React auto-escapes by default. Server-side HTML sanitization for user input. No `dangerouslySetInnerHTML` usage. |
| **Detection** | CSP violation reports. Input validation anomalies. |
| **Recovery** | Invalidate affected sessions. Clean injected content. |

## 18.3 Cross-Site Request Forgery (CSRF)

| Property | Value |
|---|---|
| **Risk** | Low (JWT-based) |
| **Impact** | Unauthorized actions on behalf of authenticated user |
| **Mitigation** | JWT in Authorization header (not cookie for access token). SameSite=strict for refresh cookie. CORS restrictions. No cookie-based authentication for state-changing operations. |
| **Detection** | Unexpected origin in requests. CORS rejections. |
| **Recovery** | Invalidate affected tokens. |

## 18.4 Broken Authentication

| Property | Value |
|---|---|
| **Risk** | High |
| **Impact** | Account takeover, data breach |
| **Mitigation** | Bcrypt password hashing (12 rounds). JWT with short expiry (15 min). Refresh token rotation. Rate limiting on login. Account lockout. No email enumeration. |
| **Detection** | Failed login monitoring. Unusual login patterns. |
| **Recovery** | Force password reset. Revoke all tokens. |

## 18.5 Broken Authorization

| Property | Value |
|---|---|
| **Risk** | High |
| **Impact** | Unauthorized data access, privilege escalation |
| **Mitigation** | RBAC with ownership checks. Authorization middleware on every endpoint. Service-level permission verification. No direct database access from controllers. |
| **Detection** | Unauthorized access attempts logged. Permission denied events. |
| **Recovery** | Block affected user. Audit affected data. |

## 18.6 Privilege Escalation

| Property | Value |
|---|---|
| **Risk** | High |
| **Impact** | Admin access without authorization |
| **Mitigation** | Role cannot be self-modified. Role changes require admin. JWT role is server-generated. No client-side role manipulation possible. |
| **Detection** | Role change events logged. Admin action audit. |
| **Recovery** | Revert role. Revoke tokens. Audit admin actions. |

## 18.7 Mass Assignment

| Property | Value |
|---|---|
| **Risk** | Medium |
| **Impact** | Modification of unauthorized fields |
| **Mitigation** | Zod schemas whitelist allowed fields. Controller only destructures expected fields. Repository method signatures limit updateable fields. |
| **Detection** | Unexpected field in request logged. |
| **Recovery** | Revert unauthorized changes. |

## 18.8 Replay Attacks

| Property | Value |
|---|---|
| **Risk** | Low |
| **Impact** | Duplicate operations (double payment, double booking) |
| **Mitigation** | JWT jti claim for uniqueness. Idempotency keys for financial operations. Timestamp validation on tokens. |
| **Detection** | Duplicate request detection. |
| **Recovery** | Reverse duplicate operation. |

## 18.9 Brute Force

| Property | Value |
|---|---|
| **Risk** | Medium |
| **Impact** | Account compromise through password guessing |
| **Mitigation** | Rate limiting (5 attempts/15 min). Account lockout (progressive). CAPTCHA (future). Strong password policy. |
| **Detection** | Failed login monitoring. Lockout events. |
| **Recovery** | Account lockout. Force password reset. |

## 18.10 Credential Stuffing

| Property | Value |
|---|---|
| **Risk** | Medium |
| **Impact** | Account compromise using leaked credentials |
| **Mitigation** | Rate limiting. Account lockout. Unusual login detection (new IP, new device). Email notification on new login. |
| **Detection** | Login from new IP/device. Multiple accounts compromised from same IP. |
| **Recovery** | Force password reset for affected accounts. |

## 18.11 File Upload Attacks

| Property | Value |
|---|---|
| **Risk** | Medium |
| **Impact** | Remote code execution, storage exhaustion, malware distribution |
| **Mitigation** | MIME type whitelist. File size limits. Filename sanitization. Magic byte validation. Storage outside webroot. No execution of uploaded files. |
| **Detection** | Unusual file types. Large uploads. Suspicious filenames. |
| **Recovery** | Delete malicious files. Scan storage. |

## 18.12 Path Traversal

| Property | Value |
|---|---|
| **Risk** | Medium |
| **Impact** | Access to arbitrary files on server |
| **Mitigation** | Filename sanitization (strip `../`). Storage abstraction (no direct file path manipulation). Prisma handles file paths as strings. |
| **Detection** | Path traversal patterns in request logs. |
| **Recovery** | Block IP. Audit accessed files. |

## 18.13 Denial of Service (DoS)

| Property | Value |
|---|---|
| **Risk** | Medium |
| **Impact** | Service unavailability |
| **Mitigation** | Rate limiting. Request size limits. Connection limits. Timeout configuration. Reverse proxy buffering. |
| **Detection** | High request rate. Unusual traffic patterns. |
| **Recovery** | Scale resources. Block IPs. Enable CAPTCHA. |

## 18.14 Data Leakage

| Property | Value |
|---|---|
| **Risk** | Medium |
| **Impact** | Sensitive data exposure |
| **Mitigation** | Output filtering. Response headers. Error message sanitization. No stack traces in production. Classification-based access control. |
| **Detection** | Unusual data access patterns. Large data exports. |
| **Recovery** | Invalidate tokens. Audit accessed data. Notify affected users. |

## 18.15 Race Conditions

| Property | Value |
|---|---|
| **Risk** | Low |
| **Impact** | Double booking, double payment, inconsistent state |
| **Mitigation** | Database transactions for multi-entity operations. Optimistic locking on concurrent updates. Unique constraints on critical fields. |
| **Detection** | Optimistic lock exceptions. Duplicate record attempts. |
| **Recovery** | Retry operation. Manual resolution for financial discrepancies. |

## 18.16 Supply Chain Attacks

| Property | Value |
|---|---|
| **Risk** | Low |
| **Impact** | Malicious code injection via dependencies |
| **Mitigation** | Dependency locking (package-lock.json). Regular dependency updates. npm audit. Minimal dependencies. No unused packages. |
| **Detection** | npm audit warnings. Unusual package behavior. |
| **Recovery** | Revert to known-good dependency version. |

## 18.17 Insider Threats

| Property | Value |
|---|---|
| **Risk** | Low |
| **Impact** | Data theft, data tampering, financial fraud |
| **Mitigation** | Least privilege. Audit trails. Approval workflows for financial actions. No single admin can both create and approve financial entries. |
| **Detection** | Audit log anomalies. Unusual admin behavior. |
| **Recovery** | Revoke access. Audit affected data. Legal action if warranted. |

---

# PART 19 — Migration Security

## 19.1 PocketBase Security → Express Security

| PB Security | Current State | Express Equivalent | Improvement |
|---|---|---|---|
| **Auth** | PB built-in auth, password hashing | JWT + bcrypt (same) | Standard, more control |
| **Collection rules** | PB filter strings (injection risk) | Service-level RBAC (type-safe) | Eliminates injection risk |
| **File access** | PB storage API | StorageService (abstracted) | Better isolation |
| **CORS** | `*` (allows all origins) | Configurable, restricted | Major security improvement |
| **Rate limiting** | PB built-in (basic) | Express middleware (granular) | Better control |
| **Audit** | PB hooks (impractical) | AuditService (comprehensive) | Complete audit trail |
| **Validation** | PB field constraints | Zod schemas + service rules | Two-layer validation |
| **Error handling** | PB generic errors | Typed error classes | Better error tracking |

## 19.2 What Improves

| Area | PB Current | Express New | Improvement |
|---|---|---|---|
| CORS | `*` wildcard | Specific origins only | Prevents unauthorized cross-origin access |
| Authorization | PB filter strings (stringly-typed) | Service-level policy evaluation (type-safe) | Eliminates filter injection attacks |
| Audit | Partial (hooks) | Complete (AuditService) | Full audit trail for compliance |
| Validation | Schema-level only | Schema + business rules | Two-layer validation |
| Error handling | Generic | Typed with context | Better security monitoring |
| Logging | PB logs (limited) | Structured logging with PII masking | Better incident response |
| Password policy | PB defaults (min 10) | Configurable (min 8) | More control |
| Token management | PB tokens (opaque) | JWT (standard, verifiable) | Industry-standard security |

## 19.3 What Changes

| Area | PB Current | Express New | Impact |
|---|---|---|---|
| Session management | PB auth store | JWT tokens | Stateless, scalable |
| Auth state | Server-side sessions | Client-side tokens | Requires careful token handling |
| Real-time | PB SSE | REST polling (initial) | Reduced real-time security concerns |
| File storage | PB internal | StorageService | More control, more responsibility |
| Database access | PB API | Prisma direct | More control, more responsibility |

## 19.4 What Is Removed

| PB Feature | Reason |
|---|---|
| PB filter string injection | Replaced by type-safe Prisma queries |
| PB collection rules | Replaced by service-level RBAC |
| PB file handling API | Replaced by StorageService |
| PB OAuth (if customized) | Replaced by standard OAuth implementation |
| PB hook security bypass | All hooks become explicit service calls |

## 19.5 What Is Simplified

| Area | PB Complexity | Express Simplicity |
|---|---|---|
| Error handling | Inconsistent PB error format | Typed error classes with consistent responses |
| Auth flow | PB-specific auth store | Standard JWT (well-documented, widely understood) |
| File uploads | PB multipart handling | StorageService abstraction |
| Rate limiting | PB built-in (limited) | Express middleware (flexible) |
| CORS | PB config (permissive) | Express middleware (restrictive) |

---

# PART 20 — Master Security Checklist

## 20.1 Authentication

- [ ] JWT access tokens signed with strong secret (≥256 bits)
- [ ] JWT refresh tokens in httpOnly, secure, sameSite cookies
- [ ] Access token expiry: 15 minutes
- [ ] Refresh token expiry: 7 days
- [ ] Refresh token rotation on every use
- [ ] Token revocation on logout
- [ ] All tokens revoked on password change/reset
- [ ] Generic error messages (no email enumeration)
- [ ] Password hashing with bcrypt (12 rounds)
- [ ] Google OAuth integration secured
- [ ] Password reset token: single-use, 1-hour expiry
- [ ] Email verification token: 24-hour expiry

## 20.2 Authorization

- [ ] RBAC implemented on every protected endpoint
- [ ] Ownership checks on user-specific resources
- [ ] Role cannot be self-modified
- [ ] Admin permissions granularly defined
- [ ] Service-level permission verification (not just middleware)
- [ ] Dynamic permissions based on resource ownership
- [ ] Default deny (unauthenticated = no access)

## 20.3 Validation

- [ ] Zod schemas on all controller inputs
- [ ] Business rule validation in services
- [ ] State transition validation on status changes
- [ ] File upload validation (type, size, name)
- [ ] Input sanitization (HTML stripping, trimming)
- [ ] Numeric range validation
- [ ] Date range validation
- [ ] Duplicate prevention checks

## 20.4 Encryption

- [ ] Bcrypt for password hashing
- [ ] HMAC-SHA256 for JWT signing
- [ ] TLS 1.2+ for all external connections
- [ ] PostgreSQL SSL for database connection
- [ ] STARTTLS for SMTP connection
- [ ] HTTPS enforced via HSTS
- [ ] Bank details encryption at rest (future)
- [ ] Backup encryption (future)

## 20.5 Logging

- [ ] Structured JSON logging
- [ ] PII masking (email, phone, tokens)
- [ ] Correlation IDs on all requests
- [ ] Security events logged at appropriate levels
- [ ] No secrets in logs
- [ ] No stack traces in production
- [ ] Request context in all log entries
- [ ] Log rotation and retention

## 20.6 Auditing

- [ ] All entity mutations logged
- [ ] All admin actions logged
- [ ] All authentication events logged
- [ ] All financial mutations logged
- [ ] Audit logs append-only
- [ ] No audit log deletion through API
- [ ] Audit log export restricted to admin
- [ ] Audit log retention: 365 days minimum

## 20.7 Secrets

- [ ] No secrets in source code
- [ ] No secrets in version control
- [ ] No secrets in logs
- [ ] No secrets in error messages
- [ ] All secrets in environment variables
- [ ] `.env` files gitignored
- [ ] Secret rotation policy defined
- [ ] Emergency rotation procedure documented

## 20.8 Backups

- [ ] Daily automated backups
- [ ] 30-day retention
- [ ] Encrypted backup storage
- [ ] Weekly restore verification
- [ ] Offsite backup storage (future)
- [ ] Backup access restricted to system user
- [ ] Disaster recovery procedure documented
- [ ] RTO: 4 hours, RPO: 24 hours

## 20.9 Monitoring

- [ ] Health check endpoints operational
- [ ] Failed login monitoring
- [ ] Rate limit violation monitoring
- [ ] Error rate monitoring
- [ ] Disk usage monitoring
- [ ] Database connection monitoring
- [ ] Response time monitoring
- [ ] Admin alert on security anomalies

## 20.10 Incident Response

- [ ] Security incident procedure documented
- [ ] Incident logging mechanism
- [ ] Admin notification on incidents
- [ ] Token revocation procedure
- [ ] Password reset procedure for compromised accounts
- [ ] Data breach notification procedure (future)
- [ ] Post-incident review process

## 20.11 File Security

- [ ] MIME type validation on uploads
- [ ] File size limits enforced
- [ ] Filename sanitization
- [ ] Storage outside webroot
- [ ] No file execution from upload directory
- [ ] Private file access control
- [ ] Temporary file cleanup
- [ ] Virus scanning readiness

## 20.12 Financial Security

- [ ] Approval workflows for financial actions
- [ ] Duplicate prevention on payments/donations
- [ ] Receipt integrity (immutable once generated)
- [ ] Ledger append-only protection
- [ ] Monthly reconciliation process
- [ ] Financial export audit logging
- [ ] Refund approval workflow
- [ ] Fraud detection rules

## 20.13 API Security

- [ ] Rate limiting on all endpoints
- [ ] CORS configured (not wildcard)
- [ ] Security headers set
- [ ] Request size limits enforced
- [ ] No sensitive data in responses
- [ ] Error responses sanitized
- [ ] API versioning ready
- [ ] Health endpoints public, rest protected

## 20.14 Database Security

- [ ] No raw SQL concatenation
- [ ] Prisma parameterized queries
- [ ] Connection pooling configured
- [ ] Database user has minimal privileges
- [ ] Soft delete filtering automatic
- [ ] Sensitive columns never returned in queries
- [ ] Database backups encrypted
- [ ] Database access restricted to application server

## 20.15 Infrastructure Security

- [ ] HTTPS enforced
- [ ] TLS 1.2+ minimum
- [ ] Security headers configured
- [ ] Server version disclosure disabled
- [ ] Directory listing disabled
- [ ] Firewall configured
- [ ] SSH key-based authentication
- [ ] Database not exposed to internet

## 20.16 Compliance

- [ ] GDPR readiness (data export, deletion)
- [ ] Financial record retention (7 years)
- [ ] Audit trail integrity
- [ ] Data classification applied
- [ ] Privacy policy in place
- [ ] Terms of service in place
- [ ] Cookie consent (if applicable)
- [ ] Data processing agreement (if applicable)

## 20.17 Testing Readiness

- [ ] Security test cases defined
- [ ] Penetration testing planned
- [ ] Dependency vulnerability scanning (npm audit)
- [ ] Authentication test cases
- [ ] Authorization test cases
- [ ] Input validation test cases
- [ ] File upload test cases
- [ ] Financial operation test cases

---

## Appendix: Security Metrics

| Metric | Target | Measurement |
|---|---|---|
| Failed login rate | < 5% of login attempts | Daily monitoring |
| Rate limit violations | < 50/day | Daily monitoring |
| Audit log coverage | 100% of mutations | Weekly audit |
| Backup success rate | 100% | Daily verification |
| Mean time to detect (MTTD) | < 1 hour | Incident tracking |
| Mean time to respond (MTTR) | < 4 hours | Incident tracking |
| Dependency vulnerabilities | 0 critical/high | Weekly npm audit |
| Password hash strength | bcrypt 12 rounds | Configuration review |
| Token expiry compliance | 100% | Code review |
| Data classification coverage | 100% of entities | Documentation review |

---

*This document is the complete Security Architecture Blueprint. It is the authoritative reference for all security-related implementation decisions. Every authentication mechanism, authorization rule, encryption strategy, and threat mitigation is defined here before any code is written.*
