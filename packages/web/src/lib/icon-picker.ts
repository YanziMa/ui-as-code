/**
 * Icon Picker Utilities: Icon selection grid with categories, search,
 * recent icons, favorites, SVG icon support, icon size variants,
 * copy SVG/code, keyboard navigation, and custom icon sets.
 */

// --- Types ---

export type IconCategory = "arrows" | "media" | "communication" | "device" | "text" |
                           "shapes" | "charts" | "commerce" | "location" | "people" |
                           "weather" | "time" | "code" | "files" | "all";
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface IconEntry {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** SVG markup or Unicode character */
  svg: string;
  /** Category */
  category: IconCategory;
  /** Keywords for search */
  keywords?: string[];
  /** Is this a custom (user-added) icon? */
  custom?: boolean;
  /** Group/subcategory */
  group?: string;
}

export interface IconPickerOptions {
  /** Container element */
  container?: HTMLElement;
  /** Icons to display */
  icons?: IconEntry[];
  /** Categories to show */
  categories?: IconCategory[];
  /** Grid columns count */
  columns?: number;
  /** Icon size in picker grid */
  iconSize?: IconSize;
  /** Show category tabs */
  showCategories?: boolean;
  /** Show search */
  searchable?: boolean;
  /** Show recently used */
  showRecent?: boolean;
  /** Show favorites */
  showFavorites?: boolean;
  /** Max recent icons */
  maxRecent?: number;
  /** Picker width */
  width?: number | string;
  /** Picker height */
  height?: number | string;
  /** Allow multiple selection */
  multiple?: boolean;
  /** Max selections (0 = unlimited) */
  maxSelections?: number;
  /** Output format on selection */
  outputFormat?: "svg" | "unicode" | "id";
  /** Called when icon(s) selected */
  onSelect?: (icons: IconEntry[]) => void;
  /** Custom class name */
  className?: string;
}

export interface IconPickerInstance {
  /** Root element */
  el: HTMLElement;
  /** Get selected icon(s) */
  getSelected: () => IconEntry[];
  /** Select an icon by ID */
  select: (id: string) => void;
  /** Deselect an icon */
  deselect: (id: string) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Add custom icon */
  addIcon: (icon: IconEntry) => void;
  /** Remove custom icon */
  removeIcon: (id: string) => void;
  /** Get recent icons */
  getRecent: () => string[];
  /** Toggle favorite */
  toggleFavorite: (id: string) => void;
  /** Open picker */
  open: () => void;
  /** Close picker */
  close: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Destroy */
  destroy: () => void;
}

// --- Size Map ---

const ICON_SIZE_MAP: Record<IconSize, number> = {
  xs: 16, sm: 20, md: 24, lg: 32, xl: 40,
};

// --- Built-in Icons (Unicode/SVG subset) ---

