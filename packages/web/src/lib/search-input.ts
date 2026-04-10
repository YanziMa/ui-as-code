/**
 * Search Input: Enhanced search field with debounce, suggestions dropdown,
 * keyboard navigation, clear button, loading state, search history,
 * highlight matching text, and accessibility.
 */

// --- Types ---

export interface SuggestionItem {
  /** Display label */
  label: string;
  /** Value to submit */
  value: string;
  /** Description/subtitle */
  description?: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Category/group header */
  category?: string;
  /** URL for navigation on select */
  url?: string;
}

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

export interface SearchInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Placeholder text */
  placeholder?: string;
  /** Initial value */
  defaultValue?: string;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Minimum characters to trigger search (default: 1) */
  minLength?: number;
  /** Maximum suggestions shown (default: 8) */
  maxSuggestions?: number;
  /** Show clear button? */
  showClear?: boolean;
  /** Show search icon? */
  showIcon?: boolean;
  /** Show loading spinner? */
  showLoading?: boolean;
  /** Enable search history (localStorage) */
  enableHistory?: boolean;
  /** Max history entries (default: 10) */
  maxHistoryEntries?: number;
  /** History storage key */
  historyKey?: string;
  /** Suggestion fetcher (async, called with current input) */
  onSearch?: (query: string) => Promise<SuggestionItem[]>;
  /** Callback when user selects a suggestion or presses Enter */
  onSelect?: (value: string, item?: SuggestionItem) => void;
  /** Callback on input change (debounced) */
  onChange?: (value: string) => void;
  /** Callback when input is cleared */
  onClear?: () => void;
  /** Custom renderer for suggestion items */
  renderSuggestion?: (item: SuggestionItem, index: number, el: HTMLElement) => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Full width? */
  fullWidth?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface SearchInputInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
  setSuggestions: (items: SuggestionItem[]) => void;
  setLoading: (loading: boolean) => void;
  destroy: () => void;
}

// --- Main Class ---

