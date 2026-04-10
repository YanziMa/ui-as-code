/**
 * Autocomplete: Text input with dropdown suggestions, async search, keyboard navigation,
 * highlight matching text, group support, custom rendering, debounce, and accessibility.
 */

// --- Types ---

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: string;
  disabled?: boolean;
  data?: unknown;
}

export interface AutocompleteOptions {
  /** Input element or selector */
  input: HTMLInputElement | string;
  /** Options list or async loader */
  options: AutocompleteOption[] | ((query: string) => Promise<AutocompleteOption[]>);
  /** Minimum characters to trigger (default: 1) */
  minLength?: number;
  /** Debounce delay ms (default: 200) */
  debounceMs?: number;
  /** Show descriptions in suggestions */
  showDescriptions?: boolean;
  /** Group options by field */
  groupBy?: boolean;
  /** Maximum visible items */
  maxItems?: number;
  /** No results message */
  noResultsText?: string;
  /** Loading text */
  loadingText?: string;
  /** Highlight matched text */
  highlightMatch?: boolean;
  /** Custom filter function */
  filterFn?: (option: AutocompleteOption, query: string) => boolean;
  /** Callback on selection */
  onSelect?: (item: AutocompleteOption) => void;
  /** Callback on input change */
  onChange?: (value: string) => void;
  /** Custom render function for each option */
  renderItem?: (option: AutocompleteOption, query: string) => HTMLElement;
  /** Dropdown z-index */
  zIndex?: number;
  /** Custom CSS class */
  className?: string;
}

export interface AutocompleteInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  open: () => void;
  close: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  setSelected: (item: AutocompleteOption) => void;
  getSelected: () => AutocompleteOption | null;
  clear: () => void;
  destroy: () => void;
}

// --- Helpers ---

function defaultFilter(option: AutocompleteOption, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q) ||
    (option.description ?? "").toLowerCase().includes(q)
  );
}

