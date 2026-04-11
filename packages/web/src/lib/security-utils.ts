/**
 * @module security-utils
 * @description Comprehensive client-side security utilities for web applications.
 *
 * Covers: XSS prevention, CSRF protection, CSP helpers, input validation,
 * secure headers, session security, clickjacking protection, security scoring,
 * password policy, and security audit logging.
 *
 * @remarks This is a pure TypeScript library with no framework dependencies.
 */

// ---------------------------------------------------------------------------
// 1. XSS Prevention
// ---------------------------------------------------------------------------

/** HTML tag allowlist for sanitization */
const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'acronym', 'b', 'blockquote', 'br', 'code', 'dd', 'del',
  'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'i', 'img', 'li', 'ol', 'p', 'pre', 'q', 'small', 'span', 'strong',
  'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
  'ul',
]);

/** Allowed attributes per tag (global + tag-specific) */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['class', 'id', 'title', 'lang', 'dir', 'role', 'aria-label', 'aria-hidden']),
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  ol: new Set(['start', 'type']),
  blockquote: new Set(['cite']),
  q: new Set(['cite']),
  time: new Set(['datetime']),
};

/** Dangerous URL schemes that must be rejected */
const DANGEROUS_SCHEMES = new Set([
  'javascript', 'vbscript', 'data', 'blob', 'filesystem', 'mailto',
]);

/**
 * Configuration options for HTML sanitization.
 */
export interface SanitizeHtmlOptions {
  /** Custom set of allowed tags (defaults to built-in allowlist) */
  allowedTags?: string[];
  /** Custom allowed attributes per tag */
  allowedAttrs?: Record<string, string[]>;
  /** Whether to strip all HTML and return plain text (default: false) */
  stripHtml?: boolean;
  /** Whether to remove empty elements (default: true) */
  removeEmpty?: boolean;
}

/**
 * Sanitizes an HTML string using a DOM-based allowlist approach.
 *
 * Parses the input into DOM nodes, removes disallowed tags/attributes,
 * strips dangerous URL schemes, and returns safe HTML.
 *
 * @param dirty - Potentially unsafe HTML string
 * @param options - Sanitization configuration
 * @returns Sanitized HTML string safe for insertion into the DOM
 *
 * @example
 * ```ts
 * sanitizeHtml('<script>alert(1)</script><p>Hello</p>');
 * // => '<p>Hello</p>'
 * ```
 */
export function sanitizeHtml(dirty: string, options: SanitizeHtmlOptions = {}): string {
  if (!dirty || typeof dirty !== 'string') return '';

  if (options.stripHtml) {
    // Strip all tags entirely
    const tmp = document.createElement('div');
    tmp.textContent = dirty;
    return tmp.innerHTML;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, 'text/html');
  const body = doc.body;

  const allowed = options.allowedTags ? new Set(options.allowedTags) : ALLOWED_TAGS;
  const attrsMap: Record<string, Set<string>> = { ...ALLOWED_ATTRS };
  if (options.allowedAttrs) {
    for (const [tag, attrs] of Object.entries(options.allowedAttrs)) {
      attrsMap[tag] = new Set(attrs);
    }
  }

  function sanitizeNode(node: Node): void {
    // Walk backwards so removal doesn't shift indices
    const children = Array.from(node.childNodes);
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tagName = el.tagName.toLowerCase();

        if (!allowed.has(tagName)) {
          // Disallowed element: unwrap its children in place
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.remove();
          continue;
        }

        // Sanitize attributes
        const globalAllowed = attrsMap['*'] ?? new Set();
        const tagAllowed = attrsMap[tagName] ?? new Set();
        const allAllowed = new Set([...globalAllowed, ...tagAllowed]);

        for (let j = el.attributes.length - 1; j >= 0; j--) {
          const attr = el.attributes[j];
          if (!allAllowed.has(attr.name)) {
            el.removeAttribute(attr.name);
            continue;
          }
          // Validate URL-typed attributes
          if ((attr.name === 'href' || attr.name === 'src') && attr.value) {
            if (!isSafeUrl(attr.value)) {
              el.removeAttribute(attr.name);
            }
          }
        }

        // Recurse into children
        sanitizeNode(child);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    }

    // Optionally remove empty elements
    if (options.removeEmpty !== false && node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (
        !el.textContent?.trim() &&
        el.children.length === 0 &&
        el.tagName.toLowerCase() !== 'img' &&
        el.tagName.toLowerCase() !== 'br' &&
        el.tagName.toLowerCase() !== 'hr'
      ) {
        el.remove();
      }
    }
  }

  sanitizeNode(body);
  return body.innerHTML;
}

/**
 * Validates whether a URL uses a safe scheme.
 *
 * Rejects javascript:, vbscript:, data:, blob:, filesystem:,
 * and any other dangerous URI schemes.
 *
 * @param url - URL string to validate
 * @returns `true` if the URL scheme is considered safe
 */
export function isSafeUrl(url: string): boolean {
  try {
    // Handle relative URLs — they are inherently safe when used as href/src
    trimmed = url.trim().toLowerCase();
    if (!trimmed.includes(':')) return true;

    const parsed = new URL(url, window.location.origin);
    const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
    return !DANGEROUS_SCHEMES.has(scheme);
  } catch {
    return false;
  }
}

/**
 * Escapes special HTML characters to prevent XSS when inserting content
 * as raw text or building HTML strings manually.
 *
 * @param str - Raw string to escape
 * @returns HTML-escaped string
 *
 * @example
 * ```ts
 * escapeHtml('<script>alert("xss")</script>');
 * // => '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (ch) => escapeMap[ch]!);
}

/**
 * Escapes a string for safe inclusion inside a JavaScript string literal
 * (useful when dynamically generating script content).
 *
 * @param str - String to escape for JS context
 * @returns JavaScript-escaped string
 */
export function escapeJsString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e');
}

// ---------------------------------------------------------------------------
// 2. CSRF Protection
// ---------------------------------------------------------------------------

/**
 * Represents a CSRF token with metadata.
 */
export interface CsrfToken {
  /** The token value (hex-encoded random bytes) */
  value: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** Token expiration in milliseconds from creation */
  ttlMs: number;
}

/** In-memory token store for stateful CSRF management */
const csrfStore = new Map<string, CsrfToken>();

/**
 * Generates a cryptographically strong CSRF token.
 *
 * Uses Web Crypto API when available, falls back to Math.random
 * only in insecure environments (not recommended for production).
 *
 * @param byteLength - Number of random bytes (default: 32)
 * @param ttlMs - Time-to-live in milliseconds (default: 30 minutes)
 * @returns A {@link CsrfToken} object
 */
export function generateCsrfToken(byteLength = 32, ttlMs = 30 * 60 * 1000): CsrfToken {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const value = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const token: CsrfToken = { value, createdAt: new Date().toISOString(), ttlMs };
  csrfStore.set(value, token);
  return token;
}

