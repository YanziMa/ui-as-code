/**
 * Toast Notification System: Stacking toast notifications with positions,
 * types (success/error/warning/info), auto-dismiss, progress bar,
 * actions, queue management, and animations.
 */

// --- Types ---

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface ToastOptions {
  /** Notification message */
  message: string;
  /** Type/styling */
  type?: ToastType;
  /** Duration in ms (0 = persistent, default: 4000) */
  duration?: number;
  /** Show close button? */
  closable?: boolean;
  /** Action button label */
  actionLabel?: string;
  /** Action callback */
  onAction?: () => void;
  /** Custom icon (emoji or HTML) */
  icon?: string;
  /** Title/heading */
  title?: string;
  /** Unique ID (auto-generated if omitted) */
  id?: string;
  /** Custom CSS class */
  className?: string;
}

export interface ToastManagerOptions {
  /** Container element (default: document.body) */
  container?: HTMLElement;
  /** Default position */
  position?: ToastPosition;
  /** Max visible toasts at once */
  maxVisible?: number;
  /** Spacing between toasts (px) */
  gap?: number;
  /** Default duration for auto-dismiss */
  defaultDuration?: number;
  /** Enable rich HTML in messages? */
  allowHtml?: boolean;
  /** Show progress bar? */
  showProgress?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Callback when toast closes */
  onClose?: (id: string) => void;
  /** Custom CSS class for container */
  className?: string;
}

export interface ToastInstance {
  /** Show a toast notification */
  show: (options: ToastOptions) => string;
  /** Success shorthand */
  success: (message: string, title?: string) => string;
  /** Error shorthand */
  error: (message: string, title?: string) => string;
  /** Warning shorthand */
  warning: (message: string, title?: string) => string;
  /** Info shorthand */
  info: (message: string, title?: string) => string;
  /** Loading shorthand */
  loading: (message: string, title?: string) => string;
  /** Dismiss a specific toast */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Destroy the manager */
  destroy: () => void;
}

// --- Type Config ---

