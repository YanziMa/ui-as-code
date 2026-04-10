// =============================================================================
// Email Utilities Library
// Comprehensive TypeScript utility module for email handling, validation,
// parsing, formatting, and template rendering.
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailValidationResult {
  valid: boolean;
  email: string;
  normalized: string;
  error?: string;
  suggestion?: string;
}

export interface EmailHeadersOptions {
  messageId?: string;
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  listUnsubscribe?: string;
  priority?: "high" | "normal" | "low";
  customHeaders?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Common free / consumer email providers used for business-email heuristics. */
export const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.jp",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "mail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "yandex.com",
  "zoho.com",
  "tutanota.com",
  "tuta.io",
  "fastmail.com",
  "gmx.com",
  "gmx.net",
  "web.de",
  "inbox.com",
  "lycos.com",
  "rocketmail.com",
  "ymail.com",
  "mail.ru",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "yeah.net",
  "foxmail.com",
  "naver.com",
  "hanmail.net",
  "daum.net",
  "orange.fr",
  "wanadoo.fr",
  "virginmedia.com",
  "btinternet.com",
  "comcast.net",
  "att.net",
  "verizon.net",
]);

/** Common disposable / temporary email domains. */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "tempmail.org",
  "guerrillamail.com",
  "throwaway.email",
  "mailinator.com",
  "10minutemail.com",
  "dispostable.com",
  "meltmail.com",
  "getairmail.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "gishpuppy.com",
  "spamavert.com",
  "mailnesia.com",
  "tempail.com",
  "mytemp.email",
  "fakeinbox.com",
  "deadaddress.com",
  "e4ward.com",
  "mailed.ro",
  "mailshell.com",
  "spamex.com",
  "spammotel.com",
  "incognitomail.net",
  "jnxpn.com",
  "spambob.com",
  "spambob.org",
  "spambob.net",
  "mintemail.com",
  "trashmail.net",
  "trashmail.com",
  "trashmail.ws",
  "trashmail.org",
  "trashmail.io",
  "dodgit.com",
  "easyspace.org",
  "emailias.com",
  "gawab.com",
  "mailbucket.org",
  "mailmoat.com",
  "nullbox.info",
  "opayq.com",
  "smellfear.com",
  "sneakemail.com",
  "sofort-mail.de",
  "sogetthis.com",
  "spamgourmet.com",
  "spaml.de",
  "tempinbox.com",
  "wuzupmail.net",
  "yopmail.com",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospamfor.us",
  "nomail.xl.cx",
  "nobulk.com",
  "no-spam.ws",
  "nepwk.com",
  "no-log.org",
  "nowmymail.com",
  "objectmail.com",
  "onewaymail.com",
  "pookmail.com",
  "privacy.net",
  "quickinbox.com",
  "rcpt.at",
  "rtrtr.com",
  "selfdestructingmail.org",
  "sendspamhere.com",
  "shitmail.me",
  "skeefmail.com",
  "smapfree.net",
  "snkmail.com",
  "soodonims.com",
  "spam.beer",
  "spamcannon.com",
  "spamcannon.zero",
  "spamcorptastic.com",
  "spamcowboy.com",
  "spamcowboy.net",
  "spamcowboy.org",
  "spamfree24.com",
  "spamfree24.de",
  "spamfree24.eu",
  "spamfree24.info",
  "spamfree24.net",
  "spamfree24.org",
  "spamhero.com",
  "spamherolot.com",
  "spamheros.com",
  "spamhole.com",
  "spamify.com",
  "spaminator.de",
  "spammotel.com",
  "theone.io",
  "thismail.net",
  "tilien.com",
  "tmail.ws",
  "tmdns.org",
  "tradermail.info",
  "trash-amil.com",
  "trash-mail.com",
  "trash2009.com",
  "trash2010.com",
  "trash2011.com",
  "trashme.dk",
  "trashmailer.com",
  "tyldd.com",
  "uggsrock.com",
  "veryrealemail.com",
  "vidchart.com",
  "webcontact-france.com",
  "wh4f.org",
  "willselfdestruct.com",
  "wuzup.net",
  "wuzupmail.com",
  "xagloo.com",
  "xemaps.com",
  "xoxox.cc",
  "yep.it",
  "yourdomain.com",
  "zippiex.com",
  "zoaxe.com",
  "zoemail.com",
  "zzz.com",
]);

