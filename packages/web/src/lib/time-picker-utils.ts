/**
 * Time Picker Utilities: Time picker with 12/24 hour format, minute
 * increments, AM/PM toggle, keyboard input, time range constraints,
 * and ARIA spinbutton support.
 */

// --- Types ---

export type TimePickerSize = "sm" | "md" | "lg";
export type TimeFormat = "12h" | "24h";

export interface TimeValue {
  /** Hour (0-23) */
  hours: number;
  /** Minutes (0-59) */
  minutes: number;
  /** Seconds (0-59) */
  seconds?: number;
}

export interface TimePickerOptions {
  /** Initial time value */
  value?: TimeValue | string;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Time format */
  format?: TimeFormat;
  /** Minute step (1, 5, 10, 15, 30) */
  minuteStep?: number;
  /** Show seconds? */
  showSeconds?: boolean;
  /** Minimum selectable time */
  minTime?: TimeValue | string;
  /** Maximum selectable time */
  maxTime?: TimeValue | string;
  /** Disabled? */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Size variant */
  size?: TimePickerSize;
  /** On change callback */
  onChange?: (time: TimeValue) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface TimePickerInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Get current time value */
  getValue(): TimeValue;
  /** Set time programmatically */
  setValue(time: TimeValue | string): void;
  /** Clear selection */
  clear(): void;
  /** Open the picker popup */
  open(): void;
  /** Close the picker popup */
  close(): void;
  /** Check if open */
  isOpen(): boolean;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Helpers ---

function parseTime(value: TimeValue | string | undefined): TimeValue {
  if (!value) return { hours: 12, minutes: 0 };
  if (typeof value === "string") {
    const match = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const s = match[3] ? parseInt(match[3], 10) : undefined;
      const period = match[4]?.toLowerCase();
      if (period === "pm" && h < 12) h += 12;
      if (period === "am" && h === 12) h = 0;
      return { hours: h, minutes: m, seconds: s };
    }
    return { hours: 12, minutes: 0 };
  }
  return value;
}

function clampTime(time: TimeValue, min?: TimeValue, max?: TimeValue): TimeValue {
  let result = { ...time };

  if (min && compareTime(result, min) < 0) result = { ...min };
  if (max && compareTime(result, max) > 0) result = { ...max };

  return result;
}

function compareTime(a: TimeValue, b: TimeValue): number {
  if (a.hours !== b.hours) return a.hours - b.hours;
  if (a.minutes !== b.minutes) return a.minutes - b.minutes;
  return (a.seconds ?? 0) - (b.seconds ?? 0);
}

