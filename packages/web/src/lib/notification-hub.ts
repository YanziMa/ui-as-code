/**
 * Notification Hub: Centralized notification management system with toast-style
 * notifications, persistent banners, in-app notification center, unread counts,
 * notification grouping, mark-as-read, filtering by type/level, and persistence.
 */

// --- Types ---

export type NotificationLevel = "info" | "success" | "warning" | "error";
export type NotificationType = "toast" | "banner" | "persistent";

export interface NotificationItem {
  /** Unique ID */
  id: string;
  /** Title */
  title: string;
  /** Body text */
  message?: string;
  /** Severity level */
  level: NotificationLevel;
  /** Display type */
  type?: NotificationType;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action callback */
  onAction?: () => void;
  /** Auto-dismiss timeout ms (0 = sticky) */
  duration?: number;
  /** Timestamp */
  timestamp?: number;
  /** Read state */
  read?: boolean;
  /** Category/group key */
  category?: string;
  /** URL to navigate on click */
  url?: string;
  /** Custom data */
  data?: unknown;
}

export interface NotificationHubOptions {
  /** Container element or selector for the hub UI */
  container?: HTMLElement | string;
  /** Max visible toasts at once (default: 5) */
  maxVisible?: number;
  /** Position for toasts ("top-right", "top-left", "bottom-right", "bottom-left") */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Default duration for auto-dismissing notifications (ms, default: 4000) */
  defaultDuration?: number;
  /** Show close button on all notifications */
  showClose?: boolean;
  /** Enable sound effects */
  enableSound?: boolean;
  /** Sound URL for notification */
  soundUrl?: string;
  /** Callback when a notification is clicked */
  onClick?: (item: NotificationItem) => void;
  /** Callback when count changes */
  onCountChange?: (count: number, unreadCount: number) => void;
  /** Custom CSS class */
  className?: string;
  /** Z-index base */
  zIndex?: number;
  /** Group similar notifications? */
  groupSimilar?: boolean;
  /** Grouping window in ms (default: 5000) */
  groupWindowMs?: number;
}

export interface NotificationHubInstance {
  element: HTMLElement;
  /** Push a new notification */
  push: (notification: Omit<NotificationItem, "id">) => string;
  /** Push a quick info notification */
  info: (title: string, message?: string) => string;
  /** Push a success notification */
  success: (title: string, message?: string) => string;
  /** Push a warning notification */
  warning: (title: string, message?: string) => string;
  /** Push an error notification */
  error: (title: string, message?: string) => string;
  /** Push a loading/persistent notification */
  loading: (title: string, message?: string) => string;
  /** Remove a notification by ID */
  remove: (id: string) => void;
  /** Clear all notifications */
  clear: () => void;
  /** Mark all as read */
  markAllRead: () => void;
  /** Get all notifications */
  getAll: () => NotificationItem[];
  /** Get unread count */
  getUnreadCount: () => number;
  /** Get total count */
  getCount: () => void;
  /** Filter notifications by predicate */
  filter: (fn: (n: NotificationItem) => boolean) => NotificationItem[];
  /** Subscribe to count changes */
  subscribeCount: (cb: (total: number, unread: number) => void) => () => void;
  /** Destroy hub */
  destroy: () => void;
}

// --- Level Config ---

const LEVEL_STYLES: Record<NotificationLevel, { bg: string; border: string; icon: string; color: string }> = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", icon: "\u2139\uFE0F", color: "#1e40af" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", icon: "\u2705", color: "#15803d" },
  warning: { bg: "#fffbeb", border: "#fef08a", icon: "\u26A0", color: "#b45309" },
  error:   { bg: "#fef2f2", border: "#fecaca", icon: "\u274C", color: "#dc2626" },
};

// --- ID Generator ---

let idCounter = 0;
function generateId(): string { return `notif_${++idCounter}_${Date.now()}`; }

// --- Main Class ---

