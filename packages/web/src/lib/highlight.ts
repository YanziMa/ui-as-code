/**
 * Highlight Utilities: Text highlighting for search matches, syntax
 * highlighting patterns, mark wrapping, range-based highlighting,
 * case-insensitive matching, diacritic-aware matching, and
 * highlight management with lifecycle hooks.
 */

// --- Types ---

export type HighlightMatchStrategy = "exact" | "word" | "prefix" | "regex" | "fuzzy";
export type HighlightTag = "mark" | "span" | "em" | "strong";

export interface HighlightOptions {
  /** Text or HTML source to highlight within */
  source: string | HTMLElement;
  /** Query term(s) to highlight */
  query: string | string[];
  /** Matching strategy */
  strategy?: HighlightMatchStrategy;
  /** HTML tag to use for highlights */
  tag?: HighlightTag;
  /** CSS class name for highlight marks */
  className?: string;
  /** Inline styles for marks */
  style?: string;
  /** Case-insensitive matching */
  caseInsensitive?: boolean;
  /** Maximum number of matches (0 = unlimited) */
  maxMatches?: number;
  /** Split words by whitespace for word strategy */
  splitWords?: boolean;
  /** Diacritic-insensitive (é == e) */
  diacriticsInsensitive?: boolean;
  /** Custom match transformer */
  transformMatch?: (match: string) => string;
  /** Called for each match found */
  onMatch?: (match: string, index: number) => void;
  /** Sanitize HTML before processing */
  sanitize?: boolean;
}

export interface HighlightResult {
  /** Element with highlights applied (or original if source was string) */
  result: HTMLElement | string;
  /** Total matches found */
  matchCount: number;
  /** Matched strings */
  matches: string[];
  /** Ranges of matches [start, end] */
  ranges: Array<[number, number]>;
}

export interface HighlightRange {
  /** Start offset */
  start: number;
  /** End offset */
  end: number;
  /** Matched text */
  text: string;
  /** Optional metadata */
  data?: unknown;
}

export interface MultiHighlightOptions {
  /** Source text or element */
  source: string | HTMLElement;
  /** Multiple highlight rules */
  rules: Array<{
    query: string | RegExp;
    className?: string;
    style?: string;
    tag?: HighlightTag;
    priority?: number;
  }>;
  /** Case insensitive default */
  caseInsensitive?: boolean;
  /** Overlapping match behavior ("first" | "merge" | "all") */
  overlapMode?: "first" | "merge" | "all";
}

export interface HighlightManagerOptions {
  /** Root element to manage highlights within */
  root: HTMLElement;
  /** Default CSS class */
  defaultClass?: string;
  /** Default tag */
  defaultTag?: HighlightTag;
  /** Animate highlights on add/remove */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Auto-remove highlights after ms (0 = persistent) */
  autoRemoveMs?: number;
  /** Called when highlights change */
  onChange?: (ranges: HighlightRange[]) => void;
}

export interface HighlightManagerInstance {
  /** Add highlights */
  highlight: (query: string, options?: Partial<HighlightOptions>) => HighlightResult;
  /** Remove all highlights */
  clear: () => void;
  /** Remove highlights by class name */
  clearByClass: (className: string) => void;
  /** Get current highlight ranges */
  getRanges: () => HighlightRange[];
  /** Get total match count */
  getCount: () => number;
  /** Scroll to next/previous highlight */
  navigateNext: () => HTMLElement | null;
  navigatePrev: () => HTMLElement | null;
  /** Jump to specific index */
  navigateTo: (index: number) => HTMLElement | null;
  /** Get currently highlighted elements */
  getElements: () => HTMLElement[];
  /** Destroy manager */
  destroy: () => void;
}

// --- Diacritics Helpers ---

const DIACRITICS_MAP: Record<string, string> = {
  '\u00C0': 'A', '\u00C1': 'A', '\u00C2': 'A', '\u00C3': 'A', '\u00C4': 'A', '\u00C5': 'A',
  '\u00E0': 'a', '\u00E1': 'a', '\u00E2': 'a', '\u00E3': 'a', '\u00E4': 'a', '\u00E5': 'a',
  '\u00C7': 'C', '\u00E7': 'c',
  '\u00D0': 'D', '\u0110': 'D',
  '\u00D1': 'N', '\u00F1': 'n',
  '\u00D2': 'O', '\u00D3': 'O', '\u00D4': 'O', '\u00D5': 'O', '\u00D6': 'O', '\u00D8': 'O',
  \u00F2': 'o', '\u00F3': 'o', '\u00F4': 'o', '\u00F5': 'o', '\u00F6': 'o', '\u00F8': 'o',
  '\u00D9': 'U', '\u00DA': 'U', '\u00DB': 'U', '\u00DC': 'U',
  '\u00F9': 'u', '\u00FA': 'u', '\u00FB': 'u', '\u00FC': 'u',
  '\u00DD': 'Y', '\u00FD': 'y', '\u00FF': 'y',
  '\u00DF': 'ss',
  '\u00E6': 'ae', '\u00C6': 'AE', '\u0153': 'oe', '\u0152': 'OE',
};

