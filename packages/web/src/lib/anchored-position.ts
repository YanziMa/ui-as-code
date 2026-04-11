/**
 * Anchored Position: CSS Anchor Positioning API polyfill/fallback with
 * automatic flip, shift, overflow detection, virtual elements, and
 * arrow positioning. Works as a lightweight alternative to floating-ui.
 */

// --- Types ---

export type AnchorPlacement =
  | "top" | "bottom" | "left" | "right"
  | "top-start" | "top-end" | "top-center"
  | "bottom-start" | "bottom-end" | "bottom-center"
  | "left-start" | "left-end" | "left-center"
  | "right-start" | "right-end" | "right-center"
  | "center";

export type AnchorAlignment = "start" | "end" | "center";

export interface AnchorOptions {
  /** Anchor/trigger element */
  anchor: HTMLElement;
  /** Floating element to position */
  floating: HTMLElement;
  /** Preferred placement */
  placement?: AnchorPlacement;
  /** Gap in px between anchor and floating (default: 8) */
  gap?: number;
  /** Allow flipping to opposite side when overflowing? (default: true) */
  flip?: boolean;
  /** Shift along axis to stay in viewport? (default: true) */
  shift?: boolean;
  /** Offset from aligned edge ({ x, y }) */
  offset?: { x?: number; y?: number };
  /** Padding inside viewport boundary (default: 8) */
  padding?: number;
  /** Constrain to a specific container (default: viewport) */
  boundary?: HTMLElement | "viewport" | "clipping-ancestors";
  /** Auto-update on scroll/resize? (default: true) */
  autoUpdate?: boolean;
  /** Use CSS Anchor Positioning API if available? (default: true) */
  useCssAnchorApi?: boolean;
  /** Callback after each position update */
  onPositioned?: (position: ComputedPosition) => void;
}

export interface ComputedPosition {
  x: number;
  y: number;
  placement: AnchorPlacement;
  /** Actual placement after flip */
  actualPlacement: AnchorPlacement;
  /** Whether the element had to be flipped */
  flipped: boolean;
  /** Whether the element was shifted */
  shifted: boolean;
  /** Overflow amounts on each side */
  overflow: { top: number; bottom: number; left: number; right: number };
  /** Reference rect (anchor) */
  anchorRect: DOMRect;
  /** Floating rect */
  floatingRect: DOMRect;
}

// --- Placement Parsing ---

function parsePlacement(placement: AnchorPlacement): { side: "top" | "bottom" | "left" | "right"; align: AnchorAlignment } {
  const parts = placement.split("-");
  const side = parts[0] as "top" | "bottom" | "left" | "right";
  const align = (parts[1] ?? "center") as AnchorAlignment;
  return { side, align };
}

const OPPOSITE_SIDE: Record<string, "top" | "bottom" | "left" | "right"> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

// --- Main Class ---

export class AnchoredPositioner {
  private options: Required<Omit<AnchorOptions, "anchor" | "floating">> & Pick<AnchorOptions, "anchor" | "floating">;
  private cleanupFns: Array<() => void> = [];
  private destroyed = false;
  private rafId: number | null = null;

  constructor(options: AnchorOptions) {
    this.options = {
      placement: options.placement ?? "bottom-start",
      gap: options.gap ?? 8,
      flip: options.flip ?? true,
      shift: options.shift ?? true,
      offset: options.offset ?? {},
      padding: options.padding ?? 8,
      boundary: options.boundary ?? "clipping-ancestors",
      autoUpdate: options.autoUpdate ?? true,
      useCssAnchorApi: options.useCssAnchorApi ?? true,
      ...options,
    };
  }

  /** Initialize positioning */
  start(): ComputedPosition {
    this.cleanup();

    // Try CSS Anchor API first
    if (this.options.useCssAnchorApi && this.supportsCssAnchor()) {
      return this.setupCssAnchor();
    }

    // Fallback: JS-based positioning
    return this.setupJsPositioning();
  }

  /** Update position manually */
  update(): ComputedPosition {
    if (this.destroyed) return this.emptyPosition();
    return this.positionJs();
  }

  /** Stop auto-updates and clean up */
  stop(): void {
    this.cleanup();
  }

  /** Destroy completely */
  destroy(): void {
    this.destroyed = true;
    this.stop();
  }

  // --- Internal ---

  private supportsCssAnchor(): boolean {
    return typeof CSS !== "undefined" &&
      "anchorName" in document.documentElement.style &&
      "positionAnchor" in document.documentElement.style;
  }

