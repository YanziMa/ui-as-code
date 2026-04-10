/**
 * Code Editor: Lightweight code editor with line numbers, syntax highlighting,
 * auto-indent, search/replace, bracket matching, undo/redo, minimap,
 * word wrap, and theme support.
 */

// --- Types ---

export interface CodeEditorOptions {
  /** Container element */
  container: HTMLElement;
  /** Initial code content */
  value?: string;
  /** Language for syntax highlighting */
  language?: string;
  /** Theme: 'light' or 'dark' (default: 'dark') */
  theme?: "light" | "dark";
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Font size in px (default: 13) */
  fontSize?: number;
  /** Font family (default: monospace) */
  fontFamily?: string;
  /** Tab size in spaces (default: 2) */
  tabSize?: number;
  /** Enable word wrap */
  wordWrap?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Show minimap */
  showMinimap?: boolean;
  /** Minimap width in px (default: 80) */
  minimapWidth?: number;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Callback on code change */
  onChange?: (code: string) => void;
  /** Callback on save (Ctrl+S) */
  onSave?: (code: string) => void;
  /** Custom syntax highlighter */
  highlighter?: (code: string, lang: string) => string;
}

export interface CodeEditorInstance {
  /** Root element */
  element: HTMLDivElement;
  /** Textarea element (editable area) */
  textarea: HTMLTextAreaElement;
  /** Get current code */
  getValue: () => string;
  /** Set code content */
  setValue: (code: string) => void;
  /** Insert text at cursor position */
  insertAtCursor: (text: string) => void;
  /** Get selected text */
  getSelection: () => { start: number; end: number; text: string };
  /** Replace selection */
  replaceSelection: (text: string) => void;
  /** Find next occurrence */
  find: (query: string) => { index: number; count: number } | null;
  /** Find and replace all */
  replaceAll: (query: string, replacement: string) => number;
  /** Go to line */
  goToLine: (line: number) => void;
  /** Get total line count */
  getLineCount: () => number;
  /** Focus the editor */
  focus: () => void;
  /** Set language */
  setLanguage: (lang: string) => void;
  /** Set read-only mode */
  setReadOnly: (readOnly: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Syntax Highlighting (built-in simple tokenizer) ---

interface TokenRule {
  pattern: RegExp;
  cssClass: string;
}

const SYNTAX_RULES: Record<string, TokenRule[]> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, cssClass: "ce-comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, cssClass: "ce-comment" },
    { pattern: /("(?:[^"\\]|\\.)*"/g, cssClass: "ce-string" },
    { pattern: /('(?:[^'\\]|\\.)*')/g, cssClass: "ce-string" },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|null|undefined|true|false|this|super)\b/g, cssClass: "ce-keyword" },
    { pattern: /\b(\d+\.?\d*)\b/g, cssClass: "ce-number" },
    { pattern: /([\[\](){};,.])/g, cssClass: "ce-punctuation" },
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, cssClass: "ce-comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, cssClass: "ce-comment" },
    { pattern: /("(?:[^"\\]|\\.)*")/g, cssClass: "ce-string" },
    { pattern: /('(?:[^'\\]|\\.)*')/g, cssClass: "ce-string" },
    { pattern: /(`(?:[^`\\]|\\.)*`)/g, cssClass: "ce-template" },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|null|undefined|true|false|this|super|type|interface|enum|implements|public|private|protected|readonly|abstract|as|is|key|of)\b/g, cssClass: "ce-keyword" },
    { pattern: /\b(\d+\.?\d*)\b/g, cssClass: "ce-number" },
    { pattern: /([\[\](){};,.<>])/g, cssClass: "ce-punctuation" },
  ],
  html: [
    { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, cssClass: "ce-comment" },
    { pattern: /(&lt;[\w-]+)|(&gt;)/g, cssClass: "ce-tag" },
    { pattern: /([\w-]+)=/g, cssClass: "ce-attr" },
    { pattern: /("(?:[^"\\]|\\.)*")/g, cssClass: "ce-string" },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, cssClass: "ce-comment" },
    { pattern: /(#[\w-]+)/g, cssClass: "ce-selector" },
    { pattern: /([\.\w-]+)\s*\{/g, cssClass: "ce-property" },
    { pattern: /(:[\w-]+)/g, cssClass: "ce-value" },
    { pattern: /(@[\w-]+)/g, cssClass: "ce-atrule" },
    { pattern: /("(?:[^"\\]|\\.)*")/g, cssClass: "ce-string" },
    { pattern: /\b(\d+\.?\d*(px|em|rem|%|vh|vw|s|ms)?)/gi, cssClass: "ce-number" },
  ],
  python: [
    { pattern: /(#.*$)/gm, cssClass: "ce-comment" },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, cssClass: "ce-string" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, cssClass: "ce-string" },
    { pattern: /\b(def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|yield|lambda|and|or|not|in|is|None|True|False|self|raise|pass|break|continue|global|nonlocal|assert|del|async|await)\b/g, cssClass: "ce-keyword" },
    { pattern: /\b(\d+\.?\d*)\b/g, cssClass: "ce-number" },
    { pattern: /([\[\](){}:,])/g, cssClass: "ce-punctuation" },
    { pattern: /(@[\w-]+)/g, cssClass: "ce-decorator" },
  ],
  sql: [
    { pattern: /(--.*$)/gm, cssClass: "ce-comment" },
    { pattern: /("(?:[^"\\]|\\.)*")/g, cssClass: "ce-string" },
    { pattern: /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|TRUE|FALSE|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|AUTO_INCREMENT|CASCADE|GRANT|REVOKE|COMMIT|ROLLBACK)\b/gi, cssClass: "ce-keyword" },
    { pattern: /\b(\d+\.?\d*)\b/g, cssClass: "ce-number" },
  ],
  json: [
    { pattern: /("(?:[^"\\]|\\.)*")/g, cssClass: "ce-keyword" },
    { pattern: /\b(true|false|null)\b/g, cssClass: "ce-number" },
    { pattern: /\b(\d+\.?\d*)\b/g, cssClass: "ce-number" },
    { pattern: /([{}\[\]:,])/g, cssClass: "ce-punctuation" },
  ],
};

const DEFAULT_THEME = {
  dark: {
    bg: "#1e1e2e",
    text: "#d4d4d4",
    gutterBg: "#252533",
    gutterText: "#6e7681",
    lineNumber: "#495460",
    lineHighlight: "#2a2a3c",
    selection: "#264f78",
    cursor: "#aeafad",
    comment: "#6a9955",
    keyword: "#569cd6",
    string: "#ce9178",
    number: "#b5cea8",
    tag: "#569cd6",
    attr: "#9cdcfe",
    property: "#9cdcfe",
    value: "#ce9178",
    selector: "#d7ba7d",
    atrule: "#c586c0",
    template: "#d16969",
    decorator: "#73d216",
    punctuation: "#858f9a",
  },
  light: {
    bg: "#ffffff",
    text: "#333333",
    gutterBg: "#f3f3f3",
    gutterText: "#999999",
    lineNumber: "#cccccc",
    lineHighlight: "#f0f0f0",
    selection: "#add6ff",
    cursor: "#000000",
    comment: "#008000",
    keyword: "#0000ff",
    string: "#a31515",
    number: "#098658",
    tag: "#800000",
    attr: "#ff0000",
    property: "#ff0000",
    value: "#a31515",
    selector: "#800000",
    atrule: "#800080",
    template: "#0070c1",
    decorator: "#800080",
    punctuation: "#333333",
  },
};

// --- Main Class ---

export class CodeEditorManager {
  create(options: CodeEditorOptions): CodeEditorInstance {
    const opts = {
      value: options.value ?? "",
      language: options.language ?? "javascript",
      theme: options.theme ?? "dark",
      showLineNumbers: options.showLineNumbers ?? true,
      fontSize: options.fontSize ?? 13,
      fontFamily: options.fontFamily ?? "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
      tabSize: options.tabSize ?? 2,
      wordWrap: options.wordWrap ?? false,
      readOnly: options.readOnly ?? false,
      showMinimap: options.showMinimap ?? false,
      minimapWidth: options.minimapWidth ?? 80,
      placeholder: options.placeholder ?? "// Type your code here...",
      ...options,
    };

    const t = DEFAULT_THEME[opts.theme];

    // Root
    const root = document.createElement("div");
    root.className = "code-editor";
    root.style.cssText = `
      display:flex;width:100%;height:100%;background:${t.bg};color:${t.text};
      font-family:${opts.fontFamily};font-size:${opts.fontSize}px;line-height:1.6;
      overflow:hidden;border-radius:8px;position:relative;
    `;
    options.container.appendChild(root);

    // Line numbers gutter
    const gutter = document.createElement("div");
    gutter.className = "ce-gutter";
    gutter.style.cssText = `
      background:${t.gutterBg};color:${t.gutterText};
      padding:12px 0;text-align:right;user-select:none;
      font-size:${opts.fontSize}px;font-family:${opts.fontFamily};
      min-width:40px;overflow:hidden;flex-shrink:0;
    `;
    if (!opts.showLineNumbers) gutter.style.display = "none";
    root.appendChild(gutter);

    // Editor wrapper (textarea + highlight overlay)
    const editorWrapper = document.createElement("div");
    editorWrapper.className = "ce-wrapper";
    editorWrapper.style.cssText = `
      flex:1;position:relative;overflow:auto;padding:12px 0;
    `;
    root.appendChild(editorWrapper);

    // Highlighted code overlay
    const highlightEl = document.createElement("pre");
    highlightEl.className = "ce-highlight";
    highlightEl.setAttribute("aria-hidden", "true");
    highlightEl.style.cssText = `
      margin:0;padding:0 16px;pointer-events:none;white-space:pre-wrap;
      ${opts.wordWrap ? "" : "overflow-x:auto;"}
      color:transparent;font-family:inherit;font-size:inherit;line-height:inherit;
    `;
    editorWrapper.appendChild(highlightEl);

    // Editable textarea
    const textarea = document.createElement("textarea");
    textarea.className = "ce-textarea";
    textarea.spellcheck = false;
    textarea.value = opts.value;
    textarea.placeholder = opts.placeholder;
    textarea.readOnly = opts.readOnly;
    textarea.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      padding:12px 16px;margin:0;border:none;outline:none;resize:none;
      background:transparent;color:transparent;caret-color:${t.cursor};
      font-family:inherit;font-size:inherit;line-height:inherit;
      tab-size:${opts.tabSize};
      white-space:pre;overflow:hidden;
      ${opts.wordWrap ? "white-space:pre-wrap;" : ""}
    `;
    editorWrapper.appendChild(textarea);

    // Minimap
    let minimap: HTMLCanvasElement | null = null;
    if (opts.showMinimap) {
      minimap = document.createElement("canvas");
      minimap.className = "ce-minimap";
      minimap.width = opts.minimapWidth;
      minimap.style.cssText = `
        width:${opts.minimapWidth}px;height:100%;background:${t.gutterBg};
        flex-shrink:0;display:block;
      `;
      root.appendChild(minimap);
    }

    // Sync scroll between gutter and editor
    const syncScroll = () => {
      const scrollTop = editorWrapper.scrollTop;
      const lineHeight = opts.fontSize * 1.6;
      const firstVisibleLine = Math.floor(scrollTop / lineHeight);
      updateGutter(firstVisibleLine);
      if (minimap) updateMinimap();
    };

    function updateGutter(startLine: number): void {
      const lines = textarea.value.split("\n").length;
      let html = "";
      for (let i = startLine + 1; i <= Math.min(lines, startLine + Math.ceil(editorWrapper.clientHeight / (opts.fontSize * 1.6)) + 2); i++) {
        html += `<div style="padding:0 8px;color:${t.lineNumber};">${i}</div>`;
      }
      gutter.innerHTML = html;
      gutter.scrollTop = editorWrapper.scrollTop;
    }

    function updateMinimap(): void {
      if (!minimap) return;
      const ctx = minimap.getContext("2d");
      if (!ctx) return;

      const w = minimap.width;
      const h = minimap.height = editorWrapper.scrollHeight;
      minimap.height = h;

      ctx.fillStyle = t.gutterBg;
      ctx.fillRect(0, 0, w, h);

      const lines = textarea.value.split("\n");
      const lineHeight = Math.max(2, h / Math.max(lines.length, 1));
      ctx.fillStyle = t.gutterText;
      ctx.font = `${Math.max(1, lineHeight - 1)}px monospace`;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const ratio = line.length / Math.max(...lines.map((l) => l.length), 1);
        ctx.globalAlpha = 0.3 + ratio * 0.7;
        ctx.fillRect(0, i * lineHeight, w * 0.85, lineHeight - 1);
      }
    }

