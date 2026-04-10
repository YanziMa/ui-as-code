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

// Data utilities
export { isToday, isYesterday, startOfDay, endOfDay, timeAgoLabel, toISODate } from "./date";
export { chunk, unique, groupBy, sortBy, flatten, times } from "./array";
export { createId } from "./id";
export {
  capitalize,
  toTitleCase,
  camelToKebab,
  kebabToCamel,
  truncateMiddle,
  maskEmail,
  maskString,
  isJsonString,
  repeat,
  stripHtml,
} from "./string";
export {
  round,
  clamp as numClamp,
  lerp,
  mapRange,
  formatBytes as formatBytesNum,
  formatCompact,
  percentOf,
  randomInt,
  approximately,
  parseNumber,
} from "./number";
export {
  deepClone,
  pick,
  omit,
  isEmpty as isObjEmpty,
  get,
  set as setPath,
  deepMerge,
  deepFreeze,
} from "./object";
export {
  stringToColor,
  generatePalette,
  hslToHex,
  lighten,
  darken,
  getContrastColor,
  lerpColor,
  STATUS_COLORS,
  type StatusColor,
} from "./color";

// Security
export {
  generateNonce,
  isBot,
  rateLimit,
  cleanupRateLimits,
  isAllowedOrigin,
  sanitizeFilename,
} from "./security";

// Browser utilities
export {
  qs, qsa, createElement,
  on as onEvent, domReady, isVisible, getStyle, scrollIntoView,
  copyToClipboard, downloadFile,
} from "./dom";
export {
  parseQueryString, buildQueryString, fetchWithTimeout, isOnline,
  getConnectionType, parseContentRange, buildUrl,
} from "./network";
export {
  SHORTCUTS, formatShortcut, matchesShortcut, getShortcutsByCategory,
  type Shortcut,
} from "./keyboard";
