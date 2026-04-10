/**
 * Tooltip Manager: Smart tooltip/popover system with auto-positioning (12 placements),
 * flip behavior, arrow indicator, show/hide delays, follow-cursor mode, rich HTML content,
 * virtual element positioning, group management, and accessibility.
 */

// --- Types ---

export type Placement =
  | "top" | "top-start" | "top-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end"
  | "right" | "right-start" | "right-end";

export type TriggerMode = "hover" | "click" | "focus" | "manual";

export interface TooltipOptions {
  /** Content: string or HTMLElement */
  content: string | HTMLElement;
  /** Placement preference (default: "top") */
  placement?: Placement;
  /** Fallback placements if preferred doesn't fit */
  fallbackPlacements?: Placement[];
  /** How to trigger show/hide */
  trigger?: TriggerMode;
  /** Delay before showing (ms, default: 200) */
  showDelay?: number;
  /** Delay before hiding (ms, default: 100) */
  hideDelay?: number;
  /** Show arrow indicator (default: true) */
  arrow?: boolean;
  /** Arrow size in px (default: 8) */
  arrowSize?: number;
  /** Offset from the target (px, default: 8) */
  offset?: number;
  /** Max width of tooltip (px, default: 300) */
  maxWidth?: number;
  /** Custom CSS class for container */
  className?: string;
  /** Z-index (default: 1050) */
  zIndex?: number;
  /** Follow cursor position instead of anchoring to element */
  followCursor?: boolean;
  /** Interactive: allow mouse into tooltip without hiding */
  interactive?: boolean;
  /** Hide on click inside tooltip */
  hideOnClick?: boolean;
  /** Portal target (default: document.body) */
  portalTarget?: HTMLElement;
  /** Called when tooltip shows */
  onShow?: (tooltip: TooltipInstance) => void;
  /** Called when tooltip hides */
  onHide?: (tooltip: TooltipInstance) => void;
  /** Disable tooltip */
  disabled?: boolean;
}

export interface VirtualElement {
  getBoundingClientRect(): DOMRect;
  contextElement?: Element;
}

export interface TooltipInstance {
  id: string;
  element: HTMLElement;
  isVisible: boolean;
  show(): void;
  hide(): void;
  toggle(): void;
  updateContent(content: string | HTMLElement): void;
  updatePosition(): void;
  destroy(): void;
}

// --- Positioning Engine ---

interface PositionedResult {
  x: number;
  y: number;
  placement: Placement;
  arrowX?: number;
  arrowY?: number;
}

function computePosition(
  target: Element | VirtualElement,
  popup: HTMLElement,
  placement: Placement,
  offset: number,
): PositionedResult {
  const targetRect = target instanceof Element
    ? target.getBoundingClientRect()
    : target.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const { width: pw, height: ph } = popupRect;

  let x: number, y: number;
  const [main, align] = placement.split("-") as [Placement, string | undefined];

  switch (main) {
    case "top":
      x = targetRect.left + targetRect.width / 2 - pw / 2;
      y = targetRect.top - ph - offset;
      break;
    case "bottom":
      x = targetRect.left + targetRect.width / 2 - pw / 2;
      y = targetRect.bottom + offset;
      break;
    case "left":
      x = targetRect.left - pw - offset;
      y = targetRect.top + targetRect.height / 2 - ph / 2;
      break;
    case "right":
      x = targetRect.right + offset;
      y = targetRect.top + targetRect.height / 2 - ph / 2;
      break;
    default:
      x = targetRect.left; y = targetRect.top - ph - offset;
  }

  // Alignment adjustments
  switch (align) {
    case "start":
      if (main === "top" || main === "bottom") x = targetRect.left;
      else y = targetRect.top;
      break;
    case "end":
      if (main === "top" || main === "bottom") x = targetRect.right - pw;
      else y = targetRect.bottom - ph;
      break;
  }

  // Arrow position
  let arrowX: number | undefined, arrowY: number | undefined;
  if (main === "top" || main === "bottom") {
    arrowX = targetRect.left + targetRect.width / 2 - x;
  } else {
    arrowY = targetRect.top + targetRect.height / 2 - y;
  }

  return { x, y, placement, arrowX, arrowY };
}

function fitsInViewport(x: number, y: number, w: number, h: number): boolean {
  return x >= 0 && y >= 0 && x + w <= window.innerWidth && y + h <= window.innerHeight;
}

function getOppositePlacement(p: Placement): Placement {
  const map: Record<string, Placement> = { top: "bottom", bottom: "top", left: "right", right: "left" };
  const [main, align] = p.split("-");
  return `${map[main] ?? p}${align ? `-${align}` : ""}` as Placement;
}

// --- Tooltip Manager ---

export class TooltipManager {
  private tooltips = new Map<string, {
    instance: TooltipInstance;
    options: Required<Pick<TooltipOptions, "showDelay" | "hideDelay" | "interactive" | "hideOnClick" | "arrow" | "disabled">> & Omit<TooltipOptions, "showDelay" | "hideDelay" | "interactive" | "hideOnClick" | "arrow" | "disabled">;
    target: Element | VirtualElement;
    showTimer: ReturnType<typeof setTimeout> | null;
    hideTimer: ReturnType<typeof setTimeout> | null;
    cleanupFns: Array<() => void>;
  }>();
  private idCounter = 0;

