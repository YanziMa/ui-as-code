/**
 * HTML string parser: parse HTML to DOM-like tree, query selectors,
 * text extraction, attribute manipulation, and safe HTML sanitization.
 */

// --- Types ---

export interface HtmlNode {
  /** Node type */
  type: "element" | "text" | "comment" | "doctype";
  /** Tag name (for elements) */
  tag?: string;
  /** Attributes (for elements) */
  attrs?: Record<string, string>;
  /** Text content (for text nodes) */
  text?: string;
  /** Child nodes */
  children: HtmlNode[];
  /** Whether this is a self-closing/void element */
  voidElement?: boolean;
  /** Original source position for error reporting */
  position?: { start: number; end: number };
}

export interface ParseOptions {
  /** Lowercase all tag names */
  lowercaseTags?: boolean;
  /** Decode HTML entities in text content */
  decodeEntities?: boolean;
  /** Preserve whitespace in text nodes */
  preserveWhitespace?: boolean;
  /** Include comment nodes */
  includeComments?: boolean;
  /** Include doctype nodes */
  includeDoctype?: boolean;
  /** Maximum nesting depth (default: 256) */
  maxDepth?: number;
}

export interface QuerySelectorResult {
  node: HtmlNode;
  /** Full path from root to this node */
  path: number[];
}

export interface SanitizeOptions {
  /** Allowed tags (empty = strip all tags) */
  allowedTags?: string[];
  /** Allowed attributes per tag or globally */
  allowedAttributes?: Record<string, string[]> | string[];
  /** Strip all attributes not in allowlist */
  stripDisallowedAttrs?: boolean;
  /** Allow data: URLs in src/href */
  allowDataUrls?: boolean;
  /** Allow javascript: URLs (DANGEROUS - default false) */
  allowJavascriptUrls?: boolean;
  /** Custom URL validator */
  urlValidator?: (url: string, attr: string) => boolean;
}

// --- Entity Decoding ---

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": "\u00A0",
  "&copy;": "\u00A9",
  "&reg;": "\u00AE",
  "&trade;": "\u2122",
};

/** Decode HTML entities in a string */
export function decodeHtmlEntities(str: string): string {
  let result = str;
  // Named entities
  for (const [entity, char] of Object.entries(ENTITY_MAP)) {
    result = result.replaceAll(entity, char);
  }
  // Numeric entities (decimal)
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  // Numeric entities (hex)
  result = result.replace(/&#[xX]([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  return result;
}

/** Encode special characters as HTML entities */
export function encodeHtmlEntities(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Void Elements (Self-Closing) ---

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag.toLowerCase());
}

// --- Parser ---

/**
 * Parse an HTML string into a tree of HtmlNode objects.
 *
 * This is a lightweight parser — NOT a full HTML5 spec parser.
 * It handles common cases well but may not handle malformed edge cases
 * like a browser would.
 */
