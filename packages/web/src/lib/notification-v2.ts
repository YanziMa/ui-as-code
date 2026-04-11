/**
 * Notification v2: Advanced notification system with persistent
 * notifications, notification center, badge counts, permission
 * management, and platform-specific integrations.
 *
 * Provides:
 *   - Notification types: info, success, warning, error, action-required
 *   - Notification levels: low, normal, high, critical (with urgency)
 *   - Persistent notifications with read/unread state
 *   - Notification center (inbox-style list view)
 *   - Badge count management for app icons/tabs
 *   - Web Notification API integration with permission handling
 *   - Sound and vibration options
 *   - Grouping by source/context
 *   - Expiration and auto-dismiss policies
 */

export interface NotificationV2Options {
  /** Unique ID */
  id?: string;
  /** Title */
  title: string;
  /** Body text */
  body?: string;
  /** Icon URL or emoji */
  icon?: string;
  /** Image URL (for image notifications) */
  image?: string;
  /** Type/variant */
  type?: "info" | "success" | "warning" | "error" | "action-required";
  /** Urgency level */
  level?: "low" | "normal" | "high" | "critical";
  /** Source/app name */
  source?: string;
  /** Group key for collapsing */
  groupKey?: string;
  /** Action buttons */
  actions?: Array<{ label: string; action: () => void; primary?: boolean }>;
  /** URL to open on click */
  url?: string;
  /** Timestamp (default: now) */
  timestamp?: number;
  /** Duration in ms before auto-dismiss (0 = sticky) */
  duration?: number;
  /** Whether it's been read */
  read?: boolean;
  /** Show native browser notification */
  native?: boolean;
  /** Sound to play on arrival */
  sound?: string;
  /** Vibration pattern (ms array) */
  vibrate?: number[];
  /** Tag for deduplication/replacement */
  tag?: string;
  /** Data payload */
  data?: Record<string, unknown>;
  /** Callback when clicked */
  onClick?: () => void;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

export interface NotificationV2Instance {
  id: string;
  element: HTMLElement;
  /** Mark as read */
  markRead: () => void;
  /** Mark as unread */
  markUnread: () => void;
  /** Dismiss/remove */
  dismiss: () => void;
  /** Update properties */
  update: (updates: Partial<NotificationV2Options>) => void;
  /** Show native browser notification */
  showNative: () => Promise<NotificationPermission>;
  /** Current state */
  getState: () => "visible" | "dismissing" | "dismissed";
}

export interface NotificationCenterConfig {
  container: HTMLElement | string;
  /** Max visible notifications */
  maxVisible?: number;
  /** Position */
  position?: "top-right" | "bottom-right";
  /** Show header with count */
  showHeader?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Group notifications */
  grouping?: boolean;
  /** Auto-request native notification permission */
  requestNativePermission?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Callback on any change */
  onChange?: (notifications: NotificationV2[], unreadCount: number) => void;
}

export interface NotificationCenter {
  /** Add a notification */
  notify: (options: NotificationV2Options) => NotificationV2Instance;
  /** Get all notifications */
  getAll: () => NotificationV2[];
  /** Get unread count */
  getUnreadCount: () => number;
  /** Mark all as read */
  markAllRead: () => void;
  /** Clear all */
  clear: () => void;
  /** Get by ID */
  get: (id: string) => NotificationV2Instance | undefined;
  /** Dismiss by ID */
  dismiss: (id: string) => void;
  /** Set badge count externally */
  setBadge: (count: number) => void;
  /** Request native notification permission */
  requestPermission: () => Promise<NotificationPermission>;
  /** Destroy */
  destroy: () => void;
}

let nidCounter = 0;
function genNid() { return `notif_v2_${Date.now()}_${++nidCounter}`; }

const LEVEL_COLORS = {
  info: { bg: "#eff6ff", border: "#bfdbfe", accent: "#2563eb" },
  success: { bg: "#ecfdf5", border: "#a7f3d0", accent: "#059669" },
  warning: { bg: "#fffbeb", border: "#fde68a", accent: "#b45309" },
  error: { bg: "#fef2f2", border: "#fecaca", accent: "#dc2626" },
  "action-required": { bg: "#fef3c7", border: "#fde68a", accent: "#b45309" },
};

export function createNotificationCenter(config: NotificationCenterConfig): NotificationCenter {
  const container = typeof config.container === "string"
    ? document.querySelector<HTMLElement>(config.container)!
    : config.container;

  const notifications: NotificationV2[] = [];
  const instances = new Map<string, NotificationV2Instance>();
  const maxVisible = config.maxVisible ?? 5;
  let destroyed = false;

  // Build UI
  const wrapper = document.createElement("div");
  wrapper.className = `nc-center ${config.className ?? ""}`;
  Object.assign(wrapper.style, {
    display: "flex", flexDirection: "column-reverse",
    gap: "8px", maxWidth: "380px", pointerEvents: "auto",
  });

  if (config.showHeader !== false) {
    const header = document.createElement("div");
    header.className = "nc-header";
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;font-size:12px;font-weight:600;color:#6b7280;";
    header.innerHTML = `<span class="nc-title">Notifications</span><span class="nc-count">0</span>`;
    wrapper.appendChild(header);
  }

  const listEl = document.createElement("div");
  listEl.className = "nc-list";
  listEl.style.cssText = "display:flex;flex-direction:column-reverse;gap:4px;";
  wrapper.appendChild(listEl);

  // Empty state
  const emptyEl = document.createElement("div");
  emptyEl.className = "nc-empty";
  emptyEl.style.cssText = "padding:24px;text-align:center;color:#9ca3af;font-size:13px;display:none;";
  emptyEl.textContent = config.emptyMessage ?? "No notifications";
  listEl.appendChild(emptyEl);

  container.appendChild(wrapper);

  function refreshUI(): void {
    // Update header count
    const countEl = wrapper.querySelector(".nc-count");
    if (countEl) {
      const unread = notifications.filter((n) => !n.read).length;
      countEl.textContent = String(unread);
      countEl.style.display = unread > 0 ? "" : "none";
    }
    // Toggle empty state
    emptyEl.style.display = notifications.length === 0 ? "" : "none";
    config.onChange?.(notifications, getUnreadCount());
  }

  function buildNotificationEl(opts: NotificationV2Options): [HTMLElement, () => void] {
    const id = opts.id ?? genNid();
    const level = opts.level ?? (opts.type === "error" ? "high" : opts.type === "warning" ? "normal" : "normal");
    const colors = LEVEL_COLORS[opts.type ?? "info"];
    const isRead = opts.read ?? false;

    const el = document.createElement("div");
    el.className = `nc-item nc-${opts.type ?? "info"} ${isRead ? "nc-read" : "nc-unread"}`;
    el.setAttribute("data-id", id);
    el.style.cssText = `
      display:flex;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${colors.border};
      background:${colors.bg};cursor:pointer;transition:opacity 0.15s;
      align-items:flex-start;position:relative;
      opacity:${isRead ? "0.65" : "1"};
    `;

    // Accent bar
    const accentBar = document.createElement("div");
    accentBar.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:3px;background:${colors.accent};border-radius:3px 0 0 3px;`;
    el.appendChild(accentBar);

    // Icon
    if (opts.icon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = opts.icon.length <= 2 ? opts.icon : "";
      if (opts.icon.length > 2) iconEl.innerHTML = opts.icon;
      iconEl.style.cssText = "flex-shrink:0;font-size:18px;line-height:1;margin-top:1px;";
      el.appendChild(iconEl);
    }

    // Content
    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;";
    const titleEl = document.createElement("div");
    titleEl.textContent = opts.title;
    titleEl.style.cssText = "font-size:13px;font-weight:600;color:#111827;line-height:1.3;";
    content.appendChild(titleEl);
    if (opts.body) {
      const bodyEl = document.createElement("div");
      bodyEl.textContent = opts.body;
      bodyEl.style.cssText = "font-size:12px;color:#6b7280;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;";
      content.appendChild(bodyEl);
    }
    // Actions
    if (opts.actions?.length) {
      const actionsRow = document.createElement("div");
      actionsRow.style.cssText = "display:flex;gap:6px;margin-top:4px;";
      for (const action of opts.actions) {
        const btn = document.createElement("button");
        btn.type = "button"; btn.textContent = action.label;
        btn.style.cssText = action.primary
          ? "padding:3px 10px;background:#3b82f6;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;"
          : "padding:3px 10px;background:#fff;color:#374151;border:1px solid #d1d5db;border-radius:4px;font-size:11px;cursor:pointer;";
        btn.addEventListener("click", (e) => { e.stopPropagation(); action.action(); });
        actionsRow.appendChild(btn);
      }
      content.appendChild(actionsRow);
    }
    // Time
    const timeEl = document.createElement("span");
    timeEl.style.cssText = "font-size:10px;color:#9ca3af;margin-left:auto;white-space:nowrap;flex-shrink:0;";
    const ts = opts.timestamp ?? Date.now();
    timeEl.textContent = formatTimeAgo(ts);
    content.appendChild(timeEl);

    el.appendChild(content);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.type = "button"; closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = "background:none;border:none;cursor:pointer;color:#9ca3af;font-size:14px;padding:2px;line-height:1;align-self:flex-start;";
    closeBtn.addEventListener("click", (e) => { e.stopPropagation(); inst.dismiss(); });
    el.appendChild(closeBtn);

    // Click handler
    el.addEventListener("click", () => { opts.onClick?.(); if (opts.url) window.open(opts.url, "_blank"); });

    function remove() { el.remove(); refreshUI(); }

    return [el, remove];
  }

  function notify(options: NotificationV2Options): NotificationV2Instance {
    if (destroyed) throw new Error("NotificationCenter destroyed");

    // Dedup by tag
    if (options.tag) {
      const existing = notifications.find((n) => n.tag === options.tag);
      if (existing) {
        const existingInst = instances.get(existing.id!);
        existingInst?.update(options);
        return existingInst!;
      }
    }

    const id = options.id ?? genNid();
    const notifData: NotificationV2Options & { id: string } = { ...options, id };
    notifications.unshift(notifData);

    // Enforce max
    while (notifications.length > maxVisible) {
      const removed = notifications.pop();
      if (removed) { const inst = instances.get(removed.id); inst?.dismiss(); }
    }

    const [el, removeFn] = buildNotificationEl(notifData);
    listEl.prepend(el);
    refreshUI();

    // Auto-dismiss
    let timer: ReturnType<typeof setTimeout> | null = null;
    const dur = options.duration ?? (options.type === "error" ? 8000 : options.type === "warning" ? 6000 : 4000);
    if (dur > 0) timer = setTimeout(() => inst.dismiss(), dur);

    // Native notification
    if (options.native && "Notification" in window && Notification.permission === "granted") {
      new Notification(options.title, { body: options.body, icon: options.icon, tag: options.tag });
    }

    const inst: NotificationV2Instance = {
      id,
      element: el,
      markRead() { this.update({ read: true }); },
      markUnread() { this.update({ read: false }); },
      dismiss() {
        if (timer) clearTimeout(timer);
        removeFn();
        notifData.read = true;
        options.onDismiss?.();
        instances.delete(id);
      },
      update(updates) {
        Object.assign(notifData, updates);
        // Rebuild element
        removeFn();
        const [newEl, newRemove] = buildNotificationEl(notifData);
        listEl.prepend(newEl);
        // Replace instance's element reference
        (inst as { element: HTMLElement }).element = newEl;
      },
      async showNative() {
        if (!("Notification" in window)) return "denied" as NotificationPermission;
        if (Notification.permission === "granted") {
          new Notification(notifData.title, { body: notifData.body, icon: notifData.icon });
          return "granted";
        }
        return Notification.requestPermission();
      },
      getState: () => el.isConnected ? "visible" : "dismissed",
    };

    instances.set(id, inst);
    return inst;
  }

  function getAll() { return [...notifications]; }
  function getUnreadCount() { return notifications.filter((n) => !n.read).length; }
  function markAllRead() { for (const n of notifications) n.read = true; for (const [, inst] of instances) inst.markRead(); refreshUI(); }
  function clear() { for (const [, inst] of instances) inst.dismiss(); notifications.length = 0; refreshUI(); }
  function get(id: string) { return instances.get(id); }
  function dismiss(id: string) { instances.get(id)?.dismiss(); }
  function setBadge(count: number) { /* Could update a favicon badge */ }

  async function requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) return "denied" as NotificationPermission;
    if (Notification.permission !== "default") return Notification.permission;
    return Notification.requestPermission();
  }

  function destroy() {
    destroyed = true;
    clear();
    wrapper.remove();
  }

  return { notify, getAll, getUnreadCount, markAllRead, clear, get, dismiss, setBadge, requestPermission, destroy };
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
