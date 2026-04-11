/**
 * Lightweight Dialog: Simple, accessible confirmation/alert/dialog component
 * with backdrop, animations, focus trap, size variants, action buttons,
 * and customizable content.
 */

// --- Types ---

export type DialogType = "alert" | "confirm" | "prompt" | "custom";
export type DialogSize = "sm" | "md" | "lg" | "full";

export interface DialogOptions {
  /** Type of dialog */
  type?: DialogType;
  /** Title text */
  title?: string;
  /** Body message or HTML element */
  body?: string | HTMLElement;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Danger style for confirm button? */
  danger?: boolean;
  /** Size variant */
  size?: DialogSize;
  /** Show close (X) button */
  closable?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on Escape */
  closeOnEscape?: boolean;
  /** Show backdrop overlay */
  showBackdrop?: boolean;
  /** Backdrop color/opacity */
  backdropColor?: string;
  /** Custom width (overrides size) */
  width?: string;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Callback on confirm */
  onConfirm?: () => void | Promise<void>;
  /** Callback on cancel/dismiss */
  onCancel?: () => void;
  /** Callback after close animation completes */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface DialogInstance {
  element: HTMLDivElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  setBody: (content: string | HTMLElement) => void;
  setTitle: (title: string) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_CONFIG: Record<DialogSize, { maxWidth: string; width: string }> = {
  sm:   { maxWidth: "360px", width: "88%" },
  md:   { maxWidth: "480px", width: "90%" },
  lg:   { maxWidth: "640px", width: "92%" },
  full: { maxWidth: "100%", width: "100%" },
};

// --- Main Factory ---

export function createDialog(options: DialogOptions): DialogInstance {
  const opts = {
    type: options.type ?? "custom",
    title: options.title ?? "",
    body: options.body ?? "",
    confirmText: options.confirmText ?? "Confirm",
    cancelText: options.cancelText ?? "Cancel",
    danger: options.danger ?? false,
    size: options.size ?? "md",
    closable: options.closable ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    showBackdrop: options.showBackdrop ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.45)",
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 180,
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZE_CONFIG[opts.size];

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "dlg-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:${opts.showBackdrop ? opts.backdropColor : "transparent"};
    z-index:${opts.zIndex};display:none;align-items:center;justify-content:center;
    opacity:0;transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Dialog container
  const dialog = document.createElement("div");
  dialog.className = `dlg-dialog ${opts.className}`;
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.style.cssText = `
    background:#fff;border-radius:12px;
    box-shadow:0 20px 60px rgba(0,0,0,0.2),0 4px 12px rgba(0,0,0,0.08);
    max-width:${sz.maxWidth};width:${opts.width ?? sz.width};
    max-height:85vh;display:flex;flex-direction:column;
    font-family:-apple-system,sans-serif;color:#374151;
    transform:scale(0.94) translateY(10px);opacity:0;transition:
      transform ${opts.animationDuration}ms ease,
      opacity ${opts.animationDuration}ms ease;
    overflow:hidden;
  `;

  // Header
  let titleEl: HTMLHeadingElement | null = null;
  if (opts.title || opts.closable) {
    const header = document.createElement("div");
    header.className = "dlg-header";
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
    `;

    if (opts.title) {
      titleEl = document.createElement("h3");
      titleEl.className = "dlg-title";
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
      closeBtn.className = "dlg-close-btn";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.innerHTML = "&times;";
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:18px;line-height:1;
        color:#9ca3af;padding:4px 8px;border-radius:6px;transition:all 0.15s;
        flex-shrink:0;
      `;
      closeBtn.addEventListener("mouseenter", () => {
        closeBtn.style.background = "#f3f4f6";
        closeBtn.style.color = "#374151";
      });
      closeBtn.addEventListener("mouseleave", () => {
        closeBtn.style.background = "";
        closeBtn.style.color = "#9ca3af";
      });
      closeBtn.addEventListener("click", () => handleCancel());
      header.appendChild(closeBtn);
    }

    dialog.appendChild(header);
  }

  // Body
  const bodyContainer = document.createElement("div");
  bodyContainer.className = "dlg-body";
  bodyContainer.style.cssText = "padding:20px 24px;overflow-y:auto;flex:1;min-height:0;line-height:1.5;";
  setBodyContent(bodyContainer, opts.body);
  dialog.appendChild(bodyContainer);

  // Footer with action buttons
  let footerContainer: HTMLDivElement | null = null;
  if (opts.type !== "custom" || opts.onConfirm || opts.onCancel) {
    footerContainer = document.createElement("div");
    footerContainer.className = "dlg-footer";
    footerContainer.style.cssText = `
      display:flex;align-items:center;justify-content:flex-end;gap:10px;
      padding:14px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;
    `;

    // Cancel button
    if (opts.type === "confirm" || opts.type === "prompt" || opts.onCancel) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "dlg-cancel-btn";
      cancelBtn.style.cssText = `
        padding:7px 18px;border-radius:6px;border:1px solid #d1d5db;background:#fff;
        color:#374151;font-size:13px;font-weight:500;cursor:pointer;
        transition:all 0.15s;font-family:-apple-system,sans-serif;
      `;
      cancelBtn.textContent = opts.cancelText;
      cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.borderColor = "#9ca3af"; });
      cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.borderColor = "#d1d5db"; });
      cancelBtn.addEventListener("click", () => handleCancel());
      footerContainer.appendChild(cancelBtn);
    }

    // Confirm button
    if (opts.type !== "alert" || opts.onConfirm) {
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "dlg-confirm-btn";
      confirmBtn.style.cssText = `
        padding:7px 18px;border-radius:6px;border:none;
        background:${opts.danger ? "#dc2626" : "#3b82f6"};color:#fff;
        font-size:13px;font-weight:500;cursor:pointer;
        transition:all 0.15s;font-family:-apple-system,sans-serif;
      `;
      confirmBtn.textContent = opts.type === "alert" ? "OK" : opts.confirmText;
      confirmBtn.addEventListener("mouseenter", () => {
        confirmBtn.style.background = opts.danger ? "#b91c1c" : "#2563eb";
      });
      confirmBtn.addEventListener("mouseleave", () => {
        confirmBtn.style.background = opts.danger ? "#dc2626" : "#3b82f6";
      });
      confirmBtn.addEventListener("click", () => handleConfirm());
      footerContainer.appendChild(confirmBtn);
    }

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

  // Focus trap
  function trapFocus(e: KeyboardEvent): void {
    if (e.key !== "Tab" || !isOpenState) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function handleConfirm(): Promise<void> {
    if (opts.onConfirm) await opts.onConfirm();
    doClose();
  }

  function handleCancel(): void {
    opts.onCancel?.();
    doClose();
  }

  function doOpen(): void {
    if (isOpenState) return;
    isOpenState = true;
    previousFocus = document.activeElement as HTMLElement;

    backdrop.style.display = "flex";
    void backdrop.offsetHeight; // force reflow
    backdrop.style.opacity = "1";
    dialog.style.transform = "scale(1) translateY(0)";
    dialog.style.opacity = "1";

    // Auto-focus first interactive element
    const firstFocusable = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    document.body.style.overflow = "hidden";
    opts.onOpen?.();
  }

  function doClose(): void {
    if (!isOpenState) return;
    isOpenState = false;

    backdrop.style.opacity = "0";
    dialog.style.transform = "scale(0.94) translateY(10px)";
    dialog.style.opacity = "0";

    setTimeout(() => {
      backdrop.style.display = "none";
      document.body.style.overflow = "";
      if (previousFocus) previousFocus.focus();
      opts.onClose?.();
    }, opts.animationDuration);
  }

  // Event bindings

  if (opts.closeOnBackdrop && opts.showBackdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) handleCancel();
    });
  }

  if (opts.closeOnEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenState) handleCancel();
    };
    document.addEventListener("keydown", escHandler);
    (backdrop as any)._escHandler = escHandler;
  }

  document.addEventListener("keydown", trapFocus);

  // Instance
  const instance: DialogInstance = {
    element: dialog,

    isOpen() { return isOpenState; },

    open: doOpen,

    close: doClose,

    setBody(content: string | HTMLElement) {
      setBodyContent(bodyContainer, content);
    },

    setTitle(title: string) {
      if (titleEl) titleEl.textContent = title;
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

// --- Quick Helpers ---

/** Show a simple alert dialog */
export function alert(message: string, title?: string): Promise<void> {
  return new Promise((resolve) => {
    const dlg = createDialog({
      type: "alert",
      title: title ?? "Notice",
      body: message,
      onConfirm: resolve,
      onClose: resolve,
    });
    dlg.open();
  });
}

/** Show a confirmation dialog, returns true if confirmed */
export function confirm(message: string, title?: string, danger?: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const dlg = createDialog({
      type: "confirm",
      title: title ?? "Confirm",
      body: message,
      danger: danger ?? false,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
      onClose: () => resolve(false),
    });
    dlg.open();
  });
}