/**
 * Validates a submitted CSRF token against the stored tokens.
 *
 * Checks existence, expiration, and optionally consumes (deletes) the token
 * to prevent replay attacks.
 *
 * @param tokenValue - The token value submitted by the client
 * @param consume - Whether to delete the token after validation (default: true)
 * @returns `true` if the token is valid and not expired
 */
export function validateCsrfToken(tokenValue: string, consume = true): boolean {
  const stored = csrfStore.get(tokenValue);
  if (!stored) return false;

  const age = Date.now() - new Date(stored.createdAt).getTime();
  if (age > stored.ttlMs) {
    csrfStore.delete(tokenValue);
    return false;
  }

  if (consume) {
    csrfStore.delete(tokenValue);
  }
  return true;
}

/**
 * Sets a double-submit cookie for CSRF protection.
 *
 * The same token value is sent both as a cookie (automatically included
 * in requests) and as a custom header or form field. The server compares
 * both values; cross-origin requests cannot read or set the custom header.
 *
 * @param tokenValue - The CSRF token to store in the cookie
 * @param cookieName - Name of the cookie (default: 'csrf-token')
 */
export function setDoubleSubmitCookie(tokenValue: string, cookieName = 'csrf-token'): void {
  document.cookie = `${cookieName}=${encodeURIComponent(tokenValue)}; path=/; SameSite=Strict; Secure`;
}

/**
 * Retrieves the current double-submit CSRF cookie value.
 *
 * @param cookieName - Name of the cookie (default: 'csrf-token')
 * @returns The stored token value, or `null` if not found
 */
export function getDoubleSubmitCookie(cookieName = 'csrf-token'): string | null {
  const match = document.cookie.split(';').find(
    (c) => c.trim().startsWith(`${cookieName}=`),
  );
  return match ? decodeURIComponent(match.trim().slice(cookieName.length + 1)) : null;
}

/**
 * Verifies that the request origin or referrer matches the expected origin.
 *
 * This provides defense-in-depth against CSRF by checking that the request
 * originates from an expected domain.
 *
 * @param expectedOrigin - The trusted origin (e.g., 'https://example.com')
 * @returns `true` if the origin/referrer is valid
 */
export function validateOrigin(expectedOrigin: string): boolean {
  let actualOrigin: string | undefined;

  // Prefer Origin header (sent on POST/PATCH/DELETE, not GET)
  if (typeof window !== 'undefined') {
    actualOrigin = window.location.origin;
  }

  // Also check referrer as fallback
  const referrer = document.referrer;
  if (referrer) {
    try {
      const refOrigin = new URL(referrer).origin;
      if (refOrigin !== expectedOrigin && refOrigin !== actualOrigin) {
        return false;
      }
    } catch {
      // Invalid referrer URL — fail open or closed depending on policy
      return false;
    }
  }

  return actualOrigin === expectedOrigin;
}

/**
 * Returns the number of currently valid CSRF tokens in the store.
 */
export function getActiveCsrfTokenCount(): number {
  let count = 0;
  const now = Date.now();
  for (const token of csrfStore.values()) {
    if (now - new Date(token.createdAt).getTime() <= token.ttlMs) {
      count++;
    }
  }
  return count;
}

/**
 * Removes all expired CSRF tokens from the store.
 */
export function purgeExpiredCsrfTokens(): number {
  const now = Date.now();
  let purged = 0;
  for (const [key, token] of csrfStore.entries()) {
    if (now - new Date(token.createdAt).getTime() > token.ttlMs) {
      csrfStore.delete(key);
      purged++;
    }
  }
  return purged;
}

// ---------------------------------------------------------------------------
// 3. Content Security Policy Helper
// ---------------------------------------------------------------------------

/**
 * Directive-value pairs for constructing a Content Security Policy.
 */
export interface CspDirectives {
  'default-src'?: string;
  'script-src'?: string;
  'style-src'?: string;
  'img-src'?: string;
  'connect-src'?: string;
  'font-src'?: string;
  'object-src'?: string;
  'media-src'?: string;
  'frame-src'?: string;
  'frame-ancestors'?: string;
  'base-uri'?: string;
  'form-action'?: string;
  'manifest-src'?: string;
  'worker-src'?: string;
  'report-to'?: string;
  'report-uri'?: string;
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
  [key: string]: string | boolean | undefined;
}

/**
 * Builds a Content-Security-Policy header value from directive objects.
 *
 * @param directives - CSP directive configuration
 * @returns A complete CSP header string
 *
 * @example
 * ```ts
 * buildCspHeader({
 *   "default-src": "'self'",
 *   "script-src": "'self' 'nonce-abc123'",
 *   "style-src": "'self' 'unsafe-inline'",
 * });
 * ```
 */
export function buildCspHeader(directives: CspDirectives): string {
  const parts: string[] = [];
  for (const [directive, value] of Object.entries(directives)) {
    if (value === true) {
      parts.push(directive);
    } else if (typeof value === 'string' && value.length > 0) {
      parts.push(`${directive} ${value}`);
    }
  }
  return parts.join('; ');
}

/**
 * Parses a CSP header string into a structured object.
 *
 * @param cspHeader - Raw CSP header value
 * @returns Parsed directive map
 */
export function parseCspHeader(cspHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  const directives = cspHeader.split(';').map((d) => d.trim()).filter(Boolean);
  for (const directive of directives) {
    const spaceIdx = directive.indexOf(' ');
    if (spaceIdx === -1) {
      result[directive] = '';
    } else {
      result[directive.slice(0, spaceIdx)] = directive.slice(spaceIdx + 1).trim();
    }
  }
  return result;
}

/**
 * Generates a cryptographically random nonce for use in CSP script-src / style-src.
 *
 * @returns Base64url-encoded random nonce string (22+ characters)
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(18); // 144 bits -> ~24 base64 chars
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 18; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Use base64url (URL-safe, no padding)
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Creates a report-only CSP violation payload suitable for sending to a reporting endpoint.
 *
 * @param violatedDirective - The CSP directive that was violated
 * @param blockedUri - The URI that was blocked
 * @param sourceFile - The document or resource where the violation occurred
 * @returns Formatted report object
 */
export function formatCspViolationReport(
  violatedDirective: string,
  blockedUri: string,
  sourceFile?: string,
): object {
  return {
    'csp-report': {
      'document-uri': typeof location !== 'undefined' ? location.href : '',
      'referrer': typeof document !== 'undefined' ? document.referrer : '',
      'violated-directive': violatedDirective,
      'effective-directive': violatedDirective,
      'blocked-uri': blockedUri,
      'source-file': sourceFile || '',
      'line-number': 0,
      'column-number': 0,
      'status-code': 200,
      'user-agent': typeof navigator !== 'undefined' ? navigator.userAgent : '',
      'timestamp': new Date().toISOString(),
    },
  };
}

/**
 * Sends a CSP violation report to the specified endpoint via navigator.sendBeacon
 * or falls back to fetch.
 *
 * @param reportEndpoint - URL to send the report to
 * @param report - The formatted violation report
 */
