/**
 * Parallax Scroller: Multi-layer parallax scrolling engine.
 * Creates depth effects by moving layers at different speeds relative
 * to scroll position. Supports:
 * - Multiple parallax layers with configurable speed factors
 * - Horizontal and vertical parallax
 * - Mouse/touch-responsive parallax (tilt effect)
 * - Scroll-triggered animations (fade, scale, rotate, slide)
 * - Custom easing functions
 * - Performance-optimized with requestAnimationFrame + will-change
 * - Responsive breakpoints
 * - Progress callbacks for each layer
 */

// --- Types ---

export type ParallaxDirection = "vertical" | "horizontal" | "both";
export type EasingType = "linear" | "easeIn" | "easeOut" | "easeInOut" | "spring" | "bounce";

export interface ParallaxLayer {
  /** Layer identifier */
  id: string;
  /** Element or selector for this layer */
  element: HTMLElement | string;
  /** Speed factor: 0 = static, 1 = scrolls with page, >1 = faster, <0 = opposite */
  speed: number;
  /** Optional horizontal speed factor (defaults to speed) */
  speedX?: number;
  /** Offset in px (starting position adjustment) */
  offset?: number;
  /** Limit movement range [min, max] in px */
  range?: [number, number];
  /** Only active within these scroll boundaries [top, bottom] in px */
  activeRange?: [number, number];
  /** Disable after passing this scroll position */
  disableAfter?: number;
  /** Z-index for this layer */
  zIndex?: number;
  /** Opacity range during scroll [startOpacity, endOpacity] */
  opacity?: [number, number];
  /** Scale range during scroll [startScale, endScale] */
  scale?: [number, number];
  /** Rotation range during scroll [startDeg, endDeg] */
  rotation?: [number, number];
  /** Blur range during blur [startPx, endPx] */
  blur?: [number, number];
  /** Custom update callback (overrides built-in transforms) */
  onUpdate?: (progress: number, layer: ParallaxLayer) => void;
  /** Callback when layer enters view */
  onEnter?: () => void;
  /** Callback when layer leaves view */
  onLeave?: () => void;
}

export interface ScrollAnimation {
  /** Target element or selector */
  target: HTMLElement | string;
  /** Animation type */
  type: "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight" | "fadeIn" | "scaleUp" | "scaleDown" | "rotateIn" | "slideUp" | "slideDown" | "slideLeft" | "slideRight";
  /** Start trigger: fraction of element visible (default: 0.15) */
  start?: number;
  /** End trigger: fraction of element visible (default: 0.85) */
  end?: number;
  /** Duration factor (default: 1) */
  duration?: number;
  /** Delay before animation starts in px of scroll */
  delay?: number;
  /** Easing type (default: easeOut) */
  easing?: EasingType;
  /** Only trigger once (default: false) */
  once?: boolean;
  /** Custom CSS properties to animate */
  customProperties?: Record<string, [number, number]>;
}

export interface TiltConfig {
  /** Enable mouse tilt effect (default: false) */
  enabled?: boolean;
  /** Max tilt angle in degrees (default: 15) */
  maxTilt?: number;
  /** Perspective value (default: 800) */
  perspective?: number;
  /** Scale on hover (default: 1.02) */
  scale?: number;
  /** Glare effect (default: false) */
  glare?: boolean;
  /** Glare opacity (default: 0.2) */
  glareOpacity?: number;
  /** Tilt speed (default: 400ms) */
  speed?: number;
}

