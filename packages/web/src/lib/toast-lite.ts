/**
 * Lightweight Toast: Simple, non-blocking notification messages with
 * auto-dismiss, progress bar, queue management, positioning,
 * animations, action buttons, and type variants (success/error/warning/info/loading).
 */

// --- Types ---

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition = "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "bottom-center";

export interface ToastOptions {
  /** Message text (primary content) */
  message: string;
  /** Type/style variant */
  type?: ToastType;
  /** Title text */
  title?: string;
  /** Duration in ms (0 = persistent) */
  duration?: number;
  /** Position on screen */
  position?: ToastPosition;
  /** Show close button? */
  closable?: boolean;
  /** Show progress bar for auto-dismiss timing */
  showProgress?: boolean;
  /** Action button label + callback */
  action?: { label: string; onClick: () => void };
  /** Custom icon (emoji or HTML string) */
  icon?: string;
  /** Custom CSS class for the toast element */
  className?: string;
  /** Z-index for container */
  zIndex?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Callback when toast shows */
  onShow?: (id: string) => void;
  /** Callback when toast hides */
  onHide?: (id: string) => void;
}

export interface ToastInstance {
  id: string;
  element: HTMLElement;
  close: () => void;
  update: (opts: Partial<Pick<ToastOptions, "message" | "title" | "type" | "duration">>) => void;
}

// --- Defaults ---

const DEFAULTS = {
  duration: 4000,
  position: "top-right" as ToastPosition,
  closable: true,
  showProgress: true,
  animationDuration: 300,
  zIndex: 11000,
};

// --- Icon Map ---

const TYPE_ICONS: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2717",
  warning: "\u26A0",
  info: "\u2139",
  loading: "...",
};

const TYPE_COLORS: Record<ToastType, { bg: string; border: string; iconBg: string }> = {
  success: { bg: "#f0fdf4", border: "#86efac", iconBg: "#22c55e" },
  error:   { bg: "#fef2f2", border: "#fca5a5", iconBg: "#ef4444" },
  warning: { bg: "#fffbeb", border: "#fcd34d", iconBg: "#f59e0b" },
  info:    { bg: "#eff6ff", border: "#93c5fd", iconBg: "#3b82f6" },
  loading: { bg: "#f8fafc", border: "#cbd5e1", iconBg: "#64748b" },
};

// --- Container Management ---

const containers = new Map<string, HTMLDivElement>();

function getContainer(position: ToastPosition, zIndex: number): HTMLDivElement {
  const key = `${position}-${zIndex}`;
  if (containers.has(key)) return containers.get(key)!;

  const container = document.createElement("div");
  container.className = `toast-container toast-${position}`;
  container.setAttribute("aria-live", "polite");
  container.setAttribute("role", "region");

  // Position styles
  const posStyles: Record<string, string> = {
    "top-right":     "position:fixed;top:16px;right:16px;display:flex;flex-direction:column-reverse;gap:8px;z-index:" + zIndex + ";max-width:380px;width:100%;pointer-events:none;",
    "top-left":      "position:fixed;top:16px;left:16px;display:flex;flex-direction:column-reverse;gap:8px;z-index:" + zIndex + ";max-width:380px;width:100%;pointer-events:none;",
    "top-center":   "position:fixed;top:16px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column-reverse;gap:8px;z-index:" + zIndex + ";max-width:420px;width:100%;pointer-events:none;",
    "bottom-right":  "position:fixed;bottom:16px;right:16px;display:flex;flex-direction:column;gap:8px;z-index:" + zIndex + ";max-width:380px;width:100%;pointer-events:none;",
    "bottom-left":   "position:fixed;bottom:16px;left:16px;display:flex;flex-direction:column;gap:8px;z-index:" + zIndex + ";max-width:380px;width:100%;pointer-events:none;",
    "bottom-center": "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;z-index:" + zIndex + ";max-width:420px;width:100%;pointer-events:none;",
  };

  container.style.cssText = posStyles[position] ?? posStyles["top-right"]!;
  document.body.appendChild(container);
  containers.set(key, container);

  return container;
}

