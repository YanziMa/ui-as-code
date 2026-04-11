/**
 * Collapse Utilities: Lightweight collapsible panels, expandable sections,
 * animated height transitions, nested collapse groups, and disclosure patterns.
 */

// --- Types ---

export type CollapseEasing = "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
export type CollapseState = "collapsed" | "expanding" | "expanded" | "collapsing";

export interface CollapseOptions {
  /** Content element to collapse/expand */
  content: HTMLElement;
  /** Initially expanded? */
  defaultExpanded?: boolean;
  /** Animation duration (ms) */
  duration?: number;
  /** Easing function */
  easing?: CollapseEasing;
  /** Horizontal collapse instead of vertical */
  horizontal?: boolean;
  /** Keep rendered in DOM when collapsed (display:none vs visibility:hidden) */
  unmountOnCollapse?: boolean;
  /** Custom class name for wrapper */
  className?: string;
  /** Called when expanded */
  onExpand?: () => void;
  /** Called when collapsed */
  onCollapse?: () => void;
  /** Called on state change */
  onStateChange?: (state: CollapseState) => void;
}

export interface CollapseInstance {
  /** Wrapper element around content */
  el: HTMLElement;
  /** Get current state */
  getState: () => CollapseState;
  /** Check if expanded */
  isExpanded: () => boolean;
  /** Expand the panel */
  expand: () => void;
  /** Collapse the panel */
  collapse: () => void;
  /** Toggle */
  toggle: () => void;
  /** Set new duration dynamically */
  setDuration: (ms: number) => void;
  /** Destroy and unwrap content */
  destroy: () => void;
}

export interface CollapseGroupOptions {
  /** Named collapses in the group */
  items: Array<{
    id: string;
    label: string;
    content: HTMLElement | string;
    defaultOpen?: boolean;
    disabled?: boolean;
  }>;
  /** Accordion mode (only one open at a time) */
  accordion?: boolean;
  /** Duration per item */
  duration?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show chevron icons */
  showChevrons?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Called when any item changes */
  onChange?: (id: string, expanded: boolean) => void;
  /** Custom class name */
  className?: string;
}

export interface CollapseGroupInstance {
  /** Root element */
  el: HTMLElement;
  /** Expand by ID */
  expand: (id: string) => void;
  /** Collapse by ID */
  collapse: (id: string) => void;
  /** Toggle by ID */
  toggle: (id: string) => void;
  /** Expand all */
  expandAll: () => void;
  /** Collapse all */
  collapseAll: () => void;
  /** Get open IDs */
  getOpenIds: () => string[];
  /** Destroy */
  destroy: () => void;
}

// --- Core Factory: Single Collapse ---

/**
 * Create a single collapsible panel with smooth height animation.
 *
 * @example
 * ```ts
 * const panel = createCollapse({
 *   content: document.getElementById("panel-content")!,
 *   defaultExpanded: false,
 *   duration: 300,
 * });
 * // Later:
 * panel.expand();
 * panel.collapse();
 * ```
 */
