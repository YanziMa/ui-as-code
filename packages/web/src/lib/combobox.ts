/**
 * Combobox: Editable select input with dropdown list, keyboard navigation,
 * filtering, free-text entry, multi-select support, async options loading,
 * grouping, custom rendering, and accessibility (ARIA combobox pattern).
 */

// --- Types ---

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: string;
  disabled?: boolean;
  data?: unknown;
}

export interface ComboboxOptions {
  /** Input element or selector to enhance */
  input: HTMLInputElement | string;
  /** Options (static array or async loader) */
  options: ComboboxOption[] | ((query: string) => Promise<ComboboxOption[]>);
  /** Allow typing arbitrary text not in the option list? */
  allowCustomValue?: boolean;
  /** Multi-select mode */
  multiple?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum characters before filtering triggers */
  minLength?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Maximum visible items in dropdown */
  maxItems?: number;
  /** Show descriptions in dropdown items */
  showDescriptions?: boolean;
  /** Group dropdown items by field */
  groupBy?: boolean;
  /** Highlight matched text in results */
  highlightMatch?: boolean;
  /** Custom filter function */
  filterFn?: (option: ComboboxOption, query: string) => boolean;
  /** Custom render for each option */
  renderItem?: (option: ComboboxOption, query: string) => HTMLElement;
  /** Custom render for selected tag (multi-select) */
  renderTag?: (option: ComboboxOption, onRemove: () => void) => HTMLElement;
  /** No results message */
  noResultsText?: string;
  /** Loading indicator text */
  loadingText?: string;
  /** Dropdown z-index */
  zIndex?: number;
  /** Callback on selection change */
  onChange?: (values: string[], labels: string[]) => void;
  /** Callback on single item select */
  onSelect?: (item: ComboboxOption | null) => void;
  /** Callback on search query change */
  onSearch?: (query: string) => void;
  /** Custom CSS class for wrapper */
  className?: string;
}

export interface ComboboxInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  open: () => void;
  close: () => void;
  getValues: () => string[];
  getLabels: () => string[];
  setValues: (values: string[]) => void;
  addValue: (value: string) => void;
  removeValue: (value: string) => void;
  clear: () => void;
  getSelected: () => ComboboxOption[];
  setSelected: (items: ComboboxOption[]) => void;
  destroy: () => void;
}

// --- Helpers ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlight(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = escapeHtml(query);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escaped.replace(re, '<mark style="background:#fef08a;color:inherit;padding:0;border-radius:2px;">$1</mark>');
}

function defaultFilter(opt: ComboboxOption, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    opt.label.toLowerCase().includes(q) ||
    opt.value.toLowerCase().includes(q)
  );
}

// --- Main Factory ---

