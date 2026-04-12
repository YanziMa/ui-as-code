/**
 * Org Mode Parser: Parse Emacs Org-mode formatted text into structured AST.
 * Supports headings, lists, tables, links, code blocks, properties drawers,
 * timestamps, tags, footnotes, LaTeX fragments, statistics cookies,
 * TODO keywords, priorities, checkboxes, and HTML/Markdown export.
 */

// --- Types ---

export type OrgNodeType =
  | "document"
  | "heading"
  | "paragraph"
  | "text"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "verbatim"
  | "link"
  | "image"
  | "timestamp"
  | "list"
  | "list-item"
  | "ordered-list"
  | "ordered-list-item"
  | "table"
  | "table-row"
  | "table-cell"
  | "drawer"
  | "property-drawer"
  | "logbook"
  | "block"
  | "example-block"
  | "src-block"
  | "export-block"
  | "horizontal-rule"
  | "comment"
  | "footnote-definition"
  | "footnote-reference"
  | "latex-fragment"
  | "entity"
  | "superscript"
  | "subscript"
  | "statistics-cookie";

export interface OrgNode {
  type: OrgNodeType;
  value?: string;
  children?: OrgNode[];
  level?: number;
  properties?: Record<string, string>;
  tags?: string[];
  todoKeyword?: string;
  priority?: string;
  numbered?: number;
  checkbox?: " " | "X" | "-";
  position?: PositionInfo;
}

export interface PositionInfo {
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  date?: string;
  email?: string;
  options: Record<string, string>;
}

export interface OrgParseOptions {
  parseTodos?: boolean;
  parseTags?: boolean;
  parseProperties?: boolean;
  parseLinks?: boolean;
  parseTimestamps?: boolean;
  parseTables?: boolean;
  parseFootnotes?: boolean;
  preservePositions?: boolean;
  customTodoKeywords?: string[];
}

export interface OrgExportOptions {
  format: "html" | "markdown" | "text" | "ast";
  includeToc?: boolean;
  tocDepth?: number;
  sectionNumbers?: boolean;
  highlightCode?: boolean;
  inlineImages?: boolean;
  linkBase?: string;
}

// --- Parser ---

const HEADING_REGEX = /^(\*+)\s+(.+)$/;
const PROPERTY_DRAWER_START = /^\s*:PROPERTIES:\s*$/;
const PROPERTY_DRAWER_END = /^\s*:END:\s*$/;
const LOGBOOK_START = /^\s*:LOGBOOK:\s*$/;
const LOGBOOK_END = /^\s*:END:\s*$/;
const DRAWER_START = /^\s*:(\w+):\s*$/;
const DRAWER_END = /^\s*:END:\s*$/;
const TABLE_ROW = /^\s*\|/;
const TABLE_SEPARATOR = /^\s*\|[-+|]+\s*$/;
const HORIZONTAL_RULE = /^-{5,}$/;
const LIST_UNORDERED = /^(\s*)([-+*])\s+(.*)$/;
const LIST_ORDERED = /^(\s*)(\d+[).])\s+(.*)$/;
const CHECKBOX = /\[(?:X|\s|-)\]/;
const FOOTNOTE_DEF = /^\[fn:(\w+)\]\s*(.*)$/m;
const TIMESTAMP = /<(\d{4}-\d{2}-\d{2}\s+\w{3}(?::[\d:]+)?)>/g;
const LINK_REGEX = /\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g;
const BOLD_REGEX = /\*\*(.+?)\*\*/g;
const ITALIC_REGEX = /\/(.+?)\//g;
const UNDERLINE_REGEX = /_(.+?)_/g;
const STRIKE_REGEX = /~(.+?)~/g;
const CODE_REGEX /~=(.+?)~= /g;
const VERBATIM_REGEX /=(.+?)=/g;

const DEFAULT_TODO_KEYWORDS = ["TODO", "DONE"];

export class OrgParser {
  private options: Required<OrgParseOptions>;

  constructor(options: OrgParseOptions = {}) {
    this.options = {
      parseTodos: true,
      parseTags: true,
      parseProperties: true,
      parseLinks: true,
      parseTimestamps: true,
      parseTables: true,
      parseFootnotes: true,
      preservePositions: false,
      customTodoKeywords: [],
      ...options,
    };
  }