function _stripDiacritics(str: string): string {
  return str.replace(/[^\u0000-\u007E]/g, (ch) => DIACRITICS_MAP[ch] ?? ch);
}

function _normalize(str: string, caseIns: boolean, diacIns: boolean): string {
  let result = str;
  if (diacIns) result = _stripDiacritics(result);
  if (caseIns) result = result.toLowerCase();
  return result;
}

// --- Core: Single Highlight ---

/**
 * Highlight text matches within a string or element.
 *
 * @example
 * ```ts
 * const result = highlightText({
 *   source: "Hello World, welcome to the world!",
 *   query: "world",
 *   caseInsensitive: true,
 * });
 * // result.result = "Hello <mark>World</>, welcome to the <mark>world</>!"
 * // result.matchCount = 2
 * ```
 */
export function highlightText(options: HighlightOptions): HighlightResult {
  const {
    source,
    query,
    strategy = "exact",
    tag = "mark",
    className = "highlight-match",
    style,
    caseInsensitive = false,
    maxMatches = 0,
    splitWords = true,
    diacriticsInsensitive = false,
    transformMatch,
    onMatch,
    sanitize = true,
  } = options;

  const queries = Array.isArray(query) ? query : [query];
  const ranges: Array<[number, number]> = [];
  const matches: string[] = [];

  // Get plain text
  let text: string;
  let isElement = false;
  if (typeof source === "string") {
    text = sanitize ? _sanitizeHTML(source) : source;
  } else {
    isElement = true;
    text = source.textContent ?? "";
  }

  const normalizedText = _normalize(text, caseInsensitive, diacriticsInsensitive);

  // Find all match ranges
  for (const q of queries) {
    if (!q) continue;

    const qNormalized = _normalize(q, caseInsensitive, diacriticsInsensitive);
    const localRanges = _findMatches(normalizedText, qNormalized, strategy, splitWords);

    for (const [start, end] of localRanges) {
      if (maxMatches > 0 && ranges.length >= maxMatches) break;
      // Check overlap with existing ranges
      const overlaps = ranges.some(([rs, re]) => start < re && end > rs);
      if (!overlaps) {
        ranges.push([start, end]);
        matches.push(text.slice(start, end));
        onMatch?.(text.slice(start, end), ranges.length - 1);
      }
    }
  }

  // Sort ranges by position
  ranges.sort((a, b) => a[0] - b[0]);

  // Build highlighted output
  let result: HTMLElement | string;
  if (ranges.length === 0) {
    result = isElement ? source : text;
  } else {
    const html = _applyHighlights(text, ranges, tag, className, style, transformMatch);
    if (isElement) {
      result = source.cloneNode(true) as HTMLElement;
      result.innerHTML = html;
    } else {
      result = html;
    }
  }

  return { result, matchCount: ranges.length, matches, ranges };
}

// --- Core: Multi-Rule Highlight ---

/**
 * Apply multiple highlighting rules simultaneously.
 */
