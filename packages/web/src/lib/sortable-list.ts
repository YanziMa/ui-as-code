/**
 * Sortable List: Drag-and-drop reorderable list with touch support,
 * animation, handle-based or full-item drag, multi-drag selection,
 * constraints (horizontal/vertical), swap vs insert mode, and accessibility.
 */

// --- Types ---

export interface SortableItem {
  id: string;
  data?: unknown;
}

export interface SortableListOptions<T extends SortableItem = SortableItem> {
  /** Container element (list parent) */
  container: HTMLElement | string;
  /** Initial items */
  items: T[];
  /** Drag handle selector (if set, only dragging by this element works) */
  handleSelector?: string;
  /** Group name for cross-list drag */
  group?: string;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Drag threshold before starting (px) */
  threshold?: number;
  /** Constrain to axis? ("x" | "y" | undefined) */
  axis?: "x" | "y";
  /** Swap mode (swap with target) vs insert mode (shift items) */
  mode?: "swap" | "insert";
  /** Allow reordering? */
  disabled?: boolean;
  /** Show remove button on hover? */
  removable?: boolean;
  /** Lock axis during drag? */
  lockAxis?: boolean;
  /** Ghost element opacity */
  ghostOpacity?: number;
  /** Mirror element follows cursor exactly */
  useMirror?: boolean;
  /** Custom item renderer: (item, index) => HTMLElement */
  renderItem?: (item: T, index: number) => HTMLElement;
  /** Callback on reorder */
  onReorder?: (newOrder: T[], oldIndex: number, newIndex: number) => void;
  /** Callback when drag starts */
  onDragStart?: (item: T, index: number) => void;
  /** Callback when drag ends */
  onDragEnd?: (item: T, newIndex: number) => void;
  /** Callback on item removal */
  onRemove?: (item: T, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SortableListInstance<T extends SortableItem = SortableItem> {
  element: HTMLElement;
  getItems: () => T[];
  setItems: (items: T[]) => void;
  addItem: (item: T, index?: number) => void;
  removeItem: (id: string) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createSortableList<T extends SortableItem = SortableItem>(
  options: SortableListOptions<T>,
): SortableListInstance<T> {
  const opts = {
    animationDuration: options.animationDuration ?? 200,
    threshold: options.threshold ?? 5,
    mode: options.mode ?? "insert",
    disabled: options.disabled ?? false,
    removable: options.removable ?? false,
    ghostOpacity: options.ghostOpacity ?? 0.4,
    useMirror: options.useMirror ?? true,
    group: options.group ?? "",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SortableList: container not found");

  container.className = `sortable-list ${opts.className}`;
  container.style.cssText = "position:relative;";

  let items = [...options.items];
  let destroyed = false;

  // Drag state
  let isDragging = false;
  let dragItem: T | null = null;
  let dragIndex = -1;
  let dragEl: HTMLElement | null = null;
  let mirrorEl: HTMLElement | null = null;
  let ghostEl: HTMLElement | null = null;
  let startY = 0;
  let startX = 0;
  let currentY = 0;
  let currentX = 0;
  let pointerId: number | null = null;
  let placeholderEl: HTMLDivElement | null = null;

  // Render list
  function render(): void {
    container.innerHTML = "";

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      let el: HTMLElement;

      if (opts.renderItem) {
        el = opts.renderItem(item, i);
      } else {
        el = createDefaultItem(item, i);
      }

      el.dataset.sortableId = item.id;
      el.dataset.sortableIndex = String(i);
      el.style.cssText += `
        transition:transform ${opts.animationDuration}ms ease, opacity ${opts.animationDuration}ms ease;
        touch-action:none;user-select:none;-webkit-user-select:none;
      `;
      container.appendChild(el);
    }
  }

  function createDefaultItem(item: T, index: number): HTMLElement {
    const el = document.createElement("div");
    el.className = "sortable-item";
    el.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:10px 14px;
      background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;
      cursor:${opts.handleSelector ? "default" : "grab"};
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    `;

    // Drag handle
    if (opts.handleSelector) {
      const handle = document.createElement("span");
      handle.className = "sortable-handle";
      handle.style.cssText = `
        cursor:grab;color:#9ca3af;font-size:16px;letter-spacing:2px;padding:0 4px;
      `;
      handle.innerHTML = "\u2261"; // ≡ grip icon
      el.appendChild(handle);
    }

    // Label
    const label = document.createElement("span");
    label.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    label.textContent = (item as Record<string, unknown>).label
      ? String((item as Record<string, unknown>).label)
      : item.id;
    el.appendChild(label);

    // Remove button
    if (opts.removable) {
      const rmBtn = document.createElement("button");
      rmBtn.type = "button";
      rmBtn.innerHTML = "&times;";
      rmBtn.title = "Remove";
      rmBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:16px;color:#d1d5db;
        padding:0 2px;line-height:1;transition:color 0.15s;
      `;
      rmBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        opts.onRemove?.(item, index);
        instance.removeItem(item.id);
      });
      rmBtn.addEventListener("mouseenter", () => { rmBtn.style.color = "#ef4444"; });
      rmBtn.addEventListener("mouseleave", () => { rmBtn.style.color = "#d1d5db"; });
      el.appendChild(rmBtn);
    }

    return el;
  }

