/**
 * Toast Notification System: Queue-based toast notifications with positions,
 * types (success/error/warning/info/loading), auto-dismiss, stacking animation,
 * progress bar, action buttons, and promise-based updates.
 */

// --- Types ---

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface ToastOptions {
  /** Toast message (HTML supported) */
  message: string;
  /** Type/variant */
  type?: ToastType;
  /** Title/heading */
  title?: string;
  /** Duration in ms (0 = persistent) */
  duration?: number;
  /** Position */
  position?: ToastPosition;
  /** Dismissible with close button? */
  dismissible?: boolean;
  /** Action button label */
  actionLabel?: string;
  /** Action callback */
  onAction?: () => void;
  /** Show progress bar for auto-dismiss */
  showProgress?: boolean;
  /** Custom icon (emoji or SVG) */
  icon?: string;
  /** Pause auto-dismiss on hover */
  pauseOnHover?: boolean;
  /** Callback on dismiss */
  onDismiss?: (id: string) => void;
  /** Callback on show complete */
  onShow?: (id: string) => void;
  /** Unique ID (auto-generated if not provided) */
  id?: string;
}

export interface ToastInstance {
  /** The toast DOM element */
  element: HTMLDivElement;
  /** Toast unique ID */
  id: string;
  /** Dismiss the toast */
  dismiss: () => void;
  /** Update message content */
  update: (options: Partial<Pick<ToastOptions, "message" | "title" | "type" | "icon">>) => void;
  /** Resolve a loading toast to another type */
  resolve: (type: ToastType, message?: string) => void;
}

export interface ToastManagerConfig {
  /** Default position for all toasts */
  position?: ToastPosition;
  /** Max visible toasts at once */
  maxVisible?: number;
  /** Default duration (ms) */
  defaultDuration?: number;
  /** Spacing between toasts (px) */
  gap?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Container element (default: creates fixed container) */
  container?: HTMLElement;
  /** RTL layout */
  rtl?: boolean;
}

// --- Config per Type ---

const TYPE_CONFIG: Record<ToastType, {
  icon: string; bg: string; border: string; textColor: string; progressColor: string;
}> = {
  success: { icon: "\u2713", bg: "#f0fdf4", border: "#86efac", textColor: "#166534", progressColor: "#22c55e" },
  error:   { icon: "\u2716", bg: "#fef2f2", border: "#fca5a5", textColor: "#991b1b", progressColor: "#ef4444" },
  warning: { icon: "\u26A0\uFE0F", bg: "#fffbeb", border: "#fcd34d", textColor: "#92400e", progressColor: "#f59e0b" },
  info:    { icon: "\u2139\uFE0F", bg: "#eff6ff", border: "#93c5fd", textColor: "#1e40af", progressColor: "#3b82f6" },
  loading: { icon: "", bg: "#f9fafb", border: "#d1d5db", textColor: "#374151", progressColor: "#6366f1" },
};

// --- Counter for IDs ---

let globalIdCounter = 0;

// --- Main Class ---

export class ToastManager {
  private config: Required<ToastManagerConfig>;
  private containers: Map<string, HTMLElement> = new Map();
  private activeToasts: Map<string, ToastInstance> = new Map();
  private queue: ToastOptions[] = [];
  private destroyed = false;

  constructor(config: ToastManagerConfig = {}) {
    this.config = {
      position: config.position ?? "top-right",
      maxVisible: config.maxVisible ?? 5,
      defaultDuration: config.defaultDuration ?? 4000,
      gap: config.gap ?? 10,
      animationDuration: config.animationDuration ?? 300,
      container: config.container ?? this.createDefaultContainer(),
      rtl: config.rtl ?? false,
    };
  }

  private createDefaultContainer(): HTMLElement {
    const el = document.createElement("div");
    el.id = "toast-container";
    document.body.appendChild(el);
    return el;
  }

  private getOrCreateContainer(position: ToastPosition): HTMLElement {
    const key = position;
    if (this.containers.has(key)) return this.containers.get(key)!;

    const container = document.createElement("div");
    container.className = `toast-container toast-${position}`;
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");

    const posStyles: Record<string, string> = {
      "top-right":     "position:fixed;top:16px;right:16px;display:flex;flex-direction:column-reverse;gap:" + this.config.gap + "px;z-index:11000;max-width:380px;width:100%;",
      "top-left":      "position:fixed;top:16px;left:16px;display:flex;flex-direction:column-reverse;gap:" + this.config.gap + "px;z-index:11000;max-width:380px;width:100%;",
      "bottom-right":  "position:fixed;bottom:16px;right:16px;display:flex;flex-direction:column;gap:" + this.config.gap + "px;z-index:11000;max-width:380px;width:100%;",
      "bottom-left":   "position:fixed;bottom:16px;left:16px;display:flex;flex-direction:column;gap:" + this.config.gap + "px;z-index:11000;max-width:380px;width:100%;",
      "top-center":    "position:fixed;top:16px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column-reverse;gap:" + this.config.gap + "px;z-index:11000;max-width:420px;width:100%;",
      "bottom-center": "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:" + this.config.gap + "px;z-index:11000;max-width:420px;width:100%;",
    };
    container.style.cssText = posStyles[position] ?? posStyles["top-right"]!;

    (this.config.container || document.body).appendChild(container);
    this.containers.set(key, container);
    return container;
  }

