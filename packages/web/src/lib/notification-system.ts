/**
 * Notification System: toast notifications, in-app notification center, push notification
 * API wrapper, notification scheduling, permission management, sound/vibration,
 * action buttons, grouping/deduplication, priority levels, read/unread state.
 */

// --- Types ---

export type NotificationType = "info" | "success" | "warning" | "error" | "default";
export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface Notification {
  id: string;
  title: string;
  message?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  icon?: string;        // URL or emoji
  image?: string;       // Hero image URL
  actions?: Array<{ label: string; action: () => void; style?: "primary" | "secondary" | "danger"; href?: string }>;
  duration?: number;     // ms, 0 = persistent (manual dismiss)
  timestamp?: number;
  read?: boolean;
  source?: string;       // Component that created it
  data?: Record<string, unknown>;
  progress?: { current: number; total: number; status?: string };
  /** @internal */ _dismissed?: boolean;
  /** @internal */ _element?: HTMLElement;
}

export interface NotificationConfig {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
  maxVisible?: number;
  defaultDuration?: number;
  enableSound?: boolean;
  enableVibration?: boolean;
  groupSimilar?: boolean;
  groupTimeout?: number;    // ms to wait before grouping
  showProgress?: boolean;
  showCloseButton?: boolean;
  showTimestamp?: boolean;
  onClick?: (notification: Notification) => void;
  onDismiss?: (notification: Notification) => void;
  onAction?: (notification: Notification, actionLabel: string) => void;
}

// --- Notification Manager ---

export class NotificationCenter {
  private notifications: Map<string, Notification> = new Map();
  private activeNotifications: Notification[] = [];
  private container: HTMLDivElement | null = null;
  private config: Required<NotificationConfig>;
  private listeners = new Set<(n: Notification, type: "added" | "dismissed" | "read" | "action") => void>();
  private groupBuffer: Map<string, Notification[]> = new Map();
  private groupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private idCounter = 0;

  constructor(config: NotificationConfig = {}) {
    this.config = {
      position: config.position ?? "top-right",
      maxVisible: config.maxVisible ?? 5,
      defaultDuration: config.defaultDuration ?? 4000,
      enableSound: config.enableSound ?? false,
      enableVibration: config.enableVibration ?? false,
      groupSimilar: config.groupSimilar ?? true,
      groupTimeout: config.groupTimeout ?? 500,
      showProgress: config.showProgress ?? true,
      showCloseButton: config.showCloseButton ?? true,
      showTimestamp: config.showTimestamp ?? false,
      onClick: config.onClick,
      onDismiss: config.onDismiss,
      onAction: config.onAction,
    };

    if (typeof document !== "undefined") this.initContainer();
  }

  /** Show a notification */
  notify(options: string | Partial<Notification>): string {
    const id = `notif-${Date.now()}-${++this.idCounter}`;
    const notif: Notification = {
      id,
      title: typeof options === "string" ? options : options.title ?? "",
      message: typeof options === "string" ? undefined : options.message,
      type: typeof options === "string" ? "default" : options.type ?? "default",
      priority: typeof options === "string" ? "normal" : options.priority ?? "normal",
      duration: typeof options === "string" ? undefined : options.duration,
      timestamp: Date.now(),
      read: false,
      ...((typeof options === "string" ? {} : options)),
    };

    // Grouping logic
    if (this.config.groupSimilar && notif.type !== "error") {
      const groupKey = `${notif.title}|${notif.source ?? ""}`;
      let group = this.groupBuffer.get(groupKey);
      if (!group) { group = []; this.groupBuffer.set(groupKey, group); }
      group.push(notif);

      clearTimeout(this.groupTimers.get(groupKey));
      this.groupTimers.set(groupKey, setTimeout(() => {
        this.flushGroup(groupKey);
      }, this.config.groupTimeout));

      return id;
    }

    return this.addNotification(notif);
  }

