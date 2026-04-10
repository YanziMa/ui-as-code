/**
 * physics-engine.ts — Lightweight 2D/3D Physics Engine
 *
 * A single-file, production-quality physics simulation library covering:
 *   - Vector math (Vec2 / Vec3) with physics-specific operations
 *   - Rigid body dynamics (Euler semi-implicit, Verlet, RK4 integration)
 *   - Collision detection (broad phase: spatial hash + SAP; narrow: GJK/EPA)
 *   - Impulse-based collision response with Baumgarte stabilization
 *   - Constraints (distance, hinge, weld, spring, motor) solved via Gauss-Seidel
 *   - Shapes (circle, rectangle/polygon, compound)
 *   - PhysicsWorld with fixed timestep, sub-stepping, and query API
 *   - Ray casting, debug rendering, profiling, serialization
 *
 * @module physics-engine
 */

// ─── 1. Math ────────────────────────────────────────────────────────────────

/** 2D vector for physics calculations. */
export class Vec2 {
  constructor(public x = 0, public y = 0) {}

  /** Clone this vector. */
  clone(): Vec2 { return new Vec2(this.x, this.y); }

  /** Set components in-place and return self. */
  set(x: number, y: number): Vec2 { this.x = x; this.y = y; return this; }

  /** Copy from another vector. */
  copy(v: Vec2): Vec2 { this.x = v.x; this.y = v.y; return this; }

  /** Add another vector component-wise. */
  add(v: Vec2): Vec2 { return new Vec2(this.x + v.x, this.y + v.y); }

  /** Subtract another vector component-wise. */
  sub(v: Vec2): Vec2 { return new Vec2(this.x - v.x, this.y - v.y); }

  /** Multiply by scalar. */
  mul(s: number): Vec2 { return new Vec2(this.x * s, this.y * s); }

  /** Divide by scalar (guards against zero). */
  div(s: number): Vec2 {
    if (Math.abs(s) < 1e-10) return new Vec2(0, 0);
    return new Vec2(this.x / s, this.y / s);
  }

  /** Dot product. */
  dot(v: Vec2): number { return this.x * v.x + this.y * v.y; }

  /** 2D cross product (returns scalar z-component). */
  cross(v: Vec2): number { return this.x * v.y - this.y * v.x; }

  /** Squared length. */
  lengthSq(): number { return this.x * this.x + this.y * this.y; }

  /** Length (magnitude). */
  length(): number { return Math.sqrt(this.lengthSq()); }

  /** Normalized (unit) vector. Returns zero vector if length is near-zero. */
  normalize(): Vec2 {
    const len = this.length();
    if (len < 1e-10) return new Vec2(0, 0);
    return this.div(len);
  }

  /** Negate all components. */
  negate(): Vec2 { return new Vec2(-this.x, -this.y); }

  /** Perpendicular vector (rotated 90 degrees CCW). */
  perp(): Vec2 { return new Vec2(-this.y, this.x); }

  /** Linear interpolation toward `v` by factor `t` in [0,1]. */
  lerp(v: Vec2, t: number): Vec2 {
    return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  /** Distance to another vector. */
  distanceTo(v: Vec2): number { return v.sub(this).length(); }

  /** Squared distance (avoids sqrt). */
  distanceToSq(v: Vec2): number { return v.sub(this).lengthSq(); }

  /** Rotate by angle (radians). */
  rotate(angle: number): Vec2 {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  /** Angle of this vector in radians from +X axis. */
  angle(): number { return Math.atan2(this.y, this.x); }

  /** Reflect about a normal vector. Used for bounce calculations. */
  reflect(normal: Vec2): Vec2 {
    const d = 2 * this.dot(normal);
    return new Vec2(this.x - d * normal.x, this.y - d * normal.y);
  }

  /** Apply friction: scale tangential component, keep normal intact. */
  applyFriction(normal: Vec2, frictionCoeff: number): Vec2 {
    const nDot = this.dot(normal);
    const nVec = normal.mul(nDot);
    const tVec = this.sub(nVec);
    const tLen = tVec.length();
    if (tLen < 1e-10) return nVec;
    const maxFriction = Math.abs(nDot) * frictionCoeff;
    const reducedT = tLen > maxFriction ? tVec.mul(maxFriction / tLen) : tVec;
    return nVec.add(reducedT);
  }

  /** Static zero vector. */
  static readonly ZERO = new Vec2(0, 0);

  /** Create from angle and magnitude. */
  static fromAngle(angle: number, magnitude = 1): Vec2 {
    return new Vec2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }
}

/** 3D vector for extended physics (e.g., angular axis representation). */
export class Vec3 {
  constructor(public x = 0, public y = 0, public z = 0) {}

  clone(): Vec3 { return new Vec3(this.x, this.y, this.z); }
  set(x: number, y: number, z: number): Vec3 { this.x = x; this.y = y; this.z = z; return this; }
  copy(v: Vec3): Vec3 { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v: Vec3): Vec3 { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v: Vec3): Vec3 { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  mul(s: number): Vec3 { return new Vec3(this.x * s, this.y * s, this.z * s); }
  dot(v: Vec3): number { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    );
  }
  lengthSq(): number { return this.x * this.x + this.y * this.y + this.z * this.z; }
  length(): number { return Math.sqrt(this.lengthSq()); }
  normalize(): Vec3 {
    const len = this.length();
    if (len < 1e-10) return new Vec3(0, 0, 0);
    return this.div(len);
  }
  div(s: number): Vec3 {
    if (Math.abs(s) < 1e-10) return new Vec3(0, 0, 0);
    return new Vec3(this.x / s, this.y / s, this.z / s);
  }
  negate(): Vec3 { return new Vec3(-this.x, -this.y, -this.z); }

  static readonly ZERO = new Vec3(0, 0, 0);
}

// ─── AABB ───────────────────────────────────────────────────────────────────

/** Axis-Aligned Bounding Box. */
export class AABB {
  constructor(
    public minX = Infinity,
    public minY = Infinity,
    public maxX = -Infinity,
    public maxY = -Infinity,
  ) {}

  /** Create AABB from center position and half-extents. */
  static fromCenter(center: Vec2, halfW: number, halfH: number): AABB {
    return new AABB(center.x - halfW, center.y - halfH, center.x + halfW, center.y + halfH);
  }

  /** Width of the box. */
  get width(): number { return this.maxX - this.minX; }

  /** Height of the box. */
  get height(): number { return this.maxY - this.minY; }

  /** Center point. */
  get center(): Vec2 { return new Vec2((this.minX + this.maxX) / 2, (this.minY + this.maxY) / 2); }

  /** Half-extents. */
  get halfExtents(): Vec2 { return new Vec2(this.width / 2, this.height / 2); }

  /** Test overlap with another AABB. */
  overlaps(other: AABB): boolean {
    return this.minX <= other.maxX && this.maxX >= other.minX &&
           this.minY <= other.maxY && this.maxY >= other.minY;
  }

  /** Compute intersection AABB with another box. */
  intersection(other: AABB): AABB | null {
    if (!this.overlaps(other)) return null;
    return new AABB(
      Math.max(this.minX, other.minX),
      Math.max(this.minY, other.minY),
      Math.min(this.maxX, other.maxX),
      Math.min(this.maxY, other.maxY),
    );
  }

  /** Expand this AABB to include a point. */
  expand(point: Vec2): void {
    this.minX = Math.min(this.minX, point.x);
    this.minY = Math.min(this.minY, point.y);
    this.maxX = Math.max(this.maxX, point.x);
    this.maxY = Math.max(this.maxY, point.y);
  }

  /** Merge two AABBs into a new one enclosing both. */
  static merge(a: AABB, b: AABB): AABB {
    return new AABB(
      Math.min(a.minX, b.minX), Math.min(a.minY, b.minY),
      Math.max(a.maxX, b.maxX), Math.max(a.maxY, b.maxY),
    );
  }

  /** Area of the AABB (used for SAH heuristics). */
  area(): number { return this.width * this.height; }

  /** Perimeter of the AABB. */
  perimeter(): number { return 2 * (this.width + this.height); }

  /** Test if a point lies inside this AABB. */
  containsPoint(point: Vec2): boolean {
    return point.x >= this.minX && point.x <= this.maxX &&
           point.y >= this.minY && point.y <= this.maxY;
  }
}

// ─── Collision Primitives ───────────────────────────────────────────────────

/**
 * Test circle-circle collision.
 * @returns Collision info or null if no overlap.
 */
export function testCircleCircle(
  posA: Vec2, radiusA: number,
  posB: Vec2, radiusB: number,
): { normal: Vec2; penetration: number } | null {
  const delta = posB.sub(posA);
  const distSq = delta.lengthSq();
  const combinedRadius = radiusA + radiusB;
  if (distSq > combinedRadius * combinedRadius) return null;
  const dist = Math.sqrt(distSq);
  // Degenerate case: circles at same position
  if (dist < 1e-10) return { normal: new Vec2(1, 0), penetration: combinedRadius };
  const normal = delta.div(dist);
  const penetration = combinedRadius - dist;
  return { normal, penetration };
}

/**
 * Test circle-AABB collision.
 * Finds closest point on AABB to circle center, then checks distance.
 */
export function testCircleAABB(
  circlePos: Vec2, radius: number,
  aabb: AABB,
): { normal: Vec2; penetration: number; contactPoint: Vec2 } | null {
  const closest = new Vec2(
    Math.max(aabb.minX, Math.min(circlePos.x, aabb.maxX)),
    Math.max(aabb.minY, Math.min(circlePos.y, aabb.maxY)),
  );
  const delta = circlePos.sub(closest);
  const distSq = delta.lengthSq();
  if (distSq > radius * radius) return null;
  const dist = Math.sqrt(distSq);
  if (dist < 1e-10) {
    // Circle center inside AABB — push out along shortest edge
    const center = aabb.center;
    const toCenter = circlePos.sub(center);
    const he = aabb.halfExtents;
    let nx = 0, ny = 0, pen = 0;
    const dx = he.width - Math.abs(toCenter.x);
    const dy = he.height - Math.abs(toCenter.y);
    if (dx < dy) {
      nx = toCenter.x >= 0 ? 1 : -1;
      pen = dx + radius;
    } else {
      ny = toCenter.y >= 0 ? 1 : -1;
      pen = dy + radius;
    }
    return { normal: new Vec2(nx, ny), penetration: pen, contactPoint: closest };
  }
  const normal = delta.div(dist);
  return { normal, penetration: radius - dist, contactPoint: closest };
}

/**
 * Test circle-line segment collision.
 * Projects circle center onto line segment, checks distance.
 */
export function testCircleLine(
  circlePos: Vec2, radius: number,
  lineStart: Vec2, lineEnd: Vec2,
): { normal: Vec2; penetration: number; contactPoint: Vec2 } | null {
  const ab = lineEnd.sub(lineStart);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-10) return null; // degenerate line
  let t = circlePos.sub(lineStart).dot(ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const closest = lineStart.add(ab.mul(t));
  const delta = circlePos.sub(closest);
  const distSq = delta.lengthSq();
  if (distSq > radius * radius) return null;
  const dist = Math.sqrt(distSq);
  if (dist < 1e-10) {
    const perp = ab.perp().normalize();
    return { normal: perp, penetration: radius, contactPoint: closest };
  }
  const normal = delta.div(dist);
  return { normal, penetration: radius - dist, contactPoint: closest };
}

/**
 * SAT (Separating Axis Theorem) test for convex polygon-polygon collision.
 * Both polygons are arrays of vertices in world space (CCW order preferred).
 */
export function testPolygonSAT(
  vertsA: Vec2[],
  vertsB: Vec2[],
): { normal: Vec2; penetration: number; contactPoint: Vec2 } | null {
  let minPenetration = Infinity;
  let bestNormal = Vec2.ZERO;

  // Check axes from polygon A
  for (let i = 0; i < vertsA.length; i++) {
    const j = (i + 1) % vertsA.length;
    const edge = vertsA[j].sub(vertsA[i]);
    const axis = new Vec2(-edge.y, edge.x).normalize();
    const [minA, maxA] = projectPolygon(vertsA, axis);
    const [minB, maxB] = projectPolygon(vertsB, axis);
    if (maxA < minB || maxB < minA) return null; // separating axis found
    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap < minPenetration) {
      minPenetration = overlap;
      bestNormal = axis;
      // Ensure normal points from A to B
      const centerA = centroid(vertsA);
      const centerB = centroid(vertsB);
      if (centerB.sub(centerA).dot(bestNormal) < 0) bestNormal = bestNormal.negate();
    }
  }

  // Check axes from polygon B
  for (let i = 0; i < vertsB.length; i++) {
    const j = (i + 1) % vertsB.length;
    const edge = vertsB[j].sub(vertsB[i]);
    const axis = new Vec2(-edge.y, edge.x).normalize();
    const [minA, maxA] = projectPolygon(vertsA, axis);
    const [minB, maxB] = projectPolygon(vertsB, axis);
    if (maxA < minB || maxB < minA) return null;
    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap < minPenetration) {
      minPenetration = overlap;
      bestNormal = axis;
      const centerA = centroid(vertsA);
      const centerB = centroid(vertsB);
      if (centerB.sub(centerA).dot(bestNormal) < 0) bestNormal = bestNormal.negate();
    }
  }