const TYPE_STYLES: Record<ToastType, { bg: string; color: string; border: string; icon: string }> = {
  success: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", icon: "\u2705" },
  error:   { bg: "#fef2f2", color: "#991b1b", border: "#fecaca", icon: "\u{1F6AB}" },
  warning: { bg: "#fffbeb", color: "#92400e", border: "#fde68a", icon: "\u26A0\uFE0F" },
  info:    { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", icon: "\u2139\uFE0F" },
  loading: { bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe", icon: "\u23F3" },
};

const POSITION_STYLES: Record<ToastPosition, string> = {
  "top-right":    "top:16px;right:16px;",
  "top-left":     "top:16px;left:16px;",
  "bottom-right": "bottom:16px;right:16px;",
  "bottom-left":  "bottom:16px;left:16px;",
  "top-center":   "top:16px;left:50%;transform:translateX(-50%);",
  "bottom-center":"bottom:16px;left:50%;transform:translateX(-50%);",
};

// --- Main Factory ---

export function createToastManager(options: ToastManagerOptions = {}): ToastInstance {
  const opts = {
    container: options.container ?? document.body,
    position: options.position ?? "top-right",
    maxVisible: options.maxVisible ?? 5,
    gap: options.gap ?? 10,
    defaultDuration: options.defaultDuration ?? 4000,
    allowHtml: options.allowHtml ?? false,
    showProgress: options.showProgress ?? true,
    animationDuration: options.animationDuration ?? 250,
    className: options.className ?? "",
    ...options,
  };

  // Container
  const container = document.createElement("div");
  container.className = `toast-container ${opts.className}`;
  container.style.cssText = `
    position:fixed;z-index:99999;display:flex;flex-direction:column;gap:${opts.gap}px;
    ${POSITION_STYLES[opts.position]}
    pointer-events:none;max-width:380px;width:100%;
  `;
  opts.container.appendChild(container);

  let counter = 0;
  const activeToasts = new Map<string, { el: HTMLElement; timer: ReturnType<typeof setTimeout> }>();
  let destroyed = false;

  function generateId(): string {
    return `toast-${Date.now()}-${++counter}`;
  }

  function show(options: ToastOptions): string {
    if (destroyed) return "";
    const id = options.id ?? generateId();
    const type = options.type ?? "info";
    const ts = TYPE_STYLES[type];
    const duration = options.duration ?? (type === "loading" ? 0 : opts.defaultDuration);

    // Enforce max visible
    if (activeToasts.size >= opts.maxVisible) {
      const firstKey = activeToasts.keys().next().value;
      if (firstKey) dismiss(firstKey);
    }

    // Create toast element
    const el = document.createElement("div");
    el.className = `toast toast-${type} ${options.className ?? ""}`;
    el.dataset.toastId = id;
    el.style.cssText = `
      display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:10px;
      background:${ts.bg};border:1px solid ${ts.border};
      box-shadow:0 4px 16px rgba(0,0,0,0.08);pointer-events:auto;
      transform:translateX(100%);opacity:0;transition:all ${opts.animationDuration}ms ease;
      min-width:280px;max-width:100%;
    `;

    // Icon
    const iconEl = document.createElement("span");
    iconEl.textContent = options.icon ?? ts.icon;
    iconEl.style.cssText = "font-size:16px;flex-shrink:0;line-height:1.4;margin-top:1px;";
    el.appendChild(iconEl);

    // Content
    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;";

    if (options.title) {
      const titleEl = document.createElement("div");
      titleEl.style.cssText = `font-weight:600;font-size:13px;color:${ts.color};margin-bottom:2px;`;
      titleEl.textContent = options.title;
      content.appendChild(titleEl);
    }

    const msgEl = document.createElement("div");
    msgEl.style.cssText = `font-size:13px;color:#374151;line-height:1.4;word-break:break-word;`;
    if (opts.allowHtml && options.message) {
      msgEl.innerHTML = options.message;
    } else {
      msgEl.textContent = options.message;
    }
    content.appendChild(msgEl);
    el.appendChild(content);

    // Actions row
    const actionsRow = document.createElement("div");
    actionsRow.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:auto;";

    // Action button
    if (options.actionLabel && options.onAction) {
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.textContent = options.actionLabel;
      actionBtn.style.cssText = `
        padding:4px 12px;border-radius:6px;font-size:11px;font-weight:500;
        border:1px solid ${ts.border};background:#fff;color:${ts.color};cursor:pointer;
        transition:background 0.15s;
      `;
      actionBtn.addEventListener("click", () => {
        options.onAction!();
        dismiss(id);
      });
      actionBtn.addEventListener("mouseenter", () => { actionBtn.style.background = ts.bg; });
      actionBtn.addEventListener("mouseleave", () => { actionBtn.style.background = ""; });
      actionsRow.appendChild(actionBtn);
    }

    // Close button
    const closable = options.closable !== false && duration > 0 && type !== "loading";
    if (closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.title = "Dismiss";
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:14px;color:#9ca3af;
        padding:2px 4px;border-radius:4px;line-height:1;
      `;
      closeBtn.addEventListener("click", () => dismiss(id));
      actionsRow.appendChild(closeBtn);
    }

    if (actionsRow.children.length > 0) el.appendChild(actionsRow);

    // Progress bar
    if (opts.showProgress && duration > 0) {
      const progressWrap = document.createElement("div");
      progressWrap.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;background:${ts.border};border-radius:0 0 10px 10px;
        overflow:hidden;width:100%;
      `;
      const progressBar = document.createElement("div");
      progressBar.className = "toast-progress";
      progressBar.style.cssText = `
        height:100%;background:${ts.color};width:100%;
        transition:width ${duration}ms linear;
      `;
      progressWrap.appendChild(progressBar);
      el.style.position = "relative";
      el.style.overflow = "hidden";
      el.appendChild(progressWrap);

      // Start shrink after a frame
      requestAnimationFrame(() => { progressBar.style.width = "0%"; });
    }

    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      el.style.transform = "translateX(0)";
      el.style.opacity = "1";
    });

    // Auto-dismiss timer
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (duration > 0) {
      timer = setTimeout(() => dismiss(id), duration);
    }

    activeToasts.set(id, { el, timer: timer! });

    return id;
  }

  function dismiss(id: string): void {
    const entry = activeToasts.get(id);
    if (!entry) return;

    clearTimeout(entry.timer);
    const el = entry.el;

    el.style.transform = "translateX(100%)";
    el.style.opacity = "0";

    setTimeout(() => {
      el.remove();
      activeToasts.delete(id);
      opts.onClose?.(id);
    }, opts.animationDuration);
  }

  function dismissAll(): void {
    for (const id of [...activeToasts.keys()]) dismiss(id);
  }

  // Shorthand methods
  function shorthand(type: ToastType, message: string, title?: string): string {
    return show({ message, type, title });
  }

  const instance: ToastInstance = {
    show,
    success: (m, t) => shorthand("success", m, t),
    error: (m, t) => shorthand("error", m, t),
    warning: (m, t) => shorthand("warning", m, t),
    info: (m, t) => shorthand("info", m, t),
    loading: (m, t) => shorthand("loading", m, t),
    dismiss,
    dismissAll,
    destroy() {
      destroyed = true;
      dismissAll();
      container.remove();
    },
  };

  return instance;
}
