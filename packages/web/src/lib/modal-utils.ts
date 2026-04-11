/**
 * Modal Utilities: Modal/dialog system with focus trap, overlay backdrop,
 * keyboard dismiss (Escape), scroll lock, animations, portal rendering,
 * size variants, and modal manager for stacking.
 */

// --- Types ---

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "full" | "auto";

export interface ModalOptions {
  /** Modal content: string or HTMLElement */
  content: string | HTMLElement;
  /** Title text */
  title?: string;
  /** Footer content or buttons */
  footer?: string | HTMLElement;
  /** Size variant. Default "md" */
  size?: ModalSize;
  /** Whether to show backdrop/overlay. Default true */
  backdrop?: boolean;
  /** Click backdrop to close. Default true */
  closeOnBackdropClick?: boolean;
  /** Press Escape to close. Default true */
  closeOnEscape?: boolean;
  /** Show close button. Default true */
  closable?: boolean;
  /** Custom CSS class on the modal container */
  className?: string;
  /** Custom CSS class on the backdrop */
  backdropClassName?: string;
  /** Center vertically. Default true */
  centered?: boolean;
  /** Animation duration in ms. Default 200 */
  animationDuration?: number;
  /** Lock body scroll while open. Default true */
  lockScroll?: boolean;
  /** Container element to portal into. Default document.body */
  container?: HTMLElement;
  /** Role attribute value. Default "dialog" */
  role?: "dialog" | "alertdialog";
  /** Label for accessibility (uses title if omitted) */
  ariaLabel?: string;
  /** Called when modal opens */
  onOpen?: () => void;
  /** Called when modal closes */
  onClose?: (reason: "backdrop" | "escape" | "button" | "api") => void;
  /** Called after animation completes on open */
  onOpened?: () => void;
  /** Called after animation completes on close */
  onClosed?: () => void;
}

export interface ModalInstance {
  /** The modal wrapper DOM element */
  element: HTMLElement;
  /** The inner content container */
  contentElement: HTMLElement;
  /** Open the modal */
  open: () => void;
  /** Close the modal */
  close: (reason?: "backdrop" | "escape" | "button" | "api") => void;
  /** Check if currently open */
  isOpen: () => void;
  /** Update modal content */
  setContent: (content: string | HTMLElement) => void;
  /** Update modal title */
  setTitle: (title: string) => void;
  /** Destroy and clean up */
  destroy: () => void;
}

export interface FocusTrapConfig {
  /** Return focus to the element that triggered the trap when done. Default true */
  returnFocus?: boolean;
  /** Initial element to focus inside the trap. Default = first focusable */
  initialFocus?: HTMLElement | null;
  /** Allow Escape to deactivate. Default true */
  escapeDeactivates?: boolean;
  /** Click outside deactivates. Default false */
  clickOutsideDeactivates?: boolean;
  /** Called when trap is activated */
  onActivate?: () => void;
  /** Called when trap is deactivated */
  onDeactivate?: () => void;
}

// --- Size Map ---

const SIZE_STYLES: Record<ModalSize, { maxWidth?: string; width?: string; height?: string; maxHeight?: string }> = {
  xs: { maxWidth: "320px" },
  sm: { maxWidth: "384px" },
  md: { maxWidth: "512px" },
  lg: { maxWidth: "640px" },
  xl: { maxWidth: "800px" },
  full: { width: "100vw", height: "100vh", maxHeight: "100vh" },
  auto: {},
};

// --- Focus Trap ---

/**
 * Create a focus trap within a container element.
 * Tab cycles within, Shift+Tab cycles in reverse.
 * Escape optionally deactivates.
 *
 * @example
 * ```ts
 * const trap = createFocusTrap(modalEl);
 * trap.activate();
 * // Later: trap.deactivate();
 * ```
 */
