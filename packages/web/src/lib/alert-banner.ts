/**
 * Alert / Banner Component: Dismissible notification banners with severity levels,
 * auto-dismiss, action buttons, icons, progress bar for timed alerts, stacking,
 * and accessibility (ARIA live regions).
 */

// --- Types ---

export type AlertSeverity = "info" | "success" | "warning" | "error" | "neutral";

export interface AlertOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Alert message (HTML supported) */
  message: string;
  /** Severity level */
  severity?: AlertSeverity;
  /** Title/heading */
  title?: string;
  /** Dismissible with close button? */
  dismissible?: boolean;
  /** Auto-dismiss after duration (ms). 0 = no auto-dismiss */
  autoDismiss?: number;
  /** Show progress bar for auto-dismiss timer */
  showProgress?: boolean;
  /** Action button label */
  actionLabel?: string;
  /** Action button click handler */
  onAction?: () => void;
  /** Secondary action label */
  secondaryLabel?: string;
  /** Secondary action handler */
  onSecondaryAction?: () => void;
  /** Icon override (emoji or SVG string) */
  icon?: string;
  /** Custom CSS class */
  className?: string;
  /** Callback on dismiss */
  onDismiss?: () => void;
  /** Callback on show animation complete */
  onShow?: () => void;
  /** Animation duration (ms) */
  animationDuration?: number;
}

export interface AlertInstance {
  element: HTMLDivElement;
  dismiss: () => void;
  updateMessage: (message: string) => void;
  setSeverity: (severity: AlertSeverity) => void;
  destroy: () => void;
}

// --- Severity Config ---

const SEVERITY_CONFIG: Record<AlertSeverity, {
  bg: string; border: string; icon: string; textColor: string; iconColor: string;
}> = {
  info: {
    bg: "#eff6ff", border: "#93c5fd", icon: "\u2139\uFE0F",
    textColor: "#1e40af", iconColor: "#3b82f6",
  },
  success: {
    bg: "#f0fdf4", border: "#86efac", icon: "\u2713",
    textColor: "#166534", iconColor: "#22c55e",
  },
  warning: {
    bg: "#fffbeb", border: "#fcd34d", icon: "\u26A0\uFE0F",
    textColor: "#92400e", iconColor: "#f59e0b",
  },
  error: {
    bg: "#fef2f2", border: "#fca5a5", icon: "\u2716",
    textColor: "#991b1b", iconColor: "#ef4444",
  },
  neutral: {
    bg: "#f9fafb", border: "#d1d5db", icon: "",
    textColor: "#374151", iconColor: "#6b7280",
  },
};

// --- Main Class ---

