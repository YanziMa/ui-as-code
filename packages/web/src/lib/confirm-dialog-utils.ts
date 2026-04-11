/**
 * Confirm Dialog Utilities: Modal confirmation dialogs with async support,
 * multiple button configs, danger mode, and customizable content.
 */

// --- Types ---

export type ConfirmDialogVariant = "default" | "danger" | "warning" | "info";

export interface ConfirmButtonConfig {
  /** Button label */
  label: string;
  /** Button variant */
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** Auto-resolve dialog with this value when clicked */
  resolveValue?: unknown;
  /** Whether this button auto-closes the dialog */
  autoClose?: boolean;
  /** Custom onClick handler (returning false prevents close) */
  onClick?: () => boolean | void | Promise<boolean>;
}

export interface ConfirmDialogOptions {
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  message: string;
  /** Visual variant */
  variant?: ConfirmDialogVariant;
  /** Primary confirm button config */
  confirmText?: string;
  /** Cancel/dismiss button text */
  cancelText?: string;
  /** Additional custom buttons */
  buttons?: ConfirmButtonConfig[];
  /** Danger mode (confirms are destructive) */
  danger?: boolean;
  /** Show icon based on variant */
  showIcon?: boolean;
  /** Custom icon (HTML string) */
  icon?: string;
  /** Custom width (px or CSS value) */
  width?: number | string;
  /** Close on overlay click */
  overlayClose?: boolean;
  /** Close on Escape key */
  escapeClose?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
  /** Called when dialog opens */
  onOpen?: () => void;
  /** Called when dialog closes (with resolved value) */
  onClose?: (result: unknown) => void;
}

