/**
 * Code Utilities: Syntax highlighting, code block rendering, line numbering,
 * copy-to-clipboard, language detection, diff view, and code formatting helpers.
 */

// --- Types ---

export type Language =
  | "javascript" | "typescript" | "jsx" | "tsx" | "python"
  | "java" | "c" | "cpp" | "csharp" | "go" | "rust"
  | "html" | "css" | "scss" | "json" | "yaml" | "xml"
  | "sql" | "bash" | "shell" | "markdown" | "plaintext" | "text";

export interface CodeBlockOptions {
  /** Source code */
  code: string;
  /** Language for syntax highlighting */
  language?: Language | string;
  /** Show line numbers */
  lineNumbers?: boolean;
  /** Starting line number (default 1) */
  startLine?: number;
  /** Highlight specific lines */
  highlightLines?: number[];
  /** Show a header bar with language name and copy button */
  showHeader?: boolean;
  /** Maximum height with scroll (px) */
  maxHeight?: number;
  /** Theme: "light" or "dark" */
  theme?: "light" | "dark";
  /** Custom class name */
  className?: string;
  /** Tab size for display */
  tabSize?: number;
  /** Wrap long lines */
  wrapLines?: boolean;
  /** Called when copy is clicked */
  onCopy?: () => void;
}

// --- Language Detection ---

