/**
 * Toast Stack: Advanced toast notification stack with queue management,
 * positioning variants, stacking animations, max visible limit,
 * pause on hover, progress bars, grouped toasts, and swipe-to-dismiss.
 */

// --- Types ---

export type ToastType = "info" | "success" | "warning" | "error" | "loading" | "default";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
}

export interface ToastOptions {
  /** Unique ID (auto-generated if not provided) */
  id?: string;
  /** Toast type/variant */
  type?: ToastType;
  /** Title text */
  title?: string;
  /** Body message */
  message: string;
  /** Duration in ms (0 = persistent) */
  duration?: number;
  /** Show close button? */
  dismissible?: boolean;
  /** Action buttons */
  actions?: ToastAction[];
  /** Custom icon (emoji or HTML string) */
  icon?: string;
  /** Show progress bar for timed toasts? */
  showProgress?: boolean;
  /** Callback on dismiss */
  onDismiss?: () => void;
  /** Callback on click */
  onClick?: () => void;
  /** Pause auto-dismiss on hover? */
  pauseOnHover?: boolean;
  /** Group key (toasts with same key stack together) */
  groupKey?: string;
  /** Custom CSS class */
  className?: string;
}

export interface ToastStackOptions {
  /** Container element or selector (uses document.body if omitted) */
  container?: HTMLElement | string;
  /** Default position */
  position?: ToastPosition;
  /** Max visible toasts at once (0 = unlimited) */
  maxVisible?: number;
  /** Max total in queue before dropping oldest */
  maxQueueSize?: number;
  /** Spacing between toasts (px) */
  spacing?: number;
  /** Default duration (ms) */
  defaultDuration?: number;
  /** Pause all toasts on hover of any toast? */
  globalPauseOnHover?: boolean;
  /** Enable swipe-to-dismiss on touch devices */
  swipeToDismiss?: boolean;
  /** Show enter animation? */
  animated?: boolean;
  /** RTL layout support */
  rtl?: boolean;
  /** Callback when any toast is added */
  onAdd?: (toast: InternalToast) => void;
  /** Callback when stack changes (empty/full) */
  onStackChange?: (count: number) => void;
  /** Custom renderer (override default rendering) */
  renderToast?: (toast: InternalToast, el: HTMLElement) => void;
}

export interface InternalToast extends Required<ToastOptions> {
  id: string;
  createdAt: number;
  element: HTMLElement | null;
  timer: ReturnType<typeof setTimeout> | null;
  paused: boolean;
  remaining: number;
  startTime: number;
}

export interface ToastStackInstance {
  element: HTMLElement;
  /** Show a new toast */
  push: (options: ToastOptions) => string; // returns toast ID
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Pause all timers */
  pauseAll: () => void;
  /** Resume all timers */
  resumeAll: () => void;
  /** Get active toast count */
  getCount: () => number;
  /** Update a toast's content */
  update: (id: string, updates: Partial<ToastOptions>) => void;
  /** Destroy the stack */
  destroy: () => void;
}

