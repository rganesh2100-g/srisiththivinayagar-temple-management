# Deployment & Infrastructure Architecture Blueprint

**Sri Siththi Vinayagar Temple — Production Infrastructure Architecture**
**Version:** 1.0 | **Date:** 2026-07-11 | **Status:** Pre-Implementation Blueprint
**Stack:** React 18, Express 5, PostgreSQL, Prisma ORM, JWT, Hostinger VPS, Node.js 22

---

## Table of Contents

- [PART 1 — Infrastructure Philosophy](#part-1--infrastructure-philosophy)
- [PART 2 — Production Infrastructure](#part-2--production-infrastructure)
- [PART 3 — Environment Architecture](#part-3--environment-architecture)
- [PART 4 — Server Architecture](#part-4--server-architecture)
- [PART 5 — Application Deployment](#part-5--application-deployment)
- [PART 6 — Network Architecture](#part-6--network-architecture)
- [PART 7 — Reverse Proxy Architecture](#part-7--reverse-proxy-architecture)
- [PART 8 — Database Infrastructure](#part-8--database-infrastructure)
- [PART 9 — Storage Architecture](#part-9--storage-architecture)
- [PART 10 — Configuration Management](#part-10--configuration-management)
- [PART 11 — Monitoring](#part-11--monitoring)
- [PART 12 — Logging Infrastructure](#part-12--logging-infrastructure)
- [PART 13 — Performance Architecture](#part-13--performance-architecture)
- [PART 14 — Backup Strategy](#part-14--backup-strategy)
- [PART 15 — Disaster Recovery](#part-15--disaster-recovery)
- [PART 16 — Scalability](#part-16--scalability)
- [PART 17 — Deployment Workflow](#part-17--deployment-workflow)
- [PART 18 — Migration Deployment](#part-18--migration-deployment)
- [PART 19 — Operational Checklist](#part-19--operational-checklist)
- [PART 20 — Master Infrastructure Blueprint](#part-20--master-infrastructure-blueprint)

---

# PART 1 — Infrastructure Philosophy

## 1.1 Scalability

The infrastructure is designed for vertical scaling first, horizontal scaling readiness second. The initial deployment targets a single Hostinger VPS where CPU, RAM, and disk can be upgraded without architectural changes. The application layer is stateless, meaning additional API instances can be added behind the load balancer when horizontal scaling becomes necessary. Background workers are designed as independent processes that can be distributed across machines. The database uses connection pooling to handle increased concurrent connections without requiring application changes.

## 1.2 Reliability

Reliability is achieved through layered redundancy. The application uses graceful error handling to prevent single failures from cascading. Database connections include automatic retry logic. Background jobs include idempotency guarantees — running a job twice produces the same result as running it once. Backups are automated and tested weekly. The system degrades gracefully: if email delivery fails, the core transaction still succeeds and email is retried asynchronously.

## 1.3 Availability

The target availability is 99.5% uptime (approximately 44 hours of downtime per year). This accounts for scheduled maintenance windows, deployment rollouts, and occasional infrastructure issues on Hostinger VPS. Unplanned downtime is minimized through health monitoring, automatic process restarts (PM2), and proactive alerting. The system does not require zero-downtime deployment initially, but the architecture supports it through rolling deployments.

## 1.4 Maintainability

The monorepo structure with npm workspaces keeps all code in a single repository with shared configuration. The four-layer architecture (Controller → Service → Repository → Prisma) ensures changes in one layer do not ripple unpredictably. Database migrations are managed by Prisma and version-controlled. Configuration is centralized in environment variables. Documentation is comprehensive and maintained alongside code. The deployment process is scripted and repeatable.

## 1.5 Security

Security is a first-class infrastructure concern. The server is hardened with firewall rules allowing only necessary ports. TLS terminates at the reverse proxy. Database and internal services are not exposed to the internet. Secrets are stored in environment variables, never in code. Backups are encrypted. Access logging captures all administrative actions. The principle of least privilege applies to every component — the application database user has only the permissions necessary for its operation.

## 1.6 Cost Optimization

The infrastructure is designed to minimize cost while meeting reliability requirements. Hostinger VPS provides adequate resources at a fraction of cloud provider costs. PostgreSQL runs locally instead of a managed service. File storage uses the local filesystem instead of S3 initially. Caching uses in-memory storage instead of Redis initially. Each cost-saving measure has a migration path to the more expensive alternative when scale demands it.

---

# PART 2 — Production Infrastructure

## 2.1 Architecture Diagram

```
                          INTERNET
                             │
                             ▼
                    ┌────────────────┐
                    │      DNS       │
                    │  (Hostinger)   │
                    └───────┬────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │   SSL/TLS      │
                    │ (Let's Encrypt)│
                    └───────┬────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │  Nginx (RP)    │
                    │  Port 80/443   │
                    └───────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────┐
     │ Static Files │ │  React   │ │  Express │
     │  (dist/web)  │ │  (SPA)   │ │  :3001   │
     └──────────────┘ └──────────┘ └─────┬────┘
                                         │
                            ┌────────────┼────────────┐
                            │            │            │
                            ▼            ▼            ▼
                     ┌──────────┐ ┌──────────┐ ┌──────────┐
                     │ PostgreSQL│ │  File    │ │  PM2     │
                     │  :5432   │ │ Storage  │ │ Workers  │
                     └──────────┘ └──────────┘ └──────────┘
```

## 2.2 Component Inventory

| Component | Technology | Port | Exposure |
|---|---|---|---|
| DNS | Hostinger DNS | 53 | Public |
| SSL Certificate | Let's Encrypt | — | — |
| Reverse Proxy | Nginx | 80, 443 | Public |
| Frontend | React SPA (static) | — | Served by Nginx |
| API Server | Express 5 + Node 22 | 3001 | Internal (via Nginx) |
| Background Workers | PM2 managed Node processes | — | Internal |
| Database | PostgreSQL 15+ | 5432 | Internal only |
| File Storage | Local filesystem | — | Internal |
| Process Manager | PM2 | — | Internal |
| Monitoring | PM2 + custom health checks | 3001 | Internal |

## 2.3 Client Layer

The React frontend is built to static files and served directly by Nginx. No Node.js process serves the frontend in production. This eliminates the frontend as a failure point and allows Nginx to serve static files with optimal performance (caching, compression, HTTP/2).

## 2.4 DNS Layer

| Record | Type | Value | TTL |
|---|---|---|---|
| `vinayagar-temple.com` | A | VPS IP address | 3600 |
| `www.vinayagar-temple.com` | CNAME | `vinayagar-temple.com` | 3600 |
| `api.vinayagar-temple.com` | A | VPS IP address | 3600 |

DNS is managed through Hostinger's DNS panel. TTL values are set to 1 hour for normal operation and can be reduced to 5 minutes during migrations.

## 2.5 CDN Readiness

| Current | Future |
|---|---|
| Nginx serves static assets directly | Cloudflare or similar CDN for static assets |
| No edge caching | Edge caching for public pages (poojas, festivals, gallery) |
| Single region | Global edge distribution |

The architecture is CDN-ready: static assets have fingerprinted filenames (Vite build), cache headers are set appropriately, and the API is separated from static serving.

## 2.6 SSL

| Property | Value |
|---|---|
| Provider | Let's Encrypt (via Hostinger or Certbot) |
| Auto-renewal | Yes (certbot renew cron) |
| Protocol | TLS 1.2+ |
| HSTS | Enabled (1 year max-age) |
| OCSP stapling | Enabled |

## 2.7 Reverse Proxy

Nginx handles:
- TLS termination
- Static file serving (frontend assets, uploaded files)
- API proxying (`/hcgi/api` → `localhost:3001`)
- Security headers
- Compression (gzip, brotli)
- Rate limiting
- Request buffering
- Access logging

## 2.8 Express Server

Single Node.js process managed by PM2. Handles all API endpoints, authentication, business logic, and background jobs (via cron).

## 2.9 Background Workers

Background jobs run within the same Express process via `node-cron`. This is sufficient for the current scale. When job volume increases, workers can be extracted to separate PM2 processes.

## 2.10 Database

PostgreSQL 15+ running locally on the VPS. Single instance with automated backups. No replication initially.

## 2.11 File Storage

Local filesystem under `/var/lib/vinayagar/uploads/`. Directory structure follows the service architecture blueprint. Backup to offsite location daily.

## 2.12 Backups

| Type | Frequency | Retention | Storage |
|---|---|---|---|
| Database dump | Daily 01:00 UTC | 30 days | Local + offsite |
| File uploads | Daily 02:00 UTC | 30 days | Offsite |
| Configuration | On change | Indefinite | Version control |
| PM2 configuration | On change | Indefinite | Version control |

## 2.13 Monitoring

| Tool | Purpose |
|---|---|
| PM2 monit | Process status, CPU, memory |
| Custom health endpoints | Application health |
| Nginx access log | Request tracking |
| PostgreSQL logs | Query performance |
| System logs | OS-level monitoring |

## 2.14 Logging

| Log Type | Destination | Rotation |
|---|---|---|
| Application logs | `/var/log/vinayagar/app.log` | Daily, 30 days |
| Access logs | `/var/log/vinayagar/access.log` | Daily, 90 days |
| Error logs | `/var/log/vinayagar/error.log` | Daily, 90 days |
| Audit logs | PostgreSQL `audit_logs` table | 365 days |
| Nginx logs | `/var/log/nginx/` | Daily, 90 days |

---

# PART 3 — Environment Architecture

## 3.1 Development Environment

| Property | Value |
|---|---|
| **Purpose** | Local development and debugging |
| **Location** | Developer machines |
| **Database** | PocketBase (current) → PostgreSQL (Docker or local) |
| **API Server** | `localhost:3001` |
| **Frontend** | `localhost:3000` (Vite dev server) |
| **PocketBase** | `localhost:8090` (during migration) |
| **Hot reload** | Yes (Vite HMR, nodemon for API) |
| **Secrets** | `.env` file (gitignored) |
| **Logging** | Debug level, human-readable |
| **Mocks** | External services mocked or sandboxed |

## 3.2 Testing Environment

| Property | Value |
|---|---|
| **Purpose** | Automated testing, integration testing |
| **Location** | CI/CD pipeline or dedicated VPS |
| **Database** | PostgreSQL (dedicated test database) |
| **Seed data** | Automated seed scripts |
| **Secrets** | Test-only credentials |
| **Logging** | Info level |
| **External services** | Mocked (email, OAuth) |

Note: The project currently has no test files. The testing environment is预留d for future implementation.

## 3.3 Staging Environment

| Property | Value |
|---|---|
| **Purpose** | Pre-production validation |
| **Location** | Same VPS as production (separate database) |
| **Database** | PostgreSQL (separate database, production-like data) |
| **API Server** | `localhost:3002` (separate port) |
| **Frontend** | Served by Nginx on separate path or subdomain |
| **Secrets** | Production-like (sanitized) |
| **Logging** | Info level |
| **Monitoring** | Same as production |

## 3.4 Production Environment

| Property | Value |
|---|---|
| **Purpose** | Live system serving real users |
| **Location** | Hostinger VPS |
| **Database** | PostgreSQL (primary, production data) |
| **API Server** | `localhost:3001` |
| **Frontend** | Nginx serving built static files |
| **Secrets** | Real credentials in environment variables |
| **Logging** | Warn level (info for errors) |
| **Monitoring** | Full monitoring stack |
| **Backups** | Automated daily |

## 3.5 Environment Differences

| Aspect | Development | Testing | Staging | Production |
|---|---|---|---|---|
| Hot reload | Yes | No | No | No |
| Debug logging | Yes | Yes | No | No |
| Error detail | Full stack | Full stack | Sanitized | Sanitized |
| Rate limiting | Disabled | Disabled | Enabled | Enabled |
| CORS | localhost | test domain | production domain | production domain |
| Email | Console/log | Mocked | Sandbox SMTP | Real SMTP |
| OAuth | localhost redirect | Mocked | Production | Production |
| File storage | Local | Local | Local | Local |
| Backups | No | No | No | Daily |

## 3.6 Configuration Strategy

Each environment has its own configuration profile:

| Config Source | Development | Production |
|---|---|---|
| Environment variables | `.env` file | System environment |
| Database URL | Local PostgreSQL | Local PostgreSQL (different DB) |
| JWT secrets | Dev-specific | Production-specific |
| CORS origin | `http://localhost:3000` | `https://vinayagar-temple.com` |
| Log level | `debug` | `warn` |
| Rate limiting | Disabled | Enabled |
| SMTP | Console | Real provider |

## 3.7 Promotion Flow

```
Code Change → Development (local) → Testing (CI) → Staging (pre-prod) → Production
                                        │                │                │
                                   Unit tests      Integration       Smoke tests
                                   Lint check      Manual QA         Monitor
                                                    Load test         Rollback ready
```

---

# PART 4 — Server Architecture

## 4.1 Hostinger VPS Specifications

| Resource | Minimum | Recommended | Justification |
|---|---|---|---|
| **CPU** | 2 vCPU | 4 vCPU | Express + PostgreSQL + Nginx concurrent |
| **RAM** | 4 GB | 8 GB | Node.js heap + PostgreSQL shared buffers |
| **Disk** | 40 GB SSD | 80 GB SSD | Application + database + uploads + logs |
| **Bandwidth** | 2 TB | Unlimited | File uploads, API traffic |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS | LTS support, stable |
| **Node.js** | 22.x LTS | 22.x LTS | Required by project |

## 4.2 Process Layout

```
┌─────────────────────────────────────────────────────┐
│                    VPS (Ubuntu 22.04)                │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │              Nginx (PID 1)                   │    │
│  │  - TLS termination                           │    │
│  │  - Static file serving                       │    │
│  │  - API reverse proxy                         │    │
│  │  - Rate limiting                             │    │
│  │  - Security headers                          │    │
│  │  Port: 80, 443                               │    │
│  └─────────────────┬───────────────────────────┘    │
│                    │                                 │
│  ┌─────────────────▼───────────────────────────┐    │
│  │          PM2 Process Manager                 │    │
│  │                                              │    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │  Express API Server (1 instance)    │    │    │
│  │  │  - Authentication                    │    │    │
│  │  │  - API endpoints                     │    │    │
│  │  │  - Background jobs (node-cron)       │    │    │
│  │  │  - Socket.io (future)                │    │    │
│  │  │  Port: 3001                          │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  │                                              │    │
│  │  PM2 provides:                               │    │
│  │  - Auto-restart on crash                     │    │
│  │  - Log rotation                              │    │
│  │  - Cluster mode (future)                     │    │
│  │  - Monitoring (pm2 monit)                    │    │
│  │  - Zero-downtime reload (future)             │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │          PostgreSQL Server                    │    │
│  │  - Primary database                           │    │
│  │  - Connection pooling (PgBouncer, future)     │    │
│  │  - Automated backups                          │    │
│  │  Port: 5432 (localhost only)                  │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │          File Storage                         │    │
│  │  /var/lib/vinayagar/uploads/                  │    │
│  │  - users/                                     │    │
│  │  - gallery/                                   │    │
│  │  - receipts/                                  │    │
│  │  - expenses/                                  │    │
│  │  - temp/                                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │          Log Storage                          │    │
│  │  /var/log/vinayagar/                          │    │
│  │  - app.log                                    │    │
│  │  - access.log                                 │    │
│  │  - error.log                                  │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │          Backup Storage                       │    │
│  │  /var/backups/vinayagar/                      │    │
│  │  - daily/                                     │    │
│  │  - weekly/                                    │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## 4.3 Ports

| Port | Service | Exposure |
|---|---|---|
| 80 | Nginx HTTP | Public (redirects to 443) |
| 443 | Nginx HTTPS | Public |
| 3001 | Express API | Internal (Nginx proxy) |
| 5432 | PostgreSQL | Internal only (localhost) |
| 22 | SSH | Admin only (key-based) |

## 4.4 Directory Structure

```
/
├── var/
│   ├── lib/
│   │   └── vinayagar/
│   │       ├── app/                    # Application code
│   │       │   ├── apps/
│   │       │   │   ├── web/            # Built React frontend
│   │       │   │   │   └── dist/       # Vite build output
│   │       │   │   ├── api/            # Express backend
│   │       │   │   │   └── src/
│   │       │   │   └── pocketbase/     # PB (migration period only)
│   │       │   ├── package.json
│   │       │   └── node_modules/
│   │       ├── uploads/                # File storage
│   │       │   ├── users/
│   │       │   ├── gallery/
│   │       │   ├── receipts/
│   │       │   ├── expenses/
│   │       │   ├── payment-accounts/
│   │       │   ├── ai-images/
│   │       │   └── temp/
│   │       └── data/                   # PocketBase data (migration period)
│   │           └── pb_data/
│   └── log/
│       └── vinayagar/
│           ├── app.log
│           ├── access.log
│           ├── error.log
│           └── pm2/
│               ├── out.log
│               └── error.log
├── etc/
│   ├── nginx/
│   │   └── sites-available/
│   │       └── vinayagar.conf
│   └── systemd/
│       └── system/
│           └── vinayagar.service       # Optional: systemd PM2 wrapper
├── var/
│   └── backups/
│       └── vinayagar/
│           ├── daily/
│           └── weekly/
└── home/
    └── deploy/                         # Deployment user
        └── vinayagar/                  # Deployment scripts
```

## 4.5 Runtime

| Component | Version | Manager |
|---|---|---|
| Node.js | 22.x LTS | nvm or system package |
| npm | 10.x | Bundled with Node.js |
| PostgreSQL | 15+ | System package |
| Nginx | 1.18+ | System package |
| PM2 | 5.x | npm global install |
| Certbot | Latest | System package |

---

# PART 5 — Application Deployment

## 5.1 Frontend Deployment

| Step | Description |
|---|---|
| 1. Build | `npm run build` produces `apps/web/dist/` |
| 2. Deploy | Copy `dist/` contents to Nginx serving directory |
| 3. Verify | Access site, check all routes load |
| 4. Cache | Nginx serves with cache headers (fingerprinted assets: 1 year; index.html: no-cache) |

The frontend is a static SPA. Deployment is a file copy operation. No build happens on the server.

## 5.2 Backend Deployment

| Step | Description |
|---|---|
| 1. Pull | `git pull` latest code |
| 2. Install | `npm install --production` (dependencies only) |
| 3. Migrate | `npx prisma migrate deploy` (apply pending migrations) |
| 4. Restart | `pm2 restart vinayagar-api` |
| 5. Verify | Health check endpoint returns 200 |

## 5.3 Database Deployment

| Step | Description |
|---|---|
| 1. Backup | `pg_dump` before migration |
| 2. Migrate | `npx prisma migrate deploy` |
| 3. Verify | Application starts, no connection errors |
| 4. Rollback plan | Restore from backup if migration fails |

## 5.4 Storage Deployment

| Step | Description |
|---|---|
| 1. Create directories | Ensure upload directory structure exists |
| 2. Set permissions | Application user owns upload directories |
| 3. Verify | Upload test file, verify access |

## 5.5 Build Artifacts

| Artifact | Source | Destination |
|---|---|---|
| Frontend build | `apps/web/dist/` | Nginx serving directory |
| API source | `apps/api/src/` | Application directory |
| Prisma client | Generated | `node_modules/.prisma/client/` |
| Dependencies | `package-lock.json` | `node_modules/` |

## 5.6 Deployment Flow

```
Developer pushes to main
  → CI runs lint check
  → Deployment script executes:
    1. git pull
    2. npm install
    3. npm run build (frontend)
    4. npx prisma migrate deploy (if migrations pending)
    5. pm2 restart vinayagar-api
    6. Health check verification
    7. Notification (email/Slack)
```

## 5.7 Rollback Strategy

| Scenario | Rollback Action |
|---|---|
| Frontend deployment fails | Revert to previous build files |
| API deployment fails | `pm2 restart` with previous code version |
| Database migration fails | Restore from pre-migration backup |
| Full rollback needed | Restore all components from backup |

Rollback procedure:
1. Stop traffic (maintenance mode in Nginx)
2. Restore previous code version (`git checkout` previous tag)
3. Restore database if migrated
4. Restart services
5. Verify health
6. Disable maintenance mode

---

# PART 6 — Network Architecture

## 6.1 HTTPS

| Property | Value |
|---|---|
| Protocol | HTTPS (TLS 1.2+) |
| Certificate | Let's Encrypt (auto-renewed) |
| HSTS | Enabled (1 year, includeSubDomains) |
| Redirect | HTTP → HTTPS at Nginx |

## 6.2 TLS

| Property | Value |
|---|---|
| Minimum version | TLS 1.2 |
| Cipher suites | ECDHE+AESGCM, ECDHE+CHACHA20 |
| OCSP stapling | Enabled |
| Session tickets | Enabled |

## 6.3 Firewall

| Port | Protocol | Source | Action |
|---|---|---|---|
| 22 | TCP | Admin IP only | Allow |
| 80 | TCP | Any | Allow |
| 443 | TCP | Any | Allow |
| 5432 | TCP | localhost | Allow |
| All other | — | Any | Deny |

Firewall rules managed by UFW (Uncomplicated Firewall):
- SSH restricted to admin IP
- HTTP/HTTPS open to public
- PostgreSQL restricted to localhost
- All other ports denied by default

## 6.4 Internal Communication

| From | To | Protocol | Port |
|---|---|---|---|
| Nginx | Express | HTTP | 3001 |
| Express | PostgreSQL | PostgreSQL | 5432 |
| Express | SMTP | STARTTLS | 587 |
| Express | Filesystem | Filesystem | — |
| PM2 | Express | Process | — |

All internal communication is unencrypted (localhost). This is acceptable because traffic never leaves the server.

## 6.5 Public Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `GET /hcgi/api/health` | GET | None | Health check |
| `GET /hcgi/api/poojas` | GET | None | List available poojas |
| `GET /hcgi/api/festivals` | GET | None | List festivals |
| `GET /hcgi/api/gallery` | GET | None | List gallery items |
| `GET /hcgi/api/payment-accounts` | GET | None | Payment info |
| `POST /hcgi/api/auth/login` | POST | None | User login |
| `POST /hcgi/api/auth/register` | POST | None | User registration |
| `POST /hcgi/api/auth/refresh` | POST | Cookie | Token refresh |

## 6.6 Private Services

| Service | Access | Protection |
|---|---|---|
| PostgreSQL | localhost only | No network exposure |
| PM2 | localhost only | No network exposure |
| File system | Application process only | OS permissions |
| Nginx admin | localhost or admin IP | IP restriction |

---

# PART 7 — Reverse Proxy Architecture

## 7.1 Routing

| Path | Destination | Purpose |
|---|---|---|
| `/` | Nginx static serving | React SPA |
| `/assets/*` | Nginx static serving | Fingerprinted assets (1 year cache) |
| `/hcgi/api/*` | Express `localhost:3001` | API endpoints |
| `/hcgi/api/files/*` | Nginx static serving | Uploaded files |
| `/_/` | PocketBase admin (migration only) | PB Admin UI |
| `/*` | Nginx static serving | React SPA (client-side routing) |

## 7.2 Compression

| Content Type | Compression | Minimum Size |
|---|---|---|
| text/html | gzip, brotli | 256 bytes |
| text/css | gzip, brotli | 256 bytes |
| text/javascript | gzip, brotli | 256 bytes |
| application/javascript | gzip, brotli | 256 bytes |
| application/json | gzip, brotli | 256 bytes |
| image/svg+xml | gzip, brotli | 256 bytes |
| image/* | No (already compressed) | — |
| video/* | No (already compressed) | — |
| application/pdf | No (already compressed) | — |

## 7.3 Caching

| Content | Cache-Control | ETag | Last-Modified |
|---|---|---|---|
| `index.html` | `no-cache` | Yes | Yes |
| Fingerprinted assets (`*.abc123.js`) | `public, max-age=31536000, immutable` | Yes | Yes |
| Uploaded images | `public, max-age=86400` | Yes | Yes |
| API responses | `no-store` (authenticated) | No | No |
| Health endpoint | `no-cache` | No | No |

## 7.4 Headers

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:` | XSS prevention |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable APIs |

## 7.5 Static Assets

| Asset Type | Serving | Caching |
|---|---|---|
| React build files | Nginx direct | Fingerprinted: 1 year |
| HTML files | Nginx direct | No-cache (always fresh) |
| Uploaded images | Nginx direct (via `/hcgi/api/files/`) | 1 day |
| Favicon | Nginx direct | 1 week |
| Robots.txt | Nginx direct | 1 day |

## 7.6 API Proxy

Nginx proxies `/hcgi/api/*` to Express:

- Strip `/hcgi/api` prefix before forwarding
- Pass original headers (Authorization, Content-Type)
- Set `X-Real-IP` and `X-Forwarded-For` headers
- Set timeout: 30 seconds for regular, 120 seconds for file uploads
- Buffer request body (prevent slow loris)

## 7.7 Security Headers

All security headers are set at the Nginx level, not the Express level. This ensures headers are present even if Express returns an error.

---

# PART 8 — Database Infrastructure

## 8.1 Primary Database

| Property | Value |
|---|---|
| Engine | PostgreSQL 15+ |
| Location | Localhost (same VPS) |
| Port | 5432 (not exposed externally) |
| Database name | `vinayagar` |
| Application user | `vinayagar_app` (limited permissions) |
| Admin user | `vinayagar_admin` (migration only) |
| Encoding | UTF-8 |
| Timezone | UTC |

## 8.2 Connection Configuration

| Property | Value |
|---|---|
| Connection pool min | 2 |
| Connection pool max | 10 |
| Connection timeout | 5 seconds |
| Idle timeout | 30 seconds |
| Pool timeout | 10 seconds |

## 8.3 Backups

| Property | Value |
|---|---|
| Method | `pg_dump` (logical backup) |
| Frequency | Daily at 01:00 UTC |
| Retention | 30 days |
| Compression | gzip |
| Storage | `/var/backups/vinayagar/daily/` |
| Offsite | Copy to remote storage daily |
| Verification | Weekly restore test |

## 8.4 Recovery

| Scenario | Recovery Time | Procedure |
|---|---|---|
| Database corruption | 1 hour | Restore from latest backup |
| Accidental data deletion | 30 minutes | Point-in-time recovery (if WAL archived) |
| Disk failure | 4 hours | Restore to new VPS from offsite backup |
| Full VPS failure | 4 hours | Provision new VPS, restore from offsite backup |

## 8.5 Maintenance

| Task | Frequency | Purpose |
|---|---|---|
| `VACUUM` | Daily | Reclaim dead tuples |
| `ANALYZE` | Daily | Update query planner statistics |
| `REINDEX` | Weekly | Rebuild indexes |
| Check bloat | Monthly | Identify table/index bloat |
| Update extensions | Quarterly | Security patches |

## 8.6 Connection Pooling

| Phase | Solution |
|---|---|
| Current | Prisma connection pool (max 10) |
| Future (if needed) | PgBouncer as connection pooler |

PgBouncer would sit between Express and PostgreSQL, multiplexing connections. This is needed if the number of concurrent Express processes exceeds the PostgreSQL `max_connections` limit.

## 8.7 Migration Process

| Step | Command | Description |
|---|---|---|
| 1. Backup | `pg_dump` | Create backup before migration |
| 2. Deploy | `git pull` | Pull latest code with migrations |
| 3. Migrate | `npx prisma migrate deploy` | Apply pending migrations |
| 4. Generate | `npx prisma generate` | Regenerate Prisma client |
| 5. Verify | Health check | Confirm application works |
| 6. Rollback plan | Restore backup | If migration fails |

---

# PART 9 — Storage Architecture

## 9.1 Uploads

| Category | Path | Access | Retention |
|---|---|---|---|
| User avatars | `uploads/users/{userId}/` | Owner + Admin | Account lifetime |
| Gallery media | `uploads/gallery/{galleryId}/` | Public | Until admin deletes |
| Receipts | `uploads/receipts/` | Owner + Admin | Indefinite |
| Expense bills | `uploads/expenses/{expenseId}/` | Admin only | 7 years |
| Payment QR | `uploads/payment-accounts/{accountId}/` | Public | Until updated |
| AI images | `uploads/ai-images/{imageId}/` | Owner | 30 days |
| Temporary | `uploads/temp/{sessionId}/` | System | 24 hours |

## 9.2 Folder Structure

```
/var/lib/vinayagar/uploads/
├── users/
│   ├── {userId-1}/
│   │   └── avatar.jpg
│   └── {userId-2}/
│       └── avatar.png
├── gallery/
│   ├── {galleryId-1}/
│   │   ├── image.jpg
│   │   └── thumb-300x300.jpg
│   └── {galleryId-2}/
│       └── video.mp4
├── receipts/
│   ├── donations/
│   │   └── DON-20260711-0001.pdf
│   ├── subscriptions/
│   │   └── SUB-20260711-0001.pdf
│   ├── bookings/
│   │   └── RCP-A1B2C3D4-E5F67.pdf
│   └── vouchers/
│       └── VCH-20260711-0001.pdf
├── expenses/
│   └── {expenseId}/
│       └── bill.pdf
├── payment-accounts/
│   └── {accountId}/
│       └── qr.png
├── ai-images/
│   └── {imageId}/
│       └── image.png
└── temp/
    └── {sessionId}/
        └── upload.jpg
```

## 9.3 Disk Usage Estimation

| Category | Estimated Size | Growth Rate |
|---|---|---|
| Application code | 100 MB | Minimal |
| node_modules | 500 MB | Minimal |
| Gallery images | 2 GB | 100 MB/month |
| Receipts | 500 MB | 50 MB/month |
| User avatars | 200 MB | 20 MB/month |
| Expense bills | 300 MB | 30 MB/month |
| Logs | 1 GB | 1 GB/month (rotated) |
| Backups | 5 GB | 5 GB/month (retained) |
| **Total (Year 1)** | **~10 GB** | — |
| **Total (Year 2)** | **~20 GB** | — |

With 80 GB SSD, this provides approximately 4 years of headroom.

## 9.4 Retention Policy

| Category | Retention | Cleanup |
|---|---|---|
| Temporary files | 24 hours | Cron every 6 hours |
| AI images | 30 days | Daily cron |
| Application logs | 30 days | Logrotate daily |
| Access logs | 90 days | Logrotate daily |
| Database backups | 30 days | Script daily |
| File backups | 30 days | Script daily |

## 9.5 Cleanup Policy

Background jobs handle cleanup:
- **Every 6 hours:** Delete temp files older than 24 hours
- **Daily:** Delete AI images older than 30 days
- **Daily:** Rotate and compress logs
- **Daily:** Delete database backups older than 30 days
- **Weekly:** Check disk usage, alert if >80%

---

# PART 10 — Configuration Management

## 10.1 Environment Variables

### Application Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Environment mode |
| `PORT` | No | `3001` | Express server port |
| `LOG_LEVEL` | No | `info` | Minimum log level |
| `CORS_ORIGIN` | Yes | `http://localhost:3000` | Allowed CORS origin |

### Database Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |

### Authentication Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing secret |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |

### Email Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `SMTP_HOST` | Yes | — | SMTP server host |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | Yes | — | SMTP username |
| `SMTP_PASS` | Yes | — | SMTP password |
| `SMTP_FROM` | Yes | — | Sender email address |

### OAuth Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | No | — | Google OAuth callback URL |

### Storage Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `STORAGE_PATH` | No | `/var/lib/vinayagar/uploads` | File storage root |
| `MAX_FILE_SIZE` | No | `20971520` | Max upload size (20MB) |

### Backup Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKUP_PATH` | No | `/var/backups/vinayagar` | Backup directory |
| `BACKUP_RETENTION_DAYS` | No | `30` | Backup retention |

## 10.2 Feature Flags

| Flag | Default | Purpose |
|---|---|---|
| `FEATURE_OAUTH_ENABLED` | `true` | Google OAuth login |
| `FEATURE_AI_CHAT_ENABLED` | `true` | AI chat feature |
| `FEATURE_PUSH_NOTIFICATIONS` | `false` | Browser push notifications |
| `FEATURE_SMS_ENABLED` | `false` | SMS notifications |
| `FEATURE_REDIS_CACHE` | `false` | Redis caching |
| `FEATURE_S3_STORAGE` | `false` | S3 file storage |
| `FEATURE_RATE_LIMITING` | `true` | API rate limiting |
| `FEATURE_AUDIT_LOGGING` | `true` | Audit trail logging |

## 10.3 Application Settings

| Setting | Value | Location |
|---|---|---|
| Timezone | `Europe/Berlin` | Application config |
| Currency | `EUR` | Application config |
| Date format | `DD.MM.YYYY` | Application config |
| Languages | `en`, `de`, `ta` | Application config |
| Default language | `en` | Application config |

## 10.4 Secrets Management

| Secret | Storage | Access |
|---|---|---|
| Database password | Environment variable | Application process |
| JWT secrets | Environment variable | Application process |
| SMTP password | Environment variable | Application process |
| OAuth secrets | Environment variable | Application process |
| SSL private key | Certbot managed | Nginx process |
| Encryption key (future) | Environment variable | Application process |

## 10.5 Versioning

| Item | Versioning Strategy |
|---|---|
| Application code | Git tags (`v1.0.0`) |
| Database schema | Prisma migrations (timestamp-based) |
| API version | URL path (`/hcgi/api/v1/`) (future) |
| Configuration | Environment-specific files |
| Dependencies | `package-lock.json` (locked) |

---

# PART 11 — Monitoring

## 11.1 Health Checks

| Endpoint | Checks | Interval |
|---|---|---|
| `/hcgi/api/health` | API server responding | Every 5 minutes |
| `/hcgi/api/health/db` | PostgreSQL connectivity | Every 5 minutes |
| `/hcgi/api/health/email` | SMTP connectivity | Every 15 minutes |
| `/hcgi/api/health/storage` | Filesystem accessible | Every 15 minutes |
| `/hcgi/api/health/disk` | Disk usage <80% | Every 15 minutes |

Health check response format:
```
{
  "status": "healthy",
  "timestamp": "2026-07-11T15:30:00.000Z",
  "uptime": 86400,
  "checks": {
    "api": { "status": "up", "responseTime": 5 },
    "database": { "status": "up", "responseTime": 12 },
    "storage": { "status": "up", "diskUsage": "45%" }
  }
}
```

## 11.2 Application Monitoring

| Metric | Source | Threshold |
|---|---|---|
| Request rate | Nginx access log | Alert if >1000 req/min |
| Response time (p95) | Application logs | Alert if >2 seconds |
| Error rate | Application logs | Alert if >5% of requests |
| Active connections | Express | Alert if >100 |
| Memory usage | PM2 | Alert if >80% |
| CPU usage | PM2 | Alert if >80% |

## 11.3 Database Monitoring

| Metric | Source | Threshold |
|---|---|---|
| Connection count | PostgreSQL | Alert if >80% of max |
| Query duration | PostgreSQL logs | Alert if >1 second |
| Cache hit ratio | PostgreSQL stats | Alert if <95% |
| Dead tuples | PostgreSQL stats | Alert if >10000 |
| Database size | PostgreSQL | Alert if >10 GB |
| Replication lag (future) | PostgreSQL | Alert if >10 seconds |

## 11.4 Storage Monitoring

| Metric | Source | Threshold |
|---|---|---|
| Disk usage | System | Alert if >80% |
| Upload directory size | Script | Alert if >20 GB |
| Temp file count | Script | Alert if >1000 |
| Log directory size | System | Alert if >2 GB |

## 11.5 Performance Monitoring

| Metric | Source | Interval |
|---|---|---|
| API response time | Application logs | Per request |
| Database query time | PostgreSQL logs | Per query |
| File upload time | Application logs | Per upload |
| PDF generation time | Application logs | Per generation |
| Email send time | Application logs | Per send |

## 11.6 Alerting

| Alert Level | Trigger | Notification |
|---|---|---|
| **Critical** | Service down, database unreachable | Email + SMS (future) |
| **Warning** | High CPU/memory, slow queries, disk >80% | Email |
| **Info** | Deployment completed, backup successful | Log only |

---

# PART 12 — Logging Infrastructure

## 12.1 Application Logs

| Property | Value |
|---|---|
| Format | JSON structured |
| Destination | `/var/log/vinayagar/app.log` |
| Level | `warn` (production) |
| Rotation | Daily, compress, retain 30 days |
| Fields | timestamp, level, message, correlationId, service, method, context |

## 12.2 Audit Logs

| Property | Value |
|---|---|
| Format | Database records (PostgreSQL) |
| Table | `audit_logs` |
| Level | All mutations |
| Retention | 365 days |
| Access | Admin only |

## 12.3 Security Logs

| Property | Value |
|---|---|
| Format | JSON structured |
| Destination | `/var/log/vinayagar/security.log` |
| Events | Auth events, permission denials, rate limits |
| Retention | 2 years |
| Access | Admin only |

## 12.4 Access Logs

| Property | Value |
|---|---|
| Format | Nginx combined format |
| Destination | `/var/log/vinayagar/access.log` |
| Content | All HTTP requests |
| Rotation | Daily, retain 90 days |
| Analysis | Request rate, error rate, slow requests |

## 12.5 Error Logs

| Property | Value |
|---|---|
| Format | JSON structured |
| Destination | `/var/log/vinayagar/error.log` |
| Content | All errors (level: error, fatal) |
| Rotation | Daily, retain 90 days |
| Alerting | Critical errors trigger admin notification |

## 12.6 Retention

| Log Type | Retention | Archive |
|---|---|---|
| Application logs | 30 days | No |
| Audit logs | 365 days | Cold storage |
| Security logs | 2 years | Cold storage |
| Access logs | 90 days | No |
| Error logs | 90 days | No |
| PM2 logs | 30 days | No |

## 12.7 Rotation

| Method | Tool | Schedule |
|---|---|---|
| Application logs | logrotate | Daily |
| Nginx logs | logrotate | Daily |
| PM2 logs | PM2 built-in | Manual or cron |
| Database logs | PostgreSQL log rotation | Daily |

---

# PART 13 — Performance Architecture

## 13.1 Caching

| Layer | Technology | TTL | Usage |
|---|---|---|---|
| Browser cache | HTTP headers | Per asset type | Static assets, images |
| Nginx cache | proxy_cache | 5 minutes | API responses (public) |
| Application cache | In-memory Map | Configurable | Dashboard, reference data |
| Database cache | PostgreSQL shared_buffers | — | Query plan cache |

## 13.2 Compression

| Layer | Algorithm | Content |
|---|---|---|
| Nginx | gzip, brotli | Text, JSON, CSS, JS |
| PostgreSQL | TOAST | Large text columns |
| Application | — | Not needed (Nginx handles) |

## 13.3 Lazy Loading

| Resource | Strategy |
|---|---|
| React routes | Code splitting with `React.lazy()` |
| Images | Intersection Observer for gallery |
| Dashboard data | Load on demand, not on page load |
| Reports | Generate on demand |

## 13.4 Connection Pooling

| Connection | Pool Size | Strategy |
|---|---|---|
| Express → PostgreSQL | 2-10 | Prisma connection pool |
| Express → SMTP | 5 | Nodemailer pool |
| Nginx → Express | 100 | Keep-alive |

## 13.5 Database Optimization

| Technique | Usage |
|---|---|
| Indexes | All query columns indexed |
| Query optimization | Prisma query analysis |
| Connection pooling | Prisma pool (future: PgBouncer) |
| Prepared statements | Prisma automatic |
| Batch queries | `findMany` with `include` |

## 13.6 Static Asset Optimization

| Technique | Implementation |
|---|---|
| Fingerprinting | Vite build hashes filenames |
| Code splitting | Route-based lazy loading |
| Tree shaking | Vite automatic |
| Minification | Vite build |
| Image optimization | Thumbnail generation on upload |
| HTTP/2 | Nginx enabled |

---

# PART 14 — Backup Strategy

## 14.1 Database Backups

| Property | Value |
|---|---|
| Method | `pg_dump` (logical, compressed) |
| Frequency | Daily at 01:00 UTC |
| Retention | 30 days (daily), 12 months (monthly) |
| Storage | Local `/var/backups/vinayagar/daily/` + offsite |
| Compression | gzip |
| Naming | `vinayagar-{YYYYMMDD}-{HHMMSS}.sql.gz` |

## 14.2 File Backups

| Property | Value |
|---|---|
| Method | `tar` archive of uploads directory |
| Frequency | Daily at 02:00 UTC |
| Retention | 30 days |
| Storage | Local `/var/backups/vinayagar/daily/` + offsite |
| Compression | gzip |
| Naming | `uploads-{YYYYMMDD}.tar.gz` |

## 14.3 Configuration Backups

| Property | Value |
|---|---|
| Method | Git version control |
| Frequency | On every change |
| Retention | Indefinite (Git history) |
| Content | All configuration, environment templates |

## 14.4 Offsite Backup

| Property | Value |
|---|---|
| Destination | Remote server or S3-compatible storage |
| Frequency | Daily (after local backup) |
| Method | Encrypted copy of daily backup |
| Retention | 30 days |
| Encryption | AES-256 with dedicated key |

## 14.5 Recovery Testing

| Test | Frequency | Procedure |
|---|---|---|
| Database restore | Weekly | Restore backup to test database, verify integrity |
| Full restore | Monthly | Provision test VPS, restore from offsite backup |
| Backup integrity | Daily | Verify backup file is not corrupted |

---

# PART 15 — Disaster Recovery

## 15.1 Recovery Objectives

| Metric | Value | Justification |
|---|---|---|
| **RTO** (Recovery Time Objective) | 4 hours | Temple operations can tolerate brief downtime |
| **RPO** (Recovery Point Objective) | 24 hours | Daily backups mean at most 24 hours of data loss |

## 15.2 Failover

| Scenario | Failover Strategy |
|---|---|
| Express process crash | PM2 auto-restart (seconds) |
| PostgreSQL crash | PM2 or systemd auto-restart |
| VPS failure | Provision new VPS, restore from offsite backup |
| Disk failure | Restore to new disk from backup |
| Network failure | Wait for Hostinger to resolve |

## 15.3 Restore Procedures

### Database Restore

1. Provision new PostgreSQL instance (or new VPS)
2. Download latest backup from offsite storage
3. Decompress backup: `gunzip vinayagar-YYYYMMDD-HHMMSS.sql.gz`
4. Create database: `createdb vinayagar`
5. Restore: `psql vinayagar < vinayagar-YYYYMMDD-HHMMSS.sql`
6. Verify: Connect application, check data integrity
7. Update `DATABASE_URL` if needed

### File Restore

1. Download latest file backup from offsite storage
2. Decompress: `tar -xzf uploads-YYYYMMDD.tar.gz`
3. Copy to `/var/lib/vinayagar/uploads/`
4. Set correct permissions
5. Verify: Check file access through application

### Full System Restore

1. Provision new VPS (Ubuntu 22.04)
2. Install dependencies (Node.js 22, PostgreSQL 15, Nginx, PM2)
3. Deploy application code
4. Restore database from backup
5. Restore files from backup
6. Configure Nginx, SSL, environment variables
7. Start services
8. Verify all health checks pass
9. Update DNS if IP changed

## 15.4 Incident Response

| Step | Action | Owner |
|---|---|---|
| 1. Detect | Health check failure, alert received | Automated |
| 2. Assess | Determine severity and impact | Admin |
| 3. Communicate | Notify affected users (if needed) | Admin |
| 4. Mitigate | Restore service, apply fix | Admin |
| 5. Recover | Restore data if needed | Admin |
| 6. Review | Post-incident review, document lessons | Admin |

## 15.5 Business Continuity

| Function | Continuity Plan |
|---|---|
| Temple website | Static pages served by Nginx (no backend needed) |
| Donations | Manual recording via admin until system restored |
| Bookings | Manual recording via phone until system restored |
| Email | Queued for delivery when system restored |
| Financial records | Restored from backup (max 24 hours data loss) |

---

# PART 16 — Scalability

## 16.1 Horizontal Scaling Readiness

| Component | Current | Scaling Path |
|---|---|---|
| Express | Single process | PM2 cluster mode → Multiple VPS behind load balancer |
| PostgreSQL | Single instance | Read replica → Managed PostgreSQL |
| File storage | Local filesystem | S3-compatible object storage |
| Background jobs | In-process cron | Dedicated worker processes → Message queue |
| Cache | In-memory | Redis cluster |

The application is stateless (no in-process session state), making horizontal scaling straightforward.

## 16.2 Vertical Scaling

| Resource | Current | Upgrade Path |
|---|---|---|
| CPU | 2 vCPU | Upgrade VPS plan to 4 vCPU |
| RAM | 4 GB | Upgrade VPS plan to 8 GB |
| Disk | 80 GB SSD | Upgrade VPS plan or add block storage |

Vertical scaling requires only a VPS plan upgrade and reboot. No application changes needed.

## 16.3 Background Workers

| Phase | Architecture |
|---|---|
| Current | In-process node-cron |
| Scale-up | Separate PM2 process for each worker type |
| Scale-out | Message queue (Redis Streams) + worker pool |

## 16.4 Queue Readiness

| Phase | Technology | Use Case |
|---|---|---|
| Current | In-process event emitter | All events |
| Future | Redis Streams | Email queue, background jobs |
| Enterprise | RabbitMQ or SQS | Complex workflow orchestration |

## 16.5 Future Microservice Readiness

The service layer architecture naturally maps to microservice boundaries:

| Service | Microservice Candidate | Justification |
|---|---|---|
| AuthService | Auth Service | Security boundary |
| BookingService | Booking Service | High write volume during events |
| PaymentService | Payment Service | PCI compliance |
| NotificationService | Notification Service | Independent scaling |
| AIService | AI Service | Resource-intensive |

Services communicate through events, which map to message queue topics.

---

# PART 17 — Deployment Workflow

## 17.1 Build

| Step | Command | Description |
|---|---|---|
| 1. Pull code | `git pull origin main` | Latest code |
| 2. Install deps | `npm install` | Updated dependencies |
| 3. Build frontend | `npm run build` | Static files in `dist/` |
| 4. Generate Prisma | `npx prisma generate` | Prisma client |

## 17.2 Validation

| Step | Command | Description |
|---|---|---|
| 1. Lint | `npm run lint` | Code quality |
| 2. Type check | (if TypeScript added) | Type safety |
| 3. Health check | `curl localhost:3001/hcgi/api/health` | Application health |
| 4. Database check | `npx prisma db push --accept-data-loss` | Schema sync |

## 17.3 Deployment

| Step | Command | Description |
|---|---|---|
| 1. Enable maintenance | Update Nginx config | Show maintenance page |
| 2. Backup database | `pg_dump` | Safety backup |
| 3. Deploy code | Copy build artifacts | Application update |
| 4. Run migrations | `npx prisma migrate deploy` | Schema update |
| 5. Restart API | `pm2 restart vinayagar-api` | Application restart |
| 6. Disable maintenance | Update Nginx config | Resume normal operation |

## 17.4 Verification

| Step | Check | Expected Result |
|---|---|---|
| 1. Health endpoint | `GET /hcgi/api/health` | 200 OK |
| 2. Login | POST login with test credentials | Token returned |
| 3. API endpoints | Sample GET requests | Data returned |
| 4. Static assets | Load homepage | Assets load correctly |
| 5. File uploads | Upload test image | File accessible |
| 6. Error logs | Check error.log | No new errors |

## 17.5 Rollback

| Step | Action |
|---|---|
| 1. Enable maintenance | Show maintenance page |
| 2. Stop API | `pm2 stop vinayagar-api` |
| 3. Restore code | `git checkout` previous version |
| 4. Restore database | `psql` from backup (if migrated) |
| 5. Rebuild frontend | `npm run build` (previous version) |
| 6. Start API | `pm2 start vinayagar-api` |
| 7. Disable maintenance | Resume normal operation |
| 8. Verify | Health checks pass |

## 17.6 Release Strategy

| Release Type | Trigger | Process |
|---|---|---|
| Patch | Bug fix | Direct to main, auto-deploy |
| Minor | New feature | Feature branch → review → main → deploy |
| Major | Breaking change | Feature branch → review → staging → production |
| Emergency | Security fix | Hotfix branch → review → immediate deploy |

---

# PART 18 — Migration Deployment

## 18.1 PocketBase Shutdown

| Step | Action |
|---|---|
| 1. Announce | Notify users of maintenance window |
| 2. Stop writes | Disable user-facing write operations |
| 3. Wait | Allow in-flight operations to complete |
| 4. Export | Export all PocketBase data |
| 5. Stop PB | `pocketbase.exe serve` process stopped |

## 18.2 Data Migration

| Step | Action |
|---|---|
| 1. Export PB data | Export all collections to JSON |
| 2. Export files | Copy PB storage to new structure |
| 3. Transform | Run data transformation scripts |
| 4. Import to PostgreSQL | Load transformed data |
| 5. Verify counts | Record counts match between PB and PG |
| 6. Verify data | Spot-check critical records |

## 18.3 Validation

| Check | Method |
|---|---|
| Record counts | Compare PB vs PG for each collection |
| User accounts | Verify login works for test accounts |
| Financial data | Verify donation/payment/subscription amounts |
| File access | Verify uploaded files are accessible |
| Relationships | Verify foreign key integrity |
| Business rules | Verify state transitions work correctly |

## 18.4 Cutover

| Step | Action |
|---|---|
| 1. Stop PB | Final PocketBase shutdown |
| 2. Deploy new API | Start Express with Prisma |
| 3. Update Nginx | Route `/hcgi/api` to Express (remove PB proxy) |
| 4. Verify | All health checks pass |
| 5. Monitor | Watch for errors for 24 hours |
| 6. Announce | Notify users migration complete |

## 18.5 Rollback (Migration)

| Step | Action |
|---|---|
| 1. Stop Express | `pm2 stop vinayagar-api` |
| 2. Restore PB | Restart PocketBase process |
| 3. Restore PB data | Restore from pre-migration backup |
| 4. Update Nginx | Route back to PocketBase |
| 5. Verify | PB endpoints work |
| 6. Investigate | Identify migration issues |

## 18.6 Post-Migration Verification

| Check | Method | Frequency |
|---|---|---|
| API health | Health endpoint | Every 5 minutes for 24 hours |
| Error rate | Error logs | Every hour for 48 hours |
| User logins | Auth logs | Monitor for failed logins |
| Financial transactions | Audit logs | Daily reconciliation |
| File uploads | Storage check | Daily for 1 week |
| Performance | Response times | Continuous for 1 week |

---

# PART 19 — Operational Checklist

## 19.1 Infrastructure

- [ ] VPS provisioned (Ubuntu 22.04, 4 vCPU, 8 GB RAM, 80 GB SSD)
- [ ] Node.js 22 installed
- [ ] PostgreSQL 15 installed
- [ ] Nginx installed
- [ ] PM2 installed globally
- [ ] Certbot installed (SSL auto-renewal)
- [ ] UFW firewall configured
- [ ] SSH key-based authentication
- [ ] Swap space configured (2 GB)
- [ ] Timezone set to UTC

## 19.2 Networking

- [ ] DNS records configured (A, CNAME)
- [ ] SSL certificate installed and auto-renewing
- [ ] HTTP → HTTPS redirect working
- [ ] HSTS header enabled
- [ ] Security headers configured in Nginx
- [ ] CORS configured for production domain
- [ ] Internal services not exposed to internet
- [ ] DDoS protection (Hostinger basic)

## 19.3 Security

- [ ] Firewall rules: only 80, 443, 22 open
- [ ] SSH restricted to admin IP
- [ ] PostgreSQL not exposed externally
- [ ] Environment variables configured (not in code)
- [ ] JWT secrets generated (≥256 bits)
- [ ] Database password set
- [ ] SMTP credentials configured
- [ ] `.env` files gitignored
- [ ] No secrets in version control

## 19.4 Database

- [ ] PostgreSQL running and accepting connections
- [ ] Database `vinayagar` created
- [ ] Application user `vinayagar_app` created with limited permissions
- [ ] Prisma migrations applied
- [ ] Prisma client generated
- [ ] Connection pooling configured
- [ ] Backup script working
- [ ] Restore tested

## 19.5 Application

- [ ] Application code deployed
- [ ] Dependencies installed
- [ ] Frontend built and deployed to Nginx
- [ ] API server running on port 3001
- [ ] PM2 managing Express process
- [ ] PM2 configured to start on boot
- [ ] Health endpoint responding
- [ ] Authentication working
- [ ] File uploads working
- [ ] Email sending working

## 19.6 Storage

- [ ] Upload directory structure created
- [ ] Application user owns upload directories
- [ ] Temp file cleanup running
- [ ] Disk usage monitoring working
- [ ] Backup storage available

## 19.7 Monitoring

- [ ] Health check endpoints operational
- [ ] PM2 monitoring active
- [ ] Error logging working
- [ ] Access logging working
- [ ] Disk usage alerts configured
- [ ] Application error alerts configured

## 19.8 Backups

- [ ] Database backup cron running daily
- [ ] File backup cron running daily
- [ ] Backup retention enforced
- [ ] Offsite backup working
- [ ] Restore tested weekly
- [ ] Backup integrity verified

## 19.9 Recovery

- [ ] Disaster recovery procedure documented
- [ ] RTO (4 hours) and RPO (24 hours) defined
- [ ] Restore procedure tested
- [ ] Incident response procedure documented
- [ ] Contact information current

---

# PART 20 — Master Infrastructure Blueprint

## 20.1 Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    HOSTINGER VPS                                 │
│                 Ubuntu 22.04 LTS                                 │
│              4 vCPU / 8 GB RAM / 80 GB SSD                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    NGINX                                  │   │
│  │               (Reverse Proxy)                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │  TLS    │  │ Static  │  │  Rate   │  │ Headers │    │   │
│  │  │  (LE)   │  │  Files  │  │ Limit   │  │Security │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │                      PM2                                  │   │
│  │              (Process Manager)                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │               EXPRESS API SERVER                    │  │   │
│  │  │                  (Port 3001)                        │  │   │
│  │  │                                                    │  │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │   │
│  │  │  │   Auth   │  │  Routes  │  │ Services │        │  │   │
│  │  │  │  (JWT)   │  │          │  │          │        │  │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘        │  │   │
│  │  │                                                    │  │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │   │
│  │  │  │ Repos    │  │  Prisma  │  │  Cron    │        │  │   │
│  │  │  │          │  │  Client  │  │  Jobs    │        │  │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘        │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │                 POSTGRESQL                                │   │
│  │              (Port 5432)                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ Database │  │ Backups  │  │  Logs    │              │   │
│  │  │vinayagar │  │  Daily   │  │  Audit   │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 FILE STORAGE                              │   │
│  │  /var/lib/vinayagar/uploads/                              │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │   │
│  │  │users │ │gallery│ │receipt│ │expense│ │ temp │         │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 LOGGING                                   │   │
│  │  /var/log/vinayagar/                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ app.log  │  │access.log│  │error.log │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 20.2 Component Relationships

```
User Browser
    │
    │ HTTPS
    ▼
Nginx (TLS termination)
    │
    ├── Static files (React SPA)
    │
    ├── API proxy (/hcgi/api/*)
    │       │
    │       ▼
    │   Express API
    │       │
    │       ├── PostgreSQL (data)
    │       ├── File Storage (uploads)
    │       └── SMTP (email)
    │
    └── File serving (/hcgi/api/files/*)
            │
            ▼
        File Storage
```

## 20.3 Deployment Sequence

```
1. Infrastructure Setup
   ├── Provision VPS
   ├── Install OS packages
   ├── Configure firewall
   ├── Install Node.js, PostgreSQL, Nginx, PM2
   └── Configure SSL

2. Application Deployment
   ├── Deploy code
   ├── Install dependencies
   ├── Build frontend
   ├── Configure environment
   ├── Run database migrations
   └── Start application

3. Verification
   ├── Health checks
   ├── SSL verification
   ├── API testing
   ├── Frontend testing
   └── File upload testing

4. Operational Setup
   ├── Configure backups
   ├── Configure monitoring
   ├── Configure logging
   ├── Test restore procedure
   └── Document procedures
```

## 20.4 Operational Responsibilities

| Task | Frequency | Owner |
|---|---|---|
| Monitor health checks | Continuous | Automated |
| Review error logs | Daily | Admin |
| Verify backups | Weekly | Admin |
| Apply security updates | Monthly | Admin |
| Review access logs | Weekly | Admin |
| Test disaster recovery | Quarterly | Admin |
| Review infrastructure costs | Monthly | Admin |
| Update documentation | On change | Admin |

## 20.5 Future Expansion Strategy

| Phase | Timeline | Changes |
|---|---|---|
| **Current** | Month 1-6 | Single VPS, PostgreSQL, PM2, in-memory cache |
| **Growth** | Month 6-12 | Upgrade VPS (8 vCPU, 16 GB RAM), add PgBouncer |
| **Scale** | Year 1-2 | Add Redis for caching, S3 for file storage |
| **Enterprise** | Year 2+ | Load balancer, multiple API instances, managed PostgreSQL |

## 20.6 Cost Estimation

| Item | Monthly Cost | Notes |
|---|---|---|
| Hostinger VPS (4 vCPU, 8 GB) | ~$20-40 | Primary infrastructure |
| Domain name | ~$1 | Annual ~$12 |
| SSL certificate | $0 | Let's Encrypt (free) |
| SMTP provider | $0-5 | Free tier or basic plan |
| Offsite backup storage | $0-5 | S3 or similar |
| **Total** | **~$25-50/month** | Sufficient for temple scale |

## 20.7 Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| API response time (p95) | < 500ms | Application logs |
| Page load time | < 2 seconds | Lighthouse |
| Time to first byte | < 200ms | Nginx logs |
| Uptime | > 99.5% | Health monitoring |
| Error rate | < 1% | Application logs |
| Backup success rate | 100% | Backup verification |

---

## Appendix: Infrastructure Decision Log

| Decision | Rationale | Alternatives Considered |
|---|---|---|
| Hostinger VPS over AWS/GCP | Cost optimization for temple scale | AWS EC2, GCP Compute Engine |
| PostgreSQL over MongoDB | Relational data, ACID compliance, Prisma support | MongoDB, SQLite |
| Nginx over Apache | Performance, modern features, reverse proxy | Apache, Caddy |
| PM2 over systemd | Node.js-specific features, monitoring | systemd, Forever |
| Local storage over S3 | Cost, simplicity for initial deployment | AWS S3, DigitalOcean Spaces |
| In-memory cache over Redis | Cost, simplicity for initial deployment | Redis, Memcached |
| Let's Encrypt over paid SSL | Cost, auto-renewal, industry standard | DigiCert, Comodo |
| Single VPS over cluster | Cost, simplicity for temple scale | Multi-VPS, Kubernetes |

---

*This document is the complete Deployment & Infrastructure Architecture Blueprint. It is the authoritative reference for all infrastructure and deployment decisions. Every component, configuration, procedure, and operational responsibility is defined here before any infrastructure is provisioned.*
