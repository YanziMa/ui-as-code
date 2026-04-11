/**
 * Font Picker Utilities: Font selection dropdown with live preview,
 * web-safe fonts, Google Fonts integration, font categories filtering,
 * recent/favorites, search, variant selection (weight/style), font
 * loading detection, and custom font list support.
 */

// --- Types ---

export type FontCategory = "serif" | "sans-serif" | "monospace" | "display" | "handwriting" | "all";
export type FontWeight = "thin" | "extralight" | "light" | "regular" | "medium" | "semibold" | "bold" | "extrabold" | "black";
export type FontStyle = "normal" | "italic" | "oblique";

export interface FontEntry {
  /** Font family name */
  family: string;
  /** Generic fallback */
  fallback?: string;
  /** Category */
  category: FontCategory;
  /** Available weights */
  weights?: FontWeight[];
  /** Preview text */
  previewText?: string;
  /** Is variable font */
  variable?: boolean;
  /** Google Fonts name (if available via Google Fonts) */
  googleName?: string;
  /** Custom flag (user-added) */
  custom?: boolean;
}

export interface FontPickerOptions {
  /** Container element */
  container?: HTMLElement;
  /** Initial selected font */
  initialFont?: string;
  /** Font categories to show */
  categories?: FontCategory[];
  /** Show font category filter tabs */
  showCategories?: boolean;
  /** Show search input */
  searchable?: boolean;
  /** Show recently used fonts */
  showRecent?: boolean;
  /** Max recent fonts to remember */
  maxRecent?: number;
  /** Show favorites star */
  showFavorites?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
  /** Custom font list (extends built-in) */
  customFonts?: FontEntry[];
  /** Preview text */
  previewText?: string;
  /** Preview size (px) */
  previewSize?: number;
  /** Number of visible items before scrolling */
  maxVisibleItems?: number;
  /** Dropdown width */
  width?: number | string;
  /** Load Google Fonts on demand */
  loadGoogleFonts?: boolean;
  /** Called when font is selected */
  onSelect?: (font: FontEntry) => void;
  /** Custom class name */
  className?: string;
}