export interface ConfirmDialogInstance {
  /** The dialog root element */
  el: HTMLElement;
  /** Show the dialog — returns Promise<result> */
  show: () => Promise<unknown>;
  /** Close programmatically with a result */
  close: (result?: unknown) => void;
  /** Check if currently open */
  isOpen: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Variant Config ---

const DIALOG_VARIANTS: Record<ConfirmDialogVariant, { icon: string; iconBg: string; iconColor: string; confirmBg: string; confirmColor: string }> = {
  "default": { icon: "&#8505;", iconBg: "#eff6ff", iconColor: "#2563eb", confirmBg: "#3b82f6", confirmColor: "#fff" },
  "danger": { icon: "&#9888;", iconBg: "#fef2f2", iconColor: "#dc2626", confirmBg: "#ef4444", confirmColor: "#fff" },
  "warning": { icon: "&#9888;", iconBg: "#fffbeb", iconColor: "#d97706", confirmBg: "#f59e0b", confirmColor: "#fff" },
  "info": { icon: "&#8505;", iconBg: "#eff6ff", iconColor: "#2563eb", confirmBg: "#3b82f6", confirmColor: "#fff" },
};

// --- Core Factory ---

/**
 * Create a confirmation dialog.
 *
 * @example
 * ```ts
 * const dialog = createConfirmDialog({
 *   title: "Delete item?",
 *   message: "This action cannot be undone.",
 *   variant: "danger",
 *   confirmText: "Delete",
 * });
 *
 * const result = await dialog.show(); // result = true if confirmed, false/null if cancelled
 * ```
 */
export function createConfirmDialog(options: ConfirmDialogOptions): ConfirmDialogInstance {
  const {
    title,
    message,
    variant = "default",
    confirmText = "Confirm",
    cancelText = "Cancel",
    buttons = [],
    danger = false,
    showIcon = true,
    icon,
    width = 420,
    overlayClose = true,
    escapeClose = true,
    container,
    className,
    onOpen,
    onClose,
  } = options;

  let _open = false;
  let _resolve: ((value: unknown) => void) | null = null;
  let cleanupFns: Array<() => void> = [];

  const v = DIALOG_VARIANTS[danger ? "danger" : variant];

  // Overlay
  const overlay = document.createElement("div");
  overlay.className = `confirm-overlay ${className ?? ""}`.trim();
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:1100;display:flex;align-items:center;" +
    "justify-content:center;background:rgba(0,0,0,0.4);opacity:0;transition:opacity 0.15s;";

  // Dialog
  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";
  dialog.style.cssText =
    `width:${typeof width === "number" ? `${width}px` : width};max-width:90vw;` +
    "background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.2);" +
    "padding:24px;max-height:85vh;overflow-y:auto;transform:scale(0.95);opacity:0;" +
    "transition:transform 0.2s ease, opacity 0.2s ease;";

  // Icon + Title area
  const headerArea = document.createElement("div");
  headerArea.style.display = "flex";
  headerArea.style.alignItems = "center";
  headerArea.style.gap = "12px";
  headerArea.style.marginBottom = "12px";

  if (showIcon) {
    const iconEl = document.createElement("div");
    iconEl.innerHTML = icon || v.icon;
    iconEl.style.cssText =
      `display:flex;align-items:center;justify-content:center;width:36px;height:36px;` +
      `background:${v.iconBg};color:${v.iconColor};border-radius:50%;font-size:18px;flex-shrink:0;`;
    headerArea.appendChild(iconEl);
  }

  const titleEl = document.createElement("h3");
  titleEl.textContent = title;
  titleEl.style.cssText = "margin:0;font-size:17px;font-weight:600;color:#111827;line-height:1.3;";
  headerArea.appendChild(titleEl);
  dialog.appendChild(headerArea);

  // Message
  const msgEl = document.createElement("p");
  msgEl.textContent = message;
  msgEl.style.cssText = "margin:0 0 20px 0;font-size:14px;color:#6b7280;line-height:1.5;";
  dialog.appendChild(msgEl);

  // Buttons
  const buttonRow = document.createElement("div");
  buttonRow.style.cssText =
    "display:flex;justify-content:flex-end;gap:8px;margin-top:4px;";

  // Cancel button
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = cancelText;
  cancelBtn.style.cssText =
    "padding:8px 18px;border:1px solid #d1d5db;border-radius:8px;" +
    "background:#fff;color:#6b7280;font-size:14px;font-weight:500;cursor:pointer;" +
    "transition:border-color 0.12s,color 0.12s;";
  cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.borderColor = "#93c5fd"; cancelBtn.style.color = "#374151"; });
  cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.borderColor = "#d1d5db"; cancelBtn.style.color = "#6b7280"; });
  cancelBtn.addEventListener("click", () => close(null));
  buttonRow.appendChild(cancelBtn);

  // Confirm button
  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.textContent = confirmText;
  confirmBtn.style.cssText =
    "padding:8px 18px;border:none;border-radius:8px;" +
    `background:${v.confirmBg};color:${v.confirmColor};font-size:14px;font-weight:500;cursor:pointer;` +
    "transition:background 0.12s;";
  confirmBtn.addEventListener("mouseenter", () => { confirmBtn.style.background = danger ? "#dc2626" : "#2563eb"; });
  confirmBtn.addEventListener("mouseleave", () => { confirmBtn.style.background = v.confirmBg; });
  confirmBtn.addEventListener("click", () => close(true));
  buttonRow.insertBefore(confirmBtn, cancelBtn.nextSibling);

  // Custom buttons (inserted before cancel)
  for (const btn of buttons) {
    const customBtn = document.createElement("button");
    customBtn.type = "button";
    customBtn.textContent = btn.label;
    const variantStyle: Record<string, string> = {
      primary: `background:#3b82f6;color:#fff;border:none;`,
      secondary: `background:#fff;color:#374151;border:1px solid #d1d5db;`,
      danger: `background:#ef4444;color:#fff;border:none;`,
      ghost: `background:transparent;color:#6b7280;border:1px solid transparent;`,
    };
    customBtn.style.cssText =
      "padding:8px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;" +
      (variantStyle[btn.variant ?? "secondary"] ?? variantStyle.secondary) +
      "transition:all 0.12s;";
    customBtn.addEventListener("click", async () => {
      const result = await btn.onClick?.();
      if (result !== false) close(btn.resolveValue ?? btn.label);
    });
    buttonRow.insertBefore(customBtn, cancelBtn);
  }

  dialog.appendChild(buttonRow);
  overlay.appendChild(dialog);

  // --- Methods ---

  function show(): Promise<unknown> {
    if (_open) return Promise.resolve(undefined);
    _open = true;

    (container ?? document.body).appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        dialog.style.transform = "scale(1)";
        dialog.style.opacity = "1";
      });
    });

    _setupListeners();
    onOpen?.();

    return new Promise((resolve) => { _resolve = resolve; });
  }

  function close(result?: unknown): void {
    if (!_open) return;
    _open = false;

    overlay.style.opacity = "0";
    dialog.style.transform = "scale(0.95)";
    dialog.style.opacity = "0";

    setTimeout(() => {
      overlay.remove();
      _removeListeners();
      _resolve?.(result ?? null);
      _resolve = null;
      onClose?.(result ?? null);
    }, 150);
  }

  function isOpen(): boolean { return _open; }

  function destroy(): void {
    if (_open) close();
    overlay.remove();
  }

  // --- Internal ---

  function _setupListeners(): void {
    if (overlayClose) {
      const handler = (e: MouseEvent) => {
        if (e.target === overlay) close(null);
      };
      overlay.addEventListener("mousedown", handler);
      cleanupFns.push(() => overlay.removeEventListener("mousedown", handler));
    }

    if (escapeClose) {
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") close(null);
      };
      document.addEventListener("keydown", escHandler);
      cleanupFns.push(() => document.removeEventListener("keydown", escHandler));
    }
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: overlay, show, close, isOpen, destroy };
}
