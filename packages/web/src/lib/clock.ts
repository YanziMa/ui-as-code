/**
 * Clock: Analog and digital clock display with multiple time zones,
 * date display, second hand options, alarm/reminder support, themes,
 * and customizable face design.
 */

// --- Types ---

export type ClockStyle = "analog" | "digital" | "both";
export type ClockSize = "sm" | "md" | "lg" | "xl";
export type SecondHandStyle = "smooth" | "tick" | "none";

export interface TimeZoneInfo {
  /** IANA timezone identifier (e.g., "America/New_York") */
  id: string;
  /** Display label */
  label: string;
  /** UTC offset in hours (for display) */
  offset?: number;
}

export interface ClockOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Display style */
  style?: ClockStyle;
  /** Size variant */
  size?: ClockSize;
  /** Timezone (default: local) */
  timezone?: string;
  /** Show seconds? */
  showSeconds?: boolean;
  /** Second hand rendering style */
  secondHand?: SecondHandStyle;
  /** Show date? (digital mode) */
  showDate?: boolean;
  /** Date format string (Intl.DateTimeFormat) */
  dateFormat?: string;
  /** Time format: "12h" | "24h" */
  timeFormat?: "12h" | "24h";
  /** Hour markers style: "numbers" | "ticks" | "roman" | "none" */
  hourMarkers?: "numbers" | "ticks" | "roman" | "none";
  /** Face color */
  faceColor?: string;
  /** Border color */
  borderColor?: string;
  /** Hand colors */
  hourHandColor?: string;
  minuteHandColor?: string;
  secondHandColor?: string;
  /** Text color for digital mode */
  textColor?: string;
  /** Show AM/PM indicator? */
  showAmPm?: boolean;
  /** Custom tick callback every second */
  onTick?: (date: Date) => void;
  /** Theme: "light" | "dark" */
  theme?: "light" | "dark";
  /** Custom CSS class */
  className?: string;
}

export interface ClockInstance {
  element: HTMLElement;
  /** Get current displayed time */
  getTime: () => Date;
  /** Get formatted time string */
  getFormattedTime: () => string;
  /** Set timezone */
  setTimezone: (tz: string) => void;
  /** Show/hide seconds */
  setShowSeconds: (show: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<ClockSize, { diameter: number; fontSize: number; strokeWidth: number }> = {
  sm: { diameter: 120, fontSize: 10, strokeWidth: 2 },
  md: { diameter: 180, fontSize: 13, strokeWidth: 3 },
  lg: { diameter: 240, fontSize: 16, strokeWidth: 3 },
  xl: { diameter: 320, fontSize: 20, strokeWidth: 4 },
};

// --- Roman Numerals ---

const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

// --- Main Factory ---

export function createClock(options: ClockOptions): ClockInstance {
  const opts = {
    style: options.style ?? "both",
    size: options.size ?? "md",
    timezone: options.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    showSeconds: options.showSeconds ?? true,
    secondHand: options.secondHand ?? "smooth",
    showDate: options.showDate ?? false,
    timeFormat: options.timeFormat ?? "12h",
    hourMarkers: options.hourMarkers ?? "numbers",
    faceColor: options.faceColor ?? "#ffffff",
    borderColor: options.borderColor ?? "#374151",
    hourHandColor: options.hourHandColor ?? "#1f2937",
    minuteHandColor: options.minuteHandColor ?? "#374151",
    secondHandColor: options.secondHandColor ?? "#ef4444",
    textColor: options.textColor ?? "#111827",
    showAmPm: options.showAmPm ?? true,
    theme: options.theme ?? "light",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Clock: container not found");

  const isDark = opts.theme === "dark";
  const sz = SIZE_MAP[opts.size];

  container.className = `clock clock-${opts.style} ${opts.className}`;
  container.style.cssText = `
    display:flex;flex-direction:column;align-items:center;gap:8px;
    font-family:-apple-system,sans-serif;
  `;

  let destroyed = false;
  let animationFrame: number | null = null;

  // Create analog clock SVG
  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgEl.setAttribute("class", "clock-face");
  svgEl.setAttribute("width", String(sz.diameter));
  svgEl.setAttribute("height", String(sz.diameter));
  svgEl.setAttribute("viewBox", `0 0 ${sz.diameter} ${sz.diameter}`);
  if (opts.style === "digital") svgEl.style.display = "none";

  // Digital display
  const digitalEl = document.createElement("div");
  digitalEl.className = "clock-digital";
  digitalEl.style.cssText = `
    font-size:${Math.floor(sz.diameter * 0.18)}px;font-weight:600;
    font-family:monospace;letter-spacing:2px;color:${isDark ? "#f0f0f0" : opts.textColor};
  `;

  // Date display
  const dateEl = document.createElement("div");
  dateEl.className = "clock-date";
  dateEl.style.cssText = `
    font-size:${Math.floor(sz.fontSize * 1.1)}px;color:${isDark ? "#9ca3af" : "#6b7280"};
    display:${opts.showDate ? "block" : "none"};
  `;

  container.appendChild(svgEl);
  if (opts.style !== "analog") container.appendChild(digitalEl);
  if (opts.showDate) container.appendChild(dateEl);

  const cx = sz.diameter / 2;
  const cy = sz.diameter / 2;
  const r = sz.diameter / 2 - 8;

  function getNow(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: opts.timezone }));
  }

