/**
 * Time Range Picker: Start/end time selection with 12h/24h formats,
 * step intervals, min/max constraints, presets (business hours, etc.),
 * keyboard input validation, and accessible semantics.
 */

// --- Types ---

export type TimeFormat = "12h" | "24h";
export type TimeStep = "1m" | "5m" | "10m" | "15m" | "30m" | "1h";

export interface TimeValue {
  hours: number;
  minutes: number;
}

export interface TimeRangePreset {
  label: string;
  start: TimeValue;
  end: TimeValue;
}

export interface TimeRangePickerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial start time */
  startTime?: TimeValue | string;
  /** Initial end time */
  endTime?: TimeValue | string;
  /** Time format */
  format?: TimeFormat;
  /** Minute step increment */
  step?: TimeStep;
  /** Minimum selectable time */
  minTime?: TimeValue | string;
  /** Maximum selectable time */
  maxTime?: TimeValue | string;
  /** Preset ranges */
  presets?: TimeRangePreset[];
  /** Show preset buttons? */
  showPresets?: boolean;
  /** Show seconds? */
  showSeconds?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Callback on range change */
  onChange?: (start: TimeValue | null, end: TimeValue | null) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TimeRangePickerInstance {
  element: HTMLElement;
  getStartTime: () => TimeValue | null;
  getEndTime: () => TimeValue | null;
  setRange: (start: TimeValue | null, end: TimeValue | null) => void;
  clear: () => void;
  destroy: () => void;
}

// --- Helpers ---

const STEP_MINUTES: Record<TimeStep, number> = {
  "1m": 1, "5m": 5, "10m": 10, "15m": 15, "30m": 30, "1h": 60,
};

function parseTimeValue(v: TimeValue | string | undefined): TimeValue | null {
  if (!v) return null;
  if (typeof v === "string") {
    const match = v.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    return { hours: parseInt(match[1]!, 10), minutes: parseInt(match[2]!, 10) };
  }
  return { hours: v.hours, minutes: v.minutes };
}

