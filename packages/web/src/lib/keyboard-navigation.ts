/**
 * Keyboard Navigation: Arrow-key navigation for lists, grids, menus, and custom
 * collections. Supports roving tabindex, typeahead search, wrap-around,
 * disabled item skipping, orientation (horizontal/vertical/grid), and ARIA patterns.
 */

// --- Types ---

export type NavOrientation = "horizontal" | "vertical" | "grid" | "both";
export type NavWrap = "wrap" | "clamp" | "cycle";

export interface NavItem {
  /** Unique key */
  key: string;
  /** DOM element reference */
  element: HTMLElement;
  /** Disabled state */
  disabled?: boolean;
  /** Hidden from navigation */
  hidden?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface KeyboardNavOptions {
  /** Items to navigate */
  items: NavItem[];
  /** Orientation of the list */
  orientation?: NavOrientation;
  /** Number of columns (for grid mode) */
  columns?: number;
  /** Wrap behavior at boundaries */
  wrap?: NavWrap;
  /** Initially focused index (-1 = none) */
  initialIndex?: number;
  /** Enable typeahead (type letters to jump) */
  typeahead?: boolean;
  /** Typeahead timeout in ms (default: 500) */
  typeaheadTimeout?: number;
  /** Callback when focus changes */
  onFocusChange?: (index: number, item: NavItem) => void;
  /** Callback before focus change (return false to prevent) */
  beforeFocusChange?: (index: number, item: NavItem) => boolean | void;
  /** Callback on Enter/Space on active item */
  onActivate?: (index: number, item: NavItem) => void;
  /** Callback on Home key */
  onHome?: () => void;
  /** Callback on End key */
  onEnd?: () => void;
  /** Callback on Escape */
  onEscape?: () => void;
  /** Auto-focus first enabled item on init? */
  autoFocus?: boolean;
}

export interface KeyboardNavInstance {
  /** Currently focused index */
  currentIndex: number;
  /** Get current item */
  getCurrentItem: () => NavItem | null;
  /** Set focus by index */
  setIndex: (index: number) => boolean;
  /** Move to next item */
  next: () => void;
  /** Move to previous item */
  prev: () => void;
  /** Move up (in grid mode) */
  up: () => void;
  /** Move down (in grid mode) */
  down: () => void;
  /** Go to first item */
  first: () => void;
  /** Go to last item */
  last: () => void;
  /** Update items dynamically */
  setItems: (items: NavItem[]) => void;
  /** Add an item */
  addItem: (item: NavItem) => void;
  /** Remove an item by key */
  removeItem: (key: string) => void;
  /** Enable/disable an item */
  setDisabled: (key: string, disabled: boolean) => void;
  /** Get all enabled indices */
  getEnabledIndices: () => number[];
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createKeyboardNav(options: KeyboardNavOptions): KeyboardNavInstance {
  const opts = {
    orientation: options.orientation ?? "vertical",
    columns: options.columns ?? 1,
    wrap: options.wrap ?? "clamp",
    initialIndex: options.initialIndex ?? -1,
    typeahead: options.typeahead ?? true,
    typeaheadTimeout: options.typeaheadTimeout ?? 500,
    autoFocus: options.autoFocus ?? true,
    ...options,
  };

  let items = [...options.items];
  let currentIndex = opts.initialIndex;
  let destroyed = false;

  // Typeahead state
  let typeaheadBuffer = "";
  let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

  // Get only visible + enabled items
  function getEnabledItems(): { items: NavItem[]; indices: number[] } {
    const enabled: NavItem[] = [];
    const indices: number[] = [];
    for (let i = 0; i < items.length; i++) {
      if (!items[i]!.disabled && !items[i]!.hidden) {
        enabled.push(items[i]!);
        indices.push(i);
      }
    }
    return { items: enabled, indices };
  }

  function getEnabledIndices(): number[] {
    return getEnabledItems().indices;
  }

  function clampIndex(idx: number): number {
    const enabled = getEnabledIndices();
    if (enabled.length === 0) return -1;
    if (idx < 0) return opts.wrap === "cycle" ? enabled[enabled.length - 1]! : enabled[0]!;
    if (idx >= items.length) return opts.wrap === "cycle" ? enabled[0]! : enabled[enabled.length - 1]!;
    // If target is disabled/hidden, find nearest enabled
    if (items[idx]?.disabled || items[idx]?.hidden) {
      // Search forward first
      for (const ei of enabled) {
        if (ei >= idx) return ei;
      }
      return enabled[enabled.length - 1]!;
    }
    return idx;
  }

  function setIndex(index: number): boolean {
    if (destroyed) return false;
    const clamped = clampIndex(index);
    if (clamped === -1 || clamped === currentIndex) return false;

    const item = items[clamped];
    if (!item) return false;

    // Before hook
    if (opts.beforeFocusChange?.(clamped, item) === false) return false;

    const prevIndex = currentIndex;
    currentIndex = clamped;

    // Update aria / visual focus
    updateVisualFocus(prevIndex, clamped);

    opts.onFocusChange?.(clamped, item);
    return true;
  }

  function updateVisualFocus(prevIdx: number, newIdx: number): void {
    // Remove previous focus styling
    if (prevIdx >= 0 && prevIdx < items.length && items[prevIdx]) {
      const el = items[prevIdx]!.element;
      el.setAttribute("tabindex", "-1");
      el.removeAttribute("aria-selected");
      el.classList.remove("nav-focused");
    }

    // Set new focus styling
    if (newIdx >= 0 && newIdx < items.length && items[newIdx]) {
      const el = items[newIdx]!.element;
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-selected", "true");
      el.classList.add("nav-focused");
      el.focus({ preventScroll: true });
    }
  }

  function next(): void {
    const enabled = getEnabledIndices();
    if (enabled.length === 0) return;
    const currentPos = enabled.indexOf(currentIndex);
    if (currentPos < 0) { setIndex(enabled[0]!); return; }
    if (currentPos < enabled.length - 1) { setIndex(enabled[currentPos + 1]!); return; }
    if (opts.wrap === "wrap" || opts.wrap === "cycle") { setIndex(enabled[0]!); }
  }

  function prev(): void {
    const enabled = getEnabledIndices();
    if (enabled.length === 0) return;
    const currentPos = enabled.indexOf(currentIndex);
    if (currentPos <= 0) {
      if (opts.wrap === "wrap" || opts.wrap === "cycle") { setIndex(enabled[enabled.length - 1]!); }
      return;
    }
    setIndex(enabled[currentPos - 1]!);
  }

  function up(): void {
    if (opts.orientation !== "grid" && opts.orientation !== "both") { prev(); return; }
    const cols = opts.columns;
    const enabled = getEnabledIndices();
    const pos = enabled.indexOf(currentIndex);
    if (pos < 0) { setIndex(enabled[0]!); return; }
    const targetPos = pos - cols;
    if (targetPos >= 0) { setIndex(enabled[targetPos]!); }
    else if (opts.wrap === "wrap" || opts.wrap === "cycle") {
      // Wrap to last row same column
      const col = pos % cols;
      const lastRowStart = Math.floor((enabled.length - 1) / cols) * cols;
      const wrapTarget = Math.min(lastRowStart + col, enabled.length - 1);
      if (wrapTarget >= 0) setIndex(enabled[wrapTarget]!);
    }
  }

  function down(): void {
    if (opts.orientation !== "grid" && opts.orientation !== "both") { next(); return; }
    const cols = opts.columns;
    const enabled = getEnabledIndices();
    const pos = enabled.indexOf(currentIndex);
    if (pos < 0) { setIndex(enabled[0]!); return; }
    const targetPos = pos + cols;
    if (targetPos < enabled.length) { setIndex(enabled[targetPos]!); }
    else if (opts.wrap === "wrap" || opts.wrap === "cycle") {
      const col = pos % cols;
      const wrapTarget = Math.min(col, enabled.length - 1);
      if (wrapTarget >= 0) setIndex(enabled[wrapTarget]!);
    }
  }

  function first(): void {
    const enabled = getEnabledIndices();
    if (enabled.length > 0) { setIndex(enabled[0]!); opts.onHome?.(); }
  }

  function last(): void {
    const enabled = getEnabledIndices();
    if (enabled.length > 0) { setIndex(enabled[enabled.length - 1]!); opts.onEnd?.(); }
  }

  function handleTypeahead(key: string): void {
    if (!opts.typeahead) return;

    typeaheadBuffer += key.toLowerCase();

    // Reset timer
    if (typeaheadTimer) clearTimeout(typeaheadTimer);
    typeaheadTimer = setTimeout(() => {
      typeaheadBuffer = "";
    }, opts.typeaheadTimeout);

    // Search for matching item
    const enabled = getEnabledIndices();
    for (const idx of enabled) {
      const label = getItemLabel(items[idx]!);
      if (label.toLowerCase().startsWith(typeaheadBuffer)) {
        setIndex(idx);
        return;
      }
    }

    // No match starting from beginning, try contains
    if (typeaheadBuffer.length >= 2) {
      for (const idx of enabled) {
        const label = getItemLabel(items[idx]!);
        if (label.toLowerCase().includes(typeaheadBuffer)) {
          setIndex(idx);
          return;
        }
      }
    }
  }

  function getItemLabel(item: NavItem): string {
    const el = item.element;
    return (
      el.getAttribute("aria-label") ||
      el.getAttribute("data-label") ||
      el.textContent?.trim() ||
      item.key
    );
  }

  // Keydown handler
  function handleKeyDown(e: KeyboardEvent): void {
    if (destroyed) return;

    switch (e.key) {
      case "ArrowDown":
        if (opts.orientation === "horizontal") return;
        e.preventDefault();
        down();
        break;
      case "ArrowUp":
        if (opts.orientation === "horizontal") return;
        e.preventDefault();
        up();
        break;
      case "ArrowRight":
        if (opts.orientation === "vertical") return;
        e.preventDefault();
        next();
        break;
      case "ArrowLeft":
        if (opts.orientation === "vertical") return;
        e.preventDefault();
        prev();
        break;
      case "Home":
        e.preventDefault();
        first();
        break;
      case "End":
        e.preventDefault();
        last();
        break;
      case "Enter":
      case " ": {
        if (currentIndex >= 0 && items[currentIndex]) {
          e.preventDefault();
          opts.onActivate?.(currentIndex, items[currentIndex]!);
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        opts.onEscape?.();
        break;
      default:
        // Typeahead: check if it's a printable character
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          handleTypeahead(e.key);
        }
        break;
    }
  }

  // Attach global keydown listener
  document.addEventListener("keydown", handleKeyDown);

  // Initial setup: set roving tabindex pattern
  function setupRovingTabindex(): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      if (i === currentIndex) {
        item.element.setAttribute("tabindex", "0");
        item.element.classList.add("nav-focused");
      } else {
        item.element.setAttribute("tabindex", "-1");
        item.element.classList.remove("nav-focused");
      }
    }
  }

