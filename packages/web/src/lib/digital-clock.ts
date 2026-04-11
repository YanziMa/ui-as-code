/**
 * Digital Clock: Digital clock display with 7-segment LED style digits,
 * optional colon blink, date display, size variants, and customizable
 * colors.
 */

// --- Types ---

export type DigitStyle = "segment7" | "dot-matrix" | "lcd" | "minimal";
export type SizeVariant = "small" | "medium" | "large";

export interface DigitalClockOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Digit style */
  digitStyle?: DigitStyle;
  /** Size variant */
  size?: SizeVariant;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Segment on color (for LED/LCD styles) */
  segmentOnColor?: string;
  /** Segment off color */
  segmentOffColor?: string;
  /** Text color (for minimal style) */
  textColor?: string;
  /** Colon color */
  colonColor?: string;
  /** Blink colons? */
  blinkColons?: boolean;
  /** Show seconds? */
  showSeconds?: boolean;
  /** Show AM/PM indicator? */
  showPeriod?: boolean;
  /** Show date? */
  showDate?: boolean;
  /** Date format */
  dateFormat?: string;
  /** 12-hour or 24-hour format */
  hour12?: boolean;
  /** Time zone offset (seconds from UTC) */
  timezoneOffset?: number;
  /** Use custom time instead of system clock? */
  customTime?: Date | null;
  /** Background color */
  background?: string;
  /** Padding around display */
  padding?: number;
  /** Border radius */
  borderRadius?: number;
  /** Glow effect (for LED style)? */
  glow?: boolean;
  /** Glow color */
  glowColor?: string;
  /** Update interval (ms) */
  updateInterval?: number;
  /** Custom CSS class */
  className?: string;
  /** Time change callback */
  onChange?: (timeStr: string, date: Date) => void;
}

