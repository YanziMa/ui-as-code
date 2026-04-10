/**
 * Full-text search engine: inverted index, TF-IDF ranking, fuzzy matching,
 * faceted search, result highlighting.
 */

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResult<T = SearchDocument> {
  document: T;
  score: number;
  matches: Array<{ field: string; text: string; indices: number[] }>;
  highlights: Record<string, string>;
}

export interface SearchOptions {
  fields?: Array<"title" | "content" | "tags">;
  weights?: Partial<Record<"title" | "content" | "tags", number>>;
  fuzzy?: boolean;          // Enable fuzzy matching
  fuzzyThreshold?: number;  // Levenshtein distance threshold (0-1)
  highlight?: boolean;      // Generate highlighted snippets
  snippetLength?: number;   // Characters per snippet
  maxResults?: number;
  filter?: (doc: SearchDocument) => boolean;
  facets?: string[];        // Fields to facet on
}

export interface FacetResult {
  field: string;
  values: Array<{ value: string; count: number }>;
}

// --- Tokenizer ---

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Simple stemmer (English suffix stripping) */
function stem(word: string): string {
  if (word.length <= 3) return word;
  const suffixes = [
    ["ies", "y"], ["ied", "y"], ["ing", ""], ["ly", ""],
    ["ness", ""], ["ment", ""], ["able", ""], ["ible", ""],
    ["al", ""], ["ial", ""], ["ous", ""],["ive", ""],
    ["ize", "ise"], ["ise", "ize"], ["ation", "e"],
    ["es", ""], ["ed", ""], ["er", ""], ["est", ""],
    ["s", ""],
  ];
  for (const [suffix, replacement] of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length + (replacement?.length ?? 0) >= 2) {
      return word.slice(0, -suffix.length) + replacement;
    }
  }
  return word;
}

// --- Inverted Index ---

interface Posting {
  docId: string;
  positions: number[];
  tf: number; // Term frequency in this document
}

export class SearchEngine<T extends SearchDocument = SearchDocument> {
  private documents = new Map<string, T>();
  private invertedIndex = new Map<string, Posting[]>();
  private documentCount = 0;
  private avgDocLength = 0;
  private totalTerms = 0;

  /** Add a document to the index */
  add(doc: T): void {
    this.documents.set(doc.id, doc);
    this.documentCount++;

    const allText = [doc.title, doc.content, ...(doc.tags ?? [])].join(" ");
    const tokens = tokenize(allText);
    const termFreq = new Map<string, number>();
    const termPositions = new Map<string, number[]>();

    for (let i = 0; i < tokens.length; i++) {
      const token = stem(tokens[i]!);
      termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
      if (!termPositions.has(token)) termPositions.set(token, []);
      termPositions.get(token)!.push(i);
    }

    for (const [term, freq] of termFreq) {
      const posting: Posting = { docId: doc.id, positions: termPositions.get(term)!, tf: freq };
      const existing = this.invertedIndex.get(term);
      if (existing) { existing.push(posting); }
      else { this.invertedIndex.set(term, [posting]); }
    }

    // Update average document length
    this.totalTerms += tokens.length;
    this.avgDocLength = this.totalTerms / this.documentCount;
  }

  /** Add multiple documents */
  addAll(docs: T[]): void { for (const doc of docs) this.add(doc); }

  /** Remove a document from the index */
  remove(id: string): void {
    this.documents.delete(id);
    for (const [, postings] of this.invertedIndex) {
      const idx = postings.findIndex((p) => p.docId === id);
      if (idx >= 0) postings.splice(idx, 1);
    }
    this.documentCount = Math.max(0, this.documentCount - 1);
  }

