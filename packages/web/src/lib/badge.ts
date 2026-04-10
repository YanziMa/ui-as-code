/**
 * Badge Component: Dot badges, count badges, status indicators,
 * icon badges, positioning variants (top-right, etc.), sizing,
 * max value display, and animation.
 */

// --- Types ---

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "info";
export type BadgePosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeOptions {
  /** Content: number for count badge, string for text, empty for dot */
  content?: number | string;
  /** Color variant */
  variant?: BadgeVariant;
  /** Size */
  size?: BadgeSize;
  /** Maximum count to display (default: 99) */
  maxCount?: number;
  /** Show zero? (default: false) */
  showZero?: boolean;
  /** Custom color override */
  color?: string;
  /** Text color */
  textColor?: string;
  /** Dot mode (no text, just a circle) */
  dot?: boolean;
  /** Pulse/dot animation */
  pulse?: boolean;
  /** Border around badge */
  bordered?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Offset from anchor in px */
  offset?: { x?: number; y?: number };
}

export interface StatusDotOptions {
  /** Status type */
  status: "online" | "offline" | "away" | "busy" | "unknown";
  /** Size in px (default: 8) */
  size?: number;
  /** Show label text */
  label?: string;
  /** Label position */
  labelPosition?: "right" | "left" | "bottom";
  /** Pulse animation for online status */
  animate?: boolean;
}

// --- Variant Colors ---

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  default:   { bg: "#6b7280", color: "#fff" },
  primary:   { bg: "#3b82f6", color: "#fff" },
  success:   { bg: "#22c55e", color: "#fff" },
  warning:   { bg: "#f59e0b", color: "#fff" },
  error:     { bg: "#ef4444", color: "#fff" },
  info:      { bg: "#06b6d4", color: "#fff" },
};

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  offline: "#9ca3af",
  away: "#f59e0b",
  busy: "#ef4444",
  unknown: "#d1d5db",
};

const SIZE_MAP: Record<BadgeSize, { fontSize: number; paddingX: number; paddingY: number; minWidth: number }> = {
  sm: { fontSize: 10, paddingX: 4, paddingY: 1,  minWidth: 16 },
  md: { fontSize: 11, paddingX: 5, paddingY: 2, minWidth: 18 },
  lg: { fontSize: 12, paddingX: 7, paddingY: 3, minWidth: 22 },
};

// --- CSS Injection ---

let badgeStylesInjected = false;

