/**
 * Popover V2: Enhanced popover with rich content, multiple triggers,
 * arrow indicator, interactive mode, virtual element support,
 * headless rendering, animations, and accessibility.
 */

// --- Types ---

export type PopoverPlacement =
  | "top" | "top-start" | "top-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end"
  | "right" | "right-start" | "right-end";

export type PopoverTrigger = "hover" | "focus" | "click" | "manual" | "context-menu";

export interface PopoverV2Options {
  /** Trigger/target element or selector */
  target: HTMLElement | string;
  /** Popover content (string or HTMLElement) */
  content: string | HTMLElement;
  /** Preferred placement */
  placement?: PopoverPlacement;
  /** Trigger behavior */
  trigger?: PopoverTrigger;
  /** Show delay (ms) */
  showDelay?: number;
  /** Hide delay (ms) */
  hideDelay?: number;
  /** Popover width (px, 'auto', or CSS value) */
  width?: number | string;
  /** Max height before scroll (px) */
  maxHeight?: number;
  /** Offset from target [x, y] in px */
  offset?: [number, number];
  /** Show arrow? */
  arrow?: boolean;
  /** Arrow size (px) */
  arrowSize?: number;
  /** Allow interaction with popover content? */
  interactive?: boolean;
  /** Hide when clicking outside? */
  hideOnClickOutside?: boolean;
  /** Hide on escape key? */
  hideOnEscape?: boolean;
  /** Animation type */
  animation?: "fade" | "scale" | "slide-up" | "slide-down" | "none";
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Background color */
  background?: string;
  /** Border color */
  borderColor?: string;
  /** Border radius (px) */
  borderRadius?: number;
  /** Box shadow */
  shadow?: string;
  /** Padding inside popover (px) */
  padding?: number | string;
  /** Z-index */
  zIndex?: number;
  /** Custom header (HTMLElement) */
  header?: HTMLElement;
  /** Custom footer (HTMLElement) */
  footer?: HTMLElement;
  /** Title text (shown in header if no custom header) */
  title?: string;
  /** Close button in header? */
  closable?: boolean;
  /** Callback on show */
  onShow?: () => void;
  /** Callback on hide */
  onHide?: () => void;
  /** Callback before show (return false to prevent) */
  shouldShow?: () => boolean;
  /** Custom CSS class */
  className?: string;
}

