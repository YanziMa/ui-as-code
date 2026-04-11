/**
 * Cookie Manager: Comprehensive cookie management with fluent API,
 * cross-subdomain support, SameSite configuration, consent tracking,
 * cookie jar abstraction, and SSR-safe access.
 */

// --- Types ---

export interface CookieOptions {
  /** Cookie expiration in days (default: session cookie) */
  expires?: number | Date;
  /** Max age in seconds */
  maxAge?: number;
  /** Path restriction (default: "/") */
  path?: string;
  /** Domain restriction */
  domain?: string;
  /** Secure flag (HTTPS only) */
  secure?: boolean;
  /** HttpOnly flag (server-side only) */
  httpOnly?: boolean;
  /** SameSite policy */
  sameSite?: "Strict" | "Lax" | "None";
  /** Encode value as URI component? (default: true) */
  encode?: boolean;
}

export interface CookieInfo {
  name: string;
  value: string;
  options: Required<Pick<CookieOptions, "path" | "secure" | "httpOnly" | "sameSite">> & {
    expires: Date | null;
    maxAge: number | null;
    domain: string | null;
  };
}

export interface CookieConsentConfig {
  /** Consent storage key (default: "cookie_consent") */
  storageKey?: string;
  /** Categories of cookies that require consent */
  categories?: Array<{
    id: string;
    name: string;
    description: string;
    required?: boolean;
  }>;
  /** Default consent duration in days (default: 365) */
  consentDurationDays?: number;
}

// --- Cookie Class ---

export class CookieManager {
  private defaults: Partial<CookieOptions>;
  private changeListeners = new Set<(name: string, value: string | null) => void>();

  constructor(defaults: Partial<CookieOptions> = {}) {
    this.defaults = {
      path: "/",
      encode: true,
      ...defaults,
    };
  }

  // --- Read ---

