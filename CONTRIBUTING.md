# Contributing to UI-as-Code

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/YanziMa/ui-as-code.git
cd ui-as-code

# Install dependencies
pnpm install

# Start development
cd packages/web && pnpm dev
cd packages/extension && pnpm dev
```

## Project Structure

```
ui-as-code/
├── packages/
│   ├── web/          # Next.js app (port 3000)
│   ├── extension/    # Plasmo Chrome extension
│   └── shared/       # Shared TypeScript types
├── supabase/migrations/
└── turbo.json
```

## Branch Strategy

- `main` — Production code (auto-deploys to Vercel)
- `dev` — Development work (auto-deploys to Vercel Preview)
- All development happens on `dev`, merge to `main` when ready

## Making Changes

1. Create a branch from `dev`:
   ```bash
   git checkout -b feat/your-feature-name dev
   ```

2. Make your changes, build locally:
   ```bash
   cd packages/web && pnpm next build
   cd packages/extension && pnpm plasmo build
   ```

3. Commit with a clear message:
   ```bash
   git commit -m "feat: describe your change"
   ```

4. Push to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```

5. Open a Pull Request against the `dev` branch

## Code Style

- **TypeScript** for all new files
- **Tailwind CSS** for styling (no inline styles in web app)
- **Components**: functional components preferred, class components only when needed
- **API Routes**: use Zod validation + api-middleware wrappers
- **Commits**: conventional commits (`feat:`, `fix:`, `chore:`)

## Areas That Need Help

We especially welcome contributions to:

- **Extension compatibility**: Test on more SaaS sites (Notion, Linear, Figma...)
- **AI prompt engineering**: Improve diff generation quality
- **Internationalization**: i18n support
- **Accessibility**: WCAG 2.1 compliance
- **Documentation**: Examples, tutorials, API docs

## Questions?

Open an issue on GitHub or reach out to maintainers.
