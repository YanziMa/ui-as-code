/**
 * Markdown Processor: Full-featured Markdown parser and renderer with
 * CommonMark + GFM (GitHub Flavored Markdown) support, syntax highlighting,
 * front matter extraction, table of contents generation, heading anchors,
 * custom extensions, HTML sanitization, AST representation, and
 * pluggable renderer backends.
 */

// --- Types ---

export type MdNodeType =
  | "document" | "heading" | "paragraph" | "text" | "bold" | "italic"
  | "strikethrough" | "code" | "code_block" | "link" | "image"
  | "list" | "list_item" | "blockquote" | "thematic_break" | "html_block"
  | "table" | "table_row" | "table_cell" | "task_item" | "footnote_ref"
  | "footnote_def" | "front_matter";

export interface MdNode {
  type: MdNodeType;
  content?: string;              // Raw text for text/code nodes
  children?: MdNode[];           // Child nodes
  depth?: number;                // Heading level / list depth
  url?: string;                  // Link/image URL
  title?: string;                // Link/image title / alt text
  align?: "left" | "center" | "right"; // Table cell alignment
  checked?: boolean;             // Task list item
  lang?: string;                 // Code block language
  info?: string;                 // Code fence info string
  ordered?: boolean;             // Ordered vs unordered list
  start?: number;                // Ordered list start number
  loose?: boolean;               // Loose vs tight list
  sourcePos?: { start: [number, number]; end: [number, number] }; // Line:col
  metadata?: Record<string, unknown>;
}

export interface TocEntry {
  id: string;
  text: string;
  level: number;
  children: TocEntry[];
}

export interface FrontMatter {
  [key: string]: unknown;
}

export interface ParseOptions {
  /** Enable GFM features (tables, strikethrough, task lists, autolinks) */
  gfm?: boolean;
  /** Enable footnotes */
  footnotes?: boolean;
  /** Enable front matter (YAML) */
  frontMatter?: boolean;
  /** Max nesting depth to prevent DoS */
  maxDepth?: number;
  /** Custom extensions */
  extensions?: MdExtension[];
}

export interface RenderOptions {
  /** Output format */
  format?: "html" | "ast" | "text";
  /** Add IDs to headings */
  headingAnchors?: boolean;
  /** Generate TOC */
  toc?: boolean;
  /** Sanitize HTML output */
  sanitize?: boolean;
  /** CSS class prefix for generated elements */
  classPrefix?: string;
  /** Code highlighting callback */
  codeHighlighter?: (code: string, language: string) => string;
  /** Custom renderers per node type */
  renderers?: Partial<Record<MdNodeType, (node: MdNode) => string>>;
}

export interface MdExtension {
  name: string;
  pattern: RegExp;
  render: (match: RegExpMatchArray) => MdNode | string;
  priority?: number;
}

// --- Slug Generator ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- Inline Parser ---