// --- Config ---

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; color: string; iconBg: string; iconColor: string }> = {
  default: { bg: "#fff", border: "#e5e7eb", color: "#374151", iconBg: "#f3f4f6", iconColor: "#6b7280" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", iconBg: "#dbeafe", iconColor: "#2563eb" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", iconBg: "#dcfce7", iconColor: "#16a34a" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", iconBg: "#fef3c7", iconColor: "#d97706" },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", iconBg: "#fee2e2", iconColor: "#dc2626" },
  loading: { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", iconBg: "#dbeafe", iconColor: "#2563eb" },
};

const TYPE_ICONS: Record<string, string> = {
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 011.71 3h16.94a2 2 0 011.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  loading: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"><animate attributeName="stroke-dashoffset" values="0;32" dur="1s" repeatCount="indefinite"/></circle></svg>`,
};

function generateId(): string {
  return `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Main Class ---

export class ToastStackManager {
  create(options: ToastStackOptions = {}): ToastStackInstance {
    const opts = {
      position: options.position ?? "top-right",
      maxVisible: options.maxVisible ?? 5,
      maxQueueSize: options.maxQueueSize ?? 20,
      spacing: options.spacing ?? 10,
      defaultDuration: options.defaultDuration ?? 4000,
      globalPauseOnHover: options.globalPauseOnHover ?? true,
      swipeToDismiss: options.swipeToDismiss ?? true,
      animated: options.animated ?? true,
      rtl: options.rtl ?? false,
      ...options,
    };

    // Create or find container
    let container: HTMLElement;
    if (options.container) {
      container = typeof options.container === "string"
        ? document.querySelector<HTMLElement>(options.container)!
        : options.container;
    } else {
      container = document.createElement("div");
      container.id = "toast-stack-container";
      document.body.appendChild(container);
    }

    container.className = `toast-stack ts-${opts.position} ${options.className ?? ""}`;
    container.style.cssText = `
      position:fixed;z-index:99999;display:flex;flex-direction:column;
      ${getPositionStyles(opts.position)}gap:${opts.spacing}px;pointer-events:none;
      font-family:-apple-system,sans-serif;max-width:380px;width:auto;
      padding:${opts.position.includes("right") ? "16px 0 16px 16px" : opts.position.includes("left") ? "16px 16px 16px 0" : "16px"};
    `;

    const toasts: InternalToast[] = [];
    let destroyed = false;

    function getPositionStyles(pos: ToastPosition): string {
      switch (pos) {
        case "top-right": return "top:16px;right:16px;";
        case "top-left": return "top:16px;left:16px;";
        case "bottom-right": return "bottom:16px;right:16px;";
        case "bottom-left": return "bottom:16px;left:16px;";
        case "top-center": return "top:16px;left:50%;transform:translateX(-50%);";
        case "bottom-center": return "bottom:16px;left:50%;transform:translateX(-50%);";
      }
    }

    function createToastElement(toast: InternalToast): HTMLElement {
      const ts = TYPE_STYLES[toast.type];
      const el = document.createElement("div");
      el.dataset.toastId = toast.id;
      el.style.cssText = `
        pointer-events:auto;background:${ts.bg};border:1px solid ${ts.border};
        border-radius:10px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);
        display:flex;align-items:flex-start;gap:12px;min-width:280px;max-width:420px;
        color:${ts.color};font-size:13px;line-height:1.5;overflow:hidden;
        ${opts.animated ? "animation:ts-slide-in 0.3s ease-out;" : ""}
      `;

      // Icon
      if (toast.icon || toast.type !== "default") {
        const iconWrap = document.createElement("div");
        iconWrap.style.cssText = `flex-shrink:0;width:28px;height:28px;border-radius:50%;background:${ts.iconBg};display:flex;align-items:center;justify-content:center;color:${ts.iconColor};`;
        iconWrap.innerHTML = toast.icon ?? TYPE_ICONS[toast.type] ?? "";
        el.appendChild(iconWrap);
      }

      // Content
      const content = document.createElement("div");
      content.style.cssText = "flex:1;min-width:0;";

      if (toast.title) {
        const titleEl = document.createElement("div");
        titleEl.style.cssText = "font-weight:600;font-size:13px;margin-bottom:2px;";
        titleEl.textContent = toast.title;
        content.appendChild(titleEl);
      }

      const msgEl = document.createElement("div");
      msgEl.textContent = toast.message;
      msgEl.style.cssText = "word-break:break-word;";
      content.appendChild(msgEl);

      // Actions
      if (toast.actions?.length) {
        const actionsRow = document.createElement("div");
        actionsRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
        for (const action of toast.actions!) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = action.label;
          btn.style.cssText = action.variant === "primary"
            ? "padding:4px 12px;border-radius:6px;background:#4338ca;color:#fff;border:none;font-size:12px;font-weight:500;cursor:pointer;"
            : "padding:4px 12px;border-radius:6px;background:transparent;color:#374151;border:1px solid #d1d5db;font-size:12px;cursor:pointer;";
          btn.addEventListener("click", (e) => { e.stopPropagation(); action.onClick(); });
          actionsRow.appendChild(btn);
        }
        content.appendChild(actionsRow);
      }

      el.appendChild(content);

      // Dismiss button
      if (toast.dismissible && toast.type !== "loading") {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.innerHTML = "&times;";
        closeBtn.setAttribute("aria-label", "Dismiss");
        closeBtn.style.cssText = "flex-shrink:0;background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:0 2px;line-height:1;";
        closeBtn.addEventListener("click", (e) => { e.stopPropagation(); instance.dismiss(toast.id); });
        el.appendChild(closeBtn);
      }

      // Progress bar
      let progressBar: HTMLElement | null = null;
      if (toast.duration > 0 && toast.showProgress !== false) {
        progressBar = document.createElement("div");
        progressBar.style.cssText = "position:absolute;bottom:0;left:0;height:3px;background:#4338ca;border-radius:0 0 10px 10px;transition:width linear;width:100%;";
        el.style.position = "relative";
        el.appendChild(progressBar);
      }

      // Events
      el.addEventListener("click", () => toast.onClick?.());

      if (toast.pauseOnHover ?? opts.globalPauseOnHover) {
        el.addEventListener("mouseenter", () => pauseToast(toast));
        el.addEventListener("mouseleave", () => resumeToast(toast));
      }

      // Swipe to dismiss (touch)
      if (opts.swipeToDismiss && "ontouchstart" in window) {
        let startX = 0;
        let startY = 0;
        el.addEventListener("touchstart", (e: TouchEvent) => {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }, { passive: true });
        el.addEventListener("touchmove", (e: TouchEvent) => {
          const dx = e.touches[0].clientX - startX;
          if (Math.abs(dx) > 20) {
            el.style.transform = `translateX(${dx > 0 ? dx : dx}px)`;
            el.style.opacity = String(1 - Math.abs(dx) / 150);
          }
        }, { passive: true });
        el.addEventListener("touchend", (e: TouchEvent) => {
          const dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) > 60) { instance.dismiss(toast.id); }
          else { el.style.transform = ""; el.style.opacity = ""; }
        }, { passive: true });
      }

      toast.element = el;
      return el;
    }

    function startTimer(toast: InternalToast): void {
      if (toast.duration <= 0 || toast.type === "loading") return;

      toast.startTime = Date.now();
      toast.remaining = toast.duration;
      toast.timer = setTimeout(() => instance.dismiss(toast.id), toast.duration);

      // Animate progress bar
      const progressBar = toast.element?.querySelector("[style*='position:absolute']");
      if (progressBar) {
        requestAnimationFrame(() => {
          if (progressBar) {
            progressBar.style.transitionDuration = `${toast.duration}ms`;
            progressBar.style.width = "0%";
          }
        });
      }
    }

    function pauseToast(toast: InternalToast): void {
      if (!toast.timer || toast.paused) return;
      clearTimeout(toast.timer);
      toast.timer = null;
      toast.paused = true;
      toast.remaining -= Date.now() - toast.startTime;
    }

    function resumeToast(toast: InternalToast): void {
      if (!toast.paused || toast.type === "loading") return;
      toast.paused = false;
      toast.startTime = Date.now();
      toast.timer = setTimeout(() => instance.dismiss(toast.id), toast.remaining);
    }

    function render(): void {
      // Remove elements for removed toasts
      for (const t of toasts) {
        if (!t.element || !t.element.isConnected) continue;
        if (!toasts.includes(t)) { t.element.remove(); t.element = null; }
      }

      // Add DOM elements for toasts that don't have one yet
      for (const t of toasts) {
        if (!t.element) {
          const el = createToastElement(t);
          container.appendChild(el);
          startTimer(t);
          opts.onAdd?.(t);
        }
      }

      // Enforce max visible
      if (opts.maxVisible > 0 && toasts.length > opts.maxVisible) {
        const overflow = toasts.slice(opts.maxVisible);
        for (const t of overflow) {
          if (t.timer) clearTimeout(t.timer);
          t.timer = null;
          if (t.element) {
            t.element.style.animation = "ts-slide-out 0.2s ease-in forwards";
            setTimeout(() => { t.element?.remove(); t.element = null; }, 200);
          }
        }
      }

      opts.onStackChange?.(toasts.length);
    }

    // Inject keyframes
    if (!document.getElementById("toast-stack-styles")) {
      const s = document.createElement("style");
      s.id = "toast-stack-styles";
      s.textContent = `
        @keyframes ts-slide-in{from{transform:translateY(-12px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes ts-slide-out{from{opacity:1}to{opacity:0;transform:translateY(-8px)}}
      `;
      document.head.appendChild(s);
    }

    const instance: ToastStackInstance = {
      element: container,

      push(options: ToastOptions): string {
        if (destroyed) return "";

        // Enforce queue limit
        while (toasts.length >= opts.maxQueueSize) {
          const oldest = toasts.shift();
          if (oldest?.timer) clearTimeout(oldest.timer);
          if (oldest?.element) oldest.element.remove();
        }

        const toast: InternalToast = {
          id: options.id ?? generateId(),
          type: options.type ?? "default",
          title: options.title ?? "",
          message: options.message,
          duration: options.duration ?? opts.defaultDuration,
          dismissible: options.dismissible ?? true,
          showProgress: options.showProgress ?? true,
          pauseOnHover: options.pauseOnHover ?? true,
          actions: options.actions,
          icon: options.icon,
          onDismiss: options.onDismiss,
          onClick: options.onClick,
          groupKey: options.groupKey,
          className: options.className ?? "",
          createdAt: Date.now(),
          element: null,
          timer: null,
          paused: false,
          remaining: options.duration ?? opts.defaultDuration,
          startTime: Date.now(),
        };

        toasts.push(toast);
        render();
        return toast.id;
      },

      dismiss(id: string) {
        const idx = toasts.findIndex((t) => t.id === id);
        if (idx < 0) return;
        const [toast] = toasts.splice(idx, 1)!;
        if (toast.timer) clearTimeout(toast.timer);
        if (toast.element) {
          toast.element.style.animation = "ts-slide-out 0.2s ease-in forwards";
          setTimeout(() => { toast.element?.remove(); }, 200);
        }
        toast.onDismiss?.();
        render();
      },

      dismissAll() {
        for (const t of toasts) {
          if (t.timer) clearTimeout(t.timer);
          if (t.element) t.element.remove();
        }
        toasts.length = 0;
        opts.onStackChange?.(0);
      },

      pauseAll() { for (const t of toasts) pauseToast(t); },
      resumeAll() { for (const t of toasts) resumeToast(t); },

      getCount() { return toasts.length; },

      update(id: string, updates: Partial<ToastOptions>) {
        const toast = toasts.find((t) => t.id === id);
        if (toast) Object.assign(toast, updates);
        // Re-render if visible
        if (toast?.element) {
          toast.element.remove();
          toast.element = null;
          render();
        }
      },

      destroy() {
        destroyed = true;
        instance.dismissAll();
        container.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a toast stack */
export function createToastStack(options?: ToastStackOptions): ToastStackInstance {
  return new ToastStackManager().create(options);
}
