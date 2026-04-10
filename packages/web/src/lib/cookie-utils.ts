/**
 * @fileoverview Comprehensive cookie management utilities for browser environments.
 * Provides CRUD operations, security validation, consent tracking, sub-cookie storage,
 * change detection, analytics, cross-subdomain sync, and legacy format support.
 *
 * All operations use the `document.cookie` API. This is a pure TypeScript library
 * with no framework dependencies.
 *
 * @module cookie-utils
 */

// ---------------------------------------------------------------------------
// 1. Types & Interfaces
// ---------------------------------------------------------------------------

/** SameSite attribute values */
export type SameSiteValue = 'Strict' | 'Lax' | 'None';

/** Cookie category for consent management */
export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

/** Consent preference map keyed by category */
export type ConsentPreferences = Record<CookieCategory, boolean>;

/** Full set of attributes that can be applied when setting a cookie */
export interface CookieAttributes {
  /** URL path scope (default: '/') */
  path?: string;
  /** Domain scope (must include at least two dots for TLD+1) */
  domain?: string;
  /** Absolute expiry date (ISO string or Date) */
  expires?: string | Date;
  /** Relative max-age in seconds (takes precedence over `expires`) */
  maxAge?: number;
  /** Restrict to HTTPS only */
  secure?: boolean;
  /** Prevent JavaScript access (server-set only; included here for API completeness) */
  httpOnly?: boolean;
  /** Cross-site request policy */
  sameSite?: SameSiteValue;
  /** CHIPS: partitioned cookie (third-party context isolation) */
  partitioned?: boolean;
}

/** A parsed cookie entry returned by `getAllCookies()` or `CookieJar` */
export interface ParsedCookie {
  name: string;
  value: string;
  attributes: Partial<CookieAttributes>;
  raw: string;
}

/** Sub-cookie key-value pair stored inside a single parent cookie */
export interface SubCookieEntry {
  key: string;
  value: string;
}

/** Change event emitted by cookie watchers */
export interface CookieChangeEvent {
  type: 'added' | 'modified' | 'removed';
  name: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: number;
}

/** Analytics record for a single read/write operation */
export interface CookieAccessRecord {
  name: string;
  action: 'read' | 'write' | 'delete';
  timestamp: number;
  size: number;
}

/** Analytics summary snapshot */
export interface CookieAnalyticsSummary {
  totalSizeBytes: number;
  cookieCount: number;
  accessLog: CookieAccessRecord[];
  unusedCookies: string[];
  lastAccessed: Map<string, number>;
}

/** Options for sub-cookie encoding */
export interface SubCookieOptions {
  compress?: boolean;
  separator?: string;
}

/** Configuration for a CookieJar instance */
export interface CookieJarConfig {
  prefix?: string;
  defaultAttributes?: CookieAttributes;
  maxSizePerCookie?: number;
}

/** Result of a validation check */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum size per cookie (browser limit ~4096 bytes) */
export const MAX_COOKIE_SIZE = 4096;

/** Maximum number of cookies per domain (RFC minimum; browsers allow more) */
export const MAX_COOKIES_PER_DOMAIN = 50;

/** Default cookie path */
export const DEFAULT_PATH = '/';

/** Default sub-cookie separator */
export const DEFAULT_SUBCOOKIE_SEPARATOR = '&';

/** Rolling cookie default extension in seconds (7 days) */
export const DEFAULT_ROLLING_EXTEND_SECONDS = 60 * 60 * 24 * 7;

// ---------------------------------------------------------------------------
// 2. Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Encode a value so it is safe inside a cookie string.
 * Handles special characters that would break the cookie header.
 */
function encodeValue(value: string): string {
  try {
    return encodeURIComponent(value).replace(/%(2[346BF]|3B|40|5B|5D)/g, decodeURIComponent);
  } catch {
    return value;
  }
}

/**
 * Decode a previously encoded cookie value.
 */
function decodeValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Build the attribute portion of a Set-Cookie string from a `CookieAttributes` object.
 */
function buildAttributeString(attrs: CookieAttributes): string {
  const parts: string[] = [];

  if (attrs.path) parts.push(`Path=${attrs.path}`);
  if (attrs.domain) parts.push(`Domain=${attrs.domain}`);
  if (attrs.maxAge !== undefined && attrs.maxAge !== null) {
    parts.push(`Max-Age=${Math.floor(attrs.maxAge)}`);
  } else if (attrs.expires) {
    const exp = typeof attrs.expires === 'string' ? attrs.expires : attrs.expires.toUTCString();
    parts.push(`Expires=${exp}`);
  }
  if (attrs.secure) parts.push('Secure');
  if (attrs.httpOnly) parts.push('HttpOnly');
  if (attrs.sameSite) parts.push(`SameSite=${attrs.sameSite}`);
  if (attrs.partitioned) parts.push('Partitioned');

  return parts.length > 0 ? '; ' + parts.join('; ') : '';
}

/**
 * Parse a raw cookie string into a `ParsedCookie` object.
 * Extracts name, value, and any recognizable attributes.
 */
