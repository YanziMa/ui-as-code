/**
 * Floating UI: Lightweight floating-element positioning engine with
 * smart placement, auto-flip, auto-shift, arrow/pointer positioning,
 * size constraints, virtual elements, and middleware pipeline.
 */

// --- Types ---

export type FloatingPlacement =
  | "top" | "bottom" | "left" | "right"
  | "top-start" | "top-end"
  | "bottom-start" | "bottom-end"
  | "left-start" | "left-end"
  | "right-start" | "right-end";

export type MiddlewareFn = (data: FloatingData) => FloatingData;

export interface FloatingData {
  /** Reference (anchor) rect */
  referenceRect: DOMRect;
  /** Floating element rect */
  floatingRect: DOMRect;
  /** Current computed position */
  x: number;
  y: number;
  /** Current placement */
  placement: FloatingPlacement;
  /** Initial placement */
  initialPlacement: FloatingPlacement;
  /** Reference element */
  reference: HTMLElement;
  /** Floating element */
  floating: HTMLElement;
  /** Middleware data storage */
  middlewareData: Record<string, unknown>;
}

export interface FloatingOptions {
  /** Reference/anchor element */
  reference: HTMLElement;
  /** Floating element */
  floating: HTMLElement;
  /** Placement preference */
  placement?: FloatingPlacement;
  /** Strategy: 'absolute' or 'fixed' (default: 'absolute') */
  strategy?: "absolute" | "fixed";
  /** Gap in px (default: 8) */
  gap?: number;
  /** Offset ({ x, y }) */
  offset?: { x?: number; y?: number };
  /** Middleware pipeline */
  middleware?: MiddlewareFn[];
  /** Auto-update on scroll/resize? (default: true) */
  autoUpdate?: boolean;
  /** Callback after each update */
  onPositioned?: (data: FloatingData) => void;
}

