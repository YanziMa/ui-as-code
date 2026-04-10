/**
 * Tokenizer and text parsing utilities.
 */

// --- Token Types ---

export enum TokenType {
  WORD = "WORD",
  NUMBER = "NUMBER",
  PUNCTUATION = "PUNCTUATION",
  WHITESPACE = "WHITESPACE",
  NEWLINE = "NEWLINE",
  SYMBOL = "SYMBOL",
  STRING = "STRING",
  COMMENT = "COMMENT",
  KEYWORD = "KEYWORD",
  IDENTIFIER = "IDENTIFIER",
  OPERATOR = "OPERATOR",
  UNKNOWN = "UNKNOWN",
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

// --- Basic Tokenizer ---

/** Tokenize text into words, numbers, punctuation, whitespace */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  let line = 1;
  let column = 1;

  while (position < text.length) {
    const char = text[position]!;

    // Whitespace
    if (/\s/.test(char)) {
      let start = position;
      while (position < text.length && /\s/.test(text[position]!)) {
        if (text[position] === "\n") { line++; column = 0; }
        position++;
        column++;
      }
      const value = text.slice(start, position);
      tokens.push({
        type: value.includes("\n") ? TokenType.NEWLINE : TokenType.WHITESPACE,
        value,
        position: start,
        line,
        column: column - value.length,
      });
      continue;
    }

    // Numbers (including decimals)
    if (/[0-9]/.test(char) || (char === "." && position + 1 < text.length && /[0-9]/.test(text[position + 1]!))) {
      let start = position;
      while (position < text.length && /[0-9.]/.test(text[position]!)) position++;
      tokens.push({ type: TokenType.NUMBER, value: text.slice(start, position), position: start, line, column });
      column += position - start;
      continue;
    }

    // Words (including unicode letters)
    if (/[a-zA-Z\u00C0-\u024F\u0400-\u04FF]/.test(char)) {
      let start = position;
      while (
        position < text.length &&
        /[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF_'-]/.test(text[position]!)
      ) position++;
      tokens.push({ type: TokenType.WORD, value: text.slice(start, position), position: start, line, column });
      column += position - start;
      continue;
    }

    // Strings in quotes
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      let start = position;
      position++; // skip opening quote
      while (position < text.length && text[position] !== quote) {
        if (text[position] === "\\") position++; // escape next char
        position++;
      }
      if (position < text.length) position++; // skip closing quote
      tokens.push({ type: TokenType.STRING, value: text.slice(start, position), position: start, line, column });
      column += position - start;
      continue;
    }

    // Single punctuation/symbol
    tokens.push({ type: TokenType.PUNCTUATION, value: char, position, line, column });
    position++;
    column++;
  }

  return tokens;
}

// --- Code Tokenizer (simplified) ---

export interface CodeToken extends Token {
  language?: string;
}

/** Simple code tokenizer that highlights syntax elements */
export function tokenizeCode(code: string, language = "javascript"): CodeToken[] {
  const keywords = getKeywords(language);
  const tokens: CodeToken[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function advance(n: number): void {
    for (let i = 0; i < n; i++) {
      if (pos < code.length && code[pos] === "\n") { line++; col = 0; }
      pos++;
      col++;
    }
  }

  while (pos < code.length) {
    const rest = code.slice(pos);

    // Comments
    if (rest.startsWith("//")) {
      const start = pos;
      while (pos < code.length && code[pos] !== "\n") advance(1);
      tokens.push({ type: TokenType.COMMENT, value: code.slice(start, pos), position: start, line, col, language });
      continue;
    }
    if (rest.startsWith("/*")) {
      const start = pos;
      advance(2);
      while (pos < code.length && !code.slice(pos, pos + 2).includes("*/")) advance(1);
      advance(2);
      tokens.push({ type: TokenType.COMMENT, value: code.slice(start, pos), position: start, line, col, language });
      continue;
    }

    // Strings
    if (code[pos] === '"' || code[pos] === "'" || code[pos] === "`") {
      const quote = code[pos]!;
      const start = pos;
      advance(1);
      while (pos < code.length && code[pos] !== quote) {
        if (code[pos] === "\\") advance(1);
        advance(1);
      }
      advance(1); // closing quote
      tokens.push({ type: TokenType.STRING, value: code.slice(start, pos), position: start, line, col, language });
      continue;
    }

    // Keywords and identifiers
    if (/[a-zA-Z_$]/.test(code[pos]!)) {
      const start = pos;
      while (pos < code.length && /[a-zA-Z0-9_$]/.test(code[pos]!)) advance(1);
      const word = code.slice(start, pos);
      const type = keywords.includes(word) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
      tokens.push({ type, value: word, position: start, line: col - (pos - start), language });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[pos]!)) {
      const start = pos;
      if (code[pos] === "0" && pos + 1 < code.length && /[xXbBoO]/.test(code[pos + 1]!)) {
        advance(2);
        while (pos < code.length && /[0-9a-fA-F_]/.test(code[pos]!)) advance(1);
      } else {
        while (pos < code.length && /[0-9._eE+]/.test(code[pos]!)) advance(1);
      }
      tokens.push({ type: TokenType.NUMBER, value: code.slice(start, pos), position: start, line: col, language });
      continue;
    }

    // Operators
    if (/[+\-*/%=<>!&|^~?:]/.test(code[pos]!)) {
      const start = pos;
      advance(1);
      while (pos < code.length && /[+\-*/%=<>!&|^~?:]/.test(code[pos]!)) advance(1);
      tokens.push({ type: TokenType.OPERATOR, value: code.slice(start, pos), position: start, line, col, language });
      continue;
    }

    // Whitespace
    if (/\s/.test(code[pos]!)) {
      const start = pos;
      while (pos < code.length && /\s/.test(code[pos]!)) advance(1);
      continue; // Skip whitespace tokens in code mode
    }

    // Default: punctuation/other
    tokens.push({ type: TokenType.PUNCTUATION, value: code[pos]!, position: pos, line, col, language });
    advance(1);
  }

  return tokens;
}