function parseRawCookie(raw: string): ParsedCookie {
  const semiIndex = raw.indexOf(';');
  const nvPart = semiIndex === -1 ? raw : raw.substring(0, semiIndex);
  const attrPart = semiIndex === -1 ? '' : raw.substring(semiIndex + 1);

  const eqIndex = nvPart.indexOf('=');
  const name = eqIndex === -1 ? nvPart.trim() : nvPart.substring(0, eqIndex).trim();
  const value = eqIndex === -1 ? '' : decodeValue(nvPart.substring(eqIndex + 1).trim());

  const attributes: Partial<CookieAttributes> = {};
  attrPart.split(';').forEach((attr) => {
    const trimmed = attr.trim();
    if (!trimmed) return;
    const [k, v] = trimmed.split('=');
    const key = k?.trim().toLowerCase();
    const val = v?.trim();

    switch (key) {
      case 'path':
        attributes.path = val;
        break;
      case 'domain':
        attributes.domain = val;
        break;
      case 'expires':
        attributes.expires = val;
        break;
      case 'max-age':
        attributes.maxAge = parseInt(val ?? '0', 10);
        break;
      case 'secure':
        attributes.secure = true;
        break;
      case 'httponly':
        attributes.httpOnly = true;
        break;
      case 'samesite':
        if (val === 'Strict' || val === 'Lax' || val === 'None') {
          attributes.sameSite = val;
        }
        break;
      case 'partitioned':
        attributes.partitioned = true;
        break;
    }
  });

  return { name, value, attributes, raw };
}

// ---------------------------------------------------------------------------
// 3. Cookie CRUD
// ---------------------------------------------------------------------------

/**
 * Set a cookie with the given name, value, and optional attributes.
 *
 * @example
 * ```ts
 * setCookie('theme', 'dark', { secure: true, sameSite: 'Lax', maxAge: 86400 });
 * ```
 */
export function setCookie(
  name: string,
  value: string,
  attributes: CookieAttributes = {},
): boolean {
  if (typeof document === 'undefined') return false;

  const validation = validateCookieValue(name, value);
  if (!validation.valid) {
    console.warn(`[cookie-utils] setCookie rejected: ${validation.reason}`);
    return false;
  }

  const cookieString = `${encodeValue(name)}=${encodeValue(value)}${buildAttributeString(attributes)}`;

  // Rough size check before writing
  if (cookieString.length > MAX_COOKIE_SIZE) {
    console.warn(
      `[cookie-utils] setCookie rejected: cookie "${name}" exceeds ${MAX_COOKIE_SIZE} bytes (${cookieString.length})`,
    );
    return false;
  }

  try {
    document.cookie = cookieString;
    return hasCookie(name);
  } catch (err) {
    console.warn(`[cookie-utils] setCookie error:`, err);
    return false;
  }
}

/**
 * Get the value of a single cookie by name. Returns `null` if not found.
 *
 * @example
 * ```ts
 * const theme = getCookie('theme'); // "dark" | null
 * ```
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const escapedName = name.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$&');
  const regex = new RegExp(`(?:^|;)\\s*${escapedName}\\s*=\\s*([^;]*)`);
  const match = document.cookie.match(regex);
  return match ? decodeValue(match[1]) : null;
}

/**
 * Delete a cookie by name. Must match the original `path` and `domain`
 * to ensure the correct cookie is removed.
 *
 * @example
 * ```ts
 * deleteCookie('session_id', { path: '/', domain: '.example.com' });
 * ```
 */
export function deleteCookie(name: string, attributes: Pick<CookieAttributes, 'path' | 'domain'> = {}): boolean {
  if (typeof document === 'undefined') return false;

  const deleteAttrs: CookieAttributes = {
    ...attributes,
    expires: new Date(0),
    maxAge: -1,
  };

  try {
    document.cookie = `${encodeValue(name)}=;${buildAttributeString(deleteAttrs)}`;
    return !hasCookie(name);
  } catch {
    return false;
  }
}

/**
 * Check whether a cookie with the given name exists.
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

/**
 * Parse and return all cookies accessible in the current context as an array of `ParsedCookie`.
 */
export function getAllCookies(): ParsedCookie[] {
  if (typeof document === 'undefined') return [];

  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map(parseRawCookie);
}

/**
 * Return all cookies as a plain `Record<string, string>`.
 */
export function getCookiesAsMap(): Record<string, string> {
  const map: Record<string, string> = {};
  getAllCookies().forEach((c) => {
    map[c.name] = c.value;
  });
  return map;
}

// ---------------------------------------------------------------------------
// 4. Cookie Types (Session / Persistent / Rolling)
// ---------------------------------------------------------------------------

/**
 * Set a **session cookie** — no expiry, deleted when the browser closes.
 */
export function setSessionCookie(name: string, value: string, attributes: Omit<CookieAttributes, 'expires' | 'maxAge'> = {}): boolean {
  return setCookie(name, value, { ...attributes, path: attributes.path ?? DEFAULT_PATH });
}

/**
 * Set a **persistent cookie** with an absolute or relative expiration.
 *
 * @param ttlSeconds - Time-to-live in seconds from now.
 */
export function setPersistentCookie(
  name: string,
  value: string,
  ttlSeconds: number,
  attributes: Omit<CookieAttributes, 'expires' | 'maxAge'> = {},
): boolean {
  return setCookie(name, value, {
    ...attributes,
    maxAge: ttlSeconds,
    path: attributes.path ?? DEFAULT_PATH,
  });
}

/**
 * Set a **rolling cookie** whose expiry is extended on every read/write access.
 * Call `extendRollingCookie()` periodically (or on each page load) to keep it alive.
 *
 * @param extendSeconds - How far to push the expiry forward on each extension.
 */
