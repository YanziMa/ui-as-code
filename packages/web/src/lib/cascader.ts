/**
 * Cascader: Multi-level cascading selector (e.g., Province → City → District),
 * with async loading, search/filter, keyboard navigation, custom rendering,
 * multiple selection mode, and accessibility.
 */

// --- Types ---

export interface CascaderOption {
  value: string;
  label: string;
  disabled?: boolean;
  children?: CascaderOption[];
  isLeaf?: boolean;
  data?: unknown;
}

export interface CascaderColumn {
  options: CascaderOption[];
  selectedValue: string | null;
  loading?: boolean;
}

export interface CascaderOptions {
  /** Trigger element or selector (input or container) */
  trigger: HTMLElement | string | HTMLInputElement;
  /** Options data or async loader per level */
  options: CascaderOption[] | ((params: { level: number; parentValue?: string }) => Promise<CascaderOption[]>);
  /** Placeholder text */
  placeholder?: string;
  /** Allow multiple leaf selections */
  multiple?: boolean;
  /** Show search input */
  searchable?: boolean;
  /** Number of levels (for static data validation) */
  maxLevel?: number;
  /** Show "select all" at leaf level */
  selectAll?: boolean;
  /** Change path separator display */
  separator?: string;
  /** Custom render for option */
  renderOption?: (option: CascaderOption, level: number) => HTMLElement;
  /** Callback on selection change */
  onChange?: (values: string[], paths: CascaderOption[][]) => void;
  /** Async loader for children */
  loadChildren?: (parent: CascaderOption) => Promise<CascaderOption[]>;
  /** Dropdown z-index */
  zIndex?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface CascaderInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement | null;
  open: () => void;
  close: () => void;
  getValues: () => string[];
  getPaths: () => CascaderOption[][];
  setValues: (values: string[]) => void;
  clear: () => void;
  destroy: () => void;
}

// --- Helpers ---

function findOptionByValue(
  options: CascaderOption[],
  value: string,
): CascaderOption | null {
  for (const opt of options) {
    if (opt.value === value) return opt;
    if (opt.children) {
      const found = findOptionByValue(opt.children, value);
      if (found) return found;
    }
  }
  return null;
}

function findPathToValue(
  options: CascaderOption[],
  value: string,
): CascaderOption[] | null {
  for (const opt of options) {
    if (opt.value === value) return [opt];
    if (opt.children) {
      const subPath = findPathToValue(opt.children, value);
      if (subPath) return [opt, ...subPath];
    }
  }
  return null;
}

function flattenLeaves(options: CascaderOption[]): CascaderOption[] {
  const result: CascaderOption[] = [];
  for (const opt of options) {
    if (!opt.children || opt.children.length === 0 || opt.isLeaf) {
      result.push(opt);
    } else {
      result.push(...flattenLeaves(opt.children));
    }
  }
  return result;
}

// --- Main Class ---

