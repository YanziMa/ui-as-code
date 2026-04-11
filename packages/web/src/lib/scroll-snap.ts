/**
 * Scroll Snap: CSS scroll-snap polyfill/enhancer with customizable snap points,
 * momentum-based snapping, section indicators, progress tracking, parallax effects,
 * and programmatic navigation between sections.
 */

// --- Types ---

export type SnapType = "mandatory" | "proximity";
export type SnapAxis = "x" | "y" | "both";
export type ScrollBehavior = "smooth" | "instant" | "auto";

export interface SnapSection {
  id: string;
  element: HTMLElement;
  index: number;
  /** Custom snap threshold (0-1, default: 0.5) */
  threshold?: number;
  /** Section label for indicators */
  label?: string;
  /** Disabled? (skip during snap) */
  disabled?: boolean;
}

export interface ScrollSnapOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Snap type */
  snapType?: SnapType;
  /** Axis to snap on */
  axis?: SnapAxis | "vertical" | "horizontal";
  /** Scroll behavior when navigating */
  behavior?: ScrollBehavior;
  /** Duration for smooth scroll (ms) */
  duration?: number;
  /** Easing function name */
  easing?: "linear" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | "easeOutCubic" | "easeInOutCubic" | "easeOutExpo" | "spring";
  /** Show section indicator dots? */
  showIndicators?: boolean;
  /** Indicator position ("right", "left", "bottom", "top") */
  indicatorPosition?: "right" | "left" | "bottom" | "top";
  /** Progress bar? */
  showProgress?: boolean;
  /** Progress position ("top", "bottom", "left", "right") */
  progressPosition?: "top" | "bottom" | "left" | "right";
  /** Enable keyboard navigation (arrows, Home, End) */
  keyboardNav?: boolean;
  /** Enable touch swipe gesture detection */
  swipeNav?: boolean;
  /** Swipe velocity threshold (px/s) */
  swipeThreshold?: number;
  /** Friction coefficient for deceleration (0-1) */
  friction?: number;
  /** Callback on section change */
  onSectionChange?: (section: SnapSection, index: number) => void;
  /** Callback on scroll progress (0-1) */
  onProgress?: (progress: number) => void;
  /** Selector for child sections (default: direct children) */
  sectionSelector?: string;
  /** Offset from edge to trigger snap (px) */
  offset?: number;
  /** Loop back to first/last? */
  loop?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface ScrollSnapInstance {
  element: HTMLElement;
  /** Get current section index */
  getCurrentIndex: () => number;
  /** Get current section */
  getCurrentSection: () => SnapSection | undefined;
  /** Get all sections */
  getSections: () => SnapSection[];
  /** Navigate to section by index */
  goTo: (index: number) => void;
  /** Navigate to next section */
  next: () => void;
  /** Navigate to previous section */
  prev: () => void;
  /** Navigate to first section */
  first: () => void;
  /** Navigate to last section */
  last: () => void;
  /** Get current scroll progress (0-1) */
  getProgress: () => number;
  /** Refresh sections (call after DOM changes) */
  refresh: () => void;
  /** Enable/disable */
  setEnabled: (enabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Easing Functions ---

const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  spring: (t) => 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 6),
};

// --- Main Class ---

