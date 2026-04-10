import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CLI Reference",
  description: "UI-as-Code CLI usage reference and command documentation",
};

const commands = [
  {
    command: "init",
    description: "Initialize a new UI-as-Code project in the current directory",
    example: "ui-as-code init my-project",
  },
  {
    command: "dev",
    description: "Start the local development server with hot reload",
    example: "ui-as-code dev",
  },
  {
    command: "build",
    description: "Build the project for production deployment",
    example: "ui-as-code build",
  },
  {
    command: "deploy",
    description: "Deploy the built project to Vercel",
    example: "ui-as-code deploy",
  },
  {
    command: "auth",
    description: "Configure authentication providers and credentials",
    example: "ui-as-code auth setup",
  },
];

const envVars = [
  { variable: "NEXT_PUBLIC_APP_URL", description: "Base URL of the deployed application", default: "http://localhost:3000" },
  { variable: "SUPABASE_URL", description: "Supabase project URL", default: "(required)" },
  { variable: "SUPABASE_ANON_KEY", description: "Supabase anonymous/public key", default: "(required)" },
  { variable: "SUPABASE_SERVICE_ROLE_KEY", description: "Supabase service role key (server-side)", default: "(required)" },
  { variable: "AI_PROVIDER", description: "AI provider to use (glm, claude, openai, deepseek)", default: "glm" },
  { variable: "AI_API_KEY", description: "API key for the selected AI provider", default: "(required)" },
  { variable: "NODE_ENV", description: "Environment mode", default: "development" },
];

export default function CliPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">&#9889;</span>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              CLI Reference
            </h1>
          </div>
          <p className="text-sm text-zinc-500">
            Command-line interface for managing UI-as-Code projects. Install,
            initialize, develop, build, and deploy from your terminal.
          </p>
          <nav className="mt-3 flex gap-3 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Home
            </Link>
            <Link
              href="/api-docs"
              className="text-blue-600 hover:text-blue-700"
            >
              API Docs
            </Link>
            <Link
              href="/getting-started"
              className="text-blue-600 hover:text-blue-700"
            >
              Getting Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-10">
        {/* Installation */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Installation
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Install the CLI globally or add it to your project:
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                Run directly (no install)
              </p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100">
                <code>npx ui-as-code@latest</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                Install as project dependency
              </p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100">
                <code>pnpm add ui-as-code</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Commands */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Available Commands
          </h2>
          <div className="rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800 dark:bg-black">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                    Command
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                    Description
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {commands.map((cmd) => (
                  <tr
                    key={cmd.command}
                    className="bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <code className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {cmd.command}
                      </code>
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                      {cmd.description}
                    </td>
                    <td className="px-5 py-3">
                      <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {cmd.example}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Environment Variables */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Environment Variables
          </h2>
          <div className="rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800 dark:bg-black">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                    Variable
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                    Description
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                    Default
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {envVars.map((env) => (
                  <tr
                    key={env.variable}
                    className="bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <code className="rounded bg-amber-50 px-2 py-0.5 text-xs font-mono font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {env.variable}
                      </code>
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                      {env.description}
                    </td>
                    <td className="px-5 py-3">
                      <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {env.default}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Docs Link */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            Further Reading
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            For the full REST API reference, endpoint details, request/response
            schemas, and authentication flows, see the API documentation.
          </p>
          <Link
            href="/api-docs"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            View Full API Documentation &rarr;
          </Link>
        </section>
      </main>
    </div>
  );
}