  // Generate contact point (use support points along the collision normal)
  const supportA = findSupportPoint(vertsA, bestNormal.negate());
  const supportB = findSupportPoint(vertsB, bestNormal);
  const contactPoint = supportA.add(supportB).mul(0.5);

  return { normal: bestNormal, penetration: minPenetration, contactPoint };
}

/** Project polygon vertices onto an axis, returning [min, max]. */
function projectPolygon(verts: Vec2[], axis: Vec2): [number, number] {
  let min = Infinity, max = -Infinity;
  for (const v of verts) {
    const d = v.dot(axis);
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

/** Compute centroid of a polygon vertex list. */
function centroid(verts: Vec2[]): Vec2 {
  let cx = 0, cy = 0;
  for (const v of verts) { cx += v.x; cy += v.y; }
  const n = verts.length || 1;
  return new Vec2(cx / n, cy / n);
}

/** Find the furthest vertex along a direction (support function). */
function findSupportPoint(verts: Vec2[], dir: Vec2): Vec2 {
  let best = verts[0], bestDot = -Infinity;
  for (const v of verts) {
    const d = v.dot(dir);
    if (d > bestDot) { bestDot = d; best = v; }
  }
  return best;
}

// ─── GJK Algorithm ─────────────────────────────────────────────────────────

/**
 * GJK (Gilbert-Johnson-Keerthi) algorithm for detecting overlap between two convex shapes.
 * Uses Minkowski difference support functions.
 */
export function gjkTest(
  shapeA: ConvexShape,
  shapeB: ConvexShape,
  maxIterations = 32,
): boolean {
  const d = shapeB.position.sub(shapeA.position).normalize(); // initial direction
  const simplex: Vec2[] = [];
  let direction = d;

  // Initial support point
  const p0 = minkowskiSupport(shapeA, shapeB, direction);
  simplex.push(p0);
  direction = p0.negate();

  for (let iter = 0; iter < maxIterations; iter++) {
    const p = minkowskiSupport(shapeA, shapeB, direction);
    if (p.dot(direction) <= 0) return false; // no overlap
    simplex.push(p);
    if (gjkContainsOrigin(simplex, direction)) return true;
  }
  return false;
}

/** Support function on the Minkowski difference A - B. */
function minkowskiSupport(a: ConvexShape, b: ConvexShape, dir: Vec2): Vec2 {
  return a.support(dir).sub(b.support(dir.negate()));
}

/** Check if the GJK simplex contains the origin, reducing it as needed. */
function gjkContainsOrigin(simplex: Vec2[], direction: Vec2): boolean {
  const len = simplex.length;
  if (len === 2) {
    // Line segment case
    const a = simplex[1], b = simplex[0];
    const ab = b.sub(a);
    const ao = a.negate();
    if (ab.dot(ao) > 0) {
      // Origin is beyond B relative to AB
      direction.set(-ab.y, ab.x); // perpendicular
    } else {
      // Origin is beyond A
      simplex.splice(0, 1);
      direction.copy(ao);
    }
    return false;
  }
  // Triangle case (len === 3)
  const c = simplex[2], b = simplex[1], a = simplex[0];
  const ab = b.sub(a);
  const ac = c.sub(a);
  const ao = a.negate();
  const abPerp = tripleProduct(ac, ab, ab.negate());
  const acPerp = tripleProduct(ab, ac, ac.negate());
  if (abPerp.dot(ao) > 0) {
    simplex.splice(2, 1); // remove C
    direction.copy(abPerp.normalize());
    return false;
  }
  if (acPerp.dot(ao) > 0) {
    simplex.splice(1, 1); // remove B
    direction.copy(acPerp.normalize());
    return false;
  }
  return true; // origin inside triangle
}

/** Triple product for computing perpendicular vectors in 2D. */
function tripleProduct(a: Vec2, b: Vec2, c: Vec2): Vec2 {
  const ac = a.cross(b);
  return new Vec2(-ac * c.y, ac * c.x);
}

// ─── EPA Algorithm ─────────────────────────────────────────────────────────

/**
 * EPA (Expanding Polytope Algorithm) for computing penetration depth
 * given that GJK has already determined overlap. Returns collision info.
 */
export function epaPenetration(
  shapeA: ConvexShape,
  shapeB: ConvexShape,
  initialSimplex: Vec2[],
  maxIterations = 32,
): { normal: Vec2; depth: number; contactPoint: Vec2 } | null {
  const edges: [number, number, Vec2][] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    // Find closest edge to origin
    let closestDist = Infinity, closestIdx = 0;
    const n = initialSimplex.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const vi = initialSimplex[i], vj = initialSimplex[j];
      const edge = vj.sub(vi);
      const normal = new Vec2(-edge.y, edge.x).normalize();
      const dist = Math.abs(vi.dot(normal)); // distance from origin to edge line
      // Ensure normal points toward origin
      if (normal.dot(vi.negate()) < 0) {
        // flip
        initialSimplex[i] = vj;
        initialSimplex[j] = vi;
      }
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    }

    const i = closestIdx;
    const j = (i + 1) % initialSimplex.length;
    const vi = initialSimplex[i], vj = initialSimplex[j];
    const edge = vj.sub(vi);
    let normal = new Vec2(-edge.y, edge.x).normalize();
    if (normal.dot(vi.negate()) < 0) normal = normal.negate();

    const support = minkowskiSupport(shapeA, shapeB, normal);
    const d = support.dot(normal);

    if (d - closestDist < 1e-6) {
      // Converged
      const cp = vi.add(vj).mul(0.5);
      return { normal, depth: d, contactPoint: cp };
    }

    // Insert support point between vi and vj
    initialSimplex.splice(j, 0, support);
  }

  return null; // did not converge
}

// ─── 2. Rigid Body Dynamics ────────────────────────────────────────────────

/** Body type enum. */
export type BodyType = "dynamic" | "static" | "kinematic";

/** Definition used when creating a rigid body. */
export interface BodyDef {
  position?: Vec2;
  angle?: number;
  type?: BodyType;
  mass?: number;
  restitution?: number;
  friction?: number;
  density?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  isBullet?: boolean;
  layer?: number;
  mask?: number;
  sleepThreshold?: number;
}

/** Integration method selection. */
export type IntegrationMethod = "euler" | "verlet" | "rk4";

/**
 * 2D Rigid Body with full dynamics: position, velocity, mass, inertia,
 * forces/torques accumulator, sleeping state, and collision layering.
 */
export class RigidBody2D {
  id: number;
  position: Vec2;
  angle: number;
  velocity: Vec2;
  angularVelocity: number;
  force: Vec2;
  torque: number;
  mass: number;
  invMass: number;
  inertia: number;
  invInertia: number;
  restitution: number;
  friction: number;
  linearDamping: number;
  angularDamping: number;
  fixedRotation: boolean;
  isBullet: boolean;
  bodyType: BodyType;
  layer: number;
  mask: number;
  sleepThreshold: number;
  isSleeping: boolean;
  sleepTimer: number;
  shape: Shape | null = null;
  /** Previous position for Verlet integration. */
  prevPosition: Vec2;
  /** User data pointer for game logic. */
  userData: unknown = null;
  /** Whether this body is active in the world. */
  isActive = true;

  private static _nextId = 1;

  constructor(def: BodyDef = {}) {
    this.id = RigidBody2D._nextId++;
    this.position = def.position?.clone() ?? new Vec2(0, 0);
    this.angle = def.angle ?? 0;
    this.velocity = new Vec2(0, 0);
    this.angularVelocity = 0;
    this.force = new Vec2(0, 0);
    this.torque = 0;
    this.bodyType = def.type ?? "dynamic";
    this.restitution = def.restitution ?? 0.2;
    this.friction = def.friction ?? 0.5;
    this.linearDamping = def.linearDamping ?? 0.01;
    this.angularDamping = def.angularDamping ?? 0.01;
    this.fixedRotation = def.fixedRotation ?? false;
    this.isBullet = def.isBullet ?? false;
    this.layer = def.layer ?? 0x1;
    this.mask = def.mask ?? 0xFFFF;
    this.sleepThreshold = def.sleepThreshold ?? 0.01;
    this.isSleeping = false;
    this.sleepTimer = 0;
    this.prevPosition = this.position.clone();

    if (this.bodyType === "static") {
      this.mass = 0;
      this.invMass = 0;
      this.inertia = 0;
      this.invInertia = 0;
    } else {
      const density = def.density ?? 1;
      this.mass = def.mass ?? 1;
      this.invMass = this.mass > 0 ? 1 / this.mass : 0;
      // Default inertia will be updated when shape is attached
      this.inertia = this.mass * 1; // placeholder
      this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;
    }
  }

