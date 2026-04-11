/**
 * Page Navigation Utilities: Previous/next page navigation, table of
 * contents, reading progress indicator, keyboard shortcuts for page
 * navigation, and article-style page footers.
 */

// --- Types ---

export type PageNavStyle = "minimal" | "detailed" | "cards" | "sidebar";
export type PageNavSize = "sm" | "md" | "lg";

export interface PageNavItem {
  /** Page title */
  title: string;
  /** Page URL or path */
  href?: string;
  /** Description/subtitle */
  description?: string;
  /** Icon HTML */
  icon?: string;
  /** Thumbnail image URL */
  thumbnail?: string;
  /** Estimated read time */
  readTime?: string;
}

export interface PageNavOptions {
  /** Previous page info */
  previous?: PageNavItem | null;
  /** Next page info */
  next?: PageNavItem | null;
  /** Display style */
  style?: PageNavStyle;
  /** Size variant */
  size?: PageNavSize;
  /** Show "Back to top" button */
  showBackToTop?: boolean;
  /** Show reading progress bar */
  showProgress?: boolean;
  /** Progress bar color */
  progressColor?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called on previous click */
  onPrevious?: () => void;
  /** Called on next click */
  onNext?: () => void;
  /** Custom class name */
  className?: string;
}

export interface PageNavInstance {
  /** Root element */
  el: HTMLElement;
  /** Update previous item */
  setPrevious: (item: PageNavItem | null) => void;
  /** Update next item */
  setNext: (item: PageNavItem | null) => void;
  /** Get progress percentage (0-100) */
  getProgress: () => number;
  /** Scroll to top */
  scrollToTop: () => void;
  /** Destroy */
  destroy: () => void;
}

export interface TocItem {
  /** Section ID to scroll to */
  id: string;
  /** Section label */
  label: string;
  /** Nesting level (1 = h2, 2 = h3, etc.) */
  level?: number;
  /** Disabled/hidden? */
  disabled?: boolean;
}

export interface TableOfContentsOptions {
  /** TOC items */
  items: TocItem[];
  /** Title for the TOC block */
  title?: string;
  /** Active section ID (for highlighting) */
  activeId?: string;
  /** Max visible depth */
  maxDepth?: number;
  /** Show section numbers */
  numbered?: boolean;
  /** Sticky positioning? */
  sticky?: boolean;
  /** Scroll container for spy behavior */
  scrollContainer?: HTMLElement | Window;
  /** Container element */
  container?: HTMLElement;
  /** Called when a TOC item is clicked */
  onItemClick?: (item: TocItem) => void;
  /** Called when active section changes (scroll spy) */
  onActiveChange?: (id: string | null) => void;
  /** Custom class name */
  className?: string;
}

