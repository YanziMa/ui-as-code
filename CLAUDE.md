# UI-as-Code — Project Control File

## Project Goal
让任何用户能用自然语言修改任意 SaaS 界面，AI 生成代码 diff，用户预览后提交为 PR。

## Tech Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS v4
- **Extension**: Plasmo (Manifest V3) + React 19
- **AI**: GLM-5V-Turbo (OpenAI-compatible), supports multimodal
- **Database**: Supabase (PostgreSQL + Auth)
- **Deploy**: Vercel (web) + Chrome Web Store (extension)
- **Monorepo**: pnpm workspace + Turborepo

## Repository Structure
```
ui-as-code/
├── packages/
│   ├── shared/       # TypeScript types (not used by web due to Vercel)
│   ├── web/          # Next.js app → deploys to ui-as-code-web.vercel.app
│   └── extension/    # Plasmo Chrome extension → build/chrome-mv3-prod/
├── supabase/migrations/
└── CLAUDE.md         # This file
```

## Branch Strategy
- `main` → Production (auto-deploys to Vercel Production)
- `dev` → Development (auto-deploys to Vercel Preview)
- All dev work happens on `dev`, verified → merge to `main`
- Current: switch to `dev` for development work

## Build Commands
```bash
# Web
cd packages/web && npx next build          # verify locally
cd packages/web && pnpm install            # install deps

# Extension
cd packages/extension && npx plasmo build  # builds to build/chrome-mv3-prod/

# Git push uses proxy
export HTTPS_PROXY=http://127.0.0.1:7890
```

## Known Constraints & Gotchas
1. **Vercel can't resolve workspace deps** → web package has NO @ui-as-code/shared dependency, types copied to web/src/types/
2. **Supabase client crashes at build time without env vars** → use placeholder values in supabase.ts
3. **Zod v4 API differences**:
   - `z.record(z.unknown())` → `z.record(z.string(), z.unknown())`
   - `z.enum()` options: `{ required_error }` → `{ message }`
   - `.errors` → `.issues`
   - `useRef<T>()` needs default: `useRef<T | undefined>(undefined)`
4. **icon.ts in app/ directory** gets treated as route → don't put files named icon.ts there
5. **supabase.raw() doesn't exist** in new Supabase JS client → use read-modify-write pattern
6. **pnpm-lock.yaml from monorepo root breaks Vercel** → must regenerate clean lockfile in packages/web/
7. **screenshot_base64 can be null** → validation schema must accept null/nullable
8. **Git push needs proxy** on this machine → always use HTTPS_PROXY=http://127.0.0.1:7890

## Autonomous Rules
### I CAN decide without asking:
- Fix build errors (TypeScript, lint, etc.)
- Fix runtime bugs based on error messages
- Add missing imports, fix types
- Regenerate lockfiles
- Push code fixes to dev or main branch
- Create new component/page files
- Update existing code for improvements
- Commit and push progress

### I MUST ask user:
- When need to pay money / create accounts
- When need credentials / API keys / passwords
- When need to access external services that require login
- When making architectural changes that affect the whole project direction
- When stuck on same error 3+ times with no progress

### Error Self-Healing Pattern:
1. Build fails → Read error message → Identify root cause → Fix → Rebuild (max 5 retries)
2. Git push fails with network → Retry with proxy
3. Vercel deploy fails → Check logs → Fix → Push empty commit to trigger redeploy
4. Same error 3 times → Log to error-patterns.md → Skip task → Move to next

## Task Execution Flow Per Task:
1. Read current state of relevant files
2. Write/modify code
3. Run local build verification (next build or plasmo build)
4. If build fails → diagnose → fix → retry build
5. git add + commit + push (with proxy)
6. Update roadmap.md with status
7. Move to next task