  /** Attach a shape and recompute mass properties. */
  attachShape(shape: Shape): void {
    this.shape = shape;
    if (this.bodyType !== "static") {
      this.mass = shape.computeMass(this.mass > 0 ? undefined : 1);
      this.invMass = this.mass > 0 ? 1 / this.mass : 0;
      this.inertia = shape.computeInertia(this.mass);
      this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;
    }
  }

  /** Get the world-space AABB for this body's shape. */
  getAABB(): AABB {
    if (!this.shape) return AABB.fromCenter(this.position, 0.001, 0.001);
    return this.shape.computeAABB(this.position, this.angle);
  }

  /** Transform a local point to world coordinates. */
  localToWorld(localPoint: Vec2): Vec2 {
    return localPoint.rotate(this.angle).add(this.position);
  }

  /** Transform a world point to local coordinates. */
  worldToLocal(worldPoint: Vec2): Vec2 {
    return worldPoint.sub(this.position).rotate(-this.angle);
  }

  /** Get velocity at a world point (includes angular contribution). */
  getVelocityAtWorldPoint(worldPoint: Vec2): Vec2 {
    const r = worldPoint.sub(this.position);
    return this.velocity.add(new Vec2(-this.angularVelocity * r.y, this.angularVelocity * r.x));
  }

  /** Apply a force at the center of mass. */
  applyForce(force: Vec2): void {
    if (this.bodyType !== "dynamic") return;
    this.force = this.force.add(force);
    this.wakeUp();
  }

  /** Apply a force at a world point (generates torque). */
  applyForceAtPoint(force: Vec2, worldPoint: Vec2): void {
    if (this.bodyType !== "dynamic") return;
    this.force = this.force.add(force);
    const r = worldPoint.sub(this.position);
    this.torque += r.cross(force);
    this.wakeUp();
  }

  /** Apply an impulse at the center of mass. */
  applyImpulse(impulse: Vec2): void {
    if (this.bodyType !== "dynamic") return;
    this.velocity = this.velocity.add(impulse.mul(this.invMass));
    this.wakeUp();
  }

  /** Apply an impulse at a world point (affects both linear and angular velocity). */
  applyImpulseAtPoint(impulse: Vec2, worldPoint: Vec2): void {
    if (this.bodyType !== "dynamic") return;
    this.velocity = this.velocity.add(impulse.mul(this.invMass));
    const r = worldPoint.sub(this.position);
    this.angularVelocity += this.invInertia * r.cross(impulse);
    this.wakeUp();
  }

  /** Apply a torque (rotational force). */
  applyTorque(torque: number): void {
    if (this.bodyType !== "dynamic" || this.fixedRotation) return;
    this.torque += torque;
    this.wakeUp();
  }

  /** Apply gravity force. */
  applyGravity(gravity: Vec2): void {
    if (this.bodyType !== "dynamic") return;
    this.force = this.force.add(gravity.mul(this.mass));
  }

  /** Wake up this body if sleeping. */
  wakeUp(): void {
    this.isSleeping = false;
    this.sleepTimer = 0;
  }

  /** Put this body to sleep. */
  sleep(): void {
    this.isSleeping = true;
    this.velocity = Vec2.ZERO;
    this.angularVelocity = 0;
    this.force = Vec2.ZERO;
    this.torque = 0;
  }

  /**
   * Integrate motion forward by dt using the specified method.
   * Called internally by PhysicsWorld.step().
   */
  integrate(dt: number, method: IntegrationMethod = "euler"): void {
    if (this.bodyType === "static" || this.isSleeping) return;

    switch (method) {
      case "euler":
        this.integrateEuler(dt);
        break;
      case "verlet":
        this.integrateVerlet(dt);
        break;
      case "rk4":
        this.integrateRK4(dt);
        break;
    }

    // Damping
    this.velocity = this.velocity.mul(1 - this.linearDamping);
    if (!this.fixedRotation) {
      this.angularVelocity *= (1 - this.angularDamping);
    }

    // Sleeping check
    const speedSq = this.velocity.lengthSq() + this.angularVelocity * this.angularVelocity;
    if (speedSq < this.sleepThreshold * this.sleepThreshold) {
      this.sleepTimer += dt;
      if (this.sleepTimer > 0.5) this.sleep();
    } else {
      this.sleepTimer = 0;
    }
  }

  /** Semi-implicit Euler integration (symplectic Euler). */
  private integrateEuler(dt: number): void {
    // Update velocity from acceleration
    this.velocity = this.velocity.add(this.force.mul(this.invMass * dt));
    if (!this.fixedRotation) {
      this.angularVelocity += this.torque * this.invInertia * dt;
    }
    // Update position from velocity
    this.prevPosition = this.position.clone();
    this.position = this.position.add(this.velocity.mul(dt));
    this.angle += this.angularVelocity * dt;
  }

  /** Verlet integration (position-based, good for stability). */
  private integrateVerlet(dt: number): void {
    const acc = this.force.mul(this.invMass);
    const newPos = this.position
      .mul(2)
      .sub(this.prevPosition)
      .add(acc.mul(dt * dt));
    this.prevPosition = this.position.clone();
    this.position = newPos;
    // Derive velocity from positions
    this.velocity = this.position.sub(this.prevPosition).div(dt);
    if (!this.fixedRotation) {
      this.angle += this.angularVelocity * dt + 0.5 * this.torque * this.invInertia * dt * dt;
    }
  }

  /** 4th-order Runge-Kutta integration (most accurate, more expensive). */
  private integrateRK4(dt: number): void {
    // State: [px, py, vx, vy, angle, omega]
    const deriv1 = this.rkDeriv(Vec2.ZERO, Vec2.ZERO, 0, 0);
    const deriv2 = this.rkDeriv(
      this.position.add(deriv1.pos.mul(dt * 0.5)),
      this.velocity.add(deriv1.vel.mul(dt * 0.5)),
      this.angle + deriv1.ang * dt * 0.5,
      deriv1.omega * dt * 0.5,
    );
    const deriv3 = this.rkDeriv(
      this.position.add(deriv2.pos.mul(dt * 0.5)),
      this.velocity.add(deriv2.vel.mul(dt * 0.5)),
      this.angle + deriv2.ang * dt * 0.5,
      deriv2.omega * dt * 0.5,
    );
    const deriv4 = this.rkDeriv(
      this.position.add(deriv3.pos.mul(dt)),
      this.velocity.add(deriv3.vel.mul(dt)),
      this.angle + deriv3.ang * dt,
      deriv3.omega * dt,
    );

    const dtDiv6 = dt / 6;
    const velDt = deriv1.vel
      .add(deriv2.vel.mul(2))
      .add(deriv3.vel.mul(2))
      .add(deriv4.vel)
      .mul(dtDiv6);
    const angDt = (deriv1.ang + 2 * deriv2.ang + 2 * deriv3.ang + deriv4.ang) * dtDiv6;

    this.prevPosition = this.position.clone();
    this.position = this.position.add(velDt);
    this.velocity = this.velocity.add(
      this.force.mul(this.invMass * dt),
    );
    this.angle += angDt;
    if (!this.fixedRotation) {
      this.angularVelocity += this.torque * this.invInertia * dt;
    }
  }

  /** RK derivative evaluation helper. */
  private rkDeriv(_pos: Vec2, _vel: Vec2, _angle: number, _omega: number): {
    pos: Vec2; vel: Vec2; ang: number; omega: number;
  } {
    return {
      pos: this.velocity.clone(),
      vel: this.force.mul(this.invMass),
      ang: this.angularVelocity,
      omega: this.fixedRotation ? 0 : this.torque * this.invInertia,
    };
  }

  /** Clear accumulated forces and torques after integration step. */
  clearForces(): void {
    this.force = Vec2.ZERO;
    this.torque = 0;
  }
}

// ─── 3. Shapes ─────────────────────────────────────────────────────────────

/** Base interface for collision shapes. */
export interface Shape {
  /** Compute the AABB of this shape at the given position and rotation. */
  computeAABB(position: Vec2, angle: number): AABB;
  /** Compute mass given density. */
  computeMass(density?: number): number;
  /** Compute moment of inertia around centroid. */
  computeInertia(mass: number): number;
  /** Support function for GJK: furthest point in direction. */
  support(direction: Vec2): Vec2;
  /** Test if a point (in local coords) is inside the shape. */
  testPoint(localPoint: Vec2): boolean;
  /** Type name for serialization. */
  readonly type: string;
}

/** Circle collision shape. */
export class CircleShape implements Shape {
  readonly type = "circle";
  constructor(public radius: number) {}
  computeAABB(position: Vec2, _angle: number): AABB {
    return new AABB(
      position.x - this.radius, position.y - this.radius,
      position.x + this.radius, position.y + this.radius,
    );
  }
  computeMass(density = 1): number {
    return Math.PI * this.radius * this.radius * density;
  }
  computeInertia(mass: number): number {
    return 0.5 * mass * this.radius * this.radius;
  }
  support(direction: Vec2): Vec2 {
    return direction.normalize().mul(this.radius);
  }
  testPoint(localPoint: Vec2): boolean {
    return localPoint.length() <= this.radius;
  }
}

/** Polygon / rectangle collision shape defined by local-space vertices. */
export class PolygonShape implements Shape {
  readonly type = "polygon";
  /** Vertices in local (body) space, CCW order. */
  vertices: Vec2[];
  /** Normals for each edge (computed from vertices). */
  normals: Vec2[];

  constructor(vertices: Vec2[]) {
    this.vertices = vertices;
    this.normals = this.computeNormals();
  }

  /** Create a rectangle (centered box) polygon. */
  static createBox(halfWidth: number, halfHeight: number): PolygonShape {
    return new PolygonShape([
      new Vec2(-halfWidth, -halfHeight),
      new Vec2(halfWidth, -halfHeight),
      new Vec2(halfWidth, halfHeight),
      new Vec2(-halfWidth, halfHeight),
    ]);
  }

