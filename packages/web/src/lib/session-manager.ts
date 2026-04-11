/**
 * Session Manager: Session lifecycle management with multiple storage
 * backends, idle timeout, activity tracking, concurrent session handling,
 * session events, and persistence strategies.
 */

// --- Types ---

export interface SessionConfig {
  /** Storage backend (default: "memory") */
  storage?: "memory" | "localStorage" | "sessionStorage" | "cookie";
  /** Session key in storage (default: "session") */
  storageKey?: string;
  /** Session duration in ms (default: 3600000 = 1 hour) */
  durationMs?: number;
  /** Idle timeout in ms (0 = disabled, default: 1800000 = 30 min) */
  idleTimeoutMs?: number;
  /** Warning time before expiry in ms (default: 300000 = 5 min) */
  warningTimeMs?: number;
  /** Renew activity on these events (default: all listed) */
  activityEvents?: Array<"click" | "keydown" | "scroll" | "touchstart" | "mousemove">;
  /** Enable heartbeat to keep session alive? */
  heartbeatEnabled?: boolean;
  /** Heartbeat interval in ms (default: 60000) */
  heartbeatIntervalMs?: number;
  /** Heartbeat URL (optional, for server-side keep-alive) */
  heartbeatUrl?: string;
  /** Cookie options if using cookie storage */
  cookieOptions?: {
    domain?: string;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  };
  /** Auto-destroy on tab close? (only for sessionStorage-like behavior) */
  destroyOnHide?: boolean;
}

export interface SessionData {
  /** Unique session ID */
  id: string;
  /** User ID (if authenticated) */
  userId?: string;
  /** Session creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Expiry timestamp */
  expiresAt: number;
  /** Custom data payload */
  data?: Record<string, unknown>;
  /** Device/user agent fingerprint */
  deviceInfo?: string;
  /** Number of renewals */
  renewalCount: number;
}

export interface SessionState {
  status: "active" | "idle" | "expiring" | "expired" | "destroyed";
  session: SessionData | null;
  remainingMs: number;
  idleRemainingMs: number;
  isWarning: boolean;
}

export type SessionEventHandler = (state: SessionState) => void;
export type SessionExpireHandler = (session: SessionData) => void;

// --- Storage Backends ---

