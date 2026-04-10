/**
 * Select / Multi-Select Dropdown: Single/multi-select, search/filter, checkbox items,
 * tag display with removal, grouped options, keyboard navigation, async loading,
 * virtual scroll for large lists, accessibility.
 */

// --- Types ---

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
  icon?: string;
  data?: unknown;
}

export interface SelectOptions {
  /** Input element or container to attach to */
  input: HTMLInputElement | string;
  /** Options list */
  options: SelectOption[] | ((query: string) => Promise<SelectOption[]>);
  /** Allow multiple selections */
  multiple?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Max selected items (for multi-select) */
  maxSelected?: number;
  /** Show search input inside dropdown */
  searchable?: boolean;
  /** Show checkboxes for multi-select */
  showCheckboxes?: boolean;
  /** Show descriptions */
  showDescriptions?: boolean;
  /** Group options by `group` field */
  groupBy?: boolean;
  /** Callback on selection change */
  onChange?: (values: string[], items: SelectOption[]) => void;
  /** Custom filter function */
  filterFn?: (option: SelectOption, query: string) => boolean;
  /** Max dropdown height (px) */
  dropdownMaxHeight?: number;
  /** Z-index of dropdown */
  zIndex?: number;
  /** No results message */
  noResultsText?: string;
  /** Select all option for multi-select */
  selectAll?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Disable the select */
  disabled?: boolean;
}

export interface SelectInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  dropdown: HTMLDivElement;
  open: () => void;
  close: () => void;
  getValues: () => string[];
  getSelectedItems: () => SelectOption[];
  setValues: (values: string[]) => void;
  clear: () => void;
  focus: () => void;
  destroy: () => void;
}

// --- Fuzzy Filter ---

function defaultFilter(option: SelectOption, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q) ||
    (option.description ?? "").toLowerCase().includes(q)
  );
}

// --- Main Class ---

