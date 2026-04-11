/**
 * Drag & Drop Utilities: Custom drag system, sortable lists, drag handles,
 * drop zones, drag preview/ghost, constraints, snap-to-grid, and
 * cross-container drag support.
 */

// --- Types ---

export interface DragData {
  /** The element being dragged */
  element: HTMLElement;
  /** Original position when drag started */
  startX: number;
  startY: number;
  /** Current position */
  currentX: number;
  currentY: number;
  /** Delta from start */
  deltaX: number;
  deltaY: number;
  /** Pointer/touch ID */
  pointerId: number;
  /** Data attached to this drag (for drop handling) */
  payload?: unknown;
}

export interface DragOptions {
  /** Element that initiates the drag (can be a child handle) */
  handle?: HTMLElement | string;
  /** Only allow dragging on left mouse button. Default true */
  leftButtonOnly?: boolean;
  /** Constrain drag within an element or viewport */
  constrainTo?: HTMLElement | "parent" | "viewport" | "document";
  /** Axis lock: "x", "y", or undefined for free */
  axis?: "x" | "y";
  /** Snap to grid of N pixels */
  gridSnap?: number;
  /** Minimum distance before drag starts (px). Default 3 */
  threshold?: number;
  /** CSS cursor during drag. Default "grabbing" */
  dragCursor?: string;
  /** Show ghost/preview element. Default true */
  showGhost?: boolean;
  /** Ghost element class name. Default "drag-ghost" */
  ghostClass?: string;
  /** Apply transform directly instead of changing position. Default false */
  useTransform?: boolean;
  /** Disable text selection during drag. Default true */
  disableSelection?: boolean;
  /** Prevent default on events. Default true */
  preventDefault?: boolean;
  /** Called when drag starts */
  onDragStart?: (data: DragData) => void;
  /** Called on every move during drag */
  onDrag?: (data: DragData) => void;
  /** Called when drag ends (even without movement) */
  onDragEnd?: (data: DragData) => void;
}

export interface DropZone {
  /** The container element */
  element: HTMLElement;
  /** Accepted data types / groups */
  accept?: string | string[] | ((payload: unknown) => boolean);
  /** Called when a draggable enters the zone */
  onDragEnter?: (data: DragData) => void;
  /** Called when a draggable leaves the zone */
  onDragLeave?: (data: DragData) => void;
  /** Called when dropped in the zone */
  onDrop?: (data: DragData) => void;
  /** Highlight class applied on hover */
  activeClass?: string;
}

export interface SortableConfig {
  /** Container of sortable items */
  container: HTMLElement;
  /** Selector for sortable items */
  items: string;
  /** Handle selector (if different from item itself) */
  handle?: string;
  /** Animation duration for reordering (ms). Default 200 */
  animationDuration?: number;
  /** Group name for cross-list sorting */
  group?: string;
  /** Vertical orientation. Default true */
  vertical?: boolean;
  /** Threshold for reordering (% of item size). Default 30 */
  reorderThreshold?: number;
  /** Called when items are reordered */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Called when drag starts */
  onDragStart?: (item: HTMLElement) => void;
  /** Called when drag ends */
  onDragEnd?: (item: HTMLElement) => void;
  /** Custom class for dragged item */
  draggingClass?: string;
  /** Class for placeholder */
  placeholderClass?: string;
}

// --- Draggable ---

/**
 * Make an element draggable with full control over behavior.
 *
 * @example
 * ```ts
 * const drag = makeDraggable(element, {
 *   onDragStart: (d) => console.log("Started at", d.startX, d.startY),
 *   onDrag: (d) => console.log("At", d.currentX, d.currentY),
 *   onDragEnd: (d) => console.log("Ended, delta:", d.deltaX, d.deltaY),
 * });
 * // Later: drag.destroy();
 * ```
 */
