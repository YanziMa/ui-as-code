/**
 * Fuzzy Finder / Command Palette: Fast search with fuzzy matching,
 * scoring algorithm, keyboard navigation, history tracking,
 * async data sources, category grouping, action dispatch,
 * and UI rendering utilities.
 */

// --- Types ---

export interface FinderItem {
  id: string;
  title: string;
  /** Subtitle/description shown below title */
  subtitle?: string;
  /** Category/group for organization */
  category?: string;
  /** Icon (emoji, URL, or component name) */
  icon?: string;
  /** Keywords for additional search matching */
  keywords?: string[];
  /** Action to execute when selected */
  action?: () => void | Promise<void>;
  /** Data payload */
  data?: unknown;
  /** Score boost factor (0-1, higher = more relevant) */
  scoreBoost?: number;
  /** Whether item is disabled/grayed out */
  disabled?: boolean;
  /** Shortcut hint text */
  shortcut?: string;
  /** Recent usage timestamp (for sorting) */
  recentAt?: number;
  /** Usage count */
  useCount?: number;
}

export interface FinderOptions {
  /** Maximum results to return */
  maxResults?: number;
  /** Minimum score threshold (0-1) */
  minScore?: number;
  /** Weight title vs keywords vs category in scoring */
  weights?: { title?: number; keywords?: number; category?: number; recency?: number; frequency?: number };
  /** Enable fuzzy matching (vs prefix-only) */
  fuzzy?: boolean;
  /** Case sensitivity */
  caseSensitive?: boolean;
  /** Accent-insensitive diacritic stripping */
  ignoreAccents?: boolean;
  /** Filter to specific categories */
  categories?: string[];
  /** Include recently used items first */
  includeRecent?: boolean;
  /** Recent items max count */
  recentMax?: number;
  /** Async data source loader */
  dataSource?: (query: string) => Promise<FinderItem[]>;
  /** Debounce delay for async searches (ms) */
  debounceMs?: number;
}

export interface SearchResult {
  item: FinderItem;
  score: number;
  matches: Array<{ field: string; value: string; indices: number[] }>;
}

export interface FinderState {
  query: string;
  results: SearchResult[];
  selectedIndex: number;
  isOpen: boolean;
  isLoading: boolean;
  categories: Map<string, SearchResult[]>;
  recentItems: FinderItem[];
  totalMatches: number;
}

export interface FinderHistory {
  items: Array<{ id: string; query: string; selectedId: string; timestamp: number }>;
  maxSize: number;
}

// --- Diacritics Stripping ---

const DIACRITICS: Record<string, string> = {
  '\u00C0': 'A', '\u00C1': 'A', '\u00C2': 'A', '\u00C3': 'A', '\u00C4': 'A', '\u00C5': 'A',
  '\u00E0': 'a', '\u00E1': 'a', '\u00E2': 'a', '\u00E3': 'a', '\u00E4': 'a', '\u00E5': 'a',
  '\u00C7': 'C', '\u00E7': 'c', '\u00D1': 'N', '\u00F1': 'n',
  '\u00D6': 'O', '\u00F3': 'o', '\u00D4': 'O', '\u00F4': 'o', '\u00D2': 'O', '\u00F2': 'o',
  '\u00DA': 'U', '\u00FA': 'u',
};

function stripAccents(str: string): string {
  return str.split("").map((c) => DIACRITICS[c] ?? c).join("");
}

// --- Scoring Algorithm ---

/**
 * Core fuzzy matching with scoring.
 * Uses a character-by-character match with bonus for:
 * - Consecutive matches (adjacency bonus)
 * - Match at word boundaries
 * - Match at start of string
 * - Case exact match bonus
 * - Shorter match penalty (prefer tighter matches)
 */
