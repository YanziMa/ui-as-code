/**
 * Lightweight Skeleton: Shimmer/pulse animation skeleton loaders for async content.
 * Supports text skeleton (multi-line with randomize), heading, avatar, card,
 * table (header+body rows with random widths), and wrapWithSkeleton helper.
 */

// --- Types ---

export type SkeletonVariant = "shimmer" | "pulse";
export type SkeletonSize = "sm" | "md" | "lg";

export interface SkeletonOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Animation variant */
  variant?: SkeletonVariant;
  /** Base color */
  baseColor?: string;
  /** Highlight color */
  highlightColor?: string;
  /** Width (CSS value) */
  width?: string;
  /** Height (CSS value) */
  height?: string;
  /** Border radius */
  borderRadius?: string | number;
  /** Number of lines (for text skeleton) */
  lines?: number;
  /** Custom CSS class */
  className?: string;
}

export interface TextSkeletonOptions extends SkeletonOptions {
  /** Number of text lines to show */
  lines: number;
  /** Last line width ratio (0-1, default: random) */
  lastLineWidth?: number;
}

export interface CardSkeletonOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Show image area? */
  showImage?: boolean;
  /** Image height */
  imageHeight?: string;
  /** Number of title lines */
  titleLines?: number;
  /** Number of description lines */
  descLines?: number;
  /** Show action buttons placeholder? */
  showActions?: boolean;
  /** Variant */
  variant?: SkeletonVariant;
  /** Custom CSS class */
  className?: string;
}

export interface TableSkeletonOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Number of columns */
  columns?: number;
  /** Number of data rows */
  rows?: number;
  /** Show header row? */
  showHeader?: boolean;
  /** Row height */
  rowHeight?: string;
  /** Cell padding */
  cellPadding?: string;
  /** Variant */
  variant?: SkeletonVariant;
  /** Custom CSS class */
  className?: string;
}

// --- Config ---

const DEFAULT_BASE = "#e5e7eb";
const DEFAULT_HIGHLIGHT = "#f3f4f6";

function injectSkeletonStyles(): void {
  if (document.getElementById("skeleton-lite-styles")) return;
  const s = document.createElement("style");
  s.id = "skeleton-lite-styles";
  s.textContent = `
    @keyframes sk-shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
    @keyframes sk-pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    .sk-skeleton{animation-fill-mode:both;}
    .sk-skeleton.sk-shimmer{background:linear-gradient(90deg,${DEFAULT_BASE} 25%,${DEFAULT_HIGHLIGHT} 37%,${DEFAULT_BASE} 63%);background-size:200% 100%;animation:sk-shimmer 1.5s ease-in-out infinite;}
    .sk-skeleton.sk-pulse{background:${DEFAULT_BASE};animation:sk-pulse 1.8s ease-in-out infinite;}
  `;
  document.head.appendChild(s);
}

// --- Base Skeleton ---

