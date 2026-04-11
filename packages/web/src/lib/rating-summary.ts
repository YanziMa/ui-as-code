/**
 * Rating Summary: Aggregate rating display with distribution bars,
 * individual rating breakdown, average calculation, star histogram,
 * review count, and filterable rating list.
 */

// --- Types ---

export interface RatingEntry {
  /** User identifier */
  userId: string;
  /** User name */
  userName?: string;
  /** User avatar URL */
  userAvatar?: string;
  /** Rating value (1-5 or custom scale) */
  value: number;
  /** Review text */
  review?: string;
  /** Review title */
  title?: string;
  /** ISO date string */
  date: string;
  /** Helpful count */
  helpful?: number;
  /** Verified purchase? */
  verified?: boolean;
}

export interface RatingSummaryOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** All rating entries */
  ratings: RatingEntry[];
  /** Maximum rating value (default: 5) */
  maxRating?: number;
  /** Show distribution bars? */
  showDistribution?: boolean;
  /** Show individual reviews? */
  showReviews?: boolean;
  /** Show average prominently? */
  showAverage?: boolean;
  /** Star size in px (for distribution) */
  starSize?: number;
  /** Color for filled stars */
  activeColor?: string;
  /** Color for empty stars */
  inactiveColor?: string;
  /** Bar background color */
  barBgColor?: string;
  /** Bar fill color */
  barColor?: string;
  /** Sort reviews by: "recent" | "helpful" | "rating" */
  sortBy?: "recent" | "helpful" | "rating";
  /** Max reviews to show (0 = all) */
  maxReviews?: number;
  /** Show "read more" expand for long reviews? */
  expandLongReviews?: boolean;
  /** Truncate review length before expanding */
  truncateLength?: number;
  /** Custom CSS class */
  className?: string;
}

export interface RatingSummaryInstance {
  element: HTMLElement;
  /** Get computed average */
  getAverage: () => number;
  /** Get total count */
  getTotalCount: () => number;
  /** Get distribution (array of counts per star level) */
  getDistribution: () => number[];
  /** Set new ratings data */
  setRatings: (ratings: RatingEntry[]) => void;
  /** Filter by minimum rating */
  filterByMinRating: (min: number) => void;
  /** Clear filter */
  clearFilter: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function calculateAverage(ratings: RatingEntry[], maxRating: number): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + Math.min(r.value, maxRating), 0);
  return sum / ratings.length;
}

function calculateDistribution(ratings: RatingEntry[], maxRating: number): number[] {
  const dist = new Array(maxRating).fill(0);
  for (const r of ratings) {
    const idx = Math.max(0, Math.min(Math.round(r.value) - 1, maxRating - 1));
    dist[idx]++;
  }
  return dist; // Index 0 = 1-star, index 4 = 5-star
}

