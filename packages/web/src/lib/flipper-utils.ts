/**
 * Flipper Utilities: 3D card/panel flip animation with configurable
 * direction, duration, easing, perspective, and front/back content.
 */

// --- Types ---

export type FlipDirection = "horizontal" | "vertical";
export type FlipEasing = "ease" | "ease-in" | "ease-out" | "ease-in-out" | "cubic-bezier";

export interface FlipSide {
  /** Content for this side (HTML string or element) */
  content: HTMLElement | string;
  /** Background color */
  background?: string;
  /** Custom class name */
  className?: string;
}

export interface FlipperOptions {
  /** Front side configuration */
  front: FlipSide;
  /** Back side configuration */
  back: FlipSide;
  /** Flip direction */
  direction?: FlipDirection;
  /** Animation duration in ms */
  duration?: number;
  /** Easing function */
  easing?: FlipEasing | string;
  /** Perspective distance (px) — larger = less distortion */
  perspective?: number;
  /** Container width */
  width?: number | string;
  /** Container height */
  height?: number | string;
  /** Auto-flip interval (ms, 0 = disabled) */
  autoFlip?: number;
  /** Show flip button/handle? */
  showHandle?: boolean;
  /** Handle position: "top-right", "bottom-right", etc. */
  handlePosition?: string;
  /** Enable click-to-flip? */
  clickToFlip?: boolean;
  /** Called when flipped to front */
  onFlipToFront?: () => void;
  /** Called when flipped to back */
  onFlipToBack?: () => void;
  /** Called on any flip */
  onFlip?: (side: "front" | "back") => void;
  /** Initial side */
  initialSide?: "front" | "back";
  /** Custom class name for root */
  className?: string;
  /** Container element to append to */
  container?: HTMLElement;
}

