/**
 * OAuth 2.0 Helper Library
 *
 * Comprehensive TypeScript utility module for OAuth 2.0 flows including
 * authorization code flow with PKCE, token management, scope utilities,
 * and pre-built provider configurations.
 */

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

/** Configuration for an OAuth 2.0 provider. */
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint?: string;
  providerName?: string;
}

/** Token response returned by the OAuth provider. */
export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  idToken?: string;
  issuedAt: number;
}

/** Result of a token validation check. */
export interface TokenValidationResult {
  valid: boolean;
  expired: boolean;
  expiresInMillis: number;
  expiresAt: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_STORAGE_KEY = 'oauth_tokens';
const STATE_STORAGE_KEY = 'oauth_state';
const DEFAULT_GRACE_PERIOD_MS = 60_000;

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function secureRandomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// PKCE (Proof Key for Code Exchange)
// ---------------------------------------------------------------------------

/**
 * Generate a PKCE code verifier and S256 code challenge pair.
 * Uses SHA-256 to derive the challenge from a high-entropy verifier.
 * @returns Object containing `codeVerifier` and `codeChallenge`.
 */
export async function generatePkceChallenge(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = secureRandomHex(32);
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64UrlEncode(digest);
  return { codeVerifier, codeChallenge };
}

/**
 * Verify that a given code verifier produces the expected S256 challenge.
 * @param codeVerifier - The original plain-text verifier.
 * @param codeChallenge - The expected base64url-encoded SHA-256 digest.
 * @returns `true` if the verifier matches the challenge.
 */
export async function verifyPkceChallenge(
  codeVerifier: string,
  codeChallenge: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest) === codeChallenge;
}

// ---------------------------------------------------------------------------
// State Parameter Management
// ---------------------------------------------------------------------------

/** Generate a cryptographically secure random state string for CSRF protection. */
export function generateState(): string {
  return secureRandomHex(16);
}

/**
 * Compare two state values using constant-time comparison to prevent timing attacks.
 * @returns `true` when both states match exactly.
 */
export function validateState(
  receivedState: string,
  expectedState: string,
): boolean {
  if (receivedState.length !== expectedState.length) return false;
  let result = 0;
  for (let i = 0; i < receivedState.length; i++) {
    result |= receivedState.charCodeAt(i) ^ expectedState.charCodeAt(i);
  }
  return result === 0;
}

/** Persist an OAuth state value into sessionStorage so it survives redirects. */
export function storeState(state: string): void {
  try { sessionStorage.setItem(STATE_STORAGE_KEY, state); } catch { /* unavailable */ }
}

/** Retrieve and remove the stored OAuth state from sessionStorage. Returns null if none exists. */
export function retrieveState(): string | null {
  try {
    const state = sessionStorage.getItem(STATE_STORAGE_KEY);
    if (state !== null) sessionStorage.removeItem(STATE_STORAGE_KEY);
    return state;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Token Storage Helpers
// ---------------------------------------------------------------------------

/** Persist tokens into localStorage for later retrieval. */
export function saveTokens(tokens: OAuthToken): void {
  try { localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens)); } catch { /* full or disabled */ }
}

/** Read persisted tokens from localStorage. Returns null if nothing is present. */
export function getTokens(): OAuthToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OAuthToken) : null;
  } catch { return null; }
}

/** Remove all persisted tokens from localStorage. */
export function clearTokens(): void {
  try { localStorage.removeItem(TOKEN_STORAGE_KEY); } catch { /* no-op */ }
}

/**
 * Determine whether the current access token is expired or close to expiring.
 * @param gracePeriodMs - Buffer before actual expiry (default 60 s).
 * @returns `true` if the token is expired or within the grace period.
 */
export function isTokenExpired(gracePeriodMs: number = DEFAULT_GRACE_PERIOD_MS): boolean {
  const tokens = getTokens();
  if (!tokens) return true;
  const now = Date.now();
  const expiryMs = tokens.issuedAt + tokens.expiresIn * 1000;
  return now >= expiryMs - gracePeriodMs;
}

/**
 * Return the current access token, refreshing it first if necessary.
 * Delegates refresh to the provided `OAuthClient` instance when needed.
 * @param client - An OAuthClient instance capable of refreshing tokens.
 * @returns The valid access token string, or `null` if unavailable.
 */