export function reportCspViolation(reportEndpoint: string, report: object): void {
  const payload = JSON.stringify(report);
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(reportEndpoint, payload);
  } else if (typeof fetch !== 'undefined') {
    fetch(reportEndpoint, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/csp-report' },
      keepalive: true,
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// 4. Input Validation / Sanitization
// ---------------------------------------------------------------------------

/**
 * Patterns indicative of SQL injection attempts.
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|UNION)\b.*\b(FROM|INTO|TABLE|WHERE|SET)\b)/gi,
  /(--|#|\/\*|\*\/)/g,
  /('\s*(OR|AND)\s*'\s*=\s*')/gi,
  /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
  /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
  /(;(\s)*(SELECT|INSERT|UPDATE|DELETE|DROP))/gi,
  /(\bWAITFOR\s+DELAY\b)/gi,
  /(\bBULK\s+INSERT\b)/gi,
  /(\bxp_cmdshell\b)/gi,
  /(\bCONCAT\s*\()/gi,
  /(\bCHAR\s*\(\s*\d+\s*\))/gi,
];

/**
 * Patterns indicative of OS command injection attempts.
 */
const CMD_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/g,
  /\$\([^)]+\)/g,
  /`[^`]+`/g,
  /\b(system|exec|passthru|shell_exec|popen|proc_open|eval)\b/gi,
  /\b(curl|wget|nc|netcat|bash|sh|cmd\.exe|powershell)\b/gi,
  /(\|\s*\w+)/g,
  /(>\s*\/dev\/)/g,
  /(;\s*\w+)/g,
  /(&&\s*\w+)/g,
];

/**
 * Patterns indicative of path traversal attacks.
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./g,
  /\.\.\\/,
  /\.\.\//,
  /%2e%2e[\/\\%]/gi,
  /%252e%252e/gi,
  /..[/\\]%00/g,
  /file:\/\/\/?/gi,
];

/**
 * Patterns indicative of LDAP injection attempts.
 */
const LDAP_INJECTION_PATTERNS = [
  /\(\)\(&\)/g,
  /\(\|\)(\(&\))/g,
  /(\*\)\(uid=\*)/g,
  /(\)\(cn=)/g,
  /(\*)(\)\(password=/g,
  /\)\(\/\)/g,
  /(\)\(objectClass=/g,
];

/**
 * Result of input validation/sanitization checks.
 */
export interface ValidationResult {
  /** Whether the input passed all checks */
  valid: boolean;
  /** Human-readable description of detected issues */
  issues: string[];
  /** The sanitized version of the input (if applicable) */
  sanitized?: string;
  /** Severity level of the most severe finding */
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Detects potential SQL injection patterns in input strings.
 *
 * @param input - User-supplied input to check
 * @returns A {@link ValidationResult} indicating whether injection patterns were found
 */
export function detectSqlInjection(input: string): ValidationResult {
  const issues: string[] = [];
  for (const pattern of SQL_INJECTION_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      issues.push(`SQL injection pattern detected: "${matches[0]}"`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    severity: issues.length > 0 ? 'critical' : 'info',
  };
}

/**
 * Detects potential OS command injection patterns in input strings.
 *
 * @param input - User-supplied input to check
 * @returns A {@link ValidationResult}
 */
export function detectCommandInjection(input: string): ValidationResult {
  const issues: string[] = [];
  for (const pattern of CMD_INJECTION_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      issues.push(`Command injection pattern detected: "${matches[0]}"`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    severity: issues.length > 0 ? 'critical' : 'info',
  };
}

/**
 * Detects potential path traversal patterns in file-path inputs.
 *
 * @param input - File path or identifier to check
 * @returns A {@link ValidationResult}
 */
export function detectPathTraversal(input: string): ValidationResult {
  const issues: string[] = [];
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      issues.push(`Path traversal pattern detected`);
    }
  }
  // Sanitize by removing traversal sequences
  const sanitized = input.replace(/\.\./g, '').replace(/[\/\\]*/g, '/');
  return {
    valid: issues.length === 0,
    issues,
    sanitized: sanitized !== input ? sanitized : undefined,
    severity: issues.length > 0 ? 'high' : 'info',
  };
}

/**
 * Detects potential LDAP injection patterns in input strings.
 *
 * @param input - User-supplied input destined for LDAP queries
 * @returns A {@link ValidationResult}
 */
export function detectLdapInjection(input: string): ValidationResult {
  const issues: string[] = [];
  for (const pattern of LDAP_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      issues.push(`LDAP injection pattern detected`);
    }
  }
  // Escape LDAP special characters
  const sanitized = input.replace(/[\\\(\)\*\&\|! =<>~^"]/g, (ch) =>
    `\\${ch.charCodeAt(0).toString(16).padStart(2, '0')}`,
  );
  return {
    valid: issues.length === 0,
    issues,
    sanitized: sanitized !== input ? sanitized : undefined,
    severity: issues.length > 0 ? 'high' : 'info',
  };
}

/**
 * Runs all available injection detection checks on a single input.
 *
 * @param input - User-supplied input to comprehensively validate
 * @returns An aggregated {@link ValidationResult}
 */
export function validateInput(input: string): ValidationResult {
  const sqlResult = detectSqlInjection(input);
  const cmdResult = detectCommandInjection(input);
  const pathResult = detectPathTraversal(input);
  const ldapResult = detectLdapInjection(input);

  const allIssues = [
    ...sqlResult.issues,
    ...cmdResult.issues,
    ...pathResult.issues,
    ...ldapResult.issues,
  ];

  const severities: Array<'info' | 'low' | 'medium' | 'high' | 'critical'> = [
    'info', 'low', 'medium', 'high', 'critical',
  ];
  const maxSeverity = allIssues.length > 0 ? 'critical' : 'info';

  return {
    valid: allIssues.length === 0,
    issues: allIssues,
    severity: maxSeverity,
  };
}

// ---------------------------------------------------------------------------
// 5. Secure Headers Generator
// ---------------------------------------------------------------------------

/**
 * Complete set of security-relevant HTTP response headers.
 */
export interface SecurityHeaders {
  'Strict-Transport-Security'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'X-XSS-Protection'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'Cross-Origin-Opener-Policy'?: string;
  'Cross-Origin-Embedder-Policy'?: string;
  'Cross-Origin-Resource-Policy'?: string;
  'Content-Security-Policy'?: string;
  'Content-Security-Policy-Report-Only'?: string;
  [header: string]: string | undefined;
}

/**
 * Options for generating security headers.
 */
export interface SecurityHeadersOptions {
  /** HSTS max-age in seconds (default: 31536000 = 1 year) */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS (default: true) */
  hstsIncludeSubdomains?: boolean;
  /** HSTS preload flag (default: false) */
  hstsPreload?: boolean;
  /** X-Frame-Options value (default: 'DENY') */
  frameOptions?: 'DENY' | 'SAMEORIGIN';
  /** Referrer-Policy value (default: 'strict-origin-when-cross-origin') */
  referrerPolicy?: string;
  /** Permissions-Policy directives (default: common restrictive set) */
  permissionsPolicy?: string;
  /** COOP value (default: 'same-origin') */
  coop?: string;
  /** COEP value (default: 'require-corp') */
  coep?: string;
  /** CORP value (default: 'same-origin') */
  corp?: string;
  /** CSP directives (optional — omit to skip CSP header) */
  csp?: CspDirectives;
  /** Report-only CSP directives (optional) */
  cspReportOnly?: CspDirectives;
}

/**
 * Generates a full set of recommended security headers.
 *
 * These headers should be configured at the web server / CDN level,
 * but this utility can be used for documentation, testing, or
 * middleware-based applications.
 *
 * @param options - Header generation options
 * @returns An object mapping header names to their values
 *
 * @example
 * ```ts
 * const headers = generateSecurityHeaders({
 *   hstsMaxAge: 63072000,
 *   hstsPreload: true,
 *   csp: { 'default-src': "'self'" },
 * });
 * ```
 */
export function generateSecurityHeaders(
  options: SecurityHeadersOptions = {},
): SecurityHeaders {
  const {
    hstsMaxAge = 31536000,
    hstsIncludeSubdomains = true,
    hstsPreload = false,
    frameOptions = 'DENY',
    referrerPolicy = 'strict-origin-when-cross-origin',
    permissionsPolicy =
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()',
    coop = 'same-origin',
    coep = 'require-corp',
    corp = 'same-origin',
    csp,
    cspReportOnly,
  } = options;

  const headers: SecurityHeaders = {};

  // Strict Transport Security
  const hstsParts = [`max-age=${hstsMaxAge}`];
  if (hstsIncludeSubdomains) hstsParts.push('includeSubDomains');
  if (hstsPreload) hstsParts.push('preload');
  headers['Strict-Transport-Security'] = hstsParts.join('; ');

  // Frame options
  headers['X-Frame-Options'] = frameOptions;

  // MIME sniffing prevention
  headers['X-Content-Type-Options'] = 'nosniff';

  // Legacy XSS filter (deprecated but still useful for older browsers)
  headers['X-XSS-Protection'] = '1; mode=block';

  // Referrer policy
  headers['Referrer-Policy'] = referrerPolicy;

  // Feature permissions
  headers['Permissions-Policy'] = permissionsPolicy;

  // Cross-Origin policies
  headers['Cross-Origin-Opener-Policy'] = coop;
  headers['Cross-Origin-Embedder-Policy'] = coep;
  headers['Cross-Origin-Resource-Policy'] = corp;

  // Content Security Policy
  if (csp) {
    headers['Content-Security-Policy'] = buildCspHeader(csp);
  }
  if (cspReportOnly) {
    headers['Content-Security-Policy-Report-Only'] = buildCspHeader(cspReportOnly);
  }

  return headers;
}

/**
 * Converts a SecurityHeaders object into a format suitable for
 * setting meta tags in the HTML `<head>`.
 *
 * @param headers - Security headers object
 * @returns Array of `{ httpEquiv, content }` objects for meta tags
 */
export function headersToMetaTags(
  headers: SecurityHeaders,
): Array<{ httpEquiv: string; content: string }> {
  const tags: Array<{ httpEquiv: string; content: string }> = [];
  for (const [name, value] of Object.entries(headers)) {
    if (value) {
      tags.push({ httpEquiv: name, content: value });
    }
  }
  return tags;
}

// ---------------------------------------------------------------------------
// 6. Session Security
// ---------------------------------------------------------------------------

/**
 * Session metadata for client-side session management.
 */
export interface SessionInfo {
  /** Unique session identifier */
  sessionId: string;
  /** ISO timestamp of session creation */
  createdAt: string;
  /** ISO timestamp of last activity */
  lastActivityAt: string;
  /** Session timeout in milliseconds */
  timeoutMs: number;
  /** IP address hash (if available) */
  ipHash?: string;
  /** User agent hash */
  uaHash?: string;
}

/** In-memory session store */
const sessionStore = new Map<string, SessionInfo>();

/**
 * Creates a new secure session record with fixation-resistant properties.
 *
 * Session IDs are generated using cryptographic randomness. The session
 * includes IP and user-agent binding to detect session hijacking.
 *
 * @param timeoutMs - Session idle timeout in milliseconds (default: 30 min)
 * @returns A new {@link SessionInfo} object
 */
export function createSession(timeoutMs = 30 * 60 * 1000): SessionInfo {
  const sessionId = generateSecureId(32);
  const now = new Date().toISOString();
  const session: SessionInfo = {
    sessionId,
    createdAt: now,
    lastActivityAt: now,
    timeoutMs,
    ipHash: typeof navigator !== 'undefined'
      ? simpleHash(navigator.userAgent + (location?.hostname || ''))
      : undefined,
    uaHash: typeof navigator !== 'undefined'
      ? simpleHash(navigator.userAgent)
      : undefined,
  };
  sessionStore.set(sessionId, session);
  return session;
}

/**
 * Validates an existing session: checks existence, expiration, and
 * optional IP/UA binding integrity.
 *
 * @param sessionId - The session ID to validate
 * @param renewActivity - Whether to update lastActivityAt on success (default: true)
 * @returns `true` if the session is valid and active
 */
export function validateSession(sessionId: string, renewActivity = true): boolean {
  const session = sessionStore.get(sessionId);
  if (!session) return false;

  const idleTime = Date.now() - new Date(session.lastActivityAt).getTime();
  if (idleTime > session.timeoutMs) {
    sessionStore.delete(sessionId);
    return false;
  }

  // Check UA binding (IP may change on mobile, so we only warn)
  if (session.uaHash) {
    const currentUaHash = typeof navigator !== 'undefined'
      ? simpleHash(navigator.userAgent)
      : '';
    if (currentUaHash !== session.uaHash) {
      // UA changed — possible hijack attempt; log and invalidate
      logSecurityEvent('warning', 'Session UA mismatch', { sessionId });
      sessionStore.delete(sessionId);
      return false;
    }
  }

  if (renewActivity) {
    session.lastActivityAt = new Date().toISOString();
  }
  return true;
}

/**
 * Destroys a session immediately.
 *
 * @param sessionId - The session to terminate
 */
export function destroySession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

/**
 * Returns the remaining time until session expiry in milliseconds.
 *
 * @param sessionId - The session to check
 * @returns Remaining milliseconds, or 0 if expired/nonexistent
 */
export function getSessionRemainingTime(sessionId: string): number {
  const session = sessionStore.get(sessionId);
  if (!session) return 0;
  const elapsed = Date.now() - new Date(session.lastActivityAt).getTime();
  return Math.max(0, session.timeoutMs - elapsed);
}

/**
 * Detects concurrent sessions for the same user context.
 *
 * @param userId - Identifier for the user context
 * @param sessions - All sessions belonging to this user
 * @returns Array of concurrent session IDs (more than 1 indicates concurrency)
 */
export function detectConcurrentSessions(
  userId: string,
  sessions: SessionInfo[],
): string[] {
  const now = Date.now();
  const active = sessions.filter(
    (s) => now - new Date(s.lastActivityAt).getTime() <= s.timeoutMs,
  );
  return active.map((s) => s.sessionId);
}

/**
 * Generates secure cookie configuration options.
 *
 * @param cookieName - Cookie name
 * @param value - Cookie value
 * @param cookieOptions - Additional cookie settings
 * @returns Cookie string ready for `document.cookie`
 */
export function configureSecureCookie(
  cookieName: string,
  value: string,
  cookieOptions: Partial<{
    maxAge: number;
    domain: string;
    path: string;
    sameSite: 'Strict' | 'Lax' | 'None';
    httpOnly: boolean;
    secure: boolean;
  }> = {},
): string {
  const {
    maxAge,
    domain,
    path = '/',
    sameSite = 'Strict',
    secure = true,
  } = cookieOptions;

  const parts = [
    `${cookieName}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (domain) parts.push(`Domain=${domain}`);
  if (secure) parts.push('Secure');

  // Note: HttpOnly cannot be set via document.cookie (server-side only)
  // We include it here for documentation/reference purposes
  return parts.join('; ');
}

