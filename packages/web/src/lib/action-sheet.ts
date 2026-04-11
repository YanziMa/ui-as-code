/**
 * Action Sheet: iOS-style bottom sheet with action list, cancel button,
 * destructive actions, icons per action, title/description, backdrop dismiss,
 * swipe-to-dismiss, and keyboard support.
 */

// --- Types ---

export type ActionSheetActionStyle = "default" | "destructive" | "cancel" | "primary";

export interface ActionSheetAction {
  /** Action label */
  label: string;
  /** Style variant */
  style?: ActionSheetActionStyle;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Subtitle/description text */
  subtitle?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
}

export interface ActionSheetOptions {
  /** Title text */
  title?: string;
  /** Description/subtitle under title */
  description?: string;
  /** Action items (cancel is auto-appended if not provided) */
  actions: ActionSheetAction[];
  /** Show cancel button? (default: true) */
  showCancel?: boolean;
  /** Cancel button label */
  cancelLabel?: string;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Animation duration ms (default: 300) */
  animationDuration?: number;
  /** Callback when opened */
  onOpen?: () => void;
  /** Callback when closed */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ActionSheetInstance {
  element: HTMLElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createActionSheet(options: ActionSheetOptions): ActionSheetInstance {
  const opts = {
    showCancel: options.showCancel ?? true,
    cancelLabel: options.cancelLabel ?? "Cancel",
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    zIndex: options.zIndex ?? 10500,
    animationDuration: options.animationDuration ?? 300,
    className: options.className ?? "",
    ...options,
  };

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "as-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.4);
    z-index:${opts.zIndex - 1};display:none;transition:opacity ${opts.animationDuration}ms ease;
    opacity:0;pointer-events:none;
  `;
  document.body.appendChild(backdrop);

  // Sheet container
  const sheet = document.createElement("div");
  sheet.className = `action-sheet ${opts.className}`;
  sheet.style.cssText = `
    position:fixed;left:0;right:0;bottom:0;z-index:${opts.zIndex};
    background:#fff;border-radius:16px 16px 0 0;
    max-height:80vh;overflow-y:auto;
    transform:translateY(100%);opacity:0;
    transition:transform ${opts.animationDuration}ms cubic-bezier(0.32,0.72,0,1),
                opacity ${opts.animationDuration}ms ease;
    pointer-events:none;
    overscroll-behavior:contain;
    box-shadow:0 -4px 24px rgba(0,0,0,0.15);
    padding-bottom:env(safe-area-inset-bottom, 0);
  `;
  document.body.appendChild(sheet);

  // Handle (drag indicator)
  const handle = document.createElement("div");
  handle.style.cssText = `
    width:36px;height:5px;border-radius:3px;background:#d1d5db;margin:8px auto 12px;
    flex-shrink:0;cursor:grab;
  `;
  sheet.appendChild(handle);

  let isOpenState = false;
  let destroyed = false;

  function renderContent(): void {
    sheet.innerHTML = "";
    sheet.appendChild(handle);

    // Title section
    if (opts.title || opts.description) {
      const header = document.createElement("div");
      header.style.cssText = "padding:4px 20px 16px;text-align:center;";
      if (opts.title) {
        const titleEl = document.createElement("div");
        titleEl.style.cssText = "font-size:17px;font-weight:600;color:#111827;margin-bottom:4px;";
        titleEl.textContent = opts.title;
        header.appendChild(titleEl);
      }
      if (opts.description) {
        const descEl = document.createElement("div");
        descEl.style.cssText = "font-size:13px;color:#6b7280;line-height:1.4;";
        descEl.textContent = opts.description;
        header.appendChild(descEl);
      }
      sheet.appendChild(header);
    }

    // Separator
    const sep = document.createElement("div");
    sep.style.cssText = "height:1px;background:#f0f0f0;margin:0 16px;";
    sheet.appendChild(sep);

    // Actions list
    for (const action of opts.actions) {
      if (action.style === "cancel") continue; // handled separately
      renderAction(action);
    }

    // Cancel action (always at bottom)
    if (opts.showCancel) {
      // Gap separator
      const gapSep = document.createElement("div");
      gapSep.style.cssText = "height:8px;background:#f3f4f6;margin-top:4px;";
      sheet.appendChild(gapSep);

      const cancelAction: ActionSheetAction = {
        label: opts.cancelLabel,
        style: "cancel",
      };
      renderAction(cancelAction);
    }
  }

  function renderAction(action: ActionSheetAction): void {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.disabled = action.disabled ?? false;
    const isDestructive = action.style === "destructive";
    const isPrimary = action.style === "primary";
    const isCancel = action.style === "cancel";

    btn.style.cssText = `
      display:flex;align-items:center;width:100%;gap:12px;padding:14px 20px;
      border:none;background:none;cursor:${btn.disabled ? "not-allowed" : "pointer"};
      font-size:16px;font-family:-apple-system,sans-serif;font-weight:${isPrimary ? "600" : "400"};
      color:${isDestructive ? "#ef4444" : isCancel ? "#6b7280" : "#111827"};
      text-align:left;transition:background 0.15s;
      opacity:${btn.disabled ? 0.5 : 1};
    `;

    // Icon
    if (action.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = action.icon;
      iconSpan.style.cssText = "flex-shrink:0;font-size:18px;display:flex;align-items:center;width:24px;justify-content:center;";
      btn.appendChild(iconSpan);
    } else {
      // Spacer for alignment
      const spacer = document.createElement("span");
      spacer.style.cssText = "width:24px;flex-shrink:0;";
      btn.appendChild(spacer);
    }

    // Text column
    const textCol = document.createElement("div");
    textCol.style.cssText = "flex:1;min-width:0;";

    const labelEl = document.createElement("span");
    labelEl.textContent = action.label;
    labelEl.style.display = "block";
    textCol.appendChild(labelEl);

    if (action.subtitle) {
      const subEl = document.createElement("span");
      subEl.textContent = action.subtitle;
      subEl.style.cssText = "display:block;font-size:12px;color:#9ca3af;margin-top:2px;";
      textCol.appendChild(subEl);
    }
    btn.appendChild(textCol);

    // Hover/active states
    btn.addEventListener("mouseenter", () => {
      if (!btn.disabled) btn.style.background = "#f9fafb";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "";
    });
    btn.addEventListener("mousedown", () => {
      if (!btn.disabled) btn.style.background = "#f3f4f6";
    });
    btn.addEventListener("mouseup", () => {
      btn.style.background = "";
    });

    // Click handler
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      action.onClick?.();
      close();
    });

    sheet.appendChild(btn);

    // Separator between actions (except before cancel)
    if (action.style !== "cancel") {
      const actionSep = document.createElement("div");
      actionSep.style.cssText = "height:0.5px;background:#f0f0f0;margin:0 16px;";
      sheet.appendChild(actionSep);
    }
  }

  function open(): void {
    if (isOpenState || destroyed) return;
    isOpenState = true;

    renderContent();

    backdrop.style.display = "block";
    requestAnimationFrame(() => { backdrop.style.opacity = "1"; });

    sheet.style.pointerEvents = "auto";
    requestAnimationFrame(() => {
      sheet.style.transform = "translateY(0)";
      sheet.style.opacity = "1";
    });

    opts.onOpen?.();
  }

  function close(): void {
    if (!isOpenState || destroyed) return;
    isOpenState = false;

    sheet.style.transform = "translateY(100%)";
    sheet.style.opacity = "0";
    sheet.style.pointerEvents = "none";

    backdrop.style.opacity = "0";
    setTimeout(() => { backdrop.style.display = "none"; }, opts.animationDuration);

    opts.onClose?.();
  }

  // Backdrop click
  backdrop.addEventListener("click", () => {
    if (opts.closeOnBackdrop) close();
  });

  // Escape key
  document.addEventListener("keydown", function escHandler(e: KeyboardEvent) {
    if (e.key === "Escape" && isOpenState) { e.preventDefault(); close(); }
  });

  // Swipe down to dismiss (touch/mouse drag)
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  handle.addEventListener("pointerdown", (e) => {
    startY = e.clientY;
    isDragging = true;
    handle.setPointerCapture(e.pointerId);
    sheet.style.transition = "none";
  });

  handle.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    currentY = e.clientY - startY;
    if (currentY > 0) {
      sheet.style.transform = `translateY(${currentY}px)`;
      backdrop.style.opacity = String(Math.max(0, 0.4 - currentY / 500));
    }
  });

  handle.addEventListener("pointerup", () => {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = "";

    if (currentY > 100) {
      close();
    } else {
      sheet.style.transform = isOpenState ? "translateY(0)" : "translateY(100%)";
      backdrop.style.opacity = isOpenState ? "1" : "0";
    }
    currentY = 0;
  });

  const instance: ActionSheetInstance = {
    element: sheet,

    isOpen: () => isOpenState,

    open,
    close,

    destroy() {
      destroyed = true;
      close();
      backdrop.remove();
      sheet.remove();
      document.removeEventListener("keydown", escHandler);
    },
  };

  return instance;
}
