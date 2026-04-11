/**
 * Analog Clock: Classic analog clock face with hour/minute/second hands,
 * tick marks, numbers, smooth or stepping motion, multiple styles,
 * and configurable appearance.
 */

// --- Types ---

export type ClockStyle = "classic" | "minimal" | "modern" | "vintage" | "neon";
export type HandShape = "arrow" | "line" | "diamond" | "circle";

export interface AnalogClockOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Clock style variant */
  style?: ClockStyle;
  /** Show hour hand? */
  showHourHand?: boolean;
  /** Show minute hand? */
  showMinuteHand?: boolean;
  /** Show second hand? */
  showSecondHand?: boolean;
  /** Hour hand shape */
  hourHandShape?: HandShape;
  /** Minute hand shape */
  minuteHandShape?: HandShape;
  /** Second hand shape */
  secondHandShape?: HandShape;
  /** Hour hand color */
  hourHandColor?: string;
  /** Minute hand color */
  minuteHandColor?: string;
  /** Second hand color */
  secondHandColor?: string;
  /** Center hub color */
  hubColor?: string;
  /** Center dot color */
  centerDotColor?: string;
  /** Face/background color */
  faceColor?: string;
  /** Border/frame color */
  borderColor?: string;
  /** Tick mark color */
  tickColor?: string;
  /** Number color */
  numberColor?: number | string;
  /** Show numbers (1-12)? */
  showNumbers?: boolean;
  /** Show all ticks (60) or just hour marks? */
  showAllTicks?: boolean;
  /** Smooth motion (sweeping) vs step motion? */
  smoothMotion?: boolean;
  /** Update interval (ms) */
  updateInterval?: number;
  /** Time offset (seconds from UTC, for timezone) */
  timeOffset?: number;
  /** Use custom time instead of system clock? */
  customTime?: Date | null;
  /** Show date below clock? */
  showDate?: boolean;
  /** Date format */
  dateFormat?: string;
  /** Custom CSS class */
  className?: string;
  /** Second change callback */
  onSecondChange?: (date: Date) => void;
  /** Minute change callback */
  onMinuteChange?: (date: Date) => void;
}

export interface AnalogClockInstance {
  element: SVGSVGElement;
  /** Set custom time */
  setTime: (date: Date) => void;
  /** Resume system time */
  useSystemTime: () => void;
  /** Set style */
  setStyle: (style: ClockStyle) => void;
  /** Set time zone offset (seconds) */
  setTimezoneOffset: (offsetSeconds: number) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Style Configs ---

const STYLE_CONFIGS: Record<ClockStyle, {
  face: string; border: string; tick: string; number: string | number; bg: string;
  hub: string; hour: string; minute: string; second: string;
}> = {
  classic: { face: "#fffef0", border: "#8b7355", tick: "#4a3728", number: "#2d1f0e", bg: "transparent", hub: "#4a3728", hour: "#1a1a1a", minute: "#333", second: "#c0392b" },
  minimal: { face: "#ffffff", border: "#e5e7eb", tick: "#9ca3af", number: "#6b7280", bg: "transparent", hub: "#374151", hour: "#111827", minute: "#4b5563", second: "#dc2626" },
  modern: { face: "#0f172a", border: "#334155", tick: "#64748b", number: "#94a3b8", bg: "#020617", hub: "#e2e8f0", hour: "#f8fafc", minute: "#cbd5e1", second: "#38bdf8" },
  vintage: { face: "#fdf6e3", border: "#92400e", tick: "#78350f", number: "#451a03", bg: "#fef3c7", hub: "#78350f", hour: "#451a03", minute: "#854d0e", second: "#92400e" },
  neon: { face: "#0a001a", border: "#ff00ff", tick: "#ff00ff", number: "#ff00ff", bg: "#000010", hub: "#ffffff", hour: "#00ffff", minute: "#ffff00", second: "#ff0080" },
};

// --- Main Factory ---

export function createAnalogClock(options: AnalogClockOptions): AnalogClockInstance {
  const opts = {
    width: options.width ?? 280,
    height: options.height ?? 280,
    style: options.style ?? "classic",
    showHourHand: options.showHourHand ?? true,
    showMinuteHand: options.showMinuteHand ?? true,
    showSecondHand: options.showSecondHand ?? true,
    hourHandShape: options.hourHandShape ?? "arrow",
    minuteHandShape: options.minuteHandShape ?? "arrow",
    secondHandShape: options.secondHandShape ?? "line",
    showNumbers: options.showNumbers ?? true,
    showAllTicks: options.showAllTicks ?? false,
    smoothMotion: options.smoothMotion ?? true,
    updateInterval: options.updateInterval ?? 100,
    timeOffset: options.timeOffset ?? 0,
    customTime: options.customTime ?? null,
    showDate: options.showDate ?? false,
    dateFormat: options.dateFormat ?? "MMM d, yyyy",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AnalogClock: container not found");

  let destroyed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSecond = -1;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `analog-clock ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;`;
  container.appendChild(svg);

  const cx = opts.width / 2;
  const cy = opts.height / 2;
  const r = Math.min(opts.width, opts.height) / 2 - 10;

  // --- Drawing ---

  function draw(): void {
    svg.innerHTML = "";
    const sc = STYLE_CONFIGS[opts.style];

    // Background circle
    const face = document.createElementNS(ns, "circle");
    face.setAttribute("cx", String(cx)); face.setAttribute("cy", String(cy));
    face.setAttribute("r", String(r));
    face.setAttribute("fill", sc.face);
    face.setAttribute("stroke", sc.border);
    face.setAttribute("stroke-width", "3");
    svg.appendChild(face);

    // Inner shadow ring
    if (opts.style === "modern") {
      const innerRing = document.createElementNS(ns, "circle");
      innerRing.setAttribute("cx", String(cx)); innerRing.setAttribute("cy", String(cy));
      innerRing.setAttribute("r", String(r - 15));
      innerRing.setAttribute("fill", "none");
      innerRing.setAttribute("stroke", "rgba(148,163,184,0.2)");
      innerRing.setAttribute("stroke-width", "20");
      svg.appendChild(innerRing);
    }

    // Ticks
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 - 90) * Math.PI / 180;
      const isHour = i % 5 === 0;
      const outerR = isHour ? r - 4 : r - 2;
      const innerR = isHour ? r - 14 : r - 7;

      const [x1, y1] = [cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle)];
      const [x2, y2] = [cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle)];

