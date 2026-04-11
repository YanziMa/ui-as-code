/**
 * Fireworks: Canvas-based fireworks particle system with multiple burst types,
 * gravity, wind, trails, colors, auto-launch, and performance optimization.
 */

// --- Types ---

export type FireworkType = "standard" | "ring" | "willow" | "chrysanthemum" | "palm" | "crossette" | "peony";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  trail: boolean;
  decay: number;
  gravity: number;
  hue?: number;
}

export interface BurstConfig {
  x: number;
  y: number;
  type?: FireworkType;
  particleCount?: number;
  speed?: number;
  spread?: number;
  size?: number;
  colors?: string[];
  lifetime?: number;
  trail?: boolean;
  gravity?: number;
  wind?: number;
  fadeOut?: boolean;
  sparkle?: boolean;
  sparkleCount?: number;
}

export interface FireworksOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Canvas width (px) */
  width?: number;
  /** Canvas height (px) */
  height?: number;
  /** Background color (transparent for overlay) */
  background?: string;
  /** Auto-launch interval (ms), 0 = manual only */
  autoLaunchInterval?: number;
  /** Max simultaneous bursts */
  maxBursts?: number;
  /** Gravity strength */
  gravity?: number;
  ** Wind effect (-1 to 1) */
  wind?: number;
  /** Trail length (particles) */
  trailLength?: number;
  /** Fade out particles over time? */
  fadeOut?: boolean;
  /** Sparkle effect on explosion? */
  sparkle?: boolean;
  /** Sound enabled? (placeholder) */
  sound?: boolean;
  /** Quality preset ("low" | "medium" | "high") */
  quality?: string;
  /** Custom CSS class */
  className?: string;
}

export interface FireworksInstance {
  element: HTMLCanvasElement;
  /** Launch a single firework at position */
  launch: (config?: Partial<BurstConfig>) => void;
  /** Launch multiple in sequence */
  launchSequence: (configs: Partial<BurstConfig>[], delay?: number) => void;
  /** Start auto-launch loop */
  startAuto: (intervalMs?: number) => void;
  /** Stop auto-launch */
  stopAuto: () => void;
  /** Clear canvas */
  clear: () => void;
  /** Pause/resume animation */
  pause: () => void;
  resume: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Color Palettes ---

const PALETTES: Record<string, string[]> = {
  gold:     ["#ffd700", "#ffec8b", "#ffb347", "#ffa500"],
  red:      ["#ff4444", "#ff6666", "#ff8888", "#ffaaaa"],
  blue:     ["#4444ff", "#6666ff", "#8888ff", "#aaaaff"],
  green:    ["#44ff44", "#66ff66", "#88ff88", "#aaffaa"],
  purple:   ["#bb44ff", "#cc66ff", "#dd88ff", "#eeaaff"],
  rainbow:  ["#ff4444", "#ff8844", "#ffff44", "#88ff44", "#44ff88", "#4488ff", "#8844ff", "#ff44ff"],
  silver:   ["#e5e7eb", "#d1d5db", "#f3f4f6", "#ffffff"],
  warm:     ["#ff6b35", "#f59e0b", "#facc15", "#fef3c7"],
};

// --- Burst Type Generators ---

function generateBurst(config: BurstConfig): Particle[] {
  const {
    x, y, type = "standard", particleCount = 80, speed = 5,
    spread = Math.PI * 0.6, size = 3, colors = PALETTES.gold,
    lifetime = 100, trail = false, gravity = 0.08, wind = 0,
    fadeOut = true, sparkle = false, sparkleCount = 12, decay = 0.97,
  } = config;

  const particles: Particle[] = [];

  switch (type) {
    case "ring": {
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.2;
        const spd = speed * (0.7 + Math.random() * 0.6);
        particles.push({
          x, y,
          vx: Math.cos(angle) * spd + wind * 0.3,
          vy: Math.sin(angle) * spd * 0.6,
          life: lifetime * (0.8 + Math.random() * 0.4),
          maxLife: lifetime,
          size: size * (0.6 + Math.random() * 0.8),
          color: colors[i % colors.length],
          alpha: 1, trail: false, decay: 0.98, gravity: gravity * 0.3,
        });
      }
      break;
    }

    case "willow": {
      for (let i = 0; i < particleCount; i++) {
        const angle = -Math.PI * 0.1 + Math.random() * Math.PI * 0.2;
        const spd = speed * (0.5 + Math.random() * 0.5);
        particles.push({
          x, y,
          vx: Math.cos(angle) * spd * (0.3 + Math.random()),
          vy: -Math.abs(Math.sin(angle)) * spd * (0.5 + Math.random() * 0.5),
          life: lifetime * (0.7 + Math.random() * 0.5),
          maxLife: lifetime,
          size: size * (1 + Math.random() * 1.5),
          color: colors[i % colors.length],
          alpha: 1, trail: true, decay: 0.96, gravity: gravity * 0.15,
        });
      }
      break;
    }

    case "chrysanthemum": {
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const ring = Math.floor(i / (particleCount / 4));
        const spd = speed * (1.2 - ring * 0.2) * (0.8 + Math.random() * 0.4);
        particles.push({
          x, y,
          vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 0.5,
          vy: Math.sin(angle) * spd + (Math.random() - 0.5) * 0.5,
          life: lifetime * (0.6 + Math.random() * 0.6),
          maxLife: lifetime,
          size: size * (1.5 - ring * 0.25) * (0.7 + Math.random() * 0.6),
          color: colors[ring % colors.length],
          alpha: 1, trail: ring % 2 === 0, decay: 0.97, gravity: gravity * 0.5,
        });
      }
      break;
    }

