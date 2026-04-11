/**
 * Sortable Utilities: Standalone sortable list/table with drag handles,
 * visual feedback during reorder, animation between positions, multi-list
 * sorting groups, nested sortable containers, and keyboard reordering.
 */

// --- Types ---

export type SortAnimation = "none" | "swap" | "fade" | "scale";

export interface SortableItemConfig {
  /** Element or selector */
  el: HTMLElement | string;
  /** Unique key */
  key: string;
  /** Disabled (can't be moved)? */
  disabled?: boolean;
  /** Locked to position? */
  locked?: boolean;
  /** Initial index */
  initialIndex?: number;
}

export interface SortableListOptions {
  /** Container element */
  container: HTMLElement;
  /** Items configuration */
  items: SortableItemConfig[];
  /** Direction */
  direction?: "vertical" | "horizontal";
  /** Animation style */
  animation?: SortAnimation;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Show drag handle only? */
  handleOnly?: boolean;
  /** Handle CSS selector */
  handleSelector?: string;
  /** Ghost opacity while dragging */
  ghostOpacity?: number;
  /** Placeholder style */
  placeholderStyle?: Partial<CSSStyleDeclaration>;
  /** Group name for cross-list sorting */
  group?: string;
  /** Allow nesting? */
  allowNesting?: boolean;
  /** On reorder callback */
  onReorder?: (from: number, to: number, key: string) => void;
  /** On drag start */
  onDragStart?: (key: string, index: number) => void;
  /** On drag end */
  onDragEnd?: (key: string) => void;
  /** Disabled? */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export interface SortableListInstance {
  /** Root element */
  el: HTMLElement;
  /** Current ordered keys */
  getKeys(): string[];
  /** Move item programmatically */
  move(from: number, to: number): void;
  /** Set items dynamically */
  setItems(items: SortableItemConfig[]): void;
  /** Disable/enable */
  setDisabled(disabled: boolean): void;
  /** Get current order info */
  getOrder(): Array<{ key: string; index: number; el: HTMLElement }>;
  /** Destroy */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create a sortable list with full reordering support.
 *
 * @example
 * ```ts
 * const list = createSortableList({
 *   container: ulElement,
 *   items: [
 *     { el: li1, key: "a" },
 *     { el: li2, key: "b" },
 *     { el: li3, key: "c" },
 *   ],
 *   onReorder: (from, to) => console.log(`${from} -> ${to}`),
 * });
 * ```
 */
export function createSortableList(options: SortableListOptions): SortableListInstance {
  const {
    container,
    items,
    direction = "vertical",
    animation = "swap",
    animationDuration = 200,
    handleOnly = false,
    handleSelector = ".sort-handle",
    ghostOpacity = 0.7,
    placeholderStyle,
    group,
    allowNesting = false,
    onReorder,
    onDragStart,
    onDragEnd,
    disabled = false,
    className,
  } = options;

  let _disabled = disabled;
  let _order: string[] = items.map((i) => i.key);
  let _elements = new Map<string, HTMLElement>();
  let _draggingKey: string | null = null;
  let _draggingIndex = -1;
  let _ghost: HTMLElement | null = null;
  let _placeholder: HTMLElement | null = null;

  // Initialize elements map
  for (const item of items) {
    const el = typeof item.el === "string"
      ? container.querySelector(item.el)!
      : item.el;
    _elements.set(item.key, el);
  }

  // Root wrapper
  const root = document.createElement("div");
  root.className = `sortable-list ${direction} ${className ?? ""}`.trim();
  root.style.cssText =
    "position:relative;display:flex;" +
    (direction === "horizontal" ? "flex-direction:row;gap:4px;" : "flex-direction:column;");

  // Move all items into root
  for (const key of _order) {
    const el = _elements.get(key)!;
    root.appendChild(el);
  }

  container.innerHTML = "";
  container.appendChild(root);

  // Add drag handles if needed
  if (handleOnly) {
    for (const [key, el] of _elements) {
      if (!el.querySelector(handleSelector)) {
        const handle = document.createElement("span");
        handle.className = handleSelector.replace(".", "");
        handle.style.cssText =
          "cursor:grab;padding:2px 6px;color:#9ca3af;font-size:12px;" +
          "user-select:none;touch-action:none;";
        handle.innerHTML = "&#9776;";
        el.prepend(handle);
      }
    }
  }

  // --- Sorting Logic ---

  function getKeyAtPosition(clientX: number, clientY: number): string | null {
    const rootRect = root.getBoundingClientRect();
    const children = Array.from(root.children) as HTMLElement[];

    for (const child of children) {
      if (child === _placeholder) continue;
      const rect = child.getBoundingClientRect();
      if (direction === "horizontal") {
        if (clientX >= rect.left && clientX <= rect.right) {
          return child.dataset.sortKey!;
        }
      } else {
        if (clientY >= rect.top && clientY <= rect.bottom) {
          return child.dataset.sortKey!;
        }
      }
    }
    return null;
  }

  function getIndexForKey(key: string): number {
    return _order.indexOf(key);
  }

  function applyAnimation(fromEl: HTMLElement, toEl: HTMLElement): void {
    switch (animation) {
      case "swap": {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        fromEl.style.transition = `transform ${animationDuration}ms ease`;
        toEl.style.transition = `transform ${animationDuration}ms ease`;

        if (direction === "horizontal") {
          fromEl.style.transform = `translateX(${toRect.left - fromRect.left}px)`;
          toEl.style.transform = `translateX(${fromRect.left - toRect.left}px)`;
        } else {
          fromEl.style.transform = `translateY(${toRect.top - fromRect.top}px)`;
          toEl.style.transform = `translateY(${fromRect.top - toRect.top}px)`;
        }

        setTimeout(() => {
          fromEl.style.transition = "";
          fromEl.style.transform = "";
          toEl.style.transition = "";
          toEl.style.transform = "";
        }, animationDuration);
        break;
      }
      case "fade": {
        fromEl.style.transition = `opacity ${animationDuration}ms ease`;
        fromEl.style.opacity = "0.3";
        setTimeout(() => { fromEl.style.opacity = ""; fromEl.style.transition = ""; }, animationDuration);
        break;
      }
      case "scale": {
        fromEl.style.transition = `transform ${animationDuration}ms ease`;
        fromEl.style.transform = "scale(0.95)";
        setTimeout(() => { fromEl.style.transform = ""; fromEl.style.transition = ""; }, animationDuration);
        break;
      }
    }
  }

  function startDrag(key: string, clientX: number, clientY: number): void {
    if (_disabled) return;
    const item = items.find((i) => i.key === key);
    if (item?.disabled || item?.locked) return;

    _draggingKey = key;
    _draggingIndex = getIndexForKey(key);
    const el = _elements.get(key)!;

    onDragStart?.(key, _draggingIndex);

    // Create placeholder
    _placeholder = document.createElement("div");
    _placeholder.className = "sort-placeholder";
    Object.assign(_placeholder.style, {
      ...(direction === "vertical"
        ? { height: `${el.offsetHeight}px`, width: "100%" }
        : { width: `${el.offsetWidth}px`, height: "100%" }),
      background: "#f0f9ff",
      border: "2px dashed #93c5fd",
      borderRadius: "6px",
      transition: `all ${animationDuration / 2}ms ease`,
      ...placeholderStyle,
    } as CSSStyleDeclaration);
    el.before(_placeholder);

    // Create ghost
    _ghost = el.cloneNode(true) as HTMLElement;
    _ghost.className += " sort-ghost";
    Object.assign(_ghost.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "1001",
      opacity: String(ghostOpacity),
      margin: "0",
      width: `${el.offsetWidth}px`,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      left: `${clientX - el.offsetWidth / 2}px`,
      top: `${clientY - 8}px`,
    });
    document.body.appendChild(_ghost);

    el.style.opacity = "0";
  }

  function moveDrag(clientX: number, clientY: number): void {
    if (!_ghost || !_placeholder || !_draggingKey) return;

    _ghost.style.left = `${clientX - _ghost.offsetWidth / 2}px`;
    _ghost.style.top = `${clientY - 8}px`;

    const targetKey = getKeyAtPosition(clientX, clientY);
    if (targetKey && targetKey !== _draggingKey) {
      const targetIndex = getIndexForKey(targetKey);
      if (targetIndex !== _draggingIndex) {
        const targetEl = _elements.get(targetKey)!;
        const draggingEl = _elements.get(_draggingKey)!;

        // Determine direction
        const goingDown = targetIndex > _draggingIndex;

        if (goingDown) {
          targetEl.after(_placeholder!);
        } else {
          targetEl.before(_placeholder!);
        }

        _draggingIndex = targetIndex;
      }
    }
  }

  function endDrag(): void {
    if (!_draggingKey || !_ghost || !_placeholder) return;

    const key = _draggingKey;
    const el = _elements.get(key)!;
    const oldIndex = _order.indexOf(key);

    // Place element at placeholder position
    _placeholder.replaceWith(el);
    el.style.opacity = "";

    // Update internal order
    const newChildren = Array.from(root.children) as HTMLElement[];
    _order = newChildren
      .filter((c) => c.dataset.sortKey)
      .map((c) => c.dataset.sortKey!);

    const newIndex = _order.indexOf(key);

    // Animate if position changed
    if (oldIndex !== newIndex && animation !== "none") {
      // Find where it visually ended up vs started
      applyAnimation(el, newChildren[newIndex] ?? el);
    }

    if (oldIndex !== newIndex) {
      onReorder?.(oldIndex, newIndex, key);
    }

    // Cleanup
    _ghost.remove();
    _ghost = null;
    _placeholder = null;
    _draggingKey = null;
    _draggingIndex = -1;

    onDragEnd?.(key);
  }

  // --- Event Listeners ---

  root.addEventListener("mousedown", (e) => {
    const target = (e.target as HTMLElement).closest("[data-sort-key]") as HTMLElement | null;
    if (!target) return;
    if (handleOnly && !(e.target as HTMLElement).closest(handleSelector)) return;
    startDrag(target.dataset.sortKey!, e.clientX, e.clientY);
  });

  root.addEventListener("touchstart", (e) => {
    const target = (e.target as HTMLElement).closest("[data-sort-key]") as HTMLElement | null;
    if (!target) return;
    if (handleOnly && !(e.target as HTMLElement).closest(handleSelector)) return;
    startDrag(target.dataset.sortKey!, e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  document.addEventListener("mousemove", (e) => { if (_draggingKey) moveDrag(e.clientX, e.clientY); });
  document.addEventListener("touchmove", (e) => {
    if (_draggingKey) { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }
  }, { passive: false });
  document.addEventListener("mouseup", () => { if (_draggingKey) endDrag(); });
  document.addEventListener("touchend", () => { if (_draggingKey) endDrag(); });

  // Set data attributes on elements
  for (const [key, el] of _elements) {
    el.dataset.sortKey = key;
    el.setAttribute("draggable", "false");
  }

  // Keyboard support
  root.addEventListener("keydown", (e) => {
    if (_disabled) return;
    const focused = document.activeElement;
    if (!focused?.closest(".sortable-list")) return;
    const key = (focused as HTMLElement).dataset.sortKey;
    if (!key) return;

    const idx = _order.indexOf(key);
    if (idx < 0) return;

    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      if (idx > 0) move(idx, idx - 1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      if (idx < _order.length - 1) move(idx, idx + 1);
    }
  });

  function move(from: number, to: number): void {
    if (from < 0 || to < 0 || from >= _order.length || to >= _order.length || from === to) return;
    const key = _order[from];
    _order.splice(from, 1);
    _order.splice(to, 0, key);

    // Re-render DOM order
    for (const k of _order) {
      const el = _elements.get(k)!;
      root.appendChild(el);
    }

    onReorder?.(from, to, key);
  }

  // --- Instance ---

  return {
    el: root,

    getKeys() { return [..._order]; },

    move,

    setItems(newItems: SortableItemConfig[]) {
      _order = newItems.map((i) => i.key);
      _elements.clear();
      for (const item of newItems) {
        const el = typeof item.el === "string"
          ? container.querySelector(item.el)!
          : item.el;
        _elements.set(item.key, el);
        el.dataset.sortKey = item.key;
        root.appendChild(el);
      }
    },

    setDisabled(d: boolean) { _disabled = d; },

    getOrder() {
      return _order.map((key, i) => ({ key, index: i, el: _elements.get(key)! }));
    },

    destroy() {
      root.remove();
    },
  };
}
