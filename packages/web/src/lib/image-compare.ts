/**
 * Image Compare: Before/after image comparison slider component.
 * Drag-to-reveal, click-to-toggle, keyboard accessible, touch-friendly,
 * with customizable handle, labels, and animation options.
 *
 * Features:
 * - Horizontal or vertical slider direction
 * - Smooth drag with momentum
 * - Click to toggle (50/50 split)
 * - Keyboard navigation (arrow keys)
 * - Customizable handle design (line, circle, arrows)
 * - Labels for before/after states
 * - Responsive sizing
 * - Multiple interaction modes: drag, hover, click, auto-play
 */

// --- Types ---

export type CompareDirection = "horizontal" | "vertical";
export type HandleStyle = "line" | "circle" | "arrows" | "custom";
export type InteractionMode = "drag" | "hover" | "click" | "auto";

export interface ImageCompareOptions {
  /** Before image URL, element, or canvas */
  beforeSrc: string | HTMLImageElement | HTMLCanvasElement;
  /** After image URL, element, or canvas */
  afterSrc: string | HTMLImageElement | HTMLCanvasElement;
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Slider direction (default: horizontal) */
  direction?: CompareDirection;
  /** Initial position 0-1 (default: 0.5) */
  initialPosition?: number;
  /** Handle style (default: line) */
  handleStyle?: HandleStyle;
  /** Show labels (default: true) */
  showLabels?: boolean;
  /** Before label text (default: "Before") */
  beforeLabel?: string;
  /** After label text (default: "After") */
  afterLabel?: string;
  /** Label position (default: "top") */
  labelPosition?: "top" | "bottom";
  /** Interaction mode (default: drag) */
  mode?: InteractionMode;
  /** Auto-play speed in seconds (for auto mode, default: 3) */
  autoPlaySpeed?: number;
  /** Drag smoothing factor 0-1 (default: 0.1) */
  dragSmoothing?: number;
  /** Handle color (default: #ffffff) */
  handleColor?: string;
  /** Handle size in px (default: 40) */
  handleSize?: number;
  /** Line width for line handle (default: 2) */
  lineWidth?: number;
  /** Show divider shadow (default: true) */
  showShadow?: boolean;
  /** Shadow blur px (default: 10) */
  shadowBlur?: number;
  /** Draggable area padding in px (default: 20) */
  draggablePadding?: number;
  /** Animation duration ms (default: 300) */
  animationDuration?: number;
  /** Enable keyboard controls (default: true) */
  keyboard?: boolean;
  /** Accessible label (default: "Image comparison slider") */
  ariaLabel?: string;
  /** Callback on position change */
  onMove?: (position: number) => void;
  /** Callback on drag start */
  onDragStart?: () => void;
  /** Callback on drag end */
  onDragEnd?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ImageCompareInstance {
  element: HTMLElement;
  /** Current position 0-1 */
  getPosition: () => void;
  /** Set position 0-1 with optional animation */
  setPosition: (pos: number, animate?: boolean) => void;
  /** Get current mode */
  getMode: () => InteractionMode;
  /** Set interaction mode */
  setMode: (mode: InteractionMode) => void;
  /** Reset to initial position */
  reset: (animate?: boolean) => void;
  /** Start auto-play */
  play: () => void;
  /** Stop auto-play */
  stop: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

function loadImage(src: string | HTMLImageElement | HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLImageElement && src.complete) {
      resolve(src);
      return;
    }
    if (src instanceof HTMLCanvasElement) {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src.toDataURL();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src as string;
  });
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// --- Main ---

export function createImageCompare(options: ImageCompareOptions): ImageCompareInstance {
  const opts = {
    direction: "horizontal" as CompareDirection,
    initialPosition: 0.5,
    handleStyle: "line" as HandleStyle,
    showLabels: true,
    beforeLabel: "Before",
    afterLabel: "After",
    labelPosition: "top" as const,
    mode: "drag" as InteractionMode,
    autoPlaySpeed: 3,
    dragSmoothing: 0.1,
    handleColor: "#ffffff",
    handleSize: 40,
    lineWidth: 2,
    showShadow: true,
    shadowBlur: 10,
    draggablePadding: 20,
    animationDuration: 300,
    keyboard: true,
    ariaLabel: "Image comparison slider",
    ...options,
  };

  // Resolve container
  const container = typeof opts.container === "string"
    ? document.querySelector<HTMLElement>(opts.container)!
    : opts.container ?? document.body;

  // Root element
  const root = document.createElement("div");
  root.className = `image-compare ${opts.className ?? ""}`;
  root.setAttribute("role", "slider");
  root.setAttribute("aria-label", opts.ariaLabel);
  root.setAttribute("aria-valuemin", "0");
  root.setAttribute("aria-valuemax", "100");
  root.setAttribute("aria-valuenow", String(Math.round(opts.initialPosition * 100)));
  root.setAttribute("tabindex", "0");
  root.style.cssText = `
    position:relative;overflow:hidden;cursor:${opts.mode === "drag" ? "ew-resize" : "default"};
    user-select:none;-webkit-user-select:none;touch-action:none;
    width:100%;height:auto;aspect-ratio:auto;
  `;

  container.appendChild(root);

  // State
  let position = opts.initialPosition;
  let targetPosition = opts.initialPosition;
  let isDragging = false;
  let destroyed = false;
  let autoPlayTimer: ReturnType<typeof setInterval> | null = null;
  let autoPlayDir = 1;
  let animFrameId: number | null = null;
  let beforeImg: HTMLImageElement;
  let afterImg: HTMLImageElement;
  let containerWidth = 0;
  let containerHeight = 0;

  // Create image layers
  const afterWrapper = document.createElement("div");
  afterWrapper.className = "compare-after";
  afterWrapper.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;";

  const beforeWrapper = document.createElement("div");
  beforeWrapper.className = "compare-before";
  beforeWrapper.style.cssText = "position:absolute;top:0;left:0;height:100%;overflow:hidden;";

  const afterEl = document.createElement("img");
  afterEl.className = "compare-after-img";
  afterEl.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;";
  afterEl.draggable = false;
  afterEl.alt = "After";

  const beforeEl = document.createElement("img");
  beforeEl.className = "compare-before-img";
  beforeEl.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;position:absolute;top:0;left:0;";
  beforeEl.draggable = false;
  beforeEl.alt = "Before";

  afterWrapper.appendChild(afterEl);
  beforeWrapper.appendChild(beforeEl);
  root.appendChild(afterWrapper);
  root.appendChild(beforeWrapper);

  // Handle / divider
  const handleContainer = document.createElement("div");
  handleContainer.className = "compare-handle-container";
  handleContainer.style.cssText = `
    position:absolute;top:0;${opts.direction === "horizontal" ? "" : "left:0;"}
    height:100%;width:100%;pointer-events:none;z-index:10;
  `;

  const handleLine = document.createElement("div");
  handleLine.className = "compare-handle-line";
  handleLine.style.cssText = `
    position:absolute;background:${opts.handleColor};
    ${opts.direction === "horizontal"
      ? `left:50%;top:0;width:${opts.lineWidth}px;height:100%;transform:translateX(-50%);`
      : `left:0;top:50%;width:100%;height:${opts.lineWidth}px;transform:translateY(-50%);`}
    pointer-events:none;
  `;

  if (opts.showShadow) {
    handleLine.style.boxShadow = `0 0 ${opts.shadowBlur}px rgba(0,0,0,0.5)`;
  }

  const handleKnob = document.createElement("div");
  handleKnob.className = "compare-handle-knob";
  handleKnob.style.cssText = `
    position:absolute;${opts.direction === "horizontal"
      ? `left:50%;top:50%;transform:translate(-50%,-50%);`
      : `left:50%;top:50%;transform:translate(-50%,-50%);`}
    background:${opts.handleColor};border-radius:50%;
    width:${opts.handleSize}px;height:${opts.handleSize}px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.25);
    cursor:${opts.mode === "drag" ? "grab" : "default"};pointer-events:auto;
  `;

  // Handle style content
  switch (opts.handleStyle) {
    case "arrows":
      handleKnob.innerHTML = `<span style="font-size:14px;color:#333;display:flex;gap:8px;">
        <span>&#8249;</span><span>&#8250;</span>
      </span>`;
      break;
    case "circle":
      handleKnob.style.borderRadius = "50%";
      break;
    default:
      // Line only - no knob center needed but keep for grab area
      handleKnob.innerHTML = `<div style="display:flex;gap:6px;">
        <svg width="8" height="12" viewBox="0 0 8 12" fill="#666"><path d="M7 1L2 6l5 5" stroke="#666" stroke-width="2" fill="none"/></svg>
        <svg width="8" height="12" viewBox="0 0 8 12" fill="#666"><path d="M1 11L6 6 1 1" stroke="#666" stroke-width="2" fill="none"/></svg>
      </div>`;
  }

  handleContainer.appendChild(handleLine);
  handleContainer.appendChild(handleKnob);
  root.appendChild(handleContainer);

  // Labels
  let beforeLabelEl: HTMLElement | null = null;
  let afterLabelEl: HTMLElement | null = null;

  if (opts.showLabels) {
    const labelContainer = document.createElement("div");
    labelContainer.className = "compare-labels";
    labelContainer.style.cssText = "position:absolute;left:0;right:0;display:flex;justify-content:space-between;padding:8px 16px;pointer-events:none;z-index:11;";
    if (opts.labelPosition === "bottom") {
      labelContainer.style.top = "auto";
      labelContainer.style.bottom = "0";
    }

    beforeLabelEl = document.createElement("span");
    beforeLabelEl.className = "compare-label-before";
    beforeLabelEl.textContent = opts.beforeLabel;
    beforeLabelEl.style.cssText = `
      background:rgba(0,0,0,0.55);color:#fff;padding:4px 10px;border-radius:4px;
      font-size:12px;font-weight:600;font-family:-apple-system,sans-serif;
    `;

    afterLabelEl = document.createElement("span");
    afterLabelEl.className = "compare-label-after";
    afterLabelEl.textContent = opts.afterLabel;
    afterLabelEl.style.cssText = beforeLabelEl.style.cssText;

    labelContainer.appendChild(beforeLabelEl);
    labelContainer.appendChild(afterLabelEl);
    root.appendChild(labelContainer);
  }

  // --- Core Functions ---

  function updateLayout(): void {
    containerWidth = root.clientWidth;
    containerHeight = root.clientHeight;
    updatePosition(position, false);
  }

  function updatePosition(pos: number, animate = false): void {
    pos = clamp(pos, 0, 1);
    targetPosition = pos;

    if (animate && opts.animationDuration > 0) {
      animateTo(pos);
    } else {
      applyPosition(pos);
    }
  }

  function applyPosition(pos: number): void {
    position = pos;

    if (opts.direction === "horizontal") {
      beforeWrapper.style.width = `${pos * 100}%`;
      handleContainer.style.left = `${pos * 100}%`;
      handleContainer.style.width = `${(1 - pos) * 100 + opts.handleSize}px`;
    } else {
      beforeWrapper.style.height = `${pos * 100}%`;
      handleContainer.style.top = `${pos * 100}%`;
      handleContainer.style.height = `${(1 - pos) * 100 + opts.handleSize}px`;
    }

    root.setAttribute("aria-valuenow", String(Math.round(pos * 100)));
    opts.onMove?.(pos);
  }

  function animateTo(target: number): void {
    const start = position;
    const startTime = performance.now();

    function step(now: number): void {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / opts.animationDuration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      applyPosition(start + (target - start) * eased);

      if (progress < 1) {
        animFrameId = requestAnimationFrame(step);
      }
    }

    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(step);
  }

  // --- Event Handlers ---

  function getEventPos(e: MouseEvent | TouchEvent): number {
    const rect = root.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0 : e.clientY;

    if (opts.direction === "horizontal") {
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    }
    return clamp((clientY - rect.top) / rect.height, 0, 1);
  }

  function onPointerDown(e: Event): void {
    if (opts.mode !== "drag" || destroyed) return;
    e.preventDefault();
    isDragging = true;
    handleKnob.style.cursor = "grabbing";
    updatePosition(getEventPos(e as MouseEvent | TouchEvent), false);
    opts.onDragStart?.();
  }

  function onPointerMove(e: MouseEvent | TouchEvent): void {
    if (!isDragging || destroyed) return;
    e.preventDefault();
    const rawPos = getEventPos(e);
    // Apply smoothing
    position = position + (rawPos - position) * (1 - opts.dragSmoothing);
    applyPosition(position);
  }

  function onPointerUp(): void {
    if (!isDragging) return;
    isDragging = false;
    handleKnob.style.cursor = "grab";
    opts.onDragEnd?.();
  }

  function onClick(e: MouseEvent): void {
    if (opts.mode !== "click" || isDragging || destroyed) return;
    updatePosition(getEventPos(e), true);
  }

  function onMouseMove(e: MouseEvent): void {
    if (opts.mode !== "hover" || destroyed) return;
    updatePosition(getEventPos(e), false);
  }

  function onMouseLeave(): void {
    if (opts.mode !== "hover" || destroyed) return;
    updatePosition(opts.initialPosition, true);
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (!opts.keyboard || destroyed) return;
    const step = e.shiftKey ? 0.1 : 0.02;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        updatePosition(clamp(position - step, 0, 1), false);
        break;
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        updatePosition(clamp(position + step, 0, 1), false);
        break;
      case "Home":
        e.preventDefault();
        updatePosition(0, true);
        break;
      case "End":
        e.preventDefault();
        updatePosition(1, true);
        break;
    }
  }