  /** Compute edge normals from vertices. */
  private computeNormals(): Vec2[] {
    const norms: Vec2[] = [];
    const n = this.vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const edge = this.vertices[j].sub(this.vertices[i]);
      norms.push(new Vec2(-edge.y, edge.x).normalize());
    }
    return norms;
  }

  computeAABB(position: Vec2, angle: number): AABB {
    const aabb = new AABB();
    for (const v of this.vertices) {
      aabb.expand(v.rotate(angle).add(position));
    }
    return aabb;
  }

  computeMass(density = 1): number {
    // Approximate area via shoelace formula
    let area = 0;
    const n = this.vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += this.vertices[i].cross(this.vertices[j]);
    }
    area = Math.abs(area) * 0.5;
    return area * density;
  }

  computeInertia(mass: number): number {
    // Approximate inertia for a general polygon
    let I = 0;
    const n = this.vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const vi = this.vertices[i], vj = this.vertices[j];
      const cross = Math.abs(vi.cross(vj));
      I += cross * (vi.dot(vi) + vi.dot(vj) + vj.dot(vj));
    }
    return (mass * I) / 12;
  }

  support(direction: Vec2): Vec2 {
    let best = this.vertices[0], bestDot = -Infinity;
    for (const v of this.vertices) {
      const d = v.dot(direction);
      if (d > bestDot) { bestDot = d; best = v; }
    }
    return best;
  }

  testPoint(localPoint: Vec2): boolean {
    // Point-in-polygon test using cross products
    const n = this.vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const edge = this.vertices[j].sub(this.vertices[i]);
      const toPoint = localPoint.sub(this.vertices[i]);
      if (edge.cross(toPoint) < 0) return false;
    }
    return true;
  }
}

/** Compound shape composed of multiple child primitives. */
export class CompoundShape implements Shape {
  readonly type = "compound";
  children: { shape: Shape; offset: Vec2; angle: number }[];

  constructor(children: CompoundShape["children"] = []) {
    this.children = children;
  }

  addChild(shape: Shape, offset = Vec2.ZERO, angle = 0): void {
    this.children.push({ shape, offset, angle });
  }

  computeAABB(position: Vec2, angle: number): AABB {
    let result: AABB | null = null;
    for (const child of this.children) {
      const childPos = child.offset.rotate(child.angle).add(position);
      const childAngle = angle + child.angle;
      const childAABB = child.shape.computeAABB(childPos, childAngle);
      result = result ? AABB.merge(result, childAABB) : childAABB;
    }
    return result ?? new AABB();
  }

  computeMass(density = 1): number {
    return this.children.reduce((sum, c) => sum + c.shape.computeMass(density), 0);
  }

  computeInertia(mass: number): number {
    // Parallel axis theorem approximation
    return this.children.reduce((sum, c) => {
      const cm = c.shape.computeMass();
      return sum + c.shape.computeInertia(cm) + cm * c.offset.lengthSq();
    }, 0);
  }

  support(direction: Vec2): Vec2 {
    let best = new Vec2(-Infinity, -Infinity), bestDot = -Infinity;
    for (const child of this.children) {
      const rotDir = direction.rotate(-child.angle);
      const localSup = child.shape.support(rotDir);
      const worldSup = localSup.rotate(child.angle).add(child.offset);
      const d = worldSup.dot(direction);
      if (d > bestDot) { bestDot = d; best = worldSup; }
    }
    return best;
  }

  testPoint(localPoint: Vec2): boolean {
    for (const child of this.children) {
      const lp = localPoint.sub(child.offset).rotate(-child.angle);
      if (child.shape.testPoint(lp)) return true;
    }
    return false;
  }
}

/** Abstract convex shape wrapper for GJK/EPA. */
export interface ConvexShape {
  position: Vec2;
  angle: number;
  support(direction: Vec2): Vec2;
}

// ─── Contact & Collision Data ──────────────────────────────────────────────

/** A contact manifold between two bodies. */
export interface Contact {
  bodyA: RigidBody2D;
  bodyB: RigidBody2D;
  point: Vec2;
  normal: Vec2;
  penetration: number;
  restitution: number;
  friction: number;
  /** Accumulated impulse for warm-starting. */
  normalImpulse: number;
  tangentImpulse: number;
  /** Contact ID for persistence across frames. */
  id: number;
}

/** Result of a ray cast query. */
export interface RaycastResult {
  hit: boolean;
  point: Vec2;
  normal: Vec2;
  distance: number;
  body?: RigidBody2D;
}

/** Settings for the physics world. */
export interface WorldSettings {
  gravity: Vec2;
  velocityIterations: number;
  positionIterations: number;
  allowSleep: boolean;
}

// ─── Broad Phase ───────────────────────────────────────────────────────────

/** Spatial hash grid for broad-phase collision detection. */
class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, RigidBody2D[]> = new Map();

  constructor(cellSize = 64) {
    this.cellSize = cellSize;
  }

  /** Insert a body into the grid based on its AABB. */
  insert(body: RigidBody2D): void {
    const aabb = body.getAABB();
    const minCX = Math.floor(aabb.minX / this.cellSize);
    const minCY = Math.floor(aabb.minY / this.cellSize);
    const maxCX = Math.floor(aabb.maxX / this.cellSize);
    const maxCY = Math.floor(aabb.maxY / this.cellSize);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = `${cx},${cy}`;
        let bucket = this.grid.get(key);
        if (!bucket) { bucket = []; this.grid.set(key, bucket); }
        bucket.push(body);
      }
    }
  }

  /** Query potential colliding pairs. */
  queryPairs(): [RigidBody2D, RigidBody2D][] {
    const pairs = new Set<string>();
    const results: [RigidBody2D, RigidBody2D][] = [];
    for (const [, bucket] of this.grid) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const a = bucket[i], b = bucket[j];
          if (a.id === b.id) continue;
          // Layer filter
          if ((a.layer & b.mask) === 0 || (b.layer & a.mask) === 0) continue;
          const pairKey = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
          if (!pairs.has(pairKey)) {
            pairs.add(pairKey);
            results.push([a, b]);
          }
        }
      }
    }
    return results;
  }

  /** Clear the grid. */
  clear(): void { this.grid.clear(); }
}

/** Sweep-and-Prune (SAP) broad phase using sorted AABB endpoints. */
class SweepAndPrune {
  /** Find overlapping pairs from a list of bodies. */
  findPairs(bodies: RigidBody2D[]): [RigidBody2D, RigidBody2D][] {
    // Sort bodies by AABB minX
    const sorted = [...bodies].sort((a, b) => {
      const aabbA = a.getAABB(), aabbB = b.getAABB();
      return aabbA.minX - aabbB.minX;
    });

    const pairs: [RigidBody2D, RigidBody2D][] = [];
    const activeList: RigidBody2D[] = [];

    for (const body of sorted) {
      const aabb = body.getAABB();
      // Remove from active list those whose maxX < current minX
      for (let i = activeList.length - 1; i >= 0; i--) {
        const active = activeList[i];
        const activeAABB = active.getAABB();
        if (activeAABB.maxX < aabb.minX) {
          activeList.splice(i, 1);
        } else {
          // Y-overlap check
          if (activeAABB.overlaps(aabb)) {
            if ((active.layer & body.mask) !== 0 && (body.layer & active.mask) !== 0) {
              pairs.push([active, body]);
            }
          }
        }
      }
      activeList.push(body);
    }
    return pairs;
  }
}

// ─── 4. Constraints ────────────────────────────────────────────────────────

/** Base constraint interface. */
export interface Constraint {
  /** Pre-solve step (compute Jacobians, etc.). */
  preSolve(dt: number): void;
  /** Solve the constraint (Gauss-Seidel iteration). */
  solve(): void;
  /** Post-solve cleanup. */
  postSolve(): void;
}

/** Keep two points on two bodies at a fixed distance. */
export class DistanceConstraint implements Constraint {
  private bodyA: RigidBody2D;
  private bodyB: RigidBody2D;
  private localAnchorA: Vec2;
  private localAnchorB: Vec2;
  private targetLength: number;
  private stiffness: number;
  private accumulatedImpulse = 0;

  constructor(
    bodyA: RigidBody2D,
    bodyB: RigidBody2D,
    anchorA: Vec2,
    anchorB: Vec2,
    stiffness = 0.3,
  ) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = anchorA;
    this.localAnchorB = anchorB;
    this.stiffness = stiffness;
    const worldA = bodyA.localToWorld(anchorA);
    const worldB = bodyB.localToWorld(anchorB);
    this.targetLength = worldA.distanceTo(worldB);
  }

  preSolve(_dt: number): void {
    this.accumulatedImpulse *= 0.9; // warm-start decay
  }

  solve(): void {
    const worldA = this.bodyA.localToWorld(this.localAnchorA);
    const worldB = this.bodyB.localToWorld(this.localAnchorB);
    const delta = worldB.sub(worldA);
    const currentLength = delta.length();
    if (currentLength < 1e-10) return;
    const normal = delta.div(currentLength);
    const error = currentLength - this.targetLength;
    const rA = worldA.sub(this.bodyA.position);
    const rB = worldB.sub(this.bodyB.position);

    const invMassSum =
      this.bodyA.invMass + this.bodyB.invMass +
      this.bodyA.invInertia * rA.cross(normal) * rA.cross(normal) +
      this.bodyB.invInertia * rB.cross(normal) * rB.cross(normal);

    if (invMassSum < 1e-10) return;

    const lambda = (-error * this.stiffness - this.accumulatedImpulse) / invMassSum;
    const oldAccum = this.accumulatedImpulse;
    this.accumulatedImpulse = Math.max(oldAccum - lambda, 0); // only pull, don't push
    const actualImpulse = this.accumulatedImpulse - oldAccum;

    const imp = normal.mul(actualImpulse);
    this.bodyA.velocity = this.bodyA.velocity.sub(imp.mul(this.bodyA.invMass));
    this.bodyB.velocity = this.bodyB.velocity.add(imp.mul(this.bodyB.invMass));
    if (!this.bodyA.fixedRotation) {
      this.bodyA.angularVelocity -= this.bodyA.invInertia * rA.cross(imp);
    }
    if (!this.bodyB.fixedRotation) {
      this.bodyB.angularVelocity += this.bodyB.invInertia * rB.cross(imp);
    }
  }

  postSolve(): void { /* noop */ }
}

/** Hinge constraint: allows rotation around a shared anchor point. */
export class HingeConstraint implements Constraint {
  private bodyA: RigidBody2D;
  private bodyB: RigidBody2D;
  private localAnchorA: Vec2;
  private localAnchorB: Vec2;
  private bias: Vec2 = Vec2.ZERO;
  private accumulatedImpulse = Vec2.ZERO;

