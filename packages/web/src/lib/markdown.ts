/**
 * Lightweight Markdown-to-HTML converter (no external dependency).
 * Supports: headers, bold, italic, code, links, lists, blockquotes, paragraphs.
 */

interface MdOptions {
  sanitize?: boolean;
}

/** Convert basic Markdown to HTML */
export function mdToHtml(markdown: string, options: MdOptions = {}): string {
  const { sanitize = true } = options;

  let html = markdown;

  // Escape HTML if sanitizing
  if (sanitize) {
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const cls = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${cls}>${code.trim()}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr />");

  // Paragraphs (lines not already in HTML tags)
  html = html.replace(
    /^(?!<[hublopauli])(.+)$/gm,
    "<p>$1</p>",
  );

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html.trim();
}

/** Strip all markdown formatting to plain text */
export function stripMd(markdown: string): string {
  let text = markdown;
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "");
  // Remove inline code
  text = text.replace(/`[^`]+`/g, "");
  // Remove images
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove formatting
  text = text.replace(/\*\*\*.*?\*\*\*/g, "");
  text = text.replace(/\*\*.*?\*\*/g, "");
  text = text.replace(/\*.*?\*/g, "");
  text = text.replace(/~~.*?~~/g, "");
  // Remove headers marker
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Remove list markers
  text = text.replace(/^[\s]*[-*]\s+/gm, "");
  text = text.replace(/^\d+\.\s+/gm, "");
  // Remove blockquote markers
  text = text.replace(/^&gt;\s*/gm, "");
  // Remove HR
  text = text.replace(/^---+$/gm, "");
  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}
