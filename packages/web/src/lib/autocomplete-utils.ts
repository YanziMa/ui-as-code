/**
 * Autocomplete Utilities: Text input autocomplete with keyboard navigation,
 * fuzzy matching, async data sources, multi-select tags, grouping, and
 * custom rendering.
 */

// --- Types ---

export interface AutocompleteItem {
  /** Unique identifier */
  id: string | number;
  /** Display text */
  label: string;
  /** Secondary description text */
  description?: string;
  /** Category/group label */
  group?: string;
  /** Icon HTML string or element */
  icon?: string | HTMLElement;
  /** Keywords for search beyond label */
  keywords?: string[];
  /** Disabled state */
  disabled?: boolean;
  /** Custom data payload */
  data?: unknown;
}

export interface AutocompleteOptions {
  /** The input element to attach to */
  input: HTMLInputElement;
  /** Data source — static array or async fetcher */
  source: AutocompleteItem[] | ((query: string) => Promise<AutocompleteItem[]>);
  /** Minimum characters before triggering (default 1) */
  minLength?: number;
  /** Maximum items shown in dropdown (default 8) */
  maxItems?: number;
  /** Debounce delay in ms for async sources (default 200) */
  debounceMs?: number;
  /** Allow creating new items not in the list? */
  allowCreate?: boolean;
  /** Placeholder for "create new" option */
  createLabel?: (query: string) => string;
  /** Multi-select mode (tags/chips)? */
  multiSelect?: boolean;
  /** Max selected items in multi-select mode */
  maxSelected?: number;
  /** Selected item separator when joining values */
  delimiter?: string;
  /** Show clear button? */
  showClear?: boolean;
  /** Highlight matched text in results? */
  highlightMatch?: boolean;
  /** Custom render function for each item */
  renderItem?: (item: AutocompleteItem, query: string) => HTMLElement;
  /** Called when an item is selected */
  onSelect?: (item: AutocompleteItem) => void;
  /** Called when query changes (for controlled usage) */
  onQueryChange?: (query: string) => void;
  /** Custom class name */
  className?: string;
}

export interface AutocompleteInstance {
  /** Root wrapper element (input + dropdown) */
  el: HTMLElement;
  /** The input element reference */
  input: HTMLInputElement;
  /** Open the dropdown manually */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Get current selected value(s) */
  getValue: () => string | string[];
  /** Set value programmatically */
  setValue: (value: string | string[]) => void;
  /** Get selected item(s) */
  getSelected: () => AutocompleteItem[];
  /** Clear selection and input */
  clear: () => void;
  /** Focus the input */
  focus: () => void;
  /** Disable/enable */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Fuzzy Match ---

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (!q) return { match: true, score: 0 };
  if (t.includes(q)) return { match: true, score: t.length - q.length };

  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (q[qi] === t[ti]) {
      score++;
      if (qi > 0 && q[qi - 1] === t[ti - 1]) score += 2;
      if (ti === 0 || /[\s\-_]/.test(t[ti - 1])) score += 3;
      qi++;
    }
  }

  return { match: qi === q.length, score };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightText(text: string, query: string): string {
  if (!query) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const regex = new RegExp(
    query.split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*?"),
    "gi",
  );

  return escaped.replace(regex, (match) => `<mark style="background:#fef08a;border-radius:2px;padding:0 1px;">${match}</mark>`);
}

// --- Core Factory ---

/**
 * Create an autocomplete dropdown for a text input.
 *
 * @example
 * ```ts
 * const ac = createAutocomplete({
 *   input: document.getElementById("search") as HTMLInputElement,
 *   source: [
 *     { id: 1, label: "Apple", group: "Fruits" },
 *     { id: 2, label: "Apricot", group: "Fruits" },
 *     { id: 3, label: "Airplane", group: "Vehicles" },
 *   ],
 *   onSelect: (item) => console.log("Selected:", item.label),
 * });
 * ```
 */
