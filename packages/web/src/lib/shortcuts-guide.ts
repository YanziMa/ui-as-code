/**
 * Shortcuts Guide: Interactive keyboard shortcut overlay, discovery, search,
 * command palette integration, category grouping, and visual hint system.
 */

// --- Types ---

export interface ShortcutItem {
  id: string;
  keys: string[];
  label: string;
  description?: string;
  category?: string;
  icon?: string;
  /** Whether the shortcut is currently available */
  available?: boolean | (() => boolean);
  /** Action to execute when triggered */
  action?: () => void;
  /** Priority for sorting */
  priority?: number;
}

export interface ShortcutCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface ShortcutsGuideOptions {
  /** Container element to render into */
  container?: HTMLElement;
  /** Custom categories */
  categories?: ShortcutCategory[];
  /** Initial shortcuts */
  shortcuts?: ShortcutItem[];
  /** Trigger key combination (default: ? or Ctrl+/) */
  triggerKeys?: string[];
  /** Show on first visit */
  showOnFirstVisit?: boolean;
  /** Storage key for "dismissed" state */
  storageKey?: string;
  /** Theme (default: auto) */
  theme?: "light" | "dark" | "auto";
  /** Position of the guide overlay */
  position?: "center" | "bottom-left" | "bottom-right" | "top-right";
  /** Max width in px */
  maxWidth?: number;
  /** Called when a shortcut is executed */
  onExecute?: (shortcut: ShortcutItem) => void;
  /** Called when guide opens/closes */
  onToggle?: (open: boolean) => void;
  /** Custom renderer for shortcut items */
  renderItem?: (item: ShortcutItem, el: HTMLElement) => void;
  /** Highlight animation duration (ms) */
  highlightDuration?: number;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Show category filter tabs */
  showCategories?: boolean;
  /** Show recently used section */
  showRecent?: boolean;
  /** Max recent items to remember */
  maxRecent?: number;
}

export interface ShortcutsGuideInstance {
  element: HTMLElement;
  isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  addShortcut(item: ShortcutItem): void;
  removeShortcut(id: string): void;
  updateShortcut(id: string, updates: Partial<ShortcutItem>): void;
  getShortcuts(): ShortcutItem[];
  search(query: string): ShortcutItem[];
  highlight(keys: string[]): void;
  destroy(): void;
}

// --- Default Categories ---

const DEFAULT_CATEGORIES: ShortcutCategory[] = [
  { id: "general", name: "General", icon: "⌘", color: "#6366f1" },
  { id: "navigation", name: "Navigation", icon: "↗", color: "#8b5cf6" },
  { id: "editing", name: "Editing", icon: "✎", color: "#ec4899" },
  { id: "view", name: "View", icon: "◉", color: "#14b8a6" },
  { id: "actions", name: "Actions", icon: "▶", color: "#f59e0b" },
];

// --- Key Formatting ---

function formatKey(key: string): string {
  const map: Record<string, string> = {
    " ": "Space",
    "ArrowUp": "↑",
    "ArrowDown": "↓",
    "ArrowLeft": "←",
    "ArrowRight": "→",
    "Enter": "↵",
    "Escape": "Esc",
    "Backspace": "⌫",
    "Tab": "⇥",
    "Delete": "⌦",
    "Meta": "⌘",
    "Control": "Ctrl",
    "Shift": "⇧",
    "Alt": "⌥",
  };
  return map[key] ?? key.length === 1 ? key.toUpperCase() : key;
}

function formatKeys(keys: string[]): string {
  return keys.map(formatKey).join(" + ");
}

function keysMatch(event: KeyboardEvent, keys: string[]): boolean {
  if (keys.length === 0) return false;

  const hasCtrl = keys.includes("Control") || keys.includes("Meta");
  const hasShift = keys.includes("Shift");
  const hasAlt = keys.includes("Alt");
  const mainKey = keys.find((k) =>
    !["Control", "Meta", "Shift", "Alt"].includes(k),
  );

  if (hasCtrl && !event.ctrlKey && !event.metaKey) return false;
  if (!hasCtrl && (event.ctrlKey || event.metaKey)) return false;
  if (hasShift && !event.shiftKey) return false;
  if (!hasShift && event.shiftKey && mainKey && mainKey !== mainKey.toUpperCase()) return false;
  if (hasAlt && !event.altKey) return false;
  if (!hasAlt && event.altKey) return false;

  if (mainKey) {
    return event.key === mainKey || event.key.toLowerCase() === mainKey.toLowerCase();
  }

  return true;
}

