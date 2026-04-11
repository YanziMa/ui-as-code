/**
 * Markdown Editor Utilities: Lightweight markdown editor with toolbar, live preview,
 * syntax highlighting, auto-save draft, and export to HTML.
 */

// --- Types ---

export type ToolbarAction =
  | "bold" | "italic" | "strikethrough" | "heading"
  | "link" | "image" | "code" | "quote" | "ul" | "ol"
  | "hr" | "preview";

export interface MarkdownEditorOptions {
  /** Initial markdown content */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Height in px */
  height?: number;
  /** Show toolbar? */
  showToolbar?: boolean;
  /** Show preview panel (side-by-side)? */
  showPreview?: boolean;
  /** Preview position: "right" or "bottom" */
  previewPosition?: "right" | "bottom";
  /** Enable tab key for indentation? */
  enableTabIndent?: boolean;
  /** Auto-save interval in ms (0 = disabled) */
  autoSaveInterval?: number;
  /** Storage key for auto-save */
  storageKey?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Called when content changes */
  onChange?: (markdown: string, html: string) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface MarkdownEditorInstance {
  /** Root element */
  el: HTMLElement;
  /** The textarea element */
  textarea: HTMLTextAreaElement;
  /** Get current markdown content */
  getValue: () => string;
  /** Set content programmatically */
  setValue: (markdown: string) => void;
  /** Get rendered HTML */
  getHTML: () => string;
  /** Insert text at cursor */
  insertAtCursor: (text: string) => void;
  /** Wrap selection with markdown syntax */
  wrapSelection: (before: string, after: string) => void;
  /** Focus the editor */
  focus: () => void;
  /** Toggle preview panel */
  togglePreview: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Simple Markdown to HTML Converter ---

function mdToHtml(md: string): string {
  if (!md) return "";

  let html = md
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    // Code blocks (``` ... ```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) =>
      `<pre><code class="language-${lang || ""}">${code}</code></pre>`)

    // Inline code (`...`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")

    // Headings
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")

    // Bold + Italic (**...**, *...*)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!>)\*/g, "<em>$1</em>")

    // Strikethrough (~~...~~)
    .replace(/~~(.+?)~~/g, "<del>$1</del>")

    // Horizontal rule (--- or *** or ___)
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "<hr>")

    // Blockquotes (> ...)
    .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")

    // Images (![alt](url))
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')

    // Links ([text](url))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    // Unordered lists (- item or * item)
    .replace(/^[\s]*[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>(\n\s*)?)+/gs, "<ul>$&</ul>")

    // Ordered lists (1. item)
    .replace(/^[\s]*\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>(\n\s*)?)+/gs, "<ol>$&</ol>")

    // Paragraphs (double newline separated)
    .replace(/\n\n+/g, "</p><p>");

  // Wrap in paragraphs
  if (!html.startsWith("<") && !html.startsWith("<h")) {
    html = `<p>${html}</p>`;
  }

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p>\s*<(h[1-6]|<ul|<ol|<blockquote|<pre|<hr)/g, "$1");

  return html.trim();
}

// --- Core Factory ---

/**
 * Create a lightweight markdown editor.
 *
 * @example
 * ```ts
 * const editor = createMarkdownEditor({
 *   value: "# Hello World",
 *   showToolbar: true,
 *   showPreview: true,
 *   onChange: (md, html) => saveContent(md),
 * });
 * ```
 */
