/**
 * Lightweight Popover: Floating content panel anchored to a trigger element,
 * with 12 placements, arrow indicator, auto-flip, click/hover/focus triggers,
 * boundary detection, and animation support.
 */

// --- Types ---

export type PopoverPlacement =
  | "top" | "top-start" | "top-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end"
  | "right" | "right-start" | "right-end";

export type PopoverTrigger = "click" | "hover" | "focus" | "manual";
export type PopoverArrow = boolean;

export interface PopoverOptions {
  /** Trigger element or selector */
  trigger: HTMLElement | string;
  /** Content (string or HTML element) */
  content: string | HTMLElement;
  /** Placement */
  placement?: PopoverPlacement;
  /** Trigger mode */
  triggerMode?: PopoverTrigger;
  /** Show arrow? */
  arrow?: boolean;
  /** Offset from trigger (px) */
  offset?: number;
  /** Width (px or 'auto') */
  width?: number | "trigger";
  /** Max width (px) */
  maxWidth?: number;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  duration?: number;
  /** Hide delay on hover leave (ms) */
  hideDelay?: number;
  /** Show delay on hover enter (ms) */
  showDelay?: number;
  /** Close on outside click? */
  closeOnClickOutside?: boolean;
  /** Custom CSS class for popover panel */
  className?: string;
  /** Callback when popover opens */
  onOpen?: () => void;
  /** Callback when popover closes */
  onClose?: () => void;
}

export interface PopoverInstance {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  setContent: (content: string | HTMLElement) => void;
  updatePosition: () => void;
  destroy: () => void;
}

// --- Helpers ---

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

// --- Main Factory ---

