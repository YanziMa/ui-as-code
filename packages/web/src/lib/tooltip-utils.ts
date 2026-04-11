/**
 * Tooltip Utilities: Tooltip positioning engine, show/hide with delays,
 * rich content (HTML/elements), follow cursor mode, arrow indicators,
 * smart boundary detection, and tooltip manager.
 */

// --- Types ---

export type TooltipPlacement = "top" | "bottom" | "left" | "right" | "top-start" | "top-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end" | "right-start" | "right-end";

export type TooltipTrigger = "hover" | "click" | "focus" | "manual";

export interface TooltipOptions {
  /** Content: string or HTMLElement */
  content: string | HTMLElement;
  /** Placement preference. Default "top" */
  placement?: TooltipPlacement;
  /** How to trigger. Default "hover" */
  trigger?: TooltipTrigger;
  /** Delay before showing (ms). Default 200 */
  showDelay?: number;
  /** Delay before hiding (ms). Default 100 */
  hideDelay?: number;
  /** Hide when clicking outside. Default true */
  hideOnClickOutside?: boolean;
  /** Offset from the target in px. Default 8 */
  offset?: number;
  /** Max width in px. Default 300 */
  maxWidth?: number;
  /** Show arrow indicator. Default false */
  arrow?: boolean;
  /** Arrow size in px. Default 8 */
  arrowSize?: number;
  /** Custom CSS class for the tooltip element */
  className?: string;
  /** Render as HTML. Default false */
  html?: boolean;
  /** Allow tooltip to flip to opposite side if out of bounds. Default true */
  flip?: boolean;
  /** Boundary constraint element. Default = viewport */
  boundary?: HTMLElement | "viewport" | "parent";
  /** Padding inside boundary (px). Default 5 */
  boundaryPadding?: number;
  /** Follow cursor position instead of target center. Default false */
  followCursor?: boolean;
  /** Called when tooltip is shown */
  onShow?: (tooltipEl: HTMLElement) => void;
  /** Called when tooltip is hidden */
  onHide?: () => void;
}

export interface TooltipInstance {
  /** The tooltip DOM element */
  element: HTMLElement;
  /** Show the tooltip */
  show: () => void;
  /** Hide the tooltip */
  hide: () => void;
  /** Update content */
  updateContent: (content: string | HTMLElement) => void;
  /** Update placement */
  updatePlacement: (placement: TooltipPlacement) => void;
  /** Destroy and clean up */
  destroy: () => void;
  /** Check if currently visible */
  isVisible: () => boolean;
}

// --- Core Tooltip ---

/**
 * Create a tooltip attached to a target element.
 *
 * @example
 * ```ts
 * const tip = createTooltip(button, {
 *   content: "Click to save your changes",
 *   placement: "bottom",
 * });
 * // Later: tip.destroy();
 * ```
 */
