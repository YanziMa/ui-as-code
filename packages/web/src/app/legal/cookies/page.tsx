export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Cookie Policy
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Last updated: April 10, 2026
          </p>
        </header>

        {/* Summary Section */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            What Are Cookies?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Cookies are small text files stored on your device when you visit a website.
            They help us provide you with a better experience by remembering your preferences,
            understanding how you interact with our service, and keeping your account secure.
            UI-as-Code uses cookies and similar technologies for essential functionality,
            analytics, and personalization. You can control which cookies we use through the
            settings below or in your browser at any time.
          </p>

          {/* Cookie Consent Banner Preview */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-5 bg-gray-50 dark:bg-gray-750 mb-6">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              We value your privacy
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              We use cookies to enhance your browsing experience, serve personalized content,
              and analyze our traffic. By clicking &quot;Accept All&quot;, you consent to our use of cookies.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer">
                Accept All
              </button>
              <button className="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors cursor-pointer">
                Reject Non-Essential
              </button>
              <button className="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors cursor-pointer">
                Customize
              </button>
            </div>
          </div>

          {/* Manage Preferences Button */}
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Preferences
          </button>
        </section>

        {/* Cookies We Use Table */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Cookies We Use
          </h2>

          {/* Essential Cookies */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                Always Active
              </span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Essential Cookies
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Purpose</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Duration</th>
                    <th className="text-left py-3 font-medium text-gray-500 dark:text-gray-400">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">session</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP / Secure</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Authentication state, CSRF protection</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">Session</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">uiascode.dev</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">preference</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Theme, language, display settings</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">1 year</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">uiascode.dev</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">security</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP / Secure</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Login attempt tracking, fraud prevention</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">24 hours</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">uiascode.dev</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Analytics Cookies */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                Opt-in
              </span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Analytics Cookies
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Purpose</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Duration</th>
                    <th className="text-left py-3 font-medium text-gray-500 dark:text-gray-400">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">_ga, _gid</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Google Analytics &mdash; user behavior analysis</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">2 years / 24 hours</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">Google</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">_fbp</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Facebook Pixel &mdash; ad conversion tracking</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">3 months</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">Meta (Facebook)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">Hotjar</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP / Local Storage</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Session recording for UX improvement</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">365 days</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">Hotjar</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Functional Cookies */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                Opt-in
              </span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Functional Cookies
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Purpose</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Duration</th>
                    <th className="text-left py-3 font-medium text-gray-500 dark:text-gray-400">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">feature_flags</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">A/B test assignment</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">90 days</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">uiascode.dev</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">draft_autosave</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Local Storage</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Local storage for in-progress work</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">30 days</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">uiascode.dev</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">sidebar_state</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">UI preference persistence</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">1 year</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">uiascode.dev</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Advertising Cookies */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                Opt-in
              </span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Advertising Cookies
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Purpose</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Duration</th>
                    <th className="text-left py-3 font-medium text-gray-500 dark:text-gray-400">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">gcl_au, _gac</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">Google Ads &mdash; conversion tracking</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">90 days</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">Google</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">li_sugr, li_fat_id</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">HTTP</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">LinkedIn Insight Tag &mdash; professional audience targeting</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">6 months</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">LinkedIn</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Third-Party Cookies */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Third-Party Cookies
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
            Some of the cookies set on our platform are placed by third-party services that we use
            to operate and improve UI-as-Code. These third parties may collect information about your
            visits to this and other websites in order to provide relevant advertisements, measure
            advertising effectiveness, and understand audience demographics. Below is a list of the
            third-party services that may set cookies through our service:
          </p>
          <ul className="space-y-3">
            {[
              { name: "Google Analytics", desc: "Website traffic analysis and user behavior reporting." },
              { name: "Cloudflare", desc: "Content delivery network (CDN), security, and performance optimization." },
              { name: "Vercel", desc: "Hosting infrastructure, edge caching, and deployment services." },
              { name: "Supabase", desc: "Authentication, database management, and real-time data sync." },
              { name: "Stripe", desc: "Secure payment processing and subscription billing." },
            ].map((item) => (
              <li key={item.name} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <span className="text-gray-600 dark:text-gray-300"> &mdash; {item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Your Choices */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Your Choices
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            You have full control over which non-essential cookies are used on UI-as-Code.
            Here are the options available to you:
          </p>

          <div className="space-y-4 mb-8">
            {/* Option 1 */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Accept all cookies</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enable all cookie categories including analytics, functional, and advertising.</p>
              </div>
              <div className="shrink-0 ml-4">
                <span className="inline-block w-10 h-6 rounded-full bg-blue-600 relative cursor-pointer">
                  <span className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0"></span>
                </span>
              </div>
            </div>

            {/* Option 2 */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Reject non-essential cookies</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Only allow essential cookies required for basic site operation.</p>
              </div>
              <div className="shrink-0 ml-4">
                <span className="inline-block w-10 h-6 rounded-full bg-gray-300 dark:bg-gray-600 relative cursor-pointer">
                  <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0"></span>
                </span>
              </div>
            </div>

            {/* Option 3 - Customize with toggles */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <p className="font-medium text-gray-900 dark:text-white text-sm mb-4">Customize cookie preferences</p>
              <div className="space-y-3">
                {[
                  { label: "Essential Cookies", active: true, locked: true },
                  { label: "Analytics Cookies", active: false, locked: false },
                  { label: "Functional Cookies", active: false, locked: false },
                  { label: "Advertising Cookies", active: false, locked: false },
                ].map((toggle) => (
                  <div key={toggle.label} className="flex items-center justify-between">
                    <span className={`text-sm ${toggle.locked ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {toggle.label}
                      {toggle.locked && <span className="ml-2 text-xs">(required)</span>}
                    </span>
                    <span
                      className={`inline-block w-10 h-6 rounded-full relative ${
                        toggle.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      } ${!toggle.locked ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          toggle.active ? 'right-0.5' : 'left-0.5'
                        }`}
                      ></span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Managing Cookies in Your Browser
          </h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Most web browsers allow you to control cookies through their settings preferences.
            However, limiting cookies may impact your experience on UI-as-Code and other websites.
            To manage cookies directly in your browser:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
              <span><strong>Chrome:</strong> Settings &rarr; Privacy and security &rarr; Third-party cookies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
              <span><strong>Firefox:</strong> Settings &rarr; Privacy & Security &rarr; Cookies and Site Data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
              <span><strong>Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
              <span><strong>Edge:</strong> Settings &rarr; Privacy, search, and services &rarr; Cookies and site permissions</span>
            </li>
          </ul>
        </section>

        {/* Data Transfer */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Data Transfer
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Information collected via cookies may be transferred to and processed in countries
            outside your country of residence. Our third-party service providers (including Google,
            Cloudflare, Meta, LinkedIn) may operate servers globally. When data is transferred
            internationally, we ensure appropriate safeguards are in place, such as Standard
            Contractual Clauses (SCCs) approved by the European Commission, to protect your data
            in accordance with applicable data protection laws.
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6 mb-3">
            Regulatory Compliance
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">GDPR (EU)</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation,
                including the right to access, rectify, erase, restrict processing, data portability, and object to processing.
                Consent is obtained before setting any non-essential cookies.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">CCPA (California)</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                California residents have the right to know what personal information is collected, sold, or disclosed,
                and to opt out of the sale of personal information. Our cookie practices align with CCPA requirements
                for transparency and consumer choice.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">IAB TCF Framework</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                UI-as-Code supports the IAB Europe Transparency &amp; Consent Framework (TCF), enabling standardized
                consent signals across the digital advertising ecosystem. Vendors registered with TCF can receive
                and interpret consent choices made by users on our platform.
              </p>
            </div>
          </div>
        </section>

        {/* Updates to This Policy */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Updates to This Policy
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            We may update this Cookie Policy from time to time to reflect changes in our use of cookies,
            updates to our services, changes in applicable laws, or other operational reasons. We encourage
            you to review this page periodically to stay informed about how we use cookies.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">1</span>
              <p className="text-sm text-gray-600 dark:text-gray-300 pt-0.5">
                <strong className="text-gray-900 dark:text-white">When we update:</strong> The &quot;Last updated&quot;
                date at the top of this page will be revised to reflect the most recent changes.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">2</span>
              <p className="text-sm text-gray-600 dark:text-gray-300 pt-0.5">
                <strong className="text-gray-900 dark:text-white">How we notify you:</strong> Material changes will be
                communicated via email to registered users, an in-app notification banner, or a prominent notice on
                our website prior to the changes taking effect.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">3</span>
              <p className="text-sm text-gray-600 dark:text-gray-300 pt-0.5">
                <strong className="text-gray-900 dark:text-white">Your continued use:</strong> Continued use of
                UI-as-Code after updates become effective constitutes acceptance of the revised policy.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Us */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Contact Us
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            If you have questions about this Cookie Policy, our use of cookies, or wish to exercise
            your data protection rights, please contact our privacy team:
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <a href="mailto:privacy@uiascode.dev" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              privacy@uiascode.dev
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            We aim to respond to all inquiries within 30 business days.
          </p>
        </section>

        {/* Footer note */}
        <footer className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} UI-as-Code. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
