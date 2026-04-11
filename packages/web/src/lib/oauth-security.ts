/**
 * OAuth 2.0 / OpenID Connect / Security Utilities Library
 *
 * A comprehensive, production-ready TypeScript module covering:
 *   1. OAuth 2.0 Client (authorization code + PKCE, implicit, client credentials,
 *      refresh token rotation, introspection, revocation)
 *   2. OpenID Connect (ID token validation, UserInfo, discovery, session management)
 *   3. JWT Utilities (decode, verify, sign, JWKS fetching & caching, key rotation)
 *   4. Token Storage & Security (secure storage, AES-GCM encryption at rest,
 *      in-memory cache with TTL, leakage prevention)
 *   5. Scope & Permission Management (parsing, comparison, consent UI builder,
 *      dynamic scope request, RBAC mapping)
 *   6. Security Helpers (CSRF tokens, nonce, PKCE binding, redirect URI validation,
 *      rate limiting)
 *   7. Provider Adapters (Google, GitHub, Microsoft/Azure AD, generic)
 *
 * @module oauth-security
 */

// ===========================================================================
// Types & Interfaces
// ===========================================================================

/** Core OAuth 2.0 / OIDC provider configuration. */
export interface OAuthConfig {
  /** Registered client identifier. */
  clientId: string;
  /** Client secret (required for confidential clients). */
  clientSecret?: string;
  /** Registered redirect/callback URI. */
  redirectUri: string;
  /** Requested OAuth scopes. */
  scopes: string[];
  /** Authorization endpoint URL. */
  authorizationUrl: string;
  /** Token endpoint URL. */
  tokenUrl: string;
  /** Optional UserInfo endpoint URL. */
  userInfoUrl?: string;
  /** Enable PKCE (Proof Key for Code Exchange) for authorization code flow. */
  pkce?: boolean;
  /** Custom HTTP headers to include in token requests. */
  tokenHeaders?: Record<string, string>;
  /** Clock skew tolerance in seconds for token expiry checks (default: 60). */
  clockSkewSeconds?: number;
}

/** Standard OAuth 2.0 token response shape. */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

/** Decoded ID token claims payload. */
export interface IdTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  groups?: string[];
  roles?: string[];
  [key: string]: unknown;
}

/** PKCE code verifier / challenge pair. */
export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

/** Decoded JWT header. */
export interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
  jku?: string;
  [key: string]: unknown;
}

/** Decoded JWT payload (generic claims). */
export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  jti?: string;
  scope?: string;
  scopes?: string[];
  client_id?: string;
  [key: string]: unknown;
}

/** Full decoded JWT (header + payload). */
export interface DecodedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  raw: string;
}

/** JWKS key entry from a JSON Web Key Set. */
export interface JwkKey {
  kty: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  kid?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
  [key: string]: unknown;
}

/** JWKS response structure. */
export interface JwksResponse {
  keys: JwkKey[];
}

/** OIDC Discovery document (.well-known/openid-configuration). */
export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  claim_types_supported?: string[];
  claims_supported?: string[];
  code_challenge_methods_supported?: string[];
  end_session_endpoint?: string;
  check_session_iframe?: string;
  frontchannel_logout_supported?: boolean;
  frontchannel_logout_session_supported?: boolean;
  backchannel_logout_supported?: boolean;
  backchannel_logout_session_supported?: boolean;
  [key: string]: unknown;
}

/** Result of an ID token validation. */
export interface IdTokenValidationResult {
  valid: boolean;
  error?: string;
  errorCode?:
    | 'MALFORMED'
    | 'INVALID_SIGNATURE'
    | 'EXPIRED'
    | 'NOT_YET_VALID'
    | 'ISSUER_MISMATCH'
    | 'AUDIENCE_MISMATCH'
    | 'NONCE_MISMATCH';
  claims?: IdTokenClaims;
}

/** Token introspection response per RFC 7662. */
export interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
  [key: string]: unknown;
}

/** In-memory cached token entry. */
export interface CachedToken {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  scope: string;
  issuedAt: number;
}

/** Scope category for consent UI grouping. */
export interface ScopeCategory {
  label: string;
  description: string;
  icon?: string;
  scopes: { name: string; description: string; required: boolean }[];
}

/** RBAC permission derived from OIDC claims. */
export interface Permission {
  resource: string;
  action: string;
  granted: boolean;
  source: 'scope' | 'group' | 'role' | 'claim';
}

/** Rate limit bucket state. */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/** CSRF double-submit cookie pair. */
export interface CsrfTokenPair {
  token: string;
  cookieValue: string;
}

/** Redirect URI validation result. */
export interface RedirectUriValidationResult {
  valid: boolean;
  error?: string;
  normalizedUri?: string;
}

// ===========================================================================
// Constants
// ===========================================================================

const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const DEFAULT_PKCE_VERIFIER_LENGTH = 96; // bytes -> ~128 chars base64url
const STATE_LENGTH = 32; // bytes -> 43 chars base64url
const NONCE_LENGTH = 32;
const CSRF_TOKEN_LENGTH = 32;
const AES_GCM_IV_LENGTH = 12;
const AES_GCM_TAG_LENGTH = 128;
const JWKS_CACHE_TTL_MS = 3600_000; // 1 hour
const TOKEN_CACHE_DEFAULT_TTL_MS = 300_000; // 5 minutes
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute default window
const MAX_CODE_CHALLENGE_REUSE_AGE_MS = 120_000; // 2 minutes

/** Well-known scope descriptions for consent UI building. */
const WELL_KNOWN_SCOPES: Record<string, { label: string; description: string; category: string }> = {
  openid: { label: 'OpenID', description: 'Authenticate using OpenID Connect', category: 'identity' },
  profile: { label: 'Profile', description: 'Access your basic profile information', category: 'identity' },
  email: { label: 'Email', description: 'View your email address', category: 'identity' },
  address: { label: 'Address', description: 'Access your postal address', category: 'identity' },
  phone: { label: 'Phone', description: 'View your phone number', category: 'identity' },
  offline_access: { label: 'Offline Access', description: 'Maintain access when you are not actively using the application', category: 'persistence' },
  groups: { label: 'Groups', description: 'Access your group memberships', category: 'organization' },
  roles: { label: 'Roles', description: 'Access your assigned roles', category: 'organization' },
};

// ===========================================================================
// Internal State
// ===========================================================================

/** In-memory JWKS cache keyed by JWKS URI. */
const jwksCache = new Map<string, { keys: JwkKey[]; fetchedAt: number }>();

/** In-memory token cache. */
const tokenCache = new Map<string, CachedToken>();

/** Rate limit buckets. */
const rateLimitBuckets = new Map<string, RateLimitBucket>();

/** Used code challenges to prevent reuse attacks. */
const usedCodeChallenges = new Map<string, number>(); // challenge -> timestamp

/** AES-GCM encryption key (lazily derived or set). */
let encryptionKey: CryptoKey | null = null;

// ===========================================================================
// Section 1: OAuth 2.0 Client
// ===========================================================================

/**
 * Generate a cryptographically secure random string suitable for use as
 * an OAuth `state` parameter or PKCE `code_verifier`.
 *
 * @param byteLength - Number of random bytes to generate.
 * @returns Base64url-encoded random string (no padding).
 */
export function generateRandomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    throw new Error(
      'crypto.getRandomValues is not available. A secure RNG is required.',
    );
  }
  return base64UrlEncode(bytes);
}

/**
 * Generate an OAuth `state` parameter value and store it so it can be
 * validated when the authorization server redirects back. The stored value
 * includes metadata (timestamp, redirectUri) for additional checks.
 *
 * @param storageKey - Key under which to persist the state in sessionStorage.
 * @param redirectUri - The redirect URI that will be used (for binding).
 * @returns The generated state string.
 */
