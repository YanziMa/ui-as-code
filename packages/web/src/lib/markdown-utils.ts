/**
 * Markdown Utilities: Lightweight markdown parser/renderer, GFM support,
 * syntax highlighting integration, table of contents generation, sanitization,
 * heading anchor links, code block extraction, and markdown-to-HTML conversion.
 */

// --- Types ---

export interface MarkdownOptions {
  /** Enable GitHub Flavored Markdown extensions */
  gfm?: boolean;
  /** Sanitize HTML output (strip dangerous tags) */
  sanitize?: boolean;
  /** Generate heading IDs for anchors */
  headingAnchors?: boolean;
  /** Custom class for the root element */
  className?: string;
  /** Line break mode: "spaced" (require blank line) or "github" (trailing space) */
  lineBreaks?: "spaced" | "github";
  /** Maximum depth for nested lists */
  maxListDepth?: number;
  /** Called when a link is clicked */
  onLinkClick?: (href: string) => void | boolean;
}

export interface HeadingInfo {
  level: number; // 1-6
  text: string;
  id: string;
}

// --- Core Parser ---

/**
 * Parse markdown string to HTML.
 *
 * @example
 * ```ts
 * const html = parseMarkdown("# Hello\n\nThis is **bold** text.");
 * container.innerHTML = html;
 * ```
 */
export function parseMarkdown(md: string, options: MarkdownOptions = {}): string {
  const {
    gfm = true,
    sanitize = true,
    headingAnchors = true,
    lineBreaks = "github",
    maxListDepth = 10,
  } = options;

  let html = md;

  // Escape HTML entities first (unless we want to allow raw HTML)
  if (sanitize) {
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Code blocks (fenced ``` ... ```) — must be before inline code
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = sanitize ? escapeHtml(code) : code;
    return `<pre><code class="language-${lang || 'text'}">${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Headings with optional anchors
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes, text) => {
    const level = hashes.length;
    const id = headingAnchors ? slugify(text) : "";
    const anchorAttr = id ? ` id="${id}"` : "";
    return `<h${level}${anchorAttr}>${text}</h${level}>`;
  });

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough (GFM)
  if (gfm) {
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  }

  // Blockquotes
  html = html.replace(/^(&gt;|>)\s+(.+)$/gm, "<blockquote>$2</blockquote>");
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, "\n");

  // Horizontal rules
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, "<hr />");

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered lists
  html = _parseLists(html, maxListDepth);

  // Tables (GFM)
  if (gfm) {
    html = _parseTables(html);
  }

  // Paragraphs (lines not already wrapped in block elements)
  html = html.split("\n\n").map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|table|img|div)/.test(trimmed)) return trimmed;
    return `<p>${trimmed}</p>`;
  }).join("\n\n");

  // Line breaks
  if (lineBreaks === "github") {
    html = html.replace(/\n/g, "<br />\n");
  } else {
    html = html.replace(/ {2}\n/g, "<br />\n");
  }

  return html;
}

/** Render markdown into a container element */
export function renderMarkdown(
  md: string,
  container: HTMLElement,
  options: MarkdownOptions = {},
): HTMLElement {
  const html = parseMarkdown(md, options);
  const wrapper = document.createElement("div");
  wrapper.className = `markdown-body ${options.className ?? ""}`.trim();
  wrapper.innerHTML = html;

  // Handle link clicks
  if (options.onLinkClick) {
    wrapper.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target) {
        e.preventDefault();
        options.onLinkClick!(target.getAttribute("href") ?? "");
      }
    });
  }

  container.appendChild(wrapper);
  return wrapper;
}

// --- Table of Contents ---

/** Extract headings from markdown text */
export function extractHeadings(md: string): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  const lines = md.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2]!.trim(),
        id: slugify(match[2]!.trim()),
      });
    }
  }

  return headings;
}

/** Generate a table of contents HTML from headings */
export function generateToc(headings: HeadingInfo[], options?: {
  maxDepth?: number;
  minDepth?: number;
  className?: string;
}): string {
  const maxDepth = options?.maxDepth ?? 3;
  const minDepth = options?.minDepth ?? 1;
  const className = options?.className ?? "";

  const filtered = headings.filter(
    (h) => h.level >= minDepth && h.level <= maxDepth,
  );

  if (filtered.length === 0) return "";

  let html = `<ul class="toc ${className}">\n`;
  for (const h of filtered) {
    const indent = "  ".repeat(h.level - minDepth);
    html += `${indent}<li><a href="#${h.id}">${escapeHtml(h.text)}</a></li>\n`;
  }
  html += "</ul>";

  return html;
}

// --- Code Extraction ---

/** Extract all code blocks from markdown */
export function extractCodeBlocks(md: string): Array<{ language: string; code: string }> {
  const blocks: Array<{ language: string; code: string }> = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(md)) !== null) {
    blocks.push({
      language: match[1] || "text",
      code: match[2]!.trim(),
    });
  }

  return blocks;
}

/** Extract a specific named code block (from annotations like ```ts filename.ts) */
export function extractNamedBlock(md: string, name: string): string | null {
  const blocks = extractCodeBlocks(md);
  for (const block of blocks) {
    // Check if the first line contains the name as a comment or annotation
    const firstLine = block.code.split("\n")[0];
    if (firstLine?.includes(name)) return block.code;
  }
  return null;
}

// --- Helpers ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function _parseLists(html: string, maxDepth: number): string {
  const lines = html.split("\n");
  const result: string[] = [];
  const listStack: Array<{ type: "ul" | "ol"; depth: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);

    if (listMatch) {
      const indent = listMatch[1].length;
      const marker = listMatch[2]!;
      const content = listMatch[3]!;
      const depth = Math.floor(indent / 2) + 1;
      const isOrdered = /^\d+\./.test(marker);
      const tag = isOrdered ? "ol" : "ul";

      // Close lists that are no longer needed
      while (
        listStack.length > 0 &&
        listStack[listStack.length - 1]!.depth >= depth
      ) {
        const prev = listStack.pop()!;
        result.push(`</${prev.type}>`);
      }

      // Open new list if needed
      if (listStack.length === 0 || listStack[listStack.length - 1]!.depth < depth) {
        if (depth <= maxDepth) {
          result.push(`<${tag}>`);
          listStack.push({ type: tag as "ul" | "ol", depth });
        }
      }

      result.push(`<li>${content}</li>`);
    } else {
      // Close any open lists
      while (listStack.length > 0) {
        const prev = listStack.pop()!;
        result.push(`</${prev.type}>`);
      }
      result.push(line);
    }
  }

  // Close remaining lists
  while (listStack.length > 0) {
    const prev = listStack.pop()!;
    result.push(`</${prev.type}>`);
  }

  return result.join("\n");
}

