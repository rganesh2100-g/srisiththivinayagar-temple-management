# PostgreSQL Development Environment Setup

**Sri Siththi Vinayagar Temple — Phase 0.3**
**Date:** 2026-07-18 | **Status:** Ready for execution

---

## 1. PostgreSQL Installation Requirements

### Version
- **Recommended:** PostgreSQL 16
- **Minimum:** PostgreSQL 15
- **Prisma tested against:** PostgreSQL 15+

### Windows Installation

Download the EDB installer from:
```
https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
```

Select:
- **Version:** 16
- **OS:** Windows x86-64
- **Installation Directory:** `C:\Program Files\PostgreSQL\16`
- **Data Directory:** `C:\Program Files\PostgreSQL\16\data`
- **Port:** `5432` (default)
- **Superuser:** `postgres`
- **Password:** Choose a strong password for the postgres superuser — you will need this during setup
- **Locale:** Default (English)

### During Installation
- Install **pgAdmin 4** (included) — web-based database management
- Install **Command Line Tools** (psql) — required for Prisma
- Keep the **Stack Builder** unchecked (not needed)

### After Installation — Add to PATH
```
C:\Program Files\PostgreSQL\16\bin
```

Verify:
```powershell
psql --version
# Expected: psql (PostgreSQL) 16.x
```

---

## 2. Required PostgreSQL Extensions

The Prisma schema uses `gen_random_uuid()` which is built into PostgreSQL 13+ (no extension needed). However, for robustness:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

This is optional but recommended for UUID generation at the database level.

---

## 3. Database Configuration

### Connection Settings

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Superuser | `postgres` |
| App User | `vinayagar` |
| App Password | Choose a dev-only password (see below) |
| Dev Database | `vinayagar_dev` |
| Test Database | `vinayagar_test` |

### Choosing a Dev Password

Pick a simple password for local development only. Examples:
- `vinayagar_dev`
- `dev_password_123`
- Any short string you will remember

**Do not use production passwords for local development.**

### DATABASE_URL Format

Replace `<YOUR_DEV_PASSWORD>` with the password you chose:
```
postgresql://vinayagar:<YOUR_DEV_PASSWORD>@localhost:5432/vinayagar_dev
```

---

## 4. Step-by-Step Setup Commands

Execute these commands in order. Open PowerShell **as Administrator** for Step A, then normal PowerShell for the rest.

### Step A: Start PostgreSQL Service

```powershell
# Verify PostgreSQL service is running
Get-Service -Name "postgresql*"

# If not running, start it
Start-Service -Name "postgresql-x64-16"
```

### Step B: Connect as Superuser

```powershell
# Connect to PostgreSQL as the postgres superuser
psql -U postgres
```

This opens the psql prompt: `postgres=#`

### Step C: Create App User

```sql
-- Inside psql prompt (postgres=#)
-- Replace <YOUR_DEV_PASSWORD> with your chosen password
CREATE USER vinayagar WITH PASSWORD '<YOUR_DEV_PASSWORD>';
```

### Step D: Create Development Database

```sql
-- Create the development database
CREATE DATABASE vinayagar_dev OWNER vinayagar;
```

### Step E: Create Test Database

```sql
-- Create the test database (for future integration tests)
CREATE DATABASE vinayagar_test OWNER vinayagar;
```

### Step F: Grant Privileges

```sql
-- Grant all privileges on dev database
GRANT ALL PRIVILEGES ON DATABASE vinayagar_dev TO vinayagar;

-- Grant all privileges on test database
GRANT ALL PRIVILEGES ON DATABASE vinayagar_test TO vinayagar;

-- Connect to vinayagar_dev to grant schema permissions
\c vinayagar_dev

-- Grant schema-level permissions
GRANT ALL ON SCHEMA public TO vinayagar;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vinayagar;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vinayagar;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO vinayagar;
```

### Step G: Enable Extensions (Optional)

```sql
-- Still inside vinayagar_dev
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Step H: Exit psql

```sql
-- Exit psql
\q
```

### Step I: Verify Connection

```powershell
# Test connection with the app user (replace password)
psql -U vinayagar -d vinayagar_dev -h localhost -c "SELECT version();"

# Expected output:
# PostgreSQL 16.x on x86_64-pc-linux-gnu, compiled by gcc...

# Test UUID generation
psql -U vinayagar -d vinayagar_dev -h localhost -c "SELECT gen_random_uuid();"

# Expected output:
# 550e8400-e29b-41d4-a716-446655440000  (example UUID)
```

---

## 5. Update .env File

Update `apps/api/.env` line 7 to match the password you chose:

```env
# PostgreSQL (Phase 0)
DATABASE_URL="postgresql://vinayagar:<YOUR_DEV_PASSWORD>@localhost:5432/vinayagar_dev"
```

Also update `.env.example` if you want it to reflect the same placeholder.

---

## 6. Prisma Migration Workflow

### First Migration (Create Schema)

```powershell
cd apps/api

