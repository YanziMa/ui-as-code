/**
 * Testimonial / Review Card: Customer testimonial display with avatar, quote,
 * star rating, company info, multiple layout variants, carousel mode, and animations.
 */

// --- Types ---

export type TestimonialLayout = "default" | "card" | "bubble" | "minimal" | "media";
export type TestimonialSize = "sm" | "md" | "lg";

export interface TestimonialItem {
  /** Unique ID */
  id: string;
  /** Reviewer name */
  author: string;
  /** Reviewer role/title */
  role?: string;
  /** Company/organization */
  company?: string;
  /** Quote/review text */
  quote: string;
  /** Avatar URL or emoji */
  avatar?: string;
  /** Star rating (1-5) */
  rating?: number;
  /** Highlighted text snippet */
  highlight?: string;
  /** Verified badge? */
  verified?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface TestimonialOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Testimonials to display */
  items: TestimonialItem[];
  /** Layout variant */
  layout?: TestimonialLayout;
  /** Size variant */
  size?: TestimonialSize;
  /** Show star ratings */
  showRating?: boolean;
  /** Show avatars */
  showAvatar?: true;
  /** Show company info */
  showCompany?: boolean;
  /** Show verified badges */
  showVerified?: boolean;
  /** Max quote length (truncate with "...") */
  maxQuoteLength?: number;
  /** Carousel/auto-play mode */
  carousel?: boolean;
  /** Auto-play interval (ms, for carousel) */
  autoPlayInterval?: number;
  /** Show navigation dots/arrows (for carousel) */
  showNavDots?: boolean;
  /** Show arrows (for carousel) */
  showArrows?: boolean;
  /** Columns per row (grid of testimonials) */
  columns?: number;
  /** Click callback */
  onItemClick?: (item: TestimonialItem, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TestimonialInstance {
  element: HTMLElement;
  getItems: () => TestimonialItem[];
  setItems: (items: TestimonialItem[]) => void;
  addItem: (item: TestimonialItem) => void;
  removeItem: (id: string) => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  destroy: () => void;
}

// --- Helpers ---

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "\u2605".repeat(full) + (half ? "\u00BD" : "") + "\u2606".repeat(empty);
}

function truncateText(text: string, maxLen: number): string {
  if (!maxLen || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "\u2026";
}

// --- Config ---

const SIZE_CONFIG: Record<TestimonialSize, { fontSize: string; padding: string; avatarSize: string }> = {
  sm: { fontSize: "12px", padding: "16px", avatarSize: "36px" },
  md: { fontSize: "13px", padding: "20px", avatarSize: "44px" },
  lg: { fontSize: "14px", padding: "28px", avatarSize: "56px" },
};

// --- Main Factory ---

export function createTestimonial(options: TestimonialOptions): TestimonialInstance {
  const opts = {
    layout: options.layout ?? "card",
    size: options.size ?? "md",
    showRating: options.showRating ?? true,
    showAvatar: options.showAvatar ?? true,
    showCompany: options.showCompany ?? true,
    showVerified: options.showVerified ?? true,
    carousel: options.carousel ?? false,
    autoPlayInterval: options.autoPlayInterval ?? 5000,
    showNavDots: options.showNavDots ?? true,
    showArrows: options.showArrows ?? true,
    columns: options.columns ?? 1,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Testimonial: container not found");

  let items = [...options.items];
  let currentIndex = 0;
  let autoPlayTimer: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `testimonial ${opts.className ?? ""}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;width:100%;position:relative;
  `;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";
    stopAutoPlay();

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No testimonials";
      empty.style.cssText = "text-align:center;padding:40px;color:#9ca3af;";
      root.appendChild(empty);
      return;
    }

    if (opts.carousel && items.length > 1) {
      renderCarousel();
    } else if (opts.columns > 1) {
      renderGrid();
    } else {
      renderSingle(items[0]!);
    }
  }

  function renderSingle(item: TestimonialItem): void {
    const card = createTestimonialCard(item);
    root.appendChild(card);
  }

  function renderGrid(): void {
    const grid = document.createElement("div");
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${opts.columns},1fr);gap:20px;`;

    for (const item of items) {
      grid.appendChild(createTestimonialCard(item));
    }

    root.appendChild(grid);
  }

  function renderCarousel(): void {
    // Viewport
    const viewport = document.createElement("div");
    viewport.style.cssText = "overflow:hidden;position:relative;border-radius:12px;";
    root.appendChild(viewport);

    // Track
    const track = document.createElement("div");
    track.style.cssText = "display:flex;transition:transform 0.4s ease;will-change:transform;";
    viewport.appendChild(track);

    // Slides
    for (let i = 0; i < items.length; i++) {
      const slide = document.createElement("div");
      slide.style.cssText = "min-width:100%;padding:8px;box-sizing:border-box;";
      slide.appendChild(createTestimonialCard(items[i]!));
      track.appendChild(slide);
    }

    // Update position
    updateCarouselPosition(track);

    // Navigation
    if (opts.showArrows) {
      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.innerHTML = "&lsaquo;";
      prevBtn.style.cssText = `
        position:absolute;top:50%;left:8px;transform:translateY(-50%);
        width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid #e5e7eb;
        box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;font-size:18px;
        color:#374151;display:flex;align-items:center;justify-content:center;z-index:2;
        transition:all 0.15s;
      `;
      prevBtn.addEventListener("click", () => instance.prev());
      prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "#f9fafb"; });
      prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = "#fff"; });

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.innerHTML = "&rsaquo;";
      nextBtn.style.cssText = `
        position:absolute;top:50%;right:8px;transform:translateY(-50%);
        width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid #e5e7eb;
        box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;font-size:18px;
        color:#374151;display:flex;align-items:center;justify-content:center;z-index:2;
        transition:all 0.15s;
      `;
      nextBtn.addEventListener("click", () => instance.next());
      nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "#f9fafb"; });
      nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = "#fff"; });

      root.appendChild(prevBtn);
      root.appendChild(nextBtn);
    }

    // Dots
    if (opts.showNavDots && items.length > 1) {
      const dotsWrap = document.createElement("div");
      dotsWrap.style.cssText = "display:flex;justify-content:center;gap:6px;margin-top:16px;";

      for (let i = 0; i < items.length; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.dataset.index = String(i);
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        dot.style.cssText = `
          width:8px;height:8px;border-radius:50%;border:none;background:${i === currentIndex ? "#4338ca" : "#d1d5db"};
          cursor:pointer;padding:0;transition:all 0.2s;
        `;
        dot.addEventListener("click", () => instance.goTo(i));
        dotsWrap.appendChild(dot);
      }

      root.appendChild(dotsWrap);
    }

    startAutoPlay();
  }

  function updateCarouselPosition(track: HTMLElement): void {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    // Update dots
    const dots = root.querySelectorAll<HTMLElement>("[data-index]");
    dots.forEach((dot, i) => {
      dot.style.background = i === currentIndex ? "#4338ca" : "#d1d5db";
      dot.style.width = i === currentIndex ? "24px" : "8px";
      dot.style.borderRadius = i === currentIndex ? "4px" : "50%";
    });
  }

  function createTestimonialCard(item: TestimonialItem): HTMLElement {
    const sz = SIZE_CONFIG[opts.size];

    const card = document.createElement("div");
    card.dataset.id = item.id;
    card.style.cursor = opts.onItemClick ? "pointer" : "default";

    switch (opts.layout) {
      case "bubble":
        card.style.cssText = buildBubbleStyle(sz);
        break;
      case "minimal":
        card.style.cssText = buildMinimalStyle(sz);
        break;
      case "media":
        card.style.cssText = buildMediaStyle(sz);
        break;
      default:
        card.style.cssText = buildCardStyle(sz);
        break;
    }

    // Build content based on layout
    switch (opts.layout) {
      case "bubble":   buildBubbleContent(card, item, sz); break;
      case "minimal":  buildMinimalContent(card, item, sz); break;
      case "media":    buildMediaContent(card, item, sz); break;
      default:        buildCardContent(card, item, sz); break;
    }

    if (opts.onItemClick) {
      card.addEventListener("click", () => {
        const idx = items.findIndex((t) => t.id === item.id);
        opts.onItemClick!(item, idx);
      });
    }

    return card;
  }

  function buildCardStyle(sz: { fontSize: string; padding: string; avatarSize: string }): string {
    return `
      background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:${sz.padding};
      box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:transform 0.2s,box-shadow 0.2s;
    `;
  }

  function buildCardContent(card: HTMLElement, item: TestimonialItem, sz: { fontSize: string; padding: string; avatarSize: string }): void {
    // Stars at top
    if (item.rating !== undefined && opts.showRating) {
      const starsEl = document.createElement("div");
      starsEl.textContent = renderStars(item.rating);
      starsEl.style.cssText = `font-size:14px;color:#f59e0b;margin-bottom:12px;letter-spacing:2px;`;
      card.appendChild(starsEl);
    }

