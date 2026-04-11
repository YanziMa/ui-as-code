/**
 * Confetti/Particle Effects Utilities: Canvas-based confetti explosions,
 * particle systems, celebration effects with physics, colors, shapes,
 * and configurable duration.
 */

// --- Types ---

export type ConfettiShape = "circle" | "square" | "triangle" | "star" | "ribbon" | "mixed";
export type ConfettiOrigin = "center" | "top-center" | "random" | "target";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
  shape: ConfettiShape;
  life: number;
  maxLife: number;
  wobble: number;
  wobbleSpeed: number;
}

export interface ConfettiOptions {
  /** Number of particles */
  count?: number;
  /** Particle shapes */
  shapes?: ConfettiShape[];
  /** Colors (auto-generated if empty) */
  colors?: string[];
  /** Origin of explosion */
  origin?: ConfettiOrigin;
  /** Target element for positioning (used with "target" origin) */
  target?: HTMLElement;
  /** Spread angle in degrees (360 = full circle) */
  spread?: number;
  /** Initial velocity range [min, max] */
  velocity?: { min: number; max: number };
  /** Gravity */
  gravity?: number;
  /** Air resistance / drag */
  drag?: number;
  /** Fade out over life */
  fadeOut?: boolean;
  /** Duration in ms (0 = until all particles die) */
  duration?: number;
  /** Ticker tape mode (falling from top) */
  tickerTape?: boolean;
  /** Canvas width (default viewport width) */
  width?: number;
  /** Canvas height (default viewport height) */
  height?: number;
  /** Z-index */
  zIndex?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Called each frame with particle count */
  onTick?: (activeCount: number) => void;
}

export interface ConfettiInstance {
  /** The canvas element */
  el: HTMLCanvasElement;
  /** Launch a new burst */
  burst: (options?: Partial<ConfettiOptions>) => void;
  /** Stop animation and remove */
  destroy: () => void;
  /** Check if still animating */
  isRunning: () => boolean;
  /** Get active particle count */
  getParticleCount: () => number;
}

// --- Default Color Palette ---

const DEFAULT_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
];

// --- Core Factory ---

/**
 * Create a confetti/particle effect system.
 *
 * @example
 * ```ts
 * const confetti = createConfetti({ count: 150, spread: 180 });
 * // Later:
 * confetti.burst({ count: 50 });
 * confetti.destroy();
 * ```
 */
