/**
 * Testimonial Utilities: Testimonial carousel/grid with quote styling,
 * author info, auto-rotation, navigation dots, multiple layout modes,
 * and animated transitions.
 */

// --- Types ---

export interface TestimonialAuthor {
  /** Name */
  name: string;
  /** Role / company */
  role?: string;
  /** Avatar URL or element */
  avatar?: string | HTMLElement;
  /** Company logo URL */
  companyLogo?: string;
}

export interface Testimonial {
  /** Unique ID */
  id: string;
  /** Author */
  author: TestimonialAuthor;
  /** Quote text */
  quote: string;
  /** Rating (1-5, optional) */
  rating?: number;
  /** Custom data */
  data?: unknown;
}

export type TestimonialLayout = "carousel" | "grid" | "list" | "masonry";

export interface TestimonialOptions {
  /** Testimonials to display */
  testimonials: Testimonial[];
  /** Layout mode */
  layout?: TestimonialLayout;
  /** Cards per row (for grid layout). Default 3 */
  columns?: number;
  /** Gap between cards (px). Default 20 */
  gap?: number;
  /** Auto-rotate interval in ms (0 = no auto). Default 5000 */
  autoPlayInterval?: number;
  /** Show navigation arrows? */
  showArrows?: boolean;
  /** Show dots indicator? */
  showDots?: boolean;
  /** Animation duration (ms). Default 400 */
  animationDuration?: number;
  /** Quote mark style ("icon" | "border-left" | "none") */
  quoteStyle?: "icon" | "border-left" | "none";
  /** Card background color */
  cardBg?: string;
  /** Text color */
  textColor?: string;
  /** Accent color (for links/buttons) */
  accentColor?: string;
  /** Max width of the container */
  maxWidth?: string;
  /** Custom class */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when testimonial changes (carousel) */
  onChange?: (testimonial: Testimonial, index: number) => void;
}

