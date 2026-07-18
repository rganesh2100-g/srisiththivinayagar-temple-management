# ═══════════════════════════════════════════════════════════════════════════════
# PostgreSQL Development Environment Setup Script
# Sri Siththi Vinayagar Temple — Phase 0.3
#
# Prerequisites:
#   - PostgreSQL 15+ installed (with psql in PATH)
#   - Run PowerShell as Administrator for service management
#
# Usage:
#   .\scripts\setup-postgresql.ps1
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

# ─── Configuration ──────────────────────────────────────────────────────────
$PG_SUPERUSER  = "postgres"
$APP_USER      = "vinayagar"
$APP_PASSWORD  = "vinayagar_dev_2024"
$DEV_DB        = "vinayagar_dev"
$TEST_DB       = "vinayagar_test"
$DEV_DIR       = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "  Sri Siththi Vinayagar Temple — PostgreSQL Setup"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

# ─── Step 1: Check psql is available ────────────────────────────────────────
Write-Host "▶ Step 1: Checking psql availability..."
try {
    $psqlVersion = & psql --version 2>&1
    Write-Host "  ✓ Found: $psqlVersion"
} catch {
    Write-Host "  ✗ psql not found in PATH."
    Write-Host ""
    Write-Host "  Install PostgreSQL 16 from:"
    Write-Host "  https://www.enterprisedb.com/downloads/postgres-postgresql-downloads"
    Write-Host ""
    Write-Host "  After install, add to PATH:"
    Write-Host "  C:\Program Files\PostgreSQL\16\bin"
    Write-Host ""
    exit 1
}

# ─── Step 2: Check PostgreSQL service ───────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 2: Checking PostgreSQL service..."
$service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($service) {
    Write-Host "  ✓ Service found: $($service.Name) — Status: $($service.Status)"
    if ($service.Status -ne "Running") {
        Write-Host "  Starting service..."
        Start-Service -Name $service.Name
        Start-Sleep -Seconds 3
        Write-Host "  ✓ Service started"
    }
} else {
    Write-Host "  ✗ No PostgreSQL service found."
    Write-Host "  Please install PostgreSQL and ensure the service is running."
    exit 1
}

# ─── Step 3: Create user ────────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 3: Creating database user '$APP_USER'..."
try {
    & psql -U $PG_SUPERUSER -tc "SELECT 1 FROM pg_roles WHERE rolname='$APP_USER'" 2>&1 | Out-Null
    $userExists = & psql -U $PG_SUPERUSER -tc "SELECT 1 FROM pg_roles WHERE rolname='$APP_USER'" 2>&1
    if ($userExists -match "1") {
        Write-Host "  ✓ User '$APP_USER' already exists — skipping"
    } else {
        & psql -U $PG_SUPERUSER -c "CREATE USER $APP_USER WITH PASSWORD '$APP_PASSWORD';"
        Write-Host "  ✓ User '$APP_USER' created"
    }
} catch {
    Write-Host "  ✗ Failed to create user: $_"
    exit 1
}

# ─── Step 4: Create databases ───────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 4: Creating databases..."

foreach ($db in @($DEV_DB, $TEST_DB)) {
    try {
        $dbExists = & psql -U $PG_SUPERUSER -tc "SELECT 1 FROM pg_database WHERE datname='$db'" 2>&1
        if ($dbExists -match "1") {
            Write-Host "  ✓ Database '$db' already exists — skipping"
        } else {
            & psql -U $PG_SUPERUSER -c "CREATE DATABASE $db OWNER $APP_USER;"
            Write-Host "  ✓ Database '$db' created"
        }
    } catch {
        Write-Host "  ✗ Failed to create database '$db': $_"
        exit 1
    }
}

# ─── Step 5: Grant privileges ───────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 5: Granting privileges..."

