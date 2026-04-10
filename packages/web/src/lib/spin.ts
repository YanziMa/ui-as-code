/**
 * Spin / Loading Spinner: Multiple spinner variants (circle, dots, bars, pulse,
 * ring, wave), sizes, colors, speed control, text label support,
 * and CSS animation-based rendering.
 */

// --- Types ---

export type SpinType = "circle" | "dots" | "bars" | "pulse" | "ring" | "wave" | "cube" | "orbit";
export type SpinSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Spinner type */
  type?: SpinType;
  /** Size variant */
  size?: SpinSize;
  /** Color (CSS value) */
  color?: string;
  /** Stroke width for circle/ring types */
  strokeWidth?: number;
  /** Animation speed multiplier (1 = normal) */
  speed?: number;
  /** Show centered? */
  center?: boolean;
  /** Tip/label text below spinner */
  tip?: string;
  /** Custom tip font size */
  tipSize?: number;
  /** Custom CSS class */
  className?: string;
}

export interface SpinInstance {
  element: HTMLDivElement;
  /** Show the spinner */
  show: () => void;
  /** Hide the spinner */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Change tip text */
  setTip: (text: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<SpinSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

// Ensure spin keyframes are injected once
let stylesInjected = false;

function injectSpinStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "spin-styles";
  style.textContent = `
    @keyframes spin-circle-rotate{to{transform:rotate(360deg)}}
    @keyframes spin-circle-dash{0%{stroke-dasharray:1,200;stroke-dashoffset:0}50%{stroke-dasharray:90,150;stroke-dashoffset:-40px}100%{stroke-dashoffset:-124px}}
    @keyframes spin-dot-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
    @keyframes spin-bars-scale{0%,40%,100%{transform:scaleY(0.4)}20%{transform:scaleY(1)}}
    @keyframes spin-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
    @keyframes spin-ring-scale{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    @keyframes spin-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes spin-cube{0%{transform:scale(1) rotate(0deg)}50%{transform:scale(0.5) rotate(180deg)}100%{transform:scale(1) rotate(360deg)}}
    @keyframes spin-orbit{0%{transform:rotate(0deg);transform-origin:center;}100%{transform:rotate(360deg);transform-origin:center;}}
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Main Class ---

export class SpinManager {
  create(options: SpinOptions): SpinInstance {
    const opts = {
      type: options.type ?? "circle",
      size: options.size ?? "md",
      color: options.color ?? "#4338ca",
      strokeWidth: options.strokeWidth ?? 3,
      speed: options.speed ?? 1,
      center: options.center ?? true,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Spin: container not found");

    injectSpinStyles();

    let destroyed = false;
    let visible = true;
    const sz = SIZE_MAP[opts.size];

    // Root wrapper
    const root = document.createElement("div");
    root.className = `spin spin-${opts.type} spin-${opts.size} ${opts.className}`;
    root.style.cssText = opts.center
      ? `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;`
      : `display:inline-flex;align-items:center;gap:6px;`;

    // Spinner element
    const spinnerEl = this.buildSpinner(opts, sz);

    // Tip
    let tipEl: HTMLSpanElement | null = null;
    if (opts.tip) {
      tipEl = document.createElement("span");
      tipEl.className = "spin-tip";
      tipEl.textContent = opts.tip;
      tipEl.style.cssText = `
        font-size:${opts.tipSize ?? 13}px;color:#6b7280;font-weight:400;
        white-space:nowrap;line-height:1;
      `;
      root.appendChild(tipEl);
    }

    // Insert spinner before tip
    root.insertBefore(spinnerEl, tipEl);
    container.appendChild(root);

    const instance: SpinInstance = {
      element: root,

      show(): void {
        if (destroyed || visible) return;
        visible = true;
        root.style.display = "";
      },

      hide(): void {
        if (destroyed || !visible) return;
        visible = false;
        root.style.display = "none";
      },

      toggle(): void { visible ? instance.hide() : instance.show(); },

      setLoading(loading: boolean): void {
        if (loading) instance.show(); else instance.hide();
      },

      setTip(text: string): void {
        if (tipEl) tipEl.textContent = text;
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        root.remove();
      },
    };

    return instance;
  }

  private buildSpinner(opts: Required<Pick<SpinOptions, "type" | "color" | "strokeWidth" | "speed">> & { size: number }, sz: number): HTMLElement {
    const duration = `${Math.round(800 / opts.speed)}ms`;

    switch (opts.type) {
      case "circle": return this.buildCircle(sz, opts.color, opts.strokeWidth, duration);
      case "dots": return this.buildDots(sz, opts.color, duration);
      case "bars": return this.buildBars(sz, opts.color, duration);
      case "pulse": return this.buildPulse(sz, opts.color, duration);
      case "ring": return this.buildRing(sz, opts.color, opts.strokeWidth, duration);
      case "wave": return this.buildWave(sz, opts.color, duration);
      case "cube": return this.buildCube(sz, opts.color, duration);
      case "orbit": return this.buildOrbit(sz, opts.color, duration);
      default: return this.buildCircle(sz, opts.color, opts.strokeWidth, duration);
    }
  }

  private buildCircle(size: number, color: string, strokeW: number, dur: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `width:${size}px;height:${size}px;position:relative;`;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 50 50");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.style.animation = `spin-circle-rotate ${dur} linear infinite`;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "25");
    circle.setAttribute("cy", "25");
    circle.setAttribute("r", "20");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", color);
    circle.setAttribute("stroke-width", String(strokeW));
    circle.setAttribute("stroke-linecap", "round");
    circle.setAttribute("stroke-dasharray", "80, 200");
    circle.setAttribute("stroke-dashoffset", "0");
    circle.style.animation = `spin-circle-dash ${dur} ease-in-out infinite`;

    svg.appendChild(circle);
    el.appendChild(svg);
    return el;
  }

  private buildDots(size: number, color: string, dur: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `display:flex;gap:4px;width:${size}px;height:${size}px;align-items:center;justify-content:center;`;
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.style.cssText = `
        width:${size / 4}px;height:${size / 4}px;border-radius:50%;
        background:${color};animation:spin-dot-bounce ${dur} ease-in-out infinite;
        animation-delay:${i * 0.16}s;
      `;
      el.appendChild(dot);
    }
    return el;
  }

  private buildBars(size: number, color: string, dur: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `display:flex;gap:3px;width:${size}px;height:${size}px;align-items:center;justify-content:center;`;
    for (let i = 0; i < 4; i++) {
      const bar = document.createElement("span");
      bar.style.cssText = `
        width:${size / 7}px;height:${size}px;border-radius:2px;
        background:${color};animation:spin-bars-scale ${dur} ease-in-out infinite;
        animation-delay:${i * 0.12}s;
      `;
      el.appendChild(bar);
    }
    return el;
  }

  private buildPulse(size: number, color: string, dur: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};animation:spin-pulse ${dur} ease-in-out infinite;
    `;
    return el;
  }

