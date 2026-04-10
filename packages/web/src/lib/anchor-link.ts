/**
 * Anchor Link Navigation: Smooth scroll to sections, active tracking via
 * Intersection Observer, scroll progress indicator, back-to-top,
 * multiple anchor groups, hash-based routing, and accessibility.
 */

// --- Types ---

export interface AnchorLink {
  /** Unique ID (matches target element's id) */
  id: string;
  /** Display label */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface AnchorGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Anchor links in this group */
  links: AnchorLink[];
  /** Target container where the section elements live (default: document) */
  targetContainer?: HTMLElement | Document;
  /** Active link ID */
  defaultActiveId?: string;
  /** Scroll offset in px (default: 0, accounts for fixed headers) */
  offset?: number;
  /** Smooth scroll duration in ms (default: 400) */
  smoothDuration?: number;
  /** Show active indicator line/dot? */
  showIndicator?: boolean;
  /** Indicator style: 'line' or 'dot' */
  indicatorStyle?: "line" | "dot";
  /** Horizontal or vertical layout */
  orientation?: "horizontal" | "vertical";
  /** Callback when active anchor changes */
  onActiveChange?: (id: string, link: AnchorLink) => void;
  /** Callback on click before scroll */
  onClick?: (id: string, link: AnchorLink) => void | boolean;
  /** Update URL hash on click? */
  updateHash?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface AnchorGroupInstance {
  element: HTMLElement;
  /** Get current active ID */
  getActiveId: () => string;
  /** Set active ID programmatically */
  setActiveId: (id: string) => void;
  /** Scroll to an anchor by ID */
  scrollTo: (id: string) => void;
  /** Get all links */
  getLinks: () => AnchorLink[];
  /** Update links dynamically */
  setLinks: (links: AnchorLink[]) => void;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Main ---

export function createAnchorGroup(options: AnchorGroupOptions): AnchorGroupInstance {
  const opts = {
    offset: options.offset ?? 0,
    smoothDuration: options.smoothDuration ?? 400,
    showIndicator: options.showIndicator ?? true,
    indicatorStyle: options.indicatorStyle ?? "line",
    orientation: options.orientation ?? "vertical",
    updateHash: options.updateHash ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AnchorGroup: container not found");

  let links = [...options.links];
  let activeId = opts.defaultActiveId ?? (links[0]?.id ?? "");
  let destroyed = false;

  // Root nav element
  const root = document.createElement("nav");
  root.className = `anchor-group anchor-${opts.orientation} ${opts.className}`;
  root.setAttribute("role", "navigation");
  root.setAttribute("aria-label", "Section navigation");

  if (opts.orientation === "vertical") {
    root.style.cssText = `
      display:flex;flex-direction:column;gap:2px;padding:8px 4px;
      font-family:-apple-system,sans-serif;font-size:13px;color:#6b7280;
      position:${opts.showIndicator ? "relative" : ""};
    border-right:1px solid #e5e7eb;
  `;
  } else {
    root.style.cssText = `
      display:flex;align-items:center;gap:16px;padding:8px 4px;
      font-family:-apple-system,sans-serif;font-size:13px;color:#6b7280;
      position:relative;border-bottom:1px solid #e5e7eb;
    `;
  }

  // Build links
  function render(): void {
    root.innerHTML = "";

    for (const link of links) {
      const isActive = link.id === activeId;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.id = link.id;
      btn.disabled = link.disabled ?? false;
      btn.setAttribute("role", "link");

      if (opts.orientation === "vertical") {
        btn.style.cssText = `
          display:flex;align-items:center;gap:8px;width:100%;
          padding:6px 10px;border-radius:6px;text-align:left;
          cursor:pointer;border:none;background:none;font-family:inherit;
          color:${isActive ? "#4f46e5" : "#6b7280"};
          font-weight:${isActive ? "600" : "400"};
          transition:all 0.15s;white-space:nowrap;position:relative;
          ${link.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
        `;
      } else {
        btn.style.cssText = `
          display:inline-flex;align-items:center;gap:4px;padding:8px 12px;
          border-radius:6px;border:none;background:none;cursor:pointer;
          font-family:inherit;color:${isActive ? "#4f46e5" : "#6b7280"};
          font-weight:${isActive ? "600" : "400"};
          font-size:13px;transition:all 0.15s;position:relative;
          ${link.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
        `;
      }

      // Icon
      if (link.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.textContent = link.icon;
        iconSpan.style.cssText = "flex-shrink:0;font-size:14px;";
        btn.appendChild(iconSpan);
      }

      // Label
      const labelSpan = document.createElement("span");
      labelSpan.textContent = link.label;
      labelSpan.style.cssText = "overflow:hidden;text-overflow:ellipsis;";
      btn.appendChild(labelSpan);

      // Active indicator
      if (opts.showIndicator && isActive) {
        const indicator = document.createElement("span");
        indicator.className = "anchor-indicator";

        if (opts.indicatorStyle === "line") {
          if (opts.orientation === "vertical") {
            indicator.style.cssText = `
              position:absolute;left:0;top:4px;bottom:4px;width:3px;
              background:#4f46e5;border-radius:2px;
            `;
          } else {
            indicator.style.cssText = `
              position:absolute;bottom:-1px;left:10%;right:10%;
              height:2px;background:#4f46e5;border-radius:1px;
            `;
          }
        } else {
          indicator.style.cssText = `
            width:6px;height:6px;border-radius:50%;
            background:#4f46e5;position:absolute;
            ${opts.orientation === "vertical" ? "right:-9px;top:50%;transform:translateY(-50%);" : "bottom:-9px;left:50%;transform:translateX(-50%);"}
          `;
        }
        btn.appendChild(indicator);
      }

      // Click handler
      if (!link.disabled) {
        btn.addEventListener("click", () => {
          const shouldContinue = opts.onClick?.(link.id, link);
          if (shouldContinue === false) return;

          instance.scrollTo(link.id);

          if (opts.updateHash) {
            const url = new URL(window.location.href);
            url.hash = link.id;
            history.pushState(null, "", url.toString());
          }
        });

        btn.addEventListener("mouseenter", () => {
          if (!link.disabled && !isActive) btn.style.background = "#f3f4f6";
        });
        btn.addEventListener("mouseleave", () => {
          if (!isActive) btn.style.background = "";
        });
      }

      root.appendChild(btn);
    }
  }

  // Intersection Observer for auto-active tracking
  let observer: IntersectionObserver | null = null;

  function setupObserver(): void {
    const target = opts.targetContainer ?? document;

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          const id = entry.target.id;
          if (id && id !== activeId) {
            activeId = id;
            render();
            opts.onActiveChange?.(id, links.find((l) => l.id === id)!);
          }
        }
      }
    }, {
      root: target instanceof Document ? null : target as HTMLElement,
      rootMargin: `${opts.offset}px 0px -${opts.offset + 100}px 0px`,
      threshold: [0, 0.3, 0.5, 1],
    });