function parseInline(text: string, options: ParseOptions): MdNode[] {
  const nodes: MdNode[] = [];
  let i = 0;

  while (i < text.length) {
    // Bold (** or __)
    if ((text[i] === "*" && text[i + 1] === "*") || (text[i] === "_" && text[i + 1] === "_")) {
      const marker = text.slice(i, i + 2);
      const endIdx = text.indexOf(marker, i + 2);
      if (endIdx !== -1) {
        const inner = text.slice(i + 2, endIdx);
        nodes.push({ type: "bold", children: parseInline(inner, options) });
        i = endIdx + 2;
        continue;
      }
    }

    // Italic (* or _)
    if (text[i] === "*" || text[i] === "_") {
      const marker = text[i];
      let j = i + 1;
      while (j < text.length && text[j] !== marker && text[j] !== " ") j++;
      if (j < text.length && text[j] === marker && j > i + 1) {
        const inner = text.slice(i + 1, j);
        nodes.push({ type: "italic", children: parseInline(inner, options) });
        i = j + 1;
        continue;
      }
    }

    // Strikethrough (GFM)
    if (options.gfm !== false && text[i] === "~" && text[i + 1] === "~") {
      const endIdx = text.indexOf("~~", i + 2);
      if (endIdx !== -1) {
        const inner = text.slice(i + 2, endIdx);
        nodes.push({ type: "strikethrough", children: parseInline(inner, options) });
        i = endIdx + 2;
        continue;
      }
    }

    // Code (`)
    if (text[i] === "`") {
      const endIdx = text.indexOf("`", i + 1);
      if (endIdx !== -1) {
        nodes.push({ type: "code", content: text.slice(i + 1, endIdx) });
        i = endIdx + 1;
        continue;
      }
    }

    // Link [text](url "title")
    if (text[i] === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const linkUrl = text.slice(closeBracket + 2, closeParen).trim();
          const titleMatch = linkUrl.match(/^(.+?)\s+"(.+)"$/);
          nodes.push({
            type: "link",
            children: parseInline(linkText, options),
            url: titleMatch ? titleMatch[1] : linkUrl,
            title: titleMatch?.[2],
          });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // Image ![alt](url)
    if (text[i] === "!" && text[i + 1] === "[") {
      const closeBracket = text.indexOf("]", i + 2);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          nodes.push({
            type: "image",
            url: text.slice(closeBracket + 2, closeParen).trim().split(/\s+/)[0] ?? "",
            title: text.slice(i + 2, closeBracket),
          });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // Autolink (GFM)
    if (options.gfm !== false) {
      const autoLinkMatch = text.slice(i).match(/^(https?:\/\/[^\s]+|www\.[^\s]+)/);
      if (autoLinkMatch) {
        nodes.push({ type: "link", children: [{ type: "text", content: autoLinkMatch[0] }], url: autoLinkMatch[0] });
        i += autoLinkMatch[0].length;
        continue;
      }
    }

    // Plain text accumulation
    let textEnd = i + 1;
    while (textEnd < text.length) {
      const ch = text[textEnd];
      if (ch === "*" || ch === "_" || ch === "`" || ch === "[" || ch === "!" ||
          (ch === "~" && text[textEnd + 1] === "~") ||
          (ch === "h" && text.slice(textEnd).startsWith("http"))) break;
      textEnd++;
    }

    if (textEnd > i) {
      nodes.push({ type: "text", content: text.slice(i, textEnd) });
      i = textEnd;
    } else {
      nodes.push({ type: "text", content: text[i] });
      i++;
    }
  }

  return nodes;
}

// --- Block Parser ---

function parseBlocks(lines: string[], options: ParseOptions): MdNode[] {
  const nodes: MdNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Front matter
    if (i === 0 && line.startsWith("---") && options.frontMatter !== false) {
      const endIdx = lines.indexOf("---", 1);
      if (endIdx !== -1) {
        const fmContent = lines.slice(1, endIdx).join("\n");
        nodes.push({ type: "front_matter", content: fmContent });
        i = endIdx + 1;
        continue;
      }
    }

    // Heading (# ## ### etc.)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      nodes.push({
        type: "heading",
        depth: headingMatch[1].length,
        children: parseInline(headingMatch[2], options),
      });
      i++;
      continue;
    }

    // Thematic break (---, ***, ___)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push({ type: "thematic_break" });
      i++;
      continue;
    }

    // Code fence (``` or ~~~)
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)/);
    if (fenceMatch) {
      const fenceChar = fenceMatch[1][0];
      const lang = fenceMatch[2]?.trim();
      const endPattern = new RegExp(`^${fenceChar}{3,}\\s*$`);
      let j = i + 1;
      while (j < lines.length && !endPattern.test(lines[j])) j++;
      const codeLines = lines.slice(i + 1, j);
      nodes.push({
        type: "code_block",
        content: codeLines.join("\n"),
        lang,
        info: lang,
      });
      i = j + 1;
      continue;
    }

    // Blockquote (>)
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      let j = i;
      while (j < lines.length && (lines[j].startsWith(">") || (lines[j].trim() === "" && j + 1 < lines.length && lines[j + 1].startsWith(">")))) {
        quoteLines.push(lines[j].replace(/^>\s?/, ""));
        j++;
      }
      nodes.push({ type: "blockquote", children: parseBlocks(quoteLines, options) });
      i = j;
      continue;
    }

    // Table (GFM)
    if (options.gfm !== false && line.includes("|") && i + 1 < lines.length && /^\|?\s*[:\-]+\|/.test(lines[i + 1])) {
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].includes("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      nodes.push(parseTable(tableLines, options));
      i = j;
      continue;
    }

    // List (-, *, +, or numbered)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)/);
    if (listMatch) {
      const listItems: Array<{ raw: string; indent: number; ordered: boolean; checked?: boolean }> = [];
      const baseIndent = listMatch[1].length;
      let j = i;

      while (j < lines.length) {
        const itemMatch = lines[j].match(/^(\s*)([-*+]|\d+\.)\s+(.*)/);
        if (!itemMatch || itemMatch[1].length < baseIndent) break;

        const isTask = options.gfm !== false && itemMatch[3].match(/^\[[ xX]\]\s*/);
        listItems.push({
          raw: lines[j],
          indent: itemMatch[1].length,
          ordered: /\d+\./.test(itemMatch[2]),
          checked: isTask ? /[xX]/.test(isTask[0]) : undefined,
        });
        j++;
      }

      nodes.push(parseList(listItems, options));
      i = j;
      continue;
    }

    // HTML block
    if (line.startsWith("<") && (line.startsWith("<div") || line.startsWith("<script") || line.startsWith("<style"))) {
      const htmlLines: string[] = [];
      let j = i;
      htmlLines.push(line);
      j++;
      while (j < lines.length && !lines[j].startsWith("</")) {
        htmlLines.push(lines[j]);
        j++;
      }
      if (j < lines.length) { htmlLines.push(lines[j]); j++; }
      nodes.push({ type: "html_block", content: htmlLines.join("\n") });
      i = j;
      continue;
    }

    // Paragraph (one or more consecutive non-blank lines)
    if (line.trim() !== "") {
      const paraLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim() !== "" &&
             !lines[j].match(/^(#{1,6}\s|[-*+]\s|\d+\.\s|>|`{3,}|-{3,}|\|)/)) {
        paraLines.push(lines[j]);
        j++;
      }
      nodes.push({ type: "paragraph", children: parseInline(paraLines.join("\n"), options) });
      i = j;
      continue;
    }

    i++; // Skip blank lines
  }

  return nodes;
}

