/**
 * Auto-Complete Input: Fuzzy-matching autocomplete with keyboard navigation,
 * async data source, debounce, grouping, highlight matching text, custom rendering,
 * and accessibility support.
 */

// --- Types ---

export interface AutoCompleteOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: string;
  disabled?: boolean;
  data?: unknown;
}

export interface AutoCompleteOptions {
  /** Input element or selector */
  input: HTMLInputElement | string;
  /** Options list or async loader */
  options: AutoCompleteOption[] | ((query: string) => Promise<AutoCompleteOption[]>);
  /** Minimum characters to trigger (default: 1) */
  minLength?: number;
  /** Debounce delay ms (default: 200) */
  debounceMs?: number;
  /** Max visible suggestions */
  maxSuggestions?: number;
  /** Show descriptions */
  showDescriptions?: boolean;
  /** Group options */
  groupBy?: boolean;
  /** Highlight matched text */
  highlightMatch?: boolean;
  /** Custom filter function */
  filterFn?: (option: AutoCompleteOption, query: string) => boolean;
  /** Custom renderer for each option */
  renderItem?: (option: AutoCompleteOption, query: string) => HTMLElement;
  /** Callback on selection */
  onSelect?: (option: AutoCompleteOption) => void;
  /** Callback on query change (for external search) */
  onSearch?: (query: string) => void;
  /** No results text */
  noResultsText?: string;
  /** Loading text */
  loadingText?: string;
  /** Dropdown z-index */
  zIndex?: number;
  /** Custom CSS class */
  className?: string;
}

export interface AutoCompleteInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  open: () => void;
  close: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  destroy: () => void;
}

// --- Helpers ---

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function highlight(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const q = escapeHtml(query);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escapeHtml(text).replace(re, '<mark style="background:#fef08a;border-radius:2px;padding:0 1px;">$1</mark>');
}

function defaultFilter(option: AutoCompleteOption, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q) ||
    (option.description ?? "").toLowerCase().includes(q);
}

// --- Main Class ---

