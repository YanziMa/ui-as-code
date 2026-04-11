/**
 * Rating Group: Aggregated rating display with individual rating bars,
 * average calculation, distribution histogram, rating breakdown by category,
 * read-only summary mode, and statistics.
 */

// --- Types ---

export interface RatingEntry {
  /** Rater identifier */
  id: string;
  /** Rater name/display */
  name: string;
  /** Avatar URL */
  avatar?: string;
  /** Rating value (usually 1-5) */
  value: number;
  /** Max possible value (default: 5) */
  max?: number;
  /** Review/comment text */
  review?: string;
  /** Date of rating */
  date?: Date | string;
  /** Category tag */
  category?: string;
  /** Helpful count */
  helpful?: number;
}

export interface RatingGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Rating entries */
  ratings: RatingEntry[];
  /** Max rating value (default: 5) */
  maxValue?: number;
  /** Show individual bars? */
  showBars?: boolean;
  /** Show average summary? */
  showAverage?: boolean;
  /** Show distribution histogram? */
  showDistribution?: boolean;
  /** Bar size variant */
  barSize?: "sm" | "md" | "lg";
  /** Color for filled portion */
  fillColor?: string;
  /** Color for empty portion */
  emptyColor?: string;
  /** Star icon or use dots? */
  iconStyle?: "star" | "dot" | "number";
  /** Sort order: "date-desc" | "date-asc" | "rating-desc" | "rating-asc" | "name" */
  sortOrder?: string;
  /** Group by category? */
  groupByCategory?: boolean;
  /** Show review text preview? */
  showReview?: boolean;
  /** Max reviews to display (0 = all) */
  maxReviews?: number;
  /** Custom render per entry */
  renderItem?: (entry: RatingEntry, barEl: HTMLElement) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RatingGroupInstance {
  element: HTMLElement;
  /** Get computed average */
  getAverage: () => number;
  /** Get total count */
  getCount: () => number;
  /** Get distribution array */
  getDistribution: () => number[];
  /** Set new ratings */
  setRatings: (ratings: RatingEntry[]) => void;
  /** Add a rating */
  addRating: (rating: RatingEntry) => void;
  /** Sort ratings */
  sort: (order: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function starIcon(filled: boolean, size: number = 14): string {
  if (filled) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l-5 4.87 1.18 6.88L12 2z"/></svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l-5 4.87 1.18 6.88L12 2z"/></svg>`;
}

function dotIcon(filled: boolean, size: number = 10): string {
  const color = filled ? "#fff" : "none";
  const bg = filled ? "#f59e0b" : "#e5e7eb";
  return `<span style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:1px solid #d1d5db;display:inline-flex;align-items:center;justify-content:center;color:${color};font-size:${Math.floor(size * 0.7)}px;"></span>`;
}

// --- Main Factory ---

export function createRatingGroup(options: RatingGroupOptions): RatingGroupInstance {
  const opts = {
    maxValue: options.maxValue ?? 5,
    showBars: options.showBars ?? true,
    showAverage: options.showAverage ?? true,
    showDistribution: options.showDistribution ?? true,
    barSize: options.barSize ?? "md",
    fillColor: options.fillColor ?? "#f59e0b",
    emptyColor: options.emptyColor ?? "#e5e7eb",
    iconStyle: options.iconStyle ?? "star",
    sortOrder: options.sortOrder ?? "date-desc",
    groupByCategory: options.groupByCategory ?? false,
    showReview: options.showReview ?? false,
    maxReviews: options.maxReviews ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RatingGroup: container not found");

  container.className = `rating-group ${opts.className}`;
  container.style.cssText = `font-family:-apple-system,sans-serif;color:#374151;`;

  let ratings = [...opts.ratings];
  let destroyed = false;

  function sortRatings(order: string): void {
    switch (order) {
      case "date-desc":
        ratings.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
        break;
      case "date-asc":
        ratings.sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
        break;
      case "rating-desc":
        ratings.sort((a, b) => b.value - a.value);
        break;
      case "rating-asc":
        ratings.sort((a, b) => a.value - b.value);
        break;
      case "name":
        ratings.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        break;
    }
  }

  // Initial sort
  sortRatings(opts.sortOrder);

  // Limit
  const displayRatings = opts.maxReviews > 0 ? ratings.slice(0, opts.maxReviews) : ratings;

  function render(): void {
    container.innerHTML = "";

    // Average summary
    if (opts.showAverage && ratings.length > 0) {
      const avg = avg(ratings.map((r) => r.value));
      const summary = document.createElement("div");
      summary.className = "rg-summary";
      summary.style.cssText = `
        display:flex;align-items:center;gap:12px;padding:14px 18px;margin-bottom:16px;
        background:#fffbf8;border-radius:10px;border:1px solid #fef3c7;
      `;

      // Average stars
      const avgStars = document.createElement("div");
      avgStars.style.cssText = "display:flex;gap:1px;";
      for (let i = 1; i <= opts.maxValue; i++) {
        const star = document.createElement("span");
        star.innerHTML = starIcon(i <= Math.round(avg), 18);
        avgStars.appendChild(star);
      }
      summary.appendChild(avgStars);

      // Average number
      const avgNum = document.createElement("span");
      avgNum.textContent = avg.toFixed(1);
      avgNum.style.cssText = `font-size:20px;font-weight:700;color:#b45309;margin-left:4px;`;
      summary.appendChild(avgNum);

      // Total count
      const totalCount = document.createElement("span");
      totalCount.textContent = `(${ratings.length})`;
      totalCount.style.cssText = `font-size:13px;color:#9ca3af;margin-left:4px;`;
      summary.appendChild(totalCount);

      container.appendChild(summary);
    }

    // Distribution histogram
    if (opts.showDistribution && ratings.length > 0) {
      const dist = document.createElement("div");
      dist.className = "rg-distribution";
      dist.style.cssText = "margin-bottom:16px;";

      const counts = new Array(opts.maxValue + 1).fill(0);
      for (const r of ratings) {
        const v = Math.min(Math.round(r.value), opts.maxValue);
        counts[v]++;
      }
      const maxCount = Math.max(...counts);

      const histRow = document.createElement("div");
      histRow.style.cssText = "display:flex;align-items:flex-end;gap:2px;height:60px;";

      for (let i = 1; i <= opts.maxValue; i++) {
        const pct = maxCount > 0 ? counts[i] / maxCount : 0;
        const h = Math.max(2, pct * 50);
        const bar = document.createElement("div");
        bar.style.cssText = `width:20px;background:${opts.fillColor};opacity:${0.15 + pct * 0.85};border-radius:2px;`;
        bar.style.height = `${h}px`;

        const lbl = document.createElement("span");
        lbl.textContent = String(i);
        lbl.style.cssText = `font-size:10px;color:#9ca3af;text-align:center;width:16px;`;

        const col = document.createElement("div");
        col.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;";
        col.appendChild(bar);
        col.appendChild(lbl);
        histRow.appendChild(col);
      }

      dist.appendChild(histRow);
      container.appendChild(dist);
    }

    // Grouped categories
    const groups = opts.groupByCategory
      ? Array.from(new Set(ratings.map((r) => r.category).filter(Boolean)))
      : [undefined];

    for (const group of groups) {
      if (group) {
        const groupLabel = document.createElement("div");
        groupLabel.textContent = group;
        groupLabel.style.cssText = "font-size:12px;font-weight:600;color:#6b7280;margin:14px 18px 4px;text-transform:uppercase;";
        container.appendChild(groupLabel);
      }

      const groupRatings = group
        ? ratings.filter((r) => r.category === group)
        : displayRatings;

      for (const entry of groupRatings) {
        const row = document.createElement("div");
        row.className = "rg-entry";
        row.style.cssText = `
          display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f9fafb;
        `;

        // Avatar
        if (entry.avatar) {
          const av = document.createElement("img");
          av.src = entry.avatar;
          av.alt = entry.name;
          av.style.cssText = `width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;`;
          row.appendChild(av);
        } else {
          const placeholder = document.createElement("span");
          placeholder.textContent = (entry.name ?? "").charAt(0).toUpperCase();
          placeholder.style.cssText = `width:32px;height:32px;border-radius:50%;background:#eef2ff;color:#4338ca;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;flex-shrink:0;`;
          row.appendChild(placeholder);
        }

        // Info column
        const info = document.createElement("div");
        info.style.cssText = "flex:1;min-width:0;";

        const nameRow = document.createElement("div");
        nameRow.style.cssText = "font-size:13px;font-weight:500;color:#111827;";
        nameRow.textContent = entry.name;
        info.appendChild(nameRow);

        if (entry.review && opts.showReview) {
          const reviewEl = document.createElement("div");
          reviewEl.textContent = entry.review.length > 80 ? entry.review.substring(0, 80) + "..." : entry.review;
          reviewEl.style.cssText = "font-size:11px;color:#9ca3af;margin-top:2px;line-height:1.4;";
          info.appendChild(reviewEl);
        }

        const dateEl = document.createElement("span");
        dateEl.textContent = entry.date instanceof Date
          ? entry.date.toLocaleDateString()
          : String(entry.date ?? "");
        dateEl.style.cssText = "font-size:11px;color:#bbb;margin-left:auto;white-space:nowrap;";
        info.appendChild(dateEl);

        row.appendChild(info);

        // Rating icons/stars/dots
        const ratingEl = document.createElement("div");
        ratingEl.style.cssText = "display:flex;gap:1px;flex-shrink:0;";

        for (let i = 1; i <= opts.maxValue; i++) {
          const icon = document.createElement("span");
          icon.innerHTML = opts.iconStyle === "dot"
            ? dotIcon(i <= entry.value, 10)
            : starIcon(i <= entry.value, 14);
          ratingEl.appendChild(icon);
        }

        row.appendChild(ratingEl);

        // Rating bar
        if (opts.showBars) {
          const barContainer = document.createElement("div");
          barContainer.style.cssText = `width:80px;height:6px;background:${opts.emptyColor};border-radius:3px;overflow:hidden;margin-left:8px;`;

          const fill = document.createElement("div");
          const pct = (entry.value / opts.maxValue) * 100;
          fill.style.cssText = `width:${pct}%;height:100%;background:${opts.fillColor};border-radius:3px;transition:width 0.3s ease;`;
          barContainer.appendChild(fill);
          row.appendChild(barContainer);
        }

        // Custom render hook
        if (opts.renderItem) {
          opts.renderItem(entry, row);
        }

        container.appendChild(row);
      }
    }
  }

  // Initial render
  render();

  const instance: RatingGroupInstance = {
    element: container,

    getAverage() {
      return avg(ratings.map((r) => r.value));
    },

    getCount() { return ratings.length; },

    getDistribution() {
      const counts = new Array(opts.maxValue + 1).fill(0);
      for (const r of ratings) {
        const v = Math.min(Math.round(r.value), opts.maxValue);
        counts[v]++;
      }
      return counts;
    },

    setRatings(newRatings: RatingEntry[]) {
      ratings = newRatings;
      sortRatings(opts.sortOrder);
      render();
    },

    addRating(rating: RatingEntry) {
      ratings.unshift(rating);
      sortRatings(opts.sortOrder);
      render();
    },

    sort(order: string) {
      opts.sortOrder = order;
      sortRatings(order);
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };

  return instance;
}