/** Parse a GFM table from pipe-delimited lines */
function parseTable(tableLines: string[], options: ParseOptions): MdNode {
  const rows: MdNode[] = [];

  for (let ri = 0; ri < tableLines.length; ri++) {
    const cells = tableLines[ri]!.split("|").filter((c) => c.trim() !== "" || true).map((c) => c.trim());

    if (ri === 1) continue; // Skip separator row

    const isHeader = ri === 0;
    const parsedCells: MdNode[] = cells.map((cell) => ({
      type: "table_cell" as const,
      children: ri === 0 ? [] : parseInline(cell, options),
      align: undefined as "left" | "center" | "right" | undefined,
      content: cell,
    }));

    // Detect alignment from separator row
    if (ri === 1) {
      const sepCells = tableLines[1]!.split("|").filter((c) => c.trim() !== "").map((c) => c.trim());
      for (let ci = 0; ci < Math.min(sepCells.length, parsedCells.length); ci++) {
        const sep = sepCells[ci];
        if (sep?.startsWith(":") && sep?.endsWith(":")) parsedCells[ci]!.align = "center";
        else if (sep?.endsWith(":")) parsedCells[ci]!.align = "right";
        else if (sep?.startsWith(":")) parsedCells[ci]!.align = "left";
      }
      continue;
    }

    rows.push({ type: "table_row", children: parsedCells });
  }

  return { type: "table", children: rows };
}

