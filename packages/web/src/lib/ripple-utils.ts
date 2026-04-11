/**
 * Ripple Effect Utilities: Material Design-style ripple effect on click/touch
 * with configurable color, duration, size, centering, and multiple ripple support.
 */

// --- Types ---

export type RippleColor = "inherit" | "light" | "dark" | "current";
export type RippleStrategy = "centered" | "nearest" | "distributed";

export interface RippleOptions {
  /** Ripple color */
  color?: RippleColor | string;
  /** Hex color override */
  hexColor?: string;
  /** Ripple duration in ms */
  duration?: number;
  /** Maximum ripple radius (px) */
  maxSize?: number;
  /** Opacity at peak */
  opacity?: number;
  /** Strategy for positioning */
  strategy?: RippleStrategy;
  /** Allow multiple simultaneous ripples */
  allowMultiple?: boolean;
  /** Remove ripple after animation? */
  autoRemove?: boolean;
  /** Easing function */
  easing?: string;
  /** Custom class name for ripple elements */
  rippleClassName?: string;
  /** Target element to attach to */
  target: HTMLElement;
}

export interface RippleInstance {
  /** Trigger a ripple at specific coordinates */
  trigger: (x: number, y: number) => void;
  /** Trigger centered ripple */
  triggerCentered: () => void;
  /** Remove all active ripples */
  clear: () => void;
  /** Disable ripple effect */
  disable: () => void;
  /** Enable ripple effect */
  enable: () => void;
  /** Check if enabled */
  isEnabled: () => boolean;
  /** Destroy and cleanup listeners */
  destroy: () => void;
}

// --- Color Resolution ---

function resolveRippleColor(color: RippleColor | string, el: HTMLElement): string {
  if (typeof color === "string" && color.startsWith("#")) return color;
  if (typeof color === "string" && color.startsWith("rgb")) return color;

  switch (color) {
    case "light": return "rgba(255,255,255,0.35)";
    case "dark": return "rgba(0,0,0,0.15)";
    case "current": {
      const computed = getComputedStyle(el).color;
      return computed.replace(/rgb/i, "rgba").replace(")", ",0.3)");
    }
    case "inherit":
    default: {
      // Try to determine light/dark from background
      const bg = getComputedStyle(el).backgroundColor;
      const match = bg.match(/[\d.]+/g);
      if (match && match.length >= 3) {
        const r = Number(match[0]);
        const g = Number(match[1]);
        const b = Number(match[2]);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.25)";
      }
      return "rgba(0,0,0,0.12)";
    }
  }
}

// --- Core Factory ---

/**
 * Attach Material Design ripple effect to an element.
 *
 * @example
 * ```ts
 * const ripple = createRipple({ target: buttonElement, color: "current" });
 * // Or manually trigger:
 * ripple.triggerCentered();
 * ```
 */
export function createRipple(options: RippleOptions): RippleInstance {
  const {
    color = "inherit",
    hexColor,
    duration = 450,
    maxSize = 0,
    opacity = 0.25,
    strategy = "nearest",
    allowMultiple = true,
    autoRemove = true,
    easing = "ease-out",
    rippleClassName = "",
    target,
  } = options;

  let enabled = true;
  const activeRipples: HTMLElement[] = [];
  let cleanupFns: Array<() => void> = [];

  // Ensure target has proper positioning
  const originalPosition = getComputedStyle(target).position;
  if (originalPosition === "static") {
    target.style.position = "relative";
  }
  target.style.overflow = "hidden";

  // --- Create Single Ripple ---

  function _createRipple(x: number, y: number): HTMLElement {
    const ripple = document.createElement("span");
    ripple.className = `ripple-effect ${rippleClassName}`.trim();

    const resolvedColor = hexColor ?? resolveRippleColor(color, target);

    // Calculate size
    const rect = target.getBoundingClientRect();
    const size = maxSize > 0
      ? maxSize
      : Math.max(rect.width, rect.height) * 2.5;

    // Position based on strategy
    let rx = x;
    let ry = y;

    switch (strategy) {
      case "centered":
        rx = rect.width / 2;
        ry = rect.height / 2;
        break;
      case "nearest":
        // Use provided coordinates (already nearest click point)
        break;
      case "distributed":
        // Offset slightly per existing ripple count
        const offset = activeRipples.length * 10;
        rx = x + offset;
        ry = y + offset;
        break;
    }

    ripple.style.cssText =
      `position:absolute;border-radius:50%;` +
      `width:${size}px;height:${size}px;` +
      `left:${rx - size / 2}px;top:${ry - size / 2}px;` +
      `background:${resolvedColor};` +
      `opacity:0;transform:scale(0);` +
      `pointer-events:none;transition:` +
      `transform ${duration}ms ${easing},opacity ${duration * 0.6}ms ${easing};`;

    target.appendChild(ripple);
    activeRipples.push(ripple);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ripple.style.transform = "scale(1)";
        ripple.style.opacity = String(opacity);
      });
    });

    // Animate out
    setTimeout(() => {
      ripple.style.transform = "scale(1)";
      ripple.style.opacity = "0";
    }, duration * 0.6);

    // Cleanup
    setTimeout(() => {
      ripple.remove();
      const idx = activeRipples.indexOf(ripple);
      if (idx >= 0) activeRipples.splice(idx, 1);
    }, duration + 50);

    return ripple;
  }

  // --- Event Handlers ---

  function handleClick(e: MouseEvent): void {
    if (!enabled) return;
    if (!allowMultiple && activeRipples.length > 0) return;

    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    _createRipple(x, y);
  }

  function handleTouchStart(e: TouchEvent): void {
    if (!enabled) return;
    if (!allowMultiple && activeRipples.length > 0) return;

    const touch = e.touches[0];
    if (!touch) return;

    const rect = target.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    _createRipple(x, y);
  }

  // Attach listeners
  target.addEventListener("click", handleClick);
  target.addEventListener("touchstart", handleTouchStart, { passive: true });
  cleanupFns.push(() => target.removeEventListener("click", handleClick));
  cleanupFns.push(() => target.removeEventListener("touchstart", handleTouchStart));

  // --- Methods ---

  function trigger(x: number, y: number): void {
    if (!enabled) return;
    _createRipple(x, y);
  }

  function triggerCentered(): void {
    if (!enabled) return;
    const rect = target.getBoundingClientRect();
    _createRipple(rect.width / 2, rect.height / 2);
  }

  function clear(): void {
    for (const r of activeRipples) {
      r.style.transition = "none";
      r.style.opacity = "0";
      r.remove();
    }
    activeRipples.length = 0;
  }

  function disable(): void { enabled = false; }
  function enable(): void { enabled = true; }
  function isEnabled(): boolean { return enabled; }

  function destroy(): void {
    clear();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    // Restore position only if we changed it
    if (originalPosition === "static") {
      target.style.position = "";
    }
  }

  return { trigger, triggerCentered, clear, disable, enable, isEnabled, destroy };
}
