/**
 * Resizable Panels: Multi-panel layout system with drag-to-resize splitters,
 * collapsible panels, min/max size constraints, persistence, nested layouts,
 * and responsive breakpoints.
 */

// --- Types ---

export type PanelDirection = "horizontal" | "vertical";
export type PanelCollapseMode = "none" | "collapsible" | "auto-collapse";

export interface PanelConfig {
  /** Unique panel ID */
  id: string;
  /** Initial size (px or percentage string) */
  size?: string | number;
  /** Minimum size in px */
  minSize?: number;
  /** Maximum size in px */
  maxSize?: number;
  /** Default size when reset */
  defaultSize?: string | number;
  /** Can this panel be collapsed? */
  collapsible?: boolean;
  /** Is this panel initially collapsed? */
  collapsed?: boolean;
  /** Panel content element or HTML string */
  content?: HTMLElement | string;
  /** Custom CSS class for the panel */
  className?: string;
  /** Data attribute for the panel */
  data?: Record<string, unknown>;
}

export interface ResizablePanelsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Panel configurations */
  panels: PanelConfig[];
  /** Layout direction */
  direction?: PanelDirection;
  /** Size of the splitter handle (px) */
  splitterSize?: number;
  /** Show splitter visual? */
  showSplitters?: boolean;
  /** Collapse mode for all panels */
  collapseMode?: PanelCollapseMode;
  /** Animation duration for collapse/expand (ms) */
  animationDuration?: number;
  /** Persist layout in localStorage? */
  persistKey?: string;
  /** Callback on resize */
  onResize?: (panelId: string, newSize: number) => void;
  /** Callback on panel collapse/expand */
  onCollapseChange?: (panelId: string, collapsed: boolean) => void;
  /** Custom splitter renderer */
  renderSplitter?: (index: number, direction: PanelDirection) => HTMLElement;
  /** Custom CSS class */
  className?: string;
}

