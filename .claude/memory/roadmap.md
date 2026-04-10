# UI-as-Code Roadmap — Complete Task List

## Status Legend
- [x] Done
- [~] In Progress
- [ ] Todo
- [!] Blocked (needs user action)

---

## Phase 0: Infrastructure & Autonomy Setup
- [x] Create CLAUDE.md project control file
- [ ] Create error-patterns.md knowledge base
- [ ] Switch to dev branch for development

## Phase 1: Core Pipeline — End-to-End Verification
- [ ] TASK-001: Verify AI API key works end-to-end (generate-diff API)
- [ ] TASK-002: Fix any issues blocking AI diff generation
- [ ] TASK-003: Full pipeline test: extension → API → diff response → preview display
- [ ] TASK-004: Verify Adopt flow: create friction + PR in Supabase
- [ ] TASK-005: Verify Reject flow: record friction in Supabase
- [ ] TASK-006: Verify Vote + Merge on PR Dashboard updates database

## Phase 2: Auth Flow
- [ ] TASK-011: Configure Supabase OAuth providers (GitHub/Google) — [!] NEEDS USER
- [ ] TASK-012: Test login flow from web app
- [ ] TASK-013: Protect API routes that require auth
- [ ] TASK-014: Show user-specific data in Dashboard after login

## Phase 3: Extension Polish
- [ ] TASK-021: Test on multiple SaaS sites (GitHub, Notion, etc.)
- [ ] TASK-022: Improve non-React page fallback detection
- [ ] TASK-023: Add keyboard shortcut hint tooltip on first use
- [ ] TASK-024: Add loading state for screenshot capture
- [ ] TASK-025: Handle edge cases: iframes, shadow DOM, SVG elements
- [ ] TASK-026: Improve panel UI: add component code preview tab
- [ ] TASK-027: Add "copy diff" button in review step
- [ ] TASK-028: Extension settings persistence improvement

## Phase 4: Web App Enhancement
- [ ] TASK-031: Landing page — add animated demo GIF/video section
- [ ] TASK-032: Landing page — add FAQ section
- [ ] TASK-033: Dashboard — show real stats from Supabase
- [ ] TASK-034: Dashboard — add submission history with pagination
- [ ] TASK-035: PR Dashboard — add search/filter by SaaS name
- [ ] TASK-036: PR Dashboard — add detail modal for each PR
- [ ] TASK-037: Add dark mode toggle (persist to localStorage)
- [ ] TASK-038: Add responsive mobile menu test and fix
- [ ] TASK-039: Add 404 page
- [ ] TASK-040: Add loading.tsx (route-level loading states)

## Phase 5: Data & Analytics
- [ ] TASK-051: Top Frictions page — visualize with charts
- [ ] TASK-052: Add analytics dashboard (submissions over time, top SaaS)
- [ ] TASK-053: Export frictions data as CSV

## Phase 6: Production Hardening
- [ ] TASK-061: Add rate limiting storage (Redis or better in-memory)
- [ ] TASK-062: Add request logging middleware
- [ ] TASK-063: Add CORS configuration
- [ ] TASK-064: Add health check endpoint GET /api/health
- [ ] TASK-065: Add OpenAPI/Swagger docs for API routes
- [ ] TASK-066: Error monitoring (sentry or custom)
- [ ] TASK-067: Performance: optimize bundle size, lazy load components

## Phase 7: Polish & Ship
- [ ] TASK-071: Write comprehensive README update
- [ ] TASK-072: Add CONTRIBUTING.md
- [ ] TASK-073: Add LICENSE file
- [ ] TASK-074: Final cross-browser testing notes
- [ ] TASK-075: Chrome Web Store listing prep (screenshots, description)

---
## Session Log

### 2026-04-10 Session Start
- Completed: CLAUDE.md creation
- Current focus: Phase 1 — Core Pipeline E2E Verification
- Next: Switch to dev branch → verify AI API works