export async function getAccessToken(client?: OAuthClient): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens) return null;
  if (!isTokenExpired()) return tokens.accessToken;
  if (client && tokens.refreshToken) {
    try {
      const refreshed = await client.refreshToken(tokens.refreshToken);
      saveTokens(refreshed);
      return refreshed.accessToken;
    } catch { /* refresh failed — fall through */ }
  }
  clearTokens();
  return null;
}

// ---------------------------------------------------------------------------
// Scope Utilities
// ---------------------------------------------------------------------------

/** Check whether a specific scope is present in the token's granted scopes. */
export function hasScope(tokenScopes: string[], requiredScope: string): boolean {
  return normalizeScopes(tokenScopes).includes(requiredScope.toLowerCase());
}

/** Check whether **any** of the requested scopes are present. */
export function hasAnyScope(tokenScopes: string[], scopes: string[]): boolean {
  const normalized = normalizeScopes(tokenScopes);
  return normalizeScopes(scopes).some((s) => normalized.includes(s));
}

/** Normalize an array of scope strings to lowercase with whitespace trimmed. */
export function normalizeScopes(scopes: string[]): string[] {
  return scopes.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// URL Handling Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the authorization callback URL to extract the authorization code,
 * state parameter, and optional error description.
 * Accepts both full URLs and bare query strings.
 */
export function parseCallbackUrl(url: string): {
  code: string;
  state: string;
  error?: string;
} {
  let queryString: string;
  try {
    const parsed = new URL(url);
    queryString = parsed.search.slice(1);
  } catch {
    queryString = url.startsWith('?') ? url.slice(1) : url;
  }
  const params = new URLSearchParams(queryString);
  return {
    code: params.get('code') ?? '',
    state: params.get('state') ?? '',
    error: params.get('error') ?? undefined,
  };
}

/**
 * Build an end-session / logout URL for OpenID Connect providers.
 * Derives the logout endpoint from the authorization endpoint by replacing
 * `/authorize` with `/logout`.
 */
export function buildLogoutUrl(
  config: OAuthConfig,
  idTokenHint?: string,
  postLogoutRedirectUri?: string,
): string {
  const endSessionEndpoint = config.authorizationEndpoint.replace(/\/authorize$/, '/logout');
  const params: Record<string, string> = {};
  if (idTokenHint) params.id_token_hint = idTokenHint;
  if (postLogoutRedirectUri) params.post_logout_redirect_uri = postLogoutRedirectUri;
  const search = new URLSearchParams(params).toString();
  return `${endSessionEndpoint}${search ? '?' + search : ''}`;
}

// ---------------------------------------------------------------------------
// Pre-built Provider Configurations
// ---------------------------------------------------------------------------

/** Google OAuth 2.0 / OpenID Connect provider configuration. */
export function googleProvider(): Partial<OAuthConfig> {
  return {
    providerName: 'Google',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scopes: ['openid', 'email', 'profile'],
  };
}

/** GitHub OAuth (GitHub App) provider configuration. */
export function githubProvider(): Partial<OAuthConfig> {
  return {
    providerName: 'GitHub',
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    userInfoEndpoint: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
  };
}

/** Microsoft Azure AD / Entra ID provider configuration (common tenant). */
export function microsoftProvider(): Partial<OAuthConfig> {
  return {
    providerName: 'Microsoft',
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  };
}

/** Discord OAuth2 provider configuration. */
export function discordProvider(): Partial<OAuthConfig> {
  return {
    providerName: 'Discord',
    authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
    tokenEndpoint: 'https://discord.com/api/oauth2/token',
    userInfoEndpoint: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'email'],
  };
}

// ---------------------------------------------------------------------------
// OAuth Client Class
// ---------------------------------------------------------------------------

/**
 * High-level client for performing OAuth 2.0 authorization-code flows.
 * Supports PKCE, token refresh, revocation, user-info fetching, and local validation.
 */
export class OAuthClient {
  private readonly config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  // -- Authorization --------------------------------------------------------

