/**
 * Tooltip System: Smart tooltip/popover engine with positioning engine,
 * multiple triggers (hover, click, focus, manual), rich content support,
 * animations, accessibility, virtual elements, follow cursor mode,
 * arrow/pointer indicator, delay groups, and portal rendering.
 */

// --- Types ---

export type TooltipPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

export type TooltipTrigger = "hover" | "click" | "focus" | "manual" | "hover-focus";

export interface TooltipOptions {
  /** Content to display (string or HTMLElement) */
  content: string | HTMLElement;
  /** Placement preference (default: "top") */
  placement?: TooltipPlacement;
  /** How to trigger show/hide */
  trigger?: TooltipTrigger;
  /** Delay before showing (ms, default: 200) */
  showDelay?: number;
  /** Delay before hiding (ms, default: 100) */
  hideDelay?: number;
  /** Max width (default: 300px) */
  maxWidth?: number | string;
  /** Offset from the target in px (default: 8) */
  offset?: number;
  /** Show arrow/pointer (default: true) */
  arrow?: boolean;
  /** Arrow size in px (default: 8) */
  arrowSize?: number;
  /** Animation duration (ms, default: 150) */
  animationDuration?: number;
  /** Custom CSS class for the tooltip element */
  className?: string;
  /** Z-index (default: 10500) */
  zIndex?: number;
  /** Portal parent element (default: document.body) */
  container?: HTMLElement;
  /** Follow cursor position (default: false) */
  followCursor?: boolean;
  /** Interactive: allow hovering over tooltip without it closing (default: false) */
  interactive?: boolean;
  /** Callback when tooltip shows */
  onShow?: () => void;
  /** Callback when tooltip hides */
  onHide?: () => void;
  /** Disable the tooltip */
  disabled?: boolean;
  /** Hide on escape key (default: true) */
  hideOnEscape?: boolean;
  /** Group ID for coordinated show/hide across tooltips */
  group?: string;
}

interface TooltipState {
  visible: boolean;
  positioned: boolean;
  placement: TooltipPlacement;
}

// --- Positioning Engine ---

interface PositionedResult {
  x: number;
  y: number;
  placement: TooltipPlacement;
  arrowX?: number;
  arrowY?: number;
}

function computePosition(
  targetRect: DOMRect,
  tooltipEl: HTMLElement,
  placement: TooltipPlacement,
  offset: number,
  viewportPadding = 8,
): PositionedResult {
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;

  let x: number;
  let y: number;
  let finalPlacement = placement;
  let arrowX: number | undefined;
  let arrowY: number | undefined;

  switch (placement) {
    case "top":
      x = targetRect.left + targetRect.width / 2 - tw / 2;
      y = targetRect.top - th - offset;
      arrowX = tw / 2;
      break;
    case "top-start":
      x = targetRect.left;
      y = targetRect.top - th - offset;
      arrowX = targetRect.width / 2;
      break;
    case "top-end":
      x = targetRect.right - tw;
      y = targetRect.top - th - offset;
      arrowX = tw - targetRect.width / 2;
      break;
    case "bottom":
      x = targetRect.left + targetRect.width / 2 - tw / 2;
      y = targetRect.bottom + offset;
      arrowX = tw / 2;
      break;
    case "bottom-start":
      x = targetRect.left;
      y = targetRect.bottom + offset;
      arrowX = targetRect.width / 2;
      break;
    case "bottom-end":
      x = targetRect.right - tw;
      y = targetRect.bottom + offset;
      arrowX = tw - targetRect.width / 2;
      break;
    case "left":
      x = targetRect.left - tw - offset;
      y = targetRect.top + targetRect.height / 2 - th / 2;
      arrowY = th / 2;
      break;
    case "left-start":
      x = targetRect.left - tw - offset;
      y = targetRect.top;
      arrowY = targetRect.height / 2;
      break;
    case "left-end":
      x = targetRect.left - tw - offset;
      y = targetRect.bottom - th;
      arrowY = th - targetRect.height / 2;
      break;
    case "right":
      x = targetRect.right + offset;
      y = targetRect.top + targetRect.height / 2 - th / 2;
      arrowY = th / 2;
      break;
    case "right-start":
      x = targetRect.right + offset;
      y = targetRect.top;
      arrowY = targetRect.height / 2;
      break;
    case "right-end":
      x = targetRect.right - tw + offset;
      y = targetRect.bottom - th;
      arrowY = th - targetRect.height / 2;
      break;
  }

  // Flip if off-screen
  const isVertical = ["top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end"].includes(placement);

  if (isVertical) {
    // Check vertical overflow
    if (y < viewportPadding && placement.startsWith("top")) {
      // Flip to bottom
      y = targetRect.bottom + offset;
      finalPlacement = placement.replace("top", "bottom") as TooltipPlacement;
    } else if (y + th > window.innerHeight - viewportPadding && placement.startsWith("bottom")) {
      y = targetRect.top - th - offset;
      finalPlacement = placement.replace("bottom", "top") as TooltipPlacement;
    }
    // Horizontal clamp
    if (x < viewportPadding) x = viewportPadding;
    if (x + tw > window.innerWidth - viewportPadding) x = window.innerWidth - tw - viewportPadding;
  } else {
    // Horizontal overflow
    if (x < viewportPadding && placement.startsWith("left")) {
      x = targetRect.right + offset;
      finalPlacement = placement.replace("left", "right") as TooltipPlacement;
    } else if (x + tw > window.innerWidth - viewportPadding && placement.startsWith("right")) {
      x = targetRect.left - tw - offset;
      finalPlacement = placement.replace("right", "left") as TooltipPlacement;
    }
    // Vertical clamp
    if (y < viewportPadding) y = viewportPadding;
    if (y + th > window.innerHeight - viewportPadding) y = window.innerHeight - th - viewportPadding;
  }

  return { x, y, placement: finalPlacement, arrowX, arrowY };
}

