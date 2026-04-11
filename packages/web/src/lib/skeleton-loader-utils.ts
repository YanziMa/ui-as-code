/**
 * Skeleton Loader Utilities: Configurable skeleton screen placeholders
 * for content loading states, with preset shapes (text, avatar, image,
 * card, table, list), animation variants, and programmatic control.
 */

// --- Types ---

export type SkeletonVariant = "default" | "rounded" | "circular";
export type SkeletonAnimation = "pulse" | "shimmer" | "wave" | "none";

export interface SkeletonBlockOptions {
  /** Width (CSS value) */
  width?: string;
  /** Height (CSS value) */
  height?: string;
  /** Border radius variant */
  variant?: SkeletonVariant;
  /** Animation style */
  animation?: SkeletonAnimation;
  /** Base color */
  baseColor?: string;
  /** Highlight color */
  highlightColor?: string;
  /** Custom class name */
  className?: string;
}

export interface SkeletonTextOptions extends SkeletonBlockOptions {
  /** Number of lines */
  lines?: number;
  /** Last line width ratio (0-1) */
  lastLineWidth?: number;
  /** Line height in px */
  lineHeight?: number;
  /** Gap between lines (px) */
  gap?: number;
}

export interface SkeletonAvatarOptions extends SkeletonBlockOptions {
  /** Size in px */
  size?: number;
  /** Shape: circle or rounded square */
  shape?: "circle" | "rounded";
}

export interface SkeletonImageOptions extends SkeletonBlockOptions {
  /** Width (CSS value) */
  width?: string;
  /** Height (CSS value) */
  height?: string;
  /** Aspect ratio fallback */
  aspectRatio?: string;
}

export interface SkeletonCardOptions {
  /** Show image placeholder? */
  hasImage?: boolean;
  /** Image area height */
  imageHeight?: string;
  /** Number of text lines in body */
  textLines?: number;
  /** Show action button placeholder? */
  hasAction?: boolean;
  /** Card width */
  cardWidth?: string;
  /** Animation */
  animation?: SkeletonAnimation;
  /** Custom class name */
  className?: string;
}

export interface SkeletonTableOptions {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Header row? */
  showHeader?: boolean;
  /** Row height (px) */
  rowHeight?: number;
  /** Animation */
  animation?: SkeletonAnimation;
  /** Custom class name */
  className?: string;
}

export interface SkeletonListOptions {
  /** Number of items */
  items?: number;
  /** Avatar size (px) */
  avatarSize?: number;
  /** Text lines per item */
  textLines?: number;
  /** Animation */
  animation?: SkeletonAnimation;
  /** Custom class name */
  className?: string;
}

// --- Core Factory ---

/**
 * Create a single skeleton block/placeholder element.
 *
 * @example
 * ```ts
 * const block = createSkeletonBlock({ width: "200px", height: "16px", animation: "shimmer" });
 * container.appendChild(block);
 * ```
 */
export function createSkeletonBlock(options: SkeletonBlockOptions = {}): HTMLElement {
  const {
    width = "100%",
    height = "16px",
    variant = "default",
    animation = "pulse",
    baseColor = "#f3f4f6",
    highlightColor = "#e5e7eb",
    className,
  } = options;

  const el = document.createElement("div");
  el.className = `skeleton-block ${variant} ${animation} ${className ?? ""}`.trim();
  el.style.cssText =
    `width:${width};height:${height};` +
    `background:${baseColor};` +
    (variant === "circular" ? "border-radius:50%;" :
      variant === "rounded" ? "border-radius:8px;" :
        "border-radius:4px;") +
    getAnimationStyle(animation, baseColor, highlightColor);

  return el;
}

/**
 * Create skeleton text lines (multi-line text placeholder).
 *
 * @example
 * ```ts
 * const text = createSkeletonText({ lines: 4, lastLineWidth: 0.6 });
 * container.appendChild(text);
 * ```
 */
export function createSkeletonText(options: SkeletonTextOptions = {}): HTMLElement {
  const {
    lines = 3,
    lastLineWidth = 1,
    lineHeight = 14,
    gap = 8,
    ...blockOpts
  } = options;

  const wrapper = document.createElement("div");
  wrapper.className = "skeleton-text";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.gap = `${gap}px`;

  for (let i = 0; i < lines; i++) {
    const isLast = i === lines - 1 && lines > 1;
    const w = isLast ? `${lastLineWidth * 100}%` : "100%";
    const line = createSkeletonBlock({ ...blockOpts, width: w, height: `${lineHeight}px`, variant: "default" });
    wrapper.appendChild(line);
  }

  return wrapper;
}

/**
 * Create a skeleton avatar placeholder.
 *
 * @example
 * ```ts
 * const avatar = createSkeletonAvatar({ size: 40, shape: "circle" });
 * ```
 */
export function createSkeletonAvatar(options: SkeletonAvatarOptions = {}): HTMLElement {
  const { size = 40, shape = "circle", ...blockOpts } = options;

  const el = createSkeletonBlock({
    ...blockOpts,
    width: `${size}px`,
    height: `${size}px`,
    variant: shape === "circle" ? "circular" : "rounded",
  });

  return el;
}

/**
 * Create a skeleton image placeholder.
 *
 * @example
 * ```ts
 * const img = createSkeletonImage({ width: "100%", height: "200px" });
 * ```
 */
