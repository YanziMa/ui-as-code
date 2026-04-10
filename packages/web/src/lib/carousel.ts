/**
 * Carousel/Slider: Image and content carousel with auto-play, touch swipe,
 * indicators, lazy loading, infinite loop, keyboard navigation,
 * transition animations, and responsive sizing.
 */

// --- Types ---

export interface CarouselSlide {
  /** Unique key */
  key: string;
  /** Content: image URL, HTML string, or HTMLElement */
  content: string | HTMLElement;
  /** Alt text for images */
  alt?: string;
  /** Caption text */
  caption?: string;
  /** Slide background color */
  bgColor?: string;
}

export interface CarouselOptions {
  /** Slides */
  slides: CarouselSlide[];
  /** Initial slide index (default: 0) */
  initialIndex?: number;
  /** Auto-play interval in ms (0 = disabled) */
  autoPlayInterval?: number;
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Show dot indicators */
  showIndicators?: boolean;
  /** Show captions */
  showCaptions?: boolean;
  /** Infinite loop (wrap around) */
  infinite?: boolean;
  /** Enable touch/swipe */
  enableSwipe?: boolean;
  /** Swipe threshold in px (default: 50) */
  swipeThreshold?: number;
  /** Transition animation duration (default: 400) */
  animationDuration?: number;
  /** Easing function (default: 'ease-out') */
  easing?: string;
  /** Aspect ratio (default: '16/9') */
  aspectRatio?: string;
  /** Lazy load off-screen slides */
  lazyLoad?: boolean;
  /** Pause on hover */
  pauseOnHover?: boolean;
  /** Callback on slide change */
  onSlideChange?: (index: number, slide: CarouselSlide) => void;
  /** Custom CSS class */
  className?: string;
  /** Parent element */
  parent?: HTMLElement;
  /** Width (CSS value, default: 100%) */
  width?: string | number;
  /** Height (CSS value, auto from aspect ratio) */
  height?: string | number;
}

export interface CarouselInstance {
  /** Root DOM element */
  element: HTMLDivElement;
  /** Go to specific slide */
  goTo: (index: number) => void;
  /** Next slide */
  next: () => void;
  /** Previous slide */
  prev: () => void;
  /** Get current index */
  getCurrentIndex: () => number;
  /** Start auto-play */
  play: () => void;
  /** Stop auto-play */
  stop: () => void;
  /** Add a slide dynamically */
  addSlide: (slide: CarouselSlide, index?: number) => void;
  /** Remove a slide by key */
  removeSlide: (key: string) => void;
  /** Total slides count */
  getTotalSlides: () => number;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class CarouselManager {
  create(options: CarouselOptions): CarouselInstance {
    const opts = {
      initialIndex: options.initialIndex ?? 0,
      autoPlayInterval: options.autoPlayInterval ?? 0,
      showArrows: options.showArrows ?? true,
      showIndicators: options.showIndicators ?? true,
      showCaptions: options.showCaptions ?? true,
      infinite: options.infinite ?? true,
      enableSwipe: options.enableSwipe ?? true,
      swipeThreshold: options.swipeThreshold ?? 50,
      animationDuration: options.animationDuration ?? 400,
      easing: options.easing ?? "ease-out",
      aspectRatio: options.aspectRatio ?? "16 / 9",
      lazyLoad: options.lazyLoad ?? true,
      pauseOnHover: options.pauseOnHover ?? true,
      parent: options.parent ?? document.body,
      width: options.width ?? "100%",
      ...options,
    };

    const slides = [...options.slides];
    let currentIndex = Math.min(opts.initialIndex, Math.max(0, slides.length - 1));
    let isPlaying = opts.autoPlayInterval > 0;
    let playTimer: ReturnType<typeof setInterval> | null = null;
    let isTransitioning = false;
    let destroyed = false;

    // Root container
    const root = document.createElement("div");
    root.className = `carousel ${options.className ?? ""}`;
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "carousel");
    root.setAttribute("aria-label", "Image carousel");

    const w = typeof opts.width === "number" ? `${opts.width}px` : opts.width;
    const h = typeof opts.height === "number" ? `${opts.height}px` : opts.height;

    root.style.cssText = `
      position:relative;width:${w};${h ? `height:${h};` : ""}
      overflow:hidden;border-radius:12px;background:#000;
      user-select:none;touch-action:pan-y;
    `;

    // Viewport
    const viewport = document.createElement("div");
    viewport.className = "carousel-viewport";
    viewport.style.cssText = `
      position:relative;width:100%;height:100%;
      ${h ? "" : `aspect-ratio:${opts.aspectRatio};`}
      overflow:hidden;
    `;
    root.appendChild(viewport);

    // Track
    const track = document.createElement("div");
    track.className = "carousel-track";
    track.style.cssText = `
      display:flex;height:100%;transition:transform ${opts.animationDuration}ms ${opts.easing};
      will-change:transform;
    `;
    viewport.appendChild(track);

    // Controls container
    const controls = document.createElement("div");
    controls.className = "carousel-controls";
    controls.style.cssText = "position:absolute;inset:0;pointer-events:none;";
    root.appendChild(controls);

    // Arrows container
    let arrowContainer: HTMLDivElement | null = null;
    if (opts.showArrows && slides.length > 1) {
      arrowContainer = document.createElement("div");
      arrowContainer.style.cssText = `
        position:absolute;top:50%;width:100%;display:flex;justify-content:space-between;
        padding:0 8px;pointer-events:none;transform:translateY(-50%);
      `;

      const prevBtn = this.createArrow("prev", () => instance.prev());
      const nextBtn = this.createArrow("next", () => instance.next());

      arrowContainer.append(prevBtn, nextBtn);
      controls.appendChild(arrowContainer);
    }

    // Indicators container
    let indicatorContainer: HTMLDivElement | null = null;
    if (opts.showIndicators && slides.length > 1) {
      indicatorContainer = document.createElement("div");
      indicatorContainer.style.cssText = `
        position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
        display:flex;gap:6px;pointer-events:auto;z-index:2;
      `;

      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        dot.setAttribute("aria-selected", String(i === currentIndex));
        dot.style.cssText = `
          width:8px;height:8px;border-radius:50%;border:none;
          cursor:pointer;padding:0;transition:all 0.25s ease;
          background:${i === currentIndex ? "#fff" : "rgba(255,255,255,0.4)"};
          box-shadow:${i === currentIndex ? "0 0 4px rgba(255,255,255,0.5)" : "none"};
        `;
        dot.addEventListener("click", () => instance.goTo(i));
        indicatorContainer!.appendChild(dot);
      });