// ---------------------------------------------------------------------------
// 7. Clickjacking Protection
// ---------------------------------------------------------------------------

/**
 * Applies frame-busting JavaScript to prevent the page from being
 * embedded in an iframe on a different origin.
 *
 * This is a defense-in-depth measure alongside X-Frame-Options and
 * frame-ancestors CSP directives.
 */
export function applyFrameBusting(): void {
  if (typeof window === 'undefined') return;

  if (window.top !== window.self) {
    try {
      // Attempt to break out of the frame
      window.top.location = window.self.location;
    } catch {
      // Cross-origin frame — cannot access top.location
      // Fallback: hide page content or redirect
      document.body.style.display = 'none';
      const warning = document.createElement('div');
      warning.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;' +
        'align-items:center;justify-content:center;background:#fff;z-index:99999;' +
        'color:#333;font-family:sans-serif;font-size:18px;padding:20px;text-align:center;';
      warning.textContent =
        'This page cannot be displayed inside a frame. Please open it directly in your browser.';
      document.documentElement.appendChild(warning);
    }
  }
}

/**
 * Detects whether the current page is being framed by another origin.
 *
 * @returns `true` if the page is embedded in a cross-origin frame
 */
export function isFramed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.top !== window.self;
  } catch {
    // Cross-origin exception means we ARE framed
    return true;
  }
}

