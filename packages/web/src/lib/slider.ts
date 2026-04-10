/**
 * Range Slider: Dual-handle range slider, single slider, step snapping, marks/labels,
 * tooltip on drag, keyboard navigation, vertical mode, disabled state, min/max constraints,
 * value formatting, and accessibility.
 */

// --- Types ---

export interface SliderMark {
  value: number;
  label?: string;
}

export interface SliderOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Step increment (default: 1) */
  step?: number;
  /** Initial value(s) — single number or [min, max] for range */
  value?: number | [number, number];
  /** Whether this is a range slider (two handles) */
  range?: boolean;
  /** Marks/ticks along the track */
  marks?: SliderMark[];
  /** Show tooltip while dragging */
  showTooltip?: boolean;
  /** Custom value formatter for tooltip */
  formatValue?: (value: number) => string;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Disabled state */
  disabled?: boolean;
  /** Track color (CSS value) */
  trackColor?: string;
  /** Handle color */
  handleColor?: string;
  /** Callback on value change */
  onChange?: (value: number | [number, number]) => void;
  /** Callback when dragging ends */
  onCommit?: (value: number | [number, number]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SliderInstance {
  element: HTMLElement;
  getValue: () => number | [number, number];
  setValue: (value: number | [number, number]) => void;
  setMin: (min: number) => void;
  setMax: (max: number) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Helpers ---

function snapToStep(value: number, min: number, step: number): number {
  const offset = value - min;
  const snapped = Math.round(offset / step) * step + min;
  // Handle floating point precision
  return parseFloat(snapped.toFixed(10));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function percentOf(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

// --- Main Class ---

export class SliderManager {
  create(options: SliderOptions): SliderInstance {
    const opts = {
      min: options.min ?? 0,
      max: options.max ?? 100,
      step: options.step ?? 1,
      range: options.range ?? false,
      showTooltip: options.showTooltip ?? true,
      orientation: options.orientation ?? "horizontal",
      disabled: options.disabled ?? false,
      trackColor: options.trackColor ?? "#6366f1",
      handleColor: options.handleColor ?? "#ffffff",
      formatValue: options.formatValue ?? ((v: number) => String(v)),
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Slider: container element not found");

    // Build DOM
    container.className = `slider ${opts.orientation} ${opts.className ?? ""}`;
    container.style.cssText = `
      position:relative;${opts.orientation === "horizontal"
        ? "height:24px;display:flex;align-items:center;padding:0 10px;"
        : "width:24px;display:inline-flex;flex-direction:column;align-items:center;padding:10px 0;"}
      user-select:none;touch-action:none;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // Track
    const track = document.createElement("div");
    track.className = "slider-track";
    track.style.cssText = `
      position:relative;${opts.orientation === "horizontal"
        ? "width:100%;height:4px;border-radius:2px;background:#e5e7eb;"
        ? "height:100%;width:4px;border-radius:2px;background:#e5e7eb;"}
      flex-shrink:0;
    `;
    container.appendChild(track);

    // Filled portion
    const fill = document.createElement("div");
    fill.className = "slider-fill";
    fill.style.cssText = `
      position:absolute;height:100%;border-radius:2px;
      background:${opts.trackColor};transition:left 0.1s,width 0.1s;
    `;
    if (opts.orientation === "vertical") {
      fill.style.bottom = "0";
      fill.style.left = "0";
      fill.style.width = "100%";
      fill.style.transition = "bottom 0.1s,height 0.1s";
    }
    track.appendChild(fill);

    // Handles
    const handles: HTMLDivElement[] = [];
    const tooltips: HTMLDivElement[] = [];

    for (let i = 0; i < (opts.range ? 2 : 1); i++) {
      const handle = document.createElement("div");
      handle.className = "slider-handle";
      handle.dataset.handle = String(i);
      handle.style.cssText = `
        position:absolute;width:18px;height:18px;border-radius:50%;
        background:${opts.handleColor};border:2px solid ${opts.trackColor};
        box-shadow:0 1px 4px rgba(0,0,0,0.15);cursor:grab;z-index:2;
        top:50%;transform:translate(-50%,-50%);
        transition:box-shadow 0.15s,transform 0.1s;
      `;
      if (opts.orientation === "vertical") {
        handle.style.left = "50%";
        handle.style.top = "";
        handle.style.transform = "translate(-50%,50%)";
      }
      handle.addEventListener("mouseenter", () => {
        handle.style.boxShadow = "0 2px 8px rgba(99,102,241,0.35)";
        handle.style.transform = opts.orientation === "horizontal"
          ? "translate(-50%,-50%) scale(1.15)"
          : "translate(-50%,50%) scale(1.15)";
      });
      handle.addEventListener("mouseleave", () => {
        if (!activeHandleIndex) {
          handle.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
          handle.style.transform = opts.orientation === "horizontal"
            ? "translate(-50%,-50%)"
            : "translate(-50%,50%)";
        }
      });
      track.appendChild(handle);
      handles.push(handle);

      // Tooltip
      if (opts.showTooltip) {
        const tooltip = document.createElement("div");
        tooltip.className = "slider-tooltip";
        tooltip.style.cssText = `
          position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);
          padding:3px 8px;background:#1e1b4b;color:#fff;border-radius:4px;
          font-size:11px;font-weight:500;white-space:nowrap;pointer-events:none;
          opacity:0;transition:opacity 0.15s;z-index:10;
        `;
        if (opts.orientation === "vertical") {
          tooltip.style.bottom = "";
          tooltip.style.left = "calc(100% + 8px)";
          tooltip.style.top = "50%";
          tooltip.style.transform = "translateY(-50%)";
        }
        // Arrow
        const arrow = document.createElement("span");
        arrow.style.cssText = `
          position:absolute;left:50%;top:100%;transform:translateX(-50%);
          border:4px solid transparent;border-top-color:#1e1b4b;
        `;
        if (opts.orientation === "vertical") {
          arrow.style.top = "50%";
          arrow.style.left = "0";
          arrow.style.transform = "translateY(-50%)";
          arrow.style.borderTopColor = "transparent";
          arrow.style.borderLeftColor = "#1e1b4b";
        }
        tooltip.appendChild(arrow);
        handle.appendChild(tooltip);
        tooltips.push(tooltip);
      }
    }

    // Marks
    if (opts.marks) {
      for (const mark of opts.marks) {
        const pct = percentOf(mark.value, opts.min, opts.max);
        const markEl = document.createElement("div");
        markEl.className = "slider-mark";
        markEl.style.cssText = opts.orientation === "horizontal"
          ? `position:absolute;left:${pct}%;transform:translateX(-50%);width:2px;height:8px;background:#d1d5db;border-radius:1px;top:50%;`
          : `position:absolute;top:${pct}%;transform:translateY(-50%);width:8px;height:2px;background:#d1d5db;border-radius:1px;left:50%;`;
        track.appendChild(markEl);

        if (mark.label) {
          const label = document.createElement("span");
          label.className = "slider-mark-label";
          label.style.cssText = opts.orientation === "horizontal"
            ? `position:absolute;left:${pct}%;transform:translateX(-50%);margin-top:6px;font-size:11px;color:#888;`
            : `position:absolute;top:${pct}%;transform:translateY(-50%);margin-left:10px;font-size:11px;color:#888;`;
          label.textContent = mark.label;
          container.appendChild(label);
        }
      }
    }

    // State
    let currentValue: number | [number, number] = opts.range
      ? (options.value as [number, number] ?? [opts.min + (opts.max - opts.min) * 0.3, opts.min + (opts.max - opts.min) * 0.7])
      : (options.value ?? opts.min + (opts.max - opts.min) * 0.5);
    let activeHandleIndex: number | null = null;
    let isDragging = false;

    function normalizeValue(val: number): number {
      return snapToStep(clamp(val, opts.min, opts.max), opts.min, opts.step);
    }

    function getHandleValues(): [number, number] {
      if (opts.range) {
        const rv = currentValue as [number, number];
        return [Math.min(rv[0], rv[1]), Math.max(rv[0], rv[1])];
      }
      const v = currentValue as number;
      return [v, v];
    }

    function updateUI(): void {
      const [lo, hi] = getHandleValues();

      if (opts.orientation === "horizontal") {
        const leftPct = percentOf(lo, opts.min, opts.max);
        const rightPct = percentOf(hi, opts.min, opts.max);
        fill.style.left = `${leftPct}%`;
        fill.style.width = `${rightPct - leftPct}%`;

        handles[0]!.style.left = `${leftPct}%`;
        if (handles[1]) handles[1].style.left = `${rightPct}%`;
      } else {
        const bottomPct = 100 - percentOf(hi, opts.min, opts.max);
        const topPct = 100 - percentOf(lo, opts.min, opts.max);
        fill.style.bottom = `${bottomPct}%`;
        fill.style.height = `${topPct - bottomPct}%`;

        handles[0]!.style.top = `${100 - percentOf(lo, opts.min, opts.max)}%`;
        if (handles[1]) handles[1].style.top = `${100 - percentOf(hi, opts.min, opts.max)}%`;
      }

      // Update tooltips
      for (let i = 0; i < handles.length; i++) {
        if (tooltips[i]) {
          const val = i === 0 ? lo : hi;
          tooltips[i]!.textContent = opts.formatValue(val);
        }
      }
    }

    function getValueFromPosition(clientPos: number): number {
      const rect = track.getBoundingClientRect();
      let ratio: number;
      if (opts.orientation === "horizontal") {
        ratio = (clientPos - rect.left) / rect.width;
      } else {
        ratio = 1 - (clientPos - rect.top) / rect.height;
      }
      return normalizeValue(opts.min + ratio * (opts.max - opts.min));
    }

    function findClosestHandle(pos: number): number {
      if (!opts.range) return 0;
      const val = getValueFromPosition(pos);
      const [lo, hi] = getHandleValues();
      return Math.abs(val - lo) <= Math.abs(val - hi) ? 0 : 1;
    }

    function setValueFromPosition(clientPos: number): void {
      const val = getValueFromPosition(clientPos);
      const handleIdx = activeHandleIndex ?? findClosestHandle(clientPos);

      if (opts.range) {
        const arr = [...currentValue] as [number, number];
        arr[handleIdx] = val;
        currentValue = arr;
      } else {
        currentValue = val;
      }

      updateUI();
      opts.onChange?.(currentValue);
    }

    // Pointer events
    function handlePointerDown(e: PointerEvent): void {
      if (opts.disabled) return;
      e.preventDefault();
      isDragging = true;
      activeHandleIndex = e.target === handles[0] ? 0 : e.target === handles[1] ? 1 : findClosestHandle(
        opts.orientation === "horizontal" ? e.clientX : e.clientY
      );

      handles[activeHandleIndex!]!.style.cursor = "grabbing";
      handles[activeHandleIndex!]!.setPointerCapture(e.pointerId);

      // Show tooltip
      if (tooltips[activeHandleIndex!]) {
        tooltips[activeHandleIndex!]!.style.opacity = "1";
      }

      setValueFromPosition(opts.orientation === "horizontal" ? e.clientX : e.clientY);

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    }

    function handlePointerMove(e: PointerEvent): void {
      if (!isDragging) return;
      setValueFromPosition(opts.orientation === "horizontal ? e.clientX : e.clientY");
    }

    function handlePointerUp(_e: PointerEvent): void {
      if (!isDragging) return;
      isDragging = false;

      if (activeHandleIndex !== null && handles[activeHandleIndex]) {
        handles[activeHandleIndex]!.style.cursor = "grab";
        if (tooltips[activeHandleIndex]) {
          tooltips[activeHandleIndex]!.style.opacity = "0";
        }
      }
      activeHandleIndex = null;

      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);

      opts.onCommit?.(currentValue);
    }

    // Attach events
    for (const handle of handles) {
      handle.addEventListener("pointerdown", handlePointerDown);
    }

    // Also allow clicking on track to jump
    track.addEventListener("click", (e) => {
      if (opts.disabled) return;
      if ((e.target as HTMLElement).classList.contains("slider-handle")) return;
      const pos = opts.orientation === "horizontal" ? e.clientX : e.clientY;
      const val = getValueFromPosition(pos);
      if (opts.range) {
        const [lo, hi] = getHandleValues();
        const closerToLo = Math.abs(val - lo) <= Math.abs(val - hi);
        const arr = [...currentValue] as [number, number];
        arr[closerToLo ? 0 : 1] = val;
        currentValue = arr;
      } else {
        currentValue = val;
      }
      updateUI();
      opts.onChange?.(currentValue);
      opts.onCommit?.(currentValue);
    });

    // Keyboard support
    container.tabIndex = 0;
    container.addEventListener("keydown", (e: KeyboardEvent) => {
      if (opts.disabled) return;
      const stepAmt = e.shiftKey ? opts.step * 10 : opts.step;

      if (opts.range) {
        const arr = [...currentValue] as [number, number];
        switch (e.key) {
          case "ArrowLeft":
          case "ArrowDown":
            e.preventDefault();
            arr[0] = normalizeValue(arr[0] - stepAmt);
            currentValue = arr;
            break;
          case "ArrowRight":
          case "ArrowUp":
            e.preventDefault();
            arr[0] = normalizeValue(arr[0] + stepAmt);
            currentValue = arr;
            break;
          case "Home":
            e.preventDefault();
            arr[0] = opts.min;
            currentValue = arr;
            break;
          case "End":
            e.preventDefault();
            arr[0] = opts.max;
            currentValue = arr;
            break;
          default:
            return;
        }
      } else {
        const v = currentValue as number;
        switch (e.key) {
          case "ArrowLeft":
          case "ArrowDown":
            e.preventDefault();
            currentValue = normalizeValue(v - stepAmt);
            break;
          case "ArrowRight":
          case "ArrowUp":
            e.preventDefault();
            currentValue = normalizeValue(v + stepAmt);
            break;
          case "Home":
            e.preventDefault();
            currentValue = opts.min;
            break;
          case "End":
            e.preventDefault();
            currentValue = opts.max;
            break;
          default:
            return;
        }
      }

      updateUI();
      opts.onChange?.(currentValue);
      opts.onCommit?.(currentValue);
    });

    // Initial render
    updateUI();

    const instance: SliderInstance = {
      element: container,

      getValue() { return currentValue; },

      setValue(val: number | [number, number]) {
        if (opts.range) {
          const arr = val as [number, number];
          currentValue = [normalizeValue(arr[0]), normalizeValue(arr[1])];
        } else {
          currentValue = normalizeValue(val as number);
        }
        updateUI();
      },

      setMin(min: number) {
        opts.min = min;
        updateUI();
      },

      setMax(max: number) {
        opts.max = max;
        updateUI();
      },

      disable() {
        opts.disabled = true;
        container.style.opacity = "0.5";
        container.style.pointerEvents = "none";
      },

      enable() {
        opts.disabled = false;
        container.style.opacity = "";
        container.style.pointerEvents = "";
      },

      destroy() {
        for (const handle of handles) {
          handle.removeEventListener("pointerdown", handlePointerDown);
        }
        track.removeEventListener("click", () => {});
        container.removeEventListener("keydown", () => {});
      },
    };

    return instance;
  }
}

/** Convenience: create a slider */
export function createSlider(options: SliderOptions): SliderInstance {
  return new SliderManager().create(options);
}
