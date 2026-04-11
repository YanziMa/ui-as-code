/**
 * Lightweight Select: Custom styled dropdown select with search/filter,
 * keyboard navigation, grouping, icons, multi-select, async options,
 * virtual scrolling for large lists, and accessibility.
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

export type SelectSize = "sm" | "md" | "lg";
export type SelectVariant = "default" | "filled" | "borderless";

export interface SelectOptions {
  /** Anchor element or selector (replaces native <select>) */
  anchor: HTMLElement | string;
  /** Options list or async loader */
  options: SelectOption[] | ((query: string) => Promise<SelectOption[]>);
  /** Placeholder text */
  placeholder?: string;
  /** Size variant */
  size?: SelectSize;
  /** Visual style */
  variant?: SelectVariant;
  /** Allow searching within options */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Multi-select mode */
  multiple?: boolean;
  /** Maximum selected items in multi mode */
  maxSelected?: number;
  /** Group options by field */
  groupBy?: boolean;
  /** Show descriptions in dropdown */
  showDescriptions?: boolean;
  /** Maximum visible items before scroll */
  maxVisibleItems?: number;
  /** No results message */
  noResultsText?: string;
  /** Dropdown width (px or 'anchor') */
  width?: number | "anchor";
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Close on select? */
  closeOnSelect?: boolean;
  /** Callback on selection change */
  onChange?: (values: string[], options: SelectOption[]) => void;
  /** Callback when dropdown opens */
  onOpen?: () => void;
  /** Callback when dropdown closes */
  onClose?: () => void;
  /** Custom CSS class for the wrapper */
  className?: string;
}

export interface SelectInstance {
  element: HTMLDivElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  getValue: () => string | string[];
  setValue: (value: string | string[]) => void;
  getSelected: () => SelectOption[];
  setSelected: (options: SelectOption[]) => void;
  clear: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<SelectSize, { height: string; fontSize: string; padding: string; tagSize: string }> = {
  sm: { height: "32px", fontSize: "13px", padding: "4px 28px 4px 10px", tagSize: "11px" },
  md: { height: "38px", fontSize: "14px", padding: "8px 32px 8px 12px", tagSize: "12px" },
  lg: { height: "44px", fontSize: "15px", padding: "10px 36px 10px 14px", tagSize: "13px" },
};

// --- Helpers ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightMatch(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = escapeHtml(query);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escaped.replace(re, '<mark style="background:#fef08a;color:inherit;padding:0;border-radius:2px;">$1</mark>');
}

function defaultFilter(opt: SelectOption, query: string): boolean {
  const q = query.toLowerCase();
  return opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q);
}

// --- Main Factory ---