export function parseHtml(html: string, options: ParseOptions = {}): HtmlNode[] {
  const {
    lowercaseTags = true,
    decodeEntities: doDecode = true,
    preserveWhitespace = false,
    includeComments = false,
    includeDoctype = false,
    maxDepth = 256,
  } = options;

  const nodes: HtmlNode[] = [];
  let pos = 0;
  const len = html.length;

  function parseNodes(depth: number): HtmlNode[] {
    if (depth > maxDepth) return [];

    const result: HtmlNode[] = [];

    while (pos < len) {
      // Skip whitespace text nodes unless preserving
      if (!preserveWhitespace && /^\s+$/.test(html.slice(pos, pos + 1))) {
        const wsStart = pos;
        while (pos < len && /\s/.test(html[pos]!)) pos++;
        if (wsStart !== pos) {
          result.push({
            type: "text",
            text: html.slice(wsStart, pos),
            children: [],
          });
        }
        continue;
      }

      // Comment
      if (html.startsWith("<!--", pos)) {
        if (!includeComments) {
          pos = html.indexOf("-->", pos + 4);
          if (pos === -1) pos = len;
          else pos += 3;
          continue;
        }
        const start = pos;
        const end = html.indexOf("-->", pos + 4);
        if (end === -1) break;
        result.push({
          type: "comment",
          text: html.slice(start + 4, end),
          children: [],
          position: { start, end: end + 3 },
        });
        pos = end + 3;
        continue;
      }

      // Doctype
      if (html.startsWith("<!DOCTYPE", pos) || html.startsWith("<!doctype", pos)) {
        if (!includeDoctype) {
          const end = html.indexOf(">", pos);
          pos = end === -1 ? len : end + 1;
          continue;
        }
        const start = pos;
        const end = html.indexOf(">", pos);
        if (end === -1) break;
        result.push({
          type: "doctype",
          text: html.slice(start, end + 1),
          children: [],
          position: { start, end: end + 1 },
        });
        pos = end + 1;
        continue;
      }

      // Text node (anything before the next <)
      if (html[pos] !== "<") {
        const textStart = pos;
        while (pos < len && html[pos] !== "<") pos++;
        let text = html.slice(textStart, pos);
        if (doDecode) text = decodeHtmlEntities(text);
        result.push({ type: "text", text, children: [] });
        continue;
      }

      // Element
      const elStart = pos;

      // Closing tag
      if (html[pos + 1] === "/") {
        const closeEnd = html.indexOf(">", pos);
        if (closeEnd === -1) break;
        pos = closeEnd + 1;
        break; // Return to parent level
      }

      // Opening tag
      const tagMatch = html.slice(pos).match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
      if (!tagMatch) {
        // Not a valid tag, treat as text
        pos++;
        result.push({ type: "text", text: "<", children: [] });
        continue;
      }

      const rawTag = tagMatch[1]!;
      const tag = lowercaseTags ? rawTag.toLowerCase() : rawTag;
      pos += tagMatch[0].length;

      // Parse attributes
      const attrs: Record<string, string> = {};
      while (pos < len && html[pos] !== ">" && html[pos] !== "/") {
        // Skip whitespace
        while (pos < len && /\s/.test(html[pos]!)) pos++;

        if (pos >= len || html[pos] === ">" || html[pos] === "/") break;

        // Attribute name
        const attrStart = pos;
        while (pos < len && /[a-zA-Z_:][-a-zA-Z0-9_:.]*/.test(html[pos]!)) pos++;
        const attrName = html.slice(attrStart, pos);

        if (!attrName || pos >= len) break;

        // Skip whitespace
        while (pos < len && /\s/.test(html[pos]!)) pos++;

        // =
        if (html[pos] === "=") {
          pos++; // skip =

          // Skip whitespace
          while (pos < len && /\s/.test(html[pos]!)) pos++;

          // Value
          if (pos < len && (html[pos] === '"' || html[pos] === "'")) {
            const quote = html[pos]!;
            pos++;
            const valStart = pos;
            while (pos < len && html[pos] !== quote) {
              if (html[pos] === "\\") pos++; // escape
              pos++;
            }
            attrs[attrName] = html.slice(valStart, pos);
            if (pos < len) pos++; // skip closing quote
          } else {
            // Unquoted value
            const valStart = pos;
            while (pos < len && !/\s/.test(html[pos]!) && html[pos] !== ">" && html[pos] !== "/") pos++;
            attrs[attrName] = html.slice(valStart, pos);
          }
        } else {
          // Boolean attribute (no value)
          attrs[attrName] = "";
        }
      }

      // Self-closing check
      const isVoid = isVoidElement(tag);
      const selfClosing = !isVoid && html[pos] === "/";
      if (selfClosing) pos++; // skip /

      if (pos < len && html[pos] === ">") pos++; // skip >

      const node: HtmlNode = {
        type: "element",
        tag,
        attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
        children: [],
        voidElement: isVoid || selfClosing,
        position: { start: elStart, end: pos },
      };

      // Parse children (if not void/self-closing)
      if (!isVoid && !selfClosing) {
        node.children = parseNodes(depth + 1);
      }

      result.push(node);
    }

    return result;
  }

  return parseNodes(0);
}

// --- Serialization ---

/** Serialize HtmlNode tree back to HTML string */
export function serializeHtml(nodes: HtmlNode[]): string {
  return nodes.map(serializeNode).join("");
}

function serializeNode(node: HtmlNode): string {
  switch (node.type) {
    case "text":
      return encodeHtmlEntities(node.text ?? "");
    case "comment":
      return `<!--${node.text ?? ""}-->`;
    case "doctype":
      return node.text ?? "";
    case "element": {
      const tag = node.tag ?? "";
      const attrsStr = node.attrs
        ? Object.entries(node.attrs)
            .map(([k, v]) => v === "" ? ` ${k}` : ` ${k}="${encodeHtmlEntities(v)}"`)
            .join("")
        : "";
      if (node.voidElement) {
        return `<${tag}${attrsStr} />`;
      }
      const inner = node.children.length > 0 ? serializeHtml(node.children) : "";
      return `<${tag}${attrsStr}>${inner}</${tag}>`;
    }
    default:
      return "";
  }
}

