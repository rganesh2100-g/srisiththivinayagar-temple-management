# Project Summary — Sri Siththi Vinayagar Temple

> **Sri Siththi Vinayagar Tempel Kultur Verein e.V** (Reg. No: VR201235)
> Humboldt Str. 103, 90459 Nurnberg, Germany

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Frontend (`apps/web`)](#frontend-appsweb)
4. [API (`apps/api`)](#api-appsapi)
5. [PocketBase (`apps/pocketbase`)](#database-appspocketbase)
6. [Data Model](#data-model)
7. [Authentication & Authorization](#authentication--authorization)
8. [Membership & Subscription System](#membership--subscription-system)
9. [Pooja Booking Flow](#pooja-booking-flow)
10. [Donation Flow](#donation-flow)
11. [Payment & Receipt System](#payment--receipt-system)
12. [Expense Management](#expense-management)
13. [Financial Transparency](#financial-transparency)
14. [Gallery System](#gallery-system)
15. [Festival System](#festival-system)
16. [Messaging System](#messaging-system)
17. [Notification System](#notification-system)
18. [AI Integration](#ai-integration)
19. [Email System](#email-system)
20. [Internationalization (i18n)](#internationalization-i18n)
21. [Design System & UI](#design-system--ui)
22. [Key Technical Details](#key-technical-details)
23. [Developer Commands](#developer-commands)
24. [Security Observations](#security-observations)
25. [Technical Debt](#technical-debt)

---

## Architecture Overview

Three-tier architecture with dual data access:

```
┌──────────────────────┐
│   Frontend (React)   │  Port 3000
│   React 18 + Vite 7  │
└──────┬───────┬───────┘
       │       │
       │       ▼
       │  ┌──────────────┐
       │  │  API (Express)│  Port 3001
       │  │  Express 5     │
       │  └──────┬────────┘
       │         │
       ▼         ▼
  ┌────────────────────┐
  │  PocketBase (BaaS) │  Port 8090
  │  SQLite + Go binary │
  └────────────────────┘
```

**Communication patterns:**

| Path | Mechanism |
|------|-----------|
| Frontend → PocketBase | Direct SDK calls (auth, reads, simple writes) |
| Frontend → API | Proxied `/hcgi/api/*` (receipts, AI, admin operations) |
| API → PocketBase | Superuser-authenticated SDK with auto-reauth |
| PocketBase → External | Server-side `.pb.js` hooks (email, auto-upgrade, notifications) |

---

## Monorepo Structure

```
Vinayagar site/
├── apps/
│   ├── web/              # React SPA (68 pages, 55 UI components)
│   ├── api/              # Express REST API (32 route files)
│   └── pocketbase/       # PocketBase (529 migrations, 50 hooks)
├── package.json          # npm workspaces root
├── start.ps1             # Dev launcher (Windows)
├── start.sh              # Dev launcher (Unix)
├── .nvmrc                # Node 22
├── .version              # 50
└── AGENTS.md             # Agent instructions
```

**All packages use ESM** (`"type": "module"`). No TypeScript anywhere.

---

## Frontend (`apps/web`)

| Aspect | Detail |
|--------|--------|
| Framework | React 18.3 |
| Build tool | Vite 7.3 |
| Styling | TailwindCSS 3.4 + shadcn/ui (55 components) |
| Routing | react-router-dom 7 (lazy-loaded routes) |
| State | React Context (Auth, Error, Accessibility, Language) |
| Forms | react-hook-form + Zod (signup only), manual elsewhere |
| Animation | Framer Motion |
| Charts | Recharts |
| Toast | Sonner |
| SEO | react-helmet |
| PDF | jsPDF, html2canvas |

### Entry Point Chain

```
index.html → main.jsx → App.jsx → [Router] → [Lazy Page Components]
```

### Provider Nesting Order

```
ErrorBoundary (full-page)
  └─ AuthProvider
      └─ ErrorProvider
          └─ AccessibilityProvider
              └─ LanguageProvider
                  └─ Router
                      └─ Suspense + ErrorBoundary
                          └─ Routes
```

### Key Files

| File | Purpose |
|------|---------|
| `src/main.jsx` | ReactDOM.createRoot, mounts `<App />` |
| `src/App.jsx` | All 60 routes (lazy-loaded), provider tree |
| `src/index.css` | CSS custom properties, global styles, dark mode |
| `src/contexts/AuthContext.jsx` | PocketBase auth, role/premium detection |
| `src/contexts/AccessibilityContext.jsx` | Accessibility features |
| `src/contexts/ErrorContext.jsx` | Global error handling |
| `src/lib/pocketbaseClient.js` | PocketBase SDK singleton (dev: localhost:8090, prod: /hcgi/platform) |
| `src/lib/apiServerClient.js` | Fetch wrapper for `/hcgi/api` |
| `src/hooks/useLanguage.jsx` | i18n context with PocketBase sync |
| `src/components/ProtectedRoute.jsx` | Auth + role-based route guard |
| `src/components/DashboardRouter.jsx` | Smart redirect based on role/tier |
| `src/components/DashboardLayout.jsx` | Dashboard shell (sidebar + content + footer) |
| `src/components/Header.jsx` | Global nav with admin dropdown |
| `src/components/Footer.jsx` | 4-column footer |
| `vite.config.js` | Vite config, proxy, aliases, plugins |

### Page Inventory (68 pages)

**Public:** HomePage, AboutPage, ContactPage, GalleryPage, PoojaOfferingsPage, PoojaDetailPage, PoojaCheckoutPage, UpcomingFestivals, TempleDonatePage, DonationTracker, FinancialTransparency

**Auth:** LoginPage, SignupPage, MembershipPage, MembershipSelectionPage, PaymentSubscriptionPage, SubscriptionThankYouPage, FreeMembershipPage, PremiumMembershipPage

**User Dashboard:** DashboardPage, FreeMemberDashboard, PremiumMemberDashboard, MyProfile, MyBookingsPage, UserMessagesPage, Notifications, SanthaHistoryPage

**Admin:** AdminDashboard, AdminRoleManagement, AdminDonationApprovalPage, AdminPaymentsPage, AdminSubscriptionManagement, AdminPoojaCreate, AdminPoojaApprovals, AdminPoojaArchive, AdminGalleryManagement, AdminTempleAccounts, AdminTemplePaymentAccounts, AdminPaymentAccountPage, AdminMonthlyDetailReport, AdminMessages, AdminAuditLogs, AdminDiagnosticPage, UserManagement, UserPageManagement, UserAccountAssignmentPage, AccountTypeSettings, CategoryMasterPage, FestivalManager, ExpenseManagerPage

---

## API (`apps/api`)

| Aspect | Detail |
|--------|--------|
| Framework | Express 5.0.1 |
| Auth | Bearer token (PocketBase JWT, base64-decoded) |
| Security | helmet, rate-limiting |
| Logging | morgan + custom logger |
| File upload | multer |
| Email | nodemailer (SMTP) |
| PDF | pdfkit, jsPDF |
| Excel | xlsx |

### Mounted Routes (in `routes/index.js`)

| Route | Endpoint | Purpose |
|-------|----------|---------|
| `health-check.js` | `GET /health` | Health check |
| `integrated-ai.js` | `POST /stream` | SSE AI chat (Claude) |
| `admin-payments.js` | `/pending`, `/:id/approve`, `/reject` | Admin payment processing |
| `poojaBooking.js` | `POST /`, `/send-confirmation`, `/:id/receipt` | Pooja booking CRUD |
| `pendingSubscriptions.js` | `POST /create`, `/approve` | Pending subscription flow |

**Note:** Only 5 routes are registered in `index.js`, but 30+ route files exist. Many operations are handled by PocketBase hooks directly.

### Middleware

| File | Purpose |
|------|---------|
| `auth.js` | Bearer token extraction (non-blocking — routes decide enforcement) |
| `error.js` | Global error handler (returns stack in non-production) |
| `pocketbase-auth.js` | PocketBase-specific auth for AI routes |

### Key Utilities

| File | Purpose |
|------|---------|
| `pocketbaseClient.js` | Superuser-authenticated PocketBase SDK (auto-reauth via `beforeSend`) |
| `adminUserSetup.js` | Seeds 4 hardcoded admin users on startup |
| `autoArchivePoojas.js` | Hourly cron: archives poojas with all past dates |
| `emailService.js` | Nodemailer SMTP email sending |
| `emailReceiptService.js` | Receipt email with PDF attachment |
| `emailTemplates.js` | HTML email templates |
| `pdfReceiptGenerator.js` | PDF receipt generation (PDFKit) |
| `receiptGenerator.js` | Alternative PDF generation (jsPDF) |

---

## Database (`apps/pocketbase`)

| Aspect | Detail |
|--------|--------|
| Version | 0.38.0 |
| Database | SQLite (file-based) |
| Migrations | 529 auto-applied timestamp-prefixed files |
| Hooks | 50 server-side `.pb.js` files |
| Admin UI | `http://localhost:8090/_/` |
| Default superuser | `admin@localhost.com` / `admin123456` |

### PocketBase Hooks (50 files)

**Booking hooks:** approval notification, confirmation email, receipt generation, temple accounts update, message notifications, auto-archive (cron every 5 min)

**Donation hooks:** confirmation email, receipt email, receipt generation, temple accounts update, resend receipt

**Subscription hooks:** created/approved/rejected emails, auto-downgrade (daily cron), auto-update membership, expiry reminders, payment reminders, receipt generation (4 variants), auto-dates

**Payment hooks:** confirmation email, notification, receipt generation, auto-upgrade to premium, resend receipt

**Other hooks:** contact inquiry notification, set default approval status, set default account type, migration fixes, diagnostics (4 files)

---

## Data Model

### Core Collections

| Collection | Key Fields | Relationships |
|-----------|-----------|---------------|
| **users** | email, password, name, phone, role (`user`/`admin`), account_type, membership_tier, subscription_status, preferred_language, address, avatar, approval_status, subscription_expiry_date, premium_status, is_blocked, is_deleted | — |
| **subscriptions** | user, plan_type, billing_cycle, amount, total_amount, status, approval_status, start_date, end_date, transaction_id, email, notes, membership_type | → users |
| **payments** | email, amount, plan_type, status, transaction_id, receipt_data, user, payment_method, notes, start_date, end_date, full_name | → users |
| **donations** | amount, category, status, user, donor_name, donor_email, transaction_id, donation_date, special_occasion, receipt_id, receipt_pdf, notes | → users |
| **poojas** | name, description, category, price, god, published, status, is_archived, is_deleted, availabilityType, dates, specificDays, timeSlots, duration | — |
| **pooja_bookings** | pooja_name, pooja, user, email, name, user_contact, donation_amount, pooja_date, time_slot, status, booking_status, payment_status, transaction_id, receipt_id, receipt_pdf, fee_amount | → poojas, → users |
| **expenses** | amount, category, date, description, image, bill_file, quantity, payment_method, paid_to, classification, voucher_id, status | — |
| **vouchers** | voucher_id, expense, amount, category, paid_to, date, description, status | → expenses |
| **gallery** | title, description, image, is_published, archived, category_id, order, storage_size | → photo_categories |
| **photo_categories** | name, description, default_expanded, is_published | — |
| **festivals** | name, date, status, is_deleted, image | — |
| **temple_accounts** | category, amount, month, year, total_amount, classification, description, transaction_id, status, notes, entry_type, subscription_type | — |
| **contact_inquiries** | name, email, phone, subject, message | — |
| **bank_account_config** | bank_name, account_holder_name, account_number, iban, contact_email, direct_payment_link, qr_code_image, is_active | — |
| **booking_messages** | bookingId, message, sender_id, senderEmail, customerEmail, customerName, poojaName, sentAt | → pooja_bookings |
| **notifications** | (notification data) | — |
| **account_types** | (account type definitions) | — |
| **page_access** | (page access rules) | — |
| **user_account_assignments** | (user-account mappings) | — |
| **integrated_ai_messages** | (AI conversation data) | — |
| **integrated_ai_images** | (AI images) | — |

---

## Authentication & Authorization

### Auth Flow

1. **Frontend** stores PocketBase JWT in `pb.authStore` (localStorage)
2. **API middleware** (`auth.js`) extracts Bearer token, base64-decodes the JWT payload, checks expiration, fetches user from PocketBase
3. **Routes** check `req.user.role` for admin access (non-blocking middleware — routes decide)

### Role System

**Two roles:** `user` and `admin`

- New users get `role: 'user'` on signup
- Admin users are seeded by `adminUserSetup.js` with `role: 'admin'`
- `ProtectedRoute` component checks `allowedRoles` array against `currentUser.role`
- `DashboardRouter` redirects admins to `/admin/dashboard`
- `Header` shows admin dropdown menu only for `role === 'admin'`

### Premium Detection (defensive — checks 5 fields)

```javascript
isPremium = subscription_status === 'premium'
  || membershipTier === 'premium'
  || membership_type === 'premium'
  || premium_status === 'Active'
  || account_type === 'Premium Member'
```

---

## Membership & Subscription System

### Tiers

| Tier | Price | Approval | Features |
|------|-------|----------|----------|
| **Free** | €0 | Instant | Basic dashboard, profile |
| **Premium** | €10/mo or €120/yr+ | Manual admin approval | Financial transparency, premium dashboard, priority |

### Premium Upgrade Flow

1. User visits `/membership/select` → chooses monthly/yearly
2. Custom donation amount (minimum = base price)
3. Payment via bank transfer (manual)
4. Subscription record created → `status: 'pending_approval'`
5. Admin reviews at `/admin/subscriptions`
6. On approval: user's `membership_type = 'premium'`, `account_type = 'Premium Member'`
7. Expiry tracked via `subscription_expiry_date`
8. Daily cron (`subscription-auto-downgrade.pb.js`) downgrades expired users

### Subscription States

`pending_approval` → `approved` → (expiry) → auto-downgrade to free

---

## Pooja Booking Flow

```
1. Browse      /poojas           → PoojaOfferingsPage (filter by category, search)
2. Select      /poojas/:id       → PoojaDetailPage
3. Checkout    /checkout/:id     → 4-step wizard (date → details → payment → confirm)
4. Confirm     /booking-confirmation/:bookingId
5. Admin       /admin/pooja-approvals → Approve/reject
6. Approved    Status → 'Confirmed', receipt generated, email sent, temple_accounts updated
7. Archive     Hourly cron archives poojas with all past dates
```

### Checkout Steps

| Step | Content |
|------|---------|
| 1 | Date selection (Calendar) + time slot (checks existing bookings) |
| 2 | Participant details (name, email, phone, participants count) |
| 3 | Bank transfer details + transaction ID entry |
| 4 | Review all → confirm → creates `pooja_bookings` record |

### Date Constraints

- No past dates
- Max 3 months ahead
- Respects `availabilityType`: `allDays`, `specificDate`, `specificDaysRegularly`
- Booked slots checked against `pooja_bookings` collection

---

## Donation Flow

```
1. Submit    /donate → TempleDonatePage (category, amount, donor info, transaction ID)
2. Record    Creates donations record → status: 'pending'
3. Admin     /admin/donation-approvals → approve/reject
4. Approved  Receipt ID generated, PDF created, email sent, temple_accounts updated
5. Resend    Admin can resend receipt via API
```

### Donation Categories

- Annadhanam
- Temple Maintenance
- Goshala
- Veda Pathshala
- General Temple Fund

### Quick Amounts

€51, €101, €501 (with custom amount option)

---

## Payment & Receipt System

### Receipt Formats

| Type | Format | Example |
|------|--------|---------|
| Pooja | `POOJA_RECEIPT_*` | `POOJA_RECEIPT_1720000000_123456` |
| Donation | `DONATION_*` | `DONATION_1720000000_123456` |
| Subscription | `SB_YEARLY_*` | `SB_YEARLY_1720000000_123456` |
| Payment | `RCP-YYYY-MM-DD-XXXXX` | `RCP-2024-07-15-00001` |
| Voucher | `PAID_VO_XXXXX` | `PAID_VO_00001` |

### PDF Generation

- Server-side via `pdfReceiptGenerator.js` (PDFKit)
- Alternative: `receiptGenerator.js` (jsPDF)
- Stored as base64 in PocketBase, served as email attachment or HTTP download

---

## Expense Management

- **Collection:** `expenses` (amount, category, date, description, image, bill_file)
- **Vouchers:** Auto-generated `PAID_VO_*` IDs stored in `vouchers` collection
- **Email:** Nodemailer SMTP with bill + voucher PDF attachments
- **Admin page:** `ExpenseManagerPage.jsx` (680 lines, image compression, CRUD)
- **Excel export:** Via XLSX library (`templeAccountsExport.js`)

---

## Financial Transparency

- **Access:** Premium members and admins only
- **Data sources:** `temple_accounts`, `donations`, `pooja_bookings`, `expenses`
- **Frontend:** `FinancialTransparency.jsx` (P&L statements, monthly income/expense breakdown)
- **Admin:** `AdminTempleAccounts.jsx` (713 lines, monthly/annual reports, Excel/email export)
- **temple_accounts categories:** Pooja Services, Annadhanam, Temple Maintenance, Goshala, Veda Pathshala, General Fund

---

## Gallery System

- **Public:** `GalleryPage.jsx` (388 lines, photo/video with categories, lightbox, real-time PB subscriptions)
- **Admin:** `AdminGalleryManagement.jsx` (1085 lines, upload with compression, categories, publish/archive)
- **Collections:** `gallery`, `photo_categories`
- **Storage:** PocketBase file storage

---

## Festival System

- **Public:** `UpcomingFestivals.jsx` (191 lines, calendar with modal details)
- **Admin:** `FestivalManager.jsx` (CRUD management)
- **Collection:** `festivals` (name, date, status, image)
- **Link:** Poojas can be linked to festivals via `festival` field

---

## Messaging System

### Two types:

1. **Admin messages** (`admin_messages`): General admin-to-user messaging
   - Admin: `AdminMessages.jsx`
   - User: `UserMessagesPage.jsx`

2. **Booking messages** (`booking_messages`): Booking-specific communication
   - Created via API route
   - Auto-notifies both admin and customer via PocketBase hooks

---

## Notification System

- **Collection:** `notifications`
- **Frontend:** `Notifications.jsx` (accessible via bell icon in header)
- **Preferences:** `user_preferences.notification_preference`
- **Reminders:** `subscription_reminders` for expiry/payment reminders

---

## AI Integration

- **Route:** `POST /integrated-ai/stream` (SSE streaming)
- **Model:** Anthropic Claude
- **Auth:** `pocketbaseAuth` middleware
- **Rate limit:** 10 requests/minute per user
- **Features:** Text chat + image upload (JPEG, PNG, WebP)
- **Storage:** `integrated_ai_messages` (conversations), `integrated_ai_images` (uploaded images)
- **Frontend:** `integrated-ai-chat.jsx` component

---

## Email System

### Multi-layered:

1. **PocketBase hooks** — Real-time notifications via `$app.newMailClient().send()`
2. **API utilities** — Complex emails with PDF attachments via Nodemailer SMTP
3. **SMTP config:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

### Email Types Sent

- Booking confirmation, approval, rejection
- Donation confirmation, receipt
- Subscription created, approved, rejected, renewal reminder
- Payment confirmation (to user + admin notification)
- Contact inquiry notification (to admin)
- Expense voucher with attachments
- Financial reports

---

## Internationalization (i18n)

| Language | Code | File |
|----------|------|------|
| English | `en` | `en.json` (fallback) |
| German | `de` | `de.json` |
| Tamil | `ta` | `ta.json` |

- **Detection:** localStorage → browser navigator
- **Sync:** Language preference synced to PocketBase on login/logout
- **Font size:** Configurable via CSS variable on `<html>` element
- **Usage:** `useTranslation()` hook with `t('key', 'fallback')`

---

## Design System & UI

### shadcn/ui Components (55)

accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button-group, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card, input-group, input-otp, input, item, kbd, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toast, toaster, toggle-group, toggle, tooltip

### CSS Custom Properties (HSL-based)

```css
--primary: 0 100% 27%        /* Deep red #8B0000 */
--primary-foreground: 0 0% 98%
--secondary: 30 100% 50%     /* Gold/amber */
--background: 0 0% 100%
--foreground: 0 0% 3.9%
--destructive: 0 84.2% 60.2%
--radius: 0.5rem
```

### Typography

- **Body:** Plus Jakarta Sans
- **Headings:** Playfair Display (serif)
- **Responsive:** `clamp()` based heading scales

### Animations

- Framer Motion for page transitions and card animations
- TailwindCSS animate plugin for accordion and other UI animations

---

## Key Technical Details

### Path Alias

`@/` → `apps/web/src/` (configured in `jsconfig.json` + Vite resolve alias)

### API Proxy (Dev)

Vite proxies `/hcgi/api/*` → `http://localhost:3001/*` (strips the prefix)

### PocketBase Client (Frontend)

```javascript
// Dev: http://localhost:8090
// Prod: /hcgi/platform
const isLocalhost = window.location.hostname === 'localhost';
const POCKETBASE_API_URL = isLocalhost ? 'http://localhost:8090' : '/hcgi/platform';
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PB_SUPERUSER_EMAIL` | PocketBase admin email | `admin@localhost.com` |
| `PB_SUPERUSER_PASSWORD` | PocketBase admin password | `admin123456` |
| `SMTP_HOST` | SMTP server host | — |
| `SMTP_PORT` | SMTP server port | — |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_FROM_EMAIL` | Sender email | — |
| `SMTP_FROM_NAME` | Sender name | — |
| `CORS_ORIGIN` | CORS allowed origin | `*` |
| `PORT` | API server port | `3001` |

---

## Developer Commands

```bash
# Start all dev servers (PocketBase → API → Frontend)
.\start.ps1                          # Windows
./start.sh                           # Unix
npm run dev                          # Root (concurrently)

# Start individually
cd apps/pocketbase; pocketbase.exe serve --http=0.0.0.0:8090
cd apps/api; node src/main.js
cd apps/web; npm run dev

# Lint
npm run lint                         # All
npm run lint --prefix apps/web       # Web only
npm run lint --prefix apps/api       # API only

# Build
npm run build                        # Web only → dist/apps/web

# PocketBase migrations
cd apps/pocketbase
pocketbase.exe horizons migrations:up
pocketbase.exe horizons migrations:revert
```

---

## Security Observations

| Issue | Severity | Location |
|-------|----------|----------|
| CORS allows all origins (`*`) | High | `apps/api/src/main.js` |
| Admin credentials hardcoded in source | High | `apps/api/src/utils/adminUserSetup.js` |
| `authMiddleware` extracts but doesn't enforce auth | Medium | `apps/api/src/middleware/auth.js` |
| API routes lack role-based authorization checks | Medium | `apps/api/src/routes/` |
| `console.warn` silenced globally | Low | `apps/web/vite.config.js:274` |
| Verbose logging may expose PII in production | Low | `apps/api/src/middleware/auth.js` |

---

## Technical Debt

| Item | Impact | Location |
|------|--------|----------|
| 5+ fields for premium detection (schema drift) | Medium | `AuthContext.jsx` |
| Only 5 of 32+ API routes actually mounted | Medium | `apps/api/src/routes/index.js` |
| 529 migrations (rapid iteration) | Low | `apps/pocketbase/pb_migrations/` |
| Some pages use `UnifiedDashboardSidebar` for logged-out users | Low | `TempleDonatePage.jsx` |
| No TypeScript anywhere | Low | Entire codebase |
| No test files exist | Low | Entire codebase |
| `console.warn` silenced globally | Low | `vite.config.js` |