export class SearchInputManager {
  create(options: SearchInputOptions): SearchInputInstance {
    const opts = {
      placeholder: options.placeholder ?? "Search...",
      debounceMs: options.debounceMs ?? 300,
      minLength: options.minLength ?? 1,
      maxSuggestions: options.maxSuggestions ?? 8,
      showClear: options.showClear ?? true,
      showIcon: options.showIcon ?? true,
      showLoading: options.showLoading ?? true,
      enableHistory: options.enableHistory ?? false,
      maxHistoryEntries: options.maxHistoryEntries ?? 10,
      historyKey: options.historyKey ?? "search-history",
      size: options.size ?? "md",
      fullWidth: options.fullWidth ?? true,
      disabled: options.disabled ?? false,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("SearchInput: container element not found");

    let destroyed = false;
    let isLoading = false;
    let suggestions: SuggestionItem[] = [];
    let selectedIndex = -1;
    let history: SearchHistoryEntry[] = [];
    let dropdownVisible = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Load history
    if (opts.enableHistory) {
      try {
        const saved = localStorage.getItem(opts.historyKey);
        if (saved) history = JSON.parse(saved);
      } catch { /* ignore */ }
    }

    // Size styles
    const sizeStyles: Record<string, { height: number; paddingX: number; fontSize: number; iconSize: number }> = {
      sm: { height: 32, paddingX: 10, fontSize: 13, iconSize: 14 },
      md: { height: 40, paddingX: 14, fontSize: 14, iconSize: 16 },
      lg: { height: 48, paddingX: 18, fontSize: 16, iconSize: 18 },
    };
    const sz = sizeStyles[opts.size];

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `search-input-wrapper ${opts.className ?? ""}`;
    wrapper.style.cssText = `
      position:relative;${opts.fullWidth ? "width:100%;" : ""}
      font-family:-apple-system,sans-serif;
    `;
    container.appendChild(wrapper);

    // Input container
    const inputContainer = document.createElement("div");
    inputContainer.className = "search-input-container";
    inputContainer.style.cssText = `
      display:flex;align-items:center;gap:8px;
      height:${sz.height}px;padding:0 ${sz.paddingX}px;
      background:#fff;border:1.5px solid #d1d5db;border-radius:10px;
      transition:border-color 0.2s,box-shadow 0.2s;
      ${opts.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
    `;
    wrapper.appendChild(inputContainer);

    // Search icon
    if (opts.showIcon) {
      const searchIcon = document.createElement("span");
      searchIcon.innerHTML = "&#x1F50D;";
      searchIcon.style.cssText = `flex-shrink:0;font-size:${sz.iconSize + 2}px;color:#9ca3af;`;
      inputContainer.appendChild(searchIcon);
    }

    // Input
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = opts.placeholder;
    input.value = opts.defaultValue ?? "";
    input.disabled = opts.disabled;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.style.cssText = `
      flex:1;border:none;background:none;outline:none;font-size:${sz.fontSize}px;
      color:#111827;line-height:1;width:0;min-width:0;
    `;
    inputContainer.appendChild(input);

    // Loading spinner
    let spinner: HTMLSpanElement | null = null;
    if (opts.showLoading) {
      spinner = document.createElement("span");
      spinner.className = "search-spinner";
      spinner.style.cssText = `
        display:none;flex-shrink:0;width:${sz.iconSize}px;height:${sz.iconSize}px;
        border:2px solid #e5e7eb;border-top-color:#4338ca;border-radius:50%;
        animation:spin 0.6s linear infinite;
      `;
      inputContainer.appendChild(spinner);
    }

    // Clear button
    let clearBtn: HTMLButtonElement | null = null;
    if (opts.showClear) {
      clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.innerHTML = "&times;";
      clearBtn.setAttribute("aria-label", "Clear search");
      clearBtn.style.cssText = `
        display:none;flex-shrink:0;background:none;border:none;font-size:16px;
        color:#9ca3af;cursor:pointer;padding:2px;border-radius:4px;line-height:1;
      `;
      clearBtn.addEventListener("click", () => instance.clear());
      clearBtn.addEventListener("mouseenter", () => { clearBtn!.style.color = "#374151"; });
      clearBtn.addEventListener("mouseleave", () => { clearBtn!.style.color = "#9ca3af"; });
      inputContainer.appendChild(clearBtn);
    }

    // Dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "search-dropdown";
    dropdown.setAttribute("role", "listbox");
    dropdown.style.cssText = `
      position:absolute;top:100%;left:0;right:0;margin-top:4px;
      background:#fff;border:1px solid #e5e7eb;border-radius:10px;
      box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:100;
      max-height:320px;overflow-y:auto;display:none;
    `;
    wrapper.appendChild(dropdown);

    // Add keyframe animation
    if (!document.getElementById("search-spin-keyframes")) {
      const style = document.createElement("style");
      style.id = "search-spin-keyframes";
      style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
      document.head.appendChild(style);
    }

    function updateClearButton(): void {
      if (clearBtn) clearBtn.style.display = input.value.length > 0 ? "flex" : "none";
    }

    function updateLoading(): void {
      if (spinner) spinner.style.display = isLoading ? "flex" : "none";
    }

    function saveToHistory(query: string): void {
      if (!opts.enableHistory || !query.trim()) return;
      history = history.filter((h) => h.query !== query.trim());
      history.unshift({ query: query.trim(), timestamp: Date.now() });
      if (history.length > opts.maxHistoryEntries) history.pop();
      try { localStorage.setItem(opts.historyKey, JSON.stringify(history)); } catch { /* ignore */ }
    }

    function renderDropdown(): void {
      dropdown.innerHTML = "";
      selectedIndex = -1;

      const itemsToShow: Array<{ type: "suggestion" | "history"; data: SuggestionItem | SearchHistoryEntry }> = [];

      // History items first
      if (input.value.length === 0 && history.length > 0 && opts.enableHistory) {
        itemsToShow.push(...history.map((h) => ({ type: "history" as const, data: h })));
      }

      // Suggestions
      if (suggestions.length > 0) {
        itemsToShow.push(...suggestions.slice(0, opts.maxSuggestions).map((s) => ({ type: "suggestion" as const, data: s })));
      }

      if (itemsToShow.length === 0) {
        dropdownVisible = false;
        dropdown.style.display = "none";
        input.setAttribute("aria-expanded", "false");
        return;
      }

      dropdownVisible = true;
      dropdown.style.display = "block";
      input.setAttribute("aria-expanded", "true");

      let lastCategory = "";

      for (let i = 0; i < itemsToShow.length; i++) {
        const entry = itemsToShow[i]!;

        // Category header
        if (entry.type === "suggestion" && (entry.data as SuggestionItem).category && (entry.data as SuggestionItem).category !== lastCategory) {
          lastCategory = (entry.data as SuggestionItem).category!;
          const catHeader = document.createElement("div");
          catHeader.style.cssText = "padding:6px 14px 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;";
          catHeader.textContent = lastCategory;
          dropdown.appendChild(catHeader);
        }

        const itemEl = document.createElement("div");
        itemEl.dataset.index = String(i);
        itemEl.setAttribute("role", "option");
        itemEl.tabIndex = -1;
        itemEl.style.cssText = `
          display:flex;align-items:center;gap:10px;padding:8px 14px;
          cursor:pointer;transition:background 0.1s;
        `;

        if (entry.type === "history") {
          const he = entry.data as SearchHistoryEntry;
          const histIcon = document.createElement("span");
          histIcon.textContent = "\u{1F552}";
          histIcon.style.cssText = "font-size:14px;flex-shrink:0;";
          itemEl.appendChild(histIcon);
          const label = document.createElement("span");
          label.textContent = he.query;
          label.style.cssText = "flex:1;font-size:13px;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
          itemEl.appendChild(label);
        } else {
          const si = entry.data as SuggestionItem;
          if (si.icon) {
            const icon = document.createElement("span");
            icon.textContent = si.icon;
            icon.style.cssText = "font-size:15px;flex-shrink:0;";
            itemEl.appendChild(icon);
          }
          const content = document.createElement("div");
          content.style.cssText = "flex:1;min-width:0;";
          const label = document.createElement("div");
          label.style.cssText = "font-size:13px;color:#111827;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
          // Highlight match
          if (input.value) {
            label.innerHTML = this.highlightMatch(si.label, input.value);
          } else {
            label.textContent = si.label;
          }
          content.appendChild(label);
          if (si.description) {
            const desc = document.createElement("div");
            desc.style.cssText = "font-size:11px;color:#9ca3af;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
            desc.textContent = si.description;
            content.appendChild(desc);
          }
          itemEl.appendChild(content);
        }

        itemEl.addEventListener("click", () => selectItem(i));
        itemEl.addEventListener("mouseenter", () => { selectedIndex = i; highlightSelected(); });

        dropdown.appendChild(itemEl);
      }

      highlightSelected();
    }

    function highlightSelected(): void {
      const items = dropdown.querySelectorAll<HTMLElement>("[data-index]");
      items.forEach((item, idx) => {
        item.style.background = idx === selectedIndex ? "#eef2ff" : "";
      });
    }

    function selectItem(index: number): void {
      const items = dropdown.querySelectorAll<HTMLElement>("[data-index]");
      const el = items[index];
      if (!el) return;

      const allItems = [
        ...history.map((h) => ({ type: "history" as const, data: h })),
        ...suggestions,
      ];
      const entry = allItems[index];
      if (!entry) return;

      if (entry.type === "history") {
        input.value = (entry.data as SearchHistoryEntry).query;
        updateClearButton();
        opts.onSelect?.(input.value);
      } else {
        const si = entry.data as SuggestionItem;
        input.value = si.value;
        updateClearButton();
        opts.onSelect?.(si.value, si);
        if (si.url) window.location.href = si.url;
      }

      hideDropdown();
      saveToHistory(input.value);
    }

    function hideDropdown(): void {
      dropdownVisible = false;
      dropdown.style.display = "none";
      input.setAttribute("aria-expanded", "false");
      selectedIndex = -1;
    }

    async function performSearch(query: string): Promise<void> {
      if (!opts.onSearch || query.length < opts.minLength) {
        suggestions = [];
        renderDropdown();
        return;
      }

      isLoading = true;
      updateLoading();

      try {
        suggestions = await opts.onSearch(query);
      } catch {
        suggestions = [];
      }

      isLoading = false;
      updateLoading();
      renderDropdown();
    }

    // Debounced search
    function debouncedSearch(): void {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(input.value);
        opts.onChange?.(input.value);
      }, opts.debounceMs);
    }