export interface TableOfContentsInstance {
  /** Root element */
  el: HTMLElement;
  /** Set active item */
  setActiveId: (id: string) => void;
  /** Update items */
  setItems: (items: TocItem[]) => void;
  /** Get active ID */
  getActiveId: () => string | null;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const NAV_SIZES: Record<PageNavSize, { padding: string; fontSize: { title: string; desc: string }; btnPadding: string }> = {
  sm: { padding: "12px 16px", fontSize: { title: "13px", desc: "11px" }, btnPadding: "6px 12px" },
  md: { padding: "18px 24px", fontSize: { title: "15px", desc: "12px" }, btnPadding: "8px 16px" },
  lg: { padding: "24px 32px", fontSize: { title: "17px", desc: "13px" }, btnPadding: "10px 20px" },
};

// --- Core Factory: Page Navigation ---

/**
 * Create a previous/next page navigation component.
 *
 * @example
 * ```ts
 * const nav = createPageNav({
 *   previous: { title: "Getting Started", href: "/getting-started" },
 *   next: { title: "Advanced Usage", href: "/advanced", description: "Deep dive into features" },
 *   style: "detailed",
 *   showProgress: true,
 * });
 * ```
 */
export function createPageNav(options: PageNavOptions): PageNavInstance {
  const {
    previous,
    next,
    style = "detailed",
    size = "md",
    showBackToTop = false,
    showProgress = false,
    progressColor = "#3b82f6",
    container,
    onPrevious,
    onNext,
    className,
  } = options;

  let _previous = previous ?? null;
  let _next = next ?? null;
  let _progressEl: HTMLElement | null = null;
  let _backToTopEl: HTMLElement | null = null;
  let _scrollHandler: (() => void) | null = null;

  const ns = NAV_SIZES[size];

  // Root
  const root = document.createElement("nav");
  root.className = `page-nav ${style} ${size} ${className ?? ""}`.trim();
  root.setAttribute("aria-label", "Page navigation");
  root.style.cssText =
    "display:flex;flex-direction:column;gap:12px;margin-top:32px;" +
    "border-top:1px solid #e5e7eb;padding-top:20px;";

  // Progress bar
  if (showProgress) {
    _progressEl = document.createElement("div");
    _progressEl.className = "page-nav-progress";
    _progressEl.style.cssText =
      "position:fixed;top:0;left:0;height:3px;width:0%;" +
      `background:${progressColor};z-index:9999;transition:width 0.1s linear;pointer-events:none;`;
    document.body.appendChild(_progressEl);

    _scrollHandler = () => {
      if (!_progressEl) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      _progressEl.style.width = `${pct}%`;
    };
    window.addEventListener("scroll", _scrollHandler, { passive: true });
  }

  // Navigation content area
  const contentArea = document.createElement("div");
  contentArea.className = "page-nav-content";
  contentArea.style.cssText =
    "display:flex;gap:16px;align-items:stretch;";
  root.appendChild(contentArea);

  function renderNav(): void {
    contentArea.innerHTML = "";

    // Previous button/link
    if (_previous) {
      const prevSection = _renderNavItem(_previous, "prev", size);
      contentArea.appendChild(prevSection);
    } else {
      const spacer = document.createElement("div");
      spacer.style.flex = "1";
      contentArea.appendChild(spacer);
    }

    // Next button/link
    if (_next) {
      const nextSection = _renderNavItem(_next, "next", size);
      contentArea.appendChild(nextSection);
    } else {
      const spacer = document.createElement("div");
      spacer.style.flex = "1";
      contentArea.appendChild(spacer);
    }

    // Back to top
    if (showBackToTop) {
      _backToTopEl = document.createElement("button");
      _backToTopEl.type = "button";
      _backToTopEl.textContent = "Back to top";
      _backToTopEl.className = "back-to-top";
      _backToTopEl.style.cssText =
        "display:flex;align-items:center;justify-content:center;margin-top:8px;" +
        `padding:${ns.btnPadding};border:1px solid #d1d5db;border-radius:8px;` +
        "background:#fff;color:#6b7280;font-size:12px;cursor:pointer;" +
        "transition:all 0.15s;width:100%;";
      _backToTopEl.addEventListener("click", () => scrollToTop());
      _backToTopEl.addEventListener("mouseenter", () => {
        _backToTopEl!.style.borderColor = "#93c5fd"; _backToTopEl!.style.color = "#3b82f6";
      });
      _backToTopEl.addEventListener("mouseleave", () => {
        _backToTopEl!.style.borderColor = "#d1d5db"; _backToTopEl!.style.color = "#6b7280";
      });
      root.appendChild(_backToTopEl);
    }
  }

  function _renderNavItem(item: PageNavItem, direction: "prev" | "next", sz: PageNavSize): HTMLElement {
    const isPrev = direction === "prev";
    const sns = NAV_SIZES[sz];
    const section = document.createElement("div");
    section.className = `page-nav-${direction}`;
    section.style.cssText =
      `flex:1;display:flex;flex-direction:${isPrev ? "row" : "row-reverse"};align-items:center;` +
      `gap:12px;padding:${sns.padding};border:1px solid #e5e7eb;border-radius:10px;` +
      "background:#fff;cursor:pointer;text-decoration:none;transition:border-color 0.15s,box-shadow 0.15s;";

    section.addEventListener("mouseenter", () => {
      section.style.borderColor = "#bfdbfe";
      section.style.boxShadow = "0 2px 8px rgba(59,130,246,0.08)";
    });
    section.addEventListener("mouseleave", () => {
      section.style.borderColor = "#e5e7eb";
      section.style.boxShadow = "";
    });

    const clickHandler = () => {
      if (isPrev) onPrevious?.(); else onNext?.();
      if (item.href) window.location.href = item.href;
    };
    section.addEventListener("click", clickHandler);

    // Arrow icon
    const arrow = document.createElement("span");
    arrow.className = "nav-arrow";
    arrow.innerHTML = isPrev ? "&larr;" : "&rarr;";
    arrow.style.cssText =
      "font-size:18px;color:#9ca3af;flex-shrink:0;line-height:1;";

    // Text area
    const textArea = document.createElement("div");
    textArea.style.cssText =
      `text-align:${isPrev ? "left" : "right"};min-width:0;`;

    const label = document.createElement("span");
    label.className = "nav-label";
    label.textContent = isPrev ? "Previous" : "Next";
    label.style.cssText = "font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;font-weight:500;";
    textArea.appendChild(label);

    const title = document.createElement("span");
    title.className = "nav-title";
    title.textContent = item.title;
    title.style.cssText =
      `display:block;font-size:${sns.fontSize.title};font-weight:600;color:#111827;line-height:1.3;` +
      "overflow:hidden;text-ellipsis;white-space:nowrap;max-width:280px;";
    textArea.appendChild(title);

    if (item.description && style !== "minimal") {
      const desc = document.createElement("span");
      desc.className = "nav-description";
      desc.textContent = item.description;
      desc.style.cssText =
        `display:block;font-size:${sns.fontSize.desc};color:#6b7280;margin-top:2px;` +
        "overflow:hidden;text-ellipsis;white-space:nowrap;max-width:280px;";
      textArea.appendChild(desc);
    }

    if (isPrev) {
      section.appendChild(arrow);
      section.appendChild(textArea);
    } else {
      section.appendChild(textArea);
      section.appendChild(arrow);
    }

    return section;
  }

  function setPrevious(item: PageNavItem | null): void {
    _previous = item;
    renderNav();
  }

  function setNext(item: PageNavItem | null): void {
    _next = item;
    renderNav();
  }

  function getProgress(): number {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
  }

  function scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function destroy(): void {
    if (_progressEl) _progressEl.remove();
    if (_scrollHandler) window.removeEventListener("scroll", _scrollHandler);
    root.remove();
  }

  renderNav();

  (container ?? document.body).appendChild(root);

  return { el: root, setPrevious, setNext, getProgress, scrollToTop, destroy };
}

// --- Core Factory: Table of Contents ---

/**
 * Create a table of contents with scroll-spy highlighting.
 *
 * @example
 * ```ts
 * const toc = createTableOfContents({
 *   items: [
 *     { id: "intro", label: "Introduction", level: 1 },
 *     { id: "setup", label: "Setup", level: 1 },
 *     { id: "install", label: "Installation", level: 2 },
 *     { id: "config", label: "Configuration", level: 2 },
 *     { id: "usage", label: "Usage", level: 1 },
 *   ],
 *   sticky: true,
 * });
 * ```
 */
export function createTableOfContents(options: TableOfContentsOptions): TableOfContentsInstance {
  const {
    items,
    title = "Contents",
    activeId,
    maxDepth = 3,
    numbered = false,
    sticky = false,
    scrollContainer,
    container,
    onItemClick,
    onActiveChange,
    className,
  } = options;

  let _activeId = activeId ?? null;
  let _items = [...items];
  let _observer: IntersectionObserver | null = null;
  let _cleanupFns: Array<() => void> = [];

  // Root
  const root = document.createElement("nav");
  root.className = `table-of-contents ${className ?? ""}`.trim();
  root.setAttribute("aria-label", "Table of Contents");

  let baseStyles =
    "width:240px;font-size:13px;";

  if (sticky) {
    baseStyles += "position:sticky;top:20px;max-height:calc(100vh - 40px);overflow-y:auto;";
  }
  root.style.cssText = baseStyles;

  // Title
  if (title) {
    const titleEl = document.createElement("h4");
    titleEl.className = "toc-title";
    titleEl.textContent = title;
    titleEl.style.cssText =
      "margin:0 0 10px 0;font-size:12px;font-weight:600;color:#6b7280;" +
      "text-transform:uppercase;letter-spacing:0.05em;";
    root.appendChild(titleEl);
  }

  // List
  const list = document.createElement("ul");
  list.className = "toc-list";
  list.style.cssText =
    "list-style:none;margin:0;padding:0;border-left:2px solid #e5e7eb;";
  root.appendChild(list);

  function _render(): void {
    list.innerHTML = "";
    let counter = [0];

    _items.forEach((item) => {
      if ((item.level ?? 1) > maxDepth) return;

      const li = document.createElement("li");
      li.style.cssText =
        `padding-left:${Math.min((item.level ?? 1) - 1, 3) * 14 + 4}px;`;

      const link = document.createElement("a");
      link.href = `#${item.id}`;
      link.className = "toc-link";
      link.dataset.tocId = item.id;
      link.style.cssText =
        "display:flex;align-items:center;gap:6px;padding:4px 8px;color:#6b7280;" +
        "text-decoration:none;border-left:2px solid transparent;margin-left:-2px;" +
        "transition:all 0.15s;font-size:13px;line-height:1.5;" +
        (item.disabled ? "opacity:0.4;pointer-events:none;cursor:default;" : "cursor:pointer;") +
        (item.id === _activeId
          ? "color:#111827;font-weight:600;border-left-color:#3b82f6;background:#eff6ff;"
          : "");

      if (!item.disabled) {
        link.addEventListener("mouseenter", () => {
          if (item.id !== _activeId) {
            link.style.color = "#374151";
            link.style.background = "#f9fafb";
          }
        });
        link.addEventListener("mouseleave", () => {
          if (item.id !== _activeId) {
            link.style.color = "#6b7280";
            link.style.background = "";
          }
        });

        link.addEventListener("click", (e) => {
          e.preventDefault();
          setActiveId(item.id);
          onItemClick?.(item);
          const target = document.getElementById(item.id);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      // Number prefix
      if (numbered && (item.level ?? 1) === 1) {
        counter[0]++;
        const num = document.createElement("span");
        num.textContent = String(counter[0]);
        num.style.cssText =
          "font-size:11px;font-weight:600;color:#9ca3af;min-width:16px;" +
          "font-variant-numeric:tabular-nums;";
        link.prepend(num);
      }

      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      labelSpan.style.cssText =
        "overflow:hidden;text-ellipsis;white-space:nowrap;flex:1;min-width:0;";
      link.appendChild(labelSpan);

      li.appendChild(link);
      list.appendChild(li);
    });

    // Set up scroll spy
    _setupScrollSpy();
  }

  function _setupScrollSpy(): void {
    if (_observer) _observer.disconnect();

    const validItems = _items.filter((i) => !i.disabled && (i.level ?? 1) <= maxDepth);
    if (validItems.length === 0) return;

    _observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that's most visible / closest to top
        let bestEntry: IntersectionObserverEntry | null = null;
        let bestRatio = 0;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        }

        if (bestEntry) {
          const id = (bestEntry.target as HTMLElement).id;
          if (id !== _activeId) {
            _activeId = id;
            _updateActiveVisuals();
            onActiveChange?.(_activeId);
          }
        }
      },
      {
        root: scrollContainer instanceof HTMLElement ? scrollContainer : null,
        rootMargin: "-60px 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    for (const item of validItems) {
      const el = document.getElementById(item.id);
      if (el) _observer.observe(el);
    }
  }

  function _updateActiveVisuals(): void {
    const links = list.querySelectorAll(".toc-link");
    links.forEach((link) => {
      const l = link as HTMLElement;
      const isActive = l.dataset.tocId === _activeId;
      l.style.color = isActive ? "#111827" : "#6b7280";
      l.style.fontWeight = isActive ? "600" : "400";
      l.style.borderLeftColor = isActive ? "#3b82f6" : "transparent";
      l.style.background = isActive ? "#eff6ff" : "";
    });
  }

  function setActiveId(id: string): void {
    _activeId = id;
    _updateActiveVisuals();
  }

  function setItems(newItems: TocItem[]): void {
    _items = newItems;
    _render();
  }

  function getActiveId(): string | null { return _activeId; }

  function destroy(): void {
    if (_observer) _observer.disconnect();
    for (const fn of _cleanupFns) fn();
    root.remove();
  }

  _render();

  (container ?? document.body).appendChild(root);

  return { el: root, setActiveId, setItems, getActiveId, destroy };
}
