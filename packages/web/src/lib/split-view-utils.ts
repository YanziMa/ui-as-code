/**
 * Split View Utilities: Resizable split-pane layout with drag handles,
 * min/max constraints, collapse/expand, nested splits, persistence,
 * and keyboard support.
 */

// --- Types ---

export type SplitDirection = "horizontal" | "vertical";
export type SplitCollapseMode = "none" | "first" | "second" | "both";

export interface SplitPaneConfig {
  /** Pane ID */
  id: string;
  /** Initial size (px or percentage) */
  size?: number | string;
  /** Minimum size (px) */
  minSize?: number;
  /** Maximum size (px) */
  maxSize?: number;
  /** Whether this pane can collapse */
  collapsible?: boolean;
  /** Content element or HTML */
  content: HTMLElement | string;
}

export interface SplitViewOptions {
  /** First pane config */
  firstPane: SplitPaneConfig;
  /** Second pane config */
  secondPane: SplitPaneConfig;
  /** Split direction */
  direction?: SplitDirection;
  /** Initial split position (0-1, fraction of total) */
  initialSplit?: number;
  /** Handle size (px) */
  handleSize?: number;
  /** Show resize handle */
  showHandle?: boolean;
  /** Handle style (line, gutter, thin) */
  handleStyle?: "line" | "gutter" | "thin";
  /** Container element to render into */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
  /** Persist split position in localStorage */
  persist?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
  /** Called when split position changes */
  onResize?: (fraction: number, firstSize: number, secondSize: number) => void;
  /** Called when a pane collapses/expands */
  onCollapse?: (paneId: string, collapsed: boolean) => void;
}

