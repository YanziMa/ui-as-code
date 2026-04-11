/**
 * Rating & Review: Star rating, numeric rating, review submission form,
 * review list with filtering/sorting, helpful voting, photo reviews,
 * rating distribution histogram, and summary statistics.
 */

// --- Types ---

export type RatingType = "star" | "numeric" | "thumbs" | "emoji";
export type SortReviews = "newest" | "oldest" | "highest" | "lowest" | "helpful";
export type FilterRating = number | null; // 1-5 or null = all

export interface ReviewAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
  /** Number of reviews by this author */
  reviewCount?: number;
}

export interface Review {
  id: string;
  author: ReviewAuthor;
  /** Rating value (1-5 for stars, -1/0/1 for thumbs) */
  rating: number;
  /** Review title */
  title?: string;
  /** Review body */
  content: string;
  /** ISO date string */
  date: string;
  /** Helpful votes count */
  helpful?: number;
  /** Did current user vote helpful? */
  votedHelpful?: boolean;
  /** Photos attached */
  photos?: Array<{ url: string; thumbnail?: string; caption?: string }>;
  /** Response from owner */
  response?: { author: string; content: string; date: string };
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface RatingSummary {
  average: number;
  total: number;
  distribution: [number, number, number, number, number]; // counts per star 1-5
}

export interface RatingReviewOptions {
  container: HTMLElement | string;
  /** Initial reviews */
  reviews?: Review[];
  /** Rating type to display */
  ratingType?: RatingType;
  /** Max star count (default: 5) */
  maxStars?: number;
  /** Allow submitting new reviews? */
  allowSubmit?: boolean;
  /** Allow editing own reviews? */
  allowEdit?: boolean;
  /** Allow deleting own reviews? */
  allowDelete?: boolean;
  /** Show rating summary/histogram? */
  showSummary?: boolean;
  /** Show review form? */
  showForm?: boolean;
  /** Show photos in reviews? */
  showPhotos?: true;
  /** Enable helpful voting? */
  allowHelpfulVote?: boolean;
  /** Default sort order */
  defaultSort?: SortReviews;
  /** Require title in review form? */
  requireTitle?: boolean;
  /** Min length for review content */
  minLength?: number;
  /** Max length for review content */
  maxLength?: number;
  /** Callback on submit review */
  onSubmit?: (review: Omit<Review, "id">) => Promise<void> | void;
  /** Callback on edit review */
  onEdit?: (id: string, updates: Partial<Review>) => Promise<void> | void;
  /** Callback on delete review */
  onDelete?: (id: string) => Promise<void> | void;
  /** Callback on helpful vote */
  onHelpfulVote?: (reviewId: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RatingReviewInstance {
  element: HTMLElement;
  getReviews: () => Review[];
  getSummary: () => RatingSummary;
  addReview: (review: Review) => void;
  removeReview: (id: string) => void;
  updateReview: (id: string, updates: Partial<Review>) => void;
  setSort: (sort: SortReviews) => void;
  setFilter: (rating: FilterRating) => void;
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string {
  return `rv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function computeSummary(reviews: Review[]): RatingSummary {
  if (reviews.length === 0) return { average: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    const idx = Math.max(0, Math.min(Math.round(r.rating) - 1, 4));
    dist[idx]++;
  }
  return { average: sum / reviews.length, total: reviews.length, distribution: dist };
}

// --- Main Factory ---

export function createRatingReview(options: RatingReviewOptions): RatingReviewInstance {
  const opts = {
    reviews: options.reviews ?? [],
    ratingType: options.ratingType ?? "star",
    maxStars: options.maxStars ?? 5,
    allowSubmit: options.allowSubmit ?? true,
    allowEdit: options.allowEdit ?? true,
    allowDelete: options.allowDelete ?? true,
    showSummary: options.showSummary ?? true,
    showForm: options.showForm ?? true,
    showPhotos: options.showPhotos ?? true,
    allowHelpfulVote: options.allowHelpfulVote ?? true,
    defaultSort: options.defaultSort ?? "newest",
    requireTitle: options.requireTitle ?? false,
    minLength: options.minLength ?? 10,
    maxLength: options.maxLength ?? 2000,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RatingReview: container not found");

  let allReviews: Review[] = [...opts.reviews];
  let destroyed = false;
  let currentSort: SortReviews = opts.defaultSort;
  let currentFilter: FilterRating = null;

  // Root
  const root = document.createElement("div");
  root.className = `rating-review ${opts.className}`;
  root.style.cssText = `font-family:-apple-system,sans-serif;color:#374151;`;
  container.appendChild(root);

  // Summary section
  let summaryEl: HTMLElement | null = null;
  if (opts.showSummary) {
    summaryEl = document.createElement("div");
    summaryEl.className = "rr-summary";
    summaryEl.style.cssText = "display:flex;gap:32px;padding:20px;border-bottom:1px solid #e5e7eb;align-items:center;";
    root.appendChild(summaryEl);
  }

  // Form section
  let formEl: HTMLElement | null = null;
  if (opts.showForm && opts.allowSubmit) {
    formEl = document.createElement("div");
    formEl.className = "rr-form";
    formEl.style.cssText = "padding:16px 20px;border-bottom:1px solid #e5e7eb;background:#fafafa;";
    root.appendChild(formEl);
  }

  // Reviews list
  const listEl = document.createElement("div");
  listEl.className = "rr-list";
  root.appendChild(listEl);

  // --- Render Summary ---

  function renderSummary(): void {
    if (!summaryEl) return;
    summaryEl.innerHTML = "";

    const summary = computeSummary(allReviews);

    // Left: big rating + total
    const left = document.createElement("div");
    left.style.cssText = "text-align:center;min-width:100px;";

    const bigRating = document.createElement("div");
    bigRating.style.cssText = "font-size:42px;font-weight:700;color:#111827;line-height:1;";
    bigRating.textContent = summary.average.toFixed(1);
    left.appendChild(bigRating);

    const totalLabel = document.createElement("div");
    totalLabel.style.cssText = "font-size:13px;color:#6b7280;margin-top:2px;";
    totalLabel.textContent = `${summary.total} ${summary.total === 1 ? "review" : "reviews"}`;
    left.appendChild(totalLabel);

    // Stars display under the number
    const starsDisplay = document.createElement("div");
    starsDisplay.style.cssText = "margin-top:4px;display:flex;justify-content:center;gap:1px;";
    for (let i = 1; i <= opts.maxStars; i++) {
      const star = document.createElement("span");
      star.textContent = i <= Math.round(summary.average) ? "\u2605" : "\u2606";
      star.style.cssText = `font-size:16px;color:${i <= Math.round(summary.average) ? "#f59e0b" : "#d1d5db"};`;
      starsDisplay.appendChild(star);
    }
    left.appendChild(starsDisplay);
    summaryEl.appendChild(left);

    // Right: histogram bars
    const right = document.createElement("div");
    right.style.cssText = "flex:1;";

    for (let s = opts.maxStars; s >= 1; s--) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:3px;";

      const label = document.createElement("span");
      label.style.cssText = "font-size:12px;color:#6b7280;width:28px;text-align:right;";
      label.textContent = `${s} star${s > 1 ? "s" : ""}`;
      row.appendChild(label);

      const barBg = document.createElement("div");
      barBg.style.cssText = "flex:1;height:16px;background:#f3f4f6;border-radius:3px;overflow:hidden;position:relative;";

      const pct = summary.total > 0 ? (summary.distribution[s - 1]! / summary.total) * 100 : 0;
      const barFill = document.createElement("div");
      barFill.style.cssText = `height:100%;background:#f59e0b;border-radius:3px;transition:width 0.3s;width:${pct}%;`;
      barBg.appendChild(barFill);

      const count = document.createElement("span");
      count.style.cssText = "font-size:11px;color:#9ca3af;width:28px;text-align:left;";
      count.textContent = String(summary.distribution[s - 1]!);
      row.appendChild(barBg);
      row.appendChild(count);
      right.appendChild(row);
    }

    summaryEl.appendChild(right);
  }

  // --- Render Form ---

  function renderForm(): void {
    if (!formEl) return;
    formEl.innerHTML = "";

    const heading = document.createElement("h3");
    heading.style.cssText = "font-size:15px;font-weight:600;margin:0 0 12px;color:#111827;";
    heading.textContent = "Write a Review";
    formEl.appendChild(heading);

    // Star picker
    const starRow = document.createElement("div");
    starRow.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:12px;";

    const starLabel = document.createElement("span");
    starLabel.style.cssText = "font-size:13px;color:#374151;margin-right:4px;";
    starLabel.textContent = "Your rating:";
    starRow.appendChild(starLabel);

    let selectedRating = 0;
    const stars: HTMLSpanElement[] = [];

    for (let i = 1; i <= opts.maxStars; i++) {
      const star = document.createElement("span");
      star.dataset.value = String(i);
      star.textContent = "\u2606";
      star.style.cssText = "font-size:22px;cursor:pointer;color:#d1d5db;transition:color 0.1s;";
      star.addEventListener("mouseenter", () => highlightStars(i));
      star.addEventListener("mouseleave", () => highlightStars(selectedRating));
      star.addEventListener("click", () => { selectedRating = i; highlightStars(i); });
      starRow.appendChild(star);
      stars.push(star);
    }

    const ratingVal = document.createElement("input");
    ratingVal.type = "hidden";
    ratingVal.name = "rating";
    starRow.appendChild(ratingVal);
    formEl.appendChild(starRow);

    function highlightStars(count: number): void {
      for (let i = 0; i < stars.length; i++) {
        stars[i]!.textContent = i < count ? "\u2605" : "\u2606";
        stars[i]!.style.color = i < count ? "#f59e0b" : "#d1d5db";
      }
      ratingVal.value = String(count);
    }

    // Title input
    if (opts.requireTitle) {
      const titleField = document.createElement("input");
      titleField.type = "text";
      titleField.placeholder = "Review title";
      titleField.name = "title";
      titleField.style.cssText = "width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box;";
      formEl.appendChild(titleField);
    }

    // Content textarea
    const contentArea = document.createElement("textarea");
    contentArea.placeholder = "Share your experience...";
    contentArea.rows = 4;
    contentArea.maxLength = opts.maxLength;
    contentArea.style.cssText = "width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;resize:vertical;box-sizing:border-box;font-family:inherit;line-height:1.5;";
    formEl.appendChild(contentArea);

    // Char count
    const charCount = document.createElement("div");
    charCount.style.cssText = "text-align:right;font-size:11px;color:#9ca3af;margin-top:4px;";
    charCount.textContent = `0 / ${opts.maxLength}`;
    contentArea.addEventListener("input", () => {
      charCount.textContent = `${contentArea.value.length} / ${opts.maxLength}`;
    });
    formEl.appendChild(charCount);

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = "Submit Review";
    submitBtn.style.cssText = `
      margin-top:10px;padding:8px 20px;border:none;border-radius:6px;font-size:13px;
      font-weight:500;background:#4338ca;color:#fff;cursor:pointer;transition:background 0.15s;
    `;
    submitBtn.addEventListener("mouseenter", () => { submitBtn.style.background = "#3730a3"; });
    submitBtn.addEventListener("mouseleave", () => { submitBtn.style.background = "#4338ca"; });
    submitBtn.addEventListener("click", async () => {
      const rating = parseInt(ratingVal.value) || 0;
      const content = contentArea.value.trim();
      if (rating === 0) { alert("Please select a rating"); return; }
      if (content.length < opts.minLength) { alert(`Review must be at least ${opts.minLength} characters`); return; }

      const titleInput = formEl.querySelector('input[name="title"]') as HTMLInputElement;
      const newReview: Omit<Review, "id"> = {
        author: { id: "current", name: "You", isCurrentUser: true },
        rating,
        title: titleInput?.value.trim(),
        content,
        date: new Date().toISOString(),
        helpful: 0,
        votedHelpful: false,
      };

      await opts.onSubmit?.(newReview);
      instance.addReview({ ...newReview, id: generateId() });
      contentArea.value = "";
      if (titleInput) titleInput.value = "";
      charCount.textContent = `0 / ${opts.maxLength}`;
      selectedRating = 0;
      highlightStars(0);
    });

    formEl.appendChild(submitBtn);
  }

  // --- Render Reviews List ---

  function renderList(): void {
    listEl.innerHTML = "";

    // Sort & filter
    let filtered = [...allReviews];
    if (currentFilter !== null) filtered = filtered.filter((r) => Math.round(r.rating) === currentFilter);

    switch (currentSort) {
      case "newest": filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); break;
      case "oldest": filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break;
      case "highest": filtered.sort((a, b) => b.rating - a.rating); break;
      case "lowest": filtered.sort((a, b) => a.rating - b.rating); break;
      case "helpful": filtered.sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0)); break;
    }

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid #f3f4f6;";

