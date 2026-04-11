/**
 * Accordion Utilities: Collapsible sections with single/multiple mode,
 * animated transitions, keyboard navigation, ARIA attributes, nesting,
 * and lazy content loading.
 */

// --- Types ---

export type AccordionMode = "single" | "multiple";

export interface AccordionItem {
  /** Unique key */
  id: string;
  /** Header/title */
  title: string;
  /** Optional icon */
  icon?: string | HTMLElement;
  /** Content (HTMLElement or HTML string) */
  content: HTMLElement | string;
  /** Initially expanded */
  defaultExpanded?: boolean;
  /** Disabled (cannot toggle) */
  disabled?: boolean;
  /** Lazy load content on first expand */
  lazy?: boolean;
  /** Custom header renderer */
  renderHeader?: (item: AccordionItem, isExpanded: boolean, headerEl: HTMLElement) => void;
}

export interface AccordionOptions {
  /** Accordion items */
  items: AccordionItem[];
  /** Single (only one open) or multiple (any number open) */
  mode?: AccordionMode;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Easing function for height transition */
  easing?: string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when an item expands/collapses */
  onChange?: (id: string, expanded: boolean, item: AccordionItem) => void;
  /** Called before toggle (return false to prevent) */
  beforeToggle?: (id: string, willExpand: boolean) => boolean | Promise<boolean>;
}