export class AutoCompleteManager {
  create(options: AutoCompleteOptions): AutoCompleteInstance {
    const opts = {
      minLength: options.minLength ?? 1,
      debounceMs: options.debounceMs ?? 200,
      maxSuggestions: options.maxSuggestions ?? 10,
      showDescriptions: options.showDescriptions ?? true,
      groupBy: options.groupBy ?? true,
      highlightMatch: options.highlightMatch ?? true,
      noResultsText: options.noResultsText ?? "No results found",
      loadingText: options.loadingText ?? "Loading...",
      zIndex: options.zIndex ?? 10500,
      ...options,
    };

    const inputEl = typeof options.input === "string"
      ? document.querySelector<HTMLInputElement>(options.input)!
      : options.input;

    if (!inputEl) throw new Error("AutoComplete: input not found");

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
      max-height:280px;overflow-y:auto;background:#fff;
      border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.12);
      z-index:${opts.zIndex};display:none;flex-direction:column;
      padding:4px 0;margin-top:4px;font-size:13px;
      font-family:-apple-system,sans-serif;border:1px solid #e5e7eb;
    `;
    document.body.appendChild(dropdown);

    // State
    let isOpen = false;
    let selectedIndex = -1;
    let allOptions: AutoCompleteOption[] = [];
    let filteredOptions: AutoCompleteOption[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isLoading = false;
    const isAsyncSource = typeof options.options === "function";

    async function loadOptions(query: string): Promise<void> {
      isLoading = true;
      renderDropdown();
      if (isAsyncSource) {
        try {
          allOptions = await (options.options as (q: string) => Promise<AutoCompleteOption[]>)(query);
        } catch { allOptions = []; }
      }
      isLoading = false;
      applyFilter(query);
    }

    function applyFilter(query: string): void {
      const q = query.trim();
      if (!q || q.length < opts.minLength) {
        filteredOptions = [];
      } else {
        let list = allOptions;
        if (!isAsyncSource) {
          list = allOptions.filter((opt) =>
            opts.filterFn ? opts.filterFn(opt, q) : defaultFilter(opt, q)
          );
        }
        filteredOptions = list.slice(0, opts.maxSuggestions);
      }
      renderDropdown();
    }

    function renderDropdown(): void {
      dropdown.innerHTML = "";

      if (isLoading) {
        const loading = document.createElement("div");
        loading.style.cssText = "padding:12px 14px;text-align:center;color:#9ca3af;";
        loading.textContent = opts.loadingText;
        dropdown.appendChild(loading);
        dropdown.style.display = "flex";
        return;
      }

      if (filteredOptions.length === 0 && inputEl.value.length >= opts.minLength) {
        const noRes = document.createElement("div");
        noRes.style.cssText = "padding:12px 14px;text-align:center;color:#9ca3af;";
        noRes.textContent = opts.noResultsText;
        dropdown.appendChild(noRes);
        dropdown.style.display = "flex";
        return;
      }

      if (filteredOptions.length === 0) {
        dropdown.style.display = "none";
        return;
      }

      // Group rendering
      const hasGroups = opts.groupBy && filteredOptions.some((o) => o.group);
      let currentGroup = "";
      const q = inputEl.value.trim();

      for (let i = 0; i < filteredOptions.length; i++) {
        const opt = filteredOptions[i]!;

        if (hasGroups && opt.group !== currentGroup) {
          currentGroup = opt.group!;
          const header = document.createElement("div");
          header.style.cssText = "padding:4px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;";
          header.textContent = currentGroup;
          dropdown.appendChild(header);
        }

        let itemEl: HTMLElement;
        if (opts.renderItem) {
          itemEl = opts.renderItem(opt, q);
        } else {
          itemEl = document.createElement("div");
          itemEl.setAttribute("role", "option");
          itemEl.dataset.index = String(i);
          itemEl.style.cssText = `
            display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;
            ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
            transition:background 0.1s;
          `;

          if (opt.icon) {
            const iconSpan = document.createElement("span");
            iconSpan.textContent = opt.icon;
            iconSpan.style.cssText = "font-size:15px;width:20px;text-align:center;flex-shrink:0;";
            itemEl.appendChild(iconSpan);
          }

          const info = document.createElement("div");
          info.style.cssText = "flex:1;min-width:0;";
          const label = document.createElement("div");
          label.style.cssText = `${opt.disabled ? "color:#9ca3af;" : ""}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;`;
          if (opts.highlightMatch) {
            label.innerHTML = highlight(opt.label, q);
          } else {
            label.textContent = opt.label;
          }
          info.appendChild(label);

          if (opt.description && opts.showDescriptions) {
            const desc = document.createElement("div");
            desc.style.cssText = "font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
            desc.textContent = opt.description;
            info.appendChild(desc);
          }
          itemEl.appendChild(info);
        }

        itemEl.setAttribute("role", "option");
        itemEl.dataset.index = String(i);

        if (!opt.disabled) {
          itemEl.addEventListener("click", () => selectOption(opt));
          itemEl.addEventListener("mouseenter", () => {
            selectedIndex = i;
            highlightSelected();
          });
        }

        dropdown.appendChild(itemEl);
      }

      dropdown.style.display = "flex";
      selectedIndex = -1;
      highlightSelected();
    }

    function highlightSelected(): void {
      const items = dropdown.querySelectorAll('[role="option"]');
      items.forEach((item, idx) => {
        (item as HTMLElement).style.background = idx === selectedIndex ? "#f0f4ff" : "";
      });
    }

    function selectOption(option: AutoCompleteOption): void {
      inputEl.value = option.label;
      closeDropdown();
      opts.onSelect?.(option);
    }

    function positionDropdown(): void {
      const rect = wrapper.getBoundingClientRect();
      dropdown.style.width = `${rect.width}px`;
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    }

    function openDropdown(): void {
      if (isOpen) return;
      isOpen = true;
      selectedIndex = -1;
      const q = inputEl.value.trim();
      if (q.length >= opts.minLength) {
        loadOptions(q);
      }
      positionDropdown();
    }

    function closeDropdown(): void {
      isOpen = false;
      dropdown.style.display = "none";
      selectedIndex = -1;
    }

    // Event handlers
    inputEl.addEventListener("focus", () => {
      if (inputEl.value.length >= opts.minLength) openDropdown();
    });

    inputEl.addEventListener("input", () => {
      opts.onSearch?.(inputEl.value);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = inputEl.value.trim();
        if (q.length >= opts.minLength) {
          loadOptions(q).then(() => {
            dropdown.style.display = "flex";
            positionDropdown();
          });
        } else {
          closeDropdown();
        }
      }, opts.debounceMs);
    });

    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown") { e.preventDefault(); openDropdown(); }
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
            selectOption(filteredOptions[selectedIndex]!);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          break;
        case "Tab":
          if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
            e.preventDefault();
            selectOption(filteredOptions[selectedIndex]!);
          } else {
            closeDropdown();
          }
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

    const instance: AutoCompleteInstance = {
      element: wrapper,
      inputEl,

      open: openDropdown,
      close: closeDropdown,

      getValue() { return inputEl.value; },
      setValue(val: string) { inputEl.value = val; },

      destroy() {
        if (debounceTimer) clearTimeout(debounceTimer);
        document.removeEventListener("mousedown", clickOutside);
        dropdown.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create an auto-complete */
export function createAutoComplete(options: AutoCompleteOptions): AutoCompleteInstance {
  return new AutoCompleteManager().create(options);
}