  private buildRing(size: number, color: string, strokeW: number, dur: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `width:${size}px;height:${size}px;position:relative;`;

    // Outer rotating ring
    const outer = document.createElement("div");
    outer.style.cssText = `
      position:absolute;inset:0;border-radius:50%;
      border:${strokeW}px solid transparent;
      border-top-color:${color};border-right-color:${color};
      animation:spin-ring-scale ${dur} linear infinite;
    `;
    el.appendChild(outer);

    // Inner rotating ring (opposite direction)
    const inner = document.createElement("div");
    inner.style.cssText = `
      position:absolute;inset:${size * 0.2}px;border-radius:50%;
      border:${strokeW}px solid transparent;
      border-bottom-color:${color};border-left-color:${color};
      animation:spin-ring-scale ${dur} linear infinite reverse;
    `;
    el.appendChild(inner);

    return el;
  }

  private buildWave(size: number, color: string, dur: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `display:flex;align-items:flex-end;justify-content:center;gap:4px;height:${size}px;width:${size * 0.8}px;`;
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.style.cssText = `
        width:${size / 5}px;border-radius:50%;background:${color};
        height:${i === 1 ? size * 0.6 : size * 0.35}px;
        animation:spin-wave ${dur} ease-in-out infinite;
        animation-delay:${i * 0.15}s;
      `;
      el.appendChild(dot);
    }
    return el;
  }

  private buildCube(size: number, color: string, dur: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `
      width:${size}px;height:${size}px;background:${color};
      border-radius:4px;animation:spin-cube ${dur} ease-in-out infinite;
    `;
    return el;
  }

  private buildOrbit(size: number, color: string, dur: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `width:${size}px;height:${size}px;position:relative;`;

    // Center
    const center = document.createElement("div");
    center.style.cssText = `
      position:absolute;top:50%;left:50%;width:${size * 0.2}px;height:${size * 0.2}px;
      border-radius:50%;background:${color};transform:translate(-50%,-50%);
    `;
    el.appendChild(center);

    // Orbiting dot
    const orbiter = document.createElement("div");
    orbiter.style.cssText = `
      position:absolute;inset:0;animation:spin-orbit ${dur} linear infinite;
    `;
    const dot = document.createElement("div");
    dot.style.cssText = `
      position:absolute;top:0;left:50%;width:${size * 0.18}px;height:${size * 0.18}px;
      border-radius:50%;background:${color};transform:translateX(-50%);
    `;
    orbiter.appendChild(dot);
    el.appendChild(orbiter);

    return el;
  }
}

/** Convenience: create a spinner */
export function createSpin(options: SpinOptions): SpinInstance {
  return new SpinManager().create(options);
}