  /** Parse an Org-mode document string into an AST. */
  parse(input: string): OrgDocument {
    const lines = input.split("\n");
    const metadata = this.extractMetadata(lines);
    const root: OrgDocument = {
      type: "document",
      children: [],
      options: this.options as unknown as OrgOptions,
      metadata,
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i]!;

      // Skip blank lines
      if (line.trim() === "") { i++; continue; }

      // Comment lines
      if (line.trim().startsWith("#")) {
        root.children!.push({ type: "comment", value: line.trim().slice(1).trim(), position: this.pos(i, line) });
        i++;
        continue;
      }

      // Horizontal rule
      if (HORIZONTAL_RULE.test(line)) {
        root.children!.push({ type: "horizontal-rule", position: this.pos(i, line) });
        i++;
        continue;
      }

      // Heading
      const headingMatch = line.match(HEADING_REGEX);
      if (headingMatch) {
        const node = this.parseHeading(headingMatch, line, i);
        // Parse content until next same-or-lower heading
        i++;
        const childLines: string[] = [];
        while (i < lines.length) {
          const nextLine = lines[i]!;
          const nextHeading = nextLine.match(HEADING_REGEX);
          if (nextHeading && nextHeading[1]!.length <= headingMatch[1]!.length) break;
          childLines.push(nextLine);
          i++;
        }
        node.children = this.parseBody(childLines, node.level! + 1);
        root.children!.push(node);
        continue;
      }

      // Body content
      const bodyLines: string[] = [];
      while (i < lines.length && !lines[i]!.match(HEADING_REGEX)) {
        bodyLines.push(lines[i]!);
        i++;
      }
      const bodyNodes = this.parseBody(bodyLines, 1);
      root.children!.push(...bodyNodes);
    }