    const countLabel = document.createElement("span");
    countLabel.style.cssText = "font-size:13px;color:#6b7280;";
    countLabel.textContent = `${filtered.length} ${filtered.length === 1 ? "review" : "reviews"}`;
    toolbar.appendChild(countLabel);

    const sortSelect = document.createElement("select");
    sortSelect.style.cssText = "padding:4px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;background:#fff;";
    for (const s of ["newest", "oldest", "highest", "lowest", "helpful"] as SortReviews[]) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      if (s === currentSort) opt.selected = true;
      sortSelect.appendChild(opt);
    }
    sortSelect.addEventListener("change", () => instance.setSort(sortSelect.value as SortReviews));
    toolbar.appendChild(sortListEl);

    // Filter buttons
    const filterGroup = document.createElement("div");
    filterGroup.style.cssText = "display:flex;gap:4px;margin-left:12px;";
    for (const f of [null, 5, 4, 3, 2, 1] as (number | null)[]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = f === null ? "All" : `${f}\u2605`;
      btn.dataset.filter = String(f ?? "");
      btn.style.cssText = `
        padding:3px 8px;border-radius:4px;font-size:11px;border:1px solid #e5e7eb;cursor:pointer;
        background:${currentFilter === f ? "#4338ca;color:#fff;border-color:#4338ca;" : "#fff;color:#6b7280;"}
      `;
      btn.addEventListener("click", () => instance.setFilter(f));
      filterGroup.appendChild(btn);
    }
    toolbar.appendChild(filterGroup);
    listEl.appendChild(toolbar);

