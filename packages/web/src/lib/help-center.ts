/**
 * Help Center: Knowledge base UI with categories, search, article viewer,
 * breadcrumbs, table of contents, feedback buttons, related articles,
 * and FAQ accordion.
 */

// --- Types ---

export interface HelpArticle {
  id: string;
  title: string;
  /** Short summary/description */
  summary: string;
  /** Full content (HTML or markdown) */
  content: string;
  /** Category ID */
  categoryId: string;
  /** Tags for search/filter */
  tags?: string[];
  /** Author */
  author?: string;
  /** Last updated */
  updatedAt?: string;
  /** View count */
  views?: number;
  /** Helpful count */
  helpful?: number;
  /** Not helpful count */
  notHelpful?: number;
  /** Related article IDs */
  relatedIds?: string[];
  /** Featured/important? */
  featured?: boolean;
}

export interface HelpCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  /** Sort order */
  order?: number;
}

export interface HelpCenterOptions {
  container: HTMLElement | string;
  /** All articles */
  articles: HelpArticle[];
  /** Categories */
  categories: HelpCategory[];
  /** Default category to show */
  defaultCategory?: string;
  /** Enable search? */
  enableSearch?: boolean;
  /** Enable feedback (helpful/not)? */
  enableFeedback?: boolean;
  /** Show view counts? */
  showViews?: boolean;
  /** Show breadcrumbs? */
  showBreadcrumbs?: boolean;
  /** Show TOC in article view? */
  showToc?: boolean;
  /** Show related articles? */
  showRelated?: boolean;
  /** Articles per page */
  pageSize?: number;
  /** Callback when article is opened */
  onArticleOpen?: (article: HelpArticle) => void;
  /** Callback on search */
  onSearch?: (query: string) => HelpArticle[];
  /** Custom CSS class */
  className?: string;
}

export interface HelpCenterInstance {
  element: HTMLElement;
  getArticles: () => HelpArticle[];
  setArticles: (articles: HelpArticle[]) => void;
  openArticle: (id: string) => void;
  goHome: () => void;
  search: (query: string) => void;
  destroy: () => void;
}

// --- Helpers ---

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function simpleMarkdown(html: string): string {
  let out = escapeHtml(html);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/`(.+?)`/g, "<code>$1</code>");
  out = out.replace(/\n/g, "<br>");
  return out;
}

const CATEGORY_ICONS: Record<string, string> = {
  default: "\u{1F4DA}", gettingStarted: "\u{1F680}", billing: "\u{1F4B3}",
  account: "\u{1F464}", api: "\u{1F4BB}", troubleshooting: "\u{1F6E1}\uFE0F",
  security: "\u{1F512}", integrations: "\u{1F504}", faq: "\u2753",
};

// --- Main Factory ---

