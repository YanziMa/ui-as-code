/**
 * Search Dialog: Full-screen modal search with fuzzy matching,
 * keyboard navigation, recent searches, category tabs, result grouping,
 * and customizable data sources.
 */

// --- Types ---

export interface SearchResult {
  id: string;
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Category for grouping */
  category?: string;
  /** URL to navigate to on select */
  url?: string;
  /** Icon (emoji or text) */
  icon?: string;
  /** Additional keywords for search */
  keywords?: string[];
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export type SearchCategory = {
  id: string;
  label: string;
  icon?: string;
};

export interface SearchDialogOptions {
  /** Container element (modal renders into document.body by default) */
  container?: HTMLElement;
  /** Searchable items */
  items?: SearchResult[];
  /** Categories for tab filtering */
  categories?: SearchCategory[];
  /** Placeholder text */
  placeholder?: string;
  /** Hotkey to open (e.g., "Ctrl+K", "Cmd+P") */
  hotkey?: string;
  /** Show recent searches? */
  showRecent?: boolean;
  /** Max recent searches stored */
  maxRecent?: number;
  /** Storage key for recent searches */
  recentKey?: string;
  /** Max results shown */
  maxResults?: number;
  /** Show category tabs? */
  showCategories?: boolean;
  /** Callback on item selection */
  onSelect?: (result: SearchResult) => void;
  /** Custom search/filter function */
  customSearch?: (query: string, items: SearchResult[]) => SearchResult[];
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Debounce input (ms) */
  debounceMs?: number;
  /** Custom CSS class */
  className?: string;
}

export interface SearchDialogInstance {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  setItems: (items: SearchResult[]) => void;
  search: (query: string) => void;
  getRecentSearches: () => string[];
  clearRecent: () => void;
  destroy: () => void;
}

// --- Fuzzy Scoring ---

function scoreItem(query: string, item: SearchResult): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const text = `${item.title} ${item.subtitle ?? ""} ${item.keywords?.join(" ") ?? ""}`.toLowerCase();

  // Exact title match
  if (item.title.toLowerCase() === q) return 1000;
  // Title starts with query
  if (item.title.toLowerCase().startsWith(q)) return 800 + q.length * 10;
  // Title contains query
  if (item.title.toLowerCase().includes(q)) return 500 + q.length * 5;
  // Subtitle contains
  if (item.subtitle?.toLowerCase().includes(q)) return 300 + q.length * 3;
  // General text contains
  if (text.includes(q)) return 100 + q.length;

  // Character-by-character match
  let qi = 0, ti = 0, score = 0;
  while (qi < q.length && ti < text.length) {
    if (q[qi] === text[ti]) {
      score += qi === 0 ? 3 : 1; // bonus for first char match
      qi++;
    }
    ti++;
  }

  return qi === q.length ? score : -1;
}

// --- Main Factory ---

