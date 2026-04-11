/**
 * Countdown Timer: Countdown to a target date/time with configurable display formats,
 * pause/resume/reset, completion callbacks, auto-restart, and multiple
 * display modes (digital, flip, circular progress, segmented).
 */

// --- Types ---

export type CountdownDisplayMode = "digital" | "segmented" | "circular" | "flip";
export type CountdownUnit = "days" | "hours" | "minutes" | "seconds" | "auto";

export interface CountdownTimerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Target date (Date object or ISO string or timestamp ms) */
  targetDate: Date | string | number;
  /** Display mode */
  mode?: CountdownDisplayMode;
  /** Smallest unit to show (default: "auto") */
  minUnit?: CountdownUnit;
  /** Show labels? (e.g., "d", "h", "m", "s") */
  showLabels?: boolean;
  /** Custom label text per unit */
  labels?: { days?: string; hours?: string; minutes?: string; seconds?: string };
  /** Separator between values (default: ":") */
  separator?: string;
  /** Padding digits with zeros? (default: true) */
  padZero?: boolean;
  /** Callback on tick (every second) */
  onTick?: (remaining: { days: number; hours: number; minutes: number; seconds: number; totalMs: number }) => void;
  /** Callback when countdown completes */
  onComplete?: () => void;
  /** Auto-restart after completion? (ms interval) */
  autoRestart?: number;
  /** Initial paused state? */
  paused?: boolean;
  /** Font size for digital mode (default: 32) */
  fontSize?: number;
  /** Color for digits/text */
  color?: string;
  /** Background color of completed segments (segmented mode) */
  completeColor?: string;
  /** Incomplete color */
  incompleteColor?: string;
  /** Ring/track color (circular mode) */
  trackColor?: string;
  /** Progress ring color */
  ringColor?: string;
  /** Ring thickness (px, circular mode) */
  strokeWidth?: number;
  /** Custom CSS class */
  className?: string;
}

