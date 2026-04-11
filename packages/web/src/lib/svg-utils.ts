/**
 * SVG Utilities: SVG element creation, path generation, shape builders,
 * attribute manipulation, viewBox management, coordinate transforms,
 * gradient/defs management, export helpers, and SVG DOM utilities.
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

export interface SvgRect extends SvgPoint, SvgSize {}

export interface GradientStop {
  offset: number; // 0-1 or percentage string like "50%"
  color: string;
  opacity?: number;
}

export interface LinearGradientDef {
  id: string;
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  stops: GradientStop[];
  gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
}

export interface RadialGradientDef {
  id: string;
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  fx?: number | string;
  fy?: number | string;
  stops: GradientStop[];
  gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- SVG Namespace ---

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

/** Get the SVG namespace URI */
export function getSvgNs(): string { return SVG_NS; }

/** Create an SVG element with namespace */
export function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attrs?: Record<string, string | number | boolean | null>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tagName);
  if (attrs) setSvgAttrs(el, attrs);
  return el;
}

/** Create an SVG root element */
export function createSvg(
  width: number | string,
  height: number | string,
  attrs?: Record<string, string | number | boolean | null>,
): SVGSVGElement {
  const svg = createSvgElement("svg", {
    ...attrs,
    width: String(width),
    height: String(height),
    xmlns: SVG_NS,
  }) as SVGSVGElement;
  return svg;
}

/** Create an SVG with a specific viewBox */
export function createSvgWithViewBox(
  vb: ViewBox,
  attrs?: Record<string, string | number | boolean | null>,
): SVGSVGElement {
  return createSvg("100%", "100%", {
    ...attrs,
    viewBox: `${vb.x} ${vb.y} ${vb.width} ${vb.height}`,
  });
}

// --- Attribute Helpers ---

/** Set multiple attributes on an SVG element */
export function setSvgAttrs(
  el: SVGElement,
  attrs: Record<string, string | number | boolean | null>,
): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (key === "className" || key === "class") {
      el.setAttribute("class", String(value));
    } else if (key.startsWith("on") && typeof value === "function") {
      // Event handlers - skip for now (SVG doesn't support this way)
      continue;
    } else if (key === "style" && typeof value === "object") {
      Object.assign((el as HTMLElement).style, value);
    } else if (key === "innerHTML" || key === "textContent") {
      if (key === "innerHTML") el.innerHTML = String(value);
      else el.textContent = String(value);
    } else if (key === "children") {
      // Skip - handle separately
      continue;
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

/** Get a typed attribute from an SVG element */
export function getSvgAttr(el: SVGElement, name: string): string | null {
  return el.getAttribute(name);
}

/** Remove an attribute */
export function removeSvgAttr(el: SVGElement, name: string): void {
  el.removeAttribute(name);
}

/** Toggle a boolean attribute */
export function toggleSvgAttr(
  el: SVGElement,
  name: string,
  force?: boolean,
): boolean {
  if (force !== undefined) {
    if (force) el.setAttribute(name, "");
    else el.removeAttribute(name);
    return force;
  }
  const has = el.hasAttribute(name);
  if (has) el.removeAttribute(name);
  else el.setAttribute(name, "");
  return !has;
}

// --- Shape Builders ---

/** Create an SVG rect element */
export function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 0,
  ry = 0,
  attrs?: Record<string, string | number | boolean | null>,
): SVGRectElement {
  const el = createSvgElement("rect", { ...attrs, x, y, width, height });
  if (rx > 0 || ry > 0) {
    el.setAttribute("rx", String(rx));
    if (ry > 0) el.setAttribute("ry", String(ry));
  }
  return el as SVGRectElement;
}

/** Create an SVG circle element */
export function circle(
  cx: number,
  cy: number,
  r: number,
  attrs?: Record<string, string | number | boolean | null>,
): SVGCircleElement {
  return createSvgElement("circle", { ...attrs, cx, cy, r }) as SVGCircleElement;
}

