/**
 * Time Picker: 12h/24h time selection with hour/minute/second controls,
 * step buttons, keyboard input, AM/PM toggle, validation, and formatting.
 */

// --- Types ---

export type TimeFormat = "12h" | "24h";
export type TimePickerMode = "hour-minute" | "hour-minute-second" | "full";

export interface TimePickerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial value (HH:mm or HH:mm:ss) */
  value?: string;
  /** Time format */
  format?: TimeFormat;
  /** Display mode */
  mode?: TimePickerMode;
  /** Step for hours (default: 1) */
  hourStep?: number;
  /** Step for minutes (default: 1) */
  minuteStep?: number;
  /** Step for seconds (default: 1) */
  secondStep?: number;
  /** Minimum time (e.g., "08:00") */
  minTime?: string;
  /** Maximum time (e.g., "22:00") */
  maxTime?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Show seconds? */
  showSeconds?: boolean;
  /** Callback on change */
  onChange?: (value: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TimePickerInstance {
  element: HTMLElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getHours: () => number;
  getMinutes: () => number;
  getSeconds: () => number;
  setHours: (h: number) => void;
  setMinutes: (m: number) => void;
  setSeconds: (s: number) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Helpers ---

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function parseTime(value: string): { h: number; m: number; s: number } {
  const parts = value.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;
  return { h: Math.max(0, Math.min(23, h)), m: Math.max(0, Math.min(59, m)), s: Math.max(0, Math.min(59, s)) };
}

function formatTime(h: number, m: number, s: number, showSec: boolean): string {
  if (showSec) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(h)}:${pad2(m)}`;
}

function to12h(h: number): { h: number; ampm: "AM" | "PM" } {
  if (h === 0) return { h: 12, ampm: "AM" };
  if (h === 12) return { h: 12, ampm: "PM" };
  if (h > 12) return { h: h - 12, ampm: "PM" };
  return { h, ampm: "AM" };
}

function from12h(h: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function clampVal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// --- Main Factory ---

export function createTimePicker(options: TimePickerOptions): TimePickerInstance {
  const opts = {
    value: options.value ?? "00:00",
    format: options.format ?? "24h",
    mode: options.mode ?? "hour-minute",
    hourStep: options.hourStep ?? 1,
    minuteStep: options.minuteStep ?? 1,
    secondStep: options.secondStep ?? 1,
    minTime: options.minTime,
    maxTime: options.maxTime,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    showSeconds: options.showSeconds ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TimePicker: container not found");

  let { h, m, s } = parseTime(opts.value);
  let isPM = h >= 12;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `time-picker ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-flex;align-items:center;gap:4px;
    font-family:-apple-system,sans-serif;font-size:14px;color:#374151;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;
  container.appendChild(wrapper);

  // --- Hour control ---
  const hourCtrl = createSpinnerControl(
    opts.format === "12h" ? to12h(h).h : h,
    0, opts.format === "12h" ? 12 : 23, opts.hourStep,
    (val) => {
      if (opts.format === "12h") {
        h = from12h(val, isPM ? "PM" : "AM");
      } else {
        h = val;
      }
      updateDisplay();
      opts.onChange?.(formatTime(h, m, s, opts.showSeconds));
    },
    opts.readOnly,
  );
  wrapper.appendChild(hourCtrl);

  // Colon separator
  const colon1 = document.createElement("span");
  colon1.textContent = ":";
  colon1.style.cssText = "font-weight:600;font-size:16px;";
  wrapper.appendChild(colon1);

  // --- Minute control ---
  const minCtrl = createSpinnerControl(m, 0, 59, opts.minuteStep,
    (val) => { m = val; updateDisplay(); opts.onChange?.(formatTime(h, m, s, opts.showSeconds)); },
    opts.readOnly,
  );
  wrapper.appendChild(minCtrl);

  // Seconds
  let secCtrl: HTMLElement | null = null;
  let colon2: HTMLElement | null = null;
  if (opts.showSeconds || opts.mode === "hour-minute-second" || opts.mode === "full") {
    colon2 = document.createElement("span");
    colon2.textContent = ":";
    colon2.style.cssText = "font-weight:600;font-size:16px;";
    wrapper.appendChild(colon2);

    secCtrl = createSpinnerControl(s, 0, 59, opts.secondStep,
      (val) => { s = val; updateDisplay(); opts.onChange?.(formatTime(h, m, s, true)); },
      opts.readOnly,
    );
    wrapper.appendChild(secCtrl);
  }

  // AM/PM toggle for 12h format
  let ampmEl: HTMLElement | null = null;
  if (opts.format === "12h") {
    ampmEl = document.createElement("button");
    ampmEl.type = "button";
    ampmEl.textContent = isPM ? "PM" : "AM";
    ampmEl.style.cssText = `
      padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;background:#fff;
      cursor:pointer;font-size:13px;font-weight:600;color:#4338ca;
      transition:all 0.15s;min-width:48px;
    `;
    ampmEl.addEventListener("click", () => {
      isPM = !isPM;
      h = from12h(to12h(h).h, isPM ? "PM" : "AM");
      ampmEl!.textContent = isPM ? "PM" : "AM";
      hourCtrl.updateDisplay(opts.format === "12h" ? to12h(h).h : h);
      updateDisplay();
      opts.onChange?.(formatTime(h, m, s, opts.showSeconds));
    });
    ampmEl.addEventListener("mouseenter", () => { ampmEl!.style.background = "#eef2ff"; });
    ampmEl.addEventListener("mouseleave", () => { ampmEl!.style.background = ""; });
    wrapper.appendChild(ampmEl);
  }

  function updateDisplay(): void {
    hourCtrl.updateDisplay(opts.format === "12h" ? to12h(h).h : h);
    minCtrl.updateDisplay(m);
    if (secCtrl) secCtrl.updateDisplay(s);
  }

  function validate(): boolean {
    if (!opts.minTime && !opts.maxTime) return true;
    const totalSecs = h * 3600 + m * 60 + s;
    if (opts.minTime) {
      const { h: mh, m: mm, s: ms } = parseTime(opts.minTime);
      if (totalSecs < mh * 3600 + mm * 60 + ms) return false;
    }
    if (opts.maxTime) {
      const { h: Mh, m: Mm, s: Ms } = parseTime(opts.maxTime);
      if (totalSecs > Mh * 3600 + Mm * 60 + Ms) return false;
    }
    return true;
  }

  const instance: TimePickerInstance = {
    element: wrapper,

    getValue() { return formatTime(h, m, s, opts.showSeconds); },

    setValue(val: string) {
      ({ h, m, s } = parseTime(val));
      isPM = h >= 12;
      if (ampmEl) ampmEl.textContent = isPM ? "PM" : "AM";
      updateDisplay();
    },

    getHours() { return h; },
    getMinutes() { return m; },
    getSeconds() { return s; },

    setHours(newH: number) { h = clampVal(newH, 0, 23); updateDisplay(); opts.onChange?.(formatTime(h, m, s, opts.showSeconds)); },
    setMinutes(newM: number) { m = clampVal(newM, 0, 59); updateDisplay(); opts.onChange?.(formatTime(h, m, s, opts.showSeconds)); },
    setSeconds(newS: number) { s = clampVal(newS, 0, 59); updateDisplay(); opts.onChange?.(formatTime(h, m, s, true)); },

    disable() {
      opts.disabled = true;
      wrapper.style.opacity = "0.5";
      wrapper.style.pointerEvents = "none";
    },

    enable() {
      opts.disabled = false;
      wrapper.style.opacity = "";
      wrapper.style.pointerEvents = "";
    },

    destroy() { wrapper.remove(); },
  };

  return instance;
}

// --- Spinner Control Helper ---

interface SpinnerControl {
  HTMLElement;
  updateDisplay: (value: number) => void;
}

function createSpinnerControl(
  initialValue: number,
  min: number,
  max: number,
  step: number,
  onChange: (value: number) => void,
  readOnly: boolean,
): SpinnerControl {
  const el = document.createElement("div");
  el.style.cssText = `
    display:inline-flex;flex-direction:column;align-items:center;gap:0;
    background:#fff;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;
  `;

  const decBtn = document.createElement("button");
  decBtn.type = "button";
  decBtn.innerHTML = "&minus;";
  decBtn.style.cssText = `
    background:#f9fafb;border:none;cursor:pointer;padding:3px 10px;font-size:11px;
    color:#666;line-height:1;transition:background 0.15s;width:100%;
    ${readOnly ? "pointer-events:none;" : ""}
  `;

  const display = document.createElement("input");
  display.type = "text";
  display.value = pad2(initialValue);
  display.readOnly = true;
  display.style.cssText = `
    width:36px;text-align:center;border:none;outline:none;font-size:15px;
    font-weight:600;padding:4px 0;background:transparent;-moz-appearance:textfield;
  `;

  const incBtn = document.createElement("button");
  incBtn.type = "button";
  incBtn.innerHTML = "+";
  incBtn.style.cssText = `
    background:#f9fafb;border:none;cursor:pointer;padding:3px 10px;font-size:11px;
    color:#666;line-height:1;transition:background 0.15s;width:100%;
    ${readOnly ? "pointer-events:none;" : ""}
  `;

  el.append(decBtn, display, incBtn);

  let currentValue = initialValue;

  decBtn.addEventListener("click", () => {
    currentValue -= step;
    if (currentValue < min) currentValue = max; // Wrap around
    display.value = pad2(currentValue);
    onChange(currentValue);
  });

  incBtn.addEventListener("click", () => {
    currentValue += step;
    if (currentValue > max) currentValue = min; // Wrap around
    display.value = pad2(currentValue);
    onChange(currentValue);
  });

  decBtn.addEventListener("mouseenter", () => { if (!readOnly) decBtn.style.background = "#e5e7eb"; });
  decBtn.addEventListener("mouseleave", () => { decBtn.style.background = ""; });
  incBtn.addEventListener("mouseenter", () => { if (!readOnly) incBtn.style.background = "#e5e7eb"; });
  incBtn.addEventListener("mouseleave", () => { incBtn.style.background = ""; });

  return {
    HTMLElement: el,
    updateDisplay(v: number) { currentValue = v; display.value = pad2(v); },
  };
}
