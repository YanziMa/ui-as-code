/**
 * Activity Feed: Chronological activity timeline with icons, timestamps,
 * grouping by time period, avatars, action descriptions, and compact/detailed views.
 */

// --- Types ---

export type ActivityType =
  | "create" | "update" | "delete" | "comment" | "like" | "share"
  | "join" | "leave" | "upload" | "download" | "login" | "approval"
  | "milestone" | "alert" | "custom";

export type ActivityGroupBy = "none" | "today" | "week" | "month" | "custom";
export type FeedDensity = "comfortable" | "compact" | "sparse";

export interface ActivityItem {
  /** Unique ID */
  id: string;
  /** Activity type for icon/color */
  type: ActivityType;
  /** Actor name */
  actor: string;
  /** Action description (supports HTML) */
  description: string;
  /** Target object name (optional) */
  target?: string;
  /** Timestamp (ISO or Date) */
  timestamp: Date | string | number;
  /** Avatar URL or initial letter */
  avatar?: string;
  /** URL to navigate on click */
  url?: string;
  /** Metadata badge text */
  badge?: string;
  /** Custom icon/emoji override */
  icon?: string;
  /** Group key for custom grouping */
  groupKey?: string;
}

export interface ActivityFeedOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Activity items */
  items?: ActivityItem[];
  /** Grouping mode */
  groupBy?: ActivityGroupBy;
  /** Display density */
  density?: FeedDensity;
  /** Show timestamps? */
  showTimestamps?: boolean;
  /** Show avatars? */
  showAvatars?: boolean;
  /** Show icons? */
  showIcons?: boolean;
  /** Max items to display (0 = unlimited) */
  maxItems?: number;
  /** Reverse order (newest first)? */
  newestFirst?: boolean;
  /** Format timestamp function */
  formatTime?: (date: Date) => string;
  /** Format group header function */
  formatGroupHeader?: (groupKey: string) => string;
  /** Callback on item click */
  onItemClick?: (item: ActivityItem) => void;
  /** Callback on actor click */
  onActorClick?: (item: ActivityItem) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Custom CSS class */
  className?: string;
}

export interface ActivityFeedInstance {
  element: HTMLElement;
  getItems: () => ActivityItem[];
  setItems: (items: ActivityItem[]) => void;
  addItem: (item: ActivityItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  destroy: () => void;
}

// --- Config ---

const TYPE_CONFIG: Record<ActivityType, { icon: string; color: string }> = {
  create:   { icon: "+", color: "#22c55e" },
  update:   { icon: "~", color: "#3b82f6" },
  delete:   { icon: "\u2715", color: "#ef4444" },
  comment:  { icon: "\u{1F4AC}", color: "#8b5cf6" },
  like:     { icon: "\u2665", color: "#ec4899" },
  share:    { icon: "\u2197", color: "#06b6d4" },
  join:     { icon: "\u2713", color: "#10b981" },
  leave:    { icon: "\u2190", color: "#f59e0b" },
  upload:   { icon: "\u2191", color: "#6366f1" },
  download: { icon: "\u2193", color: "#14b8a6" },
  login:    { icon: "\u{1F512}", color: "#78716c" },
  approval: { icon: "\u2705", color: "#059669" },
  milestone:{ icon: "\u{1F3AF}", color: "#d97706" },
  alert:    { icon: "!", color: "#dc2626" },
  custom:   { icon: "\u2022", color: "#6b7280" },
};

function defaultFormatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function parseTimestamp(ts: Date | string | number): Date {
  return ts instanceof Date ? ts : new Date(ts);
}

function getGroupKey(item: ActivityItem, groupBy: ActivityGroupBy): string {
  if (groupBy === "custom") return item.groupKey ?? "";
  const d = parseTimestamp(item.timestamp);
  switch (groupBy) {
    case "today":
      return d.toDateString() === new Date().toDateString() ? "Today" : "Earlier";
    case "week": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo ? "This Week" : "Earlier";
    }
    case "month": {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return d >= monthAgo ? "This Month" : "Earlier";
    }
    default:
      return "";
  }
}

// --- Main Class ---

