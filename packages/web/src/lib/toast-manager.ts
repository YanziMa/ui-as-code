/**
 * Toast Manager: Global notification system with queue management,
 * multiple positions, types (success/error/warning/info), auto-dismiss,
 * progress toasts, action buttons, stacking, animations, and persistence.
 */

// --- Types ---

export type ToastType = "success" | "error" | "warning" | "info" | "loading" | "custom";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface ToastAction {
  label: string;
  onClick: (toast: Toast) => void;
  primary?: boolean;
}

export interface ToastOptions {
  /** Unique ID (auto-generated if not provided) */
  id?: string;
  /** Toast type */
  type?: ToastType;
  /** Title text */
  title?: string;
  /** Message/description */
  message: string;
  /** Duration in ms (0 = persistent, default varies by type) */
  duration?: number;
  /** Position override for this toast */
  position?: ToastPosition;
  /** Action button(s) */
  actions?: ToastAction[];
  /** Show close button? */
  closable?: boolean;
  /** Show progress bar? */
  showProgress?: boolean;
  /** Custom icon (emoji or HTML string) */
  icon?: string;
  /** Custom CSS class */
  className?: string;
  /** Callback when toast is dismissed */
  onDismiss?: (toast: Toast) => void;
  /** Callback when toast action is clicked */
  onAction?: (action: ToastAction, toast: Toast) => void;
  /** Pause auto-dismiss on hover? */
  pauseOnHover?: boolean;
  /** Render custom content instead of built-in layout */
  render?: (toast: Toast) => HTMLElement;
  /** Update existing toast if same ID exists? */
  updateIfExists?: boolean;
}

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
  position: ToastPosition;
  actions: ToastAction[];
  closable: boolean;
  showProgress: boolean;
  icon?: string;
  className?: string;
  element: HTMLElement;
  createdAt: number;
  dismissAt: number | null; // timestamp when it should auto-dismiss
  timer: ReturnType<typeof setTimeout> | null;
  paused: boolean;
  remaining: number; // remaining ms when paused
}

export interface ToastManagerOptions {
  /** Default position for all toasts */
  position?: ToastPosition;
  /** Max visible toasts at once (0 = unlimited) */
  maxVisible?: number;
  /** Default duration by type (ms) */
  durations?: Partial<Record<ToastType, number>>;
  /** Enable queue (show new toasts as old ones dismiss) */
  queueEnabled?: boolean;
  /** Spacing between toasts (px) */
  spacing?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Container z-index */
  zIndex?: number;
  /** Custom container element (default: document.body) */
  parent?: HTMLElement;
  /** RTL support */
  rtl?: boolean;
  /** Global callback on any toast change */
  onChange?: (toasts: Toast[]) => void;
}

export interface ToastManagerInstance {
  /** Show a new toast */
  show: (options: ToastOptions) => Toast;
  /** Success shortcut */
  success: (message: string, title?: string) => Toast;
  /** Error shortcut */
  error: (message: string, title?: string) => Toast;
  /** Warning shortcut */
  warning: (message: string, title?: string) => Toast;
  /** Info shortcut */
  info: (message: string, title?: string) => Toast;
  /** Loading toast (returns updater function) */
  loading: (message: string, title?: string) => { toast: Toast; update: (msg: string) => void; dismiss: () => void };
  /** Dismiss a specific toast */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Get active toasts */
  getToasts: () => Toast[];
  /** Update a toast's options */
  update: (id: string, updates: Partial<ToastOptions>) => void;
  /** Destroy the manager */
  destroy: () => void;
}

// --- Defaults ---

const TYPE_ICONS: Record<ToastType, string> = {
  success: "\u2705",
  error: "\u274C",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
  loading: "",
  custom: "",
};

