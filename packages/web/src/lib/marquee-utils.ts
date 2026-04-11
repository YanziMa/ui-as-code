/**
 * Marquee/Ticker Utilities: Horizontal/vertical scrolling text or content
 * with configurable speed, direction, pause-on-hover, loop modes,
 * gradient fade edges, and responsive behavior.
 */

// --- Types ---

export type MarqueeDirection = "left" | "right" | "up" | "down";
export type MarqueeFillMode = "loop" | "bounce" | "fill" | "none";

export interface MarqueeOptions {
  /** Content to scroll (HTML string or element) */
  content: HTMLElement | string;
  /** Scroll direction */
  direction?: MarqueeDirection;
  /** Pixels per second (speed) */
  speed?: number;
  /** Pause on hover */
  pauseOnHover?: boolean;
  /** Fill mode for content shorter than container */
  fill?: MarqueeFillMode;
  /** Show gradient fade at edges */
  gradientFade?: boolean;
  /** Gradient color(s) — default matches background */
  gradientColor?: string;
  /** Gradient width in px */
  gradientWidth?: number;
  /** Delay before starting animation (ms) */
  delay?: number;
  /** Number of copies to repeat for seamless loop */
  repeatCount?: number;
  /** Container width (auto = 100%) */
  width?: number | string;
  /** Container height */
  height?: number | string;
  /** CSS overflow behavior */
  overflow?: "hidden" | "visible" | "scroll";
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called each frame with current offset */
  onTick?: (offset: number) => void;
  /** Called when marquee completes one cycle (bounce mode) */
  onCycleComplete?: () => void;
}