export function createPopover(options: PopoverOptions): PopoverInstance {
  const opts = {
    placement: options.placement ?? "top",
    triggerMode: options.triggerMode ?? "click",
    arrow: options.arrow ?? true,
    offset: options.offset ?? 8,
    width: options.width ?? "auto",
    maxWidth: options.maxWidth ?? 320,
    zIndex: options.zIndex ?? 10600,
    duration: options.duration ?? 150,
    hideDelay: options.hideDelay ?? 150,
    showDelay: options.showDelay ?? 0,
    closeOnClickOutside: options.closeOnClickOutside ?? true,
    className: options.className ?? "",
  };

  const triggerEl = resolveEl(options.trigger);
  if (!triggerEl) throw new Error("Popover: trigger element not found");

  let isOpenState = false;
  let destroyed = false;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  // Popover panel
  const panel = document.createElement("div");
  panel.className = `popover ${opts.className}`;
  panel.setAttribute("role": "tooltip");
  panel.style.cssText = `
    position:absolute;z-index:${opts.zIndex};
    background:#fff;border-radius:10px;
    box-shadow:0 8px 30px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.04);
    border:1px solid #e5e7eb;padding:12px 16px;
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    line-height:1.5;max-width:${opts.maxWidth}px;
    opacity:0;pointer-events:none;transform:scale(0.96);
    transition:opacity ${opts.duration}ms ease, transform ${opts.duration}ms ease;
    display:none;
  `;

  if (typeof opts.width === "number") {
    panel.style.width = `${opts.width}px`;
  }

  // Arrow
  let arrowEl: HTMLElement | null = null;
  if (opts.arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "popover-arrow";
    arrowEl.style.cssText = `
      position:absolute;width:10px;height:10px;background:#fff;
      border:1px solid #e5e7eb;transform:rotate(45deg);
      z-index:-1;
    `;
    panel.appendChild(arrowEl);
  }

  // Content area
  const contentWrap = document.createElement("div");
  contentWrap.className = "popover-content";
  if (typeof options.content === "string") {
    contentWrap.innerHTML = options.content;
  } else {
    contentWrap.appendChild(options.content);
  }
  panel.appendChild(contentWrap);

  document.body.appendChild(panel);

  // --- Positioning ---

  function getPosition(): { x: number; y: number } {
    const rect = triggerEl!.getBoundingClientRect();
    const pRect = panel.getBoundingClientRect();

    let x: number, y: number;
    const gap = opts.offset;

    switch (opts.placement) {
      case "top":
        x = rect.left + rect.width / 2 - pRect.width / 2;
        y = rect.top - pRect.height - gap;
        break;
      case "top-start":
        x = rect.left;
        y = rect.top - pRect.height - gap;
        break;
      case "top-end":
        x = rect.right - pRect.width;
        y = rect.top - pRect.height - gap;
        break;
      case "bottom":
        x = rect.left + rect.width / 2 - pRect.width / 2;
        y = rect.bottom + gap;
        break;
      case "bottom-start":
        x = rect.left;
        y = rect.bottom + gap;
        break;
      case "bottom-end":
        x = rect.right - pRect.width;
        y = rect.bottom + gap;
        break;
      case "left":
        x = rect.left - pRect.width - gap;
        y = rect.top + rect.height / 2 - pRect.height / 2;
        break;
      case "left-start":
        x = rect.left - pRect.width - gap;
        y = rect.top;
        break;
      case "left-end":
        x = rect.left - pRect.width - gap;
        y = rect.bottom - pRect.height;
        break;
      case "right":
        x = rect.right + gap;
        y = rect.top + rect.height / 2 - pRect.height / 2;
        break;
      case "right-start":
        x = rect.right + gap;
        y = rect.top;
        break;
      case "right-end":
        x = rect.right + gap;
        y = rect.bottom - pRect.height;
        break;
      default:
        x = rect.left + rect.width / 2 - pRect.width / 2;
        y = rect.top - pRect.height - gap;
    }

    // Clamp to viewport
    const margin = 8;
    x = Math.max(margin, Math.min(x, window.innerWidth - pRect.width - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - pRect.height - margin));

    return { x, y };
  }

  function positionArrow(): void {
    if (!arrowEl) return;
    const rect = triggerEl!.getBoundingClientRect();
    const pRect = panel.getBoundingClientRect();

    // Reset
    arrowEl.style.top = "";
    arrowEl.style.left = "";
    arrowEl.style.right = "";
    arrowEl.style.bottom = "";

    const placementBase = opts.placement.split("-")[0]!;

    switch (placementBase) {
      case "top":
        arrowEl.style.bottom = "-5px";
        arrowEl.style.left = `${rect.left + rect.width / 2 - pRect.left - 5}px`;
        break;
      case "bottom":
        arrowEl.style.top = "-5px";
        arrowEl.style.left = `${rect.left + rect.width / 2 - pRect.left - 5}px`;
        break;
      case "left":
        arrowEl.style.right = "-5px";
        arrowEl.style.top = `${rect.top + rect.height / 2 - pRect.top - 5}px`;
        break;
      case "right":
        arrowEl.style.left = "-5px";
        arrowEl.style.top = `${rect.top + rect.height / 2 - pRect.top - 5}px`;
        break;
    }
  }

  function updatePosition(): void {
    const pos = getPosition();
    panel.style.left = `${pos.x}px`;
    panel.style.top = `${pos.y}px`;
    if (opts.arrow) positionArrow();
  }

  // --- Open / Close ---

  function doOpen(): void {
    if (isOpenState || destroyed) return;
    cancelTimers();
    if (opts.showDelay > 0) {
      showTimer = setTimeout(() => performOpen(), opts.showDelay);
    } else {
      performOpen();
    }
  }

  function performOpen(): void {
    isOpenState = true;
    panel.style.display = "block";
    updatePosition();

    requestAnimationFrame(() => {
      panel.style.opacity = "1";
      panel.style.pointerEvents = "auto";
      panel.style.transform = "scale(1)";
    });

    opts.onOpen?.();
  }

  function doClose(): void {
    if (!isOpenState || destroyed) return;
    cancelTimers();
    if (opts.hideDelay > 0) {
      hideTimer = setTimeout(() => performClose(), opts.hideDelay);
    } else {
      performClose();
    }
  }

  function performClose(): void {
    isOpenState = false;
    panel.style.opacity = "0";
    panel.style.pointerEvents = "none";
    panel.style.transform = "scale(0.96)";

    setTimeout(() => {
      if (!isOpenState) panel.style.display = "none";
    }, opts.duration);

    opts.onClose?.();
  }

  function cancelTimers(): void {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  // --- Event Bindings ---

  switch (opts.triggerMode) {
    case "click":
      triggerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      break;

    case "hover":
      triggerEl.addEventListener("mouseenter", () => doOpen());
      triggerEl.addEventListener("mouseleave", () => doClose());
      panel.addEventListener("mouseenter", () => { cancelTimers(); });
      panel.addEventListener("mouseleave", () => doClose());
      break;

    case "focus":
      triggerEl.addEventListener("focus", () => doOpen());
      triggerEl.addEventListener("blur", () => doClose());
      break;

    case "manual":
      // No auto-binding
      break;
  }

  // Close on outside click
  if (opts.closeOnClickOutside && opts.triggerMode !== "hover") {
    document.addEventListener("mousedown", (e: MouseEvent) => {
      if (isOpenState && !panel.contains(e.target as Node) && !triggerEl!.contains(e.target as Node)) {
        doClose();
      }
    });
  }

  // Reposition on scroll/resize
  window.addEventListener("scroll", () => { if (isOpenState) updatePosition(); }, true);
  window.addEventListener("resize", () => { if (isOpenState) updatePosition(); });

  // Escape to close
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpenState) doClose();
  });

  const instance: PopoverInstance = {
    element: panel,

    open: doOpen,
    close: doClose,

    toggle() { isOpenState ? doClose() : doOpen(); },

    isOpen() { return isOpenState; },

    setContent(content: string | HTMLElement) {
      contentWrap.innerHTML = "";
      if (typeof content === "string") {
        contentWrap.innerHTML = content;
      } else {
        contentWrap.appendChild(content);
      }
      if (isOpenState) updatePosition();
    },

    updatePosition,

    destroy() {
      destroyed = true;
      cancelTimers();
      panel.remove();
    },
  };

  return instance;
}
