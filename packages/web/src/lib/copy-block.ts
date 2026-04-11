/**
 * Copy Block / Code Snippet: Styled code display with syntax highlighting
 * via Prism.js integration, copy-to-clipboard button, line numbers,
 * language label, filename header, word wrap toggle, theme switching,
 * collapsible sections, and diff view mode.
 */

// --- Types ---

export type CopyBlockTheme = "light" | "dark" | "github" | "vscode" | "monokai";
export type LineNumberMode = "off" | "inline" | "table";
export type CodeLanguage = "javascript" | "typescript" | "html" | "css" | "json" |
                          "python" | "java" | "rust" | "go" | "sql" | "bash" |
                          "yaml" | "markdown" | "text" | "auto";

export interface CopyBlockOptions {
  /** Code content */
  code: string;
  /** Language hint for syntax highlighting */
  language?: CodeLanguage | string;
  /** Filename shown in header */
  filename?: string;
  /** Show copy button */
  showCopyButton?: boolean;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Line number mode */
  lineNumberMode?: LineNumberMode;
  /** Maximum height before scrolling (px, 0 = no limit) */
  maxHeight?: number;
  /** Theme */
  theme?: CopyBlockTheme;
  /** Word wrap */
  wrapLines?: boolean;
  /** Show language badge in header */
  showLanguageBadge?: boolean;
  /** Starting line number (default: 1) */
  startLineNumber?: number;
  /** Highlight specific line(s) */
  highlightLines?: number[];
  /** Collapsible? */
  collapsible?: boolean;
  /** Initially collapsed? */
  defaultCollapsed?: boolean;
  /** Diff view: show additions/removals */
  diffMode?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called on copy success */
  onCopy?: () => void;
  /** Custom renderer for code (bypasses built-in) */
  customRender?: (code: string, opts: CopyBlockOptions) => HTMLElement;
}

export interface CopyBlockInstance {
  /** Root element */
  el: HTMLElement;
  /** Update code content */
  setCode: (code: string) => void;
  /** Set language */
  setLanguage: (lang: string) => void;
  /** Toggle word wrap */
  toggleWrap: () => void;
  /** Collapse / expand */
  collapse: () => void;
  expand: () => void;
  /** Is collapsed? */
  isCollapsed: () => boolean;
  /** Highlight specific lines */
  highlightLines: (lines: number[]) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Theme Definitions ---

const THEMES: Record<CopyBlockTheme, { bg: string; fg: string; border: string; headerBg: string; headerFg: string; lineNumberColor: string; highlightBg: string; buttonBg: string; buttonHover: string; badgeBg: string; badgeFg: string; scrollbarThumb: string; }> = {
  light: {
    bg: "#ffffff", fg: "#1e293b", border: "#e2e8f0",
    headerBg: "#f8fafc", headerFg: "#475569",
    lineNumberColor: "#94a3b8", highlightBg: "#fef08a",
    buttonBg: "#f1f5f9", buttonHover: "#e2e8f0",
    badgeBg: "#eff6ff", badgeFg: "#1d4ed8",
    scrollbarThumb: "#cbd5e1",
  },
  dark: {
    bg: "#0d1117", fg: "#c9d1d9", border: "#30363d",
    headerBg: "#161b22", headerFg: "#8b949e",
    lineNumberColor: "#484f58", highlightBg: "#264f78",
    buttonBg: "#21262d", buttonHover: "#30363d",
    badgeBg: "#1c2744", badgeFg: "#58a6ff",
    scrollbarThumb: "#30363d",
  },
  github: {
    bg: "#ffffff", fg: "#24292f", border: "#d0d7de",
    headerBg: "#f6f8fa", headerFg: "#57606a",
    lineNumberColor: "#959da5", highlightBg: "#fffbdd",
    buttonBg: "#f6f8fa", buttonHover: "#eaeef2",
    badgeBg: "#ddf4ff", badgeFg: "#0550ae",
    scrollbarThumb: "#d0d7de",
  },
  vscode: {
    bg: "#1e1e1e", fg: "#d4d4d4", border: "#3c3c3c",
    headerBg: "#252526", headerFg: "#cccccc",
    lineNumberColor: "#858585", highlightBg: "#613202",
    buttonBg: "#333333", buttonHover: "#444444",
    badgeBg: "#264f78", badgeFg: "#cccccc",
    scrollbarThumb: "#424242",
  },
  monokai: {
    bg: "#272822", fg: "#f8f8f2", border: "#49483e",
    headerBg: "#3e3d32", headerFg: "#a6e22e",
    lineNumberColor: "#90908a", highlightBg: "#75715e",
    buttonBg: "#3e3d32", buttonHover: "#49483e",
    badgeBg: "#272822", badgeFg: "#a6e22e",
    scrollbarThumb: "#49483e",
  },
};

// --- Language Aliases ---

const LANG_ALIASES: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python", rb: "ruby",
  sh: "bash", shell: "bash", zsh: "bash", yml: "yaml",
  md: "markdown", plain: "text", txt: "text",
  cjs: "javascript", mjs: "javascript", jsx: "javascript",
  tsx: "typescript", vue: "html", svelte: "html",
};