export function createMarkdownEditor(options: MarkdownEditorOptions = {}): MarkdownEditorInstance {
  const {
    value = "",
    placeholder = "Write markdown here...",
    height = 300,
    showToolbar = true,
    showPreview = false,
    previewPosition = "right",
    enableTabIndent = true,
    autoSaveInterval = 0,
    storageKey = "md-draft",
    readOnly = false,
    onChange,
    className,
    container,
  } = options;

  let _previewVisible = showPreview;
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `md-editor ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;border:1px solid #d1d5db;border-radius:10px;overflow:hidden;" +
    "font-family:-apple-system,sans-serif;font-size:14px;line-height:1.6;" +
    (readOnly ? "opacity:0.7;pointer-events:none;" : "") +
    `flex-direction:${previewPosition === "bottom" ? "column" : "row"};`;

  // Toolbar
  let toolbarEl: HTMLElement | null = null;
  if (showToolbar && !readOnly) {
    toolbarEl = document.createElement("div");
    toolbarEl.className = "md-toolbar";
    toolbarEl.style.cssText =
      "display:flex;gap:2px;padding:6px 12px;background:#f9fafb;" +
      "border-bottom:1px solid #e5e7eb;flex-wrap:wrap;align-items:center;";

    const actions: Array<{ action: ToolbarAction; label: string; title: string; shortcut: string }> = [
      { action: "bold", label: "B", title: "Bold", shortcut: "Ctrl+B" },
      { action: "italic", label: "I", title: "Italic", shortcut: "Ctrl+I" },
      { action: "heading", label: "H", title: "Heading", shortcut: "" },
      { action: "link", label: "\u{1F517}", title: "Link", shortcut: "Ctrl+K" },
      { action: "code", label: "&lt;/&gt;", title: "Code", shortcut: "Ctrl+E" },
      { action: "quote", label: "\u{201C}", title: "Quote", shortcut: "" },
      { action: "ul", label: "\u2022a", title: "List", shortcut: "" },
      { action: "ol", label: "1.", title: "Numbered List", shortcut: "" },
      { action: "hr", label: "---", title: "Horizontal Rule", shortcut: "" },
      { action: "preview", label: "\u{1F441}", title: "Toggle Preview", shortcut: "Ctrl+P" },
    ];

    for (const act of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = act.label;
      btn.title = `${act.title}${act.shortcut ? ` (${act.shortcut})` : ""}`;
      btn.dataset.action = act.action;
      btn.style.cssText =
        "padding:4px 8px;border:1px solid #d1d5db;border-radius:5px;background:#fff;" +
        "cursor:pointer;font-size:13px;color:#374151;font-weight:500;" +
        "transition:background 0.1s;";
      btn.addEventListener("mouseenter", () => { btn.style.background = "#e5e7eb"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "#fff"; });

      btn.addEventListener("click", () => handleToolbarAction(act.action));
      toolbarEl.appendChild(btn);
    }

    root.appendChild(toolbarEl);
  }

  // Editor area container
  const editorContainer = document.createElement("div");
  editorContainer.className = "md-editor-container";
  editorContainer.style.cssText =
    "display:flex;flex-direction:column;flex:1;min-width:0;";

  // Textarea
  const textarea = document.createElement("textarea");
  textarea.className = "md-textarea";
  textarea.value = value;
  textarea.placeholder = placeholder;
  textarea.readOnly = readOnly;
  textarea.style.cssText =
    `width:100%;height:${height}px;flex:1;resize:none;border:none;outline:none;` +
    "padding:12px 16px;font-family:inherit;font-size:inherit;line-height:inherit;" +
    "color:#111827;background:transparent;tab-size:4;white-space:pre-wrap;word-break:break-word;";
  editorContainer.appendChild(textarea);

  root.appendChild(editorContainer);

  // Preview area
  let previewContainer: HTMLElement | null = null;
  let previewEl: HTMLElement | null = null;

  if (showPreview) {
    previewContainer = document.createElement("div");
    previewContainer.className = "md-preview-container";
    previewContainer.style.cssText =
      `flex:1;overflow:auto;padding:16px 20px;background:#fafafa;border-${previewPosition === "right" ? "left" : "top"}:1px solid #e5e7eb;display:none;` +
      "font-size:14px;line-height:1.6;color:#374151;";

    previewEl = document.createElement("div");
    previewEl.className = "md-preview-content";
    previewContainer.appendChild(previewEl);

    root.appendChild(previewContainer);
  }

  (container ?? document.body).appendChild(root);

  // --- Handlers ---

  function handleToolbarAction(action: ToolbarAction): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    switch (action) {
      case "bold":
        wrapSelection("**", "**");
        break;
      case "italic":
        wrapSelection("*", "*");
        break;
      case "heading": {
        const line = getLineBeforeCursor();
        const level = countHeadingLevel(line) < 6 ? countHeadingLevel(line) + 1 : 1;
        insertAtLineStart("#".repeat(level) + " ");
        break;
      }
      case "link": {
        const selected = textarea.value.substring(start, end) || "";
        const url = prompt("URL:", selected || "https://");
        if (url) {
          wrapSelection("[", `](${url})`);
        }
        break;
      }
      case "code":
        wrapSelection("`", "`");
        break;
      case "quote":
        insertAtLineStart("> ");
        break;
      case "ul":
        insertAtLineStart("- ");
        break;
      case "ol":
        insertAtLineStart("1. ");
        break;
      case "hr":
        insertAtLineStart("\n---\n");
        break;
      case "preview":
        togglePreview();
        break;
    }

    textarea.focus();
    triggerChange();
  }

  function getLineBeforeCursor(): string {
    const pos = textarea.selectionStart;
    const text = textarea.value;
    const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
    return text.substring(lineStart, pos).trim();
  }

  function countHeadingLevel(line: string): number {
    const m = match = /^(#+)\s/.exec(line);
    return m ? m[1].length : 0;
  }

  function wrapSelection(before: string, after: string): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;

    const selected = textarea.value.substring(start, end);
    textarea.setRangeText(before + selected + after, start, end);
    textarea.setSelectionRange(start, start + before.length + selected.length + after.length);
  }

  function insertAtCursor(text: string): void {
    const start = textarea.selectionStart;
    textarea.setRangeText(text, start, textarea.selectionEnd);
    textarea.setSelectionRange(start + text.length, start + text.length);
    triggerChange();
  }

  function insertAtLineStart(text: string): void {
    const pos = textarea.selectionStart;
    const text = textarea.value;
    const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
    textarea.setRangeText(text, lineStart, lineStart);
    textarea.setSelectionRange(lineStart + text.length, lineStart + text.length);
    triggerChange();
  }

  function triggerChange(): void {
    if (autoSaveInterval > 0) scheduleAutoSave();
    onChange?.(textarea.value, mdToHtml(textarea.value));

    if (_previewVisible && previewEl) {
      previewEl.innerHTML = mdToHtml(textarea.value);
    }
  }

  function scheduleAutoSave(): void {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      try { localStorage.setItem(storageKey, textarea.value); } catch {}
    }, autoSaveInterval);
  }

  // Load saved draft
  if (autoSaveInterval > 0 && storageKey) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        textarea.value = saved;
        triggerChange();
      }
    } catch {}
  }

  // Event listeners
  textarea.addEventListener("input", () => triggerChange());

  if (enableTabIndent) {
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        insertAtCursor("  ");
      }
    });
  }

  // Keyboard shortcuts
  textarea.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b": e.preventDefault(); handleToolbarAction("bold"); break;
        case "i": e.preventDefault(); handleToolbarAction("italic"); break;
        case "k": e.preventDefault(); handleToolbarAction("link"); break;
        case "e": e.preventDefault(); handleToolbarAction("code"); break;
        case "p": e.preventDefault(); togglePreview(); break;
      }
    }
  });

  // --- Public API ---

  function getValue(): string { return textarea.value; }

  function setValue(markdown: string): void {
    textarea.value = markdown;
    triggerChange();
  }

  function getHTML(): string { return mdToHtml(textarea.value); }

  function focus(): void { textarea.focus(); }

  function togglePreview(): void {
    _previewVisible = !_previewVisible;
    if (previewContainer) {
      previewContainer.style.display = _previewVisible ? "" : "none";
      if (_previewVisible && previewEl) {
        previewEl.innerHTML = mdToHtml(textarea.value);
      }
    }
    // Adjust flex direction
    root.style.flexDirection = _previewVisible && previewPosition === "bottom" ? "column" : "row";
  }

  function destroy(): void {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    root.remove();
  }

  return {
    el: root,
    textarea,
    getValue, setValue, getHTML,
    insertAtCursor, wrapSelection,
    focus, togglePreview, destroy,
  };
}
