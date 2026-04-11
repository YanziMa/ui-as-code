/**
 * Context View Utilities: Breadcrumb navigation, view stack management,
 * context-aware headers, back/forward history, and view transition animations.
 */

// --- Types ---

export interface ViewContext {
  /** Unique key for this view */
  id: string;
  /** Display title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Icon (HTML string or element) */
  icon?: string | HTMLElement;
  /** Badge count on the breadcrumb item */
  badge?: number | string;
  /** Data associated with this view */
  data?: unknown;
  /** Whether this view can be navigated to */
  disabled?: boolean;
}

export interface ContextViewOptions {
  /** Initial breadcrumb/context items */
  items: ViewContext[];
  /** Container element */
  container?: HTMLElement;
  /** Maximum depth before truncating (show "...") */
  maxDepth?: number;
  /** Show home/root icon at start? Default true */
  showHome?: boolean;
  /** Home label text. Default "Home" */
  homeLabel?: string;
  /** Home icon (HTML string) */
  homeIcon?: string;
  /** Called when a breadcrumb item is clicked */
  onNavigate?: (context: ViewContext, index: number) => void;
  /** Custom renderer for each item */
  renderItem?: (item: ViewContext, el: HTMLElement, index: number) => void;
  /** Separator between items */
  separator?: string;
  /** Clickable? Default true */
  clickable?: boolean;
  /** Custom class name */
  className?: string;
  /** Show "back" button for mobile/nested views */
  showBackButton?: boolean;
  /** Back button label */
  backLabel?: string;
  /** Called when back is clicked */
  onBack?: () => void;
}

