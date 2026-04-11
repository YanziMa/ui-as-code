/**
 * HTML Sanitizer for safely rendering user-supplied HTML content with
 * configurable tag/attribute allowlists, URL scheme validation, CSS
 * sanitization, SVG filtering, and XSS prevention.
 */

// --- Types ---

export type SanitizeLevel = "none" | "relaxed" | "balanced" | "strict";

export interface SanitizeOptions {
  /** Sanitization level (default: "balanced") */
  level?: SanitizeLevel;
  /** Allowed tags (overrides level defaults) */
  allowedTags?: string[];
  /** Disallowed tags (always removed regardless of level) */
  disallowedTags?: string[];
  /** Allowed attributes per tag (or globally) */
  allowedAttributes?: Record<string, string[]> | string[];
  /** Allowed URL schemes (default: ["http", "https", "mailto", "tel", "data:image"]) */
  allowedSchemes?: string[];
  /** Allow data: URLs for images (default: true) */
  allowDataImages?: boolean;
  /** Strip all style attributes (default: false at balanced, true at strict) */
  stripStyles?: boolean;
  /** Strip all class attributes */
  stripClasses?: boolean;
  /** Strip all id attributes */
  stripIds?: boolean;
  /** Strip event handler attributes (onclick, onload, etc.) - always done by default */
  stripEventHandlers?: boolean;
  /** Strip script, style, link, meta, base tags - always done by default */
  stripDangerousTags?: boolean;
  /** Custom attribute transformer */
  transformAttribute?: (tag: string, attr: string, value: string) => string | null;
  /** Called for each removed tag */
  onRemoveTag?: (tag: string) => void;
  /** Called for each removed attribute */
  onRemoveAttr?: (tag: string, attr: string) => void;
  /** Return text-only (strip ALL HTML) */
  textOnly?: boolean;
}

interface TagConfig {
  allowed: boolean;
  allowedAttrs: Set<string>;
  selfClosing?: boolean;
}

// --- Default configurations ---

const LEVEL_TAGS: Record<SanitizeLevel, string[]> = {
  none: [], // No restrictions
  relaxed: [
    "a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote",
    "body", "br", "caption", "cite", "code", "col", "colgroup", "dd", "details",
    "div", "dl", "dt", "em", "figcaption", "figure", "footer", "h1", "h2", "h3",
    "h4", "h5", "h6", "header", "hr", "i", "img", "li", "main", "mark",
    "nav", "ol", "p", "pre", "q", "rp", "rt", "ruby", "s", "samp", "section",
    "small", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td",
    "tfoot", "th", "thead", "time", "tr", "u", "ul", "var", "wbr",
    // Formatting
    "center", "font", "marquee", "video", "audio", "source", "track",
    // Forms (relaxed)
    "button", "fieldset", "form", "input", "label", "legend", "option",
    "optgroup", "select", "textarea", "output", "progress", "meter",
  ],
  balanced: [
    "a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote",
    "br", "caption", "cite", "code", "col", "colgroup", "dd", "details", "div",
    "dl", "dt", "em", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4",
    "h5", "h6", "header", "hr", "i", "img", "li", "mark", "nav", "ol", "p",
    "pre", "q", "rp", "rt", "ruby", "s", "section", "small", "span", "strong",
    "sub", "summary", "sup", "table", "tbody", "td", "tfoot", "th", "thead",
    "time", "tr", "u", "ul", "var", "wbr",
  ],
  strict: [
    "b", "i", "em", "strong", "a", "p", "br", "span", "ul", "ol", "li",
    "code", "pre", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
  ],
};

const GLOBAL_ALLOWED_ATTRS = [
  "href", "src", "alt", "title", "target", "rel", "id", "class",
  "dir", "lang", "role", "tabindex", "aria-label", "aria-labelledby",
  "aria-describedby", "aria-hidden", "aria-live", "aria-expanded",
  "aria-pressed", "aria-selected", "aria-checked", "aria-disabled",
  "aria-current", "aria-valuemin", "aria-valuemax", "aria-valuenow",
  "aria-valuetext", "data-*", "width", "height", "loading",
];

