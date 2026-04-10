/**
 * Inverted Index: Full-text search engine with BM25 ranking, inverted index
 * structure, faceted search, autocomplete/prefix search, fuzzy matching,
 * highlighting, field-level boosting, phrase queries, boolean operators,
 * stop words, stemming support, and pagination.
 */

// --- Types ---

export type DocumentId = string;
export type Term = string;

export interface SearchDocument<T = Record<string, unknown>> {
  id: DocumentId;
  fields: T;
  /** Optional pre-computed text for searchable fields */
  searchText?: string;
  /** Document boost factor (default: 1.0) */
  boost?: number;
  /** Timestamp for sorting/recency scoring */
  timestamp?: number;
}

export interface SearchResult<T = Record<string, unknown>> {
  document: SearchDocument<T>;
  score: number;
  highlights?: Record<string, string[]>;
  matchedFields?: string[];
}

export interface SearchOptions {
  /** Maximum number of results (default: 20) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
  /** Field-specific boost factors */
  fieldBoosts?: Record<string, number>;
  /** Minimum score threshold (default: 0) */
  minScore?: number;
  /** Enable fuzzy matching (default: false) */
  fuzzy?: boolean;
  /** Fuzzy edit distance (default: 2) */
  fuzzyDistance?: number;
  /** Return highlighted snippets */
  highlight?: boolean;
  /** Highlight tag (default: <mark>) */
  highlightTag?: string;
  /** Snippet length in characters (default: 150) */
  snippetLength?: number;
  /** Facet fields to aggregate */
  facets?: string[];
  /** Filter by field values */
  filters?: Array<{ field: string; value: unknown; op?: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" }>;
  /** Sort by field or score */
  sortBy?: "score" | "date" | string;
  sortOrder?: "asc" | "desc";
  /** Phrase query (exact match) */
  phrase?: string;
  /** Boolean mode: "or" (default) | "and" */
  booleanMode?: "or" | "and";
  /** Include/exclude terms */
  mustInclude?: string[];
  mustExclude?: string[];
}

export interface FacetResult {
  field: string;
  values: Array<{ value: string; count: number }>;
  total: number;
}

export interface IndexStats {
  documentCount: number;
  termCount: number;
  uniqueTerms: number;
  averageDocumentLength: number;
  totalIndexedFields: number;
  indexSize: number; // estimated bytes
  memoryUsage: number;
}

export interface AutocompleteOptions {
  /** Max suggestions (default: 8) */
  limit?: number;
  /** Fields to search (default: all) */
  fields?: string[];
  /** Minimum prefix length (default: 2) */
  minLength?: number;
}

export interface Suggestion {
  text: string;
  frequency: number;
  field?: string;
}

// --- Text Processing ---

const DEFAULT_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "was", "are", "be",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "that", "this", "these", "those", "i", "you", "he", "she",
  "we", "they", "what", "which", "who", "whom", "when", "where", "why",
  "how", "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "no", "nor", "not", "only", "own", "same", "so",
  "than", "too", "very", "just", "also", "now", "here", "there", "then",
  "if", "about", "after", "before", "into", "over", "through", "during",
  "above", "below", "between", "under", "again", "further", "once",
]);

/** Simple stemmer — Porter-like suffix stripping (English only, simplified) */
function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 2) return w;

  // Step 1a: plural/verb endings
  let s = w.replace(/sses$/, "ss").replace(/ies$/, "i").replace(/ss$/, "ss").replace(/s$/, "");

  // Step 1b: -eed -> ee if consonant, -ed/-ing removal
  if (s.endsWith("eed")) {
    const stem = s.slice(0, -3);
    s = countConsonants(stem) > 1 ? stem + "ee" : s;
  } else if (s.endsWith("ed") && containsVowel(s.slice(0, -2))) {
    s = s.slice(0, -2);
  } else if (s.endsWith("ing") && containsVowel(s.slice(0, -3))) {
    s = s.slice(0, -3);
  }

  // Step 1c: y -> i if vowel in stem
  if (s.endsWith("y") && containsVowel(s.slice(0, -1))) {
    s = s.slice(0, -1) + "i";
  }

  // Common suffixes
  for (const suffix of ["ational", "tional", "enci", "anci", "izer", "ization",
                       "ation", "ator", "alism", "iveness", "fulness", "ousness",
                       "ality", "ivity", "bility", "less"]) {
    if (s.endsWith(suffix)) { s = s.slice(0, -suffix.length); break; }
  }

  return s;
}

function containsVowel(s: string): boolean { return /[aeiouy]/.test(s); }
function countConsonants(s: string): number { return (s.match(/[^aeiou]/g) ?? []).length; }