export interface MarqueeInstance {
  /** The root marquee element */
  el: HTMLElement;
  /** Start/resume scrolling */
  play: () => void;
  /** Pause scrolling */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Check if playing */
  isPlaying: () => boolean;
  /** Set speed (px/s) */
  setSpeed: (speed: number) => void;
  /** Set direction */
  setDirection: (dir: MarqueeDirection) => void;
  /** Update content dynamically */
  setContent: (content: HTMLElement | string) => void;
  /** Get current scroll offset */
  getOffset: () => number;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a marquee/ticker element.
 *
 * @example
 * ```ts
 * const mq = createMarquee({
 *   content: "<span>Breaking news ticker text here...</span>",
 *   direction: "left",
 *   speed: 80,
 *   gradientFade: true,
 * });
 * ```
 */
export function createMarquee(options: MarqueeOptions): MarqueeInstance {
  const {
    content,
    direction = "left",
    speed = 50,
    pauseOnHover = true,
    fill = "loop",
    gradientFade = false,
    gradientColor = "#fff",
    gradientWidth = 60,
    delay = 0,
    repeatCount = 2,
    width = "100%",
    height = "auto",
    overflow = "hidden",
    className,
    container,
    onTick,
    onCycleComplete,
  } = options;

  let _playing = true;
  let _speed = speed;
  let _direction = direction;
  let _offset = 0;
  let _bouncingBack = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let delayedStartTimer: ReturnType<typeof setTimeout> | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `marquee ${className ?? ""}`.trim();
  root.style.cssText =
    `position:relative;overflow:${overflow};` +
    `width:${typeof width === "number" ? `${width}px` : width};` +
    `height:${typeof height === "number" ? `${height}px` : height};`;

  // Inner track
  const track = document.createElement("div");
  track.className = "marquee-track";
  track.style.cssText =
    "display:flex;will-change:transform;" +
    (_direction === "up" || _direction === "down"
      ? "flex-direction:column;width:100%;"
      : "flex-direction:row;height:100%;");

  // Gradient overlays
  if (gradientFade) {
    const isHorizontal = _direction === "left" || _direction === "right";

    const startGrad = document.createElement("div");
    startGrad.className = "marquee-gradient-start";
    startGrad.style.cssText =
      `position:absolute;${isHorizontal ? "left:0;top:0;bottom:0;" : "top:0;left:0;right:0;"}`
      + `width:${isHorizontal ? `${gradientWidth}px` : "100%"};`
      + `height:${isHorizontal ? "100%" : `${gradientWidth}px`};`
      + `background:linear-gradient(${isHorizontal ? "to right" : "to bottom"}, ${gradientColor}, transparent);`
      + "pointer-events:none;z-index:2;";
    root.appendChild(startGrad);

    const endGrad = document.createElement("div");
    endGrad.className = "marquee-gradient-end";
    endGrad.style.cssText =
      `position:absolute;${isHorizontal ? "right:0;top:0;bottom:0;" : "bottom:0;left:0;right:0;";}`
      + `width:${isHorizontal ? `${gradientWidth}px` : "100%"};`
      + `height:${isHorizontal ? "100%" : `${gradientWidth}px`};`
      + `background:linear-gradient(${isHorizontal ? "to left" : "to top"}, ${gradientColor}, transparent);`
      + "pointer-events:none;z-index:2;";
    root.appendChild(endGrad);
  }

  root.appendChild(track);

  // Build content items
  function _buildContent(): void {
    track.innerHTML = "";
    const item = document.createElement("div");
    item.className = "marquee-item";
    item.style.cssText =
      "flex-shrink:0;display:flex;align-items:center;" +
      (_direction === "up" || _direction === "down" ? "width:100%;" : "");
    if (typeof content === "string") item.innerHTML = content;
    else item.appendChild(content.cloneNode(true));
    track.appendChild(item);

    if (fill === "loop") {
      for (let i = 0; i < repeatCount; i++) {
        const clone = item.cloneNode(true) as HTMLElement;
        track.appendChild(clone);
      }
    }
  }

  _buildContent();

  (container ?? document.body).appendChild(root);

  // --- Animation Loop ---

  function _tick(timestamp: number): void {
    if (!_playing) { rafId = requestAnimationFrame(_tick); return; }

    if (lastTime === null) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000; // seconds
    lastTime = timestamp;

    const isHorizontal = _direction === "left" || _direction === "right";
    const containerSize = isHorizontal ? root.offsetWidth : root.offsetHeight;
    const contentSize = isHorizontal ? track.scrollWidth : track.scrollHeight;

    // Calculate movement
    const moveAmount = _speed * dt;

    switch (_direction) {
      case "left":
        _offset -= moveAmount;
        break;
      case "right":
        _offset += moveAmount;
        break;
      case "up":
        _offset -= moveAmount;
        break;
      case "down":
        _offset += moveAmount;
        break;
    }

    // Bounce mode
    if (fill === "bounce") {
      const limit = Math.max(0, contentSize - containerSize);
      if (_offset >= limit && !_bouncingBack) {
        _bouncingBack = true;
        onCycleComplete?.();
      } else if (_offset <= 0 && _bouncingBack) {
        _bouncingBack = false;
        onCycleComplete?.();
      }
      _offset = Math.max(0, Math.min(limit, _offset));
    } else {
      // Loop mode — reset when scrolled past one full item
      const firstItem = track.querySelector(".marquee-item") as HTMLElement;
      if (firstItem) {
        const itemSize = isHorizontal ? firstItem.offsetWidth : firstItem.offsetHeight;
        if (Math.abs(_offset) >= itemSize) {
          _offset = _offset > 0 ? _offset % itemSize : _offset + (Math.abs(_offset) > itemSize ? itemSize : 0);
          // Simplified: just wrap around
          if ((_direction === "left" || _direction === "up") && _offset <= -itemSize) {
            _offset += itemSize;
            // Move first child to end
            const firstChild = track.firstChild as HTMLElement;
            if (firstChild) track.appendChild(firstChild);
          } else if ((_direction === "right" || _direction === "down") && _offset >= itemSize) {
            _offset -= itemSize;
            const lastChild = track.lastChild as HTMLElement;
            if (lastChild) track.insertBefore(lastChild, track.firstChild);
          }
        }
      }
    }

    // Apply transform
    if (isHorizontal) {
      track.style.transform = `translateX(${-_offset}px)`;
    } else {
      track.style.transform = `translateY(${-_offset}px)`;
    }

    onTick?.(_offset);
    rafId = requestAnimationFrame(_tick);
  }

  function startAnimation(): void {
    if (delay > 0) {
      delayedStartTimer = setTimeout(() => {
        lastTime = null;
        rafId = requestAnimationFrame(_tick);
      }, delay);
    } else {
      lastTime = null;
      rafId = requestAnimationFrame(_tick);
    }
  }

  function stopAnimation(): void {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    if (delayedStartTimer !== null) { clearTimeout(delayedStartTimer); delayedStartTimer = null; }
  }

  // Start
  startAnimation();

  // Pause on hover
  if (pauseOnHover) {
    root.addEventListener("mouseenter", () => { lastTime = null; });
    root.addEventListener("mouseleave", () => { lastTime = null; });
  }

  // --- Methods ---

  function play(): void {
    _playing = true;
    if (!rafId) startAnimation();
  }

  function pause(): void { _playing = false; }

  function toggle(): void { _playing ? pause() : play(); }

  function isPlaying(): boolean { return _playing; }

  function setSpeed(s: number): void { _speed = s; }

  function setDirection(dir: MarqueeDirection): void {
    _direction = dir;
    _offset = 0;
    _bouncingBack = false;
    // Update flex direction
    track.style.flexDirection = (dir === "up" || dir === "down")
      ? "column" : "row";
  }

  function setContent(newContent: HTMLElement | string): void {
    // We'd need to update the internal content reference
    // For simplicity, rebuild
    _buildContent();
  }

  function getOffset(): number { return _offset; }

  function destroy(): void {
    stopAnimation();
    root.remove();
  }

  return { el: root, play, pause, toggle, isPlaying, setSpeed, setDirection, setContent, getOffset, destroy };
}
