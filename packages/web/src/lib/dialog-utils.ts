/**
 * Dialog Utilities: Lightweight dialog system including confirm, alert,
 * prompt, and custom dialogs. Built on top of the overlay/portal pattern.
 * Supports async/await pattern, keyboard handling, and dialog stacking.
 */

// --- Types ---

export type DialogType = "confirm" | "alert" | "prompt" | "custom" | "danger" | "info" | "success";

export interface DialogOptions {
  /** Dialog type */
  type?: DialogType;
  /** Title text */
  title?: string;
  /** Message/description */
  message: string;
  /** Detail/sub-text below message */
  detail?: string;
  /** Primary button label. Default "Confirm" */
  confirmLabel?: string;
  /** Secondary/cancel button label. Default "Cancel" */
  cancelLabel?: string;
  /** Danger variant for confirm button? */
  danger?: boolean;
  /** Show cancel button. Default true */
  showCancel?: boolean;
  /** Default value for prompt dialogs */
  defaultValue?: string;
  /** Placeholder for prompt input */
  placeholder?: string;
  /** Input type for prompt ("text", "password", "email", etc.) */
  inputType?: string;
  /** Custom content (HTMLElement or HTML string) for custom type */
  customContent?: HTMLElement | string;
  /** Width in px or CSS value */
  width?: number | string;
  /** Max width */
  maxWidth?: number | string;
  /** Whether to show backdrop. Default true */
  backdrop?: boolean;
  /** Close on escape. Default true */
  closeOnEscape?: boolean;
  /** Close on backdrop click. Default false for dialogs */
  closeOnBackdropClick?: boolean;
  /** Animation duration ms. Default 200 */
  animationDuration?: number;
  /** Lock body scroll. Default true */
  lockScroll?: boolean;
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Called when confirmed */
  onConfirm?: (value?: string) => void;
  /** Called when cancelled */
  onCancel?: () => void;
  /** Called after dialog opens */
  onOpen?: () => void;
  /** Called after dialog closes */
  onClose?: (confirmed: boolean) => void;
}

export interface DialogResult {
  /** Whether user confirmed */
  confirmed: boolean;
  /** Value from prompt input (if applicable) */
  value?: string;
}

export interface DialogInstance {
  /** The dialog wrapper element */
  el: HTMLElement;
  /** Open the dialog. Returns promise resolving to result */
  open: () => Promise<DialogResult>;
  /** Close programmatically */
  close: (confirmed?: boolean) => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Update message text */
  setMessage: (msg: string) => void;
  /** Update title */
  setTitle: (title: string) => void;
  /** Destroy completely */
  destroy: () => void;
}

export interface DialogManagerConfig {
  /** Max stacked dialogs. Default 5 */
  maxStacked?: number;
  /** Default z-index base. Default 10000 */
  zIndexBase?: number;
  /** Global default animation duration */
  animationDuration?: number;
  /** Global callback when any dialog opens */
  onDialogOpen?: (instance: DialogInstance) => void;
  /** Global callback when any dialog closes */
  onDialogClose?: (instance: DialogInstance, result: DialogResult) => void;
}

export interface DialogManagerInstance {
  /** Show a confirm dialog */
  confirm: (message: string, title?: string) => Promise<boolean>;
  /** Show an alert dialog */
  alert: (message: string, title?: string) => Promise<void>;
  /** Show a prompt dialog */
  prompt: (message: string, title?: string, defaultValue?: string) => Promise<string | null>;
  /** Show a danger/destructive confirm */
  danger: (message: string, title?: string) => Promise<boolean>;
  /** Show a custom dialog */
  show: (options: DialogOptions) => Promise<DialogResult>;
  /** Close all open dialogs */
  closeAll: () => void;
  /** Get count of open dialogs */
  getCount: () => number;
  /** Destroy manager */
  destroy: () => void;
}

// --- Type Config ---

const TYPE_CONFIG: Record<DialogType, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  "confirm": { icon: "&#9888;", color: "#374151", bgColor: "#fff", borderColor: "#e5e7eb" },
  "alert": { icon: "&#8505;", color: "#1e40af", bgColor: "#eff6ff", borderColor: "#bfdbfe" },
  "prompt": { icon: "&#9998;", color: "#374151", bgColor: "#fff", borderColor: "#e5e7eb" },
  "custom": { icon: "", color: "#374151", bgColor: "#fff", borderColor: "#e5e7eb" },
  "danger": { icon: "&#10006;", color: "#991b1b", bgColor: "#fef2f2", borderColor: "#fecaca" },
  "info": { icon: "&#8505;", color: "#1e40af", bgColor: "#eff6ff", borderColor: "#bfdbfe" },
  "success": { icon: "&#10004;", color: "#065f46", bgColor: "#ecfdf5", borderColor: "#a7f3d0" },
};