export function createSkeleton(options: SkeletonOptions): HTMLElement {
  const opts = {
    variant: options.variant ?? "shimmer",
    baseColor: options.baseColor ?? DEFAULT_BASE,
    highlightColor: options.highlightColor ?? DEFAULT_HIGHLIGHT,
    width: options.width ?? "100%",
    height: options.height ?? "16px",
    borderRadius: options.borderRadius ?? 4,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Skeleton: container not found");

  injectSkeletonStyles();

  const el = document.createElement("div");
  el.className = `sk-skeleton sk-${opts.variant} ${opts.className}`;
  el.style.cssText = `
    width:${opts.width};height:${opts.height};
    border-radius:${typeof opts.borderRadius === "number" ? `${opts.borderRadius}px` : opts.borderRadius};
  `;
  container.appendChild(el);

  return el;
}

// --- Text Skeleton ---

export function createTextSkeleton(options: TextSkeletonOptions): HTMLElement {
  const opts = {
    lines: options.lines,
    lastLineWidth: options.lastLineWidth,
    variant: options.variant ?? "shimmer",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TextSkeleton: container not found");

  injectSkeletonStyles();

  const wrapper = document.createElement("div");
  wrapper.className = `sk-text-skeleton ${opts.className ?? ""}`;
  wrapper.style.cssText = "display:flex;flex-direction:column;gap:8px;";

  for (let i = 0; i < opts.lines; i++) {
    const isLast = i === opts.lines - 1 && opts.lines > 1;
    const w = isLast
      ? (opts.lastLineWidth != null ? `${opts.lastLineWidth * 100}%` : `${60 + Math.random() * 30}%`)
      : "100%";

    const line = document.createElement("div");
    line.className = `sk-skeleton sk-${opts.variant}`;
    line.style.cssText = `height:14px;border-radius:4px;width:${w};`;
    wrapper.appendChild(line);
  }

  container.appendChild(wrapper);
  return wrapper;
}

// --- Heading Skeleton ---

export function createHeadingSkeleton(options: SkeletonOptions): HTMLElement {
  const hOpts = { ...options, height: options.height ?? "24px", width: options.width ?? "40%" };
  return createSkeleton(hOpts);
}

// --- Avatar Skeleton ---

export function createAvatarSkeleton(options: SkeletonOptions): HTMLElement {
  const size = options.width ?? options.height ?? "40px";
  const aOpts = { ...options, width: size, height: size, borderRadius: options.borderRadius ?? "50%" };
  return createSkeleton(aOpts);
}

// --- Card Skeleton ---

export function createCardSkeleton(options: CardSkeletonOptions): HTMLElement {
  const opts = {
    showImage: options.showImage ?? true,
    imageHeight: options.imageHeight ?? "160px",
    titleLines: options.titleLines ?? 1,
    descLines: options.descLines ?? 3,
    showActions: options.showActions ?? true,
    variant: options.variant ?? "shimmer",
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CardSkeleton: container not found");

  injectSkeletonStyles();

  const card = document.createElement("div");
  card.className = `sk-card-skeleton ${opts.className}`;
  card.style.cssText = `
    border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;
    background:#fff;font-family:-apple-system,sans-serif;
  `;

  // Image area
  if (opts.showImage) {
    const imgArea = document.createElement("div");
    imgArea.className = `sk-skeleton sk-${opts.variant}`;
    imgArea.style.cssText = `width:100%;height:${opts.imageHeight};border-radius:0;`;
    card.appendChild(imgArea);
  }

  // Body
  const body = document.createElement("div");
  body.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:10px;";

  // Title lines
  for (let i = 0; i < opts.titleLines; i++) {
    const t = document.createElement("div");
    t.className = `sk-skeleton sk-${opts.variant}`;
    t.style.cssText = `height:16px;border-radius:4px;width:${i === 0 ? "60%" : "40%"};`;
    body.appendChild(t);
  }

  // Description lines
  for (let i = 0; i < opts.descLines; i++) {
    const d = document.createElement("div");
    d.className = `sk-skeleton sk-${opts.variant}`;
    d.style.cssText = `height:12px;border-radius:4px;width:${i === opts.descLines - 1 ? `${70 + Math.random() * 20}%` : "100%"};`;
    body.appendChild(d);
  }

  card.appendChild(body);

  // Actions
  if (opts.showActions) {
    const actions = document.createElement("div");
    actions.style.cssText = "padding:0 16px 16px;display:flex;gap:10px;";
    for (let i = 0; i < 2; i++) {
      const btn = document.createElement("div");
      btn.className = `sk-skeleton sk-${opts.variant}`;
      btn.style.cssText = `height:32px;border-radius:6px;width:${i === 0 ? "80px" : "60px"};`;
      actions.appendChild(btn);
    }
    card.appendChild(actions);
  }

  container.appendChild(card);
  return card;
}

// --- Table Skeleton ---

export function createTableSkeleton(options: TableSkeletonOptions): HTMLElement {
  const opts = {
    columns: options.columns ?? 5,
    rows: options.rows ?? 5,
    showHeader: options.showHeader ?? true,
    rowHeight: options.rowHeight ?? "40px",
    cellPadding: options.cellPadding ?? "14px",
    variant: options.variant ?? "shimmer",
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TableSkeleton: container not found");

  injectSkeletonStyles();

  const table = document.createElement("div");
  table.className = `sk-table-skeleton ${opts.className}`;
  table.style.cssText = `
    border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;
    font-family:-apple-system,sans-serif;background:#fff;
  `;

  // Header row
  if (opts.showHeader) {
    const headerRow = document.createElement("div");
    headerRow.style.cssText = `display:flex;background:#f9fafb;border-bottom:1px solid #e5e7eb;height:${opts.rowHeight};`;
    for (let c = 0; c < opts.columns; c++) {
      const th = document.createElement("div");
      th.className = `sk-skeleton sk-${opts.variant}`;
      th.style.cssText = `flex:1;margin:${opts.cellPadding};height:12px;border-radius:4px;width:${70 + Math.random() * 20}%;`;
      headerRow.appendChild(th);
    }
    table.appendChild(headerRow);
  }

  // Data rows
  for (let r = 0; r < opts.rows; r++) {
    const row = document.createElement("div");
    row.style.cssText = `display:flex;border-bottom:1px solid #f3f4f6;height:${opts.rowHeight};align-items:center;`;
    for (let c = 0; c < opts.columns; c++) {
      const td = document.createElement("div");
      td.className = `sk-skeleton sk-${opts.variant}`;
      td.style.cssText = `flex:1;margin:${opts.cellPadding};height:12px;border-radius:4px;width:${c === 0 ? "60%" : `${50 + Math.random() * 35}%`};`;
      row.appendChild(td);
    }
    table.appendChild(row);
  }

  container.appendChild(table);
  return table;
}

// --- Helper: wrap an element with a skeleton that auto-hides ---

export function wrapWithSkeleton(
  targetEl: HTMLElement,
  loading: boolean,
  skeletonOptions?: Omit<SkeletonOptions, "container">,
): () => void {
  const parent = targetEl.parentElement;
  if (!parent) return () => {};

  let skeletonEl: HTMLElement | null = null;

  function update(): void {
    if (loading) {
      targetEl.style.display = "none";
      if (!skeletonEl) {
        const placeholder = document.createElement("div");
        placeholder.style.display = "";
        parent.insertBefore(placeholder, targetEl);
        skeletonEl = createSkeleton({ container: placeholder, ...(skeletonOptions ?? {}) });
      }
    } else {
      targetEl.style.display = "";
      if (skeletonEl) {
        skeletonEl.parentElement?.remove();
        skeletonEl = null;
      }
    }
  }

  update();
  return update;
}