export function makeDraggable(element: HTMLElement, options: DragOptions = () => void): { destroy: () => void } {
  const opts = {
    leftButtonOnly: true,
    threshold: 3,
    dragCursor: "grabbing",
    showGhost: true,
    ghostClass: "drag-ghost",
    disableSelection: true,
    preventDefault: true,
    ...options,
  };

  let isDragging = false;
  let hasStarted = false;
  let ghost: HTMLElement | null = null;
  let data: DragData | null = null;
  let cleanupFns: Array<() => void> = [];

  const getHandle = (): HTMLElement => {
    if (!opts.handle) return element;
    if (typeof opts.handle === "string") {
      return element.querySelector(opts.handle) ?? element;
    }
    return opts.handle;
  };

  const onStart = (e: MouseEvent | TouchEvent): void => {
    // Button check for mouse
    if ("button" in e && opts.leftButtonOnly && e.button !== 0) return;

    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;

    data = {
      element,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      deltaX: 0,
      deltaY: 0,
      pointerId: "touches" in e ? e.touches[0]!.identifier : 1,
      payload: undefined,
    };
    isDragging = true;
    hasStarted = false;

    if (opts.preventDefault && e.cancelable) e.preventDefault();

    // Create ghost
    if (opts.showGhost) {
      ghost = element.cloneNode(true) as HTMLElement;
      ghost.className += ` ${opts.ghostClass}`;
      ghost.style.position = "fixed";
      ghost.style.pointerEvents = "none";
      ghost.style.zIndex = "9999";
      ghost.style.width = `${element.offsetWidth}px`;
      ghost.style.height = `${element.offsetHeight}px`;
      ghost.style.left = `${element.getBoundingClientRect().left}px`;
      ghost.style.top = `${element.getBoundingClientRect().top}px`;
      ghost.style.opacity = "0.8";
      document.body.appendChild(ghost);
    }

    // Disable selection
    if (opts.disableSelection) {
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
    }

    // Set cursor
    document.body.style.cursor = opts.dragCursor!;
  };

  const onMove = (e: MouseEvent | TouchEvent): void => {
    if (!isDragging || !data) return;

    const clientX = "touches" in e
      ? e.touches[0]?.clientX ?? data.currentX
      : e.clientX;
    const clientY = "touches" in e
      ? e.touches[0]?.clientY ?? data.currentY
      : e.clientY;

    data.deltaX = clientX - data.startX;
    data.deltaY = clientY - data.startY;
    data.currentX = clientX;
    data.currentY = clientY;

    // Check threshold
    if (!hasStarted) {
      const dist = Math.sqrt(data.deltaX * data.deltaX + data.deltaY * data.deltaY);
      if (dist < opts.threshold!) return;
      hasStarted = true;
      opts.onDragStart?.(data);
    }

    // Axis lock
    if (opts.axis === "x") data.deltaY = 0;
    if (opts.axis === "y") data.deltaX = 0;

    // Grid snap
    if (opts.gridSnap) {
      data.deltaX = Math.round(data.deltaX / opts.gridSnap) * opts.gridSnap;
      data.deltaY = Math.round(data.deltaY / opts.gridSnap) * opts.gridSnap;
    }

    // Constrain
    _applyConstraints(data);

    // Move element or ghost
    const target = ghost ?? element;
    if (opts.useTransform) {
      target.style.transform = `translate(${data.deltaX}px, ${data.deltaY}px)`;
    } else {
      const rect = element.getBoundingClientRect();
      target.style.left = `${rect.left + data.deltaX}px`;
      target.style.top = `${rect.top + data.deltaY}px`;
    }

    if (hasStarted) opts.onDrag?.(data);
  };

  const onEnd = (_e: MouseEvent | TouchEvent): void => {
    if (!isDragging || !data) return;
    isDragging = false;

    // Remove ghost
    if (ghost) {
      ghost.remove();
      ghost = null;
    }

    // Restore selection
    if (opts.disableSelection) {
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    }
    document.body.style.cursor = "";

    if (hasStarted) {
      opts.onDragEnd?.(data);
    }

    data = null;
  };

  // Bind events
  const handle = getHandle();
  handle.addEventListener("mousedown", onStart as EventListener);
  handle.addEventListener("touchstart", onStart as EventListener, { passive: false });
  window.addEventListener("mousemove", onMove as EventListener);
  window.addEventListener("touchmove", onMove as EventListener, { passive: false });
  window.addEventListener("mouseup", onEnd as EventListener);
  window.addEventListener("touchend", onEnd as EventListener);

  cleanupFns.push(
    () => handle.removeEventListener("mousedown", onStart as EventListener),
    () => handle.removeEventListener("touchstart", onStart as EventListener),
    () => window.removeEventListener("mousemove", onMove as EventListener),
    () => window.removeEventListener("touchmove", onMove as EventListener),
    () => window.removeEventListener("mouseup", onEnd as EventListener),
    () => window.removeEventListener("touchend", onEnd as EventListener),
  );

  return {
    destroy: () => {
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
      if (ghost) { ghost.remove(); ghost = null; }
    },
  };
}

