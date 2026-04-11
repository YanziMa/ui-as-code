/**
 * Loading Dots / Spinners: Animated loading indicators with dots, bars,
 * rings, pulse, bounce, and typing animation variants. Configurable
 * colors, sizes, speeds, and accessibility.
 */

// --- Types ---

export type LoaderType =
  | "dots"
  | "bars"
  | "ring"
  | "pulse"
  | "bounce"
  | "typing"
  | "orbit"
  | "wave";

export type LoaderSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface LoadingDotsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Loader type */
  type?: LoaderType;
  /** Size variant */
  size?: LoaderSize;
  /** Primary color */
  color?: string;
  /** Secondary/track color */
  secondaryColor?: string;
  /** Animation speed multiplier (1 = normal, 0.5 = half speed, 2 = double) */
  speed?: number;
  /** Number of items (dots/bars/rings in orbit) */
  count?: number;
  /** Label text shown below loader */
  label?: string;
  /** Full-screen overlay mode */
  fullscreen?: boolean;
  /** Overlay background color (fullscreen mode) */
  overlayBackground?: string;
  /** Custom CSS class */
  className?: string;
}

export interface LoadingInstance {
  element: HTMLElement;
  /** Show the loader */
  show: () => void;
  /** Hide the loader */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update label text */
  setLabel: (text: string) => void;
  /** Change color dynamically */
  setColor: (color: string) => void;
  /** Destroy and remove from DOM */
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<LoaderSize, { dotSize: number; gap: number }> = {
  xs: { dotSize: 4, gap: 4 },
  sm: { dotSize: 6, gap: 6 },
  md: { dotSize: 8, gap: 8 },
  lg: { dotSize: 12, gap: 10 },
  xl: { dotSize: 16, gap: 14 },
};

// --- CSS Keyframe Injection ---

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.id = "loading-dots-styles";
  style.textContent = `
    @keyframes ld-bounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
      40% { transform: scale(1); opacity: 1; }
    }
    @keyframes ld-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(0.6); opacity: 0.5; }
    }
    @keyframes ld-wave {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-100%); }
    }
    @keyframes ld-bars {
      0%, 40%, 100% { transform: scaleY(0.3); }
      20% { transform: scaleY(1); }
    }
    @keyframes ld-typing {
      0% { opacity: 0.2; }
      20% { opacity: 1; }
      100% { opacity: 0.2; }
    }
    @keyframes ld-orbit {
      0% { transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg); }
    }
    @keyframes ld-ring-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes ld-ring-dash {
      0% { stroke-dashoffset: var(--circumference); }
      50% { stroke-dashoffset: calc(var(--circumference) * 0.25); }
      100% { stroke-dashoffset: var(--circumference); }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Main Class ---

export class LoadingDotsManager {
  create(options: LoadingDotsOptions): LoadingInstance {
    const opts = {
      type: options.type ?? "dots",
      size: options.size ?? "md",
      color: options.color ?? "#6366f1",
      secondaryColor: options.secondaryColor ?? "#c7d2fe",
      speed: options.speed ?? 1,
      count: options.count ?? 3,
      label: options.label ?? "",
      fullscreen: options.fullscreen ?? false,
      overlayBackground: options.overlayBackground ?? "rgba(255,255,255,0.85)",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("LoadingDots: container element not found");

    injectStyles();

    let visible = true;
    let destroyed = false;

    // Wrapper element
    const wrapper = document.createElement("div");
    wrapper.className = `loading-dots loading-${opts.type} ${opts.className ?? ""}`;
    wrapper.setAttribute("role", "status");
    wrapper.setAttribute("aria-label", opts.label || "Loading");
    wrapper.style.cssText = `
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:12px;padding:16px;width:100%;height:100%;
      ${opts.fullscreen ? `position:fixed;top:0;left:0;z-index:9999;background:${opts.overlayBackground};` : ""}
    `;

    // Create loader based on type
    const loaderEl = createLoader(opts);
    wrapper.appendChild(loaderEl);

    // Label
    if (opts.label) {
      const labelEl = document.createElement("span");
      labelEl.className = "loading-label";
      labelEl.textContent = opts.label;
      labelEl.style.cssText = `font-size:13px;color:#6b7280;font-weight:500;`;
      wrapper.appendChild(labelEl);
    }

    container.appendChild(wrapper);

    function createLoader(o: typeof opts): HTMLElement {
      const sz = SIZE_MAP[o.size];

      switch (o.type) {
        case "dots":
          return createDots(sz, o.color, o.speed, o.count);

        case "bars":
          return createBars(sz, o.color, o.speed, o.count);

        case "ring":
          return createRing(sz, o.color, o.secondaryColor, o.speed);

        case "pulse":
          return createPulse(sz, o.color, o.speed);

        case "bounce":
          return createBounce(sz, o.color, o.speed, o.count);

        case "typing":
          return createTyping(sz, o.color, o.speed, o.count);

        case "orbit":
          return createOrbit(sz, o.color, o.secondaryColor, o.speed, o.count);

        case "wave":
          return createWave(sz, o.color, o.speed, o.count);

        default:
          return createDots(sz, o.color, o.speed, o.count);
      }
    }

    function createDots(
      sz: { dotSize: number; gap: number },
      color: string,
      speed: number,
      count: number,
    ): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `display:flex;gap:${sz.gap}px;align-items:center;`;

      for (let i = 0; i < count; i++) {
        const dot = document.createElement("span");
        dot.style.cssText = `
          width:${sz.dotSize}px;height:${sz.dotSize}px;border-radius:50%;
          background:${color};display:inline-block;
          animation:ld-bounce ${1.4 / speed}s ease-in-out infinite;
          animation-delay:${i * (0.16 / speed)}s;
        `;
        el.appendChild(dot);
      }

      return el;
    }

    function createBars(
      sz: { dotSize: number; gap: number },
      color: string,
      speed: number,
      count: number,
    ): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `display:flex;gap:${Math.max(sz.gap - 2, 2)}px;align-items:flex-end;height:${sz.dotSize * 3}px;`;

      for (let i = 0; i < count; i++) {
        const bar = document.createElement("span");
        bar.style.cssText = `
          width:${Math.max(sz.dotSize - 2, 3)}px;height:100%;border-radius:2px;
          background:${color};display:inline-block;
          animation:ld-bars ${1.2 / speed}s ease-in-out infinite;
          animation-delay:${i * (0.15 / speed)}s;
          transform-origin:bottom center;
        `;
        el.appendChild(bar);
      }

      return el;
    }

    function createRing(
      sz: { dotSize: number },
      color: string,
      secondaryColor: string,
      speed: number,
    ): HTMLElement {
      const size = sz.dotSize * 3;
      const strokeWidth = Math.max(sz.dotSize / 3, 2);
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
      svg.style.width = `${size}px`;
      svg.style.height = `${size}px`;
      svg.style.display = "block";

      // Track
      const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      track.setAttribute("cx", String(size / 2));
      track.setAttribute("cy", String(size / 2));
      track.setAttribute("r", String(radius));
      track.setAttribute("fill", "none");
      track.setAttribute("stroke", secondaryColor);
      track.setAttribute("stroke-width", String(strokeWidth));

      // Arc
      const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      arc.setAttribute("cx", String(size / 2));
      arc.setAttribute("cy", String(size / 2));
      arc.setAttribute("r", String(radius));
      arc.setAttribute("fill", "none");
      arc.setAttribute("stroke", color);
      arc.setAttribute("stroke-width", String(strokeWidth));
      arc.setAttribute("stroke-linecap", "round");
      arc.setAttribute("stroke-dasharray", String(circumference));
      arc.style.setProperty("--circumference", String(circumference));
      arc.style.animation = `ld-ring-spin ${1.5 / speed}s linear infinite, ld-ring-dash ${1.5 / speed}s ease-in-out infinite`;

      svg.appendChild(track);
      svg.appendChild(arc);
      return svg as unknown as HTMLElement;
    }

    function createPulse(
      sz: { dotSize: number },
      color: string,
      speed: number,
    ): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `position:relative;width:${sz.dotSize * 2}px;height:${sz.dotSize * 2}px;`;

      // Two concentric circles
      for (let i = 0; i < 2; i++) {
        const circle = document.createElement("div");
        circle.style.cssText = `
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:${sz.dotSize * (1.5 - i * 0.4)}px;height:${sz.dotSize * (1.5 - i * 0.4)}px;
          border-radius:50%;background:${color};
          animation:ld-pulse ${1.5 / speed}s ease-in-out infinite;
          animation-delay:${i * 0.3}s;opacity:${i === 0 ? "1" : "0.5"};
        `;
        el.appendChild(circle);
      }

      return el;
    }

    function createBounce(
      sz: { dotSize: number; gap: number },
      color: string,
      speed: number,
      count: number,
    ): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `display:flex;gap:${sz.gap}px;align-items:flex-end;height:${sz.dotSize * 3}px;`;

      for (let i = 0; i < count; i++) {
        const dot = document.createElement("span");
        dot.style.cssText = `
          width:${sz.dotSize}px;height:${sz.dotSize}px;border-radius:50%;
          background:${color};display:inline-block;
          animation:ld-wave ${0.6 / speed}s ease-in-out infinite;
          animation-delay:${i * (0.1 / speed)}s;
        `;
        el.appendChild(dot);
      }

      return el;
    }

    function createTyping(
      sz: { dotSize: number; gap: number },
      color: string,
      speed: number,
      count: number,
    ): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `display:flex;gap:${sz.gap}px;align-items:center;`;

      for (let i = 0; i < count; i++) {
        const dot = document.createElement("span");
        dot.style.cssText = `
          width:${sz.dotSize}px;height:${sz.dotSize}px;border-radius:50%;
          background:${color};display:inline-block;
          animation:ld-typing ${1.4 / speed}s infinite;
          animation-delay:${i * (0.4 / speed)}s;
        `;
        el.appendChild(dot);
      }

      return el;
    }

    function createOrbit(
      sz: { dotSize: number },
      color: string,
      _secondaryColor: string,
      speed: number,
      count: number,
    ): HTMLElement {
      const orbitRadius = sz.dotSize * 2;
      const size = orbitRadius * 2 + sz.dotSize + 4;

      const el = document.createElement("div");
      el.style.cssText = `position:relative;width:${size}px;height:${size}px;`;

      // Center dot
      const center = document.createElement("div");
      center.style.cssText = `
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:${Math.max(sz.dotSize * 0.6, 4)}px;height:${Math.max(sz.dotSize * 0.6, 4)}px;border-radius:50%;
        background:${color};opacity:0.3;
      `;
      el.appendChild(center);

      // Orbiting dots
      for (let i = 0; i < count; i++) {
        const dot = document.createElement("div");
        dot.style.cssText = `
          position:absolute;top:50%;left:50%;width:${sz.dotSize}px;height:${sz.dotSize}px;
          border-radius:50%;background:${color};
          --orbit-radius:${orbitRadius}px;
          animation:ld-orbit ${(2 / speed) + (i * 0.2 / speed)}s linear infinite;
          animation-delay:${-i * ((2 / speed) / count)}s;
        `;
        el.appendChild(dot);
      }

      return el;
    }

    function createWave(
      sz: { dotSize: number; gap: number },
      color: string,
      speed: number,
      count: number,
    ): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `display:flex;gap:${sz.gap}px;align-items:center;height:${sz.dotSize * 2}px;`;

      for (let i = 0; i < count; i++) {
        const bar = document.createElement("span");
        bar.style.cssText = `
          display:inline-block;width:${sz.dotSize / 2}px;height:${sz.dotSize}px;
          border-radius:${sz.dotSize / 4}px;background:${color};
          animation:ld-wave ${0.8 / speed}s ease-in-out infinite;
          animation-delay:${i * (0.12 / speed)}s;
        `;
        el.appendChild(bar);
      }

      return el;
    }

    const instance: LoadingInstance = {
      element: wrapper,

      show() {
        if (!destroyed) {
          visible = true;
          wrapper.style.display = "";
        }
      },

      hide() {
        if (!destroyed) {
          visible = false;
          wrapper.style.display = "none";
        }
      },

      toggle() {
        if (visible) this.hide();
        else this.show();
      },

      isVisible() { return visible && !destroyed; },

      setLabel(text: string) {
        const existing = wrapper.querySelector(".loading-label");
        if (existing) {
          existing.textContent = text;
        } else if (text) {
          const labelEl = document.createElement("span");
          labelEl.className = "loading-label";
          labelEl.textContent = text;
          labelEl.style.cssText = `font-size:13px;color:#6b7280;font-weight:500;`;
          wrapper.appendChild(labelEl);
        }
      },

      setColor(color: string) {
        opts.color = color;
        // Re-render loader with new color
        const oldLoader = wrapper.children[0];
        if (oldLoader) {
          const newLoader = createLoader({ ...opts, color });
          oldLoader.replaceWith(newLoader);
        }
      },

      destroy() {
        destroyed = true;
        wrapper.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a loading indicator */
export function createLoadingDots(options: LoadingDotsOptions): LoadingInstance {
  return new LoadingDotsManager().create(options);
}
