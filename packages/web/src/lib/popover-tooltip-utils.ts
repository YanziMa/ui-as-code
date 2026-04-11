/**
 * Popover Tooltip Utilities: Rich tooltip/popover hybrid with header,
 * body, footer sections, interactive content, multiple trigger modes,
 * animation variants, and portal rendering.
 */

// --- Types ---

export type PopoverTooltipPlacement = "top" | "bottom" | "left" | "right";
export type PopoverTooltipTrigger = "hover" | "click" | "focus" | "manual";

export interface PopoverTooltipContent {
  /** Title/header text */
  title?: string;
  /** Body content (string or element) */
  body: string | HTMLElement;
  /** Footer action text */
  footerAction?: string;
  /** On footer click */
  onFooterClick?: () => void;
  /** Icon (HTML string) for the title area */
  icon?: string;
}

export interface PopoverTooltipOptions {
  /** Target element to attach to */
  target: HTMLElement;
  /** Content configuration */
  content: PopoverTooltipContent;
  /** Placement preference */
  placement?: PopoverTooltipPlacement;
  /** Trigger mode */
  trigger?: PopoverTooltipTrigger;
  /** Show delay (ms) */
  showDelay?: number;
  /** Hide delay (ms) */
  hideDelay?: number;
  /** Width in px or CSS value */
  width?: number | string;
  /** Max height (px) */
  maxHeight?: number;
  /** Show arrow indicator */
  arrow?: boolean;
  /** Animation style: "fade", "scale", "slide" */
  animation?: "fade" | "scale" | "slide";
  /** Close on outside click */
  closeOnOutside?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Offset from target (px) */
  offset?: number;
  /** Custom class name */
  className?: string;
  /** Called when shown */
  onShow?: () => void;
  /** Called when hidden */
  onHide?: () => void;
}

