/**
 * Toast Utilities: Toast notification system with queue management,
 * position presets, stacking, progress bar, and rich actions.
 */

// --- Types ---

export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
export type ToastType = "info" | "success" | "warning" | "error" | "loading" | "default";

export interface ToastOptions {
  /** Toast message text */
  message: string;
  /** Type/variant */
  type?: ToastType;
  /** Duration in ms (0 = persistent until dismissed) */
  duration?: number;
  /** Position override for this toast */
  position?: ToastPosition;
  /** Title line */
  title?: string;
  /** Custom icon (HTML string) */
  icon?: string;
  /** Action button */
  action?: { label: string; onClick: (toastId: string) => void };
  /** Cancel button */
  cancel?: { label: string; onClick: (toastId: string) => void };
  /** Show progress bar (for loading toasts) */
  progress?: number; // 0-100
  /** Show close button */
  closable?: boolean;
  /** Pause on hover */
  pauseOnHover?: boolean;
  /** Called when toast is dismissed */
  onDismiss?: (id: string) => void;
  /** Custom class name */
  className?: string;
}

interface ActiveToast {
  id: string;
  el: HTMLElement;
  timer: ReturnType<typeof setTimeout> | null;
  pauseTimer: ReturnType<typeof setTimeout> | null;
  options: ToastOptions;
}

export interface ToastManagerConfig {
  /** Default position for toasts */
  position?: ToastPosition;
  /** Max visible toasts at once */
  maxVisible?: number;
  /** Spacing between toasts (px) */
  spacing?: number;
  /** Default duration (ms) */
  defaultDuration?: number;
  /** Container element */
  container?: HTMLElement;
  /** Custom class for container */
  className?: string;
}

export interface ToastManagerInstance {
  /** Show a toast — returns toast ID */
  show: (options: ToastOptions) => string;
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Update a toast's progress bar */
  updateProgress: (id: string, progress: number) => void;
  /** Get active toast count */
  getCount: () => number;
  /** Destroy manager and cleanup */
  destroy: () => void;
}

// --- Type Config ---

const TOAST_TYPES: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  "info": { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "&#8505;" },
  "success": { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46", icon: "&#10004;" },
  "warning": { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "&#9888;" },
  "error": { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "&#10006;" },
  "loading": { bg: "#f0f9ff", border: "#bae6fd", color: "#0369a1", icon: "&#9201;" },
  "default": { bg: "#ffffff", border: "#e5e7eb", color: "#374151", icon: "&#8505;" },
};

// --- Core Factory ---

let globalManager: ToastManagerInstance | null = null;

/** Get or create the global toast manager singleton */
export function getToastManager(config?: ToastManagerConfig): ToastManagerInstance {
  if (!globalManager) {
    globalManager = createToastManager(config ?? {});
  }
  return globalManager;
}

/** Destroy the global toast manager */
export function destroyToastManager(): void {
  if (globalManager) {
    globalManager.destroy();
    globalManager = null;
  }
}

/** Quick one-shot toast using the global manager */
export function showToast(message: string, options?: Partial<ToastOptions>): string {
  return getToastManager().show({ message, ...options });
}

/**
 * Create a toast notification manager.
 *
 * @example
 * ```ts
 * const toaster = createToastManager({ position: "top-right", maxVisible: 5 });
 * toaster.show({ message: "File saved!", type: "success" });
 * toaster.show({ message: "Error uploading", type: "error", duration: 5000 });
 * ```
 */
