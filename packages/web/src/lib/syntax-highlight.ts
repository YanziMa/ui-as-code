/**
 * Syntax Highlighting: Tokenizer-based code syntax highlighter with
 * language definitions, theme support, line numbering, copy button,
 * word wrap, and accessibility.
 */

// --- Types ---

export interface HighlightOptions {
  /** Source code to highlight */
  code: string;
  /** Language identifier */
  lang?: string;
  /** Theme name or custom theme */
  theme?: string | HighlightTheme;
  /** Show line numbers? */
  lineNumbers?: boolean;
  /** Starting line number */
  startLine?: number;
  /** Highlight specific lines (1-based) */
  highlightLines?: number[];
  /** Enable word wrap? */
  wrap?: boolean;
  /** Tab size in spaces (default: 2) */
  tabSize?: number;
  /** Maximum height before scrolling (px), 0 = no limit */
  maxHeight?: number;
  /** Custom CSS class for container */
  className?: string;
  /** Show a copy-to-clipboard button? */
  showCopyButton?: boolean;
  /** Language label shown in header */
  showLanguageLabel?: boolean;
}

export interface HighlightTheme {
  name: string;
  background: string;
  foreground: string;
  selectionBackground?: string;
  selectionForeground?: string;
  comment: { color: string; fontStyle?: string };
  keyword: { color: string; fontStyle?: string };
  string: { color: string; fontStyle?: string };
  number: { color: string; fontStyle?: string };
  function_: { color: string; fontStyle?: string };
  operator: { color: string; fontStyle?: string };
  punctuation: { color: string; fontStyle?: string };
  variable: { color: string; fontStyle?: string };
  type: { color: string; fontStyle?: string };
  constant: { color: string; fontStyle?: string };
  tag: { color: string; fontStyle?: string };
  attribute: { color: string; fontStyle?: string };
  regex: { color: string; fontStyle?: string };
  meta: { color: string; fontStyle?: string };
  error: { color: string; fontStyle?: string };
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export type TokenType =
  | "comment" | "keyword" | "string" | "number"
  | "function" | "operator" | "punctuation" | "variable"
  | "type" | "constant" | "tag" | "attribute" | "regex"
  | "meta" | "error" | "whitespace" | "plain";

// --- Built-in Themes ---

const themes: Record<string, HighlightTheme> = {
  githubLight: {
    name: "GitHub Light",
    background: "#ffffff",
    foreground: "#24292f",
    comment: { color: "#6e7781", fontStyle: "italic" },
    keyword: { color: "#cf222e" },
    string: { color: "#0a3069" },
    number: { color: "#0550ae" },
    function_: { color: "#8250df" },
    operator: { color: "#24292f" },
    punctuation: { color: "#24292f" },
    variable: { color: "#953800" },
    type: { color: "#953800" },
    constant: { color: "#0550ae" },
    tag: { color: "#116329" },
    attribute: { color: "#953800" },
    regex: { color: "#cf222e" },
    meta: { color: "#6e7781" },
    error: { color: "#cf222e" },
  },
  githubDark: {
    name: "GitHub Dark",
    background: "#0d1117",
    foreground: "#c9d1d9",
    comment: { color: "#8b949e", fontStyle: "italic" },
    keyword: { color: "#ff7b72" },
    string: { color: "#a5d6ff" },
    number: { color: "#79c0ff" },
    function_: { color: "#d2a8ff" },
    operator: { color: "#c9d1d9" },
    punctuation: { color: "#c9d1d9" },
    variable: { color: "#ffa657" },
    type: { color: "#ffa657" },
    constant: { color: "#79c0ff" },
    tag: { color: "#7ee787" },
    attribute: { color: "#79c0ff" },
    regex: { color: "#ffa657" },
    meta: { color: "#8b949e" },
    error: { color: "#ffa657" },
  },
  monokai: {
    name: "Monokai",
    background: "#272822",
    foreground: "#f8f8f2",
    comment: { color: "#75715e", fontStyle: "italic" },
    keyword: { color: "#f92672" },
    string: { color: "#e6db74" },
    number: { color: "#ae81ff" },
    function_: { color: "#a6e22e" },
    operator: { color: "#f92672" },
    punctuation: { color: "#f8f8f2" },
    variable: { color: "#f8f8f2" },
    type: { color: "#66d9ef" },
    constant: { color: "#ae81ff" },
    tag: { color: "#f92672" },
    attribute: { color: "#a6e22e" },
    regex: { color: "#e6db74" },
    meta: { color: "#75715e" },
    error: { color: "#f92672" },
  },
  solarizedLight: {
    name: "Solarized Light",
    background: "#fdf6e3",
    foreground: "#657b83",
    comment: { color: "#93a1a1", fontStyle: "italic" },
    keyword: { color: "#859900" },
    string: { color: "#2aa198" },
    number: { color: "#d33682" },
    function_: { color: "#268bd2" },
    operator: { color: "#657b83" },
    punctuation: { color: "#657b83" },
    variable: { color: "#b58900" },
    type: { color: "#b58900" },
    constant: { color: "#d33682" },
    tag: { color: "#268bd2" },
    attribute: { color: "#b58900" },
    regex: { color: "#dc322f" },
    meta: { color: "#93a1a1" },
    error: { color: "#dc322f" },
  },
  solarizedDark: {
    name: "Solarized Dark",
    background: "#002b36",
    foreground: "#839496",
    comment: { color: "#586e75", fontStyle: "italic" },
    keyword: { color: "#859900" },
    string: { color: "#2aa198" },
    number: { color: "#d33682" },
    function_: { color: "#268bd2" },
    operator: { color: "#839496" },
    punctuation: { color: "#839496" },
    variable: { color: "#b58900" },
    type: { color: "#b58900" },
    constant: { color: "#d33682" },
    tag: { color: "#268bd2" },
    attribute: { color: "#b58900" },
    regex: { color: "#dc322f" },
    meta: { color: "#586e75" },
    error: { color: "#dc322f" },
  },
};

// --- Language Definitions ---

interface LanguageRule {
  pattern: RegExp;
  type: TokenType;
  global?: boolean;
}

const languageRules: Record<string, LanguageRule[]> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, type: "comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, type: "string" },
    { pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+)\b/g, type: "number" },
    { pattern: /\b(const|let|var|function|class|extends|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|in|of|import|export|from|default|async|await|yield|this|super|null|undefined|true|false)\b/g, type: "keyword" },
    { pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g, type: "type" },
    { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, type: "function" },
    { pattern: /([+\-*/%=<>!&|^~?:]+)/g, type: "operator" },
    { pattern: /([{}()\[\];,.])/g, type: "punctuation" },
    { pattern: /(\/(?![/])(?:[^\\/]|\\.)+\/[gimsuy]*)/g, type: "regex" },
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, type: "comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, type: "string" },
    { pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+)\b/g, type: "number" },
    { pattern: /\b(const|let|var|function|class|interface|type|enum|extends|implements|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|in|of|import|export|from|default|as|async|await|yield|readonly|abstract|public|private|protected|static|this|super|null|undefined|true|false|never|any|unknown|void|keyof|infer|is|satisfies)\b/g, type: "keyword" },
    { pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g, type: "type" },
    { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, type: "function" },
    { pattern: /([+\-*/%=<>!&|^~?:]+)/g, type: "operator" },
    { pattern: /([{}()\[\];,.])/g, type: "punctuation" },
    { pattern: /(:\s*)([A-Za-z<>,|&\[\]]+)/g, type: "type" },
    { pattern: /(\/(?![/])(?:[^\\/]|\\.)+\/[gimsuy]*)/g, type: "regex" },
  ],
  html: [
    { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, type: "comment" },
    { pattern: /(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)/g, type: "tag" },
    { pattern: /(&gt;)/g, type: "tag" },
    { pattern: /\s([a-zA-Z-]+)(?==)/g, type: "attribute" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /(#?[a-zA-Z_][\w-]*)\s*(?=\{)/g, type: "tag" },
    { pattern: /([\w-]+)(?=\s*:)/g, type: "attribute" },
    { pattern: /:\s*([^;{}]+)/g, type: "string" },
    { pattern: /(@[a-zA-Z-]+)/g, type: "keyword" },
    { pattern: /(\.[\w-]+)/g, type: "class" as TokenType },
    { pattern: /(#[\w-]+)/g, type: "id" as TokenType },
    { pattern: /\b(px|em|rem|%|vh|vw|deg|s|ms|fr)\b/g, type: "constant" },
  ],
  python: [
    { pattern: /(#.*$)/gm, type: "comment" },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, type: "string" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+)\b/g, type: "number" },
    { pattern: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|and|or|not|in|is|None|True|False|raise|pass|break|continue|global|nonlocal|assert|del|async|await)\b/g, type: "keyword" },
    { pattern: /\b([A-Z][a-zA-Z0-9_]*)\b/g, type: "type" },
    { pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, type: "function" },
    { pattern: /([+\-*/%=<>!&|^~@])/g, type: "operator" },
    { pattern: /([{}()\[\]:,.])/g, type: "punctuation" },
  ],
  json: [
    { pattern: /("(?:[^"\\]|\\.)*")(?=\s*:)/g, type: "attribute" },
    { pattern: /("(?:[^"\\]|\\.)*")/g, type: "string" },
    { pattern: /\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/g, type: "number" },
    { pattern: /\b(true|false|null)\b/g, type: "keyword" },
    { pattern: /([{}\[\]:,])/g, type: "punctuation" },
  ],
  sql: [
    { pattern: /(--.*$)/gm, type: "comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /('(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /\b(\d+\.?\d*)\b/g, type: "number" },
    { pattern: /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|INNER|LEFT|RIGHT|OUTER|CROSS|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|SET|VALUES|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|TRIGGER|PROCEDURE|FUNCTION|RETURN|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE)\b/gi, type: "keyword" },
    { pattern: /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|CONCAT|SUBSTRING|LENGTH|UPPER|LOWER|TRIM|NOW|DATE|TIMESTAMP)\b/gi, type: "function" },
    { pattern: /([+\-*/%=<>!|&])/g, type: "operator" },
    { pattern: /([();,])/g, type: "punctuation" },
  ],
  bash: [
    { pattern: /(#.*$)/gm, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^']*)')/g, type: "string" },
    { pattern: /\$\{([^}]+)\}|\$([a-zA-Z_]\w*)/g, type: "variable" },
    { pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|printf|read|cd|ls|pwd|mkdir|rm|cp|mv|cat|grep|sed|awk|find|export|source|alias|unset|shift|set|local|declare|typeset|true|false)\b/g, type: "keyword" },
    { pattern: /(\|\||&&|>>|<<|>|<|=|!|-eq|-ne|-gt|-ge|-lt|-le)/g, type: "operator" },
    { pattern: /([{}()\[\];,])/g, type: "punctuation" },
  ],
};

// --- Tokenizer ---

function tokenize(code: string, lang: string): Token[] {
  const rules = languageRules[lang] ?? languageRules.javascript!;
  const tokens: Token[] = [];
  const processed = new Set<number>();

  // Sort rules by specificity (longer patterns first)
  const sortedRules = [...rules].sort((a, b) => (b.pattern.source.length - a.pattern.source.length));

  for (const rule of sortedRules) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;

    // Reset lastIndex for global regexes
    if (rule.global !== false) {
      regex.lastIndex = 0;
    }

    while ((match = regex.exec(code)) !== null) {
      const start = match.index;

      // Skip if this range overlaps an already-processed token
      let overlaps = false;
      for (const token of tokens) {
        if (start >= token.start && start < token.end || start < token.end && match.index + match[0]!.length > token.start) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      processed.add(start);

      tokens.push({
        type: rule.type,
        value: match[0],
        start,
        end: start + match[0]!.length,
      });
    }
  }

  // Fill gaps with plain text
  tokens.sort((a, b) => a.start - b.start);
  const filled: Token[] = [];
  let pos = 0;

  for (const token of tokens) {
    if (token.start > pos) {
      filled.push({ type: "plain", value: code.slice(pos, token.start), start: pos, end: token.start });
    }
    filled.push(token);
    pos = token.end;
  }

  if (pos < code.length) {
    filled.push({ type: "plain", value: code.slice(pos), start: pos, end: code.length });
  }

  return filled;
}

// --- Theme Resolution ---

function resolveTheme(theme?: string | HighlightTheme): HighlightTheme {
  if (!theme) return themes.githubDark;
  if (typeof theme === "object") return theme;
  return themes[theme] ?? themes.githubDark!;
}

// --- CSS Injection ---

let stylesInjected = false;

function injectHighlightStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.id = "highlight-styles";
  style.textContent = `
    .hl-container { position:relative;border-radius:8px;overflow:hidden;font-family:'SF Mono',SFMono-Regular,'Cascadia Code',Fira Code,Consolas,'Liberation Mono',Menlo,monospace;font-size:13px;line-height:1.6; }
    .hl-header { display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:rgba(128,128,128,0.1);border-bottom:1px solid rgba(128,128,128,0.15);font-size:12px;user-select:none; }
    .hl-lang-label { opacity:0.7;text-transform:uppercase;letter-spacing:0.05em;font-weight:500; }
    .hl-copy-btn { padding:4px 10px;border:none;border-radius:4px;cursor:pointer;font-size:11px;background:rgba(128,128,128,0.15);color:inherit;transition:background 0.15s; }
    .hl-copy-btn:hover { background:rgba(128,128,128,0.25); }
    .hl-copy-btn.copied { color:#22c55e; }
    .hl-body { padding:0;overflow:auto;position:relative; }
    .hl-body pre { margin:0;padding:0;overflow:visible;tab-size:2; }
    .hl-line-numbers { display:flex;flex-direction:column;counter-reset:line;padding:16px 0;user-select:none;text-align:right;min-width:48px;padding-right:12px;border-right:1px solid rgba(128,128,128,0.1);opacity:0.45;font-size:12px; }
    .hl-line-numbers span::before { counter-increment:line;content:counter(line);display:block;padding:0 8px; }
    .hl-code { flex:1;padding:16px;overflow-x:auto;white-space:pre;tab-size:2; }
    .hl-code.hl-wrap { white-space:pre-wrap;word-break:break-all; }
    .hl-row { display:flex;align-items:flex-start; }
    .hl-row.hl-highlighted { background:rgba(99,102,241,0.08); }
    .hl-line-number { min-width:48px;padding-right:12px;text-align:right;user-select:none;opacity:0.45;font-size:12px;padding-top:0;padding-bottom:0;line-height:inherit;display:inline-block;vertical-align:top; }
    .hl-line-content { flex:1; }
    .hl-c { font-style:italic; }
    .hl-kw { font-weight:600; }
    .hl-str { }
    .hl-num { }
    .hl-fn { }
    .hl-op { }
    .hl-punc { }
    .hl-var { }
    .hl-type { }
    .hl-const { }
    .hl-tag { }
    .hl-attr { }
    .hl-re { }
    .hl-meta { }
    .hl-err { text-decoration:wavy underline; }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Main Function ---

/**
 * Create a highlighted code block element from source code.
 * Returns an HTMLElement ready to insert into the DOM.
 */
export function highlightCode(options: HighlightOptions): HTMLElement {
  injectHighlightStyles();

  const opts = {
    lang: options.lang ?? "javascript",
    lineNumbers: options.lineNumbers ?? false,
    startLine: options.startLine ?? 1,
    highlightLines: options.highlightLines ?? [],
    wrap: options.wrap ?? false,
    tabSize: options.tabSize ?? 2,
    maxHeight: options.maxHeight ?? 0,
    className: options.className ?? "",
    showCopyButton: options.showCopyButton ?? false,
    showLanguageLabel: options.showLanguageLabel ?? false,
    ...options,
  };

  const theme = resolveTheme(opts.theme);

  // Process tabs
  const spaces = " ".repeat(opts.tabSize);
  const code = opts.code.replace(/\t/g, spaces);

  // Tokenize
  const tokens = tokenize(code, opts.lang);

  // Build container
  const container = document.createElement("div");
  container.className = `hl-container ${opts.className}`;
  container.style.cssText = `background:${theme.background};color:${theme.foreground};`;
  if (opts.maxHeight > 0) {
    container.style.maxHeight = `${opts.maxHeight}px`;
  }

  // Header
  const hasHeader = opts.showCopyButton || opts.showLanguageLabel;
  if (hasHeader) {
    const header = document.createElement("div");
    header.className = "hl-header";

    if (opts.showLanguageLabel) {
      const langLabel = document.createElement("span");
      langLabel.className = "hl-lang-label";
      langLabel.textContent = opts.lang.toUpperCase();
      header.appendChild(langLabel);
    } else {
      const spacer = document.createElement("span");
      header.appendChild(spacer);
    }

    if (opts.showCopyButton) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "hl-copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code);
          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.classList.remove("copied");
          }, 2000);
        } catch {
          // Fallback
          const ta = document.createElement("textarea");
          ta.value = code;
          ta.style.cssText = "position:fixed;left:-9999px;";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
        }
      });
      header.appendChild(copyBtn);
    }

    container.appendChild(header);
  }

  // Body
  const body = document.createElement("div");
  body.className = "hl-body";

  if (opts.lineNumbers) {
    // Line-by-line rendering with numbers
    const lines = code.split("\n");
    const lineSet = new Set(opts.highlightLines);

    for (let i = 0; i < lines.length; i++) {
      const row = document.createElement("div");
      row.className = `hl-row${lineSet.has(i + opts.startLine) ? " hl-highlighted" : ""}`;

      const lineNum = document.createElement("span");
      lineNum.className = "hl-line-number";
      lineNum.textContent = String(i + opts.startLine);

      const content = document.createElement("span");
      content.className = "hl-line-content";
      content.innerHTML = renderTokensForLine(tokens, i, theme);

      row.appendChild(lineNum);
      row.appendChild(content);
      body.appendChild(row);
    }
  } else {
    // Single block rendering
    const pre = document.createElement("pre");
    pre.innerHTML = renderAllTokens(tokens, theme);
    body.appendChild(pre);
  }

  container.appendChild(body);
  return container;
}

/** Render all tokens into a single HTML string */
function renderAllTokens(tokens: Token[], theme: HighlightTheme): string {
  return tokens.map((t) => wrapToken(t.value, t.type, theme)).join("");
}

/** Render tokens belonging to a specific line */
function renderTokensForLine(tokens: Token[], lineIndex: number, theme: HighlightTheme): string {
  const lineStart = getLineOffset(tokens, lineIndex);
  const lineEnd = getLineOffset(tokens, lineIndex + 1);

  const lineTokens = tokens.filter(
    (t) => t.start >= lineStart && t.start < lineEnd,
  );

  return lineTokens.map((t) => wrapToken(t.value, t.type, theme)).join("");
}

/** Get the character offset of the start of a given line index */
function getLineOffset(tokens: Token[], lineIndex: number): number {
  let offset = 0;
  let currentLine = 0;

  for (const token of tokens) {
    if (currentLine === lineIndex) return offset;

    const newlines = (token.value.match(/\n/g) || []).length;
    if (newlines > 0) {
      const lastNewline = token.value.lastIndexOf("\n");
      offset = token.start + lastNewline + 1;
      currentLine += newlines;
    }
  }

  return offset;
}

/** Wrap a token value in a span with appropriate class and style */
function wrapToken(value: string, type: TokenType, theme: HighlightTheme): string {
  const escaped = escapeHtml(value);

  switch (type) {
    case "comment": return `<span class="hl-c" style="color:${theme.comment.color};${theme.comment.fontStyle ? `font-style:${theme.comment.fontStyle};` : ""}">${escaped}</span>`;
    case "keyword": return `<span class="hl-kw" style="color:${theme.keyword.color};${theme.keyword.fontStyle ? `font-style:${theme.keyword.fontStyle};` : ""}${type === "keyword" ? "font-weight:600;" : ""}">${escaped}</span>`;
    case "string": return `<span class="hl-str" style="color:${theme.string.color};">${escaped}</span>`;
    case "number": return `<span class="hl-num" style="color:${theme.number.color};">${escaped}</span>`;
    case "function": return `<span class="hl-fn" style="color:${theme.function_.color};">${escaped}</span>`;
    case "operator": return `<span class="hl-op" style="color:${theme.operator.color};">${escaped}</span>`;
    case "punctuation": return `<span class="hl-punc" style="color:${theme.punctuation.color};">${escaped}</span>`;
    case "variable": return `<span class="hl-var" style="color:${theme.variable.color};">${escaped}</span>`;
    case "type": return `<span class="hl-type" style="color:${theme.type.color};">${escaped}</span>`;
    case "constant": return `<span class="hl-const" style="color:${theme.constant.color};">${escaped}</span>`;
    case "tag": return `<span class="hl-tag" style="color:${theme.tag.color};">${escaped}</span>`;
    case "attribute": return `<span class="hl-attr" style="color:${theme.attribute.color};">${escaped}</span>`;
    case "regex": return `<span class="hl-re" style="color:${theme.regex.color};">${escaped}</span>`;
    case "meta": return `<span class="hl-meta" style="color:${theme.meta.color};">${escaped}</span>`;
    case "error": return `<span class="hl-err" style="color:${theme.error.color};">${escaped}</span>`;
    default: return escaped;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Convenience Functions ---

/**
 * Quick highlight: returns HTML string (no DOM element).
 */
export function highlightToHtml(code: string, lang = "javascript"): string {
  const el = highlightCode({ code, lang });
  return el.innerHTML;
}

/**
 * Register a custom language definition.
 */
export function registerLanguage(
  name: string,
  rules: LanguageRule[],
): void {
  languageRules[name] = rules;
}

/**
 * Register a custom theme.
 */
export function registerTheme(theme: HighlightTheme): void {
  themes[theme.name] = theme;
}

/**
 * Get list of available language names.
 */
export function getAvailableLanguages(): string[] {
  return Object.keys(languageRules);
}

/**
 * Get list of available theme names.
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themes);
}
