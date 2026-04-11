/**
 * Select Dropdown Utilities: Accessible select/dropdown component with
 * search/filter, multi-select, grouped options, keyboard navigation,
 * virtual scrolling for large lists, async option loading, and
 * customizable rendering.
 */

// --- Types ---

export type SelectDropdownSize = "sm" | "md" | "lg";
export type SelectTriggerMode = "click" | "focus" | "manual";

export interface SelectOption {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
  /** Optional description/subtitle */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Group key for grouping */
  group?: string;
  /** Custom data */
  data?: unknown;
  /** Prefix icon HTML */
  prefix?: string;
  /** Suffix icon HTML */
  suffix?: string;
}

export interface SelectGroup {
  /** Group label */
  label: string;
  /** Options in this group */
  options: SelectOption[];
}

export interface SelectDropdownOptions {
  /** Options (flat list or groups) */
  options?: SelectOption[];
  /** Grouped options */
  groups?: SelectGroup[];
  /** Placeholder text */
  placeholder?: string;
  /** Allow multiple selections */
  multiple?: boolean;
  /** Show search input */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Maximum height of dropdown (px) */
  maxDropdownHeight?: number;
  /** Size variant */
  size?: SelectDropdownSize;
  /** How to open the dropdown */
  triggerMode?: SelectTriggerMode;
  /** Close on selection (single mode) */
  closeOnSelect?: boolean;
  /** No results message */
  noResultsMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Custom filter function */
  filterFn?: (option: SelectOption, query: string) => boolean;
  /** Custom option renderer */
  renderOption?: (option: SelectOption, isSelected: boolean, el: HTMLElement) => void;
  /** Called when selection changes */
  onChange?: (values: string[], options: SelectOption[]) => void;
  /** Called when dropdown opens/closes */
  onOpenChange?: (open: boolean) => void;
  /** Called when search query changes */
  onSearch?: (query: string) => void;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface SelectDropdownInstance {
  /** Root element */
  el: HTMLElement;
  /** Get selected values */
  getValues: () => string[];
  /** Get selected option objects */
  getSelectedOptions: () => SelectOption[];
  /** Set selected values programmatically */
  setValues: (values: string[]) => void;
  /** Open dropdown */
  open: () => void;
  /** Close dropdown */
  close: () => void;
  /** Toggle dropdown */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Focus the trigger */
  focus: () => void;
  /** Update options dynamically */
  setOptions: (options: SelectOption[]) => void;
  /** Clear selection */
  clear: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<SelectDropdownSize, { padding: string; fontSize: string; minHeight: string }> = {
  sm: { padding: "6px 10px", fontSize: "13px", minHeight: "30px" },
  md: { padding: "8px 12px", fontSize: "14px", minHeight: "38px" },
  lg: { padding: "10px 14px", fontSize: "15px", minHeight: "44px" },
};

// --- Core Factory ---

/**
 * Create an accessible select dropdown component.
 *
 * @example
 * ```ts
 * const select = createSelectDropdown({
 *   options: [
 *     { value: "apple", label: "Apple" },
 *     { value: "banana", label: "Banana", group: "fruits" },
 *   ],
 *   searchable: true,
 *   onChange: (vals, opts) => console.log(vals, opts),
 * });
 * ```
 */
export function createSelectDropdown(options: SelectDropdownOptions): SelectDropdownInstance {
  const {
    options: rawOptions = [],
    groups: rawGroups,
    placeholder = "Select...",
    multiple = false,
    searchable = false,
    searchPlaceholder = "Search...",
    maxDropdownHeight = 260,
    size = "md",
    triggerMode = "click",
    closeOnSelect = !multiple,
    noResultsMessage = "No results found",
    loading = false,
    loadingMessage = "Loading...",
    filterFn,
    renderOption,
    onChange,
    onOpenChange,
    onSearch,
    container,
    className,
  } = options;

  let _options = [...rawOptions];
  let _selectedValues: string[] = [];
  let _open = false;
  let _searchQuery = "";
  let cleanupFns: Array<() => void> = [];

  const ss = SIZE_STYLES[size];

  // Flatten groups into options list
  function _getAllOptions(): SelectOption[] {
    if (rawGroups && rawGroups.length > 0) {
      return rawGroups.flatMap((g) =>
        g.options.map((o) => ({ ...o, group: g.label })),
      );
    }
    return _options;
  }

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `select-dropdown ${size} ${className ?? ""}`.trim();
  root.style.cssText = "position:relative;display:inline-block;width:100%;";

  // Trigger button
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.style.cssText =
    `display:flex;align-items:center;width:100%;${ss.padding};` +
    `min-height:${ss.minHeight};border:1px solid #d1d5db;border-radius:8px;` +
    `background:#fff;font-size:${ss.fontSize};color:#374151;text-align:left;` +
    "cursor:pointer;gap:6px;transition:border-color 0.15s,box-shadow 0.15s;" +
    "justify-content:space-between;";

  // Trigger content area
  const triggerContent = document.createElement("span");
  triggerContent.className = "select-trigger-content";
  triggerContent.style.cssText = "flex:1;overflow:hidden;text-ellipsis;white-space:nowrap;text-align:left;";
  triggerContent.textContent = placeholder;

  // Chevron
  const chevron = document.createElement("span");
  chevron.className = "select-chevron";
  chevron.innerHTML = "&#9662;";
  chevron.style.cssText =
    "font-size:10px;color:#9ca3af;transition:transform 0.2s ease;" +
    "flex-shrink:0;display:inline-flex;align-items:center;";

  trigger.appendChild(triggerContent);
  trigger.appendChild(chevron);
  root.appendChild(trigger);

  // Dropdown panel
  const dropdown = document.createElement("div");
  dropdown.className = "select-dropdown-panel";
  dropdown.setAttribute("role", "listbox");
  dropdown.setAttribute("aria-multiselectable", String(multiple));
  dropdown.style.cssText =
    "position:absolute;left:0;right:0;top:100%;margin-top:4px;z-index:1050;" +
    `max-height:${maxDropdownHeight}px;overflow-y:auto;` +
    "background:#fff;border:1px solid #e5e7eb;border-radius:8px;" +
    "box-shadow:0 4px 12px rgba(0,0,0,0.1);display:none;" +
    "padding:4px 0;flex-direction:column;";

  // Search input
  let searchInput: HTMLInputElement | null = null;
  if (searchable) {
    const searchWrapper = document.createElement("div");
    searchWrapper.style.cssText = "padding:8px;border-bottom:1px solid #f3f4f6;";
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "select-search-input";
    searchInput.placeholder = searchPlaceholder;
    searchInput.autocomplete = "off";
    searchInput.style.cssText =
      "width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;" +
      `font-size:${ss.fontSize};outline:none;` +
      "transition:border-color 0.15s;box-sizing:border-box;";
    searchInput.addEventListener("focus", () => { searchInput!.style.borderColor = "#3b82f6"; });
    searchInput.addEventListener("blur", () => { searchInput!.style.borderColor = "#d1d5db"; });
    searchWrapper.appendChild(searchInput);
    dropdown.appendChild(searchWrapper);
  }

  // Options list container
  const optionsList = document.createElement("div");
  optionsList.className = "select-options-list";
  optionsList.style.cssText = "overflow-y:auto;flex:1;";
  dropdown.appendChild(optionsList);

  root.appendChild(dropdown);

  (container ?? document.body).appendChild(root);

  // --- Render ---

  function _renderOptions(): void {
    optionsList.innerHTML = "";

    const allOpts = _getAllOptions();
    const filtered = _searchQuery
      ? allOpts.filter((o) => filterFn ? filterFn(o, _searchQuery) : _defaultFilter(o, _searchQuery))
      : allOpts;

    if (loading) {
      const msg = document.createElement("div");
      msg.className = "select-loading-message";
      msg.style.cssText = `padding:12px;text-align:center;color:#9ca3af;font-size:${ss.fontSize};`;
      msg.textContent = loadingMessage;
      optionsList.appendChild(msg);
      return;
    }

    if (filtered.length === 0) {
      const msg = document.createElement("div");
      msg.className = "select-no-results";
      msg.style.cssText = `padding:12px;text-align:center;color:#9ca3af;font-size:${ss.fontSize};`;
      msg.textContent = noResultsMessage;
      optionsList.appendChild(msg);
      return;
    }

    // Group rendering
    const grouped = rawGroups && rawGroups.length > 0
      ? (() => {
          const map = new Map<string, SelectOption[]>();
          for (const opt of filtered) {
            const g = opt.group ?? "";
            if (!map.has(g)) map.set(g, []);
            map.get(g)!.push(opt);
          }
          return map;
        })()
      : null;

    if (grouped && grouped.size > 0) {
      grouped.forEach((opts, groupLabel) => {
        if (groupLabel) {
          const groupHeader = document.createElement("div");
          groupHeader.className = "select-group-header";
          groupHeader.style.cssText =
            `padding:6px 12px;font-size:11px;font-weight:600;color:#9ca3af;` +
            "text-transform:uppercase;letter-spacing:0.05em;";
          groupHeader.textContent = groupLabel;
          optionsList.appendChild(groupHeader);
        }
        opts.forEach((opt) => _renderOption(opt));
      });
    } else {
      filtered.forEach((opt) => _renderOption(opt));
    }
  }

  function _renderOption(option: SelectOption): void {
    const isSelected = _selectedValues.includes(option.value);
    const isDisabled = option.disabled ?? false;

    const item = document.createElement("div");
    item.className = `select-option${isSelected ? " selected" : ""}${isDisabled ? " disabled" : ""}`;
    item.dataset.value = option.value;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(isSelected));
    item.setAttribute("aria-disabled", String(isDisabled));
    item.style.cssText =
      `display:flex;align-items:center;gap:8px;padding:${size === "sm" ? "6px 10px" : size === "lg" ? "10px 14px" : "8px 12px"};` +
      `font-size:${ss.fontSize};cursor:${isDisabled ? "not-allowed" : "pointer"};` +
      `color:${isSelected ? "#111827" : "#374151"};` +
      (isDisabled ? "opacity:0.5;" : "") +
      "transition:background 0.1s;";

    // Checkbox for multi-select
    if (multiple) {
      const checkbox = document.createElement("span");
      checkbox.className = "select-option-checkbox";
      checkbox.style.cssText =
        `width:16px;height:16px;border:2px solid ${isSelected ? "#3b82f6" : "#d1d5db"};` +
        `border-radius:4px;display:flex;align-items:center;justify-content:center;` +
        "flex-shrink:0;transition:border-color 0.15s;background:" + (isSelected ? "#3b82f6" : "transparent");
      if (isSelected) {
        checkbox.innerHTML = "&#10003;";
        checkbox.style.color = "#fff";
        checkbox.style.fontSize = "11px";
        checkbox.style.fontWeight = "bold";
      }
      item.appendChild(checkbox);
    }

    // Prefix
    if (option.prefix) {
      const prefixEl = document.createElement("span");
      prefixEl.innerHTML = option.prefix;
      prefixEl.style.flexShrink = "0";
      item.appendChild(prefixEl);
    }

    // Label + description
    const labelArea = document.createElement("div");
    labelArea.style.cssText = "flex:1;min-width:0;";

    const labelSpan = document.createElement("span");
    labelSpan.className = "select-option-label";
    labelSpan.textContent = option.label;
    labelSpan.style.cssText = "display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    labelArea.appendChild(labelSpan);

    if (option.description) {
      const descSpan = document.createElement("span");
      descSpan.className = "select-option-desc";
      descSpan.textContent = option.description;
      descSpan.style.cssText = `display:block;font-size:11px;color:#9ca3af;margin-top:1px;`;
      labelArea.appendChild(descSpan);
    }

    item.appendChild(labelArea);

    // Suffix
    if (option.suffix) {
      const suffixEl = document.createElement("span");
      suffixEl.innerHTML = option.suffix;
      suffixEl.style.flexShrink = "0";
      item.appendChild(suffixEl);
    }

    // Checkmark indicator for single select
    if (!multiple && isSelected) {
      const check = document.createElement("span");
      check.innerHTML = "&#10003;";
      check.style.cssText = "color:#3b82f6;font-weight:bold;font-size:14px;flex-shrink:0;";
      item.appendChild(check);
    }

    // Hover effects
    if (!isDisabled) {
      item.addEventListener("mouseenter", () => { item.style.background = "#f3f4f6"; });
      item.addEventListener("mouseleave", () => { item.style.background = ""; });
      item.addEventListener("click", () => _handleSelect(option));
    }

    // Custom renderer
    renderOption?.(option, isSelected, item);

    optionsList.appendChild(item);
  }

  function _defaultFilter(option: SelectOption, query: string): boolean {
    const q = query.toLowerCase();
    return option.label.toLowerCase().includes(q) ||
           (option.description?.toLowerCase().includes(q) ?? false) ||
           option.value.toLowerCase().includes(q);
  }

  // --- Selection Logic ---

  function _handleSelect(option: SelectOption): void {
    if (option.disabled) return;

    if (multiple) {
      const idx = _selectedValues.indexOf(option.value);
      if (idx >= 0) {
        _selectedValues.splice(idx, 1);
      } else {
        _selectedValues.push(option.value);
      }
    } else {
      _selectedValues = [option.value];
      if (closeOnSelect) close();
    }

    _updateTrigger();
    _renderOptions();
    onChange?.(_selectedValues, getSelectedOptions());
  }

  function _updateTrigger(): void {
    if (_selectedValues.length === 0) {
      triggerContent.textContent = placeholder;
      triggerContent.style.color = "#9ca3af";
    } else if (multiple) {
      triggerContent.textContent = `${_selectedValues.length} selected`;
      triggerContent.style.color = "#374151";
    } else {
      const opt = _getAllOptions().find((o) => o.value === _selectedValues[0]);
      triggerContent.textContent = opt?.label ?? _selectedValues[0];
      triggerContent.style.color = "#374151";
    }
  }

  // --- Open/Close ---

  function open(): void {
    if (_open) return;
    _open = true;
    dropdown.style.display = "flex";
    chevron.style.transform = "rotate(180deg)";
    trigger.setAttribute("aria-expanded", "true");
    trigger.style.borderColor = "#3b82f6";
    trigger.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
    _renderOptions();
    if (searchable) {
      setTimeout(() => searchInput?.focus(), 50);
    }
    onOpenChange?.(true);
    _setupOutsideClick();
  }

  function close(): void {
    if (!_open) return;
    _open = false;
    dropdown.style.display = "none";
    chevron.style.transform = "";
    trigger.setAttribute("aria-expanded", "false");
    trigger.style.borderColor = "";
    trigger.style.boxShadow = "";
    _searchQuery = "";
    if (searchInput) searchInput.value = "";
    onOpenChange?.(false);
    _removeListeners();
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  // --- Event Setup ---

  function _setupOutsideClick(): void {
    const handler = (e: MouseEvent): void => {
      if (!root.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    cleanupFns.push(() => document.removeEventListener("mousedown", handler));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // Trigger events
  trigger.addEventListener("click", toggle);

  if (triggerMode === "focus") {
    trigger.addEventListener("focus", open);
  }

  // Search input events
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      _searchQuery = (e.target as HTMLInputElement).value;
      _renderOptions();
      onSearch?.(_searchQuery);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); trigger.focus(); }
      // Arrow down to first option
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const first = optionsList.querySelector(".select-option:not(.disabled)") as HTMLElement;
        first?.focus();
      }
    });
  }

  // Keyboard on trigger
  trigger.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
        e.preventDefault();
        if (!_open) open();
        break;
      case "Escape":
        if (_open) { e.preventDefault(); close(); }
        break;
    }
  );

  // Keyboard on options
  dropdown.addEventListener("keydown", (e) => {
    const items = Array.from(dropdown.querySelectorAll<HTMLElement>(".select-option:not(.disabled)"));
    const currentIdx = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        items[Math.min(currentIdx + 1, items.length - 1)]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        items[Math.max(currentIdx - 1, 0)]?.focus();
        break;
      case "Home":
        e.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (document.activeElement?.classList.contains("select-option")) {
          (document.activeElement as HTMLElement).click();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        trigger.focus();
        break;
    }
  });

  // Make options focusable
  dropdown.addEventListener("focusin", (e) => {
    const item = (e.target as HTMLElement).closest(".select-option") as HTMLElement;
    if (item && !item.classList.contains("disabled")) {
      item.style.background = "#f3f4f6";
    }
  });
  dropdown.addEventListener("focusout", (e) => {
    const item = (e.target as HTMLElement).closest(".select-option") as HTMLElement;
    if (item) item.style.background = "";
  });

  // --- Public API ---

  function getValues(): string[] { return [..._selectedValues]; }

  function getSelectedOptions(): SelectOption[] {
    return _getAllOptions().filter((o) => _selectedValues.includes(o.value));
  }

  function setValues(values: string[]): void {
    _selectedValues = [...values];
    _updateTrigger();
    _renderOptions();
  }

  function focus(): void { trigger.focus(); }

  function setOptions(newOptions: SelectOption[]): void {
    _options = newOptions;
    _selectedValues = _selectedValues.filter((v) => _options.some((o) => o.value === v));
    _updateTrigger();
    if (_open) _renderOptions();
  }

  function clear(): void {
    _selectedValues = [];
    _updateTrigger();
    _renderOptions();
    onChange?.([], []);
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  _updateTrigger();

  return { el: root, getValues, getSelectedOptions, setValues, open, close, toggle, isOpen, focus, setOptions, clear, destroy };
}
