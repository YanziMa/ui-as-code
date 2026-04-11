/**
 * OpenID Connect (OIDC): Full OIDC client with discovery,
 * ID token validation, claim extraction, session management,
 * RP-Initiated Logout, and userinfo integration.
 */

// --- Types ---

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  registration_endpoint?: string;
  end_session_endpoint?: string;
  check_session_iframe?: string;
  revocation_endpoint?: string;
  introspection_endpoint?: string;
  device_authorization_endpoint?: string;
  supported_response_types?: string[];
  supported_subject_types?: string[];
  id_token_signing_alg_values_supported?: string[];
  scopes_supported?: string[];
  claims_supported?: string[];
}

export interface OidcConfig {
  /** OIDC authority/issuer URL */
  authority: string;
  /** Client ID */
  clientId: string;
  /** Redirect URI */
  redirectUri: string;
  /** Post-logout redirect URI */
  postLogoutRedirectUri?: string;
  /** Requested scopes (default: ["openid", "profile", "email"]) */
  scopes?: string[];
  /** Requested claims */
  claims?: string[];
  /** Response type (default: "code") */
  responseType?: "code" | "id_token" | "code id_token" | "token id_token";
  /** Enable PKCE? (default: true) */
  pkce?: boolean;
  /** Extra query params for authorize request */
  extraAuthParams?: Record<string, string>;
  /** Token endpoint auth method (default: "client_secret_post") */
  tokenEndpointAuthMethod?: "client_secret_post" | "client_secret_basic" | "none";
  /** Client secret (for confidential clients) */
  clientSecret?: string;
  /** Clock tolerance in seconds for time checks (default: 30) */
  clockToleranceSec?: number;
  /** Load discovery document automatically on init? (default: true) */
  autoDiscovery?: boolean;
  /** Custom discovery document (skips fetch if provided) */
  discoveryDocument?: OidcDiscovery;
  /** Enable silent renew via iframe? */
  enableSilentRenew?: boolean;
  /** Silent renew iframe URL */
  silentRenewUrl?: string;
  /** Automatic token refresh before expiry? */
  automaticSilentRenew?: boolean;
  /** Refresh buffer in seconds (default: 60) */
  accessTokenExpiryWindow?: number;
  /** ID token expiry window in seconds (default: 300) */
  idTokenExpiryWindow?: number;
}

export interface IdTokenClaims {
  iss: string;       // Issuer
  sub: string;       // Subject (user ID)
  aud: string | string[]; // Audience(s)
  exp: number;       // Expiration
  iat: number;       // Issued at
  auth_time?: number; // Authentication time
  nonce?: string;    // Nonce value
  acr?: string;      // Authentication context class reference
  amr?: string[];    // Authentication methods references
  azp?: string;      // Authorized party
  // Standard claims
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email?: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  updated_at?: number;
  // Custom claims
  [key: string]: unknown;
}

export interface IdTokenValidationResult {
  valid: boolean;
  errors: string[];
  claims: IdTokenClaims | null;
}

export interface OidcSessionState {
  authenticated: boolean;
  sessionId: string | null;
  idToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  scopes: string[];
}

export type OidcEventHandler = (event: { type: string; detail?: unknown }) => void;

// --- Internal Types ---

interface StoredTokens {
  id_token: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  session_state: string | null;
}

// --- Main Client ---

export class OidcClient {
  private config: Required<Omit<OidcConfig, "discoveryDocument" | "clientSecret">> & {
    discoveryDocument: OidcDiscovery | null;
    clientSecret: string | undefined;
  };

