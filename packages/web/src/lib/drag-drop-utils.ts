/**
 * Drag & Drop Utilities: Drag and drop with sortable lists, drag handles,
 * ghost/preview elements, drop zones, drag-over states, constraints,
 * data transfer, and accessibility support.
 */

// --- Types ---

export type DragAxis = "x" | "y" | "both";
export type DragConstraint = "none" | "parent" | "container" | "bounds";

export interface DragData {
  /** Data type identifier */
  type: string;
  /** Payload */
  payload: unknown;
  /** Optional ID for tracking */
  id?: string;
}

export interface DropZoneOptions {
  /** The drop zone element */
  target: HTMLElement;
  /** Accepted data types */
  acceptTypes?: string[];
  /** Callback when a valid item is dropped */
  onDrop?: (data: DragData, event: DragEvent) => void;
  /** Callback when item enters zone */
  onDragEnter?: (event: DragEvent) => void;
  /** Callback when item leaves zone */
  onDragLeave?: (event: DragEvent) => void;
  /** Callback when item is dragged over zone */
  onDragOver?: (event: DragEvent) => void;
  /** Highlight class while dragging over */
  highlightClass?: string;
  /** Disabled? */
  disabled?: boolean;
}

export interface DraggableOptions {
  /** The draggable element */
  target: HTMLElement;
  /** Data attached to this draggable */
  data: DragData;
  /** Drag handle inside target (if null, entire target is handle) */
  handle?: HTMLElement | null;
  /** Allowed axis of movement */
  axis?: DragAxis;
  /** Constraint boundary */
  constraint?: DragConstraint;
  /** Constraint bounds (for "bounds" mode) */
  bounds?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Ghost/preview offset from cursor */
  ghostOffset?: { x: number; y: number };
  /** Show ghost/preview while dragging? */
  showGhost?: boolean;
  /** Ghost opacity */
  ghostOpacity?: number;
  /** Custom ghost renderer */
  renderGhost?: (original: HTMLElement) => HTMLElement;
  /** Revert animation on cancel (ms)? */
  revertDuration?: number;
  /** Snap to grid? */
  gridSnap?: number;
  /** Called when drag starts */
  onDragStart?: (event: DragEvent) => void;
  /** Called during drag */
  onDrag?: (event: DragEvent) => void;
  /** Called when drag ends (before drop processing) */
  onDragEnd?: (event: DragEvent) => void;
  /** Z-index while dragging */
  zIndex?: number;
  /** Cursor style while dragging */
  cursor?: string;
  /** Disabled? */
  disabled?: boolean;
}

export interface SortableOptions {
  /** Container holding sortable items */
  container: HTMLElement;
  /** Selector for sortable items within container */
  itemsSelector: string;
  /** Selector for drag handles (optional) */
  handleSelector?: string;
  /** Animation duration for reordering (ms) */
  animationDuration?: number;
  /** Axis constraint */
  axis?: DragAxis;
  /** Ghost opacity */
  ghostOpacity?: number;
  /** Called when order changes */
  onReorder?: (oldIndex: number, newIndex: number, itemEl: HTMLElement) => void;
  /** Called when drag starts */
  onDragStart?: (itemEl: HTMLElement, index: number) => void;
  /** Called when drag ends */
  onDragEnd?: (itemEl: HTMLElement) => void;
  /** Disabled? */
  disabled?: boolean;
  /** Group name (for cross-container sorting) */
  group?: string;
}

export interface DragEvent {
  /** Original event */
  originalEvent: MouseEvent | TouchEvent;
  /** Current position */
  x: number;
  y: number;
  /** Start position */
  startX: number;
  startY: number;
  /** Delta from start */
  deltaX: number;
  deltaY: number;
  /** Current target under cursor */
  dropTarget?: HTMLElement | null;
  /** Data being dragged */
  data?: DragData;
}

export interface DraggableInstance {
  /** The target element */
  target: HTMLElement;
  /** Currently dragging? */
  isDragging(): boolean;
  /** Destroy and cleanup */
  destroy(): void;
}

export interface DropZoneInstance {
  /** The target element */
  target: HTMLElement;
  /** Destroy and cleanup */
  destroy(): void;
}

