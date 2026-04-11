/**
 * Lightweight Empty State: Placeholder for empty data states with built-in SVG
 * illustrations, titles & descriptions per variant, primary/secondary actions,
 * compact mode, and fadeInUp animation.
 */

// --- Types ---

export type EmptyStateVariant = "default" | "search" | "inbox" | "error" | "offline" | "no-permissions" | "no-data" | "success";

export interface EmptyStateOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Visual variant (determines icon and default text) */
  variant?: EmptyStateVariant;
  /** Custom title (overrides variant default) */
  title?: string;
  /** Custom description (overrides variant default) */
  description?: string;
  /** Primary action button */
  primaryAction?: { label: string; onClick: () => void };
  /** Secondary action button */
  secondaryAction?: { label: string; onClick: () => void };
  /** Compact mode (smaller padding) */
  compact?: boolean;
  /** Max width for content area */
  maxWidth?: string;
  /** Hide the illustration icon? */
  hideIcon?: boolean;
  /** Custom SVG/HTML for illustration */
  customIllustration?: string | HTMLElement;
  /** Custom CSS class */
  className?: string;
}

export interface EmptyStateInstance {
  element: HTMLElement;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setVariant: (variant: EmptyStateVariant) => void;
  destroy: () => void;
}

// --- Variant Config ---

const VARIANT_CONFIG: Record<EmptyStateVariant, {
  title: string;
  description: string;
  svgPath: string;
}> = {
  default:       { title: "No data yet", description: "Get started by adding some data.", svgPath: "M20 7l-8-4-8 4m0 0l8-4 8 4m-8 12H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10z" },
  search:        { title: "No results found", description: "Try adjusting your search or filter criteria.", svgPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  inbox:         { title: "No messages", description: "Your inbox is empty. New messages will appear here.", svgPath: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  error:         { title: "Something went wrong", description: "An error occurred. Please try again later.", svgPath: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.83.833-.19 2.5 1.732 2.5z" },
  offline:       { title: "You're offline", description: "Check your internet connection and try again.", svgPath: "M18.364 5.636a9 9 0 010 12.728M7.05 17.284A9 9 0 1112.728 3.05M12 12v5" },
  "no-permissions": { title: "Access denied", description: "You don't have permission to view this content.", svgPath: "M12 15v2m-4 4h8a2 2 0 002-2v-6a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2zm2-10V4a2 2 0 114 0v3" },
  "no-data":      { title: "Nothing here", description: "This section has no data to display.", svgPath: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5a2 2 0 012-2h12a2 2 0 012 2z" },
  success:       { title: "All done!", description: "The operation completed successfully.", svgPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
};

// --- Main Factory ---

export function createEmptyState(options: EmptyStateOptions): EmptyStateInstance {
  const opts = {
    variant: options.variant ?? "default",
    compact: options.compact ?? false,
    hideIcon: options.hideIcon ?? false,
    maxWidth: options.maxWidth ?? "360px",
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("EmptyState: container not found");

  const cfg = VARIANT_CONFIG[opts.variant];

  // Root element
  const root = document.createElement("div");
  root.className = `empty-state empty-state-${opts.variant} ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:${opts.compact ? "24px 16px" : "48px 24px"};
    max-width:${opts.maxWidth};margin:0 auto;
    font-family:-apple-system,sans-serif;color:#6b7280;
    animation:es-fade-in-up 0.35s ease-out;
  `;
  container.appendChild(root);

  // Inject keyframe
  if (!document.getElementById("es-fade-style")) {
    const s = document.createElement("style");
    s.id = "es-fade-style";
    s.textContent = "@keyframes es-fade-in-up{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}";
    document.head.appendChild(s);
  }

  // Illustration / Icon
  if (!opts.hideIcon) {
    const iconWrap = document.createElement("div");
    iconWrap.style.cssText = `margin-bottom:${opts.compact ? "12px" : "16px"};color:#d1d5db;`;

    if (options.customIllustration) {
      if (typeof options.customIllustration === "string") {
        iconWrap.innerHTML = options.customIllustration;
      } else {
        iconWrap.appendChild(options.customIllustration);
      }
    } else {
      // Default SVG icon
      const size = opts.compact ? 48 : 72;
      const strokeWidth = opts.compact ? 1.5 : 1.5;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", String(strokeWidth));
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", cfg.svgPath);
      svg.appendChild(path);
      iconWrap.appendChild(svg);
    }

    root.appendChild(iconWrap);
  }

  // Title
  let titleEl: HTMLHeadingElement;
  {
    titleEl = document.createElement("h3");
    titleEl.className = "es-title";
    titleEl.textContent = options.title ?? cfg.title;
    titleEl.style.cssText = `
      font-size:${opts.compact ? "15px" : "17px"};font-weight:600;color:#374151;
      margin:0 0 4px;line-height:1.3;
    `;
    root.appendChild(titleEl);
  }

  // Description
  let descEl: HTMLParagraphElement;
  {
    descEl = document.createElement("p");
    descEl.className = "es-description";
    descEl.textContent = options.description ?? cfg.description;
    descEl.style.cssText = `font-size:${opts.compact ? "12px" : "13px"};margin:0 0 ${options.primaryAction || options.secondaryAction ? "20px" : "0"};line-height:1.5;max-width:320px;margin-left:auto;margin-right:auto;`;
    root.appendChild(descEl);
  }

  // Actions
  if (options.primaryAction || options.secondaryAction) {
    const actionsRow = document.createElement("div");
    actionsRow.style.cssText = "display:flex;gap:10px;justify-content:center;flex-wrap:wrap;";

    if (options.secondaryAction) {
      const btn = createActionButton(options.secondaryAction.label, "secondary");
      btn.addEventListener("click", options.secondaryAction.onClick);
      actionsRow.appendChild(btn);
    }

    if (options.primaryAction) {
      const btn = createActionButton(options.primaryAction.label, "primary");
      btn.addEventListener("click", options.primaryAction.onClick);
      actionsRow.appendChild(btn);
    }

    root.appendChild(actionsRow);
  }

  // Instance
  const instance: EmptyStateInstance = {
    element: root,

    setTitle(title: string) { titleEl.textContent = title; },

    setDescription(desc: string) { descEl.textContent = desc; },

    setVariant(variant: EmptyStateVariant) {
      const newCfg = VARIANT_CONFIG[variant];
      if (!options.title) titleEl.textContent = newCfg.title;
      if (!options.description) descEl.textContent = newCfg.description;
    },

    destroy() { root.remove(); },
  };

  return instance;
}

function createActionButton(label: string, variant: "primary" | "secondary"): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.style.cssText = variant === "primary"
    ? `padding:8px 20px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;font-family:inherit;`
    : `padding:8px 20px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;font-family:inherit;`;

  btn.addEventListener("mouseenter", () => {
    if (variant === "primary") btn.style.background = "#4338ca"; else { btn.style.borderColor = "#9ca3af"; btn.style.color = "#111827"; }
  });
  btn.addEventListener("mouseleave", () => {
    if (variant === "primary") btn.style.background = "#4f46e5"; else { btn.style.borderColor = "#d1d5db"; btn.style.color = "#374151"; }
  });

  return btn;
}
