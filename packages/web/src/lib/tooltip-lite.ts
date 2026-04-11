/**
 * Lightweight Tooltip: Simple hover/click tooltip with positioning logic,
 * multiple placements, delay, arrow indicator, max-width control,
 * and accessibility support.
 */

// --- Types ---

export type TooltipPlacement = "top" | "bottom" | "left" | "right" | "top-start" | "top-end" | "bottom-start" | "bottom-end";
export type TooltipTrigger = "hover" | "click" | "focus";

export interface TooltipOptions {
  /** Anchor element or selector */
  anchor: HTMLElement | string;
  /** Tooltip content (text or HTML) */
  content: string | HTMLElement;
  /** Placement preference */
  placement?: TooltipPlacement;
  /** Trigger mode */
  trigger?: TooltipTrigger;
  /** Show delay in ms (default: 200 for hover) */
  delay?: number;
  /** Hide delay in ms */
  hideDelay?: number;
  /** Max width in px */
  maxWidth?: number;
  /** Show arrow/pointer? */
  arrow?: boolean;
  /** Offset from anchor in px */
  offset?: number;
  /** Custom background color */
  color?: string;
  /** Text color */
  textColor?: string;
  /** Border radius */
  borderRadius?: number;
  /** Font size in px */
  fontSize?: number;
  /** Hide on click outside? */
  hideOnClickOutside?: boolean;
  /** Allow HTML content? */
  allowHtml?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Custom CSS class for tooltip container */
  className?: string;
  /** Callback when tooltip shows */
  onShow?: () => void;
  /** Callback when tooltip hides */
  onHide?: () => void;
}

