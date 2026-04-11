/**
 * Auth Token Manager: JWT and OAuth token management with parsing,
 * validation, automatic refresh, multi-token support (access + refresh),
 * storage strategies, token interceptors for HTTP clients,
 * and concurrent refresh locking.
 */

// --- Types ---

export interface TokenPair {
  /** Access token (short-lived) */
  accessToken: string;
  /** Refresh token (long-lived) */
  refreshToken: string;
  /** Token type (default: "Bearer") */
  tokenType?: string;
  /** Expiration time in seconds since epoch */
  expiresIn?: number;
  /** Scope/permissions */
  scope?: string[];
}

export interface TokenInfo {
  /** Raw token string */
  raw: string;
  /** Decoded payload (for JWT) */
  payload?: Record<string, unknown>;
  /** Header info (for JWT) */
  header?: { alg: string; typ: string };
  /** Issuer */
  issuer?: string;
  /** Subject (user ID) */
  subject?: string;
  /** Audience(s) */
  audience?: string | string[];
  /** Issued at timestamp */
  issuedAt?: number;
  /** Expiration timestamp */
  expiresAt?: number;
  /** Not-before timestamp */
  notBefore?: number;
  /** Time until expiry in seconds (-1 if no exp claim) */
  remainingSeconds: number;
  /** Is expired? */
  isExpired: boolean;
  /** Is expiring soon (within buffer)? */
  isExpiringSoon: boolean;
  /** Token type */
  tokenType: "jwt" | "opaque";
}

export interface AuthTokenConfig {
  /** Storage strategy for tokens */
  storage?: "memory" | "localStorage" | "sessionStorage" | "cookie";
  /** Storage key prefix (default: "auth_") */
  storagePrefix?: string;
  /** Cookie options when using cookie storage */
  cookieOptions?: {
    domain?: string;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    path?: string;
  };
  /** Auto-refresh threshold in seconds before expiry (default: 300 = 5 min) */
  refreshThresholdSec?: number;
  /** Refresh endpoint URL */
  refreshTokenUrl?: string;
  /** Custom refresh function (overrides URL-based refresh) */
  refreshFn?: (refreshToken: string) => Promise<TokenPair>;
  /** Enable auto-refresh on timer? */
  autoRefresh?: boolean;
  /** Auto-refresh check interval in ms (default: 60000 = 1 min) */
  autoRefreshIntervalMs?: number;
  /** Clock skew tolerance in seconds (default: 30) */
  clockSkewSec?: number;
  /** Max retry attempts on refresh failure (default: 3) */
  maxRefreshRetries?: number;
  /** Called when token is refreshed */
  onTokenRefreshed?: (tokens: TokenPair) => void;
  /** Called when refresh fails permanently */
  onRefreshFailed?: (error: Error) => void;
  /** Called when token expires without successful refresh */
  onTokenExpired?: () => void;
}

export interface TokenInterceptorConfig {
  /** Header name for authorization (default: "Authorization") */
  headerName?: string;
  /** Header value template (default: "Bearer {token}") */
  headerTemplate?: string;
  /** Retry on 401 with auto-refresh? */
  retryOn401?: boolean;
  /** Max retries per request on 401 (default: 1) */
  max401Retries?: number;
}

// --- JWT Utilities ---

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  try {
    return atob(base64);
  } catch {
    return "";
  }
}

export function parseJwt(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    return { header, payload };
  } catch {
    return null;
  }
}