# 1. Validate schema
npx prisma validate

# 2. Generate Prisma Client
npx prisma generate

# 3. Create and apply the first migration
npx prisma migrate dev --name init

# This will:
#   - Generate SQL migration file in prisma/migrations/
#   - Create all 34 tables, 25 enums, all indexes
#   - Apply the migration to the dev database
#   - Regenerate Prisma Client
```

### Seed the Database

```powershell
# After successful migration
npx prisma db seed

# This will:
#   - Create 4 admin users (with bcrypt-hashed passwords)
#   - Create 7 expense categories
#   - Create 4 photo categories
#   - Create 3 account types
#   - Create 5 classifications
```

### Verify Schema in Prisma Studio

```powershell
# Open Prisma Studio (visual database browser)
npx prisma studio

# Opens browser at http://localhost:5555
# Verify all 34 tables appear in the left sidebar
```

### Verify with psql

```powershell
psql -U vinayagar -d vinayagar_dev -h localhost

# Inside psql:
\dt              -- List all tables (expect 34+)
\d users         -- Describe users table
\d pooja_bookings -- Describe pooja_bookings table
SELECT COUNT(*) FROM users;  -- Should return 4 (admin users)
\q
```

---

## 7. Development Configuration

### Recommended PostgreSQL Settings

For development, the default PostgreSQL configuration is fine. Key settings:

| Setting | Default | Notes |
|---|---|---|
| `shared_buffers` | 128MB | Increase to 256MB if 16GB+ RAM |
| `work_mem` | 4MB | Sufficient for dev |
| `max_connections` | 100 | Sufficient for dev |
| `log_statement` | 'none' | Set to 'all' for debugging |
| `log_min_duration_statement` | -1 (disabled) | Set to 1000 (ms) to log slow queries |

### Enable Query Logging (Optional, for debugging)

Edit `postgresql.conf`:
```
log_statement = 'all'
log_min_duration_statement = 0
```

Then restart PostgreSQL service.

---

## 8. Production Principles

When deploying to production (Hostinger VPS), these principles apply:

| Principle | Description |
|---|---|
| **Strong credentials** | Use a 32+ character random password for the database user. Never reuse dev passwords. |
| **Restricted access** | Bind PostgreSQL to `localhost` only. Do not expose port 5432 to the internet. |
| **SSL connections** | Enable `ssl = on` in `postgresql.conf` and require SSL in `pg_hba.conf`. |
| **Minimal auth** | Use `scram-sha-256` authentication. Never use `trust` in production. |
| **Regular backups** | Automated daily backups of the database. Retain for 30 days. |
| **Monitoring** | Track connection count, query performance, disk usage. |
| **Separate databases** | Use `vinayagar_prod` in production, never `vinayagar_dev`. |

Detailed production deployment instructions will be generated when deploying to the VPS. They are intentionally kept out of this local development guide.

---

## 9. Backup Strategy Before Migration

### Before Running First Migration

```powershell
# 1. Back up the existing PocketBase database
Copy-Item "apps\pocketbase\pb_data\data.db" "apps\pocketbase\pb_data\data.db.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# 2. Verify the backup exists
Get-ChildItem "apps\pocketbase\pb_data\data.db.backup.*"
```

### Ongoing Backup Strategy

```powershell
# Daily backup script (save as scripts\backup-db.ps1)
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = "backups"
New-Item -ItemType Directory -Path $backupDir -Force

# PostgreSQL backup
pg_dump -U vinayagar -d vinayagar_dev -h localhost -f "$backupDir\vinayagar_dev_$timestamp.sql"

# PocketBase backup
Copy-Item "apps\pocketbase\pb_data\data.db" "$backupDir\pocketbase_$timestamp.db"

Write-Host "Backup complete: $timestamp"
```

### Restore from Backup

```powershell
# Restore PostgreSQL backup
psql -U vinayagar -d vinayagar_dev -h localhost -f "backups\vinayagar_dev_YYYYMMDD.sql"
```

---

## 10. Complete Command Sequence

Replace `<YOUR_DEV_PASSWORD>` with your chosen password throughout.

```powershell
# ── A. Prerequisites Check ──────────────────────────────────────────────
psql --version
# If not found, install PostgreSQL 16 and add C:\Program Files\PostgreSQL\16\bin to PATH

