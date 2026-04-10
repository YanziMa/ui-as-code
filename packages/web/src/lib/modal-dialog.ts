/**
 * Modal Dialog: Accessible modal with sizes, backdrop, animations,
 * keyboard trap, focus management, confirm/cancel patterns, and nested support.
 */

// --- Types ---

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
export type ModalVariant = "default" | "danger" | "info";

export interface ModalOptions {
  /** Title text or element */
  title: string | HTMLElement;
  /** Body content */
  body: string | HTMLElement;
  /** Footer content (auto-generates Cancel/OK if omitted) */
  footer?: string | HTMLElement;
  /** Size variant */
  size?: ModalSize;
  /** Visual variant */
  variant?: ModalVariant;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Hide cancel button? */
  hideCancel?: boolean;
  /** Hide confirm button? */
  hideConfirm?: boolean;
  /** Danger style for confirm button? */
  danger?: boolean;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Close on Escape key? */
  closeOnEscape?: true;
  /** Show backdrop overlay? */
  showBackdrop?: boolean;
  /** Backdrop click closes? */
  closable?: boolean;
  /** Container to render into */
  container?: HTMLElement;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Lock body scroll when open? */
  lockScroll?: boolean;
  /** Callback on confirm */
  onConfirm?: () => void;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Callback after close (any reason) */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ModalInstance {
  element: HTMLDivElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  setTitle: (title: string) => void;
  setBody: (body: string | HTMLElement) => void;
  setFooter: (footer: string | HTMLElement) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<ModalSize, { width: string; maxWidth: string }> = {
  sm:  { width: "380px", maxWidth: "90vw" },
  md:  { width: "520px", maxWidth: "90vw" },
  lg:  { width: "680px", maxWidth: "90vw" },
  xl:  { width: "860px", maxWidth: "92vw" },
  full: { width: "95vw", maxWidth: "95vw" },
};

const VARIANT_COLORS: Record<ModalVariant, { headerBg: string; headerColor: string; accent: string }> = {
  default: { headerBg: "#fff", headerColor: "#111827", accent: "#4338ca" },
  danger:  { headerBg: "#fef2f2", headerColor: "#991b1b", accent: "#ef4444" },
  info:    { headerBg: "#eff6ff", headerColor: "#1e40af", accent: "#3b82f6" },
};

// --- Main Factory ---

export function createModal(options: ModalOptions): ModalInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    confirmLabel: options.confirmLabel ?? "Confirm",
    cancelLabel: options.cancelLabel ?? "Cancel",
    hideCancel: options.hideCancel ?? false,
    hideConfirm: options.hideConfirm ?? false,
    danger: options.danger ?? false,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    showBackdrop: options.showBackdrop ?? true,
    closable: options.closable ?? true,
    container: options.container ?? document.body,
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 200,
    lockScroll: options.lockScroll ?? true,
    className: options.className ?? "",
    ...options,
  };

