/**
 * Confirm Dialog: Modal confirmation dialog with customizable buttons, danger mode,
 * icon support, async/promise API, keyboard accessibility, and auto-focus.
 */

// --- Types ---

export type ConfirmDialogVariant = "default" | "danger" | "warning" | "info";
export type ConfirmButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface ConfirmButton {
  label: string;
  variant?: ConfirmButtonVariant;
  /** Auto-resolve dialog on click (default: true for non-cancel buttons) */
  resolves?: boolean;
  /** Button type */
  type?: "button" | "submit";
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Custom class */
  className?: string;
}

export interface ConfirmDialogOptions {
  /** Title text */
  title: string;
  /** Body message (string or HTML element) */
  message: string | HTMLElement;
  /** Dialog variant */
  variant?: ConfirmDialogVariant;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Custom width (px or CSS value) */
  width?: number | string;
  /** Buttons configuration */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Custom buttons array (overrides confirm/cancel) */
  buttons?: ConfirmButton[];
  /** Show cancel button? (default: true) */
  showCancel?: boolean;
  /** Danger mode (red styling for confirm) */
  danger?: boolean;
  /** Close on overlay click? */
  closeOnOverlay?: boolean;
  /** Close on Escape? */
  closeOnEscape?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Callback on confirm */
  onConfirm?: () => void | Promise<void>;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ConfirmDialogInstance {
  element: HTMLDivElement;
  /** Show the dialog */
  open: () => void;
  /** Close the dialog */
  close: () => void;
  /** Returns a Promise that resolves on confirm, rejects on cancel */
  result: () => Promise<boolean>;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Variant Config ---

const VARIANT_STYLES: Record<ConfirmDialogVariant, {
  iconBg: string; iconColor: string; borderColor: string; confirmBg: string; confirmColor: string;
}> = {
  default: { iconBg: "#eef2ff", iconColor: "#3b82f6", borderColor: "#e5e7eb", confirmBg: "#4338ca", confirmColor: "#fff" },
  danger:  { iconBg: "#fef2f2", iconColor: "#dc2626", borderColor: "#fecaca", confirmBg: "#dc2626", confirmColor: "#fff" },
  warning: { iconBg: "#fffbeb", iconColor: "#d97706", borderColor: "#fde68a", confirmBg: "#d97706", confirmColor: "#fff" },
  info:    { iconBg: "#eff6ff", iconColor: "#2563eb", borderColor: "#bfdbfe", confirmBg: "#2563eb", confirmColor: "#fff" },
};

const DEFAULT_ICONS: Record<ConfirmDialogVariant, string> = {
  default: "?",
  danger: "\u26A0",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
};

// --- Main Factory ---

export function createConfirmDialog(options: ConfirmDialogOptions): ConfirmDialogInstance {
  const opts = {
    variant: options.variant ?? "default",
    showCancel: options.showCancel ?? true,
    closeOnOverlay: options.closeOnOverlay ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 200,
    danger: options.danger ?? false,
    ...options,
  };

  const vs = VARIANT_STYLES[opts.variant];
  const width = typeof opts.width === "number" ? `${opts.width}px` : opts.width ?? "420px";

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "confirm-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.4);
    z-index:${opts.zIndex};display:none;align-items:center;justify-content:center;
    opacity:0;transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Dialog
  const dialog = document.createElement("div");
  dialog.className = `confirm-dialog ${opts.className ?? ""}`;
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "confirm-title");
  dialog.style.cssText = `
    background:#fff;border-radius:12px;
    box-shadow:0 20px 60px rgba(0,0,0,0.2),0 4px 12px rgba(0,0,0,0.1);
    width:${width};max-width:90vw;font-family:-apple-system,sans-serif;
    color:#374151;transform:scale(0.95);opacity:0;
    transition:transform ${opts.animationDuration}ms ease,opacity ${opts.animationDuration}ms ease;
    overflow:hidden;
  `;

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    display:flex;align-items:center;gap:12px;padding:20px 24px 16px;border-bottom:1px solid ${vs.borderColor};
  `;

  // Icon
  const iconEl = document.createElement("span");
  iconEl.style.cssText = `
    flex-shrink:0;width:36px;height:36px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    background:${vs.iconBg};color:${vs.iconColor};
    font-size:18px;font-weight:600;
  `;
  iconEl.textContent = opts.icon ?? DEFAULT_ICONS[opts.variant];
  header.appendChild(iconEl);

  // Title
  const titleEl = document.createElement("h3");
  titleEl.id = "confirm-title";
  titleEl.style.cssText = "font-size:16px;font-weight:600;color:#111827;margin:0;flex:1;";
  titleEl.textContent = opts.title;
  header.appendChild(titleEl);

  dialog.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "confirm-body";
  body.style.cssText = "padding:16px 24px 20px;font-size:14px;line-height:1.6;color:#4b5563;";
  if (typeof opts.message === "string") {
    body.innerHTML = opts.message;
  } else {
    body.appendChild(opts.message);
  }
  dialog.appendChild(body);

  // Footer / Buttons
  const footer = document.createElement("div");
  footer.style.cssText = `
    display:flex;justify-content:flex-end;gap:8px;padding:12px 24px 20px;
    border-top:1px solid ${vs.borderColor};background:#fafafa;
  `;

  let resolveFn: ((value: boolean) => void) | null = null;
  let rejectFn: (() => void) | null = null;

  // Build buttons
  if (opts.buttons && opts.buttons.length > 0) {
    for (const btn of opts.buttons) {
      const btnEl = createButton(btn, vs, opts);
      footer.appendChild(btnEl);
    }
  } else {
    // Default: Cancel + Confirm
    if (opts.showCancel) {
      const cancelBtn = createButton(
        { label: opts.cancelLabel ?? "Cancel", variant: "ghost", resolves: false },
        vs, opts,
      );
      footer.appendChild(cancelBtn);
    }

    const confirmBtn = createButton({
      label: opts.confirmLabel ?? (opts.danger ? "Delete" : "Confirm"),
      variant: opts.danger ? "danger" : "primary",
      resolves: true,
      type: "submit",
    }, vs, opts);
    footer.appendChild(confirmBtn);
  }

  dialog.appendChild(footer);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  // State
  let isOpen = false;
  let destroyed = false;

  function doOpen(): void {
    if (isOpen || destroyed) return;
    isOpen = true;
    backdrop.style.display = "flex";
    void backdrop.offsetHeight;
    backdrop.style.opacity = "1";
    dialog.style.transform = "scale(1)";
    dialog.style.opacity = "1";

    // Focus first button
    const firstBtn = footer.querySelector<HTMLButtonElement>("button:not([disabled])");
    firstBtn?.focus();

    document.body.style.overflow = "hidden";
  }

  function doClose(result?: boolean): void {
    if (!isOpen || destroyed) return;
    isOpen = false;
    backdrop.style.opacity = "0";
    dialog.style.transform = "scale(0.95)";
    dialog.style.opacity = "0";
    setTimeout(() => {
      backdrop.style.display = "none";
      document.body.style.overflow = "";
      if (result === true) resolveFn?.(true);
      else if (result === false) rejectFn?.();
    }, opts.animationDuration);
  }

  // Event handlers
  if (opts.closeOnOverlay) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) { doClose(false); opts.onCancel?.(); }
    });
  }

  if (opts.closeOnEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) { doClose(false); opts.onCancel?.(); }
    };
    document.addEventListener("keydown", escHandler);
    (backdrop as any)._escHandler = escHandler;
  }

  // Focus trap
  const focusTrap = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !isOpen) return;
    const focusable = dialog.querySelectorAll<HTMLButtonElement>(
      'button:not([disabled])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };
  document.addEventListener("keydown", focusTrap);

  const instance: ConfirmDialogInstance = {
    element: dialog,

    open() { doOpen(); },

    close() { doClose(); },

    result(): Promise<boolean> {
      return new Promise((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
        doOpen();
      });
    },

    destroy() {
      destroyed = true;
      document.removeEventListener("keydown", focusTrap);
      const escH = (backdrop as any)._escHandler;
      if (escH) document.removeEventListener("keydown", escH);
      backdrop.remove();
    },
  };

  return instance;
}

function createButton(
  btn: ConfirmButton,
  vs: ReturnType<typeof VARIANT_STYLES[ConfirmDialogVariant],
  opts: Required<Pick<ConfirmDialogOptions, "variant">>,
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = btn.type ?? "button";
  el.textContent = btn.label;
  el.disabled = btn.disabled ?? false;

  const variantStyles: Record<string, string> = {
    primary: `background:${vs.confirmBg};color:${vs.confirmColor};border:none;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;`,
    secondary: `background:#fff;color:#374151;border:1px solid #d1d5db;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;`,
    danger: `background:#dc2626;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;`,
    ghost: `background:transparent;color:#6b7280;border:1px solid #d1d5db;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;`,
  };

  el.style.cssText = variantStyles[btn.variant ?? "primary"] + (btn.className ?? "");
  if (btn.loading) {
    el.disabled = true;
    el.style.opacity = "0.7";
  }

  el.addEventListener("mouseenter", () => {
    if (!el.disabled && !btn.loading) el.style.opacity = "0.9";
  });
  el.addEventListener("mouseleave", () => {
    if (!el.disabled) el.style.opacity = "";
  });

  el.addEventListener("click", () => {
    if (el.disabled || btn.loading) return;
    if (btn.resolves !== false) {
      doClose(true);
      opts.onConfirm?.();
    } else {
      doClose(false);
      opts.onCancel?.();
    }
  });

  return el;
}
