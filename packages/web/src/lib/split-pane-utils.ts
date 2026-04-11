/**
 * Split Pane Utilities: Resizable split panes (horizontal/vertical),
 * drag-to-resize divider, min/max sizes, collapse/expand, nested splits,
 * and percentage-based sizing.
 */

// --- Types ---

export type SplitDirection = "horizontal" | "vertical";
export type SplitBehavior = "stretch" | "fill";

export interface PaneOptions {
  /** Initial size in px or percentage ("30%" or 200) */
  size?: string | number;
  /** Minimum size in px */
  minSize?: number;
  /** Maximum size in px */
  maxSize?: number;
  /** Whether this pane can be collapsed */
  collapsible?: boolean;
  /** Initially collapsed? */
  collapsed?: boolean;
  /** Content element or HTML string */
  content: HTMLElement | string;
}

export interface SplitPaneOptions {
  /** Panes to display (2 or more) */
  panes: PaneOptions[];
  /** Direction of split. Default "horizontal" */
  direction?: SplitDirection;
  /** Size of the divider/gutter in px. Default 6 */
  gutterSize?: number;
  /** Whether the divider is draggable for resize. Default true */
  draggable?: boolean;
  /** Show a visual divider line. Default true */
  showDivider?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
  /** Called when sizes change */
  onResize?: (sizes: number[]) => void;
  /** Called when a pane is toggled collapsed/expanded */
  onToggleCollapse?: (index: number, collapsed: boolean) => void;
}

export interface SplitPaneInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current sizes as array of percentages (0-100) */
  getSizes: () => number[];
  /** Set sizes programmatically (array of percentages) */
  setSizes: (sizes: number[]) => void;
  /** Collapse a pane by index */
  collapsePane: (index: number) => void;
  /** Expand a pane by index */
  expandPane: (index: number) => void;
  /** Toggle collapse state of a pane */
  togglePane: (index: number) => void;
  /** Set direction */
  setDirection: (dir: SplitDirection) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a resizable split pane layout.
 *
 * @example
 * ```ts
 * const split = createSplitPane({
 *   direction: "horizontal",
 *   panes: [
 *     { size: "30%", content: sidebarEl },
 *     { content: mainContentEl },
 *   ],
 * });
 * ```
 */
