/**
 * Spinner / Loading Indicator: Multiple visual variants (ring, dots,
 * bars, pulse, orbit, wave) with configurable size, color, speed,
 * accessibility (ARIA), and CSS animation injection.
 */

// --- Types ---

export type SpinnerVariant = "ring" | "dots" | "bars" | "pulse" | "orbit" | "wave" | "grid";
export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinnerOptions {
  /** Visual variant */
  variant?: SpinnerVariant;
  /** Size preset */
  size?: SpinnerSize;
  /** Custom color (default: #3b82f6) */
  color?: string;
  /** Animation speed multiplier (default: 1) */
  speed?: number;
  /** Custom label text for screen readers */
  label?: string;
  /** Center the spinner via flexbox? */
  centered?: boolean;
  /** Full-screen overlay mode */
  fullscreen?: boolean;
  /** Overlay background color (fullscreen mode) */
  overlayColor?: string;
  /** Custom CSS class */
  className?: string;
}

// --- Size Config ---

const SIZE_MAP: Record<SpinnerSize, number> = {
  xs: 16,
  sm: 20,
  md: 32,
  lg: 48,
  xl: 64,
};

// --- CSS Injection ---

let stylesInjected = false;

function injectSpinnerStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.id = "spinner-styles";
  style.textContent = `
    /* Ring spinner */
    @keyframes spin-ring { to { transform: rotate(360deg); } }
    .sp-ring { animation: spin-ring 0.8s linear infinite; }

    /* Dots spinner */
    @keyframes spin-dots-bounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    .sp-dot:nth-child(1) { animation: spin-dots-bounce 1s 0s infinite ease-in-out; }
    .sp-dot:nth-child(2) { animation: spin-dots-bounce 1s 0.15s infinite ease-in-out; }
    .sp-dot:nth-child(3) { animation: spin-dots-bounce 1s 0.3s infinite ease-in-out; }

    /* Bars spinner */
    @keyframes spin-bars-stretch {
      0%, 40%, 100% { transform: scaleY(0.4); }
      20% { transform: scaleY(1); }
    }
    .sp-bar { animation: spin-bars-stretch 0.9s infinite ease-in-out; transform-origin:center; }
    .sp-bar:nth-child(2) { animation-delay: -0.15s; }
    .sp-bar:nth-child(3) { animation-delay: -0.3s; }
    .sp-bar:nth-child(4) { animation-delay: -0.45s; }

    /* Pulse spinner */
    @keyframes spin-pulse-scale {
      0%, 100% { transform: scale(0.95); opacity: 0.7; }
      50% { transform: scale(1.05); opacity: 1; }
    }

    /* Orbit spinner */
    @keyframes spin-orbit-rotate { to { transform: rotate(360deg); } }
    @keyframes spin-orbit-wobble {
      0%, 100% { transform: translateX(-50%) translateY(0); }
      25% { transform: translateX(0) translateY(-50%); }
      50% { transform: translateX(50%) translateY(0); }
      75% { transform: translateX(0) translateY(50%); }
    }

    /* Wave spinner */
    @keyframes spin-wave-rise {
      0%, 100% { height: 30%; }
      50% { height: 100%; }
    }
    .sp-wave-bar { animation: spin-wave-rise 1s infinite ease-in-out; }
    .sp-wave-bar:nth-child(2) { animation-delay: -0.12s; }
    .sp-wave-bar:nth-child(3) { animation-delay: -0.24s; }
    .sp-wave-bar:nth-child(4) { animation-delay: -0.36s; }
    .sp-wave-bar:nth-child(5) { animation-delay: -0.48s; }

    /* Grid spinner */
    @keyframes spin-grid-pop {
      0%, 100% { transform: scale(0.5); opacity: 0.3; }
      50% { transform: scale(1); opacity: 1; }
    }
    .sp-grid-cell { animation: spin-grid-pop 1s infinite ease-in-out; }
    .sp-grid-cell:nth-child(1) { animation-delay: 0s; }
    .sp-grid-cell:nth-child(2) { animation-delay: 0.08s; }
    .sp-grid-cell:nth-child(3) { animation-delay: 0.16s; }
    .sp-grid-cell:nth-child(4) { animation-delay: 0.24s; }
    .sp-grid-cell:nth-child(5) { animation-delay: 0.32s; }
    .sp-grid-cell:nth-child(6) { animation-delay: 0.4s; }
    .sp-grid-cell:nth-child(7) { animation-delay: 0.48s; }
    .sp-grid-cell:nth-child(8) { animation-delay: 0.56s; }
    .sp-grid-cell:nth-child(9) { animation-delay: 0.64s; }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Main Factory ---

/**
 * Create a spinner/loading indicator element.
 */
export function createSpinner(options: SpinnerOptions = {}): HTMLElement {
  injectSpinnerStyles();

  const opts = {
    variant: options.variant ?? "ring",
    size: options.size ?? "md",
    color: options.color ?? "#3b82f6",
    speed: options.speed ?? 1,
    label: options.label ?? "Loading...",
    centered: options.centered ?? false,
    fullscreen: options.fullscreen ?? false,
    overlayColor: options.overlayColor ?? "rgba(255,255,255,0.85)",
    className: options.className ?? "",
  };

  const sz = SIZE_MAP[opts.size];

  // Fullscreen wrapper
  let wrapper: HTMLElement | null = null;
  if (opts.fullscreen) {
    wrapper = document.createElement("div");
    wrapper.className = "spinner-fullscreen";
    wrapper.style.cssText = `
      position:fixed;inset:0;display:flex;align-items:center;
      justify-content:center;z-index:99999;background:${opts.overlayColor};
    `;
  }

  // Container
  const container = document.createElement("div");
  container.className = `spinner spinner-${opts.variant} spinner-${opts.size} ${opts.className}`;
  container.setAttribute("role", "status");
  container.setAttribute("aria-label", opts.label);
  container.style.cssText = opts.centered || opts.fullscreen
    ? "display:flex;align-items:center;justify-content:center;"
    : "display:inline-flex;align-items:center;justify-content:center;";

  // Build variant-specific content
  switch (opts.variant) {
    case "ring":
      buildRing(container, sz, opts.color, opts.speed);
      break;
    case "dots":
      buildDots(container, sz, opts.color, opts.speed);
      break;
    case "bars":
      buildBars(container, sz, opts.color, opts.speed);
      break;
    case "pulse":
      buildPulse(container, sz, opts.color, opts.speed);
      break;
    case "orbit":
      buildOrbit(container, sz, opts.color, opts.speed);
      break;
    case "wave":
      buildWave(container, sz, opts.color, opts.speed);
      break;
    case "grid":
      buildGrid(container, sz, opts.color, opts.speed);
      break;
  }

  if (wrapper) {
    wrapper.appendChild(container);
    return wrapper;
  }
  return container;
}

// --- Variant Builders ---

function buildRing(container: HTMLElement, size: number, color: string, speed: number): void {
  const borderW = Math.max(2, Math.round(size / 10));
  const el = document.createElement("div");
  el.className = "sp-ring";
  el.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    border:${borderW}px solid ${color}25;border-top-color:${color};
    animation-duration:${0.8 / speed}s;
  `;
  container.appendChild(el);
}

