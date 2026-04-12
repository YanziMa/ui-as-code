/**
 * OAuth Helper: Client-side OAuth 2.0 flow management with PKCE,
 * token storage, refresh logic, multiple provider support,
 * scope management, state validation, and secure token handling.
 */

// --- Types ---

export type OAuthProvider = "google" | "github" | "facebook" | "microsoft" | "twitter" | "discord" | "custom";

export type OAuthGrantType = "authorization_code" | "refresh_token" | "client_credentials" | "password" | "implicit";

export type OAuthResponseType = "code" | "token" | "id_token" | "code id_token" | "token id_token";

export interface OAuthConfig {
  /** OAuth provider or custom configuration */
  provider?: OAuthProvider;
  /** Authorization endpoint URL */
  authorizationEndpoint: string;
  /** Token endpoint URL */
  tokenEndpoint: string;
  /** Client ID */
  clientId: string;
  /** Client secret (server-side only — use with caution) */
  clientSecret?: string;
  /** Redirect URI (must match registered callback) */
  redirectUri: string;
  /** Requested scopes */
  scopes?: string[];
  /** Response type */
  responseType?: OAuthResponseType;
  /** Grant type for token exchange */
  grantType?: OAuthGrantType;
  /** Additional auth parameters */
  extraParams?: Record<string, string>;
  /** PKCE method ("S256" or "plain") */
  pkceMethod?: "S256" | "plain";
  /** Token storage key prefix */
  storagePrefix?: string;
  /** Auto-refresh before expiry? */
  autoRefresh?: boolean;
  /** Refresh threshold (seconds before expiry) */
  refreshThreshold?: number;
  /** Custom token validator */
  validateToken?: (token: OAuthTokens) => boolean;
}

export interface OAuthTokens {
  /** Access token */
  accessToken: string;
  /** Refresh token (if granted) */
  refreshToken?: string;
  /** ID token (OpenID) */
  idToken?: string;
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Expiration time in seconds */
  expiresIn: number;
  /** When the token was obtained */
  obtainedAt: number;
  /** Granted scopes */
  scopes?: string[];
}

export interface OAuthUserInfo {
  sub?: string; // Subject (user ID)
  email?: string;
  name?: string;
  picture?: string;
  provider?: OAuthProvider;
  raw?: Record<string, unknown>;
}

export interface OAuthSession {
  tokens: OAuthTokens;
  user?: OAuthUserInfo;
  provider: OAuthProvider | "custom";
  authenticatedAt: number;
}

export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

// --- Provider Presets ---

const PROVIDER_PRESETS: Record<OAuthProvider, Pick<OAuthConfig, "authorizationEndpoint" | "tokenEndpoint">> = {
  google: {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  },
  github: {
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
  },
  facebook: {
    authorizationEndpoint: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenEndpoint: "https://graph.facebook.com/v18.0/oauth/access_token",
  },
  microsoft: {
    authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  },
  twitter: {
    authorizationEndpoint: "https://twitter.com/i/oauth2/authorize",
    tokenEndpoint: "https://api.twitter.com/2/oauth2/token",
  },
  discord: {
    authorizationEndpoint: "https://discord.com/api/oauth2/authorize",
    tokenEndpoint: "https://discord.com/api/oauth2/token",
  },
  custom: {
    authorizationEndpoint: "",
    tokenEndpoint: "",
  },
};

// --- Crypto Helpers (for PKCE) ---

