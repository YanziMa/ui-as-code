/**
 * Highlight Utilities: Text highlighting, search match highlighting,
 * syntax highlighting (basic), diff highlighting, selection highlighting,
 * and range-based text decoration.
 */

// --- Types ---

export interface HighlightRange {
  start: number;
  end: number;
  className?: string;
  style?: string;
  data?: Record<string, string>;
}

export interface HighlightOptions {
  /** Text content to highlight within */
  text?: string;
  /** Target element (if not using text option) */
  target?: HTMLElement;
  /** Ranges to highlight */
  ranges?: HighlightRange[];
  /** Search query for auto-range detection */
  query?: string;
  /** Case sensitive search */
  caseSensitive?: boolean;
  /** Whole word matching */
  wholeWord?: boolean;
  /** Use regex for query */
  regex?: boolean;
  /** Highlight CSS class */
  highlightClass?: string;
  /** Highlight inline style */
  highlightStyle?: string;
  /** Tag name for highlights (default "mark") */
  tag?: string;
  /** Called for each match */
  onMatch?: (match: string, index: number) => HighlightRange | undefined;
  /** Custom class generator per match */
  classGenerator?: (match: string, index: number) => string;
  /** Maximum matches to highlight (0 = unlimited) */
  maxMatches?: number;
}

