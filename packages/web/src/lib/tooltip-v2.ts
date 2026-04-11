/**
 * Tooltip V2: Enhanced tooltip/popover with rich HTML content,
 * multiple placement strategies, arrow indicator, animations,
 * delay control, interactive mode (hoverable tooltips),
 * virtual element positioning, and accessibility.
 */

// --- Types ---

export type TooltipPlacement =
  | "top" | "top-start" | "top-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end"
  | "right" | "right-start" | "right-end"
  | "auto" | "auto-start" | "auto-end";

export type TooltipTrigger = "hover" | "focus" | "click" | "manual";

export interface TooltipV2Options {
  /** Target/trigger element or selector */
  target: HTMLElement | string;
  /** Tooltip content (string or HTML) */
  content: string | HTMLElement;
  /** Placement preference */
  placement?: TooltipPlacement;
  /** How to trigger the tooltip */
  trigger?: TooltipTrigger;
  /** Show delay (ms) */
  showDelay?: number;
  /** Hide delay (ms) */
  hideDelay?: number;
  /** Tooltip max width (px) */
  maxWidth?: number;
  /** Offset from target (px) */
  offset?: [number, number];
  /** Show arrow indicator? */
  arrow?: boolean;
  /** Arrow size (px) */
  arrowSize?: number;
  /** Allow hovering over tooltip content without hiding? */
  interactive?: boolean;
  /** Hide on click outside? */
  hideOnClickOutside?: boolean;
  /** Animation type */
  animation?: "fade" | "scale" | "slide" | "none";
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Border radius (px) */
  borderRadius?: number;
  /** Padding (px) */
  padding?: number;
  /** Font size (px) */
  fontSize?: number;
  /** Z-index */
  zIndex?: number;
  /** Custom CSS class */
  className?: string;
  /** Callback when tooltip shows */
  onShow?: () => void;
  /** Callback when tooltip hides */
  onHide?: () => void;
}