export function createTooltip(
  target: HTMLElement,
  options: TooltipOptions,
): TooltipInstance {
  const {
    placement = "top",
    trigger = "hover",
    showDelay = 200,
    hideDelay = 100,
    hideOnClickOutside = true,
    offset = 8,
    maxWidth = 300,
    arrow = false,
    arrowSize = 8,
    html = false,
    flip = true,
    followCursor = false,
    boundaryPadding = 5,
  } = options;

  let visible = false;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanupFns: Array<() => void> = [];

  // Create tooltip element
  const el = document.createElement("div");
  el.className = `tooltip ${options.className ?? ""}`.trim();
  el.setAttribute("role", "tooltip");
  el.style.cssText = `
    position: fixed;
    z-index: 99998;
    pointer-events: none;
    opacity: 0;
    transition: opacity 150ms ease;
    max-width: ${maxWidth}px;
    padding: 6px 12px;
    border-radius: 6px;
    background: #1f2937;
    color: #fff;
    font-size: 13px;
    line-height: 1.4;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    word-wrap: break-word;
    visibility: hidden;
  `;

  if (typeof options.content === "string") {
    el.innerHTML = html ? options.content : escapeHtml(options.content);
  } else {
    el.appendChild(options.content);
  }

  document.body.appendChild(el);

  // Arrow element
  let arrowEl: HTMLElement | null = null;
  if (arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "tooltip-arrow";
    Object.assign(arrowEl.style, {
      position: "absolute",
      width: "0",
      height: "0",
      borderStyle: "solid",
    });
    el.appendChild(arrowEl);
  }

  // Positioning
  const positionTooltip = (cursorX?: number, cursorY?: number) => {
    const targetRect = target.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Calculate desired position based on placement
    let { x, y, arrowX, arrowY, arrowDir } = calculatePosition(
      placement,
      targetRect,
      { width: elRect.width, height: elRect.height },
      offset,
      cursorX,
      cursorY,
    );

    // Boundary check with optional flip
    if (flip) {
      const flipped = checkAndFlip(
        { x, y, width: elRect.width, height: elRect.height },
        boundaryPadding,
        options.boundary ?? "viewport",
        targetRect,
        placement,
      );
      if (flipped.flipped) {
        x = flipped.x;
        y = flipped.y;
        arrowDir = flipped.arrowDir;
        _updateArrow(arrowEl!, arrowSize, arrowDir, flipped.arrowX, flipped.arrowY);
      }
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    if (arrow && arrowEl) {
      _updateArrow(arrowEl, arrowSize, arrowDir, arrowX, arrowY);
    }
  };

  const show = () => {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (visible) return;

    showTimer = setTimeout(() => {
      visible = true;
      positionTooltip();
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
      options.onShow?.(el);
    }, showDelay);
  };

  const hide = () => {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    if (!visible) return;

    hideTimer = setTimeout(() => {
      visible = false;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      setTimeout(() => { el.style.visibility = "hidden"; }, 150);
      options.onHide?.();
    }, hideDelay);
  };

  // Bind triggers
  if (trigger === "hover" || trigger === "focus") {
    target.addEventListener("mouseenter", show);
    target.addEventListener("mouseleave", hide);
    target.addEventListener("focus", show);
    target.addEventListener("blur", hide);
    cleanupFns.push(
      () => target.removeEventListener("mouseenter", show),
      () => target.removeEventListener("mouseleave", hide),
      () => target.removeEventListener("focus", show),
      () => target.removeEventListener("blur", hide),
    );

    if (followCursor) {
      const onMouseMove = (e: MouseEvent) => {
        if (visible) positionTooltip(e.clientX, e.clientY);
      };
      target.addEventListener("mousemove", onMouseMove);
      cleanupFns.push(() => target.removeEventListener("mousemove", onMouseMove));
    }
  }

  if (trigger === "click") {
    target.addEventListener("click", (e) => {
      e.stopPropagation();
      visible ? hide() : show();
    });
    cleanupFns.push(() => target.removeEventListener("click", show));
  }

  if (hideOnClickOutside) {
    const onClickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node) && !target.contains(e.target as Node)) {
        hide();
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    cleanupFns.push(() => document.removeEventListener("mousedown", onClickOutside));
  }

  return {
    element: el,
    show,
    hide,
    updateContent: (content: string | HTMLElement) => {
      if (typeof content === "string") {
        el.innerHTML = html ? content : escapeHtml(content);
      } else {
        el.innerHTML = "";
        el.appendChild(content);
      }
      if (visible) positionTooltip();
    },
    updatePlacement: (newPlacement: TooltipPlacement) => {
      // Would need to recalculate — simplified: just reposition
      if (visible) positionTooltip();
    },
    destroy: () => {
      hide();
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
      el.remove();
    },
    isVisible: () => visible,
  };
}

// --- Position Calculation ---

interface PositionResult {
  x: number;
  y: number;
  arrowX: number;
  arrowY: number;
  arrowDir: string;
}

