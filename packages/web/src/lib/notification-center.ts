/**
 * Notification Center: Inbox-style notification list with grouped display,
 * mark-as-read, mark-all-read, filter by type, unread badge, time-relative
 * timestamps, action buttons, and empty state.
 */

// --- Types ---

export type NotificationType = "info" | "success" | "warning" | "error" | "mention" | "update";

export interface NotificationItem {
  /** Unique ID */
  id: string;
  /** Title */
  title: string;
  /** Body/description text */
  body?: string;
  /** Notification type for icon/color */
  type?: NotificationType;
  /** ISO timestamp */
  createdAt: string;
  /** Read status */
  read: boolean;
  /** Action URL or callback */
  actionUrl?: string;
  /** Action label (e.g., "View", "Reply") */
  actionLabel?: string;
  /** Avatar URL or initials fallback */
  avatarUrl?: string;
  /** Sender name */
  senderName?: string;
  /** Custom data */
  data?: Record<string, unknown>;
}

export interface NotificationCenterOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Notifications data */
  notifications?: NotificationItem[];
  /** Group by date? (Today, Yesterday, Earlier) */
  groupByDate?: boolean;
  /** Max visible items before "show more" */
  maxVisible?: number;
  /** Show unread count badge? */
  showUnreadBadge?: boolean;
  /** Show timestamps? */
  showTimestamps?: true;
  /** Show avatars? */
  showAvatars?: boolean;
  /** Filter by type initially */
  initialFilter?: NotificationType | "all";
  /** Callback on notification click */
  onClick?: (item: NotificationItem) => void;
  /** Callback on action button click */
  onAction?: (item: NotificationItem) => void;
  /** Callback on mark as read */
  onMarkRead?: (ids: string[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface NotificationCenterInstance {
  element: HTMLElement;
  getNotifications: () => NotificationItem[];
  addNotification: (item: NotificationItem) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setFilter: (type: NotificationType | "all") => void;
  getUnreadCount: () => number;
  clear: () => void;
  destroy: () => void;
}

// --- Helpers ---

const TYPE_CONFIG: Record<NotificationType, { color: string; bg: string; icon: string }> = {
  info:    { color: "#3b82f6", bg: "#eff6ff", icon: "\u2139\uFE0F" },
  success: { color: "#22c55e", bg: "#f0fdf4", icon: "\u2705" },
  warning: { color: "#f59e0b", bg: "#fffbeb", icon: "\u26A0\uFE0F" },
  error:   { color: "#ef4444", bg: "#fef2f2", icon: "\u{1F6AB}" },
  mention: { color: "#8b5cf6", bg: "#f5f3ff", icon: "@" },
  update:  { color: "#06b6d4", bg: "#ecfeff", icon: "\u{1F504}" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  return "Earlier";
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

// --- Main Class ---

export class NotificationCenterManager {
  create(options: NotificationCenterOptions): NotificationCenterInstance {
    const opts = {
      groupByDate: options.groupByDate ?? true,
      maxVisible: options.maxVisible ?? 20,
      showUnreadBadge: options.showUnreadBadge ?? true,
      showTimestamps: options.showTimestamps ?? true,
      showAvatars: options.showAvatars ?? true,
      initialFilter: options.initialFilter ?? "all",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("NotificationCenter: container not found");

    container.className = `notification-center ${opts.className ?? ""}`;
    let notifications: NotificationItem[] = opts.notifications ?? [];
    let currentFilter: NotificationType | "all" = opts.initialFilter;
    let destroyed = false;

    function render(): void {
      container.innerHTML = "";

      // Header bar
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
        border-bottom:1px solid #e5e7eb;background:#fafafa;border-radius:10px 10px 0 0;
      `;

      // Left: title + unread count
      const leftSide = document.createElement("div");
      leftSide.style.cssText = "display:flex;align-items:center;gap:8px;";

      const titleEl = document.createElement("span");
      titleEl.style.cssText = "font-size:14px;font-weight:600;color:#111827;";
      titleEl.textContent = "Notifications";
      leftSide.appendChild(titleEl);

      const unreadCount = notifications.filter((n) => !n.read).length;
      if (unreadCount > 0 && opts.showUnreadBadge) {
        const badge = document.createElement("span");
        badge.style.cssText = `
          background:#ef4444;color:#fff;font-size:11px;font-weight:600;
          padding:1px 7px;border-radius:10px;min-width:18px;text-align:center;
        `;
        badge.textContent = String(unreadCount > 99 ? "99+" : unreadCount);
        leftSide.appendChild(badge);
      }

      header.appendChild(leftSide);

      // Right: actions
      const rightSide = document.createElement("div");
      rightSide.style.cssText = "display:flex;align-items:center;gap:8px;";

      // Mark all read button
      if (unreadCount > 0) {
        const markAllBtn = document.createElement("button");
        markAllBtn.type = "button";
        markAllBtn.textContent = "Mark all read";
        markAllBtn.style.cssText = `
          background:none;border:none;font-size:12px;color:#4338ca;cursor:pointer;
          padding:2px 8px;border-radius:4px;
        `;
        markAllBtn.addEventListener("click", () => instance.markAllAsRead());
        markAllBtn.addEventListener("mouseenter", () => { markAllBtn.style.background = "#eef2ff"; });
        markAllBtn.addEventListener("mouseleave", () => { markAllBtn.style.background = ""; });
        rightSide.appendChild(markAllBtn);
      }

      header.appendChild(rightSide);
      container.appendChild(header);

      // Filter tabs
      const filterTypes: Array<NotificationType | "all"> = ["all", "info", "success", "warning", "error", "mention"];
      const filterBar = document.createElement("div");
      filterBar.style.cssText = "display:flex;gap:4px;padding:8px 16px;border-bottom:1px solid #f3f4f6;flex-wrap:wrap;";

      for (const ft of filterTypes) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.textContent = ft === "all" ? "All" : ft.charAt(0).toUpperCase() + ft.slice(1);
        tab.dataset.filter = ft;
        tab.style.cssText = `
          padding:4px 12px;border-radius:14px;font-size:12px;font-weight:500;border:none;
          cursor:pointer;transition:all 0.15s;
          ${currentFilter === ft
            ? "background:#4338ca;color:#fff;"
            : "background:transparent;color:#6b7280;"}
        `;
        tab.addEventListener("click", () => {
          currentFilter = ft;
          render();
        });
        tab.addEventListener("mouseenter", () => {
          if (currentFilter !== ft) tab.style.background = "#f3f4f6";
        });
        tab.addEventListener("mouseleave", () => {
          if (currentFilter !== ft) tab.style.background = "";
        });
        filterBar.appendChild(tab);
      }

      container.appendChild(filterBar);

      // Filtered + sorted notifications
      let filtered = [...notifications];
      if (currentFilter !== "all") {
        filtered = filtered.filter((n) => n.type === currentFilter);
      }
      // Sort: unread first, then by date descending
      filtered.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Limit visible
      const showMore = filtered.length > opts.maxVisible;
      const visible = showMore ? filtered.slice(0, opts.maxVisible) : filtered;

      // List area
      const listArea = document.createElement("div");
      listArea.className = "nc-list";
      listArea.style.cssText = "max-height:500px;overflow-y:auto;";

      if (visible.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "text-align:center;padding:48px 24px;color:#9ca3af;";
        empty.innerHTML = `<div style="font-size:40px;margin-bottom:8px;">\u{1F4E4}</div><div style="font-size:13px;">No notifications</div>`;
        listArea.appendChild(empty);
      } else if (opts.groupByDate) {
        const groups = new Map<string, NotificationItem[]>();
        for (const n of visible) {
          const group = getDateGroup(n.createdAt);
          if (!groups.has(group)) groups.set(group, []);
          groups.get(group)!.push(n);
        }

        for (const [groupLabel, items] of groups) {
          // Group header
          const gHeader = document.createElement("div");
          gHeader.style.cssText = `
            padding:10px 16px 4px;font-size:11px;font-weight:600;color:#9ca3af;
            text-transform:uppercase;letter-spacing:0.05em;
          `;
          gHeader.textContent = groupLabel;
          listArea.appendChild(gHeader);

          for (const item of items) {
            listArea.appendChild(renderItem(item));
          }
        }
      } else {
        for (const item of visible) {
          listArea.appendChild(renderItem(item));
        }
      }

      container.appendChild(listArea);

      // Show more
      if (showMore) {
        const moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.textContent = `Show ${filtered.length - opts.maxVisible} more`;
        moreBtn.style.cssText = `
          width:100%;padding:10px;border:none;background:none;color:#4338ca;
          font-size:13px;font-weight:500;cursor:pointer;border-top:1px solid #e5e7eb;
        `;
        moreBtn.addEventListener("click", () => {
          opts.maxVisible += 20;
          render();
        });
        container.appendChild(moreBtn);
      }
    }

    function renderItem(item: NotificationItem): HTMLElement {
      const tc = TYPE_CONFIG[item.type ?? "info"];

      const row = document.createElement("div");
      row.className = `nc-item${item.read ? "" : " nc-item-unread"}`;
      row.dataset.id = item.id;
      row.style.cssText = `
        display:flex;align-items:flex-start;gap:10px;padding:10px 16px;
        cursor:pointer;border-bottom:1px solid #f3f4f6;
        transition:background 0.15s;${!item.read ? "background:#fafbff;" : ""}
      `;

      row.addEventListener("mouseenter", () => { row.style.background = "#f9fafb"; });
      row.addEventListener("mouseleave", () => { row.style.background = item.read ? "" : "#fafbff"; });

      // Unread dot
      if (!item.read) {
        const dot = document.createElement("span");
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${tc.color};flex-shrink:0;margin-top:6px;`;
        row.appendChild(dot);
      } else if (opts.showAvatars) {
        const spacer = document.createElement("span");
        spacer.style.cssText = "width:8px;flex-shrink:0;";
        row.appendChild(spacer);
      }

      // Type icon / avatar
      if (opts.showAvatars && item.avatarUrl) {
        const avatar = document.createElement("img");
        avatar.src = item.avatarUrl;
        avatar.alt = "";
        avatar.style.cssText = "width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;";
        row.appendChild(avatar);
      } else if (opts.showAvatars && item.senderName) {
        const avatarInitial = document.createElement("span");
        avatarInitial.style.cssText = `
          width:36px;height:36px;border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:12px;font-weight:600;color:#fff;
          background:hsl(${hashCode(item.senderName)} % 360, 65%, 55%);flex-shrink:0;
        `;
        avatarInitial.textContent = item.senderName.charAt(0).toUpperCase();
        row.appendChild(avatarInitial);
      } else {
        const typeIcon = document.createElement("span");
        typeIcon.style.cssText = `
          width:36px;height:36px;border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:15px;background:${tc.bg};flex-shrink:0;
        `;
        typeIcon.textContent = tc.icon;
        row.appendChild(typeIcon);
      }

      // Content
      const content = document.createElement("div");
      content.style.cssText = "flex:1;min-width:0;";

      const titleRow = document.createElement("div");
      titleRow.style.cssText = "display:flex;align-items:center;gap:6px;";

      const titleEl = document.createElement("span");
      titleEl.style.cssText = `font-size:13px;font-weight:${item.read ? "400" : "600"};color:#111827;`;
      titleEl.textContent = item.title;
      titleRow.appendChild(titleEl);

      content.appendChild(titleRow);

      if (item.body) {
        const bodyEl = document.createElement("p");
        bodyEl.style.cssText = "font-size:12px;color:#6b7280;margin:2px 0 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;";
        bodyEl.textContent = item.body;
        content.appendChild(bodyEl);
      }

      // Meta row: timestamp + action
      const metaRow = document.createElement("div");
      metaRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-top:4px;";

      if (opts.showTimestamps) {
        const ts = document.createElement("span");
        ts.style.cssText = "font-size:11px;color:#9ca3af;";
        ts.textContent = timeAgo(item.createdAt);
        metaRow.appendChild(ts);
      }

      if (item.actionLabel) {
        const actionBtn = document.createElement("button");
        actionBtn.type = "button";
        actionBtn.textContent = item.actionLabel;
        actionBtn.style.cssText = `
          font-size:11px;font-weight:500;color:#4338ca;background:none;border:none;
          cursor:pointer;padding:2px 8px;border-radius:4px;
        `;
        actionBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          opts.onAction?.(item);
        });
        metaRow.appendChild(actionBtn);
      }

      content.appendChild(metaRow);
      row.appendChild(content);

      // Click handler
      row.addEventListener("click", () => {
        if (!item.read) instance.markAsRead(item.id);
        opts.onClick?.(item);
        if (item.actionUrl) window.open(item.actionUrl, "_blank");
      });

      return row;
    }

    // Initial render
    render();

    const instance: NotificationCenterInstance = {
      element: container,

      getNotifications() { return [...notifications]; },

      addNotification(item: NotificationItem) {
        notifications.unshift(item);
        render();
      },

      removeNotification(id: string) {
        notifications = notifications.filter((n) => n.id !== id);
        render();
      },

      markAsRead(id: string) {
        const item = notifications.find((n) => n.id === id);
        if (item && !item.read) {
          item.read = true;
          opts.onMarkRead?.([id]);
          render();
        }
      },

      markAllAsRead() {
        const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
        for (const n of notifications) n.read = true;
        opts.onMarkRead?.(unreadIds);
        render();
      },

      setFilter(type: NotificationType | "all") {
        currentFilter = type;
        render();
      },

      getUnreadCount() {
        return notifications.filter((n) => !n.read).length;
      },

      clear() {
        notifications = [];
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a notification center */
export function createNotificationCenter(options: NotificationCenterOptions): NotificationCenterInstance {
  return new NotificationCenterManager().create(options);
}