function buildDots(container: HTMLElement, size: number, color: string, speed: number): void {
  const dotSz = Math.max(4, Math.round(size / 4));
  const gap = Math.round(dotSz * 0.8);

  const wrap = document.createElement("div");
  wrap.style.cssText = `display:flex;gap:${gap}px;align-items:center;`;

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "sp-dot";
    dot.style.cssText = `
      width:${dotSz}px;height:${dotSz}px;border-radius:50%;
      background:${color};animation-duration:${1 / speed}s;
    `;
    wrap.appendChild(dot);
  }
  container.appendChild(wrap);
}

function buildBars(container: HTMLElement, size: number, color: string, speed: number): void {
  const barW = Math.max(3, Math.round(size / 8));
  const barH = size;

  const wrap = document.createElement("div");
  wrap.style.cssText = `display:flex;gap:${Math.round(barW * 0.6)}px;align-items:center;height:${barH}px;`;

  for (let i = 0; i < 4; i++) {
    const bar = document.createElement("span");
    bar.className = "sp-bar";
    bar.style.cssText = `
      width:${barW}px;height:${barH}px;border-radius:${barW / 2}px;
      background:${color};animation-duration:${0.9 / speed}s;
    `;
    wrap.appendChild(bar);
  }
  container.appendChild(wrap);
}

function buildPulse(container: HTMLElement, size: number, color: string, speed: number): void {
  const el = document.createElement("div");
  el.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};animation:spin-pulse-scale ${1.2 / speed}s ease-in-out infinite;
  `;
  container.appendChild(el);
}

function buildOrbit(container: HTMLElement, size: number, color: string, speed: number): void {
  const orbitSize = size + Math.round(size * 0.4);
  const dotSz = Math.max(4, Math.round(size / 5));

  const orbit = document.createElement("div");
  orbit.className = "sp-ring"; // reuse ring rotation
  orbit.style.cssText = `
    width:${orbitSize}px;height:${orbitSize}px;border-radius:50%;
    border:2px solid ${color}25;border-top-color:${color};
    animation-duration:${1 / speed}s;
  `;

  const innerDot = document.createElement("span");
  innerDot.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    width:${dotSz}px;height:${dotSz}px;border-radius:50%;background:${color};
  `;
  orbit.style.position = "relative";
  orbit.appendChild(innerDot);
  container.appendChild(orbit);
}

function buildWave(container: HTMLElement, size: number, color: string, speed: number): void {
  const barW = Math.max(3, Math.round(size / 10));
  const barH = size;

  const wrap = document.createElement("div");
  wrap.style.cssText = `display:flex;gap:${Math.round(barW)}px;align-items:flex-end;height:${barH}px;`;

  for (let i = 0; i < 5; i++) {
    const bar = document.createElement("span");
    bar.className = "sp-wave-bar";
    bar.style.cssText = `
      width:${barW}px;border-radius:${barW / 2}px;
      background:${color};animation-duration:${1 / speed}s;
    `;
    wrap.appendChild(bar);
  }
  container.appendChild(wrap);
}

function buildGrid(container: HTMLElement, size: number, color: string, speed: number): void {
  const cellSz = Math.max(6, Math.round(size / 4));
  const gap = Math.round(cellSz * 0.3);

  const grid = document.createElement("div");
  grid.style.cssText = `
    display:grid;grid-template-columns:repeat(3,${cellSz}px);
    grid-template-rows:repeat(3,${cellSz}px);gap:${gap}px;
  `;

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("span");
    cell.className = "sp-grid-cell";
    cell.style.cssText = `
      width:${cellSz}px;height:${cellSz}px;border-radius:3px;
      background:${color};animation-duration:${1 / speed}s;
    `;
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}

// --- Quick Helpers ---

/** Create a small inline spinner */
export function miniSpinner(color?: string): HTMLElement {
  return createSpinner({ size: "xs", variant: "ring", color });
}

/** Create a full-page loading overlay */
export function fullPageSpinner(label?: string): HTMLElement {
  return createSpinner({ size: "lg", variant: "ring", fullscreen: true, label });
}
