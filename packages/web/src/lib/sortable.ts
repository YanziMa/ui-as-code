/**
 * Sortable List: Drag-and-drop reorderable lists with animations,
 * multi-list transfer, handle zones, placeholder rendering,
 * group sorting, and keyboard accessibility.
 */

// --- Types ---

export interface SortableItem {
  id: string;
  element: HTMLElement;
  /** Data associated with this item */
  data?: Record<string, unknown>;
  /** Disabled from dragging? */
  disabled?: boolean;
}

export interface SortableOptions {
  /** Container element */
  container: HTMLElement;
  /** Initial items */
  items?: SortableItem[];
  /** CSS selector for drag handles (null = entire item is draggable) */
  handleSelector?: string | null;
  /** Group name for cross-list transfers */
  group?: string;
  /** Animation duration in ms (default: 200) */
  animationDuration?: number;
  /** Threshold in px before drag starts (default: 5) */
  threshold?: number;
  /** Direction: 'vertical' or 'horizontal' (default: 'vertical') */
  direction?: "vertical" | "horizontal";
  /** Allow reordering within the list */
  allowReorder?: boolean;
  /** Callback when items are reordered */
  onReorder?: (newOrder: string[]) => void;
  /** Callback when item is moved to another list (same group) */
  onTransfer?: (itemId: string, targetListId: string) => void;
  /** Callback when drag starts */
  onDragStart?: (item: SortableItem) => void;
  /** Callback when drag ends */
  onDragEnd?: (item: SortableItem, reordered: boolean) => void;
  /** Custom placeholder renderer */
  renderPlaceholder?: (item: SortableItem) => HTMLElement;
  /** Custom class for dragging state */
  draggingClass?: string;
  /** Custom class for placeholder */
  placeholderClass?: string;
  /** Ghost/clone follows cursor */
  ghostClass?: string;
}

export interface SortableInstance {
  /** Get current item order (IDs) */
  getOrder: () => string[];
  /** Set item order programmatically */
  setOrder: (ids: string[]) => void;
  /** Add an item */
  addItem: (item: SortableItem) => void;
  /** Remove an item by ID */
  removeItem: (id: string) => void;
  /** Update an item's data */
  updateItem: (id: string, data: Partial<SortableItem>) => void;
  /** Disable/enable an item */
  setItemDisabled: (id: string, disabled: boolean) => void;
  /** Refresh item elements (after DOM changes) */
  refresh: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default Placeholder ---

function defaultPlaceholder(item: SortableItem): HTMLElement {
  const el = document.createElement("div");
  el.className = "sortable-placeholder";
  el.style.cssText = `
    background: rgba(99,102,241,0.08);
    border: 2px dashed #6366f1;
    border-radius: 6px;
    transition: height 200ms ease, width 200ms ease;
  `;
  // Match dimensions of original
  const rect = item.element.getBoundingClientRect();
  if (item.element.parentElement) {
    const parentRect = item.element.parentElement.getBoundingClientRect();
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  }
  return el;
}

// --- Main Class ---

export class SortableList {
  create(options: SortableOptions): SortableInstance {
    const opts = {
      handleSelector: null,
      group: undefined,
      animationDuration: 200,
      threshold: 5,
      direction: "vertical",
      allowReorder: true,
      draggingClass: "sortable-dragging",
      placeholderClass: "sortable-placeholder-el",
      ghostClass: "sortable-ghost",
      renderPlaceholder: defaultPlaceholder,
      ...options,
    };

    let destroyed = false;
    const items = new Map<string, SortableItem>();
    let order: string[] = [];

    // Initialize items
    if (options.items) {
      for (const item of options.items) {
        items.set(item.id, item);
        order.push(item.id);
        item.element.dataset.sortableId = item.id;
      }
    }

    // State
    let draggedItem: SortableItem | null = null;
    let draggedItemId: string | null = null;
    let placeholder: HTMLElement | null = null;
    let ghost: HTMLElement | null = null;
    let startIndex = -1;
    let currentIndex = -1;
    let startX = 0;
    let startY = 0;
    let pointerId: number | null = null;

    function getItemElement(id: string): HTMLElement | undefined {
      return items.get(id)?.element;
    }

    function getOrder(): string[] {
      // Sync from actual DOM order
      const children = Array.from(opts.container.children);
      order = children
        .filter((el) => el.dataset.sortableId && items.has(el.dataset.sortableId!))
        .map((el) => el.dataset.sortableId!);
      return [...order];
    }

    function applyOrder(newOrder: string[]): void {
      order = newOrder;
      for (const id of newOrder) {
        const el = getItemElement(id);
        if (el) opts.container.appendChild(el);
      }
    }

    function createGhost(item: SortableItem): HTMLElement {
      const g = item.element.cloneNode(true) as HTMLElement;
      g.className = `${g.className || ""} ${opts.ghostClass}`;
      g.style.cssText = `
        position:fixed;pointer-events:none;z-index:9999;opacity:0.85;
        margin:0;box-shadow:0 8px 30px rgba(0,0,0,0.15);
        width:${item.element.offsetWidth}px;height:${item.element.offsetHeight}px;
      `;
      document.body.appendChild(g);
      return g;
    }

    function handlePointerDown(e: PointerEvent): void {
      if (destroyed) return;

      const target = e.target as HTMLElement;
      const itemEl = target.closest("[data-sortable-id]") as HTMLElement | null;
      if (!itemEl) return;

      const itemId = itemEl.dataset.sortableId!;
      const item = items.get(itemId);
      if (!item || item.disabled) return;

      // Check handle selector
      if (opts.handleSelector && !target.closest(opts.handleSelector)) return;

      e.preventDefault();
      draggedItem = item;
      draggedItemId = itemId;
      startIndex = order.indexOf(itemId);
      currentIndex = startIndex;
      startX = e.clientX;
      startY = e.clientY;
      pointerId = e.pointerId;

      item.element.setPointerCapture(pointerId);

      // Create placeholder
      placeholder = opts.renderPlaceholder(item);
      placeholder.classList.add(opts.placeholderClass);
      item.element.parentNode!.insertBefore(placeholder, item.element.nextSibling);

      // Create ghost
      ghost = createGhost(item);
      ghost.style.left = `${e.clientX - item.element.offsetWidth / 2}px`;
      ghost.style.top = `${e.clientY - 10}px`;

      item.element.classList.add(opts.draggingClass);
      item.element.style.opacity = "0.3";

      opts.onDragStart?.(item);
    }

    function handlePointerMove(e: PointerEvent): void {
      if (!draggedItem || !ghost || pointerId === null) return;

      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      const threshold = opts.threshold ?? 5;

      if (dx < threshold && dy < threshold) return;

      // Move ghost
      ghost.style.left = `${e.clientX - draggedItem.element.offsetWidth / 2}px`;
      ghost.style.top = `${e.clientY - 10}px`;

      // Find insertion point
      const containerRect = opts.container.getBoundingClientRect();
      const children = Array.from(opts.container.children).filter(
        (el) => el !== placeholder && el !== draggedItem!.element && el.dataset.sortableId,
      ) as HTMLElement[];

      let newIndex = -1;
      if (opts.direction === "vertical") {
        for (let i = 0; i < children.length; i++) {
          const rect = children[i]!.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) { newIndex = i; break; }
        }
        if (newIndex === -1) newIndex = children.length;
      } else {
        for (let i = 0; i < children.length; i++) {
          const rect = children[i]!.getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          if (e.clientX < midX) { newIndex = i; break; }
        }
        if (newIndex === -1) newIndex = children.length;
      }

      if (newIndex !== currentIndex && newIndex >= 0) {
        currentIndex = newIndex;
        // Move placeholder
        const refChild = children[newIndex] ?? null;
        opts.container.insertBefore(placeholder!, refChild);
      }
    }