export function setRollingCookie(
  name: string,
  value: string,
  extendSeconds: number = DEFAULT_ROLLING_EXTEND_SECONDS,
  attributes: Omit<CookieAttributes, 'expires' | 'maxAge'> = {},
): boolean {
  return setCookie(name, value, {
    ...attributes,
    maxAge: extendSeconds,
    path: attributes.path ?? DEFAULT_PATH,
  });
}

/**
 * Extend the lifetime of a rolling cookie without changing its value.
 * Returns `true` if the cookie existed and was refreshed.
 */
export function extendRollingCookie(
  name: string,
  extendSeconds: number = DEFAULT_ROLLING_EXTEND_SECONDS,
  attributes: Omit<CookieAttributes, 'expires' | 'maxAge'> = {},
): boolean {
  const current = getCookie(name);
  if (current === null) return false;
  return setRollingCookie(name, current, extendSeconds, attributes);
}

// ---------------------------------------------------------------------------
// 5. Cookie Jar – Group Management
// ---------------------------------------------------------------------------

/**
 * A `CookieJar` manages a logical group of cookies under an optional shared prefix.
 * Supports batch operations, serialization, and deserialization of state.
 */
export class CookieJar {
  private _prefix: string;
  private _defaults: CookieAttributes;
  private _maxSize: number;

  constructor(config: CookieJarConfig = {}) {
    this._prefix = config.prefix ?? '';
    this._defaults = config.defaultAttributes ?? {};
    this._maxSize = config.maxSizePerCookie ?? MAX_COOKIE_SIZE;
  }

  private fullName(name: string): string {
    return this._prefix ? `${this._prefix}:${name}` : name;
  }

  /**
   * Set a single cookie within the jar.
   */
  set(name: string, value: string, overrides?: CookieAttributes): boolean {
    return setCookie(this.fullName(name), value, { ...this._defaults, ...overrides });
  }

  /**
   * Get a single cookie from the jar.
   */
  get(name: string): string | null {
    return getCookie(this.fullName(name));
  }

  /**
   * Remove a single cookie from the jar.
   */
  remove(name: string): boolean {
    return deleteCookie(this.fullName(name), this._defaults);
  }

  /**
   * Check existence of a cookie in the jar.
   */
  has(name: string): boolean {
    return hasCookie(this.fullName(name));
  }

  /**
   * Batch-set multiple cookies at once.
   * Returns a map of name -> success boolean.
   */
  batchSet(entries: Record<string, string>, overrides?: CookieAttributes): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(entries)) {
      results[key] = this.set(key, val, overrides);
    }
    return results;
  }

  /**
   * Batch-delete multiple cookies at once.
   */
  batchRemove(names: string[]): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    for (const name of names) {
      results[name] = this.remove(name);
    }
    return results;
  }

  /**
   * Clear all cookies belonging to this jar.
   */
  clearAll(): void {
    const all = getAllCookies();
    all.forEach((c) => {
      if (this._prefix && c.name.startsWith(`${this._prefix}:`)) {
        deleteCookie(c.name, this._defaults);
      } else if (!this._prefix) {
        deleteCookie(c.name, this._defaults);
      }
    });
  }

  /**
   * Serialize the jar's cookies into a JSON-serializable state object.
   */
  serialize(): Record<string, string> {
    const state: Record<string, string> = {};
    const all = getAllCookies();
    all.forEach((c) => {
      if (this._prefix && c.name.startsWith(`${this._prefix}:`)) {
        const shortName = c.name.substring(this._prefix.length + 1);
        state[shortName] = c.value;
      } else if (!this._prefix) {
        state[c.name] = c.value;
      }
    });
    return state;
  }

  /**
   * Restore cookies from a previously serialized state.
   */
  deserialize(state: Record<string, string>): void {
    for (const [name, value] of Object.entries(state)) {
      this.set(name, value);
    }
  }

  /**
   * List all cookie names currently held in this jar.
   */
  listNames(): string[] {
    const names: string[] = [];
    const all = getAllCookies();
    all.forEach((c) => {
      if (this._prefix && c.name.startsWith(`${this._prefix}:`)) {
        names.push(c.name.substring(this._prefix.length + 1));
      } else if (!this._prefix) {
        names.push(c.name);
      }
    });
    return names;
  }
}

// ---------------------------------------------------------------------------
// 6. Cookie Consent Management
// ---------------------------------------------------------------------------

/** Default consent preferences (only necessary allowed until user opts in) */
const DEFAULT_CONSENT: ConsentPreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

/** In-memory registry mapping cookie names to categories */
const cookieCategoryRegistry: Map<string, CookieCategory> = new Map();

let currentConsent: ConsentPreferences = { ...DEFAULT_CONSENT };

/**
 * Register a cookie name under a specific consent category.
 * Registered cookies will be subject to consent enforcement.
 */
export function registerCookieForConsent(name: string, category: CookieCategory): void {
  cookieCategoryRegistry.set(name, category);
}

/**
 * Unregister a cookie from consent tracking.
 */
export function unregisterCookieFromConsent(name: string): void {
  cookieCategoryRegistry.delete(name);
}

/**
 * Get the registered category for a cookie name.
 */
export function getCookieCategory(name: string): CookieCategory | undefined {
  return cookieCategoryRegistry.get(name);
}

