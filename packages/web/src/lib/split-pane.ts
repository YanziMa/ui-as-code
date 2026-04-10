/**
 * Split Pane: Resizable split pane layout system with horizontal/vertical
 * orientation, nested splits, min/max size constraints, drag handles,
 * keyboard support, persistence, and collapse/expand functionality.
 */

// --- Types ---

export type SplitOrientation = "horizontal" | "vertical";
export type SplitCollapseDirection = "prev" | "next";

export interface SplitPaneOptions {
  /** Primary element (left/top) */
  primary: HTMLElement;
  /** Secondary element (right/bottom) */
  secondary: HTMLElement;
  /** Container element */
  container: HTMLElement;
  /** Orientation (default: "horizontal") */
  orientation?: SplitOrientation;
  /** Initial size of primary pane in px or % (default: "50%") */
  initialSize?: string | number;
  /** Minimum size of primary pane (default: 100px) */
  minSize?: number | string;
  /** Maximum size of primary pane (default: 80%) */
  maxSize?: number | string;
  /** Allow collapsing to 0 (default: true) */
  collapsible?: boolean;
  /** Collapse direction (default: "prev") */
  collapseDirection?: SplitCollapseDirection;
  /** Show resize handle (default: true) */
  showHandle?: boolean;
  /** Handle size in px (default: 6) */
  handleSize?: number;
  /** Snap to edges within this threshold px (default: 8) */
  snapThreshold?: number;
  /** Animation duration for collapse/expand (ms, default: 200) */
  animationDuration?: number;
  /** Double-click handle to collapse */
  doubleClickToCollapse?: boolean;
  /** Persist size to localStorage */
  persistKey?: string;
  /** Callback on resize */
  onResize?: (size: number, percent: number) => void;
  /** Callback on drag start */
  onDragStart?: () => void;
  /** Callback on drag end */
  onDragEnd?: (size: number) => void;
  /** Callback on collapse */
  onCollapse?: () => void;
  /** Callback on expand */
  onExpand?: () => void;
  /** Custom CSS class for the handle */
  handleClass?: string;
  /** Custom cursor style */
  cursor?: string;
}

export interface SplitPaneInstance {
  /** Current primary pane size in pixels */
  getSize(): number;
  /** Set primary pane size */
  setSize(size: number): void;
  /** Get size as percentage */
  getPercent(): number;
  /** Collapse primary pane */
  collapse(): void;
  /** Expand from collapsed state */
  expand(): void;
  /** Toggle collapsed state */
  toggleCollapse(): void;
  /** Check if collapsed */
  isCollapsed(): boolean;
  /** Destroy and cleanup */
  destroy(): void;
  /** Refresh layout (call after container resize) */
  refresh(): void;
}

// --- Split Pane Manager ---

