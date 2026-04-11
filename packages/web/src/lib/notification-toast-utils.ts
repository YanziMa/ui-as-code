/**
 * Notification/Toast Utilities: Toast notification system with positions,
 * auto-dismiss, progress bar, stacking, queue management, action buttons,
 * rich content (HTML), animations, and toast manager.
 */

// --- Types ---

export type ToastType = "info" | "success" | "warning" | "error" | "default";
export type ToastPosition = "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "bottom-center";

export interface ToastOptions {
  /** Unique ID (auto-generated if omitted) */
  id?: string;
  /** Title text */
  title?: string;
  /** Main message */
  message: string;
  /** Type/style variant */
  type?: ToastType;
  /** Duration in ms (0 = persistent). Default: 5000 */
  duration?: number;
  /** Position override (uses manager default otherwise) */
  position?: ToastPosition;
  /** Show close button */
  closable?: boolean;
  /** Show progress bar indicating remaining time */
  showProgress?: boolean;
  /** Action button label and callback */
  action?: { label: string; onClick: () => void };
  /** Custom icon (HTMLElement or emoji string) */
  icon?: string | HTMLElement;
  /** Rich HTML content instead of plain message */
  html?: boolean;
  /** Custom CSS class on the toast element */
  className?: string;
  /** Called when toast is dismissed */
  onDismiss?: (id: string) => void;
  /** Called when toast is clicked */
  onClick?: (id: string) => void;
  /** Pause timer on hover */
  pauseOnHover?: boolean;
}

export interface ToastInstance {
  id: string;
  element: HTMLElement;
  /** Dismiss this toast */
  dismiss: () => void;
  /** Update message content */
  updateMessage: (message: string) => void;
  /** Reset the auto-dismiss timer */
  resetTimer: () => void;
}

export interface ToastManagerOptions {
  /** Default position for toasts */
  position?: ToastPosition;
  /** Maximum visible toasts at once (0 = unlimited) */
  maxVisible?: number;
  /** Gap between stacked toasts (px) */
  gap?: number;
  /** Default duration for auto-dismiss (ms) */
  defaultDuration?: number;
  /** Show animation duration (ms) */
  enterDuration?: number;
  /** Hide animation duration (ms) */
  exitDuration?: number;
  /** Container element (default: creates a fixed container) */
  container?: HTMLElement;
  /** RTL layout? */
  rtl?: boolean;
  /** Custom class name on container */
  className?: string;
  /** Called when any toast is added */
  onAdd?: (toast: ToastInstance) => void;
  /** Called when any toast is removed */
  onRemove?: (toast: ToastInstance) => void;
}

// --- Type Defaults ---

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  default: { bg: "#ffffff", border: "#e5e7eb", icon: "" },
  info:    { bg: "#eff6ff", border: "#93c5fd", icon: "\u2139\uFE0F" },
  success: { bg: "#f0fdf4", border: "#86efac", icon: "\u2713" },
  warning: { bg: "#fffbeb", border: "#fcd34d", icon: "\u26A0\uFE0F" },
  error:   { bg: "#fef2f2", border: "#fca5a5", icon: "\u2715" },
};

const POSITION_STYLES: Record<ToastPosition, string> = {
  "top-right":     "top:16px;right:16px;",
  "top-left":      "top:16px;left:16px;",
  "top-center":    "top:16px;left:50%;transform:translateX(-50%);",
  "bottom-right":  "bottom:16px;right:16px;",
  "bottom-left":   "bottom:16px;left:16px;",
  "bottom-center": "bottom:16px;left:50%;transform:translateX(-50%);",
};

// --- Counter for unique IDs ---

let _toastIdCounter = 0;

function generateToastId(): string {
  return `toast-${Date.now()}-${++_toastIdCounter}`;
}

// --- Core Toast Manager ---

/**
 * Create a toast notification manager.
 *
 * @example
 * ```ts
 * const toaster = createToastManager({ position: "top-right" });
 * toaster.show({ message: "File saved!", type: "success" });
 * toaster.show({ message: "Error uploading", type: "error", duration: 0 });
 * ```
 */