function getOppositePlacement(placement: TooltipPlacement): TooltipPlacement {
  const map: Record<string, string> = {
    top: "bottom", "top-start": "bottom-start", "top-end": "bottom-end",
    bottom: "top", "bottom-start": "top-start", "bottom-end": "top-end",
    left: "right", "left-start": "right-start", "left-end": "right-end",
    right: "left", "right-start": "right-start", "right-end": "right-end",
  };
  return (map[placement] ?? placement) as TooltipPlacement;
}

// --- Tooltip Instance ---

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
  /** Update options dynamically */
  setOptions: (options: Partial<TooltipOptions>) => void;
  /** Check visibility */
  isVisible: () => boolean;
  /** Reposition (call after layout changes) */
  updatePosition: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Tooltip Manager ---

export class TooltipManager {
  private activeTooltips = new Map<HTMLElement, TooltipInstance>();
  private groupMap = new Map<string, Set<HTMLElement>>();
  private globalHideHandler: ((e: Event) => void) | null = null;

  /**
   * Attach a tooltip to a target element.
   * Returns an instance with full control.
   */
  attach(target: HTMLElement, options: TooltipOptions): TooltipInstance {
    // Clean up existing
    this.detach(target);

    const opts: Required<TooltipOptions> & Omit<TooltipOptions, keyof Required<TooltipOptions>> = {
      placement: options.placement ?? "top",
      trigger: options.trigger ?? "hover",
      showDelay: options.showDelay ?? 200,
      hideDelay: options.hideDelay ?? 100,
      maxWidth: options.maxWidth ?? 300,
      offset: options.offset ?? 8,
      arrow: options.arrow ?? true,
      arrowSize: options.arrowSize ?? 8,
      animationDuration: options.animationDuration ?? 150,
      zIndex: options.zIndex ?? 10500,
      container: options.container ?? document.body,
      followCursor: options.followCursor ?? false,
      interactive: options.interactive ?? false,
      disabled: options.disabled ?? false,
      hideOnEscape: options.hideOnEscape ?? true,
      ...options,
    };

    const container = opts.container!;
    const state: TooltipState = { visible: false, positioned: false, placement: opts.placement };

    // Create tooltip element
    const el = document.createElement("div");
    el.className = `tt-tooltip ${opts.className ?? ""}`;
    el.setAttribute("role", "tooltip");
    el.style.cssText = `
      position: fixed; z-index: ${opts.zIndex}; pointer-events: none;
      max-width: ${typeof opts.maxWidth === "number" ? `${opts.maxWidth}px` : opts.maxWidth};
      opacity: 0; transform: scale(0.96); transition: opacity ${opts.animationDuration}ms ease, transform ${opts.animationDuration}ms ease;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; line-height: 1.4;
      color: #333; background: #fff; border-radius: 8px; padding: 8px 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.06);
      word-wrap: break-word;
    `;
    el.setAttribute("data-placement", opts.placement);

    // Content area
    const contentEl = document.createElement("div");
    contentEl.className = "tt-content";
    if (typeof opts.content === "string") {
      contentEl.textContent = opts.content;
    } else {
      contentEl.appendChild(opts.content);
    }
    el.appendChild(contentEl);

    // Arrow element
    let arrowEl: HTMLElement | null = null;
    if (opts.arrow) {
      arrowEl = document.createElement("div");
      arrowEl.className = "tt-arrow";
      arrowEl.style.cssText = `
        position: absolute; width: 0; height: 0;
        border-style: solid;
      `;
      el.appendChild(arrowEl);
    }

    container.appendChild(el);

    // Timers
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    // Track mouse position for followCursor
    let mouseX = 0;
    let mouseY = 0;

    const clearTimers = () => {
      if (showTimer) { clearTimeout(showTimer); showTimer = null; }
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    };

    const doShow = () => {
      if (opts.disabled) return;

      // Group behavior: hide others in same group
      if (opts.group) {
        this.hideGroup(opts.group);
      }

      state.visible = true;
      this.position(el, target, opts, state);
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
      el.style.pointerEvents = opts.interactive ? "auto" : "none";

      opts.onShow?.();
    };

    const doHide = () => {
      state.visible = false;
      el.style.opacity = "0";
      el.style.transform = "scale(0.96)";
      el.style.pointerEvents = "none";
      opts.onHide?.();
    };

    // --- Event handlers based on trigger ---

    const handlers: Array<{ el: HTMLElement | Document; event: string; fn: EventListener }> = [];

    const addHandler = (element: HTMLElement | Document, event: string, fn: EventListener) => {
      element.addEventListener(event, fn);
      handlers.push({ el: element, event, fn });
    };

    if (opts.trigger === "hover" || opts.trigger === "hover-focus") {
      addHandler(target, "mouseenter", () => {
        clearTimers();
        showTimer = setTimeout(doShow, opts.showDelay);
      });
      addHandler(target, "mouseleave", () => {
        clearTimers();
        hideTimer = setTimeout(doHide, opts.hideDelay);
      });

      if (opts.interactive) {
        addHandler(el, "mouseenter", () => { clearTimers(); });
        addHandler(el, "mouseleave", () => {
          clearTimers();
          hideTimer = setTimeout(doHide, opts.hideDelay);
        });
      }
    }

    if (opts.trigger === "focus" || opts.trigger === "hover-focus") {
      addHandler(target, "focus", () => {
        clearTimers();
        showTimer = setTimeout(doShow, opts.showDelay);
      });
      addHandler(target, "blur", () => {
        clearTimers();
        hideTimer = setTimeout(doHide, opts.hideDelay);
      });
    }

    if (opts.trigger === "click" || opts.trigger === "manual") {
      addHandler(target, "click", (e) => {
        e.stopPropagation();
        if (state.visible) doHide(); else doShow();
      });
    }

    // Follow cursor
    if (opts.followCursor) {
      addHandler(target, "mousemove", (e: Event) => {
        const me = e as MouseEvent;
        mouseX = me.clientX;
        mouseY = me.clientY;
        if (state.visible) {
          el.style.left = `${mouseX + opts.offset}px`;
          el.style.top = `${mouseY + opts.offset}px`;
        }
      });
    }

    // Escape to close
    if (opts.hideOnEscape) {
      addHandler(document, "keydown", (e: Event) => {
        if ((e as KeyboardEvent).key === "Escape" && state.visible) {
          doHide();
        }
      });
    }

    // Register group
    if (opts.group) {
      if (!this.groupMap.has(opts.group)) {
        this.groupMap.set(opts.group, new Set());
      }
      this.groupMap.get(opts.group)!.add(target);
    }

    const instance: TooltipInstance = {
      element: el,

      show: () => { clearTimers(); doShow(); },
      hide: () => { clearTimers(); doHide(); },
      toggle: () => { state.visible ? doHide() : doShow(); },

      setContent: (content: string | HTMLElement) => {
        contentEl.innerHTML = "";
        if (typeof content === "string") {
          contentEl.textContent = content;
        } else {
          contentEl.appendChild(content);
        }
        if (state.visible) this.updatePosition();
      },

      setOptions: (newOpts: Partial<TooltipOptions>) => {
        Object.assign(opts, newOpts);
        if (state.visible) this.updatePosition();
      },

      isVisible: () => state.visible,

      updatePosition: () => {
        if (state.visible) this.position(el, target, opts, state);
      },

      destroy: () => {
        clearTimers();
        for (const h of handlers) {
          h.el.removeEventListener(h.event, h.fn);
        }
        el.remove();
        this.activeTooltips.delete(target);
        if (opts.group) {
          this.groupMap.get(opts.group)?.delete(target);
        }
      },
    };

    this.activeTooltips.set(target, instance);
    return instance;
  }

