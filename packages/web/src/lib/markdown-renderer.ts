/**
 * Markdown Renderer: Lightweight markdown-to-HTML converter with GFM support,
 * code syntax highlighting integration, sanitization, table of contents,
 * and customizable rendering options.
 */

// --- Types ---

export interface MdRenderOptions {
  /** Source markdown string */
  source?: string;
  /** Target container (renders into this) */
  container?: HTMLElement | string;
  /** Enable GFM tables? */
  gfmTables?: boolean;
  /** Enable task lists? */
  taskLists?: boolean;
  /** Enable strikethrough? */
  strikethrough?: boolean;
  /** Autolink URLs? */
  autolink?: boolean;
  /** Line wrapping on output? */
  lineWrap?: boolean;
  /** Code block theme for inline highlighting */
  codeTheme?: string;
  /** Show copy button on code blocks? */
  codeCopyButton?: boolean;
  /** Heading anchor prefix */
  headingAnchorPrefix?: string;
  /** Max heading depth for TOC */
  tocMaxDepth?: number;
  /** Custom CSS class on root element */
  className?: string;
  /** Callback after render */
  onRender?: (html: string) => void;
}

export interface MdRendererInstance {
  element: HTMLElement | null;
  setSource: (md: string) => void;
  getHtml: () => string;
  getToc: () => TocEntry[];
  destroy: () => void;
}

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

// --- Block-level Parser ---

interface Block {
  type: string;
  content: string;
  meta?: Record<string, string>;
  children?: Block[];
}

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty lines
    if (!line.trim()) { i++; continue; }

    // Fenced code
    const fenceMatch = line.match(/^(`{3,}(\w*)?\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || "";
      let code = "";
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code += lines[i] + "\n";
        i++;
      }
      blocks.push({ type: "code", content: code.trimEnd(), meta: { lang } });
      i++;
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      blocks.push({ type: "heading", content: hMatch[2].trim(), meta: { level: String(hMatch[1].length) } });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr", content: "" }));
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      let quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].slice(1).replace(/^\s+/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join("\n"), children: parseBlocks(quoteLines.join("\n")) });
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+[-|:\s]*$/.test(lines[i + 1])) {
      const tblLines: string[] = [line];
      i++;
      tblLines.push(lines[i]); // separator
      i++;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        tblLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", content: tblLines.join("\n") });
      continue;
    }

    // Unordered list
    if (/^(\s*)([*+-])\s/.test(line)) {
      const items: string[] = [];
      const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
      while (i < lines.length && lines[i].match(new RegExp(`^\\s{${indent}}([*+-])\\s`))) {
        items.push(lines[i]!.replace(/^\s*([*+-])\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "ulist", content: items.join("\n") });
      continue;
    }

    // Ordered list
    if (/^(\s*)\d+\.\s/.test(line)) {
      const items: string[] = [];
      const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
      while (i < lines.length && lines[i].match(new RegExp(`^\\s{${indent}}\\d+\\.\\s`))) {
        items.push(lines[i]!.replace(/^\s*\d+.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "olist", content: items.join("\n") });
      continue;
    }

    // Paragraph (collect until empty or block)
    let paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() &&
      !lines[i].match(/^(#{1,6}\s|[-*+]|\d+\.\s|>|`{3,}|\|)/)) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", content: paraLines.join("\n") });
    }
  }

  return blocks;
}

// --- Inline Renderer ---

