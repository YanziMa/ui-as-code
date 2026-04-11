/**
 * Physics Utilities: 2D physics engine primitives, rigid body simulation,
 * collision detection and response, forces (gravity, friction, restitution),
 * velocity/acceleration integration, spatial partitioning for broad phase,
 * constraint solving, and simple particle systems.
 */

// --- Types ---

export interface Vector2 {
  x: number;
  y: number;
}

export interface BodyState {
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  mass: number;
  inverseMass: number; // 0 = infinite mass (static)
  restitution: number; // bounciness (0-1)
  friction: number;     // damping (0-1)
  isStatic: boolean;
  angle: number;       // rotation in radians
  angularVelocity: number;
}

export interface Force {
  apply(body: BodyState, dt: number): Vector2;
}

export interface CollisionPair {
  bodyA: BodyState;
  bodyB: BodyState;
  normal: Vector2;
  penetration: number;
  contactPoint: Vector2;
}

export interface PhysicsWorldOptions {
  /** Gravity vector. Default { x: 0, y: 980 } (pixels/s^2 ~ 10m/s^2 at 98px/m) */
  gravity?: Vector2;
  /** Substep count per frame for stability. Default 8 */
  substeps?: number;
  /** Velocity iterations for constraint solver. Default 10 */
  velocityIterations?: number;
  /** Position iterations for constraint solver. Default 10 */
  positionIterations?: number;
  /** Enable sleeping for stationary bodies */
  enableSleeping?: boolean;
  /** Sleep threshold velocity */
  sleepThreshold?: number;
}

// --- Vector2 Operations ---

export const Vec2 = {
  create(x = 0, y = 0): Vector2 => ({ x, y }),
  zero(): Vector2 => ({ x: 0, y: 0 }),
  one(): Vector2 => ({ x: 1, y: 1 }),

  add(a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub(a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mul(v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s }),
  div(v: Vector2, s: number): Vector2 => ({ x: v.x / s, y: v.y / s }),

  dot(a: Vector2, b: Vector2): number { return a.x * b.x + a.y * b.y; },
  cross(a: Vector2, b: Vector2): number { return a.x * b.y - a.y * b.x; },

  length(v: Vector2): number { return Math.sqrt(v.x * v.x + v.y * v.y); },
  lengthSq(v: Vector2): number { return v.x * v.x + v.y * v.y; },

  normalize(v: Vector2): Vector2 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },

  distance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  distanceSq(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  },

  lerp(a: Vector2, b: Vector2, t: number): Vector2 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),

  rotate(v: Vector2, angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
  },

  perpendicular(v: Vector2): Vector2 { return { x: -v.y, y: v.x }; },

  negate(v: Vector2): Vector2 { return { x: -v.x, y: -v.y }; },

  reflect(v: Vector2, normal: Vector2): Vector2 {
    const d = Vec2.dot(v, normal);
    return Vec2.sub(v, Vec2.mul(normal, 2 * d));
  },

  clamp(v: Vector2, min: Vector2, max: Vector2): Vector2 ({
    x: Math.max(min.x, Math.min(max.x, v.x)),
    y: Math.max(min.y, Math.min(max.y, v.y)),
  }),

  angle(v: Vector2): number { return Math.atan2(v.y, v.x); },

  fromAngle(angle: number): Vector2 ({ x: Math.cos(angle), y: Math.sin(angle) }),

  scaleAndAdd(out: Vector2, v: Vector2, scale: number): Vector2 {
    out.x += v.x * scale;
    out.y += v.y * scale;
    return out;
  },
};

// --- Rigid Body Factory ---

/** Create a dynamic body with default physics properties */
export function createBody(options: Partial<BodyState> = {}): BodyState {
  const mass = options.mass ?? 1;
  return {
    position: options.position ?? Vec2.create(0, 0),
    velocity: options.velocity ?? Vec2.zero(),
    acceleration: options.acceleration ?? Vec2.zero(),
    mass,
    inverseMass: mass === 0 ? 0 : 1 / mass,
    restitution: options.restitution ?? 0.5,
    friction: options.friction ?? 0.1,
    isStatic: options.isStatic ?? false,
    angle: options.angle ?? 0,
    angularVelocity: options.angularVelocity ?? 0,
  };
}

/** Create a static/infinite-mass body (walls, ground, etc.) */
export function createStaticBody(position: Vector2): BodyState {
  return createBody({ position, isStatic: true, mass: 0 });
}

// --- Forces ---

/** Constant gravity force */
export function gravityForce(gravity: Vector2 = Vec2.create(0, 980)): Force {
  return {
    apply(_body: BodyState, _dt: number): Vector2 {
      return Vec2.mul(gravity, 1); // F = mg, but we store g and multiply by mass in integrator
    },
  };
}

