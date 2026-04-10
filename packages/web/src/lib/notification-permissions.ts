/**
 * Notification Permissions: Browser Notification API wrapper with permission
 * request flow, notification creation (title/body/icon/image/actions/badge/vibrate),
 * click/close handlers, scheduled/delayed notifications, permission status
 * tracking, and fallback UI for denied permissions.
 */

// --- Types ---

export type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";

export interface NotificationOptions {
  /** Notification title */
  title: string;
  /** Body text */
  body?: string;
  /** Icon URL (absolute or data URI) */
  icon?: string;
  /** Image URL for large image display */
  image?: string;
  /** Badge URL (small icon shown in notification shelf) */
  badge?: string;
  /** Vibration pattern in ms */
  vibrate?: number[];
  /** Whether notification should be silent (no sound/vibration) */
  silent?: boolean;
  /** Actions with user-facing labels */
  actions?: Array<{ action: string; title: string; icon?: string }>;
  /** Direction of text: "auto" | "ltr" | "rtl" */
  dir?: "auto" | "ltr" | "rtl";
  /** Language tag (e.g., "en", "zh-CN") */
  lang?: string;
  /** Arbitrary data attached to the notification */
  data?: unknown;
  /** Tag — notifications with same tag replace each other */
  tag?: string;
  /** Whether to require interaction before dismissing */
  requireInteraction?: boolean;
  /** Callback when notification is clicked */
  onClick?: (event: NotificationEvent) => void;
  /** Callback when notification is closed */
  onClose?: () => void;
  /** Callback when an action button is clicked */
  onAction?: (action: string, event: NotificationEvent) => void;
  /** Auto-close after ms (0 = no auto-close) */
  autoClose?: number;
}

export interface ScheduledNotification {
  id: string;
  options: NotificationOptions;
  scheduledAt: number;
  timerId: ReturnType<typeof setTimeout>;
}

export interface NotificationManagerOptions {
  /** Application name shown in permission prompt */
  appName?: string;
  /** Icon URL used as default for all notifications */
  defaultIcon?: string;
  /** Badge URL used as default */
  defaultBadge?: string;
  /** Default vibration pattern */
  defaultVibrate?: number[];
  /** Default language */
  defaultLang?: string;
  /** Maximum simultaneous notifications (default: 5) */
  maxNotifications?: number;
  /** Callback on permission status change */
  onPermissionChange?: (status: PermissionStatus) => void;
  /** Fallback handler when permission is denied (show in-app toast etc.) */
  onDeniedFallback?: (options: NotificationOptions) => void;
}

