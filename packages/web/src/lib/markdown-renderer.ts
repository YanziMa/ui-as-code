/**
 * Markdown Renderer: Parse markdown to HTML/AST, support GFM (tables, task lists,
 * strikethrough, autolinks), syntax highlighting integration, front matter extraction,
  * TOC generation, heading anchors, image lazy loading, code block copy buttons.
 */

// --- Types ---

export type MdNodeType =
  | "document" | "heading" | "paragraph" | "text" | "bold" | "italic"
  | "strikethrough" | "code" | "codeBlock" | "link" | "image" | "list"
  | "listItem" | "blockquote" | "hr" | "table" | "tableRow" | "tableCell"
  | "html" | "taskList" | "taskItem" | "footnoteRef" | "footnoteDef"
  | "math" | "admonition" | "callout";

export interface MdNode {
  type: MdNodeType;
  value?: string;
  children: MdNode[];
  props: Record<string, string>;
  position?: { start: number; end: number };
}

export interface MdRenderOptions {
  sanitize?: boolean;
  allowHtml?: boolean;
  lineNumbers?: boolean;
  copyButton?: boolean;
  headingAnchors?: boolean;
  toc?: boolean;
  tocMaxDepth?: number;
  imageLazy?: boolean;
  linkTarget?: "_blank" | "_self" | "_parent";
  highlightLangs?: Record<string, string>;
  theme?: "light" | "dark";
  admonitionStyle?: "flat" | "github" | "custom";
}

// --- Tokenizer ---

interface Token {
  type: string;
  value: string;
  depth?: number;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const lines = source.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Front matter
    if (i === 0 && line.startsWith("---")) {
      let fm = "";
      i++;
      while (i < lines.length && !lines[i].startsWith("---")) { fm += lines[i] + "\n"; i++; }
      tokens.push({ type: "frontmatter", value: fm.trim() });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      tokens.push({ type: "heading", value: headingMatch[2], depth: headingMatch[1].length });
      i++; continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      tokens.push({ type: "hr", value: "" });
      i++; continue;
    }

    // Code fence
    const fenceMatch = line.match(/^(`{3,})(\w*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[2];
      let code = "";
      i++;
      while (i < lines.length && !lines[i].startsWith(fenceMatch[1])) { code += lines[i] + "\n"; i++; }
      tokens.push({ type: "codeFence", value: code.trimEnd(), depth: lang ? lang.length : 0 });
      // Store lang in a hacky way
      if (lang) (tokens[tokens.length - 1] as any).lang = lang;
      i++; continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      let quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      tokens.push({ type: "blockquote", value: quoteLines.join("\n") });
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+[-|:\s]*$/.test(lines[i + 1])) {
      const tableLines: string[] = [line];
      i++;
      tableLines.push(lines[i]); // Separator
      i++;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        tableLines.push(lines[i]); i++;
      }
      tokens.push({ type: "table", value: tableLines.join("\n") });
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)([*+-])\s+(.+)$/);
    if (ulMatch) {
      const items: string[] = [];
      const indent = ulMatch[1].length;
      while (i < lines.length) {
        const m = lines[i].match(new RegExp(`^\\s{${indent}}([*+-])\\s+(.+)$`));
        if (m) { items.push(m[2]); i++; } else break;
      }
      tokens.push({ type: "ulist", value: items.join("\n"), depth: Math.floor(indent / 2) });
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      const items: string[] = [];
      const indent = olMatch[1].length;
      while (i < lines.length) {
        const m = lines[i].match(new RegExp(`^\\s{${indent}}\\d+\\.\\s+(.+)$`));
        if (m) { items.push(m[2]); i++; } else break;
      }
      tokens.push({ type: "olist", value: items.join("\n"), depth: Math.floor(indent / 2) });
      continue;
    }

    // Task list item
    const taskMatch = line.match(/^\s*(-|\d+\.)\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      tokens.push({ type: "taskItem", value: taskMatch[3], depth: taskMatch[2].toLowerCase() === "x" ? 1 : 0 });
      i++; continue;
    }

    // Empty line -> paragraph break or just skip
    if (line.trim() === "") {
      i++; continue;
    }

    // Paragraph (collect non-empty lines until blank or block)
    let paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" &&
      !lines[i].match(/^(#{1,6}\s|[-*+]\s|\d+\.\s|>|`{3,}|\|)/)) {
      paraLines.push(lines[i]); i++;
    }
    if (paraLines.length > 0) {
      tokens.push({ type: "paragraph", value: paraLines.join("\n") });
    }
  }

  return tokens;
}