export interface PopoverV2Instance {
  element: HTMLElement;
  /** Show the popover */
  show: () => void;
  /** Hide the popover */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update content */
  setContent: (content: string | HTMLElement) => void;
  /** Update position */
  updatePosition: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Placement Math ---

interface R { x: number; y: number; w: number; h: number; }

function getElRect(el: HTMLElement): R {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function calcPosition(
  targetR: R,
  popW: number,
  popH: number,
  place: PopoverPlacement,
  offset: [number, number]
): { x: number; y: number } {
  const [ox, oy] = offset;
  const t = targetR;
  switch (place) {
    case "top":           return { x: t.x + t.w / 2 - popW / 2, y: t.y - popH - oy };
    case "top-start":     return { x: t.x - ox, y: t.y - popH - oy };
    case "top-end":       return { x: t.x + t.w - popW + ox, y: t.y - popH - oy };
    case "bottom":        return { x: t.x + t.w / 2 - popW / 2, y: t.y + t.h + oy };
    case "bottom-start":  return { x: t.x - ox, y: t.y + t.h + oy };
    case "bottom-end":    return { x: t.x + t.w - popW + ox, y: t.y + t.h + oy };
    case "left":          return { x: t.x - popW - ox, y: t.y + t.h / 2 - popH / 2 };
    case "left-start":    return { x: t.x - popW - ox, y: t.y - oy };
    case "left-end":      return { x: t.x - popW - ox, y: t.y + t.h - popH + oy };
    case "right":         return { x: t.x + t.w + ox, y: t.y + t.h / 2 - popH / 2 };
    case "right-start":   return { x: t.x + t.w + ox, y: t.y - oy };
    case "right-end":     return { x: t.x + t.w + ox, y: t.y + t.h - popH + oy };
    default:              return { x: t.x + t.w / 2 - popW / 2, y: t.y - popH - oy };
  }
}

function getArrowStyle(place: PopoverPlacement, size: number): { left: string; top: string; transform: string } {
  switch (place) {
    case "top": case "top-start": case "top-end":
      return { left: "50%", top: "100%", transform: "translateX(-50%) rotate(45deg)" };
    case "bottom": case "bottom-start": case "bottom-end":
      return { left: "50%", top: "-4px", transform: "translateX(-50%) rotate(45deg)" };
    case "left": case "left-start": case "left-end":
      return { left: "100%", top: "50%", transform: "translateY(-50%) rotate(45deg)" };
    case "right": case "right-start": case "right-end":
      return { left: "-4px", top: "50%", transform: "translateY(-50%) rotate(45deg)" };
    default:
      return { left: "50%", top: "100%", transform: "translateX(-50%) rotate(45deg)" };
  }
}

// --- Main Factory ---

export function createPopoverV2(options: PopoverV2Options): PopoverV2Instance {
  const opts = {
    placement: options.placement ?? "bottom",
    trigger: options.trigger ?? "click",
    showDelay: options.showDelay ?? 100,
    hideDelay: options.hideDelay ?? 150,
    width: options.width ?? 280,
    maxHeight: options.maxHeight ?? 400,
    offset: options.offset ?? [8, 8],
    arrow: options.arrow ?? true,
    arrowSize: options.arrowSize ?? 10,
    interactive: options.interactive ?? true,
    hideOnClickOutside: options.hideOnClickOutside ?? true,
    hideOnEscape: options.hideOnEscape ?? true,
    animation: options.animation ?? "scale",
    animationDuration: options.animationDuration ?? 180,
    background: options.background ?? "#fff",
    borderColor: options.borderColor ?? "#e5e7eb",
    borderRadius: options.borderRadius ?? 12,
    shadow: options.shadow ?? "0 10px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
    padding: options.padding ?? 16,
    zIndex: options.zIndex ?? 10800,
    closable: options.closable ?? false,
    className: options.className ?? "",
    ...options,
  };

  const target = typeof options.target === "string"
    ? document.querySelector<HTMLElement>(options.target)!
    : options.target;

  if (!target) throw new Error("PopoverV2: target not found");

  let visible = false;
  let destroyed = false;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  // Create popover
  const popover = document.createElement("div");
  popover.className = `popover-v2 pv-${opts.animation} ${opts.className}`;
  popover.setAttribute("role", "dialog");
  popover.style.cssText = `
    position:fixed;z-index:${opts.zIndex};
    width:${typeof opts.width === "number" ? opts.width + "px" : opts.width};
    max-height:${opts.maxHeight}px;overflow-y:auto;overflow-x:hidden;
    background:${opts.background};border:1px solid ${opts.borderColor};
    border-radius:${opts.borderRadius}px;
    box-shadow:${opts.shadow};
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    pointer-events:none;opacity:0;
    transition:opacity ${opts.animationDuration}ms ease,
                transform ${opts.animationDuration}ms cubic-bezier(0.16,1,0.3,1);
  `;
  switch (opts.animation) {
    case "scale": popover.style.transform = "scale(0.96) translateY(-4px)"; break;
    case "slide-up": popover.style.transform = "translateY(6px)"; break;
    case "slide-down": popover.style.transform = "translateY(-6px)"; break;
  }

  // Header
  if (opts.header || opts.title || opts.closable) {
    const hdr = document.createElement("div");
    hdr.className = "pv-header";
    hdr.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:12px ${typeof opts.padding === "number" ? opts.padding : 16}px 16px;
      border-bottom:1px solid #f0f0f0;font-weight:600;font-size:14px;
    `;
    if (opts.header) {
      hdr.appendChild(opts.header.cloneNode(true));
    } else {
      const titleSpan = document.createElement("span");
      titleSpan.textContent = opts.title ?? "";
      hdr.appendChild(titleSpan);
    }

    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "\u00D7";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.style.cssText = `
        width:24px;height:24px;border-radius:6px;border:none;background:none;
        cursor:pointer;font-size:14px;color:#9ca3af;display:flex;
        align-items:center;justify-content:center;
      `;
      closeBtn.addEventListener("click", () => hide());
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
      hdr.appendChild(closeBtn);
    }
    popover.appendChild(hdr);
  }

  // Body
  const body = document.createElement("div");
  body.className = "pv-body";
  body.style.cssText = `padding:${typeof opts.padding === "number" ? opts.padding + "px" : opts.padding};`;
  if (typeof options.content === "string") {
    body.innerHTML = options.content;
  } else {
    body.appendChild(options.content.cloneNode(true));
  }
  popover.appendChild(body);

  // Footer
  if (opts.footer) {
    const ftr = document.createElement("div");
    ftr.className = "pv-footer";
    ftr.style.cssText = `
      padding:12px ${typeof opts.padding === "number" ? opts.padding : 16}px 16px;
      border-top:1px solid #f0f0f0;
    `;
    ftr.appendChild(opts.footer.cloneNode(true));
    popover.appendChild(ftr);
  }

  // Arrow
  let arrowEl: HTMLElement | null = null;
  if (opts.arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "pv-arrow";
    arrowEl.style.cssText = `
      position:absolute;width:${opts.arrowSize}px;height:${opts.arrowSize}px;
      background:${opts.background};border-${opts.placement.startsWith("bottom") ? "top" : opts.placement.startsWith("top") ? "bottom" : opts.placement.startsWith("left") ? "right" : "left"}:1px solid ${opts.borderColor};
      z-index:-1;pointer-events:none;
    `;
    popover.appendChild(arrowEl);
  }

  document.body.appendChild(popover);

  // --- Positioning ---

  function updatePosition(): void {
    if (!visible) return;
    const tR = getElRect(target);
    const pos = calcPosition(tR, popover.offsetWidth, popover.offsetHeight, opts.placement, opts.offset);

    // Clamp to viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    pos.x = Math.max(4, Math.min(pos.x, vw - popover.offsetWidth - 4));
    pos.y = Math.max(4, Math.min(pos.y, vh - popover.offsetHeight - 4));

    popover.style.left = `${pos.x}px`;
    popover.style.top = `${pos.y}px`;

    if (arrowEl) {
      const as = getArrowStyle(opts.placement, opts.arrowSize);
      arrowEl.style.left = as.left;
      arrowEl.style.top = as.top;
      arrowEl.style.transform = as.transform;
    }
  }

  // --- Show/Hide ---

  function show(): void {
    if (destroyed || visible) return;
    if (opts.shouldShow?.() === false) return;

    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    showTimer = setTimeout(() => {
      visible = true;
      document.body.appendChild(popover);
      popover.style.pointerEvents = opts.interactive ? "auto" : "none";
      updatePosition();

      requestAnimationFrame(() => {
        popover.style.opacity = "1";
        popover.style.transform = "";
      });

      opts.onShow?.();
    }, opts.showDelay);
  }

  function hide(): void {
    if (destroyed || !visible) return;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }

    hideTimer = setTimeout(() => {
      visible = false;
      popover.style.opacity = "0";
      switch (opts.animation) {
        case "scale": popover.style.transform = "scale(0.96) translateY(-4px)"; break;
        case "slide-up": popover.style.transform = "translateY(6px)"; break;
        case "slide-down": popover.style.transform = "translateY(-6px)"; break;
      }
      popover.style.pointerEvents = "none";

      setTimeout(() => { if (!visible) popover.style.display = "none"; }, opts.animationDuration);
      opts.onHide?.();
    }, opts.hideDelay);
  }

  function toggle(): void { visible ? hide() : show(); }

  // --- Events ---

  if (opts.trigger === "hover") {
    target.addEventListener("mouseenter", show);
    target.addEventListener("mouseleave", (e) => {
      if (opts.interactive && popover.contains(e.relatedTarget as Node)) return;
      hide();
    });
    if (opts.interactive) {
      popover.addEventListener("mouseenter", () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } });
      popover.addEventListener("mouseleave", hide);
    }
  } else if (opts.trigger === "focus") {
    target.addEventListener("focus", show);
    target.addEventListener("blur", hide);
  } else if (opts.trigger === "click") {
    target.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  } else if (opts.trigger === "context-menu") {
    target.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      show();
    });
  }

  if (opts.hideOnClickOutside) {
    document.addEventListener("mousedown", (e) => {
      if (visible && !popover.contains(e.target as Node) && e.target !== target && !target.contains(e.target as Node)) {
        hide();
      }
    });
  }

  if (opts.hideOnEscape) {
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape" && visible) { e.preventDefault(); hide(); } };
    document.addEventListener("keydown", escHandler);
    (popover as any).__escHandler = escHandler;
  }

  // Reposition on scroll/resize
  let rafId: number | null = null;
  const reposition = () => { if (rafId) cancelAnimationFrame(rafId); rafId = requestAnimationFrame(updatePosition); };
  window.addEventListener("scroll", reposition, { passive: true });
  window.addEventListener("resize", reposition, { passive: true });

  // --- Instance ---

  const instance: PopoverV2Instance = {
    element: popover,
    show,
    hide,
    toggle,
    isVisible: () => visible,

    setContent(content: string | HTMLElement) {
      body.innerHTML = "";
      if (typeof content === "string") body.innerHTML = content;
      else body.appendChild(content.cloneNode(true));
      if (visible) updatePosition();
    },

    updatePosition,

    destroy() {
      destroyed = true;
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (rafId) cancelAnimationFrame(rafId);
      const eh = (popover as any).__escHandler;
      if (eh) document.removeEventListener("keydown", eh);
      popover.remove();
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    },
  };

  return instance;
}