// --- Query Selectors ---

/** Find first element matching a simple CSS selector */
export function querySelector(nodes: HtmlNode[], selector: string): HtmlNode | null {
  const results = querySelectorAll(nodes, selector);
  return results[0]?.node ?? null;
}

/** Find all elements matching a simple CSS selector */
export function querySelectorAll(nodes: HtmlNode[], selector: string): QuerySelectorResult[] {
  const results: QuerySelectorResult[] = [];
  const normalizedSelector = selector.trim();

  walkNodes(nodes, [], (node, path) => {
    if (node.type !== "element") return;
    if (matchesSelector(node, normalizedSelector)) {
      results.push({ node, path });
    }
  });

  return results;
}

/** Walk all nodes in depth-first order */
export function walkNodes(
  nodes: HtmlNode[],
  parentPath: number[],
  callback: (node: HtmlNode, path: number[]) => void,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const path = [...parentPath, i];
    callback(node, path);
    if (node.children) {
      walkNodes(node.children, path, callback);
    }
  }
}

/** Simple CSS selector matcher (supports: tag, #id, .class, [attr], combinations) */
function matchesSelector(node: HtmlNode, selector: string): boolean {
  if (node.type !== "element" || !node.tag) return false;

  // Split compound selectors (e.g., "div.container#main")
  const parts = selector.split(/\s+/).filter(Boolean);

  // Simple single-part selector
  if (parts.length === 1) {
    return matchSingle(node, parts[0]!);
  }

  // For multi-part (descendant), we'd need context — simplified here
  return matchSingle(node, parts[parts.length - 1]!);
}

function matchSingle(node: HtmlNode, sel: string): boolean {
  if (node.type !== "element" || !node.tag) return false;

  // Tag
  const tagMatch = /^[a-zA-Z][a-zA-Z0-9]*$/.test(sel)
    ? node.tag === sel.toLowerCase()
    : true;

  // ID
  const idMatch = /#([a-zA-Z_-][\w-]*)/.test(sel)
    ? node.attrs?.id === sel.match(/#([\w-]+)/)?.[1]
    : true;

  // Class
  const classParts = [...sel.matchAll(/\.([a-zA-Z_-][\w-]*)/g)].map((m) => m[1]);
  const classMatch = classParts.length > 0
    ? classParts.every((cls) =>
        (node.attrs?.class ?? "").split(/\s+/).includes(cls),
      )
    : true;

  // Attribute
  const attrMatch = /\[([^\]]+)\]/.test(sel)
    ? matchAttribute(node, sel.match(/\[([^\]]+)\]/)![1]!)
    : true;

  return tagMatch && idMatch && classMatch && attrMatch;
}

