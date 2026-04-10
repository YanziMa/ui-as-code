/**
 * Watermark: Canvas-based text/image watermark overlay for page protection,
 * with rotation, opacity, tiling, custom fonts, and anti-removal detection.
 */

// --- Types ---

export interface WatermarkOptions {
  /** Target container (default: document.body) */
  container?: HTMLElement | string;
  /** Watermark text */
  content?: string;
  /** Watermark image URL or base64 */
  image?: string;
  /** Font size in px (default: 16) */
  fontSize?: number;
  /** Font family (default: sans-serif) */
  fontFamily?: string;
  /** Text color / fill (default: rgba(0,0,0,0.1)) */
  color?: string;
  /** Rotation angle in degrees (default: -22) */
  rotate?: number;
  /** Gap between watermarks in px (default: [100, 100]) */
  gap?: [number, number];
  /** Offset from edges in px (default: [0, 0]) */
  offset?: [number, number];
  /** Opacity 0-1 (default: 0.12) */
  alpha?: number;
  /** Width of each watermark tile (default: 200) */
  width?: number;
  /** Height of each watermark tile (default: 120) */
  height?: string;
  /** Z-index (default: 9999) */
  zIndex?: number;
  /** Monitor DOM mutations to prevent removal */
  monitor?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface WatermarkInstance {
  element: HTMLCanvasElement;
  container: HTMLElement;
  update: (options: Partial<WatermarkOptions>) => void;
  destroy: () => void;
}

// --- Main ---

export function createWatermark(options: WatermarkOptions = {}): WatermarkInstance {
  const opts = {
    fontSize: options.fontSize ?? 16,
    fontFamily: options.fontFamily ?? "sans-serif",
    color: options.color ?? "rgba(0,0,0,0.10)",
    rotate: options.rotate ?? -22,
    gap: options.gap ?? [100, 100],
    offset: options.offset ?? [0, 0],
    alpha: options.alpha ?? 0.12,
    width: options.width ?? 200,
    height: options.height ?? "100%",
    zIndex: options.zIndex ?? 9999,
    monitor: options.monitor ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = opts.container
    ? (typeof opts.container === "string"
      ? document.querySelector<HTMLElement>(opts.container)!
      : opts.container)
    : document.body;

  // Wrapper div (positioned over container)
  const wrapper = document.createElement("div");
  wrapper.className = `watermark-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    position:absolute;top:0;left:0;right:0;bottom:0;
    pointer-events:none;overflow:hidden;z-index:${opts.zIndex};
    user-select:none;-webkit-user-select:none;
  `;
  wrapper.setAttribute("data-watermark", "true");

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.className = "watermark-canvas";
  canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;";

  wrapper.appendChild(canvas);
  container.style.position = container.style.position || "relative";
  container.appendChild(wrapper);

  // MutationObserver reference
  let mutationObserver: MutationObserver | null = null;
  let destroyed = false;

  function draw(): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Tile dimensions
    const tileW = opts.width;
    const tileH = typeof opts.height === "number" ? opts.height : 120;

    const cols = Math.ceil(rect.width / (tileW + opts.gap[0])) + 1;
    const rows = Math.ceil(rect.height / (tileH + opts.gap[1])) + 1;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * (tileW + opts.gap[0]) + opts.offset[0];
        const y = row * (tileH + opts.gap[1]) + opts.offset[1];

        ctx.save();
        ctx.translate(x + tileW / 2, y + tileH / 2);
        ctx.rotate((opts.rotate * Math.PI) / 180);
        ctx.globalAlpha = opts.alpha;

        if (opts.image) {
          drawImageWatermark(ctx, tileW, tileH);
        } else if (opts.content) {
          drawTextWatermark(ctx, tileW, tileH);
        }

        ctx.restore();
      }
    }
  }

  function drawTextWatermark(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    ctx.fillStyle = opts.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = opts.content!.split("\n");
    const lineHeight = opts.fontSize * 1.5;
    const totalHeight = lines.length * lineHeight;
    const startY = -totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, 0, startY + i * lineHeight, w - 20);
    }
  }

  function drawImageWatermark(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(w / img.width, h / img.height) * 0.7;
      const iw = img.width * scale;
      const ih = img.height * scale;
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    };
    img.src = opts.image!;
  }

  function startMonitoring(): void {
    if (!opts.monitor || mutationObserver) return;

    mutationObserver = new MutationObserver(() => {
      if (destroyed) return;
      // Check if our wrapper was removed
      if (!document.contains(wrapper)) {
        container.appendChild(wrapper);
        draw();
      }
      // Check if canvas was removed
      if (!wrapper.contains(canvas)) {
        wrapper.prepend(canvas);
        draw();
      }
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: false,
      attributes: false,
    });
  }

  // Initial draw
  draw();
  startMonitoring();

  // Redraw on resize
  let resizeRaf: number | null = null;
  window.addEventListener("resize", () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(draw);
  });

  const instance: WatermarkInstance = {
    element: canvas,
    container: wrapper,

    update(newOpts: Partial<WatermarkOptions>) {
      Object.assign(opts, newOpts);
      draw();
    },

    destroy() {
      destroyed = true;
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      wrapper.remove();
    },
  };

  return instance;
}
