/**
 * Authentication utilities: JWT parsing/validation, OAuth helpers,
 * token management, password strength checking, and auth state tracking.
 */

// --- Types ---

export interface JwtPayload {
  sub?: string;          // Subject (user ID)
  iss?: string;          // Issuer
  aud?: string;          // Audience
  exp?: number;          // Expiration (Unix timestamp)
  iat?: number;          // Issued at
  nbf?: number;          // Not before
  jti?: string;          // JWT ID
  [key: string]: unknown;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: JwtPayload | null;
  token: string | null;
  expiresAt: number | null;
  error: string | null;
}

export interface AuthConfig {
  /** Token storage key */
  storageKey?: string;
  /** Use localStorage vs sessionStorage */
  storageType?: "local" | "session";
  /** Auto-refresh threshold in seconds */
  refreshThreshold?: number;
  /** Clock skew tolerance in seconds */
  clockSkew?: number;
  /** Callback on auth state change */
  onAuthChange?: (state: AuthState) => void;
}

export interface PasswordStrengthResult {
  score: number;         // 0-4
  label: string;         // "weak", "fair", "good", "strong", "very strong"
  feedback: string[];
  suggestions: string[];
}

export interface OAuthProvider {
  name: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string[];
  responseType?: "code" | "token";
}

// --- JWT Utilities ---

/** Base64URL decode */
function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 ? "=".repeat(4 - (padded.length % 4)) : "";
  return atob(pad);
}

/**
 * Parse a JWT token without verification (client-side only).
 * Returns the payload or null if invalid.
 */
export function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = base64UrlDecode(parts[1]!);
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired.
 * Uses optional clock skew tolerance.
 */
export function isJwtExpired(token: string, clockSkewSec = 30): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp + clockSkewSec < now;
}

/**
 * Check if a JWT will expire within N seconds.
 * Useful for proactive token refresh.
 */
export function isJwtExpiringSoon(token: string, thresholdSec = 60): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp - thresholdSec < now;
}

/**
 * Get remaining time until JWT expiration in milliseconds.
 * Returns 0 if already expired.
 */
export function jwtTimeToExpiry(token: string): number {
  const payload = parseJwt(token);
  if (!payload?.exp) return 0;

  const now = Date.now();
  const expiry = payload.exp * 1000;
  return Math.max(0, expiry - now);
}

/**
 * Extract the subject (user ID) from a JWT.
 */
export function getJwtSubject(token: string): string | null {
  return parseJwt(token)?.sub ?? null;
}

/**
 * Decode JWT header (alg, typ, kid).
 */
export function decodeJwtHeader(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 1) return null;
    return JSON.parse(base64UrlDecode(parts[0]!));
  } catch {
    return null;
  }
}

// --- Password Strength ---

/**
 * Evaluate password strength on a scale of 0-4.
 * Returns score, label, and actionable suggestions.
 */
export function checkPasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const feedback: string[] = [];
  const suggestions: string[] = [];

  // Length checks
  if (password.length < 6) {
    feedback.push("Too short");
    suggestions.push("Use at least 8 characters");
  } else if (password.length < 8) {
    score += 1;
    suggestions.push("Use at least 12 characters for better security");
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (hasLower) score += 1;
  else { feedback.push("No lowercase letters"); suggestions.push("Add lowercase letters"); }

  if (hasUpper) score += 1;
  else { feedback.push("No uppercase letters"); suggestions.push("Add uppercase letters"); }

  if (hasDigit) score += 1;
  else { feedback.push("No numbers"); suggestions.push("Add numbers"); }

  if (hasSpecial) score += 1;
  else { feedback.push("No special characters"); suggestions.push("Add special characters (!@#$%...)"); }

  // Entropy bonus for long passwords with variety
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7 && password.length >= 12) {
    score = Math.min(score, 4);
  }

  // Common patterns penalty
  const commonPatterns = [
    /123456/, /password/i, /qwerty/i, /abc123/i,
    /admin/i, /letmein/i, /welcome/i,
  ];
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push("Contains common pattern");
      break;
    }
  }

  // Clamp to 0-4
  score = Math.max(0, Math.min(4, score));

  const labels = ["weak", "fair", "good", "strong", "very strong"];

  return {
    score,
    label: labels[score],
    feedback,
    suggestions,
  };
}

// --- OAuth Helpers ---

/**
 * Build an OAuth authorization URL.
 */
export function buildOAuthUrl(provider: OAuthProvider, state?: string, redirectUri?: string): string {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    response_type: provider.responseType ?? "code",
    scope: provider.scopes.join(" "),
  });

  if (state) params.set("state", state);
  if (redirectUri) params.set("redirect_uri", redirectUri);

  return `${provider.authorizeUrl}?${params.toString()}`;
}

