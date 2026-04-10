# Contributing to UI-as-Code

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

### Prerequisites

- **Node.js** 20+ and **pnpm** 9+
- **Supabase** account (free tier)
- **AI API key** (Claude/OpenAI-compatible)

### Clone & Install

```bash
git clone https://github.com/YanziMa/ui-as-code.git
cd ui-as-code
pnpm install
```

### Environment Variables

Copy the example env file:

```bash
cp packages/web/.env.local.example packages/web/.env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `AI_API_KEY` | AI provider API key |
| `AI_API_BASE` | AI API base URL (optional) |
| `AI_MODEL` | Model identifier (default: `claude-sonnet-4-20250514`) |
| `WEBHOOK_SECRET` | Webhook signature secret (optional) |

### Running Locally

```bash
# Start web app on localhost:3000
pnpm --filter web dev

# Build extension
pnpm --filter extension build

# Watch extension in development
pnpm --filter extension dev
```

## Project Structure

```
ui-as-code/
├── packages/
│   ├── shared/       # Shared TypeScript types & utilities
│   ├── web/          # Next.js 16 app (landing, dashboard, API routes)
│   └── extension/    # Plasmo Chrome extension (MV3)
├── supabase/migrations/
├── turbo.json        # Turborepo build orchestration
└── pnpm-workspace.yaml
```

## Tech Stack Details

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| React | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + shadcn/ui | v4 |
| Validation | Zod | v4 |
| Extension | Plasmo (Manifest V3) | latest |
| Database | Supabase (PostgreSQL) | — |
| AI | Claude / OpenAI-compatible | — |
| Build | Turbopack + Turborepo | — |

## Branch Strategy

- `main` — Production code (auto-deploys to Vercel)
- `dev` — Development work
- All development happens on `dev`, merge to `main` when ready

## Making Changes

1. Create a branch from `dev`:
   ```bash
   git checkout -b feat/your-feature-name dev
   ```

2. Make your changes, build locally:
   ```bash
   cd packages/web && npx next build
   cd packages/extension && pnpm build
   ```

3. Commit with a clear message:
   ```bash
   git commit -m "feat: describe your change"
   ```

4. Push to your fork and open a PR against `dev`.

## Code Style & Conventions

### TypeScript

- Strict mode enabled (`strict: true`)
- Prefer `const` over `let`, avoid `var`
- **Zod v4 specifics**: `z.record(z.string(), z.unknown())` (requires 2 args), `z.enum([...], {message: "..."})`
- **React 19**: `useRef<T>(undefined)` needs default value; `useState<string>` rejects null

### Next.js 16 (App Router)

- Server Components by default — add `"use client"` only when needed
- Route segment configs use string format: `export const dynamic = "force-static"`
- Dynamic route params are Promises: `params: Promise<{ slug: string }>`
- Avoid HTML entities in JSX (`&rarr;`, `>`) — use string concatenation or Unicode escapes

### CSS / Styling

- Tailwind CSS v4 (no tailwind.config.js needed)
- shadcn/ui components for consistency
- Dark mode via CSS custom properties + `class` strategy

### API Routes

- Use `withHandler()` wrapper from `@/lib/api-middleware`
- Validate with `validateBody()` + Zod schemas
- Return `apiSuccess()` or `apiError()` helpers
- Rate limiting via `{ rateLimit: { windowMs, maxRequests } }` option

### Commits

Conventional commits format: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| `z.record()` type error | Use `z.record(z.string(), z.unknown())` — Zod v4 requires 2 args |
| `useRef<T>()` error | Provide default: `useRef<T \| undefined>(undefined)` |
| Turbopack parse error | Remove HTML entities from JSX; use `"text" + var` concatenation |
| `onConflict` not found | Supabase v2: `.upsert(data, { onConflict: "col" })` |
| Route config error | Use string: `export const dynamic = "force-static"` |
| Missing `default` export | Every page.tsx needs a default export function/component |

## Testing Your Changes

Before submitting a PR, verify:

1. **Web build passes**: `cd packages/web && npx next build`
2. **Extension builds**: `cd packages/extension && pnpm build`
3. **No TypeScript errors** in build output
4. **API endpoints work**: Test with curl or the API Docs page

## Areas That Need Help

We especially welcome contributions to:

- **Extension compatibility**: Test inspector on more SaaS sites (Notion, Linear, Figma, HubSpot, Salesforce...)
- **AI prompt engineering**: Improve diff generation quality for edge cases
- **Internationalization**: i18n support for non-English users
- **Accessibility**: WCAG 2.1 AA compliance improvements
- **Documentation**: Examples, tutorials, video demos
- **Performance**: Lazy loading, bundle size optimization
- **OpenAPI/Swagger**: Keep spec in sync with API changes

## Questions?

Open an issue on [GitHub](https://github.com/YanziMa/ui-as-code/issues) or start a discussion.
