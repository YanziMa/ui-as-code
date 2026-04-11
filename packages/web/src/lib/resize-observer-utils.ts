/**
 * Resize Observer Utilities: Enhanced ResizeObserver with debounce, dimension
 * diffing, breakpoint detection, responsive callbacks, element size history,
 * and batched observations.
 */

// --- Types ---

export interface SizeInfo {
  /** Element width in px (content + padding, border-box if applicable) */
  width: number;
  /** Element height in px */
  height: number;
  /** Content rect width (excludes padding/border) */
  contentWidth: number;
  /** Content rect height */
  contentHeight: number;
  /** Inline size (logical property) */
  inlineSize: number;
  /** Block size (logical property) */
  blockSize: number;
  /** Device pixel ratio adjusted width */
  deviceWidth: number;
  /** Device pixel ratio adjusted height */
  deviceHeight: number;
  /** Aspect ratio (width/height) */
  aspectRatio: number;
  /** Timestamp of this observation */
  timestamp: number;
}

export interface SizeDiff {
  /** Previous size */
  previous: SizeInfo | null;
  /** Current size */
  current: SizeInfo;
  /** Width delta (px) */
  dWidth: number;
  /** Height delta (px) */
  dHeight: number;
  /** Whether width changed */
  widthChanged: boolean;
  /** Whether height changed */
  heightChanged: boolean;
  /** Direction of change: "grow" | "shrink" | "none" for each axis */
  widthDirection: "grow" | "shrink" | "none";
  heightDirection: "grow" | "shrink" | "none";
  /** Percentage change in width */
  widthChangePercent: number;
  /** Percentage change in height */
  heightChangePercent: number;
}

export interface Breakpoint {
  /** Breakpoint name */
  name: string;
  /** Min width (px), null = no min */
  minWidth?: number | null;
  /** Max width (px), null = no max */
  maxWidth?: number | null;
  /** Min height (px) */
  minHeight?: number | null;
  /** Max height (px) */
  maxHeight?: number | null;
  /** Callback when breakpoint matches */
  onMatch?: (size: SizeInfo) => void;
  /** Callback when breakpoint unmatches */
  onUnmatch?: (size: SizeInfo) => void;
}

export interface ResizeObserverOptions {
  /** Target element(s) to observe */
  target: HTMLElement | HTMLElement[];
  /** Debounce interval in ms (0 = immediate) */
  debounceMs?: number;
  /** Only fire callback when dimensions actually change? */
  onlyChanges?: boolean;
  /** Include SizeDiff in callback? */
  includeDiff?: boolean;
  /** Enable box option ("content-box" | "border-box") */
  box?: ResizeObserverBoxOptions;
  /** Called with size info on resize */
  onResize?: (size: SizeInfo, diff?: SizeDiff) => void;
  /** Called specifically when width changes */
  onWidthChange?: (width: number, prevWidth: number) => void;
  /** Called specifically when height changes */
  onHeightChange?: (height: number, prevHeight: number) => void;
  /** Breakpoints to track */
  breakpoints?: Breakpoint[];
  /** Called when any breakpoint changes */
  onBreakpointChange?: (matched: string[], size: SizeInfo) => void;
  /** Initial call on observe? (default true) */
  initialCall?: boolean;
  /** Maximum history entries to keep */
  maxHistory?: number;
  /** Custom class name */
  className?: string;
}

export interface ResizeObserverInstance {
  /** The underlying native observer (read-only access) */
  observer: ResizeObserver;
  /** Get current size of the primary target */
  getSize: () => SizeInfo;
  /** Get last N size entries from history */
  getHistory: (count?: number) => SizeInfo[];
  /** Get currently matched breakpoint names */
  getMatchedBreakpoints: () => string[];
  /** Check if a specific breakpoint is matched */
  isBreakpointMatched: (name: string) => boolean;
  /** Manually trigger a check */
  check: () => void;
  /** Add a new breakpoint dynamically */
  addBreakpoint: (bp: Breakpoint) => void;
  /** Remove a breakpoint by name */
  removeBreakpoint: (name: string) => void;
  /** Pause observations */
  pause: () => void;
  /** Resume observations */
  resume: () => void;
  /** Destroy and disconnect */
  destroy: () => void;
}

// --- Helpers ---

