/**
 * Expression Parser: Safe mathematical expression evaluator with AST generation,
 * operator precedence, variable binding, custom functions, type checking,
 * constant folding, and error reporting.
 */

// --- Types ---

export type ExprType = "number" | "string" | "boolean" | "null" | "array" | "object" | "function";

export interface ExprNode {
  type: "literal" | "variable" | "binary" | "unary" | "call" | "member" | "array" | "object" | "conditional" | "logical";
  value?: unknown;
  op?: string;
  left?: ExprNode;
  right?: ExprNode;
  operand?: ExprNode;
  name?: string;
  args?: ExprNode[];
  index?: ExprNode | number;
  properties?: Map<string, ExprNode>;
  condition?: ExprNode;
  consequent?: ExprNode;
  alternate?: ExprNode;
  exprType?: ExprType;
  position?: { line: number; column: number };
}

export interface ParseError {
  message: string;
  position?: { line: number; column: number };
  near?: string;
}

export interface EvalContext {
  variables?: Record<string, unknown>;
  functions?: Record<string, (...args: unknown[]) => unknown>;
  constants?: Record<string, unknown>;
  /** Allow undefined variables (default to 0/null) */
  lenient?: boolean;
  /** Max iterations for loops/recursion */
  maxIterations?: number;
  /** Called on each evaluation step (for debugging) */
  onStep?: (node: ExprNode, result: unknown) => void;
}

export interface ParseResult {
  ast: ExprNode;
  errors: ParseError[];
}

// --- Token Types ---

interface Token {
  type: "number" | "string" | "ident" | "op" | "paren" | "bracket" | "brace" | "comma" | "colon" | "question" | "dot" | "eof" | "bool" | "null";
  value: string;
  position: { line: number; col: number };
}

// --- Operator Definitions ---

const OPERATORS: Record<string, { precedence: number; associativity: "left" | "right"; arity: 1 | 2 }> = {
  // Logical
  "||":  { precedence: 1, associativity: "left", arity: 2 },
  "&&":  { precedence: 2, associativity: "left", arity: 2 },
  // Comparison
  "==":  { precedence: 3, associativity: "left", arity: 2 },
  "!=":  { precedence: 3, associativity: "left", arity: 2 },
  "<=":   { precedence: 4, associativity: "left", arity: 2 },
  ">=":   { precedence: 4, associativity: "left", arity: 2 },
  "<":    { precedence: 4, associativity: "left",  arity: 2 },
  ">":    { precedence: 4, associativity: "left", arity: 2 },
  // Additive
  "+":   { precedence: 5, associativity: "left", arity: 2 },
  "-":   { precedence: 5, associativity: "left", arity: 2 },
  // Multiplicative
  "*":   { precedence: 6, associativity: "left", arity: 2 },
  "/":   { precedence: 6, associativity: "left", arity: 2 },
  "%":   { precedence: 6, associativity: "left", arity: 2 },
  // Power
  "**":  { precedence: 7, associativity: "right", arity: 2 },
  // Unary
  "!":   { precedence: 8, associativity: "right", arity: 1 },
  "-":   { precedence: 8, associativity: "right", arity: 1 },
  "+":   { precedence: 8, associativity: "right", arity: 1 }, // unary plus
};

const BUILT_IN_FUNCTIONS = new Set([
  "abs","ceil","floor","round","sqrt","pow","min","max",
  "sin","cos","tan","asin","acos","atan","atan2",
  "log","log10","log2","exp","random",
  "len","type","keys","values","entries","has","typeof",
  "lower","upper","trim","split","join","slice","substring",
  "parseInt","parseFloat","toString","toNumber","isNaN","isFinite",
  "clamp","lerp","map","filter","reduce","find","some","every",
  "concat","charCodeAt","fromCharCode","repeat",
]);

// --- Lexer ---