  constructor(bodyA: RigidBody2D, bodyB: RigidBody2D, anchorA: Vec2, anchorB: Vec2) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = anchorA;
    this.localAnchorB = anchorB;
  }

  preSolve(_dt: number): void {
    this.accumulatedImpulse = this.accumulatedImpulse.mul(0.8);
  }

  solve(): void {
    const worldA = this.bodyA.localToWorld(this.localAnchorA);
    const worldB = this.bodyB.localToWorld(this.localAnchorB);
    const delta = worldB.sub(worldA);
    const rA = worldA.sub(this.bodyA.position);
    const rB = worldB.sub(this.bodyB.position);

    // Solve X and Y constraints separately (2D hinge = 2 linear constraints)
    for (const axis of [new Vec2(1, 0), new Vec2(0, 1)]) {
      const comp = delta.dot(axis);
      const rAc = rA.cross(axis);
      const rBc = rB.cross(axis);
      const k = this.bodyA.invMass + this.bodyB.invMass +
        this.bodyA.invInertia * rAc * rAc +
        this.bodyB.invInertia * rBc * rBc;
      if (k < 1e-10) continue;
      const lambda = (-comp - this.accumulatedImpulse.dot(axis)) / k;
      const oldImp = this.accumulatedImpulse.dot(axis);
      const newImp = Math.max(Math.min(oldImp + lambda, 1000), -1000);
      const actualImp = newImp - oldImp;
      this.accumulatedImpulse = this.accumulatedImpulse.add(axis.mul(actualImp));

      const imp = axis.mul(actualImp);
      this.bodyA.velocity = this.bodyA.velocity.sub(imp.mul(this.bodyA.invMass));
      this.bodyB.velocity = this.bodyB.velocity.add(imp.mul(this.bodyB.invMass));
      if (!this.bodyA.fixedRotation) this.bodyA.angularVelocity -= this.bodyA.invInertia * rA.cross(imp);
      if (!this.bodyB.fixedRotation) this.bodyB.angularVelocity += this.bodyB.invInertia * rB.cross(imp);
    }
  }

  postSolve(): void { /* noop */ }
}

/** Weld constraint: fully fixes two bodies together (position + rotation). */
export class WeldConstraint implements Constraint {
  private bodyA: RigidBody2D;
  private bodyB: RigidBody2D;
  private localAnchorA: Vec2;
  private localAnchorB: Vec2;
  private referenceAngle: number;
  private positionImpulse = Vec2.ZERO;
  private angleError = 0;

  constructor(bodyA: RigidBody2D, bodyB: RigidBody2D, anchorA: Vec2, anchorB: Vec2) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = anchorA;
    this.localAnchorB = anchorB;
    this.referenceAngle = bodyB.angle - bodyA.angle;
  }

  preSolve(_dt: number): void {
    this.positionImpulse = this.positionImpulse.mul(0.85);
  }

  solve(): void {
    const worldA = this.bodyA.localToWorld(this.localAnchorA);
    const worldB = this.bodyB.localToWorld(this.localAnchorB);
    const delta = worldB.sub(worldA);
    const rA = worldA.sub(this.bodyA.position);
    const rB = worldB.sub(this.bodyB.position);

    // Position correction (linear)
    for (const axis of [new Vec2(1, 0), new Vec2(0, 1)]) {
      const comp = delta.dot(axis);
      const rAc = rA.cross(axis);
      const rBc = rB.cross(axis);
      const k = this.bodyA.invMass + this.bodyB.invMass +
        this.bodyA.invInertia * rAc * rAc +
        this.bodyB.invInertia * rBc * rBc;
      if (k < 1e-10) continue;
      const lambda = -comp / k;
      const imp = axis.mul(lambda * 0.5);
      this.bodyA.position = this.bodyA.position.sub(imp.mul(this.bodyA.invMass));
      this.bodyB.position = this.bodyB.position.add(imp.mul(this.bodyB.invMass));
    }

    // Angular correction
    const angleError = (this.bodyB.angle - this.bodyA.angle) - this.referenceAngle;
    if (Math.abs(angleError) > 1e-6) {
      const kAng = this.bodyA.invInertia + this.bodyB.invInertia;
      if (kAng > 1e-10) {
        const angImp = -angleError / kAng * 0.5;
        if (!this.bodyA.fixedRotation) this.bodyA.angle -= angImp * this.bodyA.invInertia;
        if (!this.bodyB.fixedRotation) this.bodyB.angle += angImp * this.bodyB.invInertia;
      }
    }
  }

  postSolve(): void { /* noop */ }
}

/** Spring constraint with damping between two anchor points. */
export class SpringConstraint implements Constraint {
  private bodyA: RigidBody2D;
  private bodyB: RigidBody2D;
  private localAnchorA: Vec2;
  private localAnchorB: Vec2;
  private restLength: number;
  private stiffness: number;
  private damping: number;

  constructor(
    bodyA: RigidBody2D,
    bodyB: RigidBody2D,
    anchorA: Vec2,
    anchorB: Vec2,
    stiffness = 50,
    damping = 5,
    restLength?: number,
  ) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = anchorA;
    this.localAnchorB = anchorB;
    this.stiffness = stiffness;
    this.damping = damping;
    const wA = bodyA.localToWorld(anchorA);
    const wB = bodyB.localToWorld(anchorB);
    this.restLength = restLength ?? wA.distanceTo(wB);
  }

  preSolve(_dt: number): void { /* noop */ }

  solve(): void {
    const worldA = this.bodyA.localToWorld(this.localAnchorA);
    const worldB = this.bodyB.localToWorld(this.localAnchorB);
    const delta = worldB.sub(worldA);
    const dist = delta.length();
    if (dist < 1e-10) return;
    const normal = delta.div(dist);
    const extension = dist - this.restLength;

    // Spring force: F = -k * x
    // Damping: F_d = -c * v_relative
    const relVel = this.bodyB.getVelocityAtWorldPoint(worldB)
      .sub(this.bodyA.getVelocityAtWorldPoint(worldA));
    const springForce = extension * this.stiffness;
    const dampingForce = relVel.dot(normal) * this.damping;
    const totalForce = springForce + dampingForce;

    const rA = worldA.sub(this.bodyA.position);
    const rB = worldB.sub(this.bodyB.position);
    const invMassSum = this.bodyA.invMass + this.bodyB.invMass +
      this.bodyA.invInertia * rA.cross(normal) ** 2 +
      this.bodyB.invInertia * rB.cross(normal) ** 2;
    if (invMassSum < 1e-10) return;

    const impMag = totalForce / invMassSum;
    const imp = normal.mul(impMag * 0.01); // scale down for stability

    this.bodyA.applyImpulse(imp);
    this.bodyB.applyImpulse(imp.negate());
  }

  postSolve(): void { /* noop */ }
}

/** Motor constraint: drives a body toward a target velocity or position. */
export class MotorConstraint implements Constraint {
  private body: RigidBody2D;
  private targetVelocity: Vec2;
  private targetPosition: Vec2 | null;
  private maxForce: number;
  private mode: "velocity" | "position";

  constructor(
    body: RigidBody2D,
    options: { targetVelocity?: Vec2; targetPosition?: Vec2; maxForce?: number; mode?: "velocity" | "position" },
  ) {
    this.body = body;
    this.targetVelocity = options.targetVelocity ?? Vec2.ZERO;
    this.targetPosition = options.targetPosition ?? null;
    this.maxForce = options.maxForce ?? 100;
    this.mode = options.mode ?? "velocity";
  }

  preSolve(_dt: number): void { /* noop */ }

  solve(): void {
    if (this.mode === "velocity") {
      const error = this.targetVelocity.sub(this.body.velocity);
      const force = error.mul(this.maxForce);
      this.body.applyForce(force.clampMagnitude(this.maxForce));
    } else if (this.targetPosition) {
      const error = this.targetPosition.sub(this.body.position);
      const force = error.mul(this.maxForce * 0.1);
      this.body.applyForce(force.clampMagnitude(this.maxForce));
    }
  }

  postSolve(): void { /* noop */ }

  /** Set target velocity. */
  setTargetVelocity(v: Vec2): void { this.targetVelocity = v; }

  /** Set target position (switches to position mode). */
  setTargetPosition(p: Vec2): void { this.targetPosition = p; this.mode = "position"; }
}

/** Clamp a vector's magnitude to a maximum value. */
function clampMagnitude(v: Vec2, max: number): Vec2 {
  const lenSq = v.lengthSq();
  if (lenSq > max * max) return v.normalize().mul(max);
  return v;
}
// Attach to Vec2 prototype-like utility
Vec2.prototype["clampMagnitude"] = function(max: number): Vec2 {
  const lenSq = this.lengthSq();
  if (lenSq > max * max) return this.normalize().mul(max);
  return this.clone();
};

// ─── Gauss-Seidel Constraint Solver ───────────────────────────────────────

/** Iterative constraint solver using Gauss-Seidel method. */
class ConstraintSolver {
  private constraints: Constraint[] = [];

  /** Add a constraint to the solver. */
  add(constraint: Constraint): void {
    this.constraints.push(constraint);
  }

  /** Remove a constraint. */
  remove(constraint: Constraint): void {
    const idx = this.constraints.indexOf(constraint);
    if (idx >= 0) this.constraints.splice(idx, 1);
  }

  /** Solve all constraints for the specified number of iterations. */
  solve(iterations: number, dt: number): void {
    for (const c of this.constraints) c.preSolve(dt);
    for (let i = 0; i < iterations; i++) {
      for (const c of this.constraints) c.solve();
    }
    for (const c of this.constraints) c.postSolve();
  }

  /** Get the number of registered constraints. */
  get count(): number { return this.constraints.length; }

  /** Clear all constraints. */
  clear(): void { this.constraints.length = 0; }
}

// ─── 5. Collision Detection & Response ─────────────────────────────────────

/** Manages collision detection and resolution. */
class CollisionSystem {
  private contacts: Contact[] = [];
  private nextContactId = 0;
  private spatialHash = new SpatialHashGrid(64);
  private sap = new SweepAndPrune();
  /** Use SAP instead of spatial hash for broad phase. */
  useSAP = false;

  /** Detect collisions among the given bodies and generate contacts. */
  detect(bodies: RigidBody2D[]): Contact[] {
    this.contacts = [];
    if (bodies.length < 2) return this.contacts;

    // Broad phase
    const pairs = this.useSAP
      ? this.sap.findPairs(bodies.filter(b => b.isActive && !b.isSleeping))
      : this.runSpatialHash(bodies.filter(b => b.isActive && !b.isSleeping));

    // Narrow phase
    for (const [a, b] of pairs) {
      if (a.bodyType === "static" && b.bodyType === "static") continue;
      this.narrowPhase(a, b);
    }

    return this.contacts;
  }

  /** Run spatial hash broad phase. */
  private runSpatialHash(bodies: RigidBody2D[]): [RigidBody2D, RigidBody2D][] {
    this.spatialHash.clear();
    for (const body of bodies) this.spatialHash.insert(body);
    return this.spatialHash.queryPairs();
  }

