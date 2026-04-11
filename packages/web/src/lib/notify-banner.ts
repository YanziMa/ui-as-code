/**
 * Notify Banner: Dismissible notification banner with multiple types,
 * action buttons, auto-dismiss with countdown timer, progress bar,
 * stacking behavior, ARIA live regions, and animation support.
 */

// --- Types ---

export type NotifyBannerType = "info" | "success" | "warning" | "error" | "neutral";
export type NotifyBannerSize = "sm" | "md" | "lg";

export interface NotifyBannerOptions {
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Banner text or HTML content */
  message: string;
  /** Notification type */
  type?: NotifyBannerType;
  /** Title/heading */
  title?: string;
  /** Icon prefix (emoji, SVG string, or HTML element) */
  icon?: string | HTMLElement;
  /** Primary action button label */
  actionLabel?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action button label */
  secondaryLabel?: string;
  /** Secondary action callback */
  onSecondary?: () => void;
  /** Dismissible? */
  dismissible?: boolean;
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Show countdown timer on auto-dismiss */
  showTimer?: boolean;
  /** Show progress bar for auto-dismiss */
  showProgress?: boolean;
  /** Size variant */
  size?: NotifyBannerSize;
  /** Sticky/fixed at top of container? */
  sticky?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Callback on dismiss */
  onDismiss?: () => void;
  /** Callback on mount */
  onMount?: () => void;
}

