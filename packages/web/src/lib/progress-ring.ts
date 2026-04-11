/**
 * Progress Ring: SVG-based circular progress indicator with animated arc,
 * multiple ring layers, gradient support, labels, size variants,
 * and smooth value transitions.
 */

// --- Types ---

export type ProgressRingVariant = "default" | "gradient" | "segmented" | "dashed";
export type ProgressRingSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ProgressRingOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Current progress value (0-100) */
  value?: number;
  /** Ring diameter (px) - overrides size variant */
  size?: number;
  /** Size variant */
  sizeVariant?: ProgressRingSize;
  /** Stroke width (px) */
  strokeWidth?: number;
  /** Ring color (single color or array for gradient) */
  color?: string | string[];
  /** Track/background color */
  trackColor?: string;
  /** Line cap style */
  lineCap?: "round" | "butt" | "square";
  /** Visual variant */
  variant?: ProgressRingVariant;
  /** Animation duration (ms) for value changes */
  animationDuration?: number;
  /** Show center label? */
  showLabel?: boolean;
  /** Label format function */
  labelFormat?: (value: number) => string;
  /** Label font size (px) */
  labelFontSize?: number;
  /** Secondary/inner ring value (for dual-ring display) */
  secondaryValue?: number;
  /** Secondary ring color */
  secondaryColor?: string;
  /** Clockwise or counter-clockwise */
  clockwise?: boolean;
  /** Start angle offset (degrees, 0 = top) */
  startAngle?: number;
  /** Custom CSS class */
  className?: string;
}

export interface ProgressRingInstance {
  element: SVGElement;
  /** Set progress value (0-100) with optional animation */
  setValue: (value: number) => void;
  /** Get current value */
  getValue: () => number;
  /** Animate from current value to target */
  animateTo: (target: number, duration?: number) => void;
  /** Set secondary ring value */
  setSecondaryValue: (value: number) => void;
  /** Update color(s) */
  setColor: (color: string | string[]) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<ProgressRingSize, { diameter: number; stroke: number }> = {
  xs: { diameter: 32, stroke: 3 },
  sm: { diameter: 48, stroke: 4 },
  md: { diameter: 80, stroke: 6 },
  lg: { diameter: 120, stroke: 8 },
  xl: { diameter: 160, stroke: 10 },
};

// --- Helpers ---

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number, cy: number, r: number,
  startAngleDeg: number, endAngleDeg: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngleDeg);
  const end = polarToCartesian(cx, cy, r, startAngleDeg);
  const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// --- Main Factory ---

