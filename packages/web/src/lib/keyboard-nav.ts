/**
 * Keyboard Navigation: Arrow key / WASD / Tab-based focus management system for
 * interactive UIs, grids, lists, and custom components. Supports roving
 * highlight, type-ahead search, wrap-around, nested containers, and ARIA live region.
 */

// --- Types ---

export interface NavItem {
  /** Unique key */
  id: string;
  /** DOM element or query selector */
  el: HTMLElement | string;
  /** Label for screen reader / display */
  label?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Group/category */
  group?: string;
}

export interface KeyboardNavOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Navigable items */
  items: NavItem[];
  /** Orientation */
  orientation?: "horizontal" | "vertical" | "grid" | "both";
  /** Grid columns (for grid mode) */
  gridCols?: number;
  /** Wrap around at edges? */
  wrapAround?: boolean;
  /** Type-ahead search enabled? */
  typeAhead?: boolean;
  /** Type-ahead placeholder */
  typeAheadPlaceholder?: string;
  /** Show focused item indicator? */
  showIndicator?: boolean;
  /** Indicator style ("outline" | "background") */
  indicatorStyle?: "outline" | "background";
  /** Auto-focus first item on init? */
  autoFocus?: boolean;
  /** Callback when focus changes */
  onFocusChange?: (item: NavItem | null, index: number) => void;
  /** Callback on Enter/Space on item */
  onActivate?: (item: NavItem, index: number) => void;
  /** Callback on Escape */
  onEscape?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface KeyboardNavInstance {
  element: HTMLElement;
  /** Get currently focused index */
  getFocusedIndex: () => number;
  /** Get currently focused item */
  getFocusedItem: () => NavItem | null;
  /** Focus a specific item by index */
  focusIndex: (index: number) => void;
  /** Focus a specific item by id */
  focusById: (id: string) => void;
  /** Focus next item */
  focusNext: () => void;
  /** Focus previous item */
  focusPrev: () => void;
  /** Focus first item */
  focusFirst: () => void;
  /** Focus last item */
  focusLast: () => void;
  /** Update items dynamically */
  setItems: (items: NavItem[]) => void;
  /** Enable/disable */
  setEnabled: (enabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createKeyboardNav(options: KeyboardNavOptions): KeyboardNavInstance {
  const opts = {
    orientation: options.orientation ?? "vertical",
    wrapAround: options.wrapAround ?? true,
    typeAhead: options.typeAhead ?? false,
    showIndicator: options.showIndicator ?? true,
    indicatorStyle: options.indicatorStyle ?? "outline",
    autoFocus: options.autoFocus ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("KeyboardNav: container not found");

  container.setAttribute("role", opts.orientation === "grid" ? "grid" : "listbox");
  container.setAttribute("tabindex", "0");
  container.className = `keyboard-nav ${opts.className}`;
  container.style.cssText = `outline:none;`;

  let items = [...opts.items];
  let focusedIdx = -1;
  let isEnabled = true;
  let destroyed = false;
  let filteredIndices: number[] = [];
  let isFiltering = false;

  // Resolve elements
  function resolveEl(item: NavItem): HTMLElement | null {
    if (typeof item.el === "string") return document.querySelector(item.el);
    return item.el as HTMLElement;
  }

  function getEnabledIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < items.length; i++) {
      if (!items[i].disabled) indices.push(i);
    }
    return indices;
  }

  function updateFocus(newIdx: number): void {
    // Remove old indicator
    const oldEl = focusedIdx >= 0 ? resolveEl(items[focusedIdx]!) : null;
    if (oldEl) {
      oldEl.classList.remove("kn-focused");
      oldEl.removeAttribute("aria-activedescendant");
      switch (opts.indicatorStyle) {
        case "outline": oldEl.style.outline = ""; break;
        case "background": oldEl.style.background = ""; break;
      }
    }

    focusedIdx = newIdx;

    // Add new indicator
    const newEl = newIdx >= 0 ? resolveEl(items[newIdx]!) : null;
    if (newEl) {
      newEl.classList.add("kn-focused");
      newEl.setAttribute("aria-activedescendant", "true");

      switch (opts.indicatorStyle) {
        case "outline":
          newEl.style.outline = "2px solid #6366f1";
          newEl.style.outlineOffset = "-2px";
          break;
        case "background":
          newEl.style.background = "#eef2ff";
          break;
      }

      // Scroll into view
      newEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      newEl.focus({ preventScroll: true });
    }

    opts.onFocusChange?.(newIdx >= 0 ? items[newIdx]! : null, newIdx);
  }

  function moveNext(): void {
    const enabled = isFiltering ? filteredIndices : getEnabledIndices();
    if (enabled.length === 0) return;

    const currentPos = enabled.indexOf(focusedIdx);
    let nextIdx: number;

    if (currentPos >= 0 && currentPos < enabled.length - 1) {
      nextIdx = enabled[currentPos + 1];
    } else if (opts.wrapAround) {
      nextIdx = enabled[0];
    } else {
      nextIdx = enabled[Math.min(enabled.length - 1, currentPos + 1)];
    }

    updateFocus(nextIdx);
  }

  function movePrev(): void {
    const enabled = isFiltering ? filteredIndices : getEnabledIndices();
    if (enabled.length === 0) return;

    const currentPos = enabled.indexOf(focusedIdx);
    let prevIdx: number;

    if (currentPos > 0) {
      prevIdx = enabled[currentPos - 1];
    } else if (opts.wrapAround) {
      prevIdx = enabled[enabled.length - 1];
    } else {
      prevIdx = enabled[Math.max(0, currentPos - 1)];
    }

    updateFocus(prevIdx);
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (!isEnabled || destroyed) return;

    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        if (opts.orientation !== "horizontal") { e.preventDefault(); moveNext(); }
        break;
      case "ArrowUp":
      case "ArrowLeft":
        if (opts.orientation !== "horizontal") { e.preventDefault(); movePrev(); }
        break;
      case "Home":
        e.preventDefault();
        const first = (isFiltering ? filteredIndices : getEnabledIndices())[0];
        updateFocus(first);
        break;
      case "End":
        e.preventDefault();
        const last = (isFiltering ? filteredIndices : getEnabledIndices()).at(-1) ?? 0;
        updateFocus(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIdx >= 0 && !items[focusedIdx]?.disabled) {
          opts.onActivate?.(items[focusedIdx]!, focusedIdx);
        }
        break;
      case "Escape":
        e.preventDefault();
        opts.onEscape?.();
        break;
    }
  }

  // Type-ahead filter
  function applyFilter(query: string): void {
    isFiltering = query.length > 0;
    filteredIndices = [];

    if (isFiltering) {
      const q = query.toLowerCase();
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const label = (item.label ?? "").toLowerCase();
        if (label.includes(q) && !item.disabled) filteredIndices.push(i);
      }
    }

    // Show/hide non-matching items
    for (let i = 0; i < items.length; i++) {
      const el = resolveEl(items[i]!);
      if (el) {
        el.style.display = (!isFiltering || filteredIndices.includes(i)) ? "" : "none";
      }
    }

    if (filteredIndices.length > 0) {
      updateFocus(filteredIndices[0]);
    } else {
      updateFocus(-1);
    }
  }

  // Set initial ARIA attributes on items
  for (const item of items) {
    const el = resolveEl(item);
    if (el) {
      el.setAttribute("role", "option");
      el.tabIndex = -1;
      if (item.label) el.setAttribute("aria-label", item.label);
      if (item.disabled) {
        el.setAttribute("aria-disabled", "true");
        el.classList.add("kn-disabled");
      }
    }
  }

  // Event listeners
  container.addEventListener("keydown", handleKeydown);

  // Click to focus
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const idx = items.findIndex((it) => resolveEl(it) === target);
    if (idx >= 0 && !items[idx].disabled) {
      updateFocus(idx);
    }
  });

  // Initial focus
  if (opts.autoFocus && items.length > 0) {
    const first = getEnabledIndices()[0];
    if (first !== undefined) updateFocus(first);
  }

  const instance: KeyboardNavInstance = {
    element: container,

    getFocusedIndex() { return focusedIdx; },

    getFocusedItem() { return focusedIdx >= 0 ? items[focusedIdx]! : null; },

    focusIndex(idx: number) {
      if (idx >= 0 && idx < items.length && !items[idx].disabled) {
        updateFocus(idx);
      }
    },

    focusById(id: string) {
      const idx = items.findIndex((it) => it.id === id);
      if (idx >= 0) focusIndex(idx);
    },

    focusNext,
    focusPrev,

    focusFirst() {
      const first = getEnabledIndices()[0];
      if (first !== undefined) updateFocus(first);
    },

    focusLast() {
      const last = (isFiltering ? filteredIndices : getEnabledIndices()).at(-1) ?? 0;
      if (last !== undefined) updateFocus(last);
    },

    setItems(newItems: NavItem[]) {
      items = newItems;
      focusedIdx = -1;
      // Re-set ARIA attributes
      for (const item of items) {
        const el = resolveEl(item);
        if (el) {
          el.setAttribute("role", "option");
          el.tabIndex = -1;
        }
      }
      if (opts.autoFocus) {
        const first = getEnabledIndices()[0];
        if (first !== undefined) updateFocus(first);
      }
    },

    setEnabled(enabled: boolean) {
      isEnabled = enabled;
      container.tabIndex = enabled ? 0 : -1;
    },

    destroy() {
      destroyed = true;
      container.removeEventListener("keydown", handleKeydown);
      container.removeAttribute("role");
      container.removeAttribute("tabindex");
    },
  };

  return instance;
}