function _parseTables(html: string): string {
  // Match GFM tables: | header | header |\n | ------ | ------ |\n | cell   | cell   |
  const tableRegex =
    /(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)+)/g;

  return html.replace(tableRegex, (_match, headerLine, separatorLine, bodyLines) => {
    const headers = headerLine.split("|").filter((c) => c.trim()).map((c) => c.trim());
    const aligns = separatorLine.split("|").filter((c) => c.trim()).map((c) => {
      const s = c.trim();
      if (s.startsWith(":") && s.endsWith(":")) return "center";
      if (s.endsWith(":")) return "right";
      return "left";
    });

    let tableHtml = "<table>\n<thead>\n<tr>\n";
    headers.forEach((h, idx) => {
      const align = aligns[idx] ? ` style="text-align:${aligns[idx]}"` : "";
      tableHtml += `<th${align}>${escapeHtml(h)}</th>\n`;
    });
    tableHtml += "</tr>\n</thead>\n<tbody>\n";

    const rows = bodyLines.trim().split("\n");
    for (const row of rows) {
      const cells = row.split("|").filter((c) => c.trim());
      if (cells.length === 0) continue;
      tableHtml += "<tr>\n";
      cells.forEach((cell, idx) => {
        const align = aligns[idx] ? ` style="text-align:${aligns[idx]}"` : "";
        tableHtml += `<td${align>${cell.trim()}</td>\n`;
      });
      tableHtml += "</tr>\n";
    }

    tableHtml += "</tbody>\n</table>";
    return tableHtml;
  });
}