export function createToastManager(options: ToastManagerOptions = {}): {
  show: (opts: ToastOptions) => ToastInstance;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  destroy: () => void;
  getActiveCount: () => number;
} {
  const {
    position = "top-right",
    maxVisible = 0,
    gap = 12,
    defaultDuration = 5000,
    enterDuration = 300,
    exitDuration = 200,
    rtl = false,
    className,
    onAdd,
    onRemove,
  } = options;

  const activeToasts = new Map<string, ToastInstance>();
  let containerEl: HTMLElement | null = null;
  let destroyed = false;

  // Ensure container exists
  function getContainer(): HTMLElement {
    if (containerEl) return containerEl;

    containerEl = document.createElement("div");
    containerEl.className = `toast-container ${className ?? ""}`.trim();
    containerEl.setAttribute("role", "status");
    containerEl.setAttribute("aria-live", "polite");
    containerEl.style.cssText =
      `position:fixed;z-index:99999;display:flex;flex-direction:column;` +
      `${POSITION_STYLES[position]}` +
      `max-width:400px;width:100%;pointer-events:none;gap:${gap}px;` +
      (rtl ? "direction:rtl;" : "");

    document.body.appendChild(containerEl);
    return containerEl;
  }

  // Create a single toast element
  function createToastElement(opts: ToastOptions): { el: HTMLElement; instance: ToastInstance } {
    const id = opts.id ?? generateToastId();
    const type = opts.type ?? "default";
    const style = TYPE_STYLES[type];
    const duration = opts.duration ?? defaultDuration;

    const el = document.createElement("div");
    el.className = `toast toast-${type} ${opts.className ?? ""}`.trim();
    el.dataset.toastId = id;
    el.style.cssText =
      `display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;` +
      `background:${style.bg};border:1px solid ${style.border};box-shadow:0 4px 16px rgba(0,0,0,0.1);` +
      `min-width:280px;max-width:400px;pointer-events:auto;opacity:0;transform:translateX(${position.includes("right") ? (rtl ? "-" : "+") : rtl ? "+" : "-"}40px);` +
      `transition:opacity ${enterDuration}ms ease, transform ${enterDuration}ms ease;`;
    el.setAttribute("role", "alert");

    // Icon
    const iconArea = document.createElement("span");
    iconArea.className = "toast-icon";
    iconArea.style.cssText = "flex-shrink:0;font-size:18px;line-height:1;";
    iconArea.textContent = opts.icon ? (typeof opts.icon === "string" ? opts.icon : "") : style.icon;
    if (opts.icon instanceof HTMLElement) {
      iconArea.textContent = "";
      iconArea.appendChild(opts.icon);
    }
    el.appendChild(iconArea);

    // Content area
    const content = document.createElement("div");
    content.className = "toast-content";
    content.style.cssText = "flex:1;min-width:0;";

    if (opts.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "toast-title";
      titleEl.style.cssText = "font-weight:600;font-size:14px;color:#111827;margin-bottom:2px;";
      titleEl.textContent = opts.title;
      content.appendChild(titleEl);
    }

    const msgEl = document.createElement("div");
    msgEl.className = "toast-message";
    msgEl.style.cssText = "font-size:13px;color:#374151;line-height:1.4;word-break:break-word;";
    if (opts.html) {
      msgEl.innerHTML = opts.message;
    } else {
      msgEl.textContent = opts.message;
    }
    content.appendChild(msgEl);

    // Action button
    if (opts.action) {
      const btn = document.createElement("button");
      btn.className = "toast-action";
      btn.style.cssText =
        "margin-top:8px;padding:4px 12px;font-size:12px;font-weight:500;" +
        "background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;";
      btn.textContent = opts.action.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        opts.action!.onClick();
      });
      content.appendChild(btn);
    }

    el.appendChild(content);

    // Progress bar
    let progressBar: HTMLElement | null = null;
    if (duration > 0 && opts.showProgress !== false) {
      progressBar = document.createElement("div");
      progressBar.className = "toast-progress";
      progressBar.style.cssText =
        "position:absolute;bottom:0;left:0;height:3px;background:#3b82f6;" +
        "border-radius:0 0 10px 10px;transition:width linear;width:100%;";
      el.style.position = "relative";
      el.appendChild(progressBar);
    }

    // Close button
    if (opts.closable !== false) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "toast-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close notification");
      closeBtn.style.cssText =
        "flex-shrink:0;background:none;border:none;font-size:18px;cursor:pointer;" +
        "color:#9ca3af;padding:0 2px;line-height:1;";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.dismiss();
      });
      el.appendChild(closeBtn);
    }

    // Timer management
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startTime: number | null = null;
    let remainingTime = duration;
    let paused = false;

    function startTimer(): void {
      if (duration <= 0 || destroyed) return;
      stopTimer();
      startTime = Date.now();
      timer = setTimeout(() => instance.dismiss(), remainingTime);
    }

    function stopTimer(): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        if (startTime !== null) {
          remainingTime -= Date.now() - startTime;
          if (remainingTime < 0) remainingTime = 0;
        }
      }
    }

    function resetTimer(): void {
      remainingTime = duration;
      startTimer();
    }

    // Instance
    const instance: ToastInstance = {
      id,
      element: el,
      dismiss() {
        if (!activeToasts.has(id)) return;
        stopTimer();

        // Animate out
        el.style.opacity = "0";
        el.style.transform = `translateX(${position.includes("right") ? (rtl ? "-" : "+") : rtl ? "+" : "-"}40px)`;

        setTimeout(() => {
          el.remove();
          activeToasts.delete(id);
          _repositionRemaining();
          opts.onDismiss?.(id);
          onRemove?.(instance);
        }, exitDuration);
      },
      updateMessage(newMsg: string) {
        if (opts.html) msgEl.innerHTML = newMsg;
        else msgEl.textContent = newMsg;
      },
      resetTimer,
    };

    // Hover pause/resume
    if (opts.pauseOnHover !== false && duration > 0) {
      el.addEventListener("mouseenter", () => {
        paused = true;
        stopTimer();
        if (progressBar) progressBar.style.animationPlayState = "paused";
      });
      el.addEventListener("mouseleave", () => {
        paused = false;
        startTimer();
        if (progressBar) progressBar.style.animationPlayState = "running";
      });
    }

    // Click handler
    el.addEventListener("click", () => opts.onClick?.(id));

    return { el, instance };
  }

  // Reposition remaining toasts after one is removed
  function _repositionRemaining(): void {
    // No-op — flexbox handles stacking automatically
  }

  // Show a toast
  function show(opts: ToastOptions): ToastInstance {
    if (destroyed) throw new Error("ToastManager has been destroyed");

    const container = getContainer();

    // Enforce max visible
    if (maxVisible > 0 && activeToasts.size >= maxVisible) {
      // Dismiss oldest
      const oldest = activeToasts.values().next().value;
      if (oldest) oldest.dismiss();
    }

    const { el, instance } = createToastElement(opts);
    container.appendChild(el);
    activeToasts.set(instance.id, instance);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateX(0)";
      });
    });

    // Start auto-dismiss timer
    const duration = opts.duration ?? defaultDuration;
    if (duration > 0) {
      instance.resetTimer();
    }

    onAdd?.(instance);
    return instance;
  }

  // Dismiss by id
  function dismiss(id: string): void {
    const toast = activeToasts.get(id);
    if (toast) toast.dismiss();
  }

  // Dismiss all
  function dismissAll(): void {
    for (const [, toast] of activeToasts) {
      toast.dismiss();
    }
  }

  // Destroy manager
  function destroy(): void {
    destroyed = true;
    dismissAll();
    containerEl?.remove();
    containerEl = null;
  }

  function getActiveCount(): number { return activeToasts.size; }

  return { show, dismiss, dismissAll, destroy, getActiveCount };
}

// --- Quick Helpers ---

/** Global singleton toast manager (lazy-init) */
let globalToaster: ReturnType<typeof createToastManager> | null = null;

function getGlobalToaster(): ReturnType<typeof createToastManager> {
  if (!globalToaster) {
    globalToaster = createToastManager({ position: "top-right" });
  }
  return globalToaster;
}

/** Show a quick info toast */
export function toast(message: string, options?: Partial<Omit<ToastOptions, "message">>): ToastInstance {
  return getGlobalToaster().show({ ...options, message });
}

/** Success shortcut */
export function toastSuccess(message: string, options?: Partial<Omit<ToastOptions, "message" | "type">>): ToastInstance {
  return toast(message, { ...options, type: "success" });
}

/** Error shortcut */
export function toastError(message: string, options?: Partial<Omit<ToastOptions, "message" | "type">>): ToastInstance {
  return toast(message, { ...options, type: "error", duration: 0 });
}

/** Warning shortcut */
export function toastWarning(message: string, options?: Partial<Omit<ToastOptions, "message" | "type">>): ToastInstance {
  return toast(message, { ...options, type: "warning" });
}

/** Destroy the global toaster */
export function destroyGlobalToaster(): void {
  globalToaster?.destroy();
  globalToaster = null;
}
