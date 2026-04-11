/**
 * Resizable Utilities: Make any element resizable from edges/corners with
 * constraints, aspect ratio lock, grid snapping, min/max sizes, and
 * callback events.
 */

// --- Types ---

export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ResizableOptions {
  /** The element to make resizable */
  target: HTMLElement;
  /** Which edges are resizable (default: all) */
  edges?: ResizeEdge[];
  /** Minimum width (px) */
  minWidth?: number;
  /** Minimum height (px) */
  minHeight?: number;
  /** Maximum width (px) */
  maxWidth?: number;
  /** Maximum height (px) */
  maxHeight?: number;
  /** Lock aspect ratio (width/height) */
  aspectRatio?: number;
  /** Snap to grid (px) */
  gridSnap?: number;
  /** Handle size (px) */
  handleSize?: number;
  /** Handle style class prefix */
  handleClassPrefix?: string;
  /** Called during resize */
  onResize?: (size: { width: number; height: number }) => void;
  /** Called when resize starts */
  onResizeStart?: (size: { width: number; height: number }) => void;
  /** Called when resize ends */
  onResizeEnd?: (size: { width: number; height: number }) => void;
}

export interface ResizableInstance {
  /** The target element */
  target: HTMLElement;
  /** Current size */
  getSize: () => { width: number; height: number };
  /** Set size programmatically */
  setSize: (width: number, height: number) => void;
  /** Enable resizing */
  enable: () => void;
  /** Disable resizing */
  disable: () => void;
  /** Check if currently enabled */
  isEnabled: () => boolean;
  /** Destroy and cleanup handles */
  destroy: () => void;
}

// --- Edge Definitions ---

const EDGE_POSITIONS: Record<ResizeEdge, { cursor: string; position: () => string }> = {
  "n": { cursor: "ns-resize", position: () => "top:0;left:50%;transform:translateX(-50%);" },
  "s": { cursor: "ns-resize", position: () => "bottom:0;left:50%;transform:translateX(-50%);" },
  "e": { cursor: "ew-resize", position: () => "right:0;top:50%;transform:translateY(-50%);" },
  "w": { cursor: "ew-resize", position: () => "left:0;top:50%;transform:translateY(-50%);" },
  "ne": { cursor: "nesw-resize", position: () => "top:0;right:0;" },
  "nw": { cursor: "nwse-resize", position: () => "top:0;left:0;" },
  "se": { cursor: "nwse-resize", position: () => "bottom:0;right:0;" },
  "sw": { cursor: "nesw-resize", position: () => "bottom:0;left:0;" },
};

// --- Core Factory ---

/**
 * Make an element resizable from specified edges.
 *
 * @example
 * ```ts
 * const resizable = createResizable({
 *   target: panelEl,
 *   edges: ["e", "se"],
 *   minWidth: 200,
 *   minHeight: 150,
 * });
 * ```
 */