  /** Narrow-phase collision test between two bodies. */
  private narrowPhase(bodyA: RigidBody2D, bodyB: RigidBody2D): void {
    if (!bodyA.shape || !bodyB.shape) return;
    const shapeA = bodyA.shape;
    const shapeB = bodyB.shape;

    let result: { normal: Vec2; penetration: number; contactPoint: Vec2 } | null = null;

    // Dispatch based on shape types
    if (shapeA.type === "circle" && shapeB.type === "circle") {
      const cA = shapeA as CircleShape, cB = shapeB as CircleShape;
      const r = testCircleCircle(bodyA.position, cA.radius, bodyB.position, cB.radius);
      if (r) result = { ...r, contactPoint: bodyA.position.add(r.normal.mul(cA.radius)) };
    } else if (shapeA.type === "circle" && shapeB.type === "polygon") {
      const c = shapeA as CircleShape;
      const poly = shapeB as PolygonShape;
      const worldVerts = poly.vertices.map(v => bodyB.localToWorld(v));
      const sat = testPolygonSAT(
        [bodyA.position.add(c.support(new Vec2(1, 0))), bodyA.position.add(c.support(new Vec2(-1, 0))),
         bodyA.position.add(c.support(new Vec2(0, 1))), bodyA.position.add(c.support(new Vec2(0, -1)))],
        worldVerts,
      );
      if (sat) result = sat;
    } else if (shapeA.type === "polygon" && shapeB.type === "circle") {
      // Swap and reverse normal
      const tmp = bodyA; bodyA = bodyB; bodyB = tmp;
      const ts = shapeA; shapeA = shapeB; shapeB = ts;
      return this.narrowPhase(bodyA, bodyB); // recurse with swapped args
    } else if (shapeA.type === "polygon" && shapeB.type === "polygon") {
      const polyA = shapeA as PolygonShape, polyB = shapeB as PolygonShape;
      const worldA = polyA.vertices.map(v => bodyA.localToWorld(v));
      const worldB = polyB.vertices.map(v => bodyB.localToWorld(v));
      result = testPolygonSAT(worldA, worldB);
    } else if (shapeA.type === "compound" || shapeB.type === "compound") {
      // Test compound children pairwise
      const compound = shapeA.type === "compound" ? shapeA as CompoundShape : shapeB as CompoundShape;
      const other = shapeA.type === "compound" ? bodyB : bodyA;
      const otherShape = shapeA.type === "compound" ? shapeB : shapeA;
      for (const child of compound.children) {
        // Create temporary body for child
        const childBody = new RigidBody2D({
          position: child.offset.rotate(compound === shapeA ? bodyA.angle : bodyB.angle)
            .add(compound === shapeA ? bodyA.position : bodyB.position),
          angle: (compound === shapeA ? bodyA.angle : bodyB.angle) + child.angle,
          type: "kinematic",
        });
        childBody.attachShape(child.shape);
        const origA = bodyA, origB = bodyB;
        if (compound === shapeA) { bodyA = childBody; } else { bodyB = childBody; }
        this.narrowPhase(bodyA, bodyB);
        bodyA = origA; bodyB = origB;
      }
      return;
    }

    if (result) {
      // Ensure normal points from A to B
      const toB = bodyB.position.sub(bodyA.position);
      if (result.normal.dot(toB) < 0) result.normal = result.normal.negate();

      this.contacts.push({
        bodyA, bodyB,
        point: result.contactPoint,
        normal: result.normal,
        penetration: result.penetration,
        restitution: Math.min(bodyA.restitution, bodyB.restitution),
        friction: Math.sqrt(bodyA.friction * bodyB.friction),
        normalImpulse: 0,
        tangentImpulse: 0,
        id: this.nextContactId++,
      });
    }
  }

  /** Resolve all detected contacts using sequential impulses. */
  resolve(contacts: Contact[], velocityIter: number, positionIter: number): void {
    // Velocity constraint solving (sequential impulses)
    for (let i = 0; i < velocityIter; i++) {
      for (const c of contacts) this.resolveVelocity(c);
    }
    // Position correction (Baumgarte stabilization)
    for (let i = 0; i < positionIter; i++) {
      for (const c of contacts) this.correctPosition(c);
    }
  }

  /** Resolve velocity for a single contact (impulse-based). */
  private resolveVelocity(c: Contact): void {
    const { bodyA, bodyB, normal, friction, restitution } = c;
    const rA = c.point.sub(bodyA.position);
    const rB = c.point.sub(bodyB.position);

    // Relative velocity at contact point
    const velA = bodyA.getVelocityAtWorldPoint(c.point);
    const velB = bodyB.getVelocityAtWorldPoint(c.point);
    const relVel = velB.sub(velN);
    const velN = relVel.dot(normal);

    // Do not resolve if velocities are separating
    if (velN > 0) return;

    // Normal impulse
    const rAcN = rA.cross(normal);
    const rBcN = rB.cross(normal);
    const invMassSum = bodyA.invMass + bodyB.invMass +
      bodyA.invInertia * rAcN * rAcN + bodyB.invInertia * rBcN * rBcN;
    if (invMassSum < 1e-10) return;

    let jn = -(1 + restitution) * velN / invMassSum;
    // Clamp accumulated impulse
    const oldJn = c.normalImpulse;
    c.normalImpulse = Math.max(oldJn + jn, 0);
    jn = c.normalImpulse - oldJn;

    const impN = normal.mul(jn);
    bodyA.velocity = bodyA.velocity.sub(impN.mul(bodyA.invMass));
    bodyB.velocity = bodyB.velocity.add(impN.mul(bodyB.invMass));
    if (!bodyA.fixedRotation) bodyA.angularVelocity -= bodyA.invInertia * rA.cross(impN);
    if (!bodyB.fixedRotation) bodyB.angularVelocity += bodyB.invInertia * rB.cross(impN);

    // Tangential (friction) impulse
    const tangent = relVel.sub(normal.mul(velN)).normalize();
    const rAcT = rA.cross(tangent);
    const rBcT = rB.cross(tangent);
    const invMassT = bodyA.invMass + bodyB.invMass +
      bodyA.invInertia * rAcT * rAcT + bodyB.invInertia * rBcT * rBcT;
    if (invMassT < 1e-10) return;

    let jt = -relVel.dot(tangent) / invMassT;
    const oldJt = c.tangentImpulse;
    const maxJT = friction * c.normalImpulse;
    c.tangentImpulse = Math.max(Math.min(oldJt + jt, maxJT), -maxJT);
    jt = c.tangentImpulse - oldJt;

    const impT = tangent.mul(jt);
    bodyA.velocity = bodyA.velocity.sub(impT.mul(bodyA.invMass));
    bodyB.velocity = bodyB.velocity.add(impT.mul(bodyB.invMass));
    if (!bodyA.fixedRotation) bodyA.angularVelocity -= bodyA.invInertia * rA.cross(impT);
    if (!bodyB.fixedRotation) bodyB.angularVelocity += bodyB.invInertia * rB.cross(impT);
  }

  /** Positional correction using Baumgarte stabilization. */
  private correctPosition(c: Contact): void {
    const { bodyA, bodyB, normal, penetration } = c;
    const slop = 0.005; // penetration allowance
    const percent = 0.8; // correction percentage (Baumgarte factor)
    if (penetration <= slop) return;

    const correctionMag = Math.max(penetration - slop, 0) / (bodyA.invMass + bodyB.invMass) * percent;
    const correction = normal.mul(correctionMag);

    if (bodyA.bodyType !== "static") {
      bodyA.position = bodyA.position.sub(correction.mul(bodyA.invMass));
    }
    if (bodyB.bodyType !== "static") {
      bodyB.position = bodyB.position.add(correction.mul(bodyB.invMass));
    }
  }

  /** Get all current contacts (read-only). */
  getContacts(): ReadonlyArray<Contact> { return this.contacts; }

  /** Get contact count. */
  getContactCount(): number { return this.contacts.length; }
}

// ─── Ray Casting ───────────────────────────────────────────────────────────

/** Cast a ray against all bodies and return the nearest hit. */
export function raycastAll(
  origin: Vec2,
  direction: Vec2,
  maxDistance = Infinity,
  bodies: RigidBody2D[],
): RaycastResult {
  let closest: RaycastResult = { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };

  const dirNorm = direction.normalize();
  for (const body of bodies) {
    if (!body.shape || !body.isActive) continue;
    const result = raycastBody(origin, dirNorm, maxDistance, body);
    if (result.hit && result.distance < closest.distance) {
      closest = result;
    }
  }
  return closest;
}

/** Cast a ray against a single body. */
function raycastBody(
  origin: Vec2,
  direction: Vec2,
  maxDistance: number,
  body: RigidBody2D,
): RaycastResult {
  if (!body.shape) return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };

  switch (body.shape.type) {
    case "circle":
      return raycastCircle(origin, direction, maxDistance, body, body.shape as CircleShape);
    case "polygon":
      return raycastPolygon(origin, direction, maxDistance, body, body.shape as PolygonShape);
    default:
      // Fall back to AABB test
      return raycastAABB(origin, direction, maxDistance, body, body.shape.computeAABB(body.position, body.angle));
  }
}

/** Ray vs circle intersection test. */
function raycastCircle(
  origin: Vec2,
  direction: Vec2,
  maxDistance: number,
  body: RigidBody2D,
  shape: CircleShape,
): RaycastResult {
  const oc = origin.sub(body.position);
  const a = direction.dot(direction);
  const b = 2 * oc.dot(direction);
  const c = oc.dot(oc) - shape.radius * shape.radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };

  const sqrtD = Math.sqrt(discriminant);
  let t = (-b - sqrtD) / (2 * a);
  if (t < 0) t = (-b + sqrtD) / (2 * a);
  if (t < 0 || t > maxDistance) return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };

  const point = origin.add(direction.mul(t));
  const normal = point.sub(body.position).normalize();
  return { hit: true, point, normal, distance: t, body };
}

/** Ray vs AABB intersection test. */
function raycastAABB(
  origin: Vec2,
  direction: Vec2,
  maxDistance: number,
  body: RigidBody2D,
  aabb: AABB,
): RaycastResult {
  let tMin = -Infinity, tMax = Infinity;

  // X slab
  if (Math.abs(direction.x) > 1e-10) {
    tMin = (aabb.minX - origin.x) / direction.x;
    tMax = (aabb.maxX - origin.x) / direction.x;
    if (tMin > tMax) [tMin, tMax] = [tMax, tMin];
  } else if (origin.x < aabb.minX || origin.x > aabb.maxX) {
    return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };
  }

  // Y slab
  let tyMin = -Infinity, tyMax = Infinity;
  if (Math.abs(direction.y) > 1e-10) {
    tyMin = (aabb.minY - origin.y) / direction.y;
    tyMax = (aabb.maxY - origin.y) / direction.y;
    if (tyMin > tyMax) [tyMin, tyMax] = [tyMax, tyMin];
  } else if (origin.y < aabb.minY || origin.y > aabb.maxY) {
    return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };
  }

  tMin = Math.max(tMin, tyMin);
  tMax = Math.min(tMax, tyMax);

  if (tMin > tMax || tMax < 0 || tMin > maxDistance) {
    return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };
  }

  const t = tMin >= 0 ? tMin : tMax;
  if (t < 0 || t > maxDistance) return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };

  const point = origin.add(direction.mul(t));
  // Determine which face was hit
  const center = aabb.center;
  const normal = point.sub(center).normalize();
  return { hit: true, point, normal, distance: t, body };
}

