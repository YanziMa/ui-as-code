/**
 * Notification Manager: In-app notification center with toast-style notifications,
 * notification list panel, read/unread states, action buttons, grouping,
 * persistence, and permission handling.
 */

// --- Types ---

export type NotificationType = "info" | "success" | "warning" | "error" | "default";
export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface NotificationAction {
  label: string;
  onClick: (notification: NotificationItem) => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export interface NotificationItem {
  /** Unique ID */
  id: string;
  /** Title */
  title: string;
  /** Body message */
  message?: string;
  /** Type/variant */
  type?: NotificationType;
  /** Priority level */
  priority?: NotificationPriority;
  /** Icon (emoji, SVG, or HTML) */
  icon?: string;
  /** Image/avatar URL */
  avatar?: string;
  /** Source/app name */
  source?: string;
  /** Timestamp (default: now) */
  timestamp?: number;
  /** Duration in ms before auto-dismiss (0 = persistent) */
  duration?: number;
  /** Action buttons */
  actions?: NotificationAction[];
  /** Link URL */
  url?: string;
  /** Read state */
  read?: boolean;
  /** Custom data payload */
  data?: Record<string, unknown>;
  /** HTML content instead of title+message */
  htmlContent?: string;
}

export interface NotificationCenterOptions {
  /** Container element or selector for the notification bell/badge area */
  container?: HTMLElement | string;
  /** Max visible toasts at once (default: 5) */
  maxVisible?: number;
  /** Position for toast notifications */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Show notification bell icon? */
  showBell?: boolean;
  /** Default duration in ms (default: 5000) */
  defaultDuration?: number;
  /** Enable sound? */
  enableSound?: boolean;
  /** Sound URL or beep pattern */
  soundUrl?: string;
  /** Vibrate on notification? */
  vibrate?: boolean;
  /** Persist notifications to localStorage? */
  persist?: boolean;
  /** Max persisted notifications (default: 100) */
  maxPersisted?: number;
  /** Callback when notification is added */
  onNotification?: (notification: NotificationItem) => void;
  /** Callback when notification is clicked */
  onClick?: (notification: NotificationItem) => void;
  /** Callback when notification is dismissed */
  onDismiss?: (notification: NotificationItem) => void;
  /** Callback when all notifications are cleared */
  onClear?: () => void;
  /** Custom render function */
  renderNotification?: (notification: NotificationItem) => HTMLElement;
  /** Custom CSS class */
  className?: string;
}

export interface NotificationCenterInstance {
  element: HTMLElement;
  /** Add a notification */
  notify: (notification: Omit<NotificationItem, "id">) => string; // returns ID
  /** Remove a notification by ID */
  remove: (id: string) => void;
  /** Mark as read */
  markRead: (id: string) => void;
  /** Mark all as read */
  markAllRead: () => void;
  /** Get unread count */
  getUnreadCount: () => number;
  /** Get all notifications */
  getAll: () => NotificationItem[];
  /** Get unread notifications */
  getUnread: () => NotificationItem[];
  /** Clear all notifications */
  clearAll: () => void;
  /** Open/close the notification panel/dropdown */
  togglePanel: () => void;
  /** Check if panel is open */
  isPanelOpen: () => boolean;
  /** Destroy instance */
  destroy: () => void;
}

// --- Type Config Maps ---

const TYPE_CONFIG: Record<NotificationType, { bg: string; border: string; color: string; iconBg: string; iconColor: string }> = {
  default: { bg: "#fff", border: "#e5e7eb", color: "#374151", iconBg: "#f3f4f6", iconColor: "#6b7280" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", iconBg: "#dbeafe", iconColor: "#2563eb" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", iconBg: "#dcfce7", iconColor: "#16a34a" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", iconBg: "#fef3c7", iconColor: "#d97706" },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", iconBg: "#fee2e2", iconColor: "#dc2626" },
};

const DEFAULT_ICONS: Record<string, string> = {
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 011.71 3h16.94a2 2 0 011.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
};

function generateId(): string {
  return `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Main Factory ---

export function createNotificationCenter(options: NotificationCenterOptions = {}): NotificationCenterInstance {
  const opts = {
    maxVisible: options.maxVisible ?? 5,
    position: options.position ?? "top-right",
    showBell: options.showBell ?? true,
    defaultDuration: options.defaultDuration ?? 5000,
    enableSound: options.enableSound ?? false,
    vibrate: options.vibrate ?? true,
    persist: options.persist ?? true,
    maxPersisted: options.maxPersisted ?? 100,
    className: options.className ?? "",
    ...options,
  };

  // Root container
  let container: HTMLElement;
  if (options.container) {
    container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
  } else {
    container = document.createElement("div");
    document.body.appendChild(container);
  }

  container.className = `nc-container ${opts.className}`;

  // State
  const notifications: NotificationItem[] = [];
  const activeToasts = new Map<string, HTMLElement>();
  const listeners = new Set<(notif: NotificationItem) => void>();
  let panelOpen = false;
  let panelEl: HTMLElement | null = null;
  let destroyed = false;

  // Load persisted
  if (opts.persist) {
    try {
      const saved = localStorage.getItem("nc_notifications");
      if (saved) {
        const parsed: NotificationItem[] = JSON.parse(saved);
        notifications.push(...parsed.slice(0, opts.maxPersisted));
      }
    } catch { /* ignore */ }
  }

  // Bell / trigger button
  const bellBtn = document.createElement("button");
  bellBtn.type = "button";
  bellBtn.className = "nc-bell";
  bellBtn.setAttribute("aria-label", "Notifications");
  bellBtn.style.cssText = `
    position:relative;display:flex;align-items:center;justify-content:center;
    width:32px;height:32px;border:none;background:none;cursor:pointer;
    border-radius:8px;transition:background 0.15s;padding:4px;
  `;
  bellBtn.addEventListener("click", () => instance.togglePanel());
  bellBtn.addEventListener("mouseenter", () => { bellBtn.style.background = "#f3f4f6"; });
  bellBtn.addEventListener("mouseleave", () => { bellBtn.style.background = ""; });
  container.appendChild(bellBtn);

  // Bell icon
  const bellIcon = document.createElement("span");
  bellIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-9 9s-9-2-9-9c0-2.03-.52-3.91-1.39-5.54"/><path d="M13.73 21a2 2 0 0 1-2.92 0 9.96 9.96 0 0 0 14-14 9.96 9.96 0 0 0-14-14 2 2 0 0 1 2.92 0z"/></svg>`;
  bellIcon.style.cssText = "color:#6b7280;";
  bellBtn.appendChild(bellIcon);

  // Unread badge
  const badgeEl = document.createElement("span");
  badgeEl.className = "nc-badge";
  badgeEl.style.cssText = `
    position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;
    background:#ef4444;color:#fff;font-size:11px;font-weight:600;
    border-radius:9px;display:flex;align-items:center;justify-content:center;
    padding:0 5px;opacity:0;transition:opacity 0.15s;
  `;
  bellBtn.appendChild(badgeEl);

  // Toast container
  const toastContainer = document.createElement("div");
  toastContainer.className = "nc-toasts";
  toastContainer.style.cssText = `
    position:fixed;z-index:99998;display:flex;flex-direction:column;gap:8px;
    pointer-events:none;${getPositionStyles(opts.position)}padding:16px;
  `;
  document.body.appendChild(toastContainer);

  updateBadge();

  // --- Internal Functions ---

  function getPositionStyles(pos: string): string {
    switch (pos) {
      case "top-right": return "top:16px;right:16px;";
      case "top-left": return "top:16px;left:16px;";
      case "bottom-right": return "bottom:16px;right:16px;";
      case "bottom-left": return "bottom:16px;left:16px;";
    }
  }

  function updateBadge(): void {
    const unread = notifications.filter((n) => !n.read).length;
    if (unread > 0) {
      badgeEl.textContent = String(unread > 99 ? "99+" : unread);
      badgeEl.style.opacity = "1";
    } else {
      badgeEl.style.opacity = "0";
    }
  }

  function persistState(): void {
    if (!opts.persist) return;
    try {
      localStorage.setItem("nc_notifications", JSON.stringify(notifications.slice(0, opts.maxPersisted)));
    } catch { /* ignore */ }
  }

  function playNotificationSound(): void {
    if (!opts.enableSound) return;
    if (opts.soundUrl) {
      try {
        const audio = new Audio(opts.soundUrl);
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch {}
    }
    if (navigator.vibrate && opts.vibrate) {
      navigator.vibrate(200);
    }
  }

  function createToastElement(notification: NotificationItem): HTMLElement {
    if (opts.renderNotification) return opts.renderNotification(notification);

    const tc = TYPE_CONFIG[notification.type ?? "default"];
    const el = document.createElement("div");
    el.dataset.notifId = notification.id;
    el.style.cssText = `
      pointer-events:auto;background:${tc.bg};border:1px solid ${tc.border};
      border-radius:10px;padding:12px 16px;box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);
      display:flex;align-items:flex-start;gap:12px;min-width:300px;max-width:420px;
      color:${tc.color};font-size:13px;line-height:1.5;animation:nc-slide-in 0.25s ease-out;
      font-family:-apple-system,sans-serif;
    `;

    // Icon
    const iconWrap = document.createElement("div");
    iconWrap.style.cssText = `flex-shrink:0;width:28px;height:28px;border-radius:50%;background:${tc.iconBg};display:flex;align-items:center;justify-content:center;color:${tc.iconColor};`;
    iconWrap.innerHTML = notification.icon ?? DEFAULT_ICONS[notification.type ?? "default"] ?? "";
    el.appendChild(iconWrap);

    // Content
    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;";

    if (notification.htmlContent) {
      content.innerHTML = notification.htmlContent;
    } else {
      const titleEl = document.createElement("div");
      titleEl.style.cssText = "font-weight:600;font-size:13px;margin-bottom:2px;";
      titleEl.textContent = notification.title;
      content.appendChild(titleEl);

      if (notification.message) {
        const msgEl = document.createElement("div");
        msgEl.style.cssText = "font-size:12px;color:#6b7280;word-break:break-word;";
        msgEl.textContent = notification.message;
        content.appendChild(msgEl);
      }
    }

    // Actions
    if (notification.actions?.length) {
      const actionsRow = document.createElement("div");
      actionsRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
      for (const action of notification.actions) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = action.label;
        btn.style.cssText = action.variant === "primary"
          ? "padding:4px 12px;border-radius:6px;background:#4338ca;color:#fff;border:none;font-size:12px;"
          : action.variant === "danger"
            ? "padding:4px 12px;border-radius:6px;background:#ef4444;color:#fff;border:none;font-size:12px;"
            : "padding:4px 12px;border-radius:6px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;font-size:12px;";
        btn.addEventListener("click", (e) => { e.stopPropagation(); action.onClick(notification); });
        actionsRow.appendChild(btn);
      }
      content.appendChild(actionsRow);
    }

    // Timestamp
    const timeEl = document.createElement("span");
    timeEl.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;white-space:nowrap;flex-shrink:0;";
    const ts = notification.timestamp ?? Date.now();
    timeEl.textContent = formatTimeAgo(ts);
    el.appendChild(timeEl);

    el.appendChild(content);

    // Click handler
    el.addEventListener("click", () => {
      opts.onClick?.(notification);
      if (notification.url) window.open(notification.url, "_blank");
    });

    return el;
  }

  function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  }

  function showToast(notification: NotificationItem): void {
    const el = createToastElement(notification);
    toastContainer.appendChild(el);
    activeToasts.set(notification.id, el);

    playNotificationSound();
    updateBadge();

    // Auto-dismiss
    const duration = notification.duration ?? opts.defaultDuration;
    if (duration > 0) {
      setTimeout(() => dismissToast(notification.id), duration);
    }
  }

  function dismissToast(id: string): void {
    const el = activeToasts.get(id);
    if (!el) return;
    el.style.animation = "nc-slide-out 0.2s ease-in forwards";
    setTimeout(() => {
      el.remove();
      activeToasts.delete(id);
    }, 200);
  }

  function renderPanel(): void {
    if (panelEl) { panelEl.remove(); panelEl = null; }

    panelEl = document.createElement("div");
    panelEl.className = "nc-panel";
    panelEl.style.cssText = `
      position:absolute;top:100%;right:0;width:360px;max-height:480px;
      background:#fff;border:1px solid #e5e7eb;border-radius:12px;
      box-shadow:0 16px 48px rgba(0,0,0,0.15);z-index:99997;
      display:flex;flex-direction:column;font-family:-apple-system,sans-serif;
      animation:nc-slide-in 0.15s ease-out;overflow:hidden;
    `;

    // Header
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f0f0f0;";
    header.innerHTML = `<span style="font-weight:600;font-size:14px;">Notifications</span>
      <button id="nc-mark-all-read" style="padding:4px 12px;border-radius:6px;border:1px solid #d1d5db;background:#fff;font-size:12px;cursor:pointer;">Mark all read</button>`;
    panelEl.appendChild(header);

    header.querySelector("#nc-mark-all-read")!.addEventListener("click", () => {
      instance.markAllRead();
    });

    // List
    const list = document.createElement("div");
    list.style.cssText = "overflow-y:auto;flex:1;padding:8px;max-height:380px;";

    if (notifications.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:32px;color:#9ca3af;font-size:13px;">No notifications</div>';
    } else {
      // Sort by timestamp desc
      const sorted = [...notifications].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
      for (const notif of sorted) {
        const item = document.createElement("div");
        item.style.cssText = `
          display:flex;gap:10px;padding:10px;border-radius:8px;cursor:pointer;
          transition:background 0.1s;${!notif.read ? "background:#eff6ff;" : ""}
        `;
        item.addEventListener("click", () => { opts.onClick?.(notif); if (notif.url) window.open(notif.url, "_blank"); });

        const dot = document.createElement("div");
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;background:${notif.read ? "#d1d5db" : "#3b82f6"};`;
        item.appendChild(dot);

        const text = document.createElement("div");
        text.style.cssText = "flex:1;min-width:0;";
        text.innerHTML = `<div style="font-weight:500;font-size:13px;color:#111827;">${escapeHtml(notif.title)}</div>
          ${notif.message ? `<div style="font-size:12px;color:#6b7280;margin-top:1px;">${escapeHtml(notif.message)}</div>` : ""}`;
        item.appendChild(text);

        list.appendChild(item);
      }
    }

    panelEl.appendChild(list);
    container.appendChild(panelEl);
  }

  // Inject styles
  if (!document.getElementById("nc-styles")) {
    const s = document.createElement("style");
    s.id = "nc-styles";
    s.textContent = `
      @keyframes nc-slide-in{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes nc-slide-out{from{opacity:1}to{opacity:0;transform:translateY(-8px)}}
    `;
    document.head.appendChild(s);
  }

  // --- Instance ---

  const instance: NotificationCenterInstance = {
    element: container,

    notify(notification): string {
      if (destroyed) return "";
      const id = notification.id ?? generateId();
      const notif: NotificationItem = {
        ...notification,
        id,
        type: notification.type ?? "default",
        priority: notification.priority ?? "medium",
        timestamp: notification.timestamp ?? Date.now(),
        read: notification.read ?? false,
      };

      notifications.unshift(notif);
      if (notifications.length > 500) notifications.pop();

      persistState();
      opts.onNotification?.(notif);
      listeners.forEach((l) => l(notif));

      // Show toast (respecting maxVisible)
      if (activeToasts.size < opts.maxVisible) {
        showToast(notif);
      }

      updateBadge();
      return id;
    },

    remove(id: string) {
      const idx = notifications.findIndex((n) => n.id === id);
      if (idx >= 0) notifications.splice(idx, 1);
      dismissToast(id);
      persistState();
      updateBadge();
    },

    markRead(id: string) {
      const notif = notifications.find((n) => n.id === id);
      if (notif && !notif.read) {
        notif.read = true;
        persistState();
        updateBadge();
      }
    },

    markAllRead() {
      for (const n of notifications) n.read = true;
      persistState();
      updateBadge();
    },

    getUnreadCount() { return notifications.filter((n) => !n.read).length; },

    getAll() { return [...notifications]; },

    getUnread() { return notifications.filter((n) => !n.read); },

    clearAll() {
      notifications.length = 0;
      for (const [, el] of activeToasts) el.remove();
      activeToasts.clear();
      persistState();
      updateBadge();
      opts.onClear?.();
    },

    togglePanel() {
      panelOpen = !panelOpen;
      if (panelOpen) renderPanel(); else if (panelEl) { panelEl.remove(); panelEl = null; }
    },

    isPanelOpen() { return panelOpen; },

    destroy() {
      destroyed = true;
      toastContainer.remove();
      panelEl?.remove();
      bellBtn.remove();
    },
  };

  return instance;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