export function generateState(storageKey: string, redirectUri?: string): string {
  const state = generateRandomString(STATE_LENGTH);
  const stateData = {
    state,
    createdAt: Date.now(),
    redirectUri: redirectUri ?? null,
  };
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(stateData),
    );
  } catch {
    // sessionStorage may be unavailable (private browsing, storage quota).
    // Fall back to memory-only validation (less secure but functional).
  }
  return state;
}

/**
 * Validate the returned `state` parameter against the previously generated
 * and stored value. Checks value equality, timestamp freshness (5 min TTL),
 * and optionally binds to the original redirect URI.
 *
 * @param state - The state value received in the callback.
 * @param storageKey - Key used during generation.
 * @param expectedRedirectUri - Optional expected redirect URI for binding check.
 * @returns `true` if the state is valid.
 */
export function validateState(
  state: string,
  storageKey: string,
  expectedRedirectUri?: string,
): boolean {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(storageKey);
  } catch {
    return false;
  }
  if (!stored) return false;

  let parsed: { state: string; createdAt: number; redirectUri: string | null };
  try {
    parsed = JSON.parse(stored);
  } catch {
    return false;
  }

  // Remove after single use (prevent replay).
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }

  // Value must match exactly.
  if (parsed.state !== state) return false;

  // Must be used within 5 minutes.
  const ageMs = Date.now() - parsed.createdAt;
  if (ageMs > 300_000) return false;

  // Optional redirect URI binding.
  if (
    expectedRedirectUri &&
    parsed.redirectUri &&
    parsed.redirectUri !== expectedRedirectUri
  ) {
    return false;
  }

  return true;
}

/**
 * Generate a PKCE (Proof Key for Code Exchange) `code_verifier` and derive
 * the S256 `code_challenge` using SHA-256.
 *
 * @param length - Byte length of the verifier (default 96).
 * @returns Promise resolving to the PKCE pair.
 */
export async function generatePkcePair(
  length: number = DEFAULT_PKCE_VERIFIER_LENGTH,
): Promise<PkcePair> {
  const codeVerifier = generateRandomString(length);

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64UrlEncode(new Uint8Array(digest));

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Build the authorization URL for the Authorization Code flow (with optional
 * PKCE support). The caller should navigate the user to this URL.
 *
 * @param config - OAuth configuration.
 * @param state - Pre-generated state parameter.
 * @param pkce - Optional PKCE pair (omit for plain auth code flow).
 * @param nonce - Optional OIDC nonce parameter.
 * @param additionalParams - Extra query parameters to append.
 * @returns Fully-qualified authorization URL.
 */
export function buildAuthorizationUrl(
  config: OAuthConfig,
  state: string,
  pkce?: PkcePair,
  nonce?: string,
  additionalParams?: Record<string, string>,
): string {
  const params: Record<string, string> = {
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: normalizeScopes(config.scopes),
    state,
  };

  if (pkce) {
    params.code_challenge = pkce.codeChallenge;
    params.code_challenge_method = pkce.codeChallengeMethod;
  }

  if (nonce) {
    params.nonce = nonce;
  }

  if (additionalParams) {
    Object.assign(params, additionalParams);
  }

  return `${config.authorizationUrl}?${new URLSearchParams(params).toString()}`;
}

/**
 * Build the authorization URL for the Implicit Flow (deprecated but supported
 * for legacy providers that do not support PKCE).
 *
 * @param config - OAuth configuration.
 * @param state - Pre-generated state parameter.
 * @param nonce - Optional OIDC nonce.
 * @returns Fully-qualified authorization URL.
 */
export function buildImplicitAuthorizationUrl(
  config: OAuthConfig,
  state: string,
  nonce?: string,
): string {
  const params: Record<string, string> = {
    response_type: 'token',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: normalizeScopes(config.scopes),
    state,
  };

  if (nonce) {
    params.nonce = nonce;
  }

  return `${config.authorizationUrl}?${new URLSearchParams(params).toString()}`;
}

/**
 * Exchange an authorization code for tokens using the Authorization Code flow.
 * Supports both confidential clients (with secret) and public clients (PKCE).
 *
 * @param code - Authorization code from the callback.
 * @param config - OAuth configuration.
 * @param codeVerifier - PKCE code verifier (required for public clients).
 * @returns Promise resolving to the token response.
 * @throws If the exchange fails or the response is invalid.
 */
export async function exchangeCodeForTokens(
  code: string,
  config: OAuthConfig,
  codeVerifier?: string,
): Promise<TokenResponse> {
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
  };

  if (codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  if (config.clientSecret) {
    body.client_secret = config.clientSecret;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    ...config.tokenHeaders,
  };

  // For confidential clients, prefer Basic auth over body parameters.
  if (config.clientSecret && !codeVerifier) {
    const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
    delete body.client_id;
    delete body.client_secret;
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Token exchange failed (${response.status}): ${errorText}`,
    );
  }

  const json = (await response.json()) as TokenResponse;
  if (!json.access_token) {
    throw new Error('Token response missing access_token');
  }

  return json;
}

/**
 * Perform the Client Credentials grant flow (machine-to-machine auth).
 * Returns only an access token (no refresh token or ID token).
 *
 * @param config - OAuth configuration (clientSecret is required).
 * @param scopesOverride - Optional override for requested scopes.
 * @returns Promise resolving to the token response.
 */
export async function clientCredentialsGrant(
  config: OAuthConfig,
  scopesOverride?: string[],
): Promise<TokenResponse> {
  if (!config.clientSecret) {
    throw new Error('clientSecret is required for client_credentials grant');
  }

  const body: Record<string, string> = {
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: normalizeScopes(scopesOverride ?? config.scopes),
  };

  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    Authorization: `Basic ${credentials}`,
    ...config.tokenHeaders,
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Client credentials grant failed (${response.status}): ${errorText}`,
    );
  }

  return (await response.json()) as TokenResponse;
}

/**
 * Use a refresh token to obtain a new access token. Implements refresh token
 * rotation semantics: the old refresh token is invalidated upon successful use.
 *
 * @param refreshToken - The current refresh token.
 * @param config - OAuth configuration.
 * @returns Promise resolving to the new token response.
 */
export async function refreshTokenGrant(
  refreshToken: string,
  config: OAuthConfig,
): Promise<TokenResponse> {
  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
  };

  if (config.clientSecret) {
    body.client_secret = config.clientSecret;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    ...config.tokenHeaders,
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Refresh token grant failed (${response.status}): ${errorText}`,
    );
  }

  return (await response.json()) as TokenResponse;
}

/**
 * Introspect a token against the provider's introspection endpoint
 * (RFC 7662). Determines whether the token is still active and returns
 * associated metadata.
 *
 * @param token - The token to introspect.
 * @param introspectUrl - The RFC 7662 introspection endpoint URL.
 * @param clientId - Client identifier (sent as hint).
 * @param clientSecret - Optional client secret for authentication.
 * @returns Promise resolving to the introspection response.
 */
export async function introspectToken(
  token: string,
  introspectUrl: string,
  clientId: string,
  clientSecret?: string,
): Promise<IntrospectionResponse> {
  const body = new URLSearchParams({
    token,
    token_type_hint: 'access_token',
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  if (clientSecret) {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    body.set('client_id', clientId);
  }

  const response = await fetch(introspectUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Token introspection failed (${response.status}): ${errorText}`,
    );
  }

  return (await response.json()) as IntrospectionResponse;
}

/**
 * Revoke a token (access or refresh) at the provider's revocation endpoint
 * (RFC 7009).
 *
 * @param token - The token to revoke.
 * @param revokeUrl - The RFC 7009 revocation endpoint URL.
 * @param clientId - Client identifier.
 * @param clientSecret - Optional client secret.
 * @param tokenTypeHint - Hint for the token type ('access_token' | 'refresh_token').
 * @returns Promise resolving to `true` on success.
 */
