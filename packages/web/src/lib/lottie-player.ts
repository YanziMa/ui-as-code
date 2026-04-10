/**
 * Lottie Player: Lightweight JSON-based animation player using Canvas.
 * Parses Lottie JSON data (bodymovin export format) and renders frame-by-frame
 * on a canvas element with playback controls, loop support, and segment playback.
 *
 * Supports a subset of Lottie features commonly used in UI animations:
 * - Shape layers (rect, ellipse, path, polystar)
 * - Fill & stroke properties
 * - Transform (position, rotation, scale, opacity)
 * - Opacity animations
 * - Basic easing (linear, ease-in, ease-out, ease-in-out)
 */

// --- Types ---

export interface LottieTransform {
  /** Position [x, y] or animated */
  p?: AnimatableValue<[number, number]>;
  /** Rotation in degrees */
  r?: AnimatableValue<number>;
  /** Scale [x, y] (default: [100, 100]) */
  s?: AnimatableValue<[number, number]>;
  /** Anchor point [x, y] */
  a?: AnimatableValue<[number, number]>;
  /** Opacity 0-100 */
  o?: AnimatableValue<number>;
}

export interface LottieShapeFill {
  type: "fill";
  c: AnimatableValue<[number, number, number, number]>; // RGBA 0-1
  o?: AnimatableValue<number>; // Opacity override
}

export interface LottieShapeStroke {
  type: "stroke";
  c: AnimatableValue<[number, number, number, number]>;
  w: AnimatableValue<number>; // Stroke width
  o?: AnimatableValue<number>;
  lc?: number; // Line cap: 1=butt, 2=round, 3=square
  lj?: number; // Line join: 1=miter, 2=round, 3=bevel
}

export interface LottieShapeRect {
  ty: "rc";
  s: AnimatableValue<[number, number]>; // Size
  p: AnimatableValue<[number, number]>; // Position
  r?: AnimatableValue<number>; // Corner radius
}

export interface LottieShapeEllipse {
  ty: "el";
  s: AnimatableValue<[number, number]>; // Size
  p: AnimatableValue<[number, number]>; // Position
}

export interface LottieShapePath {
  ty: "sr"; // Shape path
  ks: AnimatableValue<BezierPathData>;
  closed?: boolean;
}

export interface LottieShapePolystar {
  ty: "sr";
  sy: 1 | 2; // 1=star, 2=polygon
  pt: AnimatableValue<number>; // Points/sides
  ou: AnimatableValue<number>; // Outer radius
  os?: AnimatableValue<number>; // Inner radius (star only)
  ir?: AnimatableValue<number>; // Inner roundness
  or?: AnimatableValue<number>; // Outer roundness
  p: AnimatableValue<[number, number]>; // Position
  r: AnimatableValue<number>; // Rotation
}

type LottieShapeItem = LottieShapeRect | LottieShapeEllipse | LottieShapePath | LottieShapePolystar;

export interface LottieShapeGroup {
  ty: "gr";
  it: (LottieShapeItem | LottieShapeFill | LottieShapeStroke)[];
  nm?: string;
  transform?: LottieTransform;
}

export interface LottieLayer {
  ind: number;
  nm?: string;
  ty: number; // 0=precomp, 3=null, 4=shape
  refId?: string;
  parent?: number;
  sr?: number; // Stretch
  ks: LottieTransform;
  ao?: number; // Auto orient
  ip: number; // In point
  op: number; // Out point
  st: number; // Start time
  bm?: number; // Blend mode
  hd?: boolean; // Hidden
}

export interface LottieAsset {
  id: string;
  w: number;
  h: number;
  layers?: LottieLayer[];
}

export interface LottieData {
  v: string; // Version
  fr: number; // Frame rate
  ip: number; // In point
  op: number; // Out point
  w: number; // Width
  h: number; // Height;
  assets?: LottieAsset[];
  layers: LottieLayer[];
}

export interface AnimatableValue<T> {
  /** Static value */
  k: T;
  /** Keyframes array (if animated) */
  a?: number; // 0=static, 1=animated
  k?: Keyframe<T>[]; // When a=1
  ix?: number;
}

export interface Keyframe<T> {
  t: number; // Time
  s: T; // Start value
  e?: T; // End value
  i?: [number, number]; // Bezier in tangent
  o?: [number, number]; // Bezier out tangent
}

export interface BezierPathData {
  v: [number, number][]; // Vertices
  i: [number, number][]; // In tangents
  o: [number, number][]; // Out tangents
  c: boolean; // Closed
}

