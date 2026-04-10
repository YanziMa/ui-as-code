"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */

interface EventType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  payload: Record<string, unknown>;
}

const EVENT_DEFAULTS: Omit<EventType, "enabled">[] = [
  {
    id: "pr:created",
    name: "PR Created",
    description: "Fired when a new pull request is opened.",
    payload: { event: "pr:created", timestamp: "2026-04-10T12:00:00Z", data: { prId: 42, title: "feat: add webhook support", author: "alice", sourceBranch: "feature/webhooks", targetBranch: "main" } },
  },
  {
    id: "pr:merged",
    name: "PR Merged",
    description: "Fired when a pull request is merged into the base branch.",
    payload: { event: "pr:merged", timestamp: "2026-04-10T14:30:00Z", data: { prId: 42, title: "feat: add webhook support", mergedBy: "bob", commitSha: "a1b2c3d4e5f6" } },
  },
  {
    id: "pr:closed",
    name: "PR Closed",
    description: "Fired when a pull request is closed without merging.",
    payload: { event: "pr:closed", timestamp: "2026-04-10T15:00:00Z", data: { prId: 38, title: "wip: experimental refactor", closedBy: "carol", reason: "superseded by #42" } },
  },
  {
    id: "friction:created",
    name: "Friction Report Created",
    description: "Fired when a new friction report is submitted.",
    payload: { event: "friction:created", timestamp: "2026-04-10T16:00:00Z", data: { frictionId: "f-101", category: "code-review", severity: "medium", description: "Long review cycles blocking releases", reporter: "dave" } },
  },
  {
    id: "vote:cast",
    name: "Vote Cast",
    description: "Fired when a user votes on a friction report or PR.",
    payload: { event: "vote:cast", timestamp: "2026-04-10T17:00:00Z", data: { voteId: "v-205", targetType: "friction", targetId: "f-101", voter: "eve", value: 1 } },
  },
];

const STORAGE_KEY = "uac-webhook-events";

function loadEventStates(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        enabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 mt-0.5 ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
      <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WebhooksPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [secretStatus, setSecretStatus] = useState<"checking" | "configured" | "not_configured">("checking");

  // Initialize events with persisted toggle states
  useEffect(() => {
    const saved = loadEventStates();
    setEvents(
      EVENT_DEFAULTS.map((ev) => ({
        ...ev,
        enabled: saved[ev.id] !== undefined ? saved[ev.id] : true,
      }))
    );
  }, []);

  // Persist toggle changes
  useEffect(() => {
    if (events.length === 0) return;
    const map: Record<string, boolean> = {};
    for (const ev of events) map[ev.id] = ev.enabled;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }, [events]);

  // Check webhook secret status
  const checkSecretStatus = useCallback(async () => {
    setSecretStatus("checking");
    try {
      const res = await fetch("/api/webhook/status", { signal: AbortSignal.timeout(8_000) });
      const data = await res.json();
      setSecretStatus(data.configured ? "configured" : "not_configured");
    } catch {
      // If the endpoint doesn't exist, show as not configured
      setSecretStatus("not_configured");
    }
  }, []);

  useEffect(() => { checkSecretStatus(); }, [checkSecretStatus]);

  const toggleEvent = (id: string) =>
    setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, enabled: !ev.enabled } : ev)));

  const enabledCount = events.filter((e) => e.enabled).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#128279;</span>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Webhook Management</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Configure webhooks to receive real-time notifications for external integrations.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {/* ---- Webhook Status Card ---- */}
        <Section title="Current Status" icon="&#128994;">
          <div
            className={`flex items-center justify-between rounded-lg border p-4 ${
              secretStatus === "configured"
                ? "border-green-200 bg-green-50/60 dark:border-green-900/40 dark:bg-green-950/20"
                : secretStatus === "checking"
                  ? "border-yellow-200 bg-yellow-50/60 dark:border-yellow-900/40 dark:bg-yellow-950/20"
                  : "border-orange-200 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  secretStatus === "configured"
                    ? "bg-green-500"
                    : secretStatus === "checking"
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-orange-400"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {secretStatus === "configured"
                    ? "Webhook Secret Configured"
                    : secretStatus === "checking"
                      ? "Checking configuration..."
                      : "Webhook Secret Not Configured"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {secretStatus === "configured"
                    ? "Your webhook endpoint is ready to receive signed payloads."
                    : "Set the WEBHOOK_SECRET environment variable to enable secure webhook delivery."}
                </p>
              </div>
            </div>
            <button
              onClick={checkSecretStatus}
              disabled={secretStatus === "checking"}
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {secretStatus === "checking" ? "Checking..." : "Recheck"}
            </button>
          </div>
        </Section>

        {/* ---- Event Types Table ---- */}
        <Section title="Event Types" icon="&#128203;">
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {enabledCount} of {events.length} event types enabled
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
                  <th className="pb-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Event</th>
                  <th className="pb-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Description</th>
                  <th className="pb-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="py-3">
                      <code className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-mono font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {event.id}
                      </code>
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">{event.description}</td>
                    <td className="py-3 text-right">
                      <Toggle enabled={event.enabled} onChange={() => toggleEvent(event.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ---- Payload Examples ---- */}
        <Section title="Payload Examples" icon="&#128220;">
          <div className="space-y-3">
            {events.map((event) => (
              <details key={event.id} className="group rounded-lg border border-zinc-200 dark:border-zinc-800">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900">
                  <span className="inline-block transition-transform group-open:rotate-90">&#9654;</span>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">{event.id}</code>
                  <span className="text-zinc-500 dark:text-zinc-400">&mdash; {event.name}</span>
                </summary>
                <pre className="overflow-x-auto border-t border-zinc-100 bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/60 dark:bg-zinc-900 dark:text-zinc-400">
                  <code>{JSON.stringify(event.payload, null, 2)}</code>
                </pre>
              </details>
            ))}
          </div>
        </Section>

        {/* ---- Quick Setup Guide ---- */}
        <Section title="Quick Setup Guide" icon="&#128196;">
          <ol className="space-y-5">
            {/* Step 1 */}
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Set your webhook secret</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Add the <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">WEBHOOK_SECRET</code>{" "}
                  environment variable to your deployment. This is used to sign every webhook payload so you can verify its authenticity.
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-green-400">
                  <code>WEBHOOK_SECRET=whsec_your_random_secret_here</code>
                </pre>
              </div>
            </li>

            {/* Step 2 */}
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Send POST requests to the endpoint</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  All webhooks are delivered via HTTP POST to{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">/api/webhook</code>.
                  Include the <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">x-webhook-signature</code>{" "}
                  header for verification.
                </p>
              </div>
            </li>

            {/* Step 3 - curl examples */}
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span>
              <div className="flex-1 space-y-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Example curl commands</p>
                {events.map((event) => (
                  <div key={event.id}>
                    <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      {event.name}
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[11px] leading-relaxed text-zinc-300">
                      <code>{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-signature: sha256=<signature>" \\
  -d '${JSON.stringify(event.payload)}'`}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </li>
          </ol>
        </Section>

        {/* Footer links */}
        <div className="flex justify-center gap-4 pt-2">
          <a href="/settings" className="text-sm text-blue-600 hover:underline">Settings</a>
          <a href="/api-docs" className="text-sm text-blue-600 hover:underline">API Documentation</a>
          <a href="/status" className="text-sm text-blue-600 hover:underline">System Status</a>
        </div>
      </main>
    </div>
  );
}
