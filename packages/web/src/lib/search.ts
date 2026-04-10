/**
 * Text search and filtering utilities.
 */

export interface SearchOptions {
  /** Case insensitive (default: true) */
  caseSensitive?: boolean;
  /** Match whole words only */
  wholeWord?: boolean;
  /** Use fuzzy matching */
  fuzzy?: boolean;
  /** Fuzzy threshold (0-1, lower = more permissive, default: 0.6) */
  fuzzyThreshold?: number;
  /** Include diacritic folding */
  foldDiacritics?: boolean;
}

export interface SearchResult<T> {
  item: T;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  /** Start index in the original text */
  start: number;
  /** End index (exclusive) */
  end: number;
  /** Matched text */
  text: string;
}

/**
 * Simple text search with optional fuzzy matching.
 * Returns a score from 0 (no match) to 1 (exact match).
 */
export function searchText(
  text: string,
  query: string,
  options: SearchOptions = {},
): { score: number; matches: SearchMatch[] } {
  const {
    caseSensitive = false,
    wholeWord = false,
    fuzzy = false,
    fuzzyThreshold = 0.6,
    foldDiacritics = true,
  } = options;

  if (!query.trim()) return { score: 1, matches: [] };

  let sourceText = text;
  let sourceQuery = query;

  if (!caseSensitive) {
    sourceText = sourceText.toLowerCase();
    sourceQuery = sourceQuery.toLowerCase();
  }

  if (foldDiacritics) {
    sourceText = sourceText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    sourceQuery = sourceQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Exact match
  const idx = sourceText.indexOf(sourceQuery);
  if (idx !== -1) {
    if (wholeWord) {
      const before = idx > 0 ? sourceText[idx - 1] : " ";
      const after = idx + sourceQuery.length < sourceText.length
        ? sourceText[idx + sourceQuery.length]
        : " ";
      if (/\w/.test(before) || /\w/.test(after)) {
        return fuzzy ? fuzzySearch(sourceText, sourceQuery, fuzzyThreshold) : { score: 0, matches: [] };
      }
    }
    return {
      score: 1,
      matches: [{ start: idx, end: idx + sourceQuery.length, text: text.slice(idx, idx + sourceQuery.length) }],
    };
  }

  // Fuzzy fallback
  if (fuzzy) {
    return fuzzySearch(sourceText, sourceQuery, fuzzyThreshold);
  }

  return { score: 0, matches: [] };
}

/**
 * Fuzzy search using character-by-character scoring.
 */
function fuzzySearch(text: string, query: string, threshold: number): { score: number; matches: SearchMatch[] } {
  let score = 0;
  let queryIdx = 0;
  let lastMatchIdx = -1;
  let consecutiveBonus = 0;
  const matches: SearchMatch[] = [];
  let matchStart = -1;

  for (let i = 0; i < text.length && queryIdx < query.length; i++) {
    if (text[i] === query[queryIdx]) {
      if (matchStart === -1) matchStart = i;

      // Consecutive match bonus
      if (lastMatchIdx === i - 1) {
        consecutiveBonus += 0.1;
      }

      // Start of word bonus
      if (i === 0 || /[\s-_./]/.test(text[i - 1])) {
        score += 0.5;
      } else {
        score += 0.1 + consecutiveBonus;
      }

      lastMatchIdx = i;
      queryIdx++;
    } else {
      if (matchStart !== -1 && lastMatchIdx === i - 1) {
        matches.push({ start: matchStart, end: lastMatch + 1, text: text.slice(matchStart, lastMatchIdx + 1) });
        matchStart = -1;
        consecutiveBonus = 0;
      }
    }
  }

  // Close final match range
  if (matchStart !== -1 && lastMatchIdx >= matchStart) {
    matches.push({ start: matchStart, end: lastMatchIdx + 1, text: text.slice(matchStart, lastMatchIdx + 1) });
  }

  // Normalize score by query length
  if (queryIdx === query.length) {
    score = Math.min(score / query.length, 1);
  } else {
    // Partial match penalty
    score = (score / query.length) * (queryIdx / query.length);
  }

  return score >= threshold ? { score, matches } : { score: 0, matches: [] };
}

/**
 * Search through an array of items using an extractor function.
 */
export function searchArray<T>(
  items: T[],
  query: string,
  extractor: (item: T) => string,
  options?: SearchOptions & { limit?: number },
): SearchResult<T>[] {
  if (!query.trim()) return items.map((item) => ({ item, score: 1, matches: [] }));

  const results: SearchResult<T>[] = [];
  const limit = options?.limit ?? items.length;

  for (const item of items) {
    const text = extractor(item);
    const result = searchText(text, query, options);
    if (result.score > 0) {
      results.push({ item, score: result.score, matches: result.matches });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Highlight matched portions of text with HTML markup.
 */
export function highlightMatches(
  text: string,
  matches: SearchMatch[],
  tag: string = "mark",
): string {
  if (matches.length === 0) return text;

  let result = "";
  let lastIndex = 0;

  const sorted = [...matches].sort((a, b) => a.start - b.start);

  for (const match of sorted) {
    if (match.start >= lastIndex) {
      result += text.slice(lastIndex, match.start);
      result += `<${tag}>${text.slice(match.start, match.end)}</${tag}>`;
      lastIndex = match.end;
    }
  }

  result += text.slice(lastIndex);
  return result;
}

/**
 * Build a search index for fast prefix/contains lookups.
 */
export class SearchIndex<T> {
  private index = new Map<string, Set<T>>();
  private items: T[] = [];

  constructor(private extractor: (item: T) => string[]) {}

  /** Add items to the index */
  add(items: T | T[]): void {
    const arr = Array.isArray(items) ? items : [items];
    for (const item of arr) {
      this.items.push(item);
      const terms = this.extractor(item);
      for (const term of terms) {
        const normalized = term.toLowerCase().trim();
        if (!normalized) continue;

        // Index n-grams for partial matching
        for (let len = 1; len <= Math.min(normalized.length, 4); len++) {
          for (let i = 0; i <= normalized.length - len; i++) {
            const gram = normalized.slice(i, i + len);
            let set = this.index.get(gram);
            if (!set) {
              set = new Set();
              this.index.set(gram, set);
            }
            set.add(item);
          }
        }
      }
    }
  }

  /** Search the index */
  search(query: string, limit = 20): T[] {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return this.items.slice(0, limit);

    const scores = new Map<T, number>();

    // Score each n-gram match
    for (let len = 1; len <= Math.min(normalized.length, 4); len++) {
      for (let i = 0; i <= normalized.length - len; i++) {
        const gram = normalized.slice(i, i + len);
        const candidates = this.index.get(gram);
        if (candidates) {
          const weight = len / normalized.length; // Longer grams = higher weight
          for (const item of candidates) {
            scores.set(item, (scores.get(item) ?? 0) + weight);
          }
        }
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item]) => item);
  }

  /** Remove all items from index */
  clear(): void {
    this.index.clear();
    this.items = [];
  }

  /** Get total indexed items count */
  get size(): number {
    return this.items.length;
  }
}
