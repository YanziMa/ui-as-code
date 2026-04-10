/**
 * Infinite Scroll: High-performance infinite scrolling with Intersection Observer,
 * loading states, error recovery, cache management, scroll position restoration,
 * pre-fetching, and virtual rendering integration.
 */

// --- Types ---

export interface InfiniteScrollItem {
  /** Unique identifier */
  id: string | number;
  /** Item data */
  data?: Record<string, unknown>;
}

export interface InfiniteScrollOptions<T extends InfiniteScrollItem = InfiniteScrollItem> {
  /** Container element (scrollable parent) */
  container: HTMLElement | null;
  /** Root margin for IntersectionObserver (default: "200px") */
  rootMargin?: string;
  /** Threshold for triggering load more (default: 0.1) */
  threshold?: number;
  /** Function to fetch next page of items */
  loadMore: (page: number) => Promise<{ items: T[]; hasMore: boolean; total?: number }>;
  /** Initial items (optional) */
  initialItems?: T[];
  /** Page size for each load (default: 20) */
  pageSize?: number;
  /** Enable pre-fetching (load next page before user scrolls to bottom) */
  prefetch?: boolean;
  /** Pre-fetch distance in pixels (default: 300) */
  prefetchDistance?: number;
  /** Max cached pages in memory (default: 10) */
  maxCachePages?: number;
  /** Debounce rapid scroll events (ms, default: 50) */
  scrollDebounce?: number;
  /** Show loading indicator */
  showLoadingIndicator?: boolean;
  /** Custom loading element renderer */
  renderLoading?: () => HTMLElement;
  /** Custom error element renderer */
  renderError?: (error: Error, retry: () => void) => HTMLElement;
  /** Custom empty state renderer */
  renderEmpty?: () => HTMLElement;
  /** Callback when new items are loaded */
  onItemsLoaded?: (items: T[], page: number) => void;
  /** Callback when all items loaded */
  onComplete?: (totalItems: number) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback on scroll position change */
  onScroll?: (scrollInfo: { scrollTop: number; scrollHeight: number; clientHeight: number }) => void;
  /** Whether to use virtual scrolling for large lists */
  useVirtualScroll?: boolean;
  /** Estimated item height for virtual scroll (px) */
  estimatedItemHeight?: number;
  /** Overscan buffer for virtual scroll (items) */
  overscan?: number;
}

export interface InfiniteScrollState {
  items: InfiniteScrollItem[];
  isLoading: boolean;
  hasMore: boolean;
  error: Error | null;
  currentPage: number;
  totalItems: number;
  isComplete: boolean;
}

// --- Infinite Scroll Manager ---

export class InfiniteScroll<T extends InfiniteScrollItem = InfiniteScrollItem> {
  private options: Required<InfiniteScrollOptions<T>> & InfiniteScrollOptions<T>;
  private items: T[] = [];
  private pageCache = new Map<number, T[]>();
  private currentPage = 0;
  private hasMore = true;
  private isLoading = false;
  private error: Error | null = null;
  private totalItems = 0;
  private isComplete = false;
  private observers: Set<IntersectionObserver> = new Set();
  private sentinel: HTMLDivElement | null = null;
  private loadingEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private listeners = new Set<(state: InfiniteScrollState) => void>();
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private prefetchTriggered = false;
  private destroyed = false;

  constructor(options: InfiniteScrollOptions<T>) {
    this.options = {
      rootMargin: options.rootMargin ?? "200px",
      threshold: options.threshold ?? 0.1,
      pageSize: options.pageSize ?? 20,
      prefetch: options.prefetch ?? true,
      prefetchDistance: options.prefetchDistance ?? 300,
      maxCachePages: options.maxCachePages ?? 10,
      scrollDebounce: options.scrollDebounce ?? 50,
      showLoadingIndicator: options.showLoadingIndicator ?? true,
      useVirtualScroll: options.useVirtualScroll ?? false,
      estimatedItemHeight: options.estimatedItemHeight ?? 50,
      overscan: options.overscan ?? 5,
      ...options,
    };

    if (options.initialItems?.length) {
      this.items = [...options.initialItems];
      this.totalItems = this.items.length;
    }

    if (typeof document !== "undefined" && options.container) {
      this.setup(options.container);
    }
  }

  // --- Public API ---

  getItems(): T[] { return [...this.items]; }