/** Parse list items into a list node */
function parseList(
  items: Array<{ raw: string; indent: number; ordered: boolean; checked?: boolean }>,
  options: ParseOptions,
): MdNode {
  const children: MdNode[] = [];

  for (const item of items) {
    const content = item.raw.replace(/^\s*([-*+]|\d+\.)\s+(\[[ xX]\]\s*)?/, "");
    const child: MdNode = item.checked !== undefined
      ? { type: "task_item", checked: item.checked, children: parseInline(content, options) }
      : { type: "list_item", children: parseInline(content, options) };
    children.push(child);
  }

  return {
    type: "list",
    ordered: items[0]?.ordered ?? false,
    start: items[0]?.ordered ? parseInt(items[0]!.raw.match(/\d+/)?.[0] ?? "1") : undefined,
    children,
  };
}

// --- Front Matter Parser ---

function parseFrontMatter(raw: string): FrontMatter {
  const result: FrontMatter = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^(\w[\w\s-]*?)\s*:\s*(.+)$/);
    if (match) {
      const key = match[1]!.trim();
      let value: unknown = match[2]!.trim();
      // Try to parse as JSON (handles strings, numbers, booleans, arrays)
      try { value = JSON.parse(value as string); } catch {}
      result[key] = value;
    }
  }
  return result;
}

// --- Renderer ---

