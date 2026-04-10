/**
 * @module canvas-engine
 * @description A comprehensive 2D Canvas rendering engine with scene graph,
 * animation system, interaction handling, and export capabilities.
 */

// ─── Type Definitions ───────────────────────────────────────────────────────

/** Configuration options for creating a canvas. */
export interface CanvasOptions {
  /** Canvas width in CSS pixels. Defaults to container width. */
  width?: number;
  /** Canvas height in CSS pixels. Defaults to container height. */
  height?: number;
  /** Manual DPI scale override. Defaults to devicePixelRatio. */
  dpiScale?: number;
  /** Background fill color. */
  backgroundColor?: string;
  /** Enable antialiasing (via imageSmoothingEnabled). Default true. */
  antialias?: boolean;
}

/** 2D transform state for a node or camera. */
export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/** Camera / viewport state. */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

/** Render layer descriptor. */
export interface Layer {
  name: string;
  zIndex: number;
  visible: boolean;
  opaque: boolean;
}

/** Easing function signature. */
export interface EasingFunction {
  (t: number): number;
}

/** Keyframe definition for keyframe-based animations. */
export interface Keyframe<T = number> {
  time: number;       // 0..1 normalized
  value: T;
  easing?: EasingFunction;
}

/** Hit-test result returned by the HitTester. */
export interface HitTestResult {
  node: SceneNode | null;
  point: { x: number; y: number };
  localPoint: { x: number; y: number };
}

/** Render statistics collected each frame. */
export interface RenderStats {
  drawCalls: number;
  vertices: number;
  nodesRendered: number;
  dirtyRegions: number;
  frameTime: number;
  fps: number;
}

/** Shape type enumeration for ShapeNode. */
export type ShapeType =
  | 'rect'
  | 'roundedRect'
  | 'circle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'arc'
  | 'path';

/** Text alignment options. */
export type TextAlign = 'left' | 'center' | 'right';
export type TextBaseline = 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' | 'ideographic';

/** Image fit modes. */
export type ImageFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

/** Internal pool entry wrapper. */
interface PoolEntry<T> {
  item: T;
  inUse: boolean;
}

// ─── Easing Functions ───────────────────────────────────────────────────────

/** Built-in easing functions collection. */
export const Easings: Record<string, EasingFunction> = {
  linear: (t: number) => t,

  // Quadratic
  easeInQuad:    (t: number) => t * t,
  easeOutQuad:   (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t: number) => t * t * t,
  easeOutCubic:   (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quartic
  easeInQuart:    (t: number) => t * t * t * t,
  easeOutQuart:   (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Quintic
  easeInQuint:    (t: number) => t * t * t * t * t,
  easeOutQuint:   (t: number) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t: number) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t),

  // Sine
  easeInSine:    (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Exponential
  easeInExpo:    (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo:   (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // Circular
  easeInCirc:    (t: number) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc:   (t: number) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t: number) =>
    (t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2),

  // Back
  easeInBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t: number) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return (t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2);
  },

  // Elastic
  easeInElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  easeInOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const s = (t < 0.5)
      ? Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))
      : Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5)) + 1;
    return t < 0.5 ? s / 2 : s / 2 + 0.5;
  },

  // Bounce
  easeInBounce: (t: number) => 1 - Easings.easeOutBounce(1 - t),
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInOutBounce: (t: number) =>
    (t < 0.5 ? (1 - Easings.easeOutBounce(1 - 2 * t)) / 2 : (1 + Easings.easeOutBounce(2 * t - 1)) / 2),
};

// ─── Object Pool ────────────────────────────────────────────────────────────

/**
 * Generic object pool to reduce GC pressure from frequent allocations.
 * @internal
 */
class ObjectPool<T> {
  private _pool: PoolEntry<T>[] = [];
  private readonly _factory: () => T;
  private readonly _reset?: (item: T) => void;

  constructor(factory: () => T, reset?: (item: T) => void, initialSize = 32) {
    this._factory = factory;
    this._reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this._pool.push({ item: factory(), inUse: false });
    }
  }

  acquire(): T {
    const entry = this._pool.find(e => !e.inUse);
    if (entry) {
      entry.inUse = true;
      return entry.item;
    }
    const item = this._factory();
    this._pool.push({ item, inUse: true });
    return item;
  }

  release(item: T): void {
    const entry = this._pool.find(e => e.item === item);
    if (entry) {
      if (this._reset) this._reset(item);
      entry.inUse = false;
    }
  }

  get size(): number {
    return this._pool.length;
  }

  get activeCount(): number {
    return this._pool.filter(e => e.inUse).length;
  }
}

// ─── Dirty Region Tracker ──────────────────────────────────────────────────

/** Represents a rectangular dirty region that needs repainting. */
interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tracks dirty regions so only changed areas are redrawn.
 * @internal
 */
class DirtyRegionTracker {
  private _regions: DirtyRect[] = [];

  mark(x: number, y: number, width: number, height: number): void {
    this._regions.push({ x, y, width, height });
  }

  markFull(width: number, height: number): void {
    this._regions = [{ x: 0, y: 0, width, height }];
  }

  get regions(): ReadonlyArray<DirtyRect> {
    return this._regions;
  }

  get isDirty(): boolean {
    return this._regions.length > 0;
  }

  clear(): void {
    this._regions.length = 0;
  }

  /**
   * Merge overlapping dirty rects into a minimal set.
   */
  optimize(): void {
    if (this._regions.length <= 1) return;
    // Simple bounding-box merge for now
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of this._regions) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }
    this._regions = [{ x: minX, y: minY, width: maxX - minX, height: maxY - minY }];
  }
}

// ─── Scene Node Base ───────────────────────────────────────────────────────

/**
 * Base class for all scene graph nodes.
 * Provides position, rotation, scale, opacity, visibility, z-index, and child management.
 */
