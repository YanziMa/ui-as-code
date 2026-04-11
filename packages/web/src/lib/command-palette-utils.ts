/**
 * Command Palette Utilities: VS Code-style command palette with fuzzy search,
 * keyboard navigation, recent commands, category filtering, and action dispatch.
 */

// --- Types ---

export interface PaletteItem {
  /** Unique id */
  id: string;
  /** Display title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Category/group label */
  category?: string;
  /** Icon (HTML string or element) */
  icon?: string | HTMLElement;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Keywords for fuzzy search (in addition to title) */
  keywords?: string[];
  /** Action to execute when selected */
  action: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface CommandPaletteOptions {
  /** Available items/commands */
  items: PaletteItem[];
  /** Trigger hotkey (default "Mod+P" or "Mod+K") */
  triggerHotkey?: string;
  /** Placeholder text in search input */
  placeholder?: string;
  /** Max visible items before scrolling */
  maxVisibleItems?: number;
  /** Show recently used commands at top */
  showRecent?: boolean;
  /** Max recent items to remember */
  maxRecent?: number;
  /** Custom class name */
  className?: string;
  /** Called when palette opens */
  onOpen?: () => void;
  /** Called when palette closes (without selection) */
  onClose?: () => void;
  /** Called when an item is executed */
  onExecute?: (item: PaletteItem) => void;
  /** Filter function (override default fuzzy search) */
  customFilter?: (query: string, item: PaletteItem) => boolean;
}

export interface CommandPaletteInstance {
  /** Root element */
  el: HTMLElement;
  /** Open the palette */
  open: () => void;
  /** Close the palette */
  close: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Update items dynamically */
  setItems: (items: PaletteItem[]) => void;
  /** Focus the search input */
  focus: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Fuzzy Search ---

/** Simple fuzzy match scoring */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (!q) return 1; // No query matches everything
  if (t.includes(q)) return 2 + t.length - q.length; // Exact substring match bonus

  let score = 0;
  let qi = 0;
  let ti = 0;

  while (qi < q.length && ti < t.length) {
    if (q[qi] === t[ti]) {
      score += 1;
      // Consecutive match bonus
      if (qi > 0 && q[qi - 1] === t[ti - 1]) score += 2;
      // Start of word bonus
      if (ti === 0 || /[\s\-_]/.test(t[ti - 1])) score += 3;
      qi++;
    }
    ti++;
  }

  // Penalty for unmatched query chars
  score -= (q.length - qi) * 5;

