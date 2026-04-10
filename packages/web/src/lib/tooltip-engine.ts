/**
 * Tooltip Engine: Advanced tooltip and popover positioning engine with
 * smart placement, flip behavior, arrow indicators, animations,
 * trigger modes (hover/click/focus/manual), virtual elements,
 * grouping, nesting, RTL support, and accessibility.
 */

// --- Types ---

export type TooltipPlacement =
  | "top" | "top-start" | "top-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end"
  | "right" | "right-start" | "right-end";

export type TooltipTrigger = "hover" | "click" | "focus" | "manual" | "contextmenu";

export interface TooltipOptions {
  /** Content (HTML string or element) */
  content: string | HTMLElement;
  /** Preferred placement (default: "top") */
  placement?: TooltipPlacement;
  /** Allowed placements for auto-flip (default: all) */
  fallbackPlacements?: TooltipPlacement[];
  /** Trigger mode (default: "hover") */
  trigger?: TooltipTrigger;
  /** Delay in ms before show (default: 200 for hover, 0 for click) */
  showDelay?: number;
  /** Delay in ms before hide (default: 100 for hover, 0 for click) */
  hideDelay?: number;
  /** Offset from trigger element in px (default: 8) */
  offset?: number;
  /** Show arrow indicator (default: true) */
  arrow?: boolean;
  /** Arrow size in px (default: 8) */
  arrowSize?: number;
  /** Max width (default: 320px) */
  maxWidth?: number;
  /** Custom CSS class */
  className?: string;
  /** z-index (default: 1050) */
  zIndex?: number;
  /** Interactive tooltip (won't close on mouse leave to tooltip) (default: false for hover) */
  interactive?: boolean;
  /** Hide when clicking outside (default: true for click) */
  hideOnClickOutside?: boolean;
  /** Animation duration in ms (default: 150) */
  animationDuration?: number;
  /** Boundary element for containment (default: viewport) */
  boundary?: HTMLElement | "viewport" | "window";
  /** Padding inside boundary (default: 8) */
  boundaryPadding?: number;
  /** Callback on show */
  onShow?: (tooltip: TooltipInstance) => void;
  /** Callback on hide */
  onHide?: (tooltip: TooltipInstance) => void;
  /** Callback on position update */
  onPositionUpdate?: (position: PositionedTooltip) => void;
  /** Virtual element (use instead of real DOM ref) */
  virtualElement?: { getBoundingClientRect: () => DOMRect };
}

export interface PositionedTooltip {
  x: number;
  y: number;
  placement: TooltipPlacement;
  /** Actual placement after flip */
  actualPlacement: TooltipPlacement;
  arrowX?: number;
  arrowY?: number;
}

export interface TooltipInstance {
  id: string;
  element: HTMLDivElement;
  options: Required<TooltipOptions> & TooltipOptions;
  /** Show the tooltip */
  show: () => void;
  /** Hide the tooltip */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update content */
  updateContent: (content: string | HTMLElement) => void;
  /** Update position (call after layout changes) */
  updatePosition: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Internal State ---

const activeTooltips = new Set<TooltipInstance>();
let globalContainer: HTMLDivElement | null = null;

// --- Tooltip Engine ---

export class TooltipEngine {
  private tooltips = new Map<string, TooltipInstance>();
  private defaultOptions: Partial<TooltipOptions>;
  private listeners = new Set<(tip: TooltipInstance, action: "show" | "hide") => void>();

  constructor(defaultOptions: Partial<TooltipOptions> = {}) {
    this.defaultOptions = defaultOptions;
    if (typeof document !== "undefined") this.ensureContainer();
  }

