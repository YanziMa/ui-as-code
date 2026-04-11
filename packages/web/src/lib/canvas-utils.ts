/**
 * Canvas Utilities: 2D rendering helpers, shape drawing, gradients,
 * image manipulation, text rendering, path operations, pixel access,
 * layer management, and export utilities.
 */

// --- Types ---

export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface Rect2D extends Point2D, Size2D {}

export interface ColorStop {
  offset: number; // 0-1
  color: string;
}

export interface CanvasLayer {
  id: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  visible: boolean;
  opacity: number;
  zIndex: number;
}

export interface DrawOptions {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  lineDash?: number[];
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  globalCompositeOperation?: GlobalCompositeOperation;
}

export interface TextDrawOptions extends DrawOptions {
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  maxWidth?: number;
  letterSpacing?: number;
}

export interface ImageFilterOptions {
  brightness?: number;   // -1 to 1
  contrast?: number;     // -1 to 1
  saturate?: number;     // -1 to 1
  hueRotate?: number;    // degrees
  blur?: number;         // pixels
  grayscale?: boolean;
  sepia?: boolean;
  invert?: boolean;
}

export interface PixelData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// --- Canvas Factory ---

/** Create a canvas element with given dimensions */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Create an offscreen canvas (uses OffscreenCanvas if available) */
export function createOffscreenCanvas(
  width: number,
  height: number,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  return createCanvas(width, height);
}

/** Get or create 2D context from a canvas */
export function getContext2D(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): CanvasRenderingContext2D | null {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.getContext("2d");
  }
  return canvas.getContext("2d");
}

/** Resize a canvas while optionally preserving content */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  newWidth: number,
  newHeight: number,
  preserveContent = false,
): void {
  if (preserveContent && (canvas.width > 0 || canvas.height > 0)) {
    const imageData = canvas.getContext("2d")?.getImageData(
      0, 0, canvas.width, canvas.height,
    );
    canvas.width = newWidth;
    canvas.height = newHeight;
    if (imageData) {
      canvas.getContext("2d")?.putImageData(imageData, 0, 0);
    }
  } else {
    canvas.width = newWidth;
    canvas.height = newHeight;
  }
}

/** Clear a canvas entirely */
export function clearCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): void {
  const ctx = getContext2D(canvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/** Clear a rectangular region of the canvas */
export function clearRect(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const ctx = getContext2D(canvas);
  if (!ctx) return;
  ctx.clearRect(x, y, w, h);
}

// --- Draw Options Application ---

/** Apply common draw options to a context */
export function applyDrawOptions(
  ctx: CanvasRenderingContext2D,
  options: DrawOptions,
): void {
  if (options.fill) ctx.fillStyle = options.fill;
  if (options.stroke) ctx.strokeStyle = options.stroke;
  if (options.lineWidth !== undefined) ctx.lineWidth = options.lineWidth;
  if (options.opacity !== undefined) ctx.globalAlpha = options.opacity;
  if (options.shadowColor !== undefined) ctx.shadowColor = options.shadowColor;
  if (options.shadowBlur !== undefined) ctx.shadowBlur = options.shadowBlur;
  if (options.shadowOffsetX !== undefined) ctx.shadowOffsetX = options.shadowOffsetX;
  if (options.shadowOffsetY !== undefined) ctx.shadowOffsetY = options.shadowOffsetY;
  if (options.lineDash) ctx.setLineDash(options.lineDash);
  if (options.lineCap) ctx.lineCap = options.lineCap;
  if (options.lineJoin) ctx.lineJoin = options.lineJoin;
  if (options.globalCompositeOperation) ctx.globalCompositeOperation = options.globalCompositeOperation;
}

/** Reset draw options to defaults */
export function resetDrawOptions(ctx: CanvasRenderingContext2D): void {
  ctx.globalAlpha = 1;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.globalCompositeOperation = "source-over";
}

// --- Shape Drawing ---

/** Draw a filled and/or stroked rectangle */
export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options: DrawOptions = {},
): void {
  applyDrawOptions(ctx, options);
  if (options.fill) ctx.fillRect(x, y, w, h);
  if (options.stroke) ctx.strokeRect(x, y, w, h);
  resetDrawOptions(ctx);
}

/** Draw a rounded rectangle path (optionally fill/stroke) */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  options: DrawOptions = {},
): void {
  applyDrawOptions(ctx, options);

  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();

  if (options.fill) ctx.fill();
  if (options.stroke) ctx.stroke();
  resetDrawOptions(ctx);
}