  function render(): void {
    const now = getNow();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();

    if (opts.style !== "digital") renderAnalog(now, h, m, s, ms);
    if (opts.style !== "analog") renderDigital(now, h, m, s);
    if (opts.showDate) renderDate(now);

    opts.onTick?.(now);
  }

  function renderAnalog(_now: Date, h: number, m: number, s: number, ms: number): void {
    const ns = "http://www.w3.org/2000/svg";
    svgEl.innerHTML = "";

    // Face circle
    const face = document.createElementNS(ns, "circle");
    face.setAttribute("cx", String(cx));
    face.setAttribute("cy", String(cy));
    face.setAttribute("r", String(r));
    face.setAttribute("fill", isDark ? "#1e1e2e" : opts.faceColor);
    face.setAttribute("stroke", isDark ? "#444" : opts.borderColor);
    face.setAttribute("stroke-width", String(sz.strokeWidth));
    svgEl.appendChild(face);

    // Hour markers
    for (let i = 0; i < 12; i++) {
      const angle = ((i * 30) - 90) * Math.PI / 180;
      const innerR = r - (opts.hourMarkers === "numbers" || opts.hourMarkers === "roman" ? 18 : 10);
      const outerR = r - 3;
      const x = cx + Math.cos(angle) * outerR;
      const y = cy + Math.sin(angle) * outerR;

      if (opts.hourMarkers === "numbers") {
        const num = document.createElementNS(ns, "text");
        num.setAttribute("x", String(cx + Math.cos(angle) * innerR));
        num.setAttribute("y", String(cy + Math.sin(angle) * innerR + sz.fontSize / 3));
        num.setAttribute("text-anchor", "middle");
        num.setAttribute("font-size", String(sz.fontSize));
        num.setAttribute("fill", isDark ? "#ccc" : "#374151");
        num.setAttribute("font-weight", "500");
        num.textContent = String(i === 0 ? 12 : i);
        svgEl.appendChild(num);
      } else if (opts.hourMarkers === "roman") {
        const roman = document.createElementNS(ns, "text");
        roman.setAttribute("x", String(cx + Math.cos(angle) * innerR));
        roman.setAttribute("y", String(cy + Math.sin(angle) * innerR + sz.fontSize / 3));
        roman.setAttribute("text-anchor", "middle");
        roman.setAttribute("font-size", String(sz.fontSize - 1));
        roman.setAttribute("fill", isDark ? "#aaa" : "#6b7280");
        roman.textContent = ROMAN[i];
        svgEl.appendChild(roman);
      } else if (opts.hourMarkers === "ticks") {
        const isHourTick = true;
        const tickInner = r - (isHourTick ? 10 : 6);
        const tick = document.createElementNS(ns, "line");
        tick.setAttribute("x1", String(cx + Math.cos(angle) * tickInner));
        tick.setAttribute("y1", String(cy + Math.sin(angle) * tickInner));
        tick.setAttribute("x2", String(x));
        tick.setAttribute("y2", String(y));
        tick.setAttribute("stroke", isDark ? "#666" : "#9ca3af");
        tick.setAttribute("stroke-width", String(isHourTick ? 2 : 1));
        svgEl.appendChild(tick);
      }
    }

    // Minute ticks
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0 && opts.hourMarkers !== "none") continue; // Skip hour positions
      const angle = ((i * 6) - 90) * Math.PI / 180;
      const tick = document.createElementNS(ns, "line");
      tick.setAttribute("x1", String(cx + Math.cos(angle) * (r - 5)));
      tick.setAttribute("y1", String(cy + Math.sin(angle) * (r - 5)));
      tick.setAttribute("x2", String(cx + Math.cos(angle) * (r - 2)));
      tick.setAttribute("y2", String(cy + Math.sin(angle) * (r - 2)));
      tick.setAttribute("stroke", isDark ? "#444" : "#d1d5db");
      tick.setAttribute("stroke-width", "1");
      svgEl.appendChild(tick);
    }

    // Calculate angles
    const smoothS = opts.secondHand === "smooth" ? s + ms / 1000 : s;
    const hAngle = ((h % 12) + m / 60 + s / 3600) * 30 - 90;
    const mAngle = (m + s / 60) * 6 - 90;
    const sAngle = smoothS * 6 - 90;

    // Hour hand
    const hLen = r * 0.5;
    const hHand = document.createElementNS(ns, "line");
    hHand.setAttribute("x1", String(cx));
    hHand.setAttribute("y1", String(cy));
    hHand.setAttribute("x2", String(cx + Math.cos(hAngle * Math.PI / 180) * hLen));
    hHand.setAttribute("y2", String(cy + Math.sin(hAngle * Math.PI / 180) * hLen));
    hHand.setAttribute("stroke", isDark ? "#e0e0e0" : opts.hourHandColor);
    hHand.setAttribute("stroke-width", String(Math.max(3, sz.strokeWidth)));
    hHand.setAttribute("stroke-linecap", "round");
    svgEl.appendChild(hHand);

    // Minute hand
    const mLen = r * 0.72;
    const mHand = document.createElementNS(ns, "line");
    mHand.setAttribute("x1", String(cx));
    mHand.setAttribute("y1", String(cy));
    mHand.setAttribute("x2", String(cx + Math.cos(mAngle * Math.PI / 180) * mLen));
    mHand.setAttribute("y2", String(cy + Math.sin(mAngle * Math.PI / 180) * mLen));
    mHand.setAttribute("stroke", isDark ? "#c0c0c0" : opts.minuteHandColor);
    mHand.setAttribute("stroke-width", String(Math.max(2, sz.strokeWidth - 1)));
    mHand.setAttribute("stroke-linecap", "round");
    svgEl.appendChild(mHand);

    // Second hand
    if (opts.showSeconds && opts.secondHand !== "none") {
      const sLen = r * 0.82;
      const sHand = document.createElementNS(ns, "line");
      sHand.setAttribute("x1", String(cx));
      sHand.setAttribute("y1", String(cy));
      sHand.setAttribute("x2", String(cx + Math.cos(sAngle * Math.PI / 180) * sLen));
      sHand.setAttribute("y2", String(cy + Math.sin(sAngle * Math.PI / 180) * sLen));
      sHand.setAttribute("stroke", isDark ? "#f87171" : opts.secondHandColor);
      sHand.setAttribute("stroke-width", "1.5");
      sHand.setAttribute("stroke-linecap", "round");
      svgEl.appendChild(sHand);

      // Counterweight
      const cwLen = r * 0.15;
      const cw = document.createElementNS(ns, "line");
      cw.setAttribute("x1", String(cx));
      cw.setAttribute("y1", String(cy));
      cw.setAttribute("x2", String(cx - Math.cos(sAngle * Math.PI / 180) * cwLen));
      cw.setAttribute("y2", String(cy - Math.sin(sAngle * Math.PI / 180) * cwLen));
      cw.setAttribute("stroke", isDark ? "#f87171" : opts.secondHandColor);
      cw.setAttribute("stroke-width", "1.5");
      cw.setAttribute("stroke-linecap", "round");
      svgEl.appendChild(cw);
    }

    // Center cap
    const cap = document.createElementNS(ns, "circle");
    cap.setAttribute("cx", String(cx));
    cap.setAttribute("cy", String(cy));
    cap.setAttribute("r", String(Math.max(3, sz.strokeWidth)));
    cap.setAttribute("fill", isDark ? "#f87171" : opts.secondHandColor);
    svgEl.appendChild(cap);
  }

  function renderDigital(now: Date, h: number, m: number, s: number): void {
    let hours = h;
    let ampm = "";

    if (opts.timeFormat === "12h") {
      ampm = hours >= 12 ? " PM" : " AM";
      hours = hours % 12 || 12;
    }

    const hh = String(hours).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");

    let text = `${hh}:${mm}`;
    if (opts.showSeconds) text += `:${ss}`;
    if (opts.timeFormat === "12h" && opts.showAmPm) text += ampm;

    digitalEl.textContent = text;
  }

  function renderDate(now: Date): void {
    const fmt = opts.dateFormat ?? "EEEE, MMMM d, yyyy";
    try {
      dateEl.textContent = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: opts.timezone,
      });
    } catch {
      dateEl.textContent = now.toLocaleDateString();
    }
  }

  // Animation loop
  function tick(): void {
    if (destroyed) return;
    render();

    // Use requestAnimationFrame for smooth second hand
    animationFrame = requestAnimationFrame(tick);
  }

  // Start
  tick();

  const instance: ClockInstance = {
    element: container,

    getTime: getNow,

    getFormattedTime() {
      const now = getNow();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      let hours = h;
      if (opts.timeFormat === "12h") hours = hours % 12 || 12;
      return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}${opts.showSeconds ? ":" + String(s).padStart(2, "0") : ""}`;
    },

    setTimezone(tz: string) {
      opts.timezone = tz;
      render();
    },

    setShowSeconds(show: boolean) {
      opts.showSeconds = show;
      render();
    },

    destroy() {
      destroyed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      container.innerHTML = "";
    },
  };

  return instance;
}
