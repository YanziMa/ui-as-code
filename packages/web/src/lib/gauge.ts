/**
 * Gauge: SVG/Canvas-based gauge and meter components with animations,
 * thresholds, labels, and multiple display styles.
 */

// --- Types ---

export type GaugeType = "arc" | "linear" | "semicircle" | "radial" | "bullet";

export interface GaugeThreshold {
  /** Value where this threshold starts */
  value: number;
  /** Color for this range */
  color: string;
  /** Label */
  label?: string;
}

export interface GaugeOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Gauge type */
  type?: GaugeType;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Current value */
  value?: number;
  /** Target/value to compare against (for bullet gauges) */
  target?: number;
  /** Width in px (default: 200) */
  width?: number;
  /** Height in px (default: auto-calculated) */
  height?: number;
  /** Stroke width / bar thickness */
  strokeWidth?: number;
  /** Primary color */
  color?: string;
  /** Background/track color */
  trackColor?: string;
  /** Text color */
  textColor?: string;
  /** Font size for labels */
  fontSize?: number;
  /** Show value label? */
  showValue?: boolean;
  /** Show min/max labels? */
  showLabels?: boolean;
  /** Value format function */
  formatValue?: (value: number) => string;
  /** Thresholds for color zones */
  thresholds?: GaugeThreshold[];
  /** Animation duration in ms (default: 800) */
  animationDuration?: number;
  /** Easing function name */
  easing?: string;
  /** Unit suffix (e.g., "%", "km/h") */
  unit?: string;
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Custom CSS class */
  className?: string;
  /** Start angle for arc gauges (degrees, default: -90) */
  startAngle?: number;
  /** End angle for arc gauges (degrees, default: 270) */
  endAngle?: number;
  /** Direction: "clockwise" | "counter-clockwise" */
  direction?: "clockwise" | "counter-clockwise";
  /** Number of tick marks */
  ticks?: number;
  /** Show tick marks? */
  showTicks?: boolean;
  /** Gap between segments (for segmented arc) */
  gap?: number;
  /** Number of segments (for segmented arc) */
  segments?: number;
  /** Rounded caps on arcs/bars? */
  roundedCaps?: boolean;
  /** On value change callback */
  onValueChange?: (value: number) => void;
  /** Gradient colors (overrides solid color) */
  gradient?: string[];
  /** Background gradient */
  trackGradient?: string[];
}

