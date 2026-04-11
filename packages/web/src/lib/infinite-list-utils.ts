/**
 * Infinite List Utilities: Infinite scrolling, data fetching with
 * pagination/cursor-based loading, loading states, error recovery,
 * sentinel detection, and scroll-driven data management.
 */

// --- Types ---

export interface FetchPageOptions {
  /** Page number (1-indexed) for offset-based pagination */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Cursor from last item (for cursor-based pagination) */
  cursor?: string | number | null;
  /** Direction: "forward" or "backward" */
  direction?: "forward" | "backward";
}

export interface FetchResult<T> {
  items: T[];
  /** Next page cursor (null = no more items) */
  nextCursor?: string | number | null;
  /** Total count if known */
  totalCount?: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

export interface InfiniteListConfig<T> {
  /** Container element that scrolls */
  container: HTMLElement;
  /** Function to fetch a page of data */
  fetchFn: (options: FetchPageOptions) => Promise<FetchResult<T>>;
  /** Initial data to seed the list */
  initialData?: T[];
  /** Items per page. Default 20 */
  pageSize?: number;
  /** How many px before the end to trigger loading. Default 200 */
  threshold?: number;
  /** Use cursor-based vs page-based pagination. Default false (page-based) */
  cursorBased?: boolean;
  /** Called when new items are loaded */
  onItemsAdded?: (items: T[], isInitial: boolean) => void;
  /** Called when all items are exhausted */
  onExhausted?: () => void;
  /** Called when an error occurs during fetch */
  onError?: (error: Error) => void;
  /** Called when loading state changes */
  onLoadingChange?: (loading: boolean) => void;
  /** Unique ID function for deduplication */
  getKey?: (item: T) => string | number;
  /** Maximum total items to load (safety limit). Default 10000 */
  maxItems?: number;
  /** Debounce rapid scroll events (ms). Default 50 */
  debounceMs?: number;
}

export interface InfiniteListState<T> {
  /** All loaded items */
  items: T[];
  /** Currently loading */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether more items are available */
  hasMore: boolean;
  /** Current page / cursor info */
  currentPage: number;
  nextCursor: string | number | null;
  /** Total loaded count */
  loadedCount: number;
  /** Whether initial load has completed */
  initialized: boolean;
}

// --- Core Infinite List ---

/**
 * InfiniteList - manages infinite scroll data fetching and state.
 *
 * @example
 * ```ts
 * const list = new InfiniteList({
 *   container: scrollEl,
 *   fetchFn: async ({ page }) => {
 *     const res = await fetch(`/api/items?page=${page}&size=20`);
 *     return { items: await res.json(), hasMore: true };
 *   },
 *   onItemsAdded: (items) => render(items),
 * });
 * list.loadInitial();
 * ```
 */
export class InfiniteList<T = unknown> {
  private config: Required<InfiniteListConfig<T>> & { fetchFn: InfiniteListConfig<T>["fetchFn"] };
  private _state: InfiniteListState<T>;
  private nextCursor: string | number | null = null;
  private cleanupFns: Array<() => void> = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private fetching = false;

  constructor(config: InfiniteListConfig<T>) {
    this.config = {
      pageSize: config.pageSize ?? 20,
      threshold: config.threshold ?? 200,
      cursorBased: config.cursorBased ?? false,
      maxItems: config.maxItems ?? 10000,
      debounceMs: config.debounceMs ?? 50,
      getKey: config.getKey ?? ((item: T, i: number) => i),
      ...config,
    };

    this._state = {
      items: config.initialData ?? [],
      loading: false,
      error: null,
      hasMore: true,
      currentPage: 0,
      nextCursor: null,
      loadedCount: config.initialData?.length ?? 0,
      initialized: false,
    };

    this._bindScroll();
  }

  /** Get current state snapshot */
  getState(): InfiniteListState<T> {
    return { ...this._state, items: [...this._state.items] };
  }

  /** Get current items */
  getItems(): T[] { return [...this._state.items]; }

  /** Check if currently loading */
  isLoading(): boolean { return this._state.loading; }

  /** Check if there are more items to load */
  hasMore(): boolean { return this._state.hasMore; }

  /** Load the first page */
  async loadInitial(): Promise<void> {
    if (this._state.initialized && this._state.items.length > 0) return;
    await this._fetchPage({ page: 1, direction: "forward", cursor: null });
    this._state.initialized = true;
  }

  /** Load the next page (called automatically by scroll) */
  async loadNext(): Promise<void> {
    if (this.fetching || !this._state.hasMore || this._state.loadedCount >= this.config.maxItems) return;
    await this._fetchPage({
      page: this._state.currentPage + 1,
      direction: "forward",
      cursor: this.nextCursor,
    });
  }