/**
 * Update the user's global consent preferences.
 * Optionally persist them to a cookie itself (necessary-only).
 */
export function setConsentPreferences(preferences: Partial<ConsentPreferences>, persist = true): ConsentPreferences {
  currentConsent = { ...currentConsent, ...preferences };

  if (persist) {
    setCookie('__cookie_consent', JSON.stringify(currentConsent), {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });
  }

  return { ...currentConsent };
}

/**
 * Retrieve the current consent preferences.
 * If `restore` is true, attempts to load persisted preferences first.
 */
export function getConsentPreferences(restore = true): ConsentPreferences {
  if (restore) {
    const saved = getCookie('__cookie_consent');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<ConsentPreferences>;
        currentConsent = { ...DEFAULT_CONSENT, ...parsed };
      } catch {
        // ignore corrupt data
      }
    }
  }
  return { ...currentConsent };
}

/**
 * Check whether setting a cookie with the given name is permitted under current consent.
 * Cookies in the `necessary` category are always allowed.
 */
export function isCookieAllowed(name: string): boolean {
  const category = cookieCategoryRegistry.get(name);
  if (!category || category === 'necessary') return true;
  return !!currentConsent[category];
}

/**
 * Consent-aware wrapper around `setCookie`. Silently rejects disallowed cookies.
 */
export function setCookieWithConsent(
  name: string,
  value: string,
  attributes: CookieAttributes = {},
  category?: CookieCategory,
): boolean {
  if (category) {
    registerCookieForConsent(name, category);
  }
  if (!isCookieAllowed(name)) {
    console.info(`[cookie-utils] Cookie "${name}" blocked by consent (category: ${cookieCategoryRegistry.get(name) ?? 'unknown'})`);
    return false;
  }
  return setCookie(name, value, attributes);
}

/**
 * Remove all cookies that belong to disallowed categories based on current consent.
 * Useful for revoking consent after the fact.
 */
export function enforceConsentRemoval(): number {
  let removed = 0;
  const all = getAllCookies();
  all.forEach((c) => {
    const cat = cookieCategoryRegistry.get(c.name);
    if (cat && cat !== 'necessary' && !currentConsent[cat]) {
      if (deleteCookie(c.name)) removed++;
    }
  });
  return removed;
}

// ---------------------------------------------------------------------------
// 7. Cookie Security
// ---------------------------------------------------------------------------

/**
 * Validate a cookie name-value pair against security rules:
 * - Name must be non-empty and not contain control characters.
 * - Value must not exceed `MAX_COOKIE_SIZE`.
 * - Value must not contain suspicious patterns (script tags, CRLF injection).
 */
export function validateCookieValue(name: string, value: string): ValidationResult {
  if (!name || name.length === 0) {
    return { valid: false, reason: 'Cookie name must not be empty' };
  }

  if (/[\x00-\x1f\x7f]/.test(name)) {
    return { valid: false, reason: 'Cookie name contains control characters' };
  }

  if (value.length > MAX_COOKIE_SIZE) {
    return { valid: false, reason: `Value exceeds maximum size of ${MAX_COOKIE_SIZE} bytes` };
  }

  // Detect script-injection patterns
  if (/<\/?[\w\s]*>|javascript:/i.test(value)) {
    return { valid: false, reason: 'Value contains potential script injection' };
  }

  // Detect CRLF injection (cookie header splitting)
  if (/\r\n/.test(value)) {
    return { valid: false, reason: 'Value contains CRLF sequence (possible header injection)' };
  }

  // Detect cookie tossing indicators (domain-confusion patterns)
  if (/^__host\-|^__secure\-/.test(name) && !isSecureContext()) {
    return { valid: false, reason: 'Prefix cookie requires secure context' };
  }

  return { valid: true };
}

/**
 * Detect whether a cookie name looks like a potential cookie-tossing target
 * (commonly abused names used across domains for fingerprinting/tossing attacks).
 */
export function isSuspiciousCookieName(name: string): boolean {
  const suspiciousPatterns = [
    /^__utm/,       // Google Analytics legacy
    /^_ga$/,        // Google Analytics
    /^_fbp$/,       // Facebook Pixel
    /^_gid$/,       // Google Analytics
    /^__cfduid$/,   // Cloudflare
    /^__utmt$/,
    /^_pk_/,        // Matomo
    /^AWECN/,       // AdTech
    /^fr$/,         // Facebook
    /^sid$/i,       // Generic session ID (often tossed)
  ];
  return suspiciousPatterns.some((re) => re.test(name));
}

/**
 * Attempt to detect cookie tossing by checking if a cookie appears to have been
 * set by a different origin than expected. This is a heuristic — full detection
 * requires server-side cooperation.
 *
 * Heuristics used:
 * - Cookie has a domain attribute broader than the current origin.
 * - Cookie name matches known third-party tracker patterns.
 */
export function detectCookieTossing(cookie: ParsedCookie): { risk: 'low' | 'medium' | 'high'; reasons: string[] } {
  const reasons: string[] = [];

  if (isSuspiciousCookieName(cookie.name)) {
    reasons.push('Name matches known third-party/tracker pattern');
  }

  if (cookie.attributes.domain && !isOwnDomain(cookie.attributes.domain)) {
    reasons.push(`Domain "${cookie.attributes.domain}" does not match current origin`);
  }

  if (cookie.value.length > 2000) {
    reasons.push('Unusually large cookie value (potential data exfiltration)');
  }

  if (reasons.length === 0) return { risk: 'low', reasons: [] };
  if (reasons.length >= 2) return { risk: 'high', reasons };
  return { risk: 'medium', reasons };
}