export interface GaugeInstance {
  /** SVG/Canvas element */
  element: HTMLElement;
  /** Set current value (animated) */
  setValue: (value: number) => void;
  /** Get current value */
  getValue: () => number;
  /** Set target value (bullet gauge) */
  setTarget: (value: number) => void;
  /** Update options */
  update: (options: Partial<GaugeOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Easing ---

const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t) => {
    const n1 = 7.5625; const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

function resolveEase(name: string): (t: number) => number {
  return EASINGS[name] ?? EASINGS.easeOut;
}

// --- Color Helpers ---

function getColorForValue(value: number, min: number, max: number, thresholds: GaugeThreshold[]): string {
  if (thresholds.length === 0) return "#4f46e5";
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (value >= sorted[i]!.value) return sorted[i]!.color;
  }
  return sorted[0]?.color ?? "#4f46e5";
}

function interpolateColor(colors: string[], t: number): string {
  if (colors.length === 1) return colors[0]!;
  const seg = t * (colors.length - 1);
  const idx = Math.floor(seg);
  const localT = seg - idx;
  const c1 = hexToRgb(colors[Math.min(idx, colors.length - 1)]!);
  const c2 = hexToRgb(colors[Math.min(idx + 1, colors.length - 1)]!);
  if (!c1 || !c2) return colors[0]!;
  const r = Math.round(c1.r + (c2.r - c1.r) * localT);
  const g = Math.round(c1.g + (c2.g - c1.g) * localT);
  const b = Math.round(c1.b + (c2.b - c1.b) * localT);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}

// --- SVG Namespace ---

const SVG_NS = "http://www.w3.org/2000/svg";

// --- Main Create Function ---

export function createGauge(options: GaugeOptions): GaugeInstance {
  const {
    container,
    type = "arc",
    min = 0,
    max = 100,
    value: initialValue = 0,
    target: initialTarget,
    width = 200,
    height: optHeight,
    strokeWidth = 12,
    color = "#4f46e5",
    trackColor = "#e5e7eb",
    textColor = "#374151",
    fontSize = 14,
    showValue = true,
    showLabels = true,
    formatValue,
    thresholds = [],
    animationDuration = 800,
    easing = "easeOut",
    unit = "",
    title,
    subtitle,
    className = "",
    startAngle = -90,
    endAngle = 270,
    direction = "clockwise",
    ticks: tickCount,
    showTicks = false,
    gap = 2,
    segments,
    roundedCaps = false,
    onValueChange,
    gradient,
    trackGradient,
  } = options;

  const el = typeof container === "string"
    ? document.querySelector<HTMLElement>(container)!
    : container;

  if (!el) throw new Error("Gauge: container not found");

  let currentValue = Math.min(Math.max(initialValue, min), max);
  let targetValue = initialTarget !== undefined ? Math.min(Math.max(initialTarget, min), max) : undefined;
  let animFrame: number | null = null;
  let destroyed = false;

  // Calculate height based on type
  const h = optHeight ?? (type === "linear" || type === "bullet" ? width * 0.25 : width);

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `gauge-wrapper gauge-${type} ${className}`;
  wrapper.style.cssText = `display:inline-flex;flex-direction:column;align-items:center;gap:4px;width:${width}px;height:${h}px;position:relative;overflow:hidden;`;

  // Create SVG
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${width} ${h}`);
  svg.style.cssText = "display:block;overflow:visible;";
  wrapper.appendChild(svg);

  // Title element
  let titleEl: HTMLElement | null = null;
  if (title) {
    titleEl = document.createElement("div");
    titleEl.style.cssText = `font-size:${Math.max(fontSize - 2, 10)}px;font-weight:600;color:${textColor};text-align:center;white-space:nowrap;`;
    titleEl.textContent = title;
    wrapper.insertBefore(titleEl, svg);
  }

  // Value display element
  let valueEl: HTMLElement | null = null;
  if (showValue && type !== "linear" && type !== "bullet") {
    valueEl = document.createElement("div");
    valueEl.style.cssText = `font-size:${fontSize + 8}px;font-weight:700;color:${textColor};font-variant-numeric:tabular-nums;line-height:1;`;
    wrapper.appendChild(valueEl);
  }

  // Subtitle element
  let subEl: HTMLElement | null = null;
  if (subtitle) {
    subEl = document.createElement("div");
    subEl.style.cssText = `font-size:${Math.max(fontSize - 3, 9)}px;color:#9ca3af;text-align:center;`;
    subEl.textContent = subtitle;
    wrapper.appendChild(subEl);
  }

  el.innerHTML = "";
  el.appendChild(wrapper);

  // --- Render Functions ---

  function render(): void {
    svg.innerHTML = "";

    switch (type) {
      case "arc":
      case "semicircle":
        renderArc();
        break;
      case "linear":
        renderLinear();
        break;
      case "radial":
        renderRadial();
        break;
      case "bullet":
        renderBullet();
        break;
    }

    updateValueDisplay();
  }