export interface LottiePlayerOptions {
  /** Autoplay on load (default: true) */
  autoplay?: boolean;
  /** Loop animation (default: true) */
  loop?: boolean;
  /** Initial speed multiplier (default: 1) */
  speed?: number;
  /** Direction: 1=forward, -1=reverse (default: 1) */
  direction?: 1 | -1;
  /** Start segment [fromFrame, toFrame] */
  segment?: [number, number];
  /** Background color (transparent by default) */
  background?: string;
  /** Render quality: 'low', 'medium', 'high' (default: 'medium') */
  quality?: "low" | "medium" | "high";
  /** Callback on each frame render */
  onFrame?: (frame: number) => void;
  /** Callback on complete (when loop=false) */
  onComplete?: () => void;
  /** Callback on loop complete */
  onLoopComplete?: () => void;
  /** Custom renderer class name */
  className?: string;
}

export interface LottiePlayerInstance {
  element: HTMLCanvasElement;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (frame: number) => void;
  setSpeed: (speed: number) => void;
  setDirection: (dir: 1 | -1) => void;
  goToAndPlay: (frame: number) => void;
  goToAndStop: (frame: number) => void;
  destroy: () => void;
  get currentFrame(): number;
  get totalFrames(): number;
  get isPlaying(): boolean;
}

// --- Interpolation ---

function interpolateKeyframes<T extends number | [number, ...number[]]>(
  keyframes: Keyframe<T>[],
  time: number,
): T {
  if (keyframes.length === 1) return keyframes[0]!.s;

  // Find surrounding keyframes
  let kfBefore: Keyframe<T> | null = null;
  let kfAfter: Keyframe<T> | null = null;

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i]!.t <= time) kfBefore = keyframes[i]!;
    if (keyframes[i]!.t > time && !kfAfter) kfAfter = keyframes[i]!;
  }

  if (!kfAfter) return keyframes[keyframes.length - 1]!.s;
  if (!kfBefore) return kfAfter.s;

  const duration = kfAfter.t - kfBefore.t;
  if (duration === 0) return kfAfter.s;

  let progress = (time - kfBefore.t) / duration;

  // Apply bezier easing if available
  if (kfBefore.o && kfAfter.i) {
    progress = bezierEase(progress, kfBefore.o, kfAfter.i);
  }

  // Interpolate values
  if (typeof kfBefore.s === "number") {
    const s = kfBefore.s as number;
    const e = (kfAfter.e ?? kfAfter.s) as number;
    return (s + (e - s) * progress) as T;
  }

  // Array interpolation
  const sArr = kfBefore.s as unknown as number[];
  const eArr = (kfAfter.e ?? kfAfter.s) as unknown as number[];
  return sArr.map((v, i) => v + (eArr[i]! - v) * progress) as unknown as T;
}

function bezierEase(t: number, out: [number, number], inn: [number, number]): number {
  // Simplified cubic bezier evaluation
  const cx = 3 * out[0];
  const bx = 3 * (inn[0] - out[0]) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * out[1];
  const by = 3 * (inn[1] - out[1]) - cy;
  const ay = 1 - cy - by;

  function sampleX(u: number): number {
    return ((ax * u + bx) * u + cx) * u;
  }

  function sampleY(u: number): number {
    return ((ay * u + by) * u + cy) * u;
  }

  // Newton-Raphson iteration
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = sampleX(u) - t;
    if (Math.abs(x) < 1e-6) break;
    const dx = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(dx) < 1e-6) break;
    u -= x / dx;
  }

  return Math.max(0, Math.min(1, sampleY(u)));
}

// --- Value Resolution ---

function resolveValue<T>(anim: AnimatableValue<T>, time: number): T {
  if (anim.a === 1 && Array.isArray(anim.k)) {
    return interpolateKeyframes(anim.k as Keyframe<T>[], time);
  }
  return anim.k;
}

function resolveTransform(transform: LottieTransform, time: number): {
  pos: [number, number];
  rot: number;
  scale: [number, number];
  anchor: [number, number];
  opacity: number;
} {
  const pos = transform.p ? resolveValue(transform.p, time) : [0, 0];
  const rot = transform.r ? resolveValue(transform.r, time) : 0;
  const scale = transform.s ? resolveValue(transform.s, time) : [100, 100];
  const anchor = transform.a ? resolveValue(transform.a, time) : [0, 0];
  const opacity = transform.o ? resolveValue(transform.o, time) : 100;
  return { pos: pos as [number, number], rot, scale: scale as [number, number], anchor: anchor as [number, number], opacity };
}

// --- Rendering ---

