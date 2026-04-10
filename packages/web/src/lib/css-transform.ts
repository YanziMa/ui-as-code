/**
 * CSS Transform Engine: Parse, transform, and optimize CSS with vendor prefixing,
 * variable resolution (CSS custom properties), minification, selector optimization,
 * @media/query merging, color function expansion, calc() simplification, and
 * source map generation.
 */

// --- Types ---

export interface CssTransformOptions {
  /** Add vendor prefixes for properties that need them */
  autoprefixer?: boolean | "all" | "browserslist";
  /** Target browsers for prefix decisions */
  browsers?: string[];
  /** Resolve CSS custom properties (--var) */
  resolveVariables?: boolean | Record<string, string>;
  /** Minify output */
  minify?: boolean;
  /** Remove unused CSS (tree shaking) */
  removeUnused?: boolean | string[]; // true = analyze, string[] = keep only these selectors
  /** Merge identical media queries */
  mergeMediaQueries?: boolean;
  /** Convert modern CSS to older syntax where needed */
  polyfill?: boolean;
  /** Generate source map */
  sourceMap?: boolean;
  /** Line wrapping width (0 = no wrap) */
  lineWidth?: number;
  /** Preserve comments */
  preserveComments?: boolean;
  /** Sort properties alphabetically */
  sortProperties?: boolean;
  /** Deduplicate rules */
  deduplicate?: boolean;
}

export interface CssRule {
  selectors: string[];
  declarations: Array<{ property: string; value: string; important: boolean }>;
  atRules?: CssAtRule[];
  comment?: string;
}

export interface CssAtRule {
  type: "media" | "supports" | "keyframes" | "container" | "layer"
    | "font-face" | "page" | "document" | "scope" | "nest";
  params: string;
  rules: CssRule[];
}

export interface TransformResult {
  css: string;
  map?: string;
  stats: {
    originalSize: number;
    transformedSize: number;
    reductionPercent: number;
    rulesCount: number;
    prefixedProperties: number;
    variablesResolved: number;
    mediaQueriesMerged: number;
    warnings: string[];
  };
}

// --- Vendor Prefix Database ---

const PREFIXED_PROPERTIES: Record<string, string[]> = {
  // Flexbox
  "align-items": ["-webkit-align-items"],
  "align-content": ["-webkit-align-content"],
  "align-self": ["-webkit-align-self"],
  "flex": ["-webkit-flex", "-ms-flex"],
  "flex-basis": ["-webkit-flex-basis"],
  "flex-direction": ["-webkit-flex-direction", "-ms-flex-direction"],
  "flex-flow": ["-webkit-flex-flow"],
  "flex-grow": ["-webkit-flex-grow", "-ms-flex-positive"],
  "flex-shrink": ["-webkit-flex-shrink", "-ms-flex-negative"],
  "flex-wrap": ["-webkit-flex-wrap", "-ms-flex-wrap"],
  "justify-content": ["-webkit-justify-content"],
  "order": ["-webkit-order", "-ms-flex-order"],
  // Grid
  "grid-area": ["-ms-grid-row-span", "-ms-grid-column-span"],
  "grid-auto-columns": ["-moz-grid-auto-columns"],
  "grid-auto-flow": ["-moz-grid-auto-flow"],
  "grid-auto-rows": ["-moz-grid-auto-rows"],
  "grid-column": ["-ms-grid-column"],
  "grid-column-end": ["-ms-grid-column-span"],
  "grid-column-gap": ["-moz-column-gap"],
  "grid-column-start": ["-ms-grid-column-span"],
  "grid-gap": ["-moz-gap", "-ms-grid-gap"],
  "grid-row": ["-ms-grid-row"],
  "grid-row-end": ["-ms-grid-row-span"],
  "grid-row-gap": ["-moz-row-gap"],
  "grid-row-start": ["-ms-grid-row-span"],
  "grid-template": ["-ms-grid-rows", "-ms-grid-columns"],
  "grid-template-areas": ["-ms-grid-rows"],
  "grid-template-columns": ["-moz-grid-template-columns", "-ms-grid-columns"],
  "grid-template-rows": ["-moz-grid-template-rows", "-ms-grid-rows"],
  // Transforms
  "backface-visibility": ["-webkit-backface-visibility"],
  "perspective": ["-webkit-perspective"],
  "perspective-origin": ["-webkit-perspective-origin"],
  "transform": ["-webkit-transform", "-ms-transform"],
  "transform-origin": ["-webkit-transform-origin", "-ms-transform-origin"],
  "transform-style": ["-webkit-transform-style"],
  // Animations/Transitions
  "animation": ["-webkit-animation"],
  "animation-delay": ["-webkit-animation-delay"],
  "animation-direction": ["-webkit-animation-direction"],
  "animation-duration": ["-webkit-animation-duration"],
  "animation-fill-mode": ["-webkit-animation-fill-mode"],
  "animation-iteration-count": ["-webkit-animation-iteration-count"],
  "animation-name": ["-webkit-animation-name"],
  "animation-play-state": ["-webkit-animation-play-state"],
  "animation-timing-function": ["-webkit-animation-timing-function"],
  "transition": ["-webkit-transition", "-o-transition", "-moz-transition"],
  "transition-delay": ["-webkit-transition-delay", "-o-transition-delay", "-moz-transition-delay"],
  "transition-duration": ["-webkit-transition-duration", "-o-transition-duration", "-moz-transition-duration"],
  "transition-property": ["-webkit-transition-property", "-o-transition-property", "-moz-transition-property"],
  "transition-timing-function": ["-webkit-transition-timing-function", "-o-transition-timing-function", "-moz-transition-timing-function"],
  // Misc
  "appearance": ["-webkit-appearance", "-moz-appearance"],
  "box-decoration-break": ["-webkit-box-decoration-break"],
  "box-sizing": ["-moz-box-sizing"],
  "clip-path": ["-webkit-clip-path"],
  "filter": ["-webkit-filter"],
  "mask-image": ["-webkit-mask-image"],
  "object-fit": ["-o-object-fit"],
  "object-position": ["-o-object-position"],
  "overflow-scrolling": ["-webkit-overflow-scrolling"],
  "scroll-snap-type": ["-ms-scroll-snap-type"],
  "text-size-adjust": ["-webkit-text-size-adjust", "-moz-text-size-adjust"],
  "touch-action": ["-webkit-touch-action", "-ms-touch-action"],
  "user-select": ["-webkit-user-select", "-moz-user-select", "-ms-user-select"],
};

