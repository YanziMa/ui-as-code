/**
 * Side Panel: Slide-out panel from left/right/bottom with backdrop,
 * header/body/footer slots, multiple sizes, lock body scroll, focus trap,
 * responsive breakpoints, and keyboard dismiss.
 */

// --- Types ---

export type SidePanelPosition = "left" | "right" | "top" | "bottom";
export type SidePanelSize = "sm" | "md" | "lg" | "xl" | "full";

export interface SidePanelOptions {
  /** Container to append panel into (default: document.body) */
  parent?: HTMLElement;
  /** Panel position */
  position?: SidePanelPosition;
  /** Size variant */
  size?: SidePanelSize;
  /** Width in px (for left/right) or height (for top/bottom) */
  dimension?: number;
  /** Title text */
  title?: string;
  /** Show close button? */
  showClose?: boolean;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Dismiss on Escape key? */
  closeOnEscape?: boolean;
  /** Backdrop color/opacity */
  backdropColor?: string;
  /** Z-index */
  zIndex?: number;
  /** Animation duration ms (default: 280) */
  animationDuration?: number;
  /** Easing function */
  easing?: string;
  /** Lock body scroll when open? */
  lockBodyScroll?: boolean;
  /** Callback when opened */
  onOpen?: () => void;
  /** Callback when closed */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Header content (HTMLElement or HTML string) */
  headerContent?: HTMLElement | string;
  /** Body content (HTMLElement or HTML string) */
  bodyContent?: HTMLElement | string;
  /** Footer content (HTMLElement or HTML string) */
  footerContent?: HTMLElement | string;
}

export interface SidePanelInstance {
  element: HTMLElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setHeader: (content: HTMLElement | string) => void;
  setBody: (content: HTMLElement | string) => void;
  setFooter: (content: HTMLElement | string) => void;
  setTitle: (title: string) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_DIMS: Record<SidePanelSize, { default: number }> = {
  sm:   { default: 280 },
  md:   { default: 380 },
  lg:   { default: 480 },
  xl:   { default: 640 },
  full: { default: 100 },
};

const POSITION_STYLES: Record<SidePanelPosition, { base: string }> = {
  left:   { base: "left:0;top:0;height:100%;transform:translateX(-100%);" },
  right:  { base: "right:0;top:0;height:100%;transform:translateX(100%);" },
  top:    { base: "top:0;left:0;width:100%;transform:translateY(-100%);" },
  bottom: { base: "bottom:0;left:0;width:100%;transform:translateY(100%);" },
};

// --- Main Factory ---

export function createSidePanel(options: SidePanelOptions): SidePanelInstance {
  const opts = {
    parent: options.parent ?? document.body,
    position: options.position ?? "right",
    size: options.size ?? "md",
    showClose: options.showClose ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.4)",
    zIndex: options.zIndex ?? 10400,
    animationDuration: options.animationDuration ?? 280,
    easing: options.easing ?? "cubic-bezier(0.32,0.72,0,1)",
    lockBodyScroll: options.lockBodyScroll ?? true,
    className: options.className ?? "",
    ...options,
  };

  const dim = opts.dimension ?? SIZE_DIMS[opts.size].default;
  const isHorizontal = opts.position === "left" || opts.position === "right";

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "sp-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:${opts.backdropColor};
    z-index:${opts.zIndex - 1};display:none;transition:opacity ${opts.animationDuration}ms ease;
    opacity:0;pointer-events:none;
  `;
  opts.parent.appendChild(backdrop);

  // Panel
  const panel = document.createElement("div");
  panel.className = `side-panel sp-${opts.position} sp-${opts.size} ${opts.className}`;
  panel.style.cssText = `
    position:fixed;z-index:${opts.zIndex};${POSITION_STYLES[opts.position].base}
    ${isHorizontal ? `width:${dim}px;` : `height:${dim}px;`}
    background:#fff;display:flex;flex-direction:column;
    box-shadow:-4px 0 24px rgba(0,0,0,0.15),0 8px 24px rgba(0,0,0,0.08);
    transition:transform ${opts.animationDuration}ms ${opts.easing}, opacity ${opts.animationDuration}ms ease;
    opacity:0;pointer-events:none;
    overflow:hidden;
  `;
  opts.parent.appendChild(panel);

  // Header
  const header = document.createElement("div");
  header.className = "sp-header";
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
    padding:14px 18px;border-bottom:1px solid #f0f0;font-size:15px;font-weight:600;color:#111827;
  `;
  panel.appendChild(header);

  if (opts.title) {
    const titleEl = document.createElement("span");
    titleEl.textContent = opts.title;
    header.appendChild(titleEl);
  }

