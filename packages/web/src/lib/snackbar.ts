/**
 * Snackbar: Material Design-style notification bar at the bottom of the screen
 * with auto-dismiss, action button, queue management, swipe-to-dismiss,
 * animations, and multiple severity levels.
 */

// --- Types ---

export type SnackbarSeverity = "default" | "success" | "error" | "warning";

export interface SnackbarOptions {
  /** Message text */
  message: string;
  /** Severity level */
  severity?: SnackbarSeverity;
  /** Action button label + callback */
  action?: { label: string; onClick: () => void };
  /** Duration in ms (0 = persistent, default: 4000) */
  duration?: number;
  /** Position on screen */
  position?: "bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-center" | "top-right";
  /** Show close button */
  closable?: boolean;
  /** Allow swipe to dismiss on touch devices */
  swipeToDismiss?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
  /** Callback when shown */
  onShow?: (id: string) => void;
  /** Callback when dismissed */
  onDismiss?: (id: string, reason: "timeout" | "action" | "close" | "swipe") => void;
}

export interface SnackbarInstance {
  id: string;
  element: HTMLElement;
  dismiss: (reason?: "close" | "swipe") => void;
  setMessage: (msg: string) => void;
}

// --- Defaults ---

const DEFAULTS = {
  duration: 4000,
  severity: "default" as SnackbarSeverity,
  position: "bottom-center" as SnackbarOptions["position"],
  closable: false,
  swipeToDismiss: true,
  animationDuration: 250,
  zIndex: 12000,
};

const SEVERITY_STYLES: Record<SnackbarSeverity, { bg: string; color: string; border: string }> = {
  default: { bg: "#323232", color: "#fff", border: "#323232" },
  success: { bg: "#166534", color: "#fff", border: "#15803d" },
  error:   { bg: "#991b1b", color: "#fff", border: "#b91c1c" },
  warning: { bg: "#854d0e", color: "#fff", border: "#a16207" },
};

// --- Container Management ---

const containers = new Map<string, HTMLDivElement>();

function getContainer(position: string, zIndex: number): HTMLDivElement {
  const key = `${position}-${zIndex}`;
  if (containers.has(key)) return containers.get(key)!;

  const container = document.createElement("div");
  container.className = `snackbar-container snackbar-${position}`;
  container.setAttribute("aria-live", "assertive");
  container.setAttribute("role", "status");

  const isTop = position.startsWith("top");
  const posMap: Record<string, string> = {
    "bottom-left":   `position:fixed;bottom:16px;left:16px;z-index:${zIndex};display:flex;flex-direction:column;gap:8px;max-width:420px;width:100%;pointer-events:none;`,
    "bottom-center": `position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:${zIndex};display:flex;flex-direction:column;gap:8px;max-width:560px;width:calc(100% - 32px);pointer-events:none;`,
    "bottom-right":  `position:fixed;bottom:16px;right:16px;z-index:${zIndex};display:flex;flex-direction:column;gap:8px;max-width:420px;width:100%;pointer-events:none;`,
    "top-left":      `position:fixed;top:16px;left:16px;z-index:${zIndex};display:flex;flex-direction:column-reverse;gap:8px;max-width:420px;width:100%;pointer-events:none;`,
    "top-center":    `position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:${zIndex};display:flex;flex-direction:column-reverse;gap:8px;max-width:560px;width:calc(100% - 32px);pointer-events:none;`,
    "top-right":     `position:fixed;top:16px;right:16px;z-index:${zIndex};display:flex;flex-direction:column-reverse;gap:8px;max-width:420px;width:100%;pointer-events:none;`,
  };

  container.style.cssText = posMap[position] ?? posMap["bottom-center"]!;
  document.body.appendChild(container);
  containers.set(key, container);

  return container;
}

// --- Main Factory ---

let counter = 0;