    // Quote
    const quoteEl = document.createElement("blockquote");
    quoteEl.textContent = `"${truncateText(item.quote, opts.maxQuoteLength)}"`;
    quoteEl.style.cssText = `font-size:${sz.fontSize};line-height:1.7;color:#374151;margin:0 0 16px;font-style:normal;`;
    card.appendChild(quoteEl);

    // Author info row
    const authorRow = document.createElement("div");
    authorRow.style.cssText = "display:flex;align-items:center;gap:10px;";

    if (item.avatar && opts.showAvatar) {
      const avatarEl = document.createElement("span");
      avatarEl.textContent = item.avatar.length <= 2 ? item.avatar : "";
      avatarEl.style.cssText = `
        width:${sz.avatarSize};height:${sz.avatarSize};border-radius:50%;
        background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;
        display:flex;align-items:center;justify-content:center;font-size:${parseInt(sz.avatarSize) * 0.45}px;
        font-weight:600;flex-shrink:0;overflow:hidden;
        ${item.avatar.length > 2 ? `background:url('${item.avatar}') center/cover no-repeat;` : ""}
      `;
      authorRow.appendChild(avatarEl);
    }

    const infoCol = document.createElement("div");
    infoCol.style.cssText = "flex:1;min-width:0;";

    const nameEl = document.createElement("div");
    nameEl.style.cssText = "font-weight:600;font-size:14px;color:#111827;display:flex;align-items:center;gap:4px;";
    nameEl.textContent = item.author;

