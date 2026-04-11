/**
 * Timer Utilities: General-purpose timer with countdown/count-up modes,
 * alarm/notification, persistence across page reloads, Pomodoro-style sessions,
 * and timer state machine.
 */

// --- Types ---

export type TimerMode = "countdown" | "countup" | "stopwatch";
export type TimerState = "idle" | "running" | "paused" | "completed" | "alarm";

export interface TimerSession {
  /** Session ID */
  id: string;
  /** Duration in ms */
  duration: number;
  /** Label/name */
  label?: string;
  /** Color theme */
  color?: string;
  /** Completed? */
  completed?: boolean;
}

export interface TimerOptions {
  /** Timer mode */
  mode?: TimerMode;
  /** Duration in ms (for countdown) or initial value */
  duration?: number;
  /** Initial offset (for count-up) */
  initialOffset?: number;
  /** Update interval (ms). Default 1000 */
  tickInterval?: number;
  /** Show controls (start/pause/reset)? */
  showControls?: boolean;
  /** Show progress bar? */
  showProgress?: boolean;
  /** Progress bar color */
  progressColor?: string;
  /** Background color */
  bgColor?: string;
  /** Text color */
  textColor?: string;
  /** Ring/circular style? */
  circular?: boolean;
  /** Size ("sm", "md", "lg") */
  size?: "sm" | "md" | "lg";
  /** Alarm sound/visual on complete? */
  alarmOnComplete?: boolean;
  /** Custom format function */
  format?: (ms: number) => string;
  /** Called each tick */
  onTick?: (ms: number, state: TimerState) => void;
  /** Called when state changes */
  onStateChange?: (state: TimerState) => void;
  /** Called on complete */
  onComplete?: (totalMs: number) => void;
  /** Persist state to localStorage? */
  persistKey?: string;
  /** Custom class */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface TimerInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current remaining/elapsed time in ms */
  getTime: () => number;
  /** Get current state */
  getState: () => TimerState;
  /** Start the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Reset the timer */
  reset: (newDuration?: number) => void;
  /** Set new duration (replaces current) */
  setDuration: (ms: number) => void;
  /** Add time (extend countdown) */
  addTime: (ms: number) => void;
  /** Check if completed */
  isComplete: () => boolean;
  /** Destroy */
  destroy: () => void;
}

// --- State Machine Helpers ---

const STATE_TRANSITIONS: Record<TimerState, TimerState[]> = {
  idle: ["running"],
  running: ["paused", "completed", "alarm"],
  paused: ["running", "idle"],
  completed: ["idle", "running"],
  alarm: ["idle", "running"],
};

const SIZE_STYLES: Record<string, { fontSize: string; padding: string; size: string }> = {
  sm: { fontSize: "16px", padding: "8px 12px", size: "80px" },
  md: { fontSize: "24px", padding: "14px 20px", size: "120px" },
  lg: { fontSize: "36px", padding: "20px 28px", size: "180px" },
};

// --- Core Factory ---