export interface NotificationManagerInstance {
  /** Current permission status */
  getPermissionStatus: () => PermissionStatus;
  /** Request notification permission */
  requestPermission: () => Promise<PermissionStatus>;
  /** Show a notification */
  notify: (options: NotificationOptions) => Promise<Notification | null>;
  /** Schedule a delayed notification */
  schedule: (options: NotificationOptions, delayMs: number) => string;
  /** Cancel a scheduled notification */
  cancelScheduled: (id: string) => void;
  /** Cancel all scheduled notifications */
  cancelAllScheduled: () => void;
  /** Get list of active scheduled notifications */
  getScheduledNotifications: () => ScheduledNotification[];
  /** Close all visible notifications */
  closeAll: () => void;
  /** Check if notifications are supported */
  isSupported: () => boolean;
  /** Subscribe to notification click events globally */
  onClick: (handler: (event: NotificationEvent) => void) => () => void;
  /** Subscribe to notification close events globally */
  onClose: (handler: (event: Event) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function toBrowserStatus(status: NotificationPermission): PermissionStatus {
  switch (status) {
    case "granted": return "granted";
    case "denied": return "denied";
    case "default": return "prompt";
    default: return "unsupported";
  }
}

// --- Main Class ---

export class NotificationPermissionManager {
  create(options: NotificationManagerOptions = {}): NotificationManagerInstance {
    let destroyed = false;

    // State
    const scheduled = new Map<string, ScheduledNotification>();
    const activeNotifications = new Set<Notification>();
    const clickHandlers = new Set<(event: NotificationEvent) => void>();
    const closeHandlers = new Set<(event: Event) => void>();

    // Options
    const maxNotifications = options.maxNotifications ?? 5;

    function getStatus(): PermissionStatus {
      if (!isSupported()) return "unsupported";
      return toBrowserStatus(Notification.permission);
    }

    async function requestPerm(): Promise<PermissionStatus> {
      if (!isSupported()) return "unsupported";

      if (getStatus() === "granted") return "granted";
      if (getStatus() === "denied") {
        options.onDeniedFallback?.({ title: "Permission required" });
        return "denied";
      }

      try {
        const status = await Notification.requestPermission();
        const result = toBrowserStatus(status);
        options.onPermissionChange?.(result);
        return result;
      } catch {
        return "unsupported";
      }
    }

    async function showNotification(opts: NotificationOptions): Promise<Notification | null> {
      if (destroyed) return null;

      const status = await ensurePermission();
      if (status !== "granted") {
        options.onDeniedFallback?.(opts);
        return null;
      }

      // Enforce max concurrent notifications
      if (activeNotifications.size >= maxNotifications) {
        const oldest = Array.from(activeNotifications)[0];
        oldest?.close();
        activeNotifications.delete(oldest);
      }

      // Build browser notification options
      const browserOpts: NotificationOptions & { [key: string]: unknown } = {
        body: opts.body ?? "",
        icon: opts.icon ?? options.defaultIcon,
        badge: opts.badge ?? options.defaultBadge,
        dir: opts.dir ?? "auto",
        lang: opts.lang ?? options.defaultLang ?? "en",
        silent: opts.silent ?? false,
        requireInteraction: opts.requireInteraction ?? false,
        data: opts.data,
        tag: opts.tag,
        image: opts.image,
        vibrate: opts.vibrate ?? options.defaultVibrate,
        actions: opts.actions,
      };

      try {
        const notification = new Notification(opts.title, browserOpts);

        // Attach handlers
        if (opts.onClick || clickHandlers.size > 0) {
          notification.onclick = (event: Event) => {
            const evt = event as unknown as NotificationEvent;
            opts.onClick?.(evt);
            for (const h of clickHandlers) h(evt);
            window.focus();
            notification.close();
          };
        }

        notification.onclose = (): void => {
          activeNotifications.delete(notification);
          opts.onClose?.();
          for (const h of closeHandlers) h(event);
        };

        if (opts.onAction && opts.actions?.length) {
          notification.addEventListener("notificationclick", (event: Event) => {
            const evt = event as NotificationEvent;
            if (evt.action) {
              opts.onAction!(evt.action, evt);
            }
          });
        }

        activeNotifications.add(notification);

        // Auto-close
        if (opts.autoClose && opts.autoClose > 0) {
          setTimeout(() => {
            notification.close();
          }, opts.autoClose);
        }

        return notification;

      } catch (err) {
        console.error("[NotificationManager] Failed to show notification:", err);
        options.onDeniedFallback?.(opts);
        return null;
      }
    }

    async function ensurePermission(): Promise<PermissionStatus> {
      const current = getStatus();
      if (current === "granted") return "granted";
      if (current === "denied") return "denied";
      return requestPerm();
    }

    const instance: NotificationManagerInstance = {

      getPermissionStatus: getStatus,

      requestPermission: requestPerm,

      notify: showNotification,

      schedule(opts, delayMs): string {
        const id = crypto.randomUUID();
        const timerId = setTimeout(async () => {
          scheduled.delete(id);
          await showNotification(opts);
        }, delayMs);

        const sched: ScheduledNotification = {
          id,
          options: opts,
          scheduledAt: Date.now() + delayMs,
          timerId,
        };
        scheduled.set(id, sched);
        return id;
      },

      cancelScheduled(id: string): void {
        const s = scheduled.get(id);
        if (s) {
          clearTimeout(s.timerId);
          scheduled.delete(id);
        }
      },

      cancelAllScheduled(): void {
        for (const [, s] of scheduled) {
          clearTimeout(s.timerId);
        }
        scheduled.clear();
      },

      getScheduledNotifications(): ScheduledNotification[] {
        return Array.from(scheduled.values());
      },

      closeAll(): void {
        for (const n of activeNotifications) {
          n.close();
        }
        activeNotifications.clear();
      },

      isSupported: isSupported,

      onClick(handler): () => void {
        clickHandlers.add(handler);
        return () => { clickHandlers.delete(handler); };
      },

      onClose(handler): () => void {
        closeHandlers.add(handler);
        return () => { closeHandlers.delete(handler); };
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        instance.cancelAllScheduled();
        instance.closeAll();
        clickHandlers.clear();
        closeHandlers.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a notification manager */
export function createNotificationManager(options?: NotificationManagerOptions): NotificationManagerInstance {
  return new NotificationPermissionManager().create(options);
}

// --- Standalone utilities ---

/** Check if the Notifications API is supported */
export function isSupported(): boolean {
  return typeof window !== "undefined" &&
    "Notification" in window &&
    typeof Notification.requestPermission === "function";
}

/** Quick one-shot notification (requests permission if needed) */
export async function quickNotify(
  title: string,
  body?: string,
  icon?: string,
): Promise<boolean> {
  if (!isSupported()) return false;

  const status = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();

  if (status !== "granted") return false;

  new Notification(title, { body, icon });
  return true;
}

/** Request notification permission and return status */
export async function requestNotificationPermission(): Promise<PermissionStatus> {
  if (!isSupported()) return "unsupported";
  return toBrowserStatus(await Notification.requestPermission());
}
