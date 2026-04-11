/**
 * Panel Utilities: Collapsible, dockable panel system with drag-to-dock,
 * tab/accordion grouping, header toolbar, persistence, and layout management.
 */

// --- Types ---

export type PanelState = "normal" | "collapsed" | "minimized" | "maximized" | "docked";
export type PanelDockPosition = "left" | "right" | "top" | "bottom" | "float";

export interface PanelOptions {
  /** Unique ID */
  id: string;
  /** Panel title */
  title?: string;
  /** Content element or HTML */
  content: HTMLElement | string;
  /** Initial state */
  initialState?: PanelState;
  /** Dock position (if docked) */
  dockPosition?: PanelDockPosition;
  /** Width when floating/docked horizontally (px) */
  width?: number;
  /** Height when floating/docked vertically (px) */
  height?: number;
  /** Min width */
  minWidth?: number;
  /** Min height */
  minHeight?: number;
  /** Whether panel is collapsible */
  collapsible?: boolean;
  /** Whether panel can be minimized to a title bar */
  minimizable?: boolean;
  /** Whether panel can be maximized */
  maximizable?: boolean;
  /** Whether panel is closable */
  closable?: boolean;
  /** Whether panel is draggable (when floating) */
  draggable?: boolean;
  /** Show header bar */
  showHeader?: boolean;
  /** Custom class name */
  className?: string;
  /** Z-index when floating */
  zIndex?: number;
  /** Container element */
  container?: HTMLElement;
  /** Persist state in localStorage */
  persist?: boolean;
  /** Called on state change */
  onStateChange?: (state: PanelState) => void;
  /** Called on resize */
  onResize?: (width: number, height: number) => void;
}

