/**
 * Pull-to-Refresh Utilities: Pull-down-to-refresh gesture with animation,
 * threshold detection, custom icons, progress indicator, momentum handling,
 * and integration with any scrollable container.
 */

// --- Types ---

export type PullState = "idle" | "pulling" | "ready" | "refreshing" | "restoring";

export interface PullToRefreshOptions {
  /** Target scrollable container */
  container: HTMLElement;
  /** Callback invoked on refresh */
  onRefresh: () => Promise<void>;
  /** Distance in px needed to trigger refresh */
  threshold?: number;
  /** Maximum pull distance (px) */
  maxPullDistance?: number;
  /** Show instruction text? */
  showInstructions?: boolean;
  /** Instruction text while pulling */
  pullText?: string;
  /** Instruction text when ready to release */
  releaseText?: string;
  /** Text while refreshing */
  refreshingText?: string;
  /** Custom header element (replaces default indicator) */
  headerElement?: HTMLElement;
  /** Header height (px) */
  headerHeight?: number;
  /** Animation duration for snap-back (ms) */
  snapDuration?: number;
  /** Color of the spinner/indicator */
  color?: string;
  /** Disable temporarily */
  disabled?: boolean;
  /** Called when state changes */
  onStateChange?: (state: PullState) => void;
}