export interface PopoverTooltipInstance {
  /** The popover element */
  el: HTMLElement;
  /** Show the popover */
  show(): void;
  /** Hide the popover */
  hide(): void;
  /** Toggle visibility */
  toggle(): void;
  /** Check if visible */
  isVisible(): boolean;
  /** Update content dynamically */
  updateContent(content: PopoverTooltipContent): void;
  /** Reposition */
  reposition(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create a rich popover/tooltip hybrid component.
 *
 * @example
 * ```ts
 * const pop = createPopoverTooltip({
 *   target: buttonEl,
 *   content: {
 *     title: "Notifications",
 *     body: "You have 3 new messages",
 *     footerAction: "View all",
 *     onFooterClick: () => navigate("/notifications"),
 *   },
 *   placement: "bottom",
 * });
 * ```
 */
export function createPopoverTooltip(options: PopoverTooltipOptions): PopoverTooltipInstance {
  const {
    target,
    content,
    placement = "bottom",
    trigger = "hover",
    showDelay = 200,
    hideDelay = 150,
    width = 280,
    maxHeight = 300,
    arrow = true,
    animation = "scale",
    closeOnOutside = true,
    closeOnEscape = true,
    offset = 8,
    className,
    onShow,
    onHide,
  } = options;

  let _visible = false;
  let _showTimer: ReturnType<typeof setTimeout> | null = null;
  let _hideTimer: ReturnType<typeof setTimeout> | null = null;
  const cleanupFns: Array<() => void> = [];

  // Root element
  const el = document.createElement("div");
  el.className = `popover-tooltip ${placement} ${animation} ${className ?? ""}`.trim();
  el.setAttribute("role", "tooltip");
  el.style.cssText =
    `position:fixed;z-index:9999;width:${typeof width === "number" ? `${width}px` : width};` +
    "background:#fff;border:1px solid #e5e7eb;border-radius:10px;" +
    "box-shadow:0 10px 32px rgba(0,0,0,0.12);opacity:0;pointer-events:none;" +
    "transition:opacity 0.15s ease, transform 0.15s ease;visibility:hidden;";

  // Arrow
  let arrowEl: HTMLElement | null = null;
  if (arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "popover-arrow";
    arrowEl.style.cssText =
      "position:absolute;width:10px;height:10px;background:#fff;border:1px solid #e5e7eb;" +
      "transform:rotate(45deg);";
    el.appendChild(arrowEl);
  }

  // Content container
  const inner = document.createElement("div");
  inner.className = "popover-inner";
  inner.style.cssText =
    "display:flex;flex-direction:column;overflow:hidden;" +
    (maxHeight ? `max-height:${maxHeight}px;overflow-y:auto;` : "");

  // Header
  if (content.title || content.icon) {
    const header = document.createElement("div");
    header.className = "popover-header";
    header.style.cssText =
      "display:flex;align-items:center;gap:8px;padding:12px 14px 8px;" +
      "border-bottom:1px solid #f3f4f6;";

    if (content.icon) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = content.icon;
      iconEl.style.flexShrink = "0";
      header.appendChild(iconEl);
    }

    if (content.title) {
      const titleEl = document.createElement("span");
      titleEl.className = "popover-title";
      titleEl.textContent = content.title;
      titleEl.style.cssText = "font-size:14px;font-weight:600;color:#111827;";
      header.appendChild(titleEl);
    }

    inner.appendChild(header);
  }

  // Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "popover-body";
  bodyEl.style.cssText = "padding:10px 14px;font-size:13px;color:#4b5563;line-height:1.5;";
  if (typeof content.body === "string") {
    bodyEl.innerHTML = content.body;
  } else {
    bodyEl.innerHTML = "";
    bodyEl.appendChild(content.body.cloneNode(true));
  }
  inner.appendChild(bodyEl);

  // Footer
  if (content.footerAction) {
    const footer = document.createElement("div");
    footer.className = "popover-footer";
    footer.style.cssText =
      "padding:8px 14px 12px;border-top:1px solid #f3f4f6;text-align:right;";

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.textContent = content.footerAction;
    actionBtn.style.cssText =
      "padding:5px 14px;border:none;border-radius:6px;background:#3b82f6;" +
      "color:#fff;font-size:12px;font-weight:500;cursor:pointer;" +
      "transition:background 0.12s;";
    actionBtn.addEventListener("mouseenter", () => { actionBtn.style.background = "#2563eb"; });
    actionBtn.addEventListener("mouseleave", () => { actionBtn.style.background = "#3b82f6"; });
    actionBtn.addEventListener("click", () => {
      content.onFooterClick?.();
      if (trigger !== "manual") hide();
    });

    footer.appendChild(actionBtn);
    inner.appendChild(footer);
  }

  el.appendChild(inner);
  document.body.appendChild(el);

  // --- Positioning ---

  function position(): void {
    const rect = target.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    let x: number, y: number;

    switch (placement) {
      case "top":
        x = rect.left + rect.width / 2 - elRect.width / 2;
        y = rect.top - elRect.height - offset;
        break;
      case "bottom":
        x = rect.left + rect.width / 2 - elRect.width / 2;
        y = rect.bottom + offset;
        break;
      case "left":
        x = rect.left - elRect.width - offset;
        y = rect.top + rect.height / 2 - elRect.height / 2;
        break;
      case "right":
        x = rect.right + offset;
        y = rect.top + rect.height / 2 - elRect.height / 2;
        break;
      default:
        x = rect.left + rect.width / 2 - elRect.width / 2;
        y = rect.bottom + offset;
    }

    // Clamp to viewport
    x = Math.max(4, Math.min(x, window.innerWidth - elRect.width - 4));
    y = Math.max(4, Math.min(y, window.innerHeight - elRect.height - 4));

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // Position arrow
    if (arrowEl && arrow) {
      positionArrow(rect, elRect, x, y);
    }
  }

  function positionArrow(targetRect: DOMRect, elRect: DOMRect, x: number, y: number): void {
    if (!arrowEl) return;

    const arrowSize = 10;
    const halfArrow = arrowSize / 2;

    switch (placement) {
      case "top":
        arrowEl.style.bottom = `-${halfArrow + 1}px`;
        arrowEl.style.left = `${targetRect.left + targetRect.width / 2 - x - halfArrow}px`;
        arrowEl.style.borderTopColor = "#e5e7eb";
        arrowEl.style.borderRightColor = "#e5e7eb";
        arrowEl.style.borderBottomColor = "#fff";
        arrowEl.style.borderLeftColor = "#fff";
        break;
      case "bottom":
        arrowEl.style.top = `-${halfArrow + 1}px`;
        arrowEl.style.left = `${targetRect.left + targetRect.width / 2 - x - halfArrow}px`;
        arrowEl.style.borderTopColor = "#fff";
        arrowEl.style.borderRightColor = "#fff";
        arrowEl.style.borderBottomColor = "#e5e7eb";
        arrowEl.style.borderLeftColor = "#e5e7eb";
        break;
      case "left":
        arrowEl.style.right = `-${halfArrow + 1}px`;
        arrowEl.style.top = `${targetRect.top + targetRect.height / 2 - y - halfArrow}px`;
        arrowEl.style.borderTopColor = "#fff";
        arrowEl.style.borderRightColor = "#e5e7eb";
        arrowEl.style.borderBottomColor = "#e5e7eb";
        arrowEl.style.borderLeftColor = "#fff";
        break;
      case "right":
        arrowEl.style.left = `-${halfArrow + 1}px`;
        arrowEl.style.top = `${targetRect.top + targetRect.height / 2 - y - halfArrow}px`;
        arrowEl.style.borderTopColor = "#e5e7eb";
        arrowEl.style.borderRightColor = "#fff";
        arrowEl.style.borderBottomColor = "#fff";
        arrowEl.style.borderLeftColor = "#e5e7eb";
        break;
    }

    // Reset border styles properly
    arrowEl.style.borderWidth = "1px";
    arrowEl.style.borderStyle = "solid";
  }

  // --- Show/Hide ---

  function show(): void {
    if (_visible) return;
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }

    _showTimer = setTimeout(() => {
      _visible = true;
      position();

      // Apply animation
      applyAnimation(true);

      el.style.visibility = "visible";
      el.style.pointerEvents = "auto";
      onShow?.();
    }, showDelay);
  }