// --- Core Factory ---

/**
 * Create a dialog instance.
 *
 * @example
 * ```ts
 * const dlg = createDialog({
 *   type: "confirm",
 *   title: "Delete Account?",
 *   message: "This action cannot be undone.",
 *   danger: true,
 * });
 * const result = await dlg.open();
 * if (result.confirmed) { ... }
 * ```
 */
export function createDialog(options: DialogOptions): DialogInstance {
  const {
    type = "confirm",
    title,
    message,
    detail,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
    showCancel = type !== "alert",
    defaultValue = "",
    placeholder = "",
    inputType = "text",
    customContent,
    width = 420,
    maxWidth = "90vw",
    backdrop = true,
    closeOnEscape = true,
    closeOnBackdropClick = false,
    animationDuration = 200,
    lockScroll = true,
    className,
    zIndex = 10000 + _dialogStack.length * 10,
  } = options;

  let _open = false;
  let _resolve: ((result: DialogResult) => void) | null = null;
  let cleanupFns: Array<() => void> = [];
  let savedScrollY = 0;

  const tc = TYPE_CONFIG[type];

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `dialog-overlay ${className ?? ""}`.trim();
  wrapper.setAttribute("role", "dialog");
  wrapper.setAttribute("aria-modal", "true");
  wrapper.setAttribute("aria-label", title ?? type);
  Object.assign(wrapper.style, {
    position: "fixed",
    inset: "0",
    zIndex: String(zIndex),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: "0",
    visibility: "hidden",
    transition: `opacity ${animationDuration}ms ease, visibility ${animationDuration}ms`,
    pointerEvents: "none",
  });

  // Backdrop
  const backdropEl = document.createElement("div");
  backdropEl.className = "dialog-backdrop";
  Object.assign(backdropEl.style, {
    position: "absolute",
    inset: "0",
    backgroundColor: "rgba(0,0,0,0.45)",
    transition: `opacity ${animationDuration}ms ease`,
    opacity: "0",
  });
  if (backdrop) wrapper.appendChild(backdropEl);

  // Dialog box
  const dialog = document.createElement("div");
  dialog.className = "dialog-box";
  const w = typeof width === "number" ? `${width}px` : width;
  const mw = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;
  Object.assign(dialog.style, {
    position: "relative",
    background: tc.bgColor,
    border: `1px solid ${tc.borderColor}`,
    borderRadius: "12px",
    boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
    width: w,
    maxWidth: mw,
    padding: "24px",
    transform: "scale(0.95) translateY(8px)",
    transition: `transform ${animationDuration}ms ease`,
  });

  // Icon area
  if (tc.icon) {
    const iconWrap = document.createElement("div");
    iconWrap.className = "dialog-icon-wrap";
    iconWrap.innerHTML = tc.icon;
    iconWrap.style.cssText =
      "display:flex;align-items:center;justify-content:center;width:40px;height:40px;" +
      "border-radius:50%;font-size:20px;margin-bottom:12px;" +
      (type === "danger"
        ? "background:#fee2e2;color:#dc2626;"
        : type === "success"
          ? "background:#d1fae5;color:#059669;"
          : type === "info" || type === "alert"
            ? "background:#dbeafe;color:#2563eb;"
            : "background:#f3f4f6;color:#6b7280;");
    dialog.appendChild(iconWrap);
  }

  // Title
  if (title) {
    const titleEl = document.createElement("div");
    titleEl.className = "dialog-title";
    titleEl.textContent = title;
    titleEl.style.cssText = "font-size:17px;font-weight:600;color:#111827;margin-bottom:8px;line-height:1.3;";
    dialog.appendChild(titleEl);
  }

  // Message
  const msgEl = document.createElement("div");
  msgEl.className = "dialog-message";
  msgEl.textContent = message;
  msgEl.style.cssText = "font-size:14px;color:#4b5563;line-height:1.55;margin-bottom:4px;";
  dialog.appendChild(msgEl);

  // Detail
  if (detail) {
    const detailEl = document.createElement("div");
    detailEl.className = "dialog-detail";
    detailEl.textContent = detail;
    detailEl.style.cssText = "font-size:13px;color:#9ca3af;line-height:1.4;margin-bottom:16px;";
    dialog.appendChild(detailEl);
  }

  // Prompt input
  let inputEl: HTMLInputElement | null = null;
  if (type === "prompt") {
    inputEl = document.createElement("input");
    inputEl.type = inputType;
    inputEl.value = defaultValue;
    inputEl.placeholder = placeholder || "Enter value...";
    inputEl.className = "dialog-input";
    Object.assign(inputEl.style, {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "14px",
      outline: "none",
      marginBottom: "16px",
      boxSizing: "border-box",
      transition: "border-color 0.15s",
    });
    inputEl.addEventListener("focus", () => { inputEl!.style.borderColor = "#3b82f6"; });
    inputEl.addEventListener("blur", () => { inputEl!.style.borderColor = "#d1d5db"; });
    dialog.appendChild(inputEl);
  }

  // Custom content
  if (type === "custom" && customContent) {
    const customEl = document.createElement("div");
    customEl.className = "dialog-custom-content";
    customEl.style.marginBottom = "16px";
    if (typeof customContent === "string") {
      customEl.innerHTML = customContent;
    } else {
      customEl.appendChild(customContent);
    }
    dialog.appendChild(customEl);
  }

  // Buttons
  const btnRow = document.createElement("div");
  btnRow.className = "dialog-buttons";
  btnRow.style.cssText =
    "display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:" +
    (detail || type === "prompt" || type === "custom" ? "0" : "16px") + ";";

  if (showCancel) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "dialog-btn dialog-btn-cancel";
    cancelBtn.textContent = cancelLabel;
    Object.assign(cancelBtn.style, {
      padding: "8px 18px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      border: "1px solid #d1d5db",
      background: "#fff",
      color: "#374151",
      cursor: "pointer",
      transition: "background 0.12s",
    });
    cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.background = "#f9fafb"; });
    cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.background = "#fff"; });
    cancelBtn.addEventListener("click", () => handleAction(false));
    btnRow.appendChild(cancelBtn);
  }

  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.className = "dialog-btn dialog-btn-confirm";
  okBtn.textContent = confirmLabel;
  Object.assign(okBtn.style, {
    padding: "8px 18px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    border: "none",
    cursor: "pointer",
    transition: "background 0.12s, transform 0.1s",
    ...(danger
      ? { background: "#dc2626", color: "#fff" }
      : { background: "#3b82f6", color: "#fff" }),
  });
  okBtn.addEventListener("mouseenter", () => {
    okBtn.style.transform = "scale(1.02)";
    okBtn.style.background = danger ? "#b91c1c" : "#2563eb";
  });
  okBtn.addEventListener("mouseleave", () => {
    okBtn.style.transform = "";
    okBtn.style.background = danger ? "#dc2626" : "#3b82f6";
  });
  okBtn.addEventListener("click", () => handleAction(true));
  btnRow.appendChild(okBtn);

  dialog.appendChild(btnRow);
  wrapper.appendChild(dialog);
  document.body.appendChild(wrapper);

  // Track stack
  _dialogStack.push({ wrapper, close: handleAction });

  function handleAction(confirmed: boolean): void {
    const val = inputEl?.value ?? undefined;
    closeWithResult({ confirmed, value: val });
  }

  function closeWithResult(result: DialogResult): void {
    if (!_open) return;
    _open = false;

    // Animate out
    wrapper.style.opacity = "0";
    dialog.style.transform = "scale(0.95) translateY(8px)";
    if (backdrop) backdropEl.style.opacity = "0";

    setTimeout(() => {
      wrapper.style.visibility = "hidden";
      wrapper.style.pointerEvents = "none";

      // Cleanup
      for (const fn of cleanupFns) fn();
      cleanupFns = [];

      // Restore scroll
      if (lockScroll) {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.overflow = "";
        window.scrollTo(0, savedScrollY);
      }

      // Remove from stack
      const idx = _dialogStack.findIndex((d) => d.wrapper === wrapper);
      if (idx >= 0) _dialogStack.splice(idx, 1);

      options.onClose?.(result.confirmed);
      _resolve?.(result);
      _resolve = null;
    }, animationDuration);
  }

  function open(): Promise<DialogResult> {
    return new Promise((resolve) => {
      if (_open) { resolve({ confirmed: false }); return; }
      _resolve = resolve;
      _open = true;

      // Lock scroll
      if (lockScroll) {
        savedScrollY = window.scrollY;
        document.body.style.position = "fixed";
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.overflow = "hidden";
      }

      // Show
      wrapper.style.visibility = "visible";
      wrapper.style.pointerEvents = "auto";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          wrapper.style.opacity = "1";
          dialog.style.transform = "scale(1) translateY(0)";
          if (backdrop) backdropEl.style.opacity = "1";

          // Focus input for prompts
          if (inputEl && type === "prompt") {
            inputEl.focus();
            inputEl.select();
          } else {
            okBtn.focus();
          }
        });
      });

      // Escape key
      if (closeOnEscape) {
        const escHandler = (e: KeyboardEvent) => {
          if (e.key === "Escape" && _open) {
            e.preventDefault();
            handleAction(false);
          }
        };
        document.addEventListener("keydown", escHandler);
        cleanupFns.push(() => document.removeEventListener("keydown", escHandler));
      }

      // Backdrop click
      if (backdrop && closeOnBackdropClick) {
        const bgHandler = () => handleAction(false);
        backdropEl.addEventListener("click", bgHandler);
        cleanupFns.push(() => backdropEl.removeEventListener("click", bgHandler));
      }

      options.onOpen?.();
    });
  }

  function close(confirmed = false): void {
    closeWithResult({ confirmed, value: inputEl?.value });
  }

  function isOpen(): boolean { return _open; }

  function setMessage(msg: string): void {
    msgEl.textContent = msg;
  }

  function setTitle(t: string): void {
    const tEl = dialog.querySelector(".dialog-title");
    if (tEl) tEl.textContent = t;
    wrapper.setAttribute("aria-label", t);
  }

  function destroy(): void {
    close(false);
    setTimeout(() => wrapper.remove(), animationDuration + 50);
  }

  return { el: wrapper, open, close, isOpen, setMessage, setTitle, destroy };
}

