/**
 * Search Autocomplete: Search input with dropdown suggestions, keyboard navigation,
 * debounced async search, category grouping, recent searches, highlight matching,
 * and accessible ARIA attributes.
 */

// --- Types ---

export interface SuggestionItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Secondary text (description, URL, etc.) */
  sublabel?: string;
  /** Icon/emoji */
  icon?: string;
  /** Category/group name */
  category?: string;
  /** Data payload */
  data?: unknown;
  /** Disabled? */
  disabled?: boolean;
}

export interface AutocompleteOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Placeholder text */
  placeholder?: string;
  /** Static suggestions (shown when input is empty or for prefix match) */
  suggestions?: SuggestionItem[];
  /** Async search function: (query) => Promise<SuggestionItem[]> */
  onSearch?: (query: string) => Promise<SuggestionItem[]>;
  /** Debounce time for async search (ms) */
  debounceMs?: number;
  /** Minimum characters to trigger search */
  minChars?: number;
  /** Max visible suggestions in dropdown */
  maxSuggestions?: number;
  /** Show recent searches? */
  showRecent?: boolean;
  /** Max recent items to store */
  maxRecent?: number;
  /** Storage key for recent searches */
  recentStorageKey?: string;
  /** Callback when item selected */
  onSelect?: (item: SuggestionItem) => void;
  /** Callback when input changes (for controlled mode) */
  onChange?: (value: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Custom render function for each suggestion */
  renderItem?: (item: SuggestionItem, query: string) => HTMLElement | null;
  /** Custom group header renderer */
  renderGroupHeader?: (category: string) => HTMLElement | string;
  /** Highlight matching text? */
  highlightMatch?: boolean;
  /** Clear button visible? */
  clearable?: boolean;
  /** Loading indicator */
  showLoading?: boolean;
  /** Width (CSS value) */
  width?: string | number;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface AutocompleteInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  /** Get current value */
  getValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Open dropdown */
  open: () => void;
  /** Close dropdown */
  close: () => void;
  /** Focus the input */
  focus: () => void;
  /** Add a suggestion dynamically */
  addSuggestion: (item: SuggestionItem) => void;
  /** Remove a suggestion by id */
  removeSuggestion: (id: string) => void;
  /** Clear recent searches */
  clearRecent: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class AutocompleteManager {
  create(options: AutocompleteOptions): AutocompleteInstance {
    const opts = {
      placeholder: options.placeholder ?? "Search...",
      suggestions: options.suggestions ?? [],
      debounceMs: options.debounceMs ?? 250,
      minChars: options.minChars ?? 1,
      maxSuggestions: options.maxSuggestions ?? 10,
      showRecent: options.showRecent ?? true,
      maxRecent: options.maxRecent ?? 8,
      recentStorageKey: options.recentStorageKey ?? "ac-recent-searches",
      highlightMatch: options.highlightMatch ?? true,
      clearable: options.clearable ?? true,
      showLoading: options.showLoading ?? true,
      disabled: options.disabled ?? false,
      width: options.width ?? "100%",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Autocomplete: container not found");

    container.className = `autocomplete ${opts.className ?? ""}`;
    container.style.cssText = `position:relative;width:${typeof opts.width === "number" ? opts.width + "px" : opts.width};`;

    // Input wrapper
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position:relative;display:flex;align-items:center;border:1px solid #d1d5db;
      border-radius:8px;background:#fff;transition:border-color 0.15s,box-shadow 0.15s;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;
    container.appendChild(wrapper);

    // Search icon
    const searchIcon = document.createElement("span");
    searchIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
    `;
    searchIcon.style.cssText = "padding-left:10px;flex-shrink:0;";
    wrapper.appendChild(searchIcon);

    // Input
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = opts.placeholder;
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.disabled = opts.disabled;
    input.style.cssText = `
      flex:1;padding:9px 8px;border:none;background:none;outline:none;font-size:14px;color:#111827;
      font-family:-apple-system,sans-serif;min-width:0;
    `;
    wrapper.appendChild(input);

    // Clear button
    let clearBtn: HTMLButtonElement | null = null;
    if (opts.clearable) {
      clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.innerHTML = "&times;";
      clearBtn.title = "Clear";
      clearBtn.style.cssText = `
        background:none;border:none;font-size:16px;color:#9ca3af;cursor:pointer;
        padding:4px;margin-right:6px;display:none;align-items:center;justify-content:center;
        border-radius:50%;width:22px;height:22px;
      `;
      clearBtn.addEventListener("click", () => { instance.setValue(""); input.focus(); });
      clearBtn.addEventListener("mouseenter", () => { clearBtn!.style.background = "#f3f4f6"; clearBtn!.style.color = "#374151"; });
      clearBtn.addEventListener("mouseleave", () => { clearBtn!.style.background = ""; clearBtn!.style.color = "#9ca3af"; });
      wrapper.appendChild(clearBtn);
    }

    // Loading spinner
    let loadingEl: HTMLSpanElement | null = null;
    if (opts.showLoading) {
      loadingEl = document.createElement("span");
      loadingEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="animation:spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0110 10"/>
        </svg>
      `;
      loadingEl.style.cssText = "padding-right:8px;display:none;flex-shrink:0;";
      if (!document.getElementById("ac-spin-style")) {
        const style = document.createElement("style");
        style.id = "ac-spin-style";
        style.textContent = "@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}";
        document.head.appendChild(style);
      }
      wrapper.appendChild(loadingEl);
    }

    // Dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "ac-dropdown";
    dropdown.setAttribute("role", "listbox");
    dropdown.style.cssText = `
      position:absolute;top:100%;left:0;right:0;z-index:1000;
      background:#fff;border:1px solid #e5e7eb;border-radius:8px;
      box-shadow:0 12px 32px rgba(0,0,0,0.12),0 4px 8px rgba(0,0,0,0.06);
      margin-top:4px;max-height:320px;overflow-y:auto;display:none;
      font-size:13px;font-family:-apple-system,sans-serif;
    `;
    container.appendChild(dropdown);

    // State
    let isOpen = false;
    let activeIndex = -1;
    let currentItems: SuggestionItem[] = [];
    let destroyed = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function getRecent(): SuggestionItem[] {
      try {
        const raw = localStorage.getItem(opts.recentStorageKey);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    }

    function saveRecent(items: SuggestionItem[]): void {
      try {
        localStorage.setItem(opts.recentStorageKey, JSON.stringify(items.slice(0, opts.maxRecent)));
      } catch {}
    }

    function addToRecent(item: SuggestionItem): void {
      const recent = getRecent().filter((r) => r.id !== item.id);
      recent.unshift(item);
      saveRecent(recent);
    }

    function highlightText(text: string, query: string): string {
      if (!opts.highlightMatch || !query) return escapeHtml(text);
      const escaped = escapeHtml(query);
      const regex = new RegExp(`(${escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      return text.replace(regex, '<mark style="background:#fef08a;border-radius:2px;padding:0 1px;">$1</mark>');
    }

    function escapeHtml(s: string): string {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function renderDropdown(items: SuggestionItem[], query: string): void {
      dropdown.innerHTML = "";
      currentItems = items.slice(0, opts.maxSuggestions);
      activeIndex = -1;

      if (currentItems.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "padding:20px 16px;text-align:center;color:#9ca3af;font-size:13px;";
        empty.textContent = query.length >= opts.minChars ? "No results found" : "Type to search...";
        dropdown.appendChild(empty);
      } else {
        // Group by category if present
        const groups = new Map<string, SuggestionItem[]>();
        for (const item of currentItems) {
          const cat = item.category ?? "";
          if (!groups.has(cat)) groups.set(cat, []);
          groups.get(cat)!.push(item);
        }

        let itemGlobalIdx = 0;
        for (const [category, groupItems] of groups) {
          // Group header
          if (category && groups.size > 1) {
            const header = document.createElement("div");
            header.className = "ac-group-header";
            if (opts.renderGroupHeader) {
              const rendered = opts.renderGroupHeader(category);
              if (typeof rendered === "string") header.innerHTML = rendered;
              else header.appendChild(rendered);
            } else {
              header.textContent = category;
              header.style.cssText = "padding:6px 14px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;background:#f9fafb;";
            }
            dropdown.appendChild(header);
          }

          for (const item of groupItems) {
            const li = document.createElement("div");
            li.className = "ac-item";
            li.dataset.index = String(itemGlobalIdx);
            li.setAttribute("role", "option");
            li.setAttribute("aria-selected", "false");
            li.tabIndex = -1;
            li.style.cssText = `
              display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;
              ${item.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
              transition:background 0.1s;
            `;

            if (opts.renderItem) {
              const custom = opts.renderItem(item, query);
              if (custom) li.appendChild(custom);
              else li.innerHTML = `<span>${highlightText(item.label, query)}</span>`;
            } else {
              if (item.icon) {
                const iconSpan = document.createElement("span");
                iconSpan.textContent = item.icon;
                iconSpan.style.cssText = "font-size:16px;flex-shrink:0;width:20px;text-align:center;";
                li.appendChild(iconSpan);
              }

              const content = document.createElement("div");
              content.style.cssText = "flex:1;min-width:0;";

              const label = document.createElement("div");
              label.style.cssText = "font-size:13px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
              label.innerHTML = highlightText(item.label, query);
              content.appendChild(label);

              if (item.sublabel) {
                const sub = document.createElement("div");
                sub.style.cssText = "font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;";
                sub.innerHTML = highlightText(item.sublabel, query);
                content.appendChild(sub);
              }

              li.appendChild(content);
            }

            li.addEventListener("click", () => {
              if (item.disabled) return;
              selectItem(item);
            });

            li.addEventListener("mouseenter", () => {
              setActive(itemGlobalIdx);
            });

            dropdown.appendChild(li);
            itemGlobalIdx++;
          }
        }
      }
    }

    function selectItem(item: SuggestionItem): void {
      input.value = item.label;
      updateClearButton();
      addToRecent(item);
      close();
      opts.onSelect?.(item);
      opts.onChange?.(item.label);
    }

    function setActive(idx: number): void {
      activeIndex = idx;
      const items = dropdown.querySelectorAll<HTMLElement>(".ac-item");
      items.forEach((el, i) => {
        el.classList.toggle("active", i === idx);
        el.setAttribute("aria-selected", String(i === idx));
        el.style.background = i === idx ? "#eef2ff" : "";
      });

      // Scroll into view
      const activeEl = items[idx];
      if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
    }

    function open(): void {
      if (isOpen || destroyed) return;
      isOpen = true;
      input.setAttribute("aria-expanded", "true");

      const query = input.value.trim();

      if (query.length < opts.minChars) {
        // Show recent + static suggestions
        const recent = opts.showRecent ? getRecent() : [];
        const combined = [...recent, ...opts.suggestions.filter((s) => !recent.find((r) => r.id === s.id))];
        renderDropdown(combined, "");
      } else {
        // Filter static suggestions + trigger async search
        const filtered = opts.suggestions.filter((s) =>
          s.label.toLowerCase().includes(query.toLowerCase())
        );
        renderDropdown(filtered, query);

        if (opts.onSearch) {
          if (loadingEl) loadingEl.style.display = "block";
          debounceTimer = setTimeout(async () => {
            try {
              const results = await opts.onSearch!(query);
              if (!destroyed && isOpen) {
                renderDropdown(results, query);
              }
            } catch {}
            if (loadingEl) loadingEl.style.display = "none";
          }, opts.debounceMs);
        }
      }

      dropdown.style.display = "block";

      // Position
      const rect = wrapper.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      dropdown.style.top = spaceBelow > 300 ? "100%" : "auto";
      dropdown.style.bottom = spaceBelow <= 300 ? `${wrapper.offsetHeight + 4}px` : "auto";
    }

    function close(): void {
      isOpen = false;
      input.setAttribute("aria-expanded", "false");
      dropdown.style.display = "none";
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
      if (loadingEl) loadingEl.style.display = "none";
    }

    function updateClearButton(): void {
      if (clearBtn) clearBtn.style.display = input.value.length > 0 ? "flex" : "none";
    }

    // Event listeners
    input.addEventListener("focus", () => {
      open();
      opts.onFocus?.();
    });

    input.addEventListener("blur", () => {
      // Delay to allow click events on dropdown items
      setTimeout(() => { close(); opts.onBlur?.(); }, 150);
    });

    input.addEventListener("input", () => {
      updateClearButton();
      opts.onChange?.(input.value);
      open();
    });

    input.addEventListener("keydown", (e: KeyboardEvent) => {
      const items = dropdown.querySelectorAll<HTMLElement>(".ac-item");

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) { open(); break; }
          setActive(Math.min(activeIndex + 1, items.length - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          if (!isOpen) break;
          setActive(Math.max(activeIndex - 1, 0));
          break;

        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && currentItems[activeIndex]) {
            selectItem(currentItems[activeIndex]!);
          }
          break;

        case "Escape":
          e.preventDefault();
          close();
          break;

        case "Tab":
          close();
          break;
      }
    });

    // Wrapper border focus effect
    wrapper.addEventListener("mouseenter", () => { if (!opts.disabled) wrapper.style.borderColor = "#6366f1"; });
    wrapper.addEventListener("mouseleave", () => { if (!opts.disabled) wrapper.style.borderColor = "#d1d5db"; });

    // Click outside to close
    document.addEventListener("mousedown", (e) => {
      if (!container.contains(e.target as Node)) close();
    });

    const instance: AutocompleteInstance = {
      element: container,
      inputEl: input,

      getValue() { return input.value; },

      setValue(val: string) {
        input.value = val;
        updateClearButton();
        opts.onChange?.(val);
      },

      open,
      close,

      focus() { input.focus(); },

      addSuggestion(item: SuggestionItem) {
        opts.suggestions.push(item);
      },

      removeSuggestion(id: string) {
        opts.suggestions = opts.suggestions.filter((s) => s.id !== id);
      },

      clearRecent() {
        saveRecent([]);
      },

      destroy() {
        destroyed = true;
        close();
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create an autocomplete */
export function createAutocomplete(options: AutocompleteOptions): AutocompleteInstance {
  return new AutocompleteManager().create(options);
}