export interface FloatingInstance {
  /** Current position data */
  getData: () => FloatingData;
  /** Force reposition */
  update: () => void;
  /** Change placement */
  setPlacement: (placement: FloatingPlacement) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Built-in Middlewares ---

/** Flip to opposite side when overflowing viewport */
export function flip(options?: { fallbackPlacements?: FloatingPlacement[]; padding?: number }): MiddlewareFn {
  const fallbacks = options?.fallbackPlacements;
  const padding = options?.padding ?? 8;

  return (data) => {
    const { referenceRect, floatingRect, placement, x, y } = data;

    // Determine overflow
    const overflow = {
      top: -y + padding,
      bottom: y + floatingRect.height - window.innerHeight + padding,
      left: -x + padding,
      right: x + floatingRect.width - window.innerWidth + padding,
    };

    const side = placement.split("-")[0] as string;
    const axis = ["top", "bottom"].includes(side) ? "y" : "x";

    const isOverflows =
      (axis === "y" && ((side === "top" && overflow.top < 0) || (side === "bottom" && overflow.bottom > 0))) ||
      (axis === "x" && ((side === "left" && overflow.left < 0) || (side === "right" && overflow.right > 0)));

    if (!isOverflows) return data;

    // Try fallback placements
    const orderedFallbacks = fallbacks ?? getDefaultFallbacks(placement);

    for (const fallback of orderedFallbacks) {
      const { x: fx, fy: fy } = computePosition(
        referenceRect, floatingRect, fallback, data.gap ?? 8,
      );

      const fOverflow = {
        top: -fy + padding,
        bottom: fy + floatingRect.height - window.innerHeight + padding,
        left: -fx + padding,
        right: fx + floatingRect.width - window.innerWidth + padding,
      };

      const fits = Object.values(fOverflow).every(v => v <= 0);
      if (fits) {
        return { ...data, x: fx, y: fy, placement: fallback, middlewareData: { ...data.middlewareData, flip: { flipped: true, fallback } } };
      }
    }

    return data;
  };
}

/** Shift along axes to stay within viewport */
export function shift(options?: { padding?: number; limiter?: number }): MiddlewareFn {
  const padding = options?.padding ?? 8;
  const limiter = options?.limiter ?? 10;

  return (data) => {
    const { floatingRect, x, y } = data;
    let newX = x;
    let newY = y;
    let shifted = false;

    const coords = [
      { key: "left" as const, value: -newX + padding },
      { key: "right" as const, value: newX + floatingRect.width - window.innerWidth + padding },
      { key: "top" as const, value: -newY + padding },
      { key: "bottom" as const, value: newY + floatingRect.height - window.innerHeight + padding },
    ];

    for (const coord of coords) {
      if (coord.value > 0) {
        const amount = Math.min(coord.value, limiter);
        if (coord.key === "left") { newX += amount; shifted = true; }
        else if (coord.key === "right") { newX -= amount; shifted = true; }
        else if (coord.key === "top") { newY += amount; shifted = true; }
        else { newY -= amount; shifted = true; }
      }
    }

    return { ...data, x: newX, y: newY, middlewareData: { ...data.middlewareData, shift: { shifted } } };
  };
}

/** Limit size within boundaries */
export function size(options?: { apply?: ("width" | "height")[]; padding?: number }): MiddlewareFn {
  const apply = options?.apply ?? ["width", "height"];
  const padding = options?.padding ?? 8;

  return (data) => {
    const { floating, referenceRect, floatingRect, x, y } = data;

    for (const dim of apply) {
      if (dim === "width") {
        const maxW = window.innerWidth - x - padding;
        if (floatingRect.width > maxW) {
          floating.style.width = `${maxW}px`;
        }
      }
      if (dim === "height") {
        const maxH = window.innerHeight - y - padding;
        if (floatingRect.height > maxH) {
          floating.style.height = `${maxH}px`;
        }
      }
    }

    return data;
  };
}

/** Position an arrow/pointer element */
export function arrow(options: { element: HTMLElement; padding?: number }): MiddlewareFn {
  const arrowEl = options.element;
  const padding = options.padding ?? 4;

  return (data) => {
    const { placement, floatingRect, x, y } = data;
    const side = placement.split("-")[0] as string;
    const arrowSize = Math.max(arrowEl.offsetWidth, arrowEl.offsetHeight);

    let ax = 0, ay = 0;

    switch (side) {
      case "top":
        ax = x + floatingRect.width / 2 - arrowSize / 2;
        ay = y - arrowSize + padding;
        break;
      case "bottom":
        ax = x + floatingRect.width / 2 - arrowSize / 2;
        ay = y + floatingRect.height - padding;
        break;
      case "left":
        ax = x - arrowSize + padding;
        ay = y + floatingRect.height / 2 - arrowSize / 2;
        break;
      case "right":
        ax = x + floatingRect.width - padding;
        ay = y + floatingRect.height / 2 - arrowSize / 2;
        break;
    }

    arrowEl.style.position = "absolute";
    arrowEl.style.left = `${ax}px`;
    arrowEl.style.top = `${ay}px`;

    return { ...data, middlewareData: { ...data.middlewareData, arrow: { x: ax, y: ay } } };
  };
}

// --- Helpers ---

function getDefaultFallbacks(placement: FloatingPlacement): FloatingPlacement[] {
  const side = placement.split("-")[0];
  const map: Record<string, FloatingPlacement[]> = {
    top: ["bottom", "left", "right"],
    bottom: ["top", "left", "right"],
    left: ["right", "top", "bottom"],
    right: ["left", "top", "bottom"],
  };
  return map[side] ?? ["bottom"];
}

function computePosition(refRect: DOMRect, floatRect: DOMRect, placement: FloatingPlacement, gap: number): { x: number; y: number } {
  const parts = placement.split("-");
  const side = parts[0]!;
  const align = (parts[1] ?? "center") as "start" | "end" | "center";

  let x: number, y: number;

  switch (side) {
    case "top":
      x = alignX(refRect, floatRect, align);
      y = refRect.top - floatRect.height - gap;
      break;
    case "bottom":
      x = alignX(refRect, floatRect, align);
      y = refRect.bottom + gap;
      break;
    case "left":
      x = refRect.left - floatRect.width - gap;
      y = alignY(refRect, floatRect, align);
      break;
    case "right":
      x = refRect.right + gap;
      y = alignY(refRect, floatRect, align);
      break;
    default:
      x = refRect.right + gap;
      y = refRect.top;
  }

  return { x, y };
}

function alignX(ar: DOMRect, fr: DOMRect, align: "start" | "end" | "center"): number {
  switch (align) {
    case "start": return ar.left;
    case "end": return ar.right - fr.width;
    case "center": return ar.left + (ar.width - fr.width) / 2;
  }
}

function alignY(ar: DOMRect, fr: DOMRect, align: "start" | "end" | "center"): number {
  switch (align) {
    case "start": return ar.top;
    case "end": return ar.bottom - fr.height;
    case "center": return ar.top + (ar.height - fr.height) / 2;
  }
}

// --- Main Class ---

export class FloatingEngine {
  create(options: FloatingOptions): FloatingInstance {
    const opts = {
      placement: options.placement ?? "bottom-start",
      strategy: options.strategy ?? "absolute",
      gap: options.gap ?? 8,
      offset: options.offset ?? {},
      middleware: options.middleware ?? [],
      autoUpdate: options.autoUpdate ?? true,
      ...options,
    };

    let destroyed = false;
    const cleanups: Array<() => void> = [];

    // Set initial strategy
    opts.floating.style.position = opts.strategy;

    function doPosition(): FloatingData {
      const refRect = opts.reference.getBoundingClientRect();
      const floatRect = opts.floating.getBoundingClientRect();

      let { x, y } = computePosition(refRect, floatRect, opts.placement, opts.gap);
      x += opts.offset.x ?? 0;
      y += opts.offset.y ?? 0;

      const baseData: FloatingData = {
        referenceRect: refRect,
        floatingRect: floatRect,
        x, y,
        placement: opts.placement,
        initialPlacement: opts.placement,
        reference: opts.reference,
        floating: opts.floating,
        middlewareData: {},
      };

      // Run middleware pipeline
      let result = baseData;
      for (const mw of opts.middleware) {
        result = mw(result);
      }

      // Apply final position
      opts.floating.style.left = `${result.x}px`;
      opts.floating.style.top = `${result.y}px`;

      opts.onPositioned?.(result);
      return result;
    }

    function setupAutoUpdate(): void {
      const ro = new ResizeObserver(() => doPosition());
      ro.observe(opts.reference);
      ro.observe(opts.floating);
      cleanups.push(() => ro.disconnect());

      const onScroll = () => requestAnimationFrame(() => doPosition());
      window.addEventListener("scroll", onScroll, true);
      cleanups.push(() => window.removeEventListener("scroll", onScroll, true));

      window.addEventListener("resize", onScroll);
      cleanups.push(() => window.removeEventListener("resize", onScroll));
    }

    // Initial position
    doPosition();
    if (opts.autoUpdate) setupAutoUpdate();

    const instance: FloatingInstance = {
      getData: () => doPosition(),
      update: () => doPosition(),
      setPlacement(p) { opts.placement = p; doPosition(); },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        for (const fn of cleanups) fn();
      },
    };

    return instance;
  }
}

/** Convenience: create a floating UI instance */
export function createFloating(options: FloatingOptions): FloatingInstance {
  return new FloatingEngine().create(options);
}