/** Draw a circle */
export function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  options: DrawOptions = {},
): void {
  applyDrawOptions(ctx, options);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  if (options.fill) ctx.fill();
  if (options.stroke) ctx.stroke();
  resetDrawOptions(ctx);
}

/** Draw an ellipse */
export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  rotation = 0,
  options: DrawOptions = {},
): void {
  applyDrawOptions(ctx, options);
  ctx.beginPath();
  ctx.ellipse(cx, cy, radiusX, radiusY, rotation, 0, Math.PI * 2);
  if (options.fill) ctx.fill();
  if (options.stroke) ctx.stroke();
  resetDrawOptions(ctx);
}

/** Draw a regular polygon (triangle, pentagon, hexagon, etc.) */
export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation = 0,
  options: DrawOptions = {},
): void {
  applyDrawOptions(ctx, options);
  ctx.beginPath();

  const angleStep = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = rotation + i * angleStep - Math.PI / 2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  if (options.fill) ctx.fill();
  if (options.stroke) ctx.stroke();
  resetDrawOptions(ctx);
}

/** Draw a star shape */
export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation = 0,
  options: DrawOptions = {},
): void {
  applyDrawOptions(ctx, options);
  ctx.beginPath();

  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation + i * step - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  if (options.fill) ctx.fill();
  if (options.stroke) ctx.stroke();
  resetDrawOptions(ctx);
}

/** Draw a line between two points */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: DrawOptions = {},
): void {
  applyDrawOptions(ctx, options);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  if (options.stroke) ctx.stroke();
  resetDrawOptions(ctx);
}

/** Draw multiple connected lines from point array */
export function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  close = false,
  options: DrawOptions = {},
): void {
  if (points.length < 2) return;

  applyDrawOptions(ctx, options);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }

  if (close) ctx.closePath();
  if (options.fill && close) ctx.fill();
  if (options.stroke) ctx.stroke();
  resetDrawOptions(ctx);
}

/** Draw an arrow/pointer line */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  headLength = 10,
  headAngle = Math.PI / 6,
  options: DrawOptions = {},
): void {
  applyDrawOptions(ctx, options);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - headAngle),
    y2 - headLength * Math.sin(angle - headAngle),
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + headAngle),
    y2 - headLength * Math.sin(angle + headAngle),
  );
  ctx.stroke();
  resetDrawOptions(ctx);
}

// --- Gradients ---

/** Create a linear gradient with color stops */
export function createLinearGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: ColorStop[],
): CanvasGradient {
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const stop of stops) {
    grad.addColorStop(stop.offset, stop.color);
  }
  return grad;
}

/** Create a radial gradient with color stops */
export function createRadialGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  stops: ColorStop[],
): CanvasGradient {
  const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
  for (const stop of stops) {
    grad.addColorStop(stop.offset, stop.color);
  }
  return grad;
}

/** Create a conic/conical gradient (simulated via many linear segments) */
export function createConicGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  startAngle: number,
  stops: ColorStop[],
  radius: number,
): CanvasGradient {
  // Fallback: use a multi-stop linear approximation around center
  // For true conic gradient support, browsers may have native createConicGradient
  if (typeof (ctx as unknown as Record<string, unknown>).createConicGradient === "function") {
    const nativeGrad = (ctx as unknown as { createConicGradient: (angle: number, cx: number, cy: number) => CanvasGradient })
      .createConicGradient(startAngle, cx, cy);
    for (const stop of stops) {
      nativeGrad.addColorStop(stop.offset, stop.color);
    }
    return nativeGrad;
  }

  // Approximate with radial gradient as fallback
  return createRadialGradient(ctx, cx, cy, 0, radius, stops);
}