/** Common email-domain typos mapped to their correct form. */
export const EMAIL_TYPO_MAP: Record<string, string> = {
  gmal: "gmail",
  gmali: "gmail",
  gnail: "gmail",
  gamil: "gmail",
  yaho: "yahoo",
  yahho: "yahoo",
  yaho0: "yahoo",
  yhoo: "yahoo",
  hotmal: "hotmail",
  hotmai: "hotmail",
  hotmall: "hotmail",
  hotmaill: "hotmail",
  outlok: "outlook",
  outloo: "outlook",
  outloook: "outlook",
  outllok: "outlook",
  gmial: "gmail",
  ymail: "yahoo",
  livee: "live",
  livve: "live",
  aoll: "aol",
  aool: "aol",
};

// ---------------------------------------------------------------------------
// RFC-compliant email regex (practical subset of RFC 5322)
// ---------------------------------------------------------------------------

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const LOCAL_PART_MAX_LENGTH = 64;
const DOMAIN_MAX_LENGTH = 255;
const EMAIL_MAX_LENGTH = 320;

// ===========================================================================
// 1. Email Validation
// ===========================================================================

/**
 * Perform basic RFC-compliant email validation.
 * Returns `true` if the address is syntactically valid.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;

  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > EMAIL_MAX_LENGTH) return false;

  if (!EMAIL_REGEX.test(trimmed)) return false;

  // Split and check length constraints on local-part and domain.
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex < 1) return false; // must have something before @

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (localPart.length > LOCAL_PART_MAX_LENGTH) return false;
  if (domain.length > DOMAIN_MAX_LENGTH) return false;

  // Domain must contain at least one dot (TLD) unless it's an intranet-style name.
  if (!domain.includes(".") && !domain.endsWith(".local")) return false;

  return true;
}

/**
 * Detailed email validation with error reason, normalized form, and typo
 * suggestions.
 */
export function validateEmailDetailed(email: string): EmailValidationResult {
  const trimmed = email.trim();

  if (!trimmed || trimmed.length === 0) {
    return { valid: false, email, normalized: "", error: "Email address is empty" };
  }

  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return {
      valid: false,
      email,
      normalized: "",
      error: `Email exceeds maximum length of ${EMAIL_MAX_LENGTH} characters`,
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    // Attempt to find a typo-based suggestion.
    const suggestion = suggestEmailCorrection(trimmed);
    return {
      valid: false,
      email,
      normalized: normalizeEmail(trimmed),
      error: "Invalid email format",
      suggestion,
    };
  }

  const atIndex = trimmed.lastIndexOf("@");
  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();

  if (localPart.length > LOCAL_PART_MAX_LENGTH) {
    return {
      valid: false,
      email,
      normalized: normalizeEmail(trimmed),
      error: `Local part exceeds ${LOCAL_PART_MAX_LENGTH} characters`,
    };
  }

  if (domain.length > DOMAIN_MAX_LENGTH) {
    return {
      valid: false,
      email,
      normalized: normalizeEmail(trimmed),
      error: `Domain exceeds ${DOMAIN_MAX_LENGTH} characters`,
    };
  }

  const normalized = normalizeEmail(trimmed);

  return {
    valid: true,
    email: trimmed,
    normalized,
  };
}

/**
 * Check whether the given email uses a known disposable / temporary provider.
 */
export function isDisposableEmail(email: string): boolean {
  try {
    const domain = getDomain(email)?.toLowerCase();
    if (!domain) return false;
    return DISPOSABLE_EMAIL_DOMAINS.has(domain);
  } catch {
    return false;
  }
}

/**
 * Heuristic check for business / corporate emails.
 * Returns `true` when the domain does **not** belong to a known free provider.
 */
