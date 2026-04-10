/**
 * Page Footer: Multi-column footer with links, social icons, newsletter signup,
 * copyright, back-to-top button, responsive layout, and dark mode support.
 */

// --- Types ---

export interface FooterLink {
  label: string;
  href: string;
  /** External link? (opens in new tab) */
  external?: boolean;
}

export interface FooterColumn {
  /** Column heading */
  title: string;
  /** Links list */
  links: FooterLink[];
}

export interface SocialLink {
  /** Platform name */
  platform: string;
  /** URL */
  url: string;
  /** Icon (emoji or SVG) */
  icon: string;
}

export interface FooterOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Brand/logo text or HTML */
  brand?: string;
  /** Brand tagline/description */
  description?: string;
  /** Link columns */
  columns?: FooterColumn[];
  /** Social media links */
  socials?: SocialLink[];
  /** Copyright text */
  copyright?: string;
  /** Show back-to-top button? */
  showBackToTop?: boolean;
  /** Newsletter email input? */
  showNewsletter?: boolean;
  /** Newsletter placeholder */
  newsletterPlaceholder?: string;
  /** Newsletter submit handler */
  onNewsletterSubmit?: (email: string) => void;
  /** Number of grid columns on desktop */
  gridColumns?: number;
  /** Background color */
  background?: string;
  /** Text color */
  textColor?: string;
  /** Border top style */
  borderTop?: string;
  /** Dark mode? */
  dark?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface FooterInstance {
  element: HTMLElement;
  setColumns: (columns: FooterColumn[]) => void;
  setCopyright: (text: string) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createFooter(options: FooterOptions): FooterInstance {
  const opts = {
    showBackToTop: options.showBackToTop ?? true,
    showNewsletter: options.showNewsletter ?? false,
    newsletterPlaceholder: options.newsletterPlaceholder ?? "Enter your email",
    gridColumns: options.gridColumns ?? 4,
    background: options.background ?? "#111827",
    textColor: options.textColor ?? "#d1d5db",
    borderTop: options.borderTop ?? "1px solid #374151",
    dark: options.dark ?? false,
    copyright: options.copyright ?? `\u00A9 ${new Date().getFullYear()} All rights reserved.`,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Footer: container not found");

  let destroyed = false;

  // Root
  const root = document.createElement("footer");
  root.className = `site-footer ${opts.className ?? ""}`;
  root.style.cssText = `
    background:${opts.dark ? "#0f172a" : opts.background};
    color:${opts.textColor};
    border-top:${opts.borderTop};
    font-family:-apple-system,sans-serif;font-size:13px;
    padding:48px 24px 24px;
  `;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    // Max-width wrapper
    const wrap = document.createElement("div");
    wrap.style.cssText = "max-width:1200px;margin:0 auto;";

    // Top section: brand + columns
    const topSection = document.createElement("div");
    topSection.style.cssText = `
      display:grid;grid-template-columns:${opts.brand ? `1.5fr repeat(${opts.gridColumns - 1},1fr)` : `repeat(${opts.gridColumns},1fr)`};
      gap:32px;margin-bottom:40px;
    `;

    // Brand column
    if (opts.brand) {
      const brandCol = document.createElement("div");
      brandCol.style.cssText = "display:flex;flex-direction:column;gap:12px;";

      const logoEl = document.createElement("div");
      logoEl.innerHTML = opts.brand;
      logoEl.style.cssText = "font-size:18px;font-weight:700;color:#fff;margin-bottom:4px;";
      brandCol.appendChild(logoEl);

      if (opts.description) {
        const desc = document.createElement("p");
        desc.textContent = opts.description;
        desc.style.cssText = "line-height:1.6;color:#9ca3af;max-width:280px;margin:0;";
        brandCol.appendChild(desc);
      }

      // Social icons under brand
      if (opts.socials && opts.socials.length > 0) {
        const socialRow = document.createElement("div");
        socialRow.style.cssText = "display:flex;gap:10px;margin-top:8px;";

        for (const s of opts.socials) {
          const a = document.createElement("a");
          a.href = s.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.title = s.platform;
          a.innerHTML = s.icon;
          a.style.cssText = `
            display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;
            background:#374151;color:#9ca3af;text-decoration:none;font-size:16px;
            transition:all 0.15s;
          `;
          a.addEventListener("mouseenter", () => { a.style.background = "#4b5563"; a.style.color = "#fff"; });
          a.addEventListener("mouseleave", () => { a.style.background = "#374151"; a.style.color = "#9ca3af"; });
          socialRow.appendChild(a);
        }

        brandCol.appendChild(socialRow);
      }

      topSection.appendChild(brandCol);
    }

    // Link columns
    for (const col of (opts.columns ?? [])) {
      const colEl = document.createElement("div");
      colEl.style.cssText = "display:flex;flex-direction:column;gap:10px;";

      const title = document.createElement("h4");
      title.textContent = col.title;
      title.style.cssText = "font-size:13px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 8px;";
      colEl.appendChild(title);

      for (const link of col.links) {
        const a = document.createElement("a");
        a.href = link.href;
        if (link.external) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
        a.textContent = link.label;
        a.style.cssText = "color:#9ca3af;text-decoration:none;font-size:13px;line-height:2;transition:color 0.15s;display:inline-block;";
        a.addEventListener("mouseenter", () => { a.style.color = "#fff"; });
        a.addEventListener("mouseleave", () => { a.style.color = "#9ca3af"; });
        colEl.appendChild(a);
      }

      topSection.appendChild(colEl);
    }

    wrap.appendChild(topSection);

    // Divider
    const divider = document.createElement("div");
    divider.style.cssText = "height:1px;background:#374151;margin-bottom:24px;";
    wrap.appendChild(divider);

    // Bottom row: newsletter + copyright + back-to-top
    const bottomRow = document.createElement("div");
    bottomRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;";

    // Left: copyright
    const copyEl = document.createElement("p");
    copyEl.textContent = opts.copyright;
    copyEl.style.cssText = "margin:0;color:#6b7280;font-size:12px;";
    bottomRow.appendChild(copyEl);

    // Center: newsletter
    if (opts.showNewsletter) {
      const nlWrap = document.createElement("form");
      nlWrap.style.cssText = "display:flex;gap:6px;";
      nlWrap.addEventListener("submit", (e) => {
        e.preventDefault();
        const inp = nlWrap.querySelector<HTMLInputElement>("input");
        if (inp?.value) opts.onNewsletterSubmit?.(inp.value);
      });

      const nlInput = document.createElement("input");
      nlInput.type = "email";
      nlInput.placeholder = opts.newsletterPlaceholder;
      nlInput.required = true;
      nlInput.style.cssText = `
        padding:7px 14px;border-radius:6px;border:1px solid #374151;background:#1f2937;
        color:#e5e7eb;font-size:12px;outline:none;width:200px;font-family:inherit;
        transition:border-color 0.15s;
      `;
      nlInput.addEventListener("focus", () => { nlInput.style.borderColor = "#6366f1"; });
      nlInput.addEventListener("blur", () => { nlInput.style.borderColor = "#374151"; });
      nlWrap.appendChild(nlInput);

      const nlBtn = document.createElement("button");
      nlBtn.type = "submit";
      nlBtn.textContent = "Subscribe";
      nlBtn.style.cssText = `
        padding:7px 16px;border-radius:6px;background:#6366f1;color:#fff;
        border:none;cursor:pointer;font-size:12px;font-weight:500;font-family:inherit;
        transition:opacity 0.15s;
      `;
      nlBtn.addEventListener("mouseenter", () => { nlBtn.style.opacity = "0.85"; });
      nlBtn.addEventListener("mouseleave", () => { nlBtn.style.opacity = ""; });
      nlWrap.appendChild(nlBtn);

      bottomRow.appendChild(nlWrap);
    }

    // Right: back to top
    if (opts.showBackToTop) {
      const bttBtn = document.createElement("button");
      bttBtn.type = "button";
      bttBtn.innerHTML = "\u2191 Top";
      bttBtn.title = "Back to top";
      bttBtn.style.cssText = `
        padding:6px 14px;border-radius:6px;background:#374151;color:#9ca3af;
        border:1px solid #4b5563;cursor:pointer;font-size:12px;font-family:inherit;
        transition:all 0.15s;display:flex;align-items:center;gap:4px;
      `;
      bttBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      bttBtn.addEventListener("mouseenter", () => { bttBtn.style.background = "#4b5563"; bttBtn.style.color = "#fff"; });
      bttBtn.addEventListener("mouseleave", () => { bttBtn.style.background = "#374151"; bttBtn.style.color = "#9ca3af"; });
      bottomRow.appendChild(bttBtn);
    }

    wrap.appendChild(bottomRow);
    root.appendChild(wrap);
  }

  // Initial render
  render();

  const instance: FooterInstance = {
    element: root,

    setColumns(columns: FooterColumn[]) {
      opts.columns = columns;
      render();
    },

    setCopyright(text: string) {
      opts.copyright = text;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
