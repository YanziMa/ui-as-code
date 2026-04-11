/**
 * Alert Dialog / Modal System: Accessible modal dialogs with
 * confirm, prompt, alert variants, async API, keyboard trap,
 * focus management, backdrop, animations, and custom content.
 */

// --- Types ---

export type DialogType = "alert" | "confirm" | "prompt" | "custom";
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full" | "auto";

export interface AlertDialogOptions {
  /** Dialog type */
  type?: DialogType;
  /** Title text */
  title?: string;
  /** Main message/content */
  message?: string;
  /** Custom HTML content (for "custom" type) */
  content?: HTMLElement | string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel/dismiss label */
  cancelLabel?: string;
  /** Danger mode (red confirm button)? */
  danger?: boolean;
  /** Dialog size */
  size?: DialogSize;
  /** Show close X button? */
  closable?: boolean;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Close on Escape key? */
  closeOnEscape?: boolean;
  /** Custom icon/emoji in header */
  icon?: string;
  /** Prompt input placeholder */
  inputPlaceholder?: string;
  /** Default value for prompt input */
  inputValue?: string;
  /** Input type for prompt ("text", "password", "email", etc.) */
  inputType?: string;
  /** Validate input before confirming */
  validateInput?: (value: string) => string | null; // error message or null = valid
  /** Callback on confirm */
  onConfirm?: (result?: string) => void | Promise<void>;
  /** Callback on cancel/dismiss */
  onCancel?: () => void;
  /** Callback after dialog closes (either way) */
  onClose?: (confirmed: boolean, result?: string) => void;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class on dialog element */
  className?: string;
  /** Z-index override */
  zIndex?: number;
  /** Render into specific container (default: document.body) */
  container?: HTMLElement;
}

