/**
 * Back to Top: Floating button that appears after scrolling down, with smooth
 * scroll animation, custom position/sizes/icons, progress indicator, and fade transitions.
 */

// --- Types ---

export type BackTopShape = "circle" | "square";
export type BackTopPosition = "right" | "left" | "center-right" | "center-left";

export interface BackTopOptions {
  /** Container to append button to (default: document.body) */
  container?: HTMLElement | string;
  /** Scroll threshold in px before showing (default: 300) */
  threshold?: number;
  /** Target scroll container (default: window) */
  target?: HTMLElement | Window;
  /** Duration of scroll animation ms (default: 450) */
  duration?: number;
  /** Easing function name */
  easing?: "linear" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | "easeInOutCubic";
  /** Bottom offset px (default: 40) */
  bottom?: number;
  /** Right/Left offset px (default: 30) */
  right?: number;
  /** Left offset (for left-positioned) */
  left?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Shape */
  shape?: BackTopShape;
  /** Position preset */
  position?: BackTopPosition;
  /** Show scroll progress as ring */
  showProgress?: boolean;
  /** Custom icon/content */
  content?: string;
  /** Custom tooltip text */
  title?: string;
  /** Z-index */
  zIndex?: number;
  /** Custom CSS class */
  className?: string;
  /** Callback on click */
  onClick?: () => void;
  /** Callback on visibility change */
  onVisibleChange?: (visible: boolean) => void;
}

export interface BackTopInstance {
  element: HTMLButtonElement;
  scrollToTop: () => void;
  isVisible: () => boolean;
  destroy: () => void;
}

// --- Easing Functions ---

const EASING: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
};

// --- Size Config ---

const SIZES: Record<string, { size: number; fontSize: number }> = {
  sm: { size: 36, fontSize: 14 },
  md: { size: 44, fontSize: 16 },
  lg: { size: 52, fontSize: 18 },
};

// --- Main ---