export function isBusinessEmail(email: string): boolean {
  const domain = getDomain(email)?.toLowerCase();
  if (!domain) return false;
  return !FREE_EMAIL_PROVIDERS.has(domain);
}

/**
 * Normalize an email address:
 * - Trim whitespace
 * - Lowercase the entire address
 * - For Gmail addresses, remove dots from the local part and strip "+tag"
 */
export function normalizeEmail(email: string): string {
  let normalized = email.trim().toLowerCase();

  const atIndex = normalized.indexOf("@");
  if (atIndex === -1) return normalized;

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  // Gmail-specific normalisation: ignore dots and plus-addressing.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const cleanLocal = localPart.replace(/\./g, "").split("+")[0];
    return `${cleanLocal}@${domain}`;
  }

  return `${localPart}@${domain}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Try to detect common typos in the domain portion and suggest a correction.
 */
function suggestEmailCorrection(email: string): string | undefined {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return undefined;

  const rawDomain = email.slice(atIndex + 1).toLowerCase();

  // Check direct typo map first.
  for (const [typo, correct] of Object.entries(EMAIL_TYPO_MAP)) {
    if (rawDomain.startsWith(typo) && !rawDomain.startsWith(correct)) {
      const correctedDomain = rawDomain.replace(typo, correct);
      return `${email.slice(0, atIndex)}@${correctedDomain}`;
    }
  }

  // Fuzzy match against free providers (Levenshtein distance <= 2).
  for (const provider of FREE_EMAIL_PROVIDERS) {
    if (levenshteinDistance(rawDomain.split(".")[0], provider.split(".")[0]) <= 2) {
      const correctedDomain = provider;
      return `${email.slice(0, atIndex)}@${correctedDomain}`;
    }
  }

  return undefined;
}

/** Compute Levenshtein edit distance between two strings. */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

// ===========================================================================
// 2. Email Parsing
// ===========================================================================

/**
 * Parse a single address in `"Name <email>"` or `<email>` format.
 * Returns `{ name, email }` or `null` when parsing fails.
 */
export function parseEmailAddress(
  fullAddress: string
): { name: string; email: string } | null {
  if (!fullAddress) return null;

  const trimmed = fullAddress.trim();

  // Match "Name <email@domain.com>"
  const angleMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angleMatch) {
    const name = angleMatch[1].trim().replace(/^["']|["']$/g, "");
    const email = angleMatch[2].trim();
    if (isValidEmail(email)) return { name, email };
    return null;
  }

  // Bare email
  if (isValidEmail(trimmed)) {
    return { name: "", email: trimmed };
  }

  return null;
}

/**
 * Parse a comma or semicolon-separated list of email addresses.
 * Handles both bare addresses and `"Name <email>"` entries.
 */
export function parseEmailList(
  list: string
): Array<{ name: string; email: string }> {
  if (!list) return [];

  // Split on commas or semicolons, but respect quoted strings.
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === "," || ch === ";") && !inQuotes) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);

  const results: Array<{ name: string; email: string }> = [];
  for (const part of parts) {
    const parsed = parseEmailAddress(part);
    if (parsed) results.push(parsed);
  }

  return results;
}

/**
 * Extract all syntactically-valid email addresses from arbitrary text.
 */
export function extractEmails(text: string): string[] {
  if (!text) return [];

  // This pattern captures most common email formats within text.
  const emailPattern = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g;

  const matches = text.match(emailPattern);
  if (!matches) return [];

  // Deduplicate while preserving order via Set semantics.
  const seen = new Set<string>();
  const results: string[] = [];
  for (const candidate of matches) {
    const trimmed = candidate.trim();
    if (isValidEmail(trimmed) && !seen.has(normalizeEmail(trimmed))) {
      seen.add(normalizeEmail(trimmed));
      results.push(trimmed);
    }
  }

  return results;
}

/**
 * Return the domain portion of an email address (everything after `@`).
 */
export function getDomain(email: string): string {
  if (!email) return "";

  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1 || atIndex >= email.length - 1) return "";

  return email.slice(atIndex + 1).trim().toLowerCase();
}

// ===========================================================================
// 3. Email Formatting
// ===========================================================================

/**
 * Format a name and email into `"Name <email>"` representation.
 * If no name is provided, returns just the email.
 */
export function formatEmailAddress(name: string, email: string): string {
  const safeName = (name ?? "").trim();
  const safeEmail = (email ?? "").trim();

  if (!safeEmail) return "";
  if (!safeName) return safeEmail;

  // Wrap name in quotes if it contains special characters.
  const needsQuoting = /[,;<>()"\\]/.test(safeName);
  const displayName = needsQuoting ? `"${safeName.replace(/"/g, '\\"')}"` : safeName;

  return `${displayName} <${safeEmail}>`;
}

