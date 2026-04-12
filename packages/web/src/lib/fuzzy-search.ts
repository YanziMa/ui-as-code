/**
 * Fuzzy Search: fast approximate string matching with scoring, ranking,
 * highlighting, multi-term search, diacritic folding, and filtering.
 */

// --- Types ---

export interface FuzzyResult<T = string> {
  /** The matched item */
  item: T;
  /** Match score (0-1, higher = better match) */
  score: number;
  /** Indices of matched characters in the original string */
  matches: number[];
  /** Highlighted HTML version of the string */
  highlighted?: string;
}

export interface FuzzyOptions {
  /** Case sensitive? (default: false) */
  caseSensitive?: boolean;
  /** Require all characters to be in order? (default: true) */
  strict?: boolean;
  /** Minimum score threshold (0-1, default: 0) */
  threshold?: number;
  /** Maximum results to return (default: Infinity) */
  limit?: number;
  /** Include the query as a "must-match" prefix? (default: false) */
  requirePrefixMatch?: boolean;
  /** Weight for consecutive character bonuses (default: 0.5) */
  consecutiveBonus?: number;
  /** Weight for camelCase/acronym matching (default: 0.3) */
  acronymBonus?: number;
  /** Weight for start-of-string bonus (default: 0.2) */
  startBonus?: number;
  /** Generate highlighted HTML? (default: true when highlight is called) */
  highlight?: boolean;
  /** Custom key function to extract searchable string from item */
  keyFn?: (item: T) => string;
  /** Custom scorer function */
  scorer?: (query: string, target: string, options: Required<FuzzyOptions>) => FuzzyResult<T> | null;
}

// --- Diacritic Folding ---

/** Map of accented characters to their base equivalents */
const DIACRITIC_MAP: Record<string, string> = {
  // Latin extended
  "\u00e0": "a", "\u00e1": "a", "\u00e2": "a", "\u00e3": "a", "\u00e4": "a", "\u00e5": "a",
  "\u00c0": "A", "\u00c1": "A", "\u00c2": "A", "\u00c3": "A", "\u00c4": "A", "\u00c5": "A",
  "\u00e8": "e", "\u00e9": "e", "\u00ea": "e", "\u00eb": "e",
  "\u00c8": "E", "\u00c9": "E", "\u00ca": "E", "\u00cb": "E",
  "\u00ec": "i", "\u00ed": "i", "\u00ee": "i", "\u00ef": "i",
  "\u00cc": "I", "\u00cd": "I", "\u00ce": "I", "\u00cf": "I",
  "\u00f2": "o", "\u00f3": "o", "\u00f4": "o", "\u00f5": "o", "\u00f6": "o", "\u00f8": "o",
  "\u00d2": "O", "\u00d3": "O", "\u00d4": "O", "\u00d5": "O", "\u00d6": "O", "\u00d8": "O",
  "\u00f9": "u", "\u00fa": "u", "\u00fb": "u", "\u00fc": "u",
  "\u00d9": "U", "\u00da": "U", "\u00db": "U", "\u00dc": "U",
  "\u00fd": "y", "\u00ff": "y", "\u00dd": "Y",
  "\u00f1": "n", "\u00d1": "N",
  "\u00e7": "c", "\u00c7": "C",
  "\u00df": "ss",
  "\u00fe": "th", "\u00f0": "d",
};

/** Remove diacritics from a string */
export function foldDiacritics(str: string): string {
  return str.replace(/[^\u0000-\u007E]/g, (ch) => DIACRITIC_MAP[ch] ?? ch);
}

// --- Core Scoring Algorithm ---

/**
 * Score how well a query matches a target string using a weighted algorithm.
 *
 * Scoring factors:
 * - Sequential match bonus: consecutive characters score higher
 * - CamelCase boundary detection: matches at word boundaries score higher
 * - Start-of-string bonus: matches near the beginning score higher
 * - Full coverage bonus: queries that cover more of the target score higher
 */
