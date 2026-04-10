/**
 * Filter Bar: Advanced filtering UI with dropdown filters, search input,
 * date range picker, tag chips, active filter count, clear-all, and
 * filter state management.
 */

// --- Types ---

export type FilterType = "select" | "multiselect" | "search" | "date-range" | "toggle" | "custom";

export interface FilterOption {
  /** Display label */
  label: string;
  /** Value */
  value: string;
  /** Optional icon/emoji */
  icon?: string;
  /** Count badge */
  count?: number;
  /** Disabled? */
  disabled?: boolean;
}

export interface FilterDefinition {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Filter type */
  type: FilterType;
  /** Options for select/multiselect */
  options?: FilterOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Default value(s) */
  defaultValue?: string | string[];
  /** Width (px or 'auto') */
  width?: number | "auto";
  /** Show clear button? */
  clearable?: boolean;
  /** Custom render function */
  customRender?: (value: unknown, onChange: (v: unknown) => void) => HTMLElement;
}

export interface FilterState {
  [key: string]: string | string[] | boolean | null;
}

export interface FilterBarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Filter definitions */
  filters: FilterDefinition[];
  /** Initial state override */
  initialState?: FilterState;
  /** Show active filter count? */
  showCount?: boolean;
  /** Show "Clear All" button? */
  showClearAll?: boolean;
  /** Compact mode (smaller inputs) */
  compact?: boolean;
  /** Horizontal layout? (default: true) */
  horizontal?: boolean;
  /** Callback when any filter changes */
  onFilterChange?: (state: FilterState) => void;
  /** Callback on search (debounced) */
  onSearch?: (query: string) => void;
  /** Search debounce ms (default: 300) */
  searchDebounce?: number;
  /** Custom CSS class */
  className?: string;
}

