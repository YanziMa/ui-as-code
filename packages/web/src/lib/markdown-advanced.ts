/**
 * Advanced Markdown parser and renderer.
 * Lightweight — no external dependencies.
 */

export interface MdNode {
  type: "heading" | "paragraph" | "text" | "bold" | "italic" | "code" | "link" | "image"
    | "list" | "listItem" | "blockquote" | "hr" | "table" | "tableRow" | "tableCell"
    | "codeBlock";
  content?: string;
  level?: number;
  children?: MdNode[];
  href?: string;
  alt?: string;
  lang?: string;
  align?: "left" | "center" | right";
}

/** Parse markdown text into AST */
export function parseMarkdown(md: string): MdNode[] {
  const lines = md.split("\n");
  const nodes: MdNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      nodes.push({
        type: "heading",
        level: headingMatch[1]!.length,
        children: parseInline(headingMatch[2]!),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push({ type: "hr" });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i]!.startsWith("```")) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // Skip closing ```

      nodes.push({
        type: "codeBlock",
        content: codeLines.join("\n"),
        lang: lang || undefined,
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

      nodes.push({
        type: "blockquote",
        children: parseMarkdown(quoteLines.join("\n")),
      });
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const listItems: MdNode[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i]!)) {
        const itemContent = lines[i]!.replace(/^[\s]*[-*+]\s+/, "");
        listItems.push({
          type: "listItem",
          children: parseInline(itemContent),
        });
        i++;
      }

      nodes.push({ type: "list", children: listItems });
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const listItems: MdNode[] = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i]!)) {
        const itemContent = lines[i]!.replace(/^[\s]*\d+\.\s+/, "");
        listItems.push({
          type: "listItem",
          children: parseInline(itemContent),
        });
        i++;
      }

      nodes.push({ type: "list", children: listItems });
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+[-|\s:]+\|?/.test(lines[i + 1])) {
      const tableRows: MdNode[] = [];

      // Header row
      const headers = line.split("|").filter((c) => c.trim()).map((c) => ({
        type: "tableCell" as const,
        align: "left" as const,
        children: parseInline(c.trim()),
      }));

      tableRows.push({ type: "tableRow", children: headers });

      i++; // Skip separator

      // Data rows
      i++;
      while (i < lines.length && lines[i]!.includes("|") && !/^\s*$/.test(lines[i]!)) {
        const cells = lines[i]!.split("|").filter((c) => c.trim()).map((c) => ({
          type: "tableCell" as const,
          children: parseInline(c.trim()),
        }));

        tableRows.push({ type: "tableRow", children: cells });
        i++;
      }

      nodes.push({ type: "table", children: tableRows });
      continue;
    }

    // Paragraph (collect consecutive non-empty lines)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !lines[i]!.match(/^(#{1,6}|- |\d+\. |> |```|\*\s+$)/)) {
      paraLines.push(lines[i]!);
      i++;
    }

    if (paraLines.length > 0) {
      nodes.push({
        type: "paragraph",
        children: parseInline(paraLines.join(" ")),
      });
    }
  }

  return nodes;
}

/** Parse inline markdown elements */
function parseInline(text: string): MdNode[] {
  const nodes: MdNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold **...**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      nodes.push({ type: "bold", children: parseInline(boldMatch[1]!) });
      remaining = remaining.slice(boldMatch[0]!.length);
      continue;
    }

    // Italic *...*
    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      nodes.push({ type: "italic", children: parseInline(italicMatch[1]!) });
      remaining = remaining.slice(italicMatch[0]!.length);
      continue;
    }

    // Code `...`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push({ type: "code", content: codeMatch[1]! });
      remaining = remaining.slice(codeMatch[0]!.length);
      continue;
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      nodes.push({ type: "link", content: linkMatch[1]!, href: linkMatch[2]!, children: [{ type: "text", content: linkMatch[1]! }] });
      remaining = remaining.slice(linkMatch[0]!.length);
      continue;
    }

    // Image ![alt](url)
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      nodes.push({ type: "image", alt: imgMatch[1]!, href: imgMatch[2]! });
      remaining = remaining.slice(imgMatch[0]!.length);
      continue;
    }

    // Plain text until next special char
    const nextSpecial = remaining.match(/[`\*\[\!#_]/);
    if (nextSpecial && nextSpecial.index !== undefined && nextSpecial.index > 0) {
      nodes.push({ type: "text", content: remaining.slice(0, nextSpecial.index) });
      remaining = remaining.slice(nextSpecial.index);
    } else {
      nodes.push({ type: "text", content: remaining });
      break;
    }
  }

  return nodes;
}

/** Render markdown AST to HTML */
export function renderMdToHtml(nodes: MdNode[]): string {
  return nodes.map(renderNode).join("\n");
}

function renderNode(node: MdNode): string {
  switch (node.type) {
    case "heading":
      return `<h${node.level}>${renderChildrenHtml(node.children)}</h${node.level}>`;

    case "paragraph":
      return `<p>${renderChildrenHtml(node.children)}</p>`;

    case "text":
      return escapeHtml(node.content ?? "");

    case "bold":
      return `<strong>${renderChildrenHtml(node.children)}</strong>`;

    case "italic":
      return `<em>${renderChildrenHtml(node.children)}</em>`;

    case "code":
      return `<code>${escapeHtml(node.content ?? "")}</code>`;

    case "codeBlock": {
      const lang = node.lang ? ` class="language-${node.lang}"` : "";
      return `<pre><code${lang}>${escapeHtml(node.content ?? "")}</code></pre>`;
    }

    case "link":
      return `<a href="${escapeHtmlAttr(node.href ?? "")}">${escapeHtml(node.content ?? "")}</a>`;

    case "image":
      return `<img src="${escapeHtmlAttr(node.href ?? "")}" alt="${escapeHtmlAttr(node.alt ?? "")}" />`;

    case "list":
      return `<ul>${node.children?.map(renderNode).join("") ?? ""}</ul>`;

    case "listItem":
      return `<li>${renderChildrenHtml(node.children)}</li>`;

    case "blockquote":
      return `<blockquote>${renderChildrenHtml(node.children)}</blockquote>`;

    case "hr":
      return "<hr />";

    case "table": {
      const rows = node.children ?? [];
      if (rows.length === 0) return "";

      const headerCells = rows[0]?.children ?? [];
      const bodyRows = rows.slice(1);

      return (
        "<table>" +
        `<thead><tr>${headerCells.map(c =>
          `<th>${renderChildrenHtml(c.children)}</th>`
        ).join("")}</tr></thead>` +
        `<tbody>${bodyRows.map(row =>
          `<tr>${row.children?.map(cell =>
            `<td>${renderChildrenHtml(cell.children)}</td>`
          ).join("") ?? ""}</tr>`
        ).join("")}</tbody>` +
        "</table>"
      );
    }

    default:
      return "";
  }
}

function renderChildrenHtml(children?: MdNode[]): string {
  if (!children) return "";
  return children.map(renderNode).join("");
}

/** Quick convert markdown to HTML (parse + render) */
export function mdToHtml(md: string): string {
  const ast = parseMarkdown(md);
  return renderMdToHtml(ast);
}

/** Strip all markdown formatting to plain text */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^\|?.*\|?$/gm, "")
    .replace(/^---+$/gm, "")
    .trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
