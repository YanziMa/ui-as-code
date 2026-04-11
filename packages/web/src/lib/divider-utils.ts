/**
 * Divider Utilities: Visual dividers/separators with horizontal/vertical
 * orientation, labeled dividers, multiple style variants, and spacing control.
 */

// --- Types ---

export type DividerOrientation = "horizontal" | "vertical";
export type DividerVariant = "solid" | "dashed" | "dotted" | "gradient";
export type DividerLabelPosition = "center" | "start" | "end";

export interface DividerOptions {
  /** Orientation */
  orientation?: DividerOrientation;
  /** Style variant */
  variant?: DividerVariant;
  /** Thickness in px */
  thickness?: number;
  /** Length (width for horizontal, height for vertical). Default 100% */
  length?: string | number;
  /** Color */
  color?: string;
  /** Label text */
  label?: string;
  /** Label position */
  labelPosition?: DividerLabelPosition;
  /** Label background color */
  labelBg?: string;
  /** Label text color */
  labelColor?: string;
  /** Label font size */
  labelFontSize?: string;
  /** Margin around divider */
  margin?: string;
  /** Whether the divider is full-width (no margin on sides) */
  fullWidth?: boolean;
  /** Custom class name */
  className?: string;
}

// --- Core Factory ---

/**
 * Create a visual divider element.
 *
 * @example
 * ```ts
 * // Simple horizontal divider
 * document.body.appendChild(createDivider());
 *
 * // Labeled divider
 * createDivider({ label: "OR", color: "#d1d5db", thickness: 2 });
 *
 * // Vertical divider
 * createDivider({ orientation: "vertical", length: "48px" });
 * ```
 */
export function createDivider(options: DividerOptions = {}): HTMLElement {
  const {
    orientation = "horizontal",
    variant = "solid",
    thickness = 1,
    length,
    color = "#e5e7eb",
    label,
    labelPosition = "center",
    labelBg = "#fff",
    labelColor = "#9ca3af",
    labelFontSize = "12px",
    margin,
    fullWidth = false,
    className,
  } = options;

  const isHorizontal = orientation === "horizontal";

  const el = document.createElement("div");
  el.className = `divider ${orientation} ${variant} ${className ?? ""}`.trim();
  el.setAttribute("role", "separator");
  el.setAttribute("aria-orientation", orientation);

  // Base styles
  const len = length !== undefined ? (typeof length === "number" ? `${length}px` : length) : (isHorizontal ? "100%" : "100%");
  const m = margin ?? (isHorizontal ? "8px 0" : "0 8px");

  Object.assign(el.style, {
    display: label ? "flex" : "block",
    alignItems: "center",
    justifyContent: labelPosition === "start" ? "flex-start" : labelPosition === "end" ? "flex-end" : "center",
    gap: label ? "10px" : undefined,
    ...(isHorizontal
      ? { width: fullWidth ? "100%" : len, height: `${thickness}px`, margin: m }
      : { height: len, width: `${thickness}px`, margin: m }),
    ..._getVariantStyle(variant, color, thickness),
  });

  if (label) {
    const labelEl = document.createElement("span");
    labelEl.className = "divider-label";
    labelEl.textContent = label;
    labelEl.style.cssText =
      `background:${labelBg};color:${labelColor};font-size:${labelFontSize};` +
      "padding:0 10px;font-weight:500;white-space:nowrap;line-height:1;" +
      "border-radius:4px;user-select:none;";
    el.appendChild(labelEl);
  }

  return el;
}

/** Create a horizontal rule / section divider */
export function createHr(options: Omit<DividerOptions, "orientation"> & { marginTop?: number; marginBottom?: number } = {}): HTMLElement {
  const { marginTop, marginBottom, ...rest } = options;
  const el = createDivider({ ...rest, orientation: "horizontal" });
  const currentMargin = el.style.margin || "";
  const top = marginTop !== undefined ? `${marginTop}px` : "";
  const bottom = marginBottom !== undefined ? `${marginBottom}px` : "";
  if (top || bottom) el.style.margin = `${top} 0 ${bottom} 0`;
  return el;
}

/** Create a vertical divider between inline elements */
export function createVr(height: number | string = "100%", options: Partial<DividerOptions> = {}): HTMLElement {
  return createDivider({ ...options, orientation: "vertical", length: typeof height === "number" ? height : undefined });
}

// --- Grouped Dividers ---

export interface DividerGroupOptions {
  /** Number of sections */
  count: number;
  /** Orientation */
  orientation?: DividerOrientation;
  /** Gap between items */
  gap?: number;
  /** Children content (same as count) */
  children: Array<string | HTMLElement>;
  /** Variant for dividers */
  variant?: DividerVariant;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

/**
 * Create a group of sections separated by dividers.
 *
 * @example
 * ```ts
 * const group = createDividerGroup({
 *   count: 3,
 *   children: ["Section A", "Section B", "Section C"],
 *   gap: 16,
 * });
 * ```
 */
export function createDividerGroup(options: DividerGroupOptions): HTMLElement {
  const { count, orientation = "horizontal", gap = 16, children, variant = "solid", className, container } = options;

  const root = document.createElement("div");
  root.className = `divider-group ${orientation} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:flex;${orientation === "horizontal" ? "flex-direction:column" : "flex-direction:row"};gap:${gap}px;`;

  children.forEach((child, i) => {
    const childEl = document.createElement("div");
    childEl.className = "divider-group-item";
    childEl.style.flex = orientation === "horizontal" ? "none" : "1";
    if (typeof child === "string") childEl.innerHTML = child;
    else childEl.appendChild(child.cloneNode(true));
    root.appendChild(childEl);

    // Add divider after each item except last
    if (i < children.length - 1) {
      const div = createDivider({ orientation, variant });
      root.appendChild(div);
    }
  });

  (container ?? document.body).appendChild(root);
  return root;
}

// --- Internal ---

function _getVariantStyle(variant: DividerVariant, color: string, thickness: number): Partial<CSSStyleDeclaration> {
  switch (variant) {
    case "solid":
      return { backgroundColor: color };
    case "dashed":
      return { borderTop: orientation === "horizontal" ? undefined : "none", borderLeft: orientation === "vertical" ? undefined : "none", backgroundImage: `repeating-linear-gradient(${orientation === "horizontal" ? "0deg" : "90deg"}, ${color} 0, transparent ${thickness * 3}px)`, backgroundSize: orientation === "horizontal" ? `1px 100%` : `100% 1px`, backgroundRepeat: "repeat" };
    case "dotted":
      return { borderTop: orientation === "horizontal" ? undefined : "none", borderLeft: orientation === "vertical" ? undefined : "none", backgroundImage: `repeating-linear-gradient(${orientation === "horizontal" ? "0deg" : "90deg"}, ${color} 0, transparent ${thickness * 2}px)`, backgroundSize: orientation === "horizontal" ? `1px 100%` : `100% 1px`, backgroundRepeat: "round" };
    case "gradient": {
      const lighter = _lightenColor(color, 30);
      return { background: `linear-gradient(${orientation === "horizontal" ? "to right" : "to bottom"}, transparent, ${color} 50%, ${lighter} 50%, transparent)` };
    default:
      return { backgroundColor: color };
  }
}

function _lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