/**
 * Parse OAuth callback parameters from URL.
 */
export function parseOAuthCallback(url: string): { code?: string; state?: string; error?: string } {
  try {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    return {
      code: params.get("code") ?? undefined,
      state: params.get("state") ?? undefined,
      error: params.get("error") ?? undefined,
    };
  } catch {
    return {};
  }
}

// --- Auth Manager ---

/**
 * Centralized authentication state manager.
 * Handles token storage, expiry tracking, and state change notifications.
 */
export class AuthManager {
  private config: Required<AuthConfig>;
  private state: AuthState;
  private listeners = new Set<(state: AuthState) => void>();
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: AuthConfig = {}) {
    this.config = {
      storageKey: config.storageKey ?? "auth_token",
      storageType: config.storageType ?? "local",
      refreshThreshold: config.refreshThreshold ?? 300,
      clockSkew: config.clockSkew ?? 30,
      onAuthChange: config.onAuthChange ?? (() => {}),
    };

    // Hydrate from storage
    const storage = this.getStorage();
    const token = storage.getItem(this.config.storageKey);
    let user: JwtPayload | null = null;
    let expiresAt: number | null = null;

    if (token) {
      user = parseJwt(token);
      expiresAt = user?.exp ? user.exp * 1000 : null;
    }

    this.state = {
      isAuthenticated: !!token && !isJwtExpired(token!, this.config.clockSkew),
      user,
      token,
      expiresAt,
      error: null,
    };

    // Start auto-refresh timer
    this.scheduleRefreshCheck();

    // Listen for changes in other tabs
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === this.config.storageKey) {
          this.hydrate();
        }
      });
    }
  }

  /** Get current auth state (read-only snapshot) */
  getState(): AuthState { return { ...this.state }; }

  /** Check if authenticated */
  get isAuthenticated(): boolean { return this.state.isAuthenticated; }

  /** Get current user info from JWT */
  get user(): JwtPayload | null { return this.state.user; }

  /** Get access token */
  get token(): string | null { return this.state.token; }

  /**
   * Set authentication token and update state.
   * Automatically parses JWT and sets expiry.
   */
  setToken(token: string): void {
    const storage = this.getStorage();
    storage.setItem(this.config.storageKey, token);

    const user = parseJwt(token);
    const expiresAt = user?.exp ? user.exp * 1000 : null;

    this.state = {
      isAuthenticated: true,
      user,
      token,
      expiresAt,
      error: null,
    };

    this.scheduleRefreshCheck();
    this.notify();
  }

  /**
   * Clear authentication state and remove token.
   */
  logout(): void {
    const storage = this.getStorage();
    storage.removeItem(this.config.storageKey);

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.state = {
      isAuthenticated: false,
      user: null,
      token: null,
      expiresAt: null,
      error: null,
    };

    this.notify();
  }

  /**
   * Update auth error state without clearing token.
   */
  setError(error: string): void {
    this.state.error = error;
    this.notify();
  }

  /** Subscribe to auth state changes */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /** Get Authorization header value for API requests */
  getAuthorizationHeader(): string | null {
    return this.state.token ? `Bearer ${this.state.token}` : null;
  }

  /** Destroy manager and cleanup */
  destroy(): void {
    this.logout();
    this.listeners.clear();
  }

  // --- Internal ---

  private getStorage(): Storage {
    return this.config.storageType === "session"
      ? sessionStorage
      : localStorage;
  }

  private hydrate(): void {
    const storage = this.getStorage();
    const token = storage.getItem(this.config.storageKey);

    if (!token) {
      if (this.state.isAuthenticated) this.logout();
      return;
    }

    const user = parseJwt(token);
    const expiresAt = user?.exp ? user.exp * 1000 : null;
    const wasAuthenticated = this.state.isAuthenticated;

    this.state = {
      isAuthenticated: !isJwtExpired(token, this.config.clockSkew),
      user,
      token,
      expiresAt,
      error: null,
    };

    if (wasAuthenticated !== this.state.isAuthenticated) {
      this.notify();
    }
  }

  private notify(): void {
    const snapshot = this.getState();
    this.config.onAuthChange(snapshot);
    for (const listener of this.listeners) {
      try { listener(snapshot); } catch {}
    }
  }

  private scheduleRefreshCheck(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    if (!this.state.token || !this.state.expiresAt) return;

    const timeUntilRefresh = this.state.expiresAt - (this.config.refreshThreshold * 1000) - Date.now();

    if (timeUntilRefresh <= 0) {
      // Already needs refresh — notify immediately
      this.notify();
      return;
    }

    this.refreshTimer = setTimeout(() => {
      if (isJwtExpiringSoon(this.state.token!, this.config.refreshThreshold)) {
        this.notify(); // Signal that refresh is needed
      }
    }, timeUntilRefresh);
  }
}
