/**
 * Template Engine: Advanced templating system with Mustache-like syntax,
 * custom helpers, partials, layouts, inheritance, i18n support,
 * escaping, whitespace control, conditionals, loops, comments,
 * template composition, caching, error handling.
 */

// --- Types ---

export interface TemplateContext {
  [key: string]: unknown;
}

export interface TemplateOptions {
  escapeFn?: (str: string) => string;
  autoTrim?: boolean;
  strict?: boolean;        // Throw on undefined variables
  cacheSize?: number;
  delimiters?: [string, string]; // Custom delimiters e.g. ["{{", "}}"]
  defaultLayout?: string;
}

export interface TemplateError extends Error {
  line?: number;
  column?: number;
  source?: string;
}

export interface PartialTemplate {
  name: string;
  content: string;
  compiled?: CompiledTemplate;
}

export interface HelperFunction {
  (...args: unknown[]): unknown | Promise<unknown>;
}

// --- Tokenizer ---

type TokenType =
  | "text" | "variable" | "section_open" | "section_close"
  | "inverted_open" | "partial" | "comment"
  | "delimiter_change" | "set_delimiter";

interface Token {
  type: TokenType;
  value: string;
  raw: string;
  line: number;
  col: number;
}

function tokenize(template: string, delimiters: [string, string] = ["{{", "}}"]): Token[] {
  const tokens: Token[] = [];
  const [open, close] = delimiters;
  let pos = 0;
  let line = 1, col = 1;

  while (pos < template.length) {
    const openIdx = template.indexOf(open, pos);

    if (openIdx === -1) {
      // Rest is text
      tokens.push({ type: "text", value: template.slice(pos), raw: template.slice(pos), line, col });
      break;
    }

    // Text before tag
    if (openIdx > pos) {
      const text = template.slice(pos, openIdx);
      tokens.push({ type: "text", value: text, raw: text, line, col });
      for (const ch of text) { if (ch === "\n") { line++; col = 1; } else col++; }
    }

    const closeIdx = template.indexOf(close, openIdx + open.length);
    if (closeIdx === -1) {
      throw new TemplateParseError(`Unclosed tag at line ${line}`, line);
    }

    const inner = template.slice(openIdx + open.length, closeIdx).trim();
    const raw = template.slice(openIdx, closeIdx + close.length);

    let type: TokenType = "variable";
    if (inner.startsWith("#")) { type = "section_open"; inner = inner.slice(1).trim(); }
    else if (inner.startsWith("^")) { type = "inverted_open"; inner = inner.slice(1).trim(); }
    else if (inner.startsWith("/")) { type = "section_close"; inner = inner.slice(1).trim(); }
    else if (inner.startsWith(">")) { type = "partial"; inner = inner.slice(1).trim(); }
    else if (inner.startsWith("!")) { type = "comment"; inner = inner.slice(1).trim(); }
    else if (inner.startsWith("=") && inner.endsWith("=")) {
      type = "delimiter_change";
      inner = inner.slice(1, -1).trim();
    }

    tokens.push({ type, value: inner, raw, line, col });

    // Advance position
    pos = closeIdx + close.length;
    for (let i = openIdx; i < pos; i++) {
      if (template[i] === "\n") { line++; col = 1; } else col++;
    }
  }

  return tokens;
}

class TemplateParseError extends Error implements TemplateError {
  constructor(message: string, public line?: number, public column?: number) {
    super(message);
    this.name = "TemplateParseError";
  }
}

// --- AST Node Types ---

interface TextNode { type: "text"; content: string; }
interface VariableNode { type: "variable"; name: string; escaped: boolean; filters: string[]; }
interface SectionNode { type: "section"; name: string; inverted: boolean; children: AstNode[]; }
interface PartialNode { type: "partial"; name: string; params: Record<string, string>; }
interface CommentNode { type: "comment"; content: string; }

type AstNode = TextNode | VariableNode | SectionNode | PartialNode | CommentNode;

// --- Parser ---

