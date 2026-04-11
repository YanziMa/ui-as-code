/**
 * Lightweight Carousel: Image/content slider with auto-play, navigation arrows,
 * dot indicators, swipe support, infinite loop mode, transition effects,
 * lazy loading, and keyboard controls.
 */

// --- Types ---

export type CarouselTransition = "slide" | "fade" | "scale";
export type CarouselAlign = "center" | "start" | "end";

export interface CarouselSlide {
  /** Unique key */
  key: string;
  /** Image URL or HTML content */
  content: string | HTMLElement;
  /** Alt text for images */
  alt?: string;
  /** Caption text */
  caption?: string;
  /** Link URL (click to navigate) */
  href?: string;
  /** Disabled? */
  disabled?: boolean;
}

export interface CarouselOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Slides */
  slides: CarouselSlide[];
  /** Initial slide index (0-based) */
  initialIndex?: number;
  /** Auto-play interval (ms, 0 = disabled) */
  autoplay?: number;
  /** Show navigation arrows? */
  showArrows?: boolean;
  /** Show dot indicators? */
  showDots?: boolean;
  /** Transition effect */
  transition?: CarouselTransition;
  /** Transition duration (ms) */
  duration?: number;
  /** Infinite loop? */
  loop?: boolean;
  /** Slide alignment when multiple visible */
  align?: CarouselAlign;
  /** Show captions? */
  showCaptions?: boolean;
  /** Pause on hover? */
  pauseOnHover?: boolean;
  /** Touch/swipe enabled? */
  swipeEnabled?: boolean;
  /** Swipe threshold (px) */
  swipeThreshold?: number;
  /** Aspect ratio (e.g., "16/9", "4/3", "1/1") */
  aspectRatio?: string;
  /** Arrow icon left (default: ◀) */
  arrowLeftIcon?: string;
  /** Arrow icon right (default: ▶) */
  arrowRightIcon?: string;
  /** Callback on slide change */
  onSlideChange?: (index: number) => void;
  /** Callback on slide click */
  onSlideClick?: (index: number, slide: CarouselSlide) => void;
  /** Custom CSS class */
  className?: string;
}

export interface CarouselInstance {
  element: HTMLElement;
  getCurrentIndex: () => number;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  getSlides: () => CarouselSlide[];
  setSlides: (slides: CarouselSlide[]) => void;
  addSlide: (slide: CarouselSlide) => void;
  removeSlide: (key: string) => void;
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;
  destroy: () => void;
}

// --- Main Factory ---