/** Common gradient presets */
export const GRADIENT_PRESETS = {
  rainbow: [
    { offset: 0, color: "#ff0000" },
    { offset: 0.17, color: "#ff8800" },
    { offset: 0.33, color: "#ffff00" },
    { offset: 0.5, color: "#00ff00" },
    { offset: 0.67, color: "#0088ff" },
    { offset: 0.83, color: "#0000ff" },
    { offset: 1, color: "#8800ff" },
  ],
  sunset: [
    { offset: 0, color: "#ff6b6b" },
    { offset: 0.5, color: "#feca57" },
    { offset: 1, color: "#ff9ff3" },
  ],
  ocean: [
    { offset: 0, color: "#0077be" },
    { offset: 0.5, color: "#00a8e8" },
    { offset: 1, color: "#7fdbda" },
  ],
  forest: [
    { offset: 0, color: "#1a472a" },
    { offset: 0.5, color: "#2d6a4f" },
    { offset: 1, color: "#95d5b2" },
  ],
  fire: [
    { offset: 0, color: "#ff0000" },
    { offset: 0.4, color: "#ff4500" },
    { offset: 0.7, color: "#ffa500" },
    { offset: 1, color: "#ffff00" },
  ],
  metallic: [
    { offset: 0, color: "#434343" },
    { offset: 0.3, color: "#888888" },
    { offset: 0.7, color: "#cccccc" },
    { offset: 1, color: "#ffffff" },
  ],
  glass: [
    { offset: 0, color: "rgba(255,255,255,0.4)" },
    { offset: 0.5, color: "rgba(255,255,255,0.1)" },
    { offset: 1, color: "rgba(255,255,255,0.3)" },
  ],
} as const;

// --- Text Rendering ---

/** Apply text-specific options to context */
export function applyTextOptions(
  ctx: CanvasRenderingContext2D,
  options: TextDrawOptions,
): void {
  applyDrawOptions(ctx, options);

  if (options.font) {
    ctx.font = options.font;
  } else if (options.fontSize || options.fontFamily) {
    const size = options.fontSize ?? 16;
    const family = options.fontFamily ?? "sans-serif";
    const weight = options.fontWeight ?? "normal";
    ctx.font = `${weight} ${size}px ${family}`;
  }

  if (options.textAlign) ctx.textAlign = options.textAlign;
  if (options.textBaseline) ctx.textBaseline = options.textBaseline;
}

/** Draw text on canvas with full option support */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: TextDrawOptions = {},
): TextMetrics {
  applyTextOptions(ctx, options);

  if (options.maxWidth) {
    ctx.fillText(text, x, y, options.maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
  if (options.stroke) ctx.strokeText(text, x, y, options.maxWidth);

  resetDrawOptions(ctx);
  return ctx.measureText(text);
}

/** Draw wrapped/multiline text within a bounding box */
export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: TextDrawOptions = {},
): { lines: string[]; totalHeight: number } {
  applyTextOptions(ctx, options);

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  let offsetY = y;
  for (const line of lines) {
    ctx.fillText(line, x, offsetY);
    if (options.stroke) ctx.strokeText(line, x, offsetY);
    offsetY += lineHeight;
  }

  resetDrawOptions(ctx);
  return { lines, totalHeight: (lines.length) * lineHeight };
}

/** Measure text that will be drawn with given options */
export function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font?: string,
): TextMetrics {
  if (font) ctx.font = font;
  return ctx.measureText(text);
}

/** Get approximate text bounding box */
export function getTextBounds(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: TextDrawOptions = {},
): Rect2D {
  applyTextOptions(ctx, options);
  const metrics = ctx.measureText(text);
  const align = options.textAlign ?? "left";
  const baseline = options.textBaseline ?? "alphabetic";

  let offsetX = x;
  switch (align) {
    case "center": offsetX -= metrics.width / 2; break;
    case "right": offsetX -= metrics.width; break;
  }

  let offsetY = y;
  // Approximate baseline offsets
  switch (baseline) {
    case "top": case "hanging": break;
    case "middle": offsetY += metrics.actualBoundingBoxAscent / 2; break;
    case "bottom": case "ideographic": offsetY += metrics.actualBoundingBoxAscent; break;
    default: offsetY -= metrics.actualBoundingBoxDescent; // alphabetic
  }

  resetDrawOptions(ctx);
  return {
    x: offsetX,
    y: offsetY - metrics.actualBoundingBoxAscent,
    width: metrics.width,
    height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
  };
}

// --- Image Operations ---

/** Draw an image with various positioning modes */
export function drawImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  dx: number,
  dy: number,
  dWidth?: number,
  dHeight?: number,
  sx?: number,
  sy?: number,
  sWidth?: number,
  sHeight?: number,
): void {
  if (
    sx !== undefined &&
    sy !== undefined &&
    sWidth !== undefined &&
    sHeight !== undefined &&
    dWidth !== undefined &&
    dHeight !== undefined
  ) {
    ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  } else if (dWidth !== undefined && dHeight !== undefined) {
    ctx.drawImage(image, dx, dy, dWidth, dHeight);
  } else {
    ctx.drawImage(image, dx, dy);
  }
}