/** Ray vs polygon intersection test (using slab method per edge). */
function raycastPolygon(
  origin: Vec2,
  direction: Vec2,
  maxDistance: number,
  body: RigidBody2D,
  shape: PolygonShape,
): RaycastResult {
  let tMin = -Infinity, tEnter = -Infinity, tExit = Infinity;
  let normalMin = Vec2.ZERO;

  const worldVerts = shape.vertices.map(v => body.localToWorld(v));

  for (let i = 0; i < worldVerts.length; i++) {
    const j = (i + 1) % worldVerts.length;
    const edge = worldVerts[j].sub(worldVerts[i]);
    const edgeNormal = new Vec2(-edge.y, edge.x).normalize();
    const denom = direction.dot(edgeNormal);
    const dist = edgeNormal.dot(worldVerts[i].sub(origin));

    if (Math.abs(denom) < 1e-10) {
      // Ray parallel to edge
      if (dist < 0) return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };
      continue;
    }

    const t = dist / denom;
    if (denom < 0) {
      // Entering
      if (t > tEnter) { tEnter = t; normalMin = edgeNormal; }
    } else {
      // Leaving
      if (t < tExit) tExit = t;
    }
  }

  if (tEnter > tExit || tExit < 0 || tEnter > maxDistance) {
    return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };
  }

  const t = tEnter >= 0 ? tEnter : tExit;
  if (t < 0 || t > maxDistance) return { hit: false, point: origin, normal: Vec2.ZERO, distance: maxDistance };

  const point = origin.add(direction.mul(t));
  return { hit: true, point, normal: normalMin, distance: t, body };
}

// ─── 6. World / Simulation ─────────────────────────────────────────────────

/** Performance profiling metrics collected during simulation steps. */
export interface ProfilingMetrics {
  broadphasePairsTested: number;
  contactsFound: number;
  constraintsSolved: number;
  stepTimeMs: number;
  bodyCount: number;
  activeBodyCount: number;
  sleepingBodyCount: number;
}

/**
 * PhysicsWorld — main simulation container.
 * Manages bodies, constraints, collision detection/response, stepping, and queries.
 */
export class PhysicsWorld {
  gravity: Vec2;
  velocityIterations: number;
  positionIterations: number;
  allowSleep: boolean;
  private bodies: RigidBody2D[] = [];
  private collisionSystem = new CollisionSystem();
  private constraintSolver = new ConstraintSolver();
  private accumulator = 0;
  private fixedDt: number;
  private integrationMethod: IntegrationMethod = "euler";
  private subSteps = 1;
  private profile: ProfilingMetrics = {
    broadphasePairsTested: 0, contactsFound: 0,
    constraintsSolved: 0, stepTimeMs: 0,
    bodyCount: 0, activeBodyCount: 0, sleepingBodyCount: 0,
  };

  constructor(settings: Partial<WorldSettings> = {}) {
    this.gravity = settings.gravity ?? new Vec2(0, 9.81);
    this.velocityIterations = settings.velocityIterations ?? 8;
    this.positionIterations = settings.positionIterations ?? 3;
    this.allowSleep = settings.allowSleep ?? true;
    this.fixedDt = 1 / 60; // 60 Hz fixed timestep
  }

  /** Set the fixed timestep (default 1/60s). */
  setFixedTimestep(dt: number): void { this.fixedDt = dt; }

  /** Set the integration method. */
  setIntegrationMethod(method: IntegrationMethod): void { this.integrationMethod = method; }

  /** Set number of sub-steps per fixed-timestep frame. */
  setSubSteps(steps: number): void { this.subSteps = Math.max(1, steps); }

  /** Enable/disable SAP broad phase. */
  setUseSAP(use: boolean): void { this.collisionSystem.useSAP = use; }

  /** Add a rigid body to the world. */
  addBody(body: RigidBody2D): void {
    this.bodies.push(body);
  }

  /** Remove a rigid body from the world. */
  removeBody(body: RigidBody2D): void {
    const idx = this.bodies.indexOf(body);
    if (idx >= 0) this.bodies.splice(idx, 1);
    body.isActive = false;
  }

  /** Add a constraint to the world. */
  addConstraint(constraint: Constraint): void {
    this.constraintSolver.add(constraint);
  }

  /** Remove a constraint from the world. */
  removeConstraint(constraint: Constraint): void {
    this.constraintSolver.remove(constraint);
  }

  /** Get all bodies (read-only reference). */
  getBodies(): ReadonlyArray<RigidBody2D> { return this.bodies; }

  /** Get all current contacts. */
  getContacts(): ReadonlyArray<Contact> { return this.collisionSystem.getContacts(); }

  /**
   * Step the simulation forward by `frameDt` seconds.
   * Uses fixed timestep with accumulator for frame-rate independence.
   * Performs sub-stepping for increased accuracy.
   */
  step(frameDt: number): void {
    const startTime = performance.now();
    this.accumulator += frameDt;
    const clampedDt = Math.min(frameDt, 0.25); // prevent spiral of death

    while (this.accumulator >= this.fixedDt) {
      const subDt = this.fixedDt / this.subSteps;
      for (let s = 0; s < this.subSteps; s++) {
        this.simulateStep(subDt);
      }
      this.accumulator -= this.fixedDt;
    }

    this.profile.stepTimeMs = performance.now() - startTime;
    this.profile.bodyCount = this.bodies.length;
    this.profile.activeBodyCount = this.bodies.filter(b => b.isActive && !b.isSleeping).length;
    this.profile.sleepingBodyCount = this.bodies.filter(b => b.isSleeping).length;
  }

  /** Perform one simulation sub-step. */
  private simulateStep(dt: number): void {
    // Apply gravity and integrate forces
    for (const body of this.bodies) {
      if (body.bodyType === "dynamic" && !body.isSleeping) {
        body.applyGravity(this.gravity);
      }
      body.integrate(dt, this.integrationMethod);
      body.clearForces();
    }

    // Collision detection (broad + narrow phase)
    const contacts = this.collisionSystem.detect(this.bodies);
    this.profile.contactsFound = contacts.length;

    // Collision resolution
    this.collisionSystem.resolve(contacts, this.velocityIterations, this.positionIterations);

    // Constraint solving
    this.constraintSolver.solve(this.velocityIterations, dt);
    this.profile.constraintsSolved = this.constraintSolver.count * this.velocityIterations;
  }

  /** Cast a ray through the world. Returns nearest hit. */
  raycast(origin: Vec2, direction: Vec2, maxDistance = Infinity): RaycastResult {
    return raycastAll(origin, direction, maxDistance, this.bodies);
  }

  /** Test if any body overlaps a given point. */
  overlapPoint(point: Vec2): RigidBody2D | null {
    for (const body of this.bodies) {
      if (!body.shape || !body.isActive) continue;
      const localP = body.worldToLocal(point);
      if (body.shape.testPoint(localP)) return body;
    }
    return null;
  }

  /** Query all bodies whose AABB overlaps the given area. */
  queryArea(aabb: AABB): RigidBody2D[] {
    const results: RigidBody2D[] = [];
    for (const body of this.bodies) {
      if (!body.isActive) continue;
      if (body.getAABB().overlaps(aabb)) results.push(body);
    }
    return results;
  }

  /** Query all bodies within a radius of a point. */
  queryCircle(center: Vec2, radius: number): RigidBody2D[] {
    return this.queryArea(new AABB(
      center.x - radius, center.y - radius,
      center.x + radius, center.y + radius,
    ));
  }

  /** Get performance profiling metrics from the last step. */
  getProfile(): ProfilingMetrics { return { ...this.profile }; }

  /** Reset profiling counters. */
  resetProfile(): void {
    this.profile = {
      broadphasePairsTested: 0, contactsFound: 0,
      constraintsSolved: 0, stepTimeMs: 0,
      bodyCount: 0, activeBodyCount: 0, sleepingBodyCount: 0,
    };
  }

  /** Serialize the entire world state to a plain object. */
  serialize(): SerializedWorld {
    return {
      gravity: { x: this.gravity.x, y: this.gravity.y },
      velocityIterations: this.velocityIterations,
      positionIterations: this.positionIterations,
      allowSleep: this.allowSleep,
      fixedDt: this.fixedDt,
      bodies: this.bodies.map(b => ({
        id: b.id,
        position: { x: b.position.x, y: b.position.y },
        angle: b.angle,
        velocity: { x: b.velocity.x, y: b.velocity.y },
        angularVelocity: b.angularVelocity,
        bodyType: b.bodyType,
        mass: b.mass,
        restitution: b.restitution,
        friction: b.friction,
        isSleeping: b.isSleeping,
        layer: b.layer,
        mask: b.mask,
        shapeType: b.shape?.type ?? null,
        ...(b.shape instanceof CircleShape ? { shapeData: { radius: (b.shape as CircleShape).radius } } : {}),
        ...(b.shape instanceof PolygonShape ? {
          shapeData: { vertices: (b.shape as PolygonShape).vertices.map(v => ({ x: v.x, y: v.y })) },
        } : {}),
      })),
    };
  }

  /** Restore world state from a serialized object. */
  deserialize(data: SerializedWorld): void {
    this.gravity = new Vec2(data.gravity.x, data.gravity.y);
    this.velocityIterations = data.velocityIterations;
    this.positionIterations = data.positionIterations;
    this.allowSleep = data.allowSleep;
    this.fixedDt = data.fixedDt ?? this.fixedDt;

    this.bodies.length = 0;
    for (const bd of data.bodies) {
      const body = new RigidBody2D({
        position: new Vec2(bd.position.x, bd.position.y),
        angle: bd.angle,
        type: bd.bodyType,
        mass: bd.mass,
        restitution: bd.restitution,
        friction: bd.friction,
        layer: bd.layer,
        mask: bd.mask,
      });
      body.velocity = new Vec2(bd.velocity.x, bd.velocity.y);
      body.angularVelocity = bd.angularVelocity;
      body.isSleeping = bd.isSleeping;
      body.id = bd.id;

      if (bd.shapeType === "circle" && bd.shapeData && "radius" in bd.shapeData) {
        body.attachShape(new CircleShape((bd.shapeData as { radius: number }).radius));
      } else if (bd.shapeType === "polygon" && bd.shapeData && "vertices" in bd.shapeData) {
        const verts = (bd.shapeData as { vertices: { x: number; y: number }[] }).vertices
          .map(v => new Vec2(v.x, v.y));
        body.attachShape(new PolygonShape(verts));
      }

      this.bodies.push(body);
    }
  }

