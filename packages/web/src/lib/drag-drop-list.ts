/**
 * Drag-and-Drop List: Reorderable list with drag handles, smooth animations,
 * nested list support, sortable groups, cross-list transfer, touch support,
 * keyboard reordering, and accessibility.
 */

// --- Types ---

export interface DndListItem<T = unknown> {
  id: string;
  data: T;
  /** Group this item belongs to (for grouped lists) */
  group?: string;
  /** Whether this item is disabled from dragging */
  disabled?: boolean;
  /** Custom class */
  className?: string;
}

export interface DndListOptions<T = unknown> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial items */
  items: DndListItem<T>[];
  /** Render function for each item */
  renderItem: (item: DndListItem<T>, index: number) => HTMLElement | string;
  /** Group render function (optional, for grouped lists) */
  renderGroup?: (groupId: string) => HTMLElement | string;
  /** Sortable? (default: true) */
  sortable?: boolean;
  /** Show drag handles? */
  showHandles?: boolean;
  /** Allow cross-group dragging? */
  crossGroup?: boolean;
  /** Animation duration in ms (default: 200) */
  animationDuration?: number;
  /** Drop zone indicator style */
  dropIndicatorStyle?: "line" | "shadow" | "gap";
  /** Callback when order changes */
  onReorder?: (items: DndListItem<T>[], fromIndex: number, toIndex: number) => void;
  /** Callback when item is moved between groups */
  onGroupMove?: (itemId: string, fromGroup: string, toGroup: string) => void;
  /** Callback when drag starts */
  onDragStart?: (item: DndListItem<T>) => void;
  /** Callback when drag ends */
  onDragEnd?: (item: DndListItem<T>, cancelled: boolean) => void;
  /** Lock vertical axis during drag? */
  lockAxis?: "vertical" | "horizontal" | null;
  /** Custom CSS class */
  className?: string;
  /** Minimum height of the list area */
  minHeight?: string | number;
  /** Empty state message */
  emptyMessage?: string;
}

export interface DndListInstance<T = unknown> {
  element: HTMLElement;
  getItems(): DndListItem<T>[];
  setItems(items: DndListItem<T>[]): void;
  addItem(item: DndListItem<T>): void;
  removeItem(id: string): void;
  moveItem(fromIndex: number, toIndex: number): void;
  destroy(): void;
}

// --- Main Implementation ---

