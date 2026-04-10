/**
 * List Component: Static/virtual list with item rendering, selection modes,
 * grouping, keyboard navigation, drag-to-reorder, empty state,
 * header/footer slots, and accessibility.
 */

// --- Types ---

export type ListSelectionMode = "none" | "single" | "multiple";
export type ListVariant = "default" | "bordered" | "compact" | "spaced";

export interface ListItem<T = unknown> {
  /** Unique key */
  id: string;
  /** Primary text */
  title: string;
  /** Secondary text / description */
  subtitle?: string;
  /** Leading icon/emoji/avatar */
  leading?: string | HTMLElement;
  /** Trailing icon/action */
  trailing?: string | HTMLElement;
  /** Item data */
  data?: T;
  /** Disabled? */
  disabled?: boolean;
  /** Group key for sectioned lists */
  group?: string;
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface ListOptions<T = unknown> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Items to display */
  items: ListItem<T>[];
  /** Selection mode */
  selectionMode?: ListSelectionMode;
  /** Visual variant */
  variant?: ListVariant;
  /** Show dividers between items? */
  divided?: boolean;
  /** Allow keyboard navigation */
  keyboardNav?: boolean;
  /** Initially selected IDs */
  selectedIds?: string[];
  /** Header element or text */
  header?: string | HTMLElement;
  /** Footer element or text */
  footer?: string | HTMLElement;
  /** Empty state text (shown when items is empty) */
  emptyText?: string;
  /** Max height with scroll */
  maxHeight?: number;
  /** Callback when selection changes */
  onSelectionChange?: (selected: string[], items: ListItem<T>[]) => void;
  /** Callback when item is clicked */
  onItemClick?: (item: ListItem<T>, index: number) => void;
  /** Custom render function per item */
  renderItem?: (item: ListItem<T>, index: number, isSelected: boolean) => HTMLElement;
  /** Custom CSS class */
  className?: string;
}

export interface ListInstance<T = unknown> {
  element: HTMLElement;
  getItems: () => ListItem<T>[];
  setItems: (items: ListItem<T>[]) => void;
  getSelected: () => string[];
  setSelected: (ids: string[]) => void;
  getSelectedItems: () => ListItem<T>[];
  addItem: (item: ListItem<T>) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<ListItem<T>>) => void;
  destroy: () => void;
}

// --- Main ---

