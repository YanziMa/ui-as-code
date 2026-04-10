import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "UI-as-Code privacy policy — how we handle your data",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Privacy Policy</h1>
          <p className="mt-1 text-sm text-zinc-500">Last updated: April 10, 2026</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8 prose-zinc dark:prose-invert">
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Introduction</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            UI-as-Code (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy. This policy explains what data we collect,
            how we use it, and your rights regarding that data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Information We Collect</h2>
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">Component Code</p>
              <p>When you use the extension to select a component, the React component source code is captured from the page DOM. This is sent to our AI API to generate diffs.</p>
            </div>
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">Screenshots</p>
              <p>Optionally, you may include a screenshot of the area you want modified. Screenshots are processed by our AI and not stored permanently.</p>
            </div>
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">Friction Reports &amp; PRs</p>
              <p>When you submit a change (adopt) or report an issue (reject), we store the SaaS name, component name, your description, and submission timestamp in our database.</p>
            </div>
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">Account Data</p>
              <p>If you sign in via OAuth (GitHub/Google), we store your user ID, email, and display name provided by the OAuth provider.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Generate code diffs using AI models</li>
            <li>Display community-voted PRs on the dashboard</li>
            <li>Improve AI prompt quality (anonymized, aggregated)</li>
            <li>Provide usage analytics (aggregated statistics only)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Data Sharing</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            We do not sell your personal data. Friction reports and PRs are publicly visible on the dashboard
            (SaaS name, component name, description only — no personal identifiers unless you choose to link them).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">AI Processing</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Component code and descriptions are sent to AI providers (GLM/Claude/OpenAI/DeepSeek) for diff generation.
            These transmissions are encrypted in transit. We do not use your data to train AI models.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Request a copy of your data</li>
            <li>Request deletion of your data</li>
            <li>Opt out of data collection by not using the extension</li>
            <li>Export your submissions as CSV via the Dashboard</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Contact</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            For privacy-related questions, please open an issue on{" "}
            <a href="https://github.com/YanziMa/ui-as-code" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              GitHub
            </a>{" "}
            or email the maintainers.
          </p>
        </section>
      </main>
    </div>
  );
}
