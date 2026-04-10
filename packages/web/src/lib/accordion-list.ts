/**
 * Accordion List: Advanced collapsible list with nested items, icons,
 * multiple expand modes, animations, drag-to-reorder hints, async content loading,
 * and accessible ARIA attributes.
 */

// --- Types ---

export type AccordionMode = "single" | "multiple" | "none";
export type ExpandIcon = "chevron" | "plus" | "arrow" | "none";

export interface AccordionItem {
  /** Unique ID */
  id: string;
  /** Title/heading */
  title: string;
  /** Content (HTML string or element) */
  content: string | HTMLElement;
  /** Icon/emoji prefix */
  icon?: string;
  /** Badge/count text */
  badge?: string | number;
  /** Disabled? */
  disabled?: boolean;
  /** Default expanded? */
  defaultExpanded?: boolean;
  /** Nested children items */
  children?: AccordionItem[];
  /** Custom data */
  data?: Record<string, unknown>;
}

export interface AccordionListOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Items to display */
  items: AccordionItem[];
  /** Expand mode */
  mode?: AccordionMode;
  /** Icon style for expand/collapse */
  iconStyle?: ExpandIcon;
  /** Animation duration (ms, default: 200) */
  animationDuration?: number;
  /** Show icons on items? */
  showIcons?: boolean;
  /** Allow nesting depth (default: 3) */
  maxDepth?: number;
  /** Compact mode (less padding) */
  compact?: boolean;
  /** Border between items? */
  bordered?: boolean;
  /** Callback when item expands */
  onExpand?: (item: AccordionItem) => void;
  /** Callback when item collapses */
  onCollapse?: (item: AccordionItem) => void;
  /** Callback when item clicked */
  onItemClick?: (item: AccordionItem) => void;
  /** Async content loader (for lazy loading) */
  loadContent?: (id: string) => Promise<string | HTMLElement>;
  /** Custom CSS class */
  className?: string;
}

export interface AccordionListInstance {
  element: HTMLElement;
  getItems: () => AccordionItem[];
  setItems: (items: AccordionItem[]) => void;
  expand: (id: string) => void;
  collapse: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  toggle: (id: string) => void;
  isExpanded: (id: string) => boolean;
  destroy: () => void;
}

// --- Main Factory ---