async function generateCodeVerifier(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateState(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

// --- Core OAuth Manager -----

export class OAuthHelper {
  private config: Required<OAuthConfig> & { provider: OAuthProvider };
  private session: OAuthSession | null = null;
  private pendingState: string | null = null;
  private codeVerifier: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshListeners: Set<(session: OAuthSession) => void> = new Set();
  private errorListeners: Set<(error: OAuthError) => void> = new Set();

  constructor(config: OAuthConfig) {
    const preset = PROVIDER_PRESETS[config.provider ?? "custom"];

    this.config = {
      provider: config.provider ?? "custom",
      authorizationEndpoint: config.authorizationEndpoint ?? preset.authorizationEndpoint,
      tokenEndpoint: config.tokenEndpoint ?? preset.tokenEndpoint,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes: config.scopes ?? [],
      responseType: config.responseType ?? "code",
      grantType: config.grantType ?? "authorization_code",
      extraParams: config.extraParams ?? {},
      pkceMethod: config.pkceMethod ?? "S256",
      storagePrefix: config.storagePrefix ?? "oauth_",
      autoRefresh: config.autoRefresh ?? true,
      refreshThreshold: config.refreshThreshold ?? 300,
      ...config,
    };

    // Restore session from storage
    this.restoreSession();
  }

  get isAuthenticated(): boolean {
    if (!this.session) return false;
    return !this.isTokenExpired(this.session.tokens);
  }

  get currentSession(): OAuthSession | null {
    return this.session;
  }

  get accessToken(): string | null {
    return this.session?.tokens.accessToken ?? null;
  }

  /** Initiate the OAuth authorization flow. Redirects user to provider. */
  async authorize(additionalScopes?: string[], additionalParams?: Record<string, string>): Promise<void> {
    const state = generateState();
    this.pendingState = state;

    // Generate PKCE code verifier
    let challenge: string | undefined;
    if (this.config.pkceMethod === "S256") {
      this.codeVerifier = await generateCodeVerifier();
      challenge = await generateCodeChallenge(this.codeVerifier);
    } else if (this.config.pkceMethod === "plain") {
      this.codeVerifier = await generateCodeVerifier();
      challenge = this.codeVerifier;
    }

    // Build authorization URL
    const params: Record<string, string> = {
      response_type: this.config.responseType,
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      scope: [...(this.config.scopes ?? []), ...(additionalScopes ?? [])].join(" "),
      ...this.config.extraParams,
      ...additionalParams,
    };

    if (challenge) {
      params.code_challenge = challenge;
      params.code_challenge_method = this.config.pkceMethod;
    }

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const url = `${this.config.authorizationEndpoint}?${queryString}`;

    // Store state in sessionStorage for verification on callback
    try {
      sessionStorage.setItem(`${this.config.storagePrefix}state`, state);
      if (this.codeVerifier) {
        sessionStorage.setItem(`${this.config.storagePrefix}verifier`, this.codeVerifier);
      }
    } catch {}

    // Redirect to authorization server
    window.location.href = url;
  }

  /** Handle the OAuth callback (call from your redirect page). */
  async handleCallback(url?: string): Promise<OAuthSession> {
    const callbackUrl = url ?? window.location.href;

    // Check for error response
    const errorParams = this.parseURLParams(callbackUrl);
    if (errorParams.error) {
      const oauthError: OAuthError = {
        error: errorParams.error,
        error_description: errorParams.error_description,
        error_uri: errorParams.error_uri,
        state: errorParams.state,
      };
      this.notifyError(oauthError);
      throw oauthError;
    }

    // Validate state
    const returnedState = errorParams.state;
    const savedState = sessionStorage.getItem(`${this.config.storagePrefix}state`);

    if (!returnedState || returnedState !== savedState) {
      const stateError: OAuthError = { error: "invalid_state", error_description: "State parameter mismatch" };
      this.notifyError(stateError);
      throw stateError;
    }

    // Clean up state
    sessionStorage.removeItem(`${this.config.storagePrefix}state`);
    this.pendingState = null;

    // Handle based on response type
    if (this.config.responseType.includes("token")) {
      // Implicit flow — tokens are in URL fragment
      const fragmentParams = this.parseFragment(callbackUrl);
      const tokens = this.buildTokensFromImplicit(fragmentParams);
      this.setSession(tokens);
      return this.session!;
    }

    // Authorization code flow — exchange code for tokens
    const code = errorParams.code;
    if (!code) {
      const noCodeError: OAuthError = { error: "no_code", error_description: "No authorization code in callback" };
      this.notifyError(noCodeError);
      throw noCodeError;
    }

    const verifier = sessionStorage.getItem(`${this.config.storagePrefix}verifier`);
    sessionStorage.removeItem(`${this.config.storagePrefix}verifier`);
    this.codeVerifier = null;

    const tokens = await this.exchangeCode(code, verifier ?? undefined);
    this.setSession(tokens);

    return this.session!;
  }

  /** Refresh the access token using a refresh token. */
  async refreshAccessToken(): Promise<OAuthSession> {
    if (!this.session?.tokens.refreshToken) {
      throw new Error("No refresh token available");
    }

    const tokens = await this.exchangeRefreshToken(this.session.tokens.refreshToken);
    this.updateTokens(tokens);
    return this.session!;
  }

  /** Revoke the current session and clear stored data. */
  logout(revokeEndpoint?: string): void {
    if (revokeEndpoint && this.session?.tokens.accessToken) {
      fetch(revokeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(this.session.tokens.accessToken)}&client_id=${encodeURIComponent(this.config.clientId)}`,
      }).catch(() => {});
    }

    this.clearSession();
  }

  /** Get authorization headers for API requests. */
  getAuthHeaders(): Record<string, string> {
    if (!this.isAuthenticated) return {};
    return { Authorization: `${this.session!.tokens.tokenType} ${this.session!.tokens.accessToken}` };
  }

  /** Fetch with automatic token injection and retry on 401. */
  async authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `${this.session!.tokens.tokenType} ${this.session!.tokens.accessToken}`);

    let response = await fetch(input, { ...init, headers });

    // Auto-refresh on 401
    if (response.status === 401 && this.session?.tokens.refreshToken) {
      try {
        await this.refreshAccessToken();
        headers.set("Authorization", `${this.session!.tokens.tokenType} ${this.session!.tokens.accessToken}`);
        response = await fetch(input, { ...init, headers });
      } catch {}
    }

    return response;
  }

  /** Subscribe to session refresh events. */
  onRefresh(callback: (session: OAuthSession) => void): () => void {
    this.refreshListeners.add(callback);
    return () => this.refreshListeners.delete(callback);
  }

  /** Subscribe to error events. */
  onError(callback: (error: OAuthError) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  // --- Internal ---

  private async exchangeCode(code: string, verifier?: string): Promise<OAuthTokens> {
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
    };

    if (verifier) {
      body.code_verifier = verifier;
    }

    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret;
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Token exchange failed: ${response.status} - ${text}`);
    }

    const json = await response.json() as Record<string, unknown>;
    return this.parseTokenResponse(json);
  }

  private async exchangeRefreshToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    });

    if (this.config.clientSecret) {
      body.append("client_secret", this.config.clientSecret);
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      this.clearSession(); // Refresh token is invalid
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const json = await response.json() as Record<string, unknown>;
    return this.parseTokenResponse(json);
  }

  private parseTokenResponse(json: Record<string, unknown>): OAuthTokens {
    return {
      accessToken: json.access_token as string,
      refreshToken: json.refresh_token as string | undefined,
      idToken: json.id_token as string | undefined,
      tokenType: (json.token_type as string) || "Bearer",
      expiresIn: json.expires_in as number,
      obtainedAt: Date.now(),
      scopes: json.scope ? (json.scope as string).split(" ") : undefined,
    };
  }

  private buildTokensFromImplicit(params: Record<string, string>): OAuthTokens {
    return {
      accessToken: params.access_token ?? "",
      idToken: params.id_token,
      tokenType: params.token_type ?? "Bearer",
      expiresIn: parseInt(params.expires_in ?? "3600"),
      obtainedAt: Date.now(),
      scopes: params.scope ? params.scope.split(" ") : undefined,
    };
  }

  private setSession(tokens: OAuthTokens): void {
    this.session = {
      tokens,
      provider: this.config.provider,
      authenticatedAt: Date.now(),
    };

    this.persistSession();
    this.setupAutoRefresh();
    this.notifyRefresh();
  }

  private updateTokens(tokens: OAuthTokens): void {
    if (!this.session) return;

    // Merge: keep existing refresh token if not provided in new response
    this.session.tokens = {
      ...tokens,
      refreshToken: tokens.refreshToken ?? this.session.tokens.refreshToken,
    };

    this.persistSession();
    this.setupAutoRefresh();
    this.notifyRefresh();
  }

  private isTokenExpired(tokens: OAuthTokens): boolean {
    const elapsed = (Date.now() - tokens.obtainedAt) / 1000;
    return elapsed >= tokens.expiresIn;
  }

  private setupAutoRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    if (!this.config.autoRefresh || !this.session?.tokens.refreshToken) return;

    const elapsed = (Date.now() - this.session.tokens.obtainedAt) / 1000;
    const remaining = this.session.tokens.expiresIn - elapsed;
    const refreshIn = Math.max((remaining - this.config.refreshThreshold) * 1000, 0);

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch {
        // Silent fail — will be caught on next request
      }
    }, refreshIn);
  }

  private persistSession(): void {
    if (!this.session) return;
    try {
      localStorage.setItem(
        `${this.config.storagePrefix}session`,
        JSON.stringify(this.session),
      );
    } catch {}
  }

  private restoreSession(): void {
    try {
      const saved = localStorage.getItem(`${this.config.storagePrefix}session`);
      if (saved) {
        const parsed = JSON.parse(saved) as OAuthSession;
        if (!this.isTokenExpired(parsed.tokens)) {
          this.session = parsed;
          this.setupAutoRefresh();
        } else {
          localStorage.removeItem(`${this.config.storagePrefix}session`);
        }
      }
    } catch {}
  }

  private clearSession(): void {
    this.session = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    try {
      localStorage.removeItem(`${this.config.storagePrefix}session`);
    } catch {}
  }

  private notifyRefresh(): void {
    if (this.session) {
      for (const listener of this.refreshListeners) {
        listener(this.session!);
      }
    }
  }

  private notifyError(error: OAuthError): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }

  private parseURLParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    try {
      const parsed = new URL(url);
      for (const [key, value] of parsed.searchParams) {
        params[key] = value;
      }
    } catch {}
    return params;
  }

  private parseFragment(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    const hashIndex = url.indexOf("#");
    if (hashIndex < 0) return params;

    const fragment = url.slice(hashIndex + 1);
    for (const pair of fragment.split("&")) {
      const [key, ...valueParts] = pair.split("=");
      if (key) params[key] = decodeURIComponent(valueParts.join("="));
    }
    return params;
  }
}

// --- Factory ---

/** Create an OAuth helper instance. */
export function createOAuthHelper(config: OAuthConfig): OAuthHelper {
  return new OAuthHelper(config);
}
