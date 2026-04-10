/**
 * Empty State Component: Placeholder for empty data states with SVG illustrations,
 * descriptions, action buttons, multiple visual variants, and animations.
 */

// --- Types ---

export type EmptyStateVariant = "default" | "search" | "inbox" | "error" | "offline" | "no-permissions" | "no-data" | "success";

export interface EmptyStateOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Visual variant */
  variant?: EmptyStateVariant;
  /** Title/heading */
  title?: string;
  /** Description text (supports HTML) */
  description?: string;
  /** Primary action button label */
  primaryActionLabel?: string;
  /** Primary action callback */
  onPrimaryAction?: () => void;
  /** Secondary action button label */
  secondaryActionLabel?: string;
  /** Secondary action callback */
  onSecondaryAction?: void;
  /** Custom illustration (SVG string or HTML) */
  customIllustration?: string;
  /** Illustration size in px */
  illustrationSize?: number;
  /** Compact mode (smaller spacing) */
  compact?: boolean;
  /** Center content vertically? */
  centered?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface EmptyStateInstance {
  element: HTMLElement;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setVariant: (variant: EmptyStateVariant) => void;
  show: () => void;
  hide: () => void;
  destroy: () => void;
}

// --- Built-in Illustrations ---

const ILLUSTRATIONS: Record<EmptyStateVariant, string> = {
  default: `<svg viewBox="0 0 200 160" fill="none"><rect x="40" y="30" width="120" height="90" rx="8" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/><line x1="60" y1="55" x2="140" y2="55" stroke="#d1d5db" stroke-width="3" stroke-linecap="round"/><line x1="60" y1="75" x2="120" y2="75" stroke="#e5e7eb" stroke-width="3" stroke-linecap="round"/><line x1="60" y1="95" x2="100" y2="95" stroke="#e5e7eb" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="130" r="16" fill="#eef2ff"/><path d="M94 128l4 4 8-8" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  search: `<svg viewBox="0 0 200 160" fill="none"><circle cx="85" cy="70" r="32" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/><circle cx="85" cy="70" r="14" stroke="#9ca3af" stroke-width="2.5" stroke-dasharray="4 4"/><line x1="109" y1="94" x2="135" y2="120" stroke="#d1d5db" stroke-width="4" stroke-linecap="round"/></svg>`,

  inbox: `<svg viewBox="0 0 200 160" fill="none"><rect x="25" y="35" width="150" height="100" rx="10" fill="#f9fafb" stroke="#d1d5db" stroke-width="2"/><path d="M25 55h150" stroke="#d1d5db" stroke-width="2"/><circle cx="50" cy="45" r="5" fill="#fecaca"/><circle cx="65" cy="45" r="5" fill="#fef3c7"/><circle cx="80" cy="45" r="5" fill:#bbf7d0"/></svg>`,

  error: `<svg viewBox="0 0 200 160" fill="none"><circle cx="100" cy="75" r="45" fill="#fef2f2" stroke="#fecaca" stroke-width="2"/><path d="M82 62l36 26M118 62l-36 26" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="132" r="12" fill="#fee2e2"/><text x="100" y="137" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">!</text></svg>`,

  offline: `<svg viewBox="0 0 200 160" fill="none"><path d="M40 110 L70 70 L100 95 L140 50 L170 85" stroke="#d1d5db" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="110" r="5" fill="#d1d5db"/><circle cx="70" cy="70" r="5" fill="#d1d5db"/><circle cx="100" cy="95" r="5" fill="#d1d5db"/><circle cx="140" cy="50" r="5" fill="#d1d5db"/><circle cx="170" cy="85" r="5" fill="#d1d5db"/><line x1="155" y1="35" x2="180" y2="15" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/><line x1="152" y1="20" x2="178" y2="18" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/></svg>`,

  "no-permissions": `<svg viewBox="0 0 200 160" fill="none"><rect x="60" y="40" width="80" height="70" rx="6" fill="#fef2f2" stroke="#fecaca" stroke-width="2"/><circle cx="100" cy="68" r="14" fill="#fee2e2"/><rect x="88" y="78" width="24" height="18" rx="3" fill="#fee2e2"/><line x1="145" y1="30" x2="175" y2="60" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/><line x1="175" y1="30" x2="145" y2="60" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/></svg>`,

  "no-data": `<svg viewBox="0 0 200 160" fill="none"><rect x="45" y="35" width="110" height="80" rx="6" fill="#fafafa" stroke="#e5e7eb" stroke-width="1.5" stroke-dasharray="6 4"/><line x1="65" y1="58" x2="135" y2="58" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4"/><line x1="65" y1="76" x2="115" y2="76" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4"/><line x1="65" y1="94" x2="95" y2="94" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4"/></svg>`,

  success: `<svg viewBox="0 0 200 160" fill="none"><circle cx="100" cy="72" r="42" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="2"/><path d="M78 72l12 12 28-28" stroke="#22c55e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="100" cy="134" r="10" fill="#dcfce7"/></svg>`,
};

