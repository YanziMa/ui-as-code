/**
 * Ripple Effect: Material Design-style ink ripple on click/touch,
 * with configurable color, duration, radius, center mode,
 * multiple concurrent ripples, and automatic cleanup.
 */

// --- Types ---

export interface RippleOptions {
  /** Ripple color (default: rgba(0,0,0,0.15)) */
  color?: string;
  /** Animation duration in ms (default: 600) */
  duration?: number;
  /** Ripple max radius multiplier (default: 2.5) */
  radiusScale?: number;
  /** Center ripples on element instead of click position? */
  centered?: boolean;
  /** Disable the effect */
  disabled?: boolean;
  /** Only show on touch events (not mouse) */
  touchOnly?: boolean;
  /** Custom CSS class for ripple container */
  className?: string;
  /** Callback when ripple starts */
  onRippleStart?: (e: PointerEvent | TouchEvent) => void;
  /** Callback when ripple ends */
  onRippleEnd?: () => void;
}

export interface RippleInstance {
  /** Trigger a ripple programmatically at position */
  trigger: (x: number, y: number) => void;
  /** Enable/disable */
  setDisabled: (disabled: boolean) => void;
  /** Update options dynamically */
  updateOptions: (opts: Partial<RippleOptions>) => void;
  /** Remove all active ripples */
  clear: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createRipple(element: HTMLElement, options: RippleOptions = {}): RippleInstance {
  const opts = {
    color: options.color ?? "rgba(0,0,0,0.15)",
    duration: options.duration ?? 600,
    radiusScale: options.radiusScale ?? 2.5,
    centered: options.centered ?? false,
    disabled: options.disabled ?? false,
    touchOnly: options.touchOnly ?? false,
    className: options.className ?? "",
    ...options,
  };

  // Create ripple container
  const container = document.createElement("span");
  container.className = `ripple-container ${opts.className}`;
  container.style.cssText = `
    position:absolute;inset:0;overflow:hidden;border-radius:inherit;
    pointer-events:none;z-index:1;
  `;
  // Ensure parent is positioned
  const parentStyle = getComputedStyle(element);
  if (parentStyle.position === "static") {
    element.style.position = "relative";
  }
  element.style.overflow = "hidden";
  element.appendChild(container);

  let destroyed = false;

  function createRippleEl(x: number, y: number): HTMLSpanElement {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * opts.radiusScale;

    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    ripple.style.cssText = `
      position:absolute;border-radius:50%;
      background:${opts.color};
      width:${size}px;height:${size}px;
      left:${x - size / 2}px;top:${y - size / 2}px;
      transform:scale(0);opacity:1;
      pointer-events:none;
      animation:ripple-expand ${opts.duration}ms ease-out forwards;
    `;
    container.appendChild(ripple);

    // Auto-remove after animation
    ripple.addEventListener("animationend", () => {
      ripple.remove();
      opts.onRippleEnd?.();
    });

    return ripple;
  }

  function handlePointerDown(e: PointerEvent): void {
    if (destroyed || opts.disabled) return;
    if (opts.touchOnly && e.pointerType !== "touch") return;

    const rect = element.getBoundingClientRect();
    const x = opts.centered ? rect.width / 2 : e.clientX - rect.left;
    const y = opts.centered ? rect.height / 2 : e.clientY - rect.top;

    createRippleEl(x, y);
    opts.onRippleStart?.(e);
  }

  function handleTouchStart(e: TouchEvent): void {
    if (destroyed || opts.disabled) return;

    const rect = element.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const x = opts.centered ? rect.width / 2 : touch.clientX - rect.left;
    const y = opts.centered ? rect.height / 2 : touch.clientY - rect.top;

    createRippleEl(x, y);
    opts.onRippleStart?.(e);
  }

  // Inject keyframe styles
  if (!document.getElementById("ripple-styles")) {
    const style = document.createElement("style");
    style.id = "ripple-styles";
    style.textContent = `
      @keyframes ripple-expand {
        0% { transform:scale(0); opacity:0.5; }
        100% { transform:scale(1); opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Event listeners
  if (!opts.touchOnly) {
    element.addEventListener("pointerdown", handlePointerDown);
  }
  element.addEventListener("touchstart", handleTouchStart, { passive: true });

  const instance: RippleInstance = {
    trigger(x: number, y: number) {
      if (!destroyed && !opts.disabled) createRippleEl(x, y);
    },

    setDisabled(disabled: boolean) {
      opts.disabled = disabled;
    },

    updateOptions(newOpts: Partial<RippleOptions>) {
      Object.assign(opts, newOpts);
    },

    clear() {
      container.innerHTML = "";
    },

    destroy() {
      destroyed = true;
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("touchstart", handleTouchStart);
      container.remove();
    },
  };

  return instance;
}

// --- Auto-init via data attribute ---

/**
 * Initialize ripple effects on all elements with [data-ripple] attribute.
 * Options can be passed as JSON in data-ripple-options.
 */
export function initRipples(root: HTMLElement | Document = document): RippleInstance[] {
  const instances: RippleInstance[] = [];

  const elements = root.querySelectorAll<HTMLElement>("[data-ripple]");
  for (const el of elements) {
    let options: RippleOptions = {};
    try {
      const raw = el.getAttribute("data-ripple-options");
      if (raw) options = JSON.parse(raw);
    } catch { /* ignore */ }
    instances.push(createRipple(el, options));
  }

  return instances;
}