foreach ($db in @($DEV_DB, $TEST_DB)) {
    & psql -U $PG_SUPERUSER -c "GRANT ALL PRIVILEGES ON DATABASE $db TO $APP_USER;" 2>&1 | Out-Null
    & psql -U $PG_SUPERUSER -d $db -c "GRANT ALL ON SCHEMA public TO $APP_USER;" 2>&1 | Out-Null
    & psql -U $PG_SUPERUSER -d $db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $APP_USER;" 2>&1 | Out-Null
    & psql -U $PG_SUPERUSER -d $db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $APP_USER;" 2>&1 | Out-Null
    & psql -U $PG_SUPERUSER -d $db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $APP_USER;" 2>&1 | Out-Null
}
Write-Host "  ✓ Privileges granted on $DEV_DB and $TEST_DB"

# ─── Step 6: Enable extensions ──────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 6: Enabling extensions..."
& psql -U $PG_SUPERUSER -d $DEV_DB -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>&1 | Out-Null
Write-Host "  ✓ pgcrypto extension enabled"

# ─── Step 7: Verify connection ──────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 7: Verifying connection..."
$pgVersion = & psql -U $APP_USER -d $DEV_DB -h localhost -t -c "SELECT version();" 2>&1
Write-Host "  ✓ Connected: $($pgVersion.Trim())"

$uuid = & psql -U $APP_USER -d $DEV_DB -h localhost -t -c "SELECT gen_random_uuid();" 2>&1
Write-Host "  ✓ UUID generation works: $($uuid.Trim())"

# ─── Step 8: Count existing tables ──────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 8: Database status..."
$tableCount = & psql -U $APP_USER -d $DEV_DB -h localhost -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1
Write-Host "  ✓ Current tables: $($tableCount.Trim())"

$enumCount = & psql -U $APP_USER -d $DEV_DB -h localhost -t -c "SELECT COUNT(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');" 2>&1
Write-Host "  ✓ Current enums: $($enumCount.Trim())"

# ─── Step 9: Run Prisma migration ───────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 9: Running Prisma migration..."
$apiDir = Join-Path $DEV_DIR "apps\api"
Push-Location $apiDir

Write-Host "  Validating schema..."
& npx prisma validate
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Schema validation failed"
    Pop-Location
    exit 1
}

Write-Host "  Generating Prisma Client..."
& npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Prisma Client generation failed"
    Pop-Location
    exit 1
}

Write-Host "  Running migration..."
& npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Migration failed"
    Pop-Location
    exit 1
}

Pop-Location

# ─── Step 10: Seed database ────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 10: Seeding database..."
Push-Location $apiDir
& npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Seed failed"
    Pop-Location
    exit 1
}
Pop-Location

# ─── Step 11: Final verification ────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Step 11: Final verification..."

$tableCount = & psql -U $APP_USER -d $DEV_DB -h localhost -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1
Write-Host "  ✓ Tables created: $($tableCount.Trim())"

$enumCount = & psql -U $APP_USER -d $DEV_DB -h localhost -t -c "SELECT COUNT(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');" 2>&1
Write-Host "  ✓ Enums created: $($enumCount.Trim())"

$userCount = & psql -U $APP_USER -d $DEV_DB -h localhost -t -c "SELECT COUNT(*) FROM users;" 2>&1
Write-Host "  ✓ Admin users seeded: $($userCount.Trim())"

$categoryCount = & psql -U $APP_USER -d $DEV_DB -h localhost -t -c "SELECT COUNT(*) FROM expense_categories;" 2>&1
Write-Host "  ✓ Expense categories seeded: $($categoryCount.Trim())"

# ─── Summary ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "  Setup Complete!"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "  Database:  $DEV_DB"
Write-Host "  User:      $APP_USER"
Write-Host "  Port:      5432"
Write-Host "  URL:       postgresql://$APP_USER`:***@localhost:5432/$DEV_DB"
Write-Host ""
Write-Host "  Next steps:"
Write-Host "    1. Run: npx prisma studio     (visual DB browser)"
Write-Host "    2. Start PocketBase:           cd apps\pocketbase; pocketbase.exe serve"
Write-Host "    3. Start API:                  cd apps\api; npm run dev"
Write-Host "    4. Start Frontend:             cd apps\web; npm run dev"
Write-Host ""
Write-Host "  Ready for Phase 1: Repository Layer Implementation"
Write-Host "═══════════════════════════════════════════════════════════════"
