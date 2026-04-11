/**
 * Stack Utilities: Layout stack components (VStack, HStack, ZStack)
 * with gap, alignment, distribution, wrapping, and responsive behavior.
 */

// --- Types ---

export type StackDirection = "vertical" | "horizontal";
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify = "start" | "center" | "end" | "between" | "around" | "evenly";
export type StackSize = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export interface StackOptions {
  /** Direction of stacking */
  direction?: StackDirection;
  /** Gap between children (px) */
  gap?: number;
  /** Cross-axis alignment */
  align?: StackAlign;
  /** Main-axis distribution */
  justify?: StackJustify;
  /** Allow wrapping */
  wrap?: boolean;
  /** Reverse order? */
  reverse?: boolean;
  /** Full width/height of parent */
  fill?: boolean;
  /** Minimum width/height */
  minSize?: number | string;
  /** Maximum width/height */
  maxSize?: number | string;
  /** Padding inside stack */
  padding?: number | string;
  /** Divide children with lines */
  divide?: boolean | string;
  /** Responsive: hide below this width */
  hideBelow?: number;
  /** Responsive: change direction below this width */
  stackOnMobile?: boolean;
  /** Mobile breakpoint (default 640) */
  mobileBreakpoint?: number;
  /** Custom class name */
  className?: string;
  /** Children elements */
  children?: Array<HTMLElement | string>;
  /** Container element */
  container?: HTMLElement;
}