export interface ParallaxScrollerOptions {
  /** Container element (default: document body / viewport) */
  container?: HTMLElement | string;
  /** Parallax layers */
  layers: ParallaxLayer[];
  /** Scroll-triggered animations */
  animations?: ScrollAnimation[];
  /** Direction of parallax effect (default: vertical) */
  direction?: ParallaxDirection;
  /** Scroll smoothing factor 0-1 (default: 0.1, lower = smoother but more lag) */
  smoothness?: number;
  /** Maximum smoothing delta cap in px (default: 100) */
  maxDelta?: number;
  /** Mouse/tilt configuration */
  tilt?: TiltConfig;
  /** Disable on mobile (default: checks screen width < 768) */
  disableMobile?: boolean;
  /** Mobile breakpoint width (default: 768) */
  mobileBreakpoint?: number;
  /** Use passive event listeners (default: true) */
  passive?: boolean;
  /** Callback on every frame with scroll progress 0-1 */
  onProgress?: (progress: number) => void;
  /** Callback when scroller is destroyed */
  onDestroy?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ParallaxScrollerInstance {
  element: HTMLElement;
  /** Current smoothed scroll position */
  getScrollPosition: () => number;
  /** Overall progress 0-1 */
  getProgress: () => number;
  /** Add a layer dynamically */
  addLayer: (layer: ParallaxLayer) => void;
  /** Remove a layer by ID */
  removeLayer: (id: string) => void;
  /** Add a scroll animation */
  addAnimation: (animation: ScrollAnimation) => void;
  /** Update layer properties */
  updateLayer: (id: string, updates: Partial<ParallaxLayer>) => void;
  /** Jump to specific scroll position */
  scrollTo: (position: number) => void;
  /** Refresh/recalculate all measurements */
  refresh: () => void;
  /** Pause parallax updates */
  pause: () => void;
  /** Resume parallax updates */
  resume: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Easing Functions ---

const EASING: Record<EasingType, (t: number) => number> = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  spring: t => 1 - Math.cos(t * Math.PI * 3) * Math.exp(-t * 6),
  bounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

// --- Helpers ---

function resolveElement(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// --- Main ---

export function createParallaxScroller(options: ParallaxScrollerOptions): ParallaxScrollerInstance {
  const opts = {
    direction: "vertical" as ParallaxDirection,
    smoothness: 0.1,
    maxDelta: 100,
    tilt: { enabled: false, maxTilt: 15, perspective: 800, scale: 1.02, glare: false, glareOpacity: 0.2, speed: 400 },
    disableMobile: true,
    mobileBreakpoint: 768,
    passive: true,
    layers: [],
    animations: [],
    ...options,
  };

  const container = opts.container
    ? (typeof opts.container === "string"
      ? document.querySelector<HTMLElement>(opts.container)!
      : opts.container)
    : document.body;

  // Wrapper for positioning context
  const root = document.createElement("div");
  root.className = `parallax-scroller ${opts.className ?? ""}`;
  root.style.cssText = "position:relative;overflow:hidden;";
  if (container === document.body) {
    root.style.cssText += "min-height:100vh;";
    document.body.prepend(root);
  } else {
    container.style.position = container.style.position || "relative";
    container.insertBefore(root, container.firstChild);
  }

  // State
  let scrollY = 0;
  let targetScrollY = 0;
  let isPaused = false;
  let destroyed = false;
  let animFrameId: number | null = null;
  let isMobile = window.innerWidth < opts.mobileBreakpoint;
  const resolvedLayers: Map<string, { layer: ParallaxLayer; el: HTMLElement; entered: boolean }> = new Map();
  const resolvedAnims: Map<HTMLElement, { anim: ScrollAnimation; triggered: boolean }> = new Map();

  // Resolve layer elements
  for (const layer of opts.layers) {
    const el = resolveElement(layer.element);
    if (el) {
      resolvedLayers.set(layer.id, { layer, el, entered: false });
      if (layer.zIndex !== undefined) el.style.zIndex = String(layer.zIndex);
      el.style.willChange = "transform, opacity";
    }
  }

  // Resolve animation targets
  for (const anim of opts.animations ?? []) {
    const el = resolveElement(anim.target);
    if (el) {
      resolvedAnims.set(el, { anim, triggered: false });
      // Set initial state
      setInitialState(el, anim.type);
    }
  }

  function setInitialState(el: HTMLElement, type: string): void {
    switch (type) {
      case "fadeUp": case "slideUp":
        el.style.opacity = "0"; el.style.transform = "translateY(40px)"; break;
      case "fadeDown": case "slideDown":
        el.style.opacity = "0"; el.style.transform = "translateY(-40px)"; break;
      case "fadeLeft": case "slideLeft":
        el.style.opacity = "0"; el.style.transform = "translateX(40px)"; break;
      case "fadeRight": case "slideRight":
        el.style.opacity = "0"; el.style.transform = "translateX(-40px)"; break;
      case "fadeIn":
        el.style.opacity = "0"; break;
      case "scaleUp":
        el.style.opacity = "0"; el.style.transform = "scale(0.85)"; break;
      case "scaleDown":
        el.style.opacity = "0"; el.style.transform = "scale(1.15)"; break;
      case "rotateIn":
        el.style.opacity = "0"; el.style.transform = "rotate(-15deg)"; break;
    }
  }

  function getScrollTop(): number {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function getMaxScroll(): number {
    return Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      0,
    );
  }

  // Core tick function
  function tick(): void {
    if (destroyed || isPaused) {
      animFrameId = requestAnimationFrame(tick);
      return;
    }

    // Smooth scroll interpolation
    targetScrollY = getScrollTop();
    const delta = targetScrollY - scrollY;
    const clampedDelta = clamp(delta, -opts.maxDelta, opts.maxDelta);
    scrollY += clampedDelta * opts.smoothness;

    const maxScroll = getMaxScroll();
    const progress = maxScroll > 0 ? scrollY / maxScroll : 0;

    // Update parallax layers
    for (const [, { layer, el, entered }] of resolvedLayers) {
      // Check active range
      if (layer.activeRange) {
        const rect = el.getBoundingClientRect();
        const elemTop = rect.top + scrollY;
        if (scrollY < layer.activeRange[0]! - window.innerHeight ||
            scrollY > layer.activeRange]![1]) {
          continue;
        }
      }

      // Check disableAfter
      if (layer.disableAfter !== undefined && scrollY > layer.disableAfter) {
        continue;
      }

      // Check enter/leave
      const rect = el.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (isVisible && !entered) {
        entered = true;
        layer.onEnter?.();
      } else if (!isVisible && entered) {
        entered = false;
        layer.onLeave?.();
      }

      // Use custom updater if provided
      if (layer.onUpdate) {
        layer.onUpdate(progress, layer);
        continue;
      }

      // Calculate layer offset
      const speedY = layer.speed;
      const speedX = layer.speedX ?? layer.speed;
      const offset = layer.offset ?? 0;
      const range = layer.range;

      let translateY = 0;
      let translateX = 0;

      if (opts.direction === "vertical" || opts.direction === "both") {
        const rawOffset = scrollY * speedY + offset;
        translateY = range ? clamp(rawOffset, range[0], range[1]) : rawOffset;
      }

      if (opts.direction === "horizontal" || opts.direction === "both") {
        const rawOffset = scrollY * speedX + offset;
        translateX = range ? clamp(rawOffset, range[0], range[1]) : rawOffset;
      }

      // Apply transforms
      let transform = `translate3d(${translateX}px, ${translateY}px, 0)`;

      // Opacity
      if (layer.opacity) {
        const op = lerp(layer.opacity[0], layer.opacity[1], progress);
        el.style.opacity = String(clamp(op, 0, 1));
      }

      // Scale
      if (layer.scale) {
        const s = lerp(layer.scale[0], layer.scale[1], progress);
        transform += ` scale(${clamp(s, 0.01, 10)})`;
      }

      // Rotation
      if (layer.rotation) {
        const r = lerp(layer.rotation[0], layer.rotation[1], progress);
        transform += ` rotate(${r}deg)`;
      }

      el.style.transform = transform;

      // Blur
      if (layer.blur) {
        const b = lerp(layer.blur[0], layer.blur[1], progress);
        el.style.filter = `blur(${Math.max(b, 0)}px)`;
      }
    }

    // Process scroll animations
    for (const [el, { anim, triggered }] of resolvedAnims) {
      if (anim.once && triggered) continue;

      const rect = el.getBoundingClientRect();
      const viewHeight = window.innerHeight;
      const start = anim.start ?? 0.15;
      const end = anim.end ?? 0.85;
      const delay = anim.delay ?? 0;

      // Visibility fraction
      const visStart = rect.top - viewHeight * (1 - start) + delay;
      const visEnd = rect.bottom - viewHeight * end + delay;

      let animProgress: number;
      if (visStart <= 0 && visEnd >= 0) {
        animProgress = clamp(-visStart / (visEnd - visStart), 0, 1);
      } else if (visEnd < 0) {
        animProgress = 1;
      } else {
        animProgress = 0;
      }

      const eased = EASING[anim.easing ?? "easeOut"](animProgress);

      if (animProgress > 0 && !triggered) {
        (resolvedAnims.get(el)! as { triggered: boolean }).triggered = true;
      }

      applyAnimationTransform(el, anim.type, eased, anim.customProperties);
    }

    opts.onProgress?.(progress);
    animFrameId = requestAnimationFrame(tick);
  }

  function applyAnimationTransform(
    el: HTMLElement,
    type: string,
    progress: number,
    customProps?: Record<string, [number, number]>,
  ): void {
    switch (type) {
      case "fadeUp":
        el.style.opacity = String(progress);
        el.style.transform = `translateY(${lerp(40, 0, progress)}px)`;
        break;
      case "fadeDown":
        el.style.opacity = String(progress);
        el.style.transform = `translateY(${lerp(-40, 0, progress)}px)`;
        break;
      case "fadeLeft":
        el.style.opacity = String(progress);
        el.style.transform = `translateX(${lerp(40, 0, progress)}px)`;
        break;
      case "fadeRight":
        el.style.opacity = String(progress);
        el.style.transform = `translateX(${lerp(-40, 0, progress)}px)`;
        break;
      case "fadeIn":
        el.style.opacity = String(progress);
        break;
      case "scaleUp":
        el.style.opacity = String(progress);
        el.style.transform = `scale(${lerp(0.85, 1, progress)})`;
        break;
      case "scaleDown":
        el.style.opacity = String(progress);
        el.style.transform = `scale(${lerp(1.15, 1, progress)})`;
        break;
      case "rotateIn":
        el.style.opacity = String(progress);
        el.style.transform = `rotate(${lerp(-15, 0, progress)}deg)`;
        break;
      case "slideUp":
        el.style.transform = `translateY(${lerp(40, 0, progress)}px)`;
        break;
      case "slideDown":
        el.style.transform = `translateY(${lerp(-40, 0, progress)}px)`;
        break;
      case "slideLeft":
        el.style.transform = `translateX(${lerp(40, 0, progress)}px)`;
        break;
      case "slideRight":
        el.style.transform = `translateX(${lerp(-40, 0, progress)}px)`;
        break;
    }

    // Custom properties
    if (customProps) {
      for (const [prop, [from, to]] of Object.entries(customProps)) {
        (el.style as unknown as Record<string, string>)[prop] = String(lerp(from, to, progress));
      }
    }
  }

  // Mouse tilt handling
  function setupTilt(): void {
    if (!opts.tilt.enabled) return;

    container.addEventListener("mousemove", (e) => {
      if (isMobile || destroyed) return;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const percentX = (e.clientX - centerX) / (rect.width / 2);
      const percentY = (e.clientY - centerY) / (rect.height / 2);

      for (const [, { el }] of resolvedLayers) {
        el.style.transition = `transform ${opts.tilt.speed}ms ease-out`;
        el.style.transformOrigin = "center center";
        el.style.perspective = `${opts.tilt.perspective}px`;

        const tiltX = opts.tilt.maxTilt! * percentY;
        const tiltY = -opts.tilt.maxTilt! * percentX;
        el.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${opts.tilt.scale}, ${opts.tilt.scale}, ${opts.tilt.scale})`;

        if (opts.tilt.glare) {
          el.style.setProperty("--glare-opacity", String(Math.abs(percentX) * opts.tilt.glareOpacity!));
        }
      }
    }, { passive: opts.passive });

    container.addEventListener("mouseleave", () => {
      for (const [, { el }] of resolvedLayers) {
        el.style.transition = `transform ${opts.tilt.speed}ms ease-out`;
        el.style.transform = "";
      }
    }, { passive: opts.passive });
  }

  // Mobile check
  function checkMobile(): void {
    wasMobile = isMobile;
    isMobile = window.innerWidth < opts.mobileBreakpoint;
  }
  let wasMobile = isMobile;

  // Start
  if (!(opts.disableMobile && isMobile)) {
    setupTilt();
    animFrameId = requestAnimationFrame(tick);
  }

  // Resize handler
  window.addEventListener("resize", () => {
    checkMobile();
    if (opts.disableMobile && isMobile && !wasMobile) {
      // Just became mobile, pause
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else if (opts.disableMobile && !isMobile && wasMobile) {
      // Left mobile, resume
      animFrameId = requestAnimationFrame(tick);
    }
  });

  // Instance
  const instance: ParallaxScrollerInstance = {
    element: root,

    getScrollPosition() { return scrollY; },
    getProgress() {
      const max = getMaxScroll();
      return max > 0 ? scrollY / max : 0;
    },

    addLayer(layer: ParallaxLayer) {
      const el = resolveElement(layer.element);
      if (el) {
        resolvedLayers.set(layer.id, { layer, el, entered: false });
        if (layer.zIndex !== undefined) el.style.zIndex = String(layer.zIndex);
        el.style.willChange = "transform, opacity";
      }
    },

    removeLayer(id: string) {
      resolvedLayers.delete(id);
    },

    addAnimation(animation: ScrollAnimation) {
      const el = resolveElement(animation.target);
      if (el) {
        resolvedAnims.set(el, { anim: animation, triggered: false });
        setInitialState(el, animation.type);
      }
    },

    updateLayer(id: string, updates: Partial<ParallaxLayer>) {
      const entry = resolvedLayers.get(id);
      if (entry) Object.assign(entry.layer, updates);
    },

    scrollTo(position: number) {
      window.scrollTo({ top: position, behavior: "instant" });
    },

    refresh() {
      // Force recalculation
      for (const [, { el }] of resolvedLayers) {
        el.style.willChange = "auto";
        el.offsetHeight; // Force reflow
        el.style.willChange = "transform, opacity";
      }
    },

    pause() { isPaused = true; },
    resume() { isPaused = false; },

    destroy() {
      destroyed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      resolvedLayers.clear();
      resolvedAnims.clear();
      root.remove();
      opts.onDestroy?.();
    },
  };

  return instance;
}
