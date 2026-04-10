# UI-as-Code Roadmap — Complete Task List

## Status Legend
- [x] Done
- [~] In Progress / Partial
- [ ] Todo
- [!] Blocked (needs user action)

---

## Phase 0: Infrastructure & Autonomy Setup
- [x] Create CLAUDE.md project control file
- [x] Create error-patterns.md knowledge base
- [x] Switch to dev branch for development
- [x] Establish autonomous execution loop (build → commit → push → verify)

## Phase 1: Core Pipeline — End-to-End Verification
- [x] TASK-001: Fix screenshot_base64 null validation (sanitize in API route)
- [x] TASK-002: Add health check endpoint GET /api/health
- [ ] TASK-003: Full pipeline test: extension → API → diff response → preview display (! needs AI key)
- [ ] TASK-004: Verify Adopt flow: create friction + PR in Supabase (! needs AI key)
- [ ] TASK-005: Verify Reject flow: record friction in Supabase (! needs AI key)
- [ ] TASK-006: Verify Vote + Merge on PR Dashboard updates database

## Phase 2: Auth Flow
- [!] TASK-011: Configure Supabase OAuth providers (GitHub/Google) — NEEDS USER
- [x] TASK-012: Improve auth callback route (better error handling, placeholder safe)
- [ ] TASK-013: Protect API routes that require auth (code written, needs OAuth config)
- [ ] TASK-014: Show user-specific data in Dashboard after login

## Phase 3: Extension Polish
- [x] TASK-021: Extension builds successfully on Plasmo
- [x] TASK-022: React detector handles Memo/ForwardRef, non-React fallback
- [x] TASK-023: Error banners + success toasts in inspector panel
- [x] TASK-024: Timeout handling for all background script fetch calls
- [x] TASK-025: Diff syntax highlighting in review step (GitHub Dark theme)
- [x] TASK-026: URL badge showing current hostname in panel
- [x] TASK-027: Copy Diff button in review step
- [x] TASK-028: Back to edit button (Step 2 → Step 1)
- [x] TASK-029: Character counter for description input
- [x] TASK-030: Line count display in diff viewer

## Phase 4: Web App Enhancement
- [x] TASK-031: Landing page overhaul — gradient hero, social proof, CTA buttons
- [x] TASK-032: Landing page — FAQ section (6 questions, accordion style)
- [x] TASK-033: Dashboard — 6 stat cards, Top Pain Points, Quick Actions
- [x] TASK-034: Dashboard — relative time formatting, live data from /api/frictions/top
- [x] TASK-035: PR Dashboard — search bar + text filtering
- [x] TASK-036: Navbar — smooth scroll anchors, mobile hamburger menu
- [x] TASK-037: Dark mode toggle (light/dark/system, persisted)
- [x] TASK-038: AuthButton redesign — avatar, icons, connecting state
- [x] TASK-039: Custom 404 page
- [x] TASK-040: Route-level loading.tsx skeleton state
- [x] TASK-041: Footer component with copyright + links
- [x] TASK-042: Supported SaaS logos section on landing

## Phase 5: Data & Analytics
- [x] TASK-051: GET /api/frictions/top endpoint (grouped by saas+component)
- [ ] TASK-052: Add analytics dashboard (submissions over time) — TODO
- [ ] TASK-053: Export frictions data as CSV — TODO

