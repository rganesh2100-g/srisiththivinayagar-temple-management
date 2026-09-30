# AGENTS.md

## Project

Sri Siththi Vinayagar Temple — npm workspaces monorepo with 3 apps:

| App | Port | Stack |
|-----|------|-------|
| `apps/web` | 3000 | React 18, Vite 7, TailwindCSS 3, shadcn/ui (Radix), react-router-dom 7, i18next |
| `apps/api` | 3001 | Express 5 (ESM), PocketBase SDK, helmet, morgan |
| `apps/pocketbase` | 8090 | PocketBase (Go binary), 529 migrations, 50 hooks |

Node version: **22** (`.nvmrc`). All packages use `"type": "module"` (ESM).

## Starting dev servers

**Critical:** PocketBase must start first. The API health-checks PocketBase with 10 retries (1s each). If PocketBase isn't ready, the API's `setupAdminUsers` and `autoArchive` fail silently.

```powershell
# Option A: use the convenience script (sets PB_SUPERUSER_EMAIL/PASSWORD and
# the mirror config BOOKING_MIRROR_SECRET / BOOKING_MIRROR_API_URL, read from
# apps/api/.env)
.\start.ps1

# Option B: start manually in order
# Terminal 1 — PocketBase (must export the mirror env vars manually here!
#   PB does NOT auto-load apps/pocketbase/.env in this build — $os.getenv()
#   returns empty for auto-loaded .env keys. Process env vars are the ONLY
#   channel, matching how PB_SUPERUSER_* is delivered in production.)
$env:PB_SUPERUSER_EMAIL="admin@localhost.com"; $env:PB_SUPERUSER_PASSWORD="admin123456"
$env:BOOKING_MIRROR_SECRET="(from apps/api/.env)"
$env:BOOKING_MIRROR_API_URL="http://localhost:3001"
cd apps/pocketbase; pocketbase.exe serve --http=0.0.0.0:8090

# Terminal 2 — API
$env:PB_SUPERUSER_EMAIL="admin@localhost.com"; $env:PB_SUPERUSER_PASSWORD="admin123456"
cd apps/api; node src/main.js

# Terminal 3 — Frontend
cd apps/web; npm run dev
```

The root `npm run dev` uses `concurrently --kill-others-on-fail` — if any app crashes, all stop. Note: `npm run dev` alone does NOT export the mirror env vars for PocketBase, so the H7/H8 mirror hooks will silently skip (they log `BOOKING_MIRROR_SECRET not set`). Use `start.ps1` for full mirroring.

### Health checks must ALWAYS exit

Whenever a command starts a server and then verifies readiness (e.g. PocketBase, API, a listener), use `curl.exe` with a hard timeout and `exit` so the command never hangs after success:

```powershell
curl.exe -s -o NUL --max-time 5 -w "PB health: %{http_code}`n" "http://localhost:8090/api/health"
if ($LASTEXITCODE -ne 0) { Write-Output "PB health check FAILED"; exit 1 }
Write-Output "PB ready — continuing"; exit 0
```

Rules:
- NEVER use `Invoke-WebRequest` for health checks — it can hang indefinitely on keep-alive even after the server responds.
- ALWAYS pair `--max-time <s>` with `-s -o NUL` (or `-w "%{http_code}"`) so output is one line and the command terminates.
- After a successful health check, add an explicit `exit` (or `exit 0`) so execution moves to the next step without waiting.

HARD EXIT RULE (apply to EVERY bash command, not just health checks):
- Every command MUST end with an explicit exit point — `; exit 0` (or `exit 1` on failure) — so the tool never hangs waiting on a child process or spawned server.
- After launching a background server with `Start-Process`, the launching command MUST NOT keep running: print the PID/short status, then end with `; exit 0` immediately. Do NOT rely on a later command to unblock it. If a launch knows a fixed port, follow it with a `curl.exe ... --max-time 5 ...; exit 0` health probe in the SAME command.
- Never leave a bare `Write-Output "..."` as the last statement — always terminate with `exit 0`.
- If a command seems about to spawn something that stays alive (servers, PB, redirect redirection via `Start-Process -RedirectStandardOutput`), tests in the temp dir first verify the child actually detached (e.g. PID returned AND health 200) before the command ends.

### Detaching a background server (the shell must NEVER stay open)

Symptom: a command prints its result (e.g. `PB_HEALTH=200`) but the tool call never returns, so the session appears stuck on that step even though the work succeeded. The output arrives twice (once from the command, once echoed by the user re-running it) and the next step never starts.

Cause: `Start-Process` creates a child that stays in the same console/job. Even with `-WindowStyle Hidden` and `-RedirectStandard*`, PowerShell 5.1 still holds the parent's handles open, so the tool waits for the long-running child. **`Start-Process` is UNRELIABLE for detaching long-lived servers here — do not use it for PocketBase, the API, Vite, or any daemon.**

MANDATORY pattern: launch via WMI (`Win32_Process::Create`). The child is created by the WMI service, inherits NO console handles, and the launching command returns immediately.

```powershell
# 1) stop any existing listener (no output inheritance)
Get-CimInstance Win32_Process -Filter "Name='pocketbase.exe'" |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

