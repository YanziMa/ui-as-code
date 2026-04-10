import {
  formatNumber,
  formatBytes,
  formatPercent,
  formatDate,
  cn,
} from "@/lib";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlanInfo {
  name: "Free" | "Pro" | "Enterprise";
  price: string;
  description: string;
  features: string[];
}

interface UsageLimit {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  formatter?: (n: number) => string;
}

interface BillingRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
}

/* ------------------------------------------------------------------ */
/*  Mock data (would come from DB / API in production)                 */
/* ------------------------------------------------------------------ */

const currentPlan: PlanInfo = {
  name: "Free",
  price: "$0 / mo",
  description: "Perfect for getting started. Upgrade anytime.",
  features: [
    "1,000 API calls / month",
    "500 MB storage",
    "Up to 5 team members",
    "Community support",
  ],
};

const upgradePlans: Pick<PlanInfo, "name" | "price" | "description">[] = [
  {
    name: "Pro",
    price: "$29 / mo",
    description: "For growing teams that need more power.",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Advanced features and dedicated support.",
  },
];

const usageLimits: UsageLimit[] = [
  { label: "API calls", used: 120, limit: 1000 },
  { label: "Storage", used: 45 * 1024 * 1024, limit: 500 * 1024 * 1024, formatter: formatBytes },
  { label: "Team members", used: 3, limit: 5 },
];

const billingHistory: BillingRecord[] = [
  { id: "inv-001", date: "2026-04-01T00:00:00Z", description: "Free plan - April 2026", amount: 0, status: "paid" },
  { id: "inv-002", date: "2026-03-01T00:00:00Z", description: "Free plan - March 2026", amount: 0, status: "paid" },
  { id: "inv-003", date: "2026-02-01T00:00:00Z", description: "Free plan - February 2026", amount: 0, status: "paid" },
  { id: "inv-004", date: "2026-01-01T00:00:00Z", description: "Free plan - January 2026", amount: 0, status: "paid" },
  { id: "inv-005", date: "2025-12-01T00:00:00Z", description: "One-time setup fee (waived)", amount: 0, status: "refunded" },
];

// Daily API call counts for the bar chart (last 14 days)
const apiCallData = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return {
    label: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
    count: Math.floor(Math.random() * 18) + 2, // 2-20 calls per day
  };
});