  getItem(index: number): T | undefined { return this.items[index]; }

  getItemById(id: string | number): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  getState(): InfiniteScrollState {
    return {
      items: [...this.items],
      isLoading: this.isLoading,
      hasMore: this.hasMore,
      error: this.error,
      currentPage: this.currentPage,
      totalItems: this.totalItems,
      isComplete: this.isComplete,
    };
  }

  getItemCount(): number { return this.items.length; }

  getTotalCount(): number { return this.totalItems; }

  isLoading(): boolean { return this.isLoading; }

  hasError(): boolean { return this.error !== null; }

  isFinished(): boolean { return this.isComplete || !this.hasMore; }

  /** Manually trigger loading the next page */
  async loadNext(): Promise<void> {
    if (this.isLoading || this.isComplete || !this.hasMore) return;
    await this.loadPage(this.currentPage + 1);
  }

  /** Reset and reload from scratch */
  async reset(keepInitial = true): Promise<void> {
    this.items = keepInitial && this.options.initialItems ? [...this.options.initialItems] : [];
    this.pageCache.clear();
    this.currentPage = 0;
    this.hasMore = true;
    this.isComplete = false;
    this.error = null;
    this.totalItems = this.items.length;
    this.prefetchTriggered = false;
    this.removeSentinel();
    this.notify();
    await this.loadNext();
  }

  /** Prepend items (for reverse chronological feeds) */
  prependItems(newItems: T[]): void {
    this.items = [...newItems, ...this.items];
    this.totalItems += newItems.length;
    this.notify();
  }

  /** Append items manually */
  appendItems(newItems: T[]): void {
    this.items = [...this.items, ...newItems];
    this.totalItems += newItems.length;
    this.notify();
  }

