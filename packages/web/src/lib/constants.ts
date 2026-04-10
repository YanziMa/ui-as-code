/**
 * Application constants.
 */

export const APP_NAME = "UI-as-Code";
export const APP_VERSION = "0.2.0";
export const APP_URL = "https://ui-as-code-web.vercel.app";
export const GITHUB_URL = "https://github.com/YanziMa/ui-as-code";

/** Default pagination */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Rate limit defaults (ms) */
export const RATE_LIMIT_WINDOW = 60_000; // 1 minute
export const RATE_LIMIT_DEFAULT_MAX = 30;
export const RATE_LIMIT_AI_MAX = 5; // AI calls are expensive

/** Cache durations (seconds) */
export const CACHE_SHORT = 30; // 30s
export const CACHE_MEDIUM = 120; // 2min
export const CACHE_LONG = 3600; // 1h
export const CACHE_STATIC = 86400; // 24h

/** Timeout defaults (ms) */
export const TIMEOUT_API = 15_000;
export const TIMEOUT_AI = 90_000; // AI can be slow
export const TIMEOUT_UPLOAD = 30_000;

/** UI constants */
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MIN_DESCRIPTION_LENGTH = 3;
export const DEBOUNCE_SEARCH_MS = 300;

/** Status badge colors */
export const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  merged: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

/** Vote type labels */
export const VOTE_LABELS = {
  for: "Support",
  against: "Oppose",
} as const;

/** Event types for webhooks */
export const WEBHOOK_EVENTS = [
  "pr:created",
  "pr:merged",
  "pr:closed",
  "friction:created",
  "vote:cast",
] as const;