export function createSplitPane(options: SplitPaneOptions): SplitPaneInstance {
  const {
    panes,
    direction = "horizontal",
    gutterSize = 6,
    draggable = true,
    showDivider = true,
    container,
    className,
    onResize,
    onToggleCollapse,
  } = options;

  let _direction = direction;
  const _collapsedStates = new Map<number, boolean>();
  const _paneElements: HTMLElement[] = [];
  const _dividerElements: HTMLElement[] = [];
  const cleanupFns: Array<() => void> = [];

  // Initialize collapse states
  panes.forEach((p, i) => {
    if (p.collapsed !== undefined) _collapsedStates.set(i, p.collapsed);
  });

  // Root
  const root = document.createElement("div");
  root.className = `split-pane ${_direction} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;width:100%;height:100%;overflow:hidden;" +
    (_direction === "vertical" ? "flex-direction:column;" : "flex-direction:row;");

  // Build panes
  panes.forEach((pane, index) => {
    if (index > 0) {
      // Add divider
      const divider = document.createElement("div");
      divider.className = "split-divider";
      divider.style.cssText =
        `width:${_direction === "horizontal" ? gutterSize : "100%"}px;` +
        `height:${_direction === "vertical" ? gutterSize : "100%"}px;` +
        `background:${showDivider ? "#e5e7eb" : "transparent"};` +
        "cursor:" + (_direction === "horizontal" ? "col-resize" : "row-resize") + ";" +
        "flex-shrink:0;display:flex;align-items:center;justify-content:center;z-index:2;" +
        "transition:background 0.15s;";
      root.appendChild(divider);
      _dividerElements.push(divider);

      // Collapse/expand button on divider
      if (pane.collapsible || panes.some((p) => p.collapsible)) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "split-collapse-btn";
        btn.innerHTML = "&#171;" // « or »
        btn.setAttribute("aria-label", `Toggle pane ${index + 1}`);
        btn.style.cssText =
          "background:none;border:none;cursor:pointer;padding:2px;font-size:10px;color:#9ca3af;" +
          "line-height:1;border-radius:2px;transition:all 0.15s;";
        btn.addEventListener("click", () => togglePane(index));
        btn.addEventListener("mouseenter", () => { btn.style.color = "#374151"; btn.style.background = "#f3f4f6"; });
        btn.addEventListener("mouseleave", () => { btn.style.color = "#9ca3af"; btn.style.background = ""; });
        divider.appendChild(btn);
      }

      if (draggable) {
        attachDividerDrag(divider, index);
      }
    }

    // Create pane wrapper
    const paneEl = document.createElement("div");
    paneEl.className = `split-pane-${index}`;
    paneEl.dataset.paneIndex = String(index);
    paneEl.style.cssText =
      "overflow:hidden;position:relative;min-width:0;min-height:0;" +
      "display:flex;flex-direction:column;";

    // Apply initial size
    if (pane.size !== undefined) {
      if (typeof pane.size === "string" && pane.size.endsWith("%")) {
        paneEl.style.flex = `0 0 ${parseFloat(pane.size)}%`;
      } else if (typeof pane.size === "number") {
        paneEl.style.flex = `0 0 ${pane.size}px`;
      }
    } else {
      paneEl.style.flex = "1";
    }

    // Apply min/max
    if (pane.minSize !== undefined) {
      if (_direction === "horizontal") {
        paneEl.style.minWidth = `${pane.minSize}px`;
      } else {
        paneEl.style.minHeight = `${pane.minSize}px`;
      }
    }
    if (pane.maxSize !== undefined) {
      if (_direction === "horizontal") {
        paneEl.style.maxWidth = `${pane.maxSize}px`;
      } else {
        paneEl.style.maxHeight = `${pane.maxSize}px`;
      }
    }

    // Handle collapsed state
    if (_collapsedStates.get(index)) {
      paneEl.style.display = "none";
      paneEl.style.flex = "0 0 0";
    }

    // Content
    if (typeof pane.content === "string") {
      paneEl.innerHTML = pane.content;
    } else {
      paneEl.appendChild(pane.content);
    }

    root.appendChild(paneEl);
    _paneElements.push(paneEl);
  });

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function getSizes(): number[] {
    return _paneElements.map((el) => {
      if (_collapsedStates.get(_paneElements.indexOf(el))) return 0;
      const style = el.style.flex;
      if (style && style.includes(" ")) {
        const parts = style.split(" ");
        return parseFloat(parts[2] ?? "0");
      }
      // Calculate from offsetWidth
      const pct = (el.offsetWidth / root.offsetWidth) * 100;
      return Math.round(pct);
    });
  }

  function setSizes(sizes: number[]): void {
    sizes.forEach((size, i) => {
      const el = _paneElements[i];
      if (!el) return;
      if (_collapsedStates.get(i)) return; // Don't resize collapsed
      el.style.flex = `0 0 ${size}%`;
    });
    onResize?.(sizes);
  }

  function collapsePane(index: number): void {
    if (!panes[index]?.collapsible) return;
    _collapsedStates.set(index, true);
    const el = _paneElements[index];
    if (el) { el.style.display = "none"; el.style.flex = "0 0 0"; }
    onToggleCollapse?.(index, true);
  }

  function expandPane(index: number): void {
    _collapsedStates.set(index, false);
    const el = _paneElements[index];
    if (el) { el.style.display = ""; el.style.flex = panes[index]?.size ? `0 0 ${panes[index]!.size}` : "1"; }
    onToggleCollapse?.(index, false);
  }

  function togglePane(index: number): void {
    if (_collapsedStates.get(index)) {
      expandPane(index);
    } else {
      collapsePane(index);
    }
  }

  function setDirection(dir: SplitDirection): void {
    _direction = dir;
    root.style.flexDirection = dir === "vertical" ? "column" : "row";
    // Update dividers
    _dividerElements.forEach((d) => {
      d.style.width = dir === "horizontal" ? `${gutterSize}px` : "100%";
      d.style.height = dir === "vertical" ? `${gutterSize}px` : "100%";
      d.style.cursor = dir === "horizontal" ? "col-resize" : "row-resize";
    });
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
    root.remove();
  }

  // --- Internal ---

  function attachDividerDrag(divider: HTMLElement, dividerIndex: number): void {
    let isDragging = false;
    let startPos = 0;
    let startSizes: number[] = [];

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      isDragging = true;
      startPos = _direction === "horizontal" ? e.clientX : e.clientY;
      startSizes = getSizes();

      const onMouseMove = (moveE: MouseEvent) => {
        if (!isDragging) return;
        moveE.preventDefault();

        const currentPos = _direction === "horizontal" ? moveE.clientX : moveE.clientY;
        const delta = currentPos - startPos;
        const totalSize = _direction === "horizontal" ? root.offsetWidth : root.offsetHeight;

        // Redistribute sizes based on delta
        const newSizes = startSizes.map((size, i) => {
          if (i === dividerIndex) {
            return Math.max(
              panes[i]?.minSize ?? 50,
              Math.min(panes[i]?.maxSize ?? totalSize, size + delta / totalSize * 100),
            );
          }
          if (i === dividerIndex - 1) {
            return Math.max(
              panes[i]?.minSize ?? 50,
              Math.min(panes[i]?.maxSize ?? totalSize, size - delta / totalSize * 100),
            );
          }
          return size;
        });

        setSizes(newSizes);
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    divider.addEventListener("mousedown", onMouseDown);
    cleanupFns.push(() => divider.removeEventListener("mousedown", onMouseDown));
  }

  return { el: root, getSizes, setSizes, collapsePane, expandPane, togglePane, setDirection, destroy };
}