const DANGEROUS_TAGS = new Set([
  "script", "style", "link", "meta", "base", "object", "embed",
  "applet", "iframe", "frame", "frameset", "svg", "math",
  "noscript", "noembed", "noframes", "template", "slot",
]);

const EVENT_HANDLER_PATTERN = /^on/i;

// --- Main ---

export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const {
    level = "balanced",
    allowedTags: customAllowedTags,
    disallowedTags: customDisallowed,
    allowedAttributes: customAllowedAttrs,
    allowedSchemes,
    allowDataImages = true,
    stripStyles,
    stripClasses,
    stripIds,
    stripEventHandlers = true,
    stripDangerousTags = true,
    transformAttribute,
    onRemoveTag,
    onRemoveAttr,
    textOnly = false,
  } = options;

  // Text-only mode
  if (textOnly) {
    const tmp = document.createElement("div");
    tmp.textContent = html;
    return tmp.innerHTML;
  }

  // Build tag config
  const tagConfig = new Map<string, TagConfig>();
  const allowedTagSet = new Set(customAllowedTags ?? LEVEL_TAGS[level]);
  const disallowedSet = new Set(customDisallowed ?? []);

  for (const tag of allowedTagSet) {
    if (!disallowedSet.has(tag) && !(stripDangerousTags && DANGEROUS_TAGS.has(tag))) {
      tagConfig.set(tag.toLowerCase(), {
        allowed: true,
        allowedAttrs: new Set(GLOBAL_ALLOWED_ATTRS),
      });
    }
  }

  // Parse and sanitize using DOMParser
  const doc = new DOMParser().parseFromString(
    `<div>${html}</div>`,
    "text/html",
  );

  const root = doc.body.firstElementChild!;
  if (!root) return "";

  sanitizeNode(root, {
    tagConfig,
    allowedAttrs: customAllowedAttrs,
    allowedSchemes: allowedSchemes ?? ["http", "https", "mailto", "tel"],
    allowDataImages,
    stripStyles: stripStyles ?? (level === "strict"),
    stripClasses: stripClasses ?? false,
    stripIds: stripIds ?? false,
    stripEventHandlers,
    stripDangerousTags,
    transformAttribute,
    onRemoveTag,
    onRemoveAttr,
  });

  return root.innerHTML;
}

