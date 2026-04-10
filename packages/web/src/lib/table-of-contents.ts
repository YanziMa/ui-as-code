/**
 * Table of Contents: Auto-generated TOC from heading elements with scroll spy,
 * active highlighting, collapsible sections, smooth scroll navigation,
 * depth indicators, and customizable styling.
 */

// --- Types ---

export interface TocEntry {
  /** Unique ID derived from heading id or generated */
  id: string;
  /** Heading text content */
  text: string;
  /** Heading level (1-6) */
  level: number;
  /** Generated anchor slug */
  slug: string;
  /** Child entries (for nested structures) */
  children?: TocEntry[];
}

export interface TableOfContentsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Content element to scan for headings */
  content?: HTMLElement | string;
  /** Selector for headings (default: h1-h6) */
  headingSelector?: string;
  /** Max heading level to include (default: 6) */
  maxLevel?: number;
  /** Min heading level to include (default: 2) */
  minLevel?: number;
  /** Show nested/indentation based on heading level? */
  showIndent?: boolean;
  /** Indent size in px per level */
  indentSize?: number;
  /** Active entry highlight color */
  activeColor?: string;
  /** Normal text color */
  textColor?: string;
  /** Font size */
  fontSize?: number;
  /** Line height */
  lineHeight?: number;
  /** Show top-level numbers? */
  showNumbers?: boolean;
  /** Smooth scroll on click? */
  smoothScroll?: boolean;
  /** Scroll spy: auto-highlight current section on scroll? */
  scrollSpy?: boolean;
  /** Scroll spy offset (px) from top */
  scrollSpyOffset?: number;
  /** Callback on entry click */
  onClick?: (entry: TocEntry) => void;
  /** Custom title for TOC */
  title?: string;
  /** Show "Back to top" button? */
  showBackToTop?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface TocInstance {
  element: HTMLElement;
  getEntries: () => TocEntry[];
  refresh: () => void;
  scrollToEntry: (id: string) => void;
  getActiveId: () => string | null;
  destroy: () => void;
}

// --- Helpers ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateId(level: number, index: number, text: string): string {
  return `heading-${level}-${index}-${slugify(text).slice(0, 20)}`;
}

// --- Main Class ---

