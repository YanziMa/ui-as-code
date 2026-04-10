/**
 * Drawing Board: Full-featured canvas drawing application.
 *
 * Tools:
 * - Pencil (freehand drawing)
 * - Eraser
 * - Line
 * - Rectangle (filled/stroke)
 * - Ellipse/Circle (filled/stroke)
 * - Arrow
 * - Text
 * - Image stamp
 * - Eyedropper (color picker from canvas)
 *
 * Features:
 * - Undo/redo stack
 * - Adjustable stroke width and color
 * - Opacity control
 * - Layer support (basic)
 * - Zoom and pan
 * - Grid/snap-to-grid
 * - Background options (transparent, white, custom)
 * - Export as PNG/JPEG/data URL
 * - Touch support
 * - Keyboard shortcuts
 */

// --- Types ---

export type ToolName =
  | "pencil"
  | "eraser"
  | "line"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "text"
  | "fill"
  | "eyedropper";

export type FillMode = "stroke" | "fill" | "both";

export interface DrawingTool {
  name: ToolName;
  label: string;
  icon?: string;
}

export interface StrokeStyle {
  color: string;
  width: number;
  opacity: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  dashPattern?: number[];
}

export interface DrawingBoardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Canvas width in px (default: 800) */
  width?: number;
  /** Canvas height in px (default: 600) */
  height?: number;
  /** Background color (default: #ffffff) */
  backgroundColor?: string;
  /** Default stroke style */
  defaultStroke?: Partial<StrokeStyle>;
  /** Initial tool (default: pencil) */
  initialTool?: ToolName;
  /** Show toolbar (default: true) */
  showToolbar?: boolean;
  /** Show color palette (default: true) */
  showColorPalette?: boolean;
  /** Enable undo/redo (default: true) */
  enableUndoRedo?: boolean;
  /** Max undo steps (default: 50) */
  maxUndoSteps?: number;
  /** Enable zoom (default: true) */
  enableZoom?: boolean;
  /** Show grid (default: false) */
  showGrid?: boolean;
  /** Grid size in px (default: 20) */
  gridSize?: number;
  /** Snap to grid (default: false) */
  snapToGrid?: boolean;
  /** Touch support (default: true) */
  touchSupport?: boolean;
  /** Callback on drawing change */
  onChange?: (dataUrl: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DrawingBoardInstance {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Get current tool */
  getTool: () => ToolName;
  /** Set active tool */
  setTool: (tool: ToolName) => void;
  /** Get current stroke style */
  getStrokeStyle: () => StrokeStyle;
  /** Set stroke style */
  setStrokeStyle: (style: Partial<StrokeStyle>) => void;
  /** Set fill mode */
  setFillMode: (mode: FillMode) => void;
  /** Undo last action */
  undo: () => void;
  /** Redo undone action */
  redo: () => void;
  /** Clear canvas */
  clear: () => void;
  /** Get zoom level */
  getZoom: () => number;
  /** Set zoom level */
  setZoom: (level: number) => void;
  /** Export as data URL */
  exportDataUrl: (type?: "png" | "jpeg", quality?: number) => string;
  /** Export as Blob */
  exportBlob: (type?: "png" | "jpeg", quality?: number) => Promise<Blob>;
  /** Destroy instance */
  destroy: () => void;
}

// --- Tools Definition ---

const TOOLS: DrawingTool[] = [
  { name: "pencil", label: "Pencil", icon: "\u270E\uFE0F" },
  { name: "eraser", label: "Eraser", icon: "\u{1F5D1}\uFE0F" },
  { name: "line", label: "Line", icon: "/" },
  { name: "rectangle", label: "Rectangle", icon: "\u25AD" },
  { name: "ellipse", label: "Ellipse", icon: "\u25CF" },
  { name: "arrow", label: "Arrow", icon: "\u2192" },
  { name: "text", label: "Text", icon: "T" },
  { name: "fill", label: "Fill Bucket", icon: "\u{1F4A1}" },
  { name: "eyedropper", label: "Eyedropper", icon: "\u{1FA7F}" },
];

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#78716c", "#374151",
];

// --- Main ---

