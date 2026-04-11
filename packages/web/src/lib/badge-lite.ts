/**
 * Lightweight Badge: Small status indicators including dot badges, count badges,
 * status dots, positioned badges (top-right etc.), pulse animation, bordered variant.
 */

// --- Types ---

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "info";
export type BadgeSize = "sm" | "md" | "lg";

export interface DotBadgeOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size */
  size?: BadgeSize;
  /** Show pulse animation? */
  pulse?: boolean;
  /** Bordered ring around dot? */
  bordered?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface CountBadgeOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Count number to display */
  count: number | string;
  /** Max count to display (e.g., 99 shows "99+") */
  maxCount?: number;
  /** Show zero? (default: false hides when 0) */
  showZero?: boolean;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size */
  size?: BadgeSize;
  /** Bordered style */
  bordered?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface StatusDotOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Status type */
  status?: "online" | "offline" | "away" | "busy" | "custom";
  /** Custom color for "custom" status */
  color?: string;
  /** Size in px */
  size?: number;
  /** Label text next to dot */
  label?: string;
  /** Pulse animation for online/away? */
  pulse?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface PositionedBadgeOptions {
  /** Target/anchor element or selector */
  target: HTMLElement | string;
  /** Badge content (number or string) */
  content: string | number;
  /** Position relative to target */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Variant */
  variant?: BadgeVariant;
  /** Hide when content is zero? */
  hideWhenZero?: boolean;
  /** Offset from corner (px) */
  offset?: number;
  /** Custom CSS class */
  className?: string;
}

// --- Config ---

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: "#6b7280", color: "#fff" },
  primary: { bg: "#4f46e5", color: "#fff" },
  success: { bg: "#22c55e", color: "#fff" },
  warning: { bg: "#f59e0b", color: "#fff" },
  error:   { bg: "#ef4444", color: "#fff" },
  info:    { bg: "#3b82f6", color: "#fff" },
};

const SIZE_MAP: Record<BadgeSize, { dot: number; countPx: number; countFs: number; padding: string }> = {
  sm: { dot: 6, countPx: 16, countFs: 10, padding: "1px 5px" },
  md: { dot: 8, countPx: 20, countFs: 11, padding: "2px 7px" },
  lg: { dot: 10, countPx: 24, countFs: 13, padding: "3px 9px" },
};

const STATUS_COLOR_MAP: Record<string, string> = {
  online: "#22c55e",
  offline: "#9ca3af",
  away:   "#f59e0b",
  busy:   "#ef4444",
};

// --- Dot Badge ---