function renderHtml(node: MdNode, options: RenderOptions): string {
  const p = options.classPrefix ?? "";

  switch (node.type) {
    case "document":
      return (node.children ?? []).map((c) => renderHtml(c, options)).join("\n");

    case "heading": {
      const tag = `h${node.depth}`;
      const id = options.headingAnchors ? ` id="${slugify(node.children?.map((c) => c.content ?? "").join("") ?? "")}"` : "";
      return `<${tag}${id} class="${p}${tag}">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</${tag}>`;
    }

    case "paragraph":
      return `<p class="${p}p">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</p>`;

    case "text":
      return escapeHtml(node.content ?? "");

    case "bold":
      return `<strong class="${p}strong">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</strong>`;

    case "italic":
      return `<em class="${p}em">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</em>`;

    case "strikethrough":
      return `<del class="${p}del">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</del>`;

    case "code":
      return `<code class="${p}inline-code">${escapeHtml(node.content ?? "")}</code>`;

    case "code_block": {
      let code = escapeHtml(node.content ?? "");
      if (options.codeHighlighter && node.lang) {
        code = options.codeHighlighter(node.content ?? "", node.lang!);
      }
      return `<pre class="${p}pre"><code class="${p}code ${node.lang ? `language-${node.lang}` : ""}">${code}\n</code></pre>`;
    }

    case "link":
      return `<a href="${escapeHtml(node.url ?? "")}"${node.title ? ` title="${escapeHtml(node.title)}"` : ""} class="${p}a">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</a>`;

    case "image":
      return `<img src="${escapeHtml(node.url ?? "")}" alt="${escapeHtml(node.title ?? "")}" class="${p}img}" />`;

    case "list": {
      const tag = node.ordered ? "ol" : "ul";
      const attrs = node.start ? ` start="${node.start}"` : "";
      return `<${tag}${attrs} class="${p}${tag}">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</${tag}>`;
    }

    case "list_item":
      return `<li class="${p}li">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</li>`;

    case "task_item":
      return `<li class="${p}li task-list-item"><input type="checkbox" ${node.checked ? "checked" : ""} disabled /> ${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</li>`;

    case "blockquote":
      return `<blockquote class="${p}blockquote">${(node.children ?? []).map((c) => renderHtml(c, options)).join("")}</blockquote>`;

    case "thematic_break":
      return `<hr class="${p}hr}" />`;

    case "html_block":
      return options.sanitize ? sanitizeHtml(node.content ?? "") : (node.content ?? "");

    case "table": {
      const hasHeader = node.children?.[0];
      return `<table class="${p}table">${hasHeader ? "<thead>" + (node.children![0]!.children ?? []).map((c) =>
        `<th class="${p}th" style="text-align:${c.align ?? "left"}">${renderHtml(c, options)}</th>`
      ).join("") + "</thead>" : ""}<tbody>${(node.children ?? []).slice(hasHeader ? 1 : 0).map((row) =>
        `<tr class="${p}tr">${(row.children ?? []).map((c) =>
          `<td class="${p}td" style="text-align:${c.align ?? "left"}">${renderHtml(c, options)}</td>`
        ).join("")}</tr>`
      ).join("")}</tbody></table>`;
    }

    case "table_row":
      return (node.children ?? []).map((c) => renderHtml(c, options)).join("");

    case "table_cell":
      return (node.children ?? []).map((c) => renderHtml(c, options)).join("");

    default:
      return "";
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sanitizeHtml(html: string): string {
  // Basic sanitization: remove script tags, event handlers, javascript: URLs
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
}

// --- TOC Generation ---

function generateToc(nodes: MdNode[]): TocEntry[] {
  const entries: TocEntry[] = [];

  function walk(children: MdNode[] | undefined, parentEntries: TocEntry[]): void {
    if (!children) return;
    for (const node of children) {
      if (node.type === "heading" && node.depth) {
        const text = (node.children ?? []).map((c) => c.content ?? "").join("");
        const entry: TocEntry = {
          id: slugify(text),
          text,
          level: node.depth,
          children: [],
        };
        parentEntries.push(entry);

        // Nest under appropriate parent based on level
        if (parentEntries.length > 1) {
          const lastParent = parentEntries[parentEntries.length - 2]!;
          if (lastParent.level < entry.level) {
            parentEntries.pop();
            lastParent.children!.push(entry);
            parentEntries.push(entry);
          }
        }
      }
      walk(node.children, parentEntries);
    }
  }

  walk(nodes, entries);
  return flattenToc(entries);
}

function flattenToc(entries: TocEntry[]): TocEntry[] {
  const result: TocEntry[] = [];
  for (const entry of entries) {
    result.push({ ...entry, children: flattenToc(entry.children) });
  }
  return result;
}

// --- Public API ---

/**
 * Parse markdown text into an AST.
 */
export function parse(markdown: string, options: ParseOptions = {}): MdNode {
  const lines = markdown.split("\n");
  const children = parseBlocks(lines, {
    gfm: true,
    footnotes: false,
    frontMatter: true,
    maxDepth: 50,
    ...options,
  });

  return { type: "document", children };
}

/**
 * Render markdown to the specified format.
 */
export function render(markdown: string, options: RenderOptions & ParseOptions = {}): string {
  const ast = parse(markdown, options);
  const format = options.format ?? "html";

  if (format === "ast") return JSON.stringify(ast, null, 2);
  if (format === "text") return extractText(ast);

  let html = renderHtml(ast, options);

  // Generate TOC if requested
  if (options.toc) {
    const toc = generateToc(ast.children);
    const tocHtml = '<nav class="toc"><ul>' +
      toc.map((e) => `<li><a href="#${e.id}">${e.text}</a>${e.children.length ? "<ul>" + e.children.map((c) => `<li><a href="#${c.id}">${c.text}</a></li>`).join("") + "</ul>" : ""}</li>`).join("") +
      "</ul></nav>";
    html = tocHtml + "\n" + html;
  }

  return html;
}

/** Extract plain text from an AST */
export function extractText(node: MdNode): string {
  if (node.type === "text" || node.type === "code") return node.content ?? "";
  if (node.type === "code_block") return node.content ?? "";
  return (node.children ?? []).map(extractText).join("");
}

/** Extract front matter from markdown */
export function extractFrontMatter(markdown: string): FrontMatter | null {
  if (!markdown.startsWith("---")) return null;
  const endIdx = markdown.indexOf("---", 3);
  if (endIdx === -1) return null;
  return parseFrontMatter(markdown.slice(3, endIdx));
}

/** Generate a table of contents from markdown */
export function generateTableOfContents(markdown: string): TocEntry[] {
  const ast = parse(markdown);
  return generateToc(ast.children);
}
