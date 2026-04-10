/**
 * Session Management — token storage, refresh, expiry tracking,
 * multi-tab synchronization, idle timeout, and session locking.
 */

// --- Types ---

export interface SessionData {
  /** Access token */
  accessToken: string;
  /** Refresh token (optional) */
  refreshToken?: string;
  /** Token type (Bearer, etc.) */
  tokenType: string;
  /** Expiry timestamp (ms) */
  expiresAt: number;
  /** User ID */
  userId: string;
  /** Session creation time */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface SessionConfig {
  /** Storage key prefix */
  storagePrefix?: string;
  /** Use localStorage (cross-tab) vs sessionStorage */
  storageType?: "local" | "session";
  /** Auto-refresh before expiry (ms before expiry) */
  refreshBufferMs?: number;
  /** Idle timeout in ms (0 = disabled) */
  idleTimeoutMs?: number;
  /** Maximum session duration in ms (0 = unlimited) */
  maxSessionDurationMs?: number;
  /** Heartbeat interval for multi-tab sync (ms) */
  heartbeatIntervalMs?: number;
  /** Callback when session expires */
  onExpire?: () => void;
  /** Callback when session refreshes */
  onRefresh?: (newSession: SessionData) => void;
  /** Callback when session is about to expire (warning) */
  onExpiringSoon?: (remainingMs: number) => void;
  /** Custom refresh function */
  refreshTokenFn?: (refreshToken: string) => Promise<SessionData>;
}

export interface SessionState {
  status: "active" | "expiring" | "expired" | "idle" | "locked";
  session: SessionData | null;
  remainingMs: number;
  idleRemainingMs: number;
}

type SessionEventType = "change" | "expire" | "refresh" | "expiring-soon" | "idle" | "lock" | "unlock";

export type SessionListener = (state: SessionState, event: SessionEventType) => void;

// --- Storage Key Constants ---

const DEFAULT_PREFIX = "session_";
const KEYS = {
  data: "data",
  activity: "activity",
  lock: "lock",
} as const;

// --- Main Session Manager ---

/**
 * Manages user session lifecycle including token storage,
 * auto-refresh, idle detection, and cross-tab sync.
 *
 * @example
 * ```ts
 * const sm = new SessionManager({
 *   refreshTokenFn: async (rt) => { ... },
 *   idleTimeoutMs: 30 * 60 * 1000, // 30 min
 * });
 * sm.start({ accessToken: "...", expiresAt: Date.now() + 3600000, userId: "1", tokenType: "Bearer" });
 * ```
 */
export class SessionManager {
  private config: Required<SessionConfig> & { refreshTokenFn?: SessionConfig["refreshTokenFn"] };
  private session: SessionData | null = null;
  private listeners = new Set<SessionListener>();
  private destroyed = false;

  // Timers
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;

  // State tracking
  private lastActivity = Date.now();
  private isLocked = false;
  private isRefreshing = false;

  constructor(config: SessionConfig = {}) {
    this.config = {
      storagePrefix: config.storagePrefix ?? DEFAULT_PREFIX,
      storageType: config.storageType ?? "local",
      refreshBufferMs: config.refreshBufferMs ?? 5 * 60 * 1000, // 5 min
      idleTimeoutMs: config.idleTimeoutMs ?? 0,
      maxSessionDurationMs: config.maxSessionDurationMs ?? 0,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 10_000,
      onExpire: config.onExpire ?? (() => {}),
      onRefresh: config.onRefresh ?? (() => {}),
      onExpiringSoon: config.onExpiringSoon ?? (() => {}),
      refreshTokenFn: config.refreshTokenFn,
    };

    // Listen for activity events
    if (typeof window !== "undefined") {
      this.setupActivityTracking();
      // Listen for changes from other tabs
      window.addEventListener("storage", (e) => {
        const prefix = this.config.storagePrefix;
        if (e.key?.startsWith(prefix)) {
          this.hydrateFromStorage();
        }
      });
    }

    // Hydrate existing session
    this.hydrateFromStorage();
  }

