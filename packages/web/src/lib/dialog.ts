/**
 * Dialog / Confirm Dialog: Modal dialog with title, message, actions,
 * variants (alert/confirm/prompt/danger), async API, keyboard support,
 * focus trap, and accessible semantics.
 */

// --- Types ---

export type DialogVariant = "default" | "alert" | "confirm" | "danger" | "info" | "success";

export interface DialogOptions {
  /** Title text */
  title: string;
  /** Body message (string or HTML element) */
  message: string | HTMLElement;
  /** Dialog variant */
  variant?: DialogVariant;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Show cancel button? */
  showCancel?: boolean;
  /** Custom confirm action */
  onConfirm?: () => void | Promise<void>;
  /** Custom cancel action */
  onCancel?: () => void;
  /** Width (px or CSS value) */
  width?: string | number;
  /** Z-index */
  zIndex?: number;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Show backdrop? */
  showBackdrop?: boolean;
  /** Backdrop color */
  backdropColor?: string;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Container to render into */
  container?: HTMLElement;
  /** Custom CSS class */
  className?: string;
}

export interface DialogInstance {
  element: HTMLDivElement;
  backdrop: HTMLDivElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  destroy: () => void;
}

// --- Config ---

const VARIANT_CONFIG: Record<DialogVariant, {
  icon: string; iconBg: string; iconColor: string; confirmBg: string; confirmColor: string;
}> = {
  default: { icon: "", iconBg: "", iconColor: "", confirmBg: "#4338ca", confirmColor: "#fff" },
  alert:   { icon: "", iconBg: "", iconColor: "", confirmBg: "#4338ca", confirmColor: "#fff" },
  confirm: { icon: "\u{2753}", iconBg: "#eef2ff", iconColor: "#4338ca", confirmBg: "#4338ca", confirmColor: "#fff" },
  danger:  { icon: "\u{26A0}", iconBg: "#fef2f2", iconColor: "#dc2626", confirmBg: "#dc2626", confirmColor: "#fff" },
  info:    { icon: "\u{2139}\uFE0F", iconBg: "#eff6ff", iconColor: "#2563eb", confirmBg: "#2563eb", confirmColor: "#fff" },
  success: { icon: "\u2705", iconBg: "#f0fdf4", iconColor: "#16a34a", confirmBg: "#16a34a", confirmColor: "#fff" },
};

// --- Main Factory ---

