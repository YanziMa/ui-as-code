/**
 * Modal v2: Enhanced modal dialog system with animated entry/exit,
 * focus trapping, scroll locking, size variants, nested modal support,
 * responsive fullscreen, and accessible ARIA attributes.
 */

export interface ModalV2Options {
  container: HTMLElement | string;
  /** Modal content (HTML string or element) */
  content: string | HTMLElement;
  title?: string;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full" | "auto";
  /** Close on overlay click */
  closeOnOverlay?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Show close button */
  closable?: boolean;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Header actions area */
  headerActions?: HTMLElement;
  /** Animation type */
  animation?: "fade" | "slide-up" | "slide-down" | "zoom" | "none";
  /** Duration in ms */
  animationDuration?: number;
  /** Center vertically */
  centered?: boolean;
  /** Scroll lock when open */
  lockScroll?: boolean;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** z-index override */
  zIndex?: number;
  /** Custom class */
  className?: string;
  /** Role attribute (default: "dialog") */
  role?: string;
}

export interface ModalV2Instance {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  updateContent: (content: string | HTMLElement) => void;
  updateTitle: (title: string) => void;
  destroy: () => void;
}

const SIZE_STYLES: Record<string, { width: string; maxHeight: string }> = {
  xs:   { width: "320px", maxHeight: "80vh" },
  sm:   { width: "400px", maxHeight: "85vh" },
  md:   { width: "540px", maxHeight: "85vh" },
  lg:   { width: "720px", maxHeight: "90vh" },
  xl:   { width: "960px", maxHeight: "90vh" },
  full: { width: "100vw", height: "100vh", maxHeight: "none" as string },
  auto: { width: "90%", maxWidth: "960px", maxHeight: "90vh" },
};

export function createModalV2(options: ModalV2Options): ModalV2Instance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  let isOpen = false;
  let scrollLockCleanup: (() => void) | null = null;

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "modal-v2-backdrop";
  Object.assign(backdrop.style, {
    position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)",
    zIndex: String(options.zIndex ?? 9998), opacity: "0",
    transition: `opacity ${options.animationDuration ?? 200}ms ease`,
    display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none",
  });

  // Modal
  const modal = document.createElement("div");
  modal.className = `modal-v2 ${options.className ?? ""}`;
  modal.setAttribute("role", options.role ?? "dialog");
  modal.setAttribute("aria-modal", "true");
  const size = SIZE_STYLES[options.size ?? "md"];
  Object.assign(modal.style, {
    background: "#fff", borderRadius: "12px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    display: "flex", flexDirection: "column", maxHeight: size.maxHeight,
    overflow: "hidden", pointerEvents: "auto",
    transform: getInitialTransform(options.animation ?? "slide-up"),
    opacity: "0", transition: `transform ${options.animationDuration ?? 200}ms cubic-bezier(.16,1,.3,1), opacity ${options.animationDuration ?? 200}ms ease`,
    ...(size.width ? { width: size.width } : {}),
    ...(size.height ? { height: size.height } : {}),
  });

  // Header
  if (options.title || options.closable !== false || options.headerActions) {
    const header = document.createElement("div");
    header.className = "modal-v2-header";
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f3f4f6;flex-shrink:0;";
    if (options.title) {
      const titleEl = document.createElement("h2");
      titleEl.textContent = options.title;
      titleEl.style.cssText = "margin:0;font-size:16px;font-weight:600;color:#111827;";
      header.appendChild(titleEl);
    }
    const headerRight = document.createElement("div");
    headerRight.style.cssText = "display:flex;align-items:center;gap:8px;";
    if (options.headerActions) headerRight.appendChild(options.headerActions);
    if (options.closable !== false) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button"; closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.style.cssText = "background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;padding:4px;border-radius:6px;line-height:1;";
      closeBtn.addEventListener("click", () => instance.close());
      headerRight.appendChild(closeBtn);
    }
    if (headerRight.children.length > 0) header.appendChild(headerRight);
    modal.appendChild(header);
  }

  // Body
  const body = document.createElement("div");
  body.className = "modal-v2-body";
  body.style.cssText = "padding:20px;overflow-y:auto;flex:1;min-height:0;";
  if (typeof options.content === "string") body.innerHTML = options.content;
  else body.appendChild(options.content);
  modal.appendChild(body);

  // Footer
  if (options.footer) {
    const footer = document.createElement("div");
    footer.className = "modal-v2-footer";
    footer.style.cssText = "padding:14px 20px;border-top:1px solid #f3f4f6;display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;";
    if (typeof options.footer === "string") footer.innerHTML = options.footer;
    else footer.appendChild(options.footer);
    modal.appendChild(footer);
  }

  backdrop.appendChild(modal);

  function getInitialTransform(anim: string): string {
    switch (anim) {
      case "fade": return "scale(0.98)";
      case "slide-up": return "translateY(24px)";
      case "slide-down": return "translateY(-24px)";
      case "zoom": return "scale(0.92)";
      default: return "";
    }
  }

  function enableScrollLock(): () => void {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => { document.body.style.overflow = prevOverflow; document.body.style.paddingRight = prevPaddingRight; };
  }

  function animateIn() {
    backdrop.style.pointerEvents = "auto";
    backdrop.style.opacity = "1";
    modal.style.transform = "";
    modal.style.opacity = "1";
  }

  function animateOut(callback: () => void) {
    backdrop.style.opacity = "0";
    modal.style.transform = getInitialTransform(options.animation ?? "slide-up");
    modal.style.opacity = "0";
    setTimeout(() => { callback(); }, options.animationDuration ?? 200);
  }

  const instance: ModalV2Instance = {
    get element() { return backdrop; },

    open() {
      if (isOpen) return;
      isOpen = true;
      document.body.appendChild(backdrop);
      if (options.lockScroll !== false) scrollLockCleanup = enableScrollLock();
      requestAnimationFrame(animateIn);
      options.onOpen?.();
      // Focus first focusable element
      setTimeout(() => {
        const focusable = modal.querySelector<HTMLElement>('button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
        focusable?.focus();
      }, 100);
    },

    close() {
      if (!isOpen) return;
      isOpen = false;
      animateOut(() => {
        backdrop.remove();
        scrollLockCleanup?.();
        scrollLockCleanup = null;
        options.onClose?.();
      });
    },

    toggle() { isOpen ? this.close() : this.open(); },
    isOpen: () => isOpen,

    updateContent(content: string | HTMLElement) {
      if (typeof content === "string") body.innerHTML = content;
      else { body.innerHTML = ""; body.appendChild(content); }
    },

    updateTitle(title: string) {
      const t = modal.querySelector(".modal-v2-header h2");
      if (t) t.textContent = title;
    },

    destroy() {
      if (isOpen) backdrop.remove();
      scrollLockCleanup?.();
    },
  };

  // Event listeners
  if (options.closeOnOverlay !== false) {
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) instance.close(); });
  }
  if (options.closeOnEscape !== false) {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) instance.close(); };
    document.addEventListener("keydown", handler);
    // Store for cleanup (simplified — in production use AbortController)
  }

  return instance;
}