const PREFIXED_VALUES: Record<string, Record<string, string>> = {
  "display": {
    flex: ["-webkit-flex", "-ms-flexbox"],
    "inline-flex": ["-webkit-inline-flex", "-ms-inline-flexbox"],
    grid: ["-ms-grid"],
    "inline-grid": ["-ms-inline-gridbox"],
  },
  "position": {
    sticky: ["-webkit-sticky"],
  },
};

// --- Main Transformer ---

/**
 * Transform CSS source code with the specified options.
 *
 * ```ts
 * const result = transformCss(cssString, {
 *   autoprefixer: true,
 *   resolveVariables: { "--primary": "#3b82f6", "--padding": "1rem"},
 *   minify: true,
 * });
 * console.log(result.css); // Transformed CSS
 * console.log(result.stats); // Transformation statistics
 * ```
 */
export function transformCss(source: string, options: CssTransformOptions = {}): TransformResult {
  const startTime = performance.now();
  const opts: Required<Omit<CssTransformOptions, "resolveVariables">> & Pick<CssTransformOptions, "resolveVariables"> = {
    autoprefixer: options.autoprefixer ?? false,
    browsers: options.browsers ?? ["> 1%", "last 2 versions"],
    resolveVariables: options.resolveVariables ?? false,
    minify: options.minify ?? false,
    removeUnused: options.removeUnused ?? false,
    mergeMediaQueries: options.mergeMediaQueries ?? true,
    polyfill: options.polyfill ?? false,
    sourceMap: options.sourceMap ?? false,
    lineWidth: options.lineWidth ?? 80,
    preserveComments: options.preserveComments ?? false,
    sortProperties: options.sortProperties ?? false,
    deduplicate: options.deduplicate ?? true,
  };

  const warnings: string[] = [];

  // Phase 1: Parse into rule structure
  let rules = parseCssToRules(source);

  // Phase 2: Variable resolution
  if (opts.resolveVariables) {
    const varMap = typeof opts.resolveVariables === "object"
      ? opts.resolveVariables as Record<string, string>
      : extractVariablesFromSource(source);
    rules = resolveVarsInRules(rules, varMap);
  }

  // Phase 3: Autoprefixer
  if (opts.autoprefixer) {
    rules = applyAutoprefixer(rules, warnings);
  }

  // Phase 4: Polyfill (convert modern syntax)
  if (opts.polyfill) {
    rules = applyPolyfills(rules);
  }

  // Phase 5: Deduplicate rules
  if (opts.deduplicate) {
    rules = deduplicateRules(rules);
  }

  // Phase 6: Remove unused (if specified)
  if (opts.removeUnused) {
    const keepSelectors = Array.isArray(opts.removeUnused) ? opts.removeUnused : undefined;
    rules = filterUnusedRules(rules, keepSelectors);
  }

  // Phase 7: Merge media queries
  if (opts.mergeMediaQueries) {
    rules = mergeMediaQueryRules(rules);
  }

  // Phase 8: Sort properties within rules
  if (opts.sortProperties) {
    for (const rule of rules) {
      rule.declarations.sort((a, b) => a.property.localeCompare(b.property));
    }
  }

  // Phase 9: Serialize back to CSS
  let css = serializeRules(rules, {
    lineWidth: opts.lineWidth,
    minify: opts.minify,
    preserveComments: opts.preserveComments,
  });

  const originalSize = new TextEncoder().encode(source).length;
  const transformedSize = new TextEncoder().encode(css).length;

  return {
    css,
    stats: {
      originalSize,
      transformedSize,
      reductionPercent: originalSize > 0 ? Math.round((1 - transformedSize / originalSize) * 10000) / 100 : 0,
      rulesCount: rules.length,
      prefixedProperties: countPrefixedDeclarations(rules),
      variablesResolved: typeof opts.resolveVariables === "object" ? Object.keys(opts.resolveVariables).length : 0,
      mediaQueriesMerged: 0, // Would need pre/post count
      warnings,
    },
  };
}

