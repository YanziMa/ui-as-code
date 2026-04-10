/**
 * Markdown Editor: Split-pane markdown editor with live preview, toolbar,
 * syntax highlighting, word count, auto-save draft, and export support.
 */

// --- Types ---

export interface MarkdownEditorOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial markdown content */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Show toolbar? */
  showToolbar?: boolean;
  /** Show live preview? */
  showPreview?: boolean;
  /** Preview position: "right" | "below" */
  previewPosition?: "right" | "below";
  /** Editor height (default: "400px") */
  height?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Show word/char count? */
  showStats?: boolean;
  /** Auto-save interval in ms (0 = disabled) */
  autoSaveInterval?: number;
  /** Storage key for auto-save (default: "md-draft") */
  storageKey?: string;
  /** Tab size for editor (default: 2) */
  tabSize?: number;
  /** Font size in px (default: 14) */
  fontSize?: number;
  /** Theme: "light" | "dark" */
  theme?: "light" | "dark";
  /** Custom markdown-to-HTML renderer */
  renderMarkdown?: (md: string) => string;
  /** Callback on content change */
  onChange?: (markdown: string) => void;
  /** Callback on save */
  onSave?: (markdown: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface MarkdownEditorInstance {
  element: HTMLElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getHtml: () => string;
  insertText: (text: string) => void;
  wrapSelection: (before: string, after: string) => void;
  focus: () => void;
  clear: () => void;
  togglePreview: () => void;
  destroy: () => void;
}

// --- Simple Markdown Renderer ---

function renderMarkdownSimple(md: string): string {
  let html = md;

  // Escape HTML first
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
    `<pre><code class="language-${lang}">${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">');

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr>");

  // Paragraphs (remaining lines)
  html = html.replace(/^(?!<[hublop]|<li|<pre|<blockquote|<hr)(.+)$/gm, "<p>$1</p>");

  // Line breaks
  html = html.replace(/\n\n/g, "");

  return html;
}

// --- Toolbar Actions ---

interface ToolbarAction {
  icon: string;
  title: string;
  action: () => void;
}

// --- Main Factory ---

export function createMarkdownEditor(options: MarkdownEditorOptions): MarkdownEditorInstance {
  const opts = {
    value: options.value ?? "",
    placeholder: options.placeholder ?? "Write your markdown here...",
    showToolbar: options.showToolbar ?? true,
    showPreview: options.showPreview ?? true,
    previewPosition: options.previewPosition ?? "right",
    height: options.height ?? "400px",
    readOnly: options.readOnly ?? false,
    showStats: options.showStats ?? true,
    autoSaveInterval: options.autoSaveInterval ?? 0,
    storageKey: options.storageKey ?? "md-draft",
    tabSize: options.tabSize ?? 2,
    fontSize: options.fontSize ?? 14,
    theme: options.theme ?? "light",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("MarkdownEditor: container not found");

  const isDark = opts.theme === "dark";
  const colors = isDark
    ? { bg: "#1e1e2e", surface: "#252533", border: "#3a3a4a", text: "#d4d4d4", muted: "#8b8b9a", accent: "#7c6ff0" }
    : { bg: "#ffffff", surface: "#f9fafb", border: "#e5e7eb", text: "#1f2937", muted: "#9ca3af", accent: "#4338ca" };

  let destroyed = false;
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  let previewVisible = opts.showPreview;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `markdown-editor ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:${opts.previewPosition === "right" ? "row" : "column"};
    width:100%;height:${opts.height};border:1px solid ${colors.border};
    border-radius:8px;overflow:hidden;background:${colors.bg};font-family:-apple-system,sans-serif;
  `;
  container.appendChild(root);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "me-toolbar";
  toolbar.style.cssText = `
    display:flex;align-items:center;gap:2px;padding:6px 10px;
    background:${colors.surface};border-bottom:1px solid ${colors.border};
    flex-shrink:0;flex-wrap:wrap;
  `;

  if (opts.showToolbar) {
    const actions: ToolbarAction[] = [
      { icon: "**B**", title: "Bold", action: () => wrap("**") },
      { icon: "*I*", title: "Italic", action: () => wrap("*") },
      { icon: "`C`", title: "Code", action: () => wrap("`") },
      { icon: "[L]", title: "Link", action: () => insert("[text](url)") },
      { icon: "![]", title: "Image", action: () => insert("![alt](url)") },
      { icon: "# H", title: "Heading", action: () => insert("\n## ") },
      { icon: "- ", title: "List", action: () => insert("\n- ") },
      { icon: "> ", title: "Quote", action: () => insert("\n> ") },
      { icon: "---", title: "Rule", action: () -> insert("\n---\n") },
      { icon: "```", title: "Code Block", action: () => insert("\n```\n\n```\n") },
    ];

    for (const act of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = act.icon;
      btn.title = act.title;
      btn.style.cssText = `
        padding:4px 8px;border:none;border-radius:4px;background:transparent;
        cursor:pointer;font-size:12px;font-weight:500;color:${colors.muted};
        font-family:'SF Mono',Consolas,monospace;transition:all 0.15s;
      `;
      btn.addEventListener("click", act.action);
      btn.addEventListener("mouseenter", () => { btn.style.background = colors.border; btn.style.color = colors.text; });
      btn.addEventListener("mouseleave", () => { btn.style.background = ""; btn.style.color = colors.muted; });
      toolbar.appendChild(btn);
    }

    // Separator + preview toggle
    const sep = document.createElement("span");
    sep.style.cssText = `width:1px;height:16px;background:${colors.border;margin:0 4px;`;
    toolbar.appendChild(sep);

    const previewToggle = document.createElement("button");
    previewToggle.type = "button";
    previewToggle.textContent = previewVisible ? "Preview" : "Edit";
    previewToggle.style.cssText = `
      padding:4px 10px;border-radius:4px;border:1px solid ${colors.border};
      background:transparent;cursor:pointer;font-size:11px;color:${colors.text};
      transition:all 0.15s;
    `;
    previewToggle.addEventListener("click", () => instance.togglePreview());
    previewToggle.addEventListener("mouseenter", () => { previewToggle.style.background = colors.surface; });
    previewToggle.addEventListener("mouseleave", () => { previewToggle.style.background = ""; });
    toolbar.appendChild(previewToggle);

    root.appendChild(toolbar);
  }

  // Editor area
  const editorPane = document.createElement("div");
  editorPane.className = "me-editor-pane";
  editorPane.style.cssText = `
    flex:1;display:flex;flex-direction:column;min-width:0;
    overflow:hidden;${!previewVisible || opts.previewPosition === "below" ? "" : "max-width:50%;"}
  `;

  const textarea = document.createElement("textarea");
  textarea.className = "me-textarea";
  textarea.spellcheck = false;
  textarea.value = opts.value;
  textarea.placeholder = opts.placeholder;
  textarea.readOnly = opts.readOnly;
  textarea.style.cssText = `
    flex:1;width:100%;padding:16px;border:none;outline:none;resize:none;
    background:transparent;color:${colors.text};font-size:${opts.fontSize}px;
    line-height:1.7;font-family:'SF Mono','Fira Code',Consolas,monospace;
    tab-size:${opts.tabSize};white-space:pre-wrap;word-break:break-word;
  `;
  editorPane.appendChild(textarea);

  // Stats bar
  if (opts.showStats) {
    const statsBar = document.createElement("div");
    statsBar.className = "me-stats";
    statsBar.style.cssText = `
      display:flex;justify-content:space-between;padding:4px 16px;
      font-size:11px;color:${colors.muted};background:${colors.surface};
      border-top:1px solid ${colors.border};
    `;
    statsBar.innerHTML = `<span class="me-words">0 words</span><span class="me-chars">0 chars</span>`;
    editorPane.appendChild(statsBar);
  }

  root.appendChild(editorPane);

  // Preview area
  const previewPane = document.createElement("div");
  previewPane.className = "me-preview-pane";
  previewPane.style.cssText = `
    flex:1;overflow-y:auto;padding:16px;border-left:${opts.previewPosition === "right" ? `1px solid ${colors.border}` : "none"};
    border-top:${opts.previewPosition === "below" ? `1px solid ${colors.border}` : "none"};
    background:${isDark ? "#1a1a28" : "#fefefe"};font-size:${opts.fontSize}px;line-height:1.7;
    display:${previewVisible ? "block" : "none"};
    ${previewVisible && opts.previewPosition === "right" ? "min-width:0;" : ""}
  `;
  root.appendChild(previewPane);

  // --- Helper Functions ---

  function wrap(beforeAndAfter: string): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    const newText = beforeAndAfter + selected + beforeAndAfter;
    replaceRange(start, end, newText);
    textarea.focus();
  }

  function insert(text: string): void {
    const pos = textarea.selectionStart;
    replaceRange(pos, pos, text);
    textarea.focus();
  }

  function replaceRange(start: number, end: number, text: string): void {
    const val = textarea.value;
    textarea.value = val.slice(0, start) + text + val.slice(end);
    textarea.selectionStart = start + text.length;
    textarea.selectionEnd = start + text.length;
    updatePreview();
    updateStats();
    opts.onChange?.(textarea.value);
  }

  function updatePreview(): void {
    if (!previewVisible) return;
    const renderer = opts.renderMarkdown ?? renderMarkdownSimple;
    previewPane.innerHTML = renderer(textarea.value);
  }

  function updateStats(): void {
    if (!opts.showStats) return;
    const wordsBar = root.querySelector(".me-words") as HTMLElement;
    const charsBar = root.querySelector(".me-chars") as HTMLElement;
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = textarea.value.length;
    if (wordsBar) wordsBar.textContent = `${words} words`;
    if (charsBar) charsBar.textContent = `${chars} chars`;
  }

  function saveDraft(): void {
    try {
      localStorage.setItem(opts.storageKey, textarea.value);
    } catch {}
  }

  function loadDraft(): void {
    try {
      const saved = localStorage.getItem(opts.storageKey);
      if (saved && !opts.value) {
        textarea.value = saved;
        updatePreview();
        updateStats();
      }
    } catch {}
  }

  // --- Event Handlers ---

  textarea.addEventListener("input", () => {
    updatePreview();
    updateStats();
    opts.onChange?.(textarea.value);
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !opts.readOnly) {
      e.preventDefault();
      insert(" ".repeat(opts.tabSize));
    } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveDraft();
      opts.onSave?.(textarea.value);
    }
  });

  // Auto-save
  if (opts.autoSaveInterval > 0) {
    autoSaveTimer = setInterval(saveDraft, opts.autoSaveInterval);
  }

  // Load saved draft on init
  loadDraft();
  updatePreview();
  updateStats();

  const instance: MarkdownEditorInstance = {
    element: root,

    getValue() { return textarea.value; },

    setValue(val: string) {
      textarea.value = val;
      updatePreview();
      updateStats();
      opts.onChange?.(val);
    },

    getHtml() {
      const renderer = opts.renderMarkdown ?? renderMarkdownSimple;
      return renderer(textarea.value);
    },

    insertText(text: string) { insert(text); },

    wrapSelection(before: string, after: string) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const sel = textarea.value.slice(start, end);
      replaceRange(start, end, before + sel + after);
    },

    focus() { textarea.focus(); },

    clear() {
      textarea.value = "";
      updatePreview();
      updateStats();
      opts.onChange?.("");
    },

    togglePreview() {
      previewVisible = !previewVisible;
      previewPane.style.display = previewVisible ? "block" : "none";

      if (previewVisible) {
        editorPane.style.maxWidth = opts.previewPosition === "right" ? "50%" : "";
        updatePreview();
      } else {
        editorPane.style.maxWidth = "";
      }

      const toggleBtn = root.querySelector(".me-preview-pane") ? null :
        toolbar.querySelector("button:last-child") as HTMLElement;
      if (toggleBtn) toggleBtn.textContent = previewVisible ? "Preview" : "Edit";
    },

    destroy() {
      destroyed = true;
      if (autoSaveTimer) clearInterval(autoSaveTimer);
      root.remove();
    },
  };

  return instance;
}