export async function revokeToken(
  token: string,
  revokeUrl: string,
  clientId: string,
  clientSecret?: string,
  tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token',
): Promise<boolean> {
  const body = new URLSearchParams({
    token,
    token_type_hint: tokenTypeHint,
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (clientSecret) {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    body.set('client_id', clientId);
  }

  const response = await fetch(revokeUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  // Per RFC 7009, revocation endpoints SHOULD return 200 even for already-revoked
  // tokens, so we treat any 2xx as success.
  return response.ok;
}

// ===========================================================================
// Section 2: OpenID Connect (OIDC)
// ===========================================================================

/**
 * Fetch and parse the OIDC discovery document from the issuer's well-known
 * location. Results are NOT cached here -- callers should cache as needed.
 *
 * @param issuerBaseUrl - The issuer's base URL (e.g., "https://accounts.google.com").
 * @returns Promise resolving to the parsed discovery document.
 */
export async function fetchDiscoveryDocument(
  issuerBaseUrl: string,
): Promise<OidcDiscoveryDocument> {
  const url = issuerBaseUrl.replace(/\/+$/, '') +
    '/.well-known/openid-configuration';

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch discovery document from ${url} (${response.status})`,
    );
  }

  const doc = (await response.json()) as OidcDiscoveryDocument;

  // Validate required fields.
  if (!doc.issuer || !doc.authorization_endpoint || !doc.token_endpoint) {
    throw new Error('Discovery document missing required fields');
  }

  return doc;
}

/**
 * Fetch user profile information from the UserInfo endpoint using an
 * access token.
 *
 * @param accessToken - Valid access token.
 * @param userInfoUrl - UserInfo endpoint URL.
 * @returns Promise resolving to the user claims object.
 */
export async function fetchUserInfo(
  accessToken: string,
  userInfoUrl: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `UserInfo fetch failed (${response.status}): ${errorText}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

/**
 * Validate an ID token (JWT) according to OIDC Core spec:
 *   - Correct JWT format (three dot-separated parts)
 *   - Signature verification (RS256/RS384/ES256 via JWKS)
 *   - Issuer (`iss`) matches expected issuer
 *   - Audience (`aud`) contains client_id
 *   - Expiration (`exp`) has not passed (with configurable clock skew)
 *   - Issued-at (`iat`) is not in the future
 *   - Nonce (`nonce`) matches expected value (if provided)
 *
 * @param idToken - The raw ID token string.
 * @param options - Validation parameters.
 * @returns Detailed validation result including decoded claims if valid.
 */
export async function validateIdToken(
  idToken: string,
  options: {
    issuer: string;
    clientId: string;
    nonce?: string;
    jwksUri?: string;
    jwks?: JwkKey[];
    clockSkewSeconds?: number;
  },
): Promise<IdTokenValidationResult> {
  const clockSkew = options.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS;
  const now = Math.floor(Date.now() / 1000);

  // 1. Decode without verifying signature first (for structural checks).
  let decoded: DecodedJwt;
  try {
    decoded = decodeJwt(idToken);
  } catch {
    return { valid: false, error: 'Malformed JWT', errorCode: 'MALFORMED' };
  }

  const claims = decoded.payload as unknown as IdTokenClaims;

  // 2. Verify signature if JWKS are available.
  if (options.jwksUri || options.jwks) {
    let keys: JwkKey[];
    if (options.jwks) {
      keys = options.jwks;
    } else {
      keys = await fetchJwks(options.jwksUri!);
    }

    const sigValid = await verifyJwtSignature(idToken, keys, clockSkew);
    if (!sigValid) {
      return {
        valid: false,
        error: 'Invalid signature',
        errorCode: 'INVALID_SIGNATURE',
      };
    }
  }

  // 3. Check expiration.
  if (claims.exp && claims.exp < now - clockSkew) {
    return {
      valid: false,
      error: `Token expired at ${new Date(claims.exp * 1000).toISOString()}`,
      errorCode: 'EXPIRED',
    };
  }

  // 4. Check not-before / issued-at.
  if (claims.iat && claims.iat > now + clockSkew) {
    return {
      valid: false,
      error: 'Token issued in the future',
      errorCode: 'NOT_YET_VALID',
    };
  }

  // 5. Validate issuer.
  if (claims.iss !== options.issuer) {
    return {
      valid: false,
      error: `Issuer mismatch: expected "${options.issuer}", got "${claims.iss}"`,
      errorCode: 'ISSUER_MISMATCH',
    };
  }

  // 6. Validate audience.
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(options.clientId)) {
    return {
      valid: false,
      error: `Audience mismatch: client "${options.clientId}" not in [${audiences.join(', ')}]`,
      errorCode: 'AUDIENCE_MISMATCH',
    };
  }

  // 7. Validate nonce (if one was sent during authorization).
  if (options.nonce && claims.nonce !== options.nonce) {
    return {
      valid: false,
      error: 'Nonce mismatch — possible replay attack',
      errorCode: 'NONCE_MISMATCH',
    };
  }

  return { valid: true, claims };
}

/**
 * Extract standardized identity claims from validated ID token claims or
 * UserInfo response into a flat, predictable shape.
 *
 * @param claims - Raw claims object (from ID token or UserInfo).
 * @returns Normalized user profile object.
 */
export function extractIdentityClaims(
  claims: Record<string, unknown>,
): {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
  groups: string[];
  roles: string[];
} {
  return {
    sub: String(claims.sub ?? ''),
    email: claims.email as string | undefined,
    emailVerified: claims.email_verified as boolean | undefined,
    name: claims.name as string | undefined,
    givenName: claims.given_name as string | undefined,
    familyName: claims.family_name as string | undefined,
    picture: claims.picture as string | undefined,
    locale: claims.locale as string | undefined,
    groups: normalizeClaimArray(claims.groups),
    roles: normalizeClaimArray(claims.roles),
  };
}

/**
 * Return the session management URLs from a discovery document, if the
 * OP supports session management (OIDC Session 1.0).
 *
 * @param discovery - Parsed discovery document.
 * @returns Object containing check_session_iframe and end_session_endpoint, or nulls.
 */
export function getSessionManagementEndpoints(
  discovery: OidcDiscoveryDocument,
): { checkSessionIframe: string | null; endSessionEndpoint: string | null } {
  return {
    checkSessionIframe: discovery.check_session_iframe ?? null,
    endSessionEndpoint: discovery.end_session_endpoint ?? null,
  };
}

/**
 * Build the end-session (logout) URL for RP-initiated logout.
 *
 * @param endSessionEndpoint - The end_session_endpoint from discovery.
 * @param idTokenHint - The current ID token (sent as id_token_hint).
 * * @param postLogoutRedirectUri - Where to redirect after logout.
 * @param state - Optional state parameter for the post-logout redirect.
 * @returns Fully-qualified end-session URL.
 */
export function buildEndSessionUrl(
  endSessionEndpoint: string,
  idTokenHint: string,
  postLogoutRedirectUri?: string,
  state?: string,
): string {
  const params: Record<string, string> = {
    id_token_hint: idTokenHint,
  };

  if (postLogoutRedirectUri) {
    params.post_logout_redirect_uri = postLogoutRedirectUri;
  }

  if (state) {
    params.state = state;
  }

  return `${endSessionEndpoint}?${new URLSearchParams(params).toString()}`;
}

// ===========================================================================
// Section 3: JWT Utilities
// ===========================================================================

/**
 * Decode a JWT into its header and payload components **without** verifying
 * the signature. Useful for inspecting token metadata before full validation.
 *
 * @param token - The JWT string.
 * @returns Decoded header and payload.
 * @throws If the token is not a valid JWT (3 base64url parts).
 */
export function decodeJwt(token: string): DecodedJwt {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 dot-separated parts');
  }

  const headerJson = base64UrlDecode(parts[0]);
  const payloadJson = base64UrlDecode(parts[1]);

  let header: JwtHeader;
  let payload: JwtPayload;

  try {
    header = JSON.parse(headerJson) as JwtHeader;
    payload = JSON.parse(payloadJson) as JwtPayload;
  } catch {
    throw new Error('Invalid JWT: header or payload is not valid JSON');
  }

  if (!header.alg) {
    throw new Error('Invalid JWT: missing "alg" in header');
  }

  return { header, payload, raw: token };
}

/**
 * Verify the cryptographic signature of a JWT using keys from a JWKS.
 * Supports RS256, RS384, RS512, ES256, ES384, ES512, HS256, HS384, HS512.
 *
 * @param token - The complete JWT string.
 * @param keys - Array of JWK keys to try.
 * @param clockSkewSeconds - Allowed clock skew for expiry check.
 * @returns `true` if the signature is valid and token is not expired.
 */
export async function verifyJwtSignature(
  token: string,
  keys: JwkKey[],
  clockSkewSeconds: number = DEFAULT_CLOCK_SKEW_SECONDS,
): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const { header } = decodeJwt(token);
  const alg = header.alg;

  // Select matching key by `kid` if present.
  let candidateKeys = keys;
  if (header.kid) {
    candidateKeys = keys.filter((k) => k.kid === header.kid);
    if (candidateKeys.length === 0) {
      // Fall back to all keys if no matching kid found (key rotation scenario).
      candidateKeys = keys;
    }
  }

  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = base64UrlToUint8Array(parts[2]);

  for (const key of candidateKeys) {
    try {
      const isValid = await verifySignatureForKey(signingInput, signature, key, alg);
      if (isValid) {
        // Also check expiry.
        const payload = decodeJwt(token).payload;
        if (payload.exp) {
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp < now - clockSkewSeconds) return false;
        }
        return true;
      }
    } catch {
      // Try next key.
      continue;
    }
  }

  return false;
}