    // Review items
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px;color:#9ca3af;font-size:13px;";
      empty.innerHTML = `<div style="font-size:28px;margin-bottom:8px;">\u{1F4D6}</div><div>No reviews yet</div>`;
      listEl.appendChild(empty);
      return;
    }

    for (const review of filtered) {
      listEl.appendChild(renderReviewItem(review));
    }
  }

  // Fix: sortListEl was referenced but not defined
  let sortListEl: HTMLElement;

  function renderReviewItem(review: Review): HTMLElement {
    const el = document.createElement("div");
    el.className = "rr-review-item";
    el.dataset.reviewId = review.id;
    el.style.cssText = "padding:16px 20px;border-bottom:1px solid #f3f4f6;";

    // Header: avatar + name + date + stars
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px;";

    // Avatar
    const avatar = document.createElement("div");
    avatar.style.cssText = `
      width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:600;color:#fff;flex-shrink:0;
      background:${review.author.avatar ? `url(${review.author.avatar}) center/cover` : `hsl(${hashCode(review.author.name) % 360}, 55%, 55%)`};
    `;
    if (!review.author.avatar) avatar.textContent = review.author.name.charAt(0).toUpperCase();
    header.appendChild(avatar);

    const info = document.createElement("div");
    info.style.flex = "1";

    const nameRow = document.createElement("div");
    nameRow.style.display = "flex";
    nameRow.style.alignItems = "center";
    nameRow.style.gap = "6px";

    const name = document.createElement("span");
    name.style.cssText = "font-weight:600;font-size:13px;color:#111827;";
    name.textContent = review.author.name;
    nameRow.appendChild(name);

    if (review.author.verified) {
      const verified = document.createElement("span");
      verified.textContent = "Verified";
      verified.style.cssText = "font-size:10px;background:#ecfdf5;color:#059669;padding:1px 5px;border-radius:3px;";
      nameRow.appendChild(verified);
    }

    info.appendChild(nameRow);

    // Stars + date
    const metaRow = document.createElement("div");
    metaRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:2px;";

    // Render stars based on rating type
    if (opts.ratingType === "star") {
      for (let i = 1; i <= opts.maxStars; i++) {
        const s = document.createElement("span");
        s.textContent = i <= Math.round(review.rating) ? "\u2605" : "\u2606";
        s.style.cssText = `font-size:14px;color:${i <= Math.round(review.rating) ? "#f59e0b" : "#d1d5db"};`;
        metaRow.appendChild(s);
      }
    } else if (opts.ratingType === "thumbs") {
      const thumb = document.createElement("span");
      thumb.textContent = review.rating >= 1 ? "\uD83D\uDC4D" : review.rating <= -1 ? "\uD83D\uDC4E" : "\uD83D\uDC4F";
      thumb.style.fontSize = "16px";
      metaRow.appendChild(thumb);
    } else {
      const num = document.createElement("span");
      num.style.cssText = "font-weight:600;font-size:14px;color:#111827;";
      num.textContent = `${review.rating.toFixed(1)}`;
      metaRow.appendChild(num);
    }

    const date = document.createElement("span");
    date.style.cssText = "font-size:11px;color:#9ca3af;";
    date.textContent = timeAgo(review.date);
    metaRow.appendChild(date);

    info.appendChild(metaRow);
    header.appendChild(info);
    el.appendChild(header);

    // Title
    if (review.title) {
      const title = document.createElement("h4");
      title.style.cssText = "margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;";
      title.textContent = review.title;
      el.appendChild(title);
    }

    // Content
    const body = document.createElement("p");
    body.style.cssText = "margin:0 0 8px;font-size:13px;line-height:1.6;color:#374151;";
    body.textContent = review.content;
    el.appendChild(body);

    // Photos
    if (review.photos?.length && opts.showPhotos) {
      const photoGrid = document.createElement("div");
      photoGrid.style.cssText = "display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;";
      for (const p of review.photos.slice(0, 4)) {
        const img = document.createElement("img");
        img.src = p.thumbnail ?? p.url;
        img.alt = p.caption ?? "";
        img.style.cssText = "width:72px;height:72px;object-fit:cover;border-radius:6px;cursor:pointer;";
        photoGrid.appendChild(img);
      }
      if (review.photos.length > 4) {
        const more = document.createElement("span");
        more.style.cssText = "display:flex;align-items:center;font-size:12px;color:#6b7280;padding:0 4px;";
        more.textContent = `+${review.photos.length - 4} more`;
        photoGrid.appendChild(more);
      }
      el.appendChild(photoGrid);
    }

    // Response
    if (review.response) {
      const respBox = document.createElement("div");
      respBox.style.cssText = "background:#f9fafb;border-left:3px solid #4338ca;padding:8px 12px;margin:8px 0;border-radius:0 6px 6px 0;font-size:12px;";
      respBox.innerHTML = `<strong style="color:#4338ca;">Response from ${review.response.author}</strong><br/><span style="color:#4b5563;">${review.response.content}</span>`;
      el.appendChild(respBox);
    }

    // Actions footer
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;align-items:center;gap:16px;margin-top:8px;";

    // Helpful vote
    if (opts.allowHelpfulVote) {
      const helpfulBtn = document.createElement("button");
      helpfulBtn.type = "button";
      helpfulBtn.textContent = `Helpful (${review.helpful ?? 0})`;
      helpfulBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:12px;color:${review.votedHelpful ? "#059669" : "#6b7280"};
        padding:3px 8px;border-radius:4px;font-weight:${review.votedHelpful ? "600" : "400"};
      `;
      helpfulBtn.addEventListener("click", () => {
        review.votedHelpful = !review.votedHelpful;
        review.helpful = (review.helpful ?? 0) + (review.votedHelpful ? 1 : -1);
        opts.onHelpfulVote?.(review.id);
        renderList();
      });
      helpfulBtn.addEventListener("mouseenter", () => { helpfulBtn.style.background = "#f3f4f6"; });
      helpfulBtn.addEventListener("mouseleave", () => { helpfulBtn.style.background = ""; });
      actions.appendChild(helpfulBtn);
    }

    el.appendChild(actions);
    return el;
  }

  // --- Initial Render ---

  renderSummary();
  renderForm();
  renderList();

  const instance: RatingReviewInstance = {
    element: root,

    getReviews() { return [...allReviews]; },

    getSummary() { return computeSummary(allReviews); },

    addReview(review: Review) {
      allReviews.unshift(review);
      renderSummary();
      renderList();
    },

    removeReview(id: string) {
      allReviews = allReviews.filter((r) => r.id !== id);
      renderSummary();
      renderList();
    },

    updateReview(id: string, updates: Partial<Review>) {
      const r = allReviews.find((rev) => rev.id === id);
      if (r) Object.assign(r, updates);
      renderList();
    },

    setSort(sort: SortReviews) {
      currentSort = sort;
      renderList();
    },

    setFilter(rating: FilterRating) {
      currentFilter = rating;
      renderList();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