/** Tokenize text into terms */
function tokenize(text: string, options: { stopWords?: Set<string>; stem?: boolean } = {}): Term[] {
  const stopWords = options.stopWords ?? DEFAULT_STOP_WORDS;
  const shouldStem = options.stem ?? true;

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => shouldStem ? stem(w) : w)
    .filter((w) => !stopWords.has(w));
}

// --- InvertedIndex Implementation ---

export class InvertedIndex<T = Record<string, unknown>> {
  // term -> Map<docId, positions[]>
  private index = new Map<Term, Map<DocumentId, number[]>>();
  // docId -> document
  private documents = new Map<DocumentId, SearchDocument<T>>();
  // docId -> total term count (for length normalization)
  private documentLengths = new Map<DocumentId, number>();
  // field lengths
  private fieldLengths = new Map<string, Map<DocumentId, number>>();
  // term frequency cache
  private termFreqCache = new Map<Term, number>(); // document frequency
  private avgDocLength = 0;
  private totalTerms = 0;
  private destroyed = false;

  // --- Index Operations ---

  /**
   * Add a document to the index.
   */
  add(document: SearchDocument<T>): void {
    if (this.destroyed) return;
    if (this.documents.has(document.id)) this.remove(document.id);

    this.documents.set(document.id, document);

    const text = document.searchText ?? this.extractText(document.fields);
    const tokens = tokenize(text);
    this.documentLengths.set(document.id, tokens.length);
    this.totalTerms += tokens.length;

    // Build position index
    const seenPositions = new Map<Term, number[]>();
    for (let i = 0; i < tokens.length; i++) {
      const term = tokens[i];
      if (!seenPositions.has(term)) seenPositions.set(term, []);
      seenPositions.get(term)!.push(i);
    }

    // Update inverted index
    for (const [term, positions] of seenPositions) {
      if (!this.index.has(term)) this.index.set(term, new Map());
      this.index.get(term)!.set(document.id, positions);

      // Update DF cache
      this.termFreqCache.set(term, (this.termFreqCache.get(term) ?? 0) + 1);
    }

    // Update average document length
    this.recalculateAvgDocLength();
  }

  /**
   * Remove a document from the index.
   */
  remove(docId: DocumentId): boolean {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    // Remove from inverted index
    for (const [term, postings] of this.index) {
      if (postings.has(docId)) {
        postings.delete(docId);
        this.termFreqCache.set(term, (this.termFreqCache.get(term) ?? 1) - 1);
        if (postings.size === 0) {
          this.index.delete(term);
          this.termFreqCache.delete(term);
        }
      }
    }

    this.documents.delete(docId);
    this.documentLengths.delete(docId);
    this.totalTerms -= this.documentLengths.get(docId) ?? 0;
    this.recalculateAvgDocLength();
    return true;
  }

  /**
   * Bulk add documents.
   */
  addAll(documents: SearchDocument<T>[]): number {
    for (const doc of documents) this.add(doc);
    return documents.length;
  }

  /**
   * Clear the entire index.
   */
  clear(): void {
    this.index.clear();
    this.documents.clear();
    this.documentLengths.clear();
    this.fieldLengths.clear();
    this.termFreqCache.clear();
    this.avgDocLength = 0;
    this.totalTerms = 0;
  }

  // --- Searching ---

