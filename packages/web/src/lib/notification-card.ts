/**
 * Notification Card: Rich notification/toast card with icon, title, message,
 * timestamp, actions, dismiss, priority levels, read/unread state, and animations.
 */

// --- Types ---

export type NotificationPriority = "low" | "medium" | "high" | "urgent";
export type NotificationType = "info" | "success" | "warning" | "error" | "default";

export interface NotificationAction {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export interface NotificationCardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Notification type (affects color scheme) */
  type?: NotificationType;
  /** Priority level */
  priority?: NotificationPriority;
  /** Title text */
  title: string;
  /** Body message */
  message?: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Timestamp display string */
  timestamp?: string;
  /** Whether it's unread (shows dot indicator) */
  unread?: boolean;
  /** Action buttons */
  actions?: NotificationAction[];
  /** Show dismiss button? */
  dismissible?: boolean;
  /** Callback on dismiss */
  onDismiss?: () => void;
  /** Callback on click */
  onClick?: () => void;
  /** Callback on mark as read */
  onRead?: () => void;
  /** Auto-dismiss after ms (0 = no auto) */
  autoDismiss?: number;
  /** Custom CSS class */
  className?: string;
  /** Compact mode? */
  compact?: boolean;
}

export interface NotificationCardInstance {
  element: HTMLElement;
  /** Mark as read */
  markRead: () => void;
  /** Mark as unread */
  markUnread: () => void;
  /** Update content dynamically */
  update: (opts: Partial<Pick<NotificationCardOptions, "title" | "message" | "timestamp" | "type" | "priority">>) => void;
  /** Dismiss / remove */
  dismiss: () => void;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Config ---

const TYPE_STYLES: Record<NotificationType, { bg: string; border: string; iconBg: string; accent: string }> = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", iconBg: "#dbeafe", accent: "#2563eb" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", iconBg: "#dcfce7", accent: "#16a34a" },
  warning: { bg: "#fffbeb", border: "#fde68a", iconBg: "#fef3c7", accent: "#d97706" },
  error:   { bg: "#fef2f2", border: "#fecaca", iconBg: "#fee2e2", accent: "#dc2626" },
  default: { bg: "#f9fafb", border: "#e5e7eb", iconBg: "#f3f4f6", accent: "#374151" },
};

const PRIORITY_DOT: Record<NotificationPriority, string> = {
  low:    "#9ca3af",
  medium: "#3b82f6",
  high:   "#f59e0b",
  urgent: "#ef4444",
};

const DEFAULT_ICONS: Record<NotificationType, string> = {
  info:    "\u2139\uFE0F",
  success: "\u2705",
  warning: "\u26A0\uFE0F",
  error:   "\u274C",
  default: "\uD83D\uDCCC",
};

// --- Main ---

