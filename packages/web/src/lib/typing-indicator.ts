/**
 * Typing Indicator: "User is typing" indicator with animated dots,
 * configurable dot count, speed, delay, multiple animation styles,
 * auto-hide timer, and accessibility support.
 */

// --- Types ---

export type TypingAnimation = "bounce" | "pulse" | "fade" | "scale" | "wave" | "elastic";
export type TypingSize = "sm" | "md" | "lg";

export interface TypingIndicatorOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Animation style */
  animation?: TypingAnimation;
  /** Number of dots (default: 3) */
  dotCount?: number;
  /** Dot size variant */
  size?: TypingSize;
  /** Dot color */
  color?: string;
  /** Label text (e.g., "Someone is typing...") */
  label?: string;
  /** Show label? */
  showLabel?: boolean;
  /** Animation speed in ms (default: 400) */
  speed?: number;
  /** Auto-hide after ms (0 = never) */
  autoHideDelay?: number;
  /** Dot spacing in px */
  spacing?: number;
  /** Custom CSS class */
  className?: string;
}

export interface TypingIndicatorInstance {
  element: HTMLElement;
  start: () => void;
  stop: () => void;
  isActive: () => boolean;
  setLabel: (label: string) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<TypingSize, { dotSize: number; fontSize: number; gap: number }> = {
  sm: { dotSize: 6, fontSize: 11, gap: 4 },
  md: { dotSize: 8, fontSize: 13, gap: 5 },
  lg: { dotSize: 10, fontSize: 15, gap: 7 },
};

// --- Keyframe Definitions ---

const KEYFRAMES: Record<TypingAnimation, string> = {
  bounce: `
    @keyframes ti-bounce{0%,80%,100%{transform:translateY(0);}40%{transform:translateY(-60%);}}
    .ti-dot-bounce:nth-child(1){animation:ti-bounce ${0}s ease infinite 0s;}
    .ti-dot-bounce:nth-child(2){animation:ti-bounce ${0}s ease infinite 0.16s;}
    .ti-dot-bounce:nth-child(3){animation:ti-bounce ${0}s ease infinite 0.32s;}
    .ti-dot-bounce:nth-child(4){animation:ti-bounce ${0}s ease infinite 0.48s;}
    .ti-dot-bounce:nth-child(5){animation:ti-bounce ${0}s ease infinite 0.64s;}
  `,
  pulse: `
    @keyframes ti-pulse{0%,100%{opacity:0.4;transform:scale(1);}50%{opacity:1;transform:scale(1.2);}}
    .ti-dot-pulse{animation:ti-pulse ${0}s ease-in-out infinite;}
    .ti-dot-pulse:nth-child(2){animation-delay:0.2s;}
    .ti-dot-pulse:nth-child(3){animation-delay:0.4s;}
    .ti-dot-pulse:nth-child(4){animation-delay:0.6s;}
    .ti-dot-pulse:nth-child(5){animation-delay:0.8s;}
  `,
  fade: `
    @keyframes ti-fade{0%,100%{opacity:0.2;}50%{opacity:1;}}
    .ti-dot-fade{animation:ti-fade ${0}s ease-in-out infinite;}
    .ti-dot-fade:nth-child(2){animation-delay:0.25s;}
    .ti-dot-fade:nth-child(3){animation-delay:0.5s;}
    .ti-dot-fade:nth-child(4){animation-delay:0.75s;}
    .ti-dot-fade:nth-child(5){animation-delay:1s;}
  `,
  scale: `
    @keyframes ti-scale{0%,100%{transform:scale(0.6);opacity:0.5;}50%{transform:scale(1.1);opacity:1;}}
    .ti-dot-scale{animation:ti-scale ${0}s ease-in-out infinite;}
    .ti-dot-scale:nth-child(2){animation-delay:0.18s;}
    .ti-dot-scale:nth-child(3){animation-delay:0.36s;}
    .ti-dot-scale:nth-child(4){animation-delay:0.54s;}
    .ti-dot-scale:nth-child(5){animation-delay:0.72s;}
  `,
  wave: `
    @keyframes ti-wave{0%,100%{transform:translateY(0);}25%{transform:translateY(-10px);}75%{transform:translateY(5px);}}
    .ti-dot-wave{animation:ti-wave ${0}s ease-in-out infinite;}
    .ti-dot-wave:nth-child(1){animation-delay:0s;}
    .ti-dot-wave:nth-child(2){animation-delay:0.12s;}
    .ti-dot-wave:nth-child(3){animation-delay:0.24s;}
    .ti-dot-wave:nth-child(4){animation-delay:0.36s;}
    .ti-dot-wave:nth-child(5){animation-delay:0.48s;}
  `,
  elastic: `
    @keyframes ti-elastic{0%,100%{transform:scaleY(1);}15%{transform:scaleY(1.8) scaleX(0.85);}30%{transform:scaleY(0.7) scaleX(1.1);}45%{transform:scaleY(1.3) scaleX(0.95);}60%{transform:scaleY(0.9) scaleX(1.05);}
    75%{transform:scaleY(1.1) scaleX(0.98);}90%{transform:scaleY(0.97) scaleX(1.01);}}
    .ti-dot-elastic{animation:ti-elastic ${0}s ease-in-out infinite;}
    .ti-dot-elastic:nth-child(2){animation-delay:0.14s;}
    .ti-dot-elastic:nth-child(3){animation-delay:0.28s;}
    .ti-dot-elastic:nth-child(4){animation-delay:0.42s;}
    .ti-dot-elastic:nth-child(5){animation-delay:0.56s;}
  `,
};

let styleInjected = false;

function injectStyles(speed: number): void {
  if (styleInjected) return;

  const style = document.createElement("style");
  style.id = "typing-indicator-styles";
  let css = "";
  for (const anim of Object.values(KEYFRAMES)) {
    css += anim.replace(/\${0}/g, String(speed));
  }
  style.textContent = css;
  document.head.appendChild(style);
  styleInjected = true;
}

// --- Main Factory ---

export function createTypingIndicator(options: TypingIndicatorOptions): TypingIndicatorInstance {
  const opts = {
    animation: options.animation ?? "bounce",
    dotCount: Math.min(Math.max(options.dotCount ?? 3, 1), 5),
    size: options.size ?? "md",
    color: options.color ?? "#6b7280",
    label: options.label ?? "",
    showLabel: options.showLabel ?? false,
    speed: options.speed ?? 1400,
    autoHideDelay: options.autoHideDelay ?? 0,
    spacing: options.spacing ?? -1,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TypingIndicator: container not found");

  let active = false;
  let destroyed = false;
  let autoHideTimer: ReturnType<typeof setTimeout> | null = null;

  // Inject keyframe styles
  injectStyles(opts.speed);

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `typing-indicator ti-${opts.animation} ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-flex;align-items:center;gap:${opts.spacing >= 0 ? opts.spacing : SIZE_MAP[opts.size].gap}px;
    opacity:0;transition:opacity 0.2s ease;pointer-events:none;
  `;
  wrapper.setAttribute("role", "status");
  wrapper.setAttribute("aria-live", "polite");
  wrapper.setAttribute("aria-label", opts.showLabel ? opts.label || "Typing" : "Typing");
  container.appendChild(wrapper);

  // Dots row
  const dotsRow = document.createElement("span");
  dotsRow.className = `ti-dots ti-dot-${opts.animation}`;
  dotsRow.style.cssText = `display:inline-flex;align-items:center;`;
  wrapper.appendChild(dotsRow);

  // Create dots
  const dotEls: HTMLElement[] = [];
  const sz = SIZE_MAP[opts.size];
  for (let i = 0; i < opts.dotCount; i++) {
    const dot = document.createElement("span");
    dot.className = `ti-dot ti-dot-${opts.animation}`;
    dot.style.cssText = `
      display:inline-block;width:${sz.dotSize}px;height:${sz.dotSize}px;
      border-radius:50%;background:${opts.color};
    `;
    dot.setAttribute("aria-hidden", "true");
    dotEls.push(dot);
    dotsRow.appendChild(dot);
  }

  // Label
  let labelEl: HTMLSpanElement | null = null;
  if (opts.showLabel) {
    labelEl = document.createElement("span");
    labelEl.className = "ti-label";
    labelEl.style.cssText = `font-size:${sz.fontSize}px;color:${opts.color};margin-left:4px;font-style:italic;`;
    labelEl.textContent = opts.label;
    wrapper.appendChild(labelEl);
  }

  function start(): void {
    if (destroyed || active) return;
    active = true;
    wrapper.style.opacity = "1";

    if (autoHideTimer) clearTimeout(autoHideTimer);
    if (opts.autoHideDelay > 0) {
      autoHideTimer = setTimeout(() => {
        stop();
      }, opts.autoHideDelay);
    }
  }

  function stop(): void {
    if (!active) return;
    active = false;
    wrapper.style.opacity = "0";
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }
  }

  function setLabel(text: string): void {
    opts.label = text;
    if (labelEl) {
      labelEl.textContent = text;
    }
    wrapper.setAttribute("aria-label", text || "Typing");
  }

  const instance: TypingIndicatorInstance = {
    element: wrapper,

    start,

    stop,

    isActive: () => active,

    setLabel,

    destroy() {
      destroyed = true;
      stop();
      wrapper.remove();
    },
  };

  return instance;
}
