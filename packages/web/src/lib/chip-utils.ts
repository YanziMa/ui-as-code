/**
 * Chip Utilities: Selection chips, filter chips, input chips, and chip
 * groups with multi-select, keyboard navigation, and ARIA support.
 */

// --- Types ---

export type ChipVariant = "default" | "primary" | "outline" | "filter";
export type ChipSize = "sm" | "md" | "lg";

export interface ChipItem {
  /** Unique key */
  id: string;
  /** Display label */
  label: string;
  /** Icon (HTML string) */
  icon?: string;
  /** Avatar element or URL */
  avatar?: string | HTMLElement;
  /** Initially selected? */
  selected?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface ChipGroupOptions {
  /** Available chips */
  items: ChipItem[];
  /** Visual variant */
  variant?: ChipVariant;
  /** Size variant */
  size?: ChipSize;
  /** Allow multiple selection */
  multiple?: boolean;
  /** Allow deselecting selected item in single mode */
  allowDeselect?: boolean;
  /** Show selection checkmark */
  showCheckmark?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when selection changes */
  onChange: (selectedIds: string[], selectedItems: ChipItem[]) => void;
}

export interface InputChipOptions {
  /** Placeholder text */
  placeholder?: string;
  /** Initial values */
  initialValues?: string[];
  /** Max number of chips */
  maxChips?: number;
  /** Duplicate detection */
  allowDuplicates?: boolean;
  /** Validate before adding */
  validate?: (value: string) => boolean | string; // return false/error msg to reject
  /** Called when chips change */
  onChange: (values: string[]) => void;
  /** Called on Enter with new value */
  onAdd?: (value: string) => void;
  /** Called on chip removal */
  onRemove?: (value: string) => void;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface ChipGroupInstance {
  /** The root element */
  el: HTMLElement;
  /** Get currently selected IDs */
  getSelectedIds: () => string[];
  /** Get selected items */
  getSelectedItems: () => ChipItem[];
  /** Select a chip by ID */
  select: (id: string) => void;
  /** Deselect a chip by ID */
  deselect: (id: string) => void;
  /** Select all */
  selectAll: () => void;
  /** Deselect all */
  deselectAll: () => void;
  /** Update items */
  setItems: (items: ChipItem[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Variant Styles ---

const CHIP_VARIANT_STYLES: Record<ChipVariant, { base: string; selected: string }> = {
  "default": {
    base: "background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;",
    selected: "background:#eff6ff;color:#2563eb;border-color:#93c5fd;",
  },
  "primary": {
    base: "background:#fff;color:#374151;border:1px solid #d1d5db;",
    selected: "background:#3b82f6;color:#fff;border-color:#3b82f6;",
  },
  "outline": {
    base: "background:transparent;color:#6b7280;border:1px solid #d1d5db;",
    selected: "background:transparent;color:#3b82f6;border:2px solid #3b82f6;font-weight:500;",
  },
  "filter": {
    base: "background:#fff;color:#374151;border:1px solid #d1d5db;box-shadow:0 1px 2px rgba(0,0,0,0.05);",
    selected: "background:#eff6ff;color:#2563eb;border-color:#bfdbfe;",
  },
};

const CHIP_SIZE_STYLES: Record<ChipSize, { padding: string; fontSize: string; gap: string; iconSize: string }> = {
  "sm": { padding: "2px 8px", fontSize: "12px", gap: "3px", iconSize: "14px" },
  "md": { padding: "5px 12px", fontSize: "13px", gap: "4px", iconSize: "16px" },
  "lg": { padding: "7px 16px", fontSize: "14px", gap: "6px", iconSize: "18px" },
};

// --- Core Factory ---

/**
 * Create a chip group for selection.
 *
 * @example
 * ```ts
 * const chips = createChipGroup({
 *   items: [
 *     { id: "react", label: "React" },
 *     { id: "vue", label: "Vue" },
 *     { id: "angular", label: "Angular" },
 *   ],
 *   multiple: true,
 *   onChange: (ids) => console.log("Selected:", ids),
 * });
 * ```
 */
export function createChipGroup(options: ChipGroupOptions): ChipGroupInstance {
  const {
    items,
    variant = "default",
    size = "md",
    multiple = false,
    allowDeselect = false,
    showCheckmark = true,
    className,
    container,
    onChange,
  } = options;

  let _items = [...items];
  const _selected = new Set<string>(
    items.filter((i) => i.selected).map((i) => i.id),
  );
  let cleanupFns: Array<() => void> = [];

  const vs = CHIP_VARIANT_STYLES[variant];
  const ss = CHIP_SIZE_STYLES[size];

  // Root
  const root = document.createElement("div");
  root.className = `chip-group ${variant} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-wrap:wrap;gap:6px;align-items:center;";
  root.setAttribute("role", "listbox");
  root.setAttribute("aria-multiselectable", String(multiple));

  // Render
  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function getSelectedIds(): string[] { return [..._selected]; }
  function getSelectedItems(): ChipItem[] { return _items.filter((i) => _selected.has(i.id)); }

  function select(id: string): void {
    if (!_selected.has(id)) {
      if (!multiple && _selected.size > 0) {
        // Single mode — deselect previous
        const prevId = [..._selected][0]!;
        _selected.delete(prevId);
        _updateChipVisual(prevId, false);
      }
      _selected.add(id);
      _updateChipVisual(id, true);
      onChange?.(getSelectedIds(), getSelectedItems());
    }
  }

  function deselect(id: string): void {
    if (_selected.has(id)) {
      _selected.delete(id);
      _updateChipVisual(id, false);
      onChange?.(getSelectedIds(), getSelectedItems());
    }
  }

  function selectAll(): void {
    if (!multiple) return;
    _items.forEach((i) => { if (!i.disabled) _selected.add(i.id); });
    _render();
    onChange?.(getSelectedIds(), getSelectedItems());
  }

  function deselectAll(): void {
    _selected.clear();
    _render();
    onChange?.(getSelectedIds(), getSelectedItems());
  }

  function setItems(newItems: ChipItem[]): void {
    _items = newItems;
    _selected.clear();
    newItems.forEach((i) => { if (i.selected) _selected.add(i.id); });
    _render();
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Internal ---

  function _render(): void {
    root.innerHTML = "";

    _items.forEach((item) => {
      const isSelected = _selected.has(item.id);

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `chip${isSelected ? " selected" : ""}${item.disabled ? " disabled" : ""}`;
      chip.setAttribute("role", "option");
      chip.setAttribute("aria-selected", String(isSelected));
      if (item.disabled) chip.setAttribute("disabled", "");
      chip.dataset.chipId = item.id;

      chip.style.cssText =
        `display:inline-flex;align-items:center;gap:${ss.gap};` +
        `padding:${ss.padding};font-size:${ss.fontSize};font-weight:500;line-height:1;` +
        `border-radius:9999px;border:1px solid;cursor:pointer;white-space:nowrap;` +
        "user-select:none;transition:all 0.15s ease;" +
        (item.disabled
          ? "opacity:0.5;cursor:not-allowed;"
          : isSelected ? vs.selected : vs.base);

      // Avatar
      if (item.avatar) {
        const avatarEl = typeof item.avatar === "string"
          ? (() => { const img = document.createElement("img"); img.src = item.avatar!; img.style.width = ss.iconSize; img.style.height = ss.iconSize; img.style.borderRadius = "50%"; img.style.objectFit = "cover"; return img; })()
          : item.avatar as HTMLElement;
        avatarEl.style.flexShrink = "0";
        chip.appendChild(avatarEl);
      }

      // Icon
      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = item.icon;
        iconSpan.style.display = "inline-flex";
        iconSpan.style.flexShrink = "0";
        chip.appendChild(iconSpan);
      }

      // Label
      const label = document.createElement("span");
      label.textContent = item.label;
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      chip.appendChild(label);

      // Checkmark (for selected)
      if (showCheckmark && isSelected) {
        const check = document.createElement("span");
        check.innerHTML = "&#10003;";
        check.style.cssText =
          `margin-left:2px;font-size:calc(${ss.fontSize} - 1px);flex-shrink:0;`;
        chip.appendChild(check);
      }

      // Click handler
      if (!item.disabled) {
        chip.addEventListener("click", () => {
          if (_selected.has(item.id)) {
            if (multiple || allowDeselect) deselect(item.id);
          } else {
            select(item.id);
          }
        });

        // Keyboard support
        chip.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            chip.click();
          }
        });
      }

      root.appendChild(chip);
    });
  }

  function _updateChipVisual(id: string, selected: boolean): void {
    const chip = root.querySelector(`[data-chip-id="${id}"]`) as HTMLElement;
    if (!chip) return;

    chip.setAttribute("aria-selected", String(selected));
    chip.style.cssText += selected ? vs.selected : vs.base;

    // Toggle checkmark
    let check = chip.querySelector(".chip-checkmark") as HTMLElement | null;
    if (showCheckmark && selected && !check) {
      check = document.createElement("span");
      check.className = "chip-checkmark";
      check.innerHTML = "&#10003;";
      check.style.marginLeft = "2px";
      chip.appendChild(check);
    } else if (!selected && check) {
      check.remove();
    }
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: root, getSelectedIds, getSelectedItems, select, deselect, selectAll, deselectAll, setItems, destroy };
}

// --- Input Chips ---

/**
 * Create an input chip component (like Gmail's recipient chips).
 *
 * @example
 * ```ts
 * const inputChips = createInputChip({
 *   placeholder: "Add email...",
 *   onChange: (values) => console.log(values),
 * });
 * ```
 */
export function createInputChip(options: InputChipOptions): HTMLElement {
  const {
    placeholder = "Enter value...",
    initialValues = [],
    maxChips = Infinity,
    allowDuplicates = false,
    validate,
    onChange,
    onAdd,
    onRemove,
    container,
    className,
  } = options;

  let _values = [...initialValues];

  const wrapper = document.createElement("div");
  wrapper.className = `input-chip-group ${className ?? ""}`.trim();
  wrapper.style.cssText =
    "display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:4px 8px;" +
    "border:1px solid #d1d5db;border-radius:8px;background:#fff;" +
    "min-height:38px;cursor:text;";

  // Render existing chips
  _values.forEach((val) => wrapper.appendChild(_createChip(val)));

  // Input
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = _values.length >= maxChips ? "" : placeholder;
  input.style.cssText =
    "border:none;outline:none;background:none;flex:1;min-width:80px;" +
    "font-size:13px;color:#374151;padding:2px 0;";
  wrapper.appendChild(input);

  // Event handlers
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;

      if (_values.length >= maxChips) return;
      if (!allowDuplicates && _values.includes(val)) {
        input.value = "";
        return;
      }

      if (validate) {
        const result = validate(val);
        if (result !== true) {
          if (typeof result === "string") {
            // Show error — could add tooltip here
            input.style.color = "#dc2626";
            setTimeout(() => { input.style.color = ""; }, 1500);
          }
          return;
        }
      }

      _values.push(val);
      input.value = "";
      input.placeholder = _values.length >= maxChips ? "" : placeholder;

      // Insert chip before input
      wrapper.insertBefore(_createChip(val), input);
      onChange?.([..._values]);
      onAdd?.(val);
    } else if (e.key === "Backspace" && !input.value && _values.length > 0) {
      // Remove last chip on backspace
      const lastVal = _values.pop()!;
      const chips = wrapper.querySelectorAll(".input-chip");
      if (chips.length > 0) chips[chips.length - 1]?.remove();
      onChange?.([..._values]);
      onRemove?.(lastVal);
      input.placeholder = "";
    }
  });

  (container ?? document.body).appendChild(wrapper);

  return wrapper;
}

function _createChip(value: string): HTMLElement {
  const chip = document.createElement("div");
  chip.className = "input-chip";
  chip.textContent = value;
  chip.style.cssText =
    "display:inline-flex;align-items:center;gap:3px;padding:2px 7px;" +
    "background:#eff6ff;color:#2563eb;border-radius:9999px;" +
    "font-size:12px;font-weight:500;";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.innerHTML = "&times;";
  removeBtn.style.cssText =
    "display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;" +
    "border:none;background:none;cursor:pointer;color:#93c5fd;font-size:12px;" +
    "line-height:1;border-radius:50%;padding:0;margin-left:-2px;";
  removeBtn.addEventListener("mouseenter", () => { removeBtn.style.background = "#dbeafe"; });
  removeBtn.addEventListener("mouseleave", () => { removeBtn.style.background = ""; });
  removeBtn.addEventListener("click", () => { chip.remove(); });
  chip.appendChild(removeBtn);

  return chip;
}