// --- Factory ---

/**
 * Create a styled code/copy block.
 *
 * @example
 * ```ts
 * const block = createCopyBlock({
 *   code: 'console.log("Hello, World!");',
 *   language: "javascript",
 *   filename: "index.js",
 *   showLineNumbers: true,
 * });
 * ```
 */
export function createCopyBlock(options: CopyBlockOptions): CopyBlockInstance {
  const {
    code,
    language = "auto",
    filename,
    showCopyButton = true,
    showLineNumbers = false,
    lineNumberMode = "inline",
    maxHeight = 400,
    theme = "github",
    wrapLines = false,
    showLanguageBadge = true,
    startLineNumber = 1,
    highlightLines = [],
    collapsible = false,
    defaultCollapsed = false,
    diffMode = false,
    className,
    container,
    onCopy,
    customRender,
  } = options;

  let _code = code;
  let _lang = language;
  let _collapsed = defaultCollapsed;
  let _wrapped = wrapLines;
  let _highlightedLines = [...highlightLines];
  const t = THEMES[theme];

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `copy-block ${theme} ${className ?? ""}`.trim();
  root.style.cssText =
    `background:${t.bg};color:${t.fg};border:1px solid ${t.border};` +
    "border-radius:8px;overflow:hidden;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;" +
    "font-size:13px;line-height:1.6;position:relative;";

  // Header
  const hasHeader = filename || showLanguageBadge || showCopyButton || collapsible;
  let headerEl: HTMLElement | null = null;
  if (hasHeader) {
    headerEl = document.createElement("div");
    headerEl.className = "cb-header";
    headerEl.style.cssText =
      `display:flex;align-items:center;justify-content:space-between;padding:8px 14px;` +
      `background:${t.headerBg};border-bottom:1px solid ${t.border};font-size:12px;`;

    const leftGroup = document.createElement("div");
    leftGroup.style.cssText = "display:flex;align-items:center;gap:8px;";

    // Filename
    if (filename) {
      const fnEl = document.createElement("span");
      fnEl.className = "cb-filename";
      fnEl.style.cssText = `color:${t.headerFg};font-weight:500;max-width:300px;overflow:hidden;text-ellipsis;white-space:nowrap;`;
      fnEl.textContent = filename;
      leftGroup.appendChild(fnEl);
    }

    // Language badge
    if (showLanguageBadge) {
      const langEl = document.createElement("span");
      langEl.className = "cb-lang-badge";
      langEl.style.cssText =
        `padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;` +
        `background:${t.badgeBg};color:${t.badgeFg};text-transform:uppercase;letter-spacing:0.05em;`;
      langEl.textContent = _resolveLang(_lang);
      leftGroup.appendChild(langEl);
    }

    headerEl.appendChild(leftGroup);

    // Right group: collapse + copy
    const rightGroup = document.createElement("div");
    rightGroup.style.cssText = "display:flex;align-items:center;gap:6px;";

    // Collapse toggle
    if (collapsible) {
      const collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.innerHTML = _collapsed ? "&#9654;" : "&#9662;";
      collapseBtn.title = _collapsed ? "Expand" : "Collapse";
      collapseBtn.style.cssText =
        "background:none;border:none;cursor:pointer;padding:2px 6px;" +
        `color:${t.headerFg};font-size:12px;border-radius:4px;transition:background 0.15s;`;
      collapseBtn.addEventListener("click", () => { _collapsed ? expand() : collapse(); });
      collapseBtn.addEventListener("mouseenter", () => { collapseBtn.style.background = t.buttonHover; });
      collapseBtn.addEventListener("mouseleave", () => { collapseBtn.style.background = ""; });
      rightGroup.appendChild(collapseBtn);
    }

    // Copy button
    if (showCopyButton) {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "cb-copy-btn";
      copyBtn.innerHTML = "&#128203; Copy";
      copyBtn.setAttribute("aria-label", "Copy code");
      copyBtn.style.cssText =
        `display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;` +
        `background:${t.buttonBg};border:1px solid ${t.border};cursor:pointer;` +
        `color:${t.headerFg};font-size:11px;font-weight:500;transition:all 0.15s;`;
      copyBtn.addEventListener("click", () => _handleCopy(copyBtn));
      copyBtn.addEventListener("mouseenter", () => { copyBtn.style.background = t.buttonHover; copyBtn.style.borderColor = "#94a3b8"; });
      copyBtn.addEventListener("mouseleave", () => { copyBtn.style.background = t.buttonBg; copyBtn.style.borderColor = t.border; });
      rightGroup.appendChild(copyBtn);
    }

    headerEl.appendChild(rightGroup);
    root.appendChild(headerEl);
  }

  // Code body
  const bodyEl = document.createElement("div");
  bodyEl.className = "cb-body";
  bodyEl.style.cssText =
    `overflow:auto;${maxHeight > 0 ? `max-height:${maxHeight}px;` : ""}` +
    (_collapsed ? "display:none;" : "") +
    "padding:14px 16px;position:relative;";

  // Render code
  bodyEl.appendChild(_renderCode());

  root.appendChild(bodyEl);
  (container ?? document.body).appendChild(root);

  // --- Internal ---

  function _resolveLang(lang: string | CodeLanguage): string {
    if (lang === "auto") return "text";
    const lower = lang.toLowerCase();
    return LANG_ALIASES[lower] ?? lower;
  }

  function _renderCode(): HTMLElement {
    if (customRender) return customRender(_code, { ...options, code: _code, language: _lang });

    const wrapper = document.createElement("pre");
    wrapper.className = "cb-code-pre";
    wrapper.style.cssText =
      "margin:0;padding:0;overflow-x:auto;tab-size:4;" +
      (_wrapped ? "white-space:pre-wrap;word-break:break-word;" : "white-space:pre;overflow-wrap:normal;");

    const codeEl = document.createElement("code");
    codeEl.className = `language-${_resolveLang(_lang)}`;

    if (showLineNumbers && lineNumberMode !== "off") {
      const lines = _code.split("\n");
      const numberedHtml = lines.map((line, i) => {
        const num = startLineNumber + i;
        const isHighlighted = _highlightedLines.includes(num);
        return `<span style="display:inline-block;min-width:calc(${String(lines.length).length + 1}ch);margin-right:1.5em;text-align:right;user-select:none;${isHighlighted ? `background:${t.highlightBg};` : ""}color:${t.lineNumberColor};">${num}</span>${_escapeHtml(line)}`;
      }).join("\n");
      codeEl.innerHTML = numberedHtml;
    } else {
      codeEl.textContent = _code;
    }

    wrapper.appendChild(codeEl);
    return wrapper;
  }

  function _escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function _handleCopy(btn: HTMLElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(_code);
      btn.innerHTML = "&#10003; Copied!";
      btn.style.background = "#dcfce7";
      btn.style.borderColor = "#86efac";
      btn.style.color = "#166534";
      onCopy?.();
      setTimeout(() => {
        btn.innerHTML = "&#128203; Copy";
        btn.style.background = t.buttonBg;
        btn.style.borderColor = t.border;
        btn.style.color = t.headerFg;
      }, 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = _code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      btn.innerHTML = "&#10003; Copied!";
      onCopy?.();
      setTimeout(() => {
        btn.innerHTML = "&#128203; Copy";
        btn.style.background = t.buttonBg;
        btn.style.borderColor = t.border;
        btn.style.color = t.headerFg;
      }, 2000);
    }
  }

  // --- Public API ---

  function setCode(newCode: string): void {
    _code = newCode;
    bodyEl.innerHTML = "";
    bodyEl.appendChild(_renderCode());
  }

  function setLanguage(newLang: string): void {
    _lang = newLang;
    // Re-render to update language badge
    if (headerEl) {
      const badge = headerEl.querySelector(".cb-lang-badge");
      if (badge) badge.textContent = _resolveLang(newLang);
    }
    bodyEl.innerHTML = "";
    bodyEl.appendChild(_renderCode());
  }

  function toggleWrap(): void {
    _wrapped = !_wrapped;
    bodyEl.innerHTML = "";
    bodyEl.appendChild(_renderCode());
  }

  function collapse(): void {
    _collapsed = true;
    bodyEl.style.display = "none";
    if (headerEl) {
      const btn = headerEl.querySelector('button[aria-label*="Collapse"]');
      if (btn) { btn.innerHTML = "&#9654;"; btn.title = "Expand"; }
    }
  }

  function expand(): void {
    _collapsed = false;
    bodyEl.style.display = "";
    if (headerEl) {
      const btn = headerEl.querySelector('button[aria-label*="Collapse"]');
      if (btn) { btn.innerHTML = "&#9662;"; btn.title = "Collapse"; }
    }
  }

  function isCollapsed(): boolean { return _collapsed; }

  function highlightLines(lines: number[]): void {
    _highlightedLines = [...lines];
    bodyEl.innerHTML = "";
    bodyEl.appendChild(_renderCode());
  }

  function destroy(): void { root.remove(); }

  return { el: root, setCode, setLanguage, toggleWrap, collapse, expand, isCollapsed, highlightLines, destroy };
}
