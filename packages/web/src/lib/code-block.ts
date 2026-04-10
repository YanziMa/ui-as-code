/**
 * Code Block: Syntax-highlighted code display with line numbers, copy button,
 * language label, multiple themes (light/dark), word wrap toggle,
 * line highlighting, and collapsible long blocks.
 */

// --- Types ---

export type CodeTheme = "dark" | "light" | "github-dark" | "monokai" | "solarized";

export interface CodeBlockOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Code content */
  code: string;
  /** Language identifier */
  language?: string;
  /** Theme */
  theme?: CodeTheme;
  /** Show line numbers? */
  showLineNumbers?: boolean;
  /** Show copy button? */
  showCopyButton?: boolean;
  /** Show language label? */
  showLanguageLabel?: boolean;
  /** Enable word wrap toggle? */
  showWrapToggle?: boolean;
  /** Starting line number (default: 1) */
  startLineNumber?: number;
  /** Highlight specific lines (1-based array) */
  highlightLines?: number[];
  /** Max height before collapsing (px, 0 = no collapse) */
  maxHeight?: number;
  /** Font size in px */
  fontSize?: number;
  /** Tab size in spaces */
  tabSize?: number;
  /** Custom CSS class */
  className?: string;
  /** Callback on copy */
  onCopy?: () => void;
}

export interface CodeBlockInstance {
  element: HTMLElement;
  getCode: () => string;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
  setTheme: (theme: CodeTheme) => void;
  highlightLines: (lines: number[]) => void;
  destroy: () => void;
}

// --- Theme Definitions ---

interface ThemeColors {
  bg: string;
  fg: string;
  lineNumberBg: string;
  lineNumberFg: string;
  lineNumberActiveFg: string;
  highlightBg: string;
  highlightBorder: string;
  border: string;
  headerBg: string;
  headerFg: string;
  buttonHover: string;
}

const THEMES: Record<CodeTheme, ThemeColors> = {
  dark: {
    bg: "#1e1e2e", fg: "#cdd6f4",
    lineNumberBg: "#181825", lineNumberFg: "#6c7086", lineNumberActiveFg: "#89b4fa",
    highlightBg: "rgba(137,180,250,0.15)", highlightBorder: "#89b4fa",
    border: "#313244", headerBg: "#181825", headerFg: "#a6adc8",
    buttonHover: "#313244",
  },
  light: {
    bg: "#fafafa", fg: "#24292f",
    lineNumberBg: "#f6f8fa", lineNumberFg: "#959da5", lineNumberActiveFg: "#0969da",
    highlightBg: "rgba(9,105,218,0.1)", highlightBorder: "#0969da",
    border: "#d0d7de", headerBg: "#f6f8fa", headerFg: "#57606a",
    buttonHover: "#eaeef2",
  },
  "github-dark": {
    bg: "#0d1117", fg: "#c9d1d9",
    lineNumberBg: "#161b22", lineNumberFg: "#6e7681", lineNumberActiveFg: "#79c0ff",
    highlightBg: "rgba(121,192,255,0.15)", highlightBorder: "#79c0ff",
    border: "#30363d", headerBg: "#161b22", headerFg: "#8b949e",
    buttonHover: "#21262d",
  },
  monokai: {
    bg: "#272822", fg: "#f8f8f2",
    lineNumberBg: "#1e1f1c", lineNumberFg: "#75715e", lineNumberActiveFg: "#a6e22e",
    highlightBg: "rgba(166,226,46,0.12)", highlightBorder: "#a6e22e",
    border: "#3e3d32", headerBg: "#1e1f1c", headerFg: "#a59f85",
    buttonHover: "#3e3d32",
  },
  solarized: {
    base03: "#002b36", base02: "#073642", base01: "#586e75", base00: "#657b83",
    bg: "#002b36", fg: "#839496",
    lineNumberBg: "#073642", lineNumberFg: "#586e75", lineNumberActiveFg: "#268bd2",
    highlightBg: "rgba(38,139,210,0.12)", highlightBorder: "#268bd2",
    border: "#073642", headerBg: "#073642", headerFg: "#586e75",
    buttonHover: "#073642",
  },
};

// --- Basic Syntax Highlighting ---