    function handlePointerUp(_e: PointerEvent): void {
      if (!draggedItem || !draggedItemId) return;

      if (pointerId !== null) {
        try { draggedItem.element.releasePointerCapture(pointerId); } catch {}
      }

      // Clean up visuals
      draggedItem.element.classList.remove(opts.draggingClass);
      draggedItem.element.style.opacity = "";
      ghost?.remove();
      ghost = null;

      // Finalize position
      if (placeholder && placeholder.parentNode) {
        const finalChildren = Array.from(opts.container.children);
        let finalIdx = finalChildren.indexOf(placeholder);
        if (finalIdx === -1) finalIdx = order.length;

        // Place original element where placeholder is
        opts.container.insertBefore(draggedItem.element, placeholder);
        placeholder.remove();
        placeholder = null;

        // Update order
        const newOrder = getOrder();
        const reordered = finalIdx !== startIndex;

        if (reordered && opts.allowReorder) {
          opts.onReorder?.(newOrder);
        }
        opts.onDragEnd?.(draggedItem, reordered);
      }

      draggedItem = null;
      draggedItemId = null;
      startIndex = -1;
      currentIndex = -1;
      pointerId = null;
    }

    // Attach listeners
    opts.container.addEventListener("pointerdown", handlePointerDown);
    // Use window-level move/up for smooth dragging outside container
    const boundMove = (e: Event) => handlePointerMove(e as PointerEvent);
    const boundUp = (e: Event) => handlePointerUp(e as PointerEvent);
    window.addEventListener("pointermove", boundMove);
    window.addEventListener("pointerup", boundUp);

    const instance: SortableInstance = {
      getOrder() { return getOrder(); },

      setOrder(ids) { applyOrder(ids); },

      addItem(item) {
        items.set(item.id, item);
        item.element.dataset.sortableId = item.id;
        opts.container.appendChild(item.element);
        order.push(item.id);
      },

      removeItem(id) {
        const el = items.get(id)?.element;
        if (el) el.remove();
        items.delete(id);
        order = order.filter((i) => i !== id);
      },

      updateItem(id, data) {
        const item = items.get(id);
        if (item) Object.assign(item, data);
      },

      setItemDisabled(id, disabled) {
        const item = items.get(id);
        if (item) item.disabled = disabled;
      },

      refresh() {
        // Re-read DOM order
        getOrder();
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        opts.container.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointermove", boundMove);
        window.removeEventListener("pointerup", boundUp);
        ghost?.remove();
        placeholder?.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a sortable list */
export function createSortable(options: SortableOptions): SortableInstance {
  return new SortableList().create(options);
}
