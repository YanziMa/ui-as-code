/**
 * Notification Toast System: Multi-position toast notifications with types (success/error/warning/info),
 * auto-dismiss, progress bar, stacking, queue management, keyboard dismiss, animations,
 * custom actions, and accessibility.
 */

// --- Types ---

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition = "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "bottom-center";

export interface ToastAction {
  label: string;
  onClick: () => void;
  /** Primary action style? */
  primary?: boolean;
}

export interface ToastOptions {
  /** Message text or HTML */
  message: string;
  /** Type of toast */
  type?: ToastType;
  /** Duration in ms (0 = persistent) */
  duration?: number;
  /** Position override for this toast */
  position?: ToastPosition;
  /** Title/heading */
  title?: string;
  /** Custom icon (emoji or SVG) */
  icon?: string;
  /** Action buttons */
  actions?: ToastAction[];
  /** Show close button */
  closable?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Callback on dismiss */
  onDismiss?: () => void;
  /** Callback on click */
  onClick?: () => void;
  /** Unique ID (auto-generated if omitted) */
  id?: string;
}

export interface ToastInstance {
  id: string;
  element: HTMLElement;
  close: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
}

export interface ToastManagerOptions {
  /** Maximum toasts visible at once (default: 5) */
  maxVisible?: number;
  /** Default position */
  defaultPosition?: ToastPosition;
  /** Default duration in ms (default: 4000) */
  defaultDuration?: number;
  /** Spacing between toasts (px) */
  gap?: number;
  /** Enable keyboard dismiss (Escape) */
  keyboardDismiss?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** RTL support */
  rtl?: boolean;
  /** Custom CSS class for container */
  className?: string;
  /** Container element (auto-created if omitted) */
  container?: HTMLElement;
}

// --- Config ---

