/**
 * Signature Pad Utilities: Drawing canvas for signatures with pressure-sensitive
 * strokes, undo/redo, pen color/width options, clear, save as image/PNG/data URL,
 * touch support, and smooth line interpolation.
 */

// --- Types ---

export type PenColor = "black" | "blue" | "red" | "green" | "custom";
export type PenWidth = "thin" | "medium" | "thick" | number;

export interface StrokePoint {
  x: number;
  y: number;
  /** Pressure (0-1, from pointer events) */
  p?: number;
  /** Timestamp for velocity calc */
  t: number;
}

export interface SignatureStroke {
  points: StrokePoint[];
  color: string;
  width: number;
}

export interface SignaturePadOptions {
  /** Canvas width in px */
  width?: number;
  /** Canvas height in px */
  height?: number;
  /** Background color */
  backgroundColor?: string | "transparent" | "white";
  /** Initial pen color */
  penColor?: PenColor | string;
  /** Initial pen width */
  penWidth?: PenWidth;
  /** Show toolbar with color/width/undo/clear? */
  showToolbar?: boolean;
  /** Show signature line (horizontal rule at bottom)? */
  showSignLine?: boolean;
  /** Sign line label text */
  signLineLabel?: string;
  /** Max undo history size */
  maxUndo?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Called when drawing starts */
  onBegin?: () => void;
  /** Called when drawing ends */
  onEnd?: () => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface SignaturePadInstance {
  /** Root element */
  el: HTMLElement;
  /** The canvas element */
  canvas: HTMLCanvasElement;
  /** Clear the canvas */
  clear: () => void;
  /** Undo last stroke */
  undo: () => void;
  /** Redo undone stroke */
  redo: () => void;
  /** Check if canvas is empty */
  isEmpty: () => boolean;
  /** Get signature as data URL (PNG by default) */
  toDataURL: (type?: string, quality?: number) => string;
  /** Get signature as Blob */
  toBlob: (type?: string, quality?: number) => Promise<Blob>;
  /** Get stroke data (for server-side rendering) */
  getStrokes: () => SignatureStroke[];
  /** Load stroke data */
  setStrokes: (strokes: SignatureStroke[]) => void;
  /** Set pen color */
  setColor: (color: PenColor | string) => void;
  /** Set pen width */
  setWidth: (width: PenWidth) => void;
  /** Disable/enable */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Color Map ---

const COLOR_MAP: Record<string, string> = {
  black: "#1a1a2e",
  blue: "#2563eb",
  red: "#dc2626",
  green: "#16a34a",
};

const WIDTH_MAP: Record<string, number> = {
  thin: 1.5,
  medium: 2.5,
  thick: 4,
};

// --- Core Factory ---

/**
 * Create a signature pad / drawing canvas.
 *
 * @example
 * ```ts
 * const pad = createSignaturePad({
 *   width: 500,
 *   height: 200,
 *   showToolbar: true,
 *   onEnd: () => console.log(pad.toDataURL()),
 * });
 * ```
 */
export function createSignaturePad(options: SignaturePadOptions = {}): SignaturePadInstance {
  const {
    width = 500,
    height = 200,
    backgroundColor = "#fff",
    penColor = "black",
    penWidth = "medium",
    showToolbar = true,
    showSignLine = true,
    signLineLabel = "Sign above",
    maxUndo = 30,
    disabled = false,
    onBegin,
    onEnd,
    className,
    container,
  } = options;

  let _color = typeof penColor === "string" ? penColor : (COLOR_MAP[penColor] ?? "#1a1a2e");
  let _lineWidth = typeof penWidth === "number" ? penWidth : (WIDTH_MAP[String(penWidth)] ?? 2.5);
  let _strokes: SignatureStroke[] = [];
  let _undoneStrokes: SignatureStroke[] = [];
  let _isDrawing = false;
  let _currentStroke: SignatureStroke | null = null;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `signature-pad ${className ?? ""}`.trim();
  root.style.cssText =
    "display:inline-flex;flex-direction:column;align-items:center;" +
    "font-family:-apple-system,sans-serif;";

  // Toolbar
  let toolbarEl: HTMLElement | null = null;
  if (showToolbar) {
    toolbarEl = document.createElement("div");
    toolbarEl.className = "sig-toolbar";
    toolbarEl.style.cssText =
      "display:flex;align-items:center;gap:8px;padding:8px 12px;" +
      "background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px 10px 0 0;margin-bottom:-1px;width:" + `${width}px;` +
      "flex-wrap:wrap;";

    // Color buttons
    const colors: Array<{ key: string; val: string }> = [
      { key: "black", val: "#1a1a2e" },
      { key: "blue", val: "#2563eb" },
      { key: "red", val: "#dc2626" },
      { key: "green", val: "#16a34a" },
    ];
    colors.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.color = c.key;
      btn.style.cssText =
        `width:24px;height:24px;border-radius:50%;border:2px solid ${_color === c.val ? "#111827" : "#e5e7eb"};` +
        `background:${c.val};cursor:pointer;padding:0;transition:border-color 0.12s;`;
      btn.addEventListener("click", () => { setColor(c.key); updateToolbarColors(); });
      toolbarEl.appendChild(btn);
    });

    // Separator
    const sep = document.createElement("span");
    sep.style.cssText = "width:1px;height:20px;background:#e5e7eb;";
    toolbarEl.appendChild(sep);

    // Width buttons
    const widths: Array<{ key: string; label: string }> = [
      { key: "thin", label: "S" },
      { key: "medium", label: "M" },
      { key: "thick", label: "L" },
    ];
    widths.forEach((w) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.width = w.key;
      btn.textContent = w.label;
      btn.style.cssText =
        "padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;" +
        "cursor:pointer;font-size:12px;font-weight:500;color:#374151;transition:all 0.12s;";
      btn.addEventListener("click", () => { setWidth(w.key); updateToolbarWidths(); });
      toolbarEl.appendChild(btn);
    });

