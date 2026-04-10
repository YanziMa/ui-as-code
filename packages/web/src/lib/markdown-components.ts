/**
 * React components for rendering Markdown content.
 */

"use client";

import React, { useMemo } from "react";

// --- Types ---

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** Custom component overrides */
  components?: Partial<MarkdownComponents>;
  /** Enable syntax highlighting code blocks */
  highlightCode?: boolean;
  /** Allow raw HTML */
  allowHtml?: boolean;
  /** Link handling */
  onLinkClick?: (href: string) => void;
  /** Image alt text fallback */
  imageFallback?: string;
}

interface MarkdownComponents {
  h1: React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>;
  h2: React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>;
  h3: React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>;
  h4: React.ComponentType<React.HTMLAttributes<HTMLHeadingElement>>;
  p: React.ComponentType<React.HTMLAttributes<HTMLParagraphElement>>;
  a: React.ComponentType<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  strong: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
  em: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
  code: React.ComponentType<React.HTMLAttributes<HTMLElement> & { inline?: boolean }>;
  pre: React.ComponentType<React.HTMLAttributes<HTMLPreElement>>;
  blockquote: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
  ul: React.ComponentType<React.HTMLAttributes<HTMLUListElement>>;
  ol: React.ComponentType<React.HTMLAttributes<HTMLOListElement>>;
  li: React.ComponentType<React.HTMLAttributes<HTMLLIElement>>;
  img: React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>>;
  hr: React.ComponentType<React.HTMLAttributes<HTMLHRElement>>;
  table: React.ComponentType<React.HTMLAttributes<HTMLTableElement>>;
  th: React.ComponentType<React.HTMLAttributes<HTMLTableCellElement>>;
  td: React.ComponentType<React.HTMLAttributes<HTMLTableCellElement>>;
}

// --- Simple Markdown Parser & Renderer ---

/**
 * A lightweight Markdown-to-React renderer.
 * For production, consider using react-markdown + remark/rehype plugins.
 */
export function MarkdownRenderer({
  content,
  className = "",
  components,
  onLinkClick,
}: MarkdownRendererProps) {
  const defaultComponents: Required<MarkdownComponents> = useMemo(() => ({
    h1: ({ children, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 className="text-2xl font-bold mt-7 mb-3" {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>{children}</h3>,
    h4: ({ children, ...props }) => <h4 className="text-lg font-semibold mt-5 mb-2" {...props}>{children}</h4>,
    p: ({ children, ...props }) => <p className="mb-4 leading-relaxed" {...props}>{children}</p>,
    a: ({ href, children, ...props }) => (
      <a
        href={href}
        className="text-indigo-600 hover:text-indigo-800 underline"
        onClick={href && onLinkClick ? (e) => { e.preventDefault(); onLinkClick(href); } : undefined}
        {...props}
      >
        {children}
      </a>
    ),
    strong: ({ children, ...props }) => <strong className="font-semibold" {...props}>{children}</strong>,
    em: ({ children, ...props }) => <em {...props}>{children}</em>,
    code: ({ inline, children, ...props }) =>
      inline ? (
        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      ) : (
        <code className="block p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed" {...props}>
          {children}
        </code>
      ),
    pre: ({ children, ...props }) => <pre className="mb-4 rounded-lg overflow-hidden" {...props}>{children}</pre>,
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-4 border-indigo-300 pl-4 italic text-gray-600 my-4" {...props}>
        {children}
      </blockquote>
    ),
    ul: ({ children, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
    img: ({ src, alt, ...props }) => (
      <img src={src} alt={alt ?? ""} className="max-w-full rounded-lg my-4" loading="lazy" {...props} />
    ),
    hr: (_props) => <hr className="my-8 border-gray-200" />,
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200" {...props}>{children}</table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th className="px-4 py-2 bg-gray-50 text-left text-sm font-semibold text-gray-700 border-b" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-4 py-2 text-sm border-b border-gray-100" {...props}>{children}</td>
    ),
  }), []);

  const mergedComponents = { ...defaultComponents, ...components };

  // Parse markdown into React nodes
  const parsed = useMemo(() => parseMarkdown(content, mergedComponents, onLinkClick), [content, onLinkClick]);

  return <div className={`prose prose-slate dark:prose-invert max-w-none ${className}`}>{parsed}</div>;
}

// --- Parser ---

function parseMarkdown(
  md: string,
  comps: Required<MarkdownComponents>,
  onLinkClick?: (href: string) => void,
): React.ReactNode {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Empty line
    if (/^\s*$/.test(line)) { i++; continue; }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const text = parseInline(headingMatch[2]!, comps);
      const Heading = [comps.h1, comps.h2, comps.h3, comps.h4][level - 1]!;
      elements.push(<Heading key={i}>{text}</Heading>);
      i++; continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      elements.push(<comps.hr key={i} />);
      i++; continue;
    }

    // Code block (fenced)
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <comps.pre key={i}>
          <comps.code>{codeLines.join("\n")}</comps.code>
        </comps.pre>,
      );
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      const inner = quoteLines.join("\n");
      elements.push(<comps.blockquote key={i}>{parseInline(inner, comps)}</comps.blockquote>);
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i]!)) {
        const itemText = lines[i]!.replace(/^[\s]*[-*+]\s/, "");
        items.push(<comps.li key={i}>{parseInline(itemText, comps)}</comps.li>);
        i++;
      }
      elements.push(<comps.ul key={i}>{items}</comps.ul>);
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[\s]*\d+\.\s/.test(lines[i]!)) {
        const itemText = lines[i]!.replace(/^[\s]*\d+\.\s/, "");
        items.push(<comps.li key={i}>{parseInline(itemText, comps)}</comps.li>);
        i++;
      }
      elements.push(<comps.ol key={i}>{items}</coms.ol>);
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+[-|:\s]+\|?$/.test(lines[i + 1]!)) {
      const tableResult = parseTable(lines, i, comps);
      elements.push(tableResult.table);
      i = tableResult.endIndex;
      continue;
    }

    // Paragraph (collect consecutive non-empty lines)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== "" && !lines[i]!.match(/^(#{1,4}|[-*+]|\d+\.|>|`{3,}|-{3,})/)) {
      paraLines.push(lines[i]!);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(<comps.p key={i}>{parseInline(paraLines.join(" "), comps)}</comps.p>);
    }
  }

  return <>{elements}</>;
}