function drawBezierPath(ctx: CanvasRenderingContext2D, pathData: BezierPathData): void {
  const { v, i, o, c } = pathData;
  if (v.length === 0) return;

  ctx.moveTo(v[0]![0], v[0]![1]);

  for (let j = 0; j < v.length; j++) {
    if (j === 0 && !c) continue;
    const nextIdx = (j + 1) % v.length;
    ctx.bezierCurveTo(
      o[j]![0], o[j]![1],
      i[nextIdx]![0], i[nextIdx]![1],
      v[nextIdx]![0], v[nextIdx]![1],
    );
  }

  if (c) ctx.closePath();
}

function applyTransform(
  ctx: CanvasRenderingContext2D,
  tf: ReturnType<typeof resolveTransform>,
): void {
  ctx.translate(tf.pos[0], tf.pos[1]);
  ctx.rotate((tf.rot * Math.PI) / 180);
  ctx.scale(tf.scale[0] / 100, tf.scale[1] / 100);
  ctx.translate(-tf.anchor[0], -tf.anchor[1]);
  ctx.globalAlpha *= tf.opacity / 100;
}

function rgbaToString(c: [number, number, number, number]): string {
  return `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${c[3]})`;
}

function renderLayer(
  ctx: CanvasRenderingContext2D,
  layer: LottieLayer,
  time: number,
  assets: Map<string, LottieAsset>,
): void {
  if (layer.hd) return;
  if (layer.ty !== 4) return; // Only shape layers supported

  const tf = resolveTransform(layer.ks, time);
  ctx.save();
  applyTransform(ctx, tf);

  // Render shape groups
  if (Array.isArray(layer.shapes)) {
    renderShapeGroups(ctx, layer.shapes as LottieShapeGroup[], time);
  }

  ctx.restore();
}