export function createCollapse(options: CollapseOptions): CollapseInstance {
  const {
    content,
    defaultExpanded = false,
    duration = 250,
    easing = "ease-in-out",
    horizontal = false,
    unmountOnCollapse = true,
    className,
    onExpand,
    onCollapse,
    onStateChange,
  } = options;

  let _state: CollapseState = defaultExpanded ? "expanded" : "collapsed";
  let _currentDuration = duration;
  let _animFrame: number | null = null;
  let _timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `collapse-panel ${className ?? ""}`.trim();

  const dimension = horizontal ? "width" : "height";
  const oppositeDimension = horizontal ? "height" : "width";

  wrapper.style.cssText =
    `overflow:hidden;${oppositeDimension}:auto;` +
    "transition:none;will-change:auto;";
  if (!defaultExpanded && unmountOnCollapse) {
    wrapper.style[dimension as "height"] = "0px";
    content.style.display = "none";
  }

  // Insert wrapper before content, move content inside
  content.parentNode?.insertBefore(wrapper, content);
  wrapper.appendChild(content);

  function _setState(newState: CollapseState): void {
    _state = newState;
    onStateChange?.(newState);
  }

  function _measureFullSize(): string {
    if (unmountOnCollapse && content.style.display === "none") {
      content.style.display = "";
      const size = content[offsetDimension] + "px";
      content.style.display = "none";
      return size;
    }
    return content[offsetDimension] + "px";
  }

  const offsetDimension = horizontal ? "offsetWidth" : "offsetHeight";

  function expand(): void {
    if (_state === "expanded" || _state === "expanding") return;

    // Cancel any pending animation
    _cancelPending();

    _setState("expanding");

    if (unmountOnCollapse) {
      content.style.display = "";
    }

    const fullSize = _measureFullSize();
    wrapper.style.overflow = "hidden";
    wrapper.style.transition = `${dimension} ${_currentDuration}ms ${easing}`;
    wrapper.style[dimension as "height"] = "0px";

    // Force reflow
    void wrapper.offsetHeight;

    wrapper.style[dimension as "height"] = fullSize;

    _timeoutId = setTimeout(() => {
      wrapper.style[dimension as "height"] = "";
      wrapper.style.overflow = "";
      wrapper.style.transition = "";
      _setState("expanded");
      onExpand?.();
    }, _currentDuration);
  }

  function collapse(): void {
    if (_state === "collapsed" || _state === "collapsing") return;

    _cancelPending();
    _setState("collapsing");

    const currentSize = content[offsetDimension] + "px";

    wrapper.style.overflow = "hidden";
    wrapper.style.transition = `${dimension} ${_currentDuration}ms ${easing}`;
    wrapper.style[dimension as "height"] = currentSize;

    // Force reflow
    void wrapper.offsetHeight;

    wrapper.style[dimension as "height"] = "0px";

    _timeoutId = setTimeout(() => {
      if (unmountOnCollapse) {
        content.style.display = "none";
      }
      wrapper.style[dimension as "height"] = "";
      wrapper.style.overflow = "";
      wrapper.style.transition = "";
      _setState("collapsed");
      onCollapse?.();
    }, _currentDuration);
  }

  function toggle(): void {
    _state === "expanded" || _state === "expanding" ? collapse() : expand();
  }

  function setDuration(ms: number): void { _currentDuration = ms; }

  function _cancelPending(): void {
    if (_timeoutId !== null) { clearTimeout(_timeoutId); _timeoutId = null; }
    if (_animFrame !== null) { cancelAnimationFrame(_animFrame); _animFrame = null; }
  }

  function destroy(): void {
    _cancelPending();
    // Unwrap content
    if (wrapper.parentNode) {
      wrapper.parentNode.insertBefore(content, wrapper);
      wrapper.remove();
    }
    content.style.display = "";
  }

  return { el: wrapper, getState: () => _state, isExpanded: () => _state === "expanded" || _state === "expanding", expand, collapse, toggle, setDuration, destroy };
}

// --- Core Factory: Collapse Group ---

/**
 * Create a group of collapsible panels (like an accordion or FAQ).
 *
 * @example
 * ```ts
 * const group = createCollapseGroup({
 *   items: [
 *     { id: "faq1", label: "How does it work?", content: "<p>It works like this...</p>" },
 *     { id: "faq2", label: "Is it free?", content: "<p>Yes, the basic plan is free.</p>", defaultOpen: true },
 *   ],
 *   accordion: true,
 * });
 * ```
 */