export interface FilterBarInstance {
  element: HTMLElement;
  getState: () => FilterState;
  setState: (state: FilterState) => void;
  reset: () => void;
  getActiveCount: () => number;
  setFilterValue: (key: string, value: unknown) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createFilterBar(options: FilterBarOptions): FilterBarInstance {
  const opts = {
    showCount: options.showCount ?? true,
    showClearAll: options.showClearAll ?? true,
    compact: options.compact ?? false,
    horizontal: options.horizontal ?? true,
    searchDebounce: options.searchDebounce ?? 300,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("FilterBar: container not found");

  container.className = `filter-bar ${opts.className}`;
  let state: FilterState = { ...options.initialState ?? {} };
  const elements = new Map<string, HTMLElement>();
  let destroyed = false;

  // Initialize defaults
  for (const f of opts.filters) {
    if (!(f.key in state)) {
      switch (f.type) {
        case "select": state[f.key] = f.defaultValue ?? ""; break;
        case "multiselect": state[f.key] = f.defaultValue ?? []; break;
        case "toggle": state[f.key] = f.defaultValue ?? false; break;
        case "search": state[f.key] = f.defaultValue ?? ""; break;
        default: state[f.key] = f.defaultValue ?? null;
      }
    }
  }

  function render(): void {
    container.innerHTML = "";
    elements.clear();

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      display:${opts.horizontal ? "flex" : "flex"};
      flex-direction:${opts.horizontal ? "row" : "column"};
      align-items:${opts.horizontal ? "center" : "flex-start"};
      gap:${opts.compact ? "8px" : "12px"};
      flex-wrap:wrap;
    `;
    container.appendChild(wrapper);

    // Render each filter
    for (const filter of opts.filters) {
      const el = renderFilter(filter);
      wrapper.appendChild(el);
      elements.set(filter.key, el);
    }

    // Active count + Clear All row
    if (opts.showCount || opts.showClearAll) {
      const actionsRow = document.createElement("div");
      actionsRow.style.cssText = `
        display:flex;align-items:center;gap:10px;margin-left:auto;
        ${!opts.horizontal ? "margin-top:8px;" : ""}
        flex-shrink:0;
      `;

      if (opts.showCount) {
        const countEl = document.createElement("span");
        countEl.className = "fb-count";
        countEl.style.cssText = "font-size:12px;color:#6b7280;";
        updateCountDisplay(countEl);
        actionsRow.appendChild(countEl);
        // Store ref for updates
        (container as any)._countEl = countEl;
      }

      if (opts.showClearAll) {
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.textContent = "Clear all";
        clearBtn.style.cssText = `
          background:none;border:none;color:#6366f1;font-size:12px;
          cursor:pointer;padding:2px 4px;border-radius:4px;font-weight:500;
          transition:background 0.1s;
        `;
        clearBtn.addEventListener("mouseenter", () => { clearBtn.style.background = "#eef2ff"; });
        clearBtn.addEventListener("mouseleave", () => { clearBtn.style.background = ""; });
        clearBtn.addEventListener("click", () => instance.reset());
        actionsRow.appendChild(clearBtn);
      }

      wrapper.appendChild(actionsRow);
    }
  }

  function updateCountDisplay(el: HTMLElement): void {
    const count = getActiveCount();
    el.textContent = count > 0 ? `${count} filter${count !== 1 ? "s" : ""} active` : "";
  }

  function getActiveCount(): number {
    let count = 0;
    for (const f of opts.filters) {
      const val = state[f.key];
      if (val === undefined || val === null || val === "" || val === false) continue;
      if (Array.isArray(val) && val.length === 0) continue;
      count++;
    }
    return count;
  }

  function renderFilter(filter: FilterDefinition): HTMLElement {
    const inputSize = opts.compact ? "28px" : "34px";
    const fontSize = opts.compact ? "12px" : "13px";
    const padding = opts.compact ? "4px 8px" : "6px 12px";

    switch (filter.type) {
      case "select": return renderSelect(filter, inputSize, fontSize, padding);
      case "multiselect": return renderMultiSelect(filter, inputSize, fontSize, padding);
      case "search": return renderSearch(filter, inputSize, fontSize, padding);
      case "toggle": return renderToggle(filter);
      default: return document.createElement("div");
    }
  }

  function renderSelect(f: FilterDefinition, h: string, fs: string, p: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;";

    const label = document.createElement("label");
    label.style.cssText = `font-size:11px;color:#6b7280;font-weight:500;`;
    label.textContent = f.label;
    wrap.appendChild(label);

    const select = document.createElement("select");
    select.className = `fb-filter fb-${f.key}`;
    select.style.cssText = `
      height:${h};font-size:${fs};padding:${p};border:1px solid #d1d5db;
      border-radius:6px;background:#fff;color:#374151;cursor:pointer;
      outline:none;min-width:${f.width === "auto" ? "100" : typeof f.width === "number" ? String(f.width) : "120"}px;
      font-family:-apple-system,sans-serif;transition:border-color 0.15s;
    `;
    select.addEventListener("focus", () => { select.style.borderColor = "#6366f1"; });
    select.addEventListener("blur", () => { select.style.borderColor = "#d1d5db"; });

    // Placeholder option
    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = f.placeholder ?? `Select ${f.label}...`;
    select.appendChild(placeholderOpt);

    for (const opt of f.options ?? []) {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      o.disabled = opt.disabled;
      if (opt.count !== undefined) o.textContent += ` (${opt.count})`;
      select.appendChild(o);
    }

    select.value = (state[f.key] as string) ?? "";
    select.addEventListener("change", () => {
      state[f.key] = select.value || null;
      notifyChange();
    });

    wrap.appendChild(select);
    return wrap;
  }

  function renderMultiSelect(f: FilterDefinition, h: string, fs: string, p: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;";

    const label = document.createElement("label");
    label.style.cssText = `font-size:11px;color:#6b7280;font-weight:500;`;
    label.textContent = f.label;
    wrap.appendChild(label);

    const selected = (state[f.key] as string[]) ?? [];

    const chipsWrap = document.createElement("div");
    chipsWrap.style.cssText = `display:flex;flex-wrap:wrap;gap:4px;min-height:${h};padding:${p};border:1px solid #d1d5db;border-radius:6px;background:#fff;align-items:center;`;

    // Render selected chips
    function renderChips(): void {
      chipsWrap.innerHTML = "";
      if (selected.length === 0) {
        const ph = document.createElement("span");
        ph.style.cssText = `font-size:${fs};color:#9ca3af;`;
        ph.textContent = f.placeholder ?? `Select ${f.label}...`;
        chipsWrap.appendChild(ph);
      } else {
        for (const val of selected) {
          const opt = f.options?.find((o) => o.value === val);
          const chip = document.createElement("span");
          chip.style.cssText = `
            display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
            background:#eef2ff;color:#4338ca;border-radius:4px;font-size:11px;font-weight:500;
          `;
          chip.textContent = opt?.label ?? val;
          const remove = document.createElement("button");
          remove.type = "button";
          remove.innerHTML = "&times;";
          remove.style.cssText = "background:none;border:none;cursor:pointer;font-size:11px;color:#6366f1;padding:0 0 0 2px;line-height:1;";
          remove.addEventListener("click", () => {
            const idx = selected.indexOf(val);
            if (idx >= 0) { selected.splice(idx, 1); state[f.key] = [...selected]; renderChips(); notifyChange(); }
          });
          chip.appendChild(remove);
          chipsWrap.appendChild(chip);
        }
      }
    }

    // Dropdown trigger
    const dropdown = document.createElement("div");
    dropdown.className = "fb-multiselect-dropdown";
    dropdown.style.cssText = "position:relative;display:inline-block;";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.innerHTML = "+ Add";
    trigger.style.cssText = `
      margin-left:4px;background:none;border:1px dashed #c7d2fe;color:#6366f1;
      cursor:pointer;font-size:11px;padding:1px 6px;border-radius:4px;font-weight:500;
    `;
    trigger.addEventListener("mouseenter", () => { trigger.style.background = "#eef2ff"; });
    trigger.addEventListener("mouseleave", () => { trigger.style.background = ""; });
    dropdown.appendChild(trigger);

    // Options popup
    const popup = document.createElement("div");
    popup.style.cssText = `
      position:absolute;top:100%;left:0;margin-top:4px;min-width:180px;
      background:#fff;border:1px solid #e5e7eb;border-radius:8px;
      box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:4px;z-index:100;
      display:none;
    `;
    for (const opt of f.options ?? []) {
      const item = document.createElement("label");
      item.style.cssText = `
        display:flex;align-items:center;gap:6px;padding:6px 10px;
        cursor:pointer;border-radius:4px;font-size:12px;color:#374151;
        transition:background 0.1s;
      `;
      item.addEventListener("mouseenter", () => { item.style.background = "#f9fafb"; });
      item.addEventListener("mouseleave", () => { item.style.background = ""; });

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selected.includes(opt.value);
      cb.disabled = opt.disabled;
      cb.addEventListener("change", () => {
        if (cb.checked && !selected.includes(opt.value)) { selected.push(opt.value); }
        else { const i = selected.indexOf(opt.value); if (i >= 0) selected.splice(i, 1); }
        state[f.key] = [...selected];
        renderChips();
        notifyChange();
      });

      item.appendChild(cb);
      const lbl = document.createElement("span");
      lbl.textContent = opt.label;
      item.appendChild(lbl);
      popup.appendChild(item);
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      popup.style.display = popup.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("mousedown", (e) => {
      if (!dropdown.contains(e.target as Node)) popup.style.display = "none";
    });

    dropdown.appendChild(popup);
    renderChips();
    chipsWrap.appendChild(dropdown);
    wrap.appendChild(chipsWrap);
    return wrap;
  }

  function renderSearch(f: FilterDefinition, h: string, fs: string, p: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;";

    const label = document.createElement("label");
    label.style.cssText = `font-size:11px;color:#6b7280;font-weight:500;`;
    label.textContent = f.label;
    wrap.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = f.placeholder ?? "Search...";
    input.value = (state[f.key] as string) ?? "";
    input.className = `fb-search fb-${f.key}`;
    input.style.cssText = `
      height:${h};font-size:${fs};padding:${p};border:1px solid #d1d5db;
      border-radius:6px;background:#fff;color:#374151;outline:none;
      min-width:200px;font-family:-apple-system,sans-serif;transition:border-color 0.15s;
      box-sizing:border-box;
    `;
    input.addEventListener("focus", () => { input.style.borderColor = "#6366f1"; });
    input.addEventListener("blur", () => { input.style.borderColor = "#d1d5db"; });

    let timer: ReturnType<typeof setTimeout> | null = null;
    input.addEventListener("input", () => {
      state[f.key] = input.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { opts.onSearch?.(input.value); }, opts.searchDebounce);
      notifyChange();
    });

    wrap.appendChild(input);
    return wrap;
  }

  function renderToggle(f: FilterDefinition): HTMLElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;align-items:center;gap:8px;";

    const label = document.createElement("label");
    label.style.cssText = `font-size:13px;color:#374151;font-weight:500;cursor:pointer;`;
    label.textContent = f.label;
    wrap.appendChild(label);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-checked", String(state[f.key] ?? false));
    toggle.style.cssText = `
      width:40px;height:22px;border-radius:11px;border:none;cursor:pointer;
      transition:background 0.2s;position:relative;flex-shrink:0;
      background:${state[f.key] ? "#4338ca" : "#d1d5db"};
    `;
    const knob = document.createElement("span");
    knob.style.cssText = `
      position:absolute;top:2px;left:${state[f.key] ? "20px" : "2px"};width:18px;height:18px;
      border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15);
    `;
    toggle.appendChild(knob);

    toggle.addEventListener("click", () => {
      const newVal = !(state[f.key] as boolean);
      state[f.key] = newVal;
      toggle.style.background = newVal ? "#4338ca" : "#d1d5db";
      knob.style.left = newVal ? "20px" : "2px";
      toggle.setAttribute("aria-checked", String(newVal));
      notifyChange();
    });

    wrap.appendChild(toggle);
    return wrap;
  }

  function notifyChange(): void {
    opts.onFilterChange?.({ ...state });
    const countEl = (container as any)._countEl as HTMLElement | undefined;
    if (countEl) updateCountDisplay(countEl);
  }

  render();

  const instance: FilterBarInstance = {
    element: container,

    getState() { return { ...state }; },

    setState(newState: FilterState) {
      state = { ...newState };
      render();
    },

    reset() {
      state = {};
      for (const f of opts.filters) {
        switch (f.type) {
          case "select": state[f.key] = f.defaultValue ?? ""; break;
          case "multiselect": state[f.key] = f.defaultValue ?? []; break;
          case "toggle": state[f.key] = f.defaultValue ?? false; break;
          case "search": state[f.key] = f.defaultValue ?? ""; break;
          default: state[f.key] = f.defaultValue ?? null;
        }
      }
      render();
      notifyChange();
    },

    getActiveCount,

    setFilterValue(key: string, value: unknown) {
      state[key] = value as string | string[] | boolean | null;
      render();
      notifyChange();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };

  return instance;
}