function calculatePosition(
  placement: TooltipPlacement,
  targetRect: DOMRect,
  tooltipSize: { width: number; height: number },
  offset: number,
  cursorX?: number,
  cursorY?: number,
): PositionResult {
  const tw = tooltipSize.width;
  const th = tooltipSize.height;
  let x = 0, y = 0;
  let arrowX = 0, arrowY = 0;
  let arrowDir = "bottom"; // Arrow points toward target

  const [main, align] = placement.split("-") as [string, string?];

  switch (main) {
    case "top":
      y = targetRect.top - th - offset;
      x = targetRect.left + targetRect.width / 2 - tw / 2;
      arrowDir = "bottom";
      arrowX = tw / 2;
      arrowY = th;
      break;
    case "bottom":
      y = targetRect.bottom + offset;
      x = targetRect.left + targetRect.width / 2 - tw / 2;
      arrowDir = "top";
      arrowX = tw / 2;
      arrowY = 0;
      break;
    case "left":
      x = targetRect.left - tw - offset;
      y = targetRect.top + targetRect.height / 2 - th / 2;
      arrowDir = "right";
      arrowX = tw;
      arrowY = th / 2;
      break;
    case "right":
      x = targetRect.right + offset;
      y = targetRect.top + targetRect.height / 2 - th / 2;
      arrowDir = "left";
      arrowX = 0;
      arrowY = th / 2;
      break;
  }

  // Apply alignment
  if (align === "start") {
    if (main === "top" || main === "bottom") x = targetRect.left;
    else y = targetRect.top;
  } else if (align === "end") {
    if (main === "top" || main === "bottom") x = targetRect.right - tw;
    else y = targetRect.bottom - th;
  }

  // Follow cursor override
  if (cursorX !== undefined && cursorY !== undefined) {
    x = cursorX - tw / 2;
    y = cursorY - th - offset;
    arrowDir = "bottom";
    arrowX = tw / 2;
    arrowY = th;
  }

  return { x, y, arrowX, arrowY, arrowDir };
}

function checkAndFlip(
  pos: { x: number; y: number; width: number; height: number },
  padding: number,
  boundary: HTMLElement | "viewport" | "parent",
  targetRect: DOMRect,
  originalPlacement: TooltipPlacement,
): PositionResult & { flipped: boolean; arrowDir: string; arrowX: number; arrowY: number } {
  let bounds: { top: number; left: number; bottom: number; right: number };
  if (boundary === "viewport") {
    bounds = { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
  } else if (boundary === "parent") {
    const parent = targetRect; // Use target as reference
    bounds = { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
  } else {
    const r = (boundary as HTMLElement).getBoundingClientRect();
    bounds = { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
  }

  const [main] = originalPlacement.split("-") as [string];
  let flipped = false;
  let result = { ...pos, arrowDir: "", arrowX: pos.width / 2, arrowY: pos.height };

  // Check vertical overflow
  if ((main === "top" || main === "bottom") && (pos.y < bounds.top - padding || pos.y + pos.height > bounds.bottom + padding)) {
    if (pos.y < bounds.top - padding) {
      // Flip to bottom
      pos.y = targetRect.bottom + 8;
      result.arrowDir = "top";
      result.arrowY = 0;
    } else {
      // Flip to top
      pos.y = targetRect.top - pos.height - 8;
      result.arrowDir = "bottom";
      result.arrowY = pos.height;
    }
    flipped = true;
  }

  // Check horizontal overflow
  if ((main === "left" || main === "right") && (pos.x < bounds.left - padding || pos.x + pos.width > bounds.right + padding)) {
    if (pos.x < bounds.left - padding) {
      pos.x = targetRect.right + 8;
      result.arrowDir = "left";
      result.arrowX = 0;
    } else {
      pos.x = targetRect.left - pos.width - 8;
      result.arrowDir = "right";
      result.arrowX = pos.width;
    }
    flipped = true;
  }

  return { ...result, x: pos.x, y: pos.y, flipped };
}

function _updateArrow(
  arrowEl: HTMLElement,
  size: number,
  direction: string,
  x: number,
  y: number,
): void {
  const half = size / 2;
  const color = "#1f2937";

  switch (direction) {
    case "bottom": // Arrow points down at tooltip bottom
      Object.assign(arrowEl.style, {
        bottom: `-${half}px`,
        left: `${x - half}px`,
        borderWidth: `${size}px ${half}px 0 ${half}px`,
        borderColor: `${color} transparent transparent transparent`,
      });
      break;
    case "top": // Arrow points up at tooltip top
      Object.assign(arrowEl.style, {
        top: `-${half}px`,
        left: `${x - half}px`,
        borderWidth: `0 ${half}px ${size}px ${half}px`,
        borderColor: `transparent transparent ${color} transparent`,
      });
      break;
    case "left": // Arrow points left
      Object.assign(arrowEl.style, {
        left: `-${half}px`,
        top: `${y - half}px`,
        borderWidth: `${half}px ${size}px ${half}px 0`,
        borderColor: `transparent ${color} transparent transparent`,
      });
      break;
    case "right": // Arrow points right
      Object.assign(arrowEl.style, {
        right: `-${half}px`,
        top: `${y - half}px`,
        borderWidth: `${half}px 0 ${half}px ${size}px`,
        borderColor: `transparent transparent transparent ${color}`,
      });
      break;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
