/**
 * Command Menu Utilities: VS Code-style command palette / quick-open
 * dialog with fuzzy search, keyboard navigation, recent commands,
 * category grouping, and customizable rendering.
 */

// --- Types ---

export interface CommandMenuItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Optional group/category name */
  group?: string;
  /** Description shown below label */
  description?: string;
  /** Icon HTML prefix */
  icon?: string;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Danger/destructive action? */
  danger?: boolean;
  /** Action callback */
  action: () => void;
  /** Keywords for fuzzy search */
  keywords?: string;
}

export interface CommandMenuOptions {
  /** All available commands */
  items: CommandMenuItem[];
  /** Placeholder text */
  placeholder?: string;
  /** Title shown at top */
  title?: string;
  /** Max visible items before scrolling */
  maxVisible?: number;
  /** Show recently used section */
  showRecent?: boolean;
  /** Max recent items (default 5) */
  maxRecent?: number;
  /** Storage key for recent commands */
  recentStorageKey?: string;
  /** Hotkey to open (e.g., "Ctrl+P") */
  hotkey?: string;
  /** Z-index */
  zIndex?: number;
  /** Width in px */
  width?: number;
  /** Height in px */
  height?: number;
  /** Called when menu opens */
  onOpen?: () => void;
  /** Called when menu closes */
  onClose?: () => void;
  /** Called when a command is executed */
  onExecute?: (item: CommandMenuItem) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface CommandMenuInstance {
  /** The root element */
  el: HTMLElement;
  /** Open the command palette */
  open: () => void;
  /** Close the command palette */
  close: () => void;
  /** Toggle open/close */
  toggle: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Set filter/query text */
  setQuery: (text: string) => void;
  /** Update items */
  setItems: (items: CommandMenuItem[]) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Fuzzy Scoring ---

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t.includes(q)) return 100 + q.length; // Exact substring match bonus

  let score = 0;
  let qi = 0;
  let consecutiveBonus = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10 + consecutiveBonus * 2;
      consecutiveBonus++;
      qi++;
    } else {
      consecutiveBonus = 0;
    }
  }

  // Bonus for matching start of word
  if (qi === q.length) score += 20; // Full match
  if (t.startsWith(q)) score += 30; // Starts with

  return score;
}

// --- Recent Commands Storage ---

