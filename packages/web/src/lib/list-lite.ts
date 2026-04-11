/**
 * Lightweight List: Virtual-scroll-friendly list component with item rendering,
 * selection modes (single/multi), drag-and-drop reordering, grouping,
 * infinite scroll / load-more, empty state, and keyboard navigation.
 */

// --- Types ---

export type ListSelectionMode = "none" | "single" | "multiple";
export type ListItemStatus = "default" | "success" | "warning" | "error" | "info";

export interface ListItemData {
  /** Unique key */
  key: string;
  /** Primary text */
  title: string;
  /** Secondary/description text */
  description?: string;
  /** Icon (emoji or HTML) */
  icon?: string | HTMLElement;
  /** Right-side content (e.g., badge, action) */
  extra?: string | HTMLElement;
  /** Disabled? */
  disabled?: boolean;
  /** Status color variant */
  status?: ListItemStatus;
  /** Group key for grouping */
  group?: string;
  /** Custom data payload */
  data?: unknown;
}

export interface ListOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** List items */
  items: ListItemData[];
  /** Selection mode */
  selectionMode?: ListSelectionMode;
  /** Show item dividers/borders? */
  showDivider?: boolean;
  /** Show hover effect? */
  showHover?: boolean;
  /** Group items by 'group' field? */
  grouped?: boolean;
  /** Enable drag-and-drop reorder? */
  draggable?: boolean;
  /** Load more callback (infinite scroll) */
  onLoadMore?: () => void | Promise<void>;
  /** Threshold px from bottom to trigger load more */
  loadMoreThreshold?: number;
  /** Loading state for load-more */
  loading?: boolean;
  /** Empty state message */
  emptyText?: string;
  /** Custom render function per item */
  renderItem?: (item: ListItemData, index: number, isSelected: boolean) => HTMLElement;
  /** Callback on selection change */
  onSelectionChange?: (keys: string[], items: ListItemData[]) => void;
  /** Callback on item click */
  onItemClick?: (item: ListItemData, index: number) => void;
  /** Callback after drag reorder */
  onReorder?: (newItems: ListItemData[]) => void;
  /** Max height with internal scroll */
  maxHeight?: number | string;
  /** Custom CSS class */
  className?: string;
}

export interface ListInstance {
  element: HTMLElement;
  getItems: () => ListItemData[];
  setItems: (items: ListItemData[]) => void;
  getSelectedKeys: () => string[];
  setSelectedKeys: (keys: string[]) => void;
  getSelectedItem: () => ListItemData | null;
  addItem: (item: ListItemData) => void;
  removeItem: (key: string) => void;
  clearSelection: () => void;
  scrollToItem: (key: string) => void;
  destroy: () => void;
}

// --- Status Colors ---

const STATUS_COLORS: Record<ListItemStatus, { bg: string; borderLeft: string }> = {
  default:  { bg: "", borderLeft: "" },
  success:  { bg: "#f0fdf4", borderLeft: "#22c55e" },
  warning:  { bg: "#fffbeb", borderLeft: "#f59e0b" },
  error:    { bg: "#fef2f2", borderLeft: "#ef4444" },
  info:     { bg: "#eff6ff", borderLeft: "#3b82f6" },
};

// --- Main Factory ---

