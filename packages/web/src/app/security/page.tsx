export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-br from-emerald-600 to-blue-700 text-white py-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
            <svg
              className="w-9 h-9"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Security
          </h1>
          <p className="text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto">
            Your data and privacy are our top priority
          </p>
        </div>
      </section>

      {/* Security Overview Cards */}
      <section className="max-w-5xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              ),
              title: "Encryption",
              description:
                "All data encrypted in transit (TLS 1.3) and at rest (AES-256)",
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              ),
              title: "Authentication",
              description:
                "SSO via Google/GitHub OAuth, 2FA support",
              color: "text-blue-600 dark:text-blue-400",
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              title: "Compliance",
              description:
                "GDPR compliant, SOC 2 Type II certified",
              color: "text-violet-600 dark:text-violet-400",
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              title: "Monitoring",
              description:
                "24/7 threat monitoring, automated vulnerability scanning",
              color: "text-orange-500 dark:text-orange-400",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`${card.color} mb-3`}>{card.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Privacy Section */}
      <section className="max-w-5xl mx-auto px-6 mt-14">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 md:p-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Data Privacy
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What we collect */}
            <div>
              <h3 className="text-base font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
                What We Collect
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Account information (email, display name)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Usage analytics (anonymous, aggregated)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Screenshots (encrypted at rest)
                </li>
              </ul>
            </div>

            {/* What we don't collect */}
            <div>
              <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                What We Don&apos;t Collect
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  Passwords (hashed with bcrypt, never stored in plaintext)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  Personal messages or communication content
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  Browsing history or off-platform activity
                </li>
              </ul>
            </div>

            {/* Data retention */}
            <div>
              <h3 className="text-base font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Data Retention
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  Activity logs retained for 90 days
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  Immediate deletion upon account closure request
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  Automated purging of expired data
                </li>
              </ul>
            </div>

            {/* Your rights */}
            <div>
              <h3 className="text-base font-semibold text-violet-700 dark:text-violet-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your Rights
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  Export your data at any time (JSON format)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  Request full account deletion
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  Data portability to other services
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer">
                  Export My Data
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors cursor-pointer">
                  Request Deletion
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Security */}
      <section className="max-w-5xl mx-auto px-6 mt-14">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 md:p-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Infrastructure Security
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column - providers */}
            <div className="space-y-5">
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-black dark:bg-white rounded-lg">
                  <svg className="w-5 h-5 text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 22.525H0l12-21.05 12 21.05z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Vercel Edge Network
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Global CDN with DDoS protection, automatic SSL, and edge-side request routing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-emerald-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <ellipse cx="12" cy="6" rx="8" ry="3" />
                    <path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
                    <path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Supabase (PostgreSQL)
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Row-Level Security (RLS) policies enforced on every query. No direct database access.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Penetration Testing
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Quarterly third-party penetration testing with full remediation within 30 days.
                  </p>
                </div>
              </div>
            </div>

            {/* Right column - zero-trust diagram */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Zero-Trust Architecture
              </h4>
              <div className="relative bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-750 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Diagram layers - CSS visual */}
                <div className="space-y-3">
                  {/* User layer */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-full text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      Users &amp; Devices
                    </div>
                  </div>

                  {/* Arrow down */}
                  <div className="flex justify-center">
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                  </div>

                  {/* Identity layer */}
                  <div className="mx-auto max-w-xs">
                    <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-medium text-blue-800 dark:text-blue-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Identity Verification (OAuth + 2FA)
                    </div>
                  </div>

                  {/* Arrow down */}
                  <div className="flex justify-center">
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                  </div>

                  {/* Policy layer */}
                  <div className="mx-auto max-w-sm">
                    <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 rounded-lg text-xs font-medium text-violet-800 dark:text-violet-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                      </svg>
                      Access Control &amp; RLS Policies
                    </div>
                  </div>

                  {/* Arrow down */}
                  <div className="flex justify-center">
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                  </div>

                  {/* Data layer */}
                  <div className="mx-auto max-w-md">
                    <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg text-xs font-medium text-orange-800 dark:text-orange-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                      </svg>
                      Encrypted Data Store (AES-256 at rest)
                    </div>
                  </div>
                </div>

                {/* Side labels */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 hidden xl:block">
                  <div className="writing-mode-vertical text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    Every Request Verified
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Badges */}
      <section className="max-w-5xl mx-auto px-6 mt-14">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Compliance Certifications
        </h2>
        <div className="flex flex-wrap gap-4">
          {[
            { name: "GDPR", status: "Compliant", color: "emerald" },
            { name: "CCPA", status: "Compliant", color: "blue" },
            { name: "SOC 2", status: "Type II Certified", color: "violet" },
            { name: "ISO 27001", status: "Certified", color: "orange" },
            { name: "HIPAA", status: "Coming Soon", color: "gray", comingSoon: true },
          ].map((badge) => (
            <div
              key={badge.name}
              className={`flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-gray-800 border ${
                badge.comingSoon
                  ? "border-dashed border-gray-300 dark:border-gray-600 opacity-70"
                  : `border-${badge.color}-200 dark:border-${badge.color}-800`
              } rounded-xl min-w-[160px]`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                  badge.comingSoon
                    ? "bg-gray-100 dark:bg-gray-700"
                    : `bg-${badge.color}-100 dark:bg-${badge.color}-900/30`
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    badge.comingSoon
                      ? "text-gray-400"
                      : `text-${badge.color}-600 dark:text-${badge.color}-400`
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className={`font-bold text-sm ${badge.comingSoon ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
                  {badge.name}
                </p>
                <p className={`text-xs ${badge.comingSoon ? "text-gray-400 dark:text-gray-500 italic" : "text-gray-500 dark:text-gray-400"}`}>
                  {badge.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Timeline */}
      <section className="max-w-5xl mx-auto px-6 mt-14">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Recent Security Updates
        </h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400 via-blue-400 to-violet-400" />

            <div className="space-y-6">
              {[
                {
                  date: "2026-04-01",
                  event:
                    "Completed Q1 penetration test — 0 critical findings",
                  color: "emerald",
                },
                {
                  date: "2026-03-15",
                  event:
                    "Enabled TLS 1.3 across all endpoints",
                  color: "blue",
                },
                {
                  date: "2026-03-01",
                  event:
                    "Achieved SOC 2 Type II certification",
                  color: "violet",
                },
                {
                  date: "2026-02-10",
                  event:
                    "Implemented rate limiting on all API endpoints",
                  color: "orange",
                },
              ].map((item) => (
                <div key={item.date} className="relative pl-12">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 bg-${item.color}-500 ring-2 ring-${item.color}-200 dark:ring-${item.color}-900`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                    <time className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {item.date}
                    </time>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {item.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Report Vulnerability */}
      <section className="max-w-5xl mx-auto px-6 mt-14 mb-16">
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-8 md:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-emerald-600 rounded-xl">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Report a Vulnerability
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                We take security seriously. Help us keep our platform safe.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Responsible disclosure */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white dark:border-gray-700 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
                Responsible Disclosure Policy
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-emerald-500">&#10003;</span>
                  Give us reasonable time to fix the issue before public disclosure
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-emerald-500">&#10003;</span>
                  Do not access, modify, or delete data that is not your own
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-emerald-500">&#10003;</span>
                  Provide sufficient details for us to reproduce the issue
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-emerald-500">&#10003;</span>
                  We will not pursue legal action against good-faith researchers
                </li>
              </ul>
            </div>

            {/* Contact info */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white dark:border-gray-700 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
                Contact &amp; Response
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">
                    Email
                  </p>
                  <a
                    href="mailto:security@uiascode.dev"
                    className="text-sm font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    security@uiascode.dev
                  </a>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">
                    Expected Response Time
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Within 48 hours
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">
                    Bug Bounty Program
                  </p>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    View program details
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
