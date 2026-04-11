/**
 * Splitter Utilities: Pane resizer with horizontal/vertical orientation,
 * drag handles, min/max size constraints, nested splitters, size persistence,
 * collapse/expand panes, and ARIA attributes.
 */

// --- Types ---

export type SplitterOrientation = "horizontal" | "vertical";
export type SplitterUnit = "percent" | "pixels" | "fraction";

export interface SplitterPane {
  /** Unique key for this pane */
  id: string;
  /** Initial size (number interpreted by unit) */
  size: number;
  /** Minimum size (px or percent string). Default "0" */
  minSize?: number | string;
  /** Maximum size (px or percent string). Default "100%" */
  maxSize?: number | string;
  /** Can this pane be collapsed? Default false */
  collapsible?: boolean;
  /** Initially collapsed? Default false */
  collapsed?: boolean;
  /** Content: HTMLElement or HTML string */
  content?: HTMLElement | string;
  /** Whether this pane is resizable via drag. Default true */
  resizable?: boolean;
}

export interface SplitterOptions {
  /** Panes to render */
  panes: SplitterPane[];
  /** Orientation. Default "horizontal" */
  orientation?: SplitterOrientation;
  /** Size unit for initial sizes. Default "percent" */
  unit?: SplitterUnit;
  /** Container element */
  container?: HTMLElement;
  /** Handle/bar width in px. Default 6 */
  handleSize?: number;
  /** Show resize cursor on hover. Default true */
  showCursor?: boolean;
  /** Snap to equal sizes on double-click handle. Default true */
  snapOnDblClick?: boolean;
  /** Custom class name */
  className?: string;
  /** Called when any pane resizes */
  onResize?: (sizes: Map<string, number>) => void;
  /** Called when a pane collapses/expands */
  onCollapseChange?: (id: string, collapsed: boolean) => void;
  /** Persist sizes to localStorage? Default false */
  persistKey?: string;
}

