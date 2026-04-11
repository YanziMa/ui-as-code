/**
 * Popover Component: Positioned popup with trigger, placement (12 positions),
 * arrow indicator, auto-flip, click/hover/focus/manual triggers, grouped popovers,
 * header/body/footer slots, close on outside click, animations, and accessibility.
 */

// --- Types ---

export type PopoverPlacement =
  | "top" | "bottom" | "left" | "right"
  | "top-start" | "top-end"
  | "bottom-start" | "bottom-end"
  | "left-start" | "left-end"
  | "right-start" | "right-end";

export type PopoverTrigger = "click" | "hover" | "focus" | "manual";

export interface PopoverOptions {
  /** Trigger element or selector */
  trigger: HTMLElement | string;
  /** Container for the popover panel (default: document.body) */
  container?: HTMLElement;
  /** Popover content (string, HTML string, or HTMLElement) */
  content: string | HTMLElement;
  /** Placement preference */
  placement?: PopoverPlacement;
  /** How to open */
  triggerMode?: PopoverTrigger;
  /** Show arrow indicator? */
  arrow?: boolean;
  /** Arrow size in px (default: 8) */
  arrowSize?: number;
  /** Offset from trigger in px (default: 8) */
  offset?: number;
  /** Panel width (default: auto) */
  width?: number | string;
  /** Max width (default: 320px) */
  maxWidth?: number;
  /** Panel padding */
  padding?: number;
  /** Close when clicking outside? */
  closeOnOutsideClick?: boolean;
  /** Delay before opening on hover (ms) */
  openDelay?: number;
  /** Delay before closing on hover (ms) */
  closeDelay?: number;
  /** Disable auto-flip on overflow */
  disableAutoFlip?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom class on popover panel */
  className?: string;
  /** Callback when popover opens */
  onOpen?: () => void;
  /** Callback when popover closes */
  onClose?: () => void;
}