function renderInline(text: string, opts: MdRenderOptions): string {
  let result = escapeHtml(text);

  // Escape already-processed HTML
  result = result.replace(/&lt;(?!\/)/g, "<").replace(/&gt;/g, ">");

  // Autolink URLs
  if (opts.autolink !== false) {
    result = result.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  }

  // Bold **text**
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic *text*
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

  // Strikethrough ~~text~~
  if (opts.strikethrough !== false) {
    result = result.replace(/~~(.+?)~~/g, "<del>$1</del>");
  }

  // Inline `code`
  result = result.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Image ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy"/>');

  // Link [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return result;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Block Renderer ---

function renderBlock(block: Block, opts: MdRenderOptions): string {
  switch (block.type) {
    case "heading": {
      const level = parseInt(block.meta?.level ?? "1");
      const id = slugify(block.content);
      const prefix = opts.headingAnchorPrefix ?? "";
      return `<h${level} id="${prefix}${id}">${renderInline(block.content, opts)}</h${level}>`;
    }

    case "paragraph":
      return `<p>${renderInline(block.content, opts)}</p>`;

    case "code": {
      const lang = block.meta?.lang || "text";
      const copyBtn = opts.codeCopyButton
        ? `<button class="md-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent)">Copy</button>`
        : "";
      return `<pre><code class="language-${lang}" data-lang="${lang}">${escapeHtml(block.content)}</code>${copyBtn}</pre>`;
    }

    case "blockquote": {
      const inner = block.children ? block.children.map(c => renderBlock(c, opts)).join("") : renderInline(block.content, opts);
      return `<blockquote>${inner}</blockquote>`;
    }

    case "table":
      return renderTable(block.content, opts);

    case "ulist": {
      const items = block.content.split("\n");
      const lis = items.map(item => {
        const checked = opts.taskLists && /^\[[ xX]\]/.test(item)
          ? ' checked=""' : "";
        const cleanItem = item.replace(/^\[[ xX]\]\s*/, "");
        return `<li${checked}>${renderInline(cleanItem, opts)}</li>`;
      });
      return `<ul>${lis.join("")}</ul>`;
    }

    case "olist": {
      const items = block.content.split("\n");
      const lis = items.map(item => `<li>${renderInline(item, opts)}</li>`);
      return `<ol>${lis.join("")}</ol>`;
    }

    case "hr":
      return "<hr />";

    default:
      return `<p>${escapeHtml(block.content)}</p>`;
  }
}

function renderTable(tableStr: string, _opts: MdRenderOptions): string {
  const rows = tableStr.split("\n").filter(r => r.trim());
  if (rows.length < 2) return "";

  const parseCells = (row: string) => row.split("|").map(c => c.trim()).filter(Boolean);

  const headerCells = parseCells(rows[0]);
  const isSep = rows[1]?.includes("---") ?? false;
  const dataRows = isSep ? rows.slice(2) : rows.slice(1);

  let html = "<table><thead><tr>";
  for (const cell of headerCells) {
    html += `<th>${renderInline(cell, {})}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (const row of dataRows) {
    html += "<tr>";
    for (const cell of parseCells(row)) {
      html += `<td>${renderInline(cell, {})}</td>`;
    }
    html += "</tr>";
  }

  html += "</tbody></table>";
  return html;
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- TOC Generator ---

function generateToc(blocks: Block[], maxDepth = 6): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const b of blocks) {
    if (b.type === "heading") {
      const level = parseInt(b.meta?.level ?? "1");
      if (level <= maxDepth) {
        entries.push({
          level,
          text: b.content,
          id: slugify(b.content),
        });
      }
    }
  }
  return entries;
}

function renderTocHtml(entries: TocEntry[]): string {
  if (entries.length === 0) return "";
  const items = entries.map(e =>
    `<li style="margin-left:${(e.level - 1) * 16}px"><a href="#${e.id}">${e.text}</a></li>`
  ).join("");
  return `<nav class="md-toc"><ul>${items}</ul></nav>`;
}

// --- Main Factory ---

export function createMarkdownRenderer(options: MdRenderOptions): MdRendererInstance {
  const opts = {
    gfmTables: options.gfmTables ?? true,
    taskLists: options.taskLists ?? true,
    strikethrough: options.strikethrough ?? true,
    autolink: options.autolink ?? true,
    lineWrap: options.lineWrap ?? false,
    codeCopyButton: options.codeCopyButton ?? true,
    headingAnchorPrefix: options.headingAnchorPrefix ?? "",
    tocMaxDepth: options.tocMaxDepth ?? 6,
    className: options.className ?? "",
    ...options,
  };

  let rootEl: HTMLElement | null = null;
  let destroyed = false;

  function getSource(): string {
    return opts.source ?? "";
  }

  function render(): string {
    const source = getSource();
    const blocks = parseBlocks(source);

    let html = "";

    // Inject base styles
    html += `<style>
.md-renderer{font-family:-apple-system,sans-serif;color:#374151;line-height:1.7;}
.md-renderer h1,.md-renderer h2,.md-renderer h3,.md-renderer h4,.md-renderer h5,.md-renderer h6{color:#111827;font-weight:700;margin-top:1.5em;margin-bottom:0.5em;}
.md-renderer p{margin:1em 0;}
.md-renderer ul,.md-renderer ol{padding-left:1.5em;margin:1em 0;}
.md-renderer li{margin-bottom:0.25em;}
.md-renderer blockquote{border-left:3px solid #d1d5db;padding:0.5em 1em;margin:1em 0;background:#f9fafb;border-radius:0 4px 4px 0;color:#6b7280;}
.md-renderer hr{border:none;border-top:1px solid #e5e7eb;margin:2em 0;}
.md-renderer table{border-collapse:collapse;width:100%;margin:1em 0;border:1px solid #e5e7eb;}
.md-renderer th,.md-renderer td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;}
.md-renderer th{background:#f9fafb;font-weight:600;}
.md-renderer pre{background:#1e1e2e;border-radius:8px;padding:14px;overflow-x:auto;margin:1em 0;}
.md-renderer code{font-family:'SF Mono','Fira Code',Consolas,monospace;font-size:13px;color:#cdd6f4;}
.md-renderer .md-inline-code{background:#f3f4f6;padding:2px 5px;border-radius:4px;font-size:0.9em;color:#e06c8a;}
.md-renderer img{max-width:100%;border-radius:6px;margin:0.5em 0;}
.md-renderer a{color:#4338ca;text-decoration:none;}
.md-renderer a:hover{text-decoration:underline;}
.md-renderer del{color:#9ca3af;}
.md-copy-btn{float:right;padding:2px 10px;border:1px solid #4338ca;border-radius:4px;background:none;color:#4338ca;cursor:pointer;font-size:11px;margin-top:4px;}
.md-copy-btn:hover{background:#4338ca;color:#fff;}
.md-toc{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:16px;}
.md-toc ul{list-style:none;padding-left:0;}
.md-toc li{font-size:13px;color:#4b5563;padding:2px 0;}
.md-toc a{color:#4338ca;text-decoration:none;}
.md-toc a:hover{text-decoration:underline;}
</style>`;

    html += `<div class="md-renderer ${opts.className}">`;

    for (const block of blocks) {
      html += renderBlock(block, opts);
    }

    html += "</div>";

    return html;
  }

  // If container provided, render into it
  if (options.container) {
    const el = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
    if (el) {
      rootEl = el;
      el.innerHTML = render();
    }
  }

  const toc = generateToc(parseBlocks(getSource()), opts.tocMaxDepth);

  const instance: MdRendererInstance = {
    element: rootEl,

    setSource(md: string) {
      opts.source = md;
      if (rootEl) rootEl.innerHTML = render();
      opts.onRender?.(instance.getHtml());
    },

    getHtml() {
      return render();
    },

    getToc() {
      return toc;
    },

    destroy() {
      destroyed = true;
      if (rootEl) rootEl.innerHTML = "";
    },
  };

  // Initial render
  if (opts.source) {
    const html = render();
    opts.onRender?.(html);
  }

  return instance;
}