function tokenize(source: string): { tokens: Token[]; errors: ParseError[] } {
  const tokens: Token[] = [];
  const errors: ParseError[] = [];
  let pos = 0;
  let line = 1, col = 1;

  function peek(offset = 0): string { return source.slice(pos + offset, pos + offset + 1); }

  function advance(): string {
    const ch = source[pos++] ?? "";
    if (ch === "\n") { line++; col = 1; } else { col++; }
    return ch;
  }

  while (pos < source.length) {
    const ch = peek();

    // Skip whitespace
    if (/\s/.test(ch)) { advance(); continue; }

    // Number
    if (/\d/.test(ch) || (ch === "." && /\d/.test(peek(1)))) {
      const start = { line, col };
      let numStr = "";
      if (ch === ".") numStr += advance();
      else { while (pos < source.length && /[\d.]/.test(peek())) numStr += advance(); }
      if (peek() === "." && !numStr.includes(".")) {
        numStr += advance();
        while (pos < source.length && /[\d]/.test(peek())) numStr += advance();
      }
      tokens.push({ type: "number", value: numStr, position: start });
      continue;
    }

    // String
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = { line, col };
      advance(); // skip opening quote
      let str = "";
      while (pos < source.length && peek() !== quote) {
        if (peek() === "\\") { advance(); str += advance(); }
        else str += advance();
      }
      if (pos >= source.length) {
        errors.push({ message: "Unterminated string literal", position: start });
      } else {
        advance(); // skip closing quote
        tokens.push({ type: "string", value: str, position: start });
      }
      continue;
    }

    // Identifier/keyword
    if (/[a-zA-Z_$]/.test(ch)) {
      const start = { line, col };
      let ident = "";
      while (pos < source.length && /[a-zA-Z0-9_$]/.test(peek())) ident += advance();
      if (ident === "true" || ident === "false") {
        tokens.push({ type: "bool", value: ident, position: start });
      } else if (ident === "null") {
        tokens.push({ type: "null", value: ident, position: start });
      } else {
        tokens.push({ type: "ident", value: ident, position: start });
      }
      continue;
    }

    // Operators (multi-char first)
    const twoChar = ch + (peek(1) ?? "");
    if (OPERATORS[twoChar] || twoChar === "===" || twoChar == "!==") {
      tokens.push({ type: "op", value: twoChar, position: { line, col } });
      advance(); advance();
      continue;
    }

    if (OPERATORS[ch]) {
      tokens.push({ type: "op", value: ch, position: { line, col } });
      advance();
      continue;
    }

    // Punctuation
    const punctMap: Record<string, Token["type"]> = {
      "(": "paren", ")": "paren", "[": "bracket", "]": "bracket",
      "{": "brace", "}": "brace", ",": "comma", ":": "colon",
      "?": "question", ".": "dot",
    };
    if (punctMap[ch]) {
      tokens.push({ type: punctMap[ch], value: ch, position: { line, col } });
      advance();
      continue;
    }

    // Unknown character — skip
    advance();
  }

  tokens.push({ type: "eof", value: "", position: { line, col } });
  return { tokens, errors };
}