export interface CountdownTimerInstance {
  element: HTMLElement;
  /** Get remaining time in ms */
  getRemaining: () => number;
  /** Get formatted time string */
  getFormattedTime: () => string;
  /** Get time parts breakdown */
  getTimeParts: () => { days: number; hours: number; minutes: number; seconds: number };
  /** Pause the countdown */
  pause: () => void;
  /** Resume from paused state */
  resume: () => void;
  /** Reset to original target */
  reset: () => void;
  /** Set new target date */
  setTargetDate: (date: Date | string | number) => void;
  /** Check if completed */
  isComplete: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function parseDate(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  if (typeof date === "string") return new Date(date);
  return new Date(date);
}

function pad(n: number, len: number = 2): String {
  return String(n).padStart(len, "0");
}

// --- Main Factory ---

export function createCountdownTimer(options: CountdownTimerOptions): CountdownTimerInstance {
  const opts = {
    mode: options.mode ?? "digital",
    minUnit: options.minUnit ?? "auto",
    showLabels: options.showLabels ?? false,
    separator: options.separator ?? ":",
    padZero: options.padZero ?? true,
    paused: options.paused ?? false,
    fontSize: options.fontSize ?? 32,
    color: options.color ?? "#111827",
    completeColor: options.completeColor ?? "#22c55e",
    incompleteColor: options.incompleteColor ?? "#e5e7eb",
    trackColor: options.trackColor ?? "#e5e7eb",
    ringColor: options.ringColor ?? "#6366f1",
    strokeWidth: options.strokeWidth ?? 8,
    labels: {
      days: options.labels?.days ?? "d",
      hours: options.labels?.hours ?? "h",
      minutes: options.labels?.minutes ?? "m",
      seconds: options.labels?.seconds ?? "s",
      ...options.labels,
    },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CountdownTimer: container not found");

  const targetDate = parseDate(options.targetDate);
  const originalTarget = targetDate.getTime();

  container.className = `countdown-timer ct-${opts.mode} ${opts.className}`;
  container.style.cssText = `
    font-family:-apple-system,sans-serif;display:inline-flex;align-items:center;justify-content:center;
    font-variant-numeric:tabular-nums;color:${opts.color};
  `;

  let isPaused = opts.paused;
  let isDone = false;
  let destroyed = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function getRemainingMs(): number {
    const now = Date.now();
    const diff = targetDate.getTime() - now;
    return Math.max(0, diff);
  }

  function getTimeParts(): { days: number; hours: number; minutes: number; seconds: number } {
    const ms = getRemainingMs();
    const totalSeconds = Math.floor(ms / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  function shouldShow(unit: CountdownUnit): boolean {
    if (unit === "auto") return true;
    const order: CountdownUnit[] = ["days", "hours", "minutes", "seconds"];
    const idx = order.indexOf(opts.minUnit);
    return order.indexOf(unit) <= idx;
  }

  // Render based on mode
  function render(): void {
    container.innerHTML = "";
    const parts = getTimeParts();

    switch (opts.mode) {
      case "digital":
        renderDigital(parts);
        break;
      case "segmented":
        renderSegmented(parts);
        break;
      case "circular":
        renderCircular();
        break;
      case "flip":
        renderFlip(parts);
        break;
    }
  }

  function renderDigital(parts: { days: number; hours: number; minutes: number; seconds: number }): void {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `display:flex;align-items:center;gap:4px;font-size:${opts.fontSize}px;font-weight:600;font-family:monospace;`;

    const units: Array<{ value: number; unit: string }> = [];

    if (shouldShow("days")) units.push({ value: parts.days, unit: "days" });
    if (shouldShow("hours")) units.push({ value: parts.hours, unit: "hours" });
    if (shouldShow("minutes")) units.push({ value: parts.minutes, unit: "minutes" });
    if (shouldShow("seconds")) units.push({ value: parts.seconds, unit: "seconds" });

    for (let i = 0; i < units.length; i++) {
      const u = units[i]!;

      // Value display
      const valEl = document.createElement("span");
      valEl.textContent = opts.padZero ? pad(u.value) : String(u.value);
      valEl.style.cssText = `
        display:inline-block;min-width:${opts.padZero ? (u.value >= 10 ? 2 : 1) * opts.fontSize * 0.6 : undefined}px;
        text-align:center;line-height:1;
      `;
      wrapper.appendChild(valEl);

      // Separator
      if (i < units.length - 1) {
        const sep = document.createElement("span");
        sep.textContent = opts.separator;
        sep.style.cssText = `opacity:0.4;margin:0 2px;`;
        wrapper.appendChild(sep);
      }

      // Label
      if (opts.showLabels) {
        const lbl = document.createElement("span");
        lbl.textContent = opts.labels[u.unit as keyof typeof opts.labels];
        lbl.style.cssText = `font-size:${Math.max(10, opts.fontSize * 0.35)}px;font-weight:400;opacity:0.6;margin-left:2px;`;
        wrapper.appendChild(lbl);
      }
    }

    container.appendChild(wrapper);
  }

  function renderSegmented(parts: { days: number; hours: number; minutes: number; seconds: number }): void {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `display:flex;gap:6px;align-items:flex-end;`;

    const segments: Array<{ value: number; max: number }> = [
      { value: parts.days, max: 365 },
      { value: parts.hours, max: 24 },
      { value: parts.minutes, max: 60 },
      { value: parts.seconds, max: 60 },
    ];

    const activeSegments = segments.filter(s => s.max > 0 && shouldShow(s.max === 365 ? "days" : s.max === 24 ? "hours" : s.max === 60 ? "minutes" : "seconds"));

    for (const seg of activeSegments) {
      const colGroup = document.createElement("div");
      colGroup.style.cssText = `display:flex;flex-direction:column;gap:2px;align-items:center;`;

      for (let i = seg.max - 1; i >= 0; i--) {
        const cell = document.createElement("div");
        const isFilled = i < seg.value;
        cell.style.cssText = `
          width:16px;height:24px;border-radius:3px;background:${isFilled ? opts.completeColor : opts.incompleteColor};
          transition:background 0.3s ease;
        `;
        colGroup.appendChild(cell);
      }

      // Label
      if (opts.showLabels) {
        const lbl = document.createElement("span");
        lbl.textContent = opts.padZero ? pad(seg.value) : String(seg.value);
        lbl.style.cssText = `font-size:14px;font-weight:600;font-family:monospace;min-width:20px;text-align:center;`;
        colGroup.appendChild(lbl);
      }

      wrapper.appendChild(colGroup);
    }

    container.appendChild(wrapper);
  }

  function renderCircular(): void {
    const size = Math.min(opts.fontSize * 3, 160);
    const ns = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    container.appendChild(svg);

    const cx = size / 2;
    const cy = size / 2;
    const r = Math.max(1, size / 2 - opts.strokeWidth / 2);

    // Background track
    const track = document.createElementNS(ns, "circle");
    track.setAttribute("cx", String(cx));
    track.setAttribute("cy", String(cy));
    track.setAttribute("r", String(r));
    track.setAttribute("fill", "none");
    track.setAttribute("stroke", opts.trackColor);
    track.setAttribute("stroke-width", String(opts.strokeWidth));
    svg.appendChild(track);

    // Progress arc
    const ms = getRemainingMs();
    const totalMs = Math.max(1, targetDate.getTime() - Date.now() + Math.abs(targetDate.getTime() - originalTarget));
    const progress = Math.max(0, Math.min(1, 1 - ms / totalMs));
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference * (1 - progress);

    const arc = document.createElementNS(ns, "circle");
    arc.setAttribute("cx", String(cx));
    arc.setAttribute("cy", String(cy));
    arc.setAttribute("r", String(r));
    arc.setAttribute("fill", "none");
    arc.setAttribute("stroke", opts.ringColor);
    arc.setAttribute("stroke-width", String(opts.strokeWidth));
    arc.setAttribute("stroke-dasharray", String(circumference));
    arc.setAttribute("stroke-dashoffset", String(dashOffset));
    arc.setAttribute("stroke-linecap", "round");
    arc.style.transformOrigin = `${cx}px ${cy}px`;
    arc.style.transition = `stroke-dashoffset 1s linear`;
    svg.appendChild(arc);

    // Center text
    const pct = Math.round(progress * 100);
    const centerText = document.createElementNS(ns, "text");
    centerText.setAttribute("x", String(cx));
    centerText.setAttribute("y", String(cy + 4));
    centerText.setAttribute("text-anchor", "middle");
    centerText.setAttribute("font-size", String(Math.floor(opts.fontSize * 0.7)));
    centerText.setAttribute("font-weight", "700");
    centerText.setAttribute("fill", opts.color);
    centerText.textContent = isDone ? "Done!" : `${pct}%`;
    svg.appendChild(centerText);
  }

  function renderFlip(parts: { days: number; hours: number; minutes: number; seconds: number }): void {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `display:flex;gap:4px;`;

    const units: Array<{ value: number; max: number }> = [
      { value: parts.days, max: 99 },
      { value: parts.hours, max: 23 },
      { value: parts.minutes, max: 59 },
      { value: parts.seconds, max: 59 },
    ];

    for (const u of units) {
      const digitPair = document.createElement("div");
      digitPair.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:2px;`;

      // Tens digit
      const tens = document.createElement("div");
      tens.className = "flip-digit";
      tens.textContent = opts.padZero ? pad(Math.floor(u.value / 10)) : String(Math.floor(u.value / 10));
      tens.style.cssText = `
        width:28px;height:40px;border-radius:4px;background:#1e1b4b;color:#fff;
        display:flex;align-items:center;justify-content:center;
        font-size:${Math.floor(opts.fontSize * 0.7)}px;font-weight:700;font-family:monospace;
      `;
      digitPair.appendChild(tens);

      // Ones digit
      const ones = document.createElement("div");
      ones.className = "flip-digit";
      ones.textContent = opts.padZero ? pad(u.value % 10) : String(u.value % 10);
      ones.style.cssText = tens.style.cssText as string;
      digitPair.appendChild(ones);

      wrapper.appendChild(digitPair);
    }

    container.appendChild(wrapper);
  }

  // Tick loop
  function startTick(): void {
    if (intervalId) clearInterval(intervalId);

    intervalId = setInterval(() => {
      if (destroyed || isPaused) return;

      const ms = getRemainingMs();

      if (ms <= 0) {
        if (!isDone) {
          isDone = true;
          render();
          opts.onComplete?.();

          if (opts.autoRestart) {
            setTimeout(() => {
              // Reset target to new future time
              const newTarget = new Date(Date.now() + opts.autoRestart);
              Object.defineProperty(targetDate, 'getTime', { value: () => newTarget.getTime(), writable: true, configurable: true });
              isDone = false;
            }, 1000);
          }
        }
        return;
      }

      render();
      opts.onTick?.(getTimeParts());
    }, 1000);
  }

  // Initial render + start
  render();
  startTick();

  const instance: CountdownTimerInstance = {
    element: container,

    getRemaining: getRemainingMs,

    getFormattedTime() {
      const p = getTimeParts();
      const parts: string[] = [];
      if (shouldShow("days") && p.days > 0) parts.push(`${p.days}${opts.labels.days}`);
      if (shouldShow("hours")) parts.push(pad(p.hours) + `${opts.labels.hours}`);
      if (shouldShow("minutes")) parts.push(pad(p.minutes) + `${opts.labels.minutes}`);
      if (shouldShow("seconds")) parts.push(pad(p.seconds) + `${opts.labels.seconds}`);
      return parts.join(opts.separator);
    },

    getTimeParts,

    pause() {
      isPaused = true;
    },

    resume() {
      isPaused = false;
    },

    reset() {
      Object.defineProperty(targetDate, 'getTime', { value: () => originalTarget, writable: true, configurable: true });
      isDone = false;
      render();
    },

    setTargetDate(date: Date | string | number) {
      const newTarget = parseDate(date);
      Object.defineProperty(targetDate, 'getTime', { value: () => newTarget.getTime(), writable: true, configurable: true });
      isDone = false;
      render();
    },

    isComplete() { return isDone; },

    destroy() {
      destroyed = true;
      if (intervalId) clearInterval(intervalId);
      container.innerHTML = "";
    },
  };

  return instance;
}