export class TableOfContentsManager {
  create(options: TableOfContentsOptions): TocInstance {
    const opts = {
      headingSelector: options.headingSelector ?? "h1, h2, h3, h4, h5, h6",
      maxLevel: options.maxLevel ?? 6,
      minLevel: options.minLevel ?? 2,
      showIndent: options.showIndent ?? true,
      indentSize: options.indentSize ?? 16,
      activeColor: options.activeColor ?? "#4338ca",
      textColor: options.textColor ?? "#4b5563",
      fontSize: options.fontSize ?? 13,
      lineHeight: options.lineHeight ?? 1.6,
      showNumbers: options.showNumbers ?? false,
      smoothScroll: options.smoothScroll ?? true,
      scrollSpy: options.scrollSpy ?? true,
      scrollSpyOffset: options.scrollSpyOffset ?? 100,
      showBackToTop: options.showBackToTop ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("TableOfContents: container not found");

    container.className = `toc ${opts.className ?? ""}`;

    // Resolve content element
    let contentEl: HTMLElement | null = null;
    if (typeof options.content === "string") {
      contentEl = document.querySelector<HTMLElement>(options.content);
    } else if (options.content instanceof HTMLElement) {
      contentEl = options.content;
    }

    let entries: TocEntry[] = [];
    let activeId: string | null = null;
    let destroyed = false;
    let scrollObserver: IntersectionObserver | null = null;

    function scanHeadings(): TocEntry[] {
      const found: TocEntry[] = [];

      if (!contentEl) return found;

      const headings = contentEl.querySelectorAll<HTMLElement>(opts.headingSelector);
      let countByLevel: Record<number, number> = {};

      for (const el of headings) {
        const level = parseInt(el.tagName.charAt(1));
        if (level < opts.minLevel || level > opts.maxLevel) continue;

        // Use existing ID or generate one
        let id = el.id;
        if (!id) {
          id = generateId(level, found.length, el.textContent?.trim() ?? "");
          el.id = id;
        }

        countByLevel[level] = (countByLevel[level] ?? 0) + 1;

        found.push({
          id,
          text: el.textContent?.trim() ?? "",
          level,
          slug: id,
        });
      }

      // Store count for numbering
      (container as any)._countByLevel = countByLevel;
      return found;
    }

    function render(): void {
      container.innerHTML = "";

      // Title
      if (opts.title) {
        const titleEl = document.createElement("div");
        titleEl.className = "toc-title";
        titleEl.style.cssText = `
          font-size:${opts.fontSize + 3}px;font-weight:700;color:#111827;
          margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;
        `;
        titleEl.textContent = opts.title;
        container.appendChild(titleEl);
      }

      // Entries list
      const list = document.createElement("div");
      list.className = "toc-list";
      list.style.cssText = `display:flex;flex-direction:column;gap:2px;`;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!;
        const isActive = entry.id === activeId;
        const item = document.createElement("a");
        item.href = `#${entry.slug}`;
        item.dataset.tocId = entry.id;
        item.className = `toc-entry${isActive ? " toc-active" : ""}`;
        item.style.cssText = `
          display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:4px;
          text-decoration:none;color:${isActive ? opts.activeColor : opts.textColor};
          font-size:${opts.fontSize}px;line-height:${opts.lineHeight};
          transition:all 0.15s;cursor:pointer;position:relative;
          ${opts.showIndent ? `padding-left:${(entry.level - opts.minLevel + 1) * opts.indentSize}px;` : ""}
          ${isActive ? `background:${opts.activeColor}10;font-weight:600;` : ""}
        `;

        // Number prefix
        if (opts.showNumbers && entry.level <= opts.minLevel) {
          const counts = (container as any)._countByLevel as Record<number, number> ?? {};
          const num = counts[entry.level] ?? 0;
          // Find position among same-level siblings
          let siblingIdx = 0;
          for (const prev of entries.slice(0, i)) {
            if (prev.level === entry.level) siblingIdx++;
          }
          const numSpan = document.createElement("span");
          numSpan.style.cssText = `
            font-size:${opts.fontSize - 2}px;color:${
              isActive ? opts.activeColor : "#9ca3af"
            };font-weight:500;min-width:16px;text-align:right;
            flex-shrink:0;font-family:monospace;
          `;
          numSpan.textContent = `${siblingIdx + 1}.`;
          item.prepend(numSpan);
        }

        // Level indicator bar
        if (opts.showIndent && entry.level > opts.minLevel) {
          const bar = document.createElement("span");
          bar.style.cssText = `
            position:absolute;left:4px;width:2px;height:14px;border-radius:1px;
            background:${isActive ? opts.activeColor : "#e5e7eb};top:50%;transform:translateY(-50%);
          `;
          item.appendChild(bar);
        }

        // Text
        const textSpan = document.createElement("span");
        textSpan.className = "toc-text";
        textSpan.style.cssText = `
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;
        `;
        textSpan.textContent = entry.text;
        item.appendChild(textSpan);

        // Click handler
        item.addEventListener("click", (e) => {
          e.preventDefault();
          const target = document.getElementById(entry.slug);
          if (target) {
            target.scrollIntoView({
              behavior: opts.smoothScroll ? "smooth" : "auto",
              block: "start",
            });
          }
          setActive(entry.id);
          opts.onClick?.(entry);
        });

        // Hover effect
        item.addEventListener("mouseenter", () => {
          if (!isActive) { item.style.background = "#f9fafb"; }
        });
        item.addEventListener("mouseleave", () => {
          if (!isActive) { item.style.background = ""; }
        });

        list.appendChild(item);
      }

      container.appendChild(list);

      // Back to top button
      if (opts.showBackToTop) {
        const bttBtn = document.createElement("button");
        bttBtn.type = "button";
        bttBtn.innerHTML = "\u2191 Top"; // ↑ Top
        bttBtn.style.cssText = `
          display:flex;align-items:center;justify-content:center;gap:4px;
          width:100%;padding:8px;margin-top:12px;border:1px solid #e5e7eb;
          border-radius:6px;background:#fff;color:#6b7280;font-size:12px;
          cursor:pointer;transition:all 0.15s;
        `;
        bttBtn.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: opts.smoothScroll ? "smooth" : "auto" });
        });
        bttBtn.addEventListener("mouseenter", () => {
          bttBtn.style.borderColor = "#4338ca";
          bttBtn.style.color = "#4338ca";
        });
        bttBtn.addEventListener("mouseleave", () => {
          bttBtn.style.borderColor = "#e5e7eb";
          bttBtn.style.color = "#6b7280";
        });
        container.appendChild(bttBtn);
      }
    }

    function setActive(id: string): void {
      if (activeId === id) return;
      activeId = id;

      // Update visual active state
      const items = container.querySelectorAll<HTMLElement>(".toc-entry");
      for (const item of items) {
        const isItemActive = item.dataset.tocId === id;
        item.classList.toggle("toc-active", isItemActive);
        item.style.color = isItemActive ? opts.activeColor : opts.textColor;
        item.style.fontWeight = isItemActive ? "600" : "400";
        item.style.background = isItemActive ? `${opts.activeColor}10` : "";
      }
    }

    function setupScrollSpy(): void {
      if (!contentEl || !opts.scrollSpy || destroyed) return;

      const observerOptions: IntersectionObserverInit = {
        rootMargin: `${opts.scrollSpyOffset}px 0px 0px 0px`,
        threshold: 0,
      };

      scrollObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id) setActive(id);
          }
        }
      }, observerOptions);

      // Observe all heading elements
      const headings = contentEl.querySelectorAll<HTMLElement>(opts.headingSelector);
      for (const h of headings) {
        if (h.id) scrollObserver.observe(h);
      }
    }

    // Initial scan and render
    entries = scanHeadings();
    render();
    setupScrollSpy();

    const instance: TocInstance = {
      element: container,

      getEntries() { return [...entries]; },

      refresh() {
        entries = scanHeadings();
        render();
        // Re-setup scroll spy after refresh
        if (scrollObserver) scrollObserver.disconnect();
        setupScrollSpy();
      },

      scrollToEntry(id: string) {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({
            behavior: opts.smoothScroll ? "smooth" : "auto",
            block: "start",
          });
          setActive(id);
        }
      },

      getActiveId() { return activeId; },

      destroy() {
        destroyed = true;
        if (scrollObserver) scrollObserver.disconnect();
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a table of contents */
export function createTableOfContents(options: TableOfContentsOptions): TocInstance {
  return new TableOfContentsManager().create(options);
}