/** Create an SVG ellipse element */
export function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  attrs?: Record<string, string | number | boolean | null>,
): SVGEllipseElement {
  return createSvgElement("ellipse", { ...attrs, cx, cy, rx, ry }) as SVGEllipseElement;
}

/** Create an SVG line element */
export function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  attrs?: Record<string, string | number | boolean | null>,
): SVGLineElement {
  return createSvgElement("line", { ...attrs, x1, y1, x2, y2 }) as SVGLineElement;
}

/** Create an SVG polyline element from points array */
export function polyline(
  points: Array<SvgPoint>,
  attrs?: Record<string, string | number | boolean | null>,
): SVGPolylineElement {
  const d = points.map((p) => `${p.x},${p.y}`).join(" ");
  return createSvgElement("polyline", { ...attrs, points: d }) as SVGPolylineElement;
}

/** Create an SVG polygon element from points array */
export function polygon(
  points: Array<SvgPoint>,
  attrs?: Record<string, string | number | boolean | null>,
): SVGPolygonElement {
  const d = points.map((p) => `${p.x},${p.y}`).join(" ");
  return createSvgElement("polygon", { ...attrs, points: d }) as SVGPolygonElement;
}

/** Create an SVG path element */
export function path(
  d: string,
  attrs?: Record<string, string | number | boolean | null>,
): SVGPathElement {
  return createSvgElement("path", { ...attrs, d }) as SVGPathElement;
}

// --- Path Generation ---

/**
 * PathBuilder - fluent API for building SVG path data strings.
 *
 * @example
 * ```ts
 * const d = new PathBuilder()
 *   .moveTo(10, 10)
 *   .lineTo(100, 10)
 *   .arcTo(110, 20, 120, 30, 10)
 *   .close()
 *   .toString();
 * ```
 */
export class PathBuilder {
  private parts: string[] = [];

  moveTo(x: number, y: number): this {
    this.parts.push(`M ${x} ${y}`);
    return this;
  }

  moveRel(dx: number, dy: number): this {
    this.parts.push(`m ${dx} ${dy}`);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.parts.push(`L ${x} ${y}`);
    return this;
  }

  lineRel(dx: number, dy: number): this {
    this.parts.push(`l ${dx} ${dy}`);
    return this;
  }

  hLineTo(x: number): this {
    this.parts.push(`H ${x}`);
    return this;
  }

  hLineRel(dx: number): this {
    this.parts.push(`h ${dx}`);
    return this;
  }

  vLineTo(y: number): this {
    this.parts.push(`V ${y}`);
    return this;
  }

  vLineRel(dy: number): this {
    this.parts.push(`v ${dy}`);
    return this;
  }

