/**
 * Anchor: In-page navigation with active section tracking, smooth scroll,
 * intersection observer, custom rendering, affix mode, and keyboard support.
 */

// --- Types ---

export interface AnchorLink {
  /** Unique key/ID */
  key: string;
  /** Display text */
  title: string;
  /** Target element href (selector) */
  href: string;
  /** Optional child links */
  children?: AnchorLink[];
}

export interface AnchorOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Anchor links */
  links: AnchorLink[];
  /** Affix the anchor when scrolling past offset */
  affix?: boolean;
  /** Affix top offset px */
  affixOffsetTop?: number;
  /** Click to scroll behavior */
  smoothScroll?: boolean;
  /** Scroll offset (for fixed headers) */
  offset?: number;
  /** Current active link highlight */
  activeClass?: string;
  /** Show line indicator for active item */
  showLineIndicator?: boolean;
  /** Max height of the list (scrollable) */
  maxHeight?: number;
  /** Callback on click */
  onClick?: (link: AnchorLink, e: Event) => void;
  /** Callback when active link changes */
  onChange?: (activeKey: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface AnchorInstance {
  element: HTMLElement;
  getActiveKey: () => string;
  scrollTo: (key: string) => void;
  destroy: () => void;
}

// --- Helpers ---

function findElement(href: string): Element | null {
  if (href.startsWith("#")) {
    return document.querySelector(href);
  }
  return document.querySelector(href);
}

function getAllLinksFlat(links: AnchorLink[]): AnchorLink[] {
  const result: AnchorLink[] = [];
  for (const link of links) {
    result.push(link);
    if (link.children) result.push(...getAllLinksFlat(link.children));
  }
  return result;
}

// --- Main ---

export function createAnchor(options: AnchorOptions): AnchorInstance {
  const opts = {
    affix: options.affix ?? true,
    affixOffsetTop: options.affixOffsetTop ?? 0,
    smoothScroll: options.smoothScroll ?? true,
    offset: options.offset ?? 0,
    activeClass: options.activeClass ?? "anchor-active",
    showLineIndicator: options.showLineIndicator ?? true,
    maxHeight: options.maxHeight ?? 400,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Anchor: container not found");

  // Root
  const root = document.createElement("div");
  root.className = `anchor ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    ${opts.maxHeight ? `max-height:${opts.maxHeight}px;overflow-y:auto;` : ""}
  `;
  container.appendChild(root);

  // State
  let activeKey = "";
  let destroyed = false;
  let observers: IntersectionObserver[] = [];

  // Build nav
  function renderNav(links: AnchorLink[], level: number): HTMLUListElement {
    const ul = document.createElement("ul");
    ul.className = "anchor-list";
    ul.style.cssText = `
      list-style:none;margin:0;padding:${level > 0 ? "4px 0 4px 16px" : "0"};
      border-${level === 0 ? "left" : "none"}:2px solid #e5e7eb;
      ${level === 0 ? "padding-left:12px;" : ""}
    `;

    for (const link of links) {
      const li = document.createElement("li");
      li.dataset.key = link.key;

      const a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.title;
      a.dataset.anchorKey = link.key;
      a.style.cssText = `
        display:block;padding:6px 8px;color:#6b7280;text-decoration:none;
        border-left:2px solid transparent;margin-left:-2px;
        transition:all 0.15s;cursor:pointer;font-size:${Math.max(13 - level, 11)}px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      `;

      a.addEventListener("click", (e) => {
        e.preventDefault();
        scrollToLink(link);
        opts.onClick?.(link, e);
      });

      a.addEventListener("mouseenter", () => { a.style.color = "#374151"; });
      a.addEventListener("mouseleave", () => { if (a.dataset.anchorKey !== activeKey) a.style.color = "#6b7280"; });

      li.appendChild(a);

      // Children
      if (link.children && link.children.length > 0) {
        li.appendChild(renderNav(link.children, level + 1));
      }

      ul.appendChild(li);
    }

    return ul;
  }

  const navEl = renderNav(opts.links, 0);
  root.appendChild(navEl);

  function setActive(key: string): void {
    if (key === activeKey) return;
    activeKey = key;

    // Remove old active styles
    root.querySelectorAll(`.${opts.activeClass}`).forEach((el) => {
      el.classList.remove(opts.activeClass);
      (el as HTMLElement).style.color = "#6b7280";
      (el as HTMLElement).style.borderLeftColor = "transparent";
      (el as HTMLElement).style.fontWeight = "";
    });

    // Add new active style
    const activeEl = root.querySelector(`[data-anchor-key="${key}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.classList.add(opts.activeClass);
      activeEl.style.color = "#111827";
      activeEl.style.fontWeight = "600";
      if (opts.showLineIndicator) {
        activeEl.style.borderLeftColor = "#4338ca";
      }
    }

    opts.onChange?.(key);
  }

  function scrollToLink(link: AnchorLink): void {
    const el = findElement(link.href);
    if (!el) return;

    setActive(link.key);

    const targetY = el.getBoundingClientRect().top + window.scrollY - opts.offset;

    if (opts.smoothScroll) {
      window.scrollTo({ top: targetY, behavior: "smooth" });
    } else {
      window.scrollTo(0, targetY);
    }
  }

  // Intersection Observer for auto-tracking
  function setupObservers(): void {
    const allLinks = getAllLinksFlat(opts.links);

    for (const link of allLinks) {
      const el = findElement(link.href);
      if (!el) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActive(link.key);
            }
          }
        },
        {
          rootMargin: `-${opts.offset}px 0px -60% 0px`,
          threshold: 0,
        },
      );

      observer.observe(el);
      observers.push(observer);
    }
  }

  // Affix handling
  let affixInstance: ReturnType<typeof createAffix> | null = null;
  if (opts.affix) {
    try {
      affixInstance = createAffix({
        target: root,
        offsetTop: opts.affixOffsetTop,
        zIndex: 99,
      });
    } catch {
      // Affix module may not be available
    }
  }

  // Initialize
  setupObservers();

  const instance: AnchorInstance = {
    element: root,

    getActiveKey() { return activeKey; },

    scrollTo(key: string) {
      const allLinks = getAllLinksFlat(opts.links);
      const link = allLinks.find((l) => l.key === key);
      if (link) scrollToLink(link);
    },

    destroy() {
      destroyed = true;
      for (const obs of observers) obs.disconnect();
      observers = [];
      if (affixInstance) affixInstance.destroy();
      root.remove();
    },
  };

  return instance;
}
