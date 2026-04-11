/**
 * Notification Center Utilities: In-app notification panel with unread
 * counts, filtering, grouping, mark-as-read, actions, and pagination.
 */

// --- Types ---

export type NotificationType = "info" | "success" | "warning" | "error" | "action" | "system";
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface NotificationItem {
  /** Unique ID */
  id: string;
  /** Title */
  title: string;
  /** Body text */
  body?: string;
  /** Type */
  type?: NotificationType;
  /** Priority level */
  priority?: NotificationPriority;
  /** Timestamp (ISO string or Date) */
  timestamp: string | Date;
  /** Whether it's been read */
  read?: boolean;
  /** Icon HTML */
  icon?: string;
  /** Action buttons */
  actions?: Array<{ label: string; onClick: () => void; variant?: "primary" | "secondary" | "ghost" }>;
  /** Source/app name */
  source?: string;
  /** URL to navigate on click */
  url?: string;
  /** Custom data payload */
  data?: Record<string, unknown>;
}

export interface NotificationCenterOptions {
  /** Initial notifications list */
  notifications?: NotificationItem[];
  /** Panel position */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Width in px */
  width?: number;
  /** Height in px (or "auto" for dynamic) */
  height?: number | "auto";
  /** Max visible items before scrolling */
  maxVisible?: number;
  /** Show header with title + clear-all */
  showHeader?: boolean;
  /** Show filter tabs (All/Unread/Actions) */
  showFilters?: boolean;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Show source labels */
  showSource?: boolean;
  /** Show unread badge on trigger */
  showBadge?: boolean;
  /** Group by date (Today/Yesterday/Earlier) */
  groupByDate?: boolean;
  /** Mark as read on click */
  readOnClick?: boolean;
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Trigger element (button that opens the center) */
  trigger?: HTMLElement;
  /** Container for portal rendering */
  container?: HTMLElement;
  /** Called when a notification is clicked */
  onItemClick?: (item: NotificationItem) => void;
  /** Called when a notification is marked as read */
  onRead?: (id: string) => void;
  /** Called when all are cleared */
  onClearAll?: () => void;
  /** Called when unread count changes */
  onUnreadChange?: (count: number) => void;
  /** Header title text */
  title?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Format timestamp function */
  formatTime?: (date: Date) => string;
}