  function hide(): void {
    if (!_visible) return;
    if (_showTimer) { clearTimeout(_showTimer); _showTimer = null; }

    _hideTimer = setTimeout(() => {
      _visible = false;
      applyAnimation(false);
      el.style.pointerEvents = "none";

      setTimeout(() => {
        el.style.visibility = "hidden";
      }, 150);

      onHide?.();
    }, hideDelay);
  }

  function toggle(): void { _visible ? hide() : show(); }

  function applyAnimation(showing: boolean): void {
    switch (animation) {
      case "fade":
        el.style.opacity = showing ? "1" : "0";
        el.style.transform = "";
        break;
      case "scale":
        el.style.opacity = showing ? "1" : "0";
        el.style.transform = showing ? "scale(1)" : "scale(0.95)";
        break;
      case "slide":
        el.style.opacity = showing ? "1" : "0";
        const slideDir = placement === "top" ? "translateY(4px)" :
          placement === "bottom" ? "translateY(-4px)" :
            placement === "left" ? "translateX(4px)" : "translateX(-4px)";
        el.style.transform = showing ? "translateY(0)" : slideDir;
        break;
    }
  }

  // --- Event Bindings ---

  if (trigger === "hover") {
    target.addEventListener("mouseenter", show);
    target.addEventListener("mouseleave", hide);
    el.addEventListener("mouseenter", () => { if (_showTimer) clearTimeout(_showTimer); });
    el.addEventListener("mouseleave", hide);
    cleanupFns.push(
      () => target.removeEventListener("mouseenter", show),
      () => target.removeEventListener("mouseleave", hide),
      () => el.removeEventListener("mouseenter", () => {}),
      () => el.removeEventListener("mouseleave", hide),
    );
  }

  if (trigger === "click") {
    target.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    cleanupFns.push(() => target.removeEventListener("click", toggle));
  }

  if (trigger === "focus") {
    target.addEventListener("focus", show);
    target.addEventListener("blur", hide);
    cleanupFns.push(
      () => target.removeEventListener("focus", show),
      () => target.removeEventListener("blur", hide),
    );
  }

  if (closeOnOutside) {
    const handler = (e: MouseEvent) => {
      if (_visible && !el.contains(e.target as Node) && !target.contains(e.target as Node)) hide();
    };
    document.addEventListener("mousedown", handler);
    cleanupFns.push(() => document.removeEventListener("mousedown", handler));
  }

  if (closeOnEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && _visible) hide();
    };
    document.addEventListener("keydown", escHandler);
    cleanupFns.push(() => document.removeEventListener("keydown", escHandler));
  }

  // --- Instance ---

  return {
    el,

    show, hide, toggle,

    isVisible() { return _visible; },

    updateContent(newContent: PopoverTooltipContent) {
      // Update title
      const header = el.querySelector(".popover-header");
      if (newContent.title && header) {
        const t = header.querySelector(".popover-title");
        if (t) t.textContent = newContent.title;
      }

      // Update body
      if (typeof newContent.body === "string") {
        bodyEl.innerHTML = newContent.body;
      } else {
        bodyEl.innerHTML = "";
        bodyEl.appendChild(newContent.body.cloneNode(true));
      }

      if (_visible) position();
    },

    reposition() { if (_visible) position(); },

    destroy() {
      hide();
      for (const fn of cleanupFns) fn();
      el.remove();
    },
  };
}