/**
 * Mask an email address for privacy-safe display.
 *
 * @example
 * maskEmail("john@example.com", 2)   // => "jo***@example.com"
 * maskEmail("a@b.co")                // => "a***@b.co"
 */
export function maskEmail(email: string, visibleChars: number = 2): string {
  if (!email) return "";

  const atIndex = email.indexOf("@");
  if (atIndex === -1) return email;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  const visible = Math.min(visibleChars, localPart.length);
  const masked = localPart.slice(0, visible) + "***";

  return masked + domain;
}

/**
 * Obfuscate an email using HTML entity encoding to deter simple scraping bots.
 * The output can be safely rendered inside HTML text nodes.
 */
export function obfuscateEmail(email: string): string {
  if (!email) return "";

  return email
    .split("")
    .map((char) => `&#${char.charCodeAt(0)};`)
    .join("");
}

/**
 * Generate a Gravatar avatar URL for the given email.
 *
 * @param email     - The email address to hash.
 * @param size      - Image size in pixels (default 80).
 * @param defaultImage - Default image identifier or URL when no gravatar exists
 *                       (`"mp"` | `"identicon"` | `"monsterid"` | `"wavatar"` |
 *                        `"retro"` | `"blank"` | URL).
 */
export function generateGravatarUrl(
  email: string,
  size: number = 80,
  defaultImage: string = "mp"
): string {
  const trimmed = (email ?? "").trim().toLowerCase();
  // MD5 hash (simple non-crypto hash sufficient for Gravatar).
  const hash = simpleMd5Hash(trimmed);

  const params = new URLSearchParams({
    s: String(size),
    d: defaultImage,
  });

  return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Simple MD5 implementation for Gravatar URLs (no external dependency)
// ---------------------------------------------------------------------------

function simpleMd5Hash(str: string): string {
  function rotateLeft(x: number, n: number): number {
    return (x << n) | (x >>> (32 - n));
  }

  function toHexWord(word: number): string {
    const hex = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += hex[(word >> (i * 8)) & 0xf] + hex[(word >> (i * 8 + 4)) & 0xf];
    }
    return result;
  }

  // Initialise state.
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;

  // Pre-processing: padding.
  const msg = unescape(encodeURIComponent(str));
  const bytes: number[] = [];
  for (let i = 0; i < msg.length; i++) {
    bytes.push(msg.charCodeAt(i));
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0x00);
  }

  // Append original length as 64-bit little-endian.
  for (let i = 0; i < 8; i++) {
    bytes.push((bitLen >>> (i * 8)) & 0xff);
  }

  // Process each 512-bit block.
  const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];

  const s = [
    [7, 12, 17, 22], [5, 9, 14, 20], [4, 11, 16, 23],
    [6, 10, 15, 21],
  ];

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const M: number[] = [];
    for (let i = 0; i < 16; i++) {
      M[i] =
        bytes[offset + i * 4] |
        (bytes[offset + i * 4 + 1] << 8) |
        (bytes[offset + i * 4 + 2] << 16) |
        (bytes[offset + i * 4 + 3] << 24);
    }

    let a = h0,
      b = h1,
      c = h2,
      d = h3;

    for (let i = 0; i < 64; i++) {
      let f: number, g: number;

      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      b = (b + rotateLeft((a + f + K[i] + M[g]) | 0, s[Math.floor(i / 4)][i % 4])) | 0;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
  }

  return toHexWord(h0) + toHexWord(h1) + toHexWord(h2) + toHexWord(h3);
}

