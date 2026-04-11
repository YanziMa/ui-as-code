/**
 * Back-to-Top Utilities: Scroll-to-top button with visibility threshold,
 * progress indicator, smooth scrolling, position variants, and
 * customizable appearance.
 */

// --- Types ---

export type BackToTopPosition = "bottom-right" | "bottom-left" | "bottom-center" |
  "top-right" | "top-left";

export type BackToTopShape = "circle" | "square" | "rounded";

export interface BackToTopOptions {
  /** Scroll distance (px) before button appears. Default 300 */
  threshold?: number;
  /** Position on screen */
  position?: BackToTopPosition;
  /** Button shape */
  shape?: BackToTopShape;
  /** Size in px. Default 44 */
  size?: number;
  /** Scroll duration (ms). Default 400 */
  scrollDuration?: number;
  /** Easing function name */
  easing?: "linear" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | "easeOutCubic";
  /** Z-index */
  zIndex?: number;
  /** Background color */
  backgroundColor?: string;
  /** Text/icon color */
  color?: string;
  /** Custom icon HTML (default: up arrow) */
  icon?: string;
  /** Show scroll progress as circular/ring indicator? */
  showProgress?: boolean;
  /** Progress ring color */
  progressColor?: string;
  /** Progress track color */
  progressTrackColor?: string;
  /** Tooltip text shown on hover */
  tooltip?: string;
  /** Custom class name */
  className?: string;
  /** Container element (default: document.body) */
  container?: HTMLElement;
  /** Called when button appears */
  onShow?: () => void;
  /** Called when button hides */
  onHide?: () => void;
  /** Called after scroll completes */
  onScrollComplete?: () => void;
}

export interface BackToTopInstance {
  /** The button element */
  el: HTMLElement;
  /** Show the button manually */
  show: () => void;
  /** Hide the button manually */
  hide: () => void;
  /** Scroll to top */
  scrollToTop: () => void;
  /** Get current scroll progress (0-1) */
  getProgress: () => number;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Position Config ---

const POSITION_STYLES: Record<BackToTopPosition, string> = {
  "bottom-right": "right:24px;bottom:24px;",
  "bottom-left": "left:24px;bottom:24px;",
  "bottom-center": "left:50%;transform:translateX(-50%);bottom:24px;",
  "top-right": "right:24px;top:24px;",
  "top-left": "left:24px;top:24px;",
};

const SHAPE_STYLES: Record<BackToTopShape, string> = {
  "circle": "border-radius:50%;",
  "square": "border-radius:4px;",
  "rounded": "border-radius:12px;",
};

// --- Easing Functions ---

const EASING_FNS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t) => (--t) * t * t + 1,
};

// --- Core Factory ---

/**
 * Create a back-to-top floating button.
 *
 * @example
 * ```ts
 * const btn = createBackToTop({
 *   threshold: 300,
 *   showProgress: true,
 *   position: "bottom-right",
 * });
 * ```
 */