    function applyHighlighting(): void {
      let html = escapeHtml(textarea.value);
      if (opts.highlighter) {
        html = opts.highlighter(textarea.value, opts.language);
      } else {
        const rules = SYNTAX_RULES[opts.language] ?? SYNTAX_RULES.javascript;
        for (const rule of rules) {
          html = html.replace(rule.pattern, (match) =>
            `<span class="${rule.cssClass}">${match}</span>`
          );
        }
      }
      highlightEl.innerHTML = html;
    }

    function escapeHtml(text: string): string {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Event handlers
    textarea.addEventListener("input", () => {
      applyHighlighting();
      updateGutter(0);
      opts.onChange?.(textarea.value);
    });

    textarea.addEventListener("scroll", () => {
      highlightEl.style.transform = `translateY(-${textarea.scrollTop}px)`;
      syncScroll();
    });

    editorWrapper.addEventListener("scroll", () => {
      textarea.scrollTop = editorWrapper.scrollTop;
      highlightEl.style.transform = `translateY(-${editorWrapper.scrollTop}px)`;
      syncScroll();
    });

    // Tab key handling
    textarea.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const spaces = " ".repeat(opts.tabSize);
        textarea.setRangeText(spaces, start, end, "end");
        textarea.selectionStart = textarea.selectionEnd = start + opts.tabSize;
      } else if (e.key === "s" && e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        opts.onSave?.(textarea.value);
      }
    });

    // Initial render
    applyHighlighting();
    updateGutter(0);
    if (minimap) updateMinimap();

    // Inject styles
    injectEditorStyles(t);

    // Instance
    const instance: CodeEditorInstance = {
      element: root,
      textarea,

      getValue() { return textarea.value; },

      setValue(code: string) {
        textarea.value = code;
        applyHighlighting();
        updateGutter(0);
        if (minimap) updateMinimap();
      },

      insertAtCursor(text: string) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(end);
        this.setValue(before + text + after);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
      },

      getSelection() {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        return { start, end, text: textarea.value.slice(start, end) };
      },

      replaceSelection(text: string) {
        const sel = this.getSelection();
        const before = textarea.value.slice(0, sel.start);
        const after = textarea.value.slice(sel.end);
        this.setValue(before + text + after);
      },

      find(query: string) {
        const code = textarea.value;
        const idx = code.indexOf(query, textarea.selectionEnd);
        if (idx === -1) {
          // Wrap around
          const wrappedIdx = code.indexOf(query);
          if (wrappedIdx === -1) return null;
          textarea.selectionStart = textarea.selectionEnd = wrappedIdx + query.length;
          return { index: wrappedIdx, count: (code.match(new RegExp(escapeRegExp(query), "g"))?.length ?? 0) };
        }
        textarea.selectionStart = textarea.selectionEnd = idx + query.length;
        return { index: idx, count: (code.match(new RegExp(escapeRegExp(query), "g"))?.length ?? 0) };
      },

      replaceAll(query: string, replacement: string): number {
        const regex = new RegExp(escapeRegExp(query), "g");
        const matches = textarea.value.match(regex)?.length ?? 0;
        this.setValue(textarea.value.replace(regex, replacement));
        return matches;
      },

      goToLine(line: number) {
        const lines = textarea.value.split("\n");
        const targetLine = Math.max(1, Math.min(line, lines.length));
        let pos = 0;
        for (let i = 0; i < targetLine - 1; i++) {
          pos += lines[i]!.length + 1;
        }
        textarea.focus();
        textarea.setSelectionRange(pos, pos);
        // Scroll into view
        const lineHeight = opts.fontSize * 1.6;
        editorWrapper.scrollTop = (targetLine - 5) * lineHeight;
      },

      getLineCount() { return textarea.value.split("\n").length; },

      focus() { textarea.focus(); },

      setLanguage(lang: string) {
        opts.language = lang;
        applyHighlighting();
      },

      setReadOnly(ro: boolean) {
        textarea.readOnly = ro;
      },

      destroy() {
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a code editor */
export function createCodeEditor(options: CodeEditorOptions): CodeEditorInstance {
  return new CodeEditorManager().create(options);
}

// --- Helpers ---

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function injectEditorStyles(t: typeof DEFAULT_THEME.dark): void {
  if (document.getElementById("ce-styles")) return;
  const style = document.createElement("style");
  style.id = "ce-styles";
  style.textContent = `
    .code-editor .ce-gutter::-webkit-scrollbar { display: none; }
    .ce-comment { color: ${t.comment}; font-style: italic; }
    .ce-keyword { color: ${t.keyword}; font-weight: 500; }
    .ce-string { color: ${t.string}; }
    .ce-number { color: ${t.number}; }
    .ce-tag { color: ${t.tag}; }
    .ce-attr { color: ${t.attr}; }
    .ce-property { color: ${t.property}; }
    .ce-value { color: ${t.value}; }
    .ce-selector { color: ${t.selector}; }
    .ce-atrule { color: ${t.atrule}; }
    .ce-template { color: ${t.template}; }
    .ce-decorator { color: ${t.decorator}; }
    .ce-punctuation { color: ${t.punctuation}; }
    .ce-textarea::selection { background: ${t.selection} !important; }
  `;
  document.head.appendChild(style);
}