/**
 * Calculate total cookie storage usage for the current domain.
 * Returns total bytes and count.
 */
export function measureTotalCookieSize(): { totalBytes: number; count: number; cookies: Array<{ name: string; size: number }> } {
  const all = getAllCookies();
  let totalBytes = 0;
  const cookies = all.map((c) => {
    const size = new Blob([c.raw]).size;
    totalBytes += size;
    return { name: c.name, size };
  });
  return { totalBytes, count: all.length, cookies };
}

/**
 * Check if the current page context is secure (HTTPS or localhost).
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.isSecureContext === true ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/**
 * Check if a domain string belongs to the current page's origin.
 */
export function isOwnDomain(domain: string): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === domain || hostname.endsWith('.' + domain);
}

// ---------------------------------------------------------------------------
// 8. Sub-Cookie Storage
// ---------------------------------------------------------------------------

/**
 * Store multiple key-value pairs inside a single parent cookie using JSON encoding.
 * Optional lightweight compression via deduplication of repeated prefixes.
 *
 * @param parentName - The name of the parent cookie.
 * @param entries - Key-value pairs to store.
 * @param options - Encoding options.
 */
export function setSubCookies(
  parentName: string,
  entries: SubCookieEntry[],
  options: SubCookieOptions = {},
): boolean {
  const separator = options.separator ?? DEFAULT_SUBCOOKIE_SEPARATOR;

  const obj: Record<string, string> = {};
  entries.forEach((e) => {
    obj[e.key] = e.value;
  });

  let json = JSON.stringify(obj);

  if (options.compress) {
    json = compressSubCookieJson(json);
  }

  return setCookie(parentName, json);
}

/**
 * Retrieve all sub-cookies from a parent cookie.
 * Returns an empty object if the parent does not exist or contains invalid JSON.
 */
export function getSubCookies(parentName: string): Record<string, string> {
  const raw = getCookie(parentName);
  if (raw === null) return {};

  try {
    let json = raw;
    // Try decompression if it looks compressed
    if (json.startsWith('z:')) {
      json = decompressSubCookieJson(json);
    }
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Get a single sub-cookie value by key.
 */
export function getSubCookie(parentName: string, key: string): string | null {
  const all = getSubCookies(parentName);
  return key in all ? all[key] : null;
}

/**
 * Set or update a single sub-cookie key within a parent cookie.
 * Merges with existing sub-cookies.
 */
export function updateSubCookie(parentName: string, key: string, value: string, options?: SubCookieOptions): boolean {
  const existing = getSubCookies(parentName);
  existing[key] = value;
  const entries: SubCookieEntry[] = Object.entries(existing).map(([k, v]) => ({ key: k, value: v }));
  return setSubCookies(parentName, entries, options);
}

/**
 * Remove a single sub-cookie key while preserving others.
 */
export function removeSubCookie(parentName: string, key: string, options?: SubCookieOptions): boolean {
  const existing = getSubCookies(parentName);
  if (!(key in existing)) return true;
  delete existing[key];
  const entries: SubCookieEntry[] = Object.entries(existing).map(([k, v]) => ({ key: k, value: v }));
  return setSubCookies(parentName, entries, options);
}

/**
 * Very simple compression for sub-cookie JSON: replace repeated key prefixes
 * with back-references. Not a general-purpose compressor — just saves space when
 * many keys share a common prefix (e.g., "pref_theme", "pref_lang").
 */
function compressSubCookieJson(json: string): string {
  try {
    const obj = JSON.parse(json) as Record<string, string>;
    const keys = Object.keys(obj);
    if (keys.length < 2) return `z:${json}`;

    // Find longest common prefix among keys
    let prefix = keys[0];
    for (let i = 1; i < keys.length; i++) {
      let j = 0;
      while (j < prefix.length && j < keys[i].length && prefix[j] === keys[i][j]) j++;
      prefix = prefix.substring(0, j);
      if (prefix.length === 0) break;
    }

    if (prefix.length < 2) return `z:${json}`;

    const compressed: Record<string, string> = { _p: prefix };
    for (const [k, v] of Object.entries(obj)) {
      compressed[k.substring(prefix.length)] = v;
    }
    return `z:${JSON.stringify(compressed)}`;
  } catch {
    return `z:${json}`;
  }
}

/**
 * Decompress a sub-cookie JSON string produced by `compressSubCookieJson`.
 */
function decompressSubCookieJson(compressed: string): string {
  try {
    const inner = compressed.substring(2); // strip "z:"
    const obj = JSON.parse(inner) as Record<string, string>;
    const prefix = obj._p ?? '';
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '_p') continue;
      result[prefix + k] = v;
    }
    return JSON.stringify(result);
  } catch {
    // Fallback: return raw after stripping prefix marker
    return compressed.startsWith('z:') ? compressed.substring(2) : compressed;
  }
}

// ---------------------------------------------------------------------------
// 9. Cookie Change Detection
// ---------------------------------------------------------------------------

/**
 * Polling-based cookie watcher. Periodically compares the current cookie state
 * to a baseline snapshot and emits callbacks for detected changes.
 */
