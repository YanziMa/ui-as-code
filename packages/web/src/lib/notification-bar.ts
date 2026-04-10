/**
 * Notification Bar: Dismissible banner with type variants (info/success/warning/error),
 * action buttons, auto-dismiss timer, progress bar indicator, slide-in/out animations,
 * icon support, and accessible ARIA attributes.
 */

// --- Types ---

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationBarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Notification type */
  type?: NotificationType;
  /** Title text (bold) */
  title?: string;
  /** Message body */
  message?: string;
  /** Show close button? */
  closable?: boolean;
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Show progress bar for auto-dismiss countdown? */
  showProgress?: boolean;
  /** Primary action button label */
  actionLabel?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action button label */
  secondaryLabel?: string;
  /** Secondary action callback */
  onSecondary?: () => void;
  /** Callback when dismissed (close or timer) */
  onDismiss?: () => void;
  /** Animation duration in ms (default: 300) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
}

export interface NotificationBarInstance {
  element: HTMLDivElement;
  /** Update message content */
  setMessage: (message: string) => void;
  /** Update type (re-renders colors/icon) */
  setType: (type: NotificationType) => void;
  /** Dismiss the bar */
  dismiss: () => void;
  /** Reset auto-dismiss timer */
  resetTimer: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Config ---

const TYPE_CONFIG: Record<NotificationType, {
  bg: string;
  border: string;
  color: string;
  icon: string;
}> = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "&#8505;" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "&#10003;" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "&#9888;" },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "&#10007;" },
};

// --- Main Class ---