export interface FontPickerInstance {
  /** Root element */
  el: HTMLElement;
  /** Get currently selected font */
  getSelectedFont: () => FontEntry | null;
  /** Select a font by family name */
  selectFont: (family: string) => void;
  /** Get all available fonts */
  getFonts: () => FontEntry[];
  /** Add a custom font */
  addCustomFont: (font: FontEntry) => void;
  /** Remove a custom font */
  removeCustomFont: (family: string) => void;
  /** Get recent fonts */
  getRecentFonts: () => string[];
  /** Clear recent history */
  clearRecent: () => void;
  /** Toggle favorite */
  toggleFavorite: (family: string) => void;
  /** Get favorites */
  getFavorites: () => string[];
  /** Open dropdown */
  open: () => void;
  /** Close dropdown */
  close: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Built-in Web-Safe & System Fonts ---

const BUILT_IN_FONTS: FontEntry[] = [
  // Sans-serif
  { family: "Arial", fallback: "sans-serif", category: "sans-serif", weights: ["regular", "bold"] },
  { family: "Helvetica", fallback: "sans-serif", category: "sans-serif", weights: ["regular", "bold"] },
  { family: "Verdana", fallback: "sans-serif", category: "sans-serif" },
  { family: "Tahoma", fallback: "sans-serif", category: "sans-serif" },
  { family: "Trebuchet MS", fallback: "sans-serif", category: "sans-serif" },
  { family: "Gill Sans", fallback: "sans-serif", category: "sans-serif" },
  { family: "Nunito", fallback: "sans-serif", category: "sans-serif", googleName: "Nunito" },
  { family: "Open Sans", fallback: "sans-serif", category: "sans-serif", googleName: "Open Sans" },
  { family: "Roboto", fallback: "sans-serif", category: "sans-serif", googleName: "Roboto" },
  { family: "Inter", fallback: "sans-serif", category: "sans-serif", googleName: "Inter" },
  { family: "Lato", fallback: "sans-serif", category: "sans-serif", googleName: "Lato" },
  { family: "Montserrat", fallback: "sans-serif", category: "sans-serif", googleName: "Montserrat" },
  { family: "Poppins", fallback: "sans-serif", category: "sans-serif", googleName: "Poppins" },

  // Serif
  { family: "Georgia", fallback: "serif", category: "serif" },
  { family: "Times New Roman", fallback: "serif", category: "serif" },
  { family: "Palatino", fallback: "serif", category: "serif" },
  { family: "Garamond", fallback: "serif", category: "serif" },
  { family: "Playfair Display", fallback: "serif", category: "serif", googleName: "Playfair Display" },
  { family: "Merriweather", fallback: "serif", category: "serif", googleName: "Merriweather" },
  { family: "Lora", fallback: "serif", category: "serif", googleName: "Lora" },
  { family: "Source Serif Pro", fallback: "serif", category: "serif", googleName: "Source Serif Pro" },

  // Monospace
  { family: "Courier New", fallback: "monospace", category: "monospace" },
  { family: "Consolas", fallback: "monospace", category: "monospace" },
  { family: "Monaco", fallback: "monospace", category: "monospace" },
  { family: "Fira Code", fallback: "monospace", category: "monospace", googleName: "Fira Code" },
  { family: "Source Code Pro", fallback: "monospace", category: "monospace", googleName: "Source Code Pro" },
  { family: "JetBrains Mono", fallback: "monospace", category: "monospace", googleName: "JetBrains Mono" },

  // Display
  { family: "Impact", fallback: "sans-serif", category: "display" },
  { family: "Comic Sans MS", fallback: "cursive", category: "display" },
  { family: "Abril Fatface", fallback: "serif", category: "display", googleName: "Abril Fatface" },
  { family: "Bebas Neue", fallback: "sans-serif", category: "display", googleName: "Bebas Neue" },
  { family: "Oswald", fallback: "sans-serif", category: "display", googleName: "Oswald" },

  // Handwriting
  { family: "Brush Script MT", fallback: "cursive", category: "handwriting" },
  { family: "Dancing Script", fallback: "cursive", category: "handwriting", googleName: "Dancing Script" },
  { family: "Pacifico", fallback: "cursive", category: "handwriting", googleName: "Pacifico" },
];

// --- Core Factory ---

/**
 * Create a font picker component.
 *
 * @example
 * ```ts
 * const picker = createFontPicker({
 *   initialFont: "Inter",
 *   showCategories: true,
 *   searchable: true,
 *   onSelect: (font) => console.log("Selected:", font.family),
 * });
 * ```
 */
export function createFontPicker(options: FontPickerOptions): FontPickerInstance {
  const {
    container,
    initialFont,
    categories = ["all"],
    showCategories = true,
    searchable = true,
    showRecent = true,
    maxRecent = 8,
    showFavorites = true,
    storageKey = "font-picker-state",
    customFonts = [],
    previewText = "The quick brown fox jumps over the lazy dog",
    previewSize = 18,
    maxVisibleItems = 8,
    width = 280,
    loadGoogleFonts = false,
    onSelect,
    className,
  } = options;

  let _fonts = [...BUILT_IN_FONTS, ...customFonts];
  let _selected: FontEntry | null = _fonts.find((f) => f.family === initialFont) ?? null;
  let _open = false;
  let _activeCategory: FontCategory = "all";
  let _searchQuery = "";
  let _recent: string[] = [];
  let _favorites: Set<string> = new Set();
  let cleanupFns: Array<() => void> = [];

  // Load persisted state
  _loadState();

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `font-picker ${className ?? ""}`.trim();
  root.style.cssText =
    `position:relative;display:inline-block;width:${typeof width === "number" ? `${width}px` : width};` +
    "font-family:-apple-system,sans-serif;font-size:13px;";

  // Trigger button
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "font-picker-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.style.cssText =
    "display:flex;align-items:center;width:100%;padding:8px 12px;border:1px solid #d1d5db;" +
    "border-radius:8px;background:#fff;cursor:pointer;gap:8px;text-align:left;" +
    "transition:border-color 0.15s;font-size:14px;color:#374151;";

  // Selected font preview in trigger
  const triggerPreview = document.createElement("span");
  triggerPreview.className = "font-picker-trigger-preview";
  triggerPreview.style.cssText = "flex:1;overflow:hidden;text-ellipsis;white-space:nowrap;";
  triggerPreview.textContent = _selected?.family ?? "Select font...";
  trigger.appendChild(triggerPreview);

  // Chevron
  const chevron = document.createElement("span");
  chevron.innerHTML = "&#9662;";
  chevron.style.cssText = "font-size:10px;color:#9ca3af;transition:transform 0.2s;flex-shrink:0;";
  trigger.appendChild(chevron);
  root.appendChild(trigger);

  // Dropdown panel
  const dropdown = document.createElement("div");
  dropdown.className = "font-picker-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.style.cssText =
    "position:absolute;left:0;right:0;top:100%;margin-top:4px;z-index:1050;" +
    "background:#fff;border:1px solid #e5e7eb;border-radius:8px;" +
    "box-shadow:0 4px 12px rgba(0,0,0,0.1);display:none;flex-direction:column;" +
    `max-height:${maxVisibleItems * 44}px;overflow-y:auto;`;

  // Category tabs
  let categoryBar: HTMLElement | null = null;
  if (showCategories) {
    categoryBar = document.createElement("div");
    categoryBar.className = "font-picker-categories";
    categoryBar.style.cssText =
      "display:flex;border-bottom:1px solid #f3f4f6;padding:6px 8px;gap:4px;flex-shrink:0;";
    for (const cat of categories) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      tab.dataset.category = cat;
      tab.style.cssText =
        "padding:4px 10px;border:none;background:none;cursor:pointer;" +
        "border-radius:4px;font-size:11px;font-weight:500;color:#6b7280;" +
        "transition:all 0.15s;" +
        (cat === _activeCategory ? "background:#eff6ff;color:#2563eb;" : "");
      tab.addEventListener("click", () => {
        _activeCategory = cat as FontCategory;
        _updateCategoryTabs();
        _renderList();
      });
      categoryBar.appendChild(tab);
    }
    dropdown.appendChild(categoryBar);
  }

