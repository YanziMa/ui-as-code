/**
 * Dialog V2: Enhanced modal dialog with backdrop, focus trap,
 * multiple sizes, animations, header/body/footer layout,
 * keyboard navigation, async closing, and accessibility.
 */

// --- Types ---

export type DialogSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";
export type DialogVariant = "default" | "destructive" | "success" | "info";

export interface DialogV2Options {
  /** Dialog title */
  title?: string;
  /** Body content (string or HTMLElement) */
  content: string | HTMLElement;
  /** Container for portal (defaults to document.body) */
  container?: HTMLElement | string;
  /** Size variant */
  size?: DialogSize;
  /** Visual variant */
  variant?: DialogVariant;
  /** Show close button (X)? */
  closable?: boolean;
  /** Show backdrop overlay? */
  backdrop?: boolean;
  /** Click backdrop to close? */
  closeOnBackdrop?: boolean;
  /** Close on Escape key? */
  closeOnEsc?: boolean;
  /** Header element (overrides title) */
  header?: HTMLElement;
  /** Footer element */
  footer?: HTMLElement;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Show confirm/cancel buttons? */
  showButtons?: boolean;
  /** Confirm button is primary/danger style? */
  confirmDanger?: boolean;
  /** Callback on confirm */
  onConfirm?: () => void | Promise<void>;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Callback after dialog closes (animation done) */
  onClose?: () => void;
  /** Animation type */
  animation?: "fade" | "scale" | "slide-up" | "slide-down" | "flip" | "none";
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Backdrop blur (px) */
  backdropBlur?: string;
  /** Backdrop color */
  backdropColor?: string;
  /** Z-index for dialog */
  zIndex?: number;
  /** Prevent body scroll when open? */
  lockScroll?: boolean;
  /** Focus first input on open? */
  autoFocus?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface DialogV2Instance {
  element: HTMLDivElement;
  /** Open the dialog */
  open: () => void;
  /** Close the dialog */
  close: () => Promise<void>;
  /** Check if open */
  isOpen: () => boolean;
  /** Update body content */
  setContent: (content: string | HTMLElement) => void;
  /** Update title */
  setTitle: (title: string) => void;
  /** Destroy completely */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<DialogSize, { width: string; maxWidth: string }> = {
  xs:   { width: "320px", maxWidth: "90vw" },
  sm:   { width: "400px", maxWidth: "90vw" },
  md:   { width: "520px", maxWidth: "90vw" },
  lg:   { width: "680px", maxWidth: "92vw" },
  xl:   { width: "840px", maxWidth: "94vw" },
  full: { width: "100vw", maxWidth: "100vw" },
};

const VARIANT_ACCENTS: Record<DialogVariant, { color: string; iconBg: string }> = {
  default:    { color: "#6366f1", iconBg: "#eef2ff" },
  destructive: { color: "#ef4444", iconBg: "#fef2f2" },
  success:    { color: "#10b981", iconBg: "#ecfdf5" },
  info:       { color: "#0ea5e9", iconBg: "#f0f9ff" },
};

// --- Main Factory ---

export function createDialogV2(options: DialogV2Options): DialogV2Instance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    closable: options.closable ?? true,
    backdrop: options.backdrop ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEsc: options.closeOnEsc ?? true,
    confirmText: options.confirmText ?? "Confirm",
    cancelText: options.cancelText ?? "Cancel",
    showButtons: options.showButtons ?? false,
    confirmDanger: options.confirmDanger ?? false,
    animation: options.animation ?? "scale",
    animationDuration: options.animationDuration ?? 250,
    backdropBlur: options.backdropBlur ?? "4px",
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.4)",
    zIndex: options.zIndex ?? 11000,
    lockScroll: options.lockScroll ?? true,
    autoFocus: options.autoFocus ?? true,
    className: options.className ?? "",
    ...options,
  };

  const containerEl = options.container
    ? (typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)
      : options.container)
    : document.body;

  if (!containerEl) throw new Error("DialogV2: container not found");

  let openState = false;
  let destroyed = false;
  let previousActiveElement: HTMLElement | null = null;

  const va = VARIANT_ACCENTS[opts.variant];

  // --- Create DOM ---

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "dlg-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;z-index:${opts.zIndex};
    background:${opts.backdropColor};backdrop-filter:blur(${opts.backdropBlur});
    opacity:0;transition:opacity ${opts.animationDuration}ms ease;
    display:none;
  `;

  // Dialog
  const dialog = document.createElement("div");
  dialog.className = `dialog-v2 dlg-${opts.size} dlg-${opts.variant} ${opts.className}`;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.style.cssText = `
    position:fixed;z-index:${opts.zIndex + 1};
    left:50%;top:50%;transform:translate(-50%,-50%);
    width:${SIZE_STYLES[opts.size].width};max-width:${SIZE_STYLES[opts.size].maxWidth};
    max-height:85vh;background:#fff;border-radius:16px;
    box-shadow:0 25px 60px rgba(0,0,0,0.25),0 4px 16px rgba(0,0,0,0.1);
    font-family:-apple-system,sans-serif;display:flex;flex-direction:column;
    overflow:hidden;opacity:0;
    transition:opacity ${opts.animationDuration}ms ease,
                transform ${opts.animationDuration}ms cubic-bezier(0.16,1,0.3,1);
  `;
  switch (opts.animation) {
    case "scale": dialog.style.transform += " scale(0.95)"; break;
    case "slide-up": dialog.style.transform += " translateY(20px)"; break;
    case "slide-down": dialog.style.transform += " translateY(-20px)"; break;
    case "flip": dialog.style.transform += " rotateX(10deg)"; break;
  }

  // Header
  const headerEl = document.createElement("div");
  headerEl.className = "dlg-header";
  headerEl.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:18px 24px 14px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
  `;

  if (opts.header) {
    headerEl.appendChild(opts.header.cloneNode(true));
  } else {
    const titleArea = document.createElement("div");
    titleArea.style.cssText = "display:flex;align-items:center;gap:10px;";
    const accentDot = document.createElement("span");
    accentDot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${va.color};flex-shrink:0;`;
    titleArea.appendChild(accentDot);
    const titleText = document.createElement("h2");
    titleText.className = "dlg-title";
    titleText.style.cssText = "margin:0;font-size:17px;font-weight:700;color:#111827;line-height:1.3;";
    titleText.textContent = options.title ?? "";
    titleArea.appendChild(titleText);
    headerEl.appendChild(titleArea);
  }

  // Close button
  if (opts.closable) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    closeBtn.setAttribute("aria-label", "Close dialog");
    closeBtn.style.cssText = `
      width:32px;height:32px;border-radius:8px;border:none;background:none;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:all 0.15s;flex-shrink:0;
    `;
    closeBtn.addEventListener("click", () => close());
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
    headerEl.appendChild(closeBtn);
  }

  dialog.appendChild(headerEl);

  // Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "dlg-body";
  bodyEl.style.cssText = `
    padding:20px 24px;overflow-y:auto;flex:1;line-height:1.6;color:#374151;
  `;
  if (typeof options.content === "string") {
    bodyEl.innerHTML = options.content;
  } else {
    bodyEl.appendChild(options.content.cloneNode(true));
  }
  dialog.appendChild(bodyEl);

  // Footer
  if (opts.footer || opts.showButtons) {
    const footerEl = document.createElement("div");
    footerEl.className = "dlg-footer";
    footerEl.style.cssText = `
      display:flex;align-items:center;justify-content:flex-end;gap:10px;
      padding:16px 24px;border-top:1px solid #f0f0f0;flex-shrink:0;
    `;

    if (opts.footer) {
      footerEl.appendChild(opts.footer.cloneNode(true));
    } else if (opts.showButtons) {
      // Cancel button
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = opts.cancelText;
      cancelBtn.style.cssText = `
        padding:8px 18px;border-radius:8px;border:1px solid #d1d5db;
        background:#fff;color:#374151;font-size:13px;font-weight:500;
        cursor:pointer;transition:all 0.15s;
      `;
      cancelBtn.addEventListener("click", () => close());
      cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.background = "#f9fafb"; });
      cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.background = ""; });
      footerEl.appendChild(cancelBtn);

      // Confirm button
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.textContent = opts.confirmText;
      confirmBtn.style.cssText = `
        padding:8px 18px;border-radius:8px;border:none;
        background:${opts.confirmDanger ? "#ef4444" : va.color};
        color:#fff;font-size:13px;font-weight:600;
        cursor:pointer;transition:all 0.15s;
      `;
      confirmBtn.addEventListener("click", async () => {
        await opts.onConfirm?.();
        close();
      });
      confirmBtn.addEventListener("mouseenter", () => {
        confirmBtn.style.opacity = "0.9";
        confirmBtn.style.transform = "translateY(-1px)";
      });
      confirmBtn.addEventListener("mouseleave", () => {
        confirmBtn.style.opacity = "1";
        confirmBtn.style.transform = "";
      });
      footerEl.appendChild(confirmBtn);
    }

    dialog.appendChild(footerEl);
  }

  // --- Focus Trap ---

  function getFocusableElements(): HTMLElement[] {
    return Array.from(dialog.querySelectorAll<HTMLElement>(
      'button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null || el.getBoundingClientRect().width > 0);
  }

  function trapFocus(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) { e.preventDefault(); return; }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // --- Open/Close ---

  async function open(): Promise<void> {
    if (destroyed || openState) return;
    openState = true;

    previousActiveElement = document.activeElement as HTMLElement;

    // Lock body scroll
    if (opts.lockScroll) {
      document.body.style.overflow = "hidden";
    }

    // Show
    containerEl.appendChild(backdrop);
    containerEl.appendChild(dialog);
    backdrop.style.display = "";
    dialog.style.display = "";

    requestAnimationFrame(() => {
      backdrop.style.opacity = "1";
      dialog.style.opacity = "1";
      dialog.style.transform = "translate(-50%,-50%)";
    });

    // Auto-focus
    if (opts.autoFocus) {
      setTimeout(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) focusable[0]!.focus();
        else bodyEl.focus();
      }, opts.animationDuration + 30);
    }

    // Event listeners
    dialog.addEventListener("keydown", trapFocus);
    if (opts.closeOnEsc) {
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape" && openState) { e.preventDefault(); close(); }
      };
      document.addEventListener("keydown", escHandler);
      (dialog as any).__escHandler = escHandler;
    }
    if (opts.closeOnBackdrop) {
      backdrop.addEventListener("click", () => close());
    }
  }

  async function close(): Promise<void> {
    if (!openState || destroyed) return;

    // Animate out
    backdrop.style.opacity = "0";
    dialog.style.opacity = "0";
    switch (opts.animation) {
      case "scale": dialog.style.transform = "translate(-50%,-50%) scale(0.95)"; break;
      case "slide-up": dialog.style.transform = "translate(-50%,-50%) translateY(20px)"; break;
      case "slide-down": dialog.style.transform = "translate(-50%,-50%) translateY(-20px)"; break;
      case "flip": dialog.style.transform = "translate(-50%,-50%) rotateX(10deg)"; break;
    }

    await new Promise(r => setTimeout(r, opts.animationDuration));

    openState = false;
    backdrop.style.display = "none";
    dialog.style.display = "none";
    backdrop.remove();
    dialog.remove();

    // Restore body scroll
    if (opts.lockScroll) {
      document.body.style.overflow = "";
    }

    // Restore focus
    if (previousActiveElement && typeof previousActiveElement.focus === "function") {
      previousActiveElement.focus();
    }

    opts.onClose?.();
    opts.onCancel?.();
  }

  // --- Instance ---

  const instance: DialogV2Instance = {
    element: dialog,

    isOpen: () => openState,

    open,

    close,

    setContent(content: string | HTMLElement) {
      bodyEl.innerHTML = "";
      if (typeof content === "string") bodyEl.innerHTML = content;
      else bodyEl.appendChild(content.cloneNode(true));
    },

    setTitle(title: string) {
      const titleEl = headerEl.querySelector(".dlg-title");
      if (titleEl) titleEl.textContent = title;
    },

    destroy() {
      destroyed = true;
      if (openState) {
        backdrop.remove();
        dialog.remove();
        if (opts.lockScroll) document.body.style.overflow = "";
      }
    },
  };

  return instance;
}