function fuzzyScore(query: string, target: string, options: Required<Pick<FinderOptions, "weights">>): number {
  const q = options.ignoreAccents ? stripAccents(query) : query;
  const t = options.ignoreAccents ? stripAccents(target) : target;
  const queryLower = options.caseSensitive ? q : q.toLowerCase();
  const targetLower = options.caseSensitive ? t : t.toLowerCase();

  if (!options.fuzzy) {
    // Prefix match only
    if (targetLower.startsWith(queryLower)) {
      const exactBonus = targetLower === queryLower ? 0.3 : 0;
      return 1 + exactBonus;
    }
    if (targetLower.includes(queryLower)) return 0.7;
    return 0;
  }

  // Fuzzy match using Smith-Waterman-like approach
  const qlen = queryLower.length;
  const tlen = targetLower.length;

  if (qlen === 0) return 0;
  if (tlen === 0) return 0;

  const matrix: number[][] = Array(qlen + 1).fill(null).map(() => Array(tlen + 1).fill(0));

  let maxScore = 0;
  let maxPos = 0;

  for (let qi = 1; qi <= qlen; qi++) {
    const qc = queryLower[qi - 1]!;
    let rowMax = 0;
    let rowMaxPos = 0;

    for (let ti = 1; ti <= tlen; ti++) {
      if (qc === targetLower[ti - 1]) {
        // Character matches - diagonal + bonus for consecutive
        const consecutive = matrix[qi - 1][ti - 1] > 0 ? 0.15 : 0;
        const boundary = (ti === 1 || /[\W_\-]/.test(targetLower[ti - 2] ?? "")) ? 0.1 : 0;
        matrix[qi][ti] = matrix[qi - 1][ti - 1] + 1 + consecutive + boundary;
      } else {
        // No match - carry forward the best score (gap penalty)
        matrix[qi][ti] = Math.max(
          matrix[qi][ti - 1] ?? 0,   // gap in query (skip query char)
          matrix[qi - 1][ti] ?? 0,   // gap in target (skip target char)
        ) - 0.08; // gap penalty
      }

      if (matrix[qi][ti]! > rowMax) {
        rowMax = matrix[qi][ti]!;
        rowMaxPos = ti;
      }
    }

    // End-of-row bonus for covering most of the target
    const coverage = rowMax / tlen;
    matrix[qi][tlen] = rowMax + coverage * 0.05;

    if (rowMax > maxScore) {
      maxScore = rowMax;
      maxPos = rowMaxPos;
    }
  }

  // Normalize score
  const normalizedMax = maxScore / qlen;
  // Apply length penalty (longer targets should score lower for same match quality)
  const lengthPenalty = Math.pow(tlen / Math.max(qlen, 1), 0.15) * 0.1;
  return Math.max(0, Math.min(1, normalizedMax - lengthPenalty));
}

// --- Fuzzy Finder ---

export class FuzzyFinder {
  private items: FinderItem[] = [];
  private history: FinderHistory;
  private state: FinderState = {
    query: "", results: [], selectedIndex: 0, isOpen: false,
    isLoading: false, categories: new Map(), recentItems: [],
    totalMatches: 0,
  };
  private listeners = new Set<(state: FinderState) => void>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private defaultOptions: Required<FinderOptions>;

  constructor(items: FinderItem[] = [], options: FinderOptions = {}) {
    this.items = items;
    this.history = { items: [], maxSize: 100 };
    this.defaultOptions = {
      maxResults: options.maxResults ?? 20,
      minScore: options.minScore ?? 0.1,
      weights: { title: 1, keywords: 0.6, category: 0.2, recency: 0.3, frequency: 0.15, ...options.weights },
      fuzzy: options.fuzzy ?? true,
      caseSensitive: options.caseSensitive ?? false,
      ignoreAccents: options.ignoreAccents ?? true,
      categories: options.categories ?? [],
      includeRecent: options.includeRecent ?? true,
      recentMax: options.recentMax ?? 5,
      debounceMs: options.debounceMs ?? 150,
      dataSource: options.dataSource,
    };
  }

  /** Search items matching query */
  search(query: string): FinderState {
    this.state.query = query;
    this.state.isLoading = !!this.defaultOptions.dataSource;

    if (query.length === 0) {
      this.state.results = [];
      this.state.selectedIndex = 0;
      this.state.categories.clear();
      this.state.totalMatches = 0;
      this.notifyListeners();
      return this.state;
    }

    // Debounced async search
    if (this.defaultOptions.dataSource) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(async () => {
        try {
          const asyncItems = await this.defaultOptions.dataSource(query);
          this.items = [...this.items, ...asyncItems];
        } catch {}
        this.doSearch(query);
      }, this.defaultOptions.debounceMs);
      this.notifyListeners();
      return this.state;
    }

