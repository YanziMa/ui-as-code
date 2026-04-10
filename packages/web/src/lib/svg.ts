/**
 * SVG generation and manipulation utilities.
 * Create SVG elements programmatically, build paths, apply transforms,
 * and convert SVG to image/data URL.
 */

// --- Types ---

export interface SvgPoint {
  x: number;
  y: number;
}

export interface SvgSize {
  width: number;
  height: number;
}

export interface SvgViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SvgOptions {
  /** SVG width */
  width?: number | string;
  /** SVG height */
  height?: number | string;
  /** View box */
  viewBox?: string | SvgViewBox;
  /** CSS class */
  className?: string;
  /** Inline styles */
  style?: string;
  /** XML namespace (default: http://www.w3.org/2000/svg) */
  ns?: string;
  /** Attributes */
  attrs?: Record<string, string>;
}

export interface PathCommand {
  type: "M" | "L" | "H" | "V" | "C" | "S" | "Q" | "T" | "A" | "Z" | "m" | "l" | "h" | "v" | "c" | "s" | "q" | "t" | "a" | "z";
  params: number[];
}

// --- Constants ---

const SVG_NS = "http://www.w3.org/2000/svg";

// --- SVG Builder ---

/**
 * Fluent API for building SVG documents programmatically.
 */
export class SvgBuilder {
  private root: SVGSVGElement;
  private currentElement: SVGElement | null = null;

  constructor(options?: SvgOptions) {
    this.root = document.createElementNS(SVG_NS, "svg");

    const opts = {
      width: options?.width ?? "100%",
      height: options?.height ?? "100%",
      ...options,
    };

    if (opts.width) this.root.setAttribute("width", String(opts.width));
    if (opts.height) this.root.setAttribute("height", String(opts.height));

    if (opts.viewBox) {
      if (typeof opts.viewBox === "string") {
        this.root.setAttribute("viewBox", opts.viewBox);
      } else {
        this.root.setAttribute("viewBox", `${opts.viewBox.x} ${opts.viewBox.y} ${opts.viewBox.width} ${opts.viewBox.height}`);
      }
    }

    if (opts.className) this.root.setAttribute("class", opts.className);
    if (opts.style) this.root.setAttribute("style", opts.style);
    if (opts.attrs) {
      for (const [k, v] of Object.entries(opts.attrs)) {
        this.root.setAttribute(k, v);
      }
    }
  }

  /** Get the root SVG element */
  get element(): SVGSVGElement {
    return this.root;
  }

  /** Set attributes on the root */
  attrs(record: Record<string, string>): this {
    for (const [k, v] of Object.entries(record)) {
      this.root.setAttribute(k, v);
    }
    return this;
  }

  // --- Shape Elements ---

  /** Create <rect> */
  rect(x: number, y: number, w: number, h: number, attrs?: Record<string, string>): this {
    const el = createSvgEl("rect", { x: String(x), y: String(y), width: String(w), height: String(h), ...attrs });
    this.root.appendChild(el);
    return this;
  }

  /** Create <circle> */
  circle(cx: number, cy: number, r: number, attrs?: Record<string, string>): this {
    const el = createSvgEl("circle", { cx: String(cx), cy: String(cy), r: String(r), ...attrs });
    this.root.appendChild(el);
    return this;
  }

  /** Create <ellipse> */
  ellipse(cx: number, cy: number, rx: number, ry: number, attrs?: Record<string, string>): this {
    const el = createSvgEl("ellipse", { cx: String(cx), cy: String(cy), rx: String(rx), ry: String(ry), ...attrs });
    this.root.appendChild(el);
    return this;
  }