const KEYWORDS: Record<string, string[]> = {
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "try", "catch", "throw", "new", "this", "typeof", "instanceof", "in", "of", "switch", "case", "break", "continue", "default", "yield", "finally", "do"],
  typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "try", "catch", "throw", "new", "this", "typeof", "instanceof", "in", "of", "switch", "case", "break", "continue", "default", "yield", "finally", "do", "type", "interface", "enum", "implements", "extends", "abstract", "readonly", "as", "is", "keyof", "never", "unknown", "any", "void", "null", "undefined", "true", "false", "public", "private", "protected", "static", "declare", "namespace", "module"],
  python: ["def", "class", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "import", "from", "yield", "lambda", "pass", "break", "continue", "and", "or", "not", "in", "is", "None", "True", "False", "raise", "del", "global", "nonlocal", "assert", "async", "await"],
  java: ["public", "private", "protected", "class", "interface", "enum", "extends", "implements", "static", "final", "abstract", "void", "int", "long", "double", "float", "boolean", "char", "byte", "short", "String", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "default", "new", "this", "super", "try", "catch", "finally", "throw", "throws", "import", "package", "instanceof", "null", "true", "false", "synchronized", "volatile", "transient", "native", "strictfp", "assert"],
  go: ["func", "return", "if", "else", "for", "range", "switch", "case", "default", "break", "continue", "go", "defer", "select", "chan", "struct", "interface", "map", "type", "package", "import", "var", "const", "make", "len", "cap", "append", "copy", "delete", "new", "nil", "true", "false", "fallthrough", "goto"],
  rust: ["fn", "let", "mut", "const", "static", "struct", "enum", "trait", "impl", "pub", "use", "mod", "crate", "self", "Self", "super", "return", "if", "else", "for", "in", "while", "loop", "match", "break", "continue", "where", "type", "as", "ref", "move", "async", "await", "unsafe", "extern", "true", "false", "Some", "None", "Ok", "Err", "Box", "Vec", "String", "dyn", "impl"],
  html: ["html", "head", "body", "div", "span", "p", "a", "img", "script", "style", "link", "meta", "title", "header", "footer", "nav", "main", "section", "article", "aside", "ul", "ol", "li", "table", "tr", "td", "th", "form", "input", "button", "textarea", "select", "option", "label", "canvas", "svg", "video", "audio", "source", "iframe"],
  css: ["color", "background", "margin", "padding", "border", "display", "position", "width", "height", "font-size", "flex", "grid", "align-items", "justify-content", "transition", "transform", "opacity", "z-index", "overflow", "@media", "@keyframes", "!important", "inherit", "initial", "unset", "auto", "none", "block", "inline", "relative", "absolute", "fixed", "sticky"],
  json: [], // no keywords for JSON
  sql: ["SELECT", "FROM", "WHERE", "INSERT", "INTO", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP", "TABLE", "INDEX", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "AND", "OR", "NOT", "NULL", "AS", "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "UNION", "ALL", "DISTINCT", "SET", "VALUES", "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "CONSTRAINT", "DEFAULT", "CASCADE", "IF", "EXISTS", "BETWEEN", "IN", "LIKE", "IS", "CASE", "WHEN", "THEN", "ELSE", "END"],
  bash: ["if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case", "esac", "function", "return", "exit", "echo", "export", "source", "read", "local", "set", "unset", "shift", "true", "false", "in", "cd", "pwd", "ls", "cat", "grep", "sed", "awk", "find", "mkdir", "rm", "cp", "mv", "chmod", "chown", "tar", "git", "npm", "yarn", "pip", "docker", "kubectl"],
};

function getKeywords(lang: string): string[] {
  const normalized = lang.toLowerCase();
  if (KEYWORDS[normalized]) return KEYWORDS[normalized]!;
  // Fallback to JS-like for unknown languages
  return KEYWORDS.javascript!;
}

// --- Main Class ---

