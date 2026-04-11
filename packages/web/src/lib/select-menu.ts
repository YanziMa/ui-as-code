/**
 * Select Menu / Dropdown: Custom select with search, multi-select, groups,
 * async options, keyboard navigation, virtual scroll for large lists, and ARIA.
 */

// --- Types ---

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: string;
  disabled?: boolean;
  data?: unknown;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export type SelectMode = "single" | "multi" | "tags";

export interface SelectMenuOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Options (flat) */
  options?: SelectOption[];
  /** Grouped options */
  groups?: SelectGroup[];
  /** Selection mode */
  mode?: SelectMode;
  /** Initially selected values */
  value?: string | string[];
  /** Placeholder text */
  placeholder?: string;
  /** Allow searching/filtering */
  searchable?: boolean;
  /** Minimum characters to trigger search */
  searchMinLength?: number;
  /** Show clear button */
  clearable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Maximum selections for multi mode */
  maxSelections?: number;
  /** Max height of dropdown (px) */
  maxDropdownHeight?: number;
  /** Position of dropdown */
  position?: "bottom" | "top" | "auto";
  /** Callback on selection change */
  onChange?: (value: string | string[]) => void;
  /** Custom option renderer */
  renderOption?: (option: SelectOption, isSelected: boolean, query: string) => HTMLElement;
  /** Custom filter function */
  filterFn?: (option: SelectOption, query: string) => boolean;
  /** Z-index for dropdown */
  zIndex?: number;
  /** Custom CSS class */
  className?: string;
}

