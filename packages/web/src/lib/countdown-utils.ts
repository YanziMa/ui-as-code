/**
 * Countdown Utilities: Timer/countdown display with multiple formats,
 * callbacks, pausing, and customizable rendering.
 */

// --- Types ---

export type CountdownUnit = "days" | "hours" | "minutes" | "seconds" | "milliseconds";
export type CountdownStyle = "digital" | "flip" | "circular" | "compact" | "segmented";
export type CountdownSize = "sm" | "md" | "lg" | "xl";

export interface CountdownOptions {
  /** Target date/time to count down to */
  targetDate: Date | number | string;
  /** Show which units */
  units?: CountdownUnit[];
  /** Visual style */
  style?: CountdownStyle;
  /** Size variant */
  size?: CountdownSize;
  /** Labels for each unit (e.g., {"days": "D", "hours": "H"}) */
  labels?: Partial<Record<CountdownUnit, string>>;
  /** Show separators between units (e.g., ":") */
  separators?: boolean;
  /** Separator character */
  separatorChar?: string;
  /** Padding digits with zero */
  padDigits?: boolean;
  /** Auto-restart when reaching zero? */
  autoRestart?: boolean;
  /** Restart interval in ms (if autoRestart) */
  restartInterval?: number;
  /** Called every tick (every second by default) */
  onTick?: (remaining: CountdownRemaining) => void;
  /** Called when countdown reaches zero */
  onComplete?: () => void;
  /** Called when countdown restarts */
  onRestart?: () => void;
  /** Custom renderer — overrides built-in styles */
  render?: (remaining: CountdownRemaining) => HTMLElement | string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Update interval in ms (default 1000) */
  interval?: number;
}