  /**
   * Attach a tooltip to an element.
   */
  attach(target: Element | VirtualElement, options: TooltipOptions): TooltipInstance {
    const id = `tt_${++this.idCounter}_${Date.now().toString(36)}`;
    const portal = options.portalTarget ?? document.body;

    // Create tooltip element
    const el = document.createElement("div");
    el.className = `tt-tooltip ${options.className ?? ""}`;
    el.setAttribute("role", "tooltip");
    el.style.cssText = `
      position: fixed; z-index: ${options.zIndex ?? 1050};
      pointer-events: none; opacity: 0; transition: opacity 0.15s ease;
      max-width: ${options.maxWidth ?? 300}px;
      padding: 6px 10px; border-radius: 6px;
      background: #1a1a1a; color: #fff; font-size: 13px;
      line-height: 1.4; word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    // Content wrapper
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "tt-content";
    if (typeof options.content === "string") {
      contentWrapper.textContent = options.content;
    } else {
      contentWrapper.appendChild(options.content);
    }
    el.appendChild(contentWrapper);

    // Arrow
    const arrowEl = options.arrow !== false ? document.createElement("div") : null;
    if (arrowEl) {
      const size = options.arrowSize ?? 8;
      arrowEl.className = "tt-arrow";
      arrowEl.style.cssText = `
        position: absolute; width: ${size}px; height: ${size}px;
        background: inherit; transform: rotate(45deg);
      `;
      el.appendChild(arrowEl);
    }

    portal.appendChild(el);

    const resolvedOptions = {
      ...options,
      showDelay: options.showDelay ?? 200,
      hideDelay: options.hideDelay ?? 100,
      interactive: options.interactive ?? false,
      hideOnClick: options.hideOnClick ?? true,
      arrow: options.arrow ?? true,
      disabled: options.disabled ?? false,
    };

    const cleanupFns: Array<() => void> = [];

    const instance: TooltipInstance = {
      id,
      element: el,
      isVisible: false,

      show() {
        const entry = this.tooltips.get(id);
        if (!entry || entry.options.disabled) return;

        clearTimeout(entry.hideTimer!);
        entry.hideTimer = null;

        entry.showTimer = setTimeout(() => {
          this.positionTooltip(entry!);
          el.style.opacity = "1";
          el.style.pointerEvents = entry.options.interactive ? "auto" : "none";
          instance.isVisible = true;
          entry.options.onShow?.(instance);
        }, entry.options.showDelay);
      }.bind(this),

      hide() {
        const entry = this.tooltips.get(id);
        if (!entry) return;

        clearTimeout(entry.showTimer!);
        entry.showTimer = null;

        entry.hideTimer = setTimeout(() => {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          instance.isVisible = false;
          entry.options.onHide?.(instance);
        }, entry.options.hideDelay);
      }.bind(this),

      toggle() { instance.isVisible ? instance.hide() : instance.show(); },

      updateContent(content: string | HTMLElement) {
        if (typeof content === "string") contentWrapper.textContent = content;
        else { contentWrapper.innerHTML = ""; contentWrapper.appendChild(content); }
        if (instance.isVisible) this.positionTooltip(this.tooltips.get(id)!);
      }.bind(this),

      updatePosition() {
        const entry = this.tooltips.get(id);
        if (entry) this.positionTooltip(entry);
      }.bind(this),

      destroy() {
        const entry = this.tooltips.get(id);
        if (entry) {
          clearTimeout(entry.showTimer!);
          clearTimeout(entry.hideTimer!);
          for (const fn of entry.cleanupFns) fn();
          this.tooltips.delete(id);
        }
        el.remove();
      },
    };

    const entry = { instance, options: resolvedOptions, target, showTimer: null, hideTimer: null, cleanupFns };
    this.tooltips.set(id, entry);

    // Bind triggers
    this.bindTriggers(target, instance, resolvedOptions, cleanupFns);

    return instance;
  }

  /**
   * Show a one-shot tooltip at a specific position.
   */
  showAt(x: number, y: number, content: string | HTMLElement, duration?: number): TooltipInstance {
    const virtualEl: VirtualElement = {
      getBoundingClientRect: () => ({ x, y, top: y, bottom: y, left: x, right: x, width: 0, height: 0, toJSON: () => "" }) as DOMRect,
    };
    const instance = this.attach(virtualEl, { content, placement: "bottom", showDelay: 0, hideDelay: 0 });
    instance.show();

    if (duration) {
      setTimeout(() => instance.destroy(), duration);
    }

    return instance;
  }

  /**
   * Get all active tooltip instances.
   */
  getAll(): TooltipInstance[] { return Array.from(this.tooltips.values()).map((e) => e.instance); }

  /** Hide all visible tooltips */
  hideAll(): void {
    for (const [, entry] of this.tooltips) {
      if (entry.instance.isVisible) entry.instance.hide();
    }
  }

  /** Destroy all tooltips */
  destroyAll(): void {
    for (const [, entry] of this.tooltips) entry.instance.destroy();
    this.tooltips.clear();
  }

  // --- Internal ---

  private bindTriggers(
    target: Element | VirtualElement,
    instance: TooltipInstance,
    options: TooltipOptions,
    cleanupFns: Array<() => void>,
  ): void {
    if (!(target instanceof Element)) return; // Can't bind events to virtual elements

    const trigger = options.trigger ?? "hover";

    if (trigger === "hover") {
      const showHandler = () => instance.show();
      const hideHandler = () => instance.hide();

      target.addEventListener("mouseenter", showHandler);
      target.addEventListener("mouseleave", hideHandler);
      target.addEventListener("focus", showHandler);
      target.addEventListener("blur", hideHandler);

      // Keep open when hovering over interactive tooltip
      if (options.interactive) {
        instance.element.addEventListener("mouseenter", showHandler);
        instance.element.addEventListener("mouseleave", hideHandler);
      }

      cleanupFns.push(
        () => target.removeEventListener("mouseenter", showHandler),
        () => target.removeEventListener("mouseleave", hideHandler),
        () => target.removeEventListener("focus", showHandler),
        () => target.removeEventListener("blur", hideHandler),
      );
    } else if (trigger === "click") {
      const handler = (e: MouseEvent) => {
        e.stopPropagation();
        instance.toggle();
        if (options.hideOnClick && instance.isVisible) {
          const closeOnOutside = (ev: MouseEvent) => {
            if (!instance.element.contains(ev.target as Node)) {
              instance.hide();
              document.removeEventListener("mousedown", closeOnOutside);
            }
          };
          setTimeout(() => document.addEventListener("mousedown", closeOnOutside), 0);
        }
      };
      target.addEventListener("click", handler);
      cleanupFns.push(() => target.removeEventListener("click", handler));
    } else if (trigger === "focus") {
      target.addEventListener("focus", () => instance.show());
      target.addEventListener("blur", () => instance.hide());
      cleanupFns.push(
        () => target.removeEventListener("focus", instance.show.bind(instance)),
        () => target.removeEventListener("blur", instance.hide.bind(instance)),
      );
    }

    // Follow cursor mode
    if (options.followCursor && target instanceof Element) {
      const moveHandler = (e: MouseEvent) => {
        if (!instance.isVisible) return;
        const virtEl: VirtualElement = {
          getBoundingClientRect: () => ({
            left: e.clientX, top: e.clientY, right: e.clientX, bottom: e.clientY,
            width: 1, height: 1, x: e.clientX, y: e.clientY, toJSON: () => "",
          }) as DOMRect,
        };
        const entry = this.tooltips.get(instance.id);
        if (entry) { entry.target = virtEl; this.positionTooltip(entry); }
      };
      target.addEventListener("mousemove", moveHandler);
      cleanupFns.push(() => target.removeEventListener("mousemove", moveHandler));
    }
  }

  private positionTooltip(entry: NonNullable<TooltipManager["to tooltips"] extends Map<string, infer V> ? V : never>): void {
    const { instance, options, target } = entry;
    const el = instance.element;
    const preferredPlacement = options.placement ?? "top";
    const fallbacks = options.fallbackPlacements ?? [
      getOppositePlacement(preferredPlacement),
      "bottom", "top",
    ];
    const offset = options.offset ?? 8;

    // Try preferred placement first
    let result = computePosition(target, el, preferredPlacement, offset);

    // Check viewport fit and try fallbacks
    if (!fitsInViewport(result.x, result.y, el.offsetWidth, el.offsetHeight)) {
      for (const fb of fallbacks) {
        const alt = computePosition(target, el, fb, offset);
        if (fitsInViewport(alt.x, alt.y, el.offsetWidth, el.offsetHeight)) {
          result = alt;
          break;
        }
      }
    }

    // Apply position
    el.style.left = `${result.x}px`;
    el.style.top = `${result.y}px`;

    // Position arrow
    const arrowEl = el.querySelector(".tt-arrow") as HTMLElement | null;
    if (arrowEl && result.arrowX !== undefined) {
      const size = options.arrowSize ?? 8;
      const [main] = result.placement.split("-");

      switch (main) {
        case "top":
          arrowEl.style.bottom = `-${size / 2}px`;
          arrowEl.style.left = `${result.arrowX - size / 2}px`;
          arrowJ.style.top = "";
          arrowEl.style.right = "";
          break;
        case "bottom":
          arrowEl.style.top = `-${size / 2}px`;
          arrowEl.style.left = `${result.arrowX - size / 2}px`;
          arrowEl.style.bottom = "";
          arrowEl.style.right = "";
          break;
        case "left":
          arrowEl.style.right = `-${size / 2}px`;
          arrowEl.style.top = `${result.arrowY! - size / 2}px`;
          arrowEl.style.left = "";
          arrowEl.style.bottom = "";
          break;
        case "right":
          arrowEl.style.left = `-${size / 2}px`;
          arrowEl.style.top = `${result.arrowY! - size / 2}px`;
          arrowEl.style.right = "";
          arrowEl.style.bottom = "";
          break;
      }
    }
  }
}