// --- Inline Parser ---

function parseInline(text: string): MdNode[] {
  const nodes: MdNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold + italic ***text*** or **_text_**
    let match = remaining.match(/^(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\))/);
    if (!match) match = remaining.match(/^(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`)/);

    if (match) {
      // Text before the match
      if (match.index > 0) {
        nodes.push({ type: "text", value: remaining.slice(0, match.index), children: [], props: {} });
      }

      if (match[1]?.startsWith("***")) {
        nodes.push({ type: "bold", children: [{ type: "italic", children: [{ type: "text", value: match[2], children: [], props: {} }], props: {} }], props: {} });
      } else if (match[3]) {
        nodes.push({ type: "bold", children: [{ type: "text", value: match[3], children: [], props: {} }], props: {} });
      } else if (match[5]) {
        nodes.push({ type: "italic", children: [{ type: "text", value: match[5], children: [], props: {} }], props: {} });
      } else if (match[7]) {
        nodes.push({ type: "strikethrough", children: [{ type: "text", value: match[7], children: [], props: {} }], props: {} });
      } else if (match[9]) {
        nodes.push({ type: "code", value: match[9], children: [], props: {} });
      } else if (match[11]) {
        nodes.push({ type: "image", value: match[12], children: [], props: { alt: match[11] ?? "" } });
      } else if (match[14]) {
        nodes.push({ type: "link", value: match[15], children: [{ type: "text", value: match[14], children: [], props: {} }], props: {} });
      }

      remaining = remaining.slice((match.index ?? 0) + match[0].length);
    } else {
      nodes.push({ type: "text", value: remaining, children: [], props: {} });
      remaining = "";
    }
  }

  return nodes;
}

// --- AST Builder ---

export function parseMarkdown(source: string): MdNode {
  const tokens = tokenize(source);
  const document: MdNode = { type: "document", children: [], props: {} };

  for (const token of tokens) {
    switch (token.type) {
      case "frontmatter":
        document.props.frontmatter = token.value;
        break;

      case "heading":
        document.children.push({
          type: "heading",
          value: parseInline(token.value),
          children: [],
          props: { level: String(token.depth ?? 1), id: slugify(token.value) },
        });
        break;

      case "paragraph":
        document.children.push({
          type: "paragraph",
          children: parseInline(token.value),
          props: {},
        });
        break;

      case "codeFence":
        document.children.push({
          type: "codeBlock",
          value: token.value,
          children: [],
          props: { lang: (token as any).lang || "", class: `language-${(token as any).lang || "text"}` },
        });
        break;

      case "blockquote":
        document.children.push(parseMarkdown(token.value));
        document.children[document.children.length - 1].type = "blockquote";
        break;

      case "table":
        document.children.push(parseTable(token.value));
        break;

      case "ulist":
        document.children.push(parseList(token.value, false, token.depth ?? 0));
        break;

      case "olist":
        document.children.push(parseList(token.value, true, token.depth ?? 0));
        break;

      case "taskItem":
        document.children.push({
          type: "taskList",
          children: [{
            type: "taskItem",
            children: parseInline(token.value),
            props: { checked: String(token.depth === 1) },
          }],
          props: {},
        });
        break;

      case "hr":
        document.children.push({ type: "hr", children: [], props: {} });
        break;
    }
  }

  return document;
}

function parseTable(tableStr: string): MdNode {
  const rows = tableStr.split("\n").filter((r) => r.trim());
  const headerRow = rows[0]?.split("|").map((c) => c.trim()).filter(Boolean) ?? [];
  const dataRows = rows.slice(2).map((r) => r.split("|").map((c) => c.trim()).filter(Boolean));

  const tableNode: MdNode = { type: "table", children: [], props: {} };

  // Header row
  tableNode.children.push({
    type: "tableRow",
    children: headerRow.map((cell) => ({
      type: "tableCell",
      children: parseInline(cell),
      props: { header: "true" },
    })),
    props: {},
  });

  // Data rows
  for (const row of dataRows) {
    tableNode.children.push({
      type: "tableRow",
      children: row.map((cell) => ({
        type: "tableCell",
        children: parseInline(cell),
        props: {},
      })),
      props: {},
    });
  }

  return tableNode;
}

function parseList(itemsStr: string, ordered: boolean, depth: number): MdNode {
  const items = itemsStr.split("\n");
  const listNode: MdNode = { type: "list", children: [], props: { ordered: String(ordered), start: "1" } };

  for (const item of items) {
    listNode.children.push({
      type: "listItem",
      children: parseInline(item),
      props: {},
    });
  }

  return listNode;
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- HTML Renderer ---

export function renderToHtml(ast: MdNode, options: MdRenderOptions = {}): string {
  const htmlParts: string[] = [];

  for (const node of ast.children) {
    htmlParts.push(renderNode(node, options));
  }

  return htmlParts.join("\n");
}

function renderNode(node: MdNode, options: MdRenderOptions): string {
  switch (node.type) {
    case "document": return node.children.map((c) => renderNode(c, options)).join("\n");

    case "heading": {
      const level = node.props.level ?? "1";
      const id = options.headingAnchors ? ` id="${node.props.id}"` : "";
      const inner = Array.isArray(node.value)
        ? node.value.map((c) => renderNode(c as MdNode, options)).join("")
        : renderInlineChildren(node.children, options);
      return `<h${level}${id}>${inner}</h${level}>`;
    }

    case "paragraph":
      return `<p>${renderInlineChildren(node.children, options)}</p>`;

    case "text":
      return escapeMdHtml(node.value ?? "");

    case "bold": return `<strong>${renderInlineChildren(node.children, options)}</strong>`;
    case "italic": return `<em>${renderInlineChildren(node.children, options)}</em>`;
    case "strikethrough": return `<del>${renderInlineChildren(node.children, options)}</del>`;
    case "code": return `<code>${escapeMdHtml(node.value ?? "")}</code>`;

    case "codeBlock": {
      const lang = node.props.lang || "";
      const numAttr = options.lineNumbers ? ' data-line-numbers="true"' : "";
      const copyBtn = options.copyButton
        ? `<button class="md-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent)">Copy</button>`
        : "";
      return `<pre><code class="${lang}"${numAttr}>${escapeMdHtml(node.value ?? "")}</code>${copyBtn}</pre>`;
    }

    case "link": {
      const target = options.linkTarget ? ` target="${options.linkTarget}" rel="noopener noreferrer"` : "";
      const inner = renderInlineChildren(node.children, options);
      return `<a href="${node.value}"${target}>${inner}</a>`;
    }

    case "image": {
      const lazy = options.imageLazy ? ' loading="lazy"' : "";
      return `<img src="${node.value}" alt="${node.props.alt || ""}"${lazy} />`;
    }

    case "list": {
      const tag = node.props.ordered === "true" ? "ol" : "ul";
      const start = node.props.start !== "1" ? ` start="${node.props.start}"` : "";
      return `<${tag}${start}>${node.children.map((c) => renderNode(c, options)).join("")}</${tag}>`;
    }

    case "listItem":
      return `<li>${renderInlineChildren(node.children, options)}</li>`;

    case "blockquote":
      return `<blockquote>${node.children.map((c) => renderNode(c, options)).join("")}</blockquote>`;

    case "hr": return "<hr />";

    case "table": {
      const rows = node.children.map((c) => renderNode(c, options)).join("");
      return `<table><tbody>${rows}</tbody></table>`;
    }

    case "tableRow":
      return `<tr>${node.children.map((c) => renderNode(c, options)).join("")}</tr>`;

    case "tableCell": {
      const tag = node.props.header === "true" ? "th" : "td";
      return `<tag>${renderInlineChildren(node.children, options)}</tag>`.replace("tag", tag);
    }

    case "taskList":
      return `<ul class="task-list">${node.children.map((c) => renderNode(c, options)).join("")}</ul>`;

    case "taskItem": {
      const checked = node.props.checked === "true" ? " checked" : "";
      return `<li class="task-item"><input type="checkbox"${checked} disabled /> ${renderInlineChildren(node.children, options)}</li>`;
    }

    default:
      return renderInlineChildren(node.children, options);
  }
}

function renderInlineChildren(children: MdNode[], options: MdRenderOptions): string {
  return children.map((c) => renderNode(c, options)).join("");
}

function escapeMdHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- TOC Generation ---

export interface TocEntry {
  level: number;
  title: string;
  id: string;
  children: TocEntry[];
}

/** Generate table of contents from AST */
export function generateToc(ast: MdNode, maxDepth = 6): TocEntry[] {
  const entries: TocEntry[] = [];

  for (const child of ast.children) {
    if (child.type === "heading") {
      const level = parseInt(child.props.level ?? "1");
      if (level <= maxDepth) {
        entries.push({
          level,
          title: extractText(child),
          id: child.props.id ?? "",
          children: [],
        });
      }
    }
  }

  return nestTocEntries(entries);
}

function nestTocEntries(entries: TocEntry[]): TocEntry[] {
  const root: TocEntry[] = [];
  const stack: TocEntry[] = [];

  for (const entry of entries) {
    const node: TocEntry = { ...entry, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= entry.level) stack.pop();

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(node);
    } else {
      root.push(node);
    }

    stack.push(node);
  }

  return root;
}

/** Render TOC as HTML */
export function renderToc(toc: TocEntry[]): string {
  if (toc.length === 0) return "";

  const items = toc.map((entry) => {
    const children = entry.children.length > 0 ? `\n<ul>${renderToc(entry.children)}</ul>` : "";
    return `<li><a href="#${entry.id}">${entry.title}</a>${children}</li>`;
  }).join("\n");

  return `<nav class="toc"><ul>${items}</ul></nav>`;
}

// --- Front Matter ---

export interface FrontMatter {
  [key: string]: string | string[];
}

/** Extract and parse YAML front matter */
export function extractFrontMatter(source: string): { content: string; frontmatter: FrontMatter | null } {
  const fmMatch = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return { content: source, frontmatter: null };

  const fmStr = fmMatch[1];
  const fm: FrontMatter = {};
  const lines = fmStr.split("\n");
  let currentKey = "";

  for (const line of lines) {
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      fm[currentKey] = kvMatch[2].replace(/^["']|["']$/g, "");
    } else if (/^\s+-\s/.test(line) && currentKey) {
      const val = line.replace(/^\s+-\s*/, "").replace(/^["']|["']$/g, "");
      const existing = fm[currentKey];
      if (Array.isArray(existing)) existing.push(val);
      else fm[currentKey] = [existing as string, val];
    }
  }

  return { content: fmMatch[2], frontmatter: fm };
}

// --- Utilities ---

/** Extract plain text from AST node tree */
export function extractText(node: MdNode): string {
  if (node.type === "text") return node.value ?? "";
  if (node.children.length === 0) return node.value ?? "";
  return node.children.map((c) => extractText(c)).join("");
}

/** Count words in markdown source */
export function countWords(source: string): number {
  // Strip code blocks and inline code first
  const stripped = source.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
  return stripped.trim().split(/\s+/).filter(Boolean).length;
}

/** Estimate reading time in minutes */
export function readingTime(source: string, wpm = 200): string {
  const mins = Math.ceil(countWords(source) / wpm);
  return `${mins} min read`;
}

/** Quick render: markdown string to HTML string */
export function mdToHtml(md: string, options?: MdRenderOptions): string {
  const ast = parseMarkdown(md);
  return renderToHtml(ast, options);
}