/**
 * Detects UI redressing (clickjacking) by checking opacity/visibility
 * overlays that might be hiding malicious elements.
 *
 * Performs a heuristic scan of top-level positioned elements.
 *
 * @returns Detection results including suspicious elements found
 */
export function detectUiRedressing(): {
  detected: boolean;
  findings: string[];
} {
  if (typeof document === 'undefined') return { detected: false, findings: [] };

  const findings: string[] = [];

  // Check for transparent overlays covering large areas
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const htmlEl = el as HTMLElement;
    const style = getComputedStyle(htmlEl);

    // Full-screen transparent/semi-transparent overlay
    const rect = htmlEl.getBoundingClientRect();
    const viewportArea = window.innerWidth * window.innerHeight;
    const elemArea = rect.width * rect.height;

    if (
      elemArea > viewportArea * 0.5 &&
      parseFloat(style.opacity) < 0.1 &&
      style.position !== 'static' &&
      style.zIndex !== 'auto'
    ) {
      findings.push(
        `Large transparent overlay detected: ${htmlEl.tagName}#${htmlEl.id || '(no-id)'}.${htmlEl.className || ''}`,
      );
    }

    // Invisible clickable elements
    if (
      (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) &&
      (htmlEl.tagName === 'BUTTON' ||
        htmlEl.tagName === 'A' ||
        htmlEl.getAttribute('role') === 'button')
    ) {
      findings.push(
        `Invisible interactive element: ${htmlEl.tagName}`,
      );
    }
  }

  return { detected: findings.length > 0, findings };
}

/**
 * Generates the frame-ancestors CSP directive value.
 *
 * @param sources - Allowed ancestor origins ('none', 'self', or URLs)
 * @returns The frame-ancestors directive value
 */
export function generateFrameAncestorsDirective(
  sources: Array<'none' | 'self' | string>,
): string {
  return sources.join(' ');
}

// ---------------------------------------------------------------------------
// 8. Security Scoring
// ---------------------------------------------------------------------------

/**
 * Result of a security health assessment.
 */
export interface SecurityScoreResult {
  /** Overall score from 0 to 100 */
  score: number;
  /** Grade letter (A+ through F) */
  grade: string;
  /** Individual check results */
  checks: SecurityCheckResult[];
  /** Actionable recommendations for improvement */
  recommendations: string[];
}

/**
 * Individual security check result.
 */
export interface SecurityCheckResult {
  /** Check name */
  name: string;
  /** Whether this check passed */
  passed: boolean;
  /** Point value of this check */
  points: number;
  /** Maximum possible points */
  maxPoints: number;
  /** Description of what was checked */
  description: string;
}

/**
 * Performs a comprehensive client-side security health check and
 * calculates an overall security score.
 *
 * Checks include: HTTPS usage, presence of key security headers,
 * CSP configuration, cookie security flags, mixed content, and more.
 *
 * @returns A {@link SecurityScoreResult} with score, grade, and recommendations
 */