  // Auto-play
  function tickAutoPlay(): void {
    position += (autoPlayDir * 0.005) / opts.autoPlaySpeed;
    if (position >= 1) {
      position = 1;
      autoPlayDir = -1;
    } else if (position <= 0) {
      position = 0;
      autoPlayDir = 1;
    }
    applyPosition(position);
  }

  function play(): void {
    stop();
    autoPlayTimer = setInterval(tickAutoPlay, 16);
  }

  function stop(): void {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  // Bind events
  if (opts.mode === "drag") {
    handleKnob.addEventListener("mousedown", onPointerDown);
    handleKnob.addEventListener("touchstart", onPointerDown, { passive: false });
    root.addEventListener("mousedown", onPointerDown);
    root.addEventListener("touchstart", onPointerDown, { passive: false });
  }

  document.addEventListener("mousemove", onPointerMove);
  document.addEventListener("touchmove", onPointerMove, { passive: false });
  document.addEventListener("mouseup", onPointerUp);
  document.addEventListener("touchend", onPointerUp);

  if (opts.mode === "click") {
    root.addEventListener("click", onClick);
  }

  if (opts.mode === "hover") {
    root.addEventListener("mousemove", onMouseMove);
    root.addEventListener("mouseleave", onMouseLeave);
  }

  if (opts.keyboard) {
    root.addEventListener("keydown", onKeyDown);
  }

  // Resize observer
  const resizeObserver = new ResizeObserver(() => updateLayout());
  resizeObserver.observe(root);

  // Initialize
  Promise.all([loadImage(opts.beforeSrc), loadImage(opts.afterSrc)]).then(([before, after]) => {
    beforeImg = before;
    afterImg = after;
    beforeEl.src = before.src;
    afterEl.src = after.src;
    updateLayout();
    updatePosition(opts.initialPosition, false);

    if (opts.mode === "auto") {
      play();
    }
  });

  // Instance
  const instance: ImageCompareInstance = {
    element: root,

    getPosition() { return position; },

    setPosition(pos: number, animate = false) {
      updatePosition(pos, animate);
    },

    getMode() { return opts.mode; },
    setMode(mode: InteractionMode) {
      opts.mode = mode;
      root.style.cursor = mode === "drag" ? "ew-resize" : mode === "hover" ? "default" : "default";
      if (mode === "auto") play(); else stop();
    },

    reset(animate = false) {
      updatePosition(opts.initialPosition, animate);
    },

    play,
    stop,

    destroy() {
      destroyed = true;
      stop();
      if (animFrameId) cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("touchmove", onPointerMove);
      document.removeEventListener("mouseup", onPointerUp);
      document.removeEventListener("touchend", onPointerUp);
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("click", onClick);
      root.removeEventListener("mousemove", onMouseMove);
      root.removeEventListener("mouseleave", onMouseLeave);
      root.remove();
    },
  };

  return instance;
}
