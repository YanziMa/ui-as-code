/**
 * Review Utilities: Product/user review card with star rating, author info,
 * verified badge, date formatting, helpful voting, image gallery, expandable
 * text, and review list with sorting/filtering.
 */

// --- Types ---

export interface ReviewAuthor {
  /** Author name */
  name: string;
  /** Avatar URL or element */
  avatar?: string | HTMLElement;
  /** Verified purchaser? */
  verified?: boolean;
  /** Role/title */
  title?: string;
}

export interface ReviewMedia {
  /** Media type */
  type: "image" | "video";
  /** URL or src */
  src: string;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Alt text */
  alt?: string;
}

export interface Review {
  /** Unique ID */
  id: string;
  /** Author info */
  author: ReviewAuthor;
  /** Rating (1-5) */
  rating: number;
  /** Review title */
  title?: string;
  /** Review body text */
  body: string;
  /** Date of review (ISO string or timestamp) */
  date: string | number;
  /** Helpful count */
  helpful?: number;
  /** Whether current user marked as helpful */
  isHelpful?: boolean;
  /** Attached media */
  media?: ReviewMedia[];
  /** Response from merchant/author */
  response?: { author: string; body: string; date: string };
  /** Custom data */
  data?: unknown;
}

export interface ReviewCardOptions {
  /** The review data */
  review: Review;
  /** Max body length before truncation (0 = no truncate). Default 300 */
  maxBodyLength?: number;
  /** "Read more" text */
  readMoreText?: string;
  /** Show media gallery? */
  showMedia?: boolean;
  /** Show response section? */
  showResponse?: boolean;
  /** Show helpful buttons? */
  showHelpful?: boolean;
  /** Called when helpful toggled */
  onHelpfulToggle?: (reviewId: string, helpful: boolean) => void;
  /** Star color */
  starColor?: string;
  /** Empty star color */
  emptyStarColor?: string;
  /** Custom class */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface ReviewCardInstance {
  /** The root element */
  el: HTMLElement;
  /** Update review data */
  updateReview: (review: Partial<Review>) => void;
  /** Destroy */
  destroy: () => void;
}

export interface ReviewListOptions {
  /** All reviews */
  reviews: Review[];
  /** Sort order */
  sort?: "newest" | "oldest" | "highest" | "lowest" | "helpful";
  /** Filter by minimum rating */
  minRating?: number;
  /** Only show reviews with photos? */
  withPhotosOnly?: boolean;
  /** Search query filter */
  searchQuery?: string;
  /** Reviews per page */
  perPage?: number;
  /** Show summary stats? */
  showSummary?: boolean;
  /** Custom renderer for each review card */
  renderCard?: (review: Review) => HTMLElement;
  /** Called when sort changes */
  onSortChange?: (sort: string) => void;
  /** Custom class */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface ReviewListInstance {
  /** Root element */
  el: HTMLElement;
  /** Get filtered/sorted reviews */
  getDisplayedReviews: () => Review[];
  /** Set sort order */
  setSort: (sort: ReviewListOptions["sort"]) => void;
  /** Set search filter */
  setSearch: (query: string) => void;
  /** Set min rating filter */
  setMinRating: (rating: number) => void;
  /** Get average rating */
  getAverageRating: () => number;
  /** Get total count */
  getTotalCount: () => number;
  /** Get rating distribution */
  getDistribution: () => Record<number, number>;
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

function formatDate(dateInput: string | number): string {
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Today";
  if (diffDays < 2) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function renderStars(rating: number, size: number = 14, activeColor = "#fbbf24", inactiveColor = "#d1d5db"): string {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating);
    html += `<span style="color:${filled ? activeColor : inactiveColor};font-size:${size}px;">${filled ? "&#9733;" : "&#9734;"}</span>`;
  }
  return html;
}

function truncateText(text: string, maxLength: number): string {
  if (maxLength <= 0 || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

// --- Single Review Card ---

export function createReviewCard(options: ReviewCardOptions): ReviewCardInstance {
  const {
    review,
    maxBodyLength = 300,
    readMoreText = "Read more",
    showMedia = true,
    showResponse = true,
    showHelpful = true,
    onHelpfulToggle,
    starColor = "#fbbf24",
    emptyStarColor = "#d1d5db",
    className,
    container,
  } = options;

  const root = document.createElement("div");
  root.className = `review-card ${className ?? ""}`.trim();
  root.style.cssText =
    "background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;" +
    "font-family:-apple-system,sans-serif;font-size:14px;line-height:1.5;color:#374151;";

  // Header: Avatar + Name + Stars + Date
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;";

  // Avatar
  const avatarSize = 36;
  const avatarEl = document.createElement("div");
  avatarEl.style.cssText =
    `width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;flex-shrink:0;` +
    "background:#e5e7eb;display:flex;align-items:center;justify-content:center;" +
    "font-size:14px;font-weight:600;color:#6b7280;overflow:hidden;";
  if (review.author.avatar) {
    if (typeof review.author.avatar === "string") {
      avatarEl.innerHTML = `<img src="${review.author.avatar}" style="width:100%;height:100%;object-fit:cover;" alt="${review.author.name}" />`;
    } else {
      avatarEl.appendChild(review.author.avatar.cloneNode(true));
    }
  } else {
    avatarEl.textContent = review.author.name.charAt(0).toUpperCase();
  }
  header.appendChild(avatarEl);

  // Info column
  const infoCol = document.createElement("div");
  infoCol.style.flex = "1";

  const nameRow = document.createElement("div");
  nameRow.style.display = "flex";
  nameRow.style.alignItems = "center";
  nameRow.style.gap = "6px";

  const nameEl = document.createElement("strong");
  nameEl.textContent = review.author.name;
  nameEl.style.fontSize = "14px";
  nameRow.appendChild(nameEl);

  if (review.author.verified) {
    const badge = document.createElement("span");
    badge.textContent = "Verified";
    badge.style.cssText =
      "font-size:11px;font-weight:500;background:#ecfdf5;color:#059669;padding:1px 6px;" +
      "border-radius:4px;";
    nameRow.appendChild(badge);
  }

  if (review.author.title) {
    const titleEl = document.createElement("span");
    titleEl.textContent = review.author.title;
    titleEl.style.cssText = "font-size:12px;color:#9ca3af;margin-left:auto;";
    nameRow.appendChild(titleEl);
  }

  infoCol.appendChild(nameRow);

  // Stars + Date row
  const metaRow = document.createElement("div");
  metaRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:2px;";
  metaRow.innerHTML =
    `<span style="display:flex;gap:1px;">${renderStars(review.rating, 13, starColor, emptyStarColor)}</span>` +
    `<span style="font-size:12px;color:#9ca3af;">${formatDate(review.date)}</span>`;
  infoCol.appendChild(metaRow);

  header.appendChild(infoCol);
  root.appendChild(header);

  // Title
  if (review.title) {
    const titleEl = document.createElement("h4");
    titleEl.textContent = review.title;
    titleEl.style.cssText = "margin:8px 0 4px;font-size:15px;font-weight:600;color:#111827;";
    root.appendChild(titleEl);
  }

  // Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "review-body";
  const needsTruncation = maxBodyLength > 0 && review.body.length > maxBodyLength;

  bodyEl.innerHTML = needsTruncation
    ? `<span class="review-body-text">${truncateText(review.body, maxBodyLength)}</span><button class="review-read-more" style="color:#3b82f6;font-weight:500;background:none;border:none;cursor:pointer;font-size:13px;padding:2px 0;margin-left:4px;">${readMoreText}</button>`
    : review.body;
  root.appendChild(bodyEl);

  // Read more handler
  if (needsTruncation) {
    let expanded = false;
    const readMoreBtn = bodyEl.querySelector(".review-read-more") as HTMLElement;
    const bodyText = bodyEl.querySelector(".review-body-text") as HTMLElement;
    readMoreBtn?.addEventListener("click", () => {
      expanded = !expanded;
      bodyText.textContent = expanded ? review.body : truncateText(review.body, maxBodyLength);
      readMoreBtn.textContent = expanded ? "Show less" : readMoreText;
    });
  }

  // Media
  if (showMedia && review.media && review.media.length > 0) {
    const gallery = document.createElement("div");
    gallery.className = "review-media";
    gallery.style.cssText = "display:flex;gap:6px;margin-top:10px;overflow-x:auto;";
    review.media.slice(0, 5).forEach((m) => {
      const thumb = document.createElement("div");
      thumb.style.cssText =
        "width:64px;height:64px;border-radius:6px;overflow:hidden;flex-shrink:0;" +
        "background:#f3f4f6;display:flex;align-items:center;justify-content:center;" +
        "cursor:pointer;font-size:11px;color:#9ca3af;";
      if (m.type === "image") {
        thumb.innerHTML = `<img src="${m.thumbnail || m.src}" style="width:100%;height:100%;object-fit:cover;" alt="${m.alt || ''}" />`;
      } else {
        thumb.innerHTML = "&#9654;"; // play icon
      }
      gallery.appendChild(thumb);
    });
    root.appendChild(gallery);
  }

  // Response
  if (showResponse && review.response) {
    const respEl = document.createElement("div");
    respEl.className = "review-response";
    respEl.style.cssText =
      "margin-top:12px;padding:10px 12px;background:#f9fafb;border-radius:6px;" +
      "border-left:3px solid #3b82f6;font-size:13px;";
    respEl.innerHTML =
      `<strong style="color:#3b82f6;">${review.response.author}</strong> responded:` +
      `<p style="margin:4px 0 0;color:#6b7280;">${review.response.body}</p>`;
    root.appendChild(respEl);
  }

  // Helpful
  if (showHelpful) {
    const helpfulEl = document.createElement("div");
    helpfulEl.className = "review-helpful";
    helpfulEl.style.cssText =
      "display:flex;align-items:center;gap:12px;margin-top:12px;padding-top:10px;" +
      "border-top:1px solid #f3f4f6;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = review.isHelpful ? "Helpful ✓" : "Helpful?";
    btn.style.cssText =
      `padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;` +
      (review.isHelpful
        ? "border:1px solid #86efac;background:#ecfdf5;color:#059669;"
        : "border:1px solid #d1d5db;background:#fff;color:#6b7280;");
    btn.addEventListener("click", () => {
      const newState = !review.isHelpful;
      review.isHelpful = newState;
      btn.textContent = newState ? "Helpful ✓" : "Helpful?";
      btn.style.borderColor = newState ? "#86efac" : "#d1d5db";
      btn.style.background = newState ? "#ecfdf5" : "#fff";
      btn.style.color = newState ? "#059669" : "#6b7280";
      onHelpfulToggle?.(review.id, newState);
    });

    if (review.helpful != null) {
      const countEl = document.createElement("span");
      countEl.textContent = `${review.helpful} found this helpful`;
      countEl.style.fontSize = "12px";
      countEl.style.color = "#9ca3af";
      helpfulEl.appendChild(countEl);
    }

    helpfulEl.appendChild(btn);
    root.appendChild(helpfulEl);
  }

  (container ?? document.body).appendChild(root);

  return {
    el: root,
    updateReview: (partial) => {
      Object.assign(review, partial);
      // Simple approach: re-render by replacing content
      // For production, would do a more targeted diff
    },
    destroy: () => root.remove(),
  };
}

// --- Review List ---

export function createReviewList(options: ReviewListOptions): ReviewListInstance {
  const {
    reviews,
    sort = "newest",
    minRating = 0,
    withPhotosOnly = false,
    searchQuery = "",
    perPage = 10,
    showSummary = true,
    renderCard,
    className,
    container,
    onSortChange,
  } = options;

  let _sort = sort;
  let _minRating = minRating;
  let _searchQuery = searchQuery;
  let _withPhotosOnly = withPhotosOnly;

  const root = document.createElement("div");
  root.className = `review-list ${className ?? ""}`.trim();

  // Summary bar
  if (showSummary) {
    const avg = getAverageRating();
    const total = reviews.length;
    const dist = getDistribution();

    const summary = document.createElement("div");
    summary.className = "review-summary";
    summary.style.cssText =
      "display:flex;align-items:center;gap:20px;padding:16px;background:#f9fafb;" +
      "border-radius:10px;margin-bottom:16px;flex-wrap:wrap;";

    // Average + stars
    const avgSection = document.createElement("div");
    avgSection.innerHTML =
      `<div style="font-size:32px;font-weight:700;color:#111827;">${avg.toFixed(1)}</div>` +
      `<div style="display:flex;gap:2px;">${renderStars(avg, 18)}</div>` +
      `<div style="font-size:13px;color:#6b7280;">${total} reviews</div>`;
    summary.appendChild(avgSection);

    // Distribution bars
    const distSection = document.createElement("div");
    distSection.style.cssText = "display:flex;flex-direction:column;gap:4px;";
    [5, 4, 3, 2, 1].forEach((r) => {
      const count = dist[r] || 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;font-size:12px;";
      row.innerHTML =
        `<span>${r}</span>${renderStars(r, 11)}` +
        `<div style="width:80px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">` +
        `<div style="width:${pct}%;height:100%;background:#fbbf24;border-radius:3px;"></div></div>` +
        `<span style="color:#9ca3af;width:24px;text-align:right;">${count}</span>`;
      distSection.appendChild(row);
    });
    summary.appendChild(distSection);

    root.appendChild(summary);
  }

  // Reviews container
  const listContainer = document.createElement("div");
  listContainer.className = "review-list-items";
  root.appendChild(listContainer);

  // Render
  function render(): void {
    listContainer.innerHTML = "";
    const displayed = getDisplayedReviews();
    displayed.slice(0, perPage).forEach((review) => {
      if (renderCard) {
        listContainer.appendChild(renderCard(review));
      } else {
        const card = createReviewCard({ review }).el;
        listContainer.appendChild(card);
      }
    });
  }

  render();
  (container ?? document.body).appendChild(root);

  function getDisplayedReviews(): Review[] {
    let filtered = [...reviews];

    // Rating filter
    if (_minRating > 0) {
      filtered = filtered.filter((r) => r.rating >= _minRating);
    }

    // Photos only
    if (_withPhotosOnly) {
      filtered = filtered.filter((r) => r.media && r.media.length > 0);
    }

    // Search
    if (_searchQuery.trim()) {
      const q = _searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        r.body.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.author.name.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (_sort) {
      case "newest":
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "highest":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case "helpful":
        filtered.sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0));
        break;
    }

    return filtered;
  }

  function getAverageRating(): number {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }

  function getTotalCount(): number { return reviews.length; }

  function getDistribution(): Record<number, number> {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const key = Math.max(1, Math.min(5, Math.round(r.rating)));
      dist[key]++;
    });
    return dist;
  }

  return {
    el: root,
    getDisplayedReviews,
    setSort(s) { _sort = s; render(); onSortChange?.(s); },
    setSearch(q) { _searchQuery = q; render(); },
    setMinRating(r) { _minRating = r; render(); },
    getAverageRating,
    getTotalCount,
    getDistribution,
    destroy: () => root.remove(),
  };
}