export function highlightMulti(options: MultiHighlightOptions): HighlightResult {
  const { source, rules, caseInsensitive = false, overlapMode = "first" } = options;

  let text: string;
  if (typeof source === "string") {
    text = source;
  } else {
    text = source.textContent ?? "";
  }

  const normalizedText = _normalize(text, caseInsensitive, false);
  const allRanges: Array<{ range: [number, number]; ruleIndex: number }> = [];

  rules.forEach((rule, ri) => {
    const q = typeof rule.query === "string" ? rule.query : rule.query.source;
    if (!q) return;

    const qNorm = _normalize(typeof rule.query === "string" ? rule.query : q, caseInsensitive, false);
    const strat: HighlightMatchStrategy = rule.query instanceof RegExp ? "regex" : "exact";
    const found = _findMatches(normalizedText, qNorm, strat, true);

    for (const r of found) {
      allRanges.push({ range: r, ruleIndex: ri });
    }
  });

  // Sort by position, then by priority
  allRanges.sort((a, b) => {
    if (a.range[0] !== b.range[0]) return a.range[0] - b.range[0];
    const pa = rules[a.ruleIndex].priority ?? 0;
    const pb = rules[b.ruleIndex].priority ?? 0;
    return pb - pa;
  });

  // Handle overlaps
  const finalRanges: Array<[number, number, number]> = []; // [start, end, ruleIndex]
  for (const { range: [start, end], ruleIndex } of allRanges) {
    if (overlapMode === "first") {
      const conflicts = finalRanges.some(([rs, re]) => start < re && end > rs);
      if (!conflicts) finalRanges.push([start, end, ruleIndex]);
    } else if (overlapMode === "merge") {
      // Merge overlapping ranges
      let merged = false;
      for (let i = 0; i < finalRanges.length; i++) {
        const [rs, re, ri] = finalRanges[i];
        if (start < re && end > rs) {
          finalRanges[i] = [Math.min(rs, start), Math.max(re, end), ri];
          merged = true;
          break;
        }
      }
      if (!merged) finalRanges.push([start, end, ruleIndex]);
    } else {
      finalRanges.push([start, end, ruleIndex]);
    }
  }

  // Build output
  if (finalRanges.length === 0) {
    return { result: typeof source === "string" ? text : source, matchCount: 0, matches: [], ranges: [] };
  }

  let lastIndex = 0;
  const parts: string[] = [];

  for (const [start, end, ruleIndex] of finalRanges) {
    if (start > lastIndex) parts.push(_escapeHTML(text.slice(lastIndex, start)));

    const rule = rules[ruleIndex];
    const matched = text.slice(start, end);
    const tag = rule.tag ?? "mark";
    const cls = rule.className ?? "";
    const stl = rule.style ?? "";
    parts.push(`<${tag}${cls ? ` class="${cls}"` : ""}${stl ? ` style="${stl}"` : ""}>${_escapeHTML(matched)}</${tag}>`);
    lastIndex = end;
  }

  if (lastIndex < text.length) parts.push(_escapeHTML(text.slice(lastIndex)));

  const html = parts.join("");
  const isEl = typeof source !== "string";
  const result: HTMLElement | string = isEl
    ? (() => { const el = source.cloneNode(true) as HTMLElement; el.innerHTML = html; return el; })()
    : html;

  return {
    result,
    matchCount: finalRanges.length,
    matches: finalRanges.map(([s, e]) => text.slice(s, e)),
    ranges: finalRanges.map(([s, e]) => [s, e]),
  };
}

// --- Highlight Manager ---

/**
 * Create a managed highlighting instance for an element.
 *
 * @example
 * ```ts
 * const mgr = createHighlightManager({ root: document.getElementById("content")! });
 * mgr.highlight("search term");
 * mgr.navigateNext(); // scrolls to next match
 * ```
 */
export function createHighlightManager(options: HighlightManagerOptions): HighlightManagerInstance {
  const {
    root,
    defaultClass = "highlight-match",
    defaultTag = "mark",
    animate = false,
    animationDuration = 300,
    autoRemoveMs = 0,
    onChange,
  } = options;

  let _ranges: HighlightRange[] = [];
  let _navIndex = -1;
  let _elements: HTMLElement[] = [];
  let _timers: ReturnType<typeof setTimeout>[] = [];

  function highlight(query: string, opts?: Partial<HighlightOptions>): HighlightResult {
    clear();

    const result = highlightText({
      source: root,
      query,
      className: opts?.className ?? defaultClass,
      tag: opts?.tag ?? defaultTag,
      style: opts?.style,
      caseInsensitive: opts?.caseInsensitive ?? true,
      strategy: opts?.strategy ?? "exact",
      maxMatches: opts?.maxMatches ?? 0,
      diacriticsInsensitive: opts?.diacriticsInsensitive ?? true,
    });

    if (result.matchCount > 0) {
      root.innerHTML = (result.result as HTMLElement).innerHTML;
      _ranges = result.ranges.map(([s, e], i) => ({ start: s, end: e, text: result.matches[i] }));
      _elements = Array.from(root.querySelectorAll(`${defaultTag}.${defaultClass}`)) as HTMLElement[];

      if (animate) {
        _elements.forEach((el) => {
          el.style.transition = `background-color ${animationDuration}ms ease`;
          el.style.backgroundColor = "rgba(255,235,59,0.4)";
          setTimeout(() => { el.style.backgroundColor = ""; }, animationDuration);
        });
      }

      if (autoRemoveMs > 0) {
        const timer = setTimeout(clear, autoRemoveMs);
        _timers.push(timer);
      }

      onChange?.(_ranges);
    }

    return result;
  }

  function clear(): void {
    _timers.forEach((t) => clearTimeout(t));
    _timers = [];
    _ranges = [];
    _elements = [];
    _navIndex = -1;
  }

  function clearByClass(className: string): void {
    root.querySelectorAll(`.${className}`).forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent ?? ""), el);
        parent.normalize();
      }
    });
    _refreshElements();
  }

  function _refreshElements(): void {
    _elements = Array.from(root.querySelectorAll(`${defaultTag}.${defaultClass}`)) as HTMLElement[];
    _ranges = _ranges.filter((r) => {
      return _elements.some((el) => el.textContent?.includes(r.text));
    });
  }

  function getRanges(): HighlightRange[] { return [..._ranges]; }
  function getCount(): number { return _elements.length; }
  function getElements(): HTMLElement[] { return [..._elements]; }

  function _scrollTo(el: HTMLElement): HTMLElement {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Flash active
    _elements.forEach((e) => e.classList.remove("highlight-active"));
    el.classList.add("highlight-active");
    return el;
  }

  function navigateNext(): HTMLElement | null {
    if (_elements.length === 0) return null;
    _navIndex = (_navIndex + 1) % _elements.length;
    return _scrollTo(_elements[_navIndex]);
  }

  function navigatePrev(): HTMLElement | null {
    if (_elements.length === 0) return null;
    _navIndex = (_navIndex - 1 + _elements.length) % _elements.length;
    return _scrollTo(_elements[_navIndex]);
  }

  function navigateTo(index: number): HTMLElement | null {
    if (index < 0 || index >= _elements.length) return null;
    _navIndex = index;
    return _scrollTo(_elements[_navIndex]);
  }

  function destroy(): void {
    clear();
    // Inject minimal CSS cleanup
    const style = root.querySelector("style[data-highlight-manager]");
    style?.remove();
  }

  return { highlight, clear, clearByClass, getRanges, getCount, navigateNext, navigatePrev, navigateTo, getElements, destroy };
}

