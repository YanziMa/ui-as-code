/**
 * Back to Top Button: Floating scroll-to-top button with visibility threshold,
 * smooth scroll, position variants, size variants, show/hide animation,
 * progress indicator, and accessibility.
 */

// --- Types ---

export type BttPosition = "bottom-right" | "bottom-left" | "bottom-center" | "top-right" | "top-left";
export type BttSize = "sm" | "md" | "lg";
export type BttShape = "circle" | "rounded" | "square";

export interface BackToTopOptions {
  /** Scroll distance (px) before button appears (default: 300) */
  threshold?: number;
  /** Position on screen */
  position?: BttPosition;
  /** Size variant */
  size?: BttSize;
  /** Shape variant */
  shape?: BttShape;
  /** Background color */
  bgColor?: string;
  /** Icon color */
  iconColor?: string;
  /** Show scroll percentage inside the button? */
  showProgress?: boolean;
  /** Scroll target element (default: window) */
  target?: HTMLElement | string;
  /** Smooth scroll duration (ms) */
  scrollDuration?: number;
  /** Z-index */
  zIndex?: number;
  /** Offset from edge (px) */
  offset?: number;
  /** Show/hide animation duration (ms) */
  animationDuration?: number;
  /** Custom tooltip text */
  tooltip?: string;
  /** Callback when shown */
  onShow?: () => void;
  /** Callback when hidden */
  onHide?: () => void;
  /** Callback after scrolling to top */
  onScrollComplete?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface BackToTopInstance {
  element: HTMLButtonElement;
  isVisible: () => void;
  scrollToTop: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<BttSize, { size: number; fontSize: number; iconSize: number }> = {
  sm: { size: 36, fontSize: 12, iconSize: 14 },
  md: { size: 44, fontSize: 13, iconSize: 16 },
  lg: { size: 52, fontSize: 15, iconSize: 18 },
};

const POSITION_STYLES: Record<BttPosition, string> = {
  "bottom-right": "position:fixed;right:20px;bottom:20px;",
  "bottom-left":  "position:fixed;left:20px;bottom:20px;",
  "bottom-center":"position:fixed;left:50%;transform:translateX(-50%);bottom:20px;",
  "top-right":    "position:fixed;right:20px;top:20px;",
  "top-left":     "position:fixed;left:20px;top:20px;",
};

// --- Main Factory ---

export function createBackToTop(options: BackToTopOptions = {}): BackToTopInstance {
  const opts = {
    threshold: options.threshold ?? 300,
    position: options.position ?? "bottom-right",
    size: options.size ?? "md",
    shape: options.shape ?? "circle",
    bgColor: options.bgColor ?? "#4338ca",
    iconColor: options.iconColor ?? "#fff",
    showProgress: options.showProgress ?? false,
    scrollDuration: options.scrollDuration ?? 400,
    zIndex: options.zIndex ?? 9998,
    offset: options.offset ?? 0,
    animationDuration: options.animationDuration ?? 200,
    tooltip: options.tooltip ?? "Back to top",
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZE_MAP[opts.size];

  // Create button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `back-to-top btt-${opts.size} btt-${opts.shape} ${opts.className}`;
  btn.setAttribute("aria-label", opts.tooltip);
  btn.title = opts.tooltip;

  const radius = opts.shape === "circle" ? "50%" : opts.shape === "rounded" ? "12px" : "4px";
  btn.style.cssText = `
    ${POSITION_STYLES[opts.position]}
    width:${sz.size}px;height:${sz.size}px;border-radius:${radius};
    background:${opts.bgColor};color:${opts.iconColor};
    border:none;cursor:pointer;display:flex;align-items:center;
    justify-content:center;z-index:${opts.zIndex};
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
    opacity:0;visibility:hidden;transform:translateY(10px);
    transition:opacity ${opts.animationDuration}ms ease,
               visibility ${opts.animationDuration}ms ease,
               transform ${opts.animationDuration}ms ease;
    ${opts.position === "bottom-center" ? "" : ""}
  `;

  // Arrow icon
  const icon = document.createElement("span");
  icon.innerHTML = `<svg width="${sz.iconSize}" height="${sz.iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
  icon.style.cssText = "display:flex;align-items:center;justify-content:center;";
  btn.appendChild(icon);

  // Progress text
  let progressEl: HTMLSpanElement | null = null;
  if (opts.showProgress) {
    progressEl = document.createElement("span");
    progressEl.className = "btt-progress";
    progressEl.style.cssText = `
      font-size:${sz.fontSize - 1}px;font-weight:700;line-height:1;
      margin-top:-1px;
    `;
    btn.style.flexDirection = "column";
    btn.insertBefore(progressEl, icon);
  }

  document.body.appendChild(btn);

  // State
  let visible = false;
  let destroyed = false;

  function getScrollY(): number {
    if (options.target) {
      const el = typeof options.target === "string"
        ? document.querySelector<HTMLElement>(options.target)
        : options.target;
      return el?.scrollTop ?? 0;
    }
    return window.scrollY || document.documentElement.scrollTop;
  }

  function checkVisibility(): void {
    if (destroyed) return;
    const shouldShow = getScrollY() > opts.threshold + opts.offset;

    if (shouldShow && !visible) {
      visible = true;
      btn.style.opacity = "1";
      btn.style.visibility = "visible";
      btn.style.transform = opts.position === "bottom-center"
        ? "translateX(-50%) translateY(0)"
        : "translateY(0)";
      opts.onShow?.();
    } else if (!shouldShow && visible) {
      visible = false;
      btn.style.opacity = "0";
      btn.style.visibility = "hidden";
      btn.style.transform = opts.position === "bottom-center"
        ? "translateX(-50%) translateY(10px)"
        : "translateY(10px)";
      opts.onHide?.();
    }

    // Update progress
    if (progressEl && visible) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = Math.min(100, Math.round((getScrollY() / Math.max(docHeight, 1)) * 100));
      progressEl.textContent = `${scrolled}`;
    }
  }

  function scrollToTop(): void {
    const startY = getScrollY();
    const startTime = performance.now();

    function step(time: number): void {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / opts.scrollDuration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentY = startY * (1 - eased);

      if (options.target) {
        const el = typeof options.target === "string"
          ? document.querySelector<HTMLElement>(options.target)
          : options.target;
        if (el) el.scrollTop = currentY;
      } else {
        window.scrollTo(0, currentY);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        opts.onScrollComplete?.();
      }
    }

    requestAnimationFrame(step);
  }

  // Event listeners
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToTop();
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = opts.position === "bottom-center"
      ? "translateX(-50%) translateY(-3px) scale(1.08)"
      : "translateY(-3px) scale(1.08)";
    btn.style.boxShadow = "0 6px 20px rgba(67,56,202,0.35)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = opts.position === "bottom-center"
      ? "translateX(-50%) translateY(0)"
      : "translateY(0)";
    btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  });

  // Scroll listener
  let ticking = false;
  function onScroll(): void {
    if (!ticking) {
      requestAnimationFrame(() => {
        checkVisibility();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  // Initial check
  checkVisibility();

  return {
    element: btn,

    isVisible() { return visible; },

    scrollToTop,

    destroy() {
      destroyed = true;
      window.removeEventListener("scroll", onScroll);
      btn.remove();
    },
  };
}
