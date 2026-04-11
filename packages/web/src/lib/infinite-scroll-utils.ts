/**
 * Infinite Scroll Utilities: Infinite scrolling with intersection observer,
 * loading states, error recovery, end detection, scroll position restoration,
 * and debounced callbacks.
 */

// --- Types ---

export interface InfiniteScrollOptions {
  /** Scrollable container element (default = window) */
  container?: HTMLElement | Window;
  /** Callback to load more data — returns true if more data available */
  loadMore: () => Promise<boolean>;
  /** Distance from bottom (px) to trigger load */
  threshold?: number;
  /** Whether currently loading */
  isLoading?: boolean;
  /** Whether all data has been loaded */
  isComplete?: boolean;
  /** Show loading indicator? */
  showLoader?: boolean;
  /** Show end-of-list message? */
  showEndMessage?: boolean;
  /** End message text */
  endMessage?: string;
  /** Error message when load fails */
  errorMessage?: string;
  /** On retry after error */
  onRetry?: () => void;
  /** Custom loader element */
  loaderElement?: HTMLElement;
  /** Custom end element */
  endElement?: HTMLElement;
  /** Custom error element */
  errorElement?: HTMLElement;
  /** Enable scroll position saving/restore */
  saveScrollPosition?: boolean;
  /** Storage key for saved position */
  storageKey?: string;
  /** Debounce interval for rapid scrolls (ms) */
  debounceMs?: number;
}

