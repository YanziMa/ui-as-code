/**
 * Loading Spinner: Multiple spinner variants (pulse, dots, bars, ring, wave),
 * sizes, colors, speed control, text label, overlay mode, and programmatic API.
 */

// --- Types ---

export type SpinnerType =
  | "ring"       /* CSS border spinning ring */
  | "dots"       /* Bouncing dots */
  | "bars"       /* Pulse bars */
  | "pulse"      /* Scaling pulse dot */
  | "wave"       /* Wave dots */
  | "orbit"      /* Orbiting dots */
  | "roller"     /* Roller/coaster dots */
  | "spinner"    /* Classic spinner lines */
  | "clockwise"  /* Clockwise arc */
  | "grid"       /* Grid of pulsing squares */

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface LoadingSpinnerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Spinner type */
  type?: SpinnerType;
  /** Size preset */
  size?: SpinnerSize;
  /** Color (CSS value) */
  color?: string;
  /** Speed multiplier (1 = normal, 2 = fast, 0.5 = slow) */
  speed?: number;
  /** Label text below spinner */
  label?: string;
  /** Overlay mode (covers parent with semi-transparent bg) */
  overlay?: boolean;
  /** Overlay background color */
  overlayColor?: string;
  /** Center within container */
  center?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface SpinnerInstance {
  element: HTMLElement;
  show: () => void;
  hide: () => void;
  toggle: (visible?: boolean) => void;
  setLabel: (label: string) => void;
  setType: (type: SpinnerType) => void;
  setColor: (color: string) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<SpinnerSize, { dimension: number; strokeWidth: number }> = {
  xs:  { dimension: 16, strokeWidth: 2 },
  sm:  { dimension: 20, strokeWidth: 2 },
  md:  { dimension: 32, strokeWidth: 3 },
  lg:  { dimension: 48, strokeWidth: 3 },
  xl:  { dimension: 64, strokeWidth: 4 },
};

// --- Spinner Renderers ---

function renderRing(size: number, color: string, speed: number): string {
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    border:${Math.max(size / 10, 2)}px solid transparent;
    border-top-color:${color};border-right-color:${color};
    animation:spin ${1 / speed}s linear infinite;
  "></div>`;
}

function renderDots(size: number, color: string, speed: number): string {
  const dotSize = Math.max(size / 5, 4);
  return `<div style="display:flex;gap:${dotSize / 2}px;align-items:flex-end;height:${size}px;">
    ${[0, 1, 2].map((i) => `<div style="
      width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};
      animation:bounce ${0.6 / speed}s ease-in-out ${i * 0.15}s infinite;
    "></div>`).join("")}
  </div>`;
}

function renderBars(size: number, color: string, speed: number): string {
  const barW = Math.max(size / 8, 3);
  const gap = barW / 2;
  return `<div style="display:flex;gap:${gap}px;align-items:center;height:${size}px;">
    ${[0, 1, 2, 3].map((i) => `<div style="
      width:${barW}px;height:${size * (0.3 + Math.random() * 0.5)}px;border-radius:${barW / 2}px;background:${color};
      animation:pulseBar ${0.8 / speed}s ease-in-out ${i * 0.12}s infinite alternate;
    "></div>`).join("")}
  </div>`;
}

function renderPulse(size: number, color: string, speed: number): string {
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:0.4;
    animation:pulse ${1.2 / speed}s ease-in-out infinite;
  "></div>`;
}

function renderWave(size: number, color: string, speed: number): string {
  const dotSize = Math.max(size / 5, 4);
  return `<div style="display:flex;gap:${dotSize}px;align-items:center;">
    ${[0, 1, 2, 3, 4].map((i) => `<div style="
      width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};
      animation:wave ${1 / speed}s ease-in-out ${i * 0.1}s infinite;
    "></div>`).join("")}
  </div>`;
}

function renderOrbit(size: number, color: string, speed: number): string {
  const orbitSize = size;
  const dotSize = Math.max(orbitSize / 5, 4);
  return `<div style="
    position:relative;width:${orbitSize}px;height:${orbitSize}px;
  ">
    <div style="
      position:absolute;top:0;left:50%;transform:translateX(-50%);
      width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};
      animation:orbit ${1 / speed}s linear infinite;
    "></div>
  </div>`;
}

function renderRoller(size: number, color: string, speed: number): string {
  const dotSize = Math.max(size / 5, 4);
  return `<div style="display:flex;gap:${dotSize / 2}px;align-items:center;">
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<div style="
      width:${dotSize}px;height:${dotSize}px;border-radius:50%;
      background:${color};opacity:${0.2 + (i / 8) * 0.8};
      animation:roller ${1 / speed}s ease-in-out ${i * 0.08}s infinite alternate;
    "></div>`).join("")}
  </div>`;
}

function renderSpinnerLines(size: number, color: string, speed: number): string {
  const lineW = Math.max(size / 12, 2);
  const lineH = size * 0.8;
  const radius = size / 2;
  return `<div style="position:relative;width:${size}px;height:${size}px;">
    ${Array.from({ length: 12 }, (_, i) => {
      const angle = i * 30;
      const rad = (angle - 90) * Math.PI / 180;
      const x = radius + (radius - lineH / 2) * Math.cos(rad);
      const y = radius + (radius - lineH / 2) * Math.sin(rad);
      return `<div style="
        position:absolute;left:${x}px;top:${y}px;width:${lineW}px;height:${lineH}px;
        border-radius:${lineW / 2}px;background:${color};
        transform-origin:center ${lineH / 2}px;
        animation:fadeSpinner ${1 / speed}s ease-in-out ${i * (1 / 12)}s infinite;
      "></div>`;
    }).join("")}
  </div>`;
}

function renderClockwise(size: number, color: string, speed: number): string {
  const sw = Math.max(size / 8, 2);
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    border:${sw}px solid transparent;
    border-top-color:${color};border-left-color:${color};
    animation:spin ${0.8 / speed}s cubic-bezier(0.68,-0.55,0.27,1.55) infinite;
  "></div>`;
}

