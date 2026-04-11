/**
 * Fuzzy Search Engine: High-performance fuzzy string matching with scoring,
 * ranking, highlighting, multi-field search, diacritic folding,
 * custom scoring functions, and batch processing.
 */

// --- Types ---

export interface FuzzyResult<T = unknown> {
  /** The matched item */
  item: T;
  /** Match score (higher = better) */
  score: number;
  /** Matched ranges in the item's text (for highlighting) */
  matches: Array<{ start: number; end: number }>;
  /** The text that was matched against */
  text: string;
}

export interface FuzzyOptions {
  /** Case sensitive? (default: false) */
  caseSensitive?: boolean;
  /** Include diacritics-insensitive matching? (default: true) */
  diacriticsInsensitive?: boolean;
  /** Require all query characters to match? (default: true) */
  requireAllChars?: boolean;
  /** Weight for exact/prefix matches vs scattered matches */
  consecutiveBonus?: number;
  /** Weight for word-boundary matches */
  boundaryBonus?: number;
  /** Minimum score threshold (default: 0) */
  minScore?: number;
  /** Maximum results to return (default: Infinity) */
  maxResults?: number;
  /** Custom key extraction function (for object items) */
  keyFn?: (item: unknown) => string;
  /** Custom multi-key extraction (searches across multiple fields) */
  keys?: string[];
  /** Custom scoring function (overrides built-in) */
  scorer?: (query: string, text: string) => number;
  /** Whether to compute highlight ranges */
  computeMatches?: boolean;
}

export interface FuzzySearchInstance<T = unknown> {
  /** Search through items */
  search(query: string, items: T[]): FuzzyResult<T>[];
  /** Search a single string */
  test(query: string, text: string): FuzzyResult<string> | null;
  /** Highlight matches in HTML */
  highlight(text: string, matches: Array<{ start: number; end: number }>, tag?: string): string;
  /** Set options */
  setOptions(options: Partial<FuzzyOptions>): void;
  /** Get current options */
  getOptions(): FuzzyOptions;
}

// --- Diacritics Map ---

const DIACRITICS_MAP: Record<string, string> = {
  a: "àáâãäåāăąǎǟ", A: "ÀÁÂÃÄÅĀĂĄǍ",
  e: "èéêëēěėęě", E: "ÈÉÊËĒĖĘĚ",
  i: "ìíîïīĭįǐ", I: "ÌÍÎÏĪĬİ",
  o: "òóôõöøōőŏơ", O: "ÒÓÔÕÖØŌŎŐ",
  u: "ùúûüūůűưũ", U: "ÙÚÛÜŪŰŮ",
  c: "çčć", C: "ÇČĆ",
  n: "ñňń", N: "ÑŇŃ",
  s: "šśş", S: "ŠŚŞ",
  z: "žźż", Z: "ŹŻŽ",
  y: "ýÿŷ", Y: "ÝŶŸ",
};

/** Build reverse map: accented char -> base char */
const ACCENT_TO_BASE = new Map<string, string>();
for (const [base, accents] of Object.entries(DIACRITICS_MAP)) {
  for (const ch of accents) ACCENT_TO_BASE.set(ch, base);
}

// --- Core Algorithm ---

function foldDiacritics(str: string): string {
  let result = "";
  for (const ch of str) {
    result += ACCENT_TO_BASE.get(ch) ?? ch;
  }
  return result;
}

function computeMatchRanges(
  queryFolded: string,
  textFolded: string,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let qi = 0;

  for (let ti = 0; ti < textFolded.length && qi < queryFolded.length; ti++) {
    if (textFolded[ti] === queryFolded[qi]) {
      if (ranges.length > 0 && ranges[ranges.length - 1]!.end === ti) {
        // Extend previous range
        ranges[ranges.length - 1]!.end = ti + 1;
      } else {
        ranges.push({ start: ti, end: ti + 1 });
      }
      qi++;
    }
  }

  return ranges;
}

function defaultScore(queryFolded: string, textFolded: string): number {
  if (!queryFolded || !textFolded) return 0;
  if (queryFolded === textFolded) return 1000; // Exact match

  let score = 0;
  const qlen = queryFolded.length;
  const tlen = textFolded.length;

  // Exact title match bonus
  if (tlen === qlen) score += 500;
  else if (textFolded.startsWith(queryFolded)) score += 400;
  else if (textFolded.includes(queryFolded)) score += 200;

  // Character-by-character scoring
  let qi = 0;
  let consecutive = 0;
  let lastGap = false;

  for (let ti = 0; ti < tlen && qi < qlen; ti++) {
    if (textFolded[ti] === queryFolded[qi]) {
      qi++;

      // Consecutive match bonus
      consecutive++;
      score += 5 + consecutive * 3;

      // Word boundary bonus
      if (ti === 0 || textFolded[ti - 1] === " ") {
        score += 20;
      }

      // Start of string bonus
      if (ti === 0) score += 15;

      // CamelCase/acronym boundary bonus
      if (ti > 0 && textFolded[ti - 1] >= "A" && textFolded[ti - 1] <= "Z" && textFolded[ti] >= "a") {
        score += 15;
      }

      lastGap = false;
    } else {
      consecutive = 0;
      lastGap = true;
    }
  }

  // Penalty for unmatched characters at the end
  if (qi < qlen) {
    score -= (qlen - qi) * 10;
  }

  // Bonus for covering all query chars
  if (qi === qlen) score += 50;

  // Length ratio penalty (prefer shorter matches)
  const ratio = tlen / Math.max(qlen, 1);
  if (ratio > 3) score -= Math.floor((ratio - 3) * 10);

  return Math.max(0, score);
}

