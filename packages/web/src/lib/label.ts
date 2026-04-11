/**
 * Label: Versatile label/badge/tag component with variants, sizes,
 * dismissibility, icon support, counters, status indicators,
 * and interactive states.
 *
 * Provides:
 *   - Text labels with semantic color variants (default, primary, success, warning, error, info)
 *   - Size variants (xs, sm, md, lg)
 *   - Shape variants (rounded, pill, square)
 *   - Dismissible labels with animation
 *   - Icon + text layout
 *   - Counter badge (notification dot/number)
 *   - Status dot indicator
 *   - Interactive (clickable) labels with keyboard support
 */

// --- Types ---

export type LabelVariant = "default" | "primary" | "success" | "warning" | "error" | "info" | "secondary";
export type LabelSize = "xs" | "sm" | "md" | "lg";
export type LabelShape = "rounded" | "pill" | "square";

export interface LabelOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Label text content */
  text?: string;
  /** Color variant */
  variant?: LabelVariant;
  /** Size */
  size?: LabelSize;
  /** Border shape */
  shape?: LabelShape;
  /** Whether the label can be dismissed */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Click handler (makes label interactive) */
  onClick?: () => void;
  /** Icon HTML string (SVG or character) */
  icon?: string;
  /** Icon position: "left" or "right" (default: "left") */
  iconPosition?: "left" | "right";
  /** Counter number for badges */
  count?: number | null;
  /** Show dot indicator instead of count */
  dot?: boolean;
  /** Maximum count display (e.g., 99+) */
  maxCount?: number;
  /** Status dot color (overrides variant) */
  statusColor?: string;
  /** Custom CSS class */
  className?: string;
  /** Inline style overrides */
  style?: Partial<CSSStyleDeclaration>;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Tooltip text */
  tooltip?: string;
}

export interface LabelInstance {
  /** Root element */
  element: HTMLElement;
  /** Update label text */
  setText: (text: string) => void;
  /** Update variant */
  setVariant: (variant: LabelVariant) => void;
  /** Update count */
  setCount: (count: number | null) => void;
  /** Dismiss programmatically */
  dismiss: () => void;
  /** Check if dismissed */
  isDismissed: () => boolean;
  /** Destroy and remove from DOM */
  destroy: () => void;
}

// --- Variant Config ---