export function createCombobox(options: ComboboxOptions): ComboboxInstance {
  const opts = {
    allowCustomValue: options.allowCustomValue ?? false,
    multiple: options.multiple ?? false,
    placeholder: options.placeholder ?? "Search...",
    minLength: options.minLength ?? 0,
    debounceMs: options.debounceMs ?? 150,
    maxItems: options.maxItems ?? 10,
    showDescriptions: options.showDescriptions ?? true,
    groupBy: options.groupBy ?? false,
    highlightMatch: options.highlightMatch ?? true,
    noResultsText: options.noResultsText ?? "No results found",
    loadingText: options.loadingText ?? "Loading...",
    zIndex: options.zIndex ?? 10600,
    className: options.className ?? "",
    ...options,
  };

  const inputEl = typeof options.input === "string"
    ? document.querySelector<HTMLInputElement>(options.input)!
    : options.input;

  if (!inputEl) throw new Error("Combobox: input element not found");

  // Wrap input
  const wrapper = document.createElement("div");
  wrapper.className = `combobox ${opts.className}`;
  wrapper.style.cssText = `
    position:relative;display:flex;align-items:center;flex-wrap:wrap;gap:4px;
    border:1px solid #d1d5db;border-radius:6px;padding:4px 8px;
    background:#fff;font-family:-apple-system,sans-serif;font-size:14px;
    min-height:38px;cursor:text;
    transition:border-color 0.15s;
  `;
  inputEl.style.cssText = `
    flex:1;min-width:120px;border:none;outline:none;background:transparent;
    font-size:14px;padding:4px 0;line-height:1.5;color:#111827;
  `;
  if (inputEl.placeholder) inputEl.placeholder = opts.placeholder;

  inputEl.parentNode?.insertBefore(wrapper, inputEl);
  wrapper.appendChild(inputEl);

  // Tags container (multi-select)
  const tagsContainer = document.createElement("div");
  tagsContainer.className = "combobox-tags";
  tagsContainer.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;align-items:center;";
  wrapper.insertBefore(tagsContainer, inputEl);

  // Dropdown
  const dropdown = document.createElement("div");
  dropdown.className = "combobox-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.style.cssText = `
    position:absolute;left:0;top:100%;width:100%;
    max-height:280px;overflow-y:auto;
    background:#fff;border-radius:8px;
    box-shadow:0 12px 40px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.06);
    z-index:${opts.zIndex};display:none;flex-direction:column;
    padding:4px 0;margin-top:4px;font-size:13px;
    font-family:-apple-system,sans-serif;border:1px solid #e5e7eb;
  `;
  document.body.appendChild(dropdown);

  // State
  let isOpen = false;
  let destroyed = false;
  let selectedIndex = -1;
  let allOptions: ComboboxOption[] = [];
  let filteredOptions: ComboboxOption[] = [];
  let selectedValues: string[] = []; // multi-select values
  let selectedItem: ComboboxOption | null = null; // single-select value
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isLoading = false;

  const isAsyncSource = typeof options.options === "function";

  // --- Load / Filter ---

  async function loadOptions(query: string = ""): Promise<void> {
    isLoading = true;
    if (isOpen && (allOptions.length === 0 || isAsyncSource)) {
      renderLoading();
    }
    try {
      if (isAsyncSource) {
        allOptions = await (options.options as (q: string) => Promise<ComboboxOption[]>)(query);
        filteredOptions = allOptions.filter((o) =>
          opts.multiple ? !selectedValues.includes(o.value) : o.value !== selectedItem?.value
        );
      } else {
        allOptions = options.options as ComboboxOption[];
        filterOptions(query);
      }
    } finally {
      isLoading = false;
      if (isOpen) renderDropdown();
    }
  }

  function filterOptions(query: string): void {
    const q = query.trim();
    let base = allOptions;
    // Exclude already selected in multi-mode
    if (opts.multiple) {
      base = base.filter((o) => !selectedValues.includes(o.value));
    } else if (selectedItem) {
      base = base.filter((o) => o.value !== selectedItem.value);
    }

    if (!q) {
      filteredOptions = [...base];
    } else {
      filteredOptions = base.filter((opt) =>
        opts.filterFn ? opts.filterFn(opt, q) : defaultFilter(opt, q)
      );
    }
    if (opts.maxItems > 0) {
      filteredOptions = filteredOptions.slice(0, opts.maxItems);
    }
  }

  // --- Render ---

  function renderLoading(): void {
    dropdown.innerHTML = "";
    const el = document.createElement("div");
    el.style.cssText = "padding:12px 16px;text-align:center;color:#9ca3af;font-size:13px;";
    el.textContent = opts.loadingText;
    dropdown.appendChild(el);
    dropdown.style.display = "flex";
  }

  function renderDropdown(): void {
    dropdown.innerHTML = "";

    if (isLoading) {
      renderLoading();
      return;
    }

    if (filteredOptions.length === 0) {
      const noRes = document.createElement("div");
      noRes.style.cssText = "padding:12px 16px;text-align:center;color:#9ca3af;font-size:13px;";
      noRes.textContent = opts.noResultsText;
      dropdown.appendChild(noRes);
      dropdown.style.display = "flex";
      return;
    }

    const hasGroups = opts.groupBy && filteredOptions.some((o) => o.group);
    let currentGroup = "";

    for (let i = 0; i < filteredOptions.length; i++) {
      const opt = filteredOptions[i]!;

      if (hasGroups && opt.group !== currentGroup) {
        currentGroup = opt.group!;
        const hdr = document.createElement("div");
        hdr.style.cssText = "padding:4px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;";
        hdr.textContent = currentGroup;
        dropdown.appendChild(hdr);
      }

      let itemEl: HTMLElement;
      if (opts.renderItem) {
        itemEl = opts.renderItem(opt, inputEl.value);
      } else {
        itemEl = createDefaultItem(opt, inputEl.value);
      }

      itemEl.setAttribute("role", "option");
      itemEl.dataset.index = String(i);
      itemEl.tabIndex = -1;

      if (!opt.disabled) {
        itemEl.addEventListener("click", () => handleSelect(opt));
        itemEl.addEventListener("mouseenter", () => { selectedIndex = i; highlightActive(); });
      }

      dropdown.appendChild(itemEl);
    }

    dropdown.style.display = "flex";
    selectedIndex = -1;
    highlightActive();
  }

  function createDefaultItem(opt: ComboboxOption, query: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;
      ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
      transition:background 0.1s;
    `;

    if (opt.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.textContent = opt.icon;
      iconSpan.style.cssText = "font-size:15px;width:20px;text-align:center;flex-shrink:0;";
      el.appendChild(iconSpan);
    }

    const labelDiv = document.createElement("div");
    labelDiv.style.cssText = "flex:1;min-width:0;";

    const lbl = document.createElement("div");
    lbl.style.cssText = `${opt.disabled ? "color:#9ca3af;" : ""}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    if (opts.highlightMatch) {
      lbl.innerHTML = highlight(opt.label, query);
    } else {
      lbl.textContent = opt.label;
    }
    labelDiv.appendChild(lbl);

    if (opt.description && opts.showDescriptions) {
      const desc = document.createElement("div");
      desc.style.cssText = "font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      desc.textContent = opt.description;
      labelDiv.appendChild(desc);
    }

    el.appendChild(labelDiv);

    // Checkmark for selected
    if ((!opts.multiple && opt.value === selectedItem?.value) ||
        (opts.multiple && selectedValues.includes(opt.value))) {
      const check = document.createElement("span");
      check.style.cssText = "margin-left:auto;flex-shrink:0;color:#3b82f6;font-size:13px;";
      check.textContent = "\u2713";
      el.appendChild(check);
    }

    return el;
  }

  function highlightActive(): void {
    const items = dropdown.querySelectorAll('[role="option"]');
    items.forEach((item, idx) => {
      (item as HTMLElement).style.background =
        idx === selectedIndex ? "#eff6ff" : "";
    });
    if (selectedIndex >= 0) {
      (items[selectedIndex] as HTMLElement)?.scrollIntoView({ block: "nearest" });
    }
  }

  // --- Selection Logic ---

  function handleSelect(opt: ComboboxOption): void {
    if (opt.disabled) return;

    if (opts.multiple) {
      if (selectedValues.includes(opt.value)) return;
      selectedValues.push(opt.value);
      renderTags();
      inputEl.value = "";
      inputEl.focus();
      filterOptions("");
      if (isOpen) renderDropdown();
    } else {
      selectedItem = opt;
      inputEl.value = opt.label;
      closeDropdown();
    }

    emitChange();
    opts.onSelect?.(opt);
  }

  function handleCustomValue(value: string): void {
    if (!value.trim()) return;

    if (opts.multiple) {
      selectedValues.push(value.trim());
      renderTags();
      inputEl.value = "";
      filterOptions("");
      if (isOpen) renderDropdown();
    } else {
      selectedItem = { value: value.trim(), label: value.trim() };
      inputEl.value = value.trim();
      closeDropdown();
    }

    emitChange();
    opts.onSelect?.({ value: value.trim(), label: value.trim() });
  }

  function emitChange(): void {
    if (opts.multiple) {
      opts.onChange?.(selectedValues, selectedValues.map((v) => {
        const found = allOptions.find((o) => o.value === v);
        return found?.label ?? v;
      }));
    } else {
      opts.onChange?.(
        selectedItem ? [selectedItem.value] : [],
        selectedItem ? [selectedItem.label] : []
      );
    }
  }

  // --- Tags (Multi-select) ---

  function renderTags(): void {
    tagsContainer.innerHTML = "";
    if (!opts.multiple) return;

    for (const val of selectedValues) {
      const found = allOptions.find((o) => o.value === val);
      const label = found?.label ?? val;

      if (opts.renderTag) {
        const tagEl = opts.renderTag(found ?? { value: val, label }, () => removeValue(val));
        tagsContainer.appendChild(tagEl);
      } else {
        const tag = document.createElement("span");
        tag.className = "combobox-tag";
        tag.style.cssText = `
          display:inline-flex;align-items:center;gap:4px;
          background:#eff6ff;color:#1d4ed8;font-size:12px;
          padding:2px 8px;border-radius:9999px;white-space:nowrap;
        `;
        tag.textContent = label;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.style.cssText = `background:none;border:none;cursor:pointer;
          color:#1d4ed8;font-size:14px;line-height:1;padding:0 2px;`;
        btn.textContent = "\u00D7";
        btn.addEventListener("click", () => removeValue(val));
        tag.appendChild(btn);

        tagsContainer.appendChild(tag);
      }
    }
  }

  function removeValue(value: string): void {
    selectedValues = selectedValues.filter((v) => v !== value);
    renderTags();
    filterOptions(inputEl.value);
    if (isOpen) renderDropdown();
    emitChange();
  }

  // --- Open / Close ---

  function openDropdown(): void {
    if (isOpen || destroyed) return;
    isOpen = true;
    selectedIndex = -1;
    loadOptions(inputEl.value);
    wrapper.style.borderColor = "#3b82f6";
    wrapper.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
  }

  function closeDropdown(): void {
    if (!isOpen) return;
    isOpen = false;
    dropdown.style.display = "none";
    selectedIndex = -1;
    wrapper.style.borderColor = "#d1d5db";
    wrapper.style.boxShadow = "";
  }

  // --- Event Handlers ---

  function scheduleSearch(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = inputEl.value;
      opts.onSearch?.(q);
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
    if (inputEl.value.length >= opts.minLength || opts.minLength === 0) {
      openDropdown();
    }
  });

  inputEl.addEventListener("input", () => {
    scheduleSearch();
  });

  inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredOptions.length - 1);
        highlightActive();
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex -1, 0);
        highlightActive();
        break;
      case "Enter": {
        e.preventDefault();
        if (selectedIndex >= 0 && filteredOptions[selectedIndex] && !filteredOptions[selectedIndex]!.disabled) {
          handleSelect(filteredOptions[selectedIndex]!);
        } else if (opts.allowCustomValue && inputEl.value.trim()) {
          handleCustomValue(inputEl.value);
        } else {
          closeDropdown();
        }
        break;
      }
      case "Backspace":
        if (opts.multiple && !inputEl.value && selectedValues.length > 0) {
          removeValue(selectedValues[selectedValues.length - 1]!);
        }
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      case "Tab":
        closeDropdown();
        break;
    }
  });

  inputEl.addEventListener("blur", () => {
    setTimeout(() => {
      if (!dropdown.contains(document.activeElement)) {
        closeDropdown();
        // If single-select and input doesn't match any option, reset
        if (!opts.multiple && !opts.allowCustomValue && inputEl.value) {
          const match = allOptions.find((o) => o.label === inputEl.value);
          if (!match) {
            if (selectedItem) inputEl.value = selectedItem.label;
            else inputEl.value = "";
          }
        }
      }
    }, 150);
  });

  // Click outside
  const clickOutsideHandler = (e: MouseEvent) => {
    if (isOpen && !wrapper.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      closeDropdown();
    }
  };
  document.addEventListener("mousedown", clickOutsideHandler);

  // Click on wrapper opens
  wrapper.addEventListener("click", () => {
    inputEl.focus();
  });

  // --- Instance ---

  const instance: ComboboxInstance = {
    element: wrapper,
    inputEl,

    open: openDropdown,

    close: closeDropdown,

    getValues() {
      return opts.multiple ? [...selectedValues] : (selectedItem ? [selectedItem.value] : []);
    },

    getLabels() {
      return opts.multiple
        ? selectedValues.map((v) => {
            const f = allOptions.find((o) => o.value === v);
            return f?.label ?? v;
          })
        : (selectedItem ? [selectedItem.label] : []);
    },

    setValues(values: string[]) {
      if (opts.multiple) {
        selectedValues = [...values];
        renderTags();
      } else if (values.length > 0) {
        const found = allOptions.find((o) => o.value === values[0]);
        selectedItem = found ?? { value: values[0], label: values[0] };
        inputEl.value = selectedItem.label;
      } else {
        selectedItem = null;
        inputEl.value = "";
      }
      emitChange();
    },

    addValue(value: string) {
      if (opts.multiple && !selectedValues.includes(value)) {
        selectedValues.push(value);
        renderTags();
        emitChange();
      }
    },

    removeValue,

    clear() {
      selectedValues = [];
      selectedItem = null;
      inputEl.value = "";
      renderTags();
      emitChange();
    },

    getSelected() {
      return opts.multiple
        ? selectedValues.map((v) => allOptions.find((o) => o.value === v)!).filter(Boolean)
        : (selectedItem ? [selectedItem] : []);
    },

    setSelected(items: ComboboxOption[]) {
      if (opts.multiple) {
        selectedValues = items.map((i) => i.value);
        renderTags();
      } else if (items.length > 0) {
        selectedItem = items[0];
        inputEl.value = items[0].label;
      } else {
        selectedItem = null;
        inputEl.value = "";
      }
      emitChange();
    },

    destroy() {
      destroyed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener("mousedown", clickOutsideHandler);
      dropdown.remove();
      // Unwrap input
      if (wrapper.parentNode) {
        wrapper.parentNode.insertBefore(inputEl, wrapper);
        wrapper.remove();
      }
    },
  };

  return instance;
}
