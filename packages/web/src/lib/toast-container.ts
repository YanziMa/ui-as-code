/**
 * Toast Container / Notification Stack: Managed toast notification system with
 * positioning (top-right/bottom-right/etc), auto-dismiss, progress bar timer,
 * action buttons, rich content, stacking animations, and queue management.
 */

// --- Types ---

export type ToastType = "info" | "success" | "warning" | "error" | "loading";
export type ToastPosition = "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "bottom-center";
export type ToastVariant = "solid" | "soft" | "outline";

export interface ToastMessage {
  /** Unique ID (auto-generated if omitted) */
  id?: string;
  /** Toast type */
  type?: ToastType;
  /** Title text */
  title?: string;
  /** Description/body text */
  description?: string;
  /** Duration in ms (0 = persistent, default: 5000) */
  duration?: number;
  /** Show close button */
  closable?: boolean;
  /** Action button label and callback */
  action?: { label: string; onClick: () => void };
  /** Custom icon (SVG string or emoji) */
  icon?: string;
  /** Custom CSS class for this toast */
  className?: string;
  /** Whether to show a progress bar timer */
  showProgress?: boolean;
  /** Pause on hover */
  pauseOnHover?: boolean;
}

export interface ToastContainerOptions {
  /** Container element or selector (if null, creates a fixed portal) */
  container?: HTMLElement | string | null;
  /** Position of the toast stack */
  position?: ToastPosition;
  /** Maximum visible toasts at once */
  maxToasts?: number;
  /** Gap between toasts (px) */
  gap?: number;
  /** Visual variant */
  variant?: ToastVariant;
  /** Default auto-dismiss duration (ms) */
  defaultDuration?: number;
  /** Enable enter/exit animations */
  animated?: boolean;
  /** Callback when a toast is dismissed */
  onDismiss?: (toastId: string, reason: "timeout" | "close" | "action") => void;
  /** Callback when queue advances (waiting toast shown) */
  onQueueAdvance?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ToastInstance {
  element: HTMLElement;
  /** Show a new toast, returns its ID */
  show: (message: ToastMessage) => string;
  /** Dismiss a specific toast by ID */
  dismiss: (id: string, reason?: "timeout" | "close" | "action") => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Update an existing toast's content */
  update: (id: string, updates: Partial<ToastMessage>) => void;
  /** Get current active toast count */
  getCount: () => number;
  /** Destroy the container */
  destroy: () => void;
}

// --- Config ---

const TYPE_CONFIG: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "\u2139\uFE0F" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "\u2705" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "\u26A0\uFE0F" },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "\u274C" },
  loading: { bg: "#f5f3ff", border: "#ddd6fe", color: "#5b21b6", icon: "\u23F3" },
};

const POSITION_STYLES: Record<ToastPosition, string> = {
  "top-right":     "top:16px;right:16px;",
  "top-left":      "top:16px;left:16px;",
  "top-center":    "top:16px;left:50%;transform:translateX(-50%);",
  "bottom-right":  "bottom:16px;right:16px;",
  "bottom-left":   "bottom:16px;left:16px;",
  "bottom-center": "bottom:16px;left:50%;transform:translateX(-50%);",
};

let globalIdCounter = 0;

// --- Main Class ---

