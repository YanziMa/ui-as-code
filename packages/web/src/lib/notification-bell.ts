/**
 * Notification Bell: Bell icon with unread count badge, dropdown panel
 * with notification list, mark-as-read, mark-all-read, actions,
 * and empty state.
 */

// --- Types ---

export interface NotificationItem {
  /** Unique ID */
  id: string;
  /** Title text */
  title: string;
  /** Description/subtitle */
  description?: string;
  /** Icon/emoji */
  icon?: string;
  /** Timestamp (Date object or ISO string or ms timestamp) */
  timestamp?: Date | string | number;
  /** Read status */
  read?: boolean;
  /** URL to navigate on click */
  url?: string;
  /** Action label */
  actionLabel?: string;
  /** Action callback */
  onAction?: () => void;
  /** Category/group */
  category?: string;
  /** Priority for sorting ("high" | "normal" | "low") */
  priority?: "high" | "normal" | "low";
}

export interface NotificationBellOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Bell trigger element or selector (if separate from container) */
  trigger?: HTMLElement | string;
  /** Notifications array */
  notifications?: NotificationItem[];
  /** Max visible notifications in dropdown */
  maxVisible?: number;
  /** Show unread count badge? */
  showBadge?: boolean;
  /** Badge max value display (e.g., "99+") */
  badgeMax?: number;
  /** Badge position */
  badgePosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Dropdown width (px) */
  dropdownWidth?: number;
  /** Dropdown max height (px) */
  dropdownMaxHeight?: number;
  /** Show "Mark all as read" button */
  showMarkAllRead?: boolean;
  /** Show settings gear icon */
  showSettings?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Callback when bell clicked (toggle dropdown) */
  onToggle?: (open: boolean) => void;
  /** Callback when notification clicked */
  onNotificationClick?: (item: NotificationItem) => void;
  /** Callback when mark-all-read clicked */
  onMarkAllRead?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface NotificationBellInstance {
  element: HTMLElement;
  triggerEl: HTMLElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  setNotifications: (items: NotificationItem[]) => void;
  addNotification: (item: NotificationItem) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
  getTotalCount: () => number;
  destroy: () => void;
}

// --- Config ---

const PRIORITY_ORDER: Record<string, number> = { high: 0, normal: 1, low: 2 };

function formatTimeAgo(timestamp: Date | string | number): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString();
}

// --- Main Factory ---