  /** Cubic bezier curve */
  curveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    this.parts.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`);
    return this;
  }

  curveRel(dc1x: number, dc1y: number, dc2x: number, dc2y: number, dx: number, dy: number): this {
    this.parts.push(`c ${dc1x} ${dc1y} ${dc2x} ${dc2y} ${dx} ${dy}`);
    return this;
  }

  /** Smooth cubic bezier (shorthand) */
  smoothCurveTo(cx: number, cy: number, x: number, y: number): this {
    this.parts.push(`S ${cx} ${cy} ${x} ${y}`);
    return this;
  }

  /** Quadratic bezier curve */
  qCurveTo(cx: number, cy: number, x: number, y: number): this {
    this.parts.push(`Q ${cx} ${cy} ${x} ${y}`);
    return this;
  }

  qCurveRel(dcx: number, dcy: number, dx: number, dy: number): this {
    this.parts.push(`q ${dcx} ${dcy} ${dx} ${dy}`);
    return this;
  }

  /** Smooth quadratic bezier */
  smoothQCurveTo(x: number, y: number): this {
    this.parts.push(`T ${x} ${y}`);
    return this;
  }

  /** Arc (elliptical arc) */
  arc(
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: number,
    sweepFlag: number,
    x: number,
    y: number,
  ): this {
    this.parts.push(`A ${rx} ${ry} ${rotation} ${largeArcFlag} ${sweepFlag} ${x} ${y}`);
    return this;
  }

  close(): this {
    this.parts.push("Z");
    return this;
  }

  toString(): string {
    return this.parts.join(" ");
  }

  /** Build and return an SVG path element */
  build(attrs?: Record<string, string | number | boolean | null>): SVGPathElement {
    return path(this.toString(), attrs);
  }

  /** Get current length of path data string */
  get length(): number { return this.parts.length; }

  /** Clear all commands */
  clear(): this {
    this.parts.length = 0;
    return this;
  }
}

/** Generate a rounded rectangle path data string */
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const radius = Math.min(r, w / 2, h / 2);
  return new PathBuilder()
    .moveTo(x + radius, y)
    .lineTo(x + w - radius, y)
    .arc(radius, radius, 0, 0, 1, x + w, y + radius)
    .lineTo(x + w, y + h - radius)
    .arc(radius, radius, 0, 0, 1, x + w - radius, y + h)
    .lineTo(x + radius, y + h)
    .arc(radius, radius, 0, 0, 1, x, y + h - radius)
    .close()
    .toString();
}

/** Generate a regular polygon path centered at (cx, cy) */
export function regularPolygonPath(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation = 0,
): string {
  const angleStep = (Math.PI * 2) / sides;
  const pb = new PathBuilder();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + i * angleStep - Math.PI / 2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) pb.moveTo(px, py);
    else pb.lineTo(px, py);
  }
  return pb.close().toString();
}

/** Generate a star shape path */
export function starPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  rotation = 0,
): string {
  const step = Math.PI / points;
  const pb = new PathBuilder();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = rotation + i * step - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) pb.moveTo(px, py);
    else pb.lineTo(px, py);
  }
  return pb.close().toString();
}

/** Generate a smooth curve through points using Catmull-Rom to Bezier conversion */
export function smoothCurvePath(points: Array<SvgPoint>, tension = 0.5): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return new PathBuilder()
      .moveTo(points[0]!.x, points[0]!.y)
      .lineTo(points[1]!.x, points[1]!.y)
      .toString();
  }

  const pb = new PathBuilder();
  pb.moveTo(points[0]!.x, points[0]!.y);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const cp1x = p1.x + (p2.x - p0.x) / (6 / tension);
    const cp1y = p1.y + (p2.y - p0.y) / (6 / tension);
    const cp2x = p2.x - (p3.x - p1.x) / (6 / tension);
    const cp2y = p2.y - (p3.y - p1.y) / (6 / tension);

    pb.curveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  return pb.toString();
}

/** Generate an arc path (portion of a circle) */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  anticlockwise = false,
): string {
  const start = { x: cx + radius * Math.cos(startAngle), y: cy + radius * Math.sin(startAngle) };
  const end = { x: cx + radius * Math.cos(endAngle), y: cy + radius * Math.sin(endAngle) };
  let delta = endAngle - startAngle;

  if (anticlockwise) {
    while (delta > 0) delta -= Math.PI * 2;
    while (delta < -Math.PI * 2) delta += Math.PI * 2;
  } else {
    while (delta < 0) delta += Math.PI * 2;
    while (delta > Math.PI * 2) delta -= Math.PI * 2;
  }

  const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
  const sweep = anticlockwise ? 0 : 1;

  return new PathBuilder()
    .moveTo(start.x, start.y)
    .arc(radius, radius, 0, largeArc, sweep, end.x, end.y)
    .toString();
}

/** Generate a pie/wedge slice path */
export function pieSlicePath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  innerRadius = 0,
): string {
  const start = { x: cx + radius * Math.cos(startAngle), y: cy + radius * Math.sin(startAngle) };
  const end = { x: cx + radius * Math.cos(endAngle), y: cy + radius * Math.sin(endAngle) };
  let delta = endAngle - startAngle;
  while (delta < 0) delta += Math.PI * 2;
  while (delta > Math.PI * 2) delta -= Math.PI * 2;
  const largeArc = delta > Math.PI ? 1 : 0;

  const pb = new PathBuilder();

  if (innerRadius > 0) {
    const iStart = { x: cx + innerRadius * Math.cos(startAngle), y: cy + innerRadius * Math.sin(startAngle) };
    const iEnd = { x: cx + innerRadius * Math.cos(endAngle), y: cy + innerRadius * Math.sin(endAngle) };
    pb.moveTo(iStart.x, iStart.y)
      .lineTo(start.x, start.y)
      .arc(radius, radius, 0, largeArc, 1, end.x, end.y)
      .lineTo(iEnd.x, iEnd.y)
      .arc(innerRadius, innerRadius, 0, largeArc, 0, iStart.x, iStart.y);
  } else {
    pb.moveTo(cx, cy)
      .lineTo(start.x, start.y)
      .arc(radius, radius, 0, largeArc, 1, end.x, end.y);
  }

  return pb.close().toString();
}

// --- Text Elements ---

/** Create an SVG text element */
export function text(
  content: string,
  x: number,
  y: number,
  attrs?: Record<string, string | number | boolean | null>,
): SVGTextContentElement {
  return createSvgElement("text", { ...attrs, x, y }, content) as SVGTextContentElement;
}

/** Create an SVG tspan element */
export function tspan(
  content: string,
  attrs?: Record<string, string | number | boolean | null>,
): SVGTSpanElement {
  return createSvgElement("tspan", attrs, content) as SVGTSpanElement;
}

/** Create multi-line text with tspans */
export function multilineText(
  lines: Array<{ content: string; x?: number; y?: number; dx?: number; dy?: number }>,
  x: number,
  startY: number,
  lineHeight: number,
  attrs?: Record<string, string | number | boolean | null>,
): SVGTextElement {
  const textEl = text("", x, startY, attrs);
  let currentY = startY;
  for (const line of lines) {
    const sp = tspan(line.content, {
      x: line.x ?? x,
      y: line.y ?? currentY,
      dx: line.dx,
      dy: line.dy ?? (lines.indexOf(line) > 0 ? lineHeight : undefined),
    });
    textEl.appendChild(sp);
    if (!line.y) currentY += lineHeight;
  }
  return textEl;
}

// --- Gradients & Defs ---

/** Get or create a <defs> element in an SVG */
export function getOrCreateDefs(svg: SVGSVGElement): SVGDefsElement {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = createSvgElement("defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  return defs as SVGDefsElement;
}

/** Add a linear gradient definition */
export function addLinearGradient(
  svg: SVGSVGElement,
  def: LinearGradientDef,
): SVGGradientElement {
  const defs = getOrCreateDefs(svg);
  const grad = createSvgElement("linearGradient", {
    id: def.id,
    x1: def.x1 ?? "0%",
    y1: def.y1 ?? "0%",
    x2: def.x2 ?? "100%",
    y2: def.y2 ?? "0%",
    gradientUnits: def.gradientUnits ?? "objectBoundingBox",
  });

  for (const stop of def.stops) {
    const stopEl = createSvgElement("stop", {
      offset: String(stop.offset),
      "stop-color": stop.color,
    });
    if (stop.opacity !== undefined) stopEl.setAttribute("stop-opacity", String(stop.opacity));
    grad.appendChild(stopEl);
  }

  defs.appendChild(grad);
  return grad;
}

/** Add a radial gradient definition */
export function addRadialGradient(
  svg: SVGSVGElement,
  def: RadialGradientDef,
): SVGGradientElement {
  const defs = getOrCreateDefs(svg);
  const grad = createSvgElement("radialGradient", {
    id: def.id,
    cx: def.cx ?? "50%",
    cy: def.cy ?? "50%",
    r: def.r ?? "50%",
    fx: def.fx,
    fy: def.fy,
    gradientUnits: def.gradientUnits ?? "objectBoundingBox",
  });

  for (const stop of def.stops) {
    const stopEl = createSvgElement("stop", {
      offset: String(stop.offset),
      "stop-color": stop.color,
    });
    if (stop.opacity !== undefined) stopEl.setAttribute("stop-opacity", String(stop.opacity));
    grad.appendChild(stopEl);
  }

  defs.appendChild(grad);
  return grad;
}

/** Add a pattern definition */
export function addPattern(
  svg: SVGSVGElement,
  id: string,
  width: number,
  height: number,
  patternUnits: string = "userSpaceOnUse",
  children?: SVGElement[],
): SVGPatternElement {
  const defs = getOrCreateDefs(svg);
  const pattern = createSvgElement("pattern", {
    id,
    width: String(width),
    height: String(height),
    patternUnits,
  });

  if (children) {
    for (const child of children) pattern.appendChild(child);
  }

  defs.appendChild(pattern);
  return pattern as SVGPatternElement;
}

/** Add a clip path definition */
export function addClipPath(
  svg: SVGSVGElement,
  id: string,
  clipContent: SVGElement,
): SVGClipPathElement {
  const defs = getOrCreateDefs(svg);
  const clipPath = createSvgElement("clipPath", { id });
  clipPath.appendChild(clipContent);
  defs.appendChild(clipPath);
  return clipPath as SVGClipPathElement;
}

/** Add a mask definition */
export function addMask(
  svg: SVGSVGElement,
  id: string,
  maskContent: SVGElement,
): SVGMaskElement {
  const defs = getOrCreateDefs(svg);
  const mask = createSvgElement("mask", { id });
  mask.appendChild(maskContent);
  defs.appendChild(mask);
  return mask as SVGMaskElement;
}

/** Add a filter definition (e.g., drop shadow, blur) */
export function addFilter(
  svg: SVGSVGElement,
  id: string,
  filterChildren: SVGElement[],
): SVGFilterElement {
  const defs = getOrCreateDefs(svg);
  const filter = createSvgElement("filter", {
    id,
    x: "-50%",
    y: "-50%",
    width: "200%",
    height: "200%",
  });

  for (const child of filterChildren) filter.appendChild(child);

  defs.appendChild(filter);
  return filter as SVGFilterElement;
}

/** Create a drop shadow filter primitive */
export function createDropShadowFilter(
  dx = 2,
  dy = 2,
  stdDev = 3,
  opacity = 0.3,
): SVGFEOffsetElement[] {
  const feOffset = createSvgElement("feOffset", { dx: String(dx), dy: String(dy) });
  const feGaussianBlur = createSvgElement("feGaussianBlur", { stdDeviation: String(stdDev) });
  const feColorMatrix = createSvgElement("feColorMatrix", {
    type: "matrix",
    values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${opacity} 0`,
  });
  const feMerge = createSvgElement("feMerge");
  const feMergeNode1 = createSvgElement("feMergeNode");
  const feMergeNode2 = createSvgElement("feMergeNode", { in: "SourceGraphic" });
  feMerge.appendChild(feMergeNode1);
  feMerge.appendChild(feMergeNode2);

  return [feOffset, feGaussianBlur, feColorMatrix, feMerge];
}