export interface NotifyBannerInstance {
  element: HTMLElement;
  /** Update the message content */
  setMessage: (msg: string) => void;
  /** Update the notification type */
  setType: (type: NotifyBannerType) => void;
  /** Dismiss the banner */
  dismiss: () => void;
  /** Show the banner (after dismiss) */
  show: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Type Config ---

const TYPE_CONFIG: Record<NotifyBannerType, {
  bg: string; border: string; color: string; iconBg: string; iconColor: string;
}> = {
  info: {
    bg: "#eff6ff", border: "#93c5fd", color: "#1e40af",
    iconBg: "#dbeafe", iconColor: "#2563eb",
  },
  success: {
    bg: "#f0fdf4", border: "#86efac", color: "#166534",
    iconBg: "#dcfce7", iconColor: "#16a34a",
  },
  warning: {
    bg: "#fffbeb", border: "#fcd34d", color: "#92400e",
    iconBg: "#fef3c7", iconColor: "#d97706",
  },
  error: {
    bg: "#fef2f2", border: "#fca5a5", color: "#991b1b",
    iconBg: "#fee2e2", iconColor: "#dc2626",
  },
  neutral: {
    bg: "#f9fafb", border: "#d1d5db", color: "#374151",
    iconBg: "#f3f4f6", iconColor: "#6b7280",
  },
};

const DEFAULT_ICONS: Record<NotifyBannerType, string> = {
  info: "\u2139\uFE0F",
  success: "\u2713",
  warning: "\u26A0\uFE0F",
  error: "\u2717",
  neutral: "\u2139\uFE0F",
};

const SIZE_STYLES: Record<NotifyBannerSize, { padding: string; fontSize: number; iconSize: number }> = {
  sm: { padding: "8px 14px", fontSize: 13, iconSize: 16 },
  md: { padding: "12px 18px", fontSize: 14, iconSize: 20 },
  lg: { padding: "16px 22px", fontSize: 15, iconSize: 24 },
};

// --- Main Factory ---

export function createNotifyBanner(options: NotifyBannerOptions): NotifyBannerInstance {
  const opts = {
    type: options.type ?? "info",
    size: options.size ?? "md",
    dismissible: options.dismissible ?? true,
    autoDismiss: options.autoDismiss ?? 0,
    showTimer: options.showTimer ?? false,
    showProgress: options.showProgress ?? true,
    sticky: options.sticky ?? false,
    className: options.className ?? "",
    ...options,
  };

  const tc = TYPE_CONFIG[opts.type];
  const sz = SIZE_STYLES[opts.size];

  // Container
  let container: HTMLElement;
  if (options.container) {
    container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
  } else {
    container = document.createElement("div");
    if (!opts.sticky) {
      document.body.appendChild(container);
    } else {
      container.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;";
      document.body.appendChild(container);
    }
  }

  // Root element
  const root = document.createElement("div");
  root.className = `notify-banner nb-${opts.type} nb-${opts.size} ${opts.className}`;
  root.setAttribute("role", "alert");
  root.style.cssText = `
    display:flex;align-items:flex-start;gap:12px;
    padding:${sz.padding};
    background:${tc.bg};border:1px solid ${tc.border};
    border-radius:10px;color:${tc.color};
    font-family:-apple-system,sans-serif;font-size:${sz.fontSize}px;line-height:1.5;
    box-shadow:0 1px 3px rgba(0,0,0,0.08);
    position:relative;overflow:hidden;
    animation:nb-slide-in 0.3s ease both;
  `;

  // Inject keyframes
  if (!document.getElementById("notify-banner-styles")) {
    const style = document.createElement("style");
    style.id = "notify-banner-styles";
    style.textContent = `
      @keyframes nb-slide-in{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
      @keyframes nb-slide-out{from{opacity:1;transform:translateY(0);}to{opacity:0;transform:translateY(-8px);}}
    `;
    document.head.appendChild(style);
  }

  // Icon area
  const iconWrap = document.createElement("div");
  iconWrap.className = "nb-icon";
  iconWrap.style.cssText = `
    display:flex;align-items:center;justify-content:center;
    width:${sz.iconSize + 8}px;height:${sz.iconSize + 8}px;border-radius:50%;
    background:${tc.iconBg};flex-shrink:0;margin-top:1px;
  `;
  const iconEl = document.createElement("span");
  iconEl.style.cssText = `font-size:${sz.iconSize}px;line-height:1;`;
  if (typeof opts.icon === "string") {
    iconEl.innerHTML = opts.icon;
  } else if (opts.icon instanceof HTMLElement) {
    iconEl.appendChild(opts.icon);
  } else {
    iconEl.textContent = DEFAULT_ICONS[opts.type];
  }
  iconWrap.appendChild(iconEl);
  root.appendChild(iconWrap);

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "nb-content";
  contentArea.style.cssText = "flex:1;min-width:0;";
  root.appendChild(contentArea);

  // Title
  if (opts.title) {
    const titleEl = document.createElement("div");
    titleEl.className = "nb-title";
    titleEl.style.cssText = "font-weight:600;margin-bottom:2px;";
    titleEl.textContent = opts.title;
    contentArea.appendChild(titleEl);
  }

  // Message
  const msgEl = document.createElement("div");
  msgEl.className = "nb-message";
  msgEl.style.cssText = "word-wrap:break-word;";
  msgEl.innerHTML = opts.message;
  contentArea.appendChild(msgEl);

  // Actions area
  const actionsArea = document.createElement("div");
  actionsArea.className = "nb-actions";
  actionsArea.style.cssText = "display:flex;gap:8px;flex-shrink:0;align-items:center;margin-left:auto;";
  root.appendChild(actionsArea);

  // Primary action button
  if (opts.actionLabel) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.textContent = opts.actionLabel;
    actionBtn.style.cssText = `
      padding:5px 14px;border-radius:6px;font-size:${Math.max(12, sz.fontSize - 1)}px;
      font-weight:500;background:${tc.color};color:#fff;border:none;cursor:pointer;
      transition:background 0.15s;white-space:nowrap;
    `;
    actionBtn.addEventListener("click", () => opts.onAction?.());
    actionBtn.addEventListener("mouseenter", () => { actionBtn.style.background = tc.iconColor; });
    actionBtn.addEventListener("mouseleave", () => { actionBtn.style.background = tc.color; });
    actionsArea.appendChild(actionBtn);
  }

  // Secondary action button
  if (opts.secondaryLabel) {
    const secBtn = document.createElement("button");
    secBtn.type = "button";
    secBtn.textContent = opts.secondaryLabel;
    secBtn.style.cssText = `
      padding:5px 14px;border-radius:6px;font-size:${Math.max(12, sz.fontSize - 1)}px;
      font-weight:500;background:transparent;color:${tc.color};border:1px solid ${tc.border};
      cursor:pointer;transition:all 0.15s;white-space:nowrap;
    `;
    secBtn.addEventListener("click", () => opts.onSecondary?.());
    secBtn.addEventListener("mouseenter", () => { secBtn.style.borderColor = tc.color; });
    secBtn.addEventListener("mouseleave", () => { secBtn.style.borderColor = tc.border; });
    actionsArea.appendChild(secBtn);
  }

