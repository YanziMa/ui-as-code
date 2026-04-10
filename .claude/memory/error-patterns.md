# Error Patterns & Solutions

## Build Errors

### Zod v4 API Differences
- **Error**: `z.record(z.unknown())` — Expected 2-3 arguments
- **Fix**: `z.record(z.string(), z.unknown())`

- **Error**: `z.enum([...], { required_error: ... })` — property doesn't exist
- **Fix**: `z.enum([...], { message: "..." })`

- **Error**: `result.error.errors` — Property doesn't exist
- **Fix**: `result.error.issues`

- **Error**: `useRef<T>()` — Expected 1 argument
- **Fix**: `useRef<T | undefined>(undefined)`

### Next.js / Turbopack
- **Error**: `new NextRequest()` — Expected 1-2 arguments (in GET routes)
- **Fix**: Use `undefined` as first arg, make withHandler accept optional req

- **Error**: icon.ts in app/ treated as route — Export default missing
- **Fix**: Don't put icon.ts in app/ directory, use public/ instead

- **Error**: `ImageMetadata` not exported from "next"
- **Fix**: Don't import ImageMetadata, just export plain object with default

### Supabase
- **Error**: `supabaseUrl is required` at build time
- **Fix**: Use placeholder values: `"https://placeholder.supabase.co"` / `"placeholder-key"`

- **Error**: `supabase.raw()` doesn't exist
- **Fix**: Read current value → compute new value → update (read-modify-write)

- **Error**: Type `never` on .insert() when using Proxy pattern
- **Fix**: Don't use Proxy for supabase client, use direct createClient with placeholders

### Vercel Deployment
- **Error**: `pnpm install exited with 1` — workspace dep resolution
- **Fix**: Delete pnpm-lock.yaml in packages/web/, regenerate clean one

- **Error**: Root directory wrong (monorepo detected)
- **Fix**: Set Vercel Root Directory = packages/web

## Runtime Errors

### Extension
- **Error**: Manifest missing or unreadable
- **Fix**: Load from build/chrome-mv3-prod/ not from source packages/extension/

- **Error**: screenshot_base64 validation failed (null)
- **Fix**: Make schema accept z.union([z.string(), z.null()]).nullable()

### Git
- **Error**: Failed to connect github.com:443
- **Fix**: Set HTTPS_PROXY=http://127.0.0.1:7890 before git push