export function createList(options: ListOptions): ListInstance {
  const opts = {
    selectionMode: options.selectionMode ?? "none",
    showDivider: options.showDivider ?? true,
    showHover: options.showHover ?? true,
    grouped: options.grouped ?? false,
    draggable: options.draggable ?? false,
    loadMoreThreshold: options.loadMoreThreshold ?? 80,
    loading: options.loading ?? false,
    emptyText: options.emptyText ?? "No data",
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("List: container not found");

  let items = [...options.items];
  let selectedKeys: Set<string> = new Set();
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `list ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    ${opts.maxHeight ? `max-height:${typeof opts.maxHeight === "number" ? opts.maxHeight + "px" : opts.maxHeight};overflow-y:auto;` : ""}
  `;
  container.appendChild(root);

  // Drag state
  let dragKey: string | null = null;
  let dragEl: HTMLElement | null = null;
  let dragOverKey: string | null = null;

  function render(): void {
    root.innerHTML = "";

    if (items.length === 0 && !opts.loading) {
      const empty = document.createElement("div");
      empty.className = "list-empty";
      empty.style.cssText = `
        padding:48px 24px;text-align:center;color:#9ca3af;font-size:14px;
      `;
      empty.textContent = opts.emptyText;
      root.appendChild(empty);
      return;
    }

    // Grouped or flat
    const groups = opts.grouped
      ? groupBy(items, (i) => i.group ?? "")
      : { "": items };

    let globalIndex = 0;
    for (const [groupKey, groupItems] of Object.entries(groups)) {
      // Group header
      if (opts.grouped && groupKey) {
        const hdr = document.createElement("div");
        hdr.className = "list-group-header";
        hdr.style.cssText = `
          padding:10px 16px 6px;font-size:11px;font-weight:600;
          color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;
        `;
        hdr.textContent = groupKey;
        root.appendChild(hdr);
      }

      // Items
      for (let i = 0; i < groupItems.length; i++) {
        const item = groupItems[i]!;
        const isSelected = selectedKeys.has(item.key);
        const st = STATUS_COLORS[item.status ?? "default"];

        if (options.renderItem) {
          const customEl = options.renderItem(item, globalIndex, isSelected);
          customEl.dataset.key = item.key;
          setupDrag(customEl, item);
          root.appendChild(customEl);
        } else {
          const row = document.createElement("div");
          row.className = `list-item${isSelected ? " list-selected" : ""}${item.disabled ? " list-disabled" : ""}`;
          row.dataset.key = item.key;
          row.setAttribute("role", opts.selectionMode !== "none" ? "option" : "listitem");
          row.setAttribute("aria-selected", String(isSelected));
          if (item.disabled) row.setAttribute("aria-disabled", "true");
          row.style.cssText = `
            display:flex;align-items:center;gap:10px;padding:10px 16px;
            position:relative;cursor:${item.disabled ? "not-allowed" : "pointer"};
            background:${st.bg};
            ${item.status && item.status !== "default" ? `border-left:3px solid ${st.borderLeft};` : ""}
            ${opts.showDivider && i < groupItems.length - 1 ? "border-bottom:1px solid #f3f4f6;" : ""}
            transition:background 0.12s;
          `;

          // Selection indicator
          if (opts.selectionMode !== "none") {
            const selIndicator = document.createElement("span");
            selIndicator.style.cssText = `
              flex-shrink:0;width:18px;height:18px;border-radius:50%;
              border:2px solid #d1d5db;display:flex;align-items:center;
              justify-content:center;font-size:11px;transition:all 0.15s;
              ${isSelected ? "background:#4338ca;border-color:#4338ca;" : ""}
            `;
            if (isSelected) {
              selIndicator.innerHTML = opts.selectionMode === "multiple"
                ? `<svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" fill="none"/></svg>`
                : `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#fff"/></svg>`;
            }
            row.appendChild(selIndicator);
          }

          // Icon
          if (item.icon) {
            const iconEl = document.createElement("span");
            iconEl.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
            if (typeof item.icon === "string") {
              iconEl.textContent = item.icon;
              iconEl.style.fontSize = "16px";
            } else {
              iconEl.appendChild(item.icon);
            }
            row.appendChild(iconEl);
          }

          // Content area
          const content = document.createElement("div");
          content.style.cssText = "flex:1;min-width:0;";

          const titleEl = document.createElement("div");
          titleEl.className = "list-item-title";
          titleEl.style.cssText = `font-weight:500;font-size:13px;${isSelected ? "color:#4338ca;" : "color:#111827;"}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
          titleEl.textContent = item.title;
          content.appendChild(titleEl);

          if (item.description) {
            const descEl = document.createElement("div");
            descEl.className = "list-item-desc";
            descEl.style.cssText = "font-size:12px;color:#9ca3af;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
            descEl.textContent = item.description;
            content.appendChild(descEl);
          }

          row.appendChild(content);

          // Extra content
          if (item.extra) {
            const extraEl = document.createElement("span");
            extraEl.style.cssText = "flex-shrink:0;";
            if (typeof item.extra === "string") {
              extraEl.textContent = item.extra;
            } else {
              extraEl.appendChild(item.extra);
            }
            row.appendChild(extraEl);
          }

          // Events
          if (!item.disabled) {
            if (opts.showHover) {
              row.addEventListener("mouseenter", () => { row.style.background = isSelected ? "#eef2ff" : "#f9fafb"; });
              row.addEventListener("mouseleave", () => { row.style.background = st.bg || ""; });
            }

            row.addEventListener("click", () => handleItemClick(item));
          }

          setupDrag(row, item);
          root.appendChild(row);
        }

        globalIndex++;
      }
    }

    // Load more sentinel
    if (options.onLoadMore) {
      const sentinel = document.createElement("div");
      sentinel.className = "list-sentinel";
      sentinel.style.cssText = "height:1px;";
      root.appendChild(sentinel);

      // IntersectionObserver for infinite scroll
      const observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && !opts.loading) {
          options.onLoadMore?.();
        }
      }, { root, threshold: 0 });
      observer.observe(sentinel);
    }

    // Loading indicator
    if (opts.loading) {
      const loader = document.createElement("div");
      loader.className = "list-loading";
      loader.style.cssText = `
        display:flex;align-items:center;justify-content:center;padding:16px;
        gap:8px;color:#9ca3af;font-size:13px;
      `;
      loader.innerHTML = `<span style="display:inline-block;width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 0.6s linear infinite;"></span> Loading...`;
      root.appendChild(loader);
    }
  }

  function setupDrag(el: HTMLElement, item: ListItemData): void {
    if (!opts.draggable || item.disabled) return;

    el.draggable = true;
    el.addEventListener("dragstart", (e: DragEvent) => {
      dragKey = item.key;
      dragEl = el;
      el.style.opacity = "0.4";
      e.dataTransfer!.effectAllowed = "move";
    });

    el.addEventListener("dragend", () => {
      if (dragEl) dragEl.style.opacity = "";
      dragKey = null;
      dragEl = null;
      dragOverKey = null;
      render();
    });

    el.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";
      if (item.key !== dragKey) {
        dragOverKey = item.key;
        el.style.borderTop = "2px solid #4338ca";
      }
    });

    el.addEventListener("dragleave", () => {
      el.style.borderTop = "";
    });

    el.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      el.style.borderTop = "";
      if (dragKey && dragOverKey && dragKey !== dragOverKey) {
        const fromIdx = items.findIndex((i) => i.key === dragKey);
        const toIdx = items.findIndex((i) => i.key === dragOverKey);
        if (fromIdx >= 0 && toIdx >= 0) {
          const [moved] = items.splice(fromIdx, 1);
          items.splice(toIdx, 0, moved!);
          render();
          options.onReorder?.([...items]);
        }
      }
    });
  }

  function handleItemClick(item: ListItemData): void {
    if (item.disabled || destroyed) return;

    options.onItemClick?.(item, items.indexOf(item));

    if (opts.selectionMode === "single") {
      selectedKeys.clear();
      selectedKeys.add(item.key);
    } else if (opts.selectionMode === "multiple") {
      if (selectedKeys.has(item.key)) {
        selectedKeys.delete(item.key);
      } else {
        selectedKeys.add(item.key);
      }
    }

    render();
    emitSelectionChange();
  }

  function emitSelectionChange(): void {
    const keys = Array.from(selectedKeys);
    const selected = items.filter((i) => selectedKeys.has(i.key));
    opts.onSelectionChange?.(keys, selected);
  }

  function scrollToItem(key: string): void {
    const el = root.querySelector(`[data-key="${key}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Keyboard navigation
  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    if (opts.selectionMode === "none") return;
    const focused = document.activeElement as HTMLElement | null;
    if (!focused || !root.contains(focused)) return;

    const allRows = Array.from(root.querySelectorAll<HTMLElement>('[role="option"]'));
    const focusedIdx = allRows.indexOf(focused);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (focusedIdx < allRows.length - 1) (allRows[focusedIdx + 1] as HTMLElement).focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (focusedIdx > 0) (allRows[focusedIdx - 1] as HTMLElement).focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focused) {
          const key = focused.dataset.key;
          if (key) {
            const item = items.find((i) => i.key === key);
            if (item) handleItemClick(item);
          }
        }
        break;
    }
  });

  render();

  const instance: ListInstance = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: ListItemData[]) {
      items = newItems;
      selectedKeys.clear();
      render();
    },

    getSelectedKeys() { return Array.from(selectedKeys); },

    setSelectedKeys(keys: string[]) {
      selectedKeys = new Set(keys);
      render();
      emitSelectionChange();
    },

    getSelectedItem(): ListItemData | null {
      if (selectedKeys.size === 0) return null;
      const key = Array.from(selectedKeys)[0];
      return items.find((i) => i.key === key) ?? null;
    },

    addItem(newItem: ListItemData) {
      items.push(newItem);
      render();
    },

    removeItem(key: string) {
      items = items.filter((i) => i.key !== key);
      selectedKeys.delete(key);
      render();
      emitSelectionChange();
    },

    clearSelection() {
      selectedKeys.clear();
      render();
      emitSelectionChange();
    },

    scrollToItem,

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}

// --- Utility ---

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = fn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}
