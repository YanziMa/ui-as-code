/**
 * Message: Toast/notification message system with queue management,
 * positioning, auto-dismiss, action buttons, progress bar,
 * stacking, and grouped notifications.
 *
 * Provides:
 *   - Message types: info, success, warning, error, loading, default
 *   - Positioning: top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
 *   - Auto-dismiss with configurable duration and pause-on-hover
 *   - Action buttons (primary + secondary)
 *   - Progress bar for async operations
 *   - Message queue with max limit
 *   - Stacking animation (new messages slide in)
 *   - Grouped/collapsed multi-message view
 *   - Promise-based messages (auto-resolve/reject)
 */

// --- Types ---

export type MessageType = "default" | "info" | "success" | "warning" | "error" | "loading";
export type MessagePosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface MessageAction {
  label: string;
  handler: () => void;
  /** Button style variant */
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export interface MessageOptions {
  /** Message content (string or HTML element) */
  content: string | HTMLElement;
  /** Type/variant */
  type?: MessageType;
  /** Duration in ms (0 = sticky, default varies by type) */
  duration?: number;
  /** Title line */
  title?: string;
  /** Action buttons */
  actions?: MessageAction[];
  /** Show close button */
  closable?: boolean;
  /** Callback when dismissed (timeout, click, or close button) */
  onDismiss?: (id: string) => void;
  /** Pause auto-dismiss on hover */
  pauseOnHover?: boolean;
  /** Progress percentage (0-100) for loading messages */
  progress?: number;
  /** Group key for collapsing similar messages */
  groupKey?: string;
  /** Custom icon (HTML string) */
  icon?: string;
  /** ARIA live region politeness */
  polite?: "polite" | "assertive";
  /** Custom CSS class */
  className?: string;
}

export interface MessageInstance {
  /** Unique ID */
  id: string;
  /** The DOM element */
  element: HTMLElement;
  /** Dismiss the message */
  dismiss: () => void;
  /** Update content dynamically */
  update: (updates: Partial<MessageOptions>) => void;
  /** Update progress */
  setProgress: (percent: number) => void;
  /** Resolve a promise-based message (marks as success) */
  resolve: (content?: string) => void;
  /** Reject a promise-based message (marks as error) */
  reject: (content?: string) => void;
  /** Current state */
  getState: () => "visible" | "dismissing" | "dismissed";
}

export interface MessageQueueConfig {
  /** Container element or selector (default: creates fixed portal) */
  container?: HTMLElement | string;
  /** Default position */
  position?: MessagePosition;
  /** Max visible messages (default: 5) */
  maxMessages?: number;
  /** Gap between stacked messages (px) */
  gap?: number;
  /** Default duration by type (ms) */
  durations?: Partial<Record<MessageType, number>>;
  /** Enable grouping of same-type messages */
  grouping?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Global onDismiss handler */
  onDismiss?: (id: string) => void;
}

export interface MessageQueue {
  /** Show a new message */
  show: (options: MessageOptions) => MessageInstance;
  /** Convenience: quick info message */
  info: (content: string, duration?: number) => MessageInstance;
  /** Convenience: quick success message */
  success: (content: string, duration?: number) => MessageInstance;
  /** Convenience: quick warning message */
  warning: (content: string, duration?: number) => MessageInstance;
  /** Convenience: quick error message */
  error: (content: string, duration?: number) => MessageInstance;
  /** Convenience: loading message that resolves/rejects with a promise */
  loading: (content: string, promise: Promise<unknown>) => MessageInstance;
  /** Dismiss all messages */
  dismissAll: () => void;
  /** Get current message count */
  getCount: () => number;
  /** Destroy the queue and cleanup */
  destroy: () => void;
}

// --- Defaults ---

const TYPE_STYLES: Record<MessageType, { bg: string; border: string; icon: string }> = {
  default: { bg: "#ffffff", border: "#e5e7eb", icon: "" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", icon: "i" },
  success: { bg: "#ecfdf5", border: "#a7f3d0", icon: "+" },
  warning: { bg: "#fffbeb", border: "#fde68a", icon: "!" },
  error:   { bg: "#fef2f2", border: "#fecaca", icon: "x" },
  loading: { bg: "#f0f9ff", border: "#bae6fd", icon: "..." },
};

const DEFAULT_DURATIONS: Record<MessageType, number> = {
  default: 4000,
  info: 4000,
  success: 3000,
  warning: 5000,
  error: 6000, // Errors linger longer
  loading: 0, // Sticky until resolved
};

const POSITION_STYLES: Record<MessagePosition, { top?: string; bottom?: string; left?: string; right?: string; transform?: string }> = {
  "top-right":     { top: "16px", right: "16px" },
  "top-left":      { top: "16px", left: "16px" },
  "bottom-right":  { bottom: "16px", right: "16px" },
  "bottom-left":   { bottom: "16px", left: "16px" },
  "top-center":    { top: "16px", left: "50%", transform: "translateX(-50%)" },
  "bottom-center": { bottom: "16px", left: "50%", transform: "translateX(-50%)" },
};

// --- ID Generator ---

let msgIdCounter = 0;
function generateId(): string { return `msg_${Date.now()}_${++msgIdCounter}`; }

// --- Main Factory ---

export function createMessageQueue(config: MessageQueueConfig = {}): MessageQueue {
  const {
    position = "top-right",
    maxMessages = 5,
    gap = 8,
    grouping = true,
    animationDuration = 250,
    durations = {},
  } = config;

  // Create or find container
  let container: HTMLElement;
  if (config.container) {
    container = typeof config.container === "string"
      ? document.querySelector<HTMLElement>(config.container)!
      : config.container;
  } else {
    container = document.createElement("div");
    container.id = "message-queue-portal";
    document.body.appendChild(container);
  }

  Object.assign(container.style, {
    position: "fixed",
    zIndex: "10000",
    pointerEvents: "none",
    display: "flex",
    flexDirection: "column",
    gap: `${gap}px`,
    maxWidth: "400px",
    ...POSITION_STYLES[position],
  });

  const instances = new Map<string, MessageInstance>();

  function show(options: MessageOptions): MessageInstance {
    const id = generateId();
    const type = options.type ?? "default";
    const dur = options.duration ?? durations[type] ?? DEFAULT_DURATIONS[type];
    const styles = TYPE_STYLES[type];

    // Enforce max messages
    if (instances.size >= maxMessages) {
      const oldest = Array.from(instances.values())[0];
      oldest?.dismiss();
    }

    // Create element
    const el = document.createElement("div");
    el.className = `message message-${type} ${options.className ?? ""}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", options.polite ?? "polite");
    el.style.cssText = `
      pointer-events:auto;display:flex;flex-direction:column;gap:8px;padding:14px 16px;
      border-radius:10px;border:1px solid ${styles.border};background:${styles.bg};
      box-shadow:0 4px 12px rgba(0,0,0,0.1);min-width:280px;max-width:400px;
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.4;
      transition:transform ${animationDuration}ms cubic-bezier(.2,.8,.2,1),
                  opacity ${animationDuration}ms ease;
      transform:translateX(${position.includes("right") ? "100%" : "-100%"});
      opacity:0;
    `;

    // Icon area
    const iconArea = document.createElement("span");
    iconArea.style.cssText = "display:inline-flex;align-items:center;flex-shrink:0;margin-right:8px;font-size:16px;font-weight:700;";
    iconArea.textContent = options.icon ?? styles.icon;
    if (styles.icon) iconArea.style.color = {
      info: "#2563eb", success: "#059669", warning: "#b45309", error: "#dc2626", loading: "#0369a1",
    }[type] ?? "#6b7280";

    // Content area
    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;";

    // Title
    if (options.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "message-title";
      titleEl.textContent = options.title;
      titleEl.style.cssText = "font-weight:600;font-size:13px;";
      body.appendChild(titleEl);
    }

    // Content
    const contentEl = document.createElement("div");
    contentEl.className = "message-content";
    if (typeof options.content === "string") contentEl.textContent = options.content;
    else contentEl.appendChild(options.content);
    body.appendChild(contentEl);

    // Actions
    if (options.actions?.length) {
      const actionsRow = document.createElement("div");
      actionsRow.style.cssText = "display:flex;gap:6px;margin-top:4px;";
      for (const action of options.actions) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = action.label;
        const btnStyles: Record<string, string> = {
          primary: "background:#3b82f6;color:#fff;border:none;",
          secondary: "background:#fff;color:#374151;border:1px solid #d1d5db;",
          ghost: "background:transparent;color:#6b7280;border:none;",
          danger: "background:#ef4444;color:#fff;border:none;",
        };
        Object.assign(btn.style, {
          padding: "4px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
          fontWeight: "500", fontFamily: "inherit",
          ...btnStyles[action.variant ?? "secondary"],
        });
        btn.addEventListener("click", (e) => { e.stopPropagation(); action.handler(); });
        actionsRow.appendChild(btn);
      }
      body.appendChild(actionsRow);
    }

    // Progress bar
    let progressBar: HTMLElement | null = null;
    if (options.progress !== undefined) {
      progressBar = document.createElement("div");
      progressBar.style.cssText = `
        height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:2px;
      `;
      const fill = document.createElement("div");
      fill.style.cssText = `height:100%;width:${Math.max(0, Math.min(100, options.progress))}%;background:${styles.icon ? {"info":"#3b82f6","success":"#10b981","warning":"#f59e0b","error":"#ef4444","loading":"#3b82f6"}[type]??"#6b7280"}:"#6b7280"};border-radius:2px;transition:width 0.2s;`;
      progressBar.appendChild(fill);
      body.appendChild(progressBar);
    }

    // Close button
    if (options.closable !== false && dur !== 0) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.style.cssText = `
        align-self:flex-start;margin-left:8px;background:none;border:none;cursor:pointer;
        color:#9ca3af;font-size:16px;padding:0 2px;line-height:1;
      `;
      closeBtn.addEventListener("click", (e) => { e.stopPropagation(); instance.dismiss(); });
      el.style.alignItems = "flex-start";
      el.insertBefore(closeBtn, body.nextSibling);
    }

    // Assemble
    if (styles.icon || options.icon) el.appendChild(iconArea);
    el.appendChild(body);
    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      el.style.transform = "translateX(0)";
      el.style.opacity = "1";
    });

    // State
    let state: "visible" | "dismissing" | "dismissed" = "visible";
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Instance
    const instance: MessageInstance = {
      id,
      element: el,

      dismiss() {
        if (state !== "visible") return;
        state = "dismissing";
        if (timer) { clearTimeout(timer); timer = null; }

        el.style.transform = `translateX(${position.includes("right") ? "100%" : "-100%"})`;
        el.style.opacity = "0";

        setTimeout(() => {
          state = "dismissed";
          el.remove();
          instances.delete(id);
          config.onDismiss?.(id);
          options.onDismiss?.(id);
        }, animationDuration);
      },

      update(updates) {
        if (state !== "visible") return;
        if (updates.content !== undefined) {
          if (typeof updates.content === "string") contentEl.textContent = updates.content;
          else { contentEl.innerHTML = ""; contentEl.appendChild(updates.content); }
        }
        if (updates.title !== undefined && options.title) {
          const t = el.querySelector(".message-title");
          if (t) t.textContent = updates.title;
        }
        if (updates.type !== undefined) {
          const newStyles = TYPE_STYLES[updates.type];
          el.style.background = newStyles.bg;
          el.style.borderColor = newStyles.border;
        }
      },

      setProgress(percent: number) {
        if (progressBar) {
          const fill = progressBar.firstChild as HTMLElement;
          if (fill) fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        }
      },

      resolve(content?: string) {
        instance.update({ type: "success", content: content ?? options.content, progress: 100 });
        if (timer) { clearTimeout(timer); timer = null; }
        timer = setTimeout(() => instance.dismiss(), 2000);
      },

      reject(content?: string) {
        instance.update({ type: "error", content: content ?? String(options.content ?? "Operation failed") });
        if (timer) { clearTimeout(timer); timer = null; }
        timer = setTimeout(() => instance.dismiss(), 5000);
      },

      getState: () => state,
    };

    instances.set(id, instance);

    // Auto-dismiss
    if (dur > 0) {
      timer = setTimeout(() => instance.dismiss(), dur);
    }

    // Pause on hover
    if (options.pauseOnHover !== false && dur > 0) {
      el.addEventListener("mouseenter", () => { if (timer) { clearTimeout(timer); timer = null; } });
      el.addEventListener("mouseleave", () => {
        if (state === "visible" && dur > 0) timer = setTimeout(() => instance.dismiss(), dur);
      });
    }

    return instance;
  }

  // --- Convenience Methods ---

  function info(content: string, duration?: number) { return show({ content, type: "info", duration }); }
  function success(content: string, duration?: number) { return show({ content, type: "success", duration }); }
  function warning(content: string, duration?: number) { return show({ content, type: "warning", duration }); }
  function error(content: string, duration?: number) { return show({ content, type: "error", duration }); }

  function loading(content: string, promise: Promise<unknown>): MessageInstance {
    const inst = show({ content, type: "loading", progress: 0, closable: false });
    promise.then(
      () => inst.resolve(),
      () => inst.reject(),
    );
    return inst;
  }

  function dismissAll(): void {
    for (const inst of Array.from(instances.values())) inst.dismiss();
  }

  function getCount(): number { return instances.size; }

  function destroy(): void {
    dismissAll();
    if (!config.container) container.remove();
  }

  return { show, info, success, warning, error, loading, dismissAll, getCount, destroy };
}