  /** Create and attach a tooltip to an element */
  create(triggerEl: HTMLElement, options: TooltipOptions): TooltipInstance {
    const id = `tt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const merged: Required<TooltipOptions> & TooltipOptions = {
      placement: options.placement ?? "top",
      fallbackPlacements: options.fallbackPlacements ?? this.getAllPlacements(),
      trigger: options.trigger ?? "hover",
      showDelay: options.showDelay ?? (options.trigger === "hover" ? 200 : 0),
      hideDelay: options.hideDelay ?? (options.trigger === "hover" ? 100 : 0),
      offset: options.offset ?? 8,
      arrow: options.arrow ?? true,
      arrowSize: options.arrowSize ?? 8,
      maxWidth: options.maxWidth ?? 320,
      className: options.className ?? "",
      zIndex: options.zIndex ?? 1050,
      interactive: options.interactive ?? (options.trigger !== "hover"),
      hideOnClickOutside: options.hideOnClickOutside ?? (options.trigger === "click"),
      animationDuration: options.animationDuration ?? 150,
      boundary: options.boundary ?? "viewport",
      boundaryPadding: options.boundaryPadding ?? 8,
      ...options,
    };

    const instance = this.buildTooltip(id, triggerEl, merged);
    this.tooltips.set(id, instance);

    // Bind triggers
    this.bindTriggers(triggerEl, instance, merged);

    return instance;
  }

  /** Create a tooltip on a virtual element (for custom positioning) */
  createVirtual(options: TooltipOptions): TooltipInstance {
    const dummy = document.createElement("div");
    dummy.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;";
    document.body.appendChild(dummy);
    const instance = this.create(dummy, { ...options, virtualElement: options.virtualElement });
    return instance;
  }

  /** Get a tooltip by ID */
  get(id: string): TooltipInstance | undefined { return this.tooltips.get(id); }

  /** Hide all active tooltips */
  hideAll(): void {
    for (const tip of this.tooltips.values()) { if (tip.isVisible()) tip.hide(); }
  }

  /** Destroy all tooltips */
  destroyAll(): void {
    for (const tip of this.tooltips.values()) tip.destroy();
    this.tooltips.clear();
  }

  /** Listen to tooltip events */
  onEvent(listener: (tip: TooltipInstance, action: "show" | "hide") => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Internal ---

  private ensureContainer(): void {
    if (globalContainer) return;
    globalContainer = document.createElement("div");
    globalContainer.id = "tooltip-container";
    globalContainer.setAttribute("role", "tooltip");
    document.body.appendChild(globalContainer);

    const style = document.createElement("style");
    style.textContent = `
      .tt-tooltip {
        position: absolute; z-index: 1050; pointer-events: none;
        opacity: 0; transition: opacity ${150}ms ease, transform ${150}ms ease;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px; line-height: 1.5; color: #fff;
        background: rgba(30, 30, 30, 0.95); border-radius: 8px;
        padding: 6px 12px; max-width: 320px; word-break: break-word;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2), 0 0 1px rgba(0,0,0,0.1);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      }
      .tt-tooltip.tt-visible { opacity: 1; pointer-events: auto; }
      .tt-tooltip.tt-interactive { pointer-events: auto; }
      /* Arrow */
      .tt-arrow {
        position: absolute; width: 8px; height: 8px;
        background: inherit; transform: rotate(45deg);
        box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
      }
      .tt-arrow.tt-arrow-top { bottom: -4px; left: 50%; margin-left: -4px; }
      .tt-arrow.tt-arrow-bottom { top: -4px; left: 50%; margin-left: -4px; }
      .tt-arrow.tt-arrow-left { right: -4px; top: 50%; margin-top: -4px; }
      .tt-arrow.tt-arrow-right { left: -4px; top: 50%; margin-top: -4px; }
      /* Animations */
      .tt-placement-top:not(.tt-visible) { transform: translateY(-4px); }
      .tt-placement-bottom:not(.tt-visible) { transform: translateY(4px); }
      .tt-placement-left:not(.tt-visible) { transform: translateX(-4px); }
      .tt-placement-right:not(.tt-visible) { transform: translateX(4px); }
    `;
    globalContainer.appendChild(style);
  }

  private buildTooltip(id: string, triggerEl: HTMLElement, opts: Required<TooltipOptions>): TooltipInstance {
    if (!globalContainer!) this.ensureContainer();

    const el = document.createElement("div");
    el.className = `tt-tooltip tt-${opts.placement.split("-")[0]}${opts.className ? ` ${opts.className}` : ""}`;
    el.id = id;
    el.style.maxWidth = `${opts.maxWidth}px`;
    el.style.zIndex = String(opts.zIndex);
    el.setAttribute("role", "tooltip");

    // Content
    if (typeof opts.content === "string") {
      el.innerHTML = opts.content;
    } else {
      el.appendChild(opts.content);
    }

    // Arrow
    let arrowEl: HTMLDivElement | null = null;
    if (opts.arrow) {
      arrowEl = document.createElement("div");
      arrowEl.className = `tt-arrow tt-arrow-${opts.placement.split("-")[0]}`;
      el.appendChild(arrowEl);
    }

    globalContainer!.appendChild(el);

    let visible = false;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let positioned: PositionedTooltip | null = null;

    const instance: TooltipInstance = {
      id,
      element: el,
      options: opts,

      show: () => {
        if (showTimer) clearTimeout(showTimer);
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        if (visible) return;

        showTimer = setTimeout(() => {
          visible = true;
          positioned = calculatePosition(triggerEl, el, opts);
          applyPosition(el, arrowEl, positioned!);
          el.classList.add("tt-visible");
          if (opts.interactive) el.classList.add("tt-interactive");
          activeTooltips.add(instance);
          opts.onShow?.(instance);
          this.listeners.forEach((l) => l(instance, "show"));
        }, opts.showDelay);
      },

      hide: () => {
        if (hideTimer) clearTimeout(hideTimer);
        if (showTimer) { clearTimeout(showTimer); showTimer = null; }
        if (!visible) return;

        hideTimer = setTimeout(() => {
          visible = false;
          el.classList.remove("tt-visible", "tt-interactive");
          activeTooltips.delete(instance);
          opts.onHide?.(instance);
          this.listeners.forEach((l) => l(instance, "hide"));
        }, opts.hideDelay);
      },

      toggle: () => { visible ? instance.hide() : instance.show(); },
      isVisible: () => visible,

      updateContent: (content: string | HTMLElement) => {
        if (typeof content === "string") el.innerHTML = content;
        else { el.innerHTML = ""; el.appendChild(content); }
        if (visible) instance.updatePosition();
      },

      updatePosition: () => {
        if (!visible) return;
        positioned = calculatePosition(triggerEl, el, opts);
        applyPosition(el, arrowEl, positioned!);
        opts.onPositionUpdate?.(positioned!);
      },

      destroy: () => {
        instance.hide();
        if (showTimer) clearTimeout(showTimer);
        if (hideTimer) clearTimeout(hideTimer);
        el.remove();
        this.tooltips.delete(id);
        activeTooltips.delete(instance);
      },
    };

    return instance;
  }

  private bindTriggers(triggerEl: HTMLElement, instance: TooltipInstance, opts: Required<TooltipOptions>): void {
    switch (opts.trigger) {
      case "hover": {
        let enterLeaveTimer: ReturnType<typeof setTimeout> | null = null;
        triggerEl.addEventListener("mouseenter", () => {
          if (enterLeaveTimer) clearTimeout(enterLeaveTimer);
          instance.show();
        });
        triggerEl.addEventListener("mouseleave", () => {
          enterLeaveTimer = setTimeout(() => {
            if (!instance.element.matches(":hover")) instance.hide();
          }, 100);
        });
        if (opts.interactive && instance.element) {
          instance.element.addEventListener("mouseenter", () => {
            if (enterLeaveTimer) clearTimeout(enterLeaveTimer);
          });
          instance.element.addEventListener("mouseleave", () => {
            enterLeaveTimer = setTimeout(() => instance.hide(), 100);
          });
        }
        break;
      }
      case "click": {
        triggerEl.addEventListener("click", (e) => {
          e.stopPropagation();
          instance.toggle();
        });
        if (opts.hideOnClickOutside) {
          document.addEventListener("click", (e) => {
            if (instance.isVisible() &&
                !instance.element.contains(e.target as Node) &&
                !triggerEl.contains(e.target as Node)) {
              instance.hide();
            }
          });
        }
        break;
      }
      case "focus": {
        triggerEl.addEventListener("focus", () => instance.show());
        triggerEl.addEventListener("blur", () => instance.hide());
        break;
      }
      case "contextmenu": {
        triggerEl.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          instance.show();
        });
        document.addEventListener("click", () => instance.hide());
        break;
      }
      case "manual":
        break; // Fully controlled
    }
  }

  private getAllPlacements(): TooltipPlacement[] {
    return [
      "top", "top-start", "top-end",
      "bottom", "bottom-start", "bottom-end",
      "left", "left-start", "left-end",
      "right", "right-start", "right-end",
    ];
  }
}

// --- Positioning Engine ---

function calculatePosition(
  trigger: HTMLElement,
  tooltip: HTMLDivElement,
  opts: Required<TooltipOptions>,
): PositionedTooltip {
  const triggerRect = opts.virtualElement
    ? opts.virtualElement.getBoundingClientRect()
    : trigger.getBoundingClientRect();

  const tooltipRect = tooltip.getBoundingClientRect();
  const offset = opts.offset;
  const boundary = getBoundary(opts.boundary);
  const boundaryRect = boundary === window
    ? { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight }
    : boundary.getBoundingClientRect();

  const padding = opts.boundaryPadding;
  const placements = [opts.placement, ...opts.fallbackPlacements.filter((p) => p !== opts.placement)];

  for (const placement of placements) {
    const pos = getPositionForPlacement(triggerRect, tooltipRect, placement, offset);
    // Check bounds
    const fits = pos.x >= boundaryRect.left + padding &&
                 pos.y >= boundaryRect.top + padding &&
                 pos.x + tooltipRect.width <= boundaryRect.right - padding &&
                 pos.y + tooltipRect.height <= boundaryRect.bottom - padding;

    if (fits || placement === opts.placement) {
      // Calculate arrow position
      const arrowPos = calculateArrowPosition(triggerRect, pos, placement, opts.arrowSize ?? 8);
      return { ...pos, actualPlacement: placement, ...arrowPos };
    }
  }

  // Fallback to original placement even if it overflows
  const pos = getPositionForPlacement(triggerRect, tooltipRect, opts.placement, offset);
  const arrowPos = calculateArrowPosition(triggerRect, pos, opts.placement, opts.arrowSize ?? 8);
  return { ...pos, actualPlacement: opts.placement, ...arrowPos };
}

function getPositionForPlacement(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement,
  offset: number,
): { x: number; y: number; placement: TooltipPlacement } {
  const tw = tooltipRect.width;
  const th = tooltipRect.height;
  const tx = triggerRect.left;
  const ty = triggerRect.top;
  const tw2 = triggerRect.width;
  const th2 = triggerRect.height;

  const [main, align] = placement.split("-") as [string, string | undefined];

  let x = 0, y = 0;

  switch (main) {
    case "top":
      y = ty - th - offset;
      x = align === "start" ? tx : align === "end" ? tx + tw2 - tw : tx + tw2 / 2 - tw / 2;
      break;
    case "bottom":
      y = ty + th2 + offset;
      x = align === "start" ? tx : align === "end" ? tx + tw2 - tw : tx + tw2 / 2 - tw / 2;
      break;
    case "left":
      x = tx - tw - offset;
      y = align === "start" ? ty : align === "end" ? ty + th2 - th : ty + th2 / 2 - th / 2;
      break;
    case "right":
      x = tx + tw2 + offset;
      y = align === "start" ? ty : align === "end" ? ty + th2 - th : ty + th2 / 2 - th / 2;
      break;
  }

  return { x, y, placement };
}

function calculateArrowPosition(
  triggerRect: DOMRect,
  pos: { x: number; y: number },
  placement: TooltipPlacement,
  arrowSize: number,
): { arrowX?: number; arrowY?: number } {
  const [main] = placement.split("-");
  switch (main) {
    case "top": return { arrowX: triggerRect.left + triggerRect.width / 2 - pos.x };
    case "bottom": return { arrowX: triggerRect.left + triggerRect.width / 2 - pos.x };
    case "left": return { arrowY: triggerRect.top + triggerRect.height / 2 - pos.y };
    case "right": return { arrowY: triggerRect.top + triggerRect.height / 2 - pos.y };
  }
  return {};
}

function applyPosition(el: HTMLDivElement, arrow: HTMLDivElement | null, pos: PositionedTooltip): void {
  el.style.left = `${pos.x}px`;
  el.style.top = `${pos.y}px`;

  // Update placement class for animation direction
  el.className = el.className.replace(/tt-placement-\w+/g, "");
  el.classList.add(`tt-placement-${pos.actualPlacement.split("-")[0]}`);

  if (arrow) {
    // Update arrow class
    arrow.className = arrow.className.replace(/tt-arrow-\w+/g, "");
    arrow.classList.add(`tt-arrow-${pos.actualPlacement.split("-")[0]}`);

    if (pos.arrowX !== undefined) arrow.style.left = `${pos.arrowX}px`;
    if (pos.arrowY !== undefined) arrow.style.top = `${pos.arrowY}px`;
  }
}

function getBoundary(boundary: HTMLElement | "viewport" | "window"): HTMLElement | Window {
  if (boundary === "viewport" || boundary === "window") return window;
  return boundary;
}

// --- Singleton ---

let defaultEngine: TooltipEngine | null = null;

/** Get or create the global TooltipEngine singleton */
export function getTooltipEngine(options?: Partial<TooltipOptions>): TooltipEngine {
  if (!defaultEngine) defaultEngine = new TooltipEngine(options);
  return defaultEngine;
}