export interface AlertDialogInstance {
  /** The root dialog element */
  element: HTMLElement;
  /** The backdrop element */
  backdrop: HTMLElement;
  /** Is currently open? */
  isOpen: () => boolean;
  /** Open the dialog */
  open: () => Promise<void>;
  /** Close the dialog */
  close: (confirmed?: boolean) => Promise<void>;
  /** Confirm action */
  confirm: () => Promise<boolean>;
  /** Cancel action */
  cancel: () => void;
  /** Get current input value (for prompts) */
  getInputValue: () => string;
  /** Set input value programmatically */
  setInputValue: (value: string) => void;
  /** Focus the dialog */
  focus: () => void;
  /** Update content dynamically */
  update: (options: Partial<AlertDialogOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Configurations ---

const SIZE_STYLES: Record<DialogSize, string> = {
  sm: "max-width:380px;",
  md: "max-width:500px;",
  lg: "max-width:640px;",
  xl: "max-width:800px;",
  full: "max-width:95vw;width:95vw;height:90vh;",
  auto: "",
};

// --- Main Factory ---

export function createAlertDialog(options: AlertDialogOptions = {}): AlertDialogInstance {
  const opts = {
    type: options.type ?? "alert",
    title: options.title ?? "",
    message: options.message ?? "",
    confirmLabel: options.confirmLabel ?? "OK",
    cancelLabel: options.cancelLabel ?? "Cancel",
    danger: options.danger ?? false,
    size: options.size ?? "md",
    closable: options.closable ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    animationDuration: options.animationDuration ?? 200,
    zIndex: options.zIndex ?? 1000,
    container: options.container ?? document.body,
    className: options.className ?? "",
    ...options,
  };

  let isOpenState = false;
  let destroyed = false;
  let previouslyFocused: HTMLElement | null = null;

  // --- Create DOM Structure ---

  const wrapper = document.createElement("div");
  wrapper.className = `ad-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;z-index:${opts.zIndex};
    display:none;align-items:center;justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  `;

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "ad-backdrop";
  backdrop.style.cssText = `
    position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);
    transition:opacity ${opts.animationDuration}ms ease;
  `;
  wrapper.appendChild(backdrop);

  // Dialog box
  const dialog = document.createElement("div");
  dialog.className = `ad-dialog ad-${opts.type}`;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.style.cssText = `
    position:relative;background:#fff;border-radius:12px;
    box-shadow:0 20px 60px rgba(0,0,0,0.2),0 0 1px rgba(0,0,0,0.1);
    max-height:85vh;display:flex;flex-direction:column;
    overflow:hidden;${SIZE_STYLES[opts.size]}
    width:100%;margin:16px;
    transform:scale(0.95);opacity:0;
    transition:transform ${opts.animationDuration}ms cubic-bezier(0.175,0.885,0.32,1.275),
                opacity ${opts.animationDuration}ms ease;
  `;
  wrapper.appendChild(dialog);

  // Build header
  buildHeader();

  // Build body
  buildBody();

  // Build footer
  buildFooter();

  opts.container.appendChild(wrapper);

  // --- Builders ---

  function buildHeader(): void {
    if (!opts.title && !opts.closable) return;

    const header = document.createElement("div");
    header.className = "ad-header";
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px 12px;border-bottom:1px solid #f3f4f6;
    `;

    if (opts.title || opts.icon) {
      const titleArea = document.createElement("div");
      titleArea.style.cssText = "display:flex;align-items:center;gap:10px;";

      if (opts.icon) {
        const iconEl = document.createElement("span");
        iconEl.textContent = opts.icon;
        iconEl.style.cssText = "font-size:20px;";
        titleArea.appendChild(iconEl);
      }

      if (opts.title) {
        const titleEl = document.createElement("h3");
        titleEl.textContent = opts.title;
        titleEl.style.cssText = "margin:0;font-size:16px;font-weight:600;color:#111827;line-height:1.3;";
        titleArea.appendChild(titleEl);
      }

      header.appendChild(titleArea);
    }

    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.style.cssText = `
        background:none;border:none;font-size:20px;color:#9ca3af;
        cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1;
        transition:all 0.15s;
      `;
      closeBtn.addEventListener("click", () => instance.cancel());
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#fee2e2"; closeBtn.style.color = "#dc2626"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
      header.appendChild(closeBtn);
    }

    dialog.appendChild(header);
  }

  let inputElement: HTMLInputElement | null = null;

  function buildBody(): void {
    const body = document.createElement("div");
    body.className = "ad-body";
    body.style.cssText = "padding:16px 20px;overflow-y:auto;";

    if (opts.type === "custom" && opts.content) {
      if (typeof opts.content === "string") {
        body.innerHTML = opts.content;
      } else {
        body.appendChild(opts.content);
      }
    } else if (opts.message) {
      const msgEl = document.createElement("p");
      msgEl.textContent = opts.message;
      msgEl.style.cssText = "margin:0;color:#4b5563;font-size:14px;line-height:1.6;";
      body.appendChild(msgEl);
    }

    // Input for prompt type
    if (opts.type === "prompt") {
      const inputWrapper = document.createElement("div");
      inputWrapper.style.cssText = "margin-top:12px;";

      inputElement = document.createElement("input");
      inputElement.type = opts.inputType ?? "text";
      inputElement.placeholder = opts.inputPlaceholder ?? "";
      inputElement.value = opts.inputValue ?? "";
      inputElement.style.cssText = `
        width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;
        font-size:14px;outline:none;transition:border-color 0.15s;
        box-sizing:border-box;font-family:inherit;
      `;
      inputElement.addEventListener("focus", () => { inputElement!.style.borderColor = "#4338ca"; });
      inputElement.addEventListener("blur", () => { inputElement!.style.borderColor = "#d1d5db"; });
      inputElement.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); instance.confirm(); }
      });

      inputWrapper.appendChild(inputElement);
      body.appendChild(inputWrapper);

      // Error message area
      const errorEl = document.createElement("div");
      errorEl.className = "ad-input-error";
      errorEl.style.cssText = "color:#ef4444;font-size:12px;margin-top:4px;display:none;";
      errorEl.id = `${wrapper.className}-error`;
      inputWrapper.appendChild(errorEl);
    }

    dialog.appendChild(body);
  }

  function buildFooter(): void {
    const footer = document.createElement("div");
    footer.className = "ad-footer";
    footer.style.cssText = `
      display:flex;justify-content:flex-end;gap:8px;padding:12px 20px 16px;
      border-top:1px solid #f3f4f6;
    `;

    // Cancel button (for confirm/prompt/custom types)
    if (opts.type !== "alert") {
      const cancelBtn = createButton(opts.cancelLabel!, "secondary");
      cancelBtn.addEventListener("click", () => instance.cancel());
      footer.appendChild(cancelBtn);
    }

    // Confirm button
    const confirmBtn = createButton(
      opts.confirmLabel!,
      opts.danger ? "danger" : "primary"
    );
    confirmBtn.addEventListener("click", () => instance.confirm());
    footer.appendChild(confirmBtn);

    dialog.appendChild(footer);
  }

  function createButton(label: string, variant: "primary" | "secondary" | "danger"): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    const styles: Record<string, string> = {
      primary: "background:#4338ca;color:#fff;border:none;",
      secondary: "background:#fff;color:#374151;border:1px solid #d1d5db;",
      danger: "background:#ef4444;color:#fff;border:none;",
    };
    btn.style.cssText = `
      ${styles[variant]}
      padding:8px 20px;border-radius:8px;font-size:14px;font-weight:500;
      cursor:pointer;transition:all 0.15s;outline:none;
    `;
    btn.addEventListener("mouseenter", () => {
      if (variant === "primary") btn.style.background = "#3730a3";
      else if (variant === "danger") btn.style.background = "#dc2626";
      else { btn.style.borderColor = "#9ca3af"; btn.style.background = "#f9fafb"; }
    });
    btn.addEventListener("mouseleave", () => {
      Object.assign(btn.style, { background: "", borderColor: "" });
    });
    return btn;
  }

  // --- Event Handlers ---

  backdrop.addEventListener("click", () => {
    if (opts.closeOnBackdrop) instance.cancel();
  });

  wrapper.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && opts.closeOnEscape) {
      e.preventDefault();
      instance.cancel();
    }
    // Focus trap: Tab cycles within dialog
    if (e.key === "Tab") {
      trapFocus(e);
    }
  });

  function trapFocus(e: KeyboardEvent): void {
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // --- Instance ---

  const instance: AlertDialogInstance = {
    element: dialog,
    backdrop: wrapper,

    isOpen: () => isOpenState,

    async open(): Promise<void> {
      if (isOpenState || destroyed) return;

      // Save current focus
      previouslyFocused = document.activeElement as HTMLElement;

      // Show
      wrapper.style.display = "flex";
      isOpenState = true;

      // Animate in
      requestAnimationFrame(() => {
        backdrop.style.opacity = "1";
        dialog.style.transform = "scale(1)";
        dialog.style.opacity = "1";
      });

      // Focus management
      setTimeout(() => {
        if (inputElement) inputElement.focus();
        else {
          const firstBtn = dialog.querySelector<HTMLButtonElement>("button");
          if (firstBtn) firstBtn.focus();
          else dialog.focus();
        }
      }, opts.animationDuration + 50);

      // Add keydown listener
      document.addEventListener("keydown", handleKeyDown as EventListener);
    },

    async close(confirmed = false): Promise<void> {
      if (!isOpenState || destroyed) return;

      // Animate out
      backdrop.style.opacity = "0";
      dialog.style.transform = "scale(0.95)";
      dialog.style.opacity = "0";

      await new Promise((r) => setTimeout(r, opts.animationDuration));

      wrapper.style.display = "none";
      isOpenState = false;

      // Restore focus
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }

      document.removeEventListener("keydown", handleKeyDown as EventListener);

      opts.onClose?.(confirmed, instance.getInputValue());
    },

    async confirm(): Promise<boolean> {
      // Validate input for prompts
      if (opts.type === "prompt" && opts.validateInput && inputElement) {
        const error = opts.validateInput(inputElement.value);
        const errorEl = dialog.querySelector(".ad-input-error") as HTMLElement;
        if (error) {
          if (errorEl) {
            errorEl.textContent = error;
            errorEl.style.display = "block";
          }
          inputElement.style.borderColor = "#ef4444";
          inputElement.focus();
          return false;
        } else if (errorEl) {
          errorEl.style.display = "none";
          inputElement.style.borderColor = "#d1d5db";
        }
      }

      await opts.onConfirm?.(instance.getInputValue());
      await instance.close(true);
      return true;
    },

    cancel() {
      opts.onCancel?.();
      instance.close(false);
    },

    getInputValue() {
      return inputElement?.value ?? "";
    },

    setInputValue(value: string) {
      if (inputElement) inputElement.value = value;
    },

    focus() {
      dialog.focus();
    },

    update(newOpts: Partial<AlertDialogOptions>) {
      Object.assign(opts, newOpts);
      // Rebuild DOM
      dialog.innerHTML = "";
      buildHeader();
      // Remove old body and rebuild
      const oldBody = dialog.querySelector(".ad-body");
      oldBody?.remove();
      buildBody();
      const oldFooter = dialog.querySelector(".ad-footer");
      oldFooter?.remove();
      buildFooter();
    },

    destroy() {
      destroyed = true;
      if (isOpenState) instance.close();
      wrapper.remove();
    },
  };

  function handleKeyDown(e: Event): void {
    const ke = e as KeyboardEvent;
    if (ke.key === "Escape" && opts.closeOnEscape) {
      ke.preventDefault();
      instance.cancel();
    }
  }

  return instance;
}

// --- Convenience Functions ---

/** Quick alert dialog — returns a promise that resolves when dismissed */
export async function alert(message: string, title?: string): Promise<void> {
  const dlg = createAlertDialog({ type: "alert", message, title });
  await dlg.open();
  return new Promise((resolve) => {
    const originalClose = dlg.close;
    dlg.close = async (confirmed) => {
      await originalClose(confirmed);
      resolve();
    };
  });
}

/** Quick confirm dialog — returns true/false */
export async function confirm(message: string, title?: string, danger?: boolean): Promise<boolean> {
  const dlg = createAlertDialog({ type: "confirm", message, title, danger });
  await dlg.open();
  return new Promise((resolve) => {
    const origClose = dlg.close;
    dlg.close = async (confirmed) => {
      await origClose(confirmed);
      resolve(confirmed);
    };
  });
}

/** Quick prompt dialog — returns the input value or null if cancelled */
export async function prompt(
  message: string,
  title?: string,
  defaultValue?: string,
  options?: Partial<Omit<AlertDialogOptions, "type" | "message">>
): Promise<string | null> {
  const dlg = createAlertDialog({
    type: "prompt",
    message,
    title,
    inputValue: defaultValue,
    ...options,
  });
  await dlg.open();
  return new Promise((resolve) => {
    const origClose = dlg.close;
    dlg.close = async (confirmed) => {
      await origClose(confirmed);
      resolve(confirmed ? dlg.getInputValue() : null);
    };
  });
}