export class CookiePollingWatcher {
  private _baseline: string;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _onChange: (event: CookieChangeEvent) => void;
  private _intervalMs: number;

  constructor(onChange: (event: CookieChangeEvent) => void, intervalMs: number = 1000) {
    this._onChange = onChange;
    this._intervalMs = intervalMs;
    this._baseline = typeof document !== 'undefined' ? document.cookie : '';
  }

  /** Start watching. */
  start(): void {
    if (this._intervalId !== null) return;
    this._intervalId = setInterval(() => this._poll(), this._intervalMs);
  }

  /** Stop watching. */
  stop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /** Force an immediate poll. */
  poll(): void {
    this._poll();
  }

  private _poll(): void {
    if (typeof document === 'undefined') return;
    const current = document.cookie;
    if (current === this._baseline) return;

    const oldMap = parseCookieMap(this._baseline);
    const newMap = parseCookieMap(current);

    // Detect additions & modifications
    for (const [name, newValue] of Object.entries(newMap)) {
      const oldValue = oldMap[name];
      if (oldValue === undefined) {
        this._onChange({ type: 'added', name, oldValue: null, newValue, timestamp: Date.now() });
      } else if (oldValue !== newValue) {
        this._onChange({ type: 'modified', name, oldValue, newValue, timestamp: Date.now() });
      }
    }

    // Detect removals
    for (const name of Object.keys(oldMap)) {
      if (!(name in newMap)) {
        this._onChange({ type: 'removed', name, oldValue: oldMap[name], newValue: null, timestamp: Date.now() });
      }
    }

    this._baseline = current;
  }
}

/**
 * Parse a `document.cookie` string into a name->value map.
 */
function parseCookieMap(cookieStr: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieStr) return map;
  cookieStr.split(';').forEach((pair) => {
    const trimmed = pair.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const name = trimmed.substring(0, eqIdx).trim();
    const value = decodeValue(trimmed.substring(eqIdx + 1).trim());
    map[name] = value;
  });
  return map;
}

/**
 * MutationObserver-based cookie watcher.
 *
 * Since `document.cookie` changes don't trigger DOM mutations directly, this watcher
 * uses a creative approach: it observes `document` for attribute changes that may
 * indicate cookie-accessing code execution, combined with periodic micro-checks.
 *
 * For reliable change detection, prefer `CookiePollingWatcher`. This class provides
 * a complementary approach that can catch changes between polling intervals.
 */
export class CookieMutationWatcher {
  private observer: MutationObserver | null = null;
  private _lastKnown: string;
  private _onChange: (event: CookieChangeEvent) => void;
  private _pollHandle: ReturnType<typeof setTimeout> | null = null;
  private _pollInterval: number;

  constructor(onChange: (event: CookieChangeEvent) => void, pollInterval: number = 500) {
    this._onChange = onChange;
    this._pollInterval = pollInterval;
    this._lastKnown = typeof document !== 'undefined' ? document.cookie : '';
  }

  /** Start observing. */
  start(): void {
    if (typeof document === 'undefined' || this.observer !== null) return;

    this.observer = new MutationObserver(() => this._check());
    this.observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    // Also do periodic checks since cookie changes don't always cause DOM mutations
    this._schedulePoll();
  }

  /** Stop observing. */
  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this._pollHandle !== null) {
      clearTimeout(this._pollHandle);
      this._pollHandle = null;
    }
  }

  private _schedulePoll(): void {
    this._pollHandle = setTimeout(() => {
      this._check();
      this._schedulePoll();
    }, this._pollInterval);
  }

  private _check(): void {
    if (typeof document === 'undefined') return;
    const current = document.cookie;
    if (current === this._lastKnown) return;

    const oldMap = parseCookieMap(this._lastKnown);
    const newMap = parseCookieMap(current);

    for (const [name, newValue] of Object.entries(newMap)) {
      const oldValue = oldMap[name];
      if (oldValue === undefined) {
        this._onChange({ type: 'added', name, oldValue: null, newValue, timestamp: Date.now() });
      } else if (oldValue !== newValue) {
        this._onChange({ type: 'modified', name, oldValue, newValue, timestamp: Date.now() });
      }
    }
    for (const name of Object.keys(oldMap)) {
      if (!(name in newMap)) {
        this._onChange({ type: 'removed', name, oldValue: oldMap[name], newValue: null, timestamp: Date.now() });
      }
    }

    this._lastKnown = current;
  }
}

// ---------------------------------------------------------------------------
// 10. Cookie Analytics
// ---------------------------------------------------------------------------

/**
 * Lightweight analytics tracker for cookie read/write/delete operations.
 * Tracks access patterns, sizes, and can identify potentially unused cookies.
 */
export class CookieAnalytics {
  private _log: CookieAccessRecord[] = [];
  private _maxLogSize: number;
  private _accessCounts: Map<string, number> = new Map();
  private _lastAccessed: Map<string, number> = new Map();

  constructor(maxLogEntries: number = 500) {
    this._maxLogSize = maxLogEntries;
  }

  /** Record a cookie read. */
  recordRead(name: string): void {
    this._record(name, 'read');
  }

  /** Record a cookie write. */
  recordWrite(name: string, value: string): void {
    this._record(name, 'write', new Blob([value]).size);
  }