export function createProgressRing(options: ProgressRingOptions): ProgressRingInstance {
  const opts = {
    value: options.value ?? 0,
    size: options.size,
    sizeVariant: options.sizeVariant ?? "md",
    strokeWidth: options.strokeWidth,
    color: options.color ?? "#6366f1",
    trackColor: options.trackColor ?? "#e5e7eb",
    lineCap: options.lineCap ?? "round",
    variant: options.variant ?? "default",
    animationDuration: options.animationDuration ?? 600,
    showLabel: options.showLabel ?? false,
    labelFormat: options.labelFormat ?? ((v: number) => `${Math.round(v)}%`),
    labelFontSize: options.labelFontSize,
    secondaryValue: options.secondaryValue,
    secondaryColor: options.secondaryColor ?? "#c7d2fe",
    clockwise: options.clockwise ?? true,
    startAngle: options.startAngle ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ProgressRing: container not found");

  // Resolve dimensions
  const sz = SIZE_MAP[opts.sizeVariant];
  const diameter = opts.size ?? sz.diameter;
  const stroke = opts.strokeWidth ?? sz.stroke;
  const radius = (diameter - stroke) / 2;
  const cx = diameter / 2;
  const cy = diameter / 2;
  const circumference = 2 * Math.PI * radius;

  let currentValue = Math.max(0, Math.min(100, opts.value));
  let secondaryVal = opts.secondaryValue !== undefined ? Math.max(0, Math.min(100, opts.secondaryValue)) : undefined;
  let destroyed = false;
  let animFrame: number | null = null;

  // Create SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", `progress-ring pr-${opts.variant} ${opts.className}`);
  svg.setAttribute("viewBox", `0 0 ${diameter} ${diameter}`);
  svg.style.cssText = `
    width:${diameter}px;height:${diameter}px;display:block;
    overflow:visible;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(svg);

  // Defs for gradients
  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  let gradientId: string | null = null;
  if (Array.isArray(opts.color) && opts.color.length > 1) {
    gradientId = `pr-gradient-${Date.now()}`;
    const grad = document.createElementNS(ns, "linearGradient");
    grad.setAttribute("id", gradientId);
    grad.setAttribute("x1", "0%");
    grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "100%");
    grad.setAttribute("y2", "100%");
    opts.color.forEach((c, i) => {
      const stop = document.createElementNS(ns, "stop");
      stop.setAttribute("offset", `${(i / (opts.color!.length - 1)) * 100}%`);
      stop.setAttribute("stop-color", c);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
  }

  const resolvedColor = Array.isArray(opts.color)
    ? (gradientId ? `url(#${gradientId})` : opts.color[0] ?? "#6366f1")
    : opts.color;

  // Track circle (background)
  const track = document.createElementNS(ns, "circle");
  track.setAttribute("class", "pr-track");
  track.setAttribute("cx", String(cx));
  track.setAttribute("cy", String(cy));
  track.setAttribute("r", String(radius));
  track.setAttribute("fill", "none");
  track.setAttribute("stroke", opts.trackColor);
  track.setAttribute("stroke-width", String(stroke));
  svg.appendChild(track);

  // Progress arc
  const progress = document.createElementNS(ns, "path");
  progress.setAttribute("class", "pr-progress");
  progress.setAttribute("fill", "none");
  progress.setAttribute("stroke", resolvedColor);
  progress.setAttribute("stroke-width", String(stroke));
  progress.setAttribute("stroke-linecap", opts.lineCap);
  if (opts.variant === "dashed") {
    progress.setAttribute("stroke-dasharray", `${circumference * 0.03} ${circumference * 0.02}`);
  }
  svg.appendChild(progress);

  // Secondary ring (inner, thinner)
  let secondaryPath: SVGPathElement | null = null;
  if (secondaryVal !== undefined) {
    const secRadius = radius - stroke - 4;
    secondaryPath = document.createElementNS(ns, "path");
    secondaryPath.setAttribute("class", "pr-secondary");
    secondaryPath.setAttribute("fill", "none");
    secondaryPath.setAttribute("stroke", opts.secondaryColor);
    secondaryPath.setAttribute("stroke-width", String(Math.max(2, stroke - 3)));
    secondaryPath.setAttribute("stroke-linecap", "round");
    svg.appendChild(secondaryPath);
  }

  // Center label
  let labelEl: SVGTextElement | null = null;
  if (opts.showLabel) {
    labelEl = document.createElementNS(ns, "text");
    labelEl.setAttribute("class", "pr-label");
    labelEl.setAttribute("x", String(cx));
    labelEl.setAttribute("y", String(cy));
    labelEl.setAttribute("text-anchor", "middle");
    labelEl.setAttribute("dominant-baseline", "central");
    labelEl.style.cssText = `
      font-size:${opts.labelFontSize ?? Math.max(12, diameter * 0.18)}px;
      font-weight:700;color:#374151;fill:#374151;
      user-select:none;-webkit-user-select:none;
    `;
    labelEl.textContent = opts.labelFormat(currentValue);
    svg.appendChild(labelEl);
  }

  // Segmented variant: overlay segment dividers
  if (opts.variant === "segmented") {
    const segments = 20;
    for (let i = 1; i < segments; i++) {
      const angle = (i / segments) * 360;
      const p1 = polarToCartesian(cx, cy, radius - stroke / 2 - 1, angle);
      const p2 = polarToCartesian(cx, cy, radius + stroke / 2 + 1, angle);
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", String(p1.x));
      line.setAttribute("y1", String(p1.y));
      line.setAttribute("x2", String(p2.x));
      line.setAttribute("y2", String(p2.y));
      line.setAttribute("stroke", "#fff");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("opacity", "0.8");
      svg.appendChild(line);
    }
  }

  // --- Render ---

  function renderArc(value: number, el: SVGPathElement, r: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    if (clamped <= 0) {
      el.setAttribute("d", "");
      return;
    }
    const endAngle = opts.clockwise
      ? opts.startAngle + (clamped / 100) * 360
      : opts.startAngle - (clamped / 100) * 360;
    const d = describeArc(cx, cy, r, opts.startAngle, endAngle);
    el.setAttribute("d", d);
  }

  function updateDisplay(): void {
    renderArc(currentValue, progress, radius);
    if (labelEl) labelEl.textContent = opts.labelFormat(currentValue);
    if (secondaryPath && secondaryVal !== undefined && secondaryPath) {
      const secR = radius - stroke - 4;
      renderArc(secondaryVal, secondaryPath, secR > 0 ? secR : radius * 0.6);
    }
  }

  updateDisplay();

  // --- Instance ---

  const instance: ProgressRingInstance = {
    element: svg,

    getValue() { return currentValue; },

    setValue(value: number) {
      currentValue = Math.max(0, Math.min(100, value));
      updateDisplay();
    },

    animateTo(target: number, duration?: number) {
      if (animFrame !== null) cancelAnimationFrame(animFrame);
      const start = currentValue;
      const end = Math.max(0, Math.min(100, target));
      const dur = duration ?? opts.animationDuration;
      const startTime = performance.now();

      function tick(now: number): void {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / dur, 1);
        const eased = easeOutCubic(t);
        currentValue = start + (end - start) * eased;
        updateDisplay();
        if (t < 1) {
          animFrame = requestAnimationFrame(tick);
        } else {
          currentValue = end;
          updateDisplay();
          animFrame = null;
        }
      }
      animFrame = requestAnimationFrame(tick);
    },

    setSecondaryValue(value: number) {
      secondaryVal = Math.max(0, Math.min(100, value));
      if (!secondaryPath && value !== undefined) {
        const secR = radius - stroke - 4;
        secondaryPath = document.createElementNS(ns, "path");
        secondaryPath.setAttribute("class", "pr-secondary");
        secondaryPath.setAttribute("fill", "none");
        secondaryPath.setAttribute("stroke", opts.secondaryColor);
        secondaryPath.setAttribute("stroke-width", String(Math.max(2, stroke - 3)));
        secondaryPath.setAttribute("stroke-linecap", "round");
        svg.insertBefore(secondaryPath, labelEl ?? progress.nextSibling);
      }
      updateDisplay();
    },

    setColor(color: string | string[]) {
      // Rebuild gradient if needed
      defs.innerHTML = "";
      if (Array.isArray(color) && color.length > 1) {
        const newGradId = `pr-gradient-${Date.now()}`;
        const grad = document.createElementNS(ns, "linearGradient");
        grad.setAttribute("id", newGradId);
        grad.setAttribute("x1", "0%");
        grad.setAttribute("y1", "0%");
        grad.setAttribute("x2", "100%");
        grad.setAttribute("y2", "100%");
        color.forEach((c, i) => {
          const stop = document.createElementNS(ns, "stop");
          stop.setAttribute("offset", `${(i / (color.length - 1)) * 100}%`);
          stop.setAttribute("stop-color", c);
          grad.appendChild(stop);
        });
        defs.appendChild(grad);
        progress.setAttribute("stroke", `url(#${newGradId})`);
      } else {
        const singleColor = Array.isArray(color) ? color[0] ?? "#6366f1" : color;
        progress.setAttribute("stroke", singleColor);
      }
      opts.color = color;
    },

    destroy() {
      destroyed = true;
      if (animFrame !== null) cancelAnimationFrame(animFrame);
      svg.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