export function createHelpCenter(options: HelpCenterOptions): HelpCenterInstance {
  const opts = {
    defaultCategory: options.defaultCategory ?? "",
    enableSearch: options.enableSearch ?? true,
    enableFeedback: options.enableFeedback ?? true,
    showViews: options.showViews ?? true,
    showBreadcrumbs: options.showBreadcrumbs ?? true,
    showToc: options.showToc ?? true,
    showRelated: options.showRelated ?? true,
    pageSize: options.pageSize ?? 10,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("HelpCenter: container not found");

  let allArticles: HelpArticle[] = [...options.articles];
  let destroyed = false;
  let currentView: "home" | "category" | "article" | "search" = "home";
  let activeCategoryId: string = opts.defaultCategory;
  let activeArticleId: string | null = null;
  let searchQuery = "";

  // Root
  const root = document.createElement("div");
  root.className = `help-center ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;height:100%;
    display:flex;flex-direction:column;
  `;
  container.appendChild(root);

  // Header with search
  const header = document.createElement("div");
  header.className = "hc-header";
  header.style.cssText = "padding:20px 24px 16px;border-bottom:1px solid #e5e7eb;";

  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.justifyContent = "space-between";
  titleRow.style.alignItems = "center";

  const titleEl = document.createElement("h1");
  titleEl.style.cssText = "margin:0;font-size:20px;font-weight:700;color:#111827;cursor:pointer;";
  titleEl.textContent = "Help Center";
  titleEl.addEventListener("click", () => instance.goHome());
  titleRow.appendChild(titleEl);

  header.appendChild(titleRow);

  // Search bar
  if (opts.enableSearch) {
    const searchBox = document.createElement("div");
    searchBox.style.cssText = "position:relative;margin-top:12px;";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search help articles...";
    searchInput.style.cssText = "width:100%;padding:10px 40px 10px 14px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;outline:none;transition:border-color 0.15s;box-sizing:border-box;";
    searchInput.addEventListener("focus", () => { searchInput.style.borderColor = "#4338ca"; searchInput.style.boxShadow = "0 0 0 3px rgba(67,56,202,0.08)"; });
    searchInput.addEventListener("blur", () => { searchInput.style.borderColor = "#d1d5db"; searchInput.style.boxShadow = ""; });
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value.trim();
      if (searchQuery.length >= 2) instance.search(searchQuery);
      else if (currentView === "search") instance.goHome();
    });

    const searchIcon = document.createElement("span");
    searchIcon.innerHTML = "\uD83D\uDD0D";
    searchIcon.style.cssText = "position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;pointer-events:none;";
    searchBox.appendChild(searchIcon);
    searchBox.appendChild(searchInput);
    header.appendChild(searchBox);
  }

  root.appendChild(header);

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "hc-content";
  contentArea.style.cssText = "flex:1;overflow-y:auto;padding:0 24px 24px;";
  root.appendChild(contentArea);

  // Breadcrumbs
  let breadcrumbEl: HTMLElement | null = null;
  if (opts.showBreadcrumbs) {
    breadcrumbEl = document.createElement("div");
    breadcrumbEl.className = "hc-breadcrumbs";
    breadcrumbEl.style.cssText = "display:flex;align-items:center;gap:6px;padding:16px 0;font-size:12px;color:#6b7280;";
    contentArea.appendChild(breadcrumbEl);
  }

  // Main content slot
  const mainSlot = document.createElement("div");
  mainSlot.className = "hc-main";
  contentArea.appendChild(mainSlot);

  // --- Views ---

  function renderHome(): void {
    currentView = "home";
    updateBreadcrumbs([]);
    mainSlot.innerHTML = "";

    // Featured articles
    const featured = allArticles.filter((a) => a.featured);
    if (featured.length > 0) {
      const section = document.createElement("section");
      section.style.marginBottom = "28px";

      const heading = document.createElement("h2");
      heading.style.cssText = "font-size:16px;font-weight:600;margin:0 0 12px;color:#111827;";
      heading.textContent = "Featured Articles";
      section.appendChild(heading);

      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;";
      for (const art of featured) grid.appendChild(createArticleCard(art));
      section.appendChild(grid);
      mainSlot.appendChild(section);
    }

    // Categories
    const catHeading = document.createElement("h2");
    catHeading.style.cssText = "font-size:16px;font-weight:600;margin:0 0 12px;color:#111827;";
    catHeading.textContent = "Categories";
    mainSlot.appendChild(catHeading);

    const catGrid = document.createElement("div");
    catGrid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;";

    for (const cat of opts.categories) {
      const catCard = document.createElement("div");
      catCard.style.cssText = `
        display:flex;align-items:center;gap:12px;padding:16px;border:1px solid #e5e7eb;border-radius:10px;
        cursor:pointer;transition:all 0.15s;background:#fff;
      `;
      catCard.addEventListener("click", () => renderCategory(cat.id));
      catCard.addEventListener("mouseenter", () => { catCard.style.borderColor = "#4338ca"; catCard.style.boxShadow = "0 2px 8px rgba(67,56,202,0.1)"; });
      catCard.addEventListener("mouseleave", () => { catCard.style.borderColor = "#e5e7eb"; catCard.style.boxShadow = ""; });

      const icon = document.createElement("span");
      icon.style.cssText = "font-size:28px;width:44px;text-align:center;";
      icon.textContent = cat.icon ?? CATEGORY_ICONS[cat.id] ?? CATEGORY_ICONS.default;
      catCard.appendChild(icon);

      const info = document.createElement("div");
      const name = document.createElement("div");
      name.style.cssText = "font-weight:600;font-size:14px;color:#111827;";
      name.textContent = cat.name;
      info.appendChild(name);

      const count = allArticles.filter((a) => a.categoryId === cat.id).length;
      const countEl = document.createElement("div");
      countEl.style.cssText = "font-size:12px;color:#9ca3af;margin-top:2px;";
      countEl.textContent = `${count} article${count !== 1 ? "s" : ""}`;
      info.appendChild(countEl);
      catCard.appendChild(info);
      catGrid.appendChild(catCard);
    }

    mainSlot.appendChild(catGrid);
  }

  function renderCategory(catId: string): void {
    currentView = "category";
    activeCategoryId = catId;
    const cat = opts.categories.find((c) => c.id === catId);
    updateBreadcrumbs([{ label: "Home", action: "goHome" }, { label: cat?.name ?? catId, action: null }]);
    mainSlot.innerHTML = "";

    const catArticles = allArticles.filter((a) => a.categoryId === catId);

    if (catArticles.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:48px;color:#9ca3af;";
      empty.innerHTML = `<div style="font-size:36px;">\u{1F4D6}</div><div style="margin-top:8px;">No articles in this category yet.</div>`;
      mainSlot.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px;";
    for (const art of catArticles) list.appendChild(createArticleListItem(art));
    mainSlot.appendChild(list);
  }

  function renderArticle(articleId: string): void {
    currentView = "article";
    activeArticleId = articleId;
    const art = allArticles.find((a) => a.id === articleId);
    if (!art) return;

    const cat = opts.categories.find((c) => c.id === art.categoryId);
    updateBreadcrumbs([
      { label: "Home", action: "goHome" },
      { label: cat?.name ?? art.categoryId, action: () => renderCategory(art.categoryId) },
      { label: art.title, action: null },
    ]);

    mainSlot.innerHTML = "";

    // Article layout: TOC sidebar + content
    const layout = document.createElement("div");
    layout.style.display = "flex";
    layout.style.gap = "32px";

    // TOC sidebar
    if (opts.showToc) {
      const tocSidebar = document.createElement("div");
      tocSidebar.style.cssText = "width:200px;flex-shrink:0;";

      const tocTitle = document.createElement("div");
      tocTitle.style.cssText = "font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;";
      tocTitle.textContent = "Contents";
      tocSidebar.appendChild(tocTitle);

      // Extract headings from content
      const headings = art.content.match(/^#{1,3}\s+(.+)$/gm) ?? [];
      if (headings.length > 0) {
        const tocList = document.createElement("div");
        tocList.style.cssText = "display:flex;flex-direction:column;gap:4px;";
        for (const h of headings.slice(0, 10)) {
          const item = document.createElement("a");
          item.href = "#";
          item.style.cssText = "font-size:12px;color:#6b7280;padding:3px 6px;border-radius:4px;text-decoration:none;display:block;";
          item.textContent = h.replace(/^#{1,3}\s+/, "");
          item.addEventListener("click", (e) => { e.preventDefault(); });
          tocList.appendChild(item);
        }
        tocSidebar.appendChild(tocList);
      }
      layout.appendChild(tocSidebar);
    }

    // Article content
    const articleBody = document.createElement("div");
    articleBody.style.flex = "1";
    articleBody.style.minWidth = "0";

    const artTitle = document.createElement("h1");
    artTitle.style.cssText = "font-size:24px;font-weight:700;color:#111827;margin:0 0 8px;line-height:1.3;";
    artTitle.textContent = art.title;
    articleBody.appendChild(artTitle);

    // Meta row
    const metaRow = document.createElement("div");
    metaRow.style.cssText = "display:flex;align-items:center;gap:16px;font-size:12px;color:#9ca3af;margin-bottom:20px;";

    if (art.author) {
      const author = document.createElement("span");
      author.textContent = `By ${art.author}`;
      metaRow.appendChild(author);
    }
    if (art.updatedAt) {
      const updated = document.createElement("span");
      updated.textContent = `Updated ${new Date(art.updatedAt).toLocaleDateString()}`;
      metaRow.appendChild(updated);
    }
    if (opts.showViews && art.views) {
      const views = document.createElement("span");
      views.textContent = `${art.views} views`;
      metaRow.appendChild(views);
    }
    articleBody.appendChild(metaRow);

    // Content body
    const body = document.createElement("div");
    body.className = "hc-article-body";
    body.style.cssText = "font-size:14px;line-height:1.8;color:#374151;";
    body.innerHTML = simpleMarkdown(art.content);
    articleBody.appendChild(body);

    // Feedback
    if (opts.enableFeedback) {
      const feedback = document.createElement("div");
      feedback.style.cssText = "margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;";
      feedback.innerHTML = `<div style="font-size:13px;font-weight:500;margin-bottom:8px;">Was this article helpful?</div>`;

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "8px";

      const yesBtn = document.createElement("button");
      yesBtn.type = "button";
      yesBtn.textContent = "\uD83D\uDC4D Yes";
      yesBtn.style.cssText = "padding:6px 16px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;";
      yesBtn.addEventListener("click", () => { art.helpful = (art.helpful ?? 0) + 1; yesBtn.style.background = "#ecfdf5"; yesBtn.style.borderColor = "#22c55e"; yesBtn.style.color = "#166534"; noBtn.disabled = true; });
      btnRow.appendChild(yesBtn);

      const noBtn = document.createElement("button");
      noBtn.type = "button";
      noBtn.textContent = "\uD83D\uDC4E No";
      noBtn.style.cssText = yesBtn.style.cssText;
      noBtn.addEventListener("click", () => { art.notHelpful = (art.notHelpful ?? 0) + 1; noBtn.style.background = "#fef2f2"; noBtn.style.borderColor = "#ef4444"; noBtn.style.color = "#991b1b"; yesBtn.disabled = true; });
      btnRow.appendChild(noBtn);

      feedback.appendChild(btnRow);
      articleBody.appendChild(feedback);
    }

    // Related articles
    if (opts.showRelated && art.relatedIds?.length) {
      const related = art.relatedIds.map((id) => allArticles.find((a) => a.id === id)).filter(Boolean);
      if (related.length > 0) {
        const relSection = document.createElement("div");
        relSection.style.marginTop = "32px;padding-top = 20px;border-top:1px solid #e5e7eb;";
        const relTitle = document.createElement("h3");
        relTitle.style.cssText = "font-size:15px;font-weight:600;margin:0 0 12px;color:#111827;";
        relTitle.textContent = "Related Articles";
        relSection.appendChild(relTitle);
        for (const ra of related) relSection.appendChild(createArticleListItem(ra!));
        articleBody.appendChild(relSection);
      }
    }

    layout.appendChild(articleBody);
    mainSlot.appendChild(layout);

    opts.onArticleOpen?.(art);
  }

  function renderSearch(query: string): void {
    currentView = "search";
    searchQuery = query;
    updateBreadcrumbs([{ label: "Home", action: "goHome" }, { label: `"${query}"`, action: null }]);
    mainSlot.innerHTML = "";

    let results = opts.onSearch ? opts.onSearch(query) : allArticles.filter((a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.summary.toLowerCase().includes(query.toLowerCase()) ||
      (a.tags ?? []).some((t) => t.toLowerCase().includes(query.toLowerCase()))
    );

    const heading = document.createElement("h2");
    heading.style.cssText = "font-size:16px;font-weight:600;margin:0 0 12px;color:#111827;";
    heading.textContent = `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`;
    mainSlot.appendChild(heading);

    if (results.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px;color:#9ca3af;";
      empty.innerHTML = `<div style="font-size:28px;">\uD83D\uDD0D</div><div>No results found. Try different keywords.</div>`;
      mainSlot.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px;";
    for (const art of results) list.appendChild(createArticleListItem(art));
    mainSlot.appendChild(list);
  }

  // --- Components ---

  function createArticleCard(art: HelpArticle): HTMLElement {
    const card = document.createElement("div");
    card.style.cssText = `
      border:1px solid #e5e7eb;border-radius:10px;padding:16px;cursor:pointer;
      transition:all 0.15s;background:#fff;
    `;
    card.addEventListener("click", () => instance.openArticle(art.id));
    card.addEventListener("mouseenter", () => { card.style.borderColor = "#4338ca"; card.style.boxShadow = "0 2px 8px rgba(67,56,202,0.1)"; });
    card.addEventListener("mouseleave", () => { card.style.borderColor = "#e5e7eb"; card.style.boxShadow = ""; });

    const title = document.createElement("div");
    title.style.cssText = "font-weight:600;font-size:14px;color:#111827;margin-bottom:4px;";
    title.textContent = art.title;
    card.appendChild(title);

    const summary = document.createElement("div");
    summary.style.cssText = "font-size:12px;color:#6b7280;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;";
    summary.textContent = art.summary;
    card.appendChild(summary);

    return card;
  }

  function createArticleListItem(art: HelpArticle): HTMLElement {
    const item = document.createElement("div");
    item.style.cssText = `
      display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;
      cursor:pointer;transition:all 0.15s;background:#fff;
    `;
    item.addEventListener("click", () => instance.openArticle(art.id));
    item.addEventListener("mouseenter", () => { item.style.borderColor = "#c7d2fe"; item.style.background="#fafbff"; });
    item.addEventListener("mouseleave", () => { item.style.borderColor = "#e5e7eb"; item.style.background = ""; });

    const icon = document.createElement("span");
    icon.style.cssText = "font-size:20px;color:#9ca3af;flex-shrink:0;margin-top:2px;";
    icon.textContent = "\u{1F4D6}";
    item.appendChild(icon);

    const info = document.createElement("div");
    info.style.flex = "1";
    info.style.minWidth = "0";

    const title = document.createElement("div");
    title.style.cssText = "font-weight:500;font-size:14px;color:#111827;";
    title.textContent = art.title;
    info.appendChild(title);

    const summary = document.createElement("div");
    summary.style.cssText = "font-size:12px;color:#6b7280;margin-top:2px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;";
    summary.textContent = art.summary;
    info.appendChild(summary);

    item.appendChild(info);
    return item;
  }

  function updateBreadcrumbs(crumbs: Array<{ label: string; action: (() => void) | null }>): void {
    if (!breadcrumbEl) return;
    breadcrumbEl.innerHTML = "";
    for (let i = 0; i < crumbs.length; i++) {
      const crumb = crumbs[i]!;
      if (i > 0) {
        const sep = document.createElement("span");
        sep.textContent = "/";
        sep.style.color = "#d1d5db";
        breadcrumbEl.appendChild(sep);
      }
      if (crumb.action) {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = crumb.label;
        link.style.cssText = "color:#4338ca;text-decoration:none;";
        link.addEventListener("click", (e) => { e.preventDefault(); crumb.action!(); });
        breadcrumbEl.appendChild(link);
      } else {
        const span = document.createElement("span");
        span.textContent = crumb.label;
        span.style.color = "#374151";
        span.style.fontWeight = "500";
        breadcrumbEl.appendChild(span);
      }
    }
  }

  // Initial render
  renderHome();

  const instance: HelpCenterInstance = {
    element: root,

    getArticles() { return [...allArticles]; },

    setArticles(articles) { allArticles = articles; renderHome(); },

    openArticle(id: string) { renderArticle(id); },

    goHome() { renderHome(); },

    search(query: string) { renderSearch(query); },

    destroy() { destroyed = true; root.remove(); },
  };

  return instance;
}