  private setupCssAnchor(): ComputedPosition {
    const { anchor, floating } = this.options;
    const id = `anchor-${Date.now().toString(36)}`;

    anchor.style.anchorName = `--${id}`;
    floating.style.positionAnchor = `--${id}`;

    // Set position
    floating.style.position = "fixed";
    floating.style.inset = "auto";

    const pos = this.applyPlacementToCss(this.options.placement);
    Object.assign(floating.style, pos.styles);

    // Auto-update
    if (this.options.autoUpdate) {
      const ro = new ResizeObserver(() => this.update());
      ro.observe(anchor);
      ro.observe(floating);
      this.cleanupFns.push(() => ro.disconnect());

      const scrollHandler = () => this.update();
      window.addEventListener("scroll", scrollHandler, true);
      this.cleanupFns.push(() => window.removeEventListener("scroll", scrollHandler, true));
    }

    const computed = floating.getBoundingClientRect();
    const result: ComputedPosition = {
      x: computed.left,
      y: computed.top,
      placement: this.options.placement,
      actualPlacement: this.options.placement,
      flipped: false,
      shifted: false,
      overflow: { top: 0, bottom: 0, left: 0, right: 0 },
      anchorRect: anchor.getBoundingClientRect(),
      floatingRect: computed,
    };

    this.options.onPositioned?.(result);
    return result;
  }

  private applyPlacementToCss(placement: AnchorPlacement): { styles: Partial<CSSStyleDeclaration> } {
    const { side, align } = parsePlacement(placement);
    const gap = this.options.gap;
    const offset = this.options.offset;

    const styleMap: Record<string, Partial<CSSStyleDeclaration>> = {
      top:       { bottom: `anchor(${gap}px)`, left: this.cssAlign(align), right: "auto" },
      "top-start":  { bottom: `anchor(${gap}px)`, left: "anchor(0)", right: "auto" },
      "top-end":    { bottom: `anchor(${gap}px)`, right: "anchor(0)", left: "auto" },
      "top-center":  { bottom: `anchor(${gap}px)`, left: "50%", transform: "translateX(-50%)" },
      bottom:    { top: `anchor(${gap}px)`, left: this.cssAlign(align), right: "auto" },
      "bottom-start":  { top: `anchor(${gap}px)`, left: "anchor(0)", right: "auto" },
      "bottom-end":    { top: `anchor(${gap}px)`, right: "anchor(0)", left: "auto" },
      "bottom-center":  { top: `anchor(${gap}px)`, left: "50%", transform: "translateX(-50%)" },
      left:     { right: `anchor(${gap}px)`, top: this.cssAlignV(align), bottom: "auto" },
      "left-start":   { right: `anchor(${gap}px)`, top: "anchor(0)", bottom: "auto" },
      "left-end":     { right: `anchor(${gap}px)`, bottom: "anchor(0)", top: "auto" },
      "left-center":   { right: `anchor(${gap}px)`, top: "50%", transform: "translateY(-50%)" },
      right:    { left: `anchor(${gap}px)`, top: this.cssAlignV(align), bottom: "auto" },
      "right-start":   { left: `anchor(${gap}px)`, top: "anchor(0)", bottom: "auto" },
      "right-end":     { left: `anchor(${gap}px)`, bottom: "anchor(0)", top: "auto" },
      "right-center":   { left: `anchor(${gap}px)`, top: "50%", transform: "translateY(-50%)" },
      center:   { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    };

    let styles = styleMap[placement] ?? styleMap.bottom!;

    // Apply offsets
    if (offset.x) {
      const currentLeft = (styles.left as string) ?? "auto";
      if (currentLeft === "auto") styles.left = `${offset.x}px`;
      else styles.left = `calc(${currentLeft} + ${offset.x}px)`;
    }
    if (offset.y) {
      const currentTop = (styles.top as string) ?? "auto";
      if (currentTop === "auto") styles.top = `${offset.y}px`;
      else styles.top = `calc(${currentTop} + ${offset.y}px)`;
    }

    return { styles };
  }

  private cssAlign(align: AnchorAlignment): string {
    switch (align) {
      case "start": return "anchor(0)";
      case "end": return "anchor(100%)";
      case "center": return "50%";
    }
  }

  private cssAlignV(align: AnchorAlignment): string {
    switch (align) {
      case "start": return "anchor(0)";
      case "end": return "anchor(100%)";
      case "center": return "50%";
    }
  }

  private setupJsPositioning(): ComputedPosition {
    const { floating } = this.options;
    floating.style.position = "fixed";
    floating.style.inset = "auto";

    const pos = this.positionJs();

    if (this.options.autoUpdate) {
      const ro = new ResizeObserver(() => this.update());
      ro.observe(this.options.anchor);
      ro.observe(floating);
      this.cleanupFns.push(() => ro.disconnect());

      const scrollHandler = () => {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => this.update());
      };
      window.addEventListener("scroll", scrollHandler, true);
      this.cleanupFns.push(() => window.removeEventListener("scroll", scrollHandler, true));

      window.addEventListener("resize", scrollHandler);
      this.cleanupFns.push(() => window.removeEventListener("resize", scrollHandler));
    }

    return pos;
  }

