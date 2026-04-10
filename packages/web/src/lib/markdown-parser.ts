/**
 * Markdown parser and renderer: CommonMark subset with GFM extensions.
 * Parses markdown to AST, renders to HTML, supports syntax highlighting hooks.
 */

// --- Types ---

export type MarkdownNodeType =
  | "document" | "heading" | "paragraph" | "text" | "bold" | "italic"
  | "strikethrough" | "code" | "codeBlock" | "link" | "image" | "list"
  | "listItem" | "blockquote" | "hr" | "table" | "tableRow" | "tableCell"
  | "html" | "break" | "taskList" | "taskItem";

export interface MarkdownNode {
  type: MarkdownNodeType;
  content?: string;
  children?: MarkdownNode[];
  attrs?: Record<string, string>;
  level?: number;       // For headings (1-6)
  ordered?: boolean;    // For lists
  lang?: string;        // For code blocks
  checked?: boolean;    // For task items
  align?: "left" | "center" | "right"; // For table cells
}

export interface ParseOptions {
  gfm?: boolean;        // Enable GitHub Flavored Markdown
  sanitize?: boolean;   // Strip HTML tags
  breaks?: boolean;     // Convert \n to <br>
}

export interface RenderOptions {
  sanitize?: boolean;
  allowHtml?: boolean;
  codeHighlight?: (code: string, lang: string) => string;
  linkTransformer?: (href: string, text: string) => string;
}

// --- Parser ---

const ESCAPE_CHARS = new Set("\\`*_{}[]()#+-.!|~");

export function parseMarkdown(source: string, options: ParseOptions = {}): MarkdownNode {
  const { gfm = true, sanitize = false, breaks = false } = options;
  const lines = source.split("\n");
  const doc: MarkdownNode = { type: "document", children: [] };
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Thematic break
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      doc.children!.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      doc.children!.push({
        type: "heading",
        level: headingMatch[1]!.length as 1 | 2 | 3 | 4 | 5 | 6,
        children: parseInline(headingMatch[2]!, sanitize),
      });
      i++;
      continue;
    }

    // Fenced code block
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const fenceChar = fenceMatch[1]![0];
      const fenceLen = fenceMatch[1]!.length;
      const lang = fenceMatch[2]?.trim() || "";
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i]!.startsWith(fenceChar.repeat(fenceLen))) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // Skip closing fence

      doc.children!.push({
        type: "codeBlock",
        lang,
        content: codeLines.join("\n"),
      });
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("> ")) {
        quoteLines.push(lines[i]!.slice(2));
        i++;
      }
      doc.children!.push({
        type: "blockquote",
        children: parseMarkdown(quoteLines.join("\n"), options).children,
      });
      continue;
    }

    // Table (GFM)
    if (gfm && isTableLine(lines, i)) {
      const tableResult = parseTable(lines, i);
      if (tableResult) {
        doc.children!.push(tableResult.node);
        i = tableResult.endIndex;
        continue;
      }
    }

    // List (ordered or unordered)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1]!.length;
      const marker = listMatch[2];
      const ordered = /\d/.test(marker!);
      const listItems: MarkdownNode[] = [];

      while (i < lines.length) {
        const currentLine = lines[i]!;
        const itemMatch = currentLine.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
        if (!itemMatch) break;

        // Task item
        const taskMatch = itemMatch[1]!.match(/^\[([ xX])\]\s+(.*)$/);
        if (gfm && taskMatch) {
          listItems.push({
            type: "taskItem",
            checked: taskMatch[1]!.toLowerCase() === "x",
            children: parseInline(taskMatch[2]!, sanitize),
          });
        } else {
          listItems.push({
            type: "listItem",
            children: parseInline(itemMatch[1]!, sanitize),
          });
        }
        i++;
      }

      doc.children!.push({ type: "list", ordered, children: listItems });
      continue;
    }

    // Paragraph (collect consecutive non-blank lines)
    if (line.trim()) {
      const paraLines: string[] = [];
      while (i < lines.length && lines[i]!.trim() && !isBlockStart(lines[i]!, gfm)) {
        paraLines.push(lines[i]!);
        i++;
        if (breaks) break; // In breaks mode, each line is its own paragraph
      }
      const text = paraLines.join("\n");
      doc.children!.push({ type: "paragraph", children: parseInline(text, sanitize) });
      continue;
    }

    i++; // Skip blank line
  }

  return doc;
}