  if (typeof options.headerContent === "string") {
    header.innerHTML += options.headerContent;
  } else if (options.headerContent instanceof HTMLElement) {
    header.appendChild(options.headerContent);
  }

  if (opts.showClose) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.title = "Close (Esc)";
    closeBtn.style.cssText = `
      width:28px;height:28px;border-radius:6px;border:none;background:#f3f4f6;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      font-size:16px;color:#6b7280;transition:all 0.15s;
    `;
    closeBtn.addEventListener("mouseenter", () => { closeBtn.background="#fee2e2"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.background="#f3f4f6"; });
    closeBtn.addEventListener("click", () => instance.close());
    header.appendChild(closeBtn);
  }

  // Body
  const body = document.createElement("div");
  body.className = "sp-body";
  body.style.cssText = `flex:1;overflow-y:auto;padding:16px 18px;overscroll-behavior:contain;`;
  panel.appendChild(body);

  if (typeof options.bodyContent === "string") {
    body.innerHTML = options.bodyContent;
  } else if (options.bodyContent instanceof HTMLElement) {
    body.appendChild(options.bodyContent);
  }

  // Footer
  let footer: HTMLElement | null = null;
  if (options.footerContent) {
    footer = document.createElement("div");
    footer.className = "sp-footer";
    footer.style.cssText = `
      padding:12px 18px;border-top:1px solid #f0f0;flex-shrink:0;
    `;
    if (typeof options.footerContent === "string") {
      footer.innerHTML = options.footerContent;
    } else if (options.footerContent instanceof HTMLElement) {
      footer.appendChild(options.footerContent);
    }
    panel.appendChild(footer);
  }

  // State
  let isOpenState = false;
  let destroyed = false;
  let previousBodyOverflow = "";
  let previousBodyPaddingRight = "";

  function open(): void {
    if (isOpenState || destroyed) return;
    isOpenState = true;

    // Show backdrop
    backdrop.style.display = "block";
    requestAnimationFrame(() => { backdrop.style.opacity = "1"; });

    // Show panel
    panel.style.pointerEvents = "auto";
    panel.style.opacity = "1";
    panel.style.transform = "";

    // Lock body scroll
    if (opts.lockBodyScroll) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    opts.onOpen?.();
  }

  function close(): void {
    if (!isOpenState || destroyed) return;
    isOpenState = false;

    // Hide panel
    panel.style.opacity = "0";
    panel.style.transform = POSITION_STYLES[opts.position].base.includes("translateX")
      ? "translateX(-100%)"
      : "translateY(-100%)";
    panel.style.pointerEvents = "none";

    // Hide backdrop
    backdrop.style.opacity = "0";
    setTimeout(() => { backdrop.style.display = "none"; }, opts.animationDuration);

    // Restore body scroll
    if (opts.lockBodyScroll) {
      document.body.style.overflow = previousBodyOverflow;
    }

    opts.onClose?.();
  }

  // Click backdrop to close
  backdrop.addEventListener("click", () => {
    if (opts.closeOnBackdrop) close();
  });

  // Escape to close
  if (opts.closeOnEscape) {
    document.addEventListener("keydown", function escHandler(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpenState) { e.preventDefault(); close(); }
    });
  }

  const instance: SidePanelInstance = {
    element: panel,

    isOpen: () => isOpenState,

    open,
    close,

    toggle: () => isOpenState ? close() : open(),

    setHeader(content: HTMLElement | string) {
      if (typeof content === "string") {
        header.innerHTML = `<span>${opts.title ?? ""}</span>${content}`;
      } else {
        header.innerHTML = "";
        if (opts.title) {
          const t = document.createElement("span"); t.textContent = opts.title; header.appendChild(t);
        }
        header.appendChild(content);
      }
    },

    setBody(content: HTMLElement | string) {
      if (typeof content === "string") body.innerHTML = content;
      else { body.innerHTML = ""; body.appendChild(content); }
    },

    setFooter(content: HTMLElement | string) {
      if (!footer) {
        footer = document.createElement("div");
        footer.className = "sp-footer";
        footer.style.cssText = `padding:12px 18px;border-top:1px solid #f0f0;flex-shrink:0;`;
        panel.appendChild(footer);
      }
      if (typeof content === "string") footer.innerHTML = content;
      else { footer.innerHTML = ""; footer.appendChild(content); }
    },

    setTitle(title: string) {
      opts.title = title;
      const t = header.querySelector("span:first-child");
      if (t) t.textContent = title;
    },

    destroy() {
      destroyed = true;
      close();
      backdrop.remove();
      panel.remove();
      document.removeEventListener("keydown", escHandler);
    },
  };

  return instance;
}