interface StorageBackend {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

class MemoryStorage implements StorageBackend {
  private store = new Map<string, string>();
  get(key: string): string | null { return this.store.get(key) ?? null; }
  set(key: string, value: string): void { this.store.set(key, value); }
  remove(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
}

class CookieStorage implements StorageBackend {
  constructor(private domain?: string, private secure?: boolean, private sameSite?: "Strict" | "Lax" | "None") {}
  get(key: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
  set(key: string, value: string): void {
    let str = `${key}=${encodeURIComponent(value)}; path=/`;
    if (this.domain) str += `; domain=${this.domain}`;
    if (this.secure) str += "; secure";
    if (this.sameSite) str += `; samesite=${this.sameSite}`;
    document.cookie = str;
  }
  remove(key: string): void {
    let str = `${key}=; path=/; max-age=-1; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    if (this.domain) str += `; domain=${this.domain}`;
    document.cookie = str;
  }
  clear(): void {} // Can't clear all cookies
}

// --- Main Class ---

export class SessionManager {
  private config: Required<Omit<SessionConfig, "cookieOptions">> & { cookieOptions: SessionConfig["cookieOptions"] };
  private storage: StorageBackend;
  private session: SessionData | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private activityCleanup: (() => void) | null = null;
  private visibilityCleanup: (() => void) | null = null;
  private destroyed = false;

  // Event listeners
  private stateListeners = new Set<SessionEventHandler>();
  private expireListeners = new Set<SessionExpireHandler>();
  private idleListeners = new Set<SessionEventHandler>();
  private renewListeners = new Set<(session: SessionData) => void>();

  constructor(config: SessionConfig = {}) {
    this.config = {
      storage: config.storage ?? "memory",
      storageKey: config.storageKey ?? "session",
      durationMs: config.durationMs ?? 3600000,
      idleTimeoutMs: config.idleTimeoutMs ?? 1800000,
      warningTimeMs: config.warningTimeMs ?? 300000,
      activityEvents: config.activityEvents ?? ["click", "keydown", "scroll", "touchstart", "mousemove"],
      heartbeatEnabled: config.heartbeatEnabled ?? false,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 60000,
      heartbeatUrl: config.heartbeatUrl,
      destroyOnHide: config.destroyOnHide ?? false,
      cookieOptions: config.cookieOptions ?? {},
    };

    this.storage = this.createStorage();
    this.restoreSession();
  }

  // --- Session Lifecycle ---

  /** Create a new session */
  create(data?: Record<string, string>, userId?: string): SessionData {
    const now = Date.now();

    const session: SessionData = {
      id: this.generateSessionId(),
      userId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + this.config.durationMs,
      data,
      deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      renewalCount: 0,
    };

    this.session = session;
    this.persistSession();
    this.startTimers();
    this.setupActivityTracking();
    this.notifyStateChange();

    return session;
  }

  /** Restore session from storage */
  restoreSession(): SessionData | null {
    try {
      const raw = this.storage.get(this.config.storageKey);
      if (!raw) return null;

      const session = JSON.parse(raw) as SessionData;

      // Check if expired
      if (Date.now() > session.expiresAt) {
        this.destroy("expired");
        return null;
      }

      this.session = session;
      this.startTimers();
      this.setupActivityTracking();
      this.notifyStateChange();

      return session;
    } catch {
      return null;
    }
  }

  /** Renew/extend the session */
  renew(extraDurationMs?: number): SessionData | null {
    if (!this.session) return null;

    this.session.lastActivityAt = Date.now();
    this.session.expiresAt = Date.now() + (extraDurationMs ?? this.config.durationMs);
    this.session.renewalCount++;

    this.persistSession();
    this.resetIdleTimer();
    this.resetExpiryTimer();
    this.notifyStateChange();

    for (const listener of this.renewListeners) {
      try { listener(this.session!); } catch {}
    }

    return this.session;
  }

  /** Destroy the current session */
  destroy(reason = "manual"): void {
    this.clearTimers();
    this.cleanupActivityTracking();

    const prevSession = this.session;
    this.session = null;
    this.storage.remove(this.config.storageKey);

    if (prevSession) {
      for (const listener of this.expireListeners) {
        try { listener(prevSession); } catch {}
      }
    }

    this.destroyed = true;
    this.notifyStateChange();
  }

  // --- State ---

  /** Get current session state */
  getState(): SessionState {
    const now = Date.now();
    const remaining = this.session ? Math.max(0, this.session.expiresAt - now) : 0;
    const idleRemaining = this.idleTimeoutActive()
      ? Math.max(0, this.getIdleExpiry() - now)
      : Infinity;

    let status: SessionState["status"] = "active";

    if (!this.session || this.destroyed) {
      status = "destroyed";
    } else if (now >= this.session.expiresAt) {
      status = "expired";
    } else if (remaining <= this.config.warningTimeMs && remaining > 0) {
      status = "expiring";
    } else if (this.isIdle()) {
      status = "idle";
    }

    return {
      status,
      session: this.session ? { ...this.session } : null,
      remainingMs: remaining,
      idleRemainingMs,
      isWarning: status === "expiring",
    };
  }

  /** Check if session exists and is active */
  isActive(): boolean {
    const state = this.getState();
    return state.status === "active" || state.status === "idle" || state.status === "expiring";
  }

  /** Check if currently idle */
  isIdle(): boolean {
    if (!this.session || !this.config.idleTimeoutMs) return false;
    return Date.now() - this.session.lastActivityAt > this.config.idleTimeoutMs;
  }

  /** Get the current session data (read-only copy) */
  getSession(): SessionData | null {
    return this.session ? { ...this.session } : null;
  }

  /** Update custom session data */
  updateData(data: Record<string, unknown>): void {
    if (!this.session) return;

    this.session.data = { ...this.session.data, ...data };
    this.persistSession();
  }

  /** Get a specific data field from session */
  getDataField<T = unknown>(key: string): T | undefined {
    return this.session?.data?.[key] as T | undefined;
  }

  // --- Events ---

  /** Subscribe to any state change */
  onStateChange(handler: SessionEventHandler): () => void {
    this.stateListeners.add(handler);
    handler(this.getState());
    return () => this.stateListeners.delete(handler);
  }

  /** Subscribe to session expiration */
  onExpire(handler: SessionExpireHandler): () => void {
    this.expireListeners.add(handler);
    return () => this.expireListeners.delete(handler);
  }

  /** Subscribe to idle state changes */
  onIdle(handler: SessionEventHandler): () => void {
    this.idleListeners.add(handler);
    return () => this.idleListeners.delete(handler);
  }

  /** Subscribe to session renewals */
  onRenew(handler: (session: SessionData) => void): () => void {
    this.renewListeners.add(handler);
    return () => this.renewListeners.delete(handler);
  }

  // --- Private ---

  private generateSessionId(): string {
    const ts = Date.now().toString(36);
    const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    return `sess_${ts}_${rand}`;
  }

  private createStorage(): StorageBackend {
    switch (this.config.storage) {
      case "localStorage":
        return {
          get: (k) => localStorage.getItem(k),
          set: (k, v) => localStorage.setItem(k, v),
          remove: (k) => localStorage.removeItem(k),
          clear: () => localStorage.clear(),
        };
      case "sessionStorage":
        return {
          get: (k) => sessionStorage.getItem(k),
          set: (k, v) => sessionStorage.setItem(k, v),
          remove: (k) => sessionStorage.removeItem(k),
          clear: () => sessionStorage.clear(),
        };
      case "cookie":
        return new CookieStorage(
          this.config.cookieOptions?.domain,
          this.config.cookieOptions?.secure,
          this.config.cookieOptions?.sameSite,
        );
      default:
        return new MemoryStorage();
    }
  }

  private persistSession(): void {
    if (this.session) {
      this.storage.set(this.config.storageKey, JSON.stringify(this.session));
    }
  }

  private startTimers(): void {
    this.clearTimers();

    if (!this.session) return;

    const now = Date.now();
    const remaining = this.session.expiresAt - now;

    // Expiry timer
    if (remaining > 0) {
      this.expiryTimer = setTimeout(() => {
        this.handleExpiry();
      }, remaining);
    }

    // Warning timer
    const warningAt = this.session.expiresAt - this.config.warningTimeMs;
    if (warningAt > now) {
      this.warningTimer = setTimeout(() => {
        this.notifyStateChange();
      }, warningAt - now);
    }

    // Idle timer
    this.resetIdleTimer();

    // Heartbeat
    if (this.config.heartbeatEnabled) {
      this.heartbeatTimer = setInterval(async () => {
        await this.sendHeartbeat();
      }, this.config.heartbeatIntervalMs);
    }
  }

  private clearTimers(): void {
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.expiryTimer) { clearTimeout(this.expiryTimer); this.expiryTimer = null; }
    if (this.warningTimer) { clearTimeout(this.warningTimer); this.warningTimer = null; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);

    if (this.config.idleTimeoutMs && this.session) {
      this.idleTimer = setTimeout(() => {
        this.handleIdle();
      }, this.config.idleTimeoutMs);
    }
  }

  private resetExpiryTimer(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);

    if (this.session) {
      const remaining = this.session.expiresAt - Date.now();
      if (remaining > 0) {
        this.expiryTimer = setTimeout(() => {
          this.handleExpiry();
        }, remaining);
      }
    }
  }

  private handleExpiry(): void {
    if (this.destroyed) return;

    const prevSession = this.session;
    this.destroy("expired");

    if (prevSession) {
      for (const listener of this.expireListeners) {
        try { listener(prevSession); } catch {}
      }
    }
  }

  private handleIdle(): void {
    if (this.destroyed || !this.session) return;

    const state = this.getState();
    for (const listener of this.idleListeners) {
      try { listener(state); } catch {}
    }
  }

  private recordActivity(): void {
    if (!this.session || this.destroyed) return;

    this.session.lastActivityAt = Date.now();
    this.persistSession();
    this.resetIdleTimer();

    // If was idle, notify state change
    if (this.isIdle()) {
      this.notifyStateChange();
    }
  }

  private setupActivityTracking(): void {
    this.cleanupActivityTracking();

    if (typeof window === "undefined") return;

    const handler = () => this.recordActivity();

    for (const event of this.config.activityEvents) {
      window.addEventListener(event, handler, { passive: true });
    }

    this.activityCleanup = () => {
      for (const event of this.config.activityEvents) {
        window.removeEventListener(event, handler);
      }
    };

    // Visibility change handler
    if (this.config.destroyOnHide) {
      const visHandler = () => {
        if (document.hidden) {
          // Don't immediately destroy — just note it
          // The expiry timer will handle actual destruction
        }
      };
      document.addEventListener("visibilitychange", visHandler);
      this.visibilityCleanup = () => {
        document.removeEventListener("visibilitychange", visHandler);
      };
    }
  }

  private cleanupActivityTracking(): void {
    if (this.activityCleanup) { this.activityCleanup(); this.activityCleanup = null; }
    if (this.visibilityCleanup) { this.visibilityCleanup(); this.visibilityCleanup = null; }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.session || !this.config.heartbeatUrl) return;

    try {
      const response = await fetch(this.config.heartbeatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: this.session.id }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.warn("[Session] Heartbeat failed:", response.status);
      }
    } catch {
      // Heartbeat failure is non-fatal
    }
  }

  private idletimeoutActive(): boolean {
    return !!this.config.idleTimeoutMs && this.config.idleTimeoutMs > 0;
  }

  private getIdleExpiry(): number {
    if (!this.session) return 0;
    return this.session.lastActivityAt + this.config.idleTimeoutMs!;
  }

  private notifyStateChange(): void {
    const state = this.getState();
    for (const listener of this.stateListeners) {
      try { listener(state); } catch {}
    }
  }
}

/** Create a pre-configured session manager */
export function createSessionManager(config?: SessionConfig): SessionManager {
  return new SessionManager(config);
}
