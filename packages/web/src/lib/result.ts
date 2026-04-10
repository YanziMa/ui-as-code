/**
 * Result / Status Display: Result card with status variants (success/error/warning/info),
 * icons, title/subtitle, extra content area, action buttons, and multiple layout styles.
 */

// --- Types ---

export type ResultStatus = "success" | "error" | "warning" | "info" | "403" | "404" | "500";
export type ResultVariant = "default" | "card" | "banner" | "minimal";

export interface ResultOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Status variant */
  status?: ResultStatus;
  /** Title text */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Status icon (emoji or SVG string) - auto if not set */
  icon?: string;
  /** Extra content (HTML string or element) rendered below title */
  extra?: string | HTMLElement;
  /** Primary action button */
  primaryAction?: { text: string; onClick: () => void };
  /** Secondary action button */
  secondaryAction?: { text: string; onClick: () => void };
  /** Layout variant */
  variant?: ResultVariant;
  /** Show status icon? (default: true) */
  showIcon?: boolean;
  /** Size: sm/md/lg */
  size?: "sm" | "md" | "lg";
  /** Center content horizontally */
  centered?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface ResultInstance {
  element: HTMLElement;
  setStatus: (status: ResultStatus) => void;
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
  destroy: () => void;
}

// --- Status Config ---

const STATUS_CONFIG: Record<ResultStatus, {
  color: string;
  bg: string;
  border: string;
  icon: string;
  label: string;
}> = {
  success: {
    color: "#166534",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    icon: "\u2705",
    label: "Success",
  },
  error: {
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: "\u2716",
    label: "Error",
  },
  warning: {
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    icon: "\u26A0",
    label: "Warning",
  },
  info: {
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    icon: "\u2139",
    label: "Info",
  },
  "403": {
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: "\u{1F6AB}",
    label: "Forbidden",
  },
  "404": {
    color: "#9ca3af",
    bg: "#f9fafb",
    border: "#e5e7eb",
    icon: "\u{1F4BD}",
    label: "Not Found",
  },
  "500": {
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: "\u26A1",
    label: "Server Error",
  },
};

const SIZE_STYLES: Record<string, { padding: string; fontSize: number; iconSize: number }> = {
  sm: { padding: "12px 16px", fontSize: 13, iconSize: 20 },
  md: { padding: "18px 24px", fontSize: 15, iconSize: 24 },
  lg: { padding: "24px 32px", fontSize: 17, iconSize: 28 },
};

// --- Main ---