  return score;
}

// --- Core Factory ---

/**
 * Create a VS Code-style command palette.
 *
 * @example
 * ```ts
 * const palette = createCommandPalette({
 *   items: [
 *     { id: "save", title: "Save File", shortcut: "Mod+S", action: () => save() },
 *     { id: "settings", title: "Open Settings", category: "Preferences", action: () => {} },
 *   ],
 * });
 * ```
 */
export function createCommandPalette(options: CommandPaletteOptions): CommandPaletteInstance {
  const {
    items,
    triggerHotkey = "Mod+P",
    placeholder = "Type a command or search...",
    maxVisibleItems = 8,
    showRecent = true,
    maxRecent = 5,
    className,
    onOpen,
    onClose,
    onExecute,
    customFilter,
  } = options;

  let _items = [...items];
  let _open = false;
  let _query = "";
  let _focusedIndex = 0;
  let _recentIds: string[] = [];
  const cleanupFns: Array<() => void> = [];

  // Load recent from localStorage
  try {
    const saved = localStorage.getItem("cmd-palette-recent");
    if (saved) _recentIds = JSON.parse(saved);
  } catch {}

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `command-palette-overlay ${className ?? ""}`.trim();
  root.style.cssText =
    "position:fixed;inset:0;z-index:99999;display:none;" +
    "background:rgba(0,0,0,0.4);backdrop-filter:blur(2px);" +
    "justify-content:center;padding-top:15vh;align-items:flex-start;";

  const dialog = document.createElement("div");
  dialog.className = "command-palette";
  dialog.style.cssText =
    "width:560px;max-width:90vw;background:#fff;border-radius:12px;" +
    "box-shadow:0 16px 64px rgba(0,0,0,0.25);overflow:hidden;" +
    "display:flex;flex-direction:column;font-family:-apple-system,sans-serif;font-size:14px;";

  // Search input area
  const searchWrap = document.createElement("div");
  searchWrap.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid #e5e7eb;";

  const searchIcon = document.createElement("span");
  searchIcon.innerHTML = "&#128269;";
  searchIcon.style.color = "#9ca3af";
  searchWrap.appendChild(searchIcon);

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.setAttribute("autocomplete", "off");
  input.spellcheck = false;
  input.style.cssText =
    "flex:1;border:none;outline:none;font-size:15px;color:#111827;background:none;" +
    "::placeholder{color:#9ca3af;}";
  searchWrap.appendChild(input);

  dialog.appendChild(searchWrap);

  // Results list
  const resultsList = document.createElement("div");
  resultsList.className = "palette-results";
  resultsList.style.cssText =
    "max-height:300px;overflow-y:auto;overscroll-behavior:contain;";
  dialog.appendChild(resultsList);

  root.appendChild(dialog);
  document.body.appendChild(root);

  // --- Render Results ---

  function renderResults(): void {
    resultsList.innerHTML = "";

    let filtered: Array<{ item: PaletteItem; score: number }> = [];

    if (_query && customFilter) {
      filtered = _items
        .filter((item) => customFilter(_query, item))
        .map((item) => ({ item, score: 1 }));
    } else if (_query) {
      filtered = _items
        .map((item) => {
          const searchText = `${item.title} ${item.description ?? ""} ${(item.keywords ?? []).join(" ")}`;
          return { item, score: fuzzyScore(_query, searchText) };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);
    } else {
      // No query — show recent first, then all
      const recentItems = _items.filter((i) => _recentIds.includes(i.id));
      const otherItems = _items.filter((i) => !_recentIds.includes(i.id));
      filtered = [...recentItems, ...otherItems].map((item) => ({ item, score: 1 }));
    }

    const visible = filtered.slice(0, maxVisibleItems);

    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = _query ? "No matching commands" : "Type to search commands...";
      empty.style.cssText = "padding:24px;text-align:center;color:#9ca3af;";
      resultsList.appendChild(empty);
      return;
    }

    // Group by category if categories exist
    const hasCategories = _items.some((i) => i.category);
    let currentCategory = "";

    visible.forEach(({ item }, idx) => {
      // Category header
      if (hasCategories && item.category !== currentCategory) {
        currentCategory = item.category!;
        const catHeader = document.createElement("div");
        catHeader.textContent = currentCategory;
        catHeader.style.cssText =
          "padding:6px 16px 4px;font-size:11px;font-weight:600;color:#6b7280;" +
          "text-transform:uppercase;letter-spacing:0.5px;";
        resultsList.appendChild(catHeader);
      }

      const row = document.createElement("div");
      row.className = "palette-item";
      row.dataset.index = String(idx);
      row.tabIndex = 0;
      row.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;" +
        (idx === _focusedIndex ? "background:#eff6ff;" : "") +
        (item.disabled ? "opacity:0.45;cursor:not-allowed;" : "");

      // Icon
      if (item.icon) {
        const iconEl = document.createElement("span");
        iconEl.innerHTML = typeof item.icon === "string" ? item.icon : "";
        iconEl.style.flexShrink = "0";
        row.appendChild(iconEl);
      } else {
        const defaultIcon = document.createElement("span");
        defaultIcon.innerHTML = "&#9654;";
        defaultIcon.style.cssText =
          "width:20px;display:inline-flex;align-items:center;justify-content:center;" +
          "color:#9ca3af;font-size:10px;flex-shrink:0;";
        row.appendChild(defaultIcon);
      }

      // Title + description
      const textCol = document.createElement("div");
      textCol.style.flex = "1";
      textCol.style.minWidth = "0";

      const titleEl = document.createElement("div");
      titleEl.textContent = item.title;
      titleEl.style.fontWeight = "500";
      titleEl.style.color = "#111827";
      textCol.appendChild(titleEl);

      if (item.description) {
        const descEl = document.createElement("div");
        descEl.textContent = item.description;
        descEl.style.fontSize = "12px";
        descEl.style.color = "#6b7280";
        descEl.style.marginTop = "1px";
        textCol.appendChild(descEl);
      }

      row.appendChild(textCol);

      // Shortcut
      if (item.shortcut) {
        const shortcutEl = document.createElement("kbd");
        shortcutEl.textContent = item.shortcut;
        shortcutEl.style.cssText =
          "font-family:inherit;font-size:11px;padding:2px 6px;border:1px solid #e5e7eb;" +
          "border-radius:4px;background:#f9fafb;color:#6b7280;white-space:nowrap;";
        row.appendChild(shortcutEl);
      }

      row.addEventListener("click", () => {
        if (item.disabled) return;
        execute(item);
      });

      resultsList.appendChild(row);
    });

    _focusedIndex = Math.min(_focusedIndex, visible.length - 1);
    if (_focusedIndex < 0) _focusedIndex = 0;
  }

  function execute(item: PaletteItem): void {
    // Record as recent
    if (showRecent) {
      _recentIds = [item.id, ..._recentIds.filter((id) => id !== item.id)].slice(0, maxRecent);
      try { localStorage.setItem("cmd-palette-recent", JSON.stringify(_recentIds)); } catch {}
    }

    close();
    item.action();
    onExecute?.(item);
  }

  // --- Open/Close ---

  function open(): void {
    if (_open) return;
    _open = true;
    _query = "";
    input.value = "";
    _focusedIndex = 0;

    root.style.display = "flex";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        input.focus();
        renderResults();
      });
    });

    _setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_open) return;
    _open = false;
    root.style.display = "none";
    _removeListeners();
    onClose?.();
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  function setItems(newItems: PaletteItem[]): void {
    _items = newItems;
    if (_open) renderResults();
  }

  function focus(): void { if (_open) input.focus(); }

  function destroy(): void {
    close();
    root.remove();
  }

  // --- Event Listeners ---

  function _setupListeners(): void {
    // Input typing
    const onInput = () => {
      _query = input.value;
      _focusedIndex = 0;
      renderResults();
    };
    input.addEventListener("input", onInput);
    cleanupFns.push(() => input.removeEventListener("input", onInput));

    // Keyboard navigation in results
    const onKeyDown = (e: KeyboardEvent): void => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          _focusedIndex++;
          renderResults();
          break;
        case "ArrowUp":
          e.preventDefault();
          _focusedIndex = Math.max(0, _focusedIndex - 1);
          renderResults();
          break;
        case "Enter": {
          e.preventDefault();
          const rows = resultsList.querySelectorAll(".palette-item");
          if (_focusedIndex >= 0 && _focusedIndex < rows.length) {
            (rows[_focusedIndex] as HTMLElement).click();
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    };
    root.addEventListener("keydown", onKeyDown);
    cleanupFns.push(() => root.removeEventListener("keydown", onKeyDown));

    // Click overlay to close
    root.addEventListener("click", (e) => {
      if (e.target === root) close();
    });

    // Global hotkey trigger
    const onGlobalKey = (e: KeyboardEvent): void => {
      // Simple check for Mod+P or Mod+K
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "k")) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onGlobalKey);
    cleanupFns.push(() => document.removeEventListener("keydown", onGlobalKey));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
  }

  return { el: root, open, close, toggle, isOpen, setItems, focus, destroy };
}