function isBlockStart(line: string, gfm: boolean): boolean {
  return /^(#{1,6}\s|[-*+]\s|\d+\.\s|>|`{3,}|~{3,}|\*{3,}\s|-{3,}\s|_{3,}\s|\|)/.test(line);
}

function isTableLine(lines: string[], startIdx: number): boolean {
  if (startIdx + 1 >= lines.length) return false;
  const headerLine = lines[startIdx]!;
  const dividerLine = lines[startIdx + 1]!;
  return /^\|.+\|$/.test(headerLine.trim()) && /^\|?\s*[:]*-+[:]*\s*(\|[:]*-+[:]*\s*)+\|?$/.test(dividerLine.trim());
}

function parseTable(lines: string[], startIdx: number): { node: MarkdownNode; endIndex: number } | null {
  const headerLine = lines[startIdx]!;
  const dividerLine = lines[startIdx + 1]!;

  const headers = splitTableRow(headerLine);
  const alignments = parseTableAlignments(dividerLine);

  if (headers.length !== alignments.length) return null;

  const rows: MarkdownNode[] = [];
  let i = startIdx + 2;

  while (i < lines.length && /^\|/.test(lines[i]!)) {
    const cells = splitTableRow(lines[i]!);
    rows.push({
      type: "tableRow",
      children: cells.map((cell, idx) => ({
        type: "tableCell",
        align: alignments[idx],
        children: parseInline(cell.trim(), false),
      })),
    });
    i++;
  }

  return {
    node: {
      type: "table",
      children: [
        {
          type: "tableRow",
          children: headers.map((h, idx) => ({
            type: "tableCell",
            align: alignments[idx],
            children: parseInline(h.trim(), false),
          })),
        },
        ...rows,
      ],
    },
    endIndex: i,
  };
}

function splitTableRow(line: string): string[] {
  return line.split("|").slice(1, -1).map((s) => s.trim());
}

function parseTableAlignments(divider: string): Array<"left" | "center" | "right" | undefined> {
  return divider.split("|").slice(1, -1).map((cell) => {
    const c = cell.trim();
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    if (c.startsWith(":")) return "left";
    return undefined;
  });
}

// --- Inline Parser ---

function parseInline(text: string, sanitize: boolean): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  let remaining = text;
  let pos = 0;

  while (pos < remaining.length) {
    // Escape
    if (remaining[pos] === "\\" && pos + 1 < remaining.length && ESCAPE_CHARS.has(remaining[pos + 1]!)) {
      nodes.push({ type: "text", content: remaining[pos + 1]! });
      pos += 2;
      continue;
    }

    // Bold (** or __)
    if (remaining.slice(pos, pos + 2) === "**" || remaining.slice(pos, pos + 2) === "__") {
      const delimiter = remaining.slice(pos, pos + 2);
      const endIdx = remaining.indexOf(delimiter, pos + 2);
      if (endIdx > pos) {
        nodes.push({ type: "bold", children: parseInline(remaining.slice(pos + 2, endIdx), sanitize) });
        pos = endIdx + 2;
        continue;
      }
    }

    // Italic (* or _)
    if ((remaining[pos] === "*" || remaining[pos] === "_") && remaining[pos + 1] !== remaining[pos]) {
      const delim = remaining[pos]!;
      const endIdx = findClosingDelimiter(remaining, pos, delim);
      if (endIdx > pos) {
        nodes.push({ type: "italic", children: parseInline(remaining.slice(pos + 1, endIdx), sanitize) });
        pos = endIdx + 1;
        continue;
      }
    }

    // Strikethrough (GFM ~~)
    if (remaining.slice(pos, pos + 2) === "~~") {
      const endIdx = remaining.indexOf("~~", pos + 2);
      if (endIdx > pos) {
        nodes.push({ type: "strikethrough", children: parseInline(remaining.slice(pos + 2, endIdx), sanitize) });
        pos = endIdx + 2;
        continue;
      }
    }

    // Inline code
    if (remaining[pos] === "`") {
      const endIdx = remaining.indexOf("`", pos + 1);
      if (endIdx > pos) {
        nodes.push({ type: "code", content: remaining.slice(pos + 1, endIdx) });
        pos = endIdx + 1;
        continue;
      }
    }

    // Image ![alt](url)
    if (remaining.slice(pos, pos + 2) === "![" ) {
      const imgMatch = remaining.slice(pos).match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        nodes.push({ type: "image", attrs: { alt: imgMatch[1]!, src: imgMatch[2]! } });
        pos += imgMatch[0].length;
        continue;
      }
    }

    // Link [text](url)
    if (remaining[pos] === "[") {
      const linkMatch = remaining.slice(pos).match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push({ type: "link", attrs: { href: linkMatch[2]! }, children: [{ type: "text", content: linkMatch[1]! }] });
        pos += linkMatch[0].length;
        continue;
      }
    }

    // Line break
    if (remaining.slice(pos, pos + 2) === "  ") {
      nodes.push({ type: "break" });
      pos += 2;
      continue;
    }

    // Auto-link
    if (remaining[pos] === "<" && /(https?:\/\/|mailto:)/.test(remaining.slice(pos))) {
      const endIdx = remaining.indexOf(">", pos);
      if (endIdx > pos) {
        const url = remaining.slice(pos + 1, endIdx);
        nodes.push({ type: "link", attrs: { href: url }, children: [{ type: "text", content: url }] });
        pos = endIdx + 1;
        continue;
      }
    }

    // Collect plain text until next special char
    let textEnd = pos;
    while (textEnd < remaining.length && !isSpecialChar(remaining[textEnd]!)) {
      textEnd++;
    }
    if (textEnd > pos) {
      nodes.push({ type: "text", content: remaining.slice(pos, textEnd) });
      pos = textEnd;
    } else {
      nodes.push({ type: "text", content: remaining[pos]! });
      pos++;
    }
  }

  return nodes;
}