/** Parse inline markdown (bold, italic, code, links, images) */
function parseInline(text: string, comps: Required<MarkdownComponents>): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text** or __text__
    const boldMatch = remaining.match(/^(\*\*(.+?)\*\*|__(.+?)__)/s);
    if (boldMatch) {
      result.push(<comps.strong key={++key}>{parseInline(boldMatch[2] ?? boldMatch[3]!, comps)}</comps.strong>);
      remaining = remaining.slice(boldMatch[0]!.length);
      continue;
    }

    // Italic *text* or _text_
    const italicMatch = remaining.match(/^(\*(.+?)\*|_(.+?)_)/s);
    if (italicMatch) {
      result.push(<comps.em key={++key}>{parseInline(italicMatch[2] ?? italicMatch[3]!, comps)}</comps.em>);
      remaining = remaining.slice(italicMatch[0]!.length);
      continue;
    }

    // Inline code `code`
    const codeMatch = remaining.match(/^(`(.+?)`)/s);
    if (codeMatch) {
      result.push(<comps.code key={++key} inline>{codeMatch[2]}</comps.code>);
      remaining = remaining.slice(codeMatch[0]!.length);
      continue;
    }

    // Image ![alt](url)
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      result.push(<comps.img key={++key} src={imgMatch[2]!} alt={imgMatch[1] ?? ""} />);
      remaining = remaining.slice(imgMatch[0]!.length);
      continue;
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      result.push(<comps.a key={++key} href={linkMatch[2]!}>{linkMatch[1]}</comps.a>);
      remaining = remaining.slice(linkMatch[0]!.length);
      continue;
    }

    // Plain text (up to next special char)
    const plainMatch = remaining.match(/^([^*_`\[!\n]+)/);
    if (plainMatch) {
      result.push(plainMatch[1]);
      remaining = remaining.slice(plainMatch[1].length);
      continue;
    }

    // Single character fallback
    result.push(remaining[0]);
    remaining = remaining.slice(1);
  }

  return result;
}

/** Parse a markdown table starting at given index */
function parseTable(
  lines: string[],
  startIndex: number,
  comps: Required<MarkdownComponents>,
): { table: React.ReactElement; endIndex: number } {
  const headerLine = lines[startIndex]!;
  const separatorLine = lines[startIndex + 1]!; // skip separator

  const headers = headerLine.split("|").filter((c) => c.trim()).map((h) => h.trim());
  const bodyRows: string[][] = [];

  let i = startIndex + 2;
  while (i < lines.length && lines[i]!.includes("|")) {
    const cells = lines[i]!.split("|").filter((c) => c.trim() !== "").map((c) => c.trim());
    bodyRows.push(cells);
    i++;
  }

  return {
    table: (
      <comps.table key={startIndex}>
        <thead>
          <tr>{headers.map((h, idx) => <comps.th key={idx}>{parseInline(h, comps)}</comps.th>)}</tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <comps.td key={cellIdx}>{parseInline(cell, comps)}</comps.td>
              ))}
            </tr>
          ))}
        </tbody>
      </comps.table>
    ),
    endIndex: i,
  };
}

// --- Convenience Exports ---

/** Render markdown as a simple text block (no components) */
export function renderMarkdownToText(md: string): string {
  return md
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