/** Simple language detection from common patterns */
export function detectLanguage(code: string): Language {
  const trimmed = code.trim();

  // HTML
  if (/^<!DOCTYPE|<html|<body|<div|<span|<p[>\s]/i.test(trimmed)) return "html";
  // JSX/TSX
  if (/(import\s+.*from\s+['"]|export\s+(default\s+)?|(const|let|var)\s+\w+\s*=\s*(<|\(|\()/m.test(code) && /<[A-Z]\w/.test(code)) return /\binterface\b|\btype\b/.test(code) ? "tsx" : "jsx";
  // TypeScript
  if (/\b(interface|type\s+\w+|enum|as\s+\w+|:\s*(string|number|boolean)\b)/.test(code)) return "typescript";
  // CSS/SCSS
  if (/\{[\s\S]*?[\w-]+\s*:[\s\S]*?\}/.test(trimmed) && /[.#][\w-]+\s*\{/.test(trimmed)) return /@mixin|@include|\$[\w-]+:/.test(code) ? "scss" : "css";
  // JSON
  try { JSON.parse(trimmed); return "json"; } catch {}
  // XML
  if (/^<\?xml|<[\w-]+[^>]*>/.test(trimmed) && /<\/[\w-]+>/.test(trimmed)) return "xml";
  // Python
  if (/^(def |class |import |from \w+ import |if __name__|#\!\/usr\/bin\/env python)/m.test(trimmed)) return "python";
  // Rust
  if (/\b(fn |let mut |impl |use |mod |pub |struct |enum |match )/.test(code)) return "rust";
  // Go
  if (/\b(func |package |import |fmt\.|:=|go\s)/.test(code)) return "go";
  // Java
  if (/\b(public|private|protected)\s+(class|interface|void|static|int|String)\b/.test(code)) return "java";
  // C#
  if (/\b(namespace|using\s+System|Console\.|var\s+\w+\s*=|=>\s*\{)/.test(code)) return "csharp";
  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|FROM|WHERE)\b/mi.test(trimmed)) return "sql";
  // Bash/Shell
  if (/^#!\/(bin\/bash|bin\/sh)|^\s*(echo|export|cd |ls |mkdir|rm |sudo|apt|npm|yarn|pip|git )(?!.*\()/.test(trimmed)) return "bash";
  // YAML
  if (/^[\w-]+:\s/.test(trimmed) && !/{/.test(trimmed.substring(0, 100))) return "yaml";
  // JavaScript (default)
  return "javascript";
}

// --- Tokenizer (Simple regex-based highlighting) ---

interface Token {
  type: string;
  value: string;
}

const PATTERNS: Array<{ pattern: RegExp; type: string; lang?: Language[] }> = [
  // Comments
  { pattern: /(\/\/.*$)/gm, type: "comment", lang: ["javascript", "typescript", "jsx", "tsx", "java", "c", "cpp", "csharp", "go", "rust"] },
  { pattern: /(#[^\n]*$)/gm, type: "comment", lang: ["python", "bash", "shell", "yaml"] },
  { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment", lang: ["javascript", "typescript", "jsx", "tsx", "java", "c", "cpp", "csharp", "css", "scss"] },
  { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, type: "comment", lang: ["html", "xml"] },

  // Strings
  { pattern: /("(?:[^"\\]|\\.)*")/g, type: "string" },
  { pattern: /('(?:[^'\\]|\\.)*')/g, type: "string" },
  { pattern: /(`(?:[^`\\]|\\.)*`)/g, type: "template", lang: ["javascript", "typescript", "jsx", "tsx"] },

  // Keywords
  { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|new|this|class|extends|import|export|from|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|null|undefined|true|false)\b/g, type: "keyword", lang: ["javascript", "typescript", "jsx", "tsx"] },
  { pattern: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|yield|lambda|and|or|not|in|is|None|True|False|async|await)\b/g, type: "keyword", lang: ["python"] },
  { pattern: /\b(fn|let|mut|pub|struct|enum|impl|trait|use|mod|self|Self|where|match|loop|if|else|return|as|ref|move|unsafe|async|await)\b/g, type: "keyword", lang: ["rust"] },
  { pattern: /\b(func|package|import|type|struct|interface|map|chan|go|defer|range|select|case|fallthrough|if|else|for|range|return|var|const)\b/g, type: "keyword", lang: ["go"] },

  // Types
  { pattern: /\b(string|number|boolean|void|any|never|object|unknown|bigint|symbol)\b/g, type: "type", lang: ["typescript", "tsx"] },
  { pattern: /\b(int|long|short|byte|char|float|double|bool|void|String|Object|List|Map|Set|Array)\b/g, type: "type", lang: ["java", "csharp"] },

  // Numbers
  { pattern: /\b(\d+\.?\d*)\b/g, type: "number" },

  // Functions/built-ins
  { pattern: /\b(console\.\w+|require|setTimeout|setInterval|parseInt|parseFloat|JSON\.\w+)\b/g, type: "builtin", lang: ["javascript", "typescript", "jsx", "tsx"] },
  { pattern: /\b(print|len|range|str|int|float|list|dict|set|open|input|super|__init__)\b/g, type: "builtin", lang: ["python"] },

  // Operators
  { pattern: /([=+\-*/%&|^!~<>?:]+)/g, type: "operator" },

  // Punctuation
  { pattern: /([{}()\[\];,.])/g, type: "punctuation" },
];

// --- Theme Colors ---

const THEMES = {
  light: {
    background: "#fafafa",
    foreground: "#24292e",
    comment: "#6a737d",
    keyword: "#d73a49",
    string: "#032f62",
    template: "#032f62",
    number: "#005cc5",
    builtin: "#6f42c1",
    type: "#d73a49",
    operator: "#d73a49",
    punctuation: "#24292e",
    lineHighlight: "#fff8c5",
    lineNumber: "#999",
    gutterBg: "#f6f8fa",
    headerBg: "#f1f3f5",
  },
  dark: {
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    comment: "#6a9955",
    keyword: "#569cd6",
    string: "#ce9178",
    template: "#ce9178",
    number: "#b5cea8",
    builtin: "#dcdcaa",
    type: "#4ec9b0",
    operator: "#d4d4d4",
    punctuation: "#d4d4d4",
    lineHighlight: "#264f78",
    lineNumber: "#858585",
    gutterBg: "#252526",
    headerBg: "#2d2d30",
  },
};

// --- Core Factory ---

/**
 * Create a syntax-highlighted code block element.
 *
 * @example
 * ```ts
 * const codeEl = createCodeBlock({
 *   code: 'const x = "hello";',
 *   language: "javascript",
 *   lineNumbers: true,
 *   showHeader: true,
 * });
 * container.appendChild(codeEl);
 * ```
 */
export function createCodeBlock(options: CodeBlockOptions): HTMLElement {
  const {
    code,
    language: langOption,
    lineNumbers = true,
    startLine = 1,
    highlightLines = [],
    showHeader = true,
    maxHeight = 500,
    theme = "dark",
    tabSize = 2,
    wrapLines = false,
    onCopy,
    className,
  } = options;

  const t = THEMES[theme];
  const detectedLang = langOption ?? detectLanguage(code);

  // Root wrapper
  const root = document.createElement("div");
  root.className = `code-block ${theme} ${className ?? ""}`.trim();
  root.style.cssText =
    `background:${t.background};color:${t.foreground};border-radius:8px;overflow:hidden;` +
    `font-family:'Menlo','Monaco','Consolas','Liberation Mono',monospace;font-size:13px;line-height:1.5;`;

  // Header
  if (showHeader) {
    const header = document.createElement("div");
    header.className = "code-header";
    header.style.cssText =
      `display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:${t.headerBg};` +
      "font-size:12px;border-bottom:1px solid rgba(128,128,128,0.2);";

    const langLabel = document.createElement("span");
    langLabel.textContent = detectedLang.toUpperCase();
    langLabel.style.cssText = "color:#888;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;";
    header.appendChild(langLabel);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";
    copyBtn.style.cssText =
      "padding:2px 10px;border:1px solid #555;border-radius:4px;" +
      "background:#333;color:#aaa;cursor:pointer;font-size:11px;font-family:inherit;";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      }).catch(() => {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      });
      onCopy?.();
    });
    header.appendChild(copyBtn);
    root.appendChild(header);
  }

  // Code area
  const codeArea = document.createElement("div");
  codeArea.className = "code-area";
  codeArea.style.cssText =
    `display:flex;overflow:auto;max-height:${maxHeight}px;position:relative;`;

  // Line numbers
  if (lineNumbers) {
    const linesGutter = document.createElement("div");
    linesGutter.className = "line-numbers";
    linesGutter.style.cssText =
      `background:${t.gutterBg};padding:12px 8px 12px 12px;text-align:right;user-select:none;` +
      `color:${t.lineNumber};font-size:12px;min-width:40px;border-right:1px solid rgba(128,128,128,0.15);flex-shrink:0;`;

    const codeLines = code.split("\n");
    for (let i = 0; i < codeLines.length; i++) {
      const num = document.createElement("div");
      num.textContent = String(startLine + i);
      num.style.paddingRight = "8px";
      num.style.lineHeight = "1.5";
      linesGutter.appendChild(num);
    }

    codeArea.appendChild(linesGutter);
  }

  // Highlighted code content
  const pre = document.createElement("pre");
  pre.className = "code-content";
  pre.style.cssText =
    "margin:0;padding:12px;overflow-x:auto;" + (wrapLines ? "white-space:pre-wrap;" : "") +
    "tab-size:" + String(tabSize) + ";";
  pre.innerHTML = _highlightCode(code, detectedLang, t, highlightLines, startLine);
  codeArea.appendChild(pre);

  root.appendChild(codeArea);
  return root;
}

// --- Diff View ---

export interface DiffOptions {
  /** Original code (left side) */
  oldCode: string;
  /** New code (right side) */
  newCode: string;
  /** Old file label */
  oldLabel?: string;
  /** New file label */
  newLabel?: string;
  /** Unified vs split view */
  unified?: boolean;
  /** Max height */
  maxHeight?: number;
}

/** Create a side-by-side or unified diff view */
export function createDiffView(options: DiffOptions): HTMLElement {
  const { oldCode, newCode, oldLabel = "Original", newLabel = "Modified", unified = true, maxHeight = 400 } = options;

  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  const root = document.createElement("div");
  root.className = "diff-view";
  root.style.cssText =
    "font-family:'Menlo','Monaco','Consolas',monospace;font-size:12px;line-height:1.5;" +
    `max-height:${maxHeight}px;overflow:auto;border:1px solid #30363d;border-radius:6px;background:#0d1117;`;

  if (!unified) {
    // Side-by-side
    const container = document.createElement("div");
    container.style.display = "grid";
    container.style.gridTemplateColumns = "1fr 1fr";

    [oldCode, newCode].forEach((code, idx) => {
      const panel = document.createElement("div");
      panel.style.borderRight = idx === 0 ? "1px solid #30363d" : "none";
      panel.style.overflow = "auto";

      const label = document.createElement("div");
      label.textContent = idx === 0 ? oldLabel : newLabel;
      label.style.cssText = "padding:6px 12px;background:#161b22;color:#8b949e;font-weight:600;position:sticky;top:0;z-index:1;";
      panel.appendChild(label);

      const pre = document.createElement("pre");
      pre.style.margin = "0;padding:12px;color:#c9d1d9;white-space:pre;overflow-x:auto;";
      pre.textContent = code;
      panel.appendChild(pre);
      container.appendChild(panel);
    });

    root.appendChild(container);
  } else {
    // Unified diff using simple diff algorithm
    const diffResult = _simpleDiff(oldLines, newLines);

    let html = '<table style="width:100%;border-collapse:collapse;">';
    for (const line of diffResult) {
      let bg = "";
      let prefix = " ";
      let color = "#c9d1d9";

      switch (line.type) {
        case "+": bg = "#0a322a"; prefix = "+"; color = "#3fb950"; break;
        case "-": bg = "#3d1619"; prefix = "-"; color = "#f85149"; break;
        default: break;
      }

      html += `<tr style="background:${bg}">`;
      html += `<td style="color:#484f58;width:1px;padding:0 8px;user-select:none;text-align:right;">${prefix}</td>`;
      html += `<td style="color:${color};padding:0 12px;white-space:pre;">${_escHtml(line.content)}</td>`;
      html += "</tr>";
    }
    html += "</table>";
    root.innerHTML = html;
  }

  return root;
}

// --- Internal ---

function _highlightCode(
  code: string,
  lang: string,
  theme: typeof THEMES.dark,
  highlightLines: number[],
  startLine: number,
): string {
  let result = _escHtml(code);

  // Apply patterns for this language
  for (const { pattern, type, type: tokenType } of PATTERNS) {
    if (tokenType && !tokenType.includes(lang as Language)) continue;
    result = result.replace(pattern, (match) =>
      `<span style="color:${(theme as Record<string, string>)[tokenType] || theme.foreground}">${match}</span>`
    );
  }

  // Apply line highlights
  if (highlightLines.length > 0) {
    const lines = result.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (highlightLines.includes(startLine + i)) {
        lines[i] = `<span style="display:inline-block;width:100%;background:${theme.lineHighlight};">${lines[i]}</span>`;
      }
    }
    result = lines.join("\n");
  }

  return result;
}

function _escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface DiffLine { type: "+" | "-" | " "; content: string }

function _simpleDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      result.push({ type: "+", content: newLine! });
    } else if (newLine === undefined) {
      result.push({ type: "-", content: oldLine });
    } else if (oldLine === newLine) {
      result.push({ type: " ", content: oldLine });
    } else {
      result.push({ type: "-", content: oldLine });
      result.push({ type: "+", content: newLine });
    }
  }

  return result;
}
