/**
 * Countdown Timer v2: Enhanced countdown timer with circular progress ring,
 * flip-digit animation, labels, completion callbacks, pause/resume,
 * multiple presets, and visual effects.
 */

// --- Types ---

export type CountdownPreset = "short" | "medium" | "long" | "custom";
export type CountdownState = "running" | "paused" | "completed" | "idle";

export interface CountdownSegment {
  /** Label (e.g., "Days", "Hours", "Minutes", "Seconds") */
  label: string;
  /** Current value */
  value: number;
  /** Total value for this segment (for progress) */
  total: number;
}

export interface CountdownOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Target timestamp (Date object) or duration in seconds */
  target: Date | number;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Display segments ("DHMS" | "HM" | "MS" | "auto") */
  segments?: string;
  /** Circular progress ring? */
  showProgressRing?: boolean;
  /** Ring color */
  ringColor?: string;
  /** Ring trail color */
  ringTrailColor?: string;
  /** Ring thickness (ratio of radius) */
  ringThickness?: number;
  /** Flip animation on value change? */
  flipAnimation?: boolean;
  /** Digit font size */
  digitFontSize?: number;
  /** Label font size */
  labelFontSize?: number;
  /** Digit color */
  digitColor?: string;
  /** Label color */
  labelColor?: string;
  /** Completed state color */
  completedColor?: string;
  /** Warning threshold (seconds, show warning color) */
  warningThreshold?: number;
  /** Warning color */
  warningColor?: string;
  /** Show days limit (hide days if below) */
  hideDaysBelow?: number;
  /** Padding */
  padding?: number;
  /** Background color */
  background?: string;
  /** Border radius */
  borderRadius?: number;
  /** Auto-start on create? */
  autoStart?: boolean;
  /** On complete callback */
  onComplete?: () => void;
  /** On tick callback (every update) */
  onTick?: (remaining: number, segments: CountdownSegment[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface CountdownInstance {
  element: HTMLElement;
  /** Start/resume countdown */
  start: () => void;
  /** Pause countdown */
  pause: () => void;
  /** Reset with new target */
  reset: (target: Date | number) => void;
  /** Get remaining time in seconds */
  getRemaining: () => number;
  /** Get current state */
  getState: () => CountdownState;
  /** Set target */
  setTarget: (target: Date | number) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Presets ---

const PRESETS: Record<CountdownPreset, number> = {
  short: 60,
  medium: 600,
  long: 3600,
};

// --- Main Factory ---

export function createCountdownTimerV2(options: CountdownOptions): CountdownInstance {
  const opts = {
    width: options.width ?? 320,
    height: options.height ?? 120,
    segments: options.segments ?? "auto",
    showProgressRing: options.showProgressRing ?? true,
    ringColor: options.ringColor ?? "#6366f1",
    ringTrailColor: options.ringTrailColor ?? "#e5e7eb",
    ringThickness: options.ringThickness ?? 0.08,
    flipAnimation: options.flipAnimation ?? true,
    digitFontSize: options.digitFontSize ?? 32,
    labelFontSize: options.labelFontSize ?? 11,
    digitColor: options.digitColor ?? "#111827",
    labelColor: options.labelColor ?? "#6b7280",
    completedColor: options.completedColor ?? "#22c55e",
    warningThreshold: options.warningThreshold ?? 60,
    warningColor: options.warningColor ?? "#f59e0b",
    hideDaysBelow: options.hideDaysBelow ?? 1,
    padding: options.padding ?? 16,
    background: options.background ?? "#fafbfc",
    borderRadius: options.borderRadius ?? 12,
    autoStart: options.autoStart ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CountdownTimerV2: container not found");

  let destroyed = false;
  let state: CountdownState = "idle";
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastValues: number[] = [];
  let animFrameId: ReturnType<typeof requestAnimationFrame> | null = null;

  // Compute target as absolute timestamp
  function getTargetMs(): number {
    if (typeof opts.target === "number") return Date.now() + opts.target * 1000;
    return opts.target.getTime();
  }

  // Root
  const root = document.createElement("div");
  root.className = `countdown-timer-v2 ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:${opts.padding / 2}px;padding:${opts.padding}px;
    width:${opts.width}px;background:${opts.background};
    border-radius:${opts.borderRadius}px;
  `;
  container.appendChild(root);

  // Progress ring SVG
  let ringSvg: SVGSVGElement | null = null;
  if (opts.showProgressRing) {
    ringSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const r = Math.min(opts.width, opts.height) / 2 - 20;
    ringSvg.setAttribute("viewBox", `0 0 ${r * 2} ${r * 2}`);
    ringSvg.style.cssText = `width:${r * 2}px;height:${r * 2}px;position:absolute;`;
    root.style.position = "relative";
    root.insertBefore(ringSvg, root.firstChild);
  }

  // Digits container
  const digitsContainer = document.createElement("div");
  digitsContainer.style.cssText = "display:flex;align-items:baseline;gap:4px;z-index:1;";
  root.appendChild(digitsContainer);

  // Labels container
  const labelsContainer = document.createElement("div");
  labelsContainer.style.cssText = "display:flex;gap:4px;";
  root.appendChild(labelsContainer);

  // --- Segments computation ---

  function computeSegments(remainingSec: number): CountdownSegment[] {
    const total = getTargetMs() - Date.now();
    const secs = Math.max(0, remainingSec);

    if (opts.segments !== "auto") {
      // Parse explicit segment config
      switch (opts.segments) {
        case "DHMS":
          return [
            { label: "D", value: Math.floor(secs / 86400), total: 86400 },
            { label: "H", value: Math.floor((secs % 86400) / 3600), total: 3600 },
            { label: "M", value: Math.floor((secs % 3600) / 60), total: 60 },
            { label: "S", value: secs % 60, total: 60 },
          ];
        case "HM":
          return [
            { label: "H", value: Math.floor(secs / 3600), total: 3600 },
            { label: "M", value: Math.floor((secs % 3600) / 60), total: 60 },
            { label: "S", value: secs % 60, total: 60 },
          ];
        case "MS":
          return [
            { label: "M", value: Math.floor(secs / 60), total: 60 },
            { label: "S", value: secs % 60, total: 60 },
          ];
        default:
          break;
      }
    }

    const segs: CountdownSegment[] = [];
    if (secs >= 86400) segs.push({ label: "D", value: Math.floor(secs / 86400), total: 86400 });
    if (secs >= 3600) segs.push({ label: "H", value: Math.floor((secs % 86400) / 3600), total: 3600 });
    if (secs >= 60) segs.push({ label: "M", value: Math.floor((secs % 3600) / 60), total: 60 });
    segs.push({ label: "S", value: secs % 60, total: 60 });

    // Filter hidden days
    if (segs.length > 1 && segs[0]!.value < opts.hideDaysBelow) {
      segs.shift();
    }

    return segs.length > 0 ? segs : [{ label: "S", value: secs, total: 60 }];
  }

  // --- Rendering ---

  function render(): void {
    const remaining = Math.max(0, getTargetMs() - Date.now()) / 1000);
    const completed = remaining <= 0;
    const isWarning = remaining > 0 && remaining <= opts.warningThreshold;

    // Progress ring
    if (ringSvg) {
      const r = parseFloat(ringSvg.getAttribute("viewBox")!.split(" ")[2])! / 2;
      const circ = 2 * Math.PI * r;
      const frac = completed ? 1 : Math.max(0, 1 - remaining / (getTargetMs() - Date.now() + 1000) / 1000);
      const endAngle = -Math.PI / 2 + frac * circ;

      ringSvg.innerHTML = `
        <circle cx="${r}" cy="${r}" r="${r}" fill="none"
          stroke="${opts.ringTrailColor}" stroke-width="${r * 2 * opts.ringThickness}"
          stroke-linecap="round"/>
        <path d="M ${r + Math.cos(-Math.PI / 2)} ${r + Math.sin(-Math.PI / 2)}
          A ${r} ${r} 0 1 ${endAngle > Math.PI ? 1 : 0}"
          fill="none" stroke="${completed ? opts.completedColor : opts.ringColor}"
          stroke-width="${r * 2 * opts.ringThickness}" stroke-linecap="round"/>
      `;
    }

    // Digits
    digitsContainer.innerHTML = "";
    labelsContainer.innerHTML = "";

    const segs = computeSegments(remaining);
    const color = completed
      ? opts.completedColor
      : isWarning ? opts.warningColor
      : opts.digitColor;

    for (const seg of segs) {
      const digWrap = document.createElement("div");
      digWrap.style.cssText = "display:flex;flex-direction:column;align-items:center;min-width:24px;";

      const valEl = document.createElement("span");
      valEl.textContent = String(seg.value).padStart(2, "0");
      valEl.style.cssText = `
        font-size:${opts.digitFontSize}px;font-weight:800;
        font-family:'Courier New',monospace;color:${color};
        line-height:1;min-width:1ch;transition:none;
      `;

      if (opts.flipAnimation && lastValues.length === segs.length && lastValues[segs.indexOf(seg)]! !== seg.value) {
        valEl.style.animation = "flip 0.3s ease-out";
      }

      digWrap.appendChild(valEl);
      digitsContainer.appendChild(digWrap);

      const lbl = document.createElement("span");
      lbl.textContent = seg.label;
      lbl.style.cssText = `font-size:${opts.labelFontSize}px;color:${opts.labelColor};text-transform:uppercase;`;
      labelsContainer.appendChild(lbl);
    }

    lastValues = segs.map(s => s.value);

    opts.onTick?.(remaining, segs);

    if (completed && state !== "completed") {
      state = "completed";
      opts.onComplete?.();
    }
  }

  // --- Timer ---

  function startLoop(): void {
    stopLoop();
    state = "running";
    timer = setInterval(() => {
      if (destroyed) { stopLoop(); return; }
      render();
    }, 200);
  }

  function stopLoop(): void {
    if (timer != null) { clearInterval(timer); timer = null; }
  }

  // Init
  if (opts.autoStart) startLoop();
  else render();

  // --- Public API ---

  const instance: CountdownInstance = {
    element: root,

    start() { startLoop(); },
    pause() { stopLoop(); state = "paused"; },

    reset(newTarget: Date | number) {
      opts.target = newTarget;
      lastValues = [];
      state = "idle";
      if (opts.autoStart) startLoop();
      else render();
    },

    getRemaining: () => Math.max(0, getTargetMs() - Date.now()) / 1000),
    getState: () => state,

    setTarget(t: Date | number) { opts.target = t; },

    destroy() {
      destroyed = true;
      stopLoop();
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