export interface SortableInstance {
  /** The container element */
  el: HTMLElement;
  /** Get current item order (element array) */
  getOrder(): HTMLElement[];
  /** Disable/enable */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Global State ---

let activeDraggable: DraggableInstance | null = null;
let activeDropZones: Set<DropZoneInstance> = new Set();
const globalData = new Map<string, DragData>();

// --- Core Factory: Draggable ---

/**
 * Make an element draggable.
 *
 * @example
 * ```ts
 * const d = createDraggable({
 *   target: card,
 *   data: { type: "card", payload: { id: "card-1" } },
 *   showGhost: true,
 *   onDragEnd: (e) => console.log("Dropped at", e.x, e.y),
 * });
 * ```
 */
export function createDraggable(options: DraggableOptions): DraggableInstance {
  const {
    target,
    data,
    handle = null,
    axis = "both",
    constraint = "none",
    bounds,
    ghostOffset = { x: 10, y: 10 },
    showGhost = false,
    ghostOpacity = 0.8,
    renderGhost,
    revertDuration = 200,
    gridSnap,
    onDragStart,
    onDrag,
    onDragEnd,
    zIndex = 1000,
    cursor = "grabbing",
    disabled = false,
  } = options;

  let _isDragging = false;
  let _ghost: HTMLElement | null = null;
  let _startX = 0, _startY = 0;
  let _initialRect: DOMRect | null = null;
  let cleanupFns: Array<() => void> = [];

  // Store data globally
  globalData.set(data.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, data);

  // Determine actual handle
  const handleEl = handle ?? target;

  function makeDragEvent(e: MouseEvent | TouchEvent): DragEvent {
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      originalEvent: e,
      x: cx, y: cy,
      startX: _startX, startY: _startY,
      deltaX: cx - _startX,
      deltaY: cy - _startY,
      data,
    };
  }

  function startDrag(e: MouseEvent | TouchEvent): void {
    if (disabled || _isDragging) return;
    e.preventDefault();

    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    _startX = cx; _startY = cy;
    _initialRect = target.getBoundingClientRect();
    _isDragging = true;
    activeDraggable = instance;

    target.style.cursor = cursor;
    target.style.zIndex = String(zIndex);
    target.style.position = "relative";
    if (axis !== "y") target.style.willChange = "transform";
    if (axis !== "x") target.style.willChange = "transform";

    // Create ghost
    if (showGhost) {
      _ghost = renderGhost
        ? renderGhost(target)
        : target.cloneNode(true) as HTMLElement;
      _ghost.className += " drag-ghost";
      _ghost.style.cssText +=
        ";position:fixed;pointer-events:none;z-index:" + (zIndex + 1) + ";" +
        `opacity:${ghostOpacity};margin:0;`;
      document.body.appendChild(_ghost);
    }

    onDragStart?.(makeDragEvent(e));
  }

  function doDrag(e: MouseEvent | TouchEvent): void {
    if (!_isDragging || disabled) return;

    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    let dx = cx - _startX;
    let dy = cy - _startY;

    // Apply axis constraint
    if (axis === "x") dy = 0;
    if (axis === "y") dx = 0;

    // Apply grid snap
    if (gridSnap && gridSnap > 0) {
      dx = Math.round(dx / gridSnap) * gridSnap;
      dy = Math.round(dy / gridSnap) * gridSnap;
    }

    // Apply constraint
    if (_initialRect) {
      let newX = dx;
      let newY = dy;

      switch (constraint) {
        case "parent": {
          const parent = target.parentElement?.getBoundingClientRect();
          if (parent) {
            newX = Math.max(-_initialRect.left + parent.left, Math.min(dx, parent.width - _initialRect.right + parent.left));
            newY = Math.max(-_initialRect.top + parent.top, Math.min(dy, parent.height - _initialRect.bottom + parent.top));
          }
          break;
        }
        case "bounds":
          if (bounds) {
            newX = Math.max(bounds.left ?? -Infinity, Math.min(dx, bounds.right ?? Infinity));
            newY = Math.max(bounds.top ?? -Infinity, Math.min(dy, bounds.bottom ?? Infinity));
          }
          break;
      }

      dx = newX;
      dy = newY;
    }

    // Move target
    target.style.transform = `translate(${dx}px, ${dy}px)`;

    // Move ghost
    if (_ghost) {
      _ghost.style.left = `${cx + ghostOffset.x}px`;
      _ghost.style.top = `${cy + ghostOffset.y}px`;
    }

    onDrag?.(makeDragEvent(e));

    // Check drop zones
    checkDropZones(cx, cy);
  }

  function endDrag(e: MouseEvent | TouchEvent): void {
    if (!_isDragging) return;
    _isDragging = false;

    const event = makeDragEvent(e);

    // Check for drop
    const dropped = tryDrop(event);

    // Revert or finalize
    if (!dropped && revertDuration > 0) {
      target.style.transition = `transform ${revertDuration}ms ease`;
      target.style.transform = "";
      setTimeout(() => { target.style.transition = ""; }, revertDuration);
    } else {
      target.style.transform = "";
    }

    target.style.cursor = "";
    target.style.zIndex = "";

    if (_ghost) {
      _ghost.remove();
      _ghost = null;
    }

    activeDraggable = null;
    clearAllDropHighlights();

    onDragEnd?.(event);
  }

