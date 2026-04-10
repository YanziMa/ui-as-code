/**
 * Alert / Notification Banner: Dismissible alerts with variants (info/success/warning/error),
 * icons, auto-dismiss timer, action buttons, stacked layout, progress bar for timed dismissal,
 * and accessible semantics.
 */

// --- Types ---

export type AlertVariant = "info" | "success" | "warning" | "error";
export type AlertSize = "sm" | "md" | "lg";

export interface AlertAction {
  /** Button text */
  text: string;
  /** Click handler */
  onClick: () => void;
  /** Variant style for the button */
  variant?: "primary" | "secondary" | "ghost";
}

export interface AlertOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Alert variant */
  variant?: AlertVariant;
  /** Title text */
  title?: string;
  /** Body message */
  message: string;
  /** Dismissible? (default: true) */
  dismissible?: boolean;
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Show icon on the left */
  showIcon?: boolean;
  /** Action buttons */
  actions?: AlertAction[];
  /** Size variant */
  size?: AlertSize;
  /** Custom CSS class */
  className?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Show countdown progress bar for auto-dismiss */
  showProgress?: boolean;
}

export interface AlertInstance {
  element: HTMLElement;
  dismiss: () => void;
  setMessage: (msg: string) => void;
  setTitle: (title: string) => void;
  destroy: () => void;
}

// --- Variant Config ---

const VARIANT_CONFIG: Record<AlertVariant, {
  bg: string; border: string; color: string; iconBg: string; iconColor: string;
}> = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", iconBg: "#dbeafe", iconColor: "#2563eb" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", iconBg: "#dcfce7", iconColor: "#16a34a" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", iconBg: "#fef3c7", iconColor: "#d97706" },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", iconBg: "#fee2e2", iconColor: "#dc2626" },
};

const ICON_SVG: Record<AlertVariant, string> = {
  info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
};

const SIZE_STYLES: Record<AlertSize, { padding: string; fontSize: number; iconSize: number }> = {
  sm: { padding: "8px 12px", fontSize: 13, iconSize: 16 },
  md: { padding: "12px 16px", fontSize: 14, iconSize: 18 },
  lg: { padding: "16px 20px", fontSize: 15, iconSize: 20 },
};

// --- Main Class ---

