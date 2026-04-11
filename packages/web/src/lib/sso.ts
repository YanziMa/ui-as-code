/**
 * SSO (Single Sign-On): Multi-provider SSO orchestration with
 * enterprise identity provider integration, session federation,
 * cross-domain SSO, login state machine, provider discovery,
 * and unified authentication interface.
 */

// --- Types ---

export interface SsoProvider {
  /** Unique provider identifier */
  id: string;
  /** Display name */
  name: string;
  /** Provider type */
  type: "oidc" | "oauth2" | "saml" | "custom";
  /** Login URL or login function */
  loginUrl?: string;
  /** Login handler (for custom providers) */
  loginHandler?: () => Promise<SsoAuthResult>;
  /** Logout URL */
  logoutUrl?: string;
  /** Icon URL */
  iconUrl?: string;
  /** Background color for button/branding */
  color?: string;
  /** Sort order (lower = first) */
  order?: number;
  /** Is this the default provider? */
  isDefault?: boolean;
  /** Enabled? */
  enabled?: boolean;
}

export interface SsoAuthResult {
  /** Provider that authenticated */
  providerId: string;
  /** Access token */
  accessToken: string;
  /** ID token (if available) */
  idToken?: string;
  /** Refresh token */
  refreshToken?: string;
  /** User info from provider */
  user: SsoUser;
  /** Token expiry timestamp */
  expiresAt: number;
  /** Scopes granted */
  scopes: string[];
  /** Session ID from provider */
  sessionId?: string;
}

export interface SsoUser {
  /** Unique user ID from provider */
  id: string;
  /** Email address */
  email?: string;
  /** Display name */
  name?: string;
  /** Given name */
  firstName?: string;
  /** Family name */
  lastName?: string;
  /** Profile picture URL */
  avatarUrl?: string;
  /** Provider-specific raw data */
  rawData?: Record<string, unknown>;
  /** Merged attributes from all linked accounts */
  mergedAttributes?: Record<string, unknown>;
}

export interface SsoSession {
  /** Current authenticated user */
  user: SsoUser | null;
  /** Active provider */
  activeProvider: string | null;
  /** All active tokens by provider */
  tokens: Record<string, SsoAuthResult>;
  /** Session created at */
  createdAt: number;
  /** Last activity at */
  lastActivityAt: number;
  /** Session expires at */
  expiresAt: number | null;
  /** Is federated across multiple providers? */
  isFederated: boolean;
}

export interface SsoConfig {
  /** Available providers */
  providers: SsoProvider[];
  /** Default provider ID (if not marked on provider) */
  defaultProvider?: string;
  /** Session storage key (default: "sso_session") */
  storageKey?: string;
  /** Session duration in ms (default: 86400000 = 24h) */
  sessionDurationMs?: number;
  /** Enable cross-domain SSO via postMessage? */
  enableCrossDomain?: boolean;
  /** Allowed origins for cross-domain messages */
  allowedOrigins?: string[];
  /** Auto-redirect to default provider on unauthenticated access? */
  autoRedirect?: boolean;
  /** Callback path for OAuth redirects (default: "/auth/callback") */
  callbackPath?: string;
  /** Called after successful authentication */
  onAuthenticated?: (result: SsoAuthResult) => void;
  /** Called on logout */
  onLogout?: () => void;
  /** Called on auth error */
  onError?: (error: SsoError) => void;
  /** Enable session persistence across tabs? */
  crossTabSync?: boolean;
}

export interface SsoError {
  code: string;
  message: string;
  providerId?: string;
  details?: unknown;
}

export type SsoState = "unauthenticated" | "authenticating" | "authenticated" | "error" | "logging_out";

export type SsoStateHandler = (state: SsoState) => void;

// --- Main SSO Manager ---

export class SSOManager {
  private config: Required<Omit<SsoConfig, "onAuthenticated" | "onLogout" | "onError">> & {
    onAuthenticated: SsoConfig["onAuthenticated"];
    onLogout: SsoConfig["onLogout"];
    onError: SsoConfig["onError"];
  };