  // Event bindings
  handleEl.addEventListener("mousedown", (e) => { if (e.target === handleEl || !handle) startDrag(e); });
  handleEl.addEventListener("touchstart", (e) => { startDrag(e as unknown as TouchEvent); }, { passive: true });

  document.addEventListener("mousemove", (e) => doDrag(e));
  document.addEventListener("mouseup", (e) => endDrag(e));
  document.addEventListener("touchmove", (e) => { if (_isDragging) { e.preventDefault(); doDrag(e as unknown as TouchEvent); } }, { passive: false });
  document.addEventListener("touchend", (e) => endDrag(e as unknown as TouchEvent));

  cleanupFns.push(
    () => document.removeEventListener("mousemove", doDrag),
    () => document.removeEventListener("mouseup", endDrag),
    () => document.removeEventListener("touchmove", doDrag),
    () => document.removeEventListener("touchend", endDrag),
  );

  const instance: DraggableInstance = {
    target,
    isDragging: () => _isDragging,
    destroy() {
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
      target.style.cursor = "";
      target.style.transform = "";
      target.style.zIndex = "";
      target.style.willChange = "";
    },
  };

  return instance;
}

// --- Core Factory: Drop Zone ---

function createDropZone(options: DropZoneOptions): DropZoneInstance {
  const {
    target,
    acceptTypes,
    onDrop,
    onDragEnter,
    onDragLeave,
    onDragOver,
    highlightClass = "drop-active",
    disabled = false,
  } = options;

  let _active = false;

  function checkEnter(x: number, y: number): boolean {
    if (disabled) return false;
    const rect = target.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function highlight(on: boolean): void {
    if (on) {
      target.classList.add(highlightClass);
      _active = true;
    } else {
      target.classList.remove(highlightClass);
      _active = false;
    }
  }

  const instance: DropZoneInstance = {
    target,
    destroy() {
      target.classList.remove(highlightClass);
    },
  };

  // Register globally
  activeDropZones.add(instance);

  return instance;
}

// --- Core Factory: Sortable ---

/**
 * Create a sortable list.
 *
 * @example
 * ```ts
 * const sort = createSortable({
 *   container: listEl,
 *   itemsSelector: ".sortable-item",
 *   onReorder: (oldIdx, newIdx) => console.log(`Moved ${oldIdx} -> ${newIdx}`),
 * });
 * ```
 */
export function createSortable(options: SortableOptions): SortableInstance {
  const {
    container,
    itemsSelector,
    handleSelector,
    animationDuration = 200,
    axis = "y",
    ghostOpacity = 0.7,
    onReorder,
    onDragStart,
    onDragEnd,
    disabled = false,
    group,
  } = options;

  let _disabled = disabled;
  let _draggedItem: HTMLElement | null = null;
  let _draggedIndex = -1;
  let _placeholder: HTMLElement | null = null;
  let _ghost: HTMLElement | null = null;
  let _items: HTMLElement[] = [];

  function refreshItems(): void {
    _items = Array.from(container.querySelectorAll(itemsSelector)) as HTMLElement[];
  }

  refreshItems();

  function getItemIndex(el: HTMLElement): number {
    return _items.indexOf(el);
  }

  function getClosestIndex(y: number): number {
    let closest = 0;
    let closestDist = Infinity;
    _items.forEach((item, i) => {
      if (item === _draggedItem) return;
      const rect = item.getBoundingClientRect();
      const dist = Math.abs(y - (rect.top + rect.height / 2));
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    return closest;
  }

  function startSort(item: HTMLElement, clientX: number, clientY: number): void {
    if (_disabled) return;
    _draggedItem = item;
    _draggedIndex = getItemIndex(item);

    onDragStart?.(item, _draggedIndex);

    // Create placeholder
    _placeholder = document.createElement("div");
    _placeholder.className = "sort-placeholder";
    _placeholder.style.cssText =
      `height:${item.offsetHeight}px;background:#f0f9ff;border:2px dashed #93c5fd;` +
      "border-radius:4px;transition:none;";
    item.parentNode!.insertBefore(_placeholder, item);

    // Create ghost
    _ghost = item.cloneNode(true) as HTMLElement;
    _ghost.className += " sort-ghost";
    _ghost.style.cssText =
      "position:fixed;pointer-events:none;z-index:1001;" +
      `opacity:${ghostOpacity};margin:0;width:${item.offsetWidth}px;` +
      "box-shadow:0 8px 24px rgba(0,0,0,0.15);";
    _ghost.style.left = `${clientX - item.offsetWidth / 2}px`;
    _ghost.style.top = `${clientY - 8}px`;
    document.body.appendChild(_ghost);

    item.style.opacity = "0";
  }

  function moveSort(clientX: number, clientY: number): void {
    if (!_draggedItem || !_ghost || !_placeholder) return;

    _ghost.style.left = `${clientX - _draggedItem.offsetWidth / 2}px`;
    _ghost.style.top = `${clientY - 8}px`;

    const containerRect = container.getBoundingClientRect();
    const relativeY = clientY - containerRect.top;
    const newIndex = getClosestIndex(relativeY);

    if (newIndex !== _draggedIndex && newIndex >= 0 && newIndex < _items.length) {
      // Swap placeholder position
      const targetItem = _items[newIndex];
      if (newIndex > _draggedIndex) {
        targetItem.after(_placeholder!);
      } else {
        targetItem.before(_placeholder!);
      }
      _draggedIndex = newIndex;
    }
  }

  function endSort(): void {
    if (!_draggedItem || !_ghost || !_placeholder) return;

    // Place item at placeholder position
    _placeholder.replaceWith(_draggedItem);
    _draggedItem.style.opacity = "";
    _draggedItem.style.transition = `transform ${animationDuration}ms ease`;

    const oldIndex = getItemIndex(_draggedItem);
    refreshItems();
    const newIndex = getItemIndex(_draggedItem);

    if (oldIndex !== newIndex) {
      onReorder?.(oldIndex, newIndex, _draggedItem);
    }

    setTimeout(() => {
      _draggedItem!.style.transition = "";
    }, animationDuration);

    _ghost.remove();
    _ghost = null;
    _placeholder = null;
    _draggedItem = null;

    onDragEnd?.(_draggedItem!);
  }

  // Bind events to container
  container.addEventListener("mousedown", (e) => {
    const item = (e.target as HTMLElement).closest(itemsSelector) as HTMLElement | null;
    if (!item) return;
    const handle = handleSelector ? (e.target as HTMLElement).closest(handleSelector) : item;
    if (handleSelector && !handle) return;
    startSort(item, e.clientX, e.clientY);
  });

  container.addEventListener("touchstart", (e) => {
    const item = (e.target as HTMLElement).closest(itemsSelector) as HTMLElement | null;
    if (!item) return;
    const handle = handleSelector ? (e.target as HTMLElement).closest(handleSelector) : item;
    if (handleSelector && !handle) return;
    startSort(item, e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  document.addEventListener("mousemove", (e) => { if (_draggedItem) moveSort(e.clientX, e.clientY); });
  document.addEventListener("touchmove", (e) => { if (_draggedItem) { e.preventDefault(); moveSort(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: false });
  document.addEventListener("mouseup", () => { if (_draggedItem) endSort(); });
  document.addEventListener("touchend", () => { if (_draggedItem) endSort(); });

  // Observe for dynamic children
  const observer = new MutationObserver(refreshItems);
  observer.observe(container, { childList: true });

  const instance: SortableInstance = {
    el: container,

    getOrder() {
      refreshItems();
      return [..._items];
    },

    setDisabled(d: boolean) { _disabled = d; },

    destroy() {
      observer.disconnect();
    },
  };

  return instance;
}

// --- Internal Helpers ---

function checkDropZones(x: number, y: number): void {
  for (const dz of activeDropZones) {
    const rect = dz.target.getBoundingClientRect();
    const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (inside) {
      dz.target.classList.add((dz as unknown as { highlightClass?: string }).highlightClass ?? "drop-active");
    } else {
      dz.target.classList.remove((dz as unknown as { highlightClass?: string }).highlightClass ?? "drop-active");
    }
  }
}

function clearAllDropHighlights(): void {
  for (const dz of activeDropZones) {
    dz.target.classList.remove("drop-active");
  }
}

function tryDrop(event: DragEvent): boolean {
  for (const dz of activeDropZones) {
    const rect = dz.target.getBoundingClientRect();
    if (event.x >= rect.left && event.x <= rect.right &&
        event.y >= rect.top && event.y <= rect.bottom) {
      // Call the drop handler
      (dz as unknown as { onDrop?: (d: DragData, e: DragEvent) => void }).onDrop?.(event.data!, event);
      return true;
    }
  }
  return false;
}