/** Wind force (constant horizontal push) */
export function windForce(strength: Vector2): Force {
  return {
    apply(body: BodyState, _dt: number): Vector2 {
      return Vec2.mul(strength, body.inverseMass > 0 ? body.mass : 1);
    },
  };
}

/** Drag force proportional to velocity squared */
export function dragForce(coefficient = 0.01): Force {
  return {
    apply(body: BodyState, _dt: number): Vector2 {
      const speed = Vec2.length(body.velocity);
      if (speed < 0.001) return Vec2.zero();
      const dragMag = coefficient * speed * speed;
      return Vec2.mul(Vec2.normalize(body.velocity), -dragMag);
    },
  };
}

/** Spring force towards a target point */
export function springForce(
  target: Vector2,
  restLength = 0,
  stiffness = 100,
  damping = 5,
): Force {
  let prevForce = Vec2.zero();
  return {
    apply(body: BodyState, dt: number): Vector2 {
      const delta = Vec2.sub(target, body.position);
      const dist = Vec2.length(delta);
      const direction = dist > 0.001 ? Vec2.div(delta, dist) : Vec2.zero();

      // Hooke's law: F = -k(x - L)
      const springMag = stiffness * (dist - restLength);
      const springForce = Vec2.mul(direction, springMag);

      // Damping: F = -c*v
      const relVel = Vec2.dot(body.velocity, direction);
      const dampingForce = Vec2.mul(direction, -damping * relVel);

      prevForce = Vec2.add(springForce, dampingForce);
      return Vec2.mul(prevForce, body.inverseMass > 0 ? body.mass : 1);
    },
  };
}

// --- Integration ---

/** Semi-implicit Euler integration (stable for springs) */
export function integrateSemiImplicitEuler(
  body: BodyState,
  force: Vector2,
  dt: number,
): void {
  if (body.isStatic) return;

  // Apply force: a = F/m
  const acc = Vec2.mul(force, body.inverseMass);

  // Update velocity: v += a * dt
  body.velocity = Vec2.add(body.velocity, Vec2.mul(acc, dt));

  // Apply damping
  body.velocity = Vec2.mul(body.velocity, 1 - body.friction);

  // Update position: x += v * dt
  body.position = Vec2.add(body.position, Vec2.mul(body.velocity, dt));

  // Angular
  body.angle += body.angularVelocity * dt;
  body.angularVelocity *= (1 - body.friction);
}

/** Verlet integration (better energy conservation) */
export function integrateVerlet(
  positions: Map<string, Vector2>,
  oldPositions: Map<string, Vector2>,
  accelerations: Map<string, Vector2>,
  damping: number,
  dt: number,
): void {
  for (const [id, pos] of positions) {
    const oldPos = oldPositions.get(id)!;
    const acc = accelerations.get(id) ?? Vec2.zero();

    const temp = { ...pos };

    // Verlet: x_new = 2*x - x_old + a*dt^2
    pos.x = 2 * pos.x - oldPos.x + acc.x * dt * dt;
    pos.y = 2 * pos.y - oldPos.y + acc.y * dt * dt;

    // Damping
    pos.x = pos.x + (pos.x - temp.x) * damping;
    pos.y = pos.y + (pos.y - temp.y) * damping;

    oldPositions.set(id, temp);
  }
}

// --- Collision Detection ---

/** Circle vs circle collision detection */
export function detectCircleCircle(
  a: BodyState & { radius: number },
  b: BodyState & { radius: number },
): CollisionPair | null {
  const delta = Vec2.sub(b.position, a.position);
  const dist = Vec2.length(delta);
  const overlap = (a.radius + b.radius) - dist;

  if (overlap <= 0) return null;

  const normal = dist > 0.001 ? Vec2.div(delta, dist) : Vec2.create(1, 0);
  const contactPoint = Vec2.add(
    a.position,
    Vec2.mul(normal, a.radius),
  );

  return { bodyA: a, bodyB: b, normal, penetration: overlap, contactPoint };
}

/** AABB vs AABB collision detection */
export function detectAABB(
  a: BodyState & { halfWidth: number; halfHeight: number },
  b: BodyState & { halfWidth: number; halfHeight: number },
): CollisionPair | null {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const combinedHalfX = a.halfWidth + b.halfWidth;
  const combinedHalfY = a.halfHeight + b.halfHeight;

  const penX = combinedHalfX - Math.abs(dx);
  const penY = combinedHalfY - Math.abs(dy);

  if (penX <= 0 || penY <= 0) return null;

  let normal: Vector2;
  let penetration: number;

  if (penX < penY) {
    normal = dx > 0 ? Vec2.create(1, 0) : Vec2.create(-1, 0);
    penetration = penX;
  } else {
    normal = dy > 0 ? Vec2.create(0, 1) : Vec2.create(0, -1);
    penetration = penY;
  }

  const contactPoint = Vec2.add(a.position, Vec2.mul(normal, Math.min(penX, penY)));

  return { bodyA: a, bodyB: b, normal, penetration, contactPoint };
}

