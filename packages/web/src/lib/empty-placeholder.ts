/**
 * Empty Placeholder / Empty State: Displayed when a list, table, or section has no data.
 * Supports multiple variants (no-data, search-empty, error, info), icons,
 * action buttons, illustrations, and responsive sizing.
 */

// --- Types ---

export type EmptyVariant = "default" | "search" | "error" | "info" | "success" | "offline";

export interface EmptyPlaceholderOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Visual variant */
  variant?: EmptyVariant;
  /** Title text */
  title?: string;
  /** Description/subtitle */
  description?: string;
  /** SVG icon or emoji icon */
  icon?: string;
  /** Primary action button label */
  actionLabel?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action button label */
  secondaryLabel?: string;
  /** Secondary action callback */
  onSecondary?: () => void;
  /** Maximum width (default: 360px) */
  maxWidth?: number;
  /** Padding size: sm, md, lg */
  padding?: "sm" | "md" | "lg";
  /** Compact mode (smaller spacing) */
  compact?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface EmptyInstance {
  element: HTMLElement;
  /** Update title */
  setTitle: (title: string) => void;
  /** Update description */
  setDescription: (desc: string) => void;
  /** Change variant */
  setVariant: (variant: EmptyVariant) => void;
  /** Show the placeholder */
  show: () => void;
  /** Hide the placeholder */
  hide: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Variant Config ---

const VARIANT_CONFIG: Record<EmptyVariant, {
  icon: string;
  color: string;
  bg: string;
  border: string;
  defaultTitle: string;
  defaultDesc: string;
}> = {
  default: {
    icon: "\u{1F4E4}", color: "#9ca3af", bg: "#fafafa",
    border: "#f0f0f0",
    defaultTitle: "No data yet",
    defaultDesc: "Items will appear here once available.",
  },
  search: {
    icon: "\u{1F50D}", color: "#6b7280", bg: "#fffbeb",
    border: "#fde68a",
    defaultTitle: "No results found",
    defaultDesc: "Try adjusting your search or filters.",
  },
  error: {
    icon: "\u{1F6AB}", color: "#dc2626", bg: "#fef2f2",
    border: "#fecaca",
    defaultTitle: "Something went wrong",
    defaultDesc: "An error occurred while loading content.",
  },
  info: {
    icon: "\u2139\uFE0F", color: "#3b82f6", bg: "#eff6ff",
    border: "#bfdbfe",
    defaultTitle: "No information",
    defaultDesc: "There's nothing to display here.",
  },
  success: {
    icon: "\u2705", color: "#16a34a", bg: "#f0fdf4",
    border: "#bbf7d0",
    defaultTitle: "All done!",
    defaultDesc: "Everything is up to date.",
  },
  offline: {
    icon: "\u{1F310}", color: "#8b5cf6", bg: "#eff6ff",
    border: "#bfdbfe",
    defaultTitle: "You're offline",
    defaultDesc: "Check your internet connection and try again.",
  },
};

// --- Illustration SVGs ---

function getIllustration(variant: EmptyVariant): string {
  const cfg = VARIANT_CONFIG[variant];
  switch (variant) {
    case "default":
      return `<svg width="120" height="100" viewBox="0 0 120 100" fill="none">
        <rect x="20" y="30" width="80" height="40" rx="6" fill="${cfg.bg}" stroke="${cfg.border}" stroke-width="1.5"/>
        <circle cx="40" cy="42" r="3" fill="${cfg.color}" opacity="0.3"/>
        <circle cx="60" cy="42" r="3" fill="${cfg.color}" opacity="0.3"/>
        <circle cx="80" cy="42" r="3" fill="${cfg.color}" opacity="0.3"/>
        <path d="M35 52 L45 62 L55 52 L65 62" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      </svg>`;
    case "search":
      return `<svg width="100" height="90" viewBox="0 0 100 90" fill="none">
        <circle cx="50" cy="32" r="16" fill="${cfg.bg}" stroke="${cfg.border}" stroke-width="1.5"/>
        <circle cx="50" cy="32" r="6" fill="${cfg.color}" opacity="0.2"/>
        <line x1="38" y1="56" x2="62" y2="72" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        <line x1="50" y1="56" x2="50" y2="72" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        <line x1="62" y1="56" x2="38" y2="72" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      </svg>`;
    case "error":
      return `<svg width="100" height="90" viewBox="0 0 100 90" fill="none">
        <circle cx="50" cy="36" r="20" fill="${cfg.bg}" stroke="${cfg.border}" stroke-width="1.5"/>
        <path d="M42 44 L50 36 L58 44" stroke="${cfg.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="30" y1="58" x2="70" y2="70" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      </svg>`;
    case "info":
      return `<svg width="100" height="90" viewBox="0 0 100 90" fill="none">
        <circle cx="50" cy="34" r="18" fill="${cfg.bg}" stroke="${cfg.border}" stroke-width="1.5"/>
        <circle cx="50" cy="34" r="6" fill="${cfg.color}" opacity="0.15"/>
        <line x1="40" y1="54" x2="60" y2="68" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        <line x1="50" y1="54" x2="50" y2="68" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      </svg>`;
    case "success":
      return `<svg width="100" height="90" viewBox="0 0 100 90" fill="none">
        <circle cx="50" cy="36" r="18" fill="${cfg.bg}" stroke="${cfg.border}" stroke-width="1.5"/>
        <path d="M43 37 L48 33 L57 42 L59 41" stroke="${cfg.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`;
    case "offline":
      return `<svg width="100" height="90" viewBox="0 0 100 90" fill="none">
        <path d="M25 65 Q50 35 75 65" stroke="${cfg.color}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <circle cx="78" cy="28" r="10" fill="${cfg.bg}" stroke="${cfg.border}" stroke-width="1.5"/>
        <line x1="74" y1="24" x2="82" y2="32" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    default:
      return "";
  }
}

// --- Padding Config ---

const PADDING_MAP: Record<string, { py: number; px: number }> = {
  sm: { py: 24, px: 20 },
  md: { py: 40, px: 32 },
  lg: { py: 56, px: 40 },
};

// --- Main Factory ---

export function createEmptyPlaceholder(options: EmptyPlaceholderOptions): EmptyInstance {
  const opts = {
    variant: options.variant ?? "default",
    maxWidth: options.maxWidth ?? 360,
    padding: options.padding ?? "md",
    compact: options.compact ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("EmptyPlaceholder: container not found");

  const cfg = VARIANT_CONFIG[opts.variant];
  const pad = PADDING_MAP[opts.padding];

  // Root
  const el = document.createElement("div");
  el.className = `empty-placeholder ep-${opts.variant} ${opts.className}`;
  el.style.cssText = `
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:${pad.py}px ${pad.px}px;
    max-width:${opts.maxWidth}px;margin:0 auto;
    font-family:-apple-system,sans-serif;color:#6b7280;
    ${opts.compact ? "" : "min-height:200px;"}
  `;

  // Illustration
  const illustration = document.createElement("div");
  illustration.className = "ep-illustration";
  if (opts.icon) {
    const iconEl = document.createElement("span");
    iconEl.textContent = opts.icon;
    iconEl.style.cssText = `font-size:48px;line-height:1;`;
    illustration.appendChild(iconEl);
  } else {
    illustration.innerHTML = getIllustration(opts.variant);
  }
  el.appendChild(illustration);

  // Title
  const titleEl = document.createElement("h3");
  titleEl.className = "ep-title";
  titleEl.textContent = opts.title ?? cfg.defaultTitle;
  titleEl.style.cssText = `
    font-size:15px;font-weight:600;color:#111827;margin-top:16px;
    line-height:1.3;
  `;
  el.appendChild(titleEl);

  // Description
  const descEl = document.createElement("p");
  descEl.className = "ep-description";
  descEl.textContent = opts.description ?? cfg.defaultDesc;
  descEl.style.cssText = `font-size:13px;color:#9ca3af;margin-top:6px;line-height:1.5;max-width:280px;`;
  el.appendChild(descEl);

  // Actions row
  if (opts.actionLabel || opts.secondaryLabel) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "ep-actions";
    actionsRow.style.cssText = "display:flex;gap:8px;justify-content:center;margin-top:20px;";

    if (opts.secondaryLabel) {
      const secBtn = document.createElement("button");
      secBtn.type = "button";
      secBtn.textContent = opts.secondaryLabel;
      secBtn.style.cssText = `
        padding:7px 16px;border-radius:8px;font-size:13px;font-weight:500;
        background:#fff;border:1px solid #d1d5db;color:#374151;
        cursor:pointer;transition:all 0.15s;
      `;
      secBtn.addEventListener("mouseenter", () => { secBtn.style.background = "#f9fafb"; });
      secBtn.addEventListener("mouseleave", () => { secBtn.style.background = ""; });
      secBtn.addEventListener("click", () => opts.onSecondary?.());
      actionsRow.appendChild(secBtn);
    }

    if (opts.actionLabel) {
      const primBtn = document.createElement("button");
      primBtn.type = "button";
      primBtn.textContent = opts.actionLabel;
      primBtn.style.cssText = `
        padding:7px 20px;border-radius:8px;font-size:13px;font-weight:500;
        background:#4338ca;border:none;color:#fff;
        cursor:pointer;transition:background 0.15s;
      `;
      primBtn.addEventListener("mouseenter", () => { primBtn.style.background="#3730a3"; });
      primBtn.addEventListener("mouseleave", () => { primBtn.style.background = "#4338ca"; });
      primBtn.addEventListener("click", () => opts.onAction?.());
      actionsRow.appendChild(primBtn);
    }

    el.appendChild(actionsRow);
  }

  container.appendChild(el);

  let destroyed = false;

  const instance: EmptyInstance = {
    element: el,

    setTitle(title: string) { titleEl.textContent = title; },

    setDescription(desc: string) { descEl.textContent = desc; },

    setVariant(variant: EmptyVariant) {
      opts.variant = variant;
      const newCfg = VARIANT_CONFIG[variant];
      el.className = `empty-placeholder ep-${variant} ${opts.className}`;
      // Update colors
      titleEl.style.color = "#111827";
      descEl.style.color = "#9ca3af";
      // Re-render illustration
      illustration.innerHTML = getIllustration(variant);
    },

    show() { el.style.display = "flex"; },

    hide() { el.style.display = "none"; },

    destroy() {
      destroyed = true;
      el.remove();
    },
  };

  return instance;
}