export function createCollapseGroup(options: CollapseGroupOptions): CollapseGroupInstance {
  const {
    items,
    accordion = false,
    duration = 250,
    size = "md",
    showChevrons = true,
    container,
    onChange,
    className,
  } = options;

  const _openIds = new Set<string>(items.filter((i) => i.defaultOpen).map((i) => i.id));
  const _panels = new Map<string, { headerEl: HTMLElement; contentEl: HTMLElement; contentWrapper: HTMLElement }>();

  const root = document.createElement("div");
  root.className = `collapse-group ${size} ${className ?? ""}`.trim();
  root.style.cssText = "display:flex;flex-direction:column;gap:4px;width:100%;";

  const sizeStyles: Record<string, { padding: string; fontSize: string }> = {
    sm: { padding: "8px 12px", fontSize: "13px" },
    md: { padding: "12px 16px", fontSize: "14px" },
    lg: { padding: "14px 20px", fontSize: "15px" },
  };

  const ss = sizeStyles[size];

  for (const item of items) {
    const isOpen = _openIds.has(item.id);
    const disabled = item.disabled ?? false;

    // Item wrapper
    const itemWrapper = document.createElement("div");
    itemWrapper.className = "collapse-group-item";
    itemWrapper.dataset.collapseId = item.id;
    itemWrapper.style.cssText =
      "border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;" +
      (disabled ? "opacity:0.5;" : "");

    // Header button
    const header = document.createElement("button");
    header.type = "button";
    header.className = "collapse-group-header";
    header.setAttribute("aria-expanded", String(isOpen));
    header.setAttribute("disabled", String(disabled));
    header.style.cssText =
      `display:flex;align-items:center;gap:8px;width:100%;${ss.padding};` +
      "border:none;background:none;cursor:pointer;font-size:" + ss.fontSize + ";" +
      "font-weight:500;color:#374151;text-align:left;user-select:none;" +
      (disabled ? "cursor:not-allowed;" : "");

    // Chevron
    if (showChevrons) {
      const chevron = document.createElement("span");
      chevron.className = "collapse-chevron";
      chevron.innerHTML = "&#9662;";
      chevron.style.cssText =
        `font-size:10px;color:#9ca3af;transition:transform ${duration}ms ease;` +
        (isOpen ? "transform:rotate(180deg);" : "") +
        "flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;";
      header.appendChild(chevron);
    }

    // Label
    const labelSpan = document.createElement("span");
    labelSpan.className = "collapse-label";
    labelSpan.textContent = item.label;
    labelSpan.style.cssText = "flex:1;text-align:left;line-height:1.3;";
    header.appendChild(labelSpan);

    header.addEventListener("click", () => {
      if (disabled) return;
      toggle(item.id);
    });

    if (!disabled) {
      header.addEventListener("mouseenter", () => { itemWrapper.style.borderColor = "#d1d5db"; });
      header.addEventListener("mouseleave", () => { itemWrapper.style.borderColor = "#e5e7eb"; });
    }

    itemWrapper.appendChild(header);

    // Content area
    const contentArea = document.createElement("div");
    contentArea.className = "collapse-content-area";
    contentArea.setAttribute("role", "region");
    contentArea.style.cssText =
      `overflow:hidden;${isOpen ? "" : "display:none;"};` +
      `padding:${ss.padding};font-size:13px;color:#4b5563;line-height:1.6;border-top:1px solid #f3f4f6;`;

    const contentInner = document.createElement("div");
    contentInner.className = "collapse-content-inner";

    if (typeof item.content === "string") {
      contentInner.innerHTML = item.content;
    } else {
      contentInner.appendChild(item.content.cloneNode(true));
    }

    contentArea.appendChild(contentInner);
    itemWrapper.appendChild(contentArea);
    root.appendChild(itemWrapper);

    _panels.set(item.id, {
      headerEl: header,
      contentEl: contentInner,
      contentWrapper: contentArea,
    });
  }

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function _animateItem(id: string, expanding: boolean): void {
    const panel = _panels.get(id);
    if (!panel) return;

    const { headerEl, contentWrapper } = panel;
    const chevron = headerEl.querySelector(".collapse-chevron") as HTMLElement | null;

    headerEl.setAttribute("aria-expanded", String(expanding));
    if (chevron) chevron.style.transform = expanding ? "rotate(180deg)" : "";

    if (expanding) {
      contentWrapper.style.display = "";
      contentWrapper.style.height = "0px";
      contentWrapper.style.overflow = "hidden";
      contentWrapper.style.transition = `height ${duration}ms ease-in-out`;

      void contentWrapper.offsetHeight; // reflow

      const fullHeight = contentInnerHeight(contentWrapper);
      contentWrapper.style.height = fullHeight + "px";

      setTimeout(() => {
        contentWrapper.style.height = "";
        contentWrapper.style.overflow = "";
        contentWrapper.style.transition = "";
        onChange?.(id, true);
      }, duration);
    } else {
      const h = contentInnerHeight(contentWrapper);
      contentWrapper.style.height = h + "px";
      contentWrapper.style.overflow = "hidden";
      contentWrapper.style.transition = `height ${duration}ms ease-in-out`;

      void contentWrapper.offsetHeight; // reflow

      contentWrapper.style.height = "0px";

      setTimeout(() => {
        contentWrapper.style.display = "none";
        contentWrapper.style.height = "";
        contentWrapper.style.overflow = "";
        contentWrapper.style.transition = "";
        onChange?.(id, false);
      }, duration);
    }
  }

  function contentInnerHeight(el: HTMLElement): number {
    const inner = el.querySelector(".collapse-content-inner") as HTMLElement;
    return inner ? inner.offsetHeight : el.offsetHeight;
  }

  function expand(id: string): void {
    if (!_openIds.has(id)) {
      if (accordion) {
        for (const openId of [..._openIds]) {
          if (openId !== id) _animateItem(openId, false);
          _openIds.delete(openId);
        }
      }
      _openIds.add(id);
      _animateItem(id, true);
    }
  }

  function collapse(id: string): void {
    if (_openIds.has(id)) {
      _openIds.delete(id);
      _animateItem(id, false);
    }
  }

  function toggle(id: string): void {
    _openIds.has(id) ? collapse(id) : expand(id);
  }

  function expandAll(): void {
    if (accordion) return;
    for (const item of items) {
      if (!item.disabled) expand(item.id);
    }
  }

  function collapseAll(): void {
    for (const id of [..._openIds]) collapse(id);
  }

  function getOpenIds(): string[] { return [..._openIds]; }

  function destroy(): void { root.remove(); }

  return { el: root, expand, collapse, toggle, expandAll, collapseAll, getOpenIds, destroy };
}