  function renderArc(): void {
    const cx = width / 2;
    const cy = type === "semicircle" ? h * 0.85 : h / 2;
    const radius = Math.min(width, h) / 2 - strokeWidth - (showLabels ? fontSize : 0);
    const innerRadius = Math.max(radius - strokeWidth, 1);
    const isSemi = type === "semicircle";
    const sa = isSemi ? -180 : startAngle;
    const ea = isSemi ? 0 : endAngle;
    const totalAngle = ea - sa;

    // Track (background arc)
    const trackArc = createArcPath(cx, cy, radius, sa, ea, innerRadius);
    const track = createSvgElement("path", {
      d: trackArc,
      fill: trackGradient?.length ? `url(#gauge-track-grad)` : "none",
      stroke: trackGradient?.length ? "none" : trackColor,
      "stroke-width": String(strokeWidth),
      "stroke-linecap": roundedCaps ? "round" : "butt",
      opacity: "0.3",
    });
    svg.appendChild(track);

    // Track gradient def
    if (trackGradient && trackGradient.length > 1) {
      const defs = createSvgElement("defs", {});
      const grad = createSvgElement("linearGradient", { id: "gauge-track-grad", x1: "0%", y1: "0%", x2: "100%", y2: "0%" });
      trackGradient.forEach((c, i) => {
        const stop = createSvgElement("stop", { offset: `${(i / (trackGradient.length - 1)) * 100}%`, "stop-color": c });
        grad.appendChild(stop);
      });
      defs.appendChild(grad);
      svg.appendChild(defs);
    }

    // Value arc
    const ratio = (currentValue - min) / (max - min);
    const valueAngle = sa + totalAngle * (direction === "counter-clockwise" ? 1 - ratio : ratio);

    if (ratio > 0.001) {
      const valueArc = createArcPath(cx, cy, radius, sa, valueAngle, innerRadius);
      const valColor = gradient?.length
        ? undefined
        : (thresholds.length > 0 ? getColorForValue(currentValue, min, max, thresholds) : color);

      const valuePath = createSvgElement("path", {
        d: valueArc,
        fill: gradient?.length ? `url(#gauge-value-grad)` : "none",
        stroke: gradient?.length ? "none" : valColor,
        "stroke-width": String(strokeWidth),
        "stroke-linecap": roundedCaps ? "round" : "butt",
      });
      svg.appendChild(valuePath);

      // Value gradient
      if (gradient && gradient.length > 1) {
        const defs = svg.querySelector("defs") || createSvgElement("defs", {});
        const grad = createSvgElement("linearGradient", { id: "gauge-value-grad", x1: "0%", y1: "0%", x2: "100%", y2: "0%" });
        gradient.forEach((c, i) => {
          const stop = createSvgElement("stop", { offset: `${(i / (gradient.length - 1)) * 100}%`, "stop-color": c });
          grad.appendChild(stop);
        });
        defs.appendChild(grad);
        if (!svg.querySelector("defs")) svg.appendChild(defs);
      }
    }

    // Ticks
    if (showTicks && tickCount) {
      for (let i = 0; i <= tickCount; i++) {
        const angle = (sa + (totalAngle * i) / tickCount) * (Math.PI / 180);
        const x1 = cx + (radius + strokeWidth / 2 + 4) * Math.cos(angle);
        const y1 = cy + (radius + strokeWidth / 2 + 4) * Math.sin(angle);
        const x2 = cx + (radius + strokeWidth / 2 + (i % (Math.max(1, Math.floor(tickCount / 5))) === 0 ? 10 : 6)) * Math.cos(angle);
        const y2 = cy + (radius + strokeWidth / 2 + (i % (Math.max(1, Math.floor(tickCount / 5))) === 0 ? 10 : 6)) * Math.sin(angle);
        const tick = createSvgElement("line", {
          x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2),
          stroke: "#9ca3af", "stroke-width": i % (Math.max(1, Math.floor(tickCount / 5))) === 0 ? "1.5" : "0.8",
        });
        svg.appendChild(tick);
      }
    }

