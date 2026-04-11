/**
 * Drag & Resize: Element dragging, resizing with handles, snap-to-grid,
 * constraints (bounds/containment), transform tracking, and multi-select support.
 */

// --- Types ---

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragResizeOptions {
  /** Element or selector to make draggable/resizable */
  element: HTMLElement | string;
  /** Enable dragging */
  draggable?: boolean;
  /** Enable resize handles */
  resizable?: boolean;
  /** Resize handle size (px) */
  handleSize?: number;
  /** Which edges/corners to show handles on */
  handles?: ("n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw")[];
  /** Minimum dimensions */
  minSize?: { width: number; height: number };
  /** Maximum dimensions */
  maxSize?: { width: number; height: number };
  /** Constrain within parent or a specific element */
  constrainTo?: HTMLElement | "parent" | "window";
  /** Snap to grid */
  gridSnap?: number;
  /** Aspect ratio lock (width/height ratio, e.g. 1 for square) */
  aspectRatio?: number;
  /** Called when position changes */
  onDrag?: (position: Point, delta: Point) => void;
  /** Called when drag starts */
  onDragStart?: (position: Point) => void;
  /** Called when drag ends */
  onDragEnd?: (position: Point) => void;
  /** Called when size changes */
  onResize?: (bounds: Bounds, handle: string) => void;
  /** Called when resize starts */
  onResizeStart?: (bounds: Bounds) => void;
  /** Called when resize ends */
  onResizeEnd?: (bounds: Bounds) => void;
  /** Cursor style for each handle */
  cursors?: Record<string, string>;
  /** Handle class name prefix */
  handleClassPrefix?: string;
  /** Z-index while active */
  activeZIndex?: number;
  /** Disable text selection while dragging */
  disableSelection?: boolean;
}

export interface DragResizeInstance {
  element: HTMLElement;
  /** Current bounds */
  getBounds(): Bounds;
  /** Set bounds programmatically */
  setBounds(bounds: Partial<Bounds>): void;
  /** Enable/disable dragging */
  setDraggable(enabled: boolean): void;
  /** Enable/disable resizing */
  setResizable(enabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Internal State ---

interface PointerState {
  startX: number;
  startY: number;
  startBounds: Bounds;
  activeHandle: string | null; // null = drag, otherwise = handle name
}

// --- Default Cursors ---

const DEFAULT_CURSORS: Record<string, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
  sw: "nesw-resize",
  drag: "move",
};

// --- Main Class ---

export class DragResizeManager {
  create(options: DragResizeOptions): DragResizeInstance {
    const el = typeof options.element === "string"
      ? document.querySelector<HTMLElement>(options.element)!
      : options.element;

    if (!el) throw new Error("DragResize: element not found");

    const opts = {
      draggable: options.draggable ?? true,
      resizable: options.resizable ?? true,
      handleSize: options.handleSize ?? 8,
      handles: options.handles ?? ["n", "s", "e", "w", "ne", "nw", "se", "sw"],
      minSize: options.minSize ?? { width: 20, height: 20 },
      maxSize: options.maxSize,
      gridSnap: options.gridSnap ?? 0,
      aspectRatio: options.aspectRatio ?? 0,
      cursors: { ...DEFAULT_CURSORS, ...options.cursors },
      handleClassPrefix: options.handleClassPrefix ?? "dr-handle",
      activeZIndex: options.activeZIndex ?? 1000,
      disableSelection: options.disableSelection ?? true,
    };

    let destroyed = false;
    let state: PointerState | null = null;
    const handles = new Map<string, HTMLElement>();

    // Get initial computed bounds
    function getComputedBounds(): Bounds {
      const rect = el.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }

    // Apply bounds to element
    function applyBounds(bounds: Bounds): void {
      el.style.left = `${bounds.x}px`;
      el.style.top = `${bounds.y}px`;
      el.style.width = `${bounds.width}px`;
      el.style.height = `${bounds.height}px`;
    }

    // Snap value to grid
    function snap(value: number): number {
      return opts.gridSnap > 0 ? Math.round(value / opts.gridSnap) * opts.gridSnap : value;
    }

    // Constrain bounds
    function constrain(bounds: Bounds): Bounds {
      let { x, y, width, height } = bounds;

      // Min/max size
      width = Math.max(width, opts.minSize.width);
      height = Math.max(height, opts.minSize.height);
      if (opts.maxSize) {
        width = Math.min(width, opts.maxSize.width);
        height = Math.min(height, opts.maxSize.height);
      }

      // Containment
      if (opts.constrainTo) {
        let container: DOMRect;
        if (opts.constrainTo === "parent") {
          container = el.parentElement!.getBoundingClientRect();
        } else if (opts.constrainTo === "window") {
          container = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, right: window.innerWidth, bottom: window.innerHeight } as DOMRect;
        } else {
          container = opts.constrainTo.getBoundingClientRect();
        }

        x = Math.max(container.left, Math.min(x, container.right - width));
        y = Math.max(container.top, Math.min(y, container.bottom - height));
      }

      return { x: snap(x), y: snap(y), width: snap(width), height: snap(height) };
    }