function highlightText(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = escapeHtml(query);
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escaped.replace(regex, '<mark style="background:#fef08a;color:inherit;padding:0;border-radius:2px;">$1</mark>');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Main Class ---

export class AutocompleteManager {
  create(options: AutocompleteOptions): AutocompleteInstance {
    const opts = {
      minLength: options.minLength ?? 1,
      debounceMs: options.debounceMs ?? 200,
      showDescriptions: options.showDescriptions ?? true,
      groupBy: options.groupBy ?? true,
      maxItems: options.maxItems ?? 10,
      noResultsText: options.noResultsText ?? "No results found",
      loadingText: options.loadingText ?? "Loading...",
      highlightMatch: options.highlightMatch ?? true,
      zIndex: options.zIndex ?? 10500,
      ...options,
    };

    const inputEl = typeof options.input === "string"
      ? document.querySelector<HTMLInputElement>(options.input)!
      : options.input;

    if (!inputEl) throw new Error("Autocomplete: input element not found");

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `autocomplete ${opts.className ?? ""}`;
    wrapper.style.cssText = "position:relative;display:inline-block;width:100%;";
    inputEl.parentNode?.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    // Dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "autocomplete-dropdown";
    dropdown.setAttribute("role", "listbox");
    dropdown.style.cssText = `
      position:absolute;left:0;top:100%;width:100%;
      max-height:260px;overflow-y:auto;
      background:#fff;border-radius:8px;
      box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
      z-index:${opts.zIndex};display:none;flex-direction:column;
      padding:4px 0;margin-top:4px;font-size:13px;
      font-family:-apple-system,sans-serif;border:1px solid #e5e7eb;
    `;
    document.body.appendChild(dropdown);

    // State
    let isOpen = false;
    let selectedIndex = -1;
    let allOptions: AutocompleteOption[] = [];
    let filteredOptions: AutocompleteOption[] = [];
    let selectedItem: AutocompleteOption | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;
    let isLoading = false;

    const isAsyncSource = typeof options.options === "function";

    // Resolve source
    async function loadOptions(query: string = ""): Promise<void> {
      isLoading = true;
      if (isOpen && allOptions.length === 0 || isAsyncSource) {
        renderLoading();
      }
      try {
        if (isAsyncSource) {
          allOptions = await (options.options as (q: string) => Promise<AutocompleteOption[]>)(query);
          filteredOptions = allOptions;
        } else {
          allOptions = options.options as AutocompleteOption[];
          filterOptions(query);
        }
      } finally {
        isLoading = false;
        if (isOpen) renderDropdown();
      }
    }

    function filterOptions(query: string): void {
      const q = query.trim();
      if (!q) {
        filteredOptions = [...allOptions];
      } else {
        filteredOptions = allOptions.filter((opt) =>
          opts.filterFn ? opts.filterFn(opt, q) : defaultFilter(opt, q)
        );
      }
      if (opts.maxItems > 0) {
        filteredOptions = filteredOptions.slice(0, opts.maxItems);
      }
    }

    function renderLoading(): void {
      dropdown.innerHTML = "";
      const loading = document.createElement("div");
      loading.style.cssText = "padding:12px 14px;text-align:center;color:#9ca3af;font-size:13px;";
      loading.textContent = opts.loadingText;
      dropdown.appendChild(loading);
      dropdown.style.display = "flex";
    }

    function renderDropdown(): void {
      dropdown.innerHTML = "";

      if (isLoading) {
        renderLoading();
        return;
      }

      if (filteredOptions.length === 0) {
        const noResults = document.createElement("div");
        noResults.style.cssText = "padding:12px 14px;text-align:center;color:#9ca3af;font-size:13px;";
        noResults.textContent = opts.noResultsText;
        dropdown.appendChild(noResults);
        dropdown.style.display = "flex";
        return;
      }

      const hasGroups = opts.groupBy && filteredOptions.some((o) => o.group);
      let currentGroup = "";

      for (let i = 0; i < filteredOptions.length; i++) {
        const opt = filteredOptions[i]!;

        // Group header
        if (hasGroups && opt.group !== currentGroup) {
          currentGroup = opt.group!;
          const header = document.createElement("div");
          header.style.cssText = "padding:4px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;";
          header.textContent = currentGroup;
          dropdown.appendChild(header);
        }

        let el: HTMLElement;
        if (opts.renderItem) {
          el = opts.renderItem(opt, inputEl.value);
        } else {
          el = createDefaultItem(opt, inputEl.value);
        }

        el.setAttribute("role", "option");
        el.dataset.index = String(i);
        el.tabIndex = -1;

        if (!opt.disabled) {
          el.addEventListener("click", () => selectItem(opt));
          el.addEventListener("mouseenter", () => {
            selectedIndex = i;
            highlightSelected();
          });
        }

        dropdown.appendChild(el);
      }

      dropdown.style.display = "flex";
      selectedIndex = -1;
      highlightSelected();
    }

    function createDefaultItem(opt: AutocompleteOption, query: string): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;
        ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
        transition:background 0.1s;
      `;

      // Icon
      if (opt.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.textContent = opt.icon;
        iconSpan.style.cssText = "font-size:15px;width:20px;text-align:center;flex-shrink:0;";
        el.appendChild(iconSpan);
      }

      // Label + description
      const labelDiv = document.createElement("div");
      labelDiv.style.cssText = "flex:1;min-width:0;";

      const labelSpan = document.createElement("div");
      labelSpan.style.cssText = `${opt.disabled ? "color:#9ca3af;" : ""}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      if (opts.highlightMatch) {
        labelSpan.innerHTML = highlightText(opt.label, query);
      } else {
        labelSpan.textContent = opt.label;
      }
      labelDiv.appendChild(labelSpan);

      if (opt.description && opts.showDescriptions) {
        const descSpan = document.createElement("div");
        descSpan.style.cssText = "font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        descSpan.textContent = opt.description;
        labelDiv.appendChild(descSpan);
      }

      el.appendChild(labelDiv);
      return el;
    }

    function highlightSelected(): void {
      const items = dropdown.querySelectorAll('[role="option"]');
      items.forEach((item, idx) => {
        (item as HTMLElement).style.background =
          idx === selectedIndex ? "#f0f4ff" : "";
      });
    }

    function selectItem(item: AutocompleteOption): void {
      selectedItem = item;
      inputEl.value = item.label;
      closeDropdown();
      opts.onSelect?.(item);
    }

    function openDropdown(): void {
      if (isOpen) return;
      isOpen = true;
      selectedIndex = -1;
      loadOptions(inputEl.value);
    }

    function closeDropdown(): void {
      isOpen = false;
      dropdown.style.display = "none";
      selectedIndex = -1;
    }

    // --- Event handlers ---

    function scheduleSearch(): void {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = inputEl.value;
        if (q.length < opts.minLength) {
          closeDropdown();
          return;
        }
        loadOptions(q).then(() => {
          if (isOpen) renderDropdown();
        });
      }, opts.debounceMs);
    }

    inputEl.addEventListener("focus", () => {
      if (inputEl.value.length >= opts.minLength) {
        openDropdown();
      }
    });

    inputEl.addEventListener("input", () => {
      selectedItem = null;
      opts.onChange?.(inputEl.value);
      scheduleSearch();
    });

    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          openDropdown();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, filteredOptions.length - 1);
          highlightSelected();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          highlightSelected();
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && filteredOptions[selectedIndex] && !filteredOptions[selectedIndex]!.disabled) {
            selectItem(filteredOptions[selectedIndex]!);
          } else {
            closeDropdown();
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          inputEl.focus();
          break;
        case "Tab":
          closeDropdown();
          break;
      }
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== dropdown && !dropdown.contains(document.activeElement)) {
          closeDropdown();
        }
      }, 150);
    });

    // Click outside
    const clickOutside = (e: MouseEvent) => {
      if (isOpen && !wrapper.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", clickOutside);

    // Instance
    const instance: AutocompleteInstance = {
      element: wrapper,
      inputEl,

      open() { openDropdown(); },
      close() { closeDropdown(); },

      getValue() { return inputEl.value; },

      setValue(value: string) {
        inputEl.value = value;
        selectedItem = null;
      },

      setSelected(item: AutocompleteOption) {
        selectedItem = item;
        inputEl.value = item.label;
      },

      getSelected() { return selectedItem; },

      clear() {
        inputEl.value = "";
        selectedItem = null;
      },

      destroy() {
        destroyed = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        document.removeEventListener("mousedown", clickOutside);
        dropdown.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create an autocomplete */
export function createAutocomplete(options: AutocompleteOptions): AutocompleteInstance {
  return new AutocompleteManager().create(options);
}