  // --- Lifecycle ---

  /**
   * Start a new session or update existing one.
   */
  start(data: SessionData): void {
    this.session = {
      ...data,
      createdAt: data.createdAt ?? Date.now(),
      lastActivityAt: Date.now(),
    };

    this.lastActivity = Date.now();
    this.isLocked = false;
    this.persist();
    this.startTimers();
    this.emit("change", this.getState());
  }

  /**
   * End the current session.
   */
  end(): void {
    this.clearTimers();
    this.session = null;
    this.clearStorage();
    this.emit("expire", this.getState());
    this.config.onExpire();
  }

  /**
   * Destroy the manager completely.
   */
  destroy(): void {
    this.destroyed = true;
    this.end();
    this.listeners.clear();
  }

  // --- State ---

  /** Get current session state snapshot */
  getState(): SessionState {
    const now = Date.now();
    return {
      status: this.determineStatus(),
      session: this.session ? { ...this.session } : null,
      remainingMs: this.session ? Math.max(0, this.session.expiresAt - now) : 0,
      idleRemainingMs: this.config.idleTimeoutMs > 0
        ? Math.max(0, this.config.idleTimeoutMs - (now - this.lastActivity))
        : Infinity,
    };
  }

  /** Check if session is active */
  get isActive(): boolean {
    return this.determineStatus() === "active";
  }

  /** Get the access token (or null) */
  getAccessToken(): string | null {
    return this.session?.accessToken ?? null;
  }

  /** Get Authorization header value */
  getAuthHeader(): string | null {
    const token = this.getAccessToken();
    return token ? `${this.session?.tokenType ?? "Bearer"} ${token}` : null;
  }

  // --- Activity ---

  /** Record user activity (resets idle timer) */
  recordActivity(): void {
    this.lastActivity = Date.now();
    if (this.session) {
      this.session.lastActivityAt = Date.now();
      this.persistActivity();
    }
    this.resetIdleTimer();
  }

  // --- Locking ---

  /** Lock the session (e.g., screen lock) */
  lock(): void {
    this.isLocked = true;
    this.setStorageLock(true);
    this.emit("lock", this.getState());
  }

  /** Unlock the session */
  unlock(): void {
    this.isLocked = false;
    this.setStorageLock(false);
    this.recordActivity();
    this.emit("unlock", this.getState());
  }

  get isSessionLocked(): boolean { return this.isLocked; }

  // --- Listeners ---