// --- Internal Helpers ---

function _findMatches(
  text: string,
  query: string,
  strategy: HighlightMatchStrategy,
  splitWords: boolean,
): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  switch (strategy) {
    case "exact": {
      let idx = 0;
      while ((idx = text.indexOf(query, idx)) !== -1) {
        ranges.push([idx, idx + query.length]);
        idx += query.length;
      }
      break;
    }

    case "word": {
      const words = splitWords ? query.split(/\s+/).filter(Boolean) : [query];
      const wordPattern = new RegExp(`(?:^|\\W)(${_escapeRegex(words.join("|"))})(?:\\W|$)`, "g");
      let m: RegExpExecArray | null;
      while ((m = wordPattern.exec(text)) !== null) {
        ranges.push([m.index, m.index + m[0].length]);
      }
      break;
    }

    case "prefix": {
      let idx = 0;
      while ((idx = text.indexOf(query, idx)) !== -1) {
        // Ensure it's at word start
        const prevChar = idx > 0 ? text[idx - 1] : " ";
        if (!/\w/.test(prevChar) || idx === 0) {
          ranges.push([idx, idx + query.length]);
        }
        idx += query.length;
      }
      break;
    }

    case "regex": {
      try {
        const regex = new RegExp(query, "g");
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
          ranges.push([m.index, m.index + m[0].length]);
        }
      } catch {
        // Invalid regex, fall back to exact
        let idx = 0;
        while ((idx = text.indexOf(query, idx)) !== -1) {
          ranges.push([idx, idx + query.length]);
          idx += query.length;
        }
      }
      break;
    }

    case "fuzzy": {
      ranges.push(..._fuzzyFind(text, query));
      break;
    }
  }

  return ranges;
}

function _fuzzyFind(text: string, pattern: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const patLen = pattern.length;

  if (patLen === 0) return ranges;

  // Simple fuzzy: find each char sequentially with gaps allowed
  for (let i = 0; i <= text.length - patLen; i++) {
    let pi = 0;
    let ti = i;
    while (pi < patLen && ti < text.length) {
      if (text[ti] === pattern[pi]) pi++;
      ti++;
    }
    if (pi === patLen) {
      ranges.push([i, ti - 1]); // Approximate range
    }
  }

  return ranges;
}

function _applyHighlights(
  text: string,
  ranges: Array<[number, number]>,
  tag: HighlightTag,
  className: string,
  style: string | undefined,
  transformMatch: ((match: string) => string) | undefined,
): string {
  let lastIndex = 0;
  const parts: string[] = [];

  for (const [start, end] of ranges) {
    if (start > lastIndex) parts.push(_escapeHTML(text.slice(lastIndex, start)));

    const raw = text.slice(start, end);
    const displayed = transformMatch ? transformMatch(raw) : _escapeHTML(raw);
    const attrs = [
      className ? `class="${className}"` : "",
      style ? `style="${style}"` : "",
    ].filter(Boolean).join(" ");

    parts.push(`<${tag}${attrs ? ` ${attrs}` : ""}>${displayed}</${tag}>`);
    lastIndex = end;
  }

  if (lastIndex < text.length) parts.push(_escapeHTML(text.slice(lastIndex)));

  return parts.join("");
}

function _escapeHTML(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function _escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function _sanitizeHTML(html: string): string {
  const tmp = document.createElement("div");
  tmp.textContent = html;
  return tmp.innerHTML;
}