    // Observe all linked targets
    for (const link of links) {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    }
  }

  // Initial render
  render();
  setupObserver();

  const instance: AnchorGroupInstance = {
    element: root,

    getActiveId() { return activeId },

    setActiveId(id: string) {
      activeId = id;
      render();
      opts.onActiveChange?.(id, links.find((l) => l.id === id)!);
    },

    scrollTo(id: string) {
      const el = document.getElementById(id);
      if (!el) return;

      activeId = id;
      render();

      const top = el.getBoundingClientRect().top + window.scrollY - opts.offset;
      window.scrollTo({
        top,
        behavior: "smooth",
      });

      // Fallback for browsers that don't support smooth scroll
      setTimeout(() => {
        window.scrollTo({ top, behavior: "instant" });
      }, opts.smoothDuration + 50);
    },

    getLinks() { return [...links]; },

    setLinks(newLinks: AnchorLink[]) {
      links = newLinks;
      activeId = opts.defaultActiveId ?? (links[0]?.id ?? "");

      // Re-observe new targets
      if (observer) {
        observer.disconnect();
        setupObserver();
      }

      render();
    },

    destroy() {
      destroyed = true;
      if (observer) observer.disconnect();
      root.remove();
    },
  };

  return instance;
}

// --- Back to Top Button ---