export class CascaderManager {
  create(options: CascaderOptions): CascaderInstance {
    const opts = {
      placeholder: options.placeholder ?? "Please select",
      multiple: options.multiple ?? false,
      searchable: options.searchable ?? true,
      maxLevel: options.maxLevel ?? 3,
      selectAll: options.selectAll ?? false,
      separator: options.separator ?? " / ",
      disabled: options.disabled ?? false,
      zIndex: options.zIndex ?? 10500,
      ...options,
    };

    // Resolve trigger
    const triggerEl = typeof options.trigger === "string"
      ? document.querySelector<HTMLElement>(options.trigger)!
      : options.trigger;

    if (!triggerEl) throw new Error("Cascader: trigger element not found");

    const isInputTrigger = triggerEl instanceof HTMLInputElement;

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `cascader ${opts.className ?? ""}`;
    wrapper.style.cssText = "position:relative;display:inline-block;width:100%;";
    triggerEl.parentNode?.insertBefore(wrapper, triggerEl);

    // Input/display element
    let inputEl: HTMLInputElement;
    if (isInputTrigger) {
      inputEl = triggerEl as HTMLInputElement;
      inputEl.placeholder = opts.placeholder;
      if (opts.disabled) inputEl.disabled = true;
      wrapper.appendChild(inputEl);
    } else {
      inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.readOnly = true;
      inputEl.placeholder = opts.placeholder;
      inputEl.style.cssText = `
        width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;
        font-size:13px;font-family:-apple-system,sans-serif;outline:none;
        transition:border-color 0.15s;box-sizing:border-box;background:#fff;
        ${opts.disabled ? "background:#f9fafb;cursor:not-allowed;" : "cursor:pointer;"}
      `;
      wrapper.appendChild(inputEl);
      triggerEl.style.display = "none";
    }

    // Tags container for multi-select
    let tagsContainer: HTMLDivElement | null = null;
    if (opts.multiple) {
      tagsContainer = document.createElement("div");
      tagsContainer.className = "cascader-tags";
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

    // Dropdown panel
    const dropdown = document.createElement("div");
    dropdown.className = "cascader-dropdown";
    dropdown.style.cssText = `
      position:absolute;left:0;top:100%;width:420px;min-width:280px;
      background:#fff;border-radius:8px;
      box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
      z-index:${opts.zIndex};display:none;
      font-family:-apple-system,sans-serif;font-size:13px;
      border:1px solid #e5e7eb;overflow:hidden;
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
      searchInput.addEventListener("focus", () => { searchInput!.style.borderColor = "#6366f1"; });
      searchInput.addEventListener("blur", () => { searchInput!.style.borderColor = "#d1d5db"; });
      searchWrapper.appendChild(searchInput);
      dropdown.appendChild(searchWrapper);
    }

    // Columns container
    const columnsContainer = document.createElement("div");
    columnsContainer.className = "cascader-columns";
    columnsContainer.style.cssText = "display:flex;min-height:200px;max-height:300px;overflow:auto;";
    dropdown.appendChild(columnsContainer);

    // State
    let isOpen = false;
    let selectedValues: string[] = [];
    let selectedPaths: CascaderOption[][] = [];
    let columns: CascaderColumn[] = [];
    let allRootOptions: CascaderOption[] = [];
    let destroyed = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const isAsyncSource = typeof options.options === "function";

    // Load root options
    async function loadRootOptions(): Promise<void> {
      if (isAsyncSource) {
        allRootOptions = await (options.options as (p: { level: number; parentValue?: string }) => Promise<CascaderOption[]>)({ level: 0 });
      } else {
        allRootOptions = options.options as CascaderOption[];
      }
    }

    function initColumns(): void {
      columns = [{ options: allRootOptions, selectedValue: null }];
    }

    function renderColumns(): void {
      columnsContainer.innerHTML = "";

      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const col = columns[colIdx]!;
        const colEl = document.createElement("div");
        colEl.className = "cascader-column";
        colEl.style.cssText = `
          flex:1;min-width:120px;border-right:${colIdx < columns.length - 1 ? "1px solid #f0f0f0" : "none"};
          overflow-y:auto;padding:4px 0;
        `;

        if (col.loading) {
          const loading = document.createElement("div");
          loading.style.cssText = "padding:20px;text-align:center;color:#9ca3af;";
          loading.textContent = "Loading...";
          colEl.appendChild(loading);
        } else {
          // Select All at leaf level
          if (opts.multiple && opts.selectAll && colIdx === columns.length - 1) {
            const selAll = createOptionElement(
              { value: "__all__", label: "Select All" },
              colIdx,
              false,
            );
            selAll.addEventListener("click", () => toggleSelectAll(colIdx));
            colEl.appendChild(selAll);
          }

          for (const opt of col.options) {
            const isSelected = col.selectedValue === opt.value;
            const isMultiSelected = opts.multiple && selectedValues.includes(opt.value);
            const el = opts.renderOption
              ? opts.renderOption(opt, colIdx)
              : createOptionElement(opt, colIdx, isSelected || isMultiSelected);

            if (!opt.disabled) {
              el.addEventListener("click", () => handleOptionClick(opt, colIdx));
              el.addEventListener("mouseenter", () => {
                el.style.background = "#f0f4ff";
              });
              el.addEventListener("mouseleave", () => {
                el.style.background = "";
              });
            }

            colEl.appendChild(el);
          }
        }

        columnsContainer.appendChild(colEl);
      }
    }

    function createOptionElement(
      opt: CascaderOption,
      _level: number,
      selected: boolean,
    ): HTMLDivElement {
      const el = document.createElement("div");
      el.style.cssText = `
        display:flex;align-items:center;gap:6px;padding:7px 12px;cursor:pointer;
        ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
        ${selected ? "background:#eef2ff;color:#4338ca;font-weight:500;" : ""}
        transition:background 0.1s;
      `;

      // Checkbox for multi-select
      if (opts.multiple) {
        const cb = document.createElement("span");
        cb.style.cssText = `
          width:14px;height:14px;border-radius:3px;border:2px solid #d1d5db;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          background:${selected ? "#4338ca" : "transparent"};
          border-color:${selected ? "#4338ca" : "#d1d5db"};
        `;
        if (selected) {
          cb.innerHTML = `<svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
        }
        el.appendChild(cb);
      }