export class AlertManager {
  create(options: AlertOptions): AlertInstance {
    const opts = {
      severity: options.severity ?? "info",
      dismissible: options.dismissible ?? true,
      autoDismiss: options.autoDismiss ?? 0,
      showProgress: options.showProgress ?? true,
      animationDuration: options.animationDuration ?? 250,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Alert: container element not found");

    const config = SEVERITY_CONFIG[opts.severity];
    let destroyed = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    let progressTimer: ReturnType<typeof requestAnimationFrame> | null = null;
    let startTime = 0;

    // Create alert element
    const alertEl = document.createElement("div");
    alertEl.className = `alert alert-${opts.severity} ${opts.className ?? ""}`;
    alertEl.setAttribute("role", "alert");
    alertEl.setAttribute("aria-live", opts.severity === "error" || opts.severity === "warning"
      ? "assertive" : "polite");
    alertEl.style.cssText = `
      display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
      background:${config.bg};border:1px solid ${config.border};
      border-radius:8px;font-size:13px;color:${config.textColor};
      font-family:-apple-system,sans-serif;line-height:1.5;
      position:relative;overflow:hidden;
      opacity:0;transform:translateY(-8px);
      transition:opacity ${opts.animationDuration}ms ease,
                 transform ${opts.animationDuration}ms ease;
    `;

    // Icon
    const iconContainer = document.createElement("div");
    iconContainer.className = "alert-icon";
    iconContainer.style.cssText = `
      flex-shrink:0;width:20px;height:20px;display:flex;
      align-items:center;justify-content:center;font-size:16px;
      color:${config.iconColor};
    `;
    iconContainer.textContent = opts.icon ?? config.icon;
    alertEl.appendChild(iconContainer);

    // Content area
    const contentArea = document.createElement("div");
    contentArea.className = "alert-content";
    contentArea.style.cssText = "flex:1;min-width:0;";
    alertEl.appendChild(contentArea);

    // Title
    if (opts.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "alert-title";
      titleEl.style.cssText = "font-weight:600;margin-bottom:2px;";
      titleEl.textContent = opts.title;
      contentArea.appendChild(titleEl);
    }

    // Message
    const msgEl = document.createElement("div");
    msgEl.className = "alert-message";
    msgEl.style.cssText = "word-wrap:break-word;";
    msgEl.innerHTML = options.message;
    contentArea.appendChild(msgEl);

    // Actions area
    const actionsArea = document.createElement("div");
    actionsArea.className = "alert-actions";
    actionsArea.style.cssText = "display:flex;gap:8px;margin-top:8px;flex-shrink:0;";
    alertEl.appendChild(actionsArea);

    // Action button
    if (opts.actionLabel) {
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.textContent = opts.actionLabel;
      actionBtn.style.cssText = `
        padding:4px 14px;border-radius:6px;font-size:12px;font-weight:500;
        background:${config.iconColor};color:#fff;border:none;cursor:pointer;
        transition:opacity 0.15s;
      `;
      actionBtn.addEventListener("click", () => {
        opts.onAction?.();
      });
      actionsArea.appendChild(actionBtn);
    }

    // Secondary action
    if (opts.secondaryLabel) {
      const secBtn = document.createElement("button");
      secBtn.type = "button";
      secBtn.textContent = opts.secondaryLabel;
      secBtn.style.cssText = `
        padding:4px 14px;border-radius:6px;font-size:12px;font-weight:500;
        background:transparent;color:${config.textColor};border:1px solid ${config.border};
        cursor:pointer;transition:background 0.15s;
      `;
      secBtn.addEventListener("click", () => {
        opts.onSecondaryAction?.();
      });
      actionsArea.appendChild(secBtn);
    }

    // Close button
    if (opts.dismissible) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Dismiss");
      closeBtn.style.cssText = `
        flex-shrink:0;background:none;border:none;font-size:18px;line-height:1;
        cursor:pointer;color:${config.textColor};opacity:0.6;padding:0 2px;
        transition:opacity 0.15s;
      `;
      closeBtn.addEventListener("click", () => instance.dismiss());
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.opacity = "1"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.opacity = "0.6"; });
      alertEl.appendChild(closeBtn);
    }

    // Progress bar for auto-dismiss
    let progressBar: HTMLDivElement | null = null;
    if (opts.autoDismiss > 0 && opts.showProgress) {
      progressBar = document.createElement("div");
      progressBar.className = "alert-progress";
      progressBar.style.cssText = `
        position:absolute;left:0;bottom:0;height:3px;background:${config.iconColor};
        width:100%;transform-origin:left;transition:none;
      `;
      alertEl.appendChild(progressBar);
    }

    container.appendChild(alertEl);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alertEl.style.opacity = "1";
        alertEl.style.transform = "translateY(0)";
        setTimeout(() => opts.onShow?.(), opts.animationDuration);
      });
    });

    // Auto-dismiss
    function startAutoDismiss(): void {
      if (opts.autoDismiss <= 0) return;
      startTime = Date.now();

      if (progressBar) {
        function animateProgress(): void {
          if (destroyed) return;
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 1 - elapsed / opts.autoDismiss);
          progressBar!.style.transform = `scaleX(${remaining})`;
          if (remaining > 0) {
            progressTimer = requestAnimationFrame(animateProgress);
          }
        }
        animateProgress();
      }

      dismissTimer = setTimeout(() => {
        instance.dismiss();
      }, opts.autoDismiss);
    }

    function stopAutoDismiss(): void {
      if (dismissTimer) {
        clearTimeout(dismissTimer);
        dismissTimer = null;
      }
      if (progressTimer) {
        cancelAnimationFrame(progressTimer);
        progressTimer = null;
      }
    }

    // Pause on hover
    if (opts.autoDismiss > 0) {
      alertEl.addEventListener("mouseenter", stopAutoDismiss);
      alertEl.addEventListener("mouseleave", startAutoDismiss);
    }

    startAutoDismiss();

    const instance: AlertInstance = {
      element: alertEl,

      dismiss() {
        if (destroyed) return;
        stopAutoDismiss();
        alertEl.style.opacity = "0";
        alertEl.style.transform = "translateY(-8px)";
        setTimeout(() => {
          alertEl.remove();
          opts.onDismiss?.();
        }, opts.animationDuration);
      },

      updateMessage(message: string) {
        msgEl.innerHTML = message;
      },

      setSeverity(severity: AlertSeverity) {
        const newConfig = SEVERITY_CONFIG[severity];
        alertEl.style.background = newConfig.bg;
        alertEl.style.borderColor = newConfig.border;
        alertEl.style.color = newConfig.textColor;
        iconContainer.textContent = opts.icon ?? newConfig.icon;
        iconContainer.style.color = newConfig.iconColor;
        if (progressBar) progressBar.style.background = newConfig.iconColor;

        // Update ARIA
        alertEl.setAttribute("aria-live", severity === "error" || severity === "warning"
          ? "assertive" : "polite");

        alertEl.classList.remove(`alert-${opts.severity}`);
        alertEl.classList.add(`alert-${severity}`);
        opts.severity = severity;
      },

      destroy() {
        destroyed = true;
        stopAutoDismiss();
        alertEl.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create an alert/banner */
export function createAlert(options: AlertOptions): AlertInstance {
  return new AlertManager().create(options);
}