  // Timer display
  let timerEl: HTMLElement | null = null;
  if (opts.showTimer && opts.autoDismiss > 0) {
    timerEl = document.createElement("span");
    timerEl.className = "nb-timer";
    timerEl.style.cssText = `
      font-size:11px;font-weight:600;font-family:monospace;
      color:${tc.color};opacity:0.7;margin-left:8px;white-space:nowrap;
    `;
    actionsArea.insertBefore(timerEl, actionsArea.firstChild);
  }

  // Progress bar
  let progressBar: HTMLElement | null = null;
  if (opts.showProgress && opts.autoDismiss > 0) {
    progressBar = document.createElement("div");
    progressBar.className = "nb-progress";
    progressBar.style.cssText = `
      position:absolute;bottom:0;left:0;height:3px;
      background:${tc.iconColor};transition:width linear;
      border-radius:0 0 10px 10px;
    `;
    root.appendChild(progressBar);
  }

  // Dismiss button
  let dismissBtn: HTMLButtonElement | null = null;
  if (opts.dismissible) {
    dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.innerHTML = "&times;";
    dismissBtn.title = "Dismiss";
    dismissBtn.setAttribute("aria-label", "Dismiss notification");
    dismissBtn.style.cssText = `
      background:none;border:none;font-size:16px;cursor:pointer;
      color:${tc.color};opacity:0.5;padding:2px 4px;line-height:1;
      transition:opacity 0.15s;flex-shrink:0;margin-left:4px;
    `;
    dismissBtn.addEventListener("click", () => instance.dismiss());
    dismissBtn.addEventListener("mouseenter", () => { dismissBtn!.style.opacity = "1"; });
    dismissBtn.addEventListener("mouseleave", () => { dismissBtn!.style.opacity = "0.5"; });
    actionsArea.appendChild(dismissBtn);
  }

  container.appendChild(root);

  // State
  let visible = true;
  let destroyed = false;
  let autoDismissTimer: ReturnType<typeof setInterval> | null = null;
  let elapsed = 0;

  function startAutoDismiss(): void {
    if (!opts.autoDismiss || opts.autoDismiss <= 0) return;

    elapsed = 0;
    autoDismissTimer = setInterval(() => {
      elapsed += 100;
      updateTimerDisplay();
      updateProgressBar();

      if (elapsed >= opts.autoDismiss) {
        instance.dismiss();
      }
    }, 100);
  }

  function stopAutoDismiss(): void {
    if (autoDismissTimer) {
      clearInterval(autoDismissTimer);
      autoDismissTimer = null;
    }
  }

  function updateTimerDisplay(): void {
    if (!timerEl) return;
    const remaining = Math.max(0, Math.ceil((opts.autoDismiss! - elapsed) / 1000));
    timerEl.textContent = `${remaining}s`;
  }

  function updateProgressBar(): void {
    if (!progressBar || !opts.autoDismiss) return;
    const pct = Math.max(0, 1 - elapsed / opts.autoDismiss);
    progressBar.style.width = `${pct * 100}%`;
  }

  // Pause on hover
  if (opts.autoDismiss > 0) {
    root.addEventListener("mouseenter", () => stopAutoDismiss());
    root.addEventListener("mouseleave", () => {
      if (visible && !destroyed) startAutoDismiss();
    });
  }

  // Start auto-dismiss
  startAutoDismiss();
  opts.onMount?.();

  const instance: NotifyBannerInstance = {
    element: root,

    setMessage(msg: string) {
      msgEl.innerHTML = msg;
    },

    setType(type: NotifyBannerType) {
      const ntc = TYPE_CONFIG[type];
      root.style.background = ntc.bg;
      root.style.borderColor = ntc.border;
      root.style.color = ntc.color;
      iconWrap.style.background = ntc.iconBg;
      iconEl.style.color = ntc.iconColor;
      // Update icon if not custom
      if (!opts.icon) iconEl.textContent = DEFAULT_ICONS[type];
      opts.type = type;
    },

    dismiss() {
      if (!visible || destroyed) return;
      visible = false;
      stopAutoDismiss();
      root.style.animation = "nb-slide-out 0.25s ease forwards";
      setTimeout(() => {
        root.style.display = "none";
        opts.onDismiss?.();
      }, 250);
    },

    show() {
      if (destroyed) return;
      visible = true;
      root.style.display = "";
      root.style.animation = "nb-slide-in 0.3s ease both";
      if (opts.autoDismiss > 0) startAutoDismiss();
    },

    isVisible() { return visible; },

    destroy() {
      destroyed = true;
      stopAutoDismiss();
      root.remove();
    },
  };

  return instance;
}
