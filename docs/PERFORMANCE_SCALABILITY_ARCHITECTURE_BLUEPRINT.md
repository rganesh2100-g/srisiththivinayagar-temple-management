# Performance & Scalability Architecture Blueprint

**Sri Siththi Vinayagar Temple — Enterprise Performance & Scalability Architecture**
**Version:** 1.0 | **Date:** 2026-07-11 | **Status:** Pre-Implementation Blueprint
**Stack:** React 18, Vite 7, Express 5, PostgreSQL, Prisma ORM, Node.js 22, Hostinger VPS

---

## Table of Contents

- [PART 1 — Performance Philosophy](#part-1--performance-philosophy)
- [PART 2 — Frontend Performance](#part-2--frontend-performance)
- [PART 3 — Backend Performance](#part-3--backend-performance)
- [PART 4 — Database Performance](#part-4--database-performance)
- [PART 5 — Prisma Optimization](#part-5--prisma-optimization)
- [PART 6 — Caching Strategy](#part-6--caching-strategy)
- [PART 7 — Storage Performance](#part-7--storage-performance)
- [PART 8 — API Performance](#part-8--api-performance)
- [PART 9 — Scalability Strategy](#part-9--scalability-strategy)
- [PART 10 — Performance Monitoring](#part-10--performance-monitoring)
- [PART 11 — Load & Capacity Planning](#part-11--load--capacity-planning)
- [PART 12 — Master Performance Blueprint](#part-12--master-performance-blueprint)

---

# PART 1 — Performance Philosophy

## 1.1 Performance Goals

| Goal | Target | Measurement |
|---|---|---|
| **Time to First Byte (TTFB)** | < 200ms for API responses | Server-side logging |
| **Largest Contentful Paint (LCP)** | < 2.5s on 4G mobile | Lighthouse / CrUX |
| **First Input Delay (FID)** | < 100ms | Field data |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Lighthouse / CrUX |
| **Interaction to Next Paint (INP)** | < 200ms | Field data |
| **Total Blocking Time (TBT)** | < 300ms on mobile | Lighthouse |
| **API P95 response time** | < 500ms | Server monitoring |
| **Database query P95** | < 100ms | pg_stat_statements |
| **Bundle size (initial chunk)** | < 200KB gzipped | Vite build analysis |
| **Full page load (3G)** | < 5s | Lighthouse |

## 1.2 Scalability Principles

| Principle | Description |
|---|---|
| **Scale vertically first** | Hostinger VPS allows CPU/RAM/disk upgrades without architectural changes. Exhaust vertical options before introducing horizontal complexity. |
| **Stateless by design** | Every API instance handles any request. No in-process session state. JWT tokens carry all session data. Enables adding instances behind a load balancer with zero code changes. |
| **Lazy over eager** | Load data on demand, not preemptively. Pages fetch only what they render. Admin dashboards fetch only visible sections. Background jobs process incrementally. |
| **Batch over loop** | Replace N individual database queries with single bulk operations. Use `createMany`, `updateMany`, `findMany` with `IN` clauses. Process records in batches of 500-1000. |
| **Cache aggressively, invalidate precisely** | Cache everything that can tolerate staleness. Invalidate on write. Use TTL as a safety net. Prefer cache-aside pattern with event-driven invalidation. |
| **Degrade gracefully** | If email fails, the transaction succeeds and email retries later. If AI chat is slow, show cached responses. If file storage is unavailable, show placeholders. No single dependency should bring down the system. |
| **Measure before optimizing** | Profile before tuning. Use `EXPLAIN ANALYZE` before adding indexes. Use Lighthouse before code-splitting. Data-driven decisions, not guesswork. |

## 1.3 Performance Budgeting

The project enforces performance budgets at build time and runtime:

| Budget | Limit | Enforcement |
|---|---|---|
| Initial JS bundle (gzipped) | 200 KB | Vite build warning |
| Total JS per page (gzipped) | 300 KB | Lighthouse CI |
| CSS (gzipped) | 50 KB | Vite build warning |
| Largest single chunk | 100 KB gzipped | Code-splitting mandate |
| Image per page (above fold) | 200 KB | Compression + responsive |
| API response (list endpoint) | 50 KB | Pagination enforced |
| API response (single resource) | 10 KB | Select fields |
| Database query time | 100ms P95 | pg_stat_statements alert |
| Memory per request | < 50 MB | Node.js heap monitoring |
| Concurrent DB connections | 20 | Prisma pool limit |

## 1.4 User Experience Objectives

| Scenario | Experience Target |
|---|---|
| **First-time visitor on 4G mobile** | Page loads in < 3s. Hero image appears in < 1.5s. Interactive in < 2s. |
| **Returning member on desktop** | Instant navigation between pages (cached chunks). Dashboard loads in < 1s. |
| **Admin managing gallery** | Upload 10 images in < 30s. Thumbnail grid renders in < 1s. Bulk operations complete in < 5s. |
| **Donor making payment** | Form submits in < 1s. Confirmation appears in < 2s. Receipt PDF available in < 5s. |
| **User chatting with AI** | First token streamed in < 1s. Subsequent tokens at 20+ tokens/second. |
| **Admin approving bookings** | Batch approve 10 bookings in < 3s. Email notifications queued in < 1s. |

## 1.5 Capacity Planning Philosophy

Capacity planning follows a three-phase approach:

**Phase 1 — Baseline (Pre-Launch):** Measure all metrics during development and staging. Establish baseline numbers for response times, memory usage, database query performance, and file I/O.

**Phase 2 — Monitor (Post-Launch):** Track metrics in production. Set alert thresholds at 70% of capacity. Review weekly for the first month, then monthly.

**Phase 3 — Scale (When Needed):** Scale when any metric consistently exceeds 80% of capacity for 7 consecutive days. Scale vertically first (cheaper, simpler). Scale horizontally only when vertical options are exhausted.

---

# PART 2 — Frontend Performance

## 2.1 Code Splitting Strategy

The application already implements route-based lazy loading via `React.lazy()` for all 68 pages. The strategy extends this with component-level splitting:

### Current State (Already Implemented)

All page components are lazy-loaded in `App.jsx`:
```javascript
const HomePage = lazy(() => import("@/pages/HomePage.jsx"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard.jsx"));
// ... 68 total lazy-loaded pages
```

### Enhancement: Component-Level Splitting

| Component Category | Splitting Strategy | Justification |
|---|---|---|
| **Admin modals** (PoojaApprovalDetailsModal, DonationDetailsModal, etc.) | Lazy-load on trigger | Admin-only, large, rarely used simultaneously |
| **Chart components** (Recharts wrappers) | Dynamic import | Recharts is ~80KB; only needed on dashboard/report pages |
| **PDF generation** (ReceiptTemplate, html2canvas) | Dynamic import | jsPDF + html2canvas is ~150KB; only needed on receipt pages |
| **Excel export** (xlsx library) | Dynamic import | xlsx is ~100KB; only needed on export actions |
| **Rich editors** (if added later) | Dynamic import | Heavy libraries loaded on demand |
| **Image lightbox** (ImageLightbox, VideoLightbox) | Lazy-load on media click | Not needed until user interacts with gallery |

### Splitting Rules

1. **Route-level:** Every page is a separate chunk. Already implemented.
2. **Feature-level:** Admin-only features, report generators, and media viewers are separate chunks.
3. **Library-level:** Heavy libraries (Recharts, jsPDF, xlsx, framer-motion) are split into vendor chunks.
4. **Component-level:** Modals, drawers, and popovers that are conditionally rendered are lazy-loaded.

### Vite Chunk Strategy

```javascript
// vite.config.js manualChunks configuration
manualChunks(id) {
  if (id.includes('node_modules/react-router')) return 'router';
  if (id.includes('node_modules/recharts')) return 'charts';
  if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'pdf';
  if (id.includes('node_modules/xlsx')) return 'excel';
  if (id.includes('node_modules/@radix-ui')) return 'ui-primitives';
  if (id.includes('node_modules/framer-motion')) return 'animation';
  if (id.includes('node_modules/pocketbase')) return 'pb-client';
  if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'i18n';
}
```

### Expected Chunk Analysis

| Chunk | Estimated Size (gzipped) | Load Trigger |
|---|---|---|
| `index` (app shell) | 45 KB | Initial page load |
| `router` | 15 KB | Initial page load |
| `ui-primitives` | 25 KB | Initial page load |
| `i18n` | 12 KB | Initial page load |
| `pb-client` | 8 KB | Initial page load |
| `charts` | 35 KB | Dashboard/report pages |
| `pdf` | 55 KB | Receipt generation |
| `excel` | 40 KB | Export actions |
| `animation` | 20 KB | Pages using framer-motion |
| Per-page chunks | 5-25 KB each | Route navigation |

## 2.2 Lazy Loading Architecture

### Route-Level Lazy Loading

Every route uses `React.lazy()` with a `Suspense` boundary:

```
App.jsx
├── Suspense (LoadingScreen)
│   ├── / → HomePage (lazy)
│   ├── /about → AboutPage (lazy)
│   ├── /poojas → PoojaOfferingsPage (lazy)
│   ├── /poojas/:id → PoojaDetailPage (lazy)
│   ├── /admin → AdminDashboard (lazy)
│   │   └── ProtectedRoute wrapper
│   └── ... 68 routes total
```

### Component-Level Lazy Loading

Components that are conditionally rendered (modals, drawers) should use dynamic imports:

| Pattern | When to Use | Example |
|---|---|---|
| `React.lazy()` | Component rendered inside a route | Page components |
| Dynamic `import()` | Component shown on user action | Modals, drawers, lightboxes |
| Intersection Observer | Component enters viewport | Below-fold images, infinite scroll lists |
| Virtual scrolling | Long lists (> 100 items) | Admin user list, donation history |

### Image Lazy Loading

All images below the fold use native `loading="lazy"`:

| Image Type | Strategy | Compression |
|---|---|---|
| Gallery thumbnails | `loading="lazy"`, intersection observer | WebP, 400px wide, quality 80 |
| Gallery full-size | Load on click (lightbox) | WebP, 1920px wide, quality 85 |
| Festival images | `loading="lazy"` | WebP, 800px wide, quality 80 |
| Pooja images | `loading="lazy"` | WebP, 600px wide, quality 80 |
| User avatars | Eager load (small) | WebP, 100px, quality 75 |
| Receipt PDFs | Load on demand | PDF (no optimization needed) |

## 2.3 Image Optimization

### Current State

The application uses `browser-image-compression` for client-side compression before upload. Gallery images are served through PocketBase's file API.

### Target Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **Client-side compression** | `browser-image-compression` | Reduce upload size before sending |
| **Server-side processing** | Sharp (Node.js) | Generate thumbnails, resize, convert to WebP |
| **Serving** | Nginx with image filter | On-the-fly resize for responsive images |
| **Format** | WebP primary, JPEG fallback | 25-35% smaller than JPEG at same quality |

### Image Processing Pipeline

```
User uploads image
    ↓
Client-side compression (browser-image-compression)
    ↓ Max 2MB, WebP conversion
Server receives upload
    ↓
Sharp processing
    ├── Generate thumbnail (200px wide)
    ├── Generate medium (600px wide)
    ├── Generate large (1200px wide)
    ├── Generate original (max 1920px wide)
    └── Convert all to WebP with JPEG fallback
    ↓
Store in /uploads/gallery/{uuid}/
    ├── thumb.webp
    ├── medium.webp
    ├── large.webp
    ├── original.webp
    └── original.jpg (fallback)
```

### Responsive Image Strategy

```html
<img
  srcset="
    /uploads/gallery/{id}/thumb.webp 200w,
    /uploads/gallery/{id}/medium.webp 600w,
    /uploads/gallery/{id}/large.webp 1200w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  src="/uploads/gallery/{id}/medium.webp"
  loading="lazy"
  alt="Gallery image"
/>
```

### Thumbnail Generation Rules

| Source Dimensions | Thumbnail (200px) | Medium (600px) | Large (1200px) |
|---|---|---|---|
| 4000x3000 | 200x150 | 600x450 | 1200x900 |
| 1920x1080 | 200x112 | 600x336 | 1200x675 |
| 800x600 | 200x150 | 600x450 | original |
| 300x300 | 200x200 | original | original |

Small images are not upscaled. The thumbnail is always generated; medium and large are generated only if the source is larger than the target.

## 2.4 Font Optimization

### Current State

The application uses system fonts and Google Fonts (loaded via CSS). Three languages are supported: English, German, Tamil.

### Font Loading Strategy

| Font | Weight | Usage | Loading |
|---|---|---|---|
| **Inter** | 400, 500, 600, 700 | Latin text (en, de) | `font-display: swap` |
| **Noto Sans Tamil** | 400, 500, 600, 700 | Tamil text (ta) | `font-display: swap` |
| **System fonts** | all | Fallback | Always available |

### Font Optimization Rules

1. **Subset fonts:** Load only the character sets needed. Inter拉丁 + Latin Extended. Noto Sans Tamil Tamil script.
2. **Preload critical fonts:** `<link rel="preload" as="font" href="/fonts/inter-400.woff2" crossorigin>`
3. **Use `font-display: swap`:** Text appears immediately in fallback font, swaps when custom font loads.
4. **Limit weights:** Maximum 4 weights per font family. Each weight is a separate HTTP request.
5. **WOFF2 format:** Smallest file size for modern browsers. WOFF fallback for older browsers.
6. **Self-host:** Avoid Google Fonts CDN dependency. Serve from `/fonts/` directory.

### Font Loading Timeline

```
HTML parse
    ↓
CSS parse → font-display: swap (show fallback immediately)
    ↓
Font file downloads (background, non-blocking)
    ↓
Font loads → text re-renders in custom font
    ↓
FOUT (Flash of Unstyled Text) — acceptable for performance
```

### Critical Font Size Budget

| Font File | Size (WOFF2) | Preload |
|---|---|---|
| Inter-400.woff2 | 15 KB | Yes |
| Inter-500.woff2 | 16 KB | No |
| Inter-600.woff2 | 16 KB | No |
| Inter-700.woff2 | 16 KB | No |
| NotoSansTamil-400.woff2 | 25 KB | No (Tamil pages only) |
| NotoSansTamil-700.woff2 | 26 KB | No (Tamil pages only) |
| **Total** | **114 KB** | **15 KB critical** |

## 2.5 Bundle Optimization

### Tree Shaking

Vite 7 performs tree-shaking by default. The following rules ensure maximum dead code elimination:

| Rule | Implementation |
|---|---|
| **Named exports only** | Avoid `import * as X from 'lib'` |
| **ESM packages** | Ensure all dependencies use ESM (`"type": "module"`) |
| **Side-effect-free** | Mark packages as side-effect-free in `package.json` |
| **Avoid barrel files** | Import directly from source, not from `index.js` |

### Bundle Analysis

Run `vite build --mode analyze` to generate bundle visualization:

```
npm run build --prefix apps/web -- --mode analyze
```

This produces a treemap showing:
- Chunk sizes (raw and gzipped)
- Duplicate modules across chunks
- Tree-shaking effectiveness
- Library contribution to bundle size

### Dead Code Elimination

| Source | Current Size | Optimization | Target |
|---|---|---|---|
| Unused Radix UI components | ~15 KB | Import only used components | 0 KB |
| Duplicate utility functions | ~5 KB | Consolidate `utils.js`, `lib/utils.js` | 0 KB |
| Console.log statements | ~3 KB | Strip in production build | 0 KB |
| Debug utilities | ~2 KB | Tree-shake in production | 0 KB |
| **Total savings** | **~25 KB** | | **0 KB** |

### Production Build Optimizations

```javascript
// vite.config.js production optimizations
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,       // Remove console.log
        drop_debugger: true,      // Remove debugger statements
        pure_funcs: ['console.log', 'console.debug'],
      },
      mangle: {
        toplevel: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: { /* as defined in 2.1 */ },
      },
    },
    cssCodeSplit: true,           // Split CSS per chunk
    sourcemap: false,             // No sourcemaps in production
    chunkSizeWarningLimit: 300,   // Warn if chunk > 300KB
  },
});
```

## 2.6 Asset Compression

### Gzip Compression

| Asset Type | Compression Level | Expected Ratio |
|---|---|---|
| JavaScript (gzip) | Level 6 | 70-80% reduction |
| CSS (gzip) | Level 6 | 75-85% reduction |
| HTML (gzip) | Level 6 | 70-80% reduction |
| JSON (gzip) | Level 6 | 75-85% reduction |
| SVG (gzip) | Level 6 | 60-70% reduction |
| Images | Already compressed | No additional benefit |

### Brotli Compression (Nginx)

Brotli achieves 15-25% better compression than gzip for text assets:

```nginx
# Nginx configuration
brotli on;
brotli_comp_level 6;
brotli_types text/javascript text/css text/html application/json image/svg+xml;
```

### Pre-compressed Assets

Vite builds can generate `.gz` and `.br` files alongside source files:

```javascript
// vite.config.js
build: {
  rollupOptions: {
    output: {
      assetFileNames: (assetInfo) => {
        // Serve pre-compressed assets
      },
    },
  },
},
```

## 2.7 Browser Caching Strategy

### Cache Headers

| Asset Type | Cache-Control | Justification |
|---|---|---|
| **Vite-hashed assets** (`/assets/index-abc123.js`) | `public, max-age=31536000, immutable` | Content-hash in filename; safe to cache forever |
| **Fonts** (`/fonts/*.woff2`) | `public, max-age=31536000, immutable` | Versioned filenames; cache forever |
| **Images** (`/uploads/*`) | `public, max-age=86400` | May change; cache 1 day |
| **Favicon** | `public, max-age=604800` | Rarely changes; cache 1 week |
| **API responses** | `no-store` | Dynamic; never cache |
| **HTML shell** (`index.html`) | `no-cache` | Always revalidate to get new chunk references |

### Service Worker (Future)

A service worker can enable offline-first for public pages:

| Page Type | Strategy | Justification |
|---|---|---|
| **Public pages** (home, about, poojas, festivals) | Cache-first with network update | Content changes rarely; show cached, update in background |
| **Dynamic pages** (dashboard, profile) | Network-first with cache fallback | Content changes frequently; try network, fall back to cache |
| **API data** | Network-only | Always fresh data required |

---

# PART 3 — Backend Performance

## 3.1 Express Request Lifecycle Optimization

### Current Request Flow

```
Client → Nginx → Express → Middleware Stack → Route Handler → Response
```

### Optimized Request Flow

```
Client → Nginx (TLS, compression, static) → Express → Optimized Middleware → Controller → Service → Repository → Prisma → PostgreSQL
```

### Middleware Ordering for Performance

Middleware execution order directly impacts performance. Order from fastest to slowest:

| Order | Middleware | Purpose | Avg Time |
|---|---|---|---|
| 1 | `helmet()` | Security headers (in-memory) | < 0.1ms |
| 2 | `cors()` | CORS headers (in-memory) | < 0.1ms |
| 3 | `express.json({ limit: '1mb' })` | Body parsing | < 0.5ms |
| 4 | `morgan('combined')` | Request logging | < 0.5ms |
| 5 | `rateLimit()` | Rate limiting (in-memory) | < 0.5ms |
| 6 | `authenticate` | JWT verification | < 1ms |
| 7 | `authorize(roles)` | RBAC check | < 0.5ms |
| 8 | Route handler | Business logic | Variable |

**Rule:** Middleware that rejects requests (rate limiter, auth) runs before middleware that processes requests (body parser, validator). This prevents wasted processing on unauthorized requests.

### Request Timing Middleware

Every request is timed for performance monitoring:

```
Request arrives
    ↓
Timer starts (t0)
    ↓
Middleware stack executes
    ↓
Route handler executes
    ↓
Response sent
    ↓
Timer ends (t1)
    ↓
Log: { method, path, status, duration, userId }
    ↓
If duration > 500ms → warn
If duration > 2000ms → error + alert
```

## 3.2 Middleware Optimization

### Body Parser Limits

| Endpoint Type | Max Body Size | Justification |
|---|---|---|
| **JSON API** | 1 MB | Text data only |
| **File upload** | 20 MB | Gallery images, PDFs |
| **Webhook** | 50 KB | Payment notifications |
| **AI chat** | 50 KB | Message content |

### Payload Size Optimization

| Strategy | When | Impact |
|---|---|---|
| **Response compression** | All text responses | 70-80% size reduction |
| **Field selection** | All list endpoints | 50-90% reduction vs `SELECT *` |
| **Pagination** | All list endpoints | Constant response size |
| **Sparse fieldsets** | Client specifies needed fields | Client-driven optimization |
| **Exclude large fields** | Lists exclude `description`, `notes` | 30-60% reduction |

## 3.3 Async Processing Strategy

### Synchronous vs Asynchronous Operations

| Operation | Current | Target | Justification |
|---|---|---|---|
| **Email sending** | Synchronous | Asynchronous (queue) | Email can fail; don't block response |
| **PDF generation** | Synchronous | Asynchronous (on-demand) | PDF takes 1-3s; generate in background |
| **File processing** | Synchronous | Asynchronous (queue) | Image resize takes 0.5-2s |
| **Audit logging** | Synchronous | Asynchronous (fire-and-forget) | Logging should never block response |
| **Notification dispatch** | Synchronous | Asynchronous (queue) | Multiple notification channels |
| **AI chat** | Synchronous | Streaming (SSE) | Progressive response |

### Background Job Strategy

| Job Type | Schedule | Priority | Concurrency |
|---|---|---|---|
| Auto-archive expired poojas | Every 5 min | Low | 1 |
| Auto-downgrade expired subscriptions | Daily 00:00 | Medium | 1 |
| Subscription renewal reminders | Daily 09:00 | Medium | 1 |
| Email queue processor | Every 30s | High | 3 |
| Image thumbnail generation | On upload | High | 2 |
| PDF receipt generation | On approval | Medium | 1 |
| Database cleanup (soft-deleted > 90 days) | Weekly | Low | 1 |
| Cache warming | Every 15 min | Low | 1 |
| Health check | Every 60s | High | 1 |

## 3.4 Streaming Responses

### Server-Sent Events (SSE)

Used for real-time features:

| Feature | Event Type | Frequency |
|---|---|---|
| AI chat responses | `ai.token`, `ai.done`, `ai.error` | Streaming (per token) |
| Booking status updates | `booking.status` | On change |
| Admin notifications | `admin.notification` | On event |
| Dashboard live data | `dashboard.update` | Every 30s |

### Streaming Best Practices

1. **Set headers immediately:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`
2. **Send heartbeat:** Every 30s to keep connection alive through proxies
3. **Handle disconnect:** Clean up resources when client disconnects
4. **Buffer events:** Batch events within 50ms window to reduce overhead
5. **Limit concurrent streams:** Max 100 concurrent SSE connections per server

### File Streaming

Large file downloads (receipts, exports, gallery originals) use streaming:

| File Type | Strategy | Buffer Size |
|---|---|---|
| PDF receipts | Stream from disk | 64 KB chunks |
| Excel exports | Stream from buffer | 64 KB chunks |
| Gallery originals | Stream with range support | 256 KB chunks |
| Backup downloads | Stream with progress | 256 KB chunks |

## 3.5 Connection Reuse

### Database Connection Pool

Prisma manages connection pooling. Configuration:

| Parameter | Value | Justification |
|---|---|---|
| `connection_limit` | 10 (dev), 20 (prod) | `2 * CPU cores + 1` for 4-core VPS |
| `pool_timeout` | 10s | Fail fast if pool exhausted |
| `idle_timeout` | 5s | Close idle connections |

### HTTP Connection Reuse

| Strategy | Implementation |
|---|---|
| **Keep-alive** | Express default (HTTP/1.1 keep-alive) |
| **HTTP/2** | Nginx terminates HTTP/2; communicates with Express via HTTP/1.1 |
| **Connection pooling** | PostgreSQL `pgBouncer` (future, for horizontal scaling) |

### External Service Connection Reuse

| Service | Connection Strategy |
|---|---|
| **SMTP** | Reuse Nodemailer transport (single connection, pooled) |
| **AI API** | HTTP agent with keep-alive |
| **OAuth** | HTTP agent with keep-alive |

## 3.6 Request Batching

### Batch API Endpoints

| Endpoint | Method | Purpose | Max Items |
|---|---|---|---|
| `POST /api/donations/batch-approve` | POST | Approve multiple donations | 50 |
| `POST /api/bookings/batch-approve` | POST | Approve multiple bookings | 50 |
| `POST /api/gallery/batch-delete` | POST | Delete multiple images | 100 |
| `POST /api/users/batch-update` | POST | Update multiple users | 100 |
| `POST /api/expenses/batch-create` | POST | Import expenses | 500 |

### Batch Processing Rules

1. **Transaction per batch:** Each batch runs in a single database transaction
2. **Partial success handling:** If 3 of 10 items fail, report which failed and which succeeded
3. **Progress feedback:** For batches > 100 items, use SSE to report progress
4. **Idempotency:** Batch operations are idempotent; running twice produces same result
5. **Size limit:** Maximum 500 items per batch to prevent long-running transactions

---

# PART 4 — Database Performance

## 4.1 Index Strategy

### Index Design Principles

| Principle | Description |
|---|---|
| **Index every foreign key** | All `_id` columns used in `WHERE` or `JOIN` |
| **Index status columns** | All enum/status fields used for filtering |
| **Index timestamps** | `createdAt`, `updatedAt` for sorting and range queries |
| **Composite indexes** | For queries filtering on multiple columns |
| **Partial indexes** | For queries that always filter on a condition (e.g., `WHERE deletedAt IS NULL`) |
| **Covering indexes** | For frequently accessed, small result sets |

### Index Categories

| Category | Tables | Index Type | Justification |
|---|---|---|---|
| **Primary keys** | All tables | B-tree (default) | UUID lookups |
| **Foreign keys** | All `_id` columns | B-tree | JOIN performance |
| **Status filters** | `status`, `paymentStatus`, `bookingStatus` | B-tree | Filter queries |
| **Date ranges** | `createdAt`, `startDate`, `endDate` | B-tree | Range queries, sorting |
| **Unique constraints** | `email`, `receiptNumber` | Unique B-tree | Duplicate prevention |
| **Composite** | `(userId, status)` | Composite B-tree | Common filter combinations |
| **Partial** | `WHERE deletedAt IS NULL` | Partial B-tree | Soft delete filtering |
| **Text search** | `name`, `description` | GIN (trigram) | Fuzzy search |

### Index Naming Convention

```
idx_{table}_{columns}
idx_donations_user_status    → (userId, status)
idx_bookings_created         → (createdAt)
idx_users_email_unique       → (email) UNIQUE
idx_poojas_active_partial    → WHERE deletedAt IS NULL AND isArchived = false
```

## 4.2 Query Optimization

### Common Query Patterns

| Pattern | Current (PocketBase) | Optimized (PostgreSQL) |
|---|---|---|
| **List with filter** | PB filter string → full scan | Indexed query → index scan |
| **Count** | `getFullList` + `.length` | `SELECT COUNT(*)` with index |
| **Aggregation** | Fetch all, compute in JS | SQL `GROUP BY` + aggregate functions |
| **Join** | Multiple queries + JS merge | Single query with `JOIN` |
| **Pagination** | Offset-based | Cursor-based (keyset) |

### Query Optimization Rules

1. **Use `SELECT` over `findMany` with includes:** Only fetch fields needed
2. **Avoid N+1:** Use `include` or `select` to fetch related data in one query
3. **Use `take` + `skip` for pagination:** Or cursor-based for large datasets
4. **Use `count` instead of fetching all:** For list counts
5. **Use `groupBy` for aggregations:** Don't fetch rows and aggregate in JS
6. **Use `upsert` for idempotent writes:** Avoid race conditions
7. **Use raw queries for complex analytics:** When Prisma query builder is insufficient

### Slow Query Detection

| Threshold | Action |
|---|---|
| < 50ms | Normal |
| 50-200ms | Log at debug level |
| 200-500ms | Log at warn level with query plan |
| 500ms-2s | Log at error level, alert developer |
| > 2s | Kill query, alert immediately |

## 4.3 Connection Pooling

### Prisma Connection Pool

```javascript
// DATABASE_URL with connection pool parameters
DATABASE_URL="postgresql://user:pass@localhost:5432/vinayagar?connection_limit=20&pool_timeout=10"
```

| Parameter | Dev | Production | Justification |
|---|---|---|---|
| `connection_limit` | 5 | 20 | `2 * CPU cores + 1` (4-core VPS) |
| `pool_timeout` | 10s | 10s | Fail fast if pool exhausted |
| `idle_timeout` | 5s | 5s | Release idle connections |

### Connection Pool Monitoring

| Metric | Alert Threshold | Action |
|---|---|---|
| Active connections | > 80% of limit | Investigate connection leaks |
| Waiting requests | > 0 for > 5s | Increase pool or optimize queries |
| Idle connections | > 50% of limit | Decrease pool size |

### PgBouncer Readiness

When horizontal scaling requires multiple API instances:

| Setting | Value |
|---|---|
| Pool mode | Transaction |
| Max client connections | 100 |
| Default pool size | 20 |
| Reserve pool size | 5 |
| Reserve pool timeout | 3s |

## 4.4 Transaction Optimization

### Transaction Boundaries

| Service Method | Transaction Scope | Justification |
|---|---|---|
| `BookingService.approve()` | Update booking + create temple_accounts entry | Atomicity |
| `SubscriptionService.create()` | Create subscription + pending_subscription | Atomicity |
| `DonationService.approve()` | Update donation + create temple_accounts entry | Atomicity |
| `PaymentService.approve()` | Update payment + create subscription + update user | Atomicity |

### Transaction Rules

1. **Keep transactions short:** < 500ms. Long transactions hold locks and block other transactions.
2. **Order operations:** Reads first, writes last. Read the data you need before starting the transaction.
3. **Use interactive transactions:** For complex business logic that spans multiple queries.
4. **Avoid deadlocks:** Always acquire locks in the same order (alphabetical by table name).
5. **Idempotent writes:** Use `upsert` or check-before-write to handle retries.
6. **No side effects in transactions:** Email, PDF, file operations happen AFTER commit.

### Deadlock Prevention

```
Transaction A: Lock table1 → Lock table2
Transaction B: Lock table1 → Lock table2  (same order → no deadlock)

Transaction A: Lock table1 → Lock table2
Transaction B: Lock table2 → Lock table1  (different order → deadlock possible)
```

**Rule:** All transactions lock tables in alphabetical order: `bookings` → `donations` → `expenses` → `payments` → `subscriptions` → `temple_accounts` → `users`.

## 4.5 Read/Write Patterns

### Read-Heavy Operations

| Operation | Frequency | Optimization |
|---|---|---|
| Public page data (poojas, festivals, gallery) | High (cacheable) | In-memory cache, 30-min TTL |
| Dashboard aggregations | Medium (admin only) | Materialized view, refresh every 5 min |
| User profile lookup | High (auth middleware) | JWT claims, no DB hit per request |
| List queries (donations, bookings) | Medium | Indexed, paginated |
| Search queries | Low-Medium | Trigram index, limit results |

### Write-Heavy Operations

| Operation | Frequency | Optimization |
|---|---|---|
| Audit log writes | High (every mutation) | Async, fire-and-forget |
| Email queue writes | Medium | Batch inserts |
| Notification writes | Medium | Batch inserts |
| Session/token writes | High (auth) | JWT (stateless, no writes) |

### Read/Write Ratio

Estimated overall ratio: **80:20** (80% reads, 20% writes)

| Domain | Read:Write | Justification |
|---|---|---|
| Public content | 95:5 | Mostly browsing |
| User dashboard | 70:30 | Some mutations |
| Admin operations | 50:50 | Approvals, edits |
| Background jobs | 30:70 | Processing queues |

## 4.6 Partitioning Readiness

### Current Approach (No Partitioning)

At current scale (estimated < 100K records per table), partitioning is unnecessary. However, the schema is designed for future partitioning:

| Table | Future Partition Key | Partition Type |
|---|---|---|
| `audit_logs` | `createdAt` | Range (monthly) |
| `integrated_ai_messages` | `createdAt` | Range (monthly) |
| `integrated_ai_images` | `createdAt` | Range (monthly) |
| `subscription_reminders` | `createdAt` | Range (monthly) |

### Partitioning Triggers

| Metric | Threshold | Action |
|---|---|---|
| Table row count | > 10 million | Consider range partitioning |
| Table size on disk | > 10 GB | Consider range partitioning |
| Query performance | P95 > 500ms | Consider partitioning |
| Index size | > 2 GB | Consider partitioning |

## 4.7 Database Maintenance Strategy

### Automated Maintenance

| Task | Frequency | Purpose |
|---|---|---|
| `VACUUM ANALYZE` | Daily 03:00 | Reclaim dead tuples, update statistics |
| `REINDEX` | Weekly (Sunday 04:00) | Rebuild fragmented indexes |
| Check table bloat | Weekly | Identify tables needing `VACUUM FULL` |
| Update pg_stat_statements | On restart | Reset query statistics |
| Backup verification | Weekly | Test restore from backup |

### Manual Maintenance

| Task | Frequency | Trigger |
|---|---|---|
| `VACUUM FULL` on bloated tables | Monthly | When bloat > 30% |
| Add new indexes | As needed | When queries are slow |
| Partition large tables | As needed | When row count > 10M |
| Statistics refresh | After bulk imports | `ANALYZE` on affected tables |

---

# PART 5 — Prisma Optimization

## 5.1 Query Selection (Select vs Include)

### When to Use `select`

Use `select` when you need specific fields and want to minimize data transfer:

| Scenario | Fields Needed | Strategy |
|---|---|---|
| List endpoint (table view) | id, name, status, createdAt | `select: { id: true, name: true, status: true, createdAt: true }` |
| Dropdown population | id, name | `select: { id: true, name: true }` |
| Search results | id, name, description (truncated) | `select` + SQL `SUBSTRING` |
| Count queries | none | `select: { id: true }` with `_count` |
| Auth middleware | id, email, role | `select: { id: true, email: true, role: true }` |

### When to Use `include`

Use `include` when you need the full related entity:

| Scenario | Relations Needed | Strategy |
|---|---|---|
| Detail page | User + Donations + Subscriptions | `include: { donations: true, subscriptions: true }` |
| Receipt generation | Booking + Pooja + User | `include: { pooja: true, user: true }` |
| Dashboard aggregation | Multiple related entities | `include` with `select` on each |

### Field Selection Rules

| Rule | Example |
|---|---|
| **Never use `findMany()` without select or pagination** | Always limit result set |
| **Exclude large fields in lists** | `exclude: { description: true, notes: true }` |
| **Exclude sensitive fields** | `exclude: { password: true, email: false }` |
| **Use `_count` for relation counts** | `include: { _count: { select: { donations: true } } }` |
| **Nested selects** | `include: { user: { select: { name: true, email: true } } }` |

## 5.2 N+1 Prevention

### N+1 Detection

The N+1 problem occurs when:
1. A query fetches N rows
2. For each row, an additional query is executed to fetch related data
3. Total queries = 1 + N

### Prevention Strategies

| Strategy | When | How |
|---|---|---|
| **`include`** | Related data needed for every row | Single query with JOIN |
| **`select` with nested** | Only specific fields from related | Single query with JOIN |
| **`findMany` with `where` IN** | Batch lookups by IDs | Single query with `WHERE id IN (...)` |
| **Prisma middleware** | Global N+1 prevention | Automatically batch relation loads |
| **DataLoader pattern** | Complex nested relations | Batch + cache within request |

### Common N+1 Scenarios

| Scenario | N+1 Query Count | Optimized Query Count |
|---|---|---|
| List 25 donations with user names | 26 queries (1 list + 25 user lookups) | 1 query with `include: { user: { select: { name: true } } }` |
| List 25 bookings with pooja names | 26 queries | 1 query with `include: { pooja: { select: { name: true } } }` |
| Dashboard with counts per status | 5 queries (1 per status) | 1 query with `groupBy` |
| List users with subscription status | 1 + N queries | 1 query with `include: { subscriptions: { where: { status: 'active' } } }` |

## 5.3 Bulk Operations

### Prisma Bulk Methods

| Method | Use Case | Performance |
|---|---|---|
| `createMany` | Insert multiple records | 10-50x faster than loop of `create` |
| `updateMany` | Update records matching condition | Single query, no select needed |
| `deleteMany` | Delete records matching condition | Single query |
| `upsert` | Insert or update (idempotent) | Prevents duplicates |
| `findFirst` with `update` | Select + update in one query | Reduces round trips |

### Bulk Operation Limits

| Operation | Max Batch Size | Strategy for Larger Sets |
|---|---|---|
| `createMany` | 500 records | Process in chunks of 500 |
| `updateMany` | Unlimited | Single query |
| `deleteMany` | Unlimited | Single query |
| `upsert` (many) | 500 records | Process in chunks of 500 |

### Batch Processing Pattern

```
For each chunk of 500 records:
    1. Begin transaction
    2. createMany(chunk)
    3. Commit transaction
    4. Report progress (every 10 chunks)
```

## 5.4 Transaction Patterns

### Interactive Transactions

For complex business logic requiring multiple queries:

```
prisma.$transaction(async (tx) => {
  // All operations use 'tx' instead of 'prisma'
  const booking = await tx.poojaBooking.findUnique({ where: { id: bookingId } })
  await tx.poojaBooking.update({ where: { id: bookingId }, data: { status: 'approved' } })
  await tx.templeAccount.create({ data: { ... } })
  // Side effects AFTER commit (outside transaction)
  await emailService.sendApproval(booking)
})
```

### Transaction Timeout

| Transaction Type | Timeout | Justification |
|---|---|---|
| Simple CRUD | 5s | Should be instant |
| Business workflow | 10s | Multiple operations |
| Bulk import | 30s | Many records |
| Migration | 300s | Large data volumes |

## 5.5 Pagination Strategies

### Offset-Based Pagination

For small datasets (< 10K records):

```
prisma.donation.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
})
```

**Pros:** Simple, supports random page access.
**Cons:** Slow for deep pages (OFFSET scans skipped rows).

### Cursor-Based Pagination

For large datasets or infinite scroll:

```
prisma.donation.findMany({
  take: pageSize,
  skip: 1,  // skip the cursor
  cursor: { id: lastSeenId },
  orderBy: { id: 'asc' },
})
```

**Pros:** Constant time regardless of page depth.
**Cons:** Cannot jump to arbitrary page.

### Hybrid Approach

| Endpoint | Strategy | Justification |
|---|---|---|
| Admin list views | Offset (page/limit) | Users expect page numbers |
| Infinite scroll feeds | Cursor-based | Smooth scrolling |
| Search results | Offset (limited to 10 pages) | Prevent deep pagination |
| API exports | Cursor-based streaming | Process all records |

## 5.6 Aggregation Optimization

### SQL Aggregations (Preferred)

Use Prisma's `groupBy` and `_count`/`_sum`/`_avg` instead of fetching rows and aggregating in JavaScript:

| Operation | JavaScript (Slow) | SQL Aggregation (Fast) |
|---|---|---|
| Count donations by status | `donations.filter(d => d.status === 'approved').length` | `groupBy({ by: ['status'], _count: true })` |
| Sum donations by month | Loop + accumulator | `groupBy({ by: ['createdAt'], _sum: { amount: true } })` |
| Average donation | `donations.reduce(sum) / count` | `_avg({ amount: true })` |
| Top donors | Sort in JS | `orderBy: { amount: 'desc' }, take: 10` |

### Dashboard Aggregation Strategy

| Dashboard Widget | Query Strategy | Cache TTL |
|---|---|---|
| Total donations this month | `_sum` + `_count` | 5 min |
| Donations by status | `groupBy` | 5 min |
| Active subscriptions count | `_count` with filter | 5 min |
| Pending approvals count | `_count` with filter | 5 min |
| Monthly revenue | `groupBy` by month | 1 hour |
| Top donors | `orderBy` + `take` | 1 hour |

---

# PART 6 — Caching Strategy

## 6.1 Browser Cache

### Static Assets

| Asset | Cache-Control | ETag | Last-Modified |
|---|---|---|---|
| Vite-hashed JS | `max-age=31536000, immutable` | No (hash in filename) | No |
| Vite-hashed CSS | `max-age=31536000, immutable` | No (hash in filename) | No |
| Fonts (WOFF2) | `max-age=31536000, immutable` | No (hash in filename) | No |
| Images (uploads) | `max-age=86400` | Yes | Yes |
| Favicon | `max-age=604800` | Yes | Yes |
| HTML shell | `no-cache` | Yes | Yes |

### Cache Invalidation Strategy

| Asset Type | Invalidation Method |
|---|---|
| **Hashed assets** | New hash = new URL = automatic invalidation |
| **Uploaded images** | URL changes on re-upload (UUID-based) |
| **HTML shell** | `no-cache` forces revalidation on every visit |
| **API data** | `no-store` prevents caching |

## 6.2 HTTP Cache Headers

### Nginx Cache Configuration

```nginx
# Vite-built assets (fingerprinted)
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Uploaded files
location /uploads/ {
    expires 1d;
    add_header Cache-Control "public";
    add_header Vary "Accept-Encoding";
}

# API responses (no cache)
location /hcgi/api/ {
    add_header Cache-Control "no-store";
}

# HTML shell (revalidate)
location / {
    add_header Cache-Control "no-cache";
}
```

### Conditional Requests

| Header | Purpose | Implementation |
|---|---|---|
| `ETag` | Content-based validation | Nginx generates ETag for static files |
| `Last-Modified` | Time-based validation | Nginx uses file mtime |
| `If-None-Match` | Return 304 if unchanged | Nginx handles automatically |
| `If-Modified-Since` | Return 304 if unchanged | Nginx handles automatically |

## 6.3 Server Cache

### In-Memory Cache (node-cache)

| Cache Key | TTL | Invalidation | Size Estimate |
|---|---|---|---|
| `poojas:active` | 30 min | On pooja create/update/archive | 5 KB |
| `festivals:active` | 60 min | On festival create/update | 10 KB |
| `gallery:categories` | 60 min | On category CRUD | 2 KB |
| `expense:categories` | 60 min | On category CRUD | 1 KB |
| `settings:payment_accounts` | 60 min | On account update | 1 KB |
| `settings:system` | 60 min | On settings update | 2 KB |
| `dashboard:{type}:{params}` | 5 min | On any mutation to related entities | 50 KB |
| `user:{id}:profile` | 10 min | On profile update | 2 KB |
| `subscription:{userId}:status` | 5 min | On subscription change | 1 KB |
| `search:{queryHash}` | 2 min | On any mutation to searchable entities | 100 KB |

### Cache Size Budget

| Category | Max Items | Max Memory |
|---|---|---|
| Reference data (poojas, festivals, settings) | 20 | 50 KB |
| Dashboard data | 10 | 200 KB |
| User-specific data | 500 | 500 KB |
| Search results | 100 | 2 MB |
| **Total** | **630** | **~3 MB** |

## 6.4 Application Cache

### Cache-Aside Pattern

```
Service.getCachedData(key):
  cached = cache.get(key)
  if cached !== undefined:
    return cached

  fresh = repository.find()
  cache.set(key, fresh, ttl)
  return fresh

Service.mutateData(key, data):
  repository.update(data)
  cache.delete(key)  // Invalidate
```

### Cache Warming

Cache warming runs on server start and periodically:

| Cache Key | Warm On | Strategy |
|---|---|---|
| `poojas:active` | Server start + every 30 min | Fetch from DB, set in cache |
| `festivals:active` | Server start + every 60 min | Fetch from DB, set in cache |
| `settings:payment_accounts` | Server start + every 60 min | Fetch from DB, set in cache |
| `gallery:categories` | Server start + every 60 min | Fetch from DB, set in cache |

### Cache Invalidation Events

| Event | Keys Invalidated |
|---|---|
| `pooja.created` | `poojas:active` |
| `pooja.updated` | `poojas:active`, `dashboard:*` |
| `pooja.archived` | `poojas:active`, `dashboard:*` |
| `festival.created` | `festivals:active` |
| `festival.updated` | `festivals:active` |
| `donation.approved` | `dashboard:*`, `user:{userId}:*` |
| `subscription.activated` | `dashboard:*`, `subscription:{userId}:*` |
| `gallery.imageuploaded` | `gallery:*`, `dashboard:*` |
| `settings.updated` | `settings:*` |
| `expense.created` | `dashboard:*`, `expense:categories` |

## 6.5 Future Redis Readiness

### Migration Path

| Phase | Backend | Use Case |
|---|---|---|
| **Now** | In-memory `Map` | All caching (single server) |
| **Later** | Redis | Distributed cache (multiple servers) |
| **Future** | Redis Cluster | High-availability cache |

### CacheService Interface

```javascript
class CacheService {
  async get(key) { /* ... */ }
  async set(key, value, ttlSeconds) { /* ... */ }
  async delete(key) { /* ... */ }
  async invalidatePattern(pattern) { /* ... */ }
  async flush() { /* ... */ }
  async has(key) { /* ... */ }
  async keys(pattern) { /* ... */ }
  async size() { /* ... */ }
}
```

The interface is identical regardless of backend. Swap by changing the implementation class.

### Redis-Specific Optimizations (Future)

| Feature | Benefit |
|---|---|
| **Pub/Sub** | Real-time cache invalidation across instances |
| **Lua scripts** | Atomic cache operations |
| **Sorted sets** | Rate limiting, leaderboards |
| **Bloom filter** | Efficient existence checks for search |
| **Session store** | Distributed session management |

## 6.6 Cache Invalidation Rules

### Invalidation Strategies

| Strategy | When | How |
|---|---|---|
| **TTL expiry** | All entries | Automatic expiration |
| **Write-through** | On entity mutation | Service deletes/updates cache after DB write |
| **Pattern invalidation** | Bulk mutations | `cache.invalidatePattern('dashboard:*')` |
| **Manual flush** | Admin action | `cache.flush()` |
| **Version invalidation** | Schema changes | Prefix all keys with version number |

### Consistency Model

The caching strategy prioritizes **availability over strong consistency**:

- Dashboard data may be up to 5 minutes stale → Acceptable for temple management
- Public content may be up to 30 minutes stale → Acceptable for static content
- User-specific data may be up to 5 minutes stale → Acceptable for profile data
- Financial data (donations, payments) → **Never cached for the user performing the action** (bypass cache on write)

## 6.7 TTL Strategy

| Data Type | TTL | Justification |
|---|---|---|
| **Public reference data** (poojas, festivals, settings) | 30-60 min | Changes rarely; staleness acceptable |
| **Gallery data** | 30 min | Changes on upload; staleness acceptable |
| **Dashboard aggregates** | 5 min | Changes on mutation; moderate staleness acceptable |
| **User profile** | 10 min | Changes occasionally; moderate staleness acceptable |
| **Subscription status** | 5 min | Changes on approval; moderate staleness acceptable |
| **Search results** | 2 min | Changes on any mutation; brief staleness acceptable |
| **Financial data** | 0 (no cache) | Must always be fresh for the acting user |
| **Auth data** | 0 (no cache) | Must always be fresh |

---

# PART 7 — Storage Performance

## 7.1 Upload Optimization

### Client-Side Processing

| Step | Technology | Purpose |
|---|---|---|
| 1. Resize | `browser-image-compression` | Max 2000px on longest side |
| 2. Compress | `browser-image-compression` | Max 2MB file size |
| 3. Convert | Client-side WebP check | WebP if browser supports it |
| 4. Preview | `URL.createObjectURL()` | Show preview before upload |
| 5. Upload | `XMLHttpRequest` with progress | Track upload progress |

### Server-Side Processing

| Step | Technology | Purpose |
|---|---|---|
| 1. Receive | `multer` (memory buffer) | Temporary storage |
| 2. Validate | File type + size check | Security |
| 3. Process | Sharp | Resize, convert, generate thumbnails |
| 4. Store | Filesystem write | Persist to `/uploads/` |
| 5. Cleanup | Remove temp buffer | Free memory |

### Upload Pipeline Timing

```
Client compression:    500-2000ms (depends on image size)
Upload (2MB over 4G):  1-3s
Server processing:     200-500ms (Sharp operations)
File write:            50-200ms
Response:              < 1ms
Total:                 2-5s per image
```

### Parallel Upload Strategy

For bulk uploads (admin gallery management):

| Strategy | Implementation |
|---|---|
| **Parallel uploads** | Upload 3 images concurrently (browser limit) |
| **Queue remaining** | Queue additional images, process as slots free |
| **Progress tracking** | SSE for real-time progress updates |
| **Partial failure handling** | Continue on failure, report failed items |

## 7.2 Download Optimization

### Image Serving

| Scenario | Strategy | Cache |
|---|---|---|
| Thumbnail grid | Serve 200px thumbnails | 1 day |
| Full-size view | Serve 600px-1200px on demand | 1 day |
| Original download | Stream from disk on demand | 1 hour |
| Receipt PDF | Stream from disk on demand | No cache |

### Range Requests

For large file downloads, support HTTP Range requests:

```
GET /uploads/gallery/{id}/original.webp
Range: bytes=0-1023

Response:
206 Partial Content
Content-Range: bytes 0-1023/5242880
Content-Length: 1024
```

This enables:
- Resumable downloads
- Video streaming (future)
- Partial file access

## 7.3 Image Resizing

### On-Demand Resize API

```
GET /api/images/{id}?width=800&quality=80&format=webp
```

| Parameter | Default | Range | Purpose |
|---|---|---|---|
| `width` | Original | 50-2000 | Resize to width (maintain aspect ratio) |
| `quality` | 80 | 1-100 | JPEG/WebP quality |
| `format` | webp | webp, jpeg, png | Output format |

### Resize Caching

Resized images are cached on disk to avoid re-processing:

```
/uploads/gallery/{id}/
├── originals/
│   └── {uuid}.webp
├── cache/
│   ├── w200.webp
│   ├── w400.webp
│   ├── w600.webp
│   ├── w1200.webp
│   └── w2000.webp
```

Cache invalidation: Delete cache directory when original is replaced.

## 7.4 Thumbnail Generation

### Pre-Generated Thumbnails

| Size | Dimensions | Use Case |
|---|---|---|
| `thumb` | 200x200 (crop) | Grid view, cards |
| `small` | 400px wide | Mobile gallery |
| `medium` | 600px wide | Desktop gallery |
| `large` | 1200px wide | Lightbox, detail view |

### Thumbnail Quality Settings

| Size | Format | Quality | Estimated Size |
|---|---|---|---|
| thumb (200px) | WebP | 75 | 5-15 KB |
| small (400px) | WebP | 80 | 15-40 KB |
| medium (600px) | WebP | 80 | 30-80 KB |
| large (1200px) | WebP | 85 | 80-200 KB |

## 7.5 File Organization

### Directory Structure

```
/uploads/
├── gallery/
│   └── {uuid}/
│       ├── originals/
│       │   └── {uuid}.webp
│       ├── thumbnails/
│       │   ├── thumb.webp
│       │   ├── small.webp
│       │   ├── medium.webp
│       │   └── large.webp
│       └── metadata.json
├── receipts/
│   └── {uuid}.pdf
├── exports/
│   └── {uuid}.xlsx
├── avatars/
│   └── {userId}.webp
└── temp/
    └── {uuid} (auto-cleanup after 1 hour)
```

### File Naming Rules

| Rule | Justification |
|---|---|
| UUID filenames | Prevent collision, hide original filename |
| WebP primary | Smaller than JPEG, supported by 97% browsers |
| JPEG fallback | For browsers without WebP support |
| Organized by type | Easy backup, cleanup, migration |

## 7.6 Archive Strategy

### File Archival Rules

| File Type | Active Period | Archive After | Archive Location |
|---|---|---|---|
| Gallery images | Forever | Never | `/uploads/gallery/` |
| Receipt PDFs | 7 years (legal) | 3 years | `/uploads/receipts/archive/` |
| Export files | 30 days | 30 days (delete) | — |
| Temp files | 1 hour | 1 hour (delete) | — |
| User avatars | Until replaced | On replacement (keep old) | `/uploads/avatars/archive/` |

---

# PART 8 — API Performance

## 8.1 Pagination

### Standard Pagination Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 25,
    "totalItems": 142,
    "totalPages": 6,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Pagination Parameters

| Parameter | Default | Range | Purpose |
|---|---|---|---|
| `page` | 1 | 1+ | Page number |
| `perPage` | 25 | 1-100 | Items per page |
| `sortBy` | `createdAt` | Any field | Sort field |
| `sortOrder` | `desc` | `asc`, `desc` | Sort direction |
| `cursor` | — | UUID | Cursor for keyset pagination |

### Pagination Rules

| Rule | Implementation |
|---|---|
| **Default page size** | 25 items |
| **Maximum page size** | 100 items (enforced server-side) |
| **Client can request less** | `perPage=10` is valid |
| **Client cannot request more** | `perPage=200` returns 100 |
| **Total count** | Always included (uses `COUNT(*)` with index) |
| **Empty results** | `{ "data": [], "pagination": { "totalItems": 0, ... } }` |

## 8.2 Filtering

### Filter Syntax

```
GET /api/donations?status=approved&userId={uuid}&minAmount=100&startDate=2026-01-01
```

### Filter Types

| Filter Type | Syntax | Example |
|---|---|---|
| **Exact match** | `?field=value` | `?status=approved` |
| **Multiple values** | `?field=val1,val2` | `?status=pending,approved` |
| **Range (min)** | `?minField=value` | `?minAmount=100` |
| **Range (max)** | `?maxField=value` | `?maxAmount=1000` |
| **Date range** | `?startField=date&endField=date` | `?startDate=2026-01-01&endDate=2026-12-31` |
| **Text search** | `?q=text` | `?q=vinayagar` |
| **Boolean** | `?field=true/false` | `?isDeleted=false` |

### Filter Implementation

| Endpoint | Supported Filters | Index Used |
|---|---|---|
| `GET /api/donations` | status, userId, minAmount, maxAmount, startDate, endDate | `idx_donations_user_status` |
| `GET /api/bookings` | bookingStatus, userId, poojaId, startDate, endDate | `idx_bookings_user_status` |
| `GET /api/payments` | status, userId, minAmount, maxAmount | `idx_payments_user_status` |
| `GET /api/users` | role, membershipTier, isVerified | `idx_users_role` |
| `GET /api/poojas` | isArchived, category, minPrice, maxPrice | `idx_poojas_active` |

## 8.3 Sorting

### Sort Parameters

| Parameter | Values | Default |
|---|---|---|
| `sortBy` | Any field name | `createdAt` |
| `sortOrder` | `asc`, `desc` | `desc` |

### Sort Rules

| Rule | Implementation |
|---|---|
| **Index-aligned sorting** | Sort by indexed columns for performance |
| **Consistent sort** | Always include `id` as tiebreaker |
| **No client-controlled sort on sensitive fields** | Admin-only sort by amount, email |
| **Full-text search sorting** | Sort by relevance score |

## 8.4 Compression

### Response Compression

| Content Type | Compression | Minimum Size |
|---|---|---|
| `application/json` | gzip (level 6) | 1 KB |
| `text/html` | gzip (level 6) | 1 KB |
| `text/css` | gzip (level 6) | 1 KB |
| `application/javascript` | gzip (level 6) | 1 KB |
| `image/svg+xml` | gzip (level 6) | 1 KB |
| `image/*` | No compression (already compressed) | — |
| `application/pdf` | No compression (already compressed) | — |

### Brotli Support

```nginx
# Nginx Brotli configuration
brotli on;
brotli_comp_level 6;
brotli_min_length 1024;
brotli_types
    application/json
    text/html
    text/css
    application/javascript
    image/svg+xml;
```

## 8.5 Response Size Optimization

### Response Size Budgets

| Endpoint Type | Max Response Size | Strategy |
|---|---|---|
| **List (25 items)** | 25 KB | Select fields, exclude large text |
| **List (100 items)** | 50 KB | Select fields, exclude large text |
| **Single resource** | 10 KB | Include only needed relations |
| **Dashboard** | 20 KB | Pre-aggregated, cached |
| **Search results** | 15 KB | Limited fields, highlighted snippets |
| **Error response** | 1 KB | Minimal error info |

### Response Field Optimization

| Strategy | Example | Savings |
|---|---|---|
| **Exclude large fields in lists** | Don't include `description`, `notes` in list view | 50-80% |
| **Truncate text fields** | `SUBSTRING(description, 1, 200)` | 60-90% |
| **Flatten nested objects** | `{ "userName": "..." }` instead of `{ "user": { "name": "..." } }` | 20-30% |
| **Omit null fields** | Don't include `receiptPdf: null` in response | 10-20% |

## 8.6 Rate Limiting

### Rate Limit Tiers

| Tier | Window | Max Requests | Scope | Response |
|---|---|---|---|---|
| **Global** | 5 min | 100 | Per IP | 429 + Retry-After header |
| **Auth** | 15 min | 10 | Per IP | 429 + Retry-After header |
| **AI** | 1 min | 10 | Per user | 429 + Retry-After header |
| **File upload** | 1 min | 5 | Per user | 429 + Retry-After header |
| **Admin** | 1 min | 200 | Per user | 429 + Retry-After header |
| **Public read** | 1 min | 60 | Per IP | 429 + Retry-After header |

### Rate Limit Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 45
  }
}
```

## 8.7 Batch Endpoints

### Batch Operation Design

| Endpoint | Method | Purpose | Max Items | Idempotent |
|---|---|---|---|---|
| `POST /api/donations/batch-approve` | POST | Approve multiple donations | 50 | Yes |
| `POST /api/bookings/batch-approve` | POST | Approve multiple bookings | 50 | Yes |
| `POST /api/gallery/batch-delete` | POST | Delete multiple images | 100 | Yes |
| `POST /api/users/batch-update` | POST | Update multiple users | 100 | Yes |
| `POST /api/expenses/batch-create` | POST | Import expenses | 500 | Yes |
| `POST /api/poojas/batch-archive` | POST | Archive multiple poojas | 50 | Yes |

### Batch Response Format

```json
{
  "success": true,
  "data": {
    "processed": 48,
    "failed": 2,
    "errors": [
      { "index": 12, "id": "abc-123", "error": "Donation already approved" },
      { "index": 35, "id": "def-456", "error": "Donation not found" }
    ]
  }
}
```

---

# PART 9 — Scalability Strategy

## 9.1 Vertical Scaling

### Hostinger VPS Upgrade Path

| Tier | CPU | RAM | Disk | Cost/Month | When |
|---|---|---|---|---|---|
| **Current** | 2 vCPU | 4 GB | 40 GB SSD | ~$15 | Initial deployment |
| **Step 1** | 4 vCPU | 8 GB | 80 GB SSD | ~$25 | When P95 > 500ms |
| **Step 2** | 6 vCPU | 16 GB | 160 GB SSD | ~$40 | When P95 > 1s after Step 1 |
| **Step 3** | 8 vCPU | 32 GB | 320 GB SSD | ~$60 | When P95 > 1s after Step 2 |

### Vertical Scaling Indicators

| Metric | Threshold | Action |
|---|---|---|
| CPU usage | > 80% sustained (7 days) | Upgrade CPU |
| Memory usage | > 85% sustained (7 days) | Upgrade RAM |
| Disk usage | > 80% | Upgrade disk |
| Response time P95 | > 500ms sustained | Upgrade CPU + RAM |
| Database connections | > 80% of limit | Increase `connection_limit` |

## 9.2 Horizontal Scaling Readiness

### Stateless Architecture

The API is stateless by design:

| State | Storage | Shared |
|---|---|---|
| User session | JWT token (client-side) | No |
| Request context | Request-scoped (per-request) | No |
| Cache | In-memory (per-instance) | No |
| Background jobs | In-process (per-instance) | No |

For horizontal scaling, the following must be addressed:

| Component | Current | Horizontal Scale |
|---|---|---|
| **Cache** | In-memory `Map` | Redis (shared across instances) |
| **Background jobs** | `node-cron` in-process | Dedicated worker processes |
| **File storage** | Local filesystem | Shared filesystem (NFS) or S3 |
| **Sessions** | JWT (already stateless) | No change needed |

### Load Balancer Readiness

```
                    ┌──────────────────┐
                    │   Load Balancer  │
                    │   (Nginx/NLB)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  API Instance│ │  API Instance│ │  API Instance│
     │  (Node.js)   │ │  (Node.js)   │ │  (Node.js)   │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼─────────┐
                    │    PostgreSQL     │
                    │  (single write)   │
                    └──────────────────┘
```

## 9.3 Stateless Services

### Service State Analysis

| Service | State | Stateless |
|---|---|---|
| `AuthService` | None (JWT) | Yes |
| `UserService` | None | Yes |
| `BookingService` | None | Yes |
| `DonationService` | None | Yes |
| `SubscriptionService` | None | Yes |
| `PaymentService` | None | Yes |
| `NotificationService` | None (async) | Yes |
| `EmailService` | None (async) | Yes |
| `CacheService` | In-memory cache | **No** (per-instance) |
| `BackgroundJobService` | In-process cron | **No** (per-instance) |

### Making CacheService Horizontal-Scale Ready

```javascript
// Current: In-memory
class InMemoryCacheService { /* ... */ }

// Future: Redis-backed
class RedisCacheService {
  constructor(redisClient) {
    this.redis = redisClient;
  }
  // Same interface, different implementation
}

// Factory pattern
function createCacheService() {
  if (process.env.FEATURE_REDIS_CACHE === 'true') {
    return new RedisCacheService(redisClient);
  }
  return new InMemoryCacheService();
}
```

## 9.4 Background Workers

### Worker Process Architecture

| Process | PM2 Instances | Purpose |
|---|---|---|
| **API Server** | 1 (scales to 2-4) | HTTP requests |
| **Background Worker** | 1 | Cron jobs, email queue, cleanup |
| **Thumbnail Worker** | 1 | Image processing |

### Worker Isolation

```
┌─────────────────────────────────────────┐
│              PM2 Cluster                 │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │  API Server  │  │  API Server  │    │
│  │  (Port 3001) │  │  (Port 3002) │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │  Worker      │  │  Thumbnail   │    │
│  │  (Cron/Jobs) │  │  Worker      │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  PostgreSQL (single instance)    │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 9.5 Queue Readiness

### Current: In-Process EventEmitter

```
ServiceA.emit('event.name', data)
ServiceB.on('event.name', handler)
```

### Future: Redis Streams

```
ServiceA.xAdd('events', { type: 'event.name', data: JSON.stringify(data) })
ServiceB.xRead('events', { count: 10, block: 5000 })
```

### Queue Migration Path

| Phase | Technology | Use Case |
|---|---|---|
| **Now** | In-process EventEmitter | All events |
| **Later** | Redis Streams | Distributed event processing |
| **Future** | RabbitMQ / SQS | Enterprise message queue |

### Queue-Ready Event System

```javascript
// EventDispatcher interface (same for all backends)
class EventDispatcher {
  async emit(eventType, data) { /* ... */ }
  async on(eventType, handler) { /* ... */ }
  async off(eventType, handler) { /* ... */ }
}
```

The interface is identical regardless of backend. Swap by changing the implementation.

## 9.6 Multi-Server Readiness

### Prerequisites for Multi-Server

| Requirement | Current | Needed |
|---|---|---|
| Shared file storage | Local filesystem | NFS or S3 |
| Shared cache | In-memory | Redis |
| Shared sessions | JWT (already shared) | No change |
| Shared job queue | In-process cron | Redis-backed queue |
| Database | Single PostgreSQL | PostgreSQL (single is fine) |
| Load balancer | Nginx (single) | Nginx with upstream |

### File Storage for Multi-Server

| Option | Complexity | Cost | Performance |
|---|---|---|---|
| **NFS** | Low | Low | Moderate (network latency) |
| **S3-compatible** | Medium | Moderate | High (CDN-backed) |
| **DRBD** | High | Low | High (block-level replication) |

---

# PART 10 — Performance Monitoring

## 10.1 Response Time Metrics

### HTTP Response Time Tracking

| Metric | Source | Alert Threshold |
|---|---|---|
| TTFB (Time to First Byte) | Nginx access log | > 200ms |
| Total response time | Express middleware | > 1s |
| P50 response time | Aggregated | > 200ms |
| P95 response time | Aggregated | > 500ms |
| P99 response time | Aggregated | > 2s |

### Endpoint-Level Monitoring

| Endpoint Category | Expected P95 | Alert |
|---|---|---|
| Health check | < 10ms | > 50ms |
| Public reads (poojas, festivals) | < 50ms | > 200ms |
| Auth endpoints | < 100ms | > 500ms |
| CRUD operations | < 100ms | > 500ms |
| Dashboard queries | < 200ms | > 1s |
| File uploads | < 5s | > 15s |
| AI streaming | < 1s (first token) | > 3s |

## 10.2 Slow Query Detection

### pg_stat_statements Configuration

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query performance view
SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries averaging > 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Slow Query Thresholds

| Metric | Threshold | Action |
|---|---|---|
| Query time | > 100ms | Log at debug |
| Query time | > 500ms | Log at warn, analyze plan |
| Query time | > 2s | Log at error, alert |
| Sequential scan on large table | Any | Add index |
| Missing index hint | Any | Add index |
| Lock wait | > 5s | Investigate |

### Query Plan Analysis

For slow queries, capture and analyze the execution plan:

```
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT ... FROM donations WHERE userId = '...' AND status = 'approved';
```

Key indicators:
- **Seq Scan:** Missing index (if table > 10K rows)
- **Nested Loop with high row count:** N+1 or missing JOIN index
- **Sort without index:** Add index on sort column
- **Hash Join with high memory:** Increase work_mem or optimize query

## 10.3 Memory Monitoring

### Node.js Memory Metrics

| Metric | Source | Alert Threshold |
|---|---|---|
| Heap used | `process.memoryUsage().heapUsed` | > 500 MB |
| Heap total | `process.memoryUsage().heapTotal` | > 1 GB |
| RSS (Resident Set Size) | `process.memoryUsage().rss` | > 1 GB |
| External memory | `process.memoryUsage().external` | > 100 MB |
| Array buffers | `process.memoryUsage().arrayBuffers` | > 50 MB |

### Memory Monitoring Schedule

| Metric | Collection Interval | Alert |
|---|---|---|
| Heap usage | Every 30s | > 80% of available |
| RSS | Every 60s | > 1 GB |
| GC pause time | Every GC event | > 100ms |
| External memory | Every 60s | > 100 MB |

### Memory Leak Detection

| Indicator | Action |
|---|---|
| Heap usage consistently increasing | Heap dump + analysis |
| RSS growing without request increase | Check for event listener leaks |
| External memory growing | Check for Buffer/FileHandle leaks |
| GC frequency increasing | Check for excessive object allocation |

## 10.4 CPU Monitoring

### CPU Metrics

| Metric | Source | Alert Threshold |
|---|---|---|
| CPU usage (user) | `os.cpus()` | > 80% sustained (5 min) |
| CPU usage (system) | `os.cpus()` | > 50% sustained (5 min) |
| Event loop lag | `perf_hooks.monitorEventLoopDelay` | > 100ms |
| Event loop utilization | `perf_hooks.eventLoopUtilization` | > 90% |

### CPU-Intensive Operations

| Operation | Expected CPU | Optimization |
|---|---|---|
| JSON parsing | Low | Limit body size |
| Image processing (Sharp) | High | Offload to worker process |
| PDF generation | Medium | Offload to worker process |
| Excel export | Medium | Stream instead of buffer |
| AI streaming | Low (I/O bound) | No optimization needed |
| Database queries | Low (I/O bound) | Optimize queries, not CPU |

## 10.5 Database Monitoring

### PostgreSQL Metrics

| Metric | Source | Alert Threshold |
|---|---|---|
| Active connections | `pg_stat_activity` | > 80% of `max_connections` |
| Idle connections | `pg_stat_activity` | > 50% of `max_connections` |
| Cache hit ratio | `pg_stat_database` | < 99% |
| Transactions per second | `pg_stat_database` | > 1000 |
| Deadlocks | `pg_stat_database` | > 0 |
| Table bloat | `pg_stat_user_tables` | > 30% |
| Index usage | `pg_stat_user_indexes` | < 90% |

### Database Health Queries

```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Cache hit ratio
SELECT
    sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) * 100 AS cache_hit_ratio
FROM pg_stat_database;

-- Slow queries (last hour)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE last_exec_time > now() - interval '1 hour'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

## 10.6 Throughput Metrics

### Request Throughput

| Metric | Source | Target |
|---|---|---|
| Requests per second | Nginx access log | > 100 |
| Requests per minute | Aggregated | > 5000 |
| Concurrent connections | Nginx | < 200 |
| Active WebSocket/SSE connections | Express | < 100 |

### Database Throughput

| Metric | Source | Target |
|---|---|---|
| Queries per second | `pg_stat_statements` | < 500 |
| Transactions per second | `pg_stat_database` | < 200 |
| Rows read per second | `pg_stat_user_tables` | Monitor trend |
| Rows written per second | `pg_stat_user_tables` | Monitor trend |

## 10.7 Capacity Alerts

### Alert Thresholds

| Metric | Warning (70%) | Critical (85%) | Emergency (95%) |
|---|---|---|---|
| CPU usage | 70% for 5 min | 85% for 5 min | 95% for 1 min |
| Memory usage | 70% for 5 min | 85% for 5 min | 95% for 1 min |
| Disk usage | 70% | 85% | 95% |
| DB connections | 70% of limit | 85% of limit | 95% of limit |
| Response time P95 | > 500ms for 15 min | > 1s for 15 min | > 2s for 5 min |
| Error rate | > 1% for 15 min | > 5% for 5 min | > 10% for 1 min |

### Alert Channels

| Severity | Channel | Response |
|---|---|---|
| Warning | Log entry | Review within 24 hours |
| Critical | Log entry + email | Review within 4 hours |
| Emergency | Log entry + email + SMS (future) | Immediate response |

---

# PART 11 — Load & Capacity Planning

## 11.1 Concurrent Users

### User Distribution Estimates

| User Type | Average Concurrent | Peak Concurrent | Peak Timing |
|---|---|---|---|
| **Anonymous visitors** | 5 | 50 | Festivals, events |
| **Free members** | 3 | 20 | Evenings, weekends |
| **Premium members** | 1 | 10 | Evenings, weekends |
| **Admins** | 1 | 4 | Business hours |
| **Total** | **10** | **84** | Festival days |

### Peak Traffic Scenarios

| Scenario | Expected Load | Justification |
|---|---|---|
| **Normal day** | 10 concurrent, 100 req/min | Regular browsing |
| **Festival announcement** | 50 concurrent, 500 req/min | Social media sharing |
| **Donation drive** | 30 concurrent, 300 req/min | Email campaign |
| **New pooja booking** | 40 concurrent, 400 req/min | Limited slots |
| **Admin bulk operations** | 4 concurrent, 200 req/min | Batch approvals |

## 11.2 Peak Traffic

### Traffic Patterns

| Time Period | Expected Load | Justification |
|---|---|---|
| **Weekday morning** | Low (5-10 concurrent) | Working hours |
| **Weekday evening** | Medium (15-25 concurrent) | After work browsing |
| **Weekend morning** | Medium (20-30 concurrent) | Temple visits |
| **Weekend evening** | High (30-50 concurrent) | Planning for week |
| **Festival days** | Very High (50-100 concurrent) | Special events |
| **Donation campaigns** | High (30-50 concurrent) | Email/social media |

### Peak Capacity Targets

| Metric | Normal | Peak | Emergency |
|---|---|---|---|
| Concurrent users | 10 | 100 | 200 |
| Requests/second | 10 | 100 | 200 |
| Database connections | 5 | 20 | 30 |
| Memory usage | 200 MB | 500 MB | 1 GB |
| Response time P95 | < 100ms | < 500ms | < 2s |

## 11.3 Database Growth

### Record Growth Projections

| Table | Current Est. | Year 1 | Year 3 | Year 5 |
|---|---|---|---|---|
| `users` | 100 | 500 | 2,000 | 5,000 |
| `donations` | 500 | 3,000 | 15,000 | 40,000 |
| `pooja_bookings` | 200 | 1,500 | 8,000 | 20,000 |
| `subscriptions` | 50 | 300 | 1,500 | 4,000 |
| `payments` | 100 | 1,000 | 5,000 | 15,000 |
| `temple_accounts` | 300 | 2,000 | 10,000 | 30,000 |
| `expenses` | 100 | 500 | 2,500 | 7,000 |
| `gallery` | 200 | 1,000 | 5,000 | 12,000 |
| `audit_logs` | 1,000 | 10,000 | 50,000 | 150,000 |
| `ai_messages` | 500 | 5,000 | 25,000 | 75,000 |

### Database Size Projections

| Table Category | Year 1 | Year 3 | Year 5 |
|---|---|---|---|
| Core data (users, bookings, etc.) | 50 MB | 250 MB | 750 MB |
| Financial data (donations, payments, etc.) | 30 MB | 150 MB | 500 MB |
| Content (gallery metadata, festivals) | 20 MB | 100 MB | 300 MB |
| Audit logs | 100 MB | 500 MB | 1.5 GB |
| AI data (messages, images) | 50 MB | 250 MB | 750 MB |
| **Total** | **250 MB** | **1.25 GB** | **3.8 GB** |

## 11.4 File Storage Growth

### Storage Growth Projections

| File Type | Avg Size | Year 1 | Year 3 | Year 5 |
|---|---|---|---|---|
| Gallery images (originals) | 500 KB | 500 MB | 2.5 GB | 6 GB |
| Gallery thumbnails | 50 KB | 50 MB | 250 MB | 600 MB |
| Receipt PDFs | 100 KB | 100 MB | 500 MB | 1.5 GB |
| User avatars | 50 KB | 5 MB | 25 MB | 75 MB |
| Export files (temp) | 200 KB | 10 MB | 50 MB | 150 MB |
| **Total** | | **665 MB** | **3.3 GB** | **8.3 GB** |

### Disk Space Planning

| Component | Year 1 | Year 3 | Year 5 |
|---|---|---|---|
| Application code | 100 MB | 150 MB | 200 MB |
| Node modules | 500 MB | 600 MB | 700 MB |
| Database | 250 MB | 1.25 GB | 3.8 GB |
| File storage | 665 MB | 3.3 GB | 8.3 GB |
| Logs | 500 MB | 1.5 GB | 3 GB |
| Backups | 1 GB | 3 GB | 8 GB |
| **Total** | **3 GB** | **9.8 GB** | **24 GB** |

## 11.5 Backup Growth

### Backup Size Projections

| Backup Type | Year 1 | Year 3 | Year 5 |
|---|---|---|---|
| Database dump (compressed) | 50 MB | 250 MB | 750 MB |
| File uploads (compressed) | 200 MB | 1 GB | 2.5 GB |
| Application code | 50 MB | 50 MB | 50 MB |
| Configuration | 1 MB | 1 MB | 1 MB |
| **Daily total** | **301 MB** | **1.3 GB** | **3.3 GB** |
| **Monthly total** | **9 GB** | **39 GB** | **99 GB** |

### Backup Retention

| Backup Type | Retention | Storage Needed (Year 1) |
|---|---|---|
| Daily database dumps | 30 days | 1.5 GB |
| Weekly file backups | 8 weeks | 1.6 GB |
| Monthly full backups | 12 months | 3.6 GB |
| **Total** | | **6.7 GB** |

## 11.6 Network Usage

### Bandwidth Projections

| Traffic Type | Avg Size | Daily Volume | Daily Bandwidth |
|---|---|---|---|
| API responses (JSON) | 5 KB | 10,000 requests | 50 MB |
| Static assets (JS/CSS) | 50 KB | 5,000 loads | 250 MB |
| Images (gallery) | 100 KB | 2,000 views | 200 MB |
| File uploads | 1 MB | 50 uploads | 50 MB |
| Receipt downloads | 100 KB | 20 downloads | 2 MB |
| **Daily total** | | | **552 MB** |
| **Monthly total** | | | **16.5 GB** |

### Bandwidth Alerts

| Metric | Threshold | Action |
|---|---|---|
| Daily bandwidth | > 5 GB | Investigate unusual traffic |
| Monthly bandwidth | > 100 GB | Review hosting plan |
| Upload bandwidth | > 1 GB/day | Check for abuse |

## 11.7 Scaling Thresholds

### Decision Matrix

| Metric | Green | Yellow | Red | Action |
|---|---|---|---|---|
| CPU (avg over 7 days) | < 50% | 50-80% | > 80% | Upgrade VPS |
| Memory (avg over 7 days) | < 60% | 60-85% | > 85% | Upgrade VPS |
| Disk usage | < 70% | 70-85% | > 85% | Upgrade disk or cleanup |
| DB connections | < 50% | 50-80% | > 80% | Increase pool or upgrade |
| Response time P95 | < 200ms | 200-500ms | > 500ms | Optimize or upgrade |
| Error rate | < 0.1% | 0.1-1% | > 1% | Investigate |
| Queue depth | < 10 | 10-100 | > 100 | Scale workers |

### Scaling Roadmap

| Phase | Trigger | Action | Cost Impact |
|---|---|---|---|
| **Phase 0** | Launch | 2 vCPU, 4 GB RAM | $15/month |
| **Phase 1** | CPU > 70% avg | Upgrade to 4 vCPU, 8 GB | $25/month |
| **Phase 2** | CPU > 70% after Phase 1 | Add Redis, optimize queries | $35/month |
| **Phase 3** | CPU > 70% after Phase 2 | Upgrade to 6 vCPU, 16 GB | $45/month |
| **Phase 4** | CPU > 70% after Phase 3 | Horizontal scaling (2 instances) | $60/month |
| **Phase 5** | CPU > 70% after Phase 4 | Upgrade to 8 vCPU, 32 GB | $70/month |

---

# PART 12 — Master Performance Blueprint

## 12.1 Performance Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PERFORMANCE ARCHITECTURE                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    CLIENT LAYER                                  │   │
│  │  • Lazy-loaded routes (68 pages)                                 │   │
│  │  • Code-split chunks (vendor, features, pages)                   │   │
│  │  • Responsive images (WebP, srcset)                              │   │
│  │  • Browser caching (immutable assets, 1-year)                    │   │
│  │  • Font optimization (preloaded, swap)                           │   │
│  │  • Gzip/Brotli compression (Nginx)                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    NGINX LAYER                                   │   │
│  │  • TLS termination (HTTP/2)                                     │   │
│  │  • Static file serving (cached)                                  │   │
│  │  • Gzip/Brotli compression                                      │   │
│  │  • Rate limiting (per IP)                                        │   │
│  │  • Security headers                                             │   │
│  │  • API reverse proxy                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    EXPRESS LAYER                                 │   │
│  │  • Optimized middleware ordering                                 │   │
│  │  • JWT authentication (stateless)                                │   │
│  │  • RBAC authorization                                           │   │
│  │  • Request validation (Zod)                                      │   │
│  │  • Response compression                                         │   │
│  │  • Request timing                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    SERVICE LAYER                                  │   │
│  │  • Business logic (27 services)                                  │   │
│  │  • Transaction management (27 transactional methods)             │   │
│  │  • In-memory caching (CacheService)                              │   │
│  │  • Background jobs (CronService)                                 │   │
│  │  • Event-driven invalidation                                    │   │
│  │  • Async processing (email, PDF, thumbnails)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    REPOSITORY LAYER                              │   │
│  │  • Optimized queries (select, include)                           │   │
│  │  • N+1 prevention (eager loading)                                │   │
│  │  • Pagination (cursor + offset)                                  │   │
│  │  • Bulk operations (createMany, updateMany)                      │   │
│  │  • Index-aligned queries                                        │   │
│  │  • Soft delete filtering                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    DATABASE LAYER                                │   │
│  │  • PostgreSQL 15+                                               │   │
│  │  • Prisma ORM (parameterized queries)                            │   │
│  │  • Connection pooling (20 connections)                            │   │
│  │  • Index strategy (B-tree, GIN, partial)                         │   │
│  │  • Query optimization (EXPLAIN ANALYZE)                          │   │
│  │  • pg_stat_statements monitoring                                 │   │
│  │  • Automated maintenance (VACUUM, REINDEX)                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MONITORING LAYER                               │   │
│  │  • Response time metrics (P50, P95, P99)                         │   │
│  │  • Slow query detection                                         │   │
│  │  • Memory monitoring                                            │   │
│  │  • CPU monitoring                                               │   │
│  │  • Database monitoring                                          │   │
│  │  • Capacity alerts (70%, 85%, 95%)                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 12.2 Optimization Priorities

| Priority | Optimization | Impact | Effort | Phase |
|---|---|---|---|---|
| **1** | Database indexes | High | Low | Pre-launch |
| **2** | Response compression (gzip/Brotli) | High | Low | Pre-launch |
| **3** | Pagination on all list endpoints | High | Medium | Pre-launch |
| **4** | In-memory caching (reference data) | High | Medium | Pre-launch |
| **5** | Image optimization (WebP, thumbnails) | Medium | Medium | Pre-launch |
| **6** | Code splitting (vendor chunks) | Medium | Low | Pre-launch |
| **7** | Field selection (select vs include) | Medium | Medium | Pre-launch |
| **8** | N+1 prevention | High | Medium | Pre-launch |
| **9** | Browser caching headers | Medium | Low | Pre-launch |
| **10** | Font optimization | Low | Low | Pre-launch |
| **11** | Background job optimization | Medium | Medium | Post-launch |
| **12** | Dashboard materialized views | Medium | High | Post-launch |
| **13** | Redis caching | Medium | High | When scaling needed |
| **14** | Horizontal scaling | High | High | When vertical maxed |
| **15** | CDN integration | Medium | Medium | When global traffic grows |

## 12.3 Scaling Roadmap

```
LAUNCH (Phase 0)
├── 2 vCPU, 4 GB RAM, 40 GB SSD
├── Single Express instance
├── In-memory caching
├── Local file storage
├── Target: 10 concurrent users
│
├── MONTH 1-3: MONITOR
│   ├── Track all metrics
│   ├── Establish baselines
│   └── Identify bottlenecks
│
├── MONTH 3-6: OPTIMIZE
│   ├── Optimize slow queries
│   ├── Add missing indexes
│   ├── Tune cache TTLs
│   └── Optimize image pipeline
│
SCALING STEP 1 (When CPU > 70% avg)
├── 4 vCPU, 8 GB RAM, 80 GB SSD
├── Still single instance
├── Target: 25 concurrent users
│
├── MONTH 6-12: SCALE
│   ├── Add Redis caching
│   ├── Separate worker processes
│   ├── Optimize database queries
│   └── Add connection pooling
│
SCALING STEP 2 (When CPU > 70% after Step 1)
├── 6 vCPU, 16 GB RAM, 160 GB SSD
├── Multiple PM2 instances (2)
├── Target: 50 concurrent users
│
├── YEAR 2: HORIZONTAL SCALE
│   ├── Add load balancer
│   ├── Shared Redis cache
│   ├── Shared file storage (NFS/S3)
│   ├── Separate worker processes
│   └── Target: 100 concurrent users
│
SCALING STEP 3 (When CPU > 70% after Step 2)
├── 8 vCPU, 32 GB RAM, 320 GB SSD
├── Multiple API instances (4)
├── Target: 200 concurrent users
│
└── YEAR 3+: OPTIMIZE
    ├── Database partitioning
    ├── CDN integration
    ├── Microservice extraction (if needed)
    └── Multi-region (if needed)
```

## 12.4 Operational Recommendations

### Pre-Launch Checklist

- [ ] All database indexes created
- [ ] Response compression enabled (gzip + Brotli)
- [ ] Browser caching headers configured
- [ ] Image optimization pipeline (Sharp) implemented
- [ ] In-memory cache service implemented
- [ ] Cache warming on server start
- [ ] Rate limiting configured
- [ ] Request timing middleware
- [ ] Slow query logging enabled
- [ ] pg_stat_statements enabled
- [ ] Automated VACUUM configured
- [ ] Backup automation tested
- [ ] Health check endpoint verified
- [ ] PM2 configuration optimized
- [ ] Nginx configuration tuned

### Post-Launch Monitoring

| Frequency | Task |
|---|---|
| **Daily** | Review response time trends, error rates |
| **Weekly** | Review slow queries, cache hit ratios, disk usage |
| **Monthly** | Review capacity metrics, scaling thresholds, backup integrity |
| **Quarterly** | Performance audit, index review, query optimization |

### Performance Review Process

1. **Collect:** Gather metrics from all monitoring sources
2. **Analyze:** Identify trends, anomalies, bottlenecks
3. **Prioritize:** Rank issues by impact and effort
4. **Implement:** Address top-priority issues
5. **Verify:** Confirm improvement through metrics
6. **Document:** Record decisions and outcomes

---

## Appendix A: Performance Metrics Summary

| Category | Metric | Target | Measurement |
|---|---|---|---|
| **Frontend** | LCP | < 2.5s | Lighthouse |
| **Frontend** | FID | < 100ms | Field data |
| **Frontend** | CLS | < 0.1 | Lighthouse |
| **Frontend** | TBT | < 300ms | Lighthouse |
| **Frontend** | Bundle size (initial) | < 200KB gzipped | Vite build |
| **Backend** | TTFB | < 200ms | Server logging |
| **Backend** | P95 response time | < 500ms | Monitoring |
| **Backend** | Error rate | < 0.1% | Monitoring |
| **Database** | Query P95 | < 100ms | pg_stat_statements |
| **Database** | Cache hit ratio | > 99% | pg_stat_database |
| **Database** | Connection utilization | < 80% | pg_stat_activity |
| **Storage** | Upload time (2MB) | < 5s | Server timing |
| **Storage** | Image serve time | < 100ms | Nginx access log |
| **System** | CPU usage | < 70% avg | OS monitoring |
| **System** | Memory usage | < 80% | OS monitoring |
| **System** | Disk usage | < 70% | OS monitoring |

## Appendix B: Performance Testing Strategy

| Test Type | Tool | Frequency | Target |
|---|---|---|---|
| **Lighthouse audit** | Lighthouse CI | Every build | Score > 90 |
| **Load testing** | k6 / Artillery | Pre-launch + monthly | 100 concurrent users |
| **Stress testing** | k6 / Artillery | Pre-launch | 200 concurrent users |
| **Database benchmarking** | pgbench | Pre-launch | TPS > 100 |
| **File upload testing** | Custom script | Pre-launch | 10 concurrent uploads |
| **Memory leak testing** | Clinic.js | Pre-launch | No leaks over 1 hour |
| **Query performance testing** | pg_stat_statements | Weekly | P95 < 100ms |

---

**End of Performance & Scalability Architecture Blueprint**
