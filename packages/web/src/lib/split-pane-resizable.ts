/**
 * Split Pane Resizable: Multi-pane resizable layout component.
 * Supports:
 * - Horizontal or vertical split
 * - Multiple panes with initial size ratios
 * - Drag to resize
 * - Min/max pane size constraints
 * - Collapsible panes
 * - Nested split panes
 * - Pixel-perfect sizing
 * - Touch support for mobile
 * - Persist sizes to localStorage
 */

// --- Types ---

export type SplitDirection = "horizontal" | "vertical";
export type ResizeHandle = "bar" | "thin" | "none";

export interface PaneConfig {
  /** Unique key */
  key: string;
  /** Initial size as fraction (0-1) or pixel value */
  size: number | string;
  /** Minimum size in px or % (default: 50) */
  minSize?: number | string;
  /** Maximum size in px or % */
  maxSize?: number | string;
  /** Collapsible? */
  collapsible?: boolean;
  /** Initially collapsed? */
  defaultCollapsed?: boolean;
  /** Content (HTML string or element) */
  content: string | HTMLElement;
  /** Title shown on collapse handle */
  title?: string;
  /** Can be resized? (default: true) */
  resizable?: boolean;
}

export interface SplitPaneOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Panes configuration */
  panes: PaneConfig[];
  /** Direction of split (default: horizontal) */
  direction?: SplitDirection;
  /** Handle/bar style (default: bar) */
  handleStyle?: ResizeHandle;
  /** Handle size in px (default: 8 for bar, 4 for thin) */
  handleSize?: number;
  /** Handle color (default: #e5e7eb) */
  handleColor?: string;
  /** Handle hover color (default: #6366f1) */
  handleHoverColor?: string;
  /** Handle active/dragging color (default: #4338ca) */
  handleActiveColor?: string;
  /** Gap between handle and content (default: 0) */
  gutter?: number;
  /** Show collapse buttons on handles (default: true) */
  showCollapseButtons?: boolean;
  /** Animation duration ms (default: 150) */
  animationDuration?: number;
  /** Persist sizes to localStorage (default: false) */
  persistSizes?: boolean;
  /** Storage key (default: "split-sizes") */
  storageKey?: string;
  /** Callback when sizes change */
  onResize?: (sizes: Record<string, number>) => void;
  /** Callback when a pane collapses/expands */
  onToggle?: (key: string, collapsed: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SplitPaneInstance {
  element: HTMLElement;
  /** Get current sizes as record of key -> px */
  getSizes: () => Record<string, number>;
  /** Set size of a specific pane */
  setPaneSize: (key: string, size: number | string) => void;
  /** Collapse/expand a pane */
  togglePane: (key: string) => void;
  /** Collapse all other panes except one */
  maximizePane: (key: string) => void;
  /** Reset to initial sizes */
  reset: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

function parseSize(size: number | string, total: number): { px: number; isPercent: boolean } {
  if (typeof size === "number") return { px: size, isPercent: false };
  const str = String(size);
  if (str.endsWith("%")) {
    return { px: (parseFloat(str) / 100) * total, isPercent: true };
  }
  return { px: parseFloat(str), isPercent: false };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function generateId(): string {
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// --- Main ---

export function createSplitPane(options: SplitPaneOptions): SplitPaneInstance {
  const opts = {
    direction: "horizontal" as SplitDirection,
    handleStyle: "bar" as ResizeHandle,
    handleSize: 8,
    handleColor: "#e5e7eb",
    handleHoverColor: "#c7d2fe",
    handleActiveColor: "#a5b4fc",
    gutter: 0,
    showCollapseButtons: true,
    animationDuration: 150,
    persistSizes: false,
    storageKey: "split-sizes",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Split Pane: container not found");

  // Root
  const root = document.createElement("div");
  root.className = `split-pane ${opts.className ?? ""} sp-${opts.direction}`;
  root.style.cssText = `
    display:flex;width:100%;height:100%;overflow:hidden;
    position:relative;font-family:-apple-system,sans-serif;
    ${opts.direction === "horizontal" ? "flex-direction:row;" : "flex-direction:column;"}
  `;
  container.appendChild(root);

  // State
  let destroyed = false;
  let totalSize = 0;
  const collapsedPanes = new Set<string>();
  const paneElements = new Map<string, HTMLElement>();
  const handleElements: HTMLDivElement[] = [];
  let resizeState: { activeIndex: number; startPos: number; startSizes: number[] } | null = null;

  // Parse initial sizes
  interface ParsedPane {
    config: PaneConfig;
    initialPx: number;
    currentPx: number;
    minPx: number;
    maxPx: number;
  }
  const parsedPanes: ParsedPane[] = [];

  // Load persisted sizes
  let persistedSizes: Record<string, number> | null = null;
  if (opts.persistSizes) {
    try { persistedSizes = JSON.parse(localStorage.getItem(opts.storageKey) ?? "null"); } catch { /* ignore */ }
  }

  // Initialize after measuring
  requestAnimationFrame(() => {
    const rect = root.getBoundingClientRect();
    totalSize = opts.direction === "horizontal" ? rect.width : rect.height;

    let remainingFractional = 0;

    for (let i = 0; i < opts.panes.length; i++) {
      const cfg = opts.panes[i]!;
      let initialPx: number;

      if (persistedSizes && persistedSizes![cfg.key] !== undefined) {
        initialPx = persistedSizes![cfg.key]!;
      } else {
        const parsed = parseSize(cfg.size, totalSize);
        if (parsed.isPercent) {
          initialPx = parsed.px + remainingFractional;
          remainingFractional = parsed.px - Math.floor(parsed.px);
        } else {
          initialPx = parsed.px;
        }
      }

      const minParsed = parseSize(cfg.minSize ?? 50, totalSize);
      const maxParsed = parseSize(cfg.maxPx ?? totalSize, totalSize);
      const minPx = minParsed.isPercent ? (minParsed.percent / 100) * totalSize : minParsed.px;
      const maxPx = maxParsed.isPercent ? (maxParsed.percent / 100) * totalSize : maxParsed.px;

      parsedPanes.push({
        config: cfg,
        initialPx: clamp(initialPx, minPx, maxPx),
        currentPx: clamp(initialPx, minPx, maxPx),
        minPx,
        maxPx: maxPx,
      });

      if (cfg.defaultCollapsed) collapsedPanes.add(cfg.key);
    }

    render();
  });

  // --- Render ---

  function render(): void {
    root.innerHTML = "";
    paneElements.clear();
    handleElements.length = 0;

    for (let i = 0; i < parsedPanes.length; i++) {
      const pp = parsedPanes[i]!;
      const isCollapsed = collapsedPanes.has(pp.config.key);
      const isLast = i === parsedPanes.length - 1;

      // Pane wrapper
      const paneEl = document.createElement("div");
      paneEl.dataset.paneKey = pp.config.key;
      paneEl.style.cssText = `
        overflow:hidden;position:relative;flex-shrink:0;
        ${isCollapsed ? "display:none;" : ""}
        transition:flex-basis ${opts.animationDuration}ms ease;
        flex-basis:${isCollapsed ? "0" : `${pp.currentPx}px};
      `;
      paneElements.set(pp.config.key, paneEl);

      // Content
      if (typeof pp.config.content === "string") {
        paneEl.innerHTML = `<div style="width:100%;height:100%;overflow:auto;">${pp.config.content}</div>`;
      } else {
        pp.config.content.style.width = "100%";
        pp.config.content.style.height = "100%";
        pp.config.content.style.overflow = "auto";
        paneEl.appendChild(pp.config.content);
      }

      root.appendChild(paneEl);

      // Handle (between panes, not after last)
      if (!isLast && !isCollapsed) {
        const handle = createHandle(i, pp);
        handleElements.push(handle);
        root.appendChild(handle);
      }
    }
  }

  function createHandle(index: number, _afterPane: ParsedPane): HTMLDivElement {
    const handle = document.createElement("div");
    handle.className = "sp-handle";
    handle.dataset.handleIndex = String(index);

    const isH = opts.direction === "horizontal";
    const size = opts.handleStyle === "thin" ? 4 : opts.handleSize;

    handle.style.cssText = `
      flex-shrink:0;background:${opts.handleColor};cursor:${isH ? "col-resize" : "row-resize"};
      ${isH ? `width:${size}px` : `height:${size}px`};
      position:relative;z-index:2;display:flex;align-items:center;justify-content:center;
      transition:background ${opts.animationDuration}ms ease;
      ${opts.gutter > 0 ? `margin:${isH ? `0 ${opts.gutter / 2}px` : `${opts.gutter / 2}px 0`}` : ""}
    `;

    // Collapse button
    if (opts.showCollapseButtons) {
      const collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.title = "Collapse pane";
      collapseBtn.innerHTML = isH ? "&laquo;" : "&rsaquo;";
      collapseBtn.style.cssText = `
        background:none;border:none;cursor:pointer;padding:3px;margin:0;
        font-size:11px;color:#9ca3af;line-height:1;border-radius:3px;
        transition:all 0.15s;opacity:0.5;
      `;
      collapseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pane = parsedPanes[index];
        if (pane) togglePane(pane.config.key);
      });
      collapseBtn.addEventListener("mouseenter", () => { collapseBtn.style.opacity = "1"; collapseBtn.style.background = "#f0f0f0"; });
      collapseBtn.addEventListener("mouseleave", () => { collapseBtn.style.opacity = "0.5"; collapseBtn.style.background = ""; });
      handle.appendChild(collapseBtn);
    }

    // Drag setup
    let startClientPos = 0;
    let startSizes: number[] = [];

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const rect = root.getBoundingClientRect();
      startClientPos = isH ? e.clientX : e.clientY;
      startSizes = parsedPanes.map(p => p.currentPx);
      resizeState = { activeIndex: index, startPos: startClientPos, startSizes };

      handle.style.background = opts.handleActiveColor;
      document.body.style.cursor = isH ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup", onDragEnd);
    });

    handle.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0]!;
      const rect = root.getBoundingClientRect();
      startClientPos = isH ? touch.clientX : touch.clientY;
      startSizes = parsedPanes.map(p => p.currentPx);
      resizeState = { activeIndex: index, startPos: startClientPos, startSizes };

      handle.style.background = opts.handleActiveColor;
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
    }, { passive: false });

    function onDragMove(e: MouseEvent): void {
      if (!resizeState) return;
      const clientPos = isH ? e.clientX : e.clientY;
      const delta = clientPos - resizeState.startPos;
      redistributeDelta(delta, resizeState.startSizes, resizeState.activeIndex);
      applySizes();
      opts.onResize?.(getSizes());
    }

    function onTouchMove(e: TouchEvent): void {
      if (!resizeState) return;
      const touch = e.touches[0]!;
      const clientPos = isH ? touch.clientX : touch.clientY;
      const delta = clientPos - resizeState.startPos;
      redistributeDelta(delta, resizeState.startSizes, resizeState.activeIndex);
      applySizes();
      opts.onResize?.(getSizes());
    }

    function onDragEnd(): void {
      if (!resizeState) return;
      resizeState = null;
      handle.style.background = opts.handleColor;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragEnd);
      saveSizes();
    }

    function onTouchEnd(): void {
      if (!resizeState) return;
      resizeState = null;
      handle.style.background = opts.handleColor;
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      saveSizes();
    }

    // Hover effect
    handle.addEventListener("mouseenter", () => {
      if (!resizeState) handle.style.background = opts.handleHoverColor;
    });
    handle.addEventListener("mouseleave", () => {
      if (!resizeState) handle.style.background = opts.handleColor;
    });

    return handle;
  }

  function redistributeDelta(
    delta: number,
    baseSizes: number[],
    activeIdx: number,
  ): void {
    const totalBase = baseSizes.reduce((s, _) => s, 0);
    const availableSpace = totalSize - baseSizes.reduce((s, _, i) =>
      collapsedPanes.has(parsedPanes[i]!.config.key) ? 0 : s, 0)
      - (parsedPanes.length - 1) * (opts.handleStyle === "thin" ? 4 : opts.handleSize);

    // Distribute delta proportionally to adjacent panes
    for (let i = 0; i < parsedPanes.length; i++) {
      if (collapsedPanes.has(parsedPanes[i]!.config.key)) continue;

      if (i === activeIdx || i === activeIdx - 1) {
        const factor = i === activeIdx ? 0.6 : 0.4;
        const change = delta * factor;
        const newSize = baseSizes[i]! + change;

        // Apply constraints
        const pp = parsedPanes[i]!;
        const clamped = clamp(newSize, pp.minPx, pp.maxPx);
        parsedPanes[i]!.currentPx = clamped;

        // Compensate by adjusting the next non-collapsed pane
        if (i < parsedPanes.length - 1) {
          const nextIdx = parsedPanes.findIndex((p, idx) => idx > i && !collapsedPanes.has(p.config.key));
          if (nextIdx >= 0) {
            const nextChange = -(clamped - baseSizes[i]!);
            parsedPanes[nextIdx]!.currentPx = clamp(baseSizes[nextIdx]! + nextChange, parsedPanes[nextIdx]!.minPx, parsedPanes[nextIdx]!.maxPx);
          }
        }
      }
    }
  }

  function applySizes(): void {
    for (const pp of parsedPanes) {
      const el = paneElements.get(pp.config.key);
      if (el) el.style.flexBasis = `${collapsedPanes.has(pp.config.key) ? 0 : pp.currentPx}px`;
    }
  }

  function saveSizes(): void {
    if (opts.persistSizes) {
      try {
        localStorage.setItem(opts.storageKey, JSON.stringify(getSizes()));
      } catch { /* ignore */ }
    }
  }

  // --- Public API ---

  function getSizes(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const pp of parsedPanes) {
      result[pp.config.key] = pp.currentPx;
    }
    return result;
  }

  function setPaneSize(key: string, size: number | string): void {
    const idx = parsedPanes.findIndex(p => p.config.key === key);
    if (idx < 0) return;

    const parsed = parseSize(size, totalSize);
    parsedPanes[idx]!.currentX = clamp(parsed.px, parsedPanes[idx]!.minPx, parsedPanes[idx]!.maxPx);
    applySizes();
    opts.onResize?.(getSizes());
    saveSizes();
  }

  function togglePane(key: string): void {
    if (collapsedPanes.has(key)) {
      collapsedPanes.delete(key);
    } else {
      collapsedPanes.add(key);
    }
    render();
    opts.onToggle?.(key, collapsedPanes.has(key));
  }

  function maximizePane(key: string): void {
    for (const pp of parsedPanes) {
      if (pp.config.key !== key) {
        collapsedPanes.add(pp.config.key);
      } else {
        collapsedPanes.delete(key);
      }
    }
    render();
  }

  function reset(): void {
    collapsedPanes.clear();
    for (const pp of parsedPanes) {
      pp.currentPx = pp.initialPx;
    }
    applySizes();
    opts.onResize?.(getSizes());
  }

  const instance: SplitPaneInstance = {
    element: root,

    getSizes,
    setPaneSize,
    togglePane,
    maximizePane,
    reset,

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