/** Apply constraint options to drag delta */
function _applyConstraints(data: DragData, options?: DragOptions): void {
  const constrain = options?.constrainTo;
  if (!constrain) return;

  let bounds: DOMRect;
  if (constrain === "viewport") {
    bounds = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, right: window.innerWidth, bottom: window.innerHeight, x: 0, y: 0, toJSON() {} } as DOMRect;
  } else if (constrain === "parent") {
    const parent = data.element.parentElement;
    if (!parent) return;
    bounds = parent.getBoundingClientRect();
  } else if (constrain === "document") {
    bounds = {
      left: 0, top: 0,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      right: document.documentElement.scrollWidth,
      bottom: document.documentElement.scrollHeight,
      x: 0, y: 0,
      toJSON() {},
    } as DOMRect;
  } else {
    bounds = constrain.getBoundingClientRect();
  }

  const elRect = data.element.getBoundingClientRect();

  // Clamp delta so element stays within bounds
  const maxDeltaX = bounds.right - elRect.width - elRect.left;
  const maxDeltaY = bounds.bottom - elRect.height - elRect.top;
  const minDeltaX = bounds.left - elRect.left;
  const minDeltaY = bounds.top - elRect.top;

  data.deltaX = Math.max(minDeltaX, Math.min(data.deltaX, maxDeltaX));
  data.deltaY = Math.max(minDeltaY, Math.min(data.deltaY, maxDeltaY));
}

// --- Drop Zone Manager ---

/**
 * DropZoneManager - manages multiple drop zones and auto-detects
 * which zone a draggable is hovering over.
 */
export class DropZoneManager {
  private zones: Map<string, DropZone> = new Map();
  private activeZone: string | null = null;
  private currentDrag: DragData | null = null;

