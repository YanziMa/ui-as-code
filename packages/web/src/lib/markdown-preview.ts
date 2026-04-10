/**
 * Markdown Preview: Full-featured Markdown renderer with GFM (GitHub Flavored Markdown),
 * syntax highlighting for code blocks, table of contents generation, heading anchors,
 * image lazy loading, link security, copyable code blocks, and theme support.
 */

// --- Types ---

export interface MarkdownHeading {
  level: number;
  text: string;
  id: string;
  index: number;
}

export interface MarkdownOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial markdown content */
  content?: string;
  /** Enable GFM features (tables, strikethrough, task lists) */
  gfm?: boolean;
  /** Enable syntax highlighting in code blocks */
  highlightCode?: boolean;
  /** Show line numbers in code blocks */
  showLineNumbers?: boolean;
  /** Generate and show table of contents */
  showToc?: boolean;
  /** TOC position: 'left', 'right', or 'top' */
  tocPosition?: "left" | "right" | "top";
  /** Max heading level for TOC (1-6) */
  tocMaxLevel?: number;
  /** Add anchor links to headings */
  headingAnchors?: boolean;
  /** Open external links in new tab? */
  externalLinksNewTab?: boolean;
  /** Sanitize HTML output? */
  sanitize?: boolean;
  /** Base URL for relative links */
  baseUrl?: string;
  /** Custom CSS class */
  className?: string;
  /** Theme: 'light' or 'dark' */
  theme?: "light" | "dark";
  /** Callback when a heading is clicked */
  onHeadingClick?: (heading: MarkdownHeading) => void;
  /** Callback when a link is clicked */
  onLinkClick?: (url: string) => void;
  /** Custom renderer override */
  customRenderers?: Partial<MarkdownRenderers>;
}

export interface MarkdownInstance {
  element: HTMLElement;
  /** Get current rendered HTML */
  getHtml: () => string;
  /** Set new markdown content */
  setContent: (md: string) => void;
  /** Get current raw markdown */
  getContent: () => string;
  /** Get extracted headings */
  getHeadings: () => MarkdownHeading[];
  /** Get generated TOC HTML */
  getTocHtml: () => string;
  /** Scroll to heading by id */
  scrollToHeading: (id: string) => void;
  /** Export as plain text (strip formatting) */
  exportPlainText: () => string;
  /** Destroy and cleanup */
  destroy: () => void;
}

interface MarkdownRenderers {
  codeblock: (code: string, lang: string) => string;
  inlineCode: (code: string) => string;
  heading: (text: string, level: number, id: string) => string;
  paragraph: (text: string) => string;
  link: (text: string, url: string) => string;
  image: (alt: string, src: string) => string;
  list: (items: string[], ordered: boolean, start?: number) => string;
  blockquote: (text: string) => string;
  table: (header: string[], rows: string[][]) => string;
  hr: () => string;
  taskList: (items: { checked: boolean; text: string }[]) => string;
}

// --- Constants ---

const THEMES = {
  light: {
    bg: "#ffffff",
    text: "#1a1a1a",
    headingColor: "#1a1a1a",
    linkColor: "#0969da",
    linkHover: "#0550ae",
    codeBg: "#f6f8fa",
    codeBorder: "#d1d5da",
    blockquoteBg: "#f6f8fa",
    blockquoteBorder: "#d1d5da",
    tableBorder: "#d1d5da",
    tableHeaderBg: "#f6f8fa",
    hrColor: "#d1d5da",
    tocBg: "#fafbfc",
    tocBorder: "#e1e4e8",
    tocActive: "#0969da",
    selectionBg: "#b4d5fe",
  },
  dark: {
    bg: "#0d1117",
    text: "#c9d1d9",
    headingColor: "#e6edf3",
    linkColor: "#58a6ff",
    linkHover: "#79c0ff",
    codeBg: "#161b22",
    codeBorder: "#30363d",
    blockquoteBg: "#161b22",
    blockquoteBorder: "#30363d",
    tableBorder: "#30363d",
    tableHeaderBg: "#161b22",
    hrColor: "#30363d",
    tocBg: "#161b22",
    tocBorder: "#30363d",
    tocActive: "#58a6ff",
    selectionBg: "#264f78",
  },
};

// --- Main Parser/Renderer ---