  /**
   * Build the full authorization URL the user should be redirected to.
   * Automatically generates `state` if not provided. Extra query parameters
   * can be passed via `additionalParams` (e.g., PKCE `code_challenge`).
   */
  getAuthorizationUrl(
    state?: string,
    additionalParams?: Record<string, string>,
  ): string {
    const resolvedState = state ?? generateState();
    const params: Record<string, string> = {
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: resolvedState,
      ...additionalParams,
    };
    return `${this.config.authorizationEndpoint}?${new URLSearchParams(params).toString()}`;
  }

  // -- Token Exchange -------------------------------------------------------

  /**
   * Exchange an authorization code for a token set (RFC 6749 Section 4.1.3).
   * @param code - Authorization code received in the callback.
   * @param codeVerifier - Optional PKCE code verifier (required for PKCE flows).
   * @throws When the network request fails or the provider returns an error.
   */
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<OAuthToken> {
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
    };
    if (codeVerifier) body.code_verifier = codeVerifier;

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`Token exchange failed (${response.status}): ${text}`);
    }

    return this.normalizeTokenResponse(await response.json() as Record<string, unknown>);
  }

  // -- Token Refresh --------------------------------------------------------

  /**
   * Use a refresh token to obtain a new access token.
   * @throws When the request fails or the refresh token is invalid/revoked.
   */
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    };

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`Token refresh failed (${response.status}): ${text}`);
    }

    return this.normalizeTokenResponse(await response.json() as Record<string, unknown>);
  }

  // -- Token Revocation -----------------------------------------------------

  /**
   * Revoke a token at the provider's revocation endpoint.
   * Derives the revoke URL by replacing `/token` with `/revoke` in the token endpoint.
   * Warns (but does not throw) on non-success HTTP status since revocation may have
   * still succeeded server-side.
   */
  async revokeToken(token: string): Promise<void> {
    const revokeEndpoint = this.config.tokenEndpoint.replace(/\/token$/, '/revoke');
    const response = await fetch(revokeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn(`Token revocation warning (${response.status}): ${text}`);
    }
  }

  // -- User Info ------------------------------------------------------------

  /**
   * Fetch the authenticated user's profile information from the provider.
   * Requires `userInfoEndpoint` to be set in the configuration.
   * @throws When the endpoint is missing or the request fails.
   */
  async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    if (!this.config.userInfoEndpoint) {
      throw new Error(
        `userInfoEndpoint is not configured for provider "${this.config.providerName}".`,
      );
    }

    const response = await fetch(this.config.userInfoEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`User info request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  // -- Token Validation -----------------------------------------------------

  /**
   * Validate a token based on its local metadata (issuedAt + expiresIn).
   * This performs a **local** check only -- it does NOT call the provider's
   * introspection endpoint. For remote validation use the provider-specific API.
   * @param token - Access token string or stored OAuthToken object.
   */
  async validateToken(token: string | OAuthToken): Promise<TokenValidationResult> {
    let t: OAuthToken;

    if (typeof token === 'string') {
      const stored = getTokens();
      if (!stored || stored.accessToken !== token) {
        return { valid: true, expired: false, expiresInMillis: Infinity, expiresAt: 'unknown' };
      }
      t = stored;
    } else {
      t = token;
    }

    const now = Date.now();
    const expiryMs = t.issuedAt + t.expiresIn * 1000;
    const diff = expiryMs - now;
    const expired = diff <= 0;

    return {
      valid: !expired,
      expired,
      expiresInMillis: diff,
      expiresAt: new Date(expiryMs).toISOString(),
      error: expired ? 'Token has expired.' : undefined,
    };
  }

  // -- Internal Helpers -----------------------------------------------------

  /** Normalise a raw token-response JSON payload into our OAuthToken shape. */
  private normalizeTokenResponse(json: Record<string, unknown>): OAuthToken {
    return {
      accessToken: String(json.access_token ?? ''),
      refreshToken: String(json.refresh_token ?? ''),
      expiresIn: Number(json.expires_in ?? 0),
      tokenType: String(json.token_type ?? 'Bearer'),
      scope: String(json.scope ?? this.config.scopes.join(' ')),
      idToken: json.id_token ? String(json.id_token) : undefined,
      issuedAt: Date.now(),
    };
  }
}