  /** Load previous page (for bidirectional infinite scroll) */
  async loadPrevious(): Promise<void> {
    if (this.fetching || !this._state.hasMore) return;
    await this._fetchPage({
      page: Math.max(1, this._state.currentPage - 1),
      direction: "backward",
      cursor: null,
    });
  }

  /** Manually prepend items (e.g., for real-time updates) */
  prependItems(items: T[]): void {
    // Deduplicate
    const existingKeys = new Set(this._state.items.map((item) => this.config.getKey(item)));
    const newItems = items.filter((item) => !existingKeys.has(this.config.getKey(item)));
    this._state.items = [...newItems, ...this._state.items];
    this._state.loadedCount = this._state.items.length;
  }

  /** Manually append items */
  appendItems(items: T[]): void {
    const existingKeys = new Set(this._state.items.map((item) => this.config.getKey(item)));
    const newItems = items.filter((item) => !existingKeys.has(this.config.getKey(item)));
    this._state.items = [...this._state.items, ...newItems];
    this._state.loadedCount = this._state.items.length;
  }

  /** Replace all items (e.g., after filter change) */
  replaceAll(items: T[]): void {
    this._state.items = items;
    this._state.loadedCount = items.length;
    this._state.hasMore = true;
    this._state.currentPage = 0;
    this.nextCursor = null;
  }

  /** Reset to initial state */
  reset(keepInitialData = false): void {
    this._state = {
      items: keepInitialData ? (this.config.initialData ?? []) : [],
      loading: false,
      error: null,
      hasMore: true,
      currentPage: 0,
      nextCursor: null,
      loadedCount: keepInitialData ? (this.config.initialData?.length ?? 0) : 0,
      initialized: false,
    };
    this.nextCursor = null;
  }

  /** Retry last failed fetch */
  async retry(): Promise<void> {
    if (!this._state.error) return;
    this._state.error = null;
    await this.loadNext();
  }

  /** Destroy and clean up */
  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  // --- Private ---

  private async _fetchPage(options: FetchPageOptions): Promise<void> {
    if (this.fetching) return;
    this.fetching = true;
    this._state.loading = true;
    this._state.error = null;
    this.config.onLoadingChange?.(true);

    try {
      const result = await this.config.fetchFn({
        ...options,
        pageSize: this.config.pageSize,
      });

      const isNew = this._state.currentPage === 0;

      if (options.direction === "backward") {
        this.prependItems(result.items);
      } else {
        this.appendItems(result.items);
      }

      this.nextCursor = result.nextCursor ?? null;
      this._state.hasMore = result.hasMore;
      this._state.currentPage = options.page ?? this._state.currentPage + 1;

      this.config.onItemsAdded?.(result.items, isNew);
      if (!result.hasMore) {
        this.config.onExhausted?.();
      }
    } catch (err) {
      this._state.error = err instanceof Error ? err : new Error(String(err));
      this.config.onError?.(this._state.error);
    } finally {
      this.fetching = false;
      this._state.loading = false;
      this.config.onLoadingChange?.(false);
    }
  }

  private _bindScroll(): void {
    const el = this.config.container;

    const checkScroll = () => {
      if (this.fetching || !this._state.hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = el;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceToBottom < this.config.threshold) {
        this.loadNext();
      }
    };

    const onScroll = () => {
      if (this.config.debounceMs > 0) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(checkScroll, this.config.debounceMs);
      } else {
        checkScroll();
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    this.cleanupFns.push(() => el.removeEventListener("scroll", onScroll));

    // Also check initially in case content doesn't fill viewport
    setTimeout(checkScroll, 0);
  }
}

// --- Sentinel / Intersection Observer Loader ---

/**
 * Create a sentinel element that triggers loading when it enters the viewport.
 * Uses IntersectionObserver for efficient detection.
 *
 * @example
 * ```ts
 * const sentinel = createSentinelLoader(container, {
 *   rootMargin: "200px",
 *   onLoad: () => loadMore(),
 * });
 * container.appendChild(sentinel.element);
 * ```
 */
export function createSentinelLoader(
  options: {
    onLoad: () => void;
    rootMargin?: string;
    threshold?: number;
    disabled?: boolean;
  },
): { element: HTMLElement; observe: () => void; unobserve: () => void; destroy: () => void } {
  const element = document.createElement("div");
  element.setAttribute("data-sentinel", "true");
  element.style.cssText = "width:100%;height:1px;pointer-events:none;";

  let observer: IntersectionObserver | null = null;

  const setupObserver = () => {
    if (!IntersectionObserver || options.disabled) return;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            options.onLoad();
          }
        }
      },
      {
        rootMargin: options.rootMargin ?? "200px",
        threshold: options.threshold ?? 0,
      },
    );
    observer.observe(element);
  };

  setupObserver();

  return {
    element,
    observe: () => observer?.observe(element),
    unobserve: () => observer?.unobserve(element),
    destroy: () => {
      observer?.disconnect();
      observer = null;
      element.remove();
    },
  };
}
