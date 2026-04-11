/**
 * Stopwatch: Precision stopwatch with lap/split times, multiple display formats,
 * pause/resume/reset, lap history table, keyboard shortcuts, and accessibility.
 */

// --- Types ---

export interface LapRecord {
  /** Lap number (1-indexed) */
  number: number;
  /** Lap time in ms */
  lapTime: number;
  /** Cumulative (split) time in ms */
  splitTime: number;
  /** Fastest/slowest indicator */
  type?: "fastest" | "slowest" | "none";
}

export interface StopwatchOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Display format: "digital" | "analog" | "minimal" */
  displayFormat?: "digital" | "analog" | "minimal";
  /** Show lap button? */
  showLapButton?: boolean;
  /** Show reset button? */
  showResetButton?: true;
  /** Maximum laps to keep (0 = unlimited) */
  maxLaps?: number;
  /** Font size for digital display (px) */
  fontSize?: number;
  /** Color theme */
  color?: string;
  /** Background color */
  backgroundColor?: string;
  /** Show milliseconds? */
  showMs?: boolean;
  /** Callback on tick (every update) */
  onTick?: (elapsed: number) => void;
  /** Callback when lap recorded */
  onLap?: (lap: LapRecord, laps: LapRecord[]) => void;
  /** Callback on start/pause/resume/reset */
  onStateChange?: (state: "running" | "paused" | "reset") => void;
  /** Custom CSS class */
  className?: string;
}

export interface StopwatchInstance {
  element: HTMLElement;
  /** Get elapsed time in ms */
  getElapsed: () => number;
  /** Get formatted time string */
  getFormattedTime: () => string;
  /** Start or resume */
  start: () => void;
  /** Pause */
  pause: () => void;
  /** Toggle running state */
  toggle: () => void;
  /** Record a lap */
  lap: () => LapRecord | null;
  /** Reset to zero */
  reset: () => void;
  /** Get all laps */
  getLaps: () => LapRecord[];
  /** Check if running */
  isRunning: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function formatTime(ms: number, showMs: boolean): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const millis = ms % 1000;