function formatTime(tv: TimeValue, fmt: TimeFormat): string {
  const h = tv.hours % 24;
  if (fmt === "24h") {
    return `${String(h).padStart(2, "0")}:${String(tv.minutes).padStart(2, "0")}`;
  }
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(tv.minutes).padStart(2, "0")} ${period}`;
}

function timeToMinutes(tv: TimeValue): number {
  return tv.hours * 60 + tv.minutes;
}

function minutesToTime(m: number): TimeValue {
  return { hours: Math.floor(m / 60) % 24, minutes: m % 60 };
}

function clampTime(tv: TimeValue, minT: TimeValue | null, maxT: TimeValue | null): TimeValue {
  let mins = timeToMinutes(tv);
  if (minT) mins = Math.max(mins, timeToMinutes(minT));
  if (maxT) mins = Math.min(mins, timeToMinutes(maxT));
  return minutesToTime(mins);
}

const DEFAULT_PRESETS: TimeRangePreset[] = [
  { label: "All day", start: { hours: 0, minutes: 0 }, end: { hours: 23, minutes: 59 } },
  { label: "Morning", start: { hours: 6, minutes: 0 }, end: { hours: 11, minutes: 59 } },
  { label: "Afternoon", start: { hours: 12, minutes: 0 }, end: { hours: 17, minutes: 59 } },
  { label: "Evening", start: { hours: 18, minutes: 0 }, end: { hours: 21, minutes: 59 } },
  { label: "Business hours", start: { hours: 9, minutes: 0 }, end: { hours: 17, minutes: 0 } },
];

// --- Main Factory ---

export function createTimeRangePicker(options: TimeRangePickerOptions): TimeRangePickerInstance {
  const opts = {
    format: options.format ?? "24h",
    step: options.step ?? "30m",
    showPresets: options.showPresets ?? true,
    showSeconds: options.showSeconds ?? false,
    disabled: options.disabled ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TimeRangePicker: container not found");

  let startTime = parseTimeValue(options.startTime);
  let endTime = parseTimeValue(options.endTime);
  const minT = parseTimeValue(options.minTime);
  const maxT = parseTimeValue(options.maxTime);
  let destroyed = false;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `time-range-picker ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-flex;flex-direction:column;gap:8px;
    font-family:-apple-system,sans-serif;color:#374151;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;
  container.appendChild(wrapper);

  // Input row
  const inputRow = document.createElement("div");
  inputRow.style.cssText = "display:flex;align-items:center;gap:8px;";

  // Start time input
  const startInput = createSpinnerInput("start", opts.format, opts.step, minT, maxT, (v) => {
    startTime = v;
    validateOrder();
    opts.onChange?.(startTime, endTime);
  });
  inputRow.appendChild(startInput.wrapper);

  // Separator
  const sep = document.createElement("span");
  sep.textContent = "\u2014";
  sep.style.cssText = "color:#9ca3af;font-weight:500;";
  inputRow.appendChild(sep);

  // End time input
  const endInput = createSpinnerInput("end", opts.format, opts.step, minT, maxT, (v) => {
    endTime = v;
    validateOrder();
    opts.onChange?.(startTime, endTime);
  });
  inputRow.appendChild(endInput.wrapper);

  wrapper.appendChild(inputRow);

  // Presets
  if (opts.showPresets) {
    const presetRow = document.createElement("div");
    presetRow.className = "trp-presets";
    presetRow.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;";
    for (const preset of (opts.presets ?? DEFAULT_PRESETS)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = preset.label;
      btn.style.cssText = `
        padding:4px 10px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;
        cursor:pointer;font-size:11px;color:#6b7280;transition:all 0.15s;
      `;
      btn.addEventListener("click", () => {
        setRange(preset.start, preset.end);
      });
      btn.addEventListener("mouseenter", () => { btn.style.background = "#f9fafb"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
      presetRow.appendChild(btn);
    }
    wrapper.appendChild(presetRow);
  }

  function createSpinnerInput(
    id: string,
    fmt: TimeFormat,
    step: TimeStep,
    minT: TimeValue | null,
    maxT: TimeValue | null,
    onChange: (v: TimeValue) => void,
  ): { wrapper: HTMLElement; setValue: (v: TimeValue) => void } {
    const w = document.createElement("div");
    w.style.cssText = "display:flex;align-items:center;gap:4px;";

    const inp = document.createElement("input");
    inp.type = "text";
    inp.spellcheck = false;
    inp.placeholder = "--:--";
    inp.style.cssText = `
      width:90px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;
      text-align:center;font-size:13px;font-family:monospace;outline:none;
      transition:border-color 0.15s;
    `;

    const currentVal = id === "start" ? startTime : endTime;
    inp.value = currentVal ? formatTime(currentVal, fmt) : "";

    inp.addEventListener("change", () => {
      const parsed = parseTimeValue(inp.value);
      if (parsed) {
        const clamped = clampTime(parsed, minT, maxT);
        inp.value = formatTime(clamped, fmt);
        onChange(clamped);
      } else {
        inp.value = currentVal ? formatTime(currentVal, fmt) : "";
      }
    });

    inp.addEventListener("focus", () => { inp.style.borderColor = "#6366f1"; });
    inp.addEventListener("blur", () => { inp.style.borderColor = ""; });

    // Increment/decrement buttons
    const stepMins = STEP_MINUTES[step];

    const decBtn = document.createElement("button");
    decBtn.type = "button";
    decBtn.innerHTML = "&#9660;";
    decBtn.style.cssText = `
      width:26px;height:28px;border:1px solid #d1d5db;border-radius:4px;
      background:#fff;cursor:pointer;font-size:10px;display:flex;
      align-items:center;justify-content:center;
    `;
    decBtn.addEventListener("click", () => {
      const cur = parseTimeValue(inp.value) ?? { hours: 12, minutes: 0 };
      let newMins = timeToMinutes(cur) - stepMins;
      if (newMins < 0) newMins += 24 * 60;
      const nv = clampTime(minutesToTime(newMins), minT, maxT);
      inp.value = formatTime(nv, fmt);
      onChange(nv);
    });

    const incBtn = document.createElement("button");
    incBtn.type = "button";
    incBtn.innerHTML = "&#9650;";
    incBtn.style.cssText = decBtn.style.cssText;
    incBtn.addEventListener("click", () => {
      const cur = parseTimeValue(inp.value) ?? { hours: 12, minutes: 0 };
      let newMins = timeToMinutes(cur) + stepMins;
      if (newMins >= 24 * 60) newMins -= 24 * 60;
      const nv = clampTime(minutesToTime(newMins), minT, maxT);
      inp.value = formatTime(nv, fmt);
      onChange(nv);
    });

    w.appendChild(decBtn);
    w.appendChild(inp);
    w.appendChild(incBtn);

    return {
      wrapper: w,
      setValue(v: TimeValue) {
        inp.value = formatTime(v, fmt);
      },
    };
  }

  function setRange(start: TimeValue, end: TimeValue): void {
    startTime = start;
    endTime = end;
    startInput.setValue(startTime!);
    endInput.setValue(endTime!);
    opts.onChange?.(startTime, endTime);
  }

  function validateOrder(): void {
    if (startTime && endTime) {
      if (timeToMinutes(startTime) > timeToMinutes(endTime)) {
        // Swap or adjust
        endTime = startTime;
        endInput.setValue(endTime!);
      }
    }
  }

  const instance: TimeRangePickerInstance = {
    element: wrapper,

    getStartTime() { return startTime; },
    getEndTime() { return endTime; },

    setRange(start: TimeValue | null, end: TimeValue | null) {
      startTime = start;
      endTime = end;
      if (start) startInput.setValue(start);
      if (end) endInput.setValue(end);
      opts.onChange?.(startTime, endTime);
    },

    clear() {
      startTime = null;
      endTime = null;
      startInput.setValue({ hours: 0, minutes: 0 });
      endInput.setValue({ hours: 0, minutes: 0 });
      opts.onChange?.(null, null);
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
    },
  };

  return instance;
}
