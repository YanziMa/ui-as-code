/**
 * Resize Handle: Resizable element handles for all edges and corners.
 * Supports min/max constraints, aspect ratio lock, snap-to-grid,
 * proportional resizing, touch support, and custom cursors.
 */

// --- Types ---

export type HandlePosition = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ResizeHandleOptions {
  /** Target element to make resizable */
  target: HTMLElement;
  /** Which handles to show (default: all 8) */
  handles?: HandlePosition[];
  /** Minimum width in px (default: 20) */
  minWidth?: number;
  /** Minimum height in px (default: 20) */
  minHeight?: number;
  /** Maximum width in px (0 = no limit) */
  maxWidth?: number;
  /** Maximum height in px (0 = no limit) */
  maxHeight?: number;
  /** Lock aspect ratio? */
  lockAspectRatio?: boolean | number; // true = auto-detect, number = explicit ratio
  /** Grid snap size in px (0 = no grid) */
  gridSize?: number;
  /** Constrain within parent/viewport? */
  constrainTo?: "parent" | "viewport" | HTMLElement;
  /** Edge/border size of the handle area in px (default: 6) */
  handleSize?: number;
  /** Custom handle elements (keyed by position) */
  customHandles?: Partial<Record<HandlePosition, HTMLElement>>;
  /** Callback on resize start */
  onResizeStart?: (size: { width: number; height: number }) => void;
  /** Callback during resize */
  onResize?: (size: { width: number; height: number }, delta: { dx: number; dy: number }) => void;
  /** Callback on resize end */
  onResizeEnd?: (size: { width: number; height: number }) => void;
  /** Enable touch support (default: true) */
  touchSupport?: boolean;
  /** Show resize handles visually? (default: true) */
  showHandles?: boolean;
  /** Custom CSS class for handles */
  handleClass?: string;
  /** Custom cursor per position */
  cursors?: Partial<Record<HandlePosition, string>>;
}