export interface NotificationCenterInstance {
  /** Root element */
  el: HTMLElement;
  /** Open the panel */
  open: () => void;
  /** Close the panel */
  close: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Add a notification */
  addNotification: (item: NotificationItem) => void;
  /** Remove a notification by ID */
  removeNotification: (id: string) => void;
  /** Mark as read */
  markAsRead: (id: string) => void;
  /** Mark all as read */
  markAllAsRead: () => void;
  /** Clear all notifications */
  clearAll: () => void;
  /** Set filter */
  setFilter: (filter: "all" | "unread" | "actions") => void;
  /** Get unread count */
  getUnreadCount: () => number;
  /** Update notifications list */
  setNotifications: (items: NotificationItem[]) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Type Config ---

const TYPE_STYLES: Record<NotificationType, { bg: string; borderLeft: string; icon: string }> = {
  info: { bg: "#eff6ff", borderLeft: "#3b82f6", icon: "&#8505;" },
  success: { bg: "#ecfdf5", borderLeft: "#16a34a", icon: "&#10004;" },
  warning: { bg: "#fffbeb", borderLeft: "#f59e0b", icon: "&#9888;" },
  error: { bg: "#fef2f2", borderLeft: "#ef4444", icon: "&#10006;" },
  action: { bg: "#f0f9ff", borderLeft: "#0ea5e9", icon: "&#9997;" },
  system: { bg: "#f5f3ff", borderLeft: "#8b5cf6", icon: "&#9881;" },
};

// --- Core Factory ---

/**
 * Create an in-app notification center panel.
 *
 * @example
 * ```ts
 * const nc = createNotificationCenter({
 *   trigger: bellButton,
 *   notifications: [
 *     { id: "1", title: "New message", body: "You have a new message", timestamp: new Date() },
 *   ],
 * });
 * ```
 */
export function createNotificationCenter(options: NotificationCenterOptions = {}): NotificationCenterInstance {
  const {
    notifications = [],
    position = "top-right",
    width = 380,
    height = 480,
    maxVisible = 8,
    showHeader = true,
    showFilters = true,
    showTimestamps = true,
    showSource = false,
    showBadge = true,
    groupByDate = true,
    readOnClick = true,
    className,
    zIndex = 1050,
    trigger,
    container,
    onItemClick,
    onRead,
    onClearAll,
    onUnreadChange,
    title = "Notifications",
    emptyMessage = "No notifications",
    formatTime,
  } = options;

  let _open = false;
  let _items: NotificationItem[] = [...notifications];
  let _filter: "all" | "unread" | "actions" = "all";
  let cleanupFns: Array<() => void> = [];

  // Position styles
  const posMap: Record<string, string> = {
    "top-right": "top:0;right:0;",
    "top-left": "top:0;left:0;",
    "bottom-right": "bottom:0;right:0;",
    "bottom-left": "bottom:0;left:0;",
  };

  // Root overlay
  const overlay = document.createElement("div");
  overlay.className = `nc-overlay ${className ?? ""}`.trim();
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:auto;display:none;" +
    `z-index:${zIndex};`;

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "nc-backdrop";
  backdrop.style.cssText =
    "position:absolute;inset:0;background:rgba(0,0,0,0.15);transition:opacity 0.2s;";
  overlay.appendChild(backdrop);

  // Panel
  const panel = document.createElement("div");
  panel.className = "nc-panel";
  const isBottom = position.startsWith("bottom");
  panel.style.cssText =
    `position:absolute;${posMap[position] ?? posMap["top-right"]}` +
    `width:${width}px;max-height:${height === "auto" ? "80vh" : `${height}px`};` +
    "background:#fff;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,0.18);" +
    "display:flex;flex-direction:column;overflow:hidden;" +
    "transform-origin:" + (isBottom ? "bottom" : "top") + " right;" +
    "animation:nc-slide-in 0.2s ease-out;";

  // Header
  let headerEl: HTMLElement | null = null;
  if (showHeader) {
    headerEl = document.createElement("div");
    headerEl.className = "nc-header";
    headerEl.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;" +
      "padding:14px 18px;border-bottom:1px solid #f3f4f6;flex-shrink:0;";

    const titleArea = document.createElement("div");
    titleArea.style.display = "flex";
    titleArea.style.alignItems = "center";
    titleArea.style.gap = "10px";

    const titleText = document.createElement("h3");
    titleText.textContent = title;
    titleText.style.cssText = "margin:0;font-size:15px;font-weight:600;color:#111827;";
    titleArea.appendChild(titleText);

    // Unread count badge
    const badge = document.createElement("span");
    badge.className = "nc-unread-badge";
    badge.style.cssText =
      "background:#ef4444;color:#fff;font-size:11px;font-weight:600;" +
      "min-width:18px;height:18px;border-radius:9px;display:flex;" +
      "align-items:center;justify-content:center;padding:0 5px;";
    titleArea.appendChild(badge);
    headerEl.appendChild(titleArea);

    // Clear all button
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.textContent = "Clear all";
    clearBtn.style.cssText =
      "border:none;background:none;color:#6b7280;cursor:pointer;" +
      "font-size:12px;padding:4px 8px;border-radius:6px;transition:color 0.12s;";
    clearBtn.addEventListener("mouseenter", () => { clearBtn.style.color = "#374151"; });
    clearBtn.addEventListener("mouseleave", () => { clearBtn.style.color = "#6b7280"; });
    clearBtn.addEventListener("click", () => { clearAll(); });
    headerEl.appendChild(clearBtn);

    panel.appendChild(headerEl);
  }

  // Filter tabs
  let filterTabs: HTMLElement | null = null;
  if (showFilters) {
    filterTabs = document.createElement("div");
    filterTabs.className = "nc-filters";
    filterTabs.style.cssText =
      "display:flex;border-bottom:1px solid #f3f4f6;flex-shrink:0;";

    const filters: Array<{ key: "all" | "unread" | "actions"; label: string }> = [
      { key: "all", label: "All" },
      { key: "unread", label: "Unread" },
      { key: "actions", label: "Actions" },
    ];

    for (const f of filters) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.textContent = f.label;
      tab.dataset.filter = f.key;
      tab.style.cssText =
        "flex:1;padding:10px 0;border:none;background:none;cursor:pointer;" +
        "font-size:13px;font-weight:500;color:#6b7280;transition:all 0.12s;" +
        "border-bottom:2px solid transparent;" +
        (f.key === _filter ? "color:#111827;border-bottom-color:#3b82f6;" : "");
      tab.addEventListener("click", () => {
        setFilter(f.key);
        // Update tab styles
        filterTabs!.querySelectorAll("button").forEach((t) => {
          const s = t as HTMLElement;
          s.style.color = s.dataset.filter === f.key ? "#111827" : "#6b7280";
          s.style.borderBottomColor = s.dataset.filter === f.key ? "#3b82f6" : "transparent";
        });
      });
      filterTabs.appendChild(tab);
    }
    panel.appendChild(filterTabs);
  }

