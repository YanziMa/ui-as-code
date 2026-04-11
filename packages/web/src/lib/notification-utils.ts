/**
 * Notification Utilities: Toast/notification system, alert banners,
 * notification queue, progress notifications, stacking behavior,
 * auto-dismiss, action buttons, and notification manager.
 */

// --- Types ---

export type NotificationType = "info" | "success" | "warning" | "error" | "loading";

export type NotificationPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface NotificationOptions {
  /** Unique ID (auto-generated if omitted) */
  id?: string;
  /** Notification type */
  type?: NotificationType;
  /** Title text */
  title: string;
  /** Description/body text */
  message?: string;
  /** Duration in ms before auto-dismiss. 0 = persistent. Default 5000 */
  duration?: number;
  /** Position override for this notification */
  position?: NotificationPosition;
  /** Show close button. Default true */
  closable?: boolean;
  /** Action button label and callback */
  action?: { label: string; onClick: () => void };
  /** Secondary action */
  secondaryAction?: { label: string; onClick: () => void };
  /** Custom icon (SVG string or element) */
  icon?: string;
  /** Progress value (0-1) for loading notifications */
  progress?: number;
  /** Whether to show a progress bar. Default false */
  showProgress?: boolean;
  /** Pause auto-dismiss on hover. Default true */
  pauseOnHover?: boolean;
  /** Callback when dismissed (by user or timeout) */
  onDismiss?: (id: string) => void;
  /** Callback when notification mounts to DOM */
  onMount?: (el: HTMLElement) => void;
  /** Custom CSS class name */
  className?: string;
  /** Render as HTML vs text. Default false */
  html?: boolean;
}

export interface NotificationInstance {
  /** The notification's unique ID */
  id: string;
  /** The DOM element */
  element: HTMLElement;
  /** Dismiss the notification */
  dismiss: () => void;
  /** Update properties */
  update: (opts: Partial<NotificationOptions>) => void;
  /** Get current options */
  getOptions: () => NotificationOptions;
}

export interface NotificationManagerConfig {
  /** Container element (auto-created if omitted) */
  container?: HTMLElement;
  /** Default position for all notifications */
  position?: NotificationPosition;
  /** Maximum visible at once. Default 5 */
  maxVisible?: number;
  /** Queue overflow behavior: "replace-oldest" | "drop-newest" | "queue". Default "queue" */
  overflowBehavior?: "replace-oldest" | "drop-newest" | "queue";
  /** Default duration in ms. Default 5000 */
  defaultDuration?: number;
  /** Animation duration in ms. Default 300 */
  animationDuration?: number;
  /** Spacing between notifications in px. Default 8 */
  spacing?: number;
  /** Enable enter/exit animations. Default true */
  animate?: boolean;
  /** Global callback when any notification is dismissed */
  onDismiss?: (id: string) => void;
  /** Global callback when queue state changes */
  onQueueChange?: (pending: number, visible: number) => void;
}

// --- Notification Manager ---

/**
 * NotificationManager - creates, manages, and dismisses toast notifications.
 * Handles queuing, positioning, animations, and lifecycle.
 *
 * @example
 * ```ts
 * const notifier = new NotificationManager({ position: "top-right" });
 * notifier.show({ title: "Saved!", type: "success", message: "Your changes were saved." });
 * ```
 */
export class NotificationManager {
  private config: Required<NotificationManagerConfig>;
  private container: HTMLElement;
  private active: Map<string, NotificationInstance> = new Map();
  private queue: NotificationOptions[] = [];
  private positionContainers = new Map<NotificationPosition, HTMLElement>();
  private cleanupFns: Array<() => void> = [];

  constructor(config: NotificationManagerConfig = {}) {
    this.config = {
      container: config.container ?? document.body,
      position: config.position ?? "top-right",
      maxVisible: config.maxVisible ?? 5,
      overflowBehavior: config.overflowBehavior ?? "queue",
      defaultDuration: config.defaultDuration ?? 5000,
      animationDuration: config.animationDuration ?? 300,
      spacing: config.spacing ?? 8,
      animate: config.animate !== false,
      ...config,
    };

    this.container = this.config.container;
    this._createPositionContainers();
  }

