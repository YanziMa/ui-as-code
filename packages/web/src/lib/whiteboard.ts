/**
 * Whiteboard: Canvas-based collaborative drawing surface with tools,
 * layers, shapes, freehand, text, eraser, undo/redo, zoom/pan,
 * grid snapping, color palette, stroke customization, export (PNG/SVG),
 * pointer events, touch support, and serialization.
 */

// --- Types ---

export type ToolType =
  | "pen"
  | "brush"
  | "highlighter"
  | "eraser"
  | "line"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "text"
  | "selector"
  | "pan"
  | "fill";

export type StrokeCap = "round" | "square" | "butt";
export type StrokeJoin = "round" | "bevel" | "miter";

export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardTool {
  type: ToolType;
  color: string;
  width: number;
  opacity: number;
  cap?: StrokeCap;
  join?: StrokeJoin;
  dashPattern?: number[];
  font?: string;
  fontSize?: number;
}

export interface StrokePoint extends Point {
  pressure: number;
}

export interface DrawnShape {
  id: string;
  tool: ToolType;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  filled?: boolean;
  fillColor?: string;
  text?: string;
  font?: string;
  fontSize?: number;
  dashPattern?: number[];
  selected?: boolean;
  transform?: Transform;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  shapes: DrawnShape[];
}

