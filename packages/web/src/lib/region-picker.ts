/**
 * Region Picker: Select rectangular regions on an image or element
 * with visual feedback, coordinate output, aspect ratio locking,
 * multiple selection modes, and keyboard support.
 */

// --- Types ---

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }

export interface RegionPickerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Image/element source (URL, HTMLImageElement, or existing element) */
  source?: string | HTMLElement;
  /** Initial regions */
  initialRegions?: Rect[];
  /** Aspect ratio lock (e.g., "16:9", "1:1", "4:3", or null for free) */
  aspectRatio?: string | null;
  /** Minimum selection size in px */
  minSize?: number;
  /** Maximum number of regions (0 = unlimited) */
  maxRegions?: number;
  /** Show grid overlay? */
  showGrid?: boolean;
  /** Grid size in px */
  gridSize?: number;
  /** Selection color */
  selectionColor?: string;
  /** Border color */
  borderColor?: string;
  /** Show handles on corners/edges? */
  showHandles?: boolean;
  /** Allow moving existing selections */
  allowMove?: boolean;
  /** Allow resizing selections */
  allowResize?: boolean;
  /** Callback when a region is created or modified */
  onRegionChange?: (regions: Rect[]) => void;
  /** Callback on region select */
  onRegionSelect?: (index: number | null) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RegionPickerInstance {
  /** Root wrapper element */
  element: HTMLElement;
  /** Get current regions */
  getRegions(): Rect[];
  /** Set regions programmatically */
  setRegions(regions: Rect[]): void;
  /** Clear all regions */
  clearRegions(): void;
  /** Get selected region index */
  getSelectedIndex(): number | null;
  /** Export regions as normalized coordinates (0-1) */
  exportNormalized(): Array<{ x: number; y: number; width: number; height: number }>;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Helpers ---

function parseAspectRatio(ratio: string): number | null {
  if (!ratio || ratio === "free") return null;
  const parts = ratio.split(":").map(Number);
  if (parts.length !== 2 || parts.some((n) => isNaN(n))) return null;
  return parts[0]! / parts[1]!;
}

function clampRect(rect: Rect, bounds: { w: number; h: number }, ar: number | null): Rect {
  let r = { ...rect };

  // Clamp to bounds
  r.x = Math.max(0, Math.min(r.x, bounds.w));
  r.y = Math.max(0, Math.min(r.y, bounds.h));
  r.width = Math.min(r.width, bounds.w - r.x);
  r.height = Math.min(r.height, bounds.h - r.y);

  // Enforce aspect ratio
  if (ar !== null && r.width > 0 && r.height > 0) {
    const currentAR = r.width / r.height;
    if (currentAR > ar) {
      r.height = r.width / ar;
    } else {
      r.width = r.height * ar;
    }
  }

  return r;
}

// --- Main Factory ---

export function createRegionPicker(options: RegionPickerOptions): RegionPickerInstance {
  const opts = {
    source: options.source,
    initialRegions: options.initialRegions ?? [],
    aspectRatio: options.aspectRatio ?? null,
    minSize: options.minSize ?? 10,
    maxRegions: options.maxRegions ?? 0,
    showGrid: options.showGrid ?? false,
    gridSize: options.gridSize ?? 50,
    selectionColor: options.selectionColor ?? "rgba(59, 130, 246, 0.25)",
    borderColor: options.borderColor ?? "#3b82f6",
    showHandles: options.showHandles ?? true,
    allowMove: options.allowMove ?? true,
    allowResize: options.allowResize ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RegionPicker: container not found");

  const ar = parseAspectRatio(opts.aspectRatio!);
  let regions: Rect[] = opts.initialRegions.map((r) => ({ ...r }));
  let selectedIndex: number | null = null;
  let destroyed = false;

  // Build DOM
  const wrapper = document.createElement("div");
  wrapper.className = `region-picker ${opts.className}`;
  wrapper.style.cssText = `
    position:relative;width:100%;height:100%;overflow:hidden;
    cursor:crosshair;user-select:none;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  // Canvas layer for drawing
  const canvasLayer = document.createElement("div");
  canvasLayer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;";
  wrapper.appendChild(canvasLayer);

  // Grid overlay
  let gridEl: HTMLElement | null = null;
  if (opts.showGrid) {
    gridEl = document.createElement("div");
    gridEl.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background-image:
        linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
      background-size:${opts.gridSize}px ${opts.gridSize}px;
      pointer-events:none;z-index:0;
    `;
    wrapper.appendChild(gridEl);
  }

  // Source image/element
  let sourceEl: HTMLElement | null = null;
  if (typeof opts.source === "string") {
    const img = document.createElement("img");
    img.src = opts.source;
    img.style.cssText = "display:block;width:100%;height:100%;object-fit:contain;";
    img.draggable = false;
    wrapper.insertBefore(img, canvasLayer);
    sourceEl = img;
  } else if (opts.source instanceof HTMLElement) {
    opts.source.style.cssText += ";width:100%;height:100%;";
    wrapper.insertBefore(opts.source, canvasLayer);
    sourceEl = opts.source;
  }

  // State for active selection
  let isDrawing = false;
  let startPoint: Point | null = null;
  let currentRect: Rect | null = null;
  let isDragging = false;
  let dragOffset: Point = { x: 0, y: 0 };
  let isResizing = false;
  let resizeHandle: string | null = null;

  function getBounds(): { w: number; h: number } {
    return { w: wrapper.clientWidth, h: wrapper.clientHeight };
  }

  function getMousePos(e: MouseEvent): Point {
    const rect = wrapper.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // --- Rendering ---

  function render(): void {
    canvasLayer.innerHTML = "";

    // Draw each region
    for (let i = 0; i < regions.length; i++) {
      const r = regions[i]!;
      const isSelected = i === selectedIndex;
      const regionEl = createRegionElement(r, i, isSelected);
      canvasLayer.appendChild(regionEl);
    }

    // Draw active selection while drawing
    if (isDrawing && currentRect) {
      const activeEl = createRegionElement(currentRect, -1, true);
      activeEl.style.pointerEvents = "none";
      canvasLayer.appendChild(activeEl);
    }

    opts.onRegionChange?.(regions);
  }

  function createRegionElement(r: Rect, index: number, isActive: boolean): HTMLElement {
    const el = document.createElement("div");
    el.dataset.region = String(index);
    el.style.cssText = `
      position:absolute;left:${r.x}px;top:${r.y}px;
      width:${r.width}px;height:${r.height}px;
      background:${isActive ? opts.selectionColor : "transparent"};
      border:2px solid ${isSelected ? opts.borderColor : `${opts.borderColor}99`};
      ${index >= 0 ? "cursor:move;pointer-events:auto;" : "pointer-events:none;"}
      z-index:${isActive ? 3 : 2};
    `;

    // Handles for resizing
    if (opts.showHandles && index >= 0) {
      const handles = ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
      for (const handle of handles) {
        const hEl = document.createElement("div");
        hEl.dataset.handle = handle;
        const pos = getHandlePosition(handle, r.width, r.height);
        hEl.style.cssText = `
          position:absolute;left:${pos.x}px;top:${pos.y}px;
          width:8px;height:8px;background:#fff;border:2px solid ${opts.borderColor};
          border-radius:50%;cursor:${getCursorForHandle(handle)};
          z-index:4;
        `;
        el.appendChild(hEl);
      }
    }

    // Click to select
    if (index >= 0) {
      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        selectedIndex = index;
        opts.onRegionSelect?.(index);

        // Check if clicking a resize handle
        const target = e.target as HTMLElement;
        if (target.dataset.handle) {
          startResize(e, index, target.dataset.handle);
        } else if (opts.allowMove) {
          startDrag(e, index);
        }
        render();
      });
    }

    return el;
  }

  function getHandlePosition(handle: string, w: number, h: number): Point {
    switch (handle) {
      case "nw": return { x: -4, y: -4 };
      case "ne": return { x: w - 4, y: -4 };
      case "sw": return { x: -4, y: h - 4 };
      case "se": return { x: w - 4, y: h - 4 };
      case "n": return { x: w / 2 - 4, y: -4 };
      case "s": return { x: w / 2 - 4, y: h - 4 };
      case "e": return { x: w - 4, y: h / 2 - 4 };
      case "w": return { x: -4, y: h / 2 - 4 };
      default: return { x: 0, y: 0 };
    }
  }

  function getCursorForHandle(handle: string): string {
    const cursors: Record<string, string> = {
      nw: "nw-resize", ne: "ne-resize", sw: "sw-resize", se: "se-resize",
      n: "n-resize", s: "s-resize", e: "e-resize", w: "w-resize",
    };
    return cursors[handle] ?? "move";
  }

  // --- Interaction Handlers ---

  function startDrag(_e: MouseEvent, index: number): void {
    if (!opts.allowMove) return;
    isDragging = true;
    const pos = getMousePos(_e);
    const r = regions[index]!;
    dragOffset = { x: pos.x - r.x, y: pos.y - r.y };
  }

  function startResize(_e: MouseEvent, _index: number, handle: string): void {
    if (!opts.allowResize) return;
    isResizing = true;
    resizeHandle = handle;
  }

  wrapper.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).dataset.region || (e.target as HTMLElement).dataset.handle) return;

    // Start new selection
    if (opts.maxRegions > 0 && regions.length >= opts.maxRegions) return;

    isDrawing = true;
    startPoint = getMousePos(e);
    currentRect = { x: startPoint.x, y: startPoint.y, width: 0, height: 0 };
    selectedIndex = null;
    opts.onRegionSelect?.(null);
    render();
  });

  document.addEventListener("mousemove", (e) => {
    const pos = getMousePos(e);
    const bounds = getBounds();

    if (isDrawing && startPoint) {
      const x = Math.min(startPoint.x, pos.x);
      const y = Math.min(startPoint.y, pos.y);
      const w = Math.abs(pos.x - startPoint.x);
      const h = Math.abs(pos.y - startPoint.y);
      currentRect = clampRect({ x, y, width: w, height: h }, bounds, ar);
      render();
    } else if (isDragging && selectedIndex !== null) {
      const r = regions[selectedIndex]!;
      let newX = pos.x - dragOffset.x;
      let newY = pos.y - dragOffset.y;
      newX = Math.max(0, Math.min(newX, bounds.w - r.width));
      newY = Math.max(0, Math.min(newY, bounds.h - r.height));
      regions[selectedIndex] = { ...r, x: newX, y: newY };
      render();
    } else if (isResizing && selectedIndex !== null && resizeHandle) {
      const r = regions[selectedIndex]!;
      const newR = applyResize(r, pos, resizeHandle, bounds, ar);
      if (newR.width >= opts.minSize && newR.height >= opts.minSize) {
        regions[selectedIndex] = newR;
        render();
      }
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDrawing && currentRect) {
      if (currentRect.width >= opts.minSize && currentRect.height >= opts.minSize) {
        regions.push({ ...currentRect });
        selectedIndex = regions.length - 1;
        opts.onRegionSelect?.(selectedIndex);
      }
    }
    isDrawing = false;
    startPoint = null;
    currentRect = null;
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
    render();
  });

  function applyResize(r: Rect, pos: Point, handle: string, bounds: { w: number; h: number }, ar: number | null): Rect {
    let nr = { ...r };

    switch (handle) {
      case "se": nr.width = pos.x - r.x; nr.height = pos.y - r.y; break;
      case "sw": { const right = r.x + r.width; nr.x = pos.x; nr.width = right - pos.x; nr.height = pos.y - r.y; } break;
      case "ne": nr.width = pos.x - r.x; { const bottom = r.y + r.height; nr.y = pos.y; nr.height = bottom - pos.y; } break;
      case "nw": { const right = r.x + r.width; const bottom = r.y + r.height; nr.x = pos.x; nr.y = pos.y; nr.width = right - pos.x; nr.height = bottom - pos.y; } break;
      case "s": nr.height = pos.y - r.y; break;
      case "n": { const bottom = r.y + r.height; nr.y = pos.y; nr.height = bottom - pos.y; } break;
      case "e": nr.width = pos.x - r.x; break;
      case "w": { const right = r.x + r.width; nr.x = pos.x; nr.width = right - pos.x; } break;
    }

    return clampRect(nr, bounds, ar);
  }

  // Keyboard: Delete selected region
  wrapper.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedIndex !== null) {
      regions.splice(selectedIndex, 1);
      selectedIndex = null;
      opts.onRegionSelect?.(null);
      render();
    }
  });

  // Make focusable for keyboard events
  wrapper.tabIndex = 0;

  // Initial render
  render();

  // --- Public API ---

  return {
    element: wrapper,

    getRegions(): Rect[] { return regions.map((r) => ({ ...r })) },

    setRegions(newRegions: Rect[]): void {
      regions = newRegions.map((r) => ({ ...r }));
      selectedIndex = null;
      render();
    },

    clearRegions(): void {
      regions = [];
      selectedIndex = null;
      render();
    },

    getSelectedIndex(): number | null { return selectedIndex; },

    exportNormalized(): Array<{ x: number; y: number; width: number; height: number }> {
      const bounds = getBounds();
      return regions.map((r) => ({
        x: r.x / bounds.w,
        y: r.y / bounds.h,
        width: r.width / bounds.w,
        height: r.height / bounds.h,
      }));
    },

    destroy(): void {
      destroyed = true;
      wrapper.remove();
    },
  };
}