// --- Main Factory ---

export function createFuzzySearch<T = unknown>(options: FuzzyOptions = {}): FuzzySearchInstance<T> {
  const opts: Required<Omit<FuzzyOptions, "keys" | "scorer">> & FuzzyOptions = {
    caseSensitive: options.caseSensitive ?? false,
    diacriticsInsensitive: options.diacriticsInsensitive ?? true,
    requireAllChars: options.requireAllChars ?? true,
    consecutiveBonus: options.consecutiveBonus ?? 2,
    boundaryBonus: options.boundaryBonus ?? 10,
    minScore: options.minScore ?? 0,
    maxResults: options.maxResults ?? Infinity,
    keyFn: options.keyFn ?? ((item: unknown) => String(item)),
    computeMatches: options.computeMatches ?? true,
    ...options,
  };

  function normalize(s: string): string {
    let result = opts.caseSensitive ? s : s.toLowerCase();
    if (opts.diacriticsInsensitive) result = foldDiacritics(result);
    return result;
  }

  function search(query: string, items: T[]): FuzzyResult<T>[] {
    if (!query) return items.map((item) => ({
      item,
      score: 1000,
      matches: [],
      text: typeof item === "string" ? item : opts.keyFn(item),
    }));

    const qNorm = normalize(query);

    const scored: FuzzyResult<T>[] = [];

    for (const item of items) {
      let text: string;
      let finalItem = item;

      // Multi-key support
      if (opts.keys && typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        const texts = opts.keys.map((k) => String(obj[k] ?? "")).join(" ");
        text = texts;
      } else {
        text = typeof item === "string" ? item : opts.keyFn(item);
      }

      const tNorm = normalize(text);

      // Use custom scorer or default
      const score = opts.scorer ? opts.scorer(qNorm, text) : defaultScore(qNorm, tNorm);

      if (score < opts.minScore) continue;

      // Compute match ranges for highlighting
      const matches = opts.computeMatches ? computeMatchRanges(qNorm, tNorm) : [];

      scored.push({ item: finalItem, score, matches, text });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Limit results
    if (scored.length > opts.maxResults) {
      scored.length = opts.maxResults;
    }

    return scored;
  }

  function test(query: string, text: string): FuzzyResult<string> | null {
    const qNorm = normalize(query);
    const tNorm = normalize(text);
    const score = opts.scorer ? opts.scorer(qNorm, text) : defaultScore(qNorm, tNorm);

    if (score < opts.minScore) return null;

    return {
      item: text as T,
      score,
      matches: opts.computeMatches ? computeMatchRanges(qNorm, tNorm) : [],
      text,
    };
  }

  function highlight(
    text: string,
    matches: Array<{ start: number; end: number }>,
    tag = "mark",
  ): string {
    if (!matches.length) return escapeHtml(text);

    // Sort ranges by start position
    const sorted = [...matches].sort((a, b) => a.start - b.start);

    let result = "";
    let lastIndex = 0;

    for (const range of sorted) {
      if (range.start < lastIndex) continue; // Overlapping ranges
      result += escapeHtml(text.slice(lastIndex, range.start));
      result += `<${tag}>${escapeHtml(text.slice(range.start, range.end))}</${tag}>`;
      lastIndex = range.end;
    }
    result += escapeHtml(text.slice(lastIndex));

    return result;
  }

  function setOptions(newOpts: Partial<FuzzyOptions>): void {
    Object.assign(opts, newOpts);
  }

  function getOptions(): FuzzyOptions { return { ...opts }; }

  return { search, test, highlight, setOptions, getOptions };
}

// --- Convenience Functions ---

/** Quick one-off fuzzy search */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  options?: Partial<FuzzyOptions>,
): FuzzyResult<T>[] {
  return createFuzzySearch<T>(options).search(query, items);
}

/** Quick single-string fuzzy test */
export function fuzzyTest(
  query: string,
  text: string,
  options?: Partial<FuzzyOptions>,
): FuzzyResult<string> | null {
  return createFuzzySearch<string>(options).test(query, text);
}

/** Highlight fuzzy matches in text */
export function fuzzyHighlight(
  query: string,
  text: string,
  options?: Partial<FuzzyOptions>,
): string {
  const engine = createFuzzySearch<string>({ ...options, computeMatches: true });
  const result = engine.test(query, text);
  if (!result) return escapeHtml(text);
  return engine.highlight(text, result.matches);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