export interface ResizeState {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface ResizeInstance {
  /** Current size state */
  getState: () => ResizeState;
  /** Set size programmatically */
  setSize: (width: number, height: number) => void;
  /** Enable/disable a specific handle */
  setHandleEnabled: (position: HandlePosition, enabled: boolean) => void;
  /** Update options dynamically */
  updateOptions: (options: Partial<ResizeHandleOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Constants ---

const DEFAULT_HANDLES: HandlePosition[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const DEFAULT_CURSORS: Record<HandlePosition, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
  sw: "nesw-resize",
};

const HANDLE_STYLES: Record<HandlePosition, string> = {
  n: "top:0;left:50%;transform:translateX(-50%);width:10px;height:6px;cursor:ns-resize;border-radius:3px;",
  s: "bottom:0;left:50%;transform:translateX(-50%);width:10px;height:6px;cursor:ns-resize;border-radius:3px;",
  e: "right:0;top:50%;transform:translateY(-50%);height:10px;width:6px;cursor:ew-resize;border-radius:3px;",
  w: "left:0;top:50%;transform:translateY(-50%);height:10px;width:6px;cursor:ew-resize;border-radius:3px;",
  ne: "top:0;right:0;width:12px;height:12px;cursor:nesw-resize;border-radius:0 8px 0 0;",
  nw: "top:0;left:0;width:12px;height:12px;cursor:nwse-resize;border-radius:8px 0 0 0;",
  se: "bottom:0;right:0;width:12px;height:12px;cursor:nwse-resize;border-radius:0 0 8px 0;",
  sw: "bottom:0;left:0;width:12px;height:12px;cursor:nesw-resize;border-radius:0 0 0 8px;",
};

// --- Main Factory ---

export function createResizeHandle(options: ResizeHandleOptions): ResizeInstance {
  const opts = {
    handles: options.handles ?? DEFAULT_HANDLES,
    minWidth: options.minWidth ?? 20,
    minHeight: options.minHeight ?? 20,
    maxWidth: options.maxWidth ?? 0,
    maxHeight: options.maxHeight ?? 0,
    lockAspectRatio: options.lockAspectRatio ?? false,
    gridSize: options.gridSize ?? 0,
    constrainTo: options.constrainTo,
    handleSize: options.handleSize ?? 6,
    showHandles: options.showHandles ?? true,
    touchSupport: options.touchSupport ?? true,
    handleClass: options.handleClass ?? "resize-handle",
    cursors: options.cursors ?? {},
    ...options,
  };

  let destroyed = false;
  let aspectRatio: number | null = typeof opts.lockAspectRatio === "number"
    ? opts.lockAspectRatio
    : opts.lockAspectRatio
      ? options.target.offsetWidth / options.target.offsetHeight
      : null;

  const handleElements = new Map<HandlePosition, HTMLElement>();
  const enabledHandles = new Set(opts.handles);
  let activeHandle: HandlePosition | null = null;
  let startX = 0, startY = 0;
  let startWidth = 0, startHeight = 0;
  let startLeft = 0, startTop = 0;

  // Make target position-aware
  if (getComputedStyle(options.target).position === "static") {
    options.target.style.position = "relative";
  }

  // Create handle elements
  if (opts.showHandles) {
    createHandles();
  }

  // --- Handle Creation ---

  function createHandles(): void {
    const wrapper = document.createElement("div");
    wrapper.className = "resize-handles-wrapper";
    wrapper.style.cssText = `
      position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:10;
    `;
    options.target.appendChild(wrapper);

    for (const pos of opts.handles!) {
      if (opts.customHandles?.[pos]) {
        handleElements.set(pos, opts.customHandles[pos]!);
        wrapper.appendChild(opts.customHandles[pos]!);
      } else {
        const handle = document.createElement("div");
        handle.dataset.resizeHandle = pos;
        handle.className = `${opts.handleClass} ${opts.handleClass}-${pos}`;
        handle.style.cssText = `
          position:absolute;pointer-events:auto;background:#4338ca;
          opacity:0;transition:opacity 0.15s;${HANDLE_STYLES[pos]}
        `;
        // Show on hover
        wrapper.addEventListener("mouseenter", () => {
          if (!destroyed && enabledHandles.has(pos)) handle.style.opacity = "0.5";
        });
        wrapper.addEventListener("mouseleave", () => {
          handle.style.opacity = "0";
        });
        handle.addEventListener("mouseenter", () => { handle.style.opacity = "0.85"; });
        handle.addEventListener("mouseleave", () => { handle.style.opacity = "0.5"; });

        handleElements.set(pos, handle);
        wrapper.appendChild(handle);
      }
    }
  }

  // --- Interaction ---

  function attachHandleEvents(handleEl: HTMLElement, pos: HandlePosition): void {
    handleEl.addEventListener("pointerdown", (e) => {
      if (destroyed || !enabledHandles.has(pos)) return;
      e.preventDefault();
      e.stopPropagation();

      activeHandle = pos;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = options.target.offsetWidth;
      startHeight = options.target.offsetHeight;
      startLeft = options.target.offsetLeft;
      startTop = options.target.offsetTop;

      // Capture aspect ratio from current size if not locked yet
      if (aspectRatio === null && opts.lockAspectRatio) {
        aspectRatio = startWidth / startHeight;
      }

      handleEl.setPointerCapture(e.pointerId);

      opts.onResizeStart?.({ width: startWidth, height: startHeight });

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId || activeHandle !== pos) return;
        handleResize(ev.clientX, ev.clientY);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        handleEl.releasePointerCapture(ev.pointerId);
        handleEl.removeEventListener("pointermove", onMove);
        handleEl.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        endResize();
      };

      const onCancel = () => {
        handleEl.removeEventListener("pointermove", onMove);
        handleEl.removeEventListener("pointerup", onUp);
        endResize();
      };

      handleEl.addEventListener("pointermove", onMove);
      handleEl.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    });
  }

  function handleResize(clientX: number, clientY: number): void {
    if (!activeHandle) return;

    const dx = clientX - startX;
    const dy = clientY - startY;
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    switch (activeHandle) {
      case "e":
        newWidth = startWidth + dx;
        break;
      case "w":
        newWidth = startWidth - dx;
        newLeft = startLeft + dx;
        break;
      case "s":
        newHeight = startHeight + dy;
        break;
      case "n":
        newHeight = startHeight - dy;
        newTop = startTop + dy;
        break;
      case "se":
        newWidth = startWidth + dx;
        newHeight = startHeight + dy;
        break;
      case "sw":
        newWidth = startWidth - dx;
        newHeight = startHeight + dy;
        newLeft = startLeft + dx;
        break;
      case "ne":
        newWidth = startWidth + dx;
        newHeight = startHeight - dy;
        newTop = startTop + dy;
        break;
      case "nw":
        newWidth = startWidth - dx;
        newHeight = startHeight - dy;
        newLeft = startLeft + dx;
        newTop = startTop + dy;
        break;
    }

    // Apply aspect ratio lock
    if (aspectRatio !== null) {
      const isWest = activeHandle === "w" || activeHandle === "nw" || activeHandle === "sw";
      const isNorth = activeHandle === "n" || activeHandle === "nw" || activeHandle === "ne";

      // Determine which dimension drives the resize based on the larger change
      if (Math.abs(dx) > Math.abs(dy)) {
        // Width-driven
        newHeight = newWidth / aspectRatio;
        if (isNorth) newTop = startTop + startHeight - newHeight;
      } else {
        // Height-driven
        newWidth = newHeight * aspectRatio;
        if (isWest) newLeft = startLeft + startWidth - newWidth;
      }
    }

    // Apply constraints
    newWidth = Math.max(opts.minWidth, newWidth);
    newHeight = Math.max(opts.minHeight, newHeight);

    if (opts.maxWidth > 0) newWidth = Math.min(opts.maxWidth, newWidth);
    if (opts.maxHeight > 0) newHeight = Math.min(opts.maxHeight, newHeight);

    // Snap to grid
    if (opts.gridSize > 0) {
      newWidth = Math.round(newWidth / opts.gridSize) * opts.gridSize;
      newHeight = Math.round(newHeight / opts.gridSize) * opts.gridSize;
    }

    // Constrain to bounds
    if (opts.constrainTo) {
      const result = constrainToBounds(newWidth, newHeight, newLeft, newTop);
      newWidth = result.width;
      newHeight = result.height;
      newLeft = result.left;
      newTop = result.top;
    }

    // Apply
    options.target.style.width = `${newWidth}px`;
    options.target.style.height = `${newHeight}px`;
    if (newLeft !== startLeft || newTop !== startTop) {
      options.target.style.left = `${newLeft}px`;
      options.target.style.top = `${newTop}px`;
    }

    opts.onResize?.(
      { width: newWidth, height: newHeight },
      { dx: newWidth - startWidth, dy: newHeight - startHeight }
    );
  }

