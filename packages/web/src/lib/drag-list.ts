/**
 * Drag-to-Reorder List: Sortable list with drag-and-drop reordering,
 * visual feedback during drag, animation on drop, handle-based or full-row dragging,
 * grouped lists, constraints, and accessibility.
 */

// --- Types ---

export interface DragListItem<T = unknown> {
  /** Unique ID */
  id: string;
  /** Display content (string or render function) */
  content: string | ((item: T) => HTMLElement);
  /** Disabled from dragging? */
  disabled?: boolean;
  /** Locked in place? */
  locked?: boolean;
  /** Group key for grouping */
  group?: string;
  /** Additional data payload */
  data?: T;
}

export interface DragListOptions<T = unknown> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** List items */
  items: DragListItem<T>[];
  /** Use drag handle instead of full-row drag? */
  useHandle?: boolean;
  /** Handle selector (default: ".drag-handle") */
  handleSelector?: string;
  /** Animation duration in ms (0 = none) */
  animationDuration?: number;
  /** Show drop indicator line? */
  showDropIndicator?: boolean;
  /** Drop indicator color */
  dropIndicatorColor?: string;
  /** Allow cross-group dragging? */
  crossGroupDrag?: boolean;
  /** Constrain to parent bounds? */
  constrainToParent?: boolean;
  /** Ghost/placeholder opacity during drag */
  ghostOpacity?: number;
  /** Class name for dragged item */
  draggingClass?: string;
  /** Class name for drop target */
  dropTargetClass?: string;
  /** Callback when order changes */
  onReorder?: (newOrder: DragListItem<T>[], movedItem: DragListItem<T>, oldIndex: number, newIndex: number) => void;
  /** Callback when drag starts */
  onDragStart?: (item: DragListItem<T>, index: number) => void;
  /** Callback when drag ends */
  onDragEnd?: (item: DragListItem<T>, index: number, cancelled: boolean) => void;
  /** Custom renderer for list item */
  renderItem?: (item: DragListItem<T>, index: number) => HTMLElement;
  /** Custom CSS class */
  className?: string;
  /** Orientation */
  orientation?: "vertical" | "horizontal";
  /** Gap between items (px) */
  gap?: number;
}