## Phase 6: Production Hardening
- [x] TASK-061: Zod input validation on all POST routes
- [x] TASK-062: Rate limiting middleware (per-IP, configurable windows)
- [x] TASK-063: CORS middleware for all /api/* routes
- [x] TASK-064: Health check endpoint GET /api/health (DB latency check)
- [ ] TASK-065: OpenAPI/Swagger docs for API routes — TODO
- [ ] TASK-066: Error monitoring setup — TODO
- [ ] TASK-067: Performance optimization (lazy loading) — TODO

## Phase 7: Polish & Ship
- [x] TASK-071: Comprehensive README with architecture diagram
- [ ] TASK-072: CONTRIBUTING.md — TODO
- [ ] TASK-073: LICENSE file (MIT) — TODO
- [ ] TASK-074: Chrome Web Store listing prep — TODO
- [ ] TASK-075: OG image / favicon / manifest / sitemap / robots.txt — DONE

---

## Session Logs

### 2026-04-10 Session (Autonomous Development Batches)
**Batch 1** (commit 1ca40bf):
- FAQ section (6 accordion Q&As)
- Dark mode toggle (light/dark/system)
- ThemeToggle component with localStorage persistence
- Navbar: ThemeToggle + FAQ link + mobile improvements
- AuthButton: user avatar, GitHub/Google SVG icons
- PR Dashboard: search bar + text filtering
- Health check API endpoint
- Custom 404 page
- Route-level loading skeleton
- screenshot_base64 null sanitization in generate-diff API

**Batch 2** (commit bf731f3):
- Dashboard complete overhaul:
  - 6 stat cards (submissions, PRs, merged, open, votes, SaaS sites)
  - Top Pain Points section with ranking badges
  - Relative time formatting
  - Quick Actions panel
  - Live data from /api/frictions/top
- Extension popup redesign:
  - Gradient header, connection status badge
  - Live stats (PR count + friction count)
  - Refresh button
  - Better saved/error states

**Batch 3** (commit 01a60f3):
- Copy Diff button (clipboard API)
- Back to edit button (Step 2 → Step 1)
- Character counter for description input (2000 max)
- Line count display in diff viewer
- CSS fix: flat selector for label-count class

**Batch 4** (commit 32a7a94):
- CORS middleware for all /api/* routes
- CORS utility module with origin allowlist
- CORS headers on all API responses
- OPTIONS preflight handling
- Auth callback route improvement (error handling, placeholder safe)

### Previous Session (2026-04-09):
- Full monorepo scaffold
- Next.js web app with all pages
- Plasmo browser extension
- Unified diff parser
- Sandbox preview (split/overlay/diff modes)

### 2026-04-10 Session 2 (Autonomous Batches 7-12)

**Batch 7** (commit 288897f):
- Accessibility polish: skip-to-content link, focus-visible, scrollbar styling
- globals.css: ::selection, :focus-visible outline, custom scrollbar, overflow-y:overlay
- layout.tsx: skip-link a11y class, id="main-content" on main

**Batch 8** (commit 2ed2ae2):
- Error logging system: error-logger.ts with global handlers
- ErrorMonitor client component (window.onerror, unhandledrejection)
- ErrorBoundary integration with logError()
- CSV export endpoint: GET /api/frictions/export
- Dashboard Quick Actions: Export Data button (4-column grid)
- AI prompt improvement: 10 strict rules for generate-diff
- Cache-Control headers on GET API routes (stale-while-revalidate)
- apiSuccess() extended with optional cacheControl param

**Batch 9** (commit f6e9e47):
- ActivityChart component (lightweight CSS bar chart, zero dependencies)
- Dashboard: 14-day activity chart with daily submission counts
- Extension popup: improved instructions with workflow description

**Batch 10** (commit 5fd8273):
- PR Dashboard: sort dropdown (newest/votes/affected)
- PR Dashboard: "Vote Against" button alongside "Vote For"
- PR Dashboard: useMemo for filtered+sorted list
- API Docs page (/api-docs): full REST API reference
  - All 10 endpoints documented with method/path/body/response
  - Quick Start curl examples, Error responses table
- Navbar + Footer + Sitemap: API Docs links added

**Batch 11** (commit 075fd6b):
- Landing page: "Why UI-as-Code?" differentiators section (3 cards)
- Chrome Web Store listing prep: STORE_LISTING.md
  - Full metadata: name, descriptions, categories, permissions, screenshots guide

**Batch 12** (commit 0ad121f):
- Enhanced 404 page: emoji overlay, quick nav links (Home/Dashboard/PR/API Docs)
- GitHub issue link for bug reports
- Roadmap update with all session logs

### 2026-04-10 Session 3 (Autonomous Batches 13-16)

**Batch 13** (commit 6c8646c):
- Changelog page (/changelog) with release history v0.1.0 → v0.2.0
- Color-coded item types (feature/improvement/fix)
- Enhanced /api/health: endpoint list, env info, version 0.2.0

**Batch 14** (commit a192890):
- BackToTop floating button component (appears after 400px scroll)
- PR card copy-link button (clipboard API with checkmark feedback)
- Relative timestamps on PR cards (formatRelativeTime helper)

**Batch 15** (commit bb8826d):
- Privacy Policy page (/privacy) — data collection, AI processing, user rights
- Terms of Service page (/terms) — 9 sections covering all legal bases
- Required for Chrome Web Store compliance
- Footer links: Privacy + Terms added

**Batch 16** (commit ac7da4b):
- GET /api/stats endpoint (public, cached) — aggregated platform stats
- Landing page stats bar (SaaS sites, APIs, code lines, possibilities)
- Total: 19 routes, 12 API endpoints, 8 static pages

---

## Production Merges
- **Merge 1**: main ← dev (after Batch 12) — commit a7aeccb
- **Merge 2**: main ← dev (after Batch 15) — commit 0918b73
- **Merge 3**: main ← dev (after Batch 16) — commit ac7da4b
- **Merge 4**: main ← dev (after Batch 27) — commit 4149273 (2401 lines)

### 2026-04-10 Session 4 (Autonomous Batches 22-29)

**Batch 22** (commit ef905c7):
- Fix redirects/page.tsx: convert to dynamic [slug]/page.tsx with proper Next.js 16 params
- Fix webhook route: z.record() → z.record(string, unknown) for Zod v4
- Fix Supabase upsert onConflict syntax (options object format)
- Include robots.txt and sitemap updates

**Batch 23** (commit 9644ff6):
- OpenAPI 3.1 spec (openapi.json): full 13-endpoint documentation
- GET /api/openapi endpoint serving spec with proper MIME type
- Enhanced CONTRIBUTING.md: env vars, tech stack table, error patterns, testing checklist
- Total: 21 routes, 14 API endpoints

**Batch 24** (commit 02a7280):
- /analytics page: overview stats, PR status breakdown, top frictions with progress bars
- lib/performance.ts: Core Web Vitals observer (LCP, CLS, FID, TTFB), markRender()
- ErrorMonitor enhanced: now observes web vitals alongside error handlers
- Analytics link added to navbar + sitemap
- Total: 25 routes

**Batch 25** (commit ebb427a):
- Status page: 9 endpoint checks (was 7), 30-day uptime bar visualization
- Incident history section, improved latency color thresholds
- Quick links to Analytics, Changelog, GitHub Issues

**Batch 26** (commit 3851e06):
- Shared types package major expansion:
  - WebhookEvent, SearchInput/Output, VoteType, PlatformStats, HealthCheckResponse
  - RateLimitInfo, PaginatedResponse, enhanced ExtensionMessage types
  - REDIRECT_SLUGS constant map, AI_RULES (10 rules), SUPPORTED_SAAS (15 products)
- API middleware: getRateLimitHeaders(), rate limit headers on all responses

**Batch 27** (commit 6b6b26e):
- Rename middleware.ts → proxy.ts (Next.js 16 deprecation fix)
- /analytics/loading.tsx skeleton state
- Extension inspector: Retry button on error banners

**Batch 28** (commit f47fd33):
- app/error.tsx: custom error boundary with retry, error digest, links to GitHub/status

**Batch 29** (commit 2cf475f):
- lib/api-logger.ts: dev-only API request logging (ring buffer, sanitized paths)
- Extension popup v0.2.0: Quick Actions grid (Dashboard, PRs, API Docs, etc.)

### Current State (after Batch 29)
- **Total routes**: 25 (12 static + 13 dynamic/API)
- **API endpoints**: 14 (health, stats, openapi, generate-diff, frictions×3,
  pull-requests, pr/vote, pr/merge, search, export, webhook, auth/callback)
- **Static pages**: /, /dashboard, /pr, /api-docs, /changelog, /status,
  /privacy, /terms, /analytics, /not-found, /error, /sitemap.xml
- **Total code**: ~4000+ lines across web + extension + shared packages
- **Production merges**: 4 (main branch fully up to date through Batch 27)

**Batch 30** (commit 8c56990):
- GET/POST /api/debug endpoint (dev-only, 403 in production)
- Returns: environment info, feature flags, recent 20 API logs, memory usage
- POST clears API log ring buffer
- Extension background script: structured bgLog() logging, switch-based message
  routing, MESSAGE_TYPES constants, unknown type fallback

**Batch 31** (commit f83cc2a):
- Security headers on API proxy: X-Content-Type-Options, X-Frame-Options,
  X-XSS-Protection, Referrer-Policy, Permissions-Policy
- Extension build verified clean (Plasmo v0.90.5, Chrome MV3)

**Batch 32** (commit b66afcf):
- Enhanced next.config.ts: reactStrictMode, turbopack root, image optimization
  (AVIF/WebP), security headers (HSTS), redirects (/home, /help),
  package import optimization, fetch logging
- /getting-started page: 4-step guide with code blocks, troubleshooting FAQ,
  CTA to Dashboard + API Docs

**Batch 33** (commit 3d49197):
- "Guide" link added to navbar + footer → /getting-started
- /getting-started/loading.tsx skeleton state

### Final State (after Batch 33, Session 4 Complete)
- **Total routes**: 28 (15 static + 13 dynamic/API)
- **API endpoints**: 15 (health, stats, openapi, debug, generate-diff,
  frictions×3, pull-requests, pr/vote, pr/merge, search, export,
  webhook, auth/callback)
- **Static pages**: /, /dashboard, /pr, /api-docs, /changelog, /status,
  /privacy, /terms, /analytics, /getting-started, /not-found, /error,
  /sitemap.xml
- **Extension**: Builds clean (Plasmo), v0.2.0, popup with quick actions grid
- **Shared types**: Comprehensive (Webhook, Search, Vote, Stats, Health, etc.)
- **Total code**: ~5000+ lines across web + extension + shared packages
- **Production merges**: 6 (main branch fully up to date through Batch 33)