export function createSkeletonImage(options: SkeletonImageOptions = {}): HTMLElement {
  const { width = "100%", height = "200px", ...blockOpts } = options;

  return createSkeletonBlock({ ...blockOpts, width, height, variant: "rounded" });
}

/**
 * Create a full card-shaped skeleton loader.
 *
 * @example
 * ```ts
 * const card = createSkeletonCard({ hasImage: true, textLines: 3, hasAction: true });
 * container.appendChild(card);
 * ```
 */
export function createSkeletonCard(options: SkeletonCardOptions = {}): HTMLElement {
  const {
    hasImage = false,
    imageHeight = "160px",
    textLines = 3,
    hasAction = false,
    cardWidth = "320px",
    animation = "shimmer",
    className,
  } = options;

  const card = document.createElement("div");
  card.className = `skeleton-card ${className ?? ""}`.trim();
  card.style.cssText =
    `width:${cardWidth};border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;` +
    "background:#fff;display:flex;flex-direction:column;";

  if (hasImage) {
    card.appendChild(createSkeletonImage({ width: "100%", height: imageHeight, animation }));
  }

  const body = document.createElement("div");
  body.style.padding = "16px";
  body.style.display = "flex";
  body.style.flexDirection = "column";
  body.style.gap = "10px";
  body.appendChild(createSkeletonText({ lines: textLines, animation }));

  if (hasAction) {
    body.appendChild(createSkeletonBlock({
      width: "80px",
      height: "32px",
      variant: "rounded",
      animation,
    }));
  }

  card.appendChild(body);
  return card;
}

/**
 * Create a skeleton table placeholder.
 *
 * @example
 * ```ts
 * const table = createSkeletonTable({ rows: 8, columns: 5, showHeader: true });
 * container.appendChild(table);
 * ```
 */
export function createSkeletonTable(options: SkeletonTableOptions = {}): HTMLElement {
  const {
    rows = 5,
    columns = 4,
    showHeader = true,
    rowHeight = 44,
    animation = "shimmer",
    className,
  } = options;

  const table = document.createElement("div");
  table.className = `skeleton-table ${className ?? ""}`.trim();
  table.style.width = "100%";
  table.style.border = "1px solid #e5e7eb";
  table.style.borderRadius = "8px";
  table.style.overflow = "hidden";

  // Header row
  if (showHeader) {
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.gap = "1px";
    headerRow.style.background = "#f9fafb";
    headerRow.style.padding = "10px 0";

    for (let c = 0; c < columns; c++) {
      const cell = createSkeletonBlock({
        width: `${100 / columns}%`,
        height: "14px",
        variant: "default",
        animation: "none",
        baseColor: "#e5e7eb",
        highlightColor: "#d1d5db",
      });
      cell.style.margin = "0 12px";
      headerRow.appendChild(cell);
    }
    table.appendChild(headerRow);
  }

  // Data rows
  for (let r = 0; r < rows; r++) {
    const dataRow = document.createElement("div");
    dataRow.style.display = "flex";
    dataRow.style.gap = "1px";
    dataRow.style.borderTop = "1px solid #f3f4f6";
    dataRow.style.padding = `${(rowHeight - 14) / 2}px 0`;

    for (let c = 0; c < columns; c++) {
      const cell = createSkeletonBlock({
        width: `${100 / columns}%`,
        height: "12px",
        variant: "default",
        animation,
      });
      cell.style.margin = "0 12px";
      dataRow.appendChild(cell);
    }
    table.appendChild(dataRow);
  }

  return table;
}

/**
 * Create a skeleton list (avatar + text items).
 *
 * @example
 * ```ts
 * const list = createSkeletonList({ items: 6, avatarSize: 36, textLines: 2 });
 * container.appendChild(list);
 * ```
 */
export function createSkeletonList(options: SkeletonListOptions = {}): HTMLElement {
  const {
    items = 5,
    avatarSize = 36,
    textLines = 2,
    animation = "shimmer",
    className,
  } = options;

  const list = document.createElement("div");
  list.className = `skeleton-list ${className ?? ""}`.trim();
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "14px";

  for (let i = 0; i < items; i++) {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "12px";

    item.appendChild(createSkeletonAvatar({ size: avatarSize, animation }));
    item.appendChild(createSkeletonText({ lines: textLines, lineHeight: 13, gap: 6, animation }));

    list.appendChild(item);
  }

  return list;
}

// --- Animation Helpers ---

function getAnimationStyle(
  anim: SkeletonAnimation,
  baseColor: string,
  highlightColor: string,
): string {
  switch (anim) {
    case "pulse":
      return "animation:skeleton-pulse 1.5s ease-in-out infinite;";
    case "shimmer":
      return `
        background:linear-gradient(90deg,${baseColor} 25%,${highlightColor} 37%,${baseColor} 63%);
        background-size:200% 100%;
        animation:skeleton-shimmer 1.5s ease-in-out infinite;
      `;
    case "wave":
      return `
        background:linear-gradient(90deg,transparent,${highlightColor},transparent);
        background-size:200% 100%;
        animation:skeleton-shimmer 1.5s ease-in-out infinite;
      `;
    default:
      return "";
  }
}

/** Inject global keyframes if not already present */
export function injectSkeletonStyles(): void {
  if (document.getElementById("skeleton-styles")) return;

  const style = document.createElement("style");
  style.id = "skeleton-styles";
  style.textContent = `
    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}
