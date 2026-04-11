/**
 * Skeleton Utilities: Loading skeleton/placeholder screens with shimmer
 * animation, multiple shape variants, customizable dimensions, and
 * accessibility support.
 */

// --- Types ---

export type SkeletonVariant = "text" | "heading" | "avatar" | "image" | "button" | "rect" | "circle";
export type SkeletonSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";

export interface SkeletonOptions {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Size preset */
  size?: SkeletonSize;
  /** Custom width (px or CSS value) */
  width?: number | string;
  /** Custom height (px or CSS value) */
  height?: number | string;
  /** Border radius */
  borderRadius?: string | number;
  /** Shimmer animation speed (s) */
  speed?: number;
  /** Animation color start */
  colorStart?: string;
  /** Animation color end */
  colorEnd?: string;
  /** Number of lines (for text variant) */
  lines?: number;
  /** Custom class name */
  className?: string;
}

export interface SkeletonBlockOptions {
  /** Block layout configuration — array of rows, each row is an array of skeletons */
  blocks: Array<Array<SkeletonOptions>>;
  /** Gap between items (px) */
  gap?: number;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

// --- Size/Variant Defaults ---

const VARIANT_DEFAULTS: Record<SkeletonVariant, { w: string; h: string; br: string }> = {
  "text": { w: "100%", h: "14px", br: "4px" },
  "heading": { w: "60%", h: "22px", br: "6px" },
  "avatar": { w: "40px", h: "40px", br: "50%" },
  "image": { w: "100%", h: "200px", br: "8px" },
  "button": { w: "80px", h: "36px", br: "6px" },
  "rect": { w: "100%", h: "80px", br: "8px" },
  "circle": { w: "48px", h: "48px", br: "50%" },
};

const SIZE_OVERRIDES: Record<SkeletonSize, Partial<{ w: string; h: string }>> = {
  "xs": { w: "24px", h: "16px" },
  "sm": { w: "48px", h: "20px" },
  "md": {},
  "lg": { w: "200px", h: "28px" },
  "xl": { w: "320px", h: "36px" },
  "full": { w: "100%", h: "100%" },
};

// --- Core Factory ---

/**
 * Create a single skeleton placeholder element.
 *
 * @example
 * ```ts
 * // Text line skeleton
 * const skel = createSkeleton({ variant: "text", width: "80%" });
 *
 * // Avatar skeleton
 * const avatarSkel = createSkeleton({ variant: "avatar", size: "lg" });
 *
 * // Multi-line text skeleton
 * const para = createSkeleton({ variant: "text", lines: 4 });
 * ```
 */
export function createSkeleton(options: SkeletonOptions = {}): HTMLElement {
  const {
    variant = "text",
    size,
    width,
    height,
    borderRadius,
    speed = 1.5,
    colorStart = "#f3f4f6",
    colorEnd = "#e5e7eb",
    lines = 1,
    className,
  } = options;

  const base = VARIANT_DEFAULTS[variant];
  const sizeOverride = size ? SIZE_OVERRIDES[size] : {};

  const finalW = width !== undefined ? (typeof width === "number" ? `${width}px` : width)
    : (sizeOverride?.w ?? base.w);
  const finalH = height !== undefined ? (typeof height === "number" ? `${height}px` : height)
    : (sizeOverride?.h ?? base.h);
  const finalBR = borderRadius !== undefined
    ? (typeof borderRadius === "number" ? `${borderRadius}px` : String(borderRadius))
    : base.br;

  if (lines > 1 && variant === "text") {
    // Multi-line text skeleton
    const wrapper = document.createElement("div");
    wrapper.className = `skeleton-text-group ${className ?? ""}`.trim();
    wrapper.style.cssText = "display:flex;flex-direction:column;gap:8px;width:" + finalW + ";";
    wrapper.setAttribute("aria-busy", "true");
    wrapper.setAttribute("aria-label", "Loading content");

    for (let i = 0; i < lines; i++) {
      const line = document.createElement("div");
      line.className = "skeleton-line";
      const isLast = i === lines - 1;
      line.style.cssText =
        `width:${isLast ? "60%" : "100%"};height:${finalH};border-radius:${finalBR};` +
        _shimmerStyle(speed, colorStart, colorEnd);
      wrapper.appendChild(line);
    }

    return wrapper;
  }

  // Single skeleton
  const el = document.createElement("div");
  el.className = `skeleton ${variant} ${className ?? ""}`.trim();
  el.style.cssText =
    `display:inline-block;width:${finalW};height:${finalH};border-radius:${finalBR};` +
    _shimmerStyle(speed, colorStart, colorEnd);
  el.setAttribute("aria-hidden", "true");

  return el;
}

/** Create a complete skeleton block/layout with multiple elements */
export function createSkeletonBlock(options: SkeletonBlockOptions): HTMLElement {
  const { blocks, gap = 16, container, className } = options;

  const wrapper = document.createElement("div");
  wrapper.className = `skeleton-block ${className ?? ""}`.trim();
  wrapper.style.cssText =
    "display:flex;flex-direction:column;gap:" + `${gap}px` + ";";
  wrapper.setAttribute("role", "status");
  wrapper.setAttribute("aria-label", "Loading content");
  wrapper.setAttribute("aria-busy", "true");

  for (const row of blocks) {
    const rowEl = document.createElement("div");
    rowEl.className = "skeleton-row";
    rowEl.style.cssText = "display:flex;gap:" + `${gap / 2}px` + ";align-items:center;";

    for (const itemOpts of row) {
      const skel = createSkeleton(itemOpts);
      rowEl.appendChild(skel);
    }

    wrapper.appendChild(rowEl);
  }

  if (container) container.appendChild(wrapper);

  return wrapper;
}

/** Create a card skeleton (common pattern) */
export function createCardSkeleton(options?: {
  showAvatar?: boolean;
  showHeading?: boolean;
  lines?: number;
  showButton?: boolean;
  width?: string;
}): HTMLElement {
  const {
    showAvatar = true,
    showHeading = true,
    lines = 3,
    showButton = true,
    width = "340px",
  } = options ?? {};

  const card = document.createElement("div");
  card.className = "skeleton-card";
  card.style.cssText =
    `width:${width};padding:20px;border:1px solid #e5e7eb;border-radius:12px;` +
    "background:#fff;display:flex;flex-direction:column;gap:14px;";
  card.setAttribute("aria-busy", "true");

  if (showAvatar || showHeading) {
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.alignItems = "center";
    headerRow.style.gap = "12px";

    if (showAvatar) headerRow.appendChild(createSkeleton({ variant: "avatar" }));
    if (showHeading) headerRow.appendChild(createSkeleton({ variant: "heading", width: "50%" }));

    card.appendChild(headerRow);
  }

  for (let i = 0; i < lines; i++) {
    card.appendChild(createSkeleton({ variant: "text" }));
  }

  if (showButton) {
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.justifyContent = "flex-end";
    btnRow.style.gap = "10px";
    btnRow.style.marginTop = "4px";
    btnRow.appendChild(createSkeleton({ variant: "button" }));
    btnRow.appendChild(createSkeleton({ variant: "button", width: "70px" }));
    card.appendChild(btnRow);
  }

  return card;
}

/** Create a table skeleton */
export function createTableSkeleton(options?: {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  width?: string;
}): HTMLElement {
  const { rows = 5, cols = 4, showHeader = true, width = "100%" } = options ?? {};

  const table = document.createElement("div");
  table.className = "skeleton-table";
  table.style.cssText = `width:${width};overflow:hidden;border:1px solid #e5e7eb;border-radius:8px;background:#fff;`;
  table.setAttribute("aria-busy", "true");

  // Header row
  if (showHeader) {
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.gap = "12px";
    headerRow.style.padding = "12px 16px";
    headerRow.style.borderBottom = "1px solid #f3f4f6";
    headerRow.style.background = "#fafafa";
    for (let c = 0; c < cols; c++) {
      const cell = createSkeleton({ variant: "heading", width: `${100 / cols}%` });
      (cell.style as Record<string, string>).flex = "1";
      headerRow.appendChild(cell);
    }
    table.appendChild(headerRow);
  }

  // Data rows
  for (let r = 0; r < rows; r++) {
    const dataRow = document.createElement("div");
    dataRow.style.display = "flex";
    dataRow.style.gap = "12px";
    dataRow.style.padding = "12px 16px";
    dataRow.style.borderBottom = r < rows - 1 ? "1px solid #f3f4f6" : "";
    for (let c = 0; c < cols; c++) {
      const cell = createSkeleton({
        variant: "text",
        width: c === 0 ? "60%" : c === cols - 1 ? "40%" : "80%",
        height: "14px",
      });
      (cell.style as Record<string, string>).flex = "1";
      dataRow.appendChild(cell);
    }
    table.appendChild(dataRow);
  }

  return table;
}

// --- Shimmer Animation ---

function _shimmerStyle(speed: number, colorStart: string, colorEnd: string): string {
  return `
    background: linear-gradient(90deg, ${colorStart} 25%, ${colorEnd} 37%, ${colorStart} 63%);
    background-size: 400% 100%;
    animation: shimmer ${speed}s ease-in-out infinite;
  `;
}

// Inject keyframe once
if (!document.getElementById("skeleton-keyframes")) {
  const style = document.createElement("style");
  style.id = "skeleton-keyframes";
  style.textContent = "@keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}";
  document.head?.appendChild(style);
}
