# Testing & Quality Assurance Architecture Blueprint

**Sri Siththi Vinayagar Temple — Testing & QA Architecture**
**Version:** 1.0 | **Date:** 2026-07-11 | **Status:** Pre-Implementation Blueprint
**Stack:** React 18, Express 5, PostgreSQL, Prisma ORM, Node.js 22

---

## Table of Contents

- [PART 1 — Testing Philosophy](#part-1--testing-philosophy)
- [PART 2 — Testing Strategy](#part-2--testing-strategy)
- [PART 3 — Frontend Testing Architecture](#part-3--frontend-testing-architecture)
- [PART 4 — Backend Testing Architecture](#part-4--backend-testing-architecture)
- [PART 5 — Database Testing](#part-5--database-testing)
- [PART 6 — API Testing](#part-6--api-testing)
- [PART 7 — Security Testing](#part-7--security-testing)
- [PART 8 — Performance Testing](#part-8--performance-testing)
- [PART 9 — Test Data Management](#part-9--test-data-management)
- [PART 10 — QA Workflow](#part-10--qa-workflow)
- [PART 11 — Release Validation](#part-11--release-validation)
- [PART 12 — Master QA Blueprint](#part-12--master-qa-blueprint)

---

# PART 1 — Testing Philosophy

## 1.1 Testing Pyramid

The testing strategy follows the testing pyramid model. The base is wide (many unit tests), the middle is moderate (integration tests), and the top is narrow (end-to-end tests). This distribution maximizes confidence while minimizing maintenance cost and execution time.

```
                    ┌───────────┐
                    │    E2E    │      Few (10-20 critical paths)
                    │  Tests    │      Slow, expensive, high confidence
                    ├───────────┤
                    │Integration│      Moderate (50-100 scenarios)
                    │  Tests    │      Medium speed, medium confidence
                    ├───────────┤
                    │   Unit    │      Many (300-500 tests)
                    │  Tests    │      Fast, cheap, focused confidence
                    └───────────┘
```

Unit tests validate individual functions and methods in isolation. Integration tests validate how components work together (service + repository, controller + service). End-to-end tests validate complete user flows through the entire stack.

The target distribution is 70% unit tests, 20% integration tests, and 10% end-to-end tests. This provides fast feedback during development while covering critical paths with high confidence.

## 1.2 Shift Left Testing

Testing begins at the earliest possible stage. Developers write unit tests alongside code. Code review includes test review. The CI pipeline validates tests before merge. Security scanning happens during development, not after deployment. This "shift left" approach catches defects early when they are cheapest to fix.

The cost of fixing a defect increases exponentially with detection time:
- Found during development: 1x cost
- Found during code review: 2x cost
- Found during testing: 5x cost
- Found during staging: 10x cost
- Found in production: 50x cost

## 1.3 Quality First

Quality is not a phase — it is a continuous practice. Every commit is tested. Every merge is validated. Every deployment is verified. The system is designed so that low-quality code cannot reach production. Quality gates are automated and enforced.

## 1.4 Automation Strategy

| Test Type | Automation Level | Manual Intervention |
|---|---|---|
| Unit tests | 100% automated | None |
| Integration tests | 100% automated | None |
| API tests | 100% automated | None |
| Security scans | 100% automated | Review results |
| UI tests | 80% automated | 20% visual review |
| E2E tests | 70% automated | 30% exploratory |
| Performance tests | 100% automated | Review results |
| Regression tests | 100% automated | None |
| Smoke tests | 100% automated | None |
| UAT | 0% automated | 100% manual |

## 1.5 Risk-Based Testing

Testing effort is proportional to risk. High-risk areas receive more testing:

| Risk Area | Risk Level | Testing Investment |
|---|---|---|
| Financial transactions | Critical | Extensive (unit + integration + E2E) |
| Authentication/Authorization | Critical | Extensive (unit + integration + security) |
| Data integrity | High | Extensive (unit + integration + database) |
| User registration | High | Moderate (unit + integration + E2E) |
| File uploads | Medium | Moderate (unit + integration) |
| Email delivery | Medium | Moderate (unit + integration) |
| Dashboard displays | Low | Basic (unit + smoke) |
| Gallery browsing | Low | Basic (smoke) |

---

# PART 2 — Testing Strategy

## 2.1 Unit Testing

| Property | Value |
|---|---|
| **Scope** | Individual functions, methods, classes |
| **Isolation** | Full (mocked dependencies) |
| **Speed** | Milliseconds per test |
| **Frequency** | Every commit (via CI) |
| **Framework** | Jest (Node.js), Vitest (frontend, future) |
| **Coverage target** | 80% line coverage for services, 60% overall |
| **Location** | Co-located with source files (`*.test.js`) |

Unit tests validate business logic in isolation. Every service method has corresponding unit tests. Repositories are tested with in-memory database or mocked Prisma client. Controllers are tested with mocked services.

**What gets unit tested:**
- Service methods (business logic, state transitions, calculations)
- Utility functions (date formatting, receipt number generation, validation helpers)
- Repository queries (with mocked Prisma)
- Middleware functions (authentication, authorization, validation)
- Event handlers
- Template rendering

**What does NOT get unit tested:**
- Prisma schema (tested via integration tests)
- Configuration files
- Static assets
- Third-party library internals

## 2.2 Integration Testing

| Property | Value |
|---|---|
| **Scope** | Multiple components working together |
| **Isolation** | Partial (external services mocked) |
| **Speed** | Seconds per test |
| **Frequency** | Every PR (via CI) |
| **Framework** | Jest with test database |
| **Database** | Dedicated test PostgreSQL database |
| **Location** | `tests/integration/` directory |

Integration tests validate how components interact. They use a real PostgreSQL database (test instance) to verify Prisma queries, transactions, and data integrity. External services (SMTP, OAuth) are mocked.

**What gets integration tested:**
- Service + Repository interactions (real database)
- Controller + Service + Repository flow
- Authentication flow (register → login → token → access)
- Authorization flow (role check → resource access)
- Database transactions (multi-entity mutations)
- Prisma migrations (apply and verify)
- File upload flow (service + storage)
- Email sending (mocked SMTP, real template rendering)

**What does NOT get integration tested:**
- Third-party API integrations (mocked)
- DNS/network configurations
- SSL certificate operations
- Operating system interactions

## 2.3 API Testing

| Property | Value |
|---|---|
| **Scope** | HTTP endpoints (request → response) |
| **Isolation** | Full (test database, mocked externals) |
| **Speed** | Seconds per test suite |
| **Frequency** | Every PR (via CI) |
| **Framework** | Supertest (HTTP assertions) |
| **Location** | `tests/api/` directory |

API tests validate HTTP behavior: status codes, response shapes, headers, authentication, authorization, and error handling. They exercise the full HTTP stack (Express middleware → controller → service → repository → database).

**What gets API tested:**
- Every endpoint (happy path)
- Authentication requirements (401 for unauthenticated)
- Authorization requirements (403 for unauthorized)
- Input validation (400 for invalid input)
- Error responses (correct format and status)
- Pagination (page, pageSize, total)
- Filtering (query parameters)
- Rate limiting (429 responses)
- File upload (multipart/form-data)
- CORS headers

## 2.4 UI Testing

| Property | Value |
|---|---|
| **Scope** | React components and user interactions |
| **Isolation** | Full (mocked API, mocked services) |
| **Speed** | Milliseconds per component |
| **Frequency** | Every PR (via CI) |
| **Framework** | React Testing Library (future: Playwright for visual) |
| **Location** | Co-located with components (`*.test.jsx`) |

UI tests validate component rendering, user interactions, and state management. They use mocked API responses to test component behavior without network calls.

**What gets UI tested:**
- Component rendering (props → UI)
- User interactions (click, input, submit)
- Form validation (error messages, field states)
- Routing (navigation, protected routes)
- State management (context, hooks)
- Responsive behavior (mobile/tablet/desktop breakpoints)
- Accessibility (ARIA attributes, keyboard navigation)

## 2.5 End-to-End Testing

| Property | Value |
|---|---|
| **Scope** | Complete user flows through full stack |
| **Isolation** | None (real application, test database) |
| **Speed** | Minutes per flow |
| **Frequency** | Before production releases |
| **Framework** | Playwright (future) or manual |
| **Environment** | Staging environment |
| **Location** | `tests/e2e/` directory (future) |

E2E tests validate critical user journeys from browser to database and back. They are expensive to maintain but provide the highest confidence.

**Critical E2E flows:**
1. User registration → email verification → login
2. Browse poojas → select pooja → book → pay → receive receipt
3. Make donation → admin approves → receipt generated
4. Request premium upgrade → admin approves → premium activated
5. Admin login → view dashboard → approve booking → verify temple entry

## 2.6 Regression Testing

| Property | Value |
|---|---|
| **Scope** | Previously fixed bugs and working features |
| **Trigger** | Every release |
| **Method** | Automated test suite + targeted manual tests |
| **Documentation** | Bug tickets with reproduction steps become test cases |

Regression tests ensure previously working functionality is not broken by new changes. Every bug fix includes a test case that would have caught the bug. This test case is retained permanently.

## 2.7 Smoke Testing

| Property | Value |
|---|---|
| **Scope** | Critical paths (login, key pages, API health) |
| **Trigger** | Every deployment |
| **Duration** | < 5 minutes |
| **Method** | Automated health checks + critical path tests |
| **Location** | `tests/smoke/` directory |

Smoke tests verify the deployed application is functional. They run immediately after deployment to catch deployment failures before users are affected.

**Smoke test checklist:**
- Health endpoint returns 200
- Frontend loads (HTML served, assets load)
- User can login
- Admin can access dashboard
- API responds to CRUD operations
- Database connection works
- File upload works

## 2.8 Sanity Testing

| Property | Value |
|---|---|
| **Scope** | Changed features and their immediate dependencies |
| **Trigger** | After bug fixes or small feature additions |
| **Duration** | < 15 minutes |
| **Method** | Manual verification of specific changes |

Sanity testing is a focused manual check of the specific changes made. It is lighter than regression testing but deeper than smoke testing.

---

# PART 3 — Frontend Testing Architecture

## 3.1 React Component Testing

| Aspect | Approach |
|---|---|
| **Rendering** | Render component with mocked props, verify DOM output |
| **Interaction** | Simulate user events (click, input, submit), verify state changes |
| **Conditional rendering** | Test all branches (loading, error, empty, populated) |
| **Error boundaries** | Test error catching and fallback UI |
| **Lazy loading** | Test loading states and lazy component mounting |

**Component test categories:**

| Category | Examples | Priority |
|---|---|---|
| Form components | Login form, booking form, donation form | High |
| Data display | Pooja list, booking table, dashboard cards | High |
| Navigation | Header, sidebar, routing | Medium |
| Modal/dialog | Confirmation dialogs, error modals | Medium |
| Layout | Page layouts, responsive containers | Low |

## 3.2 Hooks Testing

| Hook Type | Testing Approach |
|---|---|
| Custom hooks | Render hook with `renderHook`, test return values |
| Context hooks | Wrap in provider, test consumer behavior |
| API hooks | Mock fetch, test loading/error/success states |
| Form hooks | Test form state, validation, submission |

## 3.3 Routing Testing

| Scenario | Test |
|---|---|
| Public route access | Navigate to public page, verify render |
| Protected route redirect | Navigate to protected page without auth, verify redirect to login |
| Role-based routing | Navigate to admin page as user, verify 403/redirect |
| Deep linking | Navigate directly to sub-route, verify correct component loads |
| 404 handling | Navigate to nonexistent route, verify 404 page |

## 3.4 State Testing

| State Type | Testing Approach |
|---|---|
| Local component state | Trigger state change, verify UI update |
| Context state | Wrap in provider, trigger state change, verify propagation |
| Form state | Input changes, verify state; submit, verify state reset |
| Loading state | Trigger async operation, verify loading indicator, verify result |

## 3.5 Accessibility Testing

| Check | Standard | Tool |
|---|---|---|
| ARIA labels | WCAG 2.1 AA | Automated scanner |
| Keyboard navigation | WCAG 2.1 AA | Manual + automated |
| Color contrast | WCAG 2.1 AA | Automated scanner |
| Focus management | WCAG 2.1 AA | Manual testing |
| Screen reader | WCAG 2.1 AA | Manual with NVDA/VoiceOver |
| Alt text | WCAG 2.1 AA | Automated scanner |

## 3.6 Responsive Testing

| Breakpoint | Width | Testing Method |
|---|---|---|
| Mobile | 320-480px | Browser dev tools + real devices |
| Tablet | 481-768px | Browser dev tools |
| Desktop | 769px+ | Browser dev tools + real screens |
| Large desktop | 1200px+ | Browser dev tools |

---

# PART 4 — Backend Testing Architecture

## 4.1 Controller Testing

| Aspect | Test |
|---|---|
| Route mapping | Correct HTTP method + path → controller method |
| Input parsing | Request body/params/query extracted correctly |
| Authentication | Missing token → 401; invalid token → 401 |
| Authorization | Wrong role → 403 |
| Validation | Invalid input → 400 with correct error messages |
| Success response | Correct status code + response body shape |
| Error handling | Service errors → correct HTTP status |
| File upload | Multipart request handled correctly |

## 4.2 Service Testing

| Aspect | Test |
|---|---|
| Business logic | Rules applied correctly for all inputs |
| State transitions | Valid transitions succeed, invalid transitions throw |
| Transaction boundaries | Multi-entity mutations are atomic |
| Event emission | Correct events emitted on state changes |
| Error propagation | Errors thrown with correct types and messages |
| Null handling | Missing entities → NotFoundError |
| Duplicate prevention | Duplicate operations prevented |
| Calculation accuracy | Financial calculations use Decimal, no floating point |

**Service test patterns:**

| Pattern | Description |
|---|---|
| Happy path | Valid input → expected output |
| Invalid input | Invalid input → ValidationError |
| Not found | Nonexistent ID → NotFoundError |
| Unauthorized | Wrong user → AuthorizationError |
| Conflict | Duplicate/state violation → ConflictError |
| Business rule | Rule violation → BusinessRuleError |
| Transaction failure | Partial failure → full rollback |
| Event emission | Correct events emitted with correct data |

## 4.3 Repository Testing

| Aspect | Test |
|---|---|
| Query correctness | Correct data returned for given filters |
| Pagination | Correct page size, total count, offset |
| Sorting | Correct order for sort parameters |
| Filtering | Correct results for filter combinations |
| Soft delete | Deleted records excluded by default |
| Include/relate | Related data loaded correctly |
| Bulk operations | createMany, updateMany, deleteMany work correctly |
| Unique constraints | Duplicate inserts rejected |

## 4.4 Authentication Testing

| Scenario | Expected Result |
|---|---|
| Valid credentials | Token returned |
| Invalid email | Generic "Invalid credentials" |
| Invalid password | Generic "Invalid credentials" |
| Deleted account | "Account deactivated" |
| Blocked account | "Account blocked" |
| Expired refresh token | 401, re-authentication required |
| Revoked refresh token | 401, all sessions invalidated |
| Password reset flow | Token generated, email sent, password updated |
| Email verification | Token generated, email sent, user verified |
| OAuth flow | User created/linked, tokens returned |

## 4.5 Authorization Testing

| Scenario | Expected Result |
|---|---|
| Guest accessing public endpoint | 200 OK |
| Guest accessing protected endpoint | 401 |
| User accessing own resource | 200 OK |
| User accessing other's resource | 403 |
| Admin accessing any resource | 200 OK |
| User accessing admin endpoint | 403 |
| Treasurer accessing financial data | 200 OK |
| Auditor accessing financial data (read) | 200 OK |
| Auditor trying to modify financial data | 403 |

## 4.6 Middleware Testing

| Middleware | Test |
|---|---|
| Auth middleware | Valid token → attaches user; invalid → 401; missing → 401 |
| Role middleware | Correct role → passes; wrong role → 403 |
| Validation middleware | Valid input → passes; invalid → 400 |
| Rate limiter | Under limit → passes; over limit → 429 |
| CORS middleware | Allowed origin → passes; disallowed → blocked |
| Error handler | Typed error → correct HTTP status + message |

## 4.7 File Upload Testing

| Scenario | Expected Result |
|---|---|
| Valid file (correct type, size) | Upload succeeds, URL returned |
| Invalid MIME type | 400 Bad Request |
| File too large | 413 Payload Too Large |
| Path traversal in filename | Sanitized filename |
| No file provided | 400 Bad Request |
| Multiple files | Handled correctly (if supported) |

## 4.8 Background Job Testing

| Scenario | Expected Result |
|---|---|
| Job executes successfully | Correct side effects |
| Job fails | Error logged, retry scheduled |
| Job timeout | Job marked as failed |
| Idempotency | Running twice produces same result |
| Dependency resolution | Jobs execute in correct order |

---

# PART 5 — Database Testing

## 5.1 Schema Validation

| Check | Method |
|---|---|
| All models exist | `prisma db push` succeeds |
| All fields present | Query each field, no errors |
| Field types correct | Insert correct and incorrect types |
| Required fields enforced | Insert without required field → error |
| Default values applied | Insert without optional field → default used |
| Unique constraints enforced | Duplicate insert → error |
| Foreign key constraints enforced | Insert with invalid reference → error |

## 5.2 Constraints

| Constraint Type | Test |
|---|---|
| Primary key | Unique, not null |
| Foreign key | Referential integrity enforced |
| Unique | Duplicate values rejected |
| Not null | Null values rejected for required fields |
| Check | Value within valid range (e.g., amount > 0) |
| Default | Default value applied when omitted |
| Cascade | Parent delete affects children correctly |

## 5.3 Transactions

| Scenario | Test |
|---|---|
| Successful transaction | All changes committed |
| Failed transaction (mid-way) | All changes rolled back |
| Nested operations | Inner operations participate in outer transaction |
| Concurrent transactions | Optimistic locking prevents lost updates |
| Long-running transaction | Timeout handled correctly |

## 5.4 Prisma Validation

| Check | Method |
|---|---|
| Prisma client generates | `npx prisma generate` succeeds |
| Query types correct | TypeScript compilation (future) |
| Relation queries work | `include` and `select` return correct data |
| Raw queries work | `$queryRaw` with parameters executes correctly |

## 5.5 Migration Verification

| Check | Method |
|---|---|
| Migrations apply cleanly | `npx prisma migrate deploy` succeeds |
| Migrations are idempotent | Running twice produces same result |
| Migrations preserve data | Existing data unchanged after migration |
| Rollback plan exists | Backup restore verified |

## 5.6 Data Integrity

| Check | Method |
|---|---|
| No orphaned records | Foreign keys enforced |
| No duplicate IDs | UUID primary keys |
| Timestamps accurate | `createdAt` and `updatedAt` correct |
| Soft delete works | Deleted records excluded from queries |
| Financial precision | Decimal amounts, no floating point errors |

---

# PART 6 — API Testing

## 6.1 REST Validation

| Aspect | Test |
|---|---|
| HTTP methods | GET, POST, PUT, PATCH, DELETE used correctly |
| Status codes | 200, 201, 204, 400, 401, 403, 404, 409, 413, 422, 429, 500 |
| Content-Type | JSON for API responses, correct types for file responses |
| Response body | Consistent shape across all endpoints |
| Response headers | Security headers present, CORS headers correct |

## 6.2 Authentication

| Scenario | Expected Result |
|---|---|
| No Authorization header | 401 Unauthorized |
| Invalid token format | 401 Unauthorized |
| Expired access token | 401 Unauthorized |
| Valid access token | 200 OK (or appropriate) |
| Refresh token in cookie | 200 OK, new tokens issued |
| Expired refresh token | 401, re-authentication required |

## 6.3 Authorization

| Scenario | Expected Result |
|---|---|
| Unauthenticated → public endpoint | 200 OK |
| Unauthenticated → protected endpoint | 401 |
| Free member → premium endpoint | 403 |
| User → own resource | 200 OK |
| User → other's resource | 403 |
| Admin → any endpoint | 200 OK (if role allowed) |
| Expired token → any endpoint | 401 |

## 6.4 Error Responses

| Error Type | Response Shape |
|---|---|
| Validation error | `{ error: "Validation failed", details: [...] }` |
| Authentication error | `{ error: "Unauthorized" }` |
| Authorization error | `{ error: "Forbidden" }` |
| Not found | `{ error: "Not found" }` |
| Conflict | `{ error: "Conflict", message: "..." }` |
| Business rule | `{ error: "Business rule violation", message: "..." }` |
| Server error | `{ error: "Internal server error" }` (no stack trace) |

## 6.5 Pagination

| Scenario | Test |
|---|---|
| Default pagination | Page 1, 20 items per page |
| Custom page size | Respected, max 100 |
| Page beyond total | Empty array, correct total |
| Total count accurate | Matches actual record count |
| Sort order | Results sorted correctly |

## 6.6 Filtering

| Scenario | Test |
|---|---|
| Single filter | Correct subset returned |
| Multiple filters (AND) | Intersection returned |
| Date range filter | Correct range |
| Status filter | Correct status subset |
| Search filter | Text match across fields |
| Invalid filter ignored | Graceful handling |

## 6.7 Rate Limiting

| Scenario | Test |
|---|---|
| Under limit | Requests succeed |
| At limit | Requests succeed |
| Over limit | 429 Too Many Requests |
| Rate limit headers | `X-RateLimit-*` headers present |
| Recovery after window | Requests succeed again |

---

# PART 7 — Security Testing

## 7.1 JWT Testing

| Test | Expected Result |
|---|---|
| Valid token accepted | 200 OK |
| Expired token rejected | 401 |
| Tampered token rejected | 401 |
| Wrong secret rejected | 401 |
| Missing `sub` claim rejected | 401 |
| Missing `exp` claim rejected | 401 |
| Algorithm confusion rejected | 401 |
| Refresh token cannot be used as access token | 401 |

## 7.2 RBAC Testing

| Test | Expected Result |
|---|---|
| Guest cannot access user endpoints | 401 |
| User cannot access admin endpoints | 403 |
| User cannot modify other user's data | 403 |
| Admin can access all endpoints | 200 OK |
| Role cannot be self-modified | 403 or validation error |
| Permission inheritance works correctly | Lower role permissions available |

## 7.3 Input Validation Testing

| Attack Vector | Test | Expected Result |
|---|---|---|
| SQL injection in text field | `' OR 1=1 --` | Rejected or sanitized |
| SQL injection in ID field | `'; DROP TABLE users; --` | Rejected |
| XSS in text field | `<script>alert('xss')</script>` | Sanitized or rejected |
| XSS in HTML field | `<img onerror=alert(1) src=x>` | Sanitized |
| Path traversal in filename | `../../etc/passwd` | Sanitized |
| Oversized input | 10MB text field | 413 or 400 |
| Null bytes in input | `%00` | Rejected |
| Unicode edge cases | Zero-width characters | Handled correctly |

## 7.4 SQL Injection Testing

| Vector | Test | Expected Result |
|---|---|---|
| Text field injection | `' UNION SELECT * FROM users --` | Treated as literal string |
| ID parameter injection | `1 OR 1=1` | Treated as invalid ID |
| Sort parameter injection | `id; DROP TABLE users` | Rejected by validation |
| Filter parameter injection | `status=active'; DELETE FROM users--` | Treated as literal string |
| Order by injection | `id ASC; DROP TABLE users--` | Rejected |

Prisma parameterized queries prevent SQL injection by design. Testing verifies that no raw query bypass exists.

## 7.5 XSS Testing

| Vector | Test | Expected Result |
|---|---|---|
| Reflected XSS | URL parameter `<script>` | Encoded in response |
| Stored XSS | Input `<script>` saved and displayed | Escaped on display |
| DOM XSS | Client-side script injection | React auto-escapes |
| CSS injection | `<style>` in input | Stripped or escaped |

React escapes JSX by default. Testing verifies no `dangerouslySetInnerHTML` usage with user input.

## 7.6 CSRF Testing

| Vector | Test | Expected Result |
|---|---|---|
| Cross-origin form POST | Form from evil.com | CORS blocks |
| Cookie-based replay | Stale cookie reuse | SameSite prevents |
| Token manipulation | Modified JWT | Signature verification fails |

JWT in Authorization header (not cookie) provides natural CSRF protection. Testing verifies no state-changing operations rely on cookies alone.

## 7.7 File Upload Security Testing

| Vector | Test | Expected Result |
|---|---|---|
| Executable upload | `.exe`, `.php` file | MIME type rejected |
| Oversized file | 100MB file | Size limit enforced |
| Path traversal filename | `../../etc/cron` | Filename sanitized |
| Double extension | `image.php.jpg` | MIME validated, not extension |
| Polyglot file | JPEG with PHP payload | Magic byte validation |
| Symlink attack | Symlink to sensitive file | Rejected |

---

# PART 8 — Performance Testing

## 8.1 Load Testing

| Property | Value |
|---|---|
| **Purpose** | Validate system behavior under expected load |
| **Duration** | 30 minutes |
| **Concurrent users** | 50 (expected peak) |
| **Requests per second** | 100 (expected average) |
| **Success criteria** | 95% requests < 500ms, 0% errors |
| **Tool** | Apache Bench, k6, or Artillery (future) |

## 8.2 Stress Testing

| Property | Value |
|---|---|
| **Purpose** | Find system breaking point |
| **Duration** | 15 minutes |
| **Concurrent users** | 50 → 100 → 200 → 500 (gradual increase) |
| **Success criteria** | System degrades gracefully, no crashes |
| **Measurement** | Response time, error rate, memory usage |

## 8.3 Spike Testing

| Property | Value |
|---|---|
| **Purpose** | Validate behavior during sudden traffic spike |
| **Pattern** | Normal → spike (10x) → normal |
| **Duration** | 5 minutes |
| **Success criteria** | System recovers after spike, no data loss |
| **Measurement** | Recovery time, error rate during spike |

## 8.4 Endurance Testing

| Property | Value |
|---|---|
| **Purpose** | Find memory leaks, resource exhaustion |
| **Duration** | 4 hours |
| **Concurrent users** | 20 (sustained) |
| **Success criteria** | No memory growth, no connection leaks |
| **Measurement** | Memory usage over time, connection count |

## 8.5 Performance Baselines

| Metric | Target | Measurement |
|---|---|---|
| API response time (p50) | < 100ms | Application logs |
| API response time (p95) | < 500ms | Application logs |
| API response time (p99) | < 1000ms | Application logs |
| Page load time | < 2 seconds | Lighthouse |
| Time to first byte | < 200ms | Nginx logs |
| Database query time (p95) | < 100ms | PostgreSQL logs |
| File upload (10MB) | < 5 seconds | Application logs |
| PDF generation | < 3 seconds | Application logs |

---

# PART 9 — Test Data Management

## 9.1 Seed Data

| Dataset | Contents | Usage |
|---|---|---|
| Default admin | `admin@localhost.com` / `admin123456` | Admin testing |
| Test users | 10 users (free, premium, admin) | Role testing |
| Test poojas | 5 poojas (various categories, statuses) | Booking testing |
| Test donations | 20 donations (various statuses) | Financial testing |
| Test bookings | 15 bookings (various statuses) | Booking flow testing |
| Test festivals | 3 festivals (active, archived) | Display testing |
| Test gallery items | 10 items (various categories) | Gallery testing |
| Expense categories | 5 categories | Expense testing |
| Payment accounts | 1 payment account | Payment testing |

## 9.2 Mock Data

| Mock | Purpose | Implementation |
|---|---|---|
| SMTP service | Prevent real emails in tests | Mock transporter |
| Google OAuth | Prevent real OAuth in tests | Mock OAuth flow |
| File storage | Prevent real file writes in tests | In-memory mock |
| Clock/time | Test time-dependent logic | Mock Date/now |
| UUID generation | Deterministic IDs in tests | Mock uuid |

## 9.3 Production-like Data

| Property | Value |
|---|---|
| User count | 50-100 users |
| Booking count | 100-200 bookings |
| Donation count | 200-500 donations |
| Financial data | Realistic EUR amounts |
| Date ranges | Spanning 6+ months |
| Status distribution | All statuses represented |

## 9.4 Cleanup Strategy

| Strategy | When | How |
|---|---|---|
| Transaction rollback | Each test | Tests run in transactions, rolled back after |
| Database truncate | Between test suites | Truncate all tables, re-seed |
| Full reset | Before test run | Drop and recreate database |
| Snapshot/restore | Before test suite | Restore from snapshot |

---

# PART 10 — QA Workflow

## 10.1 Development Phase

| Activity | Owner | Exit Criteria |
|---|---|---|
| Write code | Developer | Feature complete |
| Write unit tests | Developer | All business logic tested |
| Write integration tests | Developer | All service interactions tested |
| Self-test | Developer | All tests pass locally |
| Code review | Team lead | Code quality acceptable |

## 10.2 QA Phase

| Activity | Owner | Exit Criteria |
|---|---|---|
| Review test coverage | QA | Adequate coverage for changes |
| Execute manual tests | QA | All scenarios pass |
| Exploratory testing | QA | No critical issues found |
| Regression test | QA (automated) | No regressions detected |
| Security review | QA/Dev | No vulnerabilities in changes |
| Performance check | QA | No performance degradation |

## 10.3 Staging Phase

| Activity | Owner | Exit Criteria |
|---|---|---|
| Deploy to staging | Automated | Deployment succeeds |
| Smoke test | Automated | All critical paths pass |
| Integration verification | QA | End-to-end flows work |
| UAT preparation | QA | Test scenarios documented |

## 10.4 UAT Phase

| Activity | Owner | Exit Criteria |
|---|---|---|
| User acceptance testing | Admin/stakeholder | All acceptance criteria met |
| Business validation | Admin | Business rules work correctly |
| Visual review | Admin | UI matches expectations |
| Sign-off | Admin | Approved for production |

## 10.5 Production Phase

| Activity | Owner | Exit Criteria |
|---|---|---|
| Deploy to production | Admin | Deployment succeeds |
| Smoke test | Automated | All critical paths pass |
| Monitoring | Admin | No errors for 24 hours |
| User feedback | Support | No critical issues reported |

---

# PART 11 — Release Validation

## 11.1 Pre-Release Checklist

| Category | Check | Verified |
|---|---|---|
| **Code Quality** | All lint checks pass | [ ] |
| | No console.log in production code | [ ] |
| | No TODO/FIXME in critical paths | [ ] |
| | Code reviewed and approved | [ ] |
| **Testing** | Unit test coverage ≥80% for changed code | [ ] |
| | All integration tests pass | [ ] |
| | API tests pass | [ ] |
| | Security tests pass | [ ] |
| | Regression tests pass | [ ] |
| **Database** | Migrations tested in staging | [ ] |
| | Migrations preserve data | [ ] |
| | Rollback plan documented | [ ] |
| | Backup verified | [ ] |
| **Security** | npm audit: no critical/high | [ ] |
| | JWT security verified | [ ] |
| | RBAC permissions correct | [ ] |
| | Input validation working | [ ] |
| **Performance** | Response times within baseline | [ ] |
| | No memory leaks detected | [ ] |
| | Database queries optimized | [ ] |
| **Deployment** | Build succeeds | [ ] |
| | Staging deployment verified | [ ] |
| | Rollback procedure tested | [ ] |
| | Maintenance mode tested | [ ] |
| **Documentation** | Release notes written | [ ] |
| | Changelog updated | [ ] |
| | API docs updated (if applicable) | [ ] |

## 11.2 Post-Release Checklist

| Category | Check | Timing |
|---|---|---|
| Health check | API health endpoint returns 200 | Immediately |
| Smoke test | Critical paths work | Within 5 minutes |
| Error monitoring | No new errors | Within 15 minutes |
| User feedback | No critical issues | Within 24 hours |
| Performance | Response times normal | Within 48 hours |
| Security | No suspicious activity | Within 1 week |

## 11.3 Release Validation Matrix

| Release Type | Testing Required | Approval Required |
|---|---|---|
| Patch (bug fix) | Unit + integration + smoke | Team lead |
| Minor (feature) | Full test suite + UAT | Team lead + Admin |
| Major (breaking) | Full test suite + UAT + performance | Admin |
| Hotfix (critical) | Targeted tests + smoke | Admin (expedited) |

---

# PART 12 — Master QA Blueprint

## 12.1 Testing Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLAN                                         │
│                                                                   │
│  Risk Assessment → Test Strategy → Test Cases → Test Data       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOP                                      │
│                                                                   │
│  Write Code → Write Tests → Unit Test → Code Review             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATE                                    │
│                                                                   │
│  CI Pipeline → Lint → Build → Integration Tests → Security Scan │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VALIDATE                                     │
│                                                                   │
│  API Tests → Database Tests → Performance Tests → Regression    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE                                        │
│                                                                   │
│  Deploy to Staging → Smoke Test → UAT → Exploratory Testing     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RELEASE                                      │
│                                                                   │
│  Deploy to Production → Smoke Test → Monitor → Verify           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MONITOR                                      │
│                                                                   │
│  Error Monitoring → Performance → User Feedback → Learn         │
└─────────────────────────────────────────────────────────────────┘
```

## 12.2 Quality Gates

```
Code Written
    │
    ├── Gate 1: Unit Tests Pass
    │   └── Coverage ≥80% for changed files
    │
    ├── Gate 2: Lint Clean
    │   └── Zero ESLint errors
    │
    ├── Gate 3: Build Succeeds
    │   └── Frontend + backend build
    │
    ├── Gate 4: Integration Tests Pass
    │   └── All service interactions verified
    │
    ├── Gate 5: Security Scan Clean
    │   └── No critical/high vulnerabilities
    │
    ├── Gate 6: API Tests Pass
    │   └── All endpoints verified
    │
    ├── Gate 7: Staging Verification
    │   └── Smoke + manual QA pass
    │
    ├── Gate 8: UAT Approved
    │   └── Stakeholder sign-off
    │
    └── Gate 9: Production Smoke Test
        └── Critical paths verified
```

## 12.3 Testing Responsibilities

| Role | Testing Responsibilities |
|---|---|
| **Developer** | Write unit tests, write integration tests, self-test, fix bugs |
| **Team Lead** | Review test coverage, approve test strategy |
| **QA** | Manual testing, exploratory testing, regression, performance |
| **Admin (Stakeholder)** | UAT, business validation, release approval |
| **Automated (CI)** | Lint, build, unit tests, integration tests, security scan |
| **Automated (CD)** | Smoke tests, health checks, deployment verification |

## 12.4 Test Coverage Targets

| Layer | Target | Measurement |
|---|---|---|
| Unit tests (services) | 80% line coverage | Jest coverage report |
| Unit tests (utilities) | 90% line coverage | Jest coverage report |
| Integration tests (API) | 100% endpoints | Endpoint checklist |
| Integration tests (flows) | All critical paths | Flow checklist |
| Security tests | All OWASP Top 10 | Security checklist |
| E2E tests | Critical user journeys | Flow checklist |

## 12.5 Future Automation Roadmap

| Phase | Automation | Tool |
|---|---|---|
| **Current** | Unit tests (manual setup) | Jest |
| **Phase 1** | CI integration test execution | GitHub Actions |
| **Phase 2** | API test automation | Supertest + Jest |
| **Phase 3** | E2E test automation | Playwright |
| **Phase 4** | Visual regression testing | Playwright screenshots |
| **Phase 5** | Performance test automation | k6 or Artillery |
| **Phase 6** | Security test automation | OWASP ZAP |
| **Phase 7** | Accessibility test automation | axe-core |

## 12.6 Defect Management

| Severity | Description | Response Time | Resolution Time |
|---|---|---|---|
| Critical | System down, data loss, security breach | Immediate | 4 hours |
| High | Major feature broken, no workaround | 4 hours | 24 hours |
| Medium | Feature broken, workaround exists | 24 hours | 1 week |
| Low | Minor issue, cosmetic | 1 week | Next release |
| Informational | Suggestion, minor improvement | Next review | Backlog |

## 12.7 Test Environment Matrix

| Environment | Database | External Services | Purpose |
|---|---|---|---|
| Development | Local PostgreSQL | Mocked | Unit + integration tests |
| CI | Test PostgreSQL | Mocked | Automated test execution |
| Staging | Production-like PostgreSQL | Sandbox SMTP | UAT + smoke tests |
| Production | Production PostgreSQL | Real services | Smoke tests only |

---

## Appendix: Testing Metrics

| Metric | Target | Measurement |
|---|---|---|
| Test pass rate | >99% | CI/CD reports |
| Code coverage (overall) | >60% | Jest coverage |
| Code coverage (services) | >80% | Jest coverage |
| Defect escape rate | <5% | Production defects / total defects |
| Mean time to detect | <1 hour | Time from introduction to detection |
| Mean time to fix | <4 hours | Time from detection to resolution |
| Test execution time | <10 minutes | CI pipeline duration |
| Regression rate | <2% | Regressions per release |

---

*This document is the complete Testing & Quality Assurance Architecture Blueprint. It is the authoritative reference for all testing decisions, quality gates, and QA processes. Every test type, coverage target, validation checklist, and workflow is defined here before any test code is written.*