export function createTimer(options: TimerOptions = {}): TimerInstance {
  const {
    mode = "countdown",
    duration = 60000,
    initialOffset = 0,
    tickInterval = 1000,
    showControls = true,
    showProgress = true,
    progressColor = "#3b82f6",
    bgColor = "#f3f4f6",
    textColor = "#111827",
    circular = false,
    size = "md",
    alarmOnComplete = true,
    format,
    onTick,
    onStateChange,
    onComplete,
    persistKey,
    className,
    container,
  } = options;

  let _state: TimerState = "idle";
  let _remaining = mode === "countdown" ? duration : initialOffset;
  let _totalDuration = duration;
  let _timer: ReturnType<typeof setInterval> | null = null;
  let _startedAt: number | null = null;
  let _pausedAt: number | null = null;
  let _pausedRemaining: number | null = null;

  // Restore persisted state
  if (persistKey) {
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        _state = parsed.state ?? "idle";
        _remaining = parsed.remaining ?? _remaining;
        _totalDuration = parsed.totalDuration ?? _totalDuration;
        _pausedRemaining = parsed.pausedRemaining;
      }
    } catch {}
  }

  const ss = SIZE_STYLES[size];

  // Root
  const root = document.createElement("div");
  root.className = `timer ${mode} ${size} ${className ?? ""}`.trim();

  if (circular) {
    root.style.cssText =
      `display:inline-flex;flex-direction:column;align-items:center;gap:10px;`;
  } else {
    root.style.cssText =
      `display:flex;flex-direction:column;align-items:center;gap:10px;min-width:${ss.size};`;
  }

  // Display area
  const displayArea = document.createElement("div");
  displayArea.className = "timer-display";

  if (circular) {
    // Circular ring display
    const ringSize = parseInt(ss.size);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(ringSize));
    svg.setAttribute("height", String(ringSize));
    svg.setAttribute("viewBox", "0 0 100 100");

    // Background track
    const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    track.setAttribute("cx", "50");
    track.setAttribute("cy", "50");
    track.setAttribute("r", "45");
    track.setAttribute("fill", "none");
    track.setAttribute("stroke", bgColor);
    track.setAttribute("stroke-width", "8");
    svg.appendChild(track);

    // Progress arc
    const progressArc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    progressArc.className = "timer-progress-arc";
    progressArc.setAttribute("cx", "50");
    progressArc.setAttribute("cy", "50");
    progressArc.setAttribute("r", "45");
    progressArc.setAttribute("fill", "none");
    progressArc.setAttribute("stroke", progressColor);
    progressArc.setAttribute("stroke-width", "8");
    progressArc.setAttribute("stroke-dasharray", "283"); // 2 * PI * 45
    progressArc.setAttribute("stroke-dashoffset", "283");
    progressArc.setAttribute("stroke-linecap", "round");
    progressArc.style.transition = "stroke-dashoffset 0.3s linear";
    progressArc.dataset.ref = "progress";
    svg.appendChild(progressArc);

    // Center text
    const text = document.createElement("text");
    text.setAttribute("x", "50");
    text.setAttribute("y", "54");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", textColor);
    text.setAttribute("font-size", ss.fontSize);
    text.setAttribute("font-weight", "600");
    text.setAttribute("font-family", "-apple-system,sans-serif");
    text.textContent = formatTime(_remaining);
    text.dataset.ref = "time";
    svg.appendChild(text);

    displayArea.appendChild(svg);
  } else {
    // Linear display
    displayArea.style.cssText =
      `background:${bgColor};border-radius:10px;padding:${ss.padding};` +
      `color:${textColor};font-size:${ss.fontSize};font-weight:700;` +
      "font-family:'Courier New',monospace;text-align:center;min-width:120px;";
    displayArea.textContent = formatTime(_remaining);
  }

  root.appendChild(displayArea);

  // Progress bar (non-circular)
  let progressBar: HTMLElement | null = null;
  if (showProgress && !circular) {
    progressBar = document.createElement("div");
    progressBar.className = "timer-progress-bar";
    progressBar.style.cssText =
      "width:100%;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:6px;";
    const fill = document.createElement("div");
    fill.className = "timer-progress-fill";
    fill.style.height = "100%";
    fill.style.background = progressColor;
    fill.style.borderRadius = "2px";
    fill.style.width = mode === "countdown"
      ? `${(_remaining / _totalDuration) * 100}%`
      : "0%";
    fill.style.transition = "width 0.3s linear";
    fill.dataset.ref = "progress-fill";
    progressBar.appendChild(fill);
    root.appendChild(progressBar);
  }

  // Controls
  if (showControls) {
    const controls = document.createElement("div");
    controls.className = "timer-controls";
    controls.style.cssText = "display:flex;gap:8px;margin-top:10px;";

    const btnStyle =
      "padding:6px 16px;border-radius:6px;border:none;font-size:13px;" +
      "font-weight:500;cursor:pointer;transition:all 0.15s;";

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.textContent = "Start";
    startBtn.style.cssText = btnStyle + "background:#3b82f6;color:#fff;";
    startBtn.addEventListener("click", () => start());

    const pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.textContent = "Pause";
    pauseBtn.style.cssText = btnStyle + "background:#fff;color:#374151;border:1px solid #d1d5db;";
    pauseBtn.addEventListener("click", () => pause());

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText = btnStyle + "background:#fff;color:#374151;border:1px solid #d1d5db;";
    resetBtn.addEventListener("click", () => reset());

    controls.append(startBtn, pauseBtn, resetBtn);
    root.appendChild(controls);
  }

  (container ?? document.body).appendChild(root);

  // --- Helpers ---

  function formatTime(ms: number): string {
    if (format) return format(ms);

    const absMs = Math.max(0, ms);
    const sign = ms < 0 ? "-" : "";
    if (absMs < 1000) return `${sign}${Math.round(absMs)}ms`;

    const s = Math.floor(absMs / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const secStr = String(s % 60).padStart(2, "0");
    const minStr = String(m % 60).padStart(2, "0");
    const hrStr = String(h).padStart(2, "0");

    if (h > 0) return `${sign}${hrStr}:${minStr}:${secStr}`;
    if (m > 0) return `${sign}${minStr}:${secStr}`;
    return `${sign}${s}s`;
  }

  function transition(newState: TimerState): void {
    const allowed = STATE_TRANSITIONS[_state] ?? [];
    if (!allowed.includes(newState)) return;
    _state = newState;
    onStateChange?.(_state);
    _persist();
  }

  function _persist(): void {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify({
        state: _state,
        remaining: _remaining,
        totalDuration: _totalDuration,
        pausedRemaining: _pausedRemaining,
      }));
    } catch {}
  }

  function updateDisplay(): void {
    const timeStr = formatTime(_remaining);

    if (circular) {
      const textEl = displayArea.querySelector('[data-ref="time"]') as HTMLElement;
      if (textEl) textEl.textContent = timeStr;

      const pct = _totalDuration > 0 ? Math.max(0, Math.min(1, _remaining / _totalDuration)) : 0;
      const circumference = 2 * Math.PI * 45; // r=45
      const offset = circumference * (1 - pct);
      const arc = displayArea.querySelector('[data-ref="progress"]') as HTMLElement;
      if (arc) arc.style.strokeDashoffset = String(offset);
    } else {
      displayArea.textContent = timeStr;
      if (progressBar) {
        const fill = progressBar.querySelector('[data-ref="progress-fill"]') as HTMLElement;
        if (fill) {
          const pct = _totalDuration > 0 ? Math.max(0, Math.min(1, _remaining / _totalDuration)) : 0;
          fill.style.width = `${pct * 100}%`;
        }
      }
    }
  }

  function _tick(): void {
    if (mode === "countdown") {
      _remaining -= tickInterval;
      if (_remaining <= 0) {
        _remaining = 0;
        transition("completed");
        if (alarmOnComplete) transition("alarm");
        stopTimer();
        onComplete?.(_totalDuration);
        return;
      }
    } else {
      _remaining += tickInterval;
    }

    updateDisplay();
    onTick?.(_remaining, _state);
  }

  function stopTimer(): void {
    if (_timer !== null) { clearInterval(_timer); _timer = null; }
  }

  // --- Methods ---

  function getTime(): number { return _remaining; }
  function getState(): TimerState { return _state; }
  function isComplete(): boolean { return _state === "completed" || _state === "alarm"; }

  function start(): void {
    if (_state === "running") return;
    if (_state === "paused") {
      // Resume from pause
      _remaining = _pausedRemaining!;
      _startedAt = Date.now();
    } else {
      _startedAt = Date.now();
      _remaining = mode === "countdown" ? _totalDuration : initialOffset;
    }
    transition("running");
    _timer = setInterval(_tick, tickInterval);
  }

  function pause(): void {
    if (_state !== "running") return;
    _pausedRemaining = _remaining;
    transition("paused");
    stopTimer();
  }

  function reset(newDuration?: number): void {
    stopTimer();
    _remaining = newDuration ?? (mode === "countdown" ? _totalDuration : initialOffset);
    if (newDuration) _totalDuration = newDuration;
    _startedAt = null;
    _pausedAt = null;
    _pausedRemaining = null;
    transition("idle");
    updateDisplay();
  }

  function setDuration(ms: number): void {
    _totalDuration = ms;
    if (mode === "countdown" && _state === "idle") _remaining = ms;
    updateDisplay();
  }

  function addTime(ms: number): void {
    if (mode === "countdown") {
      _remaining += ms;
    } else {
      _remaining += ms;
    }
    updateDisplay();
  }

  function destroy(): void {
    stopTimer();
    root.remove();
  }

  return {
    el: root,
    getTime,
    getState,
    start,
    pause,
    reset,
    setDuration,
    addTime,
    isComplete,
    destroy,
  };
}