    // Event listeners
    input.addEventListener("input", () => {
      updateClearButton();
      selectedIndex = -1;
      debouncedSearch();
    });

    input.addEventListener("focus", () => {
      if (input.value.length >= opts.minLength || (history.length > 0 && opts.enableHistory)) {
        if (suggestions.length === 0 && input.value.length >= opts.minLength) performSearch(input.value);
        else renderDropdown();
      }
    });

    input.addEventListener("keydown", (e: KeyboardEvent) => {
      const items = dropdown.querySelectorAll<HTMLElement>("[data-index]");

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!dropdownVisible) { performSearch(input.value); break; }
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
          highlightSelected();
          (items[selectedIndex] as HTMLElement)?.scrollIntoView({ block: "nearest" });
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          highlightSelected();
          (items[selectedIndex] as HTMLElement)?.scrollIntoView({ block: "nearest" });
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) selectItem(selectedIndex);
          else {
            saveToHistory(input.value);
            opts.onSelect?.(input.value);
            hideDropdown();
          }
          break;
        case "Escape":
          e.preventDefault();
          hideDropdown();
          input.blur();
          break;
      }
    });

    // Click outside to close
    document.addEventListener("mousedown", (e) => {
      if (!wrapper.contains(e.target as Node)) hideDropdown();
    });

    // Focus/blur styles
    input.addEventListener("focus", () => {
      inputContainer.style.borderColor = "#4338ca";
      inputContainer.style.boxShadow = "0 0 0 3px rgba(67,56,202,0.1)";
    });
    input.addEventListener("blur", () => {
      inputContainer.style.borderColor = "#d1d5db";
      inputContainer.style.boxShadow = "";
    });

    // Initial state
    updateClearButton();

    const instance: SearchInputInstance = {
      element: wrapper,
      inputEl: input,

      getValue() { return input.value; },

      setValue(val: string) {
        input.value = val;
        updateClearButton();
      },

      focus() { input.focus(); },

      blur() { input.blur(); },

      clear() {
        input.value = "";
        updateClearButton();
        hideDropdown();
        opts.onClear?.();
      },

      setSuggestions(items: SuggestionItem[]) {
        suggestions = items;
        renderDropdown();
      },

      setLoading(loading: boolean) {
        isLoading = loading;
        updateLoading();
      },

      destroy() {
        destroyed = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        wrapper.remove();
      },
    };

    return instance;
  }

  private highlightMatch(text: string, query: string): string {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return text.replace(regex, '<mark style="background:#fef08a;border-radius:2px;padding:0 1px;">$1</mark>');
  }
}

/** Convenience: create a search input */
export function createSearchInput(options: SearchInputOptions): SearchInputInstance {
  return new SearchInputManager().create(options);
}