export interface ContextViewInstance {
  /** Root element */
  el: HTMLElement;
  /** Set new context (replaces current) */
  setContext: (items: ViewContext[]) => void;
  /** Push a new context level */
  pushContext: (item: ViewContext) => void;
  /** Pop back one level */
  popContext: () => void;
  /** Get current context stack */
  getContext: () => ViewContext[];
  /** Update a specific item's properties */
  updateItem: (index: number, updates: Partial<ViewContext>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a breadcrumb / context view navigator.
 *
 * @example
 * ```ts
 * const ctx = createContextView({
 *   container: headerEl,
 *   items: [
 *     { id: "home", title: "Dashboard" },
 *     { id: "users", title: "Users", subtitle: "Management" },
 *     { id: "user-42", title: "Alice Johnson" },
 *   ],
 *   onNavigate: (item, idx) => loadView(item.id),
 * });
 * ```
 */
export function createContextView(options: ContextViewOptions): ContextViewInstance {
  const {
    items,
    container,
    maxDepth = 4,
    showHome = true,
    homeLabel = "Home",
    homeIcon = "&#127968;",
    separator = "/",
    clickable = true,
    showBackButton = false,
    backLabel = "Back",
    onNavigate,
    renderItem,
    onBack,
    className,
  } = options;

  let _stack: ViewContext[][] = [items];
  let _currentItems = [...items];

  // Root
  const root = document.createElement("nav");
  root.className = `context-view ${className ?? ""}`.trim();
  root.setAttribute("aria-label", "Breadcrumb");
  root.style.cssText =
    "display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:13px;color:#6b7280;" +
    "min-height:32px;padding:4px 0;";

  (container ?? document.body).appendChild(root);

  // Back button
  let backBtn: HTMLElement | null = null;
  if (showBackButton) {
    backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.innerHTML = `&#8592; ${backLabel}`;
    backBtn.style.cssText =
      "display:none;background:none;border:none;color:#3b82f6;cursor:pointer;" +
      "font-size:13px;padding:4px 8px;border-radius:6px;";
    backBtn.addEventListener("click", () => { popContext(); onBack?.(); });
    root.prepend(backBtn);
  }

  render();

  function render(): void {
    root.innerHTML = "";
    if (backBtn) root.appendChild(backBtn);

    // Show/hide back button
    if (backBtn) {
      backBtn.style.display = _stack.length > 1 ? "" : "none";
    }

    const displayItems = getDisplayItems();

    // Home icon
    if (showHome && displayItems.length > 0) {
      const homeEl = document.createElement("a");
      homeEl.href = "#";
      homeEl.innerHTML = homeIcon ?? "&#127968;";
      homeEl.title = homeLabel;
      homeEl.style.cssText =
        "color:#6b7280;text-decoration:none;display:inline-flex;align-items:center;" +
        "cursor:pointer;padding:4px;border-radius:4px;transition:background 0.12s;" +
        (clickable ? "" : "pointer-events:none;");
      homeEl.addEventListener("click", (e) => { e.preventDefault(); onNavigate?.(displayItems[0]!, 0); });
      homeEl.addEventListener("mouseenter", () => { homeEl.style.background = "#f3f4f6"; });
      homeEl.addEventListener("mouseleave", () => { homeEl.style.background = ""; });
      root.appendChild(homeEl);

      // Separator after home
      const sep = document.createElement("span");
      sep.textContent = separator;
      sep.style.cssText = "color:#d1d5db;margin:0 2px;user-select:none;";
      sep.setAttribute("aria-hidden", "true");
      root.appendChild(sep);
    }

    // Render each item
    displayItems.forEach((item, index) => {
      // Separator
      if (index > 0 || showHome) {
        const sep = document.createElement("span");
        sep.textContent = separator;
        sep.style.cssText = "color:#d1d5db;margin:0 2px;user-select:none;";
        sep.setAttribute("aria-hidden", "true");
        root.appendChild(sep);
      }

      const itemEl = document.createElement(item.disabled && !clickable ? "span" : "a");
      itemEl.href = "#";
      itemEl.dataset.index = String(index);
      itemEl.dataset.viewId = item.id;

      const baseStyle =
        "color:#374151;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" +
        "padding:4px 8px;border-radius:4px;transition:all 0.12s;white-space:nowrap;" +
        "max-width:200px;overflow:hidden;text-overflow:ellipsis;" +
        (item.disabled ? "opacity:0.45;cursor:not-allowed;" : clickable ? "cursor:pointer;" : "");

      itemEl.style.cssText = baseStyle;

      // Icon
      if (item.icon) {
        const iconEl = document.createElement("span");
        iconEl.innerHTML = typeof item.icon === "string" ? item.icon : "";
        iconEl.style.flexShrink = "0";
        itemEl.appendChild(iconEl);
      }

      // Label
      const labelEl = document.createElement("span");
      labelEl.textContent = item.title;
      labelEl.style.fontWeight = index === displayItems.length - 1 ? "600" : "400";
      labelEl.style.color = item.disabled ? "#9ca3af" : "";
      itemEl.appendChild(labelEl);

      // Badge
      if (item.badge !== undefined) {
        const badgeEl = document.createElement("span");
        badgeEl.textContent = String(item.badge);
        badgeEl.style.cssText =
          "background:#ef4444;color:#fff;font-size:10px;font-weight:600;" +
          "padding:1px 6px;border-radius:10px;line-height:14px;";
        itemEl.appendChild(badgeEl);
      }

      // Events
      if (clickable && !item.disabled) {
        itemEl.addEventListener("click", (e) => {
          e.preventDefault();
          onNavigate?.(item, index);
        });
        itemEl.addEventListener("mouseenter", () => { itemEl.style.background = "#eff6ff"; });
        itemEl.addEventListener("mouseleave", () => { itemEl.style.background = ""; });
      }

      // Custom renderer
      renderItem?.(item, itemEl, index);

      root.appendChild(itemEl);
    });

    // Truncation indicator
    if (_currentItems.length > maxDepth + (showHome ? 1 : 0)) {
      const more = document.createElement("span");
      more.textContent = "...";
      more.style.cssText = "color:#9ca3af;padding:0 4px;user-select:none;font-weight:500;";
      more.setAttribute("aria-label", "More items hidden");
      root.appendChild(more);
    }
  }

  function getDisplayItems(): ViewContext[] {
    if (_currentItems.length <= maxDepth + (showHome ? 1 : 0)) {
      return _currentItems;
    }
    // Return first N-1 items + truncated indicator placeholder
    return _currentItems.slice(0, maxDepth - 1);
  }

  // --- Methods ---

  function setContext(newItems: ViewContext[]): void {
    _stack = [newItems];
    _currentItems = [...newItems];
    render();
  }

  function pushContext(item: ViewContext): void {
    _stack.push([..._currentItems, item]);
    _currentItems.push(item);
    render();
  }

  function popContext(): void {
    if (_stack.length > 1) {
      _stack.pop();
      _currentItems = _stack[_stack.length - 1]!;
      render();
    }
  }

  function getContext(): ViewContext[] { return [..._currentItems]; }

  function updateItem(index: number, updates: Partial<ViewContext>): void {
    if (index >= 0 && index < _currentItems.length) {
      Object.assign(_currentItems[index], updates);
      // Also update in all stack levels
      for (const level of _stack) {
        if (level[index]) Object.assign(level[index], updates);
      }
      render();
    }
  }

  function destroy(): void { root.remove(); }

  return { el: root, setContext, pushContext, popContext, getContext, updateItem, destroy };
}