export class SceneNode {
  /** Unique identifier for this node. */
  readonly id: string = `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  /** Position in local coordinates. */
  x: number = 0;
  y: number = 0;

  /** Rotation in radians. */
  rotation: number = 0;

  /** Scale factors. */
  scaleX: number = 1;
  scaleY: number = 1;

  /** Opacity (0 transparent .. 1 fully opaque). */
  opacity: number = 1;

  /** Whether this node participates in rendering and hit-testing. */
  visible: boolean = true;

  /** Z-ordering hint within siblings. Higher values render on top. */
  zIndex: number = 0;

  /** Optional user-defined tag for identification. */
  tag?: string;

  /** Parent reference (set internally when added to a GroupNode). */
  parent: GroupNode | null = null;

  /** Whether this node clips its children to its bounds. */
  clipChildren: boolean = false;

  /** Cursor style when hovering over this node. */
  cursor: string = 'default';

  /** Arbitrary data payload attached to this node. */
  data: Record<string, unknown> = {};

  constructor() {}

  /** Get the computed world-space transform of this node. */
  getWorldTransform(): Transform {
    let tx = this.x, ty = this.y, tr = this.rotation, tsx = this.scaleX, tsy = this.scaleY;
    let p = this.parent;
    while (p) {
      // Apply parent transform (simplified concatenation)
      const cos = Math.cos(p.rotation), sin = Math.sin(p.rotation);
      const rx = tx * p.scaleX, ry = ty * p.scaleY;
      tx = p.x + rx * cos - ry * sin;
      ty = p.y + rx * sin + ry * cos;
      tr += p.rotation;
      tsx *= p.scaleX;
      tsy *= p.scaleY;
      p = p.parent;
    }
    return { x: tx, y: ty, rotation: tr, scaleX: tsx, scaleY: tsy };
  }

  /** Apply this node's transform to a rendering context. */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
  }

  /** Get the axis-aligned bounding box in local space. Override in subclasses. */
  getLocalBounds(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  /** Test whether a local-space point hits this node. Override in subclasses. */
  hitTestLocal(localX: number, localY: number): boolean {
    const b = this.getLocalBounds();
    return localX >= b.x && localX <= b.x + b.width && localY >= b.y && localY <= b.y + b.height;
  }

  /** Render this node. Override in subclasses. */
  render(ctx: CanvasRenderingContext2D): void {
    // Base implementation does nothing.
  }

  /** Called before children are rendered. Useful for clipping setup. */
  preRender(ctx: CanvasRenderingContext2D): void {}

  /** Called after children are rendered. Useful for clipping teardown. */
  postRender(ctx: CanvasRenderingContext2D): void {}
}

// ─── Group Node ─────────────────────────────────────────────────────────────

/**
 * Container node that holds child nodes and renders them in z-order.
 */
export class GroupNode extends SceneNode {
  private _children: SceneNode[] = [];

  constructor(children?: SceneNode[]) {
    super();
    if (children) {
      for (const c of children) this.addChild(c);
    }
  }

  /** Add a child node. */
  addChild(child: SceneNode): this {
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    this._children.push(child);
    this.sortChildren();
    return this;
  }

  /** Remove a child node. */
  removeChild(child: SceneNode): boolean {
    const idx = this._children.indexOf(child);
    if (idx >= 0) {
      this._children.splice(idx, 1);
      child.parent = null;
      return true;
    }
    return false;
  }

  /** Remove all children. */
  clearChildren(): void {
    for (const c of this._children) c.parent = null;
    this._children.length = 0;
  }

  /** Get read-only view of children. */
  get children(): ReadonlyArray<SceneNode> {
    return this._children;
  }

  /** Number of children. */
  get childCount(): number {
    return this._children.length;
  }

  /** Sort children by zIndex ascending. */
  sortChildren(): void {
    this._children.sort((a, b) => a.zIndex - b.zIndex);
  }

  /** Find first descendant matching predicate (depth-first). */
  find(predicate: (node: SceneNode) => boolean): SceneNode | null {
    if (predicate(this)) return this;
    for (const child of this._children) {
      if (child instanceof GroupNode) {
        const found = child.find(predicate);
        if (found) return found;
      } else if (predicate(child)) {
        return child;
      }
    }
    return null;
  }

  /** Visit every node depth-first with a visitor callback. */
  visit(visitor: (node: SceneNode) => void): void {
    visitor(this);
    for (const child of this._children) {
      if (child instanceof GroupNode) {
        child.visit(visitor);
      } else {
        visitor(child);
      }
    }
  }

  override getLocalBounds(): { x: number; y: number; width: number; height: number } {
    if (this._children.length === 0) return super.getLocalBounds();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of this._children) {
      const b = c.getLocalBounds();
      minX = Math.min(minX, c.x + b.x);
      minY = Math.min(minY, c.y + b.y);
      maxX = Math.max(maxX, c.x + b.x + b.width);
      maxY = Math.max(maxY, c.y + b.y + b.height);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.preRender(ctx);

    if (this.clipChildren) {
      const b = this.getLocalBounds();
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.width, b.height);
      ctx.clip();
    }

    for (const child of this._children) {
      if (!child.visible) continue;
      ctx.save();
      child.applyTransform(ctx);
      ctx.globalAlpha *= child.opacity;
      child.render(ctx);
      ctx.restore();
    }

    if (this.clipChildren) {
      ctx.restore();
    }

    this.postRender(ctx);
  }
}

// ─── Shape Node ─────────────────────────────────────────────────────────────

/** Options for constructing a ShapeNode. */
export interface ShapeOptions {
  shapeType: ShapeType;
  width?: number;
  height?: number;
  radius?: number;           // For circle / roundedRect corner radius
  radiusX?: number;          // For ellipse
  radiusY?: number;
  points?: Array<{ x: number; y: number }>; // For polygon / path
  startAngle?: number;       // For arc
  endAngle?: number;
  anticlockwise?: boolean;
  x2?: number; y2?: number; // For line
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  dashPattern?: number[];
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

/**
 * Renders a geometric shape: rectangle, rounded rectangle, circle, ellipse,
 * polygon, line, arc, or arbitrary path.
 */
export class ShapeNode extends SceneNode {
  shapeType: ShapeType;
  width: number = 0;
  height: number = 0;
  radius: number = 0;
  radiusX: number = 0;
  radiusY: number = 0;
  points: Array<{ x: number; y: number }> = [];
  startAngle: number = 0;
  endAngle: number = Math.PI * 2;
  anticlockwise: boolean = false;
  x2: number = 0;
  y2: number = 0;

  fillColor: string | null = null;
  strokeColor: string | null = null;
  strokeWidth: number = 1;
  dashPattern: number[] = [];
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  shadowColor: string = 'transparent';
  shadowBlur: number = 0;
  shadowOffsetX: number = 0;
  shadowOffsetY: number = 0;

  /** Gradient or pattern fill (overrides fillColor when set). */
  fillStyle: CanvasGradient | CanvasPattern | null = null;

  constructor(options: ShapeOptions) {
    super();
    this.shapeType = options.shapeType;
    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.radius = options.radius ?? 0;
    this.radiusX = options.radiusX ?? 0;
    this.radiusY = options.radiusY ?? 0;
    this.points = options.points ?? [];
    this.startAngle = options.startAngle ?? 0;
    this.endAngle = options.endAngle ?? Math.PI * 2;
    this.anticlockwise = options.anticlockwise ?? false;
    this.x2 = options.x2 ?? 0;
    this.y2 = options.y2 ?? 0;
    this.fillColor = options.fillColor ?? null;
    this.strokeColor = options.strokeColor ?? null;
    this.strokeWidth = options.strokeWidth ?? 1;
    this.dashPattern = options.dashPattern ?? [];
    this.lineCap = options.lineCap ?? 'butt';
    this.lineJoin = options.lineJoin ?? 'miter';
    this.shadowColor = options.shadowColor ?? 'transparent';
    this.shadowBlur = options.shadowBlur ?? 0;
    this.shadowOffsetX = options.shadowOffsetX ?? 0;
    this.shadowOffsetY = options.shadowOffsetY ?? 0;
  }

  override getLocalBounds(): { x: number; y: number; width: number; height: number } {
    switch (this.shapeType) {
      case 'rect':
      case 'roundedRect':
        return { x: 0, y: 0, width: this.width, height: this.height };
      case 'circle':
        return { x: -this.radius, y: -this.radius, width: this.radius * 2, height: this.radius * 2 };
      case 'ellipse':
        return { x: -this.radiusX, y: -this.radiusY, width: this.radiusX * 2, height: this.radiusY * 2 };
      case 'line':
        return {
          x: Math.min(0, this.x2),
          y: Math.min(0, this.y2),
          width: Math.abs(this.x2),
          height: Math.abs(this.y2),
        };
      case 'polygon':
      case 'path': {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of this.points) {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
      case 'arc': {
        const r = this.radius;
        return { x: -r, y: -r, width: r * 2, height: r * 2 };
      }
      default:
        return super.getLocalBounds();
    }
  }

  override hitTestLocal(localX: number, localY: number): boolean {
    switch (this.shapeType) {
      case 'rect':
      case 'roundedRect':
        return localX >= 0 && localX <= this.width && localY >= 0 && localY <= this.height;
      case 'circle': {
        const dx = localX, dy = localY;
        return dx * dx + dy * dy <= this.radius * this.radius;
      }
      case 'ellipse': {
        const dx = localX / this.radiusX, dy = localY / this.radiusY;
        return dx * dx + dy * dy <= 1;
      }
      default:
        return super.hitTestLocal(localX, localY);
    }
  }

  /** Build the path for this shape onto the given context. */
  buildPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    switch (this.shapeType) {
      case 'rect':
        ctx.rect(0, 0, this.width, this.height);
        break;
      case 'roundedRect':
        this.roundedRectPath(ctx, 0, 0, this.width, this.height, this.radius);
        break;
      case 'circle':
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        break;
      case 'ellipse':
        ctx.ellipse(0, 0, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
        break;
      case 'polygon':
        if (this.points.length > 0) {
          ctx.moveTo(this.points[0].x, this.points[0].y);
          for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
          }
          ctx.closePath();
        }
        break;
      case 'line':
        ctx.moveTo(0, 0);
        ctx.lineTo(this.x2, this.y2);
        break;
      case 'arc':
        ctx.arc(0, 0, this.radius, this.startAngle, this.endAngle, this.anticlockwise);
        break;
      case 'path':
        if (this.points.length > 0) {
          ctx.moveTo(this.points[0].x, this.points[0].y);
          for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
          }
        }
        break;
    }
  }

  private roundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  override render(ctx: CanvasRenderingContext2D): void {
    // Shadow
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowOffsetX = this.shadowOffsetX;
    ctx.shadowOffsetY = this.shadowOffsetY;

    // Stroke styling
    ctx.lineCap = this.lineCap;
    ctx.lineJoin = this.lineJoin;
    if (this.dashPattern.length > 0) {
      ctx.setLineDash(this.dashPattern);
    } else {
      ctx.setLineDash([]);
    }

    this.buildPath(ctx);

    // Fill
    if (this.fillStyle) {
      ctx.fillStyle = this.fillStyle;
    } else if (this.fillColor) {
      ctx.fillStyle = this.fillColor;
    }
    if (this.fillStyle || this.fillColor) {
      ctx.fill();
    }

    // Stroke
    if (this.strokeColor) {
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }

    // Reset shadow for subsequent draws
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.setLineDash([]);
  }
}

// ─── Text Node ──────────────────────────────────────────────────────────────

/** Options for constructing a TextNode. */
export interface TextOptions {
  text: string;
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  align?: TextAlign;
  baseline?: TextBaseline;
  maxWidth?: number;         // Word-wrap width
  lineHeight?: number;
  letterSpacing?: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

/**
 * Renders text with support for font styling, word wrapping, alignment,
 * letter spacing, stroke, and shadow.
 */
export class TextNode extends SceneNode {
  text: string;
  font: string = '16px sans-serif';
  color: string = '#000000';
  align: TextAlign = 'left';
  baseline: TextBaseline = 'alphabetic';
  maxWidth: number = 0;
  lineHeight: number = 1.2;
  letterSpacing: number = 0;
  strokeColor: string | null = null;
  strokeWidth: number = 0;
  shadowColor: string = 'transparent';
  shadowBlur: number = 0;
  shadowOffsetX: number = 0;
  shadowOffsetY: number = 0;

  /** Cached measured dimensions. */
  private _measuredWidth: number = 0;
  private _measuredHeight: number = 0;
  private _dirty: boolean = true;

  constructor(options: TextOptions) {
    super();
    this.text = options.text;
    this.fontSize = options.fontSize ?? 16;
    this.fontFamily = options.fontFamily ?? 'sans-serif';
    this.fontWeight = options.fontWeight ?? 'normal';
    this.font = options.font ?? `${this.fontSize}px ${this.fontFamily}`;
    this.color = options.color ?? '#000000';
    this.align = options.align ?? 'left';
    this.baseline = options.baseline ?? 'alphabetic';
    this.maxWidth = options.maxWidth ?? 0;
    this.lineHeight = options.lineHeight ?? 1.2;
    this.letterSpacing = options.letterSpacing ?? 0;
    this.strokeColor = options.strokeColor ?? null;
    this.strokeWidth = options.strokeWidth ?? 0;
    this.shadowColor = options.shadowColor ?? 'transparent';
    this.shadowBlur = options.shadowBlur ?? 0;
    this.shadowOffsetX = options.shadowOffsetX ?? 0;
    this.shadowOffsetY = options.shadowOffsetY ?? 0;
  }

  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;

  /** Mark cached measurements as stale. */
  invalidate(): void {
    this._dirty = true;
  }

  /** Measure text dimensions using an offscreen context (or the engine's context if available). */
  measure(ctx?: CanvasRenderingContext2D): { width: number; height: number } {
    if (!this._dirty && ctx) return { width: this._measuredWidth, height: this._measuredHeight };

    const c = ctx ?? ({ measureText: (t: string) => ({ width: t.length * this.fontSize * 0.6 }) } as CanvasRenderingContext2D);
    c.font = this.font;

    if (this.maxWidth > 0 && this.text.includes(' ')) {
      // Word wrap measurement
      const words = this.text.split(/\s+/);
      let line = '';
      let maxW = 0;
      let lineCount = 0;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (c.measureText(test).width > this.maxWidth && line) {
          maxW = Math.max(maxW, c.measureText(line).width);
          line = word;
          lineCount++;
        } else {
          line = test;
        }
      }
      if (line) { maxW = Math.max(maxW, c.measureText(line).width); lineCount++; }
      this._measuredWidth = maxW;
      this._measuredHeight = lineCount * this.fontSize * this.lineHeight;
    } else {
      this._measuredWidth = c.measureText(this.text).width + (this.letterSpacing * this.text.length);
      this._measuredHeight = this.fontSize * this.lineHeight;
    }
    this._dirty = false;
    return { width: this._measuredWidth, height: this._measuredHeight };
  }

  override getLocalBounds(): { x: number; y: number; width: number; height: number } {
    const m = this.measure();
    return { x: 0, y: 0, width: m.width, height: m.height };
  }

  override hitTestLocal(localX: number, localY: number): boolean {
    const b = this.getLocalBounds();
    return localX >= b.x && localX <= b.x + b.width && localY >= b.y && localY <= b.y + b.height;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    ctx.font = this.font;
    ctx.textAlign = this.align;
    ctx.textBaseline = this.baseline;
    ctx.fillStyle = this.color;

    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowOffsetX = this.shadowOffsetX;
    ctx.shadowOffsetY = this.shadowOffsetY;

    if (this.maxWidth > 0 && ctx.measureText(this.text).width > this.maxWidth) {
      this.drawWrappedText(ctx);
    } else if (this.letterSpacing !== 0) {
      this.drawLetterSpacedText(ctx);
    } else {
      ctx.fillText(this.text, 0, 0);
    }

    if (this.strokeColor) {
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.strokeWidth;
      if (this.maxWidth > 0 && ctx.measureText(this.text).width > this.maxWidth) {
        this.drawWrappedStroke(ctx);
      } else {
        ctx.strokeText(this.text, 0, 0);
      }
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  private drawWrappedText(ctx: CanvasRenderingContext2D): void {
    const words = this.text.split(/\s+/);
    let line = '';
    const lh = this.fontSize * this.lineHeight;
    let y = 0;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > this.maxWidth && line) {
        ctx.fillText(line, 0, y);
        line = word;
        y += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 0, y);
  }

  private drawWrappedStroke(ctx: CanvasRenderingContext2D): void {
    const words = this.text.split(/\s+/);
    let line = '';
    const lh = this.fontSize * this.lineHeight;
    let y = 0;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > this.maxWidth && line) {
        ctx.strokeText(line, 0, y);
        line = word;
        y += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.strokeText(line, 0, y);
  }

  private drawLetterSpacedText(ctx: CanvasRenderingContext2D): void {
    let x = 0;
    for (const ch of this.text) {
      ctx.fillText(ch, x, 0);
      x += ctx.measureText(ch).width + this.letterSpacing;
    }
  }
}

// ─── Image Node ─────────────────────────────────────────────────────────────

/** Options for constructing an ImageNode. */
export interface ImageOptions {
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap | string;
  width?: number;
  height?: number;
  fit?: ImageFit;
  crop?: { x: number; y: number; width: number; height: number };
  opacity?: number;
  smoothing?: boolean;
}

/**
 * Renders an image with support for crop regions, fit modes (fill/contain/cover/etc.),
 * and smoothing control.
 */
export class ImageNode extends SceneNode {
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap | string;
  width: number = 0;
  height: number = 0;
  fit: ImageFit = 'fill';
  crop: { x: number; y: number; width: number; height: number } | null = null;
  smoothing: boolean = true;

  private _loaded: boolean = false;
  private _imgEl: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null = null;

  constructor(options: ImageOptions) {
    super();
    this.source = options.source;
    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.fit = options.fit ?? 'fill';
    this.crop = options.crop ?? null;
    this.smoothing = options.smoothing ?? true;
    if (options.opacity !== undefined) this.opacity = options.opacity;

    this.loadSource();
  }

  private loadSource(): void {
    if (typeof this.source === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this._imgEl = img;
        this._loaded = true;
        if (this.width === 0) this.width = img.naturalWidth;
        if (this.height === 0) this.height = img.naturalHeight;
      };
      img.src = this.source;
    } else {
      this._imgEl = this.source;
      this._loaded = true;
      if (this.width === 0) this.width = ('naturalWidth' in this.source ? this.source.naturalWidth : this.source.width);
      if (this.height === 0) this.height = ('naturalHeight' in this.source ? this.source.naturalHeight : this.source.height);
    }
  }

  get loaded(): boolean {
    return this._loaded;
  }

  override getLocalBounds(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: this.width, height: this.height };
  }

  override hitTestLocal(localX: number, localY: number): boolean {
    return localX >= 0 && localX <= this.width && localY >= 0 && localY <= this.height;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    if (!this._loaded || !this._imgEl) return;

    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = this.smoothing;
    ctx.globalAlpha *= this.opacity;

    const src = this._imgEl;
    const srcW = ('naturalWidth' in src ? src.naturalWidth : src.width) as number;
    const srcH = ('naturalHeight' in src ? src.naturalHeight : src.height) as number;

    if (this.crop) {
      ctx.drawImage(src, this.crop.x, this.crop.y, this.crop.width, this.crop.height, 0, 0, this.width, this.height);
    } else {
      const dest = this.computeFitDest(srcW, srcH);
      ctx.drawImage(src, dest.dx, dest.dy, dest.dw, dest.dh);
    }

    ctx.imageSmoothingEnabled = prevSmoothing;
  }

  private computeFitDest(
    srcW: number, srcH: number,
  ): { dx: number; dy: number; dw: number; dh: number } {
    const dw = this.width || srcW;
    const dh = this.height || srcH;
    switch (this.fit) {
      case 'contain': {
        const ratio = Math.min(dw / srcW, dh / srcH);
        const sw = srcW * ratio, sh = srcH * ratio;
        return { dx: (dw - sw) / 2, dy: (dh - sh) / 2, dw: sw, dh: sh };
      }
      case 'cover': {
        const ratio = Math.max(dw / srcW, dh / srcH);
        const sw = srcW * ratio, sh = srcH * ratio;
        return { dx: (dw - sw) / 2, dy: (dh - sh) / 2, dw: sw, dh: sh };
      }
      case 'none':
        return { dx: 0, dy: 0, dw: srcW, dh: srcH };
      case 'scale-down': {
        const ratio = Math.min(1, dw / srcW, dh / srcH);
        return { dx: 0, dy: 0, dw: srcW * ratio, dh: srcH * ratio };
      }
      case 'fill':
      default:
        return { dx: 0, dy: 0, dw, dh };
    }
  }
}

// ─── Renderer ───────────────────────────────────────────────────────────────

/**
 * The main rendering pipeline. Manages layers, viewport/camera, clipping,
 * transform stack, and the draw cycle.
 */
export class Renderer {
  private _ctx: CanvasRenderingContext2D;
  private _layers: Layer[] = [];
  private _camera: Camera = { x: 0, y: 0, zoom: 1, rotation: 0 };
  private _transformStack: Transform[] = [];
  private _dirtyTracker: DirtyRegionTracker;
  private _stats: RenderStats = {
    drawCalls: 0, vertices: 0, nodesRendered: 0, dirtyRegions: 0, frameTime: 0, fps: 0,
  };
  private _frameStartTime: number = 0;
  private _fpsFrames: number = 0;
  private _fpsAccum: number = 0;
  private _lastFpsUpdate: number = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this._ctx = ctx;
    this._dirtyTracker = new DirtyRegionTracker();

    // Default layers
    this._layers = [
      { name: 'background', zIndex: 0, visible: true, opaque: true },
      { name: 'main', zIndex: 1, visible: true, opaque: false },
      { name: 'overlay', zIndex: 2, visible: true, opaque: false },
      { name: 'ui', zIndex: 3, visible: true, opaque: false },
    ];
  }

  /** Access the underlying 2D rendering context. */
  get context(): CanvasRenderingContext2D {
    return this._ctx;
  }

  /** Current camera/viewport state. */
  get camera(): Camera {
    return { ...this._camera };
  }

  set camera(cam: Camera) {
    this._camera = { ...cam };
  }

  /** Read-only render statistics from the last frame. */
  get stats(): RenderStats {
    return { ...this._stats };
  }

  /** Layer list (mutable). */
  get layers(): Layer[] {
    return this._layers;
  }

  /** Clear the entire canvas with the background color. */
  clear(color?: string): void {
    this._stats.drawCalls++;
    const ctx = this._ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.restore();
  }

  /** Apply the camera transform to the context. */
  applyCamera(): void {
    const { x, y, zoom, rotation } = this._camera;
    const cx = this._ctx.canvas.width / 2;
    const cy = this._ctx.canvas.height / 2;
    this._ctx.translate(cx, cy);
    this._ctx.rotate(rotation);
    this._ctx.scale(zoom, zoom);
    this._ctx.translate(-cx + x, -cy + y);
  }

  /** Push current transform onto the stack. */
  pushMatrix(): void {
    this._transformStack.push({
      x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
    });
    this._ctx.save();
  }

  /** Pop transform from the stack. */
  popMatrix(): void {
    this._transformStack.pop();
    this._ctx.restore();
  }

  /** Begin recording render statistics for a new frame. */
  beginFrame(): void {
    this._frameStartTime = performance.now();
    this._stats.drawCalls = 0;
    this._stats.vertices = 0;
    this._stats.nodesRendered = 0;
    this._stats.dirtyRegions = this._dirtyTracker.regions.length;
  }

  /** Finalize frame and update FPS counter. */
  endFrame(): void {
    const now = performance.now();
    this._stats.frameTime = now - this._frameStartTime;
    this._fpsFrames++;
    this._fpsAccum += this._stats.frameTime;
    if (now - this._lastFpsUpdate >= 1000) {
      this._stats.fps = Math.round((this._fpsFrames * 1000) / this._fpsAccum);
      this._fpsFrames = 0;
      this._fpsAccum = 0;
      this._lastFpsUpdate = now;
    }
    this._dirtyTracker.clear();
  }

  /** Increment draw call counter. */
  recordDrawCall(vertexCount = 0): void {
    this._stats.drawCalls++;
    this._stats.vertices += vertexCount;
  }

  /** Increment nodes-rendered counter. */
  recordNode(): void {
    this._stats.nodesRendered++;
  }

  /** Mark a region as dirty (needs repaint). */
  markDirty(x: number, y: number, width: number, height: number): void {
    this._dirtyTracker.mark(x, y, width, height);
  }

  /** Mark the entire canvas as dirty. */
  markAllDirty(): void {
    this._dirtyTracker.markFull(this._ctx.canvas.width, this._ctx.canvas.height);
  }

  /** Check if there are any dirty regions needing repaint. */
  get hasDirtyRegions(): boolean {
    return this._dirtyTracker.isDirty;
  }

  /** Set up a rectangular clipping region. */
  clipRect(x: number, y: number, width: number, height: number): void {
    this._ctx.save();
    this._ctx.beginPath();
    this._ctx.rect(x, y, width, height);
    this._ctx.clip();
  }

  /** Set up a circular clipping region. */
  clipCircle(cx: number, cy: number, radius: number): void {
    this._ctx.save();
    this._ctx.beginPath();
    this._ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this._ctx.clip();
  }

  /** Set up a path-based clipping region. */
  clipPath(points: Array<{ x: number; y: number }>): void {
    this._ctx.save();
    this._ctx.beginPath();
    if (points.length > 0) {
      this._ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this._ctx.lineTo(points[i].x, points[i].y);
      }
    }
    this._ctx.closePath();
    this._ctx.clip();
  }

  /** Restore context state after clipping. */
  restoreClip(): void {
    this._ctx.restore();
  }

  /** Draw a scene graph root node through the full pipeline. */
  draw(root: SceneNode, bgColor?: string): void {
    this.beginFrame();
    const ctx = this._ctx;

    // Clear
    this.clear(bgColor);

    // Apply camera
    ctx.save();
    this.applyCamera();

    // Render by layer (we simply render the whole tree; layer filtering would need layer tags on nodes)
    root.render(ctx);

    ctx.restore();
    this.endFrame();
  }

  // ── Drawing Primitive Helpers ──

  /** Create a linear gradient. */
  createLinearGradient(x0: number, y0: number, x1: number, y1: number, stops: Array<[number, string]>): CanvasGradient {
    const grad = this._ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [offset, color] of stops) grad.addColorStop(offset, color);
    return grad;
  }

  /** Create a radial gradient. */
  createRadialGradient(
    x0: number, y0: number, r0: number,
    x1: number, y1: number, r1: number,
    stops: Array<[number, string]>,
  ): CanvasGradient {
    const grad = this._ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    for (const [offset, color] of stops) grad.addColorStop(offset, color);
    return grad;
  }

  /** Create a conic gradient (falls back to radial where unsupported). */
  createConicGradient(startAngle: number, x: number, y: number, stops: Array<[number, string]>): CanvasGradient | CanvasPattern {
    const ctx = this._ctx;
    if ('createConicGradient' in ctx) {
      const grad = (ctx as any).createConicGradient(startAngle, x, y);
      for (const [offset, color] of stops) grad.addColorStop(offset, color);
      return grad;
    }
    // Fallback: approximate with radial
    return this.createRadialGradient(x, y, 0, x, y, Math.max(ctx.canvas.width, ctx.canvas.height), stops);
  }

  /** Create a pattern from an image or canvas. */
  createPattern(
    source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    repetition: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat' = 'repeat',
  ): CanvasPattern | null {
    return this._ctx.createPattern(source, repetition);
  }

  /** Draw a bezier curve (cubic). */
  drawBezierCurve(
    cp1x: number, cp1y: number,
    cp2x: number, cp2y: number,
    x: number, y: number,
    strokeStyle?: string, lineWidth = 1,
  ): void {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    this.recordDrawCall(4);
  }

  /** Draw a quadratic bezier curve. */
  drawQuadraticCurve(
    cpx: number, cpy: number,
    x: number, y: number,
    strokeStyle?: string, lineWidth = 1,
  ): void {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(cpx, cpy, x, y);
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    this.recordDrawCall(3);
  }
}

// ─── Animation Controller ───────────────────────────────────────────────────

/** Callback signature for the animation loop. */
export type FrameCallback = (deltaTime: number, elapsedTime: number) => void;

/**
 * Drives the requestAnimationFrame loop, providing delta-time and elapsed time
 * to subscribers.
 */
export class AnimationController {
  private _running: boolean = false;
  private _rafId: number = 0;
  private _callbacks: Set<FrameCallback> = new Set();
  private _lastTime: number = 0;
  private _elapsed: number = 0;
  private _animators: Set<Animator<any>> = new Set();

  constructor() {}

  /** Is the loop currently running? */
  get running(): boolean {
    return this._running;
  }

  /** Total elapsed time since start (ms). */
  get elapsed(): number {
    return this._elapsed;
  }

  /** Subscribe a callback to the animation frame loop. */
  onFrame(cb: FrameCallback): () => void {
    this._callbacks.add(cb);
    return () => { this._callbacks.delete(cb); };
  }

  /** Register an animator for automatic updates. */
  addAnimator<T>(animator: Animator<T>): void {
    this._animators.add(animator);
  }

  /** Unregister an animator. */
  removeAnimator<T>(animator: Animator<T>): void {
    this._animators.delete(animator);
  }

  /** Start the animation loop. */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._elapsed = 0;
    this._tick(this._lastTime);
  }

  /** Stop the animation loop. */
  stop(): void {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = 0;
  }

  private _tick = (now: number): void => {
    if (!this._running) return;
    const dt = now - this._lastTime;
    this._lastTime = now;
    this._elapsed += dt;

    // Update animators
    for (const anim of this._animators) {
      anim.update(dt);
    }

    // Fire callbacks
    for (const cb of this._callbacks) {
      cb(dt, this._elapsed);
    }

    this._rafId = requestAnimationFrame(this._tick);
  };
}

// ─── Animator ───────────────────────────────────────────────────────────────

/** Options for creating an Animator instance. */
export interface AnimatorOptions<T> {
  from: T;
  to: T;
  duration: number;           // ms
  easing?: EasingFunction | string;
  onUpdate?: (value: T, progress: number) => void;
  onComplete?: () => void;
  keyframes?: Keyframe<T>[];  // If provided, from/to are ignored
  loop?: boolean;             // Repeat indefinitely
  yoyo?: boolean;             // Reverse direction at end
  delay?: number;             // Delay before starting (ms)
}

/**
 * Interpolates a value over time using easing functions or keyframes.
 * Supports numeric values, objects of numbers, and custom interpolators.
 */
export class Animator<T> {
  from: T;
  to: T;
  duration: number;
  easing: EasingFunction;
  onUpdate?: (value: T, progress: number) => void;
  onComplete?: () => void;
  keyframes: Keyframe<T>[] | null = null;
  loop: boolean = false;
  yoyo: boolean = false;
  delay: number = 0;

  private _time: number = 0;
  private _playing: boolean = false;
  private _finished: boolean = false;
  private _direction: 1 | -1 = 1;
  private _delayElapsed: number = 0;

  constructor(options: AnimatorOptions<T>) {
    this.from = options.from;
    this.to = options.to;
    this.duration = options.duration;
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
    this.keyframes = options.keyframes ?? null;
    this.loop = options.loop ?? false;
    this.yoyo = options.yoyo ?? false;
    this.delay = options.delay ?? 0;

    if (typeof options.easing === 'string') {
      this.easing = Easings[options.easing] ?? Easings.linear;
    } else if (options.easing) {
      this.easing = options.easing;
    } else {
      this.easing = Easings.linear;
    }
  }

  /** Current interpolated value. */
  get value(): T {
    return this.interpolate(this.progress);
  }

  /** Normalized progress 0..1. */
  get progress(): number {
    return Math.min(1, Math.max(0, this._time / this.duration));
  }

  /** Is the animator currently playing? */
  get playing(): boolean {
    return this._playing;
  }

  /** Has the animator finished (non-looping)? */
  get finished(): boolean {
    return this._finished;
  }

  /** Start or resume playback. */
  play(): void {
    this._playing = true;
    this._finished = false;
    if (this._time >= this.duration && !this.loop) {
      this._time = 0;
      this._direction = 1;
    }
  }

  /** Pause playback. */
  pause(): void {
    this._playing = false;
  }

  /** Stop and reset to initial state. */
  stop(): void {
    this._playing = false;
    this._finished = false;
    this._time = 0;
    this._direction = 1;
    this._delayElapsed = 0;
  }

  /** Seek to a specific progress value (0..1). */
  seek(progress: number): void {
    this._time = Math.max(0, Math.min(1, progress)) * this.duration;
    if (this.onUpdate) this.onUpdate(this.value, this.progress);
  }

  /** Advance time by delta milliseconds. Called by AnimationController. */
  update(dt: number): void {
    if (!this._playing || this._finished) return;

    if (this._delayElapsed < this.delay) {
      this._delayElapsed += dt;
      return;
    }

    this._time += dt * this._direction;

    if (this._time >= this.duration) {
      if (this.loop) {
        if (this.yoyo) {
          this._direction *= -1;
          this._time = this.duration;
        } else {
          this._time = 0;
        }
      } else {
        this._time = this.duration;
        this._playing = false;
        this._finished = true;
        if (this.onComplete) this.onComplete();
      }
    } else if (this._time <= 0 && this.yoyo) {
      this._direction = 1;
      this._time = 0;
    }

    if (this.onUpdate) this.onUpdate(this.value, this.progress);
  }

  /** Compute the interpolated value at the current progress. */
  interpolate(t: number): T {
    const easedT = this.easing(t);

    if (this.keyframes && this.keyframes.length > 0) {
      return this.interpolateKeyframes(easedT);
    }

    return this.lerp(this.from, this.to, easedT);
  }

  private lerp(a: T, b: T, t: number): T {
    if (typeof a === 'number' && typeof b === 'number') {
      return (a + (b - a) * t) as T;
    }
    if (typeof a === 'object' && typeof b === 'object' && a && b) {
      const result: any = {};
      for (const k of Object.keys(a)) {
        if (k in (b as object)) {
          result[k] = (a as any)[k] + (((b as any)[k] - (a as any)[k]) * t);
        }
      }
      return result as T;
    }
    return t < 0.5 ? a : b;
  }

  private interpolateKeyframes(t: number): T {
    const kfs = this.keyframes!;
    if (kfs.length === 0) return this.from;
    if (t <= kfs[0].time) return kfs[0].value;
    if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

    // Find surrounding keyframes
    let lower = kfs[0];
    for (let i = 1; i < kfs.length; i++) {
      if (kfs[i].time <= t) lower = kfs[i];
      else break;
    }
    const upperIdx = kfs.indexOf(lower) + 1;
    if (upperIdx >= kfs.length) return lower.value;
    const upper = kfs[upperIdx];

    const range = upper.time - lower.time;
    const localT = range > 0 ? (t - lower.time) / range : 0;
    const easing = upper.easing ?? Easings.linear;
    return this.lerp(lower.value, upper.value, easing(localT));
  }
}

// ─── Path Animator ──────────────────────────────────────────────────────────

/**
 * Animates a position along an SVG-style path defined by points.
 */
export class PathAnimator {
  private _points: Array<{ x: number; y: number }>;
  private _totalLength: number = 0;
  private _segmentLengths: number[] = [];

  constructor(points: Array<{ x: number; y: number }>) {
    this._points = points;
    this.precompute();
  }

  private precompute(): void {
    this._segmentLengths = [];
    this._totalLength = 0;
    for (let i = 1; i < this._points.length; i++) {
      const dx = this._points[i].x - this._points[i - 1].x;
      const dy = this._points[i].y - this._points[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      this._segmentLengths.push(len);
      this._totalLength += len;
    }
  }

  /** Get position along the path at normalized progress (0..1). */
  getPosition(t: number): { x: number; y: number; angle: number } {
    const clampedT = Math.max(0, Math.min(1, t));
    const targetDist = clampedT * this._totalLength;
    let accDist = 0;

    for (let i = 0; i < this._segmentLengths.length; i++) {
      const segLen = this._segmentLengths[i];
      if (accDist + segLen >= targetDist) {
        const segT = segLen > 0 ? (targetDist - accDist) / segLen : 0;
        const p0 = this._points[i];
        const p1 = this._points[i + 1];
        const x = p0.x + (p1.x - p0.x) * segT;
        const y = p0.y + (p1.y - p0.y) * segT;
        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        return { x, y, angle };
      }
      accDist += segLen;
    }

    const last = this._points[this._points.length - 1];
    return { x: last.x, y: last.y, angle: 0 };
  }

  /** Total length of the path in pixels. */
  get totalLength(): number {
    return this._totalLength;
  }
}

// ─── Hit Tester ─────────────────────────────────────────────────────────────

/** Event handler types for canvas interaction. */
export type CanvasEventHandler = (event: MouseEvent | TouchEvent, node: SceneNode | null, localPos: { x: number; y: number }) => void;

/**
 * Performs point-in-shape hit testing against the scene graph and manages
 * event delegation for pointer/touch interactions.
 */
export class HitTester {
  private _root: SceneNode | null = null;
  private _handlers: Map<string, Set<CanvasEventHandler>> = new Map();
  private _dragState: {
    dragging: boolean;
    node: SceneNode | null;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } = {
    dragging: false, node: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0,
  };
  private _selectionBox: { active: boolean; startX: number; startY: number; endX: number; endY: number } | null = null;
  private _onSelectionChange?: (box: { x: number; y: number; width: number; height: number } | null, nodes: SceneNode[]) => void;

  constructor(root?: SceneNode) {
    if (root) this._root = root;
  }

  /** Set the root node for hit testing. */
  setRoot(root: SceneNode): void {
    this._root = root;
  }

  /** Test a point (in world coordinates) against the scene graph. Returns the topmost hit node. */
  test(worldX: number, worldY: number): HitTestResult {
    if (!this._root) {
      return { node: null, point: { x: worldX, y: worldY }, localPoint: { x: worldX, y: worldY } };
    }

    const hits: SceneNode[] = [];
    this.collectHits(this._root, worldX, worldY, hits);

    const topHit = hits.length > 0 ? hits[hits.length - 1] : null;

    // Convert to local coords of the hit node
    let lx = worldX, ly = worldY;
    if (topHit) {
      const inv = this.inverseTransform(topHit);
      lx = inv.x;
      ly = inv.y;
    }

    return { node: topHit, point: { x: worldX, y: worldY }, localPoint: { x: lx, y: ly } };
  }

  private collectHits(node: SceneNode, wx: number, wy: number, results: SceneNode[]): void {
    if (!node.visible) return;

    // Convert world point to node-local space
    const local = this.worldToLocal(node, wx, wy);

    if (node.hitTestLocal(local.x, local.y)) {
      results.push(node);
    }

    if (node instanceof GroupNode) {
      for (const child of node.children) {
        this.collectHits(child, wx, wy, results);
      }
    }
  }

  private worldToLocal(node: SceneNode, wx: number, wy: number): { x: number; y: number } {
    // Walk up the parent chain and invert transforms
    let x = wx, y = wy;
    const chain: SceneNode[] = [];
    let n: SceneNode | null = node;
    while (n) { chain.unshift(n); n = n.parent; }

    for (const nd of chain) {
      // Inverse translate
      x -= nd.x;
      y -= nd.y;
      // Inverse rotate
      if (nd.rotation !== 0) {
        const cos = Math.cos(-nd.rotation), sin = Math.sin(-nd.rotation);
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;
        x = rx; y = ry;
      }
      // Inverse scale
      if (nd.scaleX !== 0) x /= nd.scaleX;
      if (nd.scaleY !== 0) y /= nd.scaleY;
    }
    return { x, y };
  }

  private inverseTransform(node: SceneNode): { x: number; y: number } {
    return this.worldToLocal(node, node.x, node.y);
  }

  // ── Event Delegation ──

  /** Register an event handler. */
  on(event: string, handler: CanvasEventHandler): () => void {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event)!.add(handler);
    return () => { this._handlers.get(event)?.delete(handler); };
  }

  /** Fire an event to registered handlers. */
  private fire(event: string, ev: MouseEvent | TouchEvent, node: SceneNode | null, localPos: { x: number; y: number }): void {
    const handlers = this._handlers.get(event);
    if (handlers) {
      for (const h of handlers) h(ev, node, localPos);
    }
  }

  /** Wire up event listeners to a canvas element. */
  attachTo(canvas: HTMLCanvasElement, engine: CanvasEngine): void {
    const toCanvasPos = (ev: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      const dpi = engine.dpiScale;
      return {
        x: (ev.clientX - rect.left) * dpi,
        y: (ev.clientY - rect.top) * dpi,
      };
    };

    canvas.addEventListener('mousedown', (ev) => {
      const pos = toCanvasPos(ev);
      const hit = this.test(pos.x, pos.y);
      this.fire('mousedown', ev, hit.node, hit.localPoint);

      // Initiate drag
      this._dragState = {
        dragging: true,
        node: hit.node,
        offsetX: hit.localPoint.x,
        offsetY: hit.localPoint.y,
        startX: pos.x,
        startY: pos.y,
      };

      // Initiate selection box
      if (!hit.node) {
        this._selectionBox = { active: true, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y };
      }
    });

    canvas.addEventListener('mousemove', (ev) => {
      const pos = toCanvasPos(ev);
      const hit = this.test(pos.x, pos.y);
      this.fire('mousemove', ev, hit.node, hit.localPoint);

      // Update cursor
      if (hit.node && hit.node.cursor !== 'default') {
        canvas.style.cursor = hit.node.cursor;
      } else {
        canvas.style.cursor = 'default';
      }

      // Drag
      if (this._dragState.dragging && this._dragState.node) {
        this.fire('drag', ev, this._dragState.node, hit.localPoint);
      }

      // Selection box
      if (this._selectionBox?.active) {
        this._selectionBox.endX = pos.x;
        this._selectionBox.endY = pos.y;
        this.fire('selecting', ev, null, { x: pos.x, y: pos.y });
      }
    });

    canvas.addEventListener('mouseup', (ev) => {
      const pos = toCanvasPos(ev);
      const hit = this.test(pos.x, pos.y);
      this.fire('mouseup', ev, hit.node, hit.localPoint);

      // Click detection (minimal movement threshold)
      if (this._dragState.dragging) {
        const dx = pos.x - this._dragState.startX;
        const dy = pos.y - this._dragState.startY;
        if (Math.sqrt(dx * dx + dy * dy) < 5) {
          this.fire('click', ev, hit.node, hit.localPoint);
        }
        this.fire('drop', ev, this._dragState.node, hit.localPoint);
      }

      this._dragState.dragging = false;
      this._dragState.node = null;

      // Finalize selection box
      if (this._selectionBox?.active) {
        const sb = this._selectionBox;
        const box = {
          x: Math.min(sb.startX, sb.endX),
          y: Math.min(sb.startY, sb.endY),
          width: Math.abs(sb.endX - sb.startX),
          height: Math.abs(sb.endY - sb.startY),
        };
        if (box.width > 2 && box.height > 2) {
          const selected = this.selectInBox(box);
          this.fire('selection', ev, null, { x: box.x, y: box.y });
          if (this._onSelectionChange) this._onSelectionChange(box, selected);
        }
        this._selectionBox = null;
      }
    });

    canvas.addEventListener('wheel', (ev) => {
      const pos = toCanvasPos(ev);
      const hit = this.test(pos.x, pos.y);
      this.fire('wheel', ev, hit.node, hit.localPoint);
    }, { passive: true });

    // Touch support
    canvas.addEventListener('touchstart', (ev) => {
      const touch = ev.touches[0];
      const pos = toCanvasPos(touch);
      const hit = this.test(pos.x, pos.y);
      this.fire('mousedown', ev, hit.node, hit.localPoint);
      this._dragState = {
        dragging: true, node: hit.node,
        offsetX: hit.localPoint.x, offsetY: hit.localPoint.y,
        startX: pos.x, startY: pos.y,
      };
    }, { passive: true });

    canvas.addEventListener('touchmove', (ev) => {
      const touch = ev.touches[0];
      const pos = toCanvasPos(touch);
      const hit = this.test(pos.x, pos.y);
      this.fire('mousemove', ev, hit.node, hit.localPoint);
      if (this._dragState.dragging && this._dragState.node) {
        this.fire('drag', ev, this._dragState.node, hit.localPoint);
      }
    }, { passive: true });

    canvas.addEventListener('touchend', (ev) => {
      this._dragState.dragging = false;
      this._dragState.node = null;
      this.fire('mouseup', ev, null, { x: 0, y: 0 });
    }, { passive: true });
  }

  /** Find all nodes whose bounds intersect the selection rectangle. */
  selectInBox(box: { x: number; y: number; width: number; height: number }): SceneNode[] {
    const results: SceneNode[] = [];
    if (!this._root) return results;
    this.collectInBox(this._root, box, results);
    return results;
  }

  private collectInBox(node: SceneNode, box: { x: number; y: number; width: number; height: number }, results: SceneNode[]): void {
    if (!node.visible) return;
    const b = node.getWorldTransform();
    const nb = node.getLocalBounds();
    // Approximate world bounds (ignoring rotation for simplicity)
    const worldBounds = {
      x: b.x + nb.x * b.scaleX,
      y: b.y + nb.y * b.scaleY,
      width: nb.width * Math.abs(b.scaleX),
      height: nb.height * Math.abs(b.scaleY),
    };
    if (
      worldBounds.x < box.x + box.width &&
      worldBounds.x + worldBounds.width > box.x &&
      worldBounds.y < box.y + box.height &&
      worldBounds.y + worldBounds.height > box.y
    ) {
      results.push(node);
    }
    if (node instanceof GroupNode) {
      for (const child of node.children) {
        this.collectInBox(child, box, results);
      }
    }
  }

  /** Get the current selection box rectangle (during active rubber-band selection). */
  getSelectionBox(): { x: number; y: number; width: number; height: number } | null {
    if (!this._selectionBox?.active) return null;
    const sb = this._selectionBox;
    return {
      x: Math.min(sb.startX, sb.endX),
      y: Math.min(sb.startY, sb.endY),
      width: Math.abs(sb.endX - sb.startX),
      height: Math.abs(sb.endY - sb.startY),
    };
  }

  /** Set a callback invoked when the selection box is finalized. */
  onSelectionChange(callback: (box: { x: number; y: number; width: number; height: number } | null, nodes: SceneNode[]) => void): void {
    this._onSelectionChange = callback;
  }
}

// ─── Canvas Engine ──────────────────────────────────────────────────────────

/**
 * Main entry point for the canvas rendering engine. Wraps an HTMLCanvasElement
 * (or OffscreenCanvas) with HiDPI support, resize handling, and integrates
 * the renderer, animation controller, and hit tester.
 *
 * @example
 * ```ts
 * const engine = createCanvas(container, { width: 800, height: 600, backgroundColor: '#1a1a2e' });
 * const root = new GroupNode();
 * root.addChild(new ShapeNode({ shapeType: 'rect', width: 200, height: 100, fillColor: '#e94560' }));
 * engine.sceneRoot = root;
 * engine.start();
 * ```
 */
export class CanvasEngine {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  readonly ctx: CanvasRenderingContext2D;
  readonly renderer: Renderer;
  readonly animation: AnimationController;
  readonly hitTester: HitTester;

  private _container: HTMLElement | null = null;
  private _dpiScale: number;
  private _backgroundColor: string | null = null;
  private _sceneRoot: GroupNode = new GroupNode();
  private _resizeObserver: ResizeObserver | null = null;
  private _pool: ObjectPool<{ x: number; y: number }>;
  private _autoRender: boolean = true;

  /**
   * Use `createCanvas()` instead of calling this constructor directly.
   * @internal
   */
  constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options: CanvasOptions = {},
  ) {
    this.canvas = canvas;
    this._dpiScale = options.dpiScale ?? window.devicePixelRatio ?? 1;
    this._backgroundColor = options.backgroundColor ?? null;

    // Acquire 2D context
    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false,
    });
    if (!ctx) throw new Error('Failed to acquire 2D rendering context');
    this.ctx = ctx;

    // Antialias
    if (options.antialias !== false) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    // Size
    const w = options.width ?? (canvas instanceof HTMLCanvasElement ? canvas.clientWidth : 300);
    const h = options.height ?? (canvas instanceof HTMLCanvasElement ? canvas.clientHeight : 150);
    this.resize(w, h);

    // Subsystems
    this.renderer = new Renderer(ctx, w * this._dpiScale, h * this._dpiScale);
    this.animation = new AnimationController();
    this.hitTester = new HitTester(this._sceneRoot);

    // Object pool for coordinate pairs (used internally during hit testing etc.)
    this._pool = new ObjectPool(
      () => ({ x: 0, y: 0 }),
      (item) => { item.x = 0; item.y = 0; },
      64,
    );

    // Auto-render on each animation frame
    this.animation.onFrame(() => {
      if (this._autoRender && this._sceneRoot) {
        this.renderer.draw(this._sceneRoot, this._backgroundColor ?? undefined);
      }
    });
  }

  /** Current device pixel ratio scale factor being used. */
  get dpiScale(): number {
    return this._dpiScale;
  }

  /** The root group node of the scene graph. Assign your scene here. */
  get sceneRoot(): GroupNode {
    return this._sceneRoot;
  }

  set sceneRoot(root: GroupNode) {
    this._sceneRoot = root;
    this.hitTester.setRoot(root);
  }

  /** Background color used when clearing each frame. */
  get backgroundColor(): string | null {
    return this._backgroundColor;
  }

  set backgroundColor(color: string | null) {
    this._backgroundColor = color;
  }

  /** Width of the canvas in CSS pixels. */
  get width(): number {
    return (this.canvas as HTMLCanvasElement).clientWidth ?? (this.canvas as OffscreenCanvas).width / this._dpiScale;
  }

  /** Height of the canvas in CSS pixels. */
  get height(): number {
    return (this.canvas as HTMLCanvasElement).clientHeight ?? (this.canvas as OffscreenCanvas).height / this._dpiScale;
  }

  /** Physical width in device pixels. */
  get physicalWidth(): number {
    return this.canvas.width;
  }

  /** Physical height in device pixels. */
  get physicalHeight(): number {
    return this.canvas.height;
  }

  /** Whether auto-render is enabled (renders on every animation frame). */
  get autoRender(): boolean {
    return this._autoRender;
  }

  set autoRender(val: boolean) {
    this._autoRender = val;
  }

  /** Render statistics from the most recent frame. */
  get stats(): RenderStats {
    return this.renderer.stats;
  }

  /** Resize the canvas to the given CSS pixel dimensions, applying HiDPI scaling. */
  resize(cssWidth: number, cssHeight: number): void {
    const w = Math.max(1, Math.round(cssWidth * this._dpiScale));
    const h = Math.max(1, Math.round(cssHeight * this._dpiScale));
    this.canvas.width = w;
    this.canvas.height = h;
    // CSS display size
    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.style.width = `${cssWidth}px`;
      this.canvas.style.height = `${cssHeight}px`;
    }
    this.renderer.markAllDirty();
  }

  /** Make the canvas responsive to its container's size changes. */
  enableResponsiveResize(container: HTMLElement): void {
    this._container = container;
    if (this.canvas instanceof HTMLCanvasElement) {
      container.appendChild(this.canvas);
    }
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { inlineSize, blockSize } = entry.contentBoxSize[0] ?? entry.contentRect;
        this.resize(inlineSize, blockSize);
      }
    });
    this._resizeObserver.observe(container);
  }

  /** Stop responsive resizing and clean up the observer. */
  disableResponsiveResize(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this._container = null;
  }

  /** Detect whether WebGL context is available (for potential future use). */
  detectWebGL(): boolean {
    if (typeof (this.canvas as any).getContext !== 'function') return false;
    const gl = (this.canvas as any).getContext('webgl2') ?? (this.canvas as any).getContext('webgl');
    return gl != null;
  }

  /** Start the animation loop. */
  start(): void {
    this.animation.start();
  }

  /** Stop the animation loop. */
  stop(): void {
    this.animation.stop();
  }

  /** Perform a single render frame (useful when autoRender is off). */
  renderFrame(): void {
    this.renderer.draw(this._sceneRoot, this._backgroundColor ?? undefined);
  }

  // ── Export / Snapshot ──

  /**
   * Export the canvas contents as a data URL (e.g., `'image/png'`).
   * @param type MIME type (default `'image/png'`)
   * @param quality JPEG/WebP quality 0..1 (ignored for PNG)
   */
  toDataURL(type = 'image/png', quality?: number): string {
    if (this.canvas instanceof HTMLCanvasElement) {
      return this.canvas.toDataURL(type, quality);
    }
    throw new Error('toDataURL is not available for OffscreenCanvas. Use toBlob instead.');
  }

  /**
   * Export the canvas contents as a Blob.
   * @param callback Receives the Blob (or null on failure).
   * @param type MIME type (default `'image/png'`)
   * @param quality JPEG/WebP quality 0..1
   */
  toBlob(callback: (blob: Blob | null) => void, type = 'image/png', quality?: number): void {
    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.toBlob(callback, type, quality);
    } else if (this.canvas instanceof OffscreenCanvas && 'toBlob' in this.canvas) {
      (this.canvas as OffscreenCanvas).toBlob(callback as BlobCallback, type, quality);
    } else {
      callback(null);
    }
  }

  /**
   * Export the canvas contents as an ImageBitmap.
   * Works with both HTMLCanvasElement and OffscreenCanvas.
   */
  async toImageBitmap(): Promise<ImageBitmap> {
    if (this.canvas instanceof OffscreenCanvas && 'transferToImageBitmap' in this.canvas) {
      return (this.canvas as OffscreenCanvas).transferToImageBitmap();
    }
    return createImageBitmap(this.canvas);
  }

  /**
   * Trigger a PNG file download of the canvas contents.
   * @param filename Download filename (default `'canvas-export.png'`).
   */
  exportAsPNG(filename = 'canvas-export.png'): void {
    if (typeof document === 'undefined') return;
    const url = this.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = url;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Revoke after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Convenience: attach hit tester to this engine's canvas ──

  /** Wire up mouse/touch events on the canvas element via the HitTester. */
  enableInteraction(): void {
    if (this.canvas instanceof HTMLCanvasElement) {
      this.hitTester.attachTo(this.canvas, this);
    }
  }

  /** Dispose of resources (stop animation, disconnect observers). */
  dispose(): void {
    this.stop();
    this.disableResponsiveResize();
    // Note: we don't remove the canvas DOM element; caller controls that.
  }
}

// ─── Factory Function ───────────────────────────────────────────────────────

/**
 * Create a new CanvasEngine backed by an HTMLCanvasElement inside the given container.
 *
 * @param container - DOM element to append the canvas into.
 * @param options - Configuration for the canvas.
 * @returns A fully initialized CanvasEngine ready for use.
 *
 * @example
 * ```ts
 * const engine = createCanvas(document.getElementById('app'), {
 *   width: 800,
 *   height: 600,
 *   backgroundColor: '#0f0f23',
 *   antialias: true,
 * });
 *
 * const rect = new ShapeNode({
 *   shapeType: 'roundedRect',
 *   width: 200,
 *   height: 120,
 *   radius: 12,
 *   fillColor: '#e94560',
 *   strokeColor: '#ff6b81',
 *   strokeWidth: 2,
 * });
 * rect.x = 300;
 * rect.y = 240;
 *
 * engine.sceneRoot.addChild(rect);
 * engine.enableInteraction();
 * engine.start();
 * ```
 */
export function createCanvas(container: HTMLElement, options: CanvasOptions = {}): CanvasEngine {
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none'; // Prevent browser touch scrolling on canvas

  const engine = new CanvasEngine(canvas, options);

  // Append to container
  container.appendChild(canvas);

  // If no explicit width/height, use container size or enable responsive
  if (options.width == null || options.height == null) {
    const rect = container.getBoundingClientRect();
    const w = options.width ?? rect.width || 300;
    const h = options.height ?? rect.height || 150;
    engine.resize(w, h);
    engine.enableResponsiveResize(container);
  }

  return engine;
}
