/**
 * Tag Cloud: Interactive tag/keyword cloud with weighted sizing,
 * color coding by category, hover animations, click filtering,
 * count badges, and flexible layout modes.
 */

// --- Types ---

export interface TagCloudTag {
  /** Tag text */
  text: string;
  /** Weight/frequency (1-100) */
  weight: number;
  /** Category group */
  category?: string;
  /** Color override */
  color?: string;
  /** Background color override */
  bgColor?: string;
  /** Count/occurrence number */
  count?: number;
  /** Click handler */
  onClick?: (tag: TagCloudTag, event: MouseEvent) => void;
  /** URL link */
  url?: string;
  /** Custom data payload */
  data?: unknown;
}

export type TagCloudLayout = "flow" | "grid" | "flex" | "spiral";
export type TagCloudSort = "none" | "alpha" | "weight" | "count" | "random";

export interface TagCloudOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Tags to display */
  tags: TagCloudTag[];
  /** Layout mode */
  layout?: TagCloudLayout;
  /** Sort order */
  sort?: TagCloudSort;
  /** Min font size (px) */
  minSize?: number;
  /** Max font size (px) */
  maxSize?: number;
  /** Category color map */
  categoryColors?: Record<string, string>;
  /** Default color palette */
  colors?: string[];
  /** Show count badges? */
  showCount?: boolean;
  /** Show category indicators? */
  showCategory?: boolean;
  /** Tag border radius (px) */
  borderRadius?: number;
  /** Gap between tags (px) */
  gap?: number;
  /** Max width before wrapping (px) */
  maxWidth?: number;
  /** Hover scale effect (1 = no effect) */
  hoverScale?: number;
  /** Animation on mount? */
  animate?: boolean;
  /** Stagger delay between tags (ms) */
  staggerDelay?: number;
  /** Active/selected tag highlight */
  activeColor?: string;
  /** Active background */
  activeBg?: string;
  /** Custom CSS class */
  className?: string;
}

