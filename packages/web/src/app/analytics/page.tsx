export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <div className="flex flex-wrap gap-2">
          {(["7 days", "30 days", "90 days", "All time"] as const).map((range) => (
            <button
              key={range}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                range === "30 days"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Last {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            label: "Total Submissions",
            value: "1,247",
            trend: "+12.5%",
            trendUp: true,
          },
          {
            label: "Acceptance Rate",
            value: "73.2%",
            trend: "+3.1%",
            trendUp: true,
          },
          {
            label: "Active Users",
            value: "342",
            trend: "+28",
            trendUp: true,
          },
          {
            label: "Avg Review Time",
            value: "4.2h",
            trend: "-18min",
            trendUp: true,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
          >
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {kpi.label}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {kpi.value}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                kpi.trendUp
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              <svg
                className={`w-4 h-4 ${!kpi.trendUp ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              {kpi.trend}
            </span>
          </div>
        ))}
      </div>

      {/* Submissions Over Time Chart */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Submissions Over Time
        </h2>
        <div className="flex items-end gap-2 md:gap-3 h-56">
          {[
            { day: "Mar 28", val: 45 },
            { day: "Mar 29", val: 62 },
            { day: "Mar 30", val: 38 },
            { day: "Mar 31", val: 71 },
            { day: "Apr 01", val: 55 },
            { day: "Apr 02", val: 84 },
            { day: "Apr 03", val: 67 },
            { day: "Apr 04", val: 92 },
            { day: "Apr 05", val: 48 },
            { day: "Apr 06", val: 53 },
            { day: "Apr 07", val: 78 },
            { day: "Apr 08", val: 95 },
            { day: "Apr 09", val: 88 },
            { day: "Apr 10", val: 72 },
          ].map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full max-w-[40px] bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-t-md"
                style={{ height: `${(d.val / 100) * 100}%` }}
                title={`${d.val} submissions`}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {d.day.split(" ")[1]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top SaaS Targets — horizontal bar chart */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Top SaaS Targets
          </h2>
          <div className="space-y-4">
            {[
              { name: "HubSpot", count: 234, pct: 100 },
              { name: "Salesforce", count: 189, pct: 81 },
              { name: "Notion", count: 156, pct: 67 },
              { name: "Stripe", count: 134, pct: 57 },
              { name: "Figma", count: 98, pct: 42 },
            ].map((item) => (
              <div key={item.name}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submission Status Breakdown — conic-gradient donut */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Submission Status Breakdown
          </h2>
          <div className="flex items-center gap-8">
            {/* Donut ring via conic-gradient + mask trick */}
            <div
              className="relative w-36 h-36 shrink-0 rounded-full"
              style={{
                background:
                  "conic-gradient(#6366f1 0% 73%, #f59e0b 73% 88%, #ef4444 88% 96%, #9ca3af 96% 100%)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))",
                mask:
                  "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))",
              }}
            />
            <ul className="space-y-3">
              {[
                { label: "Accepted", pct: "73%", color: "bg-indigo-500" },
                { label: "Pending", pct: "15%", color: "bg-amber-500" },
                { label: "Rejected", pct: "8%", color: "bg-red-500" },
                { label: "Expired", pct: "4%", color: "bg-gray-400" },
              ].map((s) => (
                <li key={s.label} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-sm ${s.color}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {s.label}
                  </span>
                  <span className="ml-auto text-sm font-semibold text-gray-900 dark:text-white">
                    {s.pct}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Recent Activity
        </h2>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {[
            {
              icon: (
                <svg
                  className="w-5 h-5 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              ),
              desc:
                "New PR submitted for Slack sidebar component redesign",
              time: "2 min ago",
            },
            {
              icon: (
                <svg
                  className="w-5 h-5 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              ),
              desc: "User @janed joined the workspace",
              time: "14 min ago",
            },
            {
              icon: (
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ),
              desc:
                "Submission for HubSpot navigation bar accepted by reviewer",
              time: "32 min ago",
            },
            {
              icon: (
                <svg
                  className="w-5 h-5 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              ),
              desc:
                "AI auto-review completed for Notion dashboard layout",
              time: "1 hr ago",
            },
            {
              icon: (
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              ),
              desc:
                "Code snippet updated in Stripe checkout flow template",
              time: "2 hrs ago",
            },
            {
              icon: (
                <svg
                  className="w-5 h-5 text-purple-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              ),
              desc:
                "Team milestone reached: 1,000 total submissions",
              time: "3 hrs ago",
            },
            {
              icon: (
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ),
              desc:
                "Submission for Figma toolbar expired without review",
              time: "5 hrs ago",
            },
            {
              icon: (
                <svg
                  className="w-5 h-5 text-cyan-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              ),
              desc:
                "Weekly analytics report generated and sent to team leads",
              time: "6 hrs ago",
            },
          ].map((activity) => (
            <li
              key={activity.desc}
              className="flex items-start gap-4 py-3.5"
            >
              <div className="mt-0.5 shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-700/70 flex items-center justify-center">
                {activity.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                  {activity.desc}
                </p>
                <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom row of smaller stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: "Most Active Contributor",
            value: "@alex_chen",
            sub: "47 submissions",
          },
          {
            label: "Busiest Day",
            value: "Tuesday",
            sub: "Avg 89 submissions",
          },
          {
            label: "Peak Hour",
            value: "14:00–16:00 UTC",
            sub: "23% of daily volume",
          },
          {
            label: "AI Accuracy",
            value: "94.2%",
            sub: "Based on last 500 reviews",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
              {card.label}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {card.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {card.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