const BUILT_IN_ICONS: IconEntry[] = [
  // Arrows
  { id: "arrow-left", name: "Arrow Left", svg: "&#8592;", category: "arrows", keywords: ["back", "prev"] },
  { id: "arrow-up", name: "Arrow Up", svg: "&#8593;", category: "arrows", keywords: ["up", "top"] },
  { id: "arrow-right", name: "Arrow Right", svg: "&#8594;", category: "arrows", keywords: ["forward", "next"] },
  { id: "arrow-down", name: "Arrow Down", svg: "&#8595;", category: "arrows", keywords: ["down", "bottom"] },
  { id: "chevron-left", name: "Chevron Left", svg: "&#8249;", category: "arrows" },
  { id: "chevron-right", name: "Chevron Right", svg: "&#8250;", category: "arrows" },
  { id: "chevron-up", name: "Chevron Up", svg: "&#x2303;", category: "arrows" },
  { id: "chevron-down", name: "Chevron Down", svg: "&#x2304;", category: "arrows" },
  { id: "expand", name: "Expand", svg: "&#10549;", category: "arrows", keywords: ["fullscreen", "maximize"] },
  { id: "collapse", name: "Collapse", svg: "&#10550;", category: "arrows", keywords: ["minimize"] },
  { id: "redo", name: "Redo", svg: "&#8635;", category: "arrows", keywords: ["repeat", "forward"] },
  { id: "undo", name: "Undo", svg: "&#8630;", category: "arrows", keywords: ["back"] },

  // Media
  { id: "play", name: "Play", svg: "&#9654;", category: "media" },
  { id: "pause", name: "Pause", svg: "&#9208;", category: "media" },
  { id: "stop", name: "Stop", svg: "&#9632;", category: "media" },
  { id: "volume-off", name: "Mute", svg: "&#128263;", category: "media", keywords: ["mute", "silent"] },
  { id: "volume-on", name: "Volume", svg: "&#128266;", category: "media", keywords: ["sound", "audio"] },
  { id: "image", name: "Image", svg: "&#128247;", category: "media", keywords: ["picture", "photo"] },
  { id: "video", name: "Video", svg: "&#127909;", category: "media" },
  { id: "music", name: "Music", svg: "&#9835;", category: "media", keywords: ["audio", "note"] },

  // Communication
  { id: "mail", name: "Mail", svg: "&#9993;", category: "communication", keywords: ["email", "message"] },
  { id: "phone", name: "Phone", svg: "&#128222;", category: "communication", keywords: ["call", "telephone"] },
  { id: "chat", name: "Chat", svg: "&#128172;", category: "communication", keywords: ["message", "bubble"] },
  { id: "send", name: "Send", svg: "&#10148;", category: "communication", keywords: ["submit"] },
  { id: "bell", name: "Bell", svg: "&#128276;", category: "communication", keywords: ["notify", "alert"] },
  { id: "share", name: "Share", svg: "&#10150;", category: "communication" },

  // Device
  { id: "monitor", name: "Monitor", svg: "&#128187;", category: "device", keywords: ["screen", "display"] },
  { id: "laptop", name: "Laptop", svg: "&#128187;", category: "device" },
  { id: "phone-device", name: "Phone", svg: "&#128241;", category: "device", keywords: ["mobile"] },
  { id: "tablet", name: "Tablet", svg: "&#128242;", category: "device" },
  { id: "camera", name: "Camera", svg: "&#128248;", category: "device" },
  { id: "usb", name: "USB", svg: "&#128265;", category: "device" },

  // Text
  { id: "bold", name: "Bold", svg: "<b>B</b>", category: "text" },
  { id: "italic", name: "Italic", svg: "<i>I</i>", category: "text" },
  { id: "underline", name: "Underline", svg: "<u>U</u>", category: "text" },
  { id: "strikethrough", name: "Strikethrough", svg: "<s>S</s>", category: "text" },
  { id: "align-left", name: "Align Left", svg: "&#8676;", category: "text" },
  { id: "align-center", name: "Align Center", svg: "&#8734;", category: "text" },
  { id: "align-right", name: "Align Right", svg: "&#8677;", category: "text" },
  { id: "link", name: "Link", svg: "&#128279;", category: "text", keywords: ["url", "hyperlink"] },

  // Shapes
  { id: "circle", name: "Circle", svg: "&#9675;", category: "shapes" },
  { id: "square", name: "Square", svg: "&#9723;", category: "shapes" },
  { id: "triangle", name: "Triangle", svg: "&#9650;", category: "shapes" },
  { id: "star", name: "Star", svg: "&#9733;", category: "shapes" },
  { id: "heart", name: "Heart", svg: "&#9829;", category: "shapes" },
  { id: "flag", name: "Flag", svg: "&#9873;", category: "shapes" },
  { id: "tag", name: "Tag", svg: "&#128278;", category: "shapes", keywords: ["label"] },

  // Charts
  { id: "bar-chart", name: "Bar Chart", svg: "&#128200;", category: "charts", keywords: ["graph", "stats"] },
  { id: "line-chart", name: "Line Chart", svg: "&#128201;", category: "charts" },
  { id: "pie-chart", name: "Pie Chart", svg: "&#128202;", category: "charts" },
  { id: "trending-up", name: "Trending Up", svg: "&#8593;&#65039;", category: "charts", keywords: ["increase", "growth"] },
  { id: "trending-down", name: Trending Down", svg: "&#8595;&#65039;", category: "charts", keywords: ["decrease", "decline"] },

  // Commerce
  { id: "cart", name: "Cart", svg: "&#128722;", category: "commerce", keywords: ["shopping", "basket"] },
  { id: "credit-card", name: "Credit Card", svg: "&#128179;", category: "commerce", keywords: ["payment"] },
  { id: "dollar", name: "Dollar", svg: "&#36;", category: "commerce", keywords: ["money", "price"] },
  { id: "gift", name: "Gift", svg: "&#127873;", category: "commerce", keywords: ["present"] },

  // Location
  { id: "pin", name: "Pin", svg: "&#128205;", category: "location", keywords: ["marker", "map"] },
  { id: "globe", name: "Globe", svg: "&#127760;", category: "location", keywords: ["world", "earth"] },
  { id: "compass", name: "Compass", svg: "&#128739;", category: "location" },

  // People
  { id: "person", name: "Person", svg: "&#128100;", category: "people", keywords: ["user", "avatar"] },
  { id: "people-group", name: "Group", svg: "&#128101;", category: "people", keywords: ["team"] },
  { id: "user-add", name: "Add User", svg: "&#128100;&#65291;", category: "people", keywords: ["invite"] },
  { id: "user-remove", name: "Remove User", svg: "&#128100;&#65293;", category: "people" },

  // Weather
  { id: "sun", name: "Sun", svg: "&#9728;&#65039;", category: "weather", keywords: ["clear", "sunny"] },
  { id: "cloud", name: "Cloud", svg:">&##9729;&#65039;", category: "weather" },
  { id: "rain", name: "Rain", svg: "&#127783;", category: "weather" },
  { id: "snow", name: "Snow", svg: "&#127782;", category: "weather" },
  { id: "lightning", name: "Lightning", svg: "&#9928;&#65039;", category: "weather", keywords: ["storm", "thunder"] },

  // Time
  { id: "clock", name: "Clock", svg: "&#128336;", category: "time", keywords: ["time", "history"] },
  { id: "calendar", name: "Calendar", svg: "&#128197;", category: "time", keywords: ["date", "schedule"] },
  { id: "hourglass", name: "Hourglass", svg: "&#8987;", category: "time", keywords: ["timer", "loading"] },

  // Code
  { id: "code", name: "Code", svg: "<>&lt;/&gt;</>", category: "code", keywords: ["html", "dev"] },
  { id: "terminal", name: "Terminal", svg: "&#62;_", category: "code", keywords: ["console", "shell"] },
  { id: "braces", name: "Braces", svg: "{ }", category: "code", keywords: ["curly", "object"] },
  { id: "api", name: "API", svg: "&#128274;", category: "code", keywords: ["endpoint", "rest"] },

  // Files
  { id: "file", name: "File", svg: "&#128196;", category: "files", keywords: ["document"] },
  { id: "folder", name: "Folder", svg: "&#128193;", category: "files", keywords: ["directory"] },
  { id: "folder-open", name: "Folder Open", svg: "&#128194;", category: "files" },
  { id: "download", name: "Download", svg: "&#8615;", category: "files" },
  { id: "upload", name: "Upload", svg: "&#8613;", category: "files" },
  { id: "copy", name: "Copy", svg: "&#128203;", category: "files", keywords: ["duplicate", "clone"] },
  { id: "trash", name: "Trash", svg: "&#128465;", category: "files", keywords: ["delete", "remove"] },
  { id: "edit", name: "Edit", svg: "&#9998;", category: "files", keywords: ["modify", "pencil"] },
  { id: "save", name: "Save", svg: "&#128190;", category: "files", keywords: ["disk", "store"] },
  { id: "print", name: "Print", svg: "&#128424;", category: "files" },
  { id: "settings", name: "Settings", svg: "&#9881;", category: "files", keywords: ["gear", "config"] },
  { id: "search-icon", name: "Search", svg: "&#128269;", category: "files", keywords: ["find", "magnifier"] },
  { id: "filter", name: "Filter", svg: "&#128270;", category: "files" },
  { id: "lock", name: "Lock", svg: "&#128274;", category: "files", keywords: ["secure", "password"] },
  { id: "unlock", name: "Unlock", svg: "&#128275;", category: "files" },
  { id: "eye", name: "Eye", svg: "&#128065;", category: "files", keywords: ["view", "visible"] },
  { id: "eye-off", name: "Eye Off", svg: "&#128065;&#65039;", category: "files", keywords: ["hide", "invisible"] },
  { id: "check", name: "Check", svg: "&#10003;", category: "files", keywords: ["done", "tick"] },
  { id: "cross", name: "Cross", svg: "&#10007;", category: "files", keywords: ["close", "cancel", "x"] },
  { id: "plus", name: "Plus", svg: "&#43;", category: "files", keywords: ["add", "new"] },
  { id: "minus", name: "Minus", svg: "&#8722;", category: "files", keywords: ["remove", "subtract"] },
  { id: "info", name: "Info", svg: "&#8505;", category: "files", keywords: ["about", "help"] },
  { id: "warning", name: "Warning", svg: "&#9888;", category: "files", keywords: ["alert", "caution"] },
  { id: "error", name: "Error", svg: "&#10060;", category: "files", keywords: ["danger", "problem"] },
  { id: "success", name: "Success", svg: "&#10004;", category: "files", keywords: ["ok", "valid"] },
  { id: "home", name: "Home", svg: "&#127968;", category: "files", keywords: ["house"] },
  { id: "menu", name: "Menu", svg: "&#9776;", category: "files", keywords: ["hamburger", "nav"] },
  { id: "more-horizontal", name: "More", svg: "&#8226;&#8226;&#8226;", category: "files", keywords: ["dots", "kebab", "ellipsis"] },
  { id: "more-vertical", name: "More Vertical", svg: "&#8942;<br>&#8942;<br>&#8942;", category: "files", keywords: ["dots-vertical"] },
  { id: "refresh", name: "Refresh", svg: "&#8635;", category: "files", keywords: ["reload", "sync"] },
  { id: "power", name: "Power", svg: "&#9881;", category: "files", keywords: ["shutdown", "off"] },
  { id: "wifi", name: "WiFi", svg: "&#128246;", category: "files" },
  { id: "bluetooth", name: "Bluetooth", svg: "&#128243;", category: "files" },
  { id: "battery-full", name: "Battery Full", svg: "&#128267;", category: "files" },
  { id: "battery-low", name: "Battery Low", svg: "&#128268;", category: "files" },
  { id: "zap", name: "Zap", svg: "&#9889;", category: "files", keywords: ["bolt", "flash", "energy"] },
  { id: "thumbs-up", name: "Thumbs Up", svg: "&#128077;", category: "files", keywords: ["like"] },
  { id: "thumbs-down", name: "Thumbs Down", svg: "&#128078;", category: "files", keywords: ["dislike"] },
  { id: "external-link", name: "External Link", svg: "&#128279;", category: "files", keywords: ["new-tab"] },
  { id: "maximize", name: "Maximize", svg: "&#10549;", category: "files", keywords: ["fullscreen", "expand"] },
  { id: "minimize", name: "Minimize", svg: "&#10550;", category: "files" },
  { id: "question-mark", name: "Question", svg: "&#10067;", category: "files", keywords: ["help", "faq"] },
  { id: "exclamation", name: "Exclamation", svg: "&#161;", category: "files", keywords: ["important", "notice"] },
];

// --- Core Factory ---

/**
 * Create an icon picker component.
 *
 * @example
 * ```ts
 * const picker = createIconPicker({
 *   columns: 8,
 *   iconSize: "md",
 *   searchable: true,
 *   onSelect: (icons) => console.log("Selected:", icons),
 * });
 * ```
 */
export function createIconPicker(options: IconPickerOptions): IconPickerInstance {
  const {
    container,
    icons: customIcons = [],
    categories = ["all"],
    columns = 8,
    iconSize = "md",
    showCategories = true,
    searchable = true,
    showRecent = true,
    showFavorites = true,
    maxRecent = 12,
    width = 360,
    height = 400,
    multiple = false,
    maxSelections = 0,
    outputFormat = "svg",
    onSelect,
    className,
  } = options;

  let _icons = [...BUILT_IN_ICONS, ...customIcons];
  let _selected: IconEntry[] = [];
  let _open = false;
  let _activeCategory: IconCategory = "all";
  let _searchQuery = "";
  let _recent: string[] = [];
  let _favorites: Set<string> = new Set();
  let cleanupFns: Array<() => void> = [];

  const iconPx = ICON_SIZE_MAP[iconSize];

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `icon-picker ${className ?? ""}`.trim();
  root.style.cssText =
    `position:relative;display:inline-block;width:${typeof width === "number" ? `${width}px` : width};` +
    "font-family:-apple-system,sans-serif;";

  // Trigger
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "icon-picker-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #d1d5db;" +
    "border-radius:8px;background:#fff;cursor:pointer;width:100%;justify-content:center;" +
    "font-size:13px;color:#374151;transition:border-color 0.15s;";

  const triggerIcon = document.createElement("span");
  triggerIcon.className = "icon-picker-trigger-icon";
  triggerIcon.style.cssText = `font-size:${iconPx}px;line-height:1;display:flex;align-items:center;`;
  triggerIcon.innerHTML = _selected.length > 0 ? _selected[0]!.svg : "&#128196;";
  trigger.appendChild(triggerIcon);

  const triggerLabel = document.createElement("span");
  triggerLabel.textContent = _selected.length > 0 ? _selected[0]!.name : "Pick an icon";
  trigger.appendChild(triggerLabel);

  const chevron = document.createElement("span");
  chevron.innerHTML = "&#9662;";
  chevron.style.cssText = "font-size:10px;color:#9ca3af;transition:transform 0.2s;flex-shrink:0;margin-left:auto;";
  trigger.appendChild(chevron);
  root.appendChild(trigger);

  // Dropdown
  const dropdown = document.createElement("div");
  dropdown.className = "icon-picker-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.setAttribute("aria-multiselectable", String(multiple));
  dropdown.style.cssText =
    "position:absolute;left:0;right:0;top:100%;margin-top:4px;z-index:1050;" +
    "background:#fff;border:1px solid #e5e7eb;border-radius:8px;" +
    "box-shadow:0 4px 16px rgba(0,0,0,0.12);display:none;flex-direction:column;" +
    `height:${typeof height === "number" ? `${height}px` : height};`;

  // Category bar
  let catBar: HTMLElement | null = null;
  if (showCategories) {
    catBar = document.createElement("div");
    catBar.style.cssText =
      "display:flex;gap:2px;padding:6px 8px;border-bottom:1px solid #f3f4f6;flex-shrink:0;overflow-x:auto;";
    for (const cat of categories) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.textContent = cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1);
      tab.dataset.cat = cat;
      tab.style.cssText =
        "padding:4px 10px;border:none;background:none;cursor:pointer;border-radius:4px;" +
        "font-size:11px;font-weight:500;color:#6b7280;white-space:nowrap;" +
        "transition:all 0.15s;" +
        (cat === _activeCategory ? "background:#eff6ff;color:#2563eb;" : "");
      tab.addEventListener("click", () => {
        _activeCategory = cat as IconCategory;
        _updateCatTabs();
        _renderGrid();
      });
      catBar.appendChild(tab);
    }
    dropdown.appendChild(catBar);
  }

  // Search
  let searchInput: HTMLInputElement | null = null;
  if (searchable) {
    const sw = document.createElement("div");
    sw.style.cssText = "padding:6px 8px;border-bottom:1px solid #f3f4f6;";
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search icons...";
    searchInput.style.cssText = "width:100%;padding:5px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;outline:none;box-sizing:border-box;";
    searchInput.addEventListener("input", (e) => {
      _searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
      _renderGrid();
    });
    sw.appendChild(searchInput);
    dropdown.appendChild(sw);
  }

  // Grid
  const grid = document.createElement("div");
  grid.className = "icon-picker-grid";
  grid.style.cssText =
    `display:grid;grid-template-columns:repeat(${columns}, 1fr);gap:2px;padding:8px;` +
    "overflow-y:auto;flex:1;align-content:start;";
  dropdown.appendChild(grid);

  root.appendChild(dropdown);
  (container ?? document.body).appendChild(root);

  // --- Filtering ---

  function _getFiltered(): IconEntry[] {
    let result = _icons;

    if (_activeCategory !== "all") {
      result = result.filter((i) => i.category === _activeCategory);
    }

    if (_searchQuery) {
      result = result.filter((i) =>
        i.name.toLowerCase().includes(_searchQuery) ||
        i.id.toLowerCase().includes(_searchQuery) ||
        i.keywords?.some((k) => k.toLowerCase().includes(_searchQuery)),
      );
    }

    // Sort: favs first, then recent, then alpha
    result.sort((a, b) => {
      if (_favorites.has(a.id) !== _favorites.has(b.id)) return _favorites.has(a.id) ? -1 : 1;
      if (_recent.includes(a.id) !== _recent.includes(b.id)) return _recent.includes(a.id) ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }

  function _updateCatTabs(): void {
    if (!catBar) return;
    catBar.querySelectorAll("button").forEach((tab) => {
      const active = tab.dataset.cat === _activeCategory;
      tab.style.background = active ? "#eff6ff" : "none";
      tab.style.color = active ? "#2563eb" : "#6b7280";
    });
  }

  // --- Render ---

  function _renderGrid(): void {
    grid.innerHTML = "";
    const items = _getFiltered();

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "grid-column:1/-1;padding:24px;text-align:center;color:#9ca3af;font-size:13px;";
      empty.textContent = "No icons found";
      grid.appendChild(empty);
      return;
    }

    for (const icon of items) {
      const sel = _selected.some((s) => s.id === icon.id);
      const fav = _favorites.has(icon.id);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `icon-picker-cell${sel ? " selected" : ""}`;
      cell.dataset.iconId = icon.id;
      cell.setAttribute("role", "option");
      cell.setAttribute("aria-selected", String(sel));
      cell.setAttribute("aria-label", icon.name);
      cell.title = icon.name;
      cell.style.cssText =
        `display:flex;align-items:center;justify-content:center;height:${iconPx + 16}px;` +
        "border:none;background:none;cursor:pointer;border-radius:6px;" +
        "transition:background 0.1s;font-size:0;position:relative;" +
        (sel ? "background:#dbeafe;" : "");

      // Icon content
      const iconContent = document.createElement("span");
      iconContent.innerHTML = icon.svg;
      iconContent.style.cssText =
        `font-size:${iconPx}px;line-height:1;color:#374151;` +
        (sel ? "color:#2563eb;" : "");
      cell.appendChild(iconContent);

      // Favorite badge
      if (showFavorites && fav) {
        const badge = document.createElement("span");
        badge.innerHTML = "&#9733;";
        badge.style.cssText =
          "position:absolute;top:1px;right:1px;font-size:8px;color:#f59e0b;";
        cell.appendChild(badge);
      }

      // Selection indicator
      if (sel) {
        const indicator = document.createElement("span");
        indicator.innerHTML = "&#10003;";
        indicator.style.cssText =
          "position:absolute;top:0;right:0;width:14px;height:14px;background:#3b82f6;" +
          "color:#fff;border-radius:0 6px 0 6px;font-size:9px;display:flex;" +
          "align-items:center;justify-content:center;";
        cell.appendChild(indicator);
      }

      // Hover
      cell.addEventListener("mouseenter", () => { if (!sel) cell.style.background = "#f3f4f6"; });
      cell.addEventListener("mouseleave", () => { if (!sel) cell.style.background = ""; });

      // Click
      cell.addEventListener("click", () => _handleSelect(icon));

      grid.appendChild(cell);
    }
  }

  function _handleSelect(icon: IconEntry): void {
    if (multiple) {
      const idx = _selected.findIndex((s) => s.id === icon.id);
      if (idx >= 0) {
        _selected.splice(idx, 1);
      } else {
        if (maxSelections > 0 && _selected.length >= maxSelections) return;
        _selected.push(icon);
      }
    } else {
      _selected = [icon];
      close();
    }

    _addToRecent(icon.id);
    _updateTrigger();
    onSelect?.([..._selected]);
    _renderGrid();
  }

  function _updateTrigger(): void {
    if (_selected.length > 0) {
      triggerIcon.innerHTML = _selected[0]!.svg;
      triggerLabel.textContent = _selected.length > 1
        ? `${_selected.length} icons selected`
        : _selected[0]!.name;
    } else {
      triggerIcon.innerHTML = "&#128196;";
      triggerLabel.textContent = "Pick an icon";
    }
  }

  function _addToRecent(id: string): void {
    _recent = _recent.filter((r) => r !== id);
    _recent.unshift(id);
    if (_recent.length > maxRecent) _recent = _recent.slice(0, maxRecent);
  }

  // --- Open/Close ---

  function open(): void {
    if (_open) return;
    _open = true;
    dropdown.style.display = "flex";
    chevron.style.transform = "rotate(180deg)";
    trigger.setAttribute("aria-expanded", "true");
    trigger.style.borderColor = "#3b82f6";
    _renderGrid();
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
    if (searchable) { searchInput.value = ""; _searchQuery = ""; }
    _removeListeners();
  }

  function _setupOutsideClick(): void {
    const fn = (e: MouseEvent) => { if (!root.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", fn);
    cleanupFns.push(() => document.removeEventListener("mousedown", fn));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // --- Public API ---

  function getSelected(): IconEntry[] { return [..._selected]; }

  function select(id: string): void {
    const icon = _icons.find((i) => i.id === id);
    if (!icon) return;
    if (multiple) {
      if (!_selected.find((s) => s.id === id)) {
        if (maxSelections > 0 && _selected.length >= maxSelections) return;
        _selected.push(icon);
      }
    } else {
      _selected = [icon];
    }
    _updateTrigger();
    _renderGrid();
  }

  function deselect(id: string): void {
    _selected = _selected.filter((s) => s.id !== id);
    _updateTrigger();
    _renderGrid();
  }

  function clearSelection(): void {
    _selected = [];
    _updateTrigger();
    _renderGrid();
  }

  function addIcon(icon: IconEntry): void {
    if (!_icons.find((i) => i.id === icon.id)) {
      _icons.push({ ...icon, custom: true });
      if (_open) _renderGrid();
    }
  }

  function removeIcon(id: string): void {
    _icons = _icons.filter((i) => i.id !== id || !i.custom);
    if (_open) _renderGrid();
  }

  function getRecent(): string[] { return [..._recent]; }

  function toggleFavorite(id: string): void {
    if (_favorites.has(id)) _favorites.delete(id);
    else _favorites.add(id);
    if (_open) _renderGrid();
  }

  function isOpen(): boolean { return _open; }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // Events
  trigger.addEventListener("click", () => toggle());
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      if (!_open) open();
    }
    if (e.key === "Escape" && _open) { e.preventDefault(); close(); }
  });

  _renderGrid();

  return {
    el: root,
    getSelected,
    select,
    deselect,
    clearSelection,
    addIcon,
    removeIcon,
    getRecent,
    toggleFavorite,
    open,
    close,
    isOpen,
    destroy,
  };
}