export interface SplitterInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current size of a pane by id */
  getSize: (id: string) => number;
  /** Set size of a pane by id */
  setSize: (id: string, size: number) => void;
  /** Collapse a pane */
  collapsePane: (id: string) => void;
  /** Expand a pane */
  expandPane: (id: string) => void;
  /** Check if pane is collapsed */
  isCollapsed: (id: string) => boolean;
  /** Set all panes to equal size */
  equalize: () => void;
  /** Get all current sizes as map */
  getSizes: () => Map<string, number>;
  /** Update pane content dynamically */
  setPaneContent: (id: string, content: HTMLElement | string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a resizable pane splitter.
 *
 * @example
 * ```ts
 * const splitter = createSplitter({
 *   panes: [
 *     { id: "left", size: 30, content: sidebarEl },
 *     { id: "right", size: 70, content: mainEl },
 *   ],
 *   orientation: "horizontal",
 * });
 * ```
 */
export function createSplitter(options: SplitterOptions): SplitterInstance {
  const {
    panes,
    orientation = "horizontal",
    unit = "percent",
    handleSize = 6,
    showCursor = true,
    snapOnDblClick = true,
    className,
    container,
    onResize,
    onCollapseChange,
    persistKey,
  } = options;

  let _panes = panes.map((p) => ({
    ...p,
    minSize: p.minSize ?? 0,
    maxSize: p.maxSize ?? 100,
    resizable: p.resizable !== false,
    collapsed: p.collapsed ?? false,
  }));

  const isHorizontal = orientation === "horizontal";
  const sizeProp = isHorizontal ? "width" : "height";
  const oppositeProp = isHorizontal ? "height" : "width";
  const cursorStyle = isHorizontal ? "col-resize" : "row-resize";

  // Load persisted sizes
  if (persistKey) {
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const [id, size] of Object.entries(parsed)) {
          const pane = _panes.find((p) => p.id === id);
          if (pane) pane.size = size as number;
        }
      }
    } catch { /* ignore */ }
  }

  // Root
  const root = document.createElement("div");
  root.className = `splitter ${orientation} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:flex;${isHorizontal ? "flex-direction:row" : "flex-direction:column"};` +
    `width:100%;height:100%;overflow:hidden;position:relative;`;

  const paneEls = new Map<string, HTMLElement>();
  const handleEls: HTMLElement[] = [];
  const cleanupFns: Array<() => void> = [];

  // Render
  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function getSize(id: string): number {
    const pane = _panes.find((p) => p.id === id);
    return pane?.collapsed ? 0 : pane?.size ?? 0;
  }

  function setSize(id: string, size: number): void {
    const idx = _panes.findIndex((p) => p.id === id);
    if (idx < 0) return;

    const pane = _panes[idx]!;
    const clamped = _clampSize(pane, size);
    pane.size = clamped;

    // Redistribute remaining space
    _normalizeSizes(idx);
    _applySizes();
    _persist();
    onResize?.(getSizes());
  }

  function collapsePane(id: string): void {
    const pane = _panes.find((p) => p.id === id);
    if (!pane || !pane.collapsible || pane.collapsed) return;

    pane.collapsed = true;
    _normalizeSizes(_panes.indexOf(pane));
    _applySizes();
    _updateCollapsedVisuals(pane.id, true);
    _persist();
    onCollapseChange?.(id, true);
  }

  function expandPane(id: string): void {
    const pane = _panes.find((p) => p.id === id);
    if (!pane || !pane.collapsed) return;

    pane.collapsed = false;
    // Restore to minimum or a reasonable default
    if (pane.size <= 0) {
      pane.size = typeof pane.minSize === "number" ? Math.max(pane.minSize, 20) : 20;
    }
    _normalizeSizes(_panes.indexOf(pane));
    _applySizes();
    _updateCollapsedVisuals(pane.id, false);
    _persist();
    onCollapseChange?.(id, false);
  }

  function isCollapsed(id: string): boolean {
    return _panes.find((p) => p.id === id)?.collapsed ?? false;
  }

  function equalize(): void {
    const visiblePanes = _panes.filter((p) => !p.collapsed);
    if (visiblePanes.length === 0) return;

    const equalSize = 100 / visiblePanes.length;
    for (const pane of visiblePanes) {
      pane.size = equalSize;
    }
    _applySizes();
    _persist();
    onResize?.(getSizes());
  }

  function getSizes(): Map<string, number> {
    const result = new Map<string, number>();
    for (const pane of _panes) {
      result.set(pane.id, pane.collapsed ? 0 : pane.size);
    }
    return result;
  }

  function setPaneContent(id: string, content: HTMLElement | string): void {
    const el = paneEls.get(id);
    if (!el) return;
    el.innerHTML = "";
    if (typeof content === "string") {
      el.innerHTML = content;
    } else {
      el.appendChild(content);
    }
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
    root.remove();
  }

  // --- Internal ---

  function _render(): void {
    root.innerHTML = "";
    paneEls.clear();
    handleEls.length = 0;

    for (let i = 0; i < _panes.length; i++) {
      const pane = _panes[i]!;

      // Pane element
      const paneEl = document.createElement("div");
      paneEl.className = `splitter-pane ${pane.id}`;
      paneEl.dataset.paneId = pane.id;
      paneEl.style.cssText =
        `flex-shrink:0;overflow:auto;position:relative;${pane.collapsed ? "display:none;" : ""}`;

      if (pane.content) {
        if (typeof pane.content === "string") {
          paneEl.innerHTML = pane.content;
        } else {
          paneEl.appendChild(pane.content.cloneNode(true));
        }
      }

      paneEls.set(pane.id, paneEl);
      root.appendChild(paneEl);

      // Handle (between panes, not after last)
      if (i < _panes.length - 1) {
        const handle = document.createElement("div");
        handle.className = "splitter-handle";
        handle.style.cssText =
          `flex-shrink:0;background:#e5e7eb;${isHorizontal ? `width:${handleSize}px` : `height:${handleSize}px`};` +
          `display:flex;align-items:center;justify-content:center;` +
          (showCursor ? `cursor:${cursorStyle};` : "") +
          `transition:background 0.15s;z-index:1;`;

        // Collapse button inside handle
        const collapseBtn = document.createElement("button");
        collapseBtn.className = "splitter-collapse-btn";
        collapseBtn.setAttribute("aria-label", "Toggle pane");
        collapseBtn.style.cssText =
          "background:none;border:none;padding:2px;cursor:pointer;font-size:10px;color:#9ca3af;" +
          "line-height:1;border-radius:3px;display:flex;align-items:center;justify-content:center;";
        collapseBtn.innerHTML = isHorizontal ? "&#9664;&#9654;" : "&#9650;&#9668;";
        collapseBtn.title = "Collapse/Expand";

        collapseBtn.addEventListener("click", () => {
          // Toggle collapse of the preceding pane
          const prevPane = _panes[i]!;
          if (prevPane.collapsible) {
            prevPane.collapsed ? expandPane(prevPane.id) : collapsePane(prevPane.id);
          }
        });

        handle.appendChild(collapseBtn);

        // Drag behavior
        if (_panes[i]!.resizable && _panes[i + 1]?.resizable) {
          _setupDrag(handle, i);
        } else {
          handle.style.cursor = "default";
        }

        // Double-click to equalize
        if (snapOnDblClick) {
          handle.addEventListener("dblclick", (e) => {
            e.preventDefault();
            equalize();
          });
        }

        // Hover effect
        handle.addEventListener("mouseenter", () => {
          handle.style.background = "#d1d5db";
        });
        handle.addEventListener("mouseleave", () => {
          handle.style.background = "#e5e7eb";
        });

        handleEls.push(handle);
        root.appendChild(handle);
      }
    }

    _applySizes();
  }

  function _setupDrag(handle: HTMLElement, paneIndex: number): void {
    let dragging = false;
    let startPos = 0;
    let startSizes: number[] = [];

    const onDown = (e: MouseEvent | TouchEvent): void => {
      e.preventDefault();
      dragging = true;
      startPos = isHorizontal ? ("touches" in e ? e.touches[0]!.clientX : e.clientX) : ("touches" in e ? e.touches[0]!.clientY : e.clientY);
      startSizes = _panes.map((p) => p.size);

      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";

      handle.style.background = "#3b82f6";
    };

    const onMove = (e: MouseEvent | TouchEvent): void => {
      if (!dragging) return;

      const clientPos = isHorizontal
        ? ("touches" in e ? e.touches[0]?.clientX ?? startPositions : e.clientX)
        : ("touches" in e ? e.touches[0]?.clientY ?? startPositions : e.clientY);
      const delta = clientPos - startPos;

      const containerSize = isHorizontal ? root.clientWidth : root.clientHeight;
      const deltaPercent = (delta / containerSize) * 100;

      // Adjust the two adjacent panes
      const leftPane = _panes[paneIndex]!;
      const rightPane = _panes[paneIndex + 1]!;

      if (!leftPane.collapsed && !rightPane.collapsed) {
        const newLeftSize = _clampSize(leftPane, startSizes[paneIndex]! + deltaPercent);
        const newRightSize = _clampSize(rightPane, startSizes[paneIndex + 1]! - deltaPercent);

        leftPane.size = newLeftSize;
        rightPane.size = newRightSize;

        _applySizes();
        onResize?.(getSizes());
      }
    };

    const onUp = (): void => {
      if (!dragging) return;
      dragging = false;

      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";

      handle.style.background = "#e5e7eb";
      _persist();
    };

    handle.addEventListener("mousedown", onDown as EventListener);
    handle.addEventListener("touchstart", onDown as EventListener, { passive: false });
    window.addEventListener("mousemove", onMove as EventListener);
    window.addEventListener("touchmove", onMove as EventListener, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    cleanupFns.push(
      () => handle.removeEventListener("mousedown", onDown as EventListener),
      () => handle.removeEventListener("touchstart", onDown as EventListener),
      () => window.removeEventListener("mousemove", onMove as EventListener),
      () => window.removeEventListener("touchmove", onMove as EventListener),
      () => window.removeEventListener("mouseup", onUp),
      () => window.removeEventListener("touchend", onUp),
    );
  }

  function _clampSize(pane: SplitterPane, sizePercent: number): number {
    const minVal = typeof pane.minSize === "number"
      ? pane.minSize
      : parseFloat(String(pane.minSize ?? "0"));
    const maxVal = typeof pane.maxSize === "number"
      ? pane.maxSize
      : parseFloat(String(pane.maxSize ?? "100"));

    return Math.max(minVal, Math.min(maxVal, sizePercent));
  }

  function _normalizeSizes(changedIdx: number): void {
    // Ensure all sizes sum to 100%
    const total = _panes.reduce((sum, p) => sum + (p.collapsed ? 0 : p.size), 0);

    if (Math.abs(total - 100) > 0.01) {
      const diff = 100 - total;
      const visiblePanes = _panes.filter((p) => !p.collapsed && p.id !== _panes[changedIdx]?.id);
      if (visiblePanes.length > 0) {
        const perPane = diff / visiblePanes.length;
        for (const p of visiblePanes) {
          p.size = _clampSize(p, p.size + perPane);
        }
      }
    }
  }

  function _applySizes(): void {
    for (const pane of _panes) {
      const el = paneEls.get(pane.id);
      if (!el) continue;

      if (pane.collapsed) {
        el.style.display = "none";
        el.style.flexBasis = "0";
      } else {
        el.style.display = "";
        el.style.flexBasis = `${pane.size}%`;
      }
    }
  }

  function _updateCollapsedVisuals(id: string, collapsed: boolean): void {
    const el = paneEls.get(id);
    if (!el) return;

    if (collapsed) {
      el.style.display = "none";
    } else {
      el.style.display = "";
    }
  }

  function _persist(): void {
    if (!persistKey) return;
    try {
      const data: Record<string, number> = {};
      for (const pane of _panes) {
        data[pane.id] = pane.size;
      }
      localStorage.setItem(persistKey, JSON.stringify(data));
    } catch { /* ignore */ }
  }

  return {
    el: root,
    getSize,
    setSize,
    collapsePane,
    expandPane,
    isCollapsed,
    equalize,
    getSizes,
    setPaneContent,
    destroy,
  };
}