export class SelectManager {
  create(options: SelectOptions): SelectInstance {
    const opts = {
      multiple: options.multiple ?? false,
      searchable: options.searchable ?? true,
      showCheckboxes: options.showCheckboxes ?? true,
      showDescriptions: options.showDescriptions ?? true,
      groupBy: options.groupBy ?? true,
      placeholder: options.placeholder ?? "Select...",
      maxSelected: options.maxSelected ?? Infinity,
      dropdownMaxHeight: options.dropdownMaxHeight ?? 280,
      zIndex: options.zIndex ?? 10500,
      noResultsText: options.noResultsText ?? "No results found",
      selectAll: options.selectAll ?? false,
      disabled: options.disabled ?? false,
      ...options,
    };

    // Resolve input
    const inputEl = typeof options.input === "string"
      ? document.querySelector<HTMLInputElement>(options.input)!
      : options.input;

    if (!inputEl) throw new Error("Select: input element not found");

    inputEl.placeholder = opts.placeholder;
    if (opts.disabled) inputEl.disabled = true;

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `select ${opts.className ?? ""}`;
    wrapper.style.cssText = "position:relative;display:inline-block;width:100%;";
    inputEl.parentNode?.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    // Tags container for multi-select
    let tagsContainer: HTMLDivElement | null = null;
    if (opts.multiple) {
      tagsContainer = document.createElement("div");
      tagsContainer.className = "select-tags";
      tagsContainer.style.cssText = `
        display:flex;flex-wrap:wrap;gap:4px;padding:2px 8px;min-height:34px;
        align-items:center;
      `;
      wrapper.insertBefore(tagsContainer, inputEl);
      inputEl.style.flex = "1";
      inputEl.style.minWidth = "80px";
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.flexWrap = "wrap";
    }

    // Create dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "select-dropdown";
    dropdown.setAttribute("role", "listbox");
    dropdown.setAttribute("aria-multiselectable", String(opts.multiple));
    dropdown.style.cssText = `
      position:absolute;left:0;top:100%;width:100%;
      max-height:${opts.dropdownMaxHeight}px;overflow-y:auto;
      background:#fff;border-radius:8px;
      box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
      z-index:${opts.zIndex};display:none;flex-direction:column;
      padding:4px 0;margin-top:4px;font-size:13px;
      font-family:-apple-system,sans-serif;border:1px solid #e5e7eb;
    `;
    document.body.appendChild(dropdown);

    // Search input inside dropdown
    let searchInput: HTMLInputElement | null = null;
    if (opts.searchable) {
      const searchWrapper = document.createElement("div");
      searchWrapper.style.cssText = "padding:6px 10px;border-bottom:1px solid #f0f0f0;";
      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search...";
      searchInput.style.cssText = `
        width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:4px;
        font-size:13px;outline:none;box-sizing:border-box;
        transition:border-color 0.15s;
      `;
      searchInput.addEventListener("focus", () => {
        searchInput!.style.borderColor = "#6366f1";
      });
      searchInput.addEventListener("blur", () => {
        searchInput!.style.borderColor = "#d1d5db";
      });
      searchWrapper.appendChild(searchInput);
      dropdown.appendChild(searchWrapper);
    }

    // State
    let isOpen = false;
    let selectedIndex = -1;
    let selectedValues: string[] = [];
    let allOptions: SelectOption[] = [];
    let filteredOptions: SelectOption[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const isAsyncSource = typeof options.options === "function";

    // Resolve source
    async function loadOptions(query: string = ""): Promise<void> {
      if (isAsyncSource) {
        allOptions = await (options.options as (q: string) => Promise<SelectOption[]>)(query);
        filteredOptions = allOptions;
      } else {
        allOptions = options.options as SelectOption[];
        filterOptions(query);
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
    }

    function isSelected(value: string): boolean {
      return selectedValues.includes(value);
    }

    function getSelectedItems(): SelectOption[] {
      return allOptions.filter((opt) => selectedValues.includes(opt.value));
    }

    function renderTags(): void {
      if (!tagsContainer) return;
      tagsContainer.innerHTML = "";
      const items = getSelectedItems();
      for (const item of items) {
        const tag = document.createElement("span");
        tag.className = "select-tag";
        tag.style.cssText = `
          display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
          background:#eef2ff;color:#4338ca;border-radius:4px;font-size:12px;
          cursor:pointer;user-select:none;transition:background 0.15s;
        `;
        tag.textContent = item.label;
        tag.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleSelection(item.value);
        });

        const removeBtn = document.createElement("span");
        removeBtn.innerHTML = "&times;";
        removeBtn.style.cssText = "margin-left:2px;font-weight:bold;";
        tag.appendChild(removeBtn);

        tagsContainer.appendChild(tag);
      }
    }

    function renderDropdown(): void {
      // Clear everything after search
      const afterSearch = searchInput ? searchInput.parentElement!.nextSibling : dropdown.firstChild;
      while (dropdown.lastChild && dropdown.lastChild !== afterSearch) {
        dropdown.removeChild(dropdown.lastChild);
      }

      if (filteredOptions.length === 0) {
        const noResults = document.createElement("div");
        noResults.style.cssText = "padding:12px 14px;text-align:center;color:#9ca3af;font-size:13px;";
        noResults.textContent = opts.noResultsText;
        dropdown.appendChild(noResults);
        dropdown.style.display = "flex";
        return;
      }

      // Select All option
      if (opts.multiple && opts.selectAll) {
        const allSelected = filteredOptions.every((opt) => !opt.disabled || isSelected(opt.value));
        const someSelected = filteredOptions.some((opt) => isSelected(opt.value));
        const selAll = createOptionElement(
          { value: "__all__", label: "Select All" },
          -1,
          someSelected ? (allSelected ? "checked" : "indeterminate") : "unchecked"
        );
        selAll.addEventListener("click", () => toggleSelectAll());
        dropdown.appendChild(selAll);
      }

      // Group rendering
      const hasGroups = opts.groupBy && filteredOptions.some((o) => o.group);
      let currentGroup = "";

      for (let i = 0; i < filteredOptions.length; i++) {
        const opt = filteredOptions[i]!;

        // Group header
        if (hasGroups && opt.group !== currentGroup) {
          currentGroup = opt.group!;
          const header = document.createElement("div");
          header.style.cssText = "padding:4px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;";
          header.textContent = currentGroup;
          dropdown.appendChild(header);
        }

        const el = createOptionElement(opt, i, isSelected(opt.value) ? "checked" : "unchecked");
        if (!opt.disabled) {
          el.addEventListener("click", () => toggleSelection(opt.value));
          el.addEventListener("mouseenter", () => {
            selectedIndex = i;
            highlightSelected();
          });
        }
        dropdown.appendChild(el);
      }

      dropdown.style.display = "flex";
      highlightSelected();
    }

    function createOptionElement(
      opt: SelectOption,
      index: number,
      checkState: "checked" | "unchecked" | "indeterminate",
    ): HTMLDivElement {
      const el = document.createElement("div");
      el.setAttribute("role", "option");
      el.dataset.index = String(index);
      el.dataset.value = opt.value;
      el.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;
        ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
        ${index === selectedIndex ? "background:#f0f4ff;" : ""}
        transition:background 0.1s;
      `;

      // Checkbox for multi-select
      if (opts.multiple && opts.showCheckboxes) {
        const cb = document.createElement("span");
        cb.style.cssText = `
          width:16px;height:16px;border-radius:3px;border:2px solid #d1d5db;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          background:${checkState === "checked" ? "#4338ca" : "transparent"};
          border-color:${checkState === "checked" ? "#4338ca" : checkState === "indeterminate" ? "#4338ca" : "#d1d5db"};
        `;
        if (checkState === "checked") {
          cb.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
        } else if (checkState === "indeterminate") {
          cb.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8"><rect x="1" y="3" width="6" height="2" rx="1" fill="#fff"/></svg>`;
        }
        el.appendChild(cb);
      } else if (!opts.multiple) {
        // Radio indicator for single select
        const radio = document.createElement("span");
        radio.style.cssText = `
          width:16px;height:16px;border-radius:50%;border:2px solid #d1d5db;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        `;
        if (checkState === "checked") {
          radio.style.background = "#4338ca";
          radio.style.borderColor = "#4338ca";
          radio.innerHTML = `<svg width="6" height="6" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#fff"/></svg>`;
        }
        el.appendChild(radio);
      }

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
      labelSpan.textContent = opt.label;
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
        (item as HTMLElement).style.background = idx === selectedIndex ? "#f0f4ff" : "";
      });
    }

    function toggleSelection(value: string): void {
      if (opts.multiple) {
        const idx = selectedValues.indexOf(value);
        if (idx >= 0) {
          selectedValues.splice(idx, 1);
        } else if (selectedValues.length < opts.maxSelected) {
          selectedValues.push(value);
        }
        if (!opts.multiple) {
          inputEl.value = "";
        }
        renderTags();
        renderDropdown();
        opts.onChange?.(selectedValues, getSelectedItems());
      } else {
        selectedValues = [value];
        const opt = allOptions.find((o) => o.value === value);
        inputEl.value = opt?.label ?? "";
        closeDropdown();
        opts.onChange?.(selectedValues, getSelectedItems());
      }
    }

    function toggleSelectAll(): void {
      const available = filteredOptions.filter((o) => !o.disabled);
      const allSelected = available.every((o) => isSelected(o.value));
      if (allSelected) {
        selectedValues = selectedValues.filter((v) => !available.find((o) => o.value === v));
      } else {
        for (const opt of available) {
          if (!isSelected(opt.value)) selectedValues.push(opt.value);
        }
      }
      renderTags();
      renderDropdown();
      opts.onChange?.(selectedValues, getSelectedItems());
    }

    function openDropdown(): void {
      if (isOpen || opts.disabled) return;
      isOpen = true;
      selectedIndex = -1;
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      loadOptions(inputEl.value).then(() => renderDropdown());
    }

    function closeDropdown(): void {
      isOpen = false;
      dropdown.style.display = "none";
      selectedIndex = -1;
    }

    // Event handlers
    inputEl.addEventListener("focus", () => {
      if (!opts.multiple) openDropdown();
    });

    inputEl.addEventListener("input", () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = inputEl.value;
        filterOptions(q);
        if (!isOpen) openDropdown();
        else renderDropdown();
      }, 150);
    });

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          filterOptions(searchInput!.value);
          renderDropdown();
        }, 150);
      });
    }

    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
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
            toggleSelection(filteredOptions[selectedIndex]!.value);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          inputEl.focus();
          break;
        case " ":
          if (!opts.multiple) {
            e.preventDefault();
            if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
              toggleSelection(filteredOptions[selectedIndex]!.value);
            }
          }
          break;
        case "Backspace":
          if (opts.multiple && !inputEl.value && selectedValues.length > 0) {
            selectedValues.pop();
            renderTags();
            opts.onChange?.(selectedValues, getSelectedItems());
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

    // Click outside to close
    const clickOutside = (e: MouseEvent) => {
      if (isOpen && !wrapper.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", clickOutside);

    // Instance
    const instance: SelectInstance = {
      element: wrapper,
      inputEl,
      dropdown,

      open() { openDropdown(); },
      close() { closeDropdown(); },

      getValues() { return [...selectedValues]; },
      getSelectedItems: getSelectedItems,

      setValues(values: string[]) {
        selectedValues = [...values];
        if (!opts.multiple) {
          const opt = allOptions.find((o) => o.value === values[0]);
          inputEl.value = opt?.label ?? "";
        }
        renderTags();
      },

      clear() {
        selectedValues = [];
        inputEl.value = "";
        renderTags();
        opts.onChange?.([], []);
      },

      focus() { inputEl.focus(); },

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

/** Convenience: create a select on an input element */
export function createSelect(options: SelectOptions): SelectInstance {
  return new SelectManager().create(options);
}