export function createDialog(options: DialogOptions): DialogInstance {
  const opts = {
    variant: options.variant ?? "default",
    confirmText: options.confirmText ?? "OK",
    cancelText: options.cancelText ?? "Cancel",
    showCancel: options.showCancel ?? true,
    width: options.width ?? 420,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    showBackdrop: options.showBackdrop ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.4)",
    animationDuration: options.animationDuration ?? 200,
    container: options.container ?? document.body,
    className: options.className ?? "",
    ...options,
  };

  const cfg = VARIANT_CONFIG[opts.variant];

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:${opts.backdropColor};
    z-index:${opts.zIndex ?? 10000};display:none;opacity:0;
    transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Dialog panel
  const dialog = document.createElement("div");
  dialog.className = `dialog dialog-${opts.variant} ${opts.className}`;
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "dialog-title";
  dialog.style.cssText = `
    position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(0.95);
    z-index:${(opts.zIndex ?? 10000) + 1};
    background:#fff;border-radius:14px;
    box-shadow:0 25px 60px rgba(0,0,0,0.2),0 0 1px rgba(0,0,0,0.1);
    width:${typeof opts.width === "number" ? `${opts.width}px` : opts.width};
    max-width:calc(100vw - 32px);max-height:calc(100vh - 64px);
    display:flex;flex-direction:column;overflow:hidden;
    font-family:-apple-system,sans-serif;color:#374151;
    opacity:0;transition:opacity ${opts.animationDuration}ms ease, transform ${opts.animationDuration}ms ease;
  `;

  // Content area
  const content = document.createElement("div");
  content.style.cssText = "padding:24px;text-align:center;";

  // Icon area
  if (cfg.icon) {
    const iconWrap = document.createElement("div");
    iconWrap.style.cssText = `
      width:48px;height:48px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;margin:0 auto 16px;font-size:22px;background:${cfg.iconBg};color:${cfg.iconColor};
    `;
    iconWrap.textContent = cfg.icon;
    content.appendChild(iconWrap);
  }

  // Title
  const titleEl = document.createElement("h2");
  titleEl.id = "dialog-title";
  titleEl.style.cssText = "font-size:18px;font-weight:600;color:#111827;margin:0 0 8px;line-height:1.3;";
  titleEl.textContent = options.title;
  content.appendChild(titleEl);

  // Message
  const msgEl = document.createElement("div");
  msgEl.style.cssText = "font-size:14px;color:#6b7280;line-height:1.5;";
  if (typeof options.message === "string") {
    msgEl.textContent = options.message;
  } else {
    msgEl.appendChild(options.message);
  }
  content.appendChild(msgEl);

  dialog.appendChild(content);

  // Actions
  const actions = document.createElement("div");
  actions.style.cssText = `
    display:flex;justify-content:center;gap:10px;padding:16px 24px 20px;
  `;

  if (opts.showCancel) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = opts.cancelText;
    cancelBtn.style.cssText = `
      padding:9px 20px;border-radius:8px;font-size:14px;font-weight:500;
      border:1px solid #d1d5db;background:#fff;color:#374151;cursor:pointer;
      transition:background 0.15s,border-color 0.15s;
    `;
    cancelBtn.addEventListener("click", () => instance.close());
    cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.background = "#f9fafb"; });
    cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.background = ""; });
    actions.appendChild(cancelBtn);
  }

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.textContent = opts.confirmText;
  confirmBtn.style.cssText = `
    padding:9px 20px;border-radius:8px;font-size:14px;font-weight:500;
    border:none;background:${cfg.confirmBg};color:${cfg.confirmColor};cursor:pointer;
    transition:background 0.15s,opacity 0.15s;
  `;
  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.7";
    try {
      await opts.onConfirm?.();
      instance.close();
    } catch {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = "";
    }
  });

  // Hover effect for confirm
  const darkerConfirm = shadeColor(cfg.confirmBg, -15);
  confirmBtn.addEventListener("mouseenter", () => { if (!confirmBtn.disabled) confirmBtn.style.background = darkerConfirm; });
  confirmBtn.addEventListener("mouseleave", () => { if (!confirmBtn.disabled) confirmBtn.style.background = cfg.confirmBg; });

  actions.appendChild(confirmBtn);
  dialog.appendChild(actions);

  opts.container.appendChild(backdrop);
  opts.container.appendChild(dialog);

  // State
  let isOpenState = false;
  let previousFocus: HTMLElement | null = null;

  // Focus trap
  function trapFocus(e: KeyboardEvent): void {
    if (e.key !== "Tab" || !isOpenState) return;
    const focusable = dialog.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }

  // Event handlers
  if (opts.closeOnBackdrop) {
    backdrop.addEventListener("click", () => instance.close());
  }

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpenState) instance.close();
  };
  document.addEventListener("keydown", escHandler);
  document.addEventListener("keydown", trapFocus);

  const instance: DialogInstance = {
    element: dialog,
    backdrop,

    open() {
      if (isOpenState) return;
      isOpenState = true;
      previousFocus = document.activeElement as HTMLElement;

      backdrop.style.display = "block";
      void backdrop.offsetHeight;
      backdrop.style.opacity = "1";
      dialog.style.opacity = "1";
      dialog.style.transform = "translate(-50%,-50%) scale(1)";

      document.body.style.overflow = "hidden";
      confirmBtn.focus();
      opts.onConfirm &&= opts.onConfirm; // Keep ref
      opts.onOpen?.();
    },

    close() {
      if (!isOpenState) return;
      isOpenState = false;

      dialog.style.opacity = "0";
      dialog.style.transform = "translate(-50%,-50%) scale(0.95)";
      backdrop.style.opacity = "0";

      setTimeout(() => {
        backdrop.style.display = "none";
        document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }, opts.animationDuration);

      opts.onCancel?.();
    },

    isOpen() { return isOpenState; },

    destroy() {
      if (isOpenState) {
        document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }
      document.removeEventListener("keydown", escHandler);
      document.removeEventListener("keydown", trapFocus);
      backdrop.remove();
      dialog.remove();
    },
  };

  return instance;
}

// --- Quick Helpers ---

/** Show a simple alert dialog and resolve when dismissed */
export function alertDialog(
  title: string,
  message: string,
  options?: Partial<Omit<DialogOptions, "title" | "message">>,
): Promise<void> {
  return new Promise((resolve) => {
    const dlg = createDialog({
      title,
      message,
      variant: "alert",
      showCancel: false,
      ...options,
      onConfirm: () => resolve(),
      onCancel: () => resolve(),
    });
    dlg.open();
  });
}

/** Show a confirm dialog, resolves to true (confirmed) or false (cancelled) */
export function confirmDialog(
  title: string,
  message: string,
  options?: Partial<Omit<DialogOptions, "title" | "message">>,
): Promise<boolean> {
  return new Promise((resolve) => {
    const dlg = createDialog({
      title,
      message,
      variant: "confirm",
      ...options,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
    dlg.open();
  });
}

/** Show a danger/destructive confirmation dialog */
export function dangerDialog(
  title: string,
  message: string,
  options?: Partial<Omit<DialogOptions, "title" | "message">>,
): Promise<boolean> {
  return confirmDialog(title, message, { ...options, variant: "danger" });
}

// --- Utility ---

function shadeColor(hex: string, percent: number): string {
  const num = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(num.slice(0, 2), 16) + percent));
  const g = Math.max(0, Math.min(255, parseInt(num.slice(2, 4), 16) + percent));
  const b = Math.max(0, Math.min(255, parseInt(num.slice(4, 6), 16) + percent));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