  function constrainToBounds(
    width: number,
    height: number,
    left: number,
    top: number
  ): { width: number; height: number; left: number; top: number } {
    let constraintRect: DOMRect;

    if (opts.constrainTo === "parent") {
      constraintRect = options.target.parentElement?.getBoundingClientRect() ??
        new DOMRect(0, 0, Infinity, Infinity);
    } else if (opts.constrainTo === "viewport") {
      constraintRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    } else if (opts.constrainTo instanceof HTMLElement) {
      constraintRect = opts.constrainTo.getBoundingClientRect();
    } else {
      return { width, height, left, top };
    }

    const targetRect = options.target.getBoundingClientRect();
    const parentRect = options.target.parentElement?.getBoundingClientRect();

    // Convert to parent-relative coordinates
    const parentOffsetX = parentRect ? targetRect.left - parentRect.left : left;
    const parentOffsetY = parentRect ? targetRect.top - parentRect.top : top;

    // Clamp
    let clampedW = width;
    let clampedH = height;
    let clampedL = left;
    let clampedT = top;

    if (clampedL < 0) { clampedW += clampedL; clampedL = 0; }
    if (clampedT < 0) { clampedH += clampedT; clampedT = 0; }
    if (clampedL + clampedW > constraintRect.width) {
      clampedW = constraintRect.width - clampedL;
    }
    if (clampedT + clampedH > constraintRect.height) {
      clampedH = constraintRect.height - clampedT;
    }

    return { width: clampedW, height: clampedH, left: clampedL, top: clampedT };
  }

  function endResize(): void {
    if (!activeHandle) return;

    const finalWidth = options.target.offsetWidth;
    const finalHeight = options.target.offsetHeight;

    opts.onResizeEnd?.({ width: finalWidth, height: finalHeight });
    activeHandle = null;
  }

  // Attach events to all handles
  for (const [pos, el] of handleElements) {
    attachHandleEvents(el, pos);
  }

  // --- Instance ---

  const instance: ResizeInstance = {
    getState() {
      return {
        width: options.target.offsetWidth,
        height: options.target.offsetHeight,
        left: options.target.offsetLeft,
        top: options.target.offsetTop,
      };
    },

    setSize(width, height) {
      options.target.style.width = `${Math.max(opts.minWidth, width)}px`;
      options.target.style.height = `${Math.max(opts.minHeight, height)}px`;

      if (opts.lockAspectRatio) {
        aspectRatio = width / height;
      }
    },

    setHandleEnabled(position, enabled) {
      if (enabled) {
        enabledHandles.add(position);
      } else {
        enabledHandles.delete(position);
      }
      const el = handleElements.get(position);
      if (el) el.style.display = enabled ? "" : "none";
    },

    updateOptions(newOpts) {
      Object.assign(opts, newOpts);
      if (typeof newOpts.lockAspectRatio === "number") {
        aspectRatio = newOpts.lockAspectRatio;
      } else if (newOpts.lockAspectRatio === false) {
        aspectRatio = null;
      }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;

      // Remove handle wrapper
      const wrapper = options.target.querySelector(".resize-handles-wrapper");
      if (wrapper) wrapper.remove();

      handleElements.clear();
      enabledHandles.clear();
    },
  };

  return instance;
}

// --- Convenience: Make Element Resizable ---

/**
 * Quick API: make any element resizable with sensible defaults.
 */
export function makeResizable(
  element: HTMLElement,
  options?: Partial<Omit<ResizeHandleOptions, "target">>
): ResizeInstance {
  return createResizeHandle({ target: element, ...options });
}
