/**
 * Tooltip System: Smart positioning (auto-flip, boundary detection),
 * animations, rich HTML content, follow-cursor mode, delays,
 * accessibility (ARIA), grouping, and lifecycle management.
 */

// --- Types ---

export type TooltipPlacement =
  | "top" | "bottom" | "left" | "right"
  | "top-start" | "top-end"
  | "bottom-start" | "bottom-end"
  | "left-start" | "left-end"
  | "right-start" | "right-end";

export type TooltipTrigger = "hover" | "focus" | "click" | "manual";

export interface TooltipOptions {
  /** Content (string or HTML element) */
  content: string | HTMLElement;
  /** Placement preference */
  placement?: TooltipPlacement;
  /** How to trigger */
  trigger?: TooltipTrigger;
  /** Show delay in ms (default: 200) */
  showDelay?: number;
  /** Hide delay in ms (default: 100) */
  hideDelay?: number;
  /** Max width (default: 280px) */
  maxWidth?: number;
  /** Z-index (default: 10500) */
  zIndex?: number;
  /** Animation duration in ms (default: 150) */
  animationDuration?: number;
  /** Offset from anchor (default: 8) */
  offset?: number;
  /** Arrow/pointer size (default: 6) */
  arrowSize?: number;
  /** Custom CSS class */
  className?: string;
  /** Theme: 'dark', 'light', or custom color */
  theme?: "dark" | "light";
  /** Allow HTML in string content */
  allowHtml?: boolean;
  /** Follow cursor on hover */
  followCursor?: boolean;
  /** Boundary container for auto-flip */
  boundary?: HTMLElement | Window;
  /** Callback when shown */
  onShow?: () => void;
  /** Callback when hidden */
  onHide?: () => void;
  /** Parent element (default: document.body) */
  parent?: HTMLElement;
  /** Interactive tooltip (won't hide on mouse leave to tooltip) */
  interactive?: boolean;
}

export interface TooltipInstance {
  /** The tooltip DOM element */
  element: HTMLDivElement;
  /** Show the tooltip */
  show: () => void;
  /** Hide the tooltip */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Update content dynamically */
  setContent: (content: string | HTMLElement) => void;
  /** Update position */
  updatePosition: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Internal Helpers ---

const PLACEMENT_MAP: Record<TooltipPlacement, { main: "top" | "bottom" | "left" | "right"; align: "start" | "center" | "end" }> = {
  top: { main: "top", align: "center" },
  "top-start": { main: "top", align: "start" },
  "top-end": { main: "top", align: "end" },
  bottom: { main: "bottom", align: "center" },
  "bottom-start": { main: "bottom", align: "start" },
  "bottom-end": { main: "bottom", align: "end" },
  left: { main: "left", align: "center" },
  "left-start": { main: "left", align: "start" },
  "left-end": { main: "left", align: "end" },
  right: { main: "right", align: "center" },
  "right-start": { main: "right", align: "start" },
  "right-end": { main: "right", align: "end" },
};

function getOpposite(placement: TooltipPlacement): TooltipPlacement {
  const map: Record<string, TooltipPlacement> = {
    top: "bottom", bottom: "top",
    left: "right", right: "left",
    "top-start": "bottom-start", "top-end": "bottom-end",
    "bottom-start": "top-start", "bottom-end": "top-end",
    "left-start": "right-start", "left-end": "right-end",
    "right-start": "left-start", "right-end": "left-end",
  };
  return map[placement] ?? placement;
}

// --- Tooltip Manager ---

export class TooltipManager {
  private activeTooltips = new Set<TooltipInstance>();