    return this.doSearch(query);
  }

  private doSearch(query: string): FinderState {
    const w = this.defaultOptions.weights;
    const results: SearchResult[] = [];

    for (const item of this.items) {
      // Category filter
      if (this.defaultOptions.categories.length > 0 &&
          item.category && !this.defaultOptions.categories.includes(item.category)) continue;

      // Disabled items still searchable but ranked lower
      const disabledPenalty = item.disabled ? 0.3 : 0;

      // Title score
      const titleScore = fuzzyScore(query, item.title, this.defaultOptions) * w.title;

      // Keyword score
      let keywordScore = 0;
      if (item.keywords?.length) {
        keywordScore = Math.max(...item.keywords.map((kw) =>
          fuzzyScore(query, kw, this.defaultOptions)
        )) * w.keywords;
      }

      // Subtitle score
      const subtitleScore = item.subtitle
        ? fuzzyScore(query, item.subtitle, this.defaultOptions) * w.title * 0.5
        : 0;

      // Exact match bonus
      const exactBonus =
        item.title.toLowerCase() === query.toLowerCase() ? 0.4 :
        item.title.toLowerCase().startsWith(query.toLowerCase()) ? 0.2 : 0;

      // Recency bonus
      const recencyBonus = item.recentAt
        ? Math.max(0, 1 - (Date.now() - item.recentAt) / (7 * 24 * 60 * 60 * 1000)) * w.recency
        : 0;

      // Frequency bonus
      const freqBonus = item.useCount
        ? Math.min(1, item.useCount / 20) * w.frequency
        : 0;

      // Custom boost
      const boostBonus = (item.scoreBoost ?? 0) * 0.5;

      const totalScore = titleScore + keywordScore + subtitleScore +
        exactBonus + recencyBonus + freqBonus + boostBonus - disabledPenalty;

      if (totalScore >= this.defaultOptions.minScore) {
        results.push({
          item,
          score: totalScore,
          matches: [{ field: "title", value: item.title, indices: [] }],
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Limit results
    const limited = results.slice(0, this.defaultOptions.maxResults);

    // Group by category
    const categories = new Map<string, SearchResult[]>();
    for (const r of limited) {
      const cat = r.item.category ?? "";
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(r);
    }

    // Add recent items at top if searching
    if (this.defaultOptions.includeRecent && query.length > 0) {
      const recent = this.history.items
        .filter((h) => h.query.toLowerCase().includes(query.toLowerCase()))
        .slice(-this.defaultOptions.recentMax);
      for (const h of recent) {
        const item = this.items.find((i) => i.id === h.selectedId);
        if (item) {
          limited.unshift({ item, score: 2, matches: [{ field: "recent", value: h.query, indices: [] }] });
        }
      }
    }

    this.state.results = limited;
    this.state.selectedIndex = 0;
    this.state.categories = categories;
    this.state.totalMatches = results.length;
    this.state.isLoading = false;
    this.state.isOpen = true;

    this.notifyListeners();
    return this.state;
  }

  /** Select next result */
  selectNext(): FinderItem | null {
    if (this.state.results.length === 0) return null;
    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.results.length;
    this.notifyListeners();
    return this.state.results[this.state.selectedIndex]?.item ?? null;
  }

  /** Select previous result */
  selectPrev(): FinderItem | null {
    if (this.state.results.length === 0) return null;
    this.state.selectedIndex = (this.state.selectedIndex - 1 + this.state.results.length) % this.state.results.length;
    this.notifyListeners();
    return this.state.results[this.state.selectedIndex]?.item ?? null;
  }

  /** Select current result and execute its action */
  selectCurrent(): FinderItem | null {
    const selected = this.state.results[this.state.selectedIndex];
    if (selected?.item.action) {
      selected.item.action();
      this.recordHistory(selected.item);
    }
    return selected?.item ?? null;
  }

  /** Add items to the finder */
  addItems(items: FinderItem[]): void {
    this.items.push(...items);
  }

  /** Remove items by ID */
  removeIds(ids: string[]): void {
    const set = new Set(ids);
    this.items = this.items.filter((i) => !set.has(i.id));
  }

  /** Clear all items */
  clearItems(): void { this.items = []; }

  /** Update query without triggering search */
  setQuery(query: string): void { this.state.query = query; }

  /** Open/close the finder */
  setOpen(open: boolean): void { this.state.isOpen = open; this.notifyListeners(); }

  /** Subscribe to state changes */
  onChange(listener: (state: FinderState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get current state */
  getState(): FinderState { return this.state; }

  // --- History ---

  private recordHistory(item: FinderItem): void {
    this.history.items.push({
      id: item.id,
      query: this.state.query,
      selectedId: item.id,
      timestamp: Date.now(),
    });
    // Trim history
    if (this.history.items.length > this.history.maxSize) {
      this.history.items.shift();
    }
    // Update use count
    item.useCount = (item.useCount ?? 0) + 1;
    item.recentAt = Date.now();
  }

  /** Get search history */
  getHistory(): FinderHistory["items"] { return this.history.items; }

  /** Clear history */
  clearHistory(): void { this.history.items = []; }
}
