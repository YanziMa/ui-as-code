/**
 * Signature Pad: Canvas-based drawing component for signatures with
 * pressure-sensitive strokes, undo/redo, clear, save as image/PNG/SVG,
 * touch support, pen color/width customization, and grid background.
 */

// --- Types ---

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

export interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
}

export interface SignaturePadOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Canvas width in px (default: 400) */
  width?: number;
  /** Canvas height in px (default: 200) */
  height?: number;
  /** Pen color (default: "#000000") */
  penColor?: string;
  /** Pen width in px (default: 2) */
  penWidth?: number;
  /** Background color (default: transparent) */
  backgroundColor?: string;
  /** Show grid/dotted background? */
  showGrid?: boolean;
  /** Grid color (default: "#e5e7eb") */
  gridColor?: string;
  /** Enable touch drawing? */
  touchEnabled?: boolean;
  /** Smoothing factor 0-1 (default: 0.5) */
  smoothing?: number;
  /** Dot size for single taps (default: 3) */
  dotSize?: number;
  /** Min stroke length to register (default: 2) */
  minStrokeLength?: number;
  /** Callback on stroke end */
  onEnd?: () => void;
  /** Callback on stroke begin */
  onBegin?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface SignaturePadInstance {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Check if pad has any content */
  isEmpty: () => boolean;
  /** Clear all strokes */
  clear: () => void;
  /** Undo last stroke */
  undo: () => void;
  /** Redo undone stroke */
  redo: () => void;
  /** Get data URL (PNG by default) */
  toDataURL: (type?: string, quality?: number) => string;
  /** Get as Blob */
  toBlob: (type?: string, quality?: number) => Promise<Blob>;
  /** Get SVG string representation */
  toSVG: () => string;
  /** Get raw stroke data */
  getStrokes: () => Stroke[];
  /** Load from stroke data */
  fromStrokes: (strokes: Stroke[]) => void;
  /** Load from data URL */
  fromDataURL: (dataUrl: string) => void;
  /** Set pen color */
  setPenColor: (color: string) => void;
  /** Set pen width */
  setPenWidth: (width: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class SignaturePadManager {
  create(options: SignaturePadOptions): SignaturePadInstance {
    const opts = {
      width: options.width ?? 400,
      height: options.height ?? 200,
      penColor: options.penColor ?? "#000000",
      penWidth: options.penWidth ?? 2,
      backgroundColor: options.backgroundColor ?? "transparent",
      showGrid: options.showGrid ?? false,
      gridColor: options.gridColor ?? "#e5e7eb",
      touchEnabled: options.touchEnabled ?? true,
      smoothing: options.smoothing ?? 0.5,
      dotSize: options.dotSize ?? 3,
      minStrokeLength: options.minStrokeLength ?? 2,
      disabled: options.disabled ?? false,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("SignaturePad: container not found");

    container.className = `signature-pad ${opts.className ?? ""}`;
    container.style.cssText = `
      display:inline-block;position:relative;cursor:${opts.disabled ? "not-allowed" : "crosshair"};
      border-radius:8px;overflow:hidden;
      ${opts.showGrid ? `border:1px solid ${opts.gridColor};` : ""}
    `;

    // Canvas
    const canvas = document.createElement("canvas");
    canvas.width = opts.width * (devicePixelRatio || 1);
    canvas.height = opts.height * (devicePixelRatio || 1);
    canvas.style.cssText = `
      width:${opts.width}px;height:${opts.height}px;display:block;touch-action:none;
    `;
    canvas.setAttribute("aria-label", "Signature drawing area");
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio || 1, devicePixelRatio || 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // State
    let strokes: Stroke[] = [];
    let undoneStrokes: Stroke[] = [];
    let currentStroke: StrokePoint[] | null = null;
    let isDrawing = false;
    let lastPoint: StrokePoint | null = null;
    let destroyed = false;

    function getPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      const me = e as MouseEvent;
      return {
        x: me.clientX - rect.left,
        y: me.clientY - rect.top,
      };
    }

    function getPressure(e: MouseEvent | TouchEvent): number {
      if ("touches" in e && e.touches.length > 0) {
        return (e.touches[0] as unknown as { force?: number }).force ?? 0.5;
      }
      return 0.5;
    }

    function startDraw(e: MouseEvent | TouchEvent): void {
      if (opts.disabled || destroyed) return;
      e.preventDefault();

      isDrawing = true;
      const pos = getPos(e);
      currentStroke = [{ ...pos, pressure: getPressure(e), time: Date.now() }];
      lastPoint = currentStroke[0]!;

      opts.onBegin?.();
    }

    function moveDraw(e: MouseEvent | TouchEvent): void {
      if (!isDrawing || !currentStroke || opts.disabled || destroyed) return;
      e.preventDefault();

      const pos = getPos(e);
      const point: StrokePoint = { ...pos, pressure: getPressure(e), time: Date.now() };

      // Draw segment
      drawSegment(lastPoint!, point);
      currentStroke.push(point);
      lastPoint = point;
    }

    function endDraw(): void {
      if (!isDrawing || !currentStroke) return;
      isDrawing = false;

      if (currentStroke.length >= opts.minStrokeLength) {
        strokes.push({
          points: [...currentStroke],
          color: opts.penColor,
          width: opts.penWidth,
        });
        undoneStrokes = []; // Clear redo stack on new stroke
        opts.onEnd?.();
      }

      currentStroke = null;
      lastPoint = null;
    }

    function drawSegment(from: StrokePoint, to: StrokePoint): void {
      ctx.beginPath();
      ctx.strokeStyle = opts.penColor;
      ctx.lineWidth = opts.penWidth;

      if (opts.smoothing > 0 && currentStroke && currentStroke.length >= 2) {
        // Quadratic bezier smoothing
        const prevIdx = currentStroke.length - 2;
        const prev = currentStroke[prevIdx]!;
        const midX = (prev.x + to.x) / 2;
        const midY = (prev.y + to.y) / 2;

        ctx.moveTo(prev.x, prev.y);
        ctx.quadraticCurveTo(to.x, to.y, midX, midY);
      } else {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }

      ctx.stroke();
    }

    function redrawAll(): void {
      ctx.clearRect(0, 0, opts.width, opts.height);

      // Background
      if (opts.backgroundColor !== "transparent") {
        ctx.fillStyle = opts.backgroundColor;
        ctx.fillRect(0, 0, opts.width, opts.height);
      }

      // Grid
      if (opts.showGrid) {
        drawGrid();
      }

      // Redraw all strokes
      for (const stroke of strokes) {
        drawStroke(stroke);
      }
    }

    function drawStroke(stroke: Stroke): void {
      if (stroke.points.length < 2) {
        // Draw a dot for single-point strokes
        if (stroke.points.length === 1) {
          const p = stroke.points[0]!;
          ctx.beginPath();
          ctx.fillStyle = stroke.color;
          ctx.arc(p.x, p.y, opts.dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;

      ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);

      for (let i = 1; i < stroke.points.length; i++) {
        const curr = stroke.points[i]!;
        const prev = stroke.points[i - 1]!;

        if (i < stroke.points.length - 1) {
          const next = stroke.points[i + 1]!;
          const midX = (prev.x + next.x) / 2;
          const midY = (prev.y + next.y) / 2;
          ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
        } else {
          ctx.lineTo(curr.x, curr.y);
        }
      }

      ctx.stroke();
    }

    function drawGrid(): void {
      const step = 20;
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);

      for (let x = step; x < opts.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, opts.height);
        ctx.stroke();
      }

      for (let y = step; y < opts.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(opts.width, y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // Mouse events
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", moveDraw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);

    // Touch events
    if (opts.touchEnabled) {
      canvas.addEventListener("touchstart", startDraw, { passive: false });
      canvas.addEventListener("touchmove", moveDraw, { passive: false });
      canvas.addEventListener("touchend", endDraw);
      canvas.addEventListener("touchcancel", endDraw);
    }

    // Prevent context menu on long press
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Initial render
    redrawAll();

    const instance: SignaturePadInstance = {
      element: container,
      canvas,

      isEmpty() { return strokes.length === 0; },

      clear() {
        strokes = [];
        undoneStrokes = [];
        redrawAll();
      },

      undo() {
        if (strokes.length === 0) return;
        const removed = strokes.pop()!;
        undoneStrokes.push(removed);
        redrawAll();
      },

      redo() {
        if (undoneStrokes.length === 0) return;
        const restored = undoneStrokes.pop()!;
        strokes.push(restored);
        redrawAll();
      },

      toDataURL(type = "image/png", quality = 1): string {
        // Create a clean canvas for export
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = opts.width * (devicePixelRatio || 1);
        exportCanvas.height = opts.height * (devicePixelRatio || 1);
        const expCtx = exportCanvas.getContext("2d")!;
        expCtx.scale(devicePixelRatio || 1, devicePixelRatio || 1);

        // Fill background
        if (opts.backgroundColor !== "transparent") {
          expCtx.fillStyle = opts.backgroundColor;
          expCtx.fillRect(0, 0, opts.width, opts.height);
        } else {
          expCtx.fillStyle = "#fff";
          expCtx.fillRect(0, 0, opts.width, opts.height);
        }

        // Draw strokes on export canvas
        expCtx.lineCap = "round";
        expCtx.lineJoin = "round";
        for (const stroke of strokes) {
          expCtx.beginPath();
          expCtx.strokeStyle = stroke.color;
          expCtx.lineWidth = stroke.width;

          if (stroke.points.length === 1) {
            const p = stroke.points[0]!;
            expCtx.arc(p.x, p.y, opts.dotSize, 0, Math.PI * 2);
            expCtx.fill();
            continue;
          }

          expCtx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
          for (let i = 1; i < stroke.points.length; i++) {
            const curr = stroke.points[i]!;
            const prev = stroke.points[i - 1]!;
            if (i < stroke.points.length - 1) {
              const next = stroke.points[i + 1]!;
              expCtx.quadraticCurveTo(curr.x, curr.y, (prev.x + next.x) / 2, (prev.y + next.y) / 2);
            } else {
              expCtx.lineTo(curr.x, curr.y);
            }
          }
          expCtx.stroke();
        }

        return exportCanvas.toDataURL(type, quality);
      },

      async toBlob(type = "image/png", quality = 1): Promise<Blob> {
        const dataUrl = instance.toDataURL(type, quality);
        const response = await fetch(dataUrl);
        return response.blob();
      },

      toSVG(): string {
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}">`;

        if (opts.backgroundColor !== "transparent") {
          svg += `<rect width="100%" height="100%" fill="${opts.backgroundColor}"/>`;
        } else {
          svg += `<rect width="100%" height="100%" fill="#fff"/>`;
        }

        for (const stroke of strokes) {
          if (stroke.points.length < 2) continue;

          let d = `M ${stroke.points[0]!.x.toFixed(1)} ${stroke.points[0]!.y.toFixed(1)}`;
          for (let i = 1; i < stroke.points.length; i++) {
            const curr = stroke.points[i]!;
            d += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
          }

          svg += `<path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }

        svg += "</svg>";
        return svg;
      },

      getStrokes() { return [...strokes]; },

      fromStrokes(newStrokes: Stroke[]) {
        strokes = newStrokes.map((s) => ({ ...s, points: [...s.points] }));
        undoneStrokes = [];
        redrawAll();
      },

      fromDataURL(dataUrl: string) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, opts.width, opts.height);
          if (opts.backgroundColor !== "transparent") {
            ctx.fillStyle = opts.backgroundColor;
            ctx.fillRect(0, 0, opts.width, opts.height);
          }
          ctx.drawImage(img, 0, 0, opts.width, opts.height);
        };
        img.src = dataUrl;
      },

      setPenColor(color: string) {
        opts.penColor = color;
      },

      setPenWidth(width: number) {
        opts.penWidth = width;
      },

      destroy() {
        destroyed = true;
        canvas.removeEventListener("mousedown", startDraw);
        canvas.removeEventListener("mousemove", moveDraw);
        canvas.removeEventListener("mouseup", endDraw);
        canvas.removeEventListener("mouseleave", endDraw);
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a signature pad */
export function createSignaturePad(options: SignaturePadOptions): SignaturePadInstance {
  return new SignaturePadManager().create(options);
}