export interface AccordionInstance {
  /** The root element */
  el: HTMLElement;
  /** Expand an item by id */
  expand: (id: string) => void;
  /** Collapse an item by id */
  collapse: (id: string) => void;
  /** Toggle an item */
  toggle: (id: string) => void;
  /** Expand all items */
  expandAll: () => void;
  /** Collapse all items */
  collapseAll: () => void;
  /** Check if item is expanded */
  isExpanded: (id: string) => boolean;
  /** Get currently expanded IDs */
  getExpandedIds: () => string[];
  /** Update items dynamically */
  setItems: (items: AccordionItem[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create an accessible accordion component.
 *
 * @example
 * ```ts
 * const accordion = createAccordion({
 *   items: [
 *     { id: "section1", title: "Getting Started", content: "<p>Content here</p>" },
 *     { id: "section2", title: "Advanced", content: advancedEl },
 *   ],
 *   mode: "single",
 * });
 * ```
 */
export function createAccordion(options: AccordionOptions): AccordionInstance {
  const {
    items,
    mode = "single",
    animationDuration = 250,
    easing = "ease-in-out",
    className,
    container,
    onChange,
    beforeToggle,
  } = options;

  let _items = [...items];
  const _expanded = new Set<string>(
    items.filter((i) => i.defaultExpanded).map((i) => i.id),
  );
  let cleanupFns: Array<() => void> = [];

  // Root
  const root = document.createElement("div");
  root.className = `accordion ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-direction:column;gap:4px;width:100%;";

  // Render
  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  async function expand(id: string): Promise<void> {
    await _toggleItem(id, true);
  }

  async function collapse(id: string): Promise<void> {
    await _toggleItem(id, false);
  }

  async function toggle(id: string): Promise<void> {
    const item = _items.find((i) => i.id === id);
    if (!item || item.disabled) return;
    await _toggleItem(id, !_expanded.has(id));
  }

  function expandAll(): void {
    if (mode === "single") return;
    for (const item of _items) {
      if (!item.disabled && !_expanded.has(item.id)) _doExpand(item.id);
    }
  }

  function collapseAll(): void {
    for (const id of [..._expanded]) _doCollapse(id);
  }

  function isExpanded(id: string): boolean { return _expanded.has(id); }
  function getExpandedIds(): string[] { return [..._expanded]; }

  function setItems(newItems: AccordionItem[]): void {
    _items = newItems;
    _expanded.clear();
    for (const item of newItems) if (item.defaultExpanded) _expanded.add(item.id);
    _render();
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Internal ---

  async function _toggleItem(id: string, willExpand: boolean): Promise<void> {
    const item = _items.find((i) => i.id === id);
    if (!item || item.disabled) return;

    if (mode === "single" && willExpand) {
      for (const otherId of [..._expanded]) if (otherId !== id) _doCollapse(otherId);
    }

    if (beforeToggle) {
      const canProceed = await beforeToggle(id, willExpand);
      if (!canProceed) return;
    }

    if (willExpand) _doExpand(id); else _doCollapse(id);
    onChange?.(id, willExpand, item);
  }

  function _doExpand(id: string): void {
    _expanded.add(id);
    _updateItemVisuals(id, true);
  }

  function _doCollapse(id: string): void {
    _expanded.delete(id);
    _updateItemVisuals(id, false);
  }

  function _updateItemVisuals(id: string, expanding: boolean): void {
    const itemEl = root.querySelector(`[data-accordion-id="${id}"]`);
    if (!itemEl) return;

    const header = itemEl.querySelector(".accordion-header") as HTMLElement;
    const content = itemEl.querySelector(".accordion-content") as HTMLElement;
    const icon = header?.querySelector(".accordion-icon");
    if (!header || !content) return;

    header.setAttribute("aria-expanded", String(expanding));
    if (icon) icon.style.transform = expanding ? "rotate(90deg)" : "rotate(0deg)";

    if (expanding) {
      content.style.display = "";
      content.style.height = "auto";
      const fullHeight = content.offsetHeight + "px";
      content.style.height = "0px";
      content.style.overflow = "hidden";
      void content.offsetHeight;
      content.style.transition = `height ${animationDuration}ms ${easing}`;
      content.style.height = fullHeight;

      setTimeout(() => {
        content.style.height = "";
        content.style.overflow = "";
        content.style.transition = "";
      }, animationDuration);

      const item = _items.find((i) => i.id === id);
      if (item?.lazy && content.children.length === 0) {
        if (typeof item.content === "string") content.innerHTML = item.content;
        else content.appendChild(item.content.cloneNode(true));
      }
    } else {
      content.style.height = content.offsetHeight + "px";
      content.style.overflow = "hidden";
      void content.offsetHeight;
      content.style.transition = `height ${animationDuration}ms ${easing}`;
      content.style.height = "0px";

      setTimeout(() => {
        content.style.display = "none";
        content.style.height = "";
        content.style.overflow = "";
        content.style.transition = "";
      }, animationDuration);
    }
  }

  function _render(): void {
    root.innerHTML = "";

    _items.forEach((item) => {
      const wrapper = document.createElement("div");
      wrapper.className = "accordion-item";
      wrapper.dataset.accordionId = item.id;
      wrapper.style.cssText =
        "border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;" +
        "background:#fff;transition:border-color 0.15s;";

      // Header
      const header = document.createElement("button");
      header.className = "accordion-header";
      header.setAttribute("role", "button");
      header.setAttribute("aria-expanded", String(_expanded.has(item.id)));
      header.setAttribute("aria-controls", `accordion-content-${item.id}`);
      header.type = "button";
      header.style.cssText =
        "display:flex;align-items:center;gap:8px;width:100%;padding:12px 16px;" +
        "border:none;background:none;cursor:pointer;font-size:14px;font-weight:500;" +
        "color:#374151;text-align:left;user-select:none;" +
        (item.disabled ? "opacity:0.5;cursor:not-allowed;" : "");

      // Chevron
      const chevron = document.createElement("span");
      chevron.className = "accordion-icon";
      chevron.innerHTML = "&#9654;";
      chevron.style.cssText =
        "font-size:10px;color:#9ca3af;transition:transform 0.2s ease;" +
        (_expanded.has(item.id) ? "transform:rotate(90deg);" : "") +
        "flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;";
      header.appendChild(chevron);

      // Custom icon
      if (item.icon) {
        const iconEl = document.createElement("span");
        iconEl.className = "accordion-item-icon";
        iconEl.innerHTML = typeof item.icon === "string" ? item.icon : "";
        header.appendChild(iconEl);
      }

      // Title
      const titleSpan = document.createElement("span");
      titleSpan.className = "accordion-title";
      titleSpan.textContent = item.title;
      titleSpan.style.flex = "1";
      header.appendChild(titleSpan);

      header.addEventListener("click", () => { if (!item.disabled) toggle(item.id); });

      if (!item.disabled) {
        header.addEventListener("mouseenter", () => { wrapper.style.borderColor = "#d1d5db"; });
        header.addEventListener("mouseleave", () => { wrapper.style.borderColor = "#e5e7eb"; });
      }

      item.renderHeader?.(item, _expanded.has(item.id), header);
      wrapper.appendChild(header);

      // Content panel
      const content = document.createElement("div");
      content.className = "accordion-content";
      content.id = `accordion-content-${item.id}`;
      content.setAttribute("role", "region");
      content.style.cssText =
        "padding:0 16px 16px;font-size:14px;color:#4b5563;line-height:1.6;" +
        (!_expanded.has(item.id) ? "display:none;" : "");

      if (_expanded.has(item.id)) {
        if (typeof item.content === "string") content.innerHTML = item.content;
        else content.appendChild(item.content.cloneNode(true));
      } else if (!item.lazy) {
        if (typeof item.content === "string") content.innerHTML = item.content;
        else content.appendChild(item.content.cloneNode(true));
        content.style.display = "none";
      }

      wrapper.appendChild(content);
      root.appendChild(wrapper);
    });

    _setupKeyboardNav();
  }

  function _setupKeyboardNav(): void {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      if (!target.closest(".accordion")) return;
      if (!target.classList.contains("accordion-header")) return;

      const headers = Array.from(root.querySelectorAll<HTMLElement>(".accordion-header:not([disabled])"));
      const currentIndex = headers.indexOf(target);
      if (currentIndex < 0) return;

      switch (e.key) {
        case "ArrowDown": e.preventDefault(); headers[Math.min(currentIndex + 1, headers.length - 1)]?.focus(); break;
        case "ArrowUp": e.preventDefault(); headers[Math.max(currentIndex - 1, 0)]?.focus(); break;
        case "Home": e.preventDefault(); headers[0]?.focus(); break;
        case "End": e.preventDefault(); headers[headers.length - 1]?.focus(); break;
        case "Enter":
        case " ": {
          e.preventDefault();
          const wrapper = target.closest("[data-accordion-id]");
          if (wrapper) toggle(wrapper.dataset.accordionId!);
          break;
        }
      }
    };
    root.addEventListener("keydown", handler);
    cleanupFns.push(() => root.removeEventListener("keydown", handler));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: root, expand, collapse, toggle, expandAll, collapseAll, isExpanded, getExpandedIds, setItems, destroy };
}