export class AlertManager {
  create(options: AlertOptions): AlertInstance {
    const opts = {
      variant: options.variant ?? "info",
      dismissible: options.dismissible ?? true,
      autoDismiss: options.autoDismiss ?? 0,
      showIcon: options.showIcon ?? true,
      size: options.size ?? "md",
      showProgress: options.showProgress ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Alert: container not found");

    const cfg = VARIANT_CONFIG[opts.variant];
    const sz = SIZE_STYLES[opts.size];

    // Build alert element
    const el = document.createElement("div");
    el.className = `alert alert-${opts.variant} alert-${opts.size} ${opts.className ?? ""}`;
    el.setAttribute("role", "alert");
    el.style.cssText = `
      display:flex;align-items:flex-start;gap:10px;
      background:${cfg.bg};border:1px solid ${cfg.border};
      border-radius:8px;padding:${sz.padding};
      font-size:${sz.fontSize}px;color:${cfg.color};
      position:relative;overflow:hidden;font-family:-apple-system,sans-serif;
      animation:alert-slide-in 0.25s ease-out;
    `;

    // Icon
    if (opts.showIcon) {
      const iconWrap = document.createElement("div");
      iconWrap.className = "alert-icon";
      iconWrap.style.cssText = `
        flex-shrink:0;width:${sz.iconSize + 8}px;height:${sz.iconSize + 8}px;
        border-radius:50%;display:flex;align-items:center;justify-content:center;
        background:${cfg.iconBg};color:${cfg.iconColor};
      `;
      iconWrap.innerHTML = ICON_SVG[opts.variant];
      el.appendChild(iconWrap);
    }

    // Content area
    const content = document.createElement("div");
    content.className = "alert-content";
    content.style.cssText = "flex:1;min-width:0;";

    // Title
    const titleEl = document.createElement("div");
    titleEl.className = "alert-title";
    titleEl.style.cssText = "font-weight:600;margin-bottom:2px;";
    titleEl.textContent = opts.title ?? "";
    if (opts.title) content.appendChild(titleEl);

    // Message
    const msgEl = document.createElement("div");
    msgEl.className = "alert-message";
    msgEl.textContent = opts.message;
    content.appendChild(msgEl);

    // Actions
    if (opts.actions?.length) {
      const actionsRow = document.createElement("div");
      actionsRow.className = "alert-actions";
      actionsRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
      for (const action of opts.actions) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = action.text;
        btn.style.cssText = `
          padding:4px 12px;border-radius:4px;font-size:${sz.fontSize - 1}px;
          cursor:pointer;border:none;font-weight:500;
          ${action.variant === "primary"
            ? `background:${cfg.iconColor};color:#fff;`
            : action.variant === "secondary"
              ? `background:${cfg.color}15;color:${cfg.color};`
              : `background:transparent;color:${cfg.color};`}
          transition:opacity 0.15s;
        `;
        btn.addEventListener("click", () => action.onClick());
        btn.addEventListener("mouseenter", () => { btn.style.opacity = "0.8"; });
        btn.addEventListener("mouseleave", () => { btn.style.opacity = ""; });
        actionsRow.appendChild(btn);
      }
      content.appendChild(actionsRow);
    }

    el.appendChild(content);

    // Dismiss button
    let dismissBtn: HTMLButtonElement | null = null;
    if (opts.dismissible) {
      dismissBtn = document.createElement("button");
      dismissBtn.type = "button";
      dismissBtn.className = "alert-dismiss";
      dismissBtn.setAttribute("aria-label", "Dismiss");
      dismissBtn.innerHTML = "&times;";
      dismissBtn.style.cssText = `
        flex-shrink:0;background:none;border:none;cursor:pointer;
        font-size:18px;line-height:1;color:${cfg.color};opacity:0.5;
        padding:0 2px;transition:opacity 0.15s;
      `;
      dismissBtn.addEventListener("click", () => instance.dismiss());
      dismissBtn.addEventListener("mouseenter", () => { dismissBtn!.style.opacity = "1"; });
      dismissBtn.addEventListener("mouseleave", () => { dismissBtn!.style.opacity = "0.5"; });
      el.appendChild(dismissBtn);
    }

    // Progress bar for auto-dismiss
    let progressBar: HTMLDivElement | null = null;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    if (opts.autoDismiss > 0 && opts.showProgress) {
      progressBar = document.createElement("div");
      progressBar.className = "alert-progress";
      progressBar.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;
        background:${cfg.iconColor};border-radius:0 0 8px 8px;
        transition:width linear;width:100%;
      `;
      el.appendChild(progressBar);

      // Animate progress
      setTimeout(() => {
        if (progressBar) progressBar.style.transitionDuration = `${opts.autoDismiss}ms`;
        if (progressBar) progressBar.style.width = "0%";
      }, 50);
    }

    container.appendChild(el);

    // Auto-dismiss
    if (opts.autoDismiss > 0) {
      dismissTimer = setTimeout(() => instance.dismiss(), opts.autoDismiss);
    }

    // Inject keyframe
    if (!document.getElementById("alert-styles")) {
      const s = document.createElement("style");
      s.id = "alert-styles";
      s.textContent = "@keyframes alert-slide-in{from{transform:translateY(-8px);opacity:0;}to{transform:translateY(0);opacity:1;}}";
      document.head.appendChild(s);
    }

    const instance: AlertInstance = {
      element: el,

      dismiss() {
        if (dismissTimer) clearTimeout(dismissTimer);
        el.style.animation = "alert-slide-in 0.2s ease-in reverse forwards";
        setTimeout(() => {
          el.remove();
          opts.onDismiss?.();
        }, 200);
      },

      setMessage(msg: string) {
        msgEl.textContent = msg;
      },

      setTitle(title: string) {
        titleEl.textContent = title;
        titleEl.style.display = title ? "" : "none";
      },

      destroy() {
        if (dismissTimer) clearTimeout(dismissTimer);
        el.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create an alert */
export function createAlert(options: AlertOptions): AlertInstance {
  return new AlertManager().create(options);
}