export interface PanelInstance {
  /** The root panel element */
  el: HTMLElement;
  /** Current state */
  getState: () => PanelState;
  /** Collapse the panel */
  collapse: () => void;
  /** Expand from collapsed */
  expand: () => void;
  /** Minimize to title bar */
  minimize: () => void;
  /** Restore from minimized */
  restore: () => void;
  /** Maximize to fill container */
  maximize: () => void;
  /** Dock to a specific position */
  dock: (position: PanelDockPosition) => void;
  /** Undock (make floating) */
  undock: () => void;
  /** Set size */
  setSize: (width: number, height: number) => void;
  /** Get current size */
  getSize: () => { width: number; height: number };
  /** Set title */
  setTitle: (title: string) => void;
  /** Close and destroy */
  close: () => void;
  /** Destroy completely */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a collapsible, dockable panel.
 *
 * @example
 * ```ts
 * const panel = createPanel({
 *   id: "properties-panel",
 *   title: "Properties",
 *   content: propertiesContent,
 *   width: 300,
 *   collapsible: true,
 *   minimizable: true,
 * });
 * ```
 */
export function createPanel(options: PanelOptions): PanelInstance {
  const {
    id,
    title = "",
    content,
    initialState = "normal",
    dockPosition = "right",
    width = 320,
    height = 400,
    minWidth = 200,
    minHeight = 150,
    collapsible = true,
    minimizable = false,
    maximizable = false,
    closable = false,
    draggable = true,
    showHeader = !!title || collapsible || minimizable || maximizable || closable,
    className,
    zIndex = 1000,
    container,
    persist = false,
    onStateChange,
    onResize,
  } = options;

  let _state = initialState;
  let _dockPos = dockPosition;
  let cleanupFns: Array<() => void> = [];

  // Load persisted state
  if (persist) {
    try {
      const saved = localStorage.getItem(`panel-${id}`);
      if (saved) _state = saved as PanelState;
    } catch {}
  }

  // Root
  const root = document.createElement("div");
  root.className = `panel ${className ?? ""}`.trim();
  root.dataset.panelId = id;
  root.style.cssText =
    `position:${_state === "docked" ? "relative" : "absolute"};` +
    `width:${_state === "collapsed" ? "auto" : `${width}px`};` +
    `height:${_state === "collapsed" || _state === "minimized" ? "auto" : `${height}px`};` +
    `min-width:${minWidth}px;min-height:${minHeight}px;` +
    `z-index:${zIndex};background:#fff;border:1px solid #e5e7eb;border-radius:8px;` +
    "display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);";

  // Header
  let headerEl: HTMLElement | null = null;
  if (showHeader) {
    headerEl = document.createElement("div");
    headerEl.className = "panel-header";
    headerEl.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;" +
      "padding:8px 12px;border-bottom:1px solid #f3f4f6;" +
      "flex-shrink:0;cursor:default;user-select:none;font-size:13px;font-weight:500;color:#374151;";

    // Title area
    const titleArea = document.createElement("span");
    titleArea.className = "panel-title";
    titleArea.textContent = title;
    headerEl.appendChild(titleArea);

    // Toolbar buttons
    const toolbar = document.createElement("div");
    toolbar.className = "panel-toolbar";
    toolbar.style.cssText = "display:flex;gap:2px;align-items:center;";

    const btnStyle = "border:none;background:none;cursor:pointer;padding:2px 6px;" +
      "border-radius:4px;font-size:14px;color:#6b7280;display:flex;align-items:center;" +
      "justify-content:center;width:24px;height:24px;";
    const hoverStyle = "background:#f3f4f6;color:#111827;";

    if (collapsible) {
      const collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.innerHTML = "&#9660;"; // down arrow
      collapseBtn.title = "Collapse";
      collapseBtn.style.cssText = btnStyle;
      collapseBtn.addEventListener("click", () => {
        if (_state === "collapsed") expand(); else collapse();
      });
      collapseBtn.addEventListener("mouseenter", () => { collapseBtn.style.cssText = btnStyle + hoverStyle; });
      collapseBtn.addEventListener("mouseleave", () => { collapseBtn.style.cssText = btnStyle; });
      toolbar.appendChild(collapseBtn);
    }

    if (minimizable) {
      const minBtn = document.createElement("button");
      minBtn.type = "button";
      minBtn.innerHTML = "&#9724;"; // square (minimize)
      minBtn.title = "Minimize";
      minBtn.style.cssText = btnStyle;
      minBtn.addEventListener("click", () => {
        if (_state === "minimized") restore(); else minimize();
      });
      minBtn.addEventListener("mouseenter", () => { minBtn.style.cssText = btnStyle + hoverStyle; });
      minBtn.addEventListener("mouseleave", () => { minBtn.style.cssText = btnStyle; });
      toolbar.appendChild(minBtn);
    }

    if (maximizable) {
      const maxBtn = document.createElement("button");
      maxBtn.type = "button";
      maxBtn.innerHTML = "&#9635;"; // maximize icon
      maxBtn.title = "Maximize / Restore";
      maxBtn.style.cssText = btnStyle;
      maxBtn.addEventListener("click", () => {
        if (_state === "maximized") restore(); else maximize();
      });
      maxBtn.addEventListener("mouseenter", () => { maxBtn.style.cssText = btnStyle + hoverStyle; });
      maxBtn.addEventListener("mouseleave", () => { maxBtn.style.cssText = btnStyle; });
      toolbar.appendChild(maxBtn);
    }

    if (closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.title = "Close";
      closeBtn.style.cssText = btnStyle + "color:#dc2626;";
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.cssText = btnStyle + "background:#fef2f2;color:#b91c1c;"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.cssText = btnStyle + "color:#dc2626;"; });
      closeBtn.addEventListener("click", close);
      toolbar.appendChild(closeBtn);
    }

    headerEl.appendChild(toolbar);
    root.appendChild(headerEl);

