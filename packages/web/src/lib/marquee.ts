/**
 * Marquee / Ticker: Horizontal/vertical scrolling text animation with
 * speed control, direction toggle, pause on hover, bounce mode,
 * gradient support, and multiple content items.
 */

// --- Types ---

export type MarqueeDirection = "left" | "right" | "up" | "down";
export type MarqueeStyle = "scroll" | "bounce" | "fade";

export interface MarqueeItem {
  /** Text content */
  text: string;
  /** Optional HTML content (renders instead of text) */
  html?: string;
  /** Background color for this item */
  bgColor?: string;
  /** Text color */
  textColor?: string;
  /** Click callback */
  onClick?: () => void;
}

export interface MarqueeOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Items to display (strings or MarqueeItems) */
  items?: Array<string | MarqueeItem>;
  /** Single string shorthand */
  text?: string;
  /** Scroll direction */
  direction?: MarqueeDirection;
  /** Animation style */
  style?: MarqueeStyle;
  /** Speed in pixels per second (default: 50) */
  speed?: number;
  /** Pause on hover? */
  pauseOnHover?: boolean;
  /** Gap between repeated items (px) */
  gap?: number;
  /** Show gradient overlay? */
  gradient?: boolean;
  /** Gradient colors [start, end] */
  gradientColors?: [string, string];
  /** Duplicate content for seamless loop (default: auto-calculate) */
  duplicates?: number;
  /** Font size */
  fontSize?: number;
  /** Font weight */
  fontWeight?: number;
  /** Height of marquee area */
  height?: string;
  /** Overflow hidden? (default: true) */
  overflowHidden?: boolean;
  /** Callback on cycle complete */
  onCycle?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface MarqueeInstance {
  element: HTMLElement;
  setText: (text: string) => void;
  setItems: (items: Array<string | MarqueeItem>) => void;
  setSpeed: (speed: number) => void;
  setDirection: (dir: MarqueeDirection) => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
}

// --- Main Class ---

