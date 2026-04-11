/**
 * Skeleton Placeholder: Lightweight inline skeleton placeholders for individual
 * UI elements (text lines, images, avatars, buttons, cards). Supports shimmer/pulse
 * animations, configurable dimensions, and easy integration into existing layouts.
 */

// --- Types ---

export type SkeletonShape = "line" | "rect" | "circle" | "avatar" | "image" | "button" | "chip" | "heading";
export type SkeletonAnimation = "shimmer" | "pulse" | "none";

export interface SkeletonPlaceholderOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Shape type */
  shape?: SkeletonShape;
  /** Width (px or CSS value) */
  width?: number | string;
  /** Height (px or CSS value) */
  height?: number | string;
  /** Border radius (px) */
  borderRadius?: number | string;
  /** Animation type */
  animation?: SkeletonAnimation;
  /** Animation speed multiplier (1 = normal) */
  speed?: number;
  /** Base color */
  color?: string;
  /** Highlight color (for shimmer) */
  highlightColor?: string;
  /** Number of lines (for 'line' shape with multiple lines) */
  lines?: number;
  /** Last line width ratio (0-1, for text block effect) */
  lastLineWidth?: number;
  /** Custom CSS class */
  className?: string;
}

export interface SkeletonPlaceholderInstance {
  element: HTMLElement;
  /** Show the skeleton */
  show: () => void;
  /** Hide the skeleton */
  hide: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update dimensions dynamically */
  setDimensions: (width?: number | string, height?: number | string) => void;
  /** Change animation type */
  setAnimation: (anim: SkeletonAnimation) => void;
  /** Destroy and remove */
  destroy: () => void;
}

// --- Default Dimensions per Shape ---

const SHAPE_DEFAULTS: Record<SkeletonShape, { width: string; height: string; radius: string }> = {
  line:    { width: "100%", height: "14px", radius: "4px" },
  rect:    { width: "100%", height: "120px", radius: "8px" },
  circle:  { width: "40px", height: "40px", radius: "50%" },
  avatar:  { width: "48px", height: "48px", radius: "50%" },
  image:   { width: "100%", height: "200px", radius: "8px" },
  button:  { width: "80px", height: "36px", radius: "18px" },
  chip:    { width: "72px", height: "24px", radius: "12px" },
  heading: { width: "60%", height: "20px", radius: "4px" },
};

// --- Style Injection ---

let stylesInjected = false;

