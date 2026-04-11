/**
 * Combo Box: Editable select/input hybrid with autocomplete, filtering,
 * free-text entry, keyboard navigation, listbox rendering,
 * and accessibility (ARIA combobox pattern).
 */

// --- Types ---

export interface ComboBoxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
  icon?: string;
  data?: unknown;
}

export interface ComboBoxOptions {
  /** Input element or selector to attach to */
  input: HTMLInputElement | string;
  /** Options list */
  options: ComboBoxOption[] | ((query: string) => Promise<ComboBoxOption[]>);
  /** Allow entering custom text not in the options list */
  allowCustomValue?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Show search/filter inside dropdown */
  searchable?: boolean;
  /** Show descriptions for options */
  showDescriptions?: boolean;
  /** Group options by `group` field */
  groupBy?: boolean;
  /** Minimum characters to trigger dropdown */
  minLength?: number;
  /** Maximum visible items before scrolling */
  maxVisibleItems?: number;
  /** Dropdown max height (px) */
  dropdownMaxHeight?: number;
  /** Z-index of dropdown */
  zIndex?: number;
  /** No results message */
  noResultsText?: string;
  /** No matches message when custom values allowed */
  noMatchesText?: string;
  /** Custom filter function */
  filterFn?: (option: ComboBoxOption, query: string) => boolean;
  /** Callback on selection change */
  onChange?: (value: string, option: ComboBoxOption | null, isCustom: boolean) => void;
  /** Callback on input text change (while typing) */
  onInput?: (text: string) => void;
  /** Callback when dropdown opens */
  onOpen?: () => void;
  /** Callback when dropdown closes */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Disable the combo box */
  disabled?: boolean;
}

export interface ComboBoxInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  dropdown: HTMLDivElement;
  open: () => void;
  close: () => void;
  getValue: () => string;
  getSelectedOption: () => ComboBoxOption | null;
  setValue: (value: string) => void;
  clear: () => void;
  focus: () => void;
  destroy: () => void;
}

// --- Fuzzy Filter ---

function defaultFilter(option: ComboBoxOption, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q) ||
    (option.description ?? "").toLowerCase().includes(q)
  );
}

// --- Main Class ---