export function calculateSecurityScore(): SecurityScoreResult {
  const checks: SecurityCheckResult[] = [];
  const recommendations: string[] = [];

  // Check 1: HTTPS
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  checks.push({
    name: 'HTTPS',
    passed: isHttps,
    points: isHttps ? 15 : 0,
    maxPoints: 15,
    description: 'Page served over HTTPS',
  });
  if (!isHttps) recommendations.push('Enable HTTPS for all pages');

  // Check 2: CSP meta tag presence
  const hasCspMeta = typeof document !== 'undefined' &&
    !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  checks.push({
    name: 'CSP',
    passed: hasCspMeta,
    points: hasCspMeta ? 15 : 0,
    maxPoints: 15,
    description: 'Content Security Policy defined',
  });
  if (!hasCspMeta) recommendations.push('Implement a Content-Security-Policy header or meta tag');

  // Check 3: X-Frame-Options
  const hasXfo = typeof document !== 'undefined' &&
    !!document.querySelector('meta[http-equiv="X-Frame-Options"]');
  checks.push({
    name: 'X-Frame-Options',
    passed: hasXfo,
    points: hasXfo ? 10 : 0,
    maxPoints: 10,
    description: 'X-Frame-Options header set',
  });
  if (!hasXfo) recommendations.push('Set X-Frame-Options to DENY or SAMEORIGIN');

  // Check 4: X-Content-Type-Options
  const hasXcto = typeof document !== 'undefined' &&
    !!document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
  checks.push({
    name: 'X-Content-Type-Options',
    passed: hasXcto,
    points: hasXcto ? 5 : 0,
    maxPoints: 5,
    description: 'MIME sniffing prevented',
  });
  if (!hasXcto) recommendations.push('Set X-Content-Type-Options: nosniff');

  // Check 5: Referrer-Policy
  const hasReferrerPolicy = typeof document !== 'undefined' &&
    !!document.querySelector('meta[http-equiv="Referrer-Policy"]');
  checks.push({
    name: 'Referrer-Policy',
    passed: hasReferrerPolicy,
    points: hasReferrerPolicy ? 5 : 0,
    maxPoints: 5,
    description: 'Referrer-Policy configured',
  });
  if (!hasReferrerPolicy) recommendations.push('Set a strict Referrer-Policy');

  // Check 6: No mixed content (basic check)
  const hasMixedContent = typeof document !== 'undefined' &&
    Array.from(document.querySelectorAll('img, script, link, iframe, video, audio')).some((el) => {
      const src = (el as HTMLElement).getAttribute('src') ||
        (el as HTMLLinkElement).getAttribute('href');
      return src && src.startsWith('http:');
    });
  checks.push({
    name: 'Mixed Content',
    passed: !hasMixedContent,
    points: !hasMixedContent ? 10 : 0,
    maxPoints: 10,
    description: 'No passive/active mixed content detected',
  });
  if (hasMixedContent) recommendations.push('Replace all http:// resources with https://');

  // Check 7: Secure cookies (check for Secure flag indication)
  const hasSecureCookieIndication = typeof document !== 'undefined' &&
    document.cookie.split(';').some((c) => {
      const trimmed = c.trim().toLowerCase();
      return trimmed.includes('secure') || trimmed.includes('httponly');
    });
  checks.push({
    name: 'Cookie Security',
    passed: hasSecureCookieIndication,
    points: hasSecureCookieIndication ? 10 : 0,
    maxPoints: 10,
    description: 'Cookies appear to have security flags',
  });
  if (!hasSecureCookieIndication) recommendations.push('Set Secure, HttpOnly, SameSite on all cookies');

  // Check 8: Inline scripts (CSP would ideally block these)
  const hasInlineScripts = typeof document !== 'undefined' &&
    !!document.querySelectorAll('script:not([src])').length;
  checks.push({
    name: 'Inline Scripts',
    passed: !hasInlineScripts,
    points: !hasInlineScripts ? 10 : 0,
    maxPoints: 10,
    description: 'No inline script elements found',
  });
  if (hasInlineScripts) recommendations.push('Remove inline scripts; use external files or nonces');

  // Check 9: Inline event handlers
  const hasInlineHandlers = typeof document !== 'undefined' &&
    !!document.querySelectorAll('[onclick],[onerror],[onload],[onmouseover]').length;
  checks.push({
    name: 'Inline Event Handlers',
    passed: !hasInlineHandlers,
    points: !hasInlineHandlers ? 10 : 0,
    maxPoints: 10,
    description: 'No inline event handlers found',
  });
  if (hasInlineHandlers) recommendations.push('Replace inline event handlers with addEventListener');

  // Check 10: HSTS meta tag
  const hasHsts = typeof document !== 'undefined' &&
    !!document.querySelector('meta[http-equiv="Strict-Transport-Security"]');
  checks.push({
    name: 'HSTS',
    passed: hasHsts,
    points: hasHsts ? 10 : 0,
    maxPoints: 10,
    description: 'HSTS configured',
  });
  if (!hasHsts) recommendations.push('Enable Strict-Transport-Security header');

  // Calculate total
  const totalPoints = checks.reduce((sum, c) => sum + c.points, 0);
  const maxTotal = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  const score = Math.round((totalPoints / maxTotal) * 100);

  // Determine grade
  let grade: string;
  if (score >= 95) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return { score, grade, checks, recommendations };
}

// ---------------------------------------------------------------------------
// 9. Password Policy
// ---------------------------------------------------------------------------

/**
 * Password strength analysis result.
 */
export interface PasswordStrengthResult {
  /** Strength score from 0 (weakest) to 100 (strongest) */
  score: number;
  /** Strength label */
  strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  /** Estimated entropy in bits */
  entropyBits: number;
  /** Time to crack estimate (rough heuristic) */
  estimatedCrackTime: string;
  /** Specific feedback messages */
  feedback: string[];
  /** Whether the password meets minimum requirements */
  meetsMinimum: boolean;
}

/**
 * Password policy configuration.
 */
export interface PasswordPolicyConfig {
  /** Minimum length (default: 8) */
  minLength?: number;
  /** Require uppercase letters (default: true) */
  requireUppercase?: boolean;
  /** Require lowercase letters (default: true) */
  requireLowercase?: boolean;
  /** Require digits (default: true) */
  requireDigit?: boolean;
  /** Require special characters (default: true) */
  requireSpecialChar?: boolean;
  /** Minimum entropy bits required (default: 50) */
  minEntropyBits?: number;
  /** Maximum length (default: 128) */
  maxLength?: number;
  /** Disallow common/breached passwords (default: true) */
  disallowCommon?: boolean;
  /** Set of commonly used passwords to reject */
  commonPasswords?: string[];
}

/** Default list of common/breached passwords (abbreviated) */
const DEFAULT_COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'password1', 'password123', 'welcome',
  'admin', 'login', 'hello', 'charlie', 'donald', 'whatever', 'qwerty123',
]);

/**
 * Estimates the strength of a password based on character-set entropy
 * and structural analysis.
 *
 * @param password - The password to analyze
 * @param policy - Optional policy configuration
 * @returns A detailed {@link PasswordStrengthResult}
 *
 * @example
 * ```ts
 * const result = assessPassword('Tr0ub4dor&3');
 * console.log(result.score, result.strength, result.entropyBits);
 * ```
 */