export interface DragListInstance<T = unknown> {
  element: HTMLElement;
  /** Get current items in order */
  getItems: () => DragListItem<T>[];
  /** Set items (re-render) */
  setItems: (items: DragListItem<T>[]) => void;
  /** Move item programmatically */
  moveItem: (fromIndex: number, toIndex: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function createDragList<T = unknown>(options: DragListOptions<T>): DragListInstance<T> {
  const opts = {
    useHandle: options.useHandle ?? false,
    handleSelector: options.handleSelector ?? ".drag-handle",
    animationDuration: options.animationDuration ?? 200,
    showDropIndicator: options.showDropIndicator ?? true,
    dropIndicatorColor: options.dropIndicatorColor ?? "#6366f1",
    crossGroupDrag: options.crossGroupDrag ?? true,
    constrainToParent: options.constrainToParent ?? false,
    ghostOpacity: options.ghostOpacity ?? 0.4,
    draggingClass: options.draggingClass ?? "dragging",
    dropTargetClass: options.dropTargetClass ?? "drop-target",
    orientation: options.orientation ?? "vertical",
    gap: options.gap ?? 4,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DragList: container not found");

  let items: DragListItem<T>[] = [...options.items];
  let destroyed = false;

  // Root list container
  const root = document.createElement("div");
  root.className = `drag-list ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:${opts.orientation === "horizontal" ? "row" : "column"};
    gap:${opts.gap}px;position:relative;width:100%;
  `;
  container.appendChild(root);

  // Drop indicator line
  let dropIndicator: HTMLElement | null = null;
  if (opts.showDropIndicator) {
    dropIndicator = document.createElement("div");
    dropIndicator.className = "dl-drop-indicator";
    dropIndicator.style.cssText = opts.orientation === "vertical"
      ? `height:2px;background:${opts.dropIndicatorColor};border-radius:1px;display:none;position:relative;margin:2px 0;transition:none;`
      : `width:2px;background:${opts.dropIndicatorColor};border-radius:1px;display:none;position:relative;margin:0 2px;transition:none;`;
    root.appendChild(dropIndicator);
  }

  // State
  let isDragging = false;
  let draggedItem: DragListItem<T> | null = null;
  let draggedIndex = -1;
  let ghostEl: HTMLElement | null = null;
  let placeholderEl: HTMLElement | null = null;
  let dropTargetIndex = -1;

  // Item elements map
  const itemEls: Map<string, HTMLElement> = new Map();

  // --- Render ---

  function render(): void {
    root.innerHTML = "";
    itemEls.clear();

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const el = createItemElement(item, i);
      root.appendChild(el);
      itemEls.set(item.id, el);
    }
  }

  function createItemElement(item: DragListItem<T>, index: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "dl-item";
    row.dataset.id = item.id;
    row.dataset.index = String(index);
    row.style.cssText = `
      display:flex;align-items:center;padding:8px 12px;border-radius:6px;
      background:#fff;border:1px solid #e5e7eb;cursor:${(item.disabled || item.locked) ? "default" : "grab"};
      transition:transform ${opts.animationDuration}ms ease, box-shadow ${opts.animationDuration}ms ease, opacity ${opts.animationDuration}ms ease;
      user-select:none;${opts.orientation === "horizontal" ? "min-width:100px;" : ""}
      ${item.disabled ? "opacity:0.5;" : ""}${item.locked ? "opacity:0.7;cursor:not-allowed;" : ""}
    `;

    // Custom or default rendering
    if (opts.renderItem) {
      const customContent = opts.renderItem(item, index);
      row.appendChild(customContent);
    } else if (typeof item.content === "function") {
      row.appendChild((item.content as (item: T) => HTMLElement)(item.data!));
    } else {
      const label = document.createElement("span");
      label.textContent = item.content as string;
      label.style.cssText = "flex:1;font-size:13px;color:#374151;";
      row.appendChild(label);

      // Drag handle
      if (opts.useHandle && !item.disabled && !item.locked) {
        const handle = document.createElement("span");
        handle.className = "drag-handle";
        handle.innerHTML = "&#9776;";
        handle.style.cssText = `
          margin-right:8px;color:#9ca3af;cursor:grab;font-size:14px;
          padding:2px 4px;border-radius:3px;display:inline-flex;
          transition:background 0.15s;
        `;
        handle.addEventListener("mouseenter", () => { handle.style.background = "#f3f4f6"; });
        handle.addEventListener("mouseleave", () => { handle.style.background = ""; });
        row.insertBefore(handle, label);
      }
    }

    // Drag events
    if (!item.disabled && !item.locked) {
      row.setAttribute("draggable", "true");

      row.addEventListener("dragstart", (e: DragEvent) => handleDragStart(e, item, index));
      row.addEventListener("dragend", handleDragEnd);
      row.addEventListener("dragenter", (e: DragEvent) => handleDragEnter(e, index));
      row.addEventListener("dragover", (e: DragEvent) => handleDragOver(e));
      row.addEventListener("dragleave", handleDragLeave);
      row.addEventListener("drop", (e: DragEvent) => handleDrop(e, index));

      // Also support pointer-based DnD as fallback
      row.addEventListener("pointerdown", (e: PointerEvent) => {
        if (opts.useHandle) {
          const target = e.target as HTMLElement;
          if (!target.closest(opts.handleSelector)) return;
        }
        handlePointerDown(e, item, index, row);
      });
    }

    return row;
  }

  // --- HTML5 Drag & Drop ---

  function handleDragStart(e: DragEvent, item: DragListItem<T>, index: number): void {
    isDragging = true;
    draggedItem = item;
    draggedIndex = index;

    e.dataTransfer!.effectAllowed = "move";
    e.dataTransfer!.setData("text/plain", item.id);

    row.classList.add(opts.draggingClass);
    row.style.opacity = String(opts.ghostOpacity);

    opts.onDragStart?.(item, index);
  }

  function handleDragEnd(_e: DragEvent): void {
    cleanup();
  }

  function handleDragEnter(_e: DragEvent, index: number): void {
    if (!isDragging || index === draggedIndex) return;
    dropTargetIndex = index;
    showDropIndicatorAt(index);
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
  }

  function handleDragLeave(): void {
    hideDropIndicator();
  }

  function handleDrop(_e: DragEvent, targetIndex: number): void {
    if (!isDragging || draggedItem === null) return;

    if (targetIndex !== draggedIndex) {
      reorder(draggedIndex, targetIndex);
    }

    cleanup();
  }

  // --- Pointer-based Fallback DnD ---

  function handlePointerDown(e: PointerEvent, item: DragListItem<T>, index: number, row: HTMLElement): void {
    if (e.button !== 0) return;

    isDragging = true;
    draggedItem = item;
    draggedIndex = index;

    const rect = row.getBoundingClientRect();

    // Create ghost element
    ghostEl = row.cloneNode(true) as HTMLElement;
    ghostEl.style.cssText = `
      position:fixed;z-index:9999;pointer-events:none;
      width:${rect.width}px;opacity:${opts.ghostOpacity};
      box-shadow:0 10px 30px rgba(0,0,0,0.15);margin:0;
      transform:rotate(2deg);border-radius:6px;
    `;
    document.body.appendChild(ghostEl);

    // Create placeholder
    placeholderEl = document.createElement("div");
    placeholderEl.className = "dl-placeholder";
    placeholderEl.style.cssText = `
      border:2px dashed #d1d5db;border-radius:6px;
      background:#f9fafb;${opts.orientation === "vertical" ? `min-height:${rect.height}px;` : `min-width:${rect.width}px;`}
    `;
    root.replaceChild(placeholderEl, row);

    // Position ghost at cursor
    updateGhostPosition(e.clientX, e.clientY);

    row.classList.add(opts.draggingClass);
    opts.onDragStart?.(item, index);

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isDragging || !ghostEl) return;
    updateGhostPosition(e.clientX, e.clientY);

    // Find drop target
    const rootRect = root.getBoundingClientRect();
    let targetIdx = -1;

    const children = Array.from(root.children).filter((el) =>
      el !== ghostEl && el !== dropIndicator && el !== placeholderEl
    );

    for (const child of children) {
      const childRect = child.getBoundingClientRect();
      if (opts.orientation === "vertical") {
        if (e.clientY < childRect.top + childRect.height / 2) {
          targetIdx = parseInt((child as HTMLElement).dataset.index!, 10);
          break;
        }
      } else {
        if (e.clientX < childRect.left + childRect.width / 2) {
          targetIdx = parseInt((child as HTMLElement).dataset.index!, 10);
          break;
        }
      }
    }

    if (targetIdx !== -1 && targetIdx !== dropTargetIndex && targetIdx !== draggedIndex) {
      dropTargetIndex = targetIdx;
      showDropIndicatorAt(targetIdx);
    }
  }

  function handlePointerUp(): void {
    if (!isDragging) return;

    if (dropTargetIndex !== -1 && dropTargetIndex !== draggedIndex && draggedItem !== null) {
      reorder(draggedIndex, dropTargetIndex);
    }

    cleanup();
  }

  function updateGhostPosition(x: number, y: number): void {
    if (!ghostEl) return;
    ghostEl.style.left = `${x - ghostEl.offsetWidth / 2}px`;
    ghostEl.style.top = `${y - ghostEl.offsetHeight / 2}px`;

    if (opts.constrainToParent) {
      const rootRect = root.getBoundingClientRect();
      const halfW = ghostEl.offsetWidth / 2;
      const halfH = ghostEl.offsetHeight / 2;
      ghostEl.style.left = `${Math.max(rootRect.left, Math.min(x, rootRect.right)) - halfW}px`;
      ghostEl.style.top = `${Math.max(rootRect.top, Math.min(y, rootRect.bottom)) - halfH}px`;
    }
  }

  // --- Reorder ---

  function reorder(fromIndex: number, toIndex: number): void {
    const movedItem = items[fromIndex]!;
    const newItems = [...items];
    newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    items = newItems;

    render();
    opts.onReorder?.(newItems, movedItem, fromIndex, toIndex);
  }

  // --- Drop Indicator ---

  function showDropIndicatorAt(index: number): void {
    if (!dropIndicator) return;
    hideDropIndicator();

    const children = Array.from(root.children);
    const targetChild = children.find((el) =>
      el !== dropIndicator && parseInt((el as HTMLElement).dataset.index ?? "-1", 10) === index
    );

    if (targetChild) {
      root.insertBefore(dropIndicator, targetChild);
      dropIndicator.style.display = "block";
    }
  }

  function hideDropIndicator(): void {
    if (dropIndicator) {
      dropIndicator.style.display = "none";
      if (dropIndicator.parentNode === root) root.removeChild(dropIndicator);
    }
  }

  // --- Cleanup ---

  function cleanup(): void {
    isDragging = false;
    dropTargetIndex = -1;
    hideDropIndicator();

    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }

    if (placeholderEl && placeholderEl.parentNode === root) {
      // Restore original row
      render();
      placeholderEl = null;
    }

    // Remove dragging class from all rows
    root.querySelectorAll(`.${opts.draggingClass}`).forEach((el) => {
      el.classList.remove(opts.draggingClass);
      (el as HTMLElement).style.opacity = "";
    });

    if (draggedItem) {
      opts.onDragEnd?.(draggedItem, draggedIndex, dropTargetIndex === -1);
    }

    draggedItem = null;
    draggedIndex = -1;

    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
  }

  // --- Instance ---

  const instance: DragListInstance<T> = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: DragListItem<T>[]) {
      items = [...newItems];
      render();
    },

    moveItem(fromIndex: number, toIndex: number) {
      if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return;
      reorder(fromIndex, toIndex);
    },

    destroy() {
      destroyed = true;
      root.innerHTML = "";
    },
  };

  // Initial render
  render();

  return instance;
}
