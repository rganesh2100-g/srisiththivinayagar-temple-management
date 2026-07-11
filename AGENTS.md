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
# Option A: use the convenience script (sets PB_SUPERUSER_EMAIL/PASSWORD)
.\start.ps1

# Option B: start manually in order
# Terminal 1 — PocketBase
cd apps/pocketbase; pocketbase.exe serve --http=0.0.0.0:8090

# Terminal 2 — API
$env:PB_SUPERUSER_EMAIL="admin@localhost.com"; $env:PB_SUPERUSER_PASSWORD="admin123456"
cd apps/api; node src/main.js

# Terminal 3 — Frontend
cd apps/web; npm run dev
```

The root `npm run dev` uses `concurrently --kill-others-on-fail` — if any app crashes, all stop.

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