export interface CountdownRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export interface CountdownInstance {
  /** The root countdown element */
  el: HTMLElement;
  /** Current remaining time */
  getRemaining: () => CountdownRemaining;
  /** Check if completed */
  isComplete: () => boolean;
  /** Check if running */
  isRunning: () => boolean;
  /** Start the countdown */
  start: () => void;
  /** Pause the countdown */
  pause: () => void;
  /** Resume after pause */
  resume: () => void;
  /** Reset to target date */
  reset: (newTarget?: Date | number | string) => void;
  /** Add time (ms) to target */
  addTime: (ms: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_CONFIG: Record<CountdownSize, {
  fontSize: string;
  labelFontSize: string;
  padding: string;
  gap: string;
}> = {
  sm: { fontSize: "18px", labelFontSize: "9px", padding: "4px 6px", gap: "2px" },
  md: { fontSize: "28px", labelFontSize: "11px", padding: "8px 12px", gap: "4px" },
  lg: { fontSize: "42px", labelFontSize: "13px", padding: "12px 16px", gap: "6px" },
  xl: { fontSize: "56px", labelFontSize:15px, padding: "16px 20px", gap: "8px" },
};

const DEFAULT_LABELS: Record<CountdownUnit, string> = {
  days: "Days",
  hours: "Hours",
  minutes: "Minutes",
  seconds: "Seconds",
  milliseconds: "Ms",
};

// --- Core Factory ---

/**
 * Create a countdown timer display.
 *
 * @example
 * ```ts
 * const cd = createCountdown({
 *   targetDate: new Date("2025-01-01T00:00:00"),
 *   style: "digital",
 *   size: "lg",
 *   onComplete: () => console.log("Done!"),
 * });
 * ```
 */
export function createCountdown(options: CountdownOptions): CountdownInstance {
  const {
    targetDate,
    units = ["days", "hours", "minutes", "seconds"],
    style = "digital",
    size = "md",
    labels = {},
    separators = true,
    separatorChar = ":",
    padDigits = true,
    autoRestart = false,
    restartInterval = 60000,
    onTick,
    onComplete,
    onRestart,
    render,
    className,
    container,
    interval = 1000,
  } = options;

  let _target = new Date(targetDate).getTime();
  let _running = false;
  let _complete = false;
  let _timer: ReturnType<typeof setInterval> | null = null;

  const sc = SIZE_CONFIG[size];
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };

  // Root
  const root = document.createElement("div");
  root.className = `countdown ${style} ${size} ${className ?? ""}`.trim();

  (container ?? document.body).appendChild(root);

  // --- Calculate Remaining ---

  function calcRemaining(): CountdownRemaining {
    const now = Date.now();
    let diff = _target - now;

    if (diff <= 0) {
      diff = 0;
      if (!_complete) {
        _complete = true;
        _running = false;
        clearInterval(_timer!);
        _timer = null;
        onComplete?.();

        if (autoRestart) {
          _target = now + restartInterval;
          _complete = false;
          _running = true;
          onRestart?.();
          _startInterval();
        }
      }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const milliseconds = diff % 1000;

    return { total: diff, days, hours, minutes, seconds, milliseconds };
  }

  // --- Renderers ---

  function formatValue(value: number, unit: CountdownUnit): string {
    const maxDigits = unit === "days" ? 3 : 2;
    if (padDigits) return String(value).padStart(maxDigits, "0");
    return String(value);
  }

  function _renderDigital(rem: CountdownRemaining): void {
    root.innerHTML = "";
    root.style.cssText = "display:inline-flex;align-items:center;gap:" + sc.gap + ";font-family:'Courier New',monospace;font-variant-numeric:tabular-nums;";

    const orderedUnits: CountdownUnit[] = ["days", "hours", "minutes", "seconds", "milliseconds"];
    let first = true;

    for (const unit of orderedUnits) {
      if (!units.includes(unit)) continue;

      if (!first && separators) {
        const sep = document.createElement("span");
        sep.className = "countdown-separator";
        sep.textContent = separatorChar;
        sep.style.cssText = `font-size:${sc.fontSize};color:#9ca3af;margin:0 2px;`;
        root.appendChild(sep);
      }
      first = false;

      const block = document.createElement("div");
      block.className = `countdown-unit countdown-${unit}`;
      block.style.cssText =
        `display:inline-flex;flex-direction:column;align-items:center;` +
        `padding:${sc.padding};background:#1f2937;border-radius:8px;min-width:fit-content;`;

      const valueEl = document.createElement("span");
      valueEl.className = "countdown-value";
      valueEl.textContent = formatValue(rem[unit], unit);
      valueEl.style.cssText =
        `font-size:${sc.fontSize};font-weight:700;color:#f9fafb;line-height:1;`;

      const labelEl = document.createElement("span");
      labelEl.className = "countdown-label";
      labelEl.textContent = mergedLabels[unit]!;
      labelEl.style.cssText =
        `font-size:${sc.labelFontSize};color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;`;

      block.appendChild(valueEl);
      block.appendChild(labelEl);
      root.appendChild(block);
    }
  }

  function _renderCompact(rem: CountdownRemaining): void {
    root.innerHTML = "";
    root.style.cssText = "display:inline-flex;align-items:center;gap:4px;font-family:monospace;font-size:" + sc.fontSize + ";color:#111827;";

    const parts: string[] = [];
    const orderedUnits: CountdownUnit[] = ["days", "hours", "minutes", "seconds"];
    for (const unit of orderedUnits) {
      if (!units.includes(unit)) continue;
      parts.push(`${formatValue(rem[unit], unit)}${mergedLabels[unit]?.charAt(0)?.toLowerCase() ?? ""}`);
    }
    root.textContent = parts.join(separators ? separatorChar : " ");
  }

  function _renderSegmented(rem: CountdownRemaining): void {
    root.innerHTML = "";
    root.style.cssText = "display:inline-flex;align-items:center;gap:6px;";

    const orderedUnits: CountdownUnit[] = ["days", "hours", "minutes", "seconds", "milliseconds"];

    for (let i = 0; i < orderedUnits.length; i++) {
      const unit = orderedUnits[i]!;
      if (!units.includes(unit)) continue;

      if (i > 0 && separators) {
        const sep = document.createElement("span");
        sep.textContent = separatorChar;
        sep.style.cssText = `font-size:${sc.fontSize};color:#d1d5db;font-weight:300;`;
        root.appendChild(sep);
      }

      // Each digit gets its own box
      const valStr = formatValue(rem[unit], unit);
      const digitGroup = document.createElement("div");
      digitGroup.className = "countdown-digit-group";
      digitGroup.style.cssText = "display:flex;gap:2px;";

      for (const ch of valStr) {
        const digitBox = document.createElement("span");
        digitBox.className = "countdown-digit";
        digitBox.textContent = ch;
        digitBox.style.cssText =
          `display:inline-flex;align-items:center;justify-content:center;` +
          `width:${parseInt(sc.fontSize) * 0.7}px;height:${parseInt(sc.fontSize) * 1.2}px;` +
          `font-size:${sc.fontSize};font-weight:700;color:#111827;` +
          `background:#f3f4f6;border-radius:4px;border-bottom:2px solid #d1d5db;`;
        digitGroup.appendChild(digitBox);
      }

      root.appendChild(digitGroup);
    }
  }

  function _doRender(rem: CountdownRemaining): void {
    if (render) {
      const custom = render(rem);
      root.innerHTML = "";
      if (typeof custom === "string") root.innerHTML = custom;
      else root.appendChild(custom);
      return;
    }

    switch (style) {
      case "compact": _renderCompact(rem); break;
      case "segmented": _renderSegmented(rem); break;
      case "digital":
      case "flip":
      case "circular":
      default:
        _renderDigital(rem); break;
    }
  }

  // --- Interval Management ---

  function _startInterval(): void {
    if (_timer !== null) return;
    _timer = setInterval(() => {
      const rem = calcRemaining();
      _doRender(rem);
      onTick?.(rem);
    }, interval);
  }

  function _stopInterval(): void {
    if (_timer !== null) { clearInterval(_timer); _timer = null; }
  }

  // --- Methods ---

  function getRemaining(): CountdownRemaining { return calcRemaining(); }

  function isComplete(): boolean { return _complete; }

  function isRunning(): boolean { return _running; }

  function start(): void {
    if (_running) return;
    _running = true;
    _complete = false;
    _doRender(calcRemaining());
    _startInterval();
  }

  function pause(): void {
    _running = false;
    _stopInterval();
  }

  function resume(): void {
    if (_running || _complete) return;
    _running = true;
    _startInterval();
  }

  function reset(newTarget?: Date | number | string): void {
    _stopInterval();
    _complete = false;
    _running = false;
    if (newTarget !== undefined) _target = new Date(newTarget).getTime();
    else _target = new Date(targetDate).getTime();
    _doRender(calcRemaining());
  }

  function addTime(ms: number): void {
    _target += ms;
    if (_complete) {
      _complete = false;
      if (_running) _startInterval();
    }
    _doRender(calcRemaining());
  }

  function destroy(): void {
    _stopInterval();
    root.remove();
  }

  // Initial render
  _doRender(calcRemaining());

  return { el: root, getRemaining, isComplete, isRunning, start, pause, resume, reset, addTime, destroy };
}