function renderStars(count: number, max: number, size: number, activeColor: string, inactiveColor: string): string {
  let html = "";
  for (let i = 0; i < max; i++) {
    const filled = i < Math.round(count);
    html += `<span style="color:${filled ? activeColor : inactiveColor};font-size:${size}px;line-height:1;">&#9733;</span>`;
  }
  return html;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// --- Main Factory ---

export function createRatingSummary(options: RatingSummaryOptions): RatingSummaryInstance {
  const opts = {
    maxRating: options.maxRating ?? 5,
    showDistribution: options.showDistribution ?? true,
    showReviews: options.showReviews ?? true,
    showAverage: options.showAverage ?? true,
    starSize: options.starSize ?? 14,
    activeColor: options.activeColor ?? "#f59e0b",
    inactiveColor: options.inactiveColor ?? "#d1d5db",
    barBgColor: options.barBgColor ?? "#e5e7eb",
    barColor: options.barColor ?? "#f59e0b",
    sortBy: options.sortBy ?? "recent",
    maxReviews: options.maxReviews ?? 10,
    expandLongReviews: options.expandLongReviews ?? true,
    truncateLength: options.truncateLength ?? 200,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RatingSummary: container not found");

  let allRatings = [...options.ratings];
  let minFilter = 0;
  let destroyed = false;

  function getFiltered(): RatingEntry[] {
    let filtered = allRatings;
    if (minFilter > 0) {
      filtered = filtered.filter((r) => r.value >= minFilter);
    }

    // Sort
    switch (opts.sortBy) {
      case "recent":
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "helpful":
        filtered.sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0));
        break;
      case "rating":
        filtered.sort((a, b) => b.value - a.value);
        break;
    }

    if (opts.maxReviews > 0) {
      filtered = filtered.slice(0, opts.maxReviews);
    }

    return filtered;
  }

  function render(): void {
    container.innerHTML = "";
    container.className = `rating-summary ${opts.className}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    `;

    const avg = calculateAverage(allRatings, opts.maxRating);
    const total = allRatings.length;
    const dist = calculateDistribution(allRatings, opts.maxRating);

    // Header: Average + Total count
    if (opts.showAverage || total > 0) {
      const header = document.createElement("div");
      header.className = "rs-header";
      header.style.cssText = "display:flex;align-items:center;gap:16px;margin-bottom:16px;";

      if (opts.showAverage) {
        // Big average number
        const avgBlock = document.createElement("div");
        avgBlock.style.cssText = "display:flex;flex-direction:column;align-items:center;";

        const avgNum = document.createElement("span");
        avgNum.textContent = avg.toFixed(1);
        avgNum.style.cssText = `font-size:36px;font-weight:700;color:#111827;line-height:1;`;

        const starsEl = document.createElement("span");
        starsEl.innerHTML = renderStars(avg, opts.maxRating, opts.starSize + 2, opts.activeColor, opts.inactiveColor);
        starsEl.style.cssText = "margin-top:2px;";

        const totalEl = document.createElement("span");
        totalEl.textContent = `${total} ${total === 1 ? "review" : "reviews"}`;
        totalEl.style.cssText = "font-size:12px;color:#6b7280;margin-top:2px;";

        avgBlock.appendChild(avgNum);
        avgBlock.appendChild(starsEl);
        avgBlock.appendChild(totalEl);
        header.appendChild(avgBlock);
      }

      container.appendChild(header);
    }

    // Distribution bars
    if (opts.showDistribution && opts.maxRating > 0) {
      const distSection = document.createElement("div");
      distSection.className = "rs-distribution";
      distSection.style.cssText = "display:flex;flex-direction:column;gap:4px;max-width:280px;margin-bottom:16px;";

      const maxCount = Math.max(...dist, 1);

      for (let star = opts.maxRating; star >= 1; star--) {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;";

        // Star label + count
        const label = document.createElement("span");
        label.innerHTML = `<span style="color:${opts.activeColor};font-size:${opts.starSize}px;">&#9733;</span> ${star}`;
        label.style.cssText = "width:40px;text-align:right;font-size:12px;font-weight:500;flex-shrink:0;";
        row.appendChild(label);

        // Bar
        const barOuter = document.createElement("div");
        barOuter.style.cssText = `flex:1;height:8px;background:${opts.barBgColor};border-radius:4px;overflow:hidden;`;

        const count = dist[star - 1]!;
        const pct = (count / maxCount) * 100;

        const barFill = document.createElement("div");
        barFill.style.cssText = `height:100%;width:${pct}%;background:${opts.barColor};border-radius:4px;transition:width 0.3s ease;`;
        barFill.title = `${count} ${count === 1 ? "review" : "reviews"}`;

        barOuter.appendChild(barFill);
        row.appendChild(barOuter);

        // Count text
        const countLabel = document.createElement("span");
        countLabel.textContent = String(count);
        countLabel.style.cssText = "width:28px;font-size:12px;color:#6b7280;text-align:right;flex-shrink:0;";
        row.appendChild(countLabel);

        distSection.appendChild(row);
      }

      container.appendChild(distSection);
    }

    // Individual reviews
    if (opts.showReviews) {
      const reviews = getFiltered();

      if (reviews.length === 0 && allRatings.length > 0) {
        const noResults = document.createElement("div");
        noResults.textContent = `No reviews matching ${minFilter}+ stars`;
        noResults.style.cssText = "padding:12px;text-align:center;color:#9ca3af;";
        container.appendChild(noResults);
      } else if (reviews.length > 0) {
        const reviewsList = document.createElement("div");
        reviewsList.className = "rs-reviews";
        reviewsList.style.cssText = "display:flex;flex-direction:column;gap:12px;";

        for (const entry of reviews) {
          const card = document.createElement("div");
          card.className = "rs-review-card";
          card.style.cssText = `
            padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;
            transition:box-shadow 0.15s;
          `;

          // Top row: user info + rating + date
          const topRow = document.createElement("div");
          topRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;";

          const userInfo = document.createElement("div");
          userInfo.style.cssText = "display:flex;align-items:center;gap:8px;";

          if (entry.userAvatar) {
            const avatar = document.createElement("img");
            avatar.src = entry.userAvatar;
            avatar.style.cssText = "width:32px;height:32px;border-radius:50%;object-fit:cover;";
            userInfo.appendChild(avatar);
          } else {
            const avatarPlaceholder = document.createElement("span");
            avatarPlaceholder.style.cssText = `
              width:32px;height:32px;border-radius:50%;background:#eef2ff;color:#4338ca;
              display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;
              flex-shrink:0;
            `;
            avatarPlaceholder.textContent = (entry.userName ?? entry.userId).charAt(0).toUpperCase();
            userInfo.appendChild(avatarPlaceholder);
          }

          const nameEl = document.createElement("span");
          nameEl.textContent = entry.userName ?? `User ${entry.userId.slice(0, 6)}`;
          nameEl.style.cssText = "font-weight:600;font-size:13px;";
          userInfo.appendChild(nameEl);

          topRow.appendChild(userInfo);

          const rightSide = document.createElement("div");
          rightSide.style.cssText = "display:flex;align-items:center;gap:8px;";

          const stars = document.createElement("span");
          stars.innerHTML = renderStars(entry.value, opts.maxRating, opts.starSize, opts.activeColor, opts.inactiveColor);
          rightSide.appendChild(stars);

          const dateEl = document.createElement("span");
          dateEl.textContent = timeAgo(entry.date);
          dateEl.style.cssText = "font-size:11px;color:#9ca3af;white-space:nowrap;";
          rightSide.appendChild(dateEl);

          topRow.appendChild(rightSide);
          card.appendChild(topRow);

          // Title
          if (entry.title) {
            const titleEl = document.createElement("div");
            titleEl.textContent = entry.title;
            titleEl.style.cssText = "font-weight:600;font-size:14px;margin-bottom:4px;";
            card.appendChild(titleEl);
          }

          // Review text
          if (entry.review) {
            const reviewEl = document.createElement("div");
            reviewEl.className = "rs-review-text";
            const needsTruncation = entry.review.length > opts.truncateLength;

            if (needsTruncation && opts.expandLongReviews) {
              reviewEl.textContent = entry.review.slice(0, opts.truncateLength) + "...";

              const readMore = document.createElement("button");
              readMore.type = "button";
              readMore.textContent = "Read more";
              readMore.style.cssText = `
                background:none;border:none;color:#4338ca;cursor:pointer;
                font-size:12px;padding:2px 0;margin-top:4px;
              `;
              readMore.addEventListener("click", () => {
                reviewEl.textContent = entry.review;
                readMore.remove();
              });
              reviewEl.appendChild(readMore);
            } else {
              reviewEl.textContent = entry.review;
            }

            reviewEl.style.cssText = "line-height:1.6;color:#4b5563;";
            card.appendChild(reviewEl);
          }

          // Meta row: verified badge, helpful button
          const metaRow = document.createElement("div");
          metaRow.style.cssText = "display:flex;align-items:center;gap:12px;margin-top:8px;";

          if (entry.verified) {
            const verifiedBadge = document.createElement("span");
            verifiedBadge.innerHTML = "&#10003; Verified purchase";
            verifiedBadge.style.cssText = "font-size:11px;color:#16a34a;font-weight:500;";
            metaRow.appendChild(verifiedBadge);
          }

          if (entry.helpful != null) {
            const helpfulBtn = document.createElement("button");
            helpfulBtn.type = "button";
            helpfulBtn.innerHTML = `&#128077; Helpful (${entry.helpful})`;
            helpfulBtn.style.cssText = `
              background:none;border:1px solid #d1d5db;border-radius:4px;
              cursor:pointer;font-size:11px;color:#6b7280;padding:2px 8px;
              transition:all 0.15s;
            `;
            helpfulBtn.addEventListener("click", () => {
              helpfulBtn.style.background = "#ecfdf5";
              helpfulBtn.style.borderColor = "#86efac";
              helpfulBtn.style.color = "#16a34a";
            });
            metaRow.appendChild(helpfulBtn);
          }

          if (metaRow.children.length > 0) card.appendChild(metaRow);

          // Hover effect
          card.addEventListener("mouseenter", () => { card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; });
          card.addEventListener("mouseleave", () => { card.style.boxShadow = ""; });

          reviewsList.appendChild(card);
        }

        container.appendChild(reviewsList);
      }
    }
  }

  // Initial render
  render();

  const instance: RatingSummaryInstance = {
    element: container,

    getAverage() { return calculateAverage(allRatings, opts.maxRating); },
    getTotalCount() { return allRatings.length; },

    getDistribution() { return calculateDistribution(allRatings, opts.maxRating); },

    setRatings(ratings: RatingEntry[]) {
      allRatings = [...ratings];
      minFilter = 0;
      render();
    },

    filterByMinRating(min: number) {
      minFilter = Math.max(1, Math.min(min, opts.maxRating));
      render();
    },

    clearFilter() {
      minFilter = 0;
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };

  return instance;
}
