/**
 * Typeahead/Autocomplete: Async data source, fuzzy matching, keyboard navigation,
 * highlight matching, debounced input, dropdown positioning, accessibility.
 */

// --- Types ---

export interface TypeaheadItem {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
  /** Description/subtitle */
  description?: string;
  /** Icon (emoji, URL, SVG) */
  icon?: string;
  /** Category for grouping */
  category?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface TypeaheadOptions {
  /** Input element or container to attach to */
  input: HTMLInputElement | string;
  /** Data source: static array or async fetcher */
  source: TypeaheadItem[] | ((query: string) => Promise<TypeaheadItem[]>);
  /** Minimum characters before triggering (default: 1) */
  minChars?: number;
  /** Debounce delay in ms (default: 150) */
  debounceDelay?: number;
  /** Max results shown (default: 8) */
  maxResults?: number;
  /** Show descriptions in dropdown */
  showDescriptions?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Allow free-form input (not restricted to suggestions) */
  allowFreeInput?: boolean;
  /** Callback on selection */
  onSelect?: (item: TypeaheadItem) => void;
  /** Callback on input change (for controlled mode) */
  onInput?: (value: string) => void;
  /** Custom filter/match function */
  filterFn?: (item: TypeaheadItem, query: string) => number; // returns score
  /** Highlight matched text in results */
  highlightMatch?: boolean;
  /** Dropdown parent element (default: document.body) */
  dropdownParent?: HTMLElement;
  /** Z-index of dropdown */
  zIndex?: number;
  /** Custom CSS class for dropdown */
  className?: string;
  /** Auto-select first result on blur? (default: false) */
  autoSelectOnBlur?: boolean;
  /** Clear button */
  showClear?: boolean;
}

export interface TypeaheadInstance {
  /** The root container (input wrapper + dropdown) */
  element: HTMLDivElement;
  /** The input element */
  inputEl: HTMLInputElement;
  /** The dropdown element */
  dropdown: HTMLDivElement;
  /** Open the dropdown manually */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Get current value */
  getValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Focus the input */
  focus: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Fuzzy Scoring ---

/** Simple fuzzy match score (0 = no match, higher = better) */
function fuzzyScore(item: TypeaheadItem, query: string): number {
  const q = query.toLowerCase();
  const label = item.label.toLowerCase();
  const value = item.value.toLowerCase();
  const desc = (item.description ?? "").toLowerCase();
  const searchText = `${label} ${value} ${desc}`;

  // Exact label match
  if (label === q) return 1000;
  // Exact value match
  if (value === q) return 990;

  let score = 0;

  // Prefix bonus
  if (label.startsWith(q)) score += 500;
  else if (value.startsWith(q)) score += 480;

  // Contains bonus
  if (label.includes(q)) score += 200;
  else if (value.includes(q)) score += 180;
  else if (searchText.includes(q)) score += 50;

  // Character-by-character scoring
  let qi = 0;
  let consecutiveBonus = 0;
  for (let i = 0; i < label.length && qi < q.length; i++) {
    if (label[i] === q[qi]!) {
      consecutiveBonus += 10 + consecutiveBonus * 2;
      score += 5 + consecutiveBonus;
      // Word boundary bonus
      if (i === 0 || label[i - 1] === " ") score += 15;
    } else {
      consecutiveBonus = 0;
    }
  }

  // Category match
  if (item.category?.toLowerCase().includes(q)) score += 30;

  return score > 0 ? score : 0;
}

// --- Highlighting ---

function highlightText(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeRegExp(query);
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, '<mark class="ta-highlight">$1</mark>');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Main Class ---

export class TypeaheadManager {
  create(options: TypeaheadOptions): TypeaheadInstance {
    const opts = {
      minChars: options.minChars ?? 1,
      debounceDelay: options.debounceDelay ?? 150,
      maxResults: options.maxResults ?? 8,
      showDescriptions: options.showDescriptions ?? true,
      allowFreeInput: options.allowFreeInput ?? true,
      autoSelectOnBlur: options.autoSelectOnBlur ?? false,
      showClear: options.showClear ?? true,
      highlightMatch: options.highlightMatch ?? true,
      dropdownParent: options.dropdownParent ?? document.body,
      zIndex: options.zIndex ?? 10500,
      ...options,
    };

    // Resolve input
    const inputEl = typeof options.input === "string"
      ? document.querySelector<HTMLInputElement>(options.input)!
      : options.input;

    if (!inputEl) throw new Error("Typeahead: input element not found");

    if (opts.placeholder) inputEl.placeholder = opts.placeholder;

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `typeahead ${opts.className ?? ""}`;
    wrapper.style.cssText = "position:relative;display:inline-block;width:100%;";
    inputEl.parentNode?.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    // Clear button
    let clearBtn: HTMLButtonElement | null = null;
    if (opts.showClear) {
      clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.innerHTML = "&times;";
      clearBtn.style.cssText = `
        position:absolute;right:6px;top:50%;transform:translateY(-50%);
        background:none;border:none;font-size:16px;color:#999;cursor:pointer;
        padding:4px;display:none;line-height:1;
      `;
      clearBtn.addEventListener("click", () => {
        inputEl.value = "";
        instance.close();
        opts.onInput?.("");
        clearBtn!.style.display = "none";
      });
      wrapper.appendChild(clearBtn);
    }

    // Create dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "ta-dropdown";
    dropdown.setAttribute("role", "listbox");
    dropdown.style.cssText = `
      position:absolute;left:0;top:100%;width:100%;max-height:280px;
      overflow-y:auto;background:#fff;border-radius:8px;
      box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
      z-index:${opts.zIndex};display:none;flex-direction:column;
      padding:4px 0;margin-top:4px;font-size:13px;
      font-family:-apple-system,sans-serif;border:1px solid #e5e7eb;
    `;
    opts.dropdownParent.appendChild(dropdown);

    // State
    let isOpen = false;
    let selectedIndex = -1;
    let items: TypeaheadItem[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    // Resolve source type
    const isAsyncSource = typeof options.source === "function";

    async function fetchItems(query: string): Promise<TypeaheadItem[]> {
      if (isAsyncSource) {
        return (options.source as (q: string) => Promise<TypeaheadItem[]>)(query);
      }
      const allItems = options.source as TypeaheadItem[];
      if (!query) return allItems.slice(0, opts.maxResults);

      const scored = allItems
        .map((item) => ({ item, score: opts.filterFn ? opts.filterFn(item, query) : fuzzyScore(item, query) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, opts.maxResults)
        .map((s) => s.item);

      return scored;
    }

    function renderDropdown(results: Typeahead[]): void {
      dropdown.innerHTML = "";

      if (results.length === 0) {
        dropdown.style.display = "none";
        return;
      }

      dropdown.style.display = "flex";

      // Group by category if present
      const hasCategories = results.some((r) => r.category);
      let currentCategory = "";

      for (let i = 0; i < results.length; i++) {
        const item = results[i];

        // Category header
        if (hasCategories && item.category !== currentCategory) {
          currentCategory = item.category!;
          const catHeader = document.createElement("div");
          catHeader.textContent = currentCategory;
          catHeader.style.cssText = "padding:4px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;";
          dropdown.appendChild(catHeader);
        }

        const li = document.createElement("div");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === selectedIndex));
        li.dataset.index = String(i);
        li.dataset.value = item.value;
        li.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;
          ${i === selectedIndex ? "background:#f0f4ff;" : ""}
          ${item.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
          transition:background 0.1s;
        `;

        // Icon
        if (item.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.textContent = item.icon;
          iconSpan.style.cssText = "font-size:15px;width:20px;text-align:center;flex-shrink:0;";
          li.appendChild(iconSpan);
        }

        // Label with highlighting
        const labelSpan = document.createElement("span");
        labelSpan.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        if (opts.highlightMatch) {
          labelSpan.innerHTML = highlightText(item.label, inputEl.value);
        } else {
          labelSpan.textContent = item.label;
        }
        li.appendChild(labelSpan);

        // Description
        if (item.description && opts.showDescriptions) {
          const descSpan = document.createElement("span");
          descSpan.textContent = item.description;
          descSpan.style.cssText = "color:#888;font-size:11px;margin-left:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;";
          li.appendChild(descSpan);
        }

        if (!item.disabled) {
          li.addEventListener("mouseenter", () => {
            selectedIndex = i;
            renderDropdown(results); // Re-render to update selection
          });

          li.addEventListener("click", () => {
            inputEl.value = item.label;
            opts.onSelect?.(item);
            instance.close();
            opts.onInput?.(item.value);
            if (clearBtn) clearBtn.style.display = "none";
          });
        }

        dropdown.appendChild(li);
      }
    }

    function openDropdown(): void {
      if (isOpen) return;
      isOpen = true;
      selectedIndex = -1;

      const query = inputEl.value.trim();
      if (query.length >= opts.minChars) {
        items = await fetchItems(query);
        renderDropdown(items);
      } else {
        renderDropdown([]);
      }

      dropdown.style.display = items.length > 0 ? "flex" : "none";
    }

    // Event handlers
    inputEl.addEventListener("focus", () => {
      if (inputEl.value.length >= opts.minChars) openDropdown();
    });

    inputEl.addEventListener("input", () => {
      const val = inputEl.value;
      if (clearBtn) clearBtn.style.display = val.length > 0 ? "block" : "none";

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        opts.onInput?.(val);
        if (val.trim().length >= opts.minChars && document.activeElement === inputEl) {
          openDropdown();
        } else if (val.trim().length < opts.minChars) {
          instance.close();
        }
      }, opts.debounceDelay);
    });

    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          openDropdown();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
          renderDropdown(items);
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          renderDropdown(items);
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && !items[selectedIndex]?.disabled) {
            const item = items[selectedIndex]!;
            inputEl.value = item.label;
            opts.onSelect?.(item);
            opts.onInput?.(item.value);
            if (clearBtn) clearBtn.style.display = "none";
          }
          instance.close();
          break;
        case "Escape":
          e.preventDefault();
          instance.close();
          break;
      }
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== dropdown && !dropdown.contains(document.activeElement)) {
          if (opts.autoSelectOnBlur && selectedIndex >= 0 && items[selectedIndex]) {
            const item = items[selectedIndex]!;
            if (!item.disabled) {
              inputEl.value = item.label;
              opts.onSelect?.(item);
              opts.onInput?.(item.value);
            }
          }
          instance.close();
        }
      }, 150);
    });

    // Click outside to close
    const clickOutside = (e: MouseEvent) => {
      if (isOpen && !wrapper.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        instance.close();
      }
    };
    document.addEventListener("mousedown", clickOutside);

    // Instance
    const instance: TypeaheadInstance = {
      element: wrapper,
      inputEl,
      dropdown,

      open() { openDropdown(); },
      close() {
        isOpen = false;
        dropdown.style.display = "none";
        selectedIndex = -1;
      },

      getValue() { return inputEl.value; },
      setValue(v: string) {
        inputEl.value = v;
        opts.onInput?.(v);
        if (clearBtn) clearBtn.style.display = v.length > 0 ? "block" : "none";
      },
      focus() { inputEl.focus(); },
      destroy() {
        destroyed = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        document.removeEventListener("mousedown", clickOutside);
        dropdown.remove();
        // Don't remove input/wrapper since they may be used elsewhere
      },
    };

    return instance;
  }
}

/** Convenience: create a typeahead on an input element */
export function createTypeahead(options: TypeaheadOptions): TypeaheadInstance {
  return new TypeaheadManager().create(options);
}