export function createResizable(options: ResizableOptions): ResizableInstance {
  const {
    target,
    edges = ["n", "s", "e", "w", "ne", "nw", "se", "sw"],
    minWidth = 40,
    minHeight = 40,
    maxWidth = Infinity,
    maxHeight = Infinity,
    aspectRatio,
    gridSnap,
    handleSize = 8,
    handleClassPrefix = "resize-handle",
    onResize,
    onResizeStart,
    onResizeEnd,
  } = options;

  let _enabled = true;
  let isResizing = false;
  const handles: Map<ResizeEdge, HTMLElement> = new Map();
  const cleanupFns: Array<() => void> = [];

  // Ensure target is positioned
  const originalPosition = getComputedStyle(target).position;
  if (originalPosition === "static") {
    target.style.position = "relative";
  }

  // Create handles
  for (const edge of edges) {
    const handle = document.createElement("div");
    handle.className = `${handleClassPrefix} ${handleClassPrefix}-${edge}`;
    handle.style.cssText =
      `position:absolute;width:${handleSize}px;height:${handleSize}px;` +
      `z-index:10;${EDGE_POSITIONS[edge].cursor ? `cursor:${EDGE_POSITIONS[edge].cursor};` : ""}` +
      `${EDGE_POSITIONS[edge].position()}` +
      "background:transparent;display:flex;align-items:center;justify-content:center;" +
      "user-select:none;touch-action:none;";

    // Visual indicator
    if (edge.length === 2) {
      // Corner — show corner grip
      const inner = document.createElement("span");
      inner.style.cssText =
        `width:${Math.max(handleSize - 4, 4)}px;height:${Math.max(handleSize - 4, 4)}px;` +
        "border-radius:1px;background:#d1d5db;opacity:0;transition:opacity 0.15s;";
      handle.appendChild(inner);
      handle.addEventListener("mouseenter", () => { (inner as HTMLElement).style.opacity = "1"; });
      handle.addEventListener("mouseleave", () => { (inner as HTMLElement).style.opacity = "0"; });
    }

    target.appendChild(handle);
    handles.set(edge, handle);

    // Attach drag behavior
    _attachHandleDrag(handle, edge);
  }

  // --- Methods ---

  function getSize(): { width: number; height: number } {
    return { width: target.offsetWidth, height: target.offsetHeight };
  }

  function setSize(width: number, height: number): void {
    const w = _snap(Math.max(minWidth, Math.min(maxWidth, width)));
    const h = _snap(Math.max(minHeight, Math.min(maxHeight, height)));
    target.style.width = `${w}px`;
    target.style.height = `${h}px`;
  }

  function enable(): void { _enabled = true; }
  function disable(): void { _enabled = false; }
  function isEnabled(): boolean { return _enabled; }

  function destroy(): void {
    for (const [, handle] of handles) handle.remove();
    handles.clear();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    if (originalPosition === "static") {
      target.style.removeProperty("position");
    }
  }

  // --- Internal ---

  function _attachHandleDrag(handle: HTMLElement, edge: ResizeEdge): void {
    const startDrag = (startX: number, startY: number): void => {
      if (!_enabled || isResizing) return;
      isResizing = true;

      const startRect = target.getBoundingClientRect();
      const startW = target.offsetWidth;
      const startH = target.offsetHeight;
      const startX_rel = startX - startRect.left;
      const startY_rel = startY - startRect.top;

      onResizeStart?.({ width: startW, height: startH });

      const onMove = (moveX: number, moveY: number): void => {
        if (!isResizing) return;

        const dx = moveX - startX;
        const dy = moveY - startY;

        let newW = startW;
        let newH = startH;
        let newLeft = 0;
        let newTop = 0;

        // Calculate new dimensions based on edge
        if (edge.includes("e")) {
          newW = startW + dx;
        }
        if (edge.includes("w")) {
          newW = startW - dx;
          newLeft = dx;
        }
        if (edge.includes("s")) {
          newH = startH + dy;
        }
        if (edge.includes("n")) {
          newH = startH - dy;
          newTop = dy;
        }

        // Apply aspect ratio
        if (aspectRatio && (edge.includes("e") || edge.includes("w") || edge.includes("n") || edge.includes("s"))) {
          if (edge === "n" || edge === "s") {
            newW = newH * aspectRatio;
          } else if (edge === "e" || edge === "w") {
            newH = newW / aspectRatio;
          } else {
            // Corner — use the larger delta
            if (Math.abs(dx) > Math.abs(dy)) {
              newH = newW / aspectRatio;
            } else {
              newW = newH * aspectRatio;
            }
          }

          // Adjust position for west/north edges
          if (edge.includes("w")) {
            newLeft = startW - newW;
          }
          if (edge.includes("n")) {
            newTop = startH - newH;
          }
        }

        // Clamp to bounds
        newW = Math.max(minWidth, Math.min(maxWidth, newW));
        newH = Math.max(minHeight, Math.min(maxHeight, newH));

        // Snap to grid
        newW = _snap(newW);
        newH = _snap(newH);

        // Apply
        target.style.width = `${newW}px`;
        target.style.height = `${newH}px`;

        if (edge.includes("w") || edge === "nw" || edge === "sw") {
          const currentLeft = parseFloat(target.style.left || "0") || 0;
          target.style.left = `${currentLeft + (newLeft)}px`;
        }
        if (edge.includes("n") || edge === "nw" || edge === "ne") {
          const currentTop = parseFloat(target.style.top || "0") || 0;
          target.style.top = `${currentTop + (newTop)}px`;
        }

        onResize?.({ width: newW, height: newH });
      };

      const onEnd = (): void => {
        isResizing = false;
        onResizeEnd?.(getSize());
      };

      // Mouse
      const mouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
      const mouseUp = (): void => { onEnd(); document.removeEventListener("mousemove", mouseMove); document.removeEventListener("mouseup", mouseUp); };
      document.addEventListener("mousemove", mouseMove);
      document.addEventListener("mouseup", mouseUp);

      // Touch
      const touchMove = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0]!.clientX, e.touches[0]!.clientY); };
      const touchEnd = (): void => { onEnd(); document.removeEventListener("touchmove", touchMove); document.removeEventListener("touchend", touchEnd); };
      document.addEventListener("touchmove", touchMove, { passive: false });
      document.addEventListener("touchend", touchEnd);

      cleanupFns.push(() => {
        document.removeEventListener("mousemove", mouseMove);
        document.removeEventListener("mouseup", mouseUp);
        document.removeEventListener("touchmove", touchMove);
        document.removeEventListener("touchend", touchEnd);
      });
    };

    handle.addEventListener("mousedown", (e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY); });
    handle.addEventListener("touchstart", (e) => { e.stopPropagation(); startDrag(e.touches[0]!.clientX, e.touches[0]!.clientY); }, { passive: true });
  }

  function _snap(value: number): number {
    if (!gridSnap || gridSnap <= 0) return value;
    return Math.round(value / gridSnap) * gridSnap;
  }

  return { target, getSize, setSize, enable, disable, isEnabled, destroy };
}