const VARIANT_STYLES: Record<LabelVariant, { bg: string; color: string; border: string }> = {
  default:   { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" },
  primary:   { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  success:   { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  warning:   { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  error:     { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  info:      { bg: "#eff6ff", color: "#0369a1", border: "#bae6fd" },
  secondary: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
};

const SIZE_STYLES: Record<LabelSize, { fontSize: string; padding: string; borderRadius: string }> = {
  xs: { fontSize: "10px", padding: "1px 6px", borderRadius: "4px" },
  sm: { fontSize: "11px", padding: "2px 8px", borderRadius: "4px" },
  md: { fontSize: "12px", padding: "4px 10px", borderRadius: "6px" },
  lg: { fontSize: "14px", padding: "6px 14px", borderRadius: "8px" },
};

const SHAPE_OVERRIDES: Record<LabelShape, (size: LabelSize) => string> = {
  rounded: (_s) => SIZE_STYLES[_s].borderRadius,
  pill:    () => "9999px",
  square:  () => "2px",
};

// --- Main Factory ---

export function createLabel(options: LabelOptions): LabelInstance {
  const opts = {
    variant: "default" as LabelVariant,
    size: "sm" as LabelSize,
    shape: "rounded" as LabelShape,
    iconPosition: "left",
    maxCount: 99,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)
    : options.container;

  if (!container) throw new Error("Label: container not found");

  let dismissed = false;

  // Build root
  const el = document.createElement("span");
  el.className = `label label-${opts.variant} label-${opts.size} ${opts.className ?? ""}`;
  el.setAttribute("role", opts.onClick ? "button" : "status");
  if (opts.ariaLabel) el.setAttribute("aria-label", opts.ariaLabel);

  // Apply styles
  applyStyles(el, opts);

  // Build inner content
  const inner = document.createElement("span");
  inner.className = "label-inner";
  inner.style.cssText = "display:inline-flex;align-items:center;gap:4px;line-height:1;";

  // Icon
  if (opts.icon) {
    const iconEl = document.createElement("span");
    iconEl.className = "label-icon";
    iconEl.innerHTML = opts.icon;
    iconEl.style.cssText = "display:inline-flex;align-items:center;flex-shrink:0;";
    if (opts.iconPosition === "right") {
      inner.appendChild(document.createTextNode(opts.text ?? ""));
      inner.appendChild(iconEl);
    } else {
      inner.appendChild(iconEl);
      inner.appendChild(document.createTextNode(opts.text ?? ""));
    }
  } else {
    inner.textContent = opts.text ?? "";
  }

  el.appendChild(inner);

  // Dismiss button
  let dismissBtn: HTMLElement | null = null;
  if (opts.dismissible) {
    dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.setAttribute("aria-label", "Dismiss");
    dismissBtn.innerHTML = "&times;";
    dismissBtn.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-left:4px;
      border:none;background:transparent;color:currentColor;font-size:14px;line-height:1;cursor:pointer;
      border-radius:50%;opacity:0.6;transition:opacity 0.15s;padding:0;
    `;
    dismissBtn.addEventListener("mouseenter", () => { dismissBtn!.style.opacity = "1"; });
    dismissBtn.addEventListener("mouseleave", () => { dismissBtn!.style.opacity = "0.6"; });
    dismissBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDismiss();
    });
    inner.appendChild(dismissBtn);
  }

  // Counter / Dot
  let counterEl: HTMLElement | null = null;
  if (opts.count !== undefined || opts.dot) {
    counterEl = document.createElement("span");
    counterEl.className = "label-counter";

    if (opts.dot) {
      counterEl.style.cssText = `
        width:6px;height:6px;border-radius:50%;background:${opts.statusColor ?? VARIANT_STYLES[opts.variant].color};
        flex-shrink:0;display:inline-block;
      `;
    } else {
      const displayCount = opts.count !== null && opts.count! > (opts.maxCount ?? 99)
        ? `${opts.maxCount!}+`
        : String(opts.count ?? 0);
      counterEl.textContent = displayCount;
      counterEl.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;
        padding:0 4px;border-radius:8px;font-size:10px;font-weight:600;
        background:${VARIANT_STYLES[opts.variant].color};color:#fff;flex-shrink:0;line-height:1;
      `;
    }
    el.appendChild(counterEl);
  }

  // Tooltip
  if (opts.tooltip) {
    el.title = opts.tooltip;
  }

  // Click handler
  if (opts.onClick) {
    el.style.cursor = "pointer";
    el.tabIndex = 0;
    el.addEventListener("click", () => opts.onClick?.());
    el.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opts.onClick?.(); }
    });
  }

  container.appendChild(el);

  // --- Methods ---

  function applyStyles(target: HTMLElement, o: typeof opts): void {
    const v = VARIANT_STYLES[o.variant];
    const s = SIZE_STYLES[o.size];
    const r = SHAPE_OVERRIDES[o.shape](o.size);

    Object.assign(target.style, {
      display: "inline-flex",
      alignItems: "center",
      fontWeight: "500",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: s.fontSize,
      padding: s.padding,
      borderRadius: r,
      background: v.bg,
      color: v.color,
      border: `1px solid ${v.border}`,
      whiteSpace: "nowrap",
      userSelect: "none",
      transition: "opacity 0.15s, transform 0.15s",
      ...o.style,
    } as CSSStyleDeclaration);
  }

  function handleDismiss(): void {
    if (dismissed) return;
    dismissed = true;
    el.style.opacity = "0";
    el.style.transform = "scale(0.8)";
    setTimeout(() => {
      el.remove();
      opts.onDismiss?.();
    }, 150);
  }

  const instance: LabelInstance = {
    get element() { return el; },

    setText(text: string) {
      if (opts.icon) return; // Text is in a specific node
      inner.textContent = text;
    },

    setVariant(variant: LabelVariant) {
      opts.variant = variant;
      applyStyles(el, opts);
      if (counterEl && !opts.dot) {
        counterEl.style.background = VARIANT_STYLES[variant].color;
      }
    },

    setCount(count: number | null) {
      opts.count = count;
      if (!counterEl) return;
      if (count === null || count === 0) {
        counterEl.style.display = "none";
      } else if (opts.dot) {
        counterEl.style.display = "inline-block";
      } else {
        counterEl.style.display = "";
        counterEl.textContent = count > (opts.maxCount ?? 99) ? `${opts.maxCount!}+` : String(count);
      }
    },

    dismiss: handleDismiss,
    isDismissed: () => dismissed,

    destroy() {
      el.remove();
    },
  };

  return instance;
}
