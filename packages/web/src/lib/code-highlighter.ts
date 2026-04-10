/**
 * Code Highlighter: Lightweight syntax highlighting for multiple languages.
 * Tokenizes source code and wraps tokens in <span> elements with CSS classes.
 * Supports JavaScript/TypeScript, HTML, CSS, JSON, Python, SQL, Bash, YAML,
 * with extensible language definitions and theme support.
 */

// --- Types ---

export type Language = "javascript" | "typescript" | "html" | "css" | "json" | "python" | "sql" | "bash" | "yaml" | "plaintext" | "auto";

export interface Theme {
  name: string;
  background: string;
  foreground: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function_: string;
  operator: string;
  punctuation: string;
  type: string;
  variable: string;
  tag: string;
  attrName: string;
  attrValue: string;
  regex: string;
  meta: string;
}

export interface HighlightToken {
  type: string;
  value: string;
}

export interface HighlightOptions {
  /** Source code to highlight */
  code: string;
  /** Language (or "auto" for detection) */
  lang?: Language;
  /** Theme name or custom theme */
  theme?: string | Theme;
  /** Show line numbers? */
  lineNumbers?: boolean;
  /** Starting line number */
  startLine?: number;
  /** Highlight specific lines (1-based) */
  highlightLines?: number[];
  /** Wrap long lines? */
  wrapLines?: boolean;
  /** Max height before scrolling */
  maxHeight?: string;
  /** Tab size in spaces */
  tabSize?: number;
  /** Custom CSS class for container */
  className?: string;
}

export interface HighlightResult {
  /** HTML string ready to render */
  html: string;
  /** Raw token array */
  tokens: HighlightToken[][];
  /** Detected language */
  detectedLang: Language;
  /** Line count */
  lineCount: number;
}

// --- Built-in Themes ---

export const themes: Record<string, Theme> = {
  "github-light": {
    name: "GitHub Light",
    background: "#ffffff",
    foreground: "#24292e",
    keyword: "#d73a49",
    string: "#032f62",
    comment: "#6a737d",
    number: "#005cc5",
    function_: "#6f42c1",
    operator: "#d73a49",
    punctuation: "#24292e",
    type: "#6f42c1",
    variable: "#e36209",
    tag: "#22863a",
    attrName: "#6f42c1",
    attrValue: "#032f62",
    regex: "#032f62",
    meta: "#6a737d",
  },
  "github-dark": {
    name: "GitHub Dark",
    background: "#0d1117",
    foreground: "#c9d1d9",
    keyword: "#ff7b72",
    string: "#a5d6ff",
    comment: "#8b949e",
    number: "#79c0ff",
    function_: "#d2a8ff",
    operator: "#ff7b72",
    punctuation: "#c9d1d9",
    type: "#ffa657",
    variable: "#ffa657",
    tag: "#7ee787",
    attrName: "#79c0ff",
    attrValue: "#a5d6ff",
    regex: "#a5d6ff",
    meta: "#8b949e",
  },
  "vscode": {
    name: "VS Code",
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    keyword: "#569cd6",
    string: "#ce9178",
    comment: "#6a9955",
    number: "#b5cea8",
    function_: "#dcdcaa",
    operator: "#d4d4d4",
    punctuation: "#d4d4d4",
    type: "#4ec9b0",
    variable: "#9cdcfe",
    tag: "#569cd6",
    attrName: "#9cdcfe",
    attrValue: "#ce9178",
    regex: "#d16969",
    meta: "#569cd6",
  },
};

// --- Language Definitions ---

interface Rule {
  pattern: RegExp;
  type: string;
  multiline?: boolean;
}