  /** Clear all data */
  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.documentCount = 0;
    this.avgDocLength = 0;
    this.totalTerms = 0;
  }

  /** Search the index */
  search(query: string, options: SearchOptions = {}): SearchResult<T>[] {
    const {
      fields = ["title", "content", "tags"],
      weights = { title: 3, content: 1, tags: 2 },
      fuzzy = false,
      fuzzyThreshold = 0.7,
      highlight = true,
      snippetLength = 150,
      maxResults = 50,
      filter,
    } = options;

    const queryTokens = tokenize(query).map(stem);
    if (queryTokens.length === 0) return [];

    // Score each document
    const scores = new Map<string, {
      score: number;
      matches: SearchResult["matches"];
      termHits: Map<string, Set<number>>;
    }>();

    for (const term of queryTokens) {
      // Exact matches
      let postings = this.invertedIndex.get(term) ?? [];

      // Fuzzy matches
      if (fuzzy && postings.length === 0) {
        for (const [indexTerm, indexPostings] of this.invertedIndex) {
          if (similarity(term, indexTerm) >= fuzzyThreshold) {
            postings = postings.concat(indexPostings);
          }
        }
      }

      const idf = Math.log((this.documentCount + 1) / (postings.length + 1)) + 1;

      for (const posting of postings) {
        const doc = this.documents.get(posting.docId);
        if (!doc || (filter && !filter(doc))) continue;

        let entry = scores.get(posting.docId);
        if (!entry) {
          entry = { score: 0, matches: [], termHits: new Map() };
          scores.set(posting.docId, entry);
        }

        // Calculate TF-IDF weighted by field
        const titleTokens = tokenize(doc.title).map(stem);
        const contentTokens = tokenize(doc.content).map(stem);
        const tagTokens = (doc.tags ?? []).flatMap((t) => tokenize(t)).map(stem);

        let fieldScore = 0;
        if (fields.includes("title") && titleTokens.includes(term)) {
          fieldScore += weights.title ?? 3;
          entry.matches.push({ field: "title", text: doc.title, indices: [] });
        }
        if (fields.includes("content")) {
          const contentIdx = contentTokens.indexOf(term);
          if (contentIdx >= 0) {
            fieldScore += weights.content ?? 1;
            entry.matches.push({
              field: "content",
              text: doc.content,
              indices: posting.positions.slice(0, 5),
            });
          }
        }
        if (fields.includes("tags") && tagTokens.includes(term)) {
          fieldScore += weights.tags ?? 2;
          entry.matches.push({ field: "tags", text: doc.tags?.join(", ") ?? "", indices: [] });
        }

        const tfNormalized = posting.tf / (1 + 0.25 * (1 + 0.75 * (tokensInField(doc, term) / this.avgDocLength)));
        entry.score += tfNormalized * idf * fieldScore;

        // Track term hits for highlighting
        if (!entry.termHits.has(term)) entry.termHits.set(term, new Set());
        for (const pos of posting.positions) entry.termHits.get(term)!.add(pos);
      }
    }

    // Sort by score and build results
    const results: SearchResult<T>[] = [];
    for (const [docId, scoring] of scores) {
      const doc = this.documents.get(docId)!;
      results.push({
        document: doc,
        score: scoring.score,
        matches: scoring.matches,
        highlights: highlight ? generateHighlights(doc, scoring.termHits, snippetLength) : {},
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /** Get faceted results */
  getFacets(results: SearchResult<T>[], facetFields: string[]): FacetResult[] {
    const facets: FacetResult[] = [];

    for (const field of facetFields) {
      const counts = new Map<string, number>();
      for (const r of results) {
        const value = (r.document as unknown as Record<string, unknown>)[field] as string ?? "";
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      facets.push({
        field,
        values: Array.from(counts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
      });
    }

    return facets;
  }

  /** Autocomplete suggestions */
  suggest(prefix: string, limit = 8): string[] {
    const prefixStem = stem(prefix.toLowerCase());
    if (prefixStem.length < 2) return [];

    const candidates = new Map<string, number>(); // term -> doc frequency

    for (const [term, postings] of this.invertedIndex) {
      if (term.startsWith(prefixStem) || similarity(prefixStem, term) > 0.6) {
        candidates.set(term, postings.length);
      }
    }

    return Array.from(candidates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([term]) => term);
  }

  /** Get statistics about the index */
  getStats(): { documentCount: number; uniqueTerms: number; avgDocLength: number; totalIndexSize: number } {
    let totalPostings = 0;
    for (const [, postings] of this.invertedIndex) totalPostings += postings.length;
    return {
      documentCount: this.documentCount,
      uniqueTerms: this.invertedIndex.size,
      avgDocLength: parseFloat(this.avgDocLength.toFixed(1)),
      totalIndexSize: totalPostings,
    };
  }
}

function tokensInField(doc: SearchDocument, term: string): number {
  return tokenize([doc.title, doc.content].join(" ")).filter((t) => stem(t) === term).length;
}

// --- Fuzzy Matching ---

/** Jaro-Winkler similarity (better than basic Levenshtein for short strings) */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;

  const lenA = a.length, lenB = b.length;
  if (lenA === 0 || lenB === 0) return 0;

  const matchDistance = Math.max(Math.floor(Math.max(lenA, lenB) / 2) - 1, 0);

  const aMatches = new Uint8Array(lenA);
  const bMatches = new Uint8Array(lenB);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < lenA; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, lenB);

    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = 1;
      bMatches[j] = 1;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < lenA; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / lenA + matches / lenB + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification for common prefix
  let prefixLen = 0;
  for (let i = 0; i < Math.min(lenA, lenB, 4); i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }

  return jaro + prefixLen * 0.1 * (1 - jaro);
}

/** General similarity function using Jaro-Winkler */
export function similarity(a: string, b: string): number {
  return jaroWinkler(a.toLowerCase(), b.toLowerCase());
}

// --- Highlighting ---

function generateHighlights(
  doc: SearchDocument,
  termHits: Map<string, Set<number>>,
  snippetLength: number,
): Record<string, string> {
  const highlights: Record<string, string> = {};

  // Title highlight
  if (termHits.size > 0) {
    let highlightedTitle = doc.title;
    for (const term of termHits.keys()) {
      const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
      highlightedTitle = highlightedTitle.replace(regex, "<mark>$1</mark>");
    }
    highlights.title = highlightedTitle;
  }

  // Content snippet with highlighting
  const content = doc.content;
  if (content && termHits.size > 0) {
    // Find best snippet position (around first match)
    let bestPos = 0;
    for (const positions of termHits.values()) {
      const firstPos = Math.min(...positions);
      if (firstPos < content.length) {
        bestPos = Math.max(bestPos, Math.floor(firstPos * (content.length / (tokenize(content).length || 1))));
      }
    }

    const start = Math.max(0, bestPos - snippetLength / 3);
    const end = Math.min(content.length, start + snippetLength);
    let snippet = content.slice(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < content.length) snippet = snippet + "...";

    for (const term of termHits.keys()) {
      const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
      snippet = snippet.replace(regex, "<mark>$1</mark>");
    }
    highlights.content = snippet;
  }

  return highlights;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Utility Functions ---

/** Create a pre-configured search engine from an array of documents */
export function createSearchEngine<T extends SearchDocument = SearchDocument>(
  docs?: T[],
): SearchEngine<T> {
  const engine = new SearchEngine<T>();
  if (docs) engine.addAll(docs);
  return engine;
}