export class ActivityFeedManager {
  create(options: ActivityFeedOptions): ActivityFeedInstance {
    const opts = {
      groupBy: options.groupBy ?? "none",
      density: options.density ?? "comfortable",
      showTimestamps: options.showTimestamps ?? true,
      showAvatars: options.showAvatars ?? true,
      showIcons: options.showIcons ?? true,
      maxItems: options.maxItems ?? 0,
      newestFirst: options.newestFirst ?? true,
      formatTime: options.formatTime ?? defaultFormatTime,
      formatGroupHeader: options.formatGroupHeader ?? ((k) => k),
      emptyMessage: options.emptyMessage ?? "No recent activity",
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ActivityFeed: container not found");

    container.className = `activity-feed af-${opts.density} ${opts.className}`;
    let items: ActivityItem[] = opts.items ?? [];
    let destroyed = false;

    const gapMap: Record<FeedDensity, string> = {
      comfortable: "12px",
      compact: "6px",
      sparse: "20px",
    };
    const paddingMap: Record<FeedDensity, string> = {
      comfortable: "12px 16px",
      compact: "8px 12px",
      sparse: "16px 20px",
    };

    function render(): void {
      container.innerHTML = "";

      // Sort
      const sorted = [...items].sort((a, b) => {
        const ta = parseTimestamp(a.timestamp).getTime();
        const tb = parseTimestamp(b.timestamp).getTime();
        return opts.newestFirst ? tb - ta : ta - tb;
      });

      const visible = opts.maxItems > 0 ? sorted.slice(0, opts.maxItems) : sorted;

      if (visible.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = `text-align:center;padding:40px 20px;color:#9ca3af;font-size:13px;`;
        empty.textContent = opts.emptyMessage;
        container.appendChild(empty);
        return;
      }

      // Group
      if (opts.groupBy !== "none") {
        const groups = new Map<string, ActivityItem[]>();
        for (const item of visible) {
          const key = getGroupKey(item, opts.groupBy);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(item);
        }

        for (const [key, groupItems] of groups) {
          // Group header
          const header = document.createElement("div");
          header.className = "af-group-header";
          header.style.cssText = `
            font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;
            letter-spacing:0.05em;padding:${opts.density === "sparse" ? "16px 0 8px" : "12px 0 6px"};
            border-bottom:1px solid #f0f0f0;margin-bottom:${gapMap[opts.density]};
          `;
          header.textContent = opts.formatGroupHeader(key);
          container.appendChild(header);

          for (const item of groupItems) {
            container.appendChild(renderItem(item));
          }
        }
      } else {
        for (const item of visible) {
          container.appendChild(renderItem(item));
        }
      }
    }

    function renderItem(item: ActivityItem): HTMLElement {
      const row = document.createElement("div");
      row.className = `af-item af-type-${item.type}`;
      row.dataset.id = item.id;
      row.style.cssText = `display:flex;align-items:flex-start;gap:12px;padding:${paddingMap[opts.density]};cursor:pointer;border-radius:8px;transition:background 0.1s;`;
      row.addEventListener("mouseenter", () => { row.style.background = "#f9fafb"; });
      row.addEventListener("mouseleave", () => { row.style.background = ""; });
      row.addEventListener("click", () => opts.onItemClick?.(item));

      // Icon dot
      if (opts.showIcons) {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.custom;
        const iconEl = document.createElement("span");
        iconEl.className = "af-icon";
        iconEl.textContent = item.icon ?? cfg.icon;
        iconEl.style.cssText = `
          display:flex;align-items:center;justify-content:center;width:24px;height:24px;
          border-radius:50%;font-size:11px;font-weight:700;color:#fff;background:${cfg.color};
          flex-shrink:0;margin-top:1px;
        `;
        row.appendChild(iconEl);
      }

      // Content area
      const content = document.createElement("div");
      content.style.cssText = "flex:1;min-width:0;";
      row.appendChild(content);

      // Top line: actor + action + target
      const topLine = document.createElement("div");
      topLine.style.cssText = `font-size:${opts.density === "compact" ? "12px" : "13px"};color:#374151;line-height:1.4;`;

      // Actor link
      const actorSpan = document.createElement("span");
      actorSpan.style.cssText = "font-weight:600;color:#111827;cursor:pointer;";
      actorSpan.textContent = item.actor;
      actorSpan.addEventListener("click", (e) => { e.stopPropagation(); opts.onActorClick?.(item); });
      topLine.appendChild(actorSpan);

      topLine.appendChild(document.createTextNode(" "));
      topLine.innerHTML += item.description;

      if (item.target) {
        const targetSpan = document.createElement("strong");
        targetSpan.style.cssText = "color:#111827;";
        targetSpan.textContent = ` ${item.target}`;
        topLine.appendChild(targetSpan);
      }

      content.appendChild(topLine);

      // Bottom line: timestamp + badge
      const bottomLine = document.createElement("div");
      bottomLine.style.cssText = `display:flex;align-items:center;gap:8px;margin-top:3px;`;

      if (opts.showTimestamps) {
        const ts = document.createElement("span");
        ts.style.cssText = `font-size:${opts.density === "compact" ? "10px" : "11px"};color:#9ca3af;`;
        ts.textContent = opts.formatTime(parseTimestamp(item.timestamp));
        bottomLine.appendChild(ts);
      }

      if (item.badge) {
        const badge = document.createElement("span");
        badge.style.cssText = `font-size:10px;font-weight:500;background:#f0f4ff;color:#4338ca;padding:1px 6px;border-radius:4px;`;
        badge.textContent = item.badge;
        bottomLine.appendChild(badge);
      }

      content.appendChild(bottomLine);

      // Avatar (right side)
      if (opts.showAvatars && item.avatar) {
        const avatar = document.createElement("img");
        avatar.src = item.avatar;
        avatar.alt = "";
        avatar.style.cssText = "width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;";
        row.appendChild(avatar);
      } else if (opts.showAvatars && !item.avatar) {
        const initial = document.createElement("span");
        initial.style.cssText = `
          width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:12px;font-weight:600;color:#fff;
          background:hsl(${simpleHash(item.actor) % 360}, 65%, 55%);flex-shrink:0;
        `;
        initial.textContent = item.actor.charAt(0).toUpperCase();
        row.appendChild(initial);
      }

      return row;
    }

    function simpleHash(str: string): number {
      let h = 0;
      for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
      return Math.abs(h);
    }

    render();

    return {
      element: container,

      getItems() { return [...items]; },

      setItems(newItems: ActivityItem[]) { items = newItems; render(); },

      addItem(item: ActivityItem) {
        items.unshift(item);
        render();
      },

      removeItem(id: string) {
        items = items.filter((i) => i.id !== id);
        render();
      },

      clear() { items = []; render(); },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };
  }
}

/** Convenience: create an activity feed */
export function createActivityFeed(options: ActivityFeedOptions): ActivityFeedInstance {
  return new ActivityFeedManager().create(options);
}