// --- Convenience Functions ---

/** Show a confirm dialog. Returns Promise<boolean>. */
export function confirmDialog(
  message: string,
  title?: string,
): Promise<boolean> {
  const dlg = createDialog({ type: "confirm", message, title });
  return dlg.open().then((r) => r.confirmed);
}

/** Show an alert dialog. Returns Promise<void>. */
export function alertDialog(
  message: string,
  title?: string,
): Promise<void> {
  const dlg = createDialog({ type: "alert", message, title });
  return dlg.open().then(() => {});
}

/** Show a prompt dialog. Returns Promise<string | null>. */
export function promptDialog(
  message: string,
  title?: string,
  defaultValue = "",
): Promise<string | null> {
  const dlg = createDialog({
    type: "prompt",
    message,
    title,
    defaultValue,
  });
  return dlg.open().then((r) => r.confirmed ? (r.value ?? null) : null);
}

/** Show a danger/destructive confirm dialog. */
export function dangerDialog(
  message: string,
  title?: string,
): Promise<boolean> {
  const dlg = createDialog({ type: "danger", message, title, danger: true });
  return dlg.open().then((r) => r.confirmed);
}

// --- Dialog Manager ---

const _dialogStack: Array<{ wrapper: HTMLElement; close: (confirmed: boolean) => void }> = [];