  private state: SsoState = "unauthenticated";
  private session: SsoSession = {
    user: null,
    activeProvider: null,
    tokens: {},
    createdAt: 0,
    lastActivityAt: 0,
    expiresAt: null,
    isFederated: false,
  };
  private stateListeners = new Set<SsoStateHandler>();
  private messageListener: ((ev: MessageEvent) => void) | null = null;

  constructor(config: SsoConfig) {
    this.config = {
      storageKey: config.storageKey ?? "sso_session",
      sessionDurationMs: config.sessionDurationMs ?? 86400000,
      enableCrossDomain: config.enableCrossDomain ?? false,
      allowedOrigins: config.allowedOrigins ?? [],
      autoRedirect: config.autoRedirect ?? false,
      callbackPath: config.callbackPath ?? "/auth/callback",
      crossTabSync: config.crossTabSync ?? true,
      onAuthenticated: config.onAuthenticated,
      onLogout: config.onLogout,
      onError: config.onError,
      ...config,
    };

    this.restoreSession();
    this.setupCrossDomainListener();
    this.setupCrossTabSync();
  }

  // --- Authentication ---

  /** Start login flow with a specific provider */
  async login(providerId?: string): Promise<SsoAuthResult> {
    const id = providerId ?? this.getDefaultProviderId();
    if (!id) throw new Error("No provider specified and no default");

    const provider = this.getProvider(id);
    if (!provider || provider.enabled === false) throw new Error(`Provider not found or disabled: ${id}`);

    this.setState("authenticating");
    this.emit({ type: "login_start", detail: { providerId: id } });

    try {
      let result: SsoAuthResult;

      if (provider.loginHandler) {
        result = await provider.loginHandler();
      } else if (provider.loginUrl) {
        // Redirect-based flow
        result = await this.handleRedirectLogin(provider);
      } else {
        throw new Error(`Provider ${id} has no login method configured`);
      }

      // Merge into session
      this.addAuthResult(result);
      this.setState("authenticated");

      if (this.config.onAuthenticated) {
        try { this.config.onAuthenticated(result); } catch {}
      }

      return result;
    } catch (error) {
      const err: SsoError = {
        code: "auth_failed",
        message: error instanceof Error ? error.message : String(error),
        providerId: id,
      };

      this.setState("error");
      if (this.config.onError) {
        try { this.config.onError(err); } catch {}
      }
      throw err;
    }
  }

  /** Handle OAuth callback (call from your callback route/page) */
  async handleCallback(params: Record<string, string>): Promise<SsoAuthResult> {
    const providerId = params.state ?? params.provider ?? this.getDefaultProviderId() ?? "";
    const error = params.error;

    if (error) {
      const err: SsoError = {
        code: error,
        message: params.error_description ?? "Authentication failed",
        providerId,
      };
      this.setState("error");
      if (this.config.onError) this.config.onError(err);
      throw err;
    }

    // Build a basic auth result from callback params
    // In production, you'd exchange the code for real tokens
    const result: SsoAuthResult = {
      providerId,
      accessToken: params.access_token ?? "",
      idToken: params.id_token,
      refreshToken: params.refresh_token,
      user: {
        id: params.sub ?? params.user_id ?? "",
        email: params.email,
        name: params.name,
        avatarUrl: params.picture,
        rawData: { ...params },
      },
      expiresAt: Date.now() + (parseInt(params.expires_in ?? "3600", 10) * 1000),
      scopes: (params.scope ?? "").split(" ").filter(Boolean),
      sessionId: params.session_state,
    };

    this.addAuthResult(result);
    this.setState("authenticated");

    if (this.config.onAuthenticated) {
      try { this.config.onAuthenticated(result); } catch {}
    }

    return result;
  }