export class NotificationHubManager {
  create(options: NotificationHubOptions = {}): NotificationHubInstance {
    const opts = {
      maxVisible: options.maxVisible ?? 5,
      position: options.position ?? "top-right",
      defaultDuration: options.defaultDuration ?? 4000,
      showClose: options.showClose ?? true,
      enableSound: options.enableSound ?? false,
      groupSimilar: options.groupSimilar ?? true,
      groupWindowMs: options.groupWindowMs ?? 5000,
      zIndex: options.zIndex ?? 11000,
      className: options.className ?? "",
      ...options,
    };

    // Container for the hub
    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    const root = container ?? document.createElement("div");
    root.className = `notification-hub ${opts.className}`;
    root.style.cssText = `
      position:fixed;z-index:${opts.zIndex};pointer-events:none;font-family:-apple-system,sans-serif;
    `;
    if (!container) document.body.appendChild(root);

    // Toast stack area
    const toastStack = document.createElement("div");
    toastStack.className = "nh-toast-stack";
    toastStack.style.cssText = `
      display:flex;flex-direction:column;gap:8px;padding:12px;
      pointer-events:auto;max-width:380px;width:100%;
    `;

    // Position the stack
    const positions: Record<string, { top: string; right: string; bottom: string; left: string }> = {
      "top-right":     { top: "0", right: "0", bottom: "", left: "" },
      "top-left":      { top: "0", right: "", bottom: "", left: "0" },
      "bottom-right":  { top: "", right: "0", bottom: "0", left: "" },
      "bottom-left":   { top: "", right: "", bottom: "0", left: "0" },
    };
    const pos = positions[opts.position];
    Object.assign(toastStack.style, pos);
    root.appendChild(toastStack);

    // State
    const items: NotificationItem[] = [];
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const countListeners = new Set<(total: number, unread: number) => void>();
    let destroyed = false;

    // Audio context for sounds
    let audioCtx: AudioContext | null = null;

    function playSound(): void {
      if (!opts.enableSound || !opts.soundUrl) return;
      try {
        if (!audioCtx) audioCtx = new AudioContext();
        fetch(opts.soundUrl)
          .then((r) => r.arrayBuffer())
          .then((buf) => audioCtx!.decodeAudioData(buf))
          .then((buf) => {
            const src = audioCtx!.createBufferSource();
            src.buffer = buf;
            src.connect(audioCtx!.destination);
            src.start(0);
          });
      } catch { /* ignore */ }
    }

    function createToastEl(item: NotificationItem): HTMLElement {
      const style = LEVEL_STYLES[item.level];

      const el = document.createElement("div");
      el.dataset.id = item.id;
      el.className = "nh-notification";
      el.style.cssText = `
        background:${style.bg};border:1px solid ${style.border};border-radius:10px;
        padding:12px 16px;box-shadow:0 4px 16px rgba(0,0,0,0.1);
        cursor:pointer;display:flex;align-items:flex-start;gap:10px;
        transition:all 200ms ease;opacity:0;transform:translateX(20px);
        max-width:360px;
      `;

      // Icon
      const iconEl = document.createElement("span");
      iconEl.textContent = item.icon ?? style.icon;
      iconEl.style.cssText = `font-size:18px;flex-shrink:0;margin-top:2px;color:${style.color};`;
      el.appendChild(iconEl);

      // Content
      const content = document.createElement("div");
      content.style.cssText = "flex:1;min-width:0;";

      const titleEl = document.createElement("div");
      titleEl.textContent = item.title;
      titleEl.style.cssText = `font-weight:600;font-size:14px;color:#111827;line-height:1.3;`;
      content.appendChild(titleEl);

      if (item.message) {
        const msgEl = document.createElement("div");
        msgEl.textContent = item.message;
        msgEl.style.cssText = `font-size:13px;color:#6b7280;margin-top:3px;line-height:1.4;`;
        content.appendChild(msgEl);
      }

      // Action button
      if (item.actionLabel) {
        const actionBtn = document.createElement("button");
        actionBtn.type = "button";
        actionBtn.textContent = item.actionLabel;
        actionBtn.style.cssText = `
          margin-top:6px;padding:4px 12px;border:none;border-radius:6px;
          background:#4338ca;color:#fff;font-size:12px;cursor:pointer;font-weight:500;
        `;
        actionBtn.addEventListener("click", (e) => { e.stopPropagation(); item.onAction?.(); remove(item.id); });
        content.appendChild(actionBtn);
      }

      // Close button
      if (opts.showClose && item.duration !== 0) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.innerHTML = "&times;";
        closeBtn.style.cssText = `
          background:none;border:none;cursor:pointer;font-size:14px;color:#9ca3af;
          padding:0 2px;flex-shrink:0;margin-left:auto;align-self:flex-start;
        `;
        closeBtn.addEventListener("click", (e) => { e.stopPropagation(); remove(item.id); });
        el.insertBefore(closeBtn, el.lastChild);
      } else if (opts.showClose) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.innerHTML = "&times;";
        closeBtn.style.cssText = `
          background:none;border:none;cursor:pointer;font-size:14px;color:#9ca3af;
          padding:0 2px;flex-shrink:0;margin-left:auto;align-self:flex-start;
        `;
        closeBtn.addEventListener("click", (e) => { e.stopPropagation(); remove(item.id); });
        el.appendChild(closeBtn);
      }