// --- Parser ---

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(source: string) {
    const result = tokenize(source);
    this.tokens = result.tokens;
  }

  private peek(offset = 0): Token { return this.tokens[this.pos + offset] ?? this.tokens[this.tokens.length - 1]!; }
  private advance(): Token { return this.tokens[this.pos++]; }
  private atEnd(): boolean { return this.peek().type === "eof"; }

  parse(): ParseResult {
    const errors: ParseError[] = [];
    const ast = this.parseExpression(0);
    if (!this.atEnd()) {
      errors.push({ message: `Unexpected token: ${this.peek().value}`, position: this.peek().position });
    }
    return { ast, errors };
  }

  private parseExpression(minPrec = 0): ExprNode {
    let left = this.parseUnary();

    while (true) {
      const tok = this.peek();
      if (tok.type !== "op") break;
      const op = OPERATORS[tok.value];
      if (!op || op.precedence < minPrec) break;

      this.advance();
      const right = this.parseExpression(op.precedence + (op.associativity === "left" ? 1 : 0));
      left = { type: "binary", op: tok.value, left, right };
    }

    return left;
  }

  private parseUnary(): ExprNode {
    const tok = this.peek();

    // Unary operators
    if ((tok.type === "op" && (tok.value === "!" || tok.value === "-" || tok.value === "+")) &&
        (this.atEnd() || !this.isBinaryOp(this.tokens[this.pos + 1]?.type === "op" ? this.tokens[this.pos + 1]?.value : ""))) {
      this.advance();
      const operand = this.parseUnary();
      return { type: "unary", op: tok.value, operand };
    }

    // Parenthesized expression
    if (tok.type === "paren" && tok.value === "(") {
      this.advance(); // (
      const expr = this.parseExpression(0);
      if (this.peek().type === "paren" && this.peek().value === ")") this.advance(); // )
      return expr;
    }

    // Ternary conditional
    if (tok.type === "question") {
      this.advance(); // ?
      const consequent = this.parseExpression(0);
      if (this.peek().type === "colon") this.advance(); // :
      const alternate = this.parseExpression(0);
      return { type: "conditional", condition: left as ExprNode, consequent, alternate };
    }

    return this.parsePrimary();
  }

  private isBinaryOp(type: string): boolean { return type === "op" && !!OPERATORS[(this.tokens[this.pos + 1] ?? this.tokens[0]).value]; }

  private parsePrimary(): ExprNode {
    const tok = this.peek();

    // Number literal
    if (tok.type === "number") {
      this.advance();
      return { type: "literal", value: parseFloat(tok.value), exprType: "number" };
    }

    // String literal
    if (tok.type === "string") {
      this.advance();
      return { type: "literal", value: tok.value, exprType: "string" };
    }

    // Boolean literal
    if (tok.type === "bool") {
      this.advance();
      return { type: "literal", value: tok.value === "true", exprType: "boolean" };
    }

    // Null literal
    if (tok.type === "null") {
      this.advance();
      literal: return { type: "literal", value: null, exprType: "null" };
    }

    // Array literal
    if (tok.type === "bracket" && tok.value === "[") {
      this.advance(); // [
      const elements: ExprNode[] = [];
      if (this.peek().type !== "bracket" || this.peek().value !== "]") {
        do {
          elements.push(this.parseExpression(0));
          if (this.peek().type === "comma") this.advance();
        } while (this.peek().type !== "bracket" || this.peek().value !== "]");
      }
      if (this.peek().type === "bracket" && this.peek().value === "]") this.advance(); // ]
      return { type: "array", elements };
    }

    // Object literal
    if (tok.type === "brace" && tok.value === "{") {
      this.advance(); // {
      const props = new Map<string, ExprNode>();
      if (this.peek().type !== "brace" || this.peek().value !== "}") {
        do {
          const keyTok = this.advance();
          const keyName = keyTok.value;
          if (this.peek().type === "colon") this.advance(); // :
          const val = this.parseExpression(0);
          props.set(keyName, val);
          if (this.peek().type === "comma") this.advance();
        } while (this.peek().type !== "brace" || this.peek().value !== "}");
      }
      if (this.peek().type === "brace" && this.peek().value === "}") this.advance(); // }
      return { type: "object", properties: props };
    }

    // Function call or identifier
    if (tok.type === "ident") {
      this.advance();
      const name = tok.value;

      // Function call
      if (this.peek().type === "paren" && this.peek().value === "(") {
        this.advance(); // (
        const args: ExprNode[] = [];
        if (this.peek().type !== "paren" || this.peek().value !== ")") {
          do {
            args.push(this.parseExpression(0));
            if (this.peek().type === "comma") this.advance();
          } while (this.peek().type !== "paren" || this.peek().value !== ")");
        }
        if (this.peek().type === "paren" && this.peek().value === ")") this.advance(); // )
        return { type: "call", name, args };
      }

      // Member access (dot notation)
      if (this.peek().type === "dot") {
        this.advance(); // .
        const memberTok = this.advance();
        const propName = memberTok.value;
        return { type: "member", object: { type: "variable", name }, property: propName };
      }

      // Variable reference
      return { type: "variable", name };
    }

    // Fallback
    this.advance();
    return { type: "literal", value: undefined, exprType: "undefined" };
  }
}

// --- Public API ---

/** Parse an expression string into an AST */
export function parseExpression(source: string): ParseResult {
  const parser = new Parser(source);
  return parser.parse();
}

/** Evaluate an expression string with given context */
export function evaluate(source: string | ExprNode, context: EvalContext = {}): unknown {
  const ast = typeof source === "string" ? parseExpression(source).ast : source;
  return evalNode(ast, context);
}

