/**
 * Loading States: Various loading indicator components including spinner variants,
 * dots, bars, pulse, skeleton placeholders, progress overlay, inline loading,
 * full-page loading screen, and button loading states.
 */

// --- Types ---

export type LoadingVariant = "spinner" | "dots" | "bars" | "pulse" | "skeleton" | "progress";
export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface LoadingOptions {
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Visual variant */
  variant?: LoadingVariant;
  /** Size */
  size?: LoadingSize;
  /** Color (CSS value) */
  color?: string;
  /** Text label shown next to/below loader */
  label?: string;
  /** Label position: 'right' or 'bottom' */
  labelPosition?: "right" | "bottom";
  /** Center in container? */
  centered?: boolean;
  /** Fullscreen overlay? */
  fullscreen?: boolean;
  /** Overlay background color */
  overlayColor?: string;
  /** Speed multiplier (1 = normal) */
  speed?: number;
  /** Custom CSS class */
  className?: string;
}

export interface LoadingInstance {
  element: HTMLElement;
  /** Show the loading state */
  show: () => void;
  /** Hide and remove */
  hide: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update label text */
  setLabel: (label: string) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<LoadingSize, { dimension: number; strokeWidth: number }> = {
  xs: { dimension: 16, strokeWidth: 2 },
  sm: { dimension: 20, strokeWidth: 2 },
  md: { dimension: 24, strokeWidth: 3 },
  lg: { dimension: 32, strokeWidth: 3 },
  xl: { dimension: 40, strokeWidth: 4 },
};

// --- Style Injection ---

let stylesInjected = false;

function injectLoadingStyles(): void {
  if (stylesInjected) return;
  const style = document.createElement("style");
  style.id = "loading-states-styles";
  style.textContent = `
    @keyframes ls-spin { to { transform: rotate(360deg); } }
    @keyframes ls-bounce { 0%,80%,100% { transform:scale(0.6); } 40% { transform:scale(1); } }
    @keyframes ls-stretch { 0%,40%,100% { transform:scaleY(0.4); } 20% { transform:scaleY(1); } }
    @keyframes ls-pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
    @keyframes ls-progress-stripes { 0% { background-position: 0 0; } 100% { background-position: 40px 0; } }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Builders ---

function buildSpinner(size: typeof SIZE_MAP[keyof typeof SIZE_MAP], color: string): HTMLElement {
  const el = document.createElement("div");
  const d = size.dimension;
  el.style.cssText = `
    width:${d}px;height:${d}px;border-radius:50%;
    border:${size.strokeWidth}px solid transparent;
    border-top-color:${color};
    animation:ls-spin 0.8s linear infinite;display:inline-flex;align-items:center;justify-content:center;
  `;
  return el;
}

function buildDots(size: typeof SIZE_MAP[keyof typeof SIZE_MAP], color: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `display:flex;gap:${Math.max(3, size.dimension / 5)}px;align-items:center;`;
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.style.cssText = `
      width:${size.dimension * 0.35}px;height:${size.dimension * 0.35}px;border-radius:50%;
      background:${color};animation:ls-bounce 1.2s ease-in-out infinite;
      animation-delay:${i * 0.15}s;
    `;
    el.appendChild(dot);
  }
  return el;
}

function buildBars(size: typeof SIZE_MAP[keyof typeof SIZE_MAP], color: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `display:inline-flex;gap:${Math.max(3, size.dimension / 6)}px;align-items:center;height:${size.dimension}px;`;
  for (let i = 0; i < 4; i++) {
    const bar = document.createElement("span");
    bar.style.cssText = `
      width:${size.dimension * 0.18}px;border-radius:2px;
      background:${color};animation:ls-stretch 1s ease-in-out infinite;
      animation-delay:${i * 0.12}s;
    `;
    el.appendChild(bar);
  }
  return el;
}

function buildPulse(size: typeof SIZE_MAP[keyof typeof SIZE_MAP], color: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:${size.dimension * 1.8}px;height:${size.dimension * 1.8}px;border-radius:6px;
    background:${color};animation:ls-pulse 1.2s ease-in-out infinite;opacity:0.4;
  `;
  return el;
}

function buildProgress(color: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:120px;height:4px;border-radius:2px;overflow:hidden;background:#e5e7eb;
  `;
  const inner = document.createElement("div");
  inner.style.cssText = `
    height:100%;width:30%;background:${color};
    border-radius:2px;animation:ls-progress-stripes 1s linear infinite;
  `;
  el.appendChild(inner);
  return el;
}

// --- Main Factory ---

export function createLoading(options: LoadingOptions = {}): LoadingInstance {
  injectLoadingStyles();

  const opts = {
    variant: options.variant ?? "spinner",
    size: options.size ?? "md",
    color: options.color ?? "#6366f1",
    label: options.label ?? "",
    labelPosition: options.labelPosition ?? "right",
    centered: options.centered ?? false,
    fullscreen: options.fullscreen ?? false,
    overlayColor: options.overlayColor ?? "rgba(255,255,255,0.85)",
    speed: options.speed ?? 1,
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZE_MAP[opts.size];

  // Root wrapper
  let root: HTMLElement;

  if (opts.fullscreen) {
    root = document.createElement("div");
    root.className = `loading-fullscreen ${opts.className}`;
    root.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;
      display:none;align-items:center;justify-content:center;
      flex-direction:column;gap:12px;
      background:${opts.overlayColor};backdrop-filter:blur(4px);
      font-family:-apple-system,sans-serif;color:#374151;
    `;
    document.body.appendChild(root);
  } else if (options.container) {
    const cont = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
    root = document.createElement("div");
    root.className = `loading-inline ${opts.className}`;
    if (opts.centered) {
      root.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;";
    }
    cont.appendChild(root);
  } else {
    root = document.createElement("div");
    root.className = `loading-inline ${opts.className}`;
    root.style.display = "inline-flex";
    root.style.alignItems = "center";
    root.style.gap = "8px";
  }

