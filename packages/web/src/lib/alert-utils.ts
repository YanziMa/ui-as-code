/**
 * Alert Utilities: Inline alert banners with variants, icons, dismiss,
 * auto-dismiss timer, action buttons, and ARIA live regions.
 */

// --- Types ---

export type AlertVariant = "info" | "success" | "warning" | "error" | "neutral";
export type AlertSize = "sm" | "md" | "lg";

export interface AlertOptions {
  /** Alert variant */
  variant?: AlertVariant;
  /** Title (bold heading) */
  title?: string;
  /** Description text */
  message: string;
  /** Show icon */
  showIcon?: boolean;
  /** Custom icon (HTML string) */
  icon?: string;
  /** Dismissible? (shows close button) */
  dismissible?: boolean;
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Action button config */
  action?: { label: string; onClick: () => void; variant?: "primary" | "secondary" };
  /** Size variant */
  size?: AlertSize;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called on dismiss */
  onDismiss?: () => void;
}

export interface AlertInstance {
  /** The alert element */
  el: HTMLElement;
  /** Dismiss the alert */
  dismiss: () => void;
  /** Check if visible */
  isVisible: () => boolean;
}

// --- Variant Config ---

const ALERT_VARIANTS: Record<AlertVariant, { bg: string; border: string; color: string; iconBg: string; iconColor: string; defaultIcon: string }> = {
  "info": { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", iconBg: "#dbeafe", iconColor: "#2563eb", defaultIcon: "&#8505;" },
  "success": { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46", iconBg: "#d1fae5", iconColor: "#059669", defaultIcon: "&#10004;" },
  "warning": { bg: "#fffbeb", border: "#fde68a", color: "#92400e", iconBg: "#fef3c7", iconColor: "#d97706", defaultIcon: "&#9888;" },
  "error": { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", iconBg: "#fee2e2", iconColor: "#dc2626", defaultIcon: "&#10006;" },
  "neutral": { bg: "#f9fafb", border: "#e5e7eb", color: "#374151", iconBg: "#f3f4f6", iconColor: "#6b7280", defaultIcon: "&#8505;" },
};

const SIZE_CONFIG: Record<AlertSize, { padding: string; fontSize: string; iconSize: string }> = {
  "sm": { padding: "10px 14px", fontSize: "13px", iconSize: "16px" },
  "md": { padding: "12px 16px", fontSize: "14px", iconSize: "18px" },
  "lg": { padding: "14px 20px", fontSize: "15px", iconSize: "20px" },
};

// --- Core Factory ---

/**
 * Create an inline alert banner.
 *
 * @example
 * ```ts
 * const alert = createAlert({
 *   variant: "success",
 *   title: "Saved!",
 *   message: "Your changes have been saved successfully.",
 *   dismissible: true,
 * });
 * ```
 */
export function createAlert(options: AlertOptions): AlertInstance {
  const {
    variant = "info",
    title,
    message,
    showIcon = true,
    icon,
    dismissible = false,
    autoDismiss = 0,
    action,
    size = "md",
    className,
    container,
    onDismiss,
  } = options;

  let _visible = true;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const v = ALERT_VARIANTS[variant];
  const sc = SIZE_CONFIG[size];

  // Root
  const el = document.createElement("div");
  el.className = `alert ${variant} ${size} ${className ?? ""}`.trim();
  el.style.cssText =
    `display:flex;align-items:flex-start;gap:10px;padding:${sc.padding};` +
    `background:${v.bg};border:1px solid ${v.border};border-radius:8px;color:${v.color};` +
    `font-size:${sc.fontSize};line-height:1.5;position:relative;`;
  el.setAttribute("role", "alert");
  if (autoDismiss > 0) el.setAttribute("aria-live", "assertive");

  // Icon
  if (showIcon) {
    const iconEl = document.createElement("div");
    iconEl.className = "alert-icon";
    iconEl.innerHTML = icon || v.defaultIcon;
    iconEl.style.cssText =
      `display:flex;align-items:center;justify-content:center;width:${sc.iconSize};height:${sc.iconSize};` +
      `background:${v.iconBg};color:${v.iconColor};border-radius:50%;flex-shrink:0;font-size:calc(${sc.iconSize} - 2px);` +
      "margin-top:1px;";
    el.appendChild(iconEl);
  }

  // Content
  const content = document.createElement("div");
  content.className = "alert-content";
  content.style.flex = "1";
  content.style.minWidth = "0";

  if (title) {
    const titleEl = document.createElement("div");
    titleEl.className = "alert-title";
    titleEl.textContent = title;
    titleEl.style.fontWeight = "600";
    titleEl.style.marginBottom = "2px";
    content.appendChild(titleEl);
  }

  const msgEl = document.createElement("div");
  msgEl.className = "alert-message";
  msgEl.textContent = message;
  content.appendChild(msgEl);

  // Action button
  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.style.cssText =
      "margin-top:6px;padding:4px 12px;border-radius:6px;font-size:" +
      `${parseInt(sc.fontSize) - 1}px;border:none;cursor:pointer;font-weight:500;` +
      (action.variant === "primary"
        ? "background:#3b82f6;color:#fff;"
        : "background:#fff;color:#374151;border:1px solid #d1d5db;");
    btn.addEventListener("click", action.onClick);
    content.appendChild(btn);
  }

  el.appendChild(content);

  // Close button
  if (dismissible || autoDismiss > 0) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Dismiss alert");
    closeBtn.style.cssText =
      "position:absolute;top:8px;right:8px;padding:2px 6px;border:none;background:none;" +
      `cursor:pointer;color:#9ca3af;font-size:16px;line-height:1;border-radius:4px;` +
      "transition:color 0.12s;flex-shrink:0;";
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#6b7280"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "#9ca3af"; });
    closeBtn.addEventListener("click", dismiss);
    el.appendChild(closeBtn);
  }

  if (container) container.appendChild(el);

  // Auto-dismiss
  if (autoDismiss > 0) {
    timerId = setTimeout(dismiss, autoDismiss);
  }

  function dismiss(): void {
    if (!_visible) return;
    _visible = false;
    if (timerId !== null) clearTimeout(timerId);
    el.style.opacity = "0";
    el.style.transform = "translateY(-4px)";
    el.style.transition = "opacity 0.2s, transform 0.2s";
    setTimeout(() => { el.remove(); }, 200);
    onDismiss?.();
  }

  function isVisible(): boolean { return _visible; }

  return { el, dismiss, isVisible };
}
