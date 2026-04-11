/**
 * Alert Dialog Utilities: Confirmation dialogs, alert prompts, warning
 * dialogs, and action modals with customizable buttons, icons, and
 * promise-based API.
 */

// --- Types ---

export type AlertDialogType = "info" | "success" | "warning" | "error" | "danger" | "confirm";
export type AlertDialogSize = "sm" | "md" | "lg";

export interface AlertDialogButton {
  /** Button label */
  label: string;
  /** Variant: primary/secondary/ghost/danger */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Auto-focus this button? */
  autoFocus?: boolean;
  /** Action callback */
  onClick?: () => void | Promise<void>;
}

export interface AlertDialogOptions {
  /** Dialog type */
  type?: AlertDialogType;
  /** Title text */
  title: string;
  /** Body content (HTML string or element) */
  body?: string | HTMLElement;
  /** Icon HTML string */
  icon?: string;
  /** Buttons */
  buttons: AlertDialogButton[];
  /** Size variant */
  size?: AlertDialogSize;
  /** Show close X button */
  dismissible?: boolean;
  /** Custom width in px */
  width?: number | string;
  /** Z-index */
  zIndex?: number;
  /** Click overlay to cancel? */
  overlayDismiss?: boolean;
  /** Escape to dismiss? */
  escapeDismiss?: boolean;
  /** Animation duration (ms) */
  duration?: number;
  /** Container element */
  container?: HTMLElement;
  /** Called when dialog opens */
  onOpen?: () => void;
  /** Called when dialog closes */
  onClose?: (action?: string) => void;
  /** Custom class name */
  className?: string;
}

export interface AlertDialogInstance {
  /** Root element */
  el: HTMLElement;
  /** Show the dialog */
  show: () => void;
  /** Close the dialog */
  close: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Destroy */
  destroy: () => void;
}

// --- Type Config ---

const TYPE_CONFIG: Record<AlertDialogType, {
  icon: string;
  iconColor: string;
  titleColor: string;
  accentBg: string;
  accentText: string;
  primaryBtnBg: string;
}> = {
  info: {
    icon: "&#8505;",
    iconColor: "#3b82f6",
    titleColor: "#1e40af",
    accentBg: "#eff6ff",
    accentText: "#1d4ed8",
    primaryBtnBg: "#3b82f6",
  },
  success: {
    icon: "&#9989;",
    iconColor: "#16a34a",
    titleColor: "#166534",
    accentBg: "#ecfdf5",
    accentText: "#059669",
    primaryBtnBg: "#16a34a",
  },
  warning: {
    icon: "&#9888;",
    iconColor: "#d97706",
    titleColor: "#92400e",
    accentBg: "#fffbeb",
    accentText: "#b45309",
    primaryBtnBg: "#f59e0b",
  },
  error: {
    icon: "&#10060;",
    iconColor: "#dc2626",
    titleColor: "#b91c1c",
    accentBg: "#fef2f2",
    accentText: "#dc2626",
    primaryBtnBg: "#ef4444",
  },
  danger: {
    icon: "&#9888;",
    iconColor: "#dc2626",
    titleColor: "#b91c1c",
    accentBg: "#fef2f2",
    accentText: "#dc2626",
    primaryBtnBg: "#ef4444",
  },
  confirm: {
    icon: "&#8505;",
    iconColor: "#3b82f6",
    titleColor: "#111827",
    accentBg: "#eff6ff",
    accentText: "#2563eb",
    primaryBtnBg: "#3b82f6",
  },
};

const SIZE_STYLES: Record<AlertDialogSize, { padding: string; fontSize: { title: string; body: string }; btnPadding: string }> = {
  sm: { padding: "20px", fontSize: { title: "15px", body: "13px" }, btnPadding: "6px 16px" },
  md: { padding: "28px", fontSize: { title: "17px", body: "14px" }, btnPadding: "8px 20px" },
  lg: { padding: "36px", fontSize: { title: "19px", body: "15px" }, btnPadding: "10px 24px" },
};

// --- Core Factory ---

/**
 * Create an alert/dialog modal.
 *
 * @example
 * ```ts
 * // Confirm dialog returning a Promise
 * const dlg = createAlertDialog({
 *   type: "confirm",
 *   title: "Delete item?",
 *   body: "This action cannot be undone.",
 *   buttons: [
 *     { label: "Cancel", variant: "secondary" },
 *     { label: "Delete", variant: "danger", onClick: () => deleteItem() },
 *   ],
 * });
 * dlg.show();
 * ```
 */
