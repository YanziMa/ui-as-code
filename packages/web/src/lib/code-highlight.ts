/**
 * Syntax highlighting for code blocks: tokenization, keyword detection,
 * language-specific highlighting, line numbers, copy button, and theme support.
 */

// --- Types ---

export type SupportedLang =
  | "javascript" | "typescript" | "js" | "ts"
  | "python" | "py"
  | "html" | "css" | "scss" | "json" | "xml"
  | "sql"
  | "bash" | "shell" | "sh"
  | "java" | "c" | "cpp" | "go" | "rust"
  | "yaml" | "yml"
  | "markdown" | "md"
  | "plaintext" | "text";

export interface HighlightOptions {
  /** Source code string */
  code: string;
  /** Language identifier */
  lang?: SupportedLang;
  /** Show line numbers? */
  showLineNumbers?: boolean;
  /** Starting line number */
  startLine?: number;
  /** Theme: 'light' or 'dark' */
  theme?: "light" | "dark";
  /** Highlight specific lines */
  highlightLines?: number[];
  /** Maximum height (with overflow scroll) */
  maxHeight?: number;
  /** Show copy button? */
  showCopyButton?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Tab size (spaces) */
  tabSize?: number;
}

export interface HighlightResult {
  /** The highlighted HTML element */
  element: HTMLElement;
  /** Copy the raw code to clipboard */
  copyCode: () => Promise<void>;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Language Keywords ---

const LANG_KEYWORDS: Record<string, string[]> = {
  javascript: [
    "abstract", "arguments", "await", "break", "case", "catch", "class", "const",
    "continue", "debugger", "default", "delete", "do", "else", "enum", "eval", "export",
    "extends", "false", "finally", "for", "function", "if", "implements", "import", "in",
    "instanceof", "interface", "let", "new", "null", "package", "private", "protected",
    "public", "return", "static", "super", "switch", "this", "throw", "true", "try",
    "typeof", "undefined", "var", "void", "while", "with", "yield",
  ],
  typescript: [
    ...[
      "abstract", "as", "asserts", "bigint", "boolean", "break", "case", "catch", "class",
      "const", "constructor", "continue", "debugger", "declare", "default", "delete", "do",
      "else", "enum", "export", "extends", "false", "finally", "for", "from", "function",
      "get", "if", "implements", "import", "in", "instanceof", "interface", "is", "keyof",
      "let", "module", "namespace", "new", "null", "number", "object", "of", "package",
      "private", "protected", "public", "readonly", "require", "return", "set", "static",
      "string", "super", "switch", "symbol", "this", "throw", "true", "try", "type",
      "typeof", "undefined", "unique", "unknown", "var", "void", "while", "with", "yield",
    ],
    "any", "never", "infer", "is", "type", "readonly", "satisfies",
  ],
  python: [
    "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
    "elif", "else", "except", "exec", "finally", "for", "from", "global", "if", "import",
    "in", "is", "lambda", "nonlocal", "not", "or", "pass", "print", "raise", "return",
    "try", "while", "with", "yield", "False", "None", "True",
  ],
  html: [
    "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "blockquote",
    "body", "br", "button", "canvas", "caption", "cite", "code", "col", "data", "datalist",
    "dd", "details", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption",
    "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr",
    "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link",
    "main", "map", "mark", "menu", "menuitem", "meta", "meter", "nav", "noscript",
    "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "pre",
    "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select",
    "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table",
    "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr",
    "track", "u", "ul", "video", "wbr",
  ],
  css: [
    "@media", "@keyframes", "@import", "@font-face", "!important", "align-content", "align-items",
    "all", "animation", "appearance", "aspect-ratio", "backdrop-filter", "backface-visibility",
    "background", "background-attachment", "background-blend-mode", "background-clip",
    "background-color", "background-image", "background-origin", "background-position",
    "background-repeat", "background-size", "block", "border", "border-bottom",
    "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius",
    "border-bottom-style", "border-bottom-width", "border-collapse", "border-color",
    "border-image", "border-image-outset", "border-image-repeat", "border-left",
    "border-left-color", "border-left-radius", "border-left-style", "border-left-width",
    "border-radius", "border-right", "border-right-color", "border-right-style", "border-right-width",
    "border-spacing", "border-style", "border-top", "border-top-color", "border-top-left-radius",
    "border-top-right-radius", "border-top-style", "border-top-width", "bottom", "box-decoration-break",
    "box-shadow", "break-after", "break-before", "caption-side", "caret-color", "clear", "clip",
    "clip-path", "color", "color-adjust", "color-scheme", "column-count", "column-fill",
    "column-gap", "column-rule", "column-rule-color", "column-span", "columns", "contain",
    "content", "content-visibility", "counter-increment", "counter-reset", "counter-set",
    "cue", "cue-after", "cursor", "direction", "display", "empty-cells", "filter", "flex",
    "flex-basis", "flex-direction", "flex-flow", "flex-grow", "flex-shrink", "flex-wrap", "float",
    "font", "font-family", "font-feature-settings", "font-kerning", "font-language-override",
    "font-size", "font-size-adjust", "font-stretch", "font-style", "font-synthesis",
    "font-variant", "font-variant-alternates", "font-variant-east-asian", "font-variant-ligatures",
    "font-variant-numeric", "font-variant-position", "font-variation-settings", "gap", "grid",
    "grid-area", "grid-auto-columns", "grid-auto-flow", "grid-auto-rows", "grid-column",
    "grid-column-end", "grid-column-start", "grid-gap", "grid-row", "grid-row-end",
    "grid-row-start", "grid-template-areas", "grid-template-columns", "grid-template-rows",
    "hanging-punctuation", "height", "hyphens", "hyphenate-character", "image-rendering",
    "initial", "inherit", "inline-size", "inset", "isolation", "justify-content", "justify-items",
    "justify-self", "left", "letter-spacing", "line-break", "line-height", "list-style",
    "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "mask",
    "max-height", "max-width", "min-height", "min-width", "mix-blend-mode", "object-fit",
    "object-position", "offset", "opacity", "order", "orphans", "outline", "outline-offset",
    "outline-style", "outline-width", "overflow", "overflow-anchor", "overflow-wrap", "overscroll-behavior",
    "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "page",
    "page-break-after", "page-break-before", "paint-order", "perspective", "pointer-events",
    "position", "quotes", "resize", "right", "row-gap", "scroll-margin", "scroll-padding",
    "scroll-snap-align", "scroll-snap-stop", "scroll-snap-type", "shape-image-threshold",
    "tab-size", "table-layout", "text-align", "text-align-last", "text-combine-upright",
    "text-decoration", "text-decoration-color", "text-decoration-line", "text-decoration-style",
    "text-decoration-thickness", "text-indent", "text-overflow", "text-shadow",
    "text-transform", "top", "transform", "transform-box", "transform-origin", "transition",
    "unicode-bidi", "user-select", "vertical-align", "visibility", "white-space", "width",
    "word-break", "word-spacing", "z-index",
  ],
  sql: [
    "ADD", "ALL", "ALTER", "AND", "ANY", "AS", "ASC", "BETWEEN", "BY", "CASE", "CHECK",
    "COLUMN", "CONSTRAINT", "CREATE", "CROSS", "CURRENT", "DATABASE", "DEFAULT", "DELETE",
    "DESC", "DISTINCT", "DROP", "ELSE", "END", "ESCAPE", "EXCEPT", "EXISTS", "FALSE",
    "FETCH", "FIRST", "FOR", "FOREIGN", "FROM", "FULL", "GROUP", "HAVING", "IN",
    "INDEX", "INNER", "INSERT", "INTERSECT", "INTO", "IS", "JOIN", "KEY", "LATERAL",
    "LEFT", "LIKE", "LIMIT", "MATCH", "NATURAL", "NOT", "NULL", "OF", "ON", "OR",
    "ORDER", "OUTER", "PARTITION", "PRIMARY", "REFERENCES", "RIGHT", "SELECT", "SET",
    "SOME", "TABLE", "THEN", "TO", "TRIGGER", "TRUE", "UNION", "UNIQUE", "UPDATE",
    "USING", "VALUES", "VIEW", "WHEN", "WHERE", "WITH",
  ],
  bash: [
    "alias", "bg", "bind", "break", "builtin", "case", "cd", "command", "continue",
    "declare", "default", "dirs", "disown", "do", "done", "echo", "elif", "else",
    "enable", "esac", "eval", "exec", "exit", "export", "false", "fc", "fg", "fi",
    "for", "function", "getopts", "hash", "help", "history", "if", "in", "jobs",
    "kill", "let", "local", "logout", "mapfile", "popd", "printf", "pushd",
    "pwd", "read", "readonly", "return", "set", "shift", "shopt",
    "source", "suspend", "test", "then", "time", "times", "trap", "true",
    "type", "typeset", "ulimit", "umask", "unalias", "unset", "until",
    "wait", "while",
  ],
};

// --- Themes ---

const THEMES: Record<string, { bg: string; fg: string; keyword: string; string: string; comment: string; number: string; function: string; operator: string; punctuation: string; tag: string; attr: string; lineBg: string }> = {
  light: {
    bg: "#f8f9fa",
    fg: "#24292e",
    keyword: "#cf222e",
    string: "#0a3069",
    comment: "#6e7781",
    number: "#0550ae",
    function: "#6639ba",
    operator: "#d73a49",
    punctuation: "#57606e",
    tag: "#116329",
    attr: "#1f6feb",
    lineBg: "rgba(99,102,241,0.08)",
  },
  dark: {
    bg: "#1e1e2e",
    fg: "#d4d4d8",
    keyword: "#79c0ff",
    string: "#a5d6ff",
    comment: "#6e7681",
    number: "#79c0ff",
    function: "#d2a8ff",
    operator: "#ff7b72",
    punctuation: "#8b949e",
    tag: "#7ee787",
    attr: "#79c0ff",
    lineBg: "rgba(121,192,255,0.08)",
  },
};

// --- Main Function ---

/** Highlight a code block and return an HTML element */
export function highlightCode(options: HighlightOptions): HighlightResult {
  const {
    code,
    lang = "plaintext",
    showLineNumbers = false,
    startLine = 1,
    theme = "light",
    highlightLines = [],
    maxHeight,
    showCopyButton = true,
    className = "",
    tabSize = 2,
  } = options;

  const t = THEMES[theme] ?? THEMES.light;
  const keywords = LANG_KEYWORDS[lang] ?? [];
  const lines = code.split("\n");

  // Build container
  const container = document.createElement("div");
  container.className = `code-highlight ch-${theme} ${className}`;
  container.style.cssText = `
    background:${t.bg};color:${t.fg};
    font-family:"Menlo","Consolas","Monaco","Courier New",monospace;
    font-size:13px;line-height:1.6;border-radius:8px;
    border:1px solid #e5e7eb;overflow:auto;
    position:relative;${maxHeight ? `max-height:${maxHeight}px;` : ""}
  `;

  // Code content
  const pre = document.createElement("pre");
  pre.className = "ch-code-pre";
  pre.style.cssText = "margin:0;padding:16px 20px;overflow-x:auto;tab-size:" + String(tabSize) + ";";

  // Inject keyframe styles if not present
  if (!document.getElementById("ch-styles")) {
    const style = document.createElement("style");
    style.id = "ch-styles";
    style.textContent = `
      .ch-copy-btn{position:absolute;top:8px;right:8px;padding:4px 10px;
        background:${t.bg};border:1px solid #d1d5db;border-radius:4px;
        color:${t.comment};font-size:11px;font-family:inherit;cursor:pointer;
        transition:all 0.15s;}
      .ch-copy-btn:hover{background:${t.lineBg};color:${t.keyword};}
      .ch-line-hl{display:block;background:${t.lineBg};margin:0 -16px;padding:0 16px;}
    `;
    document.head.appendChild(style);
  }

  let lineIdx = 0;
  for (const rawLine of lines) {
    const lineNum = startLine + lineIdx++;
    const isHighlighted = highlightLines.includes(lineNum);

    const lineEl = document.createElement("div");
    lineEl.className = "ch-line";
    if (isHighlighted) lineEl.classList.add("ch-line-hl");

    if (showLineNumbers) {
      const numSpan = document.createElement("span");
      numSpan.className = "ch-line-num";
      numSpan.style.cssText = `
        display:inline-block;width:40px;text-align:right;margin-right:24px;
        color:#a0aab3;user-select:none;flex-shrink:0;font-size:12px;
        min-width:40px;
      `;
      numSpan.textContent = String(lineNum);
      lineEl.appendChild(numSpan);
    }

    const contentSpan = document.createElement("span");
    contentSpan.className = "ch-line-content";
    contentSpan.innerHTML = tokenizeLine(rawLine, keywords, t);
    lineEl.appendChild(contentSpan);

    pre.appendChild(lineEl);
  }

  container.appendChild(pre);

  // Copy button
  let copyBtn: HTMLButtonElement | null = null;

  if (showCopyButton) {
    copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "ch-copy-btn";
    copyBtn.textContent = "Copy";
    container.appendChild(copyBtn);

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = "Copied!";
        copyBtn.style.color = t.keyword;
        setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.style.color = ""; }, 2000);
      } catch {
        // Fallback
      }
    });
  }

  return {
    element: container,
    async copyCode() {
      try { await navigator.clipboard.writeText(code); } catch {}
    },
    destroy() {
      container.remove();
    },
  };
}