/**
 * Create a dialog manager for managing multiple dialogs.
 *
 * @example
 * ```ts
 * const mgr = createDialogManager();
 * const confirmed = await mgr.confirm("Are you sure?");
 * await mgr.alert("Done!");
 * ```
 */
export function createDialogManager(config: DialogManagerConfig = {}): DialogManagerInstance {
  const {
    maxStacked = 5,
    animationDuration = 200,
    onDialogOpen,
    onDialogClose,
  } = config;

  const activeInstances: DialogInstance[] = [];

  async function show(options: DialogOptions): Promise<DialogResult> {
    if (activeInstances.length >= maxStacked) {
      // Close oldest
      activeInstances[0]?.close(false);
    }

    const instance = createDialog({
      ...options,
      animationDuration,
    });

    activeInstances.push(instance);
    onDialogOpen?.(instance);

    const result = await instance.open();

    const idx = activeInstances.indexOf(instance);
    if (idx >= 0) activeInstances.splice(idx, 1);

    onDialogClose?.(instance, result);
    return result;
  }

  async function confirm(message: string, title?: string): Promise<boolean> {
    const r = await show({ type: "confirm", message, title });
    return r.confirmed;
  }

  async function alert(message: string, title?: string): Promise<void> {
    await show({ type: "alert", message, title });
  }

  async function prompt(message: string, title?: string, defaultValue?: string): Promise<string | null> {
    const r = await show({ type: "prompt", message, title, defaultValue });
    return r.confirmed ? (r.value ?? null) : null;
  }

  async function danger(message: string, title?: string): Promise<boolean> {
    const r = await show({ type: "danger", message, title, danger: true });
    return r.confirmed;
  }

  function closeAll(): void {
    for (const inst of activeInstances) inst.close(false);
    activeInstances.length = 0;
  }

  function getCount(): number { return activeInstances.length; }

  function destroy(): void {
    closeAll();
  }

  return { confirm, alert, prompt, danger, show, closeAll, getCount, destroy };
}