  /** Record a cookie deletion. */
  recordDelete(name: string): void {
    this._record(name, 'delete');
  }

  private _record(name: string, action: CookieAccessRecord['action'], size?: number): void {
    const record: CookieAccessRecord = {
      name,
      action,
      timestamp: Date.now(),
      size: size ?? 0,
    };

    this._log.push(record);
    if (this._log.length > this._maxLogSize) {
      this._log.shift();
    }

    this._accessCounts.set(name, (this._accessCounts.get(name) ?? 0) + 1);
    this._lastAccessed.set(name, Date.now());
  }

  /** Get a full summary of analytics data. */
  getSummary(): CookieAnalyticsSummary {
    const { totalBytes } = measureTotalCookieSize();
    const allNames = new Set(this._log.map((r) => r.name));
    const currentCookies = new Set(getAllCookies().map((c) => c.name));

    // Unused cookies: exist but were never accessed during tracking
    const unused: string[] = [];
    currentCookies.forEach((name) => {
      if (!this._accessCounts.has(name)) {
        unused.push(name);
      }
    });

    return {
      totalSizeBytes: totalBytes,
      cookieCount: currentCookies.size,
      accessLog: [...this._log],
      unusedCookies: unused,
      lastAccessed: new Map(this._lastAccessed),
    };
  }