export function createFocusTrap(
  container: HTMLElement,
  config: FocusTrapConfig = {},
): { activate: () => void; deactivate: () => void; destroy: () => void } {
  const {
    returnFocus = true,
    escapeDeactivates = true,
    clickOutsideDeactivates = false,
    onActivate,
    onDeactivate,
  } = config;

  let active = false;
  let previouslyFocused: HTMLElement | null = null;
  let cleanupFns: Array<() => void> = [];

  const getFocusableElements = (): HTMLElement[] => {
    const selector = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  };

  const getFirstFocusable = (): HTMLElement | null => {
    if (config.initialFocus) return config.initialFocus;
    const elements = getFocusableElements();
    return elements[0] ?? null;
  };

  const getLastFocusable = (): HTMLElement | null => {
    const elements = getFocusableElements();
    return elements[elements.length - 1] ?? null;
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!active) return;

    if (e.key === "Tab") {
      e.preventDefault();
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        // Shift+Tab: go backwards
        if (document.activeElement === first) {
          last.focus();
        } else {
          // Find previous
          const idx = focusable.indexOf(document.activeElement as HTMLElement);
          const prev = idx <= 0 ? last : focusable[idx - 1]!;
          prev.focus();
        }
      } else {
        // Tab: go forwards
        if (document.activeElement === last) {
          first.focus();
        } else {
          const idx = focusable.indexOf(document.activeElement as HTMLElement);
          const next = idx < 0 ? first : focusable[Math.min(idx + 1, focusable.length - 1)]!;
          next.focus();
        }
      }
    }

    if (e.key === "Escape" && escapeDeactivates) {
      e.preventDefault();
      deactivate();
    }
  };

  const handleClickOutside = (e: MouseEvent): void => {
    if (!active || !clickOutsideDeactivates) return;
    if (!container.contains(e.target as Node)) {
      deactivate();
    }
  };

  const activate = () => {
    if (active) return;
    active = true;

    previouslyFocused = document.activeElement as HTMLElement;

    document.addEventListener("keydown", handleKeyDown);
    cleanupFns.push(() => document.removeEventListener("keydown", handleKeyDown));

    if (clickOutsideDeactivates) {
      document.addEventListener("mousedown", handleClickOutside);
      cleanupFns.push(() => document.removeEventListener("mousedown", handleClickOutside));
    }

    const firstFocusable = getFirstFocusable();
    if (firstFocusable) firstFocusable.focus();

    onActivate?.();
  };

  const deactivate = () => {
    if (!active) return;
    active = false;

    for (const fn of cleanupFns) fn();
    cleanupFns = [];

    if (returnFocus && previouslyFocused) {
      previouslyFocused.focus();
    }

    onDeactivate?.();
  };

  const destroy = () => {
    deactivate();
    previouslyFocused = null;
  };

  return { activate, deactivate, destroy };
}

// --- Core Modal ---

/**
 * Create a modal dialog with full accessibility support.
 *
 * @example
 * ```ts
 * const modal = createModal({
 *   title: "Confirm Action",
 *   content: "<p>Are you sure you want to proceed?</p>",
 *   footer: '<button id="modal-cancel">Cancel</button><button id="modal-ok">OK</button>',
 *   onOpen: () => console.log("Opened"),
 *   onClose: (reason) => console.log("Closed:", reason),
 * });
 * modal.open();
 * // Later: modal.close("api");
 * ```
 */