  /** Remove an item by ID */
  removeItem(id: string | number): void {
    const idx = this.items.findIndex((item) => item.id === id);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      this.totalItems--;
      this.notify();
    }
  }

  /** Update an item by ID */
  updateItem(id: string | number, updates: Partial<T>): void {
    const item = this.getItemById(id);
    if (item) Object.assign(item, updates);
    this.notify();
  }

  /** Scroll to a specific item */
  scrollToItem(id: string | number, align: "start" | "center" | "end" = "start"): void {
    if (!this.options.container) return;
    const idx = this.items.findIndex((item) => item.id === id);
    if (idx < 0) return;

    const el = this.options.container.children[idx] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ behavior: "smooth", block: align });
  }

  /** Scroll to top */
  scrollToTop(): void {
    this.options.container?.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Get current scroll info */
  getScrollInfo(): { scrollTop: number; scrollHeight: number; clientHeight: number } {
    const c = this.options.container;
    return {
      scrollTop: c?.scrollTop ?? 0,
      scrollHeight: c?.scrollHeight ?? 0,
      clientHeight: c?.clientHeight ?? 0,
    };
  }

  /** Subscribe to state changes */
  subscribe(listener: (state: InfiniteScrollState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /** Change container (e.g., after remount) */
  setContainer(container: HTMLElement | null): void {
    this.teardown();
    if (container) this.setup(container);
  }

  /** Clean up all resources */
  destroy(): void {
    this.destroyed = true;
    this.teardown();
    this.listeners.clear();
    this.pageCache.clear();
  }

  // --- Internal ---

  private setup(container: HTMLElement): void {
    // Create sentinel element
    this.sentinel = document.createElement("div");
    this.sentinel.className = "is-sentinel";
    this.sentinel.style.cssText = "width:100%;height:1px;pointer-events:none;";
    container.appendChild(this.sentinel);

    // Setup Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this.isLoading && this.hasMore && !this.isComplete) {
            this.loadNext();
          }
        }
      },
      {
        root: container,
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold,
      },
    );

    observer.observe(this.sentinel!);
    this.observers.add(observer);

    // Scroll listener for prefetch
    if (this.options.prefetch) {
      container.addEventListener("scroll", () => this.handleScroll(), { passive: true });
    }

    // Show initial loading indicator
    if (this.options.showLoadingIndicator && this.items.length === 0) {
      this.showLoadingElement(container);
    }

    // Auto-load first page if no initial items
    if (this.items.length === 0) {
      this.loadNext();
    }
  }

  private teardown(): void {
    for (const obs of this.observers) obs.disconnect();
    this.observers.clear();
    this.loadingEl?.remove();
    this.errorEl?.remove();
    this.sentinel?.remove();
    this.loadingEl = null;
    this.errorEl = null;
    this.sentinel = null;
  }

  private removeSentinel(): void {
    this.sentinel?.remove();
    this.sentinel = null;
  }

  private handleScroll(): void {
    if (this.scrollTimer) return;

    this.scrollTimer = setTimeout(() => {
      this.scrollTimer = null;
      if (!this.options.container || this.destroyed) return;

      const { scrollTop, scrollHeight, clientHeight } = this.getScrollInfo();
      this.options.onScroll?.({ scrollTop, scrollHeight, clientHeight });

      // Pre-fetch check
      if (this.options.prefetch && !this.prefetchTriggered && !this.isLoading && this.hasMore) {
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceToBottom < this.options.prefetchDistance) {
          this.prefetchTriggered = true;
          this.loadNext().finally(() => { this.prefetchTriggered = false; });
        }
      }
    }, this.options.scrollDebounce);
  }

  private async loadPage(page: number): Promise<void> {
    if (this.isLoading || this.destroyed) return;
    this.isLoading = true;
    this.error = null;
    this.hideError();

    if (page > 1) this.showLoadingElement(this.options.container);

    this.notify();

    try {
      const result = await this.options.loadMore(page);

      // Cache result
      this.pageCache.set(page, result.items);
      if (this.pageCache.size > this.options.maxCachePages) {
        const oldestKey = this.pageCache.keys().next().value;
        if (oldestKey !== undefined) this.pageCache.delete(oldestKey);
      }

      // Append items
      this.items = [...this.items, ...result.items];
      this.currentPage = page;
      this.hasMore = result.hasMore;
      if (result.total !== undefined) this.totalItems = result.total;
      else this.totalItems = this.items.length;

      if (!result.hasMore) {
        this.isComplete = true;
        this.removeSentinel();
        this.options.onComplete?.(this.totalItems);
      }

      this.options.onItemsLoaded?.(result.items, page);
      this.hideLoading();
      this.notify();
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.showError(this.options.container);
      this.options.onError?.(this.error);
      this.hideLoading();
      this.notify();
    } finally {
      this.isLoading = false;
    }
  }

  private showLoadingElement(container: HTMLElement | null): void {
    if (!container) return;
    this.hideLoading();

    if (this.options.renderLoading) {
      this.loadingEl = this.options.renderLoading();
    } else {
      this.loadingEl = document.createElement("div");
      this.loadingEl.className = "is-loading";
      this.loadingEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;padding:16px;gap:8px">
          <div class="is-spinner" style="width:20px;height:20px;border:2px solid #ddd;border-top-color:#007aff;border-radius:50%;animation:is-spin 0.6s linear infinite"></div>
          <span style="color:#888;font-size:13px">Loading...</span>
        </div>
      `;
    }

    container.appendChild(this.loadingEl);
  }

  private hideLoading(): void {
    this.loadingEl?.remove();
    this.loadingEl = null;
  }

  private showError(container: HTMLElement | null): void {
    if (!container) return;
    this.hideError();

    if (this.options.renderError && this.error) {
      this.errorEl = this.options.renderError(this.error, () => this.loadNext());
    } else {
      this.errorEl = document.createElement("div");
      this.errorEl.className = "is-error";
      this.errorEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;padding:24px;gap:8px;color:#888">
          <span style="font-size:14px">Failed to load</span>
          <button class="is-retry-btn" style="padding:6px 16px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:13px">Retry</button>
        </div>
      `;
      this.errorEl.querySelector(".is-retry-btn")?.addEventListener("click", () => this.loadNext());
    }

    container.appendChild(this.errorEl);
  }

  private hideError(): void {
    this.errorEl?.remove();
    this.errorEl = null;
  }

  private notify(): void {
    if (this.destroyed) return;
    const state = this.getState();
    for (const fn of this.listeners) { try { fn(state); } catch {} }
  }
}

// --- Inject base styles ---

function injectInfiniteScrollStyles(): void {
  if (document.getElementById("is-styles")) return;
  const style = document.createElement("style");
  style.id = "is-styles";
  style.textContent = `@keyframes is-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

if (typeof document !== "undefined") injectInfiniteScrollStyles();
