/**
 * Tag Cloud: Weighted tag visualization with size mapping, color coding,
 * layout modes (flow/grid/spiral), hover effects, click handling,
 * category filtering, and animation.
 */

// --- Types ---

export interface CloudTag {
  /** Display text */
  text: string;
  /** Weight value (determines size) */
  weight: number;
  /** Category for grouping */
  category?: string;
  /** Custom color */
  color?: string;
  /** URL link */
  href?: string;
  /** Click handler */
  onClick?: (tag: CloudTag) => void;
}

export type CloudLayout = "flow" | "grid" | "spiral";
export type CloudSort = "none" | "alpha" | "weight-desc" | "weight-asc";

export interface TagCloudOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Tags to render */
  tags: CloudTag[];
  /** Layout mode */
  layout?: CloudLayout;
  /** Sort order */
  sort?: CloudSort;
  /** Minimum font size (px) */
  minFontSize?: number;
  /** Maximum font size (px) */
  maxFontSize?: number;
  /** Color palette (cycled by index) */
  colors?: string[];
  /** Show weight as tooltip? */
  showWeight?: boolean;
  /** Hover scale factor */
  hoverScale?: number;
  /** Click to filter? */
  clickFilter?: boolean;
  /** Animation on mount? */
  animate?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface TagCloudInstance {
  element: HTMLElement;
  setTags: (tags: CloudTag[]) => void;
  getTags: () => CloudTag[];
  setActiveCategory: (cat: string | null) => void;
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_COLORS = [
  "#4f46e5", "#7c3aed", "#db2777", "#e11d48", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

// --- Main Factory ---

export function createTagCloud(options: TagCloudOptions): TagCloudInstance {
  const opts = {
    layout: options.layout ?? "flow",
    sort: options.sort ?? "weight-desc",
    minFontSize: options.minFontSize ?? 11,
    maxFontSize: options.maxFontSize ?? 32,
    colors: options.colors ?? DEFAULT_COLORS,
    showWeight: options.showWeight ?? false,
    hoverScale: options.hoverScale ?? 1.15,
    clickFilter: options.clickFilter ?? false,
    animate: options.animate ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TagCloud: container not found");

  let tags = [...options.tags];
  let activeCategory: string | null = null;
  let destroyed = false;

  const root = document.createElement("div");
  root.className = `tag-cloud cloud-${opts.layout} ${opts.className}`;
  root.style.cssText = `
    display:${opts.layout === "grid" ? "grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;" : "flex;flex-wrap:wrap;gap:8px;align-items:center;"}
    padding:12px;font-family:-apple-system,sans-serif;line-height:1.4;
  `;
  container.appendChild(root);

  function getSorted(): CloudTag[] {
    let arr = [...tags];
    switch (opts.sort) {
      case "alpha":       arr.sort((a, b) => a.text.localeCompare(b.text)); break;
      case "weight-desc": arr.sort((a, b) => b.weight - a.weight); break;
      case "weight-asc":  arr.sort((a, b) => a.weight - b.weight); break;
    }
    return arr;
  }

  function getMaxWeight(): number {
    const vals = tags.map((t) => t.weight);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }

  function fontSizeFor(weight: number): number {
    const maxW = getMaxWeight();
    if (maxW === 0) return opts.minFontSize;
    const ratio = Math.min(weight / maxW, 1);
    return opts.minFontSize + ratio * (opts.maxFontSize - opts.minFontSize);
  }

  function render(): void {
    root.innerHTML = "";

    const sorted = getSorted();

    for (let i = 0; i < sorted.length; i++) {
      const tag = sorted[i]!;
      if (activeCategory && tag.category !== activeCategory) continue;

      const fs = fontSizeFor(tag.weight);
      const color = tag.color ?? opts.colors[i % opts.colors.length];

      const el = document.createElement(tag.href ? "a" : "span");
      el.className = "cloud-tag";
      if (tag.href) (el as HTMLAnchorElement).href = tag.href;

      el.style.cssText = `
        display:inline-block;padding:2px 8px;border-radius:6px;
        color:${color};font-size:${fs}px;font-weight:${Math.round(500 + (fs / opts.maxFontSize) * 300)};
        cursor:pointer;white-space:nowrap;transition:transform 0.2s ease,color 0.15s;
        ${opts.animate ? "opacity:0;transform:scale(0.8);" : ""}
        user-select:none;
      `;

      el.textContent = tag.text;

      if (opts.showWeight && tag.weight !== undefined) {
        el.title = `${tag.text}: weight=${tag.weight}`;
      }

      // Hover
      el.addEventListener("mouseenter", () => {
        el.style.transform = `scale(${opts.hoverScale})`;
        el.style.color = darkenColor(color, 30);
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
        el.style.color = color;
      });

      // Click
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (opts.clickFilter && tag.category) {
          setActiveCategory(activeCategory === tag.category ? null : tag.category);
        }
        tag.onClick?.(tag);
      });

      root.appendChild(el);

      // Animate in
      if (opts.animate) {
        setTimeout(() => {
          el.style.transition = "opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)";
          el.style.opacity = "1";
          el.style.transform = "scale(1)";
        }, i * 30);
      }
    }
  }

  function darkenColor(hex: string, amount: number): string {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = Math.max(0, parseInt(h.slice(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(h.slice(2, 4), 16) - amount);
    const b = Math.max(0, parseInt(h.slice(4, 6), 16) - amount);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  render();

  return {
    element: root,

    setTags(newTags: CloudTag[]) {
      tags = [...newTags];
      activeCategory = null;
      render();
    },

    getTags() { return [...tags]; },

    setActiveCategory(cat: string | null) {
      activeCategory = cat;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };
}
