import SettingsClient from "./settings-client";

export const metadata = {
  title: "Settings - UI as Code",
  description: "Manage your account settings, preferences, and security.",
};

/* ------------------------------------------------------------------ */
/*  Server-side data definitions                                       */
/* ------------------------------------------------------------------ */

const profileData = {
  name: "Alex Chen",
  email: "alex.chen@example.com",
  role: "Pro Member",
  avatar: null,
  emailVerified: true,
};

const timezones = [
  { value: "UTC", label: "(UTC+00:00) Coordinated Universal Time" },
  { value: "America/New_York", label: "(UTC-05:00) Eastern Time" },
  { value: "America/Chicago", label: "(UTC-06:00) Central Time" },
  { value: "America/Denver", label: "(UTC-07:00) Mountain Time" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time" },
  { value: "Europe/London", label: "(UTC+00:00) London" },
  { value: "Europe/Paris", label: "(UTC+01:00) Paris" },
  { value: "Asia/Shanghai", label: "(UTC+08:00) China Standard Time" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Japan Standard Time" },
  { value: "Australia/Sydney", label: "(UTC+10:00) Sydney" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文 (Chinese)" },
  { value: "ja", label: "日本語 (Japanese)" },
];

const aiModels = [
  { value: "claude-sonnet", label: "Claude Sonnet 4" },
  { value: "claude-haiku", label: "Claude Haiku 3.5" },
  { value: "gpt-4o", label: "GPT-4o" },
];

const activeSessions = [
  { id: "1", browser: "Chrome on Windows", ip: "192.168.1.100", lastActive: "2 minutes ago", current: true },
  { id: "2", browser: "Safari on macOS", ip: "10.0.0.42", lastActive: "3 hours ago", current: false },
  { id: "3", browser: "Firefox on Linux", ip: "172.16.0.5", lastActive: "2 days ago", current: false },
];

/* ------------------------------------------------------------------ */
/*  Server Component — the page                                        */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Page header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your account, preferences, editor configuration, and security settings.
          </p>
        </div>
      </div>

      {/* Form content */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-32">
        <SettingsClient
          profile={profileData}
          timezones={timezones}
          languages={languages}
          aiModels={aiModels}
          sessions={activeSessions}
        />
      </div>
    </main>
  );
}