/**
 * Create and sign a JWT for microservice-to-microservice authentication.
 * Supports HS256 (symmetric) and RS256/ES256 (asymmetric) algorithms.
 *
 * @param payload - Claims to include in the token.
 * @param key - Signing key (secret string for HMAC, CryptoKey for asymmetric).
 * @param algorithm - Signing algorithm (default: HS256).
 * @param expiresIn - Expiration time in seconds from now (default: 3600).
 * @param kid - Optional key ID for the header.
 * @returns Promise resolving to the signed JWT string.
 */
export async function createSignedJwt(
  payload: Record<string, unknown>,
  key: string | CryptoKey,
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'ES256' = 'HS256',
  expiresIn: number = 3600,
  kid?: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header: JwtHeader = { alg: algorithm, typ: 'JWT' };
  if (kid) header.kid = kid;

  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header)),
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(fullPayload)),
  );

  const signingInput = `${encodedHeader}.${encodedPayload}`;

  let signature: ArrayBuffer;

  if (algorithm.startsWith('HS')) {
    if (typeof key !== 'string') {
      throw new Error('HMAC signing requires a string secret key');
    }
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key),
      { name: 'HMAC', hash: { name: `SHA-${algorithm.slice(-3)}` } },
      false,
      ['sign'],
    );
    signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signingInput));
  } else if (algorithm === 'RS256') {
    if (!(key instanceof CryptoKey)) {
      throw new Error('RSA signing requires a CryptoKey');
    }
    signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      new TextEncoder().encode(signingInput),
    );
  } else if (algorithm === 'ES256') {
    if (!(key instanceof CryptoKey)) {
      throw new Error('ECDSA signing requires a CryptoKey');
    }
    signature = await crypto.subtle.sign(
      { name: 'ECDSA', namedCurve: 'P-256' },
      key,
      new TextEncoder().encode(signingInput),
    );
  } else {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  const encodedSig = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSig}`;
}

/**
 * Add or overwrite claims on a decoded JWT payload.
 *
 * @param payload - Existing payload object.
 * @param claims - Claims to add/merge.
 * @returns New payload object with merged claims.
 */
export function addClaims(
  payload: JwtPayload,
  claims: Record<string, unknown>,
): JwtPayload {
  return { ...payload, ...claims };
}

/**
 * Remove specified claims from a payload, returning a new object.
 *
 * @param payload - Existing payload object.
 * @param claimNames - Names of claims to remove.
 * @returns New payload without the specified claims.
 */
export function removeClaims(
  payload: JwtPayload,
  claimNames: string[],
): JwtPayload {
  const result = { ...payload };
  for (const name of claimNames) {
    delete result[name];
  }
  return result;
}

/**
 * Check whether a JWT (or its decoded payload) has expired, accounting for
 * configurable clock skew.
 *
 * @param tokenOrPayload - Either a raw JWT string or a decoded payload.
 * @param clockSkewSeconds - Tolerance in seconds (default: 60).
 * @returns `true` if the token is expired.
 */
export function isTokenExpired(
  tokenOrPayload: string | JwtPayload,
  clockSkewSeconds: number = DEFAULT_CLOCK_SKEW_SECONDS,
): boolean {
  let exp: number | undefined;

  if (typeof tokenOrPayload === 'string') {
    try {
      const { payload } = decodeJwt(tokenOrPayload);
      exp = payload.exp;
    } catch {
      return true; // Cannot decode => treat as expired.
    }
  } else {
    exp = tokenOrPayload.exp;
  }

  if (!exp) return false; // No exp claim => non-expiring token.

  const now = Math.floor(Date.now() / 1000);
  return exp < now - clockSkewSeconds;
}

/**
 * Calculate remaining lifetime of a token in milliseconds.
 *
 * @param tokenOrPayload - Raw JWT string or decoded payload.
 * @returns Milliseconds until expiry, or 0 if already expired / no exp claim.
 */
export function getTokenRemainingTtl(
  tokenOrPayload: string | JwtPayload,
): number {
  let exp: number | undefined;

  if (typeof tokenOrPayload === 'string') {
    try {
      const { payload } = decodeJwt(tokenOrPayload);
      exp = payload.exp;
    } catch {
      return 0;
    }
  } else {
    exp = tokenOrPayload.exp;
  }

  if (!exp) return Infinity;

  const now = Date.now();
  const expMs = exp * 1000;
  return Math.max(0, expMs - now);
}

/**
 * Fetch a JWKS (JSON Web Key Set) from the given URI with caching. Keys are
 * cached for `JWKS_CACHE_TTL_MS` (1 hour) by default. Handles key rotation
 * transparently by always returning fresh keys after cache expiry.
 *
 * @param uri - The JWKS endpoint URL.
 * @param forceRefresh - Bypass cache and force a network fetch.
 * @returns Promise resolving to the array of JWK keys.
 */
export async function fetchJwks(
  uri: string,
  forceRefresh: boolean = false,
): Promise<JwkKey[]> {
  const cached = jwksCache.get(uri);
  const now = Date.now();

  if (!forceRefresh && cached && now - cached.fetchedAt < JWKS_CACHE_TTL_MS) {
    return cached.keys;
  }

  const response = await fetch(uri, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`JWKS fetch failed (${response.status}) from ${uri}`);
  }

  const jwks = (await response.json()) as JwksResponse;
  if (!Array.isArray(jwks.keys)) {
    throw new Error('Invalid JWKS response: missing "keys" array');
  }

  jwksCache.set(uri, { keys: jwks.keys, fetchedAt: now });
  return jwks.keys;
}

/**
 * Clear the JWKS cache entirely or for a specific URI. Useful after detecting
 * a key rotation event or for testing.
 *
 * @param uri - Specific URI to clear, or omit to clear all.
 */
export function clearJwksCache(uri?: string): void {
  if (uri) {
    jwksCache.delete(uri);
  } else {
    jwksCache.clear();
  }
}

// ===========================================================================
// Section 4: Token Storage & Security
// ===========================================================================

/** Supported storage strategies for tokens. */
export type TokenStorageStrategy = 'memory' | 'localStorage' | 'sessionStorage' | 'cookie';

/** Configuration for secure token storage. */
export interface TokenStorageConfig {
  strategy: TokenStorageStrategy;
  /** Encrypt tokens at rest using AES-GCM (requires crypto.subtle). */
  encryptAtRest?: boolean;
  /** Prefix for storage keys (to avoid collisions). */
  keyPrefix?: string;
  /** Custom cookie domain (only relevant for 'cookie' strategy). */
  cookieDomain?: string;
  /** Cookie path (default: '/'). */
  cookiePath?: string;
  /** Whether the cookie should be Secure (production should be true). */
  cookieSecure?: boolean;
  /** Cookie SameSite attribute. */
  cookieSameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Store tokens securely according to the configured strategy. When
 * `encryptAtRest` is enabled, tokens are encrypted with AES-GCM before
 * writing to the underlying storage backend.
 *
 * @param tokens - Token data to store.
 * @param config - Storage configuration.
 * @param cacheKey - Key for the in-memory cache layer.
 */
export async function storeTokensSecurely(
  tokens: TokenResponse,
  config: TokenStorageConfig,
  cacheKey: string = 'default',
): Promise<void> {
  const prefix = config.keyPrefix ?? 'oauth_';
  const now = Date.now();
  const expiresIn = tokens.expires_in ?? 3600;

  const cachedEntry: CachedToken = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    expiresAt: now + expiresIn * 1000,
    scope: tokens.scope ?? '',
    issuedAt: now,
  };

  // Always keep in-memory cache for fast access.
  tokenCache.set(cacheKey, cachedEntry);

  if (config.strategy === 'memory') {
    return; // Memory-only: done.
  }

  const serialized = JSON.stringify(tokens);
  const dataToStore = config.encryptAtRest
    ? await encryptAesGcm(serialized)
    : serialized;

  switch (config.strategy) {
    case 'localStorage':
      try {
        localStorage.setItem(`${prefix}tokens`, dataToStore);
      } catch (e) {
        console.warn('Failed to store tokens in localStorage:', e);
      }
      break;

    case 'sessionStorage':
      try {
        sessionStorage.setItem(`${prefix}tokens`, dataToStore);
      } catch (e) {
        console.warn('Failed to store tokens in sessionStorage:', e);
      }
      break;

    case 'cookie':
      // Note: Setting cookies from JS cannot make them httpOnly.
      // This is a best-effort client-side approach; production should
      // prefer server-set httpOnly cookies.
      const cookieParts = [
        `${prefix}tokens=${encodeURIComponent(dataToStore)}`,
        `Path=${config.cookiePath ?? '/'}`,
        `SameSite=${config.cookieSameSite ?? 'Lax'}`,
      ];
      if (config.cookieSecure !== false) {
        cookieParts.push('Secure');
      }
      if (config.cookieDomain) {
        cookieParts.push(`Domain=${config.cookieDomain}`);
      }
      // Set max-age to match token expiry.
      cookieParts.push(`Max-Age=${expiresIn}`);
      document.cookie = cookieParts.join('; ');
      break;
  }
}

/**
 * Retrieve securely stored tokens, decrypting if necessary.
 *
 * @param config - Storage configuration (must match what was used for storing).
 * @param cacheKey - In-memory cache key.
 * @returns The cached token entry, or `null` if not found / expired.
 */
export async function retrieveStoredTokens(
  config: TokenStorageConfig,
  cacheKey: string = 'default',
): Promise<CachedToken | null> {
  // Check in-memory cache first.
  const memCached = tokenCache.get(cacheKey);
  if (memCached && memCached.expiresAt > Date.now()) {
    return memCached;
  }

  // Evict expired memory entry.
  if (memCached) {
    tokenCache.delete(cacheKey);
  }

  if (config.strategy === 'memory') {
    return null;
  }

  const prefix = config.keyPrefix ?? 'oauth_';
  let stored: string | null = null;

  switch (config.strategy) {
    case 'localStorage':
      try {
        stored = localStorage.getItem(`${prefix}tokens`);
      } catch {
        /* unavailable */
      }
      break;

    case 'sessionStorage':
      try {
        stored = sessionStorage.getItem(`${prefix}tokens`);
      } catch {
        /* unavailable */
      }
      break;

    case 'cookie':
      stored = readCookie(`${prefix}tokens`);
      break;
  }

  if (!stored) return null;

  // Decrypt if needed.
  const decrypted = config.encryptAtRest ? await decryptAesGcm(stored) : stored;

  let tokens: TokenResponse;
  try {
    tokens = JSON.parse(decrypted) as TokenResponse;
  } catch {
    return null; // Corrupted data.
  }

  const expiresIn = tokens.expires_in ?? 3600;
  const entry: CachedToken = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    expiresAt: Date.now() + expiresIn * 1000,
    scope: tokens.scope ?? '',
    issuedAt: Date.now(),
  };

  tokenCache.set(cacheKey, entry);
  return entry;
}

/**
 * Clear all stored tokens from all configured storage backends.
 *
 * @param config - Storage configuration.
 * @param cacheKey - In-memory cache key to clear.
 */
export function clearStoredTokens(
  config: TokenStorageConfig,
  cacheKey: string = 'default',
): void {
  tokenCache.delete(cacheKey);

  const prefix = config.keyPrefix ?? 'oauth_';

  switch (config.strategy) {
    case 'localStorage':
      try {
        localStorage.removeItem(`${prefix}tokens`);
      } catch {
        /* ignore */
      }
      break;

    case 'sessionStorage':
      try {
        sessionStorage.removeItem(`${prefix}tokens`);
      } catch {
        /* ignore */
      }
      break;

    case 'cookie':
      // Expire the cookie by setting Max-Age=0.
      const cookieParts = [
        `${prefix}tokens=`,
        `Path=${config.cookiePath ?? '/'}`,
        `SameSite=${config.cookieSameSite ?? 'Lax'}`,
        'Max-Age=0',
      ];
      if (config.cookieDomain) {
        cookieParts.push(`Domain=${config.cookieDomain}`);
      }
      document.cookie = cookieParts.join('; ');
      break;

    case 'memory':
      // Already handled above.
      break;
  }
}

/**
 * Encrypt a plaintext string using AES-GCM. The output format is
 * `base64url(iv) . base64url(ciphertext+tag)` (dot-separated), which is
 * safe for storage in cookies, localStorage, etc.
 *
 * @param plaintext - String to encrypt.
 * @returns Promise resolving to the encrypted string.
 */
export async function encryptAesGcm(plaintext: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: AES_GCM_TAG_LENGTH },
    key,
    data,
  );

  // Combine IV + ciphertext+tag, both base64url-encoded.
  const ivB64 = base64UrlEncode(iv);
  const ctB64 = base64UrlEncode(new Uint8Array(ciphertext));
  return `${ivB64}.${ctB64}`;
}

/**
 * Decrypt a string produced by {@link encryptAesGcm}.
 *
 * @param ciphertext - Dot-separated IV.ciphertext string.
 * @returns Promise resolving to the original plaintext.
 */
export async function decryptAesGcm(ciphertext: string): Promise<string> {
  const dotIndex = ciphertext.indexOf('.');
  if (dotIndex === -1) {
    throw new Error('Invalid encrypted format: missing separator');
  }

  const ivB64 = ciphertext.substring(0, dotIndex);
  const ctB64 = ciphertext.substring(dotIndex + 1);

  const iv = base64UrlToUint8Array(ivB64);
  const ct = base64UrlToUint8Array(ctB64);

  const key = await getOrCreateEncryptionKey();

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: AES_GCM_TAG_LENGTH },
    key,
    ct,
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Store a token received in a URL fragment (implicit flow) safely by moving
 * it out of the browser history/address bar into secure storage, then clean
 * the URL fragment to prevent referrer leakage.
 *
 * @param config - Storage configuration.
 * @param cacheKey - Cache key for storage.
 * @returns The extracted token data, or `null` if no fragment tokens found.
 */
export function consumeFragmentTokens(
  config: TokenStorageConfig,
  cacheKey: string = 'default',
): { accessToken?: string; idToken?: string; expiresIn?: number; state?: string } | null {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const tokenType = params.get('token_type');
  const expiresInStr = params.get('expires_in');
  const idToken = params.get('id_token');
  const state = params.get('state');

  if (!accessToken && !idToken) return null;

  // Parse and store asynchronously (fire-and-forget for immediate URL cleanup).
  const expiresIn = expiresInStr ? parseInt(expiresInStr, 10) : undefined;
  if (accessToken) {
    const tokenResp: TokenResponse = {
      access_token: accessToken,
      token_type: tokenType ?? 'Bearer',
      expires_in: expiresIn,
      id_token: idToken ?? undefined,
    };
    void storeTokensSecurely(tokenResp, config, cacheKey);
  }

  // Clear the fragment from the browser history/address bar immediately
  // to prevent token leakage via referrer headers or history inspection.
  if (typeof history !== 'undefined' && history.replaceState) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  return {
    accessToken: accessToken ?? undefined,
    idToken: idToken ?? undefined,
    expiresIn,
    state: state ?? undefined,
  };
}

/**
 * Get recommended security headers / meta tags for preventing token leakage
 * through referrer, caching, or other vectors.
 *
 * @returns Object describing recommended policies.
 */
export function getTokenLeakagePreventionPolicies(): {
  referrerPolicy: string;
  cacheControl: string;
  pragma: string;
  metaTags: string[];
} {
  return {
    referrerPolicy: 'no-referrer',
    cacheControl: 'no-store, no-cache, must-revalidate, proxy-revalidate',
    pragma: 'no-cache',
    metaTags: [
      '<meta name="referrer" content="no-referrer">',
      '<meta http-equiv="Cache-Control" content="no-store">',
      '<meta http-equiv="Pragma" content="no-cache">',
    ],
  };
}

// ===========================================================================
// Section 5: Scope & Permission Management
// ===========================================================================

/**
 * Normalize an array of scope strings into a space-separated, deduplicated,
 * sorted string suitable for the `scope` parameter.
 *
 * @param scopes - Array of scope strings.
 * @returns Normalized space-separated scope string.
 */
export function normalizeScopes(scopes: string[]): string {
  return [...new Set(scopes.map((s) => s.trim()).filter(Boolean))].sort().join(' ');
}

/**
 * Parse a space-separated scope string into a normalized, sorted, unique array.
 *
 * @param scopeString - Space-delimited scopes.
 * @returns Sorted unique array of scope strings.
 */
export function parseScopes(scopeString: string): string[] {
  if (!scopeString) return [];
  return [...new Set(scopeString.split(/\s+/).map((s) => s.trim()).filter(Boolean))].sort();
}

/**
 * Check whether `haystack` contains every scope in `needle`.
 *
 * @param haystack - Space-separated scope string or array to search within.
 * @param needle - Space-separated scope string or array to find.
 * @returns `true` if all needle scopes are present in haystack.
 */
export function scopesContain(
  haystack: string | string[],
  needle: string | string[],
): boolean {
  const haystackSet = new Set(
    typeof haystack === 'string' ? parseScopes(haystack) : haystack,
  );
  const needles = typeof needle === 'string' ? parseScopes(needle) : needle;
  return needles.every((s) => haystackSet.has(s));
}

/**
 * Check whether two scope sets are exactly equal (order-independent).
 *
 * @param a - First scope set (string or array).
 * @param b - Second scope set (string or array).
 * @returns `true` if the sets contain identical scopes.
 */
export function scopesEqual(a: string | string[], b: string | string[]): boolean {
  const setA = new Set(typeof a === 'string' ? parseScopes(a) : a);
  const setB = new Set(typeof b === 'string' ? parseScopes(b) : b);
  if (setA.size !== setB.size) return false;
  for (const s of setA) {
    if (!setB.has(s)) return false;
  }
  return true;
}

/**
 * Check whether `subset` is a subset of `superset`.
 *
 * @param superset - The larger scope collection.
 * @param subset - The smaller scope collection to test.
 * @returns `true` if every scope in `subset` exists in `superset`.
 */
export function isScopeSubset(
  superset: string | string[],
  subset: string | string[],
): boolean {
  return scopesContain(superset, subset);
}

/**
 * Compute the incremental scopes needed: scopes requested but not yet granted.
 * Useful for dynamic/incremental authorization requests.
 *
 * @param grantedScopes - Currently granted scopes.
 * @param requestedScopes - Scopes being requested.
 * @returns Array of additional scopes needed (not yet granted).
 */
export function computeIncrementalScopes(
  grantedScopes: string | string[],
  requestedScopes: string | string[],
): string[] {
  const granted = new Set(
    typeof grantedScopes === 'string' ? parseScopes(grantedScopes) : grantedScopes,
  );
  const requested =
    typeof requestedScopes === 'string'
      ? parseScopes(requestedScopes)
      : requestedScopes;
  return requested.filter((s) => !granted.has(s));
}

/**
 * Group scopes by category for building a consent UI. Uses built-in knowledge
 * of standard OIDC scopes and heuristics for custom scopes.
 *
 * @param scopes - Array of scopes to categorize.
 * @returns Array of scope categories with descriptions.
 */
export function buildScopeConsentUiData(scopes: string[]): ScopeCategory[] {
  const categoryMap = new Map<string, ScopeCategory>();

  for (const scope of scopes) {
    const known = WELL_KNOWN_SCOPES[scope];
    const categoryName = known?.category ?? 'custom';
    const catLabel = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        label: catLabel,
        description: `${catLabel}-related permissions`,
        scopes: [],
      });
    }

    categoryMap.get(categoryName)!.scopes.push({
      name: scope,
      description: known?.description ?? `Permission: ${scope}`,
      required: scope === 'openid',
    });
  }

  return Array.from(categoryMap.values());
}

/**
 * Derive a flat permission list from OIDC claims (scopes, groups, roles, and
 * arbitrary claims). Maps identity attributes to resource/action pairs for
 * RBAC enforcement.
 *
 * @param claims - User claims (from ID token or UserInfo).
 * @param grantedScopes - Scopes granted to this client.
 * @param rolePermissionMap - Optional custom mapping from role names to permissions.
 * @returns Array of derived permissions.
 */
export function deriveRbacPermissions(
  claims: Record<string, unknown>,
  grantedScopes: string[],
  rolePermissionMap?: Record<string, Permission[]>,
): Permission[] {
  const permissions: Permission[] = [];

  // 1. Scope-derived permissions.
  const scopes = parseScopes(grantedScopes);
  for (const scope of scopes) {
    permissions.push({
      resource: scope,
      action: 'read',
      granted: true,
      source: 'scope',
    });
  }

  // 2. Group-derived permissions.
  const groups = normalizeClaimArray(claims.groups);
  for (const group of groups) {
    permissions.push({
      resource: group,
      action: 'member',
      granted: true,
      source: 'group',
    });
  }

  // 3. Role-derived permissions.
  const roles = normalizeClaimArray(claims.roles);
  for (const role of roles) {
    if (rolePermissionMap?.[role]) {
      permissions.push(...rolePermissionMap[role]);
    } else {
      permissions.push({
        resource: '*',
        action: role,
        granted: true,
        source: 'role',
      });
    }
  }

  return permissions;
}

/**
 * Check whether a specific permission is granted based on derived RBAC
 * permissions.
 *
 * @param permissions - Derived permission list.
 * @param resource - Resource to check (or '*' for any).
 * @param action - Action to check (or '*' for any).
 * @returns `true` if the permission is granted.
 */
export function hasPermission(
  permissions: Permission[],
  resource: string,
  action: string,
): boolean {
  return permissions.some(
    (p) =>
      p.granted &&
      (p.resource === resource || p.resource === '*') &&
      (p.action === action || p.action === '*'),
  );
}

// ===========================================================================
// Section 6: Security Helpers
// ===========================================================================

/**
 * Generate a CSRF token and corresponding double-submit cookie value.
 * Both values are cryptographically random and different (the token sent
 * in the request body/header differs from the cookie value, satisfying the
 * double-submit cookie pattern).
 *
 * @returns Object containing the CSRF token and the cookie value to set.
 */
export function generateCsrfTokenPair(): CsrfTokenPair {
  return {
    token: generateRandomString(CSRF_TOKEN_LENGTH),
    cookieValue: generateRandomString(CSRF_TOKEN_LENGTH),
  };
}

/**
 * Validate a CSRF token using the double-submit cookie pattern. The `token`
 * parameter comes from the request (header/body) and `cookieValue` comes
 * from the CSRF cookie. They must have been issued as a pair (tracked server-
 * side); this client-side utility performs the equality check assuming the
 * server has bound them.
 *
 * For pure client-side usage, this validates that two independently-stored
 * values match (e.g., session-bound token vs. cookie).
 *
 * @param token - CSRF token from the request.
 * @param cookieValue - CSRF token from the cookie.
 * @param storedBinding - Server-side binding value (if available).
 * @returns `true` if the CSRF check passes.
 */
export function validateCsrfToken(
  token: string,
  cookieValue: string,
  storedBinding?: string,
): boolean {
  if (!token || !cookieValue) return false;
  if (token === cookieValue) return false; // Must be different values.

  // If there's a server-side binding, verify the token matches it.
  if (storedBinding && token !== storedBinding) return false;

  return true;
}

/**
 * Generate a cryptographically secure nonce for use in OIDC authorization
 * requests and ID token validation.
 *
 * @returns Random nonce string.
 */
export function generateNonce(): string {
  return generateRandomString(NONCE_LENGTH);
}

/**
 * Bind a PKCE code_verifier to the current session context (storage key).
 * This associates the verifier with a specific session/browser tab so it
 * can only be used by the same context that initiated the flow.
 *
 * @param codeVerifier - The PKCE code verifier.
 * @param sessionKey - Unique session identifier.
 */
export function bindPkceVerifierToSession(
  codeVerifier: string,
  sessionKey: string,
): void {
  try {
    sessionStorage.setItem(`pkce_${sessionKey}`, codeVerifier);
  } catch {
    // Session storage unavailable; caller must manage the verifier manually.
    console.warn('Cannot bind PKCE verifier to session: sessionStorage unavailable');
  }
}

/**
 * Retrieve a session-bound PKCE code verifier and remove it from storage
 * (single-use semantics to prevent replay).
 *
 * @param sessionKey - The session key used during binding.
 * @returns The code verifier, or `null` if not found.
 */
export function consumeBoundPkceVerifier(sessionKey: string): string | null {
  try {
    const verifier = sessionStorage.getItem(`pkce_${sessionKey}`);
    sessionStorage.removeItem(`pkce_${sessionKey}`);
    return verifier;
  } catch {
    return null;
  }
}

/**
 * Validate a redirect URI against a whitelist of allowed URIs. Supports exact
 * match, prefix match (for dynamic paths within a registered origin), and
 * pattern matching (simple wildcards).
 *
 * @param uri - The redirect URI to validate.
 * @param allowedUris - Whitelist of allowed URIs.
 * @returns Validation result with normalized URI if valid.
 */
export function validateRedirectUri(
  uri: string,
  allowedUris: string[],
): RedirectUriValidationResult {
  if (!uri) {
    return { valid: false, error: 'Redirect URI is empty' };
  }

  // Normalize: strip trailing slash, lowercase scheme/host.
  let normalized: string;
  try {
    const parsed = new URL(uri);
    // Remove trailing slash from path unless root.
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    normalized = `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return { valid: false, error: 'Invalid URI format' };
  }

  for (const allowed of allowedUris) {
    // Exact match.
    if (normalized === allowed) {
      return { valid: true, normalizedUri: normalized };
    }

    // Wildcard pattern support: "https://example.com/callback/*"
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -2); // Remove "/*"
      if (normalized.startsWith(prefix)) {
        return { valid: true, normalizedUri: normalized };
      }
    }

    // Origin-only match: allow any path under a registered origin.
    try {
      const allowedUrl = new URL(allowed);
      const normalizedUrl = new URL(normalized);
      if (
        allowedUrl.protocol === normalizedUrl.protocol &&
        allowedUrl.hostname === normalizedUrl.hostname &&
        allowedUrl.port === normalizedUrl.port &&
        allowedUrl.pathname === '/'
      ) {
        return { valid: true, normalizedUri: normalized };
      }
    } catch {
      continue;
    }
  }

  return {
    valid: false,
    error: `Redirect URI "${uri}" is not in the allowed whitelist`,
  };
}