const TYPE_CONFIG: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: { icon: "\u2713", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  error:   { icon: "\u2717", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  warning: { icon: "!", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  info:    { icon: "i", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  loading: { icon: "\u21BB", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
};

const POSITION_STYLES: Record<ToastPosition, string> = {
  "top-right":    "top:16px;right:16px;flex-direction:column;",
  "top-left":     "top:16px;left:16px;flex-direction:column;",
  "top-center":   "top:16px;left:50%;transform:translateX(-50%);flex-direction:column;",
  "bottom-right": "bottom:16px;right:16px;flex-direction:column-reverse;",
  "bottom-left":  "bottom:16px;left:16px;flex-direction:column-reverse;",
  "bottom-center":"bottom:16px;left:50%;transform:translateX(-50%);flex-direction:column-reverse;",
};

// --- Main Class ---

export class ToastManager {
  private container: HTMLElement;
  private toasts: Map<string, ToastInstance> = new Map();
  private options: Required<Omit<ToastManagerOptions, "container">>;
  private idCounter = 0;

  constructor(options: ToastManagerOptions = {}) {
    this.options = {
      maxVisible: options.maxVisible ?? 5,
      defaultPosition: options.defaultPosition ?? "top-right",
      defaultDuration: options.defaultDuration ?? 4000,
      gap: options.gap ?? 10,
      keyboardDismiss: options.keyboardDismiss ?? true,
      animationDuration: options.animationDuration ?? 300,
      rtl: options.rtl ?? false,
      className: options.className ?? "",
    };

    // Create or use provided container
    this.container = options.container ?? document.createElement("div");
    this.container.className = `toast-container ${this.options.className}`;
    this.container.setAttribute("role", "region");
    this.container.setAttribute("aria-label", "Notifications");
    this.container.setAttribute("aria-live", "polite");
    this.container.style.cssText = `
      position:fixed;z-index:9999;display:flex;gap:${this.options.gap}px;
      pointer-events:none;max-width:400px;width:100%;
      ${POSITION_STYLES[this.options.defaultPosition]}
    `;

    if (!options.container) {
      document.body.appendChild(this.container);
    }

    // Keyboard dismiss
    if (this.options.keyboardDismiss) {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.dismissAll();
      });
    }
  }

  /** Show a toast notification */
  show(options: ToastOptions): ToastInstance {
    const id = options.id ?? `toast-${++this.idCounter}`;
    const type = options.type ?? "info";
    const duration = options.duration ?? this.options.defaultDuration;
    const config = TYPE_CONFIG[type];

    // Check if already exists
    if (this.toasts.has(id)) {
      this.toasts.get(id)?.close();
    }

    // Enforce max visible
    while (this.toasts.size >= this.options.maxVisible) {
      const firstId = Array.from(this.toasts.keys())[0];
      this.toasts.get(firstId)?.close();
    }

    // Create toast element
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.id = id;
    el.setAttribute("role", "alert");
    el.dataset.toastId = id;

    el.style.cssText = `
      display:flex;align-items:flex-start;gap:10px;padding:14px 16px;
      background:${config.bg};border:1px solid ${config.border};
      border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.12);
      min-width:280px;max-width:100%;pointer-events:auto;
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.4;
      animation:toast-in ${this.options.animationDuration}ms ease forwards;
      transform-origin:${this.isBottom() ? "bottom" : "top"};
    `;

    // Add keyframe styles if not present
    this.ensureKeyframes();

    // Icon
    const iconEl = document.createElement("span");
    iconEl.className = "toast-icon";
    iconEl.textContent = options.icon ?? config.icon;
    iconEl.style.cssText = `
      flex-shrink:0;display:flex;align-items:center;justify-content:center;
      width:22px;height:22px;border-radius:50%;background:${config.color}15;
      color:${config.color};font-size:12px;font-weight:700;text-align:center;
    `;
    el.appendChild(iconEl);

    // Content
    const contentEl = document.createElement("div");
    contentEl.className = "toast-content";
    contentEl.style.cssText = "flex:1;min-width:0;";

    if (options.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "toast-title";
      titleEl.style.cssText = "font-weight:600;font-size:13px;margin-bottom:2px;";
      titleEl.textContent = options.title;
      contentEl.appendChild(titleEl);
    }

    const msgEl = document.createElement("div");
    msgEl.className = "toast-message";
    msgEl.innerHTML = options.message;
    contentEl.appendChild(msgEl);
    el.appendChild(contentEl);

    // Actions
    if (options.actions && options.actions.length > 0) {
      const actionsEl = document.createElement("div");
      actionsEl.className = "toast-actions";
      actionsEl.style.cssText = "display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;";

      for (const action of options.actions) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = action.label;
        btn.style.cssText = `
          padding:3px 10px;border-radius:6px;font-size:11px;font-weight:500;
          border:1px solid ${action.primary ? config.color : "#d1d5db"};
          background:${action.primary ? config.color : "transparent"};
          color:${action.primary ? "#fff" : "#374151"};cursor:pointer;
          transition:all 0.15s;
        `;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          action.onClick();
        });
        actionsEl.appendChild(btn);
      }

      contentEl.appendChild(actionsEl);
    }

    // Progress bar
    let progressBar: HTMLDivElement | null = null;
    let timerStart = Date.now();
    let remainingTime = duration;
    let timerPaused = false;
    let timerHandle: ReturnType<typeof setTimeout> | null = null;

    if (duration > 0 && (options.showProgress !== false)) {
      progressBar = document.createElement("div");
      progressBar.className = "toast-progress";
      progressBar.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;background:${config.color};
        border-radius:0 0 10px 10px;transition:width linear;
        width:100%;
      `;
      el.style.position = "relative";
      el.appendChild(progressBar);
    }

    // Close button
    if (options.closable !== false) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Dismiss notification");
      closeBtn.style.cssText = `
        flex-shrink:0;background:none;border:none;font-size:16px;color:#9ca3af;
        cursor:pointer;padding:0 2px;line-height:1;transition:color 0.15s;
      `;
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.close();
      });
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#374151"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "#9ca3af"; });
      el.appendChild(closeBtn);
    }

    // Click handler
    if (options.onClick) {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => options.onClick?.());
    }

    // Pause on hover
    el.addEventListener("mouseenter", () => instance.pauseTimer());
    el.addEventListener("mouseleave", () => instance.resumeTimer());

    // Append to container
    this.container.appendChild(el);

    // Auto-dismiss timer
    function startTimer(): void {
      if (timerHandle) clearTimeout(timerHandle);
      if (remainingTime > 0) {
        timerHandle = setTimeout(() => instance.close(), remainingTime);
      }
    }

    function updateProgress(): void {
      if (!progressBar || duration <= 0) return;
      const elapsed = Date.now() - timerStart;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      progressBar.style.width = `${pct}%`;
      if (pct > 0) requestAnimationFrame(updateProgress);
    }

    // Instance
    const instance: ToastInstance = {
      id,
      element: el,

      close() {
        if (timerHandle) clearTimeout(timerHandle);
        this.toasts.delete(id);
        el.style.animation = `toast-out ${this.options.animationDuration}ms ease forwards`;
        setTimeout(() => {
          el.remove();
          options.onDismiss?.();
        }, this.options.animationDuration);
      },

      pauseTimer() {
        if (timerPaused || duration <= 0) return;
        timerPaused = true;
        if (timerHandle) {
          clearTimeout(timerHandle);
          timerHandle = null;
        }
        remainingTime -= Date.now() - timerStart;
      },

      resumeTimer() {
        if (!timerPaused || duration <= 0) return;
        timerPaused = false;
        timerStart = Date.now();
        startTimer();
        if (progressBar) requestAnimationFrame(updateProgress);
      },
    };

    // Bind methods
    instance.close = instance.close.bind(this);
    instance.pauseTimer = instance.pauseTimer.bind(this);
    instance.resumeTimer = instance.resumeTimer.bind(this);

    this.toasts.set(id, instance);

    // Start timer and progress
    timerStart = Date.now();
    startTimer();
    if (progressBar) requestAnimationFrame(updateProgress);

    return instance;
  }

  /** Convenience: success toast */
  success(message: string, options?: Partial<ToastOptions>): ToastInstance {
    return this.show({ ...options, message, type: "success" });
  }

  /** Convenience: error toast */
  error(message: string, options?: Partial<ToastOptions>): ToastInstance {
    return this.show({ ...options, message, type: "error" });
  }

  /** Convenience: warning toast */
  warning(message: string, options?: Partial<ToastOptions>): ToastInstance {
    return this.show({ ...options, message, type: "warning" });
  }

  /** Convenience: info toast */
  info(message: string, options?: Partial<ToastOptions>): ToastInstance {
    return this.show({ ...options, message, type: "info" });
  }

  /** Convenience: loading toast */
  loading(message: string, options?: Partial<ToastOptions>): ToastInstance {
    return this.show({ ...options, message, type: "loading", duration: 0, closable: false });
  }

  /** Dismiss a specific toast by ID */
  dismiss(id: string): void {
    this.toasts.get(id)?.close();
  }

  /** Dismiss all toasts */
  dismissAll(): void {
    for (const [, inst] of this.toasts) inst.close();
  }

  /** Get active toast count */
  getCount(): number {
    return this.toasts.size;
  }

  /** Destroy the manager and clean up */
  destroy(): void {
    this.dismissAll();
    this.container.remove();
    this.toasts.clear();
  }

  // --- Internal ---

  private isBottom(): boolean {
    return this.options.defaultPosition.startsWith("bottom");
  }

  private ensureKeyframes(): void {
    if (document.getElementById("toast-keyframes")) return;
    const style = document.createElement("style");
    style.id = "toast-keyframes";
    style.textContent = `
      @keyframes toast-in {
        from { opacity: 0; transform: ${this.isBottom() ? "translateY(20px)" : "translateY(-20px)"} scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes toast-out {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to   { opacity: 0; transform: ${this.isBottom() ? "translateY(20px)" : "translateY(-20px)"} scale(0.95); }
      }
    `;
    document.head.appendChild(style);
  }
}

// --- Singleton ---

let defaultManager: ToastManager | null = null;

/** Get or create the global toast manager */
export function getToastManager(options?: ToastManagerOptions): ToastManager {
  if (!defaultManager) defaultManager = new ToastManager(options);
  return defaultManager;
}

/** Show a toast using the default manager */
export function showToast(options: ToastOptions): ToastInstance {
  return getToastManager().show(options);
}

/** Quick success toast */
export function toastSuccess(message: string): ToastInstance {
  return getToastManager().success(message);
}

/** Quick error toast */
export function toastError(message: string): ToastInstance {
  return getToastManager().error(message);
}

/** Quick warning toast */
export function toastWarning(message: string): ToastInstance {
  return getToastManager().warning(message);
}

/** Quick info toast */
export function toastInfo(message: string): ToastInstance {
  return getToastManager().info(message);
}