export class CodeBlockManager {
  create(options: CodeBlockOptions): CodeBlockInstance {
    const opts = {
      code: options.code ?? "",
      language: options.language ?? "text",
      theme: options.theme ?? "dark",
      showLineNumbers: options.showLineNumbers ?? true,
      showCopyButton: options.showCopyButton ?? true,
      showLanguageLabel: options.showLanguageLabel ?? true,
      showWrapToggle: options.showWrapToggle ?? true,
      startLineNumber: options.startLineNumber ?? 1,
      highlightLines: options.highlightLines ?? [],
      maxHeight: options.maxHeight ?? 400,
      fontSize: options.fontSize ?? 13,
      tabSize: options.tabSize ?? 2,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("CodeBlock: container not found");

    const theme = THEMES[opts.theme]!;
    let isWrapped = false;
    let isCollapsed = false;

    container.className = `code-block code-block-${opts.theme} ${opts.className ?? ""}`;
    container.style.cssText = `
      font-family:'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
      border-radius:10px;overflow:hidden;border:1px solid ${theme.border};
      background:${theme.bg};
    `;

    function render(): void {
      container.innerHTML = "";

      // Header bar
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        padding:8px 14px;background:${theme.headerBg};
        border-bottom:1px solid ${theme.border};user-select:none;
      `;

      // Left: language label
      const leftSide = document.createElement("div");
      leftSide.style.cssText = "display:flex;align-items:center;gap:8px;";

      if (opts.showLanguageLabel) {
        const langBadge = document.createElement("span");
        langBadge.style.cssText = `
          font-size:11px;font-weight:500;color:${theme.headerFg};
          text-transform:lowercase;padding:2px 8px;border-radius:4px;
          background:${theme.buttonHover};
        `;
        langBadge.textContent = opts.language;
        leftSide.appendChild(langBadge);
      }

      header.appendChild(leftSide);

      // Right: actions
      const rightSide = document.createElement("div");
      rightSide.style.cssText = "display:flex;align-items:center;gap:6px;";

      // Word wrap toggle
      if (opts.showWrapToggle) {
        const wrapBtn = document.createElement("button");
        wrapBtn.type = "button";
        wrapBtn.title = isWrapped ? "Disable wrap" : "Enable wrap";
        wrapBtn.innerHTML = isWrapped ? "&#8634;" : "&#8635;";
        wrapBtn.style.cssText = `
          background:none;border:none;color:${theme.headerFg};cursor:pointer;
          padding:3px 6px;border-radius:4px;font-size:13px;display:flex;align-items:center;
          transition:background 0.15s;
        `;
        wrapBtn.addEventListener("click", () => {
          isWrapped = !isWrapped;
          render();
        });
        wrapBtn.addEventListener("mouseenter", () => { wrapBtn.style.background = theme.buttonHover; });
        wrapBtn.addEventListener("mouseleave", () => { wrapBtn.style.background = ""; });
        rightSide.appendChild(wrapBtn);
      }

      // Copy button
      if (opts.showCopyButton) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.innerHTML = "&#128203;";
        copyBtn.title = "Copy code";
        copyBtn.style.cssText = `
          background:none;border:none;color:${theme.headerFg};cursor:pointer;
          padding:3px 6px;border-radius:4px;font-size:14px;display:flex;align-items:center;
          transition:background 0.15s;
        `;
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(opts.code);
            copyBtn.innerHTML = "&#10003;";
            copyBtn.title = "Copied!";
            setTimeout(() => { copyBtn.innerHTML = "&#128203;"; copyBtn.title = "Copy code"; }, 2000);
            opts.onCopy?.();
          } catch {
            // Fallback
            const ta = document.createElement("textarea");
            ta.value = opts.code;
            ta.style.position = "fixed"; ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
            copyBtn.innerHTML = "&#10003;";
            setTimeout(() => { copyBtn.innerHTML = "&#128203;"; }, 2000);
          }
        });
        copyBtn.addEventListener("mouseenter", () => { copyBtn.style.background = theme.buttonHover; });
        copyBtn.addEventListener("mouseleave", () => { copyBtn.style.background = ""; });
        rightSide.appendChild(copyBtn);
      }

      header.appendChild(rightSide);
      container.appendChild(header);

      // Code area
      const codeArea = document.createElement("div");
      codeArea.className = "code-block-body";
      codeArea.style.cssText = `
        overflow:auto;${opts.maxHeight > 0 ? `max-height:${isCollapsed ? `${opts.maxHeight}px` : "none"};` : ""}
        position:relative;
      `;

      // Lines container
      const linesContainer = document.createElement("pre");
      linesContainer.style.cssText = `
        margin:0;padding:${opts.showLineNumbers ? "0" : "12px 16px"};
        display:flex;font-size:${opts.fontSize}px;line-height:1.6;
        color:${theme.fg};tab-size:${opts.tabSize};white-space:${isWrapped ? "pre-wrap" : "pre"};
        overflow-x:${isWrapped ? "" : "auto"};min-width:0;
      `;

      // Line numbers column
      if (opts.showLineNumbers) {
        const gutter = document.createElement("div");
        gutter.className = "code-gutter";
        gutter.style.cssText = `
          padding:12px 8px;text-align:right;user-select:none;
          background:${theme.lineNumberBg};color:${theme.lineNumberFg};
          border-right:1px solid ${theme.border};min-width:44px;
          flex-shrink:0;font-variant-numeric:tabular-nums;
          position:sticky;left:0;
        `;

        const codeLines = opts.code.split("\n");
        for (let i = 0; i < codeLines.length; i++) {
          const lineNum = i + opts.startLineNumber;
          const numEl = document.createElement("div");
          numEl.style.cssText = `padding-right:8px;height:${(opts.fontSize * 1.6)}px;`;
          const isHighlighted = opts.highlightLines.includes(lineNum);
          numEl.style.color = isHighlighted ? theme.lineNumberActiveFg : theme.lineNumberFg;
          numEl.textContent = String(lineNum);
          gutter.appendChild(numEl);
        }

        linesContainer.appendChild(gutter);
      }

      // Code content
      const codeContent = document.createElement("code");
      codeContent.className = "code-content";
      codeContent.style.cssText = `padding:12px 14px;flex:1;min-width:0;overflow-x:${isWrapped ? "" : "auto"};`;
      codeContent.innerHTML = highlightCode(opts.code, opts.language, theme);

      linesContainer.appendChild(codeContent);
      codeArea.appendChild(linesContainer);
      container.appendChild(codeArea);

      // Collapse toggle
      if (opts.maxHeight > 0 && countLines(opts.code) > Math.floor(opts.maxHeight / (opts.fontSize * 1.6))) {
        const expandBar = document.createElement("button");
        expandBar.type = "button";
        expandBar.style.cssText = `
          width:100%;padding:8px;border:none;background:${theme.headerBg};
          color:${theme.headerFg};cursor:pointer;font-size:12px;
          transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:4px;
        `;
        expandBar.textContent = isCollapsed ? `Show more (${countLines(opts.code)} lines)` : "Show less";
        expandBar.addEventListener("click", () => {
          isCollapsed = !isCollapsed;
          render();
        });
        expandBar.addEventListener("mouseenter", () => { expandBar.style.background = theme.buttonHover; });
        expandBar.addEventListener("mouseleave", () => { expandBar.style.background = ""; });
        container.appendChild(expandBar);
      } else {
        isCollapsed = false;
      }
    }

    function highlightCode(code: string, lang: string, _theme: ThemeColors): string {
      const keywords = getKeywords(lang);
      let result = escapeHtml(code);

      // Comments
      result = result.replace(/(\/\/.*$)/gm, '<span style="color:#6a9955;">$1</span>');
      result = result.replace(/(#.*$)/gm, '<span style="color:#6a9955;">$1</span>');
      result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a9955;">$1</span>');
      result = result.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#6a9955;">$1</span>');

      // Strings
      result = result.replace(/(&quot;[^&]*?&quot;|&#39;[^&#]*?&#39;|`[^`]*?`)/g, '<span style="color:#ce9178;">$1</span>');

      // Numbers
      result = result.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8;">$1</span>');

      // Keywords
      for (const kw of keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        result = result.replace(new RegExp(`\\b(${escaped})\\b`, "g"), '<span style="color:#569cd6;">$1</span>');
      }

      // Functions
      result = result.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span style="color:#dcdcaa;">$1</span>(');

      // HTML tags
      if (["html", "xml", "svg"].includes(lang.toLowerCase())) {
        result = result.replace(/(&lt;\/?)([\w-]+)/g, '$1<span style="color:#4ec9b0;">$2</span>');
        result = result.replace(/([\w-]+)(=)/g, '<span style="color:#9cdcfe;">$1</span>$2');
      }

      return result;
    }

    function escapeHtml(text: string): string {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function countLines(code: string): number {
      return code.split("\n").length;
    }

    // Initial render
    render();

    const instance: CodeBlockInstance = {
      element: container,

      getCode() { return opts.code; },

      setCode(newCode: string) {
        opts.code = newCode;
        render();
      },

      setLanguage(lang: string) {
        opts.language = lang;
        render();
      },

      setTheme(newTheme: CodeTheme) {
        opts.theme = newTheme;
        render();
      },

      highlightLines(lines: number[]) {
        opts.highlightLines = lines;
        render();
      },

      destroy() {
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a code block */
export function createCodeBlock(options: CodeBlockOptions): CodeBlockInstance {
  return new CodeBlockManager().create(options);
}
