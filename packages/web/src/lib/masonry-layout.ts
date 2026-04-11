/**
 * Masonry Layout: Pinterest-style grid layout with columns of varying heights,
 * responsive column calculation, append/prepend/insert operations,
 * animated reflow, lazy loading readiness, and gap customization.
 */

// --- Types -----

export interface MasonryItem {
  /** Unique ID */
  id: string;
  /** HTML content (string or HTMLElement) */
  content: string | HTMLElement;
  /** Fixed height (px) - overrides auto-measurement */
  height?: number;
  /** Aspect ratio hint (width/height) for SSR-like scenarios */
  aspectRatio?: number;
  /** Column span (1 = default, 2+ = wider items) */
  colspan?: number;
  /** Custom data payload */
  data?: unknown;
  /** Click handler */
  onClick?: (item: MasonryItem, index: number, event: MouseEvent) => void;
}

export interface MasonryOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Items to display */
  items?: MasonryItem[];
  /** Number of columns (auto-calculated based on width if not set) */
  columns?: number;
  /** Minimum column width (px) for auto-calculation */
  minColumnWidth?: number;
  /** Maximum columns */
  maxColumns?: number;
  /** Gap between items (px) */
  gap?: number;
  /** Row gap (px), defaults to gap */
  rowGap?: number;
  /** Item border radius (px) */
  borderRadius?: number;
  /** Animation duration for reflow (ms) */
  transitionDuration?: number;
  /** Enable smooth reflow animations? */
  animateReflow?: boolean;
  /** Vertical alignment within columns ("start" | "center" | "end") */
  align?: "start" | "center" | "end";
  /** Custom CSS class */
  className?: string;
}

export interface MasonryInstance {
  element: HTMLElement;
  /** Add item(s) to end */
  add: (...items: MasonryItem[]) => void;
  /** Prepend item(s) */
  prepend: (...items: MasonryItem[]) => void;
  /** Insert at specific index */
  insert: (index: number, ...items: MasonryItem[]) => void;
  /** Remove item by ID */
  remove: (id: string) => void;
  /** Remove all items */
  clear: () => void;
  /** Get all items */
  getItems: () => MasonryItem[];
  /** Update item content */
  updateItem: (id: string, updates: Partial<MasonryItem>) => void;
  /** Force reflow/recalculate layout */
  reflow: () => void;
  /** Set column count */
  setColumns: (cols: number) => void;
  /** Get current column count */
  getColumns: () => number;
  /** Destroy */
  destroy: () => void;
}

// --- Main Factory ---