export interface BackToTopOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Show after scrolling past this threshold (px, default: 300) */
  threshold?: number;
  /** Position: corner placement */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Show scroll progress ring? */
  showProgress?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface BackToTopInstance {
  element: HTMLElement;
  destroy: () => void;
}

/** Create a back-to-top button that appears on scroll */
export function createBackToTop(options: BackToTopOptions): BackToTopInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("BackToTop: container not found");

  const threshold = options.threshold ?? 300;
  const sizeMap: Record<string, number> = { sm: 36, md: 42, lg: 48 };

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `back-to-top ${options.className ?? ""}`;
  btn.title = "Back to top";
  btn.setAttribute("aria-label", "Scroll back to top");
  btn.style.cssText = `
    position:fixed;display:none;align-items:center;justify-content:center;
    width:${sizeMap[options.size ?? "md"]}px;height:${sizeMap[options.size ?? "md]}px;
    border-radius:50%;background:#fff;border:1px solid #d1d5db;
    box-shadow:0 4px 12px rgba(0,0,0,0.1);cursor:pointer;z-index:90;
    opacity:0;transition:opacity 0.25s, transform 0.25s;
    font-size:16px;color:#374151;
  `;

  // Position
  const positions: Record<string, string> = {
    "bottom-right": "right:24px;bottom:24px;",
    "bottom-left":  "left:24px;bottom:24px;",
    "top-right":    "right:24px;top:24px;",
    "top-left":     "left:24px;top:24px;",
  };
  Object.assign(btn.style, positions[options.position ?? "bottom-right"]);

  // Arrow icon
  btn.innerHTML = "\u2191";

  // Progress ring (SVG)
  let progressRing: SVGSVGElement | null = null;
  if (options.showProgress) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 44 44");
    svg.setAttribute("width", String(sizeMap[options.size ?? "md"]));
    svg.setAttribute("height", String(sizeMap[options.size ?? "md"]));
    svg.style.cssText = "position:absolute;inset:0;";
    btn.style.overflow = "visible";

    const circleBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circleBg.setAttribute("cx", "22");
    circleBg.setAttribute("cy", "22");
    circleBg.setAttribute("r", "20");
    circleBg.setAttribute("fill", "none");
    circleBg.setAttribute("stroke", "#e5e7eb");
    circleBg.setAttribute("stroke-width", "3");
    svg.appendChild(circleBg);

    progressRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    progressRing.setAttribute("cx", "22");
    progressRing.setAttribute("cy", "22");
    progressRing.setAttribute("r", "20");
    progressRing.setAttribute("fill", "none");
    progressRing.setAttribute("stroke", "#4f46e5");
    progressRing.setAttribute("stroke-width", "3");
    progressRing.setAttribute("stroke-dasharray", "125.6"); // 2 * PI * 20
    progressRing.setAttribute("stroke-dashoffset", "125.6");
    progressRing.setAttribute("style", "transition:stroke-dashoffset 0.1s linear;");
    svg.appendChild(progressRing);

    btn.insertBefore(svg, btn.firstChild);
  }

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  let ticking = false;
  const handleScroll = () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const shouldShow = scrollY > threshold;

    btn.style.display = shouldShow ? "flex" : "none";
    btn.style.opacity = shouldShow ? "1" : "0";
    btn.style.transform = shouldShow ? "translateY(0)" : "translateY(8px)";

    if (progressRing && shouldShow && !ticking) {
      ticking = true;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollY / maxScroll, 1);
      const offset = 125.6 * (1 - progress);
      progressRing.setAttribute("stroke-dashoffset", String(offset));
      requestAnimationFrame(() => { ticking = false; });
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll(); // Initial check

  return {
    element: btn,
    destroy() {
      window.removeEventListener("scroll", handleScroll);
      btn.remove();
    },
  };
}