function renderShapeGroups(
  ctx: CanvasRenderingContext2D,
  groups: LottieShapeGroup[],
  time: number,
): void {
  for (const group of groups) {
    ctx.save();

    if (group.transform) {
      const gTf = resolveTransform(group.transform, time);
      applyTransform(ctx, gTf);
    }

    // Collect fills and strokes
    let currentFill: LottieShapeFill | undefined;
    let currentStroke: LottieShapeStroke | undefined;

    for (const item of group.it) {
      if (item.type === "fill") {
        currentFill = item;
        continue;
      }
      if (item.type === "stroke") {
        currentStroke = item;
        continue;
      }

      // Draw shape
      ctx.beginPath();

      switch (item.ty) {
        case "rc": {
          const rect = item as LottieShapeRect;
          const size = resolveValue(rect.s, time);
          const pos = resolveValue(rect.p, time);
          const radius = rect.r ? resolveValue(rect.r, time) : 0;
          roundRect(ctx, pos[0] - size[0] / 2, pos[1] - size[1] / 2, size[0], size[1], radius);
          break;
        }
        case "el": {
          const el = item as LottieShapeEllipse;
          const size = resolveValue(el.s, time);
          const pos = resolveValue(el.p, time);
          ctx.ellipse(pos[0], pos[1], size[0] / 2, size[1] / 2, 0, 0, Math.PI * 2);
          break;
        }
        case "sr": {
          const path = item as LottieShapePath;
          const pd = resolveValue(path.ks, time);
          drawBezierPath(ctx, pd);
          break;
        }
      }

      // Apply fill
      if (currentFill) {
        const color = resolveValue(currentFill.c, time);
        const opacity = currentFill.o ? resolveValue(currentFill.o, time) / 100 : 1;
        ctx.globalAlpha *= opacity;
        ctx.fillStyle = rgbaToString(color);
        ctx.fill("evenodd");
      }

      // Apply stroke
      if (currentStroke) {
        const color = resolveValue(currentStroke.c, time);
        const width = resolveValue(currentStroke.w, time);
        const opacity = currentStroke.o ? resolveValue(currentStroke.o, time) / 100 : 1;
        ctx.globalAlpha *= opacity;
        ctx.strokeStyle = rgbaToString(color);
        ctx.lineWidth = width;
        if (currentStroke.lc === 2) ctx.lineCap = "round";
        else if (currentStroke.lc === 3) ctx.lineCap = "square";
        if (currentStroke.lj === 2) ctx.lineJoin = "round";
        else if (currentStroke.lj === 3) ctx.lineJoin = "bevel";
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  if (r === 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// --- Main Player ---

export function createLottiePlayer(
  canvas: HTMLCanvasElement,
  data: LottieData,
  options: LottiePlayerOptions = {},
): LottiePlayerInstance {
  const opts = {
    autoplay: options.autoplay ?? true,
    loop: options.loop ?? true,
    speed: options.speed ?? 1,
    direction: options.direction ?? 1,
    segment: options.segment ?? null,
    background: options.background ?? "transparent",
    quality: options.quality ?? "medium",
    ...options,
  };

  const ctx = canvas.getContext("2d")!;
  if (!ctx) throw new Error("Canvas 2D context not available");

  const dpr = window.devicePixelRatio || 1;
  const qualityScale = opts.quality === "high" ? 1 : opts.quality === "low" ? 0.5 : 1;

  canvas.width = data.w * dpr * qualityScale;
  canvas.height = data.h * dpr * qualityScale;
  canvas.style.width = `${data.w}px`;
  canvas.style.height = `${data.h}px`;

  // State
  let currentFrame = 0;
  let isPlaying = false;
  let destroyed = false;
  let animFrameId: number | null = null;
  let lastTimestamp = 0;
  let direction = opts.direction;
  let speed = opts.speed;

  const totalFrames = data.op - data.ip;
  const frameDuration = 1000 / data.fr;
  const segStart = opts.segment?.[0] ?? 0;
  const segEnd = opts.segment?.[1] ?? totalFrames;

  // Pre-process assets
  const assetMap = new Map<string, LottieAsset>();
  if (data.assets) {
    for (const asset of data.assets) {
      if (asset.id) assetMap.set(asset.id, asset);
    }
  }

  // Sort layers by index (render order)
  const sortedLayers = [...data.layers].sort((a, b) => a.ind - b.ind);

  function render(frame: number): void {
    ctx.setTransform(dpr * qualityScale, 0, 0, dpr * qualityScale, 0, 0);
    ctx.clearRect(0, 0, data.w, data.h);

    if (opts.background !== "transparent") {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, data.w, data.h);
    }

    const time = frame;

    for (const layer of sortedLayers) {
      // Check layer visibility at this frame
      if (frame < layer.ip || frame >= layer.op) continue;

      // Handle pre-compositions
      if (layer.ty === 0 && layer.refId) {
        const comp = assetMap.get(layer.refId);
        if (comp?.layers) {
          const compTime = time - layer.st;
          ctx.save();
          const tf = resolveTransform(layer.ks, time);
          applyTransform(ctx, tf);
          for (const cl of comp.layers) {
            renderLayer(ctx, cl, compTime, assetMap);
          }
          ctx.restore();
        }
        continue;
      }

      renderLayer(ctx, layer, time, assetMap);
    }

    opts.onFrame?.(frame);
  }

  function tick(timestamp: number): void {
    if (destroyed || !isPlaying) return;

    if (lastTimestamp === 0) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    const framesToAdvance = (delta / frameDuration) * speed * direction;
    currentFrame += framesToAdvance;

    // Loop handling
    if (currentFrame >= segEnd) {
      if (opts.loop) {
        currentFrame = segStart + (currentFrame - segEnd);
        opts.onLoopComplete?.();
      } else {
        currentFrame = segEnd - 1;
        pause();
        opts.onComplete?.();
        return;
      }
    } else if (currentFrame < segStart) {
      if (opts.loop) {
        currentFrame = segEnd - (segStart - currentFrame);
        opts.onLoopComplete?.();
      } else {
        currentFrame = segStart;
        pause();
        opts.onComplete?.();
        return;
      }
    }

    render(currentFrame);
    animFrameId = requestAnimationFrame(tick);
  }

  function play(): void {
    if (isPlaying || destroyed) return;
    isPlaying = true;
    lastTimestamp = 0;
    animFrameId = requestAnimationFrame(tick);
  }

  function pause(): void {
    isPlaying = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function stop(): void {
    pause();
    currentFrame = segStart;
    render(currentFrame);
  }

  function seek(frame: number): void {
    currentFrame = Math.max(segStart, Math.min(segEnd - 1, frame));
    render(currentFrame);
  }

  // Initial render
  render(currentFrame);

  if (opts.autoplay) {
    play();
  }

  const instance: LottiePlayerInstance = {
    element: canvas,

    get currentFrame() { return currentFrame; },
    get totalFrames() { return totalFrames; },
    get isPlaying() { return isPlaying; },

    play,
    pause,
    stop,
    seek,

    setSpeed(s: number) { speed = s; },
    setDirection(dir: 1 | -1) { direction = dir; },

    goToAndPlay(frame: number) {
      seek(frame);
      play();
    },

    goToAndStop(frame: number) {
      seek(frame);
      pause();
    },

    destroy() {
      destroyed = true;
      pause();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };

  return instance;
}

/**
 * Load Lottie JSON from URL.
 */
export async function loadLottieData(url: string): Promise<LottieData> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load Lottie data: ${response.status}`);
  return response.json() as Promise<LottieData>;
}
