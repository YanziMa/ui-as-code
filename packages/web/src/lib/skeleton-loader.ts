/**
 * Skeleton Loader: Animated placeholder loading states with shimmer effect,
 * multiple shape variants (text, circle, rectangle, avatar, card, table),
 * configurable animation speed, pulse/shimmer modes, and responsive sizing.
 */

// --- Types ---

export type SkeletonShape = "text" | "circle" | "rect" | "avatar" | "card" | "table-row" | "custom";
export type SkeletonAnimation = "shimmer" | "pulse" | "none";

export interface SkeletonItem {
  /** Shape type */
  shape: SkeletonShape;
  /** Width (px or % string) */
  width?: string | number;
  /** Height (px) */
  height?: number;
  /** Border radius (px) */
  borderRadius?: number;
  /** Number of lines (for text shape) */
  lines?: number;
  /** Custom CSS */
  customStyle?: string;
}

export interface SkeletonOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Skeleton items to render */
  items?: SkeletonItem[];
  /** Animation type */
  animation?: SkeletonAnimation;
  /** Shimmer direction */
  shimmerDirection?: "left" | "right";
  /** Base color (default: #f3f4f6) */
  baseColor?: string;
  /** Highlight color for shimmer (default: #e5e7eb) */
  highlightColor?: string;
  /** Animation speed in ms (default: 1500) */
  speed?: number;
  /** Border radius default (px) */
  borderRadius?: number;
  /** Gap between items (px) */
  gap?: number;
  /** Show count (number of skeleton cards/rows to repeat) */
  count?: number;
  /** Custom CSS class */
  className?: string;
  /** Callback when skeleton is shown */
  onShow?: () => void;
}