export interface SyntaxHighlightOptions {
  /** Source code text */
  code: string;
  /** Language hint */
  language?: string;
  /** Custom token rules */
  rules?: SyntaxRule[];
  /** Tag wrapper for tokens */
  tag?: string;
  /** Line numbers */
  lineNumbers?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface SyntaxRule {
  pattern: RegExp;
  className: string;
}

export interface DiffHighlightOptions {
  /** Original text */
  original: string;
  /** Modified text */
  modified: string;
  /** Container element */
  container?: HTMLElement;
  /** Class for added lines */
  addClass?: string;
  /** Class for removed lines */
  removeClass?: string;
  /** Custom class name */
  className?: string;
}

export interface HighlightInstance {
  /** The root highlighted element */
  el: HTMLElement;
  /** Get all highlight elements */
  getHighlights: () => HTMLElement[];
  /** Remove all highlights */
  clear: () => void;
  /** Re-highlight with new options */
  update: (options: Partial<HighlightOptions>) => void;
  /** Get match count */
  getMatchCount: () => number;
  /** Destroy */
  destroy: () => void;
}

// --- Default Styles ---

const DEFAULT_HIGHLIGHT_STYLE = "background:#fff3cd;color:#856404;padding:1px 2px;border-radius:2px;";
const DEFAULT_ADD_STYLE = "background:#dcfce7;color:#166534;";
const DEFAULT_REMOVE_STYLE = "background:#fef2f2;color:#991b1b;";

// --- Built-in Syntax Rules ---

const SYNTAX_RULES: Record<string, SyntaxRule[]> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, className: "sh-comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: "sh-comment" },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|typeof|instanceof|in|of|class|extends|import|export|from|async|await|yield|this|super|static|get|set|void|delete)\b/g, className: "sh-keyword" },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: "sh-literal" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: "sh-string" },
    { pattern: /\b(\d+\.?\d*)\b/g, className: "sh-number" },
    { pattern: /([\[\](){}.,;:?])/g, className: "sh-punctuation" },
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, className: "sh-comment" },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: "sh-comment" },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|typeof|instanceof|in|of|class|extends|import|export|from|async|await|yield|type|interface|enum|implements|abstract|readonly|public|private|protected|as|is|keyof|infer|never|unknown|this|super|static|get|set|void|delete)\b/g, className: "sh-keyword" },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: "sh-literal" },
    { pattern: /(:\s*)([A-Za-z_][A-Za-z0-9_<>\[\]]*)/g, className: "sh-type" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: "sh-string" },
    { pattern: /\b(\d+\.?\d*)\b/g, className: "sh-number" },
    { pattern: /([\[\](){}.,;:?])/g, className: "sh-punctuation" },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: "sh-comment" },
    { pattern: /([.#]?[a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g, className: "sh-selector" },
    { pattern: /([a-zA-Z-]+)\s*:/g, className: "sh-property" },
    { pattern: /:\s*([^;{}]+)/g, className: "sh-value" },
    { pattern: /(#[0-9a-fA-F]{3,8})\b/g, className: "sh-color" },
    { pattern: /\b(\d+\.?(px|em|rem|%|vh|vw|s|ms)?)\b/g, className: "sh-number" },
  ],
  html: [
    { pattern: /(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)/g, className: "sh-tag" },
    { pattern: /(\s[a-zA-Z-]+)=/g, className: "sh-attr" },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: "sh-string" },
    { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, className: "sh-comment" },
  ],
  json: [
    { pattern: /("(?:[^"\\]|\\.)*")\s*:/g, className: "sh-key" },
    { pattern: /:\s*("(?:[^"\\]|\\.)*")/g, className: "sh-string" },
    { pattern: /:\s*(true|false|null|\d+\.?\d*)/g, className: "sh-literal" },
    { pattern: /([\[\]{}:,])/g, className: "sh-punctuation" },
  ],
};

// --- Search Highlight ---

/**
 * Create a search/text highlighter.
 *
 * @example
 * ```ts
 * const hl = createHighlight({
 *   target: document.getElementById("content"),
 *   query: "hello world",
 *   highlightClass: "search-match",
 * });
 * ```
 */
export function createHighlight(options: HighlightOptions): HighlightInstance {
  const {
    text,
    target,
    ranges: initialRanges,
    query,
    caseSensitive = false,
    wholeWord = false,
    regex = false,
    highlightClass = "highlight",
    highlightStyle = DEFAULT_HIGHLIGHT_STYLE,
    tag = "mark",
    onMatch,
    classGenerator,
    maxMatches = 0,
    className,
    container,
  } = options;

  let matchCount = 0;
  const root = document.createElement("div");
  root.className = `highlight-container ${className ?? ""}`.trim();

  // Get source text
  let sourceText = text ?? target?.textContent ?? "";

  // Build ranges from query if provided
  let effectiveRanges: HighlightRange[] = initialRanges ?? [];

  if (query && !initialRanges) {
    effectiveRanges = _findRanges(sourceText, query, caseSensitive, wholeWord, regex);
  }

  // Render highlighted content
  function _render(): void {
    root.innerHTML = "";
    matchCount = 0;

    if (!sourceText) return;

    // Sort ranges by start position
    const sorted = [...effectiveRanges].sort((a, b) => a.start - b.start);

    let lastIndex = 0;

    for (const range of sorted) {
      if (maxMatches > 0 && matchCount >= maxMatches) break;

      // Text before this range
      if (range.start > lastIndex) {
        root.appendChild(document.createTextNode(sourceText.slice(lastIndex, range.start)));
      }

      // Highlighted portion
      const matchText = sourceText.slice(range.start, range.end);
      const customMatch = onMatch?.(matchText, matchCount);

      const el = document.createElement(tag);
      el.className = customMatch?.className ?? (classGenerator?.(matchText, matchCount) ?? highlightClass);
      el.style.cssText = customMatch?.style ?? highlightStyle;
      el.textContent = matchText;

      if (range.data) {
        for (const [k, v] of Object.entries(range.data)) {
          el.dataset[k] = v;
        }
      }

      root.appendChild(el);
      lastIndex = Math.max(lastIndex, range.end);
      matchCount++;
    }

    // Remaining text
    if (lastIndex < sourceText.length) {
      root.appendChild(document.createTextNode(sourceText.slice(lastIndex)));
    }

    // If we had a target, replace its content
    if (target) {
      target.innerHTML = "";
      target.appendChild(root);
    } else {
      (container ?? document.body).appendChild(root);
    }
  }

  _render();

  // --- Methods ---

  function getHighlights(): HTMLElement[] {
    return Array.from(root.querySelectorAll(tag));
  }

  function clear(): void {
    effectiveRanges = [];
    _render();
  }

  function update(newOpts: Partial<HighlightOptions>): void {
    if (newOpts.text !== undefined) sourceText = newOpts.text;
    if (newOpts.query !== undefined) {
      effectiveRanges = _findRanges(sourceText, newOpts.query, newOpts.caseSensitive ?? caseSensitive, newOpts.wholeWord ?? wholeWord, newOpts.regex ?? regex);
    }
    if (newOpts.ranges !== undefined) effectiveRanges = newOpts.ranges;
    _render();
  }

  function getMatchCount(): number { return matchCount; }

  function destroy(): void { root.remove(); }

  return { el: root, getHighlights, clear, update, getMatchCount, destroy };
}

// --- Range Finder ---

function _findRanges(
  text: string,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
  useRegex: boolean,
): HighlightRange[] {
  const ranges: HighlightRange[] = [];

  if (!query) return ranges;

  try {
    let regex: RegExp;
    if (useRegex) {
      regex = new RegExp(query, caseSensitive ? "g" : "gi");
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
      regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      ranges.push({ start: match.index!, end: match.index! + match[0].length });
    }
  } catch {
    // Invalid regex — fall back to plain text search
    const flags = caseSensitive ? "g" : "gi";
    const searchStr = caseSensitive ? query : query.toLowerCase();
    const searchIn = caseSensitive ? text : text.toLowerCase();
    let idx = searchStr.indexOf(searchStr);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + query.length });
      idx = searchStr.indexOf(searchStr, idx + 1);
    }
  }

  return ranges;
}

