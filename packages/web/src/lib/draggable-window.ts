/**
 * Draggable Window: Floating window panel system with drag-to-move, resize handles,
 * minimize/maximize/close controls, z-order management (bring-to-front), snap to edges,
 * title bar with window controls, state persistence, and keyboard accessibility.
 */

// --- Types ---

export type WindowState = "normal" | "minimized" | "maximized";
export type WindowControl = "minimize" | "maximize" | "close";

export interface DraggableWindowOptions {
  /** Window title */
  title?: string;
  /** Content element or HTML string */
  content: HTMLElement | string;
  /** Initial position (px from top-left of viewport) */
  x?: number;
  y?: number;
  /** Initial width (default: 400) */
  width?: number;
  /** Initial height (default: 300) */
  height?: number;
  /** Minimum dimensions */
  minWidth?: number;
  minHeight?: number;
  /** Maximum dimensions */
  maxWidth?: number;
  maxHeight?: number;
  /** Enable dragging via title bar (default: true) */
  draggable?: boolean;
  /** Enable resizing (default: true) */
  resizable?: boolean;
  /** Which resize edges (default: all) */
  resizeEdges?: ("n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw")[];
  /** Show title bar (default: true) */
  showTitleBar?: boolean;
  /** Which controls to show (default: all) */
  controls?: WindowControl[];
  /** Snap to screen edges when within threshold px (default: 12) */
  snapThreshold?: number;
  /** Snap to half-screen on edge drag (default: true) */
  snapToHalfScreen?: boolean;
  /** Keep window within viewport bounds (default: true) */
  constrainToViewport?: boolean;
  /** Z-index base (auto-managed) */
  zIndex?: number;
  /** Custom CSS class for container */
  className?: string;
  /** Portal target (default: document.body) */
  portalTarget?: HTMLElement;
  /** Called when window is focused (brought to front) */
  onFocus?: (window: DraggableWindowInstance) => void;
  /** Called on move */
  onMove?: (x: number, y: number) => void;
  /** Called on resize */
  onResize?: (width: number, height: number) => void;
  /** Called on state change */
  onStateChange?: (state: WindowState) => void;
  /** Called on close (return false to prevent) */
  shouldClose?: () => boolean | Promise<boolean>;
  /** Persist position/size/state to localStorage */
  persistKey?: string;
}

export interface DraggableWindowInstance {
  id: string;
  element: HTMLElement;
  state: WindowState;

  // Position/size
  getPosition(): { x: number; y: number };
  setPosition(x: number, y: number): void;
  getSize(): { width: number; height: number };
  setSize(w: number, h: number): void;

  // State
  minimize(): void;
  maximize(): void;
  restore(): void;
  close(): void;
  bringToFront(): void;

  // Title
  setTitle(title: string): void;
  setContent(content: HTMLElement | string): void;

  // Lifecycle
  destroy(): void;
}

let windowIdCounter = 0;

// --- Z-Order Manager ---

class WindowManager {
  private windows = new Map<string, DraggableWindowInstance>();
  private baseZ = 900;
  private currentZ = 900;

  register(win: DraggableWindowInstance): number {
    this.windows.set(win.id, win);
    this.currentZ += 5;
    return this.currentZ;
  }

  unregister(id: string): void { this.windows.delete(id); }

  bringToFront(id: string): number {
    const z = this.register(this.windows.get(id)!);
    return z;
  }

  getTopmost(): DraggableWindowInstance | undefined {
    let top: DraggableWindowInstance | undefined;
    let maxZ = 0;
    for (const [, win] of this.windows) {
      const elZ = parseInt(win.element.style.zIndex ?? "0", 10);
      if (elZ > maxZ) { maxZ = elZ; top = win; }
    }
    return top;
  }
}

const globalWM = new WindowManager();

// --- Draggable Window Implementation ---