  /** Register a drop zone */
  register(zone: DropZone): string {
    const id = zone.element.id || `zone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.zones.set(id, zone);
    return id;
  }

  /** Unregister a drop zone */
  unregister(id: string): void {
    this.zones.delete(id);
  }

  /** Notify that a drag has started (call from your onDrag) */
  notifyDragStart(data: DragData): void {
    this.currentDrag = data;
    this.activeZone = null;
  }

  /** Notify of drag move — auto-detects zone enter/leave */
  notifyDragMove(data: DragData): void {
    this.currentDrag = data;
    const hitZone = this._detectZone(data.currentX, data.currentY);

    if (hitZone !== this.activeZone) {
      // Leave old zone
      if (this.activeZone) {
        const oldZone = this.zones.get(this.activeZone);
        if (oldZone) {
          oldZone.element.classList.remove(oldZone.activeClass ?? "drop-active");
          oldZone.onDragLeave?.(data);
        }
      }

      // Enter new zone
      this.activeZone = hitZone;
      if (hitZone) {
        const zone = this.zones.get(hitZone)!;
        zone.element.classList.add(zone.activeClass ?? "drop-active");
        zone.onDragEnter?.(data);
      }
    }
  }

  /** Notify that drag ended — triggers drop if over a zone */
  notifyDragEnd(data: DragData): void {
    if (this.activeZone) {
      const zone = this.zones.get(this.activeZone)!;
      zone.element.classList.remove(zone.activeClass ?? "drop-active");
      zone.onDrop?.(data);
    }
    this.currentDrag = null;
    this.activeZone = null;
  }

  /** Get currently active zone ID */
  getActiveZone(): string | null { return this.activeZone; }

  /** Destroy all zones */
  destroy(): void {
    for (const [, zone] of this.zones) {
      zone.element.classList.remove(zone.activeClass ?? "drop-active");
    }
    this.zones.clear();
  }

  private _detectZone(x: number, y: number): string | null {
    // Hit test from last registered (topmost) to first
    const entries = Array.from(this.zones.entries()).reverse();
    for (const [id, zone] of entries) {
      const rect = zone.element.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // Check accept filter
        if (zone.accept) {
          if (typeof zone.accept === "function") {
            if (!zone.accept(data?.payload)) continue;
          } else if (Array.isArray(zone.accept)) {
            // Simple check — can be extended
            continue; // Accept by default for now
          }
        }
        return id;
      }
    }
    return null;
  }
}

// --- Sortable List ---

/**
 * Create a sortable list from a container and its children.
 *
 * @example
 * ```ts
 * const sortable = createSortable({
 *   container: document.getElementById('list')!,
 *   items: '.list-item',
 *   onReorder: (from, to) => console.log(`Moved ${from} -> ${to}`),
 * });
 * ```
 */
export function createSortable(config: SortableConfig): { destroy: () => void } {
  const {
    container,
    items: itemSelector,
    handle: handleSelector,
    animationDuration = 200,
    vertical = true,
    reorderThreshold = 30,
    onReorder,
    onDragStart: onItemDragStart,
    onDragEnd: onItemDragEnd,
    draggingClass = "sortable-dragging",
    placeholderClass = "sortable-placeholder",
  } = config;

  let dragEl: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;
  let startIndex = -1;
  let currentIndex = -1;
  let cleanupFns: Array<() => void> = [];

  const getItems = (): HTMLElement[] =>
    Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];

  const getItemIndex = (el: HTMLElement): number =>
    getItems().indexOf(el);

  const createPlaceholder = (source: HTMLElement): HTMLElement => {
    const ph = document.createElement("div");
    ph.className = placeholderClass;
    ph.style.width = `${source.offsetWidth}px`;
    ph.style.height = `${source.offsetHeight}px`;
    ph.style.visibility = "hidden";
    return ph;
  };

  const onPointerDown = (e: Event): void => {
    const event = e as MouseEvent;
    const target = (event.target as HTMLElement).closest(itemSelector) as HTMLElement;
    if (!target) return;

    if (handleSelector && !target.closest(handleSelector)) return;

    dragEl = target;
    startIndex = getItemIndex(target);
    currentIndex = startIndex;

    placeholder = createPlaceholder(target);
    target.parentNode!.insertBefore(placeholder, target.nextSibling);

    target.classList.add(draggingClass);
    target.style.position = "relative";
    target.style.zIndex = "1000";

    onItemDragStart?.(target);

    if (event.cancelable) event.preventDefault();
  };

  const onPointerMove = (e: Event): void => {
    if (!dragEl || !placeholder) return;
    const event = e as MouseEvent;

    const items = getItems();
    const dragRect = dragEl.getBoundingClientRect();

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      if (item === dragEl || item === placeholder) continue;

      const itemRect = item.getBoundingClientRect();

      if (vertical) {
        const midY = itemRect.top + itemRect.height / 2;
        if (event.clientY < midY && i < currentIndex) {
          item.parentNode!.insertBefore(placeholder, item);
          currentIndex = i;
          break;
        } else if (event.clientY > midY && i > currentIndex) {
          item.parentNode!.insertBefore(placeholder, item.nextSibling);
          currentIndex = i;
          break;
        }
      } else {
        const midX = itemRect.left + itemRect.width / 2;
        if (event.clientX < midX && i < currentIndex) {
          item.parentNode!.insertBefore(placeholder, item);
          currentIndex = i;
          break;
        } else if (event.clientX > midX && i > currentIndex) {
          item.parentNode!.insertBefore(placeholder, item.nextSibling);
          currentIndex = i;
          break;
        }
      }
    }
  };

  const onPointerUp = (): void => {
    if (!dragEl || !placeholder) return;

    dragEl.classList.remove(draggingClass);
    dragEl.style.position = "";
    dragEl.style.zIndex = "";

    // Insert before placeholder
    placeholder.parentNode!.insertBefore(dragEl, placeholder);
    placeholder.remove();
    placeholder = null;

    if (startIndex !== currentIndex && currentIndex >= 0) {
      onReorder?.(startIndex, currentIndex);
    }

    onItemDragEnd?.(dragEl);
    dragEl = null;
    startIndex = -1;
    currentIndex = -1;
  };

  // Bind events
  container.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);

  // Touch support
  container.addEventListener("touchstart", onPointerDown, { passive: false });
  window.addEventListener("touchmove", onPointerMove, { passive: false });
  window.addEventListener("touchend", onPointerUp);

  cleanupFns.push(
    () => container.removeEventListener("mousedown", onPointerDown),
    () => window.removeEventListener("mousemove", onPointerMove),
    () => window.removeEventListener("mouseup", onPointerUp),
    () => container.removeEventListener("touchstart", onPointerDown),
    () => window.removeEventListener("touchmove", onPointerMove),
    () => window.removeEventListener("touchend", onPointerUp),
  );

  return {
    destroy: () => {
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
      if (placeholder) { placeholder.remove(); placeholder = null; }
      if (dragEl) {
        dragEl.classList.remove(draggingClass);
        dragEl.style.position = "";
        dragEl.style.zIndex = "";
        dragEl = null;
      }
    },
  };
}