  /** Show a toast notification */
  show(options: ToastOptions): ToastInstance {
    if (this.destroyed) throw new Error("ToastManager: manager has been destroyed");

    const id = options.id ?? `toast-${++globalIdCounter}`;
    const position = options.position ?? this.config.position;
    const duration = options.duration ?? this.config.defaultDuration;
    const type = options.type ?? "info";
    const config = TYPE_CONFIG[type];

    // Check capacity
    const positionToasts = Array.from(this.activeToasts.values())
      .filter((t) => (t.element.closest(".toast-container") as HTMLElement)?.className.includes(position));

    if (positionToasts.length >= this.config.maxVisible) {
      // Queue it
      this.queue.push({ ...options, id });
      return {
        element: null! as unknown as HTMLDivElement,
        id,
        dismiss() {},
        update() {},
        resolve() {},
      } as ToastInstance;
    }

    // Create toast element
    const container = this.getOrCreateContainer(position);
    const toastEl = document.createElement("div");
    toastEl.className = `toast toast-${type}`;
    toastEl.dataset.toastId = id;
    toastEl.style.cssText = `
      display:flex;align-items:flex-start;gap:10px;padding:12px 14px;
      background:${config.bg};border:1px solid ${config.border};
      border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.08),0 2px 6px rgba(0,0,0,0.04);
      font-size:13px;color:${config.textColor};
      font-family:-apple-system,sans-serif;line-height:1.45;
      cursor:default;overflow:hidden;position:relative;
      opacity:0;transform:translateY(${position.includes("top") ? "-12" : "12"}px)
        scale(0.97);transition:opacity ${this.config.animationDuration}ms ease,
        transform ${this.config.animationDuration}ms ease;
      min-height:48px;
    `;

    // Icon
    const iconEl = document.createElement("span");
    iconEl.className = "toast-icon";
    iconEl.style.cssText = `flex-shrink:0;font-size:15px;line-height:1;`;
    if (type === "loading") {
      iconEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="${config.progressColor}" stroke-width="2" stroke-dasharray="30 10" class="toast-spinner"/></svg>`;
      iconEl.querySelector(".toast-spinner")!.style.cssText = "animation:spin 0.8s linear infinite;";
      // Add spinner keyframes
      if (!document.getElementById("toast-styles")) {
        const style = document.createElement("style");
        style.id = "toast-styles";
        style.textContent = "@keyframes spin{to{transform:rotate(360deg);}}";
        document.head.appendChild(style);
      }
    } else {
      iconEl.textContent = options.icon ?? config.icon;
    }
    toastEl.appendChild(iconEl);

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
    msgEl.style.cssText = "word-wrap:break-word;";
    msgEl.innerHTML = options.message;
    contentEl.appendChild(msgEl);

    // Action button
    if (options.actionLabel) {
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.textContent = options.actionLabel;
      actionBtn.style.cssText = `
        margin-top:6px;padding:3px 12px;border-radius:4px;font-size:11px;
        font-weight:500;background:${config.progressColor};color:#fff;
        border:none;cursor:pointer;transition:opacity 0.15s;
      `;
      actionBtn.addEventListener("click", () => {
        options.onAction?.();
      });
      contentEl.appendChild(actionBtn);
    }

    toastEl.appendChild(contentEl);

    // Close button
    let closeBtn: HTMLButtonElement | null = null;
    if (options.dismissible !== false && type !== "loading") {
      closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Dismiss notification");
      closeBtn.style.cssText = `
        flex-shrink:0;background:none;border:none;font-size:16px;line-height:1;
        cursor:pointer;color:${config.textColor};opacity:0.5;padding:0 2px;
        transition:opacity 0.15s;margin-left:4px;
      `;
      closeBtn.addEventListener("click", () => instance.dismiss());
      closeBtn.addEventListener("mouseenter", () => { closeBtn!.style.opacity = "1"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn!.style.opacity = "0.5"; });
      toastEl.appendChild(closeBtn);
    }

    // Progress bar
    let progressBar: HTMLDivElement | null = null;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    let startTime = 0;
    let animFrame: number | null = null;

    function startTimer(): void {
      if (duration <= 0 || type === "loading") return;
      startTime = Date.now();

      if (progressBar && options.showProgress !== false) {
        function tick(): void {
          if (instance.destroyed) return;
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 1 - elapsed / duration);
          progressBar!.style.transform = `scaleX(${remaining})`;
          if (remaining > 0) {
            animFrame = requestAnimationFrame(tick);
          }
        }
        tick();
      }

      dismissTimer = setTimeout(() => instance.dismiss(), duration);
    }

    function stopTimer(): void {
      if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    }

    if (duration > 0 && type !== "loading") {
      progressBar = document.createElement("div");
      progressBar.className = "toast-progress";
      progressBar.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;background:${config.progressColor};
        width:100%;transform-origin:left;
      `;
      toastEl.appendChild(progressBar);
    }

    // Pause on hover
    if (options.pauseOnHover !== false && duration > 0) {
      toastEl.addEventListener("mouseenter", stopTimer);
      toastEl.addEventListener("mouseleave", startTimer);
    }

    container.appendChild(toastEl);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toastEl.style.opacity = "1";
        toastEl.style.transform = "translateY(0) scale(1)";
        setTimeout(() => options.onShow?.(id), this.config.animationDuration);
      });
    });

    // Build instance
    const instance: ToastInstance = {
      element: toastEl,
      id,

      dismiss() {
        if ((instance as any).destroyed) return;
        (instance as any).destroyed = true;
        stopTimer();
        toastEl.style.opacity = "0";
        toastEl.style.transform = `translateY(${position.includes("top") ? "-12" : "12"}px) scale(0.97)`;
        setTimeout(() => {
          toastEl.remove();
          this.activeToasts.delete(id);
          options.onDismiss?.(id);
          // Process queue
          this.processQueue();
        }, this.config.animationDuration);
      },

      update(updates) {
        if (updates.message) msgEl.innerHTML = updates.message;
        if (updates.title) {
          const tEl = contentEl.querySelector(".toast-title");
          if (updates.title && !tEl) {
            const nt = document.createElement("div");
            nt.className = "toast-title";
            nt.style.cssText = "font-weight:600;font-size:13px;margin-bottom:2px;";
            nt.textContent = updates.title;
            contentEl.insertBefore(nt, msgEl);
          } else if (tEl && updates.title !== undefined) {
            tEl.textContent = updates.title;
          } else if (tEl && updates.title === undefined) {
            // keep existing
          }
        }
        if (updates.type) {
          const nc = TYPE_CONFIG[updates.type];
          toastEl.style.background = nc.bg;
          toastEl.style.borderColor = nc.border;
          toastEl.style.color = nc.textColor;
          iconEl.textContent = updates.icon ?? nc.icon;
          if (progressBar) progressBar.style.background = nc.progressColor;
          toastEl.classList.remove(`toast-${type}`);
          toastEl.classList.add(`toast-${updates.type}`);
        }
        if (updates.icon) {
          iconEl.textContent = updates.icon;
        }
      },

      resolve(newType: ToastType, message?: string) {
        instance.update({ type: newType, ...(message ? { message } : {}) });
        if (newType !== "loading" && duration > 0) {
          startTimer();
        }
      },
    };

    this.activeToasts.set(id, instance);
    startTimer();

    return instance;
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;
    const next = this.queue.shift();
    if (next) this.show(next);
  }

  /** Convenience: quick success toast */
  success(message: string, title?: string): ToastInstance {
    return this.show({ message, type: "success", title });
  }

  /** Convenience: quick error toast */
  error(message: string, title?: string): ToastInstance {
    return this.show({ message, type: "error", title, duration: 6000 });
  }

  /** Convenience: quick warning toast */
  warning(message: string, title?: string): ToastInstance {
    return this.show({ message, type: "warning", title });
  }

  /** Convenience: quick info toast */
  info(message: string, title?: string): ToastInstance {
    return this.show({ message, type: "info", title });
  }

  /** Convenience: loading toast (returns instance for later resolution) */
  loading(message: string, title?: string): ToastInstance {
    return this.show({ message, type: "loading", title, duration: 0, dismissible: false });
  }

  /** Dismiss all active toasts */
  dismissAll(): void {
    for (const [, toast] of this.activeToasts) {
      toast.dismiss();
    }
    this.queue = [];
  }

  /** Destroy the manager and clean up */
  destroy(): void {
    this.destroyed = true;
    this.dismissAll();
    for (const [, container] of this.containers) {
      container.remove();
    }
    this.containers.clear();
  }
}

/** Global singleton toast manager */
let globalToastManager: ToastManager | null = null;

/** Get or create the global toast manager */
export function getToastManager(config?: ToastManagerConfig): ToastManager {
  if (!globalToastManager) {
    globalToastManager = new ToastManager(config);
  }
  return globalToastManager;
}

/** Show a toast using the global manager */
export function showToast(options: ToastOptions): ToastInstance {
  return getToastManager().show(options);
}