export function createDotBadge(options: DotBadgeOptions): HTMLElement {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    pulse: options.pulse ?? false,
    bordered: options.bordered ?? false,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DotBadge: container not found");

  const sz = SIZE_MAP[opts.size];
  const vc = VARIANT_COLORS[opts.variant];

  const dot = document.createElement("span");
  dot.className = `dot-badge ${opts.className}`;
  dot.style.cssText = `
    display:inline-block;width:${sz.dot}px;height:${sz.dot}px;border-radius:50%;
    background:${vc.bg};flex-shrink:0;
    ${opts.bordered ? `border:2px solid #fff;box-shadow:0 0 0 1px ${vc.bg};` : ""}
    ${opts.pulse ? `animation:badge-pulse 2s ease-in-out infinite;` : ""}
  `;
  container.appendChild(dot);

  // Inject keyframe
  injectPulseStyle();

  return dot;
}

// --- Count Badge ---

export function createCountBadge(options: CountBadgeOptions): HTMLElement {
  const opts = {
    maxCount: options.maxCount ?? 99,
    showZero: options.showZero ?? false,
    variant: options.variant ?? "error",
    size: options.size ?? "sm",
    bordered: options.bordered ?? true,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CountBadge: container not found");

  const sz = SIZE_MAP[opts.size];
  const vc = VARIANT_COLORS[opts.variant];

  const badge = document.createElement("span");
  badge.className = `count-badge ${opts.className}`;
  updateBadgeContent(badge, options.count);

  badge.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    min-width:${sz.countPx}px;height:${sz.countPx};
    border-radius:${sz.countPx / 2 + 2}px;padding:${sz.padding};
    font-size:${sz.countFs}px;font-weight:600;line-height:1;
    background:${vc.bg};color:${vc.color};
    font-family:-apple-system,sans-serif;
    ${opts.bordered ? `border:2px solid #fff;box-shadow:0 0 0 1px ${vc.bg};` : ""}
    white-space:nowrap;
  `;
  container.appendChild(badge);

  function updateBadgeContent(el: HTMLElement, count: number | string): void {
    const numVal = typeof count === "number" ? count : parseInt(String(count), 10);
    if (!opts.showZero && numVal === 0) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    if (typeof count === "number" && count > opts.maxCount) {
      el.textContent = `${opts.maxCount}+`;
    } else {
      el.textContent = String(count);
    }
  }

  // Return extended element with update method
  (badge as any).setCount = (c: number | string) => updateBadgeContent(badge, c);
  return badge;
}

// --- Status Dot ---

export function createStatusDot(options: StatusDotOptions): HTMLElement {
  const opts = {
    status: options.status ?? "online",
    size: options.size ?? 8,
    pulse: options.pulse ?? true,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("StatusDot: container not found");

  const wrapper = document.createElement("span");
  wrapper.className = `status-dot-wrapper ${opts.className}`;
  wrapper.style.cssText = "display:inline-flex;align-items:center;gap:6px;font-family:-apple-system,sans-serif;font-size:13px;color:#374151;";

  const dotColor = options.color ?? STATUS_COLOR_MAP[opts.status] ?? STATUS_COLOR_MAP.offline;

  const dot = document.createElement("span");
  dot.className = "status-dot";
  dot.style.cssText = `
    display:inline-block;width:${opts.size}px;height:${opts.size}px;border-radius:50%;
    background:${dotColor};flex-shrink:0;
    ${(opts.pulse && (opts.status === "online" || opts.status === "away"))
      ? "animation:badge-pulse 2s ease-in-out infinite;"
      : ""}
    ${opts.status === "offline" ? "opacity:0.5;" : ""}
  `;
  wrapper.appendChild(dot);

  if (options.label) {
    const label = document.createElement("span");
    label.textContent = options.label;
    label.style.color = "#6b7280";
    label.style.fontSize = "12px";
    wrapper.appendChild(label);
  }

  container.appendChild(wrapper);
  injectPulseStyle();

  return wrapper;
}

// --- Positioned Badge ---

export function addPositionedBadge(options: PositionedBadgeOptions): () => void {
  const target = typeof options.target === "string"
    ? document.querySelector<HTMLElement>(options.target)!
    : options.target;

  if (!target) throw new Error("PositionedBadge: target not found");

  const opts = {
    position: options.position ?? "top-right",
    variant: options.variant ?? "error",
    hideWhenZero: options.hideWhenZero ?? true,
    offset: options.offset ?? -2,
    className: options.className ?? "",
  };

  const vc = VARIANT_COLORS[opts.variant];

  const badge = document.createElement("span");
  badge.className = `positioned-badge ${opts.className}`;
  badge.textContent = String(options.content);
  badge.style.cssText = `
    position:absolute;display:inline-flex;align-items:center;justify-content:center;
    min-width:18px;height:18px;border-radius:9px;
    padding:1px 6px;font-size:11px;font-weight:600;line-height:1;
    background:${vc.bg};color:${vc.color};
    font-family:-apple-system,sans-serif;
    border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.15);
    white-space:nowrap;z-index:10;
    pointer-events:none;
  `;

  // Position
  switch (opts.position) {
    case "top-right":
      badge.style.top = `${opts.offset}px`;
      badge.style.right = `${opts.offset}px`;
      break;
    case "top-left":
      badge.style.top = `${opts.offset}px`;
      badge.style.left = `${opts.offset}px`;
      break;
    case "bottom-right":
      badge.style.bottom = `${opts.offset}px`;
      badge.style.right = `${opts.offset}px`;
      break;
    case "bottom-left":
      badge.style.bottom = `${opts.offset}px`;
      badge.style.left = `${opts.offset}px`;
      break;
  }

  // Ensure target is positioned
  const computed = getComputedStyle(target);
  if (computed.position === "static") {
    target.style.position = "relative";
  }

  // Hide if zero
  const numVal = Number(options.content);
  if (opts.hideWhenZero && isNaN(numVal) === false && numVal === 0) {
    badge.style.display = "none";
  }

  target.appendChild(badge);

  // Return cleanup function
  return () => badge.remove();
}

/** Quick helper: add a dot badge to an element */
export function addDotBadge(
  target: HTMLElement | string,
  variant: BadgeVariant = "default",
): HTMLElement {
  const el = typeof target === "string"
    ? document.querySelector<HTMLElement>(target)!
    : target;
  return createDotBadge({ container: el, variant });
}

/** Quick helper: add a count badge to an element */
export function addCountBadge(
  target: HTMLElement | string,
  count: number | string,
  maxCount = 99,
): HTMLElement {
  const el = typeof target === "string"
    ? document.querySelector<HTMLElement>(target)!
    : target;
  return createCountBadge({ container: el, count, maxCount });
}

// --- Internal ---

function injectPulseStyle(): void {
  if (document.getElementById("badge-pulse-style")) return;
  const s = document.createElement("style");
  s.id = "badge-pulse-style";
  s.textContent = "@keyframes badge-pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}";
  document.head.appendChild(s);
}