export function createCarousel(options: CarouselOptions): CarouselInstance {
  const opts = {
    initialIndex: options.initialIndex ?? 0,
    autoplay: options.autoplay ?? 0,
    showArrows: options.showArrows ?? true,
    showDots: options.showDots ?? true,
    transition: options.transition ?? "slide",
    duration: options.duration ?? 400,
    loop: options.loop ?? true,
    align: options.align ?? "center",
    showCaptions: options.showCaptions ?? true,
    pauseOnHover: options.pauseOnHover ?? true,
    swipeEnabled: options.swipeEnabled ?? true,
    swipeThreshold: options.swipeThreshold ?? 50,
    aspectRatio: options.aspectRatio ?? "16/9",
    arrowLeftIcon: options.arrowLeftIcon ?? "\u25c0",
    arrowRightIcon: options.arrowRightIcon ?? "\u25b6",
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Carousel: container not found");

  let slides = [...options.slides];
  let currentIndex = Math.min(opts.initialIndex, slides.length - 1);
  let destroyed = false;
  let isPlaying = opts.autoplay > 0;
  let autoplayTimer: ReturnType<typeof setInterval> | null = null;
  let isTransitioning = false;

  // Root
  const root = document.createElement("div");
  root.className = `carousel carousel-${opts.transition} ${opts.className}`;
  root.style.cssText = `
    position:relative;width:100%;overflow:hidden;border-radius:12px;
    font-family:-apple-system,sans-serif;background:#000;
    aspect-ratio:${opts.aspectRatio};
  `;
  container.appendChild(root);

  // Viewport
  const viewport = document.createElement("div");
  viewport.className = "carousel-viewport";
  viewport.style.cssText = `
    position:relative;width:100%;height:100%;overflow:hidden;
  `;
  root.appendChild(viewport);

  // Track
  const track = document.createElement("div");
  track.className = "carousel-track";
  track.style.cssText = `
    display:flex;height:100%;transition:transform ${opts.duration}ms ease;
    will-change:transform;
  `;
  viewport.appendChild(track);

  // Arrows
  let prevBtn: HTMLButtonElement | null = null;
  let nextBtn: HTMLButtonElement | null = null;

  if (opts.showArrows) {
    const arrowStyle = `
      position:absolute;top:50%;transform:translateY(-50%);
      z-index:10;width:40px;height:40px;border-radius:50%;
      border:none;background:rgba(0,0,0,0.5);color:#fff;
      font-size:18px;cursor:pointer;display:flex;align-items:center;
      justify-content:center;transition:background 0.2s;
      backdrop-filter:blur(4px);
    `;

    prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "carousel-prev";
    prevBtn.innerHTML = opts.arrowLeftIcon;
    prevBtn.style.cssText = `${arrowStyle}left:12px;`;
    prevBtn.addEventListener("click", () => prev());

    nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "carousel-next";
    nextBtn.innerHTML = opts.arrowRightIcon;
    nextBtn.style.cssText = `${arrowStyle}right:12px;`;
    nextBtn.addEventListener("click", () => next());

    // Hover effects
    [prevBtn, nextBtn].forEach((btn) => {
      if (!btn) return;
      btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(0,0,0,0.7)"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "rgba(0,0,0,0.5)"; });
    });

    root.appendChild(prevBtn);
    root.appendChild(nextBtn);
  }

  // Dots container
  let dotsContainer: HTMLDivElement | null = null;

  if (opts.showDots) {
    dotsContainer = document.createElement("div");
    dotsContainer.className = "carousel-dots";
    dotsContainer.style.cssText = `
      position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
      display:flex;gap:8px;z-index:10;padding:0 8px;
    `;
    root.appendChild(dotsContainer);
  }

  // Captions container
  let captionEl: HTMLDivElement | null = null;

  if (opts.showCaptions) {
    captionEl = document.createElement("div");
    captionEl.className = "carousel-caption";
    captionEl.style.cssText = `
      position:absolute;bottom:0;left:0;right:0;padding:24px 20px 14px;
      background:linear-gradient(transparent, rgba(0,0,0,0.7));
      color:#fff;font-size:13px;text-align:center;z-index:5;
      pointer-events:none;
    `;
    root.appendChild(captionEl);
  }

  function render(): void {
    track.innerHTML = "";
    if (dotsContainer) dotsContainer.innerHTML = "";

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]!;

      // Slide element
      const slideEl = document.createElement("div");
      slideEl.className = "carousel-slide";
      slideEl.dataset.key = slide.key;
      slideEl.style.cssText = `
        flex-shrink:0;width:100%;height:100%;
        display:flex;align-items:center;justify-content:center;
        position:relative;overflow:hidden;
        ${opts.transition === "fade"
          ? `position:absolute;top:0;left:0;width:100%;opacity:${i === currentIndex ? "1" : "0"};transition:opacity ${opts.duration}ms ease;`
          : ""}
        ${opts.transition === "scale"
          ? `position:absolute;top:0;left:0;width:100%;opacity:${i === currentIndex ? "1" : "0"};transform:scale(${i === currentIndex ? "1" : "0.95")};transition:all ${opts.duration}ms ease;`
          : ""}
      `;

      // Content
      if (typeof slide.content === "string") {
        // Check if it looks like an image URL
        if (/^https?:\/\/|^data:image|^\/\//.test(slide.content)) {
          const img = document.createElement("img");
          img.src = slide.content;
          img.alt = slide.alt ?? slide.caption ?? `Slide ${i + 1}`;
          img.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;`;
          img.draggable = false;
          slideEl.appendChild(img);
        } else {
          const contentDiv = document.createElement("div");
          contentDiv.innerHTML = slide.content;
          contentDiv.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;padding:40px;";
          slideEl.appendChild(contentDiv);
        }
      } else {
        slideEl.appendChild(slide.content);
      }

      // Click handler
      if (slide.href || options.onSlideClick) {
        slideEl.style.cursor = slide.href ? "pointer" : "";
        slideEl.addEventListener("click", () => {
          if (slide.disabled) return;
          options.onSlideClick?.(i, slide);
          if (slide.href) window.open(slide.href, "_blank");
        });
      }

      track.appendChild(slideEl);

      // Dot
      if (dotsContainer) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = `carousel-dot${i === currentIndex ? " active" : ""}`;
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        dot.style.cssText = `
          width:8px;height:8px;border-radius:50%;border:none;
          background:${i === currentIndex ? "#fff" : "rgba(255,255,255,0.4)"};
          cursor:pointer;padding:0;transition:all 0.25s ease;
        `;
        dot.addEventListener("click", () => goTo(i));
        dotsContainer.appendChild(dot);
      }
    }

    updatePosition();
    updateCaption();
    updateArrowVisibility();
  }

  function updatePosition(): void {
    if (opts.transition === "slide") {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
    } else {
      // For fade/scale, update opacity via individual slides
      const slideEls = track.querySelectorAll<HTMLElement>(".carousel-slide");
      slideEls.forEach((el, i) => {
        el.style.opacity = i === currentIndex ? "1" : "0";
        if (opts.transition === "scale") {
          el.style.transform = i === currentIndex ? "scale(1)" : "scale(0.95)";
        }
      });
    }

    // Update dots
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll<HTMLButtonElement>(".carousel-dot");
      dots.forEach((dot, i) => {
        dot.style.background = i === currentIndex ? "#fff" : "rgba(255,255,255,0.4)";
      });
    }
  }

  function updateCaption(): void {
    if (!captionEl) return;
    const slide = slides[currentIndex];
    if (slide?.caption) {
      captionEl.textContent = slide.caption;
      captionEl.style.display = "block";
    } else {
      captionEl.style.display = "none";
    }
  }

  function updateArrowVisibility(): void {
    if (!prevBtn || !nextBtn) return;
    if (!opts.loop) {
      prevBtn.style.opacity = currentIndex <= 0 ? "0.3" : "1";
      prevBtn.style.pointerEvents = currentIndex <= 0 ? "none" : "auto";
      nextBtn.style.opacity = currentIndex >= slides.length - 1 ? "0.3" : "1";
      nextBtn.style.pointerEvents = currentIndex >= slides.length - 1 ? "none" : "auto";
    } else {
      prevBtn.style.opacity = "1";
      prevBtn.style.pointerEvents = "auto";
      nextBtn.style.opacity = "1";
      nextBtn.style.pointerEvents = "auto";
    }
  }

  function goTo(index: number): void {
    if (isTransitioning || destroyed || slides.length === 0) return;

    let targetIndex = index;

    // Loop handling
    if (opts.loop) {
      if (targetIndex < 0) targetIndex = slides.length - 1;
      if (targetIndex >= slides.length) targetIndex = 0;
    } else {
      targetIndex = Math.max(0, Math.min(targetIndex, slides.length - 1));
    }

    if (targetIndex === currentIndex) return;

    isTransitioning = true;
    currentIndex = targetIndex;

    updatePosition();
    updateCaption();
    updateArrowVisibility();

    setTimeout(() => { isTransitioning = false; }, opts.duration);

    options.onSlideChange?.(currentIndex);

    // Reset autoplay timer
    if (isPlaying && autoplayTimer) {
      clearInterval(autoplayTimer);
      startAutoplay();
    }
  }

  function next(): void {
    goTo(currentIndex + 1);
  }

  function prev(): void {
    goTo(currentIndex - 1);
  }

  function startAutoplay(): void {
    if (autoplayTimer) clearInterval(autoplayTimer);
    if (opts.autoplay > 0) {
      autoplayTimer = setInterval(() => next(), opts.autoplay);
    }
  }

  function stopAutoplay(): void {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // --- Swipe Support ---

  let touchStartX = 0;
  let touchStartY = 0;
  let touchDeltaX = 0;
  let swiping = false;

  if (opts.swipeEnabled) {
    viewport.addEventListener("touchstart", (e: TouchEvent) => {
      touchStartX = e.touches[0]!.clientX;
      touchStartY = e.touches[0]!.clientY;
      swiping = true;
      touchDeltaX = 0;
    }, { passive: true });

    viewport.addEventListener("touchmove", (e: TouchEvent) => {
      if (!swiping) return;
      touchDeltaX = e.touches[0]!.clientX - touchStartX;
    }, { passive: true });

    viewport.addEventListener("touchend", () => {
      if (!swiping) return;
      swiping = false;
      if (Math.abs(touchDeltaX) >= opts.swipeThreshold) {
        if (touchDeltaX < 0) next();
        else prev();
      }
      touchDeltaX = 0;
    }, { passive: true });
  }

  // --- Keyboard Navigation ---

  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        prev();
        break;
      case "ArrowRight":
        e.preventDefault();
        next();
        break;
    }
  });

  // --- Pause on Hover ---

  if (opts.pauseOnHover && opts.autoplay > 0) {
    root.addEventListener("mouseenter", () => { if (isPlaying) stopAutoplay(); });
    root.addEventListener("mouseleave", () => { if (isPlaying) startAutoplay(); });
  }

  // --- Init ---

  render();

  if (isPlaying) startAutoplay();

  const instance: CarouselInstance = {
    element: root,

    getCurrentIndex() { return currentIndex; },

    goTo,

    next,

    prev,

    getSlides() { return [...slides]; },

    setSlides(newSlides: CarouselSlide[]) {
      slides = newSlides;
      currentIndex = Math.min(currentIndex, slides.length - 1);
      if (currentIndex < 0 && slides.length > 0) currentIndex = 0;
      render();
    },

    addSlide(newSlide: CarouselSlide) {
      slides.push(newSlide);
      render();
    },

    removeSlide(key: string) {
      slides = slides.filter((s) => s.key !== key);
      if (currentIndex >= slides.length && slides.length > 0) currentIndex = slides.length - 1;
      render();
    },

    play() {
      isPlaying = true;
      startAutoplay();
    },

    pause() {
      isPlaying = false;
      stopAutoplay();
    },

    isPlaying() { return isPlaying; },

    destroy() {
      destroyed = true;
      stopAutoplay();
      root.remove();
    },
  };

  return instance;
}
