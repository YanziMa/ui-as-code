/**
 * Sanitizer: Input sanitization and security utilities.
 * HTML/XSS prevention, SQL injection protection, URL sanitization,
 * file name cleaning, ID generation, and content security helpers.
 */

// --- Types ---

export interface SanitizeHtmlOptions {
  /** Allowed tags (default: basic formatting) */
  allowedTags?: string[];
  /** Allowed attributes per tag */
  allowedAttributes?: Record<string, string[]>;
  /** Strip all HTML? */
  stripHtml?: boolean;
  /** Allow data: URLs in src/href? */
  allowDataUrls?: boolean;
  /** Replace disallowed tags with their text content? */
  keepText?: boolean;
}

export interface SanitizeUrlOptions {
  /** Allow javascript: protocol? */
  allowJavascript?: boolean;
  /** Allow data: URLs? */
  allowData?: boolean;
  /** Require https? */
  requireHttps?: boolean;
  /** Allow relative URLs? */
  allowRelative?: boolean;
  /** Base URL for resolving relative URLs */
  baseUrl?: string;
}

// --- HTML / XSS Sanitization ---

/** Basic HTML entity map */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

const REVERSE_ENTITIES: Record<string, string> = {};
for (const [char, entity] of Object.entries(HTML_ENTITIES)) {
  REVERSE_ENTITIES[entity] = char;
}

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  if (!str) return str;
  return str.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * Unescape HTML entities back to characters.
 */
export function unescapeHtml(str: string): string {
  if (!str) return str;
  return str.replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#\d+);/g, (entity) => {
    if (REVERSE_ENTITIES[entity]) return REVERSE_ENTITIES[entity];
    // Handle numeric entities like &#123;
    const numMatch = entity.match(/&#(\d+);/);
    if (numMatch) return String.fromCharCode(parseInt(numMatch[1], 10));
    const hexMatch = entity.match(/&#x([0-9a-fA-F]+);/);
    if (hexMatch) return String.fromCharCode(parseInt(hexMatch[1], 16));
    return entity;
  });
}

/**
 * Sanitize HTML string by removing dangerous tags and attributes.
 * This is a BASIC sanitizer — for production use a library like DOMPurify.
 */