    // Min/Max labels
    if (showLabels) {
      const minAngle = sa * (Math.PI / 180);
      const maxAngle = ea * (Math.PI / 180);
      const labelR = radius + strokeWidth + (showTicks ? 16 : 12);

      const minLabel = createSvgElement("text", {
        x: String(cx + labelR * Math.cos(minAngle)),
        y: String(cy + labelR * Math.sin(minAngle) + 4),
        "text-anchor": "middle",
        fill: "#9ca3af",
        "font-size": String(Math.max(fontSize - 4, 9)),
      });
      minLabel.textContent = formatValue ? formatValue(min) : String(min);
      svg.appendChild(minLabel);

      const maxLabel = createSvgElement("text", {
        x: String(cx + labelR * Math.cos(maxAngle)),
        y: String(cy + labelR * Math.sin(maxAngle) + 4),
        "text-anchor": "middle",
        fill: "#9ca3af",
        "font-size": String(Math.max(fontSize - 4, 9)),
      });
      maxLabel.textContent = formatValue ? formatValue(max) : String(max);
      svg.appendChild(maxLabel);
    }
  }

  function renderLinear(): void {
    const barHeight = Math.max(strokeWidth, 8);
    const barY = (h - barHeight) / 2;
    const padding = showLabels ? fontSize + 8 : 4;
    const barW = width - padding * 2;
    const barX = padding;

    // Track
    const trackRect = createSvgElement("rect", {
      x: String(barX), y: String(barY),
      width: String(barW), height: String(barHeight),
      rx: roundedCaps ? String(barHeight / 2) : "4",
      ry: roundedCaps ? String(barHeight / 2) : "4",
      fill: trackColor, opacity: "0.3",
    });
    svg.appendChild(trackRect);

    // Value bar
    const ratio = Math.min(Math.max((currentValue - min) / (max - min), 0), 1);
    const valW = Math.max(ratio * barW, roundedCaps ? barHeight : 0);
    const valColor = thresholds.length > 0 ? getColorForValue(currentValue, min, max, thresholds) : color;

    const valueRect = createSvgElement("rect", {
      x: String(barX), y: String(barY),
      width: String(valW), height: String(barHeight),
      rx: roundedCaps ? String(barHeight / 2) : "4",
      ry: roundedCaps ? String(barHeight / 2) : "4",
      fill: valColor,
    });
    svg.appendChild(valueRect);

    // Value text overlay
    if (showValue) {
      const txt = createSvgElement("text", {
        x: String(width / 2), y: String(barY - 6),
        "text-anchor": "middle", fill: textColor,
        "font-size": String(fontSize), "font-weight": "600",
      });
      txt.textContent = (formatValue ? formatValue(currentValue) : String(Math.round(currentValue))) + unit;
      svg.appendChild(txt);
    }

    // Labels
    if (showLabels) {
      const minTxt = createSvgElement("text", {
        x: String(barX), y: String(barY + barHeight + 14),
        "text-anchor": "start", fill: "#9ca3af",
        "font-size": String(Math.max(fontSize - 4, 9)),
      });
      minTxt.textContent = formatValue ? formatValue(min) : String(min);
      svg.appendChild(minTxt);

      const maxTxt = createSvgElement("text", {
        x: String(barX + barW), y: String(barY + barHeight + 14),
        "text-anchor": "end", fill: "#9ca3af",
        "font-size": String(Math.max(fontSize - 4, 9)),
      });
      maxTxt.textContent = formatValue ? formatValue(max) : String(max);
      svg.appendChild(maxTxt);
    }
  }

  function renderRadial(): void {
    const cx = width / 2;
    const cy = h / 2;
    const outerR = Math.min(width, h) / 2 - 4;
    const ratio = (currentValue - min) / (max - min);

    // Background circle
    const bgCircle = createSvgElement("circle", {
      cx: String(cx), cy: String(cy), r: String(outerR),
      fill: trackColor, opacity: "0.15",
    });
    svg.appendChild(bgCircle);

    // Value circle (filled proportionally)
    const valR = Math.max(ratio * outerR, 0);
    const valColor = thresholds.length > 0 ? getColorForValue(currentValue, min, max, thresholds) : color;

    if (valR > 0.5) {
      const valCircle = createSvgElement("circle", {
        cx: String(cx), cy: String(cy), r: String(valR),
        fill: valColor, opacity: "0.7",
      });
      svg.appendChild(valCircle);
    }

    // Center dot
    const dot = createSvgElement("circle", {
      cx: String(cx), cy: String(cy), r: "3",
      fill: valColor,
    });
    svg.appendChild(dot);

    // Concentric rings
    if (segments && segments > 1) {
      for (let i = 1; i <= segments; i++) {
        const ringR = (outerR / segments) * i;
        const ring = createSvgElement("circle", {
          cx: String(cx), cy: String(cy), r: String(ringR),
          fill: "none", stroke: "#e5e7eb", "stroke-width": "0.5", opacity: "0.5",
        });
        svg.appendChild(ring);
      }
    }
  }

  function renderBullet(): void {
    const barHeight = Math.max(strokeWidth, 10);
    const padding = showLabels ? fontSize + 8 : 8;
    const barW = width - padding * 2;
    const barX = padding;
    const barY = h / 2 - barHeight / 2 - (targetValue !== undefined ? barHeight / 2 + 4 : 0);

    // Qualitative ranges (background)
    if (thresholds.length > 0) {
      const sorted = [...thresholds].sort((a, b) => a.value - b.value);
      let prevX = barX;
      for (const thresh of sorted) {
        const tw = ((thresh.value - min) / (max - min)) * barW;
        const rangeRect = createSvgElement("rect", {
          x: String(prevX), y: String(barY),
          width: String(tw - (prevX - barX)), height: String(barHeight),
          rx: "2", fill: thresh.color, opacity: "0.25",
        });
        svg.appendChild(rangeRect);
        prevX = barX + tw;
      }
    } else {
      const trackRect = createSvgElement("rect", {
        x: String(barX), y: String(barY),
        width: String(barW), height: String(barHeight),
        rx: "2", fill: trackColor, opacity: "0.2",
      });
      svg.appendChild(trackRect);
    }

    // Value bar
    const ratio = Math.min(Math.max((currentValue - min) / (max - min), 0), 1);
    const valW = Math.max(ratio * barW, 0);
    const valColor = thresholds.length > 0 ? getColorForValue(currentValue, min, max, thresholds) : color;

    const valueRect = createSvgElement("rect", {
      x: String(barX), y: String(barY),
      width: String(valW), height: String(barHeight),
      rx: "2", fill: valColor,
    });
    svg.appendChild(valueRect);

    // Target marker line
    if (targetValue !== undefined) {
      const targetRatio = (targetValue - min) / (max - min);
      const targetX = barX + targetRatio * barW;
      const targetY = barY - barHeight / 2 - 4;

      // Target bar (thinner)
      const targetBarH = barHeight * 0.6;
      const targetBarY = barY + (barHeight - targetBarH) / 2;
      const targetW = Math.max(targetRatio * barW, 0);
      const targetRect = createSvgElement("rect", {
        x: String(barX), y: String(targetBarY),
        width: String(targetW), height: String(targetBarH),
        rx: "1", fill: "#f59e0b", opacity: "0.8",
      });
      svg.appendChild(targetRect);

      // Target line
      const targetLine = createSvgElement("line", {
        x1: String(targetX), y1: String(targetY - 4),
        x2: String(targetX), y2: String(barY + barHeight + 4),
        stroke: "#f59e0b", "stroke-width": "1.5", "stroke-dasharray": "3,2",
      });
      svg.appendChild(targetLine);
    }

    // Labels
    if (showLabels) {
      const minTxt = createSvgElement("text", {
        x: String(barX), y: String(h - 4),
        "text-anchor": "start", fill: "#9ca3af",
        "font-size": String(Math.max(fontSize - 4, 9)),
      });
      minTxt.textContent = formatValue ? formatValue(min) : String(min);
      svg.appendChild(minTxt);

      const maxTxt = createSvgElement("text", {
        x: String(barX + barW), y: String(h - 4),
        "text-anchor": "end", fill: "#9ca3af",
        "font-size": String(Math.max(fontSize - 4, 9)),
      });
      maxTxt.textContent = formatValue ? formatValue(max) : String(max);
      svg.appendChild(maxTxt);
    }

    // Value text
    if (showValue) {
      const txt = createSvgElement("text", {
        x: String(barX + valW + 8), y: String(barY + barHeight / 2 + 4),
        "text-anchor": "start", fill: textColor,
        "font-size": String(fontSize), "font-weight": "600",
      });
      txt.textContent = (formatValue ? formatValue(currentValue) : String(Math.round(currentValue))) + unit;
      svg.appendChild(txt);
    }
  }

  function updateValueDisplay(): void {
    if (valueEl) {
      const fmt = formatValue ? formatValue(currentValue) : String(Math.round(currentValue));
      valueEl.textContent = fmt + unit;
    }
  }

  // --- Animation ---

  function animateTo(newValue: number): void {
    const startValue = currentValue;
    const endValue = Math.min(Math.max(newValue, min), max);
    const startTime = performance.now();
    const duration = animationDuration;
    const easeFn = resolveEase(easing);

    if (animFrame) cancelAnimationFrame(animFrame);

    function frame(now: number): void {
      if (destroyed) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeFn(progress);
      currentValue = startValue + (endValue - startValue) * eased;
      render();
      onValueChange?.(currentValue);

      if (progress < 1) {
        animFrame = requestAnimationFrame(frame);
      } else {
        currentValue = endValue;
        render();
        animFrame = null;
      }
    }

    animFrame = requestAnimationFrame(frame);
  }

  // --- SVG Helpers ---

  function createSvgElement(tag: string, attrs: Record<string, string>): SVGElement {
    const elem = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      elem.setAttribute(k, v);
    }
    return elem;
  }

  function createArcPath(
    cx: number, cy: number, r: number,
    startDeg: number, endDeg: number, innerR: number,
  ): string {
    const start = startDeg * (Math.PI / 180);
    const end = endDeg * (Math.PI / 180);

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(start);
    const iy1 = cy + innerR * Math.sin(start);
    const ix2 = cx + innerR * Math.cos(end);
    const iy2 = cy + innerR * Math.sin(end);

    const largeArc = Math.abs(end - start) > 180 ? 1 : 0;
    const sweep = direction === "clockwise" ? 1 : 0;

    return [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} ${sweep === 1 ? 0 : 1} ${ix1} ${iy1}`,
      "Z",
    ].join(" ");
  }

  // Initial render
  render();

  // --- Instance ---

  const instance: GaugeInstance = {
    element: wrapper,

    setValue(v: number) {
      animateTo(v);
    },

    getValue() {
      return currentValue;
    },

    setTarget(v: number) {
      targetValue = Math.min(Math.max(v, min), max);
      render();
    },

    update(newOpts: Partial<GaugeOptions>) {
      Object.assign(options, newOpts);
      render();
    },

    destroy() {
      destroyed = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      wrapper.remove();
    },
  };

  return instance;
}

// --- Preset Gauges ---

/** Quick speed gauge (0-maxSpeed km/h) */
export function createSpeedGauge(
  container: HTMLElement | string,
  maxSpeed: number,
  options?: Partial<GaugeOptions>,
): GaugeInstance {
  return createGauge({
    container,
    type: "arc",
    max: maxSpeed,
    unit: " km/h",
    title: "Speed",
    thresholds: [
      { value: 0, color: "#22c55e" },
      { value: maxSpeed * 0.5, color: "#eab308" },
      { value: maxSpeed * 0.8, color: "#ef4444" },
    ],
    showTicks: true,
    ticks: 10,
    ...options,
  });
}

/** Quick progress gauge */
export function createProgressGauge(
  container: HTMLElement | string,
  options?: Partial<GaugeOptions>,
): GaugeInstance {
  return createGauge({
    container,
    type: "linear",
    color: "#4f46e5",
    roundedCaps: true,
    showValue: true,
    ...options,
  });
}

/** Quick score/rating gauge (0-100 or 0-10) */
export function createScoreGauge(
  container: HTMLElement | string,
  maxScore = 100,
  options?: Partial<GaugeOptions>,
): GaugeInstance {
  return createGauge({
    container,
    type: "semicircle",
    max: maxScore,
    thresholds: [
      { value: 0, color: "#ef4444" },
      { value: maxScore * 0.4, color: "#f59e0b" },
      { value: maxScore * 0.7, color: "#22c55e" },
      { value: maxScore * 0.9, color: "#06b6d4" },
    ],
    showTicks: true,
    ticks: 10,
    ...options,
  });
}

/** Quick health/status gauge */
export function createHealthGauge(
  container: HTMLElement | string,
  options?: Partial<GaugeOptions>,
): GaugeInstance {
  return createGauge({
    container,
    type: "radial",
    max: 100,
    unit: "%",
    thresholds: [
      { value: 0, color: "#ef4444" },
      { value: 30, color: "#f59e0b" },
      { value: 60, color: "#22c55e" },
    ],
    segments: 5,
    ...options,
  });
}