# 2) launch fully detached via WMI, exporting env vars through `cmd /c "set ..."`
$cmd = 'cmd /c "set PB_SUPERUSER_EMAIL=admin@localhost.com' +
       '&& set PB_SUPERUSER_PASSWORD=admin123456' +
       '&& set BOOKING_MIRROR_SECRET=<from apps/api/.env>' +
       '&& set BOOKING_MIRROR_API_URL=http://localhost:3001' +
       '&& ""<abs>\apps\pocketbase\pocketbase.exe"" serve --http=0.0.0.0:8090 ' +
       '> ""%TEMP%\pb.log"" 2>&1"'
$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create `
       -Arguments @{ CommandLine = $cmd; CurrentDirectory = '<abs>\apps\pocketbase' }
Write-Output "PB ReturnValue=$($r.ReturnValue) PID=$($r.ProcessId)"
if ($r.ReturnValue -ne 0) { Write-Output "PB launch FAILED"; exit 1 }

# 3) health probe with a hard timeout, then hard exit
Start-Sleep -Seconds 5
curl.exe -s -o NUL --max-time 5 -w "PB_HEALTH=%{http_code}`n" "http://localhost:8090/api/health"
[System.Console]::Out.Flush()
exit 0
```

Rules:
- NEVER use `Start-Process` for a long-lived server/daemon. Use `Invoke-CimMethod -ClassName Win32_Process -MethodName Create`.
- Quote paths with spaces: inner executable path needs doubled quotes `""C:\...\pocketbase.exe""` inside the `cmd /c` string.
- WMI children do NOT inherit the caller's process env, so pass every required var through `cmd /c "set NAME=value && ..."`. PocketBase needs `PB_SUPERUSER_*` and the mirror needs `BOOKING_MIRROR_SECRET` / `BOOKING_MIRROR_API_URL`.
- Redirect child output with `> "%TEMP%\<name>.log" 2>&1` inside the `cmd /c` string; never inherit stdout.
- ALWAYS check `$r.ReturnValue` — `0` means launched, anything else is a launch failure.
- ALWAYS end with an explicit `exit 0` (or `exit 1` on failure) on its own final line, after `curl.exe --max-time`.
- If a launch command ever appears to hang, do NOT re-run it: the child may already be running. Probe the port with `curl.exe --max-time` in a fresh command, and check for duplicates with `Get-CimInstance Win32_Process` before relaunching — duplicate servers fight over the port.
- For SHORT scripts that must be observed (tests, probes), run them with `Start-Process ... -Wait` or capture output to a file and read it in a separate command; do not run them in the foreground when they can exceed the tool timeout.

## Lint

```bash
npm run lint          # runs eslint on web + api concurrently
npm run lint --prefix apps/web    # web only
npm run lint --prefix apps/api    # api only
```

No typecheck or test commands exist. There are **no test files** in the repo.

## Build

```bash
npm run build    # builds web only (vite build -> dist/apps/web)
```

## Path alias

`@/` maps to `apps/web/src/` (configured in `jsconfig.json` and Vite resolve alias). Use it:
```js
import Header from '@/components/Header.jsx';
```

## API proxy in dev

Vite proxies `/hcgi/api` → `http://localhost:3001` (strips the prefix). The web app's `apiServerClient.js` calls `/hcgi/api/...`. In production, the platform adds the `/hcgi/api` prefix.

## PocketBase client behavior

- **Dev** (`localhost`): connects to `http://localhost:8090`
- **Production**: connects to `/hcgi/platform`

Defined in `apps/web/src/lib/pocketbaseClient.js`.

## Auth

- Frontend auth uses PocketBase's built-in auth via `apps/web/src/contexts/AuthContext.jsx`
- `ProtectedRoute` component checks `user.role` against `allowedRoles` (values: `'user'`, `'admin'`)
- API auth: Bearer token middleware in `apps/api/src/middleware/auth.js`

## ESLint quirks

`apps/web/eslint.config.mjs` disables many rules for performance/correctness tradeoffs:
- `no-unused-vars: off`, `import/no-cycle: off` (intentional — slow or noisy)
- `no-undef: error` — the one critical rule kept on
- `import/no-self-import: error` — prevents infinite bundling loops

## i18n

Three languages: **en**, **de**, **ta**. Fallback: `en`. Translation files in `apps/web/src/i18n/locales/`. Use `useTranslation()` hook with `t('key', 'fallback')`.

## UI components

shadcn/ui component library in `apps/web/src/components/ui/`. 55 components. Built on Radix primitives with `class-variance-authority` + `tailwind-merge`. Follow existing patterns when adding new components.

## PocketBase

- Migrations: `apps/pocketbase/pb_migrations/` (timestamp-prefixed, auto-applied)
- Hooks: `apps/pocketbase/pb_hooks/*.pb.js` (server-side JS hooks)
- Database: `apps/pocketbase/pb_data/` (gitignored)
- Admin UI: `http://localhost:8090/_/`
- Default superuser: `admin@localhost.com` / `admin123456`

## Gotchas

- `console.warn` is silenced globally in `apps/web/vite.config.js` (line 274)
- The web app's `dist/` is gitignored but exists in the repo — ignore it
- `start.ps1` and `start.sh` are gitignored — local dev convenience only
- PocketBase binary (`pocketbase.exe`) is gitignored; `pb_data/` is gitignored
- No README exists