function scoreMatch(
  query: string,
  target: string,
  opts: Required<FuzzyOptions>,
): { score: number; matches: number[] } | null {
  const q = opts.caseSensitive ? query : query.toLowerCase();
  const t = opts.caseSensitive ? target : target.toLowerCase();

  if (q.length === 0) return { score: 1, matches: [] };
  if (t.length === 0) return null;

  // Quick check: does target contain all query characters?
  let tIdx = 0;
  let qIdx = 0;
  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) qIdx++;
    tIdx++;
  }
  if (qIdx < q.length) return null;

  // Dynamic programming approach for optimal alignment
  const rows = q.length + 1;
  const cols = t.length + 1;

  // dp[i][j] = best score for matching query[0..i) against target[0..j)
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(-Infinity));
  // track[i][j] = whether position j was used in the match
  const track: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));

  dp[0][0] = 0;

  for (let j = 0; j <= t.length; j++) {
    dp[0][j] = 0; // Empty query matches anything with score 0
  }

  for (let i = 1; i <= q.length; i++) {
    let foundAny = false;
    for (let j = 1; j <= t.length; j++) {
      if (q[i - 1] === t[j - 1]) {
        foundAny = true;

        // Score for matching this character
        let charScore = 1;

        // Consecutive bonus
        if (i > 1 && j > 1 && track[i - 1][j - 1]) {
          charScore += opts.consecutiveBonus;
        }

        // Start-of-string / word boundary bonus
        if (j === 1 || isWordBoundary(t, j - 1)) {
          charScore += opts.startBonus;
        }

        // CamelCase / acronym bonus
        if (isUpperCase(t[j - 1]) && (j === 1 || !isUpperCase(t[j - 2]))) {
          charScore += opts.acronymBonus;
        }

        // Options: skip or match
        const skipScore = dp[i][j - 1];
        const matchScore = (dp[i - 1][j - 1] ?? 0) + charScore;

        if (matchScore >= skipScore) {
          dp[i][j] = matchScore;
          track[i][j] = true;
        } else {
          dp[i][j] = skipScore;
          track[i][j] = false;
        }
      } else {
        dp[i][j] = dp[i][j - 1]; // Skip this target character
        track[i][j] = false;
      }
    }

    if (!foundAny && opts.strict) return null;
  }

  const rawScore = dp[q.length][t.length];

  if (rawScore <= 0) return null;

  // Normalize score by query length and coverage
  // Max possible score per char ≈ 1 + consecutiveBonus + startBonus + acronymBonus
  const maxCharScore = 1 + opts.consecutiveBonus + opts.startBonus + opts.acronymBonus;
  const maxPossible = q.length * maxCharScore;
  const normalizedScore = Math.min(1, rawScore / maxPossible);

  // Backtrack to find matched positions
  const matches: number[] = [];
  let ci = q.length;
  let cj = t.length;
  while (ci > 0 && cj > 0) {
    if (track[ci][cj]) {
      matches.push(cj - 1);
      ci--;
      cj--;
    } else {
      cj--;
    }
  }
  matches.reverse();

  // Prefix requirement
  if (opts.requirePrefixMatch && matches.length > 0 && matches[0] !== 0) {
    return null;
  }

  return { score: normalizedScore, matches };
}

function isWordBoundary(str: string, idx: number): boolean {
  if (idx === 0) return true;
  const prev = str[idx - 1]!;
  const curr = str[idx]!;
  // Word boundary: transition from non-word to word char
  const isPrevWord = /[a-zA-Z0-9]/.test(prev);
  const isCurrWord = /[a-zA-Z0-9]/.test(curr);
  return isPrevWord !== isCurrWord || (isCurrWord && isUpperCase(curr) && !isUpperCase(prev));
}

function isUpperCase(ch: string): boolean {
  return ch >= "A" && ch <= "Z";
}

// --- Highlighting ---