export function createBackToTop(options: BackToTopOptions = {}): BackToTopInstance {
  const {
    threshold = 300,
    position = "bottom-right",
    shape = "circle",
    size = 44,
    scrollDuration = 400,
    easing = "easeOutCubic",
    zIndex = 999,
    backgroundColor = "#374151",
    color = "#fff",
    icon = "&#8593;",
    showProgress = false,
    progressColor = "#3b82f6",
    progressTrackColor = "rgba(255,255,255,0.2)",
    tooltip = "Back to top",
    className,
    container = document.body,
    onShow,
    onHide,
    onScrollComplete,
  } = options;

  let _visible = false;
  let _scrolling = false;
  const cleanupFns: Array<() => void> = [];

  // Create button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `back-to-top ${shape} ${className ?? ""}`.trim();
  btn.setAttribute("aria-label", tooltip);
  btn.title = tooltip;
  btn.style.cssText =
    `position:fixed;${POSITION_STYLES[position]}z-index:${zIndex};` +
    `width:${size}px;height:${size}px;${SHAPE_STYLES[shape]}` +
    `background:${backgroundColor};color:${color};border:none;cursor:pointer;` +
    "display:flex;align-items:center;justify-content:center;" +
    "font-size:16px;opacity:0;visibility:hidden;pointer-events:none;" +
    "transition:opacity 0.25s ease, visibility 0.25s ease, transform 0.25s ease;" +
    "box-shadow:0 4px 12px rgba(0,0,0,0.15);";

  // Icon
  const iconEl = document.createElement("span");
  iconEl.className = "btt-icon";
  iconEl.innerHTML = icon;
  iconEl.style.cssText = "display:flex;align-items:center;line-height:1;pointer-events:none;";
  btn.appendChild(iconEl);

  // Progress SVG (circular)
  let progressSvg: SVGSVGElement | null = null;
  let progressCircle: SVGCircleElement | null = null;
  if (showProgress) {
    progressSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    progressSvg.setAttribute("viewBox", "0 0 44 44");
    progressSvg.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);";

    // Track circle
    const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    track.setAttribute("cx", "22");
    track.setAttribute("cy", "22");
    track.setAttribute("r", "20");
    track.setAttribute("fill", "none");
    track.setAttribute("stroke", progressTrackColor);
    track.setAttribute("stroke-width", "3");
    progressSvg.appendChild(track);

    // Progress circle
    progressCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    progressCircle.setAttribute("cx", "22");
    progressCircle.setAttribute("cy", "22");
    progressCircle.setAttribute("r", "20");
    progressCircle.setAttribute("fill", "none");
    progressCircle.setAttribute("stroke", progressColor);
    progressCircle.setAttribute("stroke-width", "3");
    progressCircle.setAttribute("stroke-linecap", "round");
    progressCircle.setAttribute("stroke-dasharray", "125.6"); // 2 * PI * 20
    progressCircle.setAttribute("stroke-dashoffset", "125.6");
    progressCircle.style.transition = "stroke-dashoffset 0.15s ease";
    progressSvg.appendChild(progressCircle);

    btn.insertBefore(progressSvg, iconEl);
  }

  container.appendChild(btn);

  // --- Scroll Handling ---

  function getScrollProgress(): number {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / docHeight));
  }

  function updateProgress(): void {
    if (!progressCircle) return;
    const progress = getScrollProgress();
    const circumference = 125.6; // 2 * PI * 20
    progressCircle.setAttribute("stroke-dashoffset", String(circumference * (1 - progress)));
  }

  function handleScroll(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const shouldShow = scrollTop > threshold;

    if (shouldShow && !_visible && !_scrolling) {
      show();
    } else if (!shouldShow && _visible && !_scrolling) {
      hide();
    }

    if (showProgress) updateProgress();
  }

  // --- Show / Hide ---

  function show(): void {
    if (_visible) return;
    _visible = true;
    btn.style.opacity = "1";
    btn.style.visibility = "visible";
    btn.style.pointerEvents = "auto";
    btn.style.transform = position.includes("bottom")
      ? "translateY(0)"
      : "translateY(0)";
    onShow?.();
  }

  function hide(): void {
    if (!_visible) return;
    _visible = false;
    btn.style.opacity = "0";
    btn.style.visibility = "hidden";
    btn.style.pointerEvents = "none";
    btn.style.transform = position.includes("bottom")
      ? "translateY(8px)"
      : "translateY(-8px)";
    onHide?.();
  }

  // --- Smooth Scroll ---

  function scrollToTop(): void {
    if (_scrolling) return;
    _scrolling = true;

    const startY = window.scrollY || document.documentElement.scrollTop;
    const distance = startY;
    const startTime = performance.now();
    const easingFn = EASING_FNS[easing] ?? EASING_FNS.easeOutCubic;

    function step(currentTime: number): void {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);
      const easedProgress = easingFn(progress);

      window.scrollTo(0, startY * (1 - easedProgress));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        _scrolling = false;
        onScrollComplete?.();
        // Re-check visibility after scroll
        handleScroll();
      }
    }

    requestAnimationFrame(step);
  }

  function getProgress(): number { return getScrollProgress(); }

  // --- Event Listeners ---

  btn.addEventListener("click", scrollToTop);

  // Hover effects
  btn.addEventListener("mouseenter", () => {
    if (!_scrolling) btn.style.transform += " scale(1.08)";
  });
  btn.addEventListener("mouseleave", () => {
    if (!_scrolling) {
      btn.style.transform = position.includes("bottom")
        ? "translateY(0)"
        : "translateY(0)";
    }
  });

  // Scroll listener
  const scrollHandler = (): void => handleScroll();
  window.addEventListener("scroll", scrollHandler, { passive: true });
  cleanupFns.push(() => window.removeEventListener("scroll", scrollHandler));

  // Initial check
  handleScroll();

  // --- Destroy ---

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
    btn.remove();
  }

  return { el: btn, show, hide, scrollToTop, getProgress, destroy };
}