export function createToastManager(config: ToastManagerConfig = {}): ToastManagerInstance {
  const {
    position = "top-right",
    maxVisible = 5,
    spacing = 10,
    defaultDuration = 4000,
    container,
    className,
  } = config;

  const activeToasts: ActiveToast[] = [];
  let containerEl: HTMLElement;

  // Create/reuse container
  function getContainer(): HTMLElement {
    if (containerEl && containerEl.isConnected) return containerEl;

    containerEl = document.createElement("div");
    containerEl.className = `toast-container ${position} ${className ?? ""}`.trim();

    const posStyles: Record<ToastPosition, string> = {
      "top-right": "position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column-reverse;gap:" + `${spacing}px;`,
      "top-left": "position:fixed;top:16px;left:16px;z-index:9999;display:flex;flex-direction:column-reverse;gap:" + `${spacing}px;`,
      "bottom-right": "position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:" + `${spacing}px;`,
      "bottom-left": "position:fixed;bottom:16px;left:16px;z-index:9999;display:flex;flex-direction:column;gap:" + `${spacing}px;`,
      "top-center": "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column-reverse;gap:" + `${spacing}px;`,
      "bottom-center": "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:" + `${spacing}px;`,
    };

    containerEl.style.cssText = posStyles[position];
    (container ?? document.body).appendChild(containerEl);

    return containerEl;
  }

  function show(options: ToastOptions): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const opts: ToastOptions = {
      type: "default",
      duration: defaultDuration,
      closable: true,
      pauseOnHover: true,
      ...options,
    };

    const t = TOAST_TYPES[opts.type!];

    // Enforce max visible
    while (activeToasts.length >= maxVisible) {
      const oldest = activeToasts.shift()!;
      if (oldest.timer) clearTimeout(oldest.timer);
      if (oldest.pauseTimer) clearTimeout(oldest.pauseTimer);
      oldest.el.remove();
      opts.onDismiss?.(oldest.id);
    }

    // Create toast element
    const el = document.createElement("div");
    el.className = `toast ${opts.type ?? "default"} ${className ?? ""}`.trim();
    el.dataset.toastId = id;
    el.style.cssText =
      "display:flex;align-items:flex-start;gap:10px;padding:12px 16px;" +
      `background:${t.bg};border:1px solid ${t.border};border-radius:10px;` +
      `color:${t.color};font-size:13px;line-height:1.4;min-width:280px;max-width:400px;` +
      "box-shadow:0 4px 16px rgba(0,0,0,0.12);animation:toast-in 0.25s ease-out;" +
      "pointer-events:auto;";

    // Icon
    const iconDiv = document.createElement("div");
    iconDiv.innerHTML = opts.icon || t.icon;
    iconDiv.style.cssText = "flex-shrink:0;font-size:18px;margin-top:1px;";
    el.appendChild(iconDiv);

    // Content
    const body = document.createElement("div");
    body.style.flex = "1";
    body.style.minWidth = "0";

    if (opts.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "toast-title";
      titleEl.textContent = opts.title;
      titleEl.style.fontWeight = "600";
      titleEl.style.marginBottom = "2px";
      body.appendChild(titleEl);
    }

    const msgEl = document.createElement("div");
    msgEl.className = "toast-message";
    msgEl.textContent = opts.message;
    body.appendChild(msgEl);

    // Progress bar
    if (opts.type === "loading" && opts.progress !== undefined) {
      const progressBar = document.createElement("div");
      progressBar.className = "toast-progress-track";
      progressBar.style.cssText =
        "width:100%;height:3px;background:#e5e7eb;border-radius:2px;margin-top:6px;overflow:hidden;";
      const progressFill = document.createElement("div");
      progressFill.className = "toast-progress-fill";
      progressFill.style.cssText =
        `height:100%;background:${t.color};border-radius:2px;transition:width 0.3s ease;width:${opts.progress}%;`;
      progressBar.appendChild(progressFill);
      body.appendChild(progressBar);
    }

    // Actions
    if (opts.action || opts.cancel) {
      const actionsRow = document.createElement("div");
      actionsRow.style.display = "flex";
      actionsRow.style.gap = "8px";
      actionsRow.style.marginTop = "8px";

      if (opts.cancel) {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.textContent = opts.cancel.label;
        cancelBtn.style.cssText =
          "padding:3px 10px;border:1px solid #d1d5db;border-radius:5px;" +
          "background:#fff;color:#6b7280;font-size:12px;cursor:pointer;";
        cancelBtn.addEventListener("click", () => { opts.cancel.onClick(id); dismiss(id); });
        actionsRow.appendChild(cancelBtn);
      }

      if (opts.action) {
        const actionBtn = document.createElement("button");
        actionBtn.type = "button";
        actionBtn.textContent = opts.action.label;
        actionBtn.style.cssText =
          "padding:3px 10px;border:1px solid #3b82f6;border-radius:5px;" +
          "background:#3b82f6;color:#fff;font-size:12px;cursor:pointer;";
        actionBtn.addEventListener("click", () => { opts.action.onClick(id); dismiss(id); });
        actionsRow.appendChild(actionBtn);
      }

      body.appendChild(actionsRow);
    }

    // Close button
    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.style.cssText =
        "position:absolute;top:6px;right:6px;padding:2px 5px;border:none;background:none;" +
        "cursor:pointer;color:#9ca3af;font-size:14px;line-height:1;border-radius:3px;" +
        "flex-shrink:0;";
      closeBtn.addEventListener("click", () => dismiss(id));
      el.style.position = "relative";
      el.appendChild(closeBtn);
    }

    el.appendChild(body);

    // Add to container
    getContainer().appendChild(el);

    // Track as active
    const entry: ActiveToast = { id, el, timer: null, pauseTimer: null, options: opts };
    activeToasts.push(entry);

    // Auto-dismiss timer
    if (opts.duration && opts.duration > 0) {
      entry.timer = setTimeout(() => dismiss(id), opts.duration);
    }

    // Hover pause
    if (opts.pauseOnHover) {
      el.addEventListener("mouseenter", () => {
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
      });
      el.addEventListener("mouseleave", () => {
        if (opts.duration && opts.duration > 0 && !entry.timer) {
          entry.timer = setTimeout(() => dismiss(id), opts.duration);
        }
      });
    }

    return id;
  }

  function dismiss(id: string): void {
    const idx = activeToasts.findIndex((t) => t.id === id);
    if (idx < 0) return;

    const entry = activeToasts.splice(idx, 1)[0]!;
    if (entry.timer) clearTimeout(entry.timer);
    if (entry.pauseTimer) clearTimeout(entry.pauseTimer);

    entry.el.style.animation = "toast-out 0.2s ease-in forwards";
    setTimeout(() => { entry.el.remove(); }, 200);
    entry.options.onDismiss?.(id);
  }

  function dismissAll(): void {
    [...activeToasts].forEach((t) => dismiss(t.id));
  }

  function updateProgress(id: string, progress: number): void {
    const entry = activeToasts.find((t) => t.id === id);
    if (!entry) return;
    const fill = entry.el.querySelector(".toast-progress-fill") as HTMLElement | null;
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  }

  function getCount(): number { return activeToasts.length; }

  function destroy(): void {
    dismissAll();
    if (containerEl) containerEl.remove();
    containerEl = undefined!;
  }

  return { show, dismiss, dismissAll, updateProgress, getCount, destroy };
}
