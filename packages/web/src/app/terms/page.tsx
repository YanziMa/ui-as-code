import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "UI-as-Code terms of service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Terms of Service</h1>
          <p className="mt-1 text-sm text-zinc-500">Last updated: April 10, 2026</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            By using UI-as-Code (the &quot;Service&quot;), you agree to these terms. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">2. Description of Service</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            UI-as-Code provides a browser extension and web platform that allows users to identify UI elements on SaaS products,
            describe desired changes in natural language, receive AI-generated code diffs, and submit improvements as community-voted pull requests.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">3. User Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>You must comply with the terms of service of any SaaS product you use with this extension</li>
            <li>You are responsible for the content of your descriptions and submissions</li>
            <li>You must not use the Service for any unlawful purpose</li>
            <li>You must not attempt to reverse-engineer, abuse, or overload the API endpoints</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">4. Generated Content</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            AI-generated diffs are provided &quot;as-is&quot;. You are responsible for reviewing diffs before submitting.
            We make no warranties about the correctness, security, or performance of generated code changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">5. Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            The Service itself is licensed under the MIT License. Code diffs generated through the Service
            become part of the public PR workflow. Component code from SaaS products remains the property of their respective owners.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">6. Rate Limiting</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            To ensure fair usage, API endpoints are rate-limited:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li>AI generation: 5 requests per minute</li>
            <li>General API: 30 requests per minute</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">7. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            The Service is provided &quot;as-is&quot; without warranties of any kind. In no event shall UI-as-Code or its contributors
            be liable for any damages arising from the use or inability to use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">8. Changes to Terms</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">9. Contact</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            For questions about these terms, please visit{" "}
            <a href="https://github.com/YanziMa/ui-as-code" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              github.com/YanziMa/ui-as-code
            </a>.
          </p>
        </section>
      </main>
    </div>
  );
}