  /** Link an additional account (federation) */
  async linkAccount(providerId: string): Promise<SsoAuthResult> {
    const result = await this.login(providerId);

    // Mark as federated
    this.session.isFederated = Object.keys(this.session.tokens).length > 1;
    this.persistSession();

    return result;
  }

  /** Unlink an account (remove provider's tokens) */
  unlinkAccount(providerId: string): void {
    delete this.session.tokens[providerId];
    this.session.isFederated = Object.keys(this.session.tokens).length > 1;
    this.persistSession();
  }

  // --- Logout ---

  /** Full logout from all providers */
  async logout(globalLogout = true): Promise<void> {
    this.setState("logging_out");

    // Call each provider's logout
    if (globalLogout) {
      for (const [providerId] of Object.entries(this.session.tokens)) {
        const provider = this.getProvider(providerId);
        if (provider?.logoutUrl) {
          // In a real implementation, you'd open a hidden iframe or redirect
          console.log(`[SSO] Logging out from ${providerId} via ${provider.logoutUrl}`);
        }
      }
    }

    this.clearSession();
    this.setState("unauthenticated");

    if (this.config.onLogout) {
      try { this.config.onLogout(); } catch {}
    }

    this.emit({ type: "logged_out" });
  }

  // --- Session ---

  /** Get current session */
  getSession(): SsoSession {
    return { ...this.session };
  }

  /** Get current authentication state */
  getState(): SsoState {
    return this.state;
  }

  /** Check if authenticated */
  isAuthenticated(): boolean {
    return this.state === "authenticated" && !!this.session.user;
  }

  /** Get current user */
  getUser(): SsoUser | null {
    return this.session.user;
  }

  /** Get access token for current or specific provider */
  getAccessToken(providerId?: string): string | null {
    const id = providerId ?? this.session.activeProvider;
    return id ? this.session.tokens[id]?.accessToken ?? null : null;
  }

  /** Get all linked providers */
  getLinkedProviders(): string[] {
    return Object.keys(this.session.tokens);
  }

  /** Check if a specific provider is linked */
  isLinked(providerId: string): boolean {
    return providerId in this.session.tokens;
  }

  // --- Providers ---

  /** Get a provider by ID */
  getProvider(id: string): SsoProvider | undefined {
    return this.config.providers.find((p) => p.id === id);
  }