export interface DigitalClockInstance {
  element: HTMLElement;
  /** Set custom time */
  setTime: (date: Date) => void;
  /** Resume system time */
  useSystemTime: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- 7-Segment Font Maps ---

const SEGMENT_MAP: Record<string, number[]> = {
  "0": [1,1,1,1,1,1,0], "1": [0,0,1,1,0,0,0], "2": [1,1,0,1,1,0,1],
  "3": [1,1,1,1,0,0,1], "4": [0,1,1,0,0,0,0],
  "5": [1,0,1,1,0,1,1], "6": [1,0,1,1,1,1,1],
  "7": [1,1,1,0,0,0,0], "8": [1,1,1,1,1,1,1],
  "9": [1,1,1,1,0,1,1], ":": [0,0,0,0,0,0,1],
};

// Segment positions: [top, upper-right, lower-right, bottom, lower-left, upper-left, middle]

function buildDigit7(segments: number[], onColor: string, offColor: string, sw: number, sh: number, glow: boolean, glowColor: string): string {
  const [t, ur, lr, b, ll, ul, m] = segments;
  const segW = sw * 0.75;
  const segH = sh * 0.08;
  const gap = sh * 0.05;
  const g = glow ? `filter:drop-shadow(0 0 4px ${glowColor});` : "";

  return `
    <svg viewBox="0 0 ${sw} ${sh}" style="display:block;width:${sw}px;height:${sh}px;${g}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${sw}" height="${sh}" rx="${sh * 0.05}" fill="${offColor}"/>
      ${t ? `<rect x="${gap}" y="${gap}" width="${segW}" height="${segH}" fill="${onColor}" rx="1"/>` : ""}
      ${ur ? `<rect x="${sw - gap - segW}" y="${gap}" width="${segW}" height="${segH}" fill="${onColor}" rx="1"/>` : ""}
      ${lr ? `<rect x="${sw - gap - segW}" y="${sh - gap - segH}" width="${segW}" height="${segH}" fill="${onColor}" rx="1"/>` : ""}
      ${b ? `<rect x="${gap}" y="${sh - gap - segH}" width="${segW}" height="${segH}" fill="${onColor}" rx="1"/>` : ""}
      ${ll ? `<rect x="${gap}" y="${sh - gap - segH}" width="${segW}" height="${segH}" fill="${onColor}" rx="1"/>` : ""}
      ${ul ? `<rect x="${gap}" y="${gap}" width="${segW}" height="${segH}" fill="${onColor}" rx="1"/>` : ""}
      ${m ? `<rect x="${sw * 0.25}" y="${sh * 0.35}" width="${sw * 0.5}" height="${segH}" fill="${onColor}" rx="1"/>` : ""}
    </svg>
  `;
}

// --- Main Factory ---

export function createDigitalClock(options: DigitalClockOptions): DigitalClockInstance {
  const opts = {
    digitStyle: options.digitStyle ?? "segment7",
    size: options.size ?? "medium",
    width: options.width ?? 300,
    height: options.height ?? 80,
    segmentOnColor: options.segmentOnColor ?? "#ff3b30",
    segmentOffColor: options.segmentOffColor ?? "#1a0a18",
    textColor: options.textColor ?? "#eab308",
    colonColor: options.colonColor ?? "#ff3b30",
    blinkColons: options.blinkColons ?? true,
    showSeconds: options.showSeconds ?? true,
    showPeriod: options.showPeriod ?? false,
    showDate: options.showDate ?? false,
    dateFormat: options.dateFormat ?? "EEE, MMM d",
    hour12: options.hour12 ?? false,
    timezoneOffset: options.timezoneOffset ?? 0,
    customTime: options.customTime ?? null,
    background: options.background ?? "#0a0a14",
    padding: options.padding ?? 12,
    borderRadius: options.borderRadius ?? 8,
    glow: options.glow ?? true,
    glowColor: options.glowColor ?? "rgba(255,59,48,0.5)",
    updateInterval: options.updateInterval ?? 500,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DigitalClock: container not found");

  let destroyed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let colonVisible = true;

  // Sizing
  const sizes: Record<SizeVariant, { w: number; h: number; fontSize: number }> = {
    small: { w: 160, h: 40, fontSize: 16 },
    medium: { w: 300, h: 70, fontSize: 24 },
    large: { w: 450, h: 110, fontSize: 36 },
  };
  const sz = sizes[opts.size];

  // Root
  const root = document.createElement("div");
  root.className = `digital-clock ${opts.className}`;
  root.style.cssText = `
    display:inline-flex;flex-direction:column;align-items:center;justify-content:center;
    gap:${opts.padding / 2}px;padding:${opts.padding}px;
    background:${opts.background};border-radius:${opts.borderRadius}px;
    font-family:'Courier New',monospace;
  `;
  container.appendChild(root);

  // Digits container
  const digitsWrap = document.createElement("div");
  digitsWrap.style.cssText = "display:flex;align-items:center;gap:2px;";
  root.appendChild(digitsWrap);

  // Create digit slots
  const digitEls: HTMLDivElement[] = [];
  const totalDigits = opts.showSeconds ? 8 : (opts.hour12 ? 6 : 7); // HH:MM:SS or H:MM:SS

  for (let i = 0; i < totalDigits; i++) {
    if (i === 2 || i === 5) { // Colons
      const colon = document.createElement("span");
      colon.className = "digit-colon";
      colon.innerHTML = ":";
      colon.style.cssText = `
        font-size:${sz.fontSize * 1.2}px;font-weight:900;color:${opts.colonColor};
        transition:opacity 0.1s;line-height:1;
      `;
      digitsWrap.appendChild(colon);
      digitEls.push(colon as any);
    } else {
      const slot = document.createElement("div");
      slot.className = "digit-slot";
      slot.style.cssText = `width:${sz.w / (totalDigits / 2)}px;height:${sz.h}px;overflow:hidden;`;
      digitsWrap.appendChild(slot);
      digitEls.push(slot);
    }
  }

  // Period/Date label
  const subLabel = document.createElement("div");
  subLabel.className = "clock-sub-label";
  subLabel.style.cssText = `font-size:11px;color:#64748b;text-align:center;min-height:14px;`;
  root.appendChild(subLabel);

  // --- Rendering ---

  function render(): void {
    const now = opts.customTime ?? new Date(Date.now() + opts.timezoneOffset * 1000);
    let h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    if (opts.hour12) { h = h % 12 || 12; }

    const h1 = Math.floor(h / 10);
    const h2 = h % 10;
    const m1 = Math.floor(m / 10);
    const m2 = m % 10;
    const s1 = Math.floor(s / 10);
    const s2 = s % 10;

    const digits = opts.hour12
      ? [h1, h2, m1, m2, ...(opts.showSeconds ? [s1, s2] : [])]
      : [Math.floor(h / 10), h % 10, m1, m2, ...(opts.showSeconds ? [s1, s2] : [])];

    let di = 0;
    for (let i = 0; i < digitEls.length; i++) {
      const el = digitEls[i]!;
      if (el.classList.contains("digit-colon")) {
        el.style.opacity = (opts.blinkColons && !colonVisible) ? "0.2" : "1";
        continue;
      }

      const d = digits[di++] ?? 0;
      switch (opts.digitStyle) {
        case "segment7":
          el.innerHTML = buildDigit7(
            SEGMENT_MAP[String(d)] ?? SEGMENT_MAP["0"],
            opts.segmentOnColor, opts.segmentOffColor,
            el.clientWidth || sz.w / 8, el.clientHeight || sz.h,
            opts.glow, opts.glowColor
          );
          break;
        case "lcd":
          el.style.cssText = `
            background:#001a00;border-radius:3px;display:flex;
            align-items:center;justify-content:center;
            font-size:${sz.fontSize}px;font-weight:700;
            color:${opts.segmentOnColor};font-family:monospace;
            letter-spacing:-1px;
          `;
          el.textContent = String(d);
          break;
        case "minimal":
          el.style.cssText = `
            font-size:${sz.fontSize}px;font-weight:800;
            font-family:monospace;color:${opts.textColor};
            min-width:20px;text-align:center;
          `;
          el.textContent = String(d);
          break;
        default:
          el.textContent = String(d);
      }
    }

    // Period
    if (opts.showPeriod) {
      subLabel.textContent = now.getHours() >= 12 ? "PM" : "AM";
    } else if (opts.showDate) {
      subLabel.textContent = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } else {
      subLabel.textContent = "";
    }

    opts.onChange?.(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}${opts.showSeconds ? `:${String(s).padStart(2, "0")}` : ""}`,
      now
    );
  }

  // --- Timer ---

  function startTimer(): void {
    stopTimer();
    timer = setInterval(() => {
      if (destroyed) { stopTimer(); return; }
      if (opts.blinkColons) colonVisible = !colonVisible;
      render();
    }, opts.updateInterval);
  }

  function stopTimer(): void {
    if (timer != null) { clearInterval(timer); timer = null; }
  }

  // Init
  render();
  startTimer();

  // --- Public API ---

  const instance: DigitalClockInstance = {
    element: root,

    setTime(date: Date) {
      opts.customTime = date;
      render();
    },

    useSystemTime() {
      opts.customTime = null;
    },

    destroy() {
      destroyed = true;
      stopTimer();
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