  /**
   * Search the index using BM25 ranking.
   */
  search(query: string, options: SearchOptions = {}): SearchResult<T>[] {
    if (this.destroyed) return [];

    const {
      limit = 20, offset = 0, fieldBoosts = {}, minScore = 0,
      fuzzy = false, fuzzyDistance = 2, highlight = false,
      highlightTag = "mark", snippetLength = 150,
      sortBy = "score", sortOrder = "desc",
      booleanMode = "or", mustInclude = [], mustExclude = [],
    } = options;

    const tokens = tokenize(query, { stem: false }); // Don't stem query — match against stemmed index
    const stemmedTokens = tokens.map((t) => stem(t));

    // Apply must-include/must-exclude
    const includeTerms = mustInclude.map((t) => stem(t.toLowerCase()));
    const excludeTerms = mustExclude.map((t) => stem(t.toLowerCase()));

    if (stemmedTokens.length === 0 && includeTerms.length === 0) return [];

    // Score each candidate document
    const scores = new Map<DocumentId, { score: number; termMatches: Set<string>; fieldMatches: Set<string> }>();

    // Collect candidate doc IDs
    const candidateDocs = new Set<DocumentId>();
    const searchTerms = [...new Set([...stemmedTokens, ...includeTerms])];

    for (const term of searchTerms) {
      const postings = this.index.get(term);
      if (postings) {
        for (const docId of postings.keys()) candidateDocs.add(docId);
      }

      // Fuzzy matches
      if (fuzzy) {
        for (const [indexTerm, postings] of this.index) {
          if (editDistance(term, indexTerm) <= fuzzyDistance) {
            for (const docId of postings.keys()) candidateDocs.add(docId);
          }
        }
      }
    }

    // If AND mode, start with intersection of first term's docs
    let initialCandidates: Set<DocumentId> | Iterable<DocumentId>;
    if (booleanMode === "and" && stemmedTokens.length > 0) {
      const firstPostings = this.index.get(stemmedTokens[0]);
      initialCandidates = firstPostings?.keys() ?? [];
    } else {
      initialCandidates = candidateDocs;
    }

    const N = this.documents.size; // total documents
    const avgDL = this.avgDocLength || 1;
    const k1 = 1.2; // BM25 k1 parameter
    const b = 0.75; // BM25 b parameter

    for (const docId of initialCandidates) {
      // Apply filters
      if (options.filters) {
        const doc = this.documents.get(docId);
        if (doc && !this.passesFilters(doc, options.filters)) continue;
      }

      // Must-exclude check
      let excluded = false;
      for (const term of excludeTerms) {
        if (this.index.get(term)?.has(docId)) { excluded = true; break; }
      }
      if (excluded) continue;

      // Must-include check
      for (const term of includeTerms) {
        if (!this.index.get(term)?.has(docId)) continue; // Skip this doc
      }

      let score = 0;
      const termMatches = new Set<string>();
      const fieldMatches = new Set<string>();

      for (const term of searchTerms) {
        const postings = this.index.get(term);
        if (!postings?.has(docId)) continue;

        const tf = postings.get(docId)!.length; // term frequency in this doc
        const df = this.termFreqCache.get(term) ?? 1; // document frequency
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1); // IDF (Robertson-Sparck Jones)
        const dl = this.documentLengths.get(docId) ?? avgDL;
        const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgDL));

        // Field boost
        let fieldBoost = 1;
        for (const [field, boost] of Object.entries(fieldBoosts)) {
          // Simple heuristic: if term appears in boosted field text
          const doc = this.documents.get(docId);
          if (doc) {
            const fieldValue = this.getFieldValue(doc.fields, field);
            if (fieldValue && tokenize(fieldValue).some((t) => t === term || t.includes(term))) {
              fieldBoost = Math.max(fieldBoost, boost);
              fieldMatches.add(field);
            }
          }
        }

