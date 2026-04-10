/**
 * Typography System: Headings (h1-h6), text styles (body, caption, code,
 * blockquote), text utilities (truncate, highlight, copy), responsive sizing,
 * and consistent type scale with CSS variable support.
 */

// --- Types ---

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type TextSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
export type TextWeight = "thin" | "light" | "normal" | "medium" | "semibold" | "bold" | "extrabold";
export type TextColor = "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info" | "inherit";

export interface TypographyOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Content (text or HTML) */
  content: string | HTMLElement;
  /** Element tag (default: 'p' for text, 'h{level}' for headings) */
  as?: string;
  /** Size variant */
  size?: TextSize;
  /** Font weight */
  weight?: TextWeight;
  /** Color variant */
  color?: TextColor;
  /** Custom color value (overrides color variant) */
  customColor?: string;
  /** Alignment */
  align?: "left" | "center" | "right" | "justify";
  /** Line height multiplier or fixed px */
  lineHeight?: number | string;
  /** Max lines before truncating (with ellipsis) */
  maxLines?: number;
  /** Truncate with ellipsis? */
  truncate?: boolean;
  /** Monospace/code style? */
  code?: boolean;
  /** Italic? */
  italic?: boolean;
  /** Underline? */
  underline?: boolean;
  /** Strikethrough? */
  strikethrough?: boolean;
  /** Uppercase? */
  uppercase?: boolean;
  /** Lowercase? */
  lowercase?: boolean;
  /** Letter spacing (px or em) */
  letterSpacing?: number | string;
  /** Word break behavior */
  wordBreak?: "normal" | "break-all" | "break-word" | "keep-all";
  /** Margin bottom (px) */
  marginBottom?: number;
  /** No margin of convenience */
  noMargin?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface HeadingOptions extends Omit<TypographyOptions, "as"> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Heading level (1-6) */
  level: HeadingLevel;
  /** Show decorative line under heading? */
  underline?: boolean;
  /** Underline color */
  underlineColor?: string;
  /** ID for anchor linking */
  id?: string;
}

export interface ParagraphOptions extends TypographyOptions {
  /** First letter drop cap? */
  dropCap?: boolean;
  /** Indent first line? */
  indent?: boolean;
}

// --- Type Scale ---

const SIZE_MAP: Record<TextSize, { fontSize: number; lineHeight: number }> = {
  xs:   { fontSize: 12, lineHeight: 1.5 },
  sm:   { fontSize: 13, lineHeight: 1.5 },
  md:   { fontSize: 14, lineHeight: 1.6 },
  lg:   { fontSize: 16, lineHeight: 1.6 },
  xl:   { fontSize: 18, lineHeight: 1.55 },
  "2xl": { fontSize: 20, lineHeight: 1.5 },
  "3xl": { fontSize: 24, lineHeight: 1.4 },
  "4xl": { fontSize: 30, lineHeight: 1.35 },
};

const HEADING_SIZES: Record<HeadingLevel, { fontSize: number; fontWeight: number; lineHeight: number }> = {
  1: { fontSize: 30, fontWeight: 800, lineHeight: 1.3 },
  2: { fontSize: 24, fontWeight: 700, lineHeight: 1.35 },
  3: { fontSize: 20, fontWeight: 600, lineHeight: 1.4 },
  4: { fontSize: 17, fontWeight: 600, lineHeight: 1.45 },
  5: { fontSize: 15, fontWeight: 500, lineHeight: 1.5 },
  6: { fontSize: 13, fontWeight: 500, lineHeight: 1.5 },
};

const WEIGHT_MAP: Record<TextWeight, number> = {
  thin:      100,
  light:     300,
  normal:    400,
  medium:    500,
  semibold:  600,
  bold:      700,
  extrabold: 800,
};

const COLOR_MAP: Record<TextColor, string> = {
  default:   "#111827",
  primary:   "#4f46e5",
  secondary: "#6b7280",
  success:   "#16a34a",
  warning:   "#d97706",
  error:     "#dc2626",
  info:      "#2563eb",
  inherit:   "inherit",
};