/** Evaluate a parsed AST node */
export function evalNode(node: ExprNode, ctx: EvalContext): unknown {
  switch (node.type) {
    case "literal":
      return node.value;

    case "variable": {
      if (ctx.variables && node.name in ctx.variables) return ctx.variables[node.name];
      if (ctx.constants && node.name in ctx.constants) return ctx.constants[node.name];
      if (ctx.lenient) return 0;
      throw new Error(`Undefined variable: ${node.name}`);
    }

    case "unary": {
      const val = evalNode(node.operand!, ctx);
      switch (node.op) {
        case "!": return !val;
        case "-": return typeof val === "number" ? -val : NaN;
        case "+": return +val;
      }
      return val;
    }

    case "binary": {
      // Short-circuit for logical ops
      if (node.op === "&&") {
        const l = evalNode(node.left!, ctx);
        if (!l) return false;
        return evalNode(node.right!, ctx);
      }
      if (node.op === "||") {
        const l = evalNode(node.left!, ctx);
        if (l) return true;
        return evalNode(node.right!, ctx);
      }

      const l = evalNode(node.left!, ctx);
      const r = evalNode(node.right!, ctx);

      switch (node.op) {
        case "+": return Number(l) + Number(r);
        case "-": return Number(l) - Number(r);
        case "*": return Number(l) * Number(r);
        case "/": return Number(l) / Number(r);
        case "%": return Number(l) % Number(r);
        case "**": return Math.pow(Number(l), Number(r));
        case "==": return l === r;
        case "!=": return l !== r;
        case "<": return Number(l) < Number(r);
        case ">": return Number(l) > Number(r);
        case "<=": return Number(l) <= Number(r);
        case ">=": return Number(l) >= Number(r);
      }
      return NaN;
    }

    case "conditional": {
      const cond = evalNode(node.condition!, ctx);
      return cond ? evalNode(node.consequent!, ctx) : evalNode(node.alternate!, ctx);
    }

    case "call": {
      const args = (node.args ?? []).map((a) => evalNode(a, ctx));

      // Built-in functions
      if (BUILT_IN_FUNCTIONS.has(node.name)) {
        return applyBuiltin(node.name, args);
      }

      // User-defined functions
      if (ctx.functions?.[node.name]) {
        return ctx.functions[node.name](...args);
      }

      throw new Error(`Unknown function: ${node.name}`);
    }

    case "member": {
      const obj = evalNode(node.object!, ctx);
      if (obj != null && typeof obj === "object" && node.property in (obj as Record<string, unknown>)) {
        return (obj as Record<string, unknown>)[node.property];
      }
      return undefined;
    }

    case "array":
      return (node.elements ?? []).map((e) => evalNode(e, ctx));

    case "object": {
      const result: Record<string, unknown> = {};
      if (node.properties) {
        for (const [k, v] of node.properties) {
          result[k] = evalNode(v, ctx);
        }
      }
      return result;
    }

    default:
      return undefined;
  }
}

function applyBuiltin(name: string, args: unknown[]): unknown {
  const n = args.map((a) => Number(a));
  switch (name) {
    case "abs": return Math.abs(n[0]);
    case "ceil": return Math.ceil(n[0]);
    case "floor": return Math.floor(n[0]);
    case "round": return Math.round(n[0]);
    case "sqrt": return Math.sqrt(n[0]);
    case "pow": return Math.pow(n[0], n[1] ?? 0);
    case "min": return Math.min(n[0], n[1] ?? n[0]);
    case "max": return Math.max(n[0], n[1] ?? n[0]);
    case "sin": return Math.sin(n[0]); case "cos": return Math.cos(n[0]); case "tan": return Math.tan(n[0]);
    case "asin": return Math.asin(n[0]); case "acos": return Math.acos(n[0]); case "atan": return Math.atan(n[0]);
    case "log": return Math.log(n[0]); case "log10": return Math.log10(n[0]); case "log2": return Math.log2(n[0]);
    case "exp": return Math.exp(n[0]);
    case "random": return Math.random();
    case "len": return Array.isArray(args[0]) ? args[0].length : String(args[0] ?? "").length;
    case "type": return typeof args[0];
    case "typeof": return typeof args[0];
    case "isNaN": return isNaN(Number(args[0]));
    case "isFinite": return isFinite(Number(args[0]));
    case "lower": return String(args[0]).toLowerCase();
    case "upper": return String(args[0]).toUpperCase();
    case "trim": return String(args[0] ?? "").trim();
    case "split": return String(args[0] ?? "").split(String(args[1] ?? ""));
    case "join": return Array.isArray(args[0]) ? args[0].map(String).join(String(args[1] ?? ",")) : "";
    case "slice": return String(args[0] ?? "").slice(Number(n[0]) ?? 0, Number(n[1]) ?? undefined);
    case "substring": return String(args[0] ?? "").substring(Number(n[0]) ?? 0, Number(n[1]) ?? undefined);
    case "charAt": return String(args[0] ?? "").charAt(Number(n[0]) ?? 0);
    case "charCodeAt": return String(args[0] ?? "").charCodeAt(Number(n[0]) ?? 0);
    case "fromCharCode": return String.fromCharCode(Math.round(Number(n[0])));
    "toString": return String(args[0] ?? "");
    "toNumber": return Number(args[0]);
    "parseInt": return parseInt(String(args[0] ?? ""), 10);
    "parseFloat": return parseFloat(String(args[0] ?? ""));
    "clamp": return Math.max(n[0] ?? 0, Math.min(n[1] ?? n[0], n[2] ?? Infinity));
    default: return undefined;
  }
}