export interface StackInstance {
  /** The root stack element */
  el: HTMLElement;
  /** Add a child element */
  addChild: (child: HTMLElement | string) => void;
  /** Remove all children */
  clearChildren: () => void;
  /** Update gap */
  setGap: (gap: number) => void;
  /** Update alignment */
  setAlign: (align: StackAlign) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Align Map ---

const ALIGN_MAP: Record<StackAlign, string> = {
  "start": "flex-start",
  "center": "center",
  "end": "flex-end",
  "stretch": "stretch",
  "baseline": "baseline",
};

const JUSTIFY_MAP: Record<StackJustify, string> = {
  "start": "flex-start",
  "center": "center",
  "end": "flex-end",
  "between": "space-between",
  "around": "space-around",
  "evenly": "space-evenly",
};

// --- Core Factory ---

/**
 * Create a flexible layout stack.
 *
 * @example
 * ```ts
 * // Vertical stack (default)
 * const vstack = createStack({
 *   gap: 12,
 *   align: "stretch",
 *   children: [header, body, footer],
 * });
 *
 * // Horizontal stack
 * const hstack = createStack({ direction: "horizontal", justify: "between", children: [left, right] });
 * ```
 */
export function createStack(options: StackOptions = {}): StackInstance {
  const {
    direction = "vertical",
    gap = 0,
    align = "stretch",
    justify = "start",
    wrap = false,
    reverse = false,
    fill = false,
    minSize,
    maxSize,
    padding,
    divide = false,
    hideBelow,
    stackOnMobile = false,
    mobileBreakpoint = 640,
    className,
    children = [],
    container,
  } = options;

  const root = document.createElement("div");
  root.className = `stack stack-${direction} ${className ?? ""}`.trim();

  Object.assign(root.style, {
    display: "flex",
    flexDirection: direction === "vertical" ? (reverse ? "column-reverse" : "column") : (reverse ? "row-reverse" : "row"),
    gap: `${gap}px`,
    alignItems: ALIGN_MAP[align],
    justifyContent: JUSTIFY_MAP[justify],
    flexWrap: wrap ? "wrap" : "nowrap",
    ...(fill ? (direction === "vertical" ? { width: "100%" } : { height: "100%" }) : {}),
    ...(minSize !== undefined ? (direction === "vertical" ? { minHeight: typeof minSize === "number" ? `${minSize}px` : minSize } : { minWidth: typeof minSize === "number" ? `${minSize}px` : minSize }) : {}),
    ...(maxSize !== undefined ? (direction === "vertical" ? { maxHeight: typeof maxSize === "number" ? `${maxSize}px` : maxSize } : { maxWidth: typeof maxSize === "number" ? `${maxSize}px` : maxSize }) : {}),
    ...(padding !== undefined ? { padding: typeof padding === "number" ? `${padding}px` : padding } : {}),
  });

  // Add initial children
  children.forEach((child) => _addChild(child));

  // Add dividers if requested
  if (divide && root.children.length > 1) {
    _addDividers(typeof divide === "string" ? divide : "#e5e7eb");
  }

  // Responsive hiding
  if (hideBelow !== undefined) {
    const mediaQuery = window.matchMedia(`(max-width: ${hideBelow}px)`);
    const handler = (e: MediaQueryListEvent) => { root.style.display = e.matches ? "none" : ""; };
    mediaQuery.addEventListener("change", handler);
    root.style.display = mediaQuery.matches ? "none" : "";
  }

  // Mobile stack direction switch
  if (stackOnMobile && direction === "horizontal") {
    const mq = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => {
      root.style.flexDirection = e.matches ? "column" : "row";
    };
    mq.addEventListener("change", handler);
    root.style.flexDirection = mq.matches ? "column" : "row";
  }

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function addChild(child: HTMLElement | string): void {
    _addChild(child);
    if (divide && root.children.length > 1) {
      // Re-add dividers
      _clearDividers();
      _addDividers(typeof divide === "string" ? divide : "#e5e7eb");
    }
  }

  function clearChildren(): void {
    root.innerHTML = "";
  }

  function setGap(newGap: number): void {
    root.style.gap = `${newGap}px`;
  }

  function setAlign(newAlign: StackAlign): void {
    root.style.alignItems = ALIGN_MAP[newAlign];
  }

  function destroy(): void {
    root.remove();
  }

  // --- Internal ---

  function _addChild(child: HTMLElement | string): void {
    const el = typeof child === "string"
      ? (() => { const d = document.createElement("div"); d.innerHTML = child; return d; })()
      : child.cloneNode(true) as HTMLElement;
    root.appendChild(el);
  }

  function _addDividers(color: string): void {
    const kids = Array.from(root.children);
    for (let i = 0; i < kids.length - 1; i++) {
      const div = document.createElement("div");
      div.className = "stack-divider";
      div.setAttribute("aria-hidden", "true");
      div.style.cssText =
        `background:${color};${direction === "vertical" ? `height:1px;width:100%;margin:0;` : `width:1px;height:100%;margin:0;`}` +
        "flex-shrink:0;";
      root.insertBefore(div, kids[i + 1]);
    }
  }

  function _clearDividers(): void {
    root.querySelectorAll(".stack-divider").forEach((el) => el.remove());
  }

  return { el: root, addChild, clearChildren, setGap, setAlign, destroy };
}

// --- Convenience Factories ---

/** Create a vertical stack */
export function VStack(options: Omit<StackOptions, "direction"> = {}): StackInstance {
  return createStack({ ...options, direction: "vertical" });
}

/** Create a horizontal stack */
export function HStack(options: Omit<StackOptions, "direction"> = {}): StackInstance {
  return createStack({ ...options, direction: "horizontal" });
}

/** Create a centered stack */
export function CenterStack(options: Omit<StackOptions, "align" | "justify"> = {}): StackInstance {
  return createStack({ ...options, align: "center", justify: "center" });
}

/** Create a space-between stack */
export function BetweenStack(direction: StackDirection = "horizontal", options: Omit<StackOptions, "direction" | "justify"> = {}): StackInstance {
  return createStack({ ...options, direction, justify: "between" });
}

/** Create an evenly-spaced stack */
export function EvenStack(direction: StackDirection = "horizontal", options: Omit<StackOptions, "direction" | "justify"> = {}): StackInstance {
  return createStack({ ...options, direction, justify: "evenly" });
}
