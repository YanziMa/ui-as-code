/**
 * Select Utilities: Select dropdown, multi-select, searchable select,
 * option groups, tag-based multi-select, async options loading,
 * virtual scroll for large lists, and ARIA combobox/listbox support.
 */

// --- Types ---

export type SelectSize = "sm" | "md" | "lg";
export type SelectVariant = "default" | "filled" | "underlined";

export interface SelectOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Disabled? */
  disabled?: boolean;
  /** Group key (for grouped options) */
  group?: string;
  /** Description/subtitle */
  description?: string;
  /** Icon (HTML string) */
  icon?: string;
  /** Prefix badge text */
  prefix?: string;
}

export interface SelectGroup {
  /** Group label */
  label: string;
  /** Options in this group */
  options: SelectOption[];
}

export interface SelectOptions<T = string> {
  /** Options array */
  options: SelectOption[];
  /** Grouped options (alternative to flat options) */
  groups?: SelectGroup[];
  /** Selected value(s) */
  value?: T | T[];
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Size variant */
  size?: SelectSize;
  /** Visual variant */
  variant?: SelectVariant;
  /** Multi-select mode? */
  multiple?: boolean;
  /** Allow creating new options not in list? */
  creatable?: boolean;
  /** Searchable? */
  searchable?: boolean;
  /** Minimum characters to trigger search */
  searchMinLength?: number;
  /** Clearable? */
  clearable?: boolean;
  /** Disabled? */
  disabled?: boolean;
  /** Required? */
  required?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Max visible items before scrolling */
  maxVisibleItems?: number;
  /** Show checkbox for each option (multi-select) */
  showCheckboxes?: boolean;
  /** Show option descriptions */
  showDescriptions?: boolean;
  /** Custom option renderer */
  renderOption?: (option: SelectOption, isSelected: boolean) => HTMLElement | string;
  /** Custom selected-value display */
  renderSelection?: (selected: SelectOption[]) => HTMLElement | string;
  /** On change callback */
  onChange?: (value: T | T[], selectedOptions: SelectOption[]) => void;
  /** On search callback (for async options) */
  onSearch?: (query: string) => void | Promise<SelectOption[]>;
  /** On focus callback */
  onFocus?: () => void;
  /** On blur callback */
  onBlur?: () => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface SelectInstance<T = string> {
  /** The root wrapper element */
  el: HTMLElement;
  /** Get current value(s) */
  getValue(): T | T[];
  /** Set value programmatically */
  setValue(value: T | T[]): void;
  /** Get selected option objects */
  getSelected(): SelectOption[];
  /** Open the dropdown */
  open(): void;
  /** Close the dropdown */
  close(): void;
  /** Toggle the dropdown */
  toggle(): void;
  /** Check if open */
  isOpen(): boolean;
  /** Focus the select */
  focus(): void;
  /** Set options dynamically */
  setOptions(options: SelectOption[]): void;
  /** Add an option */
  addOption(option: SelectOption): void;
  /** Remove an option by value */
  removeOption(value: string): void;
  /** Clear selection */
  clearSelection(): void;
  /** Set error state */
  setError(message?: string): void;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Size Config ---

const SELECT_SIZES: Record<SelectSize, { padding: string; fontSize: string; borderRadius: string; optionPadding: string }> = {
  "sm": { padding: "5px 8px", fontSize: "12px", borderRadius: "6px", optionPadding: "4px 8px" },
  "md": { padding: "7px 11px", fontSize: "14px", borderRadius: "8px", optionPadding: "6px 10px" },
  "lg": { padding: "9px 13px", fontSize: "15px", borderRadius: "8px", optionPadding: "7px 12px" },
};

// --- Core Factory ---

/**
 * Create a select/dropdown component.
 *
 * @example
 * ```ts
 * const select = createSelect({
 *   options: [
 *     { value: "us", label: "United States" },
 *     { value: "uk", label: "United Kingdom" },
 *     { value: "ca", label: "Canada" },
 *   ],
 *   placeholder: "Select a country",
 *   searchable: true,
 *   onChange: (val) => console.log(val),
 * });
 * ```
 */
export function createSelect<T = string>(options: SelectOptions<T>): SelectInstance<T> {
  const {
    options,
    groups,
    value: initialValue,
    placeholder = "Select...",
    label,
    helperText,
    error,
    size = "md",
    variant = "default",
    multiple = false,
    creatable = false,
    searchable = false,
    searchMinLength = 0,
    clearable = false,
    disabled = false,
    required = false,
    fullWidth = true,
    maxVisibleItems = 6,
    showCheckboxes = false,
    showDescriptions = false,
    renderOption,
    renderSelection,
    onChange,
    onSearch,
    onFocus,
    onBlur,
    className,
    container,
  } = options;

  let _options = [...options];
  let _open = false;
  let _highlightIndex = -1;
  let _searchQuery = "";
  let _filteredOptions: SelectOption[] = [];
  let _selectedValues: Set<string> = new Set();
  let _error = error ?? "";

  const sc = SELECT_SIZES[size];

  // Initialize selection from initial value
  function initSelection(): void {
    _selectedValues.clear();
    if (initialValue !== undefined && initialValue !== null) {
      if (Array.isArray(initialValue)) {
        for (const v of initialValue) _selectedValues.add(String(v));
      } else {
        _selectedValues.add(String(initialValue));
      }
    }
  }
  initSelection();

  // Root
  const root = document.createElement("div");
  root.className = `select-wrapper ${variant} ${size} ${className ?? ""}`.trim();
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "4px";
  root.style.width = fullWidth ? "100%" : "fit-content";
  root.style.position = "relative";

  // Label
  if (label) {
    const labelEl = document.createElement("label");
    labelEl.className = "select-label";
    labelEl.textContent = label;
    labelEl.style.cssText =
      `font-size:${sc.fontSize};font-weight:500;color:#374151;display:flex;align-items:center;gap:4px;`;
    if (required) {
      const reqMark = document.createElement("span");
      reqMark.textContent = "*";
      reqMark.style.color = "#ef4444";
      labelEl.appendChild(reqMark);
    }
    root.appendChild(labelEl);
  }

  // Trigger element
  const trigger = document.createElement("div");
  trigger.className = "select-trigger";
  trigger.tabIndex = disabled ? -1 : 0;
  trigger.setAttribute("role", multiple ? "listbox" : "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.style.cssText =
    `padding:${sc.padding};font-size:${sc.fontSize};cursor:${disabled ? "not-allowed" : "pointer"};` +
    "display:flex;align-items:center;justify-content:space-between;gap:6px;" +
    "border:1px solid #d1d5db;border-radius:" + sc.borderRadius + ";" +
    "background:#fff;color:#374151;transition:border-color 0.15s, box-shadow 0.15s;" +
    "min-height:36px;" + (disabled ? "opacity:0.5;pointer-events:none;" : "");

  // Selection display area
  const displayArea = document.createElement("div");
  displayArea.className = "select-display";
  displayArea.style.cssText = "flex:1;min-width:0;display:flex;align-items:center;gap:4px;flex-wrap:wrap;";
  trigger.appendChild(displayArea);

  // Chevron / arrow
  const chevron = document.createElement("span");
  chevron.className = "select-chevron";
  chevron.innerHTML = "&#9662;";
  chevron.style.cssText =
    "font-size:10px;color:#9ca3af;transition:transform 0.15s;flex-shrink:0;margin-left:4px;";
  trigger.appendChild(chevron);

  root.appendChild(trigger);

  // Dropdown panel
  const dropdown = document.createElement("div");
  dropdown.className = "select-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.style.cssText =
    "position:absolute;top:100%;left:0;right:0;z-index:1050;" +
    "margin-top:4px;background:#fff;border:1px solid #e5e7eb;border-radius:" + sc.borderRadius + ";" +
    "box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:0;overflow:hidden;" +
    "opacity:0;transform:translateY(-4px);transition:max-height 0.2s ease, opacity 0.2s ease, transform 0.2s ease;" +
    "display:none;";

  // Search input inside dropdown
  let searchInput: HTMLInputElement | null = null;

  if (searchable) {
    const searchWrapper = document.createElement("div");
    searchWrapper.className = "select-search-wrapper";
    searchWrapper.style.cssText =
      `padding:${sc.optionPadding};border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:6px;`;

    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search...";
    searchInput.style.cssText =
      "flex:1;border:none;outline:none;font-size:" + sc.fontSize + ";color:#374151;background:none;";
    searchWrapper.appendChild(searchInput);
    dropdown.appendChild(searchWrapper);
  }

  // Options container
  const optionsList = document.createElement("div");
  optionsList.className = "select-options-list";
  optionsList.style.cssText =
    `max-height:${maxVisibleItems * 38}px;overflow-y:auto;overscroll-behavior:contain;`;
  dropdown.appendChild(optionsList);

  document.body.appendChild(dropdown);

  // Helper / Error
  const helperEl = document.createElement("div");
  helperEl.className = "select-helper";
  helperEl.style.cssText = `font-size:12px;color:${_error ? "#dc2626" : "#6b7280"};min-height:18px;`;
  helperEl.textContent = _error || helperText || "";
  if (_error || helperText) root.appendChild(helperEl);

  // --- Internal Methods ---

  function getAllOptions(): SelectOption[] {
    if (groups && groups.length > 0) {
      return groups.flatMap((g) => g.options);
    }
    return _options;
  }

  function filterOptions(query: string): SelectOption[] {
    const all = getAllOptions();
    const q = query.toLowerCase().trim();
    if (!q) return all;
    return all.filter((opt) =>
      opt.label.toLowerCase().includes(q) ||
      (opt.description?.toLowerCase().includes(q) ?? false)
    );
  }

  function renderDisplay(): void {
    displayArea.innerHTML = "";
    const allOpts = getAllOptions();
    const selected = allOpts.filter((o) => _selectedValues.has(o.value));

    if (renderSelection) {
      const rendered = renderSelection(selected);
      displayArea.appendChild(typeof rendered === "string"
        ? document.createTextNode(rendered)
        : rendered);
    } else if (selected.length === 0) {
      const ph = document.createElement("span");
      ph.className = "select-placeholder";
      ph.textContent = placeholder;
      ph.style.color = "#9ca3af";
      displayArea.appendChild(ph);
    } else if (multiple) {
      selected.forEach((opt) => {
        const tag = document.createElement("span");
        tag.className = "select-tag";
        tag.style.cssText =
          "display:inline-flex;align-items:center;gap:3px;padding:1px 6px;" +
          "background:#eff6ff;color:#2563eb;border-radius:4px;font-size:12px;" +
          "line-height:1.4;max-width:140px;";
        tag.textContent = opt.label;

        if (!disabled) {
          const removeTag = document.createElement("button");
          removeTag.type = "button";
          removeTag.innerHTML = "&times;";
          removeTag.style.cssText =
            "background:none;border:none;cursor:pointer;color:#6b7280;font-size:12px;" +
            "padding:0 1px;line-height:1;";
          removeTag.addEventListener("click", (e) => {
            e.stopPropagation();
            _selectedValues.delete(opt.value);
            renderDisplay();
            fireChange();
          });
          tag.appendChild(removeTag);
        }

        displayArea.appendChild(tag);
      });
    } else {
      displayArea.textContent = selected[0]?.label ?? "";
    }
  }

  function renderDropdown(): void {
    optionsList.innerHTML = "";
    _filteredOptions = filterOptions(_searchQuery);
    _highlightIndex = -1;

    if (_filteredOptions.length === 0) {
      const empty = document.createElement("div");
      empty.className = "select-empty";
      empty.style.cssText =
        `padding:${sc.optionPadding};text-align:center;color:#9ca3af;font-size:${sc.fontSize};`;
      if (creatable && _searchQuery.trim()) {
        empty.innerHTML = `Create "<strong>${_escapeHtml(_searchQuery)}</strong>"`;
        empty.style.cursor = "pointer";
        empty.addEventListener("click", () => {
          const newOpt: SelectOption = { value: _searchQuery, label: _searchQuery };
          _options.push(newOpt);
          if (multiple) {
            _selectedValues.add(_searchQuery);
          } else {
            _selectedValues.clear();
            _selectedValues.add(_searchQuery);
          }
          _searchQuery = "";
          if (searchInput) searchInput.value = "";
          close();
          fireChange();
        });
      } else {
        empty.textContent = "No options found";
      }
      optionsList.appendChild(empty);
      return;
    }

    // Group rendering
    if (groups && groups.length > 0) {
      const filteredGroups = groups.map((g) => ({
        ...g,
        options: g.options.filter((o) =>
          !_searchQuery || o.label.toLowerCase().includes(_searchQuery.toLowerCase())
        ),
      })).filter((g) => g.options.length > 0);

      for (const group of filteredGroups) {
        const groupLabel = document.createElement("div");
        groupLabel.className = "select-group-label";
        groupLabel.style.cssText =
          `padding:${sc.optionPadding};font-size:11px;font-weight:600;color:#6b7280;` +
          "text-transform:uppercase;letter-spacing:0.05em;background:#f9fafb;";
        groupLabel.textContent = group.label;
        optionsList.appendChild(groupLabel);

        group.options.forEach((opt, i) => {
          renderSingleOption(opt, i === 0);
        });
      }
    } else {
      _filteredOptions.forEach((opt, i) => {
        renderSingleOption(opt, i === 0);
      });
    }
  }

  function renderSingleOption(opt: SelectOption, isFirstInGroup: boolean): void {
    const isSelected = _selectedValues.has(opt.value);
    const isHighlighted = optionsList.querySelectorAll(".select-option").length === _highlightIndex;

    const item = document.createElement("div");
    item.className = "select-option";
    item.dataset.value = opt.value;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(isSelected));
    item.tabIndex = -1;
    item.style.cssText =
      `padding:${sc.optionPadding};cursor:${opt.disabled ? "not-allowed" : "pointer"};` +
      "display:flex;align-items:center;gap:8px;font-size:" + sc.fontSize + ";color:#374151;" +
      "transition:background 0.08s;" +
      (opt.disabled ? "opacity:0.5;" : "") +
      (!isFirstInGroup ? "border-top:1px solid #f9fafb;" : "");

    if (showCheckboxes && multiple) {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isSelected;
      cb.disabled = opt.disabled;
      cb.style.pointerEvents = "auto";
      cb.addEventListener("click", (e) => e.stopPropagation());
      item.appendChild(cb);
    } else if (multiple) {
      const checkIcon = document.createElement("span");
      checkIcon.innerHTML = isSelected ? "&#10004;" : "";
      checkIcon.style.cssText =
        "width:16px;text-align:center;font-size:12px;color:#3b82f6;flex-shrink:0;";
      item.appendChild(checkIcon);
    } else if (isSelected) {
      const checkIcon = document.createElement("span");
      checkIcon.innerHTML = "&#10004;";
      checkIcon.style.cssText =
        "width:16px;text-align:center;font-size:12px;color:#3b82f6;flex-shrink:0;";
      item.appendChild(checkIcon);
    } else {
      const spacer = document.createElement("span");
      spacer.style.cssText = "width:16px;flex-shrink:0;";
      item.appendChild(spacer);
    }

    // Icon
    if (opt.icon) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = opt.icon;
      iconEl.style.flexShrink = "0";
      item.appendChild(iconEl);
    }

    // Content
    if (renderOption) {
      const rendered = renderOption(opt, isSelected);
      const content = document.createElement("div");
      content.style.flex = "1";
      content.style.minWidth = "0";
      content.appendChild(typeof rendered === "string"
        ? document.createTextNode(rendered)
        : rendered);
      item.appendChild(content);
    } else {
      const content = document.createElement("div");
      content.style.flex = "1";
      content.style.minWidth = "0";

      const labelEl = document.createElement("span");
      labelEl.className = "option-label";
      labelEl.textContent = opt.label;
      labelEl.style.fontWeight = isSelected ? "500" : "400";
      content.appendChild(labelEl);

      if ((showDescriptions || _searchQuery) && opt.description) {
        const descEl = document.createElement("span");
        descEl.className = "option-description";
        descEl.textContent = opt.description;
        descEl.style.cssText = "display:block;font-size:11px;color:#9ca3af;margin-top:1px;";
        content.appendChild(descEl);
      }

      item.appendChild(content);
    }

    // Highlight on hover
    if (!opt.disabled) {
      item.addEventListener("mouseenter", () => {
        highlightOption(item);
      });

      item.addEventListener("click", () => {
        selectOption(opt);
      });
    }

    optionsList.appendChild(item);
  }

  function highlightOption(el: HTMLElement): void {
    const items = optionsList.querySelectorAll(".select-option:not([style*='opacity:0.5'])");
    items.forEach((item) => {
      (item as HTMLElement).style.background = "";
    });
    el.style.background = "#eff6ff";
    _highlightIndex = Array.from(items).indexOf(el);
  }

  function selectOption(opt: SelectOption): void {
    if (opt.disabled) return;

    if (multiple) {
      if (_selectedValues.has(opt.value)) {
        _selectedValues.delete(opt.value);
      } else {
        _selectedValues.add(opt.value);
      }
    } else {
      _selectedValues.clear();
      _selectedValues.add(opt.value);
      close();
    }

    renderDisplay();
    fireChange();
    if (!multiple) close();
  }

  function fireChange(): void {
    const allOpts = getAllOptions();
    const selected = allOpts.filter((o) => _selectedValues.has(o.value));
    const values = multiple
      ? [..._selectedValues] as unknown as T[]
      : ([..._selectedValues][0] ?? "") as unknown as T;
    onChange?.(values, selected);
  }

  function _escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Open/Close ---

  function open(): void {
    if (_open || disabled) return;
    _open = true;
    _searchQuery = "";
    if (searchInput) searchInput.value = "";

    // Position dropdown
    const rect = trigger.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;

    dropdown.style.display = "block";
    requestAnimationFrame(() => {
      dropdown.style.maxHeight = `${maxVisibleItems * 38 + (searchable ? 40 : 0)}px`;
      dropdown.style.opacity = "1";
      dropdown.style.transform = "translateY(0)";
    });

    chevron.style.transform = "rotate(180deg)";
    trigger.setAttribute("aria-expanded", "true");

    renderDropdown();
    if (searchInput) searchInput.focus();
    onFocus?.();
  }

  function close(): void {
    if (!_open) return;
    _open = false;

    dropdown.style.maxHeight = "0";
    dropdown.style.opacity = "0";
    dropdown.style.transform = "translateY(-4px)";

    setTimeout(() => {
      dropdown.style.display = "none";
    }, 200);

    chevron.style.transform = "";
    trigger.setAttribute("aria-expanded", "false");
    onBlur?.();
  }

  function toggle(): void { _open ? close() : open(); }

  // --- Event Listeners ---

  trigger.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".select-tag button")) return;
    toggle();
  });

  trigger.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (!_open) open();
        else {
          const highlighted = optionsList.querySelector(".select-option[style*='background:#eff6ff']") as HTMLElement | null;
          if (highlighted) {
            const val = highlighted.dataset.value;
            const opt = _filteredOptions.find((o) => o.value === val);
            if (opt) selectOption(opt);
          }
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!_open) open();
        else moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!_open) open();
        else moveHighlight(-1);
        break;
      case "Escape":
        close();
        break;
      case "Backspace":
        if (multiple && _selectedValues.size > 0 && !searchInput) {
          const lastVal = [..._selectedValues].pop()!;
          _selectedValues.delete(lastVal);
          renderDisplay();
          fireChange();
        }
        break;
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      _searchQuery = searchInput!.value;
      renderDropdown();
      onSearch?.(_searchQuery);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); moveHighlight(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveHighlight(-1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const highlighted = optionsList.querySelector(".select-option[style*='background:#eff6ff']") as HTMLElement | null;
        if (highlighted) {
          const val = highlighted.dataset.value;
          const opt = _filteredOptions.find((o) => o.value === val);
          if (opt) selectOption(opt);
        }
      }
    });
  }

  function moveHighlight(dir: number): void {
    const items = Array.from(optionsList.querySelectorAll(".select-option:not([style*='opacity:0.5'])"));
    if (items.length === 0) return;

    _highlightIndex += dir;
    if (_highlightIndex < 0) _highlightIndex = items.length - 1;
    if (_highlightIndex >= items.length) _highlightIndex = 0;

    items.forEach((item) => { (item as HTMLElement).style.background = ""; });
    (items[_highlightIndex] as HTMLElement).style.background = "#eff6ff";
    (items[_highlightIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
  }

  // Close on outside click
  document.addEventListener("mousedown", (e) => {
    if (_open && !root.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      close();
    }
  });

  // Clear button
  if (clearable) {
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&times;";
    clearBtn.style.cssText =
      "position:absolute;right:24px;top:50%;transform:translateY(-50%);" +
      "background:none;border:none;cursor:pointer;color:#9ca3af;font-size:14px;" +
      "display:none;padding:2px;border-radius:3px;";
    clearBtn.addEventListener("mouseenter", () => { clearBtn.style.color = "#6b7280"; });
    clearBtn.addEventListener("mouseleave", () => { clearBtn.style.color = "#9ca3af"; });
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      instance.clearSelection();
    });
    trigger.style.position = "relative";
    trigger.appendChild(clearBtn);

    // Show/hide clear based on selection
    const origRender = renderDisplay;
    renderDisplay = () => {
      origRender();
      clearBtn.style.display = _selectedValues.size > 0 ? "block" : "none";
    };
  }

  // Initial render
  renderDisplay();

  // --- Instance ---

  const instance: SelectInstance<T> = {
    el: root,

    getValue() {
      if (multiple) return [..._selectedValues] as unknown as T[];
      return ([..._selectedValues][0] ?? "") as unknown as T;
    },

    setValue(val) {
      _selectedValues.clear();
      if (Array.isArray(val)) {
        for (const v of val) _selectedValues.add(String(v));
      } else if (val != null) {
        _selectedValues.add(String(val));
      }
      renderDisplay();
    },

    getSelected() {
      return getAllOptions().filter((o) => _selectedValues.has(o.value));
    },

    open, close, toggle,

    isOpen() { return _open; },

    focus() { trigger.focus(); },

    setOptions(opts) {
      _options = opts;
      if (_open) renderDropdown();
    },

    addOption(opt) {
      _options.push(opt);
      if (_open) renderDropdown();
    },

    removeOption(val) {
      _options = _options.filter((o) => o.value !== val);
      _selectedValues.delete(val);
      renderDisplay();
      if (_open) renderDropdown();
    },

    clearSelection() {
      _selectedValues.clear();
      renderDisplay();
      fireChange();
    },

    setError(msg) {
      _error = msg ?? "";
      helperEl.textContent = _error;
      helperEl.style.color = "#dc2626";
      trigger.style.borderColor = "#ef4444";
    },

    setDisabled(d) {
      disabled = d;
      trigger.style.opacity = d ? "0.5" : "1";
      trigger.style.pointerEvents = d ? "none" : "";
      trigger.tabIndex = d ? -1 : 0;
    },

    destroy() {
      close();
      dropdown.remove();
      root.remove();
    },
  };

  if (container) container.appendChild(root);

  return instance;
}