    case "palm": {
      for (let i = 0; i < particleCount; i++) {
        const angle = -Math.PI * 0.5 + Math.random() * Math.PI;
        const spd = speed * (0.4 + Math.random() * 0.8);
        particles.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - speed * 0.3,
          life: lifetime * (0.8 + Math.random() * 0.4),
          maxLife: lifetime,
          size: size * (0.8 + Math.random() * 1.2),
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1, trail: false, decay: 0.98, gravity: gravity * 0.6,
        });
      }
      break;
    }

    case "crossette": {
      for (let i = 0; i < particleCount; i++) {
        const arm = i % 4;
        const angle = (arm * Math.PI * 0.5) + (Math.random() - 0.5) * 0.4;
        const spd = speed * (0.8 + Math.random() * 0.6);
        particles.push({
          x, y,
          vx: Math.cos(angle) * spd * (1.5 + Math.random() * 0.5),
          vy: Math.sin(angle) * spd * (0.5 + Math.random() * 0.5),
          life: lifetime * (0.7 + Math.random() * 0.5),
          maxLife: lifetime,
          size: size * (0.8 + Math.random() * 1),
          color: colors[arm],
          alpha: 1, trail: false, decay: 0.97, gravity: gravity * 0.4,
        });
      }
      break;
    }

    case "peony": {
      for (let i = 0; i < particleCount; i++) {
        const layer = Math.floor(i / (particleCount * 0.5));
        const angle = Math.random() * Math.PI * 2;
        const spd = speed * (1.5 - layer * 0.5) * (0.6 + Math.random() * 0.8);
        particles.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - layer * speed * 0.3,
          life: lifetime * (0.5 + Math.random() * 0.8),
          maxLife: lifetime,
          size: size * (2 - layer * 0.7) * (0.5 + Math.random()),
          color: colors[layer % colors.length],
          alpha: 1, trail: layer > 0, decay: 0.95, gravity: gravity * 0.5,
        });
      }
      break;
    }

    default: /* standard */ {
      for (let i = 0; i < particleCount; i++) {
        const angle = -spread / 2 + (spread * i) / (particleCount - 1 || 1) + (Math.random() - 0.5) * spread * 0.2;
        const spd = speed * (0.6 + Math.random() * 0.8);
        particles.push({
          x, y,
          vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 0.8,
          vy: Math.sin(angle) * spd + (Math.random() - 0.5) * 0.8 - speed * 0.3,
          life: lifetime * (0.7 + Math.random() * 0.5),
          maxLife: lifetime,
          size: size * (0.7 + Math.random() * 1.1),
          color: colors[i % colors.length],
          alpha: 1, trail: Math.random() > 0.7, decay: 0.97, gravity: gravity,
        });
      }
      break;
  }

  return particles;
}

// --- Main Factory ---