export function createResult(options: ResultOptions): ResultInstance {
  const opts = {
    status: options.status ?? "info",
    showIcon: options.showIcon ?? true,
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    centered: options.centered ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Result: container not found");

  const cfg = STATUS_CONFIG[opts.status] ?? STATUS_CONFIG.info;
  const sz = SIZE_STYLES[opts.size];

  let destroyed = false;

  function render(): void {
    container.innerHTML = "";
    container.className = `result result-${opts.status} result-${opts.variant} result-${opts.size} ${opts.className}`;
    container.setAttribute("role", "alert");
    container.setAttribute("aria-label", cfg.label);

    switch (opts.variant) {
      case "banner":
        renderBanner();
        break;
      case "card":
        renderCard();
        break;
      case "minimal":
        renderMinimal();
        break;
      default:
        renderDefault();
    }
  }

  function renderDefault(): void {
    container.style.cssText = `
      display:flex;align-items:flex-start;gap:14px;
      background:${cfg.bg};border:1px solid ${cfg.border};
      border-radius:8px;padding:${sz.padding};
      ${opts.centered ? "justify-content:center;" : ""}
      font-family:-apple-system,sans-serif;color:${cfg.color};max-width:600px;
    `;

    // Icon
    if (opts.showIcon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = opts.icon ?? cfg.icon;
      iconEl.style.cssText = `font-size:${sz.iconSize}px;line-height:1;flex-shrink:0;margin-top:2px;`;
      container.appendChild(iconEl);
    }

    // Content
    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;";

    // Title
    if (opts.title) {
      const titleEl = document.createElement("h3");
      titleEl.style.cssText = `margin:0 0 4px;font-size:${sz.fontSize}px;font-weight:600;line-height:1.4;`;
      titleEl.textContent = opts.title;
      content.appendChild(titleEl);
    }

    // Subtitle
    if (opts.subtitle) {
      const subEl = document.createElement("p");
      subEl.style.cssText = `margin:0;font-size:${sz.fontSize - 2}px;color:${cfg.color}99;opacity:0.85;line-height:1.5;`;
      subEl.textContent = opts.subtitle;
      content.appendChild(subEl);
    }

    // Extra content
    if (opts.extra) {
      const extraEl = document.createElement("div");
      extraEl.className = "result-extra";
      extraEl.style.cssText = `margin-top:10px;font-size:${sz.fontSize - 1}px;color:${cfg.color};line-height:1.5;`;
      if (typeof opts.extra === "string") extraEl.innerHTML = opts.extra;
      else extraEl.appendChild(opts.extra);
      content.appendChild(extraEl);
    }

    // Actions
    if (opts.primaryAction || opts.secondaryAction) {
      const actionsRow = document.createElement("div");
      actionsRow.style.cssText = "display:flex;gap:8px;margin-top:14px;";
      if (opts.primaryAction) {
        actionsRow.appendChild(createBtn(opts.primaryAction, "primary", cfg));
      }
      if (opts.secondaryAction) {
        actionsRow.appendChild(createBtn(opts.secondaryAction, "secondary", cfg));
      }
      content.appendChild(actionsRow);
    }

    container.appendChild(content);
  }

  function renderCard(): void {
    container.style.cssText = `
      background:#fff;border:1px solid ${cfg.border};border-radius:12px;
      overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);
      max-width:480px;${opts.centered ? "margin:0 auto;" : ""}
      font-family:-apple-system,sans-serif;
    `;

    // Header bar with status color
    const header = document.createElement("div");
    header.style.cssText = `background:${cfg.bg};padding:${sz.padding};display:flex;align-items:center;gap:12px;border-bottom:1px solid ${cfg.border};`;

    if (opts.showIcon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = opts.icon ?? cfg.icon;
      iconEl.style.cssText = `font-size:${sz.iconSize}px;flex-shrink:0;`;
      header.appendChild(iconEl);
    }

    const titleEl = document.createElement("span");
    titleEl.style.cssText = `font-weight:600;font-size:${sz.fontSize}px;color:${cfg.color};`;
    titleEl.textContent = opts.title ?? cfg.label;
    header.appendChild(titleEl);

    container.appendChild(header);

    // Body
    const body = document.createElement("div");
    body.style.cssText = `padding:${sz.padding};`;

    if (opts.subtitle) {
      const subEl = document.createElement("p");
      subEl.style.cssText = `margin:0 0 12px;color:#6b7280;font-size:${sz.fontSize - 1}px;line-height:1.5;`;
      subEl.textContent = opts.subtitle;
      body.appendChild(subEl);
    }

    if (opts.extra) {
      const extraEl = document.createElement("div");
      if (typeof opts.extra === "string") extraEl.innerHTML = opts.extra;
      else extraEl.appendChild(opts.extra);
      body.appendChild(extraEl);
    }

    // Actions
    if (opts.primaryAction || opts.secondaryAction) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:8px;margin-top:16px;";
      if (opts.primaryAction) row.appendChild(createBtn(opts.primaryAction, "primary", cfg));
      if (opts.secondaryAction) row.appendChild(createBtn(opts.secondaryAction, "secondary", cfg));
      body.appendChild(row);
    }

    container.appendChild(body);
  }

  function renderBanner(): void {
    container.style.cssText = `
      background:${cfg.bg};border-bottom:1px solid ${cfg.border};
      padding:${sz.padding};display:flex;align-items:center;gap:12px;
      font-family:-apple-system,sans-serif;color:${cfg.color};
      ${opts.centered ? "justify-content:center;" : ""}
    `;

    if (opts.showIcon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = opts.icon ?? cfg.icon;
      iconEl.style.cssText = `font-size:${sz.iconSize}px;flex-shrink:0;`;
      container.appendChild(iconEl);
    }

    const content = document.createElement("span");
    content.style.cssText = "font-weight:500;font-size:${sz.fontSize}px;";

    if (opts.title) {
      const t = document.createElement("strong");
      t.textContent = opts.title;
      content.appendChild(t);
      if (opts.subtitle) content.appendChild(document.createTextNode(` ${opts.subtitle}`));
    } else if (opts.subtitle) {
      content.textContent = opts.subtitle;
    }

    container.appendChild(content);

    // Actions inline for banner
    if (opts.primaryAction || opts.secondaryAction) {
      const gap = document.createElement("span");
      gap.style.cssText = `margin-left:auto;display:inline-flex;gap:8px;`;
      if (opts.primaryAction) gap.appendChild(createBtn(opts.primaryAction, "primary", cfg));
      if (opts.secondaryAction) gap.appendChild(createBtn(opts.secondaryAction, "secondary", cfg));
      container.appendChild(gap);
    }
  }

  function renderMinimal(): void {
    container.style.cssText = `
      display:inline-flex;align-items:center;gap:6px;
      padding:4px 12px;background:${cfg.bg};border:1px solid ${cfg.border};
      border-radius:4px;font-family:-apple-system,sans-serif;color:${cfg.color};
      font-size:${sz.fontSize - 1}px;
    `;

    if (opts.showIcon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = opts.icon ?? cfg.icon;
      iconEl.style.cssText = `font-size:${sz.iconSize - 2}px;`;
      container.appendChild(iconEl);
    }

    const txt = document.createElement("span");
    txt.textContent = opts.title ?? opts.subtitle ?? "";
    container.appendChild(txt);
  }

  function createBtn(
    action: NonNullable<ResultOptions["primaryAction" | ResultOptions["secondaryAction"]>,
    variant: "primary" | "secondary",
    sc: typeof STATUS_CONFIG[ResultStatus],
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.text;
    btn.style.cssText =
      variant === "primary"
        ? `background:${sc.color};color:#fff;border:none;padding:7px 16px;border-radius:6px;font-size:${sz.fontSize - 1}px;font-weight:500;cursor:pointer;transition:opacity 0.15s;`
        : `background:transparent;color:${sc.color};border:1px solid ${sc.border};padding:7px 16px;border-radius:6px;font-size:${sz.fontSize - 1}px;font-weight:500;cursor:pointer;transition:all 0.15s;`;

    btn.addEventListener("click", (e) => { e.stopPropagation(); action.onClick(); });
    btn.addEventListener("mouseenter", () => {
      if (variant === "primary") btn.style.opacity = "0.85";
      else btn.style.background = `${sc.bg}10`;
    });
    btn.addEventListener("mouseleave", () => {
      if (variant === "primary") btn.style.opacity = "";
      else btn.style.background = "transparent";
    });
    return btn;
  }

  // Initial render
  render();

  return {
    element: container,

    setStatus(status: ResultStatus) {
      opts.status = status;
      render();
    },

    setTitle(title: string) {
      opts.title = title;
      render();
    },

    setSubtitle(subtitle: string) {
      opts.subtitle = subtitle;
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };
}
