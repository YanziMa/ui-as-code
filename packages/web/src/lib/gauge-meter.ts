/**
 * Gauge Meter: Analog gauge/dial component with animated needle, multiple
 * threshold zones, value formatting, min/max markers, tick marks,
 * custom labels, and multiple gauge variants.
 */

// --- Types ---

export type GaugeVariant = "half" | "quarter-left" | "quarter-right" | "full" | "arc";

export interface ThresholdZone {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface GaugeOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Current value */
  value: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Gauge variant */
  variant?: GaugeVariant;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Unit label */
  unit?: string;
  /** Title label */
  title?: string;
  /** Value decimal places */
  decimals?: number;
  /** Animated needle? */
  animated?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Easing function ("linear" | "easeOut" | "easeInOut" | "elastic" | "bounce") */
  easing?: string;
  /** Threshold zones (colored regions) */
  thresholds?: ThresholdZone[];
  /** Default track color */
  trackColor?: string;
  /** Needle color */
  needleColor?: string;
  /** Needle width ratio (0-1) */
  needleWidth?: number;
  /** Needle length ratio (0-1) */
  needleLength?: number;
  /** Show tick marks? */
  ticks?: boolean;
  /** Number of major ticks */
  majorTicks?: number;
  /** Number of minor ticks per major interval */
  minorTicks?: number;
  /** Tick label font size */
  tickFontSize?: number;
  /** Show min/max labels? */
  showMinMax?: boolean;
  /** Show value text in center? */
  showValue?: boolean;
  /** Value text position ("center" | "below" | "above") */
  valuePosition?: string;
  /** Custom value formatter */
  valueFormatter?: (value: number) => string;
  /** Start angle (degrees, default depends on variant) */
  startAngle?: number;
  /** End angle (degrees) */
  endAngle?: number;
  /** Track thickness (ratio of radius) */
  thickness?: number;
  /** Gap at ends of track (degrees) */
  endGap?: number;
  /** Glow effect on needle? */
  glow?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Value change callback */
  onChange?: (value: number) => void;
  /** Animation complete callback */
  onAnimationComplete?: (value: number) => void;
}

