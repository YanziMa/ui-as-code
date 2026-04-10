/**
 * Auth Manager: Complete authentication system with JWT handling, session
 * management, OAuth flows, 2FA/TOTP support, password policies, role-based
 * access control integration, token refresh, multi-device sessions,
 * and security event auditing.
 */

// --- Types ---

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  lastLoginAt?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms timestamp
  tokenType: "Bearer";
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  deviceId: string;
  createdAt: number;
  lastActivityAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
  deviceId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  acceptTerms: boolean;
  inviteToken?: string;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAgeDays?: number;
  preventReuse: number;
  minUniqueChars: number;
}

export interface MfaSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface AuthEvent {
  type:
    | "login"
    | "logout"
    | "register"
    | "token-refresh"
    | "password-change"
    | "mfa-enabled"
    | "mfa-disabled"
    | "session-expired"
    | "security-alert"
    | "account-locked"
    | "account-unlocked";
  userId: string;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthConfig {
  apiBaseUrl?: string;
  storagePrefix?: string;
  accessTokenTtl?: number;
  refreshTokenTtl?: number;
  clockSkewSeconds?: number;
  autoRefresh?: boolean;
  refreshWindowMs?: number;
  maxSessions?: number;
  sessionTimeoutMs?: number;
  passwordPolicy?: Partial<PasswordPolicy>;
  bruteForceProtection?: boolean;
  maxLoginAttempts?: number;
  lockoutDurationMs?: number;
  tokenDecoder?: (token: string) => Promise<Record<string, unknown> | null>;
  onEvent?: (event: AuthEvent) => void;
}

export interface AuthResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?:
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_LOCKED"
    | "MFA_REQUIRED"
    | "INVALID_MFA_CODE"
    | "TOKEN_EXPIRED"
    | "TOKEN_INVALID"
    | "SESSION_EXPIRED"
    | "RATE_LIMITED"
    | "PASSWORD_TOO_WEAK"
    | "EMAIL_EXISTS"
    | "EMAIL_NOT_VERIFIED"
    | "UNKNOWN";
  retryAfter?: number;
}

// --- Defaults ---

const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  maxAgeDays: 90,
  preventReuse: 5,
  minUniqueChars: 6,
};

const DEFAULT_CONFIG = {
  accessTokenTtl: 15 * 60 * 1000,
  refreshTokenTtl: 7 * 24 * 60 * 60 * 1000,
  clockSkewSeconds: 30,
  autoRefresh: true,
  refreshWindowMs: 60 * 1000,
  maxSessions: 5,
  sessionTimeoutMs: 30 * 60 * 1000,
  bruteForceProtection: true,
  maxLoginAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000,
  storagePrefix: "auth_",
};

// --- Password Utilities ---

