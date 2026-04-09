# UI-as-Code

> Fix your SaaS UI in 30 minutes. No code required.

**UI-as-Code** lets you modify any SaaS interface with natural language. AI generates the code diff, you preview it in a sandbox, and if you like it — submit as a PR that can benefit everyone with the same pain point.

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser Extension  │ ──▶ │  Next.js Web App  │ ──▶ │  Supabase DB    │
│  (Plasmo + React)   │     │  (Vercel)        │     │  (PostgreSQL)   │
│                     │     │                  │     │                 │
│  • Inspector Overlay│     │  • Landing Page  │     │  • users        │
│  • React Detector   │     │  • Dashboard     │     │  • frictions    │
│  • Screenshot      │     │  • PR Dashboard  │     │  • diffs         │
│  • Side Panel       │     │  • API Routes    │     │  • pull_requests │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
                                      │
                                      ▼
                              ┌──────────────────┐
                              │  GLM-5V-Turbo API │
                              │  (AI Diff Gen)    │
                              └──────────────────┘
```

## Monorepo Structure

```
ui-as-code/
├── packages/
│   ├── shared/          # TypeScript type definitions
│   ├── web/             # Next.js app (Landing + Dashboard + API)
│   └── extension/       # Plasmo browser extension
├── supabase/migrations/ # Database schema
└── turbo.json           # Build orchestration
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10+

### Development

```bash
# Install dependencies
pnpm install

# Run web app (http://localhost:3000)
cd packages/web && pnpm dev

# Run extension (loads in Chrome)
cd packages/extension && pnpm dev
```

### Environment Variables

Copy `packages/web/.env.example` to `packages/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
AI_PROVIDER=glm
AI_MODEL=glm-5v-turbo
AI_API_KEY=your-glm-api-key
```

## How It Works

1. **Select** — Hold `Alt` + click any element on a SaaS page
2. **Describe** — Type what you want changed (e.g., "Make the title font larger")
3. **Generate** — AI analyzes the component code + screenshot, outputs a unified diff
4. **Preview** — See before/after in a split-screen or overlay view
5. **Submit** — Adopt → auto-submits as PR; Reject → records pain point for analytics

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4 |
| Browser Ext | Plasmo, Manifest V3 |
| AI | GLM-5V-Turbo (OpenAI-compatible), supports vision |
| Database | Supabase (PostgreSQL) |
| Deploy | Vercel (web), Chrome Web Store (extension) |
| Monorepo | pnpm workspace, Turborepo |

## License

MIT