function padZero(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

function formatTimeDisplay(time: TimeValue, fmt: TimeFormat, showSecs: boolean): string {
  if (fmt === "24h") {
    return `${padZero(time.hours)}:${padZero(time.minutes)}${showSecs ? ":" + padZero(time.seconds ?? 0) : ""}`;
  }
  const h12 = time.hours % 12 || 12;
  const period = time.hours >= 12 ? "PM" : "AM";
  return `${padZero(h12)}:${padZero(time.minutes)}${showSecs ? ":" + padZero(time.seconds ?? 0) : ""} ${period}`;
}

// --- Core Factory ---

/**
 * Create a time picker component.
 *
 * @example
 * ```ts
 * const tp = createTimePicker({
 *   value: "14:30",
 *   format: "24h",
 *   minuteStep: 15,
 *   onChange: (t) => console.log(t),
 * });
 * ```
 */
export function createTimePicker(options: TimePickerOptions = {}): TimePickerInstance {
  const {
    value,
    label,
    placeholder = "Select time",
    format = "24h",
    minuteStep = 5,
    showSeconds = false,
    minTime,
    maxTime,
    disabled = false,
    fullWidth = true,
    size = "md",
    onChange,
    className,
    container,
  } = options;

  let _time = parseTime(value);
  let _open = false;

  // Clamp initial value
  _time = clampTime(_time, parseTime(minTime), parseTime(maxTime));

  // Root
  const root = document.createElement("div");
  root.className = `timepicker-wrapper ${size} ${className ?? ""}`.trim();
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "4px";
  root.style.width = fullWidth ? "100%" : "fit-content";
  root.style.position = "relative";

  // Label
  if (label) {
    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size:13px;font-weight:500;color:#374151;";
    root.appendChild(labelEl);
  }

  // Trigger
  const trigger = document.createElement("div");
  trigger.className = "timepicker-trigger";
  trigger.tabIndex = disabled ? -1 : 0;
  trigger.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:7px 11px;" +
    "border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:" +
    (disabled ? "not-allowed" : "pointer") + ";" +
    (disabled ? "opacity:0.5;" : "");

  const iconSpan = document.createElement("span");
  iconSpan.innerHTML = "&#128336;";
  iconSpan.style.cssText = "font-size:16px;color:#9ca3af;flex-shrink:0;";
  trigger.appendChild(iconSpan);

  const displayText = document.createElement("span");
  displayText.className = "timepicker-display";
  displayText.style.cssText = "flex:1;font-size:14px;color:#374151;font-family:monospace;";
  displayText.textContent = formatTimeDisplay(_time, format, showSeconds);
  trigger.appendChild(displayText);

  root.appendChild(trigger);

  // Panel
  const panel = document.createElement("div");
  panel.className = "timepicker-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Time picker");
  panel.style.cssText =
    "position:absolute;top:calc(100% + 4px);left:0;z-index:1100;" +
    "background:#fff;border:1px solid #e5e7eb;border-radius:12px;" +
    "box-shadow:0 12px 32px rgba(0,0,0,0.15);padding:14px;width:auto;" +
    "display:none;opacity:0;transform:translateY(-4px);" +
    "transition:opacity 0.15s ease, transform 0.15s ease;";

  // Time column layout
  const columnsRow = document.createElement("div");
  columnsRow.style.display = "flex";
  columnsRow.style.gap = "4px";

  // Create spinner column helper
  function createSpinnerColumn(
    type: "hours" | "minutes" | "seconds" | "ampm",
    options: { max: number; min: number; step: number; labels?: string[] },
  ): HTMLElement {
    const col = document.createElement("div");
    col.className = `time-column ${type}`;
    col.style.cssText =
      "display:flex;flex-direction:column;align-items:center;gap:2px;";

    // Up button
    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.innerHTML = "\u25B2";
    upBtn.style.cssText =
      "background:none;border:none;cursor:pointer;font-size:10px;color:#6b7280;" +
      "padding:4px 8px;line-height:1;border-radius:4px;";
    upBtn.addEventListener("mouseenter", () => { upBtn.style.background = "#f3f4f6"; });
    upBtn.addEventListener("mouseleave", () => { upBtn.style.background = ""; });

    // Value display
    const valDisplay = document.createElement("div");
    valDisplay.className = `time-value-${type}`;
    valDisplay.setAttribute("role", "spinbutton");
    valDisplay.tabIndex = 0;
    valDisplay.style.cssText =
      "width:48px;height:36px;display:flex;align-items:center;justify-content:center;" +
      "font-size:18px;font-weight:600;font-family:monospace;color:#111827;" +
      "background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;";

    // Down button
    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.innerHTML = "\u25BC";
    downBtn.style.cssText = upBtn.style.cssText;
    downBtn.addEventListener("mouseenter", () => { downBtn.style.background = "#f3f4f6"; });
    downBtn.addEventListener("mouseleave", () => { downBtn.style.background = ""; });

    // Column label
    const colLabel = document.createElement("span");
    colLabel.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    colLabel.style.cssText = "font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:600;";

    col.appendChild(upBtn);
    col.appendChild(valDisplay);
    col.appendChild(downBtn);
    col.appendChild(colLabel);

    return col;
  }

  // Hours column
  const hoursCol = createSpinnerColumn("hours", { max: format === "12h" ? 12 : 23, min: format === "12h" ? 1 : 0, step: 1 });
  columnsRow.appendChild(hoursCol);

  // Colon separator
  const colon1 = document.createElement("span");
  colon1.textContent = ":";
  colon1.style.cssText = "font-size:18px;font-weight:600;color:#374151;padding-top:28px;";
  columnsRow.appendChild(colon1);

  // Minutes column
  const minsCol = createSpinnerColumn("minutes", { max: 59, min: 0, step: minuteStep });
  columnsRow.appendChild(minsCol);

  // Seconds column (optional)
  let secsCol: HTMLElement | null = null;
  if (showSeconds) {
    const colon2 = document.createElement("span");
    colon2.textContent = ":";
    colon2.style.cssText = colon1.style.cssText;
    columnsRow.appendChild(colon2);

    secsCol = createSpinnerColumn("seconds", { max: 59, min: 0, step: 1 });
    columnsRow.appendChild(secsCol);
  }

  // AM/PM column (12h mode)
  let ampmCol: HTMLElement | null = null;
  if (format === "12h") {
    ampmCol = document.createElement("div");
    ampmCol.className = "time-column ampm";
    ampmCol.style.cssText =
      "display:flex;flex-direction:column;align-items:center;gap:2px;margin-left:4px;";

    const ampmUp = document.createElement("button");
    ampmUp.type = "button";
    ampmUp.innerHTML = "\u25B2";
    ampmUp.style.cssText =
      "background:none;border:none;cursor:pointer;font-size:10px;color:#6b7280;padding:4px 6px;";

    const ampmVal = document.createElement("div");
    ampmVal.className = "time-value-ampm";
    ampmVal.tabIndex = 0;
    ampmVal.style.cssText =
      "width:40px;height:36px;display:flex;align-items:center;justify-content:center;" +
      "font-size:13px;font-weight:700;color:#3b82f6;" +
      "background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;";

    const ampmDown = document.createElement("button");
    ampmDown.type = "button";
    ampmDown.innerHTML = "\u25BC";
    ampmDown.style.cssText = ampmUp.style.cssText;

    const ampmLabel = document.createElement("span");
    ampmLabel.textContent = "AM/PM";
    ampmLabel.style.cssText = "font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:600;";

    ampmCol.appendChild(ampmUp);
    ampmCol.appendChild(ampmVal);
    ampmCol.appendChild(ampmDown);
    ampmCol.appendChild(ampmLabel);
    columnsRow.appendChild(ampmCol);
  }

  panel.appendChild(columnsRow);

  // Quick select buttons
  const quickRow = document.createElement("div");
  quickRow.style.cssText =
    "display:flex;gap:4px;justify-content:center;margin-top:10px;padding-top:10px;" +
    "border-top:1px solid #f3f4f6;";

  ["00:00", "06:00", "12:00", "18:00"].forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t;
    btn.style.cssText =
      "padding:3px 10px;border:1px solid #e5e7eb;border-radius:5px;" +
      "background:#fff;color:#6b7280;font-size:11px;cursor:pointer;" +
      "transition:border-color 0.1s,color 0.1s;";
    btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#93c5fd"; btn.style.color = "#3b82f6"; });
    btn.addEventListener("mouseleave", () => { btn.style.borderColor = "#e5e7eb"; btn.style.color = "#6b7280"; });
    btn.addEventListener("click", () => {
      const [h, m] = t.split(":").map(Number);
      _time = clampTime({ hours: h, minutes: m }, parseTime(minTime), parseTime(maxTime));
      updatePanelValues();
      fireChange();
    });
    quickRow.appendChild(btn);
  });

  panel.appendChild(quickRow);
  document.body.appendChild(panel);

  // --- Internal ---

  function getHoursDisplay(): number {
    return format === "12h" ? (_time.hours % 12 || 12) : _time.hours;
  }

  function isAM(): boolean { return _time.hours < 12; }

  function updatePanelValues(): void {
    const hEl = hoursCol.querySelector(".time-value-hours") as HTMLElement;
    if (hEl) hEl.textContent = padZero(getHoursDisplay());

    const mEl = minsCol.querySelector(".time-value-minutes") as HTMLElement;
    if (mEl) mEl.textContent = padZero(_time.minutes);

    if (secsCol) {
      const sEl = secsCol.querySelector(".time-value-seconds") as HTMLElement;
      if (sEl) sEl.textContent = padZero(_time.seconds ?? 0);
    }

    if (ampmCol) {
      const aEl = ampmCol.querySelector(".time-value-ampm") as HTMLElement;
      if (aEl) aEl.textContent = isAM() ? "AM" : "PM";
    }
  }

  function adjustHours(delta: number): void {
    let newH = _time.hours + delta;
    if (format === "12h") {
      if (newH > 12) newH = 1;
      else if (newH < 1) newH = 12;
    } else {
      if (newH > 23) newH = 0;
      else if (newH < 0) newH = 23;
    }
    _time.hours = newH;
    _time = clampTime(_time, parseTime(minTime), parseTime(maxTime));
    updatePanelValues();
    updateDisplay();
    fireChange();
  }

  function adjustMinutes(delta: number): void {
    let newM = _time.minutes + delta;
    if (newM > 59) { newM = 0; adjustHours(1); }
    else if (newM < 0) { newM = 60 - minuteStep; adjustHours(-1); }
    else { _time.minutes = Math.round(newM / minuteStep) * minuteStep; }
    _time = clampTime(_time, parseTime(minTime), parseTime(maxTime));
    updatePanelValues();
    updateDisplay();
    fireChange();
  }

  function adjustSeconds(delta: number): void {
    if (!_time.seconds) _time.seconds = 0;
    let newS = _time.seconds! + delta;
    if (newS > 59) { newS = 0; adjustMinutes(1); }
    else if (newS < 0) { newS = 59; adjustMinutes(-1); }
    else _time.seconds = newS;
    updatePanelValues();
    updateDisplay();
    fireChange();
  }

  function toggleAMPM(): void {
    if (_time.hours >= 12) _time.hours -= 12;
    else _time.hours += 12;
    _time = clampTime(_time, parseTime(minTime), parseTime(maxTime));
    updatePanelValues();
    updateDisplay();
    fireChange();
  }

  function wireColumnEvents(col: HTMLElement, type: "hours" | "minutes" | "seconds"): void {
    const upBtn = col.querySelector("button:first-of-type") as HTMLButtonElement;
    const downBtn = col.querySelectorAll("button")[1] as HTMLButtonElement;
    const valEl = col.querySelector("[role='spinbutton']") as HTMLElement;

    const adjustFn = type === "hours" ? adjustHours : type === "minutes" ? adjustMinutes : adjustSeconds;
    const delta = type === "hours" ? 1 : type === "minutes" ? minuteStep : 1;

    upBtn.addEventListener("click", () => adjustFn(delta));
    downBtn.addEventListener("click", () => adjustFn(-delta));

    // Keyboard on value display
    valEl.addEventListener("keydown", (e) => {
      e.preventDefault();
      if (e.key === "ArrowUp") adjustFn(delta);
      else if (e.key === "ArrowDown") adjustFn(-delta);
    });
  }

  wireColumnEvents(hoursCol, "hours");
  wireColumnEvents(minsCol, "minutes");
  if (secsCol) wireColumnEvents(secsCol, "seconds");

  if (ampmCol) {
    const ampmUp = ampmCol.querySelector("button:first-of-type") as HTMLButtonElement;
    const ampmDown = ampmCol.querySelectorAll("button")[1] as HTMLButtonElement;
    const ampmVal = ampmCol.querySelector(".time-value-ampm") as HTMLElement;

    ampmUp.addEventListener("click", toggleAMPM);
    ampmDown.addEventListener("click", toggleAMPM);
    ampmVal.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleAMPM(); } });
  }

  function updateDisplay(): void {
    displayText.textContent = formatTimeDisplay(_time, format, showSeconds);
  }

  function fireChange(): void { onChange?.(_time); }

  // --- Open/Close ---

  function open(): void {
    if (_open || disabled) return;
    _open = true;

    const rect = trigger.getBoundingClientRect();
    panel.style.left = `${rect.left + window.scrollX}px`;
    panel.style.top = `${rect.bottom + window.scrollY + 4}px}`;

    panel.style.display = "block";
    requestAnimationFrame(() => {
      panel.style.opacity = "1";
      panel.style.transform = "translateY(0)";
    });

    updatePanelValues();
  }

  function close(): void {
    if (!_open) return;
    _open = false;
    panel.style.opacity = "0";
    panel.style.transform = "translateY(-4px)";
    setTimeout(() => { panel.style.display = "none"; }, 150);
  }

  // Events
  trigger.addEventListener("click", () => toggle());
  function toggle(): void { _open ? close() : open(); }

  document.addEventListener("mousedown", (e) => {
    if (_open && !root.contains(e.target as Node) && !panel.contains(e.target as Node)) close();
  });

  // Initial render
  updatePanelValues();

  // --- Instance ---

  return {
    el: root,

    getValue() { return { ..._time }; },

    setValue(t: TimeValue | string) {
      _time = parseTime(t);
      _time = clampTime(_time, parseTime(minTime), parseTime(maxTime));
      updatePanelValues();
      updateDisplay();
    },

    clear() {
      _time = { hours: 12, minutes: 0 };
      updateDisplay();
    },

    open, close,

    isOpen() { return _open; },

    setDisabled(d: boolean) {
      disabled = d;
      trigger.style.opacity = d ? "0.5" : "1";
      trigger.style.cursor = d ? "not-allowed" : "pointer";
      trigger.tabIndex = d ? -1 : 0;
    },

    destroy() { close(); panel.remove(); root.remove(); },
  };
}