function renderGrid(size: number, color: string, speed: number): string {
  const cellSize = Math.max(size / 4, 8);
  const gap = cellSize / 3;
  return `<div style="
    display:grid;grid-template-columns:repeat(3,${cellSize}px);gap:${gap}px;
  ">
    ${Array.from({ length: 9 }, (_, i) => `<div style="
      width:${cellSize}px;height:${cellSize}px;border-radius:3px;background:${color};
      animation:gridPulse ${1 / speed}s ease-in-out ${(i % 3) * 0.15}s infinite alternate;
    "></div>`).join("")}
  </div>`;
}

// --- Main Class ---

export class LoadingSpinnerManager {
  create(options: LoadingSpinnerOptions): SpinnerInstance {
    const opts = {
      type: options.type ?? "ring",
      size: options.size ?? "md",
      color: options.color ?? "#6366f1",
      speed: options.speed ?? 1,
      overlay: options.overlay ?? false,
      overlayColor: options.overlayColor ?? "rgba(255,255,255,0.8)",
      center: options.center ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("LoadingSpinner: container element not found");

    let destroyed = false;

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `loading-spinner-wrapper ${opts.className ?? ""}`;
    wrapper.style.cssText = opts.overlay
      ? `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${opts.overlayColor};z-index:100;border-radius:inherit;`
      : `display:flex;flex-direction:column;align-items:center;justify-content:center;${opts.center ? "" : "align-self:flex-start;"}`;

    if (opts.center && !opts.overlay) {
      wrapper.style.minHeight = "80px";
    }

    // Spinner inner
    const spinnerInner = document.createElement("div");
    spinnerInner.className = "loading-spinner-inner";
    wrapper.appendChild(spinnerInner);

    // Label
    let labelEl: HTMLDivElement | null = null;
    if (opts.label) {
      labelEl = document.createElement("div");
      labelEl.className = "spinner-label";
      labelEl.style.cssText = `
        margin-top:10px;font-size:13px;color:#6b7280;text-align:center;
        font-family:-apple-system,sans-serif;
      `;
      labelEl.textContent = opts.label;
      wrapper.appendChild(labelEl);
    }

    container.appendChild(wrapper);

    // Inject global styles once
    injectSpinnerStyles();

    // Initial render
    render();

    function render(): void {
      const sz = SIZE_MAP[opts.size]!;
      const html = getSpinnerHtml(opts.type, sz.dimension, opts.color, opts.speed);
      spinnerInner.innerHTML = html;
    }

    function getSpinnerHtml(type: SpinnerType, size: number, color: string, speed: number): string {
      switch (type) {
        case "ring": return renderRing(size, color, speed);
        case "dots": return renderDots(size, color, speed);
        case "bars": return renderBars(size, color, speed);
        case "pulse": return renderPulse(size, color, speed);
        case "wave": return renderWave(size, color, speed);
        case "orbit": return renderOrbit(size, color, speed);
        case "roller": return renderRoller(size, color, speed);
        case "spinner": return renderSpinnerLines(size, color, speed);
        case "clockwise": return renderClockwise(size, color, speed);
        case "grid": return renderGrid(size, color, speed);
        default: return renderRing(size, color, speed);
      }
    }

    const instance: SpinnerInstance = {
      element: wrapper,

      show() { wrapper.style.display = ""; },
      hide() { wrapper.style.display = "none"; },
      toggle(visible) {
        wrapper.style.display = visible === undefined
          ? (wrapper.style.display === "none" ? "" : "none")
          : visible ? "" : "none";
      },

      setLabel(label: string) {
        if (!labelEl && label) {
          labelEl = document.createElement("div");
          labelEl.className = "spinner-label";
          labelEl.style.cssText = "margin-top:10px;font-size:13px;color:#6b7280;";
          wrapper.appendChild(labelEl);
        }
        if (labelEl) {
          labelEl.textContent = label;
          labelEl.style.display = label ? "" : "none";
        }
      },

      setType(type: SpinnerType) {
        opts.type = type;
        render();
      },

      setColor(color: string) {
        opts.color = color;
        render();
      },

      destroy() {
        destroyed = true;
        wrapper.remove();
      },
    };

    return instance;
  }
}

/** Inject CSS keyframes for all spinner types (idempotent) */
let stylesInjected = false;

function injectSpinnerStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.id = "spinner-keyframes";
  style.textContent = `
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes bounce{0%,80%,100%{transform:scale(0.6);}40%{transform:scale(1);}}
    @keyframes pulseBar{0%{height:20%;}100%{height:80%;}}
    @keyframes pulse{0%,100%{transform:scale(0.8);opacity:0.4;}50%{transform:scale(1);opacity:0.8;}}
    @keyframes wave{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
    @keyframes orbit{to{transform:rotate(360deg) translateX(${/* dynamic */ 0}px) rotate(-360deg);}}
    @keyframes roller{0%{transform:scale(0.4);}100%{transform:scale(1);}}
    @keyframes fadeSpinner{0%,100%{opacity:0.1;}50%{opacity:1;}}
    @keyframes gridPulse{0%{transform:scale(0.6);opacity:0.3;}100%{transform:scale(1);opacity:1;}}
  `;
  document.head.appendChild(style);
}

/** Convenience: create a loading spinner */
export function createLoadingSpinner(options: LoadingSpinnerOptions): SpinnerInstance {
  return new LoadingSpinnerManager().create(options);
}