function getRecentCommands(key: string): string[] {
  try {
    const raw = localStorage.getItem(`cmd-recent-${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentCommand(key: string, id: string, maxRecent: number): void {
  try {
    let recent = getRecentCommands(key);
    recent = recent.filter((r) => r !== id);
    recent.unshift(id);
    recent = recent.slice(0, maxRecent);
    localStorage.setItem(`cmd-recent-${key}`, JSON.stringify(recent));
  } catch {}
}

// --- Core Factory ---

/**
 * Create a VS Code-style command palette.
 *
 * @example
 * ```ts
 * const cmd = createCommandMenu({
 *   items: [
 *     { id: "save", label: "Save File", shortcut: "Ctrl+S", action: () => save() },
 *     { id: "open", label: "Open File...", shortcut: "Ctrl+O", action: () => openDialog() },
 *   ],
 *   hotkey: "Ctrl+P",
 * });
 * ```
 */
export function createCommandMenu(options: CommandMenuOptions): CommandMenuInstance {
  const {
    items,
    placeholder = "Type a command...",
    title,
    maxVisible = 8,
    showRecent = true,
    maxRecent = 5,
    recentStorageKey = "cmd-default",
    hotkey,
    zIndex = 1100,
    width = 560,
    height = 380,
    onOpen,
    onClose,
    onExecute,
    className,
    container,
  } = options;

  let _visible = false;
  let _query = "";
  let _filtered: CommandMenuItem[] = [];
  let _selectedIndex = 0;
  let _recentIds: string[] = [];

  // Root overlay
  const overlay = document.createElement("div");
  overlay.className = `cmd-overlay ${className ?? ""}`.trim();
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:" +
    `${zIndex};display:none;align-items:center;justify-content:center;` +
    "backdrop-filter:blur(2px);animation:cmd-fade-in 0.15s ease;";

  // Panel
  const panel = document.createElement("div");
  panel.className = "cmd-panel";
  panel.style.cssText =
    `width:${width}px;max-height:${height}px;background:#fff;border-radius:12px;` +
    "box-shadow:0 16px 48px rgba(0,0,0,0.25);display:flex;flex-direction:column;" +
    "overflow:hidden;font-family:-apple-system,sans-serif;font-size:13px;";

  // Title bar
  if (title) {
    const titleBar = document.createElement("div");
    titleBar.className = "cmd-title";
    titleBar.style.cssText =
      "padding:12px 16px 8px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;";
    titleBar.textContent = title;
    panel.appendChild(titleBar);
  }

  // Search input
  const searchWrap = document.createElement("div");
  searchWrap.className = "cmd-search-wrap";
  searchWrap.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid #e5e7eb;";

  const searchIcon = document.createElement("span");
  searchIcon.innerHTML = "&#128269;";
  searchIcon.style.cssText = "color:#9ca3af;font-size:15px;flex-shrink:0;";
  searchWrap.appendChild(searchIcon);

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.setAttribute("aria-label", "Search commands");
  input.style.cssText =
    "flex:1;border:none;background:none;outline:none;font-size:14px;color:#111827;" +
    "::placeholder{color:#9ca3af;}";
  searchWrap.appendChild(input);

  panel.appendChild(searchWrap);

  // Results list
  const resultsList = document.createElement("div");
  resultsList.className = "cmd-results";
  resultsList.style.cssText =
    "flex:1;overflow-y:auto;padding:4px 0;min-height:80px;";
  resultsList.setAttribute("role", "listbox");
  panel.appendChild(resultsList);

  // Footer hint
  const footer = document.createElement("div");
  footer.className = "cmd-footer";
  footer.style.cssText =
    "padding:8px 16px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;";
  footer.innerHTML = `<span>Navigate \u2191\u2193</span><span>Esc to close</span>`;
  panel.appendChild(panel);

  overlay.appendChild(panel);
  (container ?? document.body).appendChild(overlay);

  // Inject keyframes
  if (!document.getElementById("cmd-keyframes")) {
    const ks = document.createElement("style");
    ks.id = "cmd-keyframes";
    ks.textContent = "@keyframes cmd-fade-in{from{opacity:0}to{opacity:1}}";
    document.head.appendChild(ks);
  }

  // --- Render filtered results ---

  function renderResults(): void {
    resultsList.innerHTML = "";

    // Get recent IDs
    if (showRecent) _recentIds = getRecentCommands(recentStorageKey);

    // Filter
    if (_query.trim()) {
      const scored = items
        .filter((item) => !item.disabled)
        .map((item) => ({
          item,
          score: fuzzyScore(_query, item.label + " " + (item.keywords ?? "") + " " + (item.group ?? "")),
        }))
        .sort((a, b) => b.score - a.score)
        .filter((s) => s.score > 0)
        .map((s) => s.item);
      _filtered = scored;
    } else {
      // No query — show recent first, then all grouped
      const recentItems = _recentIds
        .map((id) => items.find((i) => i.id === id))
        .filter(Boolean) as CommandMenuItem[];
      const otherItems = items.filter(
        (item) => !item.disabled && !_recentIds.includes(item.id),
      );
      _filtered = [...recentItems, ...otherItems];
    }

    // Group by category if query is empty
    let currentGroup = "";
    const toRender = _filtered.slice(0, maxVisible + 10); // Extra for safety

    for (let i = 0; i < toRender.length; i++) {
      const item = toRender[i]!;
      const isSelected = i === _selectedIndex;

      // Group header
      if (!_query.trim() && item.group && item.group !== currentGroup) {
        currentGroup = item.group;
        const gh = document.createElement("div");
        gh.className = "cmd-group-header";
        gh.textContent = currentGroup;
        gh.style.cssText =
          "padding:8px 16px 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;";
        resultsList.appendChild(gh);
      }

      const row = document.createElement("div");
      row.className = `cmd-item${isSelected ? " selected" : ""}${item.danger ? " danger" : ""}`;
      row.setAttribute("role", "option");
      row.dataset.index = String(i);
      row.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;" +
        "border:none;background:none;width:100%;text-align:left;font-size:13px;" +
        "transition:background 0.08s;" +
        (isSelected ? "background:#eff6ff;" : "") +
        (item.danger ? "color:#dc2626;" : "color:#374151;");

      if (item.icon) {
        const ic = document.createElement("span");
        ic.innerHTML = item.icon;
        ic.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
        row.appendChild(ic);
      }

      const textArea = document.createElement("div");
      textArea.style.cssText = "flex:1;min-width:0;";

      const lbl = document.createElement("span");
      lbl.className = "cmd-label";
      lbl.textContent = item.label;
      lbl.style.fontWeight = "500";
      textArea.appendChild(lbl);

      if (item.description) {
        const desc = document.createElement("span");
        desc.className = "cmd-desc";
        desc.textContent = item.description;
        desc.style.cssText = "display:block;font-size:11px;color:#9ca3af;margin-top:1px;";
        textArea.appendChild(desc);
      }

      row.appendChild(textArea);

      if (item.shortcut) {
        const sc = document.createElement("kbd");
        sc.textContent = item.shortcut;
        sc.style.cssText =
          "font-size:10px;padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;" +
          "background:#f9fafb;color:#6b7280;font-family:monospace;flex-shrink:0;";
        row.appendChild(sc);
      }

      row.addEventListener("click", () => executeCommand(item));
      resultsList.appendChild(row);
    }

    // Empty state
    if (_filtered.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText =
        "padding:32px 16px;text-align:center;color:#9ca3af;font-size:13px;";
      empty.textContent = _query.trim() ? "No matching commands" : "No commands available";
      resultsList.appendChild(empty);
    }

    // Clamp selection
    if (_selectedIndex >= Math.min(_filtered.length, maxVisible)) {
      _selectedIndex = Math.max(0, Math.min(_filtered.length - 1, maxVisible - 1));
    }
  }

  function executeCommand(item: CommandMenuItem): void {
    saveRecentCommand(recentStorageKey, item.id, maxRecent);
    item.action();
    onExecute?.(item);
    close();
  }

  // --- Open/Close ---

  function open(): void {
    if (_visible) return;
    _query = "";
    input.value = "";
    _selectedIndex = 0;
    overlay.style.display = "flex";
    _visible = true;
    renderResults();
    input.focus();
    setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_visible) return;
    overlay.style.display = "none";
    _visible = false;
    removeListeners();
    onClose?.();
  }

  function toggle(): void { _visible ? close() : open(); }
  function isVisible(): boolean { return _visible; }

  function setQuery(text: string): void {
    _query = text;
    input.value = text;
    _selectedIndex = 0;
    renderResults();
  }

  function setItems(newItems: CommandMenuItem[]): void {
    // Can't reassign options.items directly but we can update our reference
    (options as CommandMenuOptions).items = newItems;
    if (_visible) renderResults();
  }

  // --- Listeners ---

  function setupListeners(): void {
    removeListeners();

    input.addEventListener("input", () => {
      _query = input.value;
      _selectedIndex = 0;
      renderResults();
    });

    const keyHandler = (e: KeyboardEvent): void => {
      if (!_visible) return;
      switch (e.key) {
        case "Escape":
          e.preventDefault(); close(); break;
        case "ArrowDown":
          e.preventDefault();
          _selectedIndex = Math.min(_selectedIndex + 1, _filtered.length - 1);
          renderResults();
          break;
        case "ArrowUp":
          e.preventDefault();
          _selectedIndex = Math.max(_selectedIndex - 1, 0);
          renderResults();
          break;
        case "Enter":
          e.preventDefault();
          if (_filtered[_selectedIndex]) executeCommand(_filtered[_selectedIndex]!);
          break;
        case "Home":
          e.preventDefault();
          _selectedIndex = 0;
          renderResults();
          break;
        case "End":
          e.preventDefault();
          _selectedIndex = Math.max(0, _filtered.length - 1);
          renderResults();
          break;
      }
    };

    document.addEventListener("keydown", keyHandler);
    cleanupFns.push(() => document.removeEventListener("keydown", keyHandler));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }

  function removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  function destroy(): void {
    close();
    overlay.remove();
  }

  // Global hotkey
  if (hotkey) {
    document.addEventListener("keydown", (e) => {
      const combo = (e.ctrlKey ? "Ctrl+" : "") + (e.metaKey ? "Meta+" : "") + e.key;
      if (combo === hotkey || e.key === hotkey) {
        e.preventDefault();
        toggle();
      }
    });
  }

  return { el: overlay, open, close, toggle, isVisible, setQuery, setItems, destroy };
}