export function createMasonry(options: MasonryOptions): MasonryInstance {
  const opts = {
    columns: options.columns,
    minColumnWidth: options.minColumnWidth ?? 200,
    maxColumns: options.maxColumns ?? 12,
    gap: options.gap ?? 12,
    rowGap: options.rowGap ?? options.gap ?? 12,
    borderRadius: options.borderRadius ?? 8,
    transitionDuration: options.transitionDuration ?? 350,
    animateReflow: options.animateReflow ?? true,
    align: options.align ?? "start",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Masonry: container not found");

  let items = [...(options.items ?? [])];
  let destroyed = false;
  let currentColumns = opts.columns ?? 0;

  // Root
  const root = document.createElement("div");
  root.className = `masonry-layout ${opts.className}`;
  root.style.cssText = `
    display:flex;gap:${opts.gap}px;align-items:stretch;width:100%;
    box-sizing:border-box;
  `;
  container.appendChild(root);

  // Column elements
  let colElements: HTMLElement[] = [];

  // --- Column Management ---

  function calculateColumns(): number {
    if (opts.columns) return opts.columns;
    const availableWidth = container.clientWidth;
    const cols = Math.floor(availableWidth / opts.minColumnWidth);
    return Math.max(1, Math.min(cols, opts.maxColumns));
  }

  function ensureColumns(count: number): void {
    if (colElements.length === count) return;

    // Remove excess columns
    while (colElements.length > count) {
      const removed = colElements.pop()!;
      // Move remaining children to last kept column
      const target = colElements[colElements.length - 1];
      if (target) {
        while (removed.firstChild) target.appendChild(removed.firstChild);
      }
      removed.remove();
    }

    // Add missing columns
    while (colElements.length < count) {
      const col = document.createElement("div");
      col.className = "masonry-col";
      col.style.cssText = `
        flex:1;display:flex;flex-direction:column;gap:${opts.rowGap}px;
        min-width:0;
      `;
      root.appendChild(col);
      colElements.push(col);
    }
  }

  // --- Item Rendering ---

  function createItemElement(item: MasonryItem): HTMLElement {
    const el = document.createElement("div");
    el.className = "masonry-item";
    el.dataset.itemId = item.id;
    el.style.cssText = `
      break-inside:avoid;overflow:hidden;border-radius:${opts.borderRadius}px;
      background:#fff;border:1px solid #f0f0f0;
      transition:transform ${opts.transitionDuration}ms ease,
                 box-shadow ${opts.transitionDuration}ms ease,
                 opacity ${opts.transitionDuration}ms ease;
      cursor:${item.onClick ? "pointer" : "default"};
    `;

    if (typeof item.content === "string") {
      el.innerHTML = item.content;
    } else if (item.content instanceof HTMLElement) {
      el.appendChild(item.content.cloneNode(true));
    }

    // Fixed height
    if (item.height) {
      el.style.height = `${item.height}px`;
    }

    // Click handler
    if (item.onClick) {
      el.addEventListener("click", (e) => {
        const idx = items.findIndex(it => it.id === item.id);
        item.onClick!(item, idx, e as MouseEvent);
      });
      el.addEventListener("mouseenter", () => {
        el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        el.style.transform = "translateY(-2px)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.boxShadow = "";
        el.style.transform = "";
      });
    }

    return el;
  }

  // --- Layout Algorithm ---

  function getColumnForNewItem(): number {
    // Find shortest column
    let minHeight = Infinity;
    let shortestCol = 0;
    for (let i = 0; i < colElements.length; i++) {
      const h = colElements[i]!.scrollHeight;
      if (h < minHeight) {
        minHeight = h;
        shortestCol = i;
      }
    }
    return shortestCol;
  }

  function reflow(): void {
    const cols = calculateColumns();
    currentColumns = cols;
    ensureColumns(cols);

    // If we have no items yet, just set up columns and return
    if (items.length === 0) return;

    // Collect all existing item elements
    const itemMap = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>(".masonry-item").forEach(el => {
      itemMap.set(el.dataset.itemId!, el);
    });

    // Clear columns
    for (const col of colElements) col.innerHTML = "";

    // Redistribute items using shortest-column strategy
    for (const item of items) {
      const el = itemMap.get(item.id) ?? createItemElement(item);
      const colIdx = getColumnForNewItem();

      // Handle colspan
      const span = item.colspan ?? 1;
      if (span > 1 && colIdx + span <= colElements.length) {
        // Create wrapper for multi-column item
        const wrapper = document.createElement("div");
        wrapper.style.cssText = `
          grid-column:span ${span};display:contents;
        `;
        wrapper.appendChild(el);
        colElements[colIdx]!.appendChild(wrapper);
      } else {
        colElements[colIdx]!.appendChild(el);
      }
    }
  }

  // --- ResizeObserver for responsive columns ---

  if (!opts.columns && typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (!destroyed) reflow();
    });
    ro.observe(container);
    // Store for cleanup
    (root as any).__resizeObserver = ro;
  }

  // Initial render
  reflow();

  // --- Instance ---

  const instance: MasonryInstance = {
    element: root,

    getItems() { return [...items]; },

    add(...newItems: MasonryItem[]) {
      items.push(...newItems);
      for (const item of newItems) {
        const el = createItemElement(item);
        const colIdx = getColumnForNewItem();
        colElements[colIdx]?.appendChild(el);
      }
    },

    prepend(...newItems: MasonryItem[]) {
      items.unshift(...newItems);
      reflow();
    },

    insert(index: number, ...newItems: MasonryItem[]) {
      items.splice(index, 0, ...newItems);
      reflow();
    },

    remove(id: string) {
      items = items.filter(i => i.id !== id);
      const el = root.querySelector(`[data-item-id="${id}"]`);
      if (el) {
        if (opts.animateReflow) {
          el.style.opacity = "0";
          el.style.transform = "scale(0.95)";
          setTimeout(() => { el.remove(); }, opts.transitionDuration);
        } else {
          el.remove();
        }
      }
    },

    clear() {
      items = [];
      for (const col of colElements) col.innerHTML = "";
    },

    updateItem(id: string, updates: Partial<MasonryItem>) {
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx]!, ...updates };
        reflow();
      }
    },

    reflow,

    setColumns(cols: number) {
      opts.columns = cols;
      reflow();
    },

    getColumns() { return currentColumns; },

    destroy() {
      destroyed = true;
      const ro = (root as any).__resizeObserver;
      if (ro) ro.disconnect();
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
