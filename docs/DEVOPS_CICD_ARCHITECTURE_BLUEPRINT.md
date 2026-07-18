# DevOps & CI/CD Architecture Blueprint

**Sri Siththi Vinayagar Temple — DevOps Lifecycle Architecture**
**Version:** 1.0 | **Date:** 2026-07-11 | **Status:** Pre-Implementation Blueprint
**Stack:** React 18, Express 5, PostgreSQL, Prisma ORM, Hostinger VPS, Node.js 22, Git

---

## Table of Contents

- [PART 1 — DevOps Philosophy](#part-1--devops-philosophy)
- [PART 2 — Source Control Strategy](#part-2--source-control-strategy)
- [PART 3 — Repository Architecture](#part-3--repository-architecture)
- [PART 4 — Build Architecture](#part-4--build-architecture)
- [PART 5 — CI Pipeline](#part-5--ci-pipeline)
- [PART 6 — CD Pipeline](#part-6--cd-pipeline)
- [PART 7 — Versioning Strategy](#part-7--versioning-strategy)
- [PART 8 — Release Management](#part-8--release-management)
- [PART 9 — Environment Promotion](#part-9--environment-promotion)
- [PART 10 — Rollback Management](#part-10--rollback-management)
- [PART 11 — Quality Gates](#part-11--quality-gates)
- [PART 12 — Dependency Management](#part-12--dependency-management)
- [PART 13 — Operational Automation](#part-13--operational-automation)
- [PART 14 — Deployment Governance](#part-14--deployment-governance)
- [PART 15 — Master DevOps Blueprint](#part-15--master-devops-blueprint)

---

# PART 1 — DevOps Philosophy

## 1.1 Continuous Integration

The project follows a continuous integration practice where every code change is validated automatically before it is merged. Developers push changes to feature branches. Each push triggers a CI pipeline that lints the code, checks for type errors, validates dependencies, and verifies the build succeeds. Pull requests cannot be merged until all CI checks pass. This ensures the main branch is always in a deployable state. The CI pipeline runs in under 5 minutes for fast feedback.

## 1.2 Continuous Delivery

Every merge to the main branch produces a release candidate. The CD pipeline deploys this candidate to a staging environment automatically. Production deployment requires manual approval. The system is always ready for production release — the decision to release is a human judgment call, not a technical barrier. This balances automation with control appropriate for a financial and membership management platform.

## 1.3 Release Management

Releases follow semantic versioning. Each release has a version number, release notes, and a deployment record. Releases are planned, not ad-hoc. Emergency hotfixes follow an expedited process but still require all quality gates. The release process is documented, repeatable, and auditable. Every production deployment is traceable to a git commit, a pull request, and an approval record.

## 1.4 Deployment Strategy

The deployment strategy is blue-green at the application level and rolling at the database level. The application deployment uses PM2's graceful restart — the new process starts before the old one stops, eliminating downtime for API requests. Database migrations are backward-compatible, applied before the new application code starts. The deployment strategy prioritizes zero-downtime for the API and minimal disruption for users.

## 1.5 Automation Principles

Automation is applied everywhere it reduces human error and increases consistency. Manual steps are avoided in deployment, configuration, backup, and monitoring. However, automation is not applied where human judgment is required — code review, release approval, and incident response remain human-driven. The principle is: automate the routine, verify the critical, review the important.

---

# PART 2 — Source Control Strategy

## 2.1 Git Branching Model

The project uses a simplified Git Flow model adapted for a small team and continuous delivery.

```
main ─────────────────────────────────────────────────→ (production)
  │
  ├── feature/user-auth ────────────┐
  │                                  │
  ├── feature/donation-api ──────┐  │
  │                              │  │
  │                              ▼  │
  │                         (merge) │
  │                                  │
  ├── release/v1.2.0 ───────────────┤
  │                                  │
  │                                  ▼
  │                             (merge to main, tag v1.2.0)
  │
  ├── hotfix/security-patch ────────┐
  │                                  │
  │                                  ▼
  │                             (merge to main, tag v1.2.1)
```

## 2.2 Main Branch

| Property | Value |
|---|---|
| **Purpose** | Production-ready code |
| **Protection** | No direct pushes; PRs only |
| **CI validation** | Full pipeline on every merge |
| **CD trigger** | Auto-deploy to staging, manual to production |
| **Always deployable** | Yes |

The main branch represents the current production state. Every commit on main is deployable. Breaking this rule requires immediate rollback.

## 2.3 Development Branch

| Property | Value |
|---|---|
| **Purpose** | Integration branch for feature work |
| **Protection** | PRs required, CI validation |
| **Deployed to** | Development/staging environment |
| **Merges from** | Feature branches |
| **Merges to** | main (via release branches) |

The development branch is the working branch where features are integrated before release. It may be temporarily broken during active development, but is stabilized before creating release branches.

## 2.4 Feature Branches

| Property | Value |
|---|---|
| **Naming** | `feature/{short-description}` |
| **Lifetime** | 1-5 days typically |
| **Source** | development |
| **Target** | development |
| **CI** | Runs on push |
| **PR required** | Yes |

Feature branches are short-lived. Long-lived branches are discouraged because they accumulate merge conflicts and diverge from the main codebase. If a feature takes more than 5 days, it should be broken into smaller, mergeable pieces.

## 2.5 Release Branches

| Property | Value |
|---|---|
| **Naming** | `release/v{major}.{minor}.{patch}` |
| **Lifetime** | Until release is deployed to production |
| **Source** | development |
| **Target** | main |
| **Changes allowed** | Bug fixes only, no new features |
| **CI** | Full pipeline |

Release branches are created when development is ready for release. Only bug fixes and release preparation (version bumps, changelog) are allowed on release branches. New features continue on development.

## 2.6 Hotfix Branches

| Property | Value |
|---|---|
| **Naming** | `hotfix/{short-description}` |
| **Lifetime** | Until fix is deployed |
| **Source** | main |
| **Target** | main + development |
| **CI** | Full pipeline |
| **Approval** | Expedited, but required |

Hotfix branches address critical production issues. They branch from main, apply the fix, and merge back to both main and development. Hotfixes follow the same quality gates as regular releases, just faster.

## 2.7 Version Tagging

| Format | Example | Usage |
|---|---|---|
| `v{major}.{minor}.{patch}` | `v1.2.3` | Production releases |
| `v{major}.{minor}.{patch}-rc.{n}` | `v1.2.3-rc.1` | Release candidates |
| `v{major}.{minor}.{patch}-hotfix.{n}` | `v1.2.3-hotfix.1` | Emergency fixes |

Tags are immutable. Once a tag is created, it points to a specific commit forever. Tags are created automatically during the release process.

---

# PART 3 — Repository Architecture

## 3.1 Monorepo Structure

```
vinayagar-site/
├── apps/
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   ├── dist/             # Build output (gitignored)
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── eslint.config.mjs
│   ├── api/                  # Express backend
│   │   ├── src/
│   │   ├── package.json
│   │   └── eslint.config.mjs
│   └── pocketbase/           # PocketBase (migration period only)
│       ├── pb_hooks/
│       ├── pb_migrations/
│       └── pb_data/          # (gitignored)
├── docs/                     # Architecture documentation
├── package.json              # Root workspace config
├── .nvmrc                    # Node.js version
├── .gitignore
├── .eslintrc                 # Root ESLint (deprecated, using config files)
├── AGENTS.md                 # Agent instructions
└── README.md                 # Project readme
```

## 3.2 Shared Packages

| Package | Location | Usage |
|---|---|---|
| `apps/web` | Frontend | React SPA, UI components, styles |
| `apps/api` | Backend | Express API, services, repositories |
| `apps/pocketbase` | Migration | PocketBase hooks, migrations (temporary) |

The monorepo uses npm workspaces. Each app has its own `package.json` and dependency tree. Shared code is imported directly between apps (not as separate packages) for simplicity.

## 3.3 Build Dependencies

```
Build Order:
1. apps/api (backend) — no frontend dependency
2. apps/web (frontend) — may call API at build time (SSG, env injection)
3. apps/pocketbase (migration) — independent
```

## 3.4 Package Management

| Tool | Version | Lock File |
|---|---|---|
| npm | 10.x | `package-lock.json` (root + each app) |

Package management follows strict rules:
- Lock files are committed to version control
- `npm ci` is used in CI/CD (clean install from lock file)
- `npm install` is used only by developers adding new dependencies
- Dependencies are reviewed before addition (see Part 12)

## 3.5 Version Management

| Item | Strategy |
|---|---|
| Application version | Git tags (`v1.2.3`) |
| Package version | `package.json` version field |
| Database schema | Prisma migrations (timestamp-based) |
| API version | URL path (future: `/hcgi/api/v1/`) |
| Dependencies | `package-lock.json` (pinned) |

---

# PART 4 — Build Architecture

## 4.1 Frontend Build

| Step | Command | Output |
|---|---|---|
| Install dependencies | `npm install` | `node_modules/` |
| Lint | `npm run lint` | Pass/fail |
| Build | `npm run build` | `dist/` directory |
| Output | Static HTML, CSS, JS, assets | Served by Nginx |

The frontend build produces a static SPA. No server-side rendering. Build output is deterministic — same commit produces identical files.

## 4.2 Backend Build

| Step | Command | Output |
|---|---|---|
| Install dependencies | `npm install` | `node_modules/` |
| Lint | `npm run lint` | Pass/fail |
| Generate Prisma client | `npx prisma generate` | `.prisma/client/` |
| Verify startup | `node src/main.js --dry-run` (if implemented) | Pass/fail |

The backend does not have a compilation step (ESM, no TypeScript initially). The "build" is dependency installation and Prisma client generation.

## 4.3 Prisma Generation

| Step | Command | When |
|---|---|---|
| Generate client | `npx prisma generate` | After dependency install |
| Check migrations | `npx prisma migrate status` | Before deployment |
| Apply migrations | `npx prisma migrate deploy` | During deployment |
| Push schema | `npx prisma db push` | During development only |

## 4.4 Asset Generation

| Asset | Source | Output | When |
|---|---|---|---|
| Frontend build | `apps/web/src/` | `apps/web/dist/` | Build time |
| Prisma client | `prisma/schema.prisma` | `.prisma/client/` | Install time |
| Thumbnails | Upload image | Multiple sizes | Upload time (runtime) |
| Receipts | Template + data | PDF | Runtime |

## 4.5 Environment-Specific Builds

| Environment | Build Type | Optimization |
|---|---|---|
| Development | Dev build (Vite dev server) | HMR, source maps |
| Testing | Production build | Minified, no source maps |
| Staging | Production build | Same as production |
| Production | Production build | Minified, compressed, fingerprinted |

All environments use the same codebase. Environment differences are controlled by environment variables, not build-time conditional compilation.

---

# PART 5 — CI Pipeline

## 5.1 Pipeline Overview

```
Push to Feature Branch / PR
    │
    ├── Code Validation
    │   ├── Lint check (ESLint)
    │   ├── Format check (Prettier, future)
    │   └── Import cycle detection
    │
    ├── Dependency Validation
    │   ├── npm ci (clean install)
    │   ├── npm audit (security)
    │   └── Lock file integrity
    │
    ├── Build Verification
    │   ├── Frontend build (npm run build)
    │   ├── Prisma generate
    │   └── Backend startup check
    │
    ├── Static Analysis
    │   ├── Unused import detection
    │   ├── Console.log detection (warning)
    │   └── TODO/FIXME tracking
    │
    └── Result: Pass / Fail
        ├── Pass → PR eligible for review
        └── Fail → Block merge, notify developer
```

## 5.2 Code Validation

| Check | Tool | Failure Action |
|---|---|---|
| ESLint errors | ESLint | Block merge |
| ESLint warnings | ESLint | Warn, do not block |
| Prettier formatting (future) | Prettier | Block merge |
| Import cycles | ESLint no-cycle | Block merge |

## 5.3 Linting

| Scope | Config File | Rules |
|---|---|---|
| Frontend | `apps/web/eslint.config.mjs` | React, import, unused-vars |
| Backend | `apps/api/eslint.config.mjs` | Node, import, unused-vars |
| Root | — | Workspace linting |

Linting runs on every push. Errors block merge. Warnings are noted but do not block.

## 5.4 Static Analysis

| Check | Purpose | Severity |
|---|---|---|
| `no-unused-vars` | Dead code detection | Error |
| `no-console` | Production console.log prevention | Warning |
| `import/no-cycle` | Circular dependency detection | Error |
| `no-undef` | Undefined variable detection | Error |

## 5.5 Dependency Validation

| Check | Command | Failure Action |
|---|---|---|
| Clean install | `npm ci` | Block (lock file mismatch) |
| Security audit | `npm audit` | Block on critical/high |
| Outdated check | `npm outdated` | Informational |

## 5.6 Security Scanning

| Check | Frequency | Action |
|---|---|---|
| npm audit (critical) | Every CI run | Block merge |
| npm audit (high) | Every CI run | Block merge |
| npm audit (moderate) | Every CI run | Warn |
| npm audit (low) | Every CI run | Informational |
| License check (future) | Weekly | Review |

## 5.7 Build Verification

| Check | Scope | Failure Action |
|---|---|---|
| Frontend builds | `npm run build` | Block merge |
| Prisma generates | `npx prisma generate` | Block merge |
| Backend starts | Health check after start | Block merge |

---

# PART 6 — CD Pipeline

## 6.1 Staging Deployment

```
Merge to main
    │
    ├── Build
    │   ├── npm ci
    │   ├── npm run build (frontend)
    │   └── npx prisma generate
    │
    ├── Deploy to Staging
    │   ├── Copy build artifacts to staging directory
    │   ├── Run database migrations (staging DB)
    │   └── Restart staging API (pm2 restart staging-api)
    │
    ├── Verify
    │   ├── Health check (staging)
    │   ├── Smoke tests (key endpoints)
    │   └── Visual regression (manual)
    │
    └── Result: Staging ready for review
```

## 6.2 Production Deployment

```
Staging verified + Manual approval
    │
    ├── Pre-deployment
    │   ├── Backup database
    │   ├── Notify team of deployment
    │   └── Enable maintenance mode (optional)
    │
    ├── Deploy
    │   ├── Pull latest code
    │   ├── Install dependencies
    │   ├── Build frontend
    │   ├── Run database migrations
    │   ├── Restart API (pm2 restart)
    │   └── Deploy frontend (copy to Nginx)
    │
    ├── Verify
    │   ├── Health check
    │   ├── Smoke tests
    │   ├── Monitor error rates (15 min)
    │   └── Disable maintenance mode
    │
    └── Complete
        ├── Tag release
        ├── Update changelog
        └── Notify team
```

## 6.3 Approval Gates

| Gate | Approver | Criteria |
|---|---|---|
| PR merge to main | Team lead / senior dev | Code quality, test results |
| Staging deployment | Automated | CI passes |
| Production deployment | Admin / team lead | Staging verified, no critical issues |
| Hotfix deployment | Admin | Critical issue confirmed |

## 6.4 Rollback Strategy

| Scenario | Rollback Action | Time |
|---|---|---|
| Frontend issue | Restore previous build files | 2 minutes |
| API issue | pm2 restart with previous code | 5 minutes |
| Database issue | Restore from pre-migration backup | 30 minutes |
| Full rollback | Restore all from backup | 1 hour |

## 6.5 Deployment Verification

| Check | Method | Timing |
|---|---|---|
| Health endpoint | HTTP GET | Immediately after deploy |
| Login test | API call | Within 5 minutes |
| Key endpoints | API calls | Within 15 minutes |
| Error monitoring | Log review | 30 minutes |
| User feedback | Support channels | 24 hours |

---

# PART 7 — Versioning Strategy

## 7.1 Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

| Component | Increment When |
|---|---|
| **MAJOR** | Breaking changes to API, database schema, or user-facing features |
| **MINOR** | New features, backward-compatible |
| **PATCH** | Bug fixes, security patches, backward-compatible |

Examples:
- `1.0.0` → Initial production release
- `1.1.0` → Added donation reporting feature
- `1.1.1` → Fixed booking receipt generation
- `2.0.0` → PocketBase to PostgreSQL migration (breaking schema change)

## 7.2 Release Numbers

| Release Type | Version Pattern | Example | Frequency |
|---|---|---|---|
| Major | `X.0.0` | `2.0.0` | Annually or for major migrations |
| Minor | `x.Y.0` | `1.3.0` | Bi-weekly or monthly |
| Patch | `x.y.Z` | `1.3.2` | As needed |
| Release candidate | `x.y.Z-rc.N` | `1.3.0-rc.1` | Before major/minor |
| Hotfix | `x.y.Z-hotfix.N` | `1.3.2-hotfix.1` | Emergency only |

## 7.3 Database Versioning

| Approach | Description |
|---|---|
| Prisma migrations | Timestamp-based (`20260711153000_`) |
| Schema version | Implicit from migration history |
| Migration rollback | Backup + restore (not inverse migrations) |
| Version tracking | `prisma migrate status` shows pending/applied |

Database versioning is decoupled from application versioning. A single application version may apply multiple database migrations.

## 7.4 API Versioning

| Phase | Approach |
|---|---|
| Current | No versioning (single API) |
| Future | URL path versioning (`/hcgi/api/v1/...`) |
| Breaking changes | New version path, old version deprecated |
| Deprecation | 6-month overlap between versions |

API versioning is预留d but not implemented initially. The current API is young enough that breaking changes can be handled through migration scripts rather than version coexistence.

---

# PART 8 — Release Management

## 8.1 Release Planning

| Activity | Frequency | Participants |
|---|---|---|
| Sprint planning | Bi-weekly | Team |
| Feature prioritization | Monthly | Admin + team |
| Release scheduling | Bi-weekly | Team |
| Post-release review | After each release | Team |

## 8.2 Feature Freeze

| Property | Value |
|---|---|
| Trigger | Creating release branch from development |
| Duration | Until release is deployed to production |
| Allowed changes | Bug fixes, documentation, configuration |
| Forbidden changes | New features, refactoring, dependency upgrades |

Feature freeze ensures the release branch stabilizes. New features continue on development for the next release.

## 8.3 Release Checklist

| Step | Owner | Verified |
|---|---|---|
| All planned features merged | Team lead | Yes |
| All CI checks passing | Automated | Yes |
| Lint clean | Automated | Yes |
| Build succeeds | Automated | Yes |
| Database migrations tested | Developer | Yes |
| Staging deployment verified | QA / team lead | Yes |
| Release notes written | Developer | Yes |
| Version number bumped | Developer | Yes |
| Changelog updated | Developer | Yes |
| Security audit passed | Automated | Yes |
| Performance baseline met | Developer | Yes |
| Rollback procedure tested | DevOps | Yes |
| Backup verified | Automated | Yes |
| Stakeholder approval | Admin | Yes |

## 8.4 Release Approval

| Release Type | Approver | Process |
|---|---|---|
| Minor (features) | Team lead | PR review + staging verification |
| Major (breaking) | Admin + team lead | Full review + staging verification + rollback test |
| Patch (bug fix) | Team lead | PR review + staging verification |
| Hotfix (critical) | Admin | Expedited review + immediate deployment |

## 8.5 Release Notes

Release notes follow a consistent format:

```
# Release v1.2.0

## New Features
- Added donation receipt PDF generation
- Added subscription expiry reminders

## Bug Fixes
- Fixed booking status not updating after approval
- Fixed email template rendering in German

## Improvements
- Improved dashboard load time by 40%
- Added input validation for phone numbers

## Security
- Updated bcrypt to fix timing attack vulnerability

## Breaking Changes
- None

## Migration Required
- None (database changes are backward-compatible)
```

---

# PART 9 — Environment Promotion

## 9.1 Promotion Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Development │ ──→ │   Testing   │ ──→ │   Staging   │ ──→ │ Production  │
│             │     │             │     │             │     │             │
│  Local dev  │     │  CI server  │     │  Staging    │     │  Production │
│  PB/PG      │     │  Test DB    │     │  VPS        │     │  VPS        │
│  Hot reload │     │  Automated  │     │  Manual QA  │     │  Live       │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## 9.2 Development → Testing

| Rule | Value |
|---|---|
| Trigger | Push to feature branch |
| Validation | CI pipeline (lint, build, security) |
| Environment | CI server or local |
| Database | Test database (fresh or seeded) |
| Approval | Automated (CI passes) |

## 9.3 Testing → Staging

| Rule | Value |
|---|---|
| Trigger | Merge to main |
| Validation | CI passes + build succeeds |
| Environment | Staging (production-like) |
| Database | Staging database (production-like data) |
| Approval | Automated (staging deployment) |

## 9.4 Staging → Production

| Rule | Value |
|---|---|
| Trigger | Manual approval |
| Validation | Staging verified + smoke tests pass |
| Environment | Production VPS |
| Database | Production database |
| Approval | Manual (admin / team lead) |
| Monitoring | Enhanced monitoring for 24 hours |

## 9.5 Promotion Rules

| Rule | Description |
|---|---|
| No skipping environments | Code must pass through each environment |
| No direct to production | All changes go through staging first |
| Hotfix exception | Critical fixes may skip staging (but not testing) |
| Rollback readiness | Production deploy requires rollback plan |
| Backup required | Database backup before production deploy |

---

# PART 10 — Rollback Management

## 10.1 Application Rollback

| Scenario | Procedure | Time |
|---|---|---|
| Frontend regression | Restore previous `dist/` from backup | 2 min |
| API regression | `pm2 restart` with previous code checkout | 5 min |
| Dependency issue | `npm ci` with previous `package-lock.json` | 5 min |
| Configuration error | Restore previous `.env` + restart | 3 min |

## 10.2 Database Rollback

| Scenario | Procedure | Time |
|---|---|---|
| Migration fails | Restore from pre-migration backup | 30 min |
| Migration corrupts data | Restore from pre-migration backup | 30 min |
| Need to undo migration | Restore from backup (no inverse migrations) | 30 min |

Database rollback always uses backup restoration. Inverse migrations are not maintained because they are complex to write correctly and rarely needed.

## 10.3 Migration Rollback

| Step | Action |
|---|---|
| 1 | Stop the application |
| 2 | Restore database from pre-migration backup |
| 3 | Checkout previous code version |
| 4 | Restart application |
| 5 | Verify health checks |
| 6 | Investigate migration issue |

## 10.4 Emergency Rollback

Emergency rollback is the fastest path to restoring service:

| Step | Action | Time |
|---|---|---|
| 1 | Enable maintenance mode | 30 seconds |
| 2 | Restore database from backup | 10-30 minutes |
| 3 | Restore application from previous version | 2-5 minutes |
| 4 | Verify health | 1 minute |
| 5 | Disable maintenance mode | 30 seconds |

Total emergency rollback time: 15-40 minutes.

## 10.5 Rollback Decision Tree

```
Issue detected
    │
    ├── Is it a frontend issue?
    │   └── Yes → Restore previous build (2 min)
    │
    ├── Is it an API issue?
    │   └── Yes → Restart with previous code (5 min)
    │
    ├── Is it a database issue?
    │   └── Yes → Restore from backup (30 min)
    │
    ├── Is it a configuration issue?
    │   └── Yes → Restore config + restart (3 min)
    │
    └── Is it unclear?
        └── Enable maintenance mode, investigate, then rollback
```

---

# PART 11 — Quality Gates

## 11.1 Pre-Merge Quality Gates

| Gate | Tool | Pass Criteria |
|---|---|---|
| Lint | ESLint | Zero errors |
| Build | npm run build | Success |
| Dependencies | npm ci | Lock file valid |
| Security | npm audit | No critical/high |
| Import cycles | ESLint no-cycle | Zero cycles |
| Code review | PR review | Approved by 1 reviewer |

## 11.2 Pre-Deployment Quality Gates

| Gate | Tool | Pass Criteria |
|---|---|---|
| All CI checks | CI pipeline | All pass |
| Staging health | Health endpoint | 200 OK |
| Smoke tests | Manual or automated | Key endpoints work |
| Database migrations | prisma migrate status | All applied |
| Build verification | pm2 status | Process running |

## 11.3 Pre-Production Quality Gates

| Gate | Tool | Pass Criteria |
|---|---|---|
| Staging verification | Manual QA | No critical issues |
| Security scan | npm audit | No new vulnerabilities |
| Performance baseline | Response times | Within 2x of baseline |
| Rollback plan | Document | Procedure documented |
| Backup verified | Automated | Backup exists and is restorable |
| Stakeholder approval | Admin sign-off | Approved for production |

## 11.4 Post-Deployment Quality Gates

| Gate | Tool | Timing |
|---|---|---|
| Health check | Health endpoint | Immediately |
| Error monitoring | Error logs | 15 minutes |
| User feedback | Support channels | 24 hours |
| Performance monitoring | Response times | 48 hours |
| Security monitoring | Audit logs | 1 week |

---

# PART 12 — Dependency Management

## 12.1 npm Packages

| Category | Policy |
|---|---|
| Adding new package | Requires PR with justification |
| Package selection | Prefer: established, maintained, small, MIT license |
| Version pinning | Lock file committed, `npm ci` in CI/CD |
| Update frequency | Monthly review, weekly for security |

## 12.2 Prisma

| Property | Value |
|---|---|
| Version pinning | `package.json` + lock file |
| Update frequency | Quarterly (after testing) |
| Migration review | Every migration reviewed before merge |
| Breaking changes | Tested in staging before production |

## 12.3 Security Updates

| Severity | Response Time | Process |
|---|---|---|
| Critical | 24 hours | Emergency patch |
| High | 1 week | Regular release |
| Moderate | 1 month | Next release |
| Low | 3 months | Scheduled update |

## 12.4 License Review

| License | Status |
|---|---|
| MIT | Approved |
| Apache 2.0 | Approved |
| BSD | Approved |
| ISC | Approved |
| GPL | Requires review |
| AGPL | Prohibited |
| Commercial | Requires review |

## 12.5 Vulnerability Handling

| Step | Action |
|---|---|
| 1. Detect | `npm audit` in CI, GitHub Dependabot alerts |
| 2. Assess | Determine severity and exploitability |
| 3. Update | Upgrade to patched version |
| 4. Test | Run full CI pipeline |
| 5. Deploy | Include in next release (or emergency patch) |
| 6. Document | Record in changelog |

---

# PART 13 — Operational Automation

## 13.1 Scheduled Maintenance

| Task | Frequency | Automation |
|---|---|---|
| Database vacuum | Daily | PostgreSQL autovacuum + cron |
| Database analyze | Daily | PostgreSQL autovacuum + cron |
| Log rotation | Daily | logrotate |
| Temp file cleanup | Every 6 hours | Cron job |
| AI image cleanup | Daily | Cron job |
| Audit log cleanup | Weekly | Cron job |
| Backup cleanup | Daily | Cron job |

## 13.2 Backup Automation

| Backup Type | Trigger | Verification |
|---|---|---|
| Database dump | Daily 01:00 UTC | File size check |
| File uploads | Daily 02:00 UTC | File size check |
| Offsite copy | Daily 03:00 UTC | Checksum verification |
| Restore test | Weekly Sunday | Automated restore to test DB |

## 13.3 Cleanup Jobs

| Job | Frequency | What It Cleans |
|---|---|---|
| Temp files | Every 6 hours | Files older than 24 hours |
| AI images | Daily | Images older than 30 days |
| App logs | Daily | Logs older than 30 days |
| Access logs | Daily | Logs older than 90 days |
| DB backups | Daily | Backups older than 30 days |
| Orphaned files | Weekly | Files with no entity reference |

## 13.4 Health Verification

| Check | Frequency | Method |
|---|---|---|
| API health | Every 5 minutes | HTTP GET to health endpoint |
| Database health | Every 5 minutes | Health endpoint DB check |
| Disk usage | Every 15 minutes | System command |
| Process status | Every 1 minute | PM2 status |
| SSL certificate | Weekly | Certbot check |

---

# PART 14 — Deployment Governance

## 14.1 Responsibilities

| Role | Responsibilities |
|---|---|
| **Developer** | Write code, create PRs, fix bugs, write release notes |
| **Team Lead** | Code review, PR approval, release planning |
| **Admin** | Production deployment approval, incident response, infrastructure |
| **Automated (CI)** | Lint, build, security scan, test |
| **Automated (CD)** | Staging deployment, health checks, monitoring |

## 14.2 Approval Matrix

| Action | Required Approvals |
|---|---|
| Merge to development | CI passes |
| Merge to main | 1 code review + CI passes |
| Staging deployment | Automated (CI passes) |
| Production deployment | Admin or team lead |
| Database migration | Team lead (in staging), Admin (in production) |
| Dependency upgrade | Team lead |
| Security patch (critical) | Admin (expedited) |
| Infrastructure change | Admin |

## 14.3 Audit Trail

| Record | Storage | Retention |
|---|---|---|
| Git commits | Git repository | Indefinite |
| Pull requests | GitHub | Indefinite |
| CI pipeline results | CI platform | 90 days |
| Deployment records | Deployment log | 1 year |
| Release notes | Changelog + Git tags | Indefinite |
| Rollback records | Incident log | 1 year |

## 14.4 Operational Standards

| Standard | Description |
|---|---|
| No direct pushes to main | All changes through PRs |
| No force pushes | History is immutable |
| No commits without CI | All commits validated |
| No production deploys on Friday | Reduce weekend incident risk |
| No deploys during peak hours | Deploy during low-traffic periods |
| Always have a rollback plan | Before every production deploy |
| Always backup before migration | Before every database change |
| Always tag releases | Every production deployment |

---

# PART 15 — Master DevOps Blueprint

## 15.1 Complete DevOps Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOP                                       │
│                                                                   │
│  Feature Branch → Code → Lint → Commit → Push → PR → Review     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VALIDATE                                     │
│                                                                   │
│  CI Pipeline: Lint → Build → Security → Dependencies → Tests    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATE                                    │
│                                                                   │
│  Merge to Development → Integration Testing → Stabilization     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE                                        │
│                                                                   │
│  Release Branch → Build → Deploy to Staging → Manual QA         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPROVE                                      │
│                                                                   │
│  Release Checklist → Stakeholder Approval → Deployment Window   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOY                                       │
│                                                                   │
│  Backup → Migrate → Build → Deploy → Verify → Monitor          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MONITOR                                      │
│                                                                   │
│  Health Checks → Error Monitoring → Performance → User Feedback │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ITERATE                                      │
│                                                                   │
│  Post-Release Review → Lessons Learned → Next Sprint Planning   │
└─────────────────────────────────────────────────────────────────┘
```

## 15.2 Release Flow

```
Feature Complete
    │
    ├── PR to development
    │   └── CI passes → Merge
    │
    ├── Integration period (1-2 days)
    │   └── Verify on development
    │
    ├── Create release branch
    │   └── release/v1.2.0
    │
    ├── Feature freeze
    │   └── Only bug fixes
    │
    ├── Build & deploy to staging
    │   └── Staging verification
    │
    ├── Release checklist
    │   └── All items verified
    │
    ├── Admin approval
    │   └── Approved for production
    │
    ├── Deploy to production
    │   └── Backup → Migrate → Deploy → Verify
    │
    ├── Tag release
    │   └── v1.2.0
    │
    ├── Post-deployment monitoring
    │   └── 24-hour enhanced monitoring
    │
    └── Release complete
        └── Merge release branch to main, delete branch
```

## 15.3 Hotfix Flow

```
Critical Issue in Production
    │
    ├── Create hotfix branch from main
    │   └── hotfix/security-patch
    │
    ├── Fix the issue
    │   └── Minimal, focused change
    │
    ├── CI validation
    │   └── Full pipeline
    │
    ├── Admin approval
    │   └── Expedited review
    │
    ├── Deploy to production
    │   └── Backup → Deploy → Verify
    │
    ├── Tag hotfix
    │   └── v1.2.1
    │
    └── Merge to development
        └── Ensure fix is in future releases
```

## 15.4 Deployment Sequence

| Step | Action | Owner | Time |
|---|---|---|---|
| 1 | Announce maintenance window | Admin | T-24h |
| 2 | Create database backup | Automated | T-0 |
| 3 | Enable maintenance mode | Admin | T-0 |
| 4 | Pull latest code | Automated | T+1m |
| 5 | Install dependencies | Automated | T+2m |
| 6 | Build frontend | Automated | T+3m |
| 7 | Run database migrations | Automated | T+4m |
| 8 | Restart API server | Automated | T+5m |
| 9 | Deploy frontend to Nginx | Automated | T+6m |
| 10 | Verify health checks | Automated | T+7m |
| 11 | Run smoke tests | Automated | T+8m |
| 12 | Disable maintenance mode | Admin | T+10m |
| 13 | Monitor for 15 minutes | Automated + Admin | T+25m |
| 14 | Deployment complete | Admin | T+25m |

## 15.5 Operational Responsibilities

| Task | Frequency | Owner | Automation |
|---|---|---|---|
| Code review | Every PR | Team lead | Manual |
| Merge to main | After review | Team lead | Manual |
| Production deploy | Per release | Admin | Semi-automated |
| Database backup | Daily | Automated | Full |
| Log rotation | Daily | Automated | Full |
| Security audit | Weekly | Automated | Full |
| Dependency review | Monthly | Developer | Semi-automated |
| Disaster recovery test | Quarterly | Admin | Manual |
| Infrastructure review | Monthly | Admin | Manual |

## 15.6 Future Expansion

| Phase | Changes |
|---|---|
| **Current** | Manual deployment, PM2, single VPS |
| **Phase 1** | GitHub Actions for CI, automated staging deploy |
| **Phase 2** | Automated production deploy with approval gate |
| **Phase 3** | Docker containerization, blue-green deployment |
| **Phase 4** | Kubernetes, canary releases, feature flags |

## 15.7 Metrics

| Metric | Current Target | Future Target |
|---|---|---|
| CI pipeline duration | < 5 minutes | < 3 minutes |
| Deployment frequency | Weekly | Daily |
| Lead time for changes | 1 week | 1 day |
| Mean time to recovery | 1 hour | 15 minutes |
| Change failure rate | < 10% | < 5% |
| Rollback rate | < 5% | < 2% |

---

## Appendix: DevOps Tool Stack

| Category | Current Tool | Future Alternative |
|---|---|---|
| Version Control | Git + GitHub | Same |
| CI/CD | Manual + scripts | GitHub Actions |
| Process Manager | PM2 | Docker + orchestration |
| Reverse Proxy | Nginx | Same |
| Database | PostgreSQL | Managed PostgreSQL |
| Monitoring | PM2 monit + custom | Prometheus + Grafana |
| Logging | File-based | ELK stack or Loki |
| Backup | pg_dump + cron | Automated backup service |
| Secrets | Environment variables | Vault or SOPS |
| Artifact Storage | Local filesystem | S3-compatible storage |

---

*This document is the complete DevOps & CI/CD Architecture Blueprint. It is the authoritative reference for all deployment, release, and operational decisions. Every pipeline stage, quality gate, rollback procedure, and governance rule is defined here before any code is deployed.*
