/**
 * Carousel Utilities: Image/content carousel slider with auto-play,
 * navigation (dots/arrows), touch/swipe support, keyboard navigation,
 * infinite loop, lazy loading, and multiple transition effects.
 */

// --- Types ---

export type CarouselTransition = "slide" | "fade" | "scale" | "flip";
export type CarouselNavStyle = "dots" | "arrows" | "both" | "none";

export interface CarouselSlide {
  /** Slide content (HTMLElement or HTML string) */
  content: HTMLElement | string;
  /** Optional label for accessibility */
  label?: string;
  /** Custom data */
  data?: unknown;
}

export interface CarouselOptions {
  /** Slides to display */
  slides: CarouselSlide[];
  /** Transition effect */
  transition?: CarouselTransition;
  /** Navigation style */
  navStyle?: CarouselNavStyle;
  /** Auto-play interval in ms (0 = no auto-play) */
  autoPlayInterval?: number;
  /** Pause on hover */
  pauseOnHover?: boolean;
  /** Show navigation on hover only */
  navOnHover?: boolean;
  /** Infinite loop */
  loop?: boolean;
  /** Width in px or CSS value */
  width?: number | string;
  /** Height in px or CSS value */
  height?: number | string;
  /** Aspect ratio (e.g., "16/9", "4/3") — overrides height if set */
  aspectRatio?: string;
  /** Animation duration in ms */
  duration?: number;
  /** Easing function */
  easing?: string;
  /** Initial slide index (0-based) */
  startIndex?: number;
  /** Show prev/next buttons outside */
  externalArrows?: { prevEl: HTMLElement; nextEl: HTMLElement };
  /** Dot color when active/inactive */
  dotColor?: string;
  activeDotColor?: string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called on slide change */
  onSlideChange?: (index: number, slide: CarouselSlide) => void;
  /** Called when user interacts (pauses auto-play) */
  onInteraction?: () => void;
  /** Called when idle (auto-play resumes) */
  onIdle?: () => void;
}

export interface CarouselInstance {
  /** The root carousel element */
  el: HTMLElement;
  /** Go to specific slide */
  goTo: (index: number) => void;
  /** Go to next slide */
  next: () => void;
  /** Go to previous slide */
  prev: () => void;
  /** Start auto-play */
  play: () => void;
  /** Pause auto-play */
  pause: () => void;
  /** Get current slide index */
  getCurrentIndex: () => number;
  /** Get total slide count */
  getTotalSlides: () => number;
  /** Update slides dynamically */
  setSlides: (slides: CarouselSlide[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a carousel/slider component.
 *
 * @example
 * ```ts
 * const carousel = createCarousel({
 *   slides: [
 *     { content: "<img src='slide1.jpg' />" },
 *     { content: "<img src='slide2.jpg' />" },
 *     { content: "<img src='slide3.jpg' />" },
 *   ],
 *   autoPlayInterval: 5000,
 *   navStyle: "both",
 * });
 * ```
 */
export function createCarousel(options: CarouselOptions): CarouselInstance {
  const {
    slides,
    transition = "slide",
    navStyle = "dots",
    autoPlayInterval = 5000,
    pauseOnHover = true,
    navOnHover = false,
    loop = true,
    width = "100%",
    height = 300,
    aspectRatio,
    duration = 400,
    easing = "ease-out",
    startIndex = 0,
    externalArrows,
    dotColor = "#d1d5db",
    activeDotColor = "#3b82f6",
    className,
    container,
    onSlideChange,
    onInteraction,
    onIdle,
  } = options;

  let _slides = [...slides];
  let _current = Math.min(startIndex, _slides.length - 1);
  let _playing = autoPlayInterval > 0;
  let playTimer: ReturnType<typeof setTimeout> | null = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let isDragging = false;
  let cleanupFns: Array<() => void> = [];

  // Root viewport
  const root = document.createElement("div");
  root.className = `carousel ${transition} ${className ?? ""}`.trim();
  root.style.cssText =
    "position:relative;overflow:hidden;" +
    `width:${typeof width === "number" ? `${width}px` : width};` +
    (aspectRatio ? "" : `height:${typeof height === "number" ? `${height}px` : height};`) +
    "touch-action:pan-y;user-select:none;";

  // Slides container
  const track = document.createElement("div");
  track.className = "carousel-track";
  track.style.cssText =
    "display:flex;height:100%;transition:none;";

  _renderSlides();
  root.appendChild(track);

  // Navigation: Dots
  let dotsContainer: HTMLElement | null = null;
  if (navStyle === "dots" || navStyle === "both") {
    dotsContainer = document.createElement("div");
    dotsContainer.className = "carousel-dots";
    dotsContainer.style.cssText =
      "display:flex;justify-content:center;gap:6px;padding:8px 0;position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:2;";
    _renderDots();
    root.appendChild(dotsContainer);
  }

  // Navigation: Arrows
  if (navStyle === "arrows" || navStyle === "both" || externalArrows) {
    if (!externalArrows) {
      _createBuiltInArrows();
    }
  } else if (externalArrows) {
    externalArrows.prevEl.addEventListener("click", () => prev());
    externalArrows.nextEl.addEventListener("click", () => next());
  }

  (container ?? document.body).appendChild(root);

  // Auto-play
  if (_playing) startAutoPlay();

  // Touch/swipe
  root.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0]!.clientX;
    touchStartY = e.touches[0]!.clientY;
    isDragging = true;
    pause();
  }, { passive: true });