const DEFAULT_TITLES: Record<EmptyStateVariant, string> = {
  default: "No results found",
  search: "No results match your search",
  inbox: "Your inbox is empty",
  error: "Something went wrong",
  offline: "You're offline",
  "no-permissions": "You don't have access",
  "no-data": "No data available",
  success: "All done!",
};

const DEFAULT_DESCS: Record<EmptyStateVariant, string> = {
  default: "There aren't any items to display right now.",
  search: "Try adjusting your search or filter terms.",
  inbox: "When you receive messages, they'll appear here.",
  error: "An unexpected error occurred. Please try again.",
  offline: "Check your internet connection and try again.",
  "no-permissions": "Contact an administrator if you need access.",
  "no-data": "Data will appear here once it's available.",
  success: "Your operation completed successfully.",
};

// --- Main Class ---

export class EmptyStateManager {
  create(options: EmptyStateOptions): EmptyStateInstance {
    const opts = {
      variant: options.variant ?? "default",
      illustrationSize: options.illustrationSize ?? 140,
      compact: options.compact ?? false,
      centered: options.centered ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("EmptyState: container element not found");

    container.className = `empty-state empty-${opts.variant} ${opts.className ?? ""}`;
    container.style.cssText = opts.centered
      ? `display:flex;flex-direction:column;align-items:center;justify-content:center;${opts.compact ? "padding:24px;" : "padding:48px 24px;"}text-align:center;`
      : `display:flex;flex-direction:column;align-items:center;padding:${opts.compact ? "16px" : "24px"};text-align:center;`;

    // Create element
    const el = document.createElement("div");
    el.className = "empty-state-inner";
    el.style.cssText = `
      display:flex;flex-direction:column;align-items:center;max-width:360px;
      animation:fadeInUp 0.4s ease both;
    `;
    container.appendChild(el);

    // Add keyframe animation style
    if (!document.getElementById("empty-state-styles")) {
      const style = document.createElement("style");
      style.id = "empty-state-styles";
      style.textContent = `
        @keyframes fadeInUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
      `;
      document.head.appendChild(style);
    }

    // Illustration
    const illustrationEl = document.createElement("div");
    illustrationEl.className = "empty-illustration";
    illustrationEl.style.cssText = `
      width:${opts.illustrationSize}px;height:auto;margin-bottom:${opts.compact ? "12px" : "20px"};
      opacity:0.8;
    `;
    const svgContent = opts.customIllustration ?? ILLUSTRATIONS[opts.variant];
    illustrationEl.innerHTML = svgContent;
    el.appendChild(illustrationEl);

    // Title
    const titleEl = document.createElement("h3");
    titleEl.className = "empty-title";
    titleEl.style.cssText = `
      font-size:${opts.compact ? "15px" : "17px"};font-weight:600;color:#111827;
      margin:0 0 ${opts.compact ? "4px" : "8px"};line-height:1.3;
    `;
    titleEl.textContent = options.title ?? DEFAULT_TITLES[opts.variant];
    el.appendChild(titleEl);

    // Description
    const descEl = document.createElement("p");
    descEl.className = "empty-description";
    descEl.style.cssText = `
      font-size:${opts.compact ? "12px" : "13px"};color:#6b7280;line-height:1.5;
      margin:0 0 ${opts.compact ? "12px" : "20px"};max-width:320px;
    `;
    descEl.innerHTML = options.description ?? DEFAULT_DESCS[opts.variant];
    el.appendChild(descEl);

    // Actions area
    const actionsEl = document.createElement("div");
    actionsEl.className = "empty-actions";
    actionsEl.style.cssText = `display:flex;gap:10px;flex-wrap:wrap;justify-content:center;`;
    el.appendChild(actionsEl);

    // Primary action
    if (options.primaryActionLabel) {
      const primaryBtn = document.createElement("button");
      primaryBtn.type = "button";
      primaryBtn.textContent = options.primaryActionLabel;
      primaryBtn.style.cssText = `
        padding:${opts.compact ? "6px 16px" : "8px 20px"};border-radius:8px;font-size:13px;
        font-weight:500;background:#4338ca;color:#fff;border:none;cursor:pointer;
        transition:background 0.15s,transform 0.1s;box-shadow:0 1px 3px rgba(67,53,202,0.2);
      `;
      primaryBtn.addEventListener("click", () => opts.onPrimaryAction?.());
      primaryBtn.addEventListener("mouseenter", () => { primaryBtn.style.background = "#3730a3"; });
      primaryBtn.addEventListener("mouseleave", () => { primaryBtn.style.background = "#4338ca"; });
      actionsEl.appendChild(primaryBtn);
    }

    // Secondary action
    if (options.secondaryActionLabel) {
      const secondaryBtn = document.createElement("button");
      secondaryBtn.type = "button";
      secondaryBtn.textContent = options.secondaryActionLabel;
      secondaryBtn.style.cssText = `
        padding:${opts.compact ? "6px 16px" : "8px 20px"};border-radius:8px;font-size:13px;
        font-weight:500;background:#fff;color:#4b5563;border:1px solid #d1d5db;cursor:pointer;
        transition:border-color 0.15s,background 0.15s;
      `;
      secondaryBtn.addEventListener("click", () => opts.onSecondaryAction?.());
      secondaryBtn.addEventListener("mouseenter", () => { secondaryBtn.style.borderColor = "#9ca3af"; secondaryBtn.style.background = "#f9fafb"; });
      secondaryBtn.addEventListener("mouseleave", () => { secondaryBtn.style.borderColor = "#d1d5db"; secondaryBtn.style.background = "#fff"; });
      actionsEl.appendChild(secondaryBtn);
    }

    const instance: EmptyStateInstance = {
      element: container,

      setTitle(title: string) {
        titleEl.textContent = title;
      },

      setDescription(desc: string) {
        descEl.innerHTML = desc;
      },

      setVariant(variant: EmptyStateVariant) {
        opts.variant = variant;
        illustrationEl.innerHTML = opts.customIllustration ?? ILLUSTRATIONS[variant];
        if (!options.title) titleEl.textContent = DEFAULT_TITLES[variant];
        if (!options.description) descEl.innerHTML = DEFAULT_DESCS[variant];

        container.classList.forEach((cls) => {
          if (cls.startsWith("empty-") && cls !== "empty-state-inner") container.classList.remove(cls);
        });
        container.classList.add(`empty-${variant}`);
      },

      show() {
        container.style.display = "";
      },

      hide() {
        container.style.display = "none";
      },

      destroy() {
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create an empty state */
export function createEmptyState(options: EmptyStateOptions): EmptyStateInstance {
  return new EmptyStateManager().create(options);
}