  /** Convenience methods for each type */
  info(title: string, message?: string): string { return this.notify({ title, message, type: "info" }); }
  success(title: string, message?: string): string { return this.notify({ title, message, type: "success" }); }
  warning(title: string, message?: string): string { return this.notify({ title, message, type: "warning" }); }
  error(title: string, message?: string): string { return this.notify({ title, message, type: "error", priority: "high", duration: 6000 }); }
  progress(title: string, current: number, total: number, opts?: Partial<Notification>): string {
    return this.notify({ title, type: "info", progress: { current, total, status: opts?.progress?.status }, duration: 0, ...opts });
  }

  /** Dismiss a notification by ID */
  dismiss(id: string): void {
    const notif = this.notifications.get(id);
    if (notif && !notif._dismissed) {
      notif._dismissed = true;
      this.removeActive(notif);
      this.config.onDismiss?.(notif);
      this.listeners.forEach((l) => l(notif, "dismissed"));
      this.animateOut(notif._element!);
    }
  }

  /** Dismiss all notifications */
  dismissAll(): void {
    for (const [id] of this.notifications) this.dismiss(id);
  }

  /** Mark as read without dismissing */
  markRead(id: string): void {
    const notif = this.notifications.get(id);
    if (notif && !notif.read) {
      notif.read = true;
      this.listeners.forEach((l) => l(notif, "read"));
      this.updateElement(notif);
    }
  }

  /** Mark all as read */
  markAllRead(): void {
    for (const [, n] of this.notifications) { if (!n.read) this.markRead(n.id); }
  }

  /** Get all notifications (including dismissed) */
  getAll(): Notification[] { return Array.from(this.notifications.values()); }