export interface ResizablePanelsInstance {
  element: HTMLElement;
  /** Get current sizes as record of panel ID -> px */
  getSizes: () => Record<string, number>;
  /** Set a specific panel's size */
  setPanelSize: (panelId: string, size: number) => void;
  /** Collapse a panel */
  collapsePanel: (panelId: string) => void;
  /** Expand a collapsed panel */
  expandPanel: (panelId: string) => void;
  /** Toggle collapse state */
  togglePanel: (panelId: string) => void;
  /** Reset to default sizes */
  reset: () => void;
  /** Add a panel dynamically */
  addPanel: (config: PanelConfig, index?: number) => void;
  /** Remove a panel by ID */
  removePanel: (panelId: string) => void;
  /** Get panel element by ID */
  getPanelElement: (panelId: string) => HTMLElement | undefined;
  /** Refresh layout (call after DOM changes) */
  refresh: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createResizablePanels(options: ResizablePanelsOptions): ResizablePanelsInstance {
  const opts = {
    direction: options.direction ?? "horizontal",
    splitterSize: options.splitterSize ?? 6,
    showSplitters: options.showSplitters ?? true,
    collapseMode: options.collapseMode ?? "none",
    animationDuration: options.animationDuration ?? 200,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ResizablePanels: container not found");

  // State
  const isHorizontal = opts.direction === "horizontal";
  let destroyed = false;

  // Parse initial sizes
  interface InternalPanel {
    config: PanelConfig;
    element: HTMLElement;
    currentSize: number; // in pixels
    collapsed: boolean;
    minSize: number;
    maxSize: number;
    defaultSize: number;
  }

  const panels: InternalPanel[] = [];
  const splitters: HTMLElement[] = [];

  // Build DOM
  container.className = `resizable-panels rp-${opts.direction} ${opts.className ?? ""}`;
  container.style.cssText = `
    display:flex;${isHorizontal ? "flex-direction:row" : "flex-direction:column"};
    width:100%;height:100%;overflow:hidden;position:relative;
  `;

  function init(): void {
    // Load persisted sizes if available
    const persisted = loadPersisted();

    for (let i = 0; i < opts.panels.length; i++) {
      const cfg = { ...opts.panels[i]! };

      // Resolve size
      let sizePx: number;
      if (persisted && persisted[cfg.id] !== undefined) {
        sizePx = persisted[cfg.id]!;
      } else if (typeof cfg.size === "string" && cfg.size.endsWith("%")) {
        const totalSize = isHorizontal ? container.clientWidth : container.clientHeight;
        sizePx = totalSize * parseFloat(cfg.size) / 100;
      } else if (typeof cfg.size === "number") {
        sizePx = cfg.size;
      } else {
        // Equal distribution
        const totalSize = isHorizontal ? container.clientWidth : container.clientHeight;
        sizePx = Math.floor(totalSize / opts.panels.length);
      }

      const defSize = typeof cfg.defaultSize === "number"
        ? cfg.defaultSize
        : typeof cfg.defaultSize === "string" && cfg.defaultSize?.endsWith("%")
          ? (isHorizontal ? container.clientWidth : container.clientHeight) * parseFloat(cfg.defaultSize) / 100
          : sizePx;

      const panelEl = document.createElement("div");
      panelEl.className = `rp-panel ${cfg.className ?? ""}`;
      panelEl.dataset.panelId = cfg.id;
      panelEl.style.cssText = `
        flex-shrink:0;overflow:hidden;position:relative;
        transition:${isHorizontal ? "width" : "height"} ${opts.animationDuration}ms ease;
        ${cfg.collapsed !== true ? "" : `${isHorizontal ? "width" : "height"}:0;`}
      `;

      // Set content
      if (cfg.content) {
        if (typeof cfg.content === "string") {
          panelEl.innerHTML = cfg.content;
        } else {
          panelEl.appendChild(cfg.content);
        }
      }

      container.appendChild(panelEl);

      const internal: InternalPanel = {
        config: cfg,
        element: panelEl,
        currentSize: sizePx,
        collapsed: cfg.collapsed ?? false,
        minSize: cfg.minSize ?? (isHorizontal ? 80 : 60),
        maxSize: cfg.maxSize ?? Infinity,
        defaultSize: defSize ?? sizePx,
      };
      panels.push(internal);

      // Add splitter between panels (not after last)
      if (i < opts.panels.length - 1) {
        const splitter = createSplitter(i);
        container.appendChild(splitter);
        splitters.push(splitter);
      }
    }

    applySizes();
    observeResize();
  }

  function createSplitter(index: number): HTMLElement {
    if (opts.renderSplitter) return opts.renderSplitter(index, opts.direction);

    const el = document.createElement("div");
    el.className = "rp-splitter";
    el.dataset.splitterIndex = String(index);

    const size = opts.splitterSize;
    el.style.cssText = `
      flex-shrink:0;${isHorizontal ? `width:${size}px` : `height:${size}px`};
      cursor:${isHorizontal ? "col-resize" : "row-resize"};
      position:relative;z-index:2;
      display:flex;align-items:center;justify-content:center;
      transition:background 0.15s;
      ${!opts.showSplitters ? "background:transparent;" : ""}
    `;

    if (opts.showSplitters) {
      // Visual grip indicator
      const grip = document.createElement("div");
      grip.style.cssText = `
        display:flex;${isHorizontal ? "flex-direction:column" : "flex-direction:row"};gap:2px;
        opacity:0.3;transition:opacity 0.15s;
      `;
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement("div");
        dot.style.cssText = `
          ${isHorizontal ? `width:2px;height:8px;border-radius:1px;background:#9ca3af;`
            : `width:8px;height:2px;border-radius:1px;background:#9ca3af;`}
        `;
        grip.appendChild(dot);
      }
      el.appendChild(grip);

      el.addEventListener("mouseenter", () => { grip.style.opacity = "1"; });
      el.addEventListener("mouseleave", () => { grip.style.opacity = "0.3"; });
    }

    // Hover highlight
    el.addEventListener("mouseenter", () => {
      if (!opts.showSplitters) el.style.background = "rgba(99,102,241,0.08)";
    });
    el.addEventListener("mouseleave", () => {
      if (!opts.showSplitters) el.style.background = "transparent";
    });

    // Double-click to reset adjacent panels
    el.addEventListener("dblclick", () => {
      instance.reset();
    });

    // Drag handling
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startSizes: number[] = [];

    function onPointerDown(e: PointerEvent): void {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startSizes = panels.map((p) => p.currentSize);
      el.setPointerCapture(e.pointerId);

      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      // Highlight
      if (!opts.showSplitters) el.style.background = "rgba(99,102,241,0.2)";
    }

    function onPointerMove(e: PointerEvent): void {
      if (!dragging || e.pointerId !== Number(el.dataset.activePointer)) return;

      const delta = isHorizontal ? e.clientX - startX : e.clientY - startY;
      const leftIdx = index;
      const rightIdx = index + 1;

      if (leftIdx >= panels.length || rightIdx >= panels.length) return;

      const leftPanel = panels[leftIdx]!;
      const rightPanel = panels[rightIdx]!;

      // Don't resize collapsed panels
      if (leftPanel.collapsed || rightPanel.collapsed) return;

      let newLeft = startSizes[leftIdx]! + delta;
      let newRight = startSizes[rightIdx]! - delta;

      // Clamp to constraints
      newLeft = Math.max(leftPanel.minSize, Math.min(leftPanel.maxSize, newLeft));
      newRight = Math.max(rightPanel.minSize, Math.min(rightPanel.maxSize, newRight));

      // Ensure total stays the same
      const total = startSizes[leftIdx]! + startSizes[rightIdx]!;
      newLeft = Math.min(newLeft, total - rightPanel.minSize);
      newRight = total - newLeft;

      leftPanel.currentSize = newLeft;
      rightPanel.currentSize = newRight;

      applySizes();
      savePersisted();
      opts.onResize?.(leftPanel.config.id, newLeft);
      opts.onResize?.(rightPanel.config.id, newRight);
    }

    function onPointerUp(_e: PointerEvent): void {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture(Number(el.dataset.activePointer));
      delete el.dataset.activePointer;

      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (!opts.showSplitters) el.style.background = "transparent";
    }

    el.addEventListener("pointerdown", (e) => {
      el.dataset.activePointer = String(e.pointerId);
      onPointerDown(e);
    });
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);

    return el;
  }

  function applySizes(): void {
    for (const panel of panels) {
      if (panel.collapsed) {
        panel.element.style[isHorizontal ? "width" as const : "height" as const] = "0";
        panel.element.style.overflow = "hidden";
      } else {
        panel.element.style[isHorizontal ? "width" as const : "height" as const] = `${Math.round(panel.currentSize)}px`;
        panel.element.style.overflow = "";
      }
    }
  }

  // ResizeObserver for container changes
  let resizeObserver: ResizeObserver | null = null;

  function observeResize(): void {
    resizeObserver = new ResizeObserver(() => {
      if (destroyed) return;
      redistributeSizes();
    });
    resizeObserver.observe(container);
  }

  function redistributeSizes(): void {
    const totalSize = isHorizontal ? container.clientWidth : container.clientHeight;
    const activePanels = panels.filter((p) => !p.collapsed);
    const usedSize = activePanels.reduce((sum, p) => sum + p.currentSize, 0);
    const diff = totalSize - usedSize;

    if (Math.abs(diff) < 1) return; // negligible

    // Distribute difference proportionally
    for (const panel of activePanels) {
      const ratio = panel.currentSize / usedSize;
      panel.currentSize += diff * ratio;
    }

    applySizes();
  }

  // Persistence
  function loadPersisted(): Record<string, number> | null {
    if (!opts.persistKey) return null;
    try {
      const raw = localStorage.getItem(opts.persistKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function savePersisted(): void {
    if (!opts.persistKey) return;
    try {
      const data: Record<string, number> = {};
      for (const panel of panels) {
        data[panel.config.id] = panel.currentSize;
      }
      localStorage.setItem(opts.persistKey, JSON.stringify(data));
    } catch {}
  }

  const instance: ResizablePanelsInstance = {
    element: container,

    getSizes() {
      const result: Record<string, number> = {};
      for (const panel of panels) {
        result[panel.config.id] = panel.currentSize;
      }
      return result;
    },

    setPanelSize(panelId: string, size: number) {
      const panel = panels.find((p) => p.config.id === panelId);
      if (!panel || panel.collapsed) return;
      panel.currentSize = Math.max(panel.minSize, Math.min(panel.maxSize, size));
      applySizes();
      savePersisted();
      opts.onResize?.(panelId, panel.currentSize);
    },

    collapsePanel(panelId: string) {
      const panel = panels.find((p) => p.config.id === panelId);
      if (!panel || !panel.config.collapsible || panel.collapsed) return;
      panel.collapsed = true;
      applySizes();
      savePersisted();
      opts.onCollapseChange?.(panelId, true);
    },

    expandPanel(panelId: string) {
      const panel = panels.find((p) => p.config.id === panelId);
      if (!panel || !panel.collapsed) return;
      panel.collapsed = false;
      // Restore to default or reasonable size
      panel.currentSize = panel.defaultSize > 0 ? panel.defaultSize : 200;
      applySizes();
      savePersisted();
      opts.onCollapseChange?.(panelId, false);
    },

    togglePanel(panelId: string) {
      const panel = panels.find((p) => p.config.id === panelId);
      if (!panel) return;
      if (panel.collapsed) {
        instance.expandPanel(panelId);
      } else {
        instance.collapsePanel(panelId);
      }
    },

    reset() {
      for (const panel of panels) {
        panel.currentSize = panel.defaultSize;
        panel.collapsed = panel.config.collapsed ?? false;
      }
      applySizes();
      savePersisted();
    },

    addPanel(config: PanelConfig, index?: number) {
      const insertAt = index ?? panels.length;
      const totalSize = isHorizontal ? container.clientWidth : container.clientHeight;
      const sizePx = typeof config.size === "number"
        ? config.size
        : typeof config.size === "string" && config.size.endsWith("%")
          ? totalSize * parseFloat(config.size) / 100
          : Math.floor(totalSize / (panels.length + 1));

      const defSize = typeof config.defaultSize === "number'
        ? config.defaultSize
        : sizePx;

      const panelEl = document.createElement("div");
      panelEl.className = `rp-panel ${config.className ?? ""}`;
      panelEl.dataset.panelId = config.id;
      panelEl.style.cssText = `flex-shrink:0;overflow:hidden;position:relative;${isHorizontal ? `width:${sizePx}px` : `height:${sizePx}px`};`;

      if (config.content) {
        if (typeof config.content === "string") panelEl.innerHTML = config.content;
        else panelEl.appendChild(config.content);
      }

      const internal: InternalPanel = {
        config,
        element: panelEl,
        currentSize: sizePx,
        collapsed: config.collapsed ?? false,
        minSize: config.minSize ?? (isHorizontal ? 80 : 60),
        maxSize: config.maxSize ?? Infinity,
        defaultSize: defSize,
      };

      // Insert at position
      if (insertAt < panels.length) {
        const refPanel = panels[insertAt];
        if (refPanel) {
          container.insertBefore(panelEl, refPanel.element);
        } else {
          container.appendChild(panelEl);
        }
      } else {
        container.appendChild(panelEl);
      }

      panels.splice(insertAt, 0, internal);

      // Add splitter before this panel (unless it's the first)
      if (insertAt > 0 && splitters.length < panels.length - 1) {
        const newSplitter = createSplitter(insertAt - 1);
        container.insertBefore(newSplitter, panelEl);
        splitters.splice(insertAt - 1, 0, newSplitter);
      }

      // If not last, add splitter after
      if (insertAt < panels.length - 1) {
        const nextPanel = panels[insertAt + 1];
        if (nextPanel) {
          const newSplitter = createSplitter(insertAt);
          container.insertBefore(newSplitter, nextPanel.element);
          splitters.splice(insertAt, 0, newSplitter);
        }
      }

      applySizes();
    },

    removePanel(panelId: string) {
      const idx = panels.findIndex((p) => p.config.id === panelId);
      if (idx < 0) return;

      const panel = panels[idx]!;
      panel.element.remove();

      // Remove associated splitter
      if (idx > 0 && splitters[idx - 1]) {
        splitters[idx - 1]!.remove();
        splitters.splice(idx - 1, 1);
      } else if (splitters[idx]) {
        splitters[idx]!.remove();
        splitters.splice(idx, 1);
      }

      panels.splice(idx, 1);
      redistributeSizes();
      savePersisted();
    },

    getPanelElement(panelId: string) {
      return panels.find((p) => p.config.id === panelId)?.element;
    },

    refresh() {
      redistributeSizes();
      applySizes();
    },

    destroy() {
      destroyed = true;
      resizeObserver?.disconnect();
      container.innerHTML = "";
      container.style.cssText = "";
      panels.length = 0;
      splitters.length = 0;
    },
  };

  init();
  return instance;
}