export interface TestimonialInstance {
  /** Root element */
  el: HTMLElement;
  /** Go to specific testimonial */
  goTo: (index: number) => void;
  /** Next testimonial */
  next: () => void;
  /** Previous testimonial */
  prev: () => void;
  /** Start auto-play */
  play: () => void;
  /** Stop auto-play */
  stop: () => void;
  /** Get current index */
  getCurrentIndex: () => number;
  /** Update testimonials dynamically */
  setTestimonials: (t: Testimonial[]) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// --- Core Factory ---

export function createTestimonials(options: TestimonialOptions): TestimonialInstance {
  const {
    testimonials,
    layout = "carousel",
    columns = 3,
    gap = 20,
    autoPlayInterval = 5000,
    showArrows = true,
    showDots = true,
    animationDuration = 400,
    quoteStyle = "icon",
    cardBg = "#fff",
    textColor = "#374151",
    accentColor = "#3b82f6",
    maxWidth = "800px",
    className,
    container,
    onChange,
  } = options;

  let _testimonials = [...testimonials];
  let _currentIndex = 0;
  let _playing = autoPlayInterval > 0;
  let playTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanupFns: Array<() => void> = [];

  // Root
  const root = document.createElement("div");
  root.className = `testimonials ${layout} ${className ?? ""}`.trim();
  root.style.cssText =
    `max-width:${maxWidth};margin:0 auto;position:relative;`;

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "testimonials-content";
  root.appendChild(contentArea);

  // Navigation
  let dotsContainer: HTMLElement | null = null;
  if (showDots && layout === "carousel") {
    dotsContainer = document.createElement("div");
    dotsContainer.className = "testimonials-dots";
    dotsContainer.style.cssText =
      "display:flex;justify-content:center;gap:6px;margin-top:16px;";
    root.appendChild(dotsContainer);
  }

  // Render
  function render(): void {
    contentArea.innerHTML = "";

    switch (layout) {
      case "carousel":
        renderCarousel();
        break;
      case "grid":
        renderGrid();
        break;
      case "list":
        renderList();
        break;
      default:
        renderCarousel();
    }

    if (dotsContainer && layout === "carousel") {
      renderDots();
    }
  }

  function buildCard(t: Testimonial): HTMLElement {
    const card = document.createElement("div");
    card.className = "testimonial-card";
    card.dataset.id = t.id;
    card.style.cssText =
      `background:${cardBg};border-radius:12px;padding:24px;color:${textColor};` +
      "box-shadow:0 2px 8px rgba(0,0,0,0.06);position:relative;";

    // Quote mark
    if (quoteStyle === "icon") {
      const qm = document.createElement("div");
      qm.innerHTML = "&#8220;";
      qm.style.cssText =
        "position:absolute;top:14px;left:18px;font-size:40px;" +
        `color:#e5e7eb;line-height:1;font-family:serif;`;
      card.appendChild(qm);
    }

    // Content wrapper with padding for quote icon
    const inner = document.createElement("div");
    inner.style.cssText = quoteStyle === "icon" ? "padding-left:28px;" : "";

    // Quote text
    const quoteEl = document.createElement("blockquote");
    quoteEl.textContent = t.quote;
    quoteEl.style.cssText =
      "margin:0 0 16px;font-size:15px;line-height:1.7;font-style:italic;border:none;";
    if (quoteStyle === "border-left") {
      quoteEl.style.borderLeft = `3px solid ${accentColor}`;
      quoteEl.style.paddingLeft = "14px";
    }
    inner.appendChild(quoteEl);

    // Rating stars
    if (t.rating) {
      const stars = document.createElement("div");
      let starHtml = "";
      for (let i = 1; i <= 5; i++) {
        starHtml += `<span style="color:${i <= t.rating! ? '#fbbf24' : '#e5e7eb'};font-size:13px;">${i <= t.rating! ? '&#9733;' : '&#9734;'}</span>`;
      }
      stars.innerHTML = starHtml;
      stars.style.marginBottom = "12px";
      inner.appendChild(stars);
    }

    // Author section
    const authorRow = document.createElement("div");
    authorRow.style.display = "flex";
    authorRow.style.alignItems = "center";
    authorRow.style.gap = "10px";

    // Avatar
    const avatarSize = 44;
    const avatar = document.createElement("div");
    avatar.style.cssText =
      `width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;flex-shrink:0;` +
      "background:#e5e7eb;display:flex;align-items:center;justify-content:center;" +
      "font-size:14px;font-weight:600;color:#fff;overflow:hidden;";
    if (t.author.avatar) {
      if (typeof t.author.avatar === "string") {
        avatar.innerHTML = `<img src="${t.author.avatar}" style="width:100%;height:100%;object-fit:cover;" alt="" />`;
      } else {
        avatar.appendChild(t.author.avatar.cloneNode(true));
      }
    } else {
      avatar.style.background = accentColor;
      avatar.textContent = getInitials(t.author.name);
    }
    authorRow.appendChild(avatar);

    // Name + Role
    const authorInfo = document.createElement("div");
    const nameEl = document.createElement("strong");
    nameEl.textContent = t.author.name;
    nameEl.style.fontSize = "14px";
    nameEl.style.color = "#111827";
    authorInfo.appendChild(nameEl);

    if (t.author.role) {
      const roleEl = document.createElement("div");
      roleEl.textContent = t.author.role;
      roleEl.style.fontSize = "13px";
      roleEl.style.color = "#9ca3af";
      authorInfo.appendChild(roleEl);
    }
    authorRow.appendChild(authorInfo);

    inner.appendChild(authorRow);
    card.appendChild(inner);
    return card;
  }

  function renderCarousel(): void {
    if (_testimonials.length === 0) return;

    contentArea.style.position = "relative";
    contentArea.style.overflow = "hidden";
    contentArea.style.minHeight = "200px";

    const card = buildCard(_testimonials[_currentIndex]);
    card.style.opacity = "0";
    card.style.transform = "translateX(20px)";
    contentArea.appendChild(card);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.transition = `opacity ${animationDuration}ms ease, transform ${animationDuration}ms ease`;
        card.style.opacity = "1";
        card.style.transform = "translateX(0)";
      });
    });

    // Arrows
    if (showArrows && _testimonials.length > 1) {
      _renderArrows();
    }
  }

  function renderGrid(): void {
    contentArea.style.display = "grid";
    contentArea.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    contentArea.style.gap = `${gap}px`;

    _testimonials.forEach((t) => {
      const card = buildCard(t);
      contentArea.appendChild(card);
    });
  }

  function renderList(): void {
    contentArea.style.display = "flex";
    contentArea.style.flexDirection = "column";
    contentArea.style.gap = `${gap}px`;

    _testimonials.forEach((t) => {
      const card = buildCard(t);
      contentArea.appendChild(card);
    });
  }

  function _renderArrows(): void {
    // Remove existing
    root.querySelectorAll(".testimonial-arrow").forEach((el) => el.remove());

    if (_testimonials.length <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "testimonial-arrow testimonial-prev";
    prevBtn.innerHTML = "&lsaquo;";
    prevBtn.setAttribute("aria-label", "Previous");
    prevBtn.style.cssText =
      "position:absolute;top:50%;left:-12px;transform:translateY(-50%);" +
      "width:32px;height:32px;border-radius:50%;border:none;background:#fff;" +
      `color:${textColor};font-size:18px;display:flex;align-items:center;` +
      "justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);cursor:pointer;z-index:2;";
    prevBtn.addEventListener("click", () => prev());
    root.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "testimonial-arrow testimonial-next";
    nextBtn.innerHTML = "&rsaquo;";
    nextBtn.setAttribute("aria-label", "Next");
    nextBtn.style.cssText =
      "position:absolute;top:50%;right:-12px;transform:translateY(-50%);" +
      "width:32px;height:32px;border-radius:50%;border:none;background:#fff;" +
      `color:${textColor};font-size:18px;display:flex;align-items:center;` +
      "justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);cursor:pointer;z-index:2;";
    nextBtn.addEventListener("click", () => next());
    root.appendChild(nextBtn);
  }

  function renderDots(): void {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";
    _testimonials.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.style.cssText =
        `width:8px;height:8px;border-radius:50%;border:none;cursor:pointer;padding:0;` +
        `background:${i === _currentIndex ? accentColor : '#d1d5db'};` +
        "transition:background 0.2s;";
      dot.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(dot);
    });
  }

  // --- Methods ---

  function goTo(index: number): void {
    if (index < 0 || index >= _testimonials.length || index === _currentIndex) return;
    _currentIndex = index;
    render();
    onChange?.(_testimonials[index], index);
  }

  function next(): void {
    const nextIdx = (_currentIndex + 1) % _testimonials.length;
    goTo(nextIdx);
  }

  function prev(): void {
    const prevIdx = (_currentIndex - 1 + _testimonials.length) % _testimonials.length;
    goTo(prevIdx);
  }

  function play(): void { _playing = true; startAutoPlay(); }
  function stop(): void { _playing = false; stopAutoPlay(); }
  function getCurrentIndex(): number { return _currentIndex; }

  function setTestimonials(newT: Testimonial[]): void {
    _testimonials = newT;
    _currentIndex = Math.min(_currentIndex, _testimonials.length - 1);
    render();
  }

  function destroy(): void {
    stopAutoPlay();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    root.remove();
  }

  // --- Auto-play ---

  function startAutoPlay(): void {
    stopAutoPlay();
    playTimer = setInterval(next, autoPlayInterval);
  }

  function stopAutoPlay(): void {
    if (playTimer !== null) { clearInterval(playTimer); playTimer = null; }
  }

  // Init
  (container ?? document.body).appendChild(root);
  render();

  if (_playing) startAutoPlay();

  return { el: root, goTo, next, prev, play, stop, getCurrentIndex, setTestimonials, destroy };
}
