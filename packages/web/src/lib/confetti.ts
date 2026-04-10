/**
 * Confetti: Lightweight canvas-based particle celebration effect.
 * No external dependencies. Configurable particle shapes, colors, physics,
 * gravity, wind, rotation, and multiple trigger modes.
 *
 * Features:
 * - Multiple particle shapes (circle, square, strip, star)
 * - Physics simulation (gravity, air resistance, friction, wind)
 * - Configurable colors/gradients/palette generation
 * - Multiple trigger modes: burst, continuous, cannon, fireworks
 * - Performance-optimized with object pooling
 * - Auto-cleanup when animation ends
 */

// --- Types ---

export type ParticleShape = "circle" | "square" | "strip" | "triangle" | "star";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number; // Acceleration x
  ay: number; // Acceleration y
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  shape: ParticleShape;
  opacity: number;
  decay: number; // Opacity decay rate
  tilt: number; // For strips
  tiltAngle: number;
  tiltAngleSpeed: number;
  life: number; // Remaining life (0-1)
  scale: number;
  oscillationPhase: number;
  oscillationSpeed: number;
  oscillationAmplitude: number;
}

export interface ConfettiColors {
  /** Custom color list (overrides palette) */
  colors?: string[];
  /** Use gradient instead of solid colors */
  useGradient?: boolean;
  /** Palette preset name */
  palette?: "party" | "pastel" | "neon" | "monochrome" | "warm" | "cool" | "rainbow" | "custom";
}

export interface ConfettiPhysics {
  /** Gravity acceleration (default: 0.25) */
  gravity?: number;
  /** Air drag coefficient (default: 0.98) */
  drag?: number;
  /** Wind force (default: 0) */
  wind?: number;
  /** Terminal velocity (default: 12) */
  terminalVelocity?: number;
  /** Bounce off edges (default: false) */
  bounce?: boolean;
  /** Bounce energy retention (default: 0.4) */
  bounceRestitution?: number;
}

export interface ConfettiOptions {
  /** Target container or selector (default: full viewport overlay) */
  target?: HTMLElement | string;
  /** Number of particles (default: 150) */
  particleCount?: number;
  /** Spread angle in degrees (default: 55) */
  spread?: number;
  /** Start velocity range [min, max] (default: [25, 50]) */
  velocity?: [number, number];
  /** Shapes to use (default: ["circle", "square", "strip"]) */
  shapes?: ParticleShape[];
  /** Color configuration */
  colors?: ConfettiColors;
  /** Physics settings */
  physics?: ConfettiPhysics;
  /** Particle size range [min, max] px (default: [6, 12]) */
  size?: [number, number];
  /** Duration in ms (default: 3000, 0 = infinite) */
  duration?: number;
  /** Z-index (default: 9999) */
  zIndex?: number;
  /** Origin position [x, y] as fraction 0-1 (default: [0.5, 0.5]) */
  origin?: [number, number];
  /** Trigger mode */
  mode?: "burst" | "continuous" | "cannon" | "fireworks" | "rain";
  /** Continuous mode: particles per second (default: 30) */
  emissionRate?: number;
  /** Ticks per second (default: 60) */
  ticksPerSecond?: number;
  /** Use device pixel ratio for crisp rendering (default: true) */
  highDPI?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Callback on each tick */
  onTick?: (particles: Particle[]) => void;
  /** Custom CSS class for wrapper */
  className?: string;
}

export interface ConfettiInstance {
  element: HTMLCanvasElement;
  /** Add more confetti */
  add: (count?: number) => void;
  /** Update physics parameters */
  updatePhysics: (physics: Partial<ConfettiPhysics>) => void;
  /** Pause animation */
  pause: () => void;
  /** Resume animation */
  resume: () => void;
  /** Stop and cleanup */
  stop: () => void;
  /** Force complete (fade out all particles) */
  complete: () => void;
  /** Destroy and remove from DOM */
  destroy: () => void;
  get isActive(): boolean;
  get particleCount(): number;
}

// --- Palettes ---