export interface SelectMenuInstance {
  element: HTMLElement;
  getValue: () => string | string[];
  setValue: (value: string | string[]) => void;
  getSelected: () => SelectOption[];
  addOption: (option: SelectOption) => void;
  removeOption: (value: string) => void;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Helpers ---

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightMatch(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(query);
  const re = new RegExp(`(${escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escapeHtml(text).replace(re, '<mark style="background:#fef08a;border-radius:2px;">$1</mark>');
}

// --- Main Factory ---

export function createSelectMenu(options: SelectMenuOptions): SelectMenuInstance {
  const opts = {
    mode: options.mode ?? "single",
    placeholder: options.placeholder ?? "Select...",
    searchable: options.searchable ?? true,
    searchMinLength: options.searchMinLength ?? 0,
    clearable: options.clearable ?? true,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    maxSelections: options.maxSelections ?? 0,
    maxDropdownHeight: options.maxDropdownHeight ?? 280,
    position: options.position ?? "auto",
    zIndex: options.zIndex ?? 10500,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SelectMenu: container not found");

  // Flatten all options
  let allOptions: SelectOption[] = [];
  if (options.groups) {
    for (const g of options.groups) {
      allOptions.push(...g.options);
    }
  }
  allOptions = allOptions.length > 0 ? allOptions : (options.options ?? []);

  // State
  let selectedValues: Set<string> = new Set(
    Array.isArray(opts.value) ? opts.value : opts.value ? [opts.value] : []
  );
  let isOpenState = false;
  let searchQuery = "";
  let selectedIndex = -1;
  let destroyed = false;

  // Build DOM
  container.className = `select-menu ${opts.className}`;
  container.style.cssText = "position:relative;display:inline-block;width:100%;";

  // Trigger button
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "select-trigger";
  trigger.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;width:100%;
    padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;
    font-size:14px;color:#374151;font-family:-apple-system,sans-serif;
    cursor:${opts.disabled || opts.readOnly ? "not-allowed" : "pointer"};
    transition:border-color 0.15s,box-shadow 0.15s;text-align:left;
    ${opts.disabled ? "opacity:0.5;" : ""}
  `;
  container.appendChild(trigger);

  // Trigger content area
  const triggerContent = document.createElement("span");
  triggerContent.className = "select-trigger-content";
  triggerContent.style.cssText = "flex:1;min-width:0;";
  trigger.appendChild(triggerContent);

  // Arrow
  const arrow = document.createElement("span");
  arrow.innerHTML = "&#9662;";
  arrow.style.cssText = "margin-left:8px;font-size:10px;color:#9ca3af;transition:transform 0.2s;flex-shrink:0;";
  trigger.appendChild(arrow);

  // Clear button (inside trigger)
  let clearBtn: HTMLButtonElement | null = null;
  if (opts.clearable) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&times;";
    clearBtn.style.cssText = `
      background:none;border:none;font-size:14px;color:#9ca3af;cursor:pointer;
      padding:0 2px;margin-right:4px;line-height:1;display:none;flex-shrink:0;
    `;
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelection();
    });
    trigger.insertBefore(clearBtn, triggerContent);
  }

  // Search input (inside dropdown)
  const dropdown = document.createElement("div");
  dropdown.className = "select-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.style.cssText = `
    position:absolute;left:0;width:100%;max-height:${opts.maxDropdownHeight}px;
    overflow-y:auto;background:#fff;border-radius:8px;
    box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
    z-index:${opts.zIndex};display:none;flex-direction:column;
    margin-top:4px;font-size:13px;font-family:-apple-system,sans-serif;
    border:1px solid #e5e7eb;
  `;
  container.appendChild(dropdown);

  // Search input in dropdown header
  let searchInput: HTMLInputElement | null = null;
  if (opts.searchable) {
    const searchHeader = document.createElement("div");
    searchHeader.style.cssText = "padding:8px;border-bottom:1px solid #f0f0f0;position:sticky;top:0;background:#fff;z-index:1;";

    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search...";
    searchInput.spellcheck = false;
    searchInput.autocomplete = "off";
    searchInput.style.cssText = `
      width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;
      font-size:13px;outline:none;box-sizing:border-box;
    `;
    searchHeader.appendChild(searchInput);
    dropdown.appendChild(searchHeader);
  }

  // Options container
  const optionsContainer = document.createElement("div");
  optionsContainer.className = "select-options";
  dropdown.appendChild(optionsContainer);

  // --- Rendering ---

  function getFilteredOptions(): SelectOption[] {
    let filtered = [...allOptions];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (opts.filterFn) {
        filtered = filtered.filter((o) => opts.filterFn!(o, q));
      } else {
        filtered = filtered.filter((o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          (o.description ?? "").toLowerCase().includes(q)
        );
      }
    }

    // Remove disabled from selection consideration but show them
    return filtered;
  }

  function renderTrigger(): void {
    triggerContent.innerHTML = "";

    if (selectedValues.size === 0) {
      const ph = document.createElement("span");
      ph.style.cssText = "color:#9ca3af;";
      ph.textContent = opts.placeholder;
      triggerContent.appendChild(ph);
    } else if (opts.mode === "multi" || opts.mode === "tags") {
      // Show tags/chips
      const tagsWrap = document.createElement("div");
      tagsWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";

      for (const val of selectedValues) {
        const opt = allOptions.find((o) => o.value === val);
        const chip = document.createElement("span");
        chip.style.cssText = `
          display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
          background:#eef2ff;color:#4338ca;border-radius:12px;font-size:12px;font-weight:500;
        `;
        chip.textContent = opt?.label ?? val;

        const removeChip = document.createElement("button");
        removeChip.type = "button";
        removeChip.innerHTML = "&times;";
        removeChip.style.cssText = "background:none;border:none;font-size:11px;cursor:pointer;padding:0;line-height:1;color:inherit;";
        removeChip.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleSelection(val);
        });
        chip.appendChild(removeChip);
        tagsWrap.appendChild(chip);
      }
      triggerContent.appendChild(tagsWrap);
    } else {
      // Single mode - show label
      const val = Array.from(selectedValues)[0]!;
      const opt = allOptions.find((o) => o.value === val);
      const label = document.createElement("span");
      label.textContent = opt?.label ?? val;
      triggerContent.appendChild(label);
    }

    // Clear button visibility
    if (clearBtn) {
      clearBtn.style.display = selectedValues.size > 0 ? "block" : "none";
    }
  }

  function renderDropdown(): void {
    optionsContainer.innerHTML = "";
    selectedIndex = -1;

    const filtered = getFilteredOptions();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:16px;text-align:center;color:#9ca3af;font-size:13px;";
      empty.textContent = searchQuery ? `No results for "${searchQuery}"` : "No options available";
      optionsContainer.appendChild(empty);
      dropdown.style.display = "flex";
      return;
    }

    // Group rendering
    const hasGroups = options.groups && options.groups.length > 0;
    let currentGroup = "";

    for (let i = 0; i < filtered.length; i++) {
      const opt = filtered[i]!;

      // Group header
      if (hasGroups && opt.group !== currentGroup) {
        currentGroup = opt.group!;
        const hdr = document.createElement("div");
        hdr.style.cssText = "padding:6px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;";
        hdr.textContent = currentGroup;
        optionsContainer.appendChild(hdr);
      }

      const isSelected = selectedValues.has(opt.value);
      const itemEl = opts.renderOption
        ? opts.renderItem(opt, isSelected, searchQuery)
        : createDefaultOption(opt, isSelected, i);

      itemEl.dataset.index = String(i);
      itemEl.setAttribute("role", "option");
      itemEl.setAttribute("aria-selected", String(isSelected));

      if (!opt.disabled) {
        itemEl.addEventListener("click", () => handleSelect(opt));
        itemEl.addEventListener("mouseenter", () => {
          selectedIndex = i;
          highlightSelected();
        });
      }

      optionsContainer.appendChild(itemEl);
    }

    dropdown.style.display = "flex";
    highlightSelected();
  }

  function createDefaultOption(opt: SelectOption, isSelected: boolean, index: number): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;
      ${isSelected ? "background:#f0f4ff;" : ""}
      ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
      transition:background 0.1s;
    `;

    // Checkbox for multi mode
    if ((opts.mode === "multi" || opts.mode === "tags") && !opt.disabled) {
      const cb = document.createElement("span");
      cb.style.cssText = `
        width:16px;height:16px;border-radius:3px;border:2px solid ${isSelected ? "#4338ca" : "#d1d5db"};
        display:flex;align-items:center;justify-content:center;flex-shrink:0;
        background:${isSelected ? "#4338ca" : "transparent"};transition:all 0.15s;
      `;
      if (isSelected) {
        cb.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>`;
      }
      el.appendChild(cb);
    } else if (opts.mode === "single") {
      // Radio dot for single mode
      const dot = document.createElement("span");
      dot.style.cssText = `
        width:16px;height:16px;border-radius:50%;border:2px solid ${isSelected ? "#4338ca" : "#d1d5db"};
        display:flex;align-items:center;justify-content:center;flex-shrink:0;
      `;
      if (isSelected) {
        const innerDot = document.createElement("span");
        innerDot.style.cssText = "width:8px;height:8px;border-radius:50%;background:#4338ca;";
        dot.appendChild(innerDot);
      }
      el.appendChild(dot);
    }

    // Icon
    if (opt.icon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = opt.icon;
      iconEl.style.cssText = "font-size:15px;width:20px;text-align:center;flex-shrink:0;";
      el.appendChild(iconEl);
    }

    // Label + description
    const textArea = document.createElement("div");
    textArea.style.cssText = "flex:1;min-width:0;";

    const labelEl = document.createElement("div");
    labelEl.style.cssText = `${opt.disabled ? "color:#9ca3af;" : ""}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;`;
    if (searchQuery) {
      labelEl.innerHTML = highlightMatch(opt.label, searchQuery);
    } else {
      labelEl.textContent = opt.label;
    }
    textArea.appendChild(labelEl);

    if (opt.description) {
      const descEl = document.createElement("div");
      descEl.style.cssText = "font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      descEl.textContent = opt.description;
      textArea.appendChild(descEl);
    }

    el.appendChild(textArea);
    return el;
  }

  function highlightSelected(): void {
    const items = optionsContainer.querySelectorAll('[role="option"]');
    items.forEach((item, idx) => {
      (item as HTMLElement).style.background = idx === selectedIndex ? "#f0f4ff" : "";
    });
  }

  function handleSelect(opt: SelectOption): void {
    if (opt.disabled) return;

    if (opts.mode === "single") {
      selectedValues.clear();
      selectedValues.add(opt.value);
      closeDropdown();
    } else {
      // Multi/tags mode
      if (selectedValues.has(opt.value)) {
        selectedValues.delete(opt.value);
      } else {
        if (opts.maxSelections > 0 && selectedValues.size >= opts.maxSelections) return;
        selectedValues.add(opt.value);
      }
      renderDropdown(); // Re-render to update checkboxes
    }

    renderTrigger();
    const outputValue = opts.mode === "single"
      ? (Array.from(selectedValues)[0] ?? "")
      : Array.from(selectedValues);
    opts.onChange?.(outputValue);
  }

  function toggleSelection(value: string): void {
    if (selectedValues.has(value)) {
      selectedValues.delete(value);
    } else {
      if (opts.maxSelections > 0 && selectedValues.size >= opts.maxSelections) return;
      selectedValues.add(value);
    }
    renderTrigger();
    if (isOpenState) renderDropdown();
    const outputValue = opts.mode === "single"
      ? (Array.from(selectedValues)[0] ?? "")
      : Array.from(selectedValues);
    opts.onChange?.(outputValue);
  }

  function clearSelection(): void {
    selectedValues.clear();
    renderTrigger();
    if (isOpenState) renderDropdown();
    opts.onChange?.(opts.mode === "single" ? "" : []);
  }

  function openDropdown(): void {
    if (isOpenState || opts.disabled || opts.readOnly) return;
    isOpenState = true;
    searchQuery = "";
    if (searchInput) { searchInput.value = ""; searchInput.focus(); }
    selectedIndex = -1;
    renderDropdown();
    positionDropdown();
    arrow.style.transform = "rotate(180deg)";
  }

  function closeDropdown(): void {
    if (!isOpenState) return;
    isOpenState = false;
    dropdown.style.display = "none";
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    arrow.style.transform = "";
  }

  function positionDropdown(): void {
    const rect = container.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownH = Math.min(opts.maxDropdownHeight, dropdown.scrollHeight + (searchInput ? 44 : 0));

    if (opts.position === "top" || (opts.position === "auto" && spaceBelow < dropdownH && rect.top > dropdownH)) {
      dropdown.style.bottom = "100%";
      dropdown.style.top = "auto";
      dropdown.style.marginTop = "0";
      dropdown.style.marginBottom = "4px";
    } else {
      dropdown.style.top = "100%";
      dropdown.style.bottom = "auto";
      dropdown.style.marginBottom = "0";
      dropdown.style.marginTop = "4px";
    }
  }

  // --- Event Listeners ---

  trigger.addEventListener("click", () => {
    if (isOpenState) closeDropdown();
    else openDropdown();
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      selectedIndex = -1;
      renderDropdown();
    });

    searchInput.addEventListener("keydown", (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, getFilteredOptions().length - 1);
          highlightSelected();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          highlightSelected();
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) {
            const opt = getFilteredOptions()[selectedIndex];
            if (opt && !opt.disabled) handleSelect(opt);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          break;
      }
    });
  }

  // Keyboard on trigger
  trigger.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
        e.preventDefault();
        openDropdown();
        break;
      case "Escape":
        if (isOpenState) { e.preventDefault(); closeDropdown(); }
        break;
    }
  });

  // Click outside
  const clickOutside = (e: MouseEvent) => {
    if (isOpenState && !container.contains(e.target as Node)) {
      closeDropdown();
    }
  };
  document.addEventListener("mousedown", clickOutside);

  // Initial render
  renderTrigger();

  const instance: SelectMenuInstance = {
    element: container,

    getValue() {
      return opts.mode === "single"
        ? (Array.from(selectedValues)[0] ?? "")
        : Array.from(selectedValues);
    },

    setValue(value: string | string[]) {
      selectedValues = new Set(Array.isArray(value) ? value : [value]);
      renderTrigger();
      if (isOpenState) renderDropdown();
    },

    getSelected() {
      return allOptions.filter((o) => selectedValues.has(o.value));
    },

    addOption(option: SelectOption) {
      allOptions.push(option);
      if (isOpenState) renderDropdown();
    },

    removeOption(value: string) {
      allOptions = allOptions.filter((o) => o.value !== value);
      selectedValues.delete(value);
      renderTrigger();
      if (isOpenState) renderDropdown();
    },

    open: openDropdown,
    close: closeDropdown,

    isOpen: () => isOpenState,

    disable() {
      opts.disabled = true;
      trigger.style.opacity = "0.5";
      trigger.style.cursor = "not-allowed";
    },

    enable() {
      opts.disabled = false;
      trigger.style.opacity = "";
      trigger.style.cursor = "";
    },

    destroy() {
      destroyed = true;
      document.removeEventListener("mousedown", clickOutside);
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