export function createAccordionList(options: AccordionListOptions): AccordionListInstance {
  const opts = {
    mode: options.mode ?? "single",
    iconStyle: options.iconStyle ?? "chevron",
    animationDuration: options.animationDuration ?? 200,
    showIcons: options.showIcons ?? true,
    maxDepth: options.maxDepth ?? 3,
    compact: options.compact ?? false,
    bordered: options.bordered ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AccordionList: container not found");

  container.className = `accordion-list ${opts.className}`;
  let items = options.items;
  let expandedIds = new Set(items.filter((i) => i.defaultExpanded).map((i) => i.id));
  let destroyed = false;

  function render(): void {
    container.innerHTML = "";
    const rootList = document.createElement("div");
    rootList.className = "al-root";
    rootList.style.cssText = `display:flex;flex-direction:column;${opts.bordered ? "border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;" : ""}`;

    for (const item of items) {
      rootList.appendChild(renderItem(item, 0));
    }

    container.appendChild(rootList);
  }

  function renderItem(item: AccordionItem, depth: number): HTMLElement {
    const isExpanded = expandedIds.has(item.id);
    const wrapper = document.createElement("div");
    wrapper.className = `al-item al-depth-${depth}`;
    wrapper.dataset.id = item.id;

    // Header
    const header = document.createElement("button");
    header.type = "button";
    header.className = "al-header";
    header.setAttribute("aria-expanded", String(isExpanded));
    header.style.cssText = `
      display:flex;align-items:center;width:100%;padding:${opts.compact ? "8px 12px" : "10px 16px"};
      background:none;border:none;cursor:pointer;font-family:-apple-system,sans-serif;
      font-size:${opts.compact ? "13" : "14"}px;color:#374151;text-align:left;
      gap:8px;transition:background 0.1s;line-height:1.4;
      ${opts.bordered && depth > 0 ? "border-top:1px solid #f0f0f0;" : ""}
      ${item.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
    `;
    header.disabled = item.disabled ?? false;

    // Expand icon
    const hasChildren = item.children && item.children.length > 0;
    if ((hasChildren || opts.iconStyle !== "none") && opts.showIcons) {
      const iconEl = document.createElement("span");
      iconEl.className = "al-icon";
      iconEl.style.cssText = `
        display:flex;align-items:center;justify-content:center;width:18px;height:18px;
        flex-shrink:0;transition:transform ${opts.animationDuration}ms ease;
        color:#9ca3af;font-size:12px;
      `;
      switch (opts.iconStyle) {
        case "chevron": iconEl.innerHTML = isExpanded ? "&#9660;" : "&#9658;"; break;
        case "plus":   iconEl.innerHTML = isExpanded ? "&minus;" : "+"; break;
        case "arrow":  iconEl.innerHTML = isExpanded ? "&#9660;" : "&#9654;"; break;
      }
      if (!hasChildren && opts.iconStyle !== "none") iconEl.style.visibility = "hidden";
      header.appendChild(iconEl);
    }

    // Item icon
    if (item.icon) {
      const itemIcon = document.createElement("span");
      itemIcon.textContent = item.icon;
      itemIcon.style.cssText = "font-size:15px;flex-shrink:0;";
      header.appendChild(itemIcon);
    }

    // Title
    const titleEl = document.createElement("span");
    titleEl.className = "al-title";
    titleEl.style.cssText = "flex:1;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    titleEl.textContent = item.title;
    header.appendChild(titleEl);

    // Badge
    if (item.badge !== undefined) {
      const badge = document.createElement("span");
      badge.style.cssText = `
        font-size:10px;font-weight:600;background:#eef2ff;color:#4338ca;
        padding:1px 7px;border-radius:99px;flex-shrink:0;
      `;
      badge.textContent = String(item.badge);
      header.appendChild(badge);
    }

    header.addEventListener("click", () => {
      if (item.disabled) return;
      toggle(item.id);
      opts.onItemClick?.(item);
    });

    header.addEventListener("mouseenter", () => { if (!item.disabled) header.style.background = "#f9fafb"; });
    header.addEventListener("mouseleave", () => { header.style.background = ""; });

    wrapper.appendChild(header);

    // Content panel
    const panel = document.createElement("div");
    panel.className = "al-panel";
    panel.setAttribute("role", "region");
    panel.dataset.panelId = item.id;
    panel.style.cssText = `
      overflow:hidden;transition:max-height ${opts.animationDuration}ms ease;
      max-height:${isExpanded ? "1000px" : "0"};
    `;

    if (isExpanded) {
      const body = document.createElement("div");
      body.className = "al-body";
      body.style.cssText = `padding:${opts.compact ? "8px 12px" : "12px 16px"}${opts.bordered ? ";border-top:1px solid #f0f0f0;" : ""};color:#6b7280;font-size:13px;line-height:1.6;`;

      if (typeof item.content === "string") {
        body.innerHTML = item.content;
      } else {
        body.appendChild(item.content);
      }
      panel.appendChild(body);

      // Nested children
      if (item.children && depth < opts.maxDepth - 1) {
        const childList = document.createElement("div");
        childList.style.cssText = "margin-top:4px;";
        for (const child of item.children) {
          childList.appendChild(renderItem(child, depth + 1));
        }
        body.appendChild(childList);
      }
    }

    wrapper.appendChild(panel);
    return wrapper;
  }

  function toggle(id: string): void {
    if (expandedIds.has(id)) {
      collapse(id);
    } else {
      expand(id);
    }
  }

  function expand(id: string): void {
    if (opts.mode === "single") {
      const prev = Array.from(expandedIds);
      expandedIds.clear();
      for (const pid of prev) {
        if (pid !== id) {
          collapsePanel(pid);
          opts.onCollapse?.(items.find((i) => i.id === pid)!);
        }
      }
    }
    expandedIds.add(id);
    const item = items.find((i) => i.id === id);
    if (item) {
      // Lazy load
      if (opts.loadContent && !item.content) {
        opts.loadContent(id).then((content) => {
          item.content = content;
          render();
        });
      }
      opts.onExpand?.(item);
    }
    render();
  }

  function collapse(id: string): void {
    expandedIds.delete(id);
    collapsePanel(id);
    const item = items.find((i) => i.id === id);
    opts.onCollapse?.(item!);
  }

  function collapsePanel(id: string): void {
    const panel = container.querySelector(`[data-panel-id="${id}"]`);
    if (panel) {
      panel.style.maxHeight = "0px";
      setTimeout(() => {
        if (!expandedIds.has(id)) {
          const body = panel.querySelector(".al-body");
          if (body) body.remove();
        }
      }, opts.animationDuration);
    }
  }

  render();

  return {
    element: container,

    getItems() { return [...items]; },

    setItems(newItems: AccordionItem[]) {
      items = newItems;
      expandedIds = new Set(newItems.filter((i) => i.defaultExpanded).map((i) => i.id));
      render();
    },

    expand,
    collapse,
    toggle,

    expandAll() {
      for (const item of items) expandedIds.add(item.id);
      render();
    },

    collapseAll() {
      expandedIds.clear();
      render();
    },

    isExpanded(id: string) { return expandedIds.has(id); },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };
}