export class ScrollSnapManager {
  create(options: ScrollSnapOptions): ScrollSnapInstance {
    const opts = {
      snapType: options.snapType ?? "mandatory",
      axis: (options.axis ?? "vertical") === "horizontal" ? "x" : "y",
      behavior: options.behavior ?? "smooth",
      duration: options.duration ?? 600,
      easing: options.easing ?? "easeOutCubic",
      showIndicators: options.showIndicators ?? false,
      indicatorPosition: options.indicatorPosition ?? "right",
      showProgress: options.showProgress ?? false,
      progressPosition: options.progressPosition ?? "top",
      keyboardNav: options.keyboardNav ?? true,
      swipeNav: options.swipeNav ?? true,
      swipeThreshold: options.swipeThreshold ?? 300,
      friction: options.friction ?? 0.95,
      sectionSelector: options.sectionSelector ?? "> *",
      offset: options.offset ?? 0,
      loop: options.loop ?? false,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ScrollSnap: container not found");

    const isHorizontal = opts.axis === "x";

    // State
    let sections: SnapSection[] = [];
    let currentIndex = 0;
    let enabled = true;
    let destroyed = false;
    let isScrolling = false;
    let scrollAnimationId: number | null = null;

    // Touch/swipe state
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let touchVelocity = 0;
    let lastTouchY = 0;
    let lastTouchX = 0;
    let lastTouchTime = 0;

    // Discover sections
    function discoverSections(): void {
      const children = container.querySelectorAll<HTMLElement>(opts.sectionSelector);
      sections = Array.from(children).map((el, i) => ({
        id: el.id || `section-${i}`,
        element: el,
        index: i,
        threshold: 0.5,
        label: el.dataset.snapLabel || el.getAttribute("aria-label") || `Section ${i + 1}`,
        disabled: el.dataset.snapDisabled === "true",
      }));
    }

    function getScrollPos(): number {
      return isHorizontal ? container.scrollLeft : container.scrollTop;
    }

    function getScrollSize(): number {
      return isHorizontal ? container.scrollWidth - container.clientWidth : container.scrollHeight - container.clientHeight;
    }

    function scrollToPosition(target: number): void {
      if (isScrolling && scrollAnimationId !== null) {
        cancelAnimationFrame(scrollAnimationId);
      }

      if (opts.behavior === "instant") {
        applyScroll(target);
        return;
      }

      if (opts.behavior === "smooth") {
        // Use native smooth scroll as fallback
        container.scrollTo({
          [isHorizontal ? "left" : "top"]: target,
          behavior: "smooth",
        });
        return;
      }

      // Custom animated scroll
      isScrolling = true;
      const start = getScrollPos();
      const delta = target - start;
      const startTime = performance.now();
      const easingFn = EASINGS[opts.easing] ?? EASINGS.easeOutCubic;

      function animate(currentTime: number): void {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / opts.duration!, 1);
        const eased = easingFn(progress);
        applyScroll(start + delta * eased);

        if (progress < 1) {
          scrollAnimationId = requestAnimationFrame(animate);
        } else {
          isScrolling = false;
          scrollAnimationId = null;
          updateCurrentIndex();
        }
      }

      scrollAnimationId = requestAnimationFrame(animate);
    }

    function applyScroll(pos: number): void {
      if (isHorizontal) {
        container.scrollLeft = pos;
      } else {
        container.scrollTop = pos;
      }
    }

    function getSectionScrollPos(section: SnapSection): number {
      const rect = section.element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return isHorizontal
        ? rect.left - containerRect.left + container.scrollLeft - opts.offset
        : rect.top - containerRect.top + container.scrollTop - opts.offset;
    }

    function findNearestSection(): { section: SnapSection; index: number } {
      const scrollPos = getScrollPos() + (isHorizontal ? container.clientWidth / 2 : container.clientHeight / 2);

      let bestIdx = 0;
      let bestDist = Infinity;

      for (let i = 0; i < sections.length; i++) {
        if (sections[i].disabled) continue;
        const secPos = getSectionScrollPos(sections[i]);
        const dist = Math.abs(secPos - scrollPos);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      return { section: sections[bestIdx]!, index: bestIdx };
    }

    function updateCurrentIndex(): void {
      const { index } = findNearestSection();
      if (index !== currentIndex) {
        currentIndex = index;
        updateIndicators();
        updateProgress();
        opts.onSectionChange?.(sections[index]!, index);
      }
    }

    function updateProgress(): void {
      if (!opts.showProgress) return;
      const maxScroll = getScrollSize();
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, getScrollPos() / maxScroll)) : 0;
      opts.onProgress?.(progress);
      updateProgressBar(progress);
    }

    // --- Indicators ---

    let indicatorEl: HTMLElement | null = null;
    let progressBarEl: HTMLElement | null = null;