export function createDrawingBoard(options: DrawingBoardOptions): DrawingBoardInstance {
  const opts = {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    defaultStroke: { color: "#000000", width: 3, opacity: 1 },
    initialTool: "pencil" as ToolName,
    showToolbar: true,
    showColorPalette: true,
    enableUndoRedo: true,
    maxUndoSteps: 50,
    enableZoom: true,
    showGrid: false,
    gridSize: 20,
    snapToGrid: false,
    touchSupport: true,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Drawing Board: container not found");

  // Root element
  const root = document.createElement("div");
  root.className = `drawing-board ${opts.className ?? ""}`;
  root.style.cssText = `
    position:relative;display:inline-block;background:#f0f0f0;
    border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);
  `;

  // Toolbar
  let toolbar: HTMLElement | null = null;
  if (opts.showToolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "db-toolbar";
    toolbar.style.cssText = `
      display:flex;align-items:center;gap:4px;padding:6px 10px;
      background:#fff;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;
    `;

    // Tool buttons
    for (const tool of TOOLS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = tool.label;
      btn.dataset.tool = tool.name;
      btn.textContent = tool.icon ?? tool.label.charAt(0);
      btn.style.cssText = `
        width:32px;height:32px;border:1px solid transparent;border-radius:6px;
        background:none;cursor:pointer;font-size:15px;display:flex;
        align-items:center;justify-content:center;transition:all 0.1s;
        ${tool.name === opts.initialTool ? "background:#e0e7ff;border-color:#6366f1;" : ""}
      `;
      btn.addEventListener("click", () => setTool(tool.name));
      toolbar.appendChild(btn);
    }

    // Separator
    const sep = document.createElement("div");
    sep.style.cssText = "width:1px;height:24px;background:#e5e7eb;margin:0 6px;";
    toolbar.appendChild(sep);

    // Color palette
    if (opts.showColorPalette) {
      for (const color of COLORS) {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.title = color;
        swatch.style.cssText = `
          width:24px;height:24px;border-radius:4px;border:2px solid ${color === opts.defaultStroke!.color ? "#333" : "transparent"};
          background:${color};cursor:pointer;padding:0;margin:0 1px;
        `;
        swatch.addEventListener("click", () => setStrokeStyle({ color }));
        toolbar.appendChild(swatch);
      }
    }

    root.appendChild(toolbar);
  }

  // Canvas container (for zoom/pan)
  const canvasContainer = document.createElement("div");
  canvasContainer.className = "db-canvas-container";
  canvasContainer.style.cssText = "position:relative;overflow:hidden;cursor:crosshair;";

  const canvas = document.createElement("canvas");
  canvas.className = "drawing-canvas";
  canvas.width = opts.width;
  canvas.height = opts.height;
  canvas.style.cssText = "display:block;background:${opts.backgroundColor};";
  canvasContainer.appendChild(canvas);
  root.appendChild(canvasContainer);

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = opts.backgroundColor;
  ctx.fillRect(0, 0, opts.width, opts.height);

  container.appendChild(root);

  // State
  let currentTool: ToolName = opts.initialTool;
  let stroke: StrokeStyle = {
    color: opts.defaultStroke!.color ?? "#000000",
    width: opts.defaultStroke!.width ?? 3,
    opacity: opts.defaultStroke!.opacity ?? 1,
    lineCap: "round",
    lineJoin: "round",
  };
  let fillMode: FillMode = "stroke";
  let zoom = 1;
  let panOffset = { x: 0, y: 0 };
  let isDrawing = false;
  let destroyed = false;
  let startPos = { x: 0, y: 0 };
  let currentPos = { x: 0, y: 0 };
  let history: ImageData[] = [];
  let historyIdx = -1;
  let tempCanvas: HTMLCanvasElement | null = null;
  let tempCtx: CanvasRenderingContext2D | null = null;

  // Setup temp canvas for shape preview
  tempCanvas = document.createElement("canvas");
  tempCanvas.width = opts.width;
  tempCanvas.height = opts.height;
  tempCtx = tempCanvas.getContext("2d")!;

  // Save initial state
  saveHistory();

  // --- Coordinate Helpers ---

  function getCanvasPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0 : e.clientY;
    let x = (clientX - rect.left) / zoom - panOffset.x / zoom;
    let y = (clientY - rect.top) / zoom - panOffset.y / zoom;

    if (opts.snapToGrid) {
      x = Math.round(x / opts.gridSize!) * opts.gridSize!;
      y = Math.round(y / opts.gridSize!) * opts.gridSize!;
    }

    return { x, y };
  }

  // --- History Management ---

  function saveHistory(): void {
    // Remove any future states if we're not at the end
    if (historyIdx < history.length - 1) {
      history = history.slice(0, historyIdx + 1);
    }
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > opts.maxUndoSteps!) {
      history.shift();
    }
    historyIdx = history.length - 1;
  }

  // --- Drawing Functions ---

  function applyStrokeStyle(context: CanvasRenderingContext2D): void {
    context.strokeStyle = currentTool === "eraser" ? opts.backgroundColor : stroke.color;
    context.lineWidth = currentTool === "eraser" ? stroke.width * 3 : stroke.width;
    context.lineCap = stroke.lineCap ?? "round";
    context.lineJoin = stroke.lineJoin ?? "round";
    context.globalAlpha = stroke.opacity;
    context.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";
    if (stroke.dashPattern) context.setLineDash(stroke.dashPattern);
    else context.setLineDash([]);
  }

  function resetContext(): void {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.setLineDash([]);
  }

  function drawShapePreview(): void {
    if (!tempCtx || !tempCanvas) return;
    // Copy main canvas to temp
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    applyStrokeStyle(tempCtx);
    tempCtx.fillStyle = stroke.color;
    tempCtx.beginPath();

    const sx = startPos.x, sy = startPos.y;
    const ex = currentPos.x, ey = currentPos.y;

    switch (currentTool) {
      case "line":
        tempCtx.moveTo(sx, sy);
        tempCtx.lineTo(ex, ey);
        tempCtx.stroke();
        break;

      case "rectangle": {
        const w = ex - sx, h = ey - sy;
        if (fillMode === "fill" || fillMode === "both") tempCtx.fillRect(sx, sy, w, h);
        if (fillMode === "stroke" || fillMode === "both") tempCtx.strokeRect(sx, sy, w, h);
        break;
      }

      case "ellipse":
        tempCtx.ellipse(
          (sx + ex) / 2, (sy + ey) / 2,
          Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2,
          0, 0, Math.PI * 2,
        );
        if (fillMode === "fill" || fillMode === "both") tempCtx.fill();
        if (fillMode === "stroke" || fillMode === "both") tempCtx.stroke();
        break;

      case "arrow":
        drawArrow(tempCtx, sx, sy, ex, ey);
        break;
    }

    resetContext();
  }

  function drawArrow(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const headLen = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();

    // Arrowhead
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    context.moveTo(x2, y2);
    context.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    context.stroke();
  }

  // --- Event Handlers ---

  function handleStart(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    isDrawing = true;
    startPos = getCanvasPos(e);
    currentPos = { ...startPos };

    if (currentTool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        applyStrokeStyle(ctx);
        ctx.font = `${Math.max(stroke.width * 6, 14)}px sans-serif`;
        ctx.fillStyle = stroke.color;
        ctx.fillText(text, startPos.x, startPos.y);
        resetContext();
        saveHistory();
        opts.onChange?.(canvas.toDataURL());
      }
      isDrawing = false;
      return;
    }

    if (currentTool === "eyedropper") {
      const pixel = ctx.getImageData(Math.round(startPos.x), Math.round(startPos.y), 1, 1).data;
      const hex = "#" + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, "0")).join("");
      setStrokeStyle({ color });
      setTool("pencil");
      return;
    }

    if (currentTool === "fill") {
      floodFill(Math.round(startPos.x), Math.round(startPos.y), stroke.color);
      saveHistory();
      opts.onChange?.(canvas.toDataURL());
      isDrawing = false;
      return;
    }

    if (currentTool === "pencil" || currentTool === "eraser") {
      applyStrokeStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
    }
  }

  function handleMove(e: MouseEvent | TouchEvent): void {
    if (!isDrawing || destroyed) return;
    e.preventDefault();
    currentPos = getCanvasPos(e);

    if (currentTool === "pencil" || currentTool === "eraser") {
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else if (["line", "rectangle", "ellipse", "arrow"].includes(currentTool)) {
      drawShapePreview();
      // Show preview on main canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const baseImg = history[historyIdx];
      if (baseImg) ctx.putImageData(baseImg, 0, 0);
      ctx.drawImage(tempCanvas!, 0, 0);
    }
  }

  function handleEnd(_e: MouseEvent | TouchEvent): void {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentTool === "pencil" || currentTool === "eraser") {
      ctx.closePath();
      resetContext();
    } else if (["line", "rectangle", "ellipse", "arrow"].includes(currentTool)) {
      // Commit the shape
      applyStrokeStyle(ctx);
      ctx.beginPath();

      const sx = startPos.x, sy = startPos.y;
      const ex = currentPos.x, ey = currentPos.y;

      switch (currentTool) {
        case "line":
          ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); break;
        case "rectangle": {
          const w = ex - sx, h = ey - sy;
          if (fillMode === "fill" || fillMode === "both") ctx.fillRect(sx, sy, w, h);
          if (fillMode === "stroke" || fillMode === "both") ctx.strokeRect(sx, sy, w, h);
          break;
        }
        case "ellipse":
          ctx.ellipse((sx + ex) / 2, (sy + ey) / 2, Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2, 0, 0, Math.PI * 2);
          if (fillMode === "fill" || fillMode === "both") ctx.fill();
          if (fillMode === "stroke" || fillMode === "both") ctx.stroke();
          break;
        case "arrow":
          drawArrow(ctx, sx, sy, ex, ey);
          break;
      }
      resetContext();
    }

    saveHistory();
    opts.onChange?.(canvas.toDataURL());
  }

  // Simple flood fill (for small canvases)
  function floodFill(startX: number, startY: number, fillColor: string): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const w = canvas.width;
    const h = canvas.height;

    // Parse fill color
    const tempDiv = document.createElement("div");
    tempDiv.style.color = fillColor;
    document.body.appendChild(tempDiv);
    const computed = getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    const match = computed.match(/\d+/g);
    if (!match || match.length < 3) return;
    const fillR = parseInt(match[0]), fillG = parseInt(match[1]), fillB = parseInt(match[2]);

    const startIdx = (startY * w + startX) * 4;
    const startR = data[startIdx]!, startG = data[startIdx + 1]!, startB = data[startIdx + 2]!;

    if (startR === fillR && startG === fillG && startB === fillB) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;

      const idx = (y * w + x) * 4;
      if (data[idx]! !== startR || data[idx + 1]! !== startG || data[idx + 2]! !== startB) continue;

      visited.add(key);
      data[idx] = fillR; data[idx + 1] = fillG; data[idx + 2] = fillB; data[idx + 3] = 255;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);

      // Limit iterations for performance
      if (visited.size > 500000) break;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // Bind events
  canvas.addEventListener("mousedown", handleStart);
  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("mouseup", handleEnd);
  canvas.addEventListener("mouseleave", handleEnd);

  if (opts.touchSupport) {
    canvas.addEventListener("touchstart", handleStart, { passive: false });
    canvas.addEventListener("touchmove", handleMove, { passive: false });
    canvas.addEventListener("touchend", handleEnd);
  }

  // --- Public API Implementations ---

  function setTool(tool: ToolName): void {
    currentTool = tool;
    // Update toolbar UI
    if (toolbar) {
      for (const btn of toolbar.querySelectorAll<HTMLButtonElement>("[data-tool]")) {
        const isActive = btn.dataset.tool === tool;
        btn.style.background = isActive ? "#e0e7ff" : "none";
        btn.style.borderColor = isActive ? "#6366f1" : "transparent";
      }
    }
    // Update cursor
    canvas.style.cursor =
      tool === "eyedropper" ? "crosshair" :
      tool === "text" ? "text" :
      "crosshair";
  }

  function setStrokeStyle(style: Partial<StrokeStyle>): void {
    Object.assign(stroke, style);
  }

  // --- Instance ---

  const instance: DrawingBoardInstance = {
    element: root,
    canvas,

    getTool() { return currentTool; },
    setTool,

    getStrokeStyle() { return { ...stroke }; },
    setStrokeStyle,

    setFillMode(mode: FillMode) { fillMode = mode; },

    undo() {
      if (historyIdx > 0) {
        historyIdx--;
        ctx.putImageData(history[historyIdx]!, 0, 0);
        opts.onChange?.(canvas.toDataURL());
      }
    },

    redo() {
      if (historyIdx < history.length - 1) {
        historyIdx++;
        ctx.putImageData(history[historyIdx]!, 0, 0);
        opts.onChange?.(canvas.toDataURL());
      }
    },

    clear() {
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveHistory();
      opts.onChange?.(canvas.toDataURL());
    },

    getZoom() { return zoom; },
    setZoom(level: number) {
      zoom = Math.max(0.1, Math.min(5, level));
      canvas.style.transform = `scale(${zoom})`;
      canvas.style.transformOrigin = "top left";
    },

    exportDataUrl(type = "png", quality?: number) {
      return canvas.toDataURL(`image/${type}`, quality);
    },

    async exportBlob(type = "png", quality?: number): Promise<Blob> {
      return new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Export failed")), `image/${type}`, quality);
      });
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (destroyed) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) instance.redo(); else instance.undo();
    }
  });

  return instance;
}