  /** Show a notification. Returns instance for programmatic control. */
  show(options: NotificationOptions): NotificationInstance {
    const id = options.id ?? `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const opts: NotificationOptions = {
      type: "info",
      duration: this.config.defaultDuration,
      closable: true,
      pauseOnHover: true,
      ...options,
      id,
    };

    // Check capacity
    const visibleInPosition = this._getVisibleCount(opts.position ?? this.config.position);
    if (visibleInPosition >= this.config.maxVisible) {
      switch (this.config.overflowBehavior) {
        case "replace-oldest":
          const oldest = this._getOldestInPosition(opts.position ?? this.config.position);
          if (oldest) oldest.dismiss();
          break;
        case "drop-newest":
          return this._createNullInstance(id, opts); // Silently drop
        case "queue":
          this.queue.push(opts);
          this.config.onQueueChange?.(this.queue.length, this.active.size);
          return this._createNullInstance(id, opts);
      }
    }

    return this._createNotification(opts);
  }

  /** Quick success notification */
  success(title: string, message?: string): NotificationInstance {
    return this.show({ title, message, type: "success" });
  }

  /** Quick error notification */
  error(title: string, message?: string): NotificationInstance {
    return this.show({ title, message, type: "error", duration: 0 }); // Errors persist
  }

  /** Quick warning notification */
  warning(title: string, message?: string): NotificationInstance {
    return this.show({ title, message, type: "warning" });
  }

  /** Quick info notification */
  info(title: string, message?: string): NotificationInstance {
    return this.show({ title, message, type: "info" });
  }

  /** Loading notification (returns instance so you can update/resolve it) */
  loading(title: string = "Loading...", message?: string): NotificationInstance {
    return this.show({
      title,
      message,
      type: "loading",
      duration: 0,
      showProgress: true,
      progress: undefined,
      closable: false,
    });
  }

  /** Dismiss a specific notification by ID */
  dismiss(id: string): boolean {
    const instance = this.active.get(id);
    if (instance) {
      instance.dismiss();
      return true;
    }
    // Also remove from queue
    this.queue = this.queue.filter((n) => n.id !== id);
    return false;
  }

  /** Dismiss all active notifications */
  dismissAll(): void {
    for (const [, inst] of this.active) {
      inst.dismiss();
    }
    this.queue = [];
  }

  /** Dismiss all notifications of a given type */
  dismissByType(type: NotificationType): void {
    for (const [id, inst] of this.active) {
      if (inst.getOptions().type === type) {
        inst.dismiss();
      }
    }
  }

  /** Update a notification's content */
  update(id: string, opts: Partial<NotificationOptions>): void {
    const instance = this.active.get(id);
    if (instance) instance.update(opts);
  }

  /** Get count of active notifications */
  getCount(): number { return this.active.size; }

  /** Get count of queued (waiting) notifications */
  getQueueCount(): number { return this.queue.length; }

  /** Destroy everything */
  destroy(): void {
    this.dismissAll();
    for (const [, container] of this.positionContainers) {
      container.remove();
    }
    this.positionContainers.clear();
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
  }

  // --- Private ---

  private _createNotification(opts: NotificationOptions): NotificationInstance {
    const pos = opts.position ?? this.config.position;
    const container = this.positionContainers.get(pos)!;

    const el = document.createElement("div");
    el.className = `notification notification-${opts.type} ${opts.className ?? ""}`.trim();
    el.setAttribute("data-notification-id", opts.id!);
    el.setAttribute("role", "alert");
    el.setAttribute("aria-live", opts.type === "error" ? "assertive" : "polite");

    // Build inner HTML
    let innerHtml = "";

    // Icon
    const iconMap: Record<string, string> = {
      info: "&#8505;",
      success: "&#10004;",
      warning: "&#9888;",
      error: "&#10006;",
      loading: "&#8987;",
    };
    const icon = opts.icon ?? iconMap[opts.type!] ?? "";
    if (icon) {
      innerHtml += `<span class="notification-icon">${icon}</span>`;
    }

    // Content
    innerHtml += `<div class="notification-content">`;
    innerHtml += `<div class="notification-title">${opts.html ? opts.title : escapeHtml(opts.title)}</div>`;
    if (opts.message) {
      innerHtml += `<div class="notification-message">${opts.html ? opts.message : escapeHtml(opts.message)}</div>`;
    }
    innerHtml += `</div>`;

    // Actions
    if (opts.action || opts.secondaryAction) {
      innerHtml += `<div class="notification-actions">`;
      if (opts.secondaryAction) {
        innerHtml += `<button class="notification-btn secondary">${escapeHtml(opts.secondaryAction.label)}</button>`;
      }
      if (opts.action) {
        innerHtml += `<button class="notification-btn primary">${escapeHtml(opts.action.label)}</button>`;
      }
      innerHtml += `</div>`;
    }

    // Close button
    if (opts.closable) {
      innerHtml += `<button class="notification-close" aria-label="Close">&times;</button>`;
    }

    // Progress bar
    if (opts.showProgress) {
      const pct = opts.progress !== undefined ? Math.round(opts.progress * 100) : 0;
      innerHtml += `<div class="notification-progress-bar"><div class="notification-progress-fill" style="width:${pct}%"></div></div>`;
    }

    el.innerHTML = innerHtml;

    // Apply styles
    Object.assign(el.style, {
      position: "relative",
      padding: "12px 16px",
      borderRadius: "8px",
      backgroundColor: _getBgColor(opts.type!),
      color: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      marginBottom: `${this.config.spacing}px`,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "14px",
      lineHeight: "1.4",
      maxWidth: "400px",
      minWidth: "280px",
      boxSizing: "border-box",
      opacity: "0",
      transform: "translateY(-10px)",
      transition: this.config.animate
        ? `opacity ${this.config.animationDuration}ms ease, transform ${this.config.animationDuration}ms ease`
        : "none",
    });

    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    // Create instance
    let dismissed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (timer) clearTimeout(timer);

      // Animate out
      el.style.opacity = "0";
      el.style.transform = "translateY(-10px)";

      setTimeout(() => {
        el.remove();
        this.active.delete(opts.id!);
        this.config.onDismiss?.(opts.id!);
        opts.onDismiss?.(opts.id!);

        // Process queue
        this._processQueue();
      }, this.config.animationDuration);
    };

    const startTimer = () => {
      if (opts.duration && opts.duration > 0) {
        timer = setTimeout(dismiss, opts.duration);
      }
    };

    const update = (newOpts: Partial<NotificationOptions>) => {
      Object.assign(opts, newOpts);
      // Re-render simplified updates (progress, message)
      if (newOpts.progress !== undefined || newOpts.message !== undefined) {
        const progressBar = el.querySelector(".notification-progress-fill") as HTMLElement;
        if (progressBar && newOpts.progress !== undefined) {
          progressBar.style.width = `${Math.round(newOpts.progress * 100)}%`;
        }
        const msgEl = el.querySelector(".notification-message") as HTMLElement;
        if (msgEl && newOpts.message !== undefined) {
          msgEl.innerHTML = newOpts.html ? newOpts.message : escapeHtml(newOpts.message);
        }
      }
    };

    // Event bindings
    const closeBtn = el.querySelector(".notification-close") as HTMLElement;
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dismiss();
      });
    }

    const primaryBtn = el.querySelector(".notification-btn.primary") as HTMLElement;
    if (primaryBtn && opts.action) {
      primaryBtn.addEventListener("click", () => {
        opts.action!.onClick();
        dismiss();
      });
    }

    const secondaryBtn = el.querySelector(".notification-btn.secondary") as HTMLElement;
    if (secondaryBtn && opts.secondaryAction) {
      secondaryBtn.addEventListener("click", () => {
        opts.secondaryAction!.onClick();
      });
    }

    if (opts.pauseOnHover) {
      el.addEventListener("mouseenter", () => { if (timer) clearTimeout(timer); });
      el.addEventListener("mouseleave", () => { if (!dismissed) startTimer(); });
    }

    const instance: NotificationInstance = {
      id: opts.id!,
      element: el,
      dismiss,
      update,
      getOptions: () => ({ ...opts }),
    };

    this.active.set(opts.id!, instance);
    opts.onMount?.(el);
    startTimer();

    return instance;
  }

  private _createNullInstance(id: string, opts: NotificationOptions): NotificationInstance {
    return {
      id,
      element: document.createElement("div"),
      dismiss: () => {},
      update: () => {},
      getOptions: () => opts,
    };
  }

  private _createPositionContainers(): void {
    const positions: NotificationPosition[] = [
      "top-right", "top-left", "top-center",
      "bottom-right", "bottom-left", "bottom-center",
    ];

    for (const pos of positions) {
      const container = document.createElement("div");
      container.className = `notification-container notification-${pos}`;
      container.setAttribute("data-position", pos);
      Object.assign(container.style, {
        position: "fixed",
        zIndex: "99999",
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        ...(getPositionStyles(pos)),
      });

      // Override pointer-events on children via CSS
      container.style.cssText += ";pointer-events:none;";
      this.container.appendChild(container);
      this.positionContainers.set(pos, container);
    }
  }

  private _getVisibleCount(position: NotificationPosition): number {
    const container = this.positionContainers.get(position);
    if (!container) return 0;
    return container.querySelectorAll("[data-notification-id]").length;
  }

  private _getOldestInPosition(position: NotificationPosition): NotificationInstance | null {
    const container = this.positionContainers.get(position);
    if (!container) return null;
    const first = container.querySelector("[data-notification-id]") as HTMLElement;
    if (!first) return null;
    return this.active.get(first.dataset.notificationId!) ?? null;
  }

  private _processQueue(): void {
    if (this.queue.length === 0) return;
    const next = this.queue.shift()!;
    this._createNotification(next);
    this.config.onQueueChange?.(this.queue.length, this.active.size);
  }
}

function getPositionStyles(pos: NotificationPosition): Partial<CSSStyleDeclaration> {
  switch (pos) {
    case "top-right": return { top: "16px", right: "16px", alignItems: "flex-end" };
    case "top-left": return { top: "16px", left: "16px", alignItems: "flex-start" };
    case "top-center": return { top: "16px", left: "50%", transform: "translateX(-50%)" };
    case "bottom-right": return { bottom: "16px", right: "16px", alignItems: "flex-end", flexDirection: "column-reverse" };
    case "bottom-left": return { bottom: "16px", left: "16px", alignItems: "flex-start", flexDirection: "column-reverse" };
    case "bottom-center": return { bottom: "16px", left: "50%", transform: "translateX(-50%)", flexDirection: "column-reverse" };
  }
}

function _getBgColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    info: "#3b82f6",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
    loading: "#6b7280",
  };
  return colors[type];
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