const LANGUAGE_RULES: Record<string, Rule[]> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, type: "comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, type: "string" },
    { pattern: /(\/(?![*\/])(?:[^\/\\]|\\.)+\/[gimsuy]*)/g, type: "regex" },
    { pattern: /\b(const|let|var|function|class|extends|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|typeof|instanceof|in|of|import|export|default|from|async|await|yield|this|super|static|get|set|delete|void|with)\b/g, type: "keyword" },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, type: "keyword" },
    { pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+)\b/g, type: "number" },
    { pattern: /\b([A-Z][a-zA-Z0-9_]*)\b/g, type: "type" },
    { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, type: "function_" },
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, type: "comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, type: "string" },
    { pattern: /\b(const|let|var|function|class|interface|type|enum|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|typeof|instanceof|in|of|import|export|default|from|as|async|await|yield|this|super|static|readonly|abstract|public|private|protected|keyof|infer|never|unknown|is|asserts|satisfies)\b/g, type: "keyword" },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, type: "keyword" },
    { pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+)\b/g, type: "number" },
    { pattern: /\b([A-Z][a-zA-Z0-9_<>\[\]]*)\b/g, type: "type" },
    { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$?]*)\s*(?=[<\(])/g, type: "function_" },
  ],
  html: [
    { pattern: /(&lt;!--[\s\S]*?--&gt;|<!--[\s\S]*?-->)/g, type: "comment" },
    { pattern: /(&lt;\/?[a-zA-Z][a-zA-Z0-9]*|<\/?[a-zA-Z][a-zA-Z0-9]*)/g, type: "tag" },
    { pattern: /\b([a-zA-Z-]+)(?==)/g, type: "attrName" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "attrValue" },
    { pattern: /(&gt;|&lt;|&amp;|&quot;)/g, type: "punctuation" },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /(#([0-9a-fA-F]{3,8})\b)/g, type: "number" },
    { pattern: /(\d+\.?\d*(px|em|rem|%|vh|vw|deg|s|ms|fr)?\b)/gi, type: "number" },
    { pattern: /(@[a-zA-Z-]+)/g, type: "meta" },
    { pattern: /([.#]?[a-zA-Z_-][a-zA-Z0-9_-]*)(?=\s*\{)/g, type: "tag" },
    { pattern: /([a-zA-Z-]+)(?=\s*:)/g, type: "attrName" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /(:|;|\{|\}|,|\(|\))/g, type: "punctuation" },
  ],
  json: [
    { pattern: /("(?:[^"\\]|\\.)*")(\s*:)/g, type: "attrName" }, // key
    { pattern: /:\s*("(?:[^"\\]|\\.)*")/g, type: "string" },
    { pattern: /\b(true|false|null)\b/g, type: "keyword" },
    { pattern: /-?\d+\.?\d*(?:e[+-]?\d+)?\b/g, type: "number" },
    { pattern: /([\{\}\[\],:])/g, type: "punctuation" },
  ],
  python: [
    { pattern: /(#.*$)/gm, type: "comment" },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, type: "string" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|raise|pass|break|continue|and|or|not|in|is|lambda|global|nonlocal|assert|del|True|False|None|async|await)\b/g, type: "keyword" },
    { pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+)\b/g, type: "number" },
    { pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, type: "function_" },
    { pattern: /\b([A-Z_][A-Z0-9_]*)\b/g, type: "variable" },
  ],
  sql: [
    { pattern: /(--.*$)/gm, type: "comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|INNER|LEFT|RIGHT|OUTER|FULL|CROSS|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|SET|VALUES|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|CASCADE|GRANT|REVOKE|COMMIT|ROLLBACK|SAVEPOINT)\b/gi, type: "keyword" },
    { pattern: /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|CONCAT|SUBSTRING|LENGTH|UPPER|LOWER|TRIM|NOW|DATE|TIME|TIMESTAMP|ROUND|ABS|FLOOR|CEIL|MOD|POWER|SQRT|RANDOM|UUID)\b/gi, type: "function_" },
    { pattern: /\b(\d+\.?\d*)\b/g, type: "number" },
  ],
  bash: [
    { pattern: /(#.*$)/gm, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, type: "string" },
    { pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|exit|echo|printf|read|cd|ls|cp|mv|rm|mkdir|rmdir|touch|cat|grep|sed|awk|find|sort|uniq|head|tail|wc|chmod|chown|export|unset|source|exec|shift|test|true|false)\b/g, type: "keyword" },
    { pattern: /(\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\}|\$\?|\$\!|\$\#|\$@|\$\*|\$\$)/g, type: "variable" },
    { pattern: /(\|\||&&|>>|<<|>|<|=|!=|-eq|-ne|-lt|-le|-gt|-ge)/g, type: "operator" },
  ],
  yaml: [
    { pattern: /(#.*$)/gm, type: "comment" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, type: "string" },
    { pattern: /^( *[a-zA-Z][a-zA-Z0-9_-]*)(?=:)/gm, type: "attrName" },
    { pattern: /\b(true|false|null|yes|no|on|off)\b/gi, type: "keyword" },
    { pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+)\b/g, type: "number" },
    { pattern: /(:|---|\.\.\.|-[ ])/g, type: "punctuation" },
  ],
};

// --- Auto-detection ---

function detectLanguage(code: string): Language {
  const trimmed = code.trim();

  // Check for shebang
  if (/^#!\s*\/bin\/(ba)?sh/.test(trimmed)) return "bash";
  if (/^#!\s*\/usr\/bin\/env\s+(python|node)/.test(trimmed)) {
    return trimmed.includes("python") ? "python" : "javascript";
  }

  // Check for common patterns
  if (/^\s*\{[\s\S]*\}\s*$/.test(trimmed)) return "json";
  if (/^<(!DOCTYPE|html|[\w])/.test(trimmed)) return "html";
  if (/^(@[a-z]|[.#]?[a-z][a-z0-9-]*\s*\{)/m.test(trimmed)) return "css";

  // Check for TypeScript-specific patterns
  if (/\b(interface|type\s+\w+\s*=|:\s*(string|number|boolean|void|any|never)\b|as\s+\w+)/.test(code)) return "typescript";

  // Default to JS
  return "javascript";
}

// --- Tokenizer ---

function tokenizeLine(line: string, rules: Rule[]): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    let bestMatch: { index: number; length: number; rule: Rule } | null = null;

    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(remaining);
      if (match && match.index === 0 && match[0]!.length > 0) {
        if (!bestMatch || match[0]!.length > bestMatch.length) {
          bestMatch = { index: 0, length: match[0]!.length, rule };
        }
      }
    }

    if (bestMatch) {
      tokens.push({ type: bestMatch.rule.type, value: remaining.slice(0, bestMatch.length) });
      remaining = remaining.slice(bestMatch.length);
    } else {
      // No match - take one character as plain text
      tokens.push({ type: "plain", value: remaining[0]! });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

function tokenize(code: string, lang: Language): HighlightToken[][] {
  const rules = LANGUAGE_RULES[lang] ?? [];
  const lines = code.split("\n");
  return lines.map((line) => tokenizeLine(line, rules));
}

// --- HTML Renderer ---

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Get theme by name or return as-is if it's a Theme object */
function resolveTheme(theme: string | Theme): Theme {
  if (typeof theme !== "string") return theme;
  return themes[theme] ?? themes["github-light"];
}

/** Main highlight function */
export function highlight(options: HighlightOptions): HighlightResult {
  const {
    code,
    lang = "auto",
    theme = "github-light",
    lineNumbers = false,
    startLine = 1,
    highlightLines = [],
    wrapLines = false,
    maxHeight,
    tabSize = 2,
    className = "",
  } = options;

  const detectedLang = lang === "auto" ? detectLanguage(code) : lang;
  const resolvedTheme = resolveTheme(theme);

  // Replace tabs
  const processedCode = code.replace(/\t/g, " ".repeat(tabSize));

  // Tokenize
  const tokens = tokenize(processedCode, detectedLang);

  // Build HTML
  const maxNumWidth = String(tokens.length + startLine - 1).length;
  let htmlParts: string[] = [];

  htmlParts.push(`<pre class="code-highlight ${className}" style="background:${resolvedTheme.background};color:${resolvedTheme.foreground};${maxHeight ? `max-height:${maxHeight};overflow:auto;` : ""}${wrapLines ? "" : "overflow-x:auto;white-space:pre;"}"><code>`);

  for (let i = 0; i < tokens.length; i++) {
    const lineTokens = tokens[i]!;
    const lineNum = i + startLine;
    const isHighlighted = highlightLines.includes(lineNum);

    htmlParts.push(`<span class="cl-line${isHighlighted ? ' cl-hl' : ''}" style="display:block;${isHighlighted ? `background:rgba(88,166,255,0.15);` : ""}">`);

    if (lineNumbers) {
      htmlParts.push(`<span class="cl-ln" style="display:inline-block;width:${maxNumWidth + 1}ch;text-align:right;padding-right:16px;margin-right:16px;color:${resolvedTheme.meta};user-select:none;border-right:1px solid rgba(128,128,128,0.2);">${String(lineNum).padStart(maxNumWidth, " ")}</span>`);
    }

    for (const token of lineTokens) {
      const color = (resolvedTheme as any)[token.type] || resolvedTheme.foreground;
      htmlParts.push(`<span class="cl-${token.type}" style="color:${color}">${escapeHtml(token.value)}</span>`);
    }

    htmlParts.push(`</span>`);
  }

  htmlParts.push(`</code></pre>`);

  return {
    html: htmlParts.join(""),
    tokens,
    detectedLang,
    lineCount: tokens.length,
  };
}

/** Quick highlight: returns only the HTML string */
export function highlightToHtml(code: string, lang: Language = "auto", theme: string | Theme = "github-light"): string {
  return highlight({ code, lang, theme }).html;
}

/** Detect language from source code */
export function detectCodeLanguage(code: string): Language {
  return detectLanguage(code);
}

/** Register a custom language definition */
export function registerLanguage(name: string, rules: Rule[]): void {
  LANGUAGE_RULES[name] = rules;
}