export interface WhiteboardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Canvas width (px) */
  width?: number;
  /** Canvas height (px) */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Show grid? */
  showGrid?: boolean;
  /** Grid size (px) */
  gridSize?: number;
  /** Grid color */
  gridColor?: string;
  /** Snap to grid? */
  snapToGrid?: boolean;
  /** Default tool */
  defaultTool?: ToolType;
  /** Default color */
  defaultColor?: string;
  /** Default stroke width */
  defaultWidth?: number;
  /** Enable touch support */
  touchSupport?: boolean;
  /** Enable pressure sensitivity */
  pressureSensitive?: boolean;
  /** Undo stack depth (0 = unlimited) */
  maxUndo?: number;
  /** Min zoom level */
  minZoom?: number;
  /** Max zoom level */
  maxZoom?: number;
  /** Zoom step */
  zoomStep?: number;
  /** Called on shape added */
  onShapeAdd?: (shape: DrawnShape) => void;
  /** Called on selection change */
  onSelect?: (shapes: DrawnShape[]) => void;
  /** Called on zoom change */
  onZoom?: (zoom: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface WhiteboardInstance {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Current active tool */
  activeTool: WhiteboardTool;
  /** All layers */
  layers: Layer[];
  /** Active layer index */
  activeLayerIndex: number;
  /** Current zoom level */
  zoom: number;
  /** Pan offset */
  panOffset: Point;
  /** Set the active tool */
  setTool(tool: Partial<WhiteboardTool>): void;
  /** Add a new layer */
  addLayer(name?: string): Layer;
  /** Remove a layer */
  removeLayer(index: number): void;
  /** Set active layer */
  setActiveLayer(index: number): void;
  /** Toggle layer visibility */
  toggleLayerVisibility(index: number): void;
  /** Undo last action */
  undo(): void;
  /** Redo undone action */
  redo(): void;
  /** Clear current layer */
  clear(): void;
  /** Clear all layers */
  clearAll(): void;
  /** Zoom in/out */
  setZoom(zoom: number, center?: Point): void;
  /** Pan to offset */
  pan(dx: number, dy: number): void;
  /** Reset view (zoom + pan) */
  resetView(): void;
  /** Export as image data URL */
  toDataURL(format?: string, quality?: number): string;
  /** Export as SVG string */
  toSVG(): string;
  /** Serialize board state */
  serialize(): string;
  /** Deserialize board state */
  deserialize(json: string): void;
  /** Delete selected shapes */
  deleteSelected(): void;
  /** Get selected shapes */
  getSelectedShapes(): DrawnShape[];
  /** Destroy the whiteboard */
  destroy(): void;
}

// --- Shape ID Generator ---

let shapeCounter = 0;
function generateShapeId(): string {
  return `shape-${Date.now()}-${++shapeCounter}`;
}

let layerCounter = 0;
function generateLayerId(): string {
  return `layer-${++layerCounter}`;
}

// --- Main Factory ---

export function createWhiteboard(options: WhiteboardOptions): WhiteboardInstance {
  const opts = {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    showGrid: true,
    gridSize: 20,
    gridColor: "#e5e5e5",
    snapToGrid: false,
    defaultTool: "pen",
    defaultColor: "#000000",
    defaultWidth: 2,
    touchSupport: true,
    pressureSensitive: false,
    maxUndo: 50,
    minZoom: 0.1,
    maxZoom: 5,
    zoomStep: 0.25,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = opts.width!;
  canvas.height = opts.height!;
  canvas.style.cssText = `
    display:block;touch-action:none;cursor:crosshair;
    background:${opts.backgroundColor};
    ${opts.className ? `class="${opts.className}"` : ""}
  `;
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;

  // State
  let activeTool: WhiteboardTool = {
    type: opts.defaultTool!,
    color: opts.defaultColor!,
    width: opts.defaultWidth!,
    opacity: 1,
    cap: "round",
    join: "round",
  };

  const layers: Layer[] = [{
    id: generateLayerId(),
    name: "Layer 1",
    visible: true,
    locked: false,
    opacity: 1,
    shapes: [],
  }];
  let activeLayerIndex = 0;
  let zoom = 1;
  const panOffset: Point = { x: 0, y: 0 };

  // Drawing state
  let isDrawing = false;
  let currentPoints: Point[] = [];
  let currentShape: DrawnShape | null = null;
  let startPos: Point | null = null;

  // History
  const undoStack: DrawnShape[][] = [];
  const redoStack: DrawnShape[][] = [];

  // --- Rendering ---

  function render(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = opts.backgroundColor!;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (opts.showGrid) {
      renderGrid();
    }

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Render layers bottom-to-top
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;

      for (const shape of layer.shapes) {
        drawShape(shape);
      }
    }

    // Render current shape being drawn
    if (currentShape) {
      drawShape(currentShape);
    }

    ctx.restore();
  }

  function renderGrid(): void {
    const sz = opts.gridSize!;
    const scaledSz = sz * zoom;
    const offsetX = (panOffset.x % scaledSz + scaledSz) % scaledSz;
    const offsetY = (panOffset.y % scaledSz + scaledSz) % scaledSz;

    ctx.strokeStyle = opts.gridColor!;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 1;

    ctx.beginPath();
    for (let x = offsetX; x < canvas.width; x += scaledSz) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = offsetY; y < canvas.height; y += scaledSz) {
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  }

  function drawShape(shape: DrawnShape): void {
    ctx.save();
    ctx.globalAlpha *= shape.opacity;
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (shape.dashPattern) {
      ctx.setLineDash(shape.dashPattern);
    }

    if (shape.transform) {
      const t = shape.transform;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scaleX, t.scaleY);
      ctx.rotate((t.rotation * Math.PI) / 180);
    }

    switch (shape.tool) {
      case "pen":
      case "brush":
      case "highlighter":
        drawFreehand(shape.points, shape.color, shape.width, shape.tool === "highlighter" ? 0.3 : 1);
        break;

      case "eraser":
        ctx.globalCompositeOperation = "destination-out";
        drawFreehand(shape.points, "rgba(0,0,0,1)", shape.width * 2, 1);
        ctx.globalCompositeOperation = "source-over";
        break;

      case "line":
        if (shape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0]!.x, shape.points[0]!.y);
          ctx.lineTo(shape.points[shape.points.length - 1]!.x, shape.points[shape.points.length - 1]!.y);
          ctx.stroke();
        }
        break;

      case "arrow":
        if (shape.points.length >= 2) {
          drawArrow(shape.points[0]!, shape.points[shape.points.length - 1]!);
        }
        break;

      case "rectangle":
        if (shape.points.length >= 2) {
          const p0 = shape.points[0]!;
          const p1 = shape.points[shape.points.length - 1]!;
          const x = Math.min(p0.x, p1.x);
          const y = Math.min(p0.y, p1.y);
          const w = Math.abs(p1.x - p0.x);
          const h = Math.abs(p1.y - p0.y);
          if (shape.filled && shape.fillColor) {
            ctx.fillStyle = shape.fillColor;
            ctx.fillRect(x, y, w, h);
          }
          ctx.strokeRect(x, y, w, h);
        }
        break;

      case "ellipse":
        if (shape.points.length >= 2) {
          const p0 = shape.points[0]!;
          const p1 = shape.points[shape.points.length - 1]!;
          const cx = (p0.x + p1.x) / 2;
          const cy = (p0.y + p1.y) / 2;
          const rx = Math.abs(p1.x - p0.x) / 2;
          const ry = Math.abs(p1.y - p0.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          if (shape.filled && shape.fillColor) {
            ctx.fillStyle = shape.fillColor;
            ctx.fill();
          }
          ctx.stroke();
        }
        break;

      case "text":
        if (shape.text) {
          ctx.font = `${shape.fontSize ?? 16}px ${shape.font ?? "sans-serif"}`;
          ctx.fillStyle = shape.color;
          ctx.fillText(shape.text, shape.points[0]?.x ?? 0, shape.points[0]?.y ?? 16);
        }
        break;
    }

    // Selection highlight
    if (shape.selected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      const bounds = getShapeBounds(shape);
      if (bounds) {
        ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
      }
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawFreehand(points: Point[], color: string, width: number, alpha: number): void {
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.stroke();
  }

  function drawArrow(from: Point, to: Point): void {
    const headLen = 12;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLen * Math.cos(angle - Math.PI / 6),
      to.y - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLen * Math.cos(angle + Math.PI / 6),
      to.y - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  }

  function getShapeBounds(shape: DrawnShape): { x: number; y: number; w: number; h: number } | null {
    if (shape.points.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of shape.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  // --- Input Handling ---

  function getCanvasPoint(e: MouseEvent | Touch): Point {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }

  function snapPoint(p: Point): Point {
    if (!opts.snapToGrid) return p;
    const sz = opts.gridSize!;
    return {
      x: Math.round(p.x / sz) * sz,
      y: Math.round(p.y / sz) * sz,
    };
  }

  function handlePointerDown(e: MouseEvent | Touch): void {
    if (layers[activeLayerIndex]?.locked) return;

    const point = snapPoint(getCanvasPoint(e));
    isDrawing = true;
    currentPoints = [point];
    startPos = point;

    if (activeTool.type === "text") {
      // Text mode — prompt for text
      const text = prompt("Enter text:", "");
      if (text) {
        currentShape = {
          id: generateShapeId(),
          tool: "text",
          points: [point],
          color: activeTool.color,
          width: activeTool.width,
          opacity: activeTool.opacity,
          text,
          font: activeTool.font,
          fontSize: activeTool.fontSize,
        };
        finalizeShape();
      }
      isDrawing = false;
      return;
    }
  }

  function handlePointerMove(e: MouseEvent | Touch): void {
    if (!isDrawing) return;

    const point = snapPoint(getCanvasPoint(e));
    currentPoints.push(point);

    // Build preview shape
    currentShape = {
      id: generateShapeId(),
      tool: activeTool.type,
      points: [...currentPoints],
      color: activeTool.type === "eraser" ? "#ffffff" : activeTool.color,
      width: activeTool.type === "eraser" ? activeTool.width * 3 : activeTool.width,
      opacity: activeTool.opacity,
      dashPattern: activeTool.dashPattern,
    };

    render();
  }

  function handlePointerUp(_e: MouseEvent | Touch): void {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentShape && currentPoints.length > 0) {
      finalizeShape();
    }
    currentPoints = [];
    currentShape = null;
    startPos = null;
  }

  function finalizeShape(): void {
    if (!currentShape) return;

    // Save to undo history before adding
    saveUndoState();

    layers[activeLayerIndex].shapes.push(currentShape);
    opts.onShapeAdd?.(currentShape);
    render();
  }

  function saveUndoState(): void {
    const snapshot = layers[activeLayerIndex].shapes.map((s) => ({ ...s }));
    undoStack.push(snapshot);
    if (opts.maxUndo && undoStack.length > opts.maxUndo!) {
      undoStack.shift();
    }
    redoStack.length = 0; // Clear redo on new action
  }

  // Attach event listeners
  canvas.addEventListener("mousedown", (e) => handlePointerDown(e));
  canvas.addEventListener("mousemove", (e) => handlePointerMove(e));
  canvas.addEventListener("mouseup", (e) => handlePointerUp(e));
  canvas.addEventListener("mouseleave", (e) => { if (isDrawing) handlePointerUp(e); });

  if (opts.touchSupport) {
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handlePointerDown(e.touches[0]!);
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      handlePointerMove(e.touches[0]!);
    }, { passive: false });
    canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      handlePointerUp(e.changedTouches[0]!);
    }, { passive: false });
  }

  // Wheel zoom
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -opts.zoomStep! : opts.zoomStep!;
    const newZoom = Math.max(opts.minZoom!, Math.min(opts.maxZoom!, zoom + delta));
    const rect = canvas.getBoundingClientRect();
    const center: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setZoom(newZoom, center);
  }, { passive: false });

  // Initial render
  render();

  // --- Public API ---

  function setTool(tool: Partial<WhiteboardTool>): void {
    Object.assign(activeTool, tool);
  }

  function addLayer(name?: string): Layer {
    const layer: Layer = {
      id: generateLayerId(),
      name: name ?? `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      shapes: [],
    };
    layers.push(layer);
    render();
    return layer;
  }

  function removeLayer(index: number): void {
    if (layers.length <= 1) return; // Keep at least one layer
    layers.splice(index, 1);
    if (activeLayerIndex >= layers.length) activeLayerIndex = layers.length - 1;
    render();
  }

  function setActiveLayer(index: number): void {
    if (index >= 0 && index < layers.length) {
      activeLayerIndex = index;
      render();
    }
  }

  function toggleLayerVisibility(index: number): void {
    if (index >= 0 && index < layers.length) {
      layers[index]!.visible = !layers[index]!.visible;
      render();
    }
  }

  function undo(): void {
    if (undoStack.length === 0) return;
    const currentSnapshot = [...layers[activeLayerIndex].shapes];
    redoStack.push(currentSnapshot);
    layers[activeLayerIndex].shapes = undoStack.pop()!;
    render();
  }

  function redo(): void {
    if (redoStack.length === 0) return;
    const currentSnapshot = [...layers[activeLayerIndex].shapes];
    undoStack.push(currentSnapshot);
    layers[activeLayerIndex].shapes = redoStack.pop()!;
    render();
  }

  function clear(): void {
    saveUndoState();
    layers[activeLayerIndex].shapes = [];
    render();
  }

  function clearAll(): void {
    saveUndoState();
    for (const layer of layers) {
      layer.shapes = [];
    }
    render();
  }

  function setZoom(newZoom: number, center?: Point): void {
    const oldZoom = zoom;
    zoom = Math.max(opts.minZoom!, Math.min(opts.maxZoom!, newZoom));

    if (center) {
      // Zoom toward cursor position
      panOffset.x = center.x - (center.x - panOffset.x) * (zoom / oldZoom);
      panOffset.y = center.y - (center.y - panOffset.y) * (zoom / oldZoom);
    }

    opts.onZoom?.(zoom);
    render();
  }

  function pan(dx: number, dy: number): void {
    panOffset.x += dx;
    panOffset.y += dy;
    render();
  }

  function resetView(): void {
    zoom = 1;
    panOffset.x = 0;
    panOffset.y = 0;
    render();
  }

  function toDataURL(format = "image/png", quality = 0.92): string {
    // Render without UI elements for clean export
    render();
    return canvas.toDataURL(format, quality);
  }

  function toSVG(): string {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`;
    svg += `<rect width="100%" height="100%" fill="${opts.backgroundColor}"/>`;

    for (const layer of layers) {
      if (!layer.visible) continue;
      for (const shape of layer.shapes) {
        svg += shapeToSVG(shape);
      }
    }

    svg += "</svg>";
    return svg;
  }

  function shapeToSVG(shape: DrawnShape): string {
    switch (shape.tool) {
      case "pen":
      case "brush":
        if (shape.points.length < 2) return "";
        const d = shape.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        return `<path d="${d}" fill="none" stroke="${shape.color}" stroke-width="${shape.width}" stroke-linecap="round"/>`;

      case "line":
        if (shape.points.length < 2) return "";
        return `<line x1="${shape.points[0]!.x}" y1="${shape.points[0]!.y}" x2="${shape.points[1]!.x}" y2="${shape.points[1]!.y}" stroke="${shape.color}" stroke-width="${shape.width}"/>`;

      case "rectangle":
        if (shape.points.length < 2) return "";
        const p0 = shape.points[0]!;
        const p1 = shape.points[shape.points.length - 1]!;
        return `<rect x="${Math.min(p0.x, p1.x)}" y="${Math.min(p0.y, p1.y)}" width="${Math.abs(p1.x - p0.x)}" height="${Math.abs(p1.y - p0.y)}" fill="none" stroke="${shape.color}" stroke-width="${shape.width}"/>`;

      case "ellipse":
        if (shape.points.length < 2) return "";
        const ep0 = shape.points[0]!;
        const ep1 = shape.points[shape.points.length - 1]!;
        return `<ellipse cx="${(ep0.x + ep1.x) / 2}" cy="${(ep0.y + ep1.y) / 2}" rx="${Math.abs(ep1.x - ep0.x) / 2}" ry="${Math.abs(ep1.y - ep0.y) / 2}" fill="none" stroke="${shape.color}" stroke-width="${shape.width}"/>`;

      case "text":
        return `<text x="${shape.points[0]?.x ?? 0}" y="${shape.points[0]?.y ?? 0}" font-size="${shape.fontSize ?? 16}" fill="${shape.color}">${shape.text ?? ""}</text>`;

      default:
        return "";
    }
  }

  function serialize(): string {
    return JSON.stringify({
      version: 1,
      width: canvas.width,
      height: canvas.height,
      layers,
      zoom,
      panOffset,
    });
  }

  function deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.layers) layers.splice(0, layers.length, ...data.layers);
      if (data.zoom != null) zoom = data.zoom;
      if (data.panOffset) Object.assign(panOffset, data.panOffset);
      render();
    } catch {}
  }

  function deleteSelected(): void {
    saveUndoState();
    layers[activeLayerIndex].shapes = layers[activeLayerIndex].shapes.filter((s) => !s.selected);
    render();
  }

  function getSelectedShapes(): DrawnShape[] {
    return layers[activeLayerIndex].shapes.filter((s) => s.selected);
  }

  function destroy(): void {
    canvas.removeEventListener("mousedown", handlePointerDown as EventListener);
    canvas.removeEventListener("mousemove", handlePointerMove as EventListener);
    canvas.removeEventListener("mouseup", handlePointerUp as EventListener);
    canvas.remove();
  }

  return {
    canvas,
    ctx,
    activeTool,
    layers,
    activeLayerIndex,
    zoom,
    panOffset,
    setTool,
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    undo,
    redo,
    clear,
    clearAll,
    setZoom,
    pan,
    resetView,
    toDataURL,
    toSVG,
    serialize,
    deserialize,
    deleteSelected,
    getSelectedShapes,
    destroy,
  };
}