function extractSize(entry: ResizeObserverEntry, dpr: number): SizeInfo {
  const rect = entry.contentRect;
  const borderBoxSize = entry.borderBoxSize?.[0];
  const inlineSize = borderBoxSize?.inlineSize ?? rect.width;
  const blockSize = borderBoxSize?.blockSize ?? rect.height;

  return {
    width: inlineSize,
    height: blockSize,
    contentWidth: rect.width,
    contentHeight: rect.height,
    inlineSize,
    blockSize,
    deviceWidth: Math.round(inlineSize * dpr),
    deviceHeight: Math.round(blockSize * dpr),
    aspectRatio: inlineSize > 0 ? blockSize / inlineSize : 0,
    timestamp: performance.now(),
  };
}

function computeDiff(prev: SizeInfo | null, curr: SizeInfo): SizeDiff {
  if (!prev) {
    return {
      previous: null,
      current: curr,
      dWidth: 0,
      dHeight: 0,
      widthChanged: true,
      heightChanged: true,
      widthDirection: "none",
      heightDirection: "none",
      widthChangePercent: 0,
      heightChangePercent: 0,
    };
  }

  const dW = curr.width - prev.width;
  const dH = curr.height - prev.height;

  return {
    previous: prev,
    current: curr,
    dWidth: dW,
    dHeight: dH,
    widthChanged: dW !== 0,
    heightChanged: dH !== 0,
    widthDirection: dW > 0 ? "grow" : dW < 0 ? "shrink" : "none",
    heightDirection: dH > 0 ? "grow" : dH < 0 ? "shrink" : "none",
    widthChangePercent: prev.width > 0 ? (dW / prev.width) * 100 : 0,
    heightChangePercent: prev.height > 0 ? (dH / prev.height) * 100 : 0,
  };
}

// --- Core Factory ---

/**
 * Create an enhanced ResizeObserver with diffing, breakpoints, and debouncing.
 *
 * @example
 * ```ts
 * const ro = createEnhancedResizeObserver({
 *   target: containerEl,
 *   debounceMs: 100,
 *   breakpoints: [
 *     { name: "mobile", maxWidth: 768 },
 *     { name: "tablet", minWidth: 769, maxWidth: 1024 },
 *     { name: "desktop", minWidth: 1025 },
 *   ],
 *   onBreakpointChange: (matched) => console.log("Breakpoints:", matched),
 * });
 *
 * console.log(ro.getSize().width);
 * ```
 */