/** Draw an image covering the entire canvas (cover mode) */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  canvasW: number,
  canvasH: number,
): void {
  const imgW = (image as HTMLImageElement).naturalWidth ?? (image as HTMLVideoElement).videoWidth ?? canvasW;
  const imgH = (image as HTMLImageElement).naturalHeight ?? (image as HTMLVideoElement).videoHeight ?? canvasH;

  const scale = Math.max(canvasW / imgW, canvasH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  const dx = (canvasW - dw) / 2;
  const dy = (canvasH - dh) / 2;

  ctx.drawImage(image, dx, dy, dw, dh);
}

/** Draw an image fitting inside the canvas (contain mode) */
export function drawImageContain(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  canvasW: number,
  canvasH: number,
): void {
  const imgW = (image as HTMLImageElement).naturalWidth ?? (image as HTMLVideoElement).videoWidth ?? canvasW;
  const imgH = (image as HTMLImageElement).naturalHeight ?? (image as HTMLVideoElement).videoHeight ?? canvasH;

  const scale = Math.min(canvasW / imgW, canvasH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  const dx = (canvasW - dw) / 2;
  const dy = (canvasH - dh) / 2;

  ctx.drawImage(image, dx, dy, dw, dh);
}

/** Load an image and return a promise */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Convert canvas to Blob (PNG or JPEG) */
export function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type = "image/png",
  quality = 0.92,
): Promise<Blob | null> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

/** Convert canvas to data URL */
export function canvasToDataURL(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.92,
): string {
  return canvas.toDataURL(type, quality);
}

/** Download canvas as image file */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename = "canvas-image.png",
  type = "image/png",
  quality = 0.92,
): Promise<void> {
  const blob = await canvasToBlob(canvas, type, quality);
  if (!blob) throw new Error("Failed to convert canvas to blob");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Pixel Access & Manipulation ---

/** Get raw pixel data from a region of the canvas */
export function getPixelData(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  x = 0,
  y = 0,
  width?: number,
  height?: number,
): PixelData {
  const ctx = getContext2D(canvas)!;
  const w = width ?? canvas.width;
  const h = height ?? canvas.height;
  const data = ctx.getImageData(x, y, w, h);
  return { data: data.data, width: data.width, height: data.height };
}

/** Set pixel data onto the canvas */
export function setPixelData(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  pixelData: PixelData,
  x = 0,
  y = 0,
): void {
  const ctx = getContext2D(canvas)!;
  const imageData = new ImageData(pixelData.data, pixelData.width, pixelData.height);
  ctx.putImageData(imageData, x, y);
}

/** Get the color of a single pixel */
export function getPixel(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  x: number,
  y: number,
): { r: number; g: number; b: number; a: number } {
  const ctx = getContext2D(canvas)!;
  const data = ctx.getImageData(x, y, 1, 1).data;
  return { r: data[0], g: data[1], b: data[2], a: data[3] };
}

/** Set the color of a single pixel */
export function setPixel(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): void {
  const ctx =getContext2D(canvas)!;
  const data = ctx.createImageData(1, 1);
  data.data[0] = r;
  data.data[1] = g;
  data.data[2] = b;
  data.data[3] = a;
  ctx.putImageData(data, x, y);
}

/** Apply a filter function to every pixel in the canvas */
export function applyPixelFilter(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  filterFn: (r: number, g: number, b: number, a: number, x: number, y: number) => [number, number, number, number],
): void {
  const ctx = getContext2D(canvas)!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const [nr, ng, nb, na] = filterFn(data[idx], data[idx + 1], data[idx + 2], data[idx + 3], x, y);
      data[idx] = nr;
      data[idx + 1] = ng;
      data[idx + 2] = nb;
      data[idx + 3] = na;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/** Apply CSS-style image filters using pixel manipulation */
export function applyImageFilters(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  filters: ImageFilterOptions,
): void {
  applyPixelFilter(canvas, (r, g, b, a) => {
    let nr = r, ng = g, nb = b;

    if (filters.grayscale) {
      const gray = 0.299 * nr + 0.587 * ng + 0.114 * nb;
      nr = ng = nb = gray;
    }

    if (filters.sepia) {
      const tr = 0.393 * nr + 0.769 * ng + 0.189 * nb;
      const tg = 0.349 * nr + 0.686 * ng + 0.168 * nb;
      const tb = 0.272 * nr + 0.534 * ng + 0.131 * nb;
      nr = tr; ng = tg; nb = tb;
    }

    if (filters.invert) {
      nr = 255 - nr;
      ng = 255 - ng;
      nb = 255 - nb;
    }

    if (filters.brightness !== undefined) {
      const adj = filters.brightness * 255;
      nr = clamp(nr + adj, 0, 255);
      ng = clamp(ng + adj, 0, 255);
      nb = clamp(nb + adj, 0, 255);
    }

    if (filters.contrast !== undefined) {
      const factor = (1 + filters.contrast);
      nr = clamp(factor * (nr - 128) + 128, 0, 255);
      ng = clamp(factor * (ng - 128) + 128, 0, 255);
      nb = clamp(factor * (nb - 128) + 128, 0, 255);
    }

    if (filters.saturate !== undefined) {
      const gray = 0.299 * nr + 0.587 * ng + 0.114 * nb;
      const factor = 1 + filters.saturate;
      nr = clamp(gray + factor * (nr - gray), 0, 255);
      ng = clamp(gray + factor * (ng - gray), 0, 255);
      nb = clamp(gray + factor * (nb - gray), 0, 255);
    }

    return [Math.round(nr), Math.round(ng), Math.round(nb), a];
  });
}

/** Clamp value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Transform Helpers ---

/** Save context state, run callback, restore state */
export function withSavedContext<T>(
  ctx: CanvasRenderingContext2D,
  fn: (ctx: CanvasRenderingContext2D) => T,
): T {
  ctx.save();
  try {
    return fn(ctx);
  } finally {
    ctx.restore();
  }
}

/** Translate, run drawing, then translate back */
export function atPosition<T>(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fn: (ctx: CanvasRenderingContext2D) => T,
): T {
  ctx.save();
  ctx.translate(x, y);
  try {
    return fn(ctx);
  } finally {
    ctx.restore();
  }
}

/** Scale, run drawing, then restore */
export function atScale<T>(
  ctx: CanvasRenderingContext2D,
  scaleX: number,
  scaleY: number,
  fn: (ctx: CanvasRenderingContext2D) => T,
): T {
  ctx.save();
  ctx.scale(scaleX, scaleY);
  try {
    return fn(ctx);
  } finally {
    ctx.restore();
  }
}

/** Rotate around a point, run drawing, then restore */
export function rotateAround(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radians: number,
  fn: (ctx: CanvasRenderingContext2D) => void,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(radians);
  ctx.translate(-cx, -cy);
  try {
    fn(ctx);
  } finally {
    ctx.restore();
  }
}

/** Flip horizontally */
export function flipHorizontal(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  fn: (ctx: CanvasRenderingContext2D) => void,
): void {
  ctx.save();
  ctx.translate(centerX, 0);
  ctx.scale(-1, 1);
  ctx.translate(-centerX, 0);
  try {
    fn(ctx);
  } finally {
    ctx.restore();
  }
}

/** Flip vertically */
export function flipVertical(
  ctx: CanvasRenderingContext2D,
  centerY: number,
  fn: (ctx: CanvasRenderingContext2D) => void,
): void {
  ctx.save();
  ctx.translate(0, centerY);
  ctx.scale(1, -1);
  ctx.translate(0, -centerY);
  try {
    fn(ctx);
  } finally {
    ctx.restore();
  }
}

// --- Layer Management ---

/**
 * LayerManager - manages multiple canvas layers with z-ordering.
 */
export class LayerManager {
  private container: HTMLElement;
  private layers: Map<string, CanvasLayer> = new Map();
  private width: number;
  private height: number;

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;
  }

  /** Create a new layer */
  createLayer(id: string, zIndex = 0): CanvasLayer {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = String(zIndex);
    canvas.dataset.layerId = id;

    const ctx = canvas.getContext("2d")!;
    this.container.appendChild(canvas);

    const layer: CanvasLayer = { id, canvas, ctx, visible: true, opacity: 1, zIndex };
    this.layers.set(id, layer);
    return layer;
  }

  /** Get a layer by ID */
  getLayer(id: string): CanvasLayer | undefined {
    return this.layers.get(id);
  }

  /** Get the context of a specific layer */
  getCtx(id: string): CanvasRenderingContext2D | null {
    return this.layers.get(id)?.ctx ?? null;
  }

  /** Set layer visibility */
  setVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visible = visible;
      layer.canvas.style.display = visible ? "block" : "none";
    }
  }

  /** Set layer opacity */
  setOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.opacity = opacity;
      layer.canvas.style.opacity = String(opacity);
    }
  }

  /** Set z-index of a layer */
  setZIndex(id: string, zIndex: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.zIndex = zIndex;
      layer.canvas.style.zIndex = String(zIndex);
    }
  }

  /** Bring layer to front */
  bringToFront(id: string): void {
    const maxZ = Math.max(...Array.from(this.layers.values()).map((l) => l.zIndex));
    this.setZIndex(id, maxZ + 1);
  }

  /** Send layer to back */
  sendToBack(id: string): void {
    const minZ = Math.min(...Array.from(this.layers.values()).map((l) => l.zIndex));
    this.setZIndex(id, minZ - 1);
  }

  /** Clear all layers */
  clearAll(): void {
    for (const [, layer] of this.layers) {
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    }
  }

  /** Remove and destroy a layer */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.canvas.remove();
      this.layers.delete(id);
    }
  }

  /** Flatten all visible layers into a single canvas */
  flatten(): HTMLCanvasElement {
    const output = createCanvas(this.width, this.height);
    const outCtx = output.getContext("2d")!;

    const sortedLayers = Array.from(this.layers.values())
      .filter((l) => l.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      outCtx.globalAlpha = layer.opacity;
      outCtx.drawImage(layer.canvas, 0, 0);
    }

    outCtx.globalAlpha = 1;
    return output;
  }

  /** Resize all layers */
  resize(newWidth: number, newHeight: number): void {
    this.width = newWidth;
    this.height = newHeight;
    for (const [, layer] of this.layers) {
      resizeCanvas(layer.canvas, newWidth, newHeight, false);
    }
  }

  /** Destroy all layers and clean up */
  destroy(): void {
    for (const [id] of this.layers) {
      this.removeLayer(id);
    }
    this.layers.clear();
  }

  /** Get all layer IDs */
  getLayerIds(): string[] {
    return Array.from(this.layers.keys());
  }
}

