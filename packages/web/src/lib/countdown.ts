/**
 * Countdown Timer: Configurable countdown with days/hours/minutes/seconds display,
 * completion callback, custom formatting, pause/resume, and multiple style variants.
 */

// --- Types ---

export type CountdownSize = "sm" | "md" | "lg";
export type CountdownVariant = "default" | "segmented" | "flip" | "digital";

export interface CountdownOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Target date (Date object or ISO string or timestamp ms) */
  target?: Date | string | number;
  /** Duration in seconds (alternative to target date) */
  duration?: number;
  /** Initial value in seconds (for duration mode) */
  initialValue?: number;
  /** Size variant */
  size?: CountdownSize;
  /** Visual variant */
  variant?: CountdownVariant;
  /** Show days? (auto-hide if < 1 day) */
  showDays?: boolean;
  /** Show hours? */
  showHours?: boolean;
  /** Show minutes? */
  showMinutes?: boolean;
  /** Show seconds? */
  showSeconds?: boolean;
  /** Separator between units (default: ":") */
  separator?: string;
  /** Labels (e.g., {days:"d", hours:"h", ...}) */
  labels?: Record<string, string>;
  /** Pad numbers with leading zeros? */
  padNumbers?: boolean;
  /** Callback when countdown reaches zero */
  onComplete?: () => void;
  /** Callback on each tick (every second) */
  onTick?: (remaining: number) => void;
  /** Auto-start on create? (default: true) */
  autoStart?: boolean;
  /** Direction: counting down (true) or up (false) */
  countDown?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface CountdownInstance {
  element: HTMLElement;
  getRemaining: () => number;
  isComplete: () => boolean;
  pause: () => void;
  resume: () => void;
  reset: (target?: Date | string | number, duration?: number) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<CountdownSize, { fontSize: number; padding: string; gap: number }> = {
  sm: { fontSize: 12, padding: "6px 10px", gap: 4 },
  md: { fontSize: 16, padding: "8px 14px", gap: 6 },
  lg: { fontSize: 24, padding: "12px 20px", gap: 8 },
};

// --- Main Class ---

export class CountdownManager {
  create(options: CountdownOptions): CountdownInstance {
    const opts = {
      showDays: options.showDays ?? true,
      showHours: options.showHours ?? true,
      showMinutes: options.showMinutes ?? true,
      showSeconds: options.showSeconds ?? true,
      separator: options.separator ?? ":",
      labels: options.labels ?? {},
      padNumbers: options.padNumbers ?? false,
      autoStart: options.autoStart ?? true,
      countDown: options.countDown ?? true,
      size: options.size ?? "md",
      variant: options.variant ?? "default",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Countdown: container not found");

    container.className = `countdown countdown-${opts.size} countdown-${opts.variant} ${opts.className ?? ""}`;

    // Calculate target timestamp
    let targetTime = 0;
    if (options.target instanceof Date) {
      targetTime = options.target.getTime();
    } else if (typeof options.target === "string") {
      targetTime = new Date(options.target).getTime();
    } else if (typeof options.target === "number") {
      targetTime = options.target;
    }

    // Duration mode
    const isDurationMode = targetTime === 0 && (options.duration ?? 0) > 0;
    let totalSeconds = isDurationMode ? (options.duration ?? 0) : Math.max(0, targetTime - Date.now());

    let remaining = opts.initialValue ?? totalSeconds;
    let isComplete = remaining <= 0;
    let paused = false;
    let destroyed = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function getDisplayParts(sec: number): Array<{ value: string; label: string }> {
      const absSec = Math.abs(sec);
      const days = Math.floor(absSec / 86400);
      const hours = Math.floor((absSec % 86400) / 3600);
      const minutes = Math.floor((absSec % 3600) / 60);
      const seconds = absSec % 60;

      const parts: Array<{ value: string; label: string }> = [];

      if (opts.showDays && (isDurationMode || days > 0)) {
        parts.push({ value: String(days), label: opts.labels.days ?? "d" });
      }
      if (opts.showHours && (isDurationMode || days > 0 || hours > 0)) {
        parts.push({ value: String(hours), label: opts.labels.hours ?? "h" });
      }
      if (opts.showMinutes) {
        parts.push({ value: String(minutes), label: opts.labels.minutes ?? "m" });
      }
      if (opts.showSeconds) {
        parts.push({ value: String(seconds), label: opts.labels.seconds ?? "s" });
      }

      return parts;
    }

    function render(): void {
      container.innerHTML = "";

      const sz = SIZE_STYLES[opts.size];
      const sec = Math.max(0, Math.floor(remaining));
      const parts = getDisplayParts(sec);

      switch (opts.variant) {
        case "segmented":
          renderSegmented(parts);
          break;
        case "flip":
          renderFlip(parts);
          break;
        case "digital":
          renderDigital(parts);
          break;
        default:
          renderDefault(parts);
      }
    }

    function renderDefault(parts: Array<{ value: string; label: string }>): void {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;align-items:center;gap:${sz.gap}px;font-family:'SF Mono',monospace;font-size:${sz.fontSize}px;font-weight:600;color:#111827;`;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!;
        const val = opts.padNumbers ? part.value.padStart(2, "0") : part.value;

        const unitEl = document.createElement("span");
        unitEl.style.cssText = `
          background:linear-gradient(135deg,#f3f4f6,#e5e7eb);border-radius:4px;
          padding:${sz.padding};min-width:36px;text-align:center;line-height:1;
          ${isComplete ? "opacity:0.5;" : ""}
        `;
        unitEl.textContent = val;

        // Label after last unit
        if (i === parts.length - 1 && part.label) {
          const lbl = document.createElement("span");
          lbl.style.cssText = `font-size:${sz.fontSize - 2}px;color:#9ca3af;margin-left:4px;font-weight:400;`;
          lbl.textContent = part.label;
          unitEl.appendChild(lbl);
        } else if (i < parts.length - 1) {
          const sep = document.createElement("span");
          sep.style.cssText = `color:#d1d5db;font-weight:300;`;
          sep.textContent = opts.separator;
          row.appendChild(sep);
        }

        row.appendChild(unitEl);
      }

      container.appendChild(row);

      // Complete message
      if (isComplete) {
        const doneMsg = document.createElement("div");
        doneMsg.style.cssText = `
          font-size:${sz.fontSize - 2}px;color:#22c55e;font-weight:600;text-align:center;
          margin-top:8px;animation:pulse 1s ease-in-out infinite;
        `;
        doneMsg.textContent = "\u2705 Complete!";
        container.appendChild(doneMsg);
      }
    }

    function renderSegmented(parts: Array<{ value: string; label: string }>): void {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;align-items:flex-end;gap:${sz.gap / 2}px;`;

      for (const part of parts) {
        const val = opts.padNumbers ? part.value.padStart(2, "0") : part.value;
        const digits = val.split("");

        for (const d of digits) {
          const digit = document.createElement("span");
          digit.className = "cd-segment-digit";
          digit.style.cssText = `
            display:inline-flex;align-items:center;justify-content:center;
            width:${sz.fontSize + 12}px;height:${sz.fontSize + 16px;border-radius:4px;
            background:#111827;color:#fff;font-size:${sz.fontSize}px;font-weight:700;
            line-height:1;padding-bottom:2px;
            clip-path:polygon(10% 0, 0 0, 0 100%, 10% 100%, 90% 100%, 90% 0);
            transform-origin:bottom center;
            transition:transform 0.3s ease;
          `;
          digit.textContent = d;
          digit.dataset.value = d;
          row.appendChild(digit);
        }

        // Spacer between groups
        const spacer = document.createElement("span");
        spacer.style.cssText = `width:${sz.gap / 2}px;`;
        row.appendChild(spacer);
      }

      container.appendChild(row);
    }

    function renderFlip(parts: Array<{ value: string; label: string }>): void {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;gap:${sz.gap}px;perspective:200px;`;

      for (const part of parts) {
        const val = opts.padNumbers ? part.value.padStart(2, "0") : part.value;
        const flip = document.createElement("div");
        flip.className = "cd-flip";
        flip.style.cssText = `
          width:${sz.fontSize * 1.5 + 20}px;height:${sz.fontSize * 1.5 + 14px;background:#111827;
          color:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;
          font-size:${sz.fontSize}px;font-weight:700;font-family:monospace;
          transform-style:preserve-3d;transition:transform 0.3s ease;
        `;
        flip.textContent = val;
        flip.dataset.value = val;
        row.appendChild(flip);
      }

      container.appendChild(row);
    }

    function renderDigital(parts: Array<{ value: string; label: string }>): void {
      const row = document.createElement("div");
      row.style.cssText = `
        background:#000;border-radius:8px;padding:${sz.padding};
        display:inline-flex;gap:4px;font-family:'Courier New',monospace;
        border:2px solid #333;
      `;

      for (const part of parts) {
        const val = opts.padNumbers ? part.value.padStart(2, "0") : part.value;
        const seg = document.createElement("span");
        seg.style.cssText = `
          color:#00ff41;font-size:${sz.fontSize + 4}px;font-weight:700;
          text-shadow:0 0 10px #00ff4180;min-width:ch(${sz.fontSize + 2}, 1em);
        `;
        seg.textContent = val;
        row.appendChild(seg);

        if (part !== parts[parts.length - 1]) {
          const dot = document.createElement("span");
          dot.style.cssText = `color:#00ff41;font-size:${sz.fontSize + 4}px;`;
          dot.textContent = opts.separator;
          row.appendChild(dot);
        }
      }

      container.appendChild(row);
    }

    function tick(): void {
      if (destroyed || paused) return;

      if (opts.countDown) {
        remaining = Math.max(0, remaining - 1);
      } else {
        remaining++;
      }

      if (!isComplete && remaining <= 0) {
        isComplete = true;
        opts.onComplete?.();
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      }

      render();
      opts.onTick?.(remaining);
    }

    // Start
    if (opts.autoStart && !isComplete) {
      intervalId = setInterval(tick, 1000);
      render(); // Initial render
    } else {
      render();
    }

    // Add keyframe animation for pulse
    if (!document.getElementById("countdown-styles")) {
      const s = document.createElement("style");
      s.id = "countdown-styles";
      s.textContent = "@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}";
      document.head.appendChild(s);
    }

    const instance: CountdownInstance = {
      element: container,

      getRemaining() { return Math.max(0, remaining); },

      isComplete() { return isComplete; },

      pause() { paused = true; },

      resume() { paused = false; },

      reset(target?, duration?) {
        if (target !== undefined) {
          if (target instanceof Date) targetTime = target.getTime();
          else if (typeof target === "string") targetTime = new Date(target).getTime();
          else if (typeof target === "number") targetTime = target;
        }
        if (duration !== undefined) totalSeconds = duration;
        remaining = totalSeconds;
        isComplete = remaining <= 0;
        paused = false;
        if (intervalId) clearInterval(intervalId);
        if (opts.autoStart && !isComplete) intervalId = setInterval(tick, 1000);
        render();
      },

      destroy() {
        destroyed = true;
        if (intervalId) clearInterval(intervalId);
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a countdown */
export function createCountdown(options: CountdownOptions): CountdownInstance {
  return new CountdownManager().create(options);
}