  // List container
  const listContainer = document.createElement("div");
  listContainer.className = "nc-list";
  listContainer.style.cssText =
    "flex:1;overflow-y:auto;padding:8px 0;";

  // Footer (mark-all-read)
  const footer = document.createElement("div");
  footer.className = "nc-footer";
  footer.style.cssText =
    "padding:10px 18px;border-top:1px solid #f3f4f6;text-align:center;flex-shrink:0;";

  const markAllBtn = document.createElement("button");
  markAllBtn.type = "button";
  markAllBtn.textContent = "Mark all as read";
  markAllBtn.style.cssText =
    "border:none;background:none;color:#3b82f6;cursor:pointer;" +
    "font-size:13px;font-weight:500;padding:4px 0;";
  markAllBtn.addEventListener("click", () => markAllAsRead());
  footer.appendChild(markAllBtn);
  panel.appendChild(footer);

  // Assemble
  panel.appendChild(listContainer);
  overlay.appendChild(panel);
  (container ?? document.body).appendChild(overlay);

  // Keyframes
  if (!document.getElementById("nc-keyframes")) {
    const ks = document.createElement("style");
    ks.id = "nc-keyframes";
    ks.textContent =
      "@keyframes nc-slide-in{from{opacity:0;transform:scale(0.96) translateY(-8px)}to{opacity:1;transform:scale(1) translateY(0)}}" +
      "@keyframes nc-fade-in{from{opacity:0}to{opacity:1}}";
    document.head.appendChild(ks);
  }

  // Badge on trigger
  let triggerBadge: HTMLElement | null = null;
  if (trigger && showBadge) {
    triggerBadge = document.createElement("span");
    triggerBadge.className = "nc-trigger-badge";
    triggerBadge.style.cssText =
      "position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;" +
      "font-size:10px;font-weight:700;min-width:16px;height:16px;" +
      "border-radius:8px;display:flex;align-items:center;justify-content:center;" +
      "padding:0 4px;pointer-events:none;";
    trigger.style.position = "relative";
    trigger.appendChild(triggerBadge);
  }

  // --- Internal Helpers ---

  function getFilteredItems(): NotificationItem[] {
    let items = [..._items];

    switch (_filter) {
      case "unread":
        items = items.filter((n) => !n.read);
        break;
      case "actions":
        items = items.filter((n) => n.actions && n.actions.length > 0);
        break;
    }

    // Sort by time descending
    items.sort((a, b) => {
      const ta = typeof a.timestamp === "string" ? new Date(a.timestamp) : a.timestamp;
      const tb = typeof b.timestamp === "string" ? new Date(b.timestamp) : b.timestamp;
      return tb.getTime() - ta.getTime();
    });

    return items.slice(0, maxVisible + 20); // Extra buffer
  }