function injectBadgeStyles(): void {
  if (badgeStylesInjected || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.id = "badge-styles";
  style.textContent = `
    @keyframes badge-pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }
    .badge-pulse::after {
      content:"";position:absolute;inset:0;border-radius:inherit;
      background:inherit;animation:badge-pulse 1.5s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
  badgeStylesInjected = true;
}

// --- Badge ---

/**
 * Create a badge element.
 */
export function createBadge(options: BadgeOptions = {}): HTMLElement {
  injectBadgeStyles();

  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    maxCount: options.maxCount ?? 99,
    showZero: options.showZero ?? false,
    dot: options.dot ?? false,
    pulse: options.pulse ?? false,
    bordered: options.bordered ?? false,
    className: options.className ?? "",
    offset: options.offset ?? {},
  };

  const el = document.createElement("span");
  el.className = `badge badge-${opts.variant} badge-${opts.size} ${opts.className}`;

  // Determine display content
  let displayContent: string = "";
  const isNumber = typeof options.content === "number";

  if (opts.dot || options.content === undefined) {
    // Dot mode
    el.setAttribute("role", "status");
    el.style.cssText = buildDotStyle(opts);
  } else if (isNumber) {
    const count = options.content as number;
    if (count === 0 && !opts.showZero) {
      el.style.display = "none";
    } else {
      displayContent = count > opts.maxCount ? `${opts.maxCount}+` : String(count);
    }
    el.setAttribute("role", "status");
    el.textContent = displayContent;
    el.style.cssText = buildCountStyle(displayContent, opts);
  } else {
    displayContent = String(options.content);
    el.textContent = displayContent;
    el.style.cssText = buildCountStyle(displayContent, opts);
  }

  // Pulse animation
  if (opts.pulse && (opts.dot || isNumber)) {
    el.classList.add("badge-pulse");
  }

  return el;
}

function buildDotStyle(opts: Required<Pick<BadgeOptions, "variant" | "size" | "color" | "bordered">> & { dot: boolean }): string {
  const sizeMap: Record<BadgeSize, number> = { sm: 6, md: 8, lg: 10 };
  const px = sizeMap[opts.size];
  const bg = opts.color ?? VARIANT_STYLES[opts.variant].bg;

  return `
    display:inline-flex;align-items:center;justify-content:center;
    width:${px}px;height:${px}px;border-radius:50%;
    background:${bg};${opts.bordered ? `border:2px solid #fff;box-sizing:border-box;` : ""}
    flex-shrink:0;
  `;
}

function buildCountStyle(content: string, opts: Required<Pick<BadgeOptions, "variant" | "size" | "color" | "textColor" | "bordered">>): string {
  const sz = SIZE_MAP[opts.size];
  const bg = opts.color ?? VARIANT_STYLES[opts.variant].bg;
  const color = opts.textColor ?? VARIANT_STYLES[opts.variant].color;

  return `
    display:inline-flex;align-items:center;justify-content:center;
    font-size:${sz.fontSize}px;font-weight:600;line-height:1;
    padding:${sz.paddingY}px ${sz.paddingX}px;min-width:${sz.minWidth}px;
    height:${sz.minWidth}px;border-radius:${sz.minWidth / 2}px;
    background:${bg};color:${color};
    white-space:nowrap;font-family:-apple-system,sans-serif;
    ${opts.bordered ? `border:2px solid #fff;box-sizing:border-box;` : ""}
    flex-shrink:0;
  `;
}

// --- Positioned Badge (attached to an element) ---

/**
 * Create a badge positioned relative to an anchor element.
 */
export function createPositionedBadge(
  anchor: HTMLElement,
  options: BadgeOptions & { position?: BadgePosition } = {},
): { badge: HTMLElement; update: (newOpts: Partial<BadgeOptions>) => void; destroy: () => void } {
  const position = options.position ?? "top-right";

  // Ensure anchor has positioning
  const computed = getComputedStyle(anchor);
  if (computed.position === "static") {
    anchor.style.position = "relative";
  }

  const badge = createBadge(options);

  // Position the badge
  const posStyles: Record<BadgePosition, string> = {
    "top-right":    "position:absolute;top:-4px;right:-4px;",
    "top-left":     "position:absolute;top:-4px;left:-4px;",
    "bottom-right": "position:absolute;bottom:-4px;right:-4px;",
    "bottom-left":  "position:absolute;bottom:-4px;left:-4px;",
  };

  badge.style.cssText += posStyles[position];
  const offsetX = options.offset?.x ?? 0;
  const offsetY = options.offset?.y ?? 0;
  if (offsetX !== 0) badge.style.marginLeft = `${offsetX}px`;
  if (offsetY !== 0) badge.style.marginTop = `${offsetY}px`;

  anchor.appendChild(badge);

  return {
    badge,
    update(newOpts) {
      const newBadge = createBadge({ ...options, ...newOpts });
      badge.replaceWith(newBadge);
      (this as any).badge = newBadge;
    },
    destroy() { badge.remove(); },
  };
}

// --- Status Dot ---

/**
 * Create a status indicator dot with optional label.
 */
export function createStatusDot(options: StatusDotOptions): HTMLElement {
  const size = options.size ?? 8;
  const color = STATUS_COLORS[options.status] ?? STATUS_COLORS.unknown;

  const container = document.createElement("span");
  container.className = `status-dot status-${options.status}`;
  container.style.cssText = "display:inline-flex;align-items:center;gap:6px;";

  const dot = document.createElement("span");
  dot.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};flex-shrink:0;display:inline-block;
    ${options.animate && options.status === "online"
      ? `box-shadow:0 0 0 0 ${color}40;animation:status-dot-pulse 2s ease-in-out infinite;`
      : ""}
  `;
  container.appendChild(dot);

  if (options.label) {
    const label = document.createElement("span");
    label.textContent = options.label;
    label.style.cssText = "font-size:13px;color:#555;";
    if (options.labelPosition === "bottom") {
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.gap = "2px";
    } else if (options.labelPosition === "left") {
      container.style.flexDirection = "row-reverse";
    }
    container.appendChild(label);
  }

  return container;
}

// --- Quick Helpers ---

/** Create a simple dot badge on an element */
export function addDotBadge(
  element: HTMLElement,
  variant: BadgeVariant = "default",
  position: BadgePosition = "top-right",
): () => void {
  const result = createPositionedBadge(element, { variant, dot: true, position });
  return result.destroy;
}

/** Create a count badge on an element */
export function addCountBadge(
  element: HTMLElement,
  count: number,
  options?: Partial<BadgeOptions>,
): { setCount: (n: number) => void; destroy: () => void } {
  const result = createPositionedBadge(element, { content: count, ...options });
  return {
    setCount(n) { result.update({ content: n }); },
    destroy: result.destroy,
  };
}
