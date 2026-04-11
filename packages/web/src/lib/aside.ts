/**
 * Aside Panel: Slide-out side panel (right/left) for supplementary content,
 * with overlay backdrop, responsive behavior, multiple sizes, header/body/footer
 * slots, keyboard support, and animation.
 */

// --- Types ---

export type AsidePosition = "left" | "right";
export type AsideSize = "sm" | "md" | "lg" | "full" | "custom";

export interface AsideOptions {
  /** Container element or selector (the page body or a wrapper) */
  container?: HTMLElement | string;
  /** Panel position */
  position?: AsidePosition;
  /** Size variant */
  size?: AsideSize;
  /** Custom width (px) when size="custom" */
  customWidth?: number;
  /** Title text */
  title?: string;
  /** Body content (string, HTML, or element) */
  body?: string | HTMLElement;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Header actions (elements) */
  headerActions?: HTMLElement[];
  /** Show close button? */
  showClose?: boolean;
  /** Close on outside click? */
  closeOnOutsideClick?: boolean;
  /** Show backdrop overlay? */
  showBackdrop?: boolean;
  /** Backdrop color/opacity */
  backdropColor?: string;
  /** Animation duration (ms) */
  duration?: number;
  /** Easing function */
  easing?: string;
  /** Z-index for the panel */
  zIndex?: number;
  /** Lock body scroll when open? */
  lockScroll?: boolean;
  /** Callback when opened */
  onOpen?: () => void;
  /** Callback when closed */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface AsideInstance {
  element: HTMLElement;
  isOpen: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setBody: (content: string | HTMLElement) => void;
  setTitle: (title: string) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_WIDTHS: Record<AsideSize, number> = {
  sm: 280,
  md: 380,
  lg: 480,
  full: 100,
  custom: 380,
};

const SIZE_PERCENTS: Record<string, number> = {
  full: 100,
};

// --- Main Factory ---

export function createAside(options: AsideOptions = {}): AsideInstance {
  const opts = {
    position: options.position ?? "right",
    size: options.size ?? "md",
    customWidth: options.customWidth ?? 380,
    showClose: options.showClose ?? true,
    closeOnOutsideClick: options.closeOnOutsideClick ?? true,
    showBackdrop: options.showBackdrop ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.4)",
    duration: options.duration ?? 280,
    easing: options.easing ?? "cubic-bezier(0.4, 0, 0.2, 1)",
    zIndex: options.zIndex ?? 1050,
    lockScroll: options.lockScroll ?? true,
    className: options.className ?? "",
    ...options,
  };

  // Determine width
  const width = opts.size === "custom"
    ? opts.customWidth
    : opts.size === "full"
      ? 100
      : SIZE_WIDTHS[opts.size]!;

  let isOpen = false;
  let destroyed = false;

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "aside-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;z-index:${opts.zIndex};
    background:${opts.backdropColor};
    opacity:0;pointer-events:none;
    transition:opacity ${opts.duration}ms ${opts.easing};
  `;

  if (opts.closeOnOutsideClick) {
    backdrop.addEventListener("click", () => instance.close());
  }

  // Panel
  const panel = document.createElement("aside");
  panel.className = `aside aside-${opts.position} aside-${opts.size} ${opts.className}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.style.cssText = `
    position:fixed;top:0;${opts.position}:0;height:100vh;z-index:${opts.zIndex + 1};
    width:${typeof width === "number" && width <= 100 ? `${width}%` : `${width}px`};
    background:#fff;
    box-shadow:${opts.position === "right"
      ? "-4px 0 24px rgba(0,0,0,0.12)"
      : "4px 0 24px rgba(0,0,0,0.12)"};
    display:flex;flex-direction:column;
    transform:translateX(${opts.position === "right" ? "100%" : "-100%"});
    transition:transform ${opts.duration}ms ${opts.easing};
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  `;

  // Header
  const header = document.createElement("div");
  header.className = "aside-header";
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:16px 20px;border-bottom:1px solid #f0f0f0;
    flex-shrink:0;min-height:56px;
  `;
  panel.appendChild(header);

  // Header left: title
  const titleArea = document.createElement("div");
  titleArea.style.cssText = "display:flex;align-items:center;gap:10px;min-width:0;flex:1;";
  header.appendChild(titleArea);

  if (options.title) {
    const titleEl = document.createElement("h2");
    titleEl.className = "aside-title";
    titleEl.style.cssText = "font-size:16px;font-weight:600;color:#111827;margin:0;line-height:1.3;";
    titleEl.textContent = options.title;
    titleArea.appendChild(titleEl);
  }

  // Header right: actions + close
  const headerRight = document.createElement("div");
  headerRight.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;";
  header.appendChild(headerRight);

  if (options.headerActions) {
    for (const action of options.headerActions) {
      headerRight.appendChild(action);
    }
  }

  if (opts.showClose) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.title = "Close";
    closeBtn.setAttribute("aria-label", "Close panel");
    closeBtn.style.cssText = `
      width:32px;height:32px;border-radius:8px;border:none;background:none;
      cursor:pointer;font-size:20px;color:#6b7280;display:flex;
      align-items:center;justify-content:center;transition:all 0.15s;
    `;
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; closeBtn.style.color = "#111827"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#6b7280"; });
    closeBtn.addEventListener("click", () => instance.close());
    headerRight.appendChild(closeBtn);
  }

  // Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "aside-body";
  bodyEl.style.cssText = `
    flex:1;overflow-y:auto;padding:20px;font-size:14px;color:#374151;line-height:1.6;
  `;
  if (options.body !== undefined) {
    if (typeof options.body === "string") {
      bodyEl.innerHTML = options.body;
    } else {
      bodyEl.appendChild(options.body);
    }
  }
  panel.appendChild(bodyEl);

  // Footer
  let footerEl: HTMLElement | null = null;
  if (options.footer !== undefined) {
    footerEl = document.createElement("div");
    footerEl.className = "aside-footer";
    footerEl.style.cssText = `
      padding:16px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;
    `;
    if (typeof options.footer === "string") {
      footerEl.textContent = options.footer;
    } else {
      footerEl.appendChild(options.footer);
    }
    panel.appendChild(footerEl);
  }

  // Keyboard: Escape to close
  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape" && isOpen && !destroyed) {
      e.preventDefault();
      instance.close();
    }
  }
  document.addEventListener("keydown", handleKeydown);

  // Scroll lock helper
  function lockBodyScroll(): void {
    if (!opts.lockScroll) return;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
  }

  function unlockBodyScroll(): void {
    if (!opts.lockScroll) return;
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }

  const instance: AsideInstance = {
    element: panel,

    isOpen() { return isOpen; },

    open() {
      if (isOpen || destroyed) return;
      isOpen = true;

      // Insert into DOM
      if (opts.showBackdrop) {
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => { backdrop.style.opacity = "1"; });
      }
      document.body.appendChild(panel);
      requestAnimationFrame(() => { panel.style.transform = "translateX(0)"; });

      lockBodyScroll();
      opts.onOpen?.();
    },

    close() {
      if (!isOpen || destroyed) return;
      isOpen = false;

      panel.style.transform = `translateX(${opts.position === "right" ? "100%" : "-100%"})`;
      if (opts.showBackdrop) backdrop.style.opacity = "0";

      setTimeout(() => {
        panel.remove();
        backdrop.remove();
      }, opts.duration);

      unlockBodyScroll();
      opts.onClose?.();
    },

    toggle() {
      if (isOpen) instance.close();
      else instance.open();
    },

    setBody(content: string | HTMLElement) {
      bodyEl.innerHTML = "";
      if (typeof content === "string") {
        bodyEl.innerHTML = content;
      } else {
        bodyEl.appendChild(content);
      }
    },

    setTitle(title: string) {
      const t = titleArea.querySelector(".aside-title");
      if (t) t.textContent = title;
      else {
        const newTitle = document.createElement("h2");
        newTitle.className = "aside-title";
        newTitle.style.cssText = "font-size:16px;font-weight:600;color:#111827;margin:0;line-height:1.3;";
        newTitle.textContent = title;
        titleArea.appendChild(newTitle);
      }
    },

    destroy() {
      destroyed = true;
      document.removeEventListener("keydown", handleKeydown);
      panel.remove();
      backdrop.remove();
      unlockBodyScroll();
    },
  };

  return instance;
}