export class ToastContainerManager {
  create(options: ToastContainerOptions = {}): ToastInstance {
    const opts = {
      container: options.container ?? null,
      position: options.position ?? "top-right",
      maxToasts: options.maxToasts ?? 5,
      gap: options.gap ?? 12,
      variant: options.variant ?? "soft",
      defaultDuration: options.defaultDuration ?? 5000,
      animated: options.animated ?? true,
      ...options,
    };

    // Create or use existing container
    let containerEl: HTMLElement;
    if (opts.container === null || opts.container === undefined) {
      // Portal mode: create fixed container
      containerEl = document.createElement("div");
      containerEl.id = "toast-portal";
      document.body.appendChild(containerEl);
    } else {
      containerEl = typeof opts.container === "string"
        ? document.querySelector<HTMLElement>(opts.container)!
        : opts.container;
      if (!containerEl) throw new Error("ToastContainer: container element not found");
    }

    containerEl.className = `toast-container ${opts.className ?? ""}`;
    containerEl.style.cssText = `
      position:${opts.container ? "relative" : "fixed"};z-index:99999;
      display:flex;flex-direction:column;${POSITION_STYLES[opts.position]}
      pointer-events:none;max-width:400px;width:100%;
    `;

    // State
    const activeToasts = new Map<string, {
      el: HTMLElement;
      timer: ReturnType<typeof setTimeout> | null;
      startTime: number;
      remaining: number;
      paused: boolean;
      message: ToastMessage;
    }>();
    const queue: ToastMessage[] = [];
    let destroyed = false;

    function generateId(): string {
      return `toast-${Date.now()}-${++globalIdCounter}`;
    }

    function show(message: ToastMessage): string {
      if (destroyed) return "";
      const id = message.id ?? generateId();
      const msg = { ...message, id };

      // If at capacity, queue it
      if (activeToasts.size >= opts.maxToasts) {
        queue.push(msg);
        return id;
      }

      renderToast(msg);
      return id;
    }

    function renderToast(msg: ToastMessage): void {
      const id = msg.id!;
      const type = msg.type ?? "info";
      const config = TYPE_CONFIG[type];
      const duration = msg.duration ?? opts.defaultDuration;

      const toastEl = document.createElement("div");
      toastEl.className = `toast toast-${type} toast-${opts.variant}`;
      toastEl.dataset.toastId = id;
      toastEl.style.cssText = `
        display:flex;gap:10px;align-items:flex-start;padding:14px 16px;
        min-width:280px;max-width:100%;
        background:${config.bg};border:1px solid ${config.border};
        border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.08);
        font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;color:#374151;
        pointer-events:auto;overflow:hidden;position:relative;
        animation:toast-enter 0.3s ease both;
      `;

      // Icon
      const iconEl = document.createElement("span");
      iconEl.className = "toast-icon";
      iconEl.textContent = msg.icon ?? config.icon;
      iconEl.style.cssText = "flex-shrink:0;font-size:16px;line-height:1.2;margin-top:1px;";
      toastEl.appendChild(iconEl);

      // Content area
      const contentEl = document.createElement("div");
      contentEl.className = "toast-content";
      contentEl.style.cssText = "flex:1;min-width:0;";

      // Title
      if (msg.title) {
        const titleEl = document.createElement("div");
        titleEl.className = "toast-title";
        titleEl.textContent = msg.title;
        titleEl.style.cssText = "font-weight:600;color:#111827;font-size:13px;line-height:1.3;";
        contentEl.appendChild(titleEl);
      }

      // Description
      if (msg.description) {
        const descEl = document.createElement("div");
        descEl.className = "toast-description";
        descEl.textContent = msg.description;
        descEl.style.cssText = "color:#6b7280;font-size:12px;line-height:1.4;margin-top:2px;";
        contentEl.appendChild(descEl);
      }

      // Action button
      if (msg.action) {
        const actionBtn = document.createElement("button");
        actionBtn.type = "button";
        actionBtn.textContent = msg.action.label;
        actionBtn.style.cssText = `
          margin-top:8px;padding:4px 12px;border-radius:6px;font-size:11px;
          font-weight:500;background:#4338ca;color:#fff;border:none;cursor:pointer;
          transition:background 0.15s;
        `;
        actionBtn.addEventListener("click", () => {
          msg.action!.onClick();
          dismiss(id, "action");
        });
        actionBtn.addEventListener("mouseenter", () => { actionBtn.style.background = "#3730a3"; });
        actionBtn.addEventListener("mouseleave", () => { actionBtn.style.background = "#4338ca"; });
        contentEl.appendChild(actionBtn);
      }

      toastEl.appendChild(contentEl);

      // Close button
      if (msg.closable !== false && type !== "loading") {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.innerHTML = "&times;";
        closeBtn.className = "toast-close";
        closeBtn.setAttribute("aria-label", "Dismiss notification");
        closeBtn.style.cssText = `
          flex-shrink:0;background:none;border:none;font-size:18px;line-height:1;
          color:#9ca3af;cursor:pointer;padding:0 2px;border-radius:3px;
        `;
        closeBtn.addEventListener("click", () => dismiss(id, "close"));
        closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#374151"; closeBtn.style.background = "rgba(0,0,0,0.05)"; });
        closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "#9ca3af"; closeBtn.style.background = ""; });
        toastEl.appendChild(closeBtn);
      }

      // Progress bar
      let progressBar: HTMLElement | null = null;
      if (duration > 0 && (msg.showProgress !== false)) {
        progressBar = document.createElement("div");
        progressBar.className = "toast-progress";
        progressBar.style.cssText = `
          position:absolute;bottom:0;left:0;height:3px;background:${config.color};
          border-radius:0 0 10px 10px;transition:width linear;
        `;
        toastEl.appendChild(progressBar);
      }