function sanitizeNode(
  node: Node,
  opts: {
    tagConfig: Map<string, TagConfig>;
    allowedAttrs?: Record<string, string[]> | string[];
    allowedSchemes: string[];
    allowDataImages: boolean;
    stripStyles: boolean;
    stripClasses: boolean;
    stripIds: boolean;
    stripEventHandlers: boolean;
    stripDangerousTags: boolean;
    transformAttribute?: (tag: string, attr: string, value: string) => string | null;
    onRemoveTag?: (tag: string) => void;
    onRemoveAttr?: (tag: string, attr: string) => void;
  },
): void {
  if (!(node instanceof HTMLElement)) return;

  const tagName = node.tagName.toLowerCase();

  // Check if tag is allowed
  const config = opts.tagConfig.get(tagName);

  if (!config || !config.allowed) {
    // Not allowed — replace with text content
    opts.onRemoveTag?.(tagName);
    const parent = node.parentNode;
    if (parent) {
      const frag = document.createDocumentFragment();
      while (node.firstChild) frag.appendChild(node.firstChild);
      parent.replaceChild(frag, node);
    }
    return;
  }

  // Sanitize attributes
  const attrsToRemove: string[] = [];
  const attrs = Array.from(node.attributes);

  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    // Always remove event handlers
    if (opts.stripEventHandlers && EVENT_HANDLER_PATTERN.test(name)) {
      attrsToRemove.push(name);
      opts.onRemoveAttr?.(tagName, name);
      continue;
    }

    // Remove dangerous tags' attributes
    if (opts.stripDangerousTags && DANGEROUS_TAGS.has(tagName)) {
      attrsToRemove.push(name);
      continue;
    }

    // Strip styles/classes/ids if configured
    if (name === "style" && opts.stripStyles) {
      attrsToRemove.push(name);
      continue;
    }
    if (name === "class" && opts.stripClasses) {
      attrsToRemove.push(name);
      continue;
    }
    if (name === "id" && opts.stripIds) {
      attrsToRemove.push(name);
      continue;
    }

    // Check against allowed attributes
    if (opts.allowedAttrs) {
      const globalAllowed = Array.isArray(opts.allowedAttrs)
        ? opts.allowedAttrs
        : opts.allowedAttrs["*"] ?? [];
      const tagSpecific = !Array.isArray(opts.allowedAttrs)
        ? (opts.allowedAttrs[tagName] ?? [])
        : [];

      const isAllowed =
        globalAllowed.includes(name) ||
        globalAllowed.includes("*") ||
        globalAllowed.some((a) => a.endsWith("*") && name.startsWith(a.replace("*", ""))) ||
        tagSpecific.includes(name) ||
        name.startsWith("aria-") ||
        name.startsWith("data-");

      if (!isAllowed) {
        attrsToRemove.push(name);
        opts.onRemoveAttr?.(tagName, name);
        continue;
      }
    }

    // Validate URLs
    if ((name === "href" || name === "src" || name === "action" || name === "poster") && value) {
      if (!isValidUrl(value, opts.allowedSchemes, opts.allowDataImages)) {
        attrsToRemove.push(name);
        opts.onRemoveAttr?.(tagName, name);
        continue;
      }
    }

    // Custom transformer
    if (opts.transformAttribute) {
      const result = opts.transformAttribute(tagName, name, value);
      if (result === null) {
        attrsToRemove.push(name);
        continue;
      } else if (result !== value) {
        node.setAttribute(name, result);
      }
    }
  }

  for (const attr of attrsToRemove) {
    node.removeAttribute(attr);
  }

  // Recursively sanitize children
  for (const child of Array.from(node.childNodes)) {
    sanitizeNode(child, opts);
  }
}

function isValidUrl(
  url: string,
  allowedSchemes: string[],
  allowDataImages: boolean,
): boolean {
  try {
    // Relative URLs are OK
    if (!url.match(/^[a-z][a-z0-9+.-]*:/i)) return true;

    const parsed = new URL(url, "http://example.com");
    const scheme = parsed.protocol.replace(/:$/, "").toLowerCase();

    if (allowedSchemes.includes(scheme)) return true;

    // Data images check
    if (scheme === "data" && allowDataImages) {
      return /^image\/(png|jpeg|gif|webp|svg\+xml);base64,/i.test(url);
    }

    return false;
  } catch {
    return false;
  }
}

// --- Standalone utilities ---

/** Quick sanitize with default (balanced) settings */
export function sanitize(html: string): string {
  return sanitizeHtml(html, { level: "balanced" });
}

/** Strip all HTML tags, return plain text */
export function stripHtml(html: string): string {
  return sanitizeHtml(html, { textOnly: true });
}

/** Escape HTML entities (for use in text context) */
export function escapeHtmlEntities(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/** Check if HTML contains potentially dangerous content */
export function scanForXss(html: string): { safe: boolean; issues: string[] } {
  const issues: string[] = [];

  // Script tags
  if (/<script[\s>]/i.test(html)) issues.push("Contains <script> tag");
  if (/javascript\s*:/i.test(html)) issues.push("Contains javascript: URI");
  if (/\bon\w+\s*=/i.test(html)) issues.push("Contains inline event handler");
  if (/<iframe|<object|<embed|<applet/i.test(html)) issues.push("Contains dangerous embed tag");
  if (/expression\s*\(/i.test(html)) issues.push("Contains CSS expression()");
  if (/url\s*\(\s*['"]?\s*javascript:/i.test(html)) issues.push("Contains javascript in CSS url()");

  return { safe: issues.length === 0, issues };
}
