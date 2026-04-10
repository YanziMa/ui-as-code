import Link from "next/link";

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline inline-block mb-4"
          >
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold">Getting Started</h1>
          <p className="text-muted-foreground mt-1">Set up UI-as-Code in under 5 minutes</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-10">
        {/* Step 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span>
            <h2 className="text-xl font-semibold">Install the Chrome Extension</h2>
          </div>
          <div className="ml-11 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
              <li>Clone the repository: <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">git clone https://github.com/YanziMa/ui-as-code.git</code></li>
              <li>Navigate to the extension directory: <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">cd ui-as-code/packages/extension</code></li>
              <li>Install dependencies and build:
                <pre className="mt-2 rounded-lg bg-zinc-950 p-4 text-xs text-green-400 overflow-x-auto"><code>pnpm install
pnpm build</code></pre>
              </li>
              <li>Open Chrome, go to <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">chrome://extensions/</code></li>
              <li>Enable &quot;Developer mode&quot; (toggle in top right)</li>
              <li>Click &quot;Load unpacked&quot; and select the <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">build/chrome-mv3-prod</code> folder</li>
            </ol>
          </div>
        </section>

        {/* Step 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">2</span>
            <h2 className="text-xl font-semibold">Configure API Connection</h2>
          </div>
          <div className="ml-11 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
              <li>Click the UI-as-Code icon in your browser toolbar</li>
              <li>The popup should show &quot;Connected&quot; with a green status dot</li>
              <li>If using a custom server, update the API URL field and click Save</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              The extension connects to <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">https://ui-as-code-web.vercel.app</code> by default.
            </p>
          </div>
        </section>

        {/* Step 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">3</span>
            <h2 className="text-xl font-semibold">Select &amp; Describe</h2>
          </div>
          <div className="ml-11 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
              <li>Navigate to any SaaS product (HubSpot, Notion, Linear, etc.)</li>
              <li>Hold <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-mono">Alt</kbd> on your keyboard</li>
              <li>Hover over elements — they will be highlighted in blue</li>
              <li><kbd className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-mono">Alt</kbd>+<strong>Click</strong> an element to select it</li>
              <li>A side panel opens — type what you want to change in plain English</li>
              <li>Examples:
                <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                  <li>&quot;Make this button larger and add rounded corners&quot;</li>
                  <li>&quot;Change the header color to dark blue&quot;</li>
                  <li>&quot;Add more padding between these cards&quot;</li>
                </ul>
              </li>
            </ol>
          </div>
        </section>

        {/* Step 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">4</span>
            <h2 className="text-xl font-semibold">Review &amp; Submit</h2>
          </div>
          <div className="ml-11 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
              <li>AI generates a unified diff showing exactly what code would change</li>
              <li>Review the diff — added lines are green, removed lines are red</li>
              <li>Click <strong>Adopt &amp; Submit PR</strong> to submit your change</li>
              <li>Or click <strong>Reject</strong> if you want to discard it</li>
              <li>Submitted PRs appear on the <Link href="/pr" className="text-blue-600 hover:underline">PR Dashboard</Link> for community voting</li>
            </ol>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Troubleshooting
          </h2>
          <div className="ml-11 space-y-4">
            {[
              { q: "Extension doesn't detect React components?", a: "Some SaaS products use minified or compiled React. The extension falls back to DOM element selection automatically." },
              { q: "AI generation takes too long?", a: "Complex components may take 30-60 seconds for AI to analyze. The spinner shows progress. If it exceeds 90s, it will timeout." },
              { q: "Getting CORS errors?", a: "Make sure your API URL is correct. The production server at ui-as-code-web.vercel.app has CORS enabled for all origins." },
              { q: "Where can I see my submitted changes?", a: "Visit the PR Dashboard at /pr to see all submitted changes, vote on others, and track merge status." },
            ].map((item) => (
              <details key={item.q} className="group rounded-lg border border-zinc-200 dark:border-zinc-800">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  {item.q}
                </summary>
                <p className="px-4 pb-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Next steps */}
        <section className="rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 p-8 text-center dark:from-blue-950/30 dark:to-violet-950/30">
          <h2 className="text-xl font-semibold mb-2">All set!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Start modifying SaaS interfaces with natural language.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Open Dashboard
            </Link>
            <Link
              href="/api-docs"
              className="px-5 py-2.5 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors dark:border-zinc-800"
            >
              View API Docs
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