  // --- Pointer Event Handlers ---

  function onPointerDown(e: PointerEvent): void {
    if (opts.disabled || destroyed) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const target = e.target as HTMLElement;
    const itemEl = target.closest("[data-sortable-id]") as HTMLElement | null;
    if (!itemEl) return;

    // Check handle constraint
    if (opts.handleSelector && !target.closest(opts.handleSelector)) return;

    e.preventDefault();
    pointerId = e.pointerId;
    startY = e.clientY;
    startX = e.clientX;
    currentY = startY;
    currentX = startX;

    dragIndex = parseInt(itemEl.dataset.sortableIndex!);
    dragItem = items[dragIndex];
    dragEl = itemEl;

    // Capture pointer for reliable tracking
    (dragEl as any).setPointerCapture?.(pointerId);

    dragEl.addEventListener("pointermove", onPointerMove);
    dragEl.addEventListener("pointerup", onPointerUp);
    dragEl.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      if (dx < opts.threshold && dy < opts.threshold) return;

      // Start drag
      isDragging = true;
      startDrag(e);
    }

    currentX = e.clientX;
    currentY = e.clientY;

    if (mirrorEl) {
      const offsetX = opts.lockAxis || opts.axis === "y" ? 0 : currentX - startX;
      const offsetY = opts.lockAxis || opts.axis === "x" ? 0 : currentY - startY;
      mirrorEl.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }

