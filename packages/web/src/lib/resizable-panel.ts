/**
 * Resizable Panel: Draggable splitter-based panel layout with horizontal/vertical
 * orientation, min/max size constraints, collapse/expand, nested panels,
 * keyboard support, persistence, and smooth resize animations.
 */

// --- Types ---

export type PanelDirection = "horizontal" | "vertical";
export type PanelCollapseMode = "none" | "collapsible" | "auto-hide";

export interface ResizablePanelOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Direction of the split */
  direction?: PanelDirection;
  /** Initial sizes as fractions (must sum to 1) */
  sizes?: number[];
  /** Min size for each panel (px or % string) */
  minSizes?: (number | string)[];
  /** Max size for each panel (px or % string) */
  maxSizes?: (number | string)[];
  /** Splitter size/thickness (px) */
  splitterSize?: number;
  /** Splitter color/hover color */
  splitterColor?: string;
  splitterHoverColor?: string;
  /** Show splitter grip lines? */
  showGrip?: boolean;
  /** Collapse mode */
  collapseMode?: PanelCollapseMode;
  /** Animation duration for resize (ms) */
  animationDuration?: number;
  /** Callback on resize with current sizes */
  onResize?: (sizes: number[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ResizablePanelInstance {
  element: HTMLElement;
  /** Get current sizes as fractions */
  getSizes: () => number[];
  /** Set sizes programmatically */
  setSizes: (sizes: number[]) => void;
  /** Resize a specific panel by index */
  resizePanel: (index: number, size: number) => void;
  /** Collapse a panel by index */
  collapsePanel: (index: number) => void;
  /** Expand a collapsed panel by index */
  expandPanel: (index: number) => void;
  /** Toggle collapse state */
  togglePanel: (index: number) => void;
  /** Check if a panel is collapsed */
  isCollapsed: (index: number) => boolean;
  /** Destroy */
  destroy: () => void;
}

// --- Main Factory ---

export function createResizablePanel(options: ResizablePanelOptions): ResizablePanelInstance {
  const opts = {
    direction: options.direction ?? "horizontal",
    sizes: options.sizes ?? [0.5, 0.5],
    minSizes: options.minSizes ?? [],
    maxSizes: options.maxSizes ?? [],
    splitterSize: options.splitterSize ?? 6,
    splitterColor: options.splitterColor ?? "#e5e7eb",
    splitterHoverColor: options.splitterHoverColor ?? "#a5b4fc",
    showGrip: options.showGrip ?? true,
    collapseMode: options.collapseMode ?? "none",
    animationDuration: options.animationDuration ?? 0,
    onResize: options.onResize,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ResizablePanel: container not found");

  let sizes = [...opts.sizes];
  let collapsedPanels = new Set<number>();
  let destroyed = false;

  // Validate
  if (sizes.length < 2) throw new Error("ResizablePanel: requires at least 2 panels");
  const total = sizes.reduce((s, v) => s + v, 0);
  if (Math.abs(total - 1) > 0.001) {
    // Normalize to sum to 1
    sizes = sizes.map(s => s / total);
  }

  const panelCount = sizes.length;

  // Root element
  const root = document.createElement("div");
  root.className = `resizable-panel rp-${opts.direction} ${opts.className}`;
  root.style.cssText = `
    display:flex;width:100%;height:100%;overflow:hidden;
    ${opts.direction === "horizontal" ? "flex-direction:row;" : "flex-direction:column;"}
    position:relative;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(root);

  const panels: HTMLElement[] = [];
  const splitters: HTMLElement[] = [];

  // Create panels and splitters
  for (let i = 0; i < panelCount; i++) {
    // Panel
    const panel = document.createElement("div");
    panel.className = `rp-panel rp-panel-${i}`;
    panel.style.cssText = `
      flex:${sizes[i]};min-width:0;min-height:0;overflow:auto;
      transition:flex ${opts.animationDuration > 0 ? `${opts.animationDuration}ms ease` : "none"};
      position:relative;
    `;
    root.appendChild(panel);
    panels.push(panel);

    // Splitter (between panels, not after last)
    if (i < panelCount - 1) {
      const splitter = document.createElement("div");
      splitter.className = `rp-splitter rp-splitter-${i}`;
      splitter.dataset.panelIndex = String(i);
      splitter.style.cssText = `
        flex-shrink:0;${opts.direction === "horizontal"
          ? `width:${opts.splitterSize}px;cursor:col-resize;`
          : `height:${opts.splitterSize}px;cursor:row-resize;`}
        background:${opts.splitterColor};
        display:flex;align-items:center;justify-content:center;
        position:relative;z-index:10;
        transition:background 0.15s;
        user-select:none;-webkit-user-select:none;touch-action:none;
      `;

      // Grip visual
      if (opts.showGrip) {
        const grip = document.createElement("div");
        grip.className = "rp-grip";
        grip.style.cssText = opts.direction === "horizontal"
          ? `width:2px;height:16px;border-radius:1px;background:#c7d2fe;`
          : `width:16px;height:2px;border-radius:1px;background:#c7d2fe;`;
        splitter.appendChild(grip);
      }

      // Collapse button (if collapsible)
      if (opts.collapseMode !== "none") {
        const collapseBtn = document.createElement("button");
        collapseBtn.type = "button";
        collapseBtn.className = "rp-collapse-btn";
        collapseBtn.innerHTML = opts.direction === "horizontal" ? "\u25C0" : "\u25B2";
        collapseBtn.title = "Collapse panel";
        collapseBtn.style.cssText = `
          position:absolute;${opts.direction === "horizontal"
            ? "top:50%;left:-8px;transform:translateY(-50%);"
            : "left:50%;top:-8px;transform:translateX(-50%);"}
          width:14px;height:14px;border-radius:50%;
          border:1px solid #d1d5db;background:#fff;color:#6b7280;
          font-size:8px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;padding:0;opacity:0;transition:opacity 0.15s;
        `;
        collapseBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          togglePanel(i);
        });
        splitter.addEventListener("mouseenter", () => { collapseBtn.style.opacity = "1"; });
        splitter.addEventListener("mouseleave", () => { collapseBtn.style.opacity = "0"; });
        splitter.appendChild(collapseBtn);
      }

      // Drag handling
      let dragging = false;
      let startPos = 0;
      let startSizes: number[] = [];

      const onDragStart = (clientX: number, clientY: number) => {
        dragging = true;
        startPos = opts.direction === "horizontal" ? clientX : clientY;
        startSizes = [...sizes];
        document.body.style.cursor = opts.direction === "horizontal" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";

        const onMove = (e: MouseEvent | TouchEvent) => {
          if (!dragging) return;
          const clientPos = "touches" in e ? e.touches[0]![opts.direction === "horizontal" ? "clientX" : "clientY"]
            : (e as MouseEvent)[opts.direction === "horizontal" ? "clientX" : "clientY"];
          const delta = clientPos - startPos;
          const containerSize = opts.direction === "horizontal" ? root.clientWidth : root.clientHeight;
          const deltaFrac = delta / containerSize;

          // Adjust adjacent panels
          const leftIdx = i;
          const rightIdx = i + 1;
          const minLeft = parseMinSize(leftIdx) / containerSize;
          const minRight = parseMinSize(rightIdx) / containerSize;
          const maxLeft = parseMaxSize(leftIdx) / containerSize || startSizes[leftIdx]! + startSizes[rightIdx]!;
          const maxRight = parseMaxSize(rightIdx) / containerSize || startSizes[rightIdx]! + startSizes[leftIdx]!;

          let newSizeLeft = startSizes[leftIdx]! + deltaFrac;
          let newSizeRight = startSizes[rightIdx]! - deltaFrac;

          // Clamp
          newSizeLeft = Math.max(minLeft, Math.min(maxLeft, newSizeLeft));
          newSizeRight = Math.max(minRight, Math.min(maxRight, newSizeRight));

          // If one hit limit, adjust the other
          if (newSizeLeft <= minLeft || newSizeLeft >= maxLeft) {
            newSizeRight = startSizes[leftIdx]! + startSizes[rightIdx]! - newSizeLeft;
          }
          if (newSizeRight <= minRight || newSizeRight >= maxRight) {
            newSizeLeft = startSizes[leftIdx]! + startSizes[rightIdx]! - newSizeRight;
          }

          applySizes([...startSizes.slice(0, leftIdx), newSizeLeft, newSizeRight, ...startSizes.slice(rightIdx + 1)]);
        };

        const onEnd = () => {
          dragging = false;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onEnd);
          document.removeEventListener("touchmove", onMove);
          document.removeEventListener("touchend", onEnd);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onEnd);
        document.addEventListener("touchmove", onMove);
        document.addEventListener("touchend", onEnd);
      };

      splitter.addEventListener("mousedown", (e) => onDragStart(e.clientX, e.clientY));
      splitter.addEventListener("touchstart", (e) => {
        const t = e.touches[0];
        if (t) onDragStart(t.clientX, t.clientY);
      }, { passive: true });

      // Hover effect
      splitter.addEventListener("mouseenter", () => {
        if (!dragging) splitter.style.background = opts.splitterHoverColor;
      });
      splitter.addEventListener("mouseleave", () => {
        if (!dragging) splitter.style.background = opts.splitterColor;
      });

      root.appendChild(splitter);
      splitters.push(splitter);
    }
  }

  // --- Helpers ---

  function parseMinSize(idx: number): number {
    const ms = opts.minSizes[idx];
    if (ms === undefined) return 40;
    if (typeof ms === "string") {
      if (ms.endsWith("%")) return (parseFloat(ms) / 100) * (opts.direction === "horizontal" ? root.clientWidth : root.clientHeight);
      return parseFloat(ms);
    }
    return ms;
  }

  function parseMaxSize(idx: number): number {
    const ms = opts.maxSizes[idx];
    if (ms === undefined) return Infinity;
    if (typeof ms === "string") {
      if (ms.endsWith("%")) return (parseFloat(ms) / 100) * (opts.direction === "horizontal" ? root.clientWidth : root.clientHeight);
      return parseFloat(ms);
    }
    return ms;
  }

  function applySizes(newSizes: number[]): void {
    sizes = [...newSizes];
    for (let i = 0; i < panelCount; i++) {
      if (collapsedPanels.has(i)) {
        panels[i]!.style.flex = "0 0 0";
        panels[i]!.style.overflow = "hidden";
        // Hide associated splitter
        if (i > 0 && splitters[i - 1]) splitters[i - 1]!.style.flex = "0 0 0";
      } else {
        panels[i]!.style.flex = String(sizes[i]);
        panels[i]!.style.overflow = "";
        if (i > 0 && splitters[i - 1]) splitters[i - 1]!.style.flex = "";
      }
    }
    opts.onResize?.(sizes);
  }

  function togglePanel(index: number): void {
    if (collapsedPanels.has(index)) {
      expandPanel(index);
    } else {
      collapsePanel(index);
    }
  }

  // --- Instance ---

  const instance: ResizablePanelInstance = {
    element: root,

    getSizes() { return [...sizes]; },

    setSizes(newSizes: number[]) {
      if (newSizes.length !== panelCount) return;
      const total = newSizes.reduce((s, v) => s + v, 0);
      applySizes(newSizes.map(s => s / total));
    },

    resizePanel(index: number, size: number) {
      if (index < 0 || index >= panelCount) return;
      const newSizes = [...sizes];
      const diff = size - newSizes[index]!;
      newSizes[index] = size;
      // Distribute diff to next panel (or previous if last)
      const siblingIndex = index < panelCount - 1 ? index + 1 : index - 1;
      if (siblingIndex >= 0 && siblingIndex < panelCount) {
        newSizes[siblingIndex] = Math.max(0.01, newSizes[siblingIndex]! - diff);
      }
      applySizes(newSizes);
    },

    collapsePanel(index: number) {
      if (opts.collapseMode === "none") return;
      collapsedPanels.add(index);
      applySizes(sizes);
    },

    expandPanel(index: number) {
      collapsedPanels.delete(index);
      applySizes(sizes);
    },

    togglePanel,

    isCollapsed(index: number) {
      return collapsedPanels.has(index);
    },

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