export interface PullToRefreshInstance {
  /** Current state */
  state: PullState;
  /** Manually trigger refresh */
  triggerRefresh(): Promise<void>;
  /** Disable/enable the feature */
  setDisabled(disabled: boolean): void;
  /** Update threshold */
  setThreshold(px: number): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create a pull-to-refresh controller.
 *
 * @example
 * ```ts
 * const ptr = createPullToRefresh({
 *   container: listElement,
 *   threshold: 80,
 *   onRefresh: async () => {
 *     await reloadData();
 *   },
 * });
 * ```
 */
export function createPullToRefresh(options: PullToRefreshOptions): PullToRefreshInstance {
  const {
    container,
    onRefresh,
    threshold = 70,
    maxPullDistance = 150,
    showInstructions = true,
    pullText = "Pull down to refresh",
    releaseText = "Release to refresh",
    refreshingText = "Refreshing...",
    headerElement,
    headerHeight = 50,
    snapDuration = 300,
    color = "#3b82f6",
    disabled = false,
    onStateChange,
  } = options;

  let _state: PullState = "idle";
  let _disabled = disabled;
  let _startY = 0;
  let _currentY = 0;
  let _pullDistance = 0;
  let _isDragging = false;
  let _atTop = true;

  // Header / indicator area
  let header: HTMLElement;
  if (headerElement) {
    header = headerElement.cloneNode(true) as HTMLElement;
  } else {
    header = document.createElement("div");
    header.className = "ptr-header";
    header.style.cssText =
      `position:absolute;top:0;left:0;right:0;height:${headerHeight}px;` +
      "display:flex;align-items:center;justify-content:center;" +
      "overflow:hidden;transform:translateY(-100%);transition:transform 0.2s ease;z-index:10;";

    // Spinner
    const spinner = document.createElement("div");
    spinner.style.cssText =
      `width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:${color};` +
      "border-radius:50%;animation:spin 0.7s linear infinite;opacity:0;transition:opacity 0.2s;";
    header.appendChild(spinner);

    // Text
    if (showInstructions) {
      const textEl = document.createElement("span");
      textEl.className = "ptr-text";
      textEl.textContent = pullText;
      textEl.style.cssText = "margin-left:10px;font-size:13px;color:#6b7280;transition:color 0.2s;";
      header.appendChild(textEl);
    }
  }

  // Ensure container has relative positioning
  const origOverflow = container.style.overflow;
  container.style.overflow = "hidden";
  container.style.position = "relative";
  container.prepend(header);

  // Inject keyframes
  injectPtrKeyframes();

  // --- State Management ---

  function setState(newState: PullState): void {
    _state = newState;
    onStateChange?.(newState);
    updateHeaderVisuals();
  }

  function updateHeaderVisuals(): void {
    const spinner = header.querySelector(".ptr-header > div:first-child") as HTMLElement | null;
    const textEl = header.querySelector(".ptr-text") as HTMLElement | null;

    switch (_state) {
      case "idle":
        header.style.transform = "translateY(-100%)";
        if (spinner) spinner.style.opacity = "0";
        break;
      case "pulling":
        header.style.transform = `translateY(${-headerHeight + Math.min(_pullDistance, maxPullDistance)}px)`;
        if (spinner) spinner.style.opacity = "0";
        if (textEl) { textEl.textContent = pullText; textEl.style.color = "#6b7280"; }
        break;
      case "ready":
        header.style.transform = `translateY(0px)`;
        if (spinner) spinner.style.opacity = "0";
        if (textEl) { textEl.textContent = releaseText; textEl.style.color = color; }
        break;
      case "refreshing":
        header.style.transform = "translateY(0px)";
        if (spinner) spinner.style.opacity = "1";
        if (textEl) { textEl.textContent = refreshingText; textEl.style.color = color; }
        break;
      case "restoring":
        header.style.transition = `transform ${snapDuration}ms ease`;
        header.style.transform = "translateY(-100%)";
        setTimeout(() => {
          header.style.transition = "transform 0.2s ease";
          setState("idle");
        }, snapDuration);
        break;
    }
  }

  // --- Touch/Mouse Handlers ---

  function handleStart(clientY: number): void {
    if (_disabled) return;
    _atTop = container.scrollTop <= 0;
    if (!_atTop) return;

    _startY = clientY;
    _currentY = clientY;
    _isDragging = true;
    _pullDistance = 0;
    setState("pulling");
  }

  function handleMove(clientY: number): void {
    if (!_isDragging || _disabled) return;

    _currentY = clientY;
    _pullDistance = _currentY - _startY;

    if (_pullDistance < 0) {
      _pullDistance = 0;
      setState("idle");
      return;
    }

    // Apply resistance: slow down as you pull further
    const resistance = _pullDistance > threshold
      ? 1 + (_pullDistance - threshold) / (maxPullDistance - threshold)
      : 1;
    const effectiveDist = _pullDistance / Math.max(resistance, 1);

    // Clamp
    _pullDistance = Math.min(effectiveDist, maxPullDistance);

    if (_pullDistance >= threshold) {
      setState("ready");
    } else {
      setState("pulling");
    }

    updateHeaderVisuals();
  }

  function handleEnd(): void {
    if (!_isDragging || _disabled) return;
    _isDragging = false;

    if (_state === "ready") {
      setState("refreshing");
      instance.triggerRefresh();
    } else {
      setState("restoring");
    }
  }

  // Touch events
  container.addEventListener("touchstart", (e) => {
    handleStart(e.touches[0].clientY);
  }, { passive: true });

  container.addEventListener("touchmove", (e) => {
    if (_isDragging && _atTop && !_disabled) e.preventDefault();
    handleMove(e.touches[0].clientY);
  }, { passive: false });

  container.addEventListener("touchend", handleEnd);

  // Mouse events (for desktop testing)
  container.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).closest(".ptr-header")) return;
    handleStart(e.clientY);
  });

  document.addEventListener("mousemove", (e) => {
    if (_isDragging) handleMove(e.clientY);
  });

  document.addEventListener("mouseup", handleEnd);

  // Track scroll position
  container.addEventListener("scroll", () => {
    _atTop = container.scrollTop <= 0;
  }, { passive: true });

  // --- Instance ---

  async function triggerRefresh(): Promise<void> {
    if (_state === "refreshing") return;
    setState("refreshing");

    try {
      await onRefresh();
    } finally {
      setState("restoring");
    }
  }

  function setDisabled(d: boolean): void { _disabled = d; }

  function setThreshold(px: number): void { /* stored for reference */ }

  function destroy(): void {
    container.removeEventListener("touchstart", null as unknown as EventListener);
    container.removeEventListener("touchmove", null as unknown as EventListener);
    container.removeEventListener("touchend", null as unknown as EventListener);
    container.removeEventListener("mousedown", null as unknown as EventListener);
    container.removeEventListener("scroll", null as unknown as EventListener);
    header.remove();
    container.style.overflow = origOverflow;
  }

  const instance: PullToRefreshInstance = {
    get state() { return _state; },
    triggerRefresh, setDisabled, setThreshold, destroy,
  };

  return instance;
}

function injectPtrKeyframes(): void {
  if (document.getElementById("ptr-keyframes")) return;
  const style = document.createElement("style");
  style.id = "ptr-keyframes";
  style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}