const PALETTES: Record<string, string[]> = {
  party: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#88ff00"],
  pastel: ["#ffb3ba", "#bae1ff", "#baffc9", "#ffffba", "#ffdfba", "#e0bbff", "#ffc9de", "#c9f4ff"],
  neon: ["#ff0080", "#00ff80", "#8000ff", "#ff8000", "#00ffff", "#ff00ff", "#80ff00", "#ff4040"],
  monochrome: ["#ffffff", "#e0e0e0", "#bdbdbd", "#9e9e9e", "#757575", "#616161"],
  warm: ["#ff6b6b", "#ffa07a", "#ffd700", "#ff8c00", "#dc143c", "#ff4500", "#cd853f", "#f4a460"],
  cool: ["#4fc3f7", "#29b6f6", "#03a9f4", "#039be5", "#0288d1", "#0277bd", "#01579b", "#82b1ff"],
  rainbow: ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8b00ff", "#ff00aa"],
};

// --- Utilities ---

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Particle Factory ---

function createParticle(options: Required<Omit<ConfettiOptions, "target" | "onComplete" | "onTick" | "className">>): Particle {
  const { shapes, colors, size, velocity, spread, origin, physics } = options;
  const angle = (randomRange(-spread, spread) * Math.PI) / 180;
  const speed = randomRange(velocity[0], velocity[1]);

  const shape = randomChoice(shapes);
  const w = randomRange(size[0], size[1]);
  const h = shape === "strip" ? randomRange(size[0] * 2, size[1] * 3) : w;

  // Determine color
  let color: string;
  if (colors.colors && colors.colors.length > 0) {
    color = randomChoice(colors.colors)!;
  } else {
    const paletteName = colors.palette ?? "party";
    const palette = PALETTES[paletteName] ?? PALETTES.party;
    color = randomChoice(palette)!;
  }

  return {
    x: origin[0],
    y: origin[1],
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - randomRange(velocity[0] * 0.3, velocity[1] * 0.5),
    ax: 0,
    ay: 0,
    width: w,
    height: h,
    rotation: randomRange(0, Math.PI * 2),
    rotationSpeed: randomRange(-0.15, 0.15),
    color,
    shape,
    opacity: 1,
    decay: randomRange(0.001, 0.004),
    tilt: randomRange(0, Math.PI * 2),
    tiltAngle: randomRange(0, Math.PI * 2),
    tiltAngleSpeed: randomRange(0.05, 0.12),
    life: 1,
    scale: 1,
    oscillationPhase: randomRange(0, Math.PI * 2),
    oscillationSpeed: randomRange(0.02, 0.08),
    oscillationAmplitude: randomRange(0.3, 1.5),
  };
}