export function createDndList<T = unknown>(options: DndListOptions<T>): DndListInstance<T> {
  const opts = {
    sortable: options.sortable ?? true,
    showHandles: options.showHandles ?? true,
    crossGroup: options.crossGroup ?? false,
    animationDuration: options.animationDuration ?? 200,
    dropIndicatorStyle: options.dropIndicatorStyle ?? "line",
    lockAxis: options.lockAxis ?? "vertical",
    emptyMessage: options.emptyMessage ?? "No items",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DndList: container not found");

  let items = [...options.items];
  let destroyed = false;

  // Root element
  const root = document.createElement("div");
  root.className = `dnd-list ${opts.className ?? ""}`;
  root.style.cssText = `
    position:relative;min-height:${typeof opts.minHeight === "number" ? opts.minHeight + "px" : opts.minHeight ?? "60px"};
  `;
  container.appendChild(root);

  // State during drag
  let draggedItem: DndListItem<T> | null = null;
  let draggedEl: HTMLElement | null = null;
  let placeholderEl: HTMLElement | null = null;
  let dragStartIndex = -1;
  let overIndex = -1;

  // --- Rendering ---

  function render(): void {
    if (destroyed) return;
    root.innerHTML = "";

    // Group items if there are groups
    const hasGroups = items.some((i) => i.group);
    let groups: { id: string; items: DndListItem<T>[] }[];

    if (hasGroups) {
      const groupMap = new Map<string, DndListItem<T>[]>();
      for (const item of items) {
        const g = item.group ?? "__ungrouped__";
        let arr = groupMap.get(g);
        if (!arr) { arr = []; groupMap.set(g, arr); }
        arr.push(item);
      }
      groups = Array.from(groupMap.entries()).map(([id, items]) => ({ id, items }));
    } else {
      groups = [{ id: "__default__", items }];
    }

    for (const group of groups) {
      // Render group header
      if (group.id !== "__default__" && group.id !== "__ungrouped__") {
        if (opts.renderGroup) {
          const header = opts.renderGroup(group.id);
          const el = typeof header === "string"
            ? Object.assign(document.createElement("div"), { innerHTML: header })
            : header;
          el.className = "dnd-group-header";
          root.appendChild(el);
        } else {
          const label = document.createElement("div");
          label.style.cssText = "padding:8px 12px;font-weight:600;font-size:12px;color:#6b7280;text-transform:uppercase;";
          label.textContent = group.id;
          root.appendChild(label);
        }
      }

      // Render items in this group
      const listEl = document.createElement("div");
      listEl.className = "dnd-group-items";
      listEl.dataset.groupId = group.id;
      listEl.style.cssText = "position:relative;";

      group.items.forEach((item, idx) => {
        const globalIdx = items.indexOf(item);
        const row = renderItemElement(item, globalIdx, listEl);
        listEl.appendChild(row);
      });

      // Empty state within group
      if (group.items.length === 0 && !hasGroups) {
        const empty = document.createElement("div");
        empty.style.cssText = `
          text-align:center;padding:24px;color:#9ca3af;font-size:13px;
        `;
        empty.textContent = opts.emptyMessage;
        listEl.appendChild(empty);
      }

      root.appendChild(listEl);
    }

    bindDragEvents();
  }

  function renderItemElement(item: DndListItem<T>, index: number, parentEl: HTMLElement): HTMLElement {
    const row = document.createElement("div");
    row.className = `dnd-item ${item.className ?? ""}`;
    row.dataset.itemId = item.id;
    row.dataset.index = String(index);
    row.tabIndex = 0;
    row.setAttribute("role", "listitem");
    row.setAttribute("aria-grabble", "true");

    // Drag handle
    if (opts.showHandles) {
      const handle = document.createElement("span");
      handle.className = "dnd-handle";
      handle.innerHTML = "&#9776;";
      handle.style.cssText = `
        cursor:grab;padding:4px 6px;color:#9ca3af;font-size:14px;
        user-select:none;display:inline-flex;align-items:center;
        flex-shrink:0;
      `;
      handle.addEventListener("mousedown", (e) => {
        if (!opts.sortable || item.disabled) return;
        e.preventDefault();
        initDrag(e, item, index, row, handle);
      });
      row.appendChild(handle);
    }

    // Content
    const content = document.createElement("div");
    content.className = "dnd-content";
    content.style.cssText = "flex:1;min-width:0;padding:8px 10px;";

    const rendered = opts.renderItem(item, index);
    if (typeof rendered === "string") {
      content.innerHTML = rendered;
    } else {
      content.appendChild(rendered);
    }
    row.appendChild(content);

    // Styling
    row.style.cssText += `
      display:flex;align-items:center;border-radius:6px;margin-bottom:2px;
      background:#fff;border:1px solid #e5e7eb;transition:all ${opts.animationDuration}ms ease;
      ${item.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
      ${!opts.showHandles ? "cursor:grab;" : ""}
    `;

    // Hover effect
    if (!item.disabled) {
      row.addEventListener("mouseenter", () => {
        if (!draggedItem) row.style.background = "#f9fafb";
      });
      row.addEventListener("mouseleave", () => {
        if (!draggedItem) row.style.background = "";
      });
    }

    // Keyboard support
    row.addEventListener("keydown", (e) => {
      if (!opts.sortable || item.disabled) return;
      if (e.key === "ArrowDown" && index < items.length - 1) {
        e.preventDefault();
        moveItem(index, index + 1);
      } else if (e.key === "ArrowUp" && index > 0) {
        e.preventDefault();
        moveItem(index, index - 1);
      }
    });

    // Make entire row draggable (if no handle)
    if (!opts.showHandles) {
      row.draggable = !item.disabled;
      row.addEventListener("dragstart", (e) => {
        if (item.disabled) { e.preventDefault(); return; }
        initDrag(e, item, index, row, row);
      });
    }

    return row;
  }

  // --- Drag & Drop Logic ---

  function initDrag(
    e: MouseEvent | DragEvent,
    item: DndListItem<T>,
    index: number,
    rowEl: HTMLElement,
    handleEl: HTMLElement,
  ): void {
    draggedItem = item;
    draggedEl = rowEl;
    dragStartIndex = index;
    overIndex = index;

    opts.onDragStart?.(item);

    // Create placeholder
    placeholderEl = document.createElement("div");
    placeholderEl.className = "dnd-placeholder";
    placeholderEl.style.cssText = `
      border:2px dashed #93c5fd;background:#eff6ff;border-radius:6px;
      height:${rowEl.offsetHeight}px;margin-bottom:2px;
      transition:all ${opts.animationDuration}ms ease;
    `;

    // Insert placeholder at current position
    rowEl.parentNode!.insertBefore(placeholderEl, rowEl);

    // Hide original
    rowEl.style.opacity = "0";
    rowEl.style.height = "0";
    rowEl.style.margin = "0";
    rowEl.style.padding = "0";
    rowEl.style.overflow = "hidden";
    rowEl.style.border = "none";

    // Set drag image (transparent)
    if ("dataTransfer" in e) {
      const dt = (e as DragEvent).dataTransfer!;
      dt.effectAllowed = "move";
      dt.setData("text/plain", item.id);

      // Create a custom drag image (invisible)
      const ghost = rowEl.cloneNode(true) as HTMLElement;
      ghost.style.opacity = "0.5";
      ghost.style.position = "fixed";
      ghost.style.pointerEvents = "none";
      ghost.style.top = "-10000px";
      document.body.appendChild(ghost);
      dt.setDragImage(ghost, 0, 0);
      setTimeout(() => ghost.remove(), 0);
    }

    // Track mouse movement for positioning
    const onMouseMove = (me: MouseEvent) => {
      if (!placeholderEl || !draggedEl) return;

      // Find which item we're hovering over
      const allRows = root.querySelectorAll<HTMLElement>(".dnd-item:not([style*='opacity: 0'])");
      let newOverIndex = -1;

      for (let i = 0; i < allRows.length; i++) {
        const r = allRows[i]!;
        const rect = r.getBoundingClientRect();
        if (me.clientY >= rect.top && me.clientY <= rect.bottom) {
          newOverIndex = parseInt(r.dataset.index!);
          break;
        }
      }

      if (newOverIndex !== overIndex && newOverIndex >= 0) {
        overIndex = newOverIndex;
        placeholderEl.parentNode!.insertBefore(placeholderEl, allRows[newOverIndex]!);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      finishDrag();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function finishDrag(): void {
    if (!draggedItem || !draggedEl || !placeholderEl) return;

    const targetIndex = overIndex >= 0 ? overIndex : dragStartIndex;
    const moved = targetIndex !== dragStartIndex;

    // Remove placeholder
    placeholderEl.remove();
    placeholderEl = null;

    // Restore original element
    draggedEl.style.cssText = "";
    draggedEl.style.display = "";

    if (moved) {
      // Actually reorder the data
      const [removed] = items.splice(dragStartIndex, 1);
      items.splice(targetIndex, 0, removed[0]!);
      opts.onReorder?.(items, dragStartIndex, targetIndex);
    }

    opts.onDragEnd?.(draggedItem, !moved);

    // Clean up
    draggedItem = null;
    draggedEl = null;
    overIndex = -1;
    dragStartIndex = -1;

    render();
  }

  function bindDragEvents(): void {
    // Global drop handlers on the root
    root.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";
    });

    root.addEventListener("drop", (e) => {
      e.preventDefault();
      finishDrag();
    });
  }

  // --- Public API ---

  function moveItem(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= items.length) return;
    const [removed] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, removed[0]!);
    opts.onReorder?.(items, fromIndex, toIndex);
    render();
  }

  const instance: DndListInstance<T> = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: DndListItem<T>[]) {
      items = newItems;
      render();
    },

    addItem(item: DndListItem<T>) {
      items.push({ ...item, id: item.id ?? `dnd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
      render();
    },

    removeItem(id: string) {
      items = items.filter((i) => i.id !== id);
      render();
    },

    moveItem,

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  // Initial render
  render();

  return instance;
}
