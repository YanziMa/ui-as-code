/**
 * Spacer Utilities: Flexible spacing components for consistent layout gaps,
 * responsive breakpoints, and directional spacers.
 */

// --- Types ---

export type SpacerSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

export interface SpacerOptions {
  /** Size preset or custom value */
  size?: SpacerSize | number;
  /** Direction of spacing ("vertical" = height, "horizontal" = width) */
  direction?: "vertical" | "horizontal";
  /** Inline style vs block */
  inline?: boolean;
  /** Hide on certain breakpoint? */
  hideBelow?: string;
  /** Show only on certain breakpoint? */
  showAbove?: string;
  /** Custom class name */
  className?: string;
}

// --- Size Map ---

const SIZE_VALUES: Record<SpacerSize, number> = {
  "xs": 4,
  "sm": 8,
  "md": 16,
  "lg": 24,
  "xl": 32,
  "2xl": 48,
  "3xl": 64,
};

// --- Core Factory ---

/**
 * Create a spacer element for layout gaps.
 *
 * @example
 * ```ts
 * // Vertical spacer of medium size
 * container.appendChild(createSpacer({ size: "md" }));
 *
 * // Horizontal spacer (inline)
 * row.insertBefore(createSpacer({ direction: "horizontal", size: "lg", inline: true }), someElement);
 *
 * // Custom pixel value
 * createSpacer({ size: 120 });
 * ```
 */
export function createSpacer(options: SpacerOptions = {}): HTMLElement {
  const {
    size = "md",
    direction = "vertical",
    inline = false,
    hideBelow,
    showAbove,
    className,
  } = options;

  const value = typeof size === "number" ? size : (SIZE_VALUES[size] ?? 16);
  const isVertical = direction === "vertical";

  const el = document.createElement(isVertical && !inline ? "div" : "span");
  el.className = `spacer spacer-${direction} ${typeof size === "string" ? size : "custom"} ${className ?? ""}`.trim();
  el.setAttribute("aria-hidden", "true");

  Object.assign(el.style, {
    display: inline ? "inline-flex" : "block",
    flexShrink: "0",
    ...(isVertical
      ? { width: "1px", height: `${value}px` }
      : { width: `${value}px`, height: "1px" }),
    ...(hideBelow ? { [`@media (max-width:${hideBelow})` as any]: { display: "none" } } : {}),
    ...(showAbove ? { [`@media (min-width:${showAbove})` as any]: { display: "none" } } : {}),
  });

  return el;
}

// --- Convenience Functions ---

/** Create a vertical spacer (height) */
export function vSpacer(size: SpacerSize | number = "md"): HTMLElement {
  return createSpacer({ size, direction: "vertical" });
}

/** Create a horizontal spacer (width) */
export function hSpacer(size: SpacerSize | number = "md"): HTMLElement {
  return createSpacer({ size, direction: "horizontal", inline: true });
}

/** Create an invisible line break spacer */
export function lineBreak(): HTMLElement {
  const br = document.createElement("div");
  br.className = "spacer line-break";
  br.style.cssText = "width:100%;height:0;flex-shrink:0;";
  br.setAttribute("aria-hidden", "true");
  return br;
}

// --- Spacer Stack ---

export interface SpacerStackOptions {
  /** Spacing between each item */
  space?: SpacerSize | number;
  /** Direction of stack */
  direction?: "vertical" | "horizontal";
  /** Wrap items? */
  wrap?: boolean;
  /** Align items (cross-axis) */
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  /** Justify items (main axis) */
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  /** Items to space out */
  items: Array<HTMLElement | string>;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

/**
 * Create a stack of elements with consistent spacing.
 *
 * @example
 * ```ts
 * const stack = createSpacerStack({
 *   space: "md",
 *   items: [titleEl, descriptionEl, buttonRow],
 *   direction: "vertical",
 * });
 * ```
 */
export function createSpacerStack(options: SpacerStackOptions): HTMLElement {
  const {
    space = "md",
    direction = "vertical",
    wrap = false,
    align = "stretch",
    justify = "start",
    items,
    className,
    container,
  } = options;

  const gap = typeof space === "number" ? space : (SIZE_VALUES[space] ?? 16);
  const isVertical = direction === "vertical";

  const root = document.createElement("div");
  root.className = `spacer-stack ${direction} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:flex;flex-direction:${isVertical ? "column" : "row"};` +
    `gap:${gap}px;${wrap ? "flex-wrap:wrap;" : ""}` +
    `align-items:${align};justify-content:${justify};`;

  items.forEach((item) => {
    const el = typeof item === "string"
      ? (() => { const d = document.createElement("div"); d.innerHTML = item; return d; })()
      : item.cloneNode(true) as HTMLElement;
    root.appendChild(el);
  });

  (container ?? document.body).appendChild(root);
  return root;
}