// --- Main Class ---

export function createShortcutsGuide(options: ShortcutsGuideOptions = {}): ShortcutsGuideInstance {
  const opts: Required<Omit<ShortcutsGuideOptions, "container" | "categories" | "shortcuts" | "triggerKeys">> & {
    container: HTMLElement;
    categories: ShortcutCategory[];
    shortcuts: ShortcutItem[];
    triggerKeys: string[];
  } = {
    container: options.container ?? document.body,
    categories: options.categories ?? [...DEFAULT_CATEGORIES],
    shortcuts: options.shortcuts ?? [],
    triggerKeys: options.triggerKeys ?? ["?"],
    showOnFirstVisit: options.showOnFirstVisit ?? true,
    storageKey: options.storageKey ?? "shortcuts-guide-dismissed",
    theme: options.theme ?? "auto",
    position: options.position ?? "center",
    maxWidth: options.maxWidth ?? 560,
    onExecute: options.onExecute ?? (() => {}),
    onToggle: options.onToggle ?? (() => {}),
    renderItem: options.renderItem ?? null,
    highlightDuration: options.highlightDuration ?? 1500,
    searchPlaceholder: options.searchPlaceholder ?? "Search shortcuts...",
    showCategories: options.showCategories ?? true,
    showRecent: options.showRecent ?? true,
    maxRecent: options.maxRecent ?? 5,
  };

  let isOpen = false;
  let activeCategory: string | null = null;
  let searchQuery = "";
  let recentIds: string[] = [];
  const shortcutsMap = new Map<string, ShortcutItem>();
  const listeners: Array<() => void> = [];

  // Load recent from storage
  try {
    const stored = localStorage.getItem(`${opts.storageKey}-recent`);
    if (stored) recentIds = JSON.parse(stored);
  } catch { /* ignore */ }

  // Register initial shortcuts
  for (const s of opts.shortcuts) {
    shortcutsMap.set(s.id, s);
  }

  // --- DOM Creation ---

  const overlay = document.createElement("div");
  overlay.className = "sg-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Keyboard Shortcuts Guide");
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    display: none; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    opacity: 0; transition: opacity 200ms ease;
  `;

  const panel = document.createElement("div");
  panel.className = "sg-panel";
  panel.style.cssText = `
    background: var(--sg-bg, #fff); color: var(--sg-text, #1a1a2e);
    border-radius: 12px; width: ${opts.maxWidth}px; max-width: 90vw;
    max-height: 80vh; display: flex; flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
    overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  // Header
  const header = document.createElement("div");
  header.className = "sg-header";
  header.style.cssText = `padding: 16px 20px; border-bottom: 1px solid var(--sg-border, #e5e7eb);`;
  header.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
      <h2 style="margin:0; font-size:16px; font-weight:600;">Keyboard Shortcuts</h2>
      <button class="sg-close" aria-label="Close" style="
        background:none; border:none; cursor:pointer; font-size:20px;
        color:var(--sg-muted,#9ca3af); padding:4px 8px; border-radius:6px;
      ">✕</button>
    </div>
  `;

  // Search
  const searchInput = document.createElement("input");
  searchInput.className = "sg-search";
  searchInput.type = "search";
  searchInput.placeholder = opts.searchPlaceholder;
  searchInput.style.cssText = `
    width:100%; padding:8px 12px; border:1px solid var(--sg-border,#e5e7eb);
    border-radius:8px; font-size:14px; outline:none; box-sizing:border-box;
    transition:border-color 150ms;
  `;
  header.appendChild(searchInput);

  // Category tabs
  const categoryBar = document.createElement("div");
  categoryBar.className = "sg-categories";
  categoryBar.style.cssText = `
    display:flex; gap:6px; padding:12px 20px 0; flex-wrap:wrap;
    ${!opts.showCategories ? "display:none;" : ""}
  `;

  const allCatBtn = createCategoryBtn("All", null, true);
  categoryBar.appendChild(allCatBtn);

  for (const cat of opts.categories) {
    categoryBar.appendChild(createCategoryBtn(cat.name, cat.id, false));
  }

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "sg-content";
  contentArea.style.cssText = `
    overflow-y:auto; flex:1; padding:8px 0;
  `;

  // Recent section
  const recentSection = document.createElement("div");
  recentSection.className="sg-recent-section";
  recentSection.style.display = "none";

  // Results list
  const resultsList = document.createElement("div");
  resultsList.className = "sg-results";
  resultsList.style.cssText = `padding:0 20px 16px;`;

  contentArea.appendChild(recentSection);
  contentArea.appendChild(resultsList);

  // Footer hint
  const footer = document.createElement("div");
  footer.className = "sg-footer";
  footer.style.cssText = `
    padding:10px 20px; border-top:1px solid var(--sg-border,#e5e7eb);
    text-align:center; font-size:12px; color:var(--sg-muted,#9ca3af);
  `;
  footer.textContent = `Press ${formatKeys(opts.triggerKeys)} to toggle`;

  panel.appendChild(header);
  panel.appendChild(categoryBar);
  panel.appendChild(contentArea);
  panel.appendChild(footer);
  overlay.appendChild(panel);
  opts.container.appendChild(overlay);

  // --- Helpers ---

  function createCategoryBtn(name: string, catId: string | null, isActive: boolean): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "sg-cat-btn";
    btn.textContent = name;
    btn.dataset.categoryId = catId ?? "";
    btn.style.cssText = `
      padding:4px 12px; border-radius:6px; border:1px solid transparent;
      background:${isActive ? "var(--sg-accent,#6366f1)" : "transparent"};
      color:${isActive ? "#fff" : "var(--sg-muted,#6b7280)"};
      font-size:13px; cursor:pointer; transition:all 150ms;
    `;
    btn.addEventListener("click", () => {
      activeCategory = catId;
      updateCategoryUI();
      renderResults();
    });
    return btn;
  }

  function updateCategoryUI(): void {
    const buttons = categoryBar.querySelectorAll<HTMLButtonElement>(".sg-cat-btn");
    for (const btn of buttons) {
      const isActive = (btn.dataset.categoryId || null) === activeCategory;
      btn.style.background = isActive ? "var(--sg-accent,#6366f1)" : "transparent";
      btn.style.color = isActive ? "#fff" : "var(--sg-muted,#6b7280)";
      btn.style.borderColor = isActive ? "var(--sg-accent,#6366f1)" : "transparent";
    }
  }

  function getFiltered(): ShortcutItem[] {
    let items = Array.from(shortcutsMap.values());

    // Filter by availability
    items = items.filter((item) => {
      if (item.available === undefined) return true;
      return typeof item.available === "function" ? item.available() : item.available;
    });

    // Filter by category
    if (activeCategory) {
      items = items.filter((item) => item.category === activeCategory);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.label.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false) ||
        item.keys.some((k) => k.toLowerCase().includes(q)),
      );
    }

    // Sort: priority desc, then label asc
    items.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label));

    return items;
  }

  function getRecentItems(): ShortcutItem[] {
    return recentIds
      .map((id) => shortcutsMap.get(id))
      .filter((x): x is ShortcutItem => x !== undefined)
      .slice(0, opts.maxRecent);
  }

  function renderResults(): void {
    resultsList.innerHTML = "";

    const filtered = getFiltered();

    if (filtered.length === 0) {
      resultsList.innerHTML = `
        <div style="text-align:center; padding:32px 0; color:var(--sg-muted,#9ca3af); font-size:14px;">
          No shortcuts found
        </div>
      `;
      return;
    }

    // Group by category
    const grouped = new Map<string, ShortcutItem[]>();
    for (const item of filtered) {
      const cat = item.category ?? "general";
      let group = grouped.get(cat);
      if (!group) { group = []; grouped.set(cat, group); }
      group.push(item);
    }

    for (const [catId, items] of grouped) {
      const cat = opts.categories.find((c) => c.id === catId);
      if (grouped.size > 1) {
        const catHeader = document.createElement("div");
        catHeader.style.cssText = `
          padding:12px 0 8px; font-size:11px; font-weight:600;
          text-transform:uppercase; letter-spacing:0.05em;
          color:var(--sg-muted,#9ca3af);
        `;
        catHeader.textContent = cat?.name ?? catId;
        resultsList.appendChild(catHeader);
      }

      for (const item of items) {
        const row = document.createElement("div");
        row.className = "sg-item";
        row.tabIndex = 0;
        row.style.cssText = `
          display:flex; align-items:center; justify-content:space-between;
          padding:8px 10px; border-radius:8px; cursor:pointer;
          transition:background 120ms;
        `;

        if (opts.renderItem) {
          opts.renderItem(item, row);
        } else {
          row.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; min-width:0;">
              ${item.icon ? `<span style="font-size:16px;">${item.icon}</span>` : ""}
              <div>
                <div style="font-size:13px; font-weight:500;">${escapeHtml(item.label)}</div>
                ${item.description ? `<div style="font-size:11px; color:var(--sg-muted,#9ca3af);">${escapeHtml(item.description)}</div>` : ""}
              </div>
            </div>
            <div class="sg-keys" style="display:flex; gap:3px; flex-shrink:0;">
              ${item.keys.map((k) => `<kbd style="
                display:inline-block; padding:2px 6px; font-size:11px;
                font-family:inherit; border:1px solid var(--sg-border,#d1d5db);
                border-radius:4px; background:var(--sg-surface,#f3f4f6);
                box-shadow:0 1px 0 var(--sg-border,#d1d5db);
              ">${escapeHtml(formatKey(k))}</kbd>`).join("")}
            </div>
          `;
        }

        // Hover effect
        row.addEventListener("mouseenter", () => {
          row.style.background = "var(--sg-hover,#f3f4f6)";
        });
        row.addEventListener("mouseleave", () => {
          row.style.background = "";
        });

        // Click to execute
        row.addEventListener("click", () => executeShortcut(item));
        row.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            executeShortcut(item);
          }
        });

        resultsList.appendChild(row);
      }
    }
  }

  function renderRecent(): void {
    recentSection.innerHTML = "";
    const recent = getRecentItems();
    if (recent.length === 0 || !opts.showRecent || searchQuery) {
      recentSection.style.display = "none";
      return;
    }

    recentSection.style.display = "block";
    recentSection.style.cssText = `padding:12px 20px 4px;`;

    const title = document.createElement("div");
    title.style.cssText = `font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--sg-muted,#9ca3af); margin-bottom:6px;`;
    title.textContent = "Recently Used";
    recentSection.appendChild(title);

    for (const item of recent) {
      const chip = document.createElement("span");
      chip.style.cssText = `
        display:inline-flex; align-items:center; gap:4px; padding:3px 8px;
        border-radius:4px; background:var(--sg-surface,#f9fafb);
        border:1px solid var(--sg-border,#e5e7eb); font-size:12px; margin:2px 4px 2px 0;
        cursor:pointer; transition:background 120ms;
      `;
      chip.innerHTML = `${item.icon ?? ""} ${escapeHtml(item.label)}`;
      chip.addEventListener("click", () => executeShortcut(item));
      recentSection.appendChild(chip);
    }
  }

  function recordRecent(id: string): void {
    recentIds = recentIds.filter((rid) => rid !== id);
    recentIds.unshift(id);
    if (recentIds.length > opts.maxRecent) recentIds = recentIds.slice(0, opts.maxRecent);
    try {
      localStorage.setItem(`${opts.storageKey}-recent`, JSON.stringify(recentIds));
    } catch { /* ignore */ }
  }

  function executeShortcut(item: ShortcutItem): void {
    recordRecent(item.id);
    opts.onExecute(item);
    if (item.action) item.action();
    close();
  }

  function applyTheme(): void {
    const theme = opts.theme === "auto"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : opts.theme;

    if (theme === "dark") {
      panel.style.setProperty("--sg-bg", "#1e1e2e");
      panel.style.setProperty("--sg-text", "#cdd6f4");
      panel.style.setProperty("--sg-border", "#45475a");
      panel.style.setProperty("--sg-muted", "#6c7086");
      panel.style.setProperty("--sg-accent", "#89b4fa");
      panel.style.setProperty("--sg-surface", "#313244");
      panel.style.setProperty("--sg-hover", "#313244");
    } else {
      panel.style.removeProperty("--sg-bg");
      panel.style.removeProperty("--sg-text");
      panel.style.removeProperty("--sg-border");
      panel.style.removeProperty("--sg-muted");
      panel.style.removeProperty("--sg-accent");
      panel.style.removeProperty("--sg-surface");
      panel.style.removeProperty("--sg-hover");
    }
  }

  // --- Event Bindings ---

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderResults();
    renderRecent();
  });

  header.querySelector(".sg-close")!.addEventListener("click", close);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // Global keyboard listener for trigger + shortcut execution
  const globalKeyHandler = (e: KeyboardEvent): void => {
    // Check if this is the trigger key combo
    if (keysMatch(e, opts.triggerKeys)) {
      e.preventDefault();
      toggle();
      return;
    }

    // Execute matching shortcuts when guide is closed
    if (!isOpen) {
      for (const item of shortcutsMap.values()) {
        if (item.action && keysMatch(e, item.keys)) {
          e.preventDefault();
          executeShortcut(item);
          break;
        }
      }
    }

    // When guide is open, use arrow keys to navigate
    if (isOpen && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateItems(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateItems(-1);
      } else if (e.key === "Enter") {
        const focused = document.activeElement;
        if (focused?.classList.contains("sg-item")) {
          (focused as HTMLElement).click();
        }
      }
    }
  };

  document.addEventListener("keydown", globalKeyHandler);

  // Theme change listener
  if (opts.theme === "auto") {
    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", applyTheme);
  }

  // --- Navigation ---

  function navigateItems(dir: number): void {
    const items = Array.from(resultsList.querySelectorAll<HTMLElement>(".sg-item"));
    if (items.length === 0) return;

    const currentIdx = items.indexOf(document.activeElement as HTMLElement);
    let nextIdx = currentIdx + dir;

    if (nextIdx < 0) nextIdx = items.length - 1;
    if (nextIdx >= items.length) nextIdx = 0;

    items[nextIdx]?.focus();
  }

  // --- Public API ---

  function open(): void {
    if (isOpen) return;
    applyTheme();
    overlay.style.display = "flex";
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      searchInput.focus();
    });
    isOpen = true;
    renderRecent();
    renderResults();
    opts.onToggle(true);
  }

  function close(): void {
    if (!isOpen) return;
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.style.display = "none";
      searchQuery = "";
      searchInput.value = "";
      activeCategory = null;
      updateCategoryUI();
    }, 200);
    isOpen = false;
    opts.onToggle(false);
  }

  function toggle(): void {
    isOpen ? close() : open();
  }

  function addShortcut(item: ShortcutItem): void {
    shortcutsMap.set(item.id, item);
    if (isOpen) renderResults();
  }

  function removeShortcut(id: string): void {
    shortcutsMap.delete(id);
    if (isOpen) renderResults();
  }

  function updateShortcut(id: string, updates: Partial<ShortcutItem>): void {
    const existing = shortcutsMap.get(id);
    if (existing) {
      Object.assign(existing, updates);
      if (isOpen) renderResults();
    }
  }

  function getShortcuts(): ShortcutItem[] {
    return Array.from(shortcutsMap.values());
  }

  function search(query: string): ShortcutItem[] {
    const prevQuery = searchQuery;
    searchQuery = query;
    const results = getFiltered();
    searchQuery = prevQuery;
    return results;
  }

  function highlight(keys: string[]): void {
    // Find matching shortcut and flash it
    for (const item of shortcutsMap.values()) {
      if (
        item.keys.length === keys.length &&
        item.keys.every((k, i) => k === keys[i])
      ) {
        // Open guide and scroll to item
        if (!isOpen) open();

        // Find and highlight the item row
        setTimeout(() => {
          const rows = resultsList.querySelectorAll<HTMLElement>(".sg-item");
          for (const row of rows) {
            if (row.textContent?.includes(item.label)) {
              row.scrollIntoView({ block: "nearest" });
              row.style.transition = `background ${opts.highlightDuration}ms ease`;
              row.style.background = "var(--sg-accent, #6366f1)";
              row.style.color = "#fff";
              setTimeout(() => {
                row.style.background = "";
                row.style.color = "";
              }, opts.highlightDuration);
              break;
            }
          }
        }, 100);
        break;
      }
    }
  }

  function destroy(): void {
    document.removeEventListener("keydown", globalKeyHandler);
    overlay.remove();
    shortcutsMap.clear();
  }

  // Check first-visit
  if (opts.showOnFirstVisit) {
    try {
      if (!localStorage.getItem(opts.storageKey)) {
        setTimeout(() => open(), 500);
        localStorage.setItem(opts.storageKey, "1");
      }
    } catch { /* ignore */ }
  }

  return {
    element: overlay,
    get isOpen() { return isOpen; },
    open,
    close,
    toggle,
    addShortcut,
    removeShortcut,
    updateShortcut,
    getShortcuts,
    search,
    highlight,
    destroy,
  };
}

// --- Convenience: Hint Badge ---

/**
 * Create a floating hint badge that shows the shortcut key near an element.
 * Automatically positions itself and hides after interaction.
 */
export function createShortcutHint(
  targetEl: HTMLElement,
  keys: string[],
  options: { position?: "top" | "bottom" | "left" | "right"; offset?: number; permanent?: boolean } = {},
): () => void {
  const pos = options.position ?? "top";
  const offset = options.offset ?? 8;
  const badge = document.createElement("div");
  badge.className = "sg-hint-badge";
  badge.style.cssText = `
    position:absolute; z-index:9999; pointer-events:none;
    padding:2px 7px; border-radius:4px; font-size:11px; font-weight:600;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:#1e1e2e; color:#cdd6f4; border:1px solid #45475a;
    box-shadow:0 2px 8px rgba(0,0,0,0.2);
    white-space:nowrap; opacity:0; transform:translateY(-4px);
    transition:opacity 200ms, transform 200ms;
  `;
  badge.textContent = formatKeys(keys);

  // Position
  const posStyles: Record<string, string> = {
    top: `bottom:100%; left:50%; transform:translateX(-50%) translateY(-${offset}px);`,
    bottom: `top:100%; left:50%; transform:translateX(-50%) translateY(${offset}px);`,
    left: `right:100%; top:50%; transform:translateY(-50%) translateX(-${offset}px);`,
    right: `left:100%; top:50%; transform:translateY(-50%) translateX(${offset}px);`,
  };
  Object.assign(badge.style, parseInlineStyle(posStyles[pos]));

  targetEl.style.position = targetEl.style.position || "relative";
  targetEl.appendChild(badge);

  // Show on hover/focus
  const show = () => {
    badge.style.opacity = "1";
    badge.style.transform = pos === "top" || pos === "bottom"
      ? "translateX(-50%) translateY(0)"
      : pos === "left"
        ? "translateY(-50%) translateX(0)"
        : "translateY(-50%) translateX(0)";
  };
  const hide = () => {
    badge.style.opacity = "0";
    badge.style.transform = posStyles[pos].split(";").find((s) => s.includes("transform")) ?? "";
  };

  targetEl.addEventListener("mouseenter", show);
  targetEl.addEventListener("focus", show);
  targetEl.addEventListener("mouseleave", hide);
  targetEl.addEventListener("blur", hide);

  if (options.permanent) show();

  return () => {
    targetEl.removeEventListener("mouseenter", show);
    targetEl.removeEventListener("focus", show);
    targetEl.removeEventListener("mouseleave", hide);
    targetEl.removeEventListener("blur", hide);
    badge.remove();
  };
}

// --- Internal ---

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseInlineStyle(str: string): Partial<CSSStyleDeclaration> {
  const result: Record<string, string> = {};
  for (const part of str.split(";")) {
    const [key, val] = part.split(":").map((s) => s.trim());
    if (key && val) result[key] = val;
  }
  return result;
}
