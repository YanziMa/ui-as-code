export default function CLIDeveloperToolsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            CLI &amp; Developer Tools
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto mb-8">
            Install the UI-as-Code CLI to inspect, diff, and submit UI changes directly from your terminal.
          </p>
          <button className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-6 py-3 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install CLI
          </button>
          <div className="mt-8 bg-black/30 backdrop-blur-sm rounded-xl p-4 inline-block text-left max-w-xl mx-auto border border-white/10">
            <code className="text-sm font-mono text-green-300">npm install -g @uiascode/cli</code>
          </div>
        </div>
      </section>

      {/* Installation Section */}
      <section id="installation" className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Installation</h2>

          {/* Package Manager Tabs */}
          <div className="mb-8">
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-0">
              {[
                { label: "npm", cmd: "npm install -g @uiascode/cli", active: true },
                { label: "pnpm", cmd: "pnpm add -g @uiascode/cli", active: false },
                { label: "yarn", cmd: "yarn global add @uiascode/cli", active: false },
                { label: "Homebrew", cmd: "brew install uiascode/tap/uiac", active: false },
              ].map((tab) => (
                <button
                  key={tab.label}
                  className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
                    tab.active
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="bg-gray-900 text-gray-100 rounded-b-xl rounded-tr-xl p-5 font-mono text-sm overflow-x-auto">
              <span className="text-green-400">$</span> npm install -g @uiascode/cli
            </div>
          </div>

          {/* System Requirements & Verify */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                System Requirements
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                  Node.js 18+ (LTS recommended)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                  Chrome, Edge, or Firefox browser
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                  512 MB free disk space
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                  macOS, Linux, or Windows (WSL2)
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Verify
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Confirm the CLI is installed and working:
              </p>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm">
                <span className="text-green-400">$</span> uiac --version
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Expected output: <code className="font-mono bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded">uiac v2.4.1</code>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Available Commands */}
      <section id="commands" className="py-16 px-6 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Available Commands</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Complete command reference for the UI-as-Code CLI.
          </p>

          <div className="space-y-4">
            {commands.map((cmd) => (
              <div
                key={cmd.name}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Command name + description */}
                  <div className="lg:w-64 shrink-0">
                    <code className="font-mono text-base font-semibold text-indigo-600 dark:text-indigo-400">
                      {cmd.name}
                    </code>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{cmd.description}</p>
                  </div>

                  {/* Example usage */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1.5">
                      Example
                    </p>
                    <div className="bg-gray-900 text-gray-100 rounded-lg px-4 py-2.5 font-mono text-sm overflow-x-auto">
                      <span className="text-green-400">$</span> {cmd.example}
                    </div>
                  </div>

                  {/* Flags */}
                  <div className="lg:w-56 shrink-0">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1.5">
                      Flags / Subcommands
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cmd.flags.map((flag) => (
                        <span
                          key={flag}
                          className="inline-block bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-mono px-2 py-1 rounded-md"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Configuration Reference */}
      <section id="configuration" className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Configuration Reference</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Customize CLI behavior via <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">~/.uiac/config.json</code> or environment variables.
          </p>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="text-left py-3.5 px-5 font-semibold text-gray-700 dark:text-gray-300">Key</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-gray-700 dark:text-gray-300">Default</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-gray-700 dark:text-gray-300">Description</th>
                </tr>
              </thead>
              <tbody>
                {configEntries.map((entry, i) => (
                  <tr
                    key={entry.key}
                    className={`border-b border-gray-100 dark:border-gray-700/60 last:border-0 ${
                      i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-800/50"
                    }`}
                  >
                    <td className="py-3.5 px-5 font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {entry.key}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                          entry.type === "string"
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : entry.type === "number"
                            ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {entry.default}
                    </td>
                    <td className="py-3.5 px-5 text-gray-600 dark:text-gray-400">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-16 px-6 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Integrations</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Use UI-as-Code inside your favorite editor and CI/CD pipeline.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VS Code */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor">
                    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">VS Code Extension</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Full IDE integration</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Inspect, diff, and submit UI changes without leaving VS Code. Includes inline previews and command palette access.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Install from Marketplace
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* JetBrains */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="currentColor">
                    <path d="M17.136.031C15.41-.189 13.086.15 11.076 1.03c-2.337 1.025-4.094 2.807-4.886 4.99-.27.75-.42 1.534-.45 2.33-.01.28 0 .558.02.836l.04.38c.03.22.07.44.12.66.19.83.53 1.62.98 2.35.17.27.36.54.57.79l.21.25c.18.2.37.39.57.57.52.48 1.11.89 1.74 1.22.32.17.65.31.99.43.45.16.92.28 1.39.35.47.07.95.1 1.43.08.72-.03 1.44-.17 2.13-.42.69-.25 1.35-.61 1.94-1.07.59-.46 1.11-1.01 1.53-1.63.42-.62.74-1.31.93-2.04.19-.73.26-1.49.19-2.24-.07-.76-.28-1.5-.62-2.19-.34-.69-.8-1.31-1.36-1.84-.56-.53-1.22-.97-1.94-1.29-.72-.32-1.5-.51-2.29-.56-.8-.05-1.6.05-2.36.3-.77.25-1.49.67-2.1 1.21-.62.54-1.12 1.2-1.47 1.94-.35.74-.53 1.55-.52 2.36.01.82.21 1.62.58 2.34.37.72.91 1.35 1.56 1.84.65.49 1.41.83 2.21.98.8.15 1.63.11 2.41-.12.78-.23 1.5-.65 2.09-1.21.59-.56 1.04-1.25 1.3-2.02.26-.77.33-1.6.19-2.4-.14-.81-.5-1.57-1.02-2.2-.52-.64-1.2-1.14-1.97-1.45-.77-.31-1.62-.42-2.44-.31-.83.11-1.62.44-2.29.95-.67.51-1.2 1.19-1.53 1.97-.33.78-.44 1.64-.32 2.48.12.84.47 1.63 1 2.29.53.66 1.23 1.18 2.02 1.5.79.32 1.66.42 2.5.29.84-.13 1.63-.49 2.28-1.03.66-.54 1.17-1.24 1.48-2.04.31-.8.41-1.68.28-2.52z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">JetBrains Plugin</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">IntelliJ, WebStorm, PyCharm</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Native plugin for all JetBrains IDEs. Supports inspection mode, diff generation, and submission workflow.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Install from JetBrains Marketplace
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* Vim/Neovim */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-700 dark:text-green-400" fill="currentColor">
                    <path d="M24 0H0v24h24V0zM3.5 20.5v-17h4v17h-4zm6 0v-17h4v17h-4zm6 0v-17h4v17h-4z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Vim / Neovim Plugin</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Terminal-first workflow</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Lightweight plugin for Vim and Neovim users. Run commands, preview diffs, and manage submissions from within your editor.
              </p>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <span className="text-gray-500"># Using lazy.nvim</span><br/>
                {'{'}<br/>
                &nbsp;&quot;uiascode/uiac.nvim&quot;,<br/>
                {'}'}
              </div>
            </div>

            {/* GitHub Actions */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">GitHub Actions</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">CI/CD automation</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Automate UI diff generation and validation in your CI pipeline on every pull request.
              </p>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto leading-relaxed">
                <span className="text-gray-500"># .github/workflows/ui-diff.yml</span>{'\n'}
                <span className="text-purple-400">name:</span> UI Diff Check{'\n'}
                <span className="text-purple-400">on:</span> [pull_request]{'\n'}
                <span className="text-purple-400">jobs:</span>{'\n'}
                {'  '}<span className="text-blue-400">diff:</span>{'\n'}
                {'    '}<span className="text-purple-400">runs-on:</span> ubuntu-latest{'\n'}
                {'    '}<span className="text-purple-400">steps:</span>{'\n'}
                {'      '}- uses: uiascode/diff-action@v2{'\n'}
                {'        '}<span className="text-purple-400">with:</span>{'\n'}
                {'          '}token: $&#123;&#123; secrets.UIAC_TOKEN &#125;&#125;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Client */}
      <section id="api-client" className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">API Client</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Integrate UI-as-Code programmatically using our REST API or official SDKs.
          </p>

          {/* Auth Setup */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-3">Authentication</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Generate an API key from your dashboard and set it as an environment variable:
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1.5">Node.js</p>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                  <span className="text-purple-400">import</span> {'{'} UIACClient {'}'} <span className="text-purple-400">from</span> <span className="text-green-300">&apos;@uiascode/sdk&apos;</span>;{'\n\n'}
                  <span className="text-purple-400">const</span> client = <span className="text-purple-400">new</span> UIACClient({'{\n'}
                  {'  '}apiKey: process.env.<span className="text-yellow-300">UIAC_API_KEY</span>,{'\n'}
                  {'}'});{'\n\n'}
                  console.<span className="text-blue-300">log</span>(<span className="text-green-300">&apos;Authenticated!&apos;</span>);
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1.5">Python</p>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                  <span className="text-purple-400">from</span> uiac_sdk <span className="text-purple-400">import</span> UIACClient{'\n\n'}
                  client = UIACClient(api_key=os.environ[<span className="text-green-300">&quot;UIAC_API_KEY&quot;</span>]){'\n\n'}
                  print(<span className="text-green-300">&quot;Authenticated!&quot;</span>)
                </div>
              </div>
            </div>
          </div>

          {/* API Examples */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Submission */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Create Submission
              </h3>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                <span className="text-gray-500"># curl example</span>{'\n'}
                curl -X POST \<br/>
                &nbsp;&nbsp;<span className="text-green-300">https://api.uiascode.dev/v1/submissions</span> \<br/>
                &nbsp;&nbsp;-H <span className="text-green-300">&quot;Authorization: Bearer $UIAC_API_KEY&quot;</span> \<br/>
                &nbsp;&nbsp;-H <span className="text-green-300">&quot;Content-Type: application/json&quot;</span> \<br/>
                &nbsp;&nbsp;-d <span className="text-green-300">&apos;{&quot;description&quot;:&quot;Fix navbar padding&quot;,&quot;url&quot;:&quot;https://example.com&quot;}&apos;</span>
              </div>
            </div>

            {/* Check Status */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Check Status
              </h3>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                <span className="text-gray-500"># Node.js SDK</span>{'\n'}
                <span className="text-purple-400">const</span> status = <span className="text-purple-400">await</span> client.submissions<br/>
                &nbsp;&nbsp;.get(<span className="text-yellow-300">&quot;sub_abc123&quot;</span>);{'\n\n'}
                console.<span className="text-blue-300">log</span>(status.state);<br/>
                <span className="text-gray-500">// &quot;processing&quot;</span>
              </div>
            </div>

            {/* Download Result */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                Download Result
              </h3>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                <span className="text-gray-500"># Python SDK</span>{'\n'}
                result = client.submissions\<br/>
                &nbsp;&nbsp;.download(<span className="text-yellow-300">&quot;sub_abc123&quot;</span>){'\n\n'}
                <span className="text-purple-400">with</span> open(<span className="text-green-300">&quot;diff.patch&quot;</span>, <span className="text-green-300">&quot;wb&quot;</span>) as f:<br/>
                &nbsp;&nbsp;f.write(result)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Install the CLI in under a minute and start inspecting any website.
          </p>
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 inline-block border border-white/10">
            <code className="font-mono text-green-300">npm install -g @uiascode/cli &amp;&amp; uiac init my-project</code>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Data ---------- */

const commands = [
  {
    name: "uiac init",
    description: "Initialize UI-as-Code in a project",
    example: "uiac init my-project",
    flags: ["--template", "--no-git"],
  },
  {
    name: "uiac auth",
    description: "Authenticate with your account",
    example: "uiac auth login",
    flags: ["--token", "--browser"],
  },
  {
    name: "uiac inspect",
    description: "Start inspector mode",
    example: "uiac inspect https://hubspot.com",
    flags: ["--port", "--headless"],
  },
  {
    name: "uiac diff",
    description: "Generate a diff from description",
    example: 'uiac diff "fix navbar padding"',
    flags: ["--screenshot", "--model"],
  },
  {
    name: "uiac submit",
    description: "Submit a PR to SaaS vendor",
    example: "uiac submit ./my-diff.patch",
    flags: ["--draft", "--message"],
  },
  {
    name: "uiac list",
    description: "List your submissions",
    example: "uiac list --status accepted",
    flags: ["--status", "--limit", "--json"],
  },
  {
    name: "uiac preview",
    description: "Open sandbox preview",
    example: "uiac preview ./diff.json",
    flags: ["--port", "--compare"],
  },
  {
    name: "uiac config",
    description: "Manage configuration",
    example: "uiac config set model sonnet",
    flags: ["get", "set", "list", "reset"],
  },
  {
    name: "uiac status",
    description: "Show system status",
    example: "uiac status",
    flags: [],
  },
  {
    name: "uiac logout",
    description: "Sign out",
    example: "uiac logout",
    flags: [],
  },
];

const configEntries = [
  {
    key: "ai.model",
    type: "string",
    default: '"claude-sonnet"',
    description: "AI model for diff generation",
  },
  {
    key: "ai.temperature",
    type: "number",
    default: "0.7",
    description: "Creativity level 0-1",
  },
  {
    key: "output.format",
    type: "string",
    default: '"unified"',
    description: 'Diff format (unified/json/patch)',
  },
  {
    key: "editor.default",
    type: "string",
    default: '"vscode"',
    description: "Default editor for diffs",
  },
  {
    key: "notifications.enabled",
    type: "boolean",
    default: "true",
    description: "Desktop notifications",
  },
  {
    key: "telemetry.enabled",
    type: "boolean",
    default: "true",
    description: "Anonymous usage analytics",
  },
];
