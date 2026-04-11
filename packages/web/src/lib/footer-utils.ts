/**
 * Footer Utilities: Site footer with columns, links, social icons,
 * newsletter signup, copyright, language selector, back-to-top,
 * and responsive layouts.
 */

// --- Types ---

export type FooterLayout = "columns" | "minimal" | "centered" | "stacked";
export type FooterSize = "sm" | "md" | "lg";

export interface FooterColumn {
  /** Column title/heading */
  title: string;
  /** Links in this column */
  links: Array<{
    label: string;
    href?: string;
    icon?: string;
    onClick?: () => void;
  }>;
}

export interface SocialLink {
  /** Platform name */
  platform: string;
  /** Icon HTML (SVG preferred) */
  icon: string;
  /** Profile URL */
  url: string;
  /** Label for accessibility */
  label?: string;
}

export interface NewsletterOptions {
  /** Shown placeholder */
  placeholder?: string;
  /** Submit button label */
  buttonLabel?: string;
  /** On subscribe callback */
  onSubscribe?: (email: string) => void;
  /** Privacy note text */
  privacyNote?: string;
}

export interface FooterOptions {
  /** Layout variant */
  layout?: FooterLayout;
  /** Size variant */
  size?: FooterSize;
  /** Brand/name shown at top of footer */
  brand?: string | HTMLElement;
  /** Tagline/description below brand */
  tagline?: string;
  /** Footer columns (for columns layout) */
  columns?: FooterColumn[];
  /** Social media links */
  social?: SocialLink[];
  /** Newsletter signup config */
  newsletter?: NewsletterOptions;
  /** Copyright text */
  copyright?: string;
  /** Additional bottom links (privacy, terms, etc.) */
  bottomLinks?: Array<{ label: string; href?: string; onClick?: () => void }>;
  /** Language selector options */
  languages?: string[];
  /** Selected language */
  selectedLanguage?: string;
  /** On language change */
  onLanguageChange?: (lang: string) => void;
  /** Theme toggle? */
  showThemeToggle?: boolean;
  /** Back to top button */
  showBackToTop?: boolean;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Max content width */
  maxWidth?: number;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface FooterInstance {
  /** Root footer element */
  el: HTMLElement;
  /** Set copyright year/text */
  setCopyright: (text: string) => void;
  /** Set current year in copyright */
  setCurrentYear: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a site footer component.
 *
 * @example
 * ```ts
 * const footer = createFooter({
 *   brand: "MyApp",
 *   tagline: "Making the web better.",
 *   columns: [
 *     { title: "Product", links: [{ label: "Features", href: "/features" }, { label: "Pricing", href: "/pricing" }] },
 *     { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Blog", href: "/blog" }] },
 *   ],
 *   social: [
 *     { platform: "github", icon: "<svg>...</svg>", url: "https://github.com" },
 *   ],
 *   copyright: "2025 MyApp Inc.",
 * });
 * ```
 */
export function createFooter(options: FooterOptions = {}): FooterInstance {
  const {
    layout = "columns",
    size = "md",
    brand,
    tagline,
    columns = [],
    social = [],
    newsletter,
    copyright,
    bottomLinks = [],
    languages,
    selectedLanguage,
    onLanguageChange,
    showThemeToggle = false,
    showBackToTop = false,
    backgroundColor = "#111827",
    textColor = "#d1d5db",
    maxWidth = 1200,
    container,
    className,
  } = options;

  const sizePaddings: Record<FooterSize, string> = {
    sm: "24px 16px",
    md: "40px 24px",
    lg: "56px 32px",
  };

  // Root
  const root = document.createElement("footer");
  root.className = `footer ${layout} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    `background:${backgroundColor};color:${textColor};` +
    `padding:${sizePaddings[size]};font-size:13px;line-height:1.6;`;

  // Inner container
  const inner = document.createElement("div");
  inner.style.cssText =
    `max-width:${maxWidth}px;margin:0 auto;`;
  root.appendChild(inner);

  // --- Main content area ---
  const mainArea = document.createElement("div");
  mainArea.className = "footer-main";
  mainArea.style.cssText =
    "display:grid;gap:32px;" +
    (layout === "columns"
      ? "grid-template-columns:repeat(auto-fit,minmax(160px,1fr));"
      : layout === "stacked"
        ? "grid-template-columns:1fr;"
        : "grid-template-columns:1fr;");
  inner.appendChild(mainArea);

  // Brand section (first column or top area)
  if (brand || tagline) {
    const brandSection = document.createElement("div");
    brandSection.className = "footer-brand";

    if (brand) {
      const brandEl = document.createElement("div");
      brandEl.className = "footer-brand-name";
      brandEl.style.cssText = "font-size:18px;font-weight:700;color:#fff;margin-bottom:8px;";
      if (typeof brand === "string") brandEl.textContent = brand;
      else brandEl.appendChild(brand.cloneNode(true));
      brandSection.appendChild(brandEl);
    }

    if (tagline) {
      const tagEl = document.createElement("p");
      tagEl.className = "footer-tagline";
      tagEl.textContent = tagline;
      tagEl.style.cssText = "margin:0;color:#9ca3af;max-width:280px;font-size:13px;";
      brandSection.appendChild(tagEl);
    }

    // Social icons under brand
    if (social.length > 0) {
      const socialRow = document.createElement("div");
      socialRow.className = "footer-social";
      socialRow.style.cssText = "display:flex;gap:10px;margin-top:16px;";

      for (const s of social) {
        const a = document.createElement("a");
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.setAttribute("aria-label", s.label ?? s.platform);
        a.innerHTML = s.icon;
        a.style.cssText =
          "display:flex;align-items:center;justify-content:center;width:36px;height:36px;" +
          "border-radius:50%;background:#374151;color:#d1d5db;" +
          "text-decoration:none;transition:all 0.15s;";
        a.addEventListener("mouseenter", () => { a.style.background = "#4b5563"; a.style.color = "#fff"; });
        a.addEventListener("mouseleave", () => { a.style.background = "#374151"; a.style.color = "#d1d5db"; });
        socialRow.appendChild(a);
      }

      brandSection.appendChild(socialRow);
    }

    // Newsletter under brand/social
    if (newsletter) {
      const nlForm = _createNewsletterForm(newsletter);
      brandSection.appendChild(nlForm);
    }

    mainArea.appendChild(brandSection);
  }

  // Columns
  for (const col of columns) {
    const colEl = document.createElement("div");
    colEl.className = "footer-column";

    const heading = document.createElement("h4");
    heading.textContent = col.title;
    heading.style.cssText = "font-size:13px;font-weight:600;color:#fff;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;";
    colEl.appendChild(heading);

    const list = document.createElement("ul");
    list.style.cssText = "list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;";

    for (const link of col.links) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = link.href ?? "#";
      a.style.cssText =
        "color:#9ca3af;text-decoration:none;font-size:13px;transition:color 0.15s;display:inline-flex;align-items:center;gap:4px;";
      if (link.icon) {
        const ic = document.createElement("span");
        ic.innerHTML = link.icon;
        ic.style.cssText = "display:inline-flex;font-size:12px;";
        a.prepend(ic);
      }
      a.textContent = link.label;
      a.addEventListener("mouseenter", () => { a.style.color = "#fff"; });
      a.addEventListener("mouseleave", () => { a.style.color = "#9ca3af"; });
      a.addEventListener("click", (e) => {
        e.preventDefault();
        link.onClick?.();
        if (link.href) window.location.href = link.href;
      });
      li.appendChild(a);
      list.appendChild(li);
    }

    colEl.appendChild(list);
    mainArea.appendChild(colEl);
  }

  // Divider
  const divider = document.createElement("hr");
  divider.style.cssText = "border:none;border-top:1px solid #374151;margin:32px 0;";
  inner.appendChild(divider);

  // Bottom area
  const bottomArea = document.createElement("div");
  bottomArea.className = "footer-bottom";
  bottomArea.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;";

  // Copyright
  const copyEl = document.createElement("p");
  copyEl.className = "footer-copyright";
  copyEl.textContent = copyright ?? `\u00A9 ${new Date().getFullYear()}. All rights reserved.`;
  copyEl.style.cssText = "margin:0;font-size:12px;color:#6b7280;";
  bottomArea.appendChild(copyEl);

  // Bottom links
  if (bottomLinks.length > 0) {
    const blContainer = document.createElement("div");
    blContainer.style.cssText = "display:flex;gap:16px;flex-wrap:wrap;";

    for (const bl of bottomLinks) {
      const a = document.createElement("a");
      a.href = bl.href ?? "#";
      a.textContent = bl.label;
      a.style.cssText = "color:#6b7280;text-decoration:none;font-size:12px;transition:color 0.15s;";
      a.addEventListener("mouseenter", () => { a.style.color = "#d1d5db"; });
      a.addEventListener("mouseleave", () => { a.style.color = "#6b7280"; });
      a.addEventListener("click", (e) => {
        e.preventDefault();
        bl.onClick?.();
      });
      blContainer.appendChild(a);
    }

    bottomArea.appendChild(blContainer);
  }

  // Language selector
  if (languages && languages.length > 0) {
    const langSelect = document.createElement("select");
    langSelect.style.cssText =
      "background:#374151;color:#d1d5db;border:1px solid #4b5563;border-radius:6px;" +
      "padding:4px 8px;font-size:12px;cursor:pointer;";
    for (const lang of languages) {
      const opt = document.createElement("option");
      opt.value = lang;
      opt.textContent = lang;
      opt.selected = lang === selectedLanguage;
      langSelect.appendChild(opt);
    }
    langSelect.addEventListener("change", () => {
      onLanguageChange?.(langSelect.value);
    });
    bottomArea.appendChild(langSelect);
  }

  // Theme toggle
  if (showThemeToggle) {
    const themeBtn = document.createElement("button");
    themeBtn.type = "button";
    themeBtn.innerHTML = "\u2600\uFE0F / \u2600\uFE0F";
    themeBtn.style.cssText =
      "background:#374151;color:#d1d5db;border:1px solid #4b5563;border-radius:6px;" +
      "padding:4px 8px;font-size:12px;cursor:pointer;";
    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
    });
    bottomArea.appendChild(themeBtn);
  }

  // Back to top
  if (showBackToTop) {
    const bttBtn = document.createElement("button");
    bttBtn.type = "button";
    bttBtn.innerHTML = "\u2191 Top";
    bttBtn.style.cssText =
      "background:#374151;color:#d1d5db;border:1px solid #4b5563;border-radius:6px;" +
      "padding:4px 12px;font-size:12px;cursor:pointer;transition:all 0.15s;";
    bttBtn.addEventListener("mouseenter", () => { bttBtn.style.background = "#4b5563"; bttBtn.style.color = "#fff"; });
    bttBtn.addEventListener("mouseleave", () => { bttBtn.style.background = "#374151"; bttBtn.style.color = "#d1d5db"; });
    bttBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    bottomArea.appendChild(bttBtn);
  }

  inner.appendChild(bottomArea);

  // --- Helper ---

  function _createNewsletterForm(nl: NewsletterOptions): HTMLElement {
    const form = document.createElement("div");
    form.className = "footer-newsletter";
    form.style.cssText = "margin-top:20px;";

    const label = document.createElement("label");
    label.textContent = "Subscribe to our newsletter";
    label.style.cssText = "display:block;font-size:13px;font-weight:600;color:#d1d5db;margin-bottom:8px;";
    form.appendChild(label);

    const inputWrap = document.createElement("div");
    inputWrap.style.cssText = "display:flex;gap:6px;";

    const input = document.createElement("input");
    input.type = "email";
    input.placeholder = nl.placeholder ?? "you@email.com";
    input.style.cssText =
      "flex:1;padding:8px 12px;border:1px solid #4b5563;border-radius:6px;" +
      "background:#374151;color:#d1d5db;font-size:13px;outline:none;" +
      "::placeholder{color:#6b7280;}";
    inputWrap.appendChild(input);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = nl.buttonLabel ?? "Subscribe";
    btn.style.cssText =
      "padding:8px 16px;border-radius:6px;border:none;background:#3b82f6;" +
      "color:#fff;font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;";
    btn.addEventListener("mouseenter", () => { btn.style.background = "#2563eb"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "#3b82f6"; });
    btn.addEventListener("click", () => {
      if (input.value) nl.onSubscribe?.(input.value);
    });
    inputWrap.appendChild(btn);

    form.appendChild(inputWrap);

    if (nl.privacyNote) {
      const note = document.createElement("p");
      note.textContent = nl.privacyNote;
      note.style.cssText = "margin:6px 0 0;font-size:11px;color:#6b7280;";
      form.appendChild(note);
    }

    return form;
  }

  // --- Methods ---

  function setCopyright(text: string): void {
    copyEl.textContent = text;
  }

  function setCurrentYear(): void {
    copyEl.textContent = (copyright ?? "").replace(/\d{4}/, String(new Date().getFullYear()));
  }

  function destroy(): void { root.remove(); }

  (container ?? document.body).appendChild(root);

  return { el: root, setCopyright, setCurrentYear, destroy };
}