export interface SplitViewInstance {
  /** The root container element */
  el: HTMLElement;
  /** Get current split fraction (0-1) */
  getSplit: () => number;
  /** Set split position by fraction */
  setSplit: (fraction: number) => void;
  /** Set split position by pixel value */
  setSplitPixel: (pixel: number) => void;
  /** Collapse first pane */
  collapseFirst: () => void;
  /** Collapse second pane */
  collapseSecond: () => void;
  /** Expand both panes */
  expandAll: () => void;
  /** Check if first pane is collapsed */
  isFirstCollapsed: () => boolean;
  /** Check if second pane is collapsed */
  isSecondCollapsed: () => void;
  /** Get pane sizes in pixels */
  getSizes: () => { first: number; second: number };
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a resizable split view with two panes.
 *
 * @example
 * ```ts
 * const split = createSplitView({
 *   firstPane: { id: "sidebar", content: sidebarEl, minSize: 200 },
 *   secondPane: { id: "main", content: mainEl },
 *   direction: "horizontal",
 *   initialSplit: 0.3,
 * });
 * ```
 */
export function createSplitView(options: SplitViewOptions): SplitViewInstance {
  const {
    firstPane,
    secondPane,
    direction = "horizontal",
    initialSplit = 0.5,
    handleSize = 6,
    showHandle = true,
    handleStyle = "gutter",
    container,
    className,
    persist = false,
    storageKey,
    onResize,
    onCollapse,
  } = options;

  let _splitFraction = initialSplit;
  let _firstCollapsed = false;
  let _secondCollapsed = false;
  let isDragging = false;
  let cleanupFns: Array<() => void> = [];

  // Load persisted value
  if (persist && storageKey) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) _splitFraction = parseFloat(saved);
    } catch {}
  }

  // Create root
  const root = document.createElement("div");
  root.className = `split-view ${direction} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:flex;${direction === "horizontal" ? "flex-direction:row" : "flex-direction:column"};` +
    "width:100%;height:100%;overflow:hidden;position:relative;";

  // First pane
  const firstEl = document.createElement("div");
  firstEl.className = "split-pane split-pane-first";
  firstEl.dataset.paneId = firstPane.id;
  firstEl.style.cssText =
    `flex:${_firstCollapsed ? "0 0 0" : `${_splitFraction} 1 ${firstPane.minSize ?? 0}px`};` +
    "overflow:auto;min-width:0;min-height:0;transition:flex-basis 0.15s ease;";
  if (typeof firstPane.content === "string") {
    firstEl.innerHTML = firstPane.content;
  } else {
    firstEl.appendChild(firstPane.content);
  }
  root.appendChild(firstEl);

  // Handle
  let handleEl: HTMLElement | null = null;
  if (showHandle) {
    handleEl = document.createElement("div");
    handleEl.className = `split-handle ${handleStyle}`;
    const isH = direction === "horizontal";

    handleEl.style.cssText =
      `flex-shrink:0;${isH ? `width:${handleSize}px` : `height:${handleSize}px`};` +
      `cursor:${isH ? "col-resize" : "row-resize"};` +
      "display:flex;align-items:center;justify-content:center;" +
      "user-select:none;touch-action:none;z-index:1;position:relative;";

    if (handleStyle === "gutter") {
      handleEl.style.background = "#e5e7eb";
      if (isH) {
        handleEl.style.marginLeft = "-3px";
        handleEl.style.marginRight = "-3px";
        handleEl.style.width = `${handleSize + 6}px`;
      } else {
        handleEl.style.marginTop = "-3px";
        handleEl.style.marginBottom = "-3px";
        handleEl.style.height = `${handleSize + 6}px`;
      }
    } else if (handleStyle === "thin") {
      handleEl.style.background = "transparent";
      handleEl.addEventListener("mouseenter", () => {
        handleEl!.style.background = "#d1d5db";
      });
      handleEl.addEventListener("mouseleave", () => {
        handleEl!.style.background = "transparent";
      });
    } else {
      // line
      handleEl.style.background = "#d1d5db";
    }

    // Drag grip dots
    if (handleStyle === "gutter") {
      const grip = document.createElement("div");
      grip.style.cssText =
        `display:flex;${isH ? "flex-direction:column" : "flex-direction:row"};gap:2px;` +
        "align-items:center;";
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        dot.style.cssText =
          `${isH ? "width:3px;height:3px" : "width:3px;height:3px"};border-radius:50%;background:#9ca3af;`;
        grip.appendChild(dot);
      }
      handleEl.appendChild(grip);
    }

    root.appendChild(handleEl);

    // Drag behavior
    _setupDrag(handleEl);
  }

  // Second pane
  const secondEl = document.createElement("div");
  secondEl.className = "split-pane split-pane-second";
  secondEl.dataset.paneId = secondPane.id;
  secondEl.style.cssText =
    `flex:${_secondCollapsed ? "0 0 0" : `${1 - _splitFraction} 1 ${secondPane.minSize ?? 0}px`};` +
    "overflow:auto;min-width:0;min-height:0;transition:flex-basis 0.15s ease;";
  if (typeof secondPane.content === "string") {
    secondEl.innerHTML = secondPane.content;
  } else {
    secondEl.appendChild(secondPane.content);
  }
  root.appendChild(secondEl);

  // Mount
  (container ?? document.body).appendChild(root);

  // Apply initial sizes
  _applySplit();

  // --- Methods ---

  function getSplit(): number { return _splitFraction; }

  function setSplit(fraction: number): void {
    _splitFraction = Math.max(0.05, Math.min(0.95, fraction));
    _applySplit();
    _persist();
  }

  function setSplitPixel(pixel: number): void {
    const total = direction === "horizontal"
      ? root.clientWidth - (showHandle ? handleSize : 0)
      : root.clientHeight - (showHandle ? handleSize : 0);
    setSplit(pixel / total);
  }

  function collapseFirst(): void {
    _firstCollapsed = true;
    _applySplit();
    onCollapse?.(firstPane.id, true);
  }

  function collapseSecond(): void {
    _secondCollapsed = true;
    _applySplit();
    onCollapse?.(secondPane.id, true);
  }

  function expandAll(): void {
    _firstCollapsed = false;
    _secondCollapsed = false;
    _applySplit();
    if (_firstCollapsed) onCollapse?.(firstPane.id, false);
    if (_secondCollapsed) onCollapse?.(secondPane.id, false);
  }

  function isFirstCollapsed(): boolean { return _firstCollapsed; }
  function isSecondCollapsed(): boolean { return _secondCollapsed; }

  function getSizes(): { first: number; second: number } {
    return {
      first: firstEl.offsetWidth || firstEl.offsetHeight,
      second: secondEl.offsetWidth || secondEl.offsetHeight,
    };
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Internal ---

  function _applySplit(): void {
    const isH = direction === "horizontal";

    if (_firstCollapsed) {
      firstEl.style.flex = "0 0 0";
      firstEl.style.overflow = "hidden";
      secondEl.style.flex = "1 1 auto";
    } else if (_secondCollapsed) {
      firstEl.style.flex = "1 1 auto";
      secondEl.style.flex = "0 0 0";
      secondEl.style.overflow = "hidden";
    } else {
      firstEl.style.flex = `${_splitFraction} 1 ${(firstPane.minSize ?? 0)}px`;
      firstEl.style.overflow = "auto";
      secondEl.style.flex = `${1 - _splitFraction} 1 ${(secondPane.minSize ?? 0)}px`;
      secondEl.style.overflow = "auto";
    }

    const firstSize = isH ? firstEl.offsetWidth : firstEl.offsetHeight;
    const secondSize = isH ? secondEl.offsetWidth : secondEl.offsetHeight;

    onResize?.(_splitFraction, firstSize, secondSize);
  }

  function _setupDrag(handle: HTMLElement): void {
    const startDrag = (clientX: number, clientY: number): void => {
      isDragging = true;
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      const startPos = direction === "horizontal" ? clientX : clientY;
      const startFraction = _splitFraction;
      const totalSize = direction === "horizontal"
        ? root.clientWidth - (showHandle ? handleSize : 0)
        : root.clientHeight - (showHandle ? handleSize : 0);

      const onMove = (moveX: number, moveY: number): void => {
        if (!isDragging) return;
        const currentPos = direction === "horizontal" ? moveX : moveY;
        const delta = currentPos - startPos;
        const newFraction = startFraction + delta / totalSize;

        // Apply constraints
        const minF = (firstPane.minSize ?? 0) / totalSize;
        const maxF = 1 - ((secondPane.minSize ?? 0) / totalSize);

        _splitFraction = Math.max(minF, Math.min(maxF, newFraction));
        _applySplit();

        if (handleStyle === "gutter") {
          handle.style.background = "#93c5fd";
        }
      };

      const onEnd = (): void => {
        isDragging = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (handleStyle === "gutter") {
          handle.style.background = "#e5e7eb";
        }
        _persist();
      };

      // Mouse events
      const mouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
      const mouseUp = (): void => { onEnd(); document.removeEventListener("mousemove", mouseMove); document.removeEventListener("mouseup", mouseUp); };
      document.addEventListener("mousemove", mouseMove);
      document.addEventListener("mouseup", mouseUp);

      // Touch events
      const touchMove = (e: TouchEvent) => {
        e.preventDefault();
        onMove(e.touches[0]!.clientX, e.touches[0]!.clientY);
      };
      const touchEnd = (): void => { onEnd(); document.removeEventListener("touchmove", touchMove); document.removeEventListener("touchend", touchEnd); };
      document.addEventListener("touchmove", touchMove, { passive: false });
      document.addEventListener("touchend", touchEnd);

      // Store cleanup
      cleanupFns.push(() => {
        document.removeEventListener("mousemove", mouseMove);
        document.removeEventListener("mouseup", mouseUp);
        document.removeEventListener("touchmove", touchMove);
        document.removeEventListener("touchend", touchEnd);
      });
    };

    handle.addEventListener("mousedown", (e) => startDrag(e.clientX, e.clientY));
    handle.addEventListener("touchstart", (e) => {
      startDrag(e.touches[0]!.clientX, e.touches[0]!.clientY);
    }, { passive: true });

    // Double-click to reset
    handle.addEventListener("dblclick", () => {
      _splitFraction = initialSplit;
      _firstCollapsed = false;
      _secondCollapsed = false;
      _applySplit();
      _persist();
    });
  }

  function _persist(): void {
    if (!persist || !storageKey) return;
    try {
      localStorage.setItem(storageKey, String(_splitFraction));
    } catch {}
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: root, getSplit, setSplit, setSplitPixel, collapseFirst, collapseSecond, expandAll, isFirstCollapsed, isSecondCollapsed, getSizes, destroy };
}