export function createFireworks(options: FireworksOptions): FireworksInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 400,
    background: options.background ?? "transparent",
    autoLaunchInterval: options.autoLaunchInterval ?? 0,
    maxBursts: options.maxBursts ?? 8,
    gravity: options.gravity ?? 0.06,
    wind: options.wind ?? 0.01,
    trailLength: options.trailLength ?? 6,
    fadeOut: options.fadeOut ?? true,
    sparkle: options.sparkle ?? true,
    quality: options.quality ?? "medium",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Fireworks: container not found");

  let destroyed = false;
  let paused = false;
  let autoTimer: ReturnType<typeof setInterval> | null = null;
  let activeBursts = 0;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.className = `fireworks ${opts.className}`;
  canvas.width = opts.width;
  canvas.height = opts.height;
  canvas.style.cssText = `display:block;width:${opts.width}px;height:${opts.height}px;background:${opts.background};`;
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;

  // Particle pool
  let allParticles: Particle[] = [];
  const MAX_PARTICLES = opts.quality === "high" ? 5000 : opts.quality === "medium" ? 2000 : 800;

  // Sparkle pool
  let sparkles: { x: number; y: number; life: number; size: number; color: string }[] = [];

  // --- Animation Loop ---

  function update(): void {
    if (destroyed || paused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    for (let i = allParticles.length - 1; i >= 0; i--) {
      const p = allParticles[i]!;

      // Physics
      p.vx += opts.wind;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (opts.fadeOut) p.alpha = Math.max(0, p.life / p.maxLife);
      p.size *= p.decay;

      // Draw
      if (p.trail && p.life > p.maxLife * 0.3) {
        ctx.globalAlpha = p.alpha * 0.3;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();

      // Remove dead particles
      if (p.life <= 0 || p.size < 0.3 || p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
        allParticles.splice(i, 1);
      }
    }

    // Draw sparkles
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i]!;
      s.life--;
      s.size *= 0.92;
      ctx.globalAlpha = Math.max(0, s.life / 20);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.3, s.size), 0, Math.PI * 2);
      ctx.fill();
      if (s.life <= 0) sparkles.splice(i, 1);
    }

    requestAnimationFrame(update);
  }

  // Start animation
  update();

  // --- Public API ---

  function launch(config?: Partial<BurstConfig>): void {
    if (activeBursts >= opts.maxBursts) return;
    activeBursts++;

    const cfg: BurstConfig = {
      x: config?.x ?? opts.width * (0.2 + Math.random() * 0.6),
      y: config?.y ?? opts.height * (0.2 + Math.random() * 0.4),
      ...config,
    };

    const newParticles = generateBurst(cfg);

    // Limit total particles
    const available = MAX_PARTICLES - allParticles.length;
    const toAdd = newParticles.slice(0, available);
    allParticles.push(...toAdd);

    // Add sparkles
    if (opts.sparkle) {
      for (let i = 0; i < (cfg.sparkleCount ?? 12); i++) {
        sparkles.push({
          x: cfg.x + (Math.random() - 0.5) * 30,
          y: cfg.y + (Math.random() - 0.5) * 30,
          life: 15 + Math.random() * 10,
          size: 1 + Math.random() * 2,
          color: cfg.colors?.[0] ?? PALETTES.gold[0],
        });
      }
    }

    setTimeout(() => { activeBursts = Math.max(0, activeBursts - 1); }, 3000);
  }

  function launchSequence(configs: Partial<BurstConfig>[], delay = 200): void {
    configs.forEach((cfg, i) => {
      setTimeout(() => launch(cfg), delay * i);
    });
  }

  function startAuto(intervalMs?: number): void {
    stopAuto();
    const interval = intervalMs ?? opts.autoLaunchInterval;
    if (interval > 0) {
      autoTimer = setInterval(() => launch(), interval);
    }
  }

  function stopAuto(): void {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  const instance: FireworksInstance = {
    element: canvas,
    launch,
    launchSequence,
    startAuto,
    stopAuto,
    clear: () => { allParticles = []; sparkles = []; },
    pause: () => { paused = true; },
    resume: () => { paused = false; update(); },
    destroy: () => {
      destroyed = true;
      stopAuto();
      canvas.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