export function createAutocomplete(options: AutocompleteOptions): AutocompleteInstance {
  const {
    input,
    source,
    minLength = 1,
    maxItems = 8,
    debounceMs = 200,
    allowCreate = false,
    createLabel = (q) => `Create "${q}"`,
    multiSelect = false,
    maxSelected = Infinity,
    delimiter = ", ",
    showClear = true,
    highlightMatch = true,
    renderItem,
    onSelect,
    onQueryChange,
    className,
  } = options;

  let _open = false;
  let _focusedIndex = -1;
  let _selectedItems: AutocompleteItem[] = [];
  let _filteredItems: AutocompleteItem[] = [];
  let _abortController: AbortController | null = null;
  let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isDestroyed = false;

  // Check if source is a function (async)
  const isAsyncSource = typeof source === "function";

  // --- Build DOM ---

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `autocomplete ${className ?? ""}`.trim();
  wrapper.style.cssText =
    "position:relative;display:inline-flex;align-items:center;width:100%;";

  // Reposition input inside wrapper
  if (input.parentNode) {
    input.parentNode.insertBefore(wrapper, input);
  }
  wrapper.appendChild(input);

  // Ensure input styles
  input.style.width = "100%";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("spellcheck", "false");

  // Tags container for multi-select
  let tagsContainer: HTMLElement | null = null;
  if (multiSelect) {
    tagsContainer = document.createElement("div");
    tagsContainer.className = "ac-tags";
    tagsContainer.style.cssText =
      "display:flex;flex-wrap:wrap;gap:4px;padding:4px;" +
      "min-height:" + getComputedStyle(input).height + ";";
    wrapper.insertBefore(tagsContainer, input);
  }

  // Clear button
  let clearBtn: HTMLElement | null = null;
  if (showClear) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&times;";
    clearBtn.style.cssText =
      "position:absolute;right:8px;top:50%;transform:translateY(-50%);" +
      "border:none;background:none;font-size:16px;color:#9ca3af;cursor:pointer;" +
      "padding:2px 6px;line-height:1;display:none;";
    clearBtn.addEventListener("click", () => { clear(); input.focus(); });
    clearBtn.addEventListener("mouseenter", () => { clearBtn!.style.color = "#374151"; });
    clearBtn.addEventListener("mouseleave", () => { clearBtn!.style.color = "#9ca3af"; });
    wrapper.appendChild(clearBtn);
  }

  // Dropdown
  const dropdown = document.createElement("div");
  dropdown.className = "ac-dropdown";
  dropdown.style.cssText =
    "position:absolute;left:0;top:100%;right:0;z-index:1000;" +
    "background:#fff;border:1px solid #e5e7eb;border-radius:8px;" +
    "box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:280px;" +
    "overflow-y:auto;display:none;margin-top:4px;" +
    "font-family:-apple-system,sans-serif;font-size:14px;";
  wrapper.appendChild(dropdown);

  // --- Filtering ---

  function filterItems(query: string): AutocompleteItem[] {
    const items = isAsyncSource ? [] : (source as AutocompleteItem[]);
    if (!query || query.length < minLength) return items.slice(0, maxItems);

    const scored = items
      .map((item) => {
        const searchText = `${item.label} ${item.description ?? ""} ${(item.keywords ?? []).join(" ")}`;
        const result = fuzzyMatch(query, searchText);
        return { item, ...result };
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score);

    return scored.map((r) => r.item).slice(0, maxItems);
  }

  async function filterAsync(query: string): Promise<AutocompleteItem[]> {
    if (!isAsyncSource) return [];

    // Cancel previous request
    if (_abortController) _abortController.abort();

    _abortController = new AbortController();

    try {
      const items = await (source as (q: string) => Promise<AutocompleteItem[]>)(
        query,
      );
      if (_abortController.signal.aborted) return [];

      if (!query || query.length < minLength) return items.slice(0, maxItems);

      const scored = items
        .map((item) => {
          const searchText = `${item.label} ${item.description ?? ""} ${(item.keywords ?? []).join(" ")}`;
          const result = fuzzyMatch(query, searchText);
          return { item, ...result };
        })
        .filter((r) => r.match)
        .sort((a, b) => b.score - a.score);

      return scored.map((r) => r.item).slice(0, maxItems);
    } catch {
      return [];
    }
  }

  // --- Render ---

  function renderDropdown(): void {
    dropdown.innerHTML = "";
    const query = input.value.trim();

    if (_filteredItems.length === 0 && !(allowCreate && query.length >= minLength)) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:12px 16px;text-align:center;color:#9ca3af;font-size:13px;";
      empty.textContent = query.length >= minLength ? "No results found" : "Type to search...";
      dropdown.appendChild(empty);
      return;
    }

    let currentGroup = "";

    // Render filtered items
    for (const item of _filteredItems {
      // Skip already-selected in multi-select
      if (multiSelect && _selectedItems.some((s) => s.id === item.id)) continue;

      // Group header
      if (item.group && item.group !== currentGroup) {
        currentGroup = item.group;
        const gh = document.createElement("div");
        gh.style.cssText =
          "padding:6px 14px 2px;font-size:11px;font-weight:600;color:#9ca3af;" +
          "text-transform:uppercase;letter-spacing:0.04em;";
        gh.textContent = item.group;
        dropdown.appendChild(gh);
      }

      let itemEl: HTMLElement;

      if (renderItem) {
        itemEl = renderItem(item, query);
      } else {
        itemEl = createDefaultItem(item, query);
      }

      itemEl.dataset.index = String(_filteredItems.indexOf(item));

      itemEl.addEventListener("click", () => selectItem(item));
      itemEl.addEventListener("mouseenter", () => focusItem(_filteredItems.indexOf(item)));

      dropdown.appendChild(itemEl);
    }

    // Create option
    if (allowCreate && query.length >= minLength) {
      const createIdx = _filteredItems.length;
      const createEl = document.createElement("div");
      createEl.className = "ac-item ac-create";
      createEl.style.cssText =
        "display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;" +
        "font-size:13px;color:#3b82f6;border-top:1px solid #f3f4f6;" +
        "transition:background 0.08s;";
      createEl.innerHTML = `<span style="color:#3b82f6;">+</span> <span>${escapeHtml(createLabel(query))}</span>`;
      createEl.dataset.index = String(createIdx);

      createEl.addEventListener("click", () => {
        const newItem: AutocompleteItem = {
          id: `__create__${query}`,
          label: query,
        };
        selectItem(newItem);
      });

      createEl.addEventListener("mouseenter", () => focusItem(createIdx));
      dropdown.appendChild(createEl);
    }
  }

  function createDefaultItem(item: AutocompleteItem, query: string): HTMLElement {
    const el = document.createElement("div");
    el.className = "ac-item";
    el.style.cssText =
      "display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;" +
      "font-size:13px;color:#111827;transition:background 0.08s;" +
      (item.disabled ? "opacity:0.45;pointer-events:none;" : "");

    // Icon
    if (item.icon) {
      const iconWrap = document.createElement("span");
      iconWrap.style.flexShrink = "0";
      iconWrap.innerHTML = typeof item.icon === "string" ? item.icon : "";
      el.appendChild(iconWrap);
    }

    // Text column
    const textCol = document.createElement("div");
    textCol.style.cssText = "flex:1;min-width:0;";

    const labelEl = document.createElement("div");
    labelEl.innerHTML = highlightMatch ? highlightText(item.label, query) : escapeHtml(item.label);
    labelEl.style.fontWeight = "500";
    textCol.appendChild(labelEl);

    if (item.description) {
      const descEl = document.createElement("div");
      descEl.innerHTML = highlightMatch ? highlightText(item.description, query) : escapeHtml(item.description);
      descEl.style.fontSize = "12px";
      descEl.style.color = "#6b7280";
      descEl.style.marginTop = "1px";
      textCol.appendChild(descEl);
    }

    el.appendChild(textCol);
    return el;
  }

  function updateTags(): void {
    if (!tagsContainer) return;
    tagsContainer.innerHTML = "";

    for (const item of _selectedItems) {
      const tag = document.createElement("span");
      tag.className = "ac-tag";
      tag.style.cssText =
        "display:inline-flex;align-items:center;gap:4px;padding:2px 8px;" +
        "background:#eff6ff;color:#1d4ed8;border-radius:4px;font-size:12px;" +
        "font-weight:500;";

      const tagLabel = document.createElement("span");
      tagLabel.textContent = item.label;
      tag.appendChild(tagLabel);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.innerHTML = "&times;";
      removeBtn.style.cssText =
        "border:none;background:none;cursor:pointer;font-size:14px;line-height:1;" +
        "color:#93c5fd;padding:0 2px;";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deselectItem(item);
      });
      tag.appendChild(removeBtn);

      tagsContainer.appendChild(tag);
    }
  }

  // --- Selection ---

  function selectItem(item: AutocompleteItem): void {
    if (item.disabled) return;

    if (multiSelect) {
      if (_selectedItems.some((s) => s.id === item.id)) return;
      if (_selectedItems.length >= maxSelected) return;
      _selectedItems.push(item);
      updateTags();
      input.value = "";
      input.focus();
    } else {
      _selectedItems = [item];
      input.value = item.label;
    }

    close();
    onSelect?.(item);
    updateClearButton();
  }

  function deselectItem(item: AutocompleteItem): void {
    _selectedItems = _selectedItems.filter((s) => s.id !== item.id);
    updateTags();
    updateClearButton();
  }

  // --- Focus management ---

  function focusItem(index: number): void {
    _focusedIndex = index;

    const items = dropdown.querySelectorAll(".ac-item, .ac-create");
    items.forEach((el, i) => {
      (el as HTMLElement).style.background = i === index ? "#eff6ff" : "";
    });
  }

  // --- Open/Close ---

  function open(): void {
    if (_open) return;
    _open = true;
    _focusedIndex = -1;

    dropdown.style.display = "block";

    // Trigger filter
    const query = input.value.trim();
    if (isAsyncSource) {
      debouncedFilter(query);
    } else {
      _filteredItems = filterItems(query);
      renderDropdown();
    }

    // Position check
    requestAnimationFrame(() => {
      const rect = dropdown.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 10) {
        dropdown.style.top = "auto";
        dropdown.style.bottom = "100%";
        dropdown.style.marginTop = "0";
        dropdown.style.marginBottom = "4px";
      }
    });
  }

  function close(): void {
    if (!_open) return;
    _open = false;
    _focusedIndex = -1;
    dropdown.style.display = "none";
    dropdown.style.top = "100%";
    dropdown.style.bottom = "auto";
    dropdown.style.marginBottom = "0";
  }

  function toggle(): void { _open ? close() : open(); }

  // --- Debounced async filter ---

  function debouncedFilter(query: string): void {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(async () => {
      _filteredItems = await filterAsync(query);
      if (_open) renderDropdown();
    }, debounceMs);
  }

  // --- Value management ---

  function getValue(): string | string[] {
    if (multiSelect) {
      return _selectedItems.map((s) => s.label);
    }
    return input.value;
  }

  function setValue(value: string | string[]): void {
    if (Array.isArray(value) && multiSelect) {
      // Try to find items by label from source
      const allItems = isAsyncSource ? [] : (source as AutocompleteItem[]);
      _selectedItems = value.map((v) =>
        allItems.find((a) => a.label === v) ?? { id: v, label: v },
      );
      updateTags();
      input.value = "";
    } else {
      input.value = typeof value === "string" ? value : value.join(delimiter);
    }
    updateClearButton();
  }

  function getSelected(): AutocompleteItem[] { return [..._selectedItems]; }

  function clear(): void {
    _selectedItems = [];
    input.value = "";
    if (tagsContainer) tagsContainer.innerHTML = "";
    close();
    updateClearButton();
  }

  function updateClearButton(): void {
    if (clearBtn) {
      const hasValue = input.value.length > 0 || _selectedItems.length > 0;
      clearBtn.style.display = hasValue ? "" : "none";
    }
  }

  function focus(): void { input.focus(); }

  function setDisabled(disabled: boolean): void {
    input.disabled = disabled;
    wrapper.style.opacity = disabled ? "0.5" : "1";
    wrapper.style.pointerEvents = disabled ? "none" : "";
  }

  function destroy(): void {
    isDestroyed = true;
    if (_debounceTimer) clearTimeout(_debounceTimer);
    if (_abortController) _abortController.abort();

    // Move input back out of wrapper
    if (wrapper.parentNode && input.parentNode === wrapper) {
      wrapper.parentNode.insertBefore(input, wrapper);
    }
    wrapper.remove();

    // Remove listeners are handled by the cleanup below
  }

  // --- Event Listeners ---

  input.addEventListener("focus", () => {
    open();
  });

  input.addEventListener("blur", (e) => {
    // Delay to allow click on dropdown item to register
    setTimeout(() => {
      if (!dropdown.contains(document.activeElement) && document.activeElement !== input) {
        close();
      }
    }, 150);
  });

  input.addEventListener("input", () => {
    const query = input.value.trim();
    onQueryChange?.(query);

    if (!isAsyncSource) {
      _filteredItems = filterItems(query);
      renderDropdown();
    } else {
      debouncedFilter(query);
    }

    updateClearButton();

    if (!_open && query.length >= minLength) open();
  });

  input.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll(".ac-item, .ac-create");

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!_open) { open(); break; }
        _focusedIndex = Math.min(_focusedIndex + 1, items.length - 1);
        focusItem(_focusedIndex);
        break;

      case "ArrowUp":
        e.preventDefault();
        if (!_open) break;
        _focusedIndex = Math.max(_focusedIndex - 1, -1);
        focusItem(_focusedIndex);
        break;

      case "Enter": {
        e.preventDefault();
        if (_focusedIndex >= 0 && _focusedIndex < items.length) {
          (items[_focusedIndex] as HTMLElement).click();
        } else if (allowCreate && input.value.trim().length >= minLength) {
          // Create on Enter with no selection
          const newItem: AutocompleteItem = { id: `__create__${input.value.trim()}`, label: input.value.trim() };
          selectItem(newItem);
        }
        break;
      }

      case "Escape":
        e.preventDefault();
        close();
        break;

      case "Backspace":
        if (multiSelect && input.value === "" && _selectedItems.length > 0) {
          deselectItem(_selectedItems[_selectedItems.length - 1]!);
        }
        break;
    }
  });

  // Close on outside click
  document.addEventListener("mousedown", (e) => {
    if (!wrapper.contains(e.target as Node)) close();
  });

  updateClearButton();

  return {
    el: wrapper,
    input,
    open, close,
    getValue, setValue,
    getSelected, clear,
    focus, setDisabled, destroy,
  };
}