/** Create a gaussian blur filter primitive */
export function createBlurFilter(stdDev = 3): SVGFEGaussianBlurElement {
  return createSvgElement("feGaussianBlur", { stdDeviation: String(stdDev) });
}

// --- ViewBox & Coordinate Transforms ---

/** Parse a viewBox string into components */
export function parseViewBox(vbString: string): ViewBox | null {
  const parts = vbString.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return { x: parts[0]!, y: parts[1]!, width: parts[2]!, height: parts[3]! };
}

/** Get the current viewBox of an SVG element */
export function getViewBox(svg: SVGSVGElement): ViewBox | null {
  const attr = svg.getAttribute("viewBox");
  if (!attr) return null;
  return parseViewBox(attr);
}

/** Set the viewBox of an SVG element */
export function setViewBox(svg: SVGSVGElement, vb: ViewBox): void {
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
}

/** Zoom the viewBox by a factor around a center point */
export function zoomViewBox(
  svg: SVGSVGElement,
  factor: number,
  centerX?: number,
  centerY?: number,
): ViewBox | null {
  const vb = getViewBox(svg);
  if (!vb) return null;

  const cx = centerX ?? vb.x + vb.width / 2;
  const cy = centerY ?? vb.y + vb.height / 2;
  const newW = vb.width / factor;
  const newH = vb.height / factor;
  const newX = cx - newW / 2;
  const newY = cy - newH / 2;

  const newVb: ViewBox = { x: newX, y: newY, width: newW, height: newH };
  setViewBox(svg, newVb);
  return newVb;
}