  // Build visual
  const visualWrap = document.createElement("div");
  visualWrap.className = "loading-visual";

  switch (opts.variant) {
    case "spinner": visualWrap.appendChild(buildSpinner(sz, opts.color)); break;
    case "dots": visualWrap.appendChild(buildDots(sz, opts.color)); break;
    case "bars": visualWrap.appendChild(buildBars(sz, opts.color)); break;
    case "pulse": visualWrap.appendChild(buildPulse(sz, opts.color)); break;
    case "progress": visualWrap.appendChild(buildProgress(opts.color)); break;
    case "skeleton": {
      const skel = document.createElement("div");
      skel.style.cssText = `
        width:${sz.dimension * 4}px;height:${sz.dimension * 0.6}px;border-radius:4px;
        background:#f3f4f6;animation:ls-pulse 1.2s ease-in-out infinite;opacity:0.4;
      `;
      visualWrap.appendChild(skel);
      break;
    }
  }
  root.appendChild(visualWrap);

  // Label
  let labelEl: HTMLElement | null = null;
  if (opts.label) {
    labelEl = document.createElement("span");
    labelEl.className = "loading-label";
    labelEl.textContent = opts.label;
    labelEl.style.cssText = `
      font-size:${sz.dimension > 28 ? 13 : 11}px;color:#6b7280;
      ${opts.variant === "fullscreen" ? "" : "margin-left:"}
      white-space:nowrap;line-height:1;
    `;
    if (opts.labelPosition === "bottom") {
      labelEl.style.marginLeft = "";
      labelEl.style.marginTop = "8px";
      root.style.flexDirection = "column";
    }
    root.appendChild(labelEl);
  }

  // Apply speed
  root.style.setProperty("--ls-speed", `${opts.speed}`);

  let visible = false;
  let destroyed = false;

  const instance: LoadingInstance = {
    element: root,

    show() {
      if (visible || destroyed) return;
      visible = true;
      root.style.display = opts.fullscreen ? "flex" : "inline-flex";
      if (!opts.fullscreen && opts.centered) root.style.display = "flex";
    },

    hide() {
      if (!visible || destroyed) return;
      visible = false;
      root.style.display = "none";
    },

    isVisible: () => visible,

    setLabel(label: string) {
      if (labelEl) labelEl.textContent = label;
    },

    destroy() {
      destroyed = true;
      visible = false;
      root.remove();
    },
  };

  return instance;
}

// --- Convenience Functions ---

/** Quick inline spinner */
export function spinner(container: HTMLElement | string, size: LoadingSize = "md", color = "#6366f1"): LoadingInstance {
  return createLoading({ container, variant: "spinner", size, color });
}

/** Quick fullscreen loading overlay */
export function fullscreenLoading(label?: string): LoadingInstance {
  return createLoading({ variant: "dots", size: "lg", label: label ?? "Loading...", fullscreen: true });
}

/** Wrap an element with a loading overlay */
export function wrapWithLoading(
  target: HTMLElement,
  options: Omit<LoadingOptions, "container"> & { variant?: LoadingVariant } = {},
): LoadingInstance {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;display:inline-block;";
  target.parentNode!.insertBefore(wrapper, target);
  wrapper.appendChild(target);

  const inst = createLoading({
    ...options,
    container: wrapper,
    variant: options.variant ?? "skeleton",
    centered: true,
  });
  inst.show();
  return inst;
}