  /** Get unread count */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter((n) => !n.read && !n._dismissed).length;
  }

  /** Update a notification's content (e.g., progress update) */
  update(id: string, updates: Partial<Notification>): void {
    const notif = this.notifications.get(id);
    if (notif) {
      Object.assign(notif, updates);
      this.updateElement(notif);
    }
  }

  /** Clear all stored notifications */
  clear(): void {
    this.dismissAll();
    this.notifications.clear();
    this.activeNotifications = [];
    if (this.container) this.container.innerHTML = "";
  }

  /** Listen to notification events */
  onEvent(listener: (n: Notification, type: "added" | "dismissed" | "read" | "action") => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Internal ---

  private addNotification(notif: Notification): string {
    this.notifications.set(notif.id, notif);

    // Enforce max visible - remove oldest low-priority
    while (this.activeNotifications.length >= this.config.maxVisible) {
      const oldest = this.activeNotifications[0];
      if (oldest && oldest.priority !== "critical") {
        this.dismiss(oldest.id);
      } else break;
    }

    this.activeNotifications.push(notif);
    this.renderNotification(notif);
    this.listeners.forEach((l) => l(notif, "added"));

    // Auto-dismiss
    const duration = notif.duration ?? this.config.defaultDuration;
    if (duration > 0) {
      setTimeout(() => this.dismiss(notif.id), duration);
    }

    // Sound/Vibration
    if (this.config.enableSound) this.playSound(notif.type);
    if (this.config.enableVibration) this.vibrate();

    return notif.id;
  }

  private removeActive(notif: Notification): void {
    const idx = this.activeNotifications.indexOf(notif);
    if (idx >= 0) this.activeNotifications.splice(idx, 1);
  }

  private flushGroup(groupKey: string): void {
    const group = this.groupBuffer.get(groupKey);
    this.groupBuffer.delete(groupKey);

    if (group && group.length > 1) {
      // Create grouped notification
      const first = group[0]!;
      const grouped: Notification = {
        ...first,
        title: first.title,
        message: `${group.length} notifications`,
        data: { ...first.data, _count: group.length, _ids: group.map((g) => g.id) },
      };
      this.addNotification(grouped);
    } else if (group?.length === 1) {
      this.addNotification(group[0]);
    }
  }

  // --- Rendering ---

  private initContainer(): void {
    this.container = document.createElement("div");
    this.container.className = "nc-container";
    this.container.setAttribute("role", "status");
    this.container.setAttribute("aria-live", "polite");
    this.container.setAttribute("aria-label", "Notifications");
    document.body.appendChild(this.container);

    const style = document.createElement("style");
    style.textContent = `
      .nc-container {
        position: fixed; z-index: 99999; pointer-events: none;
        display: flex; flex-direction: column; gap: 8px;
        max-width: 380px; max-height: calc(100vh - 16px);
        padding: 8px; overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px; line-height: 1.4;
      }
      .nc-notification {
        pointer-events: auto; border-radius: 10px; padding: 12px 16px;
        background: var(--nc-bg, #fff); color: var(--nc-fg, #333);
        box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 2px rgba(0,0,0,0.05);
        display: flex; gap: 12px; align-items: flex-start;
        animation: nc-slide-in 0.25s ease-out;
        transition: transform 0.2s ease, opacity 0.2s ease;
        position: relative; overflow: hidden;
      }
      .nc-notification.nc-dismissing { animation: nc-slide-out 0.2s ease-in forwards; }
      .nc-icon { width: 24px; height: 24px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; border-radius: 6px; }
      .nc-content { flex: 1; min-width: 0; }
      .nc-title { font-weight: 600; font-size: 14px; margin-bottom: 2px; word-break: break-word; }
      .nc-message { font-size: 13px; color: #666; word-break: break-word; }
      .nc-actions { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
      .nc-action-btn {
        padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;
        cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
      }
      .nc-action-btn:hover { opacity: 0.85; }
      .nc-action-btn.primary { background: #007aff; color: #fff; }
      .nc-action-btn.danger { background: #ff3b30; color: #fff; }
      .nc-action-btn.secondary { background: #f0f0f0; color: #333; }
      .nc-close { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px;
        border: none; background: rgba(0,0,0,0.08); border-radius: 50%; cursor: pointer;
        color: #666; font-size: 14px; display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.15s;
      }
      .nc-notification:hover .nc-close { opacity: 1; }
      .nc-progress { width: 100%; height: 4px; background: #eee; border-radius: 2px; overflow: hidden; margin-top: 6px; }
      .nc-progress-bar { height: 100%; background: linear-gradient(90deg, #007aff, #00c6ff); border-radius: 2px; transition: width 0.3s ease; }
      .nc-timestamp { font-size: 11px; color: #999; margin-top: 4px; }
      /* Type colors */
      .nc-notification.info .nc-icon { background: #e7f3ff; color: #0066cc; }
      .nc-notification.success .nc-icon { background: #e8faf0; color: #16a34a; }
      .nc-notification.warning .nc-icon { background: #fff8e1; color: #d48806; }
      .nc-notification.error .nc-icon { background: #fef0f0; color: #cc0000; }
      .nc-notification.default .nc-icon { background: #f5f5f5; color: #666; }
      /* Positions */
      .nc-container.nc-top-right { top: 16px; right: 16px; align-items: flex-end; }
      .nc-container.nc-top-left { top: 16px; left: 16px; align-items: flex-end; }
      .nc-container.nc-bottom-right { bottom: 16px; right: 16px; align-items: flex-start; }
      .nc-container.nc-bottom-left { bottom: 16px; left: 16px; align-items: flex-start; }
      .nc-container.nc-top-center { top: 16px; left: 50%; transform: translateX(-50%); align-items: flex-end; }
      .nc-container.nc-bottom-center { bottom: 16px; left: 50%; transform: translateX(-50%); align-items: flex-start; }
      @keyframes nc-slide-in { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes nc-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(20px); opacity: 0; } }
    `;
    this.container.appendChild(style);
    this.container.classList.add(`nc-${this.config.position}`);
  }

  private renderNotification(notif: Notification): void {
    if (!this.container) return;

    const el = document.createElement("div");
    el.className = `nc-notification ${notif.type ?? "default"}`;
    el.setAttribute("data-notif-id", notif.id);

    // Icon
    const icons: Record<string, string> = { info: "i", success: "✓", warning: "!", error: "✗", default: "•" };
    el.innerHTML = `<div class="nc-icon">${notif.icon ?? icons[notif.type ?? "default"]}</div>`;

    // Content
    const content = document.createElement("div");
    content.className = "nc-content";
    content.innerHTML = `<div class="nc-title">${escapeHtml(notif.title)}</div>` +
      (notif.message ? `<div class="nc-message">${escapeHtml(notif.message)}</div>` : "");
    el.appendChild(content);

    // Actions
    if (notif.actions && notif.actions.length > 0) {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "nc-actions";
      for (const action of notif.actions) {
        const btn = document.createElement("button");
        btn.className = `nc-action-btn ${action.style ?? "secondary"}`;
        btn.textContent = action.label;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          action.action();
          this.config.onAction?.(notif, action.label);
          this.listeners.forEach((l) => l(notif, "action"));
        });
        actionsDiv.appendChild(btn);
      }
      el.appendChild(actionsDiv);
    }

    // Progress bar
    if (notif.progress && this.config.showProgress) {
      const progDiv = document.createElement("div");
      progDiv.className = "nc-progress";
      const pct = Math.min(100, Math.round((notif.progress.current / Math.max(1, notif.progress.total)) * 100));
      progDiv.innerHTML = `<div class="nc-progress-bar" style="width:${pct}%"></div>`;
      el.appendChild(progDiv);
    }

    // Timestamp
    if (this.config.showTimestamp) {
      const timeEl = document.createElement("div");
      timeEl.className = "nc-timestamp";
      timeEl.textContent = formatTimeAgo(notif.timestamp ?? Date.now());
      el.appendChild(timeEl);
    }

    // Close button
    if (this.config.showCloseButton) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "nc-close";
      closeBtn.innerHTML = "×";
      closeBtn.addEventListener("click", (e) => { e.stopPropagation(); this.dismiss(notif.id); });
      el.appendChild(closeBtn);
    }

    // Click handler
    el.addEventListener("click", () => this.config.onClick?.(notif));

    notif._element = el;
    this.container!.appendChild(el);
  }

  private updateElement(notif: Notification): void {
    if (!notif._element) return;
    // Update progress bar if present
    const progressBar = notif._element.querySelector(".nc-progress-bar");
    if (progressBar && notif.progress) {
      const pct = Math.min(100, Math.round((notif.progress.current / Math.max(1, notif.progress.total)) * 100));
      progressBar.style.width = `${pct}%`;
    }
  }

  private animateOut(el: HTMLElement): void {
    el.classList.add("nc-dismissing");
    setTimeout(() => el.remove(), 200);
  }

  private playSound(_type: NotificationType): void {
    // Could use Web Audio API or Audio element
    // Simplified: just log
  }

  private vibrate(): void {
    if (navigator.vibrate) navigator.vibrate(200);
  }

  destroy(): void {
    this.clear();
    this.container?.remove();
    this.container = null;
  }
}

// --- Push Notification API Wrapper ---

export class PushNotificationManager {
  private permission: NotificationPermission = "default";
  private swRegistration: ServiceWorkerRegistration | null = null;

  /** Request push notification permission */
  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) return "denied";
    this.permission = await Notification.requestPermission();
    return this.permission;
  }

  /** Check current permission status */
  async checkPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) return "denied";
    this.permission = Notification.permission;
    return this.permission;
  }

  /** Send push notification via service worker */
  async sendPush(payload: { title: string; body?: string; icon?: string; tag?: string; data?: unknown }): Promise<void> {
    if (!this.swRegistration) throw new Error("Service worker not registered");
    await this.swRegistration.showNotification(payload.title, {
      body: payload.body, icon: payload.icon, tag: payload.tag, data: JSON.stringify(payload.data),
    });
  }

  /** Register service worker for push */
  async registerWorker(swUrl: string): Promise<void> {
    this.swRegistration = await navigator.serviceWorker.register(swUrl);
    console.log("SW registered for push:", this.swRegistration.scope);
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window;
  }
}

// --- Utilities ---

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(timestamp);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