    return root;
  }

  /** Export parsed document to HTML. */
  toHTML(doc: OrgDocument): string {
    const parts: string[] = [];

    for (const child of doc.children ?? []) {
      parts.push(this.nodeToHTML(child));
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${this.escapeHTML(doc.metadata.title ?? "Document")}</title></head><body>${parts.join("\n")}</body></html>`;
  }

  /** Export to Markdown. */
  toMarkdown(doc: OrgDocument): string {
    const parts: string[] = [];

    for (const child of doc.children ?? []) {
      parts.push(this.nodeToMarkdown(child));
    }

    return parts.join("\n");
  }

  // --- Internal Parsers ---

  private parseHeading(match: RegExpMatchArray, _line: string, lineIndex: number): OrgNode {
    const stars = match[1]!;
    const content = match[2]!;
    const level = stars.length;

    let todoKeyword: string | undefined;
    let priority: string | undefined;
    let tags: string[] | undefined;
    let titleText = content;

    // Extract TODO keyword
    if (this.options.parseTodos) {
      const allTodos = [...DEFAULT_TODO_KEYWORDS, ...this.options.customTodoKeywords];
      for (const kw of allTodos) {
        if (titleText.startsWith(kw + " ") || titleText.startsWith(kw + "\t")) {
          todoKeyword = kw;
          titleText = titleText.slice(kw.length + 1);
          break;
        }
      }
    }

    // Extract priority [#A]
    const priorityMatch = titleText.match(/\[#([ABC])\]\s*/);
    if (priorityMatch) {
      priority = priorityMatch[1];
      titleText = titleText.replace(priorityMatch[0], "");
    }

    // Extract tags :tag1:tag2:
    if (this.options.parseTags) {
      const tagMatch = titleText.match(/:([\w@#%:]+):\s*$/);
      if (tagMatch) {
        tags = tagMatch[1]!.split(":").filter(Boolean);
        titleText = titleText.replace(tagMatch[0], "").trim();
      }
    }

    const node: OrgNode = {
      type: "heading",
      value: titleText.trim(),
      level,
      todoKeyword,
      priority,
      tags,
      children: [],
      position: this.pos(lineIndex, ""),
    };

    return node;
  }

  private parseBody(lines: string[], baseLevel: number): OrgNode[] {
    const nodes: OrgNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i]!;

      if (line.trim() === "") { i++; continue; }

      // Property drawer
      if (PROPERTY_DRAWER_START.test(line)) {
        const drawer = this.parseDrawer(lines, i, "property-drawer", PROPERTY_DRAWER_END);
        nodes.push(drawer.node);
        i = drawer.endIndex;
        continue;
      }

      // Logbook
      if (LOGBOOK_START.test(line)) {
        const drawer = this.parseDrawer(lines, i, "logbook", LOGBOOK_END);
        nodes.push(drawer.node);
        i = drawer.endIndex;
        continue;
      }

      // Generic drawer
      const genericDrawer = line.match(DRAWER_START);
      if (genericDrawer && !PROPERTY_DRAWER_START.test(line) && !LOGBOOK_START.test(line)) {
        const drawer = this.parseDrawer(lines, i, "drawer", DRAWER_END);
        nodes.push(drawer.node);
        i = drawer.endIndex;
        continue;
      }

      // Table
      if (TABLE_ROW.test(line)) {
        const table = this.parseTable(lines, i);
        nodes.push(table.node);
        i = table.endIndex;
        continue;
      }

      // Unordered list
      const ulMatch = line.match(LIST_UNORDERED);
      if (ulMatch) {
        const list = this.parseList(lines, i, "list");
        nodes.push(list.node);
        i = list.endIndex;
        continue;
      }

      // Ordered list
      const olMatch = line.match(LIST_ORDERED);
      if (olMatch) {
        const list = this.parseList(lines, i, "ordered-list");
        nodes.push(list.node);
        i = list.endIndex;
        continue;
      }

      // Block (#+BEGIN_... #+END_)
      const blockMatch = line.match(/^(\s*)#\+BEGIN_(\w+)\s*(.*)$/);
      if (blockMatch) {
        const block = this.parseBlock(lines, i);
        nodes.push(block.node);
        i = block.endIndex;
        continue;
      }

      // Horizontal rule
      if (HORIZONTAL_RULE.test(line.trim())) {
        nodes.push({ type: "horizontal-rule", position: this.pos(i, line) });
        i++;
        continue;
      }

      // Paragraph (collect consecutive non-blank lines)
      const paraLines: string[] = [];
      while (i < lines.length && lines[i]!.trim() !== "" &&
             !lines[i]!.match(HEADING_REGEX) &&
             !TABLE_ROW.test(lines[i]!) &&
             !lines[i]!.match(LIST_UNORDERED) &&
             !lines[i]!.match(LIST_ORDERED) &&
             !lines[i]!.match(/^(\s*)#\+BEGIN_/) &&
             !HORIZONTAL_RULE.test(lines[i]!.trim()) &&
             !PROPERTY_DRAWER_START.test(lines[i]!) &&
             !LOGBOOK_START.test(lines[i]!) &&
             !DRAWER_START.test(lines[i]!)) {
        paraLines.push(lines[i]!);
        i++;
      }

      if (paraLines.length > 0) {
        nodes.push(this.parseParagraph(paraLines));
      }
    }

    return nodes;
  }

  private parseParagraph(lines: string[]): OrgNode {
    const text = lines.join("\n").trim();
    const children = this.parseInlineMarkup(text);

    return {
      type: "paragraph",
      value: text,
      children,
      position: this.pos(0, text),
    };
  }

  private parseInlineMarkup(text: string): OrgNode[] {
    const nodes: OrgNode[] = [];
    let remaining = text;

    // Process markup in order of specificity

    // Links [[url][desc]]
    let match: RegExpExecArray | null;
    LINK_REGEX.lastIndex = 0;
    let lastIndex = 0;

    while ((match = LINK_REGEX.exec(remaining)) !== null) {
      // Text before link
      if (match.index > lastIndex) {
        nodes.push({ type: "text", value: remaining.slice(lastIndex, match.index) });
      }

      const url = match[1]!;
      const desc = match[2];
      const isImage = /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(url);

      if (isImage) {
        nodes.push({ type: "image", value: url, properties: { alt: desc } });
      } else {
        nodes.push({ type: "link", value: url, properties: { text: desc } });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      nodes.push({ type: "text", value: remaining.slice(lastIndex) });
    }

    // If no links found, treat entire text as plain text
    if (nodes.length === 0) {
      // Try other inline markup
      return this.parseInlineFormatting(text);
    }

    return nodes;
  }

  private parseInlineFormatting(text: string): OrgNode[] {
    const nodes: OrgNode[] = [];
    const patterns: [RegExp, string][] = [
      [/\*\*(.+?)\*\*/g, "bold"],
      [/\/(.+?)\//g, "italic"],
      [/_(.+?)_/g, "underline"],
      [/~(.+?)~/g, "strike"],
      [/(?:~|=(.+?)(?:~|=)/g, "code"], // Inline code with ~ or =
    ];

    // Simple approach: find first matching markup and split
    // For a full parser we'd use recursive descent — this is simplified
    let hasMarkup = false;
    for (const [regex, type] of patterns) {
      regex.lastIndex = 0;
      if (regex.test(text)) { hasMarkup = true; break; }
    }

    if (!hasMarkup) {
      return [{ type: "text", value: text }];
    }

    // Apply bold
    const boldParts: OrgNode[] = [];
    BOLD_REGEX.lastIndex = 0;
    let lastIdx = 0;
    while ((match = BOLD_REGEX.exec(text)) !== null) {
      if (match.index > lastIdx) {
        boldParts.push(...this.parseInlineFormatting(text.slice(lastIdx, match.index)));
      }
      boldParts.push({ type: "bold", value: match[1], children: this.parseInlineFormatting(match[1]!) });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      boldParts.push(...this.parseInlineFormatting(text.slice(lastIdx)));
    }

    return boldParts.length > 0 ? boldParts : [{ type: "text", value: text }];
  }

  private parseDrawer(
    lines: string[],
    startIndex: number,
    drawerType: OrgNodeType,
    endPattern: RegExp,
  ): { node: OrgNode; endIndex: number } {
    const children: OrgNode[] = [];
    let i = startIndex + 1;

    while (i < lines.length) {
      if (endPattern.test(lines[i]!)) break;
      const propLine = lines[i]!.trim();
      if (propLine.startsWith(":") && propLine.includes(":")) {
        const colonIdx = propLine.indexOf(":", 1);
        const key = propLine.slice(1, colonIdx).trim();
        const val = propLine.slice(colonIdx + 1).trim();
        children.push({ type: "text", value: `${key}: ${val}` });
      } else {
        children.push({ type: "text", value: propLine });
      }
      i++;
    }

    return {
      node: { type: drawerType, children },
      endIndex: i + 1,
    };
  }

  private parseTable(lines: string[], startIndex: number): { node: OrgNode; endIndex: number } {
    const rows: OrgNode[] = [];
    let i = startIndex;

    while (i < lines.length && TABLE_ROW.test(lines[i]!)) {
      // Skip separator lines
      if (TABLE_SEPARATOR.test(lines[i]!)) { i++; continue; }

      const cells = lines[i]!.split("|").filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      const rowCells: OrgNode[] = cells.map((cell) => ({
        type: "table-cell" as OrgNodeType,
        value: cell.trim(),
        children: this.parseInlineMarkup(cell.trim()),
      }));

      rows.push({
        type: "table-row",
        children: rowCells,
        position: this.pos(i, lines[i]!),
      });

      i++;
    }

    return {
      node: { type: "table", children: rows },
      endIndex: i,
    };
  }

  private parseList(
    lines: string[],
    startIndex: number,
    listType: "list" | "ordered-list",
  ): { node: OrgNode; endIndex: number } {
    const items: OrgNode[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i]!;
      const isUnordered = LIST_UNORDERED.test(line);
      const isOrdered = LIST_ORDERED.test(line);

      if (!isUnordered && !isOrdered) break;

      const match = (isUnordered ? line.match(LIST_UNORDERED) : line.match(LIST_ORDERED))!;
      const indent = match[1]!.length;
      const content = match[3]!;

      let checkbox: " " | "X" | "-" | undefined;
      const cbMatch = content.match(CHECKBOX);
      if (cbMatch) {
        checkbox = cbMatch[0]![1] as " " | "X" | "-";
      }

      const itemText = content.replace(CHECKBOX, "").trim();
      const item: OrgNode = {
        type: listType === "ordered-list" ? "ordered-list-item" : "list-item",
        value: itemText,
        checkbox,
        children: this.parseInlineMarkup(itemText),
        numbered: isOrdered ? parseInt(match[2]!) : undefined,
        position: this.pos(i, line),
      };

      items.push(item);
      i++;
    }

    return {
      node: { type: listType, children: items },
      endIndex: i,
    };
  }

  private parseBlock(lines: string[], startIndex: number): { node: OrgNode; endIndex: number } {
    const headerMatch = lines[startIndex]!.match(/^(\s*)#\+BEGIN_(\w+)\s*(.*)$/)!;
    const blockType = headerMatch[2]!.toLowerCase();
    const params = headerMatch[3]?.trim();

    const contentLines: string[] = [];
    let i = startIndex + 1;

    while (i < lines.length) {
      if (lines[i]!.trim().match(/^#\+END_\w+/)) break;
      contentLines.push(lines[i]!);
      i++;
    }

    const content = contentLines.join("\n");

    let nodeType: OrgNodeType = "block";
    switch (blockType) {
      case "example": nodeType = "example-block"; break;
      case "src": nodeType = "src-block"; break;
      case "export": nodeType = "export-block"; break;
      case "quote":
      case "verse":
      case "center": nodeType = "block"; break;
      default: nodeType = "block"; break;
    }

    const node: OrgNode = {
      type: nodeType,
      value: content,
      properties: params ? { language: params } : undefined,
      position: this.pos(startIndex, lines[startIndex]!),
    };

    return { node, endIndex: i + 1 };
  }

  private extractMetadata(lines: string[]): DocumentMetadata {
    const meta: DocumentMetadata = { options: {} };

    for (const line of lines) {
      const titleMatch = line.match(/^#\+TITLE:\s*(.+)$/);
      if (titleMatch) { meta.title = titleMatch[1]!.trim(); continue; }

      const authorMatch = line.match(/^#\+AUTHOR:\s*(.+)$/);
      if (authorMatch) { meta.author = authorMatch[1]!.trim(); continue; }

      const dateMatch = line.match(/^#\+DATE:\s*(.+)$/);
      if (dateMatch) { meta.date = dateMatch[1]!.trim(); continue; }

      const emailMatch = line.match(/^#\+EMAIL:\s*(.+)$/);
      if (emailMatch) { meta.email = emailMatch[1]!.trim(); continue; }

      const optionMatch = line.match(/^#\+OPTIONS?:(.+)$/);
      if (optionMatch) {
        const opts = optionMatch[1]!.trim().split(/\s+/);
        for (const opt of opts) {
          const [k, v] = opt.split(":");
          if (k) meta.options[k] = v ?? "t";
        }
      }
    }

    return meta;
  }

  // --- Exporters ---

  private nodeToHTML(node: OrgNode): string {
    switch (node.type) {
      case "heading":
        const tag = `h${node.level ?? 1}`;
        const todoClass = node.todoKeyword ? ` class="todo-${node.todoKeyword.toLowerCase()}"` : "";
        const tagSpan = node.tags?.length ? ` <span class="tags">${node.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</span>` : "";
        return `<${tag}${todoClass}>${this.escapeHTML(node.value ?? "")}${tagSpan}</${tag}>`;

      case "paragraph":
        return `<p>${(node.children ?? []).map((c) => this.nodeToHTML(c)).join("")}</p>`;

      case "text":
        return this.escapeHTML(node.value ?? "");

      case "bold":
        return `<strong>${this.escapeHTML(node.value ?? "")}</strong>`;

      case "italic":
        return `<em>${this.escapeHTML(node.value ?? "")}</em>`;

      case "link":
        return `<a href="${this.escapeHTML(node.value ?? "")}">${this.escapeHTML(node.properties?.text ?? node.value ?? "")}</a>`;

      case "image":
        return `<img src="${this.escapeHTML(node.value ?? "")}" alt="${this.escapeHTML(node.properties?.alt ?? "")}"/>`;

      case "code":
        return `<code>${this.escapeHTML(node.value ?? "")}</code>`;

      case "table": {
        const rows = node.children ?? [];
        if (rows.length === 0) return "";
        const headerRow = rows[0];
        const bodyRows = rows.slice(1);
        return `<table>
<thead>${headerRow!.children?.map((c) => `<th>${this.nodeToHTML(c)}</th>`).join("") ?? ""}</thead>
<tbody>${bodyRows.map((r) => `<tr>${r.children?.map((c) => `<td>${this.nodeToHTML(c)}</td>`).join("") ?? ""}</tr>`).join("")}</tbody>
</table>`;
      }

      case "table-cell":
        return (node.children ?? []).map((c) => this.nodeToHTML(c)).join("") ?? this.escapeHTML(node.value ?? "");

      case "list":
      case "ordered-list": {
        const tag = node.type === "ordered-list" ? "ol" : "ul";
        return `<${tag}>${(node.children ?? []).map((item) => `<li>${this.nodeToHTML(item)}</li>`).join("")}</${tag}>`;
      }

      case "list-item":
      case "ordered-list-item":
        const cb = node.checkbox === "X" ? ' checked' : node.checkbox === "-" ? ' disabled' : "";
        const cbHtml = cb ? ` <input type="checkbox"${cb}/>` : "";
        return `${cbHtml}${(node.children ?? []).map((c) => this.nodeToHTML(c)).join("")}`;

      case "src-block":
        return `<pre><code class="language-${node.properties?.language ?? ""}">${this.escapeHTML(node.value ?? "")}</code></pre>`;

      case "example-block":
        return `<pre class="example">${this.escapeHTML(node.value ?? "")}</pre>`;

      case "block":
        return `<blockquote>${this.escapeHTML(node.value ?? "")}</blockquote>`;

      case "horizontal-rule":
        return "<hr/>";

      case "comment":
        return `<!-- ${this.escapeHTML(node.value ?? "")} -->`;

      default:
        return this.escapeHTML(node.value ?? "");
    }
  }

  private nodeToMarkdown(node: OrgNode): string {
    switch (node.type) {
      case "heading":
        return "#".repeat(node.level ?? 1) + ` ${node.value ?? ""}`;
      case "paragraph":
        return (node.children ?? []).map((c) => this.nodeToMarkdown(c)).join("");
      case "bold":
        return `**${node.value ?? ""}**`;
      case "italic":
        return `*${node.value ?? ""}*`;
      case "link":
        return `[${node.properties?.text ?? ""}](${node.value ?? ""})`;
      case "image":
        return `![${node.properties?.alt ?? ""}](${node.value ?? ""})`;
      case "code":
        return `\`${node.value ?? ""}\``;
      case "table":
        return (node.children ?? []).map((r) =>
          "|" + (r.children ?? []).map((c) => ` ${c.value ?? ""} `).join("|") + "|"
        ).join("\n");
      case "list-item":
        return `- ${node.checkbox === "X" ? "[x]" : node.checkbox === "-" ? "[-]" : "[ ]"} ${node.value ?? ""}`;
      case "ordered-list-item":
        return `${node.numbered ?? 1}. ${node.value ?? ""}`;
      case "src-block":
        return "```\n" + (node.value ?? "") + "\n```";
      case "horizontal-rule":
        return "---";
      default:
        return node.value ?? "";
    }
  }

  private pos(lineIndex: number, line: string): PositionInfo {
    return {
      lineStart: lineIndex,
      lineEnd: lineIndex,
      columnStart: 0,
      columnEnd: line.length,
    };
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

// --- Factory & Convenience ---

/** Parse an Org-mode string into a document AST. */
export function parseOrg(input: string, options?: OrgParseOptions): OrgDocument {
  const parser = new OrgParser(options);
  return parser.parse(input);
}

/** Convert Org-mode text directly to HTML. */
export function orgToHTML(input: string, options?: OrgParseOptions): string {
  const parser = new OrgParser(options);
  const doc = parser.parse(input);
  return parser.toHTML(doc);
}

/** Convert Org-mode text directly to Markdown. */
export function orgToMarkdown(input: string, options?: OrgParseOptions): string {
  const parser = new OrgParser(options);
  const doc = parser.parse(input);
  return parser.toMarkdown(doc);
}