export interface TooltipV2Instance {
  element: HTMLElement;
  /** Show the tooltip */
  show: () => void;
  /** Hide the tooltip */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update content */
  setContent: (content: string | HTMLElement) => void;
  /** Update placement */
  setPlacement: (placement: TooltipPlacement) => void;
  /** Reposition (call after layout changes) */
  updatePosition: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_OFFSET: [number, number] = [8, 8];

// --- Placement Utilities ---

interface Rect { x: number; y: number; w: number; h: number; }

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function computePosition(
  targetRect: Rect,
  popupRect: Rect,
  placement: TooltipPlacement,
  offset: [number, number]
): { x: number; y: number; placement: TooltipPlacement } {
  let x: number, y: number;
  let finalPlacement = placement;

  const t = targetRect;
  const p = popupRect;
  const [ox, oy] = offset;

  switch (placement) {
    case "top":
      x = t.x + t.w / 2 - p.w / 2;
      y = t.y - p.h - oy;
      break;
    case "top-start":
      x = t.x - ox;
      y = t.y - p.h - oy;
      break;
    case "top-end":
      x = t.x + t.w - p.w + ox;
      y = t.y - p.h - oy;
      break;
    case "bottom":
      x = t.x + t.w / 2 - p.w / 2;
      y = t.y + t.h + oy;
      break;
    case "bottom-start":
      x = t.x - ox;
      y = t.y + t.h + oy;
      break;
    case "bottom-end":
      x = t.x + t.w - p.w + ox;
      y = t.y + t.h + oy;
      break;
    case "left":
      x = t.x - p.w - ox;
      y = t.y + t.h / 2 - p.h / 2;
      break;
    case "left-start":
      x = t.x - p.w - ox;
      y = t.y - oy;
      break;
    case "left-end":
      x = t.x - p.w - ox;
      y = t.y + t.h - p.h + oy;
      break;
    case "right":
      x = t.x + t.w + ox;
      y = t.y + t.h / 2 - p.h / 2;
      break;
    case "right-start":
      x = t.x + t.w + ox;
      y = t.y - oy;
      break;
    case "right-end":
      x = t.x + t.w + ox;
      y = t.y + t.h - p.h + oy;
      break;
    default:
      x = t.x + t.w / 2 - p.w / 2;
      y = t.y - p.h - oy;
      finalPlacement = "top";
  }

  // Auto-flip logic
  if (placement.startsWith("auto")) {
    const base = placement.replace("auto-", "") as TooltipPlacement;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Check if fits in preferred direction
    let fits = true;
    switch (base) {
      case "top": case "top-start": case "top-end":
        fits = y >= 0; break;
      case "bottom": case "bottom-start": case "bottom-end":
        fits = y + p.h <= viewportH; break;
      case "left": case "left-start": case "left-end":
        fits = x >= 0; break;
      case "right": case "right-start": case "right-end":
        fits = x + p.w <= viewportW; break;
    }

    if (!fits) {
      // Flip to opposite side
      const flipped = flipPlacement(base);
      return computePosition(targetRect, popupRect, flipped, offset);
    }
    finalPlacement = base;
  }

  // Clamp to viewport
  x = Math.max(4, Math.min(x, viewportW - p.w - 4));
  y = Math.max(4, Math.min(y, viewportH - p.h - 4));

  return { x, y, placement: finalPlacement };
}

function flipPlacement(p: TooltipPlacement): TooltipPlacement {
  const map: Record<string, TooltipPlacement> = {
    top: "bottom", "top-start": "bottom-start", "top-end": "bottom-end",
    bottom: "top", "bottom-start": "top-start", "bottom-end": "top-end",
    left: "right", "left-start": "right-start", "left-end": "right-end",
    right: "left", "right-start": "right-start", "right-end": "right-end",
  };
  return map[p] ?? "top";
}

function getArrowPosition(placement: TooltipPlacement, arrowSize: number): { x: string; y: string; rotate: string } {
  const s = arrowSize;
  switch (placement) {
    case "top":           return { x: "50%", y: "100%", rotate: "225deg" };
    case "top-start":     return { x: "16px", y: "100%", rotate: "225deg" };
    case "top-end":       return { x: "calc(100% - 16px)", y: "100%", rotate: "225deg" };
    case "bottom":        return { x: "50%", y: "0%", rotate: "45deg" };
    case "bottom-start":  return { x: "16px", y: "0%", rotate: "45deg" };
    case "bottom-end":    return { x: "calc(100% - 16px)", y: "0%", rotate: "45deg" };
    case "left":          return { x: "100%", y: "50%", rotate: "135deg" };
    case "left-start":    return { x: "100%", y: "16px", rotate: "135deg" };
    case "left-end":      return { x: "100%", y: "calc(100% - 16px)", rotate: "135deg" };
    case "right":         return { x: "0%", y: "50%", rotate: "-45deg" };
    case "right-start":   return { x: "0%", y: "16px", rotate: "-45deg" };
    case "right-end":     return { x: "0%", y: "calc(100% - 16px)", rotate: "-45deg" };
    default:              return { x: "50%", y: "100%", rotate: "225deg" };
  }
}

// --- Main Factory ---

export function createTooltipV2(options: TooltipV2Options): TooltipV2Instance {
  const opts = {
    placement: options.placement ?? "top",
    trigger: options.trigger ?? "hover",
    showDelay: options.showDelay ?? 200,
    hideDelay: options.hideDelay ?? 100,
    maxWidth: options.maxWidth ?? 320,
    offset: options.offset ?? DEFAULT_OFFSET,
    arrow: options.arrow ?? true,
    arrowSize: options.arrowSize ?? 8,
    interactive: options.interactive ?? false,
    hideOnClickOutside: options.hideOnClickOutside ?? true,
    animation: options.animation ?? "fade",
    animationDuration: options.animationDuration ?? 150,
    backgroundColor: options.backgroundColor ?? "#1f2937",
    textColor: options.textColor ?? "#f3f4f6",
    borderRadius: options.borderRadius ?? 8,
    padding: options.padding ?? 10,
    fontSize: options.fontSize ?? 13,
    zIndex: options.zIndex ?? 10999,
    className: options.className ?? "",
    ...options,
  };

  const target = typeof options.target === "string"
    ? document.querySelector<HTMLElement>(options.target)!
    : options.target;

  if (!target) throw new Error("TooltipV2: target not found");

  let visible = false;
  let destroyed = false;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let currentPlacement = opts.placement;

  // Create tooltip element
  const tooltip = document.createElement("div");
  tooltip.className = `tooltip-v2 tt-${opts.animation} ${opts.className}`;
  tooltip.setAttribute("role", "tooltip");
  tooltip.style.cssText = `
    position:fixed;z-index:${opts.zIndex};
    max-width:${opts.maxWidth}px;
    background:${opts.backgroundColor};
    color:${opts.textColor};
    border-radius:${opts.borderRadius}px;
    padding:${opts.padding}px;
    font-size:${opts.fontSize}px;line-height:1.5;
    font-family:-apple-system,sans-serif;
    pointer-events:none;box-shadow:0 8px 30px rgba(0,0,0,0.2);
    opacity:0;transition:opacity ${opts.animationDuration}ms ease,
                              transform ${opts.animationDuration}ms ease;
    word-wrap:break-word;
  `;

  // Set initial animation state
  switch (opts.animation) {
    case "scale": tooltip.style.transform = "scale(0.95)"; break;
    case "slide": tooltip.style.transform = "translateY(4px)"; break;
    case "fade":
    default: break;
  }

  // Content
  function setContentInternal(content: string | HTMLElement): void {
    tooltip.innerHTML = "";
    if (typeof content === "string") {
      tooltip.innerHTML = content;
    } else {
      tooltip.appendChild(content.cloneNode(true));
    }
  }
  setContentInternal(options.content);

  // Arrow
  let arrowEl: HTMLElement | null = null;
  if (opts.arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "tt-arrow";
    arrowEl.style.cssText = `
      position:absolute;width:${opts.arrowSize}px;height:${opts.arrowSize}px;
      background:${opts.backgroundColor};
      transform:rotate(45deg);pointer-events:none;
    `;
    tooltip.appendChild(arrowEl);
  }

  document.body.appendChild(tooltip);

  // --- Positioning ---

  function updatePosition(): void {
    if (!visible) return;
    const targetRect = getRect(target);
    const tooltipRect = { x: 0, y: 0, w: tooltip.offsetWidth, h: tooltip.offsetHeight };
    const pos = computePosition(targetRect, tooltipRect, currentPlacement, opts.offset);
    tooltip.style.left = `${pos.x}px`;
    tooltip.style.top = `${pos.y}px`;
    currentPlacement = pos.placement;

    // Position arrow
    if (arrowEl) {
      const ap = getArrowPosition(currentPlacement, opts.arrowSize);
      arrowEl.style.left = ap.x;
      arrowEl.style.top = ap.y;
      arrowEl.style.transform = `rotate(${ap.rotate})`;
    }
  }

  // --- Show/Hide ---

  function show(): void {
    if (destroyed || visible) return;
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    showTimer = setTimeout(() => {
      visible = true;
      tooltip.style.pointerEvents = opts.interactive ? "auto" : "none";
      document.body.appendChild(tooltip);
      updatePosition();

      requestAnimationFrame(() => {
        tooltip.style.opacity = "1";
        tooltip.style.transform = "";
      });

      opts.onShow?.();
    }, opts.showDelay);
  }

  function hide(): void {
    if (destroyed || !visible) return;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }

    hideTimer = setTimeout(() => {
      visible = false;
      tooltip.style.opacity = "0";
      switch (opts.animation) {
        case "scale": tooltip.style.transform = "scale(0.95)"; break;
        case "slide": tooltip.style.transform = "translateY(4px)"; break;
      }
      tooltip.style.pointerEvents = "none";

      setTimeout(() => {
        if (!visible) tooltip.style.display = "none";
      }, opts.animationDuration);

      opts.onHide?.();
    }, opts.hideDelay);
  }