export function createDraggableWindow(options: DraggableWindowOptions): DraggableWindowInstance {
  const id = `win_${++windowIdCounter}_${Date.now().toString(36)}`;
  const portal = options.portalTarget ?? document.body;

  const config = {
    x: options.x ?? 100,
    y: options.y ?? 100,
    width: options.width ?? 400,
    height: options.height ?? 300,
    minWidth: options.minWidth ?? 200,
    minHeight: options.minHeight ?? 150,
    maxWidth: options.maxWidth ?? Infinity,
    maxHeight: options.maxHeight ?? Infinity,
    draggable: options.draggable ?? true,
    resizable: options.resizable ?? true,
    showTitleBar: options.showTitleBar ?? true,
    controls: options.controls ?? ["minimize", "maximize", "close"],
    snapThreshold: options.snapThreshold ?? 12,
    snapToHalfScreen: options.snapToHalfScreen ?? true,
    constrainToViewport: options.constrainToViewport ?? true,
    ...options,
  };

  let currentState: WindowState = "normal";
  let prevBounds = { x: config.x, y: config.y, w: config.width, h: config.height }; // For restore from maximize

  // Restore persisted state
  if (config.persistKey) {
    try {
      const saved = localStorage.getItem(`dw:${config.persistKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        config.x = parsed.x ?? config.x;
        config.y = parsed.y ?? config.y;
        config.width = parsed.width ?? config.width;
        config.height = parsed.height ?? config.height;
        if (parsed.state === "maximized") currentState = "maximized";
        else if (parsed.state === "minimized") currentState = "minimized";
      }
    } catch {}
  }

  // Create window element
  const winEl = document.createElement("div");
  winEl.id = id;
  winEl.className = `dw-window ${config.className ?? ""}`;
  winEl.style.cssText = `
    position: fixed;
    display: flex; flex-direction: column;
    background: #fff; border-radius: 10px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
    border: 1px solid rgba(0,0,0,0.08);
    overflow: hidden;
    z-index: ${globalWM.register({} as DraggableWindowInstance)};
  `;
  applyBounds();

  // Title bar
  let titleBar: HTMLElement | null = null;
  if (config.showTitleBar) {
    titleBar = document.createElement("div");
    titleBar.className = "dw-titlebar";
    titleBar.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; background: #f8f9fa;
      border-bottom: 1px solid #eee; cursor: default;
      user-select: none; flex-shrink: 0;
    `;

    // Title text
    const titleText = document.createElement("span");
    titleText.className = "dw-title";
    titleText.style.cssText = "font-size: 13px; font-weight: 600; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
    titleText.textContent = config.title ?? "";
    titleBar.appendChild(titleText);

    // Controls
    const controlsArea = document.createElement("div");
    controlsArea.className = "dw-controls";
    controlsArea.style.cssText = "display: flex; gap: 4px;";

    for (const ctrl of config.controls) {
      const btn = document.createElement("button");
      btn.className = `dw-control dw-control-${ctrl}`;
      btn.setAttribute("aria-label", ctrl);
      btn.style.cssText = `
        width: 26px; height: 26px; border: none; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer; color: #666;
        transition: background 0.12s;
      `;

      switch (ctrl) {
        case "minimize": btn.textContent = "—"; break;
        case "maximize": btn.textContent = "□"; break;
        case "close": btn.textContent = "×"; break;
      }

      if (ctrl === "close") {
        btn.addEventListener("mouseenter", () => { btn.style.background = "#e81123"; btn.style.color = "#fff"; });
        btn.addEventListener("mouseleave", () => { btn.style.background = ""; btn.style.color = "#666"; });
      } else {
        btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(0,0,0,0.06)"; });
        btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
      }

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        switch (ctrl) {
          case "minimize": instance.minimize(); break;
          case "maximize":
            currentState === "maximized" ? instance.restore() : instance.maximize();
            break;
          case "close": instance.close(); break;
        }
      });

      controlsArea.appendChild(btn);
    }

    titleBar.appendChild(controlsArea);
    winEl.appendChild(titleBar);
  }

  // Content area
  const contentEl = document.createElement("div");
  contentEl.className = "dw-content";
  contentEl.style.cssText = "flex: 1; overflow: auto; padding: 0;";
  if (typeof config.content === "string") contentEl.innerHTML = config.content;
  else contentEl.appendChild(config.content);
  winEl.appendChild(contentEl);

  // Resize handles
  const resizeHandles = new Map<string, HTMLElement>();
  if (config.resizable && config.resizeEdges !== false) {
    const edges = config.resizeEdges ?? ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    const positions: Record<string, string> = {
      n: "top:-3px;left:50%;transform:translateX(-50%);cursor:ns-resize;width:100%;height:6px;",
      s: "bottom:-3px;left:50%;transform:translateX(-50%);cursor:ns-resize;width:100%;height:6px;",
      e: "right:-3px;top:50%;transform:translateY(-50%);cursor:ew-resize;height:100%;width:6px;",
      w: "left:-3px;top:50%;transform:translateY(-50%);cursor:ew-resize;height:100%;width:6px;",
      ne: "top:-3px;right:-3px;cursor:nesw-resize;width:12px;height:12px;",
      nw: "top:-3px;left:-3px;cursor:nwse-resize;width:12px;height:12px;",
      se: "bottom:-3px;right:-3px;cursor:nwse-resize;width:12px;height:12px;",
      sw: "bottom:-3px;left:-3px;cursor:nesw-resize;width:12px;height:12px;",
    };

    for (const edge of edges) {
      if (!positions[edge]) continue;
      const handle = document.createElement("div");
      handle.dataset.edge = edge;
      handle.style.cssText = `position:absolute;z-index:2;background:transparent;${positions[edge]!}`;
      winEl.appendChild(handle);
      resizeHandles.set(edge, handle);
    }
  }

  portal.appendChild(winEl);

  // --- Drag State ---
  let dragState: { startX: number; startY: number; startWinX: number; startWinY: number } | null = null;
  let resizeState: { startX: number; startY: number; startW: number; startH: number; startL: number; startT: number; edge: string } | null = null;

  // --- Instance ---

  const instance: DraggableWindowInstance = {
    id,
    element: winEl,
    state: currentState,

    getPosition: () => ({ x: config.x, y: config.y }),
    setPosition(nx, ny) {
      config.x = nx; config.y = ny;
      applyBounds();
      persist();
      config.onMove?.(nx, ny);
    },

    getSize: () => ({ width: config.width, height: config.height }),
    setSize(w, h) {
      config.width = Math.max(config.minWidth, Math.min(config.maxWidth, w));
      config.height = Math.max(config.minHeight, Math.min(config.maxHeight, h));
      applyBounds();
      persist();
      config.onResize?.(config.width, config.height);
    },

    minimize() {
      if (currentState === "minimized") return;
      prevBounds = { x: config.x, y: config.y, w: config.width, h: config.height };
      currentState = "minimized";
      winEl.style.transform = "scale(0.95)";
      winEl.style.opacity = "0";
      winEl.style.pointerEvents = "none";
      config.onStateChange?.("minimized");
      persist();
    },

    maximize() {
      if (currentState === "maximized") return;
      prevBounds = { x: config.x, y: config.y, w: config.width, h: config.height };
      currentState = "maximized";

      // Save current bounds before maximizing
      prevBounds = { x: config.x, y: config.y, w: config.width, h: config.height };

      winEl.style.left = "0";
      winEl.style.top = "0";
      winEl.style.width = "100vw";
      winEl.style.height = "100vh";
      winEl.style.borderRadius = "0";
      config.onStateChange?.("maximized");
      persist();
    },

    restore() {
      if (currentState === "normal") return;
      currentState = "normal";
      config.x = prevBounds.x; config.y = prevBounds.y;
      config.width = prevBounds.w; config.height = prevBounds.h;
      winEl.style.borderRadius = "10px";
      applyBounds();
      winEl.style.opacity = "1";
      winEl.style.pointerEvents = "";
      winEl.style.transform = "";
      config.onStateChange?.("normal");
      persist();
    },

    async close() {
      if (config.shouldClose) {
        const canClose = await config.shouldClose();
        if (!canClose) return;
      }
      winEl.style.transition = "opacity 0.15s ease, transform 0.15s ease";
      winEl.style.opacity = "0";
      winEl.style.transform = "scale(0.95)";
      setTimeout(() => instance.destroy(), 150);
    },

    bringToFront() {
      const z = globalWM.bringToFront(id);
      winEl.style.zIndex = String(z);
      config.onFocus?.(instance);
    },

    setTitle(title: string) {
      if (titleBar) {
        const t = titleBar.querySelector(".dw-title");
        if (t) t.textContent = title;
      }
    },

    setContent(content: HTMLElement | string) {
      if (typeof content === "string") contentEl.innerHTML = content;
      else { contentEl.innerHTML = ""; contentEl.appendChild(content); }
    },

    destroy() {
      globalWM.unregister(id);
      winEl.remove();
    },
  };

  // Register with WM after creating instance
  winEl.style.zIndex = String(globalWM.register(instance));

  // --- Event Handlers ---

  // Drag via title bar
  if (titleBar && config.draggable) {
    titleBar.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest(".dw-control")) return;
      if (e.button !== 0) return;
      e.preventDefault();
      instance.bringToFront();

      if (currentState === "minimized") instance.restore();

      dragState = {
        startX: e.clientX, startY: e.clientY,
        startWinX: config.x, startWinY: config.y,
      };

      winEl.setPointerCapture(e.pointerId);
      document.addEventListener("pointermove", onDragMove);
      document.addEventListener("pointerup", onDragUp);
    });
  }

  function onDragMove(e: PointerEvent): void {
    if (!dragState || currentState === "maximized") return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    let nx = dragState.startWinX + dx;
    let ny = dragState.startWinY + dy;

    // Snap detection
    if (config.snapThreshold > 0) {
      const vw = window.innerWidth, vh = window.innerHeight;

      // Left edge snap
      if (Math.abs(nx) < config.snapThreshold) nx = 0;
      // Right edge snap
      if (Math.abs(nx + config.width - vw) < config.snapThreshold) nx = vw - config.width;
      // Top edge snap
      if (Math.abs(ny) < config.snapThreshold) ny = 0;
      // Bottom edge snap
      if (Math.abs(ny + config.height - vh) < config.snapThreshold) ny = vh - config.height;

      // Half-screen snap
      if (config.snapToHalfScreen) {
        if (Math.abs(nx) < config.snapThreshold && config.width > vw * 0.4) { nx = 0; config.width = vw / 2; }
        if (Math.abs(nx + config.width - vw) < config.snapThreshold && config.width > vw * 0.4) { nx = vw / 2; config.width = vw / 2; }
      }
    }

    // Viewport constraint
    if (config.constrainToViewport) {
      nx = Math.max(0, Math.min(nx, window.innerWidth - config.width));
      ny = Math.max(0, Math.min(ny, window.innerHeight - (titleBar?.offsetHeight ?? 30)));
    }

    config.x = nx; config.y = ny;
    applyBounds();
    config.onMove?.(nx, ny);
  }

  function onDragUp(): void {
    dragState = null;
    persist();
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragUp);
  }

  // Resize handles
  for (const [edge, handle] of resizeHandles) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      instance.bringToFront();

      if (currentState === "maximized") {
        // Restore from maximized before resizing
        const ratioX = e.clientX / window.innerWidth;
        const ratioY = e.clientY / window.innerHeight;
        config.width = prevBounds.w;
        config.height = prevBounds.h;
        config.x = Math.round(e.clientX - config.width * ratioX);
        config.y = Math.round(e.clientY - 30); // approximate title bar height
        currentState = "normal";
        winEl.style.borderRadius = "10px";
        applyBounds();
      }

      resizeState = {
        startX: e.clientX, startY: e.clientY,
        startW: config.width, startH: config.height,
        startL: config.x, startT: config.y,
        edge,
      };

      winEl.setPointerCapture(e.pointerId);
      document.addEventListener("pointermove", onResizeMove);
      document.addEventListener("pointerup", onResizeUp);
    });
  }

  function onResizeMove(e: PointerEvent): void {
    if (!resizeState) return;
    const dx = e.clientX - resizeState.startX;
    const dy = e.clientY - resizeState.startY;
    const { edge, startW, startH, startL, startT } = resizeState;

    let newW = startW, newH = startH, newL = startL, newT = startT;

    if (edge.includes("e")) newW = Math.max(config.minWidth, Math.min(config.maxWidth, startW + dx));
    if (edge.includes("w")) {
      const proposedW = Math.max(config.minWidth, Math.min(config.maxWidth, startW - dx));
      newL = startL + (startW - proposedW);
      newW = proposedW;
    }
    if (edge.includes("s")) newH = Math.max(config.minHeight, Math.min(config.maxHeight, startH + dy));
    if (edge.includes("n")) {
      const proposedH = Math.max(config.minHeight, Math.min(config.maxHeight, startH - dy));
      newT = startT + (startH - proposedH);
      newH = proposedH;
    }

    Object.assign(config, { width: newW, height: newH, x: newL, y: newT });
    applyBounds();
    config.onResize?.(newW, newH);
  }

  function onResizeUp(): void {
    resizeState = null;
    persist();
    document.removeEventListener("pointermove", onResizeMove);
    document.removeEventListener("pointerup", onResizeUp);
  }

  // Focus on click
  winEl.addEventListener("mousedown", () => instance.bringToFront());

  // Double-click titlebar to maximize
  if (titleBar) {
    titleBar.addEventListener("dblclick", (e) => {
      if ((e.target as HTMLElement).closest(".dw-control")) return;
      if (currentState === "maximized") instance.restore();
      else instance.maximize();
    });
  }

  // --- Internal ---

  function applyBounds(): void {
    if (currentState === "maximized") {
      winEl.style.left = "0"; winEl.style.top = "0";
      winEl.style.width = "100vw"; winEl.style.height = "100vh";
      return;
    }
    winEl.style.left = `${config.x}px`;
    winEl.style.top = `${config.y}px`;
    winEl.style.width = `${config.width}px`;
    winEl.style.height = `${config.height}px`;
  }

  function persist(): void {
    if (config.persistKey) {
      try {
        localStorage.setItem(`dw:${config.persistKey}`, JSON.stringify({
          x: config.x, y: config.y, width: config.width, height: config.height, state: currentState,
        }));
      } catch {}
    }
  }

  return instance;
}