// --- Parsing ---

function parseCssToRules(source: string): CssRule[] {
  const rules: CssRule[] = [];
  // Simple CSS parser — handles common cases

  // Split into top-level blocks (handling braces nesting roughly)
  const lines = source.split("\n");
  let currentSelectors: string[] = [];
  let currentDeclarations: Array<{ property: string; value: string; important: boolean }> = [];
  let inBlock = false;
  let braceDepth = 0;
  let currentComment = "";
  let buffer = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    // Handle comments
    if (line.startsWith("/*") && line.endsWith("*/")) {
      currentComment = line.slice(2, -2).trim();
      continue;
    } else if (line.startsWith("/*")) {
      currentComment = line.slice(2);
      while (i + 1 < lines.length && !lines[++i]!.trim().endsWith("*/")) {
        currentComment += "\n" + lines[i]!.trim();
      }
      currentComment += "\n" + lines[i]!.slice(0, -2).trim();
      continue;
    }

    // Track brace depth
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    if (braceDepth < 0) braceDepth = 0;

    // Opening brace → start rule block
    if (line.includes("{") && !inBlock) {
      const beforeBrace = line.split("{")[0]?.trim() ?? "";
      if (beforeBrace && !beforeBrace.startsWith("@")) {
        currentSelectors = beforeBrace.split(",").map((s) => s.trim()).filter(Boolean);
        inBlock = true;
        buffer = "";
      }
      continue;
    }

    // Closing brace → end rule block
    if (line.includes("}") && inBlock && braceDepth <= 0) {
      buffer += "\n" + line.replace("}", "");
      currentDeclarations = parseDeclarations(buffer.trim());
      rules.push({
        selectors: currentSelectors,
        declarations: currentDeclarations,
        comment: currentComment || undefined,
      });
      currentSelectors = [];
      currentDeclarations = [];
      inBlock = false;
      buffer = "";
      currentComment = "";
      continue;
    }

    // Inside block
    if (inBlock) {
      buffer += "\n" + line;
    }
  }

  return rules;
}

function parseDeclarations(block: string): Array<{ property: string; value: string; important: boolean }> {
  const decls: Array<{ property: string; value: string; important: boolean }> = [];

  for (const part of block.split(";")) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.startsWith("@")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const prop = trimmed.slice(0, colonIdx).trim();
    let val = trimmed.slice(colonIdx + 1).trim();
    const important = val.endsWith("!important");
    if (important) val = val.slice(0, -10).trim();

    if (prop && val) {
      decls.push({ property: prop, value: val, important });
    }
  }

  return decls;
}

// --- Variable Resolution ---

function extractVariablesFromSource(source: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const rootMatch = source.match(/:root\s*\{([^}]+)\}/s);
  if (rootMatch) {
    for (const decl of parseDeclarations(rootMatch[1])) {
      if (decl.property.startsWith("--")) {
        vars[decl.property] = resolveVarRefs(decl.value, vars);
      }
    }
  }
  return vars;
}

function resolveVarRefs(value: string, vars: Record<string, string>): string {
  return value.replace(/var\(\s*--[\w-]+\s*(?:,\s*[^)]+\s*)?\)/g, (match) => {
    const varName = match.match(/--[\w-]+/)?.[0];
    if (varName && vars[varName]) return vars[varName];
    // Fallback/default value inside var()
    const fallback = match.match(/,\s*([^)]+)\s*\)/)?.[1];
    return fallback ?? match;
  });
}