function matchAttribute(node: HtmlNode, attrSel: string): boolean {
  // [attr], [attr=value], [attr~=value], [attr^=value], [attr$=value], [attr*=value]
  const eqMatch = attrSel.match(/^(\w+)=(["']?)(.+)\2$/);
  if (eqMatch) {
    const val = node.attrs?.[eqMatch[1]!] ?? "";
    return val === eqMatch[3];
  }

  const containsMatch = attrSel.match(/^(\w+)\*=(["']?)(.+)\2$/);
  if (containsMatch) {
    const val = node.attrs?.[containsMatch[1]!] ?? "";
    return val.includes(containsMatch[3]);
  }

  const startsWithMatch = attrSel.match(/^(\w+)\^=(["']?)(.+)\2$/);
  if (startsWithMatch) {
    const val = node.attrs?.[startsWithMatch[1]!] ?? "";
    return val.startsWith(startsWithMatch[3]);
  }

  const endsWithMatch = attrSel.match(/^(\w+)\$=(["']?)(.+)\2$/);
  if (endsWithMatch) {
    const val = node.attrs?.[endsWithMatch[1]!] ?? "";
    return val.endsWith(endsWithMatch[3]);
  }

  // Just presence check
  return attrSel in (node.attrs ?? {});
}

// --- Text Extraction ---

/** Extract all text content from nodes (concatenated) */
export function extractText(nodes: HtmlNode[]): string {
  return nodes.map(extractNodeText).join("").trim();
}

function extractNodeText(node: HtmlNode): string {
  switch (node.type) {
    case "text":
      return node.text ?? "";
    case "element":
      return node.children.map(extractNodeText).join("");
    default:
      return "";
  }
}

/** Extract plain text stripping all HTML tags */
export function stripHtmlTags(html: string): string {
  const nodes = parseHtml(html);
  return extractText(nodes);
}

// --- Sanitization ---

/** Sanitize HTML by removing dangerous content */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const {
    allowedTags = [],
    allowedAttributes = {},
    stripDisallowedAttrs = true,
    allowDataUrls = false,
    allowJavascriptUrls = false,
    urlValidator,
  } = options;

  const globalAllowedAttrs = Array.isArray(allowedAttributes) ? allowedAttributes : undefined;
  const perTagAttrs = Array.isArray(allowedAttributes) ? {} : allowedAttributes;

  const parsed = parseHtml(html);

  function sanitizeNode(node: HtmlNode): HtmlNode | null {
    if (node.type !== "element") {
      // Keep text and comments as-is
      return node;
    }

    const tag = node.tag?.toLowerCase() ?? "";

    // Check if tag is allowed
    if (allowedTags.length > 0 && !allowedTags.includes(tag)) {
      // Return children instead (unwrap)
      return {
        type: "element",
        tag: "__sanitized_wrapper__",
        children: node.children.map(sanitizeNode).filter((n): n is HtmlNode => n !== null),
      };
    }

    // Filter attributes
    const allowed = globalAllowedAttrs ?? (perTagAttrs[tag] ?? []);
    const filteredAttrs: Record<string, string> = {};

    if (node.attrs) {
      for (const [key, value] of Object.entries(node.attrs)) {
        // Check attribute allowlist
        if (stripDisallowedAttrs && !allowed.includes(key) && !key.startsWith("data-")) {
          continue;
        }

        // Check dangerous URLs
        if ((key === "src" || key === "href" || key === "action") && value) {
          const lowerVal = value.toLowerCase().trim();
          if (
            lowerVal.startsWith("javascript:") ||
            lowerVal.startsWith("vbscript:") ||
            lowerVal.startsWith("data:") && !allowDataUrls
          ) {
            if (!allowJavascriptUrls && lowerVal.startsWith("javascript:")) continue;
            if (!allowDataUrls && lowerVal.startsWith("data:")) continue;
          }

          // Custom URL validator
          if (urlValidator && !urlValidator(value, key)) {
            continue;
          }
        }

        filteredAttrs[key] = value;
      }
    }

    // Recursively sanitize children
    const sanitizedChildren = node.children
      .map(sanitizeNode)
      .filter((n): n is HtmlNode => n !== null);

    return {
      ...node,
      attrs: Object.keys(filteredAttrs).length > 0 ? filteredAttrs : undefined,
      children: sanitizedChildren,
    };
  }

  const sanitized = parsed.map(sanitizeNode).filter((n): n is HtmlNode => n !== null);

  // Unwrap any __sanitized_wrapper__ nodes
  return unwrapSanitized(sanitizeHtmlToString(sanitized));
}

function sanitizeHtmlToString(nodes: HtmlNode[]): string {
  return nodes.map((node) => {
    if (node.tag === "__sanitized_wrapper__") {
      return node.children.map(sanitizeHtmlToString).join("");
    }
    return serializeNode(node);
  }).join("");
}

function unwrapSanitized(html: string): string {
  // Remove wrapper artifacts that may remain
  return html;
}

// --- DOM Conversion ---

/** Convert HtmlNode tree to actual DOM elements */
export function htmlToDom(nodes: HtmlNode[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const node of nodes) {
    frag.appendChild(convertToDom(node));
  }
  return frag;
}

function convertToDom(node: HtmlNode): Node {
  switch (node.type) {
    case "text":
      return document.createTextNode(node.text ?? "");
    case "comment":
      return document.createComment(node.text ?? "");
    case "element": {
      const el = document.createElement(node.tag ?? "div");
      if (node.attrs) {
        for (const [key, value] of Object.entries(node.attrs)) {
          if (value === "") {
            el.setAttribute(key, "");
          } else {
            el.setAttribute(key, value);
          }
        }
      }
      for (const child of node.children) {
        el.appendChild(convertToDom(child));
      }
      return el;
    }
    default:
      return document.createTextNode("");
  }
}