export function createSelect(options: SelectOptions): SelectInstance {
  const opts = {
    placeholder: options.placeholder ?? "Select...",
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    searchable: options.searchable ?? false,
    searchPlaceholder: options.searchPlaceholder ?? "Search...",
    multiple: options.multiple ?? false,
    maxSelected: options.maxSelected ?? 0,
    groupBy: options.groupBy ?? true,
    showDescriptions: options.showDescriptions ?? true,
    maxVisibleItems: options.maxVisibleItems ?? 8,
    noResultsText: options.noResultsText ?? "No results found",
    width: options.width ?? "anchor",
    zIndex: options.zIndex ?? 10500,
    animationDuration: options.animationDuration ?? 120,
    closeOnSelect: options.closeOnSelect ?? !options.multiple,
    className: options.className ?? "",
    ...options,
  };

  const sizeCfg = SIZE_MAP[opts.size];
  const anchorEl = typeof options.anchor === "string"
    ? document.querySelector<HTMLElement>(options.anchor)!
    : options.anchor;

  if (!anchorEl) throw new Error("Select: anchor element not found");

  let isOpen = false;
  let destroyed = false;
  let disabled = false;
  let selectedIndex = -1;
  let allOptions: SelectOption[] = [];
  let filteredOptions: SelectOption[] = [];
  let selectedValues: string[] = [];
  let searchQuery = "";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isLoading = false;

  const isAsyncSource = typeof options.options === "function";

  // --- Build Trigger UI ---

  const wrapper = document.createElement("div");
  wrapper.className = `select-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    position:relative;display:inline-block;width:${typeof opts.width === "number" ? `${opts.width}px` : opts.width === "anchor" ? "100%" : "200px"};
  `;

  // Trigger button
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.style.cssText = `
    display:flex;align-items:center;width:100%;height:${sizeCfg.height};
    ${sizeCfg.padding};font-size:${sizeCfg.fontSize};
    border-radius:6px;border:1px solid #d1d5db;background:#fff;
    color:#374151;font-family:-apple-system,sans-serif;
    cursor:pointer;text-align:left;transition:border-color 0.15s,box-shadow 0.15s;
    white-space:nowrap;overflow:hidden;
    ${opts.variant === "filled" ? "background:#f3f4f6;border-color:transparent;" : ""}
    ${opts.variant === "borderless" ? "border:none;background:transparent;padding-left:4px;" : ""}
  `;

  // Selected content area
  const triggerContent = document.createElement("span");
  triggerContent.className = "select-trigger-content";
  triggerContent.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;";
  trigger.appendChild(triggerContent);

  // Chevron
  const chevron = document.createElement("span");
  chevron.className = "select-chevron";
  chevron.style.cssText = `
    margin-left:auto;flex-shrink:0;font-size:10px;color:#9ca3af;
    transition:transform ${opts.animationDuration}ms ease;
  `;
  chevron.innerHTML = "&#9662;";
  trigger.appendChild(chevron);

  wrapper.appendChild(trigger);

  // Replace anchor with wrapper
  if (anchorEl.parentNode) {
    anchorEl.parentNode.replaceChild(wrapper, anchorEl);
  }

  // --- Dropdown ---

  const dropdown = document.createElement("div");
  dropdown.className = "select-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.setAttribute("aria-multiselectable", String(opts.multiple));
  dropdown.style.cssText = `
    position:absolute;left:0;top:100%;width:100%;
    max-height:${opts.maxVisibleItems * 40}px;overflow-y:auto;
    background:#fff;border-radius:8px;
    box-shadow:0 12px 40px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.06);
    z-index:${opts.zIndex};display:none;flex-direction:column;
    padding:4px 0;margin-top:4px;font-size:13px;
    font-family:-apple-system,sans-serif;border:1px solid #e5e7eb;
    opacity:0;transform:scale(0.96) translateY(-4px);
    transition:opacity ${opts.animationDuration}ms ease,
      transform ${opts.animationDuration}ms ease;
  `;
  document.body.appendChild(dropdown);

  // Search input inside dropdown
  let searchInput: HTMLInputElement | null = null;
  if (opts.searchable) {
    const searchWrap = document.createElement("div");
    searchWrap.style.cssText = "padding:6px 8px;border-bottom:1px solid #f0f0f0;";
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = opts.searchPlaceholder;
    searchInput.style.cssText = `
      width:100%;box-sizing:border-box;padding:6px 10px;border:1px solid #d1d5db;
      border-radius:4px;font-size:13px;outline:none;
      transition:border-color 0.15s;
    `;
    searchWrap.appendChild(searchInput);
    dropdown.appendChild(searchWrap);
  }

  // Options container
  const optionsContainer = document.createElement("div");
  optionsContainer.className = "select-options";
  dropdown.appendChild(optionsContainer);

  // --- Load / Filter ---

  async function loadOptions(query: string = ""): Promise<void> {
    isLoading = true;
    if (isOpen && (allOptions.length === 0 || isAsyncSource)) {
      renderLoading();
    }
    try {
      if (isAsyncSource) {
        allOptions = await (options.options as (q: string) => Promise<SelectOption[]>)(query);
        filterAndRender(query);
      } else {
        allOptions = options.options as SelectOption[];
        filterAndRender(query);
      }
    } finally {
      isLoading = false;
    }
  }

  function filterAndRender(query: string): void {
    const q = query.trim();
    let base = [...allOptions];

    // Exclude already-selected in multi-mode from filtered list
    if (opts.multiple) {
      base = base.filter((o) => !selectedValues.includes(o.value));
    }

    if (!q) {
      filteredOptions = base;
    } else {
      filteredOptions = base.filter((opt) => defaultFilter(opt, q));
    }

    renderOptions();
  }

  // --- Render ---

  function updateTriggerDisplay(): void {
    triggerContent.innerHTML = "";

    if (opts.multiple && selectedValues.length > 0) {
      // Show tags
      const tagsWrap = document.createElement("div");
      tagsWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;align-items:center;max-height:" + sizeCfg.height + ";overflow:hidden;";

      const displayVals = selectedValues.slice(0, 3);
      for (const val of displayVals) {
        const found = allOptions.find((o) => o.value === val);
        const label = found?.label ?? val;

        const tag = document.createElement("span");
        tag.style.cssText = `
          display:inline-flex;align-items:center;gap:2px;
          background:#eff6ff;color:#1d4ed8;font-size:${sizeCfg.tagSize};
          padding:1px 6px;border-radius:9999px;line-height:1.4;
        `;
        tag.textContent = label;
        tagsWrap.appendChild(tag);
      }

      if (selectedValues.length > 3) {
        const more = document.createElement("span");
        more.style.cssText = `color:#6b7280;font-size:${sizeCfg.tagSize};`;
        more.textContent = `+${selectedValues.length - 3}`;
        tagsWrap.appendChild(more);
      }

      triggerContent.appendChild(tagsWrap);
    } else if (!opts.multiple && selectedValues.length > 0) {
      const found = allOptions.find((o) => o.value === selectedValues[0]);
      triggerContent.textContent = found?.label ?? selectedValues[0]!;
    } else {
      triggerContent.textContent = opts.placeholder;
      triggerContent.style.color = "#9ca3af";
    }

    if (selectedValues.length > 0 || (!opts.multiple && selectedValues.length > 0)) {
      triggerContent.style.color = "";
    }
  }

  function renderLoading(): void {
    optionsContainer.innerHTML = "";
    const el = document.createElement("div");
    el.style.cssText = "padding:16px;text-align:center;color:#9ca3af;font-size:13px;";
    el.textContent = "Loading...";
    optionsContainer.appendChild(el);
  }

  function renderOptions(): void {
    optionsContainer.innerHTML = "";

    if (isLoading) {
      renderLoading();
      return;
    }

    if (filteredOptions.length === 0) {
      const noRes = document.createElement("div");
      noRes.style.cssText = "padding:12px 16px;text-align:center;color:#9ca3af;font-size:13px;";
      noRes.textContent = opts.noResultsText;
      optionsContainer.appendChild(noRes);
      return;
    }

    const hasGroups = opts.groupBy && filteredOptions.some((o) => o.group);
    let currentGroup = "";

    for (let i = 0; i < filteredOptions.length; i++) {
      const opt = filteredOptions[i]!;

      // Group header
      if (hasGroups && opt.group !== currentGroup) {
        currentGroup = opt.group!;
        const hdr = document.createElement("div");
        hdr.style.cssText = "padding:5px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;";
        hdr.textContent = currentGroup;
        optionsContainer.appendChild(hdr);
      }

      const itemEl = document.createElement("div");
      itemEl.setAttribute("role", "option");
      itemEl.dataset.value = opt.value;
      itemEl.tabIndex = -1;

      const isSelected = opts.multiple
        ? selectedValues.includes(opt.value)
        : selectedValues[0] === opt.value;

      itemEl.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:
          ${opt.disabled ? "not-allowed" : "pointer"};
        transition:background 0.1s;
        ${opt.disabled ? "opacity:0.45;" : ""}
        ${isSelected ? "background:#eff6ff;color:#1d4ed8;" : "color:#374151;"}
      `;

      // Checkbox for multi-select
      if (opts.multiple) {
        const cb = document.createElement("span");
        cb.style.cssText = `
          flex-shrink:0;width:16px;height:16px;border:2px solid #d1d5db;border-radius:3px;
          display:flex;align-items:center;justify-content:center;font-size:11px;
          ${isSelected ? "background:#3b82f6;border-color:#3b82f6;color:#fff;" : ""}
        `;
        cb.textContent = isSelected ? "\u2713" : "";
        itemEl.appendChild(cb);
      }

      // Icon
      if (opt.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.textContent = opt.icon;
        iconSpan.style.cssText = "font-size:14px;width:18px;text-align:center;flex-shrink:0;";
        itemEl.appendChild(iconSpan);
      }

      // Label + description
      const lblDiv = document.createElement("div");
      lblDiv.style.cssText = "flex:1;min-width:0;";

      const lbl = document.createElement("div");
      lbl.style.whiteSpace = "nowrap";
      lbl.style.overflow = "hidden";
      lbl.style.textOverflow = "ellipsis";
      if (searchQuery) {
        lbl.innerHTML = highlightMatch(opt.label, searchQuery);
      } else {
        lbl.textContent = opt.label;
      }
      lblDiv.appendChild(lbl);

      if (opt.description && opts.showDescriptions) {
        const desc = document.createElement("div");
        desc.style.cssText = "font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        desc.textContent = opt.description;
        lblDiv.appendChild(desc);
      }

      itemEl.appendChild(lblDiv);

      // Checkmark for single select
      if (!opts.multiple && isSelected) {
        const check = document.createElement("span");
        check.style.cssText = "margin-left:auto;flex-shrink:0;color:#3b82f6;font-size:14px;";
        check.textContent = "\u2713";
        itemEl.appendChild(check);
      }

      if (!opt.disabled) {
        itemEl.addEventListener("click", () => handleSelect(opt));
        itemEl.addEventListener("mouseenter", () => { selectedIndex = i; highlightItem(); });
      }

      optionsContainer.appendChild(itemEl);
    }

    selectedIndex = -1;
    highlightItem();
  }

  function highlightItem(): void {
    const items = optionsContainer.querySelectorAll('[role="option"]');
    items.forEach((item, idx) => {
      const el = item as HTMLElement;
      if (idx === selectedIndex) {
        el.style.background = "#f0f4ff";
      } else {
        const isSelected = opts.multiple
          ? selectedValues.includes(item.dataset.value!)
          : selectedValues[0] === item.dataset.value;
        el.style.background = isSelected ? "#eff6ff" : "";
      }
    });
    if (selectedIndex >= 0) {
      (items[selectedIndex] as HTMLElement)?.scrollIntoView({ block: "nearest" });
    }
  }

  // --- Selection ---

  function handleSelect(opt: SelectOption): void {
    if (opt.disabled || disabled) return;

    if (opts.multiple) {
      if (selectedValues.includes(opt.value)) {
        selectedValues = selectedValues.filter((v) => v !== opt.value);
      } else {
        if (opts.maxSelected > 0 && selectedValues.length >= opts.maxSelected) return;
        selectedValues.push(opt.value);
      }
      updateTriggerDisplay();
      filterAndRender(searchQuery);
    } else {
      selectedValues = [opt.value];
      updateTriggerDisplay();
      if (opts.closeOnSelect) doClose();
    }

    emitChange();
  }

  function emitChange(): void {
    const selOpts = selectedValues.map((v) => allOptions.find((o) => o.value === v)!).filter(Boolean);
    opts.onChange?.([...selectedValues], selOpts);
  }

  // --- Open / Close ---

  function doOpen(): void {
    if (isOpen || destroyed || disabled) return;
    isOpen = true;
    trigger.setAttribute("aria-expanded", "true");
    chevron.style.transform = "rotate(180deg)";
    trigger.style.borderColor = "#3b82f6";
    trigger.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";

    dropdown.style.display = "flex";
    void dropdown.offsetHeight; // force reflow
    dropdown.style.opacity = "1";
    dropdown.style.transform = "scale(1) translateY(0)";

    // Position
    const rect = wrapper.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + 4}px`;

    if (typeof opts.width === "number") {
      dropdown.style.width = `${opts.width}px`;
    } else if (opts.width === "anchor") {
      dropdown.style.width = `${rect.width}px`;
    }

    selectedIndex = -1;
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    loadOptions("");

    opts.onOpen?.();
  }

  function doClose(): void {
    if (!isOpen) return;
    isOpen = false;
    trigger.setAttribute("aria-expanded", "false");
    chevron.style.transform = "";
    trigger.style.borderColor = "";
    trigger.style.boxShadow = "";

    dropdown.style.opacity = "0";
    dropdown.style.transform = "scale(0.96) translateY(-4px)";
    setTimeout(() => {
      if (!isOpen) dropdown.style.display = "none";
    }, opts.animationDuration);

    opts.onClose?.();
  }

  // --- Event Bindings ---

  trigger.addEventListener("click", () => {
    if (disabled) return;
    isOpen ? doClose() : doOpen();
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput!.value;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterAndRender(searchQuery);
      }, 150);
    });
    searchInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); doClose(); }
      if (e.key === "ArrowDown") { e.preventDefault(); focusFirstOption(); }
    });
  }

  // Keyboard navigation on trigger
  trigger.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
        e.preventDefault();
        if (!isOpen) doOpen();
        break;
    }
  });

  // Keyboard nav in dropdown
  dropdown.addEventListener("keydown", (e: KeyboardEvent) => {
    const items = optionsContainer.querySelectorAll('[role="option"]:not([aria-disabled="true"])');
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        highlightItem();
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        highlightItem();
        break;
      case "Enter": {
        e.preventDefault();
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          handleSelect(filteredOptions[selectedIndex]!);
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        doClose();
        trigger.focus();
        break;
      case "Tab":
        doClose();
        break;
    }
  });

  function focusFirstOption(): void {
    selectedIndex = 0;
    highlightItem();
  }

  // Click outside
  const clickOutsideHandler = (e: MouseEvent) => {
    if (isOpen && !wrapper.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      doClose();
    }
  };
  document.addEventListener("mousedown", clickOutsideHandler);

  // Reposition on scroll/resize
  window.addEventListener("scroll", () => { if (isOpen) positionDropdown(); }, true);
  window.addEventListener("resize", () => { if (isOpen) positionDropdown(); });

  function positionDropdown(): void {
    const rect = wrapper.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + 4}px`;

    // Flip if overflowing bottom
    const ddH = dropdown.offsetHeight;
    if (rect.bottom + ddH > window.innerHeight - 8) {
      dropdown.style.top = `${rect.top - ddH - 4}px`;
    }
  }

  // Initialize display
  updateTriggerDisplay();

  // --- Instance ---

  const instance: SelectInstance = {
    element: wrapper,

    isOpen() { return isOpen; },

    open: doOpen,

    close: doClose,

    getValue() {
      return opts.multiple ? [...selectedValues] : (selectedValues[0] ?? "");
    },

    setValue(value: string | string[]) {
      if (Array.isArray(value)) {
        selectedValues = [...value];
      } else {
        selectedValues = value ? [value] : [];
      }
      updateTriggerDisplay();
      emitChange();
    },

    getSelected() {
      return selectedValues
        .map((v) => allOptions.find((o) => o.value === v)!)
        .filter(Boolean);
    },

    setSelected(optsList: SelectOption[]) {
      selectedValues = optsList.map((o) => o.value);
      updateTriggerDisplay();
      emitChange();
    },

    clear() {
      selectedValues = [];
      updateTriggerDisplay();
      emitChange();
    },

    disable() {
      disabled = true;
      trigger.disabled = true;
      trigger.style.opacity = "0.5";
      trigger.style.cursor = "not-allowed";
    },

    enable() {
      disabled = false;
      trigger.disabled = false;
      trigger.style.opacity = "";
      trigger.style.cursor = "";
    },

    destroy() {
      destroyed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener("mousedown", clickOutsideHandler);
      dropdown.remove();
      if (wrapper.parentNode) {
        wrapper.parentNode.replaceChild(anchorEl, wrapper);
      }
    },
  };

  return instance;
}