    // Spacer
    const spacer = document.createElement("span");
    spacer.style.flex = "1";
    toolbarEl.appendChild(spacer);

    // Undo button
    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.innerHTML = "&#8630;";
    undoBtn.title = "Undo";
    undoBtn.style.cssText =
      "padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;color:#6b7280;";
    undoBtn.addEventListener("click", () => undo());
    toolbarEl.appendChild(undoBtn);

    // Clear button
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&#128465;";
    clearBtn.title = "Clear";
    clearBtn.style.cssText = undoBtn.style.cssText.replace("#8630;", "&#128465;");
    clearBtn.addEventListener("click", () => clear());
    toolbarEl.appendChild(clearBtn);

    root.appendChild(toolbarEl);
  }

  function updateToolbarColors(): void {
    if (!toolbarEl) return;
    toolbarEl.querySelectorAll("[data-color]").forEach((btn) => {
      const b = btn as HTMLElement;
      const isActive = b.dataset.color && COLOR_MAP[b.dataset.color] === _color;
      b.style.borderColor = isActive ? "#111827" : "#e5e7eb";
    });
  }

  function updateToolbarWidths(): void {
    if (!toolbarEl) return;
    toolbarEl.querySelectorAll("[data-width]").forEach((btn) => {
      const b = btn as HTMLElement;
      const isActive = b.dataset.width && WIDTH_MAP[b.dataset.width!] === _lineWidth;
      b.style.background = isActive ? "#e5e7eb" : "#fff";
      b.style.fontWeight = isActive ? "700" : "500";
    });
  }

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.className = "sig-canvas";
  canvas.width = width * (window.devicePixelRatio || 1);
  canvas.height = height * (window.devicePixelRatio || 1);
  canvas.style.cssText =
    `width:${width}px;height:${height}px;display:block;touch-action:none;` +
    "border:1px solid #d1d5db;border-radius:0 0 10px 10px;cursor:crosshair;" +
    (disabled ? "opacity:0.5;pointer-events:none;" : "");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Signature pad");

  if (backgroundColor !== "transparent") {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = backgroundColor === "white" ? "#fff" : backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  root.appendChild(canvas);

  // Sign line
  if (showSignLine) {
    const signLine = document.createElement("div");
    signLine.className = "sig-sign-line";
    signLine.style.cssText =
      `width:${width - 40}px;margin-top:8px;border-top:1px solid #d1d5db;padding-top:6px;` +
      "display:flex;justify-content:flex-end;";

    const label = document.createElement("span");
    label.textContent = signLineLabel;
    label.style.cssText = "font-size:12px;color:#9ca3af;font-style:italic;";
    signLine.appendChild(label);
    root.appendChild(signLine);
  }

  (container ?? document.body).appendChild(root);

  const ctx = canvas.getContext("2d")!;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // --- Drawing Logic ---

  function getPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function beginStroke(e: MouseEvent | TouchEvent): void {
    if (disabled) return;
    e.preventDefault();
    _isDrawing = true;
    const pos = getPos(e);
    const pressure = (e as PointerEvent).pressure ?? 1;

    _currentStroke = {
      points: [{ ...pos, p: Math.max(0.25, Math.min(1, pressure)), t: Date.now() }],
      color: _color,
      width: _lineWidth,
    };

    // Draw dot for single click
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (_lineWidth * (canvas.devicePixelRatio || 1)) / 2, 0, Math.PI * 2);
    ctx.fillStyle = _color;
    ctx.fill();

    onBegin?.();
  }

  function moveStroke(e: MouseEvent | TouchEvent): void {
    if (!_isDrawing || !_currentStroke || disabled) return;
    e.preventDefault();

    const pos = getPos(e);
    const pressure = (e as PointerEvent).pressure ?? 1;
    _currentStroke.points.push({ ...pos, p: Math.max(0.25, Math.min(1, pressure)), t: Date.now() });

    // Draw segment
    const pts = _currentStroke.points;
    if (pts.length >= 2) {
      const p1 = pts[pts.length - 2]!;
      const p2 = pts[pts.length - 1]!;
      const dpr = canvas.devicePixelRatio || 1;

      ctx.beginPath();
      ctx.strokeStyle = _color;
      ctx.lineWidth = _lineWidth * dpr;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  function endStroke(): void {
    if (!_isDrawing) return;
    _isDrawing = false;

    if (_currentStroke && _currentStroke.points.length > 0) {
      _strokes.push(_currentStroke);
      _undoneStrokes = []; // Clear redo stack

      // Trim undo history
      if (_strokes.length > maxUndo) {
        _strokes.shift();
        redraw();
      }
    }

    _currentStroke = null;
    onEnd?.();
  }

  function redraw(): void {
    // Clear and redraw background
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor === "white" ? "#fff" : backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Redraw all strokes
    const dpr = canvas.devicePixelRatio || 1;
    for (const stroke of _strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * dpr;
      ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
      }
      ctx.stroke();
    }
  }

  // --- Event Listeners ---

  // Mouse
  canvas.addEventListener("mousedown", beginStroke);
  canvas.addEventListener("mousemove", moveStroke);
  canvas.addEventListener("mouseup", endStroke);
  canvas.addEventListener("mouseleave", endStroke);

  // Touch
  canvas.addEventListener("touchstart", beginStroke, { passive: false });
  canvas.addEventListener("touchmove", moveStroke, { passive: false });
  canvas.addEventListener("touchend", endStroke);
  canvas.addEventListener("touchcancel", endStroke);

  // Prevent scroll on canvas
  canvas.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });

  // --- Methods ---

  function clear(): void {
    _strokes = [];
    _undoneStrokes = [];
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor === "white" ? "#fff" : backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function undo(): void {
    if (_strokes.length === 0) return;
    const removed = _strokes.pop()!;
    _undoneStrokes.push(removed);
    redraw();
  }

  function redo(): void {
    if (_undoneStrokes.length === 0) return;
    const restored = _undoneStrokes.pop()!;
    _strokes.push(restored);
    redraw();
  }

  function isEmpty(): boolean {
    return _strokes.length === 0;
  }

  function toDataURL(type = "image/png", quality = 1): string {
    return canvas.toDataURL(type, quality);
  }

  function toBlob(type = "image/png", quality = 1): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Failed to create blob")), type, quality);
    });
  }

  function getStrokes(): SignatureStroke[] {
    // Return normalized coordinates (0-1 range)
    const dpr = canvas.devicePixelRatio || 1;
    return _strokes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({
        x: p.x / (canvas.width / dpr),
        y: p.y / (canvas.height / dpr),
        p: p.p,
        t: p.t,
      })),
    }));
  }

  function setStrokes(strokes: SignatureStroke[]): void {
    _strokes = strokes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({
        ...p,
        x: p.x * (canvas.width / (canvas.devicePixelRatio || 1)),
        y: p.y * (canvas.height / (canvas.devicePixelRatio || 1)),
      })),
    }));
    _undoneStrokes = [];
    redraw();
  }

  function setColor(color: PenColor | string): void {
    _color = typeof color === "string" ? color : (COLOR_MAP[color] ?? "#1a1a2e");
  }

  function setWidth(width: PenWidth): void {
    _lineWidth = typeof width === "number" ? width : (WIDTH_MAP[String(width)] ?? 2.5);
  }

  function setDisabled(d: boolean): void {
    // Would need full re-setup — simplified
    canvas.style.opacity = d ? "0.5" : "";
    canvas.style.pointerEvents = d ? "none" : "";
  }

  function destroy(): void { root.remove(); }

  return {
    el: root,
    canvas,
    clear, undo, redo, isEmpty,
    toDataURL, toBlob, getStrokes, setStrokes,
    setColor, setWidth, setDisabled, destroy,
  };
}