export class MarqueeManager {
  create(options: MarqueeOptions): MarqueeInstance {
    const opts = {
      direction: options.direction ?? "left",
      style: options.style ?? "scroll",
      speed: options.speed ?? 50,
      pauseOnHover: options.pauseOnHover ?? true,
      gap: options.gap ?? 40,
      gradient: options.gradient ?? false,
      gradientColors: options.gradientColors ?? ["#4338ca", "#818cf8"],
      duplicates: options.duplicates ?? 0,
      fontSize: options.fontSize ?? 14,
      fontWeight: options.fontWeight ?? 500,
      height: options.height ?? "auto",
      overflowHidden: options.overflowHidden ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Marquee: container not found");

    container.className = `marquee marquee-${opts.direction} ${opts.className ?? ""}`;

    // Parse items
    let items: MarqueeItem[] = [];
    if (options.text) {
      items = [{ text: options.text }];
    } else if (options.items) {
      items = options.items.map((item) =>
        typeof item === "string" ? { text: item } : item
      );
    }

    let destroyed = false;
    let paused = false;
    let animationFrame: number | null = null;
    let offset = 0;
    const isHorizontal = opts.direction === "left" || opts.direction === "right";

    // Track element for scroll area
    let scrollEl: HTMLElement | null = null;

    function render(): void {
      container.innerHTML = "";
      container.style.cssText = `
        overflow:${opts.overflowHidden ? "hidden" : "visible"};
        height:${opts.height};
        position:relative;
        white-space:nowrap;
      `;

      // Inner scroll container
      scrollEl = document.createElement("div");
      scrollEl.className = "marquee-scroll";
      scrollEl.style.cssText = `
        display:inline-flex;${isHorizontal ? "flex-direction:row;" : "flex-direction:column;"}
        will-change:transform;cursor:${opts.pauseOnHover ? "" : "default"};
      `;

      // Build content with duplication for seamless looping
      const dupCount = opts.duplicates || calculateDuplicates();
      for (let d = 0; d < dupCount; d++) {
        for (const item of items) {
          const el = document.createElement("div");
          el.className = "marquee-item";
          el.style.cssText = `
            flex-shrink:0;white-space:nowrap;
            padding:${isHorizontal ? "0 " + `${opts.gap / 2}px` : `${opts.gap / 2}px 0`};
            font-size:${opts.fontSize}px;font-weight:${opts.fontWeight};
            ${item.bgColor ? `background:${item.bgColor};` : ""}
            ${item.textColor ? `color:${item.textColor};` : ""}
            display:inline-flex;align-items:center;
          `;

          if (item.html) {
            el.innerHTML = item.html;
          } else {
            el.textContent = item.text;
          }

          if (item.onClick) {
            el.style.cursor = "pointer";
            el.addEventListener("click", (e) => { e.stopPropagation(); item.onClick!(); });
          }

          scrollEl.appendChild(el);
        }
      }

      container.appendChild(scrollEl);

      // Gradient overlay
      if (opts.gradient) {
        const grad = document.createElement("div");
        grad.style.cssText = `
          position:absolute;inset:0;pointer-events:none;z-index:1;
          background:linear-gradient(to ${isHorizontal ? "right" : "bottom"},
            transparent, ${opts.gradientColors[0]}33%, ${opts.gradientColors[1]});
          opacity:0.08;
        `;
        container.appendChild(grad);
      }

      // Start animation
      startAnimation();
    }

    function calculateDuplicates(): number {
      if (opts.duplicates > 0) return opts.duplicates;

      // Auto-calculate: need enough content to fill ~3x the viewport
      const avgWidth = items.reduce((sum, it) => sum + (it.text?.length ?? 5) * opts.fontSize * 0.6, 0);
      const containerW = container.clientWidth || 300;
      return Math.ceil((containerW * 3) / Math.max(avgWidth, 50)) + 2;
    }

    function startAnimation(): void {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      let lastTime = performance.now();

      function animate(time: number) {
        if (destroyed) return;

        if (!paused) {
          const delta = (time - lastTime) / 1000;
          offset += delta * opts.speed * (opts.direction === "right" || opts.direction === "down" ? 1 : -1);

          switch (opts.style) {
            case "scroll":
              // Continuous scroll, reset when past end
              const maxOffset = scrollEl!.scrollWidth - container.clientWidth;
              const maxH = scrollEl!.scrollHeight - container.clientHeight;
              const limit = isHorizontal ? maxOffset : maxH;
              if (Math.abs(offset) > limit + 50) offset = 0;
              break;
            case "bounce":
              // Bounce back and forth
              const limit = isHorizontal
                ? (scrollEl!.scrollWidth - container.clientWidth) / 2
                : (scrollEl!.scrollHeight - container.clientHeight) / 2;
              offset = ((offset % (limit * 2)) + limit) % (limit * 2) - limit;
              break;
            case "fade":
              // Fade out at edges, fade in at center
              const limit = isHorizontal
                ? (scrollEl!.scrollWidth - container.clientWidth) / 2
                : (scrollEl!.scrollHeight - container.clientHeight) / 2;
              const centerDist = Math.abs(offset - limit);
              const fadeZone = Math.min(limit * 0.4, 80);
              break;
          }

          applyTransform();
        }

        lastTime = time;
        animationFrame = requestAnimationFrame(animate);
      }

      animationFrame = requestAnimationFrame(animate);
    }

    function applyTransform(): void {
      if (!scrollEl) return;

      const isH = opts.direction === "left" || opts.direction === "right";
      const limit = isH
        ? scrollEl!.scrollWidth - container.clientWidth
        : scrollEl!.scrollHeight - container.clientHeight;

      switch (opts.style) {
        case "scroll":
          scrollEl.style.transform = `translateX(${-offset}px)`;
          break;
        case "bounce": {
          const pos = ((offset % (limit * 2)) + limit) % (limit * 2) - limit;
          scrollEl.style.transform = `translateX(${-pos}px)`;
          break;
        case "fade": {
          const pos = ((offset % (limit * 2)) + limit) % (limit * 2) - limit;
          const centerDist = Math.abs(pos);
          const fadeZone = Math.min(limit * 0.4, 80);
          const opacity = Math.max(0, 1 - centerDist / fadeZone);
          scrollEl.style.transform = `translateX(${-pos}px)`;
          scrollEl.style.opacity = String(opacity);
          break;
        default:
          scrollEl.style.transform = `translateX(${-offset}px)`;
      }
    }

    // Hover pause
    if (opts.pauseOnHover) {
      container.addEventListener("mouseenter", () => { paused = true; });
      container.addEventListener("mouseleave", () => { paused = false; });
    }

    // Initial render
    render();

    const instance: MarqueeInstance = {
      element: container,

      setText(text: string) {
        items = [{ text }];
        render();
      },

      setItems(newItems: Array<string | MarqueeItem>) {
        items = newItems.map((item) =>
          typeof item === "string" ? { text: item } : item
        );
        render();
      },

      setSpeed(speed: number) {
        opts.speed = speed;
      },

      setDirection(dir: MarqueeDirection) {
        opts.direction = dir;
      },

      pause() { paused = true; },

      resume() { paused = false; },

      destroy() {
        destroyed = true;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a marquee */
export function createMarquee(options: MarqueeOptions): MarqueeInstance {
  return new MarqueeManager().create(options);
}