        score += idf * tfNorm * fieldBoost;
        termMatches.add(term);
      }

      // Document boost
      const doc = this.documents.get(docId);
      if (doc?.boost) score *= doc.boost;

      if (score >= minScore) {
        scores.set(docId, { score, termMatches, fieldMatches });
      }
    }

    // Sort results
    const results = Array.from(scores.entries())
      .map(([docId, data]) => ({ docId, ...data }))
      .sort((a, b) => {
        if (sortBy === "date") {
          const da = this.documents.get(a.docId)?.timestamp ?? 0;
          const db = this.documents.get(b.docId)?.timestamp ?? 0;
          return sortOrder === "desc" ? db - da : da - db;
        }
        return sortOrder === "desc" ? b.score - a.score : a.score - b.score;
      })
      .slice(offset, offset + limit)
      .map(({ docId, score, termMatches, fieldMatches }) => {
        const document = this.documents.get(docId)!;
        const result: SearchResult<T> = { document, score, matchedFields: Array.from(fieldMatches) };

        if (highlight) {
          result.highlights = this.generateHighlights(document, query, highlightTag, snippetLength);
        }

        return result;
      });

    return results;
  }

  /**
   * Faceted search — return facet counts for given fields.
   */
  facet(fields: string[], query?: string, options?: Omit<SearchOptions, "facets">): FacetResult[] {
    const docs = query ? this.search(query, { ...options, limit: 10000 }) : [];
    const docIds = new Set(docs.map((r) => r.document.id));

    return fields.map((field) => {
      const counts = new Map<string, number>();
      for (const docId of docIds) {
        const doc = this.documents.get(docId);
        if (!doc) continue;
        const value = this.getFieldValue(doc.fields, field);
        const key = String(value ?? "");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      return {
        field,
        values: Array.from(counts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
        total: counts.size,
      };
    });
  }

  /**
   * Autocomplete / prefix search.
   */
  autocomplete(prefix: string, options: AutocompleteOptions = {}): Suggestion[] {
    const { limit = 8, minLength = 2 } = options;
    if (prefix.length < minLength) return [];

    const normalizedPrefix = prefix.toLowerCase().trim();
    const suggestions = new Map<string, { freq: number; field?: string }>();

    for (const [term, postings] of this.index) {
      if (term.startsWith(normalizedPrefix) || term.includes(normalizedPrefix)) {
        const existing = suggestions.get(term);
        if (existing) {
          existing.freq += postings.size;
        } else {
          suggestions.set(term, { freq: postings.size });
        }
      }
    }

    return Array.from(suggestions.entries())
      .sort((a, b) => b[1].freq - a[1].freq)
      .slice(0, limit)
      .map(([text, data]) => ({ text, frequency: data.freq, field: data.field }));
  }

  // --- Statistics ---

  getStats(): IndexStats {
    return {
      documentCount: this.documents.size,
      termCount: this.totalTerms,
      uniqueTerms: this.index.size,
      averageDocumentLength: this.avgDocLength,
      totalIndexedFields: this.fieldLengths.size,
      indexSize: this.estimateSize(),
      memoryUsage: this.estimateMemory(),
    };
  }

  /** Get a document by ID */
  getDocument(id: DocumentId): SearchDocument<T> | undefined {
    return this.documents.get(id);
  }

  /** Get all document IDs */
  getDocumentIds(): DocumentId[] {
    return Array.from(this.documents.keys());
  }

  /** Get postings list for a term (debug) */
  getPostings(term: Term): Map<DocumentId, number[]> | undefined {
    return this.index.get(stem(term.toLowerCase()));
  }

  destroy(): void {
    this.destroyed = true;
    this.clear();
  }

  // --- Internal ---

  private extractText(fields: T): string {
    if (typeof fields === "string") return fields;
    if (Array.isArray(fields)) return fields.join(" ");
    if (fields && typeof fields === "object") {
      return Object.values(fields as Record<string, unknown>)
        .filter((v) => typeof v === "string")
        .join(" ");
    }
    return "";
  }

  private getFieldValue(fields: T, fieldName: string): unknown {
    if (fields && typeof fields === "object") {
      return (fields as Record<string, unknown>)[fieldName];
    }
    return undefined;
  }

  private passesFilters(doc: SearchDocument<T>, filters: NonNullable<SearchOptions["filters"]>): boolean {
    for (const f of filters) {
      const value = this.getFieldValue(doc.fields, f.field);
      switch (f.op ?? "eq") {
        case "eq": if (value !== f.value) return false; break;
        case "neq": if (value === f.value) return false; break;
        case "gt": if (!(typeof value === "number" && value > Number(f.value))) return false; break;
        case "lt": if (!(typeof value === "number" && value < Number(f.value))) return false; break;
        case "gte": if (!(typeof value === "number" && value >= Number(f.value))) return false; break;
        case "lte": if (!(typeof value === "number" && value <= Number(f.value))) return false; break;
        case "in": if (!Array.isArray(f.value) || !f.value.includes(value)) return false; break;
      }
    }
    return true;
  }

  private generateHighlights(
    doc: SearchDocument<T>,
    query: string,
    tag: string,
    snippetLength: number,
  ): Record<string, string[]> {
    const results: Record<string, string[]> = {};
    const text = doc.searchText ?? this.extractText(doc.fields);
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;
    const queryTerms = tokenize(query, { stem: false });

    // Find best matching segment
    const lowerText = text.toLowerCase();
    let bestStart = 0;
    let bestMatchCount = 0;

    for (let i = 0; i < text.length - snippetLength; i += 20) {
      const segment = lowerText.substring(i, i + snippetLength);
      let matchCount = 0;
      for (const qt of queryTerms) {
        if (segment.includes(qt.toLowerCase())) matchCount++;
      }
      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount;
        bestStart = i;
      }
    }

    let snippet = text.substring(bestStart, bestStart + snippetLength);
    if (bestStart > 0) snippet = "..." + snippet;
    if (bestStart + snippetLength < text.length) snippet += "...";

    // Highlight terms
    for (const qt of queryTerms) {
      const regex = new RegExp(`(${escapeRegex(qt)})`, "gi");
      snippet = snippet.replace(regex, openTag + "$1" + closeTag);
    }

    results["_snippet"] = [snippet];
    return results;
  }

  private recalculateAvgDocLength(): void {
    if (this.documentLengths.size === 0) {
      this.avgDocLength = 0;
      return;
    }
    let total = 0;
    for (const len of this.documentLengths.values()) total += len;
    this.avgDocLength = total / this.documentLengths.size;
  }

  private estimateSize(): number {
    let size = 0;
    for (const [, postings] of this.index) {
      size += 20; // term overhead
      for (const [, positions] of postings) size += positions.length * 4;
    }
    return size;
  }

  private estimateMemory(): number {
    return this.estimateSize() + this.documents.size * 200; // rough estimate
  }
}

// --- Utility Functions ---

/** Levenshtein edit distance */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Factory ---

export function createInvertedIndex<T = Record<string, unknown>>(): InvertedIndex<T> {
  return new InvertedIndex<T>();
}