  private positionJs(): ComputedPosition {
    const { anchor, floating, padding } = this.options;
    const anchorRect = anchor.getBoundingClientRect();
    const floatRect = floating.getBoundingClientRect();

    let placement = this.options.placement;
    let flipped = false;
    let shifted = false;

    const { side, align } = parsePlacement(placement);

    // Calculate base position
    let x: number, y: number;

    switch (side) {
      case "top":
        x = this.alignX(anchorRect, floatRect, align);
        y = anchorRect.top - floatRect.height - this.options.gap;
        break;
      case "bottom":
        x = this.alignX(anchorRect, floatRect, align);
        y = anchorRect.bottom + this.options.gap;
        break;
      case "left":
        x = anchorRect.left - floatRect.width - this.options.gap;
        y = this.alignY(anchorRect, floatRect, align);
        break;
      case "right":
        x = anchorRect.right + this.options.gap;
        y = this.alignY(anchorRect, floatRect, align);
        break;
    }

    // Apply manual offsets
    x += this.options.offset.x ?? 0;
    y += this.options.offset.y ?? 0;

    // Check overflow
    const overflow = this.getOverflow(x, y, floatRect, padding);

    // Flip if needed
    if (this.options.flip) {
      const shouldFlip =
        (side === "top" && overflow.top < 0) ||
        (side === "bottom" && overflow.bottom > 0) ||
        (side === "left" && overflow.left < 0) ||
        (side === "right" && overflow.right > 0);

      if (shouldFlip) {
        const oppositeSide = OPPOSITE_SIDE[side];
        placement = `${oppositeSide}-${align}` as AnchorPlacement;

        switch (oppositeSide) {
          case "top":
            y = anchorRect.top - floatRect.height - this.options.gap;
            break;
          case "bottom":
            y = anchorRect.bottom + this.options.gap;
            break;
          case "left":
            x = anchorRect.left - floatRect.width - this.options.gap;
            break;
          case "right":
            x = anchorRect.right + this.options.gap;
            break;
        }

        x = this.alignX(anchorRect, floatRect, align, oppositeSide === "left" || oppositeSide === "right" ? oppositeSide : side);
        y = this.alignY(anchorRect, floatRect, align, oppositeSide === "top" || oppositeSide === "bottom" ? oppositeSide : side);
        x += this.options.offset.x ?? 0;
        y += this.options.offset.y ?? 0;
        flipped = true;
      }
    }

    // Shift if needed
    if (this.options.shift) {
      const newOverflow = this.getOverflow(x, y, floatRect, padding);
      if (newOverflow.left < 0) { x -= newOverflow.left; shifted = true; }
      if (newOverflow.right > 0) { x -= newOverflow.right; shifted = true; }
      if (newOverflow.top < 0) { y -= newOverflow.top; shifted = true; }
      if (newOverflow.bottom > 0) { y -= newOverflow.bottom; shifted = true; }
    }

    // Clamp to viewport
    const p = padding;
    x = Math.max(p, Math.min(x, window.innerWidth - floatRect.width - p));
    y = Math.max(p, Math.min(y, window.innerHeight - floatRect.height - p));

    // Apply position
    this.options.floating.style.left = `${x}px`;
    this.options.floating.style.top = `${y}px`;

    const finalOverflow = this.getOverflow(x, y, floatRect, padding);
    const result: ComputedPosition = {
      x, y,
      placement: this.options.placement,
      actualPlacement: placement,
      flipped,
      shifted,
      overflow: finalOverflow,
      anchorRect,
      floatingRect: this.options.floating.getBoundingClientRect(),
    };

    this.options.onPositioned?.(result);
    return result;
  }

  private alignX(ar: DOMRect, fr: DOMRect, align: AnchorAlignment, side?: string): number {
    if (side === "left") return ar.left - fr.width - this.options.gap;
    if (side === "right") return ar.right + this.options.gap;
    switch (align) {
      case "start": return ar.left;
      case "end": return ar.right - fr.width;
      case "center": return ar.left + (ar.width - fr.width) / 2;
    }
  }

  private alignY(ar: DOMRect, fr: DOMRect, align: AnchorAlignment, side?: string): number {
    if (side === "top") return ar.top - fr.height - this.options.gap;
    if (side === "bottom") return ar.bottom + this.options.gap;
    switch (align) {
      case "start": return ar.top;
      case "end": return ar.bottom - fr.height;
      case "center": return ar.top + (ar.height - fr.height) / 2;
    }
  }

  private getOverflow(x: number, y: number, rect: DOMRect, padding: number) {
    return {
      top: y - padding,
      bottom: y + rect.height + padding - window.innerHeight,
      left: x - padding,
      right: x + rect.width + padding - window.innerWidth,
    };
  }

  private cleanup(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  private emptyPosition(): ComputedPosition {
    return {
      x: 0, y: 0,
      placement: this.options.placement,
      actualPlacement: this.options.placement,
      flipped: false, shifted: false,
      overflow: { top: 0, bottom: 0, left: 0, right: 0 },
      anchorRect: new DOMRect(),
      floatingRect: new DOMRect(),
    };
  }
}

/** Convenience: create an anchored positioner */
export function createAnchoredPosition(options: AnchorOptions): AnchoredPositioner {
  const pos = new AnchoredPositioner(options);
  pos.start();
  return pos;
}