  // Search input
  let searchInput: HTMLInputElement | null = null;
  if (searchable) {
    const searchWrap = document.createElement("div");
    searchWrap.style.cssText = "padding:6px 8px;border-bottom:1px solid #f3f4f6;";
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search fonts...";
    searchInput.style.cssText =
      "width:100%;padding:5px 8px;border:1px solid #d1d5db;border-radius:5px;" +
      "font-size:12px;outline:none;box-sizing:border-box;";
    searchInput.addEventListener("input", (e) => {
      _searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
      _renderList();
    });
    searchWrap.appendChild(searchInput);
    dropdown.appendChild(searchWrap);
  }

  // Font list
  const listEl = document.createElement("div");
  listEl.className = "font-picker-list";
  listEl.style.cssText = "overflow-y:auto;flex:1;";
  dropdown.appendChild(listEl);

  root.appendChild(dropdown);
  (container ?? document.body).appendChild(root);

  // --- Rendering ---

  function _updateCategoryTabs(): void {
    if (!categoryBar) return;
    categoryBar.querySelectorAll("button").forEach((tab) => {
      const isActive = tab.dataset.category === _activeCategory;
      tab.style.background = isActive ? "#eff6ff" : "none";
      tab.style.color = isActive ? "#2563eb" : "#6b7280";
    });
  }