  /** Subscribe to session state changes */
  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.getState(), "change");
    return () => this.listeners.delete(listener);
  }

  // --- Manual Refresh ---

  /**
   * Force a session refresh using the configured refresh function.
   */
  async refresh(): Promise<boolean> {
    if (!this.session?.refreshToken || !this.config.refreshTokenFn || this.isRefreshing) {
      return false;
    }

    this.isRefreshing = true;
    try {
      const newSession = await this.config.refreshTokenFn(this.session.refreshToken);
      this.start(newSession);
      this.config.onRefresh(newSession);
      this.emit("refresh", this.getState());
      return true;
    } catch (err) {
      console.error("[Session] Refresh failed:", err);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // --- Internal ---

  private determineStatus(): SessionState["status"] {
    if (!this.session) return "expired";
    if (this.isLocked) return "locked";

    const now = Date.now();

    // Expired?
    if (now >= this.session.expiresAt) return "expired";

    // Idle?
    if (this.config.idleTimeoutMs > 0 && now - this.lastActivity >= this.config.idleTimeoutMs) {
      return "idle";
    }

    // Expiring soon (< refresh buffer)?
    if (now >= this.session.expiresAt - this.config.refreshBufferMs) {
      return "expiring";
    }

    return "active";
  }

  private startTimers(): void {
    this.clearTimers();

    if (!this.session) return;

    const now = Date.now();
    const expiresIn = this.session.expiresAt - now;

    // Expiry timer
    if (expiresIn > 0) {
      this.expiryTimer = setTimeout(() => {
        this.end();
      }, expiresIn);

      // Warning timer (at refresh buffer threshold)
      const warningTime = this.config.refreshBufferMs;
      if (warningTime < expiresIn) {
        this.warningTimer = setTimeout(() => {
          const remaining = this.session!.expiresAt - Date.now();
          this.config.onExpiringSoon(remaining);
          this.emit("expiring-soon", this.getState());

          // Attempt auto-refresh
          if (this.config.refreshTokenFn && this.session?.refreshToken) {
            this.refresh();
          }
        }, expiresIn - warningTime);
      }
    }

    // Idle timer
    this.resetIdleTimer();

    // Max duration timer
    if (this.config.maxSessionDurationMs > 0 && this.session.createdAt) {
      const maxEnd = this.session.createdAt + this.config.maxSessionDurationMs - now;
      if (maxEnd > 0) {
        this.maxDurationTimer = setTimeout(() => {
          this.end();
        }, maxEnd);
      }
    }

    // Heartbeat for multi-tab sync
    if (this.config.storageType === "local") {
      this.heartbeatTimer = setInterval(() => {
        this.persistActivity();
      }, this.config.heartbeatIntervalMs);
    }
  }

  private clearTimers(): void {
    if (this.expiryTimer) { clearTimeout(this.expiryTimer); this.expiryTimer = null; }
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.maxDurationTimer) { clearTimeout(this.maxDurationTimer); this.maxDurationTimer = null; }
    if (this.warningTimer) { clearTimeout(this.warningTimer); this.warningTimer = null; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);

    if (this.config.idleTimeoutMs > 0) {
      this.idleTimer = setTimeout(() => {
        this.emit("idle", this.getState());
      }, this.config.idleTimeoutMs);
    }
  }

  private setupActivityTracking(): void {
    const events = ["mousedown", "keydown", "touchstart", "scroll", "pointermove"];
    for (const event of events) {
      window.addEventListener(event, () => this.recordActivity(), { passive: true });
    }
    // Visibility change — tab focus counts as activity
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.recordActivity();
    });
  }

  // --- Persistence ---

  private getStorage(): Storage {
    return this.config.storageType === "session" ? sessionStorage : localStorage;
  }

  private key(name: string): string {
    return this.config.storagePrefix + name;
  }

  private persist(): void {
    try {
      this.getStorage().setItem(this.key(KEYS.data), JSON.stringify(this.session));
    } catch {
      // Storage full
    }
  }

  private persistActivity(): void {
    try {
      this.getStorage().setItem(this.key(KEYS.activity), String(Date.now()));
    } catch {}
  }

  private setStorageLock(locked: boolean): void {
    try {
      if (locked) {
        this.getStorage().setItem(this.key(KEYS.lock), "1");
      } else {
        this.getStorage().removeItem(this.key(KEYS.lock));
      }
    } catch {}
  }

  private clearStorage(): void {
    const storage = this.getStorage();
    for (const k of Object.values(KEYS)) {
      storage.removeItem(this.key(k));
    }
  }

  private hydrateFromStorage(): void {
    try {
      const raw = this.getStorage().getItem(this.key(KEYS.data));
      if (raw) {
        this.session = JSON.parse(raw) as SessionData;
        // Restore activity time
        const activityRaw = this.getStorage().getItem(this.key(KEYS.activity));
        if (activityRaw) {
          this.lastActivity = parseInt(activityRaw, 10);
        }
        // Restore lock state
        const locked = this.getStorage().getItem(this.key(KEYS.lock));
        this.isLocked = !!locked;
        this.startTimers();
      }
    } catch {
      // Corrupted data
    }
  }

  private emit(event: SessionEventType, state: SessionState): void {
    if (this.destroyed) return;
    for (const listener of this.listeners) {
      try { listener(state, event); } catch {}
    }
  }
}