function injectSkeletonStyles(): void {
  if (stylesInjected) return;
  const style = document.createElement("style");
  style.id = "skeleton-placeholder-styles";
  style.textContent = `
    @keyframes sk-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sk-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Main Factory ---

export function createSkeletonPlaceholder(options: SkeletonPlaceholderOptions): SkeletonPlaceholderInstance {
  injectSkeletonStyles();

  const opts = {
    shape: options.shape ?? "line",
    animation: options.animation ?? "shimmer",
    speed: options.speed ?? 1,
    color: options.color ?? "#f3f4f6",
    highlightColor: options.highlightColor ?? "#e5e7eb",
    lines: options.lines ?? 1,
    lastLineWidth: options.lastLineWidth ?? 0.7,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SkeletonPlaceholder: container not found");

  const defaults = SHAPE_DEFAULTS[opts.shape];
  const w = opts.width ?? defaults.width;
  const h = opts.height ?? defaults.height;
  const radius = opts.borderRadius ?? defaults.radius;

  let visible = true;
  let destroyed = false;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `skeleton-placeholder sk-${opts.shape} sk-${opts.animation} ${opts.className}`;
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("role", "presentation");

  // Build content based on shape
  if (opts.shape === "line" && opts.lines > 1) {
    // Multi-line text skeleton
    root.style.cssText = "display:flex;flex-direction:column;gap:8px;width:100%;";
    for (let i = 0; i < opts.lines; i++) {
      const isLast = i === opts.lines - 1;
      const lineW = isLast ? `${opts.lastLineWidth * 100}%` : "100%";
      const line = createShimmerElement(lineW, h, radius, opts);
      root.appendChild(line);
    }
  } else {
    // Single element
    root.appendChild(createShimmerElement(w, h, radius, opts));
  }

  container.appendChild(root);

  function createShimmerElement(
    width: number | string,
    height: number | string,
    radius: number | string,
    opts: typeof opts,
  ): HTMLElement {
    const el = document.createElement("div");
    el.className = "sk-element";

    const wVal = typeof width === "number" ? `${width}px` : width;
    const hVal = typeof height === "number" ? `${height}px` : height;
    const rVal = typeof radius === "number" ? `${radius}px` : radius;

    const baseStyle = `
      width:${wVal};height:${hVal};border-radius:${rVal};
      background:${opts.color};
    `;

    if (opts.animation === "shimmer") {
      const dur = 1.5 / opts.speed;
      el.style.cssText = `${baseStyle}
        background-image:linear-gradient(90deg, ${opts.color} 25%, ${opts.highlightColor} 50%, ${opts.color} 75%);
        background-size:200% 100%;
        animation:sk-shimmer ${dur}s ease-in-out infinite;
        overflow:hidden;
      `;
    } else if (opts.animation === "pulse") {
      const dur = 1.2 / opts.speed;
      el.style.cssText = `${baseStyle}
        animation:sk-pulse ${dur}s ease-in-out infinite;
      `;
    } else {
      el.style.cssText = baseStyle;
    }

    return el;
  }

  const instance: SkeletonPlaceholderInstance = {
    element: root,

    show() {
      if (destroyed || visible) return;
      visible = true;
      root.style.display = "";
    },

    hide() {
      if (destroyed || !visible) return;
      visible = false;
      root.style.display = "none";
    },

    isVisible: () => visible,

    setDimensions(width?: number | string, height?: number | string) {
      const elements = root.querySelectorAll(".sk-element");
      if (elements.length <= 1) {
        const el = elements[0] as HTMLElement;
        if (el && width !== undefined) el.style.width = typeof width === "number" ? `${width}px` : width;
        if (el && height !== undefined) el.style.height = typeof height === "number" ? `${height}px` : height;
      } else if (height !== undefined) {
        elements.forEach((el) => {
          (el as HTMLElement).style.height = typeof height === "number" ? `${height}px` : height;
        });
      }
    },

    setAnimation(anim: SkeletonAnimation) {
      opts.animation = anim;
      // Rebuild children with new animation
      const currentChildren = Array.from(root.children);
      root.innerHTML = "";
      if (opts.shape === "line" && opts.lines > 1) {
        for (let i = 0; i < opts.lines; i++) {
          const isLast = i === opts.lines - 1;
          const lineW = isLast ? `${opts.lastLineWidth * 100}%` : "100%";
          root.appendChild(createShimmerElement(lineW, h, radius, opts));
        }
      } else {
        root.appendChild(createShimmerElement(w, h, radius, opts));
      }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      visible = false;
      root.remove();
    },
  };

  return instance;
}

// --- Convenience Functions ---

/** Quick text line skeleton */
export function skeletonLine(container: HTMLElement | string, width?: number | string): SkeletonPlaceholderInstance {
  return createSkeletonPlaceholder({ container, shape: "line", width });
}

/** Quick avatar skeleton */
export function skeletonAvatar(container: HTMLElement | string, size?: number): SkeletonPlaceholderInstance {
  return createSkeletonPlaceholder({ container, shape: "avatar", width: size ?? 48, height: size ?? 48 });
}

/** Quick image/card skeleton */
export function skeletonImage(container: HTMLElement | string, width?: number | string, height?: number | string): SkeletonPlaceholderInstance {
  return createSkeletonPlaceholder({ container, shape: "image", width, height });
}

/** Wrap an element with a skeleton that hides when content loads */
export function wrapWithSkeleton(
  target: HTMLElement,
  options?: Omit<SkeletonPlaceholderOptions, "container">,
): { skeleton: SkeletonPlaceholderInstance; reveal: () => void } {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;";
  target.parentNode!.insertBefore(wrapper, target);
  wrapper.appendChild(target);

  const skel = createSkeletonPlaceholder({
    ...options,
    container: wrapper,
  });

  // Hide actual content initially
  target.style.visibility = "hidden";

  return {
    skeleton: skel,
    reveal() {
      skel.destroy();
      target.style.visibility = "";
      // Unwrap if wrapper only has target now
      if (wrapper.children.length === 1 && wrapper.children[0] === target) {
        wrapper.replaceWith(target);
      }
    },
  };
}