    // Create resize handles
    function createHandles(): void {
      if (!opts.resizable) return;

      for (const handleName of opts.handles) {
        const handle = document.createElement("div");
        handle.className = `${opts.handleClassPrefix} ${opts.handleClassPrefix}-${handleName}`;
        handle.dataset.handle = handleName;

        // Position the handle
        const pos = getHandlePosition(handleName);
        Object.assign(handle.style, {
          position: "absolute",
          ...pos,
          width: `${opts.handleSize}px`,
          height: `${opts.handleSize}px`,
          zIndex: "10",
          cursor: opts.cursors[handleName] ?? "default",
        });

        el.appendChild(handle);
        handles.set(handleName, handle);
      }
    }

    function getHandlePosition(name: string): Partial<CSSStyleDeclaration> {
      const s = opts.handleSize / 2;
      switch (name) {
        case "n":  return { left: `calc(50% - ${s}px)`, top: `-${s}px`, cursor: "ns-resize" };
        case "s":  return { left: `calc(50% - ${s}px)`, bottom: `-${s}px`, cursor: "ns-resize" };
        case "e":  return { right: `-${s}px`, top: `calc(50% - ${s}px)`, cursor: "ew-resize" };
        case "w":  return { left: `-${s}px`, top: `calc(50% - ${s}px)`, cursor: "ew-resize" };
        case "ne": return { right: `-${s}px}`, top: `-${s}px`, cursor: "nesw-resize" };
        case "nw": return { left: `-${s}px`, top: `-${s}px`, cursor: "nwse-resize" };
        case "se": return { right: `-${s}px`, bottom: `-${s}px`, cursor: "nwse-resize" };
        case "sw": return { left: `-${s}px`, bottom: `-${s}px`, cursor: "nesw-resize" };
        default:   return {};
      }
    }

    // Remove handles
    function removeHandles(): void {
      for (const [, handle] of handles) handle.remove();
      handles.clear();
    }

    // Pointer event handlers
    function onPointerDown(e: PointerEvent): void {
      if (destroyed) return;

      const handle = (e.target as HTMLElement).dataset.handle ?? null;
      const isDrag = handle === null && opts.draggable;
      const isResize = handle !== null && opts.resizable;

      if (!isDrag && !isResize) return;

      e.preventDefault();
      e.stopPropagation();

      el.setPointerCapture(e.pointerId);
      el.style.zIndex = String(opts.activeZIndex);

      state = {
        startX: e.clientX,
        startY: e.clientY,
        startBounds: getComputedBounds(),
        activeHandle: handle,
      };

      if (opts.disableSelection) document.body.style.userSelect = "none";

      if (isDrag) opts.onDragStart?.({ x: state.startBounds.x, y: state.startBounds.y });
      if (isResize) opts.onResizeStart?.(state.startBounds);
    }

    function onPointerMove(e: PointerEvent): void {
      if (!state || destroyed) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const sb = state.startBounds;

      if (state.activeHandle === null) {
        // Dragging
        const newX = sb.x + dx;
        const newY = sb.y + dy;
        const newBounds = constrain({ x: newX, y: newY, width: sb.width, height: sb.height });
        applyBounds(newBounds);
        opts.onDrag?.({ x: newBounds.x, y: newBounds.y }, { x: dx, y: dy });
      } else {
        // Resizing
        let { x, y, width, height } = sb;
        const h = state.activeHandle;

        if (h.includes("e")) width += dx;
        if (h.includes("w")) { x += dx; width -= dx; }
        if (h.includes("s")) height += dy;
        if (h.includes("n")) { y += dy; height -= dy; }

        // Aspect ratio lock
        if (opts.aspectRatio > 0) {
          if (h === "e" || h === "w") {
            height = width / opts.aspectRatio;
          } else if (h === "n" || h === "s") {
            width = height * opts.aspectRatio;
          } else if (h.includes("e") || h.includes("w")) {
            width = (sb.width + (h.includes("e") ? dx : -dx));
            height = width / opts.aspectRatio;
            if (h.includes("n")) { y = sb.y + sb.height - height; }
            if (h.includes("s")) height = sb.height + dy;
          }
        }

        const newBounds = constrain({ x, y, width, height });
        applyBounds(newBounds);
        opts.onResize?.(newBounds, h);
      }
    }

    function onPointerUp(_e: PointerEvent): void {
      if (!state || destroyed) return;

      el.releasePointerCapture(_e.pointerId);

      if (state.activeHandle === null) {
        opts.onDragEnd?.({ x: getComputedBounds().x, y: getComputedBounds().y });
      } else {
        opts.onResizeEnd?.(getComputedBounds());
      }

      state = null;
      document.body.style.userSelect = "";
    }

    // Initialize
    el.style.position = "absolute";
    createHandles();

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return {
      element: el,

      getBounds() { return getComputedBounds(); },

      setBounds(partial) {
        const current = getComputedBounds();
        const merged = { ...current, ...partial };
        applyBounds(constrain(merged));
      },

      setDraggable(enabled: boolean) {
        opts.draggable = enabled;
        if (!enabled) removeHandles();
        else createHandles();
      },

      setResizable(enabled: boolean) {
        opts.resizable = enabled;
        if (enabled) createHandles();
        else removeHandles();
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        el.removeEventListener("pointerdown", onPointerDown);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", onPointerUp);
        el.removeEventListener("pointercancel", onPointerUp);
        removeHandles();
        el.style.zIndex = "";
      },
    };
  }
}

/** Convenience: make an element draggable and/or resizable */
export function makeDragResizable(options: DragResizeOptions): DragResizeInstance {
  return new DragResizeManager().create(options);
}
