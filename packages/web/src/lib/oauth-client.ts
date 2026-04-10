/**
 * OAuth 2.0 Client: Browser-side OAuth2 authorization with PKCE support,
 * token management, multiple provider presets, state/nonce handling, popup
 * vs redirect flows, token refresh/revocation, and session persistence.
 */

// --- Types ---

export type OAuthFlow = "authorization_code" | "implicit" | "hybrid";
export type ResponseType = "code" | "token" | "id_token" | "code token" | "code id_token";
export type GrantType = "authorization_code" | "refresh_token" | "password" | "client_credentials";

export interface OAuthProviderConfig {
  /** Provider name (e.g., "google", "github") */
  name: string;
  /** Authorization endpoint URL */
  authorizeUrl: string;
  /** Token endpoint URL */
  tokenUrl: string;
  /** User info endpoint (optional) */
  userInfoUrl?: string;
  /** Revoke endpoint (optional) */
  revokeUrl?: string;
  /** Client ID */
  clientId: string;
  /** Client secret (for server-side flows) */
  clientSecret?: string;
  /** Scopes to request */
  scopes: string[];
  /** Redirect URI for code flow */
  redirectUri?: string;
  /** Icon URL or emoji */
  icon?: string;
  /** Display name */
  displayName?: string;
  /** PKCE method ("S256" | "plain") */
  pkceMethod?: "S256" | "plain";
}

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  obtained_at: number; // Timestamp when token was received
}

export interface OAuthSession {
  provider: string;
  tokens: OAuthToken;
  userInfo?: Record<string, unknown>;
  createdAt: number;
  lastUsedAt: number;
}

export interface OAuthOptions {
  /** Flow type (default: "authorization_code") */
  flow?: OAuthFlow;
  /** Use popup window instead of redirect */
  usePopup?: boolean;
  /** Popup width/height */
  popupSize?: { width: number; height: number };
  /** Extra params to add to auth URL */
  extraParams?: Record<string, string>;
  /** Custom redirect URI override */
  redirectUri?: string;
  /** State to include in auth request */
  state?: string;
  /** Token storage key prefix */
  storageKey?: string;
  /** Auto-refresh before expiry (default: true) */
  autoRefresh?: boolean;
  /** Refresh buffer seconds (refresh this many sec before expiry) */
  refreshBuffer?: number;
}

// --- Built-in Provider Presets ---

const PROVIDER_PRESETS: Record<string, Partial<OAuthProviderConfig>> = {
  google: {
    name: "google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: ["openid", "email", "profile"],
    icon: "🔵",
    displayName: "Google",
    pkceMethod: "S256",
  },
  github: {
    name: "github",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: ["read:user", "user:email"],
    icon: "🐙",
    displayName: "GitHub",
  },
  facebook: {
    name: "facebook",
    authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/me?fields=id,name,email,picture",
    scopes: ["email", "public_profile"],
    icon: "📘",
    displayName: "Facebook",
  },
  microsoft: {
    name: "microsoft",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    scopes: ["User.Read", "Mail.Read"],
    icon: "🟢",
    displayName: "Microsoft",
    pkceMethod: "S256",
  },
  discord: {
    name: "discord",
    authorizeUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    scopes: ["identify", "email"],
    icon: "🎮",
    displayName: "Discord",
  },
  slack: {
    name: "slack",
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    userInfoUrl: "https://slack.com/api/users.info",
    scopes: ["users:read", "users:read.email"],
    icon: "💼",
    displayName: "Slack",
  },
  apple: {
    name: "apple",
    authorizeUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    scopes: ["name", "email"],
    icon: "🍎",
    displayName: "Apple",
    pkceMethod: "S256",
  },
  gitlab: {
    name: "gitlab",
    authorizeUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    userInfoUrl: "https://gitlab.com/api/v4/user",
    scopes: ["read_user", "openid", "profile", "email"],
    icon: "🦊",
    displayName: "GitLab",
  },
};

// --- Main OAuth Client ---

/**
 * OAuth 2.0 client for browser applications.
 *
 * ```ts
 * const oauth = new OAuthClient({ clientId: "your-client-id" });
 *
 * // Quick login with Google
 * const session = await oauth.authorize("google");
 * console.log(session.userInfo); // { email, name, picture }
 *
 * // Or configure custom provider
 * oauth.addProvider({
 *   name: "custom",
 *   authorizeUrl: "https://auth.example.com/authorize",
 *   tokenUrl: "https://auth.example.com/token",
 *   clientId: "...",
 *   scopes: ["read", "write"],
 * });
 * ```
 */
