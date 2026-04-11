/**
 * Lightweight Spinner: 7 visual variants (ring/dots/bars/pulse/orbit/wave/grid),
 * 5 sizes, fullscreen overlay mode, CSS keyframe injection, speed multiplier.
 */

// --- Types ---

export type SpinnerVariant = "ring" | "dots" | "bars" | "pulse" | "orbit" | "wave" | "grid";
export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinnerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Visual variant */
  variant?: SpinnerVariant;
  /** Size */
  size?: SpinnerSize;
  /** Color (CSS value) */
  color?: string;
  /** Stroke width (for ring) */
  strokeWidth?: number;
  /** Animation speed multiplier (1 = normal, >1 faster) */
  speed?: number;
  /** Show centered in container? */
  centered?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface FullPageSpinnerOptions {
  /** Overlay color (default: rgba(255,255,255,0.85)) */
  overlayColor?: string;
  /** Spinner variant */
  variant?: SpinnerVariant;
  /** Size */
  size?: SpinnerSize;
  /** Color */
  color?: string;
  /** Label text below spinner */
  label?: string;
  /** Custom CSS class */
  className?: string;
}

// --- Config ---

const SIZE_DIMS: Record<SpinnerSize, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

const DEFAULT_COLOR = "#4f46e5";

// --- Style Injection ---

function injectSpinnerStyles(): void {
  if (document.getElementById("spinner-lite-styles")) return;
  const s = document.createElement("style");
  s.id = "spinner-lite-styles";
  s.textContent = `
    @keyframes spl-ring{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
    @keyframes spl-dots-bounce{0%,80%,100%{transform:scale(0);}40%{transform:scale(1);}}
    @keyframes spl-bars-scale{0%,40%,100%{transform:scaleY(0.4);}20%{transform:scaleY(1);}}
    @keyframes spl-pulse-scale{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(0.5);opacity:0.5;}}
    @keyframes spl-orbit{0%{transform:rotate(0deg) translateX(120%) rotate(0deg);}100%{transform:rotate(360deg) translateX(120%) rotate(-360deg);}}
    @keyframes spl-wave-delay{0%,40%,100%{transform:translateY(0);}20%{transform:translateY(-10px);}}
    @keyframes spl-grid-pop{0%,100%{opacity:0.3;transform:scale(0);}50%{opacity:1;transform:scale(1);}}
  `;
  document.head.appendChild(s);
}

// --- Main Factory ---

export function createSpinner(options: SpinnerOptions): HTMLElement {
  const opts = {
    variant: options.variant ?? "ring",
    size: options.size ?? "md",
    color: options.color ?? DEFAULT_COLOR,
    strokeWidth: options.strokeWidth ?? 3,
    speed: options.speed ?? 1,
    centered: options.centered ?? true,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Spinner: container not found");

  injectSpinnerStyles();

  const dim = SIZE_DIMS[opts.size];
  const duration = `${1 / opts.speed}s`;

  let el: HTMLElement;

  switch (opts.variant) {
    case "ring":
      el = createRingSpinner(dim, opts.color, opts.strokeWidth, duration);
      break;
    case "dots":
      el = createDotsSpinner(dim, opts.color, duration);
      break;
    case "bars":
      el = createBarsSpinner(dim, opts.color, duration);
      break;
    case "pulse":
      el = createPulseSpinner(dim, opts.color, duration);
      break;
    case "orbit":
      el = createOrbitSpinner(dim, opts.color, duration);
      break;
    case "wave":
      el = createWaveSpinner(dim, opts.color, duration);
      break;
    case "grid":
      el = createGridSpinner(dim, opts.color, duration);
      break;
    default:
      el = createRingSpinner(dim, opts.color, opts.strokeWidth, duration);
  }

  el.className = `spinner spinner-${opts.variant} ${opts.className}`;
  if (opts.centered && container !== document.body) {
    el.style.display = "flex";
    // If the container doesn't already center content, wrap it
    if (!container.style.display?.includes("flex") && !container.style.display?.includes("grid")) {
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
    }
  }

  container.appendChild(el);
  return el;
}

// --- Variant Renderers ---

function createRingSpinner(size: number, color: string, strokeW: number, dur: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `display:inline-block;width:${size}px;height:${size}px;`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 50 50");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.style.animation = `spl-ring ${dur} linear infinite`;

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "25");
  circle.setAttribute("cy", "25");
  circle.setAttribute("r", "20");
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", color);
  circle.setAttribute("stroke-width", String(strokeW));
  circle.setAttribute("stroke-linecap", "round");
  circle.setAttribute("stroke-dasharray", "80,200");
  circle.setAttribute("stroke-dashoffset", "60");

  svg.appendChild(circle);
  wrapper.appendChild(svg);
  return wrapper;
}