const TYPE_COLORS: Record<ToastType, { bg: string; border: string; iconBg: string }> = {
  success: { bg: "#f0fdf4", border: "#86efac", iconBg: "#22c55e" },
  error:   { bg: "#fef2f2", border: "#fca5a5", iconBg: "#ef4444" },
  warning: { bg: "#fffbeb", border: "#fde68a", iconBg: "#f59e0b" },
  info:    { bg: "#eff6ff", border: "#93c5fd", iconBg: "#3b82f6" },
  loading: { bg: "#f8fafc", border: "#cbd5e1", iconBg: "#6366f1" },
  custom:  { bg: "#ffffff", border: "#e5e7eb", iconBg: "#6b7280" },
};

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 0, // errors persist
  warning: 5000,
  info: 4000,
  loading: 0, // loading persists until dismissed
  custom: 5000,
};

// --- Main Class ---

export class ToastManagerClass {
  private containers: Map<string, HTMLElement> = new Map();
  private toasts: Map<string, Toast> = new Map();
  private queue: ToastOptions[] = [];
  private opts: Required<ToastManagerOptions>;
  private destroyed = false;

  constructor(options: ToastManagerOptions = {}) {
    this.opts = {
      position: options.position ?? "top-right",
      maxVisible: options.maxVisible ?? 0,
      durations: { ...DEFAULT_DURATIONS, ...options.durations },
      queueEnabled: options.queueEnabled ?? true,
      spacing: options.spacing ?? 10,
      animationDuration: options.animationDuration ?? 250,
      zIndex: options.zIndex ?? 10000,
      parent: options.parent ?? document.body,
      rtl: options.rtl ?? false,
      ...options,
    };
  }

  // --- Public API ---

  show(options: ToastOptions): Toast {
    if (this.destroyed) throw new Error("ToastManager: destroyed");

    const id = options.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const type = options.type ?? "info";
    const position = options.position ?? this.opts.position;
    const duration = options.duration ?? this.opts.durations[type] ?? DEFAULT_DURATIONS[type];

    // Check if updating existing
    if (options.updateIfExists && this.toasts.has(id)) {
      this.update(id, options);
      return this.toasts.get(id)!;
    }

    const toast: Toast = {
      id,
      type,
      title: options.title,
      message: options.message,
      duration,
      position,
      actions: options.actions ?? [],
      closable: options.closable ?? true,
      showProgress: options.showProgress ?? (duration > 0),
      icon: options.icon,
      className: options.className,
      createdAt: Date.now(),
      dismissAt: duration > 0 ? Date.now() + duration : null,
      timer: null,
      paused: false,
      remaining: duration,
      element: document.createElement("div"),
    };

    // Create or get container for this position
    let container = this.containers.get(position);
    if (!container) {
      container = this.createContainer(position);
      this.containers.set(position, container);
    }

    // Build DOM
    this.buildToastElement(toast);

    // Add to container
    container.appendChild(toast.element);

    // Track
    this.toasts.set(id, toast);

    // Start auto-dismiss timer
    if (duration > 0) {
      this.startTimer(toast);
    }

    // Animate in
    requestAnimationFrame(() => {
      toast.element.style.opacity = "1";
      toast.element.style.transform = "translateX(0)";
    });

    // Notify
    this.opts.onChange?.(this.getActiveToasts());

    // Handle max visible
    if (this.opts.maxVisible > 0) {
      const positionToasts = this.getToastsByPosition(position);
      while (positionToasts.length > this.opts.maxVisible) {
        const oldest = positionToasts.shift()!;
        this.dismiss(oldest.id);
      }
    }

    return toast;
  }

  success(message: string, title?: string): Toast {
    return this.show({ type: "success", message, title });
  }

  error(message: string, title?: string): Toast {
    return this.show({ type: "error", message, title });
  }

  warning(message: string, title?: string): Toast {
    return this.show({ type: "warning", message, title });
  }

  info(message: string, title?: string): Toast {
    return this.show({ type: "info", message, title });
  }

  loading(message: string, title?: string): { toast: Toast; update: (msg: string) => void; dismiss: () => void } {
    const toast = this.show({ type: "loading", message, title, closable: true, duration: 0 });
    return {
      toast,
      update: (msg: string) => {
        const msgEl = toast.element.querySelector(".tm-message");
        if (msgEl) msgEl.textContent = msg;
        toast.message = msg;
      },
      dismiss: () => this.dismiss(toast.id),
    };
  }

  dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast || !toast.element.parentNode) return;

    // Clear timer
    if (toast.timer) { clearTimeout(toast.timer); toast.timer = null; }

    // Animate out
    toast.element.style.opacity = "0";
    toast.element.style.transform = this.getExitTransform(toast.position);

    setTimeout(() => {
      toast.element.remove();
      this.toasts.delete(id);
      this.opts.onChange?.(this.getActiveToasts());

      // Process queue
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.show(next);
      }
    }, this.opts.animationDuration);

    toast.onDismiss?.(toast);
  }

  dismissAll(): void {
    for (const [id] of this.toasts) {
      this.dismiss(id);
    }
  }

  getToasts(): Toast[] {
    return Array.from(this.toasts.values());
  }

  update(id: string, updates: Partial<ToastOptions>): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    Object.assign(toast, updates);
    this.buildToastElement(touch);

    // Re-insert into correct container
    const oldParent = toast.element.parentElement;
    if (oldParent) {
      const container = this.containers.get(toast.position) ?? this.createContainer(toast.position);
      container.appendChild(toast.element);
    }

    // Restart timer if duration changed
    if (updates.duration !== undefined && updates.duration > 0) {
      toast.dismissAt = Date.now() + updates.duration;
      if (toast.timer) clearTimeout(toast.timer);
      this.startTimer(toast);
    }

    this.opts.onChange?.(this.getActiveToasts());
  }

  destroy(): void {
    this.destroyed = true;
    this.dismissAll();
    for (const [, container] of this.containers) {
      container.remove();
    }
    this.containers.clear();
  }

  // --- Internal ---

  private createContainer(position: ToastPosition): HTMLElement {
    const container = document.createElement("div");
    container.className = `tm-container tm-${position}`;
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");

    const posStyles: Record<string, string> = {
      "top-right":     "top:16px;right:16px;",
      "top-left":      "top:16px;left:16px;",
      "bottom-right":  "bottom:16px;right:16px;",
      "bottom-left":   "bottom:16px;left:16px;",
      "top-center":    "top:16px;left:50%;transform:translateX(-50%);",
      "bottom-center": "bottom:16px;left:50%;transform:translateX(-50%);",
    };

    container.style.cssText = `
      position:fixed;z-index:${this.opts.zIndex};${posStyles[position]}
      display:flex;flex-direction:column;gap:${this.opts.spacing}px;
      max-width:400px;width:100%;pointer-events:none;font-family:-apple-system,sans-serif;
    `;

    this.opts.parent.appendChild(container);
    return container;
  }

  private buildToastElement(toast: Toast): void {
    const colors = TYPE_COLORS[toast.type];
    const el = toast.element;

    el.className = `tm-toast tm-${toast.type} ${toast.className ?? ""}`;
    el.dataset.toastId = toast.id;
    el.style.cssText = `
      pointer-events:auto;border-radius:10px;padding:14px 16px;display:flex;gap:12px;
      align-items:flex-start;background:${colors.bg};border:1px solid ${colors.border};
      box-shadow:0 4px 16px rgba(0,0,0,0.08);min-width:280px;max-width:100%;
      opacity:0;transform:${this.getEntryTransform(toast.position)};
      transition:opacity ${this.opts.animationDuration}ms ease, transform ${this.opts.animationDuration}ms ease;
    `;

    // Custom render
    if (this.opts.render) {
      const custom = this.opts.render(toast);
      if (custom) { el.innerHTML = ""; el.appendChild(custom); return; }
    }

    // Icon
    const iconWrap = document.createElement("div");
    iconWrap.style.cssText = `flex-shrink:0;width:24px;height:24px;border-radius:50%;
      background:${colors.iconBg};color:#fff;display:flex;align-items:center;
      justify-content:center;font-size:13px;`;

    if (toast.type === "loading") {
      iconWrap.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0110 10"/></svg>`;
    } else {
      iconWrap.textContent = toast.icon ?? TYPE_ICONS[toast.type];
    }
    el.appendChild(iconWrap);

    // Content
    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;";

    if (toast.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "tm-title";
      titleEl.textContent = toast.title;
      titleEl.style.cssText = "font-weight:600;font-size:13px;color:#111827;margin-bottom:2px;";
      content.appendChild(titleEl);
    }

    const msgEl = document.createElement("div");
    msgEl.className = "tm-message";
    msgEl.textContent = toast.message;
    msgEl.style.cssText = "font-size:13px;color:#4b5563;line-height:1.4;";
    content.appendChild(msgEl);

    // Actions
    if (toast.actions.length > 0) {
      const actionsRow = document.createElement("div");
      actionsRow.style.cssText = "display:flex;gap:8px;margin-top:8px;";
      for (const action of toast.actions) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = action.label;
        btn.style.cssText = `
          padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;
          ${action.primary
            ? `background:${colors.iconBg};color:#fff;border:none;`
            : "background:none;color:#555;border:1px solid #d1d5db;"}
          transition:all 0.15s;
        `;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          action.onClick(toast);
          toast.onAction?.(action, toast);
        });
        actionsRow.appendChild(btn);
      }
      content.appendChild(actionsRow);
    }

    // Progress bar
    if (toast.showProgress && toast.duration > 0) {
      const progress = document.createElement("div");
      progress.className = "tm-progress";
      progress.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;background:${colors.iconBg};
        border-radius:0 0 10px 10px;transition:width linear;
      `;
      progress.style.width = "100%";
      el.appendChild(progress);

      // Animate progress bar
      setTimeout(() => {
        progress.style.transitionDuration = `${toast.duration}ms`;
        progress.style.width = "0%";
      }, 50);
    }

    el.appendChild(content);

    // Close button
    if (toast.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.title = "Dismiss";
      closeBtn.style.cssText = `
        flex-shrink:0;background:none;border:none;font-size:16px;color:#9ca3af;
        cursor:pointer;padding:2px;line-height:1;border-radius:4px;transition:all 0.15s;
      `;
      closeBtn.addEventListener("click", (e) => { e.stopPropagation(); this.dismiss(toast.id); });
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#fee2e2"; closeBtn.style.color = "#dc2626"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
      el.appendChild(closeBtn);
    }

    // Hover pause
    if (toast.pauseOnHover !== false && toast.duration > 0) {
      el.addEventListener("mouseenter", () => {
        if (toast.timer) { clearTimeout(toast.timer); toast.timer = null; }
        toast.paused = true;
        toast.remaining = (toast.dismissAt ?? 0) - Date.now();
      });
      el.addEventListener("mouseleave", () => {
        if (toast.paused && toast.remaining > 0) {
          toast.paused = false;
          toast.dismissAt = Date.now() + toast.remaining;
          this.startTimer(toast);
        }
      });
    }
  }

  private startTimer(toast: Toast): void {
    if (toast.duration <= 0) return;
    const remaining = (toast.dismissAt ?? 0) - Date.now();
    if (remaining <= 0) { this.dismiss(toast.id); return; }

    toast.timer = setTimeout(() => {
      this.dismiss(toast.id);
    }, remaining);
  }

  private getEntryTransform(pos: ToastPosition): string {
    if (pos.includes("right")) return "translateX(100%)";
    if (pos.includes("left")) return "translateX(-100%)";
    return "translateY(-20px)";
  }

  private getExitTransform(pos: ToastPosition): string {
    if (pos.includes("right")) return "translateX(120%)";
    if (pos.includes("left")) return "translateX(-120%)";
    return "translateY(-20px) scale(0.95)";
  }

  private getToastsByPosition(position: ToastPosition): Toast[] {
    return Array.from(this.toasts.values()).filter((t) => t.position === position);
  }

  private getActiveToasts(): Toast[] {
    return Array.from(this.toasts.values()).filter((t) => t.element.parentNode !== null);
  }
}

/** Convenience: create a global toast manager singleton */
let globalToastManager: ToastManagerInstance | null = null;

export function createToastManager(options?: ToastManagerOptions): ToastManagerInstance {
  return new ToastManagerClass(options);
}

export function getToastManager(options?: ToastManagerOptions): ToastManagerInstance {
  if (!globalToastManager) globalToastManager = createToastManager(options);
  return globalToastManager;
}