export class OAuthClient {
  private providers = new Map<string, OAuthProviderConfig>();
  private sessions = new Map<string, OAuthSession>();
  private defaultOptions: Required<OAuthOptions>;
  private pendingState: Map<string, { resolve: (tokens: OAuthToken) => void; reject: (err: Error) => void }> = new Map();
  private refreshTimers = new Map<string, ReturnType<typeof setTimeout>>;

  constructor(defaults?: Partial<OAuthProviderConfig> & { storageKey?: string }) {
    // Register built-in presets
    for (const [name, preset] of Object.entries(PROVIDER_PRESETS)) {
      if (!this.providers.has(name)) {
        this.providers.set(name, {
          ...preset,
          clientId: defaults?.clientId ?? "",
          clientSecret: defaults?.clientSecret,
          redirectUri: defaults?.redirectUri ?? `${window.location.origin}/auth/callback`,
          scopes: preset.scopes ?? [],
        } as OAuthProviderConfig);
      }
    }

    this.defaultOptions = {
      flow: "authorization_code",
      usePopup: false,
      popupSize: { width: 500, height: 600 },
      extraParams: {},
      redirectUri: undefined,
      state: undefined,
      storageKey: defaults?.storageKey ?? "oauth-sessions",
      autoRefresh: true,
      refreshBuffer: 300,
    };
  }

  // --- Provider Management ---

  /** Add or update a provider configuration */
  addProvider(config: OAuthProviderConfig): void {
    this.providers.set(config.name, config);
  }

  /** Get a provider configuration */
  getProvider(name: string): OAuthProviderConfig | undefined {
    return this.providers.get(name);
  }

  /** List all registered providers */
  listProviders(): OAuthProviderConfig[] {
    return Array.from(this.providers.values());
  }

  // --- Authorization ---

  /**
   * Start the OAuth authorization flow.
   * Returns tokens + optional user info.
   */
  async authorize(providerName: string, options?: Partial<OAuthOptions>): Promise<OAuthSession> {
    const opts = { ...this.defaultOptions, ...options };
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);

    const state = opts.state ?? this.generateState();
    const nonce = this.generateNonce();

    // Build authorization URL
    const params: Record<string, string> = {
      client_id: provider.clientId,
      response_type: opts.flow === "implicit" ? "token" : "code",
      redirect_uri: opts.redirectUri ?? provider.redirectUri ?? `${window.location.origin}/auth/callback`,
      scope: provider.scopes.join(" "),
      state,
      ...(opts.extraParams ?? {}),
    };

    // PKCE code challenge
    let codeVerifier: string | undefined;
    if (opts.flow === "authorization_code") {
      codeVerifier = this.generateCodeVerifier();
      const challenge = await this.generateCodeChallenge(codeVerifier, provider.pkceMethod ?? "S256");
      params.code_challenge = challenge;
      params.code_challenge_method = provider.pkceMethod ?? "S256";
    }

    const authUrl = this.buildUrl(provider.authorizeUrl, params);