      // Arrow indicator for expandable
      if ((opt.children && opt.children.length > 0) || !opt.isLeaf) {
        const arrow = document.createElement("span");
        arrow.style.cssText = "margin-left:auto;color:#9ca3af;font-size:10px;flex-shrink:0;";
        arrow.textContent = "\u203A"; // ›
        el.appendChild(arrow);
      }

      const label = document.createElement("span");
      label.style.cssText = `${opt.disabled ? "color:#9ca3af;" : ""}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      label.textContent = opt.label;
      el.appendChild(label);

      return el;
    }

    async function handleOptionClick(option: CascaderOption, colIdx: number): Promise<void> {
      // Update column selection
      columns[colIdx]!.selectedValue = option.value;

      // Check if this is a leaf node
      const isLeaf = option.isLeaf || !option.children || option.children.length === 0;

      if (isLeaf) {
        // Leaf selection
        if (opts.multiple) {
          const idx = selectedValues.indexOf(option.value);
          if (idx >= 0) {
            selectedValues.splice(idx, 1);
            selectedPaths.splice(idx, 1);
          } else {
            selectedValues.push(option.value);
            // Build path
            const path: CascaderOption[] = [];
            for (let c = 0; c <= colIdx; c++) {
              const val = c === colIdx ? option : columns[c]?.options.find(o => o.value === columns[c]!.selectedValue);
              if (val) path.push(val);
            }
            selectedPaths.push(path);
          }
          renderTags();
        } else {
          selectedValues = [option.value];
          // Build full path
          const path: CascaderOption[] = [];
          for (let c = 0; c <= colIdx; c++) {
            const val = c === colIdx ? option : columns[c]?.options.find(o => o.value === columns[c]!.selectedValue);
            if (val) path.push(val);
          }
          selectedPaths = [path];
          inputEl.value = path.map(p => p.label).join(opts.separator);
          closeDropdown();
        }
        renderColumns();
        opts.onChange?.(selectedValues, selectedPaths);
      } else {
        // Expand to next level
        // Trim columns after current
        columns = columns.slice(0, colIdx + 1);

        if (option.children && option.children.length > 0) {
          columns.push({ options: option.children, selectedValue: null });
        } else if (opts.loadChildren) {
          // Async load children
          columns.push({ options: [], selectedValue: null, loading: true });
          renderColumns();
          try {
            const children = await opts.loadChildren(option);
            columns[columns.length - 1] = { options: children, selectedValue: null };
          } catch {
            columns[columns.length - 1] = { options: [], selectedValue: null };
          }
        }
        renderColumns();
      }
    }

    function toggleSelectAll(_colIdx: number): void {
      const leaves = flattenLeaves(columns[columns.length - 1]?.options ?? []);
      const allSelected = leaves.every(l => selectedValues.includes(l.value));

      if (allSelected) {
        // Deselect all from this branch
        selectedValues = selectedValues.filter(v => !leaves.some(l => l.value === v));
        selectedPaths = selectedPaths.filter(p => !leaves.some(l => p[p.length - 1]?.value === l.value));
      } else {
        // Select all non-disabled leaves
        for (const leaf of leaves) {
          if (leaf.disabled) continue;
          if (!selectedValues.includes(leaf.value)) {
            selectedValues.push(leaf.value);
            const path = findPathToValue(allRootOptions, leaf.value);
            if (path) selectedPaths.push(path);
          }
        }
      }
      renderTags();
      renderColumns();
      opts.onChange?.(selectedValues, selectedPaths);
    }

    function renderTags(): void {
      if (!tagsContainer) return;
      tagsContainer.innerHTML = "";

      for (let i = 0; i < selectedPaths.length; i++) {
        const path = selectedPaths[i]!;
        const tag = document.createElement("span");
        tag.style.cssText = `
          display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
          background:#eef2ff;color:#4338ca;border-radius:4px;font-size:12px;
          cursor:pointer;user-select:none;transition:background 0.15s;
        `;
        tag.textContent = path[path.length - 1]?.label ?? "";

        const removeBtn = document.createElement("span");
        removeBtn.innerHTML = "&times;";
        removeBtn.style.cssText = "margin-left:2px;font-weight:bold;cursor:pointer;";
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedValues.splice(i, 1);
          selectedPaths.splice(i, 1);
          renderTags();
          opts.onChange?.(selectedValues, selectedPaths);
        });
        tag.appendChild(removeBtn);
        tagsContainer.appendChild(tag);
      }
    }

    function openDropdown(): void {
      if (isOpen || opts.disabled) return;
      isOpen = true;
      loadRootOptions().then(() => {
        initColumns();
        renderColumns();
        dropdown.style.display = "block";
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
      });
    }

    function closeDropdown(): void {
      isOpen = false;
      dropdown.style.display = "none";
    }

    // Search handler
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const q = searchInput!.value.trim().toLowerCase();
          if (!q) {
            initColumns();
            renderColumns();
            return;
          }
          // Flatten all options and filter
          const allOpts: { opt: CascaderOption; level: number }[] = [];
          function walk(optsList: CascaderOption[], level: number) {
            for (const o of optsList) {
              allOpts.push({ opt: o, level });
              if (o.children) walk(o.children, level + 1);
            }
          }
          walk(allRootOptions, 0);
          const matched = allOpts.filter(({ opt }) =>
            opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
          );

          // Show single-column search results
          columnsContainer.innerHTML = "";
          if (matched.length === 0) {
            const noRes = document.createElement("div");
            noRes.style.cssText = "padding:20px;text-align:center;color:#9ca3af;";
            noRes.textContent = "No results";
            columnsContainer.appendChild(noRes);
          } else {
            for (const { opt, level } of matched) {
              const indent = document.createElement("span");
              indent.style.cssText = "color:#d1d5db;margin-right:4px;";
              indent.textContent = "\u2502 ".repeat(level); // │
              const el = createOptionElement(opt, level, false);
              el.insertBefore(indent, el.firstChild);
              if (!opt.disabled) {
                el.addEventListener("click", () => handleOptionClick(opt, level));
              }
              columnsContainer.appendChild(el);
            }
          }
        }, 200);
      });
    }

    // Event handlers
    if (isInputTrigger) {
      inputEl.addEventListener("focus", () => { openDropdown(); });
    } else {
      wrapper.addEventListener("click", () => {
        if (!opts.disabled) openDropdown();
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
        case "Escape":
          e.preventDefault();
          closeDropdown();
          inputEl.focus();
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
    const instance: CascaderInstance = {
      element: wrapper,
      inputEl: isInputTrigger ? inputEl : null,

      open() { openDropdown(); },
      close() { closeDropdown(); },

      getValues() { return [...selectedValues]; },
      getPaths() { return [...selectedPaths]; },

      setValues(values: string[]) {
        selectedValues = [...values];
        selectedPaths = values.map(v => findPathToValue(allRootOptions, v)).filter(Boolean) as CascaderOption[][];
        if (!opts.multiple && selectedPaths.length > 0) {
          inputEl.value = selectedPaths[0]!.map(p => p.label).join(opts.separator);
        }
        renderTags();
      },

      clear() {
        selectedValues = [];
        selectedPaths = [];
        inputEl.value = "";
        renderTags();
        opts.onChange?.([], []);
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

/** Convenience: create a cascader */
export function createCascader(options: CascaderOptions): CascaderInstance {
  return new CascaderManager().create(options);
}