      el.appendChild(content);

      // Events
      el.addEventListener("click", () => opts.onClick?.(item));
      el.addEventListener("mouseenter", () => { el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)"; });

      return el;
    }

    function addNotification(item: NotificationItem): string {
      if (destroyed) return "";

      // Check grouping
      if (opts.groupSimilar && item.type !== "persistent") {
        const existing = items.find(
          (n) => n.title === item.title && n.message === item.message && n.level === item.level && n.type !== "persistent"
        );
        if (existing) {
          existing.timestamp = Date.now();
          notifyCountChange();
          return existing.id;
        }
      }

      items.unshift(item);
      notifyCountChange();

      // Render toast
      const el = createToastEl(item);
      toastStack.prepend(el);

      // Animate in
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateX(0)";
      });

      playSound();

      // Auto-dismiss
      if (item.duration && item.duration > 0) {
        const timer = setTimeout(() => remove(item.id), item.duration);
        timers.set(item.id, timer);
      }

      // Limit visible
      const visibleItems = items.filter((n) => n.type !== "persistent");
      while (visibleItems.length > opts.maxVisible) {
        const oldest = visibleItems.pop();
        if (oldest) remove(oldest.id);
      }

      return item.id;
    }

    function remove(id: string): void {
      const idx = items.findIndex((n) => n.id === id);
      if (idx < 0) return;

      items.splice(idx, 1);

      // Clear timer
      const timer = timers.get(id);
      if (timer) { clearTimeout(timer); timers.delete(id); }

      // Animate out
      const el = toastStack.querySelector(`[data-id="${id}"]`);
      if (el) {
        el.style.opacity = "0";
        el.style.transform = "translateX(20px)";
        setTimeout(() => el.remove(), 200);
      }

      notifyCountChange();
    }

    function notifyCountChange(): void {
      const total = items.length;
      const unread = items.filter((n) => !n.read).length;
      for (const cb of countListeners) cb(total, unread);
      opts.onCountChange?.(total, unread);
    }

    const instance: NotificationHubInstance = {
      element: root,

      push(notif) {
        const item: NotificationItem = {
          ...notif,
          id: notif.id ?? generateId(),
          timestamp: Date.now(),
          read: false,
          type: notif.type ?? "toast",
        };
        return addNotification(item);
      },

      info(title, message) {
        return this.push({ title, message, level: "info" });
      },

      success(title, message) {
        return this.push({ title, message, level: "success" });
      },

      warning(title, message) {
        return this.push({ title, message, level: "warning" });
      },

      error(title, message) {
        return this.push({ title, message, level: "error" });
      },

      loading(title, message) {
        return this.push({ title, message, level: "info", duration: 0, type: "persistent" });
      },

      remove(id) { remove(id); },

      clear() {
        for (const item of [...items]) remove(item.id);
        timers.forEach((t) => clearTimeout(t));
        timers.clear();
      },

      markAllRead() {
        for (const item of items) item.read = true;
        notifyCountChange();
      },

      getAll() { return [...items]; },

      getUnreadCount() { return items.filter((n) => !n.read).length; },

      getCount() { return this.getAll(); },

      filter(fn) { return items.filter(fn); },

      subscribeCount(cb) {
        countListeners.add(cb);
        return () => { countListeners.delete(cb); };
      },

      destroy() {
        destroyed = true;
        timers.forEach((t) => clearTimeout(t));
        timers.clear();
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a notification hub */
export function createNotificationHub(options?: NotificationHubOptions): NotificationHubInstance {
  return new NotificationHubManager().create(options);
}