// --- Tokenizer ---

function tokenizeLine(
  line: string,
  keywords: string[],
  t: typeof THEMES.light,
): string {
  let result = escapeHtml(line);

  // Comments
  if (result.includes("//")) {
    const parts = result.split("//");
    result = parts[0] + `<span style="color:${t.comment}">//${escapeHtml(parts.slice(1).join("//"))}</span>`;
  }
  if (result.includes("#") && !result.includes('"')) {
    const parts = result.split("#");
    if (parts.length > 1 && parts[parts.length - 1]!.trim().length < 50) {
      result = parts.slice(0, -1).join("#") + `<span style="color:${t.comment}">#${escapeHtml(parts[parts.length - 1]!)}</span>`;
    }
  }

  // Strings (single/double quotes)
  result = result.replace(/("(?:[^"\\]|\\.)*"/g, (m) =>
    `<span style="color:${t.string}">${m}</span>`
  );
  result = result.replace(/'(?:[^'\\]|\\.)*'/g, (m) =>
    `<span style="color:${t.string}">${m}</span>`
  );

  // Template literals
  result = result.replace(/`(?:[^`\\]|\\.)*`/g, (m) =>
    `<span style="color:${t.string}">${m}</span>`
  );

  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, (_, m) =>
    `<span style="color:${t.number}">${m}</span>`
  );

  // Keywords
  const kwSet = new Set(keywords.map((k) => k.toLowerCase()));
  result = result.replace(/\b([a-zA-Z_$][\w]*)\b/g, (match, word) => {
    const lower = word.toLowerCase();
    if (kwSet.has(lower)) {
      return `<span style="color:${t.keyword};font-weight:600">${match}</span>`;
    }
    return match;
  });

  // Operators
  result = result.replace(/[=+\-*/%&|^!~<>?:]+/g, (m) =>
    `<span style="color:${t.operator}">${m}</span>`
  );

  // Punctuation
  result = result.replace(/[{}[\]();,.]/g, (m) =>
    `<span style="color:${t.punctuation}">${m}</span>`
  );

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