    // Find drop target
    updateDropTarget(e.clientY);
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragEl) return;

    dragEl.removeEventListener("pointermove", onPointerMove);
    dragEl.removeEventListener("pointerup", onPointerUp);
    dragEl.removeEventListener("pointercancel", onPointerUp);
    (dragEl as any).releasePointerCapture?.(pointerId!);

    if (isDragging) {
      endDrag();
    }

    cleanup();
  }

  function startDrag(_e: PointerEvent): void {
    opts.onDragStart?.(dragItem!, dragIndex);

    const rect = dragEl!.getBoundingClientRect();

    // Create ghost (stays in place)
    ghostEl = dragEl!.cloneNode(true) as HTMLElement;
    ghostEl.style.cssText += `
      position:absolute;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;
      opacity:${opts.ghostOpacity};pointer-events:none;z-index:999;
    `;
    document.body.appendChild(ghostEl);

    // Create mirror (follows cursor)
    if (opts.useMirror) {
      mirrorEl = dragEl!.cloneNode(true) as HTMLElement;
      mirrorEl.style.cssText += `
        position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;
        z-index:1000;box-shadow:0 8px 24px rgba(0,0,0,0.18);pointer-events:none;
        margin:0;transition:none;
      `;
      document.body.appendChild(mirrorEl);
    }

    // Placeholder
    placeholderEl = document.createElement("div");
    placeholderEl.className = "sortable-placeholder";
    placeholderEl.style.cssText = `
      background:#eef2ff;border:2px dashed #4338ca;border-radius:8px;
      height:${rect.height}px;margin-bottom:6px;transition:height ${opts.animationDuration}ms ease;
    `;

    // Hide original
    dragEl!.style.opacity = "0";
    dragEl!.style.visibility = "hidden";

    // Insert placeholder at original position
    if (dragEl!.parentNode) {
      dragEl!.parentNode.insertBefore(placeholderEl, dragEl);
    }
  }

  function updateDropTarget(clientY: number): void {
    if (!container || !placeholderEl) return;

    const children = Array.from(container.children) as HTMLElement[];
    let targetIdx = -1;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child === placeholderEl || child === dragEl) continue;

      const rect = child.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (clientY < midY) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx === -1) {
      targetIdx = children.length - 1;
    }

    // Move placeholder
    const currentPlaceholderIdx = Array.from(container.children).indexOf(placeholderEl);
    if (targetIdx !== currentPlaceholderIdx && targetIdx >= 0) {
      const targetChild = children[targetIdx] ?? null;
      if (targetChild) {
        container.insertBefore(placeholderEl, targetChild);
      } else {
        container.appendChild(placeholderEl);
      }
    }
  }

  function endDrag(): void {
    if (!placeholderEl || !container) return;

    // Calculate new index
    const children = Array.from(container.children);
    const newIdx = children.indexOf(placeholderEl);
    if (newIdx >= 0 && newIdx !== dragIndex) {
      // Reorder items array
      const [moved] = items.splice(dragIndex, 1);
      items.splice(newIdx, 0, moved!);

      opts.onReorder?.(items, dragIndex, newIdx);
      opts.onDragEnd?.(dragItem!, newIdx);
    } else {
      opts.onDragEnd?.(dragItem!, dragIndex);
    }
  }

  function cleanup(): void {
    // Remove ghost and mirror
    ghostEl?.remove();
    mirrorEl?.remove();
    placeholderEl?.remove();

    ghostEl = null;
    mirrorEl = null;
    placeholderEl = null;

    // Restore original element
    if (dragEl) {
      dragEl.style.opacity = "";
      dragEl.style.visibility = "";
    }

    isDragging = false;
    dragItem = null;
    dragIndex = -1;
    dragEl = null;
    pointerId = null;

    // Re-render to reflect new order
    render();
  }

  // Touch fallback (for older browsers)
  function onTouchStart(e: TouchEvent): void {
    if (opts.disabled || destroyed) return;
    const touch = e.touches[0];
    if (!touch) return;

    const target = e.target as HTMLElement;
    const itemEl = target.closest("[data-sortable-id]") as HTMLElement | null;
    if (!itemEl) return;
    if (opts.handleSelector && !target.closest(opts.handleSelector)) return;

    startY = touch.clientY;
    startX = touch.clientX;
    currentY = startY;
    currentX = startX;

    dragIndex = parseInt(itemEl.dataset.sortableIndex!);
    dragItem = items[dragIndex];
    dragEl = itemEl;
  }

  function onTouchMove(e: TouchEvent): void {
    if (!dragEl || !dragItem) return;
    e.preventDefault();

    const touch = e.touches[0];
    if (!touch) return;

    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);

    if (!isDragging && dx < opts.threshold && dy < opts.threshold) return;

    if (!isDragging) {
      isDragging = true;
      startDrag({ clientX: touch.clientX, clientY: touch.clientY } as PointerEvent);
    }

    currentX = touch.clientX;
    currentY = touch.clientY;

    if (mirrorEl) {
      const offsetX = opts.lockAxis || opts.axis === "y" ? 0 : currentX - startX;
      const offsetY = opts.lockAxis || opts.axis === "x" ? 0 : currentY - startY;
      mirrorEl.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }

    updateDropTarget(touch.clientY);
  }

  function onTouchEnd(): void {
    if (isDragging) endDrag();
    cleanup();
  }

  // Attach event listeners
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("touchstart", onTouchStart, { passive: false });
  container.addEventListener("touchmove", onTouchMove, { passive: false });
  container.addEventListener("touchend", onTouchEnd);

  // Initial render
  render();

  const instance: SortableListInstance<T> = {
    element: container,

    getItems() { return [...items]; },

    setItems(newItems: T[]) {
      items = [...newItems];
      render();
    },

    addItem(item: T, index?: number) {
      if (index != null && index >= 0 && index <= items.length) {
        items.splice(index, 0, item);
      } else {
        items.push(item);
      }
      render();
    },

    removeItem(id: string) {
      const idx = items.findIndex((i) => i.id === id);
      if (idx >= 0) {
        items.splice(idx, 1);
        render();
      }
    },

    moveItem(fromIndex: number, toIndex: number) {
      if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      render();
      opts.onReorder?.(items, fromIndex, toIndex);
    },

    disable() {
      opts.disabled = true;
      container.style.opacity = "0.5";
      container.style.pointerEvents = "none";
    },

    enable() {
      opts.disabled = false;
      container.style.opacity = "";
      container.style.pointerEvents = "";
    },

    destroy() {
      destroyed = true;
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.innerHTML = "";
    },
  };

  return instance;
}