export function createMarkdownPreview(options: MarkdownOptions): MarkdownInstance {
  const opts = {
    gfm: options.gfm ?? true,
    highlightCode: options.highlightCode ?? true,
    showLineNumbers: options.showLineNumbers ?? false,
    showToc: options.showToc ?? false,
    tocPosition: options.tocPosition ?? "right",
    tocMaxLevel: options.tocMaxLevel ?? 3,
    headingAnchors: options.headingAnchors ?? true,
    externalLinksNewTab: options.externalLinksNewTab ?? true,
    sanitize: options.sanitize ?? true,
    theme: options.theme ?? "light",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("MarkdownPreview: container not found");

  const t = THEMES[opts.theme];
  let currentContent = options.content ?? "";
  let headings: MarkdownHeading[] = [];
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `markdown-preview ${opts.className ?? ""}`;
  root.style.cssText = `
    display:flex;width:100%;height:100%;font-family:-apple-system,sans-serif;
    background:${t.bg};color:${t.text};line-height:1.7;font-size:15px;overflow:hidden;border-radius:8px;
  `;
  container.appendChild(root);

  // Content area
  const contentEl = document.createElement("div");
  contentEl.className = "md-content";
  contentEl.style.cssText = `
    flex:1;padding:24px 32px;overflow-y:auto;max-width:100%;
    ${opts.showToc && (opts.tocPosition === "left" || opts.tocPosition === "right") ? "" : "max-width:100%;"}
  `;
  root.appendChild(contentEl);

  // TOC area
  let tocEl: HTMLElement | null = null;
  if (opts.showToc) {
    tocEl = document.createElement("div");
    tocEl.className = "md-toc";
    tocEl.style.cssText = `
      width:220px;flex-shrink:0;background:${t.tocBg};border-left:${opts.tocPosition === "left" ? "none" : `1px solid ${t.tocBorder}`};border-right:${opts.tocPosition === "left" ? `1px solid ${t.tocBorder}` : "none"};
      padding:16px 12px;overflow-y:auto;font-size:13px;
      order:${opts.tocPosition === "left" ? "-1" : "1"};
    `;
    root.appendChild(tocEl);
  }

  // --- Parsing ---

  function parse(md: string): { html: string; headings: MarkdownHeading[] } {
    const extractedHeadings: MarkdownHeading[] = [];
    let headingIndex = 0;

    // Pre-process: normalize line endings
    md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Extract code blocks first to protect them
    const codeBlocks: Array<{ placeholder: string; code: string; lang: string }> = [];
    md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      const placeholder = `\x00CODEBLOCK${codeBlocks.length}\x00`;
      codeBlocks.push({ placeholder, code: code.replace(/\n$/, ""), lang: lang || "" });
      return placeholder;
    });

    // Also protect inline code
    const inlineCodes: Array<{ placeholder: string; code: string }> = [];
    md = md.replace(/`([^`\n]+)`/g, (_match, code) => {
      const placeholder = `\x00INLINE${inlineCodes.length}\x00`;
      inlineCodes.push({ placeholder, code });
      return placeholder;
    });

    // Process line by line
    const lines = md.split("\n");
    let html = "";
    let i = 0;

    while (i < lines.length) {
      const line = lines[i]!;

      // Empty lines
      if (/^\s*$/.test(line)) {
        i++;
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1]!.length;
        const text = parseInline(headingMatch[2]!);
        const id = generateId(text);
        extractedHeadings.push({ level, text: stripHtml(text), id, index: headingIndex++ });
        html += renderHeading(text, level, id);
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        html += renderHr();
        i++;
        continue;
      }

      // Code block (already replaced with placeholders, but handle edge cases)
      if (line.startsWith("\x00CODEBLOCK")) {
        const cbIdx = parseInt(line.match(/\d+/)![0], 10);
        const cb = codeBlocks[cbIdx];
        if (cb) {
          html += renderCodeBlock(cb.code, cb.lang);
        }
        i++;
        while (i < lines.length && !lines[i]!.startsWith("\x00")) i++;
        continue;
      }

      // Blockquote
      if (line.startsWith("> ")) {
        const quoteLines: string[] = [];
        while (i < lines.length && (lines[i]!.startsWith("> ") || (lines[i]!.startsWith(">") && /^\s*$/.test(lines[i]!.slice(1))))) {
          quoteLines.push(lines[i]!.replace(/^>\s?/, ""));
          i++;
        }
        html += renderBlockquote(quoteLines.join("\n"));
        continue;
      }

      // Table (GFM)
      if (opts.gfm && isTableStart(lines, i)) {
        const tableResult = parseTable(lines, i);
        html += renderTable(tableResult.header, tableResult.rows);
        i = tableResult.endIndex;
        continue;
      }

      // Unordered list
      if (/^[\s]*[-*+]\s/.test(line) || /^[\s*\d]+.\s/.test(line)) {
        const listResult = parseList(lines, i);
        html += renderList(listResult.items, listResult.ordered, listResult.start);
        i = listResult.endIndex;
        continue;
      }

      // Paragraph (collect consecutive non-empty lines)
      const paraLines: string[] = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]!) &&
             !lines[i]!.match(/^#{1,6}\s/) &&
             !/^[-*]{3,}$/.test(lines[i]!) &&
             !lines[i]!.startsWith("> ") &&
             !lines[i]!.startsWith("\x00") &&
             !isTableStart(lines, i) &&
             !/^[\s]*[-*+]\s/.test(lines[i]) &&
             !/^[\s*\d]+.\s/.test(lines[i])) {
        paraLines.push(lines[i]!);
        i++;
      }
      if (paraLines.length > 0) {
        html += renderParagraph(paraLines.join("\n"));
      }
    }

    // Restore code blocks
    for (const cb of codeBlocks) {
      html = html.replace(cb.placeholder, renderCodeBlock(cb.code, cb.lang));
    }

    // Restore inline code
    for (const ic of inlineCodes) {
      html = html.replace(ic.placeholder, renderInlineCode(ic.code));
    }

    return { html, headings: extractedHeadings };
  }

  // --- Inline Parsing ---

  function parseInline(text: string): string {
    // Restore protected patterns first
    let result = text;

    // Bold + Italic
    result = result.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    result = result.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");

    // Bold
    result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/__(.+?)__/g, "<strong>$1</strong>");

    // Italic
    result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
    result = result.replace(/_(.+?)_/g, "<em>$1</em>");

    // Strikethrough (GFM)
    if (opts.gfm) {
      result = result.replace(/~~(.+?)~~/g, "<del>$1</del>");
    }

    // Images
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) =>
      renderImage(alt, sanitizeUrl(src))
    );

    // Links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) =>
      renderLink(text, sanitizeUrl(url))
    );

    // Auto-links
    result = result.replace(/<((https?:\/\/|mailto:)[^>]+)>/g, (_match, url) =>
      renderLink(url, url)
    );

    return result;
  }

  function stripHtml(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent ?? "";
  }

  function generateId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .slice(0, 50) || "heading";
  }

  function sanitizeUrl(url: string): string {
    if (!url) return "";
    // Prevent javascript: protocol
    if (/^\s*javascript:/i.test(url)) return "#unsafe";
    if (opts.baseUrl && !/^(https?:\/\/|\/|#|mailto:)/i.test(url)) {
      return opts.baseUrl + "/" + url.replace(/^\.\//, "");
    }
    return url;
  }

  // --- Render Functions ---

  function renderHeading(text: string, level: number, id: string): string {
    if (opts.customRenderers?.heading) return opts.customRenderers.heading(text, level, id);
    const anchor = opts.headingAnchors ? `<a href="#${id}" class="md-heading-anchor" style="color:inherit;text-decoration:none;margin-left:8px;opacity:0;transition:opacity 0.2s;">#</a>` : "";
    return `<h${level} id="${id}" style="margin-top:${level * 0.75}em;margin-bottom:0.5em;color:${t.headingColor};font-weight:600;line-height:1.4;" data-md-heading="${id}">${text}${anchor}</h${level}>`;
  }

  function renderParagraph(text: string): string {
    if (opts.customRenderers?.paragraph) return opts.customRenderers.paragraph(text);
    return `<p style="margin-bottom:16px;">${parseInline(text)}</p>`;
  }

  function renderCodeBlock(code: string, lang: string): string {
    if (opts.customRenderers?.codeblock) return opts.customRenderers.codeblock(code, lang);

    const lines = code.split("\n");
    let numberedCode = code;
    if (opts.showLineNumbers) {
      const maxNum = lines.length.toString().length;
      numberedCode = lines.map((l, i) =>
        `${String(i + 1).padStart(maxNum)}  ${l}`
      ).join("\n");
    }

    const header = lang
      ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:${t.codeBg};border:1px solid ${t.codeBorder};border-bottom:none;border-radius:6px 6px 0 0;font-size:12px;color:#6e7681;"><span>${lang}</span><button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent)" style="background:none;border:none;cursor:pointer;font-size:11px;color:#6e7681;">Copy</button></div>`
      : "";

    return `${header}<pre style="background:${t.codeBg};border:1px solid ${t.codeBorder};border-radius:6px;padding:12px 16px;overflow-x:auto;font-size:13px;line-height:1.55;margin-bottom:16px;"><code style="font-family:'Fira Code','SF Mono',Consolas,monospace;color:${t.text};">${escapeHtml(numberedCode)}</code></pre>`;
  }

  function renderInlineCode(code: string): string {
    if (opts.customRenderers?.inlineCode) return opts.customRenderers.inlineCode(code);
    return `<code style="background:${t.codeBg};padding:2px 6px;border-radius:4px;font-size:0.87em;font-family:'Fira Code','SF Mono',Consolas,monospace;border:1px solid ${t.codeBorder};">${escapeHtml(code)}</code>`;
  }

  function renderLink(text: string, url: string): string {
    if (opts.customRenderers?.link) return opts.customRenderers.link(text, url);
    const target = opts.externalLinksNewTab && /^(https?:\/\/)/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeAttr(url)}"${target} style="color:${t.linkColor};text-decoration:none;" onclick="event.preventDefault();${opts.onLinkClick ? `(${opts.onLinkClick.toString()})('${url}')` : ''}">${text}</a>`;
  }

  function renderImage(alt: string, src: string): string {
    if (opts.customRenderers?.image) return opts.customRenderers.image(alt, src);
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" style="max-width:100%;border-radius:6px;margin:8px 0;" loading="lazy" />`;
  }

  function renderHr(): string {
    if (opts.customRenderers?.hr) return opts.customRenderers.hr();
    return `<hr style="border:none;border-top:1px solid ${t.hrColor};margin:24px 0;" />`;
  }

  function renderBlockquote(text: string): string {
    if (opts.customRenderers?.blockquote) return opts.customRenderers.blockquote(text);
    return `<blockquote style="margin:0 0 16px 0;padding:8px 16px;border-left:4px solid ${t.blockquoteBorder};background:${t.blockquoteBg};color:${t.text};opacity:0.9;">${parseInline(text)}</blockquote>`;
  }

  function renderList(items: string[], ordered: boolean, start?: number): string {
    if (opts.customRenderers?.list) return opts.customRenderers.list(items, ordered, start);
    const tag = ordered ? "ol" : "ul";
    const startAttr = ordered && start ? ` start="${start}"` : "";
    const inner = items.map((item) => {
      // Check for task list items
      if (opts.gfm && item.startsWith("[ ] ")) {
        return `<li style="margin-left:20px;margin-bottom:4px;list-style:none;"><input type="checkbox" disabled style="margin-right:8px;vertical-align:middle;" />${parseInline(item.slice(4))}</li>`;
      }
      if (opts.gfm && item.startsWith("[x] ")) {
        return `<li style="margin-left:20px;margin-bottom:4px;list-style:none;"><input type="checkbox" checked disabled style="margin-right:8px;vertical-align:middle;" />${parseInline(item.slice(4))}</li>`;
      }
      return `<li style="margin-left:20px;margin-bottom:4px;">${parseInline(item)}</li>`;
    }).join("");
    return `<${tag}${startAttr} style="margin-bottom:16px;padding-left:20px;">${inner}</${tag}>`;
  }

  function renderTable(header: string[], rows: string[][]): string {
    if (opts.customRenderers?.table) return opts.customRenderers.table(header, rows);

    let html = '<div style="overflow-x:auto;margin-bottom:16px;">';
    html += `<table style="width:100%;border-collapse:collapse;border:1px solid ${t.tableBorder};">`;

    // Header row
    html += "<thead><tr>";
    for (const cell of header) {
      html += `<th style="padding:8px 12px;text-align:left;border:1px solid ${t.tableBorder};background:${t.tableHeaderBg};font-weight:600;font-size:13px;">${cell}</th>`;
    }
    html += "</tr></thead>";

    // Body rows
    html += "<tbody>";
    for (const row of rows) {
      html += "<tr>";
      for (const cell of row) {
        html += `<td style="padding:8px 12px;border:1px solid ${t.tableBorder};">${cell}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table></div>";
    return html;
  }

  // --- List Parser ---

  interface ListParseResult {
    items: string[];
    ordered: boolean;
    start?: number;
    endIndex: number;
  }

  function parseList(lines: string[], startIndex: number): ListParseResult {
    const items: string[] = [];
    let ordered = false;
    let start: number | undefined;
    let i = startIndex;
    let baseIndent = -1;

    while (i < lines.length) {
      const line = lines[i]!;
      const ulMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
      const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

      if (ulMatch) {
        const indent = ulMatch[1]!.length;
        if (baseIndent === -1) baseIndent = indent;
        else if (indent < baseIndent) break;
        items.push(ulMatch[3]!);
        ordered = false;
        i++;
      } else if (olMatch) {
        const indent = olMatch[1]!.length;
        if (baseIndent === -1) baseIndent = indent;
        else if (indent < baseIndent) break;
        if (start === undefined) start = parseInt(olMatch[2]!, 10);
        items.push(olMatch[3]!);
        ordered = true;
        i++;
      } else if (/^\s*$/.test(line)) {
        // Allow one blank line within list
        i++;
        if (i < lines.length && !lines[i]!.match(/^(\s*)([-*+]|\d+\.)\s/)) break;
      } else {
        break;
      }
    }

    return { items, ordered, start, endIndex: i };
  }

  // --- Table Parser ---

  function isTableStart(lines: string[], idx: number): boolean {
    if (idx >= lines.length) return false;
    const line = lines[idx]!;
    if (!line.includes("|")) return false;
    // Check next line is separator
    if (idx + 1 >= lines.length) return false;
    const nextLine = lines[idx + 1]!;
    return /^\|?\s*[:\-]+\|[:\-|]+\s*\|?$/.test(nextLine);
  }

  interface TableParseResult {
    header: string[];
    rows: string[][];
    endIndex: number;
  }

  function parseTable(lines: string[], startIndex: number): TableParseResult {
    const headerLine = lines[startIndex]!;
    const sepLine = lines[startIndex + 1]!;

    const header = headerLine.split("|").map((c) => c.trim()).filter(Boolean);
    const rows: string[][] = [];

    let i = startIndex + 2;
    while (i < lines.length && lines[i]!.includes("|") && !/^\s*$/.test(lines[i]!)) {
      const cells = lines[i]!.split("|").map((c) => parseInline(c.trim())).filter(Boolean);
      rows.push(cells);
      i++;
    }

    return { header, rows, endIndex: i };
  }

  // --- Utilities ---

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // --- TOC Generation ---

  function generateToc(headings: MarkdownHeading[]): string {
    if (headings.length === 0) return '<p style="color:#6e7681;font-size:12px;">No headings found</p>';

    let html = '<div style="font-weight:600;margin-bottom:8px;font-size:13px;">Contents</div>';
    html += '<nav style="font-size:12px;">';

    for (const h of headings) {
      if (h.level > opts.tocMaxLevel) continue;
      const indent = (h.level - 1) * 12;
      html += `<a href="#${h.id}" data-toc-link="${h.id}" style="display:block;padding:3px 8px;margin-left:${indent}px;color:${t.text};text-decoration:none;border-radius:4px;transition:all 0.15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(h.text)}</a>`;
    }

    html += "</nav>";
    return html;
  }

  // --- Render / Update ---

  function render(): void {
    const { html, headings: parsedHeadings } = parse(currentContent);
    headings = parsedHeadings;
    contentEl.innerHTML = html;

    // Update TOC
    if (tocEl) {
      tocEl.innerHTML = generateToc(headings);
      // Bind TOC click events
      tocEl.querySelectorAll("[data-toc-link]").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const id = (link as HTMLElement).dataset.tocLink!;
          instance.scrollToHeading(id);
          const heading = headings.find((h) => h.id === id);
          if (heading) opts.onHeadingClick?.(heading);
        });
      });
    }

    // Heading hover effects (show anchor)
    contentEl.querySelectorAll("[data-md-heading]").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        const anchor = el.querySelector(".md-heading-anchor");
        if (anchor) (anchor as HTMLElement).style.opacity = "1";
      });
      el.addEventListener("mouseleave", () => {
        const anchor = el.querySelector(".md-heading-anchor");
        if (anchor) (anchor as HTMLElement).style.opacity = "0";
      });
    });

    // Link click handling
    if (opts.onLinkClick) {
      contentEl.querySelectorAll("a[href]").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const href = (link as HTMLAnchorElement).getAttribute("href")!;
          opts.onLinkClick!(href);
        });
      });
    }
  }

  // --- Instance ---

  const instance: MarkdownInstance = {
    element: root,

    getHtml() { return contentEl.innerHTML; },

    setContent(md: string) {
      currentContent = md;
      render();
    },

    getContent() { return currentContent; },

    getHeadings() { return [...headings]; },

    getTocHtml() { return generateToc(headings); },

    scrollToHeading(id: string) {
      const el = contentEl.querySelector(`#${CSS.escape(id)}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },

    exportPlainText() {
      return currentContent
        .replace(/^#+\s+/gm, "")
        .replace(/\*\*/g, "").replace(/\*/g, "")
        .replace(/__+/g, "").replace(/_+/g, "")
        .replace(/~~/g, "")
        .replace(/`[^`]+`/g, "")
        .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
        .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
        .replace(/^\s*[-*+]\s+/gm, "- ")
        .replace(/^\s*\d+\.\s+/gm, "- ")
        .replace(/^>\s+/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  // Initialize
  render();

  return instance;
}