export function isJwt(token: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

export function decodeToken(token: string): TokenInfo {
  const now = Math.floor(Date.now() / 1000);

  if (isJwt(token)) {
    const parsed = parseJwt(token);
    if (!parsed) {
      return {
        raw: token,
        remainingSeconds: -1,
        isExpired: false,
        isExpiringSoon: false,
        tokenType: "opaque",
      };
    }

    const { header, payload } = parsed;
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    const iat = typeof payload.iat === "number" ? payload.iat : undefined;
    const nbf = typeof payload.nbf === "number" ? payload.nbf : undefined;

    const remaining = exp !== null ? exp - now : -1;

    return {
      raw: token,
      payload,
      header: { alg: String(header.alg ?? ""), typ: String(header.typ ?? "") },
      issuer: payload.iss as string | undefined,
      subject: payload.sub as string | undefined,
      audience: payload.aud as string | string[] | undefined,
      issuedAt: iat,
      expiresAt: exp ?? undefined,
      notBefore: nbf,
      remainingSeconds: remaining,
      isExpired: exp !== null && now >= exp,
      isExpiringSoon: exp !== null && now >= exp - 300,
      tokenType: "jwt",
    };
  }

  // Opaque token — can't determine expiry
  return {
    raw: token,
    remainingSeconds: -1,
    isExpired: false,
    isExpiringSoon: false,
    tokenType: "opaque",
  };
}

export function validateJwt(token: string, options?: {
  issuer?: string;
  audience?: string;
  clockSkewSec?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const skew = options?.clockSkewSec ?? 30;
  const now = Math.floor(Date.now() / 1000);

  const parsed = parseJwt(token);
  if (!parsed) {
    errors.push("Invalid JWT format");
    return { valid: false, errors };
  }

  const { payload } = parsed;

  // Check expiration
  if (typeof payload.exp === "number") {
    if (now > payload.exp + skew) {
      errors.push("Token has expired");
    }
  }

  // Check not-before
  if (typeof payload.nbf === "number") {
    if (now < payload.nbf - skew) {
      errors.push("Token not yet valid");
    }
  }

  // Check issuer
  if (options?.issuer && payload.iss !== options.issuer) {
    errors.push(`Invalid issuer: expected ${options.issuer}, got ${payload.iss}`);
  }

  // Check audience
  if (options?.audience) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(options.audience)) {
      errors.push(`Invalid audience`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// --- Main Token Manager ---

export class AuthTokenManager {
  private config: Required<Omit<AuthTokenConfig, "cookieOptions" | "refreshFn">> & {
    cookieOptions: NonNullable<AuthTokenConfig["cookieOptions"]>;
    refreshFn: AuthTokenConfig["refreshFn"];
  };

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenType: string = "Bearer";

  private refreshLock = false;
  private refreshPromise: Promise<TokenPair> | null = null;
  private refreshRetryCount = 0;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  private listeners = new Set<{
    onTokensChanged?: (pair: TokenPair) => void;
    onTokenExpired?: () => void;
    onRefreshFailed?: (error: Error) => void;
  }>();

  constructor(config: AuthTokenConfig = {}) {
    this.config = {
      storage: config.storage ?? "memory",
      storagePrefix: config.storagePrefix ?? "auth_",
      refreshThresholdSec: config.refreshThresholdSec ?? 300,
      refreshTokenUrl: config.refreshTokenUrl,
      refreshFn: config.refreshFn ?? null!,
      autoRefresh: config.autoRefresh ?? false,
      autoRefreshIntervalMs: config.autoRefreshIntervalMs ?? 60000,
      clockSkewSec: config.clockSkewSec ?? 30,
      maxRefreshRetries: config.maxRefreshRetries ?? 3,
      cookieOptions: {
        path: "/",
        ...config.cookieOptions,
      },
      onTokenRefreshed: config.onTokenRefreshed,
      onRefreshFailed: config.onRefreshFailed,
      onTokenExpired: config.onTokenExpired,
    };

    this.restoreTokens();

    if (this.config.autoRefresh && this.accessToken) {
      this.startAutoRefresh();
    }
  }

  // --- Token Management ---

  /** Set the access and refresh tokens */
  setTokens(pair: TokenPair): void {
    this.accessToken = pair.accessToken;
    this.refreshToken = pair.refreshToken;
    this.tokenType = pair.tokenType ?? "Bearer";
    this.refreshRetryCount = 0;

    this.persistTokens();
    this.notifyTokensChanged(pair);

    if (this.config.autoRefresh && !this.autoRefreshTimer) {
      this.startAutoRefresh();
    }
  }

  /** Get the current access token */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** Get the current refresh token */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /** Get decoded access token info */
  getAccessTokenInfo(): TokenInfo | null {
    if (!this.accessToken) return null;
    return decodeToken(this.accessToken);
  }

  /** Check if a valid access token exists */
  hasValidToken(): boolean {
    if (!this.accessToken) return false;

    const info = decodeToken(this.accessToken);
    if (info.remainingSeconds === -1) return true; // Opaque token, assume valid

    return !info.isExpired;
  }

  /** Check if token needs refreshing */
  needsRefresh(): boolean {
    if (!this.accessToken || !this.refreshToken) return false;

    const info = decodeToken(this.accessToken);
    if (info.remainingSeconds === -1) return false; // Can't tell

    return info.remainingSeconds <= this.config.refreshThresholdSec;
  }

  /** Clear all tokens */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.stopAutoRefresh();
    this.removePersistedTokens();
  }

  // --- Refresh ---

  /** Manually trigger a token refresh */
  async refresh(): Promise<TokenPair> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    // If already refreshing, wait for that to complete
    if (this.refreshLock && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshLock = true;

    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshLock = false;
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  /** Get or refresh the access token (returns valid token or throws) */
  async getValidAccessToken(): Promise<string> {
    if (this.hasValidToken()) {
      return this.accessToken!;
    }

    if (this.needsRefresh() && this.refreshToken) {
      const pair = await this.refresh();
      return pair.accessToken;
    }

    throw new Error("No valid access token");
  }

  // --- Interceptor ---

  /** Create an Authorization header value */
  getAuthHeaderValue(template?: string): string | null {
    if (!this.accessToken) return null;

    const tpl = template ?? `Bearer ${this.accessToken}`;
    return tpl.replace("{token}", this.accessToken).replace("{type}", this.tokenType);
  }

  /** Create a fetch-compatible headers object with auth */
  getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extraHeaders };
    const authValue = this.getAuthHeaderValue();
    if (authValue) {
      headers["Authorization"] = authValue;
    }
    return headers;
  }

  /** Create a token interceptor config for HTTP clients */
  createInterceptor(config?: TokenInterceptorConfig): {
    request: (headers: Record<string, string>) => Promise<Record<string, string>>;
    responseError: (status: number) => Promise<boolean>;
  } {
    const cfg = {
      headerName: "Authorization",
      headerTemplate: "Bearer {token}",
      retryOn401: true,
      max401Retries: 1,
      ...config,
    };

    let retryCount = 0;

    return {
      request: async (headers: Record<string, string>): Promise<Record<string, string>> => {
        const token = await this.getValidAccessToken();
        headers[cfg.headerName] = cfg.headerTemplate
          .replace("{token}", token)
          .replace("{type}", this.tokenType);
        return headers;
      },

      responseError: async (status: number): Promise<boolean> => {
        if (status === 401 && cfg.retryOn401 && retryCount < cfg.max401Retries) {
          retryCount++;
          try {
            await this.refresh();
            return true; // Signal caller to retry
          } catch {
            return false;
          }
        }
        retryCount = 0;
        return false;
      },
    };
  }

  // --- Events ---

  onTokensChanged(handler: (pair: TokenPair) => void): () => void {
    const listener = { onTokensChanged: handler };
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onTokenExpired(handler: () => void): () => void {
    const listener = { onTokenExpired: handler };
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onRefreshFailed(handler: (error: Error) => void): () => void {
    const listener = { onRefreshFailed: handler };
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Destroy ---

  destroy(): void {
    this.destroyed = true;
    this.clearTokens();
    this.listeners.clear();
  }

  // --- Private ---

  private async doRefresh(): Promise<TokenPair> {
    try {
      let pair: TokenPair;

      if (this.config.refreshFn) {
        pair = await this.config.refreshFn(this.refreshToken!);
      } else if (this.config.refreshTokenUrl) {
        const response = await fetch(this.config.refreshTokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        if (!response.ok) {
          throw new Error(`Refresh failed: HTTP ${response.status}`);
        }

        pair = await response.json();
      } else {
        throw new Error("No refresh mechanism configured");
      }

      this.setTokens(pair);
      this.refreshRetryCount = 0;

      if (this.config.onTokenRefreshed) {
        try { this.config.onTokenRefreshed(pair); } catch {}
      }

      return pair;
    } catch (error) {
      this.refreshRetryCount++;

      const err = error instanceof Error ? error : new Error(String(error));

      if (this.refreshRetryCount < this.config.maxRefreshRetries) {
        // Retry with backoff
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, this.refreshRetryCount - 1)));
        return this.doRefresh();
      }

      // All retries exhausted
      if (this.config.onRefreshFailed) {
        try { this.config.onRefreshFailed(err); } catch {}
      }

      for (const l of this.listeners) {
        try { l.onRefreshFailed?.(err); } catch {}
      }

      throw err;
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.autoRefreshTimer = setInterval(async () => {
      if (this.destroyed || !this.accessToken) return;

      if (this.needsRefresh() && this.refreshToken) {
        try {
          await this.refresh();
        } catch {
          // Auto-refresh failures are non-fatal
        }
      }
    }, this.config.autoRefreshIntervalMs);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  private persistTokens(): void {
    const prefix = this.config.storagePrefix;

    switch (this.config.storage) {
      case "localStorage":
        if (this.accessToken) localStorage.setItem(`${prefix}access`, this.accessToken);
        if (this.refreshToken) localStorage.setItem(`${prefix}refresh`, this.refreshToken);
        localStorage.setItem(`${prefix}type`, this.tokenType);
        break;

      case "sessionStorage":
        if (this.accessToken) sessionStorage.setItem(`${prefix}access`, this.accessToken);
        if (this.refreshToken) sessionStorage.setItem(`${prefix}refresh`, this.refreshToken);
        sessionStorage.setItem(`${prefix}type`, this.tokenType);
        break;

      case "cookie": {
        const opts = this.config.cookieOptions;
        const cookieParts = [`path=${opts.path ?? "/"}`];
        if (opts.domain) cookieParts.push(`domain=${opts.domain}`);
        if (opts.secure) cookieParts.push("secure");
        if (opts.sameSite) cookieParts.push(`samesite=${opts.sameSite}`);

        if (this.accessToken) {
          document.cookie = `${prefix}access=${encodeURIComponent(this.accessToken)}; ${cookieParts.join("; ")}`;
        }
        if (this.refreshToken) {
          document.cookie = `${prefix}refresh=${encodeURIComponent(this.refreshToken)}; ${cookieParts.join("; ")}`;
        }
        break;
      }

      default:
        // Memory — nothing to persist
        break;
    }
  }

  private restoreTokens(): void {
    const prefix = this.config.storagePrefix;

    switch (this.config.storage) {
      case "localStorage":
        this.accessToken = localStorage.getItem(`${prefix}access`);
        this.refreshToken = localStorage.getItem(`${prefix}refresh`);
        this.tokenType = localStorage.getItem(`${prefix}type`) ?? "Bearer";
        break;

      case "sessionStorage":
        this.accessToken = sessionStorage.getItem(`${prefix}access`);
        this.refreshToken = sessionStorage.getItem(`${prefix}refresh`);
        this.tokenType = sessionStorage.getItem(`${prefix}type`) ?? "Bearer";
        break;

      case "cookie":
        this.accessToken = this.getCookieValue(`${prefix}access`);
        this.refreshToken = this.getCookieValue(`${prefix}refresh`);
        this.tokenType = this.getCookieValue(`${prefix}type`) ?? "Bearer";
        break;

      default:
        break;
    }
  }

  private removePersistedTokens(): void {
    const prefix = this.config.storagePrefix;

    switch (this.config.storage) {
      case "localStorage":
        localStorage.removeItem(`${prefix}access`);
        localStorage.removeItem(`${prefix}refresh`);
        localStorage.removeItem(`${prefix}type`);
        break;

      case "sessionStorage":
        sessionStorage.removeItem(`${prefix}access`);
        sessionStorage.removeItem(`${prefix}refresh`);
        sessionStorage.removeItem(`${prefix}type`);
        break;

      case "cookie": {
        const opts = this.config.cookieOptions;
        const parts = [`path=${opts.path ?? "/"}`, "max-age=-1", `expires=Thu, 01 Jan 1970 00:00:00 GMT`];
        if (opts.domain) parts.push(`domain=${opts.domain}`);
        document.cookie = `${prefix}access=; ${parts.join("; ")}`;
        document.cookie = `${prefix}refresh=; ${parts.join("; ")}`;
        document.cookie = `${prefix}type=; ${parts.join("; ")}`;
        break;
      }
    }
  }

  private getCookieValue(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private notifyTokensChanged(pair: TokenPair): void {
    for (const l of this.listeners) {
      try { l.onTokensChanged?.(pair); } catch {}
    }
  }
}

/** Create a pre-configured auth token manager */
export function createAuthTokenManager(config?: AuthTokenConfig): AuthTokenManager {
  return new AuthTokenManager(config);
}