// ===========================================================================
// 4. Email Template Helpers
// ---------------------------------------------------------------------------

/** Variables commonly available in email templates. */
export const TEMPLATE_VARIABLES = {
  NAME: "{{name}}",
  EMAIL: "{{email}}",
  DATE: "{{date}}",
  UNSUBSCRIBE_URL: "{{unsubscribe_url}}",
  COMPANY: "{{company}}",
  SUBJECT: "{{subject}}",
  PREVIEW_TEXT: "{{preview_text}}",
  YEAR: "{{year}}",
  MONTH: "{{month}}",
  DAY: "{{day}}",
} as const;

/**
 * Render an email template by replacing `{{variable}}` placeholders with
 * provided values.
 *
 * Unrecognised placeholders are left untouched so that downstream systems
 * can handle them.
 */
export function renderEmailTemplate(
  template: string,
  variables: Record<string, string>
): string {
  if (!template) return "";

  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, value);
  }

  // Fill common date variables automatically if not already provided.
  const now = new Date();
  if (!variables.date) {
    result = result.replaceAll("{{date}}", now.toDateString());
  }
  if (!variables.year) {
    result = result.replaceAll("{{year}}", String(now.getFullYear()));
  }
  if (!variables.month) {
    result = result.replaceAll("{{month}}", String(now.getMonth() + 1).padStart(2, "0"));
  }
  if (!variables.day) {
    result = result.replaceAll("{{day}}", String(now.getDate()).padStart(2, "0"));
  }

  return result;
}

/**
 * Very basic CSS-inlining helper for email clients that strip `<style>` blocks.
 *
 * **Note:** This is intentionally lightweight -- it only handles simple element-
 * level style rules (e.g., `p { color: red; }`). For production use consider a
 * dedicated library such as `juice`.
 */