/**
 * Prevent code_challenge reuse by tracking recently used challenges and
 * rejecting any reuse within a short time window. This mitigates authorization
 * code interception / injection attacks.
 *
 * @param codeChallenge - The code_challenge to check.
 * @param maxAgeMs - Maximum age for reuse prevention (default: 120 seconds).
 * @returns `true` if the code_challenge is acceptable (not reused).
 */
export function preventCodeChallengeReuse(
  codeChallenge: string,
  maxAgeMs: number = MAX_CODE_CHALLENGE_REUSE_AGE_MS,
): boolean {
  const now = Date.now();

  // Cleanup expired entries periodically.
  if (usedCodeChallenges.size > 1000) {
    for (const [challenge, ts] of usedCodeChallenges) {
      if (now - ts > maxAgeMs) {
        usedCodeChallenges.delete(challenge);
      }
    }
  }

  const lastUsed = usedCodeChallenges.get(codeChallenge);
  if (lastUsed !== undefined && now - lastUsed < maxAgeMs) {
    return false; // Rejected: reused too quickly.
  }

  usedCodeChallenges.set(codeChallenge, now);
  return true;
}

/**
 * Simple in-memory rate limiter for protecting auth endpoints from brute-force
 * attacks. Uses a fixed-window counter algorithm.
 *
 * @param key - Identifier to rate limit (e.g., IP + endpoint).
 * @param maxRequests - Maximum requests allowed in the window.
 * @param windowMs - Time window in milliseconds (default: 60000).
 * @returns Object indicating whether the request is allowed and remaining count.
 */