  /** Get the most-frequently accessed cookies, sorted descending. */
  getTopAccessed(limit: number = 10): Array<{ name: string; count: number }> {
    return [...this._accessCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  /** Get cookies that haven't been accessed since a given timestamp. */
  getStaleCookies(sinceMs: number): string[] {
    const stale: string[] = [];
    this._lastAccessed.forEach((ts, name) => {
      if (ts < sinceMs) stale.push(name);
    });
    return stale;
  }

  /** Reset all tracked analytics. */
  reset(): void {
    this._log = [];
    this._accessCounts.clear();
    this._lastAccessed.clear();
  }
}

// Global analytics instance for convenience
export const cookieAnalytics = new CookieAnalytics();

// ---------------------------------------------------------------------------
// 11. First-Party vs Third-Party Detection
// ---------------------------------------------------------------------------

/**
 * Determine if a cookie was likely set by a first-party or third-party context.
 *
 * Uses heuristics:
 * - If the cookie's domain attribute matches the current page's hostname -> first-party.
 * - If the cookie has no domain attribute -> first-party (assumed set by current origin).
 * - If the cookie's domain is a parent/sibling domain -> ambiguous (likely first-party).
 * - Otherwise -> likely third-party.
 *
 * Note: True detection requires server-side `Set-Cookie` header inspection.
 * This is a best-effort client-side heuristic.
 */
export function detectCookieContext(cookie: ParsedCookie): 'first-party' | 'third-party' | 'ambiguous' {
  if (typeof window === 'undefined') return 'ambiguous';

  const currentHost = window.location.hostname;
  const cookieDomain = cookie.attributes.domain;

  // No domain attribute means it was set for the current origin (first-party)
  if (!cookieDomain) return 'first-party';

  // Exact match
  if (cookieDomain === currentHost) return 'first-party';

  // The cookie domain is a parent of the current host (e.g., ".example.com" vs "www.example.com")
  if (currentHost.endsWith(cookieDomain) || currentHost === cookieDomain.slice(1)) {
    return 'first-party'; // still same site
  }

  // Completely different domain
  if (!currentHost.endsWith(cookieDomain.replace(/^\./, ''))) {
    return 'third-party';
  }

  return 'ambiguous';
}

/**
 * Classify all current cookies into first-party and third-party buckets.
 */
export function classifyAllCookies(): { firstParty: ParsedCookie[]; thirdParty: ParsedCookie[]; ambiguous: ParsedCookie[] } {
  const result = { firstParty: [] as ParsedCookie[], thirdParty: [] as ParsedCookie[], ambiguous: [] as ParsedCookie[] };
  getAllCookies().forEach((c) => {
    const ctx = detectCookieContext(c);
    result[ctx].push(c);
  });
  return result;
}

// ---------------------------------------------------------------------------
// 12. Cookie Synchronization Across Subdomains
// ---------------------------------------------------------------------------

/**
 * Sync a cookie's value to all subdomains of the current root domain.
 * Sets the cookie on both the root domain and the current subdomain to ensure
 * availability across the domain tree.
 *
 * @param name - Cookie name.
 * @param value - Cookie value.
 * @param rootDomain - The root domain (e.g., "example.com"). If omitted, derived from location.
 * @param attrs - Additional cookie attributes.
 */
export function syncCookieAcrossSubdomains(
  name: string,
  value: string,
  rootDomain?: string,
  attrs: CookieAttributes = {},
): boolean {
  if (typeof window === 'undefined') return false;

  const domain = rootDomain ?? extractRootDomain(window.location.hostname);
  if (!domain) return false;

  // Set on explicit root domain (with leading dot for older browser compatibility)
  const rootResult = setCookie(name, value, {
    ...attrs,
    domain: '.' + domain,
    path: '/',
  });

  // Set on current host without domain attribute (ensures exact-origin match)
  const localResult = setCookie(name, value, {
    ...attrs,
    path: '/',
  });

  return rootResult && localResult;
}

/**
 * Extract the root domain (TLD+1) from a hostname.
 * Simple heuristic: take the last two dot-separated parts.
 * For complex TLDs (.co.uk, etc.) this may need refinement.
 */
export function extractRootDomain(hostname: string): string | null {
  const parts = hostname.split('.');
  if (parts.length < 2) return null;
  return parts.slice(-2).join('.');
}

/**
 * Sync all cookies matching a prefix to the specified root domain.
 */
export function syncJarAcrossSubdomains(jar: CookieJar, rootDomain?: string): Record<string, boolean> {
  const names = jar.listNames();
  const results: Record<string, boolean> = {};
  for (const name of names) {
    const value = jar.get(name);
    if (value !== null) {
      results[name] = syncCookieAcrossSubdomains(jar[name] ? name : name, value, rootDomain);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 13. Legacy Cookie Support
// ---------------------------------------------------------------------------

/**
 * Migrate a cookie from an old name/format to a new one.
 * Reads the old cookie, writes it with the new name, then deletes the old one.
 */
export function migrateCookie(oldName: string, newName: string, newAttrs?: CookieAttributes): boolean {
  const oldValue = getCookie(oldName);
  if (oldValue === null) return false; // nothing to migrate

  const success = setCookie(newName, oldValue, newAttrs);
  if (success) {
    deleteCookie(oldName);
  }
  return success;
}

/**
 * Handle legacy cookies that may have been set with non-standard encodings
 * (e.g., base64-encoded values, unescaped semicolons in values).
 * Attempts multiple decoding strategies before returning a usable value.
 */
export function getLegacyCookie(name: string): string | null {
  // Strategy 1: standard get
  const standard = getCookie(name);
  if (standard !== null) return standard;

  // Strategy 2: try finding by scanning raw cookie string for partial matches
  if (typeof document === 'undefined') return null;

  const raw = document.cookie;
  const pairs = raw.split(';');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    // Some legacy cookies embed extra semicolons in values (malformed but exist)
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const cookieName = trimmed.substring(0, eqIdx).trim();
    if (cookieName === name || decodeValue(cookieName) === name) {
      let value = trimmed.substring(eqIdx + 1).trim();
      // Try to decode
      try {
        value = decodeURIComponent(value);
      } catch {
        // leave as-is
      }
      // Try base64 decode if it looks like base64
      if (/^[A-Za-z0-9+/]+=*$/.test(value) && value.length > 16) {
        try {
          const decoded = atob(value);
          // Only use if the decoded result looks like printable text
          if (/^[\x20-\x7e\s]*$/.test(decoded)) {
            return decoded;
          }
        } catch {
          // not valid base64
        }
      }
      return value;
    }
  }

  return null;
}

/**
 * Normalize a cookie value that may contain legacy formatting issues:
 * - Trim whitespace.
 * - Unescape double-encoded values.
 * - Strip null bytes.
 */
export function normalizeLegacyValue(raw: string): string {
  let value = raw.trim();
  // Remove null bytes
  value = value.replace(/\x00/g, '');
  // Fix double-encoding
  try {
    let prev: string;
    let iterations = 0;
    do {
      prev = value;
      value = decodeURIComponent(value);
      iterations++;
    } while (value !== prev && iterations < 5);
  } catch {
    // use current value
  }
  return value;
}

/**
 * Detect cookies that appear to use legacy formats (unusual characters, old naming conventions).
 */
export function detectLegacyCookies(): ParsedCookie[] {
  const all = getAllCookies();
  const legacy: ParsedCookie[] = [];
  const legacyPatterns = [
    /^PHPSESSID$/i,
    /^JSESSIONID$/i,
    /^ASP\.NET_SessionId$/i,
    /^_requestid$/i,
    /^BCSI/i,
    /^NSC_/,
    /^RMID$/,
    /^CW$/,
    /^uvid$/i,
    /^SSID$/i,
    /^visid_inapp_/i,
  ];

  all.forEach((c) => {
    if (legacyPatterns.some((re) => re.test(c.name))) {
      legacy.push(c);
    }
    // Also flag cookies with unusual raw characters
    if (!legacy.includes(c) && /[^\x20-\x7e]/.test(c.value)) {
      legacy.push(c);
    }
  });

  return legacy;
}

// ---------------------------------------------------------------------------
// 14. Convenience Exports & Shortcuts
// ---------------------------------------------------------------------------

/**
 * One-liner: set a secure, HttpOnly-flagged (best-effort), SameSite=Lax cookie.
 * Note: `httpOnly` cannot actually be set from JavaScript (browser ignores it),
 * but it is included here for API completeness / documentation purposes.
 */
export function setSecureCookie(name: string, value: string, ttlSeconds: number = 86400): boolean {
  return setCookie(name, value, {
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: ttlSeconds,
    httpOnly: false, // cannot be set from JS; kept false to avoid confusion
  });
}

/**
 * Remove all cookies for the current domain. Use with caution.
 */
export function removeAllCookies(): number {
  const all = getAllCookies();
  let removed = 0;
  all.forEach((c) => {
    if (deleteCookie(c.name)) removed++;
  });
  return removed;
}

/**
 * Create a pre-configured `CookieJar` scoped to a specific domain with secure defaults.
 */
export function createSecureJar(prefix: string, domain: string): CookieJar {
  return new CookieJar({
    prefix,
    defaultAttributes: {
      domain,
      path: '/',
      secure: true,
      sameSite: 'Lax',
    },
  });
}