export function createNotificationBell(options: NotificationBellOptions): NotificationBellInstance {
  const opts = {
    maxVisible: options.maxVisible ?? 8,
    showBadge: options.showBadge ?? true,
    badgeMax: options.badgeMax ?? 99,
    badgePosition: options.badgePosition ?? "top-right",
    dropdownWidth: options.dropdownWidth ?? 340,
    dropdownMaxHeight: options.dropdownMaxHeight ?? 420,
    showMarkAllRead: options.showMarkAllRead ?? true,
    showSettings: options.showSettings ?? false,
    emptyMessage: options.emptyMessage ?? "No notifications",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("NotificationBell: container not found");

  // Resolve or create trigger
  let triggerEl: HTMLElement;
  if (options.trigger) {
    triggerEl = typeof options.trigger === "string"
      ? document.querySelector<HTMLElement>(options.trigger)!
      : options.trigger;
  } else {
    // Create a bell trigger inside the container
    triggerEl = document.createElement("button");
    triggerEl.type = "button";
    triggerEl.className = "bell-trigger";
    triggerEl.setAttribute("aria-label", "Notifications");
    triggerEl.style.cssText = `
      position:relative;background:none;border:none;cursor:pointer;
      padding:6px;display:flex;align-items:center;justify-content:center;
      border-radius:50%;width:36px;height:36px;transition:background 0.15s;
    `;
    container.appendChild(triggerEl);
  }

  // Bell icon SVG
  const bellIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 6c0 7-9 11-13 11a6 6 0 0 0-8 0"/><path d="M22 17v2H2v-2z"/></svg>`;

  triggerEl.innerHTML = bellIcon;
  triggerEl.style.color = "#6b7280";

  // Badge
  let badgeEl: HTMLSpanElement | null = null;
  if (opts.showBadge) {
    badgeEl = document.createElement("span");
    badgeEl.className = "bell-badge";
    badgeEl.style.cssText = `
      position:absolute;min-width:16px;height:16px;border-radius:8px;
      background:#ef4444;color:#fff;font-size:10px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
      padding:0 4px;pointer-events:none;
      ${opts.badgePosition === "top-right" ? "top:-4px;right:-4px;" :
       opts.badgePosition === "top-left" ? "top:-4px;left:-4px;" :
       opts.badgePosition === "bottom-right" ? "bottom:-4px;right:-4px;" :
       "bottom:-4px;left:-4px;"}
    `;
    triggerEl.style.position = "relative";
    triggerEl.appendChild(badgeEl);
  }

  // Dropdown panel
  const dropdown = document.createElement("div");
  dropdown.className = "notification-dropdown";
  dropdown.style.cssText = `
    position:absolute;${typeof options.trigger ? "top:100%;left:0;" : ""}
    width:${opts.dropdownWidth}px;max-height:${opts.dropdownMaxHeight}px;
    background:#fff;border-radius:12px;
    box-shadow:0 12px 40px rgba(0,0,0,0.15),0 4px 12px rgba(0,0,0,0.08);
    border:1px solid #e5e7eb;z-index:10000;
    display:none;flex-direction:column;overflow:hidden;
    font-family:-apple-system,sans-serif;font-size:13px;
    opacity:0;transform:translateY(-8px);
    transition:opacity 0.15s ease,transform 0.15s ease;
  `;
  document.body.appendChild(dropdown);

  // State
  let isOpenState = false;
  let notifications = [...(options.notifications ?? [])];
  let destroyed = false;

  function getUnread(): number {
    return notifications.filter((n) => !n.read).length;
  }

  function updateBadge(): void {
    if (!badgeEl) return;
    const unread = getUnread();
    if (unread > 0) {
      badgeEl.textContent = unread > opts.badgeMax ? `${opts.badgeMax}+` : String(unread);
      badgeEl.style.display = "flex";
    } else {
      badgeEl.style.display = "none";
    }
  }

  function renderDropdown(): void {
    dropdown.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 16px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
    `;
    header.innerHTML = `
      <span style="font-weight:600;font-size:14px;color:#111827;">Notifications</span>
      <span style="font-size:12px;color:#888;cursor:pointer;" class="nb-mark-all">Mark all read</span>
    `;
    dropdown.appendChild(header);

    header.querySelector(".nb-mark-all")?.addEventListener("click", () => {
      instance.markAllAsRead();
    });

    // List
    const list = document.createElement("div");
    list.className = "nb-list";
    list.style.cssText = "overflow-y:auto;flex:1;";

    const sorted = [...notifications].sort((a, b) =>
      (PRIORITY_ORDER[a.priority ?? "normal"] ?? 1) - (PRIORITY_ORDER[b.priority ?? "normal"] ?? 1)
    );
    const visible = sorted.slice(0, opts.maxVisible);

    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = `
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:32px 16px;color:#9ca3af;font-size:13px;text-align:center;
      `;
      empty.innerHTML = `<span style="font-size:24px;margin-bottom:8px;">\u{1F4EA}</span><br>${opts.emptyMessage}`;
      list.appendChild(empty);
    } else {
      for (const notif of visible) {
        const item = document.createElement("div");
        item.className = `nb-item${notif.read ? "" : " nb-unread"}`;
        item.style.cssText = `
          display:flex;gap:10px;padding:10px 14px;cursor:pointer;
          border-bottom:1px solid #f9fafb;transition:background 0.1s;
          ${notif.read ? "background:#f0f4ff;" : ""}
        `;

        // Icon
        if (notif.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.textContent = notif.icon;
          iconSpan.style.cssText = "font-size:18px;width:24px;text-align:center;flex-shrink:0;";
          item.appendChild(iconSpan);
        }

        // Content
        const content = document.createElement("div");
        content.style.cssText = "flex:1;min-width:0;";

        const titleEl = document.createElement("div");
        titleEl.className = "nb-title";
        titleEl.style.cssText = `font-weight:500;color:#111827;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
        titleEl.textContent = notif.title;
        content.appendChild(titleEl);

        if (notif.description) {
          const descEl = document.createElement("div");
          descEl.style.cssText = "font-size:11px;color:#888;margin-top:1px;overflow:hidden;text-overflow:ellipsis;";
          descEl.textContent = notif.description;
          content.appendChild(descEl);
        }

        // Time + action
        const meta = document.createElement("div");
        meta.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:4px;flex-shrink:0;";

        const timeEl = document.createElement("span");
        timeEl.style.cssText = "font-size:11px;color:#aaa;white-space:nowrap;";
        timeEl.textContent = formatTimeAgo(notif.timestamp ?? new Date());
        meta.appendChild(timeEl);

        if (notif.actionLabel) {
          const actionBtn = document.createElement("button");
          actionBtn.type = "button";
          actionBtn.textContent = notif.actionLabel;
          actionBtn.style.cssText = `
            padding:3px 10px;border:1px solid #dbeafe;border-radius:4px;
            background:#eff6ff;color:#0369a1;font-size:11px;cursor:pointer;
          `;
          actionBtn.addEventListener("click", (e) => { e.stopPropagation(); notif.onAction?.(); });
          meta.appendChild(actionBtn);
        }

        content.appendChild(meta);
        item.appendChild(content);

        // Click handler
        item.addEventListener("click", () => {
          if (!notif.read) instance.markAsRead(notif.id);
          opts.onNotificationClick?.(notif);
          if (notif.url) window.open(notif.url, "_blank");
        });

        item.addEventListener("mouseenter", () => { item.style.background = "#f0f4ff"; });
        item.addEventListener("mouseleave", () => { item.style.background = notif.read ? "#f0f4ff" : ""; });

        list.appendChild(item);
      }
    }

    dropdown.appendChild(list);
  }

  function toggleDropdown(open?: boolean): void {
    const shouldOpen = open ?? !isOpenState;
    if (shouldOpen === isOpenState) return;

    isOpenState = shouldOpen;
    renderDropdown();
    updateBadge();

    if (isOpenState) {
      dropdown.style.display = "flex";
      void dropdown.offsetHeight; // force reflow
      dropdown.style.opacity = "1";
      dropdown.style.transform = "translateY(0)";

      // Position below trigger
      if (triggerEl !== container && typeof options.trigger) {
        const rect = triggerEl.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left + rect.width / 2 - opts.dropdownWidth / 2}px`;
      }
    } else {
      dropdown.style.opacity = "0";
      dropdown.style.transform = "translateY(-8px)";
      setTimeout(() => { dropdown.style.display = "none"; }, 150);
    }

    opts.onToggle?.(isOpenState);
  }

  // Event listeners
  triggerEl.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Close on outside click
  document.addEventListener("mousedown", (e) => {
    if (isOpenState && !dropdown.contains(e.target as Node) && !triggerEl.contains(e.target as Node)) {
      toggleDropdown(false);
    }
  });

  const instance: NotificationBellInstance = {
    element: container,
    triggerEl,

    isOpen: () => isOpenState,
    open: () => toggleDropdown(true),
    close: () => toggleDropdown(false),

    setNotifications(items: NotificationItem[]) {
      notifications = items;
      updateBadge();
      if (isOpenState) renderDropdown();
    },

    addNotification(item: NotificationItem) {
      notifications.unshift(item);
      updateBadge();
      if (isOpenState) renderDropdown();
    },

    removeNotification(id: string) {
      notifications = notifications.filter((n) => n.id !== id);
      updateBadge();
      if (isOpenState) renderDropdown();
    },

    markAsRead(id: string) {
      const notif = notifications.find((n) => n.id === id);
      if (notif && !notif.read) {
        notif.read = true;
        updateBadge();
        if (isOpenState) renderDropdown();
      }
    },

    markAllAsRead() {
      notifications.forEach((n) => { n.read = true; });
      updateBadge();
      opts.onMarkAllRead?.();
      if (isOpenState) renderDropdown();
    },

    getUnreadCount: () => getUnread(),
    getTotalCount: () => notifications.length,

    destroy() {
      destroyed = true;
      dropdown.remove();
    },
  };

  // Initial render
  updateBadge();

  return instance;
}
