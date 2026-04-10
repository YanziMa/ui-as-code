/**
 * Popover Component: Positioned overlay with arrow, multiple trigger modes (click/hover/focus/manual),
 * close-on-outside-click, close-on-escape, animation, portal rendering, and accessibility.
 */

// --- Types ---

export type PopoverTrigger = "click" | "hover" | "focus" | "manual";
export type PopoverPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface PopoverOptions {
  /** Anchor/trigger element or selector */
  anchor: HTMLElement | string;
  /** Content: HTML string, element, or function returning element */
  content: string | HTMLElement | (() => HTMLElement);
  /** Trigger mode */
  trigger?: PopoverTrigger | PopoverTrigger[];
  /** Preferred placement */
  placement?: PopoverPlacement;
  /** Offset from anchor (px) */
  offset?: number;
  /** Show arrow/pointer */
  arrow?: boolean;
  /** Arrow size (px) */
  arrowSize?: number;
  /** Width of popover (px or 'auto') */
  width?: number | "anchor";
  /** Z-index */
  zIndex?: number;
  /** Close when clicking outside */
  closeOnClickOutside?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Delay before opening on hover (ms) */
  openDelay?: number;
  /** Delay before closing on hover (ms) */
  closeDelay?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class for popover */
  className?: string;
  /** Portal target (default: document.body) */
  portal?: HTMLElement;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Disable the popover */
  disabled?: boolean;
}

export interface PopoverInstance {
  popoverEl: HTMLDivElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  updatePosition: () => void;
  setContent: (content: string | HTMLElement) => void;
  destroy: () => void;
}

// --- Helpers ---

function resolveElement(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector(el) : el;
}

const OPPOSITE_MAP: Record<string, string> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

// --- Main Class ---

