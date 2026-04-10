/**
 * Progress Bar: Determinate/indeterminate progress with multiple variants
 * (line, circle, buffer), animation, labels, step markers, and
 * accessibility support.
 */

// --- Types ---

export type ProgressVariant = "default" | "primary" | "success" | "warning" | "error";
export type ProgressSize = "xs" | "sm" | "md" | "lg";

export interface ProgressBarOptions {
  /** Current progress (0-100) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Visual variant */
  variant?: ProgressVariant;
  /** Size */
  size?: ProgressSize;
  /** Show percentage text label? */
  showLabel?: boolean;
  /** Custom label text (overrides percentage) */
  label?: string;
  /** Height for line bar (px) */
  height?: number | string;
  /** Width (CSS value, default: "100%") */
  width?: string;
  /** Border radius */
  borderRadius?: number | string;
  /** Animation duration in ms (default: 300) */
  animationDuration?: number;
  /** Indeterminate mode? */
  indeterminate?: boolean;
  /** Buffer value (for buffer bars, e.g., streaming progress) */
  bufferValue?: number;
  /** Step markers at specific percentages */
  steps?: number[];
  /** Custom CSS class */
  className?: string;
  /** Role attribute override */
  role?: string;
  /** ARIA valuemin */
  min?: number;
}

export interface CircleProgressOptions extends Omit<ProgressBarOptions, "height" | "width"> {
  /** Diameter in px (default: 80) */
  size?: number;
  /** Stroke width (px) */
  strokeWidth?: number;
  /** Track color (background ring) */
  trackColor?: string;
  /** Show inner text (percentage or custom) */
  innerText?: boolean | string;
  /** Font size for inner text */
  textSize?: number;
  /** Line cap style: "round" or "butt" */
  lineCap?: "round" | "butt";
}

// --- Color Maps ---

const VARIANT_COLORS: Record<ProgressVariant, { fill: string; bg: string }> = {
  default:  { fill: "#3b82f6", bg: "#e5e7eb" },
  primary:  { fill: "#6366f1", bg: "#e0e0ff" },
  success:  { fill: "#22c55e", bg: "#dcfce7" },
  warning:  { fill: "#f59e0b", bg: "#fef3c7" },
  error:    { fill: "#ef4444", bg: "#fee2e2" },
};

const SIZE_HEIGHTS: Record<ProgressSize, number> = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
};

// --- Line Progress Bar ---

export function createProgressBar(options: ProgressBarOptions): HTMLElement {
  const opts = {
    max: options.max ?? 100,
    variant: options.variant ?? "primary",
    size: options.size ?? "md",
    showLabel: options.showLabel ?? false,
    height: options.height ?? SIZE_HEIGHTS[opts.size ?? "md"]!,
    width: options.width ?? "100%",
    borderRadius: options.borderRadius ?? (typeof opts.height === "number" ? opts.height / 2 : 9999),
    animationDuration: options.animationDuration ?? 300,
    indeterminate: options.indeterminate ?? false,
    className: options.className ?? "",
    role: options.role ?? "progressbar",
    min: options.min ?? 0,
  };

  const pct = Math.min(100, Math.max(0, (opts.value / opts.max) * 100));
  const colors = VARIANT_COLORS[opts.variant];

  const container = document.createElement("div");
  container.className = `progress-bar progress-${opts.variant} ${opts.className}`;
  container.setAttribute("role", opts.role);
  container.setAttribute("aria-valuenow", String(Math.round(opts.value)));
  container.setAttribute("aria-valuemin", String(opts.min));
  container.setAttribute("aria-valuemax", String(opts.max));
  if (!opts.indeterminate) container.setAttribute("aria-label", `${Math.round(pct)}%`);

  container.style.cssText = `
    display:flex;align-items:center;gap:8px;width:${opts.width};
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;color:#555;
  `;

  // Track
  const track = document.createElement("div");
  track.className = "progress-track";
  track.style.cssText = `
    flex:1;position:relative;height:${typeof opts.height === "number" ? `${opts.height}px` : opts.height};
    background:${colors.bg};border-radius:${typeof opts.borderRadius === "number" ? `${opts.borderRadius}px` : opts.borderRadius};
    overflow:hidden;
  `;

  // Fill
  const fill = document.createElement("div");
  fill.className = "progress-fill";

  if (opts.indeterminate) {
    fill.style.cssText = `
      position:absolute;top:0;left:0;height:100%;width:30%;
      background:${colors.fill};border-radius:inherit;
      animation:progress-indeterminate ${opts.animationDuration}ms linear infinite;
    `;
  } else {
    fill.style.cssText = `
      height:100%;width:${pct}%;background:${colors.fill};
      border-radius:inherit;transition:width ${opts.animationDuration}ms ease;
    `;
  }

  // Buffer (if specified)
  if (options.bufferValue != null && !opts.indeterminate) {
    const bufPct = Math.min(100, Math.max(0, (options.bufferValue / opts.max) * 100));
    const buffer = document.createElement("div");
    buffer.className = "progress-buffer";
    buffer.style.cssText = `
      position:absolute;top:0;left:0;height:100%;width:${bufPct}%;
      background:rgba(59,130,246,0.15);border-radius:inherit;
    `;
    track.appendChild(buffer);
  }

  // Step markers
  if (options.steps?.length) {
    for (const step of options.steps) {
      const marker = document.createElement("div");
      marker.className = "progress-step-marker";
      const stepPct = Math.min(100, Math.max(0, step));
      marker.style.cssText = `
        position:absolute;left:${stepPct}%;top:50%;transform:translate(-50%,-50%);
        width:4px;height:16px;border-radius:2px;background:#fff;border:1px solid #d1d5db;z-index:1;
      `;
      if (stepPct <= pct) {
        marker.style.background = colors.fill;
        marker.style.borderColor = colors.fill;
      }
      track.appendChild(marker);
    }
  }

  track.appendChild(fill);
  container.appendChild(track);

  // Label
  if (opts.showLabel || opts.label) {
    const labelText = document.createElement("span");
    labelText.className = "progress-label";
    labelText.textContent = opts.label ?? `${Math.round(pct)}%`;
    labelText.style.cssText = "white-space:nowrap;min-width:32px;text-align:right;";
    container.appendChild(labelText);
  }

  return container;
}