// --- Syntax Highlighter ---

/**
 * Create a basic syntax-highlighted code block.
 *
 * @example
 * ```ts
 * const codeBlock = createSyntaxHighlight({
 *   code: 'const x = "hello";',
 *   language: "javascript",
 *   lineNumbers: true,
 * });
 * ```
 */
export function createSyntaxHighlight(options: SyntaxHighlightOptions): HTMLElement {
  const {
    code,
    language = "javascript",
    rules: customRules,
    tag = "span",
    lineNumbers = false,
    className,
    container,
  } = options;

  const root = document.createElement("pre");
  root.className = `syntax-highlight sh-${language} ${className ?? ""}`.trim();
  root.style.cssText =
    "background:#1e1e2e;border-radius:8px;padding:16px;overflow-x:auto;" +
    "font-family:'Fira Code','Cascadia Code',Consolas,monospace;font-size:13px;line-height:1.6;" +
    "color:#cdd6f4;tab-size:2;";

  const effectiveRules = customRules ?? SYNTAX_RULES[language] ?? SYNTAX_RULES.javascript;

  // Escape HTML first
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Apply rules in order
  for (const rule of effectiveRules) {
    escaped = escaped.replace(rule.pattern, (match) =>
      `<${tag} class="${rule.className}">${match}</${tag}>`
    );
  }

  if (lineNumbers) {
    const lines = escaped.split("\n");
    const numbered = lines.map((line, i) =>
      `<span class="sh-line-number" style="display:inline-block;width:32px;text-align:right;margin-right:16px;color:#585b70;user-select:none;">${i + 1}</span>${line}`
    ).join("\n");
    root.innerHTML = numbered;
  } else {
    root.innerHTML = escaped;
  }

  (container ?? document.body).appendChild(root);
  return root;
}

// --- Diff Highlighter ---

/**
 * Create a side-by-side or unified diff view.
 *
 * @example
 * ```ts
 * const diff = createDiffHighlight({
 *   original: "const x = 1;",
 *   modified: "const x = 42;",
 * });
 * ```
 */
export function createDiffHighlight(options: DiffHighlightOptions): HTMLElement {
  const {
    original,
    modified,
    addClass = "diff-add",
    removeClass = "diff-remove",
    className,
    container,
  } = options;

  const root = document.createElement("div");
  root.className = `diff-highlight ${className ?? ""}`.trim();
  root.style.cssText = "font-family:monospace;font-size:13px;line-height:1.6;";

  // Simple line-by-line diff
  const origLines = original.split("\n");
  const modLines = modified.split("\n");

  // Unified view
  const table = document.createElement("div");
  table.style.cssText = "width:100%;";

  const maxLines = Math.max(origLines.length, modLines.length);

  for (let i = 0; i < maxLines; i++) {
    const origLine = origLines[i] ?? "";
    const modLine = modLines[i] ?? "";

    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;gap:12px;padding:1px 8px;" +
      (i % 2 === 0 ? "background:rgba(128,128,128,0.05);" : "");

    if (origLine !== modLine) {
      // Changed line
      const origEl = document.createElement("span");
      origEl.textContent = `- ${origLine}`;
      origEl.style.cssText = `flex:1;${DEFAULT_REMOVE_STYLE}display:block;white-space:pre;`;
      row.appendChild(origEl);

      const modEl = document.createElement("span");
      modEl.textContent = `+ ${modLine}`;
      modEl.style.cssText = `flex:1;${DEFAULT_ADD_STYLE}display:block;white-space:pre;`;
      row.appendChild(modEl);
    } else {
      // Unchanged
      const el = document.createElement("span");
      el.textContent = `  ${origLine}`;
      el.style.cssText = "flex:2;display:block;white-space:pre;color:#6b7280;";
      row.appendChild(el);
    }

    table.appendChild(row);
  }

  root.appendChild(table);
  (container ?? document.body).appendChild(root);
  return root;
}