export function createBackTop(options: BackTopOptions = {}): BackTopInstance {
  const opts = {
    threshold: options.threshold ?? 300,
    duration: options.duration ?? 450,
    easing: options.easing ?? "easeInOutCubic",
    bottom: options.bottom ?? 40,
    right: options.right ?? 30,
    left: options.left ?? 30,
    size: options.size ?? "md",
    shape: options.shape ?? "circle",
    position: options.position ?? "right",
    showProgress: options.showProgress ?? false,
    zIndex: options.zIndex ?? 1000,
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZES[opts.size];

  // Resolve container
  const container = opts.container
    ? (typeof opts.container === "string"
      ? document.querySelector<HTMLElement>(opts.container)!
      : opts.container)
    : document.body;

  // Create button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `back-top ${opts.className}`;
  btn.title = opts.title ?? "Back to top";
  btn.style.cssText = `
    position:fixed;${getPositionStyle()};
    width:${sz.size}px;height:${sz.size}px;
    border-radius:${opts.shape === "circle" ? "50%" : "8px"};
    border:none;background:rgba(255,255,255,0.9);backdrop-filter:blur(8px);
    box-shadow:0 4px 16px rgba(0,0,0,0.12),0 2px 6px rgba(0,0,0,0.08);
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    z-index:${opts.zIndex};opacity:0;transform:translateY(16px);
    transition:opacity 0.3s ease, transform 0.3s ease, box-shadow 0.2s;
    pointer-events:none;outline:none;
  `;

  // Content (default arrow up)
  if (opts.content) {
    btn.innerHTML = opts.content;
  } else {
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.setAttribute("viewBox", "0 0 24 24");
    arrow.setAttribute("width", String(sz.fontSize));
    arrow.setAttribute("height", String(sz.fontSize));
    arrow.style.cssText = `color:#374151;transition:transform 0.2s;`;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 4l-8 8h5v8h6v-8h5z");
    path.setAttribute("fill", "currentColor");
    arrow.appendChild(path);
    btn.appendChild(arrow);
  }

  // Progress ring (SVG circle)
  let progressCircle: SVGCircleElement | null = null;
  if (opts.showProgress) {
    const svgRing = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgRing.setAttribute("viewBox", "0 0 44 44");
    svgRing.style.cssText = "position:absolute;top:-2px;left:-2px;width:100%;height:100%;pointer-events:none;";

    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", "22");
    bgCircle.setAttribute("cy", "22");
    bgCircle.setAttribute("r", "20");
    bgCircle.setAttribute("fill", "none");
    bgCircle.setAttribute("stroke", "#e5e7eb");
    bgCircle.setAttribute("stroke-width", "3");

    progressCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    progressCircle.setAttribute("cx", "22");
    progressCircle.setAttribute("cy", "22");
    progressCircle.setAttribute("r", "20");
    progressCircle.setAttribute("fill", "none");
    progressCircle.setAttribute("stroke", "#6366f1");
    progressCircle.setAttribute("stroke-width", "3");
    progressCircle.setAttribute("stroke-linecap", "round");
    progressCircle.setAttribute("stroke-dasharray", "125.6"); // 2 * PI * 20
    progressCircle.setAttribute("stroke-dashoffset", "125.6");
    progressCircle.style.transition = "stroke-dashoffset 0.15s ease-out";
    progressCircle.style.transformOrigin = "center";
    progressCircle.style.transform = "rotate(-90deg)";

    svgRing.append(bgCircle, progressCircle);
    btn.insertBefore(svgRing, btn.firstChild);
  }

  container.appendChild(btn);

  // State
  let visible = false;
  let destroyed = false;
  let scrolling = false;

  // Resolve scroll target
  function getScrollTarget(): HTMLElement | Window {
    if (opts.target instanceof HTMLElement) return opts.target;
    return opts.target ?? window;
  }

  function getScrollTop(): number {
    const target = getScrollTarget();
    if (target === window) return window.scrollY || document.documentElement.scrollTop;
    return target.scrollTop;
  }

  function getMaxScroll(): number {
    const target = getScrollTarget();
    if (target === window) {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight,
      ) - window.innerHeight;
    }
    return target.scrollHeight - target.clientHeight;
  }

  function getPositionStyle(): string {
    switch (opts.position) {
      case "left": return `left:${opts.left}px;bottom:${opts.bottom}px;`;
      case "center-right": return `right:calc(50% - ${sz.size / 2 + 100}px);bottom:${opts.bottom}px;`;
      case "center-left": return `left:calc(50% - ${sz.size / 2 + 100}px);bottom:${opts.bottom}px;`;
      default: return `right:${opts.right}px;bottom:${opts.bottom}px;`;
    }
  }

  function updateVisibility(): void {
    const scrollTop = getScrollTop();
    const shouldBeVisible = scrollTop > opts.threshold;

    if (shouldBeVisible !== visible) {
      visible = shouldBeVisible;
      if (visible) {
        btn.style.opacity = "1";
        btn.style.transform = "translateY(0)";
        btn.style.pointerEvents = "auto";
      } else {
        btn.style.opacity = "0";
        btn.style.transform = "translateY(16px)";
        btn.style.pointerEvents = "none";
      }
      opts.onVisibleChange?.(visible);
    }

    // Update progress ring
    if (progressCircle && visible) {
      const maxScroll = getMaxScroll();
      const progress = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;
      const circumference = 125.6; // 2 * PI * 20
      progressCircle.setAttribute("stroke-dashoffset", String(circumference * (1 - progress)));
    }
  }

  function scrollToTop(): void {
    if (scrolling) return;
    scrolling = true;

    const start = getScrollTop();
    const target = getScrollTarget();
    const fn = EASING[opts.easing];

    let startTime: number | null = null;

    function animate(timestamp: number): void {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / opts.duration, 1);
      const eased = fn(progress);

      const newPos = start * (1 - eased);

      if (target === window) {
        window.scrollTo(0, newPos);
      } else {
        (target as HTMLElement).scrollTop = newPos;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        scrolling = false;
        if (target === window) {
          window.scrollTo(0, 0);
        } else {
          (target as HTMLElement).scrollTop = 0;
        }
      }
    }

    requestAnimationFrame(animate);
    opts.onClick?.();
  }

  // Event listeners
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToTop();
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15),0 3px 8px rgba(0,0,0,0.1)";
    const svg = btn.querySelector("svg:first-of-type");
    if (svg && !opts.content) (svg as HTMLElement).style.transform = "translateY(-2px)";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.boxShadow = "";
    const svg = btn.querySelector("svg:first-of-type");
    if (svg && !opts.content) (svg as HTMLElement).style.transform = "";
  });

  // Scroll listener
  const scrollTarget = getScrollTarget();
  scrollTarget.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility(); // Check initial state

  const instance: BackTopInstance = {
    element: btn,

    scrollToTop,

    isVisible() { return visible; },

    destroy() {
      destroyed = true;
      scrollTarget.removeEventListener("scroll", updateVisibility);
      btn.remove();
    },
  };

  return instance;
}