    if (opts.usePopup) {
      return this.popupFlow(authUrl, provider, state, codeVerifier, opts);
    } else {
      return this.redirectFlow(authUrl, provider, state, codeVerifier, opts);
    }
  }

  /**
   * Handle the OAuth callback (call from your callback page).
   */
  async handleCallback(
    providerName: string,
    urlParams: URLSearchParams,
    storedState?: string,
  ): Promise<OAuthSession> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);

    // Verify state
    const returnedState = urlParams.get("state");
    if (returnedState && storedState && returnedState !== storedState) {
      throw new Error("State mismatch — possible CSRF attack");
    }

    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) throw new Error(`Authorization error: ${error}`);

    if (!code && !urlParams.get("access_token")) {
      throw new Error("No code or token in callback");
    }

    // Implicit flow: extract token from fragment/params
    if (urlParams.get("access_token")) {
      const tokens: OAuthToken = {
        access_token: urlParams.get("access_token")!,
        token_type: urlParams.get("token_type") ?? "Bearer",
        expires_in: urlParams.get("expires_in") ? parseInt(urlParams.get("expires_in")!) : undefined,
        scope: urlParams.get("scope") ?? undefined,
        obtained_at: Date.now(),
      };

      const session = await this.createSession(providerName, tokens, provider);
      return session;
    }

    // Authorization code flow: exchange code for tokens
    if (code) {
      const codeVerifier = this.getStoredCodeVerifier(state ?? returnedState ?? "");
      const tokens = await this.exchangeCode(provider, code, codeVerifier);
      const session = await this.createSession(providerName, tokens, provider);
      return session;
    }

    throw new Error("No valid response from authorization server");
  }

  // --- Token Management ---

  /**
   * Exchange an authorization code for tokens.
   */
  async exchangeCode(
    provider: OAuthProviderConfig,
    code: string,
    codeVerifier?: string,
  ): Promise<OAuthToken> {
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri ?? `${window.location.origin}/auth/callback`,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      ...(provider.clientSecret ? { client_secret: provider.clientSecret } : {}),
    };

    const resp = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "Unknown error");
      throw new Error(`Token exchange failed (${resp.status}): ${errText}`);
    }

    const data = await resp.json() as Record<string, unknown>;

    return {
      access_token: data.access_token as string,
      token_type: (data.token_type as string) ?? "Bearer",
      expires_in: data.expires_in as number | undefined,
      refresh_token: data.refresh_token as string | undefined,
      scope: data.scope as string | undefined,
      id_token: data.id_token as string | undefined,
      obtained_at: Date.now(),
    };
  }

  /**
   * Refresh an access token.
   */
  async refreshToken(providerName: string): Promise<OAuthSession | null> {
    const session = this.sessions.get(providerName);
    if (!session || !session.tokens.refresh_token) return null;

    const provider = this.providers.get(providerName)!;
    const body: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: session.tokens.refresh_token,
      client_id: provider.clientId,
      ...(provider.clientSecret ? { client_secret: provider.clientSecret } : {}),
    };

    try {
      const resp = await fetch(provider.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });

      if (!resp.ok) return null;

      const data = await resp.json() as Record<string, unknown>;
      const newTokens: OAuthToken = {
        access_token: data.access_token as string,
        token_type: (data.token_type as string) ?? "Bearer",
        expires_in: data.expires_in as number | undefined,
        refresh_token: data.refresh_token ?? session.tokens.refresh_token,
        scope: data.scope as string | undefined,
        obtained_at: Date.now(),
      };

      session.tokens = newTokens;
      session.lastUsedAt = Date.now();
      this.saveSessions();

      // Fetch user info
      if (provider.userInfoUrl) {
        session.userInfo = await this.fetchUserInfo(provider, newTokens.access_token);
      }

      this.setupAutoRefresh(providerName, session);
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Revoke all tokens for a provider.
   */
  async revokeSession(providerName: string): Promise<boolean> {
    const session = this.sessions.get(providerName);
    if (!session) return false;

    const provider = this.providers.get(providerName);
    if (!provider?.revokeUrl) {
      this.sessions.delete(providerName);
      this.saveSessions();
      return true;
    }

    try {
      await fetch(provider.revokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: session.tokens.access_token }).toString(),
      });
    } catch { /* ignore */ }

    this.sessions.delete(providerName);
    this.clearAutoRefresh(providerName);
    this.saveSessions();
    return true;
  }

  // --- Session Management ---

  /** Get active session for a provider */
  getSession(providerName: string): OAuthSession | undefined {
    return this.sessions.get(providerName);
  }

  /** Get all active sessions */
  getAllSessions(): OAuthSession[] {
    return Array.from(this.sessions.values());
  }

  /** Check if user is authenticated with any provider */
  isAuthenticated(): boolean {
    return this.sessions.size > 0;
  }

  /** Clear all sessions */
  logoutAll(): void {
    for (const [name] of this.sessions) {
      this.revokeSession(name).catch(() => {});
    }
  }

  // --- Internal ---

  private async createSession(
    providerName: string,
    tokens: OAuthToken,
    provider: OAuthProviderConfig,
  ): Promise<OAuthSession> {
    let userInfo: Record<string, unknown> | undefined;

    if (provider.userInfoUrl) {
      userInfo = await this.fetchUserInfo(provider, tokens.access_token);
    }

    const session: OAuthSession = {
      provider: providerName,
      tokens,
      userInfo,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    this.sessions.set(providerName, session);
    this.saveSessions();
    this.setupAutoRefresh(providerName, session);

    return session;
  }

  private async fetchUserInfo(
    provider: OAuthProviderConfig,
    accessToken: string,
  ): Promise<Record<string, unknown>> {
    try {
      const resp = await fetch(provider.userInfoUrl!, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (resp.ok) return resp.json();
    } catch { /* ignore */ }
    return {};
  }

  private buildUrl(base: string, params: Record<string, string>): string {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private generateState(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private generateNonce(): string {
    return this.generateState(); // Same approach
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
  }

  private async generateCodeChallenge(verifier: string, method: string): Promise<string> {
    if (method === "S256") {
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const hash = await crypto.subtle.digest("SHA-256", data);
      return base64UrlEncode(new Uint8Array(hash));
    }
    return verifier; // plain method
  }

  private getStoredCodeVerifier(state: string): string | undefined {
    // In production, store in sessionStorage during auth init
    return sessionStorage.getItem(`oauth_cv_${state}`) ?? undefined;
  }

  private async popupFlow(
    _authUrl: string,
    provider: OAuthProviderConfig,
    state: string,
    codeVerifier: string,
    opts: Required<OAuthOptions>,
  ): Promise<OAuthSession> {
    return new Promise((resolve, reject) => {
      // Store code verifier for later retrieval
      sessionStorage.setItem(`oauth_cv_${state}`, codeVerifier);

      const w = opts.popupSize.width;
      const h = opts.popupSize.height;
      const left = (screen.width - w) / 2;
      const top = (screen.height - h) / 2;

      const popup = window.open(
        "", // Will be set after building full URL
        "oauth_popup",
        `width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)}`,
      );

      if (!popup) { reject(new Error("Popup blocked")); return; }

      // Build the actual auth URL with state
      const params: Record<string, string> = {
        client_id: provider.clientId,
        response_type: "code",
        redirect_uri: opts.redirectUri ?? provider.redirectUri ?? `${window.location.origin}/auth/callback`,
        scope: provider.scopes.join(" "),
        state,
        code_verifier: codeVerifier,
        code_challenge_method: "S256",
      };

      // Generate challenge
      this.generateCodeChallenge(codeVerifier, "S256").then((challenge) => {
        params.code_challenge = challenge;
        popup!.location.href = this.buildUrl(provider.authorizeUrl, params);
      });

      const timer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            reject(new Error("Popup closed by user"));
          }
        } catch { /* cross-origin */ }
      }, 500);

      // Listen for messages from popup
      const handler = async (event: MessageEvent) => {
        if (event.data.type === "oauth_callback") {
          clearInterval(timer);
          window.removeEventListener("message", handler);
          try {
            const session = await this.handleCallback(provider.name, new URLSearchParams(event.data.params), state);
            resolve(session);
          } catch (err) {
            reject(err);
          }
        }
      };
      window.addEventListener("message", handler);
    });
  }

  private async redirectFlow(
    authUrl: string,
    _provider: OAuthProviderConfig,
    _state: string,
    _codeVerifier: string,
    _opts: Required<OAuthOptions>,
  ): Promise<OAuthSession> {
    // Redirect flow: store state, redirect, then handle on callback page
    // For simplicity, we redirect and expect the caller to call handleCallback
    window.location.href = authUrl;
    // This won't resolve normally — it's handled via handleCallback
    return new Promise(() => {}); // Never resolves (redirect)
  }

  private setupAutoRefresh(providerName: string, session: OAuthSession): void {
    this.clearAutoRefresh(providerName);

    if (!this.defaultOptions.autoRefresh || !session.tokens.expires_in) return;

    const expiresIn = (session.tokens.expires_in ?? 3600) - (this.defaultOptions.refreshBuffer ?? 300);
    if (expiresIn <= 0) return;

    this.refreshTimers.set(providerName, setTimeout(async () => {
      await this.refreshToken(providerName);
    }, expiresIn * 1000));
  }

  private clearAutoRefresh(providerName: string): void {
    const timer = this.refreshTimers.get(providerName);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(providerName);
    }
  }

  private saveSessions(): void {
    try {
      const data = Array.from(this.sessions.entries()).map(([name, sess]) => [
        name,
        { tokens: sess.tokens, userInfo: sess.userInfo, createdAt: sess.createdAt, lastUsedAt: sess.lastUsedAt },
      ]);
      localStorage.setItem(this.defaultOptions.storageKey, JSON.stringify(data));
    } catch { /* ignore */ }
  }

  private loadSessions(): void {
    try {
      const raw = localStorage.getItem(this.defaultOptions.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw) as [string, unknown][];
      for (const [name, sessData] of data) {
        const sd = sessData as Record<string, unknown>;
        this.sessions.set(name, {
          provider: name,
          tokens: sd.tokens as OAuthToken,
          userInfo: sd.userInfo as Record<string, unknown>,
          createdAt: sd.createdAt as number,
          lastUsedAt: sd.lastUsedAt as number,
        });
        // Setup auto-refresh for loaded sessions
        this.setupAutoRefresh(name, this.sessions.get(name)!);
      }
    } catch { /* ignore */ }
  }
}

// --- Utility ---

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/=/g, "")
    .replace(/\+/g, "");
}