/** Pan the viewBox by delta amounts */
export function panViewBox(
  svg: SVGSVGElement,
  dx: number,
  dy: number,
): ViewBox | null {
  const vb = getViewBox(svg);
  if (!vb) return null;

  const newVb: ViewBox = {
    x: vb.x - dx,
    y: vb.y - dy,
    width: vb.width,
    height: vb.height,
  };
  setViewBox(svg, newVb);
  return newVb;
}

/** Convert screen coordinates to SVG coordinates */
export function screenToSvg(
  svg: SVGSVGElement,
  screenX: number,
  screenY: number,
): SvgPoint | null {
  const pt = svg.createSVGPoint();
  pt.x = screenX;
  pt.y = screenY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

/** Convert SVG coordinates to screen coordinates */
export function svgToScreen(
  svg: SVGSVGElement,
  svgX: number,
  svgY: number,
): SvgPoint | null {
  const pt = svg.createSVGPoint();
  pt.x = svgX;
  pt.y = svgY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const transformed = pt.matrixTransform(ctm);
  return { x: transformed.x, y: transformed.y };
}

// --- DOM Manipulation ---

/** Append children to an SVG element */
export function appendChildren(parent: SVGElement, children: SVGElement[]): void {
  for (const child of children) parent.appendChild(child);
}

/** Insert a child before a reference element */
export function insertBefore(
  parent: SVGElement,
  child: SVGElement,
  refChild: SVGElement | null,
): void {
  parent.insertBefore(child, refChild);
}

/** Remove an element from its parent */
export function removeElement(el: SVGElement): void {
  el.remove();
}

/** Replace one element with another */
export function replaceElement(oldEl: SVGElement, newEl: SVGElement): void {
  oldEl.parentNode?.replaceChild(newEl, oldEl);
}

/** Clear all children of an element */
export function clearChildren(el: SVGElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Wrap an element inside another */
export function wrapSvgElement(wrapper: SVGElement, inner: SVGElement): void {
  inner.parentNode?.replaceChild(wrapper, inner);
  wrapper.appendChild(inner);
}

/** Clone an SVG element deeply */
export function cloneSvg(el: SVGElement, deep = true): SVGElement {
  return el.cloneNode(deep) as SVGElement;
}

/** Find elements by tag name within an SVG */
export function findByTag<T extends SVGElement>(
  parent: SVGElement,
  tagName: string,
): T[] {
  return Array.from(parent.querySelectorAll(tagName)) as T[];
}

/** Find element by ID within an SVG document */
export function findById(svg: SVGSVGElement, id: string): SVGElement | null {
  // Use getElementById on the owner document or fallback to querySelector
  try {
    return svg.ownerDocument.getElementById(id);
  } catch {
    return svg.querySelector(`#${CSS.escape(id)}`);
  }
}

// --- Export Utilities ---

/** Serialize an SVG element to XML string */
export function serializeSvg(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}

/** Convert SVG to a data URL (for img src, background-image, etc.) */
export function svgToDataUrl(svg: SVGSVGElement, type = "image/svg+xml"): string {
  const xml = serializeSvg(svg);
  const encoded = type === "image/svg+xml"
    ? encodeURIComponent(xml)
    : btoa(unescape(encodeURIComponent(xml)));
  return `data:${type};base64,${encoded}`;
}

/** Convert SVG to Blob for download/upload */
export function svgToBlob(
  svg: SVGSVGElement,
  type = "image/svg+xml;charset=utf-8",
): Blob {
  const xml = serializeSvg(svg);
  return new Blob([xml], { type });
}

/** Download an SVG as a file */
export function downloadSvg(
  svg: SVGSVGElement,
  filename = "image.svg",
): void {
  const blob = svgToBlob(svg);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Convert SVG to PNG via canvas rasterization */
export async function svgToPng(
  svg: SVGSVGElement,
  scale = 1,
  backgroundColor?: string,
): Promise<HTMLCanvasElement> {
  const xml = serializeSvg(svg);
  const vb = getViewBox(svg) ?? { x: 0, y: 0, width: svg.clientWidth || 300, height: svg.clientHeight || 150 };

  const canvas = document.createElement("canvas");
  canvas.width = vb.width * scale;
  canvas.height = vb.height * scale;
  const ctx = canvas.getContext("2d")!;

  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to render SVG"));
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
  });

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Embed external images as base64 data URIs in the SVG */
export function embedImages(svg: SVGSVGElement): Promise<void> {
  const images = findByTag<SVGImageElement>(svg, "image");
  const promises = images.map(async (img) => {
    const href = img.getAttribute("href") || img.getAttributeNS(XLINK_NS, "href");
    if (!href || href.startsWith("data:")) return;

    try {
      const response = await fetch(href);
      const blob = await response.blob();
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      img.setAttribute("href", dataUrl);
    } catch {
      // Silently skip failed embeds
    }
  });

  return Promise.all(promises).then(() => {});
}

// --- Measurement & Bounding ---

/** Get the bounding box of an SVG element in SVG coordinates */
export function getBBox(el: SVGElement): SVGRect | null {
  try {
    return el.getBBox();
  } catch {
    return null;
  }
}

/** Get the bounding box of an SVG element in screen coordinates */
export function getBoundingClientRect(el: SVGElement): DOMRect {
  return el.getBoundingClientRect();
}

/** Get the total path length of an SVG path element */
export function getPathLength(pathEl: SVGPathElement): number {
  return pathEl.getTotalLength();
}

/** Get a point along a path at a given distance */
export function getPointAtLength(
  pathEl: SVGPathElement,
  distance: number,
): SVGPoint | null {
  try {
    return pathEl.getPointAtLength(distance);
  } catch {
    return null;
  }
}

/** Check if a point is inside an SVG element */
export function isPointInFill(el: SVGElement, x: number, y: number): boolean {
  try {
    const pt = el.ownerSVGElement?.createSVGPoint() ?? { x, y } as unknown as SVGPoint;
    (pt as SVGPoint).x = x;
    (pt as SVGPoint).y = y;
    return el.isPointInFill(pt);
  } catch {
    return false;
  }
}

/** Check if a point is on the stroke of an SVG element */
export function isPointInStroke(el: SVGElement, x: number, y: number): boolean {
  try {
    const pt = el.ownerSVGElement?.createSVGPoint() ?? { x, y } as unknown as SVGPoint;
    (pt as SVGPoint).x = x;
    (pt as SVGPoint).y = y;
    return el.isPointInStroke(pt);
  } catch {
    return false;
  }
}
