/**
 * Canvas Drawing: Whiteboard/drawing surface with pen, shapes, text, eraser,
 * undo/redo, layers, zoom/pan, export (PNG/SVG), color picker, brush sizes,
 * and touch support.
 */

// --- Types ---

export type ToolType = "pen" | "brush" | "eraser" | "line" | "rectangle" | "circle" | "arrow" | "text" | "fill" | "select";
export type StrokeCap = "round" | "square" | "butt";
export type StrokeJoin = "round" | "bevel" | "miter";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  points: Point[];
  color: string;
  lineWidth: number;
  opacity: number;
  /** For shapes: start and end points */
  start?: Point;
  end?: Point;
  /** Text content */
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface DrawingLayer {
  id: string;
  name: string;
  strokes: Stroke[];
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface DrawingOptions {
  /** Container element */
  container: HTMLElement | string;
  /** Canvas width (px) */
  width?: number;
  /** Canvas height (px) */
  height?: number;
  /** Background color or image URL */
  background?: string;
  /** Initial color */
  color?: string;
  /** Initial line width */
  lineWidth?: number;
  /** Initial tool */
  tool?: ToolType;
  /** Show toolbar? */
  showToolbar?: boolean;
  /** Show color palette? */
  showColorPalette?: boolean;
  /** Enable undo stack depth (default: 50) */
  maxUndo?: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Touch support (default: true) */
  touchSupport?: boolean;
  /** Zoom enabled? */
  zoomEnabled?: boolean;
  /** Grid overlay? */
  showGrid?: boolean;
  /** Grid size in px (default: 20) */
  gridSize?: number;
  /** Callback on stroke added */
  onStrokeAdd?: (stroke: Stroke) => void;
  /** Callback on change */
  onChange?: (strokes: Stroke[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DrawingInstance {
  element: HTMLCanvasElement;
  /** Get all strokes across all layers */
  getStrokes: () => Stroke[];
  /** Get current layer's strokes */
  getCurrentStrokes: () => Stroke[];
  /** Clear canvas */
  clear: () => void;
  /** Undo last action */
  undo: () => void;
  /** Redo undone action */
  redo: () => void;
  /** Set active tool */
  setTool: (tool: ToolType) => void;
  /** Get active tool */
  getTool: () => ToolType;
  /** Set color */
  setColor: (color: string) => void;
  /** Get current color */
  getColor: () => string;
  /** Set line width */
  setLineWidth: (width: number) => void;
  /** Export as data URL (PNG) */
  exportPNG: () => string;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Zoom in/out */
  setZoom: (scale: number) => void;
  /** Get current zoom level */
  getZoom: () => number;
  /** Add a new layer */
  addLayer: (name?: string) => string;
  /** Switch to layer by ID */
  switchLayer: (layerId: string) => void;
  /** Delete a layer */
  deleteLayer: (layerId: string) => void;
  /** Focus the canvas */
  focus: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createDrawing(options: DrawingOptions): DrawingInstance {
  const opts = {
    width: options.width ?? 800,
    height: options.height ?? 600,
    background: options.background ?? "#ffffff",
    color: options.color ?? "#1a1a1a",
    lineWidth: options.lineWidth ?? 3,
    tool: options.tool ?? "pen",
    maxUndo: options.maxUndo ?? 50,
    readOnly: options.readOnly ?? false,
    touchSupport: options.touchSupport ?? true,
    zoomEnabled: options.zoomEnabled ?? false,
    showGrid: options.showGrid ?? false,
    gridSize: options.gridSize ?? 20,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Drawing: container not found");

  // State
  let currentTool = opts.tool;
  let currentColor = opts.color;
  let currentLineWidth = opts.lineWidth;
  let isDrawing = false;
  let currentStroke: Stroke | null = null;
  let currentPath: Point[] = [];
  let startPoint: Point | null = null;

  // Undo/redo
  const undoStack: Stroke[][] = [];
  const redoStack: Stroke[][] = [];

  // Layers
  const layers: DrawingLayer[] = [{ id: "layer-0", name: "Layer 0", strokes: [], visible: true, locked: false, opacity: 1 }];
  let activeLayerIndex = 0;

  // Zoom/Pan
  let zoomLevel = 1;
  let panOffset = { x: 0, y: 0 };
  let destroyed = false;

  // Canvas setup
  const canvas = document.createElement("canvas");
  canvas.className = `drawing-canvas ${opts.className ?? ""}`;
  canvas.width = opts.width;
  canvas.height = opts.height;
  canvas.style.cssText = `
    display:block;touch-action:none;cursor:crosshair;
    border:1px solid #e5e7eb;border-radius:8px;background:${opts.background};
  `;
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;

  // --- Drawing Functions ---

  function getActiveLayer(): DrawingLayer { return layers[activeLayerIndex]!; }

  function saveState(): void {
    const snapshot = getActiveLayer().strokes.map((s) => ({ ...s, points: [...s.points] }));
    undoStack.push(snapshot);
    if (undoStack.length > opts.maxUndo) undoStack.shift();
    redoStack.length = 0;
  }

  function redraw(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (opts.showGrid) drawGrid();

    // Draw all visible layers
    for (const layer of layers) {
      if (!layer.visible || layer.strokes.length === 0) continue;
      ctx.globalAlpha = layer.opacity;
      for (const stroke of layer.strokes) renderStroke(stroke);
    }
    ctx.globalAlpha = 1;

    // Current stroke being drawn
    if (currentStroke && currentPath.length > 0) {
      renderStroke({ ...currentStroke, points: currentPath });
    }
  }

  function drawGrid(): void {
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 0.5;
    const size = opts.gridSize;
    for (let x = 0; x <= canvas.width; x += size) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += size) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }

  function renderStroke(stroke: Stroke): void {
    if (stroke.points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = stroke.opacity ?? 1;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (stroke.tool) {
      case "pen": case "brush":
        if (stroke.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
        for (let i = 1; i < stroke.points.length; i++) {
          const p0 = stroke.points[i - 1]!;
          const p1 = stroke.points[i]!;
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }
        ctx.stroke();
        break;

      case "line":
        if (!stroke.start || !stroke.end) break;
        ctx.beginPath();
        ctx.moveTo(stroke.start.x, stroke.start.y);
        ctx.lineTo(stroke.end.x, stroke.end.y);
        ctx.stroke();
        break;

      case "rectangle":
        if (!stroke.start || !stroke.end) break;
        const rw = stroke.end.x - stroke.start.x;
        const rh = stroke.end.y - stroke.start.y;
        ctx.strokeRect(stroke.start.x, stroke.start.y, rw, rh);
        break;

      case "circle":
        if (!stroke.start || !stroke.end) break;
        const rx = Math.abs(stroke.end.x - stroke.start.x) / 2;
        const ry = Math.abs(stroke.end.y - stroke.start.y) / 2;
        const cx = (stroke.start.x + stroke.end.x) / 2;
        const cy = (stroke.start.y + stroke.end.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case "arrow":
        if (!stroke.start || !stroke.end) break;
        drawArrow(ctx, stroke.start, stroke.end);
        break;

      case "text":
        if (stroke.text) {
          ctx.font = `${stroke.fontSize ?? 16}px ${stroke.fontFamily ?? "-apple-system,sans-serif"}`;
          ctx.fillText(stroke.text, stroke.points[0]?.x ?? 0, stroke.points[0]?.y ?? 16);
        }
        break;

      case "eraser":
        if (stroke.points.length < 2) break;
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = stroke.lineWidth * 3;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
        for (let i = 1; i < stroke.points.length; i++)
          ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        break;
    }

    ctx.restore();
  }

  function drawArrow(c: CanvasRenderingContext2D, from: Point, to: Point): void {
    const headLen = 12;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
    c.moveTo(to.x, to.y);
    c.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
    c.stroke();
  }

  function getPointerPos(e: PointerEvent | MouseEvent | Touch): Point {
    const rect = canvas.getBoundingClientRect();
    const clientX = "clientX" in e ? e.clientX : (e as Touch).clientX;
    const clientY = "clientY" in e ? e.clientY : (e as Touch).clientY;
    return {
      x: (clientX - rect.left) / zoomLevel - panOffset.x,
      y: (clientY - rect.top) / zoomLevel - panOffset.y,
    };
  }

  // --- Event Handlers ---

  function onPointerDown(e: PointerEvent): void {
    if (opts.readOnly || destroyed) return;
    if (getActiveLayer().locked) return;
    if (e.button !== 0) return;

    isDrawing = true;
    const pos = getPointerPos(e);
    currentPath = [pos];
    startPoint = pos;

    currentStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tool: currentTool,
      points: [],
      color: currentTool === "eraser" ? "#ffffff" : currentColor,
      lineWidth: currentTool === "eraser" ? currentLineWidth * 2 : currentLineWidth,
      opacity: 1,
      start: pos,
      end: pos,
    };

    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDrawing || !currentStroke || destroyed) return;
    const pos = getPointerPos(e);
    currentPath.push(pos);

    if (currentStroke.tool === "pen" || currentStroke.tool === "brush" || currentStroke.tool === "eraser") {
      currentStroke.points = [...currentPath];
    } else {
      currentStroke.end = pos;
    }

    redraw();
  }

  function onPointerUp(_e: PointerEvent): void {
    if (!isDrawing || !currentStroke || destroyed) return;
    isDrawing = false;

    // Finalize stroke
    if (currentPath.length > 0 || currentStroke.start) {
      currentStroke.points = [...currentPath];
      if (currentStroke.end && currentPath.length > 0)
        currentStroke.end = currentPath[currentPath.length - 1];

      saveState();
      getActiveLayer().strokes.push(currentStroke);
      opts.onStrokeAdd?.(currentStroke);
      opts.onChange?.(getActiveLayer().strokes);
    }

    currentStroke = null;
    currentPath = [];
    startPoint = null;
    redraw();
  }

  // --- Toolbar (optional) ---

  if (opts.showToolbar) {
    const toolbar = document.createElement("div");
    toolbar.className = "drawing-toolbar";
    toolbar.style.cssText = `
      display:flex;gap:4px;padding:8px;background:#f9fafb;border:1px solid #e5e7eb;
      border-radius:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center;
    `;
    container.insertBefore(toolbar, canvas);

    const tools: Array<{ type: ToolType; icon: string }> = [
      { type: "pen", icon: "\u270E" },
      { type: "brush", icon: "\u{1F3BC}" },
      { type: "eraser", icon: "\u{1F5D1}" },
      { type: "line", icon: "/" },
      { type: "rectangle", icon: "\u25A1" },
      { type: "circle", icon: "\u25CF" },
      { type: "arrow", tag: "\u2192" } as any,
      { type: "text", icon: "T" },
    ];

    for (const t of tools) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = t.icon;
      btn.title = t.type;
      btn.style.cssText = `
        padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;
        cursor:pointer;font-size:14px;transition:all 0.15s;
        ${t.type === currentTool ? "border-color:#4338ca;color:#4338ca;" : ""}
      `;
      btn.addEventListener("click", () => {
        instance.setTool(t.type);
        // Update button styles
        toolbar.querySelectorAll("button").forEach((b) => {
          b.style.borderColor = "#d1d5db"; b.style.color = "";
        });
        btn.style.borderColor = "#4338ca"; btn.style.color = "#4338ca";
      });
      toolbar.appendChild(btn);
    }

    // Undo/Redo buttons
    const undoBtn = document.createElement("button");
    undoBtn.type = "button"; undoBtn.textContent = "\u21A6"; undoBtn.title = "Undo";
    undoBtn.style.cssText = "padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;";
    undoBtn.addEventListener("click", () => instance.undo());
    toolbar.appendChild(undoBtn);

    const redoBtn = document.createElement("button");
    redoBtn.type = "button"; redoBtn.textContent = "\u21A9"; redoBtn.title = "Redo";
    redoBtn.style.cssText = "padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;";
    redoBtn.addEventListener("click", () => instance.redo());
    toolbar.appendChild(redoBtn);

    // Clear button
    const clearBtn = document.createElement("button");
    clearBtn.type = "button"; clearBtn.textContent = "\u2715"; clearBtn.title = "Clear";
    clearBtn.style.cssText = "padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;color:#ef4444;";
    clearBtn.addEventListener("click", () => instance.clear());
    toolbar.appendChild(clearBtn);
  }

  // Bind events
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", () => { if (isDrawing) { isDrawing = false; currentStroke = null; currentPath = []; redraw(); }});

  // Keyboard shortcuts
  canvas.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      e.shiftKey ? instance.redo() : instance.undo();
    }
  });
  canvas.setAttribute("tabindex", "0");

  // Initial draw
  redraw();

  // --- Instance ---

  const instance: DrawingInstance = {
    element: canvas,

    getStrokes() { return layers.flatMap((l) => l.strokes); },
    getCurrentStrokes() { return [...getActiveLayer().strokes]; },

    clear() {
      saveState();
      getActiveLayer().strokes = [];
      redraw();
      opts.onChange?.([]);
    },

    undo() {
      const snapshot = undoStack.pop();
      if (snapshot) {
        redoStack.push(getActiveLayer().strokes.map((s) => ({ ...s, points: [...s.points] })));
        getActiveLayer().strokes = snapshot;
        redraw();
        opts.onChange?.(getActiveLayer().strokes);
      }
    },

    redo() {
      const snapshot = redoStack.pop();
      if (snapshot) {
        undoStack.push(getActiveLayer().strokes.map((s) => ({ ...s, points: [...s.points] })));
        getActiveLayer().strokes = snapshot;
        redraw();
        opts.onChange?.(getActiveLayer().strokes);
      }
    },

    setTool(tool: ToolType) { currentTool = tool; },
    getTool() { return currentTool; },

    setColor(color: string) { currentColor = color; },
    getColor() { return currentColor; },

    setLineWidth(width: number) { currentLineWidth = width; },

    exportPNG() { return canvas.toDataURL("image/png"); },

    exportSVG() {
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}">`;
      svg += `<rect width="100%" height="100%" fill="${opts.background}"/>`;
      for (const stroke of getActiveLayer().strokes) {
        if (stroke.tool === "pen" && stroke.points.length >= 2) {
          let d = `M${stroke.points[0]!.x},${stroke.points[0]!.y}`;
          for (let i = 1; i < stroke.points.length; i++)
            d += ` L${stroke.points[i]!.x},${stroke.points[i]!.y}`;
          svg += `<path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.lineWidth}" stroke-linecap="round"/>`;
        }
      }
      svg += "</svg>";
      return svg;
    },

    setZoom(scale: number) {
      zoomLevel = Math.max(0.25, Math.min(4, scale));
      canvas.style.transform = `scale(${zoomLevel})`;
      canvas.style.transformOrigin = "top left";
    },

    getZoom() { return zoomLevel; },

    addLayer(name?: string) {
      const id = `layer-${layers.length}`;
      layers.push({ id, name: name ?? `Layer ${layers.length}`, strokes: [], visible: true, locked: false, opacity: 1 });
      return id;
    },

    switchLayer(layerId: string) {
      const idx = layers.findIndex((l) => l.id === layerId);
      if (idx >= 0) { activeLayerIndex = idx; redraw(); }
    },

    deleteLayer(layerId: string) {
      if (layers.length <= 1) return;
      const idx = layers.findIndex((l) => l.id === layerId);
      if (idx >= 0) { layers.splice(idx, 1); if (activeLayerIndex >= layers.length) activeLayerIndex = layers.length - 1; redraw(); }
    },

    focus() { canvas.focus(); },

    destroy() {
      destroyed = true;
      canvas.remove();
      const toolbar = container.querySelector(".drawing-toolbar");
      toolbar?.remove();
    },
  };

  return instance;
}