export function createConfetti(options: ConfettiOptions = {}): ConfettiInstance {
  const {
    count = 100,
    shapes = ["mixed"],
    colors = DEFAULT_COLORS,
    origin = "center",
    target,
    spread = 360,
    velocity = { min: 2, max: 8 },
    gravity = 0.15,
    drag = 0.99,
    fadeOut = true,
    duration = 0,
    tickerTape = false,
    width = window.innerWidth,
    height = window.innerHeight,
    zIndex = 9999,
    className,
    container,
    onComplete,
    onTick,
  } = options;

  let particles: Particle[] = [];
  let running = false;
  let rafId: number | null = null;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  // Canvas setup
  canvas = document.createElement("canvas");
  canvas.className = `confetti-canvas ${className ?? ""}`.trim();
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText =
    `position:fixed;top:0;left:0;width:${width}px;height:${height}px;` +
    `pointer-events:none;z-index:${zIndex};`;

  ctx = canvas.getContext("2d")!;

  (container ?? document.body).appendChild(canvas);

  // --- Particle Creation ---

  function _pickShape(): ConfettiShape {
    if (shapes.includes("mixed")) {
      const allShapes: ConfettiShape[] = ["circle", "square", "triangle", "star", "ribbon"];
      return allShapes[Math.floor(Math.random() * allShapes.length)]!;
    }
    return shapes[Math.floor(Math.random() * shapes.length)]!;
  }

  function _pickColor(): string {
    return colors[Math.floor(Math.random() * colors.length)]!;
  }

  function _getOriginPos(): { x: number; y: number } {
    switch (origin) {
      case "center":
        return { x: width / 2, y: height / 2 };
      case "top-center":
        return { x: width / 2, y: 0 };
      case "target":
        if (target) {
          const rect = target.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        return { x: width / 2, y: height / 2 };
      case "random":
      default:
        return { x: Math.random() * width, y: Math.random() * height * 0.5 };
    }
  }

  function createParticles(num: number): void {
    const pos = _getOriginPos();
    const angleRad = (spread * Math.PI) / 180;
    const startAngle = -angleRad / 2 + (Math.PI / 2);

    for (let i = 0; i < num; i++) {
      const angle = tickerTape
        ? Math.PI / 2 + (Math.random() - 0.5) * 1.5
        : startAngle + Math.random() * angleRad;
      const vel = velocity.min + Math.random() * (velocity.max - velocity.min);
      const size = tickerTape
        ? 4 + Math.random() * 8
        : 4 + Math.random() * 10;

      particles.push({
        x: pos.x + (tickerTape ? Math.random() * width : 0),
        y: pos.y - (tickerTape ? Math.random() * 100 : 0),
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        size,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        color: _pickColor(),
        opacity: 1,
        shape: _pickShape(),
        life: 0,
        maxLife: 100 + Math.random() * 150,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.1,
      });
    }
  }

  // --- Drawing ---

  function _drawParticle(p: Particle): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = fadeOut ? p.opacity : 1;
    ctx.fillStyle = p.color;

    switch (p.shape) {
      case "circle":
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "square":
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        break;

      case "triangle": {
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case "star": {
        _drawStar(ctx, 0, 0, 5, p.size / 2, p.size / 4);
        break;
      }

      case "ribbon": {
        ctx.fillRect(-p.size, -p.size / 6, p.size * 2, p.size / 3);
        break;
      }
    }

    ctx.restore();
  }

  function _drawStar(
    c: CanvasRenderingContext2D,
    cx: number, cy: number,
    spikes: number, outerRadius: number, innerRadius: number,
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    c.beginPath();
    c.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      c.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      c.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }

    c.closePath();
    c.fill();
  }

  // --- Animation Loop ---

  function _tick(): void {
    if (!running) return;

    ctx.clearRect(0, 0, width, height);

    // Update and draw
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;

      // Physics
      p.vy += gravity;
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx + Math.sin(p.wobble) * 0.5;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.wobble += p.wobbleSpeed;
      p.life++;

      // Fade
      if (fadeOut && p.life > p.maxLife * 0.6) {
        p.opacity = Math.max(0, 1 - (p.life - p.maxLife * 0.6) / (p.maxLife * 0.4));
      }

      // Remove dead particles
      if (p.life > p.maxLife || p.y > height + 20 || p.opacity <= 0) {
        particles.splice(i, 1);
        continue;
      }

      _drawParticle(p);
    }

    onTick?.(particles.length);

    // Check completion
    if (particles.length === 0) {
      if (duration > 0 || !tickerTape) {
        stop();
        onComplete?.();
        return;
      }
      // Ticker tape keeps going — spawn new ones periodically
      if (tickerTape && Math.random() < 0.3) {
        createParticles(1);
      }
    }

    rafId = requestAnimationFrame(_tick);
  }

  function start(): void {
    if (running) return;
    running = true;
    createParticles(count);
    rafId = requestAnimationFrame(_tick);
  }

  function stop(): void {
    running = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // Auto-start
  start();

  // Duration limit
  if (duration > 0) {
    setTimeout(() => { if (running) stop(); onComplete?.(); }, duration);
  }

  // Resize handler
  const resizeHandler = (): void => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resizeHandler);

  return {
    el: canvas,
    burst: (opts?: Partial<ConfettiOptions>) => {
      const burstCount = opts?.count ?? count;
      const oldColors = colors;
      if (opts?.colors) {
        // Temporarily use new colors for this burst
        Object.assign(options, { colors: opts.colors });
      }
      createParticles(burstCount);
      if (!running) start();
    },
    destroy: () => {
      stop();
      window.removeEventListener("resize", resizeHandler);
      canvas.remove();
    },
    isRunning: () => running,
    getParticleCount: () => particles.length,
  };
}