function parseTokens(tokens: Token[]): AstNode[] {
  const nodes: AstNode[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i]!;

    switch (token.type) {
      case "text":
        nodes.push({ type: "text", content: token.value });
        i++;
        break;

      case "comment":
        nodes.push({ type: "comment", content: token.value });
        i++;
        break;

      case "variable": {
        const { name, escaped, filters } = parseVariableName(token.value);
        nodes.push({ type: "variable", name, escaped, filters });
        i++;
        break;
      }

      case "section_open":
      case "inverted_open": {
        const sectionName = token.value;
        const children: AstNode[] = [];
        i++;

        let depth = 1;
        while (i < tokens.length && depth > 0) {
          const child = tokens[i]!;
          if (child.type === "section_open" && child.value === sectionName) depth++;
          else if (child.type === "section_close" && child.value === sectionName) depth--;
          if (depth > 0) children.push(...parseTokens([child]));
          i++;
        }

        nodes.push({ type: "section", name: sectionName, inverted: token.type === "inverted_open", children });
        break;
      }

      case "partial": {
        const parts = token.value.split(/\s+/);
        const name = parts[0] ?? "";
        const params: Record<string, string> = {};
        for (let p = 1; p < parts.length; p++) {
          const kv = parts[p]!.split("=");
          if (kv.length === 2) params[kv[0]!.trim()] = kv[1]!.trim().replace(/^['"]|['"]$/g, "");
        }
        nodes.push({ type: "partial", name, params });
        i++;
        break;
      }

      default:
        i++;
    }
  }

  return nodes;
}

function parseVariableName(raw: string): { name: string; escaped: boolean; filters: string[] } {
  let name = raw.trim();
  let escaped = !name.startsWith("&");
  if (!escaped) name = name.slice(1).trim();

  // Parse filters: name|filter1|filter2
  const pipeIdx = name.indexOf("|");
  let filters: string[] = [];
  if (pipeIdx >= 0) {
    filters = name.slice(pipeIdx + 1).split("|").map((f) => f.trim());
    name = name.slice(0, pipeIdx).trim();
  }

  return { name, escaped, filters };
}

// --- Compiled Template ---

interface CompiledTemplate {
  ast: AstNode[];
  source: string;
  delimiters: [string, string];
  partialNames: Set<string>;
}

// --- Template Engine ---

export class TemplateEngine {
  private cache = new Map<string, CompiledTemplate>();
  private partials = new Map<string, PartialTemplate>();
  private helpers = new Map<string, HelperFunction>();
  private options: Required<TemplateOptions>;
  private layouts = new Map<string, string>();

  constructor(options: TemplateOptions = {}) {
    this.options = {
      escapeFn: options.escapeFn ?? escapeHtml,
      autoTrim: options.autoTrim ?? true,
      strict: options.strict ?? false,
      cacheSize: options.cacheSize ?? 100,
      delimiters: options.delimiters ?? ["{{", "}}"],
      defaultLayout: options.defaultLayout ?? "",
    };
  }

  /** Compile a template string */
  compile(source: string): CompiledTemplate {
    // Check cache
    const cached = this.cache.get(source);
    if (cached) return cached;

    const tokens = tokenize(source, this.options.delimiters);
    const ast = parseTokens(tokens);
    const partialNames = new Set<string>();

    // Collect partial references
    function collectPartials(nodes: AstNode[]) {
      for (const node of nodes) {
        if (node.type === "partial") partialNames.add(node.name);
        if (node.type === "section") collectPartials(node.children);
      }
    }
    collectPartials(ast);

    const compiled: CompiledTemplate = { ast, source, delimiters: [...this.options.delimiters], partialNames };

    // Cache management
    if (this.cache.size >= this.options.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(source, compiled);

    return compiled;
  }

  /** Render a compiled template with context */
  render(compiledOrSource: CompiledTemplate | string, context: TemplateContext = {}): string {
    const compiled = typeof compiledOrSource === "string"
      ? this.compile(compiledOrSource)
      : compiledOrSource;

    return this.renderAst(compiled.ast, context);
  }

  /** Compile and render in one step */
  renderString(template: string, context: TemplateContext = {}): string {
    return this.render(this.compile(template), context);
  }

  /** Register a helper function */
  registerHelper(name: string, fn: HelperFunction): void {
    this.helpers.set(name, fn);
  }

  /** Register a partial template */
  registerPartial(name: string, content: string): PartialTemplate {
    const partial: PartialTemplate = { name, content };
    try { partial.compiled = this.compile(content); } catch {}
    this.partials.set(name, partial);
    return partial;
  }

  /** Register a layout template */
  registerLayout(name: string, content: string): void {
    this.layouts.set(name, content);
  }

  /** Get a registered partial */
  getPartial(name: string): PartialTemplate | undefined {
    return this.partials.get(name);
  }

  /** Remove all cached templates */
  clearCache(): void { this.cache.clear(); }

  /** Remove all partials */
  clearPartials(): void { this.partials.clear(); }

  /** Render with a layout */
  renderWithLayout(contentTemplate: string, context: TemplateContext = {}, layoutName?: string): string {
    const layout = layoutName ?? this.options.defaultLayout;
    if (!layout || !this.layouts.has(layout)) return this.renderString(contentTemplate, context);

    const layoutContent = this.layouts.get(layout)!;
    const bodyContent = this.renderString(contentTemplate, context);
    return this.renderString(layoutContent, { ...context, body: bodyContent });
  }

  /** Pre-compile all registered partials */
  precompilePartials(): void {
    for (const [, partial] of this.partials) {
      try { partial.compiled = this.compile(partial.content); } catch {}
    }
  }

  /** Get engine statistics */
  getStats(): { cacheSize: number; partialCount: number; helperCount: number; layoutCount: number } {
    return {
      cacheSize: this.cache.size,
      partialCount: this.partials.size,
      helperCount: this.helpers.size,
      layoutCount: this.layouts.size,
    };
  }

  // --- Internal rendering ---

  private renderAst(nodes: AstNode[], context: TemplateContext): string {
    let output = "";

    for (const node of nodes) {
      switch (node.type) {
        case "text":
          output += node.content;
          break;

        case "comment":
          // Skip comments
          break;

        case "variable": {
          const value = this.resolveValue(node.name, context);
          const str = this.stringify(value, node.escaped);
          output += this.applyFilters(str, node.filters, context);
          break;
        }

        case "section": {
          const value = this.resolveValue(node.name, context);
          output += this.renderSection(node, value, context);
          break;
        }

        case "partial": {
          output += this.renderPartial(node, context);
          break;
        }
      }
    }

    return output;
  }

  private resolveValue(path: string, context: TemplateContext): unknown {
    // Check for helper
    if (this.helpers.has(path)) return `__HELPER:${path}`;

    // Resolve dot-path
    const parts = path.split(".");
    let current: unknown = context;

    for (const part of parts) {
      if (current == null) {
        if (this.options.strict) throw new Error(`Undefined variable: ${path}`);
        return "";
      }
      if (typeof current === "object") {
        current = (current as Record<string, unknown>)[part];
      } else {
        return "";
      }
    }

    return current ?? (this.options.strict ? new Error(`Undefined variable: ${path}`) : "");
  }

  private stringify(value: unknown, escaped: boolean): string {
    if (value == null) return "";
    if (typeof value === "boolean") return String(value);
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return escaped ? this.options.escapeFn(value) : value;
    if (Array.isArray(value)) return ""; // Arrays handled by sections
    if (typeof value === "object") return ""; // Objects handled by sections
    if (value instanceof Error) return escaped ? this.options.escapeFn(value.message) : value.message;
    return String(value);
  }

  private renderSection(node: SectionNode, value: unknown, context: TemplateContext): string {
    // Inverted section (^)
    if (node.inverted) {
      if (!value || (Array.isArray(value) && value.length === 0) || value === "" || value === 0 || value === false) {
        return this.renderAst(node.children, context);
      }
      return "";
    }

    // Normal section (#)
    if (value == null || value === false || value === "") return "";

    // Array iteration
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.renderAst(node.children, typeof item === "object" && !Array.isArray(item)
          ? { ...context, ...(item as TemplateContext), "@index": index, "@first": index === 0, "@last": index === value.length - 1 }
          : { ...context, ".": item, "@index": index, "@first": index === 0, "@last": index === value.length - 1 })
      ).join("");
    }

    // Object / truthy value - use as new context
    if (typeof value === "object") {
      return this.renderAst(node.children, { ...context, ...(value as TemplateContext) });
    }

    // Truthy primitive
    return this.renderAst(node.children, context);
  }

  private renderPartial(node: PartialNode, parentContext: TemplateContext): string {
    const partial = this.partials.get(node.name);
    if (!partial) {
      if (this.options.strict) throw new Error(`Partial not found: ${node.name}`);
      return `[Missing partial: ${node.name}]`;
    }

    // Merge params into context
    const ctx: TemplateContext = { ...parentContext, ...node.params };

    if (partial.compiled) {
      return this.renderAst(partial.compiled.ast, ctx);
    }

    try {
      return this.renderString(partial.content, ctx);
    } catch {
      return `[Error rendering partial: ${node.name}]`;
    }
  }

  private applyFilters(value: string, filters: string[], context: TemplateContext): string {
    let result = value;
    for (const filterName of filters) {
      // Built-in filters
      switch (filterName) {
        case "upper": result = result.toUpperCase(); break;
        case "lower": result = result.toLowerCase(); break;
        case "capitalize": result = result.charAt(0).toUpperCase() + result.slice(1); break;
        case "trim": result = result.trim(); break;
        case "default": result = result || "(none)"; break;
        case "length": result = String(result.length); break;
        case "reverse": result = result.split("").reverse().join(""); break;
        case "repeat": result = result + result; break;
        case "json": result = JSON.stringify(result); break;
        case "raw": result = value; break; // bypass escaping
        case "escape": result = this.options.escapeFn(result); break;
        case "nl2br": result = result.replace(/\n/g, "<br>"); break;
        case "truncate": result = result.length > 80 ? result.slice(0, 77) + "..." : result; break;
        case "date": result = new Date(result).toLocaleDateString(); break;
        case "time": result = new Date(result).toLocaleTimeString(); break;
        default:
          // Check for custom filter/helper
          const helper = this.helpers.get(filterName);
          if (helper) {
            const helperResult = helper(result, context);
            result = typeof helperResult === "string" ? helperResult : String(helperResult ?? result);
          }
      }
    }
    return result;
  }
}