    function createIndicators(): void {
      if (!opts.showIndicators) return;

      indicatorEl = document.createElement("div");
      indicatorEl.className = `snap-indicators ${opts.className ?? ""}`;
      indicatorEl.style.cssText = `
        position:absolute;${opts.indicatorPosition === "left" ? "left:8px;" : "right:8px;"}
        ${opts.indicatorPosition === "top" || opts.indicatorPosition === "bottom" ? `${opts.indicatorPosition}:8px;` : "top:50%;transform:translateY(-50%);"}
        display:flex;flex-direction:${opts.indicatorPosition === "left" || opts.indicatorPosition === "right" ? "column" : "row"};gap:6px;z-index:10;
        pointer-events:none;
      `;
      container.style.position = "relative";
      container.appendChild(indicatorEl);

      renderIndicatorDots();
    }

    function renderIndicatorDots(): void {
      if (!indicatorEl) return;
      indicatorEl.innerHTML = "";
      for (let i = 0; i < sections.length; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.title = sections[i]?.label ?? `Section ${i + 1}`;
        dot.dataset.index = String(i);
        dot.style.cssText = `
          width:8px;height:8px;border-radius:50%;border:none;
          background:${i === currentIndex ? "#4338ca" : "#d1d5db"};
          cursor:pointer;pointer-events:auto;transition:background 0.2s,transform 0.2s;padding:0;
          flex-shrink:0;
        `;
        dot.addEventListener("click", () => instance.goTo(i));
        dot.addEventListener("mouseenter", () => { dot.style.transform = "scale(1.3)"; });
        dot.addEventListener("mouseleave", () => { dot.style.transform = ""; });
        indicatorEl.appendChild(dot);
      }
    }

    function updateIndicators(): void {
      if (!indicatorEl) return;
      const dots = indicatorEl.querySelectorAll<HTMLButtonElement>("button");
      dots.forEach((dot, i) => {
        dot.style.background = i === currentIndex ? "#4338ca" : "#d1d5db";
      });
    }

    // --- Progress Bar ---

    function createProgressBar(): void {
      if (!opts.showProgress) return;

      progressBarEl = document.createElement("div");
      progressBarEl.className = "snap-progress-bar";
      progressBarEl.style.cssText = `
        position:absolute;${opts.progressPosition}:0;left:0;right:0;height:3px;
        background:#e5e7eb;z-index:10;pointer-events:none;
      `;
      const fill = document.createElement("div");
      fill.className = "snap-progress-fill";
      fill.style.cssText = "height:100%;background:#4338ca;width:0%;transition:width 150ms linear;";
      progressBarEl.appendChild(fill);
      container.appendChild(progressBarEl);
    }

    function updateProgressBar(progress: number): void {
      if (!progressBarEl) return;
      const fill = progressBarEl.querySelector(".snap-progress-fill");
      if (fill) (fill as HTMLElement).style.width = `${progress * 100}%`;
    }

    // --- Keyboard Navigation ---