  let result = "";
  if (hours > 0) result += `${hours}:`;
  result += `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  if (showMs) result += `.${String(millis).padStart(3, "0")}`;
  return result;
}

function formatLapTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

// --- Main Factory ---

export function createStopwatch(options: StopwatchOptions): StopwatchInstance {
  const opts = {
    displayFormat: options.displayFormat ?? "digital",
    showLapButton: options.showLapButton ?? true,
    showResetButton: options.showResetButton ?? true,
    maxLaps: options.maxLaps ?? 0,
    fontSize: options.fontSize ?? 36,
    color: options.color ?? "#111827",
    backgroundColor: options.backgroundColor ?? "#f9fafb",
    showMs: options.showMs ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Stopwatch: container not found");

  container.className = `stopwatch sw-${opts.displayFormat} ${opts.className}`;
  container.style.cssText = `
    font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;
    gap:12px;padding:20px;background:${opts.backgroundColor};border-radius:12px;
  `;

  // State
  let startTime = 0;
  let elapsed = 0;
  let pausedAt = 0;
  let isRunning = false;
  let destroyed = false;
  let animationFrame: number | null = null;
  let laps: LapRecord[] = [];

  // DOM elements
  const displayEl = document.createElement("div");
  displayEl.className = "sw-display";
  container.appendChild(displayEl);

  // Controls
  const controlsEl = document.createElement("div");
  controlsEl.className = "sw-controls";
  controlsEl.style.cssText = "display:flex;gap:8px;";
  container.appendChild(controlsEl);

  // Buttons
  const startPauseBtn = document.createElement("button");
  startPauseBtn.type = "button";
  startPauseBtn.textContent = "Start";
  startPauseBtn.style.cssText = `
    padding:10px 28px;border:none;border-radius:8px;font-size:15px;font-weight:600;
    cursor:pointer;color:#fff;background:#22c55e;transition:background 0.15s;
  `;
  startPauseBtn.addEventListener("click", () => instance.toggle());
  startPauseBtn.addEventListener("mouseenter", () => { if (startPauseBtn.textContent !== "Start") startPauseBtn.style.background = "#16a34a"; });
  startPauseBtn.addEventListener("mouseleave", () => { if (startPauseBtn.textContent === "Pause") startPauseBtn.style.background = "#ef4444"; else if (startPauseBtn.textContent === "Resume") startPauseBtn.style.background = "#3b82f6"; });
  controlsEl.appendChild(startPauseBtn);

  if (opts.showLapButton) {
    const lapBtn = document.createElement("button");
    lapBtn.type = "button";
    lapBtn.textContent = "Lap";
    lapBtn.disabled = true;
    lapBtn.style.cssText = `
      padding:10px 24px;border:none;border-radius:8px;font-size:15px;font-weight:600;
      cursor:pointer;color:#fff;background:#6b7280;transition:background 0.15s;
      ${"disabled:opacity:0.4;cursor:not-allowed;"}
    `;
    lapBtn.addEventListener("click", () => { instance.lap(); });
    controlsEl.appendChild(lapBtn);
    (instance as any)._lapBtn = lapBtn;
  }

  if (opts.showResetButton) {
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "Reset";
    resetBtn.disabled = true;
    resetBtn.style.cssText = `
      padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;
      cursor:pointer;background:#fff;color:#6b7280;transition:all 0.15s;
      disabled:opacity:0.4;cursor:not-allowed;
    `;
    resetBtn.addEventListener("click", () => { instance.reset(); });
    resetBtn.addEventListener("mouseenter", () => { if (!resetBtn.disabled) { resetBtn.style.borderColor = "#ef4444"; resetBtn.style.color = "#ef4444"; } });
    resetBtn.addEventListener("mouseleave", () => { if (!resetBtn.disabled) { resetBtn.style.borderColor = "#d1d5db"; resetBtn.style.color = "#6b7280"; } });
    controlsEl.appendChild(resetBtn);
    (instance as any)._resetBtn = resetBtn;
  }

  // Lap history
  const lapListEl = document.createElement("div");
  lapListEl.className = "sw-laps";
  lapListEl.style.cssText = `
    width:100%;max-height:200px;overflow-y:auto;margin-top:8px;
    display:none;flex-direction:column;gap:2px;
  `;
  container.appendChild(lapListEl);

  // --- Render Functions ---

  function renderDisplay(): void {
    switch (opts.displayFormat) {
      case "digital":
        renderDigital();
        break;
      case "analog":
        renderAnalog();
        break;
      case "minimal":
        renderMinimal();
        break;
    }
  }

  function renderDigital(): void {
    displayEl.innerHTML = "";
    const text = document.createElement("span");
    text.textContent = formatTime(elapsed, opts.showMs);
    text.style.cssText = `
      font-size:${opts.fontSize}px;font-weight:700;font-family:monospace;
      letter-spacing:2px;color:${opts.color};
    `;
    displayEl.appendChild(text);
  }

  function renderAnalog(): void {
    displayEl.innerHTML = "";
    const size = Math.min(opts.fontSize * 3, 180);
    const ns = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    displayEl.appendChild(svg);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;

    // Face background
    const face = document.createElementNS(ns, "circle");
    face.setAttribute("cx", String(cx));
    face.setAttribute("cy", String(cy));
    face.setAttribute("r", String(r));
    face.setAttribute("fill", "#fff");
    face.setAttribute("stroke", "#e5e7eb");
    face.setAttribute("stroke-width", "2");
    svg.appendChild(face);

    // Tick marks
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6 - 90) * Math.PI / 180;
      const isHour = i % 5 === 0;
      const innerR = r - (isHour ? 12 : 6);
      const outerR = r - 2;
      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;

      const tick = document.createElementNS(ns, "line");
      tick.setAttribute("x1", String(x1));
      tick.setAttribute("y1", String(y1));
      tick.setAttribute("x2", String(x2));
      tick.setAttribute("y2", String(y2));
      tick.setAttribute("stroke", isHour ? "#374151" : "#d1d5db");
      tick.setAttribute("stroke-width", isHour ? "2" : "1");
      svg.appendChild(tick);
    }

    // Center dot
    const centerDot = document.createElementNS(ns, "circle");
    centerDot.setAttribute("cx", String(cx));
    centerDot.setAttribute("cy", String(cy));
    centerDot.setAttribute("r", "4");
    centerDot.setAttribute("fill", opts.color);
    svg.appendChild(centerDot);

    // Calculate hand angles from elapsed time
    const totalMs = elapsed;
    const secAngle = ((totalMs / 1000) % 60) * 6 - 90;
    const minAngle = (((totalMs / 1000 / 60) % 60)) * 6 - 90;

    // Second hand (sweeps continuously)
    const sAngleRad = secAngle * Math.PI / 180;
    const sLen = r * 0.85;
    const sHand = document.createElementNS(ns, "line");
    sHand.setAttribute("x1", String(cx));
    sHand.setAttribute("y1", String(cy));
    sHand.setAttribute("x2", String(cx + Math.cos(sAngleRad) * sLen));
    sHand.setAttribute("y2", String(cy + Math.sin(sAngleRad) * sLen));
    sHand.setAttribute("stroke", "#ef4444");
    sHand.setAttribute("stroke-width", "1.5");
    sHand.setAttribute("stroke-linecap", "round");
    svg.appendChild(sHand);

    // Minute hand
    const mAngleRad = minAngle * Math.PI / 180;
    const mLen = r * 0.6;
    const mHand = document.createElementNS(ns, "line");
    mHand.setAttribute("x1", String(cx));
    mHand.setAttribute("y1", String(cy));
    mHand.setAttribute("x2", String(cx + Math.cos(mAngleRad) * mLen));
    mHand.setAttribute("y2", String(cy + Math.sin(mAngleRad) * mLen));
    mHand.setAttribute("stroke", opts.color);
    mHand.setAttribute("stroke-width", "3");
    mHand.setAttribute("stroke-linecap", "round");
    svg.appendChild(mHand);

    // Digital readout below
    const digital = document.createElement("div");
    digital.textContent = formatTime(elapsed, opts.showMs);
    digital.style.cssText = `font-size:${Math.floor(opts.fontSize * 0.35)}px;font-family:monospace;color:#6b7280;margin-top:4px;`;
    displayEl.appendChild(digital);
  }

  function renderMinimal(): void {
    displayEl.innerHTML = "";
    const text = document.createElement("span");
    text.textContent = formatTime(elapsed, opts.showMs);
    text.style.cssText = `
      font-size:${Math.floor(opts.fontSize * 0.75)}px;font-weight:500;
      font-family:monospace;color:${opts.color};letter-spacing:1px;
    `;
    displayEl.appendChild(text);
  }

  function renderLaps(): void {
    lapListEl.innerHTML = "";

    if (laps.length === 0) {
      lapListEl.style.display = "none";
      return;
    }

    lapListEl.style.display = "flex";

    // Find fastest and slowest
    let fastestIdx = -1, slowestIdx = -1;
    let fastest = Infinity, slowest = 0;
    for (let i = 0; i < laps.length; i++) {
      if (laps[i]!.lapTime < fastest) { fastest = laps[i]!.lapTime; fastestIdx = i; }
      if (laps[i]!.lapTime > slowest) { slowest = laps[i]!.lapTime; slowestIdx = i; }
    }

    // Header
    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;padding:4px 8px;font-size:11px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;";
    header.innerHTML = `<span>LAP</span><span>TIME</span><span>SPLIT</span>`;
    lapListEl.appendChild(header);

    // Render laps in reverse order (newest first)
    for (let i = laps.length - 1; i >= 0; i--) {
      const l = laps[i]!;
      l.type = i === fastestIdx ? "fastest" : i === slowestIdx ? "slowest" : "none";

      const row = document.createElement("div");
      row.style.cssText = `
        display:flex;justify-content:space-between;padding:4px 8px;font-size:13px;
        font-family:monospace;
        ${l.type === "fastest" ? "color:#16a34a;" : l.type === "slowest" ? "color:#dc2626;" : ""}
      `;
      row.innerHTML = `
        <span style="min-width:30px">${l.number}</span>
        <span>${formatLapTime(l.lapTime)}</span>
        <span>${formatLapTime(l.splitTime)}</span>
      `;
      lapListEl.appendChild(row);
    }
  }

  function updateButtons(): void {
    if (isRunning) {
      startPauseBtn.textContent = "Pause";
      startPauseBtn.style.background = "#ef4444";
    } else if (elapsed > 0) {
      startPauseBtn.textContent = "Resume";
      startPauseBtn.style.background = "#3b82f6";
    } else {
      startPauseBtn.textContent = "Start";
      startPauseBtn.style.background = "#22c55e";
    }

    const lapBtn = (instance as any)._lapBtn as HTMLButtonElement | undefined;
    if (lapBtn) {
      lapBtn.disabled = !isRunning;
      lapBtn.style.opacity = isRunning ? "1" : "0.4";
      lapBtn.style.cursor = isRunning ? "pointer" : "not-allowed";
    }

    const resetBtn = (instance as any)._resetBtn as HTMLButtonElement | undefined;
    if (resetBtn) {
      resetBtn.disabled = isRunning && elapsed === 0;
      resetBtn.style.opacity = (isRunning && elapsed === 0) ? "0.4" : "1";
      resetBtn.style.cursor = (isRunning && elapsed === 0) ? "not-allowed" : "pointer";
    }
  }

  // --- Animation Loop ---

  function tick(timestamp: number): void {
    if (destroyed || !isRunning) return;

    elapsed = pausedAt + (timestamp - startTime);
    renderDisplay();
    opts.onTick?.(elapsed);

    animationFrame = requestAnimationFrame(tick);
  }

  // --- Instance ---

  const instance: StopwatchInstance = {
    element: container,

    getElapsed() { return elapsed; },

    getFormattedTime() { return formatTime(elapsed, opts.showMs); },

    start() {
      if (isRunning) return;
      startTime = performance.now();
      isRunning = true;
      animationFrame = requestAnimationFrame(tick);
      updateButtons();
      opts.onStateChange?.("running");
    },

    pause() {
      if (!isRunning) return;
      isRunning = false;
      pausedAt = elapsed;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      updateButtons();
      opts.onStateChange?.("paused");
    },

    toggle() {
      if (isRunning) instance.pause();
      else instance.start();
    },

    lap(): LapRecord | null {
      if (!isRunning) return null;

      const prevSplit = laps.length > 0 ? laps[laps.length - 1]!.splitTime : 0;
      const record: LapRecord = {
        number: laps.length + 1,
        lapTime: elapsed - prevSplit,
        splitTime: elapsed,
      };

      // Enforce max laps
      if (opts.maxLaps > 0 && laps.length >= opts.maxLaps) {
        laps.shift();
        // Renumber
        for (let i = 0; i < laps.length; i++) laps[i]!.number = i + 1;
        record.number = laps.length + 1;
      }

      laps.push(record);
      renderLaps();
      opts.onLap?.(record, laps);
      return record;
    },

    reset() {
      isRunning = false;
      elapsed = 0;
      pausedAt = 0;
      startTime = 0;
      laps = [];
      if (animationFrame) cancelAnimationFrame(animationFrame);
      renderDisplay();
      renderLaps();
      updateButtons();
      opts.onStateChange?.("reset");
    },

    getLaps() { return [...laps]; },

    isRunning() { return isRunning; },

    destroy() {
      destroyed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      container.innerHTML = "";
    },
  };

  // Keyboard shortcuts
  container.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); instance.toggle(); }
    else if (e.key === "l" || e.key === "L") { instance.lap(); }
    else if (e.key === "r" || e.key === "R") { instance.reset(); }
  });

  // Initial render
  renderDisplay();
  updateButtons();

  return instance;
}
