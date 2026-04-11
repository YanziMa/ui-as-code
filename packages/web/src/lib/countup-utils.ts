/**
 * Count-Up Utilities: Elapsed time counter/stopwatch with lap times,
 * multiple display formats, pause/resume, split times, and callback support.
 */

// --- Types ---

export type CountUpUnit = "days" | "hours" | "minutes" | "seconds" | "milliseconds";
export type CountUpPrecision = "raw" | "rounded" | "decimal";

export interface LapTime {
  /** Lap number */
  number: number;
  /** Elapsed time at lap (ms) */
  elapsed: number;
  /** Split time since previous lap (ms) */
  split: number;
  /** Label for this lap */
  label?: string;
}

export interface CountUpOptions {
  /** Start time offset in ms (default 0 = start from zero) */
  startTime?: number;
  /** Show which units */
  units?: CountUpUnit[];
  /** Precision mode */
  precision?: CountUpPrecision;
  /** Update interval in ms (default 1000) */
  interval?: number;
  /** Called every tick with elapsed time */
  onTick?: (elapsed: number, formatted: string) => void;
  /** Called when paused */
  onPause?: (elapsed: number) => void;
  /** Called when resumed */
  onResume?: (elapsed: number) => void;
  /** Called when reset */
  onReset?: () => void;
  /** Custom formatter */
  format?: (ms: number) => string;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface CountUpInstance {
  /** Root element */
  el: HTMLElement;
  /** Get total elapsed time in ms */
  getElapsed: () => number;
  /** Get formatted time string */
  getFormatted: () => string;
  /** Check if running */
  isRunning: () => boolean;
  /** Check if paused */
  isPaused: () => boolean;
  /** Start / resume */
  start: () => void;
  /** Pause */
  pause: () => void;
  /** Reset to zero (or specified offset) */
  reset: (offsetMs?: number) => void;
  /** Record a lap time */
  lap: (label?: string) => LapTime;
  /** Get all recorded laps */
  getLaps: () => LapTime[];
  /** Clear all laps */
  clearLaps: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Default Formatter ---

function formatMs(ms: number, precision: CountUpPrecision = "rounded"): string {
  const absMs = Math.abs(ms);

  if (absMs < 1000) {
    return `${Math[precision === "decimal" ? ms.toFixed(1) : Math.round(ms)]}ms`;
  }

  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours % 24}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes % 60}m`);
  parts.push(`${String(seconds).padStart(2, "0")}s`);

  return parts.join(" ");
}

// --- Core Factory ---

export function createCountUp(options: CountUpOptions = {}): CountUpInstance {
  const {
    startTime = 0,
    units = ["hours", "minutes", "seconds"],
    precision = "rounded",
    interval = 1000,
    onTick,
    onPause,
    onResume,
    onReset,
    format,
    className,
    container,
  } = options;

  let _startTime: number | null = null; // Timestamp when started
  let _pausedAt: number | null = null; // Timestamp when paused
  let _accumulated = startTime; // Accumulated time before current run
  let _running = false;
  let _paused = false;
  let _timer: ReturnType<typeof setInterval> | null = null;
  const _laps: LapTime[] = [];
  let _lastLapElapsed = 0;

  // Root element
  const root = document.createElement("div");
  root.className = `count-up ${className ?? ""}`.trim();
  root.style.cssText =
    "display:inline-flex;align-items:center;font-family:'Courier New',monospace;" +
    "font-variant-numeric:tabular-nums;font-size:20px;color:#111827;padding:4px 8px;";
  root.setAttribute("role", "timer");
  root.setAttribute("aria-live", "polite");

  const display = document.createElement("span");
  display.className = "count-up-display";
  display.textContent = formatMs(_accumulated, precision);
  root.appendChild(display);

  (container ?? document.body).appendChild(root);

  // --- Internal ---

  function getElapsed(): number {
    if (!_running && !_paused) return _accumulated;
    if (_paused && _pausedAt !== null) return _accumulated + (_pausedAt - _startTime!);
    return _accumulated + (Date.now() - _startTime!);
  }

  function getFormatted(): string {
    return format?.(getElapsed()) ?? formatMs(getElapsed(), precision);
  }

  function updateDisplay(): void {
    display.textContent = getFormatted();
  }

  function _startInterval(): void {
    if (_timer !== null) return;
    _timer = setInterval(() => {
      const elapsed = getElapsed();
      updateDisplay();
      onTick?.(elapsed, getFormatted());
    }, interval);
  }

  function _stopInterval(): void {
    if (_timer !== null) { clearInterval(_timer); _timer = null; }
  }

  // --- Methods ---

  function start(): void {
    if (_running) return;
    if (_paused && _pausedAt !== null) {
      // Resuming: accumulate the paused duration
      _accumulated += (_pausedAt - _startTime!);
      _pausedAt = null;
      _paused = false;
      onResume?.(getElapsed());
    } else {
      // Fresh start
      _accumulated = startTime;
      _lastLapElapsed = 0;
    }

    _running = true;
    _paused = false;
    _startTime = Date.now();
    updateDisplay();
    _startInterval();
  }

  function pause(): void {
    if (!_running || _paused) return;
    _pausedAt = Date.now();
    _running = false;
    _paused = true;
    _stopInterval();
    updateDisplay();
    onPause?.(getElapsed());
  }

  function reset(offsetMs?: number): void {
    _stopInterval();
    _running = false;
    _paused = false;
    _startTime = null;
    _pausedAt = null;
    _accumulated = offsetMs ?? 0;
    _lastLapElapsed = 0;
    _laps.length = 0;
    updateDisplay();
    onReset?.();
  }

  function lap(label?: string): LapTime {
    const elapsed = getElapsed();
    const split = elapsed - _lastLapElapsed;
    const entry: LapTime = {
      number: _laps.length + 1,
      elapsed,
      split,
      label,
    };
    _laps.push(entry);
    _lastLapElapsed = elapsed;
    return entry;
  }

  function getLaps(): LapTime[] { return [..._laps]; }
  function clearLaps(): void { _laps.length = 0; _lastLapElapsed = getElapsed(); }
  function isRunning(): boolean { return _running; }
  function isPaused(): boolean { return _paused; }

  function destroy(): void {
    _stopInterval();
    root.remove();
  }

  return {
    el: root,
    getElapsed,
    getFormatted,
    isRunning,
    isPaused,
    start,
    pause,
    reset,
    lap,
    getLaps,
    clearLaps,
    destroy,
  };
}