  /** Get a cookie value by name */
  get(name: string): string | null {
    if (typeof document === "undefined") return null;

    const match = document.cookie.match(
      new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  /** Get a cookie and parse as JSON */
  getJSON<T = unknown>(name: string): T | null {
    const raw = this.get(name);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Check if a cookie exists */
  has(name: string): boolean {
    return this.get(name) !== null;
  }

  /** Get all cookies as a key-value record */
  getAll(): Record<string, string> {
    if (typeof document === "undefined") return {};

    const cookies: Record<string, string> = {};
    const pairs = document.cookie.split(";");

    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split("=");
      const trimmedKey = key.trim();
      if (trimmedKey) {
        cookies[trimmedKey] = decodeURIComponent(valueParts.join("=").trim());
      }
    }

    return cookies;
  }

  /** Get detailed info about a cookie (parsed from document.cookie string) */
  getInfo(name: string): CookieInfo | null {
    const value = this.get(name);
    if (value === null) return null;

    // We can only infer limited info from client-side
    return {
      name,
      value,
      options: {
        path: this.defaults.path ?? "/",
        secure: this.defaults.secure ?? false,
        httpOnly: false, // Can't detect HttpOnly from JS
        sameSite: this.defaults.sameSite ?? "Lax",
        expires: null,
        maxAge: null,
        domain: this.defaults.domain ?? null,
      },
    };
  }

  // --- Write ---

  /** Set a cookie */
  set(name: string, value: string, options: CookieOptions = {}): this {
    if (typeof document === "undefined") return this;

    const opts = { ...this.defaults, ...options };
    let cookieStr = `${name}=${opts.encode !== false ? encodeURIComponent(value) : value}`;

    if (opts.expires instanceof Date) {
      cookieStr += `; expires=${opts.expires.toUTCString()}`;
    } else if (typeof opts.expires === "number") {
      const date = new Date();
      date.setDate(date.getDate() + opts.expires);
      cookieStr += `; expires=${date.toUTCString()}`;
    }

    if (opts.maxAge !== undefined) {
      cookieStr += `; max-age=${opts.maxAge}`;
    }

    if (opts.path) cookieStr += `; path=${opts.path}`;
    if (opts.domain) cookieStr += `; domain=${opts.domain}`;
    if (opts.secure) cookieStr += "; secure";
    if (opts.httpOnly) cookieStr += "; httponly";
    if (opts.sameSite) cookieStr += `; samesite=${opts.sameSite}`;

    document.cookie = cookieStr;

    this.notifyChange(name, value);
    return this;
  }

  /** Set a JSON-serialized cookie */
  setJSON(name: string, value: unknown, options: CookieOptions = {}): this {
    return this.set(name, JSON.stringify(value), options);
  }

  // --- Delete ---

  /** Remove a cookie */
  remove(name: string, options?: Pick<CookieOptions, "path" | "domain">): this {
    this.set(name, "", {
      ...options,
      maxAge: -1,
      expires: new Date(0),
    });

    this.notifyChange(name, null);
    return this;
  }

  /** Remove multiple cookies */
  removeMultiple(names: string[], options?: Pick<CookieOptions, "path" | "domain">): this {
    for (const name of names) {
      this.remove(name, options);
    }
    return this;
  }

  /** Remove all cookies matching a prefix or pattern */
  removeAll(options?: { prefix?: string; pattern?: RegExp; exclude?: string[] }): number {
    const allCookies = this.getAll();
    let removed = 0;

    for (const name of Object.keys(allCookies)) {
      if (options?.exclude?.includes(name)) continue;
      if (options?.prefix && !name.startsWith(options.prefix)) continue;
      if (options?.pattern && !options.pattern.test(name)) continue;

      if (!options?.prefix && !options?.pattern) {
        this.remove(name);
        removed++;
      } else {
        this.remove(name);
        removed++;
      }
    }

    return removed;
  }

  // --- Utility ---

  /** Set a cookie that expires after N days */
  setTemporary(name: string, value: string, days: number): this {
    return this.set(name, value, { expires: days });
  }

  /** Set a session cookie (expires when browser closes) */
  setSession(name: string, value: string): this {
    return this.set(name, value);
  }

  /** Set a cross-subdomain cookie */
  setCrossDomain(name: string, value: string, domain: string, options?: Omit<CookieOptions, "domain">): this {
    return this.set(name, value, { ...options, domain });
  }

  /** Increment a numeric cookie value */
  increment(name: string, by = 1, options?: CookieOptions): number {
    const current = parseInt(this.get(name) ?? "0", 10) || 0;
    const newValue = current + by;
    this.set(String(newValue), String(newValue), options);
    return newValue;
  }

  /** Append to a comma-separated cookie */
  append(name: string, value: string, separator = ",", options?: CookieOptions): string[] {
    const current = this.get(name);
    const values = current ? current.split(separator) : [];
    values.push(value);
    this.set(name, values.join(separator), options);
    return values;
  }

  /** Remove a value from a comma-separated cookie */
  removeFromList(name: string, value: string, separator = ",", options?: CookieOptions): string[] {
    const current = this.get(name);
    if (!current) return [];

    const values = current.split(separator).filter((v) => v.trim() !== value.trim());
    if (values.length > 0) {
      this.set(name, values.join(separator), options);
    } else {
      this.remove(name);
    }
    return values;
  }

  // --- Events ---

  /** Subscribe to cookie changes */
  onChange(listener: (name: string, value: string | null) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  // --- Private ---

  private notifyChange(name: string, value: string | null): void {
    for (const listener of this.changeListeners) {
      try { listener(name, value); } catch {}
    }
  }
}

// --- Cookie Consent ---

export class CookieConsentManager {
  private config: Required<CookieConsentConfig> & { categories: NonNullable<CookieConsentConfig["categories"]> };
  private manager: CookieManager;
  private consentData: Record<string, boolean> = {};
  private listeners = new Set<(consents: Record<string, boolean>) => void>();

  constructor(config: CookieConsentConfig = {}) {
    this.config = {
      storageKey: config.storageKey ?? "cookie_consent",
      consentDurationDays: config.consentDurationDays ?? 365,
      categories: config.categories ?? [
        { id: "necessary", name: "Necessary", description: "Required for basic functionality", required: true },
        { id: "analytics", name: "Analytics", description: "Help us improve our service" },
        { id: "marketing", name: "Marketing", description: "Personalized advertising" },
        { id: "preferences", name: "Preferences", description: "Remember your settings" },
      ],
    };

    this.manager = new CookieManager();
    this.loadConsent();
  }

  /** Load saved consent from cookie */
  private loadConsent(): void {
    const saved = this.manager.getJSON<Record<string, boolean>>(this.config.storageKey);
    if (saved) {
      this.consentData = saved;
    } else {
      // Auto-grant required categories
      for (const cat of this.config.categories) {
        if (cat.required) this.consentData[cat.id] = true;
      }
    }
  }

  /** Save consent to cookie */
  private saveConsent(): void {
    this.manager.setJSON(this.config.storageKey, this.consentData, {
      expires: this.config.consentDurationDays,
    });
  }

  /** Grant consent for specific categories */
  grant(categories: string[]): void {
    for (const catId of categories) {
      this.consentData[catId] = true;
    }
    this.saveConsent();
    this.notifyListeners();
  }

  /** Revoke consent for specific categories (except required) */
  revoke(categories: string[]): void {
    for (const catId of categories) {
      const cat = this.config.categories.find((c) => c.id === catId);
      if (cat && !cat.required) {
        this.consentData[catId] = false;
      }
    }
    this.saveConsent();
    this.notifyListeners();
  }

  /** Grant all categories */
  grantAll(): void {
    for (const cat of this.config.categories) {
      this.consentData[cat.id] = true;
    }
    this.saveConsent();
    this.notifyListeners();
  }

  /** Revoke all non-required categories */
  revokeAll(): void {
    for (const cat of this.config.categories) {
      if (!cat.required) this.consentData[cat.id] = false;
    }
    this.saveConsent();
    this.notifyListeners();
  }

  /** Check if consent is given for a category */
  isGranted(categoryId: string): boolean {
    return this.consentData[categoryId] ?? false;
  }

  /** Check if user has made any consent choice */
  hasConsented(): boolean {
    return Object.keys(this.consentData).length > 0 &&
      this.manager.has(this.config.storageKey);
  }

  /** Get all consent states */
  getConsents(): Record<string, boolean> {
    return { ...this.consentData };
  }

  /** Get available categories */
  getCategories(): CookieConsentConfig["categories"] {
    return this.config.categories;
  }

  /** Subscribe to consent changes */
  onConsentChange(listener: (consents: Record<string, boolean>) => void): () => void {
    this.listeners.add(listener);
    listener(this.getConsents());
    return () => this.listeners.delete(listener);
  }

  /** Clear all consent data */
  reset(): void {
    this.consentData = {};
    this.manager.remove(this.config.storageKey);
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try { listener(this.getConsents()); } catch {}
    }
  }
}

// --- Global Instance ---

let globalCookieManager: CookieManager | null = null;

/** Get the global cookie manager instance */
export function getCookieManager(defaults?: Partial<CookieOptions>): CookieManager {
  if (!globalCookieManager) globalCookieManager = new CookieManager(defaults);
  return globalCookieManager;
}

/** Quick cookie getter */
export function getCookie(name: string): string | null {
  return getCookieManager().get(name);
}

/** Quick cookie setter */
export function setCookie(name: string, value: string, options?: CookieOptions): void {
  getCookieManager().set(name, value, options);
}

/** Quick cookie remover */
export function removeCookie(name: string): void {
  getCookieManager().remove(name);
}

// --- Helpers ---

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