// --- Main Factory ---

let counter = 0;

export function createToast(options: ToastOptions): ToastInstance {
  const opts = { ...DEFAULTS, ...options };
  const id = `toast-${++counter}-${Date.now()}`;
  const colors = TYPE_COLORS[opts.type ?? "info"];

  // Create toast element
  const el = document.createElement("div");
  el.className = `toast toast-${opts.type} ${opts.className ?? ""}`;
  el.setAttribute("role", "status");
  el.style.cssText = `
    pointer-events:auto;background:${colors.bg};border:1px solid ${colors.border};
    border-radius:10px;padding:12px 16px;font-family:-apple-system,sans-serif;
    font-size:13px;color:#1e293b;line-height:1.4;box-shadow:
      0 4px 16px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);
    display:flex;align-items:flex-start;gap:10px;min-width:280px;max-width:100%;
    opacity:0;transform:translateY(-8px) scale(0.97);
    transition:opacity ${opts.animationDuration}ms ease,
      transform ${opts.animationDuration}ms ease;
    overflow:hidden;position:relative;
  `;

  // Icon
  const iconEl = document.createElement("span");
  iconEl.className = "toast-icon";
  iconEl.style.cssText = `
    flex-shrink:0;width:22px;height:22px;border-radius:50%;
    background:${colors.iconBg};color:#fff;display:flex;
    align-items:center;justify-content:center;font-size:11px;
    font-weight:bold;margin-top:1px;
  `;
  iconEl.textContent = opts.icon ?? TYPE_ICONS[opts.type ?? "info"];
  el.appendChild(iconEl);

  // Content area
  const content = document.createElement("div");
  content.className = "toast-content";
  content.style.cssText = "flex:1;min-width:0;";

  if (opts.title) {
    const titleEl = document.createElement("div");
    titleEl.className = "toast-title";
    titleEl.style.cssText = "font-weight:600;font-size:13px;margin-bottom:2px;";
    titleEl.textContent = opts.title;
    content.appendChild(titleEl);
  }

  const msgEl = document.createElement("div");
  msgEl.className = "toast-message";
  msgEl.textContent = opts.message;
  if (!opts.title) msgEl.style.fontWeight = "500";
  content.appendChild(msgEl);
  el.appendChild(content);

  // Action button
  if (opts.action) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.style.cssText = `
      flex-shrink:0;padding:4px 12px;border-radius:6px;border:1px solid #d1d5db;
      background:#fff;font-size:12px;font-weight:500;cursor:pointer;
      color:#374151;transition:all 0.15s;font-family:-apple-system,sans-serif;
    `;
    actionBtn.textContent = opts.action.label;
    actionBtn.addEventListener("click", () => opts.action!.onClick());
    el.appendChild(actionBtn);
  }

  // Close button
  let closeBtn: HTMLButtonElement | null = null;
  if (opts.closable && opts.type !== "loading") {
    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toast-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = `
      flex-shrink:0;background:none;border:none;cursor:pointer;
      font-size:16px;line-height:1;color:#94a3b8;padding:0 4px;
      transition:color 0.15s;
    `;
    closeBtn.addEventListener("mouseenter", () => { closeBtn!.style.color = "#475569"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn!.style.color = "#94a3b8"; });
    closeBtn.addEventListener("click", () => instance.close());
    el.appendChild(closeBtn);
  }

  // Progress bar
  let progressBar: HTMLDivElement | null = null;
  let progressTimer: ReturnType<typeof setTimeout> | null = null;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  if (opts.showProgress && opts.duration! > 0 && opts.type !== "loading") {
    progressBar = document.createElement("div");
    progressBar.className = "toast-progress";
    progressBar.style.cssText = `
      position:absolute;bottom:0;left:0;height:3px;
      background:${colors.iconBg};border-radius:0 0 10px 10px;
      transition:width linear;width:100%;
    `;
    el.appendChild(progressBar);
  }

  // Add to container
  const container = getContainer(opts.position!, opts.zIndex!);
  container.appendChild(el);

  // State
  let dismissed = false;

  function animateIn(): void {
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0) scale(1)";
    });
    opts.onShow?.(id);
  }

  function animateOut(callback: () => void): void {
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px) scale(0.97)";
    setTimeout(() => {
      el.remove();
      // Remove empty container
      if (container.children.length === 0) {
        container.remove();
        containers.delete(`${opts.position}-${opts.zIndex}`);
      }
      callback();
    }, opts.animationDuration);
  }

  function startProgress(): void {
    if (!progressBar || opts.duration! <= 0) return;
    progressBar.style.transitionDuration = `${opts.duration}ms`;
    requestAnimationFrame(() => {
      progressBar!.style.width = "0%";
    });
  }

  function scheduleDismiss(): void {
    if (opts.duration! <= 0 || dismissed) return;
    dismissTimer = setTimeout(() => {
      doClose();
    }, opts.duration);
  }

  function doClose(): void {
    if (dismissed) return;
    dismissed = true;
    if (dismissTimer) clearTimeout(dismissTimer);
    if (progressTimer) clearTimeout(progressTimer);
    opts.onHide?.(id);
    animateOut(() => {});
  }

  // Pause on hover
  el.addEventListener("mouseenter", () => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    if (progressBar) {
      progressBar.style.transitionDuration = "0s";
      progressBar.style.width = progressBar.offsetWidth + "px";
    }
  });

  el.addEventListener("mouseleave", () => {
    scheduleDismiss();
    if (progressBar) startProgress();
  });

  // Show
  animateIn();
  startProgress();
  scheduleDismiss();

  // Instance
  const instance: ToastInstance = {
    id,
    element: el,

    close() { doClose(); },

    update(updates) {
      if (updates.message) msgEl.textContent = updates.message;
      if (updates.title) {
        if (!titleEl) {
          titleEl = document.createElement("div");
          titleEl.className = "toast-title";
          titleEl.style.cssText = "font-weight:600;font-size:13px;margin-bottom:2px;";
          content.insertBefore(titleEl, msgEl);
        }
        titleEl.textContent = updates.title;
      }
      if (updates.type) {
        const newColors = TYPE_COLORS[updates.type];
        el.style.background = newColors.bg;
        el.style.borderColor = newColors.border;
        iconEl.style.background = newColors.iconBg;
        iconEl.textContent = TYPE_ICONS[updates.type];
        if (progressBar) progressBar.style.background = newColors.iconBg;
      }
      if (updates.duration !== undefined && !dismissed) {
        if (dismissTimer) clearTimeout(dismissTimer);
        if (updates.duration > 0) scheduleDismiss();
      }
    },
  };

  return instance;
}

// --- Quick Helpers ---

/** Show a success toast */
export function showToast(message: string, options?: Partial<Omit<ToastOptions, "message">>): ToastInstance {
  return createToast({ ...options, message, type: options?.type ?? "success" });
}

/** Shorthand for each type */
export function toastSuccess(message: string, title?: string): ToastInstance {
  return createToast({ message, title, type: "success" });
}

export function toastError(message: string, title?: string): ToastInstance {
  return createToast({ message, title, type: "error" });
}

export function toastWarning(message: string, title?: string): ToastInstance {
  return createToast({ message, title, type: "warning" });
}

export function toastInfo(message: string, title?: string): ToastInstance {
  return createToast({ message, title, type: "info" });
}

export function toastLoading(message: string, title?: string): ToastInstance {
  return createToast({ message, title, type: "loading", duration: 0, closable: false });
}
