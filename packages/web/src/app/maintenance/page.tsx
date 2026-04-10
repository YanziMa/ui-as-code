import {
  AlertTriangle,
  Clock,
  Database,
  Globe,
  Shield,
  Rocket,
  Server,
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  MessageSquare,
  ExternalLink,
  XCircle,
  AlertCircle,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface TimelineEvent {
  label: string;
  description: string;
  status: "done" | "current" | "pending";
}

interface ServiceStatus {
  name: string;
  status:
    | "MAINTENANCE"
    | "OPERATIONAL"
    | "PAUSED"
    | "MIGRATING"
    | "QUEUED"
    | "LIMITED";
}

interface Incident {
  time: string;
  service: string;
  description: string;
  severity: "info" | "warning" | "error";
  resolved: boolean;
}

// ── Data ────────────────────────────────────────────────────────────────────

const MAINTENANCE_START = new Date("2026-04-10T14:00:00Z");
const MAINTENANCE_END = new Date("2026-04-10T14:30:00Z");
const IN_PROGRESS = Date.now() >= MAINTENANCE_START.getTime() && Date.now() < MAINTENANCE_END.getTime();

const timelineEvents: TimelineEvent[] = [
  { label: "T-30 min", description: "Pre-maintenance notification sent to all users", status: "done" },
  { label: "T-15 min", description: "Entering read-only mode for all submissions", status: "done" },
  { label: "T-0", description: "Maintenance started — service unavailable", status: IN_PROGRESS ? "current" : "pending" },
  { label: "T+5 min", description: "Database backup completed", status: "pending" },
  { label: "T+15 min", description: "Schema migration running", status: "pending" },
  { label: "T+25 min", description: "Cache warming in progress", status: "pending" },
  { label: "T+30 min", description: "Service restored (estimated)", status: "pending" },
];

const services: ServiceStatus[] = [
  { name: "Web Application", status: "MAINTENANCE" },
  { name: "API Endpoints", status: "MAINTENANCE" },
  { name: "Browser Extension", status: "LIMITED" },
  { name: "AI Diff Generation", status: "PAUSED" },
  { name: "Database", status: "MIGRATING" },
  { name: "CDN / Edge", status: "OPERATIONAL" },
  { name: "Webhooks", status: "QUEUED" },
  { name: "Authentication", status: "OPERATIONAL" },
];

const incidents: Incident[] = [
  {
    time: "14:02 UTC",
    service: "API Gateway",
    description: "Brief spike in 503 responses during graceful shutdown",
    severity: "warning",
    resolved: true,
  },
  {
    time: "14:05 UTC",
    service: "WebSocket",
    description: "Active connections gracefully disconnected",
    severity: "info",
    resolved: true,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function statusBadge(status: ServiceStatus["status"]) {
  const map: Record<ServiceStatus["status"], { bg: string; text: string; dot: string }> = {
    MAINTENANCE:   { bg: "bg-amber-100 dark:bg-amber-900/40",   text: "text-amber-800 dark:text-amber-300",   dot: "bg-amber-500" },
    OPERATIONAL:   { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-300", dot: "bg-emerald-500" },
    PAUSED:        { bg: "bg-orange-100 dark:bg-orange-900/40",   text: "text-orange-800 dark:text-orange-300",  dot: "bg-orange-500" },
    MIGRATING:     { bg: "bg-blue-100 dark:bg-blue-900/40",      text: "text-blue-800 dark:text-blue-300",      dot: "bg-blue-500 animate-pulse" },
    QUEUED:        { bg: "bg-yellow-100 dark:bg-yellow-900/40",  text: "text-yellow-800 dark:text-yellow-300",  dot: "bg-yellow-500" },
    LIMITED:       { bg: "bg-sky-100 dark:bg-sky-900/40",       text: "text-sky-800 dark:text-sky-300",        dot: "bg-sky-500" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function timelineIcon(status: TimelineEvent["status"]) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    case "current":
      return <Loader2 className="w-5 h-5 text-amber-500 shrink-0 animate-spin" />;
    case "pending":
      return <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />;
  }
}

function severityIcon(sev: Incident["severity"]) {
  switch (sev) {
    case "error":
      return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
    case "warning":
      return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
    case "info":
      return <AlertCircle className="w-4 h-4 text-sky-500 shrink-0" />;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const totalDuration = durationMinutes(MAINTENANCE_START, MAINTENANCE_END);
  const elapsed = Math.min(
    Math.max(Math.round((Date.now() - MAINTENANCE_START.getTime()) / 60000), 0),
    totalDuration
  );
  const progressPct = IN_PROGRESS ? Math.round((elapsed / totalDuration) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top banner */}
      <div className="bg-amber-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {IN_PROGRESS
            ? "Scheduled maintenance is currently in progress."
            : "Upcoming scheduled maintenance — please plan accordingly."}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ═══ Header ═══ */}
        <section className="flex items-start gap-4">
          <div className="mt-1 p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              System Maintenance
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
              UI-as-Code platform maintenance window —{" "}
              {IN_PROGRESS ? "in progress" : "scheduled"}
            </p>
          </div>
        </section>

        {/* ═══ Current Status Banner ═══ */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                {IN_PROGRESS
                  ? "Scheduled Maintenance In Progress"
                  : "Upcoming Scheduled Maintenance"}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {IN_PROGRESS
                  ? "Services are temporarily unavailable while we perform essential updates."
                  : "A maintenance window has been scheduled to perform essential system updates."}
              </p>
            </div>
            <div className="shrink-0">
              {statusBadge(IN_PROGRESS ? "MAINTENANCE" : "PAUSED")}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                Start Time
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {formatDateTime(MAINTENANCE_START)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                Estimated End
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {formatDateTime(MAINTENANCE_END)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                Duration
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                ~{totalDuration} minutes
              </p>
            </div>
          </div>

          {IN_PROGRESS && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* ═══ Maintenance Details ═══ */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Maintenance Details
          </h2>

          <div className="space-y-5">
            {/* Type */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                  Type
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[
                    { icon: Database, label: "Database Migration" },
                    { icon: Shield, label: "Security Update" },
                    { icon: Rocket, label: "Feature Deployment" },
                    { icon: Globe, label: "Infrastructure Upgrade" },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Affected Services */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                  Affected Services
                </p>
                <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
                  Web App &middot; API &middot; Extension Sync &middot; AI Generation
                </p>
              </div>
            </div>

            {/* Impact */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                  Impact
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  <li>Read-only mode enabled for all submissions and edits</li>
                  <li>PR reviews and AI-powered suggestions are paused</li>
                  <li>Browser extension sync is queued until restoration</li>
                </ul>
              </div>
            </div>

            {/* Reason */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                  Reason
                </p>
                <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  This maintenance window covers a database schema migration to support the new
                  collaborative editing features, along with critical security patches for the
                  authentication layer and infrastructure upgrades to improve overall platform
                  reliability and response times. We appreciate your patience as we work to make
                  UI-as-Code even better.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Timeline ═══ */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Maintenance Timeline
          </h2>

          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <div className="space-y-6">
              {timelineEvents.map((event, idx) => (
                <div key={idx} className="relative flex gap-4">
                  {/* Icon on the line */}
                  <div className="absolute -left-8 mt-0.5">{timelineIcon(event.status)}</div>

                  <div
                    className={`flex-1 rounded-lg border p-4 transition-colors ${
                      event.status === "current"
                        ? "border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-900/15"
                        : event.status === "done"
                        ? "border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-transparent"
                        : "border-gray-100 dark:border-gray-700/40 bg-transparent opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {event.label}
                      </p>
                      <span
                        className={`text-xs font-medium ${
                          event.status === "done"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : event.status === "current"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {event.status === "done"
                          ? "Completed"
                          : event.status === "current"
                          ? "In Progress"
                          : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Service Status Grid ═══ */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Service Status
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 p-4 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-3">
                  {svc.name}
                </span>
                {statusBadge(svc.status)}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Recent Incidents ═══ */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Recent Incidents During Maintenance
          </h2>

          {incidents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                      Service
                    </th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                      Severity
                    </th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                    >
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                        {inc.time}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {inc.service}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 max-w-xs">
                        {inc.description}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1">
                          {severityIcon(inc.severity)}
                          <span className="capitalize text-xs">{inc.severity}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {inc.resolved ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Investigating
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No incidents reported during this maintenance window.
            </p>
          )}
        </section>

        {/* ═══ Contact Support ═══ */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Contact Support
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            If you have questions or need assistance during this maintenance window, reach out
            through any of the following channels.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="mailto:support@uiascode.dev"
              className="group flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 text-gray-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  support@uiascode.dev
                </p>
              </div>
            </a>

            <a
              href="https://discord.gg/uiascode"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 text-gray-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Discord</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  Join our server
                  <ExternalLink className="w-3 h-3" />
                </p>
              </div>
            </a>

            <a
              href="https://status.uiascode.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 text-gray-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Status Page</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  Live system status
                  <ExternalLink className="w-3 h-3" />
                </p>
              </div>
            </a>
          </div>
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-8">
          Last updated: {formatDateTime(new Date())} &middot; UI-as-Code Operations Team
        </p>
      </main>
    </div>
  );
}
