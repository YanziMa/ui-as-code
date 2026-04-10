export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Profile Header */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
              AC
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alex Chen</h1>
                <span className="text-sm text-gray-500 dark:text-gray-400">@alex_chen</span>
                <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-3 py-0.5 text-xs font-medium">
                  Top Contributor
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Shanghai, CN &middot; Joined March 2026
              </p>
              <p className="text-gray-700 dark:text-gray-300 max-w-xl">
                Frontend engineer passionate about UI/UX. Love making software better for everyone.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  Share Profile
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Submissions", value: "47" },
            { label: "Accepted", value: "41", sub: "87% rate" },
            { label: "SaaS Products", value: "12" },
            { label: "Badges Earned", value: "8" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center"
            >
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
              {stat.sub && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{stat.sub}</p>
              )}
            </div>
          ))}
        </section>

        {/* Activity Chart */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Activity (Last 12 Weeks)</h2>
          <div className="flex items-end gap-2 h-48" role="img" aria-label="Submissions per week bar chart">
            {[3, 7, 4, 9, 5, 12, 8, 14, 6, 10, 11, 8].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">{height}</span>
                <div
                  className="w-full rounded-t-md bg-indigo-500 dark:bg-indigo-400 transition-all duration-300 hover:bg-indigo-600 dark:hover:bg-indigo-300"
                  style={{ height: `${(height / 14) * 100}%`, minHeight: "8px" }}
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">W{i + 1}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Submissions */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Recent Submissions</h2>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {[
              {
                saas: "HubSpot",
                title: "Navbar spacing fix",
                status: "Accepted",
                statusColor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
                time: "2 days ago",
              },
              {
                saas: "Notion",
                title: "Table column resize",
                status: "Accepted",
                statusColor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
                time: "5 days ago",
              },
              {
                saas: "Figma",
                title: "Toolbar icon alignment",
                status: "Accepted",
                statusColor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
                time: "1 week ago",
              },
              {
                saas: "Stripe",
                title: "Checkout button color",
                status: "Rejected",
                statusColor: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
                time: "3 days ago",
              },
              {
                saas: "Slack",
                title: "Sidebar width adjustment",
                status: "Pending",
                statusColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
                time: "1 day ago",
              },
              {
                saas: "Linear",
                title: "Issue detail layout",
                status: "Accepted",
                statusColor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
                time: "2 weeks ago",
              },
            ].map((sub) => (
              <li key={`${sub.saas}-${sub.title}`} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    <span className="font-semibold">{sub.saas}</span> &mdash; {sub.title}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sub.statusColor}`}>
                    {sub.status}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{sub.time}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Badges Section */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Badges Earned</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Early Adopter", desc: "Among first 100 users", icon: "\u2605" },
              { name: "Bug Hunter", desc: "Reported 5 UI issues", icon: "\uD83D\uDC1E" },
              { name: "Diff Master", desc: "10+ accepted diffs", icon: "&lt;/&gt;" },
              { name: "Team Player", desc: "Joined a team", icon: "\uD83D\uDC65" },
              { name: "Speed Demon", desc: "First response under 1h", icon: "\u26A1" },
              { name: "Polyglot", desc: "Contributed to 5+ SaaS products", icon: "\uD83C\uDF10" },
              { name: "Streak King", desc: "7-day submission streak", icon: "\uD83D\uDD25" },
              { name: "Helpful Soul", desc: "Helped 10+ other users", icon: "\u2764\uFE0F" },
            ].map((badge) => (
              <div
                key={badge.name}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div className="text-2xl mb-2" aria-hidden="true">{badge.icon}</div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{badge.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{badge.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SaaS Expertise */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">SaaS Expertise</h2>
          <div className="space-y-4">
            {[
              { name: "HubSpot", count: 12, max: 12 },
              { name: "Notion", count: 8, max: 12 },
              { name: "Figma", count: 7, max: 12 },
              { name: "Slack", count: 6, max: 12 },
              { name: "Linear", count: 5, max: 12 },
              { name: "Other", count: 9, max: 12 },
            ].map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.count} submissions</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500"
                    style={{ width: `${(item.count / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