      const tk = document.createElementNS(ns, "line");
      tk.setAttribute("x1", String(x1)); tk.setAttribute("y1", String(y1));
      tk.setAttribute("x2", String(x2)); tk.setAttribute("y2", String(y2));
      tk.setAttribute("stroke", sc.tick);
      tk.setAttribute("stroke-width", isHour ? "2.5" : "1");
      if (!isHour && !opts.showAllTicks) continue;
      svg.appendChild(tk);
    }

    // Numbers
    if (opts.showNumbers) {
      for (let h = 1; h <= 12; h++) {
        const angle = (h * 30 - 90) * Math.PI / 180;
        const nr = r - 22;
        const [nx, ny] = [cx + nr * Math.cos(angle), cy + nr * Math.sin(angle)];

        const num = document.createElementNS(ns, "text");
        num.setAttribute("x", String(nx)); num.setAttribute("y", String(ny));
        num.setAttribute("text-anchor", "middle");
        num.setAttribute("dominant-baseline", "middle");
        num.setAttribute("fill", typeof sc.number === "number" ? `hsl(${sc.number}, 30%, 20%)` : String(sc.number));
        num.setAttribute("font-size", "13");
        num.setAttribute("font-weight", "700");
        num.setAttribute("font-family", "-apple-system, serif");
        num.textContent = String(h);
        svg.appendChild(num);
      }
    }

    // Get current time
    const now = opts.customTime ?? new Date(Date.now() + opts.timeOffset * 1000);
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const millis = now.getMilliseconds();

    // Calculate angles
    const secAngle = opts.smoothMotion
      ? ((seconds + millis / 1000) / 60) * 360 - 90
      : seconds * 6 - 90;
    const minAngle = opts.smoothMotion
      ? ((minutes + seconds / 60) / 60) * 360 - 90
      : minutes * 6 - 90;
    const hrAngle = opts.smoothMotion
      ? (((hours + minutes / 60) / 12) * 360) - 90
      : hours * 30 - 90;

    const toRad = (deg: number) => deg * Math.PI / 180;

    // Draw hands
    if (opts.showSecondHand) drawHand(toRad(secAngle), r * 0.55, 1.2, sc.second, opts.secondHandShape);
    if (opts.showMinuteHand) drawHand(toRad(minAngle), r * 0.72, 2.5, sc.minute, opts.minuteHandShape);
    if (opts.showHourHand) drawHand(toRad(hrAngle), r * 0.48, 3.5, sc.hour, opts.hourHandShape);

    // Hub
    const hub = document.createElementNS(ns, "circle");
    hub.setAttribute("cx", String(cx)); hub.setAttribute("cy", String(cy));
    hub.setAttribute("r", String(7));
    hub.setAttribute("fill", sc.hub);
    svg.appendChild(hub);

    const cdot = document.createElementNS(ns, "circle");
    cdot.setAttribute("cx", String(cx)); cdot.setAttribute("cy", String(cy));
    cdot.setAttribute("r", String(3));
    cdot.setAttribute("fill", opts.centerDotColor ?? sc.second);
    svg.appendChild(cdot);

    // Date display
    if (opts.showDate) {
      const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const dl = document.createElementNS(ns, "text");
      dl.setAttribute("x", String(cx)); dl.setAttribute("y", String(cy + r + 18));
      dl.setAttribute("text-anchor", "middle"); dl.setAttribute("fill", "#6b7280");
      dl.setAttribute("font-size", "11"); dl.setAttribute("font-family", "-apple-system, sans-serif");
      dl.textContent = dateStr;
      svg.appendChild(dl);
    }
  }

  function drawHand(angle: number, length: number, width: number, color: string, shape: HandShape): void {
    const [ex, ey] = [cx + length * Math.cos(angle), cy + length * Math.sin(angle)];

    let el: SVGElement;
    switch (shape) {
      case "arrow": {
        el = document.createElementNS(ns, "polygon");
        const aw = 6;
        const perpX = -Math.sin(angle) * (aw / 2);
        const perpY = Math.cos(angle) * (aw / 2);
        el.setAttribute("points", `${cx + perpX},${cy + perpY} ${cx - perpX},${cy - perpY} ${ex},${ey}`);
        break;
      }
      case "diamond": {
        el = document.createElementNS(ns, "polygon");
        const dw = 4;
        const dpX = -Math.sin(angle) * dw; const dpY = Math.cos(angle) * dw;
        el.setAttribute("points", `${cx + dpX},${cy + dpY} ${ex},${ey + dw} ${cx - dpX},${cy - dpY} ${ex},${ey - dw}`);
        break;
      }
      case "circle": {
        el = document.createElementNS(ns, "circle");
        el.setAttribute("cx", String(ex)); el.setAttribute("cy", String(ey));
        el.setAttribute("r", String(width / 2));
        break;
      }
      default: { // line
        el = document.createElementNS(ns, "line");
        el.setAttribute("x1", String(cx)); el.setAttribute("y1", String(cy));
        el.setAttribute("x2", String(ex)); el.setAttribute("y2", String(ey));
        break;
    }

    el.setAttribute("fill", shape === "line" ? "none" : color);
    el.setAttribute("stroke", color);
    el.setAttribute("stroke-width", String(shape === "line" ? width : 0));
    el.setAttribute("stroke-linecap", "round");
    svg.appendChild(el);
  }

  // --- Timer Loop ---

  function startTimer(): void {
    stopTimer();
    timer = setInterval(() => {
      if (destroyed) { stopTimer(); return; }
      const now = opts.customTime ?? new Date(Date.now() + opts.timeOffset * 1000);
      const s = now.getSeconds();
      if (s !== lastSecond) {
        lastSecond = s;
        opts.onSecondChange?.(now);
        if (now.getMinutes() === 0) opts.onMinuteChange?.(now);
      }
      draw();
    }, opts.updateInterval);
  }

  function stopTimer(): void {
    if (timer != null) { clearInterval(timer); timer = null; }
  }

  // Initial render & start
  draw();
  startTimer();

  // --- Public API ---

  const instance: AnalogClockInstance = {
    element: svg as any,

    setTime(date: Date) {
      opts.customTime = date;
      draw();
    },

    useSystemTime() {
      opts.customTime = null;
    },

    setStyle(style: ClockStyle) {
      opts.style = style;
      draw();
    },

    setTimezoneOffset(offsetSeconds: number) {
      opts.timeOffset = offsetSeconds;
    },

    destroy() {
      destroyed = true;
      stopTimer();
      svg.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