function isSpecialChar(char: string): boolean {
  return "\\`*_{}[]()#+-.!|~<>".includes(char);
}

function findClosingDelimiter(text: string, startPos: number, delim: string): number {
  for (let i = startPos + 1; i < text.length; i++) {
    if (text[i] === delim && (i + 1 >= text.length || text[i + 1] !== " " || i === text.length - 1)) {
      // Make sure it's not part of bold delimiter
      if (delim === "*" && text[i - 1] === "*") continue;
      if (delim === "_" && text[i - 1] === "_") continue;
      return i;
    }
  }
  return -1;
}

// --- Renderer ---

export function renderToHtml(ast: MarkdownNode, options: RenderOptions = {}): string {
  const { sanitize = true, allowHtml = false, codeHighlight, linkTransformer } = options;

  function render(node: MarkdownNode): string {
    switch (node.type) {
      case "document":
        return node.children?.map(render).join("") ?? "";

      case "heading":
        return `<h${node.level}>${node.children?.map(render).join("") ?? ""}</h${node.level}>`;

      case "paragraph":
        return `<p>${node.children?.map(render).join("") ?? ""}</p>`;

      case "text":
        return escapeHtml(node.content ?? "");

      case "bold":
        return `<strong>${node.children?.map(render).join("") ?? ""}</strong>`;

      case "italic":
        return `<em>${node.children?.map(render).join("") ?? ""}</em>`;

      case "strikethrough":
        return `<del>${node.children?.map(render).join("") ?? ""}</del>`;

      case "code": {
        const code = escapeHtml(node.content ?? "");
        return `<code>${code}</code>`;
      }

      case "codeBlock": {
        const code = escapeHtml(node.content ?? "");
        const highlighted = codeHighlight ? codeHighlight(code, node.lang ?? "") : code;
        return `<pre><code class="language-${node.lang ?? ""}">${highlighted}</code></pre>`;
      }

      case "link": {
        const href = sanitizeUrl(node.attrs?.href ?? "");
        const inner = node.children?.map(render).join("") ?? "";
        const transformed = linkTransformer ? linkTransformer(href, inner) : `<a href="${href}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
        return transformed;
      }

      case "image": {
        const alt = node.attrs?.alt ?? "";
        const src = sanitizeUrl(node.attrs?.src ?? "");
        return `<img src="${src}" alt="${escapeHtml(alt)}" loading="lazy" />`;
      }

      case "list": {
        const tag = node.ordered ? "ol" : "ul";
        return `<${tag}>${node.children?.map(render).join("") ?? ""}</${tag}>`;
      }

      case "listItem":
        return `<li>${node.children?.map(render).join("") ?? ""}</li>`;

      case "taskItem":
        return `<li><input type="checkbox" ${node.checked ? "checked" : ""} disabled /> ${node.children?.map(render).join("") ?? ""}</li>`;

      case "blockquote":
        return `<blockquote>${node.children?.map(render).join("") ?? ""}</blockquote>`;

      case "hr":
        return "<hr />";

      case "table": {
        const childHtml = node.children?.map(render).join("") ?? "";
        return `<table><tbody>${childHtml}</tbody></table>`;
      }

      case "tableRow":
        return `<tr>${node.children?.map(render).join("") ?? ""}</tr>`;

      case "tableCell": {
        const alignStyle = node.align ? ` style="text-align:${node.align}"` : "";
        return `<td${alignStyle}>${node.children?.map(render).join("") ?? ""}</td>`;
      }

      case "html":
        return allowHtml ? (node.content ?? "") : "";

      case "break":
        return "<br />";

      default:
        return "";
    }
  }

  return render(ast);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeUrl(url: string): string {
  if (/^javascript:/i.test(url)) return "#unsafe";
  if (/^data:/i.test(url)) return "#unsafe";
  return url;
}

// --- Convenience Functions ---

/** Parse and render markdown in one step */
export function mdToHtml(markdown: string, options?: ParseOptions & RenderOptions): string {
  const ast = parseMarkdown(markdown, options);
  return renderToHtml(ast, options);
}

/** Extract table of contents from markdown */
export function extractToc(ast: MarkdownNode): Array<{ level: number; text: string; id: string }> {
  const toc: Array<{ level: number; text: string; id: string }> = [];
  for (const node of ast.children ?? []) {
    if (node.type === "heading" && node.level) {
      const text = getTextContent(node);
      toc.push({
        level: node.level,
        text,
        id: slugify(text),
      });
    }
  }
  return toc;
}

function getTextContent(node: MarkdownNode): string {
  if (node.content) return node.content;
  return node.children?.map(getTextContent).join("") ?? "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Count words in markdown text */
export function countWords(markdown: string): number {
  // Strip code blocks first
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
  return withoutCode.split(/\s+/).filter(Boolean).length;
}

/** Estimate reading time */
export function estimateReadingTime(markdown: string, wpm = 200): string {
  const words = countWords(markdown);
  const minutes = Math.ceil(words / wpm);
  return minutes <= 1 ? "1 min read" : `${minutes} min read`;
}