  function toggle(): void {
    visible ? hide() : show();
  }

  // --- Event Binding ---

  if (opts.trigger === "hover") {
    target.addEventListener("mouseenter", show);
    target.addEventListener("mouseleave", (e) => {
      // If moving to tooltip itself and interactive, don't hide
      if (opts.interactive && tooltip.contains(e.relatedTarget as Node)) return;
      hide();
    });
    if (opts.interactive) {
      tooltip.addEventListener("mouseenter", () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } });
      tooltip.addEventListener("mouseleave", hide);
    }
  } else if (opts.trigger === "focus") {
    target.addEventListener("focus", show);
    target.addEventListener("blur", hide);
  } else if (opts.trigger === "click") {
    target.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
  }

  // Click outside to close
  if (opts.hideOnClickOutside) {
    document.addEventListener("mousedown", (e) => {
      if (visible && !tooltip.contains(e.target as Node) && e.target !== target && !target.contains(e.target as Node)) {
        hide();
      }
    });
  }

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && visible) { e.preventDefault(); hide(); }
  };
  document.addEventListener("keydown", escHandler);

  // Reposition on scroll/resize
  let rafId: number | null = null;
  const reposition = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updatePosition);
  };
  window.addEventListener("scroll", reposition, { passive: true });
  window.addEventListener("resize", reposition, { passive: true });

  // --- Instance ---

  const instance: TooltipV2Instance = {
    element: tooltip,

    show,
    hide,
    toggle,

    isVisible() { return visible; },

    setContent(content: string | HTMLElement) {
      setContentInternal(content);
      if (visible) updatePosition();
    },

    setPlacement(placement: TooltipPlacement) {
      currentPlacement = placement;
      if (visible) updatePosition();
    },

    updatePosition,

    destroy() {
      destroyed = true;
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (rafId) cancelAnimationFrame(rafId);
      tooltip.remove();
      document.removeEventListener("keydown", escHandler);
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    },
  };

  return instance;
}