export function createEnhancedResizeObserver(options: ResizeObserverOptions): ResizeObserverInstance {
  const {
    target,
    debounceMs = 0,
    onlyChanges = false,
    includeDiff = true,
    box = "content-box",
    onResize,
    onWidthChange,
    onHeightChange,
    breakpoints = [],
    onBreakpointChange,
    initialCall = true,
    maxHistory = 50,
  } = options;

  const targets = Array.isArray(target) ? target : [target];
  let _currentSize: SizeInfo | null = null;
  let _previousSize: SizeInfo | null = null;
  const _history: SizeInfo[] = [];
  let _matchedBreakpoints: Set<string> = new Set();
  let _paused = false;
  let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isDestroyed = false;

  // --- Breakpoint checking ---

  function checkBreakpoints(size: SizeInfo): void {
    const previouslyMatched = new Set(_matchedBreakpoints);
    _matchedBreakpoints.clear();

    for (const bp of breakpoints) {
      const wMatch = bp.minWidth != null ? size.width >= bp.minWidth : true;
      const wMatchMax = bp.maxWidth != null ? size.width <= bp.maxWidth : true;
      const hMatch = bp.minHeight != null ? size.height >= bp.minHeight : true;
      const hMatchMax = bp.maxHeight != null ? size.height <= bp.maxHeight : true;

      if (wMatch && wMatchMax && hMatch && hMatchMax) {
        _matchedBreakpoints.add(bp.name);

        // Fire onMatch if newly matched
        if (!previouslyMatched.has(bp.name)) {
          bp.onMatch?.(size);
        }
      } else {
        // Fire onUnmatch if was matched before
        if (previouslyMatched.has(bp.name)) {
          bp.onUnmatch?.(size);
        }
      }
    }

    // Global change callback
    const currentMatched = Array.from(_matchedBreakpoints);
    const prevMatched = Array.from(previouslyMatched);
    if (
      currentMatched.length !== prevMatched.length ||
      currentMatched.some((b) => !previouslyMatched.has(b))
    ) {
      onBreakpointChange?.(currentMatched, size);
    }
  }

  // --- Core handler ---

  function handleEntries(entries: ResizeObserverEntry[]): void {
    if (_paused || isDestroyed) return;

    // Use first entry's data (for single-target; multi-target averages could be added)
    const entry = entries[0]!;
    const dpr = window.devicePixelRatio || 1;
    const newSize = extractSize(entry, dpr);

    // History management
    _history.push(newSize);
    if (_history.length > maxHistory) _history.shift();

    _previousSize = _currentSize;
    _currentSize = newSize;

    // Diff computation
    const diff = includeDiff ? computeDiff(_previousSize, newSize) : undefined;

    // Only-changes filter
    if (onlyChanges && _previousSize && !diff?.widthChanged && !diff?.heightChanged) return;

    // Callbacks
    onResize?.(newSize, diff);

    if (diff) {
      if (diff.widthChanged) onWidthChange?.(newSize.width, _previousSize?.width ?? 0);
      if (diff.heightChanged) onHeightChange?.(newSize.height, _previousSize?.height ?? 0);
    }

    // Breakpoint check
    if (breakpoints.length > 0) {
      checkBreakpoints(newSize);
    }
  }

  // --- Debounced handler ---

  let pendingEntries: ResizeObserverEntry[] = [];

  function debouncedHandler(entries: ResizeObserverEntry[]): void {
    if (debounceMs <= 0) {
      handleEntries(entries);
      return;
    }

    pendingEntries.push(...entries);

    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      handleEntries(pendingEntries);
      pendingEntries = [];
    }, debounceMs);
  }

  // --- Create native observer ---

  const nativeObserver = new ResizeObserver(debouncedHandler);

  // Observe all targets
  for (const t of targets) {
    nativeObserver.observe(t, { box });
  }

  // Initial call
  if (initialCall) {
    // Use a synchronous measurement via getBoundingClientRect as fallback
    requestAnimationFrame(() => {
      if (isDestroyed) return;
      const t = targets[0]!;
      const rect = t.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const initialSize: SizeInfo = {
        width: rect.width,
        height: rect.height,
        contentWidth: rect.width,
        contentHeight: rect.height,
        inlineSize: rect.width,
        blockSize: rect.height,
        deviceWidth: Math.round(rect.width * dpr),
        deviceHeight: Math.round(rect.height * dpr),
        aspectRatio: rect.width > 0 ? rect.height / rect.width : 0,
        timestamp: performance.now(),
      };
      _currentSize = initialSize;
      _history.push(initialSize);
      onResize?.(initialSize);
      if (breakpoints.length > 0) checkBreakpoints(initialSize);
    });
  }

  // --- Public API ---

  function getSize(): SizeInfo {
    if (!_currentSize) {
      // Synchronous fallback
      const t = targets[0]!;
      const rect = t.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      return {
        width: rect.width, height: rect.height,
        contentWidth: rect.width, contentHeight: rect.height,
        inlineSize: rect.width, blockSize: rect.height,
        deviceWidth: Math.round(rect.width * dpr), deviceHeight: Math.round(rect.height * dpr),
        aspectRatio: rect.width > 0 ? rect.height / rect.width : 0,
        timestamp: performance.now(),
      };
    }
    return _currentSize;
  }

  function getHistory(count?: number): SizeInfo[] {
    return count ? _history.slice(-count) : [..._history];
  }

  function getMatchedBreakpoints(): string[] {
    return Array.from(_matchedBreakpoints);
  }

  function isBreakpointMatched(name: string): boolean {
    return _matchedBreakpoints.has(name);
  }

  function check(): void {
    // Force re-check by triggering a synthetic observation
    for (const t of targets) {
      nativeObserver.unobserve(t);
      nativeObserver.observe(t, { box });
    }
  }

  function addBreakpoint(bp: Breakpoint): void {
    breakpoints.push(bp);
    if (_currentSize) checkBreakpoints(_currentSize);
  }

  function removeBreakpoint(name: string): void {
    const idx = breakpoints.findIndex((b) => b.name === name);
    if (idx >= 0) breakpoints.splice(idx, 1);
    _matchedBreakpoints.delete(name);
  }

  function pause(): void { _paused = true; }
  function resume(): void { _paused = false; }

  function destroy(): void {
    isDestroyed = true;
    if (_debounceTimer) clearTimeout(_debounceTimer);
    nativeObserver.disconnect();
    _history.length = 0;
    _matchedBreakpoints.clear();
  }

  return {
    observer: nativeObserver,
    getSize, getHistory,
    getMatchedBreakpoints, isBreakpointMatched,
    check, addBreakpoint, removeBreakpoint,
    pause, resume, destroy,
  };
}