  function formatDateGroup(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (itemDay.getTime() === today.getTime()) return "Today";
    if (itemDay.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatTimestamp(date: Date | string): string {
    if (formatTime) return formatTime(typeof date === "string" ? new Date(date) : date);
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffHr < 48) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderList(): void {
    listContainer.innerHTML = "";

    const items = getFilteredItems();

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "nc-empty";
      empty.style.cssText =
        "padding:40px 20px;text-align:center;color:#9ca3af;font-size:14px;";
      empty.textContent = emptyMessage;
      listContainer.appendChild(empty);
      updateBadge();
      return;
    }

    let lastGroup = "";

    for (const item of items) {
      // Group header
      if (groupByDate) {
        const group = formatDateGroup(item.timestamp);
        if (group !== lastGroup) {
          lastGroup = group;
          const gh = document.createElement("div");
          gh.className = "nc-group-header";
          gh.textContent = group;
          gh.style.cssText =
            "padding:8px 18px 4px;font-size:11px;font-weight:600;color:#9ca3af;" +
            "text-transform:uppercase;letter-spacing:0.04em;";
          listContainer.appendChild(gh);
        }
      }

      const row = document.createElement("div");
      row.className = `nc-item${item.read ? "" : " unread"}`;
      row.dataset.itemId = item.id;
      row.style.cssText =
        "display:flex;gap:10px;padding:10px 18px;cursor:pointer;" +
        "transition:background 0.08s;border-bottom:1px solid #f9fafb;" +
        (!item.read ? "background:#fafbff;" : "");

      row.addEventListener("mouseenter", () => { row.style.background = "#f3f4f6"; });
      row.addEventListener("mouseleave", () => { row.style.background = !item.read ? "#fafbff" : ""; });

      // Icon
      const ts = TYPE_STYLES[item.type ?? "info"];
      const iconDiv = document.createElement("div");
      iconDiv.innerHTML = item.icon || ts.icon;
      iconDiv.style.cssText =
        `flex-shrink:0;width:32px;height:32px;border-radius:8px;` +
        `background:${ts.bg};display:flex;align-items:center;justify-content:center;` +
        "font-size:14px;margin-top:2px;";
      row.appendChild(iconDiv);

      // Content
      const content = document.createElement("div");
      content.style.flex = "1";
      content.style.minWidth = "0";

      const titleRow = document.createElement("div");
      titleRow.style.display = "flex";
      titleRow.style.justifyContent = "space-between";
      titleRow.style.alignItems = "center";

      const titleEl = document.createElement("div");
      titleEl.style.fontWeight = item.read ? "400" : "600";
      titleEl.style.fontSize = "13px";
      titleEl.style.color = "#374151";
      titleEl.textContent = item.title;
      titleRow.appendChild(titleEl);

      if (showTimestamps) {
        const timeEl = document.createElement("span");
        timeEl.className = "nc-timestamp";
        timeEl.textContent = formatTimestamp(item.timestamp);
        timeEl.style.cssText = "font-size:11px;color:#9ca3af;flex-shrink:0;margin-left:8px;";
        titleRow.appendChild(timeEl);
      }
      content.appendChild(titleRow);

      if (item.body) {
        const bodyEl = document.createElement("p");
        bodyEl.className = "nc-body";
        bodyEl.textContent = item.body.length > 120 ? item.body.slice(0, 120) + "..." : item.body;
        bodyEl.style.cssText = "margin:2px 0 0;font-size:12px;color:#6b7280;line-height:1.4;";
        content.appendChild(bodyEl);
      }

      if (showSource && item.source) {
        const srcEl = document.createElement("span");
        srcEl.textContent = item.source;
        srcEl.style.cssText = "font-size:11px;color:#9ca3af;";
        content.appendChild(srcEl);
      }

      // Actions
      if (item.actions && item.actions.length > 0) {
        const actionRow = document.createElement("div");
        actionRow.style.display = "flex";
        actionRow.style.gap = "6px";
        actionRow.style.marginTop = "6px";

        for (const act of item.actions!) {
          const ab = document.createElement("button");
          ab.type = "button";
          ab.textContent = act.label;
          ab.style.cssText =
            "padding:3px 10px;border-radius:5px;font-size:11px;font-weight:500;cursor:pointer;" +
            (act.variant === "primary"
              ? "background:#3b82f6;color:#fff;border:none;"
              : act.variant === "ghost"
                ? "background:transparent;color:#3b82f6;border:1px solid transparent;"
                : "background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;");
          ab.addEventListener("click", (e) => {
            e.stopPropagation();
            act.onClick();
          });
          actionRow.appendChild(ab);
        }
        content.appendChild(actionRow);
      }

      row.appendChild(content);

      // Unread dot
      if (!item.read) {
        const dot = document.createElement("span");
        dot.style.cssText =
          "flex-shrink:0;width:8px;height:8px;border-radius:50%;background:#3b82f6;margin-top:6px;";
        row.appendChild(dot);
      }

      // Click handler
      row.addEventListener("click", () => {
        if (readOnClick && !item.read) markAsRead(item.id);
        onItemClick?.(item);
        if (item.url) window.open(item.url, "_blank");
      });

      listContainer.appendChild(row);
    }

    updateBadge();
  }

  function updateBadge(): void {
    const count = getUnreadCount();

    if (headerEl) {
      const badge = headerEl.querySelector(".nc-unread-badge") as HTMLElement | null;
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? "99+" : String(count);
          badge.style.display = "";
        } else {
          badge.style.display = "none";
        }
      }
    }