export function rateLimitAuthEndpoint(
  key: string,
  maxRequests: number = 10,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): { allowed: boolean; remaining: number; resetAt: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    // New window.
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
      retryAfterMs: 0,
    };
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterMs: bucket.resetAt - now,
    };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: maxRequests - bucket.count,
    resetAt: bucket.resetAt,
    retryAfterMs: 0,
  };
}

/**
 * Reset a rate limit bucket (e.g., after successful authentication to avoid
 * locking out legitimate users who had some failed attempts).
 *
 * @param key - The rate limit key to reset.
 */
export function resetRateLimit(key: string): void {
  rateLimitBuckets.delete(key);
}

// ===========================================================================
// Section 7: Provider Adapters
// ===========================================================================

/** Pre-built OAuth 2.0 / OIDC provider adapter configuration. */
export interface ProviderAdapter {
  /** Human-readable provider name. */
  name: string;
  /** Complete OAuth configuration for this provider. */
  getConfig: (params: {
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    scopes?: string[];
  }) => OAuthConfig;
  /** Default scopes for this provider. */
  defaultScopes: string[];
  /** The issuer base URL for OIDC discovery. */
  issuer: string;
  /** Whether this provider supports PKCE. */
  supportsPkce: boolean;
  /** Additional provider-specific metadata. */
  metadata: Record<string, string>;
}