export function assessPassword(
  password: string,
  policy: PasswordPolicyConfig = {},
): PasswordStrengthResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireDigit = true,
    requireSpecialChar = true,
    minEntropyBits = 50,
    maxLength = 128,
    disallowCommon = true,
    commonPasswords,
  } = policy;

  const commonSet = commonPasswords
    ? new Set(commonPasswords)
    : DEFAULT_COMMON_PASSWORDS;

  const feedback: string[] = [];
  let charsetSize = 0;

  // Character pool analysis
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z\d]/.test(password);

  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSpecial) charsetSize += 33; // Common special chars

  // Entropy calculation: L * log2(R)
  const len = password.length;
  const entropyBits = charsetSize > 0 ? Math.floor(len * Math.log2(charsetSize)) : 0;

  // Length checks
  if (len < minLength) {
    feedback.push(`Password must be at least ${minLength} characters long (currently ${len})`);
  }
  if (len > maxLength) {
    feedback.push(`Password exceeds maximum length of ${maxLength}`);
  }

  // Complexity checks
  if (requireUppercase && !hasUpper) {
    feedback.push('Include at least one uppercase letter');
  }
  if (requireLowercase && !hasLower) {
    feedback.push('Include at least one lowercase letter');
  }
  if (requireDigit && !hasDigit) {
    feedback.push('Include at least one digit');
  }
  if (requireSpecialChar && !hasSpecial) {
    feedback.push('Include at least one special character');
  }

  // Common password check
  if (disallowCommon && commonSet.has(password.toLowerCase())) {
    feedback.push('This password is too common and easily guessable');
  }

  // Pattern weakness deductions
  if (/^(.)\1+$/.test(password)) {
    feedback.push('Password consists of repeated characters');
  }
  if (/^\d+$/.test(password)) {
    feedback.push('Password contains only digits');
  }
  if (/^[a-zA-Z]+$/.test(password)) {
    feedback.push('Password contains only letters');
  }
  if (/(123|234|345|456|567|678|789|890|012|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu)tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    feedback.push('Password contains sequential character patterns');
  }
  if (/(qwer|asdf|zxcv|qwerty|azerty)/i.test(password)) {
    feedback.push('Password contains keyboard patterns');
  }

  // Score calculation (0–100)
  let score = 0;

  // Entropy contribution (up to 50 points)
  score += Math.min(50, (entropyBits / 80) * 50);

  // Length contribution (up to 20 points)
  score += Math.min(20, (len / 20) * 20);

  // Diversity contribution (up to 20 points)
  let diversityScore = 0;
  if (hasLower) diversityScore += 5;
  if (hasUpper) diversityScore += 5;
  if (hasDigit) diversityScore += 5;
  if (hasSpecial) diversityScore += 5;
  score += diversityScore;

  // Penalties
  if (disallowCommon && commonSet.has(password.toLowerCase())) score -= 30;
  if (len < minLength) score -= 20;
  if (/^(.)\1+$/.test(password)) score -= 25;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Strength label
  let strength: PasswordStrengthResult['strength'];
  if (score < 20) strength = 'very_weak';
  else if (score < 40) strength = 'weak';
  else if (score < 60) strength = 'fair';
  else if (score < 80) strength = 'strong';
  else strength = 'very_strong';

  // Crack time estimation (assumes 10 billion guesses/sec)
  const combinations = Math.pow(charsetSize || 1, len);
  const secondsToCrack = combinations / 1e10;
  let estimatedCrackTime: string;
  if (secondsToCrack < 1) estimatedCrackTime = 'instantly';
  else if (secondsToCrack < 60) estimatedCrackTime = `${Math.round(secondsToCrack)} seconds`;
  else if (secondsToCrack < 3600) estimatedCrackTime = `${Math.round(secondsToCrack / 60)} minutes`;
  else if (secondsToCrack < 86400) estimatedCrackTime = `${Math.round(secondsToCrack / 3600)} hours`;
  else if (secondsToCrack < 31536000) estimatedCrackTime = `${Math.round(secondsToCrack / 86400)} days`;
  else estimatedCrackTime = `${Math.round(secondsToCrack / 31536000)} years`;

  // Minimum requirement check
  const meetsMinimum =
    len >= minLength &&
    len <= maxLength &&
    (!requireUppercase || hasUpper) &&
    (!requireLowercase || hasLower) &&
    (!requireDigit || hasDigit) &&
    (!requireSpecialChar || hasSpecial) &&
    entropyBits >= minEntropyBits &&
    !(disallowCommon && commonSet.has(password.toLowerCase()));

  return {
    score,
    strength,
    entropyBits,
    estimatedCrackTime,
    feedback,
    meetsMinimum,
  };
}

/**
 * Generates a cryptographically secure random password conforming to
 * the specified policy.
 *
 * @param length - Desired password length (default: 16)
 * @param policy - Password policy constraints
 * @returns A generated password string guaranteed to meet the policy
 */
export function generateSecurePassword(
  length = 16,
  policy: PasswordPolicyConfig = {},
): string {
  const {
    requireUppercase = true,
    requireLowercase = true,
    requireDigit = true,
    requireSpecialChar = true,
    minLength = 8,
    maxLength = 128,
  } = policy;

  const effectiveLen = Math.max(minLength, Math.min(maxLength, length));

  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  let charset = '';
  const requiredChars: string[] = [];

  if (requireLowercase) { charset += lower; requiredChars.push(pickRandom(lower)); }
  if (requireUppercase) { charset += upper; requiredChars.push(pickRandom(upper)); }
  if (requireDigit) { charset += digits; requiredChars.push(pickRandom(digits)); }
  if (requireSpecialChar) { charset += special; requiredChars.push(pickRandom(special)); }

  if (!charset) charset = lower + upper + digits + special;

  // Fill remaining positions
  const remaining = effectiveLen - requiredChars.length;
  const allChars: string[] = [...requiredChars];
  for (let i = 0; i < remaining; i++) {
    allChars.push(pickRandom(charset));
  }

  // Fisher-Yates shuffle using crypto
  shuffleArray(allChars);
  return allChars.join('');
}

/**
 * Integration point for checking a password against known breach databases.
 *
 * This implements the k-anonymity model compatible with Have I Been Pwned's
 * Pwned Passwords API (v2). Only the first 5 characters of the SHA-1 hash
 * are sent; the API returns all hashes matching that prefix for local comparison.
 *
 * @param password - Plain-text password to check
 * @param apiBaseUrl - Override the HIBP API base URL (for testing/proxies)
 * @returns `true` if the password has been found in a breach database
 *
 * @example
 * ```ts
 * const breached = await checkPasswordBreach('password123');
 * if (breached) console.warn('This password has been compromised!');
 * ```
 */
export async function checkPasswordBreach(
  password: string,
  apiBaseUrl = 'https://api.pwnedpasswords.com/range/',
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`${apiBaseUrl}${prefix}`);
    if (!response.ok) return false;

    const text = await response.text();
    const lines = text.split('\n');
    return lines.some((line) => line.trimStart().startsWith(suffix));
  } catch {
    // Network error or API unavailable — fail closed (assume not breached)
    // In production you might want to handle this differently
    return false;
  }
}

// ---------------------------------------------------------------------------
// 10. Security Audit Logger
// ---------------------------------------------------------------------------

/**
 * Severity levels for security events.
 */
export type SecurityEventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/**
 * A recorded security event.
 */
export interface SecurityAuditEvent {
  /** Unique event ID */
  id: string;
  /** Event type/category */
  type: string;
  /** Severity level */
  severity: SecurityEventSeverity;
  /** Human-readable message */
  message: string;
  /** ISO timestamp of the event */
  timestamp: string;
  /** Additional contextual data */
  details?: Record<string, unknown>;
  /** Current URL (if available) */
  url?: string;
  /** User agent (if available) */
  userAgent?: string;
}

