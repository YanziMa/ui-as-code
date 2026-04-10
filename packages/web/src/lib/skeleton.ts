/**
 * Skeleton Loading States: Shimmer animation, text/heading/avatar/card/table
 * skeleton variants, configurable dimensions, pulse mode, accessibility.
 */

// --- Types ---

export interface SkeletonOptions {
  /** Width (CSS value) */
  width?: string | number;
  /** Height (CSS value) */
  height?: string | number;
  /** Border radius */
  borderRadius?: string;
  /** Animation type: 'shimmer' or 'pulse' */
  variant?: "shimmer" | "pulse";
  /** Shimmer direction */
  direction?: "left" | "right";
  /** Base color (default: #f0f0f0) */
  baseColor?: string;
  /** Highlight color (default: #e8e8e8) */
  highlightColor?: string;
  /** Animation speed in seconds (default: 1.5) */
  speed?: number;
  /** Custom CSS class */
  className?: string;
  /** Number of lines for text skeleton */
  lines?: number;
  /** Last line width ratio (0-1, default: 0.7) */
  lastLineWidth?: number;
}

export interface SkeletonTextOptions extends SkeletonOptions {
  /** Number of text lines to render */
  lines?: number;
  /** Line height in px (default: 16) */
  lineHeight?: number;
  /** Gap between lines in px (default: 8) */
  gap?: number;
  /** Whether last line is shorter */
  randomizeWidths?: boolean;
}

export interface SkeletonAvatarOptions {
  /** Size in px (default: 40) */
  size?: number | string;
  /** Shape: 'circle' or 'square' or 'rounded' */
  shape?: "circle" | "square" | "rounded";
}

export interface SkeletonCardOptions {
  /** Show avatar/image area */
  hasImage?: boolean;
  /** Image area height (default: 160px) */
  imageHeight?: number;
  /** Number of title lines (default: 1) */
  titleLines?: number;
  /** Number of description lines (default: 3) */
  descriptionLines?: number;
  /** Show action buttons at bottom */
  hasActions?: boolean;
  /** Card padding (default: 16) */
  padding?: number;
}

export interface SkeletonTableOptions {
  /** Number of rows (default: 5) */
  rows?: number;
  /** Number of columns (default: 4) */
  columns?: number;
  /** Show header row */
  showHeader?: boolean;
  /** Cell height (default: 40) */
  cellHeight?: number;
  /** Include checkbox column */
  hasCheckbox?: boolean;
}

// --- CSS Injection ---

let stylesInjected = false;

function injectSkeletonStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.id = "skeleton-styles";
  style.textContent = `
    .sk-root { position: relative; overflow: hidden; background: #f0f0f0; }
    .sk-shimmer {
      position: absolute; inset: 0;
      background: linear-gradient(90deg,
        transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
      background-size: 200% 100%;
      animation: sk-shimmer 1.5s infinite;
    }
    @keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .sk-pulse {
      position: absolute; inset: 0;
      animation: sk-pulse 1.5s ease-in-out infinite;
      background: rgba(255,255,255,0.3);
    }
    @keyframes sk-pulse {
      0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
    }
    .sk-sr-only {
      position:absolute;width:1px;height:1px;padding:0;margin:-1px;
      overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Core Skeleton Element ---

/**
 * Create a single skeleton element with shimmer/pulse animation.
 */
export function createSkeleton(options: SkeletonOptions = {}): HTMLElement {
  injectSkeletonStyles();

  const opts = {
    width: options.width ?? "100%",
    height: options.height ?? "20px",
    borderRadius: options.borderRadius ?? "6px",
    variant: options.variant ?? "shimmer",
    baseColor: options.baseColor ?? "#f0f0f0",
    highlightColor: options.highlightColor ?? "#e8e8e8",
    speed: options.speed ?? 1.5,
    className: options.className ?? "",
  };

  const el = document.createElement("div");
  el.className = `sk-root ${opts.className}`;
  el.setAttribute("role", "status");
  el.setAttribute("aria-label", "Loading");
  el.setAttribute("aria-busy", "true");
  el.style.cssText = `
    width: ${typeof opts.width === "number" ? `${opts.width}px` : opts.width};
    height: ${typeof opts.height === "number" ? `${opts.height}px` : opts.height};
    border-radius: ${opts.borderRadius};
    background: ${opts.baseColor};
  `;

  // Animation overlay
  const anim = document.createElement("div");
  anim.className = opts.variant === "shimmer" ? "sk-shimmer" : "sk-pulse";
  if (opts.variant === "shimmer") {
    anim.style.animationDuration = `${opts.speed}s`;
  }
  el.appendChild(anim);

  return el;
}

// --- Text Skeleton ---

/**
 * Create a multi-line text skeleton placeholder.
 */
export function createTextSkeleton(options: SkeletonTextOptions = {}): HTMLElement {
  const opts = {
    lines: options.lines ?? 3,
    lineHeight: options.lineHeight ?? 16,
    gap: options.gap ?? 8,
    lastLineWidth: options.lastLineWidth ?? 0.7,
    randomizeWidths: options.randomizeWidths ?? false,
  };

  const container = document.createElement("div");
  container.className = "sk-text-group";
  container.style.cssText = "display:flex;flex-direction:column;gap:" + `${opts.gap}px`;

  for (let i = 0; i < opts.lines; i++) {
    const isLast = i === opts.lines - 1 && opts.lines > 1;
    let widthPercent = 100;
    if (isLast) widthPercent = Math.round(opts.lastLineWidth * 100);
    else if (opts.randomizeWidths) {
      widthPercent = 60 + Math.round(Math.random() * 35);
    }

    const line = createSkeleton({
      width: `${widthPercent}%`,
      height: `${opts.lineHeight}px`,
      ...options,
    });
    container.appendChild(line);
  }

  return container;
}

// --- Heading Skeleton ---

/**
 * Create a heading-style skeleton (single bold line).
 */
export function createHeadingSkeleton(width?: string | number, height = 24): HTMLElement {
  return createSkeleton({
    width: width ?? "60%",
    height: `${height}px`,
    borderRadius: "4px",
  });
}

// --- Avatar Skeleton ---

/**
 * Create an avatar-shaped skeleton.
 */
export function createAvatarSkeleton(options: SkeletonAvatarOptions = {}): HTMLElement {
  const size = options.size ?? 40;
  const shape = options.shape ?? "circle";

  const radiusMap: Record<string, string> = {
    circle: "50%",
    square: "4px",
    rounded: "12px",
  };

  return createSkeleton({
    width: typeof size === "number" ? `${size}px` : size,
    height: typeof size === "number" ? `${size}px` : size,
    borderRadius: radiusMap[shape],
  });
}

// --- Card Skeleton ---

/**
 * Create a full card skeleton with optional image, title, description, and actions.
 */
export function createCardSkeleton(options: SkeletonCardOptions = {}): HTMLElement {
  const opts = {
    hasImage: options.hasImage ?? true,
    imageHeight: options.imageHeight ?? 160,
    titleLines: options.titleLines ?? 1,
    descriptionLines: options.descriptionLines ?? 3,
    hasActions: options.hasActions ?? true,
    padding: options.padding ?? 16,
  };

  const card = document.createElement("div");
  card.className = "sk-card";
  card.style.cssText = `
    background:#fff;border-radius:12px;overflow:hidden;
    border:1px solid #eee;width:320px;
  `;

  // Image area
  if (opts.hasImage) {
    const imgArea = createSkeleton({
      width: "100%",
      height: `${opts.imageHeight}px`,
      borderRadius: "0",
    });
    card.appendChild(imgArea);
  }

  // Content
  const content = document.createElement("div");
  content.style.cssText = `padding:${opts.padding}px;display:flex;flex-direction:column;gap:10px;`;

  // Title
  content.appendChild(createTextSkeleton({ lines: opts.titleLines, lineHeight: 18, lastLineWidth: 0.55 }));

  // Description
  if (opts.descriptionLines > 0) {
    content.appendChild(createTextSkeleton({ lines: opts.descriptionLines, lineHeight: 14 }));
  }

  card.appendChild(content);

  // Actions
  if (opts.hasActions) {
    const actions = document.createElement("div");
    actions.style.cssText = `padding:12px ${opts.padding}px ${opts.padding + 2}px;display:flex;gap:8px;`;
    actions.appendChild(createSkeleton({ width: 80, height: 32, borderRadius: "8px" }));
    actions.appendChild(createSkeleton({ width: 60, height: 32, borderRadius: "8px" }));
    card.appendChild(actions);
  }

  return card;
}

// --- Table Skeleton ---

/**
 * Create a table skeleton with header and body rows.
 */
export function createTableSkeleton(options: SkeletonTableOptions = {}): HTMLElement {
  const opts = {
    rows: options.rows ?? 5,
    columns: options.columns ?? 4,
    showHeader: options.showHeader ?? true,
    cellHeight: options.cellHeight ?? 40,
    hasCheckbox: options.hasCheckbox ?? false,
  };

  const table = document.createElement("div");
  table.className = "sk-table";
  table.style.cssText = `
    display:flex;flex-direction:column;gap:1px;background:#f0f0f0;
    border-radius:8px;overflow:hidden;width:100%;max-width:700px;
  `;

  const totalCols = opts.columns + (opts.hasCheckbox ? 1 : 0);

  // Header row
  if (opts.showHeader) {
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;gap:1px;background:#f0f0f0;";
    for (let c = 0; c < totalCols; c++) {
      const cell = createSkeleton({
        width: c === 0 && opts.hasCheckbox ? 24 : undefined,
        height: 14,
        borderRadius: "2px",
        variant: "pulse",
      });
      cell.style.flex = c === 0 && opts.hasCheckbox ? "none" : "1";
      cell.style.margin = "10px 12px";
      headerRow.appendChild(cell);
    }
    table.appendChild(headerRow);
  }

  // Body rows
  for (let r = 0; r < opts.rows; r++) {
    const row = document.createElement("div");
    row.className = "sk-table-row";
    row.style.cssText = "display:flex;gap:1px;background:#fff;";

    for (let c = 0; c < totalCols; c++) {
      const cell = document.createElement("div");
      cell.style.cssText = `flex:1;padding:0 12px;display:flex;align-items:center;min-height:${opts.cellHeight}px;`;

      if (c === 0 && opts.hasCheckbox) {
        cell.style.flex = "none";
        cell.style.width = "24px";
        cell.appendChild(createSkeleton({ width: 16, height: 16, borderRadius: "3px" }));
      } else {
        // Randomize widths for visual variety
        const w = 50 + Math.round(Math.random() * 45);
        cell.appendChild(createSkeleton({ width: `${w}%`, height: 14, borderRadius: "3px" }));
      }

      row.appendChild(cell);
    }

    table.appendChild(row);
  }

  return table;
}

// --- Batch Skeleton Wrapper ---

/**
 * Replace an element's children with a skeleton, then restore original content.
 * Useful for async data loading patterns.
 */
export function wrapWithSkeleton(
  target: HTMLElement,
  skeletonFactory: () => HTMLElement,
  delay = 0,
): { restore: () => void; isRestored: () => boolean } {
  const originalChildren = Array.from(target.childNodes);
  let restored = false;

  // Inject skeleton
  target.innerHTML = "";
  const skeleton = skeletonFactory();
  target.appendChild(skeleton);

  const restore = (): void => {
    if (restored) return;
    restored = true;
    target.innerHTML = "";
    for (const child of originalChildren) {
      target.appendChild(child.cloneNode(true));
    }
  };

  // Auto-restore after delay (for simulating loading)
  if (delay > 0) {
    setTimeout(restore, delay);
  }

  return { restore, isRestored: () => restored };
}