/** Wrap matched characters in markup */
export function highlightMatches(text: string, matches: number[], options?: {
  tag?: string;
  className?: string;
}): string {
  if (matches.length === 0) return escapeHtml(text);
  const tag = options?.tag ?? "mark";
  const cls = options?.className ? ` class="${options.className}"` : "";

  let result = "";
  let lastEnd = 0;

  for (const idx of matches) {
    result += escapeHtml(text.slice(lastEnd, idx));
    result += `<${tag}${cls}>${escapeHtml(text[idx]!)}</${tag}>`;
    lastEnd = idx + 1;
  }
  result += escapeHtml(text.slice(lastEnd));

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Main Search Function ---

/**
 * Perform fuzzy search over an array of items.
 *
 * @param items - Array of strings or objects to search
 * @param query - Search query string
 * @param options - Search configuration
 * @returns Sorted array of results, best match first
 */
export function fuzzySearch<T = string>(
  items: T[],
  query: string,
  options: FuzzyOptions = {},
): FuzzyResult<T>[] {
  const resolvedOpts: Required<FuzzyOptions> = {
    caseSensitive: options.caseSensitive ?? false,
    strict: options.strict ?? true,
    threshold: options.threshold ?? 0,
    limit: options.limit ?? Infinity,
    requirePrefixMatch: options.requirePrefixMatch ?? false,
    consecutiveBonus: options.consecutiveBonus ?? 0.5,
    acronymBonus: options.acronymBonus ?? 0.3,
    startBonus: options.startBonus ?? 0.2,
    highlight: options.highlight ?? false,
    keyFn: options.keyFn ?? ((item: T) => item as unknown as string),
    scorer: options.scorer ?? undefined,
  };

  const foldedQuery = foldDiacritics(query.trim());
  if (!foldedQuery) return items.map((item) => ({
    item,
    score: 1,
    matches: [],
    highlighted: "",
  }));

  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    const targetStr = String(resolvedOpts.keyFn(item));
    const foldedTarget = foldDiacritics(targetStr);

    let result: { score: number; matches: number[] } | null;

    if (resolvedOpts.scorer) {
      const customResult = resolvedOpts.scorer(foldedQuery, foldedTarget, resolvedOpts);
      if (customResult) {
        results.push(customResult);
        continue;
      }
      continue;
    }

    result = scoreMatch(foldedQuery, foldedTarget, resolvedOpts);

    if (result && result.score >= resolvedOpts.threshold) {
      const entry: FuzzyResult<T> = {
        item,
        score: result.score,
        matches: result.matches,
      };

      if (resolvedOpts.highlight) {
        entry.highlighted = highlightMatches(targetStr, result.matches);
      }

      results.push(entry);
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Apply limit
  if (results.length > resolvedOpts.limit) {
    results.length = resolvedOpts.limit;
  }

  return results;
}

// --- Multi-Term Search ---

/**
 * Split query into terms and search with AND logic.
 * All terms must match (with individual thresholds).
 */
export function multiTermSearch<T = string>(
  items: T[],
  query: string,
  options?: Omit<FuzzyOptions, "scorer">,
): FuzzyResult<T>[] {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  if (terms.length === 1) {
    return fuzzySearch(items, terms[0]!, options);
  }

  // Search each term independently, then intersect results
  let candidateSet: Set<T> | null = null;
  const termResults: Map<T, { totalScore: number; allMatches: number[] }> = new Map();

  for (const term of terms) {
    const termHits = fuzzySearch(items, term, { ...options, threshold: options?.threshold ?? 0.1 });

    const termItems = new Set(termHits.map((r) => r.item));

    if (candidateSet === null) {
      candidateSet = termItems;
    } else {
      // Intersect
      candidateSet = new Set([...candidateSet].filter((x) => termItems.has(x)));
    }

    // Accumulate scores
    for (const hit of termHits) {
      if (!candidateSet.has(hit.item)) continue;
      const existing = termResults.get(hit.item);
      if (existing) {
        existing.totalScore += hit.score;
        existing.allMatches.push(...hit.matches);
      } else {
        termResults.set(hit.item, { totalScore: hit.score, allMatches: [...hit.matches] });
      }
    }
  }

  if (!candidateSet) return [];

  // Build final results from intersection
  const finalResults: FuzzyResult<T>[] = [];
  for (const item of candidateSet) {
    const data = termResults.get(item)!;
    finalResults.push({
      item,
      score: data.totalScore / terms.length, // Average score across terms
      matches: [...new Set(data.allMatches)].sort((a, b) => a - b),
      highlighted: options?.highlight
        ? highlightMatches(String(options.keyFn?.(item) ?? item), [...new Set(data.allMatches)].sort((a, b) => a - b))
        : undefined,
    });
  }

  finalResults.sort((a, b) => b.score - a.score);

  const limit = options?.limit ?? Infinity;
  if (finalResults.length > limit) finalResults.length = limit;

  return finalResults;
}

// --- Filter Helper ---

/**
 * Simple filter: returns items that contain the query as substring.
 * Much faster than full fuzzy search for simple use cases.
 */
export function filterBySubstring<T = string>(
  items: T[],
  query: string,
  options?: { caseSensitive?: boolean; keyFn?: (item: T) => string },
): T[] {
  if (!query.trim()) return [...items];

  const q = options?.caseSensitive ? query : query.toLowerCase();
  const keyFn = options?.keyFn ?? ((item: T) => item as unknown as string);

  return items.filter((item) => {
    const val = options?.caseSensitive ? String(keyFn(item)) : String(keyFn(item)).toLowerCase();
    return val.includes(q);
  });
}

// --- Rank/Sort Utility ---

/** Re-rank existing results with a custom scoring function */
export function rerank<T>(results: FuzzyResult<T>[], scorer: (result: FuzzyResult<T>) => number): FuzzyResult<T>[] {
  const scored = results.map((r) => ({ ...r, _customScore: scorer(r) }));
  scored.sort((a, b) => (b as any)._customScore - (a as any)._customScore);
  return scored.map(({ _customScore, ...rest }) => rest);
}