export class PopoverManager {
  create(options: PopoverOptions): PopoverInstance {
    const opts = {
      trigger: options.trigger ?? "click",
      placement: options.placement ?? "auto",
      offset: options.offset ?? 8,
      arrow: options.arrow ?? true,
      arrowSize: options.arrowSize ?? 10,
      width: options.width ?? "auto",
      zIndex: options.zIndex ?? 10500,
      closeOnClickOutside: options.closeOnClickOutside ?? true,
      closeOnEscape: options.closeOnEscape ?? true,
      openDelay: options.openDelay ?? 0,
      closeDelay: options.closeDelay ?? 100,
      animationDuration: options.animationDuration ?? 150,
      disabled: options.disabled ?? false,
      portal: options.portal ?? document.body,
      ...options,
    };

    const anchorEl = resolveElement(options.anchor);
    if (!anchorEl) throw new Error("Popover: anchor element not found");

    let isOpen = false;
    let destroyed = false;
    let openTimer: ReturnType<typeof setTimeout> | null = null;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    // Create popover element
    const popoverEl = document.createElement("div");
    popoverEl.className = `popover ${opts.className ?? ""}`;
    popoverEl.setAttribute("role", "tooltip");
    popoverEl.style.cssText = `
      position:absolute;display:none;z-index:${opts.zIndex};
      background:#fff;border-radius:8px;box-shadow:
        0 10px 40px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
      border:1px solid #e5e7eb;padding:12px;font-size:13px;
      font-family:-apple-system,sans-serif;max-width:360px;
      opacity:0;transform:scale(0.96);transition:
        opacity ${opts.animationDuration}ms ease,
        transform ${opts.animationDuration}ms ease;
    `;
    opts.portal.appendChild(popoverEl);

    // Arrow element
    let arrowEl: HTMLDivElement | null = null;
    if (opts.arrow) {
      arrowEl = document.createElement("div");
      arrowEl.className = "popover-arrow";
      arrowEl.style.cssText = `
        position:absolute;width:${opts.arrowSize}px;height:${opts.arrowSize}px;
        pointer-events:none;
      `;
      popoverEl.appendChild(arrowEl);
    }

    // Content container
    const contentContainer = document.createElement("div");
    contentContainer.className = "popover-content";
    popoverEl.appendChild(contentContainer);

    // Set content
    function setContent(content: string | HTMLElement): void {
      contentContainer.innerHTML = "";
      if (typeof content === "string") {
        contentContainer.innerHTML = content;
      } else {
        contentContainer.appendChild(content);
      }
    }

    // Initialize content
    const initialContent = typeof options.content === "function"
      ? (options.content as () => HTMLElement)()
      : options.content;
    setContent(initialContent);

    // Positioning
    function updatePosition(): void {
      if (!isOpen || !popoverEl.offsetParent) return;

      const anchorRect = anchorEl!.getBoundingClientRect();
      const popoverRect = popoverEl.getBoundingClientRect();
      const gap = opts.offset + (opts.arrow ? opts.arrowSize / 2 : 0);

      // Determine placement
      let placement = opts.placement;
      if (placement === "auto") {
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const spaceTop = anchorRect.top;
        const spaceBottom = viewportH - anchorRect.bottom;
        const spaceLeft = anchorRect.left;
        const spaceRight = viewportW - anchorRect.right;

        const spaces = [
          { name: "bottom", space: spaceBottom },
          { name: "top", space: spaceTop },
          { name: "right", space: spaceRight },
          { name: "left", space: spaceLeft },
        ];
        spaces.sort((a, b) => b.space - a.space);
        placement = spaces[0]!.name as PopoverPlacement;
      }

      let x: number, y: number;
      const pw = opts.width === "anchor" ? anchorRect.width :
        typeof opts.width === "number" ? opts.width : popoverRect.width;
      const ph = popoverRect.height;

      switch (placement) {
        case "bottom":
          x = anchorRect.left + (anchorRect.width - pw) / 2;
          y = anchorRect.bottom + gap;
          break;
        case "top":
          x = anchorRect.left + (anchorRect.width - pw) / 2;
          y = anchorRect.top - ph - gap;
          break;
        case "right":
          x = anchorRect.right + gap;
          y = anchorRect.top + (anchorRect.height - ph) / 2;
          break;
        case "left":
          x = anchorRect.left - pw - gap;
          y = anchorRect.top + (anchorRect.height - ph) / 2;
          break;
        default:
          x = anchorRect.left + (anchorRect.width - pw) / 2;
          y = anchorRect.bottom + gap;
      }

      // Clamp to viewport
      const margin = 4;
      x = Math.max(margin, Math.min(x, window.innerWidth - pw - margin));
      y = Math.max(margin, Math.min(y, window.innerHeight - ph - margin));

      popoverEl.style.left = `${x}px`;
      popoverEl.style.top = `${y}px`;

      if (typeof opts.width === "number") {
        popoverEl.style.width = `${opts.width}px`;
      } else if (opts.width === "anchor") {
        popoverEl.style.width = `${anchorRect.width}px`;
      }

      // Position arrow
      if (arrowEl && opts.arrow) {
        const half = opts.arrowSize / 2;
        const opposite = OPPOSITE_MAP[placement] ?? "top";

        switch (placement) {
          case "bottom":
            arrowEl.style.left = `${(pw / 2) - half}px`;
            arrowEl.style.top = `-${half}px`;
            arrowEl.style.transform = "rotate(180deg)";
            break;
          case "top":
            arrowEl.style.left = `${(pw / 2) - half}px`;
            arrowEl.style.top = `${ph - half}px`;
            arrowEl.style.transform = "rotate(0deg)";
            break;
          case "right":
            arrowEl.style.left = `-${half}px`;
            arrowEl.style.top = `${(ph / 2) - half}px`;
            arrowEl.style.transform = "rotate(-90deg)";
            break;
          case "left":
            arrowEl.style.left = `${pw - half}px`;
            arrowEl.style.top = `${(ph / 2) - half}px`;
            arrowEl.style.transform = "rotate(90deg)";
            break;
        }

        arrowEl.innerHTML = `<div style="width:0;height:0;border-left:${half}px solid transparent;border-right:${half}px solid transparent;border-bottom:${half}px solid #fff;"></div>`;
      }
    }

    // Open/close with animation
    function open(): void {
      if (isOpen || opts.disabled) return;
      clearTimeout(closeTimer!);
      closeTimer = null;

      if (opts.openDelay > 0) {
        openTimer = setTimeout(() => doOpen(), opts.openDelay);
      } else {
        doOpen();
      }
    }

    function doOpen(): void {
      isOpen = true;
      popoverEl.style.display = "block";
      // Force reflow
      void popoverEl.offsetHeight;
      popoverEl.style.opacity = "1";
      popoverEl.style.transform = "scale(1)";
      updatePosition();
      opts.onOpen?.();
    }

    function close(): void {
      if (!isOpen) return;
      clearTimeout(openTimer!);
      openTimer = null;

      if (opts.closeDelay > 0) {
        closeTimer = setTimeout(doClose, opts.closeDelay);
      } else {
        doClose();
      }
    }

    function doClose(): void {
      isOpen = false;
      popoverEl.style.opacity = "0";
      popoverEl.style.transform = "scale(0.96)";
      setTimeout(() => {
        if (!isOpen) popoverEl.style.display = "none";
      }, opts.animationDuration);
      opts.onClose?.();
    }

    function toggle(): void {
      isOpen ? close() : open();
    }

    // Bind triggers
    const triggers = Array.isArray(opts.trigger) ? opts.trigger : [opts.trigger];

    for (const trig of triggers) {
      switch (trig) {
        case "click":
          anchorEl.addEventListener("click", toggle);
          break;
        case "hover":
          anchorEl.addEventListener("mouseenter", open);
          anchorEl.addEventListener("mouseleave", close);
          popoverEl.addEventListener("mouseenter", () => { clearTimeout(closeTimer!); });
          popoverEl.addEventListener("mouseleave", close);
          break;
        case "focus":
          anchorEl.addEventListener("focus", open);
          anchorEl.addEventListener("blur", close);
          break;
        case "manual":
          break;
      }
    }

    // Close on outside click
    if (opts.closeOnClickOutside) {
      document.addEventListener("mousedown", (e: MouseEvent) => {
        if (
          isOpen &&
          !popoverEl.contains(e.target as Node) &&
          !anchorEl.contains(e.target as Node)
        ) {
          close();
        }
      });
    }

    // Close on escape
    if (opts.closeOnEscape) {
      document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Escape" && isOpen) {
          e.preventDefault();
          close();
        }
      });
    }

    // Reposition on scroll/resize
    const repositionObserver = new ResizeObserver(() => {
      if (isOpen) updatePosition();
    });
    repositionObserver.observe(anchorEl);

    window.addEventListener("scroll", () => {
      if (isOpen) updatePosition();
    }, true); // capture phase

    const instance: PopoverInstance = {
      popoverEl,

      isOpen() { return isOpen; },

      open,

      close,

      toggle,

      updatePosition,

      setContent,

      destroy() {
        destroyed = true;
        clearTimeout(openTimer!);
        clearTimeout(closeTimer!);
        repositionObserver.disconnect();
        popoverEl.remove();

        // Remove event listeners from anchor
        anchorEl.removeEventListener("click", toggle);
        anchorEl.removeEventListener("mouseenter", open);
        anchorEl.removeEventListener("mouseleave", close);
        anchorEl.removeEventListener("focus", open);
        anchorEl.removeEventListener("blur", close);
      },
    };

    return instance;
  }
}

/** Convenience: create a popover */
export function createPopover(options: PopoverOptions): PopoverInstance {
  return new PopoverManager().create(options);
}
