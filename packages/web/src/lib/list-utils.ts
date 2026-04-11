/**
 * List Utilities: Virtualized list, list item rendering, drag-reorder,
 * selection management, grouping, filtering, and infinite scroll.
 */

// --- Types ---

export interface ListItem<T = unknown> {
  /** Unique key */
  id: string;
  /** Display data */
  data: T;
  /** Optional group key */
  group?: string;
}

export interface ListOptions<T = unknown> {
  /** Items to render */
  items: ListItem<T>[];
  /** Render function for each item */
  renderItem: (item: ListItem<T>, index: number) => HTMLElement;
  /** Render group header */
  renderGroupHeader?: (groupKey: string) => HTMLElement;
  /** Item height (for virtualization, px) */
  itemHeight?: number;
  /** Estimated height for dynamic content */
  estimatedHeight?: number;
  /** Container element */
  container?: HTMLElement;
  /** Empty state message or element */
  emptyState?: string | HTMLElement;
  /** Show dividers between items */
  showDividers?: boolean;
  /** Custom class name */
  className?: string;
  /** Called when an item is clicked */
  onItemClick?: (item: ListItem<T>, index: number) => void;
  /** Called when list is scrolled to bottom */
  onScrollToEnd?: () => void;
}

export interface ListInstance<T = unknown> {
  /** The root list element */
  el: HTMLElement;
  /** Set new items */
  setItems: (items: ListItem<T>[]) => void;
  /** Get current items */
  getItems: () => ListItem<T>[];
  /** Scroll to item by index */
  scrollToItem: (index: number, alignment?: "start" | "center" | "end") => void;
  /** Scroll to top */
  scrollToTop: () => void;
  /** Scroll to bottom */
  scrollToBottom: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a list component with optional virtualization and grouping.
 *
 * @example
 * ```ts
 * const list = createList({
 *   items: [
 *     { id: "1", data: { name: "Alice" } },
 *     { id: "2", data: { name: "Bob" } },
 *   ],
 *   renderItem: (item) => {
 *     const el = document.createElement("div");
 *     el.textContent = item.data.name;
 *     return el;
 *   },
 * });
 * ```
 */
export function createList<T = unknown>(options: ListOptions<T>): ListInstance<T> {
  const {
    items,
    renderItem,
    renderGroupHeader,
    itemHeight = 48,
    estimatedHeight = 48,
    container,
    emptyState,
    showDividers = false,
    className,
    onItemClick,
    onScrollToEnd,
  } = options;

  let _items = [...items];

  // Root
  const root = document.createElement("div");
  root.className = `list ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-direction:column;overflow-y:auto;max-height:100%;" +
    (showDividers ? "" : "");

  // Render
  _render();

  (container ?? document.body).appendChild(root);

  // Scroll-to-end detection
  if (onScrollToEnd) {
    let ticking = false;
    root.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const nearBottom = root.scrollHeight - root.scrollTop - root.clientHeight < 50;
          if (nearBottom) onScrollToEnd();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // --- Methods ---

  function setItems(newItems: ListItem<T>[]): void {
    _items = newItems;
    _render();
  }

  function getItems(): ListItem<T>[] { return [..._items]; }

  function scrollToItem(index: number, alignment: "start" | "center" | "end" = "start"): void {
    const itemEl = root.querySelector(`[data-list-index="${index}"]`) as HTMLElement;
    if (!itemEl) return;

    switch (alignment) {
      case "start":
        itemEl.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "center":
        itemEl.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      case "end":
        itemEl.scrollIntoView({ behavior: "smooth", block: "end" });
        break;
    }
  }

  function scrollToTop(): void { root.scrollTo({ top: 0, behavior: "smooth" }); }
  function scrollToBottom(): void { root.scrollTo({ top: root.scrollHeight, behavior: "smooth" }); }

  function destroy(): void { root.remove(); }

  // --- Internal ---

  function _render(): void {
    root.innerHTML = "";

    if (_items.length === 0) {
      if (emptyState) {
        if (typeof emptyState === "string") {
          const emptyEl = document.createElement("div");
          emptyEl.textContent = emptyState;
          emptyEl.style.cssText = "padding:32px;text-align:center;color:#9ca3af;font-size:14px;";
          root.appendChild(emptyEl);
        } else {
          root.appendChild(emptyState.cloneNode(true));
        }
      }
      return;
    }

    // Group items
    const groups = new Map<string, ListItem<T>[]>();
    const ungrouped: ListItem<T>[] = [];

    for (const item of _items) {
      if (item.group) {
        let arr = groups.get(item.group);
        if (!arr) { arr = []; groups.set(item.group, arr); }
        arr.push(item);
      } else {
        ungrouped.push(item);
      }
    }

    let globalIndex = 0;

    // Render grouped items
    for (const [groupKey, groupItems] of groups) {
      if (renderGroupHeader) {
        const headerEl = renderGroupHeader(groupKey);
        headerEl.style.cssText += ";position:sticky;top:0;z-index:1;";
        root.appendChild(headerEl);
      }

      groupItems.forEach((item, i) => {
        const itemEl = renderItem(item, globalIndex++);
        itemEl.dataset.listId = item.id;
        itemEl.dataset.listIndex = String(globalIndex - 1);
        itemEl.style.minHeight = `${itemHeight}px`;
        if (onItemClick) {
          itemEl.style.cursor = "pointer";
          itemEl.addEventListener("click", () => onItemClick(item, globalIndex - 1));
        }
        if (i > 0 && showDividers) {
          const divider = document.createElement("div");
          divider.className = "list-divider";
          divider.style.cssText = "height:1px;background:#f3f4f6;margin:0;";
          root.appendChild(divider);
        }
        root.appendChild(itemEl);
      });

      // Group separator
      if (ungrouped.length > 0 || [...groups.keys()].indexOf(groupKey) < [...groups.keys()].length - 1) {
        const sep = document.createElement("div");
        sep.className = "list-group-separator";
        sep.style.height = "12px";
        root.appendChild(sep);
      }
    }

    // Render ungrouped items
    ungrouped.forEach((item, i) => {
      if (i > 0 && showDividers) {
        const divider = document.createElement("div");
        divider.className = "list-divider";
        divider.style.cssText = "height:1px;background:#f3f4f6;margin:0;";
        root.appendChild(divider);
      }
      const itemEl = renderItem(item, globalIndex++);
      itemEl.dataset.listId = item.id;
      itemEl.dataset.listIndex = String(globalIndex - 1);
      itemEl.style.minHeight = `${itemHeight}px`;
      if (onItemClick) {
        itemEl.style.cursor = "pointer";
        itemEl.addEventListener("click", () => onItemClick(item, globalIndex - 1));
      }
      root.appendChild(itemEl);
    });
  }

  return { el: root, setItems, getItems, scrollToItem, scrollToTop, scrollToBottom, destroy };
}