  const vc = VARIANT_COLORS[opts.variant];

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.45);
    z-index:${opts.zIndex};display:none;opacity:0;
    transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Panel
  const panel = document.createElement("div");
  panel.className = `modal modal-${opts.size} ${opts.className}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "modal-title");
  const sz = SIZE_MAP[opts.size];

  panel.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.96);
    z-index:${opts.zIndex + 1};width:${sz.width};max-width:${sz.maxWidth};
    max-height:90vh;background:#fff;border-radius:14px;
    box-shadow:0 24px 80px rgba(0,0,0,0.25);
    display:none;flex-direction:column;font-family:-apple-system,sans-serif;
    overflow:hidden;transition:transform ${opts.animationDuration}ms cubic-bezier(0.4,0,0.2,1);
  `;

  // Header
  const header = document.createElement("div");
  header.className = "modal-header";
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;padding:18px 22px;
    border-bottom:1px solid #f0f0f0;background:${vc.headerBg};flex-shrink:0;
  `;

  const titleEl = document.createElement("h2");
  titleEl.id = "modal-title";
  titleEl.style.cssText = `font-size:16px;font-weight:600;color:${vc.headerColor};margin:0;`;
  if (typeof options.title === "string") {
    titleEl.textContent = options.title;
  } else {
    titleEl.appendChild(options.title);
  }
  header.appendChild(titleEl);

  // Close button
  if (opts.closable) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Close dialog");
    closeBtn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:20px;line-height:1;
      color:#9ca3af;padding:4px 8px;border-radius:6px;transition:all 0.15s;
    `;
    closeBtn.addEventListener("click", () => instance.close());
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; closeBtn.style.color = "#374151"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
    header.appendChild(closeBtn);
  }

  panel.appendChild(header);

  // Body
  const bodyContainer = document.createElement("div");
  bodyContainer.className = "modal-body";
  bodyContainer.style.cssText = "flex:1;overflow-y:auto;padding:22px;font-size:14px;color:#374151;line-height:1.6;";
  setContent(bodyContainer, options.body);
  panel.appendChild(bodyContainer);

  // Footer
  const footer = document.createElement("div");
  footer.className = "modal-footer";
  footer.style.cssText = `
    display:flex;align-items:center;justify-content:flex-end;gap:10px;
    padding:16px 22px;border-top:1px solid #f0f0f0;flex-shrink:0;
  `;

  if (options.footer) {
    setContent(footer, options.footer);
  } else {
    // Default footer with Cancel + Confirm
    if (!opts.hideCancel) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = opts.cancelLabel;
      cancelBtn.style.cssText = `
        padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;
        border:1px solid #d1d5db;background:#fff;color:#374151;cursor:pointer;
        transition:background 0.15s;
      `;
      cancelBtn.addEventListener("click", () => { opts.onCancel?.(); instance.close(); });
      cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.background = "#f9fafb"; });
      cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.background = ""; });
      footer.appendChild(cancelBtn);
    }

    if (!opts.hideConfirm) {
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.textContent = opts.confirmLabel;
      const btnColor = opts.danger ? "#ef4444" : vc.accent;
      confirmBtn.style.cssText = `
        padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;
        border:none;background:${btnColor};color:#fff;cursor:pointer;
        transition:background 0.15s;
      `;
      confirmBtn.addEventListener("click", () => { opts.onConfirm?.(); instance.close(); });
      confirmBtn.addEventListener("mouseenter", () => { confirmBtn.style.background = opts.danger ? "#dc2626" : "#3730a3"; });
      confirmBtn.addEventListener("mouseleave", () => { confirmBtn.style.background = ""; });
      footer.appendChild(confirmBtn);
    }
  }

  panel.appendChild(footer);

  opts.container.appendChild(backdrop);
  opts.container.appendChild(panel);

  // State
  let isOpenState = false;
  let previousFocus: HTMLElement | null = null;

  function setContent(el: HTMLElement, content: string | HTMLElement): void {
    el.innerHTML = "";
    if (typeof content === "string") {
      el.innerHTML = content;
    } else {
      el.appendChild(content);
    }
  }

  // Focus trap
  function trapFocus(e: KeyboardEvent): void {
    if (e.key !== "Tab" || !isOpenState) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }

  // Event handlers
  if (opts.closeOnBackdrop) {
    backdrop.addEventListener("click", () => instance.close());
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
    element: panel,

    open() {
      if (isOpenState) return;
      isOpenState = true;
      previousFocus = document.activeElement as HTMLElement;

      backdrop.style.display = "block";
      panel.style.display = "flex";

      requestAnimationFrame(() => {
        backdrop.style.opacity = "1";
        panel.style.transform = "translate(-50%, -50%) scale(1)";

        // Focus first focusable element
        const firstFocusable = panel.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        firstFocusable?.focus();
      });

      if (opts.lockScroll) document.body.style.overflow = "hidden";
    },

    close() {
      if (!isOpenState) return;
      isOpenState = false;

      backdrop.style.opacity = "0";
      panel.style.transform = "translate(-50%, -50%) scale(0.96)";

      setTimeout(() => {
        backdrop.style.display = "none";
        panel.style.display = "none";
        if (opts.lockScroll) document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }, opts.animationDuration);

      opts.onClose?.();
    },

    isOpen() { return isOpenState; },

    setTitle(title: string) { titleEl.textContent = title; },

    setBody(body: string | HTMLElement) { setContent(bodyContainer, body); },

    setFooter(footer: string | HTMLElement) { setContent(footer, footer); },

    destroy() {
      if (isOpenState) {
        if (opts.lockScroll) document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }
      document.removeEventListener("keydown", trapFocus);
      const escH = (backdrop as any)._escHandler;
      if (escH) document.removeEventListener("keydown", escH);
      backdrop.remove();
      panel.remove();
    },
  };

  return instance;
}