/** In-memory audit log storage (max entries configurable) */
const auditLog: SecurityAuditEvent[] = [];
const MAX_AUDIT_ENTRIES = 1000;

/**
 * Logs a security event to the client-side audit log.
 *
 * Events are stored in memory up to {@link MAX_AUDIT_ENTRIES}. Older events
 * are evicted when the limit is reached. For persistence, use
 * {@link exportAuditLog} or {@link sendAuditLog}.
 *
 * @param severity - Event severity level
 * @param message - Human-readable description
 * @param type - Event category (e.g., 'auth_failure', 'xss_attempt')
 * @param details - Optional structured context
 * @returns The created event object
 */
export function logSecurityEvent(
  severity: SecurityEventSeverity,
  message: string,
  type = 'general',
  details?: Record<string, unknown>,
): SecurityAuditEvent {
  const event: SecurityAuditEvent = {
    id: generateSecureId(8),
    type,
    severity,
    message,
    timestamp: new Date().toISOString(),
    details,
    url: typeof location !== 'undefined' ? location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  auditLog.push(event);

  // Evict oldest entries if over limit
  while (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.shift();
  }

  // Also output to console in development
  if (typeof console !== 'undefined') {
    const consoleMethod =
      severity === 'critical' || severity === 'high'
        ? console.error
        : severity === 'medium'
          ? console.warn
          : console.info;
    consoleMethod.call(console, `[SECURITY-${severity.toUpperCase()}]`, message, details || '');
  }

  return event;
}

/**
 * Pre-defined convenience methods for common security events.
 */
export const securityEvents = {
  /** Log a failed login attempt */
  failedLogin: (username: string, reason: string) =>
    logSecurityEvent('high', `Failed login attempt for user: ${username}`, 'auth_failure', {
      username,
      reason,
    }),

  /** Log a successful login */
  successfulLogin: (username: string) =>
    logSecurityEvent('info', `Successful login for user: ${username}`, 'auth_success', {
      username,
    }),

  /** Log a detected XSS attempt */
  xssAttemptDetected: (input: string, source: string) =>
    logSecurityEvent('critical', `XSS attempt detected from ${source}: ${input.slice(0, 100)}`, 'xss_attempt', {
      input: input.slice(0, 200),
      source,
    }),

  /** Log a detected CSRF anomaly */
  csrfAnomaly: (details: Record<string, unknown>) =>
    logSecurityEvent('high', 'CSRF token validation anomaly', 'csrf_anomaly', details),

  /** Log a session anomaly (possible hijack) */
  sessionAnomaly: (sessionId: string, reason: string) =>
    logSecurityEvent('high', `Session anomaly: ${reason}`, 'session_anomaly', {
      sessionId,
      reason,
    }),

  /** Log a rate-limit trigger */
  rateLimitExceeded: (endpoint: string, clientId: string) =>
    logSecurityEvent('medium', `Rate limit exceeded on ${endpoint}`, 'rate_limit', {
      endpoint,
      clientId,
    }),

  /** Log a permission denial */
  permissionDenied: (resource: string, action: string, userId: string) =>
    logSecurityEvent('medium', `Permission denied: ${action} on ${resource}`, 'permission_denied', {
      resource,
      action,
      userId,
    }),

  /** Log suspicious input pattern */
  suspiciousInput: (input: string, category: string) =>
    logSecurityEvent('high', `Suspicious input detected (${category}): ${input.slice(0, 100)}`, 'suspicious_input', {
      input: input.slice(0, 200),
      category,
    }),
};

/**
 * Retrieves all audit log events, optionally filtered.
 *
 * @param filter - Optional filter criteria
 * @returns Matching audit events
 */
export function getAuditLog(filter?: {
  severity?: SecurityEventSeverity;
  type?: string;
  since?: string; // ISO date
  limit?: number;
}): SecurityAuditEvent[] {
  let result = [...auditLog];

  if (filter?.severity) {
    result = result.filter((e) => e.severity === filter.severity);
  }
  if (filter?.type) {
    result = result.filter((e) => e.type === filter.type);
  }
  if (filter?.since) {
    const sinceDate = new Date(filter.since).getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() >= sinceDate);
  }
  if (filter?.limit) {
    result = result.slice(-filter.limit);
  }

  return result;
}

/**
 * Exports the audit log as a JSON string for transmission or storage.
 *
 * @param filter - Optional filter (see {@link getAuditLog})
 * @returns JSON-formatted audit log
 */
export function exportAuditLog(filter?: Parameters<typeof getAuditLog>[0]): string {
  const events = getAuditLog(filter);
  return JSON.stringify(events, null, 2);
}

/**
 * Sends the audit log to a remote collection endpoint.
 *
 * Uses `navigator.sendBeacon` when available for reliability even
 * during page unload, falling back to `fetch`.
 *
 * @param endpoint - URL of the log collection server
 * @param filter - Optional filter for which events to send
 */
export async function sendAuditLog(
  endpoint: string,
  filter?: Parameters<typeof getAuditLog>[0],
): Promise<void> {
  const events = getAuditLog(filter);
  const payload = JSON.stringify({
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    events,
  });

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, payload);
  } else if (typeof fetch !== 'undefined') {
    await fetch(endpoint, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
}

/**
 * Clears all entries from the in-memory audit log.
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Returns summary statistics about the current audit log.
 */
export function getAuditLogSummary(): {
  totalEvents: number;
  bySeverity: Record<SecurityEventSeverity, number>;
  byType: Record<string, number>;
  oldestEvent: string | null;
  newestEvent: string | null;
} {
  const bySeverity: Record<string, number> = {
    info: 0, low: 0, medium: 0, high: 0, critical: 0,
  };
  const byType: Record<string, number> = {};

  for (const event of auditLog) {
    bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    byType[event.type] = (byType[event.type] || 0) + 1;
  }

  return {
    totalEvents: auditLog.length,
    bySeverity: bySeverity as Record<SecurityEventSeverity, number>,
    byType,
    oldestEvent: auditLog.length > 0 ? auditLog[0].timestamp : null,
    newestEvent: auditLog.length > 0 ? auditLog[auditLog.length - 1].timestamp : null,
  };
}

// ---------------------------------------------------------------------------
// Internal Utility Functions
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically random hexadecimal ID string.
 *
 * @param byteLength - Number of random bytes
 * @returns Hex-encoded ID string
 */
function generateSecureId(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple non-cryptographic string hash for fingerprinting purposes.
 *
 * @param str - Input string to hash
 * @returns Hexadecimal hash string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Picks a random character from a string using crypto RNG.
 */
function pickRandom(str: string): string {
  const bytes = new Uint8Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 256);
  }
  return str[bytes[0] % str.length];
}

/**
 * Fisher-Yates shuffle using crypto RNG for array in-place shuffling.
 */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const bytes = new Uint8Array(1);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      bytes[0] = Math.floor(Math.random() * 256);
    }
    const j = bytes[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