/**
 * Google OAuth 2.0 / OIDC provider adapter.
 *
 * Supports authorization code flow with PKCE, standard Google scopes,
 * and OIDC discovery at `https://accounts.google.com`.
 */
export const GoogleAdapter: ProviderAdapter = {
  name: 'Google',
  issuer: 'https://accounts.google.com',
  defaultScopes: ['openid', 'email', 'profile'],
  supportsPkce: true,
  metadata: {
    auth_docs: 'https://developers.google.com/identity/protocols/oauth2',
    discovery_url: 'https://accounts.google.com/.well-known/openid-configuration',
  },

  getConfig: (params) => ({
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    redirectUri: params.redirectUri,
    scopes: params.scopes ?? GoogleAdapter.defaultScopes,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    pkce: true,
  }),
};

/**
 * GitHub OAuth adapter (OAuth 2.0, not full OIDC -- no ID token support
 * in the standard API; GitHub Apps beta provides OIDC).
 *
 * GitHub does not support PKCE natively in all flows but accepts it in
 * device flow and newer authorizations.
 */
export const GitHubAdapter: ProviderAdapter = {
  name: 'GitHub',
  issuer: 'https://github.com',
  defaultScopes: ['read:user', 'user:email'],
  supportsPkce: false, // GitHub has limited PKCE support.
  metadata: {
    auth_docs: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps',
    api_url: 'https://api.github.com',
  },

  getConfig: (params) => ({
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    redirectUri: params.redirectUri,
    scopes: params.scopes ?? GitHubAdapter.defaultScopes,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    pkce: false,
  }),
};