  /** Create <line> */
  line(x1: number, y1: number, x2: number, y2: number, attrs?: Record<string, string>): this {
    const el = createSvgEl("line", { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2), ...attrs });
    this.root.appendChild(el);
    return this;
  }

  /** Create <polyline> */
  polyline(points: SvgPoint[], attrs?: Record<string, string>): this {
    const el = createSvgEl("polyline", { points: pointsToD(points), ...attrs });
    this.root.appendChild(el);
    return this;
  }

  /** Create <polygon> */
  polygon(points: SvgPoint[], attrs?: Record<string, string>): this {
    const el = createSvgEl("polygon", { points: pointsToD(points), ...attrs });
    this.root.appendChild(el);
    return this;
  }

  /** Create <path> from d attribute string */
  path(d: string, attrs?: Record<string, string>): this {
    const el = createSvgEl("path", { d, ...attrs });
    this.root.appendChild(el);
    return this;
  }

  /** Create <path> from path commands array */
  pathFromCommands(commands: PathCommand[], attrs?: Record<string, string>): this {
    return this.path(commandsToD(commands), attrs);
  }

  // --- Text Elements ---

  /** Create <text> */
  text(content: string, x: number, y: number, attrs?: Record<string, string>): this {
    const el = createSvgEl("text", { x: String(x), y: String(y), ...attrs });
    el.textContent = content;
    this.root.appendChild(el);
    return this;
  }

  /** Create <text> with tspan for multi-line */
  textMultiline(lines: Array<{ content: string; x?: number; y?: number; dx?: number; dy?: number }>, x: number, y: number, attrs?: Record<string, string>): this {
    const g = document.createElementNS(SVG_NS, "g");
    const textEl = createSvgEl("text", { x: String(x), y: String(y), ...attrs });

    lines.forEach((line, i) => {
      const tspan = document.createElementNS(SVG_NS, "tspan");
      if (i > 0) tspan.setAttribute("x", String(line.x ?? x));
      if (i > 0 || line.dy !== undefined) tspan.setAttribute("dy", String(line.dy ?? "1.2em"));
      if (line.dx !== undefined) tspan.setAttribute("dx", String(line.dx));
      tspan.textContent = line.content;
      textEl.appendChild(tspan);
    });

    g.appendChild(textEl);
    this.root.appendChild(g);
    return this;
  }

  // --- Group & Container ---

  /** Create <g> group with children */
  group(attrs?: Record<string, string>, fn?: (g: SvgBuilder) => void): this {
    const g = document.createElementNS(SVG_NS, "g");
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, v);
    }
    this.root.appendChild(g);

    if (fn) {
      const prevRoot = this.root;
      // Temporarily append to group
      const childBuilder = new SvgBuilder();
      fn(childBuilder);
      // Move all children from temp builder's root to our group
      while (childBuilder.root.firstChild) {
        g.appendChild(childBuilder.root.firstChild);
      }
    }

    return this;
  }

  /** Create <defs> for definitions (gradients, patterns, etc.) */
  defs(fn?: (defs: SVGDefsElement) => void): this {
    const defsEl = document.createElementNS(SVG_NS, "defs");
    fn?.(defsEl);
    this.root.insertBefore(defsEl, this.root.firstChild);
    return this;
  }

  // --- Gradients ---

  /** Add linear gradient to defs */
  linearGradient(id: string, stops: Array<{ offset: number; color: string }>, x1 = "0%", y1 = "0%", x2 = "100%", y2 = "100%"): this {
    return this.defs((d) => {
      const grad = document.createElementNS(SVG_NS, "linearGradient");
      grad.setAttribute("id", id);
      grad.setAttribute("x1", x1); grad.setAttribute("y1", y1);
      grad.setAttribute("x2", x2); grad.setAttribute("y2", y2);
      for (const s of stops) {
        const stop = document.createElementNS(SVG_NS, "stop");
        stop.setAttribute("offset", `${(s.offset * 100).toFixed(1)}%`);
        stop.setAttribute("stop-color", s.color);
        grad.appendChild(stop);
      }
      d.appendChild(grad);
    });
  }

  /** Add radial gradient to defs */
  radialGradient(id: string, stops: Array<{ offset: number; color: string }>, cx = "50%", cy = "50%", r = "50%"): this {
    return this.defs((d) => {
      const grad = document.createElementNS(SVG_NS, "radialGradient");
      grad.setAttribute("id", id);
      grad.setAttribute("cx", cx); grad.setAttribute("cy", cy); grad.setAttribute("r", r);
      for (const s of stops) {
        const stop = document.createElementNS(SVG_NS, "stop");
        stop.setAttribute("offset", `${(s.offset * 100).toFixed(1)}%`);
        stop.setAttribute("stop-color", s.color);
        grad.appendChild(stop);
      }
      d.appendChild(grad);
    });
  }

  // --- Use / Reference ---

  /** Create <use> reference */
  use(href: string, x = 0, y = 0, attrs?: Record<string, string>): this {
    const el = createSvgEl("use", { href, x: String(x), y: String(y), ...attrs });
    this.root.appendChild(el);
    return this;
  }

  // --- Image ---

  /** Create <image> */
  image(href: string, x: number, y: number, w: number, h: number, attrs?: Record<string, string>): this {
    const el = createSvgEl("image", {
      href,
      x: String(x), y: String(y),
      width: String(w), height: String(h),
      ...attrs,
    });
    this.root.appendChild(el);
    return this;
  }

  // --- Output ---

  /** Get SVG as markup string */
  toString(): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(this.root);
  }

  /** Get outer HTML */
  get outerHTML(): string {
    return this.root.outerHTML;
  }

  /** Append to a container element */
  appendTo(container: HTMLElement): this {
    container.appendChild(this.root);
    return this;
  }

  /** Convert SVG to data URL (PNG/JPEG via canvas) */
  async toDataURL(type = "image/png", scale = 2): Promise<string> {
    const svgStr = this.toString();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const w = this.root.clientWidth || parseInt(this.root.getAttribute("width") ?? "200", 10);
        const h = this.root.clientHeight || parseInt(this.root.getAttribute("height") ?? "200", 10);
        canvas.width = w * scale;
        canvas.height = h * scale;

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w * scale, h * scale);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL(type));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to render SVG to image"));
      };
      img.src = url;
    });
  }
}

