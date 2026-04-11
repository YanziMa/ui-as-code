/**
 * Spinner Utilities: Loading spinners with multiple visual styles,
 * sizes, colors, overlay modes, and programmatic control.
 */

// --- Types ---

export type SpinnerType = "ring" | "dots" | "pulse" | "bars" | "orbit" | "wave" | "rolling";
export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinnerOptions {
  /** Visual style */
  type?: SpinnerType;
  /** Size variant */
  size?: SpinnerSize;
  /** Color (CSS value) */
  color?: string;
  /** Secondary color (for some types) */
  secondaryColor?: string;
  /** Speed multiplier (1 = normal) */
  speed?: number;
  /** Show as overlay covering a target element */
  overlay?: boolean;
  /** Overlay target element */
  target?: HTMLElement;
  /** Overlay background opacity (0-1) */
  overlayOpacity?: number;
  /** Center the spinner */
  centered?: boolean;
  /** Label text (for screen readers) */
  label?: string;
  /** Custom class name */
  className?: string;
}

export interface SpinnerInstance {
  /** The spinner element */
  el: HTMLElement;
  /** Show the spinner */
  show: () => void;
  /** Hide the spinner */
  hide: () => void;
  /** Check visibility */
  isVisible: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Map ---

const SPINNER_SIZES: Record<SpinnerSize, number> = {
  "xs": 16,
  "sm": 20,
  "md": 32,
  "lg": 44,
  "xl": 64,
};

// --- Keyframe Registry ---

const KEYFRAMES: Record<string, string> = {
  "spinner-ring": "@keyframes spin-ring{to{transform:rotate(360deg);}}",
  "spinner-dots-1": "@keyframes dot-bounce-1{0%,80%,100%{transform:scale(0);}40%{transform:scale(1);}}",
  "spinner-dots-2": "@keyframes dot-bounce-2{0%,80%,100%{transform:scale(0);}40%{transform:scale(1);}}",
  "spinner-dots-3": "@keyframes dot-bounce-3{0%,80%,100%{transform:scale(0);}40%{transform:scale(1);}}",
  "spinner-pulse": "@keyframes pulse-scale{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(0.85);}}",
  "spinner-bars-1": "@keyframes bar-stretch-1{0%,40%,100%{transform:scaleY(0.4);}20%{transform:scaleY(1);}}",
  "spinner-bars-2": "@keyframes bar-stretch-2{0%,40%,100%{transform:scaleY(0.4);}20%{transform:scaleY(1);}}",
  "spinner-bars-3": "@keyframes bar-stretch-3{0%,40%,100%{transform:scaleY(0.4);}20%{transform:scaleY(1);}}",
  "spinner-orbit": "@keyframes orbit-spin{to{transform:rotate(360deg);}}",
  "spinner-wave": "@keyframes wave-motion{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}",
  "spinner-roll": "@keyframes roll-spin{to{transform:rotate(360deg);}}",
};

let keyframesInjected = false;

function _injectKeyframes(): void {
  if (keyframesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = Object.values(KEYFRAMES).join("\n");
  style.id = "spinner-keyframes";
  document.head.appendChild(style);
  keyframesInjected = true;
}

// --- Core Factory ---

/**
 * Create a loading spinner.
 *
 * @example
 * ```ts
 * // Simple ring spinner
 * const spinner = createSpinner({ type: "ring", size: "md" });
 * container.appendChild(spinner.el);
 *
 * // With overlay over an element
 * const overlaySpinner = createSpinner({ type: "dots", overlay: true, target: panelEl });
 * ```
 */
export function createSpinner(options: SpinnerOptions = {}): SpinnerInstance {
  _injectKeyframes();

  const {
    type = "ring",
    size = "md",
    color = "#3b82f6",
    secondaryColor = "#e5e7eb",
    speed = 1,
    overlay = false,
    target,
    overlayOpacity = 0.7,
    centered = true,
    label = "Loading...",
    className,
  } = options;

  let _visible = true;
  const dim = SPINNER_SIZES[size];

  // Outer wrapper (for overlay mode)
  const wrapper = document.createElement("div");
  wrapper.className = `spinner-wrapper ${type} ${size} ${overlay ? "overlay" : ""} ${className ?? ""}`.trim();
  wrapper.setAttribute("role", "status");
  wrapper.setAttribute("aria-label", label);

  if (overlay && target) {
    wrapper.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      `background:rgba(255,255,255,${overlayOpacity});z-index:10;`;
    target.style.position = "relative";
    target.appendChild(wrapper);
  } else {
    wrapper.style.cssText =
      (centered ? "display:flex;align-items:center;justify-content:center;" : "display:inline-flex;") +
      "vertical-align:middle;";
  }

  // Inner spinner element
  const spinnerEl = _createSpinnerElement(type, dim, color, secondaryColor, speed);

  if (overlay) {
    wrapper.appendChild(spinnerEl);
  } else {
    wrapper.appendChild(spinnerEl);
  }

  // --- Methods ---

  function show(): void {
    _visible = true;
    wrapper.style.display = "";
  }

  function hide(): void {
    _visible = false;
    wrapper.style.display = "none";
  }

  function isVisible(): boolean { return _visible; }

  function destroy(): void {
    hide();
    if (overlay && target) {
      wrapper.remove();
    }
  }

  return { el: wrapper, show, hide, isVisible, destroy };
}

// --- Spinner Element Builders ---

function _createSpinnerElement(
  type: SpinnerType,
  dim: number,
  color: string,
  secondaryColor: string,
  speed: number,
): HTMLElement {
  const duration = `${0.8 / speed}s`;

  switch (type) {
    case "ring": {
      const el = document.createElement("div");
      el.style.cssText =
        `width:${dim}px;height:${dim}px;border:3px solid ${secondaryColor};` +
        `border-top-color:${color};border-radius:50%;animation:spin-ring ${duration} linear infinite;`;
      return el;
    }

    case "dots": {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;gap:4px;align-items:center;";
      const dotSize = Math.round(dim / 3.5);
      [1, 2, 3].forEach((i) => {
        const dot = document.createElement("div");
        dot.style.cssText =
          `width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};` +
          `animation:dot-bounce-${i} ${duration} infinite ${i * 0.15}s;`;
        el.appendChild(dot);
      });
      return el;
    }

    case "pulse": {
      const el = document.createElement("div");
      el.style.cssText =
        `width:${dim}px;height:${dim}px;border-radius:50%;background:${color};` +
        `animation:pulse-scale ${duration}s ease-in-out infinite;`;
      return el;
    }

    case "bars": {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;gap:3px;align-items:flex-end;height:" + dim + "px;";
      const barWidth = Math.max(3, Math.round(dim / 8));
      [1, 2, 3].forEach((i) => {
        const bar = document.createElement("div");
        bar.style.cssText =
          `width:${barWidth}px;height:${dim}px;background:${color};` +
          `border-radius:2px;animation:bar-stretch-${i} ${duration}s infinite ${i * 0.12}s;` +
          "transform-origin:center;";
        el.appendChild(bar);
      });
      return el;
    }

    case "orbit": {
      const el = document.createElement("div");
      el.style.cssText =
        `width:${dim}px;height:${dim}px;position:relative;animation:orbit-spin ${duration}s linear infinite;`;

      const inner = document.createElement("div");
      inner.style.cssText =
        `position:absolute;top:0;left:50%;width:${Math.round(dim * 0.25)}px;height:${Math.round(dim * 0.25)}px;` +
        `margin-left:-${Math.round(dim * 0.125)}px;border-radius:50%;background:${color};`;
      el.appendChild(inner);
      return el;
    }

    case "wave": {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;gap:3px;align-items:flex-end;height:" + dim + "px;";
      const dotSize = Math.round(dim / 4);
      [1, 2, 3, 4].forEach((i) => {
        const dot = document.createElement("div");
        dot.style.cssText =
          `width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};` +
          `animation:wave-motion ${duration}s ease-in-out infinite ${i * 0.12}s;`;
        el.appendChild(dot);
      });
      return el;
    }

    case "rolling": {
      const el = document.createElement("div");
      el.style.cssText =
        `width:${dim}px;height:${dim}px;border-radius:50%;` +
        `background:conic-gradient(from 0deg, transparent 0 120deg, ${color} 120deg 240deg, transparent 240deg 360deg);` +
        `animation:roll-spin ${duration}s linear infinite;` +
        `mask:radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));` +
        `-webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));`;
      return el;
    }

    default:
      return _createSpinnerElement("ring", dim, color, secondaryColor, speed);
  }
}