  root.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const dx = e.touches[0]!.clientX - touchStartX;
    const diff = Math.abs(dx);
    if (diff > 30) {
      e.preventDefault();
      pause();
    }
  }, { passive: false });

  root.addEventListener("touchend", (e) => {
    if (!isDragging) return;
    isDragging = false;
    const endX = e.changedTouches[0]!.clientX;
    const diff = endX - touchStartX;
    if (Math.abs(diff) > 30) {
      if (diff < 0) prev(); else next();
    }
    resumeAfterDelay();
  });

  // Pause on hover
  if (pauseOnHover) {
    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", resumeAfterDelay);
  }

  // Hide nav on hover unless always shown
  if (navOnHover && dotsContainer) {
    dotsContainer.style.opacity = "0";
    root.addEventListener("mouseenter", () => { dotsContainer.style.opacity = "1"; });
    root.addEventListener("mouseleave", () => { dotsContainer.style.opacity = "0"; });
  }

  // Keyboard
  root.setAttribute("tabIndex", "0");
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Carousel");
  root.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft": e.preventDefault(); prev(); break;
      case "ArrowRight": e.preventDefault(); next(); break;
      case "Home": e.preventDefault(); goTo(0); break;
      case "End": e.preventDefault(); goTo(_slides.length - 1); break;
      case " ": e.preventDefault(); togglePlay(); break;
    }
  });

  // --- Methods ---

  function goTo(index: number): void {
    if (_slides.length === 0) return;
    index = ((index % _slides.length) + _slides.length) % _slides.length;
    if (index === _current) return;

    const prevEl = track.children[_current] as HTMLElement;
    const nextEl = track.children[index] as HTMLElement;

    // Apply exit animation
    _animateOut(prevEl);

    _current = index;
    _animateIn(nextEl);

    _updateDots();
    onSlideChange?.(index, _slides[index]);
  }

  function next(): void {
    if (_current >= _slides.length - 1) {
      if (loop) goTo(0); else return;
    } else {
      goTo(_current + 1);
    }
  }

  function prev(): void {
    if (_current <= 0) {
      if (loop) goTo(_slides.length - 1); else return;
    } else {
      goTo(_current - 1);
    }
  }

  function play(): void { _playing = true; startAutoPlay(); }
  function pause(): void { _playing = false; stopAutoPlay(); onInteraction?.(); }
  function togglePlay(): void { _playing ? pause() : play(); }

  function getCurrentIndex(): number { return _current; }
  function getTotalSlides(): number { return _slides.length; }

  function setSlides(newSlides: CarouselSlide[]): void {
    _slides = newSlides;
    _current = Math.min(_current, _slides.length - 1);
    _renderSlides();
    if (dotsContainer) _renderDots();
  }

  function destroy(): void {
    stopAutoPlay();
    _removeListeners();
    root.remove();
  }

  // --- Internal ---

  function _renderSlides(): void {
    track.innerHTML = "";
    _slides.forEach((slide, i) => {
      const slideEl = document.createElement("div");
      slideEl.className = "carousel-slide";
      slideEl.dataset.index = String(i);
      slideEl.style.cssText =
        "flex-shrink:0;width:100%;height:100%;" +
        (i === _current ? "" : "display:none;");
      if (typeof slide.content === "string") slideEl.innerHTML = slide.content;
      else slideEl.appendChild(slide.content.cloneNode(true));
      track.appendChild(slideEl);
    });
  }

  function _renderDots(): void {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";
    _slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `carousel-dot${i === _current ? " active" : ""}`;
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      dot.setAttribute("aria-current", String(i === _current));
      dot.style.cssText =
        `width:8px;height:8px;border-radius:50%;border:none;cursor:pointer;` +
        `background:${i === _current ? activeDotColor : dotColor};` +
        "transition:background 0.2s;padding:0;";
      dot.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(dot);
    });
  }

  function _updateDots(): void {
    if (!dotsContainer) return;
    dotsContainer.querySelectorAll(".carousel-dot").forEach((dot, i) => {
      const el = dot as HTMLElement;
      el.classList.toggle("active", i === _current);
      el.setAttribute("aria-current", String(i === _current));
      el.style.background = i === _current ? activeDotColor : dotColor;
    });
  }

  function _createBuiltInArrows(): void {
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "carousel-arrow carousel-prev";
    prevBtn.innerHTML = "&#10094;";
    prevBtn.setAttribute("aria-label", "Previous slide");
    prevBtn.style.cssText =
      "position:absolute;left:8px;top:50%;transform:translateY(-50%);" +
      "width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,0.4);" +
      "color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;" +
      "cursor:pointer;z-index:3;transition:background 0.15s;";
    prevBtn.addEventListener("click", prev);
    prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "rgba(0,0,0,0.6)"; });
    prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = "rgba(0,0,0,0.4)"; });
    root.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "carousel-arrow carousel-next";
    nextBtn.innerHTML = "&#10095;";
    nextBtn.setAttribute("aria-label", "Next slide");
    nextBtn.style.cssText =
      "position:absolute;right:8px;top:50%;transform:translateY(-50%);" +
      "width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,0.4);" +
      "color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;" +
      "cursor:pointer;z-index:3;transition:background 0.15s;";
    nextBtn.addEventListener("click", next);
    nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "rgba(0,0,0,0.6)"; });
    nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = "rgba(0,0,0,0.4)"; });
    root.appendChild(nextBtn);
  }

  function _animateOut(el: HTMLElement): void {
    switch (transition) {
      case "slide":
        el.style.transition = `transform ${duration}ms ${easing}`;
        el.style.transform = "translateX(-20%)";
        break;
      case "fade":
        el.style.transition = `opacity ${duration}ms ${easing}`;
        el.style.opacity = "0";
        break;
      case "scale":
        el.style.transition = `transform ${duration}ms ${easing}`;
        el.style.transform = "scale(0.95)";
        break;
      case "flip":
        el.style.transition = `opacity ${duration}ms ${easing}`;
        el.style.opacity = "0";
        break;
    }
  }

  function _animateIn(el: HTMLElement): void {
    switch (transition) {
      case "slide":
        el.style.display = "";
        el.style.transform = "translateX(20%)";
        requestAnimationFrame(() => {
          el.style.transition = `transform ${duration}ms ${easing}`;
          el.style.transform = "translateX(0)";
        });
        break;
      case "fade":
        el.style.display = "";
        el.style.opacity = "0";
        requestAnimationFrame(() => {
          el.style.transition = `opacity ${duration}ms ${easing}`;
          el.style.opacity = "1";
        });
        break;
      case "scale":
        el.style.display = "";
        el.style.transform = "scale(0.95)";
        requestAnimationFrame(() => {
          el.style.transition = `transform ${duration}ms ${easing}`;
          el.style.transform = "scale(1)";
        });
        break;
      case "flip":
        el.style.display = "";
        el.style.opacity = "0";
        requestAnimationFrame(() => {
          el.style.transition = `opacity ${duration}ms ${easing}`;
          el.style.opacity = "1";
        });
        break;
    }
  }

  function startAutoPlay(): void {
    stopAutoPlay();
    playTimer = setInterval(() => next(), autoPlayInterval);
  }

  function stopAutoPlay(): void {
    if (playTimer !== null) { clearInterval(playTimer); playTimer = null; }
  }

  function resumeAfterDelay(): void {
    setTimeout(() => { if (_playing) startAutoPlay(); }, 2000);
    onIdle?.();
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: root, goTo, next, prev, play, pause, getCurrentIndex, getTotalSlides, setSlides, destroy };
}
