/**
 * Cursor utilities — custom cursors, position tracking, cursor styles,
 * cursor trail effects, and cursor visibility management.
 */

// --- Types ---

export interface CursorPosition {
  x: number;
  y: number;
  /** Timestamp */
  time: number;
  /** Element under cursor */
  target: HTMLElement | null;
}

export interface CursorTrailOptions {
  /** Number of trail particles (default: 12) */
  count?: number;
  /** Particle size in px (default: 6) */
  size?: number;
  /** Color / gradient function */
  color?: string | ((index: number, total: number) => string);
  /** Fade duration ms (default: 400) */
  fadeDuration?: number;
  /** Trail particle shape: 'circle' | 'square' | 'ring' */
  shape?: "circle" | "square" | "ring";
  /** Minimum distance between particles (default: 8) */
  minDistance?: number;
  /** Z-index for trail container (default: 99999) */
  zIndex?: number;
}

export interface CustomCursorOptions {
  /** URL or data URL for cursor image */
  url?: string;
  /** Hotspot X offset (default: 0) */
  hotspotX?: number;
  /** Hotspot Y offset (default: 0) */
  hotspotY?: number;
  /** Fallback CSS cursor value (default: 'auto') */
  fallback?: string;
  /** Apply to specific element (default: document.body) */
  element?: HTMLElement;
}

export interface CursorTrackerOptions {
  /** Throttle interval in ms (default: 16 ~60fps) */
  throttleMs?: number;
  /** Track element under cursor? */
  trackTarget?: boolean;
  /** Callback on every position update */
  onMove?: (pos: CursorPosition) => void;
  /** Callback when cursor enters viewport */
  onEnter?: () => void;
  /** Callback when cursor leaves viewport */
  onLeave?: () => void;
}

// --- Position Tracking ---

/**
 * Track cursor position with throttling and target detection.
 * Returns cleanup function.
 */
export function trackCursor(options?: CursorTrackerOptions): () => void {
  const opts = {
    throttleMs: options?.throttleMs ?? 16,
    trackTarget: options?.trackTarget ?? false,
    ...options,
  };

  let lastTime = 0;
  let destroyed = false;

  function handleMove(e: MouseEvent): void {
    if (destroyed) return;

    const now = performance.now();
    if (now - lastTime < opts.throttleMs) return;
    lastTime = now;

    const pos: CursorPosition = {
      x: e.clientX,
      y: e.clientY,
      time: now,
      target: opts.trackTarget ? (e.target as HTMLElement) ?? null : null,
    };

    opts.onMove?.(pos);
  }

  document.addEventListener("mousemove", handleMove, { passive: true });
  document.addEventListener("mouseenter", () => { if (!destroyed) opts.onEnter?.(); }, { passive: true });
  document.addEventListener("mouseleave", () => { if (!destroyed) opts.onLeave?.(); }, { passive: true });

  return () => {
    destroyed = true;
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseenter", opts.onEnter ?? (() => {}));
    document.removeEventListener("mouseleave", opts.onLeave ?? (() => {}));
  };
}

/** Get current cursor position synchronously */
export function getCursorPosition(): CursorPosition | null {
  // We can't get synchronous mouse position without an event.
  // Return null to indicate need for event-based approach.
  return null;
}

// --- Custom Cursor ---

/**
 * Set a custom cursor image on an element.
 * Returns cleanup function to restore original cursor.
 */
export function setCustomCursor(options: CustomCursorOptions): () => void {
  const el = options.element ?? document.body;
  const original = el.style.cursor;

  if (options.url) {
    el.style.cursor = `url("${options.url}") ${options.hotspotX ?? 0} ${options.hotspotY ?? 0}, ${options.fallback ?? "auto"}`;
  } else {
    el.style.cursor = options.fallback ?? "auto";
  }

  return () => { el.style.cursor = original; };
}

/** Set cursor style on element(s) matching selector */
export function setCursorStyle(selector: string, cursor: string): () => void {
  const els = document.querySelectorAll<HTMLElement>(selector);
  const originals = new Map<HTMLElement, string>();

  for (const el of els) {
    originals.set(el, el.style.cursor);
    el.style.cursor = cursor;
  }

  return () => {
    for (const [el, orig] of originals) {
      el.style.cursor = orig;
    }
  };
}

/** Hide the default cursor on an element */
export function hideCursor(element: HTMLElement = document.body): () => void {
  const original = element.style.cursor;
  element.style.cursor = "none";
  return () => { element.style.cursor = original; };
}

// --- Cursor Trail Effect ---

/**
 * Create a visual trail that follows the cursor.
 * Returns destroy function.
 */