/** Point vs plane collision */
export function detectPointPlane(
  point: Vector2,
  planeNormal: Vector2,
  planeDistance: number,
): number | null {
  const signedDist = Vec2.dot(point, planeNormal) - planeDistance;
  return signedDist < 0 ? -signedDist : null;
}

// --- Collision Response ---

/** Resolve collision between two bodies using impulse-based response */
export function resolveCollision(collision: CollisionPair): void {
  const { bodyA, bodyB, normal, penetration } = collision;

  // Separate bodies (positional correction)
  const totalInverseMass = bodyA.inverseMass + bodyB.inverseMass;
  if (totalInverseMass === 0) return;

  const correction = Vec2.mul(normal, penetration / totalInverseMass);
  if (!bodyA.isStatic) bodyA.position = Vec2.sub(bodyA.position, Vec2(correction, bodyA.inverseMass));
  if (!bodyB.isStatic) bodyB.position = Vec2.sub(bodyB.position, Vec2(correction, bodyB.inverseMass));

  // Relative velocity
  const relVel = Vec2.sub(
    bodyB.isStatic ? Vec2.zero() : bodyB.velocity,
    bodyA.isStatic ? Vec2.zero() : bodyA.velocity,
  );

  const velAlongNormal = Vec2.dot(relVel, normal);

  // Don't resolve if bodies are separating
  if (velAlongNormal > 0) return;

  // Restitution (bounciness)
  const e = Math.min(bodyA.restitution, bodyB.restitution);

  // Impulse magnitude
  const j = -(1 + e) * velAlongNormal / totalInverseMass;

  const impulse = Vec2.mul(normal, j);
  if (!bodyA.isStatic) bodyA.velocity = Vec2.sub(bodyA.velocity, Vec2(impulse, bodyA.inverseMass));
  if (!bodyB.isStatic) bodyB.velocity = Vec2.add(bodyB.velocity, Vec2(impulse, bodyB.inverseMass));

  // Friction impulse (tangent)
  const tangent = Vec2.normalize(Vec2.sub(relVel, Vec2.mul(normal, velAlongNormal)));
  const velAlongTangent = Vec2.dot(relVel, tangent);
  const frictionImpulseMag = -velAlongTangent / totalInverseMass *
    Math.min(bodyA.friction, bodyB.friction);

  const frictionImpulse = Vec2.mul(tangent, frictionImpulseMag);
  if (!bodyA.isStatic) bodyA.velocity = Vec2.sub(bodyA.velocity, Vec2(frictionImpulse, bodyA.inverseMass));
  if (!bodyB.isStatic) bodyB.velocity = Vec2.add(bodyB.velocity, Vec2(frictionImpulse, bodyB.inverseMass));
}

// --- Physics World ---

/**
 * Simple 2D physics world with multiple bodies, forces, and collision resolution.
 */
export class PhysicsWorld {
  bodies: BodyState[] = [];
  forces: Force[] = [];
  private config: Required<PhysicsWorldOptions>;
  private running = false;
  private rafId: number | null = null;
  private lastTime = 0;

  constructor(options: PhysicsWorldOptions = {}) {
    this.config = {
      gravity: options.gravity ?? Vec2.create(0, 980),
      substeps: options.substeps ?? 8,
      velocityIterations: options.velocityIterations ?? 10,
      positionIterations: options.positionIterations ?? 10,
      enableSleeping: options.enableSleeping ?? false,
      sleepThreshold: options.sleepThreshold ?? 0.05,
    };
  }

  /** Add a body to the world */
  addBody(body: BodyState): void {
    this.bodies.push(body);
  }

  /** Remove a body from the world */
  removeBody(body: BodyState): void {
    const idx = this.bodies.indexOf(body);
    if (idx >= 0) this.bodies.splice(idx, 1);
  }

  /** Add a global force */
  addForce(force: Force): void {
    this.forces.push(force);
  }

  /** Remove a force */
  removeForce(force: Force): void {
    const idx = this.forces.indexOf(force);
    if (idx >= 0) this.forces.splice(idx, 1);
  }