// --- Circular Progress ---

export function createCircleProgress(options: CircleProgressOptions): HTMLElement {
  const opts = {
    ...options,
    size: options.size ?? 80,
    strokeWidth: options.strokeWidth ?? 6,
    trackColor: options.trackColor ?? "#e5e7eb",
    lineCap: options.lineCap ?? "round",
    textSize: options.textSize ?? 14,
    variant: options.variant ?? "primary",
    max: options.max ?? 100,
    innerText: options.innerText ?? false,
  };

  const pct = Math.min(100, Math.max(0, (opts.value / opts.max) * 100));
  const colors = VARIANT_COLORS[opts.variant];
  const radius = (opts.size - opts.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.size} ${opts.size}`);
  svg.setAttribute("role", "progressbar");
  svg.setAttribute("aria-valuenow", String(Math.round(opts.value)));
  svg.setAttribute("aria-valuemin", "0");
  svg.setAttribute("aria-valuemax", String(opts.max));
  svg.style.width = `${opts.size}px`;
  svg.style.height = `${opts.size}px`;
  svg.style.display = "block";

  // Background track
  const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  track.setAttribute("cx", String(opts.size / 2));
  track.setAttribute("cy", String(opts.size / 2));
  track.setAttribute("r", String(radius));
  track.setAttribute("fill", "none");
  track.setAttribute("stroke", opts.trackColor);
  track.setAttribute("stroke-width", String(opts.strokeWidth));

  // Foreground arc
  const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  arc.setAttribute("cx", String(opts.size / 2));
  arc.setAttribute("cy", String(opts.size / 2));
  arc.setAttribute("r", String(radius));
  arc.setAttribute("fill", "none");
  arc.setAttribute("stroke", colors.fill);
  arc.setAttribute("stroke-width", String(opts.strokeWidth));
  arc.setAttribute("stroke-linecap", opts.lineCap);

  if (options.indeterminate) {
    arc.style.setProperty("animation", "circle-rotate 1s linear infinite");
  } else {
    const dashOffset = circumference - (circumference * pct) / 100;
    arc.setAttribute("stroke-dasharray", `${circumference}`);
    arc.setAttribute("stroke-dashoffset", String(dashOffset));
    arc.style.transition = `stroke-dashoffset ${opts.animationDuration ?? 300}ms ease`;
  }

  svg.appendChild(track);
  svg.appendChild(arc);

  // Inner text
  if (opts.innerText) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(opts.size / 2));
    text.setAttribute("y", String(opts.size / 2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-size", String(opts.textSize));
    text.setAttribute("font-weight", "600");
    text.setAttribute("fill", colors.fill);
    text.textContent = typeof opts.innerText === "string"
      ? opts.innerText
      : `${Math.round(pct)}%`;
    svg.appendChild(text);
  }

  return svg as unknown as HTMLElement;
}

// --- Indeterminate Styles Injection ---

let progressStylesInjected = false;

function injectProgressStyles(): void {
  if (progressStylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "progress-styles";
  style.textContent = `
    @keyframes progress-indeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    @keyframes circle-rotate {
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  progressStylesInjected = true;
}

// --- Auto-inject on first use ---

if (typeof document !== "undefined") injectProgressStyles();