  private discovery: OidcDiscovery | null = null;
  private tokens: StoredTokens | null = null;
  private storedNonce: string | null = null;
  private storedState: string | null = private eventListeners = new Set<OidcEventHandler>();
  private silentRenewTimer: ReturnType<typeof setInterval> | null = null;
  private sessionCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: OidcConfig) {
    this.config = {
      scopes: config.scopes ?? ["openid", "profile", "email"],
      responseType: config.responseType ?? "code",
      pkce: config.pkce ?? true,
      tokenEndpointAuthMethod: config.tokenEndpointAuthMethod ?? "client_secret_post",
      clockToleranceSec: config.clockToleranceSec ?? 30,
      autoDiscovery: config.autoDiscovery ?? true,
      enableSilentRenew: config.enableSilentRenew ?? false,
      automaticSilentRenew: config.automaticSilentRenew ?? false,
      accessTokenExpiryWindow: config.accessTokenExpiryWindow ?? 60,
      idTokenExpiryWindow: config.idTokenExpiryWindow ?? 300,
      postLogoutRedirectUri: config.postLogoutRedirectUri,
      extraAuthParams: config.extraAuthParams ?? {},
      silentRenewUrl: config.silentRenewUrl,
      discoveryDocument: config.discoveryDocument ?? null,
      clientSecret: config.clientSecret,
      ...config,
    };
  }

  // --- Initialization ---

  /** Initialize the client: load discovery, restore session */
  async initialize(): Promise<void> {
    if (this.config.discoveryDocument) {
      this.discovery = this.config.discoveryDocument;
    } else if (this.config.autoDiscovery) {
      await this.fetchDiscovery();
    }

    this.restoreSession();

    if (this.tokens && this.config.automaticSilentRenew) {
      this.startSilentRenew();
    }
  }

  // --- Discovery ---

  /** Fetch the OpenID Connect discovery document */
  async fetchDiscovery(): Promise<OidcDiscovery> {
    const url = `${this.config.authority.replace(/\/$/, "")}/.well-known/openid-configuration`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Discovery failed: HTTP ${response.status}`);

    this.discovery = (await response.json()) as OidcDiscovery;
    return this.discovery;
  }

  /** Get cached discovery document */
  getDiscovery(): OidcDiscovery | null {
    return this.discovery;
  }

  // --- Authorization ---

  /** Build and navigate to the authorization endpoint */
  async login(args?: { state?: string; prompt?: string; loginHint?: string; acrValues?: string; extraParams?: Record<string, string> }): Promise<void> {
    if (!this.discovery && this.config.autoDiscovery) {
      await this.fetchDiscovery();
    }

    const state = args?.state ?? this.generateSecureRandom(16);
    const nonce = this.generateSecureRandom(16);

    this.storedState = state;
    this.storedNonce = nonce;
    this.storeItem("oidc_state", state);
    this.storeItem("oidc_nonce", nonce);

    const params: Record<string, string> = {
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: this.config.responseType,
      scope: this.config.scopes.join(" "),
      state,
      nonce,
      ...this.config.extraAuthParams,
      ...args?.extraParams ?? {},
    };

    if (args?.prompt) params.prompt = args.prompt;
    if (args?.loginHint) params.login_hint = args.loginHint;
    if (args?.acrValues) params.acr_values = args.acrValues;

    // PKCE
    if (this.config.pkce) {
      const { codeVerifier, codeChallenge } = await this.generatePkce();
      this.storeItem("oidc_pkce_verifier", codeVerifier);
      params.code_challenge = codeChallenge;
      params.code_challenge_method = "S256";
    }

    const authUrl = `${this.discovery?.authorization_endpoint ?? `${this.config.authority}/authorize`}?${new URLSearchParams(params).toString()}`;

    this.emit({ type: "login_start" });
    window.location.href = authUrl;
  }

  /** Process the authorization callback (call from your callback page) */
  async callback(callbackUrl?: string): Promise<IdTokenClaims | null> {
    const url = callbackUrl ?? window.location.href;
    const params = new URLSearchParams(new URL(url).search);

    const error = params.get("error");
    if (error) {
      this.emit({ type: "error", detail: { error, description: params.get("error_description") } });
      throw new Error(`OAuth error: ${error} - ${params.get("error_description")}`);
    }

    const code = params.get("code");
    const returnedState = params.get("state");

    // Validate state
    const expectedState = this.retrieveItem("oidc_state");
    if (!this.constantTimeCompare(returnedState ?? "", expectedState ?? "")) {
      throw new Error("Invalid state parameter");
    }

    // Exchange code for tokens
    let tokens: StoredTokens;

    if (code) {
      tokens = await this.exchangeCode(code);
    } else {
      // Implicit flow or hybrid
      const idToken = params.get("id_token") ?? "";
      const accessToken = params.get("access_token") ?? "";
      tokens = {
        id_token: idToken,
        access_token: accessToken,
        refresh_token: "",
        expires_at: Date.now() + (parseInt(params.get("expires_in") ?? "3600", 10) * 1000),
        scope: params.get("scope") ?? this.config.scopes.join(" "),
        session_state: params.get("session_state"),
      };
    }

    // Validate ID token
    const validation = this.validateIdToken(tokens.id_token);
    if (!validation.valid) {
      this.emit({ type: "error", detail: { error: "id_token_validation_failed", errors: validation.errors } });
      throw new Error(`ID token validation failed: ${validation.errors.join(", ")}`);
    }

    this.tokens = tokens;
    this.persistSession();
    this.startSilentRenew();
    this.emit({ type: "authenticated", detail: validation.claims });

    return validation.claims;
  }

  // --- Token Operations ---

  /** Exchange authorization code for tokens */
  private async exchangeCode(code: string): Promise<StoredTokens> {
    const tokenEndpoint = this.discovery?.token_endpoint ?? `${this.config.authority}/token`;

    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
    };

    const codeVerifier = this.retrieveItem("oidc_pkce_verifier");
    if (codeVerifier) body.code_verifier = codeVerifier;

    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret;
    }

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Token exchange failed (${response.status}): ${text}`);
    }

    const json = await response.json() as Record<string, unknown>;

    return {
      id_token: String(json.id_token ?? ""),
      access_token: String(json.access_token ?? ""),
      refresh_token: String(json.refresh_token ?? ""),
      expires_at: Date.now() + (Number(json.expires_in ?? 3600) * 1000),
      scope: String(json.scope ?? this.config.scopes.join(" ")),
      session_state: json.session_state ? String(json.session_state) : null,
    };
  }

  /** Refresh tokens using the refresh token */
  async refreshTokens(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      this.emit({ type: "error", detail: { error: "no_refresh_token" } });
      return;
    }

    const tokenEndpoint = this.discovery?.token_endpoint ?? `${this.config.authority}/token`;
    const body: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: this.tokens.refresh_token,
      client_id: this.config.clientId,
    };

    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret;
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });

      if (!response.ok) throw new Error(`Refresh failed: ${response.status}`);

      const json = await response.json() as Record<string, unknown>;

      this.tokens = {
        ...this.tokens,
        id_token: String(json.id_token ?? this.tokens.id_token),
        access_token: String(json.access_token ?? this.tokens.access_token),
        refresh_token: String(json.refresh_token ?? this.tokens.refresh_token),
        expires_at: Date.now() + (Number(json.expires_in ?? 3600) * 1000),
      };

      this.persistSession();
      this.emit({ type: "tokens_refreshed" });
    } catch (err) {
      this.emit({ type: "error", detail: { error: "refresh_failed", message: String(err) } });
    }
  }

  // --- ID Token Validation ---

  /** Validate an ID token locally (without JWKS verification) */
  validateIdToken(idToken: string): IdTokenValidationResult {
    const errors: string[] = [];
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return { valid: false, errors: ["Invalid JWT format"], claims: null };
    }

    try {
      const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const claims = JSON.parse(payloadStr) as IdTokenClaims;
      const now = Math.floor(Date.now() / 1000);
      const tolerance = this.config.clockToleranceSec;

      // Issuer check
      if (claims.iss !== this.config.authority && claims.iss !== this.discovery?.issuer) {
        errors.push(`Issuer mismatch: expected ${this.config.authority}, got ${claims.iss}`);
      }

      // Audience check
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!audiences.includes(this.config.clientId)) {
        errors.push(`Audience mismatch: expected ${this.config.clientId}, got ${claims.aud}`);
      }

      // Expiration check
      if (claims.exp <= now - tolerance) {
        errors.push(`Token expired at ${new Date(claims.exp * 1000).toISOString()}`);
      }

      // Issued-at check (not too far in future)
      if (claims.iat > now + tolerance) {
        errors.push("Token issued in the future");
      }

      // Nonce check
      if (this.storedNonce && claims.nonce !== this.storedNonce) {
        errors.push("Nonce mismatch");
      }

      // Auth time (if present, not too old)
      if (claims.auth_time && claims.auth_time < now - 86400) {
        errors.push("Authentication too old (>24h)");
      }

      return {
        valid: errors.length === 0,
        errors,
        claims: errors.length === 0 ? claims : null,
      };
    } catch {
      return { valid: false, errors: ["Failed to parse ID token payload"], claims: null };
    }
  }

  /** Extract claims from current ID token */
  getClaims(): IdTokenClaims | null {
    if (!this.tokens?.id_token) return null;

    const result = this.validateIdToken(this.tokens.id_token);
    return result.claims;
  }

  /** Get a specific claim value */
  getClaim<K extends keyof IdTokenClaims>(claim: K): IdTokenClaims[K] | undefined {
    return this.getClaims()?.[claim];
  }

  // --- Userinfo ---

  /** Fetch userinfo from the OP */
  async getUserInfo(): Promise<Record<string, unknown>> {
    if (!this.tokens?.access_token) throw new Error("No access token");

    const userInfoEndpoint = this.discovery?.userinfo_endpoint ?? `${this.config.authority}/userinfo`;
    const response = await fetch(userInfoEndpoint, {
      headers: { Authorization: `Bearer ${this.tokens.access_token}` },
    });

    if (!response.ok) throw new Error(`Userinfo failed: ${response.status}`);
    return (await response.json()) as Record<string, unknown>;
  }

  // --- Session Management ---

  /** Get current session state */
  getSessionState(): OidcSessionState {
    if (!this.tokens) {
      return {
        authenticated: false,
        sessionId: null,
        idToken: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        scopes: [],
      };
    }

    return {
      authenticated: !this.isExpired(),
      sessionId: this.tokens.session_state,
      idToken: this.tokens.id_token,
      accessToken: this.tokens.access_token,
      refreshToken: this.tokens.refresh_token,
      expiresAt: this.tokens.expires_at,
      scopes: this.tokens.scope.split(" "),
    };
  }

  /** Check if currently authenticated */
  isAuthenticated(): boolean {
    return !!this.tokens && !this.isExpired();
  }

  /** Check if token is expired or near-expiry */
  isExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expires_at - (this.config.accessTokenExpiryWindow * 1000);
  }

  /** Initiate RP-Initiated Logout */
  async logout(idTokenHint?: string): Promise<void> {
    const hint = idTokenHint ?? this.tokens?.id_token;
    const endSessionEndpoint = this.discovery?.end_session_endpoint
      ?? `${this.config.authority}/logout`;

    const params: Record<string, string> = {};
    if (hint) params.id_token_hint = hint;
    if (this.config.postLogoutRedirectUri) params.post_logout_redirect_uri = this.config.postLogoutRedirectUri;

    const url = `${endSessionEndpoint}?${new URLSearchParams(params).toString()}`;

    this.clearSession();
    this.emit({ type: "logout_start" });
    window.location.href = url;
  }

  /** Local-only logout (no redirect to IdP) */
  localLogout(): void {
    this.clearSession();
    this.emit({ type: "logged_out" });
  }

  // --- Events ---

  /** Subscribe to OIDC events */
  onEvent(handler: OidcEventHandler): () => void {
    this.eventListeners.add(handler);
    return () => this.eventListeners.delete(handler);
  }

  // --- Private ---

  private generateSecureRandom(length: number): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const verifier = this.generateSecureRandom(32);
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return { codeVerifier: verifier, codeChallenge: challenge };
  }

  private persistSession(): void {
    if (!this.tokens) return;
    this.storeItem("oidc_tokens", JSON.stringify(this.tokens));
  }

  private restoreSession(): void {
    try {
      const raw = this.retrieveItem("oidc_tokens");
      if (raw) {
        this.tokens = JSON.parse(raw) as StoredTokens;
      }
    } catch {}
  }

  private clearSession(): void {
    this.tokens = null;
    this.stopSilentRenew();
    this.removeItem("oidc_tokens");
    this.removeItem("oidc_state");
    this.removeItem("oidc_nonce");
    this.removeItem("oidc_pkce_verifier");
  }

  private startSilentRenew(): void {
    this.stopSilentRenew();

    if (!this.config.automaticSilentRenew || !this.tokens) return;

    const intervalMs = Math.max(
      (this.tokens.expires_at - Date.now()) * 0.75,
      30000, // At least 30 seconds
    );

    this.silentRenewTimer = setInterval(() => {
      if (this.isExpired()) {
        this.refreshTokens();
      }
    }, Math.min(intervalMs, 60000)); // Check at least every minute
  }

  private stopSilentRenew(): void {
    if (this.silentRenewTimer) {
      clearInterval(this.silentRenewTimer);
      this.silentRenewTimer = null;
    }
  }

  private emit(event: { type: string; detail?: unknown }): void {
    for (const listener of this.eventListeners) {
      try { listener(event); } catch {}
    }
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  // Storage helpers (SSR-safe)
  private storeItem(key: string, value: string): void {
    try { sessionStorage.setItem(key, value); } catch {}
  }

  private retrieveItem(key: string): string | null {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }

  private removeItem(key: string): void {
    try { sessionStorage.removeItem(key); } catch {}
  }
}

/** Create a pre-configured OIDC client */
export function createOidcClient(config: OidcConfig): OidcClient {
  return new OidcClient(config);
}