export interface InfiniteScrollInstance {
  /** The sentinel/watcher element */
  sentinel: HTMLElement;
  /** Manually trigger a load */
  load(): Promise<void>;
  /** Reset state (clear complete, re-enable) */
  reset(): void;
  /** Mark as complete (no more data) */
  complete(): void;
  /** Set loading state */
  setLoading(loading: boolean): void;
  /** Set error state */
  setError(message?: string): void;
  /** Clear error state */
  clearError(): void;
  /** Get current state */
  getState(): { isLoading: boolean; isComplete: boolean; hasError: boolean };
  /** Save current scroll position */
  savePosition(): void;
  /** Restore saved scroll position */
  restorePosition(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create an infinite scroll manager.
 *
 * @example
 * ```ts
 * const scroller = createInfiniteScroll({
 *   container: listContainer,
 *   threshold: 200,
 *   loadMore: async () => {
 *     const newItems = await fetchItems(page++);
 *     appendItems(newItems);
 *     return newItems.length > 0;
 *   },
 * });
 * ```
 */
export function createInfiniteScroll(options: InfiniteScrollOptions): InfiniteScrollInstance {
  const {
    container: containerEl,
    loadMore,
    threshold = 200,
    isLoading = false,
    isComplete = false,
    showLoader = true,
    showEndMessage = true,
    endMessage = "No more items",
    errorMessage = "Failed to load. Tap to retry.",
    onRetry,
    loaderElement,
    endElement,
    errorElement,
    saveScrollPosition: shouldSavePosition = false,
    storageKey = "inf-scroll-pos",
    debounceMs = 100,
  } = options;

  let _isLoading = isLoading;
  let _isComplete = isComplete;
  let _hasError = false;
  let _errorMsg = "";
  let _destroyed = false;

  // Determine actual container
  const container = containerEl ?? window;
  const isWindow = container === window || container === document.body;

  // Sentinel element
  const sentinel = document.createElement("div");
  sentinel.className = "infinite-scroll-sentinel";
  sentinel.style.cssText = "width:100%;height:1px;pointer-events:none;";
  if (!isWindow && container instanceof HTMLElement) {
    container.appendChild(sentinel);
  } else {
    document.body.appendChild(sentinel);
  }

  // Status elements
  const statusArea = document.createElement("div");
  statusArea.className = "infinite-scroll-status";
  statusArea.style.cssText =
    "display:flex;flex-direction:column;align-items:center;padding:16px;gap:8px;";

  // Loader
  let loader: HTMLElement;
  if (loaderElement) {
    loader = loaderElement.cloneNode(true) as HTMLElement;
  } else {
    loader = document.createElement("div");
    loader.className = "inf-scroll-loader";
    loader.innerHTML = `<div style="width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.6s linear infinite;"></div>`;
    loader.style.display = showLoader ? "flex" : "none";
  }
  statusArea.appendChild(loader);

  // End message
  let endMsg: HTMLElement;
  if (endElement) {
    endMsg = endElement.cloneNode(true) as HTMLElement;
  } else {
    endMsg = document.createElement("div");
    endMsg.className = "inf-scroll-end";
    endMsg.textContent = endMessage;
    endMsg.style.cssText = "font-size:13px;color:#9ca3af;text-align:center;display:none;";
  }
  statusArea.appendChild(endMsg);

  // Error area
  let errArea: HTMLElement;
  if (errorElement) {
    errArea = errorElement.cloneNode(true) as HTMLElement;
  } else {
    errArea = document.createElement("div");
    errArea.className = "inf-scroll-error";
    errArea.style.cssText = "text-align:center;display:none;";

    const errText = document.createElement("span");
    errText.textContent = errorMessage;
    errText.style.cssText = "font-size:13px;color:#dc2626;margin-right:8px;";
    errArea.appendChild(errText);

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.textContent = "Retry";
    retryBtn.style.cssText =
      "padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;" +
      "background:#fff;color:#374151;font-size:12px;cursor:pointer;";
    retryBtn.addEventListener("click", () => { clearError(); onRetry?.(); });
    errArea.appendChild(retryBtn);
  }
  statusArea.appendChild(errArea);

  // Insert status area after sentinel
  sentinel.after(statusArea);

  // Update visibility based on state
  function updateStatusVisibility(): void {
    loader.style.display = _isLoading && showLoader ? "flex" : "none";
    endMsg.style.display = _isComplete && showEndMessage ? "block" : "none";
    errArea.style.display = _hasError ? "block" : "none";
  }

  updateStatusVisibility();

  // Intersection Observer
  let observer: IntersectionObserver | null = null;

  function setupObserver(): void {
    if (_destroyed) return;
    cleanupObserver();

    observer = new IntersectionObserver(
      (entries) => {
        if (_destroyed) return;
        const entry = entries[0];
        if (entry.isIntersecting && !_isLoading && !_isComplete && !_hasError) {
          instance.load();
        }
      },
      {
        root: isWindow ? undefined : container as HTMLElement,
        rootMargin: `0px 0px ${threshold}px 0px`,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
  }

  function cleanupObserver(): void {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  setupObserver();

  // Scroll position save/restore
  function getScrollContainer(): HTMLElement | Window {
    return container as HTMLElement | Window;
  }

  function getScrollTop(): number {
    if (isWindow) return window.scrollY || document.documentElement.scrollTop;
    return (container as HTMLElement).scrollTop;
  }

  function setScrollTop(pos: number): void {
    if (isWindow) {
      window.scrollTo({ top: pos, behavior: "instant" });
    } else {
      (container as HTMLElement).scrollTop = pos;
    }
  }

  // Debounced scroll handler for position saving
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;

  if (shouldSavePosition) {
    const scrollTarget = isWindow ? window : container as HTMLElement;
    scrollTarget.addEventListener("scroll", () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => savePosition(), debounceMs);
    }, { passive: true });
  }

  // Inject spin keyframes
  injectSpinKeyframes();

  // --- Instance ---

  async function load(): Promise<void> {
    if (_isLoading || _isComplete || _hasError || _destroyed) return;
    _isLoading = true;
    updateStatusVisibility();

    try {
      const hasMore = await loadMore();
      _isLoading = false;
      if (!hasMore) _isComplete = true;
    } catch {
      _isLoading = true; // Keep showing loader during error
      _hasError = true;
      _errorMsg = errorMessage;
      _isLoading = false;
    }

    updateStatusVisibility();
  }

  function reset(): void {
    _isComplete = false;
    _hasError = false;
    _errorMsg = "";
    _isLoading = false;
    updateStatusVisibility();
    setupObserver();
  }

  function complete(): void {
    _isComplete = true;
    updateStatusVisibility();
    cleanupObserver();
  }

  function setLoading(loading: boolean): void {
    _isLoading = loading;
    updateStatusVisibility();
  }

  function setError(msg?: string): void {
    _hasError = true;
    _errorMsg = msg ?? errorMessage;
    updateStatusVisibility();
  }

  function clearError(): void {
    _hasError = false;
    _errorMsg = "";
    updateStatusVisibility();
  }

  function getState() {
    return { isLoading: _isLoading, isComplete: _isComplete, hasError: _hasError };
  }

  function savePosition(): void {
    if (!shouldSavePosition) return;
    try {
      sessionStorage.setItem(storageKey, String(getScrollTop()));
    } catch {}
  }

  function restorePosition(): void {
    if (!shouldSavePosition) return;
    try {
      const pos = sessionStorage.getItem(storageKey);
      if (pos) setScrollTop(Number(pos));
    } catch {}
  }

  function destroy(): void {
    _destroyed = true;
    cleanupObserver();
    sentinel.remove();
    statusArea.remove();
  }

  const instance: InfiniteScrollInstance = {
    sentinel, load, reset, complete, setLoading, setError, clearError,
    getState, savePosition, restorePosition, destroy,
  };

  return instance;
}

function injectSpinKeyframes(): void {
  if (document.getElementById("inf-scroll-styles")) return;
  const style = document.createElement("style");
  style.id = "inf-scroll-styles";
  style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}
