/**
 * Loader: Loading indicator / spinner component with multiple visual
 * styles, sizes, progress integration, overlay modes, and
 * skeleton screen support.
 *
 * Provides:
 *   - Spinner variants (ring, dots, bars, pulse, orbit, roller)
 *   - Size variants (xs, sm, md, lg, xl)
 *   - Color theming
 *   - Progress percentage display
 *   - Full-screen/page/inline overlay modes
 *   - Skeleton placeholder (text, image, card patterns)
 *   - Programmatic show/hide with transitions
 */

// --- Types ---

export type LoaderVariant = "ring" | "dots" | "bars" | "pulse" | "orbit" | "roller" | "skeleton";
export type LoaderSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface LoaderOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Visual variant */
  variant?: LoaderVariant;
  /** Size */
  size?: LoaderSize;
  /** Color (CSS color value) */
  color?: string;
  /** Track/background color */
  trackColor?: string;
  /** Show progress text (0-100%) */
  progress?: number;
  /** Label text below loader */
  label?: string;
  /** Overlay mode: cover container with backdrop */
  overlay?: boolean | "full" | "page";
  /** Backdrop opacity (0-1) for overlay mode */
  backdropOpacity?: number;
  /** Center in container */
  centered?: boolean;
  /** Speed multiplier (0.5 = slow, 2 = fast) */
  speed?: number;
  /** Custom CSS class */
  className?: string;
  /** Whether visible on creation (default: true) */
  visible?: boolean;
}

export interface LoaderInstance {
  /** Root element */
  element: HTMLElement;
  /** Show the loader */
  show: () => void;
  /** Hide the loader */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Update progress (0-100) */
  setProgress: (percent: number) => void;
  /** Update label text */
  setLabel: (text: string) => void;
  /** Check visibility */
  isVisible: () => boolean;
  /** Destroy and remove */
  destroy: () => void;
}

// --- Size Map ---

const SIZE_MAP: Record<LoaderSize, number> = { xs: 16, sm: 24, md: 32, lg: 48, xl: 64 };

// --- SVG Spinners ---