function createDotsSpinner(size: number, color: string, dur: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `display:inline-flex;gap:${size / 4}px;align-items:center;justify-content:center;width:${size}px;height:${size}px;`;

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.style.cssText = `
      width:${size / 3.5}px;height:${size / 3.5}px;border-radius:50%;
      background:${color};animation:spl-dots-bounce ${dur} infinite;
      animation-delay:${i * 0.16}s;
    `;
    wrapper.appendChild(dot);
  }

  return wrapper;
}

function createBarsSpinner(size: number, color: string, dur: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `display:inline-flex;gap:${size / 6}px;align-items:center;height:${size}px;`;

  for (let i = 0; i < 4; i++) {
    const bar = document.createElement("div");
    bar.style.cssText = `
      width:${size / 8}px;height:100%;border-radius:${size / 16}px;
      background:${color};animation:spl-bars-scale ${dur} infinite;
      animation-delay:${i * 0.12}s;transform-origin:center;
    `;
    wrapper.appendChild(bar);
  }

  return wrapper;
}

function createPulseSpinner(size: number, color: string, dur: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    width:${size}px;height:${size}px;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width:${size * 0.7}px;height:${size * 0.7}px;border-radius:50%;
    background:${color};animation:spl-pulse-scale ${dur} ease-in-out infinite;
  `;
  el.appendChild(dot);

  return el;
}

function createOrbitSpinner(size: number, color: string, dur: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    width:${size}px;height:${size}px;position:relative;
  `;

  const orbiter = document.createElement("div");
  orbiter.style.cssText = `
    position:absolute;width:${size * 0.25}px;height:${size * 0.25}px;
    border-radius:50%;background:${color};
    animation:spl-orbit ${dur} linear infinite;
  `;
  wrapper.appendChild(orbiter);

  // Center dot
  const center = document.createElement("div");
  center.style.cssText = `
    width:${size * 0.15}px;height:${size * 0.15}px;border-radius:50%;
    background:${color};opacity:0.3;
  `;
  wrapper.appendChild(center);

  return wrapper;
}

function createWaveSpinner(size: number, color: string, dur: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `display:flex;align-items:flex-end;gap:${size / 8}px;height:${size}px;`;

  for (let i = 0; i < 5; i++) {
    const bar = document.createElement("div");
    bar.style.cssText = `
      width:${size / 8}px;border-radius:${size / 16}px;
      background:${color};height:${size * 0.35}px;
      animation:spl-wave-delay ${dur} ease-in-out infinite;
      animation-delay:${i * 0.1}s;
    `;
    wrapper.appendChild(bar);
  }

  return wrapper;
}

function createGridSpinner(size: number, color: string, dur: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    display:inline-grid;grid-template-columns:repeat(2,${size / 4}px);
    gap:${size / 6}px;width:${size}px;height:${size}px;
  `;

  for (let i = 0; i < 4; i++) {
    const cell = document.createElement("div");
    cell.style.cssText = `
      border-radius:2px;background:${color};
      animation:spl-grid-pop ${dur} ease-in-out infinite;
      animation-delay:${i * 0.15}s;
    `;
    wrapper.appendChild(cell);
  }

  return wrapper;
}

// --- Full Page Spinner ---

export function fullPageSpinner(options: FullPageSpinnerOptions = {}): { element: HTMLElement; destroy: () => void } {
  const opts = {
    overlayColor: options.overlayColor ?? "rgba(255,255,255,0.9)",
    variant: options.variant ?? "ring",
    size: options.size ?? "lg",
    color: options.color ?? DEFAULT_COLOR,
    label: options.label ?? "",
    className: options.className ?? "",
  };

  const overlay = document.createElement("div");
  overlay.className = `fullpage-spinner-overlay ${opts.className}`;
  overlay.style.cssText = `
    position:fixed;inset:0;background:${opts.overlayColor};
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:99999;font-family:-apple-system,sans-serif;
  `;

  const innerContainer = document.createElement("div");
  innerContainer.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:16px;";
  overlay.appendChild(innerContainer);

  createSpinner({
    container: innerContainer,
    variant: opts.variant,
    size: opts.size,
    color: opts.color,
    centered: false,
  });

  if (opts.label) {
    const labelEl = document.createElement("span");
    labelEl.textContent = opts.label;
    labelEl.style.cssText = "font-size:14px;color:#6b7280;";
    innerContainer.appendChild(labelEl);
  }

  document.body.appendChild(overlay);

  return {
    element: overlay,
    destroy() { overlay.remove(); },
  };
}

/** Quick mini spinner (inline, returns HTML string for convenience) */
export function miniSpinner(color = DEFAULT_COLOR, size = 16): string {
  injectSpinnerStyles();
  return `<svg width="${size}" height="${size}" viewBox="0 0 50 50" style="animation:spl-ring 1s linear infinite"><circle cx="25" cy="25" r="20" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-dasharray="80,200" stroke-dashoffset="60"/></svg>`;
}