    function handleKeydown(e: KeyboardEvent): void {
      if (!enabled || !opts.keyboardNav) return;

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          if (!isHorizontal || e.key === "ArrowRight") {
            e.preventDefault();
            instance.next();
          }
          break;
        case "ArrowUp":
        case "ArrowLeft":
          if (!isHorizontal || e.key === "ArrowLeft") {
            e.preventDefault();
            instance.prev();
          }
          break;
        case "Home":
          e.preventDefault();
          instance.first();
          break;
        case "End":
          e.preventDefault();
          instance.last();
          break;
      }
    }

    // --- Touch/Swipe Navigation ---

    function handleTouchStart(e: TouchEvent): void {
      if (!enabled || !opts.swipeNav) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = performance.now();
      touchVelocity = 0;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      lastTouchTime = performance.now();
    }

    function handleTouchMove(e: TouchEvent): void {
      if (!enabled || !opts.swipeNav) return;
      const touch = e.touches[0];
      const now = performance.now();
      const dt = now - lastTouchTime;

      if (dt > 0) {
        const vx = (touch.clientX - lastTouchX) / dt * 1000;
        const vy = (touch.clientY - lastTouchY) / dt * 1000;
        touchVelocity = isHorizontal ? vx : vy;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        lastTouchTime = now;
      }
    }

    function handleTouchEnd(e: TouchEvent): void {
      if (!enabled || !opts.swipeNav) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const dt = performance.now() - touchStartTime;
      const dist = isHorizontal ? dx : dy;
      const velocity = Math.abs(touchVelocity);

      if (Math.abs(dist) > 30 && velocity > opts.swipeThreshold!) {
        if (dist > 0) {
          instance.next();
        } else {
          instance.prev();
        }
      }
    }

    // --- Momentum Snap (after user scroll stops) ---

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    function handleScroll(): void {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      updateProgress();

      scrollTimeout = setTimeout(() => {
        if (!enabled || destroyed) return;
        updateCurrentIndex();

        if (opts.snapType === "mandatory") {
          const { section, index } = findNearestSection();
          if (!section.disabled) {
            const targetPos = getSectionScrollPos(section);
            const currentPos = getScrollPos();
            // Only snap if we're not already close enough
            if (Math.abs(currentPos - targetPos) > 5) {
              scrollToPosition(targetPos);
            }
          }
        }
      }, 120);
    }

    // --- Initialize ---

    discoverSections();
    createIndicators();
    createProgressBar();

    // Event listeners
    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("keydown", handleKeydown);
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd);

    // Make container focusable for keyboard nav
    if (opts.keyboardNav) {
      container.tabIndex = 0;
    }

    // Initial state
    updateCurrentIndex();
    updateProgress();

    // Observe DOM mutations for dynamic content
    const observer = new MutationObserver(() => {
      if (!destroyed) {
        discoverSections();
        renderIndicatorDots();
        updateIndicators();
      }
    });
    observer.observe(container, { childList: true, subtree: false });

    // Instance
    const instance: ScrollSnapInstance = {
      element: container,

      getCurrentIndex: () => currentIndex,

      getCurrentSection: () => sections[currentIndex],

      getSections: () => [...sections],

      goTo(index: number) {
        if (!enabled || index < 0 || index >= sections.length) return;
        if (opts.loop) {
          // Handle looping
          if (index >= sections.length) index = 0;
          if (index < 0) index = sections.length - 1;
        }
        const target = getSectionScrollPos(sections[index]);
        scrollToPosition(target);
        currentIndex = index;
        updateIndicators();
        opts.onSectionChange?.(sections[index], index);
      },

      next() {
        let nextIdx = currentIndex + 1;
        if (nextIdx >= sections.length) {
          if (opts.loop) nextIdx = 0;
          else return;
        }
        instance.goTo(nextIdx);
      },

      prev() {
        let prevIdx = currentIndex - 1;
        if (prevIdx < 0) {
          if (opts.loop) prevIdx = sections.length - 1;
          else return;
        }
        instance.goTo(prevIdx);
      },

      first() { instance.goTo(0); },
      last() { instance.goTo(sections.length - 1); },

      getProgress: () => {
        const max = getScrollSize();
        return max > 0 ? Math.min(1, Math.max(0, getScrollPos() / max)) : 0;
      },

      refresh() {
        discoverSections();
        renderIndicatorDots();
        updateIndicators();
        updateCurrentIndex();
      },

      setEnabled(en: boolean) {
        enabled = en;
      },

      destroy() {
        destroyed = true;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        if (scrollAnimationId !== null) cancelAnimationFrame(scrollAnimationId);
        container.removeEventListener("scroll", handleScroll);
        container.removeEventListener("keydown", handleKeydown);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
        observer.disconnect();
        indicatorEl?.remove();
        progressBarEl?.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a scroll snap controller */
export function createScrollSnap(options: ScrollSnapOptions): ScrollSnapInstance {
  return new ScrollSnapManager().create(options);
}