export interface FlipperInstance {
  /** Root element */
  el: HTMLElement;
  /** Front face element */
  frontEl: HTMLElement;
  /** Back face element */
  backEl: HTMLElement;
  /** Flip to the other side */
  flip: () => void;
  /** Flip to a specific side */
  flipTo: (side: "front" | "back") => void;
  /** Check current side */
  getSide: () => "front" | "back";
  /** Check if currently animating */
  isFlipping: () => boolean;
  /** Start auto-flip */
  startAutoFlip: (intervalMs?: number) => void;
  /** Stop auto-flip */
  stopAutoFlip: () => void;
  /** Set new content for a side */
  setSideContent: (side: "front" | "back", content: HTMLElement | string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a 3D flippable card/panel.
 *
 * @example
 * ```ts
 * const card = createFlipper({
 *   front: { content: "<h2>Front Side</h2><p>Click to flip</p>" },
 *   back: { content: "<h2>Back Side</h2><p>Details here</p>" },
 *   direction: "horizontal",
 *   clickToFlip: true,
 * });
 * ```
 */
export function createFlipper(options: FlipperOptions): FlipperInstance {
  const {
    front,
    back,
    direction = "horizontal",
    duration = 600,
    easing = "ease-in-out",
    perspective = 1000,
    width,
    height,
    autoFlip = 0,
    showHandle = false,
    handlePosition = "bottom-right",
    clickToFlip = false,
    onFlipToFront,
    onFlipToBack,
    onFlip,
    initialSide = "front",
    className,
    container,
  } = options;

  let _currentSide: "front" | "back" = initialSide;
  let _isFlipping = false;
  let _autoFlipTimer: ReturnType<typeof setInterval> | null = null;

  // --- Build DOM ---

  // Root container with 3D context
  const root = document.createElement("div");
  root.className = `flipper ${className ?? ""}`.trim();
  root.style.cssText =
    `perspective:${perspective}px;` +
    `width:${width ?? "100%"};` +
    `height:${height ?? "auto"};` +
    "position:relative;display:inline-block;";

  // Inner container that rotates
  const inner = document.createElement("div");
  inner.className = "flipper-inner";
  inner.style.cssText =
    "position:relative;width:100%;height:100%;" +
    "transform-style:preserve-3d;" +
    "transition-property:transform;" +
    `transition-duration:${duration}ms;` +
    `transition-timing-function:${typeof easing === "string" && !easing.startsWith("cubic") ? easing : easing};`;

  // Set initial rotation
  if (_currentSide === "back") {
    inner.style.transform = direction === "horizontal"
      ? "rotateY(180deg)"
      : "rotateX(180deg)";
  }

  // Front face
  const frontEl = createFace(front, "front");
  inner.appendChild(frontEl);

  // Back face
  const backEl = createFace(back, "back");
  inner.appendChild(backEl);

  root.appendChild(inner);

  // Flip handle
  if (showHandle) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "flip-handle";
    handle.innerHTML = "\u{1F504}"; // 🔄
    handle.title = "Flip";
    handle.style.cssText =
      "position:absolute;z-index:10;border:none;background:rgba(0,0,0,0.5);" +
      "color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;" +
      "font-size:14px;display:flex;align-items:center;justify-content:center;" +
      "transition:background 0.15s;";

    // Position the handle
    const [vPos, hPos] = handlePosition.split("-");
    if (vPos === "top") handle.style.top = "8px"; else handle.style.bottom = "8px";
    if (hPos === "left") handle.style.left = "8px"; else handle.style.right = "8px";

    handle.addEventListener("mouseenter", () => { handle.style.background = "rgba(0,0,0,0.7)"; });
    handle.addEventListener("mouseleave", () => { handle.style.background = "rgba(0,0,0,0.5)"; });
    handle.addEventListener("click", (e) => { e.stopPropagation(); flip(); });

    root.appendChild(handle);
  }

  (container ?? document.body).appendChild(root);

  // --- Face builder ---

  function createFace(sideConfig: FlipSide, sideName: "front" | "back"): HTMLElement {
    const face = document.createElement("div");
    face.className = `flipper-face flipper-${sideName}`;
    face.style.cssText =
      "position:absolute;width:100%;height:100%;" +
      "-webkit-backface-visibility:hidden;backface-visibility:hidden;" +
      (sideName === "back"
        ? (direction === "horizontal" ? "transform:rotateY(180deg);" : "transform:rotateX(180deg);")
        : "") +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "border-radius:inherit;overflow:hidden;" +
      (sideConfig.background ? `background:${sideConfig.background};` : "") +
      "box-sizing:border-box;";

    if (sideConfig.className) face.classList.add(sideConfig.className);

    if (typeof sideConfig.content === "string") {
      face.innerHTML = sideConfig.content;
    } else {
      face.appendChild(sideConfig.content);
    }

    return face;
  }

  // --- Flip logic ---

  function flip(): void {
    if (_isFlipping) return;
    flipTo(_currentSide === "front" ? "back" : "front");
  }

  function flipTo(side: "front" | "back"): void {
    if (_isFlipping || _currentSide === side) return;
    _isFlipping = true;

    const targetRotation = side === "back"
      ? (direction === "horizontal" ? "rotateY(180deg)" : "rotateX(180deg)")
      : "rotateX(0deg) rotateY(0deg)";

    inner.style.transform = targetRotation;

    setTimeout(() => {
      _currentSide = side;
      _isFlipping = false;

      if (side === "front") onFlipToFront?.();
      else onFlipToBack?.();
      onFlip?.(side);
    }, duration);
  }

  function getSide(): "front" | "back" { return _currentSide; }
  function isFlipping(): boolean { return _isFlipping; }

  // --- Auto-flip ---

  function startAutoFlip(intervalMs?: number): void {
    stopAutoFlip();
    const interval = intervalMs ?? autoFlip;
    if (interval <= 0) return;
    _autoFlipTimer = setInterval(flip, interval);
  }

  function stopAutoFlip(): void {
    if (_autoFlipTimer) {
      clearInterval(_autoFlipTimer);
      _autoFlipTimer = null;
    }
  }

  // --- Dynamic content ---

  function setSideContent(side: "front" | "back", content: HTMLElement | string): void {
    const el = side === "front" ? frontEl : backEl;
    el.innerHTML = "";
    if (typeof content === "string") {
      el.innerHTML = content;
    } else {
      el.appendChild(content);
    }
  }

  // --- Events ---

  if (clickToFlip) {
    root.addEventListener("click", (e) => {
      // Don't flip if clicking the handle (it has its own handler)
      if ((e.target as HTMLElement).closest(".flip-handle")) return;
      flip();
    });

    // Add cursor hint
    root.style.cursor = "pointer";
  }

  // Start auto-flip if configured
  if (autoFlip > 0) {
    startAutoFlip(autoFlip);
  }

  // Keyboard support
  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      flip();
    }
  });

  function destroy(): void {
    stopAutoFlip();
    root.remove();
  }

  return {
    el: root,
    frontEl,
    backEl,
    flip, flipTo,
    getSide, isFlipping,
    startAutoFlip, stopAutoFlip,
    setSideContent,
    destroy,
  };
}