  setupRovingTabindex();

  // Auto-focus first enabled item
  if (opts.autoFocus && currentIndex < 0) {
    const enabled = getEnabledIndices();
    if (enabled.length > 0) {
      currentIndex = enabled[0]!;
      setupRovingTabindex();
      items[currentIndex]!.element.focus({ preventScroll: true });
    }
  }

  const instance: KeyboardNavInstance = {
    get currentIndex() { return currentIndex; },

    getCurrentItem() {
      return currentIndex >= 0 ? items[currentIndex] ?? null : null;
    },

    setIndex,

    next,
    prev,
    up,
    down,
    first,
    last,

    setItems(newItems: NavItem[]) {
      items = [...newItems];
      currentIndex = Math.min(currentIndex, items.length - 1);
      setupRovingTabindex();
    },

    addItem(item: NavItem) {
      items.push(item);
      setupRovingTabindex();
    },

    removeItem(key: string) {
      const idx = items.findIndex((i) => i.key === key);
      if (idx >= 0) {
        items.splice(idx, 1);
        if (currentIndex >= items.length) currentIndex = items.length - 1;
        if (currentIndex === idx) {
          const enabled = getEnabledIndices();
          currentIndex = enabled[Math.min(idx, enabled.length - 1)] ?? -1;
        }
        setupRovingTabindex();
      }
    },

    setDisabled(key: string, disabled: boolean) {
      const item = items.find((i) => i.key === key);
      if (item) {
        item.disabled = disabled;
        item.element.disabled = disabled;
        item.element.setAttribute("aria-disabled", String(disabled));
        if (disabled && currentIndex === items.indexOf(item)) {
          next();
        }
      }
    },

    getEnabledIndices,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("keydown", handleKeyDown);
      if (typeaheadTimer) clearTimeout(typeaheadTimer);
      // Clean up attributes
      for (const item of items) {
        item.element.removeAttribute("tabindex");
        item.element.removeAttribute("aria-selected");
        item.element.classList.remove("nav-focused");
      }
    },
  };

  return instance;
}