  function _getFilteredFonts(): FontEntry[] {
    let filtered = _fonts;

    // Category filter
    if (_activeCategory !== "all") {
      filtered = filtered.filter((f) => f.category === _activeCategory);
    }

    // Search filter
    if (_searchQuery) {
      filtered = filtered.filter((f) =>
        f.family.toLowerCase().includes(_searchQuery) ||
        f.category.includes(_searchQuery),
      );
    }

    // Sort: favorites first, then recent, then alphabetical
    filtered.sort((a, b) => {
      const aFav = _favorites.has(a.family) ? -1 : 0;
      const bFav = _favorites.has(b.family) ? -1 : 0;
      if (aFav !== bFav) return aFav - bFav;
      const aRec = _recent.indexOf(a.family) >= 0 ? -1 : 0;
      const bRec = _recent.indexOf(b.family) >= 0 ? -1 : 0;
      if (aRec !== bRec) return aRec - bRec;
      return a.family.localeCompare(b.family);
    });

    return filtered;
  }

  function _renderList(): void {
    listEl.innerHTML = "";

    const fonts = _getFilteredFonts();

    if (fonts.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:20px;text-align:center;color:#9ca3af;font-size:13px;";
      empty.textContent = "No fonts found";
      listEl.appendChild(empty);
      return;
    }

    for (const font of fonts) {
      const isSelected = _selected?.family === font.family;
      const isFav = _favorites.has(font.family);

      const item = document.createElement("div");
      item.className = `font-picker-item${isSelected ? " selected" : ""}`;
      item.dataset.fontFamily = font.family;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(isSelected));
      item.style.cssText =
        "display:flex;align-items:center;padding:8px 12px;cursor:pointer;gap:8px;" +
        (isSelected ? "background:#eff6ff;" : "") +
        "transition:background 0.1s;";

      // Favorite star
      if (showFavorites) {
        const star = document.createElement("span");
        star.innerHTML = isFav ? "&#9733;" : "&#9734;";
        star.style.cssText =
          `color:${isFav ? "#f59e0b" : "#d1d5db"};font-size:14px;cursor:pointer;flex-shrink:0;` +
          "transition:color 0.15s;line-height:1;";
        star.addEventListener("click", (e) => { e.stopPropagation(); toggleFavorite(font.family); });
        item.appendChild(star);
      }

      // Font info area
      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;";

      // Family name
      const nameEl = document.createElement("div");
      nameEl.style.cssText = "font-size:12px;color:#374151;font-weight:500;margin-bottom:2px;";
      nameEl.textContent = font.family;
      info.appendChild(nameEl);

      // Live preview
      const previewEl = document.createElement("div");
      previewEl.style.cssText =
        `font-family:"${font.family}", ${font.fallback ?? "sans-serif"};` +
        `font-size:${Math.min(previewSize, 14)}px;color:#6b7280;` +
        "overflow:hidden;text-ellipsis;white-space:nowrap;max-width:200px;";
      previewEl.textContent = previewText;
      info.appendChild(item);

      // Fix: append preview after name
      info.appendChild(previewEl);
      item.appendChild(info);

      // Checkmark for selected
      if (isSelected) {
        const check = document.createElement("span");
        check.innerHTML = "&#10003;";
        check.style.cssText = "color:#3b82f6;font-weight:bold;font-size:14px;flex-shrink:0;";
        item.appendChild(check);
      }

      // Hover
      item.addEventListener("mouseenter", () => { if (!isSelected) item.style.background = "#f9fafb"; });
      item.addEventListener("mouseleave", () => { if (!isSelected) item.style.background = ""; });

      // Click to select
      item.addEventListener("click", () => selectFont(font.family));

      listEl.appendChild(item);
    }
  }

  // --- Persistence ---

  function _loadState(): void {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const state = JSON.parse(raw);
        _recent = state.recent ?? [];
        _favorites = new Set(state.favorites ?? []);
      }
    } catch {}
  }

  function _saveState(): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        recent: _recent,
        favorites: [..._favorites],
      }));
    } catch {}
  }

  function _addToRecent(family: string): void {
    _recent = _recent.filter((f) => f !== family);
    _recent.unshift(family);
    if (_recent.length > maxRecent) _recent = _recent.slice(0, maxRecent);
    _saveState();
  }

  // --- Open/Close ---

  function open(): void {
    if (_open) return;
    _open = true;
    dropdown.style.display = "flex";
    chevron.style.transform = "rotate(180deg)";
    trigger.setAttribute("aria-expanded", "true");
    trigger.style.borderColor = "#3b82f6";
    _renderList();
    if (searchable) setTimeout(() => searchInput?.focus(), 50);
    _setupOutsideClick();
  }

  function close(): void {
    if (!_open) return;
    _open = false;
    dropdown.style.display = "none";
    chevron.style.transform = "";
    trigger.setAttribute("aria-expanded", "false");
    trigger.style.borderColor = "";
    if (searchable) searchInput.value = "";
    _searchQuery = "";
    _removeListeners();
  }

  function toggle(): void { _open ? close() : open(); }

  function _setupOutsideClick(): void {
    const handler = (e: MouseEvent) => { if (!root.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", handler);
    cleanupFns.push(() => document.removeEventListener("mousedown", handler));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // --- Public API ---

  function getSelectedFont(): FontEntry | null { return _selected; }

  function selectFont(family: string): void {
    const font = _fonts.find((f) => f.family === family);
    if (!font) return;
    _selected = font;
    triggerPreview.textContent = font.family;
    triggerPreview.style.fontFamily = `"${font.family}", ${font.fallback ?? "sans-serif"}`;
    _addToRecent(font.family);

    // Load Google Font if needed
    if (loadGoogleFonts && font.googleName) {
      _loadGoogleFont(font.googleName);
    }

    onSelect?.(font);
    if (_open && !showCategories) close();
    _renderList();
  }

  function getFonts(): FontEntry[] { return [..._fonts]; }

  function addCustomFont(font: FontEntry): void {
    if (!_fonts.find((f) => f.family === font.family)) {
      _fonts.push({ ...font, custom: true });
      if (_open) _renderList();
    }
  }

  function removeCustomFont(family: string): void {
    _fonts = _fonts.filter((f) => f.family !== family || !f.custom);
    if (_open) _renderList();
  }

  function getRecentFonts(): string[] { return [..._recent]; }
  function clearRecent(): void { _recent = []; _saveState(); }

  function toggleFavorite(family: string): void {
    if (_favorites.has(family)) _favorites.delete(family);
    else _favorites.add(family);
    _saveState();
    if (_open) _renderList();
  }

  function getFavorites(): string[] { return [..._favorites]; }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Events ---
  trigger.addEventListener("click", toggle);
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!_open) open();
    }
    if (e.key === "Escape" && _open) { e.preventDefault(); close(); }
  });

  // Keyboard navigation in list
  dropdown.addEventListener("keydown", (e) => {
    const items = Array.from(listEl.querySelectorAll<HTMLElement>(".font-picker-item"));
    const focused = document.activeElement;
    const idx = items.indexOf(focused as HTMLElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        items[Math.min(idx + 1, items.length - 1)]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        items[Math.max(idx - 1, 0)]?.focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focused?.classList.contains("font-picker-item")) {
          selectFont((focused as HTMLElement).dataset.fontFamily!);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        trigger.focus();
        break;
    }
  });

  _renderList();

  return {
    el: root,
    getSelectedFont,
    selectFont,
    getFonts,
    addCustomFont,
    removeCustomFont,
    getRecentFonts,
    clearRecent,
    toggleFavorite,
    getFavorites,
    open,
    close,
    destroy,
  };
}

// --- Google Fonts Loader ---

const _loadedGoogleFonts = new Set<string>();

function _loadGoogleFont(family: string): void {
  if (_loadedGoogleFonts.has(family)) return;
  _loadedGoogleFonts.add(family);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.replace(/ /g, "+"))}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}