  /** Get enabled providers sorted by order */
  getEnabledProviders(): SsoProvider[] {
    return this.config.providers
      .filter((p) => p.enabled !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  /** Get default provider ID */
  getDefaultProviderId(): string | null {
    // Check explicit default
    const explicitDefault = this.config.providers.find((p) => p.isDefault);
    if (explicitDefault) return explicitDefault.id;

    if (this.config.defaultProvider) return this.config.defaultProvider;

    // Return first enabled
    const first = this.config.providers.find((p) => p.enabled !== false);
    return first?.id ?? null;
  }

  // --- Events ---

  /** Subscribe to state changes */
  onStateChange(handler: SsoStateHandler): () => void {
    this.stateListeners.add(handler);
    handler(this.state);
    return () => this.stateListeners.delete(handler);
  }

  /** Destroy the manager */
  destroy(): void {
    this.clearSession();
    this.removeCrossDomainListener();
    this.removeCrossTabSync();
    this.stateListeners.clear();
  }

  // --- Private ---

  private setState(newState: SsoState): void {
    this.state = newState;
    for (const listener of this.stateListeners) {
      try { listener(newState); } catch {}
    }
  }

  private addAuthResult(result: SsoAuthResult): void {
    this.session.tokens[result.providerId] = result;
    this.session.activeProvider = result.providerId;
    this.session.user = result.user;
    this.session.lastActivityAt = Date.now();
    this.session.expiresAt = Math.max(
      this.session.expiresAt ?? 0,
      result.expiresAt,
    ) || null;
    this.session.isFederated = Object.keys(this.session.tokens).length > 1;

    if (!this.session.createdAt) {
      this.session.createdAt = Date.now();
    }

    this.persistSession();
  }

  private handleRedirectLogin(provider: SsoProvider): Promise<SsoAuthResult> {
    // Store pending provider for callback handling
    this.storeItem("sso_pending_provider", provider.id);

    // Redirect to provider login URL
    const url = new URL(provider.loginUrl!);
    url.searchParams.set("redirect_uri", `${window.location.origin}${this.config.callbackPath}`);
    url.searchParams.set("state", provider.id);

    window.location.href = url.toString();

    // Return a promise that never resolves (we're redirecting)
    return new Promise(() => {});
  }

  private persistSession(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.session));
    } catch {}
  }

  private restoreSession(): void {
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      if (raw) {
        const restored = JSON.parse(raw) as SsoSession;

        // Check expiry
        if (restored.expiresAt && Date.now() > restored.expiresAt) {
          this.clearSession();
          return;
        }

        this.session = restored;
        this.state = this.session.user ? "authenticated" : "unauthenticated";
      }
    } catch {}
  }

  private clearSession(): void {
    this.session = {
      user: null,
      activeProvider: null,
      tokens: {},
      createdAt: 0,
      lastActivityAt: 0,
      expiresAt: null,
      isFederated: false,
    };
    try { localStorage.removeItem(this.config.storageKey); } catch {}
  }

  // Cross-domain SSO
  private setupCrossDomainListener(): void {
    if (!this.config.enableCrossDomain || typeof window === "undefined") return;

    this.messageListener = (event: MessageEvent) => {
      if (!this.isOriginAllowed(event.origin)) return;

      const data = event.data;
      if (typeof data !== "object" || data?.type !== "sso") return;

      switch (data.action) {
        case "sync_session":
          // Receive session sync from another domain/tab
          if (data.session) {
            this.session = data.session as SsoSession;
            this.persistSession();
            this.setState(this.session.user ? "authenticated" : "unauthenticated");
          }
          break;

        case "logout":
          this.clearSession();
          this.setState("unauthenticated");
          break;

        case "request_session":
          // Respond with our session
          if (event.source) {
            event.source.postMessage(
              { type: "sso", action: "session_response", session: this.getSession() },
              event.origin,
            );
          }
          break;
      }
    };

    window.addEventListener("message", this.messageListener);
  }

  private removeCrossDomainListener(): void {
    if (this.messageListener) {
      window.removeEventListener("message", this.messageListener);
      this.messageListener = null;
    }
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.config.allowedOrigins.length === 0) return true;
    return this.config.allowedOrigins.some((allowed) =>
      origin === allowed || origin.startsWith(allowed),
    );
  }

  // Cross-tab sync
  private setupCrossTabSync(): void {
    if (!this.config.crossTabSync || typeof window === "undefined") return;

    const handler = (e: StorageEvent) => {
      if (e.key === this.config.storageKey && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue) as SsoSession;
          this.session = updated;
          this.setState(updated.user ? "authenticated" : "unauthenticated");
        } catch {}
      }
    };

    window.addEventListener("storage", handler);
    // Store cleanup ref for destroy
    (this as unknown as Record<string, unknown>)._tabSyncHandler = handler;
  }

  private removeCrossTabSync(): void {
    const handler = (this as unknown as Record<string, unknown>)._tabSyncHandler as ((e: StorageEvent) => void) | undefined;
    if (handler) {
      window.removeEventListener("storage", handler);
    }
  }

  private emit(event: { type: string; detail?: unknown }): void {
    // Dispatch custom event for external listeners
    try {
      window.dispatchEvent(new CustomEvent(`sso:${event.type}`, { detail: event.detail }));
    } catch {}
  }

  // Storage helpers
  private storeItem(key: string, value: string): void {
    try { sessionStorage.setItem(key, value); } catch {}
  }

  private retrieveItem(key: string): string | null {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }
}

/** Create a pre-configured SSO manager */
export function createSSOManager(config: SsoConfig): SSOManager {
  return new SSOManager(config);
}