      controls.appendChild(indicatorContainer);
    }

    // Caption area
    let captionEl: HTMLDivElement | null = null;
    if (opts.showCaptions) {
      captionEl = document.createElement("div");
      captionEl.className = "carousel-caption";
      captionEl.style.cssText = `
        position:absolute;bottom:0;left:0;right:0;padding:32px 16px 12px;
        background:linear-gradient(transparent, rgba(0,0,0,0.7));
        color:#fff;font-size:13px;text-align:center;pointer-events:none;z-index:1;
      `;
      controls.appendChild(captionEl);
    }

    opts.parent.appendChild(root);

    // Build slides
    function buildTrack(): void {
      track.innerHTML = "";

      slides.forEach((slide, i) => {
        const slideEl = document.createElement("div");
        slideEl.className = "carousel-slide";
        slideEl.dataset.key = slide.key;
        slideEl.dataset.index = String(i);
        slideEl.setAttribute("role", "tabpanel");
        slideEl.style.cssText = `
          flex-shrink:0;width:100%;height:100%;
          display:flex;align-items:center;justify-content:center;
          background:${slide.bgColor ?? "#111"};
        `;

        // Lazy load: only render visible and adjacent slides
        const isVisible = i === currentIndex ||
          i === (currentIndex - 1 + slides.length) % slides.length ||
          i === (currentIndex + 1) % slides.length;

        if (!opts.lazyLoad || isVisible) {
          renderSlideContent(slideEl, slide);
        } else {
          // Placeholder
          slideEl.innerHTML = `<div style="color:#444;">Loading...</div>`;
        }

        track.appendChild(slideEl);
      });

      updatePosition(false);
      updateCaption();
      updateIndicators();
    }

    function renderSlideContent(container: HTMLElement, slide: CarouselSlide): void {
      container.innerHTML = "";
      if (typeof slide.content === "string") {
        // Check if it looks like an image URL
        if (/^https?:\/\/|^data:image|^\/\//i.test(slide.content)) {
          const img = document.createElement("img");
          img.src = slide.content;
          img.alt = slide.alt ?? "";
          img.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;";
          img.draggable = false;
          container.appendChild(img);
        } else {
          container.innerHTML = slide.content;
        }
      } else {
        container.appendChild(slide.content);
      }
    }

    function updatePosition(animate = true): void {
      if (!animate) {
        track.style.transition = "none";
      } else {
        track.style.transition = `transform ${opts.animationDuration}ms ${opts.easing}`;
      }
      track.style.transform = `translateX(-${currentIndex * 100}%)`;

      if (!animate) {
        requestAnimationFrame(() => { track.style.transition = ""; });
      }
    }

    function updateCaption(): void {
      if (!captionEl) return;
      const slide = slides[currentIndex];
      captionEl.textContent = slide?.caption ?? "";
      captionEl.style.display = slide?.caption ? "block" : "none";
    }

    function updateIndicators(): void {
      if (!indicatorContainer) return;
      const dots = indicatorContainer.querySelectorAll<HTMLElement>("[role='tab']");
      dots.forEach((dot, i) => {
        dot.setAttribute("aria-selected", String(i === currentIndex));
        dot.style.background = i === currentIndex ? "#fff" : "rgba(255,255,255,0.4)";
        dot.style.boxShadow = i === currentIndex ? "0 0 4px rgba(255,255,255,0.5)" : "none";
      });
    }

    function goToSlide(index: number): void {
      if (isTransitioning || destroyed || slides.length === 0) return;

      if (opts.infinite) {
        if (index < 0) index = slides.length - 1;
        else if (index >= slides.length) index = 0;
      } else {
        index = Math.max(0, Math.min(slides.length - 1, index));
      }

      if (index === currentIndex) return;

      isTransitioning = true;
      currentIndex = index;
      updatePosition(true);
      updateCaption();
      updateIndicators();

      setTimeout(() => {
        isTransitioning = false;
        // Re-render for lazy loading
        buildTrack();
      }, opts.animationDuration);

      opts.onSlideChange?.(currentIndex, slides[currentIndex]!);
    }

    // Touch/Swipe support
    if (opts.enableSwipe) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchEndX = 0;
      let swiping = false;

      viewport.addEventListener("touchstart", (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        swiping = true;
        if (isPlaying && opts.pauseOnHover) instance.stop();
      }, { passive: true });

      viewport.addEventListener("touchmove", (e: TouchEvent) => {
        if (!swiping) return;
        touchEndX = e.touches[0].clientX;
        const dx = touchEndX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        // Only intercept horizontal swipes
        if (Math.abs(dx) > Math.abs(dy)) {
          e.preventDefault();
        }
      }, { passive: false });

      viewport.addEventListener("touchend", () => {
        if (!swiping) return;
        swiping = false;
        const dx = touchEndX - touchStartX;

        if (Math.abs(dx) > opts.swipeThreshold) {
          if (dx < 0) instance.next();
          else instance.prev();
        }

        if (isPlaying && opts.pauseOnHover) instance.play();
      });
    }

    // Mouse drag support
    let mouseDown = false;
    let mouseStartX = 0;

    viewport.addEventListener("mousedown", (e: MouseEvent) => {
      mouseDown = true;
      mouseStartX = e.clientX;
      if (isPlaying && opts.pauseOnHover) instance.stop();
    });

    viewport.addEventListener("mousemove", (e: MouseEvent) => {
      if (!mouseDown) return;
    });

    viewport.addEventListener("mouseup", (e: MouseEvent) => {
      if (!mouseDown) return;
      mouseDown = false;
      const dx = e.clientX - mouseStartX;
      if (Math.abs(dx) > opts.swipeThreshold) {
        if (dx < 0) instance.next();
        else instance.prev();
      }
      if (isPlaying && opts.pauseOnHover) instance.play();
    });

    // Keyboard navigation
    root.addEventListener("keydown", (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); instance.prev(); break;
        case "ArrowRight": e.preventDefault(); instance.next(); break;
      }
    });

    // Auto-play
    function startAutoPlay(): void {
      if (playTimer) clearInterval(playTimer);
      if (opts.autoPlayInterval > 0) {
        playTimer = setInterval(() => instance.next(), opts.autoPlayInterval);
      }
    }

    function stopAutoPlay(): void {
      if (playTimer) { clearInterval(playTimer); playTimer = null; }
    }

    // Hover pause
    if (opts.pauseOnHover) {
      root.addEventListener("mouseenter", () => { if (isPlaying) stopAutoPlay(); });
      root.addEventListener("mouseleave", () => { if (isPlaying) startAutoPlay(); });
    }

    // Initialize
    buildTrack();
    if (isPlaying) startAutoPlay();

    // Instance
    const instance: CarouselInstance = {
      element: root,

      goTo(index) { goToSlide(index); },

      next() { goToSlide(currentIndex + 1); },
      prev() { goToSlide(currentIndex - 1); },

      getCurrentIndex() { return currentIndex; },

      play() {
        isPlaying = true;
        startAutoPlay();
      },

      stop() {
        isPlaying = false;
        stopAutoPlay();
      },

      addSlide(newSlide, index) {
        if (index !== undefined) slides.splice(index, 0, newSlide);
        else slides.push(newSlide);
        buildTrack();
      },

      removeSlide(key) {
        const idx = slides.findIndex((s) => s.key === key);
        if (idx >= 0) slides.splice(idx, 1);
        if (currentIndex >= slides.length) currentIndex = Math.max(0, slides.length - 1);
        buildTrack();
      },

      getTotalSlides() { return slides.length; },

      destroy() {
        destroyed = true;
        stopAutoPlay();
        root.remove();
      },
    };

    return instance;
  }

  private createArrow(direction: "prev" | "next", onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", direction === "prev" ? "Previous slide" : "Next slide");
    btn.innerHTML = direction === "prev" ? "&#8249;" : "&#8250;";
    btn.style.cssText = `
      pointer-events:auto;background:rgba(0,0,0,0.4);border:none;color:#fff;
      width:36px;height:36px;border-radius:50%;font-size:20px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(4px);transition:background 0.15s;
      margin-top:-18px;
    `;
    btn.addEventListener("click", onClick);
    btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(0,0,0,0.6)"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "rgba(0,0,0,0.4)"; });
    return btn;
  }
}

/** Convenience: create a carousel */
export function createCarousel(options: CarouselOptions): CarouselInstance {
  return new CarouselManager().create(options);
}
