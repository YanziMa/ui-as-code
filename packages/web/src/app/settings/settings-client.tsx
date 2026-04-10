"use client";

import { useState, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProfileData {
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  emailVerified: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

interface Session {
  id: string;
  browser: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

interface Props {
  profile: ProfileData;
  timezones: SelectOption[];
  languages: SelectOption[];
  aiModels: SelectOption[];
  sessions: Session[];
}

/* ------------------------------------------------------------------ */
/*  Shared UI primitives                                               */
/* ------------------------------------------------------------------ */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
    >
      {children}
    </label>
  );
}

function Input({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  id?: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        readOnly
          ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 cursor-not-allowed"
          : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
      }`}
    />
  );
}

function Select({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-500 appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 0.75rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.25em 1.25em",
        paddingRight: "2.5rem",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer group">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 mt-0.5 ml-0.5 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Client Component                                                   */
/* ------------------------------------------------------------------ */

export default function SettingsClient({
  profile,
  timezones,
  languages,
  aiModels,
  sessions,
}: Props) {
  /* ---- Account state ---- */
  const [displayName, setDisplayName] = useState(profile.name);
  const [timezone, setTimezone] = useState("America/New_York");
  const [language, setLanguage] = useState("en");

  /* ---- Notification state ---- */
  const [emailPrUpdates, setEmailPrUpdates] = useState(true);
  const [emailMentions, setEmailMentions] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");

  /* ---- Editor / AI state ---- */
  const [aiModel, setAiModel] = useState("claude-sonnet");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState("4096");
  const [autoPreview, setAutoPreview] = useState(true);

  /* ---- Appearance state ---- */
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [compactMode, setCompactMode] = useState(false);

  /* ---- Security state ---- */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeSessionsList, setActiveSessionsList] =
    useState<Session[]>(sessions);

  /* ---- Danger zone ---- */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* ---- Save handling ---- */
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const formEndRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, []);

  const handleRevokeSession = useCallback((id: string) => {
    setActiveSessionsList((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleExportData = useCallback(() => {
    alert("Your data export has been queued. You will receive an email with a download link shortly.");
  }, []);

  const handleDeleteAccount = useCallback(() => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    alert("Account deletion requested. This action is irreversible.");
    setShowDeleteConfirm(false);
  }, [showDeleteConfirm]);

  return (
    <>
      {/* ============================================================ */}
      {/*  1. Profile                                                  */}
      {/* ============================================================ */}
      <Section title="Profile" description="Your public profile information.">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold select-none">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              {profile.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {profile.email}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              {profile.role}
            </span>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  2. Account Settings                                         */}
      {/* ============================================================ */}
      <Section
        title="Account Settings"
        description="Basic account information and regional preferences."
      >
        <div className="space-y-5 max-w-lg">
          <div>
            <FieldLabel htmlFor="display-name">Display Name</FieldLabel>
            <Input
              id="display-name"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <div className="relative">
              <Input
                id="email"
                value={profile.email}
                readOnly
              />
              {profile.emailVerified && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
              <Select
                id="timezone"
                value={timezone}
                onChange={setTimezone}
                options={timezones}
              />
            </div>
            <div>
              <FieldLabel htmlFor="language">Language</FieldLabel>
              <Select
                id="language"
                value={language}
                onChange={setLanguage}
                options={languages}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  3. Notification Preferences                                 */}
      {/* ============================================================ */}
      <Section
        title="Notification Preferences"
        description="Choose how and when you want to be notified."
      >
        <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800 max-w-lg">
          <Toggle
            enabled={emailPrUpdates}
            onChange={setEmailPrUpdates}
            label="Email — PR Updates"
            description="Receive emails when pull requests you are involved in are updated."
          />
          <Toggle
            enabled={emailMentions}
            onChange={setEmailMentions}
            label="Email — Mentions"
            description="Get notified via email when someone mentions you in a comment or review."
          />
          <Toggle
            enabled={emailDigest}
            onChange={setEmailDigest}
            label="Email — Weekly Digest"
            description="A weekly summary of all activity across your projects."
          />
          <Toggle
            enabled={inAppNotifs}
            onChange={setInAppNotifs}
            label="In-App Notifications"
            description="Show real-time notifications within the application interface."
          />
        </div>

        <div className="mt-6 max-w-lg">
          <FieldLabel htmlFor="webhook-url">Webhook URL</FieldLabel>
          <Input
            id="webhook-url"
            value={webhookUrl}
            onChange={setWebhookUrl}
            placeholder="https://your-service.example.com/webhook"
          />
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            Optional POST endpoint for custom notification integrations.
          </p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  4. Editor / AI Preferences                                  */}
      {/* ============================================================ */}
      <Section
        title="Editor & AI Preferences"
        description="Configure AI model behavior and editor defaults."
      >
        <div className="space-y-5 max-w-lg">
          <div>
            <FieldLabel htmlFor="ai-model">AI Model</FieldLabel>
            <Select
              id="ai-model"
              value={aiModel}
              onChange={setAiModel}
              options={aiModels}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel>Temperature</FieldLabel>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 tabular-nums">
                {temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              <span>Precise (0.0)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel htmlFor="max-tokens">Max Tokens</FieldLabel>
              <Input
                id="max-tokens"
                type="number"
                value={maxTokens}
                onChange={setMaxTokens}
                placeholder="4096"
              />
            </div>
            <div className="flex items-end pb-1">
              <Toggle
                enabled={autoPreview}
                onChange={setAutoPreview}
                label="Auto-Preview"
                description="Automatically render previews as you type."
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  5. Appearance                                               */}
      {/* ============================================================ */}
      <Section
        title="Appearance"
        description="Customize how the application looks and feels."
      >
        {/* Theme selector */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Theme
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {(
              [
                {
                  value: "light" as const,
                  label: "Light",
                  bg: "bg-white border-gray-200",
                  ring: "ring-gray-300",
                  dot: "bg-gray-800",
                  text: "text-gray-700",
                },
                {
                  value: "dark" as const,
                  label: "Dark",
                  bg: "bg-gray-900 border-gray-700",
                  ring: "ring-gray-600",
                  dot: "bg-white",
                  text: "text-gray-200",
                },
                {
                  value: "system" as const,
                  label: "System",
                  bg: "bg-gradient-to-br from-white to-gray-900 border-gray-300",
                  ring: "ring-gray-400",
                  dot: "",
                  text: "text-gray-700",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`group relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  theme === opt.value
                    ? `border-blue-600 ring-2 ${opt.ring}`
                    : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                } ${opt.bg}`}
              >
                {/* Preview circle */}
                <span
                  className={`w-9 h-9 rounded-full border-2 border-inherit flex items-center justify-center ${
                    opt.value === "system"
                      ? "bg-gradient-to-tr from-white to-gray-800"
                      : opt.value === "dark"
                        ? "bg-gray-800"
                        : "bg-gray-100"
                  }`}
                >
                  {opt.value !== "system" && (
                    <span
                      className={`w-3.5 h-3.5 rounded-full ${opt.dot}`}
                    />
                  )}
                  {opt.value === "system" && (
                    <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-gray-800 to-white" />
                  )}
                </span>
                <span
                  className={`text-xs font-medium ${opt.text}`}
                >
                  {opt.label}
                </span>
                {theme === opt.value && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                    &#10003;
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Font size + compact mode */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-md">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Font Size
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "small" as const, label: "Small", size: "text-xs" },
                  {
                    value: "medium" as const,
                    label: "Medium",
                    size: "text-sm",
                  },
                  { value: "large" as const, label: "Large", size: "text-base" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFontSize(opt.value)}
                  className={`rounded-lg border-2 p-2.5 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    fontSize === opt.value
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                  }`}
                >
                  <span className={`${opt.size} font-medium`}>Aa</span>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end pb-1">
            <Toggle
              enabled={compactMode}
              onChange={setCompactMode}
              label="Compact Mode"
              description="Reduce spacing for a denser layout."
            />
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  6. Security                                                 */}
      {/* ============================================================ */}
      <Section
        title="Security"
        description="Manage your password, two-factor authentication, and active sessions."
      >
        <div className="space-y-6 max-w-lg">
          {/* Change password */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Change Password
            </p>
            <div className="space-y-3">
              <Input
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Current password"
              />
              <Input
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="New password"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          {/* Two-factor auth */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Two-Factor Authentication
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {twoFactorEnabled
                  ? "Your account is protected with 2FA."
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                twoFactorEnabled
                  ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                  : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
              }`}
            >
              {twoFactorEnabled ? "Disable" : "Enable"}
            </button>
          </div>

          {/* Active sessions */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Active Sessions
            </p>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Browser
                    </th>
                    <th className="hidden sm:table-cell px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      IP Address
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Last Active
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {activeSessionsList.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          {session.current && (
                            <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                              Current
                            </span>
                          )}
                          {session.browser}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">
                        {session.ip}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {session.lastActive}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!session.current ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(session.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:red-300 transition-colors focus:outline-none focus-visible:underline"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  7. Danger Zone                                              */}
      {/* ============================================================ */}
      <Section
        title="Danger Zone"
        description="Irreversible and destructive actions. Please proceed with caution."
      >
        <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 p-5 space-y-4 max-w-lg">
          {/* Export data */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Export All Data
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Download a copy of all your data in JSON format.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Export
            </button>
          </div>

          <hr className="border-red-200 dark:border-red-900/40" />

          {/* Delete account */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Delete Account
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              {showDeleteConfirm && (
                <div className="mt-3 rounded-md bg-red-100/70 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">
                    Are you sure? Click again to confirm deletion.
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                showDeleteConfirm
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-red-300 bg-white text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/30"
              }`}
            >
              {showDeleteConfirm ? "Confirm Deletion" : "Delete Account"}
            </button>
          </div>
        </div>
      </Section>

      {/* Anchor for scroll-to-bottom on save */}
      <div ref={formEndRef} />

      {/* ============================================================ */}
      {/*  Fixed save bar                                               */}
      {/* ============================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 animate-in fade-in duration-300">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              Changes saved successfully
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {saving && (
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