export function sanitizeHtml(html: string, options: SanitizeHtmlOptions = {}): string {
  if (!html) return html;

  if (options.stripHtml) {
    // Strip all HTML tags, keep text content
    return html.replace(/<[^>]*>/g, "");
  }

  const {
    allowedTags = ["b", "i", "em", "strong", "u", "s", "strike", "br", "p", "span", "a", "ul", "ol", "li", "code", "pre", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6"],
    allowedAttributes = { a: ["href", "title"], img: ["src", "alt"] },
    keepText = true,
  } = options;

  // Remove script tags and their contents
  let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove style tags
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove event handlers (onclick, onerror, etc.)
  result = result.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // Remove javascript: URLs
  result = result.replace(/(href|src)\s*=\s*["']?\s*javascript:[^"'\s]*/gi, '$1=""');

  // Remove data: URLs unless allowed
  if (!options.allowDataUrls) {
    result = result.replace(/(href|src)\s*=\s*["']?\s*data:[^"'\s]*/gi, '$1=""');
  }

  // Remove disallowed tags
  const tagRegex = /<(\/?)(\w+)[^>]*>?/g;
  result = result.replace(tagRegex, (_, slash, tagName) => {
    const lowerTag = tagName.toLowerCase();
    if (allowedTags.includes(lowerTag)) {
      return `<${slash}${lowerTag}>`;
    }
    return keepText ? "" : ""; // Tag removed; text stays via regex behavior
  });

  return result;
}

/**
 * Strip ALL HTML tags from a string, returning plain text only.
 */
export function stripHtml(html: string): string {
  if (!html) return html;
  return sanitizeHtml(html, { stripHtml: true });
}

/**
 * Check if a string contains potentially dangerous HTML/script content.
 */
export function containsXss(str: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /vbscript:/i,
    /expression\s*\(/i,
    /url\s*\(\s*["']?\s*javascript:/i,
  ];
  return dangerousPatterns.some((pattern) => pattern.test(str));
}

// --- URL Sanitization ---

/**
 * Sanitize a URL to prevent XSS via href/src attributes.
 */
export function sanitizeUrl(url: string, options: SanitizeUrlOptions = {}): string {
  if (!url) return "";

  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = [
    "javascript:", "vbscript:", "data:",
  ];

  const lowerUrl = trimmed.toLowerCase();

  if (!options.allowJavascript && lowerUrl.startsWith("javascript:")) return "";
  if (!options.allowData && lowerUrl.startsWith("data:")) return "";

  // Allow relative URLs
  if (options.allowRelative && /^[./?#]/.test(trimmed)) return trimmed;

  // Validate as absolute URL
  try {
    const parsed = new URL(trimmed, options.baseUrl);
    if (options.requireHttps && parsed.protocol !== "https:") {
      parsed.protocol = "https:";
    }
    // Only allow http/https/mailto/tel protocols
    const safeProtocols = ["http:", "https:", "mailto:", "tel:"];
    if (!safeProtocols.includes(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    // Not a valid URL
    return options.allowRelative ? trimmed : "";
  }
}

/**
 * Check if a URL is safe (no javascript:, valid protocol).
 */
export function isSafeUrl(url: string): boolean {
  return sanitizeUrl(url) === url || sanitizeUrl(url, { allowRelative: true }) === url;
}

// --- String Sanitization ---

/**
 * Sanitize a string for use as a CSS identifier/class name.
 * Only allows alphanumeric, hyphens, underscores.
 */
export function sanitizeCssIdentifier(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/[^a-z0-9_-]/g, "").replace(/^[0-9]/, "_$&");
}

/**
 * Sanitize a filename: remove path traversal characters, control chars, etc.
 */
export function sanitizeFilename(name: string, options: { maxLength?: number; replacement?: string } = {}): string {
  const { maxLength = 255, replacement = "_" } = options;

  // Remove null bytes and control characters
  let sanitized = name.replace(/[\x00-\x1f\x7f]/g, replacement);

  // Remove path traversal sequences
  sanitized = sanitized.replace(/\.\./g, replacement);
  sanitized = sanitized.replace(/[\\\/:*?"<>|]/g, replacement);

  // Collapse multiple replacements
  sanitized = sanitized.replace(new RegExp(`${replacement}+`, "g"), replacement);

  // Trim and limit length
  sanitized = sanitized.trim().slice(0, maxLength);

  // Don't allow empty names or reserved names
  if (!sanitized || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(sanitized)) {
    return `file_${Date.now()}`;
  }

  return sanitized;
}

/**
 * Sanitize a string for use in a DOM querySelector.
 */
export function sanitizeSelector(str: string): string {
  if (!str) return str;
  // Escape characters that have special meaning in selectors
  return str.replace(/(["'\\])/g, "\\$1");
}

/**
 * Sanitize input for use in a RegExp constructor (prevent ReDoS).
 */
export function sanitizeRegex(str: string): string {
  if (!str) return str;
  // Escape regex metacharacters
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Input Normalization ---

/**
 * Normalize whitespace in a string (collapse multiple spaces, trim).
 */
export function normalizeWhitespace(str: string): string {
  if (!str) return str;
  return str.replace(/\s+/g, " ").trim();
}

/**
 * Normalize Unicode strings (NFC normalization).
 */
export function normalizeUnicode(str: string): string {
  if (!str) return str;
  return str.normalize("NFC");
}

/**
 * Trim and collapse whitespace, also removing zero-width characters.
 */
export function cleanInput(str: string): string {
  if (!str) return str;
  return str
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // Zero-width chars
    .replace(/\s+/g, " ")
    .trim();
}

// --- ID Generation ---

/**
 * Generate a safe DOM element ID from an arbitrary string.
 */
export function generateSafeId(input: string, prefix = "id"): string {
  if (!input) return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
  const sanitized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return sanitized ? `${prefix}_${sanitized}` : `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique ID with optional prefix.
 */
export function generateUniqueId(prefix = "uid"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a cryptographically random ID (uses crypto.randomUUID if available).
 */
export function generateSecureId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  const array = new Uint8Array(16);
  if (crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Content Security ---

/**
 * Create a Content-Security-Policy meta tag value.
 */
export function buildCsp(options: {
  defaultSrc?: string;
  scriptSrc?: string;
  styleSrc?: string;
  imgSrc?: string;
  connectSrc?: string;
  fontSrc?: string;
  objectSrc?: string;
  frameSrc?: string;
  baseUri?: string;
  formAction?: string;
}): string {
  const directives: string[] = [];

  if (options.defaultSrc) directives.push(`default-src ${options.defaultSrc}`);
  if (options.scriptSrc) directives.push(`script-src ${options.scriptSrc}`);
  if (options.styleSrc) directives.push(`style-src ${options.styleSrc}`);
  if (options.imgSrc) directives.push(`img-src ${options.imgSrc}`);
  if (options.connectSrc) directives.push(`connect-src ${options.connectSrc}`);
  if (options.fontSrc) directives.push(`font-src ${options.fontSrc}`);
  if (options.objectSrc) directives.push(`object-src ${options.objectSrc ?? "'none'"}`);
  if (options.frameSrc) directives.push(`frame-src ${options.frameSrc ?? "'none'"}`);
  if (options.baseUri) directives.push(`base-uri ${options.baseUri}`);
  if (options.formAction) directives.push(`form-action ${options.formAction}`);

  return directives.join("; ");
}