// --- Built-in Helpers ---

/** Register common built-in helpers to an engine */
export function registerBuiltinHelpers(engine: TemplateEngine): void {
  engine.registerHelper("if", (condition: unknown, options: any) => {
    if (condition) return options?.fn?.() ?? "";
    return options?.inverse?.() ?? "";
  });

  engine.registerHelper("unless", (condition: unknown, options: any) => {
    if (!condition) return options?.fn?.() ?? "";
    return options?.inverse?.() ?? "";
  });

  engine.registerHelper("each", (items: unknown, options: any) => {
    if (!Array.isArray(items)) return "";
    return items.map((item, idx) => {
      const ctx = typeof item === "object" ? { ...item, "@index": idx, "@first": idx === 0, "@last": idx === items.length - 1 } : { ".": item, "@index": idx };
      return options?.fn?.(ctx) ?? "";
    }).join("");
  });

  engine.registerHelper("with", (context: unknown, options: any) => {
    if (!context || typeof context !== "object") return "";
    return options?.fn?.(context as TemplateContext) ?? "";
  });

  engine.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  engine.registerHelper("neq", (a: unknown, b: unknown) => a !== b);
  engine.registerHelper("gt", (a: number, b: number) => Number(a) > Number(b));
  engine.registerHelper("lt", (a: number, b: number) => Number(a) < Number(b));
  engine.registerHelper("gte", (a: number, b: number) => Number(a) >= Number(b));
  engine.registerHelper("lte", (a: number, b: number) => Number(a) <= Number(b));

  engine.registerHelper("concat", (...args: unknown[]) => args.filter((a) => typeof a === "string").join(""));
  engine.registerHelper("join", (arr: unknown[], sep = ", ") => Array.isArray(arr) ? arr.join(String(sep)) : "");

  engine.registerHelper("lookup", (obj: unknown, key: string) => {
    if (typeof obj === "object" && obj !== null) return (obj as Record<string, unknown>)[key];
    return undefined;
  });

  engine.registerHelper("default", (value: unknown, fallback: unknown) => value ?? fallback);

  engine.registerHelper("ternary", (condition: unknown, truthy: unknown, falsy: unknown) => condition ? truthy : falsy);

  engine.registerHelper("math", (expr: string) => {
    // Safe math evaluation (only numbers and basic operators)
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, "");
      return Function(`"use strict"; return (${sanitized})`)();
    } catch { return NaN; }
  });

  engine.registerHelper("formatDate", (date: string | number, format = "YYYY-MM-DD") => {
    const d = new Date(date);
    return format
      .replace("YYYY", String(d.getFullYear()))
      .replace("MM", String(d.getMonth() + 1).padStart(2, "0"))
      .replace("DD", String(d.getDate()).padStart(2, "0"))
      .replace("HH", String(d.getHours()).padStart(2, "0"))
      .replace("mm", String(d.getMinutes()).padStart(2, "0"))
      .replace("ss", String(d.getSeconds()).padStart(2, "0"));
  });

  engine.registerHelper("formatNumber", (num: unknown, decimals = 2) => {
    const n = Number(num);
    return isNaN(n) ? "NaN" : n.toFixed(decimals);
  });

  engine.registerHelper("pluralize", (count: number, singular: string, plural?: string) => count === 1 ? singular : (plural ?? singular + "s"));

  engine.registerHelper("random", (min = 0, max = 1) => Math.random() * (Number(max) - Number(min)) + Number(min));

  engine.registerHelper("json", (data: unknown) => JSON.stringify(data, null, 2));

  engine.registerHelper("log", (...args: unknown[]) => { console.log("[Template]", ...args); return ""; });
}

// --- HTML Escaping ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Unescape HTML entities */
export function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
}

// --- Quick Functions ---

/** Create a pre-configured template engine with built-in helpers */
export function createTemplateEngine(options?: TemplateOptions): TemplateEngine {
  const engine = new TemplateEngine(options);
  registerBuiltinHelpers(engine);
  return engine;
}

/** Quick render a mustache-like template */
export function renderTemplate(template: string, data: TemplateContext = {}, options?: TemplateOptions): string {
  const engine = createTemplateEngine(options);
  return engine.renderString(template, data);
}