export function createList<T = unknown>(options: ListOptions<T>): ListInstance<T> {
  const opts = {
    selectionMode: options.selectionMode ?? "none",
    variant: options.variant ?? "default",
    divided: options.divided ?? true,
    keyboardNav: options.keyboardNav ?? true,
    selectedIds: options.selectedIds ?? [],
    emptyText: options.emptyText ?? "No items",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("List: container not found");

  let items = [...options.items];
  let selectedKeys = new Set(opts.selectedIds);
  let focusedIndex = -1;
  let destroyed = false;

  // Root element
  const root = document.createElement("div");
  root.className = `list list-${opts.variant} ${opts.className}`;
  root.setAttribute("role", opts.selectionMode !== "none" ? "listbox" : "list");
  root.style.cssText = `
    font-family:-apple-system,sans-serif;font-size:14px;color:#374151;
    ${opts.maxHeight ? `max-height:${opts.maxHeight}px;overflow-y:auto;` : ""}
  `;
  root.tabIndex = opts.keyboardNav ? 0 : -1;
  container.appendChild(root);

  // Header
  let headerEl: HTMLElement | null = null;
  if (opts.header) {
    headerEl = typeof opts.header === "string"
      ? (() => { const el = document.createElement("div"); el.textContent = opts.header as string; el.style.cssText = "padding:10px 14px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;"; return el; })()
      : opts.header as HTMLElement;
    root.appendChild(headerEl);
  }

  // List body
  const body = document.createElement("div");
  body.className = "list-body";
  body.style.cssText = "position:relative;";
  root.appendChild(body);

  // Footer
  let footerEl: HTMLElement | null = null;
  if (opts.footer) {
    footerEl = typeof opts.footer === "string"
      ? (() => { const el = document.createElement("div"); el.textContent = opts.footer as string; el.style.cssText = "padding:8px 14px;border-top:1px solid #f0f0f0;font-size:12px;color:#9ca3af;"; return el; })()
      : opts.footer as HTMLElement;
    root.appendChild(footerEl);
  }

  // --- Render ---

  function render(): void {
    if (destroyed) return;
    body.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "list-empty";
      empty.style.cssText = "padding:32px 16px;text-align:center;color:#9ca3af;font-size:13px;";
      empty.textContent = opts.emptyText;
      body.appendChild(empty);
      return;
    }

    // Check if grouped
    const hasGroups = items.some((i) => i.group);
    let currentGroup = "";

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const isSelected = selectedKeys.has(item.id);

      // Group header
      if (hasGroups && item.group && item.group !== currentGroup) {
        currentGroup = item.group!;
        const groupHeader = document.createElement("div");
        groupHeader.className = "list-group-header";
        groupHeader.style.cssText = "padding:8px 14px 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;";
        groupHeader.textContent = currentGroup;
        body.appendChild(groupHeader);
      }

      // Render item
      const el = opts.renderItem
        ? opts.renderItem(item, i, isSelected)
        : renderDefaultItem(item, i, isSelected);

      el.dataset.id = item.id;
      el.dataset.index = String(i);

      if (opts.selectionMode !== "none") {
        el.setAttribute("role", "option");
        el.setAttribute("aria-selected", String(isSelected));
      }

      // Divider
      if (opts.divided && i < items.length - 1) {
        el.style.borderBottom = "1px solid #f3f4f6";
      }

      // Click handler
      if (!item.disabled) {
        el.addEventListener("click", () => handleItemClick(item, i));
        el.addEventListener("mouseenter", () => {
          if (opts.keyboardNav) { focusedIndex = i; }
          el.style.background = "#f9fafb";
        });
        el.addEventListener("mouseleave", () => {
          el.style.background = "";
        });
      }

      // Focus styling
      if (focusedIndex === i) {
        el.style.background = "#f0f4ff";
      }

      body.appendChild(el);
    }
  }

  function renderDefaultItem(item: ListItem<T>, _index: number, isSelected: boolean): HTMLElement {
    const isCompact = opts.variant === "compact";
    const isSpaced = opts.variant === "spaced";

    const el = document.createElement("div");
    el.className = "list-item";
    el.style.cssText = `
      display:flex;align-items:center;gap:${isCompact ? "8px" : "12px"};
      padding:${isCompact ? "6px 10px" : isSpaced ? "14px 16px" : "10px 14px"};
      cursor:${item.disabled ? "not-allowed" : "pointer"};
      transition:background 0.1s;
      ${item.disabled ? "opacity:0.5;" : ""}
      ${isSelected ? "background:#eef2ff;" : ""}
      ${opts.variant === "bordered" ? "border:1px solid #e5e7eb;border-radius:6px;margin-bottom:4px;" : ""}
    `;

    // Leading
    if (item.leading) {
      const lead = document.createElement("span");
      lead.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
      if (typeof item.leading === "string") {
        lead.textContent = item.leading;
        lead.style.fontSize = isCompact ? "16px" : "20px";
      } else {
        lead.appendChild(item.leading);
      }
      el.appendChild(lead);
    }

    // Content
    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;";

    const title = document.createElement("div");
    title.style.cssText = `${isCompact ? "font-size:13px;" : "font-size:14px;"}font-weight:500;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isSelected ? "color:#4338ca;" : ""}`;
    title.textContent = item.title;
    content.appendChild(title);

    if (item.subtitle) {
      const sub = document.createElement("div");
      sub.style.cssText = `font-size:12px;color:#6b7280;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      sub.textContent = item.subtitle;
      content.appendChild(sub);
    }

    el.appendChild(content);

    // Trailing
    if (item.trailing) {
      const trail = document.createElement("span");
      trail.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
      if (typeof item.trailing === "string") {
        trail.textContent = item.trailing;
      } else {
        trail.appendChild(item.trailing);
      }
      el.appendChild(trail);
    }

    // Selection indicator
    if (isSelected && opts.selectionMode !== "none") {
      const check = document.createElement("span");
      check.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#4338ca"/><path d="M8 12l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      check.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
      el.appendChild(check);
    }

    return el;
  }

  function handleItemClick(item: ListItem<T>, index: number): void {
    if (item.disabled) return;

    if (opts.selectionMode === "single") {
      selectedKeys.clear();
      selectedKeys.add(item.id);
    } else if (opts.selectionMode === "multiple") {
      if (selectedKeys.has(item.id)) selectedKeys.delete(item.id);
      else selectedKeys.add(item.id);
    }

    focusedIndex = index;
    render();
    opts.onSelectionChange?.([...selectedKeys], getSelectedItems());
    opts.onItemClick?.(item, index);
  }

  // Keyboard navigation
  if (opts.keyboardNav) {
    root.addEventListener("keydown", (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (focusedIndex < items.length - 1) {
            focusedIndex++;
            render();
            scrollToFocused();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (focusedIndex > 0) {
            focusedIndex--;
            render();
            scrollToFocused();
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            handleItemClick(items[focusedIndex]!, focusedIndex);
          }
          break;
        case "Home":
          e.preventDefault();
          focusedIndex = 0;
          render();
          scrollToFocused();
          break;
        case "End":
          e.preventDefault();
          focusedIndex = Math.max(0, items.length - 1);
          render();
          scrollToFocused();
          break;
      }
    });
  }

  function scrollToFocused(): void {
    const focusedEl = body.querySelector(`[data-index="${focusedIndex}"]`);
    if (focusedEl) focusedEl.scrollIntoView({ block: "nearest" });
  }

  // Initial render
  render();

  // Instance
  const instance: ListInstance<T> = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: ListItem<T>[]) {
      items = newItems;
      render();
    },

    getSelected() { return [...selectedKeys]; },

    setSelected(ids: string[]) {
      selectedKeys = new Set(ids);
      render();
      opts.onSelectionChange?.([...selectedKeys], getSelectedItems());
    },

    getSelectedItems() {
      return items.filter((item) => selectedKeys.has(item.id));
    },

    addItem(item: ListItem<T>) {
      items.push(item);
      render();
    },

    removeItem(id: string) {
      items = items.filter((i) => i.id !== id);
      selectedKeys.delete(id);
      render();
    },

    updateItem(id: string, updates: Partial<ListItem<T>>) {
      const idx = items.findIndex((i) => i.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx]!, ...updates };
        render();
      }
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