export function createAlertDialog(options: AlertDialogOptions): AlertDialogInstance {
  const {
    type = "info",
    title,
    body,
    icon,
    buttons = [],
    size = "md",
    dismissible = false,
    width,
    zIndex = 1100,
    overlayDismiss = true,
    escapeDismiss = true,
    duration = 200,
    container,
    onOpen,
    onClose,
    className,
  } = options;

  let _visible = false;
  const tc = TYPE_CONFIG[type];
  const ss = SIZE_STYLES[size];

  // Overlay
  const overlay = document.createElement("div");
  overlay.className = `alert-dialog-overlay ${className ?? ""}`.trim();
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:" +
    `${zIndex};display:none;align-items:center;justify-content:center;" +
    "backdrop-filter:blur(2px);animation:ad-fade-in 0.12s ease;padding:16px;";

  // Panel
  const panel = document.createElement("div");
  panel.className = "alert-dialog-panel";
  panel.style.cssText =
    `background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.25);` +
    `max-width:${width ?? "440"};width:100%;padding:${ss.padding};` +
    "text-align:center;";

  // Icon area
  if (icon || tc.icon) {
    const iconWrap = document.createElement("div");
    iconWrap.innerHTML = (icon ?? tc.icon);
    iconWrap.style.cssText =
      `font-size:36px;line-height:1;margin-bottom:12px;color:${tc.iconColor};`;
    panel.appendChild(iconWrap);
  }

  // Title
  const titleEl = document.createElement("h2");
  titleEl.textContent = title;
  titleEl.style.cssText =
    `margin:0 0 8px;font-size:${ss.fontSize.title};font-weight:700;color:${tc.titleColor};line-height:1.3;`;
  panel.appendChild(titleEl);

  // Accent bar (colored strip under title)
  const accentBar = document.createElement("div");
  accentBar.style.cssText =
    `height:3px;width:48px;border-radius:2px;background:${tc.primaryBtnBg};margin:0 auto 14px;`;
  panel.appendChild(accentBar);

  // Body
  if (body) {
    const bodyEl = document.createElement("div");
    bodyEl.className = "alert-body";
    bodyEl.style.cssText =
      `font-size:${ss.fontSize.body};color:#4b5563;line-height:1.6;margin-bottom:20px;max-width:360px;margin-left:auto;margin-right:auto;`;
    if (typeof body === "string") bodyEl.innerHTML = body;
    else bodyEl.appendChild(body.cloneNode(true));
    panel.appendChild(bodyEl);
  }

  // Buttons
  const btnRow = document.createElement("div");
  btnRow.className = "alert-buttons";
  btnRow.style.cssText = "display:flex;gap:8px;justify-content:center;flex-wrap:wrap;";

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i]!;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = btn.label;

    switch (btn.variant ?? (i === buttons.length - 1 ? "primary" : "secondary")) {
      case "primary":
        b.style.cssText += `background:${tc.primaryBtnBg};color:#fff;border:none;`; break;
      case "secondary":
        b.style.cssText += "background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;"; break;
      case "ghost":
        b.style.cssText += "background:transparent;color:#6b7280;border:1px solid #d1d5db;"; break;
      case "danger":
        b.style.cssText += "background:#fef2f2;color:#dc2626;border:1px solid #fecaca;"; break;
      default:
        b.style.cssText += `background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;`;
    }

    b.style.cssText +=
      `padding:${ss.btnPadding};border-radius:8px;font-size:13px;font-weight:500;` +
      "cursor:pointer;transition:all 0.15s;";

    b.addEventListener("mouseenter", () => {
      switch (btn.variant ?? (i === buttons.length - 1 ? "primary" : "secondary")) {
        case "primary": b.style.background = "#2563eb"; break;
        case "secondary": b.style.background = "#e5e7eb"; break;
        case "ghost": b.style.background = "#f3f4f6"; break;
        case "danger": b.style.background = "#fee2e2"; break;
        default: b.style.background = "#e5e7eb";
      }
    });
    b.addEventListener("mouseleave", () => {
      switch (btn.variant ?? (i === buttons.length - 1 ? "primary" : "secondary")) {
        case "primary": b.style.background = tc.primaryBtnBg; break;
        case "secondary": b.style.background = "#f3f4f6"; break;
        case "ghost": b.style.background = "transparent"; break;
        case "danger": b.style.background = "#fef2f2"; break;
        default: b.style.background = "#f3f4f4f6";
      }
    });

    b.addEventListener("click", async () => {
      await btn.onClick?.();
      if (dismissible || i === buttons.length - 1) close();
    });

    btnRow.appendChild(b);
  }

  // Dismiss button
  if (dismissible) {
    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.innerHTML = "&times;";
    dismissBtn.setAttribute("aria-label", "Close");
    dismissBtn.style.cssText =
      "position:absolute;top:12px;right:12px;border:none;background:none;cursor:pointer;" +
      "font-size:18px;color:#9ca3af;padding:4px;border-radius:6px;";
    dismissBtn.addEventListener("mouseenter", () => { dismissBtn.style.background = "#f3f4f6"; });
    dismissBtn.addEventListener("mouseleave", () => { dismissBtn.style.background = ""; });
    dismissBtn.addEventListener("click", close);
    panel.style.position = "relative";
    panel.appendChild(dismissBtn);
  }

  panel.appendChild(btnRow);
  overlay.appendChild(panel);

  // Keyframes
  if (!document.getElementById("ad-keyframes")) {
    const ks = document.createElement("style");
    ks.id = "ad-keyframes";
    ks.textContent = "@keyframes ad-fade-in{from{opacity:0}to{opacity:1}}";
    document.head.appendChild(ks);
  }

  (container ?? document.body).appendChild(overlay);

  // --- Methods ---

  function show(): void {
    if (_visible) return;
    _visible = true;
    overlay.style.display = "flex";
    onOpen?.();

    // Focus first button or close button
    setTimeout(() => {
      const focusTarget = dismissible ? dismissBtn : (btnRow.querySelector("button") as HTMLElement);
      focusTarget?.focus();
    }, 50);

    setupListeners();
  }

  function close(): void {
    if (!_visible) return;
    overlay.style.animation = "ad-fade-out 0.12s ease reverse";

    setTimeout(() => {
      _visible = false;
      overlay.style.display = "none";
      overlay.style.animation = "";
      removeListeners();
      onClose?.();
    }, duration);
  }

  function isVisible(): boolean { return _visible; }

  function setupListeners(): void {
    removeListeners();
    if (overlayDismiss) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
    }
    if (escapeDismiss) {
      const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", h);
      cleanupFns.push(() => document.removeEventListener("keydown", h));
    }
  }

  function removeListeners(): void {
    // Cleanup handled inline above
  }

  function destroy(): void {
    if (_visible) close();
    setTimeout(() => overlay.remove(), duration + 50);
  }

  return { el: overlay, show, close, isVisible, destroy };
}