export function inlineCss(html: string): string {
  if (!html) return html;

  // Extract <style> contents.
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let result = html;
  const cssRules: Array<{ selector: string; declarations: string }> = [];

  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const cssText = styleMatch[1];

    // Parse simple `selector { prop: val; ... }` rules.
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let ruleMatch: RegExpExecArray | null;
    while ((ruleMatch = ruleRegex.exec(cssText)) !== null) {
      const selector = ruleMatch[1].trim();
      const declarations = ruleMatch[2].trim();
      cssRules.push({ selector, declarations });
    }
  }

  // Remove <style> blocks from output.
  result = result.replace(styleRegex, "");

  // Apply each rule by injecting a `style` attribute on matching elements.
  // We only support simple tag selectors (e.g., `p`, `h1`, `.class`).
  for (const { selector, declarations } of cssRules) {
    // Build a regex that matches opening tags for this selector.
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Tag selector: e.g. "p" -> <p ...>
    if (/^[a-z][a-z0-9]*$/i.test(selector)) {
      const tagRegex = new RegExp(`<(${selector})(\\s[^>]*)?>`, "gi");
      result = result.replace(tagRegex, (match, tag, attrs) => {
        const existingStyle = extractStyleFromAttrs(attrs || "");
        const merged = mergeStyles(existingStyle, declarations);
        return `<${tag}${attrs ? attrs : ""}${merged ? ` style="${merged}"` : ""}>`;
      });
    }

    // Class selector: e.g. ".header"
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      const classRegex = new RegExp(
        `<([a-z][a-z0-9]*)(\\s[^>]*)?\\bclass=["'][^"']*\\b${className}\\b[^"']*["'](\\s[^>]*)?>`,
        "gi"
      );
      result = result.replace(classRegex, (match, tag, before, after) => {
        const allAttrs = (before || "") + (after || "");
        const existingStyle = extractStyleFromAttrs(allAttrs);
        const merged = mergeStyles(existingStyle, declarations);
        return `<${tag}${allAttrs}${merged ? ` style="${merged}"` : ""}>`;
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Inline-CSS helpers
// ---------------------------------------------------------------------------

function extractStyleFromAttrs(attrs: string): string {
  const match = attrs.match(/\s*style\s*=\s*"([^"]*)"/i);
  return match ? match[1] : "";
}

function mergeStyles(existing: string, incoming: string): string {
  if (!existing) return incoming;
  if (!incoming) return existing;

  // Parse existing into map.
  const map = new Map<string, string>();
  for (const decl of existing.split(";")) {
    const [prop, val] = decl.split(":").map((s) => s.trim());
    if (prop && val) map.set(prop, val);
  }

  // Apply incoming (overrides existing).
  for (const decl of incoming.split(";")) {
    const [prop, val] = decl.split(":").map((s) => s.trim());
    if (prop && val) map.set(prop, val);
  }

  return Array.from(map.entries())
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

// ===========================================================================
// 5. Email Utilities
// ===========================================================================

/**
 * Generate a `References` / `In-Reply-To` header value suitable for threading
 * replies.
 */
export function generateReplyToHeader(
  originalMessageId: string,
  originalFrom: string
): string {
  // Clean message-id wrapping if present.
  const mid = originalMessageId.replace(/^<|>$/g, "");

  return `<reply-${Date.now()}@${getDomain(originalFrom) || "localhost"}>`;
}

/**
 * Build a standard unsubscribe URL.
 */
export function createUnsubscribeUrl(baseUrl: string, token: string): string {
  const url = baseUrl.replace(/\/+$/, "");
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Generate a complete set of email headers ready for use with an SMTP client
 * or mail-sending API.
 */
export function generateEmailHeaders(options: EmailHeadersOptions): Record<string, string> {
  const headers: Record<string, string> = {};

  // Message-ID
  headers["Message-ID"] =
    options.messageId ||
    `<${simpleMd5Hash(`${options.from}${Date.now()}${Math.random()}`)}@${getDomain(options.from) || "localhost"}>`;

  // From
  headers["From"] = options.from;

  // To (array support)
  headers["To"] = Array.isArray(options.to) ? options.to.join(", ") : options.to;

  // Cc
  if (options.cc) {
    headers["Cc"] = Array.isArray(options.cc) ? options.cc.join(", ") : options.cc;
  }

  // Bcc
  if (options.bcc) {
    headers["Bcc"] = Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc;
  }

  // Subject
  if (options.subject) {
    headers["Subject"] = options.subject;
  }

  // Reply-To
  if (options.replyTo) {
    headers["Reply-To"] = options.replyTo;
  }

  // In-Reply-To & References (threading)
  if (options.inReplyTo) {
    headers["In-Reply-To"] = options.inReplyTo;
  }
  if (options.references) {
    headers["References"] = options.references;
  }

  // List-Unsubscribe
  if (options.listUnsubscribe) {
    headers["List-Unsubscribe"] = `<${options.listUnsubscribe}>`;
  }

  // Priority
  if (options.priority) {
    const priorityMap: Record<string, string> = {
      high: "1 (Highest)",
      normal: "3 (Normal)",
      low: "5 (Lowest)",
    };
    headers["X-Priority"] = priorityMap[options.priority] || priorityMap.normal;
    headers["Priority"] = options.priority.charAt(0).toUpperCase() + options.priority.slice(1);
  }

  // Date
  headers["Date"] = new Date().toUTCString();

  // MIME-Version
  headers["MIME-Version"] = "1.0";

  // Content-Type (default)
  if (!headers["Content-Type"]) {
    headers["Content-Type"] = 'text/html; charset="UTF-8"';
  }

  // Custom headers
  if (options.customHeaders) {
    for (const [key, value] of Object.entries(options.customHeaders)) {
      headers[key] = value;
    }
  }

  return headers;
}

/**
 * Build a `mailto:` URI with optional subject and body parameters.
 * All values are properly URI-encoded.
 */
export function buildMailtoLink(
  to: string,
  subject?: string,
  body?: string
): string {
  const params: string[] = [];

  if (subject) {
    params.push(`subject=${encodeURIComponent(subject)}`);
  }
  if (body) {
    params.push(`body=${encodeURIComponent(body)}`);
  }

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";
  return `mailto:${encodeURIComponent(to)}${queryString}`;
}