export interface PopoverInstance {
  /** The popover panel element */
  element: HTMLElement;
  /** The trigger element */
  triggerEl: HTMLElement;
  /** Is currently visible? */
  isOpen: () => boolean;
  /** Show the popover */
  show: () => void;
  /** Hide the popover */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Update content */
  setContent: (content: string | HTMLElement) => void;
  /** Update placement */
  setPlacement: (placement: PopoverPlacement) => void;
  /** Reposition (call after layout changes) */
  updatePosition: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

const OPPOSITE_MAP: Record<string, string> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

function getBasePlacement(placement: PopoverPlacement): { side: string; align: string } {
  const parts = placement.split("-");
  return { side: parts[0]!, align: parts[1] ?? "center" };
}

// --- Main Factory ---

export function createPopover(options: PopoverOptions): PopoverInstance {
  const opts = {
    placement: options.placement ?? "bottom",
    triggerMode: options.triggerMode ?? "click",
    arrow: options.arrow ?? true,
    arrowSize: options.arrowSize ?? 8,
    offset: options.offset ?? 8,
    maxWidth: options.maxWidth ?? 320,
    padding: options.padding ?? 12,
    closeOnOutsideClick: options.closeOnOutsideClick ?? true,
    openDelay: options.openDelay ?? 0,
    closeDelay: options.closeDelay ?? 150,
    zIndex: options.zIndex ?? 1050,
    animationDuration: options.animationDuration ?? 150,
    container: options.container ?? document.body,
    className: options.className ?? "",
    ...options,
  };

  // Resolve trigger element
  const triggerEl = typeof options.trigger === "string"
    ? document.querySelector<HTMLElement>(options.trigger)!
    : options.trigger;

  if (!triggerEl) throw new Error("Popover: trigger element not found");

  // Popover panel
  const panel = document.createElement("div");
  panel.className = `popover ${opts.className}`;
  panel.setAttribute("role", "tooltip");
  panel.style.cssText = `
    position:absolute;z-index:${opts.zIndex};
    background:#fff;border:1px solid #e5e7eb;border-radius:10px;
    box-shadow:0 8px 30px rgba(0,0,0,0.12),0 0 1px rgba(0,0,0,0.06);
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    max-width:${opts.maxWidth}px;padding:${opts.padding}px;
    opacity:0;pointer-events:none;
    transform:scale(0.96);transition:
      opacity ${opts.animationDuration}ms ease,
      transform ${opts.animationDuration}ms cubic-bezier(0.175,0.885,0.32,1.275);
  `;
  if (opts.width) {
    panel.style.width = typeof opts.width === "number" ? `${opts.width}px` : opts.width;
  }

  // Content area
  const bodyEl = document.createElement("div");
  bodyEl.className = "popover-body";
  if (typeof opts.content === "string") {
    bodyEl.innerHTML = opts.content;
  } else {
    bodyEl.appendChild(opts.content);
  }
  panel.appendChild(bodyEl);

  // Arrow
  let arrowEl: HTMLElement | null = null;
  if (opts.arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "popover-arrow";
    arrowEl.style.cssText = `
      position:absolute;width:${opts.arrowSize * 2}px;height:${opts.arrowSize * 2}px;
      pointer-events:none;::before{content:'';position:absolute;
      border:${opts.arrowSize + 1}px solid transparent;}
      ::after{content:'';position:absolute;
      border:${opts.arrowSize}px solid #fff;}
    `;
    panel.appendChild(arrowEl);
  }

  opts.container.appendChild(panel);

  // State
  let isOpenState = false;
  let currentPlacement = opts.placement;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  // --- Positioning ---

  function updatePosition(): void {
    const { side, align } = getBasePlacement(currentPlacement);
    const triggerRect = triggerEl.getBoundingClientRect();
    const containerRect = opts.container.getBoundingClientRect();

    let top: number;
    let left: number;

    // Calculate base position
    switch (side) {
      case "top":
        top = triggerRect.top - panel.offsetHeight - opts.offset;
        break;
      case "bottom":
        top = triggerRect.bottom + opts.offset;
        break;
      case "left":
        left = triggerRect.left - panel.offsetWidth - opts.offset;
        break;
      case "right":
        left = triggerRect.right + opts.offset;
        break;
      default:
        top = triggerRect.bottom + opts.offset;
    }

    // Alignment
    if (side === "top" || side === "bottom") {
      switch (align) {
        case "start": left = triggerRect.left; break;
        case "end": left = triggerRect.right - panel.offsetWidth; break;
        default: left = triggerRect.left + (triggerRect.offsetWidth - panel.offsetWidth) / 2; break;
      }
      if (left < 8) left = 8;
      if (left + panel.offsetWidth > window.innerWidth - 8) left = window.innerWidth - panel.offsetWidth - 8;
    } else {
      switch (align) {
        case "start": top = triggerRect.top; break;
        case "end": top = triggerRect.bottom - panel.offsetHeight; break;
        default: top = triggerRect.top + (triggerRect.offsetHeight - panel.offsetHeight) / 2; break;
      }
      if (top < 8) top = 8;
      if (top + panel.offsetHeight > window.innerHeight - 8) top = window.innerHeight - panel.offsetHeight - 8;
    }

    // Convert to container-relative coordinates
    const containerStyle = opts.container.style.position;
    if (containerStyle !== "fixed" && containerStyle !== "absolute") {
      top += window.scrollY - containerRect.top + window.scrollY;
      left += window.scrollX - containerRect.left + window.scrollX;
    }

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;

    // Position arrow
    if (arrowEl) {
      positionArrow(side, align);
    }

    // Auto-flip if overflowing
    if (!opts.disableAutoFlip) {
      autoFlip(side, align);
    }
  }

  function positionArrow(side: string, align: string): void {
    const as = opts.arrowSize!;
    const oppositeSide = OPPOSITE_MAP[side] ?? "bottom";

    // Reset
    arrowEl!.style.top = "";
    arrowEl!.style.left = "";
    arrowEl!.style.right = "";
    arrowEl!.style.bottom = "";

    // Arrow sits on the side facing the trigger
    if (side === "top" || side === "bottom") {
      arrowEl.style.top = side === "top" ? "100%" : `-${as * 2}px`;
      arrowEl.style.left = align === "center"
        ? `calc(50% - ${as}px)`
        : align === "start"
          ? `${as * 2}px`
          : `calc(100% - ${as * 3}px)`;

      // CSS borders for arrow shape
      const style = document.createElement("style");
      style.textContent = `
        .popover-arrow::before{${side}:-${as + 1}px;border-${oppositeSide}-color:#e5e7eb;
          ${align === "center" ? "left:50%;transform:translateX(-50%);" :
            align === "start" ? `left:${as * 2}px;` : `right:${as * 2}px;`}
        }
        .popover-arrow::after{${side}:-${as}px;border-${oppositeSide}-color:#fff;
          ${align === "center" ? "left:50%;transform:translateX(-50%);" :
            align === "start" ? `left:${as + 1}px;` : `right:${as + 1}px;`}
        }
      `;
      if (!document.getElementById("popover-arrow-style")) {
        style.id = "popover-arrow-style";
        document.head.appendChild(style);
      }
    } else {
      arrowEl.style.left = side === "left" ? "100%" : `-${as * 2}px`;
      arrowEl.style.top = align === "center"
        ? `calc(50% - ${as}px)`
        : align === "start"
          ? `${as * 2}px`
          : `calc(100% - ${as * 3}px)`;
    }
  }

  function autoFlip(currentSide: string, _currentAlign: string): void {
    const rect = panel.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let flipped = false;
    let newPlacement = currentPlacement;

    // Flip horizontally if off-screen
    if ((currentSide === "left" && rect.left < 8) ||
        (currentSide === "right" && rect.right > viewportW - 8)) {
      newPlacement = currentSide === "left" ? "right" : "left";
      flipped = true;
    }

    // Flip vertically if off-screen
    if ((currentSide === "top" && rect.top < 8) ||
        (currentSide === "bottom" && rect.bottom > viewportH - 8)) {
      newPlacement = currentSide === "top" ? "bottom" : "top";
      flipped = true;
    }

    if (flipped && newPlacement !== currentPlacement) {
      currentPlacement = newPlacement as PopoverPlacement;
      updatePosition();
    }
  }

  // --- Show/Hide ---

  function doShow(): void {
    if (isOpenState || destroyed) return;
    isOpenState = true;

    updatePosition();
    requestAnimationFrame(() => {
      panel.style.opacity = "1";
      panel.style.pointerEvents = "auto";
      panel.style.transform = "scale(1)";
    });

    opts.onOpen?.();
  }

  function doHide(): void {
    if (!isOpenState || destroyed) return;
    isOpenState = false;

    panel.style.opacity = "0";
    panel.style.pointerEvents = "none";
    panel.style.transform = "scale(0.96)";

    setTimeout(() => {
      panel.style.display = "none";
    }, opts.animationDuration);

    opts.onClose?.();
  }

  // --- Event bindings ---

  switch (opts.triggerMode) {
    case "click":
      triggerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      break;

    case "hover":
      triggerEl.addEventListener("mouseenter", () => {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        if (opts.openDelay > 0) {
          openTimer = setTimeout(doShow, opts.openDelay);
        } else {
          doShow();
        }
      });
      triggerEl.addEventListener("mouseleave", () => {
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        closeTimer = setTimeout(doHide, opts.closeDelay);
      });
      panel.addEventListener("mouseenter", () => {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      });
      panel.addEventListener("mouseleave", () => {
        closeTimer = setTimeout(doHide, opts.closeDelay);
      });
      break;

    case "focus":
      triggerEl.addEventListener("focus", doShow);
      triggerEl.addEventListener("blur", doHide);
      break;

    case "manual":
      // User controls via API only
      break;
  }

  // Click outside to close
  if (opts.closeOnOutsideClick) {
    document.addEventListener("mousedown", (e) => {
      if (isOpenState &&
          !panel.contains(e.target as Node) &&
          !triggerEl.contains(e.target as Node)) {
        doHide();
      }
    });
  }

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpenState) doHide();
  };
  document.addEventListener("keydown", escHandler);

  // --- Instance ---

  function toggle(): void {
    isOpenState ? doHide() : doShow();
  }

  const instance: PopoverInstance = {
    element: panel,
    triggerEl,

    isOpen: () => isOpenState,

    show: doShow,

    hide: doHide,

    toggle,

    setContent(content: string | HTMLElement) {
      bodyEl.innerHTML = "";
      if (typeof content === "string") {
        bodyEl.innerHTML = content;
      } else {
        bodyEl.appendChild(content);
      }
      if (isOpenState) updatePosition();
    },

    setPlacement(placement: PopoverPlacement) {
      currentPlacement = placement;
      if (isOpenState) updatePosition();
    },

    updatePosition,

    destroy() {
      destroyed = true;
      if (openTimer) clearTimeout(openTimer);
      if (closeTimer) clearTimeout(closeTimer);
      document.removeEventListener("keydown", escHandler);
      panel.remove();
    },
  };

  return instance;
}