export function createCursorTrail(options?: CursorTrailOptions): () => void {
  const opts = {
    count: options?.count ?? 12,
    size: options?.size ?? 6,
    color: options?.color ?? ((i: number) => `rgba(99, 102, 241, ${1 - i / opts.count})`),
    fadeDuration: options?.fadeDuration ?? 400,
    shape: options?.shape ?? "circle",
    minDistance: options?.minDistance ?? 8,
    zIndex: options?.zIndex ?? 99999,
    ...options,
  };

  let destroyed = false;

  // Create container
  const container = document.createElement("div");
  container.className = "cursor-trail";
  container.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:${opts.zIndex};overflow:hidden;
  `;
  document.body.appendChild(container);

  // Create particles
  const particles: Array<{
    el: HTMLElement;
    x: number;
    y: number;
    opacity: number;
  }> = [];

  for (let i = 0; i < opts.count; i++) {
    const el = document.createElement("div");
    el.className = "trail-particle";
    const s = opts.size * (1 - i / opts.count * 0.5);

    switch (opts.shape) {
      case "square":
        el.style.cssText = `position:absolute;width:${s}px;height:${s}px;background:${getColor(i)};opacity:0;transition:opacity ${opts.fadeDuration}ms ease,left ${opts.fadeDuration}ms ease,top ${opts.fadeDuration}ms ease;`;
        break;
      case "ring":
        el.style.cssText = `position:absolute;width:${s}px;height:${s}px;border:2px solid ${getColor(i)};border-radius:50%;opacity:0;transition:opacity ${opts.fadeDuration}ms ease,left ${opts.fadeDuration}ms ease,top ${opts.fadeDuration}ms ease;`;
        break;
      default: // circle
        el.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:${getColor(i)};opacity:0;transition:opacity ${opts.fadeDuration}ms ease,left ${opts.fadeDuration}ms ease,top ${opts.fadeDuration}ms ease;`;
    }

    container.appendChild(el);
    particles.push({ el, x: -100, y: -100, opacity: 0 });
  }

  let mouseX = -100;
  let mouseY = -100;

  function getColor(index: number): string {
    if (typeof opts.color === "function") return opts.color(index, opts.count);
    return opts.color;
  }

  function handleMove(e: MouseEvent): void {
    if (destroyed) return;
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Move first particle immediately
    const first = particles[0];
    if (first) {
      first.x = mouseX;
      first.y = mouseY;
      first.el.style.transform = `translate(${mouseX - opts.size / 2}px,${mouseY - opts.size / 2}px)`;
      first.el.style.opacity = "1";
    }
  }

  // Animation loop for trailing effect
  let animFrame: number | null = null;

  function animate(): void {
    if (destroyed) return;

    for (let i = particles.length - 1; i > 0; i--) {
      const prev = particles[i - 1]!;
      const curr = particles[i]!;

      const dx = prev.x - curr.x;
      const dy = prev.y - curr.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > opts.minDistance) {
        curr.x += dx * 0.3;
        curr.y += dy * 0.3;
      }

      curr.el.style.transform = `translate(${curr.x - opts.size / 2}px,${curr.y - opts.size / 2}px)`;
      curr.el.style.opacity = String(1 - i / particles.length);
    }

    animFrame = requestAnimationFrame(animate);
  }

  document.addEventListener("mousemove", handleMove, { passive: true });
  animate();

  return () => {
    destroyed = true;
    if (animFrame) cancelAnimationFrame(animFrame);
    document.removeEventListener("mousemove", handleMove);
    container.remove();
  };
}

// --- Cursor Visibility ---

/** Hide cursor globally after inactivity timeout */
export function hideCursorOnIdle(timeoutMs = 3000): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let hidden = false;

  const style = document.createElement("style");
  style.id = "cursor-idle-hide";
  style.textContent = `html.cursor-hidden * { cursor: none !important; }`;
  document.head.appendChild(style);

  function show(): void {
    if (!hidden) return;
    hidden = false;
    document.documentElement.classList.remove("cursor-hidden");
  }

  function scheduleHide(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      hidden = true;
      document.documentElement.classList.add("cursor-hidden");
    }, timeoutMs);
  }

  document.addEventListener("mousemove", show, { passive: true });
  document.addEventListener("mousemove", scheduleHide, { passive: true });

  // Show on any key press
  document.addEventListener("keydown", show, { passive: true });

  return () => {
    if (timer) clearTimeout(timer);
    document.removeEventListener("mousemove", show);
    document.removeEventListener("mousemove", scheduleHide);
    document.removeEventListener("keydown", show);
    style.remove();
    document.documentElement.classList.remove("cursor-hidden");
  };
}

// --- Cursor Utilities ---

/** Check if a point is near the cursor within a threshold */
export function isNearCursor(pointX: number, pointY: number, threshold = 10): boolean {
  // This requires tracking state; use trackCursor for real implementation
  // For a one-off check, this returns false (needs event context)
  return false;
}

/** Get cursor position relative to an element */
export function getCursorRelativeTo(el: HTMLElement, event: MouseEvent): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/** Constrain cursor position within element bounds */
export function constrainToElement(
  x: number, y: number,
  el: HTMLElement,
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.max(rect.left, Math.min(rect.right, x)),
    y: Math.max(rect.top, Math.min(rect.bottom, y)),
  };
}
