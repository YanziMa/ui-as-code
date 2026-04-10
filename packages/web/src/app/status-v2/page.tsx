/**
 * Enhanced System Status monitoring page.
 */

const SERVICES = [
  { name: "API Gateway", status: "operational", latency: 12, uptime: 100, color: "bg-green-500" },
  { name: "Database (Supabase)", status: "operational", latency: 34, uptime: 99.97, color: "bg-green-500" },
  { name: "AI Provider (Claude)", status: "operational", latency: 156, uptime: 99.9, color: "bg-blue-500" },
  { name: "CDN (Vercel Edge)", status: "operational", latency: 3, uptime: 100, color: "bg-emerald-500" },
  { name: "Webhook Queue", status: "operational", latency: 8, uptime: 99.95, color: "bg-green-500" },
  { name: "Extension API", status: "operational", latency: 45, uptime: 99.92, color: "bg-indigo-500" },
];

const INCIDENTS = [
  { time: "10 min ago", severity: "Info", service: "AI Provider", status: "Resolved", duration: "4m 12s", desc: "Elevated latency detected, auto-scaled" },
  { time: "2 hours ago", severity: "Warning", service: "Database", status: "Resolved", duration: "12m 33s", desc: "Connection pool spike during deployment" },
  { time: "6 hours ago", severity: "Info", service: "Webhook Queue", status: "Resolved", duration: "1m 05s", desc: "Queue backlog cleared after retry surge" },
  { time: "Yesterday", severity: "Warning", service: "Extension API", status: "Resolved", duration: "18m 42s", desc: "Timeout increase for slow network regions" },
  { time: "2 days ago", severity: "Critical", service: "Database", status: "Resolved", duration: "45s", desc: "Brief connectivity loss, failover triggered" },
  { time: "3 days ago", severity: "Info", service: "API Gateway", status: "Resolved", duration: "2m 15s", desc: "Scheduled maintenance window" },
  { time: "5 days ago", severity: "Warning", service: "AI Provider", status: "Resolved", duration: "8m 30s", desc: "Rate limit threshold approached" },
  { time: "1 week ago", severity: "Info", service: "CDN", status: "Resolved", duration: "30s", desc: "Edge function cold start" },
  { time: "2 weeks ago", severity: "Critical", service: "All Systems", status: "Resolved", duration: "3m 22s", desc: "Major version deployment with brief outage" },
];

const UPTIME_DAYS = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  pct: i >= 28 ? 100 : i >= 25 ? 98.5 : i >= 20 ? 96 : i >= 15 ? 94 : i >= 10 ? 91 : i >= 5 ? 88 : 95 + Math.random() * 4,
}));

export default function StatusV2Page() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Overall Status */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Systems Operational</h1>
          <p className="text-sm text-gray-500">99.98% uptime over 30 days</p>
        </div>
      </div>

      {/* Uptime Chart */}
      <section className="mb-10 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">30-Day Uptime</h2>
          <span className="text-xs text-gray-400">Last 30 days</span>
        </div>
        <div className="flex gap-[2px] h-8">
          {UPTIME_DAYS.map((d) => (
            <div key={d.day} className={`flex-1 rounded-sm ${d.pct >= 99.5 ? "bg-green-500" : d.pct >= 95 ? "bg-yellow-400" : d.pct >= 90 ? "bg-orange-400" : "bg-red-500"}`} title={`${d.day} days ago: ${d.pct.toFixed(1)}%`} />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </section>

      {/* Services Grid */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((svc) => (
            <div key={svc.name} className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${svc.color}`} />
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{svc.name}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  svc.status === "operational" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>{svc.status}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Latency</span>
                  <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{svc.latency}ms</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${svc.latency <= 50 ? "bg-green-500" : svc.latency <= 100 ? "bg-yellow-400" : "bg-red-500"}`} style={{ width: `${Math.min(svc.latency / 200 * 100, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">Uptime (30d)</span>
                  <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{svc.uptime}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Avg Response", value: "42ms", trend: "down" },
          { label: "Requests/min", value: "234", trend: "up" },
          { label: "Error Rate", value: "0.03%", trend: "down" },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.value}</p>
            <p className="text-[10px] text-green-500 flex items-center justify-center gap-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}><path strokeLinecap="round" strokeLinejoin="round" d={m.trend === "up" ? "M7 17l5-5M17 7l5 5M7 7v10" : "M17 7L7 17"} /></svg>
              {m.trend === "down" ? "-2.3%" : "+1.8%"}
            </p>
          </div>
        ))}
      </section>

      {/* Incidents */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-between">
          Recent Incidents
          <span className="text-xs text-gray-400">{INCIDENTS.length} incidents in last 30 days</span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {INCIDENTS.map((inc) => (
                <tr key={inc.time + inc.service} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{inc.time}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                      inc.severity === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      inc.severity === "Warning" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>{inc.severity}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{inc.service}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      inc.status === "Resolved" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
                    }`}>
                      {inc.status === "Resolved" ? "✓" : "◐"} {inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{inc.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Subscribe */}
      <section className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white mb-3">Subscribe to Status Updates</p>
        <div className="flex max-w-md mx-auto gap-2">
          <input type="email" placeholder="your@email.com" className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Subscribe</button>
        </div>
        <a href="/api/feed" className="inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-3">Or subscribe via RSS →</a>
      </section>
    </div>
  );
}