  /** Step the simulation forward by dt seconds */
  step(dt: number): void {
    const subDt = dt / this.config.substeps;

    for (let sub = 0; sub < this.config.substeps; sub++) {
      // Integrate forces
      for (const body of this.bodies) {
        if (body.isStatic) continue;

        let totalForce = Vec2.mul(this.config.gravity, body.mass);

        for (const force of this.forces) {
          const f = force.apply(body, subDt);
          totalForce = Vec2.add(totalForce, f);
        }

        integrateSemiImplicitEuler(body, totalForce, subDt);
      }

      // Detect and resolve collisions
      for (let i = 0; i < this.bodies.length; i++) {
        for (let j = i + 1; j < this.bodies.length; j++) {
          const a = this.bodies[i]!;
          const b = this.bodies[j]!;

          // Skip static-static pairs
          if (a.isStatic && b.isStatic) continue;

          // Try circle-circle if both have radius
          if ("radius" in a && "radius" in b) {
            const col = detectCircleCircle(a as BodyState & { radius: number }, b as BodyState & { radius: number });
            if (col) resolveCollision(col);
          }
        }
      }
    }
  }

  /** Start the simulation loop */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();

    const loop = () => {
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05); // Cap at 50ms
      this.lastTime = now;
      this.step(dt);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  /** Stop the simulation loop */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Get all non-static bodies */
  getDynamicBodies(): BodyState[] {
    return this.bodies.filter((b) => !b.isStatic);
  }

  /** Clear everything */
  clear(): void {
    this.stop();
    this.bodies = [];
    this.forces = [];
  }
}

// --- Particle System ---

interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  life: number;       // remaining life in seconds
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface ParticleEmitterConfig {
  /** Position of emitter */
  position: Vector2;
  /** Emission rate (particles per second) */
  rate: number;
  /** Initial speed range */
  speedRange: [number, number];
  /** Angle spread in radians (0 = all directions) */
  spread?: number;
  /** Direction bias in radians */
  direction?: number;
  /** Particle lifetime range (seconds) */
  lifeRange: [number, number];
  /** Size range */
  sizeRange: [number, number];
  /** Color(s) */
  colors: string[];
  /** Gravity applied to particles */
  gravity?: Vector2;
  /** Drag/damping */
  drag?: number;
  /** Max particles alive at once */
  maxParticles?: number;
  /** On emit callback */
  onEmit?: (particle: Particle) => void;
  /** Container element for rendering */
  container?: HTMLElement;
}

/**
 * Simple particle emitter system.
 */
export class ParticleEmitter {
  private particles: Particle[] = [];
  private config: Required<ParticleEmitterConfig>;
  private accumulator = 0;
  private rafId: number | null = null;
  private running = false;
  private nextId = 0;

  constructor(config: ParticleEmitterConfig) {
    this.config = {
      ...config,
      spread: config.spread ?? Math.PI * 2,
      direction: config.direction ?? -Math.PI / 2,
      lifeRange: config.lifeRange ?? [1, 3],
      sizeRange: config.sizeRange ?? [2, 6],
      colors: config.colors ?? ["#ffffff"],
      gravity: config.gravity ?? Vec2.create(0, 200),
      drag: config.drag ?? 0.02,
      maxParticles: config.maxParticles ?? 500,
    };
  }

  /** Emit one burst of particles */
  emit(count = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.config.maxParticles) break;

      const angle = this.config.direction +
        (Math.random() - 0.5) * this.config.spread;
      const speed = this.config.speedRange[0] +
        Math.random() * (this.config.speedRange[1] - this.config.speedRange[0]);

      const particle: Particle = {
        id: `p_${this.nextId++}`,
        position: { ...this.config.position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        life: this.config.lifeRange[0] + Math.random() * (this.config.lifeRange[1] - this.config.lifeRange[0]),
        maxLife: particle.life,
        size: this.config.sizeRange[0] + Math.random() * (this.config.sizeRange[1] - this.config.sizeRange[0]),
        color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)] ?? this.config.colors[0],
        alpha: 1,
      };

      this.particles.push(particle);
      this.config.onEmit?.(particle);
    }
  }

  /** Start continuous emission */
  start(): void {
    if (this.running) return;
    this.running = true;

    const loop = () => {
      if (!this.running) return;

      // Accumulate emission time
      const dt = 1 / 60; // Assume 60fps
      this.accumulator += this.config.rate * dt;

      while (this.accumulator >= 1) {
        this.emit(1);
        this.accumulator -= 1;
      }

      // Update particles
      this.update(dt);

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  /** Stop emission (particles continue simulating until dead) */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Update particle physics */
  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;

      // Apply gravity
      p.velocity.x += this.config.gravity.x * dt;
      p.velocity.y += this.config.gravity.y * dt;

      // Apply drag
      p.velocity.x *= (1 - this.config.drag);
      p.velocity.y *= (1 - this.config.drag);

      // Integrate
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;

      // Age
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /** Get current particles (for rendering) */
  getParticles(): Particle[] { return [...this.particles]; }

  /** Clear all particles */
  clear(): void { this.particles = []; }

  /** Destroy and cleanup */
  destroy(): void { this.stop(); this.clear(); }
}