    if (item.verified && opts.showVerified) {
      const check = document.createElement("span");
      check.textContent = "\u2705";
      check.style.cssText = "font-size:11px;";
      check.title = "Verified review";
      nameEl.appendChild(check);
    }

    infoCol.appendChild(nameEl);

    const metaEl = document.createElement("div");
    metaEl.style.cssText = "font-size:12px;color:#6b7280;";
    const parts: string[] = [];
    if (item.role) parts.push(item.role);
    if (item.company && opts.showCompany) parts.push(item.company);
    metaEl.textContent = parts.join(" \u00B7 ");
    if (parts.length > 0) infoCol.appendChild(metaEl);

    authorRow.appendChild(infoCol);
    card.appendChild(authorRow);
  }

  function buildBubbleStyle(sz: { fontSize: string; padding: string; avatarSize: string }): string {
    return `
      background:#f0f4ff;border-radius:18px;padding:${sz.padding};
      position:relative;font-style:italic;
    `;
  }

  function buildBubbleContent(card: HTMLElement, item: TestimonialItem, sz: { fontSize: string; padding: string; avatarSize: string }): void {
    const quoteEl = document.createElement("blockquote");
    quoteEl.textContent = truncateText(item.quote, opts.maxQuoteLength);
    quoteEl.style.cssText = `font-size:${sz.fontSize};line-height:1.7;color:#1e40af;margin:0 0 16px;`;

    // Bubble tail
    const tail = document.createElement("div");
    tail.style.cssText = "position:absolute;bottom:-8px;left:28px;width:16px;height:16px;background:#f0f4ff;transform:rotate(45deg);";

    card.append(quoteEl, tail);

    // Author below
    const authorEl = document.createElement("div");
    authorEl.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;";

    if (item.avatar && opts.showAvatar) {
      const av = document.createElement("span");
      av.textContent = item.avatar.length <= 2 ? item.avatar : "";
      av.style.cssText = `width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;`;
      authorEl.appendChild(av);
    }

    const n = document.createElement("span");
    n.style.cssText = "font-weight:600;font-size:13px;color:#111827;font-style:normal;";
    n.textContent = item.author;
    authorEl.appendChild(n);

    if (item.role) {
      const r = document.createElement("span");
      r.style.cssText = "font-size:12px;color:#6b7280;font-style:normal;margin-left:4px;";
      r.textContent = item.role;
      authorEl.appendChild(r);
    }

    card.appendChild(authorEl);
  }

  function buildMinimalStyle(sz: { fontSize: string; padding: string; avatarSize: string }): string {
    return `padding:${sz.padding} 0;border-bottom:1px solid #f0f0f0;`;
  }

  function buildMinimalContent(card: HTMLElement, item: TestimonialItem, sz: { fontSize: string; padding: string; avatarSize: string }): void {
    const quoteEl = document.createElement("blockquote");
    quoteEl.textContent = `\u201C${truncateText(item.quote, opts.maxQuoteLength)}\u201D`;
    quoteEl.style.cssText = `font-size:${sz.fontSize};line-height:1.7;color:#374151;margin:0 0 10px;font-style:normal;font-weight:400;`;
    card.appendChild(quoteEl);

    const authorEl = document.createElement("div");
    authorEl.style.cssText = "font-size:12px;color:#9ca3af;";
    const parts: string[] = [item.author];
    if (item.role) parts.push(item.role);
    authorEl.textContent = parts.join(", ");
    card.appendChild(authorEl);
  }

  function buildMediaStyle(sz: { fontSize: string; padding: string; avatarSize: string }): string {
    return `
      display:flex;gap:16px;background:#fafbfc;border-radius:12px;padding:${sz.padding};
      border:1px solid #f0f0f0;
    `;
  }

  function buildMediaContent(card: HTMLElement, item: TestimonialItem, sz: { fontSize: string; padding: string; avatarSize: string }): void {
    // Large avatar on left
    if (item.avatar && opts.showAvatar) {
      const av = document.createElement("div");
      av.textContent = item.avatar.length <= 2 ? item.avatar : "";
      av.style.cssText = `
        width:${parseInt(sz.avatarSize) * 1.5}px;height:${parseInt(sz.avatarSize) * 1.5}px;
        border-radius:12px;flex-shrink:0;background:linear-gradient(135deg,#667eea,#764ba2);
        color:#fff;display:flex;align-items:center;justify-content:center;
        font-size:${parseInt(sz.avatarSize) * 0.5}px;font-weight:600;overflow:hidden;
        ${item.avatar.length > 2 ? `background:url('${item.avatar}') center/cover no-repeat;` : ""}
      `;
      card.appendChild(av);
    }

    // Content on right
    const content = document.createElement("div");
    content.style.flex = "1";

    if (item.rating !== undefined && opts.showRating) {
      const stars = document.createElement("div");
      stars.textContent = renderStars(item.rating);
      stars.style.cssText = "color:#f59e0b;font-size:14px;letter-spacing:2px;margin-bottom:8px;";
      content.appendChild(stars);
    }

    const quote = document.createElement("blockquote");
    quote.textContent = truncateText(item.quote, opts.maxQuoteLength);
    quote.style.cssText = `font-size:${sz.fontSize};line-height:1.6;color:#374151;margin:0 0 12px;font-style:normal;`;
    content.appendChild(quote);

    const name = document.createElement("div");
    name.style.cssText = "font-weight:600;font-size:14px;color:#111827;";
    name.textContent = item.author;
    content.appendChild(name);

    if (item.role || (item.company && opts.showCompany)) {
      const meta = document.createElement("div");
      meta.style.cssText = "font-size:12px;color:#6b7280;";
      const p: string[] = [];
      if (item.role) p.push(item.role);
      if (item.company && opts.showCompany) p.push(item.company);
      meta.textContent = p.join(" \u00B7 ");
      content.appendChild(meta);
    }

    card.appendChild(content);
  }

  // Auto-play
  function startAutoPlay(): void {
    if (!opts.carousel || destroyed || items.length <= 1) return;
    stopAutoPlay();
    autoPlayTimer = setInterval(() => {
      instance.next();
    }, opts.autoPlayInterval!);
  }

  function stopAutoPlay(): void {
    if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
  }

  // Initial render
  render();

  const instance: TestimonialInstance = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: TestimonialItem[]) {
      items = newItems;
      currentIndex = Math.min(currentIndex, items.length - 1);
      render();
    },

    addItem(newItem: TestimonialItem) {
      items.push(newItem);
      render();
    },

    removeItem(id: string) {
      items = items.filter((t) => t.id !== id);
      if (currentIndex >= items.length) currentIndex = Math.max(0, items.length - 1);
      render();
    },

    next() {
      if (items.length <= 1) return;
      currentIndex = (currentIndex + 1) % items.length;
      const track = root.querySelector<HTMLElement>(".testimonial > div > div[style*='flex']");
      if (track) updateCarouselPosition(track);
    },

    prev() {
      if (items.length <= 1) return;
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      const track = root.querySelector<HTMLElement>(".testimonial > div > div[style*='flex']");
      if (track) updateCarouselPosition(track);
    },

    goTo(index: number) {
      if (index < 0 || index >= items.length) return;
      currentIndex = index;
      const track = root.querySelector<HTMLElement>(".testimonial > div > div[style*='flex']");
      if (track) updateCarouselPosition(track);
    },

    destroy() {
      destroyed = true;
      stopAutoPlay();
      root.remove();
    },
  };

  return instance;
}