    if (triggerBadge) {
      if (count > 0) {
        triggerBadge.textContent = count > 99 ? "99+" : String(count);
        triggerBadge.style.display = "";
      } else {
        triggerBadge.style.display = "none";
      }
    }

    onUnreadChange?.(count);
  }

  // --- Methods ---

  function open(): void {
    if (_open) return;
    _open = true;
    overlay.style.display = "block";
    requestAnimationFrame(() => {
      backdrop.style.opacity = "1";
    });
    renderList();
    _setupListeners();
  }

  function close(): void {
    if (!_open) return;
    _open = false;
    backdrop.style.opacity = "0";
    setTimeout(() => {
      overlay.style.display = "none";
      _removeListeners();
    }, 200);
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  function addNotification(item: NotificationItem): void {
    _items.unshift(item);
    if (_open) renderList();
    else updateBadge();
  }

  function removeNotification(id: string): void {
    _items = _items.filter((n) => n.id !== id);
    if (_open) renderList();
    else updateBadge();
  }

  function markAsRead(id: string): void {
    const item = _items.find((n) => n.id === id);
    if (item && !item.read) {
      item.read = true;
      if (_open) renderList();
      else updateBadge();
      onRead?.(id);
    }
  }

  function markAllAsRead(): void {
    let changed = false;
    for (const item of _items) {
      if (!item.read) { item.read = true; changed = true; onRead?.(item.id); }
    }
    if (changed && _open) renderList();
    else updateBadge();
  }

  function clearAll(): void {
    _items = [];
    renderList();
    onClearAll?.();
  }

  function setFilter(f: "all" | "unread" | "actions"): void {
    _filter = f;
    if (_open) renderList();
  }

  function getUnreadCount(): number {
    return _items.filter((n) => !n.read).length;
  }

  function setNotifications(items: NotificationItem[]): void {
    _items = [...items];
    if (_open) renderList();
    else updateBadge();
  }

  function destroy(): void {
    if (_open) close();
    if (triggerBadge) triggerBadge.remove();
    overlay.remove();
  }

  // --- Listeners ---

  function _setupListeners(): void {
    _removeListeners();

    if (backdrop) {
      backdrop.addEventListener("click", close);
      cleanupFns.push(() => backdrop!.removeEventListener("click", close));
    }

    if (trigger) {
      const h = (e: Event) => { e.stopPropagation(); toggle(); };
      // Don't re-add — handled outside
    }
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // Attach trigger click
  if (trigger) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
  }

  return {
    el: overlay,
    open, close, toggle, isOpen,
    addNotification, removeNotification, markAsRead, markAllAsRead, clearAll,
    setFilter, getUnreadCount, setNotifications, destroy,
  };
}
