/**
 * Central exports for @/lib.
 */

// Core utilities
export {
  formatRelativeTime,
  truncate,
  shortId,
  debounce,
  cn,
  isBrowser,
  isServer,
  getBaseUrl,
  pluralize,
} from "./utils";

export {
  isValidEmail,
  isValidUrl,
  isValidUuid,
  sanitizeHtml,
  isBlank,
  clamp,
  slugify,
} from "./validators";

export {
  formatNumber,
  formatBytes,
  formatDuration,
  formatDate,
  formatPercent,
} from "./formatters";

export { generateUuid, randomString, hashString } from "./crypto";
export { env, envNumber, envBool, requireEnv } from "./env";

// App-specific
export * from "./constants";
export * from "./error-logger";
export * from "./performance";
export * from "./api-middleware";
export * from "./validation";
export * from "./api-logger";
export * from "./notifications";