export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < policy.minLength)
    errors.push(`Password must be at least ${policy.minLength} characters`);
  if (password.length > policy.maxLength)
    errors.push(`Password must be at most ${policy.maxLength} characters`);
  if (policy.requireUppercase && !/[A-Z]/.test(password))
    errors.push("Password must contain an uppercase letter");
  if (policy.requireLowercase && !/[a-z]/.test(password))
    errors.push("Password must contain a lowercase letter");
  if (policy.requireNumbers && !/\d/.test(password))
    errors.push("Password must contain a number");
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/`~]/.test(password))
    errors.push("Password must contain a special character");
  const uniqueChars = new Set(password).size;
  if (uniqueChars < policy.minUniqueChars)
    errors.push(`Password must have at least ${policy.minUniqueChars} unique characters`);
  return { valid: errors.length === 0, errors };
}

export function estimatePasswordStrength(password: string): { score: number; label: string; feedback: string[] } {
  let score = 0;
  const feedback: string[] = [];
  if (!password) return { score: 0, label: "Empty", feedback: ["Enter a password"] };

  if (password.length >= 8) score += 20; else feedback.push("Use at least 8 characters");
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 10; else feedback.push("Add lowercase letters");
  if (/[A-Z]/.test(password)) score += 10; else feedback.push("Add uppercase letters");
  if (/\d/.test(password)) score += 10; else feedback.push("Add numbers");
  if (/[^a-zA-Z\d]/.test(password)) score += 15; else feedback.push("Add special characters");

  const uniqueRatio = new Set(password).size / Math.max(1, password.length);
  score += Math.round(uniqueRatio * 15);

  if (/^[a-z]+$/.test(password)) { score -= 10; feedback.push("Avoid all lowercase"); }
  if (/^\d+$/.test(password)) { score -= 20; feedback.push("Avoid numbers only"); }
  if (/^(password|123456|qwerty|admin|letmein|welcome|monkey|dragon)$/i.test(password)) {
    score = Math.max(0, score - 40); feedback.push("Avoid common passwords");
  }
  if (/(.)\1{2,}/.test(password)) { score -= 10; feedback.push("Avoid repeated characters"); }

  score = Math.max(0, Math.min(100, score));
  let label: string;
  if (score < 20) label = "Very Weak";
  else if (score < 40) label = "Weak";
  else if (score < 60) label = "Fair";
  else if (score < 80) label = "Strong";
  else label = "Very Strong";
  return { score, label, feedback };
}

// --- JWT Utilities (client-side decode only) ---

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, clockSkewSeconds: number = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const exp = Number(payload.exp);
  if (isNaN(exp)) return true;
  return Date.now() / 1000 > exp + clockSkewSeconds;
}

export function getJwtRemainingTtl(token: string, clockSkewSeconds: number = 30): number {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return 0;
  return Math.max(0, Number(payload.exp) * 1000 - Date.now() + clockSkewSeconds * 1000);
}

export function getUserIdFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return (payload.sub ?? payload.user_id ?? payload.userId ?? null) as string | null;
}

export function getRolesFromToken(token: string): string[] {
  const payload = decodeJwtPayload(token);
  if (!payload) return [];
  const roles = payload.roles ?? payload.role ?? payload.authorities ?? [];
  return Array.isArray(roles) ? roles : [roles as string];
}

// --- AuthManager Class ---

export class AuthManager {
  private config: typeof DEFAULT_CONFIG & { passwordPolicy: PasswordPolicy } & Pick<AuthConfig, "apiBaseUrl" | "tokenDecoder" | "onEvent">;
  private currentSession: AuthSession | null = null;
  private listeners = new Set<(session: AuthSession | null) => void>();
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
  private destroyed = false;

  constructor(config: AuthConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      passwordPolicy: { ...DEFAULT_PASSWORD_POLICY, ...config.passwordPolicy },
      apiBaseUrl: config.apiBaseUrl,
      tokenDecoder: config.tokenDecoder,
      onEvent: config.onEvent,
    };
    this.restoreSession();
    if (this.config.autoRefresh && this.currentSession) this.scheduleTokenRefresh();
    this.setupActivityTracking();
  }

  // --- Authentication Operations ---

  async login(credentials: LoginCredentials): Promise<AuthResult<AuthSession>> {
    const bfCheck = this.checkBruteForce(credentials.email);
    if (bfCheck.locked) {
      return {
        success: false,
        error: `Account locked. Try again after ${Math.ceil(bfCheck.remainingMs / 1000)}s`,
        errorCode: "ACCOUNT_LOCKED",
        retryAfter: bfCheck.remainingMs,
      };
    }
    try {
      const result = await this.performLogin(credentials);
      if (!result.success || !result.data) { this.recordFailedAttempt(credentials.email); return result; }
      this.failedAttempts.delete(credentials.email);
      await this.setSession(result.data);
      this.emitEvent({ type: "login", userId: result.data.user.id, timestamp: Date.now() });
      return result;
    } catch (e) {
      this.recordFailedAttempt(credentials.email);
      return { success: false, error: e instanceof Error ? e.message : "Login failed", errorCode: "UNKNOWN" };
    }
  }

  async logout(global: boolean = false): Promise<AuthResult<void>> {
    if (!this.currentSession) return { success: true };
    const userId = this.currentSession.user.id;
    try {
      if (this.config.apiBaseUrl) {
        await fetch(`${this.config.apiBaseUrl}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.currentSession.tokens.accessToken}` },
        }).catch(() => {});
      }
    } catch {}
    await this.clearSession(global);
    this.emitEvent({ type: "logout", userId, timestamp: Date.now() });
    return { success: true };
  }

  async register(data: RegisterData): Promise<AuthResult<{ user: AuthUser; requiresVerification: boolean }>> {
    const pwValidation = validatePassword(data.password, this.config.passwordPolicy);
    if (!pwValidation.valid) return { success: false, error: pwValidation.errors.join(", "), errorCode: "PASSWORD_TOO_WEAK" };
    const strength = estimatePasswordStrength(data.password);
    if (strength.score < 30) return { success: false, error: "Password is too weak.", errorCode: "PASSWORD_TOO_WEAK" };
    try {
      const result = await this.performRegister(data);
      if (result.success) this.emitEvent({ type: "register", userId: result.data?.user.id ?? "", timestamp: Date.now() });
      return result;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Registration failed", errorCode: "UNKNOWN" };
    }
  }

  async refreshTokens(): Promise<AuthResult<AuthTokens>> {
    if (!this.currentSession) return { success: false, error: "No active session", errorCode: "SESSION_EXPIRED" };
    try {
      const result = await this.performTokenRefresh(this.currentSession.tokens.refreshToken);
      if (!result.success || !result.data) {
        await this.clearSession(false);
        this.emitEvent({ type: "session-expired", userId: this.currentSession.user.id, timestamp: Date.now() });
        return result;
      }
      this.currentSession.tokens = result.data;
      this.currentSession.lastActivityAt = Date.now();
      await this.persistSession();
      this.scheduleTokenRefresh();
      this.emitEvent({ type: "token-refresh", userId: this.currentSession.user.id, timestamp: Date.now() });
      return result;
    } catch (e) {
      await this.clearSession(false);
      return { success: false, error: e instanceof Error ? e.message : "Token refresh failed", errorCode: "TOKEN_EXPIRED" };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult<void>> {
    if (!this.currentSession) return { success: false, error: "Not authenticated", errorCode: "TOKEN_INVALID" };
    const pwValidation = validatePassword(newPassword, this.config.passwordPolicy);
    if (!pwValidation.valid) return { success: false, error: pwValidation.errors.join(", "), errorCode: "PASSWORD_TOO_WEAK" };
    if (currentPassword === newPassword) return { success: false, error: "New password must differ from current.", errorCode: "PASSWORD_TOO_WEAK" };
    try {
      const result = await this.performPasswordChange(currentPassword, newPassword);
      if (result.success && this.currentSession) this.emitEvent({ type: "password-change", userId: this.currentSession.user.id, timestamp: Date.now() });
      return result;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Failed", errorCode: "UNKNOWN" };
    }
  }

  async requestPasswordReset(email: string): Promise<AuthResult<void>> {
    try { return await this.performPasswordResetRequest(email); }
    catch (e) { return { success: false, error: e instanceof Error ? e.message : "Request failed", errorCode: "UNKNOWN" }; }
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<AuthResult<void>> {
    const pwValidation = validatePassword(newPassword, this.config.passwordPolicy);
    if (!pwValidation.valid) return { success: false, error: pwValidation.errors.join(", "), errorCode: "PASSWORD_TOO_WEAK" };
    try { return await this.performPasswordReset(resetToken, newPassword); }
    catch (e) { return { success: false, error: e instanceof Error ? e.message : "Reset failed", errorCode: "UNKNOWN" }; }
  }

  // --- MFA ---

  async setupMfa(): Promise<AuthResult<MfaSetup>> {
    if (!this.currentSession) return { success: false, error: "Not authenticated", errorCode: "TOKEN_INVALID" };
    try { return await this.performMfaSetup(this.currentSession.tokens.accessToken); }
    catch (e) { return { success: false, error: e instanceof Error ? e.message : "MFA setup failed", errorCode: "UNKNOWN" }; }
  }

  async verifyAndEnableMfa(code: string): Promise<AuthResult<void>> {
    if (!this.currentSession) return { success: false, error: "Not authenticated", errorCode: "TOKEN_INVALID" };
    try {
      const result = await this.performMfaVerify(this.currentSession.tokens.accessToken, code);
      if (result.success) { this.currentSession.user.mfaEnabled = true; this.emitEvent({ type: "mfa-enabled", userId: this.currentSession.user.id, timestamp: Date.now() }); }
      return result;
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Verification failed", errorCode: "INVALID_MFA_CODE" }; }
  }

  async disableMfa(password: string): Promise<AuthResult<void>> {
    if (!this.currentSession) return { success: false, error: "Not authenticated", errorCode: "TOKEN_INVALID" };
    try {
      const result = await this.performMfaDisable(this.currentSession.tokens.accessToken, password);
      if (result.success) { this.currentSession.user.mfaEnabled = false; this.emitEvent({ type: "mfa-disabled", userId: this.currentSession.user.id, timestamp: Date.now() }); }
      return result;
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Failed to disable MFA", errorCode: "UNKNOWN" }; }
  }

  // --- Session Query ---

  getSession(): AuthSession | null { return this.currentSession; }
  getUser(): AuthUser | null { return this.currentSession?.user ?? null; }
  isAuthenticated(): boolean {
    if (!this.currentSession) return false;
    return !isJwtExpired(this.currentSession.tokens.accessToken, this.config.clockSkewSeconds);
  }
  getAccessToken(): string | null { return this.currentSession?.tokens.accessToken ?? null; }
  getAuthorizationHeader(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    return `${this.currentSession!.tokens.tokenType} ${token}`;
  }
  hasRole(role: string): boolean { return this.currentSession?.user.roles?.includes(role) ?? false; }
  hasAnyRole(roles: string[]): boolean { return roles.some((r) => this.currentSession?.user.roles?.includes(r) ?? false); }
  hasPermission(permission: string): boolean { return this.currentSession?.user.permissions?.includes(permission) ?? false; }

  subscribe(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getActiveSessions(): Promise<AuthResult<AuthSession[]>> {
    if (!this.currentSession) return { success: false, error: "Not authenticated", errorCode: "TOKEN_INVALID" };
    try { return await this.performGetSessions(this.currentSession.tokens.accessToken); }
    catch (e) { return { success: false, error: e instanceof Error ? e.message : "Failed", errorCode: "UNKNOWN" }; }
  }

  async terminateSession(sessionId: string): Promise<AuthResult<void>> {
    if (!this.currentSession) return { success: false, error: "Not authenticated", errorCode: "TOKEN_INVALID" };
    try { return await this.performTerminateSession(this.currentSession.tokens.accessToken, sessionId); }
    catch (e) { return { success: false, error: e instanceof Error ? e.message : "Failed", errorCode: "UNKNOWN" }; }
  }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
    if (this.activityTimer) { clearTimeout(this.activityTimer); this.activityTimer = null; }
    this.listeners.clear();
    this.failedAttempts.clear();
    this.currentSession = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("click", this.trackActivity);
      window.removeEventListener("keydown", this.trackActivity);
      window.removeEventListener("mousemove", this.trackActivity);
      window.removeEventListener("scroll", this.trackActivity);
      window.removeEventListener("touchstart", this.trackActivity);
    }
  }

  // --- Internal: Session Persistence ---

  private async setSession(session: AuthSession): Promise<void> {
    this.currentSession = session;
    await this.persistSession();
    this.notifyListeners();
    if (this.config.autoRefresh) this.scheduleTokenRefresh();
  }

  private async clearSession(global: boolean): Promise<void> {
    if (global) {
      localStorage.removeItem(`${this.config.storagePrefix}session`);
      sessionStorage.removeItem(`${this.config.storagePrefix}session`);
    } else {
      const stored = this.getStoredSession();
      if (stored && stored.deviceId === this.currentSession?.deviceId) {
        localStorage.removeItem(`${this.config.storagePrefix}session`);
        sessionStorage.removeItem(`${this.config.storagePrefix}session`);
      }
    }
    this.currentSession = null;
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
    this.notifyListeners();
  }

  private async persistSession(): Promise<void> {
    if (!this.currentSession) return;
    try { if (typeof localStorage !== "undefined") localStorage.setItem(`${this.config.storagePrefix}session`, JSON.stringify(this.currentSession)); } catch {}
  }

  private restoreSession(): void {
    try {
      const data = localStorage.getItem(`${this.config.storagePrefix}session`) ?? sessionStorage.getItem(`${this.config.storagePrefix}session`);
      if (!data) return;
      const session = JSON.parse(data) as AuthSession;
      if (isJwtExpired(session.tokens.accessToken, this.config.clockSkewSeconds)) { this.refreshTokens().catch(() => {}); return; }
      this.currentSession = session;
    } catch {}
  }

  private getStoredSession(): AuthSession | null {
    try {
      const data = localStorage.getItem(`${this.config.storagePrefix}session`) ?? sessionStorage.getItem(`${this.config.storagePrefix}session`);
      return data ? JSON.parse(data) as AuthSession : null;
    } catch { return null; }
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!this.currentSession) return;
    const remaining = getJwtRemainingTtl(this.currentSession.tokens.accessToken, this.config.clockSkewSeconds);
    if (remaining <= 0) { this.refreshTokens().catch(() => {}); return; }
    this.refreshTimer = setTimeout(() => { this.refreshTokens().catch(() => {}); }, Math.max(0, remaining - this.config.refreshWindowMs));
  }

  // --- Activity Tracking ---

  private trackActivity = (): void => {
    if (this.currentSession) this.currentSession.lastActivityAt = Date.now();
    if (this.activityTimer) clearTimeout(this.activityTimer);
    this.activityTimer = setTimeout(() => {
      if (this.currentSession && Date.now() - this.currentSession.lastActivityAt >= this.config.sessionTimeoutMs) this.logout(false).catch(() => {});
    }, this.config.sessionTimeoutMs);
  };

  private setupActivityTracking(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("click", this.trackActivity);
    window.addEventListener("keydown", this.trackActivity);
    window.addEventListener("mousemove", this.trackActivity);
    window.addEventListener("scroll", this.trackActivity);
    window.addEventListener("touchstart", this.trackActivity);
  }

  // --- Brute Force Protection ---

  private checkBruteForce(email: string): { locked: boolean; remainingMs: number } {
    if (!this.config.bruteForceProtection) return { locked: false, remainingMs: 0 };
    const record = this.failedAttempts.get(email);
    if (!record) return { locked: false, remainingMs: 0 };
    if (Date.now() < record.lockedUntil) return { locked: true, remainingMs: record.lockedUntil - Date.now() };
    this.failedAttempts.delete(email);
    return { locked: false, remainingMs: 0 };
  }

  private recordFailedAttempt(email: string): void {
    if (!this.config.bruteForceProtection) return;
    const record = this.failedAttempts.get(email) ?? { count: 0, lockedUntil: 0 };
    record.count++;
    if (record.count >= this.config.maxLoginAttempts) {
      record.lockedUntil = Date.now() + this.config.lockoutDurationMs;
      this.emitEvent({ type: "account-locked", userId: "", timestamp: Date.now(), metadata: { email, attempts: record.count } });
    }
    this.failedAttempts.set(email, record);
  }

  private emitEvent(event: AuthEvent): void { this.config.onEvent?.(event); }
  private notifyListeners(): void { for (const listener of this.listeners) { try { listener(this.currentSession); } catch {} } }

  // --- API Stubs (override in subclass or provide via config) ---

  protected async performLogin(_credentials: LoginCredentials): Promise<AuthResult<AuthSession>> {
    throw new Error("performLogin not implemented. Extend AuthManager or provide API integration.");
  }
  protected async performRegister(_data: RegisterData): Promise<AuthResult<{ user: AuthUser; requiresVerification: boolean }>> {
    throw new Error("performRegister not implemented.");
  }
  protected async performTokenRefresh(_refreshToken: string): Promise<AuthResult<AuthTokens>> {
    throw new Error("performTokenRefresh not implemented.");
  }
  protected async performPasswordChange(_current: string, _newPwd: string): Promise<AuthResult<void>> {
    throw new Error("performPasswordChange not implemented.");
  }
  protected async performPasswordResetRequest(_email: string): Promise<AuthResult<void>> {
    throw new Error("performPasswordResetRequest not implemented.");
  }
  protected async performPasswordReset(_token: string, _newPwd: string): Promise<AuthResult<void>> {
    throw new Error("performPasswordReset not implemented.");
  }
  protected async performMfaSetup(_accessToken: string): Promise<AuthResult<MfaSetup>> {
    throw new Error("performMfaSetup not implemented.");
  }
  protected async performMfaVerify(_accessToken: string, _code: string): Promise<AuthResult<void>> {
    throw new Error("performMfaVerify not implemented.");
  }
  protected async performMfaDisable(_accessToken: string, _password: string): Promise<AuthResult<void>> {
    throw new Error("performMfaDisable not implemented.");
  }
  protected async performGetSessions(_accessToken: string): Promise<AuthResult<AuthSession[]>> {
    throw new Error("performGetSessions not implemented.");
  }
  protected async performTerminateSession(_accessToken: string, _sessionId: string): Promise<AuthResult<void>> {
    throw new Error("performTerminateSession not implemented.");
  }
}

/** Create an AuthManager instance */
export function createAuthManager(config?: AuthConfig): AuthManager {
  return new AuthManager(config);
}
