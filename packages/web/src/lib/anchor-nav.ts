/**
 * Anchor Navigation: Smooth scroll anchor links with scroll spy,
 * active state tracking, offset compensation, multiple nav groups,
 * URL hash sync, and accessible semantics.
 */

// --- Types ---

export interface AnchorLink {
  /** Target element ID (without #) */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon/emoji */
  icon?: string;
  /** Custom href (default: #id) */
  href?: string;
}

export interface AnchorNavOptions {
  /** Nav container element or selector */
  container: HTMLElement | string;
  /** Anchor links to track */
  links: AnchorLink[];
  /** Scroll offset in px (for fixed headers) */
  offset?: number;
  /** Active link highlight color */
  activeColor?: string;
  /** Normal text color */
  textColor?: string;
  /** Font size (px) */
  fontSize?: number;
  /** Smooth scroll duration (ms) */
  smoothDuration?: number;
  /** Update URL hash on scroll? */
  updateHash?: boolean;
  /** Callback when active anchor changes */
  onActiveChange?: (id: string | null) => void;
  /** Callback on click before scroll */
  onClick?: (link: AnchorLink) => void;
  /** Custom CSS class */
  className?: string;
  /** Show active indicator line/bar */
  showIndicator?: boolean;
  /** Indicator style: "line" | "background" | "pill" */
  indicatorStyle?: "line" | "background" | "pill";
}

export interface AnchorNavInstance {
  element: HTMLElement;
  getActiveId: () => string | null;
  setActive: (id: string) => void;
  setLinks: (links: AnchorLink[]) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createAnchorNav(options: AnchorNavOptions): AnchorNavInstance {
  const opts = {
    offset: options.offset ?? 80,
    activeColor: options.activeColor ?? "#4338ca",
    textColor: options.textColor ?? "#6b7280",
    fontSize: options.fontSize ?? 13,
    smoothDuration: options.smoothDuration ?? 400,
    updateHash: options.updateHash ?? true,
    showIndicator: options.showIndicator ?? true,
    indicatorStyle: options.indicatorStyle ?? "line",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AnchorNav: container not found");

  container.className = `anchor-nav ${opts.className}`;
  container.style.cssText = `
    display:flex;flex-direction:column;gap:2px;font-family:-apple-system,sans-serif;
    font-size:${opts.fontSize}px;
  `;

  let activeId: string | null = null;
  let destroyed = false;
  const linkEls = new Map<string, HTMLElement>();
  const observer: IntersectionObserver | null = null;

  // Build nav items
  function render(): void {
    container.innerHTML = "";

    for (const link of opts.links) {
      const item = document.createElement("a");
      item.className = `anchor-link${link.id === activeId ? " active" : ""}`;
      item.href = link.href ?? `#${link.id}`;
      item.dataset.anchorId = link.id;
      item.style.cssText = `
        display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:4px;
        text-decoration:none;color:${link.id === activeId ? opts.activeColor : opts.textColor};
        font-weight:${link.id === activeId ? "600" : "400"};
        transition:all 0.15s ease;cursor:pointer;position:relative;
        white-space:nowrap;line-height:1.3;
      `;

      if (opts.showIndicator && link.id === activeId) {
        switch (opts.indicatorStyle) {
          case "line":
            item.style.borderBottom = `2px solid ${opts.activeColor}`;
            break;
          case "background":
            item.style.background = `${opts.activeColor}12`;
            break;
          case "pill":
            item.style.background = `${opts.activeColor}15`;
            item.style.paddingLeft = "14px";
            item.style.paddingRight = "14px";
            break;
        }
      }

      if (link.icon) {
        const iconEl = document.createElement("span");
        iconEl.textContent = link.icon;
        iconEl.style.cssText = "font-size:14px;width:18px;text-align:center;";
        item.appendChild(iconEl);
      }

      const labelEl = document.createElement("span");
      labelEl.textContent = link.label;
      labelEl.className = "anchor-label";
      item.appendChild(labelEl);

      item.addEventListener("click", (e) => {
        e.preventDefault();
        opts.onClick?.(link);
        scrollToAnchor(link.id);
        if (opts.updateHash) {
          history.pushState(null, "", `#${link.id}`);
        }
        setActive(link.id);
      });

      item.addEventListener("mouseenter", () => {
        if (link.id !== activeId) { item.style.background = "#f5f3ff"; }
      });
      item.addEventListener("mouseleave", () => {
        if (link.id !== activeId) { item.style.background = ""; }
      });

      container.appendChild(item);
      linkEls.set(link.id, item);
    }

    // Setup observer for spy
    setupSpy();
  }

  function scrollToAnchor(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;

    const top = el.getBoundingClientRect().top + window.scrollY - opts.offset;
    window.scrollTo({ top, behavior: "smooth" as ScrollBehavior });
  }

  function setActive(id: string): void {
    if (id === activeId) return;
    activeId = id;

    // Update visual states
    for (const [lid, el] of linkEls) {
      const isActive = lid === id;
      el.classList.toggle("active", isActive);
      el.style.color = isActive ? opts.activeColor : opts.textColor;
      el.style.fontWeight = isActive ? "600" : "400";

      if (opts.showIndicator) {
        switch (opts.indicatorStyle) {
          case "line":
            el.style.borderBottom = isActive ? `2px solid ${opts.activeColor}` : "";
            break;
          case "background":
            el.style.background = isActive ? `${opts.activeColor}12` : "";
            break;
          case "pill":
            el.style.background = isActive ? `${opts.activeColor}15` : "";
            break;
        }
      }
    }

    opts.onActiveChange?.(id);
  }

  function setupSpy(): void {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id) setActive(id);
          }
        }
      },
      {
        rootMargin: `-${opts.offset}px 0px -${opts.offset / 2}px 0px`,
        threshold: 0,
      },
    );

    for (const link of opts.links) {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    }
  }

  // Initial render
  render();

  return {
    element: container,

    getActiveId() { return activeId; },

    setActive(id: string) { setActive(id); },

    setLinks(links: AnchorLink[]) {
      opts.links = links;
      render();
    },

    destroy() {
      destroyed = true;
      if (observer) observer.disconnect();
      container.innerHTML = "";
    },
  };
}
