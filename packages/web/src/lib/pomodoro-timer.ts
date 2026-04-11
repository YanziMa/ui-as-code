/**
 * Pomodoro Timer: Pomodoro technique timer with work/break cycles,
 * session counting, sound notifications, visual progress, statistics,
 * customizable durations, and dark mode support.
 */

// --- Types ---

export type PomodoroPhase = "work" | "shortBreak" | "longBreak";
export type PomodoroState = "idle" | "running" | "paused" | "completed";

export interface PomodoroSession {
  /** Session number */
  number: number;
  /** Phase type */
  phase: PomodoroPhase;
  /** Duration in seconds */
  duration: number;
  /** Actual time spent (seconds) */
  actual: number;
  /** Completed? */
  completed: boolean;
  /** Timestamp */
  startedAt: number;
}

export interface PomodoroOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Work duration (seconds) */
  workDuration?: number;
  /** Short break duration (seconds) */
  shortBreakDuration?: number;
  /** Long break duration (seconds) */
  longBreakDuration?: number;
  /** Sessions before long break */
  sessionsBeforeLongBreak?: number;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Show circular progress ring? */
  showProgressRing?: boolean;
  /** Ring color for work phase */
  workColor?: string;
  /** Ring color for short break */
  shortBreakColor?: string;
  /** Ring color for long break */
  longBreakColor?: string;
  /** Background ring color */
  ringTrailColor?: string;
  /** Ring thickness ratio */
  ringThickness?: number;
  /** Digit font size */
  digitFontSize?: number;
  /** Label font size */
  labelFontSize?: number;
  /** Digit color */
  digitColor?: string;
  /** Label color */
  labelColor?: string;
  /** Background color */
  background?: string;
  /** Border radius */
  borderRadius?: number;
  /** Show session counter? */
  showSessionCounter?: boolean;
  /** Show phase indicator? */
  showPhaseIndicator?: boolean;
  /** Show start/pause/reset controls? */
  showControls?: boolean;
  /** Auto-start next phase? */
  autoAdvance?: boolean;
  /** Play tick sound? */
  tickSound?: boolean;
  /** Play completion sound? */
  completeSound?: boolean;
  /** Dark mode? */
  darkMode?: boolean;
  /** On phase change callback */
  onPhaseChange?: (phase: PomodoroPhase, sessionNum: number) => void;
  /** On session complete callback */
  onSessionComplete?: (session: PomodoroSession) => void;
  /** On all sessions done callback (long break finished) */
  onCycleComplete?: (totalSessions: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PomodoroInstance {
  element: HTMLElement;
  /** Start/resume */
  start: () => void;
  /** Pause */
  pause: () => void;
  /** Reset to idle */
  reset: () => void;
  /** Skip to next phase */
  skip: () => void;
  /** Get remaining seconds */
  getRemaining: () => number;
  /** Get current state */
  getState: () => PomodoroState;
  /** Get current phase */
  getPhase: () => PomodoroPhase;
  /** Get session number */
  getSessionNumber: () => number;
  /** Get all completed sessions */
  getSessions: () => PomodoroSession[];
  /** Set work duration */
  setWorkDuration: (sec: number) => void;
  /** Set break duration */
  setShortBreakDuration: (sec: number) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Phase Config ---

const PHASE_COLORS: Record<PomodoroPhase, string> = {
  work: "#ef4444",
  shortBreak: "#22c55e",
  longBreak: "#3b82f6",
};

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

// --- Main Factory ---

export function createPomodoroTimer(options: PomodoroOptions): PomodoroInstance {
  const opts = {
    workDuration: options.workDuration ?? 25 * 60,
    shortBreakDuration: options.shortBreakDuration ?? 5 * 60,
    longBreakDuration: options.longBreakDuration ?? 15 * 60,
    sessionsBeforeLongBreak: options.sessionsBeforeLongBreak ?? 4,
    width: options.width ?? 300,
    height: options.height ?? 300,
    showProgressRing: options.showProgressRing ?? true,
    workColor: options.workColor ?? "#ef4444",
    shortBreakColor: options.shortBreakColor ?? "#22c55e",
    longBreakColor: options.longBreakColor ?? "#3b82f6",
    ringTrailColor: options.ringTrailColor ?? "#e5e7eb",
    ringThickness: options.ringThickness ?? 0.06,
    digitFontSize: options.digitFontSize ?? 48,
    labelFontSize: options.labelFontSize ?? 13,
    digitColor: options.digitColor ?? "#111827",
    labelColor: options.labelColor ?? "#6b7280",
    background: options.background ?? "#fafbfc",
    borderRadius: options.borderRadius ?? 16,
    showSessionCounter: options.showSessionCounter ?? true,
    showPhaseIndicator: options.showPhaseIndicator ?? true,
    showControls: options.showControls ?? true,
    autoAdvance: options.autoAdvance ?? false,
    tickSound: options.tickSound ?? false,
    completeSound: options.completeSound ?? true,
    darkMode: options.darkMode ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("PomodoroTimer: container not found");

  let destroyed = false;
  let state: PomodoroState = "idle";
  let phase: PomodoroPhase = "work";
  let sessionNumber = 1;
  let remaining = opts.workDuration;
  let totalDuration = opts.workDuration;
  let timer: ReturnType<typeof setInterval> | null = null;
  let sessionStartAt = 0;
  const sessions: PomodoroSession[] = [];

  // Audio context for sounds
  let audioCtx: AudioContext | null = null;

  function getAudioContext(): AudioContext | null {
    if (!audioCtx) {
      try { audioCtx = new AudioContext(); } catch { return null; }
    }
    return audioCtx;
  }

  function playBeep(freq: number, duration: number, volume: number): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore */ }
  }

  function playCompleteSound(): void {
    playBeep(880, 0.15, 0.3);
    setTimeout(() => playBeep(1100, 0.2, 0.3), 200);
    setTimeout(() => playBeep(1320, 0.3, 0.25), 450);
  }

  // Root
  const root = document.createElement("div");
  root.className = `pomodoro-timer ${opts.darkMode ? "dark" : ""} ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:12px;padding:24px;width:${opts.width}px;background:${opts.background};
    border-radius:${opts.borderRadius}px;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(root);

  // Progress ring SVG
  let ringSvg: SVGSVGElement | null = null;
  if (opts.showProgressRing) {
    ringSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const r = Math.min(opts.width, opts.height) / 2 - 30;
    ringSvg.setAttribute("viewBox", `0 0 ${r * 2} ${r * 2}`);
    ringSvg.style.cssText = `width:${r * 2}px;height:${r * 2}px;`;
    root.insertBefore(ringSvg, root.firstChild);
  }

  // Time display
  const timeDisplay = document.createElement("div");
  timeDisplay.style.cssText = `
    font-size:${opts.digitFontSize}px;font-weight:800;font-family:'Courier New',monospace;
    color:${opts.digitColor};line-height:1;z-index:1;letter-spacing:2px;
  `;
  root.appendChild(timeDisplay);

  // Phase label
  const phaseLabel = document.createElement("div");
  phaseLabel.style.cssText = `font-size:${opts.labelFontSize}px;color:${opts.labelColor};font-weight:500;text-transform:uppercase;letter-spacing:3px;`;
  root.appendChild(phaseLabel);

  // Session counter
  let sessionEl: HTMLElement | null = null;
  if (opts.showSessionCounter) {
    sessionEl = document.createElement("div");
    sessionEl.style.cssText = "font-size:12px;color:#9ca3af;margin-top:4px;";
    root.appendChild(sessionEl);
  }

  // Phase indicator dots
  let dotsContainer: HTMLElement | null = null;
  if (opts.showPhaseIndicator) {
    dotsContainer = document.createElement("div");
    dotsContainer.style.cssText = "display:flex;gap:6px;margin-top:8px;";
    for (let i = 0; i < opts.sessionsBeforeLongBreak; i++) {
      const dot = document.createElement("div");
      dot.style.cssText = "width:8px;height:8px;border-radius:50%;background:#e5e7eb;transition:background 0.3s;";
      dot.dataset.index = String(i);
      dotsContainer.appendChild(dot);
    }
    root.appendChild(dotsContainer);
  }

  // Controls
  let controlsEl: HTMLElement | null = null;
  if (opts.showControls) {
    controlsEl = document.createElement("div");
    controlsEl.style.cssText = "display:flex;gap:8px;margin-top:12px;";

    const btnStyle = (color: string) =>
      `padding:8px 20px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:${color};color:#fff;transition:opacity 0.2s;`;

    const startBtn = document.createElement("button");
    startBtn.textContent = "Start";
    startBtn.style.cssText = btnStyle("#22c55e");
    startBtn.addEventListener("click", () => { if (state === "idle" || state === "paused") start(); else pause(); });

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText = btnStyle("#6b7280");
    resetBtn.addEventListener("click", () => reset());

    const skipBtn = document.createElement("button");
    skipBtn.textContent = "Skip";
    skipBtn.style.cssText = btnStyle("#9ca3af");
    skipBtn.addEventListener("click", () => skip());

    controlsEl.appendChild(startBtn);
    controlsEl.appendChild(resetBtn);
    controlsEl.appendChild(skipBtn);
    root.appendChild(controlsEl);
  }

  // --- Helpers ---

  function getPhaseColor(): string {
    switch (phase) {
      case "work": return opts.workColor;
      case "shortBreak": return opts.shortBreakColor;
      case "longBreak": return opts.longBreakColor;
    }
  }

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function advancePhase(): void {
    // Record completed session
    const session: PomodoroSession = {
      number: sessionNumber,
      phase,
      duration: totalDuration,
      actual: totalDuration - remaining,
      completed: true,
      startedAt: sessionStartAt,
    };
    sessions.push(session);

    opts.onSessionComplete?.(session);

    if (phase === "work") {
      if (sessionNumber % opts.sessionsBeforeLongBreak === 0) {
        phase = "longBreak";
        totalDuration = opts.longBreakDuration;
      } else {
        phase = "shortBreak";
        totalDuration = opts.shortBreakDuration;
      }
      sessionNumber++;
    } else {
      phase = "work";
      totalDuration = opts.workDuration;

      if (sessionNumber > opts.sessionsBeforeLongBreak) {
        sessionNumber = 1;
        opts.onCycleComplete?.(sessions.length);
      }
    }

    remaining = totalDuration;
    sessionStartAt = Date.now();
    opts.onPhaseChange?.(phase, sessionNumber);

    if (opts.completeSound) playCompleteSound();

    if (opts.autoAdvance && !destroyed) {
      start();
    } else {
      state = "completed";
      updateControls();
    }
  }

  function updateControls(): void {
    if (!controlsEl) return;
    const btns = controlsEl.querySelectorAll("button");
    if (btns[0]) {
      btns[0].textContent = state === "running" ? "Pause" : "Start";
      (btns[0] as HTMLButtonElement).style.background = state === "running" ? "#f59e0b" : "#22c55e";
    }
  }

  // --- Rendering ---

  function render(): void {
    const frac = totalDuration > 0 ? remaining / totalDuration : 0;
    const color = getPhaseColor();

    // Progress ring
    if (ringSvg) {
      const r = parseFloat(ringSvg.getAttribute("viewBox")!.split(" ")[2]!) / 2;
      const circ = 2 * Math.PI * r;
      const endAngle = -Math.PI / 2 + (1 - frac) * circ;

      ringSvg.innerHTML = `
        <circle cx="${r}" cy="${r}" r="${r}" fill="none"
          stroke="${opts.ringTrailColor}" stroke-width="${r * 2 * opts.ringThickness}"
          stroke-linecap="round"/>
        <path d="M ${r + Math.cos(-Math.PI / 2)} ${r + Math.sin(-Math.PI / 2)}
          A ${r} ${r} 0 ${1 - frac > 0.5 ? 1 : 0} 1
          ${r + Math.cos(endAngle)} ${r + Math.sin(endAngle)}"
          fill="none" stroke="${color}"
          stroke-width="${r * 2 * opts.ringThickness}" stroke-linecap="round"/>
      `;
    }

    // Time display
    timeDisplay.textContent = formatTime(remaining);
    timeDisplay.style.color = color;

    // Phase label
    phaseLabel.textContent = PHASE_LABELS[phase];
    phaseLabel.style.color = color;

    // Session counter
    if (sessionEl) {
      sessionEl.textContent = `Session ${sessionNumber} of ${opts.sessionsBeforeLongBreak}`;
    }

    // Phase dots
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll("[data-index]");
      dots.forEach((dot, i) => {
        const isCompleted = i < ((sessionNumber - 1) % opts.sessionsBeforeLongBreak);
        const isCurrent = i === ((sessionNumber - 1) % opts.sessionsBeforeLongBreak) && phase === "work";
        (dot as HTMLElement).style.background = isCompleted ? color : isCurrent ? `${color}50` : "#e5e7eb";
      });
    }
  }

  // --- Timer Loop ---

  function start(): void {
    stopLoop();
    if (state === "idle") sessionStartAt = Date.now();
    state = "running";
    timer = setInterval(() => {
      if (destroyed) { stopLoop(); return; }
      remaining = Math.max(0, remaining - 1);
      render();
      if (remaining <= 0) {
        stopLoop();
        advancePhase();
        render();
      }
    }, 1000);
    updateControls();
  }

  function pause(): void {
    stopLoop();
    state = "paused";
    updateControls();
  }

  function stopLoop(): void {
    if (timer != null) { clearInterval(timer); timer = null; }
  }

  function reset(): void {
    stopLoop();
    state = "idle";
    phase = "work";
    sessionNumber = 1;
    remaining = opts.workDuration;
    totalDuration = opts.workDuration;
    sessionStartAt = 0;
    updateControls();
    render();
  }

  function skip(): void {
    stopLoop();
    advancePhase();
    render();
  }

  // Init
  render();

  // --- Public API ---

  const instance: PomodoroInstance = {
    element: root,

    start,
    pause,
    reset,
    skip,

    getRemaining: () => remaining,
    getState: () => state,
    getPhase: () => phase,
    getSessionNumber: () => sessionNumber,
    getSessions: () => [...sessions],

    setWorkDuration(sec: number) {
      opts.workDuration = sec;
      if (phase === "work") { totalDuration = sec; remaining = Math.min(remaining, sec); }
      render();
    },

    setShortBreakDuration(sec: number) {
      opts.shortBreakDuration = sec;
      if (phase === "shortBreak") { totalDuration = sec; remaining = Math.min(remaining, sec); }
      render();
    },

    destroy() {
      destroyed = true;
      stopLoop();
      if (audioCtx) { audioCtx.close(); audioCtx = null; }
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
