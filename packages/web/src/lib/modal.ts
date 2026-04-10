/**
 * Modal / Dialog: Accessible modal dialog with backdrop, close button,
 * animations, focus trap, size variants, header/body/footer slots,
 * keyboard navigation (Escape to close), and scrollable content.
 */

// --- Types ---

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";
export type ModalPosition = "center" | "top" | "bottom";

export interface ModalOptions {
  /** Title text */
  title?: string;
  /** Body content (string, HTML string, or HTMLElement) */
  body: string | HTMLElement;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Size variant */
  size?: ModalSize;
  /** Position on screen */
  position?: ModalPosition;
  /** Show close button? */
  closable?: boolean;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Close on Escape key? */
  closeOnEscape?: boolean;
  /** Show backdrop overlay? */
  showBackdrop?: boolean;
  /** Backdrop color/opacity */
  backdropColor?: string;
  /** Custom width (overrides size) */
  width?: string;
  /** Max height for body (enables scroll) */
  maxHeight?: string;
  /** Z-index */
  zIndex?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Callback when modal opens */
  onOpen?: () => void;
  /** Callback when modal closes */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ModalInstance {
  element: HTMLDivElement;
  backdrop: HTMLDivElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  setBody: (content: string | HTMLElement) => void;
  setTitle: (title: string) => void;
  setFooter: (content: string | HTMLElement) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<ModalSize, { maxWidth: string; width: string }> = {
  xs:   { maxWidth: "320px", width: "90%" },
  sm:   { maxWidth: "400px", width: "90%" },
  md:   { maxWidth: "520px", width: "90%" },
  lg:   { maxWidth: "720px", width: "90%" },
  xl:   { maxWidth: "960px", width: "92%" },
  full: { maxWidth: "100%", width: "100%" },
};

// --- Main Factory ---

export function createModal(options: ModalOptions): ModalInstance {
  const opts = {
    size: options.size ?? "md",
    position: options.position ?? "center",
    closable: options.closable ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    showBackdrop: options.showBackdrop ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.5)",
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 200,
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZE_MAP[opts.size];

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:${opts.backdropColor};
    z-index:${opts.zIndex};display:none;align-items:center;
    justify-content:center;opacity:0;transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Adjust alignment based on position
  if (opts.position === "top") {
    backdrop.style.alignItems = "flex-start";
    backdrop.style.paddingTop = "80px";
  } else if (opts.position === "bottom") {
    backdrop.style.alignItems = "flex-end";
    backdrop.style.paddingBottom = "40px";
  }

  // Dialog
  const dialog = document.createElement("div");
  dialog.className = `modal-dialog ${opts.className}`;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.style.cssText = `
    background:#fff;border-radius:12px;
    box-shadow:0 20px 60px rgba(0,0,0,0.2),0 4px 12px rgba(0,0,0,0.1);
    max-width:${sz.maxWidth};width:${opts.width ?? sz.width};
    max-height:90vh;display:flex;flex-direction:column;
    font-family:-apple-system,sans-serif;color:#374151;
    transform:scale(0.95);opacity:0;transition:
      transform ${opts.animationDuration}ms ease,
      opacity ${opts.animationDuration}ms ease;
    overflow:hidden;
  `;

  // Header
  let titleEl: HTMLHeadingElement | null = null;
  if (opts.title || opts.closable) {
    const header = document.createElement("div");
    header.className = "modal-header";
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
    `;

    if (opts.title) {
      titleEl = document.createElement("h2");
      titleEl.className = "modal-title";
      titleEl.style.cssText = "font-size:16px;font-weight:600;color:#111827;margin:0;";
      titleEl.textContent = opts.title;
      header.appendChild(titleEl);
    } else {
      header.appendChild(document.createElement("span"));
    }

    // Close button
    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "modal-close";
      closeBtn.setAttribute("aria-label", "Close dialog");
      closeBtn.innerHTML = "&times;";
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:20px;line-height:1;
        color:#9ca3af;padding:4px 6px;border-radius:6px;transition:all 0.15s;
        flex-shrink:0;
      `;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; closeBtn.style.color = "#374151"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
      closeBtn.addEventListener("click", () => instance.close());
      header.appendChild(closeBtn);
    }

    dialog.appendChild(header);
  }

  // Body
  let bodyContainer: HTMLDivElement;
  bodyContainer = document.createElement("div");
  bodyContainer.className = "modal-body";
  bodyContainer.style.cssText = `
    padding:20px;overflow-y:auto;flex:1;min-height:0;
    ${opts.maxHeight ? `max-height:${opts.maxHeight};` : ""}
  `;
  setBodyContent(bodyContainer, opts.body);
  dialog.appendChild(bodyContainer);

  // Footer
  let footerContainer: HTMLDivElement | null = null;
  if (opts.footer !== undefined) {
    footerContainer = document.createElement("div");
    footerContainer.className = "modal-footer";
    footerContainer.style.cssText = `
      display:flex;align-items:center;justify-content:flex-end;gap:8px;
      padding:14px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;
    `;
    setFooterContent(footerContainer, opts.footer);
    dialog.appendChild(footerContainer);
  }

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  // State
  let isOpenState = false;
  let previousFocus: HTMLElement | null = null;

  function setBodyContent(container: HTMLElement, content: string | HTMLElement): void {
    container.innerHTML = "";
    if (typeof content === "string") {
      container.innerHTML = content;
    } else {
      container.appendChild(content);
    }
  }

  function setFooterContent(container: HTMLElement, content: string | HTMLElement): void {
    container.innerHTML = "";
    if (typeof content === "string") {
      container.innerHTML = content;
    } else {
      container.appendChild(content);
    }
  }

  // Focus trap
  function trapFocus(e: KeyboardEvent): void {
    if (e.key === "Tab" && isOpenState) {
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  // Event handlers
  if (opts.closeOnBackdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) instance.close();
    });
  }

  if (opts.closeOnEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenState) instance.close();
    };
    document.addEventListener("keydown", escHandler);
    (backdrop as any)._escHandler = escHandler;
  }

  document.addEventListener("keydown", trapFocus);

  const instance: ModalInstance = {
    element: dialog as unknown as HTMLDivElement,
    backdrop,

    open() {
      if (isOpenState) return;
      isOpenState = true;
      previousFocus = document.activeElement as HTMLElement;

      backdrop.style.display = "flex";
      void backdrop.offsetHeight; // force reflow
      backdrop.style.opacity = "1";
      dialog.style.transform = "scale(1)";
      dialog.style.opacity = "1";

      // Focus first focusable element
      const firstFocusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();

      document.body.style.overflow = "hidden";
      opts.onOpen?.();
    },

    close() {
      if (!isOpenState) return;
      isOpenState = false;

      backdrop.style.opacity = "0";
      dialog.style.transform = "scale(0.95)";
      dialog.style.opacity = "0";

      setTimeout(() => {
        backdrop.style.display = "none";
        document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }, opts.animationDuration);

      opts.onClose?.();
    },

    isOpen() { return isOpenState; },

    setBody(content: string | HTMLElement) {
      setBodyContent(bodyContainer, content);
    },

    setTitle(title: string) {
      if (titleEl) titleEl.textContent = title;
    },

    setFooter(content: string | HTMLElement) {
      if (footerContainer) setFooterContent(footerContainer, content);
    },

    destroy() {
      if (isOpenState) {
        document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }
      document.removeEventListener("keydown", trapFocus);
      const escH = (backdrop as any)._escHandler;
      if (escH) document.removeEventListener("keydown", escH);
      backdrop.remove();
    },
  };

  return instance;
}