# ── B. Create User and Databases ────────────────────────────────────────
psql -U postgres -c "CREATE USER vinayagar WITH PASSWORD '<YOUR_DEV_PASSWORD>';"
psql -U postgres -c "CREATE DATABASE vinayagar_dev OWNER vinayagar;"
psql -U postgres -c "CREATE DATABASE vinayagar_test OWNER vinayagar;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE vinayagar_dev TO vinayagar;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE vinayagar_test TO vinayagar;"
psql -U postgres -d vinayagar_dev -c "GRANT ALL ON SCHEMA public TO vinayagar;"
psql -U postgres -d vinayagar_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vinayagar;"
psql -U postgres -d vinayagar_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vinayagar;"
psql -U postgres -d vinayagar_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO vinayagar;"
psql -U postgres -d vinayagar_dev -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# ── C. Verify Connection ────────────────────────────────────────────────
psql -U vinayagar -d vinayagar_dev -h localhost -c "SELECT version();"
psql -U vinayagar -d vinayagar_dev -h localhost -c "SELECT gen_random_uuid();"

# ── D. Update .env ─────────────────────────────────────────────────────
# Ensure apps/api/.env has:
# DATABASE_URL="postgresql://vinayagar:<YOUR_DEV_PASSWORD>@localhost:5432/vinayagar_dev"

# ── E. Prisma Migration ────────────────────────────────────────────────
cd apps/api
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init

# ── F. Seed Database ───────────────────────────────────────────────────
npx prisma db seed

# ── G. Verify ──────────────────────────────────────────────────────────
npx prisma studio
psql -U vinayagar -d vinayagar_dev -h localhost -c "\dt"
psql -U vinayagar -d vinayagar_dev -h localhost -c "SELECT COUNT(*) FROM users;"
# Expected: 4 (admin users)
```

---

## 11. Troubleshooting

### "password authentication failed"
```powershell
# Reset password
psql -U postgres -c "ALTER USER vinayagar WITH PASSWORD '<NEW_PASSWORD>';"
# Update .env DATABASE_URL with new password
```

### "database vinayagar_dev does not exist"
```powershell
psql -U postgres -c "CREATE DATABASE vinayagar_dev OWNER vinayagar;"
```

### "role vinayagar does not exist"
```powershell
psql -U postgres -c "CREATE USER vinayagar WITH PASSWORD '<YOUR_DEV_PASSWORD>';"
```

### "permission denied for schema public"
```powershell
psql -U postgres -d vinayagar_dev -c "GRANT ALL ON SCHEMA public TO vinayagar;"
```

### "psql is not recognized"
Add PostgreSQL bin to PATH:
```
C:\Program Files\PostgreSQL\16\bin
```
Then restart your terminal.

### Prisma migration fails with connection error
1. Verify PostgreSQL is running: `Get-Service postgresql*`
2. Verify the port: `Test-NetConnection localhost -Port 5432`
3. Test direct connection: `psql -U vinayagar -d vinayagar_dev -h localhost`

---

## 12. Readiness Checklist

After completing all steps above, verify:

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | PostgreSQL 16 installed | `psql --version` | `psql (PostgreSQL) 16.x` |
| 2 | Service running | `Get-Service postgresql*` | Status: Running |
| 3 | User exists | `psql -U postgres -c "\du"` | `vinayagar` listed |
| 4 | Dev DB exists | `psql -U postgres -c "\l"` | `vinayagar_dev` listed |
| 5 | Test DB exists | `psql -U postgres -c "\l"` | `vinayagar_test` listed |
| 6 | User can connect | `psql -U vinayagar -d vinayagar_dev -h localhost` | Prompts for password, connects |
| 7 | Schema validates | `npx prisma validate` | `schema is valid` |
| 8 | Migration succeeds | `npx prisma migrate dev --name init` | `Successfully created migration` |
| 9 | 34 tables created | `psql -U vinayagar -d vinayagar_dev -h localhost -c "\dt"` | 34+ tables listed |
| 10 | 25 enums created | `psql -U vinayagar -d vinayagar_dev -h localhost -c "\dT"` | 25 enum types listed |
| 11 | Seed succeeds | `npx prisma db seed` | `Seed complete!` |
| 12 | 4 admin users | `psql -U vinayagar -d vinayagar_dev -h localhost -c "SELECT COUNT(*) FROM users;"` | `4` |
| 13 | Prisma Studio opens | `npx prisma studio` | Browser opens at :5555 |
| 14 | Existing PB still works | Start PocketBase + API | Website functions on :8090/:3001 |
| 15 | Lint passes | `npm run lint` | No errors |

---

## 13. Ready for Repository Layer

Once all 15 checklist items pass, the project is ready for **Phase 1: Repository Layer Implementation**.

The database is:
- Running on PostgreSQL 16
- Schema with 34 tables, 25 enums, all indexes and constraints
- Seeded with admin users and default data
- Accessible via Prisma Client
- Coexisting with the existing PocketBase database

**Next steps (Phase 1):**
1. Create `apps/api/src/repositories/` directory
2. Implement `UserRepository.js`
3. Implement `PoojaRepository.js`
4. Implement `BookingRepository.js`
5. Implement remaining repositories (31 total)
6. Wire repositories to existing routes (replace PB SDK calls)

---

*This document is the complete PostgreSQL local development environment setup for Phase 0.3.*
