/**
 * Notification/toast system with queue management and positioning.
 */

export type NotificationType = "success" | "error" | "warning" | "info" | "loading";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  /** Show progress bar for auto-dismiss */
  showProgress?: boolean;
  /** Custom styling */
  className?: string;
  createdAt: number;
}

export interface NotificationOptions {
  /** Position on screen */
  position?: NotificationPosition;
  /** Max notifications shown at once */
  maxVisible?: number;
  /** Default duration in ms */
  defaultDuration?: number;
  /** Enable/disable sound */
  enableSound?: boolean;
  /** Pause on hover */
  pauseOnHover?: boolean;
  /** Close on click */
  closeOnClick?: boolean;
  /** Animation duration */
  animationDuration?: number;
}

export type NotificationPosition =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

type NotificationListener = (notifications: Notification[]) => void;

/** Main notification manager */
export class NotificationManager {
  private notifications: Notification[] = [];
  private listeners = new Set<NotificationListener>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private options: Required<NotificationOptions>;
  private counter = 0;
  private paused = false;
  private pauseTimers = new Map<string, number>();

  constructor(options: NotificationOptions = {}) {
    this.options = {
      position: options.position ?? "top-right",
      maxVisible: options.maxVisible ?? 5,
      defaultDuration: options.defaultDuration ?? 5000,
      enableSound: options.enableSound ?? false,
      pauseOnHover: options.pauseOnHover ?? true,
      closeOnClick: options.closeOnClick ?? false,
      animationDuration: options.animationDuration ?? 300,
    };
  }

  /** Subscribe to notification changes */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get current notifications */
  getNotifications(): Notification[] {
    return this.notifications.slice(0, this.options.maxVisible);
  }

  /** Get all notifications (including queued) */
  getAllNotifications(): Notification[] {
    return [...this.notifications];
  }

  /** Add a notification */
  add(notification: Omit<Notification, "id" | "createdAt">): string {
    const id = `notif-${++this.counter}-${Date.now()}`;
    const notif: Notification = {
      ...notification,
      id,
      createdAt: Date.now(),
    };

    this.notifications.unshift(notif);
    this.emit();

    // Auto-dismiss
    const duration = notification.duration ?? this.options.defaultDuration;
    if (duration > 0) {
      this.scheduleDismiss(id, duration);
    }

    return id;
  }

  /** Convenience methods */
  success(title: string, message?: string, options?: Partial<NotificationOptions & { action?: Notification["action"] }>): string {
    return this.add({ type: "success", title, message, ...options });
  }

  error(title: string, message?: string, options?: Partial<NotificationOptions & { action?: Notification["action"] }>): string {
    return this.add({ type: "error", title, message, ...options });
  }

  warning(title: string, message?: string, options?: Partial<NotificationOptions & { action?: Notification["action"] }>): string {
    return this.add({ type: "warning", title, message, ...options });
  }

  info(title: string, message?: string, options?: Partial<NotificationOptions & { action?: Notification["action"] }>): string {
    return this.add({ type: "info", title, message, ...options });
  }

  loading(title: string, message?: string): string {
    return this.add({ type: "loading", title, message, duration: 0 });
  }

  /** Remove a notification by ID */
  remove(id: string): void {
    this.clearTimer(id);
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.emit();
  }

  /** Remove all notifications */
  clear(): void {
    for (const id of this.notifications.map((n) => n.id)) {
      this.clearTimer(id);
    }
    this.notifications = [];
    this.emit();
  }

  /** Update an existing notification */
  update(id: string, updates: Partial<Omit<Notification, "id" | "createdAt">>): void {
    const idx = this.notifications.findIndex((n) => n.id === id);
    if (idx < 0) return;

    this.notifications[idx] = { ...this.notifications[idx]!, ...updates };
    this.emit();
  }

  /** Dismiss a loading notification and replace it */
  resolveLoading(id: string, type: NotificationType, title: string, message?: string): void {
    this.update(id, { type, title, message, duration: this.options.defaultDuration });
    this.scheduleDismiss(id, this.options.defaultDuration);
  }

  /** Pause auto-dismiss (e.g., on hover) */
  pause(): void {
    this.paused = true;
    for (const [id] of this.timers) {
      const timer = this.timers.get(id)!;
      this.pauseTimers.set(id, Date.now() - timer.startTime!);
      clearTimeout(timer.id);
    }
    this.timers.clear();
  }

  /** Resume auto-dismiss */
  resume(): void {
    this.paused = false;
    for (const [id, elapsed] of this.pauseTimers) {
      const notif = this.notifications.find((n) => n.id === id);
      if (notif && (notif.duration ?? this.options.defaultDuration) > 0) {
        const remaining = (notif.duration ?? this.options.defaultDuration) - elapsed;
        if (remaining > 0) {
          this.scheduleDismiss(id, remaining);
        }
      }
    }
    this.pauseTimers.clear();
  }

  /** Destroy the manager */
  destroy(): void {
    this.clear();
    this.listeners.clear();
  }

  // --- Private ---

  private emit(): void {
    const visible = this.getNotifications();
    for (const listener of this.listeners) {
      try {
        listener(visible);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private scheduleDismiss(id: string, delay: number): void {
    const startTime = Date.now();
    const timerId = setTimeout(() => {
      this.remove(id);
    }, delay);

    this.timers.set(id, { id: timerId, startTime });
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer.id);
      this.timers.delete(id);
    }
  }
}

// Type for stored timer info
interface TimerInfo {
  id: ReturnType<typeof setTimeout>;
  startTime: number;
}

/** Global singleton instance */
let globalManager: NotificationManager | null = null;

/** Get or create the global notification manager */
export function getNotificationManager(options?: NotificationOptions): NotificationManager {
  if (!globalManager) {
    globalManager = new NotificationManager(options);
  }
  return globalManager;
}

/** Quick access methods using global manager */
export function toast: {
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  loading: (title: string, message?: string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
} = {
  success: (t, m) => getNotificationManager().success(t, m),
  error: (t, m) => getNotificationManager().error(t, m),
  warning: (t, m) => getNotificationManager().warning(t, m),
  info: (t, m) => getNotificationManager().info(t, m),
  loading: (t, m) => getNotificationManager().loading(t, m),
  dismiss: (id) => getNotificationManager().remove(id),
  clear: () => getNotificationManager().clear(),
};