export class ComboBoxManager {
  create(options: ComboBoxOptions): ComboBoxInstance {
    const opts = {
      allowCustomValue: options.allowCustomValue ?? true,
      searchable: options.searchable ?? true,
      showDescriptions: options.showDescriptions ?? true,
      groupBy: options.groupBy ?? true,
      placeholder: options.placeholder ?? "Type to search...",
      minLength: options.minLength ?? 0,
      maxVisibleItems: options.maxVisibleItems ?? 8,
      dropdownMaxHeight: options.dropdownMaxHeight ?? 260,
      zIndex: options.zIndex ?? 10500,
      noResultsText: options.noResultsText ?? "No results found",
      noMatchesText: options.noMatchesText ?? 'Press Enter to add "{value}"',
      disabled: options.disabled ?? false,
      ...options,
    };

    // Resolve input
    const inputEl = typeof options.input === "string"
      ? document.querySelector<HTMLInputElement>(options.input)!
      : options.input;

    if (!inputEl) throw new Error("ComboBox: input element not found");

    inputEl.placeholder = opts.placeholder;
    if (opts.disabled) inputEl.disabled = true;

    // Set ARIA attributes
    inputEl.setAttribute("role", "combobox");
    inputEl.setAttribute("aria-autocomplete", "list");
    inputEl.setAttribute("aria-expanded", "false");
    inputEl.setAttribute("aria-haspopup", "listbox");

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `combo-box ${opts.className ?? ""}`;
    wrapper.style.cssText = "position:relative;display:inline-block;width:100%;";
    inputEl.parentNode?.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    // Create dropdown / listbox
    const dropdown = document.createElement("div");
    dropdown.className = "combobox-dropdown";
    dropdown.setAttribute("role", "listbox");
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

    // State
    let isOpen = false;
    let selectedIndex = -1;
    let currentValue = "";
    let currentOption: ComboBoxOption | null = null;
    let isCustomValue = false;
    let allOptions: ComboBoxOption[] = [];
    let filteredOptions: ComboBoxOption[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const isAsyncSource = typeof options.options === "function";

    // Resolve source
    async function loadOptions(query: string = ""): Promise<void> {
      if (isAsyncSource) {
        allOptions = await (options.options as (q: string) => Promise<ComboBoxOption[]>)(query);
        filteredOptions = allOptions;
      } else {
        allOptions = options.options as ComboBoxOption[];
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

    function renderDropdown(): void {
      // Clear existing options
      while (dropdown.firstChild) {
        dropdown.removeChild(dropdown.firstChild);
      }

      const hasQuery = inputEl.value.trim().length >= opts.minLength;

      if (!hasQuery && !isOpen) return;

      if (filteredOptions.length === 0) {
        if (opts.allowCustomValue && hasQuery) {
          // Show "add custom" option
          const customEl = createOptionElement(
            { value: inputEl.value.trim(), label: opts.noMatchesText.replace("{value}", inputEl.value.trim()) },
            -1,
            false
          );
          customEl.dataset.custom = "true";
          customEl.addEventListener("click", () => selectCustomValue());
          dropdown.appendChild(customEl);
        } else {
          const noResults = document.createElement("div");
          noResults.style.cssText = "padding:10px 14px;text-align:center;color:#9ca3af;font-size:13px;";
          noResults.textContent = opts.noResultsText;
          dropdown.appendChild(noResults);
        }
        dropdown.style.display = "flex";
        highlightSelected();
        return;
      }

      // Limit visible items
      const visibleOpts = filteredOptions.slice(0, opts.maxVisibleItems);

      // Group rendering
      const hasGroups = opts.groupBy && visibleOpts.some((o) => o.group);
      let currentGroup = "";

      for (let i = 0; i < visibleOpts.length; i++) {
        const opt = visibleOpts[i]!;

        // Group header
        if (hasGroups && opt.group !== currentGroup) {
          currentGroup = opt.group!;
          const header = document.createElement("div");
          header.style.cssText = "padding:4px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;";
          header.textContent = currentGroup;
          dropdown.appendChild(header);
        }

        const el = createOptionElement(opt, i, opt.value === currentValue);
        if (!opt.disabled) {
          el.addEventListener("click", () => selectOption(opt));
          el.addEventListener("mouseenter", () => {
            selectedIndex = i;
            highlightSelected();
          });
        }
        dropdown.appendChild(el);
      }

      // More items indicator
      if (filteredOptions.length > opts.maxVisibleItems) {
        const more = document.createElement("div");
        more.style.cssText = "padding:6px 14px;text-align:center;color:#9ca3af;font-size:11px;";
        more.textContent = `${filteredOptions.length - opts.maxVisibleItems} more...`;
        dropdown.appendChild(more);
      }

      dropdown.style.display = "flex";
      highlightSelected();
    }

    function createOptionElement(
      opt: ComboBoxOption,
      index: number,
      isSelected: boolean,
    ): HTMLDivElement {
      const el = document.createElement("div");
      el.setAttribute("role", "option");
      el.dataset.index = String(index);
      el.dataset.value = opt.value;
      el.setAttribute("aria-selected", String(isSelected));
      el.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;
        ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
        ${index === selectedIndex ? "background:#f0f4ff;" : ""}
        transition:background 0.1s;
      `;

      // Checkmark for selected
      if (isSelected) {
        const check = document.createElement("span");
        check.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="#4338ca" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        check.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
        el.appendChild(check);
      } else {
        // Spacer for alignment
        const spacer = document.createElement("span");
        spacer.style.cssText = "width:14px;flex-shrink:0;";
        el.appendChild(spacer);
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

    function selectOption(opt: ComboBoxOption): void {
      currentValue = opt.value;
      currentOption = opt;
      isCustomValue = false;
      inputEl.value = opt.label;
      closeDropdown();
      opts.onChange?.(currentValue, currentOption, false);
    }

    function selectCustomValue(): void {
      const val = inputEl.value.trim();
      if (!val) return;
      currentValue = val;
      currentOption = null;
      isCustomValue = true;
      closeDropdown();
      opts.onChange?.(currentValue, null, true);
    }

    function openDropdown(): void {
      if (isOpen || opts.disabled) return;
      isOpen = true;
      selectedIndex = -1;
      inputEl.setAttribute("aria-expanded", "true");

      const query = inputEl.value;
      loadOptions(query).then(() => renderDropdown());
      opts.onOpen?.();
    }

    function closeDropdown(): void {
      if (!isOpen) return;
      isOpen = false;
      dropdown.style.display = "none";
      selectedIndex = -1;
      inputEl.setAttribute("aria-expanded", "false");
      opts.onClose?.();
    }

    // --- Event Handlers ---

    inputEl.addEventListener("focus", () => {
      if (inputEl.value.length >= opts.minLength || opts.minLength === 0) {
        openDropdown();
      }
    });

    inputEl.addEventListener("input", () => {
      const val = inputEl.value;
      opts.onInput?.(val);

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterOptions(val);
        if (!isOpen && val.length >= opts.minLength) {
          openDropdown();
        } else if (isOpen) {
          renderDropdown();
        }
      }, 120);
    });

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
          const maxIdx = dropdown.querySelectorAll('[role="option"]').length - 1;
          selectedIndex = Math.min(selectedIndex + 1, maxIdx);
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
            const selected = dropdown.querySelectorAll('[role="option"]')[selectedIndex] as HTMLElement;
            if (selected?.dataset.custom === "true") {
              selectCustomValue();
            } else if (selected && filteredOptions[selectedIndex]) {
              selectOption(filteredOptions[selectedIndex]!);
            }
          } else if (opts.allowCustomValue && inputEl.value.trim()) {
            selectCustomValue();
          } else {
            closeDropdown();
          }
          break;

        case "Escape":
          e.preventDefault();
          closeDropdown();
          inputEl.focus();
          // Restore display value
          if (currentOption) {
            inputEl.value = currentOption.label;
          }
          break;

        case "Tab":
          // Select highlighted option on Tab
          if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
            selectOption(filteredOptions[selectedIndex]!);
          } else {
            closeDropdown();
          }
          break;

        case "Backspace":
          // If input is cleared, reset selection
          if (!inputEl.value && currentValue) {
            currentValue = "";
            currentOption = null;
            isCustomValue = false;
            opts.onChange?.("", null, false);
          }
          break;
      }
    });

    // Blur handling — delay to allow click on option to register
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

    // --- Instance ---

    const instance: ComboBoxInstance = {
      element: wrapper,
      inputEl,
      dropdown,

      open() { openDropdown(); },
      close() { closeDropdown(); },

      getValue() { return currentValue; },

      getSelectedOption() { return currentOption; },

      setValue(value: string) {
        currentValue = value;
        const opt = allOptions.find((o) => o.value === value);
        if (opt) {
          currentOption = opt;
          isCustomValue = false;
          inputEl.value = opt.label;
        } else {
          currentOption = null;
          isCustomValue = true;
          inputEl.value = value;
        }
      },

      clear() {
        currentValue = "";
        currentOption = null;
        isCustomValue = false;
        inputEl.value = "";
        opts.onChange?.("", null, false);
      },

      focus() { inputEl.focus(); },

      destroy() {
        destroyed = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        document.removeEventListener("mousedown", clickOutside);
        dropdown.remove();
        inputEl.removeAttribute("role");
        inputEl.removeAttribute("aria-autocomplete");
        inputEl.removeAttribute("aria-expanded");
        inputEl.removeAttribute("aria-haspopup");
      },
    };

    return instance;
  }
}

/** Convenience: create a combo box on an input element */
export function createComboBox(options: ComboBoxOptions): ComboBoxInstance {
  return new ComboBoxManager().create(options);
}