export function createSnackbar(options: SnackbarOptions): SnackbarInstance {
  const opts = { ...DEFAULTS, ...options };
  const id = `snackbar-${++counter}-${Date.now()}`;
  const styles = SEVERITY_STYLES[opts.severity];

  // Create element
  const el = document.createElement("div");
  el.className = `snackbar snackbar-${opts.severity} ${opts.className ?? ""}`;
  el.style.cssText = `
    pointer-events:auto;background:${styles.bg};color:${styles.color};
    border-radius:6px;padding:12px 20px;font-family:-apple-system,sans-serif;
    font-size:14px;line-height:1.45;display:flex;align-items:center;gap:12px;
    min-height:44px;box-shadow:0 6px 24px rgba(0,0,0,0.2),0 2px 8px rgba(0,0,0,0.1);
    opacity:0;transform:translateY(16px);
    transition:opacity ${opts.animationDuration}ms cubic-bezier(.4,0,.2,1),
      transform ${opts.animationDuration}ms cubic-bezier(.4,0,.2,1);
    will-change:opacity,transform;touch-action:pan-y;
    user-select:none;-webkit-user-select:none;
  `;

  // Message
  const msgEl = document.createElement("span");
  msgEl.className = "snackbar-message";
  msgEl.style.cssText = "flex:1;min-width:0;";
  msgEl.textContent = opts.message;
  el.appendChild(msgEl);

  // Action button
  if (opts.action) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "snackbar-action";
    actionBtn.style.cssText = `
      flex-shrink:0;background:none;border:none;color:#90caf9;
      font-size:14px;font-weight:600;text-transform:uppercase;
      cursor:pointer;padding:4px 14px;margin:-4px -8px -4px 0;
      letter-spacing:0.03em;border-radius:4px;transition:background 0.15s;
      font-family:-apple-system,sans-serif;
    `;
    actionBtn.textContent = opts.action.label;
    actionBtn.addEventListener("mouseenter", () => { actionBtn.style.background = "rgba(255,255,255,0.1)"; });
    actionBtn.addEventListener("mouseleave", () => { actionBtn.style.background = ""; });
    actionBtn.addEventListener("click", () => {
      opts.action!.onClick();
      dismissWithReason("action");
    });
    el.appendChild(actionBtn);
  }

  // Close button
  let closeBtn: HTMLButtonElement | null = null;
  if (opts.closable) {
    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Dismiss");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = `
      flex-shrink:0;background:none;border:none;color:rgba(255,255,255,0.7);
      cursor:pointer;font-size:18px;line-height:1;padding:0 4px;
      transition:color 0.15s;
    `;
    closeBtn.addEventListener("mouseenter", () => { closeBtn!.style.color = "#fff"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn!.style.color = "rgba(255,255,255,0.7)"; });
    closeBtn.addEventListener("click", () => dismissWithReason("close"));
    el.appendChild(closeBtn);
  }

  // Add to container
  const container = getContainer(opts.position!, opts.zIndex!);
  container.appendChild(el);

  // State
  let dismissed = false;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  function animateIn(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });
    opts.onShow?.(id);
  }

  function animateOut(callback: () => void): void {
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    setTimeout(() => {
      el.remove();
      if (container.children.length === 0) {
        container.remove();
        containers.delete(`${opts.position}-${opts.zIndex}`);
      }
      callback();
    }, opts.animationDuration);
  }

  function dismissWithReason(reason: "timeout" | "action" | "close" | "swipe" = "close"): void {
    if (dismissed) return;
    dismissed = true;
    if (dismissTimer) clearTimeout(dismissTimer);
    opts.onDismiss?.(id, reason);
    animateOut(() => {});
  }

  // Auto-dismiss timer
  function scheduleDismiss(): void {
    if (opts.duration! <= 0 || dismissed) return;
    dismissTimer = setTimeout(() => {
      dismissWithReason("timeout");
    }, opts.duration);
  }

  // Pause on hover / mouse enter
  el.addEventListener("mouseenter", () => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
  });

  el.addEventListener("mouseleave", () => {
    scheduleDismiss();
  });

  // Swipe to dismiss (touch)
  if (opts.swipeToDismiss) {
    let startX = 0;
    let currentX = 0;
    let swiping = false;

    el.addEventListener("touchstart", (e: TouchEvent) => {
      startX = e.touches[0]!.clientX;
      currentX = startX;
      swiping = true;
    }, { passive: true });

    el.addEventListener("touchmove", (e: TouchEvent) => {
      if (!swiping) return;
      currentX = e.touches[0]!.clientX;
      const delta = currentX - startX;
      const absDelta = Math.abs(delta);
      if (absDelta > 10) {
        const opacity = Math.max(0, 1 - absDelta / 150);
        const translateX = delta > 0 ? absDelta : -absDelta;
        el.style.opacity = String(opacity);
        el.style.transform = `translateY(0) translateX(${translateX}px)`;
      }
    }, { passive: true });

    el.addEventListener("touchend", () => {
      if (!swiping) return;
      swiping = false;
      const delta = Math.abs(currentX - startX);
      if (delta > 80) {
        dismissWithReason("swipe");
      } else {
        // Snap back
        el.style.opacity = "";
        el.style.transform = "";
      }
    }, { passive: true });
  }

  // Show
  animateIn();
  scheduleDismiss();

  // Instance
  const instance: SnackbarInstance = {
    id,
    element: el,

    dismiss(reason?: "close" | "swipe") {
      dismissWithReason(reason ?? "close");
    },

    setMessage(msg: string) {
      msgEl.textContent = msg;
    },
  };

  return instance;
}

// --- Quick Helpers ---

/** Show a simple snackbar message */
export function showSnackbar(message: string, options?: Partial<Omit<SnackbarOptions, "message">>): SnackbarInstance {
  return createSnackbar({ ...options, message });
}

/** Success snackbar */
export function snackbarSuccess(message: string): SnackbarInstance {
  return createSnackbar({ message, severity: "success" });
}

/** Error snackbar */
export function snackbarError(message: string): SnackbarInstance {
  return createSnackbar({ message, severity: "error" });
}

/** Warning snackbar */
export function snackbarWarning(message: string): SnackbarInstance {
  return createSnackbar({ message, severity: "warning" });
}