export interface GaugeInstance {
  element: SVGElement;
  /** Set value (animated if configured) */
  setValue: (value: number) => void;
  /** Get current value */
  getValue: () => number;
  /** Update thresholds */
  setThresholds: (zones: ThresholdZone[]) => void;
  /** Set title */
  setTitle: (title: string) => void;
  /** Set unit */
  setUnit: (unit: string) => void;
  /** Animate to value with custom duration */
  animateTo: (value: number, duration?: number) => void;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Variant Defaults ---

const VARIANT_CONFIGS: Record<GaugeVariant, { startAngle: number; endAngle: number; cap: "round" | "butt" }> = {
  "half":           { startAngle: -180, endAngle: 0,   cap: "round" },
  "quarter-left":   { startAngle: -180, endAngle: -90,  cap: "round" },
  "quarter-right":  { startAngle: -90,  endAngle: 0,    cap: "round" },
  "full":           { startAngle: -180, endAngle: 180,  cap: "butt" },
  "arc":            { startAngle: -225, endAngle: 45,   cap: "round" },
};

// --- Easing Functions ---

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuad(t: number): number { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function elasticOut(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
}
function bounceOut(t: number): number {
  const n1 = 7.5625; const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function getEaser(name: string): (t: number) => number {
  switch (name) {
    case "easeOut": return easeOutCubic;
    case "easeInOut": return easeInOutQuad;
    case "elastic": return elasticOut;
    case "bounce": return bounceOut;
    default: return (t: number) => t;
  }
}

// --- Math Helpers ---

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, cap: "round" | "butt"): string {
  const [x1, y1] = polarToCartesian(cx, cy, r, startAngle);
  const [x2, y2] = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

// --- Main Factory ---

export function createGaugeMeter(options: GaugeOptions): GaugeInstance {
  const opts = {
    min: options.min ?? 0,
    max: options.max ?? 100,
    variant: options.variant ?? "arc",
    width: options.width ?? 280,
    height: options.height ?? 200,
    unit: options.unit ?? "",
    title: options.title ?? "",
    decimals: options.decimals ?? 1,
    animated: options.animated ?? true,
    animationDuration: options.animationDuration ?? 1200,
    easing: options.easing ?? "easeOut",
    thresholds: options.thresholds ?? [],
    trackColor: options.trackColor ?? "#e5e7eb",
    needleColor: options.needleColor ?? "#ef4444",
    needleWidth: options.needleWidth ?? 0.06,
    needleLength: options.needleLength ?? 0.75,
    ticks: options.ticks ?? true,
    majorTicks: options.majorTicks ?? 5,
    minorTicks: options.minorTicks ?? 4,
    tickFontSize: options.tickFontSize ?? 10,
    showMinMax: options.showMinMax ?? true,
    showValue: options.showValue ?? true,
    valuePosition: options.valuePosition ?? "center",
    valueFormatter: options.valueFormatter ?? ((v) => v.toFixed(opts.decimals)),
    thickness: options.thickness ?? 0.18,
    endGap: options.endGap ?? 3,
    glow: options.glow ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("GaugeMeter: container not found");

  let currentValue = options.value;
  let displayValue = currentValue;
  let destroyed = false;
  let animFrame: number | null = null;

  const vConfig = VARIANT_CONFIGS[opts.variant];
  const startAngle = opts.startAngle ?? vConfig.startAngle;
  const endAngle = opts.endAngle ?? vConfig.endAngle;
  const gap = opts.endGap;
  const effectiveStart = startAngle + gap;
  const effectiveEnd = endAngle - gap;
  const angleSpan = effectiveEnd - effectiveStart;

  // Dimensions
  const cx = opts.width / 2;
  const cy = opts.variant === "half" ? opts.height * 0.82 : opts.height / 2;
  const radius = Math.min(opts.width, opts.height) * 0.38;
  const trackWidth = radius * opts.thickness * 2;

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `gauge-meter ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;overflow:visible;`;

  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  // Glow filter
  if (opts.glow) {
    const glowFilter = document.createElementNS(ns, "filter");
    glowFilter.id = "gauge-glow";
    glowFilter.innerHTML = `<feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    defs.appendChild(glowFilter);
  }

  // Drop shadow for needle
  const shadowFilter = document.createElementNS(ns, "filter");
  shadowFilter.id = "gauge-needle-shadow";
  shadowFilter.innerHTML = `<feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.2"/>`;
  defs.appendChild(shadowFilter);

  // Groups
  const gTrack = document.createElementNS(ns, "g");
  svg.appendChild(gTrack);

  const gThresholds = document.createElementNS(ns, "g");
  svg.appendChild(gThresholds);

  const gValueArc = document.createElementNS(ns, "g");
  svg.appendChild(gValueArc);

  const gTicks = document.createElementNS(ns, "g");
  svg.appendChild(gTicks);

  const gNeedle = document.createElementNS(ns, "g");
  svg.appendChild(gNeedle);

  const gLabels = document.createElementNS(ns, "g");
  svg.appendChild(gLabels);

  container.appendChild(svg);

  // --- Rendering ---

  function render(display: number): void {
    gTrack.innerHTML = "";
    gThresholds.innerHTML = "";
    gValueArc.innerHTML = "";
    gTicks.innerHTML = "";
    gNeedle.innerHTML = "";
    gLabels.innerHTML = "";

    const clampedDisplay = clamp(display, opts.min, opts.max);
    const fraction = (clampedDisplay - opts.min) / (opts.max - opts.min || 1);
    const valueAngle = effectiveStart + fraction * angleSpan;

    // Background track
    const trackPath = document.createElementNS(ns, "path");
    trackPath.setAttribute("d", describeArc(cx, cy, radius, effectiveStart, effectiveEnd, vConfig.cap));
    trackPath.setAttribute("fill", "none");
    trackPath.setAttribute("stroke", opts.trackColor);
    trackPath.setAttribute("stroke-width", String(trackWidth));
    trackPath.setAttribute("stroke-linecap", vConfig.cap);
    gTrack.appendChild(trackPath);

    // Threshold zones
    if (opts.thresholds.length > 0) {
      for (const zone of opts.thresholds) {
        const zFractionStart = (zone.from - opts.min) / (opts.max - opts.min || 1);
        const zFractionEnd = (zone.to - opts.min) / (opts.max - opts.min || 1);
        const zStart = effectiveStart + clamp(zFractionStart, 0, 1) * angleSpan;
        const zEnd = effectiveStart + clamp(zFractionEnd, 0, 1) * angleSpan;

        if (zEnd <= zStart) continue;

        const zonePath = document.createElementNS(ns, "path");
        zonePath.setAttribute("d", describeArc(cx, cy, radius, zStart, zEnd, "butt"));
        zonePath.setAttribute("fill", "none");
        zonePath.setAttribute("stroke", zone.color);
        zonePath.setAttribute("stroke-width", String(trackWidth));
        zonePath.setAttribute("stroke-linecap", "butt");
        zonePath.setAttribute("opacity", "0.75");
        gThresholds.appendChild(zonePath);
      }
    }

    // Value arc (filled portion)
    if (fraction > 0.001) {
      const valuePath = document.createElementNS(ns, "path");
      valuePath.setAttribute("d", describeArc(cx, cy, radius, effectiveStart, valueAngle, vConfig.cap));
      valuePath.setAttribute("fill", "none");
      valuePath.setAttribute("stroke", opts.needleColor);
      valuePath.setAttribute("stroke-width", String(trackWidth));
      valuePath.setAttribute("stroke-linecap", vConfig.cap);
      if (opts.glow) valuePath.setAttribute("filter", "url(#gauge-glow)");
      gValueArc.appendChild(valuePath);
    }

    // Tick marks
    if (opts.ticks) {
      const tickLenMajor = trackWidth * 0.4;
      const tickLenMinor = trackWidth * 0.2;
      const innerTickR = radius - trackWidth / 2 - 2;
      const outerTickR = innerTickR + tickLenMajor;

      for (let i = 0; i <= opts.majorTicks; i++) {
        const frac = i / opts.majorTicks;
        const angle = effectiveStart + frac * angleSpan;
        const val = opts.min + frac * (opts.max - opts.min);

        // Major tick
        const [mx1, my1] = polarToCartesian(cx, cy, innerTickR, angle);
        const [mx2, my2] = polarToCartesian(cx, cy, outerTickR, angle);
        const majorTick = document.createElementNS(ns, "line");
        majorTick.setAttribute("x1", String(mx1));
        majorTick.setAttribute("y1", String(my1));
        majorTick.setAttribute("x2", String(mx2));
        majorTick.setAttribute("y2", String(my2));
        majorTick.setAttribute("stroke", "#6b7280");
        majorTick.setAttribute("stroke-width", "1.5");
        majorTick.setAttribute("stroke-linecap", "round");
        gTicks.appendChild(majorTick);

        // Minor ticks
        if (i < opts.majorTicks) {
          for (let j = 1; j < opts.minorTicks; j++) {
            const minorFrac = frac + (j / opts.minorTicks) * (1 / opts.majorTicks);
            const minorAngle = effectiveStart + minorFrac * angleSpan;
            const [sx1, sy1] = polarToCartesian(cx, cy, innerTickR, minorAngle);
            const [sx2, sy2] = polarToCartesian(cx, cy, innerTickR + tickLenMinor, minorAngle);
            const minorTick = document.createElementNS(ns, "line");
            minorTick.setAttribute("x1", String(sx1));
            minorTick.setAttribute("y1", String(sy1));
            minorTick.setAttribute("x2", String(sx2));
            minorTick.setAttribute("y2", String(sy2));
            minorTick.setAttribute("stroke", "#d1d5db");
            minorTick.setAttribute("stroke-width", "1");
            gTicks.appendChild(minorTick);
          }
        }

        // Tick labels
        const [lx, ly] = polarToCartesian(cx, cy, innerTickR - 14, angle);
        const label = document.createElementNS(ns, "text");
        label.setAttribute("x", String(lx));
        label.setAttribute("y", String(ly + opts.tickFontSize / 3));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "#6b7280");
        label.setAttribute("font-size", String(opts.tickFontSize));
        label.setAttribute("font-family", "-apple-system, sans-serif");
        label.textContent = val % 1 === 0 ? String(val) : val.toFixed(1);
        gTicks.appendChild(label);
      }
    }

    // Min/Max labels
    if (opts.showMinMax) {
      const minLbl = document.createElementNS(ns, "text");
      const [mnx, mny] = polarToCartesian(cx, cy, radius + trackWidth / 2 + 16, effectiveStart);
      minLbl.setAttribute("x", String(mnx));
      minLbl.setAttribute("y", String(mny + 4));
      minLbl.setAttribute("text-anchor", "middle");
      minLbl.setAttribute("fill", "#9ca3af");
      minLbl.setAttribute("font-size", "10");
      minLbl.textContent = opts.min % 1 === 0 ? String(opts.min) : opts.min.toFixed(1);
      gLabels.appendChild(minLbl);

      const maxLbl = document.createElementNS(ns, "text");
      const [mxx, mxy] = polarToCartesian(cx, cy, radius + trackWidth / 2 + 16, effectiveEnd);
      maxLbl.setAttribute("x", String(mxx));
      maxLbl.setAttribute("y", String(mxy + 4));
      maxLbl.setAttribute("text-anchor", "middle");
      maxLbl.setAttribute("fill", "#9ca3af");
      maxLbl.setAttribute("font-size", "10");
      maxLbl.textContent = opts.max % 1 === 0 ? String(opts.max) : opts.max.toFixed(1);
      gLabels.appendChild(maxLbl);
    }

    // Needle
    const needleR = radius * opts.needleLength;
    const [nx, ny] = polarToCartesian(cx, cy, needleR, valueAngle);
    const needleW = radius * opts.needleWidth;

    const needleGroup = document.createElementNS(ns, "g");
    needleGroup.setAttribute("filter", "url(#gauge-needle-shadow)");

    // Needle body (triangle)
    const needleBody = document.createElementNS(ns, "polygon");
    const perpX = -Math.sin((valueAngle * Math.PI) / 180) * needleW;
    const perpY = Math.cos((valueAngle * Math.PI) / 180) * needleW;
    const baseX = cx - perpX;
    const baseY = cy - perpY;
    const baseX2 = cx + perpX;
    const baseY2 = cy + perpY;
    needleBody.setAttribute("points", `${baseX},${baseY} ${nx},${ny} ${baseX2},${baseY2}`);
    needleBody.setAttribute("fill", opts.needleColor);
    needleGroup.appendChild(needleBody);

    // Center hub
    const hub = document.createElementNS(ns, "circle");
    hub.setAttribute("cx", String(cx));
    hub.setAttribute("cy", String(cy));
    hub.setAttribute("r", String(needleW * 2.5));
    hub.setAttribute("fill", "#374151");
    hub.setAttribute("stroke", "#fff");
    hub.setAttribute("stroke-width", "2");
    needleGroup.appendChild(hub);

    // Inner hub dot
    const hubDot = document.createElementNS(ns, "circle");
    hubDot.setAttribute("cx", String(cx));
    hubDot.setAttribute("cy", String(cy));
    hubDot.setAttribute("r", String(needleW * 0.8));
    hubDot.setAttribute("fill", opts.needleColor);
    needleGroup.appendChild(hubDot);

    gNeedle.appendChild(needleGroup);

    // Value text
    if (opts.showValue) {
      const valueG = document.createElementNS(ns, "g");

      let vx = cx, vy = cy;
      if (opts.valuePosition === "below") {
        vy = cy + radius * 0.55;
      } else if (opts.valuePosition === "above") {
        vy = cy - radius * 0.35;
      }

      const valueText = document.createElementNS(ns, "text");
      valueText.setAttribute("x", String(vx));
      valueText.setAttribute("y", String(vy + 6));
      valueText.setAttribute("text-anchor", "middle");
      valueText.setAttribute("fill", "#111827");
      valueText.setAttribute("font-size", "26");
      valueText.setAttribute("font-weight", "700");
      valueText.setAttribute("font-family", "-apple-system, sans-serif");
      valueText.textContent = opts.valueFormatter(clampedDisplay);
      valueG.appendChild(valueText);

      if (opts.unit) {
        const unitText = document.createElementNS(ns, "text");
        unitText.setAttribute("x", String(vx));
        unitText.setAttribute("y", String(vy + 22));
        unitText.setAttribute("text-anchor", "middle");
        unitText.setAttribute("fill", "#6b7280");
        unitText.setAttribute("font-size", "12");
        unitText.textContent = opts.unit;
        valueG.appendChild(unitText);
      }

      if (opts.title) {
        const titleText = document.createElementNS(ns, "text");
        titleText.setAttribute("x", String(vx));
        titleText.setAttribute("y", String(vy - (opts.valuePosition === "center" ? 22 : 10)));
        titleText.setAttribute("text-anchor", "middle");
        titleText.setAttribute("fill", "#9ca3af");
        titleText.setAttribute("font-size", "12");
        titleText.textContent = opts.title;
        valueG.appendChild(titleText);
      }

      gLabels.appendChild(valueG);
    }
  }

  // --- Animation ---

  function animateTo(target: number, duration?: number): void {
    if (animFrame != null) cancelAnimationFrame(animFrame);

    const dur = duration ?? opts.animationDuration;
    if (dur <= 0) {
      displayValue = target;
      render(target);
      opts.onAnimationComplete?.(target);
      return;
    }

    const startVal = displayValue;
    const startTime = performance.now();
    const easer = getEaser(opts.easing);

    function frame(now: number): void {
      if (destroyed) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / dur, 1);
      const easedProgress = easer(progress);
      displayValue = lerp(startVal, target, easedProgress);
      render(displayValue);

      if (progress < 1) {
        animFrame = requestAnimationFrame(frame);
      } else {
        displayValue = target;
        animFrame = null;
        opts.onAnimationComplete?.(target);
      }
    }

    animFrame = requestAnimationFrame(frame);
  }

  // Initial render
  if (opts.animated) {
    animateTo(currentValue);
  } else {
    render(currentValue);
  }

  // --- Public API ---

  const instance: GaugeInstance = {
    element: svg,

    setValue(newValue: number) {
      currentValue = clamp(newValue, opts.min, opts.max);
      opts.onChange?.(currentValue);
      if (opts.animated) {
        animateTo(currentValue);
      } else {
        displayValue = currentValue;
        render(currentValue);
      }
    },

    getValue: () => currentValue,

    setThresholds(zones: ThresholdZone[]) {
      opts.thresholds = zones;
      render(displayValue);
    },

    setTitle(title: string) {
      opts.title = title;
      render(displayValue);
    },

    setUnit(unit: string) {
      opts.unit = unit;
      render(displayValue);
    },

    animateTo,

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      if (animFrame != null) cancelAnimationFrame(animFrame);
      svg.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