  /** Remove tooltip from a target */
  detach(target: HTMLElement): void {
    const instance = this.activeTooltips.get(target);
    if (instance) instance.destroy();
  }

  /** Get tooltip instance for a target */
  get(target: HTMLElement): TooltipInstance | undefined {
    return this.activeTooltips.get(target);
  }

  /** Hide all active tooltips */
  hideAll(): void {
    for (const [, inst] of this.activeTooltips) {
      inst.hide();
    }
  }

  /** Destroy all tooltips and cleanup manager */
  destroyAll(): void {
    for (const [, inst] of this.activeTooltips) {
      inst.destroy();
    }
    this.groupMap.clear();
  }

  // --- Internal ---

  private position(
    el: HTMLDivElement,
    target: HTMLElement,
    opts: Required<TooltipOptions>,
    state: TooltipState,
  ): void {
    const targetRect = target.getBoundingClientRect();

    // Temporarily make visible for measurement
    el.style.visibility = "hidden";
    el.style.opacity = "0";
    el.style.display = "block";

    const result = computePosition(targetRect, el, opts.placement, opts.offset);

    el.style.left = `${result.x}px`;
    el.style.top = `${result.y}px`;
    el.style.visibility = "";
    el.style.display = "";

    state.placed = true;
    state.placement = result.placement;
    el.setAttribute("data-placement", result.placement);

    // Position arrow
    const arrowEl = el.querySelector(".tt-arrow") as HTMLElement | null;
    if (arrowEl) {
      const size = opts.arrowSize;
      const color = "#fff";

      // Determine arrow direction from placement
      if (result.placement.startsWith("top")) {
        arrowEl.style.cssText += `;bottom:-${size}px;left:${result.arrowX ?? 50}%;transform:translateX(-50%);border-width:${size}px ${size}px 0;border-color:${color} transparent transparent transparent;`;
      } else if (result.placement.startsWith("bottom")) {
        arrowEl.style.cssText += `;top:-${size}px;left:${result.arrowX ?? 50}%;transform:translateX(-50%);border-width:0 ${size}px ${size}px;border-color:transparent transparent ${color} transparent;`;
      } else if (result.placement.startsWith("left")) {
        arrowEl.style.cssText += `;right:-${size}px;top:${result.arrowY ?? 50}%;transform:translateY(-50%);border-width:${size}px 0 ${size}px ${size}px;border-color:transparent transparent transparent ${color};`;
      } else if (result.placement.startsWith("right")) {
        arrowEl.style.cssText += `;left:-${size}px;top:${result.arrowY ?? 50}%;transform:translateY(-50%);border-width:${size}px ${size}px ${size}px 0;border-color:transparent ${color} transparent transparent;`;
      }
    }
  }

  private hideGroup(groupId: string): void {
    const members = this.groupMap.get(groupId);
    if (!members) return;
    for (const member of members) {
      const inst = this.activeTooltips.get(member);
      if (inst && inst.isVisible()) inst.hide();
    }
  }
}

// --- Singleton ---

let defaultManager: TooltipManager | null = null;

/** Get or create the global TooltipManager singleton */
export function getTooltipManager(): TooltipManager {
  if (!defaultManager) defaultManager = new TooltipManager();
  return defaultManager;
}

/** Quick attach: convenience function using the singleton */
export function tooltip(target: HTMLElement, options: TooltipOptions): TooltipInstance {
  return getTooltipManager().attach(target, options);
}