function getKeywords(language: string): string[] {
  const keywordMap: Record<string, string[]> = {
    javascript: [
      "const", "let", "var", "function", "return", "if", "else", "for", "while",
      "do", "switch", "case", "break", "continue", "try", "catch", "finally",
      "throw", "new", "typeof", "instanceof", "in", "of", "class", "extends",
      "import", "export", "from", "default", "async", "await", "yield", "this",
      "super", "static", "get", "set", "null", "undefined", "true", "false",
      "void", "delete", "with", "debugger",
    ],
    typescript: [
      "type", "interface", "enum", "implements", "abstract", "readonly", "as",
      "is", "keyof", "never", "unknown", "any", "string", "number", "boolean",
      "object", "symbol", "bigint", "declare", "namespace", "module", "require",
      "infer", "asserts", "satisfies",
    ],
    python: [
      "def", "class", "if", "elif", "else", "for", "while", "try", "except",
      "finally", "with", "as", "import", "from", "return", "yield", "lambda",
      "pass", "break", "continue", "and", "or", "not", "in", "is", "None",
      "True", "False", "global", "nonlocal", "raise", "del", "assert", "async",
      "await",
    ],
    html: [
      "html", "head", "body", "div", "span", "p", "a", "img", "ul", "ol", "li",
      "table", "tr", "td", "th", "form", "input", "button", "script", "style",
      "link", "meta", "title", "header", "footer", "nav", "main", "section",
      "article", "aside", "h1", "h2", "h3", "h4", "h5", "h6",
    ],
    css: [
      "@media", "@keyframes", "@import", "@font-face", "!important",
      "auto", "inherit", "initial", "unset", "revert", "none",
      "block", "inline", "flex", "grid", "relative", "absolute", "fixed", "sticky",
    ],
  };

  return keywordMap[language] ?? keywordMap.javascript ?? [];
}

// --- Text Analysis ---

/** Count token frequencies */
export function getTokenFrequency(tokens: Token[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    if (token.type === TokenType.WORD || token.type === TokenType.IDENTIFIER) {
      const lower = token.value.toLowerCase();
      freq.set(lower, (freq.get(lower) ?? 0) + 1);
    }
  }
  return freq;
}

/** Get N most common tokens */
export function getTopTokens(tokens: Token[], n = 10): Array<{ token: string; count: number }> {
  const freq = getTokenFrequency(tokens);
  return Array.from(freq.entries())
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** Extract unique tokens (vocabulary) */
export function getVocabulary(tokens: Token[]): Set<string> {
  const vocab = new Set<string>();
  for (const token of tokens) {
    if (token.type === TokenType.WORD || token.type === TokenType.IDENTIFIER) {
      vocab.add(token.value.toLowerCase());
    }
  }
  return vocab;
}

/** Calculate lexical diversity (unique tokens / total tokens) */
export function lexicalDiversity(tokens: Token[]): number {
  const wordTokens = tokens.filter(
    (t) => t.type === TokenType.WORD || t.type === TokenType.IDENTIFIER,
  );
  if (wordTokens.length === 0) return 0;
  const vocab = getVocabulary(tokens);
  return vocab.size / wordTokens.length;
}

/** Find all occurrences of a token pattern */
export function findTokenPattern(
  tokens: Token[],
  predicate: (token: Token) => boolean,
): Token[] {
  return tokens.filter(predicate);
}

/** Reconstruct text from tokens */
export function tokensToString(tokens: Token[], options?: {
  excludeTypes?: TokenType[];
  normalizeWhitespace?: boolean;
}): string {
  const exclude = new Set(options?.excludeTypes ?? []);
  let result = "";

  for (const token of tokens) {
    if (exclude.has(token.type)) continue;
    result += token.value;
  }

  if (options?.normalizeWhitespace) {
    result = result.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  return result;
}
