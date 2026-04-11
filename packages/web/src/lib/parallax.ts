/**
 * Parallax Scrolling: Multi-layer parallax effect with configurable speed per layer,
 * scroll-driven animation, mouse-tracking offset, responsive breakpoints,
 * performance optimization (requestAnimationFrame + will-change), and
 * support for background images, video, and custom elements.
 */

// --- Types ---

export type ParallaxMode = "scroll" | "mouse" | "both";
export type ParallaxDirection = "up" | "down" | "left" | "right";

export interface ParallaxLayer {
  /** Element or selector for this layer */
  element: HTMLElement | string;
  /** Speed factor: 0 = static, 1 = moves with scroll, >1 = moves faster */
  speed?: number;
  /** Z-index ordering (lower = further back) */
  zIndex?: number;
  /** Offset in px at start position */
  offset?: number;
  /** Direction of movement */
  direction?: ParallaxDirection;
  /** Opacity range [start, end] as scroll progresses */
  opacityRange?: [number, number];
  /** Scale range [start, end] as scroll progresses */
  scaleRange?: [number, number];
  /** Blur range [start, end] as scroll progresses (px) */
  blurRange?: [number, number];
  /** Disable this layer? */
  disabled?: boolean;
}

export interface ParallaxOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Parallax layers to animate */
  layers: ParallaxLayer[];
  /** Animation mode */
  mode?: ParallaxMode;
  /** Global speed multiplier (default: 1) */
  globalSpeed?: number;
  /** Mouse sensitivity for mouse mode (default: 0.02) */
  mouseSensitivity?: number;
  /** Smooth easing (0 = instant, 1 = very smooth, default: 0.08) */
  smoothing?: number;
  /** Enable on mobile devices? (default: false — perf concern) */
  enableOnMobile?: boolean;
  /** Max width to disable parallax (responsive breakpoint) */
  maxWidth?: number;
  /** Callback on each frame with current scroll progress (0-1) */
  onProgress?: (progress: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ParallaxInstance {
  element: HTMLElement;
  addLayer: (layer: ParallaxLayer) => void;
  removeLayer: (element: HTMLElement | string) => void;
  setSpeed: (speed: number) => void;
  getProgress: () => number;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
}

// --- Main Class ---

export class ParallaxManager {
  create(options: ParallaxOptions): ParallaxInstance {
    const opts = {
      mode: options.mode ?? "scroll",
      globalSpeed: options.globalSpeed ?? 1,
      mouseSensitivity: options.mouseSensitivity ?? 0.02,
      smoothing: options.smoothing ?? 0.08,
      enableOnMobile: options.enableOnMobile ?? false,
      maxWidth: options.maxWidth ?? 768,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Parallax: container not found");

    container.className = `parallax-container ${opts.className}`;
    container.style.cssText = `
      position:relative;overflow:hidden;width:100%;
      ${opts.maxWidth ? `max-width:${opts.maxWidth}px;margin:0 auto;` : ""}
    `;

    // Resolve layers
    const resolvedLayers: Array<ParallaxLayer & { el: HTMLElement }> = [];
    for (const layer of options.layers) {
      const el = typeof layer.element === "string"
        ? document.querySelector<HTMLElement>(layer.element)
        : layer.element;
      if (el) {
        resolvedLayers.push({ ...layer, el });
        // Set initial styles
        el.style.willChange = "transform, opacity";
        if (layer.zIndex !== undefined) el.style.zIndex = String(layer.zIndex);
      }
    }

    // State
    let destroyed = false;
    let paused = false;
    let rafId: number | null = null;

    // Scroll state
    let currentScrollY = 0;
    let targetScrollY = 0;

    // Mouse state
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    // Container bounds
    function getContainerBounds(): DOMRect {
      return container.getBoundingClientRect();
    }

    function getScrollProgress(): number {
      const rect = getContainerBounds();
      const windowHeight = window.innerHeight;
      const total = rect.height + windowHeight;
      if (total <= 0) return 0;
      return Math.max(0, Math.min(1, -rect.top / total));
    }

    // Check mobile / responsive
    function shouldDisable(): boolean {
      if (opts.enableOnMobile) return false;
      if (window.innerWidth <= opts.maxWidth) return true;
      // Check touch device
      if ("ontouchstart" in window && !opts.enableOnMobile) return true;
      return false;
    }

    // Apply transforms to a single layer
    function applyLayerTransform(layer: ParallaxLayer & { el: HTMLElement }, progress: number): void {
      if (layer.disabled || shouldDisable()) {
        layer.el.style.transform = "";
        layer.el.style.opacity = "";
        layer.el.style.filter = "";
        return;
      }

      const speed = (layer.speed ?? 0.5) * opts.globalSpeed;
      const dir = layer.direction ?? "up";

      let translateX = 0;
      let translateY = 0;
      let scale = 1;
      let opacity = 1;
      let blur = 0;

      if (opts.mode === "scroll" || opts.mode === "both") {
        const containerH = container.offsetHeight || window.innerHeight;
        const moveAmount = containerH * speed * progress;

        switch (dir) {
          case "up":
            translateY = -(moveAmount + (layer.offset ?? 0));
            break;
          case "down":
            translateY = moveAmount + (layer.offset ?? 0);
            break;
          case "left":
            translateX = -(moveAmount + (layer.offset ?? 0));
            break;
          case "right":
            translateX = moveAmount + (layer.offset ?? 0);
            break;
        }
      }

      if ((opts.mode === "mouse" || opts.mode === "both") && !shouldDisable()) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        translateX += (mouseX - cx) * opts.mouseSensitivity * (layer.speed ?? 0.5) * opts.globalSpeed;
        translateY += (mouseY - cy) * opts.mouseSensitivity * (layer.speed ?? 0.5) * opts.globalSpeed;
      }

      // Opacity range
      if (layer.opacityRange) {
        opacity = layer.opacityRange[0] + (layer.opacityRange[1] - layer.opacityRange[0]) * progress;
      }

      // Scale range
      if (layer.scaleRange) {
        scale = layer.scaleRange[0] + (layer.scaleRange[1] - layer.scaleRange[0]) * progress;
      }

      // Blur range
      if (layer.blurRange) {
        blur = layer.blurRange[0] + (layer.blurRange[1] - layer.blurRange[0]) * progress;
      }

      // Build transform
      const parts: string[] = [];
      if (translateX !== 0 || translateY !== 0) {
        parts.push(`translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px)`);
      }
      if (scale !== 1) {
        parts.push(`scale(${scale.toFixed(4)})`);
      }

      layer.el.style.transform = parts.length > 0 ? parts.join(" ") : "";
      layer.el.style.opacity = String(opacity);
      if (blur > 0) {
        layer.el.style.filter = `blur(${blur.toFixed(1)}px)`;
      } else {
        layer.el.style.filter = "";
      }
    }

    // Main animation loop
    function tick(): void {
      if (destroyed) return;

      if (!paused) {
        // Smooth interpolation (lerp)
        currentScrollY += (targetScrollY - currentScrollY) * opts.smoothing;
        mouseX += (targetMouseX - mouseX) * opts.smoothing;
        mouseY += (targetMouseY - mouseY) * opts.smoothing;

        const progress = getScrollProgress();

        for (const layer of resolvedLayers) {
          applyLayerTransform(layer, progress);
        }

        opts.onProgress?.(progress);
      }

      rafId = requestAnimationFrame(tick);
    }

    // Scroll handler
    function onScroll(): void {
      if (destroyed || paused) return;
      targetScrollY = window.scrollY || document.documentElement.scrollTop;
    }

    // Mouse move handler
    function onMouseMove(e: MouseEvent): void {
      if (destroyed || paused) return;
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    }

    // Event listeners
    window.addEventListener("scroll", onScroll, { passive: true });

    if (opts.mode === "mouse" || opts.mode === "both") {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }

    // Start animation loop
    targetScrollY = window.scrollY || document.documentElement.scrollTop;
    currentScrollY = targetScrollY;
    rafId = requestAnimationFrame(tick);

    // Initial apply
    const initProgress = getScrollProgress();
    for (const layer of resolvedLayers) {
      applyLayerTransform(layer, initProgress);
    }

    // --- Instance ---

    const instance: ParallaxInstance = {
      element: container,

      addLayer(newLayer: ParallaxLayer) {
        const el = typeof newLayer.element === "string"
          ? document.querySelector<HTMLElement>(newLayer.element)
          : newLayer.element;
        if (el) {
          resolvedLayers.push({ ...newLayer, el });
          el.style.willChange = "transform, opacity";
          if (newLayer.zIndex !== undefined) el.style.zIndex = String(newLayer.zIndex);
        }
      },

      removeLayer(element: HTMLElement | string) {
        const selector = typeof element === "string" ? element : "";
        const idx = resolvedLayers.findIndex((l) =>
          typeof element === "string" ? l.el.matches(selector) : l.el === element
        );
        if (idx >= 0) {
          resolvedLayers[idx].el.style.willChange = "";
          resolvedLayers[idx].el.style.transform = "";
          resolvedLayers[idx].el.style.opacity = "";
          resolvedLayers[idx].el.style.filter = "";
          resolvedLayers.splice(idx, 1);
        }
      },

      setSpeed(speed: number) {
        opts.globalSpeed = speed;
      },

      getProgress() {
        return getScrollProgress();
      },

      pause() { paused = true; },

      resume() { paused = false; },

      destroy() {
        destroyed = true;
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("mousemove", onMouseMove);
        for (const layer of resolvedLayers) {
          layer.el.style.willChange = "";
          layer.el.style.transform = "";
          layer.el.style.opacity = "";
          layer.el.style.filter = "";
        }
        resolvedLayers.length = 0;
      },
    };

    return instance;
  }
}

/** Convenience: create a parallax effect */
export function createParallax(options: ParallaxOptions): ParallaxInstance {
  return new ParallaxManager().create(options);
}