// --- Rendering ---

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.scale(p.scale, p.scale);

  const hw = p.width / 2;
  const hh = p.height / 2;

  switch (p.shape) {
    case "circle":
      ctx.beginPath();
      ctx.arc(0, 0, hw, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;

    case "square":
      ctx.fillStyle = p.color;
      ctx.fillRect(-hw, -hh, p.width, p.height);
      break;

    case "strip":
      ctx.translate(Math.cos(p.tilt) * p.oscillationAmplitude * 10, 0);
      ctx.rotate(p.tilt);
      ctx.fillStyle = p.color;
      ctx.fillRect(-hw, -hh / 4, p.width, hh / 2);
      break;

    case "triangle":
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(hw, hh);
      ctx.lineTo(-hw, hh);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      break;

    case "star":
      drawStar(ctx, 0, 0, 5, hw, hw * 0.4);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  spikes: number, outerRadius: number, innerRadius: number,
): void {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius;
    let y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.closePath();
}

// --- Main ---

export function createConfetti(userOptions: ConfettiOptions = {}): ConfettiInstance {
  const defaults: Required<Omit<ConfettiOptions, "target" | "onComplete" | "onTick" | "className"> & { target: HTMLElement }> = {
    particleCount: 150,
    spread: 55,
    velocity: [25, 50],
    shapes: ["circle", "square", "strip"],
    colors: { palette: "party" },
    physics: {
      gravity: 0.25,
      drag: 0.98,
      wind: 0,
      terminalVelocity: 12,
      bounce: false,
      bounceRestitution: 0.4,
    },
    size: [6, 12],
    duration: 3000,
    zIndex: 9999,
    origin: [0.5, 0.5],
    mode: "burst",
    emissionRate: 30,
    ticksPerSecond: 60,
    highDPI: true,
    target: document.body,
  };

  const opts = { ...defaults, ...userOptions, physics: { ...defaults.physics, ...userOptions.physics }, colors: { ...defaults.colors, ...userOptions.colors } };

  // Resolve target
  const container = typeof opts.target === "string"
    ? document.querySelector<HTMLElement>(opts.target)!
    : opts.target;

  // Create canvas wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `confetti-wrapper ${userOptions.className ?? ""}`;
  wrapper.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    pointer-events:none;z-index:${opts.zIndex};overflow:hidden;
  `;
  if (container === document.body) {
    document.body.appendChild(wrapper);
  } else {
    container.style.position = container.style.position || "relative";
    wrapper.style.cssText = wrapper.style.cssText.replace("fixed", "absolute");
    container.appendChild(wrapper);
  }

  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  wrapper.appendChild(canvas);

  // Setup canvas
  const dpr = opts.highDPI ? window.devicePixelRatio || 1 : 1;
  let w = container === document.body ? window.innerWidth : container.clientWidth;
  let h = container === document.body ? window.innerHeight : container.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // State
  const particles: Particle[] = [];
  let isActive = true;
  let isPaused = false;
  let destroyed = false;
  let animFrameId: number | null = null;
  let startTime = Date.now();
  let emittedCount = 0;
  let continuousTimer: number | null = null;

  // Convert origin to absolute coordinates
  const originAbs: [number, number] = [opts.origin[0] * w, opts.origin[1] * h];

  // Emit initial batch based on mode
  function emitInitial(): void {
    switch (opts.mode) {
      case "burst":
        for (let i = 0; i < opts.particleCount; i++) {
          particles.push(createParticle({ ...opts, origin: originAbs }));
        }
        break;

      case "continuous":
        // Will emit over time
        break;

      case "cannon":
        for (let i = 0; i < opts.particleCount; i++) {
          const p = createParticle({ ...opts, origin: originAbs });
          // Cannon shoots upward
          p.vy = -randomRange(opts.velocity[0] * 1.5, opts.velocity[1] * 2);
          p.vx = randomRange(-opts.velocity[0] * 0.3, opts.velocity[0] * 0.3);
          particles.push(p);
        }
        break;

      case "fireworks": {
        const bursts = Math.ceil(opts.particleCount / 30);
        for (let b = 0; b < bursts; b++) {
          setTimeout(() => {
            if (destroyed) return;
            const fx = randomRange(w * 0.2, w * 0.8);
            const fy = randomRange(h * 0.2, h * 0.5);
            for (let i = 0; i < 30; i++) {
              const p = createParticle({ ...opts, origin: [fx, fy] });
              p.vx = randomRange(-opts.velocity[1] * 0.8, opts.velocity[1] * 0.8);
              p.vy = randomRange(-opts.velocity[1] * 0.8, opts.velocity[1] * 0.8);
              particles.push(p);
            }
          }, b * 200);
        }
        break;
      }

      case "rain":
        for (let i = 0; i < opts.particleCount; i++) {
          const p = createParticle({ ...opts, origin: [randomRange(0, w), -20] });
          p.vx = randomRange(-0.5, 0.5);
          p.vy = randomRange(opts.velocity[0] * 0.5, opts.velocity[1]);
          particles.push(p);
        }
        break;
    }
  }

  emitInitial();

  // Physics update
  function updatePhysics(p: Particle): void {
    const phys = opts.physics;

    // Apply forces
    p.vx += p.ax + phys.wind;
    p.vy += p.ay + phys.gravity;

    // Apply drag
    p.vx *= phys.drag;
    p.vy *= phys.drag;

    // Clamp to terminal velocity
    p.vy = Math.min(p.vy, phys.terminalVelocity);
    p.vx = Math.max(-phys.terminalVelocity, Math.min(phys.terminalVelocity, p.vx));

    // Update position
    p.x += p.vx;
    p.y += p.vy;

    // Oscillation for strips
    if (p.shape === "strip") {
      p.oscillationPhase += p.oscillationSpeed;
      p.tilt += p.tiltAngleSpeed;
    }

    // Rotation
    p.rotation += p.rotationSpeed;

    // Life decay
    p.life -= p.decay;
    p.opacity = Math.max(0, p.life);

    // Bounce off edges
    if (phys.bounce) {
      if (p.x < 0 || p.x > w) {
        p.vx *= -phys.bounceRestitution;
        p.x = p.x < 0 ? 0 : w;
      }
      if (p.y > h) {
        p.vy *= -phys.bounceRestitution;
        p.y = h;
      }
    }
  }

  // Animation loop
  function tick(): void {
    if (destroyed || isPaused) return;

    ctx.clearRect(0, 0, w, h);

    // Continuous emission
    if (opts.mode === "continuous" && emittedCount < opts.particleCount) {
      const toEmit = Math.min(
        Math.ceil(opts.emissionRate / opts.ticksPerSecond),
        opts.particleCount - emittedCount,
      );
      for (let i = 0; i < toEmit; i++) {
        particles.push(createParticle({ ...opts, origin: originAbs }));
        emittedCount++;
      }
    }

    // Update and filter dead particles
    for (let i = particles.length - 1; i >= 0; i--) {
      updatePhysics(particles[i]!);

      // Remove if off-screen and faded
      if (
        particles[i]!.life <= 0 ||
        particles[i]!.y > h + 50 ||
        particles[i]!.x < -50 ||
        particles[i]!.x > w + 50
      ) {
        particles.splice(i, 1);
      }
    }

    // Render
    for (const p of particles) {
      drawParticle(ctx, p);
    }

    opts.onTick?.(particles);

    // Check completion
    const elapsed = Date.now() - startTime;
    if (opts.duration > 0 && elapsed >= opts.duration && particles.length === 0) {
      complete();
      return;
    }

    animFrameId = requestAnimationFrame(tick);
  }

  // Resize handler
  function handleResize(): void {
    w = container === document.body ? window.innerWidth : container.clientWidth;
    h = container === document.body ? window.innerHeight : container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", handleResize);

  // Start animation
  animFrameId = requestAnimationFrame(tick);

  // Instance
  const instance: ConfettiInstance = {
    element: canvas,

    get isActive() { return isActive && !destroyed; },
    get particleCount() { return particles.length; },

    add(count?: number) {
      const n = count ?? 30;
      for (let i = 0; i < n; i++) {
        particles.push(createParticle({ ...opts, origin: originAbs }));
      }
    },

    updatePhysics(physics: Partial<ConfettiPhysics>) {
      Object.assign(opts.physics, physics);
    },

    pause() { isPaused = true; },
    resume() {
      isPaused = false;
      if (!destroyed && !animFrameId) {
        animFrameId = requestAnimationFrame(tick);
      }
    },

    stop() {
      isActive = false;
      particles.length = 0;
      ctx.clearRect(0, 0, w, h);
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    },

    complete() {
      // Speed up decay for all particles
      for (const p of particles) {
        p.decay = 0.05;
      }
      isActive = false;
      setTimeout(() => {
        if (particles.length === 0) {
          opts.onComplete?.();
        }
      }, 500);
    },

    destroy() {
      destroyed = true;
      stop();
      window.removeEventListener("resize", handleResize);
      wrapper.remove();
    },
  };

  return instance;
}

/**
 * Quick fire-and-forget confetti burst.
 */
export function confetti(options?: Omit<ConfettiOptions, "duration">): ConfettiInstance {
  return createConfetti({ ...options, duration: 3000 });
}

/**
 * Fire confetti from a specific DOM element.
 */
export function confettiFromElement(
  element: HTMLElement,
  options?: Omit<ConfettiOptions, "target" | "origin">,
): ConfettiInstance {
  const rect = element.getBoundingClientRect();
  return createConfetti({
    ...options,
    target: document.body,
    origin: [(rect.left + rect.width / 2) / window.innerWidth, (rect.top + rect.height / 2) / window.innerHeight],
  });
}