export function createSearchDialog(options: SearchDialogOptions): SearchDialogInstance {
  const opts = {
    container: options.container ?? document.body,
    items: options.items ?? [],
    categories: options.categories ?? [],
    placeholder: options.placeholder ?? "Search...",
    hotkey: options.hotkey ?? "Ctrl+K",
    showRecent: options.showRecent ?? true,
    maxRecent: options.maxRecent ?? 8,
    recentKey: options.recentKey ?? "search-recent",
    maxResults: options.maxResults ?? 12,
    showCategories: options.showCategories ?? true,
    animationDuration: options.animationDuration ?? 150,
    debounceMs: options.debounceMs ?? 150,
    className: options.className ?? "",
    ...options,
  };

  let allItems = [...opts.items];
  let isOpenState = false;
  let currentQuery = "";
  let activeCategory: string | null = null;
  let selectedIndex = 0;
  let destroyed = false;
  let recentSearches: string[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Load recent searches
  try {
    const saved = localStorage.getItem(opts.recentKey);
    if (saved) recentSearches = JSON.parse(saved);
  } catch {}

  // Overlay backdrop
  const overlay = document.createElement("div");
  overlay.className = `search-dialog-overlay ${opts.className}`;
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:none;
    align-items:flex-start;justify-content:center;padding-top:18vh;
    opacity:0;transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Dialog panel
  const panel = document.createElement("div");
  panel.className = "sd-panel";
  panel.style.cssText = `
    width:620px;max-width:92vw;background:#fff;border-radius:16px;
    box-shadow:0 24px 80px rgba(0,0,0,0.3),0 0 1px rgba(0,0,0,0.1);
    overflow:hidden;font-family:-apple-system,sans-serif;
    transform:scale(0.96);transition:transform ${opts.animationDuration}ms ease;
    display:none;flex-direction:column;max-height:70vh;
  `;

  // Search input area
  const searchArea = document.createElement("div");
  searchArea.style.cssText = `
    display:flex;align-items:center;gap:10px;padding:14px 18px;
    border-bottom:1px solid #e5e7eb;
  `;

  const searchIcon = document.createElement("span");
  searchIcon.innerHTML = "\u{1F50D}";
  searchIcon.style.cssText = "font-size:18px;color:#9ca3af;";
  searchArea.appendChild(searchIcon);

  const input = document.createElement("input");
  input.type = "text";
  input.spellcheck = false;
  input.placeholder = opts.placeholder;
  input.autocomplete = "off";
  input.style.cssText = `
    flex:1;border:none;outline:none;font-size:16px;color:#111827;
    background:none;font-family:inherit;
  `;
  searchArea.appendChild(input);

  // Clear button
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.innerHTML = "&#215;";
  clearBtn.style.cssText = `
    background:none;border:none;font-size:16px;color:#9ca3af;cursor:pointer;
    padding:4px;border-radius:4px;display:none;
  `;
  clearBtn.addEventListener("click", () => { input.value = ""; handleInput(""); });
  clearBtn.addEventListener("mouseenter", () => { clearBtn.style.background = "#f3f4f6"; });
  clearBtn.addEventListener("mouseleave", () => { clearBtn.style.background = ""; });
  searchArea.appendChild(clearBtn);

  panel.appendChild(searchArea);

  // Category tabs
  let tabsEl: HTMLElement | null = null;
  if (opts.showCategories && opts.categories.length > 0) {
    tabsEl = document.createElement("div");
    tabsEl.className = "sd-tabs";
    tabsEl.style.cssText = `
      display:flex;gap:2px;padding:8px 14px;border-bottom:1px solid #f0f0f0;
      overflow-x:auto;flex-shrink:0;
    `;

    const allTab = createTab("All", null);
    tabsEl.appendChild(allTab);

    for (const cat of opts.categories) {
      tabsEl.appendChild(createTab(cat.label, cat.id));
    }

    panel.appendChild(tabsEl);
  }

  function createTab(label: string, catId: string | null): HTMLElement {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.textContent = label;
    tab.dataset.category = catId ?? "";
    tab.style.cssText = `
      padding:5px 14px;border-radius:8px;font-size:13px;font-weight:500;
      border:none;background:${catId === null ? "#eef2ff" : "transparent"};
      color:${catId === null ? "#4338ca" : "#6b7280"};cursor:pointer;white-space:nowrap;
      transition:all 0.15s;
    `;
    tab.addEventListener("click", () => {
      activeCategory = catId;
      // Update tab styles
      tabsEl?.querySelectorAll("button").forEach((t) => {
        const isActive = t.dataset.category === (catId ?? "");
        t.style.background = isActive ? "#eef2ff" : "transparent";
        t.style.color = isActive ? "#4338ca" : "#6b7280";
      });
      renderResults();
    });
    tab.addEventListener("mouseenter", () => {
      if ((activeCategory === null && catId === null) || activeCategory === catId) return;
      tab.style.background = "#f3f4f6";
    });
    tab.addEventListener("mouseleave", () => {
      if ((activeCategory === null && catId === null) || activeCategory === catId) return;
      tab.style.background = "";
    });
    return tab;
  }

  // Results area
  const resultsArea = document.createElement("div");
  resultsArea.className = "sd-results";
  resultsArea.style.cssText = "overflow-y:auto;flex:1;padding:6px 0;";
  panel.appendChild(resultsArea);

  overlay.appendChild(panel);
  opts.container.appendChild(overlay);

  function getFilteredItems(): SearchResult[] {
    let items = [...allItems];
    if (activeCategory) {
      items = items.filter((i) => i.category === activeCategory);
    }
    return items;
  }

  function renderResults(): void {
    resultsArea.innerHTML = "";
    selectedIndex = 0;

    const query = currentQuery.trim().toLowerCase();

    if (!query) {
      // Show recent searches
      if (opts.showRecent && recentSearches.length > 0) {
        const header = document.createElement("div");
        header.style.cssText = "padding:10px 18px 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;";
        header.textContent = "Recent Searches";
        resultsArea.appendChild(header);

        for (let i = 0; i < Math.min(recentSearches.length, opts.maxRecent); i++) {
          const term = recentSearches[i]!;
          const row = createResultRow({
            id: `recent-${i}`,
            title: term,
            icon: "\u{1F552}",
            subtitle: "Click to search again",
          }, i);
          row.addEventListener("click", () => { input.value = term; handleInput(term); });
          resultsArea.appendChild(row);
        }
      } else {
        const empty = document.createElement("div");
        empty.style.cssText = "padding:32px 18px;text-align:center;color:#9ca3af;";
        empty.innerHTML = `<div style="font-size:32px;margin-bottom:8px;">\u{1F50D}</div><div style="font-size:14px;">Start typing to search</div>`;
        resultsArea.appendChild(empty);
      }
      return;
    }

    // Use custom search or built-in scoring
    let results: SearchResult[];
    if (opts.customSearch) {
      results = opts.customSearch(query, getFilteredItems());
    } else {
      const scored = getFilteredItems()
        .map((item) => ({ item, score: scoreItem(query, item) }))
        .filter((s) => s.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, opts.maxResults);
      results = scored.map((s) => s.item);
    }

    if (results.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:32px 18px;text-align:center;color:#9ca3af;";
      empty.innerHTML = `<div style="font-size:32px;margin-bottom:8px;">\u{1F50E}</div><div style="font-size:14px;">No results for "${escapeHtml(query)}"</div>`;
      resultsArea.appendChild(empty);
      return;
    }

    // Group by category if multiple categories exist
    if (opts.showCategories && opts.categories.length > 0) {
      let lastCat = "";
      for (let i = 0; i < results.length; i++) {
        const r = results[i]!;
        if (r.category && r.category !== lastCat) {
          lastCat = r.category;
          const catLabel = opts.categories.find((c) => c.id === r.category)?.label ?? r.category;
          const hdr = document.createElement("div");
          hdr.style.cssText = "padding:8px 18px 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;";
          hdr.textContent = catLabel;
          resultsArea.appendChild(hdr);
        }
        resultsArea.appendChild(createResultRow(r, i));
      }
    } else {
      for (let i = 0; i < results.length; i++) {
        resultsArea.appendChild(createResultRow(results[i]!, i));
      }
    }
  }

  function createResultRow(result: SearchResult, index: number): HTMLElement {
    const row = document.createElement("button");
    row.type = "button";
    row.dataset.index = String(index);
    row.style.cssText = `
      display:flex;align-items:center;gap:12px;width:100%;padding:10px 18px;
      border:none;background:${index === selectedIndex ? "#eef2ff" : "transparent"};
      color:${index === selectedIndex ? "#111827" : "#374151"};cursor:pointer;
      text-align:left;font-family:inherit;font-size:14px;transition:background 0.08s;
    `;

    if (result.icon) {
      const icon = document.createElement("span");
      icon.textContent = result.icon;
      icon.style.cssText = "font-size:18px;width:22px;text-align:center;flex-shrink:0;";
      row.appendChild(icon);
    }

    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;";

    const title = document.createElement("div");
    title.style.cssText = "font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    title.textContent = result.title;
    content.appendChild(title);

    if (result.subtitle) {
      const sub = document.createElement("div");
      sub.style.cssText = "font-size:12px;color:#9ca3af;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      sub.textContent = result.subtitle;
      content.appendChild(sub);
    }

    row.appendChild(content);

    // Arrow indicator
    const arrow = document.createElement("span");
    arrow.innerHTML = "&rsaquo;";
    arrow.style.cssText = "color:#d1d5db;font-size:14px;flex-shrink:0;";
    row.appendChild(arrow);

    row.addEventListener("click", () => handleSelect(result));
    row.addEventListener("mouseenter", () => {
      selectedIndex = index;
      renderResults();
    });

    return row;
  }

  function handleSelect(result: SearchResult): void {
    // Save to recent
    if (currentQuery.trim() && opts.showRecent) {
      recentSearches = [currentQuery.trim(), ...recentSearches.filter((s) => s !== currentQuery.trim())].slice(0, opts.maxRecent);
      try { localStorage.setItem(opts.recentKey, JSON.stringify(recentSearches)); } catch {}
    }

    opts.onSelect?.(result);
    if (result.url) window.open(result.url, "_blank");
    instance.close();
  }

  function handleInput(value: string): void {
    currentQuery = value;
    clearBtn.style.display = value ? "block" : "none";

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderResults();
    }, opts.debounceMs);
  }

  function openDialog(): void {
    if (isOpenState) return;
    isOpenState = true;
    currentQuery = "";
    selectedIndex = 0;

    overlay.style.display = "flex";
    panel.style.display = "flex";

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      panel.style.transform = "scale(1)";
      input.focus();
    });

    renderResults();
  }

  function closeDialog(): void {
    if (!isOpenState) return;
    isOpenState = false;
    overlay.style.opacity = "0";
    panel.style.transform = "scale(0.96)";

    setTimeout(() => {
      overlay.style.display = "none";
    }, opts.animationDuration);
  }

  // Event listeners
  input.addEventListener("input", () => handleInput(input.value));

  input.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex++;
        renderResults();
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderResults();
        break;
      case "Enter":
        e.preventDefault();
        const btns = resultsArea.querySelectorAll<HTMLElement>("button[data-index]");
        const sel = btns[selectedIndex];
        if (sel) sel.click();
        break;
      case "Escape":
        e.preventDefault();
        closeDialog();
        break;
    }
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDialog();
  });

  // Global hotkey
  if (opts.hotkey) {
    document.addEventListener("keydown", (e) => {
      const keyStr = formatHotkey(e);
      if (keyStr === opts.hotkey) {
        e.preventDefault();
        instance.toggle();
      }
    });
  }

  function formatHotkey(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push(e.metaKey ? "Cmd" : "Ctrl");
    if (e.key.length === 1) parts.push(e.key.toUpperCase());
    else parts.push(e.key);
    return parts.join("+");
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  const instance: SearchDialogInstance = {
    element: overlay,

    open() { openDialog(); },
    close() { closeDialog(); },
    toggle() { isOpenState ? closeDialog() : openDialog(); },
    isOpen() { return isOpenState; },

    setItems(items: SearchResult[]) {
      allItems = items;
      renderResults();
    },

    search(query: string) {
      currentQuery = query;
      input.value = query;
      renderResults();
    },

    getRecentSearches() { return [...recentSearches]; },

    clearRecent() {
      recentSearches = [];
      try { localStorage.removeItem(opts.recentKey); } catch {}
      renderResults();
    },

    destroy() {
      destroyed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      overlay.remove();
    },
  };

  return instance;
}