// --- Main Factory ---

function createTypographyElement(
  options: TypographyOptions,
  defaultTag: string,
  overrideSize?: { fontSize: number; lineHeight: number },
): HTMLElement {
  const opts = {
    size: options.size ?? "md",
    weight: options.weight ?? "normal",
    color: options.color ?? "default",
    align: options.align ?? "left",
    noMargin: options.noMargin ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Typography: container not found");

  const sz = overrideSize ?? SIZE_MAP[opts.size];
  const el = document.createElement(opts.as ?? defaultTag);
  el.className = `typo typo-${opts.size} ${opts.className}`;

  // Base styles
  let cssText = `
    font-size:${sz.fontSize}px;line-height:${typeof opts.lineHeight === "number" ? opts.lineHeight : opts.lineHeight ?? `${sz.lineHeight}`};
    font-weight:${WEIGHT_MAP[opts.weight]};
    color:${opts.customColor ?? COLOR_MAP[opts.color]};
    text-align:${opts.align};
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    ${opts.noMargin ? "margin:0;" : ""}
    ${opts.marginBottom !== undefined ? `margin-bottom:${opts.marginBottom}px;` : ""}
  `;

  // Truncation
  if (opts.maxLines) {
    cssText += `display:-webkit-box;-webkit-line-clamp:${opts.maxLines};-webkit-box-orient:vertical;overflow:hidden;`;
  }
  if (opts.truncate && !opts.maxLines) {
    cssText += `overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
  }

  // Code style
  if (opts.code) {
    cssText += `font-family:"SF Mono",SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:${sz.fontSize - 1}px;`;
  }

  // Decorative
  if (opts.italic) cssText += "font-style:italic;";
  if (opts.underline) cssText += "text-decoration:underline;";
  if (opts.strikethrough) cssText += "text-decoration:line-through;";
  if (opts.uppercase) cssText += "text-transform:uppercase;";
  if (opts.lowercase) cssText += "text-transform:lowercase;";

  if (opts.letterSpacing !== undefined) {
    cssText += `letter-spacing:${typeof opts.letterSpacing === "number" ? opts.letterSpacing + "px" : opts.letterSpacing};`;
  }

  if (opts.wordBreak) {
    const wbMap: Record<string, string> = {
      "normal": "normal",
      "break-all": "break-all",
      "break-word": "break-word",
      "keep-all": "keep-all",
    };
    cssText += `word-break:${wbMap[opts.wordBreak]};overflow-wrap:${wbMap[opts.wordBreak]};`;
  }

  el.style.cssText = cssText;

  // Content
  if (typeof opts.content === "string") {
    el.textContent = opts.content;
  } else {
    el.appendChild(opts.content);
  }

  container.appendChild(el);
  return el;
}

/** Create a styled text element */
export function createTypography(options: TypographyOptions): HTMLElement {
  return createTypographyElement(options, "p");
}

/** Create a heading element */
export function createHeading(options: HeadingOptions): HTMLElement {
  const hs = HEADING_SIZES[options.level];

  const el = createTypographyElement(options, `h${options.level}`, hs);

  // Heading-specific styles
  if (options.underline) {
    el.style.textDecoration = "underline";
    el.style.textDecorationColor = options.underlineColor ?? "#d1d5db";
    el.style.textDecorationThickness = "2px";
    el.style.textUnderlineOffset = "3px";
  }

  if (options.id) el.id = options.id;

  return el;
}

/** Create a paragraph element */
export function createParagraph(options: ParagraphOptions): HTMLElement {
  const el = createTypographyElement(options, "p");

  if (options.dropCap) {
    el.style.cssText += "::first-letter{float:left;font-size:3em;line-height:1;margin-right:8px;font-weight:700;color:#111827;}";

    // Apply via inline style since ::first-letter can't be set directly
    const styleEl = document.createElement("style");
    styleEl.textContent = `[data-dropcap="${Math.random().toString(36).slice(2)}"]::first-letter{float:left;font-size:3em;line-height:1;margin-right:8px;font-weight:700;color:#111827;}`;
    document.head.appendChild(styleEl);
    el.setAttribute(`data-dropcap`, styleEl.textContent.match(/data-dropcap="([^"]+)"/)?.[1] ?? "");
  }

  if (options.indent) {
    el.style.textIndent = "2em";
  }

  return el;
}

// --- Quick Helpers ---

/** Render an h1-h6 heading by level */
export function h(level: HeadingLevel, text: string, options?: Partial<Omit<HeadingOptions, "container" | "level" | "content">>): HTMLElement {
  return createHeading({ container: document.body, level, content: text, ...options });
}

/** Render body text */
export function body(text: string, options?: Partial<Omit<TypographyOptions, "container" | "content">>): HTMLElement {
  return createTypography({ container: document.body, content: text, size: "md", ...options });
}

/** Render small/caption text */
export function caption(text: string, options?: Partial<Omit<TypographyOptions, "container" | "content">>): HTMLElement {
  return createTypography({ container: document.body, content: text, size: "sm", color: "secondary", ...options });
}

/** Render a blockquote */
export function createBlockquote(
  content: string | HTMLElement,
  options?: { container: HTMLElement | string; cite?: string; borderLeft?: string; className?: string },
): HTMLElement {
  const cont = options?.container ?? document.body;
  const containerEl = typeof cont === "string" ? document.querySelector<HTMLElement>(cont)! : cont;

  const bq = document.createElement("blockquote");
  bq.className = `typo-blockquote ${options?.className ?? ""}`;
  bq.style.cssText = `
    border-left:4px solid ${options?.borderLeft ?? "#d1d5db"};
    padding:12px 16px;margin:16px 0;background:#f9fafb;border-radius:0 6px 6px 0;
    color:#4b5563;font-style:italic;font-size:14px;line-height:1.6;
  `;

  if (typeof content === "string") bq.textContent = content;
  else bq.appendChild(content);

  if (options?.cite) {
    const citeEl = document.createElement("cite");
    citeEl.textContent = options.cite;
    citeEl.style.cssText = "display:block;margin-top:8px;font-size:12px;color:#9ca3af;font-style:normal;";
    bq.appendChild(citeEl);
  }

  containerEl.appendChild(bq);
  return bq;
}

/** Render inline code */
export function code(code: string): HTMLElement {
  const el = document.createElement("code");
  el.className = "typo-code";
  el.style.cssText = `
    font-family:"SF Mono",SFMono-Regular,Consolas,monospace;
    background:#f3f4f6;padding:2px 6px;border-radius:4px;
    font-size:0.85em;color:#dc2626;
  `;
  el.textContent = code;
  return el;
}

/** Render a code block */
export function createCodeBlock(codeStr: string, language?: string): HTMLElement {
  const wrapper = document.createElement("pre");
  wrapper.className = "typo-code-block";
  wrapper.style.cssText = `
    background:#1e1e2e;color:#d4d4d4;padding:16px;border-radius:8px;
    overflow-x:auto;font-size:13px;line-height:1.6;
    font-family:"SF Mono",SFMono-Regular,Consolas,monospace;
    border:1px solid #333;
  `;

  const codeEl = document.createElement("code");
  codeEl.textContent = codeStr;

  if (language) {
    const langLabel = document.createElement("span");
    langLabel.textContent = language;
    langLabel.style.cssText = "float:right;font-size:11px;color:#888;padding-bottom:4px;";
    wrapper.appendChild(langLabel);
  }

  wrapper.appendChild(codeEl);
  return wrapper;
}

/** Highlight text within an element */
export function highlightText(element: HTMLElement, query: string, color?: string): void {
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx >= 0) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + query.length);
        const mark = document.createElement("mark");
        mark.style.cssText = `background:${color ?? "#fef08a"};color:inherit;padding:0 1px;border-radius:2px;`;
        range.surroundContents(mark);
      }
    } else if (node.childNodes) {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  walk(element);
}