export function createModal(options: ModalOptions): ModalInstance {
  const {
    size = "md",
    backdrop = true,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    closable = true,
    centered = true,
    animationDuration = 200,
    lockScroll = true,
    container = document.body,
    role = "dialog",
  } = options;

  let open = false;
  let focusTrapInstance: ReturnType<typeof createFocusTrap> | null = null;
  let scrollLockCleanup: (() => void) | null = null;
  let cleanupFns: Array<() => void> = [];

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `modal-wrapper ${options.className ?? ""}`.trim();
  wrapper.setAttribute("role", role);
  wrapper.setAttribute("aria-modal", "true");
  if (options.ariaLabel || options.title) {
    wrapper.setAttribute("aria-label", options.ariaLabel ?? options.title!);
  }
  wrapper.setAttribute("data-modal", "true");

  Object.assign(wrapper.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99997",
    display: "flex",
    alignItems: centered ? "center" : "flex-start",
    justifyContent: "center",
    padding: "16px",
    opacity: "0",
    visibility: "hidden",
    transition: `opacity ${animationDuration}ms ease, visibility ${animationDuration}ms`,
    pointerEvents: "none",
  });

  // Create backdrop
  const backdropEl = document.createElement("div");
  backdropEl.className = `modal-backdrop ${options.backdropClassName ?? ""}`;
  Object.assign(backdropEl.style, {
    position: "absolute",
    inset: "0",
    backgroundColor: "rgba(0,0,0,0.5)",
    transition: `opacity ${animationDuration}ms ease`,
    opacity: "0",
  });
  if (backdrop) wrapper.appendChild(backdropEl);

  // Create dialog box
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  const sizeStyle = SIZE_STYLES[size];
  Object.assign(dialog.style, {
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    maxWidth: sizeStyle.maxWidth ?? "512px",
    width: sizeStyle.width ?? "100%",
    maxHeight: sizeStyle.maxHeight ?? "85vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    transform: "scale(0.95)",
    transition: `transform ${animationDuration}ms ease`,
    ...(sizeStyle.height ? { height: sizeStyle.height } : {}),
  });

  // Header
  if (options.title) {
    const header = document.createElement("div");
    header.className = "modal-header";
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid #e5e7eb;
    `;
    header.innerHTML = `<h2 style="margin:0;font-size:18px;font-weight:600;color:#111827;">${escapeHtml(options.title)}</h2>`;
    if (closable) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "modal-close-btn";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close");
      Object.assign(closeBtn.style, {
        background: "none",
        border: "none",
        fontSize: "20px",
        cursor: "pointer",
        padding: "4px 8px",
        color: "#6b7280",
        borderRadius: "4px",
      });
      closeBtn.addEventListener("click", () => close("button"));
      header.appendChild(closeBtn);
    }
    dialog.appendChild(header);
  }

  // Body
  const body = document.createElement("div");
  body.className = "modal-body";
  body.style.cssText = "padding:20px;flex:1;overflow-y:auto;";
  if (typeof options.content === "string") {
    body.innerHTML = options.html ? options.content : escapeHtml(options.content);
  } else {
    body.appendChild(options.content);
  }
  dialog.appendChild(body);

  // Footer
  if (options.footer) {
    const footer = document.createElement("div");
    footer.className = "modal-footer";
    footer.style.cssText = `
      display:flex;align-items:center;justify-content:flex-end;gap:8px;
      padding:12px 20px;border-top:1px solid #e5e7eb;
    `;
    if (typeof options.footer === "string") {
      footer.innerHTML = options.footer;
    } else {
      footer.appendChild(options.footer);
    }
    dialog.appendChild(footer);
  }

  wrapper.appendChild(dialog);
  container.appendChild(wrapper);

  // Methods
  const _open = () => {
    if (open) return;
    open = true;

    // Lock scroll
    if (lockScroll) {
      scrollLockCleanup = _lockBodyScroll();
    }

    // Show
    wrapper.style.visibility = "visible";
    wrapper.style.pointerEvents = "auto";

    requestAnimationFrame(() => {
      wrapper.style.opacity = "1";
      dialog.style.transform = "scale(1)";
      if (backdrop) backdropEl.style.opacity = "1";
    });

    // Setup focus trap
    focusTrapInstance = createFocusTrap(dialog, {
      escapeDeactivates: closeOnEscape,
      onDeactivate: () => close("escape"),
    });
    focusTrapInstance.activate();

    options.onOpen?.();
    setTimeout(() => options.onOpened?.(), animationDuration);
  };

  const close = (reason: "backdrop" | "escape" | "button" | "api" = "api") => {
    if (!open) return;
    open = false;

    // Animate out
    wrapper.style.opacity = "0";
    dialog.style.transform = "scale(0.95)";
    if (backdrop) backdropEl.style.opacity = "0";

    setTimeout(() => {
      wrapper.style.visibility = "hidden";
      wrapper.style.pointerEvents = "none";

      // Cleanup
      focusTrapInstance?.destroy();
      focusTrapInstance = null;
      scrollLockCleanup?.();
      scrollLockCleanup = null;
    }, animationDuration);

    options.onClose?.(reason);
    setTimeout(() => options.onClosed?.(), animationDuration + 50);
  };

  // Backdrop click
  if (backdrop && closeOnBackdropClick) {
    backdropEl.addEventListener("click", () => close("backdrop"));
  }

  // Prevent dialog click from closing via backdrop
  dialog.addEventListener("click", (e) => e.stopPropagation());

  return {
    element: wrapper,
    contentElement: body,
    open: _open,
    close,
    isOpen: () => open,
    setContent: (content: string | HTMLElement) => {
      if (typeof content === "string") {
        body.innerHTML = options.html ? content : escapeHtml(content);
      } else {
        body.innerHTML = "";
        body.appendChild(content);
      }
    },
    setTitle: (title: string) => {
      const titleEl = wrapper.querySelector(".modal-header h2");
      if (titleEl) titleEl.textContent = title;
      wrapper.setAttribute("aria-label", title);
    },
    destroy: () => {
      close();
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
      setTimeout(() => wrapper.remove(), animationDuration + 100);
    },
  };
}

// --- Helpers ---

function _lockBodyScroll(): () => void {
  const scrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";

  return () => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    window.scrollTo(0, scrollY);
  };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