const SPINNERS: Record<string, (size: number, color: string, trackColor: string) => string> = {
  ring: (size, color) => `
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" style="animation:loader-spin 0.8s linear infinite;">
      <circle cx="25" cy="25" r="20" fill="none" stroke="${trackColor}" stroke-width="4"/>
      <circle cx="25" cy="25" r="20" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="80,200" stroke-dashoffset="60" stroke-linecap="round" style="animation:loader-ring-dash 1.2s ease-in-out infinite;transform-origin:center;"/>
    </svg>`,

  dots: (size, color) => {
    const c = size / 8;
    const d = size / 2 - c;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${d}" cy="${size/2}" r="${c}" fill="${color}" style="animation:loader-bounce 1.4s ease-in-out infinite both;animation-delay:-0.32s;transform-origin:center;"/>
      <circle cx="${size/2}" cy="${size/2}" r="${c}" fill="${color}" style="animation:loader-bounce 1.4s ease-in-out infinite both;animation-delay:-0.16s;transform-origin:center;"/>
      <circle cx="${size-d}" cy="${size/2}" r="${c}" fill="${color}" style="animation:loader-bounce 1.4s ease-in-out infinite both;transform-origin:center;"/>
    </svg>`;
  },

  bars: (size, color) => {
    const w = size / 7;
    const gap = w * 0.4;
    const h = size * 0.6;
    let bars = "";
    for (let i = 0; i < 5; i++) {
      bars += `<rect x="${i*(w+gap)}" y="${(size-h)/2}" width="${w}" height="${h}" rx="${w/4}" fill="${color}" style="animation:loader-bars 1.2s ease-in-out infinite both;animation-delay:${i*0.1}s;transform-origin:center;"/>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bars}</svg>`;
  },

  pulse: (size, color) =>
    `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;animation:loader-pulse 1.5s ease-in-out infinite;"></div>`,

  orbit: (size, color, track) => {
    const r = size * 0.35;
    const cr = size * 0.08;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track}" stroke-width="2"/>
      <circle cx="${size/2+r}" cy="${size/2}" r="${cr}" fill="${color}" style="animation:loader-orbit 1.5s linear infinite;transform-origin:${size/2-r}px ${size/2}px;"/>
      <circle cx="${size/2-r}" cy="${size/2}" r="${cr}" fill="${color}" opacity="0.5" style="animation:loader-orbit 1.5s linear infinite reverse;transform-origin:${size/2+r}px ${size/2}px;"/>
    </svg>`;
  },

  roller: (size, color) => {
    const w = size * 0.15;
    const h = size * 0.45;
    const gap = size * 0.12;
    return `<svg width="${w*2+gap}" height="${size}" viewBox="0 0 ${w*2+gap} ${size}">
      <rect x="0" y="${(size-h)*0.25}" width="${w}" height="${h}" rx="${w/3}" fill="${color}" style="animation:loader-roller 1.2s ease-in-out infinite both;transform-origin:center;"/>
      <rect x="${w+gap}" y="${(size-h)*0.75}" width="${w}" height="${h}" rx="${w/3}" fill="${color}" style="animation:loader-roller 1.2s ease-in-out infinite both;animation-delay:-0.6s;transform-origin:center;"/>
    </svg>`;
  },
};

// --- Keyframe CSS ---

function injectKeyframes(): HTMLStyleElement {
  if (document.querySelector("style[data-loader-kf]")) {
    return document.querySelector("style[data-loader-kf]")!;
  }
  const style = document.createElement("style");
  style.setAttribute("data-loader-kf", "true");
  style.textContent = `
    @keyframes loader-spin{to{transform:rotate(360deg)}}
    @keyframes loader-ring-dash{0%{stroke-dashoffset:60}50%{stroke-dashoffset:20}100%{stroke-dashoffset:60}}
    @keyframes loader-bounce{0%,80%,100%{transform:scale(0.6)}40%{transform:scale(1)}}
    @keyframes loader-bars{0%,40%,100%{transform:scaleY(0.5)}20%{transform:scaleY(1)}}
    @keyframes loader-pulse{0%,100%{opacity:0.4;transform:scale(0.9)}50%{opacity:1;transform:scale(1)}}
    @keyframes loader-orbit{to{transform:rotate(360deg)}}
    @keyframes loader-roller{0%{transform:translateY(0)}50%{transform:translateY(${Math.round(typeof window!=='undefined'?innerWidth/10:30)}px)}100%{transform:translateY(0)}}
  `;
  document.head.appendChild(style);
  return style;
}

// --- Main Factory ---

export function createLoader(options: LoaderOptions): LoaderInstance {
  injectKeyframes();

  const opts = {
    variant: "ring" as LoaderVariant,
    size: "md" as LoaderSize,
    color: "#3b82f6",
    trackColor: "#e5e7eb",
    overlay: false,
    centered: true,
    speed: 1,
    visible: true,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)
    : options.container;

  if (!container) throw new Error("Loader: container not found");

  const size = SIZE_MAP[opts.size];

  // Build root wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `loader-wrapper ${opts.className ?? ""}`;

  if (opts.overlay) {
    const isFull = opts.overlay === "full" || opts.overlay === "page";
    Object.assign(wrapper.style, {
      position: isFull ? "fixed" : "absolute",
      top: "0", left: "0", right: "0", bottom: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `rgba(255,255,255,${opts.backdropOpacity ?? 0.8})`,
      zIndex: "9999",
    });
  } else if (opts.centered) {
    Object.assign(wrapper.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
    });
  }

  // Spinner element
  let spinnerEl: HTMLElement;

  if (opts.variant === "skeleton") {
    spinnerEl = buildSkeleton(size);
  } else {
    const svgHtml = SPINNERS[opts.variant]?.(size, opts.color, opts.trackColor) ?? SPINNERS.ring(size, opts.color, opts.trackColor);
    spinnerEl = document.createElement("div");
    spinnerEl.innerHTML = svgHtml;
    spinnerEl.style.cssText = `display:flex;align-items:center;justify-content:center;line-height:0;`;
  }
  wrapper.appendChild(spinnerEl);

  // Progress text
  let progressEl: HTMLElement | null = null;
  if (opts.progress !== undefined) {
    progressEl = document.createElement("span");
    progressEl.className = "loader-progress";
    progressEl.textContent = `${Math.round(opts.progress)}%`;
    progressEl.style.cssText = "font-size:12px;font-weight:500;color:#6b7280;";
    wrapper.appendChild(progressEl);
  }

  // Label
  let labelEl: HTMLElement | null = null;
  if (opts.label) {
    labelEl = document.createElement("span");
    labelEl.className = "loader-label";
    labelEl.textContent = opts.label;
    labelEl.style.cssText = "font-size:13px;color:#6b7280;margin-top:4px;";
    wrapper.appendChild(labelEl);
  }

  // Visibility
  if (!opts.visible) wrapper.style.display = "none";

  container.appendChild(wrapper);

  // --- Instance ---

  return {
    get element() { return wrapper; },

    show() { wrapper.style.display = ""; },
    hide() { wrapper.style.display = "none"; },
    toggle() { wrapper.style.display = wrapper.style.display === "none" ? "" : "none"; },

    setProgress(percent: number) {
      if (progressEl) progressEl.textContent = `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
    },

    setLabel(text: string) {
      if (labelEl) labelEl.textContent = text;
    },

    isVisible: () => wrapper.style.display !== "none",

    destroy() { wrapper.remove(); },
  };
}

// --- Skeleton Builder ---

function buildSkeleton(size: number): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `
    display:flex;flex-direction:column;gap:8px;width:${size * 3}px;padding:12px;
    animation:loader-pulse 1.5s ease-in-out infinite;border-radius:8px;background:#f3f4f6;
  `;

  // Header line
  const header = document.createElement("div");
  header.style.cssText = `height:14px;width:60%;background:#e5e7eb;border-radius:4px;`;
  el.appendChild(header);

  // Body lines
  for (let i = 0; i < 3; i++) {
    const line = document.createElement("div");
    line.style.cssText = `height:10px;width:${i === 2 ? "40%" : "100%"};background:#e5e7eb;border-radius:4px;`;
    el.appendChild(line);
  }

  return el;
}

/** Quick full-page loader */
export function showPageLoader(options?: Partial<LoaderOptions> & { message?: string }): LoaderInstance {
  const div = document.createElement("div");
  div.id = "page-loader-container";
  document.body.appendChild(div);

  return createLoader({
    ...options,
    container: div,
    overlay: "page",
    label: options?.message ?? "Loading...",
  });
}