  /** Destroy the world and release all resources. */
  destroy(): void {
    this.bodies.length = 0;
    this.constraintSolver.clear();
    this.accumulator = 0;
  }
}

/** Serialized world state format. */
export interface SerializedWorld {
  gravity: { x: number; y: number };
  velocityIterations: number;
  positionIterations: number;
  allowSleep: boolean;
  fixedDt?: number;
  bodies: SerializedBody[];
}

/** Serialized rigid body data. */
export interface SerializedBody {
  id: number;
  position: { x: number; y: number };
  angle: number;
  velocity: { x: number; y: number };
  angularVelocity: number;
  bodyType: BodyType;
  mass: number;
  restitution: number;
  friction: number;
  isSleeping: boolean;
  layer: number;
  mask: number;
  shapeType: string | null;
  shapeData?: Record<string, unknown>;
}

// ─── 7. Debug Rendering ────────────────────────────────────────────────────

/** Debug rendering configuration. */
export interface DebugRenderOptions {
  drawBodies: boolean;
  drawVelocities: boolean;
  drawAABBs: boolean;
  drawContacts: boolean;
  drawConstraints: boolean;
  bodyColor: string;
  staticColor: string;
  sleepingColor: string;
  aabbColor: string;
  contactColor: string;
  velocityColor: string;
  constraintColor: string;
  lineWidth: number;
  velocityScale: number;
}

/** Default debug render options. */
const DEFAULT_DEBUG_OPTIONS: DebugRenderOptions = {
  drawBodies: true,
  drawVelocities: false,
  drawAABBs: false,
  drawContacts: true,
  drawConstraints: true,
  bodyColor: "#4488ff",
  staticColor: "#888888",
  sleepingColor: "#44aa44",
  aabbColor: "#ff4444",
  contactColor: "#ffff00",
  velocityColor: "#00ffff",
  constraintColor: "#ff88ff",
  lineWidth: 1,
  velocityScale: 0.1,
};

/**
 * Render debug visualization of the physics world onto a 2D canvas context.
 */
export function debugRender(
  ctx: CanvasRenderingContext2D,
  world: PhysicsWorld,
  options: Partial<DebugRenderOptions> = {},
): void {
  const opts = { ...DEFAULT_DEBUG_OPTIONS, ...options };
  ctx.save();
  ctx.lineWidth = opts.lineWidth;

  // Draw bodies
  if (opts.drawBodies) {
    for (const body of world.getBodies()) {
      if (!body.isActive) continue;
      const color = body.bodyType === "static"
        ? opts.staticColor
        : body.isSleeping
          ? opts.sleepingColor
          : opts.bodyColor;
      ctx.strokeStyle = color;
      ctx.fillStyle = color + "22"; // transparent fill
      drawBody(ctx, body);
    }
  }

  // Draw AABBs
  if (opts.drawAABBs) {
    ctx.strokeStyle = opts.aabbColor;
    for (const body of world.getBodies()) {
      if (!body.isActive) continue;
      const aabb = body.getAABB();
      ctx.strokeRect(aabb.minX, aabb.minY, aabb.width, aabb.height);
    }
  }

  // Draw contacts
  if (opts.drawContacts) {
    ctx.fillStyle = opts.contactColor;
    for (const contact of world.getContacts()) {
      ctx.beginPath();
      ctx.arc(contact.point.x, contact.point.y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Draw normal
      ctx.beginPath();
      ctx.moveTo(contact.point.x, contact.point.y);
      ctx.lineTo(
        contact.point.x + contact.normal.x * 15,
        contact.point.y + contact.normal.y * 15,
      );
      ctx.stroke();
    }
  }

  // Draw velocity vectors
  if (opts.drawVelocities) {
    ctx.strokeStyle = opts.velocityColor;
    for (const body of world.getBodies()) {
      if (!body.isActive || body.bodyType === "static") continue;
      const velEnd = body.position.add(body.velocity.mul(opts.velocityScale));
      ctx.beginPath();
      ctx.moveTo(body.position.x, body.position.y);
      ctx.lineTo(velEnd.x, velEnd.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** Draw a single body's shape on the canvas context. */
function drawBody(ctx: CanvasRenderingContext2D, body: RigidBody2D): void {
  if (!body.shape) return;
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  switch (body.shape.type) {
    case "circle": {
      const c = body.shape as CircleShape;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Draw orientation line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(c.radius, 0);
      ctx.stroke();
      break;
    }
    case "polygon": {
      const p = body.shape as PolygonShape;
      ctx.beginPath();
      const v0 = p.vertices[0];
      ctx.moveTo(v0.x, v0.y);
      for (let i = 1; i < p.vertices.length; i++) {
        ctx.lineTo(p.vertices[i].x, p.vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "compound": {
      const comp = body.shape as CompoundShape;
      for (const child of comp.children) {
        ctx.save();
        ctx.translate(child.offset.x, child.offset.y);
        ctx.rotate(child.angle);
        drawChildShape(ctx, child.shape);
        ctx.restore();
      }
      break;
    }
  }

  ctx.restore();
}

/** Draw a child shape (used by compound shapes). */
function drawChildShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  switch (shape.type) {
    case "circle": {
      const c = shape as CircleShape;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "polygon": {
      const p = shape as PolygonShape;
      ctx.beginPath();
      ctx.moveTo(p.vertices[0].x, p.vertices[0].y);
      for (let i = 1; i < p.vertices.length; i++) {
        ctx.lineTo(p.vertices[i].x, p.vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
}

// ─── Force Generators ──────────────────────────────────────────────────────

/** Pre-built force generators for common physics effects. */
export const Forces = {
  /** Gravity force: F = m * g. */
  gravity(mass: number, g: Vec2): Vec2 { return g.mul(mass); },

  /** Spring force (Hooke's law): F = -k * (|x| - restLength) * direction. */
  spring(anchor: Vec2, attachment: Vec2, restLength: number, stiffness: number): Vec2 {
    const delta = attachment.sub(anchor);
    const dist = delta.length();
    if (dist < 1e-10) return Vec2.ZERO;
    const displacement = dist - restLength;
    return delta.normalize().mul(-stiffness * displacement);
  },

  /** Drag force: F = -c * |v|^2 * v_direction (quadratic drag). */
  drag(velocity: Vec2, dragCoeff: number): Vec2 {
    const speed = velocity.length();
    if (speed < 1e-10) return Vec2.ZERO;
    const dragMag = dragCoeff * speed * speed;
    return velocity.normalize().mul(-dragMag);
  },

  /** Linear drag: F = -c * v. */
  linearDrag(velocity: Vec2, coeff: number): Vec2 {
    return velocity.mul(-coeff);
  },

  /** Buoyancy force for simple fluid simulation. */
  buoyancy(surfaceY: number, bodyDepth: number, fluidDensity: number, bodyArea: number): Vec2 {
    if (bodyDepth <= 0) return Vec2.ZERO;
    const submergedRatio = Math.min(bodyDepth / bodyArea, 1);
    return new Vec2(0, -fluidDensity * 9.81 * bodyArea * submergedRatio);
  },

  /** Wind force applied at a surface point. */
  wind(windVelocity: Vec2, surfaceNormal: Vec2, dragCoeff: number, surfaceArea: number): Vec2 {
    const relWind = windVelocity;
    const pressure = 0.5 * 1.225 * relWind.lengthSq(); // air density ~1.225 kg/m^3
    const forceMag = pressure * dragCoeff * surfaceArea;
    // Project onto normal
    const dot = Math.max(relWind.dot(surfaceNormal), 0);
    return surfaceNormal.mul(forceMag * dot);
  },
};

// ─── Utility Functions ─────────────────────────────────────────────────────

/** Create a standard ground/floor body (static rectangle). */
export function createGround(y: number, width: number, thickness = 0.5): RigidBody2D {
  const body = new RigidBody2D({
    position: new Vec2(width / 2, y + thickness / 2),
    type: "static",
    friction: 0.8,
    restitution: 0.1,
  });
  body.attachShape(PolygonShape.createBox(width / 2, thickness / 2));
  return body;
}

/** Create a dynamic box body with common defaults. */
export function createBox(
  x: number, y: number,
  hw: number, hh: number,
  options: Partial<BodyDef> = {},
): RigidBody2D {
  const body = new RigidBody2D({ position: new Vec2(x, y), ...options });
  body.attachShape(PolygonShape.createBox(hw, hh));
  return body;
}

/** Create a dynamic circle body with common defaults. */
export function createCircle(
  x: number, y: number,
  radius: number,
  options: Partial<BodyDef> = {},
): RigidBody2D {
  const body = new RigidBody2D({ position: new Vec2(x, y), ...options });
  body.attachShape(new CircleShape(radius));
  return body;
}

/** Compute the moment of inertia for common shapes. */
export const Inertia = {
  /** Solid disk: I = 0.5 * m * r^2. */
  solidDisk(mass: number, radius: number): number {
    return 0.5 * mass * radius * radius;
  },
  /** Hollow ring: I = m * r^2. */
  hollowRing(mass: number, radius: number): number {
    return mass * radius * radius;
  },
  /** Rectangle: I = (1/12) * m * (w^2 + h^2). */
  rectangle(mass: number, width: number, height: number): number {
    return (mass / 12) * (width * width + height * height);
  },
  /** Rod about end: I = (1/3) * m * L^2. */
  rodAboutEnd(mass: number, length: number): number {
    return (mass / 3) * length * length;
  },
};

// ─── Exports Summary ───────────────────────────────────────────────────────
//
// Vectors:       Vec2, Vec3
// Bounds:        AABB
// Shapes:        Shape, CircleShape, PolygonShape, CompoundShape, ConvexShape
// Bodies:        RigidBody2D, BodyDef, BodyType, IntegrationMethod
// Contacts:      Contact, RaycastResult
// World:         PhysicsWorld, WorldSettings, ProfilingMetrics
// Constraints:   Constraint, DistanceConstraint, HingeConstraint, WeldConstraint,
//                SpringConstraint, MotorConstraint
// Collision:     testCircleCircle, testCircleAABB, testCircleLine, testPolygonSAT
// Algorithms:    gjkTest, epaPenetration
// Raycasting:    raycastAll
// Rendering:     debugRender, DebugRenderOptions
// Forces:        Forces (gravity, spring, drag, buoyancy, wind)
// Factories:     createGround, createBox, createCircle
// Math utils:    Inertia
// Serialization: SerializedWorld, SerializedBody
//