export interface TooltipInstance {
  element: HTMLElement;
  /** Show the tooltip */
  show: () => void;
  /** Hide the tooltip */
  hide: () => void;
  /** Update content */
  setContent: (content: string | HTMLElement) => void;
  /** Update placement */
  setPlacement: (placement: TooltipPlacement) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Default Config ---

const DEFAULTS = {
  placement: "top" as TooltipPlacement,
  trigger: "hover" as TooltipTrigger,
  delay: 200,
  hideDelay: 100,
  maxWidth: 280,
  arrow: true,
  offset: 8,
  color: "#1f2937",
  textColor: "#f1f5f9",
  borderRadius: 8,
  fontSize: 13,
  hideOnClickOutside: true,
  zIndex: 1050,
};

// --- Main Factory ---

export function createTooltip(options: TooltipOptions): TooltipInstance {
  const opts = { ...DEFAULTS, ...options };

  // Resolve anchor
  const anchor = typeof options.anchor === "string"
    ? document.querySelector<HTMLElement>(options.anchor)!
    : options.anchor;

  if (!anchor) throw new Error("Tooltip: anchor element not found");

  let destroyed = false;
  let visible = false;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  // Create tooltip element
  const el = document.createElement("div");
  el.className = `tooltip tooltip-${opts.placement} ${options.className ?? ""}`;
  el.setAttribute("role", "tooltip");
  el.style.cssText = `
    position:absolute;z-index:${opts.zIndex};pointer-events:none;
    opacity:0;transition:opacity 0.15s ease,transform 0.15s ease;
    max-width:${opts.maxWidth}px;padding:8px 12px;
    background:${opts.color};color:${opts.textColor};
    border-radius:${opts.borderRadius}px;font-size:${opts.fontSize}px;
    line-height:1.4;box-shadow:0 4px 16px rgba(0,0,0,0.12);
    font-family:-apple-system,sans-serif;word-break:break-word;
    white-space:normal;
  `;
  document.body.appendChild(el);

  // Arrow element
  let arrowEl: HTMLElement | null = null;
  if (opts.arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "tooltip-arrow";
    arrowEl.style.cssText = `
      position:absolute;width:8px;height:8px;background:${opts.color};
      transform:rotate(45deg);z-index:-1;
    `;
    el.appendChild(arrowEl);
  }

  // Set initial content
  setContentInternal(options.content);

  // --- Positioning ---

  function updatePosition(): void {
    const rect = anchor.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    let top: number, left: number;

    switch (opts.placement) {
      case "top":
        top = rect.top - opts.offset - el.offsetHeight;
        left = rect.left + (rect.width / 2) - (el.offsetWidth / 2);
        break;
      case "bottom":
        top = rect.bottom + opts.offset;
        left = rect.left + (rect.width / 2) - (el.offsetWidth / 2);
        break;
      case "left":
        top = rect.top + (rect.height / 2) - (el.offsetHeight / 2);
        left = rect.left - opts.offset - el.offsetWidth;
        break;
      case "right":
        top = rect.top + (rect.height / 2) - (el.offsetHeight / 2);
        left = rect.right + opts.offset;
        break;
      case "top-start":
        top = rect.top - opts.offset - el.offsetHeight;
        left = rect.left;
        break;
      case "top-end":
        top = rect.top - opts.offset - el.offsetHeight;
        left = rect.right - el.offsetWidth;
        break;
      case "bottom-start":
        top = rect.bottom + opts.offset;
        left = rect.left;
        break;
      case "bottom-end":
        top = rect.bottom + opts.offset;
        left = rect.right - el.offsetWidth;
        break;
      default:
        top = rect.top - opts.offset - el.offsetHeight;
        left = rect.left + (rect.width / 2) - (el.offsetWidth / 2);
    }

    // Clamp to viewport
    if (left < 4) left = 4;
    if (left + el.offsetWidth > viewW - 4) left = viewW - el.offsetWidth - 4;
    if (top < 4) {
      // Flip to bottom if not enough space above
      top = rect.bottom + opts.offset;
    }
    if (top + el.offsetHeight > viewH - 4) {
      top = Math.max(4, rect.top - opts.offset - el.offsetHeight);
    }

    el.style.top = `${top}px`;
    el.style.left = `${Math.max(4, left)}px`;

    // Position arrow
    if (arrowEl && opts.arrow) {
      const isTop = top < rect.top;
      const isLeft = opts.placement === "left";
      const isRight = opts.placement === "right";

      if (isTop || (!isLeft && !isRight)) {
        // Arrow points down (tooltip is above anchor)
        const arrowTop = el.offsetHeight - 4;
        const arrowLeft = Math.min(el.offsetWidth / 2 - 4, Math.max(4, rect.left + rect.width / 2 - left));
        arrowEl.style.top = `${arrowTop}px`;
        arrowEl.style.left = `${arrowLeft}px`;
        arrowEl.style.transform = "rotate(45deg)";
      } else if (isLeft) {
        // Arrow points right
        arrowEl.style.top = `${el.offsetHeight / 2 - 4}px`;
        arrowEl.style.left = `${el.offsetWidth - 4}px`;
        arrowEl.style.transform = "rotate(45deg)";
      } else {
        // Arrow points left
        arrowEl.style.top = `${el.offsetHeight / 2 - 4}px`;
        arrowEl.style.left = "-4px";
        arrowEl.style.transform = "rotate(-45deg)";
      }
    }
  }

  // --- Content Management ---

  function setContentInternal(content: string | HTMLElement): void {
    const inner = document.createElement("div");
    inner.className = "tooltip-inner";
    if (typeof content === "string") {
      inner.textContent = content;
    } else {
      inner.innerHTML = "";
      inner.appendChild(content);
    }
    el.innerHTML = "";
    el.appendChild(inner);
    if (arrowEl) el.appendChild(arrowEl);
  }

  // --- Event Handlers ---

  function doShow(): void {
    if (destroyed || visible) return;
    showTimer = setTimeout(() => {
      updatePosition();
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
      visible = true;
      opts.onShow?.();
    }, opts.delay);
  }

  function doHide(): void {
    if (!visible) return;
    clearTimeout(showTimer);
    hideTimer = setTimeout(() => {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      visible = false;
      opts.onHide?.();
    }, opts.hideDelay);
  }

  switch (opts.trigger) {
    case "hover":
      anchor.addEventListener("mouseenter", doShow);
      anchor.addEventListener("mouseleave", doHide);
      break;
    case "click":
      anchor.addEventListener("click", () => {
        if (visible) doHide(); else doShow();
      });
      break;
    case "focus":
      anchor.addEventListener("focus", doShow);
      anchor.addEventListener("blur", doHide);
      break;
  }

  // Click outside to close
  if (opts.hideOnClickOutside) {
    document.addEventListener("mousedown", handleClickOutside);
  }

  function handleClickOutside(e: MouseEvent): void {
    if (!visible || destroyed) return;
    const target = e.target as Node;
    if (el.contains(target) || anchor.contains(target)) return;
    doHide();
  }

  // Update position on scroll/resize (debounced)
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const onResize = (): void => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (visible) updatePosition();
    }, 50);
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onResize, { passive: true });

  // --- Instance ---

  const instance: TooltipInstance = {
    element: el,

    show() { doShow(); },

    hide() { doHide(); },

    setContent(content: string | HTMLElement) {
      setContentInternal(content);
      if (visible) updatePosition();
    },

    setPlacement(placement: TooltipPlacement) {
      opts.placement = placement;
      el.classList.remove(`tooltip-${opts.placement}`);
      el.classList.add(`tooltip-${placement}`);
      if (visible) updatePosition();
    },

    destroy() {
      destroyed = true;
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
      el.remove();
    },
  };

  return instance;
}

// --- Quick Helpers ---

/** Attach a simple hover tooltip to an element */
export function attachTooltip(
  anchor: HTMLElement | string,
  content: string,
  placement: TooltipPlacement = "top",
): TooltipInstance {
  return createTooltip({ anchor, content, placement });
}

/** Create a tooltip that shows on click (useful for mobile) */
export function attachClickTooltip(
  anchor: HTMLElement | string,
  content: string,
): TooltipInstance {
  return createTooltip({ anchor, content, trigger: "click" });
}

/** Create a tooltip with rich HTML content */
export function attachHtmlTooltip(
  anchor: HTMLElement | string,
  htmlContent: string,
  placement: TooltipPlacement = "top",
): TooltipInstance {
  const div = document.createElement("div");
  div.innerHTML = htmlContent;
  return createTooltip({
    anchor,
    content: div,
    placement,
    allowHtml: true,
  });
}