export function createNotificationCard(options: NotificationCardOptions): NotificationCardInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("NotificationCard: container not found");

  const opts = {
    type: options.type ?? "default",
    priority: options.priority ?? "medium",
    unread: options.unread ?? false,
    dismissible: options.dismissible ?? true,
    compact: options.compact ?? false,
    autoDismiss: options.autoDismiss ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const ts = TYPE_STYLES[opts.type];

  // Root
  const root = document.createElement("div");
  root.className = `notification-card ${opts.className}`;
  root.style.cssText = `
    position:relative;display:flex;gap:12px;padding:${opts.compact ? "10px 14px" : "14px 16px"};
    background:${ts.bg};border:1px solid ${ts.border};border-radius:10px;
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    box-shadow:0 1px 3px rgba(0,0,0,0.06);cursor:pointer;
    transition:transform 0.2s ease,box-shadow 0.2s ease,opacity 0.3s ease;
    animation:nc-slideIn 0.3s ease-out;overflow:hidden;
  `;
  root.setAttribute("role", "alert");
  root.setAttribute("aria-live", "polite");

  // Inject keyframe
  if (!document.getElementById("nc-styles")) {
    const style = document.createElement("style");
    style.id = "nc-styles";
    style.textContent = `
      @keyframes nc-slideIn { from { opacity:0;transform:translateY(-8px); } to { opacity:1;transform:translateY(0); } }
      @keyframes nc-slideOut { from { opacity:1;transform:translateY(0); } to { opacity:0;transform:translateY(-8px); } }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(root);

  let destroyed = false;
  let isUnread = opts.unread;
  let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

  // Icon area
  const iconArea = document.createElement("div");
  iconArea.style.cssText = `
    flex-shrink:0;width:36px;height:36px;border-radius:50%;
    background:${ts.iconBg};display:flex;align-items:center;justify-content:center;
    font-size:18px;line-height:1;
  `;
  iconArea.textContent = opts.icon ?? DEFAULT_ICONS[opts.type];
  root.appendChild(iconArea);

  // Content area
  const content = document.createElement("div");
  content.style.cssText = `flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;`;
  root.appendChild(content);

  // Header row: title + timestamp + unread dot + dismiss
  const headerRow = document.createElement("div");
  headerRow.style.cssText = "display:flex;align-items:center;gap:8px;";
  content.appendChild(headerRow);

  // Unread dot
  const unreadDot = document.createElement("span");
  unreadDot.style.cssText = `
    width:8px;height:8px;border-radius:50%;background:${PRIORITY_DOT[opts.priority]};
    flex-shrink:0;${isUnread ? "" : "display:none;"}
  `;
  headerRow.appendChild(unreadDot);

  // Title
  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-weight:600;font-size:13px;color:#111827;line-height:1.3;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  titleEl.textContent = opts.title;
  headerRow.appendChild(titleEl);

  // Timestamp
  if (opts.timestamp) {
    const tsEl = document.createElement("span");
    tsEl.style.cssText = "font-size:11px;color:#9ca3af;flex-shrink:0;white-space:nowrap;";
    tsEl.textContent = opts.timestamp;
    headerRow.appendChild(tsEl);
  }

  // Dismiss button
  if (opts.dismissible) {
    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.textContent = "\u2715";
    dismissBtn.setAttribute("aria-label", "Dismiss");
    dismissBtn.style.cssText = `
      flex-shrink:0;width:22px;height:22px;border:none;border-radius:50%;background:transparent;
      color:#9ca3af;cursor:pointer;font-size:12px;display:flex;align-items:center;
      justify-content:center;transition:background 0.15s,color 0.15s;
    `;
    dismissBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      instance.dismiss();
    });
    dismissBtn.addEventListener("mouseenter", () => {
      dismissBtn.style.background = "rgba(0,0,0,0.08)";
      dismissBtn.style.color = "#374151";
    });
    dismissBtn.addEventListener("mouseleave", () => {
      dismissBtn.style.background = "transparent";
      dismissBtn.style.color = "#9ca3af";
    });
    headerRow.appendChild(dismissBtn);
  }

  // Message body
  if (opts.message && !opts.compact) {
    const msgEl = document.createElement("div");
    msgEl.style.cssText = "font-size:13px;color:#4b5563;line-height:1.5;margin-top:2px;";
    msgEl.textContent = opts.message;
    content.appendChild(msgEl);
  }

  // Actions row
  if (opts.actions && opts.actions.length > 0) {
    const actionRow = document.createElement("div");
    actionRow.style.cssText = "display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;";
    content.appendChild(actionRow);

    for (const act of opts.actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = act.label;
      const variantStyles: Record<string, string> = {
        primary:   `background:${ts.accent};color:#fff;border:none;`,
        secondary: `background:#fff;color:#374151;border:1px solid #d1d5db;`,
        danger:    `background:#ef4444;color:#fff;border:none;`,
        ghost:     `background:transparent;color:${ts.accent};border:none;`,
      };
      btn.style.cssText = `
        padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;
        cursor:pointer;transition:background 0.15s;${variantStyles[act.variant ?? "ghost"]}
      `;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        act.onClick?.();
      });
      actionRow.appendChild(btn);
    }
  }

  // Priority bar (subtle left border accent for high/urgent)
  if (opts.priority === "high" || opts.priority === "urgent") {
    root.style.borderLeftWidth = "3px";
    root.style.borderLeftColor = PRIORITY_DOT[opts.priority];
  }

  // Hover effect
  root.addEventListener("mouseenter", () => {
    if (!destroyed) root.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
  });
  root.addEventListener("mouseleave", () => {
    if (!destroyed) root.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
  });

  // Click handler
  root.addEventListener("click", () => {
    if (isUnread) instance.markRead();
    opts.onClick?.();
  });

  // Auto dismiss
  function startAutoDismiss(): void {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    if (opts.autoDismiss > 0) {
      autoDismissTimer = setTimeout(() => instance.dismiss(), opts.autoDismiss);
    }
  }
  startAutoDismiss();

  // Instance
  const instance: NotificationCardInstance = {
    element: root,

    markRead() {
      isUnread = false;
      unreadDot.style.display = "none";
      opts.onRead?.();
    },

    markUnread() {
      isUnread = true;
      unreadDot.style.display = "";
    },

    update(updates) {
      if (updates.title !== undefined) titleEl.textContent = updates.title;
      if (updates.type !== undefined) {
        const newTs = TYPE_STYLES[updates.type];
        root.style.background = newTs.bg;
        root.style.borderColor = newTs.border;
        iconArea.style.background = newTs.iconBg;
        if (!opts.icon) iconArea.textContent = DEFAULT_ICONS[updates.type];
      }
      if (updates.message !== undefined) {
        const msgEl = content.querySelector(".nc-message") as HTMLElement;
        if (msgEl) msgEl.textContent = updates.message;
      }
      if (updates.timestamp !== undefined) {
        const tsEl = headerRow.querySelector(".nc-timestamp") as HTMLElement;
        if (tsEl) tsEl.textContent = updates.timestamp;
      }
    },

    dismiss() {
      if (destroyed) return;
      destroyed = true;
      if (autoDismissTimer) clearTimeout(autoDismissTimer);
      root.style.animation = "nc-slideOut 0.25s ease-in forwards";
      setTimeout(() => {
        root.remove();
        opts.onDismiss?.();
      }, 250);
    },

    destroy() {
      destroyed = true;
      if (autoDismissTimer) clearTimeout(autoDismissTimer);
      root.remove();
    },
  };

  return instance;
}