export interface SkeletonInstance {
  element: HTMLElement;
  /** Show the skeleton */
  show: () => void;
  /** Hide the skeleton */
  hide: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update items dynamically */
  setItems: (items: SkeletonItem[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Config ---

const DEFAULT_ITEMS: SkeletonItem[] = [
  { shape: "circle", width: 48, height: 48 },
  { shape: "text", width: "60%", height: 14, lines: 3 },
];

// --- Shimmer Keyframe ---

let shimmerStyleInjected = false;

function injectShimmerStyles(): void {
  if (shimmerStyleInjected) return;
  const style = document.createElement("style");
  style.id = "skeleton-loader-styles";
  style.textContent = `
    @keyframes sk-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sk-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);
  shimmerStyleInjected = true;
}

// --- Shape Renderers ---

function renderShape(item: SkeletonItem, opts: Required<Pick<SkeletonOptions, "baseColor" | "highlightColor" | "speed" | "animation" | "shimmerDirection" | "borderRadius">>): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `sk-item sk-${item.shape}`;

  const w = item.width ?? (item.shape === "text" ? "100%" : 40);
  const h = item.height ?? (item.shape === "text" ? 14 : item.shape === "circle" || item.shape === "avatar" ? 40 : 120);
  const br = item.borderRadius ?? opts.borderRadius;

  // Base styles
  let cssText = `
    display:inline-block;background:${opts.baseColor};
    ${typeof w === "number" ? `width:${w}px;` : `width:${w};`}
    height:${h}px;border-radius:${item.shape === "circle" || item.shape === "avatar" ? "50%" : `${br}px`};
    flex-shrink:0;
  `;

  // Animation
  switch (opts.animation) {
    case "shimmer":
      cssText += `
        background-image:linear-gradient(
          90deg,
          ${opts.baseColor} 0%,
          ${opts.highlightColor} 50%,
          ${opts.baseColor} 100%
        );
        background-size:200% 100%;
        animation:sk-shimmer ${opts.speed}ms infinite linear;
      `;
      break;
    case "pulse":
      cssText += `animation:sk-pulse ${opts.speed * 0.8}ms infinite ease-in-out;`;
      break;
  }

  el.style.cssText = cssText + (item.customStyle ?? "");

  return el;
}

function renderTextLines(item: SkeletonItem, opts: Required<Pick<SkeletonOptions, "baseColor" | "highlightColor" | "speed" | "animation" | "borderRadius">>, gap: number): DocumentFragment {
  const frag = document.createDocumentFragment();
  const lines = item.lines ?? 3;

  for (let i = 0; i < lines; i++) {
    const line = document.createElement("div");
    line.className = "sk-text-line";

    // Last line shorter
    const isLast = i === lines - 1 && lines > 1;
    const w = isLast ? "70%" : (item.width ?? "100%");
    const h = item.height ?? 14;

    line.style.cssText = `
      display:block;width:${typeof w === "number" ? `${w}px` : w};height:${h}px;
      background:${opts.baseColor};border-radius:${opts.borderRadius}px;margin-bottom:${i < lines - 1 ? `${gap}px` : "0"};
    `;

    if (opts.animation === "shimmer") {
      line.style.backgroundImage = `linear-gradient(90deg,${opts.baseColor} 0%,${opts.highlightColor} 50%,${opts.baseColor} 100%)`;
      line.style.backgroundSize = "200% 100%";
      line.style.animation = `sk-shimmer ${opts.speed}ms infinite linear`;
    } else if (opts.animation === "pulse") {
      line.style.animation = `sk-pulse ${opts.speed * 0.8}ms infinite ease-in-out`;
    }

    frag.appendChild(line);
  }

  return frag;
}

function renderCardSkeleton(opts: Required<Pick<SkeletonOptions, "baseColor" | "highlightColor" | "speed" | "animation" | "borderRadius">>, gap: number): HTMLDivElement {
  const card = document.createElement("div");
  card.className = "sk-card";
  card.style.cssText = `
    display:flex;flex-direction:column;gap:${gap}px;padding:16px;
    border:1px solid #e5e7eb;border-radius:12px;background:#fff;
    overflow:hidden;
  `;

  // Header row: avatar + text
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:12px;";
  const avatar = renderShape({ shape: "avatar", width: 40, height: 40 }, opts);
  header.appendChild(avatar);
  const titleLines = renderTextLines({ shape: "text", width: "55%", height: 13, lines: 2 }, opts, 4);
  header.appendChild(titleLines);
  card.appendChild(header);

  // Image placeholder
  const imgPlaceholder = document.createElement("div");
  imgPlaceholder.style.cssText = `width:100%;height:140px;border-radius:8px;background:${opts.baseColor};margin-top:8px;`;
  if (opts.animation === "shimmer") {
    imgPlaceholder.style.backgroundImage = `linear-gradient(90deg,${opts.baseColor} 0%,${opts.highlightColor} 50%,${opts.baseColor} 100%)`;
    imgPlaceholder.style.backgroundSize = "200% 100%";
    imgPlaceholder.style.animation = `sk-shimmer ${opts.speed}ms infinite linear`;
  } else if (opts.animation === "pulse") {
    imgPlaceholder.style.animation = `sk-pulse ${opts.speed * 0.8}ms infinite ease-in-out`;
  }
  card.appendChild(imgPlaceholder);

  // Body text
  const bodyText = renderTextLines({ shape: "text", height: 12, lines: 3 }, opts, 6);
  card.appendChild(bodyText);

  // Footer actions
  const footer = document.createElement("div");
  footer.style.cssText = `display:flex;gap:8px;margin-top:4px;`;
  for (let i = 0; i < 3; i++) {
    const btn = document.createElement("div");
    btn.style.cssText = `width:${i === 0 ? "80" : i === 1 ? "60" : "40"}px;height:24px;border-radius:${opts.borderRadius}px;background:${opts.baseColor};`;
    if (opts.animation === "shimmer") {
      btn.style.backgroundImage = `linear-gradient(90deg,${opts.baseColor} 0%,${opts.highlightColor} 50%,${opts.baseColor} 100%)`;
      btn.style.backgroundSize = "200% 100%";
      btn.style.animation = `sk-shimmer ${opts.speed}ms infinite linear`;
    } else if (opts.animation === "pulse") {
      btn.style.animation = `sk-pulse ${opts.speed * 0.8}ms infinite ease-in-out`;
    }
    footer.appendChild(btn);
  }
  card.appendChild(footer);

  return card;
}

function renderTableRowSkeleton(opts: Required<Pick<SkeletonOptions, "baseColor" | "highlightColor" | "speed" | "animation" | "borderRadius">>): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "sk-table-row";
  row.style.cssText = `
    display:flex;align-items:center;gap:16px;padding:12px 16px;
    border-bottom:1px solid #f0f0f0;
  `;

  // Checkbox placeholder
  const cb = document.createElement("div");
  cb.style.cssText = `width:18px;height:18px;border-radius:4px;background:${opts.baseColor};flex-shrink:0;`;
  if (opts.animation === "shimmer") {
    cb.style.backgroundImage = `linear-gradient(90deg,${opts.baseColor} 0%,${opts.highlightColor} 50%,${opts.baseColor} 100%)`;
    cb.style.backgroundSize = "200% 100%";
    cb.style.animation = `sk-shimmer ${opts.speed}ms infinite linear`;
  }
  row.appendChild(cb);

  // Cell placeholders with varying widths
  const widths = ["30%", "20%", "15%", "15%", "10%"];
  for (const w of widths) {
    const cell = document.createElement("div");
    cell.style.cssText = `width:${w};height:14px;border-radius:${opts.borderRadius}px;background:${opts.baseColor};`;
    if (opts.animation === "shimmer") {
      cell.style.backgroundImage = `linear-gradient(90deg,${opts.baseColor} 0%,${opts.highlightColor} 50%,${opts.baseColor} 100%)`;
      cell.style.backgroundSize = "200% 100%";
      cell.style.animation = `sk-shimmer ${opts.speed}ms infinite linear`;
    } else if (opts.animation === "pulse") {
      cell.style.animation = `sk-pulse ${opts.speed * 0.8}ms infinite ease-in-out`;
    }
    row.appendChild(cell);
  }

  return row;
}

// --- Main Factory ---

export function createSkeleton(options: SkeletonOptions): SkeletonInstance {
  injectShimmerStyles();

  const opts = {
    animation: options.animation ?? "shimmer",
    shimmerDirection: options.shimmerDirection ?? "right",
    baseColor: options.baseColor ?? "#f3f4f6",
    highlightColor: options.highlightColor ?? "#e5e7eb",
    speed: options.speed ?? 1500,
    borderRadius: options.borderRadius ?? 4,
    gap: options.gap ?? 8,
    count: options.count ?? 1,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SkeletonLoader: container not found");

  container.className = `skeleton-loader ${opts.className}`;
  container.style.cssText = "display:flex;flex-direction:column;gap:" + opts.gap + "px;";

  let visible = false;
  let destroyed = false;

  function render(): void {
    container.innerHTML = "";

    const items = opts.items?.length ? opts.items : DEFAULT_ITEMS;

    for (let c = 0; c < opts.count; c++) {
      for (const item of items) {
        switch (item.shape) {
          case "text":
            container.appendChild(renderTextLines(item, opts, opts.gap));
            break;

          case "card":
            container.appendChild(renderCardSkeleton(opts, opts.gap));
            break;

          case "table-row":
            container.appendChild(renderTableRowSkeleton(opts));
            break;

          default:
            container.appendChild(renderShape(item, opts));
            break;
        }
      }
    }
  }

  const instance: SkeletonInstance = {
    element: container,

    show() {
      if (visible) return;
      visible = true;
      render();
      container.style.display = "";
      opts.onShow?.();
    },

    hide() {
      if (!visible) return;
      visible = false;
      container.style.display = "none";
    },

    isVisible: () => visible,

    setItems(items: SkeletonItem[]) {
      opts.items = items;
      if (visible) render();
    },

    destroy() {
      destroyed = true;
      visible = false;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