export class NotificationBarManager {
  create(options: NotificationBarOptions): NotificationBarInstance {
    const opts = {
      type: options.type ?? "info",
      closable: options.closable ?? true,
      autoDismiss: options.autoDismiss ?? 0,
      showProgress: options.showProgress ?? true,
      animationDuration: options.animationDuration ?? 300,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("NotificationBar: container not found");

    let destroyed = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let elapsed = 0;

    const tc = TYPE_CONFIG[opts.type];

    // Root
    const root = document.createElement("div");
    root.className = `notification-bar notification-bar-${opts.type} ${opts.className ?? ""}`;
    root.setAttribute("role", "alert");
    root.style.cssText = `
      display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
      background:${tc.bg};border:1px solid ${tc.border};border-radius:8px;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;line-height:1.5;color:${tc.color};
      position:relative;overflow:hidden;
      animation:notificationSlideIn ${opts.animationDuration}ms ease forwards;
      max-height:0;opacity:0;
    `;

    // Inject keyframe
    if (!document.getElementById("notification-bar-styles")) {
      const style = document.createElement("style");
      style.id = "notification-bar-styles";
      style.textContent = `
        @keyframes notificationSlideIn {
          from { max-height:0; opacity:0; transform:translateY(-8px); padding-top:0; padding-bottom:0; }
          to   { max-height:200px; opacity:1; transform:translateY(0); padding-top:12px; padding-bottom:12px; }
        }
        @keyframes notificationSlideOut {
          from { max-height:200px; opacity:1; transform:translateY(0); }
          to   { max-height:0; opacity:0; transform:translateY(-8px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Icon
    const iconEl = document.createElement("span");
    iconEl.className = "notification-icon";
    iconEl.innerHTML = tc.icon;
    iconEl.style.cssText = "flex-shrink:0;font-size:16px;line-height:1;margin-top:1px;";
    root.appendChild(iconEl);

    // Content area
    const contentArea = document.createElement("div");
    contentArea.className = "notification-content";
    contentArea.style.cssText = "flex:1;min-width:0;";

    if (opts.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "notification-title";
      titleEl.style.cssText = "font-weight:600;font-size:13px;";
      titleEl.textContent = opts.title;
      contentArea.appendChild(titleEl);
    }

    if (opts.message) {
      const msgEl = document.createElement("div");
      msgEl.className = "notification-message";
      msgEl.style.cssText = opts.title ? "margin-top:2px;" : "";
      msgEl.textContent = opts.message;
      contentArea.appendChild(msgEl);
    }

    root.appendChild(contentArea);

    // Actions row
    const actionsRow = document.createElement("div");
    actionsRow.className = "notification-actions";
    actionsRow.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:auto;";

    if (opts.secondaryLabel && opts.onSecondary) {
      const secBtn = document.createElement("button");
      secBtn.type = "button";
      secBtn.textContent = opts.secondaryLabel;
      secBtn.style.cssText = `
        padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;
        background:transparent;border:1px solid ${tc.color};color:${tc.color};
        cursor:pointer;transition:background 0.15s;
      `;
      secBtn.addEventListener("click", () => opts.onSecondary?.());
      secBtn.addEventListener("mouseenter", () => { secBtn.style.background = `${tc.color}10`; });
      secBtn.addEventListener("mouseleave", () => { secBtn.style.background = "transparent"; });
      actionsRow.appendChild(secBtn);
    }

    if (opts.actionLabel && opts.onAction) {
      const actBtn = document.createElement("button");
      actBtn.type = "button";
      actBtn.textContent = opts.actionLabel;
      actBtn.style.cssText = `
        padding:4px 14px;border-radius:6px;font-size:12px;font-weight:600;
        background:${tc.color};color:#fff;border:none;cursor:pointer;transition:opacity 0.15s;
      `;
      actBtn.addEventListener("click", () => opts.onAction?.());
      actBtn.addEventListener("mouseenter", () => { actBtn.style.opacity = "0.85"; });
      actBtn.addEventListener("mouseleave", () => { actBtn.style.opacity = "1"; });
      actionsRow.appendChild(actBtn);
    }

    // Close button
    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Dismiss notification");
      closeBtn.innerHTML = "&times;";
      closeBtn.style.cssText = `
        background:none;border:none;color:${tc.color};font-size:18px;cursor:pointer;
        padding:0 2px;line-height:1;transition:opacity 0.15s;flex-shrink:0;
      `;
      closeBtn.addEventListener("click", () => instance.dismiss());
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.opacity = "0.6"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.opacity = "1"; });
      actionsRow.appendChild(closeBtn);
    }

    if (actionsRow.children.length > 0) {
      root.appendChild(actionsRow);
    }

    // Progress bar
    let progressBar: HTMLDivElement | null = null;
    if (opts.autoDismiss > 0 && opts.showProgress) {
      progressBar = document.createElement("div");
      progressBar.className = "notification-progress";
      progressBar.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;background:${tc.color};
        transition:width linear;width:100%;border-radius:0 0 8px 8px;
      `;
      root.appendChild(progressBar);
    }

    container.appendChild(root);

    // --- Timer logic ---

    function startTimer(): void {
      stopTimer();
      if (opts.autoDismiss <= 0 || destroyed) return;
      elapsed = 0;
      if (progressBar) progressBar.style.width = "100%";

      dismissTimer = setTimeout(() => {
        instance.dismiss();
      }, opts.autoDismiss);

      if (progressBar && opts.autoDismiss > 0) {
        const stepMs = 50;
        progressInterval = setInterval(() => {
          elapsed += stepMs;
          const pct = Math.max(0, 100 - (elapsed / opts.autoDismiss) * 100);
          progressBar!.style.width = `${pct}%`;
          if (elapsed >= opts.autoDismiss) stopTimer();
        }, stepMs);
      }
    }

    function stopTimer(): void {
      if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    }

    // Pause on hover
    if (opts.autoDismiss > 0) {
      root.addEventListener("mouseenter", () => stopTimer());
      root.addEventListener("mouseleave", () => startTimer());
    }

    // Start auto-dismiss
    startTimer();

    // Instance
    const instance: NotificationBarInstance = {
      element: root,

      setMessage(msg: string): void {
        const msgEl = root.querySelector(".notification-message") as HTMLElement | null;
        if (msgEl) msgEl.textContent = msg;
        else {
          const newMsg = document.createElement("div");
          newMsg.className = "notification-message";
          newMsg.textContent = msg;
          contentArea.appendChild(newMsg);
        }
      },

      setType(type: NotificationType): void {
        opts.type = type;
        const ntc = TYPE_CONFIG[type];
        root.style.background = ntc.bg;
        root.style.border = `1px solid ${ntc.border}`;
        root.style.color = ntc.color;
        iconEl.innerHTML = ntc.icon;
        iconEl.style.color = ntc.color;
        if (progressBar) progressBar.style.background = ntc.color;
      },

      dismiss(): void {
        if (destroyed) return;
        stopTimer();
        root.style.animation = `notificationSlideOut ${opts.animationDuration}ms ease forwards`;
        setTimeout(() => {
          opts.onDismiss?.();
          destroy();
        }, opts.animationDuration);
      },

      resetTimer(): void {
        startTimer();
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        stopTimer();
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a notification bar */
export function createNotificationBar(options: NotificationBarOptions): NotificationBarInstance {
  return new NotificationBarManager().create(options);
}