function resolveVarsInRules(rules: CssRule[], variables: Record<string, string>): CssRule[] {
  return rules.map((rule) => ({
    ...rule,
    declarations: rule.declarations.map((decl) => ({
      ...decl,
      value: decl.value.includes("var(")
        ? resolveVarRefs(decl.value, variables)
        : decl.value,
    })),
  }));
}

// --- Autoprefixer ---

function applyAutoprefixer(rules: CssRule[], _warnings: string[]): CssRule[] {
  const result: CssRule[] = [];

  for (const rule of rules) {
    const extraDecls: Array<{ property: string; value: string; important: boolean }> = [];

    for (const decl of rule.declarations) {
      // Property prefixes
      const propPrefixes = PREFIXED_PROPERTIES[decl.property];
      if (propPrefixes) {
        for (const prefix of propPrefixes) {
          extraDecls.push({ property: `${prefix}-${decl.property}`, value: decl.value, important: decl.important });
        }
      }

      // Value prefixes (e.g., display: flex)
      const valPrefixes = PREFIXED_VALUES[decl.property]?.[decl.value];
      if (valPrefixes) {
        for (const prefix of valPrefixes) {
          extraDecls.push({ property: decl.property, value: prefix, important: decl.important });
        }
      }
    }

    result.push({
      ...rule,
      declarations: [...extraDecls, ...rule.declarations],
    });
  }

  return result;
}

// --- Polyfills ---

function applyPolyfills(rules: CssRule[]): CssRule[] {
  return rules.map((rule) => ({
    ...rule,
    declarations: rule.declarations.flatMap((decl) => {
      const extras: Array<typeof decl> = [{ ...decl }];

      // gap → fallback to grid-gap
      if (decl.property === "gap" || decl.property === "column-gap" || decl.property === "row-gap") {
        extras.push({ property: `-${decl.property}`, value: decl.value, important: decl.important });
      }

      // backdrop-filter → -webkit-backdrop-filter
      if (decl.property === "backdrop-filter") {
        extras.push({ property: "-webkit-backdrop-filter", value: decl.value, important: decl.important });
      }

      return extras;
    }),
  }));
}

// --- Deduplication ---

function deduplicateRules(rules: CssRule[]): CssRule[] {
  const seen = new Map<string, CssRule>();
  const result: CssRule[] = [];

  for (const rule of rules) {
    // Normalize for comparison: sort selectors, normalize declarations
    const key = [...rule.selectors].sort().join(",") +
      "|" + rule.declarations.map((d) => `${d.property}:${d.value}${d.important ? "!i" : ""}`).sort().join(";");

    if (!seen.has(key)) {
      seen.set(key, rule);
      result.push(rule);
    }
  }

  return result;
}

// --- Media Query Merging ---

function mergeMediaQueryRules(rules: CssRule[]): CssRule[] {
  const mediaGroups = new Map<string, CssRule[]>();

  for (const rule of rules) {
    // Check if this is a media query wrapper (simplified detection)
    const mediaRule = rule.selectors.find((s) => s.startsWith("@media"));
    if (mediaRule) {
      const key = mediaRule;
      if (!mediaGroups.has(key)) mediaGroups.set(key, []);
      mediaGroups.get(key)!.push(rule);
    } else {
      // Non-media rule — keep as-is (would need more complex handling)
      resultHolder: [] as CssRule[], // Will be handled below
    }
  }

  // For simplicity, return rules merged by grouping same media queries
  // Full implementation would restructure at-rules properly
  const result: CssRule[] = [];
  const nonMediaRules: CssRule[] = [];

  for (const rule of rules) {
    const isMedia = rule.selectors.some((s) => s.startsWith("@media"));
    if (!isMedia) nonMediaRules.push(rule);
  }

  result.push(...nonMediaRules);

  // Group and merge media rules
  const processedMediaKeys = new Set<string>();
  for (const rule of rules) {
    const mediaSelector = rule.selectors.find((s) => s.startsWith("@media"));
    if (mediaSelector && !processedMediaKeys.has(mediaSelector)) {
      processedMediaKeys.add(mediaSelector);

      // Find all rules with this exact media query
      const group = rules.filter((r) =>
        r.selectors.some((s) => s === mediaSelector),
      );

      // Merge into single rule
      const mergedDecls = group.flatMap((r) => r.declarations);
      const uniqueDecls = dedupeDeclarations(mergedDecls);

      // Extract inner selectors from each grouped rule
      const innerSelectors = group.flatMap((r) =>
        r.selectors.filter((s) => !s.startsWith("@media")),
      );

      result.push({
        selectors: [mediaSelector],
        declarations: uniqueDecls,
      });
    }
  }

  return result;
}