// --- Path Building Utilities ---

/** Build an SVG path d-string from commands */
export function commandsToD(commands: PathCommand[]): string {
  return commands.map((cmd) => cmd.type + cmd.params.join(",")).join(" ");
}

/** Parse a d-string into path commands */
export function parsePathD(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(d)) !== null) {
    const type = match[1] as PathCommand["type"];
    const params = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    commands.push({ type, params });
  }

  return commands;
}

/** Create a smooth curve through points using Catmull-Rom spline */
export function smoothCurve(points: SvgPoint[], tension = 0.5): string {
  if (points.length < 2) return "";

  let d = `M ${points[0].x} ${points[0].y}`;

  if (points.length === 2) {
    d += ` L ${points[1].x} ${points[1].y}`;
    return d;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

/** Create arc path (for pie/donut charts) */
export function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

  return [
    "M", cx, cy,
    "L", start.x, start.y,
    "A", r, r, 0, largeArcFlag, 0, end.x, end.y,
    "Z",
  ].join(" ");
}

/** Create donut/ring arc path */
export function ringArcPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startAngle: number, endAngle: number,
): string {
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

  return [
    "M", outerStart.x, outerStart.y,
    "A", outerR, outerR, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerR, innerR, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
}

/** Create rectangle with rounded corners path */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

/** Create star/polygon path */
export function starPath(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const vertices: SvgPoint[] = [];
  const step = Math.PI / points;

  for (let i = 0; i < 2 * points; i++) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + i * step;
    vertices.push(polarToCartesian(cx, cy, radius, angle));
  }

  return `M ${vertices.map((v) => `${v.x} ${v.y}`).join(" L ")} Z`;
}

/** Create regular polygon path */
export function polygonPath(cx: number, cy: number, r: number, sides: number): string {
  const vertices: SvgPoint[] = [];
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    vertices.push(polarToCartesian(cx, cy, r, angle));
  }

  return `M ${vertices.map((v) => `${v.x} ${v.y}`).join(" L ")} Z`;
}

/** Create arrow/chevron path */
export function arrowPath(x: number, y: number, size: number, direction: "up" | "down" | "left" | "right" = "right"): string {
  const half = size / 2;
  switch (direction) {
    case "up": return `M ${x} ${y - half} L ${x + half} ${y + half} L ${x - half} ${y + half} Z`;
    case "down": return `M ${x} ${y + half} L ${x + half} ${y - half} L ${x - half} ${y - half} Z`;
    case "left": return `M ${x - half} ${y} L ${x + half} ${y - half} L ${x + half} ${y + half} Z`;
    case "right": return `M ${x + half} ${y} L ${x - half} ${y - half} L ${x - half} ${y + half} Z`;
  }
}

// --- Convenience ---

/** Quick-create an SVG element */
export function createSvg(tagName: string, attrs?: Record<string, string>): SVGElement {
  return createSvgEl(tagName, attrs);
}

/** Create SVG builder instance */
export function svg(options?: SvgOptions): SvgBuilder {
  return new SvgBuilder(options);
}

// --- Internal Helpers ---

function createSvgEl(tagName: string, attrs?: Record<string, string>): SVGElement {
  const el = document.createElementNS(SVG_NS, tagName);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  }
  return el;
}

function pointsToD(points: SvgPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number): SvgPoint {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}
