/**
 * Divider: Horizontal/vertical separator component with text label,
 * variant styles (solid/dashed/dotted/gap), spacing control,
 * margin options, and accessible semantics.
 */

// --- Types ---

export type DividerOrientation = "horizontal" | "vertical";
export type DividerStyle = "solid" | "dashed" | "dotted" | "none" | "gap";

export interface DividerOptions {
  /** Orientation (default: horizontal) */
  orientation?: DividerOrientation;
  /** Line style (default: solid) */
  style?: DividerStyle;
  /** Text label to display in the middle */
  label?: string;
  /** Label position: "center" or side-aligned */
  labelAlign?: "start" | "center" | "end";
  /** Whether label is inside a decorative box */
  labelBoxed?: boolean;
  /** Color of the divider line */
  color?: string;
  /** Thickness in px (default: 1 for horizontal, 1 for vertical) */
  thickness?: number;
  /** Margin/margin spacing (CSS value) */
  margin?: string;
  /** Flex behavior (grow to fill available space) */
  flex?: boolean;
  /** Full width (adds negative margin on parent for edge-to-edge) */
  full?: boolean;
  /** ARIA role override */
  role?: string;
  /** Custom CSS class */
  className?: string;
  /** Vertical spacing when used between items (in px) */
  spacing?: number;
}

// --- Main ---

export function createDivider(options: DividerOptions = {}): HTMLElement {
  const opts = {
    orientation: options.orientation ?? "horizontal",
    style: options.style ?? "solid",
    labelAlign: options.labelAlign ?? "center",
    labelBoxed: options.labelBoxed ?? false,
    color: options.color ?? "#e5e7eb",
    thickness: options.thickness ?? (options.orientation === "vertical" ? 1 : 1),
    flex: options.flex ?? false,
    full: options.full ?? false,
    role: options.role ?? "separator",
    className: options.className ?? "",
  };

  const el = document.createElement("div");
  el.className = `divider divider-${opts.orientation} divider-${opts.style} ${opts.className}`;

  const isHorizontal = opts.orientation === "horizontal";

  el.setAttribute("role", opts.role);
  el.setAttribute("aria-orientation", isHorizontal ? "horizontal" : "vertical");

  // Base styles
  let baseStyles = `
    display:${isHorizontal ? "block" : "inline-block"};
    ${isHorizontal ? "" : "align-self:stretch;"}
  `;

  if (isHorizontal) {
    baseStyles += `
      border:none;border-top:${opts.thickness}px ${
        opts.style === "dashed" ? "dashed" :
        opts.style === "dotted" ? "dotted" :
        opts.style === "none" ? "none" : "solid"
      } ${opts.color};
      margin:${opts.margin ?? (opts.full ? "0" : "")};
      ${opts.flex ? "flex:1;" : ""}
    `;
  } else {
    baseStyles += `
      border:none;border-left:${opts.thickness}px ${
        opts.style === "dashed" ? "dashed" :
        opts.style === "dotted" ? "dotted" :
        opts.style === "none" ? "none" : "solid"
      } ${opts.color};
      margin:${opts.margin ?? ""};
      align-self:stretch;
      min-height: 1px;
    `;
  }

  el.style.cssText = baseStyles;

  // Gap style = just spacing, no visible line
  if (opts.style === "gap") {
    if (isHorizontal) {
      el.style.borderTop = "none";
      el.style.height = `${(options.spacing ?? 16)}px`;
    } else {
      el.style.borderLeft = "none";
      el.style.width = `${(options.spacing ?? 16)}px`;
    }
  }

  // Label
  if (options.label) {
    const wrapper = document.createElement("span");
    wrapper.className = "divider-label";
    wrapper.textContent = options.label;

    const labelBg = "#fff";
    const labelPad = isHorizontal ? "0.4em 0.8em" : "0.2em 0.4em";
    const labelMargin = isHorizontal
      ? `margin-left:${opts.labelAlign === "end" ? "auto" : opts.labelAlign === "start" ? "0" : "auto"};margin-right:${opts.labelAlign === "start" ? "auto" : opts.labelAlign === "end" ? "0" : "auto"}`
      : `margin-top:${opts.labelAlign === "end" ? "auto" : opts.labelAlign === "start" ? "0" : "auto"};margin-bottom:${opts.labelAlign === "start" ? "auto" : opts.labelAlign === "end" ? "0" : "auto"}`;

    wrapper.style.cssText = `
      display:inline-flex;align-items:center;justify-content:${opts.labelAlign};
      padding:${labelPad};background:${labelBoxed ? "#f9fafb" : "transparent"};
      font-size:12px;color:#888;font-weight:500;letter-spacing:0.02em;
      white-space:nowrap;line-height:1;user-select:none;
      border-radius:4px;${labelMargin}
      ${isHorizontal ? "position:relative;top:-0.5em;" : ""}
    `;

    // For vertical dividers with labels, use a different layout
    if (!isHorizontal) {
      el.style.display = "inline-flex";
      el.style.alignItems = "center";
      el.style.gap = "8px";
      el.style.borderLeft = "none";
      el.appendChild(wrapper);
      // Re-add a small line after/before label based on alignment
      const line = document.createElement("span");
      line.style.cssText = `
        display:block;width:${opts.thickness}px;min-height:24px;background:${opts.color};
        ${opts.style === "dashed" ? "border-left-style:dashed;" : ""}
        ${opts.style === "dotted" ? "border-left-style:dotted;" : ""}
        flex-shrink:0;
      `;
      if (opts.labelAlign === "end") {
        el.insertBefore(line, wrapper.firstChild ?? wrapper);
      } else {
        el.appendChild(line);
      }
    } else {
      el.appendChild(wrapper);
    }
  }

  return el;
}

// --- Quick Helpers ---

/** Create a simple horizontal divider */
export function hDivider(margin?: string, color?: string): HTMLElement {
  return createDivider({ margin, color });
}

/** Create a simple vertical divider */
export function vDivider(height?: number): HTMLElement {
  return createDivider({ orientation: "vertical", spacing: height });
}

/** Create a labeled divider */
export function labeledDivider(
  label: string,
  options?: Partial<Pick<DividerOptions, "label">>,
): HTMLElement {
  return createDivider({ label, ...options });
}

/** Create a section divider with extra spacing */
export function sectionDivider(
  label?: string,
  spacing = 24,
): HTMLElement {
  return createDivider({
    label,
    style: "solid",
    margin: `${spacing}px 0`,
    thickness: 1,
  });
}