export function createSplitPane(options: SplitPaneOptions): SplitPaneInstance {
  const {
    primary,
    secondary,
    container,
    orientation = "horizontal",
    initialSize = "50%",
    minSize = 100,
    maxSize = "80%",
    collapsible = true,
    collapseDirection = "prev",
    showHandle = true,
    handleSize = 6,
    snapThreshold = 8,
    animationDuration = 200,
    doubleClickToCollapse = true,
    persistKey,
    ...callbacks
  } = options;

  let currentSize = resolveInitialSize(initialSize);
  let isCollapsedState = false;
  let preCollapseSize = currentSize;

  // Restore persisted size
  if (persistKey) {
    try {
      const saved = localStorage.getItem(`sp:${persistKey}`);
      if (saved !== null) currentSize = parseFloat(saved);
      const savedCollapsed = localStorage.getItem(`sp:${persistKey}:collapsed`);
      if (savedCollapsed === "true") { isCollapsedState = true; preCollapseSize = currentSize; }
    } catch {}
  }

  // Setup container
  container.style.display = "flex";
  container.style.flexDirection = orientation === "horizontal" ? "row" : "column";
  container.style.overflow = "hidden";

  // Setup panes
  primary.style.flexShrink = "0";
  primary.style.overflow = "auto";
  secondary.style.flex = "1";
  secondary.style.overflow = "auto";
  secondary.style.minWidth = "0";
  secondary.style.minHeight = "0";

  // Create handle
  const handle = document.createElement("div");
  handle.className = `sp-handle ${options.handleClass ?? ""}`;
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", orientation);
  handle.tabIndex = 0;

  const isHorizontal = orientation === "horizontal";
  handle.style.cssText = `
    ${isHorizontal ? "width" : "height"}: ${handleSize}px;
    ${isHorizontal ? "height" : "width"}: 100%;
    flex-shrink: 0;
    cursor: options.cursor ?? (isHorizontal ? "col-resize" : "row-resize");
    background: transparent;
    position: relative;
    z-index: 1;
    transition: background 0.15s ease;
    display: ${showHandle ? "flex" : "none"};
    align-items: center;
    justify-content: center;
  `;

  // Insert handle between panes
  container.insertBefore(handle, secondary);

  // Apply initial size
  applySize(currentSize);

  // Drag state
  let dragging = false;
  let dragStartPos = 0;
  let dragStartSize = 0;

  // --- Event Handlers ---

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }

  function onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    if (touch) startDrag(touch.clientX, touch.clientY);
  }

  function startDrag(clientX: number, clientY: number): void {
    dragging = true;
    dragStartPos = isHorizontal ? clientX : clientY;
    dragStartSize = currentSize;

    document.body.style.cursor = options.cursor ?? (isHorizontal ? "col-resize" : "row-resize");
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    callbacks.onDragStart?.();
    handle.classList.add("sp-active");
  }

  function onMouseMove(e: MouseEvent): void { handleMove(e.clientX, e.clientY); }
  function onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) handleMove(touch.clientX, touch.clientY);
  }

  function handleMove(clientX: number, clientY: number): void {
    if (!dragging) return;

    const pos = isHorizontal ? clientX : clientY;
    const delta = pos - dragStartPos;
    const containerSize = isHorizontal ? container.clientWidth : container.clientHeight;
    let newSize = dragStartSize + delta;

    // Apply constraints
    const [minPx, maxPx] = getConstraints(containerSize);
    newSize = Math.max(minPx, Math.min(maxPx, newSize));

    // Snap behavior
    if (collapsible && snapThreshold > 0) {
      if (newSize <= snapThreshold) newSize = 0;
      else if (newSize >= containerSize - snapThreshold) newSize = containerSize;
    }

    currentSize = newSize;
    isCollapsedState = currentSize <= 0;
    applySize(currentSize);
    callbacks.onResize?.(currentSize, currentSize / containerSize);
  }

  function onMouseUp(): void { endDrag(); }
  function onTouchEnd(): void { endDrag(); }

  function endDrag(): void {
    if (!dragging) return;
    dragging = false;

    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);

    handle.classList.remove("sp-active");
    persist();
    callbacks.onDragEnd?.(currentSize);
  }

  // Double-click to collapse
  if (doubleClickToCollapse) {
    handle.addEventListener("dblclick", () => instance.toggleCollapse());
  }

  // Keyboard support
  handle.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 50 : 10;
    const containerSize = isHorizontal ? container.clientWidth : container.clientHeight;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        if (!isHorizontal || e.key === "ArrowLeft") {
          e.preventDefault();
          instance.setSize(Math.max(0, currentSize - step));
        }
        break;
      case "ArrowRight":
      case "ArrowDown":
        if (!isHorizontal || e.key === "ArrowRight") {
          e.preventDefault();
          instance.setSize(Math.min(containerSize, currentSize + step));
        }
        break;
      case "Home":
        e.preventDefault();
        instance.setSize(resolveMinSize());
        break;
      case "End":
        e.preventDefault();
        instance.setSize(containerSize);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        instance.toggleCollapse();
        break;
    }
  });

  handle.addEventListener("mousedown", onMouseDown);
  handle.addEventListener("touchstart", onTouchStart, { passive: true });

  // Hover effect
  handle.addEventListener("mouseenter", () => { if (!dragging) handle.classList.add("sp-hover"); });
  handle.addEventListener("mouseleave", () => { handle.classList.remove("sp-hover"); });

  // Window resize
  const resizeObserver = new ResizeObserver(() => { instance.refresh(); });
  resizeObserver.observe(container);

  // Inject styles
  injectSplitStyles();

  // --- Instance Methods ---

  const instance: SplitPaneInstance = {
    getSize: () => currentSize,

    setSize: (size: number) => {
      const containerSize = isHorizontal ? container.clientWidth : container.clientHeight;
      const [minPx, maxPx] = getConstraints(containerSize);
      currentSize = Math.max(minPx, Math.min(maxPx, size));
      isCollapsedState = currentSize <= 0;
      applySize(currentSize);
      persist();
      callbacks.onResize?.(currentSize, currentSize / containerSize);
    },

    getPercent: () => {
      const total = isHorizontal ? container.clientWidth : container.clientHeight;
      return total > 0 ? (currentSize / total) * 100 : 0;
    },

    collapse: () => {
      if (!collapsible) return;
      if (!isCollapsedState) preCollapseSize = currentSize;
      isCollapsedState = true;
      currentSize = 0;
      animateSize(0);
      callbacks.onCollapse?.();
      persist();
    },

    expand: () => {
      if (!isCollapsedState) return;
      isCollapsedState = false;
      const targetSize = preCollapseSize ?? resolveMinSize();
      currentSize = targetSize;
      animateSize(targetSize);
      callbacks.onExpand?.();
      persist();
    },

    toggleCollapse: () => {
      isCollapsedState ? instance.expand() : instance.collapse();
    },

    isCollapsed: () => isCollapsedState,

    destroy: () => {
      endDrag();
      handle.remove();
      resizeObserver.disconnect();
      primary.style.cssText = "";
      secondary.style.cssText = "";
      container.style.cssText = "";
    },

    refresh: () => {
      if (!isCollapsedState) applySize(currentSize);
    },
  };

  return instance;

  // --- Internal Helpers ---

  function resolveInitialSize(initial: string | number): number {
    if (typeof initial === "number") return initial;
    const containerSize = isHorizontal ? container.clientWidth : container.clientHeight;
    if (initial.endsWith("%")) {
      return containerSize * (parseFloat(initial) / 100);
    }
    return parseFloat(String(initial)) ?? containerSize / 2;
  }

  function getConstraints(total: number): [number, number] {
    const minPx = typeof minSize === "string" && minSize.endsWith("%")
      ? total * (parseFloat(minSize) / 100)
      : typeof minSize === "number"
        ? minSize
        : 100;

    const maxPx = typeof maxSize === "string" && maxSize.endsWith("%")
      ? total * (parseFloat(maxSize) / 100)
      : typeof maxSize === "number"
        ? maxSize
        : total * 0.8;

    return [minPx, maxPx];
  }

  function resolveMinSize(): number {
    const total = isHorizontal ? container.clientWidth : container.clientHeight;
    return getConstraints(total)[0];
  }

  function applySize(size: number): void {
    if (isHorizontal) {
      primary.style.width = `${Math.max(0, size)}px`;
    } else {
      primary.style.height = `${Math.max(0, size)}px`;
    }
  }

  function animateSize(targetSize: number): void {
    const startSize = isHorizontal ? primary.offsetWidth : primary.offsetHeight;
    const startTime = performance.now();

    function step(now: number): void {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      const current = startSize + (targetSize - startSize) * eased;

      applySize(current);
      callbacks.onResize?.(current, current / (isHorizontal ? container.clientWidth : container.clientHeight));

      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function persist(): void {
    if (persistKey) {
      try {
        localStorage.setItem(`sp:${persistKey}`, String(currentSize));
        localStorage.setItem(`sp:${persistKey}:collapsed`, String(isCollapsedState));
      } catch {}
    }
  }
}

// --- Styles ---

function injectSplitStyles(): void {
  if (document.getElementById("sp-styles")) return;
  const style = document.createElement("style");
  style.id = "sp-styles";
  style.textContent = `
    .sp-handle::before {
      content: ""; position: absolute; ${""/* center line */}
      background: #ddd; border-radius: 2px; transition: background 0.15s;
    }
    .sp-handle.sp-horizontal::before { width: 2px; height: 24px; }
    .sp-handle.sp-vertical::before { height: 2px; width: 24px; }
    .sp-handle:hover::before, .sp-handle.sp-hover::before { background: #007aff; }
    .sp-handle.sp-active::before { background: #007aff; }
    .sp-handle.sp-active { background: #007aff10; }
  `;
  document.head.appendChild(style);
}