const maxApiCalls = Math.max(...apiCallData.map((d) => d.count), 1);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: BillingRecord["status"]) {
  const styles: Record<BillingRecord["status"], string> = {
    paid: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    failed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    refunded: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ProgressBar({ label, used, limit, unit, formatter }: UsageLimit) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const displayUsed = formatter ? formatter(used) : formatNumber(used);
  const displayLimit = formatter ? formatter(limit) : formatNumber(limit);
  const isNearLimit = pct >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className={cn(
          "text-sm tabular-nums",
          isNearLimit ? "font-semibold text-orange-600 dark:text-orange-400" : "text-zinc-500 dark:text-zinc-400",
        )}>
          {displayUsed}
          {unit && <span className="text-zinc-400 dark:text-zinc-500"> {unit}</span>}
          {" / "}
          {displayLimit}
          {unit && <span className="text-zinc-400 dark:text-zinc-500"> {unit}</span>}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isNearLimit
              ? "bg-gradient-to-r from-orange-500 to-orange-400"
              : "bg-gradient-to-r from-blue-600 to-blue-400",
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className={cn(
        "mt-1 text-xs",
        isNearLimit ? "text-orange-600 dark:text-orange-400" : "text-zinc-400 dark:text-zinc-500",
      )}>
        {formatPercent(used, limit)} used
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Billing &amp; Usage</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Monitor your usage, manage your plan, and view billing history.
            </p>
          </div>
          <a href="/" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
            Back to Home
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* ---- Current Plan & Upgrade CTA ---- */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Current Plan</h2>
                <span className={cn(
                  "rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide",
                  currentPlan.name === "Free"
                    ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    : currentPlan.name === "Pro"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
                )}>
                  {currentPlan.name}
                </span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">{currentPlan.price}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{currentPlan.description}</p>
              <ul className="space-y-1.5">
                {currentPlan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="shrink-0 sm:w-56 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Upgrade Plan</p>
              {upgradePlans.map((plan) => (
                <button
                  key={plan.name}
                  type="button"
                  className="w-full rounded-lg border-2 border-dashed border-zinc-300 p-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50/60 dark:border-zinc-700 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{plan.name}</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{plan.price}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{plan.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Usage Metrics ---- */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* API Calls Bar Chart */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              API Calls This Month
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              Daily breakdown of the last 14 days
            </p>

            {/* Simple div-based bar chart */}
            <div className="flex items-end gap-1.5 h-40">
              {apiCallData.map((day) => {
                const heightPct = (day.count / maxApiCalls) * 100;
                return (
                  <div key={day.label} className="group flex flex-1 flex-col items-center gap-1.5">
                    <div className="relative w-full flex items-end justify-center h-32">
                      <div
                        className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all group-hover:from-blue-700 group-hover:to-blue-500"
                        style={{ height: `${heightPct}%`, minHeight: "4px" }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none whitespace-nowrap scale-90 origin-top">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Total this month</span>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {formatNumber(apiCallData.reduce((sum, d) => sum + d.count, 0))}
                <span className="ml-1 text-xs font-normal text-zinc-400">calls</span>
              </span>
            </div>
          </section>

          {/* Storage & Team Members Summary Cards */}
          <section className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Storage Used
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Across all projects and assets
              </p>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatBytes(45 * 1024 * 1024)}
                </span>
                <span className="mb-1 text-sm text-zinc-400 dark:text-zinc-500">
                  of {formatBytes(500 * 1024 * 1024)}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
                <div
                  className="h-full w-[9%] rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Team Members
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Active seats on your account
              </p>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">3</span>
                <span className="mb-1 text-sm text-zinc-400 dark:text-zinc-500">
                  of 5 members
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
                <div
                  className="h-full w-[60%] rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                />
              </div>
            </div>
          </section>
        </div>

        {/* ---- Usage Limits Progress Bars ---- */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Usage Limits
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            Track how close you are to your plan limits
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {usageLimits.map((limit) => (
              <ProgressBar
                key={limit.label}
                {...limit}
              />
            ))}
          </div>
        </section>

        {/* ---- Payment Method ---- */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Payment Method
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Manage how you pay for your subscription.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center gap-3">
              {/* Card icon placeholder */}
              <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-zinc-800 to-zinc-950 text-white text-xs font-bold dark:from-zinc-700 dark:to-zinc-900">
                VISA
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Visa ending in ****4242
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Expires 12/2028
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:border-zinc-600"
            >
              Update Payment Method
            </button>
          </div>
        </section>

        {/* ---- Billing History Table ---- */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Billing History
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            View past invoices and payment records.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="pb-3 pr-4 font-semibold text-zinc-500 dark:text-zinc-400">Date</th>
                  <th className="pb-3 pr-4 font-semibold text-zinc-500 dark:text-zinc-400">Description</th>
                  <th className="pb-3 pr-4 font-semibold text-zinc-500 dark:text-zinc-400 text-right">Amount</th>
                  <th className="pb-3 font-semibold text-zinc-500 dark:text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {billingHistory.map((record) => (
                  <tr key={record.id} className="transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30">
                    <td className="py-3.5 pr-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {formatDate(record.date)}
                    </td>
                    <td className="py-3.5 pr-4 text-zinc-900 dark:text-zinc-50">
                      {record.description}
                    </td>
                    <td className="py-3.5 pr-4 text-right whitespace-nowrap font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                      {record.amount === 0
                        ? "--"
                        : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(record.amount)}
                    </td>
                    <td className="py-3.5">{statusBadge(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
