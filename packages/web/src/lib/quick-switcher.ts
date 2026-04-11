/**
 * Quick Switcher: VS Code-style window/tab/panel switcher with
 * fuzzy search, keyboard navigation (j/k), recent items, and action execution.
 */

// --- Types ---

export interface SwitcherItem {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  /** Action on select */
  onSelect: () => void;
  /** Keywords for fuzzy matching */
  keywords?: string;
  /** Category for grouping */
  category?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface QuickSwitcherOptions {
  /** Placeholder text */
  placeholder?: string;
  /** Max visible results */
  maxResults?: number;
  /** Show recently used items */
  showRecent?: boolean;
  /** Max recent items */
  maxRecent?: number;
  /** Hotkey to open (default: "Ctrl+P") */
  hotkey?: string;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Width (default: 480px) */
  width?: string | number;
  /** Custom class name */
  className?: string;
  /** Callback when switcher opens */
  onOpen?: () => void;
  /** Callback when switcher closes */
  onClose?: () => void;
  /** Callback when item is selected */
  onSelect?: (item: SwitcherItem) => void;
  /** Custom render function */
  renderItem?: (item: SwitcherItem, index: number, isSelected: boolean) => HTMLElement;
}

export interface QuickSwitcherInstance {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  setItems: (items: SwitcherItem[]) => void;
  addItem: (item: SwitcherItem) => void;
  removeItem: (id: string) => void;
  destroy: () => void;
}

// --- Main Implementation ---

export function createQuickSwitcher(options: QuickSwitcherOptions = {}): QuickSwitcherInstance {
  const opts = {
    placeholder: options.placeholder ?? "Quick switch...",
    maxResults: options.maxResults ?? 8,
    showRecent: options.showRecent ?? true,
    maxRecent: options.maxRecent ?? 10,
    hotkey: options.hotkey ?? "Ctrl+P",
    animationDuration: options.animationDuration ?? 120,
    width: options.width ?? 480,
    className: options.className ?? "",
    ...options,
  };

  let allItems: SwitcherItem[] = [];
  let recentIds: string[] = [];
  let isOpenState = false;
  let currentQuery = "";
  let selectedIndex = 0;
  let destroyed = false;

  // Load recent from storage
  try {
    const saved = localStorage.getItem("qs-recent");
    if (saved) recentIds = JSON.parse(saved);
  } catch {}

  // DOM elements
  const backdrop = document.createElement("div");
  const panel = document.createElement("div");
  const input = document.createElement("input");
  const resultsContainer = document.createElement("div");

  // Setup styles
  setupStyles();

  // Build DOM
  buildDOM();

  // Bind hotkey
  bindHotkey();

  // Instance object
  const instance: QuickSwitcherInstance = {
    element: panel,

    open() { openDialog(); },
    close() { closeDialog(); },
    toggle() { isOpenState ? closeDialog() : openDialog(); },
    isOpen() { return isOpenState; },

    setItems(items) {
      allItems = [...items];
      if (isOpenState) render();
    },

    addItem(item) {
      allItems.push(item);
      if (isOpenState) render();
    },

    removeItem(id) {
      allItems = allItems.filter((i) => i.id !== id);
      if (isOpenState) render();
    },

    destroy() {
      destroyed = true;
      unbindHotkey();
      backdrop.remove();
      panel.remove();
    },
  };

  return instance;

  // --- Internal Functions ---

  function buildDOM(): void {
    // Backdrop
    backdrop.className = `qs-backdrop ${opts.className}`;
    backdrop.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:99998;
      display:flex;justify-content:center;padding-top:15vh;
      opacity:0;transition:opacity ${opts.animationDuration}ms ease;pointer-events:none;
    `;
    backdrop.addEventListener("click", () => closeDialog());

    // Panel
    panel.className = `qs-panel ${opts.className}`;
    panel.style.cssText = `
      width:${typeof opts.width === "number" ? `${opts.width}px` : opts.width};
      max-width:92vw;background:#fff;border-radius:12px;
      box-shadow:0 20px 60px rgba(0,0,0,0.25),0 0 1px rgba(0,0,0,0.1);
      overflow:hidden;font-family:-apple-system,sans-serif;
      transform:scale(0.96);transition:transform ${opts.animationDuration}ms ease,opacity ${opts.animationDuration}ms ease;
      display:none;flex-direction:column;max-height:65vh;z-index:99999;
    `;

    // Input area
    const inputArea = document.createElement("div");
    inputArea.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:12px 16px;
      border-bottom:1px solid #f0f0f0;
    `;

    input.type = "text";
    input.spellcheck = false;
    input.autocomplete = "off";
    input.placeholder = opts.placeholder;
    input.style.cssText = `
      flex:1;border:none;outline:none;font-size:15px;color:#111827;
      background:#fafafa;border-radius:8px;padding:9px 14px;
      font-family:inherit;
    `;
    input.addEventListener("input", () => handleInput(input.value));
    input.addEventListener("keydown", handleKeydown);

    // Clear button
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&#215;";
    clearBtn.style.cssText = `
      background:none;border:none;font-size:15px;color:#bbb;cursor:pointer;
      padding:4px;border-radius:4px;display:none;
    `;
    clearBtn.addEventListener("click", () => { input.value = ""; handleInput(""); });
    inputArea.appendChild(clearBtn);
    panel.appendChild(inputArea);

    // Results
    resultsContainer.style.cssText = "overflow-y:auto;flex:1;padding:4px 0;";
    panel.appendChild(resultsContainer);

    // Footer hint
    const footer = document.createElement("div");
    footer.style.cssText = `
      display:flex;gap:12px;padding:8px 16px;border-top:1px solid #f0f0f0;
      justify-content:center;
    `;
    footer.innerHTML = `<span style="font-size:11px;color:#aaa;">type to search &middot; j/k navigate &middot; esc close</span>`;
    panel.appendChild(footer);

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
  }

  function handleInput(value: string): void {
    currentQuery = value;
    selectedIndex = 0;
    clearBtn.style.display = value ? "block" : "none";
    render();
  }

  function handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, getVisibleCount() - 1);
        scrollToSelected();
        render();
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        scrollToSelected();
        render();
        break;
      case "Enter":
        e.preventDefault();
        selectCurrent();
        break;
      case "Escape":
        e.preventDefault();
        closeDialog();
        break;
    }
  }

  function getVisibleCount(): number {
    return Math.min(resultsContainer.querySelectorAll(".qs-item").length, opts.maxResults);
  }

  function selectCurrent(): void {
    const items = getFilteredItems();
    const item = items[selectedIndex];
    if (item && !item.disabled) {
      addToRecent(item.id);
      opts.onSelect?.(item);
      item.onSelect();
      if (!e.shiftKey) closeDialog();
    }
  }

  function openDialog(): void {
    if (isOpenState || destroyed) return;
    isOpenState = true;
    currentQuery = "";
    selectedIndex = 0;

    backdrop.style.display = "flex";
    panel.style.display = "flex";

    requestAnimationFrame(() => {
      backdrop.style.opacity = "1";
      panel.style.transform = "scale(1)";
      input.focus();
      input.select();
    });

    render();
    opts.onOpen?.();
  }

  function closeDialog(): void {
    if (!isOpenState || destroyed) return;
    isOpenState = false;
    backdrop.style.opacity = "0";
    panel.style.transform = "scale(0.96)";

    setTimeout(() => {
      backdrop.style.display = "none";
      panel.style.display = "none";
    }, opts.animationDuration);

    opts.onClose?.();
  }

  function render(): void {
    resultsContainer.innerHTML = "";
    const items = getFilteredItems();

    if (items.length === 0 && currentQuery.trim()) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:24px;text-align:center;color:#aaa;font-size:13px;";
      empty.textContent = `No results for "${currentQuery}"`;
      resultsContainer.appendChild(empty);
      return;
    }

    for (let i = 0; i < items.length && i < opts.maxResults; i++) {
      const item = items[i]!;
      const isSelected = i === selectedIndex;
      const el = opts.renderItem
        ? opts.renderItem(item, i, isSelected)
        : createDefaultItem(item, i, isSelected);

      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", String(isSelected));
      el.classList.toggle("qs-selected", isSelected);
      el.addEventListener("click", () => {
        selectedIndex = i;
        selectCurrent();
      });

      resultsContainer.appendChild(el);
    }
  }

  function createDefaultItem(item: SwitcherItem, index: number, isSelected: boolean): HTMLElement {
    const el = document.createElement("div");
    el.className = `qs-item${isSelected ? " qs-selected" : ""}${item.disabled ? " qs-disabled" : ""}`;
    el.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:8px 16px;
      cursor:pointer;transition:background 0.08s;
      user-select:none;
      background:${isSelected ? "#eff6ff" : "transparent"};
      color:${isSelected ? "#111827" : "#374151"};
    `;

    if (item.icon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = item.icon;
      iconEl.style.cssText = "font-size:16px;width:20px;text-align:center;flex-shrink:0;";
      el.appendChild(iconEl);
    }

    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;";

    const title = document.createElement("div");
    title.style.cssText = "font-weight:500;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    title.textContent = item.title;
    content.appendChild(title);

    if (item.description) {
      const desc = document.createElement("div");
      desc.style.cssText = "font-size:12px;color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      desc.textContent = item.description;
      content.appendChild(desc);
    }

    el.appendChild(content);
    return el;
  }

  function getFilteredItems(): SwitcherItem[] {
    const query = currentQuery.trim().toLowerCase();

    if (!query) {
      // Show recent first, then all
      let results: SwitcherItem[] = [];
      if (opts.showRecent && recentIds.length > 0) {
        results = recentIds
          .map((id) => allItems.find((i) => i.id === id))
          .filter((i): i !== undefined && !i.disabled);
      }
      if (results.length === 0) results = allItems.filter((i) => !i.disabled);
      return results.slice(0, opts.maxResults * 2);
    }

    // Fuzzy score
    const scored = allItems
      .filter((i) => !i.disabled)
      .map((item) => ({
        item,
        score: scoreItem(query, item),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.maxResults);

    return scored.map((s) => s.item);
  }

  function scoreItem(query: string, item: SwitcherItem): number {
    const text = `${item.title} ${item.description ?? ""} ${item.keywords ?? ""}`.toLowerCase();
    let score = 0;

    if (item.title.toLowerCase() === query) score += 100;
    else if (item.title.toLowerCase().startsWith(query)) score += 80;
    else if (text.includes(query)) score += 40;

    // Character-level scoring
    let qi = 0, consecutive = 0;
    for (let i = 0; i < text.length && qi < query.length; i++) {
      if (text[i] === query[qi]!) { qi++; consecutive += 2; score += 5 + consecutive; }
      else consecutive = 0;
    }

    if (qi === query.length) score += 20;
    return score;
  }

  function addToRecent(id: string): void {
    recentIds = recentIds.filter((rid) => rid !== id);
    recentIds.unshift(id);
    if (recentIds.length > opts.maxRecent) recentIds.pop();
    try { localStorage.setItem("qs-recent", JSON.stringify(recentIds)); } catch {}
  }

  function scrollToSelected(): void {
    const selected = resultsContainer.querySelector(".qs-selected");
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }

  function bindHotkey(): void {
    const combo = parseHotkey(opts.hotkey);
    const handler = (e: KeyboardEvent) => {
      if (matchesHotkey(e, combo)) {
        e.preventDefault();
        instance.toggle();
      }
    };
    document.addEventListener("keydown", handler);
  }

  function unbindHotkey(): void {
    // Simple approach: we'd need to store the handler reference
    // For now, this is a no-op since the handler is anonymous
  }
}

function parseHotkey(combo: string): { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; key: string } {
  const parts = combo.split("+").map((p) => p.trim().toLowerCase());
  return {
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    alt: parts.includes("alt"),
    shift: parts.includes("shift"),
    meta: parts.includes("meta") || parts.includes("cmd"),
    key: parts.filter((p) => !["ctrl", "control", "alt", "shift", "meta", "cmd"].includes(p)).pop() ?? "",
  };
}

function matchesHotkey(e: KeyboardEvent, combo: ReturnType<typeof parseHotkey>): boolean {
  return (
    e.key.toLowerCase() === combo.key &&
    e.ctrlKey === combo.ctrl &&
    e.altKey === combo.alt &&
    e.shiftKey === combo.shift &&
    e.metaKey === combo.meta
  );
}

function setupStyles(): void {
  if (document.getElementById("qs-styles")) return;
  const style = document.createElement("style");
  style.id = "qs-styles";
  style.textContent = `
    .qs-item:hover { background: #f5f5f5; }
    .qs-disabled { opacity: 0.45; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}
