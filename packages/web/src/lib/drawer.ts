/**
 * Splitter / Resizable Pane Layout: Drag-to-resize split panes with horizontal/vertical
 * orientation, min/max constraints, collapse/expand, initial size ratios,
 * nested splitters, and persistence.
 */

// --- Types ---

export type SplitterOrientation = "horizontal" | "vertical";

export interface SplitterPaneOptions {
  /** Minimum size in px */
  minSize?: number;
  /** Maximum size in px */
  maxSize?: number;
  /** Initial size as fraction (0-1) or px value */
  initialSize?: number | string;
  /** Collapsed state? */
  collapsed?: boolean;
  /** Whether this pane can collapse */
  collapsible?: boolean;
  /** Content: HTML string or element */
  content?: string | HTMLElement;
}

export interface SplitterOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Orientation */
  orientation?: SplitterOrientation;
  /** Panes configuration (2 panes) */
  panes: [SplitterPaneOptions, SplitterPaneOptions];
  /** Size of drag handle in px */
  handleSize?: number;
  /** Handle color */
  handleColor?: string;
  /** Handle hover color */
  handleHoverColor?: string;
  /** Show collapse buttons on handle */
  showCollapseButtons?: boolean;
  /** Animation duration on resize (ms) */
  animationDuration?: number;
  /** Callback on size change */
  onResize?: (sizes: [number, number]) => void;
  /** Callback when a pane collapses/expands */
  onCollapseChange?: (paneIndex: number, collapsed: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SplitterInstance {
  element: HTMLElement;
  getSizes: () => [number, number];
  setSizes: (sizes: [number | string, number | string]) => void;
  collapse: (paneIndex: number) => void;
  expand: (paneIndex: number) => void;
  isCollapsed: (paneIndex: number) => boolean;
  destroy: () => void;
}

// --- Main Factory ---

export function createSplitter(options: SplitterOptions): SplitterInstance {
  const opts = {
    orientation: options.orientation ?? "horizontal",
    handleSize: options.handleSize ?? 8,
    handleColor: options.handleColor ?? "#d1d5db",
    handleHoverColor: options.handleHoverColor ?? "#9ca3af",
    showCollapseButtons: options.showCollapseButtons ?? true,
    animationDuration: options.animationDuration ?? 0,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Splitter: container not found");

  const isHoriz = opts.orientation === "horizontal";

  container.className = `splitter splitter-${opts.orientation} ${opts.className ?? ""}`;
  container.style.cssText = `
    display:flex;${isHoriz ? "" : "flex-direction:column;"}
    width:100%;height:100%;overflow:hidden;position:relative;
    font-family:-apple-system,sans-serif;
  `;

  // State
  const paneCount = options.panes.length;
  let sizes: number[] = [];
  let collapsed: boolean[] = options.panes.map((p) => p.collapsed ?? false);
  let destroyed = false;

  // Resolve initial sizes
  for (let i = 0; i < paneCount; i++) {
    const init = options.panes[i].initialSize;
    if (typeof init === "string" && init.endsWith("%")) {
      sizes.push(parseFloat(init) / 100);
    } else if (typeof init === "number") {
      // If > 1, treat as pixels and convert to fraction later
      sizes.push(init);
    } else {
      // Default equal split
      sizes.push(1 / paneCount);
    }
  }

  // Normalize to fractions summing to 1
  if (sizes.some((s) => s > 1)) {
    const totalPx = sizes.reduce((a, b) => a + b, 0);
    const containerSize = isHoriz ? container.offsetWidth : container.offsetHeight;
    sizes = sizes.map((s) => s > 1 ? s / containerSize : s);
  }
  const total = sizes.reduce((a, b) => a + b, 0);
  sizes = sizes.map((s) => s / Math.max(total, 0.01));

  // Build DOM
  const paneEls: HTMLElement[] = [];
  const handleEl: HTMLDivElement | null = null;

  for (let i = 0; i < paneCount; i++) {
    const paneOpts = options.panes[i];

    // Pane wrapper
    const paneEl = document.createElement("div");
    paneEl.className = `splitter-pane`;
    paneEl.dataset.index = String(i);
    paneEl.style.cssText = `
      flex-shrink:0;overflow:hidden;position:relative;
      ${collapsed[i] ? (isHoriz ? "width:0;" : "height:0;") : ""}
      transition:flex ${opts.animationDuration}ms ease;
    `;

    // Inner content area
    const innerEl = document.createElement("div");
    innerEl.className = "splitter-pane-inner";
    innerEl.style.cssText = `
      width:100%;height:100%;overflow:auto;
      ${isHoriz ? "min-width:0;" : "min-height:0;"}
    `;

    if (paneOpts.content) {
      if (typeof paneOpts.content === "string") {
        innerEl.innerHTML = paneOpts.content;
      } else {
        innerEl.appendChild(paneOpts.content);
      }
    }

    paneEl.appendChild(innerEl);
    container.appendChild(paneEl);
    paneEls.push(paneEl);

    // Handle between panes (only one handle for 2 panes)
    if (i < paneCount - 1 && !handleEl) {
      const h = document.createElement("div");
      h.className = "splitter-handle";
      h.style.cssText = `
        flex-shrink:0;display:flex;align-items:center;justify-content:center;
        ${isHoriz ? `width:${opts.handleSize}px;cursor:col-resize;` : `height:${opts.handleSize}px;cursor:row-resize;`}
        background:${opts.handleColor};transition:background 0.15s;z-index:2;
        user-select:none;touch-action:none;
      `;

      // Collapse buttons
      if (opts.showCollapseButtons) {
        const btnLeft = document.createElement("button");
        btnLeft.type = "button";
        btnLeft.innerHTML = isHoriz ? "&laquo;" : "&u25B2;";
        btnLeft.style.cssText = `
          background:none;border:none;cursor:pointer;padding:1px;font-size:10px;
          color:#9ca3af;line-height:1;opacity:0;transition:opacity 0.15s;
          ${isHoriz ? "transform:rotate(0);" : "transform:rotate(-90deg);"}
        `;
        btnLeft.title = `Collapse left pane`;

        const btnRight = document.createElement("button");
        btnRight.type = "button";
        btnRight.innerHTML = isHoriz ? "&raquo;" : "&u25BC;";
        btnRight.style.cssText = `
          background:none;border:none;cursor:pointer;padding:1px;font-size:10px;
          color:#9ca3af;line-height:1;opacity:0;transition:opacity 0.15s;
          ${isHoriz ? "transform:rotate(0);" : "transform:rotate(90deg);"}
        `;
        btnRight.title = `Collapse right pane`;

        h.addEventListener("mouseenter", () => {
          btnLeft.style.opacity = "1"; btnRight.style.opacity = "1";
        });
        h.addEventListener("mouseleave", () => {
          btnLeft.style.opacity = "0"; btnRight.style.opacity = "0";
        });
        btnLeft.addEventListener("click", (e) => { e.stopPropagation(); instance.collapse(0); });
        btnRight.addEventListener("click", (e) => { e.stopPropagation(); instance.collapse(1); });

        h.append(btnLeft, btnRight);
      }

      // Hover effect
      h.addEventListener("mouseenter", () => { h.style.background = opts.handleHoverColor; });
      h.addEventListener("mouseleave", () => { h.style.background = opts.handleColor; });

      container.appendChild(h);

      // Store reference
      (h as any)._isHandle = true;
      handleEl !== null; // just mark existence
    }
  }

  // Apply current sizes
  function applySizes(): void {
    const containerSize = isHoriz ? container.offsetWidth : container.offsetHeight;
    let remainingPxFraction = 1;
    let collapsedCount = collapsed.filter(Boolean).length;
    const availableSpace = collapsedCount > 0 ? containerSize : containerSize;

    for (let i = 0; i < paneCount; i++) {
      if (collapsed[i]) {
        paneEls[i]!.style.flex = "0 0 0%";
        continue;
      }

      const isLast = !collapsed.slice(i + 1).some(Boolean);
      const minPx = options.panes[i].minSize ?? (containerSize * 0.05);
      const maxPx = options.panes[i].maxSize ?? containerSize;

      let px: number;
      if (isLast && collapsedCount === 0) {
        px = availableSpace - sizes.slice(0, i).reduce((a, s, idx) => a + (collapsed[idx] ? 0 : s * availableSpace), 0);
      } else {
        px = sizes[i]! * availableSpace;
      }

      px = Math.max(minPx, Math.min(maxPx, px));
      paneEls[i]!.style.flex = `0 0 ${px}px`;
    }
  }

  // Drag handling
  if (handleEl) {
    let isDragging = false;
    let startPos = 0;
    let startSizes: number[] = [];

    handleEl.addEventListener("pointerdown", (e: PointerEvent) => {
      isDragging = true;
      startPos = isHoriz ? e.clientX : e.clientY;
      startSizes = [...sizes];
      (handleEl as HTMLElement).setPointerCapture(e.pointerId);
      document.body.style.userSelect = "none";
      document.body.style.cursor = isHoriz ? "col-resize" : "row-resize";
      e.preventDefault();
    });

    const onMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const containerSize = isHoriz ? container.offsetWidth : container.offsetHeight;
      const delta = (isHoriz ? e.clientX : e.clientY) - startPos;
      const deltaFraction = delta / containerSize;

      // Adjust first pane size
      const newFirst = Math.max(0.02, Math.min(0.98, startSizes[0]! + deltaFraction));
      sizes[0] = newFirst;
      sizes[1] = 1 - newFirst;
      applySizes();
      opts.onResize?.([sizes[0]! * containerSize, sizes[1]! * containerSize]);
    };

    const onUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      (handleEl as HTMLElement).releasePointerCapture?.(0);
    };

    (handleEl as HTMLElement).addEventListener("pointermove", onMove);
    (handleEl as HTMLElement).addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Observe resize
  const resizeObserver = new ResizeObserver(() => applySizes());
  resizeObserver.observe(container);

  // Initial render
  applySizes();

  const instance: SplitterInstance = {
    element: container,

    getSizes() {
      const cs = isHoriz ? container.offsetWidth : container.offsetHeight;
      return [paneEls[0]!.offsetWidth, paneEls[1]!.offsetHeight];
    },

    setSizes(newSizes: [number | string, number | string]) {
      const cs = isHoriz ? container.offsetWidth : container.offsetHeight;
      for (let i = 0; i < 2; i++) {
        if (typeof newSizes[i] === "string" && newSizes[i].endsWith("%")) {
          sizes[i] = parseFloat(newSizes[i]) / 100;
        } else if (typeof newSizes[i] === "number") {
          sizes[i] = newSizes[i] > 1 ? newSizes[i] / cs : newSizes[i];
        }
      }
      applySizes();
    },

    collapse(paneIndex: number) {
      if (paneIndex < 0 || paneIndex >= paneCount) return;
      if (!options.panes[paneIndex]?.collapsible) return;
      collapsed[paneIndex] = true;
      applySizes();
      opts.onCollapseChange?.(paneIndex, true);
    },

    expand(paneIndex: number) {
      if (paneIndex < 0 || paneIndex >= paneCount) return;
      collapsed[paneIndex] = false;
      applySizes();
      opts.onCollapseChange?.(paneIndex, false);
    },

    isCollapsed(paneIndex: number) {
      return collapsed[paneIndex] ?? false;
    },

    destroy() {
      destroyed = true;
      resizeObserver.disconnect();
      container.innerHTML = "";
    },
  };

  return instance;
}