export interface TagCloudInstance {
  element: HTMLElement;
  /** Update tags */
  setTags: (tags: TagCloudTag[]) => void;
  /** Get current tags */
  getTags: () => TagCloudTag[];
  /** Filter by category */
  filterByCategory: (category: string | null) => void;
  /** Clear selection */
  clearFilter: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_PALETTE = [
  "#dbeafe", "#fce7f3", "#fef3c7", "#d1fae5", "#ede9fe",
  "#ffedd5", "#e0e7ff", "#fecdd3", "#ccfbf1", "#fef9c3",
];

const DEFAULT_TEXT_COLORS = [
  "#1e40af", "#be185d", "#b45309", "#047857", "#5b21b6",
  "#c2410c", "#3730a3", "#be123c", "#0f766e", "#a16207",
];

// --- Helpers ---

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// --- Main Factory ---

export function createTagCloud(options: TagCloudOptions): TagCloudInstance {
  const opts = {
    layout: options.layout ?? "flow",
    sort: options.sort ?? "none",
    minSize: options.minSize ?? 11,
    maxSize: options.maxSize ?? 28,
    categoryColors: options.categoryColors ?? {},
    colors: options.colors ?? DEFAULT_PALETTE,
    showCount: options.showCount ?? false,
    showCategory: options.showCategory ?? false,
    borderRadius: options.borderRadius ?? 9999,
    gap: options.gap ?? 6,
    maxWidth: options.maxWidth ?? 600,
    hoverScale: options.hoverScale ?? 1.08,
    animate: options.animate ?? true,
    staggerDelay: options.staggerDelay ?? 25,
    activeColor: options.activeColor ?? "#fff",
    activeBg: options.activeBg ?? "#4338ca",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TagCloud: container not found");

  let tags = [...options.tags];
  let activeFilter: string | null = null;
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `tag-cloud tc-${opts.layout} ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-wrap:wrap;gap:${opts.gap}px;
    max-width:${opts.maxWidth}px;line-height:1.4;
    font-family:-apple-system,sans-serif;padding:4px;
  `;
  container.appendChild(root);

  // --- Sorting ---

  function applySorting(arr: TagCloudTag[]): TagCloudTag[] {
    switch (opts.sort) {
      case "alpha": return [...arr].sort((a, b) => a.text.localeCompare(b.text));
      case "weight": return [...arr].sort((a, b) => b.weight - a.weight);
      case "count": return [...arr].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
      case "random": return [...arr].sort(() => Math.random() - 0.5);
      default: return arr;
    }
  }

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";

    const sorted = applySorting(tags);
    const maxWeight = Math.max(...sorted.map(t => t.weight), 1);
    const categories = new Set(sorted.filter(t => t.category).map(t => t.category!));

    for (let i = 0; i < sorted.length; i++) {
      const tag = sorted[i]!;

      // Skip filtered-out tags
      if (activeFilter && tag.category !== activeFilter) continue;

      const normalized = maxWeight > 0 ? Math.min(tag.weight / maxWeight, 1) : 0.5;
      const fontSize = opts.minSize + normalized * (opts.maxSize - opts.minSize);

      // Determine colors
      let bg = tag.bgColor;
      let textColor = tag.color;
      if (!bg || !textColor) {
        const catIdx = tag.category
          ? Array.from(categories).indexOf(tag.category)
          : i;
        bg = bg ?? opts.colors[catIdx % opts.colors.length];
        textColor = textColor ?? DEFAULT_TEXT_COLORS[catIdx % DEFAULT_TEXT_COLORS.length];
        if (opts.categoryColors[tag.category ?? ""]) {
          bg = opts.categoryColors[tag.category ?? ""];
        }
      }

      const isActive = activeFilter === tag.category;

      const el = document.createElement("button");
      el.type = "button";
      el.className = "tc-tag";
      el.style.cssText = `
        display:inline-flex;align-items:center;gap:4px;
        padding:4px 12px;border-radius:${opts.borderRadius}px;
        background:${isActive ? opts.activeBg : bg};
        color:${isActive ? opts.activeColor : textColor};
        font-size:${fontSize}px;font-weight:${Math.round(500 + normalized * 300)};
        border:1px solid ${isActive ? opts.activeBg : "transparent"};
        cursor:pointer;white-space:nowrap;transition:all 0.2s ease;
        transform:scale(${opts.animate ? 0 : 1});opacity:${opts.animate ? 0 : 1};
        user-select:none;-webkit-user-select:none;
      `;

      // Tag text
      const textSpan = document.createElement("span");
      textSpan.className = "tc-text";
      textSpan.textContent = tag.text;
      el.appendChild(textSpan);

      // Count badge
      if (opts.showCount && tag.count !== undefined) {
        const countBadge = document.createElement("span");
        countBadge.className = "tc-count";
        countBadge.style.cssText = `
          font-size:${Math.max(9, fontSize * 0.65)}px;font-weight:600;
          opacity:0.7;background:rgba(0,0,0,0.06);padding:0 5px;
          border-radius:9999px;
        `;
        countBadge.textContent = String(tag.count);
        el.appendChild(countBadge);
      }

      // Category dot
      if (opts.showCategory && tag.category) {
        const dot = document.createElement("span");
        dot.style.cssText = `
          width:6px;height:6px;border-radius:50%;
          background:${opts.categoryColors[tag.category] ?? "#9ca3af"};
          flex-shrink:0;
        `;
        el.appendChild(dot);
      }

      // Events
      el.addEventListener("mouseenter", () => {
        el.style.transform = `scale(${opts.hoverScale})`;
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        el.style.boxShadow = "";
      });
      el.addEventListener("click", (e) => {
        if (tag.url) window.open(tag.url, "_blank");
        tag.onClick?.(tag, e as MouseEvent);
      });

      root.appendChild(el);

      // Animate in
      if (opts.animate) {
        setTimeout(() => {
          el.style.transition = "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease";
          el.style.transform = "scale(1)";
          el.style.opacity = "1";
        }, i * opts.staggerDelay);
      }
    }
  }

  // Initial render
  render();

  // --- Instance ---

  const instance: TagCloudInstance = {
    element: root,

    getTags() { return [...tags]; },

    setTags(newTags: TagCloudTag[]) {
      tags = [...newTags];
      activeFilter = null;
      render();
    },

    filterByCategory(category: string | null) {
      activeFilter = category;
      render();
    },

    clearFilter() {
      activeFilter = null;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