    // Drag support for header
    if (draggable && _state !== "docked") {
      _setupDrag(headerEl);
    }
  }

  // Body
  const body = document.createElement("div");
  body.className = "panel-body";
  body.style.cssText =
    "flex:1;overflow:auto;padding:12px;display:" +
    (_state === "collapsed" || _state === "minimized" ? "none" : "block") + ";";
  if (typeof content === "string") {
    body.innerHTML = content;
  } else {
    body.appendChild(content);
  }
  root.appendChild(body);

  // Mount
  (container ?? document.body).appendChild(root);

  // Apply initial state
  _applyState();

  // --- Methods ---

  function getState(): PanelState { return _state; }

  function collapse(): void {
    _setState("collapsed");
  }

  function expand(): void {
    _setState(_state === "minimized" ? "normal" : "normal");
  }

  function minimize(): void {
    _setState("minimized");
  }

  function restore(): void {
    _setState("normal");
  }

  function maximize(): void {
    _setState("maximized");

    if (!container) return;
    const contRect = container.getBoundingClientRect();
    root.style.width = `${contRect.width}px`;
    root.style.height = `${contRect.height - (headerEl?.offsetHeight ?? 0)}px`;
    root.style.left = "0";
    root.style.top = "0";
  }

  function dock(position: PanelDockPosition): void {
    _dockPos = position;
    _setState("docked");
  }

  function undock(): void {
    _setState("normal");
  }

  function setSize(w: number, h: number): void {
    root.style.width = `${Math.max(minWidth, w)}px`;
    root.style.height = `${Math.max(minHeight, h)}px`;
    onResize?.(root.offsetWidth, root.offsetHeight);
  }

  function getSize(): { width: number; height: number } {
    return { width: root.offsetWidth, height: root.offsetHeight };
  }

  function setTitle(newTitle: string): void {
    if (titleArea) titleArea.textContent = newTitle;
  }

  function close(): void {
    root.style.display = "none";
    _setState("normal"); // Reset but hidden
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Internal ---

  let titleArea: HTMLElement | null = null;

  function _setState(newState: PanelState): void {
    const oldState = _state;
    _state = newState;

    // Persist
    if (persist) {
      try { localStorage.setItem(`panel-${id`, newState); } catch {}
    }

    _applyState();
    if (oldState !== newState) onStateChange?.(newState);
  }

  function _applyState(): void {
    // Update body visibility
    if (_state === "collapsed" || _state === "minimized") {
      body.style.display = "none";
      root.style.height = "auto";
    } else {
      body.style.display = "block";
      if (_state !== "maximized") {
        root.style.height = `${height}px`;
      }
    }

    // Update collapse button icon
    if (headerEl) {
      const collapseBtn = headerEl.querySelector(".panel-toolbar button:first-child");
      if (collapseBtn && collapsible) {
        collapseBtn.innerHTML = _state === "collapsed" &#9654; : "&#9660;";
      }
    }

    // Docked styling
    if (_state === "docked") {
      root.style.position = "relative";
      root.style.boxShadow = "none";
      switch (_dockPos) {
        case "left": root.style.borderRight = "1px solid #e5e7eb"; break;
        case "right": root.style.borderLeft = "1px solid #e5e7eb"; break;
        case "top": root.style.borderBottom = "1px solid #e5e7eb"; break;
        case "bottom": root.style.borderTop = "1px solid #e5e7eb"; break;
      }
    } else {
      root.style.position = "absolute";
      root.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      root.style.borderLeft = "";
      root.style.borderRight = "";
      root.style.borderTop = "";
      root.style.borderBottom = "";
    }
  }

  function _setupDrag(dragHandle: HTMLElement): void {
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const onMouseDown = (e: MouseEvent): void => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = root.offsetLeft;
      startTop = root.offsetTop;

      const onMouseMove = (ev: MouseEvent): void => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        root.style.left = `${startLeft + dx}px`;
        root.style.top = `${startTop + dy}px`;
      };

      const onMouseUp = (): void => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    dragHandle.addEventListener("mousedown", onMouseDown);
    cleanupFns.push(() => dragHandle.removeEventListener("mousedown", onMouseDown));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: root, getState, collapse, expand, minimize, restore, maximize, dock, undock, setSize, getSize, setTitle, close, destroy };
}
