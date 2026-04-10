"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types & defaults                                                   */
/* ------------------------------------------------------------------ */

interface UserSettings {
  theme: "light" | "dark" | "system";
  fontSize: "small" | "medium" | "large";
  notifications: {
    prActivity: boolean;
    frictionReports: boolean;
    weeklyDigest: boolean;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  fontSize: "medium",
  notifications: { prActivity: true, frictionReports: true, weeklyDigest: false },
};

const STORAGE_KEY = "uac-settings";

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore corrupt data */ }
  return DEFAULT_SETTINGS;
}

const THEME_OPTIONS = [
  { value: "light" as const, label: "Light", icon: "\u2600\uFE0F", bg: "bg-white border-zinc-200" },
  { value: "dark" as const, label: "Dark", icon: "\uD83C\uDF19", bg: "bg-zinc-900 border-zinc-700" },
  { value: "system" as const, label: "System", icon: "\uD83D\uDCBB", bg: "bg-gradient-to-br from-white to-zinc-900 border-zinc-300" },
];

const FONT_OPTIONS = [
  { value: "small" as const, label: "Small", size: "text-sm" },
  { value: "medium" as const, label: "Medium", size: "text-base" },
  { value: "large" as const, label: "Large", size: "text-lg" },
];

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean; onChange: (v: boolean) => void; label: string; description: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          enabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"
        }`}>
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 mt-0.5 ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`} />
      </button>
    </label>
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [apiStatus, setApiStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  useEffect(() => { setSettings(loadSettings()); }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.classList.add("dark");
    else if (settings.theme === "light") root.classList.remove("dark");
    else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      root.classList.toggle("dark", mq.matches);
      const handler = (e: MediaQueryListEvent) => root.classList.toggle("dark", e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--base-font-size",
      { small: "14px", medium: "16px", large: "18px" }[settings.fontSize]);
  }, [settings.fontSize]);

  const testApiConnection = useCallback(async () => {
    setApiStatus("checking"); setApiLatency(null);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/health", { signal: AbortSignal.timeout(8_000) });
      setApiLatency(Date.now() - t0); setApiStatus(res.ok ? "ok" : "error");
    } catch { setApiLatency(Date.now() - t0); setApiStatus("error"); }
  }, []);

  const resetToDefaults = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const updateTheme = (t: UserSettings["theme"]) => setSettings((s) => ({ ...s, theme: t }));
  const updateFontSize = (f: UserSettings["fontSize"]) => setSettings((s) => ({ ...s, fontSize: f }));
  const updateNotification = (k: keyof UserSettings["notifications"], v: boolean) =>
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [k]: v } }));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your preferences and account settings.
            </p>
          </div>
          <a href="/" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">Back to Home</a>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {/* ---- Appearance ---- */}
        <Section title="Appearance" icon="\uD83C\uDFA8">
          {/* Theme */}
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {THEME_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => updateTheme(opt.value)}
                className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  settings.theme === opt.value
                    ? "border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900/40"
                    : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                } ${opt.bg}`}>
                <span className="text-lg leading-none">{opt.icon}</span>
                <span className={`text-xs font-medium ${opt.value === "dark" ? "text-zinc-200" : "text-zinc-700"}`}>
                  {opt.label}
                </span>
                {settings.theme === opt.value && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">&#10003;</span>
                )}
              </button>
            ))}
          </div>

          {/* Font Size */}
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Font Size</p>
          <div className="grid grid-cols-3 gap-3">
            {FONT_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => updateFontSize(opt.value)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${
                  settings.fontSize === opt.value
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
                }`}>
                <span className={opt.size}>Aa</span>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{opt.label}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* ---- Notifications ---- */}
        <Section title="Notifications" icon="\uD83D\uDD14">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            <Toggle enabled={settings.notifications.prActivity} onChange={(v) => updateNotification("prActivity", v)}
              label="PR Activity" description="Get notified when a pull request is created or updated." />
            <Toggle enabled={settings.notifications.frictionReports} onChange={(v) => updateNotification("frictionReports", v)}
              label="New Friction Reports" description="Receive alerts for newly submitted friction reports." />
            <Toggle enabled={settings.notifications.weeklyDigest} onChange={(v) => updateNotification("weeklyDigest", v)}
              label="Weekly Digest" description="A summary of activity delivered once per week." />
          </div>
        </Section>

        {/* ---- API ---- */}
        <Section title="API Configuration" icon="\uD83D\uDCE1">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">API Endpoint</p>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                <code className="flex-1 truncate text-sm font-mono text-zinc-600 dark:text-zinc-400">
                  {typeof window !== "undefined" ? `${window.location.origin}/api` : "/api"}
                </code>
                <span className="shrink-0 rounded-md bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                  Read-only
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                  apiStatus === "ok" ? "bg-green-500" : apiStatus === "error" ? "bg-red-500"
                    : apiStatus === "checking" ? "bg-yellow-400 animate-pulse" : "bg-zinc-300 dark:bg-zinc-600"
                }`} />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {apiStatus === "idle" ? "Not tested" : apiStatus === "checking" ? "Testing..."
                      : apiStatus === "ok" ? "Connected" : "Connection failed"}
                  </p>
                  {apiLatency !== null && <p className="text-xs text-zinc-500 dark:text-zinc-400">Latency: {apiLatency}ms</p>}
                </div>
              </div>
              <button onClick={testApiConnection} disabled={apiStatus === "checking"}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900">
                {apiStatus === "checking" ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>
        </Section>

        {/* ---- About ---- */}
        <Section title="About" icon="\u2139\uFE0F">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            {[["Version","0.2.0"],["Framework","Next.js 16"],["Runtime","React 19"],["License","MIT"]].map(([k,v]) => (
              <div key={k} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                <p className="text-xs text-zinc-400">{k}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <a href="https://github.com/YanziMa/ui-as-code" target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors">GitHub Repository</a>
            <a href="/privacy" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">Terms of Service</a>
          </div>
        </Section>

        {/* ---- Reset ---- */}
        <div className="flex justify-end pt-2">
          <button onClick={resetToDefaults}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:bg-black dark:text-red-400 dark:hover:bg-red-950/30">
            Reset to Defaults
          </button>
        </div>
      </main>
    </div>
  );
}