      // Insert into container (newest at top for top positions, bottom for bottom positions)
      const isTopPosition = opts.position.startsWith("top");
      if (isTopPosition) {
        containerEl.prepend(toastEl);
      } else {
        containerEl.appendChild(toastEl);
      }

      // Track state
      const state = {
        el: toastEl,
        timer: null as ReturnType<typeof setTimeout> | null,
        startTime: Date.now(),
        remaining: duration,
        paused: false,
        message: msg,
      };
      activeToasts.set(id, state);

      // Start auto-dismiss timer
      if (duration > 0) {
        state.timer = setTimeout(() => dismiss(id, "timeout"), duration);
        updateProgressBar(progressBar, duration, duration);
      }

      // Pause on hover
      if (msg.pauseOnHover !== false && duration > 0) {
        toastEl.addEventListener("mouseenter", () => {
          if (!state.paused) {
            state.paused = true;
            state.remaining -= Date.now() - state.startTime;
            clearTimeout(state.timer!);
            state.timer = null;
          }
        });

        toastEl.addEventListener("mouseleave", () => {
          if (state.paused && !destroyed) {
            state.paused = false;
            state.startTime = Date.now();
            if (state.remaining > 0) {
              state.timer = setTimeout(() => dismiss(id, "timeout"), state.remaining);
              updateProgressBar(progressBar, state.remaining, duration);
            }
          }
        });
      }
    }

    function updateProgressBar(bar: HTMLElement | null, remaining: number, total: number): void {
      if (!bar) return;
      const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
      bar.style.width = `${pct}%`;
    }

    function dismiss(id: string, reason: "timeout" | "close" | "action" = "close"): void {
      const state = activeToasts.get(id);
      if (!state) return;

      clearTimeout(state.timer!);
      activeToasts.delete(id);

      // Exit animation
      state.el.style.animation = "toast-exit 0.25s ease both forwards";
      setTimeout(() => {
        state.el.remove();
        opts.onDismiss?.(id, reason);

        // Advance queue
        if (queue.length > 0 && activeToasts.size < opts.maxToasts) {
          const next = queue.shift()!;
          renderToast(next);
          opts.onQueueAdvance?.();
        }
      }, 250);
    }

    function update(id: string, updates: Partial<ToastMessage>): void {
      const state = activeToasts.get(id);
      if (!state) return;

      Object.assign(state.message, updates);
      // Re-render by removing old and creating new
      const oldEl = state.el;
      const newMsg = { ...state.message };
      dismiss(id); // This will also advance queue logic
      show(newMsg); // Re-add
    }

    // Inject animation keyframes
    if (!document.getElementById("toast-styles")) {
      const style = document.createElement("style");
      style.id = "toast-styles";
      style.textContent = `
        @keyframes toast-enter {
          from { opacity:0; transform:${opts.position.includes("right") ? "translateX(100%)" : opts.position.includes("left") ? "translateX(-100%)" : "translateY(-20px)"}; }
          to { opacity:1; transform:none; }
        }
        @keyframes toast-exit {
          from { opacity:1; transform:none; }
          to { opacity:0; transform:${opts.position.includes("right") ? "translateX(100%)" : opts.position.includes("left") ? "translateX(-100%)" : "translateY(-20px)" scale(0.95)}; }
        }
      `;
      document.head.appendChild(style);
    }

    const instance: ToastInstance = {
      element: containerEl,

      show,

      dismiss(id: string, reason?: "timeout" | "close" | "action") {
        dismiss(id, reason);
      },

      dismissAll() {
        for (const [id] of activeToasts) {
          dismiss(id);
        }
        queue.length = 0;
      },

      update,

      getCount() { return activeToasts.size; },

      destroy() {
        destroyed = true;
        for (const [, state] of activeToasts) {
          clearTimeout(state.timer!);
          state.el.remove();
        }
        activeToasts.clear();
        queue.length = 0;
        if (opts.container === null || opts.container === undefined) {
          containerEl.remove();
        } else {
          containerEl.innerHTML = "";
        }
      },
    };

    return instance;
  }
}

/** Convenience: create a toast container */
export function createToastContainer(options?: ToastContainerOptions): ToastInstance {
  return new ToastContainerManager().create(options);
}