/**
 * Microsoft Azure Active Directory (Azure AD) / Entra ID OAuth 2.0 / OIDC
 * adapter. Supports multi-tenant and common endpoints.
 *
 * @param tenantId - The Azure AD tenant ID, or 'common' for multi-tenant,
 *                   or 'consumers' for personal accounts, or 'organizations'.
 * @returns A configured provider adapter for the specified tenant.
 */
export function createMicrosoftAdapter(tenantId: string = 'common'): ProviderAdapter {
  const baseUrl = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  return {
    name: 'Microsoft Azure AD',
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    defaultScopes: ['openid', 'profile', 'email', 'offline_access'],
    supportsPkce: true,
    metadata: {
      tenant_id: tenantId,
      auth_docs: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc',
      discovery_url: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
    },

    getConfig: (params) => ({
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      redirectUri: params.redirectUri,
      scopes: params.scopes ?? ['openid', 'profile', 'email', 'offline_access'],
      authorizationUrl: `${baseUrl}/authorize`,
      tokenUrl: `${baseUrl}/token`,
      userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
      pkce: true,
    }),
  };
}

/**
 * Create a generic OAuth 2.0 provider adapter from a discovery document or
 * explicit endpoint URLs. This allows runtime configuration for any
 * standards-compliant OAuth 2.0 / OIDC provider.
 *
 * @param options - Provider endpoint URLs and metadata.
 * @returns A configured generic provider adapter.
 */
export function createGenericProviderAdapter(options: {
  name: string;
  issuer: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  defaultScopes?: string[];
  supportsPkce?: boolean;
  metadata?: Record<string, string>;
}): ProviderAdapter {
  return {
    name: options.name,
    issuer: options.issuer,
    defaultScopes: options.defaultScopes ?? ['openid', 'profile', 'email'],
    supportsPkce: options.supportsPkce ?? true,
    metadata: options.metadata ?? {},

    getConfig: (params) => ({
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      redirectUri: params.redirectUri,
      scopes: params.scopes ?? options.defaultScopes ?? ['openid', 'profile', 'email'],
      authorizationUrl: options.authorizationUrl,
      tokenUrl: options.tokenUrl,
      userInfoUrl: options.userInfoUrl,
      pkce: options.supportsPkce ?? true,
    }),
  };
}

/**
 * Auto-configure a provider adapter from an OIDC discovery document.
 * Fetches the discovery document and builds a generic adapter from it.
 *
 * @param issuerBaseUrl - The issuer's base URL.
 * @param name - Optional display name for the provider.
 * @returns Promise resolving to a fully-configured provider adapter.
 */
export async function autoConfigureProviderFromDiscovery(
  issuerBaseUrl: string,
  name?: string,
): Promise<ProviderAdapter> {
  const discovery = await fetchDiscoveryDocument(issuerBaseUrl);

  return createGenericProviderAdapter({
    name: name ?? new URL(discovery.issuer).hostname,
    issuer: discovery.issuer,
    authorizationUrl: discovery.authorization_endpoint,
    tokenUrl: discovery.token_endpoint,
    userInfoUrl: discovery.userinfo_endpoint,
    defaultScopes: discovery.scopes_supported?.filter((s) =>
      !s.includes('offline') && !s.includes('web-origins'),
    ) ?? ['openid', 'profile', 'email'],
    supportsPkce: discovery.code_challenge_methods_supported?.includes('S256') ?? true,
    metadata: {
      discovery_fetched_at: new Date().toISOString(),
      end_session_endpoint: discovery.end_session_endpoint ?? '',
      check_session_iframe: discovery.check_session_iframe ?? '',
    },
  });
}

// ===========================================================================
// Internal Utility Functions
// ===========================================================================

/**
 * Encode a byte array as a base64url string (no padding).
 */
function base64UrlEncode(bytes: Uint8Array | ArrayBuffer): string {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of uint8) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a base64url string to a UTF-8 string.
 */
function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const paddedWithEq = padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '=');
  const binary = atob(paddedWithEq);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Convert a base64url-encoded string to a Uint8Array.
 */
function base64UrlToUint8Array(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const paddedWithEq = padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '=');
  const binary = atob(paddedWithEq);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verify a JWT signature for a specific JWK key using the Web Crypto API.
 */
async function verifySignatureForKey(
  signingInput: string,
  signature: Uint8Array,
  key: JwkKey,
  alg: string,
): Promise<boolean> {
  const algorithm = alg.toUpperCase();

  // RSA algorithms (RS256, RS384, RS512).
  if (algorithm.startsWith('RS')) {
    const hash = `SHA-${algorithm.slice(-3)}`;
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'RSASSA-PKCS1-v1_5', hash },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      cryptoKey,
      signature,
      new TextEncoder().encode(signingInput),
    );
  }

  // ECDSA algorithms (ES256, ES384, ES512).
  if (algorithm.startsWith('ES')) {
    const namedCurve = algorithm === 'ES256' ? 'P-256' : algorithm === 'ES384' ? 'P-384' : 'P-521';
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'ECDSA', namedCurve },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      { name: 'ECDSA', namedCurve },
      cryptoKey,
      signature,
      new TextEncoder().encode(signingInput),
    );
  }

  // HMAC algorithms (HS256, HS384, HS512).
  if (algorithm.startsWith('HS')) {
    // For HMAC, we need the symmetric key material, which isn't typically
    // in a public JWKS. This path is provided for completeness when the
    // JWK contains a shared secret (e.g., `k` field for oct keys).
    if (!key.k) {
      return false;
    }
    const hash = `SHA-${algorithm.slice(-3)}`;
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'HMAC', hash },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signature,
      new TextEncoder().encode(signingInput),
    );
  }

  throw new Error(`Unsupported signature algorithm: ${alg}`);
}

/**
 * Get or lazily create the AES-GCM encryption key used for token encryption
 * at rest. Derives a key from a stable source or generates a fresh one.
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  if (encryptionKey) return encryptionKey;

  // Attempt to derive a persistent key from a browser-specific source.
  // We use a combination of hostname + a stored salt to produce a key that
  // persists across page reloads but is origin-specific.
  let rawKeyMaterial: Uint8Array;
  let salt: Uint8Array;

  try {
    const storedSalt = localStorage.getItem('oauth_enc_salt');
    if (storedSalt) {
      salt = base64UrlToUint8Array(storedSalt);
    } else {
      salt = crypto.getRandomValues(new Uint8Array(16));
      localStorage.setItem('oauth_enc_salt', base64UrlEncode(salt));
    }

    // Use the origin as key material input (stable within an origin).
    rawKeyMaterial = new TextEncoder().encode(window.location.origin);
  } catch {
    // Fallback: generate a random key (won't survive reload, but still encrypts).
    rawKeyMaterial = crypto.getRandomValues(new Uint8Array(32));
    salt = new Uint8Array(16);
  }

  // Import the raw key material as a PBKDF2 key.
  const baseKey = await crypto.subtle.importKey(
    'raw',
    rawKeyMaterial,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );

  // Derive an AES-GCM key using PBKDF2.
  encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  return encryptionKey;
}

/**
 * Read a cookie value by name.
 */
function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(^| )' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Normalize a claim value that may be a string, array of strings, or other type
 * into a flat string array.
 */
function normalizeClaimArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