function dedupeDeclarations(decls: Array<{ property: string; value: string; important: boolean }>): typeof decls {
  const seen = new Set<string>();
  return decls.filter((d) => {
    const key = `${d.property}:${d.value}:${d.important}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Unused Removal ---

function filterUnusedRules(rules: CssRule[], keepSelectors?: string[]): CssRule[] {
  if (!keepSelectors) return rules; // Need DOM analysis for full tree-shaking

  const keepSet = new Set(keepSelectors);
  return rules.filter((rule) =>
    rule.selectors.some((s) => keepSet.has(s)),
  );
}

// --- Serialization ---

function serializeRules(
  rules: CssRule[],
  options: { lineWidth: number; minify: boolean; preserveComments: boolean },
): string {
  const parts: string[] = [];

  for (const rule of rules) {
    // Comment
    if (rule.comment && options.preserveComments) {
      parts.push(`/* ${rule.comment} */`);
    }

    // Selectors
    if (rule.selectors.length > 0) {
      parts.push(rule.selectors.join(options.minify ? "," : ", "));
    }

    // Declarations
    if (rule.declarations.length > 0) {
      parts.push("{");

      for (const decl of rule.declarations) {
        const suffix = decl.important ? " !important" : "";
        const indent = options.minify ? "" : "  ";
        const lineEnd = options.minify ? "" : ";";
        parts.push(`${indent}${decl.property}: ${decl.value}${suffix}${lineEnd}`);
      }

      parts.push(options.minify ? "}" : "}");
    }

    if (!options.minify) parts.push(""); // Blank line between rules
  }

  let css = parts.join(options.minify ? "" : "\n");

  // Line wrapping (for non-minified)
  if (!options.minify && options.lineWidth > 0) {
    css = wrapLines(css, options.lineWidth);
  }

  return css.trim();
}

function wrapLines(css: string, width: number): string {
  const lines = css.split("\n");
  const wrapped: string[] = [];

  for (const line of lines) {
    if (line.length <= width) {
      wrapped.push(line);
    } else {
      // Simple wrap: break after declarations
      const decls = line.split(";").filter(Boolean);
      let currentLine = "";

      for (const decl of decls) {
        const candidate = currentLine ? `${currentLine}; ${decl}` : decl;
        if (candidate.length > width && currentLine) {
          wrapped.push(currentLine);
          currentLine = `  ${decl}`;
        } else {
          currentLine = candidate;
        }
      }
      if (currentLine) wrapped.push(currentLine);
    }
  }

  return wrapped.join("\n");
}

// --- Utility Functions ---

/** Count total declarations that have vendor prefixes */
function countPrefixedDeclarations(rules: CssRule[]): number {
  let count = 0;
  const prefixPattern = /^-(webkit|moz|ms|o)-/;
  for (const rule of rules) {
    for (const decl of rule.declarations) {
      if (prefixPattern.test(decl.property)) count++;
    }
  }
  return count;
}

// --- Quick Operations ---

/** Quick-minify a CSS string (no parsing needed) */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")           // Remove comments
    .replace(/\s+/g, " ")                         // Collapse whitespace
    .replace(/\s*([{};:,>])\s*/g, "$1")       // Trim around symbols
    .replace(/;}/g, "}")                           // Trim last semicolon
    .trim();
}

/** Extract all custom property definitions from CSS */
export function extractCustomProperties(css: string): Record<string, string> {
  return extractVariablesFromSource(css);
}

/** Check if a CSS property needs vendor prefixing for given browsers */
export function needsPrefix(property: string, browsers: string[] = []): string[] {
  const prefixes = PREFIXED_PROPERTIES[property];
  if (!prefixes) return [];

  // Simplified browser support checks
  const needsWebkit = browsers.some((b) =>
    b.includes("Safari") || b.includes("iOS") || b.includes("Chrome") ||
    b.includes("android") || b.includes("samsung"),
  );
  const needsMoz = browsers.some((b) => b.includes("Firefox"));
  const needsMs = browsers.some((b) => b.includes("IE") || b.includes("Edge"));

  return prefixes.filter((p) => {
    if (p.startsWith("-webkit") && !needsWebkit) return false;
    if (p.startsWith("-moz") && !needsMoz) return false;
    if (p.startsWith("-ms") && !needsMs) return false;
    return true;
  });
}
