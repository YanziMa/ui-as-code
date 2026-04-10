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
- Zod validation, rate limiting, auth middleware
- ErrorBoundary, Toast, Skeleton components
- SEO meta, favicon, sitemap, robots.txt
- Vercel deployment + GitHub repo