// --- Pattern Drawing ---

/** Draw a checkerboard pattern */
export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  size: number,
  colorA: string,
  colorB: string,
): void {
  const cols = Math.ceil(w / size);
  const rows = Math.ceil(h / size);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(x + col * size, y + row * size, size, size);
    }
  }
}

/** Draw a grid pattern */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cellSize: number,
  strokeStyle = "#ccc",
  lineWidth = 1,
): void {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  // Vertical lines
  for (let gx = x; gx <= x + w; gx += cellSize) {
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
  }

  // Horizontal lines
  for (let gy = y; gy <= y + h; gy += cellSize) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
  }

  ctx.stroke();
}

/** Draw dots pattern */
export function drawDots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  spacing: number,
  radius = 2,
  color = "#999",
): void {
  ctx.fillStyle = color;
  for (let dotY = y + spacing / 2; dotY < y + h; dotY += spacing) {
    for (let dotX = x + spacing / 2; dotX < x + w; dotX += spacing) {
      ctx.beginPath();
      ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Draw diagonal stripes */
export function drawStripes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stripeWidth: number,
  angle: number,
  color = "#ddd",
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.strokeStyle = color;
  ctx.lineWidth = stripeWidth;

  const rad = (angle * Math.PI) / 180;
  const diagonal = Math.sqrt(w * w + h * h);
  const step = stripeWidth * 2;

  // Calculate start position
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  ctx.beginPath();
  for (let i = -diagonal; i < diagonal * 2; i += step) {
    const px = x + i * cos;
    const py = y + i * sin - diagonal * sin;
    ctx.moveTo(px, py);
    ctx.lineTo(px + diagonal * cos, py + diagonal * sin);
  }
  ctx.stroke();
  ctx.restore();
}

// --- Utility Functions ---

/** Check if a point is inside a rectangle */
export function pointInRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/** Check if a point is inside a circle */
export function pointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/** Convert hex color to RGB components */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1]!, 16), g: parseInt(result[2]!, 16), b: parseInt(result[3]!, 16) }
    : null;
}

/** Convert RGB to hex color string */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map((c) => Math.round(clamp(c, 0, 255))
      .toString(16)
      .padStart(2, "0"))
    .join("");
}

/** Parse any CSS color string to RGB */
export function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  // Create a temp canvas to leverage browser's color parsing
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
}

/** Generate a unique ID for canvas elements */
export function generateCanvasId(prefix = "canvas"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