  /**
   * Create and attach a tooltip to an anchor element.
   */
  attach(anchor: HTMLElement, options: TooltipOptions): TooltipInstance {
    const opts = {
      showDelay: 200,
      hideDelay: 100,
      maxWidth: 280,
      zIndex: 10500,
      animationDuration: 150,
      offset: 8,
      arrowSize: 6,
      theme: "dark",
      trigger: "hover" as TooltipTrigger,
      ...options,
    };

    const parent = opts.parent ?? document.body;

    // Create tooltip element
    const el = document.createElement("div");
    el.className = `tt-tooltip ${opts.className ?? ""} tt-theme-${opts.theme}`;
    el.setAttribute("role", "tooltip");
    el.style.cssText = `
      position: absolute; z-index: ${opts.zIndex};
      max-width: ${opts.maxWidth}px; padding: 6px 12px;
      border-radius: 6px; font-size: 13px; line-height: 1.4;
      pointer-events: none; opacity: 0; transition: opacity ${opts.animationDuration}ms ease;
      word-wrap: break-word;
      background: ${opts.theme === "dark" ? "#1a1a2e" : "#fff"};
      color: ${opts.theme === "dark" ? "#eee" : "#333"};
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    `;

    // Content area
    const contentEl = document.createElement("div");
    contentEl.className = "tt-content";
    if (typeof options.content === "string") {
      if (opts.allowHtml) {
        contentEl.innerHTML = options.content;
      } else {
        contentEl.textContent = options.content;
      }
    } else {
      contentEl.appendChild(options.content);
    }
    el.appendChild(contentEl);

    // Arrow
    const arrow = document.createElement("div");
    arrow.className = "tt-arrow";
    arrow.style.cssText = `
      position: absolute; width: ${opts.arrowSize * 2}px; height: ${opts.arrowSize * 2}px;
      transform: rotate(45deg);
      background: ${opts.theme === "dark" ? "#1a1a2e" : "#fff"};
    `;
    el.appendChild(arrow);

    parent.appendChild(el);

    // State
    let visible = false;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let currentPlacement = opts.placement ?? "top";
    let lastMousePos = { x: 0, y: 0 };

    // Position calculation
    function calculatePosition(placement: TooltipPlacement): { x: number; y: number; arrowX: number; arrowY: number } {
      const anchorRect = anchor.getBoundingClientRect();
      const tooltipRect = el.getBoundingClientRect();
      const boundaryRect = opts.boundary instanceof Element
        ? opts.boundary.getBoundingClientRect()
        : { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };

      const info = PLACEMENT_MAP[placement];
      let x: number;
      let y: number;
      let arrowX = 0;
      let arrowY = 0;

      switch (info.main) {
        case "top":
          y = anchorRect.top - tooltipRect.height - opts.offset;
          if (info.align === "start") x = anchorRect.left;
          else if (info.align === "end") x = anchorRect.right - tooltipRect.width;
          else x = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
          arrowX = tooltipRect.width / 2 - opts.arrowSize;
          arrowY = tooltipRect.height - opts.arrowSize + 1;
          break;
        case "bottom":
          y = anchorRect.bottom + opts.offset;
          if (info.align === "start") x = anchorRect.left;
          else if (info.align === "end") x = anchorRect.right - tooltipRect.width;
          else x = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
          arrowX = tooltipRect.width / 2 - opts.arrowSize;
          arrowY = -opts.arrowSize + 1;
          break;
        case "left":
          x = anchorRect.left - tooltipRect.width - opts.offset;
          if (info.align === "start") y = anchorRect.top;
          else if (info.align === "end") y = anchorRect.bottom - tooltipRect.height;
          else y = anchorRect.top + (anchorRect.height - tooltipRect.height) / 2;
          arrowX = tooltipRect.width - opts.arrowSize + 1;
          arrowY = tooltipRect.height / 2 - opts.arrowSize;
          break;
        case "right":
          x = anchorRect.right + opts.offset;
          if (info.align === "start") y = anchorRect.top;
          else if (info.align === "end") y = anchorRect.bottom - tooltipRect.height;
          else y = anchorRect.top + (anchorRect.height - tooltipRect.height) / 2;
          arrowX = -opts.arrowSize + 1;
          arrowY = tooltipRect.height / 2 - opts.arrowSize;
          break;
      }

      // Clamp to boundary
      x = Math.max(boundaryRect.left + 4, Math.min(x, boundaryRect.right - tooltipRect.width - 4));
      y = Math.max(boundaryRect.top + 4, Math.min(y, boundaryRect.bottom - tooltipRect.height - 4));

      return { x, y, arrowX, arrowY };
    }

    function positionTooltip(): void {
      const pos = calculatePosition(currentPlacement);
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;

      // Position arrow
      switch (PLACEMENT_MAP[currentPlacement].main) {
        case "top":
          arrow.style.left = `${pos.arrowX}px`;
          arrow.style.bottom = `-${opts.arrowSize!}px`;
          arrow.style.top = "auto";
          arrow.style.right = "auto";
          break;
        case "bottom":
          arrow.style.left = `${pos.arrowX}px`;
          arrow.style.top = `-${opts.arrowSize!}px`;
          arrow.style.bottom = "auto";
          arrow.style.right = "auto";
          break;
        case "left":
          arrow.style.top = `${pos.arrowY}px`;
          arrow.style.right = `-${opts.arrowSize!}px`;
          arrow.style.left = "auto";
          arrow.style.bottom = "auto";
          break;
        case "right":
          arrow.style.top = `${pos.arrowY}px`;
          arrow.style.left = `-${opts.arrowSize!}px`;
          arrow.style.right = "auto";
          arrow.style.bottom = "auto";
          break;
      }
    }

    function checkFlip(): boolean {
      const rect = el.getBoundingClientRect();
      const boundary = opts.boundary instanceof Element
        ? opts.boundary.getBoundingClientRect()
        : { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };

      const overflowTop = rect.top < boundary.top;
      const overflowBottom = rect.bottom > boundary.bottom;
      const overflowLeft = rect.left < boundary.left;
      const overflowRight = rect.right > boundary.right;

      if (overflowBottom && PLACEMENT_MAP[currentPlacement].main === "top") {
        currentPlacement = getOpposite(currentPlacement);
        return true;
      }
      if (overflowTop && PLACEMENT_MAP[currentPlacement].main === "bottom") {
        currentPlacement = getOpposite(currentPlacement);
        return true;
      }
      if (overflowRight && PLACEMENT_MAP[currentPlacement].main === "left") {
        currentPlacement = getOpposite(currentPlacement);
        return true;
      }
      if (overflowLeft && PLACEMENT_MAP[currentPlacement].main === "right") {
        currentPlacement = getOpposite(currentPlacement);
        return true;
      }

      return false;
    }

    // Instance methods
    const instance: TooltipInstance = {
      element: el,

      show() {
        if (showTimer) clearTimeout(showTimer);
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

        showTimer = setTimeout(() => {
          currentPlacement = opts.placement ?? "top";

          if (opts.followCursor) {
            el.style.left = `${lastMousePos.x + 12}px`;
            el.style.top = `${lastMousePos.y + 20}px`;
            arrow.style.display = "none";
          } else {
            positionTooltip();
            // Check flip
            if (checkFlip()) positionTooltip();
            arrow.style.display = "";
          }

          el.style.pointerEvents = opts.interactive ? "auto" : "none";
          el.style.opacity = "1";
          visible = true;
          this.activeTooltips.add(instance);
          opts.onShow?.();
        }, opts.showDelay);
      },

      hide() {
        if (showTimer) { clearTimeout(showTimer); showTimer = null; }

        hideTimer = setTimeout(() => {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          visible = false;
          this.activeTooltips.delete(instance);
          opts.onHide?.();
        }, opts.hideDelay);
      },

      toggle() {
        if (visible) this.hide(); else this.show();
      },

      setContent(content: string | HTMLElement) {
        if (typeof content === "string") {
          if (opts.allowHtml) contentEl.innerHTML = content;
          else contentEl.textContent = content;
        } else {
          contentEl.innerHTML = "";
          contentEl.appendChild(content);
        }
        if (visible) {
          positionTooltip();
          if (checkFlip()) positionTooltip();
        }
      },

      updatePosition() {
        if (visible) {
          positionTooltip();
          if (checkFlip()) positionTooltip();
        }
      },

      isVisible: () => visible,

      destroy() {
        if (showTimer) clearTimeout(showTimer);
        if (hideTimer) clearTimeout(hideTimer);
        this.activeTooltips.delete(instance);
        el.remove();

        // Remove event listeners
        anchor.removeEventListener("mouseenter", onMouseEnter);
        anchor.removeEventListener("mouseleave", onMouseLeave);
        anchor.removeEventListener("focus", onFocus);
        anchor.removeEventListener("blur", onBlur);
        anchor.removeEventListener("click", onClick);
        document.removeEventListener("mousemove", onMouseMove);
      },
    };

    // Bind instance methods for closures
    const showFn = instance.show.bind(instance);
    const hideFn = instance.hide.bind(instance);

    // Event handlers based on trigger
    if (opts.trigger === "hover" || opts.trigger === "click") {
      const onMouseEnter = () => showFn();
      const onMouseLeave = () => hideFn();
      anchor.addEventListener("mouseenter", onMouseEnter);
      anchor.addEventListener("mouseleave", onMouseLeave);

      if (opts.interactive) {
        el.addEventListener("mouseenter", () => {
          if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        });
        el.addEventListener("mouseleave", hideFn);
      }
    }

    if (opts.trigger === "focus" || opts.trigger === "hover") {
      const onFocus = () => showFn();
      const onBlur = () => hideFn();
      anchor.addEventListener("focus", onFocus);
      anchor.addEventListener("blur", onBlur);
    }

    if (opts.trigger === "click") {
      const onClick = (e: Event) => {
        e.stopPropagation();
        instance.toggle();
      };
      anchor.addEventListener("click", onClick);
    }

    if (opts.followCursor) {
      const onMouseMove = (e: MouseEvent) => {
        lastMousePos = { x: e.clientX, y: e.clientY };
        if (visible) {
          el.style.left = `${e.clientX + 12}px`;
          el.style.top = `${e.clientY + 20}px`;
        }
      };
      anchor.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mousemove", onMouseMove);
    }

    // Close on escape
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && visible) hideFn();
    };
    document.addEventListener("keydown", onEscape);

    // Store cleanup reference
    (instance as any)._onEscape = onEscape;

    return instance;
  }

  /**
   * Hide all active tooltips.
   */
  hideAll(): void {
    for (const tt of this.activeTooltips) {
      tt.hide();
    }
  }

  /**
   * Destroy all tooltips.
   */
  destroyAll(): void {
    for (const tt of Array.from(this.activeTooltips)) {
      tt.destroy();
    }
  }
}

// --- Singleton ---

let defaultManager: TooltipManager | null = null;

/** Get the global TooltipManager singleton */
export function getTooltipManager(): TooltipManager {
  if (!defaultManager) defaultManager = new TooltipManager();
  return defaultManager;
}

// --- Quick Attach ---

/**
 * Convenience: create a simple tooltip on an element.
 */
export function tooltip(
  anchor: HTMLElement,
  content: string,
  options?: Partial<Omit<TooltipOptions, "content">>,
): TooltipInstance {
  return getTooltipManager().attach(anchor, { content, ...options });
}
